import { describe, expect, it } from "vitest";
import { generatePassword, passwordProblem } from "./password";

describe("generatePassword", () => {
  it("tem 12 caracteres, letras e números, sem caracteres confusos", () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassword();
      expect(p).toHaveLength(12);
      expect(passwordProblem(p)).toBeNull();
      expect(p).not.toMatch(/[01ilIoO]/);
    }
  });
  it("recusa tamanhos inferiores a 8", () => {
    expect(() => generatePassword(6)).toThrow();
  });
});

describe("passwordProblem", () => {
  it("exige 8 caracteres com letras e números", () => {
    expect(passwordProblem("abc1")).toMatch(/8 caracteres/);
    expect(passwordProblem("abcdefgh")).toMatch(/letras e números/);
    expect(passwordProblem("12345678")).toMatch(/letras e números/);
    expect(passwordProblem("perfume2026")).toBeNull();
  });
});
