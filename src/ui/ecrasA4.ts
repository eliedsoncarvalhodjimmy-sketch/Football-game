// Ecrãs da Parte A4 (desenho do protótipo, dados reais do motor): Staff, Finanças e Conselho, Infraestruturas,
// Competições e Escritório. Só HTML; os eventos são ligados em eventosA4.ts.
import type { VistaStaff, VistaFinancas, VistaInfra, VistaCompeticoes, VistaEscritorio } from '../jogo/vistasA4.ts';
import { esc, fE, fM } from './ecras.ts';
import { svg, escudo } from './icones.ts';

const corN = (v: number) => (v >= 15 ? 'qa' : v >= 13 ? 'qb' : v >= 11 ? 'qc' : 'qd');
const iniciais = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const av = (n: string, t = 28) => `<span class="avatar avatar-ini" style="width:${t}px;height:${t}px;font-size:${Math.round(t * 0.4)}px">${iniciais(n)}</span>`;
const atrs = (l: [string, number][]) => `<div class="st-atrs">${l.map(([a, x]) => `<span class="st-a"><span>${esc(a)}</span><b class="${corN(x)}-t">${x}</b></span>`).join('')}</div>`;

// ---------------------------------------------------------------- Staff

export interface UiStaff { cargo: string; trocarTreinador: boolean; motivo: 'mutuo_acordo' | 'resultados' }

export function htmlStaff(v: VistaStaff, ui: UiStaff) {
  const t = v.treinador;
  const linha = (m: VistaStaff['departamentos'][number]['membros'][number]) => `<tr><td class="muted">${esc(m.cargo)}${m.extra ? `<div class="rot">${esc(m.extra)}</div>` : ''}</td><td><span class="nome-av">${av(m.nome)}<b>${esc(m.nome)}</b></span></td><td class="r">${m.idade}</td><td class="r"><span class="ovr ${corN(m.nivel)}">${m.nivel}</span></td><td>${atrs(m.atributos)}</td><td class="r">${fM(m.salario)}/ano</td><td class="r">${m.fim}</td><td class="r"><button class="btn" data-despedir-staff="${m.id}" data-nome="${esc(m.nome)}" data-custo="${m.indemnizacao}">Despedir</button></td></tr>`;
  const cargos = Object.keys(v.vagas);
  const nomeCargo = (id: string) => v.livres.find((x) => x.cargoId === id)?.cargo ?? v.departamentos.flatMap((d) => d.membros).find((x) => x.cargoId === id)?.cargo ?? id;
  const livres = ui.cargo ? v.livres.filter((m) => m.cargoId === ui.cargo) : [];
  return `<div class="topo"><h1>Staff</h1><span class="sub">custo anual ${fM(v.custo)} (orçamento ${fM(v.orcamento)})</span></div>
  <div class="grelha">
    <section class="c s12"><h2>Treinador principal</h2>
      <div class="linha-kv" style="align-items:flex-start;gap:14px;flex-wrap:wrap"><span class="nome-av">${av(t.nome, 46)}<span><b style="font-size:18px">${esc(t.nome)}</b><div class="rot">${t.idade} anos · reputação ${t.reputacao} · ${esc(t.estilo)} · ${t.formacoes.slice(0, 3).join(', ')}</div><div class="rot">${fM(t.salario)}/ano até ${t.fim} · moral ${t.moral}/100 · confiança do conselho ${t.confianca}/100</div></span></span>
        <span style="margin-left:auto;display:flex;gap:8px"><button class="btn" data-trocar-treinador="1">${ui.trocarTreinador ? 'Fechar' : 'Despedir / trocar de treinador'}</button></span></div>
      ${atrs(t.atributos)}
      ${ui.trocarTreinador ? `<div class="troca-tr"><div class="filtros"><div class="seg" role="group" aria-label="Motivo">${([['mutuo_acordo', 'Mútuo acordo'], ['resultados', 'Por resultados']] as const).map(([k, n]) => `<button data-motivo="${k}" class="${k === ui.motivo ? 'on' : ''}">${n}</button>`).join('')}</div>
        <span class="muted">Indemnização: ${ui.motivo === 'resultados' ? 'o que falta do contrato' : 'parte do que falta do contrato'} (até ${fM(t.indemnizacao)}); despedir por resultados estraga a imagem do clube junto dos treinadores.</span></div>
        <div class="tab-wrap"><table><thead><tr><th>Treinador livre</th><th class="r">Idade</th><th class="r">Reputação</th><th>Estilo</th><th>Atributos</th><th class="r">Salário</th><th class="r">Aceita</th><th class="r"></th></tr></thead><tbody>${v.treinadoresLivres.map((x) => `<tr><td><b>${esc(x.nome)}</b></td><td class="r">${x.idade}</td><td class="r">${x.reputacao}</td><td>${esc(x.estilo)} · ${x.formacao}</td><td>${atrs(x.atributos)}</td><td class="r">${fM(x.salario)}/ano</td><td class="r"><span class="chip ${x.aceita >= 50 ? 'bom' : 'mau'}">${x.aceita}%</span></td><td class="r"><button class="btn ${x.aceita >= 50 ? 'prim' : ''}" data-contratar-tr="${x.id}" data-nome="${esc(x.nome)}" ${x.aceita >= 50 ? '' : 'disabled title="Não aceita vir"'}>Contratar</button></td></tr>`).join('')}</tbody></table></div></div>` : ''}
    </section>
    ${v.departamentos.map((d) => `<section class="c s12 staff-grupo"><h2>${esc(d.nome)}<span class="chip" style="margin-left:8px">${d.membros.length}</span><span class="rot" style="margin-left:10px;text-transform:none;letter-spacing:0;font-weight:400">${esc(d.sub)}</span></h2>${d.membros.length ? `<div class="tab-wrap"><table><thead><tr><th>Cargo</th><th>Nome</th><th class="r">Idade</th><th class="r">Nível</th><th>Atributos (1–20)</th><th class="r">Salário</th><th class="r">Contrato</th><th></th></tr></thead><tbody>${d.membros.map(linha).join('')}</tbody></table></div>` : '<div class="rot">Ninguém neste departamento.</div>'}</section>`).join('')}
    <section class="c s12"><h2>Contratar staff</h2>
      <div class="filtros"><select data-cargo-staff="1" aria-label="Cargo"><option value="">Escolhe o cargo…</option>${cargos.map((k) => `<option value="${k}" ${k === ui.cargo ? 'selected' : ''}>${esc(nomeCargo(k))} (${v.vagas[k].tem}/${v.vagas[k].max})</option>`).join('')}</select><span class="muted">Os 8 melhores livres de cada cargo. Num cargo cheio, despede primeiro.</span></div>
      <div class="tab-wrap"><table><thead><tr><th>Cargo</th><th>Nome</th><th class="r">Idade</th><th class="r">Nível</th><th>Atributos</th><th class="r">Salário pedido</th><th class="r"></th></tr></thead><tbody>${livres.map((m) => { const cheio = v.vagas[m.cargoId] && v.vagas[m.cargoId].tem >= v.vagas[m.cargoId].max; return `<tr><td class="muted">${esc(m.cargo)}</td><td><span class="nome-av">${av(m.nome)}<b>${esc(m.nome)}</b></span></td><td class="r">${m.idade}</td><td class="r"><span class="ovr ${corN(m.nivel)}">${m.nivel}</span></td><td>${atrs(m.atributos)}</td><td class="r">${fM(m.salarioPedido)}/ano</td><td class="r"><button class="btn ${cheio ? '' : 'prim'}" data-contratar-staff="${m.id}" data-nome="${esc(m.nome)}" data-sal="${m.salarioPedido}" ${cheio ? 'disabled title="Cargo cheio"' : ''}>Contratar</button></td></tr>`; }).join('') || `<tr><td colspan="7" class="muted">${ui.cargo ? 'Sem livres neste cargo.' : 'Escolhe um cargo para veres os melhores livres.'}</td></tr>`}</tbody></table></div></section>
  </div>`;
}

// ---------------------------------------------------------------- Finanças e Conselho

export function htmlFinancas(v: VistaFinancas, transfRasc: number | null) {
  const a = v.adeptos;
  const rec = v.rubricas.filter((x) => x.receita), des = v.rubricas.filter((x) => !x.receita);
  const max = Math.max(1, ...v.rubricas.map((x) => Math.abs(x.valor)));
  const bar = (l: string, val: number, cor: string) => `<div class="bf"><span class="muted">${esc(l)}</span><div class="t"><i style="width:${(Math.abs(val) / max) * 100}%;background:${cor}"></i></div><span class="num" style="font-size:16px;text-align:right">${fM(Math.abs(val))}</span></div>`;
  const resultado = v.receitaPrevista - v.despesaPrevista;
  const corS = v.saude === 'Crise' ? 'mau' : v.saude === 'Apertada' ? 'aviso' : 'bom';
  const pct = Math.round((a.precoFactor - 1) * 100);
  const totalOrc = v.orcTransferencias + v.orcSalarios;
  const tr = transfRasc ?? v.orcTransferencias;
  return `<div class="topo"><h1>Finanças e Conselho</h1><span class="sub">Época ${esc(v.epoca)}</span><div class="direita"><span class="chip ${corS}"><span class="pt"></span>${v.saude}</span>${v.fairPlay !== null ? `<span class="chip ${v.fairPlay >= 100 ? 'mau' : v.fairPlay >= 85 ? 'aviso' : ''}"><span class="pt"></span>Fair play: ${v.fairPlay}% do limite</span>` : ''}</div></div>
  <div class="grelha">
    <section class="c s12" style="padding:0;overflow:hidden;position:relative"><div style="position:relative;width:100%;aspect-ratio:1024/380;max-height:300px;overflow:hidden"><img src="./img/sala-conselho.jpg" alt="Sala do Conselho" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></div><div style="position:absolute;left:16px;bottom:14px;background:rgba(11,13,16,.75);padding:8px 12px;border-radius:10px"><div class="num" style="font-size:22px">Sala do Conselho</div><div class="rot">Objectivo da época: ${esc(v.objectivo)}</div></div></section>
    <section class="c s3"><h2>Caixa</h2><div class="num grande">${fM(v.caixa)}</div></section>
    <section class="c s3"><h2>Dívida</h2><div class="num grande">${fM(v.divida.total)}</div><div class="rot">banco ${fM(v.divida.banco)} a ${String(v.divida.juro).replace('.', ',')}% · dono ${fM(v.divida.dono)} · parcelas ${fM(v.divida.parcelas)}</div></section>
    <section class="c s3"><h2>Receita prevista</h2><div class="num grande">${fM(v.receitaPrevista)}</div><div class="rot">sem prémios nem vendas</div></section>
    <section class="c s3"><h2>Resultado previsto</h2><div class="num grande" style="color:${resultado >= 0 ? 'var(--bom)' : 'var(--mau)'}">${resultado >= 0 ? '+' : '−'}${fM(Math.abs(resultado))}</div><div class="rot">receita − despesa corrente</div></section>
    <section class="c s12 adeptos"><img src="./img/adeptos.jpg" alt="">
      <div class="ad-conteudo"><h2 style="color:#e8eaee">Adeptos</h2>
        <div class="ad-grandes"><div><span class="num">${a.base >= 1e6 ? `${(a.base / 1e6).toFixed(1).replace('.', ',')} M` : a.base.toLocaleString('pt-PT')}</span><span class="rot">Base de adeptos estimada</span></div><div><span class="num">${a.capacidade.toLocaleString('pt-PT')}</span><span class="rot">Lugares no estádio</span></div></div>
        <div class="ad-linhas">
          <div><span class="rot">Fidelidade</span><b>${a.fidelidade}/20</b><div class="barra"><i style="width:${a.fidelidade * 5}%"></i></div></div>
          <div><span class="rot">Ocupação prevista</span><b>${a.ocupacao}%</b></div>
          <div><span class="rot">Bilheteira por jogo</span><b>${fM(a.receitaJogo)}</b></div>
          <div class="ad-preco"><span class="rot">Preço dos bilhetes</span><div style="display:flex;align-items:center;gap:6px"><button class="btn" data-bil="-1" aria-label="Baixar o preço">−</button><b style="min-width:64px;text-align:center">${pct > 0 ? '+' : ''}${pct}%</b><button class="btn" data-bil="1" aria-label="Subir o preço">+</button></div></div>
          <div><span class="rot">Patrocínio principal</span><b>${fM(a.patrocinio)}/ano</b></div>
        </div>
        ${pct !== 0 ? `<div class="ad-efeito"><b>Efeito do preço</b> (base: preço do clube) · ocupação ${a.ocupacao}% (antes ${a.ocupacaoBase}%) · bilheteira por jogo ${fM(a.receitaJogo)} (${a.receitaJogo >= a.receitaBase ? '+' : '−'}${fM(Math.abs(a.receitaJogo - a.receitaBase))}) <button class="btn" data-bil="0" style="margin-left:8px;min-height:30px;padding:3px 10px">Repor</button></div>` : ''}
      </div></section>
    <section class="c s6"><h2>Receitas da época</h2><div class="barras-fin">${rec.map((x) => bar(x.nome, x.valor, 'var(--bom)')).join('') || '<div class="rot">Ainda sem receitas.</div>'}</div></section>
    <section class="c s6"><h2>Despesas da época</h2><div class="barras-fin">${des.map((x) => bar(x.nome, x.valor, 'var(--mau)')).join('') || '<div class="rot">Ainda sem despesas.</div>'}</div></section>
    <section class="c s12"><h2>Orçamentos da época</h2><div class="grelha">${v.orcamentos.map((o) => `<div class="s3" style="min-width:0"><div class="rot">${esc(o.nome)}</div><div class="num medio" style="margin:6px 0">${fM(o.usado)} / ${fM(o.total)}</div><div class="barra"><i style="width:${o.total ? Math.min(100, (o.usado / o.total) * 100) : 0}%;${o.total && o.usado / o.total > 0.9 ? 'background:var(--aviso)' : ''}"></i></div></div>`).join('')}</div>
      <div class="orc-ajuste"><label class="rot">Dividir o orçamento de salários e transferências (${fM(totalOrc)} no total)<input type="range" data-orc="1" min="0" max="${totalOrc}" step="${Math.max(10000, Math.round(totalOrc / 200 / 10000) * 10000)}" value="${tr}"></label>
        <span>Transferências <b>${fM(tr)}</b> · Salários <b>${fM(totalOrc - tr)}</b></span>${transfRasc !== null && transfRasc !== v.orcTransferencias ? '<button class="btn prim" data-orc-aplicar="1">Aplicar</button>' : ''}</div></section>
    <section class="c s6"><h2>Conselho e accionistas</h2>${v.dono ? `<div class="linha-kv"><span class="muted">Accionista de referência</span><span>${esc(v.dono.nome)} (${esc(v.dono.tipo)})</span></div>${v.dono.atributos.map(([k, x]) => `<div class="linha-kv"><span class="muted">${esc(k)}</span><span>${x}/20</span></div>`).join('')}` : '<div class="rot">Sem dados do conselho.</div>'}
      <div class="linha-kv"><span class="muted">Épocas seguidas a falhar o objectivo</span><span>${v.objectivoFalhado}</span></div>
      <div class="linha-kv"><span class="muted">Capital injectado pelos accionistas</span><span>${fM(v.injeccoes)}</span></div></section>
    <section class="c s6"><h2>Promessas à imprensa</h2><div class="rot">Chegam com o motor de imprensa (Bloco C): ficam aqui com a data, o que disseste e o estado.</div></section>
  </div>`;
}

// ---------------------------------------------------------------- Infraestruturas

export function htmlInfra(v: VistaInfra) {
  const img = (k: string, n: number) => `<img class="infra-3d" src="./img/infra/${k === 'estadio' ? `estadio-${Math.max(1, n)}-${v.tamanho}` : `${k}-${Math.max(1, n)}`}.webp" alt="${esc(k)} nível ${n}" loading="lazy" decoding="async">`;
  return `<div class="topo"><h1>Infraestrutura</h1><span class="sub">Caixa ${fM(v.caixa)} · orçamento de infraestruturas ${fM(v.orcamento)}/época</span></div>
  <div class="grelha">${v.infra.map((x) => `<section class="c ${x.tipo === 'estadio' ? 's8' : 's4'}"><h2>${esc(x.nome)}${x.obra ? `<span class="chip info" style="margin-left:auto">obra em curso · ${x.obra.semanas} semanas</span>` : ''}</h2>
    ${img(x.tipo, x.nivel)}
    <div style="display:flex;align-items:center;gap:8px;margin-top:10px"><span class="num grande">${x.nivel}</span><span class="muted">/ 10</span></div>
    <div class="rot" style="margin-top:6px">${esc(x.efeito)}</div>
    ${x.nivel < 10 ? `<div class="linha-kv" style="margin-top:10px"><span class="muted">Subir para ${x.nivel + 1}</span><span>${fM(x.custo)} · ${x.semanas} semanas</span></div>` : ''}
    <div class="linha-kv"><span class="muted">Manutenção anual</span><span>${fM(x.manutencao)}</span></div>
    ${x.obra ? `<div class="linha-kv"><span class="muted">Fica pronta</span><span>${x.obra.fim}</span></div>` : ''}
    <button class="btn ${x.pode ? '' : 'prim'}" style="margin-top:10px;width:100%" data-obra="${x.tipo}" data-nome="${esc(x.nome)}" data-custo="${x.custo}" data-semanas="${x.semanas}" ${x.pode ? 'disabled' : ''}>${x.pode ? esc(x.pode) : `Melhorar para nível ${x.nivel + 1}`}</button></section>`).join('')}</div>`;
}

// ---------------------------------------------------------------- Competições

export interface UiComp { comp: string; tab: string; premio: string }
const ZONA_TL: Record<string, string> = { ucl: 'ucl', uel: 'uel', uecl: 'uecl', cont: 'ucl', sobe: 'ucl', po_sobe: 'uel', po_desce: 'playoff', desce: 'desc' };

export function htmlCompeticoes(v: VistaCompeticoes, ui: UiComp) {
  const tabs = ['Classificação', 'Calendário', 'Estatísticas', 'Histórico de campeões', 'Prémios'];
  const nomeSel = v.comps.find((x) => x.id === v.sel)?.nome ?? v.sel;
  const cab = `<div class="topo"><h1>Competições</h1><span class="sub">${esc(nomeSel)}</span></div>
    <div class="filtros"><select data-comp="1" aria-label="Competição">${v.comps.map((x) => `<option value="${x.id}" ${x.id === v.sel ? 'selected' : ''}>${esc(x.nome)}${x.minha ? ' ★' : ''}</option>`).join('')}</select>
    <div class="seg" role="group">${tabs.map((t) => `<button data-tabc="${t}" class="${t === ui.tab ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
  if (ui.tab === 'Calendário') return cab + `<section class="c"><h2>Jogos do teu clube</h2>${v.calendario.map((x) => `<div class="jogo-l"><span class="muted">${x.data}</span><span><b>${esc(x.casa)}</b> – <b>${esc(x.fora)}</b><div class="rot">${esc(x.comp)}</div></span>${x.res ? `<span><b class="num" style="font-size:18px">${x.res}</b> <span class="res ${x.resultado}">${x.resultado}</span></span>` : '<span class="chip info">por jogar</span>'}</div>`).join('') || '<div class="rot">Sem jogos marcados.</div>'}</section>`;
  if (ui.tab === 'Estatísticas') {
    const t = (l: VistaCompeticoes['marcadores'], k: 'g' | 'a', tit: string) => `<section class="c s6"><h2>${tit}</h2><div class="tab-wrap"><table><thead><tr><th class="r">#</th><th>Jogador</th><th>Clube</th><th>Pos.</th><th class="r">J</th><th class="r">${k === 'g' ? 'Golos' : 'Assist.'}</th><th class="r">${k === 'g' ? 'Assist.' : 'Golos'}</th></tr></thead><tbody>${l.map((x, i) => `<tr class="${x.meu ? 'meu' : ''}"><td class="r">${i + 1}</td><td><b>${esc(x.nome)}</b></td><td><span style="display:inline-flex;align-items:center;gap:6px">${escudo(x.cores, 16)}${esc(x.clube)}</span></td><td>${x.pos}</td><td class="r">${x.j}</td><td class="r"><b class="num" style="font-size:18px">${x[k]}</b></td><td class="r">${k === 'g' ? x.a : x.g}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Ainda sem dados.</td></tr>'}</tbody></table></div></section>`;
    return cab + (v.tabela ? `<div class="grelha">${t(v.marcadores, 'g', 'Melhores marcadores')}${t(v.assistentes, 'a', 'Melhores assistentes')}</div><div class="rot" style="margin-top:6px">Golos e assistências em todas as competições da época, dos jogadores dos clubes desta liga.</div>` : '<section class="c"><div class="rot">Estatísticas por liga: escolhe uma liga.</div></section>');
  }
  if (ui.tab === 'Histórico de campeões') {
    const ehLiga = v.historico.some((l) => l.terceiro || l.marcador);
    return cab + `<div class="grelha"><section class="c s7"><h2>Campeões${v.inicio ? ` · desde ${v.inicio}` : ''}<span class="acao" style="color:var(--suave)">${v.historico.length} épocas</span></h2><div class="tab-wrap" style="max-height:560px;overflow-y:auto"><table><thead><tr><th>Época</th><th>Campeão</th><th>Vice</th>${ehLiga ? '<th class="so-l">3.º</th><th class="so-l">Melhor marcador</th>' : '<th>Final</th>'}</tr></thead><tbody>${v.historico.map((l) => `<tr class="${l.fonte === 'jogo' ? 'meu' : ''}"><td>${esc(l.epoca)}${l.fonte === 'jogo' ? ' <span class="chip info">jogo</span>' : ''}</td><td><b>${esc(l.campeao || '—')}</b></td><td class="muted">${esc(l.vice)}</td>${ehLiga ? `<td class="muted so-l">${esc(l.terceiro)}</td><td class="so-l">${esc(l.marcador)}</td>` : `<td>${esc(l.final)}</td>`}</tr>`).join('') || '<tr><td colspan="5" class="muted">Sem histórico: começa com o jogo.</td></tr>'}</tbody></table></div></section>
      <section class="c s5"><h2>Títulos por clube</h2><div class="tab-wrap" style="max-height:560px;overflow-y:auto"><table><thead><tr><th class="r">#</th><th>Clube</th><th class="r">Títulos</th>${v.inicio ? `<th class="r so-l">Antes de ${v.inicio}</th>` : ''}<th class="r">Vices</th></tr></thead><tbody>${v.titulos.map((x, i) => `<tr><td class="r">${i + 1}</td><td><b>${esc(x.clube)}</b></td><td class="r"><b class="num" style="font-size:18px">${x.titulos}</b></td>${v.inicio ? `<td class="r so-l muted">${x.anteriores || ''}</td>` : ''}<td class="r">${x.vices}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  }
  if (ui.tab === 'Prémios') {
    const p = v.premios.find((x) => x.id === ui.premio) ?? v.premios[0];
    return cab + `<div class="filtros"><div class="seg" role="group">${v.premios.map((x) => `<button data-premio="${x.id}" class="${x.id === p?.id ? 'on' : ''}">${esc(x.nome)}</button>`).join('')}</div></div>
      <section class="c"><div class="tab-wrap" style="max-height:600px;overflow-y:auto"><table><thead><tr><th>Ano</th><th>Vencedor</th><th>Clube</th><th>Nota</th></tr></thead><tbody>${(p?.lista ?? []).map((x) => `<tr class="${x.fonte === 'jogo' ? 'meu' : ''}"><td>${x.ano}${x.fonte === 'jogo' ? ' <span class="chip info">jogo</span>' : ''}</td><td><b>${esc(x.jogador || '—')}</b></td><td>${esc(x.clube)}</td><td class="muted">${esc(x.nota)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  if (v.tabela) return cab + `<section class="tabela-liga">
    <div class="tl-linha tl-cab"><span class="tl-pos">Pos</span><span class="tl-clube"></span><span>J</span><span>V</span><span>E</span><span>D</span><span class="tl-g">GM</span><span class="tl-g">GS</span><span>DG</span><span class="tl-pts">Pts</span></div>
    ${v.tabela.map((t) => `<div class="tl-linha ${t.meu ? 'meu' : ''}"><span class="tl-pos z-${ZONA_TL[t.zona] ?? 'nada'}">${String(t.pos).padStart(2, '0')}</span><span class="tl-clube">${escudo(t.cores, 16)}<b>${esc(t.clube)}</b></span><span>${t.j}</span><span>${t.v}</span><span>${t.e}</span><span>${t.d}</span><span class="tl-g">${t.gm}</span><span class="tl-g">${t.gs}</span><span>${t.gm - t.gs > 0 ? '+' : ''}${t.gm - t.gs}</span><span class="tl-pts">${t.pts}</span></div>`).join('')}
  </section>`;
  return cab + `<section class="c"><h2>Jogos</h2>${v.jogos.map((x) => `<div class="jogo-l ${x.meu ? 'meu-l' : ''}"><span class="muted">${x.data}<div class="rot">${x.ronda}</div></span><span>${escudo(x.coresCasa, 16)} <b>${esc(x.casa)}</b> – ${escudo(x.coresFora, 16)} <b>${esc(x.fora)}</b></span><span><b class="num" style="font-size:18px">${x.res || '—'}</b></span></div>`).join('') || '<div class="rot">Ainda sem jogos nesta competição (ou não é desta época).</div>'}</section>`;
}

// ---------------------------------------------------------------- Escritório

export function htmlEscritorio(v: VistaEscritorio) {
  const k = v.carreira;
  const kpi = (ic: string, rot: string, val: string | number, sub = '') => `<div class="car-k"><span class="car-ic">${ic}</span><span class="rot">${rot}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const soma = (l: { valor: number }[]) => l.reduce((t, x) => t + x.valor, 0);
  const mc = v.compras[0], mv = v.vendas[0];
  const pctV = k && k.jogos ? Math.round((k.v / k.jogos) * 100) : 0;
  return `<section class="banner-mercado banner-esc"><img src="./img/escritorio.jpg" alt=""><div class="bm-topo"><h1>Escritório</h1><span>A carreira de ${esc(v.nome)} · Presidente do ${esc(v.clube)} desde ${v.desde}</span></div></section>
  <div class="grelha">
    <section class="c s12"><h2>Resultados</h2><div class="car-res">${kpi(svg('classificacao'), 'Jogos', k?.jogos ?? 0)}${kpi('V', 'Vitórias', k?.v ?? 0, `${pctV}%`)}${kpi('E', 'Empates', k?.e ?? 0)}${kpi('D', 'Derrotas', k?.d ?? 0)}${kpi(svg('taca'), 'Títulos', v.titulos.length, v.titulos.length ? v.titulos.map((x) => `${x.comp} ${x.epoca}`).join(' · ') : 'ainda à espera do primeiro')}</div>
      ${k ? `<div class="rot" style="margin-top:8px">Golos: ${k.gm} marcados, ${k.gs} sofridos${k.maiorVitoria ? ` · maior vitória: ${esc(k.maiorVitoria.texto)}` : ''}</div>` : ''}</section>
    <section class="c s6"><h2>Mercado</h2>
      ${kpi('↓', 'Maior contratação', mc ? esc(mc.nome) : '—', mc ? `vindo do ${esc(mc.de)} por ${fE(mc.valor)}` : '')}
      ${kpi('↑', 'Maior venda', mv ? esc(mv.nome) : '—', mv ? `para o ${esc(mv.para)} por ${fE(mv.valor)}` : '')}
      <div class="car-par">${kpi('€', 'Total em contratações', fE(soma(v.compras)), `${v.compras.length} jogador(es)`)}${kpi('€', 'Total em vendas', fE(soma(v.vendas)), `${v.vendas.length} jogador(es)`)}</div></section>
    <section class="c s6"><h2>Clube</h2>
      ${kpi('€', 'Capital injectado pelos accionistas', fE(v.injeccoes))}
      ${kpi(svg('plantel'), 'Melhor marcador numa época', k?.melhorMarcador ? esc(k.melhorMarcador.nome) : '—', k?.melhorMarcador ? `${k.melhorMarcador.golos} golos em ${k.melhorMarcador.jogos} jogos · ${k.melhorMarcador.epoca}` : '')}</section>
    <section class="c s12"><h2>Renovações de contrato<span class="rot" style="margin-left:10px;text-transform:none;letter-spacing:0;font-weight:400">Os contratos que acabam e não renovas saem a custo zero no fim da época.</span></h2>
      <div class="tab-wrap"><table><thead><tr><th>Jogador</th><th>Pos.</th><th class="r">Idade</th><th class="r">OVR</th><th class="r">Salário</th><th class="r">Fim</th><th class="r">Pede (estimado)</th><th class="r">Valor</th><th class="r"></th></tr></thead><tbody>${v.renovacoes.map((x) => `<tr class="clic" data-jogador="${x.id}"><td><b>${esc(x.nome)}</b>${x.descontente ? ' <span class="chip mau">descontente</span>' : ''}</td><td>${x.pos}</td><td class="r">${x.idade}</td><td class="r"><span class="ovr ${x.ovr >= 75 ? 'qa' : x.ovr >= 68 ? 'qb' : x.ovr >= 60 ? 'qc' : 'qd'}">${x.ovr}</span></td><td class="r">${fM(x.salario)}/ano</td><td class="r">${x.fim}</td><td class="r">${fM(x.pedido)}/ano</td><td class="r">${fM(x.valor)}</td><td class="r">${x.negociacao !== null ? `<button class="btn" data-neg-abrir="${x.negociacao}">Ver negociação</button>` : `<button class="btn prim" data-negociar="${x.id}:renovacao">Renovar</button>`}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">Nenhum contrato a acabar nos próximos 2 anos.</td></tr>'}</tbody></table></div></section>
  </div>`;
}
