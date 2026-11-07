"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Spinner } from "./ui";
import { SetupNeeded } from "./setup-needed";

/** Protege a área da app: sem sessão vai para /entrar; palavra-passe a trocar vai para /trocar-palavra-passe. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const mustChange = status === "pronto" && profile?.must_change_password;

  useEffect(() => {
    if (status === "sem_sessao") router.replace("/entrar");
    else if (mustChange && pathname !== "/trocar-palavra-passe") router.replace("/trocar-palavra-passe");
  }, [status, mustChange, pathname, router]);

  if (status === "sem_configuracao") return <SetupNeeded />;
  if (status !== "pronto" || mustChange) return <Spinner />;
  return <>{children}</>;
}

/** Mostra o conteúdo só ao CEO. A segurança real está na base de dados (RLS); isto só arruma o ecrã. */
export function CeoOnly({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role !== "ceo") {
    return <p className="py-10 text-center text-sm text-texto-suave">Esta área é só para o CEO.</p>;
  }
  return <>{children}</>;
}
