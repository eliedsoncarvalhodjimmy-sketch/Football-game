// Motor 2D táctico (docs/tactics/MOTOR_2D.md): tipos. Lógica pura, sem DOM.
import type { IdAtributo } from '../../config/atributos.ts';
import type { IdEstilo } from '../../config/estilos.ts';

export type Equipa = 0 | 1;
export interface V2 { x: number; y: number }

/** Fases do jogo (secção 3). */
export type Fase = 'ATQ_CONSTRUCAO' | 'ATQ_CRIACAO' | 'ATQ_FINALIZACAO' | 'TRANS_ATQ_DEF' | 'DEF_ORGANIZADA' | 'TRANS_DEF_ATQ' | 'BOLA_PARADA';

/** Acções sem bola (catálogo fechado, secção 6.1). Na Fase 1 só se usam MANTER_POSICAO e RECUPERAR. */
export type AccaoSemBola = 'MANTER_POSICAO' | 'OFERECER_APOIO' | 'DAR_LARGURA' | 'ATACAR_PROFUNDIDADE' | 'APOIO_FRONTAL' | 'SOBREPOSICAO'
  | 'OCUPAR_AREA' | 'EQUILIBRIO_DEFENSIVO' | 'PRESSIONAR' | 'COBRIR' | 'FECHAR_LINHA_PASSE' | 'MARCAR' | 'RECUPERAR';

export type Intensidade = 'andar' | 'trote' | 'corrida' | 'sprint';

export interface JogadorBase2D { id: string; nome: string; numero: number; pos: string; papel: string; attrs: Partial<Record<IdAtributo, number>> }

export interface Jogador2D extends JogadorBase2D {
  equipa: Equipa;
  /** Índice do lugar na formação e o nome do lugar (chave do documento). */
  lugar: number;
  chave: string;
  /** Posição e velocidade em metros, no referencial absoluto (o da equipa 0). */
  p: V2;
  v: V2;
  /** Para onde o corpo está virado (rad, absoluto). */
  corpo: number;
  accao: AccaoSemBola;
  accaoDesde: number;
  intensidade: Intensidade;
  /** Âncora actual (absoluta) e a do tick anterior (para a velocidade da âncora). */
  ancora: V2;
  ancoraAntes: V2;
}

/** Bloco da equipa (secção 4.1), no referencial da equipa. */
export interface Bloco { linhaDefX: number; comprimento: number; largura: number; centroY: number }

export interface EstadoEquipa {
  nome: string;
  estilo: IdEstilo;
  formacao: string;
  fase: Fase;
  faseDesde: number;
  /** Bloco actual (filtrado) e o alvo (recalculado a 5 Hz). */
  bloco: Bloco;
  alvo: Bloco;
  /** Mistura das formas: 0 = sem bola, 1 = com bola (transição gradual). */
  mistura: number;
}

export interface Estado2D {
  tick: number;
  bola: { p: V2; z: number; v: V2 };
  posse: Equipa;
  equipas: [EstadoEquipa, EstadoEquipa];
  jogadores: Jogador2D[];
}
