import { describe, expect, it } from "vitest";
import { centsToDb, centsToInput, toCents } from "./money";

describe("toCents", () => {
  it("aceita formatos usados em Angola", () => {
    expect(toCents("25 000")).toBe(2500000);
    expect(toCents("25 000,50")).toBe(2500050);
    expect(toCents("25.000")).toBe(2500000);
    expect(toCents("1.250.000,5")).toBe(125000050);
    expect(toCents("25000.5")).toBe(2500050);
    expect(toCents("30 000 Kz")).toBe(3000000);
    expect(toCents(19999.99)).toBe(1999999);
    expect(toCents("10000.00")).toBe(1000000);
  });
  it("recusa texto inválido", () => {
    expect(toCents("")).toBeNull();
    expect(toCents("abc")).toBeNull();
    expect(toCents("1,234")).toBeNull();
    expect(toCents(null)).toBeNull();
  });
  it("evita erros de vírgula flutuante", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});

describe("conversões", () => {
  it("cêntimos para a base de dados e para o formulário", () => {
    expect(centsToDb(2500050)).toBe("25000.50");
    expect(centsToDb(5)).toBe("0.05");
    expect(centsToDb(-150)).toBe("-1.50");
    expect(centsToInput(2500000)).toBe("25 000");
    expect(centsToInput(2500050)).toBe("25 000,50");
    expect(centsToInput(null)).toBe("");
  });
});
