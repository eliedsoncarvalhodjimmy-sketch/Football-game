// "Mundo" tab: confederation → division → country-club → squad (by level) → player detail.

import { FAMILIARITY_LABELS, POSITION_LABELS, type Position } from '../../config/attributes.config';
import type { SquadLevel } from '../../engine/types';
import type { WorkerClient } from '../../worker/client';
import type { ConfederationRow, CountryRow, PlayerDetail, PlayerRow } from '../../worker/protocol';
import { VirtualList } from '../components/virtualList';
import { clear, eur, flagEl, h } from '../dom';

const GROUP_LABELS: Record<string, string> = { technical: 'Técnicos', mental: 'Mentais', physical: 'Físicos', goalkeeping: 'Guarda-redes' };
const LEVEL_LABELS: Record<SquadLevel, string> = { senior: 'Principal', u23: 'Sub-23', u19: 'Sub-19', u17: 'Sub-17' };
const attrClass = (v: number) => (v >= 15 ? 'a-hi' : v <= 7 ? 'a-lo' : 'a-mid');
const posLabel = (p: string) => POSITION_LABELS[p as Position] ?? p;
const fmtInt = (n: number) => n.toLocaleString('pt-PT');

export function worldView(client: WorkerClient): HTMLElement {
  const root = h('div', { class: 'split' });
  const confSel = h('select', {});
  const divSel = h('select', {});
  const levelSel = h('select', {}, ...(Object.keys(LEVEL_LABELS) as SquadLevel[]).map((l) => h('option', { value: l }, LEVEL_LABELS[l])));
  const search = h('input', { type: 'text', placeholder: 'Pesquisar…', style: { flex: '1 1 120px', minWidth: '0' } });
  const countryTitle = h('div', { class: 'dim', style: { width: '100%' } }, 'Escolhe um país');
  const detail = h('div', { class: 'body', style: { padding: '12px' } }, h('div', { class: 'placeholder' }, 'Escolhe um jogador'));

  let confs: ConfederationRow[] = [];
  let current: CountryRow | null = null;
  let squad: PlayerRow[] = [];

  const countryList = new VirtualList<CountryRow>({
    rowHeight: 44,
    render: (c) => h('div', {}, flagEl(c.flag, c.id, c.colorPrimary, c.colorSecondary),
      h('span', { class: 'grow' }, c.name,
        c.transferredFrom ? h('span', { class: 'badge', title: 'Confederação original' }, ` ${c.transferredFrom} →`) : null,
        c.rivals.length ? h('span', { class: 'dim' }, `  ⚔ ${c.rivals.join(' ')}`) : null),
      h('span', { class: 'num dim', title: 'Reputação' }, c.reputation),
      h('span', { class: 'num', title: 'Média do melhor onze (OVR)' }, c.avgOvr)),
    onSelect: (c) => { current = c; void loadSquad(); },
  });
  const playerList = new VirtualList<PlayerRow>({
    rowHeight: 44,
    render: (p) => h('div', {}, h('span', { class: 'pos' }, posLabel(p.position)),
      h('span', { class: 'grow' }, p.name, h('span', { class: current && p.nationality !== current.id ? '' : 'dim', title: 'País de formação' }, `  ${p.nationality}`)),
      h('span', { class: 'num dim' }, p.age), h('span', { class: 'num' }, p.ovr)),
    onSelect: (p) => void loadPlayer(p.id),
  });

  async function loadDivision() {
    countryList.setItems(await client.request({ type: 'divisionCountries', divisionId: divSel.value }));
  }
  function fillDivisions() {
    const c = confs.find((x) => x.id === confSel.value);
    clear(divSel);
    for (const d of c?.divisions ?? []) divSel.append(h('option', { value: d.id }, `${d.tier}.ª — ${d.name} (${d.teams})`));
    void loadDivision();
  }
  async function loadSquad() {
    if (!current) return;
    const c = current;
    clear(countryTitle);
    countryTitle.append(h('b', {}, c.name),
      ` · ${c.homeGrown}/${c.squadSize} formados no país · população (10%): ${c.populationGame === null ? '—' : fmtInt(c.populationGame)}`,
      c.economyStatus === 'test' ? h('span', { class: 'badge test' }, ' TESTE') : c.economyStatus === 'missing' ? h('span', { class: 'badge test' }, ' a preencher') : '');
    squad = await client.request({ type: 'countrySquad', countryId: c.id, level: levelSel.value as SquadLevel });
    applySearch();
  }
  function applySearch() {
    const q = search.value.trim().toLowerCase();
    playerList.setItems(q ? squad.filter((p) => p.name.toLowerCase().includes(q) || p.nationality.toLowerCase() === q) : squad);
  }
  async function loadPlayer(id: string) {
    const d = await client.request({ type: 'playerDetail', playerId: id });
    clear(detail);
    if (d) detail.append(renderPlayer(d));
  }

  confSel.addEventListener('change', fillDivisions);
  divSel.addEventListener('change', () => void loadDivision());
  levelSel.addEventListener('change', () => void loadSquad());
  search.addEventListener('input', applySearch);

  root.append(
    h('section', { class: 'pane' }, h('header', {}, confSel, divSel), h('div', { class: 'body' }, countryList.el)),
    h('section', { class: 'pane' }, h('header', {}, countryTitle, levelSel, search), h('div', { class: 'body' }, playerList.el)),
    h('section', { class: 'pane' }, h('header', {}, 'Jogador'), detail),
  );

  (async () => {
    confs = await client.request({ type: 'confederations' });
    for (const c of confs) confSel.append(h('option', { value: c.id }, `${c.name} · ${c.cup}`));
    fillDivisions();
  })().catch((e) => root.replaceChildren(h('div', { class: 'placeholder' }, String(e.message ?? e))));

  return root;
}

function renderPlayer(d: PlayerDetail): HTMLElement {
  const groups = new Map<string, PlayerDetail['attributes']>();
  for (const a of d.attributes) {
    if (a.group === 'goalkeeping' && d.position !== 'GK') continue;
    const g = groups.get(a.group) ?? [];
    g.push(a);
    groups.set(a.group, g);
  }
  const row = (k: string, v: string | number) => h('tr', {}, h('td', { class: 'dim' }, k), h('td', {}, v));
  return h('div', {},
    h('h2', {}, d.name, d.generated ? h('span', { class: 'badge test', style: { marginLeft: '8px' } }, 'gerado') : null),
    h('table', { class: 'kv' },
      row('Joga em', d.team),
      row('Formado em', d.nationality),
      row('Escalão', LEVEL_LABELS[d.squad]),
      row('Posição', posLabel(d.position)),
      row('Idade', d.age),
      row('OVR', d.ovr),
      row('Valor', d.valueEur ? eur(d.valueEur) : '—'),
      row('Pé / altura', `${d.foot} / ${d.heightCm} cm`)),
    h('h3', {}, 'Familiaridade'),
    h('div', { class: 'row' }, ...d.familiarity.map((f) => h('span', { class: 'badge' }, `${posLabel(f.position)} · ${FAMILIARITY_LABELS[f.level]}`))),
    ...[...groups.entries()].flatMap(([g, attrs]) => [
      h('h3', {}, GROUP_LABELS[g] ?? g),
      h('div', { class: 'attrs' }, ...attrs.map((a) =>
        h('div', { class: `attr${a.manual ? ' manual' : ''}`, title: a.manual ? 'Editado à mão' : '' }, a.label, h('b', { class: attrClass(a.value) }, a.value)))),
    ]),
  );
}
