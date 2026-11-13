// Staff (Prompt 3, Bloco C): adjunto, treinador de GR, preparador físico, médico, scouts, coordenador da academia, analista.
// Gerado por clube (nível pela reputação, salário pelo nível e pela riqueza do clube); editável em staff.csv.
import { Rng } from '../core/rng.ts';
import { CARGOS, STAFF as S, EFEITOS_STAFF as EF, type Cargo } from '../config/staff.ts';
import { nomePessoa } from '../players/nomesPessoas.ts';
import type { World } from '../engine/world.ts';
import type { Treinador } from '../coaches/store.ts';
import type { AtributoTreinador } from '../config/treinadores.ts';

export interface MembroStaff {
  id: string;
  nome: string;
  cargo: Cargo;
  nivel: number;
  salario: number;
  contratoFim: number;
  clube: number;
  idade: number;
  origem: 'gerado' | 'real' | 'manual';
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export class StaffMundo {
  porClube: MembroStaff[][] = [];
  livres: MembroStaff[] = [];
  private seq = 0;

  constructor(public w: World) {}

  salario(c: number, cargo: Cargo, nivel: number, receita: number): number {
    return Math.max(S.salario_minimo, Math.round((receita * S.peso_salario[cargo] * (0.5 + nivel / 20)) / 1000) * 1000);
  }

  gerarMembro(cargo: Cargo, rep: number, pais: string, rng: Rng, dia: number, c: number, receita: number): MembroStaff {
    const nivel = clamp(Math.round(S.nivel_base + (S.nivel_por_reputacao * rep) / 100 + rng.normal(0, S.desvio)), 1, 20);
    const anos = rng.int(S.anos[0], S.anos[1]);
    return {
      id: `st${++this.seq}`, nome: nomePessoa(pais, rng), cargo, nivel, salario: c >= 0 ? this.salario(c, cargo, nivel, receita) : 0,
      contratoFim: dia + anos * 365, clube: c, idade: rng.int(28, 64), origem: 'gerado',
    };
  }

  /** Staff de um clube: um de cada cargo, scouts pela reputação, analista nos clubes maiores. */
  gerarClube(c: number, dia: number, receita: number) {
    const w = this.w;
    const rng = Rng.de(w.semente, 'staff', w.clubes[c].id);
    const rep = w.reputacao[c];
    const out: MembroStaff[] = [];
    for (const cargo of CARGOS) {
      if (cargo === 'analista' && rep < S.analista_reputacao) continue;
      const n = cargo === 'scout' ? Math.min(S.scouts_max, 1 + Math.floor(rep / S.scouts_por_reputacao)) : 1;
      for (let k = 0; k < n; k++) out.push(this.gerarMembro(cargo, rep, w.clubes[c].pais, rng, dia, c, receita));
    }
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

  /** Custo anual do staff técnico do clube. */
  custo(c: number): number {
    let s = 0;
    for (const m of this.porClube[c] ?? []) s += m.salario;
    return s;
  }

  /** Nível do cargo no clube (o melhor; scouts: a média). 10 se não houver ninguém. */
  nivel(c: number, cargo: Cargo): number {
    const ms = (this.porClube[c] ?? []).filter((m) => m.cargo === cargo);
    if (!ms.length) return cargo === 'analista' ? 10 : 6;
    return cargo === 'scout' ? ms.reduce((s, m) => s + m.nivel, 0) / ms.length : Math.max(...ms.map((m) => m.nivel));
  }

  // ---------------------------------------------------------------- efeitos (limitados)

  /** Atributo do treinador com o adjunto: as fraquezas abaixo do nível do adjunto sobem uma fracção da diferença. */
  atributoTreinador(c: number, t: Treinador, a: AtributoTreinador): number {
    const adj = this.nivel(c, 'adjunto');
    const v = t.atributos[a];
    return v < adj ? v + EF.adjunto * (adj - v) : v;
  }

  /** Bónus de desenvolvimento dos guarda-redes (pontos). */
  bonusGR(c: number): number {
    return EF.treinador_gr * (this.nivel(c, 'treinador_gr') - 10);
  }

  /** Factor da taxa de lesões (preparador físico). */
  factorTaxaLesao(c: number): number {
    return clamp(1 - EF.preparador_fisico * (this.nivel(c, 'preparador_fisico') - 10), 1 - EF.limite, 1 + EF.limite);
  }

  /** Factor dos dias de lesão (médico). */
  factorDiasLesao(c: number): number {
    return clamp(1 - EF.medico * (this.nivel(c, 'medico') - 10), 1 - EF.limite, 1 + EF.limite);
  }

  /** Bónus do analista (fracção da força, dentro da parcela do treinador). */
  bonusAnalista(c: number): number {
    return EF.analista * (this.nivel(c, 'analista') - 10);
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
    const fraco = ms.filter((m) => m.cargo !== 'scout').sort((a, b) => a.nivel - b.nivel)[0];
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

/** staff.csv: id, nome, funcao (cargo), clube, nivel, salario, origem. Os do utilizador substituem o cargo gerado do clube. */
export function aplicarStaffCsv(sm: StaffMundo, w: World, linhas: Record<string, string>[], dia: number) {
  for (const l of linhas) {
    const c = w.clubes.findIndex((x) => x.id === l.clube);
    const cargo = l.funcao as Cargo;
    if (c < 0 || !CARGOS.includes(cargo)) continue;
    const ms = sm.porClube[c] ?? [];
    const i = ms.findIndex((m) => m.cargo === cargo && m.origem === 'gerado');
    const m: MembroStaff = {
      id: l.id || `${l.clube}_${cargo}`, nome: l.nome || cargo, cargo, nivel: clamp(Number(l.nivel) || 10, 1, 20), salario: Number(l.salario) || (i >= 0 ? ms[i].salario : 0),
      contratoFim: dia + 2 * 365, clube: c, idade: Number(l.idade) || 45, origem: l.origem === 'real' ? 'real' : 'manual',
    };
    if (i >= 0) ms[i] = m; else ms.push(m);
    sm.porClube[c] = ms;
  }
}
