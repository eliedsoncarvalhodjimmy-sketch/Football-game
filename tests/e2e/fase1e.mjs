// Teste de ecrã do passo 1E: produtos, variações, fotos, preços/custo, stock (entradas, ajustes, alerta).
import crypto from "node:crypto";
import { assert, login, run } from "./harness.mjs";

const SHOTS = process.env.SHOT_DIR;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAIAAAADnC86AAAAMUlEQVR4nO3NQREAAAQAMGRQVP+PGO7cVmA50XGhTlaxWCwWi8VisVgsFovFYvHTeAHZtwDVypzilwAAAABJRU5ErkJggg==", "base64");

const ok = await run("Passo 1E", 3202, async ({ browser, base, state }) => {
  // Vendedor sem ADM
  const vend = { id: crypto.randomUUID(), email: "vend@smell.ao", password: "vend12345", banned: false };
  state.users.push(vend);
  state.tables.profiles.push({ id: vend.id, full_name: "Vítor Vendedor", email: vend.email, role: "vendedor", is_adm: false, active: true, must_change_password: false, created_at: new Date().toISOString() });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await login(page, base, "ceo@smell.ao", "ceo12345");

  console.log("Novo produto com duas variações");
  await page.goto(base + "/produtos");
  await page.getByText("Ainda não há produtos").waitFor();
  await page.getByRole("link", { name: "Novo produto" }).click();
  await page.getByLabel("Nome *").fill("Oud Real");
  await page.getByLabel("Categoria *").selectOption("masculino");
  await page.locator('input[type="file"]').setInputFiles({ name: "oud.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Retirar" }).first().waitFor();
  assert(Object.keys(state.photos || {}).length === 1, "foto comprimida e enviada");
  await page.getByLabel("Variação * (ex.: 50 ml)").fill("50 ml");
  await page.getByRole("button", { name: "Sugerir" }).click();
  assert((await page.getByLabel("Código (SKU) *").inputValue()) === "OUDREA-50", "SKU sugerido");
  await page.getByLabel("Preço cliente final (Kz) *").fill("30 000");
  await page.getByLabel("Preço revendedor (Kz) *").fill("25 000");
  await page.getByLabel("Preço de custo (Kz) * — só o CEO vê").fill("15 000");
  await page.getByText("Margem (cliente final): 15 000,00 Kz (50%)").waitFor();
  assert(true, "margem calculada ao escrever");
  await page.getByLabel("Stock inicial").fill("3");
  await page.getByRole("button", { name: "+ Adicionar variação" }).click();
  const v2 = page.locator("section", { hasText: "Variação 2" });
  await v2.getByLabel("Variação * (ex.: 50 ml)").fill("100 ml");
  await v2.getByRole("button", { name: "Sugerir" }).click();
  await v2.getByLabel("Preço cliente final (Kz) *").fill("45.000");
  await v2.getByLabel("Preço revendedor (Kz) *").fill("38000");
  await v2.getByLabel("Preço de custo (Kz) * — só o CEO vê").fill("40 000");
  await page.getByRole("button", { name: "Guardar produto" }).click();
  await page.getByText(/venda com prejuízo/).waitFor();
  assert(state.tables.products.length === 0, "aviso de custo acima do preço pede confirmação");
  await v2.getByLabel("Preço de custo (Kz) * — só o CEO vê").fill("20 000");
  await page.getByRole("button", { name: "Guardar produto" }).click();
  await page.getByText("Produto registado.").waitFor();
  const variants = state.tables.product_variants;
  assert(variants.length === 2 && variants.find((v) => v.label === "100 ml").price_retail === "45000.00", "preços gravados em Kz (45.000 → 45000.00)");
  assert(state.tables.product_variant_costs.find((c) => c.variant_id === variants.find((v) => v.label === "100 ml").id).cost_price === "20000.00", "custo gravado à parte");
  assert(state.tables.stock_movements.length === 1 && state.tables.stock_movements[0].quantity === 3, "stock inicial como entrada de mercadoria");

  console.log("Ficha: margem, entrada, ajuste, histórico");
  await page.getByText("Margem revendedor").first().waitFor();
  const card50 = page.locator("section", { hasText: "OUDREA-50" });
  await card50.getByText("3 em stock").waitFor();
  await card50.getByRole("button", { name: "Entrada" }).click();
  await card50.getByLabel("Quantidade").fill("4");
  await card50.getByLabel(/Observação/).fill("Fornecedor Luanda");
  await card50.getByRole("button", { name: "Registar" }).click();
  await page.getByText("Entrada de 4 registada.").waitFor();
  await card50.getByText("7 em stock").waitFor();
  assert(true, "entrada soma ao stock (3 + 4 = 7)");
  await card50.getByRole("button", { name: "Ajuste" }).click();
  await card50.getByRole("radio", { name: /Retirar/ }).click();
  await card50.getByLabel("Quantidade").fill("6");
  await card50.getByRole("button", { name: "Registar" }).click();
  await card50.getByText(/Explique o motivo/).waitFor();
  await card50.getByLabel("Motivo *").fill("Frascos partidos no transporte");
  await card50.getByRole("button", { name: "Registar" }).click();
  await card50.getByText("Stock baixo: 1").waitFor();
  assert(state.tables.stock_movements.at(-1).quantity === -6, "ajuste com motivo retira do stock");
  await card50.getByText("Frascos partidos no transporte").waitFor();
  await card50.getByText(/Eliedson/).first().waitFor();
  assert(true, "histórico mostra motivo, data e quem fez");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/produto-ficha.png`, fullPage: true });

  console.log("Alerta de stock baixo na lista");
  await page.goto(base + "/produtos");
  await page.getByText(/2 variações estão com stock baixo ou esgotado/).waitFor();
  assert(true, "alerta de stock baixo (inclui a variação esgotada)");
  await page.getByLabel("Pesquisar produtos").fill("oudrea-100");
  await page.getByText("45 000,00 Kz").waitFor();
  assert(true, "pesquisa por SKU");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/produtos.png`, fullPage: true });

  console.log("Vendedor sem ADM");
  const vctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const vp = await vctx.newPage();
  await login(vp, base, vend.email, vend.password);
  await vp.goto(base + "/produtos");
  await vp.getByText("Oud Real").waitFor();
  assert((await vp.getByRole("link", { name: "Novo produto" }).count()) === 0, "vendedor não cria produtos");
  await vp.getByText("Oud Real").click();
  await vp.getByText("Cliente final").first().waitFor();
  assert((await vp.getByText("Custo").count()) === 0 && (await vp.getByText(/Margem/).count()) === 0, "vendedor não vê custo nem margem");
  assert((await vp.getByRole("button", { name: "Entrada" }).count()) === 0, "vendedor sem ADM não regista entradas");

  console.log("Vendedor com ADM");
  state.tables.profiles.find((p) => p.id === vend.id).is_adm = true;
  await vp.reload();
  await vp.getByRole("button", { name: "Entrada" }).first().waitFor();
  assert((await vp.getByRole("link", { name: "Editar" }).count()) === 0, "com ADM regista stock, mas não edita o produto");
  await vp.goto(base + "/produtos/novo");
  await vp.getByText("Esta área é só para o CEO.").waitFor();
  assert(true, "página de novo produto bloqueada ao vendedor");
});
process.exit(ok ? 0 : 1);
