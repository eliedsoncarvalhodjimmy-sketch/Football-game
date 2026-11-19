// Avalia a utilidade de uma opção para um jogador (fórmula base do motor de decisão):
//   Utilidade = Peso_Atributo × Atributo_Normalizado + Peso_Táctica × Bónus_Táctico + Peso_Contexto × Bónus_Contexto
//             + Peso_Moral × Factor_Moral + Peso_Condição × Factor_Condição + Factor_Aleatório
// e calcula o erro humano de uma acção técnica.
// Nota de implementação: a moral só pesa nas acções de risco e a condição só nas acções físicas (nas outras o termo é
// neutro). Somado a todas as opções por igual não mudaria nenhuma escolha.
import { ATRIBUTOS_ACCAO, ESTILOS_DECISAO, PESOS, MORAL, ERRO, ACCOES_RISCO, REMATE_LONGE_M, RUIDO_JANELA_S, FREQUENCIA, type TipoAvaliado } from '../../config/decisao.ts';
import { aleatorioSimetrico } from './rng.ts';
import type { PlayerState, PlayerContext } from './types.ts';

const ACCOES_FISICAS: TipoAvaliado[] = ['driblar', 'pressionar', 'correr_espaco', 'desarmar', 'interceptar'];
/** Opções sem bola (o ruído é menor: posicionar-se é menos caprichoso do que decidir com a bola). */
const SEM_BOLA: TipoAvaliado[] = ['correr_espaco', 'apoiar', 'manter_posicao', 'pressionar', 'recuar', 'marcar', 'interceptar', 'desarmar'];
const TICKS_RUIDO = (RUIDO_JANELA_S * 1000) / FREQUENCIA.tick_ms;

/** Valor de um atributo (1–20); "flair" = média de Drible e Visão. */
export function atributo(p: PlayerState, id: string): number {
  const a = p.attrs as Record<string, number | undefined>;
  if (id === 'flair') return ((a.dri ?? 10) + (a.vis ?? 10)) / 2;
  return a[id] ?? 10;
}

/** Atributo relevante da acção (principais 70%, secundários 30%), na escala 1–20. */
export function atributoAccao(p: PlayerState, tipo: TipoAvaliado): number {
  const m = ATRIBUTOS_ACCAO[tipo];
  const media = (l: string[]) => (l.length ? l.reduce((s, k) => s + atributo(p, k), 0) / l.length : 10);
  return 0.7 * media(m.principais) + 0.3 * media(m.secundarios);
}

/** Factor da moral (0,8–1,2). */
export const factorMoral = (moral: number) => MORAL.minimo + (MORAL.maximo - MORAL.minimo) * Math.max(0, Math.min(100, moral)) / 100;
/** Factor da condição física (0,5–1,0). */
export const factorCondicao = (c: number) => 0.5 + 0.5 * Math.max(0, Math.min(1, c));

/** Bónus táctico do estilo da equipa para a opção (inclui os bónus de transição após perder/recuperar a bola). */
export function bonusTactico(ctx: PlayerContext, tipo: TipoAvaliado): number {
  const ef = ESTILOS_DECISAO[ctx.state.tactics[ctx.me.team].style];
  if (!ef) return 0;
  let b = ef.bonus[tipo] ?? 0;
  const centralDef = ctx.me.role === 'DC' || ctx.me.role === 'GR';
  // Os bónus de correr para o espaço não puxam os centrais para a frente (a linha defensiva fica).
  if (tipo === 'correr_espaco' && centralDef) b = Math.min(0, b);
  // A pressão após a perda é dos que estão perto da bola (até 15 m), não da equipa inteira.
  const pertoBola = Math.hypot(ctx.state.ball.pos.x - ctx.me.pos.x, ctx.state.ball.pos.y - ctx.me.pos.y) < 15;
  if (ctx.justLost && (tipo !== 'pressionar' || pertoBola)) b += ef.aposPerda?.[tipo] ?? 0;
  if (ctx.justRecovered) b += ef.aposRecuperacao?.[tipo] ?? 0;
  if (tipo === 'cabecear') b += ef.aereo ?? 0;
  // Mentalidade: ofensiva favorece progredir e rematar; defensiva favorece segurar.
  const m = ctx.state.tactics[ctx.me.team].mentality;
  if (tipo === 'rematar' || tipo === 'correr_espaco' || tipo === 'driblar') b += 0.4 * m;
  if (tipo === 'recuar' || tipo === 'manter_posicao' || tipo === 'proteger') b -= 0.4 * m;
  if (tipo === 'pressionar') b += 1.5 * (ctx.state.tactics[ctx.me.team].pressing - 0.5);
  // Ordem do treinador depois de um amarelo: menos agressividade.
  if ((tipo === 'desarmar' || tipo === 'pressionar') && ctx.me.calmer) b -= 1.5;
  return b;
}

/** Utilidade de uma opção. `extraRisco` marca remates de longe como risco. */
export function utilidade(ctx: PlayerContext, tipo: TipoAvaliado, bonusContexto: number, opts: { risco?: boolean; distancia?: number } = {}): number {
  const p = ctx.me;
  const attr = atributoAccao(p, tipo) / 20;
  const risco = opts.risco ?? (ACCOES_RISCO.includes(tipo) && (tipo !== 'rematar' || (opts.distancia ?? 0) > REMATE_LONGE_M));
  // Moral: nas acções de risco, (factor − 1) escala o termo; abaixo de 30 há uma penalização extra.
  let moral = 0;
  if (risco) {
    moral = PESOS.moral * (factorMoral(p.morale) - 1) * 5;
    if (p.morale < MORAL.baixa) moral -= MORAL.penalizacao_risco_baixa * PESOS.moral;
  }
  // Condição: nas acções físicas, (factor − 1) penaliza o cansado (0 a −0,5 × peso × 4).
  const cond = ACCOES_FISICAS.includes(tipo) ? PESOS.condicao * (factorCondicao(p.condition) - 1) * 4 : 0;
  // O capricho muda por janelas de tempo (não a cada decisão), desfasado por jogador.
  const janela = Math.floor((ctx.state.tick + p.number * 7) / TICKS_RUIDO);
  const ruido = (SEM_BOLA.includes(tipo) ? PESOS.aleatorio_sem_bola : PESOS.aleatorio) * aleatorioSimetrico(`${p.id}|${janela}|${tipo}`);
  return PESOS.atributo * attr + PESOS.tactica * bonusTactico(ctx, tipo) + PESOS.contexto * bonusContexto + moral + cond + ruido;
}

/**
 * Erro humano de uma acção técnica (fracção 0–0,5):
 *   erro_base = (20 − atributo) / 20 × 0,3; + 0,15 se um adversário estiver a menos de 3 m; + 0,10 se a condição < 60%.
 */
export function erroAccao(atributoRelevante: number, distAdversario: number | null, condicao: number): number {
  let e = ((20 - Math.max(1, Math.min(20, atributoRelevante))) / 20) * ERRO.base;
  if (distAdversario !== null && distAdversario < ERRO.pressao_metros) e += ERRO.pressao;
  if (condicao < ERRO.fadiga_condicao) e += ERRO.fadiga;
  return Math.min(ERRO.maximo, e);
}

/** Aplica o erro ao ângulo e à força (desvio determinístico com semente fixa). */
export function aplicarErro(chave: string, direcao: number, forca: number, erro: number): { direction: number; power: number } {
  const da = aleatorioSimetrico(`${chave}|ang`) * erro * ERRO.angulo_max_rad;
  const df = aleatorioSimetrico(`${chave}|forca`) * erro * ERRO.forca_max;
  return { direction: direcao + da, power: Math.max(0.05, Math.min(1, forca * (1 + df))) };
}
