// Vistas da Parte A2 (Início completo, Plantel, Jogador, Táctica): leituras do mundo para a interface.
// Nada aqui muda o estado do motor (o onze previsto usa uma semente própria e não toca na cache de ratings).
import type { World } from '../engine/world.ts';
import type { PlayerStore } from '../players/store.ts';
import { ATRIBUTOS, N_ATR, type GrupoAtributo } from '../config/atributos.ts';
import { PAPEIS, POSICOES, PAPEIS_DA_POSICAO, NOME_POSICAO, N_POS, IDX_PAPEL, type Posicao } from '../config/papeis.ts';
import { ESTILOS, ESTILO_POR_ID, type IdEstilo } from '../config/estilos.ts';
import { FORMACAO_POR_ID, type Instrucoes } from '../config/tacticas.ts';
import { ESTADO } from '../config/estado.ts';
import { Rng } from '../core/rng.ts';
import { escolherOnze, condicaoActual, disponivel } from '../match/onze.ts';
import { adequacaoEstilo, estiloDe } from '../match/estilos.ts';
import type { Lado } from '../match/rapido.ts';
import { generatePlayerFace } from '../players/faceGenerator.ts';
import { valorMercado } from '../mercado/valor.ts';
import { selosJogador, type SelosJogador } from './vistasPremios.ts';
import { DISPOSICAO_CAMPO } from '../config/interface.ts';
import { corpoJogador, ESC } from '../academia/academia.ts';

const DIA_MS = 864e5;
const anoDe = (dia: number) => new Date(dia * DIA_MS).getUTCFullYear();
const r1 = (x: number) => Math.round(x * 10) / 10;

export type Escalao = 'principal' | 'sub21' | 'sub18';

/** Linha de um jogador nas listas do Plantel. */
export interface LinhaJogador {
  j: number; id: string; nome: string; pos: Posicao; idade: number; ovr: number; pais: string;
  jogos: number; titular: number; golos: number; assist: number; amarelos: number; vermelhos: number;
  papel: string; adequacao: number; moral: number; forma: number[]; condicao: number;
  fimContrato: number | null; salario: number; estado: 'apto' | 'lesionado' | 'suspenso'; estadoTexto: string;
  rosto: string; escalao: Escalao; potencial?: [number, number]; conselho?: string; evolucao?: number;
}

export interface VistaPlantel { clube: string; cores: [string, string]; principal: LinhaJogador[]; sub21: LinhaJogador[]; sub18: LinhaJogador[]; maxSub: number }

export interface VistaJogador {
  linha: LinhaJogador;
  clube: string; cores: [string, string]; pais: string; altura: number; peso: number; pe: string;
  posicoes: { pos: Posicao; nome: string; nivel: 'natural' | 'competente' | 'aprende' }[];
  grupos: { grupo: GrupoAtributo; nome: string; atributos: { nome: string; v: number; int?: [number, number] }[] }[];
  papeis: { nome: string; v: number }[];
  potencial: [number, number];
  minutos: number; notaMedia: number | null; lesoesEpoca: number;
  valor: number | null;
  meu: boolean;
  /** Jogador de outro clube: o que o scouting sabe (conhecimento %, OVR em intervalo) e o que se pode fazer. */
  scouting: { conhecimento: number; ovr: [number, number]; scout: string | null; vies: string | null } | null;
  mercado: { listado: boolean; shortlist: boolean; negociacao: number | null; clausula: number; livre: boolean; emprestavel: boolean } | null;
  /** Selos dos prémios e prestígio (Prompt 8); null sem prémios. */
  premios: SelosJogador | null;
}

export interface CaixaTactica { pos: Posicao; x: number; y: number; jogadores: { j: number; id: string; nome: string; idade: number; ovr: number; pos: Posicao; lesionado: boolean }[] }
export interface VistaTactica {
  treinador: { nome: string; idade: number | null; estilo: IdEstilo | null; estiloNome: string; formacoes: string[]; adaptabilidade: number; gestao: number };
  relacao: { capital: number; autoridade: number; conflito: number; nivel: string } | null;
  estilos: { id: IdEstilo; nome: string; ideia: string; esquemas: string[]; valoriza: string; risco: string; adequacao: number; instrucoes: Instrucoes }[];
  formacao: string; instrucoes: Instrucoes; caixas: CaixaTactica[]; fora: string[];
  notas: { plantel: number; onze: number; profundidade: number }; dinamica: 'Positiva' | 'Estável' | 'Negativa';
  sugestaoPendente: { formacao?: string; instrucoes?: Partial<Instrucoes>; onze?: number[] } | null;
  ultimaDecisao: { decisao: string; pedidas: number; aplicadas: number } | null;
  formacoes: string[];
  plantel: { j: number; nome: string; pos: Posicao; ovr: number; disponivel: boolean }[];
  /** Formação preferida do treinador (o que ele joga sem sugestões). */
  formacaoTreinador: string;
  instrucoesTreinador: Instrucoes;
}

const GRUPO_NOME: Record<GrupoAtributo, string> = { tecnico: 'Técnicos', mental: 'Mentais', fisico: 'Físicos', guarda_redes: 'Guarda-redes' };
const PE = ['Direito', 'Esquerdo', 'Ambos'];

export function linhaJogador(w: World, j: number, dia: number, escalao: Escalao = 'principal'): LinhaJogador {
  const st = w.jogadores!;
  const pos = POSICOES[st.posNat[j]];
  const papel = st.papelPref[j];
  const idade = Math.floor(st.idade(j, dia));
  const forma: number[] = [];
  for (let k = 0; k < 5; k++) { const v = st.forma[j * 5 + k]; if (v) forma.push(v / 10); }
  const les = st.indisponivelAte[j] > dia;
  const susp = st.suspensao[j] > 0;
  const c = st.clube[j];
  const cores = c >= 0 ? w.clubes[c].cores : ['#555', '#ddd'];
  const pais = st.paises[st.pais[j]] ?? '';
  const ac = w.academia;
  return {
    j, id: st.ids[j], nome: st.nomes[j], pos, idade, ovr: st.ovrNat(j), pais,
    jogos: st.eJogos[j], titular: st.eTitular[j], golos: st.eGolos[j], assist: st.eAssist[j], amarelos: st.eAmarelos[j], vermelhos: st.eVermelhos[j],
    papel: PAPEIS[papel]?.nome ?? '', adequacao: Math.round(st.adequacao(j, papel)), moral: st.moral[j], forma, condicao: Math.round(condicaoActual(st, j, dia)),
    fimContrato: st.fimContrato[j] > 0 ? anoDe(st.fimContrato[j]) : null, salario: st.salario[j],
    estado: les ? 'lesionado' : susp ? 'suspenso' : 'apto',
    estadoTexto: les ? `Lesão ${ESTADO.gravidade[st.lesaoTipo[j] - 1]?.tipo ?? ''} · ${st.indisponivelAte[j] - dia} dias`.replace('  ', ' ') : susp ? `Suspenso (${st.suspensao[j]} jogo${st.suspensao[j] > 1 ? 's' : ''})` : 'Apto',
    rosto: generatePlayerFace({ id: st.ids[j], nome: st.nomes[j], nacionalidade: pais, idade, posicao: pos, clubeId: c >= 0 ? w.clubes[c].id : '' },
      { kit: { primaryColor: cores[0], secondaryColor: cores[1], pattern: 'lisa' } }),
    escalao,
    ...(escalao !== 'principal' && ac ? { potencial: potencialEstimado(st, j), conselho: TEXTO_CONSELHO[ac.conselho(j, dia)] ?? '', evolucao: st.ovrNat(j) - (ac.ovrInicio[j] || st.ovrNat(j)) } : {}),
  };
}

const TEXTO_CONSELHO: Record<string, string> = {
  promover_sub21: 'Promover ao Sub-21', promover_principal: 'Promover à equipa principal', manter: 'Manter', emprestar: 'Emprestar', vender: 'Vender', libertar: 'Libertar',
};

/** Potencial visto pelo próprio clube (conhecimento total): intervalo estreito à volta do real, nunca abaixo do OVR. */
function potencialEstimado(st: PlayerStore, j: number): [number, number] {
  const p = st.pot[j], o = st.ovrNat(j);
  return [Math.max(o, p - 3), Math.min(99, Math.max(o, p + 2))];
}

export function vistaPlantel(w: World, c: number, dia: number): VistaPlantel {
  const st = w.jogadores!;
  const ac = w.academia;
  const ordem = (a: LinhaJogador, b: LinhaJogador) => POSICOES.indexOf(a.pos) - POSICOES.indexOf(b.pos) || b.ovr - a.ovr;
  const principal = (w.plantel[c] ?? []).filter((j) => st.clube[j] === c).map((j) => linhaJogador(w, j, dia)).sort(ordem);
  const jov = (lista: number[] | undefined, e: Escalao) => (lista ?? []).filter((j) => st.clube[j] === c).map((j) => linhaJogador(w, j, dia, e)).sort(ordem);
  return { clube: w.clubes[c].nome, cores: w.clubes[c].cores, principal, sub21: jov(ac?.sub21[c], 'sub21'), sub18: jov(ac?.sub18[c], 'sub18'), maxSub: 30 };
}

export function escalaoDe(w: World, j: number): Escalao {
  const e = w.academia?.escalao[j] ?? ESC.nenhum;
  return e === ESC.sub21 ? 'sub21' : e === ESC.sub18 ? 'sub18' : 'principal';
}

export function vistaJogador(w: World, j: number, dia: number, clubeUtilizador: number): VistaJogador {
  const st = w.jogadores!;
  const linha = linhaJogador(w, j, dia, escalaoDe(w, j));
  const c = st.clube[j];
  const corpo = corpoJogador(st.ids[j], linha.pos, linha.idade);
  const gr = linha.pos === 'GR';
  const grupos = (['tecnico', 'mental', 'fisico', 'guarda_redes'] as GrupoAtributo[])
    .filter((g) => (gr ? g !== 'tecnico' : g !== 'guarda_redes') || (gr && g === 'tecnico'))
    .map((g) => ({ grupo: g, nome: GRUPO_NOME[g], atributos: ATRIBUTOS.map((a, k) => ({ a, k })).filter((x) => x.a.grupo === g).map((x) => ({ nome: x.a.nome as string, v: st.atr[j * N_ATR + x.k], int: undefined as [number, number] | undefined })) }));
  const posicoes: VistaJogador['posicoes'] = [];
  for (let p = 0; p < N_POS; p++) {
    const f = st.fam[j * N_POS + p];
    if (p === st.posNat[j]) posicoes.unshift({ pos: POSICOES[p], nome: NOME_POSICAO[POSICOES[p]], nivel: 'natural' });
    else if (f >= 14) posicoes.push({ pos: POSICOES[p], nome: NOME_POSICAO[POSICOES[p]], nivel: 'competente' });
    else if (f >= 10) posicoes.push({ pos: POSICOES[p], nome: NOME_POSICAO[POSICOES[p]], nivel: 'aprende' });
  }
  const papeis = PAPEIS_DA_POSICAO[linha.pos].map((r) => ({ nome: PAPEIS[r].nome, v: Math.round(st.adequacao(j, r)) })).sort((a, b) => b.v - a.v);
  const valor = Math.round(valorMercado(w, j, dia));
  const meu = c === clubeUtilizador;
  const m = w.mercado;
  let scouting: VistaJogador['scouting'] = null;
  if (!meu && m) {
    // Outro clube: atributos em intervalo, OVR e potencial estimados pelo que os olheiros viram.
    const rel = m.scouting.relatorio(clubeUtilizador, j, dia);
    for (const g of grupos) for (const a of g.atributos) { const id = ATRIBUTOS.find((x) => x.nome === a.nome)!.id; const iv = rel.atributos[id]; a.int = iv; a.v = Math.round((iv[0] + iv[1]) / 2); }
    scouting = { conhecimento: rel.conhecimento, ovr: [rel.ovr.min, rel.ovr.max], scout: rel.scout, vies: rel.vies };
    linha.ovr = rel.ovr.estimado;
    for (const r of papeis) r.v = 0;
  }
  const pot: [number, number] = scouting && m ? (() => { const p = m.scouting.estimarPotencial(clubeUtilizador, j, dia); return [p.min, p.max] as [number, number]; })() : potencialEstimado(st, j);
  const mercado: VistaJogador['mercado'] = m ? { listado: m.contratos.listado[j] > 0, shortlist: !!m.util?.shortlist.includes(j), negociacao: m.util?.activa(j)?.id ?? null, clausula: m.contratos.clausula[j] || 0, livre: c === -3,
    emprestavel: c >= 0 && !meu && !m.contratos.emprestimo.has(j) } : null;
  return {
    linha, clube: c >= 0 ? w.clubes[c].nome : 'Sem clube', cores: c >= 0 ? w.clubes[c].cores : ['#555', '#ddd'], pais: linha.pais,
    altura: corpo.altura, peso: corpo.peso, pe: PE[st.pe[j]] ?? 'Direito', posicoes, grupos, papeis, potencial: pot,
    minutos: st.eMinutos[j], notaMedia: st.eJogos[j] ? r1(st.eNotas[j] / st.eJogos[j] / 10) : null, lesoesEpoca: st.eLesoes[j], valor, meu, scouting, mercado,
    premios: w.prestigio?.selos.has(j) ? selosJogador(w, j, dia) : null,
  };
}

/** Nível da relação (texto) a partir do conflito. */
const nivelRelacao = (conflito: number) => (conflito >= 60 ? 'Crise' : conflito >= 30 ? 'Tensa' : 'Boa');

export function vistaTactica(w: World, c: number, dia: number, formacaoVer?: string): VistaTactica {
  const st = w.jogadores!;
  const m = w.motor!;
  const t = m.treinadores[c];
  const plantel = (w.plantel[c] ?? []).filter((j) => st.clube[j] === c);
  const sug = m.sugestao;
  // Onze previsto: o do treinador (semente própria: não mexe no estado do mundo).
  const fv = formacaoVer ?? sug?.formacao;
  const forcar = fv && FORMACAO_POR_ID[fv] ? { formacao: FORMACAO_POR_ID[fv], papeis: FORMACAO_POR_ID[fv].lugares.map((l) => IDX_PAPEL[l.papel]) } : undefined;
  const esc = escolherOnze(st, plantel, t, dia, Rng.de(w.semente, 'previsao', dia), forcar);
  const o = esc.onze;
  const lado = { escolha: esc } as unknown as Lado;
  // Caixas por lugar: titular + até 2 alternativas da mesma posição (os do banco primeiro, depois o resto).
  const usados = new Set(o.jogadores);
  const restantes = plantel.filter((j) => !usados.has(j)).sort((a, b) => st.ovrNat(b) - st.ovrNat(a));
  const caixas: CaixaTactica[] = o.formacao.lugares.map((l, k) => {
    const tit = o.jogadores[k];
    // Campo vertical (baliza própria em baixo); a largura é afastada do centro para as caixas não se sobreporem.
    return { pos: l.pos, x: Math.round(Math.max(12, Math.min(88, 50 + (l.y - 50) * 1.4))), y: Math.round(92 - ((l.x - 4) / 80) * 82), jogadores: tit === undefined ? [] : [tit].map((j) => ({ j, id: st.ids[j], nome: st.nomes[j], idade: Math.floor(st.idade(j, dia)), ovr: st.ovrPos(j, l.pos), pos: POSICOES[st.posNat[j]], lesionado: !disponivel(st, j, dia) })) };
  });
  // Posições no campo: as do protótipo (afinadas à mão) quando a formação as tem; a cada lugar a mais próxima da mesma posição.
  const disp = DISPOSICAO_CAMPO[o.formacao.id === '4-3-3F9' ? '4-3-3' : o.formacao.id];
  if (disp) {
    const livres = disp.map((d) => ({ pos: d[0], x: d[1], y: d[2] }));
    caixas.forEach((cx) => {
      let melhor = -1, dist = Infinity;
      livres.forEach((d, i) => { const dd = (d.x - cx.x) ** 2 + (d.y - cx.y) ** 2 + (d.pos === cx.pos ? 0 : 1e6); if (dd < dist) { dist = dd; melhor = i; } });
      if (melhor >= 0) { cx.x = livres[melhor].x; cx.y = livres[melhor].y; livres.splice(melhor, 1); }
    });
  }
  for (let volta = 0; volta < 2; volta++) {
    caixas.forEach((cx) => {
      const k = restantes.findIndex((j) => POSICOES[st.posNat[j]] === cx.pos);
      if (k < 0) return;
      const j = restantes.splice(k, 1)[0];
      cx.jogadores.push({ j, id: st.ids[j], nome: st.nomes[j], idade: Math.floor(st.idade(j, dia)), ovr: st.ovrPos(j, cx.pos), pos: POSICOES[st.posNat[j]], lesionado: !disponivel(st, j, dia) });
    });
  }
  const media = (js: number[]) => Math.round(js.reduce((s, j) => s + st.ovrNat(j), 0) / Math.max(1, js.length));
  const segundos = caixas.map((cx) => cx.jogadores[1]?.j).filter((j): j is number => j !== undefined);
  const moral = plantel.reduce((s, j) => s + st.moral[j], 0) / Math.max(1, plantel.length);
  const estilo = estiloDe(t.perfil);
  const r = m.clubeUtilizador === c ? m.relacao : null;
  return {
    treinador: { nome: t.nome, idade: t.idade ?? null, estilo, estiloNome: estilo ? ESTILO_POR_ID[estilo].nome : 'Sem estilo definido', formacoes: t.formacoes, adaptabilidade: t.atributos.adaptabilidade, gestao: t.atributos.gestao },
    relacao: r ? { capital: Math.round(r.capital), autoridade: Math.round(r.autoridade), conflito: Math.round(r.conflito), nivel: nivelRelacao(r.conflito) } : null,
    estilos: ESTILOS.map((e) => ({ id: e.id, nome: e.nome, ideia: e.ideia, esquemas: [...e.esquemas], valoriza: e.valorizados.map((v) => v.nome).join(', '), risco: e.risco, adequacao: r1(adequacaoEstilo(st, lado, e.id) * 100), instrucoes: e.instrucoes })),
    formacao: o.formacao.id, instrucoes: { ...o.instrucoes, passe: o.instrucoes.passe ?? 0 }, caixas,
    fora: restantes.map((j) => `${st.nomes[j]} (${POSICOES[st.posNat[j]]}${!disponivel(st, j, dia) ? ', indisponível' : ''})`),
    notas: { plantel: media(plantel), onze: media(o.jogadores), profundidade: media(segundos) },
    dinamica: moral >= 14 ? 'Positiva' : moral >= 11 ? 'Estável' : 'Negativa',
    sugestaoPendente: sug ? { ...sug } : null,
    ultimaDecisao: m.ultimaDecisao ? { decisao: m.ultimaDecisao.decisao, pedidas: m.ultimaDecisao.pedidas, aplicadas: m.ultimaDecisao.aplicadas } : null,
    formacaoTreinador: t.formacoes[0], instrucoesTreinador: { ...t.instrucoes, passe: t.instrucoes.passe ?? 0 },
    formacoes: Object.keys(FORMACAO_POR_ID).filter((f) => f !== '4-3-3F9'),
    plantel: plantel.map((j) => ({ j, nome: st.nomes[j], pos: POSICOES[st.posNat[j]], ovr: st.ovrNat(j), disponivel: disponivel(st, j, dia) })).sort((a, b) => POSICOES.indexOf(a.pos) - POSICOES.indexOf(b.pos) || b.ovr - a.ovr),
  };
}

/** Zonas da classificação de uma liga: vagas continentais (pela ordem das competições), barragem e descida, subida. */
export function zonasLiga(w: World, ligaIdx: number): ('ucl' | 'uel' | 'uecl' | 'cont' | 'sobe' | 'po_sobe' | 'po_desce' | 'desce' | '')[] {
  const L = w.ligas[ligaIdx], n = L.clubes.length;
  const z: ReturnType<typeof zonasLiga> = Array(n).fill('');
  const vagas = w.continental?.vagas.vagas[L.regras.id];
  if (vagas) {
    const ordem = Object.values(w.continental!.vagas.ordem_competicoes).find((cs) => cs.some((x) => x in vagas)) ?? [];
    let i = 0;
    for (const comp of ordem) {
      const k = vagas[comp]?.liga ?? 0;
      const tipo = comp.startsWith('UCL') ? 'ucl' : comp.startsWith('UEL') ? 'uel' : comp.startsWith('UECL') ? 'uecl' : 'cont';
      for (let q = 0; q < k && i < n; q++) z[i++] = tipo;
    }
  }
  if (L.regras.nivel > 1) {
    for (let i = 0; i < L.regras.subidas.directas && i < n; i++) z[i] = 'sobe';
    const po = L.regras.subidas.playoff as { equipas?: number } | null | undefined;
    for (let i = L.regras.subidas.directas; i < L.regras.subidas.directas + (po?.equipas ?? 0) && i < n; i++) z[i] = 'po_sobe';
  }
  const d = L.regras.descidas.directas;
  for (let i = n - d; i < n; i++) if (i >= 0) z[i] = 'desce';
  if (L.regras.descidas.barragem && n - d - 1 >= 0) z[n - d - 1] = 'po_desce';
  return z;
}
