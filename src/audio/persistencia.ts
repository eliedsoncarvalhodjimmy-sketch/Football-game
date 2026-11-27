// Prompt 10, Bloco 1: definições de som em localStorage, nunca no save de jogo. Armazenamento injectável (por defeito
// window.localStorage) para poder testar em Node sem DOM, e para nunca rebentar se o armazenamento estiver bloqueado
// (Safari privado, quota excedida): aí o som simplesmente não persiste entre sessões.
import { AUDIO, CANAIS, type Canal } from '../config/audio.ts';
import type { DefinicoesAudio } from './tipos.ts';

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function definicoesPorDefeito(): DefinicoesAudio {
  return { volume: { ...AUDIO.volume_defeito }, geral: AUDIO.volume_geral_defeito, silenciado: false };
}

/** Lê as definições guardadas; em falta, inválidas ou sem armazenamento, devolve as por defeito (nunca lança). */
export function lerDefinicoes(arm: Armazenamento | undefined = globalThis.localStorage): DefinicoesAudio {
  const base = definicoesPorDefeito();
  try {
    const bruto = arm?.getItem(AUDIO.chave_definicoes);
    if (!bruto) return base;
    const d = JSON.parse(bruto) as Partial<DefinicoesAudio>;
    const volume = { ...base.volume };
    for (const c of CANAIS) if (typeof d.volume?.[c] === 'number') volume[c] = clamp01(d.volume[c]);
    return { volume, geral: typeof d.geral === 'number' ? clamp01(d.geral) : base.geral, silenciado: !!d.silenciado };
  } catch {
    return base;
  }
}

export function gravarDefinicoes(d: DefinicoesAudio, arm: Armazenamento | undefined = globalThis.localStorage) {
  try { arm?.setItem(AUDIO.chave_definicoes, JSON.stringify(d)); } catch { /* sem armazenamento: dura só esta sessão */ }
}

export type { Canal };
