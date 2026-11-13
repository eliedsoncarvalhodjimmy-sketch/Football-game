// Liga em execução: calendário fixo (Berger) e classificação.
import type { RegrasLiga } from '../../data/types.ts';
import type { Rng } from '../../core/rng.ts';
import { agendarLiga } from '../calendar/scheduler.ts';
import type { Competicao, JogoR } from './base.ts';
import { Tabela, type LinhaTabela } from './table.ts';

export class CompLiga implements Competicao {
  tipo = 'liga' as const;
  id: string;
  nome: string;
  tabela: Tabela;
  jogos: JogoR[];
  private porSemana = new Map<number, JogoR[]>();
  private registados = 0;
  private final: LinhaTabela[] | null = null;

  constructor(public regras: RegrasLiga, public clubes: number[], rng: Rng, private sal: string, excluirFds: number[] = []) {
    this.id = regras.id;
    this.nome = regras.nome;
    this.tabela = new Tabela(clubes);
    this.jogos = agendarLiga(regras.id, clubes, regras.formato.voltas, regras.epoca.calendario, rng, !!regras.jogam_nas_paragens, excluirFds);
    for (const j of this.jogos) {
      if (!this.porSemana.has(j.semana)) this.porSemana.set(j.semana, []);
      this.porSemana.get(j.semana)!.push(j);
    }
  }

  jogosDaSemana(s: number): JogoR[] {
    return this.porSemana.get(s) ?? [];
  }

  registar(j: JogoR) {
    this.tabela.registar(j.casa, j.fora, j.r!.gc, j.r!.gf);
    this.registados++;
  }

  terminada(): boolean {
    return this.registados === this.jogos.length;
  }

  /** Classificação final (só quando terminada). */
  classificacao(): LinhaTabela[] {
    if (!this.terminada()) throw new Error(`${this.id}: liga ainda não terminou`);
    if (!this.final) this.final = this.tabela.ordenar(this.regras.desempates, this.sal);
    return this.final;
  }

  /** Clube na posição p (1 = primeiro). */
  posicao(p: number): number {
    return this.classificacao()[p - 1].clube;
  }
}
