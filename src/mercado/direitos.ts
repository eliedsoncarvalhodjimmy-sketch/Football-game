// Direitos futuros sobre jogadores (Prompt 6, Bloco A): % de venda futura e recompra a preço fixo.
// Uma só estrutura por jogador (substitui as antigas tabelas `recompra` e `vendaFutura`) e uma só liquidação, chamada
// por todas as saídas com preço (transferência, cláusula de rescisão, opção/obrigação de compra de empréstimo, venda
// forçada, negócios do utilizador, troca com dinheiro).
//
// Regras (decisões do utilizador):
//   - venda futura: % sobre o PREÇO da venda seguinte; soma das % activas por jogador ≤ 50%; paga UMA vez — na venda
//     seguinte com preço todas as cláusulas pagam e extinguem-se; caduca ao fim de 5 anos sem venda;
//   - recompra: preço fixo (1,3–2,0 × o preço pago), válida 1–2 anos; quando o vendedor aceita uma oferta de outro clube,
//     o titular é notificado e tem 3–5 dias para a exercer; recusada (ou sem resposta), o direito extingue-se;
//   - o dinheiro dos beneficiários sai do valor da transferência (o vendedor recebe o líquido), nas mesmas datas das
//     parcelas; o titular recebe sempre (com ou sem liga, em administração); o próprio comprador não se paga a si mesmo.
import { DIREITOS as D, ESTATUTOS } from '../config/contratosJogador.ts';
import { VALOR as V } from '../config/valor.ts';
import { aleatorio } from '../engine/decision/rng.ts';
import type { World } from '../engine/world.ts';
import type { Contratos } from './contratos.ts';

export type TipoDireito = 'venda_futura' | 'recompra';
export interface Direito {
  id: number;
  tipo: TipoDireito;
  /** Clube titular. */
  clube: number;
  /** Venda futura: fracção do preço (0,1–0,25). Recompra: preço fixo (€). */
  pct: number;
  preco: number;
  /** Válido até este dia. */
  ate: number;
  /** Dia em que nasceu e o preço da transferência de origem. */
  desde: number;
  origem: number;
}

/** Um pagamento a fazer numa saída com preço: a quem e que fracção do preço. */
export interface Partilha { clube: number; fraccao: number; direito: number }

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const logistica = (x: number) => 1 / (1 + Math.exp(-x));

/** Contagens da auditoria (por época e por liga do titular). */
export interface ContagemDireitos { criados: number; pagos: number; caducados: number; recomprasExercidas: number; recomprasRecusadas: number; euros: number }
const vazia = (): ContagemDireitos => ({ criados: 0, pagos: 0, caducados: 0, recomprasExercidas: 0, recomprasRecusadas: 0, euros: 0 });

export class Direitos {
  porJogador = new Map<number, Direito[]>();
  private seq = 0;
  /** Auditoria: contagens por época ("2026") e por liga do titular (id da liga, ou "sem liga"). */
  porEpoca = new Map<string, ContagemDireitos>();
  porLiga = new Map<string, ContagemDireitos>();
  /** Direitos já pagos ou extintos (para garantir que ninguém recebe duas vezes). */
  extintos = new Set<number>();
  /** Quem já recebeu venda futura por um jogador ("jogador|clube"): nunca volta a receber por ele. */
  recebeu = new Set<string>();
  /** Liga a verificação das invariantes em cada negócio (testes e auditoria). */
  verificar = false;
  erros: string[] = [];

  constructor(private w: World) {}

  de(j: number): Direito[] { return this.porJogador.get(j) ?? []; }
  vendaFuturaActiva(j: number): number { return this.de(j).filter((d) => d.tipo === 'venda_futura').reduce((a, d) => a + d.pct, 0); }
  recompra(j: number, dia: number): Direito | null { return this.de(j).find((d) => d.tipo === 'recompra' && d.ate >= dia) ?? null; }

  private contar(d: Direito, dia: number, f: (c: ContagemDireitos) => void) {
    const ep = String(new Date(dia * 864e5).getUTCFullYear());
    const l = this.w.liga[d.clube];
    const liga = l >= 0 ? this.w.ligas[l].regras.id : 'sem liga';
    for (const [m, k] of [[this.porEpoca, ep], [this.porLiga, liga]] as const) { if (!m.has(k)) m.set(k, vazia()); f(m.get(k)!); }
  }

  /** Acrescenta um direito (a venda futura é cortada ao que sobra do limite de 50%; abaixo do mínimo não nasce). */
  criar(j: number, tipo: TipoDireito, clube: number, valor: number, dia: number, origem: number, anos: number): Direito | null {
    let pct = 0, preco = 0;
    if (tipo === 'venda_futura') {
      if (this.recebeu.has(`${j}|${clube}`)) return null; // já recebeu por este jogador: perdeu o direito para sempre
      pct = Math.min(valor, Math.round((D.venda_futura.limite - this.vendaFuturaActiva(j)) * 100) / 100);
      if (pct < 0.05 - 1e-9) return null;
    } else {
      if (this.recompra(j, dia)) return null; // uma recompra de cada vez
      preco = Math.round(valor / 10000) * 10000;
    }
    const d: Direito = { id: ++this.seq, tipo, clube, pct, preco, ate: dia + Math.round(anos * 365), desde: dia, origem };
    const l = this.porJogador.get(j) ?? [];
    l.push(d);
    this.porJogador.set(j, l);
    this.contar(d, dia, (c) => c.criados++);
    if (this.verificar && this.vendaFuturaActiva(j) > D.venda_futura.limite + 1e-9) this.erros.push(`jogador ${j}: % activas acima do limite`);
    return d;
  }

  /**
   * Liquidação de uma saída com preço (todas passam por aqui). Devolve as partilhas a pagar (fracções do preço) aos
   * titulares de venda futura; extingue todas as cláusulas de venda futura (pagas, ou do próprio comprador/vendedor) e a
   * recompra (o titular não a exerceu: deixou o jogador sair).
   */
  liquidar(j: number, vendedor: number, comprador: number, preco: number, dia: number): Partilha[] {
    const out: Partilha[] = [];
    const ds = this.de(j);
    for (const d of ds) {
      if (d.ate < dia) continue; // caducado (contado na limpeza semanal)
      if (this.extintos.has(d.id)) { if (this.verificar) this.erros.push(`direito ${d.id} pago duas vezes`); continue; }
      this.extintos.add(d.id);
      if (d.tipo !== 'venda_futura' || d.clube === comprador || d.clube === vendedor) continue;
      if (this.recebeu.has(`${j}|${d.clube}`)) { if (this.verificar) this.erros.push(`jogador ${j}: o clube ${d.clube} voltaria a receber`); continue; }
      this.recebeu.add(`${j}|${d.clube}`);
      out.push({ clube: d.clube, fraccao: d.pct, direito: d.id });
      this.contar(d, dia, (c) => { c.pagos++; c.euros += d.pct * preco; });
    }
    this.porJogador.delete(j);
    if (this.verificar) {
      const soma = out.reduce((a, p) => a + p.fraccao, 0);
      if (soma > D.venda_futura.limite + 1e-9) this.erros.push(`jogador ${j}: partilhas somam ${soma}`);
      for (const p of out) if (p.clube < 0 || p.clube >= this.w.clubes.length) this.erros.push(`jogador ${j}: titular inexistente ${p.clube}`);
    }
    return out;
  }

  /** Recompra exercida (o titular paga o preço fixo; o direito extingue-se) ou recusada. */
  recompraDecidida(j: number, d: Direito, exerce: boolean, dia: number) {
    this.contar(d, dia, (c) => { if (exerce) c.recomprasExercidas++; else c.recomprasRecusadas++; });
    if (!exerce) { this.extintos.add(d.id); this.porJogador.set(j, this.de(j).filter((x) => x !== d)); }
  }

  /** Limpeza semanal: os direitos que passaram da validade caducam. */
  caducar(dia: number) {
    for (const [j, ds] of this.porJogador) {
      const vivos = ds.filter((d) => {
        if (d.ate >= dia) return true;
        this.extintos.add(d.id);
        this.contar(d, dia, (c) => c.caducados++);
        return false;
      });
      if (vivos.length) this.porJogador.set(j, vivos); else this.porJogador.delete(j);
    }
  }

  bytes(): number { let n = 0; for (const ds of this.porJogador.values()) n += 16 + ds.length * 56; return n + this.extintos.size * 8 + this.recebeu.size * 24; }
}

/** Factores comuns (0–1) da probabilidade de um vendedor pedir um direito numa venda. */
function factores(w: World, k: Contratos, j: number, vendedor: number, comprador: number, preco: number, dia: number) {
  const st = w.jogadores!, e = w.economia!;
  const idade = st.idade(j, dia), ovr = st.ovrNat(j), pot = st.pot[j];
  const est = ESTATUTOS[k.estatuto[j]];
  const arq = e.ia?.arquetipo[vendedor];
  // Valor de mercado se chegar ao potencial (o comprador paga menos do que isso: aceita a cláusula para fechar).
  const futuro = Math.max(1, preco) * Math.exp(V.por_ponto_ovr * Math.max(0, pot - ovr));
  return {
    reputacao: clamp((w.reputacao[vendedor] - w.reputacao[comprador]) / 20, 0, 1),
    idade: idade <= 21 ? 1 : idade <= 23 ? 0.4 : 0,
    sem_lugar: k.listado[j] > 0 || est === 'suplente' || est === 'promessa' ? 1 : 0,
    potencial: clamp((pot - ovr) / 15, 0, 1),
    arquetipo: arq === 'formador' || arq === 'vendedor' ? 1 : 0,
    preco_baixo: clamp(1 - preco / futuro, 0, 1),
  };
}

const pontos = (f: Record<string, number>, p: Record<string, number>) => Object.keys(p).reduce((a, k) => a + p[k] * (f[k] ?? 0), 0);

/** O que o vendedor (IA) pede numa venda com preço: % de venda futura (0 = nada) e/ou recompra (múltiplo, 0 = nada).
 *  Determinístico pela chave do negócio. */
export function planearDireitos(w: World, k: Contratos, direitos: Direitos, j: number, vendedor: number, comprador: number, preco: number, dia: number, chave: string): { vendaFutura: number; recompra: number; anosRecompra: number } {
  const st = w.jogadores!;
  const f = factores(w, k, j, vendedor, comprador, preco, dia);
  const VF = D.venda_futura, RC = D.recompra;
  let vendaFutura = 0, recompra = 0, anosRecompra = 0;
  const livre = VF.limite - direitos.vendaFuturaActiva(j);
  if (livre >= 0.05 && st.idade(j, dia) <= VF.idade_max && aleatorio(`${chave}|vf`) < logistica(pontos(f, VF.pesos) - VF.base)) {
    // Mais alta com mais potencial e maior diferença de reputação; arredondada a 5%.
    const t = clamp(0.5 * f.potencial + 0.5 * f.reputacao, 0, 1);
    vendaFutura = Math.min(livre, Math.round((VF.pct[0] + t * (VF.pct[1] - VF.pct[0])) * 20) / 20);
  }
  const elegivel = st.idade(j, dia) <= RC.idade_max && st.pot[j] - st.ovrNat(j) >= RC.potencial_min && (f.arquetipo > 0 || w.reputacao[vendedor] >= RC.reputacao_grande);
  if (elegivel && !direitos.recompra(j, dia) && aleatorio(`${chave}|rc`) < logistica(pontos(f, RC.pesos) - RC.base)) {
    recompra = Math.round((RC.multiplo[0] + f.potencial * (RC.multiplo[1] - RC.multiplo[0])) * 10) / 10;
    anosRecompra = st.idade(j, dia) <= 20 ? RC.validade_anos[1] : RC.validade_anos[0];
  }
  return { vendaFutura, recompra, anosRecompra };
}
