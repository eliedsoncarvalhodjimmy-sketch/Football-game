/**
 * Dinheiro em Kz. A base de dados usa numeric(14,2); no browser trabalhamos em
 * cêntimos inteiros para nunca haver erros de arredondamento de vírgula flutuante.
 */

/** "25 000,50" | "25000.5" | 25000.5 -> 2500050 (cêntimos). null se inválido. */
export function toCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value * 100) : null;
  let s = value.trim().replace(/\s| | |Kz/gi, "");
  if (!s) return null;
  // Formato pt: 1.234.567,89 -> pontos de milhares e vírgula decimal
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ""] = s.replace("-", "").split(".");
  const cents = Number(int) * 100 + Number((dec + "00").slice(0, 2));
  return s.startsWith("-") ? -cents : cents;
}

/** Cêntimos -> valor para enviar à base de dados ("25000.50"). */
export function centsToDb(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Cêntimos -> texto para um campo de formulário ("25 000" ou "25 000,50"). */
export function centsToInput(cents: number | null): string {
  if (cents === null) return "";
  const int = Math.floor(Math.abs(cents) / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const dec = Math.abs(cents) % 100;
  return `${cents < 0 ? "-" : ""}${int}${dec ? "," + String(dec).padStart(2, "0") : ""}`;
}
