/**
 * Cálculo da venda no aparelho (pré-visualização, também offline).
 * É o MESMO algoritmo da função price_sale da base de dados; o valor que conta
 * é sempre o do servidor. Tudo em cêntimos inteiros.
 *
 * 1) "paga 1, leva 2": 1 unidade grátis (a de menor ou maior valor)
 * 2) percentagens (cupão + pontos, somadas), arredondadas por linha
 * 3) desconto manual em Kz, repartido pelas linhas (o resto vai para a última)
 * 4) tecto: nenhuma linha abaixo do custo (a unidade grátis é excepção, D2);
 *    se passar, corta-se primeiro o desconto manual e depois as percentagens.
 *    Sem custo conhecido (Vendedor) o tecto não é calculado aqui.
 */

export type FreeRule = "menor_valor" | "maior_valor" | null;

export interface PricingLineInput {
  variantId: string;
  quantity: number;
  unitCents: number;
  costCents: number | null;
}

export interface PricingInput {
  lines: PricingLineInput[];
  couponBp: number; // percentagem × 100
  pointsBp: number;
  freeRule: FreeRule;
  manualCents: number;
  floorActive: boolean;
  exception: boolean;
}

export interface PricedLine extends PricingLineInput {
  discountCents: number;
  totalCents: number;
  isFreeItem: boolean;
}

export interface PricingResult {
  lines: PricedLine[];
  subtotalCents: number;
  couponCents: number;
  pointsCents: number;
  manualCents: number;
  totalCents: number;
  capped: boolean;
  belowCost: boolean;
}

export class PricingError extends Error {}

const div = (a: number, b: number) => Math.floor(a / b); // só para valores >= 0

/** Junta linhas repetidas da mesma variação, pela ordem em que aparecem. */
export function mergeLines(lines: PricingLineInput[]): PricingLineInput[] {
  const out: PricingLineInput[] = [];
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) throw new PricingError("Quantidade inválida.");
    const found = out.find((o) => o.variantId === l.variantId);
    if (found) found.quantity += l.quantity;
    else out.push({ ...l });
  }
  return out;
}

export function priceSale(input: PricingInput): PricingResult {
  if (input.lines.length === 0) throw new PricingError("A venda não tem perfumes.");
  const lines = mergeLines(input.lines);
  const n = lines.length;
  const bp = (input.couponBp || 0) + (input.pointsBp || 0);
  const free = new Array<number>(n).fill(0);
  const base = new Array<number>(n).fill(0);
  const pct = new Array<number>(n).fill(0);
  const man = new Array<number>(n).fill(0);

  if (input.freeRule) {
    const units = lines.reduce((a, l) => a + l.quantity, 0);
    if (units < 2) throw new PricingError("“Paga 1, leva 2” precisa de pelo menos 2 perfumes na venda.");
    let idx = -1;
    lines.forEach((l, i) => {
      if (idx < 0 || (input.freeRule === "maior_valor" ? l.unitCents > lines[idx].unitCents : l.unitCents < lines[idx].unitCents)) idx = i;
    });
    free[idx] = lines[idx].unitCents;
  }

  let totalAfter = 0;
  let lastNonZero = -1;
  lines.forEach((l, i) => {
    base[i] = l.unitCents * l.quantity - free[i];
    pct[i] = div(base[i] * bp + 5000, 10000);
    totalAfter += base[i] - pct[i];
    if (base[i] - pct[i] > 0) lastNonZero = i;
  });

  const manualTarget = Math.min(Math.max(input.manualCents || 0, 0), totalAfter);
  let left = manualTarget;
  if (left > 0) {
    for (let i = 0; i < n; i++) {
      if (i === lastNonZero) {
        man[i] = left;
        break;
      }
      const share = div(manualTarget * (base[i] - pct[i]), totalAfter);
      man[i] = share;
      left -= share;
    }
  }

  let capped = false;
  let belowCost = false;
  lines.forEach((l, i) => {
    if (l.costCents === null) return;
    const floor = l.costCents * (l.quantity - (free[i] > 0 ? 1 : 0));
    const maxd = Math.max(base[i] - floor, 0);
    if (pct[i] + man[i] > maxd) {
      if (input.floorActive && !input.exception) {
        capped = true;
        // mantém o que o cliente ganhou (cupão/pontos) e corta o desconto manual
        pct[i] = Math.min(pct[i], maxd);
        man[i] = Math.min(man[i], maxd - pct[i]);
      } else {
        belowCost = true;
      }
    }
  });

  let subtotal = 0, total = 0, pctSum = 0, freeSum = 0, manSum = 0;
  const priced: PricedLine[] = lines.map((l, i) => {
    const gross = l.unitCents * l.quantity;
    const discount = free[i] + pct[i] + man[i];
    subtotal += gross;
    total += gross - discount;
    pctSum += pct[i];
    freeSum += free[i];
    manSum += man[i];
    return { ...l, discountCents: discount, totalCents: gross - discount, isFreeItem: free[i] > 0 };
  });
  const couponPart = bp === 0 ? 0 : div(pctSum * (input.couponBp || 0) + div(bp, 2), bp);

  return {
    lines: priced,
    subtotalCents: subtotal,
    couponCents: couponPart,
    pointsCents: pctSum - couponPart + freeSum,
    manualCents: manSum,
    totalCents: total,
    capped,
    belowCost,
  };
}
