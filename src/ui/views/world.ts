// "Mundo" tab: countries → leagues → clubs → squad → player detail.

import { FAMILIARITY_LABELS, POSITION_LABELS, type Position } from '../../config/attributes.config';
import type { WorkerClient } from '../../worker/client';
import type { ClubRow, CountryRow, PlayerDetail, PlayerRow } from '../../worker/protocol';
import { VirtualList } from '../components/virtualList';
import { clear, crestEl, h } from '../dom';

const GROUP_LABELS: Record<string, string> = { technical: 'Técnicos', mental: 'Mentais', physical: 'Físicos', goalkeeping: 'Guarda-redes' };
const attrClass = (v: number) => (v >= 15 ? 'a-hi' : v <= 7 ? 'a-lo' : 'a-mid');
const posLabel = (p: string) => POSITION_LABELS[p as Position] ?? p;

export function worldView(client: WorkerClient): HTMLElement {
  const root = h('div', { class: 'split' });
  const countrySel = h('select', {});
  const leagueSel = h('select', {});
  const search = h('input', { type: 'text', placeholder: 'Pesquisar jogador…' });
  const clubTitle = h('span', { class: 'dim' }, 'Escolhe um clube');
  const detail = h('div', { class: 'body', style: { padding: '12px' } }, h('div', { class: 'placeholder' }, 'Escolhe um jogador'));

  let countries: CountryRow[] = [];
  let squad: PlayerRow[] = [];

  const clubList = new VirtualList<ClubRow>({
    rowHeight: 44,
    render: (c) => h('div', {}, crestEl(c.crest, c.shortName, c.colorPrimary, c.colorSecondary),
      h('span', { class: 'grow' }, c.name, c.rivals.length ? h('span', { class: 'dim' }, `  ⚔ ${c.rivals.join(', ')}`) : null),
      h('span', { class: 'num dim', title: 'Reputação' }, c.reputation),
      h('span', { class: 'num', title: 'Média do melhor onze (OVR)' }, c.avgOvr)),
    onSelect: (c) => void loadSquad(c),
  });
  const playerList = new VirtualList<PlayerRow>({
    rowHeight: 44,
    render: (p) => h('div', {}, h('span', { class: 'pos' }, posLabel(p.position)),
      h('span', { class: 'grow' }, p.name, h('span', { class: 'dim' }, `  ${p.nationality}`)),
      h('span', { class: 'num dim' }, p.age), h('span', { class: 'num' }, p.ovr)),
    onSelect: (p) => void loadPlayer(p.id),
  });

  async function loadLeague() {
    clubList.setItems(await client.request({ type: 'leagueClubs', leagueId: leagueSel.value }));
  }
  function fillLeagues() {
    const c = countries.find((x) => x.id === countrySel.value);
    clear(leagueSel);
    for (const l of c?.leagues ?? []) leagueSel.append(h('option', { value: l.id }, `${l.tier}.ª — ${l.name} (${l.clubs})`));
    void loadLeague();
  }
  async function loadSquad(c: ClubRow) {
    clubTitle.textContent = `${c.name} — ${c.city}`;
    squad = await client.request({ type: 'clubSquad', clubId: c.id });
    applySearch();
  }
  function applySearch() {
    const q = search.value.trim().toLowerCase();
    playerList.setItems(q ? squad.filter((p) => p.name.toLowerCase().includes(q)) : squad);
  }
  async function loadPlayer(id: string) {
    const d = await client.request({ type: 'playerDetail', playerId: id });
    clear(detail);
    if (d) detail.append(renderPlayer(d));
  }

  countrySel.addEventListener('change', fillLeagues);
  leagueSel.addEventListener('change', () => void loadLeague());
  search.addEventListener('input', applySearch);

  root.append(
    h('section', { class: 'pane' }, h('header', {}, countrySel, leagueSel), h('div', { class: 'body' }, clubList.el)),
    h('section', { class: 'pane' }, h('header', {}, clubTitle, search), h('div', { class: 'body' }, playerList.el)),
    h('section', { class: 'pane' }, h('header', {}, 'Jogador'), detail),
  );

  (async () => {
    countries = await client.request({ type: 'countries' });
    for (const c of countries) countrySel.append(h('option', { value: c.id }, c.name));
    countrySel.value = countries.find((c) => c.id === 'POR') ? 'POR' : countries[0]?.id ?? '';
    fillLeagues();
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
  return h('div', {},
    h('h2', {}, d.name),
    h('table', { class: 'kv' },
      h('tr', {}, h('td', { class: 'dim' }, 'Clube'), h('td', {}, d.club)),
      h('tr', {}, h('td', { class: 'dim' }, 'Posição'), h('td', {}, posLabel(d.position))),
      h('tr', {}, h('td', { class: 'dim' }, 'Idade'), h('td', {}, d.age)),
      h('tr', {}, h('td', { class: 'dim' }, 'OVR'), h('td', {}, d.ovr)),
      h('tr', {}, h('td', { class: 'dim' }, 'Nacionalidade'), h('td', {}, d.nationality)),
      h('tr', {}, h('td', { class: 'dim' }, 'Pé / altura'), h('td', {}, `${d.foot} / ${d.heightCm} cm`))),
    h('h3', {}, 'Familiaridade'),
    h('div', { class: 'row' }, ...d.familiarity.map((f) => h('span', { class: 'badge' }, `${posLabel(f.position)} · ${FAMILIARITY_LABELS[f.level]}`))),
    ...[...groups.entries()].flatMap(([g, attrs]) => [
      h('h3', {}, GROUP_LABELS[g] ?? g),
      h('div', { class: 'attrs' }, ...attrs.map((a) =>
        h('div', { class: `attr${a.manual ? ' manual' : ''}`, title: a.manual ? 'Editado à mão' : '' }, a.label, h('b', { class: attrClass(a.value) }, a.value)))),
    ]),
  );
}
