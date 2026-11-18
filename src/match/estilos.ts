// Estilos tácticos no jogo (aprovados pelo utilizador): adequação do onze ao estilo (±5%) e neutralização condicional
// (até −7% no ponto forte da equipa neutralizada), decidida por um duelo de atributos entre os sectores envolvidos.
import { ESTILO_POR_ID, NEUTRALIZACOES, PARES_MUTUOS, EFEITO_ESTILOS as EF, type IdEstilo, type Sector } from '../config/estilos.ts';
import { IDX, N_ATR, type IdAtributo } from '../config/atributos.ts';
import { INDICE_ATAQUE, INDICE_DEFESA } from '../config/ratings.ts';
import { FAMILIARIDADE, IDX_POS, N_POS } from '../config/papeis.ts';

import type { PlayerStore } from '../players/store.ts';
import type { Lado } from './rapido.ts';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const SECTOR: Record<string, Sector> = { GR: 'def', DC: 'def', DD: 'def', DE: 'def', ALD: 'def', ALE: 'def', MDC: 'med', MC: 'med', MO: 'med', ED: 'ata', EE: 'ata', PL: 'ata' };

/** Média de um conjunto de atributos nos jogadores de campo do onze de um sector ('equipa' = todos). */
function mediaSector(st: PlayerStore, lado: Lado, sector: Sector, atrs: IdAtributo[]): number {
  const o = lado.escolha.onze;
  let s = 0, n = 0;
  o.jogadores.forEach((j, k) => {
    const pos = o.formacao.lugares[k].pos;
    if (pos === 'GR' || (sector !== 'equipa' && SECTOR[pos] !== sector)) return;
    for (const a of atrs) { s += st.atr[j * N_ATR + IDX[a]]; n++; }
  });
  return n ? s / n : 10;
}

/** Polivalência: familiaridade média dos titulares de campo com as outras posições (0–20 → só as ≥ 10 contam). */
function polivalencia(st: PlayerStore, lado: Lado): number {
  const o = lado.escolha.onze;
  let s = 0, n = 0;
  for (const j of o.jogadores) {
    const nat = st.posNat[j];
    if (nat === IDX_POS.GR) continue;
    let k2 = 0;
    for (let p = 0; p < N_POS; p++) if (p !== nat && p !== IDX_POS.GR && st.fam[j * N_POS + p] >= FAMILIARIDADE.competente + 4) k2++;
    s += Math.min(4, k2); n++;
  }
  return n ? s / n : 0; // 0–4 posições extra à vontade
}

export function estiloDe(perfil: string | undefined): IdEstilo | null {
  return perfil && perfil in ESTILO_POR_ID ? (perfil as IdEstilo) : null;
}

/** Adequação: média dos atributos valorizados (ponderada) − média geral de campo do onze; ±EF.adequacao_max a 3 pontos. */
export function adequacaoEstilo(st: PlayerStore, lado: Lado, estilo: IdEstilo): number {
  const e = ESTILO_POR_ID[estilo];
  let s = 0, pt = 0;
  for (const v of e.valorizados) { s += v.peso * mediaSector(st, lado, 'equipa', v.atributos); pt += v.peso; }
  const geral = mediaSector(st, lado, 'equipa', ['tec', 'pas', 'dec', 'pos', 'vel', 'res', 'for', 'det', 'teq', 'con', 'des', 'fin']);
  let d = s / pt - geral;
  if (e.polivalencia) d += (polivalencia(st, lado) - 1.2) * 0.8;
  return clamp(d / 3, -1, 1) * EF.adequacao_max;
}

/** Duelo de uma neutralização: média do que o neutralizador precisa − média do que o alvo tem para resistir (pontos 1–20). */
function duelo(st: PlayerStore, alvo: Lado, por: Lado, n: (typeof NEUTRALIZACOES)[number]): number {
  const m = (lado: Lado, gs: typeof n.precisa) => gs.reduce((s, g) => s + mediaSector(st, lado, g.sector, g.atributos), 0) / gs.length;
  return m(por, n.precisa) - m(alvo, n.resiste);
}

/** Perda (0…EF.neutralizacao_max) do alvo face ao adversário. Pares mútuos: só perde quem perde o duelo. */
export function perdaNeutralizacao(st: PlayerStore, alvo: Lado, ea: IdEstilo, adv: Lado, eb: IdEstilo): number {
  const n = NEUTRALIZACOES.find((x) => x.alvo === ea && x.por === eb);
  if (!n) return 0;
  const d = duelo(st, alvo, adv, n);
  const mutuo = PARES_MUTUOS.some(([a, b]) => (a === ea && b === eb) || (a === eb && b === ea));
  if (mutuo) {
    const inv = NEUTRALIZACOES.find((x) => x.alvo === eb && x.por === ea);
    const dInv = inv ? duelo(st, adv, alvo, inv) : 0;
    const liquido = d - dInv;
    return liquido <= 0 ? 0 : EF.neutralizacao_max * clamp(liquido / EF.duelo_saturacao, 0, 1);
  }
  return EF.neutralizacao_max * clamp(0.5 + d / (2 * EF.duelo_saturacao), 0, 1);
}

/** Bolas paradas contra o Catenaccio (neutralização especial "por bolas paradas"): perda pelo duelo de bolas paradas. */
function perdaBolasParadas(st: PlayerStore, alvo: Lado, adv: Lado): number {
  const n = NEUTRALIZACOES.find((x) => x.alvo === 'catenaccio' && x.por === 'bolas_paradas')!;
  const d = duelo(st, alvo, adv, n);
  return d > 0 ? 0.5 * EF.neutralizacao_max * clamp(d / EF.duelo_saturacao, 0, 1) : 0;
}

/** Divide uma perda pelo ataque e pela defesa conforme o peso dos ratings do ponto forte nos índices. */
function partilha(estilo: IdEstilo): [number, number] {
  let a = 0, d = 0;
  for (const r of ESTILO_POR_ID[estilo].forte) { a += INDICE_ATAQUE[r] ?? 0; d += INDICE_DEFESA[r] ?? 0; }
  const t = a + d || 1;
  return [a / t, d / t];
}

/** Aplica os estilos aos dois lados de um jogo (multiplica as forças). Devolve as parcelas para análise. */
export function aplicarEstilos(st: PlayerStore, casa: Lado, fora: Lado, ec: IdEstilo | null, ef: IdEstilo | null) {
  const out = { adeq: [0, 0], perda: [0, 0] };
  const lados: [Lado, IdEstilo | null, Lado, IdEstilo | null, number][] = [[casa, ec, fora, ef, 0], [fora, ef, casa, ec, 1]];
  for (const [l, e, adv, eadv, i] of lados) {
    if (!e) continue;
    const ad = adequacaoEstilo(st, l, e);
    let perda = eadv ? perdaNeutralizacao(st, l, e, adv, eadv) : 0;
    if (e === 'catenaccio') perda = Math.max(perda, perdaBolasParadas(st, l, adv));
    const [pa, pd] = partilha(e);
    l.forcaAtaque *= (1 + ad) * (1 - perda * pa);
    l.forcaDefesa *= (1 + ad) * (1 - perda * pd);
    out.adeq[i] = ad; out.perda[i] = perda;
  }
  return out;
}
