// "Dados" tab: generate the test world, import your files, export/import attributes, save slots.

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
    `${s.name}${s.isTestData ? ' (dados de teste)' : ''}`,
    `${s.countries} países · ${s.leagues} ligas · ${s.clubs} clubes · ${s.players} jogadores (${s.freeAgents} livres)`,
    `Semente ${s.seed} · ${s.overrideCells} valores editados à mão · ${s.buildMs} ms`,
  ];

  // --- generate
  const seedInput = h('input', { type: 'number', value: '20260801', style: { width: '140px' } });
  const genBtn = h('button', { class: 'btn primary', onclick: async () => {
    const s = await busy('A gerar mundo fictício', () => client.request({ type: 'generateWorld', seed: Number(seedInput.value) || undefined }));
    if (s) { log('Mundo de teste gerado', summaryLines(s)); onWorldChanged(s); }
  } }, 'Gerar mundo de teste');

  // --- import files
  const filesInput = h('input', { type: 'file', multiple: true, accept: '.csv,.json' });
  const importBtn = h('button', { class: 'btn', onclick: async () => {
    const files = await readFiles(filesInput.files);
    if (!Object.keys(files).length) return log('Escolhe os ficheiros (clubs.csv, players.csv e opcionalmente world.json e attributes.csv).');
    const r = await busy('A importar ficheiros', () => client.request({ type: 'importFiles', files }));
    if (!r) return;
    if (!r.summary) return log('Importação falhou', [], r.issues);
    const extra = r.attributes ? [`attributes.csv: ${r.attributes.overridesSet} valores manuais aplicados`] : [];
    log('Ficheiros importados', [...summaryLines(r.summary), ...extra], [...r.issues, ...(r.attributes?.issues ?? [])]);
    onWorldChanged(r.summary);
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
          ` — ${s.worldName}${s.isTestData ? ' (teste)' : ''} · ${s.clubs} clubes · ${(s.bytes / 1e6).toFixed(1)} MB · ${new Date(s.updatedAt).toLocaleString('pt-PT')}`)),
        h('button', { class: 'btn', onclick: async () => {
          const sum = await busy('A carregar', () => client.request({ type: 'loadSlot', slotId: s.slotId }));
          if (sum) { log('Gravação carregada', summaryLines(sum)); onWorldChanged(sum); slotName.value = s.name; }
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

  void refreshSlots().catch(() => slotsBox.append(h('div', { class: 'dim' }, 'IndexedDB indisponível.')));

  return h('div', { class: 'view' },
    h('h2', {}, 'Dados'),
    h('div', { class: 'card' }, h('h3', {}, 'Mundo de teste (fictício)'),
      h('p', { class: 'dim' }, '29 países, 64 ligas, nomes inventados. Mesma semente ⇒ mesmo mundo.'),
      h('div', { class: 'row' }, h('label', { class: 'dim' }, 'Semente'), seedInput, genBtn)),
    h('div', { class: 'card' }, h('h3', {}, 'Os teus ficheiros'),
      h('p', { class: 'dim' }, 'clubs.csv e players.csv (obrigatórios); world.json e attributes.csv (opcionais). Emblemas em public/crests/.'),
      h('div', { class: 'row' }, filesInput, importBtn)),
    h('div', { class: 'card' }, h('h3', {}, 'Atributos gerados'),
      h('p', { class: 'dim' }, 'Exporta, edita numa folha de cálculo e reimporta. Valores diferentes do gerado ficam como edição manual e têm prioridade; uma célula vazia volta ao valor gerado.'),
      h('div', { class: 'row' }, delimSel, exportBtn),
      h('div', { class: 'row', style: { marginTop: '8px' } }, attrInput, attrBtn)),
    h('div', { class: 'card' }, h('h3', {}, 'Gravações'), h('div', { class: 'row' }, slotName, saveBtn), slotsBox),
    out,
  );
}
