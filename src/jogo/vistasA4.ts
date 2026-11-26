// Vistas da Parte A4 (Staff, Finanças e Conselho, Infraestruturas, Competições, Escritório): leituras do mundo para a
// interface. Nada aqui muda o estado do motor.
import type { World } from '../engine/world.ts';
import type { Temporada } from '../engine/season/temporada.ts';
import type { JogoR } from '../engine/competitions/base.ts';
import { CompLiga } from '../engine/competitions/liga.ts';
import { POSICOES } from '../config/papeis.ts';
import { NOME_CARGO, CARGOS, type Cargo } from '../config/staff.ts';
import { ATRIBUTOS_STAFF, CARGO_POR_ID, NOME_DEPARTAMENTO, type Departamento } from '../config/cargos.ts';
import { NOME_ATRIBUTO_TREINADOR, ATRIBUTOS_TREINADOR } from '../config/treinadores.ts';
import { ESTILO_POR_ID, type IdEstilo } from '../config/estilos.ts';
import { INFRA, TIPOS_INFRA } from '../config/infraestruturas.ts';
import { RUBRICAS, RECEITAS, N_INFRA } from '../club/store.ts';
import { custoObra, factorCustoInfra } from '../club/controlador.ts';
import { indiceRiqueza } from '../economia/contratos.ts';
import { RENOVACAO, STAFF_UTILIZADOR, BILHETE_UTILIZADOR, OBRAS_UTILIZADOR } from '../config/negociacaoUtilizador.ts';
import { PREMIOS_HISTORICO, INICIO_HISTORICO } from '../config/historico.ts';
import { rotuloEpoca } from '../historico/historico.ts';
import { valorMercado } from '../mercado/valor.ts';
import { salarioPedido } from '../mercado/decisaoJogador.ts';
import { zonasLiga } from './vistas.ts';
import type { Carreira } from './sessao.ts';

const DIA_MS = 864e5;
const dataPt = (dia: number) => { const d = new Date(dia * DIA_MS); return `${d.getUTCDate()} ${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const anoDe = (dia: number) => new Date(dia * DIA_MS).getUTCFullYear();
const r1 = (x: number) => Math.round(x * 10) / 10;

// ---------------------------------------------------------------- Staff

export interface MembroVista { id: string; cargo: string; cargoId: string; nome: string; idade: number; nivel: number; atributos: [string, number][]; salario: number; fim: number; extra: string; indemnizacao: number }
export interface VistaStaff {
  departamentos: { nome: string; sub: string; membros: MembroVista[] }[];
  treinador: { nome: string; idade: number; reputacao: number; estilo: string; formacoes: string[]; atributos: [string, number][]; salario: number; fim: number; confianca: number; moral: number; indemnizacao: number };
  custo: number; orcamento: number;
  livres: (MembroVista & { salarioPedido: number })[];
  treinadoresLivres: { id: string; nome: string; idade: number; reputacao: number; estilo: string; formacao: string; atributos: [string, number][]; salario: number; aceita: number }[];
  vagas: Record<string, { tem: number; max: number }>;
}

const SUB_DEP: Record<Departamento, string> = {
  academia: 'Formação: academia, Sub-21 e Sub-18', recrutamento: 'Olheiros: 1 por cada 2 níveis do Recrutamento (máximo 5); olheiros de jovens pela reputação',
  tecnica: 'Treinadores, preparação física e departamento médico', financeiro: 'Contas, juros, previsões e negociação de transferências', comercial: 'Patrocínios, merchandising, bilheteira e adeptos',
};

export function vistaStaff(w: World, c: number, dia: number): VistaStaff {
  const e = w.economia!, sm = e.staff, t = w.motor!.treinadores[c], mt = e.mercadoT;
  const vista = (m: (typeof sm.porClube)[number][number]): MembroVista => ({
    id: m.id, cargo: NOME_CARGO[m.cargo] ?? m.cargo, cargoId: m.cargo, nome: m.nome, idade: m.idade, nivel: m.nivel,
    atributos: Object.entries(m.atributos).filter(([k]) => k !== 'estilo').map(([k, v]) => [ATRIBUTOS_STAFF[k as keyof typeof ATRIBUTOS_STAFF]?.split(' (')[0].split(':')[0] ?? k, v as number]),
    salario: Math.round(m.salario), fim: anoDe(m.contratoFim), extra: m.estilo ? `${ESTILO_POR_ID[m.estilo.estilo]?.nome ?? ''} · ${m.estilo.esquema}` : m.area ? `Área: ${m.area}` : '',
    indemnizacao: Math.round(Math.max(0, (m.contratoFim - dia) / 365) * m.salario * STAFF_UTILIZADOR.indemnizacao),
  });
  const membros = sm.porClube[c] ?? [];
  const deps = (Object.keys(NOME_DEPARTAMENTO) as Departamento[]).map((d) => ({ nome: NOME_DEPARTAMENTO[d], sub: SUB_DEP[d], membros: membros.filter((m) => CARGO_POR_ID[m.cargo]?.departamento === d).map(vista) }));
  const vagas: VistaStaff['vagas'] = {};
  for (const cg of CARGOS) vagas[cg] = { tem: membros.filter((m) => m.cargo === cg).length, max: sm.quantos(cg as Cargo, w.reputacao[c], e.nivel(c, 'recrutamento')) };
  const receita = e.clubes.receitaPrevista[c];
  const livres = CARGOS.flatMap((cg) => sm.livres.filter((m) => m.cargo === cg).sort((a, b) => b.nivel - a.nivel).slice(0, 8).map((m) => ({ ...vista(m), salarioPedido: Math.round(sm.salario(c, m.cargo, m.nivel, receita)) })));
  const estiloT = (p: string) => ESTILO_POR_ID[p as IdEstilo]?.nome ?? p;
  const atrT = (x: typeof t) => ATRIBUTOS_TREINADOR.map((a) => [NOME_ATRIBUTO_TREINADOR[a].split(' e ')[0], x.atributos[a]] as [string, number]);
  const treinadoresLivres = [...mt.livres].sort((a, b) => (b.reputacao ?? 0) - (a.reputacao ?? 0)).slice(0, 25).map((x) => ({
    id: x.id, nome: x.nome, idade: x.idade ?? 50, reputacao: Math.round(x.reputacao ?? 50), estilo: estiloT(x.perfil), formacao: x.formacoes[0], atributos: atrT(x), salario: Math.round(mt.salario(x, c)), aceita: Math.round(mt.probAceitar(x, c) * 100),
  }));
  return {
    departamentos: deps,
    treinador: { nome: t.nome, idade: t.idade ?? 50, reputacao: Math.round(t.reputacao ?? 50), estilo: estiloT(t.perfil), formacoes: t.formacoes, atributos: atrT(t), salario: Math.round(t.salario ?? 0), fim: anoDe(t.contratoFim ?? dia),
      confianca: Math.round(e.ia.confianca[c] ?? 60), moral: Math.round(t.moral ?? 70), indemnizacao: Math.round(Math.max(0, ((t.contratoFim ?? dia) - dia) / 365) * (t.salario ?? 0)) },
    custo: Math.round(sm.custo(c) + e.custoTreinador(c)), orcamento: Math.round(e.clubes.orcStaff[c]), livres, treinadoresLivres, vagas,
  };
}

// ---------------------------------------------------------------- Finanças e Conselho

const NOME_RUBRICA: Record<string, string> = {
  tv: 'Direitos de TV', bilheteira: 'Bilheteira', comercial: 'Patrocínios e comercial', premios: 'Prémios', transferencias: 'Venda de jogadores', outras: 'Outras receitas',
  salarios: 'Salários dos jogadores', staff: 'Treinador e staff', agentes: 'Agentes', manutencao: 'Manutenção', obras: 'Obras', juros: 'Juros', impostos: 'Impostos', multas: 'Multas', indemnizacoes: 'Indemnizações', aquisicoes: 'Compra de jogadores',
};
const OBJECTIVO: Record<string, string> = { título: 'Ser campeão', 'competições europeias': 'Apurar para as competições europeias', 'metade de cima': 'Acabar na metade de cima da tabela', manutenção: 'Garantir a manutenção', subida: 'Subir de divisão' };
const NOME_DONO: Record<string, string> = { socios: 'Sócios', familia: 'Família', empresario: 'Empresário', bilionario: 'Bilionário', estado: 'Fundo estatal', multiclube: 'Grupo multiclube', fundo: 'Fundo de investimento' };

export interface VistaFinancas {
  saude: string; fairPlay: number | null;
  caixa: number; divida: { banco: number; dono: number; parcelas: number; total: number; juro: number }; receitaPrevista: number; despesaPrevista: number;
  rubricas: { id: string; nome: string; valor: number; receita: boolean }[];
  orcamentos: { nome: string; usado: number; total: number }[];
  orcTransferencias: number; orcSalarios: number;
  objectivo: string; objectivoFalhado: number;
  dono: { nome: string; tipo: string; atributos: [string, number][] } | null;
  adeptos: { base: number; fidelidade: number; capacidade: number; precoFactor: number; receitaJogo: number; receitaBase: number; ocupacao: number; ocupacaoBase: number; patrocinio: number; patrocinioFim: number };
  bilhete: { minimo: number; maximo: number; passo: number };
  injeccoes: number; epoca: string;
}

export function vistaFinancas(w: World, c: number, dia: number, epoca: string): VistaFinancas {
  const e = w.economia!, s = e.clubes;
  const receita = e.estimarReceita(c), massa = e.massaSalarialReal(c);
  const conta = (k: number) => s.contas[c * RUBRICAS.length + k];
  const rubricas = RUBRICAS.map((r, k) => ({ id: r, nome: NOME_RUBRICA[r] ?? r, valor: Math.round(conta(k)), receita: k < RECEITAS.length })).filter((x) => x.valor);
  const saude = e.calcularSaude(c);
  const f = e.precoBilhete.get(c) ?? 1;
  // Receita e ocupação de um jogo médio em casa, com o preço escolhido e com o preço base.
  const base = (() => { e.precoBilhete.delete(c); const v = e.receitaJogo(c, -1, 'liga'); if (f !== 1) e.precoBilhete.set(c, f); return v; })();
  const actual = e.receitaJogo(c, -1, 'liga');
  const ocup = (v: number, pf: number) => Math.round((v / pf / Math.max(1, base)) * 100);
  const d = e.donos[c];
  const custoStaff = e.staff.custo(c) + e.custoTreinador(c);
  let obras = 0;
  for (let k = 0; k < N_INFRA; k++) obras += s.obraFim[c * N_INFRA + k] > dia ? s.obraSemanal[c * N_INFRA + k] * Math.max(0, (s.obraFim[c * N_INFRA + k] - dia) / 7) : 0;
  return {
    saude: saude === 2 ? 'Crise' : saude === 1 ? 'Apertada' : 'Saudável', fairPlay: receita > 0 ? Math.round((massa / receita / e.limiteFairPlay(c)) * 100) : null,
    caixa: Math.round(s.caixa[c]), divida: { banco: Math.round(s.dividaBanco[c]), dono: Math.round(s.dividaDono[c]), parcelas: Math.round(s.dividaParcelas[c]), total: Math.round(s.divida(c)), juro: r1(s.juroBanco[c] * 100) },
    receitaPrevista: Math.round(receita), despesaPrevista: Math.round(e.despesaAnual(c)),
    rubricas,
    orcamentos: [
      { nome: 'Salários', usado: Math.round(massa), total: Math.round(s.orcSalarios[c]) },
      { nome: 'Transferências (disponível)', usado: Math.round(conta(RUBRICAS.indexOf('aquisicoes'))), total: Math.round(s.orcTransferencias[c] + conta(RUBRICAS.indexOf('aquisicoes'))) },
      { nome: 'Infraestruturas', usado: Math.round(conta(RUBRICAS.indexOf('obras')) + obras), total: Math.round(s.orcInfra[c]) },
      { nome: 'Staff', usado: Math.round(custoStaff), total: Math.round(s.orcStaff[c]) },
    ],
    orcTransferencias: Math.round(s.orcTransferencias[c]), orcSalarios: Math.round(s.orcSalarios[c]),
    objectivo: OBJECTIVO[e.objectivos[c]] ?? e.objectivos[c] ?? '', objectivoFalhado: s.objectivoFalhado[c],
    dono: d ? { nome: d.nome, tipo: NOME_DONO[d.tipo] ?? d.tipo, atributos: Object.entries(d.atributos).map(([k, v]) => [({ ambicao: 'Ambição', paciencia: 'Paciência', risco: 'Risco', gasto: 'Disposição para gastar', lealdade: 'Lealdade' } as Record<string, string>)[k] ?? k, v as number]) } : null,
    adeptos: { base: Math.round(s.adeptos[c] * 1000), fidelidade: s.fidelidade[c], capacidade: s.capacidade[c], precoFactor: f, receitaJogo: Math.round(actual), receitaBase: Math.round(base),
      ocupacao: Math.min(100, ocup(actual, f)), ocupacaoBase: Math.min(100, ocup(base, 1)), patrocinio: Math.round(s.patrocinio[c]), patrocinioFim: s.patrocinioFim[c] },
    bilhete: { minimo: BILHETE_UTILIZADOR.minimo, maximo: BILHETE_UTILIZADOR.maximo, passo: BILHETE_UTILIZADOR.passo },
    injeccoes: Math.round(s.injeccoes[c]), epoca,
  };
}

// ---------------------------------------------------------------- Infraestruturas

export interface VistaInfra {
  tamanho: 1 | 2 | 3; caixa: number; orcamento: number;
  infra: { tipo: string; nome: string; nivel: number; efeito: string; custo: number; semanas: number; manutencao: number; obra: { fim: string; semanas: number } | null; pode: string | null }[];
}

export function vistaInfra(w: World, c: number, dia: number): VistaInfra {
  const e = w.economia!, s = e.clubes, ind = indiceRiqueza(w, c), fc = factorCustoInfra(ind);
  const cap = s.capacidade[c];
  const efeito: Record<string, (v: number) => string> = {
    estadio: () => `${cap.toLocaleString('pt-PT')} lugares · cada obra +${Math.round(5)}% de lugares e mais receita por bilhete`,
    treino: (v) => `${(v - 5 >= 0 ? '+' : '')}${String(r1((v - 5) * 0.4)).replace('.', ',')} no desenvolvimento dos jogadores`,
    academia: (v) => `Qualidade do intake e evolução dos juniores (nível ${v})`,
    medico: (v) => `${v >= 5 ? '−' : '+'}${String(Math.abs(r1((v - 5) * 1.5))).replace('.', ',')}% de dias de lesão`,
    recrutamento: (v) => `+${v * 10}% observações · até ${Math.min(5, Math.ceil(v / 2))} olheiros`,
  };
  return {
    tamanho: cap < 15000 ? 1 : cap < 35000 ? 2 : 3, caixa: Math.round(s.caixa[c]), orcamento: Math.round(s.orcInfra[c]),
    infra: TIPOS_INFRA.map((tipo, k) => {
      const nivel = s.infra[c * N_INFRA + k];
      const { custo, semanas } = custoObra(tipo, nivel, ind);
      const em = s.obraFim[c * N_INFRA + k] > dia;
      const t = INFRA[tipo];
      return {
        tipo, nome: t.nome, nivel, efeito: efeito[tipo](nivel), custo: Math.round(custo), semanas, manutencao: Math.round(fc * t.manutencao * t.base * Math.pow(t.crescimento, nivel)),
        obra: em ? { fim: dataPt(s.obraFim[c * N_INFRA + k]), semanas: Math.ceil((s.obraFim[c * N_INFRA + k] - dia) / 7) } : null,
        pode: nivel >= 10 ? 'Nível máximo' : em ? 'Obra em curso' : s.caixa[c] < OBRAS_UTILIZADOR.caixa_minima * custo ? 'Sem caixa para arrancar' : null,
      };
    }),
  };
}

// ---------------------------------------------------------------- Competições

export interface VistaCompeticoes {
  comps: { id: string; nome: string; tipo: string; minha: boolean }[];
  sel: string;
  tabela: { pos: number; clube: string; cores: [string, string]; meu: boolean; j: number; v: number; e: number; d: number; gm: number; gs: number; pts: number; zona: string }[] | null;
  jogos: { ronda: string; data: string; casa: string; fora: string; coresCasa: [string, string]; coresFora: [string, string]; res: string; meu: boolean }[];
  calendario: { data: string; comp: string; casa: string; fora: string; res: string; emCasa: boolean; resultado: string }[];
  marcadores: { nome: string; clube: string; cores: [string, string]; pos: string; j: number; g: number; a: number; meu: boolean }[];
  assistentes: { nome: string; clube: string; cores: [string, string]; pos: string; j: number; g: number; a: number; meu: boolean }[];
  historico: { epoca: string; campeao: string; vice: string; terceiro: string; marcador: string; final: string; fonte: string }[];
  titulos: { clube: string; titulos: number; anteriores: number; vices: number; ultimo: string }[];
  inicio: number | null;
  premios: { id: string; nome: string; lista: { ano: number; jogador: string; clube: string; nota: string; fonte: string }[] }[];
}

export function vistaCompeticoes(w: World, c: number, t: Temporada | null, registos: Parameters<NonNullable<World['historico']>['competicao']>[1], sel?: string): VistaCompeticoes {
  const st = w.jogadores!;
  const comps = t ? t.comps.map((x) => ({ id: x.id, nome: x.nome, tipo: x.tipo, minha: t.jogos.some((j) => j.comp === x.id && (j.casa === c || j.fora === c)) || (x instanceof CompLiga && x.clubes.includes(c)) })) : [];
  const ligaMinha = w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.id : '';
  const id = sel && (comps.some((x) => x.id === sel) || w.historico?.competicoes(registos).includes(sel)) ? sel : ligaMinha;
  const comp = t?.comps.find((x) => x.id === id);
  let tabela: VistaCompeticoes['tabela'] = null;
  if (comp instanceof CompLiga) {
    const li = w.ligas.findIndex((l) => l.regras.id === id);
    const z = li >= 0 ? zonasLiga(w, li) : [];
    tabela = comp.classificacaoActual().map((x, i) => ({ pos: i + 1, clube: w.clubes[x.clube].nome, cores: w.clubes[x.clube].cores, meu: x.clube === c, j: x.pj, v: x.v, e: x.e, d: x.d, gm: x.gm, gs: x.gs, pts: x.pts, zona: z[i] ?? '' }));
  }
  const res = (j: JogoR) => (j.r ? `${j.r.gc}–${j.r.gf}${j.r.pen ? ` (${j.r.pen[0]}–${j.r.pen[1]} g.p.)` : ''}` : '');
  const dataJ = (j: JogoR) => dataPt(j.diaAbs ?? (t ? t.base + j.semana * 7 + j.dia : 0));
  const jogos = t && comp && !(comp instanceof CompLiga) ? t.jogos.filter((j) => j.comp === id).slice(-60).reverse().map((j) => ({ ronda: `Ronda ${j.ronda}`, data: dataJ(j), casa: w.clubes[j.casa].nome, fora: w.clubes[j.fora].nome, coresCasa: w.clubes[j.casa].cores, coresFora: w.clubes[j.fora].cores, res: res(j), meu: j.casa === c || j.fora === c })) : [];
  // Calendário do clube: jogados e os próximos já sorteados.
  const meus: JogoR[] = [];
  if (t) {
    for (const j of t.jogos) if (j.casa === c || j.fora === c) meus.push(j);
    for (let s = t.semana; s < t.semana + 40; s++) for (const cp of t.comps) for (const j of cp.jogosPrevistos?.(s) ?? []) if ((j.casa === c || j.fora === c) && !j.r && !meus.includes(j)) meus.push(j);
  }
  const calendario = meus.map((j) => {
    const emCasa = j.casa === c;
    const gm = j.r ? (emCasa ? j.r.gc : j.r.gf) : 0, gs = j.r ? (emCasa ? j.r.gf : j.r.gc) : 0;
    return { dia: j.diaAbs ?? (t ? t.base + j.semana * 7 + j.dia : 0), data: dataJ(j), comp: t?.comps.find((x) => x.id === j.comp)?.nome ?? j.comp, casa: w.clubes[j.casa].nome, fora: w.clubes[j.fora].nome, res: res(j), emCasa,
      resultado: !j.r ? '' : gm > gs ? 'V' : gm < gs ? 'D' : j.r.pen ? ((emCasa ? j.r.pen[0] > j.r.pen[1] : j.r.pen[1] > j.r.pen[0]) ? 'V' : 'D') : 'E' };
  }).sort((a, b) => a.dia - b.dia).map(({ dia: _d, ...x }) => x);
  // Estatísticas (todas as competições) dos jogadores dos clubes da liga seleccionada.
  const clubes = comp instanceof CompLiga ? comp.clubes : [];
  const pl = clubes.flatMap((k) => (w.plantel[k] ?? []).filter((j) => st.clube[j] === k));
  const linha = (j: number) => { const k = st.clube[j]; return { nome: st.nomes[j], clube: w.clubes[k].nome, cores: w.clubes[k].cores, pos: POSICOES[st.posNat[j]], j: st.eJogos[j], g: st.eGolos[j], a: st.eAssist[j], meu: k === c }; };
  const marcadores = [...pl].sort((a, b) => st.eGolos[b] - st.eGolos[a] || st.eAssist[b] - st.eAssist[a]).slice(0, 20).filter((j) => st.eGolos[j] > 0).map(linha);
  const assistentes = [...pl].sort((a, b) => st.eAssist[b] - st.eAssist[a] || st.eGolos[b] - st.eGolos[a]).slice(0, 20).filter((j) => st.eAssist[j] > 0).map(linha);
  const h = w.historico;
  const historico = h ? h.competicao(id, registos).map((l) => ({ epoca: l.epoca, campeao: l.campeao, vice: l.vice, terceiro: l.terceiro, marcador: l.melhorMarcador ? `${l.melhorMarcador}${l.clubeMarcador ? ` (${l.clubeMarcador})` : ''}${l.golos ? `, ${l.golos}` : ''}` : '', final: l.final, fonte: l.fonte })) : [];
  const titulos = h ? h.titulos(id, registos).map((x) => ({ clube: x.clube, titulos: x.titulos, anteriores: x.anteriores, vices: x.vices, ultimo: x.epocas[0] ?? '' })) : [];
  const premios = h ? (Object.keys(PREMIOS_HISTORICO) as (keyof typeof PREMIOS_HISTORICO)[]).map((k) => ({ id: k, nome: PREMIOS_HISTORICO[k].nome, lista: h.premios(k).map((p) => ({ ano: p.ano, jogador: p.jogador, clube: p.clube, nota: p.nota, fonte: p.fonte })) })) : [];
  const comps2: { id: string; nome: string; tipo: string; minha: boolean }[] = [...comps];
  for (const x of h?.competicoes(registos) ?? []) if (!comps2.some((y) => y.id === x)) comps2.push({ id: x, nome: x, tipo: 'historico', minha: false });
  return { comps: comps2, sel: id, tabela, jogos, calendario, marcadores, assistentes, historico, titulos, inicio: INICIO_HISTORICO[id] ?? null, premios };
}

// ---------------------------------------------------------------- Escritório

export interface VistaEscritorio {
  nome: string; clube: string; cores: [string, string]; desde: string;
  carreira: Carreira | null; titulos: { comp: string; epoca: string }[];
  compras: { nome: string; de: string; valor: number; data: string }[]; vendas: { nome: string; para: string; valor: number; data: string }[];
  injeccoes: number;
  renovacoes: { id: string; nome: string; pos: string; idade: number; ovr: number; salario: number; fim: number; pedido: number; descontente: boolean; negociacao: number | null; valor: number }[];
}

export function vistaEscritorio(w: World, c: number, dia: number, nome: string, carreira: Carreira | null, registos: Parameters<NonNullable<World['historico']>['competicao']>[1]): VistaEscritorio {
  const st = w.jogadores!, m = w.mercado!, e = w.economia!;
  const inicio = carreira?.inicio ?? dia;
  const titulos: VistaEscritorio['titulos'] = [];
  const h = w.historico;
  if (h) for (const comp of h.competicoes(registos)) for (const l of h.competicao(comp, registos)) if (l.fonte === 'jogo' && l.clube === c) titulos.push({ comp, epoca: l.epoca });
  const reg = m.registo.filter((x) => x.dia >= inicio);
  const compras = reg.filter((x) => x.para === c && x.tipo !== 'emprestimo').map((x) => ({ nome: st.nomes[x.jogador], de: x.de >= 0 ? w.clubes[x.de].nome : 'livre', valor: x.fee, data: dataPt(x.dia) })).sort((a, b) => b.valor - a.valor);
  const vendas = reg.filter((x) => x.de === c && x.tipo !== 'emprestimo').map((x) => ({ nome: st.nomes[x.jogador], para: x.para >= 0 ? w.clubes[x.para].nome : '', valor: x.fee, data: dataPt(x.dia) })).sort((a, b) => b.valor - a.valor);
  const renovacoes = m.plantel(c).filter((j) => st.fimContrato[j] > 0 && (st.fimContrato[j] - dia) / 365 <= RENOVACAO.anos_maximos && !m.contratos.emprestimo.has(j))
    .sort((a, b) => st.fimContrato[a] - st.fimContrato[b] || st.ovrNat(b) - st.ovrNat(a))
    .map((j) => ({ id: st.ids[j], nome: st.nomes[j], pos: POSICOES[st.posNat[j]], idade: Math.floor(st.idade(j, dia)), ovr: st.ovrNat(j), salario: st.salario[j], fim: anoDe(st.fimContrato[j]),
      pedido: Math.round(Math.max(salarioPedido(w, j, m.salarioMercado(j, c, dia), dia), st.salario[j]) * (1 + m.contratos.descontentamento[j] / 200) / 1000) * 1000,
      descontente: m.contratos.descontentamento[j] >= 40, negociacao: m.util?.activa(j)?.id ?? null, valor: valorMercado(w, j, dia, e.inflacao) }));
  return { nome, clube: w.clubes[c].nome, cores: w.clubes[c].cores, desde: dataPt(inicio), carreira, titulos, compras, vendas, injeccoes: Math.round(e.clubes.injeccoes[c]), renovacoes };
}

export { rotuloEpoca };
