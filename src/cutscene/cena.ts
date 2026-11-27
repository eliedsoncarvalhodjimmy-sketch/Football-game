// Prompt 11, Blocos 3-4: a cena completa — molduras comuns ao protótipo (abanão no clímax, vinheta, flash de luz,
// fades) + Champions ou Liga Europa, segundo `dados.competicao` (tal como o `draw()` do protótipo escolhia entre
// `cenaCL`/`cenaEL`). O fade de saída ao saltar já é feito pelo motor (`opacidadeSaida`, ver `tipos.ts`); aqui só
// os fades "naturais" da própria linha de tempo (entrada e o acto `fade`), tal como no protótipo.
import { PALETA_CUTSCENE } from '../config/cutscene.ts';
import { carregarImagens, FICHEIROS_COMPETICAO, PASTA_CUTSCENE } from './imagens.ts';
import { easeOut, prog } from './utilitarios.ts';
import { vinheta } from './efeitos.ts';
import { geometria, type Desenho, type EscudosCena, type ImagensCena } from './cenas/comum.ts';
import { desenharCenaChampions } from './cenas/champions.ts';
import { desenharCenaEuropa } from './cenas/europa.ts';
import type { ContextoCena, FuncaoCena, IdCompeticao } from './tipos.ts';

export type { ImagensCena, EscudosCena } from './cenas/comum.ts';

/** Carrega as fotografias/logótipos de uma competição (uma só vez; o `carregarImagens` já tem cache por url).
 *  `baseUrl` é o prefixo do sítio (ex.: `import.meta.env.BASE_URL`); por omissão a pasta é relativa à página. */
export async function carregarImagensCompeticao(idComp: IdCompeticao, baseUrl = ''): Promise<ImagensCena> {
  const ficheiros = FICHEIROS_COMPETICAO[idComp];
  const urls = ficheiros.map((f) => `${baseUrl}${PASTA_CUTSCENE}${f}`);
  const carregadas = await carregarImagens(urls);
  const out: ImagensCena = {};
  ficheiros.forEach((f, i) => { out[f] = carregadas.get(urls[i]) ?? null; });
  return out;
}

/** A função de desenho (`FuncaoCena`) para abrir na cutscene: escolhe Champions ou Liga Europa por
 *  `dados.competicao`. `imagens` e `escudos` já devem estar carregados (ver `carregarImagensCompeticao` e
 *  `src/cutscene/combinarEscudos.ts`); em falta, cada um usa o seu plano B (fundo simples / escudo genérico). */
export function criarCenaEuropeia(imagens: ImagensCena, escudos: EscudosCena = { casa: null, fora: null }): FuncaoCena {
  return (c: ContextoCena, ctx: CanvasRenderingContext2D) => {
    const { t, tl, largura: W, altura: H, dpr, dados } = c;
    const actos = tl.actos;
    const clim = easeOut(prog(t, actos.climax));
    ctx.save();
    if (clim > 0) ctx.translate(Math.sin(t * 53) * 1.6 * clim, Math.cos(t * 47) * 1.6 * clim);
    const d: Desenho = { ctx, t, dur: tl.dur, actos, dados, P: PALETA_CUTSCENE[dados.competicao], g: geometria(dados.competicao, W, H), W, H, dpr };
    if (dados.competicao === 'champions') desenharCenaChampions(d, imagens, escudos);
    else desenharCenaEuropa(d, imagens, escudos);
    ctx.restore();

    vinheta(ctx, W, H, 0.55);
    const f1 = 1 - prog(t, [actos.climax[0], actos.climax[0] + 0.5]);
    const f2 = 1 - prog(t, [actos.climax[0] + 2.2, actos.climax[0] + 2.6]);
    const fl = Math.max(t >= actos.climax[0] ? f1 * 0.85 : 0, t >= actos.climax[0] + 2.2 ? f2 * 0.5 : 0);
    if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }

    const fa = Math.max(1 - prog(t, [0, 1]), prog(t, actos.fade));
    if (fa > 0) { ctx.fillStyle = `rgba(0,0,0,${fa.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  };
}
