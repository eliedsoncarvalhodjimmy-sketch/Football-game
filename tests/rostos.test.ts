// Gerador procedural de rostos: determinismo, variações, presets por nacionalidade, idade, SVG limpo e desempenho.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generatePlayerFaceSemCache as generatePlayerFace, gerarTracos, hashSeed, kitDoClube, type Player } from '../src/players/faceGenerator.ts';
import { TONS_PELE } from '../src/players/faceParts/Skin.tsx';
import { IDS_FORMATO } from '../src/players/faceParts/FaceShape.tsx';
import { FORMAS_OLHOS, CORES_OLHOS } from '../src/players/faceParts/Eyes.tsx';
import { FORMAS_SOBRANCELHAS } from '../src/players/faceParts/Eyebrows.tsx';
import { FORMAS_NARIZ } from '../src/players/faceParts/Nose.tsx';
import { FORMAS_BOCA } from '../src/players/faceParts/Mouth.tsx';
import { ESTILOS_CABELO, CORES_CABELO } from '../src/players/faceParts/Hair.tsx';
import { TIPOS_BARBA } from '../src/players/faceParts/Beard.tsx';
import { presetDe, PRESET_GLOBAL } from '../src/players/nationalityPresets.ts';
import { PlayerCard } from '../src/players/PlayerCard.tsx';

const jog = (i: number, nac: string, idade = 25, extra: Partial<Player> = {}): Player => ({ id: `j${i}`, nome: `Nome ${i}`, nacionalidade: nac, idade, posicao: 'MC', clubeId: 'c1', ...extra });
const muitos = (nac: string, k = 500, idade?: number) => Array.from({ length: k }, (_, i) => gerarTracos(jog(i, nac, idade ?? 19 + (i % 15))));
const frac = <T>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length / xs.length;

describe('determinismo e SVG', () => {
  it('o mesmo jogador dá sempre o mesmo SVG; outro id muda a cara; o nome e a posição não mudam o rosto', () => {
    const a = generatePlayerFace(jog(1, 'PT')), b = generatePlayerFace(jog(1, 'PT'));
    expect(a).toBe(b);
    expect(generatePlayerFace(jog(2, 'PT'))).not.toBe(a);
    expect(generatePlayerFace({ ...jog(1, 'PT'), nome: 'Outro' })).toBe(a);
    expect(generatePlayerFace({ ...jog(1, 'PT'), posicao: 'GR' })).toBe(a);
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
  });

  it('SVG limpo: viewBox 0 0 200 240, sem texto, sem imagens nem ligações externas', () => {
    for (let i = 0; i < 60; i++) {
      const s = generatePlayerFace(jog(i, ['AO', 'BR', 'JP', 'DE', 'XX'][i % 5], 16 + (i % 22)));
      expect(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240"')).toBe(true);
      expect(s).not.toMatch(/<text|<image|<foreignObject|href=|NaN|undefined/);
      expect(s.endsWith('</svg>')).toBe(true);
    }
  });

  it('a camisola usa as cores do clube; equipamentos diferentes não partilham ids', () => {
    const p = jog(3, 'BR');
    const k1 = { primaryColor: '#123456', secondaryColor: '#abcdef', pattern: 'riscas' as const, collar: 'polo' as const };
    const s1 = generatePlayerFace(p, { kit: k1 }), s2 = generatePlayerFace(p, { kit: kitDoClube('outro') });
    expect(s1).toContain('#123456');
    expect(s1).toContain('#abcdef');
    const id = (s: string) => s.match(/id="([a-z0-9]+)cab"/)![1];
    expect(id(s1)).not.toBe(id(s2));
    // Cores inválidas (de fora) não entram no SVG.
    expect(generatePlayerFace(p, { kit: { ...k1, primaryColor: 'red"/><script>' } })).not.toContain('<script>');
  });

  it('o componente React do card mostra o rosto, o nome, a posição, a idade e o overall', () => {
    const html = renderToStaticMarkup(createElement(PlayerCard, { player: { ...jog(4, 'AO', 22), overall: 81, posicao: 'PL' } }));
    expect(html).toContain('<svg');
    expect(html).toContain('Nome 4');
    expect(html).toContain('PL');
    expect(html).toContain('81');
    expect(html).toContain('22 anos');
  });
});

describe('variações', () => {
  it('8 tons de pele, 6 formatos, 12 olhos, 5 cores de olhos, 10 sobrancelhas, 10 narizes, 10 bocas, 12 barbas, ≥30 cabelos e 7 cores', () => {
    expect(TONS_PELE.length).toBe(8);
    expect(IDS_FORMATO.length).toBe(6);
    expect(FORMAS_OLHOS.length).toBe(12);
    expect(Object.keys(CORES_OLHOS).length).toBe(5);
    expect(FORMAS_SOBRANCELHAS.length).toBe(10);
    expect(FORMAS_NARIZ.length).toBe(10);
    expect(FORMAS_BOCA.length).toBe(10);
    expect(TIPOS_BARBA.length).toBe(12);
    expect(ESTILOS_CABELO.length).toBeGreaterThanOrEqual(30);
    expect(Object.keys(CORES_CABELO).length).toBe(7);
    for (const id of ['fade_curto', 'fade_top_crespo', 'black_power', 'cacheado_medio', 'liso_curto', 'liso_tras', 'ondulado_medio', 'moicano', 'moicano_risca', 'careca', 'raspado',
      'dreads_compridos', 'dreads_presos', 'trancas', 'cornrows', 'rabo_cavalo', 'top_knot', 'loiro_descolorido', 'ruivo', 'grisalho', 'comprido_liso', 'comprido_ondulado', 'franja', 'militar', 'risca_lateral'])
      expect(ESTILOS_CABELO.some((e) => e.id === id)).toBe(true);
  });

  it('todos os estilos de cabelo e todas as barbas desenham sem erros', async () => {
    const { contextoRosto, desenharCamadas } = await import('../src/players/faceGenerator.ts');
    for (const [k, e] of ESTILOS_CABELO.entries()) for (const barba of [0, k % 12]) {
      const t = { ...gerarTracos(jog(k, 'FR')), cabelo: e.id, barba };
      const s = desenharCamadas(contextoRosto(t), kitDoClube('x'));
      expect(s.length).toBeGreaterThan(500);
      expect(s).not.toMatch(/NaN|undefined/);
    }
  });

  it('caras variadas: em 200 jogadores do mesmo país há muitos cabelos, olhos, narizes e bocas diferentes', () => {
    const ts = muitos('PT', 200);
    expect(new Set(ts.map((t) => t.cabelo)).size).toBeGreaterThanOrEqual(15);
    expect(new Set(ts.map((t) => t.nariz)).size).toBe(10);
    expect(new Set(ts.map((t) => t.boca)).size).toBe(10);
    expect(new Set(ts.map((t) => t.olhos)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(ts.map((t) => JSON.stringify(t))).size).toBe(200);
  });
});

describe('presets por nacionalidade', () => {
  it('Angola: ~85% pele escura; cabelo maioritariamente black power / degradê crespo; olhos escuros', () => {
    const ts = muitos('AO');
    expect(frac(ts, (t) => t.pele >= 5)).toBeGreaterThan(0.75);
    expect(frac(ts, (t) => ['black_power', 'fade_top_crespo', 'crespo_curto', 'ondas_360'].includes(t.cabelo))).toBeGreaterThan(0.55);
    expect(frac(ts, (t) => t.corOlhos === 'castanho' || t.corOlhos === 'preto')).toBeGreaterThan(0.85);
  });

  it('Brasil miscigenado: peles claras, médias e escuras todas com peso', () => {
    const ts = muitos('BR');
    expect(frac(ts, (t) => t.pele <= 2)).toBeGreaterThan(0.2);
    expect(frac(ts, (t) => t.pele >= 3 && t.pele <= 4)).toBeGreaterThan(0.25);
    expect(frac(ts, (t) => t.pele >= 5)).toBeGreaterThan(0.25);
  });

  it('Japão: pele clara, cabelo preto, pálpebra única frequente, pouca barba', () => {
    const ts = muitos('JP');
    expect(frac(ts, (t) => t.pele <= 3)).toBeGreaterThan(0.9);
    expect(frac(ts, (t) => t.corCabelo === 'preto' || t.corCabelo === 'grisalho')).toBeGreaterThan(0.75);
    expect(frac(ts, (t) => t.olhos === 6 || t.olhos === 7)).toBeGreaterThan(0.45);
    expect(frac(ts, (t) => t.barba === 0)).toBeGreaterThan(0.6);
  });

  it('Alemanha: olhos azuis/verdes ~60%; Nigéria: ~90% pele escura; nunca todos iguais', () => {
    expect(frac(muitos('DE'), (t) => t.corOlhos === 'azul' || t.corOlhos === 'verde')).toBeGreaterThan(0.45);
    const ng = muitos('NG');
    expect(frac(ng, (t) => t.pele >= 6)).toBeGreaterThan(0.8);
    expect(new Set(ng.map((t) => t.pele)).size).toBeGreaterThanOrEqual(3);
  });

  it('códigos do jogo (FIFA) dão o mesmo preset; nacionalidade desconhecida usa o preset global', () => {
    expect(presetDe('POR')).toBe(presetDe('PT'));
    expect(presetDe('ANG')).toBe(presetDe('AO'));
    expect(presetDe('ZZ')).toBe(PRESET_GLOBAL);
    expect(generatePlayerFace(jog(9, 'ZZ')).length).toBeGreaterThan(1000);
  });
});

describe('idade', () => {
  it('menos de 18: cara mais redonda e sem barba (ou muito leve); mais de 30: rugas, grisalho e fios brancos', () => {
    const novos = muitos('PT', 400, 16);
    expect(novos.every((t) => t.barba === 0 || t.barba === 1)).toBe(true);
    expect(frac(novos, (t) => t.forma === 'redondo')).toBeGreaterThan(frac(muitos('PT', 400, 25), (t) => t.forma === 'redondo'));
    const velhos = muitos('PT', 400, 33);
    expect(velhos.every((t) => t.rugas > 0)).toBe(true);
    expect(frac(velhos, (t) => t.corCabelo === 'grisalho')).toBeGreaterThan(0.2);
    expect(frac(velhos, (t) => t.barbaGrisalha)).toBeGreaterThan(0.1);
    expect(frac(velhos, (t) => t.barbaGrisalha)).toBeLessThan(0.3);
  });
});

describe('desempenho', () => {
  it('100 rostos em menos de 100 ms', () => {
    const ps = Array.from({ length: 100 }, (_, i) => jog(i + 1000, ['AO', 'BR', 'PT', 'NG', 'AR', 'FR', 'JP', 'DE', 'MA', 'CO'][i % 10], 16 + (i % 22)));
    for (const p of ps.slice(0, 20)) generatePlayerFace(p); // aquecimento
    const t0 = performance.now();
    for (const p of ps) generatePlayerFace(p);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});
