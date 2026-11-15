// Imprensa: conferências e guiões (data/imprensa/guioes.md, escritos pelo utilizador). Todos os números afináveis aqui.

/** Escala dos efeitos nos guiões (−3 a +3): a imprensa nunca decide uma época. */
export const ESCALA_EFEITOS = { minimo: -3, maximo: 3 };

/** Códigos de efeito dos guiões. */
export const EFEITOS = {
  EQ: 'Moral do plantel',
  AD: 'Adeptos',
  DN: 'Dono / conselho',
  IM: 'Imprensa (reputação mediática)',
  TR: 'Relação com o treinador',
  BL: 'Balneário (coesão)',
} as const;
export type CodigoEfeito = keyof typeof EFEITOS;

/** Conversão de 1 ponto de guião para as escalas do jogo (0–100 ou 1–20), antes dos pesos. */
export const PONTO_EFEITO: Record<CodigoEfeito, number> = {
  EQ: 0.4, // moral 1–20
  AD: 1.5, // satisfação dos adeptos 0–100
  DN: 1.5, // confiança do dono 0–100
  IM: 1.5, // reputação mediática 0–100
  TR: 1.5, // relação com o treinador 0–100
  BL: 0.4, // coesão do balneário 1–20
};

/** Alcance do jornalista: multiplica os efeitos (local pesa nos adeptos, nacional na reputação, estrangeira na imagem lá fora). */
export const PESO_JORNALISTA: Record<string, Partial<Record<CodigoEfeito, number>>> = {
  local: { AD: 1.25 },
  nacional: { IM: 1.25 },
  desportiva: {},
  estrangeira: { IM: 1.5 },
  economica: { DN: 1.25 },
  canal: { AD: 1.1, IM: 0.7 },
  blogue: { AD: 1.3, IM: 0.8 },
  todos: { AD: 1.1, IM: 1.1 },
  mesmo: {},
};

/** Contexto do clube: num clube de adeptos ou com dono muito interferente o DN pesa mais; num clube grande, o IM. */
export const PESO_CLUBE = {
  clube_de_adeptos: { DN: 1.5 },
  dono_interferente: { DN: 1.5, interferencia_minima: 15 },
  clube_grande: { IM: 1.5, reputacao_minima: 75 },
};

/** Escolha das perguntas (regras do utilizador). */
export const CONFERENCIA = {
  perguntas_normal: 3, // pré-jogo e pós-jogo
  perguntas_evento: 5, // apresentação, fim de época, crise, final
  /** Não repetir a mesma pergunta antes de x conferências. */
  sem_repetir: 12,
  /** Prioridade: memória (promessas, contradições) > gatilho raro > comum. Peso de raridade = 1 / frequência do gatilho. */
  prioridade_memoria: 1000,
  /** Rodar a ordem A, B, C dentro de cada pergunta. */
  rodar_opcoes: true,
  /** Uma pergunta só é escolhida se tiver pelo menos x opções disponíveis. */
  opcoes_minimas: 3,
};

/** Respostas de risco. */
export const RISCO = {
  /** Se a verdade sair, o efeito de uma MENTIRA é negativo e multiplicado por x. */
  mentira_multiplicador: 2,
  /** Probabilidade de o jornalista voltar ao tema e a verdade sair (por mês, enquanto a contradição existir). */
  mentira_descoberta_mes: 0.25,
  /** Promessa falhada: a satisfação de adeptos e do dono desce x vezes o que subiu. */
  promessa_falhada_multiplicador: 1.5,
  /** Promessa cumprida: bónus de x vezes o que subiu. */
  promessa_cumprida_multiplicador: 0.5,
};

/** Multas por críticas à arbitragem (a probabilidade vem do guião). */
export const MULTA_ARBITRAGEM = { base: 15_000, por_reputacao: 1_500 };

/** Variáveis de texto aceites nos guiões. As três últimas aparecem nos guiões mas não na lista do utilizador. */
export const VARIAVEIS = ['clube', 'adversario', 'competicao', 'treinador', 'jogador', 'capitao', 'jovem', 'ex_jogador', 'estadio', 'cidade',
  'valor', 'posicao', 'objectivo', 'rival', 'liga', 'dono', 'idade', 'lucro_ou_prejuizo', 'promessa'];
