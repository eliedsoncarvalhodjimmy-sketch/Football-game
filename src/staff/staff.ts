// Staff (cargos do utilizador): academia, recrutamento, equipa técnica, direcção financeira e comercial. Cada membro tem os
// atributos do seu cargo (1–20) e um "nivel" (a média) para salário e mercado. Gerado por clube; editável em staff.csv.
import { Rng } from '../core/rng.ts';
import { CARGOS, STAFF as S, EFEITOS_STAFF as EF, type Cargo } from '../config/staff.ts';
import { CARGO_POR_ID, AREAS_COACH, type AtributoStaff } from '../config/cargos.ts';
import { ESTILOS_IDS, ESTILO_POR_ID, type IdEstilo } from '../config/estilos.ts';
import { nomePessoa } from '../players/nomesPessoas.ts';
import type { World } from '../engine/world.ts';
import type { Treinador } from '../coaches/store.ts';
import type { AtributoTreinador } from '../config/treinadores.ts';

export interface MembroStaff {
  id: string;
  nome: string;
  cargo: Cargo;
  nivel: number;
  /** Atributos do cargo (1–20); "estilo" fica em `estilo`. */
  atributos: Partial<Record<AtributoStaff, number>>;
  /** Treinadores (assistente, sub-21, sub-18): estilo e esquema preferidos. */
  estilo?: { estilo: IdEstilo; esquema: string };
  /** Coach: área de treino. */
  area?: (typeof AREAS_COACH)[number];
  salario: number;
  contratoFim: number;
  clube: number;
  idade: number;
  origem: 'gerado' | 'real' | 'manual';
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
/** Atributo do treinador principal → atributo correspondente do assistente. */
const DO_ASSISTENTE: Record<AtributoTreinador, AtributoStaff> = { tactica: 'conhecimento_tactico', motivacao: 'motivacao', desenvolvimento: 'treino', disciplina: 'disciplina', adaptabilidade: 'flexibilidade', gestao: 'gestao_pessoas', jovens: 'trabalho_jovens' };
const POS_AREA: Record<string, number[]> = { ataque: [6, 7, 8, 9, 10, 11], defesa: [0, 1, 2, 3, 4, 5], posse: [5, 6, 7, 8] };

export class StaffMundo {
  porClube: MembroStaff[][] = [];
  livres: MembroStaff[] = [];
  private seq = 0;

  constructor(public w: World) {}

  salario(c: number, cargo: Cargo, nivel: number, receita: number): number {
    return Math.max(S.salario_minimo, Math.round((receita * S.peso_salario[cargo] * (0.5 + nivel / 20)) / 1000) * 1000);
  }

  gerarMembro(cargo: Cargo, rep: number, pais: string, rng: Rng, dia: number, c: number, receita: number): MembroStaff {
    const base = clamp(S.nivel_base + (S.nivel_por_reputacao * rep) / 100 + rng.normal(0, S.desvio), 1, 20);
    const atributos: Partial<Record<AtributoStaff, number>> = {};
    for (const a of CARGO_POR_ID[cargo].atributos) if (a !== 'estilo') atributos[a] = clamp(Math.round(rng.normal(base, S.desvio_atributo)), 1, 20);
    const vals = Object.values(atributos) as number[];
    const nivel = clamp(Math.round(vals.reduce((t, x) => t + x, 0) / vals.length), 1, 20);
    const m: MembroStaff = { id: `st${++this.seq}`, nome: nomePessoa(pais, rng), cargo, nivel, atributos, salario: c >= 0 ? this.salario(c, cargo, nivel, receita) : 0,
      contratoFim: dia + rng.int(S.anos[0], S.anos[1]) * 365, clube: c, idade: rng.int(28, 64), origem: 'gerado' };
    if (CARGO_POR_ID[cargo].atributos.includes('estilo')) { const e = ESTILOS_IDS[rng.int(0, ESTILOS_IDS.length - 1)]; m.estilo = { estilo: e, esquema: ESTILO_POR_ID[e].esquemas[rng.int(0, 2)] }; }
    if (cargo === 'coach') m.area = AREAS_COACH[rng.int(0, AREAS_COACH.length - 1)];
    return m;
  }

  /** Quantos membros de um cargo: olheiros pelo nível do Recrutamento (1 por cada 2 níveis, máx. 5); olheiros de jovens pela reputação; o resto 1. */
  quantos(cargo: Cargo, rep: number, recrutamento: number): number {
    if (cargo === 'olheiro') return clamp(Math.ceil(recrutamento / S.olheiros_por_niveis), 1, S.olheiros_max);
    if (cargo === 'olheiro_jovens') return Math.min(S.olheiros_jovens_max, Math.floor(rep / S.olheiros_jovens_reputacao));
    return 1;
  }

  /** Staff de um clube. `recrutamento`: nível da infraestrutura de recrutamento (1–10). */
  gerarClube(c: number, dia: number, receita: number, recrutamento?: number) {
    const w = this.w;
    const rng = Rng.de(w.semente, 'staff', w.clubes[c].id);
    const rep = w.reputacao[c];
    const recr = recrutamento ?? clamp(Math.round(1 + rep / 12), 1, 10);
    const out: MembroStaff[] = [];
    for (const cargo of CARGOS) for (let k = 0; k < this.quantos(cargo, rep, recr); k++) out.push(this.gerarMembro(cargo, rep, w.clubes[c].pais, rng, dia, c, receita));
    this.porClube[c] = out;
  }

  gerarLivres(dia: number, n = S.livres) {
    const w = this.w;
    const rng = Rng.de(w.semente, 'staff-livres', dia);
    for (let k = 0; k < n; k++) {
      const modelo = rng.int(0, w.clubes.length - 1);
      this.livres.push(this.gerarMembro(CARGOS[rng.int(0, CARGOS.length - 1)], w.reputacao[modelo], w.clubes[modelo].pais, rng, dia, -1, 0));
    }
  }

  custo(c: number): number {
    let s = 0;
    for (const m of this.porClube[c] ?? []) s += m.salario;
    return s;
  }

  membros(c: number, cargo: Cargo): MembroStaff[] {
    return (this.porClube[c] ?? []).filter((m) => m.cargo === cargo);
  }

  /** Nível do cargo no clube (o melhor; olheiros: a média). 6 se não houver ninguém. */
  nivel(c: number, cargo: Cargo): number {
    const ms = this.membros(c, cargo);
    if (!ms.length) return 6;
    return cargo === 'olheiro' || cargo === 'olheiro_jovens' ? ms.reduce((s, m) => s + m.nivel, 0) / ms.length : Math.max(...ms.map((m) => m.nivel));
  }

  /** Atributo de um cargo (o melhor membro); `def` se não houver ninguém. */
  atr(c: number, cargo: Cargo, a: AtributoStaff, def = 6): number {
    const ms = this.membros(c, cargo);
    return ms.length ? Math.max(...ms.map((m) => m.atributos[a] ?? m.nivel)) : def;
  }

  // ---------------------------------------------------------------- efeitos (limitados)

  /** Atributo do treinador com o assistente: as fraquezas abaixo do atributo correspondente do assistente sobem uma fracção. */
  atributoTreinador(c: number, t: Treinador, a: AtributoTreinador): number {
    const adj = this.atr(c, 'treinador_assistente', DO_ASSISTENTE[a]);
    const v = t.atributos[a];
    return v < adj ? v + EF.adjunto * (adj - v) : v;
  }

  /** Bónus de desenvolvimento dos guarda-redes (treino de guarda-redes). */
  bonusGR(c: number): number {
    return EF.treinador_gr * (this.atr(c, 'treinador_gr', 'treino_gr') - 10);
  }

  /** Bónus do coach à evolução dos jogadores da sua área (pontos de desenvolvimento), pela posição natural. */
  bonusCoach(c: number, posNat: number): number {
    const m = this.membros(c, 'coach')[0];
    if (!m || !m.area || m.area === 'tactica' || !POS_AREA[m.area].includes(posNat)) return 0;
    return EF.coach_area_evolucao * ((m.atributos.treino_area ?? 10) - 10);
  }

  /** Factor da taxa de lesões: prevenção (o melhor entre o preparador físico e o fisioterapeuta). */
  factorTaxaLesao(c: number): number {
    const p = Math.max(this.atr(c, 'preparador_fisico', 'prevencao_lesoes'), this.atr(c, 'fisioterapeuta', 'prevencao_lesoes'));
    return clamp(1 - EF.preparador_fisico * (p - 10), 1 - EF.limite, 1 + EF.limite);
  }

  /** Factor dos dias de lesão: fisioterapia e recuperação de lesões do fisioterapeuta. */
  factorDiasLesao(c: number): number {
    const v = (this.atr(c, 'fisioterapeuta', 'fisioterapia') + this.atr(c, 'fisioterapeuta', 'recuperacao_lesoes')) / 2;
    return clamp(1 - EF.medico * (v - 10), 1 - EF.limite, 1 + EF.limite);
  }

  /** Coach na área "Táctica": soma à parcela do treinador (substitui o antigo analista). */
  bonusAnalista(c: number): number {
    const m = this.membros(c, 'coach')[0];
    return m?.area === 'tactica' ? EF.coach_tactica * ((m.atributos.treino_area ?? 10) - 10) : 0;
  }

  /** Coordenação da academia: chefe de desenvolvimento juvenil (trabalho com jovens) e treinadores do sub-21 e sub-18 (treino). */
  coordenacaoAcademia(c: number): number {
    return 0.5 * this.atr(c, 'chefe_juvenil', 'trabalho_jovens', 10) + 0.25 * this.atr(c, 'treinador_sub21', 'treino', 10) + 0.25 * this.atr(c, 'treinador_sub18', 'treino', 10);
  }

  // ---------------------------------------------------------------- mercado (anual)

  /**
   * Fim de época do clube: contratos que acabam renovam (se o orçamento deixar) e a IA tenta melhorar um cargo,
   * com alguém livre ou de um clube mais pequeno (pagando a compensação ao clube de origem).
   */
  epoca(c: number, dia: number, receita: number, orcamento: number, rng: Rng, pagar: (clube: number, valor: number, origem?: number) => void): MembroStaff | null {
    const ms = this.porClube[c] ?? [];
    for (const m of ms) if (m.contratoFim <= dia) { m.contratoFim = dia + rng.int(S.anos[0], S.anos[1]) * 365; m.salario = this.salario(c, m.cargo, m.nivel, receita); }
    for (const m of ms) m.idade++;
    const folga = orcamento - this.custo(c);
    if (folga <= 0 || !rng.chance(S.prob_melhoria)) return null;
    // O cargo mais fraco (excepto scouts).
    const fraco = ms.filter((m) => m.cargo !== 'olheiro' && m.cargo !== 'olheiro_jovens').sort((a, b) => a.nivel - b.nivel)[0];
    if (!fraco) return null;
    const rep = this.w.reputacao[c];
    let melhor: { m: MembroStaff; origem: number } | null = null;
    for (const m of this.livres) if (m.cargo === fraco.cargo && m.nivel >= fraco.nivel + S.melhoria_minima && (!melhor || m.nivel > melhor.m.nivel)) melhor = { m, origem: -1 };
    if (!melhor && rng.chance(0.3)) {
      // Staff de um clube mais pequeno (amostra).
      for (let k = 0; k < 40; k++) {
        const o = rng.int(0, this.porClube.length - 1);
        if (o === c || this.w.reputacao[o] > rep - 5) continue;
        const m = (this.porClube[o] ?? []).find((x) => x.cargo === fraco.cargo && x.nivel >= fraco.nivel + S.melhoria_minima);
        if (m && (!melhor || m.nivel > melhor.m.nivel)) melhor = { m, origem: o };
      }
    }
    if (!melhor) return null;
    const sal = this.salario(c, melhor.m.cargo, melhor.m.nivel, receita);
    const comp = melhor.origem >= 0 ? S.compensacao * melhor.m.salario : 0;
    if (sal - fraco.salario + comp > folga) return null;
    if (melhor.origem >= 0) {
      this.porClube[melhor.origem] = this.porClube[melhor.origem].filter((x) => x !== melhor!.m);
      pagar(c, comp, melhor.origem);
      // O clube de origem repõe o cargo com alguém livre (ou gerado).
      this.porClube[melhor.origem].push(this.gerarMembro(melhor.m.cargo, this.w.reputacao[melhor.origem] - 10, this.w.clubes[melhor.origem].pais, rng, dia, melhor.origem, receita * 0.3));
    } else this.livres = this.livres.filter((x) => x !== melhor!.m);
    // O substituído vai para os livres.
    this.porClube[c] = ms.filter((x) => x !== fraco);
    fraco.clube = -1; fraco.salario = 0;
    this.livres.push(fraco);
    const novo = { ...melhor.m, clube: c, salario: sal, contratoFim: dia + rng.int(S.anos[0], S.anos[1]) * 365 };
    this.porClube[c].push(novo);
    return novo;
  }

  /** Reforma do staff livre muito velho e reposição da reserva. */
  repor(dia: number) {
    this.livres = this.livres.filter((m) => m.idade < 68);
    for (const m of this.livres) m.idade++;
    if (this.livres.length < S.livres) this.gerarLivres(dia, S.livres - this.livres.length);
  }

  bytes(): number {
    return (this.porClube.reduce((s, x) => s + (x?.length ?? 0), 0) + this.livres.length) * 120;
  }
}

/** staff.csv: id, nome, funcao (cargo), clube, nivel, salario, origem e, opcionalmente, uma coluna por atributo do cargo. */
export function aplicarStaffCsv(sm: StaffMundo, w: World, linhas: Record<string, string>[], dia: number) {
  for (const l of linhas) {
    const c = w.clubes.findIndex((x) => x.id === l.clube);
    const cargo = l.funcao as Cargo;
    if (c < 0 || !CARGOS.includes(cargo)) continue;
    const ms = sm.porClube[c] ?? [];
    const i = ms.findIndex((m) => m.cargo === cargo && m.origem === 'gerado');
    const m: MembroStaff = {
      id: l.id || `${l.clube}_${cargo}`, nome: l.nome || cargo, cargo, nivel: clamp(Number(l.nivel) || 10, 1, 20),
      atributos: Object.fromEntries(CARGO_POR_ID[cargo].atributos.filter((a) => a !== 'estilo').map((a) => [a, clamp(Number(l[a]) || Number(l.nivel) || 10, 1, 20)])), salario: Number(l.salario) || (i >= 0 ? ms[i].salario : 0),
      contratoFim: dia + 2 * 365, clube: c, idade: Number(l.idade) || 45, origem: l.origem === 'real' ? 'real' : 'manual',
    };
    if (i >= 0) ms[i] = m; else ms.push(m);
    sm.porClube[c] = ms;
  }
}
