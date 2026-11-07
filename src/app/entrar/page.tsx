"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { SetupNeeded } from "@/components/setup-needed";
import { Button, Field, Notice } from "@/components/ui";
import { useAuth } from "@/lib/auth/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function loginErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Email ou palavra-passe incorrectos.";
  if (/banned|user is banned/i.test(message)) return "A sua conta está desactivada. Fale com o CEO.";
  if (/email not confirmed/i.test(message)) return "O email desta conta ainda não foi confirmado.";
  if (/fetch|network/i.test(message)) return "Sem ligação à internet. Para entrar pela primeira vez precisa de rede.";
  return "Não foi possível entrar. Tente de novo.";
}

export default function EntrarPage() {
  const { status, notice } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "pronto") router.replace("/");
  }, [status, router]);

  if (status === "sem_configuracao") return <SetupNeeded />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!navigator.onLine) {
      setError("Sem ligação à internet. Para entrar precisa de rede; depois a app funciona offline.");
      return;
    }
    setBusy(true);
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) setError(loginErrorMessage(error.message));
  }

  return (
    <AuthFrame title="Entrar">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {notice && <Notice kind="erro">{notice}</Notice>}
        {error && <Notice kind="erro">{error}</Notice>}
        <Field label="Email" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Palavra-passe" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" loading={busy} disabled={!email || !password}>
          Entrar
        </Button>
        <p className="text-center text-xs text-texto-suave">
          Esqueceu-se da palavra-passe? Peça ao CEO para gerar uma nova.
        </p>
      </form>
    </AuthFrame>
  );
}
