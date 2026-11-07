"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { passwordProblem } from "@/lib/password";
import { Button, Field, Notice } from "./ui";

/** Troca da própria palavra-passe (usado no primeiro acesso e em "A minha conta"). */
export function PasswordForm({ onDone }: { onDone: () => void | Promise<void> }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = passwordProblem(pw);
    if (problem) return setError(problem);
    if (pw !== pw2) return setError("As duas palavras-passe não são iguais.");
    if (!navigator.onLine) return setError("Precisa de internet para trocar a palavra-passe.");
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return setError(
        /different from the old/i.test(error.message)
          ? "A nova palavra-passe tem de ser diferente da actual."
          : "Não foi possível trocar a palavra-passe. Tente de novo.",
      );
    }
    await supabase.rpc("update_my_profile", { p_full_name: null, p_password_changed: true });
    setBusy(false);
    setPw("");
    setPw2("");
    await onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && <Notice kind="erro">{error}</Notice>}
      <Field label="Nova palavra-passe" type="password" autoComplete="new-password" hint="Pelo menos 8 caracteres, com letras e números." value={pw} onChange={(e) => setPw(e.target.value)} />
      <Field label="Repita a nova palavra-passe" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      <Button type="submit" loading={busy} disabled={!pw || !pw2}>
        Guardar palavra-passe
      </Button>
    </form>
  );
}
