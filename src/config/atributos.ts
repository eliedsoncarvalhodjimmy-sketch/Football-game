// Atributos dos jogadores (aprovados pelo utilizador na Paragem A da Fase 2).
// Escala 1–20. Todos os jogadores guardam os 39 atributos visíveis (um jogador de
// campo tem atributos de guarda-redes baixos e vice-versa) e os 6 ocultos.

export type GrupoAtributo = 'tecnico' | 'mental' | 'fisico' | 'guarda_redes';

export const ATRIBUTOS = [
  // Técnicos
  { id: 'cru', nome: 'Cruzamento', grupo: 'tecnico' },
  { id: 'dri', nome: 'Drible', grupo: 'tecnico' },
  { id: 'fin', nome: 'Finalização', grupo: 'tecnico' },
  { id: 'ptq', nome: 'Primeiro toque', grupo: 'tecnico' },
  { id: 'cab', nome: 'Cabeceamento', grupo: 'tecnico' },
  { id: 'pas', nome: 'Passe', grupo: 'tecnico' },
  { id: 'plo', nome: 'Passe longo', grupo: 'tecnico' },
  { id: 'rld', nome: 'Remate de longe', grupo: 'tecnico' },
  { id: 'des', nome: 'Desarme', grupo: 'tecnico' },
  { id: 'mar', nome: 'Marcação', grupo: 'tecnico' },
  { id: 'tec', nome: 'Técnica', grupo: 'tecnico' },
  { id: 'bpa', nome: 'Bolas paradas', grupo: 'tecnico' },
  // Mentais
  { id: 'ant', nome: 'Antecipação', grupo: 'mental' },
  { id: 'cmp', nome: 'Compostura', grupo: 'mental' },
  { id: 'con', nome: 'Concentração', grupo: 'mental' },
  { id: 'dec', nome: 'Decisões', grupo: 'mental' },
  { id: 'det', nome: 'Determinação', grupo: 'mental' },
  { id: 'lid', nome: 'Liderança', grupo: 'mental' },
  { id: 'msb', nome: 'Movimentação sem bola', grupo: 'mental' },
  { id: 'pos', nome: 'Posicionamento', grupo: 'mental' },
  { id: 'teq', nome: 'Trabalho de equipa', grupo: 'mental' },
  { id: 'vis', nome: 'Visão', grupo: 'mental' },
  { id: 'agr', nome: 'Agressividade', grupo: 'mental' },
  { id: 'ctr', nome: 'Capacidade de trabalho', grupo: 'mental' },
  // Físicos
  { id: 'ace', nome: 'Aceleração', grupo: 'fisico' },
  { id: 'agi', nome: 'Agilidade', grupo: 'fisico' },
  { id: 'equ', nome: 'Equilíbrio', grupo: 'fisico' },
  { id: 'imp', nome: 'Impulsão', grupo: 'fisico' },
  { id: 'res', nome: 'Resistência', grupo: 'fisico' },
  { id: 'vel', nome: 'Velocidade', grupo: 'fisico' },
  { id: 'for', nome: 'Força', grupo: 'fisico' },
  // Guarda-redes
  { id: 'ref', nome: 'Reflexos', grupo: 'guarda_redes' },
  { id: 'jae', nome: 'Jogo aéreo', grupo: 'guarda_redes' },
  { id: 'cma', nome: 'Comando da área', grupo: 'guarda_redes' },
  { id: 'peg', nome: 'Pega', grupo: 'guarda_redes' },
  { id: 'uco', nome: 'Um-contra-um', grupo: 'guarda_redes' },
  { id: 'jpe', nome: 'Jogo com os pés', grupo: 'guarda_redes' },
  { id: 'pon', nome: 'Pontapé', grupo: 'guarda_redes' },
  { id: 'com', nome: 'Comunicação', grupo: 'guarda_redes' },
] as const satisfies readonly { id: string; nome: string; grupo: GrupoAtributo }[];

export type IdAtributo = (typeof ATRIBUTOS)[number]['id'];
export const N_ATR = ATRIBUTOS.length; // 39

/** Índice de cada atributo no array do jogador. */
export const IDX: Record<IdAtributo, number> = Object.fromEntries(ATRIBUTOS.map((a, i) => [a.id, i])) as Record<IdAtributo, number>;

export const OCULTOS = [
  { id: 'prof', nome: 'Profissionalismo' },
  { id: 'amb', nome: 'Ambição' },
  { id: 'cst', nome: 'Consistência' },
  { id: 'les', nome: 'Propensão a lesões' },
  { id: 'adp', nome: 'Adaptabilidade' },
  { id: 'pre', nome: 'Pressão' },
] as const;
export type IdOculto = (typeof OCULTOS)[number]['id'];
export const N_OCU = OCULTOS.length; // 6
export const IDX_OCU: Record<IdOculto, number> = Object.fromEntries(OCULTOS.map((a, i) => [a.id, i])) as Record<IdOculto, number>;

export const ESCALA = { min: 1, max: 20 };
