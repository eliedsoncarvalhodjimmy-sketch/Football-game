// Prémios individuais anuais (config/premios.ts): Melhor do Mundo (Bola de Ouro), Golden Boy (Troféu Kopa: melhor sub-21)
// e Melhor guarda-redes. Calculados a 29 de Julho com a janela de avaliação (1 de Agosto a 28 de Julho; Prompt 8, Bloco A),
// com a pontuação do config e um ruído de "votação" determinístico; o vencedor entra no histórico (HistoricoMundo).
import { Rng } from '../core/rng.ts';
import { POSICOES } from '../config/papeis.ts';
import { PONTUACAO as PT, FINALISTAS, ELEGIBILIDADE as EL, GOLDEN_BOY, CALENDARIO_PREMIOS as CAL, CATEGORIAS, CATEGORIA_CONTINENTAL } from '../config/premios.ts';
import { IDX_CAT } from './janela.ts';
import type { World } from '../engine/world.ts';
import type { RegistoEpoca } from '../engine/history.ts';

const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };

export interface Candidato { idx: number; jogador: string; clube: string; clubeIdx: number; pontos: number }
export type IdPremio = 'melhor_do_mundo' | 'golden_boy' | 'guarda_redes';

/** Um título colectivo da janela: categoria da competição, clube vencedor e peso. */
export interface TituloJanela { cat: number; clube: number; peso: number }

/** Títulos colectivos dos registos de época cujo fecho cai na janela (`regs`), com os pesos do config. */
export function titulosDaJanela(regs: RegistoEpoca[]): TituloJanela[] {
  const out: TituloJanela[] = [];
  for (const reg of regs) {
    for (const c of Object.values(reg.campeoes)) out.push({ cat: IDX_CAT.liga, clube: c, peso: PT.titulos.liga });
    for (const t of Object.values(reg.tacas)) if (t.vencedor !== undefined && t.vencedor >= 0) out.push({ cat: IDX_CAT.taca, clube: t.vencedor, peso: PT.titulos.taca });
    for (const [id, x] of Object.entries(reg.continentais)) { const cat = CATEGORIA_CONTINENTAL[id] ?? 'continental_3'; out.push({ cat: IDX_CAT[cat], clube: x.vencedor, peso: PT.titulos[cat] ?? 0 }); }
  }
  return out;
}

/** Pontuação e classificação dos três prémios, com as estatísticas da janela (1 de Agosto a 28 de Julho), somadas entre
 *  clubes, e os títulos repartidos pelos minutos que o jogador jogou nessa competição com o clube vencedor.
 *  `null` se a janela não estiver completa (não se inventa). */
export function calcularPremios(w: World, titulos: TituloJanela[], ano: number): Record<IdPremio, Candidato[]> | null {
  const st = w.jogadores!, jp = w.janelaPremios;
  const inicio = Math.floor(Date.UTC(ano - 1, CAL.inicio.mes - 1, CAL.inicio.dia) / 864e5);
  if (!jp || jp.inicio < 0 || jp.inicio > inicio) return null;
  const rng = Rng.de(w.semente, 'premios', ano);
  const pesoTitulo = new Map<string, number>();
  for (const t of titulos) pesoTitulo.set(`${t.cat}|${t.clube}`, (pesoTitulo.get(`${t.cat}|${t.clube}`) ?? 0) + t.peso);
  const out: Record<IdPremio, Candidato[]> = { melhor_do_mundo: [], golden_boy: [], guarda_redes: [] };
  for (let j = 0; j < st.n; j++) {
    const jogos = st.wJogos[j];
    if (jogos < Math.min(EL.jogos_minimos, EL.jogos_minimos_golden_boy)) continue;
    const c = st.clube[j];
    if (c < 0) continue;
    const g = GRUPO[POSICOES[st.posNat[j]]] ?? 'MED';
    const nota = st.wNotas[j] / jogos / 10;
    // Títulos: pelas passagens do jogador por clubes na janela, categoria a categoria.
    let tit = 0;
    for (let k = 0; k < 2; k++) {
      const cl = st.wClube[j * 2 + k];
      if (cl < 0) continue;
      for (let cat = 0; cat < CATEGORIAS.length; cat++) { const p = pesoTitulo.get(`${cat}|${cl}`); if (p) tit += p * jp.participacao(j, cat, cl); }
    }
    const forcaLiga = w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.forca_desportiva : 0;
    // "Nome" do jogador: estrelas (OVR alto) são mais conhecidas dos votantes.
    const fama = Math.max(0, Math.min(100, (st.ovrNat(j) - 55) * 2.6));
    let p = PT.nota_media * nota + PT.golo[g] * st.wGolos[j] + PT.assistencia[g] * st.wAssist[j] + tit + PT.reputacao * fama + PT.forca_liga * forcaLiga;
    if (g === 'GR') p += PT.jogo_sem_sofrer * st.wSemSofrer[j] + PT.defesa_decisiva * st.wPenaltisDefendidos[j];
    p += rng.normal(0, PT.ruido);
    const cand: Candidato = { idx: j, jogador: st.nomes[j], clube: w.clubes[c].nome, clubeIdx: c, pontos: Math.round(p * 10) / 10 };
    if (jogos >= EL.jogos_minimos) out.melhor_do_mundo.push(cand);
    if (g === 'GR' && jogos >= EL.jogos_minimos_gr) out.guarda_redes.push(cand);
    if (st.idade(j, inicio) <= GOLDEN_BOY.idade_maxima && jogos >= EL.jogos_minimos_golden_boy) out.golden_boy.push(cand);
  }
  for (const k of Object.keys(out) as IdPremio[]) out[k] = out[k].sort((a, b) => b.pontos - a.pontos || a.idx - b.idx).slice(0, FINALISTAS[k]);
  return out;
}

/** Atribui os prémios do ano `ano` (cerimónia a 30 de Julho; janela de 1/8 de ano − 1 a 28/7 de ano) e regista-os no
 *  histórico. Com a janela incompleta não atribui nada e devolve o aviso. */
export function atribuirPremios(w: World, regs: RegistoEpoca[], ano: number): string | null {
  if (!w.jogadores || !w.historico) return null;
  const res = calcularPremios(w, titulosDaJanela(regs), ano);
  if (!res) return `Prémios ${ano}: janela de avaliação incompleta (não abriu a 1 de Agosto de ${ano - 1}); não há prémios este ano.`;
  for (const k of Object.keys(res) as IdPremio[]) {
    const v = res[k][0];
    if (!v) continue;
    w.historico.registarPremio({
      ano, premio: k, jogador: v.jogador, clube: v.clube, nota: '', fonte: 'jogo', idx: v.idx,
      finalistas: res[k].map((x) => ({ jogador: x.jogador, clube: x.clube, pontos: x.pontos, idx: x.idx })),
    });
  }
  return null;
}
