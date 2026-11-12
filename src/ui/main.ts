// Ecrã simples "Mundo": gera o mundo de teste no Worker e mostra as ligas.
import type { Resposta, ResumoLiga } from '../worker/protocolo.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const worker = new Worker(new URL('../worker/sim.worker.ts', import.meta.url), { type: 'module' });
let ligas: ResumoLiga[] = [];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const LIGA_KEY = 'futceo.liga';

function guardarLiga(id: string) { try { localStorage.setItem(LIGA_KEY, id); } catch { /* sem armazenamento */ } }
function lerLiga(): string | null { try { return localStorage.getItem(LIGA_KEY); } catch { return null; } }

function mostrarLiga(id: string) {
  const l = ligas.find((x) => x.id === id);
  if (!l) return;
  guardarLiga(id);
  $('tabela').innerHTML = `<div class="cartao"><h2>${esc(l.pais)} — ${esc(l.nome)}</h2>
  <p>${l.equipas} clubes · ${l.jornadas} jornadas · ${l.primeira} a ${l.ultima} · reputação ${l.repMin}–${l.repMax}</p>
  <table><thead><tr><th>#</th><th>Clube</th><th>Sigla</th><th>Cidade</th><th class="n">Rep.</th><th class="n">Atq</th><th class="n">Def</th><th>Estádio</th><th class="n">Lotação</th></tr></thead><tbody>
  ${l.clubes.map((c, i) => `<tr><td class="n">${i + 1}</td><td><span class="escudo" style="background:linear-gradient(90deg,${c.cores[0]} 50%,${c.cores[1]} 50%)"></span>${esc(c.nome)}</td><td>${c.sigla}</td><td>${esc(c.cidade)}</td><td class="n">${c.rep}</td><td class="n">${c.atq}</td><td class="n">${c.def}</td><td>${esc(c.estadio)}</td><td class="n">${c.capacidade.toLocaleString('pt-PT')}</td></tr>`).join('')}
  </tbody></table></div>`;
}

worker.onmessage = (ev: MessageEvent<Resposta>) => {
  const r = ev.data;
  if (r.tipo === 'erro') { $('estado').textContent = 'Erro: ' + r.msg; return; }
  ligas = r.ligas;
  $('estado').textContent = `Semente ${r.semente}: ${r.clubes} clubes, ${ligas.length} ligas, ${r.jogos} jogos de liga, ${r.conflitos} conflitos de calendário · ${r.ms.toFixed(0)} ms`;
  const sel = $<HTMLSelectElement>('liga');
  sel.innerHTML = ligas.map((l) => `<option value="${l.id}">${esc(l.pais)} — ${esc(l.nome)}</option>`).join('');
  const pref = lerLiga();
  sel.value = pref && ligas.some((l) => l.id === pref) ? pref : ligas[0].id;
  mostrarLiga(sel.value);
};

$('liga').addEventListener('change', (e) => mostrarLiga((e.target as HTMLSelectElement).value));
$('gerar').addEventListener('click', () => {
  $('estado').textContent = 'A gerar…';
  worker.postMessage({ tipo: 'gerar', semente: Number($<HTMLInputElement>('semente').value) || 2026 });
});
$('gerar').click();

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js');
