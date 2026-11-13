// Gerador de plantéis fictícios (determinístico, marcados "gerado").
// A qualidade de cada plantel vem da mesma força da Fase 1 (reputação × força desportiva
// da liga), para manter a hierarquia entre clubes e entre ligas.
import { Rng } from '../core/rng.ts';
import { ATRIBUTOS, N_ATR, N_OCU, IDX } from '../config/atributos.ts';
import { PAPEIS_DA_POSICAO, IDX_POS, N_POS, POSICOES, VIZINHANCA, type Posicao } from '../config/papeis.ts';
import { GERACAO_JOGADORES as G } from '../config/geracaoJogadores.ts';
import { FORCA } from '../config/forca.ts';
import { PlayerStore, PESOS_PAPEL } from './store.ts';
import { nomePessoa } from './nomesPessoas.ts';
import type { World } from '../engine/world.ts';

const E_GR = new Uint8Array(N_ATR);
ATRIBUTOS.forEach((a, i) => { if (a.grupo === 'guarda_redes') E_GR[i] = 1; });

/** Vector de relevância (0–1) dos atributos para uma posição, com ênfase no papel preferido. */
function relevancia(pos: Posicao, papel: number): Float32Array {
  const papeis = PAPEIS_DA_POSICAO[pos];
  const v = new Float32Array(N_ATR);
  for (const r of papeis) for (let k = 0; k < N_ATR; k++) v[k] += (0.5 * PESOS_PAPEL[r][k]) / papeis.length;
  for (let k = 0; k < N_ATR; k++) v[k] += 0.5 * PESOS_PAPEL[papel][k];
  let m = 0;
  for (let k = 0; k < N_ATR; k++) m = Math.max(m, v[k]);
  for (let k = 0; k < N_ATR; k++) v[k] /= m;
  return v;
}

/** Adequação média (1–20, contínua) aos papéis da posição. */
function adequacaoPosicao(atr: Float32Array, pos: Posicao): number {
  const papeis = PAPEIS_DA_POSICAO[pos];
  let s = 0;
  for (const r of papeis) {
    let x = 0;
    for (let k = 0; k < N_ATR; k++) x += PESOS_PAPEL[r][k] * atr[k];
    s += x;
  }
  return s / papeis.length;
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export interface OpcoesJogador {
  id: string;
  pais: string;
  pos: Posicao;
  /** Papel preferido (índice); por defeito um dos papéis da posição ao acaso. */
  papel?: number;
  idade: number;
  /** Dia de referência para a idade. */
  dia: number;
  /** OVR actual pretendido na posição natural. */
  ovr: number;
  potencial: number;
  clube: number;
}

/** Cria um jogador com atributos ajustados para o OVR pretendido. Devolve o índice. */
export function gerarJogador(st: PlayerStore, rng: Rng, o: OpcoesJogador): number {
  const i = st.novo(o.id, nomePessoa(o.pais, rng), o.pais);
  const papeis = PAPEIS_DA_POSICAO[o.pos];
  const papel = o.papel ?? rng.pick(papeis);
  const rel = relevancia(o.pos, papel);
  const A = 1 + (19 * (clamp(o.ovr, 1, 100) - 1)) / 99;
  let mediaRel = 0, nRel = 0;
  for (let k = 0; k < N_ATR; k++) if (rel[k] > 0) { mediaRel += rel[k]; nRel++; }
  mediaRel /= nRel;
  const gr = o.pos === 'GR';
  const atr = new Float32Array(N_ATR);
  for (let k = 0; k < N_ATR; k++) {
    if (rel[k] > 0) atr[k] = A + G.dispersao_chave * (rel[k] - mediaRel) * 2 + rng.normal(0, G.ruido_atributo);
    else if (!gr && E_GR[k]) atr[k] = rng.int(G.atributos_fora_de_posicao[0], G.atributos_fora_de_posicao[1]);
    else if (gr) atr[k] = A * 0.55 + rng.normal(0, G.ruido_atributo);
    else atr[k] = A - G.dispersao_chave * G.desconto_irrelevantes + rng.normal(0, G.ruido_atributo);
  }
  // Idade: jovens com menos força; veteranos com menos velocidade e aceleração.
  if (o.idade < 20) { atr[IDX.for] -= 2; atr[IDX.equ] -= 1; }
  if (o.idade > 30) for (const k of [IDX.ace, IDX.vel, IDX.agi]) atr[k] -= (o.idade - 30) * 0.6;
  // Ajuste iterativo: desloca os atributos relevantes até a adequação média à posição bater no alvo.
  for (let it = 0; it < 8; it++) {
    for (let k = 0; k < N_ATR; k++) atr[k] = clamp(Math.round(atr[k]), 1, 20);
    const d = A - adequacaoPosicao(atr, o.pos);
    if (Math.abs(d) < 0.12) break;
    for (let k = 0; k < N_ATR; k++) if (rel[k] > 0) atr[k] += d;
  }
  for (let k = 0; k < N_ATR; k++) st.atr[i * N_ATR + k] = clamp(Math.round(atr[k]), 1, 20);
  for (let k = 0; k < N_OCU; k++) st.ocu[i * N_OCU + k] = clamp(Math.round(rng.normal(G.ocultos.media, G.ocultos.desvio)), 1, 20);
  // Familiaridade.
  const nat = IDX_POS[o.pos];
  for (let p = 0; p < N_POS; p++) st.fam[i * N_POS + p] = gr || POSICOES[p] === 'GR' ? 1 : rng.int(1, 8);
  for (const [p, [a, b]] of Object.entries(VIZINHANCA[o.pos] ?? {})) st.fam[i * N_POS + IDX_POS[p as Posicao]] = rng.int(a, b);
  st.fam[i * N_POS + nat] = rng.int(18, 20);
  st.posNat[i] = nat;
  st.papelPref[i] = papel;
  const u = rng.next();
  st.pe[i] = u < G.pe.direito ? 0 : u < G.pe.direito + G.pe.esquerdo ? 1 : 2;
  if (o.pos === 'DE' || o.pos === 'ALE' || (o.pos === 'EE' && papel === PAPEIS_DA_POSICAO.EE[0])) st.pe[i] = rng.chance(0.75) ? 1 : st.pe[i];
  st.nasc[i] = Math.round(o.dia - o.idade * 365.25);
  st.clube[i] = o.clube;
  st.recalcular(i);
  st.pot[i] = clamp(Math.max(st.ovrNat(i), Math.round(o.potencial)), 1, 99);
  return i;
}

function idadeAleatoria(rng: Rng): number {
  const idades: number[] = [];
  const pesos: number[] = [];
  for (let a = G.idade_min; a <= G.idade_max; a++) { idades.push(a); pesos.push(G.peso_idade(a)); }
  let r = rng.next() * pesos.reduce((s, x) => s + x, 0);
  for (let k = 0; k < idades.length; k++) if ((r -= pesos[k]) < 0) return idades[k] + rng.next();
  return 26;
}

/** OVR-alvo dos titulares de um clube: a mesma força da Fase 1, numa escala de OVR. */
export function ovrAlvoClube(w: World, c: number): number {
  const l = w.liga[c];
  const fd = l >= 0 ? w.ligas[l].regras.forca_desportiva : 40;
  const forca = w.reputacao[c] * (FORCA.base + (FORCA.peso_forca_desportiva * fd) / 100);
  return G.ovr_base + G.ovr_por_forca * forca;
}

function paisEstrangeiro(rng: Rng, proprio: string): string {
  const ent = Object.entries(G.paises_estrangeiros).filter(([p, w]) => p !== proprio && w > 0);
  let r = rng.next() * ent.reduce((s, [, w]) => s + w, 0);
  for (const [p, w] of ent) if ((r -= w) < 0) return p;
  return ent[0][0];
}

/** Gera o plantel (~25) de um clube. Devolve os índices dos jogadores. */
export function gerarPlantel(w: World, st: PlayerStore, c: number, dia: number, rng: Rng, prefixo = w.clubes[c].id): number[] {
  const clube = w.clubes[c];
  const l = w.liga[c];
  const regras = l >= 0 ? w.ligas[l].regras : null;
  const L = ovrAlvoClube(w, c);
  const n = G.composicao.length;
  // Nacionalidades: mínimo de nacionais da liga; o resto estrangeiros conforme a riqueza.
  const minNac = regras?.plantel.minimo_nacionais ?? 0;
  const fracEstr = G.estrangeiros.base + (G.estrangeiros.peso_riqueza * (regras?.indice_riqueza ?? 0)) / 100;
  const nEstr = Math.min(n - minNac, Math.round(n * fracEstr));
  const estrangeiro = rng.shuffle(Array.from({ length: n }, (_, k) => k < nEstr));
  const ordem = new Map<string, number>();
  const out: number[] = [];
  G.composicao.forEach((slot, k) => {
    const pos: Posicao = slot === 'ED|EE' ? (rng.chance(0.5) ? 'ED' : 'EE') : slot;
    const o = ordem.get(pos) ?? 0;
    ordem.set(pos, o + 1);
    const idade = idadeAleatoria(rng);
    let t0 = L + (G.desvio_por_ordem[o] ?? G.desvio_por_ordem[G.desvio_por_ordem.length - 1]) + rng.normal(0, G.ruido_ovr);
    if (rng.chance(G.prob_craque)) t0 += G.bonus_craque;
    const t = clamp(t0 - G.atraso_jovem(idade) - G.atraso_veterano(idade), 15, 97);
    const pot = clamp(Math.max(t, t0 + 0.5 * G.margem_potencial(idade) + rng.normal(0, G.ruido_potencial)), t, 99);
    const pais = estrangeiro[k] ? paisEstrangeiro(rng, clube.pais) : clube.pais;
    out.push(gerarJogador(st, rng, { id: `${prefixo}_j${k + 1}`, pais, pos, idade, dia, ovr: t, potencial: pot, clube: c }));
  });
  return out;
}
