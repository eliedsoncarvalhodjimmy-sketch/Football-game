// App (Prompt 5, Bloco A1): carregamento → entrada (contas predispostas) → carreiras gravadas → perfil → foto → clube → jogo.
// A interface só lê vistas do worker e envia comandos; nunca mexe no motor directamente.
import { pedir, type Progresso } from './motor.ts';
import { contas, entrar, lerPerfil, gravarPerfil, type PerfilJogo } from './contas.ts';
import { guardar, listar, apagar, ranhuraLivre, type Gravacao } from '../storage/saves.ts';
import { PERFIS_DONO, IDADE_MINIMA_PERFIL, FOTO_PERFIL } from '../config/perfis.ts';
import { INTERFACE, DICAS, VERSAO_MOTOR } from '../config/interface.ts';
import { svg, escudo } from './icones.ts';
import { abrirJogo2D } from './jogo2d.ts';
import type { PaisEscolha, RegistoJogo, Resumo, Comando, PedidoVista, Vista } from '../jogo/sessao.ts';
import type { Instrucoes } from '../config/tacticas.ts';
import { htmlInicio, htmlPlantel, htmlJogador, htmlTactica, tabelaLiga, type UiPlantel, type Rascunho } from './ecras.ts';
import { htmlMercado, htmlNegociacao, htmlAcademia, htmlScouting, rascunhoInicial, type UiMercado, type UiAcademia, type RascNeg } from './ecrasA3.ts';
import { eventoA3, mudancaA3, entradaA3, SELECTOR, ligarA3 } from './eventosA3.ts';
import { htmlStaff, htmlFinancas, htmlInfra, htmlCompeticoes, htmlEscritorio, type UiStaff, type UiComp } from './ecrasA4.ts';
import { eventoA4, mudancaA4, entradaA4, SELECTOR_A4, ligarA4 } from './eventosA4.ts';
import { AudioManager } from '../audio/AudioManager.ts';
import { htmlDefinicoes, ligarDefinicoes } from './ecraSom.ts';
import { htmlDefinicoesCutscene, ligarDefinicoesCutscene } from './ecraCutscene.ts';
import { abrirCutscene } from './cutscene.ts';
import { criarCenaEuropeia, carregarImagensCompeticao } from '../cutscene/cena.ts';
import { carregarEscudosReais } from '../cutscene/escudosReais.ts';
import { TL_CHAMPIONS } from '../cutscene/timelines/champions.ts';
import { TL_EUROPA } from '../cutscene/timelines/europa.ts';
import { lerFrequenciaCutscene, deveMostrarCutscene } from '../cutscene/persistencia.ts';
import type { DadosCutscene } from '../cutscene/tipos.ts';

/** Prompt 10: único gestor de áudio da aplicação. Definições em localStorage, nunca no save; ligado ao primeiro
 *  toque (desbloqueio em iOS/Android) e a pausar/retomar em segundo plano. */
export const audio = new AudioManager();
audio.ligarAutomatismos();

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fE = (v: number) => `€${Math.round(v).toLocaleString('pt-PT')}`;
const fM = (v: number) => (Math.abs(v) >= 1e6 ? `€${(v / 1e6).toFixed(1).replace('.', ',')} M` : fE(v));
const NACIONALIDADES = ['Portugal', 'Brasil', 'Angola', 'Cabo Verde', 'Moçambique', 'Guiné-Bissau', 'São Tomé e Príncipe', 'Timor-Leste', 'Espanha', 'França', 'Itália', 'Inglaterra', 'Alemanha', 'Países Baixos', 'Bélgica', 'Suíça', 'Estados Unidos', 'Argentina', 'Uruguai', 'Outra'];
const SEMENTE_OMISSAO = 2026;

// ---------------------------------------------------------------- estado

interface Estado {
  conta: string | null;
  rascunho: Partial<PerfilJogo> & { clube?: string };
  paises: PaisEscolha[];
  pais: string;
  liga: string;
  resumo: Resumo | null;
  registo: RegistoJogo | null;
  ranhura: number | null;
  ecra: string;
  aGravar: boolean;
  aAvancar: boolean;
}
const E: Estado = { conta: null, rascunho: {}, paises: [], pais: '', liga: '', resumo: null, registo: null, ranhura: null, ecra: 'inicio', aGravar: false, aAvancar: false };
const raiz = () => document.getElementById('app')!;
/** Último jogo do utilizador já mostrado no ecrã do jogo (chave). */
let jogoVisto = '';

// ---------------------------------------------------------------- carregamento

function carregamento(): { progresso: Progresso; fechar: () => void } {
  const el = document.createElement('div');
  el.id = 'intro'; el.setAttribute('role', 'status'); el.setAttribute('aria-label', 'A carregar o FutCEO');
  el.innerHTML = `<img src="./img/intro.jpg" alt=""><div class="in-topo"><div class="in-logo">FutCEO</div><div class="in-sub">Gestão de futebol</div></div>
    <div class="in-baixo"><div class="in-etapa">A iniciar…</div><div class="in-barra"><i></i></div><div class="in-dica">${DICAS[Math.floor(Math.random() * DICAS.length)]}</div><div class="in-saltar" hidden>Toca para continuar</div></div>`;
  document.body.appendChild(el);
  let pronto = false;
  const fechar = () => { el.classList.add('fora'); setTimeout(() => el.remove(), 500); };
  el.addEventListener('click', () => { if (pronto) fechar(); });
  return {
    progresso: (_e, f, t) => { (el.querySelector('.in-etapa') as HTMLElement).textContent = t; (el.querySelector('.in-barra i') as HTMLElement).style.width = `${Math.round(f * 100)}%`; },
    fechar: () => { pronto = true; fechar(); },
  };
}

// ---------------------------------------------------------------- entrada

function avatarHtml(nome: string, foto: string | null | undefined, t: number) {
  return foto ? `<img class="avatar" src="${foto}" alt="" style="width:${t}px;height:${t}px">`
    : `<span class="avatar avatar-ini" style="width:${t}px;height:${t}px;font-size:${Math.round(t * 0.4)}px">${esc(nome.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase())}</span>`;
}

function painel(passo: number, corpo: string, largo = false) {
  const passos = ['Conta', 'Perfil', 'Foto', 'Clube'];
  raiz().innerHTML = `<div id="entrada"><img class="en-fundo" src="./img/perfil.jpg" alt=""><div class="en-painel ${largo ? 'en-largo' : ''}"><div class="en-marca">FutCEO</div>
    ${passo >= 0 ? `<div class="en-passos">${passos.map((x, i) => `<span class="${i === passo ? 'on' : i < passo ? 'feito' : ''}">${i + 1}. ${x}</span>`).join('')}</div>` : ''}${corpo}</div></div>`;
  return raiz();
}

/** Ecrã de entrada: as 3 contas aparecem predispostas; escolhe-se uma e escreve-se só a palavra-passe. */
function ecraEntrada(contaSel: string | null = null, erro = '') {
  const cs = contas();
  const el = painel(0, `<h2>Quem vai jogar?</h2>
    <div class="contas">${cs.map((c) => { const p = lerPerfil(c.id); return `<button class="conta ${c.id === contaSel ? 'on' : ''}" data-conta="${c.id}">${avatarHtml(p?.nome ?? c.nome, p?.foto, 56)}<b>${esc(c.nome)}</b><small>${p ? esc(p.nome) : 'Sem perfil ainda'}</small></button>`; }).join('')}</div>
    ${contaSel ? `<form id="en-form" autocomplete="off"><label>Palavra-passe de ${esc(cs.find((c) => c.id === contaSel)!.nome)}<input id="en-pass" type="password" required autocomplete="current-password"></label>${erro ? `<div class="en-erro" role="alert">${erro}</div>` : ''}<button class="btn prim en-btn" type="submit">Entrar</button></form>` : '<div class="rot">Escolhe a tua conta. Cada uma tem o seu perfil e as suas carreiras gravadas.</div>'}`);
  el.querySelectorAll<HTMLElement>('[data-conta]').forEach((b) => b.addEventListener('click', () => ecraEntrada(b.dataset.conta!)));
  const pass = el.querySelector<HTMLInputElement>('#en-pass');
  pass?.focus();
  el.querySelector('#en-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(await entrar(contaSel!, pass!.value))) { ecraEntrada(contaSel, 'Palavra-passe errada.'); return; }
    E.conta = contaSel;
    await ecraCarreiras();
  });
}

/** Carreiras gravadas da conta (continuar, apagar) e nova carreira. */
async function ecraCarreiras() {
  const gs = await listar(E.conta!);
  if (!gs.length) { novaCarreira(); return; }
  const p = lerPerfil(E.conta!);
  const quando = (t: number) => new Date(t).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const el = painel(-1, `<h2>Bem-vindo de volta${p ? `, ${esc(p.nome.split(' ')[0])}` : ''}</h2>
    <div class="ranhuras">${gs.map((g) => `<div class="ranhura">${escudo(g.cores, 30)}<div><b>${esc(g.clube)}</b><small>${esc(g.liga)} · ${g.epoca} · ${g.data}</small><small>Ranhura ${g.ranhura} · gravado ${quando(g.gravadoEm)}${g.automatica ? ' (automática)' : ''}${g.registo.versaoMotor !== VERSAO_MOTOR ? ' · gravado noutra versão do motor' : ''}</small></div>
      <div class="acoes"><button class="btn prim" data-cont="${g.ranhura}">Continuar</button><button class="btn" data-apag="${g.ranhura}" aria-label="Apagar a carreira da ranhura ${g.ranhura}">Apagar</button></div></div>`).join('')}</div>
    <button class="btn prim en-btn" id="en-nova" ${gs.length >= INTERFACE.ranhuras ? 'disabled' : ''}>Nova carreira${gs.length >= INTERFACE.ranhuras ? ' (apaga uma para libertar uma ranhura)' : ''}</button>
    <button class="btn en-btn" id="en-sair">Mudar de conta</button>`);
  el.querySelectorAll<HTMLElement>('[data-cont]').forEach((b) => b.addEventListener('click', () => continuar(gs.find((g) => g.ranhura === Number(b.dataset.cont))!)));
  el.querySelectorAll<HTMLElement>('[data-apag]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Apagar esta carreira? Não dá para desfazer.')) return;
    await apagar(E.conta!, Number(b.dataset.apag)); await ecraCarreiras();
  }));
  el.querySelector('#en-nova')!.addEventListener('click', novaCarreira);
  el.querySelector('#en-sair')!.addEventListener('click', () => { E.conta = null; ecraEntrada(); });
}

function novaCarreira() {
  const p = lerPerfil(E.conta!);
  E.rascunho = p ? { ...p } : {};
  ecraPerfil();
}

/** "dd/mm/aaaa" → "aaaa-mm-dd", ou null se a data não existir. */
function ptParaIso(t: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t.trim());
  if (!m) return null;
  const [, dd, mm, aa] = m, d = new Date(Date.UTC(+aa, +mm - 1, +dd));
  return d.getUTCFullYear() === +aa && d.getUTCMonth() === +mm - 1 && d.getUTCDate() === +dd && +aa >= 1900 ? `${aa}-${mm}-${dd}` : null;
}

function ecraPerfil(erro = '') {
  const d = E.rascunho;
  const isoParaPt = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso ?? '');
  const el = painel(1, `<h2>Perfil de jogo</h2><form id="en-form"><label>Nome<input id="en-nome" required maxlength="40" value="${esc(d.nome ?? '')}"></label>
    <div class="en-duas"><label>Data de nascimento<input id="en-nasc" type="text" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10" required autocomplete="bday" value="${isoParaPt(d.nascimento)}"></label><label>Nacionalidade<select id="en-nac" required><option value="">Escolher…</option>${NACIONALIDADES.map((n) => `<option ${d.nacionalidade === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="en-rot">Perfil de partida (modo Dono)</div>
    <div class="en-cartoes">${PERFIS_DONO.map((x, i) => `<label class="en-cartao ${d.perfilDono === x.id ? 'on' : ''}"><input type="radio" name="en-perf" value="${x.id}" ${d.perfilDono === x.id ? 'checked' : ''}><span class="en-num">${i + 1}</span><span><span>${esc(x.texto)}</span><span class="en-ef">${esc(x.resumo)}</span></span></label>`).join('')}</div>
    ${erro ? `<div class="en-erro" role="alert">${erro}</div>` : ''}<div class="en-nav"><button type="button" class="btn" id="en-voltar">‹ Voltar</button><button class="btn prim" type="submit">Seguinte ›</button></div></form>`);
  const ler = () => {
    d.nome = (el.querySelector('#en-nome') as HTMLInputElement).value.trim();
    d.nascimento = ptParaIso((el.querySelector('#en-nasc') as HTMLInputElement).value) ?? (el.querySelector('#en-nasc') as HTMLInputElement).value;
    d.nacionalidade = (el.querySelector('#en-nac') as HTMLSelectElement).value;
    d.perfilDono = (el.querySelector('input[name="en-perf"]:checked') as HTMLInputElement | null)?.value ?? d.perfilDono;
  };
  const nasc = el.querySelector('#en-nasc') as HTMLInputElement;
  nasc.addEventListener('input', () => {
    const n = nasc.value.replace(/\D/g, '').slice(0, 8);
    nasc.value = n.length > 4 ? `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}` : n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
  });
  el.querySelectorAll('input[name="en-perf"]').forEach((r) => r.addEventListener('change', () => { ler(); ecraPerfil(); }));
  el.querySelector('#en-voltar')!.addEventListener('click', ecraCarreiras);
  el.querySelector('#en-form')!.addEventListener('submit', (e) => {
    e.preventDefault(); ler();
    if (!ptParaIso(isoParaPt(d.nascimento))) { ecraPerfil('Data de nascimento inválida (dd/mm/aaaa).'); return; }
    const idade = d.nascimento ? (Date.now() - Date.parse(d.nascimento)) / 3.15576e10 : 0;
    const er = !d.nome ? 'Falta o nome.' : idade < IDADE_MINIMA_PERFIL ? `É preciso ter pelo menos ${IDADE_MINIMA_PERFIL} anos.` : !d.nacionalidade ? 'Falta a nacionalidade.' : !d.perfilDono ? 'Escolhe um perfil de partida.' : '';
    if (er) ecraPerfil(er); else ecraFoto();
  });
}

function ecraFoto() {
  const d = E.rascunho;
  const el = painel(2, `<h2>Foto de perfil <span class="rot">(opcional)</span></h2><div class="en-foto">${avatarHtml(d.nome ?? '', d.foto, 120)}<div style="display:grid;gap:8px"><label class="btn" style="text-align:center;cursor:pointer">Escolher foto<input id="en-ficheiro" type="file" accept="image/*" hidden></label>${d.foto ? '<button class="btn" id="en-tirar">Tirar foto</button>' : ''}<div class="rot">A foto fica só neste aparelho.</div></div></div>
    <div class="en-nav"><button class="btn" id="en-voltar">‹ Voltar</button><button class="btn prim" id="en-seg">${d.foto ? 'Seguinte ›' : 'Saltar ›'}</button></div>`);
  el.querySelector('#en-ficheiro')!.addEventListener('change', (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = FOTO_PERFIL.lado;
      const g = c.getContext('2d')!, m = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, FOTO_PERFIL.lado, FOTO_PERFIL.lado);
      d.foto = c.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(img.src); ecraFoto();
    };
    img.src = URL.createObjectURL(f);
  });
  el.querySelector('#en-tirar')?.addEventListener('click', () => { d.foto = null; ecraFoto(); });
  el.querySelector('#en-voltar')!.addEventListener('click', () => ecraPerfil());
  el.querySelector('#en-seg')!.addEventListener('click', gerarMundo);
}

async function gerarMundo() {
  const c = carregamento();
  try {
    const r = await pedir<'paises'>({ tipo: 'novoMundo', semente: SEMENTE_OMISSAO }, c.progresso);
    E.paises = r.paises;
    E.pais = E.pais || (r.paises.find((p) => p.id === 'por') ?? r.paises[0]).id;
    E.liga = '';
    ecraClube();
  } catch (e) { alert(`Não foi possível gerar o mundo: ${(e as Error).message}`); ecraFoto(); }
  c.fechar();
}

function ecraClube() {
  const d = E.rascunho;
  const pais = E.paises.find((p) => p.id === E.pais) ?? E.paises[0];
  const liga = pais.ligas.find((l) => l.id === E.liga) ?? pais.ligas[0];
  E.liga = liga.id;
  const el = painel(3, `<h2>Onde começar</h2><div class="rot">Escolhe o clube a comprar: qualquer clube está disponível (o património do perfil não limita a compra).</div>
    <div class="esc-filtros"><label>País<select id="en-pais">${E.paises.map((p) => `<option value="${p.id}" ${p.id === pais.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label>
      <label>Liga<select id="en-liga">${pais.ligas.map((l) => `<option value="${l.id}" ${l.id === liga.id ? 'selected' : ''}>${esc(l.nome)}</option>`).join('')}</select></label></div>
    <div class="en-clubes">${liga.clubes.map((c) => `<button class="en-clube ${d.clube === c.id ? 'on' : ''}" data-clube="${c.id}">${escudo(c.cores, 26)}<span class="clube-info"><b>${esc(c.nome)}</b><small>${esc(c.cidade)} · reputação ${c.reputacao}${c.caixa !== null ? ` · caixa ${fM(c.caixa)}` : ''}</small><small>${esc(c.estadio)} · ${c.capacidade.toLocaleString('pt-PT')} lugares</small></span></button>`).join('')}</div>
    <div class="en-nav"><button class="btn" id="en-voltar">‹ Voltar</button><button class="btn prim" id="en-fim" ${d.clube ? '' : 'disabled'}>Começar a carreira</button></div>`, true);
  el.querySelector('#en-pais')!.addEventListener('change', (e) => { E.pais = (e.target as HTMLSelectElement).value; E.liga = ''; ecraClube(); });
  el.querySelector('#en-liga')!.addEventListener('change', (e) => { E.liga = (e.target as HTMLSelectElement).value; ecraClube(); });
  el.querySelectorAll<HTMLElement>('[data-clube]').forEach((b) => b.addEventListener('click', () => { d.clube = b.dataset.clube; ecraClube(); }));
  el.querySelector('#en-voltar')!.addEventListener('click', ecraFoto);
  el.querySelector('#en-fim')!.addEventListener('click', comecarCarreira);
}

async function comecarCarreira() {
  const d = E.rascunho;
  const perfil: PerfilJogo = { nome: d.nome!, nascimento: d.nascimento!, nacionalidade: d.nacionalidade!, perfilDono: d.perfilDono!, foto: d.foto ?? null };
  gravarPerfil(E.conta!, perfil);
  const r = await pedir<'estado'>({ tipo: 'comecar', clube: d.clube!, perfil: { nome: perfil.nome, perfilDono: perfil.perfilDono } });
  E.ranhura = await ranhuraLivre(E.conta!, INTERFACE.ranhuras);
  if (E.ranhura === null) { alert('Não há ranhuras livres: apaga uma carreira.'); await ecraCarreiras(); return; }
  E.resumo = r.resumo; E.registo = r.registo; E.ecra = 'inicio';
  await gravar(false);
  ecraJogo();
}

async function continuar(g: Gravacao) {
  const c = carregamento();
  try {
    const r = await pedir<'estado'>({ tipo: 'carregar', registo: g.registo }, c.progresso);
    E.resumo = r.resumo; E.registo = r.registo; E.ranhura = g.ranhura; E.ecra = 'inicio';
    ecraJogo();
  } catch (e) { alert(`Não foi possível carregar: ${(e as Error).message}`); }
  c.fechar();
}

async function gravar(automatica: boolean) {
  if (!E.conta || !E.resumo || !E.registo || E.ranhura === null) return;
  E.aGravar = true;
  const r = E.resumo;
  await guardar({ conta: E.conta, ranhura: E.ranhura, clube: r.clube.nome, cores: r.clube.cores, liga: r.clube.ligaNome, data: r.data, epoca: r.epoca, semanas: E.registo.semanas, gravadoEm: Date.now(), automatica, registo: E.registo });
  E.aGravar = false;
}

// ---------------------------------------------------------------- jogo

const ECRAS: [string, string, string][] = [
  ['inicio', 'Início', ''], ['plantel', 'Plantel', 'A2'], ['escritorio', 'Escritório', 'A4'], ['staff', 'Staff', 'A4'], ['academia', 'Academia e Recrutamento', 'A3'],
  ['mercado', 'Mercado', 'A3'], ['financas', 'Finanças e Conselho', 'A4'], ['infra', 'Infraestrutura', 'A4'], ['classificacao', 'Competições', 'A4'],
];
const INFERIOR = ['inicio', 'plantel', 'mercado', 'classificacao'];

// Estado dos ecrãs da A2.
const UI: { plantel: UiPlantel; jogador: string | null; voltar: string; vista: Vista | null; rascunho: Rascunho | null; formacaoVer: string | null;
  mercado: UiMercado; academia: UiAcademia; neg: number | null; rascNeg: RascNeg | null; rascNegId: number | null; extra: Vista | null;
  staff: UiStaff; comp: UiComp; orcRasc: number | null } = {
  plantel: { tab: 'principal', filtro: 'Todos', pesquisa: '' }, jogador: null, voltar: 'plantel', vista: null, rascunho: null, formacaoVer: null,
  mercado: { tab: 'geral', pesquisa: '', pos: '', idade: '', liga: '', conh: '' },
  academia: { ala: 'academia', tab: 'Percurso', escJ: 0, tabJ: 'Classificação', pais: 'BRA', posicao: 'Avançados', semanas: 4, missao: null, zoom: 'Mundo', excedente: null, ligasScout: null },
  neg: null, rascNeg: null, rascNegId: null, extra: null,
  staff: { cargo: '', trocarTreinador: false, motivo: 'mutuo_acordo' }, comp: { comp: '', tab: 'Classificação', premio: 'melhor_do_mundo' }, orcRasc: null,
};
ligarA4({ UI, comando: (c) => comando(c), carregarVista: () => carregarVista(), desenharVista: (a) => desenharVista(a) });
ligarA3({
  UI, ecra: () => E.ecra, definirEcra: (e) => { E.ecra = e; }, comando: (c) => comando(c), carregarVista: () => carregarVista(),
  desenharVista: (a) => desenharVista(a), irPara: (e) => irPara(e), ecraJogo: () => ecraJogo(),
});

function ecraJogo() {
  const r = E.resumo!;
  document.documentElement.style.setProperty('--acento', r.clube.cores[0]);
  document.documentElement.style.setProperty('--acento-2', r.clube.cores[1]);
  const activo = E.ecra === 'jogador' ? (UI.voltar === 'jogador' ? 'plantel' : UI.voltar) : E.ecra === 'negociacao' ? (['escritorio', 'mercado'].includes(UI.voltar) ? UI.voltar : 'mercado') : E.ecra;
  const nav = (k: string, t: string) => `<a class="nav ${k === activo ? 'activo' : ''}" href="#" data-ecra="${k}">${svg(k)}${t}</a>`;
  raiz().innerHTML = `<div class="app">
    <nav class="lateral" aria-label="Navegação principal"><div class="marca">${escudo(r.clube.cores)}<div><b>FutCEO</b><small>${esc(r.clube.nome)}</small></div></div>
      ${ECRAS.map(([k, t]) => nav(k, t)).join('')}<div style="flex:1"></div>${nav('definicoes', 'Som')}<a class="nav" href="#" id="b-menu">${svg('seta')}Menu principal</a></nav>
    <main class="principal" id="principal">${barraTopo(r)}<div id="conteudo">${conteudoSincrono(r) ?? '<div class="rot" style="padding:24px">A carregar…</div>'}</div></main>
    <nav class="inferior" aria-label="Navegação">${INFERIOR.map((k) => `<a class="${k === activo ? 'activo' : ''}" href="#" data-ecra="${k}">${svg(k)}${ECRAS.find((x) => x[0] === k)![1].split(' ')[0]}</a>`).join('')}<a href="#" id="b-menu2">${svg('mais')}Menu</a></nav></div>`;
  const el = raiz();
  el.querySelectorAll<HTMLElement>('[data-ecra]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); irPara(a.dataset.ecra!); }));
  for (const id of ['#b-menu', '#b-menu2']) el.querySelector(id)?.addEventListener('click', async (e) => { e.preventDefault(); await gravar(true); await ecraCarreiras(); });
  el.querySelector('#b-continuar')!.addEventListener('click', avancar);
  el.querySelector('#b-guardar')!.addEventListener('click', async () => { await gravar(false); const b = el.querySelector('#gravado') as HTMLElement; b.textContent = 'Gravado'; setTimeout(() => (b.textContent = ''), 1800); });
  ligarConteudo(el.querySelector('#conteudo')!);
  if (E.ecra === 'definicoes') { ligarDefinicoes(el.querySelector('#conteudo')!, audio, ecraJogo); ligarDefinicoesCutscene(el.querySelector('#conteudo')!, ecraJogo); }
  if (conteudoSincrono(r) === null) void carregarVista();
}

function irPara(ecra: string) {
  if (ecra !== 'jogador') UI.voltar = ecra;
  E.ecra = ecra;
  if (ecra === 'plantel' && UI.plantel.tab === 'tactica') UI.plantel.tab = 'principal';
  ecraJogo();
  document.getElementById('principal')?.scrollTo(0, 0);
}

function barraTopo(r: Resumo) {
  return `<div class="barra-topo"><div class="data"><b>${r.data}</b><span>Época ${r.epoca}</span></div>
    <button class="icone-btn" id="b-guardar" aria-label="Guardar o progresso" title="Guardar o progresso">${svg('guardar')}</button><span class="aviso-gravar" id="gravado" aria-live="polite"></span>
    <button class="btn prim continuar" id="b-continuar" ${E.aAvancar ? 'disabled' : ''}>${E.aAvancar ? 'A simular…' : 'Continuar'} ${svg('seta')}</button></div>`;
}

/** Prompt 11, Bloco 5: abre a cutscene europeia (imagens e escudo real já carregados); `aoFechar` corre sempre, ao
 *  fim da cutscene ou ao saltar. Nunca bloqueia o dia: qualquer erro (imagens, rede) salta logo para `aoFechar`. */
async function abrirCutsceneEuropeia(dados: DadosCutscene, escudoCasaId: string, escudoForaId: string, aoFechar: () => void) {
  try {
    const base = import.meta.env.BASE_URL;
    const [imagens, escudos] = await Promise.all([carregarImagensCompeticao(dados.competicao, base), carregarEscudosReais(escudoCasaId, escudoForaId, base)]);
    const tl = dados.competicao === 'champions' ? TL_CHAMPIONS : TL_EUROPA;
    abrirCutscene({ idComp: dados.competicao, tl, dados, desenhar: criarCenaEuropeia(imagens, escudos), audio }, aoFechar);
  } catch (e) {
    console.warn('Cutscene europeia não pôde correr:', e);
    aoFechar();
  }
}

async function avancar() {
  if (E.aAvancar) return;
  E.aAvancar = true; ecraJogo();
  try {
    const r = await pedir<'estado'>({ tipo: 'avancar', semanas: 1 });
    E.resumo = r.resumo; E.registo = r.registo;
    // Fase 6 do motor 2D: houve um jogo do utilizador esta semana → abre o ecrã do jogo (por lances).
    // Prompt 11, Bloco 5: se for um jogo europeu (Champions/Liga Europa) e a frequência escolhida mandar mostrar,
    // a cutscene entra primeiro; o ecrã do jogo só abre quando ela fechar (ou nunca, se não houver cutscene).
    const j2d = r.resumo.jogo2d;
    if (j2d && j2d.chave !== jogoVisto) {
      jogoVisto = j2d.chave;
      const v = await pedir<'vista'>({ tipo: 'vista', pedido: { ecra: 'jogo' } });
      if (v.vista.ecra === 'jogo' && v.vista.dados) {
        E.aAvancar = false;
        const dados = v.vista.dados;
        const abrirEcraDoJogo = () => abrirJogo2D(dados, () => ecraJogo());
        if (j2d.cutscene && dados.dadosCutscene && deveMostrarCutscene(lerFrequenciaCutscene(), j2d.cutscene.primeiraFase)) {
          await abrirCutsceneEuropeia(dados.dadosCutscene, dados.escudoCasaId, dados.escudoForaId, abrirEcraDoJogo);
        } else {
          abrirEcraDoJogo();
        }
      }
    }
    UI.rascunho = null; UI.formacaoVer = null;
    if (E.registo.semanas % INTERFACE.gravacao_automatica_semanas === 0) await gravar(true);
  } catch (e) { alert(`Erro na simulação: ${(e as Error).message}`); }
  E.aAvancar = false; ecraJogo();
}

/** Ecrãs que só precisam do resumo (os outros pedem uma vista ao worker). */
function conteudoSincrono(r: Resumo): string | null {
  if (E.ecra === 'inicio') return htmlInicio(r);
  if (E.ecra === 'definicoes') return `<div class="topo"><h1>Definições</h1></div>${htmlDefinicoes(audio)}${htmlDefinicoesCutscene()}`;
  if (['plantel', 'jogador', 'mercado', 'negociacao', 'academia', 'staff', 'financas', 'infra', 'classificacao', 'escritorio'].includes(E.ecra)) return null;
  const [, t, parte] = ECRAS.find((x) => x[0] === E.ecra)!;
  return `<div class="topo"><h1>${t}</h1></div><section class="c em-breve"><h2>Em construção</h2><div>Este ecrã chega na parte ${parte} do Bloco A. O desenho é o do protótipo.</div></section>`;
}

async function carregarVista() {
  const ecra = E.ecra;
  const pedido: PedidoVista = ecra === 'staff' ? { ecra: 'staff' } : ecra === 'financas' ? { ecra: 'financas' } : ecra === 'infra' ? { ecra: 'infra' } : ecra === 'escritorio' ? { ecra: 'escritorio' }
    : ecra === 'classificacao' ? { ecra: 'competicoes', ...(UI.comp.comp ? { comp: UI.comp.comp } : {}) } : ecra === 'jogador' ? { ecra: 'jogador', jogador: UI.jogador! } : ecra === 'mercado' ? { ecra: 'mercado' } : ecra === 'negociacao' ? { ecra: 'negociacao', id: UI.neg! }
    : ecra === 'academia' ? (UI.academia.ala === 'scouting' ? { ecra: 'scouting' } : { ecra: 'academia' })
    : UI.plantel.tab === 'tactica' ? { ecra: 'tactica', ...(UI.formacaoVer ? { formacao: UI.formacaoVer } : {}) } : { ecra: 'plantel' };
  const extra: PedidoVista | null = pedido.ecra === 'tactica' ? { ecra: 'plantel' } : pedido.ecra === 'scouting' ? { ecra: 'mercado' } : null;
  try {
    const [v, n] = await Promise.all([pedir<'vista'>({ tipo: 'vista', pedido }), extra ? pedir<'vista'>({ tipo: 'vista', pedido: extra }) : Promise.resolve(null)]);
    if (E.ecra !== ecra) return;
    UI.vista = v.vista;
    UI.extra = n?.vista ?? null;
    const alvo = document.getElementById('conteudo');
    if (alvo) desenharVista(alvo);
  } catch (e) {
    const alvo = document.getElementById('conteudo');
    if (alvo) alvo.innerHTML = `<section class="c"><div class="en-erro">Não foi possível abrir: ${esc((e as Error).message)}</div></section>`;
  }
}

/** Desenha a vista em memória (sem pedir de novo ao worker: filtros, separadores, rascunhos). */
function desenharVista(alvo: HTMLElement) {
  const v = UI.vista, x = UI.extra;
  if (!v) return;
  if (v.ecra === 'staff') alvo.innerHTML = htmlStaff(v.dados, UI.staff);
  else if (v.ecra === 'financas') alvo.innerHTML = htmlFinancas(v.dados, UI.orcRasc);
  else if (v.ecra === 'infra') alvo.innerHTML = htmlInfra(v.dados);
  else if (v.ecra === 'competicoes') alvo.innerHTML = htmlCompeticoes(v.dados, UI.comp);
  else if (v.ecra === 'escritorio') alvo.innerHTML = htmlEscritorio(v.dados);
  else if (v.ecra === 'mercado') alvo.innerHTML = htmlMercado(v.dados, UI.mercado);
  else if (v.ecra === 'negociacao') {
    if (!UI.rascNeg || UI.rascNegId !== v.dados.neg.id) { UI.rascNeg = rascunhoInicial(v.dados); UI.rascNegId = v.dados.neg.id; }
    alvo.innerHTML = htmlNegociacao(v.dados, UI.rascNeg);
  } else if (v.ecra === 'academia') alvo.innerHTML = htmlAcademia(v.dados, UI.academia);
  else if (v.ecra === 'scouting') alvo.innerHTML = htmlScouting(v.dados, UI.academia, x?.ecra === 'mercado' ? x.dados.shortlist : []);
  else if (v.ecra === 'plantel') alvo.innerHTML = htmlPlantel(v.dados, UI.plantel);
  else if (v.ecra === 'jogador') alvo.innerHTML = htmlJogador(v.dados);
  else if (v.ecra === 'tactica') {
    const t = v.dados;
    if (!UI.rascunho) UI.rascunho = { estilo: null, formacao: t.formacao, instrucoes: { ...t.instrucoes }, onze: null, trocas: {} };
    const pl = x?.ecra === 'plantel' ? x.dados : null;
    alvo.innerHTML = htmlTactica(t, UI.rascunho, { principal: pl?.principal.length ?? 0, sub21: pl?.sub21.length ?? 0, sub18: pl?.sub18.length ?? 0 });
  }
}

/** Eventos do conteúdo (delegação): navegação, filtros do plantel, promoções e a táctica. */
function ligarConteudo(alvo: HTMLElement) {
  alvo.addEventListener('click', async (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>(`${SELECTOR},${SELECTOR_A4}`);
    if (!el) return;
    const d = el.dataset;
    if (await eventoA3(el, alvo)) return;
    if (await eventoA4(el, alvo)) return;
    if (d.promover) { ev.stopPropagation(); return promover(d.promover, d.nome ?? '', d.para ?? ''); }
    if (d.titular) {
      const [k, id] = d.titular.split(':');
      UI.rascunho!.trocas[Number(k)] = id;
      return void carregarVista();
    }
    if (d.jogador) { UI.jogador = d.jogador; if (E.ecra !== 'jogador') UI.voltar = E.ecra; E.ecra = 'jogador'; ecraJogo(); document.getElementById('principal')?.scrollTo(0, 0); return; }
    if (d.ir) { if (d.ir === 'tactica') { UI.plantel.tab = 'tactica'; E.ecra = 'plantel'; UI.voltar = 'plantel'; ecraJogo(); } else irPara(d.ir); return; }
    if (d.voltar) { E.ecra = UI.voltar; ecraJogo(); return; }
    if (d.tabp) { UI.plantel.tab = d.tabp as UiPlantel['tab']; return void carregarVista(); }
    if (d.filtro) { UI.plantel.filtro = d.filtro; return void carregarVista(); }
    const v = UI.vista?.ecra === 'tactica' ? UI.vista.dados : null;
    const r = UI.rascunho;
    if (!v || !r) return;
    if (d.estilo) {
      const e = v.estilos.find((x) => x.id === d.estilo)!;
      UI.rascunho = { estilo: e.id, formacao: e.esquemas[0], instrucoes: { ...e.instrucoes, passe: e.instrucoes.passe ?? 0 }, onze: null, trocas: {} };
      UI.formacaoVer = e.esquemas[0];
      return void carregarVista();
    }
    if (d.form) { r.formacao = d.form; r.trocas = {}; UI.formacaoVer = d.form; return void carregarVista(); }
    if (d.instr) { const [k, val] = d.instr.split(':'); (r.instrucoes as unknown as Record<string, number>)[k] = Number(val); return void carregarVista(); }
    if (d.repor) { UI.rascunho = null; UI.formacaoVer = null; return void carregarVista(); }
    if (d.cancelar) { await comando({ tipo: 'cancelarSugestao' }); UI.rascunho = null; UI.formacaoVer = null; return void carregarVista(); }
    if (d.enviar) {
      const instr: Partial<Instrucoes> = {};
      for (const k of Object.keys(r.instrucoes) as (keyof Instrucoes)[]) if ((r.instrucoes[k] ?? 0) !== (v.instrucoesTreinador[k] ?? 0)) instr[k] = r.instrucoes[k];
      const trocou = Object.keys(r.trocas).length > 0;
      const onze = trocou ? v.caixas.map((cx, k) => r.trocas[k] ?? cx.jogadores[0]?.id).filter((x): x is string => !!x) : undefined;
      const cmd: Comando = { tipo: 'sugerir', ...(r.formacao !== v.formacaoTreinador ? { formacao: r.formacao } : {}), ...(Object.keys(instr).length ? { instrucoes: instr } : {}), ...(onze && onze.length === 11 ? { onze } : {}) };
      if (!cmd.formacao && !cmd.instrucoes && !cmd.onze) { alert('A sugestão é igual ao plano do treinador.'); return; }
      if (await comando(cmd)) { UI.rascunho = null; UI.formacaoVer = null; void carregarVista(); }
    }
  });
  alvo.addEventListener('change', (ev) => { if (!mudancaA4(ev.target as HTMLElement, alvo)) mudancaA3(ev.target as HTMLElement, alvo); });
  alvo.addEventListener('input', (ev) => {
    const t = ev.target as HTMLInputElement;
    if (entradaA4(t, alvo) || entradaA3(t, alvo)) return;
    if (t.id !== 'f-pesq') return;
    UI.plantel.pesquisa = t.value;
    if (UI.vista?.ecra === 'plantel') {
      alvo.innerHTML = htmlPlantel(UI.vista.dados, UI.plantel);
      const f = alvo.querySelector<HTMLInputElement>('#f-pesq')!;
      f.focus(); f.setSelectionRange(f.value.length, f.value.length);
    }
  });
}

/** Envia um comando ao motor (fica no registo da gravação). */
async function comando(cmd: Comando): Promise<boolean> {
  try {
    const r = await pedir<'estado'>({ tipo: 'comando', comando: cmd });
    E.resumo = r.resumo; E.registo = r.registo;
    await gravar(true);
    return true;
  } catch (e) { alert((e as Error).message); return false; }
}

async function promover(id: string, nome: string, para: string) {
  if (!confirm(`Promover ${nome} para ${para}?`)) return;
  if (await comando({ tipo: 'promover', jogador: id })) void carregarVista();
}

// ---------------------------------------------------------------- arranque

export async function arrancar() {
  const c = carregamento();
  try { await pedir<'ok'>({ tipo: 'preparar' }, c.progresso); } catch { /* o erro volta a aparecer ao gerar o mundo */ }
  c.fechar();
  ecraEntrada();
}
