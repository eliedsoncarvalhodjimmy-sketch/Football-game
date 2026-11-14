// Ponto de entrada do motor. O mundo avança semana a semana por data real
// (segundas-feiras). Cada calendário ("ago_mai", "ano_civil") tem a sua época a
// decorrer; quando uma termina, fecha-se (passagem de época desse calendário) e
// abre-se a seguinte. As ligas de ano civil começam em 2027 (decisão do utilizador).
import { JOVEM_TITULAR, ANCORA_EVOLUCAO } from '../config/academia.ts';
import type { World } from './world.ts';
import { Temporada } from './season/temporada.ts';
import { fecharEpoca } from './season/rollover.ts';
import { podar, type RegistoEpoca } from './history.ts';
import { baseDias } from './calendar/datas.ts';
import type { JogoR } from './competitions/base.ts';
import { evoluirMes, parteMinutosPorOrdem } from '../players/evolucao.ts';
import { MOTOR } from '../config/motor.ts';
import { EVOLUCAO } from '../config/evolucao.ts';

export interface InicioEpoca {
  grupo: string;
  epoca: number;
  liga: string;
  /** Favoritos pela reputação no início da época. */
  top1: number;
  top3: number[];
}

export class Simulador {
  historico: RegistoEpoca[] = [];
  /** Época a decorrer em cada calendário. */
  temporadas = new Map<string, Temporada>();
  /** Segunda-feira actual (dia absoluto). */
  segunda: number;
  /** Favoritos registados no início de cada época (para as métricas de realismo). */
  inicios: InicioEpoca[] = [];
  /** Chamado ao fechar cada época (antes de abrir a seguinte). */
  aoFechar?: (t: Temporada, r: RegistoEpoca) => void;

  constructor(public w: World, private guardarJogos = true) {
    const grupos = [...new Set(w.ligas.map((l) => l.regras.epoca.calendario))];
    for (const g of grupos) this.abrir(g, w.epocaPorGrupo[g] ?? w.epoca);
    this.segunda = baseDias(w.epoca, 'ago_mai');
    if (w.economia) w.economia.temporadas = this.temporadas;
  }

  /** Época do calendário de Agosto–Maio (compatibilidade com testes e relatórios). */
  get temporada(): Temporada {
    return this.temporadas.get('ago_mai')!;
  }

  private abrir(grupo: string, ano: number) {
    const t = new Temporada(this.w, grupo, ano);
    this.temporadas.set(grupo, t);
    this.w.economia?.abrirEpoca(t);
    for (const [id, c] of t.ligas) {
      const fav = [...c.clubes].sort((x, y) => this.w.reputacao[y] - this.w.reputacao[x]);
      this.inicios.push({ grupo, epoca: ano, liga: id, top1: fav[0], top3: fav.slice(0, 3) });
    }
  }

  /** Simula uma semana do mundo. Devolve os jogos jogados (de todos os calendários). */
  simularSemana(): JogoR[] {
    const out: JogoR[] = [];
    // Evolução mensal dos jogadores no 1.º dia de cada mês (se calhar nesta semana).
    const st = this.w.jogadores;
    if (st) {
      for (let d = this.segunda; d < this.segunda + 7; d++) {
        // Juniores (Bloco C): evoluem a meio do mês, numa semana mais leve do que a do dia 1.
        const ac0 = this.w.academia;
        if (ac0 && new Date(d * 86400000).getUTCDate() === 15) {
          evoluirMes(this.w, st, d, { parteMinutos: (i) => ac0.minutos(i), desenvolvimentoTreinador: (c) => ac0.desenvolvimento(c) + (this.w.economia?.bonusTreino(c) ?? 0) }, (i) => ac0.escalao[i] !== 0);
          ac0.aplicarTeto(d);
        }
        // Mercado mensal (renovações, listagens, índices) no dia 8: não se soma à evolução e à economia do dia 1.
        if (new Date(d * 86400000).getUTCDate() === 8) this.w.mercado?.mes(d);
        if (new Date(d * 86400000).getUTCDate() === 1) {
          const m = this.w.motor;
          const comMinutos = m && MOTOR.modo_forca === 'onze';
          const ac = this.w.academia;
          const pm = comMinutos ? (i: number) => Math.min(1, st.minMes[i] / EVOLUCAO.minutos_mes_referencia) : parteMinutosPorOrdem(this.w, st);
          const dev = m ? (c: number, j?: number) => (m.treinadores[c]?.atributos.desenvolvimento ?? 10) + (this.w.economia?.bonusTreino(c) ?? 0) + (j !== undefined && st.posNat[j] === 0 && this.w.economia?.staff.porClube[c] ? this.w.economia.staff.bonusGR(c) : 0) : () => 10;
          // Bloco C: o jovem titular numa liga competitiva evolui mais depressa; a âncora da liga trava a deriva dos seniores.
          const w = this.w;
          const fdL = (c: number) => (w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.forca_desportiva : 30);
          evoluirMes(this.w, st, d, {
            parteMinutos: pm, desenvolvimentoTreinador: dev,
            multCrescimento: (i) => { const p = pm(i); if (p < JOVEM_TITULAR.minutos_minimos || st.idade(i, d) > JOVEM_TITULAR.idade_maxima) return 1; return 1 + JOVEM_TITULAR.bonus * p * (fdL(st.clube[i]) / 100) * (0.8 + (0.4 * st.moral[i]) / 20); },
            ajuste: ac ? (i) => -ANCORA_EVOLUCAO.ganho * ac.derivaLiga(st.clube[i], d) : undefined,
          }, ac ? (i) => ac.escalao[i] === 0 : undefined);
          ac?.aplicarTeto(d);
          st.minMes.fill(0);
          m?.cache.limpar();
          this.w.economia?.mes(d);
          this.w.academia?.mes(d);
        }
      }
    }
    this.w.motor?.semana();
    for (const [g, t] of [...this.temporadas]) {
      const local = Math.round((this.segunda - t.base) / 7);
      if (local < 0) continue; // ainda não começou (ex.: ano civil antes de Janeiro de 2027)
      while (t.semana < Math.min(local, 52)) t.simularSemana(); // segurança: não salta semanas
      if (local < 52 && t.semana === local) out.push(...t.simularSemana());
      if (t.semana >= 52) this.fechar(g, t);
    }
    this.w.economia?.semana(this.segunda, out);
    this.w.mercado?.semana(this.segunda, out);
    this.segunda += 7;
    return out;
  }

  /** Simula até fechar a próxima época do calendário indicado (por defeito Agosto–Maio). */
  simularEpoca(grupo = 'ago_mai'): RegistoEpoca {
    const n = this.historico.filter((r) => r.grupo === grupo).length;
    while (this.historico.filter((r) => r.grupo === grupo).length === n) this.simularSemana();
    return [...this.historico].reverse().find((r) => r.grupo === grupo)!;
  }

  /** Simula até haver `n` épocas fechadas em todos os calendários. */
  simularEpocas(n: number) {
    const grupos = [...this.temporadas.keys()];
    while (grupos.some((g) => this.historico.filter((r) => r.grupo === g).length < n)) this.simularSemana();
  }

  private fechar(grupo: string, t: Temporada): RegistoEpoca {
    const reg = fecharEpoca(this.w, t, this.guardarJogos, this.historico);
    this.historico.push(reg);
    podar(this.historico, this.w.epoca);
    this.w.economia?.fecharEpoca(t, reg);
    this.aoFechar?.(t, reg);
    this.abrir(grupo, t.ano + 1);
    return reg;
  }
}
