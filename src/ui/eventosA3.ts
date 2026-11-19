// Eventos dos ecrãs da A3 (Mercado, negociação, Academia e Recrutamento). O estado e as acções da app chegam por ligarA3.
import { pedir } from './motor.ts';
import { NEG_CLUBE, NEG_JOGADOR, NEG_EMPRESTIMO } from '../config/negociacaoUtilizador.ts';
import type { Comando, Vista } from '../jogo/sessao.ts';
import type { UiMercado, UiAcademia, RascNeg } from './ecrasA3.ts';
import type { UiPlantel } from './ecras.ts';

interface EstadoA3 {
  vista: Vista | null; voltar: string; plantel: UiPlantel;
  mercado: UiMercado; academia: UiAcademia; neg: number | null; rascNeg: RascNeg | null;
}
interface Contexto {
  UI: EstadoA3;
  ecra: () => string;
  definirEcra: (e: string) => void;
  comando: (c: Comando) => Promise<boolean>;
  carregarVista: () => Promise<void>;
  desenharVista: (alvo: HTMLElement) => void;
  irPara: (e: string) => void;
  ecraJogo: () => void;
}
let X: Contexto;
export function ligarA3(c: Contexto) { X = c; }

export const SELECTOR = ['jogador', 'ir', 'tabp', 'filtro', 'promover', 'voltar', 'estilo', 'form', 'instr', 'titular', 'repor', 'cancelar', 'enviar',
  'tabm', 'short', 'negociar', 'neg-abrir', 'neg', 'resp', 'listar', 'ala', 'tabacad', 'escj', 'tabj', 'cad', 'mpais', 'zoom', 'missao', 'missao-enviar', 'contratar-jovem', 'exc-decidir', 'ligas-gravar']
  .map((k) => `[data-${k}]`).join(',');

const euros = (t: string) => Number(t.replace(/[^\d]/g, '')) || 0;
function rodar<T>(lista: readonly T[], x: T): T { return lista[(lista.indexOf(x) + 1) % lista.length]; }
const fE = (n: number) => `€${Math.round(n).toLocaleString('pt-PT')}`;

function abrirNegociacao(id: number) {
  const U = X.UI;
  U.neg = id; U.rascNeg = null;
  const e = X.ecra();
  if (e !== 'negociacao' && e !== 'jogador') U.voltar = e;
  X.definirEcra('negociacao'); X.ecraJogo(); document.getElementById('principal')?.scrollTo(0, 0);
}

/** Cliques da A3. Devolve true se tratou o evento. */
export async function eventoA3(el: HTMLElement, alvo: HTMLElement): Promise<boolean> {
  const d = el.dataset, U = X.UI;
  if (d.tabm) { U.mercado.tab = d.tabm; if (X.ecra() !== 'mercado') X.irPara('mercado'); else X.desenharVista(alvo); return true; }
  if (d.short) { const [id, s] = d.short.split(':'); if (await X.comando({ tipo: 'shortlist', jogador: id, marcar: s === '1' })) void X.carregarVista(); return true; }
  if (d.listar) { const [id, s] = d.listar.split(':'); if (await X.comando({ tipo: 'listar', jogador: id, listado: s === '1' })) void X.carregarVista(); return true; }
  if (d.negociar) {
    const [id, tipo] = d.negociar.split(':');
    if (tipo === 'clausula' && !confirm('Pagar a cláusula de rescisão? O clube não pode recusar; falta acertar o contrato com o jogador.')) return true;
    if (!(await X.comando({ tipo: 'negociar', jogador: id, negocio: tipo as 'transferencia' }))) return true;
    const vm = await pedir<'vista'>({ tipo: 'vista', pedido: { ecra: 'mercado' } });
    const n = vm.vista.ecra === 'mercado' ? vm.vista.dados.feitas.find((x) => x.jogador === id) : null;
    if (n) abrirNegociacao(n.id);
    return true;
  }
  if (d.negAbrir) { abrirNegociacao(Number(d.negAbrir)); return true; }
  if (d.resp) {
    const [id, acao] = d.resp.split(':');
    const contra = acao === 'contra' ? euros(alvo.querySelector<HTMLInputElement>(`[data-contra-val="${id}"]`)?.value ?? '') : 0;
    if (acao === 'aceitar' && !confirm('Aceitar a oferta? O jogador ainda tem de acertar o contrato com o outro clube.')) return true;
    if (await X.comando({ tipo: 'responderOferta', negocio: Number(id), resposta: acao === 'contra' ? { contra } : (acao as 'aceitar' | 'recusar') })) void X.carregarVista();
    return true;
  }
  if (d.neg && U.vista?.ecra === 'negociacao' && U.rascNeg) {
    const v = U.vista.dados, r = U.rascNeg, ct = r.contrato;
    switch (d.neg) {
      case 'desistir': if (confirm('Terminar a negociação?') && (await X.comando({ tipo: 'desistir', id: v.neg.id }))) void X.carregarVista(); return true;
      case 'enviar': {
        const cmd: Comando = v.neg.fase === 'clube' ? (v.neg.tipo === 'emprestimo' ? { tipo: 'propostaEmprestimo', id: v.neg.id, salario: r.salarioEmp, opcao: r.opcao }
          : { tipo: 'propostaClube', id: v.neg.id, valor: r.valor, vendaFutura: r.vendaFutura, parcelas: r.parcelas, troca: r.troca })
          : { tipo: 'propostaJogador', id: v.neg.id, proposta: ct! };
        if (await X.comando(cmd)) { U.rascNeg = null; void X.carregarVista(); }
        return true;
      }
      case 'venda': r.vendaFutura = rodar(NEG_CLUBE.venda_futura_opcoes, r.vendaFutura); break;
      case 'parcelas': r.parcelas = rodar(NEG_CLUBE.parcelas.map((x) => x.id), r.parcelas); break;
      case 'salemp': r.salarioEmp = rodar(NEG_EMPRESTIMO.opcoes_salario, r.salarioEmp); break;
      case 'opcao': r.opcao = r.opcao ? 0 : v.emprestimo?.opcaoMinima ?? 0; break;
      case 'papel': if (ct) ct.papel = rodar(NEG_JOGADOR.papeis, ct.papel); break;
      case 'anos': if (ct) ct.anos = rodar(NEG_JOGADOR.anos_opcoes, ct.anos); break;
      case 'clausula': if (ct) ct.clausula = ct.clausula ? 0 : Math.round((v.jogador.valor * 3) / 1e5) * 1e5; break;
      case 'bonus': if (ct) ct.bonus = ct.bonus ? null : { tipo: 'Golos', modo: 'Por cada', n: 10, valor: 20000 }; break;
      case 'bmodo': if (ct?.bonus) ct.bonus.modo = rodar(NEG_JOGADOR.bonus_modos, ct.bonus.modo); break;
      case 'btipo': if (ct?.bonus) ct.bonus.tipo = rodar(NEG_JOGADOR.bonus_tipos, ct.bonus.tipo); break;
      case 'bn': if (ct?.bonus) ct.bonus.n = rodar(NEG_JOGADOR.bonus_n, ct.bonus.n); break;
    }
    X.desenharVista(alvo);
    return true;
  }
  const A = U.academia;
  if (d.ala) { A.ala = d.ala as UiAcademia['ala']; void X.carregarVista(); return true; }
  if (d.tabacad) { A.tab = d.tabacad; X.desenharVista(alvo); return true; }
  if (d.escj) { A.escJ = Number(d.escj); X.desenharVista(alvo); return true; }
  if (d.tabj) { A.tabJ = d.tabj; X.desenharVista(alvo); return true; }
  if (d.cad) { if (d.cad === 'Intake') { A.tab = 'Intake'; X.desenharVista(alvo); } else { U.plantel.tab = d.cad as UiPlantel['tab']; X.irPara('plantel'); } return true; }
  if (d.mpais) { A.pais = d.mpais; X.desenharVista(alvo); return true; }
  if (d.zoom) { A.zoom = d.zoom; X.desenharVista(alvo); return true; }
  if (d.missao) { A.missao = Number(d.missao); X.desenharVista(alvo); return true; }
  if (d.missaoEnviar) {
    const v = U.vista?.ecra === 'scouting' ? U.vista.dados : null;
    const p = v?.paises.find((x) => x.codigo === A.pais);
    if (p && confirm(`Enviar um olheiro de jovens para ${p.nome} (${A.posicao}, ${A.semanas} semanas)? Custo: ${fE(p.custoSemana * A.semanas)}.`)
      && (await X.comando({ tipo: 'missao', pais: A.pais, posicao: A.posicao as 'Todas', semanas: A.semanas }))) void X.carregarVista();
    return true;
  }
  if (d.contratarJovem) {
    if (confirm(`Contratar ${d.nome} para o Sub-18? Compensação de formação: ${fE(Number(d.valor))}.`) && (await X.comando({ tipo: 'contratarJovem', jogador: d.contratarJovem }))) void X.carregarVista();
    return true;
  }
  if (d.excDecidir) {
    const v = U.vista?.ecra === 'academia' ? U.vista.dados : null;
    const lib = A.excedente ?? v?.excedente?.jogadores.map((x) => x.id) ?? [];
    if (confirm(`Libertar ${lib.length} jovem(ns) do Sub-18?`) && (await X.comando({ tipo: 'excedente', libertar: lib }))) { A.excedente = null; void X.carregarVista(); }
    return true;
  }
  if (d.ligasGravar) {
    const sel = alvo.querySelector<HTMLSelectElement>('[data-ligas-scout]');
    const ligas = sel ? Array.from(sel.selectedOptions).map((o) => o.value) : [];
    if (await X.comando({ tipo: 'atribuirScouts', ligas })) { A.ligasScout = null; void X.carregarVista(); }
    return true;
  }
  return false;
}

/** Selecções (filtros do mercado, troca, missão, excedente, ligas dos olheiros). */
export function mudancaA3(t: HTMLElement, alvo: HTMLElement) {
  const U = X.UI, el = t as HTMLSelectElement & HTMLInputElement;
  if (el.dataset.filtrom) { (U.mercado as unknown as Record<string, string>)[el.dataset.filtrom] = el.value; X.desenharVista(alvo); return; }
  if (el.dataset.troca && U.rascNeg) { U.rascNeg.troca = el.value || null; X.desenharVista(alvo); return; }
  if (el.dataset.exc) {
    const v = U.vista?.ecra === 'academia' ? U.vista.dados : null;
    const atual = new Set(U.academia.excedente ?? v?.excedente?.jogadores.map((x) => x.id) ?? []);
    if (el.checked) atual.add(el.dataset.exc); else atual.delete(el.dataset.exc);
    U.academia.excedente = [...atual];
    return;
  }
  if (el.id === 'mi-pais') { U.academia.pais = el.value; X.desenharVista(alvo); return; }
  if (el.id === 'mi-pos') { U.academia.posicao = el.value; return; }
  if (el.id === 'mi-sem') { U.academia.semanas = Number(el.value); X.desenharVista(alvo); return; }
  if (el.dataset.ligasScout) U.academia.ligasScout = Array.from(el.selectedOptions).map((o) => o.value);
}

/** Campos de euros da negociação e pesquisa do mercado: actualizam o rascunho e a dica sem perder o foco. */
export function entradaA3(t: HTMLInputElement, alvo: HTMLElement): boolean {
  const U = X.UI;
  if (t.id === 'm-pesq') {
    U.mercado.pesquisa = t.value; X.desenharVista(alvo);
    const f = alvo.querySelector<HTMLInputElement>('#m-pesq'); f?.focus(); f?.setSelectionRange(f.value.length, f.value.length);
    return true;
  }
  const k = t.dataset.eur;
  if (!k || !U.rascNeg) return false;
  const r = U.rascNeg, val = euros(t.value);
  if (k === 'valor') r.valor = val;
  else if (k === 'opcao') r.opcao = val;
  else if (r.contrato) {
    if (k === 'bonus') { if (r.contrato.bonus) r.contrato.bonus.valor = val; }
    else if (k === 'salario' || k === 'premio' || k === 'agente' || k === 'clausula') r.contrato[k] = val;
  }
  X.desenharVista(alvo);
  const f = alvo.querySelector<HTMLInputElement>(`[data-eur="${k}"]`);
  if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
  return true;
}
