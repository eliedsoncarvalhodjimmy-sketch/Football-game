// Números da interface (Prompt 5, Bloco A).

/** Versão do motor gravada em cada jogo: uma gravação de outra versão pode reconstruir um mundo diferente. */
export const VERSAO_MOTOR = '2026.11-a1';

export const INTERFACE = {
  /** Ranhuras de gravação por conta. */
  ranhuras: 5,
  /** Gravação automática a cada x semanas avançadas (a gravação é pequena: só o registo do jogo). */
  gravacao_automatica_semanas: 1,
  /** Ecrã de carregamento: fecha quando o jogo está pronto (sem tempo mínimo) ou ao tocar. */
  carregamento_minimo_ms: 0,
};

/** Dicas do ecrã de carregamento (uma ao acaso). */
export const DICAS = [
  'O treinador escolhe o onze; tu escolhes o treinador.',
  'Os olheiros de jovens fazem uma missão de cada vez: escolhe bem o país.',
  'O intake chega em Junho: 6 a 12 jovens directamente para o Sub-18.',
  'O conselho de administração avalia-te pelos objectivos da época.',
  'Um clube com dívida acima de 1,5× a receita fica proibido de contratar.',
  'O Golden Boy é para jogadores até aos 21 anos.',
];
