// Prompt 11, Bloco 5: ecrã "Definições" → "Cutscenes europeias". 3 opções de frequência; guardadas em localStorage
// (nunca no save), como o volume do som em `ecraSom.ts`. Não precisa do worker.
import { FREQUENCIAS_CUTSCENE, type FrequenciaCutscene } from '../config/cutscene.ts';
import { lerFrequenciaCutscene, gravarFrequenciaCutscene } from '../cutscene/persistencia.ts';

const ROTULO: Record<FrequenciaCutscene, string> = { sempre: 'Sempre', primeira_fase: 'Só a primeira de cada fase', nunca: 'Nunca' };

export function htmlDefinicoesCutscene(): string {
  const actual = lerFrequenciaCutscene();
  return `<div class="grelha">
    <section class="c s12"><h2>Cutscenes europeias</h2>
      <div class="seg" role="radiogroup" aria-label="Frequência das cutscenes europeias">
        ${FREQUENCIAS_CUTSCENE.map((f) => `<button data-freq="${f}" class="${f === actual ? 'on' : ''}" aria-pressed="${f === actual}">${ROTULO[f]}</button>`).join('')}
      </div>
      <div class="rot" style="margin-top:14px">Decide quando mostrar a animação de abertura (~38 s) antes de um jogo da Champions ou da Liga Europa. Fica só neste dispositivo.</div>
    </section>
  </div>`;
}

/** Liga os botões de frequência; `redesenhar` volta a chamar `htmlDefinicoesCutscene` (mesmo molde de `ligarDefinicoes`). */
export function ligarDefinicoesCutscene(el: HTMLElement, redesenhar: () => void) {
  el.querySelectorAll<HTMLButtonElement>('[data-freq]').forEach((b) => b.addEventListener('click', () => { gravarFrequenciaCutscene(b.dataset.freq as FrequenciaCutscene); redesenhar(); }));
}
