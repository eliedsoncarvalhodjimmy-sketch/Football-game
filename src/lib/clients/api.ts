"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, Tag } from "@/lib/types";
import type { ClientRow } from "./filters";
import { makeTempCode, type Client, type ClientRecord, type ClientSummary } from "./model";

export interface ClientNote {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  percent: number | string;
  status: string;
  expires_at: string;
}

export interface ClientDetail {
  client: Client;
  summary: ClientSummary | null;
  tagIds: string[];
  notes: ClientNote[];
  referrer: Pick<Client, "id" | "code" | "name"> | null;
  referred: { id: string; code: number | null; name: string; bought: boolean }[];
  coupons: Coupon[];
}

export interface ClientsBundle {
  rows: ClientRow[];
  tags: Tag[];
  team: Pick<Profile, "id" | "full_name" | "email" | "role" | "active">[];
}

function fail(message: string): never {
  throw new Error(message);
}

/** Lista de clientes (com resumo e etiquetas), etiquetas visíveis e equipa. */
export async function fetchClientsBundle(): Promise<ClientsBundle> {
  const sb = getSupabaseBrowserClient();
  const [c, s, ct, t, p] = await Promise.all([
    sb.from("clients").select("*").is("erased_at", null),
    sb.from("client_summary").select("*"),
    sb.from("client_tags").select("client_id, tag_id"),
    sb.from("tags").select("id, name, color, is_system").order("name"),
    sb.from("profiles").select("id, full_name, email, role, active").order("full_name"),
  ]);
  if (c.error || s.error || ct.error || t.error || p.error) fail("Não foi possível carregar os clientes. Verifique a ligação.");
  const summaries = new Map((s.data as ClientSummary[]).map((x) => [x.client_id, x]));
  const tagsBy = new Map<string, string[]>();
  for (const r of ct.data as { client_id: string; tag_id: string }[]) {
    tagsBy.set(r.client_id, [...(tagsBy.get(r.client_id) ?? []), r.tag_id]);
  }
  return {
    rows: (c.data as Client[]).map((client) => ({ client, summary: summaries.get(client.id) ?? null, tagIds: tagsBy.get(client.id) ?? [] })),
    tags: t.data as Tag[],
    team: p.data as ClientsBundle["team"],
  };
}

export async function fetchClientDetail(id: string): Promise<ClientDetail | null> {
  const sb = getSupabaseBrowserClient();
  const [c, s, ct, n, r, cp] = await Promise.all([
    sb.from("clients").select("*").eq("id", id).maybeSingle(),
    sb.from("client_summary").select("*").eq("client_id", id).maybeSingle(),
    sb.from("client_tags").select("tag_id").eq("client_id", id),
    sb.from("client_notes").select("id, body, created_at, created_by").eq("client_id", id).order("created_at", { ascending: false }),
    sb.from("clients").select("id, code, name").eq("referred_by", id).is("erased_at", null).order("code"),
    sb.from("coupons").select("id, code, percent, status, expires_at").eq("client_id", id).eq("status", "activo").order("expires_at"),
  ]);
  if (c.error || s.error || ct.error || n.error || r.error || cp.error) fail("Não foi possível carregar o cliente. Verifique a ligação.");
  if (!c.data) return null;
  const client = c.data as Client;
  let referrer: ClientDetail["referrer"] = null;
  if (client.referred_by) {
    const { data } = await sb.from("clients").select("id, code, name").eq("id", client.referred_by).maybeSingle();
    referrer = (data as ClientDetail["referrer"]) ?? null;
  }
  const referredIds = (r.data as { id: string }[]).map((x) => x.id);
  const bought = new Set<string>();
  if (referredIds.length) {
    const { data } = await sb.from("referrals").select("referred_id, first_sale_id").in("referred_id", referredIds);
    for (const x of (data as { referred_id: string; first_sale_id: string | null }[]) ?? []) if (x.first_sale_id) bought.add(x.referred_id);
  }
  return {
    client,
    summary: (s.data as ClientSummary) ?? null,
    tagIds: (ct.data as { tag_id: string }[]).map((x) => x.tag_id),
    notes: n.data as ClientNote[],
    referrer,
    referred: (r.data as { id: string; code: number | null; name: string }[]).map((x) => ({ ...x, bought: bought.has(x.id) })),
    coupons: cp.data as Coupon[],
  };
}

function friendly(message: string): string {
  if (/whatsapp_check/.test(message)) return "Número de WhatsApp inválido.";
  if (/indicação já não pode/i.test(message)) return "A indicação já não pode ser alterada: o cliente já comprou.";
  if (/not_self_referred/.test(message)) return "Um cliente não pode indicar-se a si próprio.";
  if (/row-level security|permission/i.test(message)) return "Não tem permissão para esta alteração.";
  return "Não foi possível guardar. Verifique a ligação e tente de novo.";
}

async function syncTags(clientId: string, next: string[], prev: string[]) {
  const sb = getSupabaseBrowserClient();
  const add = next.filter((t) => !prev.includes(t));
  const remove = prev.filter((t) => !next.includes(t));
  if (add.length) {
    const { error } = await sb.from("client_tags").insert(add.map((tag_id) => ({ client_id: clientId, tag_id })));
    if (error) fail("O cliente foi guardado, mas falhou a gravação das etiquetas.");
  }
  if (remove.length) {
    const { error } = await sb.from("client_tags").delete().eq("client_id", clientId).in("tag_id", remove);
    if (error) fail("O cliente foi guardado, mas falhou a gravação das etiquetas.");
  }
}

/** Cria o cliente. O ID e o código temporário nascem no aparelho; o código final vem do servidor. */
export async function createClient(record: ClientRecord, tagIds: string[]): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await getSupabaseBrowserClient().from("clients").insert({ id, temp_code: makeTempCode(id), ...record });
  if (error) fail(friendly(error.message));
  await syncTags(id, tagIds, []);
  return id;
}

export async function updateClient(id: string, record: ClientRecord, tagIds: string[], prevTagIds: string[]): Promise<void> {
  const { error } = await getSupabaseBrowserClient().from("clients").update(record).eq("id", id);
  if (error) fail(friendly(error.message));
  await syncTags(id, tagIds, prevTagIds);
}

export async function addClientNote(clientId: string, body: string): Promise<void> {
  const text = body.trim();
  if (!text) fail("Escreva a nota.");
  const { error } = await getSupabaseBrowserClient().from("client_notes").insert({ id: crypto.randomUUID(), client_id: clientId, body: text });
  if (error) fail(friendly(error.message));
}

export async function exportClientData(clientId: string): Promise<unknown> {
  const { data, error } = await getSupabaseBrowserClient().rpc("export_client_data", { p_client_id: clientId });
  if (error) fail("Não foi possível exportar os dados.");
  return data;
}

export async function eraseClient(clientId: string): Promise<"apagado" | "anonimizado"> {
  const { data, error } = await getSupabaseBrowserClient().rpc("erase_client", { p_client_id: clientId });
  if (error) fail("Não foi possível apagar os dados.");
  return data as "apagado" | "anonimizado";
}
