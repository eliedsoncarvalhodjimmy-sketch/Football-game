// Calendário: 52 semanas por época, a contar da semana (segunda-feira) que
// contém o início da época (1 de Julho). Cada semana tem duas ranhuras:
// fim-de-semana (sábado/domingo) e meio da semana (terça a quinta).
// Valores aproximados; as janelas FIFA reais de 2026/27 estão por confirmar.

export type Ranhura = 'fds' | 'meio';

export interface ModeloCalendario {
  /** Dia (mês-dia) em que a época começa; a semana 0 é a segunda-feira dessa semana. */
  inicio: string;
  /** 1.ª e última semana com jornadas de liga ao fim-de-semana. */
  primeira_semana: number;
  ultima_semana: number;
  /** Fins-de-semana sem clubes (janelas de selecções). O meio da semana dessas semanas também fica livre. */
  paragens_selecoes: number[];
  /** Semanas de meio da semana reservadas às competições continentais. */
  continentais: {
    /** Play-offs de acesso UEFA (ida e volta), antes da fase de liga. */
    acesso: number[];
    fase_liga: number[];
    playoff: number[];
    oitavos: number[];
    quartos: number[];
    meias: number[];
    /** Semana das finais: Liga Europa e Conferência a meio da semana; Champions, Libertadores e Ásia no fim-de-semana. */
    final: number;
    grupos: number[]; // Libertadores e Ásia (6 jornadas)
    quartos_grupos: number[];
    meias_grupos: number[];
  };
  /** Fim-de-semana da final da taça principal (jogo único). As outras rondas usam as semanas de meio da semana livres. */
  final_taca: number;
  /** Fins-de-semana para play-offs de subida, barragens e play-off de campeão. */
  playoffs: number[];
}

export const CALENDARIO = {
  /** Dia (mês-dia) em que começa cada época. */
  inicio_epoca: '07-01',
  semanas_por_epoca: 52,
  dias: {
    fds: [5, 6], // sábado, domingo (0 = segunda)
    meio: [1, 2], // terça, quarta (liga e taça)
    continental: { UCL: [1, 2], UCL_PO: [1, 2], UEL: [3], UEL_PO: [3], UECL: [3], CLI: [1, 2], ACLE: [1, 2] } as Record<string, number[]>,
  },
  modelos: {
    ago_mai: {
      inicio: '07-01',
      primeira_semana: 5, // sábado 8 Ago 2026
      ultima_semana: 46, // sábado 22 Mai 2027
      paragens_selecoes: [10, 14, 19, 38],
      continentais: {
        acesso: [7, 8],
        fase_liga: [11, 13, 16, 18, 21, 23, 29, 30],
        playoff: [33, 34],
        oitavos: [36, 37],
        quartos: [40, 41],
        meias: [43, 44],
        final: 48,
        grupos: [11, 13, 16, 18, 21, 23],
        quartos_grupos: [33, 34],
        meias_grupos: [40, 41],
      },
      final_taca: 47,
      // Play-offs (subida, barragem, campeão) depois de todas as finais, para não haver choques.
      playoffs: [49, 50, 51],
    } as ModeloCalendario,
    // Ligas de ano civil (decisão do utilizador, 13/11/2026): Fevereiro–Novembro, play-offs em Dezembro.
    // Semana 0 = segunda-feira da semana de 1 de Janeiro. Sem competições UEFA; a Libertadores joga aqui.
    ano_civil: {
      inicio: '01-01',
      primeira_semana: 5, // sábado ~6 Fev
      ultima_semana: 46, // sábado ~20 Nov
      paragens_selecoes: [12, 23, 36, 41],
      continentais: {
        acesso: [],
        fase_liga: [],
        playoff: [],
        oitavos: [],
        quartos: [],
        meias: [],
        final: 48,
        grupos: [9, 11, 14, 16, 19, 21],
        quartos_grupos: [31, 32],
        meias_grupos: [39, 40],
      },
      final_taca: 47,
      playoffs: [49, 50, 51],
    } as ModeloCalendario,
  } as Record<string, ModeloCalendario>,
};
