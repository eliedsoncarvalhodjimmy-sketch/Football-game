"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readLocal, writeLocal } from "@/lib/storage";
import type { Profile } from "@/lib/types";

const PROFILE_CACHE = "smell.perfil";

type Status = "a_carregar" | "sem_configuracao" | "sem_sessao" | "pronto";

interface AuthState {
  status: Status;
  session: Session | null;
  profile: Profile | null;
  /** Aviso a mostrar no ecrã de entrada (ex.: conta desactivada). */
  notice: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<Status>(configured ? "a_carregar" : "sem_configuracao");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setSession(null);
      setProfile(null);
      writeLocal(PROFILE_CACHE, null);
      setStatus("sem_sessao");
      return;
    }
    setSession(s);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
    if (error || !data) {
      // Sem internet: usa o perfil guardado neste aparelho.
      const cached = readLocal<Profile>(PROFILE_CACHE);
      if (cached && cached.id === s.user.id) {
        setProfile(cached);
        setStatus("pronto");
        return;
      }
      if (!error && !data) {
        // Conta sem perfil activo (desactivada pelo CEO)
        setNotice("A sua conta está desactivada. Fale com o CEO.");
        await supabase.auth.signOut();
      }
      setProfile(null);
      setStatus("sem_sessao");
      return;
    }
    const p = data as Profile;
    if (!p.active) {
      setNotice("A sua conta está desactivada. Fale com o CEO.");
      writeLocal(PROFILE_CACHE, null);
      await supabase.auth.signOut();
      return;
    }
    writeLocal(PROFILE_CACHE, p);
    setProfile(p);
    setStatus("pronto");
  }, []);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) void loadProfile(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "INITIAL_SESSION") return; // já tratado acima
      if (event === "TOKEN_REFRESHED") {
        setSession(s);
        return;
      }
      void loadProfile(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [configured, loadProfile]);

  const refreshProfile = useCallback(async () => {
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    await loadProfile(data.session);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    writeLocal(PROFILE_CACHE, null);
    setNotice(null);
    await getSupabaseBrowserClient().auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ status, session, profile, notice, refreshProfile, signOut }),
    [status, session, profile, notice, refreshProfile, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}

/** Perfil do utilizador com sessão (só usar dentro da área protegida). */
export function useProfile(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error("useProfile sem sessão");
  return profile;
}

/** Pedido a uma rota /api do servidor, com a sessão do utilizador. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(path, { ...init, headers });
}
