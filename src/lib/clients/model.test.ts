import { describe, expect, it } from "vitest";
import { emptyClientForm, makeTempCode, validateClientForm } from "./model";

const base = { ...emptyClientForm("seller-1"), name: "  Ana   Silva ", whatsapp: "923 456 789" };

describe("validateClientForm", () => {
  it("limpa o nome e normaliza o WhatsApp", () => {
    const r = validateClientForm(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe("Ana Silva");
      expect(r.value.whatsapp).toBe("+244923456789");
      expect(r.value.seller_id).toBe("seller-1");
      expect(r.value.referred_by).toBeNull();
      expect(r.value.birthday_day).toBeNull();
    }
  });
  it("nome e WhatsApp são obrigatórios", () => {
    const r = validateClientForm({ ...base, name: "", whatsapp: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBeDefined();
      expect(r.errors.whatsapp).toBeDefined();
    }
  });
  it("aniversário: dia e mês juntos e válidos (29/02 permitido)", () => {
    expect(validateClientForm({ ...base, birthdayDay: "29", birthdayMonth: "2" }).ok).toBe(true);
    const fev30 = validateClientForm({ ...base, birthdayDay: "30", birthdayMonth: "2" });
    expect(!fev30.ok && fev30.errors.birthdayDay).toMatch(/Fevereiro não tem dia 30/);
    expect(validateClientForm({ ...base, birthdayDay: "31", birthdayMonth: "4" }).ok).toBe(false);
    expect(validateClientForm({ ...base, birthdayDay: "5", birthdayMonth: "" }).ok).toBe(false);
    const ok = validateClientForm({ ...base, birthdayDay: "25", birthdayMonth: "12" });
    expect(ok.ok && [ok.value.birthday_day, ok.value.birthday_month]).toEqual([25, 12]);
  });
  it("um cliente não se indica a si próprio", () => {
    expect(validateClientForm({ ...base, referredBy: "c1" }, "c1").ok).toBe(false);
    expect(validateClientForm({ ...base, referredBy: "c2" }, "c1").ok).toBe(true);
  });
});

describe("makeTempCode", () => {
  it("gera TEMP- com 6 caracteres do UUID", () => {
    expect(makeTempCode("a1b2c3d4-0000-0000-0000-000000000000")).toBe("TEMP-A1B2C3");
  });
});
