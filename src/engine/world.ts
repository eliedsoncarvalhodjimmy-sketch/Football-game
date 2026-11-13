// Estado do mundo em estruturas compactas. Os clubes são indexados por um
// inteiro (0..N-1); os atributos usados na simulação vivem em arrays tipados.
import type { Dados, Continental } from '../data/load.ts';
import type { Clube, Manifest, RegrasLiga, RegrasTaca } from '../data/types.ts';
import { completarPacote, novoContexto, clamp, type OpcoesGeracao, type ContextoGeracao } from '../gen/mundoFicticio.ts';
import { FORCA } from '../config/forca.ts';
import { afinarPlantel } from '../players/afinacao.ts';
import { registarReferencia } from '../players/evolucao.ts';
import { Economia } from '../economia/motorEconomico.ts';
import { Rng } from '../core/rng.ts';
import { vagasIniciais, type EntradaLiga } from './season/qualify.ts';
import { PlayerStore } from '../players/store.ts';
import { gerarPlantel } from '../players/gerador.ts';
import { importarLinhas } from '../players/csv.ts';
import { MotorMundo } from '../match/motorMundo.ts';
import { gerarTreinadores } from '../coaches/gerador.ts';
import { MUNDO } from '../config/mundo.ts';

/** Dia absoluto do início do mundo (1 de Julho de 2026). */
export function diaInicioMundo(): number {
  return Math.round(new Date(`${MUNDO.inicio}T00:00:00Z`).getTime() / 86400000);
}

export interface LigaInfo {
  idx: number;
  regras: RegrasLiga;
  pacote: string;
  /** Índices dos clubes nesta liga, na época actual. */
  clubes: number[];
}

export interface Qualificado {
  clube: number;
  pais: string;
  /** Liga que deu a vaga (ex.: "ENG1"). */
  liga: string;
  /** Como se qualificou: "campeão", "2.º", "taça", "reputação (1.ª época)"... */
  via: string;
}

export interface PacoteInfo {
  manifest: Manifest;
  ligas: number[]; // índices em World.ligas, por nível
  tacas: RegrasTaca[];
}

export class World {
  semente: number;
  epoca: number; // ano de início da época (2026 = 2026/27)
  clubes: Clube[] = [];
  ligas: LigaInfo[] = [];
  pacotes: PacoteInfo[] = [];
  continental: Continental | null;
  // Arrays tipados (um elemento por clube; crescem quando entram clubes do exterior).
  reputacao: Float32Array;
  ataque: Float32Array;
  defesa: Float32Array;
  liga: Int16Array; // -1 = exterior (saiu do jogo)
  /** Contexto do gerador (nomes já usados), para os clubes que entram do exterior. */
  ctx: ContextoGeracao = novoContexto();
  modo: 'teste' | 'gerado' = 'teste';
  /** Qualificados para as competições continentais da época actual. */
  qualificados = new Map<string, Qualificado[]>();
  /** Época actual de cada calendário (ago_mai: 2026 = 2026/27; ano_civil: 2027). */
  epocaPorGrupo: Record<string, number> = { ago_mai: 2026, ano_civil: 2027 };
  /** Última classificação conhecida da liga principal de cada pacote (para as vagas). */
  entradasVagas = new Map<string, EntradaLiga>();
  /** Campeões em título (UCL, UEL, UECL) e ligas com o bónus do ranking, para as próximas vagas. */
  detentores = new Map<string, number>();
  bonusRanking: string[] = [];
  /** Jogadores (Fase 2) e plantel de cada clube (índices de jogadores). */
  jogadores: PlayerStore | null = null;
  plantel: number[][] = [];
  /** Média do OVR do plantel − nível do clube, na geração (âncora da reposição). */
  ovrReferencia?: Float32Array;
  /** Motor de jogo (treinadores, cache de ratings). */
  motor: MotorMundo | null = null;
  /** Economia dos clubes (Prompt 3). */
  economia: Economia | null = null;
  private porId = new Map<string, number>();

  constructor(semente: number, epoca: number, continental: Continental | null) {
    this.semente = semente;
    this.epoca = epoca;
    this.continental = continental;
    this.reputacao = new Float32Array(0);
    this.ataque = new Float32Array(0);
    this.defesa = new Float32Array(0);
    this.liga = new Int16Array(0);
  }

  idx(id: string): number {
    const i = this.porId.get(id);
    if (i === undefined) throw new Error(`clube desconhecido: ${id}`);
    return i;
  }

  ligaPorId(id: string): LigaInfo {
    const l = this.ligas.find((x) => x.regras.id === id);
    if (!l) throw new Error(`liga desconhecida: ${id}`);
    return l;
  }

  adicionarClubes(novos: Clube[]) {
    const n0 = this.clubes.length;
    const n = n0 + novos.length;
    const cresce = <T extends Float32Array | Int16Array>(a: T, C: new (n: number) => T): T => {
      const b = new C(n);
      b.set(a);
      return b;
    };
    this.reputacao = cresce(this.reputacao, Float32Array);
    this.ataque = cresce(this.ataque, Float32Array);
    this.defesa = cresce(this.defesa, Float32Array);
    this.liga = cresce(this.liga, Int16Array);
    novos.forEach((c, k) => {
      const i = n0 + k;
      this.clubes.push(c);
      this.porId.set(c.id, i);
      this.reputacao[i] = c.reputacao;
      const l = this.ligas.findIndex((x) => x.regras.id === c.liga);
      this.liga[i] = l;
      if (l >= 0) this.ligas[l].clubes.push(i);
    });
    this.recalcularForca(n0);
  }

  /** Calendário (grupo) de uma liga. */
  grupoDaLiga(l: number): string {
    return this.ligas[l].regras.epoca.calendario;
  }

  /** Força derivada da reputação e da força desportiva da liga (Fase 1, sem jogadores).
   *  `grupo`: só recalcula os clubes das ligas desse calendário (na passagem de época desse calendário). */
  recalcularForca(desde = 0, grupo?: string) {
    for (let i = desde; i < this.clubes.length; i++) {
      const l = this.liga[i];
      if (l < 0) continue;
      const g = this.grupoDaLiga(l);
      if (grupo && g !== grupo) continue;
      const fd = this.ligas[l].regras.forca_desportiva;
      const f = this.reputacao[i] * (FORCA.base + (FORCA.peso_forca_desportiva * fd) / 100);
      // Choque de forma e ruído por época: mudanças de plantel, lesões, treinador.
      const rng = Rng.de(this.semente, 'forca', this.clubes[i].id, `${g}|${this.epocaPorGrupo[g]}`);
      const forma = rng.normal(0, FORCA.choque_forma);
      this.ataque[i] = clamp(f + forma + rng.normal(0, FORCA.ruido_ataque_defesa), 1, 100);
      this.defesa[i] = clamp(f + forma + rng.normal(0, FORCA.ruido_ataque_defesa), 1, 100);
    }
  }

  /** Nº de clubes activos (em alguma liga). */
  activos(): number {
    let n = 0;
    for (let i = 0; i < this.liga.length; i++) if (this.liga[i] >= 0) n++;
    return n;
  }
}

export function construirMundo(d: Dados, op: OpcoesGeracao, epoca = 2026): World {
  const w = new World(op.semente, epoca, d.continental);
  w.modo = op.modo;
  const ctx = w.ctx;
  const pacotes = d.pacotes.filter((p) => p.manifest.activo).sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
  for (const pk of pacotes) {
    const idxs: number[] = [];
    for (const id of pk.manifest.piramide) {
      const regras = pk.ligas.find((l) => l.id === id)!;
      idxs.push(w.ligas.length);
      w.ligas.push({ idx: w.ligas.length, regras, pacote: pk.manifest.id, clubes: [] });
    }
    w.pacotes.push({ manifest: pk.manifest, ligas: idxs, tacas: pk.tacas });
  }
  for (const pk of pacotes) w.adicionarClubes(completarPacote(pk, ctx, op));
  w.recalcularForca();
  w.qualificados = vagasIniciais(w);
  if (op.jogadores !== false) gerarJogadoresMundo(w, d, op.afinar !== false);
  if (op.jogadores !== false && op.economia !== false) iniciarEconomia(w, d);
  return w;
}

/** Gera os plantéis de todos os clubes e aplica as edições de players.csv (manual > real > gerado). */
export function gerarJogadoresMundo(w: World, d: Dados, afinar = true) {
  const st = new PlayerStore(w.clubes.length * 26);
  w.jogadores = st;
  const dia = diaInicioMundo();
  w.plantel = w.clubes.map((c, i) => gerarPlantel(w, st, i, dia, Rng.de(w.semente, 'plantel', c.id)));
  for (const p of d.pacotes) if (p.jogadores?.length) importarLinhas(w, st, p.jogadores);
  w.motor = new MotorMundo(gerarTreinadores(w));
  if (afinar) for (let c = 0; c < w.clubes.length; c++) afinarPlantel(w, c, w.motor.treinadores[c], dia + 40, Rng.de(w.semente, 'afinacao', w.clubes[c].id));
  for (let c = 0; c < w.clubes.length; c++) registarReferencia(w, st, c);
}

/** Economia (Prompt 3): estádios e rivalidades editáveis (estadios.csv, rivalidades.csv) e finanças iniciais (financas.csv). */
export function iniciarEconomia(w: World, d: Dados) {
  for (const p of d.pacotes) {
    for (const e of p.estadios ?? []) {
      const i = w.clubes.findIndex((c) => c.id === e.clube);
      if (i >= 0 && Number(e.capacidade) > 0) { w.clubes[i].capacidade = Number(e.capacidade); if (e.nome) w.clubes[i].estadio = e.nome; }
    }
  }
  w.economia = new Economia(w, d.pacotes.flatMap((p) => p.financas ?? []));
  for (const p of d.pacotes) for (const r of p.rivalidades ?? []) {
    const a = w.clubes.findIndex((c) => c.id === r.clube_a), b = w.clubes.findIndex((c) => c.id === r.clube_b);
    if (a >= 0 && b >= 0) w.economia.rivalidade.set(a < b ? `${a}|${b}` : `${b}|${a}`, Math.max(1, Math.min(3, Number(r.intensidade) || 2)));
  }
}
