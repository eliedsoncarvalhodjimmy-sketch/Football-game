import { describe, expect, it } from "vitest";
import { stockStatus, validateMovement } from "./stock";

describe("validateMovement", () => {
  it("entrada é sempre positiva", () => {
    expect(validateMovement("entrada", "12", "menos", "")).toEqual({ ok: true, quantity: 12, reason: "" });
  });
  it("ajuste para menos fica negativo e exige motivo", () => {
    expect(validateMovement("ajuste", "1", "menos", "Frasco partido")).toEqual({ ok: true, quantity: -1, reason: "Frasco partido" });
    expect(validateMovement("ajuste", "1", "menos", "")).toMatchObject({ ok: false });
    expect(validateMovement("ajuste", "2", "mais", "Contagem")).toMatchObject({ ok: true, quantity: 2 });
  });
  it("recusa quantidades inválidas", () => {
    expect(validateMovement("entrada", "0", "mais", "")).toMatchObject({ ok: false });
    expect(validateMovement("entrada", "-3", "mais", "")).toMatchObject({ ok: false });
    expect(validateMovement("entrada", "2,5", "mais", "")).toMatchObject({ ok: false });
    expect(validateMovement("entrada", "", "mais", "")).toMatchObject({ ok: false });
  });
});

describe("stockStatus", () => {
  it("esgotado, baixo e normal (stock negativo conta como esgotado — D5)", () => {
    expect(stockStatus(-1, 2)).toBe("esgotado");
    expect(stockStatus(0, 2)).toBe("esgotado");
    expect(stockStatus(2, 2)).toBe("baixo");
    expect(stockStatus(3, 2)).toBe("ok");
  });
});
