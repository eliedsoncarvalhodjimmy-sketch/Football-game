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
  /** Velocidade pretendida suavizada (intenção de movimento). */
  intencao?: V2;
  /** Âncora actual (absoluta) e a do tick anterior (para a velocidade da âncora). */
  ancora: V2;
  ancoraAntes: V2;
  /** Alvo da acção sem bola (absoluto; na MANTER_POSICAO é a âncora), pontuação e próximo tick de decisão. */
  alvoAccao: V2 | null;
  pontuacao: number;
  proxDecisao: number;
  /** Camada 7 (bola e resolução): tarefa com a bola que se sobrepõe à acção — receber um passe, interceptar, ir à bola
   *  solta ou ir repor a bola — e o ponto onde a vai apanhar. */
  tarefaBola: TarefaBola | null;
  alvoBola: V2 | null;
}

export type TarefaBola = 'receber' | 'interceptar' | 'bola_solta' | 'repor';

/** Bola (absoluta): posição, altura, velocidade; dono (aos pés) e o último toque. */
export interface Bola2D {
  p: V2; z: number; v: V2; vz: number;
  dono: string | null;
  /** Último a tocar, a equipa e o tick (para o "sem retoque" e as reposições). */
  ultimo: string | null; equipaUltima: Equipa; tickUltimo: number;
  /** Passe em curso: de quem, para quem (o receptor pretendido) e o destino pretendido. */
  passe: { de: string; para: string; destino: V2; tick: number } | null;
}

export interface Evento2D { tick: number; tipo: 'passe' | 'recepcao' | 'intercepcao' | 'mau_toque' | 'bola_solta' | 'fora' | 'reposicao'; equipa: Equipa; jogador?: string; outro?: string; x: number; y: number }

export interface Estatisticas2D {
  passes: [number, number]; certos: [number, number]; intercepcoes: [number, number]; mausToques: [number, number];
  /** Ticks com a bola de cada equipa; sequências (passes seguidos da mesma equipa) terminadas. */
  posse: [number, number]; sequencias: number[];
}

/** Reposição simplificada (Fase 2): quem repõe vai à bola (sem teletransporte) e recomeça ao chegar. */
export interface Reposicao2D { tipo: 'lancamento' | 'baliza' | 'canto'; equipa: Equipa; local: V2; marcador: string; desde: number }

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
  bola: Bola2D;
  /** Fase 1: a bola é um ponto movido por fora (arrastada ou num caminho), sem física nem dono. */
  bolaExterna: boolean;
  reposicao: Reposicao2D | null;
  eventos: Evento2D[];
  estat: Estatisticas2D;
  /** Passes seguidos da equipa com a bola (posse estabilizada: secção 3) e desde quando a tem. */
  passesSeguidos: number;
  posseDesde: number;
  posse: Equipa;
  equipas: [EstadoEquipa, EstadoEquipa];
  jogadores: Jogador2D[];
}
