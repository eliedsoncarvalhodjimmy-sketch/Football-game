// Motor 2D táctico (docs/tactics/MOTOR_2D.md). Fase 1: formações e bloco. Fase 2: bola com física e passes curtos.
// Camadas: 1 fase, 2 bloco, 3 âncoras, 4 acções sem bola (MANTER_POSICAO, OFERECER_APOIO, RECUPERAR), 5 portador (só
// passes curtos), 6 movimento, 7 bola e resolução (recepção, intercepção pela trajectória, bola solta, reposições).
// Com `porBola` a bola passa a ser um ponto movido por fora (modo da Fase 1: arrastada ou num caminho).
// Determinístico (sementes fixas), sem DOM; um tick = 0,1 s de jogo.
import { TICK_S, CAMPO_2D, FISICA } from '../../config/match2d/fisica.ts';
import { BLOCO, FASES } from '../../config/match2d/bloco.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { TRANSICAO_FORMA_S } from '../../config/match2d/formacoes.ts';
import { BOLA, RECEPCAO, APOIO, COMPROMISSO_2D, REPOSICAO } from '../../config/match2d/bola.ts';
import { alvoBloco, ancora, filtrarBloco, forma, medidasForma, linhaForaDeJogo } from './bloco.ts';
import { moverJogador, intensidadePara } from './fisica.ts';
import { avancarBola, preverTrajectoria, pontoIntercepcao, tempoChegada, TICKS_SEM_RETOQUE } from './bola.ts';
import { avaliarPasses, executarPasse, tempoDecisao, normal } from './passe.ts';
import { melhorApoio, pontuarApoio } from './apoio.ts';
import { distSegmento } from '../decision/ContextBuilder.ts';
import { aleatorio } from '../decision/rng.ts';
import { paraAbsoluto, paraEquipa, dist, anguloAbsoluto, hyp } from './referencial.ts';
import type { IdEstilo } from '../../config/estilos.ts';
import type { Equipa, Estado2D, EstadoEquipa, Fase, Jogador2D, JogadorBase2D, V2, Evento2D, Intensidade } from './tipos.ts';

export interface ConfigEquipa2D { nome: string; formacao: string; estilo: IdEstilo; jogadores: JogadorBase2D[] }
export interface Config2D { equipas: [ConfigEquipa2D, ConfigEquipa2D]; posse?: Equipa; bola?: V2; semente?: string }

/** Compromisso da RECUPERAR (m da âncora: entra / sai). */
const RECUPERAR_ENTRA = 10, RECUPERAR_SAI = 4;
const TICKS_BLOCO = Math.round(BLOCO.periodo_s / TICK_S);
const TICKS_ACCAO = Math.round(COMPROMISSO_2D.acao_min_s / TICK_S);
const outra = (e: Equipa): Equipa => (e === 0 ? 1 : 0);

export class Motor2D {
  estado: Estado2D;
  semente: string;
  private papeis: [string[], string[]];
  /** Tick em que o portador recebeu a bola (decide ao fim do tempo de decisão). */
  private recebeu = 0;

  constructor(cfg: Config2D) {
    const posse = cfg.posse ?? 0;
    this.semente = cfg.semente ?? 'motor2d';
    const eq = (e: Equipa): EstadoEquipa => {
      const c = cfg.equipas[e], b = { linhaDefX: 30, comprimento: 30, largura: 40, centroY: 34 };
      return { nome: c.nome, estilo: c.estilo, formacao: c.formacao, fase: posse === e ? 'ATQ_CONSTRUCAO' : 'DEF_ORGANIZADA', faseDesde: 0, bloco: b, alvo: b, mistura: posse === e ? 1 : 0 };
    };
    const centro = { x: CAMPO_2D.comprimento / 2, y: CAMPO_2D.largura / 2 };
    this.estado = {
      tick: 0, posse, equipas: [eq(0), eq(1)], jogadores: [],
      bola: { p: { ...(cfg.bola ?? centro) }, z: 0, v: { x: 0, y: 0 }, vz: 0, dono: null, ultimo: null, equipaUltima: posse, tickUltimo: -99, passe: null },
      bolaExterna: false, reposicao: null, eventos: [],
      estat: { passes: [0, 0], certos: [0, 0], intercepcoes: [0, 0], mausToques: [0, 0], posse: [0, 0], sequencias: [] },
      passesSeguidos: 0, posseDesde: 0,
    };
    for (const e of [0, 1] as Equipa[]) {
      const f = forma(cfg.equipas[e].formacao);
      cfg.equipas[e].jogadores.slice(0, 11).forEach((b, k) => {
        this.estado.jogadores.push({ ...b, equipa: e, lugar: k, chave: f.lugares[k].chave, p: { x: 0, y: 0 }, v: { x: 0, y: 0 }, corpo: anguloAbsoluto(e, 0),
          accao: 'MANTER_POSICAO', accaoDesde: 0, intensidade: 'andar', ancora: { x: 0, y: 0 }, ancoraAntes: { x: 0, y: 0 },
          alvoAccao: null, pontuacao: 0, proxDecisao: (k * 3) % 5, tarefaBola: null, alvoBola: null });
      });
    }
    this.papeis = [this.papeisDe(0), this.papeisDe(1)];
    for (const e of [0, 1] as Equipa[]) { const q = this.estado.equipas[e]; q.alvo = alvoBloco(this.estado, e, this.papeis[e]); q.bloco = { ...q.alvo }; }
    for (const j of this.estado.jogadores) { j.ancora = paraAbsoluto(j.equipa, ancora(this.estado, j, this.papeis[j.equipa])); j.ancoraAntes = { ...j.ancora }; j.p = { ...j.ancora }; }
    // Sem bola dada: começa com o central da equipa com a posse (saída de bola pela defesa).
    if (!cfg.bola) {
      const dc = this.estado.jogadores.find((j) => j.equipa === posse && j.chave.startsWith('DC'))!;
      this.darBola(dc, false);
      this.estado.bola.p = { ...dc.p };
    }
  }

  private papeisDe(e: Equipa) { return this.estado.jogadores.filter((j) => j.equipa === e).sort((a, b) => a.lugar - b.lugar).map((j) => j.papel); }
  private jog(id: string | null) { return id ? this.estado.jogadores.find((j) => j.id === id) ?? null : null; }
  private ev(tipo: Evento2D['tipo'], equipa: Equipa, j?: Jogador2D | null, outro?: Jogador2D | null) {
    const s = this.estado;
    s.eventos.push({ tick: s.tick, tipo, equipa, jogador: j?.id, outro: outro?.id, x: s.bola.p.x, y: s.bola.p.y });
    if (s.eventos.length > 400) s.eventos.splice(0, s.eventos.length - 400);
  }

  /** Fase 1: move a bola por fora (arrastada ou num caminho); a velocidade é estimada pelo deslocamento. */
  porBola(p: V2, dt = TICK_S) {
    const s = this.estado, b = s.bola;
    s.bolaExterna = true; b.dono = null; b.passe = null; s.reposicao = null;
    for (const j of s.jogadores) { j.tarefaBola = null; j.alvoBola = null; }
    b.v = { x: (p.x - b.p.x) / dt, y: (p.y - b.p.y) / dt };
    b.p = { x: Math.max(0, Math.min(CAMPO_2D.comprimento, p.x)), y: Math.max(0, Math.min(CAMPO_2D.largura, p.y)) };
  }

  /** Volta à bola real (Fase 2): a bola fica com o jogador da equipa com a posse mais perto dela. */
  bolaReal() {
    const s = this.estado;
    if (!s.bolaExterna) return;
    s.bolaExterna = false;
    const j = s.jogadores.filter((o) => o.equipa === s.posse).sort((a, b) => dist(a.p, s.bola.p) - dist(b.p, s.bola.p))[0];
    s.bola.v = { x: 0, y: 0 };
    this.darBola(j, false);
  }

  /** Troca a posse: quem a ganhou entra em transição defesa→ataque, quem a perdeu em transição ataque→defesa. */
  trocarPosse() {
    const s = this.estado, nova = outra(s.posse);
    if (!s.bolaExterna) {
      // Com bola real, a bola passa ao jogador da outra equipa mais perto dela.
      const j = s.jogadores.filter((o) => o.equipa === nova).sort((a, b) => dist(a.p, s.bola.p) - dist(b.p, s.bola.p))[0];
      s.bola.v = { x: 0, y: 0 }; s.bola.passe = null; s.reposicao = null;
      this.darBola(j, false);
      return;
    }
    this.ganharPosse(nova);
  }

  private ganharPosse(e: Equipa) {
    const s = this.estado;
    if (s.posse === e) return;
    s.estat.sequencias.push(s.passesSeguidos);
    s.posse = e; s.passesSeguidos = 0; s.posseDesde = s.tick;
    this.mudarFase(e, 'TRANS_DEF_ATQ');
    this.mudarFase(outra(e), 'TRANS_ATQ_DEF');
  }

  /** A bola fica aos pés de j (recepção controlada). */
  private darBola(j: Jogador2D, dePasse: boolean) {
    const s = this.estado, b = s.bola;
    const equipaAntes = s.posse;
    b.dono = j.id; b.v = { x: 0, y: 0 }; b.z = 0; b.vz = 0; b.ultimo = j.id; b.equipaUltima = j.equipa; b.tickUltimo = s.tick;
    if (b.passe && dePasse && j.equipa === equipaAntes) s.passesSeguidos++;
    b.passe = null;
    this.recebeu = s.tick;
    for (const o of s.jogadores) { o.tarefaBola = null; o.alvoBola = null; }
    this.ganharPosse(j.equipa);
  }

  mudarFormacao(e: Equipa, formacao: string, papeis?: string[]) {
    const eq = this.estado.equipas[e], f = forma(formacao);
    eq.formacao = formacao;
    this.estado.jogadores.filter((j) => j.equipa === e).forEach((j) => { j.chave = f.lugares[j.lugar].chave; if (papeis?.[j.lugar]) j.papel = papeis[j.lugar]; });
    this.papeis[e] = this.papeisDe(e);
  }
  mudarEstilo(e: Equipa, estilo: IdEstilo) { this.estado.equipas[e].estilo = estilo; }

  private mudarFase(e: Equipa, f: Fase) { const eq = this.estado.equipas[e]; if (eq.fase !== f) { eq.fase = f; eq.faseDesde = this.estado.tick; } }

  /** Camada 1: fase da equipa (por evento, pela zona da bola e pela posse estabilizada). */
  private actualizarFase(e: Equipa) {
    const s = this.estado, eq = s.equipas[e], P = ESTILOS_2D[eq.estilo];
    if (s.reposicao) { this.mudarFase(e, 'BOLA_PARADA'); return; }
    const t = (s.tick - eq.faseDesde) * TICK_S;
    const b = paraEquipa(e, s.bola.p);
    if (s.posse === e) {
      // Transição defesa→ataque até ao tempo do estilo ou até a posse estabilizar (2 passes seguidos).
      if (eq.fase === 'TRANS_DEF_ATQ' && t < P.transDefAtqS && s.passesSeguidos < 2) return;
      const naArea = b.x > CAMPO_2D.comprimento - 16.5 && Math.abs(b.y - CAMPO_2D.largura / 2) < 20.15;
      const fin = naArea || (b.x >= FASES.finalizacao_desde && Math.abs(b.y - CAMPO_2D.largura / 2) < FASES.finalizacao_corredor);
      this.mudarFase(e, fin ? 'ATQ_FINALIZACAO' : b.x >= FASES.criacao_desde ? 'ATQ_CRIACAO' : 'ATQ_CONSTRUCAO');
    } else {
      if (eq.fase !== 'TRANS_ATQ_DEF') { this.mudarFase(e, 'DEF_ORGANIZADA'); return; }
      const formado = t > 1.5 && s.jogadores.every((j) => j.equipa !== e || dist(j.p, j.ancora) < FASES.bloco_formado_m);
      if (t >= P.transAtqDefS || formado) this.mudarFase(e, 'DEF_ORGANIZADA');
    }
  }

  /** Um tick (0,1 s de jogo). */
  passo() {
    const s = this.estado, dt = TICK_S;
    s.tick++;
    // Camadas 1 e 2: fase, forma (mistura gradual) e bloco.
    for (const e of [0, 1] as Equipa[]) {
      const eq = s.equipas[e];
      this.actualizarFase(e);
      const alvoM = eq.fase === 'BOLA_PARADA' ? (s.posse === e ? 1 : 0) : eq.fase.startsWith('ATQ') || eq.fase === 'TRANS_DEF_ATQ' ? 1 : 0;
      eq.mistura += Math.max(-dt / TRANSICAO_FORMA_S, Math.min(dt / TRANSICAO_FORMA_S, alvoM - eq.mistura));
      if ((s.tick + e) % TICKS_BLOCO === 0) eq.alvo = alvoBloco(s, e, this.papeis[e]);
      eq.bloco = filtrarBloco(eq.bloco, eq.alvo, dt);
    }
    // Camada 3: âncoras.
    const med = [0, 1].map((e) => medidasForma(s.equipas[e].formacao, this.papeis[e], s.equipas[e].mistura));
    const fj = [linhaForaDeJogo(s, 0), linhaForaDeJogo(s, 1)];
    for (const j of s.jogadores) { j.ancoraAntes = j.ancora; j.ancora = paraAbsoluto(j.equipa, ancora(s, j, this.papeis[j.equipa], med[j.equipa], fj[j.equipa])); }
    const portador = this.jog(s.bola.dono);
    if (portador) s.estat.posse[portador.equipa]++;
    // Camada 5: o portador decide ao fim do tempo de decisão (só passes curtos na Fase 2).
    if (!s.bolaExterna && portador && (s.tick - this.recebeu) * dt >= tempoDecisao(s, portador)) this.decidirPortador(portador);
    // Camada 7: quem vai à bola (receber, interceptar, bola solta, repor).
    if (!s.bolaExterna) this.tarefasBola();
    // Camada 4: acções sem bola.
    this.accoesSemBola();
    // Camada 6: movimento.
    this.mover();
    // Camada 7: bola e resolução.
    if (!s.bolaExterna) this.moverBola();
  }

  private decidirPortador(j: Jogador2D) {
    const s = this.estado, b = s.bola;
    const op = avaliarPasses(s, j);
    if (!op.length) { this.recebeu = s.tick - Math.round(tempoDecisao(s, j) / TICK_S) + 5; return; } // sem passe: espera 0,5 s
    const o = op[0];
    b.v = executarPasse(s, j, o);
    b.dono = null; b.ultimo = j.id; b.equipaUltima = j.equipa; b.tickUltimo = s.tick;
    b.passe = { de: j.id, para: o.receptor.id, destino: o.destino, tick: s.tick };
    s.estat.passes[j.equipa]++;
    j.corpo = Math.atan2(b.v.y, b.v.x);
    this.ev('passe', j.equipa, j, o.receptor);
  }

  /** Camada 7: para cada equipa, quem chega primeiro à bola vai lá; os outros seguem a sua acção. */
  private tarefasBola() {
    const s = this.estado, b = s.bola;
    for (const j of s.jogadores) if (j.tarefaBola !== 'repor') { j.tarefaBola = null; j.alvoBola = null; }
    if (s.reposicao) { const m = this.jog(s.reposicao.marcador); if (m) { m.tarefaBola = 'repor'; m.alvoBola = s.reposicao.local; } return; }
    if (b.dono) return;
    let traj = preverTrajectoria(b.p, b.v);
    if (!traj.length) traj = [{ t: TICK_S, p: b.p, s: 0 }];
    const fim = traj[traj.length - 1].p;
    const bloqueado = (j: Jogador2D) => j.id === b.ultimo && s.tick - b.tickUltimo < TICKS_SEM_RETOQUE;
    for (const e of [0, 1] as Equipa[]) {
      let melhor: { j: Jogador2D; t: number; p: V2 } | null = null;
      for (const j of s.jogadores) {
        if (j.equipa !== e || bloqueado(j)) continue;
        const q = pontoIntercepcao(j, traj);
        if (q && (!melhor || q.t < melhor.t)) melhor = { j, t: q.t, p: q.p };
      }
      const emPasse = !!b.passe;
      if (melhor) {
        const atacante = emPasse && e === b.equipaUltima;
        melhor.j.tarefaBola = atacante ? 'receber' : emPasse ? 'interceptar' : 'bola_solta';
        melhor.j.alvoBola = melhor.p;
      } else if (!emPasse || e === b.equipaUltima) {
        // Ninguém chega antes da bola parar: o mais perto do sítio onde ela pára vai buscá-la.
        const j = s.jogadores.filter((o) => o.equipa === e && !bloqueado(o)).sort((x, y) => tempoChegada(x, fim) - tempoChegada(y, fim))[0];
        if (j) { j.tarefaBola = 'bola_solta'; j.alvoBola = fim; }
      }
    }
  }

  /** Camada 4: acções sem bola, com compromisso (decisão a cada 0,33–0,66 s, desfasada; mínimo 1 s por acção). */
  private accoesSemBola() {
    const s = this.estado, b = s.bola;
    // O portador de referência: quem tem a bola ou, com um passe em curso, o receptor no ponto onde vai receber
    // (os colegas lêem o passe e movem-se enquanto a bola viaja).
    let portador = this.jog(b.dono);
    if (!portador && b.passe) { const r = this.jog(b.passe.para); if (r) portador = { ...r, p: b.passe.destino }; }
    // Apoiantes: os colegas (sem o GR) com a âncora mais perto do portador, até 3 e a menos de 30 m.
    const apoiantes = new Set<string>();
    if (portador && !s.bolaExterna) {
      s.jogadores.filter((o) => o.equipa === portador.equipa && o !== portador && o.chave !== 'GR' && dist(o.ancora, portador.p) < APOIO.so_ate_m)
        .sort((a, b) => dist(a.ancora, portador.p) - dist(b.ancora, portador.p)).slice(0, APOIO.max_apoiantes).forEach((o) => apoiantes.add(o.id));
    }
    const alvosApoio = s.jogadores.filter((o) => o.accao === 'OFERECER_APOIO' && o.alvoAccao).map((o) => ({ id: o.id, p: o.alvoAccao! }));
    for (const j of s.jogadores) {
      if (j.id === b.dono || j.id === portador?.id) continue;
      const fase = s.equipas[j.equipa].fase, d = dist(j.p, j.ancora);
      const livre = s.tick - j.accaoDesde >= TICKS_ACCAO || j.accaoDesde < s.posseDesde;
      const mudar = (a: Jogador2D['accao'], alvo: V2 | null, u = 0) => { if (a !== j.accao) { j.accao = a; j.accaoDesde = s.tick; } j.alvoAccao = alvo; j.pontuacao = u; };
      // Recuperar em sprint na transição ataque→defesa (como na Fase 1).
      if (j.accao === 'RECUPERAR') { if (livre && (d < RECUPERAR_SAI || fase !== 'TRANS_ATQ_DEF')) mudar('MANTER_POSICAO', null); continue; }
      if (fase === 'TRANS_ATQ_DEF' && d > RECUPERAR_ENTRA && livre) { mudar('RECUPERAR', null); continue; }
      if (s.tick < j.proxDecisao) continue;
      // Próxima decisão daqui a 0,33–0,66 s (desfasado por jogador).
      const per = COMPROMISSO_2D.periodo_min_s + (COMPROMISSO_2D.periodo_max_s - COMPROMISSO_2D.periodo_min_s) * aleatorio(`${this.semente}|${j.id}|${s.tick}|per`);
      j.proxDecisao = s.tick + Math.max(1, Math.round(per / TICK_S));
      if (portador && apoiantes.has(j.id)) {
        const outros = alvosApoio.filter((q) => q.id !== j.id).map((q) => q.p);
        const m = melhorApoio(s, j, portador, outros);
        if (!m) { if (livre) mudar('MANTER_POSICAO', null); continue; }
        if (j.accao !== 'OFERECER_APOIO') { if (livre || j.accao === 'MANTER_POSICAO') mudar('OFERECER_APOIO', m.p, m.u); continue; }
        // Mesma acção: o alvo só muda se o novo ponto for ≥ 1,25 × melhor e estiver a mais de 2 m.
        const actual = j.alvoAccao ? pontuarApoio(s, j, portador, j.alvoAccao, outros) : -Infinity;
        const melhorNitido = !Number.isFinite(actual) || m.u >= (actual > 0 ? actual * COMPROMISSO_2D.trocar_factor : actual + 0.25);
        if (melhorNitido && (!j.alvoAccao || dist(m.p, j.alvoAccao) > COMPROMISSO_2D.alvo_m)) { j.alvoAccao = m.p; j.pontuacao = m.u; }
      } else if (j.accao !== 'MANTER_POSICAO' && livre) mudar('MANTER_POSICAO', null);
    }
  }

  /** Camada 6: cada um vai para o seu alvo com a intensidade certa. */
  private mover() {
    const s = this.estado, dt = TICK_S, b = s.bola;
    const colegas = [s.jogadores.filter((o) => o.equipa === 0), s.jogadores.filter((o) => o.equipa === 1)];
    for (const j of s.jogadores) {
      let alvo = j.ancora, vA = { x: (j.ancora.x - j.ancoraAntes.x) / dt, y: (j.ancora.y - j.ancoraAntes.y) / dt };
      let int: Intensidade, olhar = b.p;
      if (b.dono === j.id) {
        // Portador (Fase 2: sem conduzir): segura a bola e vira-se para o jogo (para a frente).
        int = 'andar'; vA = { x: 0, y: 0 }; alvo = { x: j.p.x + (j.ancora.x - j.p.x) * 0.2, y: j.p.y + (j.ancora.y - j.p.y) * 0.2 };
        olhar = paraAbsoluto(j.equipa, { x: paraEquipa(j.equipa, j.p).x + 20, y: CAMPO_2D.largura / 2 });
      } else if (j.tarefaBola && j.alvoBola) {
        alvo = j.alvoBola; vA = { x: 0, y: 0 };
        const d = dist(j.p, alvo);
        int = j.tarefaBola === 'repor' ? (d > 15 ? 'corrida' : 'trote') : j.tarefaBola === 'receber' ? (d < 2 ? 'andar' : d < 6 ? 'trote' : d < 14 ? 'corrida' : 'sprint') : 'sprint';
      } else if (j.accao === 'OFERECER_APOIO' && j.alvoAccao) {
        alvo = j.alvoAccao; vA = { x: 0, y: 0 };
        const d = dist(j.p, alvo);
        int = d < 2.5 ? 'andar' : d < 9 ? 'trote' : 'corrida';
      } else int = intensidadePara(dist(j.p, j.ancora), j.accao === 'RECUPERAR');
      // Quem defende não fica em cima de um adversário: se o alvo calhar a menos de 1,5 m de um, põe-se a 1,5 m dele,
      // do lado da própria baliza (posição de marcação). É um ponto, não um empurrão: não oscila.
      if (j.equipa !== s.posse && !j.tarefaBola && b.dono !== j.id) {
        const sep = FISICA.separacao_adv_m, baliza = { x: j.equipa === 0 ? 0 : CAMPO_2D.comprimento, y: CAMPO_2D.largura / 2 };
        const o = colegas[outra(j.equipa)].find((q) => dist(q.p, alvo) < sep);
        if (o) {
          // Entre o lado da baliza e os dois lados do adversário, o que fica mais longe dos colegas (o da baliza vale +1 m).
          const l = dist(baliza, o.p) || 1, ux = (baliza.x - o.p.x) / l, uy = (baliza.y - o.p.y) / l;
          let melhor = alvo, nota = -Infinity;
          for (const [vx, vy, bonus] of [[ux, uy, 1], [-uy, ux, 0], [uy, -ux, 0]] as [number, number, number][]) {
            const q = { x: o.p.x + vx * sep, y: o.p.y + vy * sep };
            const n = Math.min(...colegas[j.equipa].filter((c) => c !== j).map((c) => dist(c.p, q))) + bonus;
            if (n > nota) { nota = n; melhor = q; }
          }
          alvo = melhor; vA = { x: o.v.x, y: o.v.y };
        }
      }
      j.intensidade = int;
      moverJogador(j, alvo, vA, int, colegas[j.equipa], olhar, dt);
    }
  }

  /** Camada 7: a bola move-se; contacto (recepção, intercepção, mau toque) e saída do campo. */
  private moverBola() {
    const s = this.estado, b = s.bola, dt = TICK_S;
    if (s.reposicao) {
      const r = s.reposicao, d = dist(b.p, r.local);
      if (d > 0.01) { const k = Math.min(1, (10 * dt) / d); b.p = { x: b.p.x + (r.local.x - b.p.x) * k, y: b.p.y + (r.local.y - b.p.y) * k }; }
      const m = this.jog(r.marcador);
      if (m && dist(m.p, r.local) < REPOSICAO.chegada_m && (s.tick - r.desde) * dt >= REPOSICAO.espera_min_s && d < 0.3) {
        s.reposicao = null;
        b.p = { ...r.local };
        this.darBola(m, false);
        this.mudarFase(m.equipa, 'ATQ_CONSTRUCAO'); this.mudarFase(outra(m.equipa), 'DEF_ORGANIZADA');
        this.ev('reposicao', m.equipa, m);
      }
      return;
    }
    const dono = this.jog(b.dono);
    if (dono) {
      const pe = { x: dono.p.x + Math.cos(dono.corpo) * BOLA.pe_m, y: dono.p.y + Math.sin(dono.corpo) * BOLA.pe_m };
      const d = dist(b.p, pe), k = d > 0 ? Math.min(1, (BOLA.pe_desliza_ms * dt) / d) : 1;
      b.p = { x: b.p.x + (pe.x - b.p.x) * k, y: b.p.y + (pe.y - b.p.y) * k };
      return;
    }
    const antes = b.p;
    ({ p: b.p, v: b.v } = avancarBola(b.p, b.v, dt));
    // Contacto: quem está ao alcance do percurso da bola neste tick (e não acabou de lhe tocar).
    let toque: Jogador2D | null = null, dMin = Infinity;
    if (b.z < BOLA.z_pe) for (const j of s.jogadores) {
      if (j.id === b.ultimo && s.tick - b.tickUltimo < TICKS_SEM_RETOQUE) continue;
      const d = distSegmento(j.p, antes, b.p);
      if (d <= BOLA.alcance && d < dMin) { dMin = d; toque = j; }
    }
    if (toque) { this.contacto(toque); return; }
    this.foraDoCampo();
  }

  /** Primeiro toque (secção 7.3): controla, ou a bola afasta-se 1–3 m e fica solta. */
  private contacto(j: Jogador2D) {
    const s = this.estado, b = s.bola;
    const vel = hyp(b.v.x, b.v.y), a = j.attrs as Record<string, number | undefined>;
    const q = (0.6 * (a.ptq ?? 10) + 0.4 * (a.tec ?? 10)) / 20 - (vel - 10) / 40;
    const passe = b.passe, adversario = passe && j.equipa !== b.equipaUltima;
    if (adversario) { s.estat.intercepcoes[j.equipa]++; this.ev('intercepcao', j.equipa, j, this.jog(passe!.de)); }
    if (aleatorio(`${this.semente}|${s.tick}|${j.id}|toque`) > q + RECEPCAO.toque_folga) {
      // Mau toque: a bola sai do pé no sentido em que vinha, desviada, a 3–6 m/s.
      const dir = vel > 0.1 ? Math.atan2(b.v.y, b.v.x) : j.corpo;
      const ang = dir + 0.8 * normal(`${this.semente}|${s.tick}|${j.id}|desvio`);
      const v = RECEPCAO.mau_toque_v[0] + (RECEPCAO.mau_toque_v[1] - RECEPCAO.mau_toque_v[0]) * aleatorio(`${this.semente}|${s.tick}|${j.id}|forca`);
      b.v = { x: Math.cos(ang) * v, y: Math.sin(ang) * v };
      b.ultimo = j.id; b.equipaUltima = j.equipa; b.tickUltimo = s.tick; b.passe = null;
      s.estat.mausToques[j.equipa]++;
      this.ev('mau_toque', j.equipa, j);
      return;
    }
    if (passe && !adversario) { s.estat.certos[j.equipa]++; this.ev('recepcao', j.equipa, j, this.jog(passe.de)); }
    this.darBola(j, !!passe && !adversario);
  }

  /** Bola fora (Fase 2: reposição simplificada, sem teletransporte: quem repõe vai lá). */
  private foraDoCampo() {
    const s = this.estado, b = s.bola, C = CAMPO_2D;
    if (b.p.x >= 0 && b.p.x <= C.comprimento && b.p.y >= 0 && b.p.y <= C.largura) return;
    const repoe = outra(b.equipaUltima);
    let tipo: 'lancamento' | 'baliza' | 'canto', local: V2;
    if (b.p.y < 0 || b.p.y > C.largura) { tipo = 'lancamento'; local = { x: Math.max(1, Math.min(C.comprimento - 1, b.p.x)), y: b.p.y < 0 ? 0 : C.largura }; }
    else {
      const defende: Equipa = b.p.x < 0 ? 0 : 1;
      if (repoe === defende) { tipo = 'baliza'; local = { x: defende === 0 ? REPOSICAO.grande_area_x : C.comprimento - REPOSICAO.grande_area_x, y: C.largura / 2 }; }
      else { tipo = 'canto'; local = { x: b.p.x < 0 ? 0.5 : C.comprimento - 0.5, y: b.p.y < C.largura / 2 ? 0.5 : C.largura - 0.5 }; }
    }
    const cand = s.jogadores.filter((j) => j.equipa === repoe && (tipo === 'baliza' ? j.chave === 'GR' : j.chave !== 'GR'));
    const m = cand.sort((x, y) => dist(x.p, local) - dist(y.p, local))[0];
    b.v = { x: 0, y: 0 }; b.passe = null; b.p = { x: Math.max(-1, Math.min(C.comprimento + 1, b.p.x)), y: Math.max(-1, Math.min(C.largura + 1, b.p.y)) };
    s.reposicao = { tipo, equipa: repoe, local, marcador: m.id, desde: s.tick };
    this.ev('fora', repoe, m);
    if (s.posse !== repoe) { s.estat.sequencias.push(s.passesSeguidos); s.posse = repoe; s.passesSeguidos = 0; s.posseDesde = s.tick; }
  }

  /** Fotografia leve do estado (para a renderização interpolar entre ticks). */
  fotografia() {
    const s = this.estado, b = s.bola;
    return { tick: s.tick, bola: { ...b.p }, dono: b.dono, passe: b.passe ? { de: b.passe.de, para: b.passe.para, destino: { ...b.passe.destino } } : null, posse: s.posse, reposicao: s.reposicao ? s.reposicao.tipo : null,
      jogadores: s.jogadores.map((j) => ({ id: j.id, equipa: j.equipa, numero: j.numero, nome: j.nome, x: j.p.x, y: j.p.y, corpo: j.corpo, ax: j.ancora.x, ay: j.ancora.y, accao: j.accao, tarefa: j.tarefaBola, intensidade: j.intensidade, alvo: j.alvoAccao ? { ...j.alvoAccao } : null })),
      equipas: s.equipas.map((e) => ({ fase: e.fase, faseDesde: e.faseDesde, bloco: { ...e.bloco }, alvo: { ...e.alvo }, mistura: e.mistura, estilo: e.estilo, formacao: e.formacao, nome: e.nome })) };
  }
}
