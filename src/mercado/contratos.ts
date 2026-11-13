// Contratos completos (Prompt 4, Bloco A). O salário e o fim continuam em PlayerStore (salario, fimContrato);
// aqui ficam o resto do contrato, num array por jogador, e as cláusulas raras em tabelas à parte.
import type { Estatuto } from '../config/contratosJogador.ts';
import { ESTATUTOS } from '../config/contratosJogador.ts';

export interface Recompra { clube: number; valor: number; ate: number }
export interface VendaFutura { clube: number; pct: number; sobreLucro: boolean; custo: number }
export interface Emprestimo { dono: number; ate: number; salarioReceptor: number; opcao: number; obrigacao: boolean; minutos: number }

export class Contratos {
  cap = 0;
  estatuto = new Uint8Array(0);
  /** Bónus por jogo, golo, assistência e título (€). */
  bonusJogo = new Int32Array(0);
  bonusGolo = new Int32Array(0);
  bonusAssist = new Int32Array(0);
  bonusTitulo = new Int32Array(0);
  /** Cláusula de rescisão (€; 0 = sem) e dia em que foi acordada. */
  clausula = new Float64Array(0);
  clausulaDesde = new Int32Array(0);
  /** Dia em que chegou ao clube actual; clube onde se formou (−1 = desconhecido). */
  chegada = new Int32Array(0);
  formadoClube = new Int32Array(0);
  /** Primeiro contrato de jovem: aumento após N jogos na equipa principal (0 = sem cláusula). */
  aumentoJogos = new Uint16Array(0);
  /** Descontentamento (0–100) e livre desde (dia; 0 = não está livre). */
  descontentamento = new Uint8Array(0);
  livreDesde = new Int32Array(0);
  /** Pré-contrato: clube com quem acordou para a época seguinte (−1 = nenhum). */
  preContrato = new Int32Array(0);
  /** Listado para venda pelo clube (1) ou pediu para sair (2); venda forçada (3). */
  listado = new Uint8Array(0);
  recompra = new Map<number, Recompra>();
  vendaFutura = new Map<number, VendaFutura>();
  emprestimo = new Map<number, Emprestimo>();
  /** Preço pago na última transferência (para a % de venda futura sobre o lucro). */
  custo = new Map<number, number>();

  garantir(n: number) {
    if (n <= this.cap) return;
    const novo = Math.max(n, Math.ceil(this.cap * 1.5) || 1024);
    for (const [k, v] of Object.entries(this)) {
      if (!ArrayBuffer.isView(v)) continue;
      const a = v as Int32Array;
      const C = a.constructor as new (n: number) => Int32Array;
      const b = new C(novo);
      b.set(a);
      if (k === 'formadoClube' || k === 'preContrato') b.fill(-1, this.cap);
      (this as unknown as Record<string, unknown>)[k] = b;
    }
    this.cap = novo;
  }

  nomeEstatuto(j: number): Estatuto {
    return ESTATUTOS[this.estatuto[j]];
  }

  bytes(): number {
    let s = 0;
    for (const v of Object.values(this)) if (ArrayBuffer.isView(v)) s += (v as Uint8Array).byteLength;
    return s + (this.recompra.size + this.vendaFutura.size + this.emprestimo.size + this.custo.size) * 48;
  }
}
