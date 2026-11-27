// Prompt 11: linha de tempo da Liga Europa, portada tal como está de `cutscene-realista/index.html` (`TL_BASE.europa`).
// É a referência oficial (prevalece sobre as tabelas do prompt): não mudar sem aprovação do utilizador.
import type { LinhaTempo } from '../tipos.ts';

export const TL_EUROPA: LinhaTempo = {
  dur: 38,
  actos: {
    fundo: [0.5, 3],
    faixas: [0, 6],
    marca: [9, 12],
    fase: [12.5, 15.5],
    painel: [18, 20],
    home: [20, 23],
    away: [20, 23],
    vs: [22.5, 25],
    estadio: [27, 30],
    climax: [33, 37],
    fade: [37.5, 38],
  },
};
