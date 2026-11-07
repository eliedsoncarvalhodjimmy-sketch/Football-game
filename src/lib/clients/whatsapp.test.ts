import { describe, expect, it } from "vitest";
import { formatWhatsapp, normalizeWhatsapp, whatsappLink } from "./whatsapp";

describe("normalizeWhatsapp", () => {
  it("assume Angola (+244) quando não há indicativo", () => {
    expect(normalizeWhatsapp("923 456 789")).toEqual({ ok: true, value: "+244923456789" });
    expect(normalizeWhatsapp("923-456-789")).toEqual({ ok: true, value: "+244923456789" });
    expect(normalizeWhatsapp("244923456789")).toEqual({ ok: true, value: "+244923456789" });
  });
  it("aceita números estrangeiros (D26)", () => {
    expect(normalizeWhatsapp("+351 912 345 678")).toEqual({ ok: true, value: "+351912345678" });
    expect(normalizeWhatsapp("0055 11 98765 4321")).toEqual({ ok: true, value: "+5511987654321" });
  });
  it("recusa números inválidos", () => {
    expect(normalizeWhatsapp("")).toMatchObject({ ok: false });
    expect(normalizeWhatsapp("abc")).toMatchObject({ ok: false });
    expect(normalizeWhatsapp("12345")).toMatchObject({ ok: false });
    expect(normalizeWhatsapp("823 456 789")).toMatchObject({ ok: false, error: expect.stringMatching(/angolano/) });
    expect(normalizeWhatsapp("92345678")).toMatchObject({ ok: false });
    expect(normalizeWhatsapp("9+23456789")).toMatchObject({ ok: false });
  });
});

describe("formatWhatsapp / whatsappLink", () => {
  it("formata números angolanos em grupos", () => {
    expect(formatWhatsapp("+244923456789")).toBe("+244 923 456 789");
    expect(formatWhatsapp("+351912345678")).toBe("+351912345678");
  });
  it("cria a ligação wa.me", () => {
    expect(whatsappLink("+244923456789")).toBe("https://wa.me/244923456789");
    expect(whatsappLink("+244923456789", "Olá Ana!")).toBe("https://wa.me/244923456789?text=Ol%C3%A1%20Ana!");
  });
});
