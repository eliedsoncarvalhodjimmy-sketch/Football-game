"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "./env";

let client: SupabaseClient | undefined;

/** Cliente Supabase para o browser (um só por separador). A segurança vem das regras RLS na base de dados. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = supabasePublicEnv();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
