// Prompt 11: linha de tempo da Champions League, portada tal como está de `cutscene-realista/index.html` (`TL_BASE.champions`).
// É a referência oficial (prevalece sobre as tabelas do prompt): não mudar sem aprovação do utilizador.
import type { LinhaTempo } from '../tipos.ts';

export const TL_CHAMPIONS: LinhaTempo = {
  dur: 38,
  actos: {
    fundo: [0, 1.5],
    marca: [5, 8.5],
    marcaSobe: [10, 13],
    fase: [12.5, 15],
    painel: [14, 16],
    home: [16, 19.5],
    away: [21, 24.5],
    vs: [24, 27],
    estadio: [29, 33],
    trofeu: [29, 33],
    climax: [33, 37],
    fade: [37, 38],
  },
};
