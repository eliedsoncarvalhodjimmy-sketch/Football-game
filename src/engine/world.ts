// Estado do mundo em estruturas compactas. Os clubes são indexados por um
// inteiro (0..N-1); os atributos usados na simulação vivem em arrays tipados.
import type { Dados, Continental } from '../data/load.ts';
import type { Clube, Manifest, RegrasLiga, RegrasTaca } from '../data/types.ts';
import { completarPacote, novoContexto, clamp, type OpcoesGeracao, type ContextoGeracao } from '../gen/mundoFicticio.ts';
import { FORCA } from '../config/forca.ts';
import { Rng } from '../core/rng.ts';
import { vagasIniciais } from './season/qualify.ts';

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

  /** Força derivada da reputação e da força desportiva da liga (Fase 1, sem jogadores). */
  recalcularForca(desde = 0) {
    for (let i = desde; i < this.clubes.length; i++) {
      const l = this.liga[i];
      if (l < 0) continue;
      const fd = this.ligas[l].regras.forca_desportiva;
      const f = this.reputacao[i] * (FORCA.base + (FORCA.peso_forca_desportiva * fd) / 100);
      // Choque de forma e ruído por época: mudanças de plantel, lesões, treinador.
      const rng = Rng.de(this.semente, 'forca', this.clubes[i].id, this.epoca);
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
  return w;
}
