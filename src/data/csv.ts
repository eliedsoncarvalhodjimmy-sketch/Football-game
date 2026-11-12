// Parser CSV mínimo (vírgula, aspas duplas, cabeçalho na 1.ª linha).

export function parseCsv(texto: string): Record<string, string>[] {
  const linhas = splitLinhas(texto.replace(/^﻿/, ''));
  if (linhas.length === 0) return [];
  const cab = linhas[0].map((c) => c.trim());
  return linhas.slice(1)
    .filter((l) => l.some((c) => c.trim() !== ''))
    .map((l) => Object.fromEntries(cab.map((c, i) => [c, (l[i] ?? '').trim()])));
}

function splitLinhas(t: string): string[][] {
  const out: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ',') { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); out.push(linha); linha = []; campo = '';
    } else campo += ch;
  }
  if (campo !== '' || linha.length) { linha.push(campo); out.push(linha); }
  return out.filter((l) => !(l.length === 1 && l[0] === ''));
}

export function toCsv(cabecalho: string[], linhas: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cabecalho.join(','), ...linhas.map((l) => l.map(esc).join(','))].join('\n') + '\n';
}
