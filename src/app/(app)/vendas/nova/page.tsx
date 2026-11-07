"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { ClientName } from "@/components/clients/client-name";
import { ClientPicker } from "@/components/clients/client-picker";
import { PageHeader } from "@/components/page-header";
import { ProductPhoto } from "@/components/products/product-photo";
import { Button, Card, Checkbox, Field, Notice, Select, Spinner, TextArea } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";
import { fetchClientsBundle } from "@/lib/clients/api";
import { clientTypeLabel } from "@/lib/clients/model";
import { fold } from "@/lib/clients/filters";
import { formatDate, formatKz } from "@/lib/format";
import { centsToDb, toCents } from "@/lib/money";
import { fetchProducts } from "@/lib/products/api";
import { fetchClientBenefits, submitSale, type SalePayload } from "@/lib/sales/api";
import { PAYMENT_METHODS, availableTiers, defaultDueDate, tierLabel, tierToPricing, type PaymentMethod } from "@/lib/sales/model";
import { PricingError, priceSale, type PricingResult } from "@/lib/sales/pricing";
import { fetchSettings } from "@/lib/settings/use-settings";
import { useLoader } from "@/lib/use-loader";

interface CartLine {
  variantId: string;
  quantity: number;
}
interface PayLine {
  id: string;
  method: PaymentMethod;
  amount: string;
}

const kz = (cents: number) => formatKz(cents / 100);

function NovaVendaInner() {
  const me = useProfile();
  const isCeo = me.role === "ceo";
  const router = useRouter();
  const params = useSearchParams();

  const load = useCallback(async () => {
    const [bundle, products, settings] = await Promise.all([fetchClientsBundle(), fetchProducts(isCeo), fetchSettings()]);
    return { bundle, products, settings };
  }, [isCeo]);
  const { data, error } = useLoader(load);

  const [saleId] = useState(() => crypto.randomUUID()); // gerado no aparelho: reenviar não duplica
  const [clientId, setClientId] = useState(params.get("cliente") ?? "");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [couponId, setCouponId] = useState("");
  const [tierPoints, setTierPoints] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [exception, setException] = useState(false);
  const [payments, setPayments] = useState<PayLine[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadBenefits = useCallback(async () => (clientId ? fetchClientBenefits(clientId) : { points: 0, coupons: [] }), [clientId]);
  const { data: benefits } = useLoader(loadBenefits);

  const client = data?.bundle.rows.find((r) => r.client.id === clientId)?.client;
  const isReseller = client?.client_type === "revendedor";

  const variants = useMemo(
    () => (data?.products ?? []).filter((p) => p.active).flatMap((p) => p.variants.filter((v) => v.active).map((v) => ({ ...v, product: p }))),
    [data],
  );
  const variantById = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);
  const results = useMemo(() => {
    const words = fold(search.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return variants.filter((v) => words.every((w) => fold(`${v.product.name} ${v.product.brand} ${v.label} ${v.sku}`).includes(w))).slice(0, 8);
  }, [search, variants]);

  const tiers = useMemo(() => (data ? availableTiers(data.settings, benefits?.points ?? 0) : []), [data, benefits]);
  const tier = tiers.find((t) => String(t.pontos) === tierPoints) ?? null;
  const coupon = benefits?.coupons.find((c) => c.id === couponId) ?? null;
  const floorActive = data?.settings.get("vendas.tecto_custo") !== null;
  const discountCents = toCents(discount) ?? 0;
  const isRequest = !isCeo && discountCents > 0;

  // Ao trocar de cliente, limpar cupão e pontos escolhidos
  function chooseClient(id: string) {
    setClientId(id);
    setCouponId("");
    setTierPoints("");
  }

  const pricing: { result: PricingResult | null; error: string | null } = useMemo(() => {
    if (!cart.length) return { result: null, error: null };
    try {
      const { pointsBp, freeRule } = tierToPricing(tier);
      const result = priceSale({
        lines: cart.map((l) => {
          const v = variantById.get(l.variantId)!;
          return {
            variantId: l.variantId,
            quantity: l.quantity,
            unitCents: toCents(isReseller ? v.price_reseller : v.price_retail) ?? 0,
            costCents: v.cost !== null ? toCents(v.cost) : null,
          };
        }),
        couponBp: coupon ? Math.round(coupon.percent * 100) : 0,
        pointsBp,
        freeRule,
        manualCents: isCeo ? discountCents : 0, // o pedido do Vendedor só conta depois de aprovado
        floorActive,
        exception: isCeo && exception,
      });
      return { result, error: null };
    } catch (e) {
      return { result: null, error: e instanceof PricingError ? e.message : "Erro no cálculo." };
    }
  }, [cart, tier, coupon, variantById, isReseller, isCeo, discountCents, floorActive, exception]);

  const totalCents = pricing.result?.totalCents ?? 0;
  const paidCents = payments.reduce((a, p) => a + (toCents(p.amount) ?? 0), 0);
  const debtCents = Math.max(totalCents - paidCents, 0);

  function addVariant(id: string) {
    setCart((c) => (c.some((l) => l.variantId === id) ? c.map((l) => (l.variantId === id ? { ...l, quantity: l.quantity + 1 } : l)) : [...c, { variantId: id, quantity: 1 }]));
    setSearch("");
  }
  function setQty(id: string, q: number) {
    setCart((c) => (q <= 0 ? c.filter((l) => l.variantId !== id) : c.map((l) => (l.variantId === id ? { ...l, quantity: q } : l))));
  }
  function payAll(method: PaymentMethod = "numerario") {
    setPayments([{ id: crypto.randomUUID(), method, amount: String(totalCents / 100) }]);
  }

  async function submit() {
    setSubmitError(null);
    if (!client) return setSubmitError("Escolha o cliente.");
    if (!pricing.result) return setSubmitError(pricing.error ?? "Adicione pelo menos um perfume.");
    for (const p of payments) {
      const c = toCents(p.amount);
      if (c === null || c <= 0) return setSubmitError("Há um pagamento com valor inválido.");
    }
    if (paidCents > totalCents) return setSubmitError("Os pagamentos ultrapassam o total da venda.");
    if (isRequest && discountReason.trim().length < 3) return setSubmitError("Explique ao CEO o motivo do pedido de desconto.");
    if (!navigator.onLine) return setSubmitError("Sem ligação à internet. A venda não foi gravada (o modo offline chega no passo 1I).");
    const payload: SalePayload = {
      id: saleId,
      client_id: client.id,
      items: cart.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      coupon_id: coupon?.id ?? null,
      points_tier: tier?.pontos ?? null,
      manual_discount: Number(centsToDb(discountCents)),
      discount_reason: discountReason.trim(),
      cost_floor_exception: isCeo && exception,
      payments: isRequest ? [] : payments.map((p) => ({ id: p.id, method: p.method, amount: Number(centsToDb(toCents(p.amount) ?? 0)) })),
      due_date: debtCents > 0 ? dueDate || defaultDueDate(data!.settings) : null,
      notes: notes.trim(),
      device_created_at: new Date().toISOString(),
    };
    setBusy(true);
    try {
      const r = await submitSale(payload);
      router.replace(`/vendas/ficha?id=${r.id}&nova=1${r.capped ? "&limitado=1" : ""}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erro.");
      setBusy(false);
    }
  }

  if (error) return <Notice kind="erro">{error}</Notice>;
  if (!data) return <Spinner />;

  return (
    <>
      <PageHeader title="Nova venda" />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold">1. Cliente</h2>
            <ClientPicker label="Cliente" rows={data.bundle.rows} value={clientId} onChange={chooseClient} />
            {client && (
              <p className="text-sm text-texto-suave">
                {clientTypeLabel(client.client_type)}
                {isReseller && " — preços de revendedor"} · {benefits ? `${benefits.points} pontos` : "…"}
              </p>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold">2. Perfumes</h2>
            <input
              type="search"
              aria-label="Procurar perfume"
              placeholder="Procurar perfume (nome ou código)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 rounded-full border border-linha bg-white px-4 text-base outline-none focus:border-vinho"
            />
            {results.length > 0 && (
              <ul className="flex flex-col gap-1" aria-label="Resultados">
                {results.map((v) => (
                  <li key={v.id}>
                    <button type="button" onClick={() => addVariant(v.id)} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-linha bg-white px-3 py-2 text-left hover:border-vinho">
                      <ProductPhoto path={v.photo_path ?? v.product.photo_paths[0]} alt="" size={40} />
                      <span className="flex-1">
                        <span className="block font-semibold text-vinho-escuro">{v.product.name} {v.label}</span>
                        <span className="block text-xs text-texto-suave">{v.sku} · {v.stock} em stock</span>
                      </span>
                      <span className="font-semibold">{formatKz(isReseller ? v.price_reseller : v.price_retail)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {search.trim() && results.length === 0 && <p className="text-sm text-texto-suave">Nenhum perfume encontrado.</p>}
            {cart.length > 0 && (
              <ul className="flex flex-col divide-y divide-linha" aria-label="Perfumes na venda">
                {cart.map((l) => {
                  const v = variantById.get(l.variantId)!;
                  const priced = pricing.result?.lines.find((x) => x.variantId === l.variantId);
                  return (
                    <li key={l.variantId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                      <span className="min-w-0 basis-full">
                        <span className="block font-semibold text-vinho-escuro">{v.product.name} {v.label}</span>
                        <span className="block text-xs text-texto-suave">
                          {formatKz(isReseller ? v.price_reseller : v.price_retail)} / un.
                          {priced?.isFreeItem && " · 1 oferta"}
                          {l.quantity > v.stock && <span className="text-erro"> · stock disponível: {v.stock}</span>}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <button type="button" aria-label={`Menos ${v.product.name}`} onClick={() => setQty(l.variantId, l.quantity - 1)} className="h-11 w-11 rounded-full border border-linha text-lg font-semibold">−</button>
                        <span className="w-8 text-center font-semibold" aria-label="Quantidade">{l.quantity}</span>
                        <button type="button" aria-label={`Mais ${v.product.name}`} onClick={() => setQty(l.variantId, l.quantity + 1)} className="h-11 w-11 rounded-full border border-linha text-lg font-semibold">+</button>
                      </span>
                      <span className="text-right font-semibold">{priced ? kz(priced.totalCents) : ""}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {client && (benefits?.coupons.length || tiers.length) ? (
            <Card className="flex flex-col gap-3">
              <h2 className="font-semibold">3. Cupões e pontos</h2>
              {benefits && benefits.coupons.length > 0 && (
                <Select label="Cupão (um por compra)" value={couponId} onChange={(e) => setCouponId(e.target.value)}>
                  <option value="">Não usar</option>
                  {benefits.coupons.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.percent}% (até {formatDate(c.expires_at)})</option>)}
                </Select>
              )}
              {tiers.length > 0 && (
                <Select label={`Trocar pontos (tem ${benefits?.points ?? 0})`} value={tierPoints} onChange={(e) => setTierPoints(e.target.value)}>
                  <option value="">Não trocar</option>
                  {tiers.map((t) => <option key={t.pontos} value={String(t.pontos)}>{tierLabel(t)}</option>)}
                </Select>
              )}
            </Card>
          ) : null}

          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold">{isCeo ? "4. Desconto" : "4. Pedir desconto ao CEO (opcional)"}</h2>
            <Field label={isCeo ? "Desconto (Kz)" : "Desconto pedido (Kz)"} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            {isRequest && (
              <>
                <Field label="Motivo do pedido *" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
                <Notice>A venda fica a aguardar a aprovação do CEO. O pagamento regista-se depois de aprovada.</Notice>
              </>
            )}
            {isCeo && <Checkbox label="Autorizar abaixo do custo (excepção)" description="Fica registado no histórico de alterações." checked={exception} onChange={setException} />}
          </Card>

          {!isRequest && (
            <Card className="flex flex-col gap-3">
              <h2 className="font-semibold">5. Pagamento</h2>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <Button key={m.value} type="button" variant="secundario" disabled={!totalCents} onClick={() => payAll(m.value)}>
                    Tudo em {m.label}
                  </Button>
                ))}
              </div>
              {payments.map((p, i) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
                  <Select label="Forma" value={p.method} onChange={(e) => setPayments(payments.map((x, j) => (j === i ? { ...x, method: e.target.value as PaymentMethod } : x)))}>
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                  <Field label="Valor (Kz)" inputMode="decimal" value={p.amount} onChange={(e) => setPayments(payments.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                  <Button type="button" variant="texto" className="text-erro" onClick={() => setPayments(payments.filter((_, j) => j !== i))} aria-label="Retirar pagamento">✕</Button>
                </div>
              ))}
              <Button type="button" variant="texto" className="self-start" onClick={() => setPayments([...payments, { id: crypto.randomUUID(), method: "numerario", amount: String(debtCents / 100) }])}>
                + Outro pagamento
              </Button>
              {debtCents > 0 && totalCents > 0 && (
                <>
                  <Notice>Fica em dívida: <strong>{kz(debtCents)}</strong></Notice>
                  <Field label="Data limite para pagar" type="date" value={dueDate || defaultDueDate(data.settings)} onChange={(e) => setDueDate(e.target.value)} />
                </>
              )}
            </Card>
          )}

          <TextArea label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="lg:sticky lg:top-4">
          <Card className="flex flex-col gap-2">
            <h2 className="font-semibold">Resumo</h2>
            {client ? <ClientName code={client.code} tempCode={client.temp_code} name={client.name} className="text-sm" /> : <p className="text-sm text-texto-suave">Sem cliente</p>}
            {pricing.error && <Notice kind="erro">{pricing.error}</Notice>}
            {pricing.result && (
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{kz(pricing.result.subtotalCents)}</dd></div>
                {pricing.result.couponCents > 0 && <div className="flex justify-between"><dt>Cupão</dt><dd>− {kz(pricing.result.couponCents)}</dd></div>}
                {pricing.result.pointsCents > 0 && <div className="flex justify-between"><dt>Pontos</dt><dd>− {kz(pricing.result.pointsCents)}</dd></div>}
                {pricing.result.manualCents > 0 && <div className="flex justify-between"><dt>Desconto</dt><dd>− {kz(pricing.result.manualCents)}</dd></div>}
                <div className="mt-1 flex justify-between border-t border-linha pt-2 text-lg font-semibold text-vinho-escuro"><dt>Total</dt><dd>{kz(totalCents)}</dd></div>
                {isRequest && <p className="text-xs text-texto-suave">Desconto pedido: {kz(discountCents)} (depende do CEO)</p>}
              </dl>
            )}
            {pricing.result?.capped && <Notice>Desconto limitado pelas regras da Smell (nunca abaixo do custo).</Notice>}
            {!isCeo && <p className="text-xs text-texto-suave">O valor final é confirmado ao gravar.</p>}
            {submitError && <Notice kind="erro">{submitError}</Notice>}
            <Button onClick={() => void submit()} loading={busy} disabled={!client || !cart.length || !!pricing.error}>
              {isRequest ? "Enviar para aprovação" : "Confirmar venda"}
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function NovaVendaPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NovaVendaInner />
    </Suspense>
  );
}
