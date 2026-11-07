/** Palavras-passe: geração (sem caracteres que se confundem) e regras mínimas. */

const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"; // sem i, l, o, I, O
const DIGITS = "23456789"; // sem 0 e 1
const ALL = LETTERS + DIGITS;

function randomIndex(max: number, rand: () => number): number {
  return Math.floor(rand() * max);
}

function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/** Gera uma palavra-passe fácil de ditar (12 caracteres, com letras e números). */
export function generatePassword(length = 12, rand: () => number = cryptoRandom): string {
  if (length < 8) throw new Error("A palavra-passe tem de ter pelo menos 8 caracteres.");
  const chars: string[] = [LETTERS[randomIndex(LETTERS.length, rand)], DIGITS[randomIndex(DIGITS.length, rand)]];
  while (chars.length < length) chars.push(ALL[randomIndex(ALL.length, rand)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, rand);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Devolve a mensagem de erro, ou null se a palavra-passe for aceitável. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "A palavra-passe tem de ter pelo menos 8 caracteres.";
  if (password.length > 72) return "A palavra-passe é demasiado longa (máximo 72 caracteres).";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "Use letras e números.";
  return null;
}
