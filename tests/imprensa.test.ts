import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { lerGuioes, validarGuioes } from '../src/imprensa/guioes';

const g = lerGuioes(readFileSync('data/imprensa/guioes.md', 'utf8'));
const porId = (id: string) => g.find((p) => p.id === id)!;

describe('guiões de imprensa', () => {
  it('lê as 70 perguntas com 3 respostas cada, sem erros', () => {
    expect(g.length).toBe(70);
    expect(g.every((p) => p.respostas.length === 3)).toBe(true);
    expect(validarGuioes(g).erros).toEqual([]);
    expect(new Set(g.map((p) => p.seccao)).size).toBe(14);
  });
  it('efeitos dentro da escala −3…+3 e só os que mudam', () => {
    for (const p of g) for (const r of p.respostas) for (const v of Object.values(r.efeitos)) { expect(Math.abs(v!)).toBeLessThanOrEqual(3); expect(v).not.toBe(0); }
  });
  it('modo, jornalista e promessas', () => {
    expect(porId('IMP-001').modo).toBe('DIR');
    expect(porId('IMP-002').modo).toBe('DONO');
    expect(porId('IMP-049').modo).toBe('DONO');
    expect(porId('IMP-006').modo).toBe('AMBOS');
    expect(porId('IMP-036').tipoJornalista).toBe('economica');
    expect(porId('IMP-001').respostas[1].promessa).toContain('subir de patamar');
  });
  it('os efeitos dentro da promessa não contam como imediatos (IMP-031 A)', () => {
    const a = porId('IMP-031').respostas[0];
    expect(a.efeitos).toEqual({ TR: 2, EQ: 1, AD: -1 });
    expect(a.mentira).toContain('30 dias');
  });
  it('multas, mentiras e respostas condicionais', () => {
    expect(porId('IMP-023').respostas.map((r) => r.multa)).toEqual([undefined, 0.3, 0.15]);
    expect(porId('IMP-036').respostas[1].mentira).toContain('crise');
    expect(porId('IMP-066').respostas.map((r) => r.disponivel)).toEqual(['cumprida', 'em-curso', 'falhada']);
  });
  it('variáveis conhecidas, incluindo as três fora da lista original', () => {
    expect(porId('IMP-030').variaveis).toContain('idade');
    expect(porId('IMP-041').variaveis).toContain('lucro_ou_prejuizo');
    expect(porId('IMP-066').variaveis).toContain('promessa');
  });
});
