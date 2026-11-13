// Contratos mínimos dos jogadores (Prompt 3, Bloco A): salário anual e data de fim.
// O contrato completo (cláusulas, prémios, negociação) é do Prompt 4.
import { SALARIO as S, CONTRATOS as K } from '../config/economia.ts';
import { CONTRATO as CONTRATO_J } from '../config/contratosJogador.ts';
import type { Rng } from '../core/rng.ts';
import type { World } from '../engine/world.ts';
import type { PlayerStore } from '../players/store.ts';

/** Índice de riqueza da liga do clube (exterior: 20). */
export function indiceRiqueza(w: World, c: number): number {
  const l = w.liga[c];
  return l >= 0 ? w.ligas[l].regras.indice_riqueza : 20;
}

/** Salário de mercado (€/ano). */
export function salarioMercado(st: PlayerStore, j: number, indice: number, dia: number, escala = 1): number {
  const ovr = st.ovrNat(j);
  const idade = st.idade(j, dia);
  let s = escala * S.referencia * Math.pow(Math.max(1, indice) / 100, S.expoente_riqueza) * Math.exp(S.por_ponto_ovr * (ovr - S.ovr_referencia)) * S.idade(idade);
  if (idade < 24) s *= 1 + Math.min(S.potencial_maximo, Math.max(0, st.pot[j] - ovr) * S.potencial_por_ponto);
  return Math.max(S.minimo, Math.round(s / 1000) * 1000);
}

/** Dia (absoluto) do fim da época `anos` à frente, no calendário do clube (30/06 ou 31/12). */
export function fimDeEpoca(w: World, c: number, dia: number, anos: number): number {
  const l = w.liga[c];
  const civil = l >= 0 && w.ligas[l].regras.epoca.calendario === 'ano_civil';
  const d = new Date(dia * 86400000);
  let ano = d.getUTCFullYear();
  if (!civil && d.getUTCMonth() >= 6) ano++; // depois de Julho, a época acaba no ano seguinte
  if (civil) ano = Math.max(ano, w.epocaPorGrupo.ano_civil ?? ano); // o ano civil ainda não começou (2026)
  const fim = civil ? Date.UTC(ano + anos - 1, 11, 31) : Date.UTC(ano + anos - 1, 5, 30);
  return Math.floor(fim / 86400000);
}

/** Dá contrato aos jogadores do clube que não têm (gerados, reposição). */
export function garantirContratos(w: World, c: number, dia: number, rng: Rng, jovens = false, escala = 1): number {
  const st = w.jogadores!;
  const ind = indiceRiqueza(w, c);
  let folha = 0;
  for (const j of w.plantel[c]) {
    if (st.clube[j] !== c) continue;
    if (!st.salario[j]) {
      const ruido = jovens ? 1 : Math.exp(rng.normal(0, S.ruido_geracao));
      // Primeiro contrato de jovem (Prompt 4): bem abaixo do mercado (até 40% do salário de mercado do OVR).
      const fr = jovens && w.mercado ? CONTRATO_J.jovem_fraccao : 1;
      st.salario[j] = Math.max(S.minimo, Math.round((salarioMercado(st, j, ind, dia, escala) * ruido * fr) / 1000) * 1000);
      if (jovens && w.mercado) { w.mercado.contratos.garantir(st.cap); w.mercado.contratos.aumentoJogos[j] = CONTRATO_J.jovem_aumento_jogos; w.mercado.contratos.formadoClube[j] = c; w.mercado.contratos.chegada[j] = dia; w.mercado.definirEstatuto(j, 30, dia); }
      st.fimContrato[j] = fimDeEpoca(w, c, dia, jovens ? K.anos_jovens : rng.int(K.anos_gerados[0], K.anos_gerados[1]));
    }
    folha += st.salario[j];
  }
  return folha;
}

export function massaSalarial(w: World, c: number): number {
  const st = w.jogadores!;
  let s = 0;
  for (const j of w.plantel[c]) if (st.clube[j] === c) s += st.salario[j];
  return s;
}
