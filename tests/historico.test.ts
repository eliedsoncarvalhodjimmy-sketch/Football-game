// Histórico das competições e dos prémios: dados reais (PDFs do utilizador) + épocas e prémios do jogo.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo, dados } from './helpers.ts';
import type { World } from '../src/engine/world.ts';
import { Simulador } from '../src/engine/simulador.ts';
import { nomeCanonico, rotuloEpoca } from '../src/historico/historico.ts';
import { parseCsv } from '../src/data/csv.ts';
import { FINALISTAS } from '../src/config/premios.ts';

let w: World;
beforeAll(async () => { w = await mundo(); }, 60000);

describe('dados reais', () => {
  it('ficheiros de histórico carregados (6 ligas, 3 competições UEFA, 2 prémios)', async () => {
    const d = await dados();
    for (const id of ['ENG1', 'ESP1', 'ITA1', 'FRA1', 'GER1', 'POR1', 'UCL', 'UEL', 'UECL', 'premio_melhor_do_mundo', 'premio_golden_boy']) expect(d.historico[id]?.length).toBeGreaterThan(3);
    expect(d.historico.ENG1.length).toBe(34);
    expect(d.historico.POR1.length).toBe(92);
    expect(parseCsv('# comentário\na,b\n1,2\n')).toEqual([{ a: '1', b: '2' }]);
  });

  it('títulos por clube batem com os PDFs (com nomes equivalentes: "Madrid" = Real Madrid)', () => {
    const h = w.historico!;
    const t = (id: string, clube: string) => h.titulos(id, []).find((x) => x.clube === clube)?.titulos;
    expect(t('POR1', 'Benfica')).toBe(38);
    expect(t('ITA1', 'Juventus')).toBe(36);
    expect(t('ESP1', 'Real Madrid')).toBe(36);
    expect(t('ENG1', 'Manchester United')).toBe(13);
    expect(t('UCL', 'Real Madrid')).toBe(15);
    expect(nomeCanonico('Hamburgo')).toBe('Hamburger SV');
    // Títulos revogados não contam.
    expect(h.competicao('FRA1', []).find((l) => l.epoca === '1992–93')!.campeao).toBe('');
  });

  it('factos para as notícias: primeiro título, fim de jejum, títulos seguidos', () => {
    const h = w.historico!;
    expect(h.factosTitulo('ENG1', '2015–16', [])[0]).toMatch(/Leicester City conquista o primeiro título/);
    expect(h.factosTitulo('FRA1', '2010–11', []).join(' ')).toMatch(/Lille volta a ser campeão 57 anos depois/);
    expect(h.factosTitulo('ITA1', '2019–20', []).join(' ')).toMatch(/Juventus soma 9 títulos seguidos/);
  });

  it('Bola de Ouro (Melhor do Mundo) e Troféu Kopa (Golden Boy)', () => {
    const h = w.historico!;
    const bo = h.premios('melhor_do_mundo');
    expect(bo[0]).toMatchObject({ ano: 1956, jogador: 'Stanley Matthews' });
    expect(bo.find((p) => p.ano === 2026)!.jogador).toBe('Harry Kane');
    expect(h.maisPremiados('melhor_do_mundo')[0]).toMatchObject({ jogador: 'Lionel Messi', vezes: 8 });
    expect(h.premios('golden_boy').find((p) => p.ano === 2023)!.jogador).toBe('Jude Bellingham');
  });
});

describe('à medida que a simulação avança', () => {
  it('a época do jogo junta-se ao histórico (campeão, vice, marcador; taças e UEFA) e os prémios do jogo também', () => {
    const h = w.historico!;
    const sim = new Simulador(w);
    const reg = sim.simularEpoca();
    const ep = rotuloEpoca(reg);
    expect(ep).toBe('2026–27');
    for (const id of ['POR1', 'ENG1', 'UCL', 'POR-TDP']) {
      const L = h.competicao(id, sim.historico);
      const u = L[L.length - 1];
      expect(u.epoca).toBe(ep);
      expect(u.fonte).toBe('jogo');
      expect(u.campeao.length).toBeGreaterThan(2);
      expect(u.clube).not.toBeNull();
      expect(u.vice).not.toBe(u.campeao);
    }
    const por = h.competicao('POR1', sim.historico);
    expect(por[por.length - 2]).toMatchObject({ epoca: '2025–26', campeao: 'FC Porto', fonte: 'real' });
    expect(por[por.length - 1].melhorMarcador.length).toBeGreaterThan(2);
    for (const p of ['melhor_do_mundo', 'golden_boy', 'guarda_redes'] as const) {
      const L = h.premios(p);
      const u = L[L.length - 1];
      expect(u).toMatchObject({ ano: 2027, fonte: 'jogo' });
      expect(u.finalistas!.length).toBe(FINALISTAS[p]);
      expect(w.jogadores!.nomes[u.idx!]).toBe(u.jogador);
    }
    // Golden Boy: até aos 21 anos no início da época.
    const gb = h.premios('golden_boy').at(-1)!;
    expect(w.jogadores!.idade(gb.idx!, Math.floor(Date.UTC(2026, 7, 1) / 864e5))).toBeLessThanOrEqual(21.999);
    // Os factos do campeão do jogo existem (num mundo fictício é sempre o primeiro título da história).
    expect(h.factosTitulo('POR1', ep, sim.historico).length).toBeGreaterThan(0);
  }, 240000);
});
