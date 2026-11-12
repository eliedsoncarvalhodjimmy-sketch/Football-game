// Histórico compacto. Guardado para sempre: classificações, campeões,
// movimentos, taças, continentais e estatísticas por época. O detalhe dos
// jogos é empacotado em arrays tipados e podado segundo config/retencao.
import type { LinhaTabela } from './competitions/table.ts';
import type { Estatisticas } from './season/temporada.ts';
import type { Qualificado } from './world.ts';
import type { JogoR } from './competitions/base.ts';
import { RETENCAO } from '../config/retencao.ts';

export interface Movimento {
  clube: number;
  de: string; // liga ou "exterior"
  para: string; // liga ou "exterior"
  via: 'directa' | 'playoff' | 'barragem' | 'exterior';
}

export interface ResultadoMataMata {
  vencedor: number;
  finalista: number;
  final: string; // "2-1", "1-1 (a.p.) 4-3 g.p."
}

export interface RegistoContinental extends ResultadoMataMata {
  /** Fase alcançada por clube. */
  fases: Record<number, string>;
  /** Classificação da fase de liga (UEFA) ou dos grupos. */
  tabela: LinhaTabela[][];
  qualificados: Qualificado[];
}

export interface RegistoEpoca {
  epoca: number;
  tabelas: Record<string, LinhaTabela[]>;
  campeoes: Record<string, number>;
  playoffsCampeao: Record<string, ResultadoMataMata>;
  playoffsSubida: Record<string, ResultadoMataMata & { participantes: number[] }>;
  barragens: Record<string, ResultadoMataMata & { participantes: number[] }>;
  movimentos: Movimento[];
  tacas: Record<string, ResultadoMataMata>;
  continentais: Record<string, RegistoContinental>;
  qualificadosProxima: Record<string, Qualificado[]>;
  /** Reputação no fim da época (antes da actualização) e depois. */
  repAntes: number[];
  repDepois: number[];
  estatLiga: Estatisticas;
  /** Impressão digital de todos os resultados da época (calculada antes da poda). */
  impressao: number;
  /** Jogos empacotados: [comp, semana*8+dia, casa, fora, gc, gf, flags] por jogo. */
  jogos: { comps: string[]; dados: Int32Array } | null;
}

export const CAMPOS_JOGO = 7;

export function empacotarJogos(jogos: JogoR[]): { comps: string[]; dados: Int32Array } {
  const comps: string[] = [];
  const idx = new Map<string, number>();
  const d = new Int32Array(jogos.length * CAMPOS_JOGO);
  jogos.forEach((j, k) => {
    if (!idx.has(j.comp)) { idx.set(j.comp, comps.length); comps.push(j.comp); }
    const r = j.r!;
    const flags = (j.neutro ? 1 : 0) | (r.prol ? 2 : 0) | (r.pen ? 4 : 0) | ((r.pen?.[0] ?? 0) << 4) | ((r.pen?.[1] ?? 0) << 8);
    d.set([idx.get(j.comp)!, j.semana * 8 + j.dia, j.casa, j.fora, r.gc, r.gf, flags], k * CAMPOS_JOGO);
  });
  return { comps, dados: d };
}

/** Remove o detalhe dos jogos de épocas antigas, excepto ligas principais e continentais. */
export function podar(historico: RegistoEpoca[], epocaActual: number, principais = RETENCAO.ligas_principais) {
  for (const r of historico) {
    if (!r.jogos || epocaActual - r.epoca < RETENCAO.epocas_detalhe_completo) continue;
    const manter = new Set(r.jogos.comps.map((c, i) => [c, i] as const)
      .filter(([c]) => principais.some((p) => c === p || c.startsWith(p + '_')) || (RETENCAO.continentais_sempre && /^(uefa_|libertadores|afc_)/.test(c)))
      .map(([, i]) => i));
    const d = r.jogos.dados;
    const out: number[] = [];
    for (let k = 0; k < d.length; k += CAMPOS_JOGO) if (manter.has(d[k])) for (let x = 0; x < CAMPOS_JOGO; x++) out.push(d[k + x]);
    r.jogos = { comps: r.jogos.comps, dados: Int32Array.from(out) };
  }
}

export function textoResultado(j: JogoR | null): string {
  if (!j?.r) return '';
  let t = `${j.r.gc}-${j.r.gf}`;
  if (j.ida) t = `1.ª mão ${j.ida.r!.gc}-${j.ida.r!.gf}, 2.ª mão ${t}`;
  if (j.r.prol) t += ' (a.p.)';
  if (j.r.pen) t += ` ${j.r.pen[0]}-${j.r.pen[1]} g.p.`;
  return t;
}
