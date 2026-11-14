// Valor de mercado e preço pedido (Prompt 4, Bloco A). Todos os factores limitados e em config/valor.ts.
import { VALOR as V, PRECO as P } from '../config/valor.ts';
import { POSICOES } from '../config/papeis.ts';
import type { World } from '../engine/world.ts';
import type { Mercado } from './mercado.ts';

const GRUPO: Record<string, string> = { GR: 'GR', DC: 'DEF', DD: 'DEF', DE: 'DEF', ALD: 'DEF', ALE: 'DEF', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'AVA', EE: 'AVA', PL: 'AVA' };
export const grupoPos = (pos: number) => GRUPO[POSICOES[pos]];
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

/** Valor de mercado (€): OVR, potencial, idade, posição, contrato restante, inflação. */
export function valorMercado(w: World, j: number, dia: number, inflacao = 1): number {
  const st = w.jogadores!;
  const ovr = st.ovrNat(j);
  const idade = st.idade(j, dia);
  let v = V.referencia * Math.exp(V.por_ponto_ovr * (ovr - V.ovr_referencia)) * V.idade(idade) * (V.posicao[grupoPos(st.posNat[j])] ?? 1);
  if (idade <= 24) v *= 1 + Math.min(V.potencial_maximo, Math.max(0, st.pot[j] - ovr) * V.potencial_por_ponto);
  const anos = st.clube[j] >= 0 ? Math.max(0, (st.fimContrato[j] - dia) / 365) : 0;
  v *= st.clube[j] >= 0 ? V.contrato(anos) : 0.3;
  return Math.max(V.minimo, Math.round((v * inflacao) / 1000) * 1000);
}

export interface PrecoPedido {
  valor: number;
  preco: number;
  factores: Record<string, number>;
}

/** Preço pedido pelo vendedor a um comprador (factores limitados; razão preço/valor dentro da faixa). */
export function precoPedido(w: World, m: Mercado, j: number, comprador: number, dia: number, interessados = 1): PrecoPedido {
  const st = w.jogadores!, e = w.economia!;
  const vend = st.clube[j];
  const valor = valorMercado(w, j, dia, e.inflacao);
  const f: Record<string, number> = {};
  f.necessidade = P.necessidade[e.clubes.saude[vend]] ?? 1;
  if (m.contratos.listado[j] === 3) f.necessidade = Math.min(f.necessidade, P.necessidade[3]);
  // Importância no plantel e na filosofia.
  const plantel = w.plantel[vend].filter((x) => st.clube[x] === vend).sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
  const ordem = plantel.indexOf(j);
  f.importancia = ordem >= 0 && ordem < 3 ? P.chave : ordem >= 0 && ordem < 11 ? P.titular : 1;
  const casa = m.contratos.formadoClube[j] === vend && st.idade(j, dia) <= 23;
  if (casa) f.importancia *= P.jovem_casa;
  // Comprador: riqueza e liga.
  const ind = (c: number) => (w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.indice_riqueza : 20);
  const fd = (c: number) => (w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.forca_desportiva : 30);
  f.riqueza_comprador = clamp(1 + (P.riqueza_comprador * (ind(comprador) - ind(vend))) / 100, P.riqueza_limites[0], P.riqueza_limites[1]);
  f.liga_comprador = clamp(1 + P.liga_comprador * (fd(comprador) - fd(vend)), P.liga_limites[0], P.liga_limites[1]);
  f.concorrencia = Math.min(P.concorrencia_maximo, 1 + P.concorrencia * Math.max(0, interessados - 1));
  f.rivalidade = 1 + P.rivalidade * e.intensidadeRival(vend, comprador);
  if (w.liga[vend] === w.liga[comprador] && w.reputacao[comprador] > w.reputacao[vend]) f.rivalidade *= P.mesma_liga;
  // Arquétipo do vendedor.
  const arq = e.ia?.arquetipo[vend];
  f.arquetipo = 1;
  if (arq === 'vendedor') f.arquetipo = P.arquetipo.vendedor;
  else if (arq === 'formador' && casa) f.arquetipo = P.arquetipo.formador_jovem;
  else if (arq === 'tradicional' && ordem >= 0 && ordem < 5 && dia - m.contratos.chegada[j] >= P.idolo_anos * 365) f.arquetipo = P.arquetipo.tradicional_idolo;
  // Talento de potencial absurdo num clube de menor expressão: pode sair por mais de 5× o valor.
  const T = P.talento;
  const absurdo = st.idade(j, dia) <= T.idade && st.pot[j] >= T.potencial && w.reputacao[vend] <= w.reputacao[comprador] - T.diferenca_reputacao;
  if (absurdo) f.talento = Math.min(T.factor_maximo, 1 + T.por_ponto * (st.pot[j] - T.base));
  let preco = valor;
  for (const x of Object.values(f)) preco *= x;
  preco = clamp(preco, P.razao[0] * valor, (absurdo ? T.razao_maxima : P.razao[1]) * valor);
  return { valor, preco: Math.round(preco / 10000) * 10000, factores: f };
}
