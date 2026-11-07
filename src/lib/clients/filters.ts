import type { Client, ClientSummary, ClientType, FunnelStage } from "./model";

export interface ClientRow {
  client: Client;
  summary: ClientSummary | null;
  tagIds: string[];
}

export interface ClientFilters {
  search: string;
  type: ClientType | "";
  tagId: string;
  stage: FunnelStage | "";
  /** "" = todos; "nunca" = nunca comprou; número = pelo menos N dias sem comprar */
  inactiveDays: string;
  withDebt: boolean;
}

export const EMPTY_FILTERS: ClientFilters = { search: "", type: "", tagId: "", stage: "", inactiveDays: "", withDebt: false };

/** Minúsculas e sem acentos: "Conceição" -> "conceicao". */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function matchesSearch(c: Client, q: string): boolean {
  const query = q.trim();
  if (!query) return true;
  const digits = query.replace(/\D/g, "");
  if (digits && /^[\d\s+()-]+$/.test(query)) {
    // Só algarismos: código (7 ou 0007) ou parte do WhatsApp
    if (c.code !== null && Number(digits) === c.code && digits.length <= 5) return true;
    return digits.length >= 3 && c.whatsapp.replace(/\D/g, "").includes(digits);
  }
  if (c.temp_code && fold(c.temp_code).includes(fold(query))) return true;
  const words = fold(query).split(/\s+/);
  const name = fold(c.name);
  return words.every((w) => name.includes(w));
}

export function filterClients(rows: ClientRow[], f: ClientFilters): ClientRow[] {
  return rows.filter(({ client: c, summary: s, tagIds }) => {
    if (c.erased_at) return false;
    if (!matchesSearch(c, f.search)) return false;
    if (f.type && c.client_type !== f.type) return false;
    if (f.stage && c.funnel_stage !== f.stage) return false;
    if (f.tagId && !tagIds.includes(f.tagId)) return false;
    if (f.withDebt && !(Number(s?.open_debt ?? 0) > 0)) return false;
    if (f.inactiveDays === "nunca" && s?.last_purchase_at) return false;
    if (f.inactiveDays && f.inactiveDays !== "nunca") {
      const n = Number(f.inactiveDays);
      if (s?.days_without_purchase === null || s?.days_without_purchase === undefined || s.days_without_purchase < n) return false;
    }
    return true;
  });
}

/** Ordena por código (clientes offline, sem código, no fim). */
export function sortByCode(rows: ClientRow[]): ClientRow[] {
  return [...rows].sort((a, b) => (a.client.code ?? Number.MAX_SAFE_INTEGER) - (b.client.code ?? Number.MAX_SAFE_INTEGER));
}
