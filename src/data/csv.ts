// Small RFC 4180 CSV parser/serialiser. Handles quotes, escaped quotes, CRLF, UTF-8 BOM,
// and auto-detects "," or ";" as delimiter (spreadsheets in pt-PT locales usually save with ";").

export type CsvRow = Record<string, string>;

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
  delimiter: string;
  /** 1-based source line of each row (for error messages). */
  lines: number[];
}

export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ';' : ',';
}

export function parseCsvRaw(text: string, delimiter?: string): { records: string[][]; lines: number[]; delimiter: string } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const d = delimiter ?? detectDelimiter(text);
  const records: string[][] = [];
  const lines: number[] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      if (ch === '\n') line++;
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; i++; continue; }
    if (ch === d) { record.push(field); field = ''; i++; continue; }
    if (ch === '\r' || ch === '\n') {
      record.push(field); field = '';
      if (!(record.length === 1 && record[0] === '')) { records.push(record); lines.push(recordLine); }
      record = [];
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++; line++; recordLine = line;
      continue;
    }
    field += ch; i++;
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    if (!(record.length === 1 && record[0] === '')) { records.push(record); lines.push(recordLine); }
  }
  return { records, lines, delimiter: d };
}

export function parseCsv(text: string, delimiter?: string): ParsedCsv {
  const { records, lines, delimiter: d } = parseCsvRaw(text, delimiter);
  if (records.length === 0) return { headers: [], rows: [], delimiter: d, lines: [] };
  const headers = records[0].map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let r = 1; r < records.length; r++) {
    const rec = records[r];
    const row: CsvRow = {};
    for (let c = 0; c < headers.length; c++) row[headers[c]] = (rec[c] ?? '').trim();
    rows.push(row);
  }
  return { headers, rows, delimiter: d, lines: lines.slice(1) };
}

function escapeField(v: string, d: string): string {
  return /["\r\n]/.test(v) || v.includes(d) ? `"${v.replaceAll('"', '""')}"` : v;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly (string | number)[])[], delimiter = ','): string {
  const out: string[] = [headers.map((h) => escapeField(h, delimiter)).join(delimiter)];
  for (const r of rows) out.push(r.map((v) => escapeField(String(v), delimiter)).join(delimiter));
  return out.join('\n') + '\n';
}

/** Separator for list values inside a single cell (rivals, other positions). */
export const LIST_SEP = '|';
export const splitList = (s: string | undefined): string[] =>
  (s ?? '').split(LIST_SEP).map((x) => x.trim()).filter(Boolean);
