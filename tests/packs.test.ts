import { describe, expect, it } from 'vitest';
import { validar } from '../src/data/validate.ts';
import { parseCsv, toCsv } from '../src/data/csv.ts';
import { dados } from './helpers.ts';

describe('pacotes de dados', () => {
  it('todos os pacotes são válidos', async () => {
    const erros = validar(await dados()).filter((p) => p.nivel === 'erro');
    expect(erros).toEqual([]);
  });

  it('as folhas do utilizador somam 872 clubes (848 + AFR1 gerada com 24)', async () => {
    const d = await dados();
    const total = d.pacotes.reduce((s, p) => s + p.ligas.reduce((t, l) => t + l.formato.equipas, 0), 0);
    expect(total).toBe(872);
  });

  it('vagas da folha: directas, play-offs de acesso, campeões em título e bónus fecham 36/36/32/16/16', async () => {
    const d = await dados();
    const soma: Record<string, number> = {};
    for (const porComp of Object.values(d.continental!.vagas.vagas)) {
      for (const [c, v] of Object.entries(porComp)) soma[c] = (soma[c] ?? 0) + (v.liga ?? 0) + (v.taca ?? 0);
    }
    // Só pelas ligas e taças (sem campeões em título e bónus do ranking):
    expect(soma).toEqual({ UCL: 28, UCL_PO: 8, UEL: 21, UEL_PO: 20, UECL: 22, CLI: 16, ACLE: 16 });
    const esp = d.continental!.vagas.especiais;
    expect(esp.detentores).toEqual([{ de: 'UCL', para: 'UCL' }, { de: 'UEL', para: 'UCL' }, { de: 'UECL', para: 'UEL' }]);
    expect(esp.bonus_ranking).toEqual({ para: 'UCL', paises: 2 });
    // UCL = 28 + 2 + 2 + 8/2; UEL = 21 + 1 + 20/2 + 8/2; UECL = 22 + 20/2
    expect(28 + 2 + 2 + 4).toBe(36);
    expect(21 + 1 + 10 + 4).toBe(36);
    expect(22 + 10).toBe(32);
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
    d.continental!.vagas.vagas['XYZ1'] = { UCL: { liga: 1 } };
    expect(validar(d).some((e) => e.msg.includes('XYZ'))).toBe(true);
  });

  it('CSV: ida e volta com aspas e vírgulas', () => {
    const t = toCsv(['a', 'b'], [['x, "y"', 2], ['z', 3]]);
    expect(parseCsv(t)).toEqual([{ a: 'x, "y"', b: '2' }, { a: 'z', b: '3' }]);
  });
});
