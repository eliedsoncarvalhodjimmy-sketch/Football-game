import { describe, expect, it } from "vitest";
import { parseNewUser, parseUserUpdate } from "./validate";

describe("parseNewUser", () => {
  const ok = { fullName: " Ana Silva ", email: "Ana@Smell.AO ", password: "perfume2026" };
  it("normaliza nome e email e assume Vendedor com troca obrigatória", () => {
    const r = parseNewUser(ok);
    expect(r).toEqual({
      ok: true,
      value: { fullName: "Ana Silva", email: "ana@smell.ao", password: "perfume2026", role: "vendedor", isAdm: false, mustChangePassword: true },
    });
  });
  it("recusa dados inválidos", () => {
    expect(parseNewUser({ ...ok, email: "ana" })).toMatchObject({ ok: false, error: "Email inválido." });
    expect(parseNewUser({ ...ok, fullName: "" })).toMatchObject({ ok: false });
    expect(parseNewUser({ ...ok, password: "curta" })).toMatchObject({ ok: false });
    expect(parseNewUser({ ...ok, role: "admin" })).toMatchObject({ ok: false, error: "Perfil inválido." });
    expect(parseNewUser(null)).toMatchObject({ ok: false });
  });
  it("aceita ADM e troca opcional", () => {
    const r = parseNewUser({ ...ok, isAdm: true, mustChangePassword: false });
    expect(r.ok && r.value.isAdm && !r.value.mustChangePassword).toBe(true);
  });
});

describe("parseUserUpdate", () => {
  it("aceita só campos válidos", () => {
    expect(parseUserUpdate({ active: false })).toEqual({ ok: true, value: { active: false } });
    expect(parseUserUpdate({ newPassword: "nova12345", mustChangePassword: true })).toEqual({
      ok: true,
      value: { newPassword: "nova12345", mustChangePassword: true },
    });
  });
  it("recusa pedidos vazios ou inválidos", () => {
    expect(parseUserUpdate({})).toMatchObject({ ok: false, error: "Nada para alterar." });
    expect(parseUserUpdate({ active: "sim" })).toMatchObject({ ok: false });
    expect(parseUserUpdate({ newPassword: "123" })).toMatchObject({ ok: false });
    expect(parseUserUpdate({ role: "dono" })).toMatchObject({ ok: false });
  });
});
