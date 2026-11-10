// "Dados" tab: generate the test world, import your files, export/import attributes, save slots.

import { GENERATOR } from '../../config/generator.config';
import type { DataIssue } from '../../data/DataSource';
import type { WorkerClient } from '../../worker/client';
import type { WorldSummary } from '../../worker/protocol';
import { clear, download, h, readFiles } from '../dom';

export function dataToolsView(client: WorkerClient, onWorldChanged: (s: WorldSummary | null) => void): HTMLElement {
  const out = h('div', { class: 'card' }, h('span', { class: 'dim' }, 'Sem operações ainda.'));
  const slotsBox = h('div', {});
  const log = (title: string, lines: (string | HTMLElement)[] = [], issues: DataIssue[] = []) => {
    clear(out);
    out.append(h('b', {}, title));
    for (const l of lines) out.append(h('div', {}, l));
    if (issues.length) {
      const errors = issues.filter((i) => i.level === 'error').length;
      out.append(h('div', { class: 'dim' }, `${errors} erro(s), ${issues.length - errors} aviso(s)`),
        h('div', { class: 'issues' }, ...issues.slice(0, 300).map((i) =>
          h('div', { class: i.level }, `${i.file}${i.line ? `:${i.line}` : ''}${i.column ? ` [${i.column}]` : ''} — ${i.message}`))));
    }
  };
  const busy = async <T>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
    log(`${label}…`);
    try { return await fn(); } catch (e) { log(`Erro: ${(e as Error).message}`); return undefined; }
  };
  const summaryLines = (s: WorldSummary) => [
    `${s.name}${s.isTestData ? ' (contém dados de teste)' : ''}`,
    `${s.confederations} confederações · ${s.divisions} divisões · ${s.countries} países-clube · ${s.players} jogadores (${s.generatedPlayers} gerados, ${s.freeAgents} livres)`,
    `Transferências: ${s.transfers.map((t) => `${t.country} ${t.from}→${t.to}${t.confirmed ? '' : ' (pendente)'}`).join(', ') || 'nenhuma'}`,
    `Semente ${s.seed} · ${s.overrideCells} valores editados à mão · ${s.economyMissing} países sem população/PIB · ${s.buildMs} ms`,
  ];

  // --- confederation counts report
  const countsBox = h('div', { class: 'dim' }, 'Gera ou importa um mundo para ver as contagens.');
  async function refreshCounts() {
    const r = await client.request({ type: 'counts' });
    clear(countsBox);
    if (!r) return countsBox.append('Gera ou importa um mundo para ver as contagens.');
    const td = (v: string | number, cls = '') => h('td', { class: cls }, v);
    countsBox.append(
      r.basedOnTestData ? h('p', { class: 'warning' }, '⚠ Ranking calculado com população e reputação INVENTADAS (mundo de teste). Só vale com os teus dados.') : '',
      h('table', { class: 'kv' },
        h('tr', {}, ...['Confederação', 'Próprios', 'Vagas', 'Sobra', 'Saem', 'Entram', 'Final', ''].map((x) => h('th', { class: 'dim', style: { textAlign: 'left' } }, x))),
        ...r.table.map((row) => h('tr', {}, td(row.confederation), td(row.own), td(row.slots), td(row.surplus), td(row.outgoing.join(', ')),
          td(row.incoming.join(', ')), td(row.final), td(row.ok ? '✓' : '✗', row.ok ? 'a-hi' : 'a-lo'))),
        h('tr', {}, td('Total'), td(r.table.reduce((s, x) => s + x.own, 0)), td(r.table.reduce((s, x) => s + x.slots, 0)), td(''), td(''), td(''), td(r.total))),
      ...Object.entries(r.ranking).map(([conf, list]) => h('div', { style: { marginTop: '8px' } },
        h('b', {}, `${conf} — mais fracos (50% população a 10% + 50% reputação): `),
        list.map((c, k) => `${k + 1}. ${c.name} (${c.score.toFixed(2)}${c.populationPct === null ? ', sem população' : ''})`).join(' · '))),
      h('p', { class: 'dim' }, `Transferências ${r.transfers.every((t) => t.confirmed) ? 'confirmadas' : 'PENDENTES de confirmação'}: `,
        r.transfers.map((t) => `${t.country} ${t.from} → ${t.to}`).join(', '),
        '. Para confirmar: CONFIRMED_TRANSFERS em src/config/confederations.config.ts.'),
    );
  }
  const worldChanged = (s: WorldSummary | null) => { onWorldChanged(s); void refreshCounts(); };

  // --- generate
  const seedInput = h('input', { type: 'number', value: String(GENERATOR.defaultSeed), style: { width: '140px' } });
  const genBtn = h('button', { class: 'btn primary', onclick: async () => {
    const s = await busy('A gerar mundo fictício', () => client.request({ type: 'generateWorld', seed: Number(seedInput.value) || undefined }));
    if (s) { log('Mundo de teste gerado', summaryLines(s)); worldChanged(s); }
  } }, 'Gerar mundo de teste');

  // --- import files
  const filesInput = h('input', { type: 'file', multiple: true, accept: '.csv,.json' });
  const importBtn = h('button', { class: 'btn', onclick: async () => {
    const files = await readFiles(filesInput.files);
    if (!Object.keys(files).length) return log('Escolhe os ficheiros (countries.csv, players.csv e opcionalmente initial_country.csv, world.json e attributes.csv).');
    const r = await busy('A importar ficheiros', () => client.request({ type: 'importFiles', files }));
    if (!r) return;
    if (!r.summary) return log('Importação falhou', [], r.issues);
    const extra = r.attributes ? [`attributes.csv: ${r.attributes.overridesSet} valores manuais aplicados`] : [];
    log('Ficheiros importados', [...summaryLines(r.summary), ...extra], [...r.issues, ...(r.attributes?.issues ?? [])]);
    worldChanged(r.summary);
  } }, 'Importar');

  // --- attributes export / import
  const delimSel = h('select', {}, h('option', { value: ',' }, 'Separador ,'), h('option', { value: ';' }, 'Separador ; (Excel PT)'));
  const exportBtn = h('button', { class: 'btn', onclick: async () => {
    const csv = await busy('A exportar atributos', () => client.request({ type: 'exportAttributes', delimiter: delimSel.value as ',' | ';' }));
    if (csv) { download('attributes.csv', csv); log('attributes.csv exportado', [`${csv.length.toLocaleString('pt-PT')} caracteres`]); }
  } }, 'Exportar atributos (CSV)');
  const attrInput = h('input', { type: 'file', accept: '.csv' });
  const attrBtn = h('button', { class: 'btn', onclick: async () => {
    const f = attrInput.files?.[0];
    if (!f) return log('Escolhe o attributes.csv editado.');
    const csv = await f.text();
    const r = await busy('A reimportar atributos', () => client.request({ type: 'importAttributes', csv }));
    if (!r) return;
    log('Atributos reimportados', [
      `${r.rows} linhas · ${r.playersTouched} jogadores alterados`,
      `${r.overridesSet} valores manuais definidos · ${r.overridesCleared} repostos ao valor gerado · ${r.unknownPlayers} desconhecidos`,
    ], r.issues);
    onWorldChanged(await client.request({ type: 'summary' }));
  } }, 'Reimportar atributos');

  // --- save slots
  const slotName = h('input', { type: 'text', placeholder: 'Nome da gravação', value: 'Gravação 1' });
  async function refreshSlots() {
    const slots = await client.request({ type: 'listSlots' });
    clear(slotsBox);
    if (!slots.length) slotsBox.append(h('div', { class: 'dim' }, 'Sem gravações.'));
    for (const s of slots) {
      slotsBox.append(h('div', { class: 'row', style: { padding: '6px 0', borderBottom: '1px solid var(--border)' } },
        h('span', { class: 'grow', style: { flex: '1' } }, h('b', {}, s.name), h('span', { class: 'dim' },
          ` — ${s.worldName}${s.isTestData ? ' (teste)' : ''} · ${s.countries} países · ${(s.bytes / 1e6).toFixed(1)} MB · ${new Date(s.updatedAt).toLocaleString('pt-PT')}`)),
        h('button', { class: 'btn', onclick: async () => {
          const sum = await busy('A carregar', () => client.request({ type: 'loadSlot', slotId: s.slotId }));
          if (sum) { log('Gravação carregada', summaryLines(sum)); worldChanged(sum); slotName.value = s.name; }
        } }, 'Carregar'),
        h('button', { class: 'btn', onclick: async () => {
          if (!confirm(`Apagar "${s.name}"?`)) return;
          await client.request({ type: 'deleteSlot', slotId: s.slotId });
          void refreshSlots();
        } }, 'Apagar')));
    }
  }
  const saveBtn = h('button', { class: 'btn primary', onclick: async () => {
    const name = slotName.value.trim() || 'Gravação';
    const slotId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r = await busy('A gravar', () => client.request({ type: 'saveSlot', slotId, name }));
    if (r) { log('Gravado', [`${r.written} blocos escritos, ${r.skipped} sem alterações · ${r.ms} ms`]); void refreshSlots(); }
  } }, 'Gravar');

  void refreshCounts().catch(() => undefined);
  void refreshSlots().catch(() => slotsBox.append(h('div', { class: 'dim' }, 'IndexedDB indisponível.')));

  return h('div', { class: 'view' },
    h('h2', {}, 'Dados'),
    h('div', { class: 'card' }, h('h3', {}, 'Mundo de teste (fictício)'),
      h('p', { class: 'dim' }, '213 países-clube reais em 6 confederações; jogadores, população, PIB e reputação INVENTADOS. Mesma semente ⇒ mesmo mundo.'),
      h('div', { class: 'row' }, h('label', { class: 'dim' }, 'Semente'), seedInput, genBtn)),
    h('div', { class: 'card' }, h('h3', {}, 'Os teus ficheiros'),
      h('p', { class: 'dim' }, 'countries.csv (população, PIB, reputação), players.csv (convocatórias), initial_country.csv (excepções), world.json e attributes.csv — todos opcionais; o que faltar é gerado. Bandeiras em public/assets/flags/.'),
      h('div', { class: 'row' }, filesInput, importBtn)),
    h('div', { class: 'card' }, h('h3', {}, 'Contagens por confederação'), countsBox),
    h('div', { class: 'card' }, h('h3', {}, 'Atributos gerados'),
      h('p', { class: 'dim' }, 'Exporta, edita numa folha de cálculo e reimporta. Valores diferentes do gerado ficam como edição manual e têm prioridade; uma célula vazia volta ao valor gerado.'),
      h('div', { class: 'row' }, delimSel, exportBtn),
      h('div', { class: 'row', style: { marginTop: '8px' } }, attrInput, attrBtn)),
    h('div', { class: 'card' }, h('h3', {}, 'Gravações'), h('div', { class: 'row' }, slotName, saveBtn), slotsBox),
    out,
  );
}
