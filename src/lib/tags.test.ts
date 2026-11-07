import { describe, expect, it } from "vitest";
import { TAG_COLORS, normalizeTagName, tagTextColor } from "./tags";

describe("etiquetas", () => {
  it("texto escuro sobre dourado, branco sobre vinho", () => {
    expect(tagTextColor("#C4AA6F")).toBe("#4C020B");
    expect(tagTextColor("#710014")).toBe("#FFFFFF");
  });
  it("todas as cores têm texto definido", () => {
    for (const c of TAG_COLORS) expect(["#4C020B", "#FFFFFF"]).toContain(tagTextColor(c.value));
  });
  it("limpa espaços do nome", () => {
    expect(normalizeTagName("  Cliente   fiel ")).toBe("Cliente fiel");
  });
});
