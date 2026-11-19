// Motor 2D táctico — Fase 1 (docs/tactics/MOTOR_2D.md, secção 13): formações e bloco, sem bola real.
// A bola é um ponto que se move por fora (arrastada ou num caminho); a posse troca-se por fora. As camadas 1 (fase),
// 2 (bloco), 3 (âncoras), 4 (só MANTER_POSICAO e RECUPERAR) e 6 (movimento) já funcionam.
// Determinístico (sem aleatoriedade nesta fase), sem DOM; um tick = 0,1 s de jogo.
import { TICK_S, CAMPO_2D } from '../../config/match2d/fisica.ts';
import { BLOCO, FASES } from '../../config/match2d/bloco.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { TRANSICAO_FORMA_S } from '../../config/match2d/formacoes.ts';
import { alvoBloco, ancora, filtrarBloco, forma, medidasForma, linhaForaDeJogo } from './bloco.ts';
import { moverJogador, intensidadePara } from './fisica.ts';
import { paraAbsoluto, paraEquipa, dist, anguloAbsoluto } from './referencial.ts';
import type { IdEstilo } from '../../config/estilos.ts';
import type { Equipa, Estado2D, EstadoEquipa, Fase, Jogador2D, JogadorBase2D, V2 } from './tipos.ts';

export interface ConfigEquipa2D { nome: string; formacao: string; estilo: IdEstilo; jogadores: JogadorBase2D[] }
export interface Config2D { equipas: [ConfigEquipa2D, ConfigEquipa2D]; posse?: Equipa; bola?: V2 }

/** Compromisso da acção sem bola (secção 6.3) e limites da recuperação (m da âncora: entra / sai). */
const ACCAO_MIN_S = 0.8, RECUPERAR_ENTRA = 10, RECUPERAR_SAI = 4;
const TICKS_BLOCO = Math.round(BLOCO.periodo_s / TICK_S);

export class Motor2D {
  estado: Estado2D;
  private papeis: [string[], string[]];

  constructor(cfg: Config2D) {
    const posse = cfg.posse ?? 0;
    const bola = cfg.bola ?? { x: CAMPO_2D.comprimento / 2, y: CAMPO_2D.largura / 2 };
    const eq = (e: Equipa): EstadoEquipa => {
      const c = cfg.equipas[e], m = posse === e ? 1 : 0;
      const b = { linhaDefX: 30, comprimento: 30, largura: 40, centroY: 34 };
      return { nome: c.nome, estilo: c.estilo, formacao: c.formacao, fase: posse === e ? 'ATQ_CONSTRUCAO' : 'DEF_ORGANIZADA', faseDesde: 0, bloco: b, alvo: b, mistura: m };
    };
    this.estado = { tick: 0, bola: { p: { ...bola }, z: 0, v: { x: 0, y: 0 } }, posse, equipas: [eq(0), eq(1)], jogadores: [] };
    for (const e of [0, 1] as Equipa[]) {
      forma(cfg.equipas[e].formacao);
      cfg.equipas[e].jogadores.slice(0, 11).forEach((b, k) => {
        this.estado.jogadores.push({ ...b, equipa: e, lugar: k, chave: forma(cfg.equipas[e].formacao).lugares[k].chave, p: { x: 0, y: 0 }, v: { x: 0, y: 0 },
          corpo: anguloAbsoluto(e, 0), accao: 'MANTER_POSICAO', accaoDesde: 0, intensidade: 'andar', ancora: { x: 0, y: 0 }, ancoraAntes: { x: 0, y: 0 } });
      });
    }
    this.papeis = [this.papeisDe(0), this.papeisDe(1)];
    // Começa com o bloco formado e cada jogador na sua âncora.
    for (const e of [0, 1] as Equipa[]) { const eqs = this.estado.equipas[e]; eqs.alvo = alvoBloco(this.estado, e, this.papeis[e]); eqs.bloco = { ...eqs.alvo }; }
    for (const j of this.estado.jogadores) { j.ancora = paraAbsoluto(j.equipa, ancora(this.estado, j, this.papeis[j.equipa])); j.ancoraAntes = { ...j.ancora }; j.p = { ...j.ancora }; }
  }

  private papeisDe(e: Equipa) { return this.estado.jogadores.filter((j) => j.equipa === e).sort((a, b) => a.lugar - b.lugar).map((j) => j.papel); }

  /** Move a bola (arrastada ou num caminho), no referencial absoluto; a velocidade é estimada pelo deslocamento. */
  porBola(p: V2, dt = TICK_S) {
    const b = this.estado.bola;
    b.v = { x: (p.x - b.p.x) / dt, y: (p.y - b.p.y) / dt };
    b.p = { x: Math.max(0, Math.min(CAMPO_2D.comprimento, p.x)), y: Math.max(0, Math.min(CAMPO_2D.largura, p.y)) };
  }

  /** Troca a posse: quem a ganhou entra em transição defesa→ataque, quem a perdeu em transição ataque→defesa. */
  trocarPosse() {
    const s = this.estado, nova: Equipa = s.posse === 0 ? 1 : 0;
    s.posse = nova;
    this.mudarFase(nova, 'TRANS_DEF_ATQ');
    this.mudarFase(nova === 0 ? 1 : 0, 'TRANS_ATQ_DEF');
  }

  mudarFormacao(e: Equipa, formacao: string, papeis?: string[]) {
    const eq = this.estado.equipas[e], f = forma(formacao);
    eq.formacao = formacao;
    this.estado.jogadores.filter((j) => j.equipa === e).forEach((j) => { j.chave = f.lugares[j.lugar].chave; if (papeis?.[j.lugar]) j.papel = papeis[j.lugar]; });
    this.papeis[e] = this.papeisDe(e);
  }
  mudarEstilo(e: Equipa, estilo: IdEstilo) { this.estado.equipas[e].estilo = estilo; }

  private mudarFase(e: Equipa, f: Fase) { const eq = this.estado.equipas[e]; if (eq.fase !== f) { eq.fase = f; eq.faseDesde = this.estado.tick; } }

  /** Camada 1: fase da equipa (por evento e pela zona da bola). */
  private actualizarFase(e: Equipa) {
    const s = this.estado, eq = s.equipas[e], P = ESTILOS_2D[eq.estilo];
    const t = (s.tick - eq.faseDesde) * TICK_S;
    const b = paraEquipa(e, s.bola.p);
    if (s.posse === e) {
      if (eq.fase === 'TRANS_DEF_ATQ' && t < P.transDefAtqS) return;
      const naArea = b.x > CAMPO_2D.comprimento - 16.5 && Math.abs(b.y - CAMPO_2D.largura / 2) < 20.15;
      const fin = naArea || (b.x >= FASES.finalizacao_desde && Math.abs(b.y - CAMPO_2D.largura / 2) < FASES.finalizacao_corredor);
      this.mudarFase(e, fin ? 'ATQ_FINALIZACAO' : b.x >= FASES.criacao_desde ? 'ATQ_CRIACAO' : 'ATQ_CONSTRUCAO');
    } else {
      if (eq.fase !== 'TRANS_ATQ_DEF') { this.mudarFase(e, 'DEF_ORGANIZADA'); return; }
      // A transição acaba no tempo do estilo ou mais cedo, se o bloco já estiver formado (passado o primeiro segundo e meio).
      const formado = t > 1.5 && s.jogadores.every((j) => j.equipa !== e || dist(j.p, j.ancora) < FASES.bloco_formado_m);
      if (t >= P.transAtqDefS || formado) this.mudarFase(e, 'DEF_ORGANIZADA');
    }
  }

  /** Um tick (0,1 s de jogo). */
  passo() {
    const s = this.estado, dt = TICK_S;
    s.tick++;
    for (const e of [0, 1] as Equipa[]) {
      const eq = s.equipas[e];
      this.actualizarFase(e);
      // Formas: mistura gradual entre sem bola e com bola.
      const alvoM = eq.fase.startsWith('ATQ') || eq.fase === 'TRANS_DEF_ATQ' ? 1 : 0;
      eq.mistura += Math.max(-dt / TRANSICAO_FORMA_S, Math.min(dt / TRANSICAO_FORMA_S, alvoM - eq.mistura));
      // Camada 2: alvo do bloco a 5 Hz (desfasado entre as equipas) e filtro a cada tick.
      if ((s.tick + e) % TICKS_BLOCO === 0) eq.alvo = alvoBloco(s, e, this.papeis[e]);
      eq.bloco = filtrarBloco(eq.bloco, eq.alvo, dt);
    }
    // Camada 3: âncoras.
    const med = [0, 1].map((e) => medidasForma(s.equipas[e].formacao, this.papeis[e], s.equipas[e].mistura));
    const fj = [linhaForaDeJogo(s, 0), linhaForaDeJogo(s, 1)];
    for (const j of s.jogadores) { j.ancoraAntes = j.ancora; j.ancora = paraAbsoluto(j.equipa, ancora(s, j, this.papeis[j.equipa], med[j.equipa], fj[j.equipa])); }
    // Camada 4 (Fase 1): manter a posição; em transição ataque→defesa, quem está longe da âncora recupera em sprint.
    for (const j of s.jogadores) {
      const fase = s.equipas[j.equipa].fase, d = dist(j.p, j.ancora);
      const podeMudar = (s.tick - j.accaoDesde) * dt >= ACCAO_MIN_S;
      const nova = j.accao === 'RECUPERAR' ? (d < RECUPERAR_SAI || fase !== 'TRANS_ATQ_DEF' ? 'MANTER_POSICAO' : 'RECUPERAR')
        : fase === 'TRANS_ATQ_DEF' && d > RECUPERAR_ENTRA ? 'RECUPERAR' : 'MANTER_POSICAO';
      if (nova !== j.accao && podeMudar) { j.accao = nova; j.accaoDesde = s.tick; }
    }
    // Camada 6: movimento.
    const colegas = [s.jogadores.filter((o) => o.equipa === 0), s.jogadores.filter((o) => o.equipa === 1)];
    for (const j of s.jogadores) {
      const vA = { x: (j.ancora.x - j.ancoraAntes.x) / dt, y: (j.ancora.y - j.ancoraAntes.y) / dt };
      j.intensidade = intensidadePara(dist(j.p, j.ancora), j.accao === 'RECUPERAR');
      moverJogador(j, j.ancora, vA, j.intensidade, colegas[j.equipa], s.bola.p, dt);
    }
  }

  /** Fotografia leve do estado (para a renderização interpolar entre ticks). */
  fotografia() {
    const s = this.estado;
    return { tick: s.tick, bola: { ...s.bola.p }, posse: s.posse, jogadores: s.jogadores.map((j) => ({ id: j.id, equipa: j.equipa, numero: j.numero, nome: j.nome, x: j.p.x, y: j.p.y, corpo: j.corpo, ax: j.ancora.x, ay: j.ancora.y, accao: j.accao, intensidade: j.intensidade })),
      equipas: s.equipas.map((e) => ({ fase: e.fase, faseDesde: e.faseDesde, bloco: { ...e.bloco }, alvo: { ...e.alvo }, mistura: e.mistura, estilo: e.estilo, formacao: e.formacao, nome: e.nome })) };
  }
}
