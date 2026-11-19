// Números da interface (Prompt 5, Bloco A).

/** Versão do motor gravada em cada jogo: uma gravação de outra versão pode reconstruir um mundo diferente. */
export const VERSAO_MOTOR = '2026.11-a4';

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

/** Disposição das caixas no campo da Táctica (do protótipo, afinada à mão): [posição, esquerda %, topo %] por formação. */
export const DISPOSICAO_CAMPO: Record<string, [string, number, number][]> = {
  '3-4-2-1': [['PL', 50, 9], ['MO', 30, 26], ['MO', 70, 26], ['ALE', 9, 47], ['MDC', 33, 47], ['MDC', 67, 47], ['ALD', 91, 47], ['DC', 18, 69], ['DC', 50, 69], ['DC', 82, 69], ['GR', 50, 90]],
  '4-3-3': [['PL', 50, 10], ['EE', 17, 22], ['ED', 83, 22], ['MC', 30, 42], ['MC', 70, 42], ['MDC', 50, 58], ['DE', 15, 66], ['DD', 85, 66], ['DC', 32, 78], ['DC', 68, 78], ['GR', 50, 92]],
  '4-2-3-1': [['PL', 50, 10], ['EE', 16, 26], ['MO', 50, 28], ['ED', 84, 26], ['MDC', 32, 50], ['MDC', 68, 50], ['DE', 15, 66], ['DD', 85, 66], ['DC', 32, 78], ['DC', 68, 78], ['GR', 50, 92]],
  '4-4-2': [['PL', 32, 11], ['PL', 68, 11], ['EE', 13, 38], ['MC', 37, 44], ['MC', 63, 44], ['ED', 87, 38], ['DE', 15, 66], ['DD', 85, 66], ['DC', 32, 78], ['DC', 68, 78], ['GR', 50, 92]],
  '4-1-4-1': [['PL', 50, 10], ['EE', 13, 30], ['MC', 36, 36], ['MC', 64, 36], ['ED', 87, 30], ['MDC', 50, 54], ['DE', 15, 66], ['DD', 85, 66], ['DC', 32, 78], ['DC', 68, 78], ['GR', 50, 92]],
  '3-4-3': [['PL', 50, 10], ['EE', 18, 18], ['ED', 82, 18], ['ALE', 9, 44], ['MC', 36, 46], ['MC', 64, 46], ['ALD', 91, 44], ['DC', 25, 76], ['DC', 50, 79], ['DC', 75, 76], ['GR', 50, 92]],
  '3-5-2': [['PL', 33, 11], ['PL', 67, 11], ['ALE', 9, 42], ['MC', 30, 40], ['MDC', 50, 52], ['MC', 70, 40], ['ALD', 91, 42], ['DC', 25, 76], ['DC', 50, 79], ['DC', 75, 76], ['GR', 50, 92]],
  '5-3-2': [['PL', 33, 12], ['PL', 67, 12], ['MC', 28, 40], ['MDC', 50, 48], ['MC', 72, 40], ['ALE', 8, 62], ['DC', 27, 77], ['DC', 50, 80], ['DC', 73, 77], ['ALD', 92, 62], ['GR', 50, 92]],
  '5-4-1': [['PL', 50, 12], ['EE', 13, 36], ['MC', 37, 44], ['MC', 63, 44], ['ED', 87, 36], ['ALE', 8, 62], ['DC', 27, 77], ['DC', 50, 80], ['DC', 73, 77], ['ALD', 92, 62], ['GR', 50, 92]],
};
