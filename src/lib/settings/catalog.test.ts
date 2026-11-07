import { describe, expect, it } from "vitest";
import { SETTINGS_CATALOG, crossCheck, getAt, parseFieldInput, setAt } from "./catalog";

const pontos = {
  kz_por_ponto: 10000,
  expiram: false,
  validade_dias: null,
  minimo_troca: 50,
  escaloes: [
    { pontos: 50, tipo: "percentagem", valor: 15 },
    { pontos: 100, tipo: "percentagem", valor: 30 },
    { pontos: 150, tipo: "paga1leva2", item_gratis: "menor_valor" },
  ],
};

describe("catálogo de definições", () => {
  it("cobre as regras da Fase 1 e os dados do recibo", () => {
    const keys = SETTINGS_CATALOG.map((s) => s.key);
    expect(keys).toEqual(
      expect.arrayContaining(["fidelidade.pontos", "fidelidade.cupao_indicacao", "fidelidade.embaixador", "vendas.tecto_custo", "vendas.prazo_divida_dias", "empresa"]),
    );
  });
  it("lê e altera valores dentro dos escalões sem mexer no original", () => {
    expect(getAt(pontos, ["escaloes", 1, "valor"])).toBe(30);
    const novo = setAt(pontos, ["escaloes", 1, "valor"], 35);
    expect(getAt(novo, ["escaloes", 1, "valor"])).toBe(35);
    expect(getAt(novo, ["escaloes", 1, "tipo"])).toBe("percentagem");
    expect(pontos.escaloes[1].valor).toBe(30);
    expect(Array.isArray(novo.escaloes)).toBe(true);
  });
});

describe("parseFieldInput", () => {
  const kz = { path: ["x"], label: "Kz por ponto", kind: "kz" as const, min: 1 };
  const pct = { path: ["x"], label: "Desconto", kind: "percentagem" as const, min: 1, max: 100 };
  it("aceita números com espaços e vírgula decimal", () => {
    expect(parseFieldInput(kz, "10 000")).toEqual({ ok: true, value: 10000 });
    expect(parseFieldInput(pct, "12,5")).toEqual({ ok: true, value: 12.5 });
  });
  it("recusa valores fora dos limites ou não inteiros", () => {
    expect(parseFieldInput(kz, "0")).toMatchObject({ ok: false });
    expect(parseFieldInput(kz, "10,5")).toMatchObject({ ok: false });
    expect(parseFieldInput(pct, "150")).toMatchObject({ ok: false });
    expect(parseFieldInput(pct, "abc")).toMatchObject({ ok: false });
    expect(parseFieldInput(pct, "")).toMatchObject({ ok: false });
  });
  it("campos opcionais vazios ficam nulos", () => {
    expect(parseFieldInput({ path: ["v"], label: "Validade", kind: "inteiro", optional: true }, "")).toEqual({ ok: true, value: null });
  });
});

describe("crossCheck", () => {
  it("exige escalões crescentes e acima do mínimo", () => {
    expect(crossCheck("fidelidade.pontos", pontos)).toBeNull();
    expect(crossCheck("fidelidade.pontos", setAt(pontos, ["escaloes", 1, "pontos"], 40))).toMatch(/crescentes/);
    expect(crossCheck("fidelidade.pontos", setAt(pontos, ["minimo_troca"], 60))).toMatch(/mínimo/);
  });
});
