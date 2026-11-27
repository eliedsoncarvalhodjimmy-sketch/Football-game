// Prompt 10, Bloco 1: núcleo do áudio. Corre em Node (sem Web Audio nem DOM): a lógica de volumes, definições e
// catálogo tem de ser toda testável sem um navegador a sério; a reprodução em si, sem AudioContext nem <audio>, não
// faz nada (silêncio), nunca lança. O desbloqueio e a pausa em segundo plano precisam de um navegador — ver o relatório.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { AudioManager } from '../src/audio/AudioManager.ts';
import { definicoesPorDefeito, lerDefinicoes, gravarDefinicoes, type Armazenamento } from '../src/audio/persistencia.ts';
import { CATALOGO_VAZIO, type Catalogo, type ItemCatalogo } from '../src/audio/tipos.ts';
import { AUDIO, CANAIS } from '../src/config/audio.ts';

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
