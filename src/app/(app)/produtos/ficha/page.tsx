"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { ProductPhoto } from "@/components/products/product-photo";
import { StockBadge } from "@/components/products/stock-badge";
import { StockMovementForm } from "@/components/products/stock-movement-form";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";
import { formatDateTime, formatKz, formatPercent } from "@/lib/format";
import { toCents } from "@/lib/money";
import { fetchMovements, fetchProducts, type Movement } from "@/lib/products/api";
import { categoryLabel, unitMargin } from "@/lib/products/model";
import { MOVEMENT_LABELS, type ManualMovement } from "@/lib/products/stock";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLoader } from "@/lib/use-loader";

function History({ variantId, team }: { variantId: string; team: Map<string, string> }) {
  const load = useCallback(() => fetchMovements(variantId), [variantId]);
  const { data, error } = useLoader<Movement[]>(load);
  if (error) return <Notice kind="erro">{error}</Notice>;
  if (!data) return <Spinner />;
  if (data.length === 0) return <p className="mt-2 text-sm text-texto-suave">Sem movimentos.</p>;
  return (
    <ol className="mt-3 flex flex-col divide-y divide-linha rounded-xl border border-linha bg-white text-sm">
      {data.map((m) => (
        <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2">
          <span>
            <span className="font-medium">{MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}</span>
            {m.reason && <span className="block text-texto-suave">{m.reason}</span>}
            <span className="block text-xs text-texto-suave">{formatDateTime(m.created_at)} · {team.get(m.created_by ?? "") ?? "—"}</span>
          </span>
          <span className={`font-semibold ${m.quantity < 0 ? "text-erro" : "text-sucesso"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</span>
        </li>
      ))}
    </ol>
  );
}

function FichaInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const me = useProfile();
  const isCeo = me.role === "ceo";
  const canMoveStock = isCeo || me.is_adm;
  const load = useCallback(async () => {
    const [products, team] = await Promise.all([
      fetchProducts(isCeo),
      getSupabaseBrowserClient().from("profiles").select("id, full_name, email"),
    ]);
    return { products, team: new Map(((team.data ?? []) as { id: string; full_name: string; email: string }[]).map((p) => [p.id, p.full_name || p.email])) };
  }, [isCeo]);
  const { data, error, reload } = useLoader(load);
  const [open, setOpen] = useState<{ variantId: string; mode: ManualMovement | "historico" } | null>(null);
  const [msg, setMsg] = useState<string | null>(params.get("novo") === "1" ? "Produto registado." : null);
  const [historyKey, setHistoryKey] = useState(0);

  if (error) return <Notice kind="erro">{error}</Notice>;
  if (!data) return <Spinner />;
  const p = data.products.find((x) => x.id === id);
  if (!p) return <Notice kind="erro">Produto não encontrado.</Notice>;

  return (
    <>
      <Link href="/produtos" className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-vinho">← Produtos</Link>
      {msg && <div className="mb-4"><Notice kind="sucesso">{msg}</Notice></div>}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-4">
          <ProductPhoto path={p.photo_paths[0]} alt={p.name} size={96} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
            <p className="text-sm text-texto-suave">{[p.brand, categoryLabel(p.category)].filter(Boolean).join(" · ")}</p>
            {!p.active && <Badge tone="cinza">Inactivo</Badge>}
          </div>
        </div>
        {isCeo && (
          <Link href={`/produtos/editar?id=${p.id}`} className="inline-flex min-h-11 items-center rounded-full border border-vinho bg-superficie px-5 font-semibold text-vinho hover:bg-creme">Editar</Link>
        )}
      </div>
      {p.description && <p className="mb-4 whitespace-pre-line text-texto">{p.description}</p>}
      {p.photo_paths.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {p.photo_paths.slice(1).map((ph) => <ProductPhoto key={ph} path={ph} alt={p.name} size={80} />)}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {p.variants.map((v) => {
          const retail = toCents(v.price_retail) ?? 0;
          const reseller = toCents(v.price_reseller) ?? 0;
          const cost = v.cost !== null ? toCents(v.cost) : null;
          return (
            <Card key={v.id} className={v.active ? "" : "opacity-80"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-vinho-escuro">
                  {v.label} <span className="font-mono text-xs text-texto-suave">{v.sku}</span> {!v.active && <Badge tone="cinza">Inactiva</Badge>}
                </p>
                <StockBadge stock={v.stock} minStock={v.min_stock} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-texto-suave">Cliente final</dt><dd className="font-semibold">{formatKz(v.price_retail)}</dd></div>
                <div><dt className="text-xs text-texto-suave">Revendedor</dt><dd className="font-semibold">{formatKz(v.price_reseller)}</dd></div>
                <div><dt className="text-xs text-texto-suave">Stock mínimo</dt><dd>{v.min_stock}</dd></div>
                <div><dt className="text-xs text-texto-suave">Duração estimada</dt><dd>{v.replenish_days} dias</dd></div>
                {isCeo && cost !== null && (
                  <>
                    <div><dt className="text-xs text-texto-suave">Custo</dt><dd className="font-semibold">{formatKz(cost / 100)}</dd></div>
                    <div><dt className="text-xs text-texto-suave">Margem cliente final</dt><dd>{formatKz(unitMargin(retail, cost).cents / 100)} ({formatPercent(unitMargin(retail, cost).percent)})</dd></div>
                    <div><dt className="text-xs text-texto-suave">Margem revendedor</dt><dd className={reseller < cost ? "text-erro" : ""}>{formatKz(unitMargin(reseller, cost).cents / 100)} ({formatPercent(unitMargin(reseller, cost).percent)})</dd></div>
                  </>
                )}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {canMoveStock && (
                  <>
                    <Button variant="secundario" onClick={() => setOpen({ variantId: v.id, mode: "entrada" })}>Entrada</Button>
                    <Button variant="secundario" onClick={() => setOpen({ variantId: v.id, mode: "ajuste" })}>Ajuste</Button>
                  </>
                )}
                <Button variant="texto" aria-expanded={open?.variantId === v.id && open.mode === "historico"} onClick={() => setOpen(open?.variantId === v.id && open.mode === "historico" ? null : { variantId: v.id, mode: "historico" })}>
                  Histórico
                </Button>
              </div>
              {open?.variantId === v.id && open.mode !== "historico" && (
                <StockMovementForm
                  variantId={v.id}
                  type={open.mode}
                  onCancel={() => setOpen(null)}
                  onDone={(m) => {
                    setMsg(m);
                    setOpen({ variantId: v.id, mode: "historico" });
                    setHistoryKey((k) => k + 1);
                    reload();
                  }}
                />
              )}
              {open?.variantId === v.id && open.mode === "historico" && <History key={historyKey} variantId={v.id} team={data.team} />}
            </Card>
          );
        })}
      </div>
    </>
  );
}

export default function FichaProdutoPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FichaInner />
    </Suspense>
  );
}
