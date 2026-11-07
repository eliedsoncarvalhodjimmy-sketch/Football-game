"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AmbassadorSeal, ClientName } from "@/components/clients/client-name";
import { PageHeader } from "@/components/page-header";
import { TagChip } from "@/components/tag-chip";
import { Button, Notice, Select, Spinner } from "@/components/ui";
import { fetchClientsBundle } from "@/lib/clients/api";
import { EMPTY_FILTERS, filterClients, sortByCode, type ClientFilters } from "@/lib/clients/filters";
import { CLIENT_TYPES, FUNNEL_STAGES, clientTypeLabel } from "@/lib/clients/model";
import { formatKz } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";

function lastPurchaseText(days: number | null | undefined): string {
  if (days === null || days === undefined) return "Ainda não comprou";
  if (days === 0) return "Comprou hoje";
  if (days === 1) return "Comprou ontem";
  return `${days} dias sem comprar`;
}

export default function ClientesPage() {
  const { data, error } = useLoader(fetchClientsBundle);
  const [filters, setFilters] = useState<ClientFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const visible = useMemo(() => (data ? sortByCode(filterClients(data.rows, filters)) : []), [data, filters]);
  const tagMap = useMemo(() => new Map((data?.tags ?? []).map((t) => [t.id, t])), [data]);
  const ambassadorId = data?.tags.find((t) => t.is_system && t.name === "Embaixador")?.id;
  const activeFilterCount = [filters.type, filters.tagId, filters.stage, filters.inactiveDays, filters.withDebt ? "x" : ""].filter(Boolean).length;
  const set = <K extends keyof ClientFilters>(k: K, v: ClientFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={data ? `${data.rows.length} ${data.rows.length === 1 ? "cliente" : "clientes"}` : undefined}
        actions={<Link href="/clientes/novo" className="inline-flex min-h-11 items-center rounded-full bg-vinho px-5 font-semibold text-creme hover:bg-vinho-escuro">Novo cliente</Link>}
      />
      <div className="mb-4 flex gap-2">
        <input
          type="search"
          aria-label="Pesquisar clientes"
          placeholder="Pesquisar por código, nome ou WhatsApp"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="min-h-11 flex-1 rounded-full border border-linha bg-white px-4 text-base outline-none focus:border-vinho"
        />
        <Button variant="secundario" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
          Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>
      {showFilters && data && (
        <div className="mb-4 grid gap-3 rounded-[var(--radius-cartao)] border border-linha bg-superficie p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Tipo" value={filters.type} onChange={(e) => set("type", e.target.value as ClientFilters["type"])}>
            <option value="">Todos</option>
            {CLIENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Select label="Etiqueta" value={filters.tagId} onChange={(e) => set("tagId", e.target.value)}>
            <option value="">Todas</option>
            {data.tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select label="Etapa do funil" value={filters.stage} onChange={(e) => set("stage", e.target.value as ClientFilters["stage"])}>
            <option value="">Todas</option>
            {FUNNEL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Select label="Dias sem comprar" value={filters.inactiveDays} onChange={(e) => set("inactiveDays", e.target.value)}>
            <option value="">Todos</option>
            <option value="28">28 dias ou mais</option>
            <option value="60">60 dias ou mais</option>
            <option value="90">90 dias ou mais</option>
            <option value="nunca">Nunca compraram</option>
          </Select>
          <label className="flex min-h-11 items-center gap-3 self-end">
            <input type="checkbox" className="h-5 w-5 accent-[#710014]" checked={filters.withDebt} onChange={(e) => set("withDebt", e.target.checked)} />
            <span className="font-medium text-vinho-escuro">Só com dívida</span>
          </label>
          <Button variant="texto" className="self-end" onClick={() => setFilters({ ...EMPTY_FILTERS, search: filters.search })}>Limpar filtros</Button>
        </div>
      )}
      {error && <Notice kind="erro">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-texto-suave">
          {data.rows.length === 0 ? "Ainda não há clientes. Registe o primeiro em “Novo cliente”." : "Nenhum cliente corresponde à pesquisa."}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {visible.map(({ client: c, summary: s, tagIds }) => (
          <li key={c.id}>
            <Link href={`/clientes/ficha?id=${c.id}`} className="block rounded-[var(--radius-cartao)] border border-linha bg-superficie p-4 hover:border-vinho">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ClientName code={c.code} tempCode={c.temp_code} name={c.name} className="font-semibold text-vinho-escuro" />
                {Number(s?.open_debt ?? 0) > 0 && <span className="text-sm font-semibold text-erro">Dívida {formatKz(s?.open_debt)}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-suave">
                <span>{clientTypeLabel(c.client_type)}</span>
                <span>{lastPurchaseText(s?.days_without_purchase)}</span>
                {(s?.points ?? 0) > 0 && <span>{s?.points} pontos</span>}
              </div>
              {tagIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tagIds.includes(ambassadorId ?? "") && <AmbassadorSeal />}
                  {tagIds.filter((t) => t !== ambassadorId).map((t) => {
                    const tag = tagMap.get(t);
                    return tag ? <TagChip key={t} name={tag.name} color={tag.color} /> : null;
                  })}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
