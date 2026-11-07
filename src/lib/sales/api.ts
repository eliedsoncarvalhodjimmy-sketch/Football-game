"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PaymentMethod, PaymentStatus, SaleStatus } from "./model";

export interface SalePayload {
  id: string;
  client_id: string;
  items: { variant_id: string; quantity: number }[];
  coupon_id: string | null;
  points_tier: number | null;
  manual_discount: number; // Kz (CEO aplica; Vendedor pede)
  discount_reason: string;
  cost_floor_exception: boolean;
  payments: { id: string; amount: number; method: PaymentMethod }[];
  due_date: string | null;
  notes: string;
  device_created_at: string;
}

export interface SubmitResult {
  id: string;
  number: number;
  status: SaleStatus;
  payment_status: PaymentStatus;
  total: number | string;
  paid: number | string;
  approval_reason: string;
  capped?: boolean;
  repetida?: boolean;
}

export interface SaleRow {
  id: string;
  number: number;
  client_id: string;
  seller_id: string;
  status: SaleStatus;
  payment_status: PaymentStatus;
  subtotal: string;
  coupon_discount: string;
  points_discount: string;
  manual_discount: string;
  total: string;
  coupon_id: string | null;
  points_redeemed: number;
  points_tier: number | null;
  cost_floor_exception: boolean;
  due_date: string | null;
  notes: string;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  approval_reason: string;
  request_payload: SalePayload | null;
  clients: { code: number | null; name: string; client_type: string } | null;
}

export interface SaleItem {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price: string;
  discount_amount: string;
  line_total: string;
  is_free_item: boolean;
}

export interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  paid_at: string;
  created_by: string | null;
}

function fail(message: string): never {
  throw new Error(message);
}

/** Mensagens do servidor já vêm em português (raise exception); as técnicas são traduzidas. */
export function saleErrorMessage(message: string): string {
  if (/fetch|network|Failed to fetch/i.test(message)) return "Sem ligação à internet. A venda não foi gravada (o modo offline chega no passo 1I).";
  if (/permission|42501|row-level/i.test(message)) return "Não tem permissão para esta operação.";
  if (/^[A-ZÀ-Ú"“]/.test(message) && /[a-zà-ú]/.test(message) && !/violates|syntax|function|column/i.test(message)) return message;
  return "Não foi possível gravar a venda. Tente de novo.";
}

export async function submitSale(payload: SalePayload): Promise<SubmitResult> {
  const { data, error } = await getSupabaseBrowserClient().rpc("submit_sale", { p: payload });
  if (error) fail(saleErrorMessage(error.message));
  return data as SubmitResult;
}

export async function decideSale(saleId: string, decision: "aprovar" | "sem_desconto" | "anular", amount: number, note: string, exception: boolean): Promise<SubmitResult> {
  const { data, error } = await getSupabaseBrowserClient().rpc("decide_sale", {
    p_sale_id: saleId, p_decision: decision, p_amount: amount, p_note: note, p_exception: exception,
  });
  if (error) fail(saleErrorMessage(error.message));
  return data as SubmitResult;
}

export async function cancelSale(saleId: string, reason: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("cancel_sale", { p_sale_id: saleId, p_reason: reason });
  if (error) fail(saleErrorMessage(error.message));
}

export async function fetchSales(limit = 300): Promise<SaleRow[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("sales")
    .select("*, clients(code, name, client_type)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("Não foi possível carregar as vendas. Verifique a ligação.");
  return data as SaleRow[];
}

export interface SaleDetail {
  sale: SaleRow;
  items: SaleItem[];
  payments: Payment[];
  margin: string | null;
  couponCode: string | null;
}

export async function fetchSaleDetail(id: string, withMargin: boolean): Promise<SaleDetail | null> {
  const sb = getSupabaseBrowserClient();
  const [s, i, p, m] = await Promise.all([
    sb.from("sales").select("*, clients(code, name, client_type)").eq("id", id).maybeSingle(),
    sb.from("sale_items").select("id, variant_id, quantity, unit_price, discount_amount, line_total, is_free_item").eq("sale_id", id),
    sb.from("payments").select("id, amount, method, paid_at, created_by").eq("sale_id", id).order("paid_at"),
    withMargin ? sb.from("sale_margins").select("margin").eq("sale_id", id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (s.error || i.error || p.error) fail("Não foi possível carregar a venda. Verifique a ligação.");
  if (!s.data) return null;
  const sale = s.data as SaleRow;
  let couponCode: string | null = null;
  if (sale.coupon_id) {
    const { data } = await sb.from("coupons").select("code").eq("id", sale.coupon_id).maybeSingle();
    couponCode = (data as { code: string } | null)?.code ?? null;
  }
  return { sale, items: i.data as SaleItem[], payments: p.data as Payment[], margin: (m.data as { margin: string } | null)?.margin ?? null, couponCode };
}

/** Benefícios do cliente para a venda: saldo de pontos e cupões válidos. */
export async function fetchClientBenefits(clientId: string): Promise<{ points: number; coupons: { id: string; code: string; percent: number; expires_at: string }[] }> {
  const sb = getSupabaseBrowserClient();
  const [s, c] = await Promise.all([
    sb.from("client_summary").select("points").eq("client_id", clientId).maybeSingle(),
    sb.from("coupons").select("id, code, percent, expires_at").eq("client_id", clientId).eq("status", "activo").gt("expires_at", new Date().toISOString()).order("expires_at"),
  ]);
  return {
    points: Number((s.data as { points: number } | null)?.points ?? 0),
    coupons: ((c.data ?? []) as { id: string; code: string; percent: number | string; expires_at: string }[]).map((x) => ({ ...x, percent: Number(x.percent) })),
  };
}
