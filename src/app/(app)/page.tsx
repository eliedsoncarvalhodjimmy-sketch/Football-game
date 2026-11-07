"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";
import { NAV_ITEMS } from "@/components/nav-items";

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("pt-AO", { hour: "numeric", hour12: false, timeZone: "Africa/Luanda" }).format(new Date()));
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

export default function InicioPage() {
  const profile = useProfile();
  const firstName = profile.full_name.split(" ")[0];
  return (
    <>
      <PageHeader title={`${greeting()}${firstName ? `, ${firstName}` : ""}`} subtitle="Cuidamos de si!" />
      <div className="grid gap-3 sm:grid-cols-2">
        {NAV_ITEMS.filter((i) => i.href !== "/").map(({ href, label, Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3 hover:border-vinho">
              <Icon className="h-6 w-6 text-vinho" />
              <span className="font-semibold text-vinho-escuro">{label}</span>
            </Card>
          </Link>
        ))}
      </div>
      {profile.role === "ceo" && (
        <p className="mt-6 text-sm text-texto-suave">
          O painel com vendas e metas do mês chega na Fase 2.
        </p>
      )}
    </>
  );
}
