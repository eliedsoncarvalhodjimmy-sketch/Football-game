import { describe, expect, it } from "vitest";
import {
  formatBirthday,
  formatClientCode,
  formatDate,
  formatDateTime,
  formatKz,
} from "./format";

describe("formatKz", () => {
  it("formata em Kz com separadores de Angola", () => {
    expect(formatKz(1234567.5)).toBe("1 234 567,50 Kz");
    expect(formatKz(0)).toBe("0,00 Kz");
  });
  it("aceita strings vindas do Postgres (numeric)", () => {
    expect(formatKz("10000.00")).toBe("10 000,00 Kz");
  });
  it("trata valores inválidos como zero", () => {
    expect(formatKz(null)).toBe("0,00 Kz");
    expect(formatKz("abc")).toBe("0,00 Kz");
  });
});

describe("datas no fuso de Luanda", () => {
  it("23:30 UTC já é o dia seguinte em Luanda (UTC+1)", () => {
    expect(formatDate("2026-11-06T23:30:00Z")).toBe("07/11/2026");
    expect(formatDateTime("2026-11-06T23:30:00Z")).toBe("07/11/2026 00:30");
  });
  it("mostra travessão quando não há data", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("lixo")).toBe("—");
  });
  it("aniversário sem ano", () => {
    expect(formatBirthday(5, 3)).toBe("05/03");
    expect(formatBirthday(null, 3)).toBe("—");
  });
});

describe("formatClientCode", () => {
  it("preenche com zeros até 4 dígitos", () => {
    expect(formatClientCode(1)).toBe("0001");
    expect(formatClientCode(44)).toBe("0044");
    expect(formatClientCode(12345)).toBe("12345");
  });
  it("mantém códigos temporários criados offline", () => {
    expect(formatClientCode("TEMP-a1b2")).toBe("TEMP-a1b2");
  });
});

import { formatPercent } from "./format";
describe("formatPercent", () => {
  it("vírgula decimal", () => {
    expect(formatPercent(55.6)).toBe("55,6%");
    expect(formatPercent(50)).toBe("50%");
  });
});
