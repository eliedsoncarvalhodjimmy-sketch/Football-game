"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabasePublicEnv } from "@/lib/supabase/env";
import type { ProductRecord, Product, Variant } from "./model";

export interface VariantWithStock extends Variant {
  stock: number;
  cost: string | null; // null para o Vendedor (nunca chega ao aparelho dele)
}

export interface ProductWithVariants extends Product {
  variants: VariantWithStock[];
}

export interface Movement {
  id: string;
  variant_id: string;
  quantity: number;
  movement_type: string;
  reason: string;
  sale_id: string | null;
  created_at: string;
  created_by: string | null;
}

function fail(message: string): never {
  throw new Error(message);
}

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { url } = supabasePublicEnv();
  return `${url}/storage/v1/object/public/produtos/${path}`;
}

/** Produtos com variações e stock. O custo só é pedido quando `withCost` (CEO). */
export async function fetchProducts(withCost: boolean): Promise<ProductWithVariants[]> {
  const sb = getSupabaseBrowserClient();
  const [p, v, s, c] = await Promise.all([
    sb.from("products").select("*").order("name"),
    sb.from("product_variants").select("*").order("label"),
    sb.from("variant_stock").select("variant_id, quantity"),
    withCost ? sb.from("product_variant_costs").select("variant_id, cost_price") : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error || v.error || s.error || c.error) fail("Não foi possível carregar os produtos. Verifique a ligação.");
  const stock = new Map((s.data as { variant_id: string; quantity: number }[]).map((x) => [x.variant_id, x.quantity]));
  const costs = new Map(((c.data ?? []) as { variant_id: string; cost_price: string }[]).map((x) => [x.variant_id, x.cost_price]));
  const byProduct = new Map<string, VariantWithStock[]>();
  for (const variant of v.data as Variant[]) {
    const list = byProduct.get(variant.product_id) ?? [];
    list.push({ ...variant, stock: stock.get(variant.id) ?? 0, cost: costs.get(variant.id) ?? null });
    byProduct.set(variant.product_id, list);
  }
  return (p.data as Product[]).map((prod) => ({ ...prod, variants: byProduct.get(prod.id) ?? [] }));
}

function friendly(message: string): string {
  if (/sku|duplicate|unique/i.test(message)) return "Já existe uma variação com esse código (SKU).";
  if (/row-level security|permission/i.test(message)) return "Não tem permissão para esta alteração.";
  if (/stock_adjust_has_reason/.test(message)) return "Explique o motivo do ajuste.";
  return "Não foi possível guardar. Verifique a ligação e tente de novo.";
}

/** Grava produto, variações e custos (CEO). Variações não se apagam: desactivam-se. */
export async function saveProduct(id: string, record: ProductRecord, isNew: boolean): Promise<string> {
  const sb = getSupabaseBrowserClient();
  const { error: pe } = !isNew
    ? await sb.from("products").update(record.product).eq("id", id)
    : await sb.from("products").insert({ id, ...record.product });
  if (pe) fail(friendly(pe.message));
  if (record.variants.length) {
    const { error: ve } = await sb.from("product_variants").upsert(record.variants.map((v) => ({ ...v, product_id: id })), { onConflict: "id" });
    if (ve) fail(friendly(ve.message));
  }
  if (record.costs.length) {
    const { error: ce } = await sb.from("product_variant_costs").upsert(record.costs, { onConflict: "variant_id" });
    if (ce) fail("O produto foi guardado, mas falhou a gravação do custo.");
  }
  return id;
}

export async function uploadProductPhoto(productId: string, blob: Blob): Promise<string> {
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await getSupabaseBrowserClient().storage.from("produtos").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) fail("Não foi possível enviar a foto. Verifique a ligação.");
  return path;
}

export async function removeProductPhoto(path: string): Promise<void> {
  await getSupabaseBrowserClient().storage.from("produtos").remove([path]);
}

export async function addStockMovement(variantId: string, type: "entrada" | "ajuste", quantity: number, reason: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient()
    .from("stock_movements")
    .insert({ id: crypto.randomUUID(), variant_id: variantId, quantity, movement_type: type, reason });
  if (error) fail(friendly(error.message));
}

export async function fetchMovements(variantId: string): Promise<Movement[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("stock_movements")
    .select("id, variant_id, quantity, movement_type, reason, sale_id, created_at, created_by")
    .eq("variant_id", variantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) fail("Não foi possível carregar o histórico de stock.");
  return data as Movement[];
}
