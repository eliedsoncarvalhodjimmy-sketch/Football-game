// Fase 6 do motor 2D (docs/tactics/MOTOR_2D.md, secção 13): o jogo do utilizador no modo detalhado corre no motor 2D
// táctico. Este módulo liga os dois mundos:
//   - Lado (o onze escolhido, com ratings e modificadores) → equipa do Motor2D (atributos reais do plantel, condição,
//     posição e papel de cada lugar, estilo do treinador);
//   - registo do Motor2D → resumo do jogo (golos, marcadores, assistências, remates, cartões, minutos) que o registo de
//     estatísticas da época (registarLado) usa em vez do sorteio do modo rápido.
// Os modificadores do modo rápido (moral, forma, treinador, forma da época, correcção da deriva) e a vantagem de jogar
// em casa entram como um factor sobre os atributos: a força relativa das equipas é a mesma nos dois modos.
import { ATRIBUTOS } from '../config/atributos.ts';
import { PAPEIS } from '../config/papeis.ts';
import { ESTILOS_2D, type Estilo2D } from '../config/match2d/estilos.ts';
import { JOGO_2D } from '../config/match2d/fase6.ts';
import { Motor2D, type Config2D } from '../engine/match2d/Motor2D.ts';
import { condicaoActual } from './onze.ts';
import type { JogadorBase2D, Evento2D } from '../engine/match2d/tipos.ts';
import type { World } from '../engine/world.ts';
import type { Lado } from './rapido.ts';

const N_ATR = 39;
const TICKS_90 = 54000;

/** O que o jogo 2D deixa para a época (por lado: 0 = casa, 1 = fora). Os jogadores vão pelo índice no PlayerStore. */
export interface Resumo2D {
  golos: [number, number];
  xg: [number, number];
  remates: [number, number];
  marcadores: [number[], number[]];
  assistencias: [number[], number[]];
  rematesPor: [[number, number][], [number, number][]];
  amarelos: [number[], number[]];
  vermelhos: [number[], number[]];
  /** Minutos jogados pelos titulares (sem substituições no motor 2D; um expulso joga até à expulsão). */
  minutos: [[number, number][], [number, number][]];
}

/** Factor de força de um lado: os modificadores do modo rápido, a força relativa ao adversário (amplificada: no motor 2D
 *  a diferença de atributos sozinha pesa menos do que no modo rápido) e, para a equipa da casa, a vantagem de casa. */
export function factorForca(lado: Lado, outro: Lado, casa: boolean, neutro: boolean): number {
  const base = lado.ratings.forcaAtaque + lado.ratings.forcaDefesa;
  const efectiva = lado.forcaAtaque + lado.forcaDefesa, adv = outro.forcaAtaque + outro.forcaDefesa;
  const mods = base > 0 ? efectiva / base : 1;
  const f = 1 + (mods - 1) * JOGO_2D.peso_modificadores;
  const relativa = adv > 0 ? Math.pow((2 * efectiva) / (efectiva + adv), JOGO_2D.amplificacao) : 1;
  return f * relativa * (casa && !neutro ? 1 + JOGO_2D.vantagem_casa : 1);
}

/** Estilo 2D do treinador do clube (o perfil é um dos 8 estilos; senão, o neutro). */
export function estilo2D(w: World, c: number): Estilo2D {
  const p = w.motor!.treinadores[c]?.perfil;
  return p && p in ESTILOS_2D && p !== 'neutro' ? (p as Estilo2D) : 'neutro';
}

/** Equipa do Motor2D a partir de um lado preparado. */
export function equipa2D(w: World, lado: Lado, factor: number, dia: number): JogadorBase2D[] {
  const st = w.jogadores!, onze = lado.escolha.onze;
  return onze.jogadores.map((j, k) => {
    const attrs: Record<string, number> = {};
    for (let a = 0; a < N_ATR; a++) {
      const id = ATRIBUTOS[a].id, f = factor * (JOGO_2D.atributos_finalizacao.includes(id) ? JOGO_2D.finalizacao : 1);
      attrs[id] = Math.max(1, Math.min(JOGO_2D.atributo_max, st.atr[j * N_ATR + a] * f));
    }
    return { id: `j${j}`, nome: st.nomes[j], numero: k + 1, pos: onze.formacao.lugares[k].pos, papel: PAPEIS[onze.papeis[k]].id,
      attrs, condicao: Math.max(0.3, Math.min(1, condicaoActual(st, j, dia) / 100)) };
  });
}

/** Configuração do jogo 2D (determinística: a mesma configuração dá sempre o mesmo jogo). */
export function configJogo2D(w: World, casa: Lado, fora: Lado, neutro: boolean, dia: number, semente: string): Config2D {
  const nome = (c: number) => w.clubes[c].nome;
  return {
    semente,
    equipas: [
      { nome: nome(casa.clube), formacao: casa.escolha.onze.formacao.id, estilo: estilo2D(w, casa.clube), jogadores: equipa2D(w, casa, factorForca(casa, fora, true, neutro), dia) },
      { nome: nome(fora.clube), formacao: fora.escolha.onze.formacao.id, estilo: estilo2D(w, fora.clube), jogadores: equipa2D(w, fora, factorForca(fora, casa, false, neutro), dia) },
    ],
  };
}

const idx = (id: string | undefined) => (id && id.startsWith('j') ? Number(id.slice(1)) : -1);

/** Resumo a partir do registo de eventos (marcadores, assistências, remates, cartões, minutos). */
export function resumir(registo: Evento2D[], estat: { golos: [number, number]; xg: [number, number]; remates: [number, number] }, titulares?: [number[], number[]]): Resumo2D {
  const r: Resumo2D = { golos: [estat.golos[0], estat.golos[1]], xg: [estat.xg[0], estat.xg[1]], remates: [estat.remates[0], estat.remates[1]],
    marcadores: [[], []], assistencias: [[], []], rematesPor: [[], []], amarelos: [[], []], vermelhos: [[], []], minutos: [[], []] };
  const equipaDe = new Map<number, 0 | 1>();
  const remates: [Map<number, number>, Map<number, number>] = [new Map(), new Map()];
  const expulsoAos = new Map<number, number>();
  for (let i = 0; i < registo.length; i++) {
    const x = registo[i], j = idx(x.jogador);
    if (j >= 0 && (x.tipo === 'passe' || x.tipo === 'recepcao' || x.tipo === 'remate')) equipaDe.set(j, x.equipa);
    if (x.tipo === 'remate' && j >= 0) remates[x.equipa].set(j, (remates[x.equipa].get(j) ?? 0) + 1);
    if (x.tipo === 'golo') {
      // Autogolo: quem tocou por último é da outra equipa — não há marcador.
      if (j < 0 || (equipaDe.get(j) ?? x.equipa) !== x.equipa) continue;
      r.marcadores[x.equipa].push(j);
      // Assistência: o último passe de um colega para o marcador, sem toque adversário pelo meio (até 15 s antes).
      for (let k = i - 1; k >= 0 && x.tick - registo[k].tick <= 150; k--) {
        const y = registo[k];
        if (y.equipa !== x.equipa && (y.tipo === 'intercepcao' || y.tipo === 'desarme' || y.tipo === 'recepcao')) break;
        if (y.tipo === 'passe' || y.tipo === 'cruzamento') {
          if (idx(y.outro) === j || (y.tipo === 'cruzamento' && idx(y.jogador) !== j)) { const a = idx(y.jogador); if (a >= 0 && a !== j) r.assistencias[x.equipa].push(a); }
          break;
        }
      }
    }
    if (x.tipo === 'cartao' && j >= 0) {
      if (x.subtipo === 'AMARELO' || x.subtipo === 'SEGUNDO_AMARELO') r.amarelos[x.equipa].push(j);
    }
    if (x.tipo === 'expulsao' && j >= 0) { r.vermelhos[x.equipa].push(j); expulsoAos.set(j, Math.round(x.tick / 600)); }
  }
  for (const e of [0, 1] as const) {
    r.rematesPor[e] = [...remates[e].entries()];
    for (const j of titulares?.[e] ?? []) r.minutos[e].push([j, expulsoAos.get(j) ?? 90]);
  }
  return r;
}

/** Resumo completo (com os minutos dos titulares) de uma configuração jogada. */
export function jogarResumir(cfg: Config2D): Resumo2D {
  const m = new Motor2D(cfg);
  for (let t = 0; t < TICKS_90; t++) m.passo();
  const tit = cfg.equipas.map((q) => q.jogadores.map((p) => idx(p.id))) as [number[], number[]];
  return resumir(m.registo, m.estado.estat, tit);
}
