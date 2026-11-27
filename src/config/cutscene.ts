// Prompt 11: números e nomes da cutscene europeia (fora de src/cutscene/, como os outros config/*.ts). O nome da
// competição vem daqui, não fixo no código.
export const PALETA_CUTSCENE = {
  champions: { nome: 'CHAMPIONS LEAGUE', glow: '140,190,255', acc: '#69f0ea' },
  europa: { nome: 'LIGA EUROPA', glow: '255,138,31', acc: '#ff8a1f' },
} as const;

export type FrequenciaCutscene = 'sempre' | 'primeira_fase' | 'nunca';
/** Ordem de apresentação no ecrã de Definições. */
export const FREQUENCIAS_CUTSCENE: readonly FrequenciaCutscene[] = ['sempre', 'primeira_fase', 'nunca'];

export const CUTSCENE = {
  /** O motor não tem horas; as noites europeias usam esta hora fixa na data mostrada. */
  hora_fixa: '21:00',
  /** Toque mostra o botão de saltar antes disso; passados estes segundos aparece sozinho. */
  saltar_apos_s: 2,
  /** Fade ao saltar (ms) — o áudio (AudioManager) usa o mesmo valor (ver config/audio.ts: cutscene_saida_ms). */
  saltar_fade_ms: 300,
  /** Modo de movimento reduzido (prefers-reduced-motion): cartaz estático, segundos. */
  reduzido_duracao_s: 4,
  /** devicePixelRatio máximo a usar no canvas (desempenho em ecrãs muito densos). */
  dpr_maximo: 2,
  /** Frequência (Definições → "Cutscenes europeias"). Por omissão: só a primeira de cada fase. */
  frequencia_defeito: 'primeira_fase' as FrequenciaCutscene,
  /** Definições da frequência: chave do localStorage (nunca no save, como o volume do som). */
  chave_definicoes: 'futceo:cutscene',
};
