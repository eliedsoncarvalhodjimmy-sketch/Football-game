// Vistas da Parte A3 (Mercado, Scouting, Academia e Recrutamento): leituras do mundo para a interface, com o nevoeiro de
// informação do clube do utilizador (intervalos que estreitam com o conhecimento). Nada aqui muda o estado do motor.
import type { World } from '../engine/world.ts';
import { POSICOES } from '../config/papeis.ts';
import { NEG_CLUBE, NEG_JOGADOR, NEG_EMPRESTIMO } from '../config/negociacaoUtilizador.ts';
import { PAISES_SCOUT, PERFIS_PAIS, MISSOES } from '../config/scoutingJovem.ts';
import { SCOUTS } from '../config/scouting.ts';
import { ESCALOES } from '../config/academia.ts';
import { valorMercado, precoPedido } from '../mercado/valor.ts';
import { salarioPedido } from '../mercado/decisaoJogador.ts';
import type { NegUtilizador } from '../mercado/mercadoUtilizador.ts';
import { linhaJogador, type LinhaJogador } from './vistas.ts';
import { generatePlayerFace } from '../players/faceGenerator.ts';

const DIA_MS = 864e5;
const dataPt = (dia: number) => { const d = new Date(dia * DIA_MS); return `${d.getUTCDate()} ${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const r1 = (x: number) => Math.round(x * 10) / 10;
const LIMITE_LISTA = 150;

/** Linha de um jogador de outro clube, visto pelo clube do utilizador. */
export interface LinhaMercado {
  id: string; nome: string; pos: string; idade: number; pais: string;
  clube: string; cores: [string, string]; liga: string;
  conh: number; ovr: [number, number]; pot: [number, number]; valor: number;
  preco?: number; salario?: number; semanasLivre?: number; emprestimoSalario?: number; clausula?: number; listado?: boolean; shortlist: boolean; negociacao: number | null;
}

function linhaMercado(w: World, c: number, j: number, dia: number): LinhaMercado {
  const st = w.jogadores!, m = w.mercado!, sc = m.scouting;
  const d = st.clube[j];
  const o = sc.estimarOVR(c, j, dia), p = sc.estimarPotencial(c, j, dia);
  const n = m.util?.activa(j);
  return {
    id: st.ids[j], nome: st.nomes[j], pos: POSICOES[st.posNat[j]], idade: Math.floor(st.idade(j, dia)), pais: st.paises[st.pais[j]] ?? '',
    clube: d >= 0 ? w.clubes[d].nome : 'Livre', cores: d >= 0 ? w.clubes[d].cores : ['#555', '#ddd'], liga: d >= 0 && w.liga[d] >= 0 ? w.ligas[w.liga[d]].regras.nome : '',
    conh: o.conhecimento, ovr: [o.min, o.max], pot: [p.min, p.max], valor: valorMercado(w, j, dia, w.economia!.inflacao),
    clausula: m.contratos.clausula[j] > 0 ? m.contratos.clausula[j] : undefined, listado: m.contratos.listado[j] > 0,
    shortlist: !!m.util?.shortlist.includes(j), negociacao: n ? n.id : null,
  };
}

export interface OfertaRecebida { negocio: number; jogador: string; nome: string; pos: string; comprador: string; cores: [string, string]; tipo: string; oferta: number; valor: number; aguarda: boolean; estado: string; rondas: string[] }
export interface ResumoNeg { id: number; tipo: string; jogador: string; nome: string; clube: string; fase: string; texto: string; ronda: number; tensao: number }

export interface VistaMercado {
  janela: { aberta: boolean; dias: number; nome: string };
  orcamento: { transferencias: number; salarialLivre: number; caixa: number };
  listados: LinhaMercado[]; emprestimos: LinhaMercado[]; livres: LinhaMercado[]; shortlist: LinhaMercado[];
  conhecidos: LinhaMercado[];
  recebidas: OfertaRecebida[]; feitas: ResumoNeg[];
  meus: { id: string; nome: string; pos: string; ovr: number; valor: number; listado: boolean }[];
  ligas: string[];
}

/** Próxima mudança de estado da janela do clube (dias) e o nome da janela. */
function janela(w: World, c: number, dia: number) {
  const m = w.mercado!;
  const aberta = m.janelaAberta(c, dia);
  let d = dia;
  while (m.janelaAberta(c, d + 1) === aberta && d - dia < 400) d++;
  const mesAlvo = new Date((d + 1) * DIA_MS).getUTCMonth();
  const inverno = aberta ? new Date(dia * DIA_MS).getUTCMonth() <= 1 || new Date(dia * DIA_MS).getUTCMonth() === 11 : mesAlvo <= 1 || mesAlvo === 11;
  return { aberta, dias: d + 1 - dia, nome: inverno ? 'de Inverno' : 'de Verão' };
}

export function vistaMercado(w: World, c: number, dia: number): VistaMercado {
  const st = w.jogadores!, m = w.mercado!, e = w.economia!, sc = m.scouting, u = m.util;
  const conhecido = (j: number) => sc.nivel(c, j, dia) > 0;
  const ordenar = (a: LinhaMercado, b: LinhaMercado) => b.ovr[0] + b.ovr[1] - a.ovr[0] - a.ovr[1];
  const fora = (j: number) => st.clube[j] !== c;
  const listados = m.todosListados().filter((j) => fora(j) && st.clube[j] >= 0 && conhecido(j)).map((j) => {
    const l = linhaMercado(w, c, j, dia);
    l.preco = precoPedido(w, m, j, c, dia, 1).preco;
    return l;
  }).sort(ordenar).slice(0, LIMITE_LISTA);
  const emprestimos = m.todosEmprestaveis().filter((j) => fora(j) && conhecido(j)).map((j) => {
    const l = linhaMercado(w, c, j, dia);
    const d = st.clube[j];
    const top = m.plantel(d).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).slice(0, 11);
    l.emprestimoSalario = Math.min(1, NEG_EMPRESTIMO.salario_base + (top.includes(j) ? NEG_EMPRESTIMO.salario_titular : 0));
    return l;
  }).sort(ordenar).slice(0, LIMITE_LISTA);
  const livres = m.todosLivres().map((j) => {
    const l = linhaMercado(w, c, j, dia);
    l.salario = Math.round(salarioPedido(w, j, m.salarioMercado(j, c, dia)) / 1000) * 1000;
    l.semanasLivre = Math.max(0, Math.floor((dia - m.contratos.livreDesde[j]) / 7));
    return l;
  }).sort(ordenar).slice(0, LIMITE_LISTA);
  const shortlist = (u?.shortlist ?? []).map((j) => linhaMercado(w, c, j, dia));
  const conhecidos = sc.conhecidos(c).filter((j) => fora(j) && st.clube[j] >= 0 && sc.nivel(c, j, dia) >= 25).map((j) => linhaMercado(w, c, j, dia)).sort(ordenar).slice(0, 250);
  const recebidas: OfertaRecebida[] = m.negocios.filter((n) => n.vendedor === c && n.estado !== 'concluido' && n.estado !== 'falhou').map((n) => ({
    negocio: n.id, jogador: st.ids[n.jogador], nome: st.nomes[n.jogador], pos: POSICOES[st.posNat[n.jogador]], comprador: w.clubes[n.comprador].nome, cores: w.clubes[n.comprador].cores,
    tipo: n.tipo, oferta: n.oferta, valor: valorMercado(w, n.jogador, dia, e.inflacao), aguarda: !!n.aguardaUtilizador,
    estado: n.aguardaUtilizador ? 'à espera da tua resposta' : n.estado === 'oferta' ? 'oferta' : n.estado === 'termos' ? 'termos com o jogador' : n.estado === 'exames' ? 'exames médicos' : 'registo',
    rondas: n.rondas.slice(-4).map((r) => `${dataPt(r.dia)} · ${r.texto}`),
  }));
  // Concluídos recentes com jogadores do utilizador (vendas e saídas).
  for (const n of m.concluidos.slice(-200)) if (n.vendedor === c && dia - n.dia <= 60) recebidas.push({
    negocio: n.id, jogador: st.ids[n.jogador], nome: st.nomes[n.jogador], pos: POSICOES[st.posNat[n.jogador]], comprador: w.clubes[n.comprador].nome, cores: w.clubes[n.comprador].cores,
    tipo: n.tipo, oferta: n.oferta, valor: 0, aguarda: false, estado: n.estado === 'concluido' ? 'concluído' : `falhou: ${n.motivo ?? ''}`, rondas: n.rondas.slice(-2).map((r) => `${dataPt(r.dia)} · ${r.texto}`),
  });
  const FASE: Record<string, string> = { clube: 'a negociar com o clube', jogador: 'a negociar com o jogador', registo: 'exames e registo', concluida: 'concluída', rompeu: 'o clube rompeu', rompeu_jogador: 'o jogador recusou', desistiu: 'terminaste', falhou: 'falhou' };
  const feitas: ResumoNeg[] = (u?.negs ?? []).slice().reverse().slice(0, 30).map((n) => ({
    id: n.id, tipo: n.tipo, jogador: st.ids[n.jogador], nome: st.nomes[n.jogador], clube: n.vendedor >= 0 ? w.clubes[n.vendedor].nome : 'livre', fase: n.fase, texto: FASE[n.fase], ronda: n.ronda, tensao: n.tensao,
  }));
  const meus = m.plantel(c).map((j) => ({ id: st.ids[j], nome: st.nomes[j], pos: POSICOES[st.posNat[j]], ovr: st.ovrNat(j), valor: valorMercado(w, j, dia, e.inflacao), listado: m.contratos.listado[j] > 0 }))
    .sort((a, b) => b.ovr - a.ovr);
  const ligas = [...new Set([...listados, ...emprestimos, ...conhecidos].map((x) => x.liga).filter(Boolean))].sort();
  return {
    janela: janela(w, c, dia),
    orcamento: { transferencias: Math.round(e.clubes.orcTransferencias[c]), salarialLivre: Math.round(e.clubes.orcSalarios[c] - e.clubes.folha[c]), caixa: Math.round(e.clubes.caixa[c]) },
    listados, emprestimos, livres, shortlist, conhecidos, recebidas, feitas, meus, ligas,
  };
}

/** Uma negociação aberta, com tudo o que o ecrã precisa (incluindo os dados para avaliar a proposta antes de a enviar). */
export interface VistaNegociacao {
  neg: Omit<NegUtilizador, 'jogador' | 'vendedor'> & { jogador: string };
  jogador: LinhaMercado & { rosto: string; salarioActual: number };
  vendedor: string; coresVendedor: [string, string];
  orcamento: { transferencias: number; salarialLivre: number };
  trocas: { id: string; nome: string; pos: string; valor: number }[];
  parcelas: { id: string; nome: string }[]; vendaFutura: number[];
  papeis: readonly string[]; anos: number[]; bonusTipos: readonly string[]; bonusModos: readonly string[]; bonusN: number[];
  emprestimo: { exigido: number; opcaoMinima: number; opcoes: number[] } | null;
  posicao: string;
}

export function vistaNegociacao(w: World, c: number, id: number, dia: number): VistaNegociacao {
  const st = w.jogadores!, m = w.mercado!, e = w.economia!;
  const n = m.util?.negs.find((x) => x.id === id);
  if (!n) throw new Error('Negociação inexistente.');
  const j = n.jogador, d = n.vendedor;
  const lm = linhaMercado(w, c, j, dia);
  const cores = d >= 0 ? w.clubes[d].cores : (['#555', '#ddd'] as [string, string]);
  const valor = valorMercado(w, j, dia, e.inflacao);
  const top = d >= 0 ? m.plantel(d).sort((a, b) => st.ovrNat(b) - st.ovrNat(a)).slice(0, 11) : [];
  return {
    neg: { ...n, jogador: st.ids[j], historico: n.historico.map((h) => ({ ...h })) },
    jogador: { ...lm, rosto: generatePlayerFace({ id: st.ids[j], nome: st.nomes[j], nacionalidade: lm.pais, idade: lm.idade, posicao: lm.pos, clubeId: d >= 0 ? w.clubes[d].id : '' }, { kit: { primaryColor: cores[0], secondaryColor: cores[1], pattern: 'lisa' } }), salarioActual: st.salario[j] },
    vendedor: d >= 0 ? w.clubes[d].nome : 'Jogador livre', coresVendedor: cores,
    orcamento: { transferencias: Math.round(e.clubes.orcTransferencias[c]), salarialLivre: Math.round(e.clubes.orcSalarios[c] - e.clubes.folha[c]) },
    trocas: m.plantel(c).map((x) => ({ id: st.ids[x], nome: st.nomes[x], pos: POSICOES[st.posNat[x]], valor: valorMercado(w, x, dia, e.inflacao) })).sort((a, b) => b.valor - a.valor),
    parcelas: NEG_CLUBE.parcelas.map((p) => ({ id: p.id, nome: p.nome })), vendaFutura: NEG_CLUBE.venda_futura_opcoes,
    papeis: NEG_JOGADOR.papeis, anos: NEG_JOGADOR.anos_opcoes, bonusTipos: NEG_JOGADOR.bonus_tipos, bonusModos: NEG_JOGADOR.bonus_modos, bonusN: NEG_JOGADOR.bonus_n,
    emprestimo: n.tipo === 'emprestimo' ? { exigido: Math.min(1, NEG_EMPRESTIMO.salario_base + (top.includes(j) ? NEG_EMPRESTIMO.salario_titular : 0)), opcaoMinima: Math.round(NEG_EMPRESTIMO.opcao_minima * valor / 1e4) * 1e4, opcoes: NEG_EMPRESTIMO.opcoes_salario } : null,
    posicao: POSICOES[st.posNat[j]],
  };
}

// ---------------------------------------------------------------- Scouting

export interface VistaScouting {
  recrutamento: number; maxLigas: number;
  equipa: { nome: string; cargo: string; idade: number; nivel: number; atributos: [string, number][]; tarefa: string }[];
  atribuicao: { id: string; nome: string; pais: string; familiaridade: number }[];
  ligasDisponiveis: { id: string; nome: string; pais: string; nivel: number; familiaridade: number }[];
  missoes: { id: number; pais: string; paisNome: string; posicao: string; semanas: number; custo: number; estado: string; fim: string;
    relatorio: { id: string; nome: string; pos: string; idade: number; nascimento: string; altura: number; peso: number; ovr: [number, number]; pt: [number, number]; clube: string; destaque: string | null; estado: string; compensacao: number; pais: string }[] }[];
  paises: { codigo: string; nome: string; zona: string; custoSemana: number; perfil: string[] }[];
  olheirosJovens: number; olheirosJovensLivres: number;
  duracoes: number[]; posicoes: readonly string[];
}

const NOME_CARGO: Record<string, string> = { olheiro: 'Olheiro', olheiro_jovens: 'Olheiro de jovens', chefe_recrutamento: 'Chefe de recrutamento' };
const NOME_ATR: Record<string, string> = { avaliacao: 'Avaliação', scout_quantidade: 'Quantidade', adaptabilidade: 'Adaptabilidade', determinacao: 'Determinação' };

export function vistaScouting(w: World, c: number, dia: number): VistaScouting {
  const e = w.economia!, sc = w.mercado!.scouting, ac = w.academia!, mj = ac.missoes, st = w.jogadores!;
  const ms = (e.staff.porClube[c] ?? []).filter((x) => x.cargo in NOME_CARGO);
  const olheiros = ms.filter((x) => x.cargo === 'olheiro');
  const at = sc.atribuicao[c] ?? [];
  const activas = mj.activas(c);
  const nomePais = (p: string | null) => w.pacotes.find((x) => x.manifest.id === p || x.manifest.id.toUpperCase() === p)?.manifest.nome ?? p ?? '';
  const ligaInfo = (li: number) => { const L = w.ligas[li]; const pk = w.pacotes.find((p) => p.ligas.includes(li)); return { id: L.regras.id, nome: L.regras.nome, pais: pk?.manifest.nome ?? '', nivel: L.regras.nivel, familiaridade: r1(sc.fam[c * sc.nLigas + li]) }; };
  void nomePais;
  return {
    recrutamento: e.nivel(c, 'recrutamento'), maxLigas: olheiros.length * SCOUTS.ligas_por_scout,
    equipa: ms.map((x) => {
      let tarefa = '';
      if (x.cargo === 'olheiro') { const li = at[olheiros.indexOf(x)]; tarefa = li !== undefined ? `A observar: ${w.ligas[li].regras.nome}` : ''; }
      if (x.cargo === 'olheiro_jovens') { const mi = activas.find((y) => y.olheiro === x.id); tarefa = mi ? `Em missão: ${PAISES_SCOUT[mi.pais]?.nome ?? mi.pais} · ${mi.posicao} · regressa a ${dataPt(mi.fim)}` : ''; }
      if (x.cargo === 'chefe_recrutamento') tarefa = 'Coordena o departamento';
      return { nome: x.nome, cargo: NOME_CARGO[x.cargo], idade: x.idade, nivel: x.nivel, atributos: Object.entries(x.atributos).filter(([k]) => k in NOME_ATR).map(([k, v]) => [NOME_ATR[k], v as number] as [string, number]), tarefa };
    }),
    atribuicao: at.map(ligaInfo).map((x) => ({ id: x.id, nome: x.nome, pais: x.pais, familiaridade: x.familiaridade })),
    ligasDisponiveis: w.ligas.map((L, li) => (L.clubes.length && li !== w.liga[c] ? ligaInfo(li) : null)).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => a.pais.localeCompare(b.pais, 'pt') || a.nivel - b.nivel),
    missoes: mj.missoes.filter((x) => x.clube === c).slice().reverse().map((x) => ({
      id: x.id, pais: x.pais, paisNome: PAISES_SCOUT[x.pais]?.nome ?? x.pais, posicao: x.posicao, semanas: x.semanas, custo: x.custo, estado: x.estado === 'em curso' ? 'em curso' : 'concluída', fim: dataPt(x.fim),
      relatorio: x.estado === 'em curso' ? [] : mj.relatorio(x, dia).map((l) => ({
        id: st.ids[l.jogador], nome: l.nome, pos: l.posicao, idade: l.idade, nascimento: dataPt(l.nascimento), altura: l.altura, peso: l.peso, ovr: l.ovr, pt: l.pt, clube: l.clube, destaque: l.destaque,
        estado: l.estado, compensacao: l.estado === 'disponivel' ? Math.round(mj.compensacao(c, l.jogador, dia)) : 0, pais: st.paises[st.pais[l.jogador]] ?? x.pais,
      })),
    })),
    paises: Object.entries(PAISES_SCOUT).map(([codigo, p]) => ({ codigo, nome: p.nome, zona: p.zona, custoSemana: mj.custoSemana(c, codigo), perfil: [...(PERFIS_PAIS[p.perfil] ?? [])] })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
    olheirosJovens: mj.olheiros(c).length, olheirosJovensLivres: mj.livres(c).length,
    duracoes: [...MISSOES.duracoes], posicoes: MISSOES.posicoes,
  };
}

// ---------------------------------------------------------------- Academia

export interface TabelaJuvenil { esc: string; nome: string; jornada: number; jornadas: number; linhas: { pos: number; clube: string; cores: [string, string]; meu: boolean; div: number; j: number; v: number; e: number; d: number; dg: number; pts: number }[];
  resultados: { casa: string; fora: string; gc: number; gf: number; meu: boolean }[]; playoff: { fase: string; casa: string; fora: string; gc: number; gf: number; pen?: [number, number] }[]; campeao: string | null;
  estatisticas: { id: string; nome: string; pos: string; idade: number; jogos: number; golos: number; assist: number; nota: number }[] }

export interface VistaAcademia {
  contagens: { intake: number; sub18: number; sub21: number; principal: number; maxSub18: number; maxSub21: number };
  nivelAcademia: number;
  prontos: (LinhaJogador & { para: string })[];
  intake: { data: string; jogadores: { id: string; nome: string; pos: string; idade: number; altura: number; peso: number; ovr: [number, number]; pt: [number, number]; personalidade: string; tom: string; rosto: string }[] };
  excedente: { jogadores: { id: string; nome: string; pos: string; idade: number; ovr: number; pot: [number, number] }[]; sub18: number; maximo: number } | null;
  ligas: TabelaJuvenil[];
}

export function vistaAcademia(w: World, c: number, dia: number): VistaAcademia {
  const st = w.jogadores!, ac = w.academia!, lj = ac.ligas, e = w.economia!;
  const cores = w.clubes[c].cores;
  const ui = ac.ultimoIntake[c];
  const prontos: VistaAcademia['prontos'] = [];
  for (const j of [...ac.sub21[c], ...ac.sub18[c]]) {
    if (st.clube[j] !== c) continue;
    const cons = ac.conselho(j, dia);
    if (cons === 'promover_principal' || cons === 'promover_sub21') prontos.push({ ...linhaJogador(w, j, dia, ac.sub21[c].includes(j) ? 'sub21' : 'sub18'), para: cons === 'promover_principal' ? 'equipa principal' : 'Sub-21' });
  }
  const ex = ac.excedente.get(c);
  const tabela = (esc: 'sub18' | 'sub21'): TabelaJuvenil | null => {
    const L = lj.ligaDe(c, esc);
    if (!L) return null;
    const ult = L.jogos.filter((x) => x.fase === 'regular').reduce((m, x) => Math.max(m, x.jornada), 0);
    return {
      esc: esc === 'sub18' ? 'Sub-18' : 'Sub-21', nome: `Liga ${esc === 'sub18' ? 'Sub-18' : 'Sub-21'}`, jornada: ult, jornadas: L.jornadas.length,
      linhas: lj.classificacao(L).map((x, i) => ({ pos: i + 1, clube: w.clubes[x.clube].nome, cores: w.clubes[x.clube].cores, meu: x.clube === c, div: L.divisao.get(x.clube) ?? 1, j: x.j, v: x.v, e: x.e, d: x.d, dg: x.gm - x.gs, pts: x.pts })),
      resultados: L.jogos.filter((x) => x.fase === 'regular' && x.jornada === ult).map((x) => ({ casa: w.clubes[x.casa].nome, fora: w.clubes[x.fora].nome, gc: x.gc, gf: x.gf, meu: x.casa === c || x.fora === c })),
      playoff: [...L.playoff.quartos, ...L.playoff.meias, ...(L.playoff.final ? [L.playoff.final] : [])].map((x) => ({ fase: { quartos: 'Quartos de final', meias: 'Meias-finais', final: 'Final', regular: '' }[x.fase], casa: w.clubes[x.casa].nome, fora: w.clubes[x.fora].nome, gc: x.gc, gf: x.gf, pen: x.penaltis })),
      campeao: L.playoff.campeao >= 0 ? w.clubes[L.playoff.campeao]?.nome ?? null : null,
      estatisticas: lj.estatisticas(c, esc).map((x) => ({ id: st.ids[x.jogador], nome: st.nomes[x.jogador], pos: POSICOES[st.posNat[x.jogador]], idade: Math.floor(st.idade(x.jogador, dia)), jogos: x.jogos, golos: x.golos, assist: x.assist, nota: r1(x.nota) })),
    };
  };
  return {
    contagens: { intake: ui?.jogadores.length ?? 0, sub18: ac.sub18[c].length, sub21: ac.sub21[c].length, principal: (w.plantel[c] ?? []).filter((j) => st.clube[j] === c).length, maxSub18: ESCALOES.sub18.maximo, maxSub21: ESCALOES.sub21.maximo },
    nivelAcademia: e.nivel(c, 'academia'),
    prontos,
    intake: { data: ui && ui.dia >= 0 ? dataPt(ui.dia) : '', jogadores: ac.relatorioIntake(c, dia).map((x) => ({ id: st.ids[x.jogador], nome: x.nome, pos: x.posicao, idade: x.idade, altura: x.altura, peso: x.peso, ovr: x.ovr, pt: x.pt, personalidade: x.personalidade, tom: x.tom,
      rosto: generatePlayerFace({ id: st.ids[x.jogador], nome: x.nome, nacionalidade: x.pais, idade: x.idade, posicao: x.posicao, clubeId: w.clubes[c].id }, { kit: { primaryColor: cores[0], secondaryColor: cores[1], pattern: 'lisa' } }) })) },
    excedente: ex ? { jogadores: ex.jogadores.filter((j) => st.clube[j] === c).map((j) => ({ id: st.ids[j], nome: st.nomes[j], pos: POSICOES[st.posNat[j]], idade: Math.floor(st.idade(j, dia)), ovr: st.ovrNat(j), pot: [Math.max(st.ovrNat(j), st.pot[j] - 3), st.pot[j] + 2] as [number, number] })), sub18: ac.sub18[c].length, maximo: ESCALOES.sub18.maximo } : null,
    ligas: [tabela('sub18'), tabela('sub21')].filter((x): x is TabelaJuvenil => !!x),
  };
}
