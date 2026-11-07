"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ProductPhoto } from "@/components/products/product-photo";
import { StockBadge } from "@/components/products/stock-badge";
import { Badge, Button, Notice, Select, Spinner } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";
import { formatKz } from "@/lib/format";
import { fetchProducts } from "@/lib/products/api";
import { CATEGORIES, EMPTY_PRODUCT_FILTERS, categoryLabel, filterProducts, type ProductFilters } from "@/lib/products/model";
import { useLoader } from "@/lib/use-loader";

export default function ProdutosPage() {
  const profile = useProfile();
  const isCeo = profile.role === "ceo";
  const load = useCallback(() => fetchProducts(isCeo), [isCeo]);
  const { data, error } = useLoader(load);
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS);
  const set = <K extends keyof ProductFilters>(k: K, v: ProductFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const visible = useMemo(() => (data ? filterProducts(data, filters) : []), [data, filters]);
  const lowCount = useMemo(
    () => (data ?? []).filter((p) => p.active).flatMap((p) => p.variants.filter((v) => v.active && v.stock <= v.min_stock)).length,
    [data],
  );

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle={data ? (() => { const n = data.filter((p) => p.active).length; return `${n} ${n === 1 ? "perfume activo" : "perfumes activos"}`; })() : undefined}
        actions={isCeo && <Link href="/produtos/novo" className="inline-flex min-h-11 items-center rounded-full bg-vinho px-5 font-semibold text-creme hover:bg-vinho-escuro">Novo produto</Link>}
      />
      {lowCount > 0 && !filters.lowOnly && (
        <div className="mb-4">
          <Notice>
            <span className="font-semibold">{lowCount} {lowCount === 1 ? "variação está" : "variações estão"} com stock baixo ou esgotado.</span>{" "}
            <Button variant="texto" className="min-h-0 px-0" onClick={() => set("lowOnly", true)}>Ver quais</Button>
          </Notice>
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input
          type="search"
          aria-label="Pesquisar produtos"
          placeholder="Pesquisar por nome, marca ou código"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="min-h-11 flex-1 rounded-full border border-linha bg-white px-4 text-base outline-none focus:border-vinho"
        />
        <div className="sm:w-44">
          <Select label="Categoria" value={filters.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Todas</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-4">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" className="h-5 w-5 accent-[#710014]" checked={filters.lowOnly} onChange={(e) => set("lowOnly", e.target.checked)} />
          <span className="font-medium text-vinho-escuro">Só stock baixo</span>
        </label>
        {isCeo && (
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-[#710014]" checked={filters.showInactive} onChange={(e) => set("showInactive", e.target.checked)} />
            <span className="font-medium text-vinho-escuro">Mostrar inactivos</span>
          </label>
        )}
      </div>
      {error && <Notice kind="erro">{error}</Notice>}
      {!data && !error && <Spinner />}
      {data && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-texto-suave">
          {data.length === 0 ? (isCeo ? "Ainda não há produtos. Registe o primeiro em “Novo produto”." : "Ainda não há produtos no catálogo.") : "Nenhum produto corresponde à pesquisa."}
        </p>
      )}
      <ul className="flex flex-col gap-3" aria-label="Lista de produtos">
        {visible.map((p) => {
          const variants = filters.showInactive ? p.variants : p.variants.filter((v) => v.active);
          return (
            <li key={p.id}>
              <Link href={`/produtos/ficha?id=${p.id}`} className="block rounded-[var(--radius-cartao)] border border-linha bg-superficie p-4 hover:border-vinho">
                <div className="flex gap-3">
                  <ProductPhoto path={p.photo_paths[0]} alt={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-vinho-escuro">{p.name}</p>
                    <p className="text-sm text-texto-suave">
                      {[p.brand, categoryLabel(p.category)].filter(Boolean).join(" · ")}
                      {!p.active && <> · <Badge tone="cinza">Inactivo</Badge></>}
                    </p>
                  </div>
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {variants.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                      <span>
                        <span className="font-semibold">{v.label}</span> <span className="font-mono text-xs text-texto-suave">{v.sku}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span>{formatKz(v.price_retail)}</span>
                        <span className="text-texto-suave">Rev. {formatKz(v.price_reseller)}</span>
                        <StockBadge stock={v.stock} minStock={v.min_stock} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
