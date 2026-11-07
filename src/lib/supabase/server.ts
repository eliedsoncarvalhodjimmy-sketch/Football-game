import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublicEnv } from "./env";

/** Cliente Supabase no servidor, em nome do utilizador com sessão iniciada (respeita RLS). */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, anonKey } = supabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component: a sessão é renovada noutro pedido.
        }
      },
    },
  });
}

/**
 * Cliente com a chave "service_role" (ignora RLS). SÓ para tarefas de administração
 * do CEO no servidor, por exemplo criar a conta de um vendedor. Nunca chega ao browser.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const { url } = supabasePublicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY em falta (só deve existir no servidor).");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
