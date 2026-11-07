/**
 * Formatação para Angola: moeda Kz, datas dd/mm/aaaa, fuso Africa/Luanda.
 * Todas as datas são guardadas em UTC na base de dados e só aqui convertidas.
 */

export const LOCALE = "pt-AO";
export const TIME_ZONE = "Africa/Luanda";

const kzFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "AOA",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Converte espaços especiais do Intl em espaços normais (mais previsível em PDF e testes). */
function plainSpaces(s: string): string {
  return s.replace(/[  ]/g, " ");
}

/** 1234567.5 -> "1 234 567,50 Kz". Aceita number ou string (valores numeric vindos do Postgres). */
export function formatKz(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return plainSpaces(kzFormatter.format(Number.isFinite(n) ? n : 0));
}

export function formatNumber(value: number): string {
  return plainSpaces(numberFormatter.format(value));
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** -> "07/11/2026" no fuso de Luanda. */
export function formatDate(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFormatter.format(d);
}

/** -> "07/11/2026 00:30" no fuso de Luanda. */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? "—" : plainSpaces(dateTimeFormatter.format(d)).replace(",", "");
}

/** Aniversário guardado como dia + mês (sem ano) -> "25/12". */
export function formatBirthday(day: number | null, month: number | null): string {
  if (!day || !month) return "—";
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

/** Código sequencial do cliente: 1 -> "0001". Códigos temporários (offline) passam tal como estão. */
export function formatClientCode(code: number | string | null | undefined): string {
  if (code === null || code === undefined || code === "") return "—";
  if (typeof code === "string" && code.startsWith("TEMP-")) return code;
  const n = Number(code);
  return Number.isInteger(n) && n > 0 ? String(n).padStart(4, "0") : String(code);
}

/** 55.6 -> "55,6%" */
export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(value)}%`;
}
