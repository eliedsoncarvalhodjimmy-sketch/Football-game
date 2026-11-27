// Prompt 11: tipos partilhados da cutscene. Puro — sem DOM, sem Web Audio.
export type IdCompeticao = 'champions' | 'europa';

/** A linha de tempo de uma competição: duração total e os actos, cada um [início, fim] em segundos. As chaves dos
 *  actos são livres, por competição — tal como no protótipo (`TL_BASE`): mudar um tempo é só editar dois números. */
export interface LinhaTempo { dur: number; actos: Record<string, [number, number]> }

/** Dados reais do jogo a mostrar na cutscene (tudo opcional: em falta, a cena usa texto genérico ou nada). */
export interface DadosCutscene {
  competicao: IdCompeticao;
  /** Ex.: "Oitavos de final · 1.ª mão", "Fase de liga · Jornada 3", "Final". */
  fase: string;
  estadio: string;
  cidade: string;
  /** Já formatada ("12 Março 2027 · 21:00"); a hora é fixa (o motor não tem horas). */
  data: string;
  casa: { nome: string; sigla: string; cor: string };
  fora: { nome: string; sigla: string; cor: string };
}

/** O que uma cena precisa para se desenhar num instante `t` (segundos desde o início). */
export interface ContextoCena {
  t: number;
  tl: LinhaTempo;
  dados: DadosCutscene;
  largura: number;
  altura: number;
  dpr: number;
  /** 1 = opacidade normal; desce a 0 durante o fade de saída (saltar ou fim). A cena não precisa de lhe fazer nada:
   *  o motor já desenha por cima um fade a preto; está aqui só se uma cena quiser reagir. */
  opacidadeSaida: number;
  /** Prompt 11, Bloco 6: o motor mediu menos de 40 fps e activou o modo leve (automático, só nesta cutscene) — a
   *  cena deve saltar partículas, feixes de luz e brilhos (`glow`/`streak`/`raios`/`particulas`), mantendo o resto
   *  (fotografias, logótipo, escudos, texto, painel). Uma vez activo, fica assim até ao fim da cutscene. */
  modoLeve: boolean;
}

export type FuncaoCena = (ctx: ContextoCena, canvas: CanvasRenderingContext2D) => void;
