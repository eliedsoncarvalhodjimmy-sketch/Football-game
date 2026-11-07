"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";

const ITEMS = [
  { href: "/mais/definicoes", title: "Definições", text: "Pontos, cupões, tecto de desconto, prazos e dados do recibo.", ceo: true },
  { href: "/mais/utilizadores", title: "Utilizadores", text: "Criar vendedores, palavras-passe, permissão ADM e etiquetas restritas.", ceo: true },
  { href: "/mais/etiquetas", title: "Etiquetas", text: "VIP, Embaixador e outras etiquetas de clientes.", ceo: true },
  { href: "/mais/conta", title: "A minha conta", text: "Nome, palavra-passe e sair.", ceo: false },
];

export default function MaisPage() {
  const profile = useProfile();
  const items = ITEMS.filter((i) => !i.ceo || profile.role === "ceo");
  return (
    <>
      <PageHeader title="Mais" />
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="block rounded-[var(--radius-cartao)] border border-linha bg-superficie p-4 hover:border-vinho">
              <span className="flex items-center gap-2 font-semibold text-vinho-escuro">
                {i.title} {i.ceo && <Badge>CEO</Badge>}
              </span>
              <span className="mt-1 block text-sm text-texto-suave">{i.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
