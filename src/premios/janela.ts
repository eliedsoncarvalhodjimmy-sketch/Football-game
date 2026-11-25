// Prompt 8, Bloco A: a janela dos prémios. Período único de 1 de Agosto a 28 de Julho para todas as ligas, com as
// estatísticas de cada jogador somadas entre clubes (contadores w* do store), separadas das estatísticas da época (que se
// zeram na passagem de época). Guarda também os jogos de cada clube por categoria de competição, para repartir os títulos
// pelos minutos que cada jogador jogou nessa competição com esse clube.
import { CATEGORIAS, CATEGORIA_CONTINENTAL, ESTATISTICAS_JANELA as EJ, type Categoria } from '../config/premios.ts';
import type { World } from '../engine/world.ts';

export const IDX_CAT = Object.fromEntries(CATEGORIAS.map((c, k) => [c, k])) as Record<Categoria, number>;

export class JanelaPremios {
  /** Dia em que a janela abriu (1 de Agosto); −1 = ainda não abriu (o cálculo diz "janela incompleta"). */
  inicio = -1;
  /** Jogos de cada clube por categoria na janela (chave `${categoria}|${clube}`). */
  jogos = new Map<string, number>();
  /** Os 5 maiores (por reputação) de cada liga, para os "jogos grandes" (recalculados ao abrir a janela). */
  private topo = new Map<string, Set<number>>();

  constructor(private w: World) {}

  abrir(dia: number) {
    this.inicio = dia;
    this.jogos.clear();
    this.topo.clear();
    this.w.jogadores?.zerarJanela();
  }

  /** Categoria de uma competição (pelo id): liga, taça, continental 1–3 ou outra. */
  categoria(comp: string, tipo: 'liga' | 'taca' | 'continental' | 'outra'): number {
    if (tipo === 'liga') return IDX_CAT.liga;
    if (tipo === 'taca') return IDX_CAT.taca;
    if (tipo === 'continental') return IDX_CAT[CATEGORIA_CONTINENTAL[comp] ?? 'continental_3'];
    return IDX_CAT.outra;
  }

  /** Jogo grande: eliminatória decisiva ou final, ou jogo de liga entre dois dos maiores da liga. */
  grande(comp: string, tipo: string, casa: number, fora: number, decisivo: boolean): boolean {
    if (decisivo) return true;
    if (tipo !== 'liga') return false;
    let t = this.topo.get(comp);
    if (!t) {
      const L = this.w.ligas.find((l) => l.regras.id === comp);
      t = new Set(L ? [...L.clubes].sort((a, b) => this.w.reputacao[b] - this.w.reputacao[a]).slice(0, EJ.top) : []);
      this.topo.set(comp, t);
    }
    return t.has(casa) && t.has(fora);
  }

  contarJogo(cat: number, clube: number) {
    const k = `${cat}|${clube}`;
    this.jogos.set(k, (this.jogos.get(k) ?? 0) + 1);
  }

  /** Parte de um jogador num título (categoria, clube): minutos com esse clube nessa categoria ÷ minutos possíveis. */
  participacao(j: number, cat: number, clube: number): number {
    const st = this.w.jogadores!;
    const jogos = this.jogos.get(`${cat}|${clube}`) ?? 0;
    if (!jogos) return 0;
    let min = 0;
    for (let k = 0; k < 2; k++) if (st.wClube[j * 2 + k] === clube) min += st.wMinCat[(j * 2 + k) * CATEGORIAS.length + cat];
    return Math.min(1, min / (90 * jogos));
  }
}

/** Passagem do jogador pelo clube na janela (0 ou 1; um 3.º clube junta-se à 2.ª passagem). */
export function passagem(w: World, j: number, clube: number): number {
  const st = w.jogadores!, b = j * 2;
  if (st.wClube[b] === clube || st.wClube[b] === -1) { st.wClube[b] = clube; return 0; }
  st.wClube[b + 1] = clube;
  return 1;
}
