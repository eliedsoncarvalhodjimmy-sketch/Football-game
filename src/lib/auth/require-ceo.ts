import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/lib/supabase/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type CeoCheck =
  | { ok: true; admin: SupabaseClient; asCeo: SupabaseClient; ceoId: string }
  | { ok: false; status: number; error: string };

/**
 * Confirma que o pedido vem de um CEO activo (sessão enviada no cabeçalho Authorization).
 * Só depois disso se usa a chave service_role (apenas para a conta de acesso: criar,
 * palavra-passe, bloqueio). Os perfis alteram-se em nome do CEO, para ficarem auditados.
 */
export async function requireCeo(request: Request): Promise<CeoCheck> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return { ok: false, status: 401, error: "Sessão em falta. Entre de novo." };

  let admin: SupabaseClient;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return { ok: false, status: 500, error: "Servidor sem a chave SUPABASE_SERVICE_ROLE_KEY (ver README)." };
  }
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return { ok: false, status: 401, error: "Sessão inválida. Entre de novo." };

  const { data: profile } = await admin
    .from("profiles")
    .select("role, active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "ceo" || !profile.active) {
    return { ok: false, status: 403, error: "Só o CEO pode gerir utilizadores." };
  }
  // Cliente "em nome do CEO": as alterações ficam na auditoria com o nome dele.
  const { url, anonKey } = supabasePublicEnv();
  const asCeo = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { ok: true, admin, asCeo, ceoId: userData.user.id };
}

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}
