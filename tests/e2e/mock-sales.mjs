// Vendas no Supabase simulado: usa o MESMO cálculo do aparelho (src/lib/sales/pricing.ts),
// compilado na hora. As regras completas do servidor são testadas em tests/db/04_vendas.sql.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const src = fs.readFileSync(new URL("../../src/lib/sales/pricing.ts", import.meta.url), "utf8");
const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "smell-")), "pricing.mjs");
fs.writeFileSync(file, out);
const { priceSale } = await import(pathToFileURL(file).href);

const cents = (v) => Math.round(Number(v) * 100);
const money = (c) => (c / 100).toFixed(2);

export function salesRpc(state, name, json, sub) {
  const t = state.tables;
  const me = t.profiles.find((p) => p.id === sub);
  const isCeo = me?.role === "ceo";
  const result = (id) => {
    const s = t.sales.find((x) => x.id === id);
    const paid = t.payments.filter((p) => p.sale_id === id).reduce((a, p) => a + Number(p.amount), 0);
    return { id, number: s.number, status: s.status, payment_status: s.payment_status, total: s.total, paid, approval_reason: s.approval_reason };
  };
  const recompute = (s) => {
    const paid = t.payments.filter((p) => p.sale_id === s.id).reduce((a, p) => a + cents(p.amount), 0);
    s.payment_status = paid >= cents(s.total) ? "paga" : paid > 0 ? "parcial" : "em_divida";
  };
  const apply = (s, p, manual, exception) => {
    const client = t.clients.find((c) => c.id === p.client_id);
    const pts = t.settings.find((x) => x.key === "fidelidade.pontos");
    let pointsBp = 0, freeRule = null, couponBp = 0;
    const reasons = [];
    s.coupon_id = null; s.points_redeemed = 0; s.points_tier = null;
    if (p.coupon_id) {
      const c = t.coupons.find((x) => x.id === p.coupon_id && x.client_id === client.id && x.status === "activo");
      if (c) { couponBp = Math.round(Number(c.percent) * 100); s.coupon_id = c.id; } else reasons.push("O cupão já não é válido (usado noutra venda, expirado ou desligado).");
    }
    if (p.points_tier) {
      const balance = t.loyalty_ledger.filter((l) => l.client_id === client.id).reduce((a, l) => a + l.points, 0);
      const tier = pts?.active ? pts.value.escaloes.find((e) => e.pontos === p.points_tier) : null;
      if (!tier || balance < p.points_tier) reasons.push("O cliente já não tem pontos suficientes para este escalão (ou os pontos estão desligados).");
      else {
        s.points_redeemed = p.points_tier; s.points_tier = p.points_tier;
        if (tier.tipo === "percentagem") pointsBp = Math.round(tier.valor * 100); else freeRule = tier.item_gratis || "menor_valor";
      }
    }
    const r = priceSale({
      lines: p.items.map((i) => {
        const v = t.product_variants.find((x) => x.id === i.variant_id);
        const c = t.product_variant_costs.find((x) => x.variant_id === v.id);
        return { variantId: v.id, quantity: i.quantity, unitCents: cents(client.client_type === "revendedor" ? v.price_reseller : v.price_retail), costCents: c ? cents(c.cost_price) : null };
      }),
      couponBp, pointsBp, freeRule, manualCents: manual,
      floorActive: !!t.settings.find((x) => x.key === "vendas.tecto_custo")?.active, exception,
    });
    t.sale_items = t.sale_items.filter((i) => i.sale_id !== s.id);
    for (const l of r.lines) {
      const itemId = crypto.randomUUID();
      t.sale_items.push({ id: itemId, sale_id: s.id, variant_id: l.variantId, quantity: l.quantity, unit_price: money(l.unitCents), discount_amount: money(l.discountCents), line_total: money(l.totalCents), is_free_item: l.isFreeItem });
      if (l.costCents !== null) t.sale_item_costs.push({ sale_item_id: itemId, sale_id: s.id, margin: money(l.totalCents - l.costCents * l.quantity) });
    }
    Object.assign(s, { subtotal: money(r.subtotalCents), coupon_discount: money(r.couponCents), points_discount: money(r.pointsCents), manual_discount: money(r.manualCents), total: money(r.totalCents) });
    return { reasons, capped: r.capped };
  };
  const finalize = (s) => {
    for (const i of t.sale_items.filter((x) => x.sale_id === s.id)) t.stock_movements.push({ id: crypto.randomUUID(), variant_id: i.variant_id, quantity: -i.quantity, movement_type: "venda", reason: `Venda n.º ${s.number}`, sale_id: s.id, created_at: new Date().toISOString(), created_by: s.seller_id });
    if (s.coupon_id) Object.assign(t.coupons.find((c) => c.id === s.coupon_id), { status: "usado", used_in_sale_id: s.id });
    if (s.points_redeemed) t.loyalty_ledger.push({ client_id: s.client_id, points: -s.points_redeemed, entry_type: "troca", sale_id: s.id });
    const pays = s.request_payload.payments || [];
    for (const p of pays) if (!t.payments.some((x) => x.id === p.id)) t.payments.push({ id: p.id, sale_id: s.id, amount: money(cents(p.amount)), method: p.method, paid_at: new Date().toISOString(), created_by: sub });
    s.status = "confirmada"; s.confirmed_at = new Date().toISOString();
    recompute(s);
    if (s.payment_status !== "paga") s.due_date = s.request_payload.due_date;
  };

  if (name === "submit_sale") {
    const p = json.p;
    if (t.sales.some((x) => x.id === p.id)) return [200, { ...result(p.id), repetida: true }];
    state.saleSeq = (state.saleSeq || 0) + 1;
    const s = { id: p.id, number: state.saleSeq, client_id: p.client_id, seller_id: sub, status: "rascunho", payment_status: "em_divida", notes: p.notes || "", created_at: new Date().toISOString(), request_payload: p, approval_reason: "", cost_floor_exception: false, due_date: null, cancelled_at: null, cancelled_by: null, cancel_reason: null, confirmed_at: null };
    t.sales.push(s);
    const manual = Math.round(Number(p.manual_discount || 0) * 100);
    const request = manual > 0 && !isCeo;
    const r = apply(s, p, request ? 0 : manual, isCeo && !!p.cost_floor_exception);
    if (request) r.reasons.unshift(`Pedido de desconto de ${p.manual_discount} Kz.`);
    if (request || r.reasons.length) {
      s.status = "aguarda_aprovacao"; s.approval_reason = r.reasons.join(" ");
    } else {
      const paid = (p.payments || []).reduce((a, x) => a + cents(x.amount), 0);
      if (paid > cents(s.total)) { t.sales.pop(); return [400, { code: "P0001", message: "Os pagamentos ultrapassam o total da venda." }]; }
      finalize(s);
    }
    return [200, { ...result(s.id), capped: r.capped }];
  }
  if (name === "decide_sale") {
    if (!isCeo) return [403, { code: "42501", message: "Só o CEO decide aprovações." }];
    const s = t.sales.find((x) => x.id === json.p_sale_id);
    if (json.p_decision === "anular") { Object.assign(s, { status: "cancelada", cancelled_at: new Date().toISOString(), cancelled_by: sub, cancel_reason: json.p_note || "Não aprovada pelo CEO" }); return [200, result(s.id)]; }
    const r = apply(s, s.request_payload, json.p_decision === "aprovar" ? Math.round(json.p_amount * 100) : 0, !!json.p_exception);
    finalize(s);
    return [200, { ...result(s.id), capped: r.capped }];
  }
  if (name === "cancel_sale") {
    if (!isCeo) return [403, { code: "42501", message: "Só o CEO pode cancelar vendas." }];
    const s = t.sales.find((x) => x.id === json.p_sale_id);
    for (const i of t.sale_items.filter((x) => x.sale_id === s.id)) t.stock_movements.push({ id: crypto.randomUUID(), variant_id: i.variant_id, quantity: i.quantity, movement_type: "cancelamento", reason: `Cancelamento da venda n.º ${s.number}`, sale_id: s.id, created_at: new Date().toISOString(), created_by: sub });
    if (s.coupon_id) Object.assign(t.coupons.find((c) => c.id === s.coupon_id), { status: "activo", used_in_sale_id: null });
    if (s.points_redeemed) t.loyalty_ledger.push({ client_id: s.client_id, points: s.points_redeemed, entry_type: "devolucao", sale_id: s.id });
    Object.assign(s, { status: "cancelada", cancelled_at: new Date().toISOString(), cancelled_by: sub, cancel_reason: json.p_reason });
    return [200, result(s.id)];
  }
  return null;
}
