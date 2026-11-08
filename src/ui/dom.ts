// Tiny DOM helper (no framework).

type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function download(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  // BOM so spreadsheet apps read UTF-8 accents correctly
  const blob = new Blob(['﻿', text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readFiles(list: FileList | null): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!list) return out;
  for (const f of Array.from(list)) out[(f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name] = await f.text();
  return out;
}

export function crestEl(crest: string, short: string, c1: string, c2: string): HTMLElement {
  const el = h('div', { class: 'crest', style: { background: c1, color: c2, border: `2px solid ${c2}` } });
  if (crest) {
    const img = h('img', { src: `crests/${encodeURIComponent(crest)}`, alt: short });
    img.onerror = () => { img.remove(); el.textContent = short; };
    el.append(img);
  } else el.textContent = short;
  return el;
}
