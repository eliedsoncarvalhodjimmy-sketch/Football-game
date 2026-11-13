// Carregamento dos pacotes através de uma DataSource.
import type { DataSource } from './DataSource.ts';
import type { Clube, Manifest, Pacote, RegrasLiga, RegrasTaca, Origem } from './types.ts';
import { parseCsv } from './csv.ts';

export interface CompContinental {
  id: string;
  nome: string;
  tipo: 'fase_liga' | 'grupos';
  confederacao: string;
  equipas: number;
  /** Modelo de calendário ("ago_mai" ou "ano_civil"). */
  calendario?: string;
  [k: string]: unknown;
}

export interface Vagas {
  /** Ordem de atribuição por confederação (ex.: UCL, UCL_PO, UEL, UEL_PO, UECL). "X_PO" = play-off de acesso a X. */
  ordem_competicoes: Record<string, string[]>;
  /** Por liga de origem (ex.: "ENG1") e competição: vagas pela liga e pela taça. */
  vagas: Record<string, Record<string, { liga?: number; taca?: number }>>;
  especiais: {
    /** Campeões em título: o vencedor de `de` entra em `para`. */
    detentores: { de: string; para: string }[];
    /** Bónus do ranking UEFA: +1 vaga em `para` para as `paises` melhores associações da época anterior. */
    bonus_ranking: { para: string; paises: number } | null;
    /** Perdedores do play-off de acesso `de` entram em `para`. */
    perdedores_po: { de: string; para: string }[];
  };
  primeira_epoca?: { detentores: string; bonus_ranking: { valor: string[]; origem: string } };
}

export interface Continental {
  competicoes: CompContinental[];
  vagas: Vagas;
}

export interface Dados {
  pacotes: Pacote[];
  continental: Continental | null;
  /** Erros de leitura (JSON inválido, ficheiros em falta). */
  erros: string[];
  /** Contagens de registos por pacote e origem, para o validate-pack. */
  contagens: Record<string, Record<string, Record<Origem | 'sem_origem', number>>>;
}

const ORIGENS: Origem[] = ['real', 'gerado', 'teste', 'manual'];

function json<T>(texto: string | null, onde: string, erros: string[]): T | null {
  if (texto == null) { erros.push(`${onde}: ficheiro em falta`); return null; }
  try { return JSON.parse(texto) as T; } catch (e) { erros.push(`${onde}: JSON inválido (${(e as Error).message})`); return null; }
}

function contar(linhas: Record<string, string>[]) {
  const c: Record<Origem | 'sem_origem', number> = { real: 0, gerado: 0, teste: 0, manual: 0, sem_origem: 0 };
  for (const l of linhas) {
    const o = l.origem as Origem;
    if (ORIGENS.includes(o)) c[o]++; else c.sem_origem++;
  }
  return c;
}

function clubeDeCsv(l: Record<string, string>, pais: string): Clube {
  return {
    id: l.id, nome: l.nome, nome_curto: l.nome_curto || l.nome.slice(0, 3).toUpperCase(),
    pais: l.pais || pais, cidade: l.cidade, cores: [l.cor1 || '#888888', l.cor2 || '#ffffff'],
    reputacao: Number(l.reputacao) || 0, estadio: l.estadio || '', capacidade: Number(l.capacidade) || 0,
    liga: l.liga, rivais: [], origem: (ORIGENS.includes(l.origem as Origem) ? l.origem : 'real') as Origem,
  };
}

export async function carregarDados(ds: DataSource): Promise<Dados> {
  const erros: string[] = [];
  const pacotes: Pacote[] = [];
  const contagens: Dados['contagens'] = {};
  let continental: Continental | null = null;

  for (const id of await ds.listarPacotes()) {
    if (id === '_continental') {
      const comps: CompContinental[] = [];
      for (const f of await ds.listarFicheiros(id, 'competicoes')) {
        const c = json<CompContinental>(await ds.lerTexto(id, `competicoes/${f}`), `${id}/competicoes/${f}`, erros);
        if (c) comps.push(c);
      }
      const vagas = json<Vagas>(await ds.lerTexto(id, 'vagas.json'), `${id}/vagas.json`, erros);
      if (vagas) continental = { competicoes: comps, vagas };
      continue;
    }
    if (id.startsWith('_')) continue;
    const manifest = json<Manifest>(await ds.lerTexto(id, 'manifest.json'), `${id}/manifest.json`, erros);
    if (!manifest) continue;
    const ligas: RegrasLiga[] = [];
    const tacas: RegrasTaca[] = [];
    for (const f of await ds.listarFicheiros(id, 'competicoes')) {
      const c = json<RegrasLiga | RegrasTaca>(await ds.lerTexto(id, `competicoes/${f}`), `${id}/competicoes/${f}`, erros);
      if (!c) continue;
      if (c.tipo === 'liga') ligas.push(c);
      else if (c.tipo === 'taca') tacas.push(c);
      else erros.push(`${id}/competicoes/${f}: tipo desconhecido`);
    }
    ligas.sort((a, b) => a.nivel - b.nivel);
    contagens[id] = {};
    let clubes: Clube[] = [];
    let jogadores: Record<string, string>[] = [];
    const extra: Record<string, Record<string, string>[]> = {};
    for (const f of ['financas', 'estadios', 'rivalidades', 'donos', 'arquetipos', 'staff']) { const t = await ds.lerTexto(id, `${f}.csv`); extra[f] = t ? parseCsv(t) : []; }
    for (const f of ['clubes', 'players', 'treinadores', 'staff', 'donos']) {
      const t = await ds.lerTexto(id, `${f}.csv`);
      const linhas = t ? parseCsv(t) : [];
      contagens[id][f] = contar(linhas);
      if (f === 'clubes') clubes = linhas.map((l) => clubeDeCsv(l, manifest.pais ?? ''));
      if (f === 'players') jogadores = linhas;
    }
    const overrides = json<Record<string, Partial<Clube>>>(await ds.lerTexto(id, 'overrides.json') ?? '{}', `${id}/overrides.json`, erros) ?? {};
    tacas.sort((a, b) => manifest.tacas.indexOf(a.id) - manifest.tacas.indexOf(b.id));
    pacotes.push({ manifest, ligas, tacas, clubes, overrides, jogadores, financas: extra.financas, estadios: extra.estadios, rivalidades: extra.rivalidades, donos: extra.donos, arquetipos: extra.arquetipos, staffCsv: extra.staff });
  }
  return { pacotes, continental, erros, contagens };
}
