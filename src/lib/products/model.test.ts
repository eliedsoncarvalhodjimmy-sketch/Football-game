import { describe, expect, it } from "vitest";
import { newVariantForm, suggestSku, unitMargin, validateProductForm, type ProductForm } from "./model";

const variant = (over = {}) => newVariantForm("v1", { sku: "oud-50", label: "50 ml", priceRetail: "30 000", priceReseller: "25 000", cost: "15 000", ...over });
const form = (over: Partial<ProductForm> = {}): ProductForm => ({
  name: " Oud  Real ", brand: "Smell", description: "", category: "masculino", active: true, photoPaths: [], variants: [variant()], ...over,
});

describe("validateProductForm", () => {
  it("converte preços para a base de dados e normaliza o SKU", () => {
    const r = validateProductForm(form(), true);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.product.name).toBe("Oud Real");
      expect(r.value.variants[0]).toMatchObject({ sku: "OUD-50", price_retail: "30000.00", price_reseller: "25000.00", min_stock: 2, replenish_days: 60 });
      expect(r.value.costs).toEqual([{ variant_id: "v1", cost_price: "15000.00" }]);
      expect(r.value.warnings).toEqual([]);
    }
  });
  it("o Vendedor nunca envia custo", () => {
    const r = validateProductForm(form({ variants: [variant({ cost: "" })] }), false);
    expect(r.ok && r.value.costs).toEqual([]);
  });
  it("custo obrigatório para o CEO", () => {
    const r = validateProductForm(form({ variants: [variant({ cost: "" })] }), true);
    expect(r.ok).toBe(false);
  });
  it("recusa preços inválidos, SKU repetido e sem variações", () => {
    expect(validateProductForm(form({ variants: [variant({ priceRetail: "0" })] }), true).ok).toBe(false);
    expect(validateProductForm(form({ variants: [variant(), variant({ id: "v2", label: "100 ml" })] }), true).ok).toBe(false);
    expect(validateProductForm(form(), true, ["OUD-50"]).ok).toBe(false);
    expect(validateProductForm(form({ variants: [] }), true).ok).toBe(false);
    expect(validateProductForm(form({ variants: [variant({ sku: "oud 50" })] }), true).ok).toBe(false);
  });
  it("avisa (sem bloquear) quando o custo passa o preço", () => {
    const r = validateProductForm(form({ variants: [variant({ cost: "27 000" })] }), true);
    expect(r.ok && r.value.warnings[0]).toMatch(/prejuízo/);
  });
  it("avisa quando o revendedor paga mais do que o cliente final", () => {
    const r = validateProductForm(form({ variants: [variant({ priceReseller: "31 000" })] }), true);
    expect(r.ok && r.value.warnings.some((w) => /revendedor é maior/.test(w))).toBe(true);
  });
});

describe("suggestSku", () => {
  it("usa o nome e os ml", () => {
    expect(suggestSku("Oud Real", "100 ml")).toBe("OUDREA-100");
    expect(suggestSku("Jasmim", "50ml")).toBe("JASMIM-50");
    expect(suggestSku("Água de Rosas", "30 ml")).toBe("AGUDER-30");
  });
  it("evita códigos já usados", () => {
    expect(suggestSku("Jasmim", "50 ml", ["JASMIM-50"])).toBe("JASMIM-50-2");
  });
});

describe("unitMargin", () => {
  it("margem em Kz e percentagem", () => {
    expect(unitMargin(3000000, 1500000)).toEqual({ cents: 1500000, percent: 50 });
    expect(unitMargin(2500000, 2700000)).toEqual({ cents: -200000, percent: -8 });
  });
});

import { EMPTY_PRODUCT_FILTERS, filterProducts } from "./model";

describe("filterProducts", () => {
  const v = (sku: string, stock: number, min = 2, active = true) => ({ sku, label: "50 ml", stock, min_stock: min, active });
  const list = [
    { name: "Oud Real", brand: "Smell", category: "masculino", active: true, variants: [v("OUD-50", 10)] },
    { name: "Flor de Acácia", brand: "Smell", category: "feminino", active: true, variants: [v("ACA-50", 1)] },
    { name: "Antigo", brand: "X", category: "unissexo", active: false, variants: [v("ANT-50", 0)] },
  ];
  const names = (r: typeof list) => r.map((p) => p.name);
  it("pesquisa por nome sem acentos e por SKU", () => {
    expect(names(filterProducts(list, { ...EMPTY_PRODUCT_FILTERS, search: "acacia" }))).toEqual(["Flor de Acácia"]);
    expect(names(filterProducts(list, { ...EMPTY_PRODUCT_FILTERS, search: "oud-50" }))).toEqual(["Oud Real"]);
  });
  it("stock baixo, categoria e inactivos", () => {
    expect(names(filterProducts(list, { ...EMPTY_PRODUCT_FILTERS, lowOnly: true }))).toEqual(["Flor de Acácia"]);
    expect(names(filterProducts(list, { ...EMPTY_PRODUCT_FILTERS, category: "masculino" }))).toEqual(["Oud Real"]);
    expect(names(filterProducts(list, { ...EMPTY_PRODUCT_FILTERS, showInactive: true }))).toHaveLength(3);
  });
});
