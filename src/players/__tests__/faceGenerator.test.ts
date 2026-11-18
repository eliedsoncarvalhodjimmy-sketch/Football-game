// Garantias do gerador de rostos: determinismo absoluto, semente imutável (id + nacionalidade de criação),
// nacionalidade de criação separada da actual, versão do algoritmo e cache.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FACE_VERSAO_ATUAL, camposRosto, generatePlayerFace, generatePlayerFaceSemCache, limparCacheRostos, sementeJogador, tamanhoCacheRostos, type Player,
} from '../faceGenerator.ts';
import { hashSeed } from '../faceParts/shared.ts';

const NACS = ['AO', 'BR', 'PT', 'NG', 'AR', 'FR', 'JP', 'DE', 'MA', 'CO'];
const jog = (id: string, extra: Partial<Player> = {}): Player => ({ id, nome: 'Nome ' + id, nacionalidade: 'PT', idade: 25, posicao: 'MC', clubeId: 'c1', ...extra });

describe('determinismo', () => {
  it('mesmo playerId 100 vezes → SVG idêntico (com e sem cache)', () => {
    const p = jog('jogador-42', { nacionalidade: 'BR', idade: 31 });
    const ref = generatePlayerFaceSemCache(p);
    for (let k = 0; k < 100; k++) {
      expect(generatePlayerFaceSemCache({ ...p })).toBe(ref);
      expect(generatePlayerFace({ ...p })).toBe(ref);
    }
  });

  it('1000 playerIds diferentes → nenhum SVG exactamente igual', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 1000; i++) vistos.add(generatePlayerFaceSemCache(jog(`p${i}`, { nacionalidade: NACS[i % NACS.length], idade: 16 + (i % 22) })));
    expect(vistos.size).toBe(1000);
  });

  it('o nome muda e o playerId fica → o SVG não muda', () => {
    const p = jog('id-7', { nacionalidade: 'AO' });
    const a = generatePlayerFaceSemCache(p);
    expect(generatePlayerFaceSemCache({ ...p, nome: 'Outro Nome Qualquer' })).toBe(a);
    expect(generatePlayerFaceSemCache({ ...p, nome: '' })).toBe(a);
    expect(sementeJogador(p)).toBe((hashSeed('id-7') + hashSeed('AO')) >>> 0);
  });

  it('nenhuma camada usa Math.random, Date.now ou crypto (só o PRNG com semente)', () => {
    const dir = new URL('..', import.meta.url).pathname;
    const ficheiros = ['faceGenerator.ts', 'nationalityPresets.ts', 'PlayerCard.tsx', ...readdirSync(join(dir, 'faceParts')).map((f) => join('faceParts', f))];
    for (const f of ficheiros) {
      const src = readFileSync(join(dir, f), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(src, f).not.toMatch(/Math\.random|Date\.now|new Date|crypto\.|performance\.now/);
    }
  });
});

describe('nacionalidade de criação (faceNationality) e nacionalidade actual', () => {
  it('mudar a nacionalidade actual NÃO muda o rosto quando a nacionalidade de criação está guardada', () => {
    const criado: Player = { ...jog('n-1', { nacionalidade: 'AO' }) };
    const guardado = { ...criado, ...camposRosto(criado) };
    expect(guardado.faceNationality).toBe('AO');
    const a = generatePlayerFaceSemCache(guardado);
    // Naturalizou-se português: a nacionalidade actual muda, o rosto não.
    expect(generatePlayerFaceSemCache({ ...guardado, nacionalidade: 'PT' })).toBe(a);
  });

  it('documentado: sem faceNationality guardada, a nacionalidade actual é a de criação — mudá-la muda o rosto (outra semente e outro preset)', () => {
    const p = jog('n-2', { nacionalidade: 'AO' });
    expect(generatePlayerFaceSemCache({ ...p, nacionalidade: 'JP' })).not.toBe(generatePlayerFaceSemCache(p));
    // Por isso o jogo guarda camposRosto() na criação do jogador.
  });

  it('a nacionalidade de criação entra na semente; códigos em minúsculas valem o mesmo', () => {
    expect(sementeJogador(jog('x', { faceNationality: 'pt' }))).toBe(sementeJogador(jog('x', { faceNationality: 'PT' })));
    expect(sementeJogador(jog('x', { faceNationality: 'PT' }))).not.toBe(sementeJogador(jog('x', { faceNationality: 'BR' })));
  });
});

describe('versão do algoritmo (faceVersion)', () => {
  it('a criação guarda a versão actual; a versão guardada é a que desenha; versão desconhecida dá erro claro', () => {
    expect(camposRosto(jog('v')).faceVersion).toBe(FACE_VERSAO_ATUAL);
    const p = jog('v-1', { faceVersion: 'v1' });
    expect(generatePlayerFaceSemCache(p)).toBe(generatePlayerFaceSemCache({ ...p, faceVersion: undefined }));
    expect(() => generatePlayerFace({ ...p, faceVersion: 'v99' as never })).toThrow(/v99/);
  });

  it('impressão digital da v1: um rosto de referência não muda (se este teste falhar, o algoritmo v1 foi alterado — crie uma v2)', () => {
    const svg = generatePlayerFaceSemCache(jog('referencia-v1', { nacionalidade: 'BR', idade: 27, clubeId: 'c-ref' }));
    expect(hashSeed(svg).toString(16)).toMatchSnapshot();
  });
});

describe('cache', () => {
  it('memoizada por playerId (com idade, nacionalidade de criação e equipamento); limitada', () => {
    limparCacheRostos();
    const p = jog('cache-1');
    const a = generatePlayerFace(p);
    expect(tamanhoCacheRostos()).toBe(1);
    expect(generatePlayerFace({ ...p, nome: 'Mudou' })).toBe(a);
    expect(tamanhoCacheRostos()).toBe(1);
    generatePlayerFace({ ...p, idade: 34 });
    expect(tamanhoCacheRostos()).toBe(2);
    for (let i = 0; i < 4100; i++) generatePlayerFace(jog('massa' + i));
    expect(tamanhoCacheRostos()).toBeLessThanOrEqual(4000);
  });
});
