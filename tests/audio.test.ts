// Prompt 10, Bloco 1: núcleo do áudio. Corre em Node (sem Web Audio nem DOM): a lógica de volumes, definições e
// catálogo tem de ser toda testável sem um navegador a sério; a reprodução em si, sem AudioContext nem <audio>, não
// faz nada (silêncio), nunca lança. O desbloqueio e a pausa em segundo plano precisam de um navegador — ver o relatório.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { AudioManager } from '../src/audio/AudioManager.ts';
import { definicoesPorDefeito, lerDefinicoes, gravarDefinicoes, type Armazenamento } from '../src/audio/persistencia.ts';
import { CATALOGO_VAZIO, type Catalogo, type ItemCatalogo } from '../src/audio/tipos.ts';
import { AUDIO, CANAIS, PLAYLIST_GESTAO } from '../src/config/audio.ts';
import { embaralhar, PlaylistGestao, type TocadorMusica } from '../src/audio/playlist.ts';
import { carregarCatalogoReal } from '../src/audio/catalogoReal.ts';

/** Armazenamento falso (Map), para testar a persistência sem localStorage a sério. */
function armazenamentoFalso(): Armazenamento {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}

describe('AudioManager (Prompt 10, Bloco 1)', () => {
  it('sem ficheiros nem armazenamento: nunca lança, fica tudo em silêncio', () => {
    const a = new AudioManager();
    expect(() => a.definirAmbiente('amb_estadio_cheio')).not.toThrow();
    expect(() => a.definirMusica('menu', 'mus_menu')).not.toThrow();
    let fim = false;
    expect(() => a.tocarCutscene('champions', () => { fim = true; })).not.toThrow();
    expect(fim).toBe(true); // sem catálogo: acaba já, a transição segue normal
    expect(() => a.parar()).not.toThrow();
  });

  it('definições por defeito e persistência (armazenamento falso)', () => {
    const arm = armazenamentoFalso();
    expect(lerDefinicoes(arm)).toEqual(definicoesPorDefeito());
    const a = new AudioManager(CATALOGO_VAZIO, arm);
    a.definirVolumeCanal('musica', 0.3);
    a.definirVolumeGeral(0.55);
    a.silenciarTudo(true);
    const lidas = lerDefinicoes(arm);
    expect(lidas.volume.musica).toBeCloseTo(0.3, 6);
    expect(lidas.geral).toBeCloseTo(0.55, 6);
    expect(lidas.silenciado).toBe(true);
    // Uma 2.ª instância, com o mesmo armazenamento, lê logo as definições gravadas.
    const b = new AudioManager(CATALOGO_VAZIO, arm);
    expect(b.definicoesActuais()).toEqual(lidas);
  });

  it('volumes ficam sempre entre 0 e 1, mesmo com valores fora da faixa', () => {
    const a = new AudioManager(CATALOGO_VAZIO, armazenamentoFalso());
    a.definirVolumeCanal('ambiente', 5);
    a.definirVolumeGeral(-3);
    expect(a.definicoesActuais().volume.ambiente).toBe(1);
    expect(a.definicoesActuais().geral).toBe(0);
  });

  it('armazenamento bloqueado (ex.: Safari privado): não lança, fica só para esta sessão', () => {
    const quebrado: Armazenamento = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(lerDefinicoes(quebrado)).toEqual(definicoesPorDefeito());
    expect(() => gravarDefinicoes(definicoesPorDefeito(), quebrado)).not.toThrow();
    expect(() => new AudioManager(CATALOGO_VAZIO, quebrado).definirVolumeGeral(0.4)).not.toThrow();
  });

  it('definições inválidas no armazenamento (JSON estranho): ignora e usa as por defeito', () => {
    const arm = armazenamentoFalso();
    arm.setItem(AUDIO.chave_definicoes, '{not json');
    expect(lerDefinicoes(arm)).toEqual(definicoesPorDefeito());
    arm.setItem(AUDIO.chave_definicoes, JSON.stringify({ volume: { musica: 'alto' }, geral: 99 }));
    const d = lerDefinicoes(arm);
    expect(d.volume.musica).toBe(definicoesPorDefeito().volume.musica); // campo inválido: fica o valor por defeito
    expect(d.geral).toBe(1); // 99 fica cortado a 1
  });

  it('catálogo: sem ficheiro para o id pedido, não rebenta (silêncio)', () => {
    const vazio: Catalogo = { obter: () => undefined };
    const a = new AudioManager(vazio);
    expect(() => a.definirAmbiente('isto_nao_existe')).not.toThrow();
    let avisos = 0;
    const original = console.warn;
    console.warn = () => avisos++;
    a.definirAmbiente('isto_nao_existe');
    a.definirAmbiente('isto_nao_existe');
    console.warn = original;
    expect(avisos).toBe(0); // o gestor não avisa por si: quem chamar decide o aviso (uma vez), não o próprio tocar
  });

  it('cutscenes: "champions" e "europa" têm id próprio no catálogo (config), fácil de alargar sem mexer em código', () => {
    const chamados: string[] = [];
    const cat: Catalogo = { obter: (id) => { chamados.push(id); return { id, ficheiro: `audio/${id}.mp3`, categoria: 'cutscene', duracao: 38, loop: false, volumeBase: 1 } satisfies ItemCatalogo; } };
    const a = new AudioManager(cat);
    a.tocarCutscene('champions', () => {});
    a.tocarCutscene('europa', () => {});
    expect(chamados).toEqual(['cut_champions', 'cut_europa']);
    expect(AUDIO.cutscenes.champions).toBe('cut_champions');
    expect(AUDIO.cutscenes.europa).toBe('cut_europa');
  });

  it('3 canais (música, ambiente, cutscene) têm volume por defeito e podem ser mudados um sem afectar os outros', () => {
    const a = new AudioManager();
    for (const c of CANAIS) expect(a.definicoesActuais().volume[c]).toBe(AUDIO.volume_defeito[c]);
    a.definirVolumeCanal('cutscene', 0.1);
    expect(a.definicoesActuais().volume.cutscene).toBeCloseTo(0.1, 6);
    expect(a.definicoesActuais().volume.musica).toBe(AUDIO.volume_defeito.musica);
    expect(a.definicoesActuais().volume.ambiente).toBe(AUDIO.volume_defeito.ambiente);
  });

  it('"já tocou esta chave?": marca a 1.ª vez, diz que sim nas seguintes (para "só uma vez por dia europeu")', () => {
    const a = new AudioManager();
    expect(a.marcarVisto('champions|2027|1|3|9|1')).toBe(false);
    expect(a.marcarVisto('champions|2027|1|3|9|1')).toBe(true);
    expect(a.marcarVisto('europa|2027|1|3|9|1')).toBe(false); // chave diferente: ainda não tinha tocado
  });

  it('regra de ouro: só src/audio/ toca no AudioContext/GainNode; o resto do jogo não importa Web Audio', () => {
    const permitido = new Set(['src/audio/AudioManager.ts']);
    const ficheiros = [...listarTs('src'), ...listarTs('tests'), ...listarTs('scripts')].filter((f) => !permitido.has(f));
    for (const f of ficheiros) {
      const txt = readFileSync(f, 'utf8');
      expect(txt, f).not.toMatch(/\bnew AudioContext\b/);
      expect(txt, f).not.toMatch(/\.createGain\(\)/);
      expect(txt, f).not.toMatch(/\.createBufferSource\(\)/);
    }
  });

  it('regra de ouro: o motor de simulação (incluindo o 2D) nunca importa de src/audio/', () => {
    const ficheiros = [...listarTs('src/engine'), ...listarTs('src/match'), ...listarTs('src/players'), ...listarTs('src/economia'), ...listarTs('src/mercado')];
    for (const f of ficheiros) expect(readFileSync(f, 'utf8'), f).not.toMatch(/from ['"].*\/audio\//);
  });

  it('Bloco 3: existeSom diz se o catálogo tem um id; duckCanal e tocarFaixaMusica nunca lançam', () => {
    const cat: Catalogo = { obter: (id) => (id === 'amb_estadio_cheio' ? { id, ficheiro: 'x.mp3', categoria: 'ambiente', duracao: 10, loop: true, volumeBase: 1 } : undefined) };
    const a = new AudioManager(cat);
    expect(a.existeSom('amb_estadio_cheio')).toBe(true);
    expect(a.existeSom('amb_estadio_vazio')).toBe(false);
    expect(() => a.duckCanal('musica', 100)).not.toThrow();
    expect(() => a.duckCanal('musica', 100, false)).not.toThrow();
    let acabou = false;
    expect(() => a.tocarFaixaMusica('mus_menu', () => { acabou = true; })).not.toThrow();
    expect(acabou).toBe(true); // sem ficheiro no catálogo falso: silêncio, mas a playlist tem de poder avançar
  });

  it('Bloco 3: depois de uma cutscene, a música e o ambiente voltam a subir (fade in) — nunca ficam mudos para sempre', async () => {
    const cat: Catalogo = { obter: (id) => ({ id, ficheiro: `audio/${id}.mp3`, categoria: 'cutscene' as const, duracao: 38, loop: false, volumeBase: 1 }) };
    const a = new AudioManager(cat);
    let acabou = false;
    a.tocarCutscene('champions', () => { acabou = true; });
    a.saltarCutscene();
    await new Promise((r) => setTimeout(r, 400));
    expect(acabou).toBe(true);
    // Sem AudioContext real (Node), isto só confirma que o fluxo de saltar→terminar→restaurar nunca lança.
    expect(() => a.saltarCutscene()).not.toThrow();
  });
});

describe('embaralhar (Prompt 10, Bloco 4)', () => {
  it('é uma permutação (mesmos elementos, possivelmente outra ordem) e não muda a lista original', () => {
    const original = ['a', 'b', 'c', 'd', 'e'];
    const copia = [...original];
    const emb = embaralhar(original, Math.random);
    expect([...emb].sort()).toEqual([...original].sort());
    expect(original).toEqual(copia);
  });
  it('determinístico com um gerador fixo (testável sem Math.random a sério): a mesma sequência dá sempre a mesma ordem', () => {
    const geradorFixo = () => { const seq = [0.9, 0.1, 0.5, 0.0]; let i = 0; return () => seq[i++ % seq.length]; };
    expect(embaralhar(['a', 'b', 'c', 'd'], geradorFixo())).toEqual(embaralhar(['a', 'b', 'c', 'd'], geradorFixo()));
  });
});

describe('PlaylistGestao (Prompt 10, Bloco 4)', () => {
  function tocadorFalso() {
    const chamadas: string[] = [];
    let aoAcabarActual: (() => void) | null = null;
    const tocador: TocadorMusica = { tocarFaixaMusica: (id, aoAcabar) => { chamadas.push(id); aoAcabarActual = aoAcabar; } };
    // A pausa entre faixas é sempre pelo menos um `setTimeout` (mesmo com pausaMinMs/pausaMaxMs a 0): esperar um
    // instante real deixa a próxima faixa tocar antes de continuar o teste.
    const acabarFaixaActual = async () => { aoAcabarActual?.(); await new Promise((r) => setTimeout(r, 5)); };
    return { tocador, chamadas, acabarFaixaActual };
  }

  it('sem faixas: nunca toca nada (silêncio)', () => {
    const { tocador, chamadas } = tocadorFalso();
    const p = new PlaylistGestao(tocador, []);
    p.iniciar();
    expect(chamadas).toEqual([]);
  });

  it('toca todas as faixas, sem repetir, antes de reembaralhar (ordem aleatória sem repetir até todas tocarem)', async () => {
    const { tocador, chamadas, acabarFaixaActual } = tocadorFalso();
    const faixas = ['mus_gestao_1', 'mus_gestao_2', 'mus_gestao_3'];
    const p = new PlaylistGestao(tocador, faixas, { pausaMinMs: 0, pausaMaxMs: 0, aleatorio: Math.random });
    p.iniciar();
    for (let i = 0; i < faixas.length - 1; i++) await acabarFaixaActual();
    expect(chamadas).toHaveLength(faixas.length);
    expect([...chamadas].sort()).toEqual([...faixas].sort());
  });

  it('parar() impede a próxima faixa de tocar, mesmo que a actual já tivesse acabado', async () => {
    const { tocador, chamadas, acabarFaixaActual } = tocadorFalso();
    const p = new PlaylistGestao(tocador, ['mus_gestao_1', 'mus_gestao_2'], { pausaMinMs: 0, pausaMaxMs: 0, aleatorio: Math.random });
    p.iniciar();
    expect(chamadas).toHaveLength(1);
    p.parar();
    await acabarFaixaActual(); // a faixa "acaba" depois de parar: não deve agendar a próxima
    expect(chamadas).toHaveLength(1);
  });

  it('uma só faixa: toca, acaba, e volta a tocar a mesma (nunca para de vez)', async () => {
    const { tocador, chamadas, acabarFaixaActual } = tocadorFalso();
    const p = new PlaylistGestao(tocador, ['mus_menu'], { pausaMinMs: 0, pausaMaxMs: 0, aleatorio: Math.random });
    p.iniciar();
    await acabarFaixaActual();
    await acabarFaixaActual();
    expect(chamadas).toEqual(['mus_menu', 'mus_menu', 'mus_menu']);
  });
});

describe('catálogo real (Prompt 10, Bloco 2)', () => {
  it('sem fetch disponível, ou a falhar: devolve o catálogo vazio, nunca lança', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error('offline'));
    try {
      const cat = await carregarCatalogoReal();
      expect(cat.obter('mus_menu')).toBeUndefined();
    } finally {
      globalThis.fetch = original;
    }
  });
  it('resposta não-ok (404): devolve o catálogo vazio', async () => {
    const original = globalThis.fetch;
    // @ts-expect-error -- simula uma resposta HTTP sem ser OK.
    globalThis.fetch = () => Promise.resolve({ ok: false });
    try {
      const cat = await carregarCatalogoReal();
      expect(cat.obter('mus_menu')).toBeUndefined();
    } finally {
      globalThis.fetch = original;
    }
  });
  it('manifesto válido: resolve os ids, com o caminho do ficheiro prefixado por baseUrl', async () => {
    const original = globalThis.fetch;
    const itens: ItemCatalogo[] = [{ id: 'mus_menu', ficheiro: 'mus_menu.mp3', categoria: 'musica', duracao: 10, loop: true, volumeBase: 1 }];
    // @ts-expect-error -- simula a resposta fetch(audio.json) sem um servidor a sério.
    globalThis.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(itens) });
    try {
      const cat = await carregarCatalogoReal('/base/');
      expect(cat.obter('mus_menu')).toMatchObject({ id: 'mus_menu', ficheiro: '/base/audio/mus_menu.mp3' });
      expect(cat.obter('nao_existe')).toBeUndefined();
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('manifesto gerado (public/audio/audio.json) — se existir, respeita os orçamentos do Bloco 2', () => {
  it('cada item tem a forma certa; pesos dentro do orçamento por categoria; total ≤ 30 MB', () => {
    let bruto: string;
    try { bruto = readFileSync('public/audio/audio.json', 'utf8'); } catch { return; } // ainda não gerado: nada a verificar
    const itens = JSON.parse(bruto) as (ItemCatalogo & { peso: number })[];
    const LIMITE: Record<ItemCatalogo['categoria'], number> = { ambiente: 800 * 1024, musica: 5 * 1024 * 1024, cutscene: 1024 * 1024 };
    let total = 0;
    for (const i of itens) {
      expect(PLAYLIST_GESTAO.includes(i.id) || /^amb_|^mus_|^cut_/.test(i.id), i.id).toBe(true);
      expect(i.duracao, i.id).toBeGreaterThan(0);
      expect(i.peso, i.id).toBeLessThanOrEqual(LIMITE[i.categoria]);
      total += i.peso;
    }
    expect(total).toBeLessThanOrEqual(30 * 1024 * 1024);
  });
});

describe('service worker: áudio cache-first, só mus_menu pré-cacheado (Prompt 10, Bloco 5)', () => {
  const sw = readFileSync('public/sw.js', 'utf8');
  it('pré-cache do áudio é só mus_menu (e o manifesto) — nunca o pacote todo na instalação', () => {
    const m = /PRE_CACHE_AUDIO\s*=\s*(\[[^\]]*\])/.exec(sw);
    expect(m, 'PRE_CACHE_AUDIO não encontrado em sw.js').not.toBeNull();
    const lista = JSON.parse(m![1].replace(/'/g, '"')) as string[];
    expect(lista.some((f) => f.includes('mus_menu'))).toBe(true);
    expect(lista.every((f) => f.includes('mus_menu') || f.includes('audio.json'))).toBe(true);
  });
  it('tem um limite de bytes e uma função de limpeza para a cache de áudio', () => {
    expect(sw).toMatch(/LIMITE_AUDIO_BYTES\s*=\s*\d/);
    expect(sw).toMatch(/limparCacheAudio/);
  });
  it('áudio já em cache nunca volta a pedir à rede (cache-first)', () => {
    expect(sw).toMatch(/ehAudio\s*&&\s*hit\)\s*return hit/);
  });
});

describe('AudioManager: pré-decodificar e libertar buffers (Prompt 10, Bloco 5)', () => {
  it('preDecodificar nunca lança, mesmo sem ficheiro no catálogo', () => {
    const a = new AudioManager(CATALOGO_VAZIO);
    expect(() => a.preDecodificar('cut_champions')).not.toThrow();
  });
  it('com tudo silenciado, preDecodificar não faz nada (não decodifica às escondidas)', () => {
    const chamado: string[] = [];
    const cat: Catalogo = { obter: (id) => { chamado.push(id); return undefined; } };
    const a = new AudioManager(cat);
    a.silenciarTudo(true);
    a.preDecodificar('cut_champions');
    expect(chamado).toEqual([]); // nem chegou a perguntar ao catálogo
  });
  it('libertarBuffers nunca lança, mesmo sem nada decodificado', () => {
    const a = new AudioManager(CATALOGO_VAZIO);
    expect(() => a.libertarBuffers(['cut_champions', 'cut_europa'])).not.toThrow();
  });
});

function listarTs(dir: string): string[] {
  const out: string[] = [];
  let entradas: import('node:fs').Dirent[];
  try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entradas) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...listarTs(p));
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}
