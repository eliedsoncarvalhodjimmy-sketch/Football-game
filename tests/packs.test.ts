import { describe, expect, it } from 'vitest';
import { validar } from '../src/data/validate.ts';
import { parseCsv, toCsv } from '../src/data/csv.ts';
import { dados } from './helpers.ts';

describe('pacotes de dados', () => {
  it('todos os pacotes são válidos', async () => {
    const erros = validar(await dados()).filter((p) => p.nivel === 'erro');
    expect(erros).toEqual([]);
  });

  it('a tabela aprovada soma 924 clubes', async () => {
    const d = await dados();
    const total = d.pacotes.reduce((s, p) => s + p.ligas.reduce((t, l) => t + l.formato.equipas, 0), 0);
    expect(total).toBe(924);
  });

  it('vagas continentais: 36 + 36 + 32 = 104 na UEFA, 16 na Libertadores e 16 na Ásia', async () => {
    const d = await dados();
    const soma: Record<string, number> = {};
    for (const porComp of Object.values(d.continental!.vagas.vagas)) {
      for (const [c, v] of Object.entries(porComp)) soma[c] = (soma[c] ?? 0) + (v.liga ?? 0) + (v.taca ?? 0);
    }
    expect(soma).toEqual({ uefa_cl: 36, uefa_el: 36, uefa_ecl: 32, libertadores: 16, afc_cl: 16 });
  });

  it('detecta erros de coerência entre divisões', async () => {
    const d = structuredClone(await dados());
    const eng = d.pacotes.find((p) => p.manifest.id === 'eng')!;
    eng.ligas[0].descidas.directas = 4; // descem 4, sobem 3
    const erros = validar(d).filter((p) => p.nivel === 'erro');
    expect(erros.some((e) => e.msg.includes('descem 4 mas sobem 3'))).toBe(true);
  });

  it('detecta vagas de país sem pacote', async () => {
    const d = structuredClone(await dados());
    d.continental!.vagas.vagas['XYZ'] = { uefa_cl: { liga: 1 } };
    expect(validar(d).some((e) => e.msg.includes('XYZ'))).toBe(true);
  });

  it('CSV: ida e volta com aspas e vírgulas', () => {
    const t = toCsv(['a', 'b'], [['x, "y"', 2], ['z', 3]]);
    expect(parseCsv(t)).toEqual([{ a: 'x, "y"', b: '2' }, { a: 'z', b: '3' }]);
  });
});
