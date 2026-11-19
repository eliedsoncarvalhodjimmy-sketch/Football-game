// Prémios individuais anuais (config/premios.ts): Melhor do Mundo (Bola de Ouro), Golden Boy (Troféu Kopa: melhor sub-21)
// e Melhor guarda-redes. Calculados no fecho da época de Agosto–Maio (antes de se zerarem as estatísticas), com a
// pontuação do config e um ruído de "votação" determinístico; o vencedor entra no histórico (HistoricoMundo).
import { Rng } from '../core/rng.ts';
import { POSICOES } from '../config/papeis.ts';
import { PONTUACAO as PT, FINALISTAS, ELEGIBILIDADE as EL, GOLDEN_BOY } from '../config/premios.ts';
import type { World } from '../engine/world.ts';
import type { RegistoEpoca } from '../engine/history.ts';

const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };
/** Competições continentais por categoria (1 = a principal de cada confederação). */
const CATEGORIA_CONTINENTAL: Record<string, string> = { UCL: 'continental_1', CLI: 'continental_1', ACLE: 'continental_1', UEL: 'continental_2', UECL: 'continental_3' };

export interface Candidato { idx: number; jogador: string; clube: string; clubeIdx: number; pontos: number }
export type IdPremio = 'melhor_do_mundo' | 'golden_boy' | 'guarda_redes';

/** Pontuação e classificação dos três prémios da época que fecha (`reg`), em `dia` (fim da época). */
export function calcularPremios(w: World, reg: RegistoEpoca, dia: number): Record<IdPremio, Candidato[]> {
  const st = w.jogadores!;
  const rng = Rng.de(w.semente, 'premios', reg.epoca);
  // Títulos colectivos da época, por clube.
  const titulos = new Map<number, number>();
  const somar = (c: number | undefined, v: number) => { if (c !== undefined && c >= 0) titulos.set(c, (titulos.get(c) ?? 0) + v); };
  for (const c of Object.values(reg.campeoes)) somar(c, PT.titulos.liga);
  for (const t of Object.values(reg.tacas)) somar(t.vencedor, PT.titulos.taca);
  for (const [id, x] of Object.entries(reg.continentais)) somar(x.vencedor, PT.titulos[CATEGORIA_CONTINENTAL[id] ?? 'continental_3'] ?? 0);
  const inicio = Math.floor(Date.UTC(reg.epoca, 7, 1) / 864e5);
  const out: Record<IdPremio, Candidato[]> = { melhor_do_mundo: [], golden_boy: [], guarda_redes: [] };
  for (let c = 0; c < w.clubes.length; c++) {
    const l = w.liga[c];
    if (l < 0) continue;
    const forcaLiga = w.ligas[l].regras.forca_desportiva;
    for (const j of w.plantel[c] ?? []) {
      if (st.clube[j] !== c) continue;
      const jogos = st.eJogos[j];
      if (jogos < Math.min(EL.jogos_minimos, EL.jogos_minimos_golden_boy)) continue;
      const g = GRUPO[POSICOES[st.posNat[j]]] ?? 'MED';
      const nota = st.eNotas[j] / jogos / 10;
      const participacao = Math.min(1, st.eMinutos[j] / (90 * Math.max(1, jogos)));
      // "Nome" do jogador: estrelas (OVR alto) são mais conhecidas dos votantes.
      const fama = Math.max(0, Math.min(100, (st.ovrNat(j) - 55) * 2.6));
      let p = PT.nota_media * nota + PT.golo[g] * st.eGolos[j] + PT.assistencia[g] * st.eAssist[j]
        + (titulos.get(c) ?? 0) * participacao + PT.reputacao * fama + PT.forca_liga * forcaLiga;
      if (g === 'GR') {
        // Jogos sem sofrer estimados pela média de golos sofridos (probabilidade de zero num Poisson).
        const semSofrer = jogos * Math.exp(-st.eSofridos[j] / jogos);
        p += PT.jogo_sem_sofrer * semSofrer;
      }
      p += rng.normal(0, PT.ruido);
      const cand: Candidato = { idx: j, jogador: st.nomes[j], clube: w.clubes[c].nome, clubeIdx: c, pontos: Math.round(p * 10) / 10 };
      if (jogos >= EL.jogos_minimos) out.melhor_do_mundo.push(cand);
      if (g === 'GR' && jogos >= EL.jogos_minimos_gr) out.guarda_redes.push(cand);
      if (st.idade(j, inicio) <= GOLDEN_BOY.idade_maxima && jogos >= EL.jogos_minimos_golden_boy) out.golden_boy.push(cand);
    }
  }
  for (const k of Object.keys(out) as IdPremio[]) out[k] = out[k].sort((a, b) => b.pontos - a.pontos || a.idx - b.idx).slice(0, FINALISTAS[k]);
  return out;
}

/** Atribui os prémios da época e regista-os no histórico (ano da cerimónia = ano em que a época acaba). */
export function atribuirPremios(w: World, reg: RegistoEpoca, dia: number) {
  if (!w.jogadores || !w.historico) return;
  const res = calcularPremios(w, reg, dia);
  const ano = reg.epoca + 1;
  for (const k of Object.keys(res) as IdPremio[]) {
    const v = res[k][0];
    if (!v) continue;
    w.historico.registarPremio({
      ano, premio: k, jogador: v.jogador, clube: v.clube, nota: '', fonte: 'jogo', idx: v.idx,
      finalistas: res[k].map((x) => ({ jogador: x.jogador, clube: x.clube, pontos: x.pontos, idx: x.idx })),
    });
  }
}
