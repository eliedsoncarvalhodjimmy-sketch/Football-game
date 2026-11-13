// Tipos dos registos dos pacotes de dados. O motor só conhece estes tipos,
// nunca clubes ou ligas concretos.

export type Origem = 'real' | 'gerado' | 'teste' | 'manual';
export type Confederacao = 'UEFA' | 'CONMEBOL' | 'AFC' | 'CONCACAF' | 'CAF';

export interface Manifest {
  id: string;
  nome: string;
  tipo: 'pais' | 'regional';
  /** Código do país (3 letras). Nulo em pacotes regionais. */
  pais: string | null;
  confederacao: Confederacao;
  versao: string;
  /** Ids das ligas, do nível 1 para baixo. */
  piramide: string[];
  /** Taças nacionais do pacote (a principal primeiro). */
  tacas: string[];
  /** Perfil de nomes usado pelo gerador (por país). */
  perfil_nomes: string;
  /** Só pacotes regionais: quantos clubes de cada país. */
  quotas_paises?: Record<string, number>;
  activo: boolean;
}

export type Desempate =
  | 'pontos'
  | 'dg'
  | 'gm'
  | 'vitorias'
  | 'confronto_directo'
  | 'sorteio';

export interface PlayoffSubida {
  /** Posições que entram, inclusive. */
  de: number;
  ate: number;
  /** O vencedor sobe directamente ou vai à barragem com a divisão de cima. */
  destino: 'subida' | 'barragem';
}

export interface Barragem {
  /** Posição da liga de cima que joga a barragem. */
  posicao: number;
  /** Adversário da liga de baixo: vencedor do play-off ou uma posição. */
  adversario: 'playoff' | number;
  maos: 1 | 2;
}

/** Notas de origem por campo: "folha", "gerado: ...", "a obter", "decisão do utilizador ...". */
export type OrigemCampos = Record<string, string>;

export interface RegrasLiga {
  id: string;
  nome: string;
  tipo: 'liga';
  pais: string | null;
  nivel: number;
  /** Força desportiva da liga (0–100), calibrada pelo ranking UEFA. Separada do índice de riqueza. */
  forca_desportiva: number;
  /** A liga joga nos fins-de-semana das paragens de selecções (divisões inferiores). */
  jogam_nas_paragens?: boolean;
  /** Descida pela média de pontos das últimas N épocas (ex.: Colômbia). */
  descida_media_epocas?: number | null;
  /** Texto do formato com split/fase final (não implementado; ver config/formatos.ts). */
  split_folha?: string | null;
  /** Calendário indicado na folha ("ago-mai" ou "ano civil"); o jogo usa epoca.calendario. */
  calendario_folha?: string | null;
  vagas_continentais_folha?: number | null;
  tecto_salarial?: string | number | null;
  fonte?: string | null;
  notas?: string | null;
  origem_campos?: OrigemCampos;
  /** Campos vazios na folha (a obter). */
  a_obter?: string[];
  formato: {
    equipas: number;
    voltas: number;
    /** Play-off de campeão com os N primeiros (jogo único, final neutra). */
    playoff_campeao?: { equipas: number } | null;
  };
  subidas: { directas: number; playoff?: PlayoffSubida | null };
  descidas: { directas: number; barragem?: Barragem | null; exterior: boolean };
  desempates: Desempate[];
  epoca: { calendario: string };
  indice_riqueza: number;
  /** Parâmetros do gerador para esta liga (opcional; senão usa a fórmula em config/geracao). */
  geracao?: { rep_tecto: number; rep_piso: number } | null;
  // ---- Definidos, sem uso na Fase 1 ----
  janelas_transferencias: { abre: string; fecha: string }[];
  plantel: {
    max: number;
    minimo_nacionais: number | null;
    /** Valor da folha, guardado mas não usado (decisão do utilizador). */
    minimo_nacionais_folha?: number | null;
    maximo_estrangeiros: number | null;
    minimo_formados_no_clube: number | null;
    por_validar: boolean;
  };
  tv: {
    total_eur: number | null;
    pct_igual: number | null;
    pct_desempenho: number | null;
    pct_comercial: number | null;
    regra_desempenho: string | null;
    paraquedas: number[];
    por_validar: boolean;
  };
  premios: { posicao: number; valor_eur: number }[];
  fair_play: { massa_salarial_max_receita: number; sancoes: string[] };
  licenciamento: { exigido: boolean; notas: string } | null;
}

export interface Premio {
  fase: string;
  por_equipa_eur: number | null;
  por_vitoria_eur?: number | null;
  por_empate_eur?: number | null;
  fonte?: string | null;
  notas?: string | null;
}

export interface RegrasTaca {
  id: string;
  nome: string;
  tipo: 'taca';
  pais: string;
  /** Ligas que participam (todos os seus clubes). */
  participantes: string[];
  /** Ronda (1 = primeira) em que os clubes de cada liga entram. */
  entrada_por_liga: Record<string, number>;
  /** Mãos por ronda: rondas normais, meias-finais e final. */
  maos: { rondas: 1 | 2; meias: 1 | 2; final: 1 | 2 };
  final_neutra: boolean;
  /** Competição continental do vencedor (ex.: "UEL"), ou null. */
  vaga_vencedor: string | null;
  /** Taça secundária (ex.: taça da liga): joga nas semanas que a principal deixa livres. */
  secundaria: boolean;
  premios: Premio[];
  premio_total_eur?: number | null;
  fonte?: string | null;
  notas?: string | null;
  origem_campos?: OrigemCampos;
}

export interface Clube {
  id: string;
  nome: string;
  nome_curto: string;
  pais: string;
  cidade: string;
  cores: [string, string];
  reputacao: number;
  estadio: string;
  capacidade: number;
  /** Liga actual (id). */
  liga: string;
  rivais: string[];
  origem: Origem;
}

export interface Pacote {
  manifest: Manifest;
  ligas: RegrasLiga[];
  tacas: RegrasTaca[];
  clubes: Clube[];
  overrides: Record<string, Partial<Clube>>;
  /** Linhas de players.csv (manual > real > gerado). */
  jogadores?: Record<string, string>[];
  /** Linhas de financas.csv (Prompt 3): valores iniciais editáveis por clube. */
  financas?: Record<string, string>[];
  /** Linhas de estadios.csv e rivalidades.csv. */
  estadios?: Record<string, string>[];
  rivalidades?: Record<string, string>[];
  /** Linhas de donos.csv (Prompt 3, Bloco B). */
  donos?: Record<string, string>[];
  /** arquetipos.csv (clube, arquetipo) e staff.csv (Prompt 3, Bloco C). */
  arquetipos?: Record<string, string>[];
  staffCsv?: Record<string, string>[];
}
