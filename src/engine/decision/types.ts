// Tipos do motor de decisão (camada 1). Lógica pura: sem UI, sem dependências externas.
import type { IdAtributo } from '../../config/atributos.ts';
import type { IdEstilo } from '../../config/estilos.ts';
import type { Posicao } from '../../config/papeis.ts';
import type { TipoAvaliado } from '../../config/decisao.ts';

/** Posição no campo em metros (x ao longo do comprimento, y ao longo da largura). */
export interface Position { x: number; y: number }

export type Equipa = 0 | 1;

export interface PlayerState {
  id: string;
  team: Equipa;
  number: number;
  name: string;
  /** Posição natural (GR, DC, ...) e posição de base na formação (fracção 0–1 no meio-campo da própria equipa). */
  role: Posicao;
  /** Lugar na formação: x de 0 (própria baliza) a 1 (meio-campo adversário), y de 0 a 1 (largura). */
  slot: Position;
  pos: Position;
  vel: Position;
  /** Atributos 1–20 (os 39 do jogo). */
  attrs: Partial<Record<IdAtributo, number>>;
  /** Moral 0–100 e condição física 0–1. */
  morale: number;
  condition: number;
  yellow: boolean;
  /** Ordem do treinador para baixar a agressividade (após amarelo). */
  calmer?: boolean;
  /** Jogador em campo (falso depois de substituído ou expulso). */
  onPitch: boolean;
  /** Lesionado (força substituição). */
  injured?: boolean;
}

export interface BallState {
  pos: Position;
  /** Altura (m) — para a futura física 2.5D. */
  z: number;
  vel: Position;
  ownerId: string | null;
  /** Última equipa a tocar (para recuperação/perda). */
  lastTeam: Equipa;
}

/** Instruções da equipa (nível macro), decididas pelo treinador. */
export interface TeamTactic {
  style: IdEstilo;
  /** −2 muito defensiva … +2 muito ofensiva. */
  mentality: number;
  /** Altura da linha defensiva 0 (muito recuada) – 1 (muito subida). */
  defensiveLine: number;
  /** Largura 0 (estreita) – 1 (muito larga). */
  width: number;
  /** Intensidade da pressão 0–1. */
  pressing: number;
  /** Formação (id de src/config/tacticas.ts). */
  formation: string;
}

/** Estado do jogo visto pelo motor de decisão num tick. */
export interface MatchState {
  tick: number;
  /** Minuto de jogo (0–90+). */
  minute: number;
  score: [number, number];
  players: PlayerState[];
  ball: BallState;
  tactics: [TeamTactic, TeamTactic];
  /** Tick da última mudança de posse e a equipa que tem a posse. */
  possessionTeam: Equipa;
  possessionChangeTick: number;
  /** Último minuto com remate de cada equipa (seca de ocasiões). */
  lastShotMinute: [number, number];
}

/** Acção decidida (compatível com a futura física 2.5D: altura e rotação da bola). */
export interface Action {
  type: 'pass' | 'dribble' | 'shoot' | 'cross' | 'move' | 'press' | 'tackle' | 'mark';
  target?: Position;
  targetPlayerId?: string;
  power?: number;
  direction?: number;
  height?: 'ground' | 'low' | 'mid' | 'high';
  spin?: 'none' | 'lateral_left' | 'lateral_right' | 'backspin' | 'topspin';
  /** Detalhe interno: que opção da utilidade ganhou e a sua utilidade (para o relato e os testes). */
  option?: TipoAvaliado;
  utility?: number;
  /** Erro humano aplicado (0–0,5). */
  error?: number;
}

/** Uma opção avaliada: tipo, utilidade e a acção que resulta se for escolhida. */
export interface Opcao { tipo: TipoAvaliado; utilidade: number; action: Action }

/** Contexto de um jogador num tick (construído por ContextBuilder). */
export interface PlayerContext {
  state: MatchState;
  me: PlayerState;
  /** Direcção de ataque (+1 ou −1 no eixo x). */
  dir: 1 | -1;
  hasBall: boolean;
  teamHasBall: boolean;
  teammates: PlayerState[];
  opponents: PlayerState[];
  carrier: PlayerState | null;
  /** Distância ao adversário mais próximo, e esse adversário. */
  nearestOpp: { p: PlayerState; d: number } | null;
  /** Distância e ângulo à baliza adversária. */
  goalDist: number;
  goalAngle: number;
  /** Segundos desde a última mudança de posse e se foi a favor da minha equipa. */
  sinceChange: number;
  justLost: boolean;
  justRecovered: boolean;
  /** Diferença no marcador para a minha equipa. */
  scoreDiff: number;
  /** Linha do fora de jogo (x do campo): o penúltimo adversário ou a bola, o que estiver mais à frente. */
  offsideX: number;
  /** Posição-alvo da forma da equipa (TeamShape). */
  shapeTarget: Position;
  /** Sou o jogador da minha equipa mais perto da bola? */
  nearestToBall: boolean;
  /** Assinatura do contexto (para a memoização). */
  key: string;
}
