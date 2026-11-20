// Motor 2D táctico (docs/tactics/MOTOR_2D.md).
// Fase 1: formações e bloco. Fase 2: bola com física e passes curtos. Fase 3: decisão completa do portador, todas as
// acções sem bola, fases e transições, pressão, desarmes, faltas, linha defensiva, fora de jogo, bola no ar,
// cabeceamentos, remates e guarda-redes (estes dois numa versão de base, a afinar na Fase 5).
// Camadas: 1 fase, 2 bloco, 3 âncoras, 4 acções sem bola, 5 portador, 6 movimento, 7 bola e resolução.
// Com `porBola` a bola passa a ser um ponto movido por fora (modo da Fase 1: arrastada ou num caminho).
// Determinístico (sementes fixas), sem DOM; um tick = 0,1 s de jogo.
import { TICK_S, CAMPO_2D, FISICA } from '../../config/match2d/fisica.ts';
import { BLOCO, FASES } from '../../config/match2d/bloco.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { TRANSICAO_FORMA_S } from '../../config/match2d/formacoes.ts';
import { BOLA, RECEPCAO, COMPROMISSO_2D, REPOSICAO } from '../../config/match2d/bola.ts';
import { PORTADOR, DUELO, AEREO, GR, REMATE, LINHA } from '../../config/match2d/fase3.ts';
import { alvoBloco, ancora, filtrarBloco, forma, medidasForma, linhaForaDeJogo } from './bloco.ts';
import { moverJogador, intensidadePara, limitesFisicos } from './fisica.ts';
import { avancarBola3D, preverTrajectoria, pontoIntercepcao, tempoChegada, TICKS_SEM_RETOQUE } from './bola.ts';
import { tempoDecisao, normal } from './passe.ts';
import { avaliarPortador, escolher, executarBola, executarRemate, xgEstimado, pDefensorGanha, forcaDefesa, forcaDrible, distSeg } from './portador.ts';
import { contextoEquipa, candidatas, alvoPressao, alvoCobertura, alvoMarcacao, type ContextoEquipa } from './semBola.ts';
import { aleatorio } from '../decision/rng.ts';
import { paraAbsoluto, paraEquipa, dist, anguloAbsoluto, hyp } from './referencial.ts';
import type { IdEstilo } from '../../config/estilos.ts';
import type { Equipa, Estado2D, EstadoEquipa, Fase, Jogador2D, JogadorBase2D, V2, Evento2D, Intensidade, Reposicao2D } from './tipos.ts';

export interface ConfigEquipa2D { nome: string; formacao: string; estilo: IdEstilo; jogadores: JogadorBase2D[] }
export interface Config2D { equipas: [ConfigEquipa2D, ConfigEquipa2D]; posse?: Equipa; bola?: V2; semente?: string }

const C = CAMPO_2D;
const RECUPERAR_SAI = 4;
/** Quem pressiona pelo lado fica a esta distância do portador (não em cima do colega que fecha a baliza). */
const SB_LADO_M = 2.8;
const TICKS_BLOCO = Math.round(BLOCO.periodo_s / TICK_S);
const TICKS_ACCAO = Math.round(COMPROMISSO_2D.acao_min_s / TICK_S);
const outra = (e: Equipa): Equipa => (e === 0 ? 1 : 0);
const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;
/** Dentro da própria grande área (absoluto)? */
const naPropriaArea = (j: Jogador2D, p = j.p) => { const q = paraEquipa(j.equipa, p); return q.x < 16.5 && Math.abs(q.y - C.largura / 2) < 20.15; };
const naAreaAdversaria = (j: Jogador2D, p = j.p) => { const q = paraEquipa(j.equipa, p); return q.x > C.comprimento - 16.5 && Math.abs(q.y - C.largura / 2) < 20.15; };
const ESPERA_REPOSICAO: Record<Reposicao2D['tipo'], number> = { lancamento: 2, baliza: 3, canto: 4, livre: 2.5, saida: 5 };

export class Motor2D {
  estado: Estado2D;
  semente: string;
  private papeis: [string[], string[]];
  /** Tick em que o portador recebeu a bola (decide ao fim do tempo de decisão). */
  private recebeu = 0;
  /** Muda sempre que a bola muda de trajectória sem ser pela física (passe, toque, reposição). */
  private versaoBola = 0;
  private versaoCalc = -1;
  /** Gatilhos de pressão recentes: passe para trás e mau toque (equipa e tick). */
  private passeAtras = { equipa: 0 as Equipa, tick: -99 };
  private mauToque = { equipa: 0 as Equipa, tick: -99 };

  constructor(cfg: Config2D) {
    const posse = cfg.posse ?? 0;
    this.semente = cfg.semente ?? 'motor2d';
    const eq = (e: Equipa): EstadoEquipa => {
      const c = cfg.equipas[e], b = { linhaDefX: 30, comprimento: 30, largura: 40, centroY: 34 };
      return { nome: c.nome, estilo: c.estilo, formacao: c.formacao, fase: posse === e ? 'ATQ_CONSTRUCAO' : 'DEF_ORGANIZADA', faseDesde: 0, bloco: b, alvo: b, mistura: posse === e ? 1 : 0, subirAte: 0 };
    };
    const centro = { x: C.comprimento / 2, y: C.largura / 2 };
    const par = (): [number, number] => [0, 0];
    this.estado = {
      tick: 0, posse, equipas: [eq(0), eq(1)], jogadores: [], conducao: null,
      bola: { p: { ...(cfg.bola ?? centro) }, z: 0, v: { x: 0, y: 0 }, vz: 0, dono: null, ultimo: null, equipaUltima: posse, tickUltimo: -99, passe: null, remate: null },
      bolaExterna: false, reposicao: null, eventos: [],
      estat: { passes: par(), certos: par(), intercepcoes: par(), mausToques: par(), posse: par(), sequencias: [], golos: par(), remates: par(), aBaliza: par(), xg: par(),
        desarmes: par(), faltas: par(), forasDeJogo: par(), cruzamentos: par(), passesLongos: par(), dribles: par(), recuperacoesAltas: par() },
      passesSeguidos: 0, posseDesde: 0,
    };
    for (const e of [0, 1] as Equipa[]) {
      const f = forma(cfg.equipas[e].formacao);
      cfg.equipas[e].jogadores.slice(0, 11).forEach((b, k) => {
        this.estado.jogadores.push({ ...b, equipa: e, lugar: k, chave: f.lugares[k].chave, p: { x: 0, y: 0 }, v: { x: 0, y: 0 }, corpo: anguloAbsoluto(e, 0),
          accao: 'MANTER_POSICAO', accaoDesde: 0, intensidade: 'andar', ancora: { x: 0, y: 0 }, ancoraAntes: { x: 0, y: 0 },
          alvoAccao: null, pontuacao: 0, proxDecisao: (k * 3) % 5, tarefaBola: null, alvoBola: null, ultrapassadoAte: 0, proxDesarme: 0, marcado: null });
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
    s.eventos.push({ tick: s.tick, tipo, equipa, jogador: j?.id, outro: outro?.id, x: s.bola.p.x, y: s.bola.p.y, ...(alvo ? { alvo: { ...alvo } } : {}), ...(subtipo ? { subtipo } : {}), ...(previsto !== undefined ? { previsto } : {}) });
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

  private ganharPosse(e: Equipa) {
    const s = this.estado;
    if (s.posse === e) return;
    s.estat.sequencias.push(s.passesSeguidos);
    s.posse = e; s.passesSeguidos = 0; s.posseDesde = s.tick;
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
    const livres = s.jogadores.filter((o) => o.equipa !== e && o.chave !== 'GR');
    const meus = s.jogadores.filter((o) => o.equipa === e && o.chave !== 'GR').sort((a, b) => paraEquipa(e, a.ancora).x - paraEquipa(e, b.ancora).x);
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
    s.conducao = null;
    this.versaoBola++;
    b.dono = null; b.ultimo = j.id; b.equipaUltima = e; b.tickUltimo = s.tick;
    if (o.tipo === 'REMATAR') {
      const r = executarRemate(s, j, this.semente);
      b.v = r.v; b.vz = r.vz; b.z = 0.2; b.passe = null;
      b.remate = { de: j.id, xg: o.xg ?? 0, tick: s.tick };
      s.estat.remates[e]++; s.estat.xg[e] += o.xg ?? 0;
      j.corpo = Math.atan2(b.v.y, b.v.x);
      this.ev('remate', e, j);
      return;
    }
    const r = executarBola(s, j, o, this.semente);
    b.v = r.v; b.vz = r.vz; b.z = r.vz > 0 ? 0.1 : 0; b.remate = null;
    b.passe = { de: j.id, para: o.receptor?.id ?? '', destino: o.destino!, tick: s.tick, tipo: o.tipo, aereo: !!o.aereo, foraDeJogo: !!o.foraDeJogo };
    s.estat.passes[e]++;
    if (o.aereo || dist(j.p, o.destino!) > 30) s.estat.passesLongos[e]++;
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
      d.proxDesarme = s.tick + Math.round(DUELO.intervalo_s / TICK_S);
      const tentar = DUELO.tentar_base + DUELO.tentar_agr * (at(d, 'agr') - 10) + (d.accao === 'PRESSIONAR' ? DUELO.tentar_pressao : 0);
      if (this.r(`tentar|${d.id}`) > tentar) continue;
      // O portador defende-se com Drible, Técnica e Força; a proteger e de costas, melhor.
      const deCostas = Math.cos(c.corpo - Math.atan2(d.p.y - c.p.y, d.p.x - c.p.x)) < -0.3;
      const ata = 0.5 * at(c, 'dri') + 0.3 * at(c, 'tec') + 0.2 * at(c, 'for') + (s.conducao?.tipo === 'PROTEGER' ? DUELO.proteger_bonus : 0) + (deCostas ? DUELO.costas_bonus : 0);
      const forcaDef = grSai ? 0.6 * at(d, 'uco') + 0.4 * at(d, 'ref') : forcaDefesa(d, c);
      if (this.r(`desarme|${d.id}`) < pDefensorGanha(forcaDef, ata)) { this.desarmeCerto(d, c); return; }
      // Falhou: fica ultrapassado; pode ter feito falta.
      const [u0, u1] = DUELO.ultrapassado_s;
      d.ultrapassadoAte = s.tick + Math.round((u0 + (u1 - u0) * this.r(`ultra|${d.id}`)) / TICK_S);
      const pFalta = DUELO.falta_base + DUELO.falta_agr * (at(d, 'agr') - 10) + DUELO.falta_falhou;
      if (this.r(`falta|${d.id}`) < pFalta) { this.falta(d, c); return; }
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
    this.iniciarReposicao('livre', c.equipa, { ...c.p }, c);
  }

  private iniciarReposicao(tipo: Reposicao2D['tipo'], equipa: Equipa, local: V2, marcador: Jogador2D) {
    const s = this.estado, b = s.bola;
    b.dono = null; b.v = { x: 0, y: 0 }; b.z = 0; b.vz = 0; b.passe = null; b.remate = null; s.conducao = null;
    s.reposicao = { tipo, equipa, local, marcador: marcador.id, desde: s.tick };
    this.versaoBola++;
    if (s.posse !== equipa) { s.estat.sequencias.push(s.passesSeguidos); s.posse = equipa; s.passesSeguidos = 0; s.posseDesde = s.tick; this.atribuirMarcacoes(outra(equipa)); }
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
        int = j.tarefaBola === 'repor' ? (d > 15 ? 'corrida' : 'trote') : j.tarefaBola === 'receber' ? (d < 2 ? 'andar' : d < 6 ? 'trote' : d < 14 ? 'corrida' : 'sprint') : 'sprint';
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
        else if (a === 'MARCAR' && j.marcado) { const o = this.jog(j.marcado); alvo = o ? alvoMarcacao(j, o) : j.ancora; vA = o ? { x: o.v.x, y: o.v.y } : vA; }
        else if (a !== 'MANTER_POSICAO' && a !== 'RECUPERAR' && j.alvoAccao) { alvo = j.alvoAccao; vA = { x: 0, y: 0 }; }
        const d = d0();
        const sprint = a === 'RECUPERAR' || a === 'SOBREPOSICAO' || (a === 'PRESSIONAR' && d > 2) || (a === 'ATACAR_PROFUNDIDADE' && paraEquipa(j.equipa, alvo).x > linhaForaDeJogo(s, j.equipa));
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
      j.intensidade = int;
      moverJogador(j, alvo, vA, int, colegas[j.equipa], olhar, dt, fraccao);
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
      if (m && dist(m.p, r.local) < REPOSICAO.chegada_m && (s.tick - r.desde) * dt >= ESPERA_REPOSICAO[r.tipo] && d < 0.3) {
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
      const d = distSeg(j.p, antes, b.p);
      if (j.chave === 'GR' && naPropriaArea(j)) { if (d <= GR.alcance_base + GR.alcance_agi * at(j, 'agi') && z <= GR.z_max) cands.push({ j, d, tipo: 'maos' }); continue; }
      // Um adversário de quem passou/rematou: na linha (corpo) corta sempre; com a perna, só depois de reagir e com uma
      // probabilidade que desce com a distância à linha e com a velocidade da bola (decisão 190).
      if (z <= BOLA.z_pe && d <= BOLA.alcance && (b.passe || b.remate) && j.equipa !== b.equipaUltima && d > RECEPCAO.corpo_m) {
        const reac = RECEPCAO.reaccao_base - RECEPCAO.reaccao_ant * at(j, 'ant');
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
    // Desvia: para o lado, para longe da baliza, a 40% da velocidade.
    const fora = Math.atan2(b.v.y, b.v.x) + (this.r(`desvio|${g.id}`) < 0.5 ? 1 : -1) * (1.1 + 0.6 * this.r(`desv2|${g.id}`));
    const v = Math.max(4, vel * 0.4);
    b.v = { x: Math.cos(fora) * v, y: Math.sin(fora) * v }; b.vz = 1.5; b.z = Math.max(b.z, 0.3);
    b.ultimo = g.id; b.equipaUltima = g.equipa; b.tickUltimo = s.tick; b.passe = null; b.remate = null;
    this.versaoBola++;
  }

  /** Cabeceamento: na área adversária, remate; um defensor afasta; noutro sítio, amortece para um colega. */
  private cabeceamento(j: Jogador2D) {
    const s = this.estado, b = s.bola, e = j.equipa;
    this.ev('cabeceamento', e, j);
    b.ultimo = j.id; b.equipaUltima = e; b.tickUltimo = s.tick; b.passe = null; b.remate = null;
    this.versaoBola++;
    const [v0, v1] = AEREO.v, [z0, z1] = AEREO.vz;
    if (naAreaAdversaria(j)) {
      const xg = xgEstimado(s, j, true), r = executarRemate(s, j, this.semente, true);
      b.v = r.v; b.vz = r.vz; b.remate = { de: j.id, xg, tick: s.tick };
      s.estat.remates[e]++; s.estat.xg[e] += xg;
      this.ev('remate', e, j);
      return;
    }
    const q = paraEquipa(e, j.p);
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
    if (passe && adversario) { s.estat.intercepcoes[j.equipa]++; this.ev('intercepcao', j.equipa, j, this.jog(passe.de)); }
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
    if (passe && !adversario) { s.estat.certos[j.equipa]++; this.ev('recepcao', j.equipa, j, this.jog(passe.de)); }
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
