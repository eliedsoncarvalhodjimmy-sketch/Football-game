// Ficha de um clube (Prompt 3): identidade, adeptos, finanças, orçamentos, infraestruturas e últimas épocas.
import type { World } from '../engine/world.ts';
import { Rng } from '../core/rng.ts';
import { TIPOS_INFRA, INFRA } from '../config/infraestruturas.ts';
import { N_INFRA, SAUDES, RECEITAS, DESPESAS_R } from './store.ts';

export const M = (x: number) => (Math.abs(x) >= 1e6 ? `${(x / 1e6).toFixed(1)} M€` : `${Math.round(x / 1e3)} mil €`);

/** Ano de fundação: ainda não vem dos dados ("a obter"); gerado, determinístico, mais antigo nos clubes de maior reputação. */
export function fundacao(w: World, c: number): number {
  const r = Rng.de(w.semente, 'fundacao', w.clubes[c].id);
  return Math.round(1960 - (w.reputacao[c] / 100) * 60 + r.normal(0, 18));
}

export function fichaClube(w: World, c: number): string[] {
  const e = w.economia!;
  const s = e.clubes;
  const cl = w.clubes[c];
  const L: string[] = [];
  const liga = w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras : null;
  L.push(`### ${cl.nome} (${cl.id})`, '');
  L.push(`${cl.cidade}, ${cl.pais} · fundado em ${fundacao(w, c)} (gerado) · cores ${cl.cores.join(' / ')} · ${liga ? liga.nome : 'exterior'} · reputação ${w.reputacao[c].toFixed(1)}`);
  const hist = s.historicoReputacao(c);
  if (hist.length) L.push(`Reputação nas últimas épocas: ${hist.map((x) => x.toFixed(1)).join(' → ')}`);
  const rivais = cl.rivais.map((r) => { const b = w.idx(r); return `${w.clubes[b].nome} (${e.intensidadeRival(c, b)})`; });
  L.push(`Estádio: ${cl.estadio}, ${s.capacidade[c].toLocaleString('pt-PT')} lugares · Adeptos: ${Math.round(s.adeptos[c]).toLocaleString('pt-PT')} mil, fidelidade ${s.fidelidade[c]}/20${rivais.length ? ` · Rivais: ${rivais.join(', ')}` : ''}`);
  L.push(`Finanças: caixa ${M(s.caixa[c])}, dívida ${M(s.divida(c))} (banco ${M(s.dividaBanco[c])}), saúde **${SAUDES[s.saude[c]]}** · valores iniciais: ${s.origem[c]}`);
  L.push(`Orçamentos: salários ${M(s.orcSalarios[c])} (massa actual ${M(s.folha[c])}, limite do fair play ${Math.round(e.limiteFairPlay(c) * 100)}% da receita), transferências ${M(s.orcTransferencias[c])}, infraestruturas ${M(s.orcInfra[c])}, staff ${M(s.orcStaff[c])} · receita prevista ${M(s.receitaPrevista[c])}`);
  L.push(`Patrocínio: ${M(s.patrocinio[c])}/ano até ${s.patrocinioFim[c]}${s.paraquedasAnos[c] ? ` · pára-quedas ${M(s.paraquedas[c])}/ano` : ''}`);
  L.push(`Infraestruturas: ${TIPOS_INFRA.map((t, k) => `${INFRA[t].nome} ${s.infra[c * N_INFRA + k]}${s.obraSemanal[c * N_INFRA + k] ? ' (em obra)' : ''}`).join(', ')}`);
  const bs = s.balancos[c];
  if (bs.length) {
    // (despesa 'impostos' = impostos e outros custos operacionais)
    L.push('', `| Época | Liga | Pos. | Receita | ${RECEITAS.filter((r) => r !== 'outras').join(' | ')} | Despesa | Salários | Resultado | Massa/receita | Caixa | Dívida |`);
    L.push('|---|---|---:|---:|' + RECEITAS.filter((r) => r !== 'outras').map(() => '---:|').join('') + '---:|---:|---:|---:|---:|---:|');
    for (const b of bs) L.push(`| ${b.epoca} | ${b.liga} | ${b.posicao || '—'} | ${M(b.receita)} | ${RECEITAS.filter((r) => r !== 'outras').map((r) => M(b.receitas[r])).join(' | ')} | ${M(b.despesa)} | ${M(b.massaSalarial)} | ${M(b.resultado)} | ${b.receita ? Math.round((100 * b.massaSalarial) / b.receita) : 0}% | ${M(b.caixa)} | ${M(b.divida)} |`);
    const u = bs[bs.length - 1];
    L.push('', `Despesas da última época: ${DESPESAS_R.filter((r) => u.despesas[r]).map((r) => `${r} ${M(u.despesas[r])}`).join(', ')}.`);
  }
  return L;
}

/** Linhas para financas.csv de um pacote (valores actuais, editáveis à mão). */
export const CABECALHO_FINANCAS = ['clube', 'nome', 'caixa', 'divida_banco', 'divida_dono', 'adeptos', 'fidelidade', 'capacidade', 'patrocinio', ...TIPOS_INFRA.map((t) => `infra_${t}`), 'origem'];

export function linhasFinancas(w: World, pacote: string): string[][] {
  const s = w.economia!.clubes;
  const p = w.pacotes.find((x) => x.manifest.id === pacote);
  if (!p) return [];
  const out: string[][] = [];
  for (const li of p.ligas) for (const c of w.ligas[li].clubes) {
    out.push([w.clubes[c].id, w.clubes[c].nome, String(Math.round(s.caixa[c])), String(Math.round(s.dividaBanco[c])), String(Math.round(s.dividaDono[c])), String(Math.round(s.adeptos[c])), String(s.fidelidade[c]), String(s.capacidade[c]), String(Math.round(s.patrocinio[c])), ...TIPOS_INFRA.map((_, k) => String(s.infra[c * N_INFRA + k])), s.origem[c]]);
  }
  return out;
}
