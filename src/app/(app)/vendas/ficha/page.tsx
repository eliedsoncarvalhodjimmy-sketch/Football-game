"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { ClientName } from "@/components/clients/client-name";
import { SaleBadges } from "@/components/sales/sale-badges";
import { Button, Card, Checkbox, Field, Notice, Spinner } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";
import { formatDate, formatDateTime, formatKz } from "@/lib/format";
import { toCents } from "@/lib/money";
import { fetchProducts } from "@/lib/products/api";
import { cancelSale, decideSale, fetchSaleDetail } from "@/lib/sales/api";
import { formatSaleNumber, methodLabel } from "@/lib/sales/model";
import { downloadReceipt } from "@/lib/sales/receipt";
import { fetchSettings } from "@/lib/settings/use-settings";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLoader } from "@/lib/use-loader";

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "erro" }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-lg font-semibold text-vinho-escuro" : ""} ${tone === "erro" ? "font-semibold text-erro" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function FichaVendaInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const me = useProfile();
  const isCeo = me.role === "ceo";
  const load = useCallback(async () => {
    const [detail, products, team, settings] = await Promise.all([
      fetchSaleDetail(id, isCeo),
      fetchProducts(false),
      getSupabaseBrowserClient().from("profiles").select("id, full_name, email"),
      fetchSettings(),
    ]);
    const names = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, `${p.name} ${v.label}`] as const)));
    const people = new Map(((team.data ?? []) as { id: string; full_name: string; email: string }[]).map((p) => [p.id, p.full_name || p.email]));
    return { detail, names, people, settings };
  }, [id, isCeo]);
  const { data, error, reload } = useLoader(load);
  const [msg, setMsg] = useState<{ kind: "erro" | "sucesso" | "info"; text: string } | null>(() => {
    if (params.get("limitado") === "1") return { kind: "info", text: "Venda gravada. O desconto foi limitado pelas regras da Smell (nenhum perfume abaixo do custo)." };
    if (params.get("nova") === "1") return { kind: "sucesso", text: "Venda gravada." };
    return null;
  });
  const [approveAmount, setApproveAmount] = useState<string | null>(null);
  const [exception, setException] = useState(false);
  const [busy, setBusy] = useState(false);

  if (error) return <Notice kind="erro">{error}</Notice>;
  if (!data) return <Spinner />;
  if (!data.detail) return <Notice kind="erro">Venda não encontrada.</Notice>;
  const { sale: s, items, payments, margin, couponCode } = data.detail;
  const paid = payments.reduce((a, p) => a + Number(p.amount), 0);
  const balance = Math.max(Number(s.total) - paid, 0);
  const requested = s.request_payload?.manual_discount ?? 0;
  const amountText = approveAmount ?? (requested ? String(requested) : "");

  async function decide(decision: "aprovar" | "sem_desconto" | "anular") {
    const amount = decision === "aprovar" ? (toCents(amountText) ?? -1) / 100 : 0;
    if (decision === "aprovar" && amount < 0) return setMsg({ kind: "erro", text: "Valor de desconto inválido." });
    let note = "";
    if (decision === "anular") {
      const n = window.prompt("Motivo para anular a venda:");
      if (n === null) return;
      note = n;
    }
    setBusy(true);
    try {
      const r = await decideSale(s.id, decision, amount, note, exception);
      setMsg({
        kind: "sucesso",
        text: decision === "anular" ? "Venda anulada." : r.capped ? "Venda confirmada. O desconto foi limitado ao custo." : "Venda confirmada.",
      });
      reload();
    } catch (e) {
      setMsg({ kind: "erro", text: e instanceof Error ? e.message : "Erro." });
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    const reason = window.prompt(`Cancelar a venda ${formatSaleNumber(s.number)}?\nO stock volta, o cupão e os pontos são devolvidos.\n\nMotivo:`);
    if (reason === null) return;
    if (!reason.trim()) return setMsg({ kind: "erro", text: "Indique o motivo do cancelamento." });
    setBusy(true);
    try {
      await cancelSale(s.id, reason);
      setMsg({ kind: "sucesso", text: paid > 0 ? `Venda cancelada. Atenção: tinham sido recebidos ${formatKz(paid)} — combine a devolução com o cliente.` : "Venda cancelada." });
      reload();
    } catch (e) {
      setMsg({ kind: "erro", text: e instanceof Error ? e.message : "Erro." });
    } finally {
      setBusy(false);
    }
  }

  async function onReceipt() {
    const company = data!.settings.get<Record<string, string>>("empresa") ?? {};
    await downloadReceipt({
      company,
      number: s.number,
      date: s.confirmed_at ?? s.created_at,
      client: { code: s.clients?.code ?? null, name: s.clients?.name ?? "" },
      seller: data!.people.get(s.seller_id) ?? "",
      items: items.map((i) => ({ name: data!.names.get(i.variant_id) ?? "Perfume", quantity: i.quantity, unitPrice: i.unit_price, discount: i.discount_amount, total: i.line_total, free: i.is_free_item })),
      subtotal: s.subtotal,
      couponDiscount: s.coupon_discount,
      pointsDiscount: s.points_discount,
      manualDiscount: s.manual_discount,
      total: s.total,
      payments: payments.map((p) => ({ date: p.paid_at, method: p.method, amount: p.amount })),
      dueDate: s.due_date,
      cancelled: s.status === "cancelada",
    });
  }

  return (
    <>
      <Link href="/vendas" className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-vinho">← Vendas</Link>
      {msg && <div className="mb-4"><Notice kind={msg.kind === "info" ? "info" : msg.kind}>{msg.text}</Notice></div>}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Venda {formatSaleNumber(s.number)}</h1>
          <p className="text-sm text-texto-suave">{formatDateTime(s.created_at)} · {data.people.get(s.seller_id) ?? "—"}</p>
          {s.clients && (
            <Link href={`/clientes/ficha?id=${s.client_id}`} className="font-semibold text-vinho underline-offset-4 hover:underline">
              <ClientName code={s.clients.code} name={s.clients.name} />
            </Link>
          )}
          <div className="mt-2"><SaleBadges status={s.status} paymentStatus={s.payment_status} /></div>
        </div>
        {(s.status === "confirmada" || s.status === "cancelada") && <Button variant="secundario" onClick={() => void onReceipt()}>Recibo (PDF)</Button>}
      </div>

      {s.status === "aguarda_aprovacao" && (
        <Card className="mb-4 flex flex-col gap-3 border-dourado">
          <h2 className="font-semibold">Aguarda aprovação do CEO</h2>
          <p className="text-sm">{s.approval_reason}</p>
          {s.request_payload?.discount_reason && <p className="text-sm">Motivo do vendedor: “{s.request_payload.discount_reason}”</p>}
          {isCeo ? (
            <>
              {requested > 0 && <Field label="Desconto a aprovar (Kz)" inputMode="decimal" value={amountText} onChange={(e) => setApproveAmount(e.target.value)} />}
              <Checkbox label="Autorizar abaixo do custo (excepção)" checked={exception} onChange={setException} />
              <div className="flex flex-wrap gap-2">
                {requested > 0 && <Button loading={busy} onClick={() => void decide("aprovar")}>Aprovar desconto</Button>}
                <Button variant="secundario" loading={busy} onClick={() => void decide("sem_desconto")}>{requested > 0 ? "Confirmar sem desconto" : "Confirmar venda"}</Button>
                <Button variant="perigo" loading={busy} onClick={() => void decide("anular")}>Anular venda</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-texto-suave">O CEO vai decidir. O stock só sai depois da aprovação.</p>
          )}
        </Card>
      )}

      {s.status === "cancelada" && (
        <div className="mb-4"><Notice kind="erro">Cancelada em {formatDateTime(s.cancelled_at)} por {data.people.get(s.cancelled_by ?? "") ?? "—"}. Motivo: {s.cancel_reason}</Notice></div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Perfumes</h2>
          <ul className="flex flex-col divide-y divide-linha">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-semibold text-vinho-escuro">{data.names.get(i.variant_id) ?? "Perfume"}</span>
                  <span className="block text-texto-suave">
                    {i.quantity} × {formatKz(i.unit_price)}
                    {Number(i.discount_amount) > 0 && ` · desconto ${formatKz(i.discount_amount)}`}
                    {i.is_free_item && " · inclui 1 oferta"}
                  </span>
                </span>
                <span className="font-semibold">{formatKz(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 flex flex-col gap-1 border-t border-linha pt-3 text-sm">
            <Row label="Subtotal" value={formatKz(s.subtotal)} />
            {Number(s.coupon_discount) > 0 && <Row label={`Cupão${couponCode ? ` ${couponCode}` : ""}`} value={`− ${formatKz(s.coupon_discount)}`} />}
            {Number(s.points_discount) > 0 && <Row label={`Pontos (${s.points_redeemed})`} value={`− ${formatKz(s.points_discount)}`} />}
            {Number(s.manual_discount) > 0 && <Row label="Desconto" value={`− ${formatKz(s.manual_discount)}`} />}
            <Row label="Total" value={formatKz(s.total)} strong />
            {isCeo && margin !== null && <Row label="Margem" value={formatKz(margin)} />}
            {isCeo && s.cost_floor_exception && <p className="text-xs text-erro">Venda abaixo do custo autorizada pelo CEO.</p>}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Pagamentos</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-texto-suave">Ainda sem pagamentos.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span>{formatDate(p.paid_at)} · {methodLabel(p.method)}</span>
                  <span className="font-semibold">{formatKz(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {s.status === "confirmada" && (
            <dl className="mt-3 flex flex-col gap-1 border-t border-linha pt-3 text-sm">
              <Row label="Pago" value={formatKz(paid)} />
              <Row label="Saldo em dívida" value={formatKz(balance)} tone={balance > 0 ? "erro" : undefined} />
              {balance > 0 && s.due_date && <Row label="Pagar até" value={formatDate(s.due_date)} />}
            </dl>
          )}
          {s.notes && <p className="mt-3 whitespace-pre-line text-sm text-texto-suave">{s.notes}</p>}
        </Card>
      </div>

      {isCeo && s.status === "confirmada" && (
        <Button variant="perigo" className="mt-6" loading={busy} onClick={() => void onCancel()}>Cancelar venda</Button>
      )}
      <p className="mt-6 text-xs text-texto-suave">Os recibos não são facturas certificadas pela AGT: são documentos sem valor fiscal.</p>
    </>
  );
}

export default function FichaVendaPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FichaVendaInner />
    </Suspense>
  );
}
