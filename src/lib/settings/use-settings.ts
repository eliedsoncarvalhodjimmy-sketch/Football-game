"use client";

import { useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { readLocal, writeLocal } from "@/lib/storage";
import { useLoader } from "@/lib/use-loader";

export interface SettingsMap {
  /** valor da definição, ou null se estiver desligada */
  get<T = Record<string, unknown>>(key: string): T | null;
}

type Row = { key: string; value: unknown; active: boolean };
const CACHE = "smell.definicoes";

export function settingsFromRows(rows: Row[]): SettingsMap {
  const map = new Map(rows.map((r) => [r.key, r]));
  return {
    get<T>(key: string) {
      const r = map.get(key);
      return r && r.active ? (r.value as T) : null;
    },
  };
}

/** Lê as definições (com cópia no aparelho para funcionar offline). */
export async function fetchSettings(): Promise<SettingsMap> {
  const { data, error } = await getSupabaseBrowserClient().from("settings").select("key, value, active");
  if (error || !data) {
    const cached = readLocal<Row[]>(CACHE);
    if (cached) return settingsFromRows(cached);
    throw new Error("Não foi possível carregar as definições.");
  }
  writeLocal(CACHE, data);
  return settingsFromRows(data as Row[]);
}

export function useSettings() {
  const load = useCallback(() => fetchSettings(), []);
  return useLoader(load);
}
