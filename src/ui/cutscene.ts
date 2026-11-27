// Prompt 11, Bloco 1: invólucro de DOM da cutscene (igual em espírito a `jogo2d.ts`: cria o elemento, o <canvas>, o
// botão de saltar; o desenho em si é `src/cutscene/`, puro). Não cria a cutscene se faltarem dados essenciais —
// a chamada `abrirCutscene` nem deve acontecer nesse caso (quem chama decide e segue a transição normal).
import { Cutscene } from '../cutscene/motor.ts';
import { CUTSCENE } from '../config/cutscene.ts';
import type { DadosCutscene, FuncaoCena, IdCompeticao, LinhaTempo } from '../cutscene/tipos.ts';
import type { AudioManager } from '../audio/AudioManager.ts';

export interface OpcoesAbrirCutscene {
  idComp: IdCompeticao;
  tl: LinhaTempo;
  dados: DadosCutscene;
  desenhar: FuncaoCena;
  /** Opcional: sem áudio, a cutscene corre à mesma, com a mesma duração (performance.now()). */
  audio?: AudioManager;
}

/** Abre a cutscene a cobrir o ecrã. `aoFechar` chama-se uma única vez, ao terminar (naturalmente ou ao saltar). */
export function abrirCutscene(op: OpcoesAbrirCutscene, aoFechar: () => void) {
  const reduzido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'cutscene';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `Noite europeia: ${op.dados.casa.nome} e ${op.dados.fora.nome}`);

  let fechado = false;
  let aoRedimensionar: (() => void) | null = null;
  const fechar = () => {
    if (fechado) return;
    fechado = true;
    op.audio?.cutsceneFechou();
    if (aoRedimensionar) window.removeEventListener('resize', aoRedimensionar);
    el.remove();
    aoFechar();
  };

  if (reduzido) {
    el.innerHTML = `<div class="cs-cartaz"><b>${esc(op.dados.casa.nome)} · ${esc(op.dados.fora.nome)}</b><span>${esc(op.dados.fase)}</span><span>${esc(op.dados.estadio)} · ${esc(op.dados.cidade)}</span><span>${esc(op.dados.data)}</span></div>`;
    document.body.appendChild(el);
    op.audio?.tocarCutscene(op.idComp, () => {}, 0.4); // "áudio baixo" no cartaz estático
    setTimeout(fechar, CUTSCENE.reduzido_duracao_s * 1000);
    return;
  }

  el.innerHTML = `<canvas aria-label="Cutscene"></canvas><button class="cs-saltar" type="button">Saltar ›</button>`;
  document.body.appendChild(el);
  const canvas = el.querySelector('canvas') as HTMLCanvasElement;
  const botaoSaltar = el.querySelector('.cs-saltar') as HTMLElement;

  const cena = new Cutscene({
    canvas,
    tl: op.tl,
    dados: op.dados,
    desenhar: op.desenhar,
    fonteTempo: op.audio ?? null,
    aoTerminar: fechar,
  });
  cena.aoPoderSaltar((pode) => botaoSaltar.classList.toggle('on', pode));
  el.addEventListener('pointerdown', (ev) => { if ((ev.target as HTMLElement).closest('.cs-saltar')) return; cena.tocouNoEcra(); });
  botaoSaltar.addEventListener('click', () => { cena.saltar(); op.audio?.saltarCutscene(); });
  aoRedimensionar = () => cena.redimensionar();
  window.addEventListener('resize', aoRedimensionar);

  if (op.audio) op.audio.tocarCutscene(op.idComp, () => {});
  cena.iniciar();
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
