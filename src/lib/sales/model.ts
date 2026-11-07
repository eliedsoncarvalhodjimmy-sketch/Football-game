import type { SettingsMap } from "@/lib/settings/use-settings";
import type { FreeRule } from "./pricing";

export type SaleStatus = "rascunho" | "aguarda_aprovacao" | "confirmada" | "cancelada";
export type PaymentStatus = "em_divida" | "parcial" | "paga";
export type PaymentMethod = "numerario" | "transferencia" | "multicaixa_express";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "numerario", label: "Numerário" },
  { value: "transferencia", label: "Transferência" },
  { value: "multicaixa_express", label: "Multicaixa Express" },
];

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  rascunho: "Rascunho",
  aguarda_aprovacao: "Aguarda aprovação",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  em_divida: "Em dívida",
  parcial: "Pago em parte",
  paga: "Paga",
};

export function methodLabel(m: string): string {
  return PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;
}

export interface PointsTier {
  pontos: number;
  tipo: "percentagem" | "paga1leva2";
  valor?: number;
  item_gratis?: "menor_valor" | "maior_valor";
}

export interface PointsSettings {
  kz_por_ponto: number;
  minimo_troca: number;
  escaloes: PointsTier[];
}

/** Escalões de pontos que o cliente pode usar agora (D15: só a partir do mínimo). */
export function availableTiers(settings: SettingsMap, balance: number): PointsTier[] {
  const pts = settings.get<PointsSettings>("fidelidade.pontos");
  if (!pts) return [];
  return (pts.escaloes ?? [])
    .filter((t) => t.pontos >= (pts.minimo_troca ?? 50) && t.pontos <= balance)
    .sort((a, b) => a.pontos - b.pontos);
}

export function tierLabel(t: PointsTier): string {
  return t.tipo === "percentagem" ? `${t.pontos} pontos — ${t.valor}% de desconto` : `${t.pontos} pontos — paga 1, leva 2`;
}

/** Converte o escalão escolhido nos parâmetros do cálculo. */
export function tierToPricing(t: PointsTier | null): { pointsBp: number; freeRule: FreeRule } {
  if (!t) return { pointsBp: 0, freeRule: null };
  if (t.tipo === "percentagem") return { pointsBp: Math.round((t.valor ?? 0) * 100), freeRule: null };
  return { pointsBp: 0, freeRule: t.item_gratis === "maior_valor" ? "maior_valor" : "menor_valor" };
}

/** Data limite proposta: hoje (Luanda) + prazo das Definições, em aaaa-mm-dd. */
export function defaultDueDate(settings: SettingsMap, now = new Date()): string {
  const days = settings.get<{ dias: number }>("vendas.prazo_divida_dias")?.dias ?? 35;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Luanda" }).format(now); // aaaa-mm-dd
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatSaleNumber(n: number | null | undefined): string {
  return n ? `n.º ${String(n).padStart(4, "0")}` : "(a sincronizar)";
}
