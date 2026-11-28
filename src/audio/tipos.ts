// Prompt 10: tipos partilhados do áudio. Nada aqui importa Web Audio — só formas de dados.
import type { Canal } from '../config/audio.ts';

export type ContextoMusica = 'menu' | 'gestao' | 'partida';
export type IdCutscene = 'champions' | 'europa';

/** Um som do catálogo (Bloco 2 popula a partir de `public/audio/audio.json`, gerado por `scripts/audio/preparar.ts`). */
export interface ItemCatalogo {
  id: string;
  ficheiro: string; // caminho em public/audio/
  categoria: 'ambiente' | 'musica' | 'cutscene';
  duracao: number; // segundos
  loop: boolean;
  volumeBase: number; // 0–1, afinação por item dentro do canal
  /** Peso em bytes do ficheiro processado (informativo — orçamentos do Bloco 2); não usado para tocar. */
  peso?: number;
}

/** O catálogo é só uma forma de encontrar o ficheiro de um id; sem ficheiro = silêncio (nunca erro). */
export interface Catalogo {
  obter(id: string): ItemCatalogo | undefined;
}

/** Catálogo vazio (antes do Bloco 2, ou se o manifesto falhar a carregar): tudo em silêncio, sem rebentar. */
export const CATALOGO_VAZIO: Catalogo = { obter: () => undefined };

export interface DefinicoesAudio {
  volume: Record<Canal, number>;
  geral: number;
  silenciado: boolean;
}
