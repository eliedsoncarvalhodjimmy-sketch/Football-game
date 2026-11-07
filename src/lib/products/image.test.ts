import { describe, expect, it } from "vitest";
import { fitWithin } from "./image";

describe("fitWithin", () => {
  it("reduz mantendo a proporção", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 900, height: 1200 });
  });
  it("não aumenta fotos pequenas", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("trata dimensões inválidas", () => {
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 });
  });
});
