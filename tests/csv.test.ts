import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv, splitList, toCsv } from '../src/data/csv';

describe('csv', () => {
  it('round-trips quotes, delimiters, newlines and accents', () => {
    const headers = ['id', 'name', 'note'];
    const rows = [
      ['1', 'São "Zé" Júnior', 'a,b'],
      ['2', 'Linha\nnova', 'x;y'],
      ['3', '', 'ç'],
    ];
    for (const d of [',', ';']) {
      const text = toCsv(headers, rows, d);
      const parsed = parseCsv(text);
      expect(parsed.delimiter).toBe(d);
      expect(parsed.headers).toEqual(headers);
      expect(parsed.rows.map((r) => headers.map((h) => r[h]))).toEqual(rows);
    }
  });

  it('handles BOM, CRLF and blank lines, and reports source lines', () => {
    const p = parseCsv('﻿a;b\r\n1;2\r\n\r\n3;4\r\n');
    expect(p.headers).toEqual(['a', 'b']);
    expect(p.rows).toEqual([{ a: '1', b: '2' }, { a: '3', b: '4' }]);
    expect(p.lines).toEqual([2, 4]);
  });

  it('detects the delimiter from the header', () => {
    expect(detectDelimiter('a,b,c\n')).toBe(',');
    expect(detectDelimiter('a;b;c\n')).toBe(';');
  });

  it('splits list cells', () => {
    expect(splitList(' C1 | C2 ||')).toEqual(['C1', 'C2']);
    expect(splitList('')).toEqual([]);
  });
});
