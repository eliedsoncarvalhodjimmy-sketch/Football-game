// Eventos dos ecrãs da A4 (Staff, Finanças e Conselho, Infraestruturas, Competições, Escritório).
import type { Comando, Vista } from '../jogo/sessao.ts';
import type { UiStaff, UiComp } from './ecrasA4.ts';
import { BILHETE_UTILIZADOR } from '../config/negociacaoUtilizador.ts';

interface EstadoA4 { vista: Vista | null; staff: UiStaff; comp: UiComp; orcRasc: number | null }
interface Contexto {
  UI: EstadoA4;
  comando: (c: Comando) => Promise<boolean>;
  carregarVista: () => Promise<void>;
  desenharVista: (alvo: HTMLElement) => void;
}
let X: Contexto;
export function ligarA4(c: Contexto) { X = c; }

export const SELECTOR_A4 = ['trocar-treinador', 'motivo', 'contratar-tr', 'despedir-staff', 'contratar-staff', 'bil', 'orc-aplicar', 'obra', 'tabc', 'premio']
  .map((k) => `[data-${k}]`).join(',');

const fE = (n: number) => `€${Math.round(n).toLocaleString('pt-PT')}`;

export async function eventoA4(el: HTMLElement, alvo: HTMLElement): Promise<boolean> {
  const d = el.dataset, U = X.UI;
  if (d.trocarTreinador) { U.staff.trocarTreinador = !U.staff.trocarTreinador; X.desenharVista(alvo); return true; }
  if (d.motivo) { U.staff.motivo = d.motivo as UiStaff['motivo']; X.desenharVista(alvo); return true; }
  if (d.contratarTr) {
    if (confirm(`Despedir o treinador actual (${U.staff.motivo === 'resultados' ? 'por resultados' : 'por mútuo acordo'}) e contratar ${d.nome}?`)
      && (await X.comando({ tipo: 'despedirTreinador', motivo: U.staff.motivo, novo: d.contratarTr }))) { U.staff.trocarTreinador = false; void X.carregarVista(); }
    return true;
  }
  if (d.despedirStaff) {
    if (confirm(`Despedir ${d.nome}? Indemnização: ${fE(Number(d.custo))}.`) && (await X.comando({ tipo: 'despedirStaff', membro: d.despedirStaff }))) void X.carregarVista();
    return true;
  }
  if (d.contratarStaff) {
    if (confirm(`Contratar ${d.nome} por ${fE(Number(d.sal))}/ano (3 anos)?`) && (await X.comando({ tipo: 'contratarStaff', membro: d.contratarStaff }))) void X.carregarVista();
    return true;
  }
  if (d.bil !== undefined && U.vista?.ecra === 'financas') {
    const B = BILHETE_UTILIZADOR, f = U.vista.dados.adeptos.precoFactor;
    const novo = d.bil === '0' ? 1 : Math.round(Math.min(B.maximo, Math.max(B.minimo, f + Number(d.bil) * B.passo)) * 100) / 100;
    if (novo !== f && (await X.comando({ tipo: 'precoBilhete', factor: novo }))) void X.carregarVista();
    return true;
  }
  if (d.orcAplicar && U.orcRasc !== null) {
    if (await X.comando({ tipo: 'orcamentos', transferencias: U.orcRasc })) { U.orcRasc = null; void X.carregarVista(); }
    return true;
  }
  if (d.obra) {
    if (confirm(`Lançar a obra: ${d.nome}, ${fE(Number(d.custo))} pagos ao longo de ${d.semanas} semanas?`) && (await X.comando({ tipo: 'obra', infra: d.obra as 'estadio' }))) void X.carregarVista();
    return true;
  }
  if (d.tabc) { U.comp.tab = d.tabc; X.desenharVista(alvo); return true; }
  if (d.premio) { U.comp.premio = d.premio; X.desenharVista(alvo); return true; }
  return false;
}

export function mudancaA4(t: HTMLElement, alvo: HTMLElement): boolean {
  const el = t as HTMLSelectElement & HTMLInputElement, U = X.UI;
  if (el.dataset.cargoStaff) { U.staff.cargo = el.value; X.desenharVista(alvo); return true; }
  if (el.dataset.comp) { U.comp.comp = el.value; void X.carregarVista(); return true; }
  return false;
}

export function entradaA4(t: HTMLInputElement, alvo: HTMLElement): boolean {
  if (!t.dataset.orc) return false;
  X.UI.orcRasc = Number(t.value);
  X.desenharVista(alvo);
  alvo.querySelector<HTMLInputElement>('[data-orc]')?.focus();
  return true;
}
