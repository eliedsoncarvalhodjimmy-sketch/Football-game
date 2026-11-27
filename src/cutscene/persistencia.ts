// Prompt 11, Bloco 5: frequência das cutscenes europeias em localStorage, nunca no save de jogo (mesma ideia de
// `src/audio/persistencia.ts`). Armazenamento injectável para testar em Node sem DOM, e para nunca rebentar se o
// armazenamento estiver bloqueado (Safari privado, quota excedida): aí a definição simplesmente não persiste.
import { CUTSCENE, FREQUENCIAS_CUTSCENE, type FrequenciaCutscene } from '../config/cutscene.ts';

export interface Armazenamento { getItem(chave: string): string | null; setItem(chave: string, valor: string): void }

/** Lê a frequência guardada; em falta, inválida ou sem armazenamento, devolve a por defeito (nunca lança). */
export function lerFrequenciaCutscene(arm: Armazenamento | undefined = globalThis.localStorage): FrequenciaCutscene {
  try {
    const v = arm?.getItem(CUTSCENE.chave_definicoes);
    return (FREQUENCIAS_CUTSCENE as readonly string[]).includes(v ?? '') ? (v as FrequenciaCutscene) : CUTSCENE.frequencia_defeito;
  } catch {
    return CUTSCENE.frequencia_defeito;
  }
}

export function gravarFrequenciaCutscene(f: FrequenciaCutscene, arm: Armazenamento | undefined = globalThis.localStorage) {
  try { arm?.setItem(CUTSCENE.chave_definicoes, f); } catch { /* sem armazenamento: dura só esta sessão */ }
}

/** Decide se a cutscene deve correr, dada a frequência escolhida e se este é o primeiro jogo desta fase (Bloco 5). */
export function deveMostrarCutscene(freq: FrequenciaCutscene, primeiraFase: boolean): boolean {
  if (freq === 'nunca') return false;
  if (freq === 'sempre') return true;
  return primeiraFase;
}

/** Decide se a cutscene deve abrir: há dados completos (fase, estádio, clubes) e a política manda mostrar. Sem
 *  `info` (a chave não é europeia) ou sem `dadosCutscene` (dados em falta): nunca abre — o dia segue directo para
 *  o ecrã do jogo, sem erro (Bloco 7: "sem escudos/estádio/dados, a cutscene salta-se sozinha"). */
export function devoAbrirCutscene(info: { primeiraFase: boolean } | null, dadosCutscene: unknown | null, freq: FrequenciaCutscene): boolean {
  if (!info || !dadosCutscene) return false;
  return deveMostrarCutscene(freq, info.primeiraFase);
}
