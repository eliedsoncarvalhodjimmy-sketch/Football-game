import { describe, expect, it } from "vitest";
import { priceSale, type PricingInput } from "./pricing";

// Mesmos casos de tests/db/04_vendas.sql
const A = (q = 1, unit = 3000000) => ({ variantId: "A", quantity: q, unitCents: unit, costCents: 1500000 });
const B = (q = 1, unit = 4500000) => ({ variantId: "B", quantity: q, unitCents: unit, costCents: 2000000 });
const base: PricingInput = { lines: [], couponBp: 0, pointsBp: 0, freeRule: null, manualCents: 0, floorActive: true, exception: false };

describe("priceSale", () => {
  it("venda simples", () => {
    const r = priceSale({ ...base, lines: [A()] });
    expect(r.totalCents).toBe(3000000);
    expect(r.subtotalCents).toBe(3000000);
  });
  it("junta linhas repetidas", () => {
    const r = priceSale({ ...base, lines: [A(1), A(2)] });
    expect(r.lines).toHaveLength(1);
    expect(r.totalCents).toBe(9000000);
  });
  it("desconto manual aprovado", () => {
    expect(priceSale({ ...base, lines: [A()], manualCents: 500000 }).totalCents).toBe(2500000);
  });
  it("tecto: limita ao custo e avisa", () => {
    const r = priceSale({ ...base, lines: [A()], manualCents: 2000000 });
    expect(r.totalCents).toBe(1500000);
    expect(r.capped).toBe(true);
  });
  it("excepção do CEO permite abaixo do custo", () => {
    const r = priceSale({ ...base, lines: [A()], manualCents: 2000000, exception: true });
    expect(r.totalCents).toBe(1000000);
    expect(r.belowCost).toBe(true);
    expect(r.capped).toBe(false);
  });
  it("tecto desligado nas Definições: sem limite", () => {
    const r = priceSale({ ...base, lines: [A()], manualCents: 2000000, floorActive: false });
    expect(r.totalCents).toBe(1000000);
  });
  it("cupão 5% + pontos 30% acumulam (105 000 − 35% = 68 250)", () => {
    const r = priceSale({ ...base, lines: [A(2), B()], couponBp: 500, pointsBp: 3000 });
    expect(r.totalCents).toBe(6825000);
    expect(r.couponCents).toBe(525000);
    expect(r.pointsCents).toBe(3150000);
  });
  it("paga 1, leva 2: o de menor valor sai grátis, mesmo abaixo do custo (revendedor)", () => {
    const r = priceSale({ ...base, lines: [B(1, 3800000), A(1, 2500000)], freeRule: "menor_valor" });
    expect(r.totalCents).toBe(3800000);
    expect(r.lines.find((l) => l.variantId === "A")?.isFreeItem).toBe(true);
    expect(r.pointsCents).toBe(2500000);
    expect(r.capped).toBe(false);
  });
  it("paga 1, leva 2 com a opção 'maior valor'", () => {
    const r = priceSale({ ...base, lines: [A(), B()], freeRule: "maior_valor" });
    expect(r.totalCents).toBe(3000000);
  });
  it("paga 1, leva 2 precisa de 2 perfumes", () => {
    expect(() => priceSale({ ...base, lines: [B()], freeRule: "menor_valor" })).toThrow(/2 perfumes/);
  });
  it("quantidade inválida", () => {
    expect(() => priceSale({ ...base, lines: [A(0)] })).toThrow();
    expect(() => priceSale({ ...base, lines: [] })).toThrow();
  });
  it("desconto manual repartido sem perder cêntimos", () => {
    const r = priceSale({ ...base, lines: [A(1, 1000), B(1, 2000)], manualCents: 1001, floorActive: false });
    expect(r.lines.reduce((a, l) => a + l.discountCents, 0)).toBe(1001);
    expect(r.totalCents).toBe(3000 - 1001);
  });
  it("tecto corta primeiro o manual e mantém cupão/pontos", () => {
    // 30 000 com pontos 20% (6 000) + manual 10 000; máximo de desconto = 15 000 (custo)
    // → os pontos ficam inteiros (6 000) e o manual é cortado para 9 000
    const r = priceSale({ ...base, lines: [A()], pointsBp: 2000, manualCents: 1000000 });
    expect(r.totalCents).toBe(1500000);
    expect(r.pointsCents).toBe(600000);
    expect(r.manualCents).toBe(900000);
    expect(r.capped).toBe(true);
  });
  it("Vendedor (sem custo): o tecto não é calculado no aparelho", () => {
    const r = priceSale({ ...base, lines: [{ ...A(), costCents: null }], manualCents: 2000000 });
    expect(r.totalCents).toBe(1000000);
    expect(r.capped).toBe(false);
  });
});
