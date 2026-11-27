// Prompt 10, Bloco 1: números do áudio (volumes, fades). Os mapas evento→som e competição→cutscene (Bloco 3) e o
// orçamento de pesos (Bloco 2) juntam-se aqui mais tarde, sem mexer em src/audio/.
export const CANAIS = ['musica', 'ambiente', 'cutscene'] as const;
export type Canal = (typeof CANAIS)[number];

export const AUDIO = {
  /** Volumes por defeito (0–1), por canal e geral; tudo persiste em Definições, nunca no save de jogo. */
  volume_defeito: { musica: 0.7, ambiente: 0.8, cutscene: 1 } as Record<Canal, number>,
  volume_geral_defeito: 0.8,
  /** Chave do localStorage (própria do áudio; não é lida nem gravada pelo storage do jogo). */
  chave_definicoes: 'futceo:audio',
  /** Fades gerais (ms). */
  fade: {
    ambiente_crossfade_ms: 400,
    musica_crossfade_ms: 2500,
    cutscene_entrada_ms: 500,
    cutscene_saida_ms: 300,
    cutscene_corte_ms: 500,
    imprensa_crossfade_ms: 400,
    imprensa_musica_fundo: 0.2,
  },
  /** Competição → id no catálogo (Bloco 3). Alargar a outra competição é só acrescentar aqui. */
  cutscenes: { champions: 'cut_champions', europa: 'cut_europa' } as Record<string, string>,
};
