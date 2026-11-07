"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { PasswordForm } from "@/components/password-form";
import { SetupNeeded } from "@/components/setup-needed";
import { Button, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth/auth-context";

export default function TrocarPalavraPassePage() {
  const { status, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "sem_sessao") router.replace("/entrar");
    if (status === "pronto" && profile && !profile.must_change_password) router.replace("/");
  }, [status, profile, router]);

  if (status === "sem_configuracao") return <SetupNeeded />;
  if (status !== "pronto" || !profile?.must_change_password) return <Spinner />;

  return (
    <AuthFrame title="Escolha a sua palavra-passe">
      <p className="mb-4 text-sm text-texto-suave">
        Olá{profile.full_name ? `, ${profile.full_name}` : ""}! Por segurança, troque a palavra-passe que lhe foi dada.
      </p>
      <PasswordForm onDone={refreshProfile} />
      <Button variant="texto" className="mt-3 w-full" onClick={() => void signOut()}>
        Sair
      </Button>
    </AuthFrame>
  );
}
