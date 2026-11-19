// Simulação 2D de um jogo para o ecrã "Ao vivo": usa o motor de decisão (camada 1) para decidir o que cada jogador faz
// e o steering para os mover. A bola é PROVISÓRIA (cinemática simples com altura e gravidade) até à camada de física
// 2.5D (fase seguinte), que vai ler a mesma acção (força, direcção, altura, rotação).
// Determinística: a mesma configuração dá sempre o mesmo jogo (aleatoriedade com sementes fixas).
import { CAMPO, FREQUENCIA, ESTILOS_DECISAO, MOVIMENTO, RITMO, PARAGEM, JANELA_TRANSICAO_S } from '../../config/decisao.ts';
import { cicloDecisao, limparMemo } from '../decision/DecisionEngine.ts';
import { atributo } from '../decision/ActionEvaluator.ts';
import { aleatorio } from '../decision/rng.ts';
import { passo as passoSteering, dist, limites, rodar } from '../physics/Steering.ts';
import { formaEquipa, xCampo } from '../decision/TeamShape.ts';
import { distSegmento } from '../decision/ContextBuilder.ts';
import { xgEstimado } from '../decision/actions/ShootAction.ts';
import { CoachAI, type DecisaoTreinador, type AtributosTreinadorJogo } from '../coach/CoachAI.ts';
import { criarEstado, posicaoInicial, type JogadorBase } from '../decision/montarJogo.ts';
import type { Action, MatchState, PlayerState, TeamTactic, Equipa } from '../decision/types.ts';

const DT = FREQUENCIA.tick_ms / 1000;
const TICKS_MIN = 60 / DT;
const G = 9.81;

export interface EventoJogo { tick: number; minuto: number; tipo: 'golo' | 'remate' | 'defesa' | 'fora' | 'canto' | 'falta' | 'cartao' | 'desarme' | 'intercepcao' | 'substituicao' | 'tactica' | 'intervalo' | 'fim' | 'inicio'; equipa: Equipa; jogador?: string; outro?: string; texto: string; x: number; y: number; xg?: number }
export interface EstatJogo2D { posse: [number, number]; passes: [number, number]; passesCertos: [number, number]; remates: [number, number]; aBaliza: [number, number]; xg: [number, number]; cantos: [number, number]; faltas: [number, number]; amarelos: [number, number]; desarmes: [number, number] }
export interface Frame { tick: number; minuto: number; paragem: string | null; bola: { x: number; y: number; z: number }; jogadores: { id: string; team: Equipa; numero: number; nome: string; x: number; y: number; facing: number; bola: boolean; accao: string }[] }

type TipoParagem = 'lancamento' | 'canto' | 'baliza' | 'livre' | 'saida';
const TEXTO_PARAGEM: Record<TipoParagem, string> = { lancamento: 'lançamento lateral', canto: 'canto', baliza: 'pontapé de baliza', livre: 'livre', saida: 'pontapé de saída' };
const clampCampo = (p: { x: number; y: number }, m = 1) => ({ x: Math.max(m, Math.min(CAMPO.comprimento - m, p.x)), y: Math.max(m, Math.min(CAMPO.largura - m, p.y)) });
/** Atrito da bola a rolar (por tick) e fracção da velocidade com que um passe chega ao destino. */
const ATRITO = 0.93, CHEGADA = 0.4;

export interface ConfigJogo2D {
  equipas: [{ onze: JogadorBase[]; banco: JogadorBase[]; tactica: TeamTactic; treinador: AtributosTreinadorJogo; nome: string }, { onze: JogadorBase[]; banco: JogadorBase[]; tactica: TeamTactic; treinador: AtributosTreinadorJogo; nome: string }];
  semente: string;
}

const xg = xgEstimado;

export class Simulacao2D {
  estado: MatchState;
  eventos: EventoJogo[] = [];
  estat: EstatJogo2D = { posse: [0, 0], passes: [0, 0], passesCertos: [0, 0], remates: [0, 0], aBaliza: [0, 0], xg: [0, 0], cantos: [0, 0], faltas: [0, 0], amarelos: [0, 0], desarmes: [0, 0] };
  treinadores: [CoachAI, CoachAI];
  accoes = new Map<string, Action>();
  /** Bola em voo: quem a lançou, para quem, tipo (passe, remate) e velocidade vertical. */
  private voo: { de: string; equipa: Equipa; para?: string; tipo: 'passe' | 'remate' | 'cruzamento' | 'solta'; vz: number; xg?: number; desfecho?: 'golo' | 'defesa' | 'fora'; destino?: { x: number; y: number }; ponto?: { x: number; y: number }; inicio: number; fim: number } | null = null;
  /** Bola parada: o marcador vai à bola, os outros reorganizam-se; recomeça quando o marcador lá chega. */
  paragem: { tipo: TipoParagem; equipa: Equipa; local: { x: number; y: number }; marcador: string; inicio: number; min: number; max: number; lado?: number } | null = null;
  private intervaloFeito = false;
  /** Tick em que o portador recebeu a bola (precisa de controlar antes de passar/rematar). */
  private recebeuTick = 0;
  terminado = false;
  /** Pausa automática ao intervalo (o ecrã retoma). */
  emIntervalo = false;

  constructor(public cfg: ConfigJogo2D) {
    limparMemo();
    this.estado = criarEstado([cfg.equipas[0].onze, cfg.equipas[1].onze], [{ ...cfg.equipas[0].tactica }, { ...cfg.equipas[1].tactica }], 0);
    const banco = (k: Equipa) => cfg.equipas[k].banco.map((j) => ({ id: j.id, team: k, number: j.number, name: j.name, role: j.role, slot: { x: 0.5, y: 0.5 }, pos: { x: CAMPO.comprimento / 2, y: -3 }, vel: { x: 0, y: 0 }, attrs: j.attrs, morale: j.morale ?? 60, condition: j.condition ?? 1, yellow: false, onPitch: false } as PlayerState));
    this.treinadores = [new CoachAI(`${cfg.semente}|t0`, 0, cfg.equipas[0].treinador, banco(0)), new CoachAI(`${cfg.semente}|t1`, 1, cfg.equipas[1].treinador, banco(1))];
    for (const p of this.estado.players) p.facing = p.team === 0 ? 0 : Math.PI;
    this.ev('inicio', 0, undefined, 'O árbitro apita para o início.');
  }

  private ev(tipo: EventoJogo['tipo'], equipa: Equipa, jogador: PlayerState | undefined, texto: string, extra: Partial<EventoJogo> = {}) {
    const s = this.estado;
    this.eventos.push({ tick: s.tick, minuto: Math.min(90, Math.floor(s.minute) + 1), tipo, equipa, jogador: jogador?.id, texto, x: s.ball.pos.x, y: s.ball.pos.y, ...extra });
  }
  private r(chave: string) { return aleatorio(`${this.cfg.semente}|${this.estado.tick}|${chave}`); }
  private jogador(id: string | null | undefined) { return id ? this.estado.players.find((p) => p.id === id) ?? null : null; }

  private mudarPosse(team: Equipa) {
    const s = this.estado;
    if (s.possessionTeam !== team) { s.possessionTeam = team; s.possessionChangeTick = s.tick; }
  }

  /** Dá a bola a um jogador. */
  private darBola(p: PlayerState) {
    const s = this.estado;
    s.ball.ownerId = p.id; s.ball.vel = { x: 0, y: 0 }; s.ball.z = 0; s.ball.lastTeam = p.team;
    this.recebeuTick = s.tick;
    this.voo = null;
    this.mudarPosse(p.team);
  }

  /** Lugar de cada jogador no pontapé de saída (a formação no próprio meio-campo). */
  private lugarSaida(p: PlayerState) { return posicaoInicial(p.team, { x: p.slot.x, y: p.team === 0 ? p.slot.y : 1 - p.slot.y }); }
  private avancado(team: Equipa) { return this.estado.players.filter((p) => p.onPitch && p.team === team && p.role !== 'GR').sort((a, b) => b.slot.x - a.slot.x)[0]; }

  /** Recomeço da 2.ª parte: no intervalo os jogadores saem do campo, por isso voltam já às posições de saída. */
  private saidaSegundaParte(team: Equipa) {
    const s = this.estado;
    for (const p of s.players) if (p.onPitch) { p.pos = this.lugarSaida(p); p.vel = { x: 0, y: 0 }; p.facing = p.team === 0 ? 0 : Math.PI; }
    const pl = this.avancado(team);
    pl.pos = { x: CAMPO.comprimento / 2 + (team === 0 ? -0.6 : 0.6), y: CAMPO.largura / 2 };
    s.ball.pos = { x: CAMPO.comprimento / 2, y: CAMPO.largura / 2 }; s.ball.vel = { x: 0, y: 0 }; s.ball.z = 0;
    this.darBola(pl);
    this.accoes.clear();
  }

  /** Começa uma bola parada: a bola fica sem dono, a posse passa à equipa que repõe. */
  private iniciarParagem(tipo: TipoParagem, equipa: Equipa, local: { x: number; y: number }, marcador: PlayerState) {
    const s = this.estado, tps = 1000 / FREQUENCIA.tick_ms;
    s.ball.ownerId = null; s.ball.vel = { x: 0, y: 0 }; s.ball.z = 0;
    this.voo = null;
    this.mudarPosse(equipa);
    const seg = { lancamento: PARAGEM.lancamento_s, canto: PARAGEM.canto_s, baliza: PARAGEM.baliza_s, livre: PARAGEM.livre_s, saida: PARAGEM.saida_s }[tipo];
    this.paragem = { tipo, equipa, local: { ...local }, marcador: marcador.id, inicio: s.tick, min: seg * tps, max: (tipo === 'saida' ? PARAGEM.saida_max_s : seg * 3) * tps, lado: local.y < CAMPO.largura / 2 ? -1 : 1 };
  }

  /** Alvo de cada jogador durante a bola parada. */
  private alvoParagem(p: PlayerState, forma: Map<string, { x: number; y: number }>[]): { x: number; y: number } {
    const pr = this.paragem!, s = this.estado;
    if (p.id === pr.marcador) {
      // O marcador põe-se atrás da bola (no canto e no lançamento, do lado de fora).
      if (pr.tipo === 'saida') return { x: pr.local.x + (pr.equipa === 0 ? -0.6 : 0.6), y: pr.local.y };
      return pr.local;
    }
    let alvo: { x: number; y: number };
    if (pr.tipo === 'saida') alvo = this.lugarSaida(p);
    else if (pr.tipo === 'canto' && p.team === pr.equipa && p.role !== 'GR') {
      // Canto: os cinco mais adiantados (e o central mais forte no ar) vão para a área; os outros ficam na forma.
      const area = s.players.filter((o) => o.onPitch && o.team === pr.equipa && o.role !== 'GR' && o.id !== pr.marcador)
        .sort((a, b) => (b.slot.x + atributo(b, 'cab') / 40) - (a.slot.x + atributo(a, 'cab') / 40)).slice(0, 5);
      const k = area.findIndex((o) => o.id === p.id);
      const spots = [[99, 30], [98, 37], [94, 33.5], [100.5, 34], [88, 32]];
      alvo = k >= 0 ? { x: xCampo(p.team, spots[k][0]), y: CAMPO.largura / 2 + (spots[k][1] - 34) * -(pr.lado ?? 1) } : forma[p.team].get(p.id) ?? p.pos;
    } else alvo = forma[p.team].get(p.id) ?? p.pos;
    // A equipa que não repõe fica a 9,15 m da bola (no lançamento, a 2 m).
    const raio = pr.tipo === 'lancamento' ? 2 : PARAGEM.distancia_m;
    if (p.team !== pr.equipa) {
      const d = dist(alvo, pr.local);
      if (d < raio) {
        const minha = { x: p.team === 0 ? 0 : CAMPO.comprimento, y: CAMPO.largura / 2 };
        const u = d > 0.3 ? { x: (alvo.x - pr.local.x) / d, y: (alvo.y - pr.local.y) / d } : (() => { const l = dist(minha, pr.local) || 1; return { x: (minha.x - pr.local.x) / l, y: (minha.y - pr.local.y) / l }; })();
        alvo = { x: pr.local.x + u.x * raio, y: pr.local.y + u.y * raio };
      }
    }
    // Pontapé de baliza: os adversários saem da grande área.
    if (pr.tipo === 'baliza' && p.team !== pr.equipa && Math.abs(alvo.y - CAMPO.largura / 2) < CAMPO.area_larg / 2 + 1) {
      const borda = CAMPO.area_comp + 1.5;
      alvo = pr.equipa === 0 ? { x: Math.max(alvo.x, borda), y: alvo.y } : { x: Math.min(alvo.x, CAMPO.comprimento - borda), y: alvo.y };
    }
    return clampCampo(alvo, pr.tipo === 'saida' ? 1 : -0.5);
  }

  /** A bola parada acaba quando o marcador está na bola e passou o tempo mínimo. */
  private talvezRecomecar() {
    const pr = this.paragem!, s = this.estado, m = this.jogador(pr.marcador);
    const t = s.tick - pr.inicio;
    if (!m || !m.onPitch) { const outro = s.players.filter((o) => o.onPitch && o.team === pr.equipa && o.role !== 'GR').sort((a, b) => dist(a.pos, pr.local) - dist(b.pos, pr.local))[0]; pr.marcador = outro.id; return; }
    const naBola = dist(m.pos, pr.local) < 1.2 && dist(s.ball.pos, pr.local) < 0.3;
    // No pontapé de saída esperam que todos estejam no seu meio-campo (ou o tempo máximo).
    const arrumados = pr.tipo !== 'saida' || s.players.every((o) => !o.onPitch || o.id === m.id || (o.team === 0 ? o.pos.x <= CAMPO.comprimento / 2 + 0.5 : o.pos.x >= CAMPO.comprimento / 2 - 0.5));
    if (naBola && t >= pr.min && (arrumados || t >= pr.max)) {
      s.ball.pos = { ...pr.local };
      this.paragem = null;
      this.darBola(m);
      this.accoes.clear();
    }
  }

  /** Um tick (100 ms). */
  passo() {
    if (this.terminado || this.emIntervalo) return;
    const s = this.estado;
    s.tick++;
    s.minute = s.tick / TICKS_MIN;
    if (!this.intervaloFeito && s.minute >= 45) { this.intervaloFeito = true; this.emIntervalo = true; this.ev('intervalo', 0, undefined, 'Intervalo'); return; }
    if (s.minute >= 90) { this.terminado = true; this.ev('fim', 0, undefined, 'Fim do jogo'); return; }
    // Nível macro: treinadores a cada 5 minutos.
    if (s.tick % (5 * TICKS_MIN) === 0) for (const c of this.treinadores) this.aplicarTreinador(c, c.avaliar(s));
    const forma = [formaEquipa(s, 0), formaEquipa(s, 1)];
    if (this.paragem) {
      // Bola parada: sem decisões; cada um vai para o seu lugar (a andar ou a trote) e o marcador vai à bola.
      for (const p of s.players) {
        if (!p.onPitch) continue;
        const alvo = this.alvoParagem(p, forma), d = dist(p.pos, alvo);
        const marc = p.id === this.paragem.marcador;
        const ritmo = marc ? (d > 10 ? RITMO.correr : RITMO.trote) : d < RITMO.andar_m ? RITMO.andar : d < 20 ? RITMO.trote : RITMO.correr;
        this.mover(p, alvo, ritmo, d > 4 && ritmo >= RITMO.trote ? alvo : this.paragem.local);
      }
      // A bola volta ao sítio da reposição (rola até lá: nunca salta).
      const b = s.ball, d = dist(b.pos, this.paragem.local);
      if (d > 0.01) { const k = Math.min(1, (12 * DT) / d); b.pos = { x: b.pos.x + (this.paragem.local.x - b.pos.x) * k, y: b.pos.y + (this.paragem.local.y - b.pos.y) * k }; }
      b.z = 0;
      this.talvezRecomecar();
      return;
    }
    // Nível micro: decisões (com bola a cada 200 ms, sem bola a cada 500 ms), com compromisso.
    const antes = this.accoes;
    this.accoes = cicloDecisao(s, antes);
    const portador = this.jogador(s.ball.ownerId);
    if (portador) this.estat.posse[portador.team]++;
    // Acção do portador (passe, remate, cruzamento lançam a bola) depois do tempo de controlo.
    if (portador) {
      const a = this.accoes.get(portador.id);
      // Tempo com a bola antes de soltar: controlo (1–2 s) e procura da melhor opção; sob pressão solta mais cedo.
      const pressao = s.players.some((o) => o.onPitch && o.team !== portador.team && dist(o.pos, portador.pos) < 3);
      const controlo = Math.round((pressao ? 8 : 22) + (20 - atributo(portador, 'ptq')) / 3 + (atributo(portador, 'dec') < 10 ? 4 : 0));
      if (a && (a.type === 'pass' || a.type === 'cross' || a.type === 'shoot') && s.tick - this.recebeuTick >= controlo) this.lancar(portador, a);
    }
    // Desarmes.
    for (const p of s.players) {
      if (!p.onPitch || this.paragem) continue;
      const a = this.accoes.get(p.id);
      if (a?.type === 'tackle' && a !== antes.get(p.id)) this.desarme(p);
    }
    if (this.paragem) return;
    // Movimento: alvo da decisão, ritmo pela distância e pelo momento do jogo, corpo virado para a bola ou para onde corre.
    const transicao = ((s.tick - s.possessionChangeTick) * FREQUENCIA.tick_ms) / 1000 <= JANELA_TRANSICAO_S;
    for (const p of s.players) {
      if (!p.onPitch) continue;
      const a = this.accoes.get(p.id);
      let alvo = a?.target ?? forma[p.team].get(p.id) ?? p.pos, ritmo: number, olhar: { x: number; y: number } | null = null;
      if (s.ball.ownerId === p.id) {
        alvo = a?.type === 'dribble' && a.target ? a.target : p.pos;
        ritmo = a?.option === 'driblar' ? RITMO.portador_conduz : RITMO.portador_protege;
        const livre = !s.players.some((o) => o.onPitch && o.team !== p.team && dist(o.pos, p.pos) < 8);
        if (a?.option === 'driblar' && livre) ritmo = RITMO.portador_espaco;
        // Contenção: um adversário à frente (a menos de 2 m, entre o portador e o alvo) trava a progressão.
        const dir = { x: alvo.x - p.pos.x, y: alvo.y - p.pos.y }, l = Math.hypot(dir.x, dir.y) || 1;
        if (s.players.some((o) => o.onPitch && o.team !== p.team && dist(o.pos, p.pos) < 2 && ((o.pos.x - p.pos.x) * dir.x + (o.pos.y - p.pos.y) * dir.y) / l > 0)) ritmo *= 0.4;
        olhar = alvo;
      } else {
        const d = dist(p.pos, alvo);
        ritmo = d < RITMO.andar_m ? RITMO.andar : d < RITMO.trote_m ? RITMO.trote : d < RITMO.correr_m ? RITMO.correr : 0.8;
        const semPosse = s.possessionTeam !== p.team;
        if ((a?.type === 'press' || a?.type === 'tackle') && dist(p.pos, s.ball.pos) < 20) ritmo = Math.max(ritmo, d < 1.5 ? RITMO.trote : RITMO.pressao);
        else if (a?.option === 'correr_espaco' && d > RITMO.andar_m) ritmo = Math.max(ritmo, RITMO.desmarcacao);
        // Transição defensiva: do lado errado da bola logo a seguir à perda, recua a correr.
        else if (semPosse && d > RITMO.trote_m && (p.team === 0 ? s.ball.pos.x < p.pos.x : s.ball.pos.x > p.pos.x)) ritmo = Math.max(ritmo, transicao ? RITMO.recuo_transicao : RITMO.correr);
        // Sem dono, o mais perto de cada equipa vai à bola (ao ponto onde a vai apanhar).
        const grFora = p.role === 'GR' && !(Math.abs(s.ball.pos.x - (p.team === 0 ? 0 : CAMPO.comprimento)) < CAMPO.area_comp && Math.abs(s.ball.pos.y - CAMPO.largura / 2) < CAMPO.area_larg / 2);
        const emVooParaColega = this.voo && this.voo.tipo !== 'solta' && this.voo.tipo !== 'remate';
        if (!s.ball.ownerId && !emVooParaColega && !grFora && this.maisPerto(p)) { alvo = this.pontoBola(p); ritmo = RITMO.bola_solta; }
        // Receptor de um passe vai ao ponto de encontro (não corre para a bola).
        if (this.voo?.para === p.id && this.voo.ponto && this.voo.tipo !== 'solta') { alvo = this.voo.ponto; ritmo = Math.max(RITMO.receptor * Math.min(1, dist(p.pos, alvo) / 4), RITMO.trote); }
      }
      this.mover(p, alvo, ritmo, olhar);
    }
    this.moverBola();
  }

  /** Move um jogador (steering), roda o corpo e gasta energia. `olhar`: para onde vira o corpo (por omissão, a bola
   *  quando vai devagar e o sentido da corrida quando corre). */
  private mover(p: PlayerState, alvo: { x: number; y: number }, ritmo: number, olhar: { x: number; y: number } | null) {
    const s = this.estado;
    const colegas = s.players.filter((o) => o.team === p.team && o.onPitch);
    const r = passoSteering(p, alvo, colegas, DT, ritmo);
    p.vel = r.vel;
    // Com a bola não sai do campo (vira antes da linha); sem bola pode pisar a linha.
    const m = s.ball.ownerId === p.id ? 1.2 : -1;
    p.pos = { x: Math.max(m, Math.min(CAMPO.comprimento - m, r.pos.x)), y: Math.max(m, Math.min(CAMPO.largura - m, r.pos.y)) };
    // Orientação do corpo: a correr olha para onde vai; parado ou a andar, para a bola. Roda com limite (Agilidade).
    const v = Math.hypot(p.vel.x, p.vel.y), L = limites(p);
    const corre = ritmo >= RITMO.correr && dist(p.pos, alvo) > 3;
    let para: number | null = null;
    if (olhar && dist(olhar, p.pos) > 0.3) para = Math.atan2(olhar.y - p.pos.y, olhar.x - p.pos.x);
    else if ((corre || v > MOVIMENTO.olhar_correr_ms) && dist(alvo, p.pos) > 0.5) para = Math.atan2(alvo.y - p.pos.y, alvo.x - p.pos.x);
    else if (s.ball.ownerId !== p.id && dist(s.ball.pos, p.pos) > 0.3) para = Math.atan2(s.ball.pos.y - p.pos.y, s.ball.pos.x - p.pos.x);
    if (para !== null) p.facing = rodar(p.facing ?? 0, para, L.viragem * MOVIMENTO.olhar_factor * DT);
    // Cansaço: a correr gasta mais (o Gegenpressen gasta 1,5×).
    const cons = ESTILOS_DECISAO[s.tactics[p.team].style]?.consumo ?? 1;
    const res = atributo(p, 'res');
    p.condition = Math.max(0.2, p.condition - DT * (v > 5 ? MOVIMENTO.fadiga_por_s_a_correr * (v / 5) * cons * (1.5 - res / 20) : MOVIMENTO.fadiga_por_s_parado));
  }

  /** Onde o jogador consegue apanhar a bola solta: a posição da bola daqui a t segundos (a rolar com atrito). */
  private pontoBola(p: PlayerState) {
    const b = this.estado.ball, L = limites(p);
    const t = Math.min(2, dist(p.pos, b.pos) / (L.velMax * 0.9));
    const n = t / DT, k = DT * (1 - Math.pow(ATRITO, n)) / (1 - ATRITO);
    return clampCampo({ x: b.pos.x + b.vel.x * k, y: b.pos.y + b.vel.y * k }, -1);
  }

  private maisPerto(p: PlayerState): boolean {
    const s = this.estado, d = dist(p.pos, s.ball.pos);
    return !s.players.some((o) => o.onPitch && o.team === p.team && o.id !== p.id && o.role !== 'GR' && dist(o.pos, s.ball.pos) < d);
  }

  private desarme(p: PlayerState) {
    const s = this.estado, c = this.jogador(s.ball.ownerId);
    if (!c || c.team === p.team || dist(p.pos, c.pos) > 2.2) return;
    // Dentro da própria área o defensor entra com tudo (mais desarmes, mas também mais risco de falta).
    const minhaArea = Math.abs(c.pos.x - (p.team === 0 ? 0 : CAMPO.comprimento)) < CAMPO.area_comp + 4;
    const pr = (minhaArea ? 0.35 : 0.2) + (atributo(p, 'des') - atributo(c, 'dri')) / 40 + (atributo(p, 'for') - atributo(c, 'equ')) / 80;
    const pf = 0.08 + atributo(p, 'agr') / 200 - atributo(p, 'des') / 300;
    if (this.r(`falta|${p.id}`) < pf) {
      this.estat.faltas[p.team]++;
      const am = this.r(`am|${p.id}`) < 0.18;
      if (am && !p.yellow) { p.yellow = true; this.estat.amarelos[p.team]++; this.ev('cartao', p.team, p, `Amarelo para ${p.name}`); for (const t of this.treinadores) this.aplicarTreinador(t, t.avaliar(s, true)); }
      else this.ev('falta', p.team, p, `Falta de ${p.name} sobre ${c.name}`);
      // Livre: bola parada no sítio da falta; quem sofreu a falta marca e os adversários afastam-se 9,15 m.
      this.iniciarParagem('livre', c.team, { ...c.pos }, c);
      return;
    }
    if (this.r(`des|${p.id}`) < pr) {
      this.estat.desarmes[p.team]++;
      this.ev('desarme', p.team, p, `${p.name} desarma ${c.name}`);
      this.darBola(p);
    }
  }

  /**
   * Lança a bola (passe, cruzamento, remate). O desfecho decide-se no toque, com semente fixa, a partir do erro humano
   * da acção, dos atributos e da pressão; a bola faz depois o percurso até ao destino (receptor, interceptor, baliza,
   * guarda-redes ou fora). A camada de física 2.5D vai substituir este percurso pela simulação da bola.
   */
  private lancar(p: PlayerState, a: Action) {
    const s = this.estado, erro = a.error ?? 0.1;
    const remate = a.type === 'shoot';
    s.ball.ownerId = null;
    s.ball.lastTeam = p.team;
    const vz = a.height === 'high' ? 9 : a.height === 'mid' ? 5 : a.height === 'low' ? 2 : 0;
    if (remate) {
      const gx = p.team === 0 ? CAMPO.comprimento : 0, gy = CAMPO.largura / 2;
      const d = Math.hypot(gx - p.pos.x, gy - p.pos.y);
      const ang = Math.abs(Math.atan2(gy + CAMPO.baliza / 2 - p.pos.y, gx - p.pos.x) - Math.atan2(gy - CAMPO.baliza / 2 - p.pos.y, gx - p.pos.x));
      // Pressão sobre o rematador: defensores a menos de 2,5 m (cada um conta) e o guarda-redes perto.
      let pr = 0;
      for (const o of s.players) if (o.onPitch && o.team !== p.team && o.role !== 'GR' && dist(o.pos, p.pos) < 2.5) pr += 0.5;
      const xgr = Math.round(xg(d, ang, Math.min(1, pr)) * 100) / 100;
      this.estat.remates[p.team]++; this.estat.xg[p.team] += xgr;
      s.lastShotMinute[p.team] = s.minute;
      const gr = s.players.find((o) => o.onPitch && o.team !== p.team && o.role === 'GR');
      // À baliza: depende da finalização e do erro; golo: xG ajustado pela finalização e pelo guarda-redes.
      const pAlvo = Math.max(0.15, Math.min(0.75, 0.25 + atributo(p, 'fin') / 50 + atributo(p, 'cmp') / 100 - erro));
      // Remate bloqueado por um adversário na linha (cada um bloqueia 35%).
      const tapam = s.players.filter((o) => o.onPitch && o.team !== p.team && o.role !== 'GR' && distSegmento(o.pos, p.pos, { x: gx, y: gy }) < 1.2 && dist(o.pos, p.pos) < d).length;
      if (tapam && this.r(`bloq|${p.id}`) < 1 - Math.pow(0.65, tapam)) {
        const bloq = s.players.filter((o) => o.onPitch && o.team !== p.team && o.role !== 'GR').sort((x, y) => dist(x.pos, p.pos) - dist(y.pos, p.pos))[0];
        this.ev('desarme', bloq.team, bloq, `${bloq.name} bloqueia o remate de ${p.name}`);
        this.lancarPara(p, { x: p.pos.x + (gx - p.pos.x) * 0.15, y: p.pos.y + (this.r('ress') - 0.5) * 8 }, 10, 1, 'passe', undefined);
        if (this.voo) this.voo = { ...this.voo, tipo: 'solta' };
        return;
      }
      const alvo = this.r(`alvo|${p.id}`) < pAlvo;
      const qGr = gr ? (atributo(gr, 'ref') + atributo(gr, 'uco') + atributo(gr, 'pos')) / 3 : 5;
      // Golos ≈ xG: P(golo | à baliza) = xG ajustado ÷ P(à baliza).
      const pGolo = Math.max(0.02, Math.min(0.92, (xgr * (1 + (atributo(p, 'fin') - 12) / 30) * (1 - (qGr - 10) / 25)) / pAlvo));
      const golo = alvo && this.r(`golo|${p.id}`) < pGolo;
      let destino: { x: number; y: number }, z = vz;
      if (golo) destino = { x: gx + (p.team === 0 ? 1.5 : -1.5), y: gy + (this.r('canto') < 0.5 ? -1 : 1) * (1.2 + 2 * this.r('canto2')) };
      else if (alvo && gr) destino = { ...gr.pos };
      else { const lado = this.r('lado') < 0.5 ? -1 : 1; destino = { x: gx + (p.team === 0 ? 2 : -2), y: gy + lado * (CAMPO.baliza / 2 + 1 + 4 * this.r('largo')) }; if (this.r('alto') < 0.3) z = 9; }
      this.lancarPara(p, destino, 18 + 12 * (a.power ?? 0.8), z, 'remate', undefined, xgr, golo ? 'golo' : alvo ? 'defesa' : 'fora');
      return;
    }
    const r = this.jogador(a.targetPlayerId);
    if (!r) { s.ball.ownerId = p.id; return; }
    this.estat.passes[p.team]++;
    // Sucesso do passe: erro, distância e a linha de passe (adversário perto da linha).
    const d = dist(p.pos, r.pos);
    let corte: PlayerState | null = null, dc = Infinity;
    for (const o of s.players) if (o.onPitch && o.team !== p.team) { const x = distSegmento(o.pos, p.pos, r.pos); if (x < dc) { dc = x; corte = o; } }
    const cruz = a.type === 'cross';
    const marcado = s.players.some((o) => o.onPitch && o.team !== p.team && dist(o.pos, r.pos) < 2);
    // Passe para a área adversária: cada defensor a menos de 4 m do receptor dificulta (cortes, antecipação, guarda-redes).
    const gxR = p.team === 0 ? CAMPO.comprimento : 0;
    const naArea = Math.abs(r.pos.x - gxR) < CAMPO.area_comp && Math.abs(r.pos.y - CAMPO.largura / 2) < CAMPO.area_larg / 2;
    const perto = naArea ? s.players.filter((o) => o.onPitch && o.team !== p.team && dist(o.pos, r.pos) < 4).length : 0;
    const pOk = Math.max(0.1, Math.min(0.97, 0.98 - (marcado ? 0.12 : 0) - (naArea ? 0.2 + 0.12 * perto : 0) - erro * 0.7 - Math.max(0, d - 20) / 120 - (dc < 1.5 ? 0.3 : dc < 3 ? 0.1 : 0) - (cruz ? 0.25 : 0) + (a.height === 'high' && dc < 3 ? 0.15 : 0)));
    const ok = this.r(`passe|${p.id}`) < pOk;
    const vel = 8 + 18 * Math.min(1, d / 45);
    // Ponto de encontro: onde o receptor vai estar quando a bola chegar (segue a corrida dele, até 1,2 s).
    const tV = d / vel, ad = Math.min(tV, 1.2);
    const lead = clampCampo({ x: r.pos.x + r.vel.x * ad, y: r.pos.y + r.vel.y * ad });
    if (ok || !corte) { this.lancarPara(p, lead, vel, vz, cruz ? 'cruzamento' : 'passe', r.id, undefined, undefined, lead); return; }
    if (dc < 4) {
      // Cortado: o adversário mete-se na linha (vai ao ponto da linha mais perto dele).
      const vx = lead.x - s.ball.pos.x, vy = lead.y - s.ball.pos.y, l2 = vx * vx + vy * vy || 1;
      const t = Math.max(0.1, Math.min(0.95, ((corte.pos.x - s.ball.pos.x) * vx + (corte.pos.y - s.ball.pos.y) * vy) / l2));
      this.lancarPara(p, lead, vel, vz, cruz ? 'cruzamento' : 'passe', corte.id, undefined, undefined, { x: s.ball.pos.x + vx * t, y: s.ball.pos.y + vy * t });
      return;
    }
    // Passe falhado sem ninguém na linha: a bola sai desviada (comprida ou para o lado) e fica solta.
    const lado = this.r(`desvio|${p.id}`) < 0.5 ? -1 : 1, ang = Math.atan2(lead.y - p.pos.y, lead.x - p.pos.x) + lado * (0.25 + erro);
    const dd = d * (1.1 + 0.3 * this.r(`longo|${p.id}`));
    const errado = { x: p.pos.x + Math.cos(ang) * dd, y: p.pos.y + Math.sin(ang) * dd };
    this.lancarPara(p, errado, vel, vz, cruz ? 'cruzamento' : 'passe', undefined, undefined, undefined, errado);
  }

  private lancarPara(p: PlayerState, destino: { x: number; y: number }, vel: number, vz: number, tipo: 'passe' | 'remate' | 'cruzamento', para?: string, xgr?: number, desfecho?: 'golo' | 'defesa' | 'fora', ponto?: { x: number; y: number }) {
    const s = this.estado;
    // A bola parte do pé (onde já está), sem saltos.
    const dir = Math.atan2(destino.y - s.ball.pos.y, destino.x - s.ball.pos.x);
    s.ball.vel = { x: Math.cos(dir) * vel, y: Math.sin(dir) * vel };
    // Com o arco (vz), o tempo de voo tem de chegar à distância: ajusta a velocidade vertical ao tempo de viagem.
    const t = dist(s.ball.pos, destino) / vel;
    const vzA = vz ? Math.min(vz, (G * t) / 2) : 0;
    this.voo = { de: p.id, equipa: p.team, para, tipo: para || tipo === 'remate' ? tipo : 'passe', vz: vzA, xg: xgr, desfecho, destino, ponto, inicio: s.tick, fim: s.tick + Math.max(2, Math.ceil(t / DT)) };
  }

  private moverBola() {
    const s = this.estado, b = s.ball;
    const dono = this.jogador(b.ownerId);
    if (dono) {
      // Conduzida: à frente do pé, para onde o corpo está virado; chega lá a deslizar (nunca salta).
      const f = dono.facing ?? (dono.team === 0 ? 0 : Math.PI);
      const pe = { x: dono.pos.x + Math.cos(f) * 0.7, y: dono.pos.y + Math.sin(f) * 0.7 };
      const d = dist(b.pos, pe), k = d > 0 ? Math.min(1, (16 * DT) / d) : 1;
      b.pos = { x: b.pos.x + (pe.x - b.pos.x) * k, y: b.pos.y + (pe.y - b.pos.y) * k }; b.z = 0;
      return;
    }
    const v = this.voo;
    b.pos = { x: b.pos.x + b.vel.x * DT, y: b.pos.y + b.vel.y * DT };
    if (v) { b.z = Math.max(0, b.z + v.vz * DT); v.vz -= G * DT; if (b.z === 0) v.vz = 0; }
    if (!v || v.tipo === 'solta') {
      // Bola solta: rola com atrito e quem chegar primeiro fica com ela (quem a soltou não a reapanha logo).
      b.vel = { x: b.vel.x * ATRITO, y: b.vel.y * ATRITO };
      if (this.limites()) return;
      if (b.z > 2) return;
      const area = (x: number) => Math.abs(b.pos.x - (x === 0 ? 0 : CAMPO.comprimento)) < CAMPO.area_comp;
      const p = s.players.filter((o) => o.onPitch && !(v && o.id === v.de && s.tick - v.inicio < 6) && dist(o.pos, b.pos) < (area(o.team) ? 1.8 : 1.3))
        .sort((x, y) => (area(y.team) ? 1 : 0) - (area(x.team) ? 1 : 0) || dist(x.pos, b.pos) - dist(y.pos, b.pos))[0];
      if (p) this.darBola(p);
      return;
    }
    if (v.tipo === 'remate') {
      if (v.desfecho === 'defesa' && s.tick >= v.fim) {
        const gr = s.players.find((o) => o.onPitch && o.team !== v.equipa && o.role === 'GR');
        const at = this.jogador(v.de);
        this.estat.aBaliza[v.equipa]++;
        if (gr) {
          this.ev('defesa', gr.team, gr, `${at?.name ?? ''} remata e ${gr.name} defende`, { xg: v.xg });
          if (this.r(`agarra|${gr.id}`) < 0.6) { this.darBola(gr); return; }
          // Desvia: a bola sai para a linha de fundo, ao lado do poste (canto), a rolar.
          const fora = { x: v.equipa === 0 ? CAMPO.comprimento + 1 : -1, y: CAMPO.largura / 2 + (this.r('desvio') < 0.5 ? -1 : 1) * (CAMPO.baliza / 2 + 2) };
          const l = dist(fora, b.pos) || 1;
          b.vel = { x: ((fora.x - b.pos.x) / l) * 14, y: ((fora.y - b.pos.y) / l) * 14 };
          b.lastTeam = gr.team;
          this.voo = { ...v, de: gr.id, tipo: 'solta', vz: 0, inicio: s.tick };
          return;
        }
      }
      this.limites();
      return;
    }
    // Passe/cruzamento: o receptor (ou o interceptor) recebe quando a bola chega a ele.
    const p = this.jogador(v.para);
    const alcance = v.tipo === 'cruzamento' ? 1.8 : 1.4;
    if (p && dist(p.pos, b.pos) < alcance && b.z < 2.3) {
      if (p.team === v.equipa) this.estat.passesCertos[v.equipa]++;
      else { this.ev('intercepcao', p.team, p, `${p.name} intercepta`); this.estat.desarmes[p.team]++; }
      this.darBola(p);
      return;
    }
    if (this.limites()) return;
    // Chegou ao destino sem ninguém: perde força e fica solta (o mais perto vai buscá-la).
    if (s.tick >= v.fim) { b.vel = { x: b.vel.x * CHEGADA, y: b.vel.y * CHEGADA }; this.voo = { ...v, tipo: 'solta', inicio: v.inicio - 10 }; }
  }

  /** Golo, fora, cantos e lançamentos. Devolve true se houve reposição. */
  private limites(): boolean {
    const s = this.estado, b = s.ball;
    const fora = b.pos.x < 0 || b.pos.x > CAMPO.comprimento || b.pos.y < 0 || b.pos.y > CAMPO.largura;
    if (!fora) return false;
    const naBaliza = (b.pos.x < 0 || b.pos.x > CAMPO.comprimento) && Math.abs(b.pos.y - CAMPO.largura / 2) < CAMPO.baliza / 2 && b.z < 2.44 && this.voo?.tipo === 'remate' && this.voo.desfecho === 'golo';
    const ultimo = b.lastTeam;
    if (naBaliza) {
      const marcou: Equipa = b.pos.x > CAMPO.comprimento ? 0 : 1;
      s.score[marcou]++;
      const at = this.jogador(this.voo?.de);
      if (this.voo?.tipo === 'remate') this.estat.aBaliza[marcou]++;
      this.ev('golo', marcou, at ?? undefined, `GOLO! ${at?.name ?? 'Autogolo'}${at && at.team !== marcou ? ' (autogolo)' : ''}`, { xg: this.voo?.xg });
      for (const t of this.treinadores) this.aplicarTreinador(t, t.avaliar(s, true));
      const sai: Equipa = marcou === 0 ? 1 : 0;
      this.iniciarParagem('saida', sai, { x: CAMPO.comprimento / 2, y: CAMPO.largura / 2 }, this.avancado(sai));
      return true;
    }
    if (this.voo?.tipo === 'remate') this.ev('fora', this.voo.equipa, this.jogador(this.voo.de) ?? undefined, `${this.jogador(this.voo.de)?.name ?? ''} remata para fora`, { xg: this.voo.xg });
    const outra: Equipa = ultimo === 0 ? 1 : 0;
    // Linha de fundo: canto (se a última a tocar foi a equipa que defende essa baliza) ou pontapé de baliza.
    if (b.pos.x < 0 || b.pos.x > CAMPO.comprimento) {
      const defende: Equipa = b.pos.x < 0 ? 0 : 1;
      if (ultimo === defende) {
        const ataca: Equipa = defende === 0 ? 1 : 0;
        this.estat.cantos[ataca]++;
        this.ev('canto', ataca, undefined, 'Canto');
        const local = { x: b.pos.x < 0 ? 0.5 : CAMPO.comprimento - 0.5, y: b.pos.y < CAMPO.largura / 2 ? 0.5 : CAMPO.largura - 0.5 };
        const marcador = s.players.filter((p) => p.onPitch && p.team === ataca && p.role !== 'GR').sort((a, c) => atributo(c, 'cru') - atributo(a, 'cru'))[0];
        this.iniciarParagem('canto', ataca, local, marcador);
      } else {
        const gr = s.players.find((p) => p.onPitch && p.team === defende && p.role === 'GR')!;
        this.iniciarParagem('baliza', defende, { x: defende === 0 ? 5.5 : CAMPO.comprimento - 5.5, y: CAMPO.largura / 2 + (b.pos.y < CAMPO.largura / 2 ? -5 : 5) }, gr);
      }
      return true;
    }
    // Lançamento lateral: o jogador da outra equipa mais perto.
    const local = { x: Math.max(1, Math.min(CAMPO.comprimento - 1, b.pos.x)), y: b.pos.y < 0 ? 0 : CAMPO.largura };
    const quem = s.players.filter((p) => p.onPitch && p.team === outra && p.role !== 'GR').sort((a, c) => dist(a.pos, local) - dist(c.pos, local))[0];
    this.iniciarParagem('lancamento', outra, local, quem);
    return true;
  }

  aplicarTreinador(c: CoachAI, d: DecisaoTreinador[]) {
    if (!d.length) return;
    c.aplicar(this.estado, d);
    for (const x of d) {
      if (x.tipo === 'substituicao') { const e = this.jogador(x.entra), s = this.jogador(x.sai); this.ev('substituicao', c.team, e ?? undefined, `Substituição: entra ${e?.name}, sai ${s?.name} (${x.motivo})`); }
      else if (x.tipo !== 'agressividade') this.ev('tactica', c.team, undefined, `${this.cfg.equipas[c.team].nome}: ${x.tipo === 'mentalidade' ? 'mentalidade mais ofensiva' : x.tipo === 'pressao' ? 'mais pressão' : 'mais largura'} (${x.motivo})`);
    }
  }

  /** Retoma depois do intervalo (as indicações do Presidente aplicam-se antes). */
  retomar() {
    if (!this.emIntervalo) return;
    this.emIntervalo = false;
    this.paragem = null; this.voo = null;
    this.saidaSegundaParte(1);
  }

  /** Corre até ao minuto dado (ou ao intervalo / fim). */
  correrAte(minuto: number) { while (!this.terminado && !this.emIntervalo && this.estado.minute < minuto) this.passo(); }

  /** Bola parada em curso (texto para o ecrã) ou null. */
  get textoParagem(): string | null { return this.paragem ? TEXTO_PARAGEM[this.paragem.tipo] : null; }

  frame(): Frame {
    const s = this.estado;
    return {
      tick: s.tick, minuto: s.minute, paragem: this.paragem ? TEXTO_PARAGEM[this.paragem.tipo] : null, bola: { x: s.ball.pos.x, y: s.ball.pos.y, z: s.ball.z },
      jogadores: s.players.filter((p) => p.onPitch).map((p) => ({ id: p.id, team: p.team, numero: p.number, nome: p.name, x: p.pos.x, y: p.pos.y, facing: p.facing ?? 0, bola: s.ball.ownerId === p.id, accao: this.paragem ? 'bola_parada' : this.accoes.get(p.id)?.option ?? '' })),
    };
  }
}
