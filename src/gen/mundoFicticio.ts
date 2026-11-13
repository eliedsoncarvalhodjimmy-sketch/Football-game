// Gerador de clubes: completa cada liga com clubes gerados (marcados "teste"
// ou "gerado") e aplica as edições manuais (overrides), que têm sempre prioridade.
import { Rng } from '../core/rng.ts';
import type { Clube, Origem, Pacote, RegrasLiga } from '../data/types.ts';
import { GERACAO } from '../config/geracao.ts';
import { GeradorNomes, nomeCurto } from './nomes.ts';
import { PERFIL_POR_PAIS_REGIONAL } from './perfisNomes.ts';

export interface OpcoesGeracao {
  semente: number;
  modo: 'teste' | 'gerado';
  /** Gerar jogadores (Fase 2). Por defeito sim. */
  jogadores?: boolean;
}

export function bandaReputacao(l: RegrasLiga): [number, number] {
  const tecto = l.geracao?.rep_tecto ?? GERACAO.reputacao.tecto(l.indice_riqueza);
  const piso = l.geracao?.rep_piso ?? GERACAO.reputacao.piso(l.indice_riqueza);
  return [tecto, piso];
}

/** Reputações de uma liga com n clubes, por ordem decrescente. */
export function curvaReputacao(n: number, tecto: number, piso: number, rng: Rng): number[] {
  const { a, p, ruido } = GERACAO.reputacao;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1);
    const f = (1 - a) * (1 - u) + a * Math.pow(1 - u, p);
    out.push(clamp(Math.round(piso + (tecto - piso) * f + rng.normal(0, ruido)), 1, 100));
  }
  return out.sort((x, y) => y - x);
}

export function capacidadeEstadio(rep: number, rng: Rng): number {
  const { max, min, limite, expoente, ruido_relativo } = GERACAO.estadio;
  const base = max * Math.pow(rep / 100, expoente) * (1 + rng.normal(0, ruido_relativo));
  return clamp(Math.round(base / 100) * 100, min, limite);
}

function cores(rng: Rng): [string, string] {
  const c1 = rng.pick(GERACAO.cores);
  let c2 = rng.pick(GERACAO.cores);
  while (c2 === c1) c2 = rng.pick(GERACAO.cores);
  return [c1, c2];
}

export function clamp(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x;
}

/** Estado partilhado entre pacotes para garantir nomes únicos no mundo. */
export interface ContextoGeracao {
  usadosNomes: Set<string>;
  usadosCurtos: Map<string, Set<string>>;
  cidadesPorPais: Map<string, string[]>;
}

export function novoContexto(): ContextoGeracao {
  return { usadosNomes: new Set(), usadosCurtos: new Map(), cidadesPorPais: new Map() };
}

export function gerarClube(
  ctx: ContextoGeracao, rng: Rng, perfilId: string, pais: string, liga: string, id: string, rep: number, origem: Origem,
  podeRepetirCidade = true,
): Clube {
  const g = new GeradorNomes(perfilId, rng, ctx.usadosNomes);
  const cidades = ctx.cidadesPorPais.get(pais) ?? [];
  const cidade = podeRepetirCidade && cidades.length > 2 && rng.chance(GERACAO.prob_mesma_cidade) ? rng.pick(cidades) : g.cidade();
  if (!cidades.includes(cidade)) cidades.push(cidade);
  ctx.cidadesPorPais.set(pais, cidades);
  const curtos = ctx.usadosCurtos.get(pais) ?? new Set<string>();
  ctx.usadosCurtos.set(pais, curtos);
  return {
    id, nome: g.clube(cidade), nome_curto: nomeCurto(cidade, curtos), pais, cidade, cores: cores(rng),
    reputacao: rep, estadio: g.estadio(cidade), capacidade: capacidadeEstadio(rep, rng), liga, rivais: [], origem,
  };
}

/** Completa os clubes de um pacote. Clubes fornecidos (reais) mantêm-se. */
export function completarPacote(pk: Pacote, ctx: ContextoGeracao, op: OpcoesGeracao): Clube[] {
  const m = pk.manifest;
  const rng = Rng.de(op.semente, 'gerar', m.id);
  const out: Clube[] = [];
  let seq = 0;
  const novoId = () => {
    let id: string;
    do id = `${m.id}_${String(++seq).padStart(3, '0')}`; while (pk.clubes.some((c) => c.id === id));
    return id;
  };
  // Lista de países a gerar na liga regional (quotas), por ordem.
  const filaPaises: string[] = [];
  if (m.quotas_paises) for (const [p, q] of Object.entries(m.quotas_paises)) for (let i = 0; i < q; i++) filaPaises.push(p);
  rng.shuffle(filaPaises);

  for (const l of pk.ligas) {
    const fornecidos = pk.clubes.filter((c) => c.liga === l.id);
    const [tecto, piso] = bandaReputacao(l);
    const reps = curvaReputacao(l.formato.equipas, tecto, piso, rng);
    for (const c of fornecidos) {
      if (!c.reputacao) c.reputacao = reps[Math.floor(reps.length / 2)];
      if (!c.capacidade) c.capacidade = capacidadeEstadio(c.reputacao, rng);
      out.push(c);
    }
    // Retira das reputações disponíveis as mais próximas das dos clubes fornecidos.
    for (const c of fornecidos) {
      let melhor = 0;
      for (let i = 1; i < reps.length; i++) if (Math.abs(reps[i] - c.reputacao) < Math.abs(reps[melhor] - c.reputacao)) melhor = i;
      reps.splice(melhor, 1);
    }
    for (const rep of reps) {
      const pais = filaPaises.length ? filaPaises.shift()! : m.pais!;
      const perfilId = m.quotas_paises ? PERFIL_POR_PAIS_REGIONAL[pais] : m.perfil_nomes;
      out.push(gerarClube(ctx, rng, perfilId, pais, l.id, novoId(), rep, op.modo));
    }
  }
  atribuirRivais(out, rng);
  // Edições manuais: prioridade máxima.
  for (const c of out) {
    const o = pk.overrides[c.id];
    if (o) Object.assign(c, o, { origem: o.origem ?? 'manual' });
  }
  return out;
}

export function atribuirRivais(clubes: Clube[], rng: Rng) {
  const porCidade = new Map<string, Clube[]>();
  for (const c of clubes) {
    const k = c.pais + '|' + c.cidade;
    porCidade.set(k, [...(porCidade.get(k) ?? []), c]);
  }
  const ligar = (a: Clube, b: Clube) => {
    if (a === b || a.rivais.includes(b.id)) return;
    if (a.rivais.length >= GERACAO.max_rivais || b.rivais.length >= GERACAO.max_rivais) return;
    a.rivais.push(b.id);
    b.rivais.push(a.id);
  };
  // Dérbis da mesma cidade primeiro.
  for (const g of porCidade.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) ligar(g[i], g[j]);
  // Um rival "regional" de reputação parecida na mesma liga.
  const porLiga = new Map<string, Clube[]>();
  for (const c of clubes) porLiga.set(c.liga, [...(porLiga.get(c.liga) ?? []), c]);
  for (const g of porLiga.values()) {
    for (const c of g) {
      if (c.rivais.length > 0 || !rng.chance(GERACAO.prob_rival_liga)) continue;
      const cands = g.filter((x) => x !== c && x.pais === c.pais && x.rivais.length < GERACAO.max_rivais)
        .sort((x, y) => Math.abs(x.reputacao - c.reputacao) - Math.abs(y.reputacao - c.reputacao)).slice(0, 3);
      if (cands.length) ligar(c, rng.pick(cands));
    }
  }
}
