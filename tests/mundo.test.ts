import { describe, expect, it } from 'vitest';
import { mundo } from './helpers.ts';
import { curvaReputacao } from '../src/gen/mundoFicticio.ts';
import { Rng } from '../src/core/rng.ts';

describe('mundo fictício', async () => {
  const w = await mundo(2026);

  it('cada clube pertence a exactamente uma divisão e cada divisão tem o nº certo de clubes', () => {
    const vistos = new Map<number, number>();
    for (const l of w.ligas) {
      expect(l.clubes.length).toBe(l.regras.formato.equipas);
      for (const c of l.clubes) vistos.set(c, (vistos.get(c) ?? 0) + 1);
    }
    expect(vistos.size).toBe(w.clubes.length);
    expect([...vistos.values()].every((v) => v === 1)).toBe(true);
    for (const l of w.ligas) for (const c of l.clubes) expect(w.liga[c]).toBe(l.idx);
  });

  it('ids, nomes e siglas (por país) únicos; tudo marcado "teste"', () => {
    expect(new Set(w.clubes.map((c) => c.id)).size).toBe(w.clubes.length);
    expect(new Set(w.clubes.map((c) => c.nome)).size).toBe(w.clubes.length);
    expect(new Set(w.clubes.map((c) => c.pais + c.nome_curto)).size).toBe(w.clubes.length);
    expect(w.clubes.every((c) => c.origem === 'teste')).toBe(true);
  });

  it('rivalidades são simétricas e no mesmo país', () => {
    for (const c of w.clubes) {
      for (const r of c.rivais) {
        const o = w.clubes[w.idx(r)];
        expect(o.rivais).toContain(c.id);
        expect(o.pais).toBe(c.pais);
      }
    }
  });

  it('liga africana respeita as quotas por país', () => {
    const l = w.ligaPorId('AFR1');
    const n: Record<string, number> = {};
    for (const c of l.clubes) n[w.clubes[c].pais] = (n[w.clubes[c].pais] ?? 0) + 1;
    expect(n).toEqual({ EGY: 4, MAR: 3, RSA: 3, TUN: 2, ALG: 2, NGA: 2, COD: 2, SEN: 2, GHA: 2, CIV: 2 });
  });

  it('reputação: poucos muito fortes, muitos médios, alguns fracos', () => {
    const reps = curvaReputacao(20, 93, 62, Rng.de(1, 'x'));
    const span = 93 - 62;
    const topo = reps.filter((r) => r >= 62 + 0.75 * span).length;
    const meio = reps.filter((r) => r >= 62 + 0.25 * span && r < 62 + 0.75 * span).length;
    expect(topo).toBeGreaterThanOrEqual(2);
    expect(topo).toBeLessThanOrEqual(5);
    expect(meio).toBeGreaterThan(topo);
    for (const r of w.reputacao) expect(r >= 1 && r <= 100).toBe(true);
  });

  it('determinismo: a mesma semente gera exactamente o mesmo mundo', async () => {
    const w2 = await mundo(2026);
    expect(JSON.stringify(w2.clubes)).toBe(JSON.stringify(w.clubes));
    expect([...w2.ataque]).toEqual([...w.ataque]);
    const w3 = await mundo(7);
    expect(JSON.stringify(w3.clubes)).not.toBe(JSON.stringify(w.clubes));
  });
});
