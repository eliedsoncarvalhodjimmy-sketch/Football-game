// Teste de ecrã do passo 1F: nova venda, cupão + pontos, pedido de desconto e aprovação,
// tecto de custo, recibo PDF e cancelamento.
import crypto from "node:crypto";
import { assert, login, run } from "./harness.mjs";

const SHOTS = process.env.SHOT_DIR;

const ok = await run("Passo 1F", 3203, async ({ browser, base, state }) => {
  const t = state.tables;
  const now = new Date().toISOString();
  const vend = { id: crypto.randomUUID(), email: "vend@smell.ao", password: "vend12345", banned: false };
  state.users.push(vend);
  t.profiles.push({ id: vend.id, full_name: "Vítor", email: vend.email, role: "vendedor", is_adm: false, active: true, must_change_password: false, created_at: now });
  t.settings.find((s) => s.key === "empresa").value = { nome: "Smell", lema: "Cuidamos de si!", nif: "5000000000", morada: "Cuito", telefone: "+244 923 000 000", iban: "AO06 0000" };
  const prod = { id: crypto.randomUUID(), name: "Oud Real", brand: "Smell", description: "", category: "masculino", photo_paths: [], active: true };
  t.products.push(prod);
  const v50 = { id: crypto.randomUUID(), product_id: prod.id, sku: "OUD-50", label: "50 ml", photo_path: null, price_retail: "30000.00", price_reseller: "25000.00", min_stock: 2, replenish_days: 60, active: true };
  t.product_variants.push(v50);
  t.product_variant_costs.push({ variant_id: v50.id, cost_price: "15000.00" });
  t.stock_movements.push({ id: crypto.randomUUID(), variant_id: v50.id, quantity: 10, movement_type: "entrada", reason: "", created_at: now, created_by: null });
  const mk = (code, name, type) => ({ id: crypto.randomUUID(), code, temp_code: null, name, whatsapp: `+24492300000${code}`, address: "", birthday_day: null, birthday_month: null, occupation: "", client_type: type, seller_id: null, funnel_stage: "contacto", referred_by: null, consent: false, consent_at: null, consent_by: null, opt_out: false, opt_out_at: null, notes: "", perfume_preferences: "", created_at: now, created_by: null, updated_at: now, erased_at: null });
  const ana = mk(1, "Ana Conceição", "cliente_final");
  const rev = mk(2, "Rosa Revendedora", "revendedor");
  t.clients.push(ana, rev);
  state.seq = 2;
  t.loyalty_ledger.push({ client_id: ana.id, points: 120, entry_type: "ajuste" });
  t.coupons.push({ id: crypto.randomUUID(), code: "IND-ANA5", client_id: ana.id, kind: "indicacao", percent: "5", status: "activo", expires_at: new Date(Date.now() + 20 * 864e5).toISOString() });
  const stock = () => t.stock_movements.filter((m) => m.variant_id === v50.id).reduce((a, m) => a + m.quantity, 0);
  const points = (id) => t.loyalty_ledger.filter((l) => l.client_id === id).reduce((a, l) => a + l.points, 0);

  const vctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const vp = await vctx.newPage();
  vp.on("dialog", (d) => d.accept());
  await login(vp, base, vend.email, vend.password);

  console.log("Vendedor: venda com cupão + pontos, paga na totalidade");
  await vp.getByRole("link", { name: "Nova venda" }).first().click();
  await vp.getByLabel("Cliente").fill("ana");
  await vp.getByRole("option", { name: /0001 Ana Conceição/ }).click();
  await vp.getByText("120 pontos").waitFor();
  await vp.getByLabel("Procurar perfume").fill("oud");
  await vp.getByRole("button", { name: /Oud Real 50 ml/ }).click();
  await vp.getByRole("button", { name: "Mais Oud Real" }).click();
  await vp.getByLabel("Cupão (um por compra)").selectOption({ index: 1 });
  await vp.getByLabel(/Trocar pontos/).selectOption("100");
  await vp.getByText("39 000,00 Kz").first().waitFor();
  assert(true, "pré-visualização: 60 000 − 35% = 39 000");
  await vp.getByRole("button", { name: "Tudo em Numerário" }).click();
  if (SHOTS) await vp.screenshot({ path: `${SHOTS}/nova-venda.png`, fullPage: true });
  await vp.getByRole("button", { name: "Confirmar venda" }).click();
  await vp.getByText("Venda gravada.").waitFor();
  const s1 = t.sales[0];
  assert(s1.status === "confirmada" && s1.total === "39000.00" && s1.payment_status === "paga", "venda confirmada e paga");
  assert(stock() === 8, "stock desce 2");
  assert(points(ana.id) === 20, "gasta 100 pontos (ficam 20)");
  assert(t.coupons[0].status === "usado", "cupão usado");
  assert((await vp.getByText("Margem").count()) === 0 && (await vp.getByRole("button", { name: "Cancelar venda" }).count()) === 0, "vendedor não vê margem nem cancela");
  if (SHOTS) await vp.screenshot({ path: `${SHOTS}/venda-ficha.png`, fullPage: true });

  console.log("Vendedor: pede desconto (revendedora)");
  await vp.goto(base + "/vendas/nova");
  await vp.getByLabel("Cliente").fill("rosa");
  await vp.getByRole("option", { name: /0002 Rosa/ }).click();
  await vp.getByText(/preços de revendedor/).waitFor();
  await vp.getByLabel("Procurar perfume").fill("oud-50");
  await vp.getByRole("button", { name: /Oud Real 50 ml/ }).click();
  await vp.getByText("25 000,00 Kz").first().waitFor();
  assert(true, "preço de revendedor");
  await vp.getByLabel("Desconto pedido (Kz)").fill("5 000");
  await vp.getByRole("button", { name: "Enviar para aprovação" }).click();
  await vp.getByText("Explique ao CEO o motivo do pedido de desconto.").waitFor();
  await vp.getByLabel("Motivo do pedido *").fill("Compra grande no próximo mês");
  await vp.getByRole("button", { name: "Enviar para aprovação" }).click();
  await vp.getByRole("heading", { name: "Aguarda aprovação do CEO" }).waitFor();
  assert(t.sales[1].status === "aguarda_aprovacao" && stock() === 8, "aguarda aprovação e o stock não mexe");

  console.log("CEO aprova");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => (d.type() === "prompt" ? d.accept("Cliente desistiu") : d.accept()));
  await login(page, base, "ceo@smell.ao", "ceo12345");
  await page.goto(base + "/vendas");
  await page.getByRole("button", { name: /1 venda aguarda a sua aprovação/ }).click();
  await page.getByRole("link", { name: /Venda n.º 0002/ }).click();
  await page.getByText(/Compra grande no próximo mês/).waitFor();
  await page.getByRole("button", { name: "Aprovar desconto" }).click();
  await page.getByText("Venda confirmada.").waitFor();
  assert(t.sales[1].status === "confirmada" && t.sales[1].total === "20000.00", "aprovado: 25 000 − 5 000 = 20 000");
  assert(stock() === 7, "stock sai depois de aprovar");
  await page.getByText("Margem").waitFor();
  assert(true, "CEO vê a margem");

  console.log("CEO: tecto de custo");
  await page.goto(base + "/vendas/nova");
  await page.getByLabel("Cliente").fill("0001");
  await page.getByRole("option", { name: /Ana/ }).click();
  await page.getByLabel("Procurar perfume").fill("oud");
  await page.getByRole("button", { name: /Oud Real 50 ml/ }).click();
  await page.getByLabel("Desconto (Kz)").fill("20000");
  await page.getByText("Desconto limitado pelas regras da Smell (nunca abaixo do custo).").waitFor();
  assert(true, "aviso de tecto na pré-visualização");
  await page.getByRole("button", { name: "Confirmar venda" }).click();
  await page.getByText(/O desconto foi limitado pelas regras da Smell/).waitFor();
  assert(t.sales[2].total === "15000.00" && t.sales[2].payment_status === "em_divida", "total limitado ao custo (15 000) e fica em dívida");

  console.log("Recibo e cancelamento");
  await page.goto(base + `/vendas/ficha?id=${s1.id}`);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Recibo (PDF)" }).click()]);
  assert(dl.suggestedFilename() === "smell-recibo-0001.pdf", "recibo PDF descarregado");
  if (SHOTS) await dl.saveAs(`${SHOTS}/recibo.pdf`);
  await page.getByRole("button", { name: "Cancelar venda" }).click();
  await page.getByText(/Venda cancelada. Atenção: tinham sido recebidos 39 000,00 Kz/).waitFor();
  assert(s1.status === "cancelada" && stock() === 8, "cancelada: stock devolvido (6 + 2)");
  assert(t.coupons[0].status === "activo" && points(ana.id) === 120, "cupão e pontos devolvidos");
});
process.exit(ok ? 0 : 1);
