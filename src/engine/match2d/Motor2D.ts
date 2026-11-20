// Motor 2D táctico (docs/tactics/MOTOR_2D.md).
// Fase 1: formações e bloco. Fase 2: bola com física e passes curtos. Fase 3: decisão completa do portador, todas as
// acções sem bola, fases e transições, pressão, desarmes, faltas, linha defensiva, fora de jogo, bola no ar,
// cabeceamentos, remates e guarda-redes (estes dois numa versão de base, a afinar na Fase 5).
// Camadas: 1 fase, 2 bloco, 3 âncoras, 4 acções sem bola, 5 portador, 6 movimento, 7 bola e resolução.
// Com `porBola` a bola passa a ser um ponto movido por fora (modo da Fase 1: arrastada ou num caminho).
// Determinístico (sementes fixas), sem DOM; um tick = 0,1 s de jogo.
import { TICK_S, CAMPO_2D, FISICA, CANSACO } from '../../config/match2d/fisica.ts';
import { BLOCO, FASES } from '../../config/match2d/bloco.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { TRANSICAO_FORMA_S } from '../../config/match2d/formacoes.ts';
import { BOLA, RECEPCAO, COMPROMISSO_2D, REPOSICAO } from '../../config/match2d/bola.ts';
import { PORTADOR, DUELO, AEREO, GR, REMATE, LINHA, ESTADO_JOGO, MARCAS, TRANSICAO as TRANSICAO_JOGO } from '../../config/match2d/fase3.ts';
import { lugaresApp } from './equipas.ts';
import { alvoBloco, ancora, filtrarBloco, forma, medidasForma, linhaForaDeJogo } from './bloco.ts';
import { planear, cartao, naGrandeArea } from './bolaParada.ts';
import { avaliarJogadas } from './jogadas.ts';
const naPropriaAreaAbs = naGrandeArea;
/** Só os passes contam para a precisão (não os alívios nem os desvios de cabeça). */
const contaPasse = (tipo?: string) => tipo !== 'ALIVIAR' && tipo !== 'CABECA';
import { BOLA_PARADA, PENALTI, CARTOES, CANTOS } from '../../config/match2d/fase5.ts';
import { moverJogador, intensidadePara, limitesFisicos, gastar, reaccaoCansaco, actualizarQuebra } from './fisica.ts';
import { avancarBola3D, preverTrajectoria, pontoIntercepcao, tempoChegada, TICKS_SEM_RETOQUE } from './bola.ts';
import { tempoDecisao, normal } from './passe.ts';
import { avaliarPortador, escolher, executarBola, executarRemate, xgEstimado, pDefensorGanha, forcaDefesa, forcaDrible, distSeg, type Escolha } from './portador.ts';
import { contextoEquipa, candidatas, alvoPressao, alvoCobertura, alvoMarcacao, type ContextoEquipa } from './semBola.ts';
import { aleatorio } from '../decision/rng.ts';
import { paraAbsoluto, paraEquipa, dist, anguloAbsoluto, hyp } from './referencial.ts';
import type { Estilo2D } from '../../config/match2d/estilos.ts';
import type { Equipa, Estado2D, EstadoEquipa, Fase, Jogador2D, JogadorBase2D, V2, Evento2D, Intensidade, Reposicao2D, PlanoBolaParada, Posse2D } from './tipos.ts';

export interface ConfigEquipa2D { nome: string; formacao: string; estilo: Estilo2D; jogadores: JogadorBase2D[] }
export interface Config2D { equipas: [ConfigEquipa2D, ConfigEquipa2D]; posse?: Equipa; bola?: V2; semente?: string }

const C = CAMPO_2D;
const RECUPERAR_SAI = 4;
/** Quem pressiona pelo lado fica a esta distância do portador (não em cima do colega que fecha a baliza). */
const SB_LADO_M = 2.8;
const TICKS_BLOCO = Math.round(BLOCO.periodo_s / TICK_S);
/** Intervalo aos 45 minutos de jogo. */
const TICKS_INTERVALO = Math.round(45 * 60 / TICK_S);
const TICKS_ACCAO = Math.round(COMPROMISSO_2D.acao_min_s / TICK_S);
const outra = (e: Equipa): Equipa => (e === 0 ? 1 : 0);
const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;
/** Dentro da própria grande área (absoluto)? */
const naPropriaArea = (j: Jogador2D, p = j.p) => { const q = paraEquipa(j.equipa, p); return q.x < 16.5 && Math.abs(q.y - C.largura / 2) < 20.15; };
const naAreaAdversaria = (j: Jogador2D, p = j.p) => { const q = paraEquipa(j.equipa, p); return q.x > C.comprimento - 16.5 && Math.abs(q.y - C.largura / 2) < 20.15; };
/** Tempo (s de jogo) até recomeçar cada bola parada: os tempos reais (a bola está fora de jogo ~35 dos 95 minutos);
 *  no ecrã passam em avanço rápido (modelo FM). */
const ESPERA_REPOSICAO: Record<Reposicao2D['tipo'], number> = { lancamento: 10, baliza: 20, canto: 25, livre: 20, saida: 40, penalti: Math.round(PENALTI.espera_s / TICK_S) };

export class Motor2D {
  estado: Estado2D;
  semente: string;
  private papeis: [string[], string[]];
  /** Tick em que o portador recebeu a bola (decide ao fim do tempo de decisão). */
  private recebeu = 0;
  private posseInicial: Equipa = 0;
  /** Registo completo dos eventos e das posses (o `estado.eventos` só guarda os últimos 400). */
  readonly registo: Evento2D[] = [];
  readonly posses: Posse2D[] = [];
  private gatilhosAntes: [Set<string>, Set<string>] = [new Set(), new Set()];
  /** Muda sempre que a bola muda de trajectória sem ser pela física (passe, toque, reposição). */
  private versaoBola = 0;
  private versaoCalc = -1;
  /** Gatilhos de pressão recentes: passe para trás e mau toque (equipa e tick). */
  private passeAtras = { equipa: 0 as Equipa, tick: -99 };
  private mauToque = { equipa: 0 as Equipa, tick: -99 };

  constructor(cfg: Config2D) {
    const posse = cfg.posse ?? 0;
    this.posseInicial = posse;
    this.semente = cfg.semente ?? 'motor2d';
    const eq = (e: Equipa): EstadoEquipa => {
      const c = cfg.equipas[e], b = { linhaDefX: 30, comprimento: 30, largura: 40, centroY: 34 };
      return { nome: c.nome, estilo: c.estilo, formacao: c.formacao, fase: posse === e ? 'ATQ_CONSTRUCAO' : 'DEF_ORGANIZADA', faseDesde: 0, bloco: b, alvo: b, mistura: posse === e ? 1 : 0, subirAte: 0, mentalidade: 0, xRecuperacao: 0 };
    };
    const centro = { x: C.comprimento / 2, y: C.largura / 2 };
    const par = (): [number, number] => [0, 0];
    this.estado = {
      tick: 0, posse, equipas: [eq(0), eq(1)], jogadores: [], conducao: null,
      bola: { p: { ...(cfg.bola ?? centro) }, z: 0, v: { x: 0, y: 0 }, vz: 0, dono: null, ultimo: null, equipaUltima: posse, tickUltimo: -99, passe: null, remate: null },
      bolaExterna: false, reposicao: null, eventos: [],
      estat: { passes: par(), certos: par(), intercepcoes: par(), mausToques: par(), posse: par(), sequencias: [], golos: par(), remates: par(), aBaliza: par(), xg: par(),
        desarmes: par(), faltas: par(), forasDeJogo: par(), cruzamentos: par(), passesLongos: par(), dribles: par(), recuperacoesAltas: par(),
        cantos: par(), distancia: par(), sprints: par(), amarelos: par(), vermelhos: par(), penaltis: par(), penaltisGolo: par(), livresDirectos: par() },
      passesSeguidos: 0, posseDesde: 0,
    };
    for (const e of [0, 1] as Equipa[]) {
      const f = forma(cfg.equipas[e].formacao);
      cfg.equipas[e].jogadores.slice(0, 11).forEach((b, k) => {
        this.estado.jogadores.push({ ...b, equipa: e, lugar: k, chave: f.lugares[k].chave, p: { x: 0, y: 0 }, v: { x: 0, y: 0 }, corpo: anguloAbsoluto(e, 0),
          accao: 'MANTER_POSICAO', accaoDesde: 0, intensidade: 'andar', ancora: { x: 0, y: 0 }, ancoraAntes: { x: 0, y: 0 },
          alvoAccao: null, pontuacao: 0, proxDecisao: (k * 3) % 5, tarefaBola: null, alvoBola: null, ultrapassadoAte: 0, proxDesarme: 0, marcado: null, condicao: b.condicao ?? 1, limCansado: null });
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
    this.atribuirMarcacoes(outra(posse));
  }

  private papeisDe(e: Equipa) { return this.estado.jogadores.filter((j) => j.equipa === e).sort((a, b) => a.lugar - b.lugar).map((j) => j.papel); }
  private jog(id: string | null | undefined) { return id ? this.estado.jogadores.find((j) => j.id === id) ?? null : null; }
  private r(k: string) { return aleatorio(`${this.semente}|${this.estado.tick}|${k}`); }
  private ev(tipo: Evento2D['tipo'], equipa: Equipa, j?: Jogador2D | null, outro?: Jogador2D | null, alvo?: V2, subtipo?: string, previsto?: number) {
    const s = this.estado;
    const x: Evento2D = { tick: s.tick, tipo, equipa, jogador: j?.id, outro: outro?.id, x: s.bola.p.x, y: s.bola.p.y, ...(alvo ? { alvo: { ...alvo } } : {}), ...(subtipo ? { subtipo } : {}), ...(previsto !== undefined ? { previsto } : {}) };
    s.eventos.push(x);
    this.registo.push(x);
    if (s.eventos.length > 400) s.eventos.splice(0, s.eventos.length - 400);
  }

  /** Fase 1: move a bola por fora (arrastada ou num caminho); a velocidade é estimada pelo deslocamento. */
  porBola(p: V2, dt = TICK_S) {
    const s = this.estado, b = s.bola;
    s.bolaExterna = true; b.dono = null; b.passe = null; b.remate = null; s.reposicao = null; s.conducao = null; b.z = 0; b.vz = 0;
    for (const j of s.jogadores) { j.tarefaBola = null; j.alvoBola = null; }
    b.v = { x: (p.x - b.p.x) / dt, y: (p.y - b.p.y) / dt };
    b.p = { x: Math.max(0, Math.min(C.comprimento, p.x)), y: Math.max(0, Math.min(C.largura, p.y)) };
  }

  /** Volta à bola real: a bola fica com o jogador da equipa com a posse mais perto dela. */
  bolaReal() {
    const s = this.estado;
    if (!s.bolaExterna) return;
    s.bolaExterna = false;
    const j = s.jogadores.filter((o) => o.equipa === s.posse).sort((a, b) => dist(a.p, s.bola.p) - dist(b.p, s.bola.p))[0];
    s.bola.v = { x: 0, y: 0 };
    this.darBola(j, false);
  }

  /** Troca a posse (botão do ecrã de teste): com bola real, a bola passa ao jogador da outra equipa mais perto dela. */
  trocarPosse() {
    const s = this.estado, nova = outra(s.posse);
    if (!s.bolaExterna) {
      const j = s.jogadores.filter((o) => o.equipa === nova).sort((a, b) => dist(a.p, s.bola.p) - dist(b.p, s.bola.p))[0];
      s.bola.v = { x: 0, y: 0 }; s.bola.passe = null; s.bola.remate = null; s.reposicao = null;
      this.darBola(j, false);
      return;
    }
    this.ganharPosse(nova);
  }

  /** Fecha a posse em curso e abre outra (para a selecção de lances: secção 2.2). */
  private novaPosse(e: Equipa, recuperacao: boolean) {
    const s = this.estado, p = this.posses[this.posses.length - 1];
    if (p) { p.fim = s.tick; p.passes = s.passesSeguidos; }
    this.posses.push({ equipa: e, inicio: s.tick, fim: s.tick, passes: 0, xInicio: paraEquipa(e, s.bola.p).x, xMax: paraEquipa(e, s.bola.p).x, recuperacao });
  }

  private ganharPosse(e: Equipa) {
    const s = this.estado;
    if (s.posse === e) return;
    this.novaPosse(e, true);
    s.estat.sequencias.push(s.passesSeguidos);
    s.posse = e; s.passesSeguidos = 0; s.posseDesde = s.tick;
    s.equipas[e].xRecuperacao = paraEquipa(e, s.bola.p).x;
    this.mudarFase(e, 'TRANS_DEF_ATQ');
    this.mudarFase(outra(e), 'TRANS_ATQ_DEF');
    this.atribuirMarcacoes(outra(e));
  }

  /** Marcação individual (Catenaccio): no início da fase defensiva, cada defensor fica com o atacante mais perto da sua
   *  zona; um central fica livre (líbero). */
  private atribuirMarcacoes(e: Equipa) {
    const s = this.estado;
    for (const j of s.jogadores) if (j.equipa === e) j.marcado = null;
    if (ESTILOS_2D[s.equipas[e].estilo].marcacao !== 'individual') return;
    // Só a linha defensiva marca ao homem, e só os atacantes mais adiantados; o meio-campo defende à zona (sem buracos
    // no bloco quando um marcador é arrastado para fora).
    const livres = s.jogadores.filter((o) => o.equipa !== e && o.chave !== 'GR' && paraEquipa(e, o.p).x < MARCAS.individual_x);
    const meus = s.jogadores.filter((o) => o.equipa === e && o.chave !== 'GR').sort((a, b) => paraEquipa(e, a.ancora).x - paraEquipa(e, b.ancora).x).slice(0, MARCAS.individual_n);
    const libero = meus.find((o) => o.chave === 'DC') ?? meus.find((o) => o.chave.startsWith('DC'));
    for (const j of meus) {
      if (j === libero || !livres.length) continue;
      livres.sort((a, b) => dist(a.p, j.ancora) - dist(b.p, j.ancora));
      if (dist(livres[0].p, j.ancora) < 25) j.marcado = livres.shift()!.id;
    }
  }

  /** A bola fica aos pés de j (recepção controlada). */
  private darBola(j: Jogador2D, dePasse: boolean) {
    const s = this.estado, b = s.bola;
    const equipaAntes = s.posse;
    this.versaoBola++;
    b.dono = j.id; b.v = { x: 0, y: 0 }; b.z = 0; b.vz = 0; b.ultimo = j.id; b.equipaUltima = j.equipa; b.tickUltimo = s.tick;
    if (b.passe && dePasse && j.equipa === equipaAntes) s.passesSeguidos++;
    b.passe = null; b.remate = null; s.conducao = null;
    this.recebeu = s.tick;
    for (const o of s.jogadores) { o.tarefaBola = null; o.alvoBola = null; }
    if (j.equipa !== equipaAntes && paraEquipa(j.equipa, j.p).x > C.comprimento * 2 / 3) s.estat.recuperacoesAltas[j.equipa]++;
    this.ganharPosse(j.equipa);
  }

  mudarFormacao(e: Equipa, formacao: string, papeis?: string[]) {
    const eq = this.estado.equipas[e], f = forma(formacao);
    eq.formacao = formacao;
    this.estado.jogadores.filter((j) => j.equipa === e).forEach((j) => { j.chave = f.lugares[j.lugar].chave; if (papeis?.[j.lugar]) j.papel = papeis[j.lugar]; });
    this.papeis[e] = this.papeisDe(e);
  }
  mudarEstilo(e: Equipa, estilo: Estilo2D) { this.estado.equipas[e].estilo = estilo; }

  private mudarFase(e: Equipa, f: Fase) { const eq = this.estado.equipas[e]; if (eq.fase !== f) { eq.fase = f; eq.faseDesde = this.estado.tick; } }

  /** Camada 1: fase da equipa (por evento, pela zona da bola e pela posse estabilizada). */
  private actualizarFase(e: Equipa) {
    const s = this.estado, eq = s.equipas[e], P = ESTILOS_2D[eq.estilo];
    if (s.reposicao) { this.mudarFase(e, 'BOLA_PARADA'); return; }
    const t = (s.tick - eq.faseDesde) * TICK_S;
    const b = paraEquipa(e, s.bola.p);
    if (s.posse === e) {
      // Transição defesa→ataque até ao tempo do estilo ou até a posse estabilizar (2 passes seguidos).
      // Se o ataque rápido não avançou 10 m em 2 s, segura e reorganiza (secção 8.2, Contra-ataque).
      const parado = t >= TRANSICAO_JOGO.sem_avanco_s && b.x - eq.xRecuperacao < TRANSICAO_JOGO.avanco_m;
      if (eq.fase === 'TRANS_DEF_ATQ' && t < P.transDefAtqS && s.passesSeguidos < 2 && !parado) return;
      const naArea = b.x > C.comprimento - 16.5 && Math.abs(b.y - C.largura / 2) < 20.15;
      const cruz = !!s.bola.passe && s.bola.passe.tipo === 'CRUZAMENTO';
      const fin = naArea || cruz || (b.x >= FASES.finalizacao_desde && Math.abs(b.y - C.largura / 2) < FASES.finalizacao_corredor);
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
    if (!this.posses.length) this.novaPosse(s.posse, false);
    s.tick++;
    if (s.tick === TICKS_INTERVALO) this.intervalo();
    // Jogadas-padrão (secção 11): a cada 0,5 s.
    if (s.tick % 5 === 0 && !s.reposicao) {
      const noAr = !!s.bola.passe?.aereo && s.bola.passe.tipo === 'PASSE_LONGO';
      for (const e of [0, 1] as Equipa[]) {
        const pa = !!this.passeAtras && this.passeAtras.equipa !== e && s.tick - this.passeAtras.tick < 15;
        const nova = avaliarJogadas(s, e, { passeAtrasAdv: pa, bolaLongaNoAr: noAr }, this.semente, this.gatilhosAntes[e]);
        if (nova) this.ev('jogada', e, null, null, undefined, nova.id);
      }
    }
    // Estado do jogo: a mentalidade de cada equipa pelo resultado e pelo tempo (a cada minuto).
    if (s.tick % Math.round(ESTADO_JOGO.periodo_s / TICK_S) === 0) this.actualizarMentalidade();
    // Camadas 1 e 2: fase, forma (mistura gradual) e bloco.
    for (const e of [0, 1] as Equipa[]) {
      const eq = s.equipas[e];
      this.actualizarFase(e);
      const alvoM = eq.fase === 'BOLA_PARADA' ? (s.posse === e ? 1 : 0) : eq.fase.startsWith('ATQ') || eq.fase === 'TRANS_DEF_ATQ' ? 1 : 0;
      eq.mistura += Math.max(-dt / TRANSICAO_FORMA_S, Math.min(dt / TRANSICAO_FORMA_S, alvoM - eq.mistura));
      if ((s.tick + e) % TICKS_BLOCO === 0) eq.alvo = alvoBloco(s, e, this.papeis[e]);
      eq.bloco = filtrarBloco(eq.bloco, eq.alvo, dt);
    }
    // Futebol Total: reatribuição das posições (as âncoras são lugares a ocupar, não de cada jogador).
    for (const e of [0, 1] as Equipa[]) if (!s.reposicao) this.reatribuir(e);
    // Camada 3: âncoras.
    const med = [0, 1].map((e) => medidasForma(s.equipas[e].formacao, this.papeis[e], s.equipas[e].mistura));
    const fj = [linhaForaDeJogo(s, 0), linhaForaDeJogo(s, 1)];
    const posBP = s.reposicao?.plano?.posicoes;
    for (const j of s.jogadores) { j.ancoraAntes = j.ancora; j.ancora = posBP?.[j.id] ?? paraAbsoluto(j.equipa, ancora(s, j, this.papeis[j.equipa], med[j.equipa], fj[j.equipa])); }
    const portador = this.jog(s.bola.dono);
    if (portador) s.estat.posse[portador.equipa]++;
    const pa = this.posses[this.posses.length - 1];
    if (pa) { const x = paraEquipa(pa.equipa, s.bola.p).x; if (x > pa.xMax) pa.xMax = x; pa.fim = s.tick; pa.passes = s.posse === pa.equipa ? s.passesSeguidos : pa.passes; }
    if (!s.bolaExterna && portador && !s.reposicao) {
      // Camada 5: o portador decide ao fim do tempo de decisão; a conduzir/driblar/proteger, revê a cada 0,5 s.
      const cd = s.conducao;
      const rever = cd ? (s.tick - cd.desde) * dt >= PORTADOR.revisao_s || dist(portador.p, cd.alvo) < 1.2 : (s.tick - this.recebeu) * dt >= tempoDecisao(s, portador);
      if (rever) this.decidirPortador(portador);
      // Duelos: drible em curso e desarmes.
      if (s.bola.dono === portador.id) this.duelos(portador);
    }
    // Camada 7: quem vai à bola (receber, interceptar, bola solta, repor).
    if (!s.bolaExterna) this.tarefasBola();
    // Camada 4: acções sem bola.
    this.accoesSemBola();
    // Camada 6: movimento.
    this.mover();
    // Camada 7: bola e resolução.
    if (!s.bolaExterna) this.moverBola();
  }

  /**
   * Futebol Total (secção 8.2): a equipa reatribui os jogadores às posições (afectação: menor distância total, com
   * penalização para quem sai do seu sector). Quanto maior a liberdade posicional, mais se troca; com Decisões e
   * Posicionamento baixos, a reatribuição atrasa (e ficam buracos). Trocas por pares, a melhor primeiro.
   */
  private proxTroca: [number, number] = [0, 0];
  private reatribuir(e: Equipa) {
    const s = this.estado, eq = s.equipas[e], P = ESTILOS_2D[eq.estilo];
    if (P.liberdade < 0.5 || s.tick < this.proxTroca[e]) return;
    const meus = s.jogadores.filter((j) => j.equipa === e && j.chave !== 'GR');
    const media = meus.reduce((a, j) => a + (at(j, 'dec') + at(j, 'pos')) / 2, 0) / meus.length;
    this.proxTroca[e] = s.tick + Math.round((MARCAS.troca_base_s + (20 - media) / 10) / TICK_S);
    const sector = (pos: string) => (pos === 'GR' ? 0 : /^(DC|DD|DE|ALD|ALE)$/.test(pos) ? 1 : /^(MDC|MC|MO)$/.test(pos) ? 2 : 3);
    const lugarPos = (j: Jogador2D) => lugaresApp(eq.formacao)[j.lugar]?.pos ?? j.pos;
    const pen = (j: Jogador2D, lugarDe: Jogador2D) => Math.abs(sector(j.pos) - sector(lugarPos(lugarDe))) * MARCAS.troca_sector_m * (1 - P.liberdade);
    let melhor: { a: Jogador2D; b: Jogador2D; ganho: number } | null = null;
    for (let i = 0; i < meus.length; i++) for (let k = i + 1; k < meus.length; k++) {
      const a = meus[i], b = meus[k];
      const agora = dist(a.p, a.ancora) + dist(b.p, b.ancora) + pen(a, a) + pen(b, b);
      const trocado = dist(a.p, b.ancora) + dist(b.p, a.ancora) + pen(a, b) + pen(b, a);
      const ganho = agora - trocado;
      if (ganho > MARCAS.troca_ganho_m * (1.2 - P.liberdade) && (!melhor || ganho > melhor.ganho)) melhor = { a, b, ganho };
    }
    if (!melhor) return;
    const { a, b } = melhor;
    [a.lugar, b.lugar] = [b.lugar, a.lugar]; [a.chave, b.chave] = [b.chave, a.chave]; [a.papel, b.papel] = [b.papel, a.papel];
    [a.ancora, b.ancora] = [b.ancora, a.ancora]; [a.ancoraAntes, b.ancoraAntes] = [b.ancoraAntes, a.ancoraAntes];
    this.papeis[e] = this.papeisDe(e);
    this.ev('troca', e, a, b);
  }

  /** Mentalidade (−1 fechar … +1 arriscar) pela diferença no marcador e pelo minuto. */
  private actualizarMentalidade() {
    const s = this.estado, t = Math.min(1, (s.tick * TICK_S) / 5400), E = ESTADO_JOGO;
    for (const e of [0, 1] as Equipa[]) {
      const dif = s.estat.golos[e] - s.estat.golos[outra(e)];
      const m = dif > 0 ? -Math.min(1, dif * (E.ganhar_base + E.ganhar_tempo * t)) : dif < 0 ? Math.min(1, -dif * (E.perder_base + E.perder_tempo * t)) : 0;
      const eq = s.equipas[e];
      if (Math.abs(m - eq.mentalidade) >= 0.25 || (m === 0 && eq.mentalidade !== 0)) this.ev('mentalidade', e, null, null, undefined, m < -0.5 ? 'FECHAR' : m < 0 ? 'SEGURAR' : m > 0.5 ? 'TUDO' : m > 0 ? 'ARRISCAR' : 'EQUILIBRIO');
      eq.mentalidade = m;
    }
  }

  /** Camada 5: avalia as opções, escolhe (softmax entre as 3 melhores) e executa. */
  private decidirPortador(j: Jogador2D) {
    const s = this.estado, b = s.bola, e = j.equipa;
    const op = avaliarPortador(s, j, this.semente);
    const o = escolher(op, `${this.semente}|${s.tick}|${j.id}|escolha`);
    if (!o) { this.recebeu = s.tick - Math.round(tempoDecisao(s, j) / TICK_S) + 5; return; }
    if (o.tipo === 'CONDUZIR' || o.tipo === 'DRIBLAR' || o.tipo === 'PROTEGER') {
      s.conducao = { tipo: o.tipo, alvo: o.destino ?? { ...j.p }, desde: s.tick, defensor: o.defensor?.id ?? null };
      return;
    }
    this.executarEscolha(j, o);
  }

  /** Executa a escolha do portador (remate ou passe de qualquer tipo). */
  private executarEscolha(j: Jogador2D, o: Escolha) {
    const s = this.estado, b = s.bola, e = j.equipa;
    s.conducao = null;
    this.versaoBola++;
    b.dono = null; b.ultimo = j.id; b.equipaUltima = e; b.tickUltimo = s.tick;
    if (o.tipo === 'REMATAR') {
      const r = executarRemate(s, j, this.semente);
      b.v = r.v; b.vz = r.vz; b.z = 0.2; b.passe = null;
      b.remate = { de: j.id, xg: o.xg ?? 0, tick: s.tick };
      s.estat.remates[e]++; s.estat.xg[e] += o.xg ?? 0;
      j.corpo = Math.atan2(b.v.y, b.v.x);
      this.ev('remate', e, j, null, undefined, undefined, o.xg ?? 0);
      return;
    }
    const r = executarBola(s, j, o, this.semente);
    b.v = r.v; b.vz = r.vz; b.z = r.vz > 0 ? 0.1 : 0; b.remate = null;
    b.passe = { de: j.id, para: o.receptor?.id ?? '', destino: o.destino!, tick: s.tick, tipo: o.tipo, aereo: !!o.aereo, foraDeJogo: !!o.foraDeJogo };
    // Um alívio não conta como passe (como nas estatísticas reais).
    const ePasse = o.tipo !== 'ALIVIAR';
    if (ePasse) s.estat.passes[e]++;
    if (ePasse && (o.aereo || dist(j.p, o.destino!) > 30)) s.estat.passesLongos[e]++;
    if (o.tipo === 'CRUZAMENTO') s.estat.cruzamentos[e]++;
    j.corpo = Math.atan2(b.v.y, b.v.x);
    // Passe para trás: gatilho de pressão e a linha adversária sobe (secção 9.1).
    if (paraEquipa(e, o.destino!).x < paraEquipa(e, j.p).x - 5) {
      this.passeAtras = { equipa: e, tick: s.tick };
      s.equipas[outra(e)].subirAte = s.tick + Math.round(LINHA.passe_atras_s / TICK_S);
    }
    this.ev(o.tipo === 'CRUZAMENTO' ? 'cruzamento' : o.tipo === 'ALIVIAR' ? 'alivio' : 'passe', e, j, o.receptor ?? null, o.destino, o.tipo + (o.aereo ? '_AR' : ''), o.sucesso);
  }

  /** Duelos com o portador: o drible em curso e as tentativas de desarme (secção 9.2). */
  private duelos(c: Jogador2D) {
    const s = this.estado, cd = s.conducao;
    // Drible: ao passar pelo defensor escolhido, resolve-se o duelo uma vez.
    if (cd?.tipo === 'DRIBLAR' && cd.defensor) {
      const d = this.jog(cd.defensor);
      if (d && dist(d.p, c.p) < DUELO.desarme_m && s.tick >= d.ultrapassadoAte) {
        cd.defensor = null;
        d.proxDesarme = s.tick + 8;
        if (this.r(`drible|${c.id}`) < pDefensorGanha(forcaDefesa(d, c), forcaDrible(c))) { this.desarmeCerto(d, c); return; }
        d.ultrapassadoAte = s.tick + 8;
        s.estat.dribles[c.equipa]++;
        this.ev('drible', c.equipa, c, d);
      }
    }
    // Desarmes: quem está a menos de 1,5 m e pode (uma tentativa a cada 0,5 s, conforme a Agressividade).
    for (const d of s.jogadores) {
      // O guarda-redes só sai aos pés do portador dentro da sua área.
      const grSai = d.chave === 'GR' && naPropriaArea(d) && naPropriaArea(d, c.p);
      if (d.equipa === c.equipa || (d.chave === 'GR' && !grSai) || s.tick < d.ultrapassadoAte || s.tick < d.proxDesarme || dist(d.p, c.p) > DUELO.desarme_m) continue;
      // Na própria área entra-se já (o perigo não espera): tenta mais e mais vezes.
      const naArea = naPropriaArea(d, c.p);
      d.proxDesarme = s.tick + Math.round((naArea ? DUELO.intervalo_area_s : DUELO.intervalo_s) / TICK_S);
      const tentar = DUELO.tentar_base + DUELO.tentar_agr * (at(d, 'agr') - 10) + (d.accao === 'PRESSIONAR' ? DUELO.tentar_pressao : 0) + (naArea ? DUELO.tentar_area : 0);
      if (this.r(`tentar|${d.id}`) > tentar) continue;
      // O portador defende-se com Drible, Técnica e Força; a proteger e de costas, melhor.
      const deCostas = Math.cos(c.corpo - Math.atan2(d.p.y - c.p.y, d.p.x - c.p.x)) < -0.3;
      const ata = 0.5 * at(c, 'dri') + 0.3 * at(c, 'tec') + 0.2 * at(c, 'for') + (s.conducao?.tipo === 'PROTEGER' ? DUELO.proteger_bonus : 0) + (deCostas ? DUELO.costas_bonus : 0);
      const forcaDef = grSai ? 0.6 * at(d, 'uco') + 0.4 * at(d, 'ref') : forcaDefesa(d, c);
      if (this.r(`desarme|${d.id}`) < pDefensorGanha(forcaDef, ata)) {
        // Mesmo um desarme certo pode ser falta (sobretudo de trás ou de lado, e com Agressividade alta).
        if (this.r(`faltaok|${d.id}`) < DUELO.falta_desarme_certo * (deCostas ? 2 : 1) * (1 + (at(d, 'agr') - 10) / 20) * (naGrandeArea(d.equipa, c.p) ? CARTOES.falta_area : 1) * (d.amarelos ? CARTOES.com_amarelo : 1)) { this.falta(d, c); return; }
        this.desarmeCerto(d, c); return;
      }
      // Falhou: fica ultrapassado; pode ter feito falta.
      const [u0, u1] = DUELO.ultrapassado_s;
      d.ultrapassadoAte = s.tick + Math.round((u0 + (u1 - u0) * this.r(`ultra|${d.id}`)) / TICK_S);
      const pFalta = DUELO.falta_base + DUELO.falta_agr * (at(d, 'agr') - 10) + DUELO.falta_falhou;
      if (this.r(`falta|${d.id}`) < pFalta * (naGrandeArea(d.equipa, c.p) ? CARTOES.falta_area : 1) * (d.amarelos ? CARTOES.com_amarelo : 1)) { this.falta(d, c); return; }
      return;
    }
  }

  private desarmeCerto(d: Jogador2D, c: Jogador2D) {
    const s = this.estado, b = s.bola;
    s.estat.desarmes[d.equipa]++;
    this.ev('desarme', d.equipa, d, c);
    if (this.r(`fica|${d.id}`) < DUELO.fica_com_bola) { this.darBola(d, false); return; }
    // A bola fica solta: sai do pé do portador para o lado, a 3–5 m/s.
    const ang = Math.atan2(c.p.y - d.p.y, c.p.x - d.p.x) + (this.r(`lado|${d.id}`) < 0.5 ? 1 : -1) * (0.6 + 0.8 * this.r(`ang|${d.id}`));
    const v = 3 + 2 * this.r(`v|${d.id}`);
    b.dono = null; b.v = { x: Math.cos(ang) * v, y: Math.sin(ang) * v }; b.z = 0; b.vz = 0; b.ultimo = d.id; b.equipaUltima = d.equipa; b.tickUltimo = s.tick;
    b.passe = null; b.remate = null; s.conducao = null;
    this.versaoBola++;
  }

  /** Falta: livre para a equipa do portador no sítio (as bolas paradas completas e os cartões são da Fase 5). */
  private falta(d: Jogador2D, c: Jogador2D) {
    const s = this.estado;
    s.estat.faltas[d.equipa]++;
    this.ev('falta', d.equipa, d, c);
    const penalti = naGrandeArea(d.equipa, c.p);
    // Cartões (secção 2.2: lances sempre mostrados incluem o vermelho).
    const k = cartao(s, d, c, `${this.semente}|${s.tick}|${d.id}`, penalti);
    if (k) {
      const segundo = k === 'AMARELO' && (d.amarelos ?? 0) >= 1;
      if (k === 'AMARELO') { d.amarelos = (d.amarelos ?? 0) + 1; s.estat.amarelos[d.equipa]++; }
      this.ev('cartao', d.equipa, d, null, undefined, segundo ? 'SEGUNDO_AMARELO' : k);
      if (k === 'VERMELHO' || segundo) this.expulsar(d);
    }
    if (penalti) {
      s.estat.penaltis[c.equipa]++;
      this.ev('penalti', c.equipa, c, d);
      this.iniciarReposicao('penalti', c.equipa, paraAbsoluto(c.equipa, { x: C.comprimento - 11, y: C.largura / 2 }), c);
      return;
    }
    this.iniciarReposicao('livre', c.equipa, { ...c.p }, c);
  }

  /** Expulsão: o jogador sai do campo e a equipa joga com menos um (o lugar dele fica por ocupar). */
  private expulsar(j: Jogador2D) {
    const s = this.estado;
    s.estat.vermelhos[j.equipa]++;
    this.ev('expulsao', j.equipa, j);
    s.jogadores = s.jogadores.filter((o) => o !== j);
    for (const o of s.jogadores) if (o.marcado === j.id) o.marcado = null;
    if (s.bola.dono === j.id) s.bola.dono = null;
  }

  /** Bater a bola parada planeada: cruzamento à zona da variante, canto curto, livre directo ou penálti. */
  private baterBolaParada(m: Jogador2D, plano: PlanoBolaParada) {
    const s = this.estado, b = s.bola, e = m.equipa;
    const receptor = plano.receptor ? this.jog(plano.receptor) : null;
    if (plano.tipo === 'canto' || plano.tipo === 'livre_cruzado') {
      if (!plano.alvo || !receptor) return;
      const curto = plano.variante === 'curto' || plano.variante === 'entrada_area';
      const o: Escolha = { tipo: curto ? 'PASSE_CURTO' : 'CRUZAMENTO', pontuacao: 0, sucesso: 0.7, valor: 0, receptor, destino: { ...receptor.p }, aereo: !curto, altura: BOLA_PARADA.altura_cruzamento };
      this.executarEscolha(m, o);
      return;
    }
    // Remates de bola parada.
    this.versaoBola++;
    b.dono = null; b.ultimo = m.id; b.equipaUltima = e; b.tickUltimo = s.tick; b.passe = null; s.conducao = null;
    const golo = paraAbsoluto(e, { x: C.comprimento, y: C.largura / 2 });
    const q = (y: number) => paraAbsoluto(e, { x: C.comprimento, y: C.largura / 2 + y });
    let alvo: V2, v: number, zAlvo: number;
    if (plano.tipo === 'penalti') {
      const lado = plano.lado ?? 1;
      alvo = plano.resultado === 'golo' ? q(lado * 2.6) : plano.resultado === 'fora' ? q(lado * 4.4) : q(lado * 0.9);
      v = plano.resultado === 'defesa' ? 19 : 24; zAlvo = plano.resultado === 'fora' ? 1.5 : 0.6;
      b.remate = { de: m.id, xg: 0.76, tick: s.tick, tipo: 'PENALTI', forcado: plano.resultado };
      s.estat.xg[e] += 0.76;
    } else {
      // Livre directo: ao canto mais longe do GR, por cima/ao lado da barreira; a barreira pode bloquear.
      const gr = s.jogadores.find((o) => o.equipa !== e && o.chave === 'GR');
      const grY = gr ? paraEquipa(e, gr.p).y - C.largura / 2 : 0;
      const attr = (at(m, 'bpa') + at(m, 'rld')) / 2;
      const sigma = BOLA_PARADA.livre_erro_base + BOLA_PARADA.livre_erro_ponto * Math.max(0, 20 - attr);
      const base = q((grY > 0 ? -1 : 1) * 2.8);
      const ang = Math.atan2(base.y - b.p.y, base.x - b.p.x) + sigma * normal(`${this.semente}|${s.tick}|livre`);
      const dd = dist(b.p, base);
      alvo = { x: b.p.x + Math.cos(ang) * dd, y: b.p.y + Math.sin(ang) * dd };
      v = BOLA_PARADA.livre_v; zAlvo = BOLA_PARADA.livre_z_baliza + sigma * 8 * normal(`${this.semente}|${s.tick}|livre|z`);
      const bloqueia = this.r('barreira') < BOLA_PARADA.barreira_bloqueia;
      b.remate = { de: m.id, xg: 0.06, tick: s.tick, tipo: 'LIVRE', ignorar: bloqueia ? [] : plano.barreira };
      if (bloqueia && plano.barreira?.length) { const w = this.jog(plano.barreira[0]); if (w) { alvo = { ...w.p }; zAlvo = 0.8; } }
      s.estat.livresDirectos[e]++; s.estat.xg[e] += 0.06;
    }
    void golo;
    // Velocidade e subida para chegar ao alvo à altura pretendida (o ar trava pouco a esta distância).
    const d = dist(b.p, alvo), t = d / v;
    b.v = { x: ((alvo.x - b.p.x) / d) * v, y: ((alvo.y - b.p.y) / d) * v };
    b.vz = (zAlvo + 0.5 * BOLA.g * t * t) / t; b.z = 0.1;
    s.estat.remates[e]++;
    m.corpo = Math.atan2(b.v.y, b.v.x);
    this.ev('remate', e, m, null, undefined, b.remate.tipo, b.remate.xg);
  }

  /** Intervalo (45 min): os jogadores recuperam um pouco, voltam às posições e a outra equipa dá a saída. */
  private intervalo() {
    const s = this.estado, b = s.bola, sai = outra(this.posseInicial);
    for (const j of s.jogadores) { j.condicao = Math.min(1, j.condicao + CANSACO.intervalo); actualizarQuebra(j); j.v = { x: 0, y: 0 }; j.intencao = { x: 0, y: 0 }; j.tarefaBola = null; j.alvoBola = null; }
    b.p = { x: C.comprimento / 2, y: C.largura / 2 };
    const pl = s.jogadores.filter((j) => j.equipa === sai && j.chave !== 'GR').sort((x, y) => paraEquipa(sai, y.ancora).x - paraEquipa(sai, x.ancora).x)[0];
    this.ev('intervalo', sai, null);
    this.iniciarReposicao('saida', sai, { ...b.p }, pl);
    for (const j of s.jogadores) {
      // Cada um no seu meio-campo, perto da âncora.
      const q = paraEquipa(j.equipa, j.ancora);
      j.p = paraAbsoluto(j.equipa, { x: Math.min(q.x, C.comprimento / 2 - 1), y: q.y });
    }
    pl.p = { x: C.comprimento / 2 + (sai === 0 ? -0.5 : 0.5), y: C.largura / 2 };
  }

  private iniciarReposicao(tipo: Reposicao2D['tipo'], equipa: Equipa, local: V2, marcador: Jogador2D) {
    const s = this.estado, b = s.bola;
    b.dono = null; b.v = { x: 0, y: 0 }; b.z = 0; b.vz = 0; b.passe = null; b.remate = null; s.conducao = null;
    s.reposicao = { tipo, equipa, local, marcador: marcador.id, desde: s.tick };
    // Fase 5: cantos, livres perigosos e penáltis têm um plano (quem marca, variante, posições de todos).
    const plano = planear(s, s.reposicao, this.semente);
    if (plano) { s.reposicao.plano = plano; s.reposicao.marcador = plano.executor; }
    this.versaoBola++;
    if (s.posse !== equipa) { this.novaPosse(equipa, false); s.estat.sequencias.push(s.passesSeguidos); s.posse = equipa; s.passesSeguidos = 0; s.posseDesde = s.tick; this.atribuirMarcacoes(outra(equipa)); }
  }

  /** Camada 7: para cada equipa, quem chega primeiro à bola vai lá; os outros seguem a sua acção. */
  private tarefasBola() {
    const s = this.estado, b = s.bola;
    if (!b.dono && !s.reposicao && s.tick % 2 === 1 && this.versaoCalc === this.versaoBola) return;
    this.versaoCalc = this.versaoBola;
    for (const j of s.jogadores) if (j.tarefaBola !== 'repor') { j.tarefaBola = null; j.alvoBola = null; }
    if (s.reposicao) { const m = this.jog(s.reposicao.marcador); if (m) { m.tarefaBola = 'repor'; m.alvoBola = s.reposicao.local; } return; }
    for (const j of s.jogadores) if (j.tarefaBola === 'repor') { j.tarefaBola = null; j.alvoBola = null; }
    if (b.dono) return;
    let traj = preverTrajectoria(b.p, b.v, b.z, b.vz);
    if (!traj.length) traj = [{ t: TICK_S, p: b.p, z: b.z, s: 0 }];
    const fim = traj[traj.length - 1].p;
    // Bola pelo ar a subir: quem a recebe só a pode jogar depois do ponto mais alto (na descida ou depois de cair).
    let apice = 0;
    if (b.vz > 0) { apice = traj.findIndex((q, k) => k > 0 && q.z < traj[k - 1].z); if (apice < 0) apice = 0; }
    const trajDescida = apice > 0 ? traj.slice(apice) : traj;
    const bloqueado = (j: Jogador2D) => (j.id === b.ultimo && s.tick - b.tickUltimo < TICKS_SEM_RETOQUE) || s.tick < j.ultrapassadoAte;
    const emPasse = !!b.passe, emRemate = !!b.remate;
    for (const e of [0, 1] as Equipa[]) {
      // No remate, quem rematou e os colegas não vão à bola (só às sobras, quando ela já vem devagar).
      if (emRemate && e === b.equipaUltima && hyp(b.v.x, b.v.y) > 8) continue;
      let melhor: { j: Jogador2D; t: number; p: V2 } | null = null;
      for (const j of s.jogadores) {
        if (j.equipa !== e || bloqueado(j)) continue;
        const gr = j.chave === 'GR' && naPropriaArea(j);
        // Quem recebe um passe da sua equipa vai onde a bola já vem baixa (pé ou peito); o adversário disputa de cabeça.
        const zMax = emPasse && e === b.equipaUltima ? BOLA.z_pe : BOLA.z_cabeca;
        const q = gr ? pontoIntercepcao(j, traj, 0, GR.z_max, GR.alcance_base + GR.alcance_agi * at(j, 'agi')) : pontoIntercepcao(j, zMax === BOLA.z_pe ? trajDescida : traj, 0, zMax);
        if (q && (!melhor || q.t < melhor.t)) melhor = { j, t: q.t, p: q.p };
      }
      if (melhor) {
        melhor.j.tarefaBola = emPasse && e === b.equipaUltima ? 'receber' : emPasse || emRemate ? 'interceptar' : 'bola_solta';
        melhor.j.alvoBola = melhor.p;
      } else if (!emRemate && (!emPasse || e === b.equipaUltima)) {
        const j = s.jogadores.filter((o) => o.equipa === e && !bloqueado(o) && o.chave !== 'GR').sort((x, y) => tempoChegada(x, fim) - tempoChegada(y, fim))[0];
        if (j) { j.tarefaBola = 'bola_solta'; j.alvoBola = fim; }
      }
    }
  }

  /** Camada 4: acções sem bola, com compromisso (decisão a cada 0,33–0,66 s, desfasada; mínimo 1 s por acção). */
  private accoesSemBola() {
    const s = this.estado;
    if (s.bolaExterna) { this.accoesFase1(); return; }
    const cx: ContextoEquipa[] = ([0, 1] as Equipa[]).map((e) => contextoEquipa(s, e, {
      passeAtras: this.passeAtras.equipa !== e && s.tick - this.passeAtras.tick < 20,
      mauToque: this.mauToque.equipa !== e && s.tick - this.mauToque.tick < 15,
    }));
    for (const j of s.jogadores) {
      if (j.id === s.bola.dono) continue;
      if (s.reposicao) { if (j.accao !== 'MANTER_POSICAO') { j.accao = 'MANTER_POSICAO'; j.accaoDesde = s.tick; j.alvoAccao = null; } continue; }
      const livre = s.tick - j.accaoDesde >= TICKS_ACCAO || j.accaoDesde < s.posseDesde;
      // Fim da recuperação (chegou à zona).
      if (j.accao === 'RECUPERAR' && dist(j.p, j.ancora) < RECUPERAR_SAI && livre) { j.accao = 'MANTER_POSICAO'; j.accaoDesde = s.tick; j.alvoAccao = null; }
      if (s.tick < j.proxDecisao) continue;
      const per = COMPROMISSO_2D.periodo_min_s + (COMPROMISSO_2D.periodo_max_s - COMPROMISSO_2D.periodo_min_s) * aleatorio(`${this.semente}|${j.id}|${s.tick}|per`);
      j.proxDecisao = s.tick + Math.max(1, Math.round(per / TICK_S));
      const outrosApoio = s.jogadores.filter((o) => o !== j && o.equipa === j.equipa && o.accao === 'OFERECER_APOIO' && o.alvoAccao).map((o) => o.alvoAccao!);
      const cands = candidatas(s, j, cx[j.equipa], outrosApoio);
      if (!cands.length) continue;
      const melhor = cands.reduce((a, c) => (c.u > a.u ? c : a));
      const actual = cands.find((c) => c.a === j.accao);
      const trocar = !actual || (livre && melhor.u >= actual.u * COMPROMISSO_2D.trocar_factor);
      if (trocar && melhor.a !== j.accao) {
        // A contagem da equipa actualiza-se logo (dois a decidir no mesmo tick não ultrapassam os limites).
        const ct = cx[j.equipa].contagem;
        ct[j.accao] = (ct[j.accao] ?? 1) - 1; ct[melhor.a] = (ct[melhor.a] ?? 0) + 1;
        j.accao = melhor.a; j.accaoDesde = s.tick; j.alvoAccao = melhor.alvo; j.pontuacao = melhor.u; j.marcado = melhor.marcado ?? j.marcado;
        continue;
      }
      // Mesma acção: o alvo só muda se mudar mais de 2 m.
      if (actual && actual.alvo && (!j.alvoAccao || dist(actual.alvo, j.alvoAccao) > COMPROMISSO_2D.alvo_m)) { j.alvoAccao = actual.alvo; j.pontuacao = actual.u; }
      if (actual?.marcado) j.marcado = actual.marcado;
    }
  }

  /** Modo da Fase 1 (bola externa): manter a posição e recuperar na transição. */
  private accoesFase1() {
    const s = this.estado;
    for (const j of s.jogadores) {
      const fase = s.equipas[j.equipa].fase, d = dist(j.p, j.ancora);
      const livre = s.tick - j.accaoDesde >= 8;
      const nova = j.accao === 'RECUPERAR' ? (d < RECUPERAR_SAI || fase !== 'TRANS_ATQ_DEF' ? 'MANTER_POSICAO' : 'RECUPERAR') : fase === 'TRANS_ATQ_DEF' && d > 10 ? 'RECUPERAR' : 'MANTER_POSICAO';
      if (nova !== j.accao && livre) { j.accao = nova; j.accaoDesde = s.tick; j.alvoAccao = null; }
    }
  }

  /** Camada 6: cada um vai para o seu alvo com a intensidade certa. */
  private mover() {
    const s = this.estado, dt = TICK_S, b = s.bola;
    const colegas = [s.jogadores.filter((o) => o.equipa === 0), s.jogadores.filter((o) => o.equipa === 1)];
    const portador = this.jog(b.dono);
    for (const j of s.jogadores) {
      let alvo = j.ancora, vA = { x: (j.ancora.x - j.ancoraAntes.x) / dt, y: (j.ancora.y - j.ancoraAntes.y) / dt };
      let int: Intensidade, olhar = b.p, fraccao = 1;
      const d0 = () => dist(j.p, alvo);
      if (b.dono === j.id) {
        const cd = s.conducao;
        vA = { x: 0, y: 0 };
        if (cd?.tipo === 'CONDUZIR' || cd?.tipo === 'DRIBLAR') {
          alvo = cd.alvo; int = 'sprint'; fraccao = cd.tipo === 'CONDUZIR' ? PORTADOR.conduzir_vel : 0.85; olhar = cd.alvo;
        } else if (cd?.tipo === 'PROTEGER') {
          // Protege: fica, de costas para o adversário mais perto.
          const o = s.jogadores.filter((q) => q.equipa !== j.equipa).sort((a1, a2) => dist(a1.p, j.p) - dist(a2.p, j.p))[0];
          alvo = j.p; int = 'andar'; olhar = { x: j.p.x - (o.p.x - j.p.x), y: j.p.y - (o.p.y - j.p.y) };
        } else {
          int = 'andar'; alvo = { x: j.p.x + (j.ancora.x - j.p.x) * 0.2, y: j.p.y + (j.ancora.y - j.p.y) * 0.2 };
          olhar = paraAbsoluto(j.equipa, { x: paraEquipa(j.equipa, j.p).x + 20, y: C.largura / 2 });
        }
      } else if (s.tick < j.ultrapassadoAte) {
        // Ultrapassado: perde o passo (trava e só depois retoma).
        alvo = j.p; vA = { x: 0, y: 0 }; int = 'andar'; fraccao = 0.4;
      } else if (j.tarefaBola && j.alvoBola) {
        alvo = j.alvoBola; vA = { x: 0, y: 0 };
        const d = d0();
        int = j.tarefaBola === 'repor' ? (d > 15 ? 'corrida' : 'trote') : j.tarefaBola === 'receber' ? (d < 0.4 ? 'andar' : d < 6 ? 'corrida' : d < 14 ? 'corrida' : 'sprint') : d > 20 ? 'corrida' : 'sprint';
      } else {
        const a = j.accao;
        // Alvos que seguem a jogada a cada tick: pressão, cobertura, marcação.
        if (a === 'PRESSIONAR' && portador && portador.equipa !== j.equipa) {
          // O primeiro fecha o lado da baliza; o segundo e o terceiro fecham pelos lados (a ±90°), não no mesmo ponto.
          const press = s.jogadores.filter((o) => o.equipa === j.equipa && o.accao === 'PRESSIONAR').sort((x, y) => dist(x.p, portador.p) - dist(y.p, portador.p));
          const k = press.indexOf(j), base = alvoPressao(s, j, portador, portador.p, null);
          if (k <= 0) alvo = base;
          else {
            const ang = Math.atan2(base.y - portador.p.y, base.x - portador.p.x) + (k === 1 ? 1 : -1) * (Math.PI / 2);
            alvo = { x: portador.p.x + Math.cos(ang) * SB_LADO_M, y: portador.p.y + Math.sin(ang) * SB_LADO_M };
          }
          vA = { x: portador.v.x, y: portador.v.y };
        }
        else if (a === 'COBRIR') { const pr = s.jogadores.find((o) => o.equipa === j.equipa && o.accao === 'PRESSIONAR'); alvo = pr ? alvoCobertura(j, pr.p) : j.alvoAccao ?? j.ancora; vA = { x: 0, y: 0 }; }
        else if (a === 'MARCAR' && j.marcado) { const o = this.jog(j.marcado); alvo = o ? alvoMarcacao(j, o, b.p) : j.ancora; vA = o ? { x: o.v.x, y: o.v.y } : vA; }
        else if (a !== 'MANTER_POSICAO' && a !== 'RECUPERAR' && j.alvoAccao) { alvo = j.alvoAccao; vA = { x: 0, y: 0 }; }
        const d = d0();
        const primeiroPress = a === 'PRESSIONAR' && portador ? s.jogadores.filter((o) => o.equipa === j.equipa && o.accao === 'PRESSIONAR').every((o) => dist(o.p, portador.p) >= dist(j.p, portador.p)) : false;
        // Recuperar em sprint só quem ficou para lá da bola (apanhado fora de posição) e longe da âncora.
        const foraDePosicao = paraEquipa(j.equipa, j.p).x > paraEquipa(j.equipa, b.p).x;
        const poupa = j.condicao < CANSACO.poupar;
        const sprint = (a === 'RECUPERAR' && d > 15 && (foraDePosicao || s.equipas[j.equipa].fase === 'TRANS_ATQ_DEF')) || (!poupa && (a === 'SOBREPOSICAO' || (primeiroPress && d > 5) || (a === 'ATACAR_PROFUNDIDADE' && !!b.passe && b.passe.para === j.id)));
        int = sprint ? 'sprint' : a === 'MANTER_POSICAO' || a === 'EQUILIBRIO_DEFENSIVO' || a === 'DAR_LARGURA' ? intensidadePara(d, false)
          : d < 2.5 ? 'andar' : d < 9 ? 'trote' : 'corrida';
        // Quem defende em zona não fica em cima de um adversário (Fase 2).
        if (j.equipa !== s.posse && (a === 'MANTER_POSICAO' || a === 'FECHAR_LINHA_PASSE' || a === 'COBRIR' || a === 'EQUILIBRIO_DEFENSIVO')) {
          const sep = FISICA.separacao_adv_m, baliza = { x: j.equipa === 0 ? 0 : C.comprimento, y: C.largura / 2 };
          const o = colegas[outra(j.equipa)].find((q) => dist(q.p, alvo) < sep);
          if (o) {
            const l = dist(baliza, o.p) || 1, ux = (baliza.x - o.p.x) / l, uy = (baliza.y - o.p.y) / l;
            let melhor = alvo, nota = -Infinity;
            for (const [vx, vy, bonus] of [[ux, uy, 1], [-uy, ux, 0], [uy, -ux, 0]] as [number, number, number][]) {
              const q = { x: o.p.x + vx * sep, y: o.p.y + vy * sep };
              const n = Math.min(...colegas[j.equipa].filter((c2) => c2 !== j).map((c2) => dist(c2.p, q))) + bonus;
              if (n > nota) { nota = n; melhor = q; }
            }
            alvo = melhor; vA = { x: o.v.x, y: o.v.y };
          }
        }
      }
      // Sprint conta quando dura pelo menos 1 s (não cada oscilação entre correr e sprintar).

      j.intensidade = int;
      const antesP = j.p;
      const parado = !j.tarefaBola && b.dono !== j.id && b.passe?.para !== j.id && dist(j.p, b.p) > 8 && (j.accao === 'MANTER_POSICAO' || j.accao === 'EQUILIBRIO_DEFENSIVO' || j.accao === 'DAR_LARGURA');
      moverJogador(j, alvo, vA, int, colegas[j.equipa], olhar, dt, fraccao, parado ? FISICA.zona_morta_posicao_m : FISICA.zona_morta_m);
      const passo = hyp(j.p.x - antesP.x, j.p.y - antesP.y);
      s.estat.distancia[j.equipa] += passo;
      gastar(j, passo, dt);
      // Sprint (definição habitual): acima de 7 m/s durante pelo menos 1 s.
      if (hyp(j.v.x, j.v.y) > 7) { j.sprintTicks = (j.sprintTicks ?? 0) + 1; if (j.sprintTicks === 10) s.estat.sprints[j.equipa]++; } else j.sprintTicks = 0;
    }
  }

  /** Camada 7: a bola move-se (3D); contacto (recepção, intercepção, cabeceamento, defesa, bloqueio) e saídas. */
  private moverBola() {
    const s = this.estado, b = s.bola, dt = TICK_S;
    if (s.reposicao) {
      const r = s.reposicao, d = dist(b.p, r.local);
      if (d > 0.01) { const k = Math.min(1, (12 * dt) / d); b.p = { x: b.p.x + (r.local.x - b.p.x) * k, y: b.p.y + (r.local.y - b.p.y) * k }; }
      b.z = 0;
      const m = this.jog(r.marcador);
      // Numa bola parada planeada espera-se que todos cheguem às posições (até um máximo).
      const prontos = !r.plano || (s.tick - r.desde) * dt >= BOLA_PARADA.espera_posicoes_s
        || s.jogadores.every((j) => j.id === r.marcador || !r.plano!.posicoes[j.id] || dist(j.p, r.plano!.posicoes[j.id]) < BOLA_PARADA.posicao_ok_m);
      if (m && dist(m.p, r.local) < REPOSICAO.chegada_m && (s.tick - r.desde) * dt >= ESPERA_REPOSICAO[r.tipo] && d < 0.3 && prontos) {
        s.reposicao = null;
        b.p = { ...r.local };
        this.darBola(m, false);
        this.mudarFase(m.equipa, 'ATQ_CONSTRUCAO'); this.mudarFase(outra(m.equipa), 'DEF_ORGANIZADA');
        this.ev('reposicao', m.equipa, m);
        if (r.plano) this.baterBolaParada(m, r.plano);
      }
      return;
    }
    const dono = this.jog(b.dono);
    if (dono) {
      // Aos pés; a conduzir, a bola afasta-se 0,6–1,8 m e volta (toques visíveis); a proteger, do lado de lá.
      const cd = s.conducao;
      let off = BOLA.pe_m;
      if (cd && cd.tipo !== 'PROTEGER') { const per = PORTADOR.toque_periodo_s / TICK_S, fase = ((s.tick - cd.desde) % per) / per; off = PORTADOR.toque_min + (PORTADOR.toque_max - PORTADOR.toque_min) * (fase < 0.5 ? fase * 2 : 2 - fase * 2); }
      const pe = { x: dono.p.x + Math.cos(dono.corpo) * off, y: dono.p.y + Math.sin(dono.corpo) * off };
      const d = dist(b.p, pe), k = d > 0 ? Math.min(1, (Math.max(BOLA.pe_desliza_ms, hyp(dono.v.x, dono.v.y) + 3) * dt) / d) : 1;
      b.p = { x: b.p.x + (pe.x - b.p.x) * k, y: b.p.y + (pe.y - b.p.y) * k }; b.z = 0;
      return;
    }
    const antes = b.p, zAntes = b.z;
    ({ p: b.p, v: b.v, z: b.z, vz: b.vz } = avancarBola3D({ p: b.p, v: b.v, z: b.z, vz: b.vz }, dt));
    const z = Math.min(zAntes, b.z), vel = hyp(b.v.x, b.v.y);
    // Candidatos ao contacto: ao alcance do percurso neste tick, à altura do pé, da cabeça ou das mãos do GR na área.
    const cands: { j: Jogador2D; d: number; tipo: 'pe' | 'cabeca' | 'maos' }[] = [];
    for (const j of s.jogadores) {
      if ((j.id === b.ultimo && s.tick - b.tickUltimo < TICKS_SEM_RETOQUE) || s.tick < j.ultrapassadoAte) continue;
      if (b.remate && j.equipa === b.equipaUltima && vel > 8) continue;
      if (b.remate?.ignorar?.includes(j.id)) continue;
      if (b.remate?.forcado && b.remate.forcado !== 'defesa' && j.chave === 'GR') continue;
      const d = distSeg(j.p, antes, b.p);
      if (j.chave === 'GR' && naPropriaArea(j)) {
        // O mergulho só se estende depois de reagir (Reflexos) e leva ~0,3 s a chegar ao alcance máximo; antes, só o corpo.
        const t = (s.tick - b.tickUltimo) * TICK_S, reac = GR.reaccao_base - GR.reaccao_ref * at(j, 'ref') + reaccaoCansaco(j);
        const max = GR.alcance_base + GR.alcance_agi * at(j, 'agi');
        const alcance = b.remate ? GR.corpo_m + (max - GR.corpo_m) * Math.max(0, Math.min(1, (t - reac) / GR.mergulho_s)) : max;
        if (d <= alcance && z <= GR.z_max) {
          // Num remate, defender é mais difícil longe do corpo e com a bola rápida (cerca de 70% dos remates enquadrados).
          if (b.remate && b.remate.forcado !== 'defesa') {
            const p = (GR.defesa_base - (0.75 * d) / max - (vel - 20) / 35 + (at(j, 'ref') - 10) / 40);
            if (this.r(`gr|${j.id}`) > Math.max(0.05, Math.min(0.97, p))) continue;
          }
          cands.push({ j, d, tipo: 'maos' });
        }
        continue;
      }
      // Um adversário de quem passou/rematou: na linha (corpo) corta sempre; com a perna, só depois de reagir e com uma
      // probabilidade que desce com a distância à linha e com a velocidade da bola (decisão 190).
      // Quem está colado ao rematador (a menos de 2,5 m) lê o remate: bloqueia com a perna sem precisar de reagir.
      const leRemate = b.remate && j.equipa !== b.equipaUltima && this.jog(b.remate.de) && dist(j.p, this.jog(b.remate.de)!.p) < DUELO.bloqueio_perto_m;
      if (leRemate && z <= BOLA.z_pe && d <= BOLA.alcance) { cands.push({ j, d, tipo: 'pe' }); continue; }
      if (z <= BOLA.z_pe && d <= BOLA.alcance && (b.passe || b.remate) && j.equipa !== b.equipaUltima && d > RECEPCAO.corpo_m) {
        const reac = RECEPCAO.reaccao_base - RECEPCAO.reaccao_ant * at(j, 'ant') + reaccaoCansaco(j);
        if ((s.tick - b.tickUltimo) * TICK_S < reac) continue;
        const p = (1 - (d - RECEPCAO.corpo_m) / (BOLA.alcance - RECEPCAO.corpo_m)) * Math.max(0.3, Math.min(1, 1.2 - vel / 25));
        if (this.r(`perna|${j.id}`) > p) continue;
      }
      if (z <= BOLA.z_pe && d <= BOLA.alcance) cands.push({ j, d, tipo: 'pe' });
      else if (z > BOLA.z_pe && z <= BOLA.z_cabeca && d <= AEREO.alcance) cands.push({ j, d, tipo: 'cabeca' });
    }
    if (cands.length) {
      // O GR com as mãos tem prioridade na sua área; no ar, disputa de cabeça entre as duas equipas.
      const gr = cands.find((c) => c.tipo === 'maos');
      if (gr) { this.defesaGR(gr.j, vel); return; }
      // Cabeceia-se quando há disputa (as duas equipas), quando um defensor afasta ou quando um atacante está na área
      // adversária; sem oposição, o receptor deixa a bola descer e domina-a com o pé ou o peito.
      const cab = cands.filter((c) => c.tipo === 'cabeca' && (b.vz <= 0 || c.j.equipa !== b.equipaUltima)).filter((c) => {
        const disputa = cands.some((o) => o.j.equipa !== c.j.equipa);
        return disputa || c.j.equipa !== b.equipaUltima || naAreaAdversaria(c.j);
      });
      if (cab.length && !cands.some((c) => c.tipo === 'pe')) {
        const forca = (j: Jogador2D) => 0.5 * at(j, 'cab') + 0.3 * at(j, 'imp') + 0.2 * at(j, 'for') + AEREO.ruido_duelo * normal(`${this.semente}|${s.tick}|${j.id}|ar`);
        const w = cab.reduce((a, c) => (forca(c.j) > forca(a.j) ? c : a));
        this.cabeceamento(w.j);
        return;
      }
      const pe = cands.filter((c) => c.tipo === 'pe').sort((a, c) => a.d - c.d)[0];
      if (pe) { this.contacto(pe.j, vel); return; }
    }
    this.foraDoCampo();
  }

  /** O guarda-redes chega à bola: agarra ou desvia (secção 9.3; afinação na Fase 5). */
  private defesaGR(g: Jogador2D, vel: number) {
    const s = this.estado, b = s.bola, remate = b.remate;
    const q = (at(g, 'ref') + at(g, 'peg')) / 40 - (vel - 20) / 40 + (b.passe?.aereo ? (at(g, 'jae') - 10) / 40 : 0);
    if (remate) {
      // Conta como remate à baliza se a bola ia entrar (entre os postes e abaixo da barra).
      const gx = g.equipa === 0 ? 0 : C.comprimento, t = (gx - b.p.x) / (b.v.x || 1e-6);
      const yG = b.p.y + b.v.y * t, zG = b.z + b.vz * t - 4.9 * t * t;
      if (t > 0 && Math.abs(yG - C.largura / 2) < REMATE.meia_baliza && zG < REMATE.barra) s.estat.aBaliza[b.equipaUltima]++;
      this.ev('defesa', g.equipa, g, this.jog(remate.de));
    }
    if (this.r(`agarra|${g.id}`) < q + GR.agarrar_folga) { this.darBola(g, false); return; }
    // Desvia: muitas vezes para trás da linha de fundo (canto); senão para o lado, para longe da baliza.
    const linhaFundo = this.r(`canto|${g.id}`) < GR.desvio_canto;
    const fora = linhaFundo ? Math.atan2(b.p.y < C.largura / 2 ? -1 : 1, g.equipa === 0 ? -1.6 : 1.6) : Math.atan2(b.v.y, b.v.x) + (this.r(`desvio|${g.id}`) < 0.5 ? 1 : -1) * (1.1 + 0.6 * this.r(`desv2|${g.id}`));
    const v = Math.max(4, vel * 0.4);
    b.v = { x: Math.cos(fora) * v, y: Math.sin(fora) * v }; b.vz = 1.5; b.z = Math.max(b.z, 0.3);
    b.ultimo = g.id; b.equipaUltima = g.equipa; b.tickUltimo = s.tick; b.passe = null; b.remate = null;
    this.versaoBola++;
  }

  /** A bola sai pela linha de fundo ao lado da baliza de quem defende (dá canto): desvio de j. */
  private paraCanto(j: Jogador2D, v: number) {
    const s = this.estado, b = s.bola;
    const gx = j.equipa === 0 ? -1 : C.comprimento + 1, lado = b.p.y < C.largura / 2 ? -1 : 1;
    const alvo = { x: gx, y: C.largura / 2 + lado * (REMATE.meia_baliza + 3 + 12 * this.r(`cantoy|${j.id}`)) };
    const a = Math.atan2(alvo.y - b.p.y, alvo.x - b.p.x);
    b.v = { x: Math.cos(a) * v, y: Math.sin(a) * v }; b.vz = 1.2; b.z = Math.max(b.z, 0.3);
    b.ultimo = j.id; b.equipaUltima = j.equipa; b.tickUltimo = s.tick; b.remate = null; b.passe = null;
    this.versaoBola++;
  }

  /** Cabeceamento: na área adversária, remate; um defensor afasta; noutro sítio, amortece para um colega. */
  private cabeceamento(j: Jogador2D) {
    const s = this.estado, b = s.bola, e = j.equipa;
    // Um passe pelo ar que um colega ganha de cabeça chegou ao destino (passe certo).
    if (b.passe && e === b.equipaUltima && contaPasse(b.passe.tipo)) s.estat.certos[e]++;
    this.ev('cabeceamento', e, j);
    b.ultimo = j.id; b.equipaUltima = e; b.tickUltimo = s.tick; b.passe = null; b.remate = null;
    this.versaoBola++;
    const [v0, v1] = AEREO.v, [z0, z1] = AEREO.vz;
    if (naAreaAdversaria(j)) {
      const xg = xgEstimado(s, j, true), r = executarRemate(s, j, this.semente, true);
      b.v = r.v; b.vz = r.vz; b.remate = { de: j.id, xg, tick: s.tick };
      s.estat.remates[e]++; s.estat.xg[e] += xg;
      this.ev('remate', e, j, null, undefined, 'CABECA', xg);
      return;
    }
    const q = paraEquipa(e, j.p);
    if (naPropriaAreaAbs(e, j.p) && this.r(`cabcanto|${j.id}`) < CANTOS.cabeca_defensiva) { this.paraCanto(j, 12); return; }
    if (q.x < 40) {
      // Afasta: para a frente e para fora.
      const alvo = paraAbsoluto(e, { x: q.x + 25, y: q.y < C.largura / 2 ? 6 : C.largura - 6 });
      const a = Math.atan2(alvo.y - j.p.y, alvo.x - j.p.x), v = v0 + (v1 - v0) * this.r(`cab|${j.id}`);
      b.v = { x: Math.cos(a) * v, y: Math.sin(a) * v }; b.vz = z0 + (z1 - z0) * this.r(`cabz|${j.id}`);
      return;
    }
    // Amortece para o colega mais perto (à frente, se houver).
    const col = s.jogadores.filter((o) => o.equipa === e && o !== j && o.chave !== 'GR').sort((a, c) => dist(a.p, j.p) - dist(c.p, j.p))[0];
    const a = col ? Math.atan2(col.p.y - j.p.y, col.p.x - j.p.x) : j.corpo;
    b.v = { x: Math.cos(a) * 8, y: Math.sin(a) * 8 }; b.vz = 1;
    if (col) b.passe = { de: j.id, para: col.id, destino: { ...col.p }, tick: s.tick, tipo: 'CABECA' };
  }

  /** Primeiro toque (secção 7.3): controla, ou a bola afasta-se e fica solta; também bloqueios de remate e foras de jogo. */
  private contacto(j: Jogador2D, vel: number) {
    const s = this.estado, b = s.bola;
    const passe = b.passe, adversario = (passe || b.remate) && j.equipa !== b.equipaUltima;
    // Fora de jogo: o receptor estava para lá da linha quando a bola partiu.
    if (passe?.foraDeJogo && j.id === passe.para) {
      s.estat.forasDeJogo[j.equipa]++;
      this.ev('fora_de_jogo', j.equipa, j);
      const def = s.jogadores.filter((o) => o.equipa !== j.equipa && o.chave !== 'GR').sort((a, c) => dist(a.p, j.p) - dist(c.p, j.p))[0];
      this.iniciarReposicao('livre', outra(j.equipa), { ...j.p }, def);
      return;
    }
    // Bloqueio de um remate: a bola desvia.
    if (b.remate && adversario && vel > 10) {
      this.ev('bloqueio', j.equipa, j, this.jog(b.remate.de));
      if (this.r(`bloqcanto|${j.id}`) < CANTOS.bloqueio) { this.paraCanto(j, vel * 0.35); return; }
      const ang = Math.atan2(b.v.y, b.v.x) + 1.3 * normal(`${this.semente}|${s.tick}|${j.id}|bloq`);
      const v = vel * 0.35;
      b.v = { x: Math.cos(ang) * v, y: Math.sin(ang) * v }; b.vz = 1.5 * this.r(`bz|${j.id}`);
      b.ultimo = j.id; b.equipaUltima = j.equipa; b.tickUltimo = s.tick; b.remate = null; b.passe = null;
      this.versaoBola++;
      return;
    }
    const a = j.attrs as Record<string, number | undefined>;
    let q = (0.6 * (a.ptq ?? 10) + 0.4 * (a.tec ?? 10)) / 20 - (vel - 10) / 40;
    if (passe?.aereo || b.z > 0.3) q -= AEREO.ar_penalidade * Math.max(0, vel - 10) + 0.08;
    // Receber com um adversário encostado (a menos de 1,5 m) é mais difícil.
    q -= RECEPCAO.encostado * s.jogadores.filter((o) => o.equipa !== j.equipa && o.chave !== 'GR' && dist(o.p, j.p) < 1.5).length;
    if (passe && adversario) {
      s.estat.intercepcoes[j.equipa]++; this.ev('intercepcao', j.equipa, j, this.jog(passe.de));
      // Cruzamento cortado na própria área: muitas vezes vai para canto.
      if (naPropriaAreaAbs(j.equipa, j.p) && this.r(`cortecanto|${j.id}`) < (passe.tipo === 'CRUZAMENTO' || passe.aereo ? CANTOS.corte_cruzamento : CANTOS.corte_rasteiro)) { this.paraCanto(j, Math.max(8, vel * 0.5)); return; }
    }
    // Passe certo = chegou a um colega (como nas estatísticas reais), mesmo que o primeiro toque saia mal.
    if (passe && !adversario && contaPasse(passe.tipo)) s.estat.certos[j.equipa]++;
    if (aleatorio(`${this.semente}|${s.tick}|${j.id}|toque`) > q + RECEPCAO.toque_folga) {
      const dir = vel > 0.1 ? Math.atan2(b.v.y, b.v.x) : j.corpo;
      const ang = dir + 0.8 * normal(`${this.semente}|${s.tick}|${j.id}|desvio`);
      const v = RECEPCAO.mau_toque_v[0] + (RECEPCAO.mau_toque_v[1] - RECEPCAO.mau_toque_v[0]) * aleatorio(`${this.semente}|${s.tick}|${j.id}|forca`);
      b.v = { x: Math.cos(ang) * v, y: Math.sin(ang) * v }; b.z = 0; b.vz = 0;
      b.ultimo = j.id; b.equipaUltima = j.equipa; b.tickUltimo = s.tick; b.passe = null; b.remate = null;
      this.versaoBola++;
      s.estat.mausToques[j.equipa]++;
      this.mauToque = { equipa: j.equipa, tick: s.tick };
      this.ev('mau_toque', j.equipa, j);
      return;
    }
    if (passe && !adversario) this.ev('recepcao', j.equipa, j, this.jog(passe.de));
    this.darBola(j, !!passe && !adversario);
  }

  /** Bola fora: golo, lançamento, pontapé de baliza ou canto (reposição sem teletransporte: quem repõe vai lá). */
  private foraDoCampo() {
    const s = this.estado, b = s.bola;
    if (b.p.x >= 0 && b.p.x <= C.comprimento && b.p.y >= 0 && b.p.y <= C.largura) return;
    // Golo: passa a linha de golo entre os postes e abaixo da barra.
    if ((b.p.x < 0 || b.p.x > C.comprimento) && Math.abs(b.p.y - C.largura / 2) < REMATE.meia_baliza && b.z < REMATE.barra) {
      const marcou: Equipa = b.p.x > C.comprimento ? 0 : 1;
      s.estat.golos[marcou]++;
      if (b.remate) s.estat.aBaliza[marcou]++;
      const autor = this.jog(b.remate?.de ?? b.ultimo);
      this.ev('golo', marcou, autor);
      const sofreu = outra(marcou);
      const pl = s.jogadores.filter((j) => j.equipa === sofreu && j.chave !== 'GR').sort((x, y) => paraEquipa(sofreu, y.ancora).x - paraEquipa(sofreu, x.ancora).x)[0];
      b.p = { x: Math.max(-1, Math.min(C.comprimento + 1, b.p.x)), y: b.p.y };
      this.iniciarReposicao('saida', sofreu, { x: C.comprimento / 2, y: C.largura / 2 }, pl);
      return;
    }
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
    b.p = { x: Math.max(-1, Math.min(C.comprimento + 1, b.p.x)), y: Math.max(-1, Math.min(C.largura + 1, b.p.y)) };
    this.ev('fora', repoe, m);
    if (tipo === 'canto') s.estat.cantos[repoe]++;
    this.iniciarReposicao(tipo, repoe, local, m);
  }

  /** Fotografia leve do estado (para a renderização interpolar entre ticks). */
  fotografia() {
    const s = this.estado, b = s.bola;
    return { tick: s.tick, bola: { ...b.p }, z: b.z, dono: b.dono, remate: !!b.remate, conducao: s.conducao?.tipo ?? null,
      passe: b.passe ? { de: b.passe.de, para: b.passe.para, destino: { ...b.passe.destino }, aereo: !!b.passe.aereo } : null, posse: s.posse, reposicao: s.reposicao ? s.reposicao.tipo : null,
      golos: [...s.estat.golos],
      jogadores: s.jogadores.map((j) => ({ id: j.id, equipa: j.equipa, numero: j.numero, nome: j.nome, x: j.p.x, y: j.p.y, corpo: j.corpo, ax: j.ancora.x, ay: j.ancora.y, accao: j.accao, tarefa: j.tarefaBola, intensidade: j.intensidade, alvo: j.alvoAccao ? { ...j.alvoAccao } : null, ultrapassado: s.tick < j.ultrapassadoAte })),
      equipas: s.equipas.map((e) => ({ fase: e.fase, faseDesde: e.faseDesde, bloco: { ...e.bloco }, alvo: { ...e.alvo }, mistura: e.mistura, estilo: e.estilo, formacao: e.formacao, nome: e.nome })) };
  }
}

void limitesFisicos;
