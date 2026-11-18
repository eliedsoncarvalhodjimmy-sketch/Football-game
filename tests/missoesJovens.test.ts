// Plano juvenil, bloco 3: missões do olheiro de jovens, países elegíveis e perfis por país.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { PAISES_SCOUT, PERFIS_PAIS, QUALIDADES, CUSTO_SEMANA, MISSOES } from '../src/config/scoutingJovem.ts';
import { ATRIBUTOS } from '../src/config/atributos.ts';
import { CONFEDERACAO_PAIS } from '../src/config/paises.ts';
import { linguaDoPais } from '../src/players/nomesPessoas.ts';
import { qualidadesPerfil } from '../src/players/gerador.ts';

let w: World;
const dia = Math.floor(Date.UTC(2026, 9, 5) / 864e5);
beforeAll(async () => { w = await mundo(); }, 60000);

describe('países elegíveis e perfis', () => {
  it('lista do mapa (+ Angola, Senegal, Camarões, Costa do Marfim; sem Guatemala, Honduras, El Salvador)', () => {
    for (const p of ['ANG', 'SEN', 'CMR', 'CIV', 'POR', 'BRA', 'JPN', 'AUS', 'RSA', 'KSA', 'ISR', 'GHA']) expect(PAISES_SCOUT[p]).toBeTruthy();
    for (const p of ['GUA', 'HON', 'SLV', 'BLR', 'CPV', 'MLT', 'IRN']) expect(PAISES_SCOUT[p]).toBeUndefined();
    for (const [k, x] of Object.entries(PAISES_SCOUT)) {
      expect(PERFIS_PAIS[x.perfil]).toBeTruthy();
      expect(CONFEDERACAO_PAIS[k]).toBeTruthy();
      expect(linguaDoPais(k)).toBeTruthy();
      for (const q of PERFIS_PAIS[x.perfil]) for (const a of QUALIDADES[q]) expect(ATRIBUTOS.some((y) => y.id === a)).toBe(true);
    }
  });

  it('o perfil é uma tendência: ~60% dos jovens seguem-no; os brasileiros driblam mais do que os nórdicos', () => {
    const st = w.jogadores!, ac = w.academia!;
    let seg = 0, n = 0;
    const dri = { BRA: [0, 0], NOR: [0, 0] } as Record<string, [number, number]>;
    for (let c = 0; c < w.clubes.length; c++) for (const j of ac.jovens(c)) {
      const p = st.paises[st.pais[j]];
      if (!PAISES_SCOUT[p]) continue;
      n++; if (qualidadesPerfil(st.ids[j], p).length) seg++;
      if (dri[p] && st.posNat[j] !== 0) { dri[p][0] += st.atr[j * 39 + 1]; dri[p][1]++; }
    }
    expect(seg / n).toBeGreaterThan(0.5);
    expect(seg / n).toBeLessThan(0.7);
    expect(dri.BRA[0] / dri.BRA[1]).toBeGreaterThan(dri.NOR[0] / dri.NOR[1]);
  });
});

describe('missões', () => {
  it('custo por semana: o próprio país, África e Américas mais baratas que a Europa; Ásia a mais cara', () => {
    const m = w.academia!.missoes;
    const c = w.ligaPorId('POR1').clubes[0];
    expect(m.custoSemana(c, 'POR')).toBe(CUSTO_SEMANA.proprio_pais);
    expect(m.custoSemana(c, 'SEN')).toBeLessThan(m.custoSemana(c, 'ESP'));
    expect(m.custoSemana(c, 'BRA')).toBeLessThan(m.custoSemana(c, 'ESP'));
    expect(m.custoSemana(c, 'JPN')).toBeGreaterThan(m.custoSemana(c, 'ESP'));
    expect(m.custo(c, 'BRA', 12)).toBe(12 * m.custoSemana(c, 'BRA'));
  });

  it('uma missão por olheiro de jovens; relatório de 2 a 10 nomes com intervalos que contêm o valor real; contratar', () => {
    const ac = w.academia!, m = ac.missoes, st = w.jogadores!, e = w.economia!;
    const c = w.ligaPorId('POR1').clubes[2];
    // Garante 2 olheiros de jovens.
    const base = e.staff.porClube[c].find((x) => x.cargo === 'olheiro')!;
    e.staff.porClube[c] = e.staff.porClube[c].filter((x) => x.cargo !== 'olheiro_jovens');
    expect(m.enviar(c, { pais: 'BRA', posicao: 'Avançados', semanas: 4 }, dia)).toBe('o clube não tem olheiros de jovens');
    for (const k of [1, 2]) e.staff.porClube[c].push({ ...base, id: `oj${k}`, cargo: 'olheiro_jovens', atributos: { avaliacao: 14, scout_quantidade: 14, adaptabilidade: 12, determinacao: 10 } });
    const caixa = e.clubes.caixa[c];
    const a = m.enviar(c, { pais: 'BRA', posicao: 'Avançados', semanas: 8 }, dia);
    const b = m.enviar(c, { pais: 'NGA', posicao: 'Todas', semanas: 12 }, dia);
    expect(typeof a).toBe('object'); expect(typeof b).toBe('object');
    expect(m.enviar(c, { pais: 'ESP', posicao: 'Médios', semanas: 2 }, dia)).toBe('todos os olheiros de jovens estão em missão');
    expect(m.enviar(c, { pais: 'GUA', posicao: 'Médios', semanas: 2 }, dia)).toBe('país sem rede de scouting');
    expect(e.clubes.caixa[c]).toBeLessThan(caixa);
    for (let s = dia; s <= dia + 12 * 7 + 7; s += 7) m.semana(s);
    for (const mi of [a, b] as Exclude<typeof a, string>[]) {
      expect(mi.estado).toBe('concluida');
      const r = m.relatorio(mi, dia + 100);
      expect(r.length).toBeGreaterThanOrEqual(MISSOES.nomes_min);
      expect(r.length).toBeLessThanOrEqual(MISSOES.nomes_max);
      for (const x of mi.nomes) {
        const o = st.ovrNat(x.jogador), p = st.pot[x.jogador];
        expect(x.ovr[1] - x.ovr[0]).toBeGreaterThanOrEqual(2);
        // Intervalos centrados com ruído: quase sempre contêm o valor real.
        expect(o).toBeGreaterThanOrEqual(x.ovr[0] - 4); expect(o).toBeLessThanOrEqual(x.ovr[1] + 4);
        expect(p).toBeGreaterThanOrEqual(x.pt[0] - 4); expect(p).toBeLessThanOrEqual(x.pt[1] + 4);
      }
      for (const x of r) { expect(st.idade(x.jogador, dia + 100)).toBeGreaterThanOrEqual(15); expect(x.altura).toBeGreaterThan(150); }
    }
    // Avançados no Brasil: só avançados.
    for (const x of m.relatorio(a as never, dia + 100)) expect(['ED', 'EE', 'PL']).toContain(x.posicao);
    // Nigéria (sem liga no jogo): nomes de clubes locais, fora do mundo até serem contratados.
    const rn = m.relatorio(b as never, dia + 100);
    const ext = rn.find((x) => st.clube[x.jogador] < 0)!;
    expect(ext.estado).toBe('disponivel');
    const v = m.contratar(c, ext.jogador, dia + 100);
    expect(typeof v).toBe('number');
    expect(st.clube[ext.jogador]).toBe(c);
    expect(ac.jovens(c)).toContain(ext.jogador);
    expect(m.relatorio(b as never, dia + 100).find((x) => x.jogador === ext.jogador)!.estado).toBe('contratado');
    // Os olheiros ficam livres outra vez.
    expect(m.livres(c).length).toBe(2);
  });
});
