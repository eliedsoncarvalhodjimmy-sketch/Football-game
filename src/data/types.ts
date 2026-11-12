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
  taca: string | null;
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

export interface RegrasLiga {
  id: string;
  nome: string;
  tipo: 'liga';
  pais: string | null;
  nivel: number;
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
    maximo_estrangeiros: number | null;
    minimo_formados_no_clube: number | null;
    por_validar: boolean;
  };
  tv: { total_milhoes_eur: number | null; por_posicao: number[]; paraquedas: number[]; por_validar: boolean };
  premios: { posicao: number; valor_eur: number }[];
  fair_play: { massa_salarial_max_receita: number; sancoes: string[] };
  licenciamento: { exigido: boolean; notas: string } | null;
}

export interface RegrasTaca {
  id: string;
  nome: string;
  tipo: 'taca';
  pais: string;
  /** Ronda (1 = primeira) em que cada nível da pirâmide entra. */
  entrada_por_nivel: Record<string, number>;
  jogo_unico: true;
  final_neutra: boolean;
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
  taca: RegrasTaca | null;
  clubes: Clube[];
  overrides: Record<string, Partial<Clube>>;
}
