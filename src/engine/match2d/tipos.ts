// Motor 2D táctico (docs/tactics/MOTOR_2D.md): tipos. Lógica pura, sem DOM.
import type { IdAtributo } from '../../config/atributos.ts';
import type { Estilo2D } from '../../config/match2d/estilos.ts';

export type Equipa = 0 | 1;
export interface V2 { x: number; y: number }

/** Fases do jogo (secção 3). */
export type Fase = 'ATQ_CONSTRUCAO' | 'ATQ_CRIACAO' | 'ATQ_FINALIZACAO' | 'TRANS_ATQ_DEF' | 'DEF_ORGANIZADA' | 'TRANS_DEF_ATQ' | 'BOLA_PARADA';

/** Acções sem bola (catálogo fechado, secção 6.1). Na Fase 1 só se usam MANTER_POSICAO e RECUPERAR. */
export type AccaoSemBola = 'MANTER_POSICAO' | 'OFERECER_APOIO' | 'DAR_LARGURA' | 'ATACAR_PROFUNDIDADE' | 'APOIO_FRONTAL' | 'SOBREPOSICAO'
  | 'OCUPAR_AREA' | 'EQUILIBRIO_DEFENSIVO' | 'PRESSIONAR' | 'COBRIR' | 'FECHAR_LINHA_PASSE' | 'MARCAR' | 'RECUPERAR';

export type Intensidade = 'andar' | 'trote' | 'corrida' | 'sprint';

export interface JogadorBase2D { id: string; nome: string; numero: number; pos: string; papel: string; attrs: Partial<Record<IdAtributo, number>>; /** Condição física à entrada (0–1; por defeito 1). */ condicao?: number }

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
  /** Ticks seguidos em sprint (para contar os sprints). */
  sprintTicks?: number;
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
  /** Ultrapassado (falhou um desarme ou foi driblado): até este tick não desarma e mexe-se mais devagar. */
  ultrapassadoAte: number;
  /** Próximo tick em que pode tentar desarmar. */
  proxDesarme: number;
  /** Marcação individual (Catenaccio): o adversário que lhe foi atribuído. */
  marcado: string | null;
  /** Cansaço (secção 10.2): condição física 0–1 e os limites físicos já com a quebra (null = sem quebra). */
  condicao: number;
  amarelos?: number;
  limCansado?: { velMax: number; acel: number; desacel: number; viragem0: number } | null;
}

export type TarefaBola = 'receber' | 'interceptar' | 'bola_solta' | 'repor';

/** Bola (absoluta): posição, altura, velocidade; dono (aos pés) e o último toque. */
export interface Bola2D {
  p: V2; z: number; v: V2; vz: number;
  dono: string | null;
  /** Último a tocar, a equipa e o tick (para o "sem retoque" e as reposições). */
  ultimo: string | null; equipaUltima: Equipa; tickUltimo: number;
  /** Passe em curso: de quem, para quem (o receptor pretendido), o destino pretendido, o tipo, se vai pelo ar e se o
   *  receptor estava em fora de jogo quando a bola partiu. */
  passe: { de: string; para: string; destino: V2; tick: number; tipo?: string; aereo?: boolean; foraDeJogo?: boolean } | null;
  /** Remate em curso: de quem, o xG e o tick. */
  remate: { de: string; xg: number; tick: number; tipo?: 'PENALTI' | 'LIVRE'; forcado?: 'golo' | 'defesa' | 'fora'; ignorar?: string[] } | null;
}

export interface Evento2D { tick: number; tipo: 'passe' | 'recepcao' | 'intercepcao' | 'mau_toque' | 'bola_solta' | 'fora' | 'reposicao'
  | 'remate' | 'golo' | 'defesa' | 'desarme' | 'falta' | 'fora_de_jogo' | 'cabeceamento' | 'cruzamento' | 'drible' | 'alivio' | 'bloqueio' | 'mentalidade' | 'troca' | 'intervalo' | 'cartao' | 'penalti' | 'expulsao' | 'jogada'; equipa: Equipa; jogador?: string; outro?: string; x: number; y: number; /** Passe: destino pretendido. */ alvo?: V2; /** Tipo do passe (PASSE_CURTO, CRUZAMENTO, ...). */ subtipo?: string; /** Sucesso previsto pelo portador. */ previsto?: number }

export interface Estatisticas2D {
  passes: [number, number]; certos: [number, number]; intercepcoes: [number, number]; mausToques: [number, number];
  /** Ticks com a bola de cada equipa; sequências (passes seguidos da mesma equipa) terminadas. */
  posse: [number, number]; sequencias: number[];
  golos: [number, number]; remates: [number, number]; aBaliza: [number, number]; xg: [number, number];
  desarmes: [number, number]; faltas: [number, number]; forasDeJogo: [number, number]; cruzamentos: [number, number];
  passesLongos: [number, number]; dribles: [number, number];
  /** Recuperações da bola no terço ofensivo (secção 12: Gegenpressen 2× a média). */
  recuperacoesAltas: [number, number];
  cantos: [number, number];
  /** Distância percorrida (m, soma dos jogadores) e arranques em sprint, por equipa. */
  distancia: [number, number]; sprints: [number, number];
  /** Fase 5: cartões, penáltis (assinalados e marcados) e livres directos. */
  amarelos: [number, number]; vermelhos: [number, number]; penaltis: [number, number]; penaltisGolo: [number, number]; livresDirectos: [number, number];
}

/** Reposição simplificada (Fase 2): quem repõe vai à bola (sem teletransporte) e recomeça ao chegar. */
export interface Reposicao2D { tipo: 'lancamento' | 'baliza' | 'canto' | 'livre' | 'saida' | 'penalti'; equipa: Equipa; local: V2; marcador: string; desde: number; plano?: PlanoBolaParada | null }

/** Bola parada planeada (Fase 5): quem marca, a variante, o alvo, as posições de todos e, num penálti, o resultado. */
export interface PlanoBolaParada {
  tipo: 'canto' | 'livre_cruzado' | 'livre_directo' | 'penalti';
  variante?: string; executor: string; alvo?: V2; receptor?: string; curto?: string;
  posicoes: Record<string, V2>; barreira?: string[];
  resultado?: 'golo' | 'defesa' | 'fora'; lado?: number;
}

/** O que o portador está a fazer com a bola (a condução e o drible duram; o resto é instantâneo). */
export interface Conducao { tipo: 'CONDUZIR' | 'DRIBLAR' | 'PROTEGER'; alvo: V2; desde: number; defensor: string | null }

/** Bloco da equipa (secção 4.1), no referencial da equipa. */
export interface Bloco { linhaDefX: number; comprimento: number; largura: number; centroY: number }

export interface EstadoEquipa {
  nome: string;
  estilo: Estilo2D;
  formacao: string;
  fase: Fase;
  faseDesde: number;
  /** Bloco actual (filtrado) e o alvo (recalculado a 5 Hz). */
  bloco: Bloco;
  alvo: Bloco;
  /** Mistura das formas: 0 = sem bola, 1 = com bola (transição gradual). */
  mistura: number;
  /** A linha sobe até este tick (o adversário passou para trás: secção 9.1). */
  subirAte: number;
  /** Mentalidade pelo estado do jogo (−1 fechar … +1 arriscar). */
  mentalidade: number;
  /** x (no referencial da equipa) onde recuperou a bola (a transição acaba se não avançar). */
  xRecuperacao: number;
  /** Jogada-padrão activa (secção 11): qual, até que tick e desde quando. */
  jogada?: { id: string; ate: number; desde: number } | null;
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
  /** O portador a conduzir, driblar ou proteger (null quando só segura a bola para decidir). */
  conducao: Conducao | null;
}

/** Uma posse (sequência de uma equipa com a bola): para a selecção de lances (secção 2.2). `recuperacao`: ganhou a bola
 *  em jogo (não numa reposição); xInicio/xMax no referencial da equipa. */
export interface Posse2D { equipa: Equipa; inicio: number; fim: number; passes: number; xInicio: number; xMax: number; recuperacao: boolean }
