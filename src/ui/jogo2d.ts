// Ecrã do jogo do utilizador: highlights (os melhores momentos), não os 90 minutos. O worker jogou o jogo no motor 2D e
// devolveu a configuração exacta; aqui o mesmo jogo (determinístico) corre de novo na página, em blocos à frente do
// ecrã, e mostram-se só os lances escolhidos: 1× nos lances, replay dos golos a 0,5×, e entre lances um corte directo
// com o minuto e o marcador. O marcador e o relato nunca mostram o que ainda não passou no ecrã.
import { Motor2D } from '../engine/match2d/Motor2D.ts';
import { Apresentacao } from '../engine/match2d/apresentacao.ts';
import type { NivelLances } from '../engine/match2d/lances.ts';
import type { VistaJogo2D } from '../jogo/sessao.ts';
import type { Evento2D } from '../engine/match2d/tipos.ts';
import type { AudioManager } from '../audio/AudioManager.ts';
import { AUDIO } from '../config/audio.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const relogio = (tk: number) => `${Math.floor(tk / 600)}:${String(Math.floor((tk / 10) % 60)).padStart(2, '0')}`;
const NOME_LANCE: Record<string, string> = { golo: 'Golo', penalti: 'Penálti', vermelho: 'Expulsão', remate_perigoso: 'Ocasião de golo', defesa_dificil: 'Grande defesa', contra_ataque: 'Contra-ataque', livre_directo: 'Livre directo', remate_enquadrado: 'Remate enquadrado', canto: 'Canto', cruzamento_perigoso: 'Cruzamento perigoso', amarelo: 'Cartão amarelo', corte_area: 'Corte na área', construcao: 'Jogo corrido' };
const NIVEIS: [NivelLances, string][] = [['chave', 'Resumo curto'], ['alargados', 'Resumo alargado']];
const VELS: [number, string][] = [[0.5, '0,5×'], [1, '1×'], [2, '2×'], [4, '4×']];

/** Contraste: texto escuro sobre cores claras. */
function textoSobre(cor: string) {
  const h = cor.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? '#111' : '#fff';
}

export function abrirJogo2D(v: VistaJogo2D, aoFechar: () => void, audio?: AudioManager) {
  const el = document.createElement('div');
  el.className = 'jogo2d';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${v.nomes[0]} contra ${v.nomes[1]}`);
  // Cores das equipas: a de fora usa a segunda cor se as principais forem parecidas.
  const c0 = v.cores[0][0], c1 = v.cores[1][0] === c0 ? v.cores[1][1] : v.cores[1][0];
  el.innerHTML = `<div class="jg-cab">
      <div class="jg-eq"><span class="pt" style="background:${c0}"></span>${esc(v.nomes[0])}</div>
      <div class="jg-placar"><b id="jg-golos">0 – 0</b><small id="jg-tempo">0:00</small></div>
      <div class="jg-eq dir">${esc(v.nomes[1])}<span class="pt" style="background:${c1}"></span></div>
    </div>
    <div class="jg-ctrl">
      <div class="seg" id="jg-nivel">${NIVEIS.map(([k, t]) => `<button data-n="${k}" class="${k === 'alargados' ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="seg" id="jg-vel">${VELS.map(([k, t]) => `<button data-v="${k}" class="${k === 1 ? 'on' : ''}">${t}</button>`).join('')}</div>
      <button class="btn" id="jg-pausa">Pausa</button><button class="btn" id="jg-fim">Saltar para o fim</button>
    </div>
    <div class="jg-corpo"><canvas id="jg-campo" width="1050" height="700" aria-label="Campo"></canvas><div class="jg-relato" id="jg-relato" aria-live="polite"></div></div>
    <div class="jg-final" id="jg-final" hidden><b></b><button class="btn prim" id="jg-continuar">Continuar</button></div>`;
  document.body.appendChild(el);

  const motor = new Motor2D(v.config);
  const apres = new Apresentacao(motor, 'alargados');
  apres.simular(Infinity, 3000);
  let vel = 1, pausa = false, ult = 0, vivo = true, uRelato = -1, uSom = 0;
  const nomes = new Map(v.config.equipas.flatMap((q) => q.jogadores.map((j) => [j.id, j.nome] as const)));
  const nome = (id?: string) => (id ? nomes.get(id) ?? '' : '');

  // Prompt 10, Bloco 3: som ambiente do estádio. Sem `amb_estadio_vazio` no catálogo (ainda não fornecido), fica
  // sempre `amb_estadio_cheio`, com o volume mais baixo nos jogos de pouca gente — exactamente como o fallback pede.
  const ambienteId = v.lotacao < AUDIO.lotacao_vazia_abaixo && audio?.existeSom('amb_estadio_vazio') ? 'amb_estadio_vazio' : 'amb_estadio_cheio';
  const volumeAmbiente = (ambienteId === 'amb_estadio_cheio' && v.lotacao < AUDIO.lotacao_vazia_abaixo ? 0.5 : 1) * (v.jogoImportante ? 1 + AUDIO.volume_extra_jogo_importante : 1);
  let timerTensao: ReturnType<typeof setTimeout> | null = null;
  audio?.duckCanal('musica', AUDIO.fade.ambiente_crossfade_ms);
  audio?.definirAmbiente(ambienteId, volumeAmbiente);

  const fechar = () => { vivo = false; el.remove(); aoFechar(); };
  const final = () => {
    vivo = false;
    if (timerTensao) clearTimeout(timerTensao);
    audio?.definirAmbiente(null); // desvanece em ~1,5s (ver fadeCanal/pararCanal)
    audio?.duckCanal('musica', AUDIO.fade.musica_crossfade_ms, false); // regressa a música de gestão
    const f = el.querySelector('#jg-final') as HTMLElement;
    f.querySelector('b')!.textContent = `Final: ${v.nomes[0]} ${v.resultado[0]} – ${v.resultado[1]} ${v.nomes[1]}`;
    f.hidden = false;
    (el.querySelector('#jg-golos') as HTMLElement).textContent = `${v.resultado[0]} – ${v.resultado[1]}`;
    (el.querySelector('#jg-tempo') as HTMLElement).textContent = '90:00';
  };
  el.querySelector('#jg-nivel')!.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest('button'); if (!b) return;
    // O nível vale para os blocos ainda por escolher (os lances já escolhidos ficam).
    apres.nivel = b.dataset.n as NivelLances;
    el.querySelectorAll('#jg-nivel button').forEach((x) => x.classList.toggle('on', x === b));
  });
  el.querySelector('#jg-vel')!.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest('button'); if (!b) return;
    vel = Number(b.dataset.v);
    el.querySelectorAll('#jg-vel button').forEach((x) => x.classList.toggle('on', x === b));
  });
  el.querySelector('#jg-pausa')!.addEventListener('click', (ev) => { pausa = !pausa; (ev.target as HTMLElement).textContent = pausa ? 'Retomar' : 'Pausa'; });
  el.querySelector('#jg-fim')!.addEventListener('click', final);
  el.querySelector('#jg-continuar')!.addEventListener('click', fechar);

  // ---------------------------------------------------------------- desenho
  const cv = el.querySelector('#jg-campo') as HTMLCanvasElement, cx = cv.getContext('2d')!;
  const MARG = 3, ESC = cv.width / (105 + 2 * MARG);
  const px = (x: number) => (x + MARG) * ESC, py = (y: number) => (y + MARG) * ESC;
  const cores = [[c0, textoSobre(c0)], [c1, textoSobre(c1)]];
  function relvado() {
    cx.fillStyle = '#2e7d3a'; cx.fillRect(0, 0, cv.width, cv.height);
    for (let k = 0; k < 11; k++) { cx.fillStyle = 'rgba(255,255,255,.035)'; cx.fillRect((k * 10 + MARG) * ESC, MARG * ESC, 5 * ESC, 68 * ESC); }
    cx.strokeStyle = 'rgba(255,255,255,.7)'; cx.lineWidth = Math.max(1, ESC * 0.25);
    const R = (x: number, y: number, a: number, b: number) => cx.strokeRect(px(x), py(y), a * ESC, b * ESC);
    R(0, 0, 105, 68); R(0, 13.85, 16.5, 40.3); R(88.5, 13.85, 16.5, 40.3); R(0, 24.85, 5.5, 18.3); R(99.5, 24.85, 5.5, 18.3);
    cx.beginPath(); cx.moveTo(px(52.5), py(0)); cx.lineTo(px(52.5), py(68)); cx.stroke();
    cx.beginPath(); cx.arc(px(52.5), py(34), 9.15 * ESC, 0, 7); cx.stroke();
  }
  function desenhar() {
    const f = apres.fotosEcra();
    relvado();
    if (!f) return;
    const { ant, act, alfa } = f, lerp = (a: number, b: number) => a + (b - a) * alfa;
    const antes = new Map(ant.jogadores.map((j) => [j.id, j]));
    for (const j of act.jogadores) {
      const a = antes.get(j.id) ?? j, x = lerp(a.x, j.x), y = lerp(a.y, j.y), c = cores[j.equipa];
      let dc = j.corpo - a.corpo; while (dc > Math.PI) dc -= 2 * Math.PI; while (dc < -Math.PI) dc += 2 * Math.PI;
      cx.save(); cx.translate(px(x), py(y)); cx.rotate(a.corpo + dc * alfa);
      cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(2.4 * ESC, 0); cx.lineTo(1.55 * ESC, -0.65 * ESC); cx.lineTo(1.55 * ESC, 0.65 * ESC); cx.closePath(); cx.fill(); cx.restore();
      cx.beginPath(); cx.arc(px(x), py(y), 1.35 * ESC, 0, 7); cx.fillStyle = c[0]; cx.fill();
      cx.lineWidth = 1.5; cx.strokeStyle = 'rgba(0,0,0,.45)'; cx.stroke();
      cx.fillStyle = c[1]; cx.font = `700 ${1.45 * ESC}px Inter, sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(String(j.numero), px(x), py(y) + 0.1 * ESC);
    }
    const b = { x: lerp(ant.bola.x, act.bola.x), y: lerp(ant.bola.y, act.bola.y) }, z = lerp(ant.z ?? 0, act.z ?? 0);
    cx.beginPath(); cx.ellipse(px(b.x), py(b.y) + 0.3 * ESC, (0.75 + z * 0.05) * ESC, 0.45 * ESC, 0, 0, 7); cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fill();
    cx.beginPath(); cx.arc(px(b.x), py(b.y - z * 0.45), (0.75 + z * 0.08) * ESC, 0, 7); cx.fillStyle = '#fff'; cx.fill(); cx.lineWidth = 1.5; cx.strokeStyle = '#111'; cx.stroke();
    // Corte entre lances: cartão com o minuto e o marcador do lance seguinte (o campo fica escurecido por trás).
    if (apres.modo === 'corte') {
      const e = apres.estatisticas(), prox = apres.proximoLance();
      const min = `${Math.floor(Math.min(54000, apres.t) / 600) + 1}'`;
      const placar = `${v.nomes[0]} ${e ? e.golos[0] : 0} – ${e ? e.golos[1] : 0} ${v.nomes[1]}`;
      cx.fillStyle = 'rgba(8,10,14,.72)'; cx.fillRect(0, 0, cv.width, cv.height);
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#fff';
      cx.font = `800 ${6 * ESC}px Inter, sans-serif`; cx.fillText(min, cv.width / 2, cv.height / 2 - 4 * ESC);
      cx.font = `700 ${2.4 * ESC}px Inter, sans-serif`; cx.fillText(placar, cv.width / 2, cv.height / 2 + 2.5 * ESC);
      if (prox) { cx.font = `600 ${1.8 * ESC}px Inter, sans-serif`; cx.fillStyle = 'rgba(255,255,255,.75)'; cx.fillText(NOME_LANCE[prox.tipo] ?? '', cv.width / 2, cv.height / 2 + 6.5 * ESC); }
      return;
    }
    // Lance actual e modo (replay).
    const l = apres.lanceActual(), dentro = l && apres.t >= l.inicio;
    cx.textBaseline = 'middle'; cx.textAlign = 'left'; cx.font = `700 ${1.6 * ESC}px Inter, sans-serif`;
    const etiqueta = apres.modo === 'replay' ? 'REPLAY 0,5×' : dentro && l ? NOME_LANCE[l.tipo] ?? '' : '';
    if (etiqueta) {
      const w = cx.measureText(etiqueta).width + 2 * ESC;
      cx.fillStyle = apres.modo === 'replay' ? 'rgba(200,30,40,.85)' : 'rgba(0,0,0,.55)'; cx.fillRect(px(0.5), py(0.5), w, 3 * ESC);
      cx.fillStyle = '#fff'; cx.fillText(etiqueta, px(0.5) + ESC, py(2));
    }
  }
  const TXT: Partial<Record<Evento2D['tipo'], (x: Evento2D) => string>> = {
    golo: (x) => `<b>GOLO! ${esc(nome(x.jogador))}</b>`, remate: (x) => `${esc(nome(x.jogador))} remata`, defesa: (x) => `${esc(nome(x.jogador))} defende`,
    cartao: (x) => `${x.subtipo === 'AMARELO' ? '🟨' : '🟥'} ${esc(nome(x.jogador))}`, expulsao: (x) => `<b>${esc(nome(x.jogador))} expulso</b>`, penalti: () => '<b>Penálti!</b>',
    falta: (x) => `Falta de ${esc(nome(x.jogador))}`, desarme: (x) => `${esc(nome(x.jogador))} desarma ${esc(nome(x.outro))}`, bloqueio: (x) => `${esc(nome(x.jogador))} bloqueia o remate`,
    reposicao: (x) => (x.x < 2 || x.x > 103) && (x.y < 2 || x.y > 66) ? `Canto para a equipa de ${esc(nome(x.jogador))}` : '', drible: (x) => `${esc(nome(x.jogador))} dribla ${esc(nome(x.outro))}`, cruzamento: (x) => `${esc(nome(x.jogador))} cruza`, intervalo: () => '<b>Intervalo</b>', fora_de_jogo: (x) => `${esc(nome(x.jogador))} em fora de jogo`,
  };
  function paineis() {
    const e = apres.estatisticas(), t = Math.floor(apres.t);
    if (e) (el.querySelector('#jg-golos') as HTMLElement).textContent = `${e.golos[0]} – ${e.golos[1]}`;
    (el.querySelector('#jg-tempo') as HTMLElement).textContent = relogio(Math.min(54000, apres.tickEcra));
    // Relato: os últimos eventos relevantes até ao minuto mostrado.
    const r = motor.registo; let a = 0, z = r.length;
    while (a < z) { const m = (a + z) >> 1; if (r[m].tick <= t) a = m + 1; else z = m; }
    // Ocasião de golo: crossfade para a ambiência de tensão (se existir), de volta ao normal passado um tempo.
    if (audio && a > uSom) {
      for (let k = uSom; k < a; k++) {
        if (r[k].tipo !== 'golo') continue;
        audio.definirAmbiente('amb_estadio_tensao', volumeAmbiente);
        if (timerTensao) clearTimeout(timerTensao);
        timerTensao = setTimeout(() => { if (vivo) audio.definirAmbiente(ambienteId, volumeAmbiente); }, AUDIO.tensao_golo_ms);
        break;
      }
    }
    uSom = a;
    if (a === uRelato) return; uRelato = a;
    const linhas: string[] = [];
    for (let k = a - 1; k >= 0 && linhas.length < 12; k--) { const f = TXT[r[k].tipo], txt = f ? f(r[k]) : ''; if (txt) linhas.push(`<div><span class="pt" style="background:${cores[r[k].equipa][0]}"></span>${relogio(r[k].tick)} · ${txt}</div>`); }
    (el.querySelector('#jg-relato') as HTMLElement).innerHTML = linhas.join('');
  }
  function ciclo(tm: number) {
    if (!vivo) return;
    const dt = ult ? Math.min(0.1, (tm - ult) / 1000) : 0; ult = tm;
    if (apres.precisaSimular()) apres.simular(Infinity, 600);
    if (!pausa) apres.avancar(dt, vel);
    desenhar(); paineis();
    if (apres.modo === 'fim') { final(); return; }
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);
}
