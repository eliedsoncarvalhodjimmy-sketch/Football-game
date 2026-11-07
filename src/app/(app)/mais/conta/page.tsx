"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { PasswordForm } from "@/components/password-form";
import { Badge, Button, Card, Field, Notice } from "@/components/ui";
import { useAuth, useProfile } from "@/lib/auth/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ContaPage() {
  const profile = useProfile();
  const { refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile.full_name);
  const [msg, setMsg] = useState<{ kind: "erro" | "sucesso"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setMsg({ kind: "erro", text: "Indique o nome." });
    setBusy(true);
    const { error } = await getSupabaseBrowserClient().rpc("update_my_profile", { p_full_name: name, p_password_changed: false });
    setBusy(false);
    if (error) return setMsg({ kind: "erro", text: "Não foi possível guardar. Verifique a ligação." });
    setMsg({ kind: "sucesso", text: "Nome guardado." });
    await refreshProfile();
  }

  return (
    <>
      <PageHeader title="A minha conta" subtitle={profile.email} />
      <div className="flex flex-col gap-4">
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="vinho">{profile.role === "ceo" ? "CEO" : "Vendedor"}</Badge>
            {profile.is_adm && <Badge tone="dourado">ADM</Badge>}
          </div>
          <form onSubmit={saveName} className="flex flex-col gap-4">
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            <Field label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <Button type="submit" variant="secundario" loading={busy} className="self-start">
              Guardar nome
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Trocar palavra-passe</h2>
          <PasswordForm onDone={() => setMsg({ kind: "sucesso", text: "Palavra-passe trocada." })} />
        </Card>
        <Button variant="perigo" onClick={() => void signOut()} className="self-start">
          Sair da conta
        </Button>
      </div>
    </>
  );
}
