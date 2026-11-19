// Simulação 2D de um jogo para o ecrã "Ao vivo": usa o motor de decisão (camada 1) para decidir o que cada jogador faz
// e o steering para os mover. A bola é PROVISÓRIA (cinemática simples com altura e gravidade) até à camada de física
// 2.5D (fase seguinte), que vai ler a mesma acção (força, direcção, altura, rotação).
// Determinística: a mesma configuração dá sempre o mesmo jogo (aleatoriedade com sementes fixas).
import { CAMPO, FREQUENCIA, ESTILOS_DECISAO, MOVIMENTO } from '../../config/decisao.ts';
import { cicloDecisao, limparMemo } from '../decision/DecisionEngine.ts';
import { atributo } from '../decision/ActionEvaluator.ts';
import { aleatorio } from '../decision/rng.ts';
import { passo as passoSteering, dist } from '../physics/Steering.ts';
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
export interface Frame { tick: number; minuto: number; bola: { x: number; y: number; z: number }; jogadores: { id: string; team: Equipa; numero: number; nome: string; x: number; y: number; bola: boolean; accao: string }[] }

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
  private voo: { de: string; equipa: Equipa; para?: string; tipo: 'passe' | 'remate' | 'cruzamento' | 'solta'; vz: number; xg?: number; desfecho?: 'golo' | 'defesa' | 'fora'; destino?: { x: number; y: number }; fim: number } | null = null;
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

  /** Reposição: pontapé de saída depois de golo (equipas nas posições iniciais). */
  private pontapeSaida(team: Equipa) {
    const s = this.estado;
    for (const p of s.players) if (p.onPitch) { p.pos = posicaoInicial(p.team, { x: p.slot.x, y: p.team === 0 ? p.slot.y : 1 - p.slot.y }); p.vel = { x: 0, y: 0 }; }
    const pl = s.players.filter((p) => p.onPitch && p.team === team && p.role !== 'GR').sort((a, b) => b.slot.x - a.slot.x)[0];
    pl.pos = { x: CAMPO.comprimento / 2, y: CAMPO.largura / 2 };
    s.ball.pos = { ...pl.pos };
    this.darBola(pl);
    this.accoes.clear();
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
    // Nível micro: decisões (com bola a cada 200 ms, sem bola a cada 500 ms).
    const antes = this.accoes;
    this.accoes = cicloDecisao(s, antes);
    const portador = this.jogador(s.ball.ownerId);
    if (portador) this.estat.posse[portador.team]++;
    // Acção do portador quando muda (passe, remate, cruzamento lançam a bola).
    if (portador) {
      const a = this.accoes.get(portador.id);
      // Controlo de bola: 0,4–0,8 s antes de passar ou rematar (menos com bom primeiro toque).
      // Tempo com a bola antes de soltar: controlo (1–2 s) e procura da melhor opção; sob pressão solta mais cedo.
      const pressao = s.players.some((o) => o.onPitch && o.team !== portador.team && dist(o.pos, portador.pos) < 3);
      const controlo = Math.round((pressao ? 8 : 22) + (20 - atributo(portador, 'ptq')) / 3 + (atributo(portador, 'dec') < 10 ? 4 : 0));
      if (a && (a.type === 'pass' || a.type === 'cross' || a.type === 'shoot') && s.tick - this.recebeuTick >= controlo) this.lancar(portador, a);
    }
    // Desarmes.
    for (const p of s.players) {
      if (!p.onPitch) continue;
      const a = this.accoes.get(p.id);
      if (a?.type === 'tackle' && a !== antes.get(p.id)) this.desarme(p);
    }
    // Movimento (steering).
    for (const p of s.players) {
      if (!p.onPitch) continue;
      const a = this.accoes.get(p.id);
      let alvo = a?.target ?? p.pos, urg = 0.5;
      if (s.ball.ownerId === p.id) {
        alvo = a?.type === 'dribble' && a.target ? a.target : p.pos; urg = a?.option === 'driblar' ? 0.7 : 0.25;
        // Contenção: um adversário à frente (a menos de 2 m, entre o portador e o alvo) trava a progressão.
        const dir = { x: alvo.x - p.pos.x, y: alvo.y - p.pos.y }, l = Math.hypot(dir.x, dir.y) || 1;
        if (s.players.some((o) => o.onPitch && o.team !== p.team && dist(o.pos, p.pos) < 2 && ((o.pos.x - p.pos.x) * dir.x + (o.pos.y - p.pos.y) * dir.y) / l > 0)) urg *= 0.4;
      }
      else if (a?.type === 'press' || a?.type === 'tackle') urg = 1;
      else if (a?.option === 'correr_espaco') urg = 0.85;
      else if (a?.type === 'mark' || a?.option === 'interceptar') urg = 0.75;
      // Sem a bola e com a bola mais perto da minha baliza do que eu: recuo a correr.
      else if (s.possessionTeam !== p.team && (p.team === 0 ? s.ball.pos.x < p.pos.x : s.ball.pos.x > p.pos.x)) urg = 1;
      // Sem dono, o mais perto de cada equipa vai à bola.
      const grFora = p.role === 'GR' && !(Math.abs(s.ball.pos.x - (p.team === 0 ? 0 : CAMPO.comprimento)) < CAMPO.area_comp && Math.abs(s.ball.pos.y - CAMPO.largura / 2) < CAMPO.area_larg / 2);
      if (!s.ball.ownerId && !grFora && this.maisPerto(p)) { alvo = s.ball.pos; urg = 1; }
      // Receptor de um passe vai ao encontro da bola.
      if (this.voo?.para === p.id) { alvo = s.ball.pos; urg = 0.9; }
      const colegas = s.players.filter((o) => o.team === p.team && o.onPitch);
      const r = passoSteering(p, alvo, colegas, DT, urg);
      p.vel = r.vel;
      // Com a bola não sai do campo (vira antes da linha); sem bola pode pisar a linha.
      const m = s.ball.ownerId === p.id ? 1.2 : -1;
      p.pos = { x: Math.max(m, Math.min(CAMPO.comprimento - m, r.pos.x)), y: Math.max(m, Math.min(CAMPO.largura - m, r.pos.y)) };
      // Cansaço: a correr gasta mais (o Gegenpressen gasta 1,5×).
      const v = Math.hypot(p.vel.x, p.vel.y), cons = ESTILOS_DECISAO[s.tactics[p.team].style]?.consumo ?? 1;
      const res = atributo(p, 'res');
      p.condition = Math.max(0.2, p.condition - DT * (v > 5 ? MOVIMENTO.fadiga_por_s_a_correr * (v / 5) * cons * (1.5 - res / 20) : MOVIMENTO.fadiga_por_s_parado));
    }
    this.moverBola();
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
      // Livre: a bola fica com o portador, o defensor recua.
      p.pos = { x: p.pos.x - (p.team === 0 ? 4 : -4), y: p.pos.y };
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
    this.estat.passes[p.team]++;
    const r = this.jogador(a.targetPlayerId);
    if (!r) return;
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
    const quem = ok || !corte ? r : corte;
    const lead = ok ? (a.target ?? r.pos) : quem.pos;
    this.lancarPara(p, lead, 8 + 18 * Math.min(1, d / 45), vz, cruz ? 'cruzamento' : 'passe', quem.id);
  }

  private lancarPara(p: PlayerState, destino: { x: number; y: number }, vel: number, vz: number, tipo: 'passe' | 'remate' | 'cruzamento', para?: string, xgr?: number, desfecho?: 'golo' | 'defesa' | 'fora') {
    const s = this.estado;
    const dir = Math.atan2(destino.y - p.pos.y, destino.x - p.pos.x);
    s.ball.pos = { x: p.pos.x + Math.cos(dir) * 0.6, y: p.pos.y + Math.sin(dir) * 0.6 };
    s.ball.vel = { x: Math.cos(dir) * vel, y: Math.sin(dir) * vel };
    // Com o arco (vz), o tempo de voo tem de chegar à distância: ajusta a velocidade vertical ao tempo de viagem.
    const t = dist(p.pos, destino) / vel;
    const vzA = vz ? Math.min(vz, (G * t) / 2) : 0;
    this.voo = { de: p.id, equipa: p.team, para, tipo, vz: vzA, xg: xgr, desfecho, destino, fim: s.tick + Math.max(2, Math.ceil(t / DT)) };
  }

  private moverBola() {
    const s = this.estado, b = s.ball;
    const dono = this.jogador(b.ownerId);
    if (dono) {
      // Conduzida: à frente do pé, no sentido do movimento.
      const v = Math.hypot(dono.vel.x, dono.vel.y);
      const f = v > 0.3 ? { x: dono.vel.x / v, y: dono.vel.y / v } : { x: dono.team === 0 ? 1 : -1, y: 0 };
      b.pos = { x: dono.pos.x + f.x * 0.7, y: dono.pos.y + f.y * 0.7 }; b.z = 0;
      return;
    }
    const v = this.voo;
    b.pos = { x: b.pos.x + b.vel.x * DT, y: b.pos.y + b.vel.y * DT };
    if (v) { b.z = Math.max(0, b.z + v.vz * DT); v.vz -= G * DT; if (b.z === 0) v.vz = 0; }
    if (!v || v.tipo === 'solta') {
      // Bola solta: rola e quem chegar primeiro fica com ela.
      b.vel = { x: b.vel.x * 0.96, y: b.vel.y * 0.96 };
      if (this.limites()) return;
      // Na área, os defensores (em maior número e de frente para a bola) chegam primeiro às sobras.
      const area = (x: number) => Math.abs(b.pos.x - (x === 0 ? 0 : CAMPO.comprimento)) < CAMPO.area_comp;
      const p = s.players.filter((o) => o.onPitch && dist(o.pos, b.pos) < (area(o.team) ? 2.2 : 1.4)).sort((x, y) => (area(y.team) ? 1 : 0) - (area(x.team) ? 1 : 0) || dist(x.pos, b.pos) - dist(y.pos, b.pos))[0];
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
          // Desvia: para canto ou bola solta na área.
          // Desvia para fora pela linha de fundo, ao lado do poste (canto).
          b.pos = { x: v.equipa === 0 ? CAMPO.comprimento + 0.5 : -0.5, y: CAMPO.largura / 2 + (this.r('desvio') < 0.5 ? -1 : 1) * (CAMPO.baliza / 2 + 2) };
          b.lastTeam = gr.team;
          this.voo = { ...v, tipo: 'solta', vz: 0 };
          this.limites();
          return;
        }
      }
      this.limites();
      return;
    }
    // Passe/cruzamento: chega ao receptor (ou ao interceptor) no fim do voo.
    const p = this.jogador(v.para);
    if (p && (s.tick >= v.fim || dist(p.pos, b.pos) < 1.2)) {
      if (p.team === v.equipa) this.estat.passesCertos[v.equipa]++;
      else { this.ev('intercepcao', p.team, p, `${p.name} intercepta`); this.estat.desarmes[p.team]++; }
      b.pos = { ...p.pos };
      this.darBola(p);
      return;
    }
    if (this.limites()) return;
    if (s.tick > v.fim + 15) this.voo = { ...v, tipo: 'solta' };
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
      this.pontapeSaida(marcou === 0 ? 1 : 0);
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
        b.pos = { x: b.pos.x < 0 ? 0.5 : CAMPO.comprimento - 0.5, y: b.pos.y < CAMPO.largura / 2 ? 0.5 : CAMPO.largura - 0.5 };
        const marcador = s.players.filter((p) => p.onPitch && p.team === ataca && p.role !== 'GR').sort((a, c) => atributo(c, 'cru') - atributo(a, 'cru'))[0];
        marcador.pos = { ...b.pos };
        this.darBola(marcador);
      } else {
        const gr = s.players.find((p) => p.onPitch && p.team === defende && p.role === 'GR')!;
        b.pos = { x: defende === 0 ? 6 : CAMPO.comprimento - 6, y: CAMPO.largura / 2 };
        gr.pos = { ...b.pos };
        this.darBola(gr);
      }
      return true;
    }
    // Lançamento lateral: o jogador da outra equipa mais perto.
    b.pos = { x: Math.max(1, Math.min(CAMPO.comprimento - 1, b.pos.x)), y: b.pos.y < 0 ? 0.3 : CAMPO.largura - 0.3 };
    const quem = s.players.filter((p) => p.onPitch && p.team === outra && p.role !== 'GR').sort((a, c) => dist(a.pos, b.pos) - dist(c.pos, b.pos))[0];
    quem.pos = { ...b.pos };
    this.darBola(quem);
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
  retomar() { this.emIntervalo = false; }

  /** Corre até ao minuto dado (ou ao intervalo / fim). */
  correrAte(minuto: number) { while (!this.terminado && !this.emIntervalo && this.estado.minute < minuto) this.passo(); }

  frame(): Frame {
    const s = this.estado;
    return {
      tick: s.tick, minuto: s.minute, bola: { x: s.ball.pos.x, y: s.ball.pos.y, z: s.ball.z },
      jogadores: s.players.filter((p) => p.onPitch).map((p) => ({ id: p.id, team: p.team, numero: p.number, nome: p.name, x: p.pos.x, y: p.pos.y, bola: s.ball.ownerId === p.id, accao: this.accoes.get(p.id)?.option ?? '' })),
    };
  }
}
