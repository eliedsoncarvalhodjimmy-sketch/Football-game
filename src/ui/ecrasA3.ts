// Ecrãs da Parte A3 (desenho do protótipo, dados reais do motor): Mercado (com a negociação), Academia e Recrutamento.
// Só HTML; os eventos são ligados em app.ts (delegação por atributos data-*).
import type { VistaMercado, VistaNegociacao, VistaScouting, VistaAcademia, LinhaMercado, TabelaJuvenil } from '../jogo/vistasA3.ts';
import { avaliarClube, avaliarJogador, type PropostaJogador } from '../mercado/mercadoUtilizador.ts';
import { MAPA_MUNDO, ZOOM_MAPA } from './mapaMundo.ts';
import { esc, fE, fM } from './ecras.ts';
import { svg, escudo } from './icones.ts';

const corOvr = (o: number) => (o >= 75 ? 'qa' : o >= 68 ? 'qb' : o >= 60 ? 'qc' : 'qd');
const estrelas = (a: number, b: number) => { const s = (x: number) => '★'.repeat(Math.floor(x)) + (x % 1 ? '½' : ''); return a === b ? s(a) : `${s(a)}–${s(b)}`; };
const potE = (p: number) => Math.max(0.5, Math.min(5, Math.round(((p - 40) / 12) * 2) / 2));
const conh = (k: number) => `<span class="chip ${k >= 80 ? 'bom' : k >= 50 ? 'aviso' : 'mau'}">${k}%</span>`;
const ovrN = (o: [number, number]) => (o[0] === o[1] ? `<span class="ovr ${corOvr(o[0])}">${o[0]}</span>` : `<span class="intervalo">${o[0]}–${o[1]}</span>`);
const clubeC = (l: LinhaMercado) => `<span style="display:inline-flex;align-items:center;gap:6px">${escudo(l.cores, 16)}${esc(l.clube)}${l.liga ? ` <span class="chip">${esc(l.liga)}</span>` : ''}</span>`;
const painel = (ic: string, t: string, sub: string, total: string) => `<div class="painel-cab"><span class="ic">${svg(ic)}</span><div><h3>${t}</h3><div class="rot">${sub}</div></div><span class="total">${total}</span></div>`;
const rosto = (s: string, t: number) => `<span class="rosto" style="width:${t}px;height:${Math.round(t * 1.2)}px">${s}</span>`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const iniciais = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

// ---------------------------------------------------------------- Mercado

export interface UiMercado { tab: string; pesquisa: string; pos: string; idade: string; liga: string; conh: string }
const GRUPOS: Record<string, string[]> = { 'Guarda-redes': ['GR'], Defesas: ['DC', 'DD', 'DE', 'ALD', 'ALE'], 'Médios': ['MDC', 'MC', 'MO'], 'Avançados': ['ED', 'EE', 'PL'] };

function filtrar(l: LinhaMercado[], ui: UiMercado) {
  return l.filter((x) => (!ui.pesquisa || x.nome.toLowerCase().includes(ui.pesquisa.toLowerCase()))
    && (!ui.pos || GRUPOS[ui.pos]?.includes(x.pos))
    && (!ui.idade || (ui.idade === '23' ? x.idade <= 23 : ui.idade === '29' ? x.idade >= 24 && x.idade <= 29 : x.idade >= 30))
    && (!ui.liga || x.liga === ui.liga)
    && (!ui.conh || x.conh >= Number(ui.conh)));
}

function filtros(v: VistaMercado, ui: UiMercado) {
  const sel = (id: string, rot: string, ops: [string, string][], val: string) => `<select data-filtrom="${id}" aria-label="${rot}">${ops.map(([k, t]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<div class="filtros"><input type="search" id="m-pesq" placeholder="Pesquisar…" aria-label="Pesquisar" value="${esc(ui.pesquisa)}">
    ${sel('pos', 'Posição', [['', 'Todas as posições'], ...Object.keys(GRUPOS).map((g) => [g, g] as [string, string])], ui.pos)}
    ${sel('idade', 'Idade', [['', 'Idade: todas'], ['23', 'Até 23'], ['29', '24–29'], ['30', '30+']], ui.idade)}
    ${sel('liga', 'Liga', [['', 'Todas as ligas'], ...v.ligas.map((l) => [l, l] as [string, string])], ui.liga)}
    ${sel('conh', 'Conhecimento', [['', 'Conhecimento: todos'], ['50', '≥ 50%'], ['80', '≥ 80%']], ui.conh)}</div>`;
}

const btnNeg = (l: LinhaMercado, tipo: string, txt: string, prim = false) => l.negociacao !== null ? `<button class="btn" data-neg-abrir="${l.negociacao}">Ver negociação</button>` : `<button class="btn ${prim ? 'prim' : ''}" data-negociar="${l.id}:${tipo}">${txt}</button>`;
const estrela = (l: LinhaMercado) => `<button class="btn-ic ${l.shortlist ? 'on' : ''}" data-short="${l.id}:${l.shortlist ? 0 : 1}" title="${l.shortlist ? 'Tirar da shortlist' : 'Pôr na shortlist'}" aria-label="${l.shortlist ? 'Tirar da shortlist' : 'Pôr na shortlist'}">${l.shortlist ? '★' : '☆'}</button>`;

function tabelaTransf(lista: LinhaMercado[]) {
  return `<div class="tab-wrap"><table><thead><tr><th></th><th>Jogador</th><th>Pos.</th><th class="r">Idade</th><th>Clube</th><th class="r">Conhec.</th><th>OVR</th><th>Potencial</th><th class="r">Preço pedido</th><th class="r"></th></tr></thead><tbody>${lista.map((x) => `<tr class="clic" data-jogador="${x.id}"><td>${estrela(x)}</td><td><b>${esc(x.nome)}</b></td><td>${x.pos}</td><td class="r">${x.idade}</td><td>${clubeC(x)}</td><td class="r">${conh(x.conh)}</td><td>${ovrN(x.ovr)}</td><td class="estrelas" style="font-size:13px">${estrelas(potE(x.pot[0]), potE(x.pot[1]))}</td><td class="r">${x.preco ? fM(x.preco) : '—'}</td><td class="r">${btnNeg(x, 'transferencia', 'Fazer oferta')}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Nenhum jogador com estes filtros.</td></tr>'}</tbody></table></div>`;
}
function tabelaEmpr(lista: LinhaMercado[]) {
  return `<div class="tab-wrap"><table><thead><tr><th></th><th>Jogador</th><th>Pos.</th><th class="r">Idade</th><th>Clube</th><th class="r">Conhec.</th><th>OVR</th><th class="r">Salário a pagar</th><th class="r"></th></tr></thead><tbody>${lista.map((x) => `<tr class="clic" data-jogador="${x.id}"><td>${estrela(x)}</td><td><b>${esc(x.nome)}</b></td><td>${x.pos}</td><td class="r">${x.idade}</td><td>${clubeC(x)}</td><td class="r">${conh(x.conh)}</td><td>${ovrN(x.ovr)}</td><td class="r">${pct(x.emprestimoSalario ?? 0.5)}</td><td class="r">${btnNeg(x, 'emprestimo', 'Pedir empréstimo')}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">Nenhum jogador com estes filtros.</td></tr>'}</tbody></table></div>`;
}
function tabelaLivres(lista: LinhaMercado[]) {
  return `<div class="tab-wrap"><table><thead><tr><th></th><th>Jogador</th><th>Pos.</th><th class="r">Idade</th><th>Nac.</th><th class="r">Conhec.</th><th>OVR</th><th class="r">Salário pedido</th><th class="r">Livre há</th><th class="r"></th></tr></thead><tbody>${lista.map((x) => `<tr class="clic" data-jogador="${x.id}"><td>${estrela(x)}</td><td><b>${esc(x.nome)}</b></td><td>${x.pos}</td><td class="r">${x.idade}</td><td>${esc(x.pais)}</td><td class="r">${conh(x.conh)}</td><td>${ovrN(x.ovr)}</td><td class="r">${x.salario ? `${fM(x.salario)}/ano` : '—'}</td><td class="r muted">${x.semanasLivre ?? 0} sem.</td><td class="r">${btnNeg(x, 'livre', 'Contratar', true)}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Sem jogadores livres com estes filtros.</td></tr>'}</tbody></table></div>`;
}
function tabelaConhecidos(lista: LinhaMercado[]) {
  return `<div class="tab-wrap"><table><thead><tr><th></th><th>Jogador</th><th>Pos.</th><th class="r">Idade</th><th>Clube</th><th class="r">Conhec.</th><th>OVR</th><th>Potencial</th><th class="r">Valor</th><th class="r"></th></tr></thead><tbody>${lista.map((x) => `<tr class="clic" data-jogador="${x.id}"><td>${estrela(x)}</td><td><b>${esc(x.nome)}</b>${x.listado ? ' <span class="chip info">à venda</span>' : ''}</td><td>${x.pos}</td><td class="r">${x.idade}</td><td>${clubeC(x)}</td><td class="r">${conh(x.conh)}</td><td>${ovrN(x.ovr)}</td><td class="estrelas" style="font-size:13px">${estrelas(potE(x.pot[0]), potE(x.pot[1]))}</td><td class="r">${fM(x.valor)}</td><td class="r">${btnNeg(x, 'transferencia', 'Fazer oferta')}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Nenhum jogador.</td></tr>'}</tbody></table></div>`;
}

export function htmlMercado(v: VistaMercado, ui: UiMercado) {
  const nRec = v.recebidas.filter((x) => x.aguarda).length;
  const tabs: [string, string][] = [['geral', 'Visão geral'], ['transf', 'Transferências'], ['empr', 'Empréstimos'], ['livres', 'Jogadores livres'], ['pesquisa', 'Pesquisa'], ['short', `Shortlist (${v.shortlist.length})`], ['ofertas', `Ofertas${nRec ? ` (${nRec})` : ''}`], ['vender', 'Os meus jogadores']];
  const j = v.janela;
  const cab = `<section class="banner-mercado"><img src="./img/mercado.jpg" alt=""><div class="bm-topo"><h1>Mercado</h1><span>Transferências, empréstimos e jogadores livres</span></div>
    <div class="bm-contagem ${j.aberta ? 'aberta' : ''}"><span class="bm-estado">${j.aberta ? 'Janela aberta' : 'Janela fechada'}</span><span class="bm-dias num">${j.dias}</span><span class="bm-texto">${j.dias === 1 ? 'dia' : 'dias'} para a janela ${j.nome} ${j.aberta ? 'fechar' : 'abrir'}</span></div></section>
    <div class="filtros"><div class="seg" role="group" aria-label="Secções do mercado">${tabs.map(([k, t]) => `<button data-tabm="${k}" class="${k === ui.tab ? 'on' : ''}">${t}</button>`).join('')}</div>
      <span class="muted">Orçamento: <b>${fM(v.orcamento.transferencias)}</b> em transferências · <b>${fM(v.orcamento.salarialLivre)}</b>/ano de folga salarial</span></div>`;
  const fechada = !j.aberta ? '<div class="rot" style="margin-bottom:8px">Com a janela fechada só podes contratar jogadores livres; as compras e os empréstimos esperam pela abertura.</div>' : '';
  if (ui.tab === 'transf') return cab + filtros(v, ui) + fechada + `<section class="c">${painel('troca', 'Transferências', 'Jogadores que outros clubes puseram à venda (os agentes divulgam a lista; o OVR é o que os teus olheiros sabem)', `${v.listados.length} jogadores`)}${tabelaTransf(filtrar(v.listados, ui))}</section>`;
  if (ui.tab === 'empr') return cab + filtros(v, ui) + fechada + `<section class="c">${painel('troca', 'Empréstimos', 'Jovens de clubes grandes que não entram nas contas deles', `${v.emprestimos.length} jogadores`)}${tabelaEmpr(filtrar(v.emprestimos, ui))}</section>`;
  if (ui.tab === 'livres') return cab + filtros(v, ui) + `<section class="c">${painel('livre', 'Jogadores livres', 'Sem custo de transferência; o salário pedido desce com os meses sem clube', `${v.livres.length} jogadores`)}${tabelaLivres(filtrar(v.livres, ui))}</section>`;
  if (ui.tab === 'pesquisa') return cab + filtros(v, ui) + `<section class="c">${painel('jogador', 'Pesquisa', 'Todos os jogadores que os teus olheiros conhecem (conhecimento ≥ 25%)', `${v.conhecidos.length} jogadores`)}${tabelaConhecidos(filtrar(v.conhecidos, ui))}</section>`;
  if (ui.tab === 'short') return cab + `<section class="c">${painel('jogador', 'Shortlist', 'Os teus alvos: os olheiros observam-nos todas as semanas e o conhecimento sobe', `${v.shortlist.length} jogadores`)}${tabelaConhecidos(v.shortlist)}</section>`;
  if (ui.tab === 'ofertas') return cab + htmlOfertas(v);
  if (ui.tab === 'vender') return cab + `<section class="c">${painel('troca', 'Os meus jogadores', 'Põe à venda quem queres vender: os outros clubes vêem-no na lista de transferências', `${v.meus.filter((x) => x.listado).length} à venda`)}<div class="tab-wrap"><table><thead><tr><th>Jogador</th><th>Pos.</th><th class="r">OVR</th><th class="r">Valor</th><th class="r"></th></tr></thead><tbody>${v.meus.map((x) => `<tr class="clic" data-jogador="${x.id}"><td><b>${esc(x.nome)}</b>${x.listado ? ' <span class="chip info">à venda</span>' : ''}</td><td>${x.pos}</td><td class="r"><span class="ovr ${corOvr(x.ovr)}">${x.ovr}</span></td><td class="r">${fM(x.valor)}</td><td class="r"><button class="btn" data-listar="${x.id}:${x.listado ? 0 : 1}">${x.listado ? 'Retirar da venda' : 'Pôr à venda'}</button></td></tr>`).join('')}</tbody></table></div></section>`;
  const curta = (l: LinhaMercado[], col: string) => `<div class="tab-wrap"><table><thead><tr><th>Jogador</th><th>Clube</th><th>Pos.</th><th>OVR</th><th class="r">${col}</th></tr></thead><tbody>${l.slice(0, 5).map((x) => `<tr class="clic" data-jogador="${x.id}"><td><b>${esc(x.nome)}</b></td><td>${clubeC(x)}</td><td>${x.pos}</td><td>${ovrN(x.ovr)}</td><td class="r">${col === 'Preço' ? (x.preco ? fM(x.preco) : '—') : pct(x.emprestimoSalario ?? 0.5)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nenhum.</td></tr>'}</tbody></table></div>`;
  return cab + `<div class="grelha">
    ${nRec ? `<section class="c s12"><div class="linha-kv"><span><span class="chip mau"><span class="pt"></span>Decisão</span> ${nRec} oferta${nRec > 1 ? 's' : ''} por jogadores teus à espera de resposta</span><button class="btn prim" data-tabm="ofertas">Responder</button></div></section>` : ''}
    <section class="c s12">${painel('livre', 'Jogadores livres', 'Contratar sem custo de transferência', `${v.livres.length} jogadores`)}${tabelaLivres(v.livres.slice(0, 5))}</section>
    <section class="c s6">${painel('troca', 'Transferências', 'Listados por outros clubes', `${v.listados.length} jogadores`)}${curta(v.listados, 'Preço')}<button class="btn" style="margin-top:10px" data-tabm="transf">Ver todas as transferências</button></section>
    <section class="c s6">${painel('troca', 'Empréstimos', 'Disponíveis para empréstimo', `${v.emprestimos.length} jogadores`)}${curta(v.emprestimos, 'Salário')}<button class="btn" style="margin-top:10px" data-tabm="empr">Ver todos os empréstimos</button></section>
    ${negociacoesFeitas(v)}
  </div>`;
}

function negociacoesFeitas(v: VistaMercado) {
  return `<section class="c s12"><h2>As tuas negociações</h2>${v.feitas.length ? v.feitas.map((n) => `<div class="linha-kv clic" data-neg-abrir="${n.id}"><span><b>${esc(n.nome)}</b> <span class="muted">${esc(n.clube)} · ${({ transferencia: 'compra', emprestimo: 'empréstimo', livre: 'livre', clausula: 'cláusula' } as Record<string, string>)[n.tipo]}</span></span><span class="chip ${n.fase === 'concluida' ? 'bom' : ['rompeu', 'rompeu_jogador', 'falhou', 'desistiu'].includes(n.fase) ? 'mau' : 'aviso'}">${n.texto}</span></div>`).join('') : '<div class="rot">Ainda não negociaste nenhum jogador. Abre a ficha de um jogador ou usa as listas acima.</div>'}</section>`;
}

function htmlOfertas(v: VistaMercado) {
  const tipo: Record<string, string> = { transferencia: 'compra', emprestimo: 'empréstimo', clausula: 'cláusula de rescisão', pre_contrato: 'pré-contrato', livre: 'livre', formacao: 'formação' };
  return `<div class="grelha"><section class="c s6"><h2>Recebidas</h2>${v.recebidas.length ? v.recebidas.map((o) => `<div class="oferta">
      <div class="linha-kv"><span>${escudo(o.cores, 18)} <b>${esc(o.comprador)}</b> · ${tipo[o.tipo] ?? o.tipo}${o.tipo === 'emprestimo' ? '' : ` · <b>${fM(o.oferta)}</b>`} por <span class="clic" data-jogador="${o.jogador}"><b>${esc(o.nome)}</b></span> <span class="muted">${o.pos}${o.valor ? ` · valor ${fM(o.valor)}` : ''}</span></span><span class="chip ${o.aguarda ? 'mau' : o.estado === 'concluído' ? 'bom' : ''}">${esc(o.estado)}</span></div>
      ${o.aguarda ? `<div class="oferta-acoes"><button class="btn" data-resp="${o.negocio}:recusar">Recusar</button>${o.tipo !== 'emprestimo' ? `<input class="inp-eur" data-contra-val="${o.negocio}" inputmode="numeric" value="${fE(Math.round(Math.max(o.oferta * 1.2, o.valor) / 1e5) * 1e5)}" aria-label="Contra-proposta em euros"><button class="btn" data-resp="${o.negocio}:contra">Contra-proposta</button>` : ''}<button class="btn prim" data-resp="${o.negocio}:aceitar">Aceitar</button></div>` : ''}
      ${o.rondas.length ? `<div class="rot">${o.rondas.map(esc).join('<br>')}</div>` : ''}</div>`).join('') : '<div class="rot">Nenhuma oferta por jogadores teus. As ofertas esperam pela tua resposta até 2 semanas.</div>'}</section>
    ${negociacoesFeitas(v).replace('c s12', 'c s6').replace('As tuas negociações', 'Feitas')}</div>`;
}

// ---------------------------------------------------------------- Negociação

export interface RascNeg { valor: number; vendaFutura: number; parcelas: string; troca: string | null; salarioEmp: number; opcao: number; contrato: PropostaJogador | null }

export function rascunhoInicial(v: VistaNegociacao): RascNeg {
  const n = v.neg;
  const uc = n.ultimaClube, uj = n.ultimaJogador;
  const pe = n.pede;
  return {
    valor: uc?.valor ?? Math.round(n.pedido * 0.9 / 1e4) * 1e4, vendaFutura: uc?.vendaFutura ?? 0, parcelas: uc?.parcelas ?? 'vista', troca: null,
    salarioEmp: n.emprestimo?.salario ?? v.emprestimo?.opcoes[1] ?? 0.5, opcao: n.emprestimo?.opcao ?? 0,
    contrato: uj ? { ...uj } : pe ? { papel: pe.papel, anos: 3, salario: Math.round(pe.salario * 0.85 / 1e4) * 1e4, premio: Math.round(pe.premio * 0.8 / 1e3) * 1e3, agente: pe.agente, clausula: 0, bonus: null } : null,
  };
}

export function htmlNegociacao(v: VistaNegociacao, r: RascNeg) {
  const n = v.neg, p = v.jogador;
  const ten = n.tensao, corT = ten >= 70 ? 'var(--mau)' : ten >= 45 ? 'var(--aviso)' : 'var(--bom)';
  const cab = `<div class="topo"><h1>Negociação</h1><span class="sub">${esc(p.nome)} · ${esc(v.vendedor)}</span><div class="direita"><button class="btn" data-voltar="1">‹ Voltar</button></div></div>`;
  const hist = `<section class="c s12"><h2>Histórico</h2>${n.historico.map((h) => `<div class="linha-kv"><span>${esc(h.texto)}</span></div>`).join('')}</section>`;
  const jog = `<div class="np-jog">${rosto(p.rosto, 54)}<div class="np-dados"><span>Idade: <b>${p.idade}</b></span><span><b>${p.pos}</b></span></div><div class="np-ovr"><span>OVR</span><b>${p.ovr[0] === p.ovr[1] ? p.ovr[0] : `${p.ovr[0]}–${p.ovr[1]}`}</b></div>${escudo(v.coresVendedor, 30)}</div>
    <div class="np-nome">${esc(p.nome.split(' ').slice(0, -1).join(' '))} <b>${esc(p.nome.split(' ').slice(-1)[0])}</b></div>`;
  const orc = `<div class="np-orc"><span style="width:28px;height:28px;display:grid;place-items:center;flex:none">${svg('financas')}</span><div><div class="np-l"><span>Orçamento de transferências</span><b>${fE(v.orcamento.transferencias)}</b></div><div class="np-l"><span>Folga salarial</span><b>${fE(v.orcamento.salarialLivre)}/ano</b></div></div></div>`;
  if (n.fase !== 'clube' && n.fase !== 'jogador') {
    const fim: Record<string, string> = { registo: 'Acordo fechado: faltam os exames médicos e o registo (na semana que vem).', concluida: `${p.nome} assinou pelo teu clube.`, rompeu: `${v.vendedor} terminou a negociação: a tensão chegou ao limite.`, rompeu_jogador: 'O agente terminou as conversas: o jogador não quer vir.', desistiu: 'Terminaste a negociação.', falhou: n.fala };
    return cab + `<div class="grelha"><section class="c s12"><div class="painel-cab"><span class="ic">${svg('troca')}</span><div><h3>${esc(fim[n.fase] ?? n.fala)}</h3><div class="rot">${esc(n.fala)}</div></div>${['rompeu', 'rompeu_jogador', 'desistiu', 'falhou'].includes(n.fase) ? `<button class="btn" style="margin-left:auto" data-negociar="${p.id}:${n.tipo}">Tentar de novo</button>` : ''}</div></section>${hist}</div>`;
  }
  const cena = (ops: string) => `<div class="neg2-cena"><img src="./img/negociacao-${n.ronda % 2 ? (n.fase === 'clube' ? 2 : 1) : (n.fase === 'clube' ? 1 : 2)}.jpg" alt="Negociação">
      <div class="neg2-tensao" title="Tensão da negociação"><span>Tensão</span><div class="barra"><i style="width:${ten}%;background:${corT}"></i></div></div>
      <div class="neg2-fala"><span class="chip info">${n.fase === 'jogador' ? 'Contrato · ' : ''}Ronda ${n.ronda}</span><span>${esc(n.fala)}</span></div>
      <div class="neg2-menu" role="group" aria-label="Acções da negociação"><span class="neg2-roda"></span><div class="neg2-ops">${ops}<button class="neg2-op fim" data-neg="desistir">Terminar negociação</button></div></div></div>`;
  if (n.fase === 'clube' && n.tipo === 'emprestimo') {
    const e = v.emprestimo!;
    const ok = r.salarioEmp >= e.exigido && (!r.opcao || r.opcao >= e.opcaoMinima);
    return cab + `<div class="grelha"><section class="c s12 neg2">${cena(`<button class="neg2-op prim" data-neg="enviar">Enviar pedido</button><button class="neg2-op" data-neg="salemp">Salário pago por ti: ${pct(r.salarioEmp)}</button><button class="neg2-op" data-neg="opcao">Opção de compra: ${r.opcao ? 'sim' : 'não'}</button>`)}
      <aside class="neg2-painel">${orc}<div class="np-tit">Pedido ao clube / <span>Empréstimo</span></div>${jog}
        <div class="np-l np-pad"><span>Salário do jogador</span><b>${fE(p.salarioActual)}/ano</b></div>
        <div class="np-l np-pad"><span>Pagas</span><b>${pct(r.salarioEmp)} (${fE(p.salarioActual * r.salarioEmp)}/ano)</b></div>
        ${r.opcao ? `<label class="np-campo"><span>Opção de compra</span><input data-eur="opcao" inputmode="numeric" value="${fE(r.opcao)}"></label>` : ''}
        <div class="np-dica ${ok ? 'bom' : ''}">${ok ? 'O clube deve aceitar.' : r.salarioEmp < e.exigido ? `O clube quer que pagues pelo menos ${pct(e.exigido)} do salário.` : `A opção de compra tem de ser pelo menos ${fE(e.opcaoMinima)}.`}</div></aside></section>${hist}</div>`;
  }
  if (n.fase === 'clube') {
    const troca = r.troca ? v.trocas.find((t) => t.id === r.troca) ?? null : null;
    const av = avaliarClube(n.pedido, { valor: r.valor, vendaFutura: r.vendaFutura, parcelas: r.parcelas, troca: troca ? 0 : null }, troca?.valor ?? 0);
    const parc = v.parcelas.find((x) => x.id === r.parcelas)!;
    return cab + `<div class="grelha"><section class="c s12 neg2">${cena(`<button class="neg2-op prim" data-neg="enviar">Enviar proposta</button><button class="neg2-op" data-neg="venda">Venda futura: ${r.vendaFutura}%</button><button class="neg2-op" data-neg="parcelas">Pagamento: ${esc(parc.nome.toLowerCase())}</button>`)}
      <aside class="neg2-painel">${orc}<div class="np-tit">Proposta ao clube / <span>Compra</span></div>${jog}
        <div class="np-l np-pad"><span>Valor de mercado</span><b>${fE(p.valor)}</b></div>
        <div class="np-l np-pad"><span>O clube pede</span><b>${fE(n.pedido)}</b></div>
        <div class="np-sec"><span class="np-ic">⇄</span>Troca de jogador</div>
        <label class="np-campo"><span>Jogador do teu plantel (conta ${80}% do valor)</span><select data-troca="1"><option value="">Nenhum</option>${v.trocas.map((t) => `<option value="${t.id}" ${t.id === r.troca ? 'selected' : ''}>${esc(t.nome)} · ${t.pos} · ${fM(t.valor)}</option>`).join('')}</select></label>
        <div class="np-sec"><span class="np-ic">€</span>Financeiro</div>
        <div class="np-l np-pad"><span>Venda futura</span><b>${r.vendaFutura ? `${r.vendaFutura}%` : '—'}</b></div>
        <div class="np-l np-pad"><span>Pagamento</span><b>${esc(parc.nome)}</b></div>
        <label class="np-soma"><span>Valor da transferência</span><input data-eur="valor" inputmode="numeric" autocomplete="off" value="${fE(r.valor)}" aria-label="Valor da transferência em euros"></label>
        <div class="np-dica ${av.ok ? 'bom' : ''}" id="neg-dica">${av.ok ? 'O clube deve aceitar.' : `Abaixo do que o clube exige (${fE(Math.ceil(av.exigido - av.troca))}).`}</div></aside></section>${hist}</div>`;
  }
  const ct = r.contrato!, pe = n.pede!;
  const av = avaliarJogador(pe, ct, p.valor, v.posicao);
  const eur = (k: string, rot: string, val: number) => `<label class="np-campo"><span>${rot}</span><input data-eur="${k}" inputmode="numeric" autocomplete="off" value="${fE(val)}"></label>`;
  const b = ct.bonus;
  return cab + `<div class="grelha"><section class="c s12 neg2">${cena(`<button class="neg2-op prim" data-neg="enviar">Enviar proposta</button><button class="neg2-op" data-neg="papel">Papel: ${ct.papel}</button><button class="neg2-op" data-neg="anos">Duração: ${ct.anos} ${ct.anos === 1 ? 'ano' : 'anos'}</button><button class="neg2-op" data-neg="clausula">Cláusula de rescisão: ${ct.clausula ? 'sim' : 'não'}</button><button class="neg2-op" data-neg="bonus">Bónus por objectivos: ${b ? 'sim' : 'não'}</button>`)}
    <aside class="neg2-painel">${orc}<div class="np-tit">Proposta ao jogador / <span>Contrato</span></div>${jog}
      <div class="np-l np-pad"><span>Salário actual</span><b>${p.salarioActual ? `${fE(p.salarioActual)}/ano` : '—'}</b></div>
      <div class="np-sec"><span class="np-ic">✎</span>Contrato</div>
      <div class="np-l np-pad"><span>Papel no plantel</span><b>${ct.papel} <small class="muted">(pede ${pe.papel})</small></b></div>
      <div class="np-l np-pad"><span>Duração</span><b>${ct.anos} ${ct.anos === 1 ? 'ano' : 'anos'}</b></div>
      ${ct.clausula ? eur('clausula', 'Cláusula de rescisão', ct.clausula) : ''}
      <div class="np-sec"><span class="np-ic">€</span>Financeiro</div>
      <label class="np-soma"><span>Salário por ano <small class="muted">(pede ${fE(pe.salario)})</small></span><input data-eur="salario" inputmode="numeric" autocomplete="off" value="${fE(ct.salario)}" aria-label="Salário anual em euros"><small class="np-sem">${fE(Math.round(ct.salario / 52 / 10) * 10)}/semana</small></label>
      <div class="np-sec"><span class="np-ic">+</span>Condições adicionais</div>
      ${eur('premio', `Prémio de assinatura <small class="muted">(pede ${fE(pe.premio)})</small>`, ct.premio)}
      ${eur('agente', `Taxa do agente <small class="muted">(pede ${fE(pe.agente)})</small>`, ct.agente)}
      ${b ? `<div class="np-bonus"><span class="rot">Bónus (opcional, difícil de cumprir)</span><div class="np-bonus-l"><button class="btn" data-neg="bmodo">${b.modo}</button>${b.modo === 'Ao chegar a' ? `<button class="btn" data-neg="bn">${b.n}</button>` : ''}<button class="btn" data-neg="btipo">${b.tipo.toLowerCase()}</button></div>
        ${eur('bonus', b.modo === 'Por cada' ? `Valor por cada ${({ Golos: 'golo', Jogos: 'jogo', 'Assistências': 'assistência', 'Jogos sem sofrer golos': 'jogo sem sofrer golos' } as Record<string, string>)[b.tipo]}` : `Valor ao chegar a ${b.n} ${b.tipo.toLowerCase()}`, b.valor)}</div>` : ''}
      <div class="np-dica ${av.ok ? 'bom' : ''}" id="neg-dica">${av.bonusInvalido ? 'Jogos sem sofrer golos é só para guarda-redes e defesas.' : !av.agenteOk ? 'O agente não aceita uma taxa tão baixa.' : av.ok ? 'O jogador deve aceitar.' : 'O jogador espera mais.'}</div>
    </aside></section>${hist}</div>`;
}

// ---------------------------------------------------------------- Academia e Recrutamento

export interface UiAcademia { ala: 'academia' | 'scouting'; tab: string; escJ: number; tabJ: string; pais: string; posicao: string; semanas: number; missao: number | null; zoom: string; excedente: string[] | null; ligasScout: string[] | null }

function cabAcademia(ui: UiAcademia) {
  return `<div class="topo"><h1>Academia e Recrutamento</h1></div><div class="filtros"><div class="seg" role="group">${([['academia', 'Academia'], ['scouting', 'Departamento de scouting']] as const).map(([k, t]) => `<button data-ala="${k}" class="${k === ui.ala ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
}

export function htmlAcademia(v: VistaAcademia, ui: UiAcademia) {
  const tabs = ['Percurso', 'Intake', 'Competições'];
  const foto = `<section class="c s12" style="padding:0;overflow:hidden;position:relative"><div style="position:relative;width:100%;aspect-ratio:1024/400;max-height:320px;overflow:hidden"><img src="./img/academia.jpg" alt="Academia" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 26%"></div><div style="position:absolute;left:16px;bottom:14px;background:rgba(11,13,16,.75);padding:8px 12px;border-radius:10px"><div class="num" style="font-size:22px">Academia · nível ${v.nivelAcademia}</div><div class="rot">Intake, Sub-18 e Sub-21</div></div></section>`;
  let corpo = '';
  if (ui.tab === 'Intake') {
    corpo = `<section class="c s12 intake-caixa"><div><h2>Intake${v.intake.data ? ` de ${v.intake.data}` : ''}</h2><div class="rot">${v.intake.jogadores.length ? `${v.intake.jogadores.length} jovens chegaram à academia e entraram no Sub-18. Relatório do chefe da academia.` : 'O próximo intake chega em Junho.'}</div></div>
      <div class="intake-grelha">${v.intake.jogadores.map((x) => `<div class="intake-j clic" data-jogador="${x.id}">${rosto(x.rosto, 56)}<div><b>${esc(x.nome)}</b><div class="rot">${x.pos} · ${x.idade} anos · ${x.altura} cm · ${x.peso} kg</div><div class="intake-n"><span>OVR <b>${x.ovr[0]}–${x.ovr[1]}</b></span><span>PT <b>${x.pt[0]}–${x.pt[1]}</b></span></div><span class="chip ${x.tom}">${esc(x.personalidade)}</span></div></div>`).join('')}</div>
      <div class="rot" style="margin-top:8px">Os intervalos estreitam com a qualidade de avaliação do chefe da academia e com os jogos.</div></section>`;
  } else if (ui.tab === 'Competições') {
    const t: TabelaJuvenil | undefined = v.ligas[ui.escJ];
    corpo = `<div class="filtros s12"><div class="seg" role="group">${v.ligas.map((l, i) => `<button data-escj="${i}" class="${i === ui.escJ ? 'on' : ''}">${l.nome}</button>`).join('')}</div><div class="seg" role="group">${['Classificação', 'Playoff', 'Resultados', 'Estatísticas'].map((x) => `<button data-tabj="${x}" class="${x === ui.tabJ ? 'on' : ''}">${x}</button>`).join('')}</div><span class="rot" style="flex-basis:100%">1.ª e 2.ª divisão juntas · uma volta${t ? ` (${t.jornadas} jornadas)` : ''} · os 8 primeiros vão ao playoff em Maio · simulada em segundo plano.</span></div>`;
    if (!t) corpo += '<section class="c s12"><div class="rot">O clube não tem liga neste escalão (3.ª e 4.ª divisão jogam amigáveis).</div></section>';
    else if (ui.tabJ === 'Resultados') corpo += `<section class="c s12"><h2>Jornada ${t.jornada} de ${t.jornadas}</h2>${t.resultados.map((x) => `<div class="linha-kv ${x.meu ? 'meu-l' : ''}"><span>${esc(x.casa)}</span><b class="num" style="font-size:18px">${x.gc} – ${x.gf}</b><span style="text-align:right">${esc(x.fora)}</span></div>`).join('') || '<div class="rot">Ainda não houve jornadas.</div>'}</section>`;
    else if (ui.tabJ === 'Estatísticas') corpo += `<section class="c s12"><h2>Os nossos jogadores · ${t.nome}</h2><div class="tab-wrap"><table><thead><tr><th>Jogador</th><th>Pos.</th><th class="r">Idade</th><th class="r">J</th><th class="r">G</th><th class="r">A</th><th class="r">Nota</th></tr></thead><tbody>${t.estatisticas.map((p) => `<tr class="clic" data-jogador="${p.id}"><td><b>${esc(p.nome)}</b></td><td>${p.pos}</td><td class="r">${p.idade}</td><td class="r">${p.jogos}</td><td class="r">${p.golos}</td><td class="r">${p.assist}</td><td class="r">${p.nota ? String(p.nota).replace('.', ',') : '—'}</td></tr>`).join('')}</tbody></table></div></section>`;
    else if (ui.tabJ === 'Playoff') {
      const q = t.linhas.length >= 8 ? [[0, 7], [3, 4], [1, 6], [2, 5]].map(([a, b]) => [t.linhas[a], t.linhas[b]]) : [];
      const eq = (x: TabelaJuvenil['linhas'][number]) => `<div class="po-eq ${x.meu ? 'meu-l' : ''}"><span class="rot">${x.pos}.º</span>${escudo(x.cores, 14)}<span>${esc(x.clube)}</span></div>`;
      corpo += t.playoff.length ? `<section class="c s12"><h2>Playoff${t.campeao ? ` · campeão: ${esc(t.campeao)}` : ''}</h2>${t.playoff.map((x) => `<div class="linha-kv"><span class="muted">${x.fase}</span><span>${esc(x.casa)} <b class="num">${x.gc} – ${x.gf}</b>${x.pen ? ` <span class="muted">(${x.pen[0]}–${x.pen[1]} g.p.)</span>` : ''} ${esc(x.fora)}</span></div>`).join('')}</section>`
        : `<section class="c s12"><h2>Playoff · Maio</h2><div class="rot" style="margin-bottom:10px">Se a fase regular acabasse hoje. Quartos e meias a uma mão, em casa do melhor classificado; final em campo neutro.</div><div class="playoff"><div class="po-col"><div class="rot">Quartos de final</div>${q.map(([a, b]) => `<div class="po-jogo">${eq(a)}${eq(b)}</div>`).join('')}</div><div class="po-col"><div class="rot">Meias-finais</div>${[0, 1].map(() => '<div class="po-jogo vazio"><div class="po-eq">—</div><div class="po-eq">—</div></div>').join('')}</div><div class="po-col"><div class="rot">Final</div><div class="po-jogo vazio"><div class="po-eq">—</div><div class="po-eq">—</div></div></div></div></section>`;
    } else corpo += `<section class="c s12"><h2>${t.nome} · jornada ${t.jornada} de ${t.jornadas}</h2><div class="tab-wrap"><table><thead><tr><th class="r">#</th><th>Clube</th><th class="r so-l">J</th><th class="r so-l">V</th><th class="r so-l">E</th><th class="r so-l">D</th><th class="r">DG</th><th class="r">Pts</th></tr></thead><tbody>${t.linhas.map((x, i) => `<tr class="${x.meu ? 'meu' : ''} ${i === 7 ? 'corte-po' : ''}"><td class="r">${i < 8 ? `<span class="po-pos">${x.pos}</span>` : x.pos}</td><td><span style="display:inline-flex;gap:8px;align-items:center">${escudo(x.cores, 16)}${esc(x.clube)}${x.div === 2 ? '<span class="rot">2.ª</span>' : ''}</span></td><td class="r so-l">${x.j}</td><td class="r so-l">${x.v}</td><td class="r so-l">${x.e}</td><td class="r so-l">${x.d}</td><td class="r">${x.dg > 0 ? '+' : ''}${x.dg}</td><td class="r"><b>${x.pts}</b></td></tr>`).join('')}</tbody></table></div></section>`;
  } else {
    const c = v.contagens;
    const cad: [string, string, string, string, string][] = [['Intake', 'Junho', `${c.intake} jovens no último`, 'Entram directamente no Sub-18', 'Intake'], ['Sub-18', `${c.sub18}/${c.maxSub18}`, '15–18 anos', 'Contrato profissional aos 18', 'sub18'], ['Sub-21', `${c.sub21}/${c.maxSub21}`, '19–21 anos', 'Aos 22: sobe, é vendido ou sai', 'sub21'], ['Equipa principal', `${c.principal}`, 'Plantel sénior', 'Os melhores sobem quando estão prontos', 'principal']];
    const ex = v.excedente;
    corpo = `<section class="c s12"><h2>O percurso de um jovem</h2><div class="cadeia">${cad.map(([t, n, a, d, ir], i) => `${i ? '<span class="cad-seta">›</span>' : ''}<button class="cad" data-cad="${ir}"><b>${t}</b><span class="num">${n}</span><small>${a}</small><span class="rot">${d}</span></button>`).join('')}</div>
      <div class="rot" style="margin-top:10px">As ligas Sub-18 e Sub-21 dão os minutos que fazem os jovens evoluir. O gestor da academia sugere promoções; tu aprovas.</div></section>
    ${ex ? `<section class="c s12"><h2>Decisão: excedente do Sub-18</h2><div class="rot">O Sub-18 tem ${ex.sub18} jovens (máximo ${ex.maximo}). O gestor propõe libertar estes ${ex.jogadores.length}; podes trocar. Sem decisão, aplica-se a proposta no fim do prazo.</div>
      ${ex.jogadores.map((x) => `<label class="linha-kv"><span><input type="checkbox" data-exc="${x.id}" ${!ui.excedente || ui.excedente.includes(x.id) ? 'checked' : ''}> <b>${esc(x.nome)}</b> <span class="muted">${x.pos} · ${x.idade} anos · OVR ${x.ovr} · PT ${x.pot[0]}–${x.pot[1]}</span></span></label>`).join('')}
      <button class="btn prim" style="margin-top:10px" data-exc-decidir="1">Libertar os marcados</button></section>` : ''}
    <section class="c s12"><h2>Prontos para subir</h2>${v.prontos.length ? v.prontos.map((p) => `<div class="linha-kv"><span class="nome-av clic" data-jogador="${p.id}">${rosto(p.rosto, 28)}<span><b>${esc(p.nome)}</b><div class="rot">${p.pos} · ${p.idade} anos · OVR ${p.ovr} · ${p.escalao === 'sub21' ? 'Sub-21' : 'Sub-18'} → ${p.para}</div></span></span><button class="btn prim" data-promover="${p.id}" data-nome="${esc(p.nome)}" data-para="${p.para === 'Sub-21' ? 'o Sub-21' : 'a equipa principal'}">Promover</button></div>`).join('') : '<div class="rot">O gestor não sugere promoções por agora.</div>'}</section>`;
  }
  return cabAcademia(ui) + `<div class="grelha">${foto}<div class="s12 filtros"><div class="seg" role="group">${tabs.map((t) => `<button data-tabacad="${t}" class="${t === ui.tab ? 'on' : ''}">${t}</button>`).join('')}</div></div>${corpo}</div>`;
}

export function htmlScouting(v: VistaScouting, ui: UiAcademia, shortlist: LinhaMercado[]) {
  const foto = `<section class="c s12" style="padding:0;overflow:hidden;position:relative"><div style="position:relative;width:100%;aspect-ratio:1024/400;max-height:320px;overflow:hidden"><img src="./img/scouting.jpg" alt="Departamento de scouting" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></div><div style="position:absolute;left:16px;bottom:14px;background:rgba(11,13,16,.75);padding:8px 12px;border-radius:10px"><div class="num" style="font-size:22px">Departamento de scouting</div><div class="rot">Reunião semanal de relatórios · segunda-feira</div></div></section>`;
  const pais = v.paises.find((p) => p.codigo === ui.pais) ?? v.paises[0];
  const emCurso = new Set(v.missoes.filter((m) => m.estado === 'em curso').map((m) => m.pais));
  const livre = v.olheirosJovensLivres > 0;
  const mapa = `<div class="mapa-wrap"><svg class="mapa" viewBox="${ZOOM_MAPA[ui.zoom] ?? ZOOM_MAPA.Mundo}" role="img" aria-label="Mapa-mundo: países onde o olheiro de jovens pode ir">${MAPA_MUNDO.map(([n, d, cod]) => { const p = cod ? v.paises.find((x) => x.codigo === cod) : null; return p ? `<path d="${d}" class="pais-el ${p.codigo === ui.pais ? 'sel' : ''} ${emCurso.has(p.codigo) ? 'curso' : ''}" data-mpais="${p.codigo}" tabindex="0"><title>${esc(p.nome)} · ${fE(p.custoSemana)}/semana</title></path>` : `<path d="${d}" class="pais-no"><title>${esc(n)}: sem rede de scouting</title></path>`; }).join('')}</svg>
    <div class="mapa-zoom seg" role="group">${Object.keys(ZOOM_MAPA).map((z) => `<button data-zoom="${z}" class="${z === ui.zoom ? 'on' : ''}">${z}</button>`).join('')}</div>
    <div class="mapa-leg"><span><i class="el"></i>Elegível</span><span><i class="sl"></i>Escolhido</span><span><i class="cu"></i>Missão em curso</span></div></div>`;
  const ab = v.missoes.find((m) => m.id === ui.missao) ?? v.missoes.find((m) => m.estado !== 'em curso') ?? null;
  const ligasSel = ui.ligasScout ?? v.atribuicao.map((x) => x.id);
  return cabAcademia(ui) + `<div class="grelha">${foto}
    <section class="c s3"><h2>Nível do recrutamento</h2><div class="num grande">${v.recrutamento}<span class="muted" style="font-size:20px">/10</span></div><div class="rot">+${v.recrutamento * 10}% observações por semana</div><div class="rot" style="margin-top:6px">Sobe no ecrã das Infraestruturas.</div></section>
    <section class="c s9"><h2>Equipa de scouting</h2><div class="sc-grelha">${v.equipa.map((m) => `<div class="sc-membro"><span class="avatar avatar-ini" style="width:46px;height:46px;font-size:17px">${iniciais(m.nome)}</span><div class="sc-info"><div><b>${esc(m.nome)}</b> <span class="muted">· ${m.cargo} · ${m.idade} anos</span></div><div class="rot">nível ${m.nivel}</div>
      <div class="sc-atr">${m.atributos.map(([a, x]) => `<span class="chip ${x >= 15 ? 'bom' : x >= 10 ? '' : 'aviso'}">${a} <b>${x}</b></span>`).join('')}</div><div class="sc-tarefa">${m.tarefa ? `<span class="chip ${m.tarefa.startsWith('Em missão') ? 'aviso' : 'info'}">${esc(m.tarefa)}</span>` : '<span class="chip bom">Livre</span>'}</div></div></div>`).join('') || '<div class="rot">Sem olheiros. Contratam-se no ecrã do Staff (A4).</div>'}</div></section>
    <section class="c s12"><h2>Missões do olheiro de jovens <span class="rot" style="margin-left:8px;text-transform:none;letter-spacing:0">${v.olheirosJovens} olheiro(s) de jovens · cada um faz uma missão de cada vez</span></h2>
      <div class="missao-grelha">${mapa}
        <div class="missao-lado"><div class="pais-cartao"><div class="num" style="font-size:24px">${esc(pais.nome)}</div><div class="rot">${fE(pais.custoSemana)} por semana</div>
          <div style="margin-top:8px"><span class="rot">Perfil típico</span><div class="chips">${pais.perfil.map((x) => `<span class="chip info">${esc(x)}</span>`).join('')}</div><div class="rot" style="margin-top:4px">Tendência, não regra: aparecem jogadores de todo o tipo.</div></div></div>
          <div class="missao-form"><label>País<select id="mi-pais">${v.paises.map((x) => `<option value="${x.codigo}" ${x.codigo === pais.codigo ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>
            <label>Posição<select id="mi-pos">${v.posicoes.map((x) => `<option ${x === ui.posicao ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
            <label>Duração<select id="mi-sem">${v.duracoes.map((x) => `<option value="${x}" ${x === ui.semanas ? 'selected' : ''}>${x} semanas</option>`).join('')}</select></label>
            <div class="missao-custo"><span class="rot">Custo total</span><b>${fE(pais.custoSemana * ui.semanas)}</b></div>
            <button class="btn prim" data-missao-enviar="1" ${livre ? '' : 'disabled'}>${livre ? 'Enviar olheiro' : v.olheirosJovens ? 'Olheiros em missão' : 'Sem olheiros de jovens'}</button></div>
          <div class="rot">Mais semanas trazem mais nomes (2 a 10); um olheiro melhor dá intervalos mais estreitos.</div></div></div></section>
    <section class="c s5"><h2>Missões</h2>${v.missoes.map((m) => `<button class="missao ${ab && m.id === ab.id ? 'on' : ''}" data-missao="${m.id}"><b>${esc(m.paisNome)} · ${m.posicao}</b><small>${m.semanas} semanas · ${fE(m.custo)} · ${m.estado === 'em curso' ? `regressa a ${m.fim}` : `concluída a ${m.fim} · ${m.relatorio.length} nomes`}</small><span class="chip ${m.estado === 'em curso' ? 'aviso' : 'bom'}">${m.estado}</span></button>`).join('') || '<div class="rot">Ainda não enviaste nenhuma missão.</div>'}</section>
    <section class="c s7"><h2>Relatório${ab && ab.estado !== 'em curso' ? ` · ${esc(ab.paisNome)} · ${ab.posicao}` : ''}</h2>${ab && ab.estado !== 'em curso' ? `<div class="relj">${ab.relatorio.map((x) => `<div class="relj-l"><span class="avatar avatar-ini" style="width:40px;height:40px;font-size:15px">${iniciais(x.nome)}</span><div><b>${esc(x.nome)}</b>${x.destaque ? ` <span class="chip info">${esc(x.destaque)}</span>` : ''}<div class="rot">${x.pos} · ${x.nascimento} · ${x.altura} cm · ${x.peso} kg · ${esc(x.clube)}</div></div><div class="relj-n"><span>OVR <b>${x.ovr[0]}–${x.ovr[1]}</b></span><span>PT <b>${x.pt[0]}–${x.pt[1]}</b></span></div>${x.estado === 'disponivel' ? `<button class="btn" data-contratar-jovem="${x.id}" data-nome="${esc(x.nome)}" data-valor="${x.compensacao}">Contratar · ${fM(x.compensacao)}</button>` : `<span class="chip ${x.estado === 'contratado' ? 'bom' : ''}">${x.estado === 'contratado' ? 'contratado' : 'indisponível'}</span>`}</div>`).join('')}</div><div class="rot" style="margin-top:6px">Contratar um jovem paga a compensação de formação e leva-o para o Sub-18.</div>` : '<div class="rot">Escolhe uma missão concluída.</div>'}</section>
    <section class="c s6"><h2>Ligas a observar <span class="rot" style="margin-left:8px;text-transform:none;letter-spacing:0">${ligasSel.length}/${v.maxLigas}</span></h2>
      ${v.atribuicao.map((x) => `<div class="linha-kv"><span>${esc(x.nome)} <span class="muted">${esc(x.pais)}</span></span><span>familiaridade ${String(x.familiaridade).replace('.', ',')}</span></div>`).join('') || '<div class="rot">Os olheiros ainda não têm ligas atribuídas.</div>'}
      <label class="np-campo" style="padding:8px 0 0"><span>Mudar as ligas (a familiaridade com uma liga nova demora semanas a subir)</span><select data-ligas-scout="1" multiple size="6">${v.ligasDisponiveis.map((l) => `<option value="${l.id}" ${ligasSel.includes(l.id) ? 'selected' : ''}>${esc(l.pais)} · ${esc(l.nome)}</option>`).join('')}</select></label>
      <button class="btn prim" style="margin-top:8px" data-ligas-gravar="1">Atribuir</button></section>
    <section class="c s6"><h2>Shortlist</h2>${shortlist.length ? shortlist.map((x) => `<div class="linha-kv clic" data-jogador="${x.id}"><span><b>${esc(x.nome)}</b> <span class="muted">${x.pos} · ${x.idade} · ${esc(x.clube)}</span></span><span>${ovrN(x.ovr)} ${conh(x.conh)}</span></div>`).join('') : '<div class="rot">Vazia. Marca jogadores com ☆ no Mercado ou na ficha.</div>'}</section>
  </div>`;
}

// ---------------------------------------------------------------- Ficha de jogador (acções do mercado)

export function acoesJogador(m: { listado: boolean; shortlist: boolean; negociacao: number | null; clausula: number; livre: boolean; emprestavel: boolean } | null, id: string, meu: boolean, janelaAberta = true) {
  if (!m) return '';
  if (meu) return `<button class="btn" data-listar="${id}:${m.listado ? 0 : 1}">${m.listado ? 'Retirar da venda' : 'Pôr à venda'}</button>`;
  const neg = m.negociacao !== null ? `<button class="btn prim" data-neg-abrir="${m.negociacao}">Ver negociação</button>`
    : m.livre ? `<button class="btn prim" data-negociar="${id}:livre">Contratar (livre)</button>`
      : `<button class="btn prim" data-negociar="${id}:transferencia" ${janelaAberta ? '' : 'title="A janela está fechada"'}>Fazer oferta</button>${m.emprestavel ? `<button class="btn" data-negociar="${id}:emprestimo">Pedir empréstimo</button>` : ''}${m.clausula ? `<button class="btn" data-negociar="${id}:clausula">Pagar a cláusula (${fM(m.clausula)})</button>` : ''}`;
  return `<button class="btn" data-short="${id}:${m.shortlist ? 0 : 1}">${m.shortlist ? '★ Na shortlist' : '☆ Shortlist'}</button>${neg}`;
}
