// Ecrãs da Parte A2 (desenho do protótipo, dados reais do motor): Início, Plantel, Ficha do jogador e Táctica.
// Só HTML; os eventos são ligados em app.ts (delegação por atributos data-*).
import type { Resumo, Zona } from '../jogo/sessao.ts';
import type { VistaPlantel, VistaJogador, VistaTactica, LinhaJogador } from '../jogo/vistas.ts';
import type { Instrucoes } from '../config/tacticas.ts';
import { svg, escudo } from './icones.ts';
import { acoesJogador } from './ecrasA3.ts';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const fE = (v: number) => `€${Math.round(v).toLocaleString('pt-PT')}`;
export const fM = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1).replace('.', ',')} M€` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1000)} mil €` : `${Math.round(v)} €`);
const salTxt = (anual: number) => `${fE(Math.round(anual / 52 / 10) * 10)}/semana <span class="sal-ano">(${fE(anual)}/ano)</span>`;
const corOvr = (o: number) => (o >= 75 ? 'qa' : o >= 68 ? 'qb' : o >= 60 ? 'qc' : 'qd');
const nomeCurto = (n: string) => { const p = n.split(' '); return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : n; };
const estrelas = (a: number, b: number) => { const s = (x: number) => '★'.repeat(Math.floor(x)) + (x % 1 ? '½' : ''); return a === b ? s(a) : `${s(a)}–${s(b)}`; };
const potE = (p: number) => Math.max(0.5, Math.min(5, Math.round(((p - 40) / 12) * 2) / 2));
const v1 = (x: number) => x.toFixed(1).replace('.', ',');
const rosto = (svgTxt: string, t: number) => `<span class="rosto" style="width:${t}px;height:${Math.round(t * 1.2)}px">${svgTxt}</span>`;

// ---------------------------------------------------------------- Início

const NOME_ZONA: Record<string, string> = { ucl: 'Liga dos Campeões', uel: 'Liga Europa', uecl: 'Liga Conferência', cont: 'Competição continental', sobe: 'Subida', po_sobe: 'Play-off de subida', po_desce: 'Play-off de descida', desce: 'Descida' };
function zonaIcone(z: Zona) {
  if (!z) return '';
  if (z === 'ucl' || z === 'uel' || z === 'uecl' || z === 'cont') return `<i class="ci" style="background:var(--c-${z === 'cont' ? 'ucl' : z})" title="${NOME_ZONA[z]}">${svg('cont')}</i>`;
  if (z === 'sobe' || z === 'po_sobe') return `<svg viewBox="0 0 24 24" width="17" height="17" role="img" aria-label="${NOME_ZONA[z]}"><path d="M12 3l9 12h-6v6H9v-6H3z" fill="${z === 'sobe' ? 'var(--bom)' : '#9fd36a'}"/></svg>`;
  const cor = z === 'desce' ? 'var(--mau)' : '#f08a3c';
  return `<svg viewBox="0 0 24 24" width="17" height="17" role="img" aria-label="${NOME_ZONA[z]}"><path d="M12 2.5L22.5 21h-21z" fill="${cor}"/><path d="M12 9v5.5" stroke="#0b0d10" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.4" fill="#0b0d10"/></svg>`;
}

export function tabelaLiga(r: Resumo, completa: boolean) {
  const t = r.tabela, meu = t.findIndex((x) => x.meu);
  const idx = completa ? t.map((_, i) => i) : [...new Set([0, 1, 2, 3, 4, ...(meu > 4 ? [meu - 1, meu, meu + 1] : [5])])].filter((i) => i >= 0 && i < t.length).sort((a, b) => a - b);
  let html = '', ant = -1;
  for (const i of idx) {
    const x = t[i];
    if (i - ant > 1) html += '<tr><td colspan="8" class="muted" style="text-align:center;padding:2px">⋯</td></tr>';
    html += `<tr class="${x.meu ? 'meu' : ''}"><td class="r">${x.pos}</td><td class="zi">${zonaIcone(x.zona)}</td><td class="nome-tab"><span style="display:inline-flex;align-items:center;gap:8px;min-width:0">${escudo(x.cores, 18)}<b>${esc(x.clube)}</b></span></td><td class="r">${x.j}</td>${completa ? `<td class="r so-l">${x.v}</td><td class="r so-l">${x.e}</td><td class="r so-l">${x.d}</td>` : ''}<td class="r">${x.dg > 0 ? '+' : ''}${x.dg}</td><td class="r"><b class="num" style="font-size:17px">${x.pts}</b></td></tr>`;
    ant = i;
  }
  const zonas = [...new Set(t.map((x) => x.zona).filter(Boolean))];
  return `<div class="tab-wrap"><table class="tab-liga"><thead><tr><th class="r">#</th><th class="zi"></th><th>Clube</th><th class="r">J</th>${completa ? '<th class="r so-l">V</th><th class="r so-l">E</th><th class="r so-l">D</th>' : ''}<th class="r">DG</th><th class="r">Pts</th></tr></thead><tbody>${html}</tbody></table></div>
    ${zonas.length ? `<div class="legenda">${zonas.map((z) => `<span>${zonaIcone(z)} ${NOME_ZONA[z]}</span>`).join('')}</div>` : ''}`;
}

const forma = (f: string[]) => `<span class="forma">${f.length ? f.map((x) => `<i class="${x}">${x}</i>`).join('') : '<span class="muted" style="font-size:12px">sem jogos</span>'}</span>`;
const OBJECTIVO: Record<string, string> = { título: 'Ser campeão', 'competições europeias': 'Apurar para as competições europeias', 'metade de cima': 'Acabar na metade de cima da tabela', manutenção: 'Garantir a manutenção', subida: 'Subir de divisão' };

export function htmlInicio(r: Resumo) {
  const p = r.proximo, f = r.financas;
  const fp = f?.fairPlay ?? null;
  const massaPct = f && f.orcSalarios > 0 ? Math.round((f.massa / f.orcSalarios) * 100) : null;
  const corEstado = f?.estado === 'Crise' ? 'var(--mau)' : f?.estado === 'Apertada' ? 'var(--aviso)' : 'var(--bom)';
  const destaque = (t: string, k: keyof Resumo['destaques'], u: string) => `<section class="c s4"><h2>${t}</h2>${r.destaques[k].map((x, i) => `<div class="linha-kv clic" data-jogador="${x.jogador}"><span><span class="muted" style="display:inline-block;width:18px">${i + 1}</span><b>${esc(x.nome)}</b> <span class="muted">${x.pos}</span></span><span class="num" style="font-size:18px">${x.v} <span class="muted" style="font-size:12px;font-family:var(--f-texto)">${u}</span></span></div>`).join('')}</section>`;
  const chip = { contrato: 'aviso', lesao: 'mau', treinador: 'info', sugestao: 'info' } as const;
  const rotTarefa = { contrato: 'Contrato', lesao: 'Lesão', treinador: 'Treinador', sugestao: 'Táctica' } as const;
  return `<div class="topo"><h1>Início</h1><span class="sub">${esc(r.clube.nome)} · ${esc(r.clube.ligaNome)}</span></div>
  <div class="grelha">
    <section class="c s8"><h2>Próximo jogo</h2>${p ? `<div class="proximo">
        <div class="equipa">${escudo(r.clube.cores, 52)}<b>${esc(r.clube.nome)}</b>${forma(p.formaMeu)}</div>
        <div class="vs"><div class="rot">${esc(p.comp)}</div><div class="num grande">${p.emCasa ? 'Casa' : 'Fora'}</div><div class="rot">${p.data}</div><div class="chip aviso" style="margin-top:8px">${p.dias <= 0 ? 'esta semana' : `${p.dias} dia${p.dias === 1 ? '' : 's'}`}</div></div>
        <div class="equipa">${escudo(p.coresAdv, 52)}<b>${esc(p.adversario)}</b>${forma(p.formaAdv)}</div></div>` : '<div class="rot">Sem jogos marcados nas próximas semanas (pré-época).</div>'}</section>
    <section class="c s4"><h2>Objectivo da época</h2><div class="num" style="font-size:26px;line-height:1.1">${esc(OBJECTIVO[r.objectivo] ?? r.objectivo ?? '—')}</div><div class="rot" style="margin-top:6px">Definido pelo dono do clube.</div>
      <div class="linha-kv" style="margin-top:10px"><span class="muted">Posição actual</span><b>${r.posicao ?? '–'}.º</b></div><div class="linha-kv"><span class="muted">Reputação</span><b>${r.clube.reputacao}</b></div></section>
    <section class="c s7"><h2>${esc(r.clube.ligaNome)}<span class="acao" data-ir="classificacao">Ver tabela completa</span></h2>${tabelaLiga(r, false)}</section>
    <section class="c s5"><h2>Estado financeiro</h2>${f ? `
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="num grande" style="color:${corEstado}">${f.estado}</span>${fp !== null ? `<span class="chip ${fp >= 100 ? 'mau' : fp >= 85 ? 'aviso' : ''}"><span class="pt"></span>Fair play: ${fp}% do limite</span>` : ''}</div>
      <div class="linha-kv" style="margin-top:10px"><span class="muted">Caixa</span><b>${fM(f.caixa)}</b></div>
      <div class="linha-kv"><span class="muted">Orçamento de transferências</span><b>${fM(f.transferencias)}</b></div>
      <div class="linha-kv" style="display:block"><div style="display:flex;justify-content:space-between"><span class="muted">Massa salarial</span><span><b>${fM(f.massa)}</b> <span class="muted">de ${fM(f.orcSalarios)}</span></span></div>${massaPct !== null ? `<div class="barra" style="margin-top:6px"><i style="width:${Math.min(100, massaPct)}%;background:${massaPct > 100 ? 'var(--mau)' : massaPct > 90 ? 'var(--aviso)' : 'var(--bom)'}"></i></div>` : ''}</div>
      <div class="linha-kv"><span class="muted">Dívida</span><span>${fM(f.divida)} ${f.receita > 0 ? `<span class="muted">(${v1(f.divida / f.receita)}× a receita)</span>` : ''}</span></div>` : '<div class="rot">Sem dados.</div>'}</section>
    ${destaque('Mais jogos', 'jogos', 'jogos')}${destaque('Melhores marcadores', 'golos', 'golos')}${destaque('Mais assistências', 'assist', 'assist.')}
    <section class="c s6"><h2>Tarefas pendentes</h2>${r.tarefas.length ? r.tarefas.slice(0, 7).map((t) => `<div class="linha-kv ${t.jogador ? 'clic' : ''}" ${t.jogador ? `data-jogador="${t.jogador}"` : t.tipo === 'treinador' || t.tipo === 'sugestao' ? 'data-ir="tactica"' : ''}><span><span class="chip ${chip[t.tipo]}"><span class="pt"></span>${rotTarefa[t.tipo]}</span> ${esc(t.texto)}</span><span class="muted">${esc(t.detalhe)}</span></div>`).join('') : '<div class="rot">Nada pendente.</div>'}</section>
    <section class="c s6"><h2>Últimos resultados</h2>${r.ultimos.length ? r.ultimos.map((x) => `<div class="jogo-l"><span class="muted">${x.data}</span><span><b>${esc(x.casa)}</b> – <b>${esc(x.fora)}</b><div class="rot">${esc(x.comp)}</div></span><span><b class="num" style="font-size:18px">${x.emCasa ? `${x.gc}-${x.gf}` : `${x.gf}-${x.gc}`}</b> <span class="res ${x.resultado}">${x.resultado}</span></span></div>`).join('') : '<div class="rot">A época ainda não começou para o clube.</div>'}
      <div class="rot" style="margin-top:8px">As notícias chegam com o motor de imprensa (Bloco C).</div></section>
  </div>`;
}

// ---------------------------------------------------------------- Plantel

export interface UiPlantel { tab: 'principal' | 'tactica' | 'sub21' | 'sub18'; filtro: string; pesquisa: string }
const GRUPOS: Record<string, (p: LinhaJogador) => boolean> = {
  Todos: () => true, GR: (p) => p.pos === 'GR', Defesas: (p) => ['DC', 'DD', 'DE', 'ALD', 'ALE'].includes(p.pos), Médios: (p) => ['MDC', 'MC', 'MO'].includes(p.pos), Avançados: (p) => ['ED', 'EE', 'PL'].includes(p.pos),
};

export function cabecalhoPlantel(n: { principal: number; sub21: number; sub18: number }, ui: UiPlantel) {
  const tabs: [UiPlantel['tab'], string][] = [['principal', 'Equipa principal'], ['tactica', 'Táctica'], ['sub21', `Sub-21 (${n.sub21})`], ['sub18', `Sub-18 (${n.sub18})`]];
  return `<section class="banner-mercado banner-plantel"><img src="./img/plantel.jpg" alt=""><div class="bm-topo"><h1>Plantel</h1><span>${n.principal} na equipa principal · ${n.sub21} no Sub-21 · ${n.sub18} no Sub-18</span></div></section>
    <div class="filtros"><div class="seg" role="group" aria-label="Secções do plantel">${tabs.map(([k, t]) => `<button data-tabp="${k}" class="${k === ui.tab ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
}

const estadoChip = (p: LinhaJogador) => (p.estado === 'lesionado' ? `<span class="chip mau">${esc(p.estadoTexto)}</span>` : p.estado === 'suspenso' ? `<span class="chip aviso">${esc(p.estadoTexto)}</span>` : '<span class="chip bom">Apto</span>');

export function htmlPlantel(v: VistaPlantel, ui: UiPlantel) {
  const n = { principal: v.principal.length, sub21: v.sub21.length, sub18: v.sub18.length };
  const cab = cabecalhoPlantel(n, ui);
  if (ui.tab === 'sub21' || ui.tab === 'sub18') {
    const lista = ui.tab === 'sub21' ? v.sub21 : v.sub18;
    return `${cab}<section class="c"><h2>${ui.tab === 'sub21' ? 'Sub-21 · 19 a 21 anos' : 'Sub-18 · 15 a 18 anos'} · máximo ${v.maxSub}</h2><div class="tab-wrap"><table><thead><tr><th>Nome</th><th>Pos.</th><th class="r">Idade</th><th class="r">OVR</th><th>Potencial</th><th class="r">Evolução</th><th class="r">J</th><th class="r">G</th><th>Conselho do gestor</th><th class="r">Gerir</th></tr></thead><tbody>
      ${lista.map((p) => { const pt = p.potencial ?? [p.ovr, p.ovr]; const c = p.conselho ?? ''; return `<tr class="clic" data-jogador="${p.id}"><td><span class="nome-av">${rosto(p.rosto, 28)}<b>${esc(p.nome)}</b></span></td><td>${p.pos}</td><td class="r">${p.idade}</td><td class="r"><span class="ovr ${corOvr(p.ovr)}">${p.ovr}</span></td><td class="estrelas" style="font-size:13px" title="Potencial estimado ${pt[0]}–${pt[1]}">${estrelas(potE(pt[0]), potE(pt[1]))}</td><td class="r" style="color:${(p.evolucao ?? 0) > 0 ? 'var(--bom)' : 'var(--suave)'}">${(p.evolucao ?? 0) > 0 ? '+' : ''}${p.evolucao ?? 0}</td><td class="r">${p.jogos}</td><td class="r">${p.golos}</td><td>${c ? `<span class="chip ${c.startsWith('Promover') ? 'bom' : c === 'Libertar' ? 'mau' : ''}">${c}</span>` : ''}</td><td class="r"><button class="btn" data-promover="${p.id}" data-nome="${esc(p.nome)}" data-para="${ui.tab === 'sub21' ? 'a equipa principal' : 'o Sub-21'}">↑ ${ui.tab === 'sub21' ? 'Principal' : 'Sub-21'}</button></td></tr>`; }).join('') || '<tr><td colspan="10" class="muted">Sem jogadores.</td></tr>'}</tbody></table></div>
      <div class="rot" style="margin-top:8px">Libertar, emprestar e o relatório de intake chegam com a Academia (A3).</div></section>`;
  }
  const lista = v.principal.filter(GRUPOS[ui.filtro] ?? (() => true)).filter((p) => p.nome.toLowerCase().includes(ui.pesquisa.toLowerCase()));
  return `${cab}<div class="filtros"><input id="f-pesq" type="search" placeholder="Pesquisar no plantel…" value="${esc(ui.pesquisa)}" aria-label="Pesquisar no plantel"><div class="seg" role="group" aria-label="Posição">${Object.keys(GRUPOS).map((g) => `<button data-filtro="${g}" class="${g === ui.filtro ? 'on' : ''}">${g}</button>`).join('')}</div></div>
  <section class="c"><div class="tab-wrap"><table>
    <thead><tr><th>Nome</th><th>Pos.</th><th class="r">Idade</th><th class="r">OVR</th><th class="r">J</th><th class="r">G</th><th class="r">A</th><th class="r">Cartões</th><th>Melhor papel</th><th class="r">Adeq.</th><th class="r">Moral</th><th>Forma</th><th class="r">Condição</th><th class="r">Contrato</th><th class="r">Salário</th><th>Estado</th></tr></thead>
    <tbody>${lista.map((p) => `<tr class="clic" data-jogador="${p.id}"><td><span class="nome-av">${rosto(p.rosto, 28)}<b>${esc(p.nome)}</b></span></td><td>${p.pos}</td><td class="r">${p.idade}</td><td class="r"><span class="ovr ${corOvr(p.ovr)}">${p.ovr}</span></td><td class="r">${p.jogos}</td><td class="r">${p.golos}</td><td class="r">${p.assist}</td><td class="r">${p.amarelos ? `<span style="color:var(--c-uel)">▮</span>${p.amarelos}` : '0'}${p.vermelhos ? ` <span style="color:var(--mau)">▮</span>${p.vermelhos}` : ''}</td><td class="muted">${esc(p.papel)}</td><td class="r">${p.adequacao}</td><td class="r">${p.moral}</td><td>${p.forma.length ? p.forma.slice(-3).map(v1).join(' · ') : '<span class="muted">—</span>'}</td><td class="r">${p.condicao}%</td><td class="r">${p.fimContrato ?? '—'}</td><td class="r sal">${salTxt(p.salario)}</td><td>${estadoChip(p)}</td></tr>`).join('') || '<tr><td colspan="16" class="muted">Nenhum jogador.</td></tr>'}</tbody>
  </table></div></section>`;
}

// ---------------------------------------------------------------- Jogador

const POS_CAMPO: Record<string, [number, number]> = { GR: [6, 50], DC: [24, 50], DD: [28, 84], DE: [28, 16], ALD: [44, 88], ALE: [44, 12], MDC: [42, 50], MC: [54, 50], MO: [66, 50], ED: [74, 84], EE: [74, 16], PL: [86, 50] };

export function htmlJogador(v: VistaJogador) {
  const p = v.linha;
  const partes = p.nome.split(' ');
  const ovrCor = p.ovr >= 75 ? '#57c26a' : p.ovr >= 68 ? '#d7e04a' : p.ovr >= 60 ? '#f2c230' : '#f08a3c';
  const moral = p.moral >= 15 ? 'Muito boa' : p.moral >= 11 ? 'Boa' : p.moral >= 7 ? 'Normal' : 'Má';
  const campo = `<svg viewBox="0 0 100 64" width="160" role="img" aria-label="Posições"><rect width="100" height="64" rx="3" fill="#2f8a4a"/><g stroke="rgba(255,255,255,.7)" fill="none" stroke-width=".8"><rect x="2" y="2" width="96" height="60"/><path d="M50 2V62"/><circle cx="50" cy="32" r="8"/><rect x="2" y="18" width="12" height="28"/><rect x="86" y="18" width="12" height="28"/></g>${[...v.posicoes].reverse().map((x) => { const [cx, cy] = POS_CAMPO[x.pos] ?? [50, 50]; return `<circle cx="${cx}" cy="${cy * 0.64}" r="${x.nivel === 'natural' ? 4 : 3.4}" fill="${x.nivel === 'natural' ? '#57c26a' : x.nivel === 'competente' ? '#f2c230' : '#f08a3c'}" stroke="#fff"><title>${x.nome}</title></circle>`; }).join('')}</svg>`;
  const est = (rot: string, val: string | number) => `<div class="hj-est"><span>${rot}</span><b>${val}</b></div>`;
  const cel = (a: { nome: string; v: number; int?: [number, number] }) => `<span>${a.nome}</span><span class="v ${a.int ? '' : a.v >= 16 ? 'v20' : a.v >= 13 ? 'v15' : a.v >= 9 ? 'v10' : 'v5'}">${a.int ? (a.int[0] === a.int[1] ? a.int[0] : `<span class="intervalo">${a.int[0]}–${a.int[1]}</span>`) : a.v}</span>`;
  const sc = v.scouting;
  const ovrTxt = sc && sc.ovr[0] !== sc.ovr[1] ? `${sc.ovr[0]}–${sc.ovr[1]}` : `${p.ovr}`;
  return `<div class="topo"><h1>Ficha do jogador</h1>${sc ? `<span class="sub">Conhecimento do scouting: <span class="chip ${sc.conhecimento >= 80 ? 'bom' : sc.conhecimento >= 50 ? 'aviso' : 'mau'}">${sc.conhecimento}%</span>${sc.vies ? ` · o olheiro ${esc(sc.vies)}` : ''}</span>` : ''}<div class="direita" style="display:flex;gap:8px;flex-wrap:wrap">${acoesJogador(v.mercado, p.id, v.meu)}<button class="btn" data-voltar="1">‹ Voltar</button></div></div>
  <div class="grelha">
    <section class="c s12 hero-jog">
      <div class="hj-cab"><div class="hj-nome"><b>${esc(partes.length > 1 ? `${partes[0][0]}. ${partes[partes.length - 1].toUpperCase()}` : p.nome.toUpperCase())}</b><span>${esc(p.nome)} · ${esc(v.pais)} · ${v.peso} kg · ${v.altura} cm · ${p.idade} anos</span></div><span class="hj-pos">${p.pos}</span>
        <span class="hj-pe" title="Pé preferido: ${v.pe}">${v.pe[0]}</span><span class="hj-moral" title="Moral ${p.moral}/20">${p.moral}</span><span class="hj-ovr" style="background:${ovrCor}${sc ? ';font-size:22px' : ''}">${ovrTxt}</span></div>
      <div class="hj-corpo">
        <div class="hj-avatar">${rosto(p.rosto, 220)}</div>
        <div class="hj-lado">
          <div class="hj-cartao">${escudo(v.cores, 34)}<b>${esc(v.clube)}</b>
            <div class="hj-l"><span>Salário</span><b>${salTxt(p.salario)}</b></div><div class="hj-l"><span>Valor de mercado</span><b>${v.valor !== null ? fE(v.valor) : '—'}</b></div>
            <div class="hj-contrato">${p.fimContrato ? `Com contrato · até 30/06/${p.fimContrato}` : p.escalao !== 'principal' ? 'Jogador da formação' : 'Sem contrato'}</div></div>
          <div class="hj-cartao hj-cam">${campo}<div class="legenda" style="justify-content:center"><span><i class="pt-cor" style="background:#57c26a"></i>Natural</span><span><i class="pt-cor" style="background:#f2c230"></i>Competente</span><span><i class="pt-cor" style="background:#f08a3c"></i>A aprender</span></div></div>
        </div>
      </div>
      <div class="hj-epoca"><div class="hj-tit">Época</div>
        <div class="hj-grelha">${est('Jogos', p.jogos)}${est('Titular', p.titular)}${est('Minutos', v.minutos)}${est('Golos', p.golos)}${est('Assist.', p.assist)}${est('Amarelos', p.amarelos)}${est('Vermelhos', p.vermelhos)}${est('Nota média', v.notaMedia !== null ? v1(v.notaMedia) : '—')}</div>
        <div class="hj-pot"><span>Potencial estimado</span><b class="hj-p1">${v.potencial[0]}</b><span class="hj-sep">◆</span><b class="hj-p2">${v.potencial[1]}</b></div>
      </div>
    </section>
    ${v.grupos.map((g) => `<section class="c s${v.grupos.length === 4 ? 3 : 4}"><h2>${g.nome}</h2><div class="atrib">${g.atributos.map(cel).join('')}</div></section>`).join('')}
    ${sc ? '' : `<section class="c s6"><h2>Adequação aos papéis (1–20)</h2><div class="papeis">${v.papeis.map((r) => `<div class="papel"><span>${esc(r.nome)}</span><div class="barra"><i style="width:${r.v * 5}%"></i></div><b class="num" style="font-size:17px;text-align:right">${r.v}</b></div>`).join('')}</div>
      <div class="rot" style="margin-top:10px">Posições: ${v.posicoes.map((x) => `${x.nome} (${x.nivel === 'natural' ? 'natural' : x.nivel === 'competente' ? 'competente' : 'a aprender'})`).join(', ')}</div></section>`}
    <section class="c s3"><h2>Estado</h2>
      <div class="linha-kv"><span class="muted">Moral</span><span>${moral} (${p.moral}/20)</span></div>
      <div class="linha-kv"><span class="muted">Condição</span><span>${p.condicao}%</span></div>
      <div class="linha-kv"><span class="muted">Forma (últimos jogos)</span><span>${p.forma.length ? p.forma.map(v1).join(' ') : '—'}</span></div>
      <div class="linha-kv"><span class="muted">Disponibilidade</span><span>${estadoChip(p)}</span></div>
      <div class="linha-kv"><span class="muted">Lesões na época</span><span>${v.lesoesEpoca}</span></div></section>
    <section class="c s3"><h2>Contrato</h2>
      <div class="linha-kv"><span class="muted">Salário</span><span>${fM(p.salario)}/ano</span></div>
      <div class="linha-kv"><span class="muted">Fim</span><span>${p.fimContrato ? `30 Jun ${p.fimContrato}` : '—'}</span></div>
      <div class="linha-kv"><span class="muted">Escalão</span><span>${{ principal: 'Equipa principal', sub21: 'Sub-21', sub18: 'Sub-18' }[p.escalao]}</span></div>
      <div class="linha-kv"><span class="muted">Melhor papel</span><span>${esc(p.papel)}</span></div>
      <div class="rot" style="margin-top:8px">${v.meu ? 'Renovações chegam no Escritório (A4).' : sc ? `Informação do scouting${sc.scout ? ` (${esc(sc.scout)})` : ''}: os intervalos estreitam com as observações.` : ''}</div></section>
  </div>`;
}

// ---------------------------------------------------------------- Táctica

export interface Rascunho { estilo: string | null; formacao: string; instrucoes: Instrucoes; onze: (string | null)[] | null; trocas: Record<number, string> }
const ESCALA: Record<keyof Instrucoes, [number, string][]> = {
  mentalidade: [[-2, 'Muito def.'], [-1, 'Defensiva'], [0, 'Equilibrada'], [1, 'Ofensiva'], [2, 'Muito ofen.']],
  pressao: [[-1, 'Baixa'], [0, 'Média'], [1, 'Alta']], linha: [[-1, 'Recuada'], [0, 'Normal'], [1, 'Subida']],
  largura: [[-1, 'Estreita'], [0, 'Normal'], [1, 'Larga']], ritmo: [[-1, 'Lento'], [0, 'Normal'], [1, 'Rápido']], passe: [[-1, 'Curto'], [0, 'Misto'], [1, 'Directo']],
};
const NOME_INSTR: Record<keyof Instrucoes, string> = { mentalidade: 'Mentalidade', pressao: 'Pressão', linha: 'Linha defensiva', largura: 'Largura', ritmo: 'Ritmo', passe: 'Passe' };
const LINHA_POS: Record<string, string> = { GR: 'gr', DC: 'def', DD: 'def', DE: 'def', ALD: 'med', ALE: 'med', MDC: 'med', MC: 'med', MO: 'med', ED: 'ata', EE: 'ata', PL: 'ata' };
const DECISAO: Record<string, string> = { aceita: 'aceitou', parcial: 'aceitou em parte', ignora: 'ignorou' };

export function htmlTactica(v: VistaTactica, r: Rascunho, n: { principal: number; sub21: number; sub18: number }) {
  const t = v.treinador;
  const est = v.estilos.find((e) => e.id === r.estilo) ?? v.estilos.find((e) => e.id === t.estilo) ?? null;
  const formacoes = est ? [...new Set([...est.esquemas, ...t.formacoes])] : t.formacoes;
  const ad = est?.adequacao ?? 0;
  const pendente = v.sugestaoPendente;
  return `${cabecalhoPlantel(n, { tab: 'tactica', filtro: '', pesquisa: '' })}
  <div class="est-esc">${v.estilos.map((e) => `<button class="est-b ${e.id === est?.id ? 'on' : ''}" data-estilo="${e.id}" title="${esc(e.ideia)}">${esc(e.nome)}${e.id === t.estilo ? ' ★' : ''}</button>`).join('')}</div>
  ${est ? `<div class="est-info"><div><span class="rot">Ideia</span><b>${esc(est.ideia)}</b></div><div><span class="rot">Valoriza</span><b>${esc(est.valoriza)}</b></div><div><span class="rot">Risco</span><b>${esc(est.risco)}</b></div><div><span class="rot">Adequação do plantel</span><b class="${ad < 0 ? 'mau-t' : 'bom-t'}">${ad > 0 ? '+' : ''}${v1(ad)}%</b></div></div>` : ''}
  <div class="filtros"><div class="seg" role="group" aria-label="Esquema">${formacoes.map((f) => `<button data-form="${f}" class="${f === r.formacao ? 'on' : ''}">${f}</button>`).join('')}</div>
    <span class="muted">Treinador: ${esc(t.nome)}${t.idade ? ` (${t.idade})` : ''} · estilo preferido: ${esc(t.estiloNome)} (${t.formacoes[0]}) ★</span></div>
  <div class="grelha">
    <section class="c s8">
      <div class="notas-eq">${([['Plantel', v.notas.plantel], ['Onze', v.notas.onze], ['Profundidade', v.notas.profundidade]] as [string, number][]).map(([x, val]) => `<div class="nota-eq ${corOvr(val)}"><b class="num">${val}</b><span>${x}</span></div>`).join('')}<div class="dinamica"><span class="rot">Dinâmica do grupo</span><b class="${v.dinamica === 'Positiva' ? 'pos' : v.dinamica === 'Negativa' ? 'neg' : ''}">${v.dinamica}</b></div></div>
      <div class="dep">${v.caixas.map((cx, k) => {
        const troca = r.trocas[k];
        const js = troca ? [...cx.jogadores].sort((a, b) => (b.id === troca ? 1 : 0) - (a.id === troca ? 1 : 0)) : cx.jogadores;
        return `<div class="dcx ${LINHA_POS[cx.pos]} ${cx.x < 12 || cx.x > 88 ? 'lado' : ''}" style="left:${cx.x}%;top:${cx.y}%"><div class="dcx-cab">${cx.pos}</div>${js.map((p, i) => `<div class="dl ${i === 0 ? 'tit' : ''} ${p.lesionado ? 'les' : ''} ${troca && i === 0 ? 'sug' : ''}" ${i > 0 ? `data-titular="${k}:${p.id}" title="Sugerir ${esc(p.nome)} como titular"` : `data-jogador="${p.id}"`}><span class="dn">${esc(nomeCurto(p.nome))} <span class="di">(${p.idade})</span>${p.pos !== cx.pos ? `<span class="dp">${p.pos}</span>` : ''}</span><span class="dv ${corOvr(p.ovr)}">${p.ovr}</span></div>`).join('') || '<div class="dl"><span class="dn muted">— vazio —</span></div>'}</div>`;
      }).join('')}<span class="dep-form">${v.formacao}</span></div>
      <div class="rot" style="margin-top:10px">Toca num suplente para o sugerires como titular. ${v.fora.length ? `Fora das escolhas: ${esc(v.fora.join(', '))}` : ''}</div></section>
    <section class="c s4"><h2>Instruções de equipa</h2>
      <div class="instr">${(Object.keys(ESCALA) as (keyof Instrucoes)[]).map((k) => `<label>${NOME_INSTR[k]}<div class="seg seg-peq" role="group" aria-label="${NOME_INSTR[k]}">${ESCALA[k].map(([val, txt]) => `<button data-instr="${k}:${val}" class="${(r.instrucoes[k] ?? 0) === val ? 'on' : ''}">${txt}</button>`).join('')}</div></label>`).join('')}</div>
      <div class="rot" style="margin:16px 0 10px">Como Presidente não escolhes o onze: o treinador decide. Podes sugerir; ele aceita, aceita em parte ou ignora, conforme a autoridade dele e a vossa relação. Cada sugestão gasta capital junto dele.</div>
      ${v.relacao ? `<div class="linha-kv"><span class="muted">Relação com o treinador</span><b>${v.relacao.nivel}</b></div><div class="linha-kv"><span class="muted">Capital junto do treinador</span><span>${v.relacao.capital}/100</span></div><div class="linha-kv"><span class="muted">Autoridade no balneário</span><span>${v.relacao.autoridade}/100</span></div><div class="linha-kv"><span class="muted">Conflito</span><span>${v.relacao.conflito}/100</span></div>` : ''}
      ${v.ultimaDecisao ? `<div class="rot" style="margin-top:8px">Última sugestão: o treinador ${DECISAO[v.ultimaDecisao.decisao]} (${v.ultimaDecisao.aplicadas} de ${v.ultimaDecisao.pedidas} alterações).</div>` : ''}
      ${pendente ? '<div class="chip info" style="margin-top:10px"><span class="pt"></span>Sugestão enviada: o treinador decide no próximo jogo</div>' : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" data-repor="1">Repor o plano do treinador</button>${pendente ? '<button class="btn" data-cancelar="1">Retirar sugestão</button>' : ''}<button class="btn prim" data-enviar="1">Enviar sugestão</button></div>
    </section>
  </div>`;
}
