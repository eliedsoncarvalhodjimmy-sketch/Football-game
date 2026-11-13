// Estado de cada clube (Prompt 3): finanças, orçamentos, adeptos, infraestruturas, obras e históricos.
// Arrays tipados, um elemento (ou bloco) por clube, como os jogadores.
import { TIPOS_INFRA } from '../config/infraestruturas.ts';
import { HISTORICO_CLUBE } from '../config/economia.ts';

export const RECEITAS = ['tv', 'bilheteira', 'comercial', 'premios', 'transferencias', 'outras'] as const;
export const DESPESAS_R = ['salarios', 'staff', 'agentes', 'manutencao', 'obras', 'juros', 'impostos', 'multas'] as const;
export const RUBRICAS = [...RECEITAS, ...DESPESAS_R] as const;
export type Rubrica = (typeof RUBRICAS)[number];
export const IDX_RUBRICA = Object.fromEntries(RUBRICAS.map((r, i) => [r, i])) as Record<Rubrica, number>;
export const N_RUB = RUBRICAS.length;
export const N_INFRA = TIPOS_INFRA.length;
export const SAUDES = ['saudável', 'apertado', 'crise', 'administração'] as const;
export const N_HIST = HISTORICO_CLUBE.anos;

/** Resumo de uma época fechada (histórico de 10 anos por clube). */
export interface BalancoEpoca {
  epoca: number;
  liga: string;
  posicao: number;
  receitas: Record<string, number>;
  despesas: Record<string, number>;
  receita: number;
  despesa: number;
  resultado: number;
  massaSalarial: number;
  caixa: number;
  divida: number;
  reputacao: number;
}

export class ClubStore {
  n = 0;
  caixa = new Float64Array(0);
  dividaBanco = new Float64Array(0);
  dividaDono = new Float64Array(0);
  /** Parcelas de transferências em dívida (Prompt 4; estrutura pronta). */
  dividaParcelas = new Float64Array(0);
  juroBanco = new Float32Array(0);
  saude = new Uint8Array(0);
  // Orçamentos (€/época).
  orcSalarios = new Float64Array(0);
  orcTransferencias = new Float64Array(0);
  orcInfra = new Float64Array(0);
  orcStaff = new Float64Array(0);
  /** Receita prevista da época (base dos orçamentos). */
  receitaPrevista = new Float64Array(0);
  /** Massa salarial anual dos contratos actuais. */
  folha = new Float64Array(0);
  // Adeptos.
  adeptos = new Float32Array(0); // milhares
  fidelidade = new Uint8Array(0); // 1–20
  capacidade = new Int32Array(0);
  // Infraestruturas (nível 1–10) e obras (dia de conclusão, custo semanal; 0 = sem obra).
  infra = new Uint8Array(0);
  obraFim = new Int32Array(0);
  obraSemanal = new Float64Array(0);
  // Patrocínio.
  patrocinio = new Float64Array(0); // €/ano
  patrocinioFim = new Int32Array(0); // ano (época) do fim
  /** Pára-quedas: valor anual e épocas restantes. */
  paraquedas = new Float64Array(0);
  paraquedasAnos = new Uint8Array(0);
  /** Pára-quedas do ano seguinte (valor anual). */
  paraquedasProx = new Float64Array(0);
  /** Contas da época a decorrer, por rubrica. */
  contas = new Float64Array(0);
  /** Reputação no fim de cada uma das últimas 10 épocas (anel). */
  repHist = new Float32Array(0);
  repHistN = new Uint8Array(0);
  /** Pontos por jogo recentes (forma, para a bilheteira): média móvel. */
  forma = new Float32Array(0);
  /** Origem dos valores iniciais por clube ("gerado" ou "manual" se vier de financas.csv). */
  origem: string[] = [];
  /** Últimas 10 épocas fechadas de cada clube. */
  balancos: BalancoEpoca[][] = [];

  crescer(novo: number) {
    if (novo <= this.n) return;
    for (const [k, v] of Object.entries(this)) {
      if (!ArrayBuffer.isView(v)) continue;
      const a = v as Float64Array;
      const por = this.n ? a.length / this.n : k === 'infra' || k === 'obraFim' || k === 'obraSemanal' ? N_INFRA : k === 'contas' ? N_RUB : k === 'repHist' ? N_HIST : 1;
      const C = a.constructor as new (n: number) => Float64Array;
      const b = new C(novo * por);
      b.set(a);
      (this as unknown as Record<string, unknown>)[k] = b;
    }
    for (let i = this.n; i < novo; i++) { this.balancos[i] = []; this.origem[i] = 'gerado'; }
    this.n = novo;
  }

  conta(c: number, r: Rubrica): number {
    return this.contas[c * N_RUB + IDX_RUBRICA[r]];
  }

  divida(c: number): number {
    return this.dividaBanco[c] + this.dividaDono[c] + this.dividaParcelas[c];
  }

  /** Lança um movimento: soma à rubrica e mexe na caixa (receitas +, despesas −). */
  lancar(c: number, r: Rubrica, valor: number) {
    if (!valor) return;
    this.contas[c * N_RUB + IDX_RUBRICA[r]] += valor;
    this.caixa[c] += IDX_RUBRICA[r] < RECEITAS.length ? valor : -valor;
  }

  receitaEpoca(c: number): number {
    let s = 0;
    for (let k = 0; k < RECEITAS.length; k++) s += this.contas[c * N_RUB + k];
    return s;
  }

  despesaEpoca(c: number): number {
    let s = 0;
    for (let k = RECEITAS.length; k < N_RUB; k++) s += this.contas[c * N_RUB + k];
    return s;
  }

  registarReputacao(c: number, rep: number) {
    const n = this.repHistN[c];
    if (n < N_HIST) { this.repHist[c * N_HIST + n] = rep; this.repHistN[c] = n + 1; return; }
    for (let k = 0; k < N_HIST - 1; k++) this.repHist[c * N_HIST + k] = this.repHist[c * N_HIST + k + 1];
    this.repHist[c * N_HIST + N_HIST - 1] = rep;
  }

  historicoReputacao(c: number): number[] {
    return Array.from(this.repHist.subarray(c * N_HIST, c * N_HIST + this.repHistN[c]));
  }

  bytes(): number {
    let s = 0;
    for (const v of Object.values(this)) if (ArrayBuffer.isView(v)) s += (v as Uint8Array).byteLength;
    return s;
  }
}
