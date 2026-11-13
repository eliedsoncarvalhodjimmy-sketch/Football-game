// players.csv por pacote: exportar os jogadores e reimportar edições.
// Princípio dos pacotes: manual > real > gerado. Ao reimportar, uma linha com
// origem "manual" ou "real", ou que difira do que o gerador produz, sobrepõe-se ao
// gerado (e fica marcada "manual" se a origem dizia "gerado").
import { ATRIBUTOS, OCULTOS, N_ATR, N_OCU } from '../config/atributos.ts';
import { PAPEIS, IDX_PAPEL, POSICOES, IDX_POS, N_POS, type Posicao } from '../config/papeis.ts';
import { toCsv } from '../data/csv.ts';
import { isoDias } from '../engine/calendar/datas.ts';
import { ORIGEM_JOGADOR, type PlayerStore } from './store.ts';
import type { World } from '../engine/world.ts';

export const CABECALHO_JOGADORES = [
  'id', 'nome', 'data_nascimento', 'pais_formacao', 'clube', 'posicao', 'papel', 'pe', 'potencial',
  ...ATRIBUTOS.map((a) => a.id), ...OCULTOS.map((o) => o.id), 'origem',
];
const PES = ['direito', 'esquerdo', 'ambos'];

const diaDe = (iso: string) => Math.round(new Date(`${iso}T00:00:00Z`).getTime() / 86400000);

export function linhaJogador(w: World, st: PlayerStore, i: number): (string | number)[] {
  return [
    st.ids[i], st.nomes[i], isoDias(st.nasc[i]), st.paises[st.pais[i]], st.clube[i] >= 0 ? w.clubes[st.clube[i]].id : '',
    POSICOES[st.posNat[i]], PAPEIS[st.papelPref[i]].id, PES[st.pe[i]], st.pot[i],
    ...Array.from(st.atr.subarray(i * N_ATR, (i + 1) * N_ATR)), ...Array.from(st.ocu.subarray(i * N_OCU, (i + 1) * N_OCU)),
    ORIGEM_JOGADOR[st.origem[i]],
  ];
}

/** CSV dos jogadores dos clubes de um pacote. */
export function exportarPacote(w: World, st: PlayerStore, pacote: string): string {
  const p = w.pacotes.find((x) => x.manifest.id === pacote);
  if (!p) throw new Error(`pacote desconhecido: ${pacote}`);
  const clubes = new Set(p.ligas.flatMap((li) => w.ligas[li].clubes));
  const linhas: (string | number)[][] = [];
  for (const c of clubes) for (const j of w.plantel[c]) linhas.push(linhaJogador(w, st, j));
  return toCsv(CABECALHO_JOGADORES, linhas);
}

/**
 * Aplica as linhas de players.csv. Devolve quantos jogadores foram sobrepostos e criados.
 * `rows` vem do parser CSV (cabeçalho → valor).
 */
export function importarLinhas(w: World, st: PlayerStore, rows: Record<string, string>[]): { sobrepostos: number; criados: number; erros: string[] } {
  let sobrepostos = 0, criados = 0;
  const erros: string[] = [];
  for (const r of rows) {
    if (!r.id) { erros.push('linha sem id'); continue; }
    const pos = r.posicao as Posicao;
    if (!(pos in IDX_POS)) { erros.push(`${r.id}: posição inválida "${r.posicao}"`); continue; }
    let i = st.idx(r.id);
    const atual = i !== undefined ? linhaJogador(w, st, i).map(String) : null;
    const nova = CABECALHO_JOGADORES.map((h) => r[h] ?? '');
    const difere = !atual || nova.some((v, k) => CABECALHO_JOGADORES[k] !== 'origem' && v !== '' && v !== atual[k]);
    const origem = r.origem === 'real' ? 1 : r.origem === 'manual' ? 2 : difere ? 2 : 0;
    if (origem === 0) continue; // igual ao gerado
    const clube = r.clube ? w.clubes.findIndex((c) => c.id === r.clube) : -1;
    if (r.clube && clube < 0) { erros.push(`${r.id}: clube desconhecido "${r.clube}"`); continue; }
    if (i === undefined) { i = st.novo(r.id, r.nome || r.id, r.pais_formacao || 'ENG'); criados++; if (clube >= 0) w.plantel[clube].push(i); }
    else {
      sobrepostos++;
      if (clube >= 0 && clube !== st.clube[i]) {
        if (st.clube[i] >= 0) w.plantel[st.clube[i]] = w.plantel[st.clube[i]].filter((x) => x !== i);
        w.plantel[clube].push(i);
      }
    }
    if (r.nome) st.nomes[i] = r.nome;
    if (r.pais_formacao) st.pais[i] = st.codigoPais(r.pais_formacao);
    if (r.data_nascimento) st.nasc[i] = diaDe(r.data_nascimento);
    st.clube[i] = clube;
    st.posNat[i] = IDX_POS[pos];
    if (r.papel && r.papel in IDX_PAPEL) st.papelPref[i] = IDX_PAPEL[r.papel];
    if (r.pe) st.pe[i] = Math.max(0, PES.indexOf(r.pe));
    ATRIBUTOS.forEach((a, k) => { if (r[a.id]) st.atr[i! * N_ATR + k] = Math.max(1, Math.min(20, Number(r[a.id]))); });
    OCULTOS.forEach((o, k) => { if (r[o.id]) st.ocu[i! * N_OCU + k] = Math.max(1, Math.min(20, Number(r[o.id]))); });
    if (st.fam[i * N_POS + IDX_POS[pos]] < 18) st.fam[i * N_POS + IDX_POS[pos]] = 20;
    st.origem[i] = origem;
    st.recalcular(i);
    st.pot[i] = Math.max(st.ovrNat(i), Number(r.potencial) || st.pot[i]);
  }
  return { sobrepostos, criados, erros };
}
