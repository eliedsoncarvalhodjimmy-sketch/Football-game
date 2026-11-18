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

import { beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import { diaInicioMundo, type World } from '../src/engine/world.ts';
import { prepararLado } from '../src/match/rapido.ts';
import { adequacaoEstilo, perdaNeutralizacao } from '../src/match/estilos.ts';
import { Rng } from '../src/core/rng.ts';
import { EFEITO_ESTILOS, PARES_MUTUOS } from '../src/config/estilos';

describe('estilos no jogo', () => {
  let w: World;
  const dia = diaInicioMundo() + 40;
  beforeAll(async () => { w = await mundo(); }, 60000);
  it('os treinadores usam os 8 estilos e os esquemas do estilo', () => {
    const ts = w.motor!.treinadores;
    expect(new Set(ts.map((t) => t.perfil)).size).toBe(8);
    for (const t of ts.slice(0, 50)) expect(t.formacoes).toEqual(ESTILOS.find((e) => e.id === t.perfil)!.esquemas);
  });
  it('adequação limitada a ±5% e neutralização a −7%', () => {
    const st = w.jogadores!, cs = w.ligaPorId('POR1').clubes;
    for (let k = 0; k < 6; k++) {
      const a = prepararLado(w, cs[k], dia, Rng.de(1, k)), b = prepararLado(w, cs[k + 6], dia, Rng.de(2, k));
      for (const e of ESTILOS_IDS) {
        expect(Math.abs(adequacaoEstilo(st, a, e))).toBeLessThanOrEqual(EFEITO_ESTILOS.adequacao_max + 1e-9);
        for (const f of ESTILOS_IDS) { const p = perdaNeutralizacao(st, a, e, b, f); expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(EFEITO_ESTILOS.neutralizacao_max + 1e-9); }
      }
    }
  });
  it('pares mútuos: no máximo um dos dois perde (ganha quem tem melhores jogadores no confronto)', () => {
    const st = w.jogadores!, cs = w.ligaPorId('POR1').clubes;
    for (let k = 0; k < 6; k++) {
      const a = prepararLado(w, cs[k], dia, Rng.de(3, k)), b = prepararLado(w, cs[17 - k], dia, Rng.de(4, k));
      for (const [x, y] of PARES_MUTUOS) expect(perdaNeutralizacao(st, a, x, b, y) > 0 && perdaNeutralizacao(st, b, y, a, x) > 0).toBe(false);
    }
  });
});
