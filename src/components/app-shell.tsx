"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ConnectionStatus } from "./connection-status";
import { NAV_ITEMS, isActive } from "./nav-items";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-linha bg-superficie px-4 py-6 md:flex">
        <Link href="/" className="mb-8 block px-2" aria-label="Smell CRM — Início">
          <Image src="/brand/horizontal-vinho-dourado.png" alt="Smell" width={180} height={55} priority />
        </Link>
        <nav aria-label="Menu principal" className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors ${
                  active ? "bg-vinho text-creme" : "text-vinho-escuro hover:bg-creme"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/mais/conta" className="mt-auto rounded-xl px-2 py-2 hover:bg-creme">
          <span className="block truncate text-sm font-semibold text-vinho-escuro">{profile?.full_name || profile?.email}</span>
          <span className="block text-xs text-texto-suave">{profile?.role === "ceo" ? "CEO" : "Vendedor"} · Cuidamos de si!</span>
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ConnectionStatus />
        {/* Cabeçalho (telemóvel) */}
        <header className="flex items-center justify-center border-b border-linha bg-superficie px-4 py-3 md:hidden">
          <Image src="/brand/horizontal-vinho-dourado.png" alt="Smell" width={120} height={37} priority />
        </header>
        <main className="pb-barra mx-auto w-full max-w-5xl flex-1 px-4 pt-6 md:px-8">{children}</main>
      </div>

      {/* Barra inferior (telemóvel) */}
      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                    active ? "text-vinho" : "text-texto-suave"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${active ? "stroke-[2.2]" : ""}`} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
