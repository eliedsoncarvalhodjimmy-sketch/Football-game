import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, filterClients, fold, sortByCode, type ClientRow } from "./filters";
import type { Client } from "./model";

function row(code: number | null, name: string, extra: Partial<Client> = {}, summary: Partial<ClientRow["summary"]> | null = null, tagIds: string[] = []): ClientRow {
  return {
    client: {
      id: `id-${code ?? name}`, code, temp_code: code === null ? "TEMP-ABC123" : null, name, whatsapp: "+244923000000",
      address: "", birthday_day: null, birthday_month: null, occupation: "", client_type: "cliente_final", seller_id: null,
      funnel_stage: "contacto", referred_by: null, consent: false, consent_at: null, consent_by: null, opt_out: false,
      opt_out_at: null, notes: "", perfume_preferences: "", created_at: "", created_by: null, updated_at: "", erased_at: null, ...extra,
    },
    summary: summary
      ? { client_id: "x", last_purchase_at: null, days_without_purchase: null, total_spent: 0, open_debt: 0, points: 0, active_coupons: 0, referrals_who_bought: 0, ...summary }
      : null,
    tagIds,
  };
}

const rows = [
  row(1, "Ana Conceição", { whatsapp: "+244923111222" }, { last_purchase_at: "2026-10-01", days_without_purchase: 37, open_debt: "5000.00" }, ["vip"]),
  row(7, "Bruno Mendes", { client_type: "revendedor", funnel_stage: "proposta" }, { last_purchase_at: "2026-11-01", days_without_purchase: 6 }),
  row(12, "Carla Ana", { erased_at: "2026-11-01" }),
  row(null, "Daniel Offline"),
];
const names = (r: ClientRow[]) => r.map((x) => x.client.name);

describe("pesquisa de clientes", () => {
  it("por código, com ou sem zeros", () => {
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, search: "7" }))).toEqual(["Bruno Mendes"]);
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, search: "0001" }))).toEqual(["Ana Conceição"]);
  });
  it("por nome, sem acentos e por palavras", () => {
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, search: "conceicao" }))).toEqual(["Ana Conceição"]);
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, search: "ana con" }))).toEqual(["Ana Conceição"]);
  });
  it("por parte do WhatsApp", () => {
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, search: "111 222" }))).toEqual(["Ana Conceição"]);
  });
  it("por código temporário", () => {
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, search: "temp-abc" }))).toEqual(["Daniel Offline"]);
  });
  it("esconde clientes apagados (Lei 22/11)", () => {
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, search: "carla" }))).toEqual([]);
  });
});

describe("filtros", () => {
  it("tipo, etapa e etiqueta", () => {
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, type: "revendedor" }))).toEqual(["Bruno Mendes"]);
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, stage: "proposta" }))).toEqual(["Bruno Mendes"]);
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, tagId: "vip" }))).toEqual(["Ana Conceição"]);
  });
  it("dias sem comprar e nunca comprou", () => {
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, inactiveDays: "28" }))).toEqual(["Ana Conceição"]);
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, inactiveDays: "nunca" }))).toEqual(["Daniel Offline"]);
  });
  it("com dívida", () => {
    expect(names(filterClients(rows, { ...EMPTY_FILTERS, withDebt: true }))).toEqual(["Ana Conceição"]);
  });
});

describe("auxiliares", () => {
  it("fold tira acentos", () => expect(fold("ÁGUA São")).toBe("agua sao"));
  it("ordena por código com offline no fim", () => {
    expect(sortByCode([rows[3], rows[1], rows[0]]).map((r) => r.client.code)).toEqual([1, 7, null]);
  });
});
