// Importa as folhas do utilizador (data/fontes/*.xlsx), que são a fonte de verdade
// de ligas, taças, prémios e vagas continentais, e gera os pacotes em packs/.
// Campos vazios ficam "a obter"; quando o jogo precisa de um valor, usa o de
// data/fontes/complementos.json, marcado "gerado".
//
// Mantém clubes.csv, jogadores.csv, ... e overrides.json que já existam (dados do
// utilizador); reescreve manifest.json e competicoes/. Apaga pacotes que deixaram
// de existir só se não tiverem dados próprios.
//
// Uso: npx tsx scripts/importar-fontes.ts
import ExcelJS from 'exceljs';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest, RegrasLiga, RegrasTaca, Premio, Confederacao, Desempate } from '../src/data/types.ts';

const RAIZ = join(import.meta.dirname, '..');
const FONTES = join(RAIZ, 'data', 'fontes');
const PACKS = join(RAIZ, 'packs');
const COMP = JSON.parse(readFileSync(join(FONTES, 'complementos.json'), 'utf8'));

type Linha = Record<string, unknown>;

async function folha(ficheiro: string, nome: string): Promise<Linha[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(FONTES, ficheiro));
  const ws = wb.getWorksheet(nome);
  if (!ws) throw new Error(`${ficheiro}: folha "${nome}" em falta`);
  const linhas: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = (row.values as unknown[]).slice(1).map((v) => (v && typeof v === 'object' && 'result' in (v as object) ? (v as { result: unknown }).result : v));
    linhas.push(vals);
  });
  const cab = (linhas[0] as string[]).map((c) => String(c ?? '').trim());
  return linhas.slice(1).map((l) => Object.fromEntries(cab.map((c, i) => [c, l[i] ?? null]))).filter((l) => Object.values(l).some((v) => v !== null && v !== ''));
}

const vazio = (v: unknown) => v === null || v === undefined || String(v).trim() === '' || /^a obter$/i.test(String(v).trim());
const num = (v: unknown): number | null => (vazio(v) ? null : Number(v));
const txt = (v: unknown): string | null => (vazio(v) ? null : String(v).trim());

const D_PADRAO: Desempate[] = ['pontos', 'dg', 'gm', 'confronto_directo', 'sorteio'];
const D_H2H: Desempate[] = ['pontos', 'confronto_directo', 'dg', 'gm', 'sorteio'];
const D_VIT: Desempate[] = ['pontos', 'vitorias', 'dg', 'gm', 'confronto_directo', 'sorteio'];
// Desempates: a folha ainda não os tem; mantêm-se os da Fase 1 (aproximação ao regulamento de cada liga).
const DESEMPATES: Record<string, Desempate[]> = { ESP: D_H2H, POR: D_H2H, TUR: D_H2H, ITA: D_H2H, GRE: D_H2H, CZE: D_H2H, CRO: D_H2H, POL: D_H2H, KSA: D_H2H, UAE: D_H2H, BRA: D_VIT, USA: D_VIT };

function voltas(formato: string | null, n: number): number | null {
  if (!formato) return null;
  const v = formato.match(/(\d+)\s*voltas/);
  if (v) return Number(v[1]);
  const j = formato.match(/(\d+)\s*jogos/);
  if (j) return Math.max(1, Math.round(Number(j[1]) / (n - 1)));
  if (/ida e volta/.test(formato)) return 2;
  return null;
}

function ligasDoTexto(t: string): string[] {
  const m = t.match(/[A-Z]{3}\d/g) ?? [];
  if (/\ba\b/.test(t) && m.length === 2) {
    const [a, b] = m;
    const out: string[] = [];
    for (let i = Number(a[3]); i <= Number(b[3]); i++) out.push(a.slice(0, 3) + i);
    return out;
  }
  return m;
}

const relatorio: string[] = [];
const nota = (s: string) => relatorio.push(s);

const ligasF = await folha('FutCEO_Ligas_central.xlsx', 'Ligas');
const compF = await folha('FutCEO_Ligas_central.xlsx', 'Competências');
const premF = await folha('FutCEO_Ligas_central.xlsx', 'Prémios');
const vagasF = await folha('FutCEO_Ligas_central.xlsx', 'Vagas');
const europaF = await folha('FutCEO_Vagas_europeias.xlsx', 'Europa');

const premiosPor = new Map<string, Premio[]>();
for (const p of premF) {
  const id = String(p['id_competição']);
  const lista = premiosPor.get(id) ?? [];
  lista.push({ fase: String(p.fase), por_equipa_eur: num(p['prémio_por_equipa_eur']), por_vitoria_eur: num(p['prémio_por_vitória_eur']), por_empate_eur: num(p['prémio_por_empate_eur']), fonte: txt(p.fonte), notas: txt(p.notas) });
  premiosPor.set(id, lista);
}

// ---------------- Ligas ----------------
const porPais = new Map<string, RegrasLiga[]>();
for (const r of ligasF) {
  const id = String(r.id_liga).trim();
  const pais = id.slice(0, 3);
  const c = COMP.ligas[id] ?? {};
  const origem: Record<string, string> = {};
  const aObter: string[] = [];
  const val = <T>(campo: string, daFolha: T | null, comp?: { valor: T; origem: string } | T): T | null => {
    if (daFolha !== null && daFolha !== undefined) { origem[campo] = 'folha'; return daFolha; }
    aObter.push(campo);
    if (comp && typeof comp === 'object' && comp !== null && 'valor' in (comp as object)) {
      origem[campo] = (comp as { origem: string }).origem;
      return (comp as { valor: T }).valor;
    }
    origem[campo] = 'a obter';
    return null;
  };
  const n = val('nº_equipas', num(r['nº_equipas']), c.equipas) ?? 0;
  const formato = txt(r.formato);
  let nv: number | null = voltas(formato, n);
  if (c.voltas) { nv = c.voltas.valor; origem.voltas = c.voltas.origem; } else origem.voltas = nv ? `folha (formato: "${formato}")` : 'gerado: 2 voltas';
  const sobem = val('sobem', num(r.sobem), c.sobem) ?? 0;
  const descem = val('descem', num(r.descem), c.descem) ?? 0;
  if (c.sobem && num(r.sobem) !== null) { origem.sobem = c.sobem.origem; }
  const sobemFinal = c.sobem && num(r.sobem) !== null ? c.sobem.valor : sobem;
  for (const campo of ['tv_total_eur', 'tecto_salarial', 'min_nacionais_plantel', 'max_plantel', 'fonte']) if (vazio(r[campo])) aObter.push(campo);
  if (c.playoff) origem.playoff_subida = c.playoff.origem ?? `folha (play-offs: "${txt(r['play-offs'])}")`;
  if (c.barragem) origem.barragem = `folha (play-offs: "${txt(r['play-offs'])}")`;
  if (c.playoff_campeao) origem.playoff_campeao = c.playoff_campeao.origem;
  if (c.descida_media_epocas) origem.descida_media_epocas = `folha (play-offs: "${txt(r['play-offs'])}")`;
  origem.forca_desportiva = 'proposta Claude (ranking UEFA): a validar';
  origem.geracao = 'proposta Claude: bandas de reputação provisórias';
  const regras: RegrasLiga = {
    id, nome: String(r.liga), tipo: 'liga', pais: c.quotas ? null : pais, nivel: Number(r['divisão']),
    forca_desportiva: c.forca_desportiva ?? 50,
    jogam_nas_paragens: !!c.jogam_nas_paragens,
    descida_media_epocas: c.descida_media_epocas ?? null,
    calendario_folha: txt(r['calendário']),
    vagas_continentais_folha: num(r.vagas_continentais),
    tecto_salarial: c.tecto_salarial ? c.tecto_salarial.valor : vazio(r.tecto_salarial) ? null : (r.tecto_salarial as string | number),
    fonte: txt(r.fonte), notas: txt(r.notas), origem_campos: origem, a_obter: aObter,
    formato: { equipas: n, voltas: nv ?? 2, playoff_campeao: c.playoff_campeao ? { equipas: c.playoff_campeao.valor } : null },
    subidas: { directas: sobemFinal, playoff: c.playoff ? { de: c.playoff.de, ate: c.playoff.ate, destino: c.playoff.destino } : null },
    descidas: { directas: descem, barragem: c.barragem ? { posicao: c.barragem.posicao, adversario: c.barragem.adversario, maos: 2 } : null, exterior: false },
    desempates: DESEMPATES[pais] ?? D_PADRAO,
    // Decisão do utilizador (13/11/2026): as ligas marcadas "ano civil" jogam Fevereiro–Dezembro.
    epoca: { calendario: /ano civil/i.test(String(r['calendário'] ?? '')) ? 'ano_civil' : 'ago_mai' },
    split_folha: /split|fase final/i.test(formato ?? '') ? formato : null,
    indice_riqueza: num(r['índice_riqueza_1a100']) ?? 0,
    geracao: c.rep ? { rep_tecto: c.rep[0], rep_piso: c.rep[1] } : null,
    janelas_transferencias: [{ abre: '07-01', fecha: '09-01' }, { abre: '01-01', fecha: '02-01' }],
    plantel: { max: num(r.max_plantel) ?? 25, minimo_nacionais: num(r.min_nacionais_plantel), maximo_estrangeiros: null, minimo_formados_no_clube: null, por_validar: true },
    tv: { total_eur: num(r.tv_total_eur), pct_igual: num(r.tv_pct_igual), pct_desempenho: num(r.tv_pct_desempenho), pct_comercial: num(r.tv_pct_comercial), regra_desempenho: txt(r.tv_regra_desempenho), paraquedas: [], por_validar: true },
    premios: [],
    fair_play: { massa_salarial_max_receita: 0.8, sancoes: ['aviso', 'multa', 'proibicao_inscricoes'] },
    licenciamento: Number(r['divisão']) > 1 ? { exigido: true, notas: 'por definir' } : null,
  };
  if (vazio(r.max_plantel)) regras.origem_campos!.max_plantel = 'gerado: 25';
  if (c.tecto_salarial) origem.tecto_salarial = c.tecto_salarial.origem;
  origem.calendario = `${COMP.calendario._origem} (folha: "${txt(r['calendário'])}")`;
  if (regras.split_folha) origem.split = COMP.splits._origem;
  // Mínimo de nacionais (decisão do utilizador): o valor da folha fica guardado, mas usa-se o da decisão.
  const mn = COMP.min_nacionais;
  regras.plantel.minimo_nacionais_folha = num(r.min_nacionais_plantel);
  regras.plantel.minimo_nacionais = mn.por_pais[pais] ?? mn.padrao;
  origem.min_nacionais_plantel = mn._origem;
  // TV, mínimo de nacionais e plantel gerados a partir do índice de riqueza (ligas sem esses dados na folha).
  if (c.gerar_tv_plantel) {
    const g = COMP.geracao_tv;
    regras.tv = { total_eur: g.eur_por_ponto * regras.indice_riqueza, pct_igual: g.pct_igual, pct_desempenho: g.pct_desempenho, pct_comercial: g.pct_comercial, regra_desempenho: g.regra, paraquedas: [], por_validar: true };
    regras.plantel.max = g.max_plantel;
    origem.tv = g._origem;
    origem.max_plantel = g._origem;
  }
  porPais.set(pais, [...(porPais.get(pais) ?? []), regras]);
}
for (const ligas of porPais.values()) {
  ligas.sort((a, b) => a.nivel - b.nivel);
  ligas[ligas.length - 1].descidas.exterior = ligas[ligas.length - 1].descidas.directas > 0;
}

// ---------------- Taças ----------------
const nomePais = new Map<string, string>(Object.entries(COMP.paises).map(([k, v]) => [(v as { nome: string }).nome, k]));
nomePais.set('Inglaterra', 'ENG');
const tacasPor = new Map<string, RegrasTaca[]>();
for (const r of compF) {
  if (String(r.tipo).trim() !== 'taça nacional') continue;
  const id = String(r['id_competição']).trim();
  const pais = id.slice(0, 3);
  const participantes = ligasDoTexto(String(r.participantes_regra ?? ''));
  const jpr = String(r.jogos_por_ronda ?? '');
  const todas2 = /ida e volta em todas|^ida e volta$/.test(jpr.trim());
  const maos = { rondas: (todas2 ? 2 : 1) as 1 | 2, meias: (todas2 || /meias-finais ida e volta/.test(jpr) ? 2 : 1) as 1 | 2, final: (/final ida e volta/.test(jpr) ? 2 : 1) as 1 | 2 };
  const c = COMP.tacas[id];
  const origem: Record<string, string> = { maos: `folha ("${jpr}")` };
  let entrada: Record<string, number>;
  if (c) { entrada = c.entrada; origem.entrada = c.origem_entrada; }
  else {
    entrada = Object.fromEntries(participantes.map((l) => [l, participantes.length > 1 && l.endsWith('1') ? 2 : 1]));
    origem.entrada = participantes.length > 1 ? COMP.tacas_padrao.entrada : 'folha (uma só liga: todos na 1.ª ronda)';
  }
  const vaga = /UECL/.test(String(r.vaga_para_vencedor ?? '')) ? 'UECL' : /UEL/.test(String(r.vaga_para_vencedor ?? '')) ? 'UEL' : null;
  const lista = tacasPor.get(pais) ?? [];
  lista.push({
    id, nome: String(r.nome), tipo: 'taca', pais, participantes, entrada_por_liga: entrada, maos,
    final_neutra: /^sim/i.test(String(r.final_campo_neutro ?? '')), vaga_vencedor: vaga, secundaria: lista.length > 0,
    premios: premiosPor.get(id) ?? [], premio_total_eur: num(r['prémio_total_eur']), fonte: txt(r.fonte), notas: txt(r.notas), origem_campos: origem,
  });
  tacasPor.set(pais, lista);
  const soma = participantes.reduce((s, l) => s + ((porPais.get(pais) ?? []).find((x) => x.id === l)?.formato.equipas ?? 0), 0);
  if (num(r['nº_equipas']) !== null && soma !== num(r['nº_equipas'])) nota(`- ${id}: a folha diz ${r['nº_equipas']} equipas; as ligas participantes somam ${soma} (o jogo usa ${soma}).`);
}

// ---------------- Competições continentais ----------------
const continentais = [];
for (const r of compF) {
  if (String(r.tipo).trim() !== 'continental') continue;
  const id = String(r['id_competição']).trim();
  const f = String(r.formato ?? '');
  const conf = String(r['país_ou_confederação']).trim();
  const jogos = Number(f.match(/\((\d+) jogos por equipa/)?.[1] ?? 6);
  const base = { id, nome: String(r.nome), confederacao: conf, calendario: COMP.calendario.continentais[id] ?? 'ago_mai', equipas: Number(r['nº_equipas']), formato_folha: f, premios: premiosPor.get(id) ?? [], eliminatorias_maos: 2, final: 'neutra', notas: txt(r.notas) };
  if (/fase de liga/.test(f)) {
    continentais.push({ ...base, tipo: 'fase_liga', jogos_por_equipa: jogos, potes: 4, jogos_mesmo_pote: jogos === 8, mesmo_pais_proibido: true, max_mesmo_pais_por_adversarios: 2, directos_oitavos: [1, 8], playoff: [9, 24] });
  } else {
    continentais.push({ ...base, tipo: 'grupos', grupos: 4, por_grupo: 4, voltas: 2, apuram_por_grupo: 2, mesmo_pais_no_grupo: false });
  }
}

// ---------------- Vagas ----------------
type Q = { liga?: number; taca?: number };
const vagas: Record<string, Record<string, Q>> = {};
const especiais: { detentores: { de: string; para: string }[]; bonus_ranking: { para: string; paises: number } | null; perdedores_po: { de: string; para: string }[] } = { detentores: [], bonus_ranking: null, perdedores_po: [] };
for (const r of vagasF) {
  const dest = String(r['id_competição_destino']).trim();
  const origemT = String(r.origem).trim();
  const n = Number(r['nº_vagas']);
  const ronda = String(r.ronda_entrada ?? '');
  const po = /play-off de acesso/.test(ronda);
  const comp = po ? `${dest}_PO` : dest;
  const det = origemT.match(/^(UCL|UEL|UECL) \(campeão em título\)/);
  if (det) { especiais.detentores.push({ de: det[1], para: dest }); continue; }
  const perd = origemT.match(/^(UCL|UEL) \(perdedores do play-off/);
  if (perd) { especiais.perdedores_po.push({ de: `${perd[1]}_PO`, para: dest }); continue; }
  if (/^Ranking UEFA/.test(origemT)) { especiais.bonus_ranking = { para: dest, paises: n }; continue; }
  const liga = origemT.match(/^([A-Z]{3}\d)/)?.[1];
  if (!liga) { nota(`- Vagas: origem não reconhecida "${origemT}"`); continue; }
  const taca = /campeão/.test(origemT);
  vagas[liga] ??= {};
  vagas[liga][comp] ??= {};
  const q = vagas[liga][comp];
  if (taca) q.taca = (q.taca ?? 0) + n; else q.liga = (q.liga ?? 0) + n;
}
// Confere com a folha "Europa" do segundo ficheiro.
const COLS: [string, string][] = [['UCL fase de liga', 'UCL'], ['UCL play-off', 'UCL_PO'], ['UEL fase de liga', 'UEL'], ['UEL play-off', 'UEL_PO'], ['UECL', 'UECL']];
for (const e of europaF) {
  const liga = String(e.Liga).trim();
  for (const [col, comp] of COLS) {
    const a = Number(e[col] ?? 0);
    const q = vagas[liga]?.[comp] ?? {};
    const b = (q.liga ?? 0) + (q.taca ?? 0);
    if (a !== b) nota(`- Vagas ${liga} ${comp}: folha Europa diz ${a}, folha Vagas diz ${b} (uso a folha Vagas).`);
  }
}

// ---------------- Escrita dos pacotes ----------------
const CABECALHOS: Record<string, string> = {
  'clubes.csv': 'id,nome,nome_curto,cidade,cor1,cor2,reputacao,estadio,capacidade,liga,origem',
  'jogadores.csv': 'id,nome,data_nascimento,pais_formacao,clube,posicao,origem',
  'treinadores.csv': 'id,nome,data_nascimento,pais,clube,origem',
  'staff.csv': 'id,nome,funcao,clube,origem',
  'donos.csv': 'id,nome,tipo,clube,origem',
  'estadios.csv': 'id,nome,cidade,capacidade,clube,origem',
  'rivalidades.csv': 'clube_a,clube_b,intensidade,origem',
};
const json = (o: unknown) => JSON.stringify(o, null, 2) + '\n';
const escritos = new Set<string>(['_continental']);
for (const [pais, ligas] of porPais) {
  const p = COMP.paises[pais];
  if (!p) throw new Error(`complementos: país ${pais} sem entrada`);
  const dir = join(PACKS, p.pacote);
  escritos.add(p.pacote);
  rmSync(join(dir, 'competicoes'), { recursive: true, force: true });
  mkdirSync(join(dir, 'competicoes'), { recursive: true });
  const tacas = tacasPor.get(pais) ?? [];
  const quotas = COMP.ligas[ligas[0].id]?.quotas?.valor;
  const manifest: Manifest = {
    id: p.pacote, nome: p.nome, tipo: p.regional ? 'regional' : 'pais', pais: p.regional ? null : pais, confederacao: p.confederacao as Confederacao,
    versao: '0.2.0', piramide: ligas.map((l) => l.id), tacas: tacas.map((t) => t.id), perfil_nomes: p.perfil, activo: true,
    ...(quotas ? { quotas_paises: quotas } : {}),
  };
  writeFileSync(join(dir, 'manifest.json'), json(manifest));
  for (const l of ligas) writeFileSync(join(dir, 'competicoes', `${l.id}.json`), json(l));
  for (const t of tacas) writeFileSync(join(dir, 'competicoes', `${t.id}.json`), json(t));
  for (const [f, h] of Object.entries(CABECALHOS)) if (!existsSync(join(dir, f))) writeFileSync(join(dir, f), h + '\n');
  if (!existsSync(join(dir, 'overrides.json'))) writeFileSync(join(dir, 'overrides.json'), '{}\n');
}
const cont = join(PACKS, '_continental');
rmSync(join(cont, 'competicoes'), { recursive: true, force: true });
mkdirSync(join(cont, 'competicoes'), { recursive: true });
for (const c of continentais) writeFileSync(join(cont, 'competicoes', `${c.id}.json`), json(c));
writeFileSync(join(cont, 'manifest.json'), json({ id: '_continental', nome: 'Competições continentais', tipo: 'continental', versao: '0.2.0', competicoes: continentais.map((c) => c.id), activo: true }));
writeFileSync(join(cont, 'vagas.json'), json({
  _notas: 'Gerado de data/fontes (folha Vagas). Chave = liga de origem. "X_PO" = play-off de acesso a X. Ordem de atribuição por liga: UCL, UCL_PO, UEL (taça antes de liga), UEL_PO, UECL (taça antes de liga); cada vaga vai ao melhor classificado ainda sem vaga.',
  ordem_competicoes: { UEFA: ['UCL', 'UCL_PO', 'UEL', 'UEL_PO', 'UECL'], CONMEBOL: ['CLI'], AFC: ['ACLE'] },
  vagas, especiais,
  primeira_epoca: { detentores: COMP.uefa.detentores_1a_epoca, bonus_ranking: COMP.uefa.bonus_ranking_1a_epoca },
}));
// Pacotes que deixaram de existir: apaga só se não tiverem dados.
for (const d of readdirSync(PACKS)) {
  if (escritos.has(d) || d.startsWith('_')) continue;
  const temDados = Object.keys(CABECALHOS).some((f) => existsSync(join(PACKS, d, f)) && readFileSync(join(PACKS, d, f), 'utf8').trim().split('\n').length > 1)
    || (existsSync(join(PACKS, d, 'overrides.json')) && readFileSync(join(PACKS, d, 'overrides.json'), 'utf8').trim() !== '{}');
  if (temDados) nota(`- Pacote ${d} já não está nas folhas mas tem dados: não foi apagado (desactiva-o à mão).`);
  else { rmSync(join(PACKS, d), { recursive: true }); nota(`- Pacote ${d} removido (já não está nas folhas e não tinha dados).`); }
}
writeFileSync(join(FONTES, 'importacao.md'), `# Última importação das folhas\n\n${new Date().toISOString().slice(0, 10)}\n\n${relatorio.join('\n') || 'Sem avisos.'}\n`);
console.log(`Ligas: ${[...porPais.values()].flat().length}; taças: ${[...tacasPor.values()].flat().length}; continentais: ${continentais.length}.`);
console.log(relatorio.join('\n'));
