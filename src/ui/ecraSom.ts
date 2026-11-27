// Prompt 10, Bloco 1: ecrã "Definições" → "Som". 3 sliders por canal, volume geral e silenciar tudo. As definições
// vivem só no AudioManager/localStorage (import { AUDIO } from '../config/audio.ts' define a chave); nunca passam pelo
// comando/registo do jogo, por isso este ecrã não precisa do worker.
import type { AudioManager } from '../audio/AudioManager.ts';
import { CANAIS, type Canal } from '../config/audio.ts';
import { svg } from './icones.ts';

const NOME_CANAL: Record<Canal, string> = { musica: 'Música', ambiente: 'Ambiente (estádio, imprensa)', cutscene: 'Cutscenes' };

export function htmlDefinicoes(audio: AudioManager): string {
  const d = audio.definicoesActuais();
  const pct = (v: number) => Math.round(v * 100);
  const slider = (id: string, rotulo: string, valor: number, disabled: boolean) =>
    `<label class="rot" style="display:block;margin:10px 0">${rotulo} <b style="float:right">${pct(valor)}%</b>
      <input type="range" data-som="${id}" min="0" max="100" value="${pct(valor)}" ${disabled ? 'disabled' : ''} style="width:100%;margin-top:4px"></label>`;
  return `<div class="grelha">
    <section class="c s12"><h2>Som</h2>
      <button class="btn" id="som-silenciar" aria-pressed="${d.silenciado}">${svg(d.silenciado ? 'somMudo' : 'som')} ${d.silenciado ? 'Voltar a ligar o som' : 'Silenciar tudo'}</button>
      ${slider('geral', 'Volume geral', d.geral, false)}
      ${CANAIS.map((c) => slider(c, NOME_CANAL[c], d.volume[c], d.silenciado)).join('')}
      <div class="rot" style="margin-top:14px">O volume fica guardado neste dispositivo; não entra nas gravações da carreira.</div>
    </section>
  </div>`;
}

/** Liga os sliders e o botão de silenciar; `redesenhar` volta a chamar `htmlDefinicoes` e a substituir o HTML (mais
 *  simples do que actualizar nó a nó, e o ecrã é pequeno). */
export function ligarDefinicoes(el: HTMLElement, audio: AudioManager, redesenhar: () => void) {
  el.querySelector('#som-silenciar')?.addEventListener('click', () => { audio.silenciarTudo(!audio.definicoesActuais().silenciado); redesenhar(); });
  el.querySelectorAll<HTMLInputElement>('[data-som]').forEach((input) => {
    input.addEventListener('input', () => {
      const v = Number(input.value) / 100;
      const canal = input.dataset.som!;
      if (canal === 'geral') audio.definirVolumeGeral(v); else audio.definirVolumeCanal(canal as Canal, v);
    });
    // Só redesenha (a percentagem no rótulo) ao soltar, para não re-renderizar a cada pixel do arrasto.
    input.addEventListener('change', redesenhar);
  });
}
