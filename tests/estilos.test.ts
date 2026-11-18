import { describe, expect, it } from 'vitest';
import { ESTILOS, ESTILOS_IDS, NEUTRALIZACOES } from '../src/config/estilos';
import { FORMACAO_POR_ID } from '../src/config/tacticas';
import { IDX } from '../src/config/atributos';
import { CARGOS_STAFF, ATRIBUTOS_STAFF } from '../src/config/cargos';
import { IDX_PAPEL } from '../src/config/papeis';

describe('estilos tácticos', () => {
  it('8 estilos com 3 esquemas que existem no motor', () => {
    expect(ESTILOS.map((e) => e.id)).toEqual([...ESTILOS_IDS]);
    for (const e of ESTILOS) for (const f of e.esquemas) expect(FORMACAO_POR_ID[f], `${e.id} ${f}`).toBeDefined();
  });
  it('5-4-1 tem 11 lugares com papéis válidos', () => {
    const f = FORMACAO_POR_ID['5-4-1'];
    expect(f.lugares).toHaveLength(11);
    for (const l of f.lugares) expect(IDX_PAPEL[l.papel], l.papel).toBeGreaterThanOrEqual(0);
  });
  it('atributos valorizados e das neutralizações existem', () => {
    for (const e of ESTILOS) for (const v of e.valorizados) for (const a of v.atributos) expect(IDX[a], a).toBeGreaterThanOrEqual(0);
    for (const n of NEUTRALIZACOES) for (const g of [...n.precisa, ...n.resiste]) for (const a of g.atributos) expect(IDX[a], a).toBeGreaterThanOrEqual(0);
  });
  it('todos os estilos têm pelo menos 2 neutralizações (o texto de cada um)', () => {
    for (const id of ESTILOS_IDS) expect(NEUTRALIZACOES.filter((n) => n.alvo === id).length, id).toBeGreaterThanOrEqual(2);
  });
});

describe('cargos do staff', () => {
  it('14 cargos, 2 a 8 atributos cada, todos definidos', () => {
    expect(CARGOS_STAFF).toHaveLength(14);
    for (const c of CARGOS_STAFF) { expect(c.atributos.length).toBeGreaterThanOrEqual(2); expect(c.atributos.length).toBeLessThanOrEqual(8); for (const a of c.atributos) expect(ATRIBUTOS_STAFF[a]).toBeDefined(); }
  });
});
