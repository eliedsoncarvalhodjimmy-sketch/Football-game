// App shell: top bar + tab navigation.

import type { WorkerClient } from '../worker/client';
import type { WorldSummary } from '../worker/protocol';
import { clear, h } from './dom';
import { dataToolsView } from './views/dataTools';
import { worldView } from './views/world';

interface Tab {
  id: string;
  label: string;
  phase?: number; // phase in which the tab gets real content
  render?: () => HTMLElement;
}

export function startApp(root: HTMLElement, client: WorkerClient): void {
  let summary: WorldSummary | null = null;
  const status = h('span', { class: 'status' });
  const main = h('main', {});
  const nav = h('nav', { class: 'tabs' });
  let current = 'data';

  const tabs: Tab[] = [
    { id: 'home', label: 'Início', phase: 4 },
    { id: 'squad', label: 'Plantel', phase: 2 },
    { id: 'academy', label: 'Academia', phase: 6 },
    { id: 'scouting', label: 'Scouting', phase: 6 },
    { id: 'market', label: 'Mercado', phase: 5 },
    { id: 'finance', label: 'Finanças', phase: 4 },
    { id: 'board', label: 'Federação', phase: 4 },
    { id: 'world', label: 'Mundo', render: () => (summary ? worldView(client) : noWorld()) },
    { id: 'data', label: 'Dados', render: () => dataToolsView(client, onWorldChanged) },
  ];

  function noWorld() {
    return h('div', { class: 'view placeholder' }, 'Ainda não há mundo. Vai a "Dados" e gera o mundo de teste ou importa os teus ficheiros.');
  }

  function onWorldChanged(s: WorldSummary | null) {
    summary = s;
    clear(status);
    if (s) status.append(`${s.countries} países · ${s.players} jogadores `, s.isTestData ? h('span', { class: 'badge test' }, 'DADOS DE TESTE') : '');
    else status.textContent = 'Sem mundo carregado';
  }

  function show(id: string) {
    current = id;
    for (const b of nav.querySelectorAll('button')) b.classList.toggle('active', b.dataset.tab === id);
    const t = tabs.find((x) => x.id === id)!;
    clear(main);
    main.append(t.render ? t.render() : h('div', { class: 'view placeholder' }, `${t.label}: disponível na fase ${t.phase}.`));
  }

  for (const t of tabs) {
    const b = h('button', { onclick: () => show(t.id) }, t.label);
    b.dataset.tab = t.id;
    nav.append(b);
  }

  root.append(h('header', { class: 'topbar' }, h('span', { class: 'brand' }, 'FutCEO'), status), nav, main);
  onWorldChanged(null);
  void client.request({ type: 'summary' }).then(onWorldChanged);
  show(current);
}
