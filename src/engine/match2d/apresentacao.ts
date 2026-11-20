// Motor 2D táctico — apresentação por lances (secção 2.2, modelo FM): o relógio do ecrã. O motor simula em blocos de
// 5 minutos à frente do que está no ecrã (assim, mudanças futuras — tácticas, substituições — só afectam o que ainda não
// foi simulado); em cada bloco escolhem-se os lances. Dentro de um lance o tempo passa a 1× (ou 0,5×/2×/4×); um golo
// tem replay a 0,5×; entre lances o jogo passa em avanço rápido (16×), ou salta com o relato (Lances-chave).
import { LANCES } from '../../config/match2d/fase5.ts';
import { TICK_S } from '../../config/match2d/fisica.ts';
import { candidatos, seleccionar, duracao, ENTRE_POR_NIVEL, type Lance, type NivelLances } from './lances.ts';
import type { Motor2D } from './Motor2D.ts';
import type { Estatisticas2D } from './tipos.ts';

type Foto = ReturnType<Motor2D['fotografia']>;
export type ModoEcra = 'lance' | 'replay' | 'avanco' | 'relato' | 'fim';

const FIM = Math.round((90 * 60) / TICK_S);
const BLOCO = Math.round((5 * 60) / TICK_S);
/** Os lances de um bloco só se escolhem até 30 s antes do fim dele (uma sequência pode continuar no bloco seguinte). */
const MARGEM = Math.round(30 / TICK_S);

export class Apresentacao {
  readonly lances: Lance[] = [];
  /** Tick mostrado (fraccionário: interpola-se entre fotografias). */
  t = 0;
  modo: ModoEcra = 'lance';
  private fotos = new Map<number, Foto>();
  private estat = new Map<number, Estatisticas2D>();
  private escolhidoAte = 0;
  private replayT: number | null = null;
  private relatoAte = 0;
  private idx = 0;

  constructor(readonly motor: Motor2D, public nivel: NivelLances = 'alargados') {
    this.guardar();
  }

  get simulado() { return this.motor.estado.tick; }

  private guardar() {
    const s = this.motor.estado;
    this.fotos.set(s.tick, this.motor.fotografia());
    if (s.tick % 10 === 0) this.estat.set(s.tick, structuredClone({ ...s.estat, sequencias: [] }));
  }

  /** Simula até `ate` (no máximo `max` ticks nesta chamada) e escolhe os lances dos blocos já completos. */
  simular(ate: number, max = Infinity) {
    let n = 0;
    while (this.simulado < Math.min(ate, FIM) && n < max) { this.motor.passo(); this.guardar(); n++; }
    // Blocos completos: [escolhidoAte, fimBloco − margem] (o último vai até ao fim do jogo).
    while (true) {
      const fimBloco = Math.min(FIM, (Math.floor((this.escolhidoAte + MARGEM) / BLOCO) + 1) * BLOCO);
      const limite = fimBloco >= FIM ? FIM : fimBloco - MARGEM;
      if (this.simulado < (fimBloco >= FIM ? FIM : fimBloco) || limite <= this.escolhidoAte) break;
      const cands = candidatos(this.motor.registo, this.motor.posses, limite + MARGEM);
      // O último bloco inclui o próprio fim (um golo aos 90:00).
      // Controlador do orçamento: este bloco recebe a parte proporcional do que ainda falta dos 15 min (o que já se gastou
      // a mais ou a menos nos blocos anteriores compensa-se aqui).
      const gasto = duracao(this.lances, 0, this.escolhidoAte, ENTRE_POR_NIVEL[this.nivel]).duracao_s;
      const alvo = (LANCES.orcamento_min * 60 - gasto) * (limite - this.escolhidoAte) / Math.max(1, FIM - this.escolhidoAte);
      const sel = seleccionar(cands, this.nivel, this.escolhidoAte, limite >= FIM ? FIM + 1 : limite, this.nivel === 'alargados' ? Math.max(0, alvo) : undefined);
      for (const l of sel.lances) if (!this.lances.some((x) => x.inicio <= l.momento && l.momento <= x.fim)) this.lances.push({ ...l, inicio: Math.max(l.inicio, this.lances.length ? this.lances[this.lances.length - 1].fim : 0) });
      this.lances.sort((a, b) => a.inicio - b.inicio);
      this.escolhidoAte = limite;
    }
  }

  /** Quanto falta simular à frente para o ecrã nunca parar (1,5 blocos). */
  precisaSimular() { return this.simulado < Math.min(FIM, Math.floor(this.t) + 1.5 * BLOCO) || this.escolhidoAte < Math.min(FIM, this.t + BLOCO / 2); }

  /** Lance actual (ou o próximo). */
  lanceActual(): Lance | null {
    while (this.idx < this.lances.length && this.lances[this.idx].fim < this.t) this.idx++;
    return this.lances[this.idx] ?? null;
  }

  /**
   * Avança o relógio do ecrã `dt` segundos reais à velocidade `vel` (1× = tempo real dentro dos lances).
   * Devolve o modo: lance, replay (0,5×), avanço rápido (16×) ou relato (salto com o texto).
   */
  avancar(dt: number, vel: number): ModoEcra {
    if (this.t >= FIM) return (this.modo = 'fim');
    const tps = 1 / TICK_S;
    if (this.nivel === 'completo') { this.t = Math.min(FIM, this.t + dt * tps * vel); return (this.modo = 'lance'); }
    if (this.replayT !== null) {
      const l = this.lanceActual()!;
      this.replayT += dt * tps * LANCES.replay_vel * vel;
      if (this.replayT >= l.replay!.fim) { this.replayT = null; this.t = l.fim + 1; this.idx++; }
      return (this.modo = 'replay');
    }
    const l = this.lanceActual();
    if (l && this.t >= l.inicio) {
      this.t += dt * tps * vel;
      if (this.t > l.fim) {
        if (l.replay) { this.replayT = l.replay.inicio; this.t = l.fim; return (this.modo = 'replay'); }
        this.idx++;
      }
      return (this.modo = 'lance');
    }
    // Entre lances.
    const proximo = l ? l.inicio : this.escolhidoAte >= FIM ? FIM : this.escolhidoAte;
    if (ENTRE_POR_NIVEL[this.nivel] === 'relato') {
      if (!this.relatoAte) this.relatoAte = performanceAgora() + LANCES.relato_s * 1000;
      if (performanceAgora() >= this.relatoAte) { this.relatoAte = 0; this.t = proximo; }
      return (this.modo = 'relato');
    }
    this.t = Math.min(proximo, this.t + dt * tps * LANCES.avanco_rapido);
    return (this.modo = 'avanco');
  }

  /** Tick que se está a desenhar (no replay, o do replay). */
  get tickEcra() { return this.replayT ?? this.t; }

  /** Fotografias para interpolar e a fracção entre elas. */
  fotosEcra(): { ant: Foto; act: Foto; alfa: number } | null {
    const t = Math.min(this.tickEcra, this.simulado), k = Math.floor(t);
    const act = this.fotos.get(Math.min(k + 1, this.simulado)) ?? this.fotos.get(k), ant = this.fotos.get(k) ?? act;
    if (!act || !ant) return null;
    // Esquece o que já passou (mantém uns segundos para o replay).
    if (this.fotos.size > 4 * BLOCO) for (const key of this.fotos.keys()) { if (key < k - 2 * BLOCO) this.fotos.delete(key); else break; }
    return { ant, act, alfa: t - k };
  }

  /** Estatísticas como estavam no tick mostrado (o ecrã nunca mostra o futuro). */
  estatisticas(): Estatisticas2D | null {
    const k = Math.floor(Math.min(this.t, this.simulado) / 10) * 10;
    return this.estat.get(k) ?? null;
  }
}

const performanceAgora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
