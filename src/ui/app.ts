// App (Prompt 5, Bloco A1): carregamento → entrada (contas predispostas) → carreiras gravadas → perfil → foto → clube → jogo.
// A interface só lê vistas do worker e envia comandos; nunca mexe no motor directamente.
import { pedir, type Progresso } from './motor.ts';
import { contas, entrar, lerPerfil, gravarPerfil, type PerfilJogo } from './contas.ts';
import { guardar, listar, apagar, ranhuraLivre, type Gravacao } from '../storage/saves.ts';
import { PERFIS_DONO, IDADE_MINIMA_PERFIL, FOTO_PERFIL } from '../config/perfis.ts';
import { INTERFACE, DICAS, VERSAO_MOTOR } from '../config/interface.ts';
import { svg, escudo } from './icones.ts';
import type { PaisEscolha, RegistoJogo, Resumo } from '../jogo/sessao.ts';

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

function ecraPerfil(erro = '') {
  const d = E.rascunho;
  const max = `${new Date().getUTCFullYear() - IDADE_MINIMA_PERFIL}-12-31`;
  const el = painel(1, `<h2>Perfil de jogo</h2><form id="en-form"><label>Nome<input id="en-nome" required maxlength="40" value="${esc(d.nome ?? '')}"></label>
    <div class="en-duas"><label>Data de nascimento<input id="en-nasc" type="date" required value="${d.nascimento ?? ''}" max="${max}"></label><label>Nacionalidade<select id="en-nac" required><option value="">Escolher…</option>${NACIONALIDADES.map((n) => `<option ${d.nacionalidade === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="en-rot">Perfil de partida (modo Dono)</div>
    <div class="en-cartoes">${PERFIS_DONO.map((x, i) => `<label class="en-cartao ${d.perfilDono === x.id ? 'on' : ''}"><input type="radio" name="en-perf" value="${x.id}" ${d.perfilDono === x.id ? 'checked' : ''}><span class="en-num">${i + 1}</span><span><span>${esc(x.texto)}</span><span class="en-ef">${esc(x.resumo)}</span></span></label>`).join('')}</div>
    ${erro ? `<div class="en-erro" role="alert">${erro}</div>` : ''}<div class="en-nav"><button type="button" class="btn" id="en-voltar">‹ Voltar</button><button class="btn prim" type="submit">Seguinte ›</button></div></form>`);
  const ler = () => {
    d.nome = (el.querySelector('#en-nome') as HTMLInputElement).value.trim();
    d.nascimento = (el.querySelector('#en-nasc') as HTMLInputElement).value;
    d.nacionalidade = (el.querySelector('#en-nac') as HTMLSelectElement).value;
    d.perfilDono = (el.querySelector('input[name="en-perf"]:checked') as HTMLInputElement | null)?.value ?? d.perfilDono;
  };
  el.querySelectorAll('input[name="en-perf"]').forEach((r) => r.addEventListener('change', () => { ler(); ecraPerfil(); }));
  el.querySelector('#en-voltar')!.addEventListener('click', ecraCarreiras);
  el.querySelector('#en-form')!.addEventListener('submit', (e) => {
    e.preventDefault(); ler();
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

function ecraJogo() {
  const r = E.resumo!;
  document.documentElement.style.setProperty('--acento', r.clube.cores[0]);
  document.documentElement.style.setProperty('--acento-2', r.clube.cores[1]);
  const nav = (k: string, t: string) => `<a class="nav ${k === E.ecra ? 'activo' : ''}" href="#" data-ecra="${k}">${svg(k)}${t}</a>`;
  raiz().innerHTML = `<div class="app">
    <nav class="lateral" aria-label="Navegação principal"><div class="marca">${escudo(r.clube.cores)}<div><b>FutCEO</b><small>${esc(r.clube.nome)}</small></div></div>
      ${ECRAS.map(([k, t]) => nav(k, t)).join('')}<div style="flex:1"></div><a class="nav" href="#" id="b-menu">${svg('seta')}Menu principal</a></nav>
    <main class="principal" id="principal">${barraTopo(r)}${conteudo(r)}</main>
    <nav class="inferior" aria-label="Navegação">${INFERIOR.map((k) => `<a class="${k === E.ecra ? 'activo' : ''}" href="#" data-ecra="${k}">${svg(k)}${ECRAS.find((x) => x[0] === k)![1].split(' ')[0]}</a>`).join('')}<a href="#" id="b-menu2">${svg('mais')}Menu</a></nav></div>`;
  const el = raiz();
  el.querySelectorAll<HTMLElement>('[data-ecra]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); E.ecra = a.dataset.ecra!; ecraJogo(); }));
  for (const id of ['#b-menu', '#b-menu2']) el.querySelector(id)?.addEventListener('click', async (e) => { e.preventDefault(); await gravar(true); await ecraCarreiras(); });
  el.querySelector('#b-continuar')!.addEventListener('click', avancar);
  el.querySelector('#b-guardar')!.addEventListener('click', async () => { await gravar(false); const b = el.querySelector('#gravado') as HTMLElement; b.textContent = 'Gravado'; setTimeout(() => (b.textContent = ''), 1800); });
}

function barraTopo(r: Resumo) {
  return `<div class="barra-topo"><div class="data"><b>${r.data}</b><span>Época ${r.epoca}</span></div>
    <button class="icone-btn" id="b-guardar" aria-label="Guardar o progresso" title="Guardar o progresso">${svg('guardar')}</button><span class="aviso-gravar" id="gravado" aria-live="polite"></span>
    <button class="btn prim continuar" id="b-continuar" ${E.aAvancar ? 'disabled' : ''}>${E.aAvancar ? 'A simular…' : 'Continuar'} ${svg('seta')}</button></div>`;
}

async function avancar() {
  if (E.aAvancar) return;
  E.aAvancar = true; ecraJogo();
  try {
    const r = await pedir<'estado'>({ tipo: 'avancar', semanas: 1 });
    E.resumo = r.resumo; E.registo = r.registo;
    if (E.registo.semanas % INTERFACE.gravacao_automatica_semanas === 0) await gravar(true);
  } catch (e) { alert(`Erro na simulação: ${(e as Error).message}`); }
  E.aAvancar = false; ecraJogo();
}

function conteudo(r: Resumo) {
  if (E.ecra !== 'inicio') {
    const [, t, parte] = ECRAS.find((x) => x[0] === E.ecra)!;
    return `<div class="topo"><h1>${t}</h1></div><section class="c em-breve"><h2>Em construção</h2><div>Este ecrã chega na parte ${parte} do Bloco A. O desenho é o do protótipo.</div></section>`;
  }
  const j = (x: NonNullable<Resumo['proximo']>) => `<div class="jogo-l"><span class="muted">${x.data}</span><span><b>${esc(x.casa)}</b> – <b>${esc(x.fora)}</b><div class="rot">${esc(x.comp)}</div></span>${x.resultado ? `<span><b class="num" style="font-size:18px">${x.emCasa ? `${x.gc}-${x.gf}` : `${x.gf}-${x.gc}`}</b> <span class="res ${x.resultado}">${x.resultado}</span></span>` : '<span class="chip info">próximo</span>'}</div>`;
  return `<div class="topo"><h1>Início</h1><span class="sub">${esc(r.clube.nome)} · ${esc(r.clube.ligaNome)}</span></div>
  <div class="grelha">
    <section class="c s6"><h2>Próximo jogo</h2>${r.proximo ? j(r.proximo) : '<div class="rot">Sem jogos marcados nas próximas semanas.</div>'}</section>
    <section class="c s3"><h2>Posição</h2><div class="num grande">${r.posicao ?? '–'}<span class="muted" style="font-size:20px">.º</span></div><div class="rot">${esc(r.clube.ligaNome)}</div></section>
    <section class="c s3"><h2>Caixa</h2><div class="num grande" style="font-size:30px">${r.clube.caixa !== null ? fM(r.clube.caixa) : '–'}</div><div class="rot">Reputação ${r.clube.reputacao}</div></section>
    <section class="c s6"><h2>Últimos resultados</h2>${r.ultimos.length ? r.ultimos.map(j).join('') : '<div class="rot">A época ainda não começou para o clube.</div>'}</section>
    <section class="c s6"><h2>Classificação</h2><div class="tab-wrap"><table><thead><tr><th class="r">#</th><th>Clube</th><th class="r">J</th><th class="r">V</th><th class="r">E</th><th class="r">D</th><th class="r">DG</th><th class="r">Pts</th></tr></thead><tbody>${r.tabela.map((x) => `<tr class="${x.meu ? 'meu' : ''}"><td class="r">${x.pos}</td><td>${esc(x.clube)}</td><td class="r">${x.j}</td><td class="r">${x.v}</td><td class="r">${x.e}</td><td class="r">${x.d}</td><td class="r">${x.dg > 0 ? '+' : ''}${x.dg}</td><td class="r"><b>${x.pts}</b></td></tr>`).join('')}</tbody></table></div></section>
    <section class="c s12"><div class="rot">Parte A1 do Bloco A: a estrutura da app (carregamento, entrada, perfil, clube, gravações) e um Início mínimo. Os outros ecrãs chegam nas partes seguintes.</div></section>
  </div>`;
}

// ---------------------------------------------------------------- arranque

export async function arrancar() {
  const c = carregamento();
  try { await pedir<'ok'>({ tipo: 'preparar' }, c.progresso); } catch { /* o erro volta a aparecer ao gerar o mundo */ }
  c.fechar();
  ecraEntrada();
}
