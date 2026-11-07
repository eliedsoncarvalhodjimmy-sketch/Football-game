"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientName } from "@/components/clients/client-name";
import { PageHeader } from "@/components/page-header";
import { SaleBadges } from "@/components/sales/sale-badges";
import { Notice, Spinner } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";
import { fold } from "@/lib/clients/filters";
import { formatDateTime, formatKz } from "@/lib/format";
import { fetchSales, type SaleRow } from "@/lib/sales/api";
import { formatSaleNumber } from "@/lib/sales/model";
import { useLoader } from "@/lib/use-loader";

type Tab = "todas" | "aguarda" | "divida" | "canceladas";
const TABS: { value: Tab; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "aguarda", label: "A aprovar" },
  { value: "divida", label: "Em dívida" },
  { value: "canceladas", label: "Canceladas" },
];

function matchTab(s: SaleRow, tab: Tab): boolean {
  if (tab === "aguarda") return s.status === "aguarda_aprovacao";
  if (tab === "divida") return s.status === "confirmada" && s.payment_status !== "paga";
  if (tab === "canceladas") return s.status === "cancelada";
  return true;
}

export default function VendasPage() {
  const me = useProfile();
  const { data, error } = useLoader(fetchSales);
  const [tab, setTab] = useState<Tab>("todas");
  const [search, setSearch] = useState("");

  const pending = (data ?? []).filter((s) => s.status === "aguarda_aprovacao").length;
  const visible = useMemo(() => {
    const q = fold(search.trim());
    return (data ?? []).filter((s) => matchTab(s, tab)).filter((s) => {
      if (!q) return true;
      if (/^\d+$/.test(q)) return String(s.number) === String(Number(q)) || s.clients?.code === Number(q);
      return fold(s.clients?.name ?? "").includes(q);
    });
  }, [data, tab, search]);

  return (
    <>
      <PageHeader
        title="Vendas"
        actions={<Link href="/vendas/nova" className="inline-flex min-h-11 items-center rounded-full bg-vinho px-5 font-semibold text-creme hover:bg-vinho-escuro">Nova venda</Link>}
      />
      {me.role === "ceo" && pending > 0 && tab !== "aguarda" && (
        <div className="mb-4">
          <Notice>
            <button type="button" className="font-semibold text-vinho underline-offset-4 hover:underline" onClick={() => setTab("aguarda")}>
              {pending} {pending === 1 ? "venda aguarda" : "vendas aguardam"} a sua aprovação.
            </button>
          </Notice>
        </div>
      )}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar vendas">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === t.value ? "bg-vinho text-creme" : "border border-linha bg-superficie text-vinho-escuro"}`}
          >
            {t.label}
            {t.value === "aguarda" && pending > 0 ? ` (${pending})` : ""}
          </button>
        ))}
      </div>
      <input
        type="search"
        aria-label="Pesquisar vendas"
        placeholder="Pesquisar por cliente, código ou n.º da venda"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 min-h-11 w-full rounded-full border border-linha bg-white px-4 text-base outline-none focus:border-vinho"
      />
      {error && <Notice kind="erro">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && visible.length === 0 && <p className="py-10 text-center text-sm text-texto-suave">{data.length === 0 ? "Ainda não há vendas." : "Nenhuma venda neste filtro."}</p>}
      <ul className="flex flex-col gap-2" aria-label="Lista de vendas">
        {visible.map((s) => (
          <li key={s.id}>
            <Link href={`/vendas/ficha?id=${s.id}`} className="block rounded-[var(--radius-cartao)] border border-linha bg-superficie p-4 hover:border-vinho">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-vinho-escuro">Venda {formatSaleNumber(s.number)}</span>
                <span className="font-semibold">{formatKz(s.total)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-texto-suave">
                {s.clients ? <ClientName code={s.clients.code} name={s.clients.name} /> : <span>—</span>}
                <span>{formatDateTime(s.created_at)}</span>
              </div>
              <div className="mt-2"><SaleBadges status={s.status} paymentStatus={s.payment_status} /></div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
