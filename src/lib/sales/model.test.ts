import { describe, expect, it } from "vitest";
import { settingsFromRows } from "@/lib/settings/use-settings";
import { availableTiers, defaultDueDate, formatSaleNumber, tierToPricing } from "./model";

const pontos = {
  key: "fidelidade.pontos",
  active: true,
  value: {
    kz_por_ponto: 10000, minimo_troca: 50,
    escaloes: [
      { pontos: 50, tipo: "percentagem", valor: 15 },
      { pontos: 100, tipo: "percentagem", valor: 30 },
      { pontos: 150, tipo: "paga1leva2", item_gratis: "menor_valor" },
    ],
  },
};

describe("escalões de pontos", () => {
  it("só a partir de 50 e até ao saldo", () => {
    const s = settingsFromRows([pontos]);
    expect(availableTiers(s, 49)).toEqual([]);
    expect(availableTiers(s, 120).map((t) => t.pontos)).toEqual([50, 100]);
    expect(availableTiers(s, 150).map((t) => t.pontos)).toEqual([50, 100, 150]);
  });
  it("pontos desligados: nenhum escalão (C3)", () => {
    expect(availableTiers(settingsFromRows([{ ...pontos, active: false }]), 500)).toEqual([]);
  });
  it("converte o escalão para o cálculo", () => {
    expect(tierToPricing({ pontos: 50, tipo: "percentagem", valor: 15 })).toEqual({ pointsBp: 1500, freeRule: null });
    expect(tierToPricing({ pontos: 150, tipo: "paga1leva2", item_gratis: "menor_valor" })).toEqual({ pointsBp: 0, freeRule: "menor_valor" });
    expect(tierToPricing(null)).toEqual({ pointsBp: 0, freeRule: null });
  });
});

describe("defaultDueDate", () => {
  it("hoje em Luanda + 35 dias", () => {
    const s = settingsFromRows([{ key: "vendas.prazo_divida_dias", active: true, value: { dias: 35 } }]);
    // 06/11 às 23:30 UTC já é 07/11 em Luanda
    expect(defaultDueDate(s, new Date("2026-11-06T23:30:00Z"))).toBe("2026-12-12");
  });
});

describe("formatSaleNumber", () => {
  it("número com 4 dígitos", () => {
    expect(formatSaleNumber(7)).toBe("n.º 0007");
    expect(formatSaleNumber(null)).toBe("(a sincronizar)");
  });
});
