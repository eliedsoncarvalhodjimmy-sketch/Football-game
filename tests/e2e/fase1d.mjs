// Teste de ecrã do passo 1D: clientes (registar, pesquisar, ficha, indicação, consentimento, notas, editar).
import { assert, login, run } from "./harness.mjs";

const SHOTS = process.env.SHOT_DIR;

const ok = await run("Passo 1D", 3201, async ({ browser, base, state }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on("dialog", (d) => (d.type() === "prompt" ? d.accept(d.defaultValue() || "0002") : d.accept()));
  if (process.env.DEBUG_E2E) page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
  if (process.env.DEBUG_E2E) page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await login(page, base, "ceo@smell.ao", "ceo12345");

  console.log("Registar o primeiro cliente");
  await page.goto(base + "/clientes");
  await page.getByText("Ainda não há clientes").waitFor();
  await page.getByRole("link", { name: "Novo cliente" }).click();
  await page.getByLabel("Nome *").fill("Ana Conceição");
  await page.getByLabel("WhatsApp *").fill("923 111 222");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await page.getByText(/Cliente 0001 registado/).waitFor();
  assert(state.tables.clients[0].code === 1 && state.tables.clients[0].whatsapp === "+244923111222", "cliente 0001 com WhatsApp normalizado (+244)");
  assert(/^TEMP-/.test(state.tables.clients[0].temp_code), "código temporário gerado no aparelho");

  console.log("Validação");
  await page.goto(base + "/clientes/novo");
  await page.getByLabel("Nome *").fill("Bruno Mendes");
  await page.getByLabel("WhatsApp *").fill("823 000 000");
  await page.getByLabel("Aniversário — dia").selectOption("30");
  await page.getByLabel("Mês").selectOption("2");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await page.getByText(/Número angolano inválido/).waitFor();
  await page.getByText("O mês de Fevereiro não tem dia 30.").waitFor();
  assert(state.tables.clients.length === 1, "WhatsApp e aniversário inválidos são recusados");

  console.log("Cliente indicado, com consentimento e etiqueta");
  await page.getByLabel("WhatsApp *").fill("+351 912 345 678");
  await page.getByLabel("Aniversário — dia").selectOption("25");
  await page.getByLabel("Mês").selectOption("12");
  await page.getByLabel("Tipo").selectOption("revendedor");
  await page.getByLabel("Indicado por").fill("ana");
  await page.getByRole("option", { name: /0001 Ana Conceição/ }).click();
  await page.getByRole("button", { name: "VIP" }).click();
  await page.getByLabel("O cliente consentiu receber mensagens da Smell").check();
  await page.getByLabel("Preferências de perfume").fill("Amadeirados");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await page.getByText(/Cliente 0002 registado/).waitFor();
  const bruno = state.tables.clients.find((c) => c.name === "Bruno Mendes");
  assert(bruno.referred_by === state.tables.clients[0].id, "indicação guardada (indicado por 0001)");
  assert(bruno.consent && bruno.consent_by && bruno.consent_at, "consentimento guarda quem e quando");
  assert(state.tables.client_tags.some((t) => t.client_id === bruno.id), "etiqueta VIP guardada");
  await page.getByText(/Consentiu — marcado por Eliedson/).waitFor();
  assert(true, "ficha mostra quem marcou o consentimento");
  await page.getByRole("link", { name: /0001 Ana Conceição/ }).waitFor();
  assert(true, "ficha mostra quem indicou");
  const wa = await page.getByRole("link", { name: "Abrir WhatsApp" }).getAttribute("href");
  assert(wa === "https://wa.me/351912345678", "botão Abrir WhatsApp");

  console.log("Notas de conversa");
  await page.getByLabel("Nova nota").fill("Pediu amostra do novo amadeirado.");
  await page.getByRole("button", { name: "Registar nota" }).click();
  await page.getByText("Pediu amostra do novo amadeirado.").waitFor();
  assert(state.tables.client_notes.length === 1, "nota registada com data e autor");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ficha.png`, fullPage: true });

  console.log("Aviso de número repetido");
  await page.goto(base + "/clientes/novo");
  await page.getByLabel("WhatsApp *").fill("923111222");
  await page.getByText(/este número já pertence a/).waitFor();
  assert(true, "avisa quando o WhatsApp já existe");

  console.log("Pesquisa e filtros");
  state.tables.summary_overrides.push({ client_id: state.tables.clients[0].id, open_debt: "15000.00", days_without_purchase: 40, last_purchase_at: "2026-09-28T10:00:00Z" });
  await page.goto(base + "/clientes");
  await page.locator("main ul li a", { hasText: "Bruno" }).waitFor();
  await page.getByLabel("Pesquisar clientes").fill("conceicao");
  await page.locator("main ul li a", { hasText: "Bruno" }).waitFor({ state: "detached" });
  assert((await page.locator("main ul li a").count()) === 1, "pesquisa sem acentos");
  await page.getByLabel("Pesquisar clientes").fill("2");
  await page.locator("main ul li a", { hasText: "Ana" }).waitFor({ state: "detached" });
  assert((await page.locator("main ul li a").count()) === 1, "pesquisa por código");
  await page.getByLabel("Pesquisar clientes").fill("");
  await page.getByRole("button", { name: /Filtros/ }).click();
  await page.getByLabel("Só com dívida").check();
  await page.locator("main ul li a", { hasText: "Bruno" }).waitFor({ state: "detached" });
  assert((await page.locator("main ul li a").count()) === 1 && (await page.getByText("Dívida 15 000,00 Kz").count()) === 1, "filtro de dívida mostra o valor em Kz");
  await page.getByLabel("Só com dívida").uncheck();
  await page.getByLabel("Tipo").selectOption("revendedor");
  await page.locator("main ul li a", { hasText: "Ana" }).waitFor({ state: "detached" });
  assert((await page.locator("main ul li a").count()) === 1, "filtro por tipo");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/clientes.png`, fullPage: true });

  console.log("Editar");
  await page.goto(base + `/clientes/editar?id=${bruno.id}`);
  await page.getByLabel("Morada").fill("Cuito, Bairro Sede");
  await page.getByRole("button", { name: "Guardar alterações" }).click();
  await page.getByText("Cuito, Bairro Sede").waitFor();
  assert(state.tables.clients.find((c) => c.id === bruno.id).address === "Cuito, Bairro Sede", "cliente editado");

  console.log("Apagar dados (CEO)");
  await page.getByRole("button", { name: "Apagar dados" }).click();
  await page.waitForURL("**/clientes");
  assert(!state.tables.clients.some((c) => c.id === bruno.id), "CEO apaga os dados com confirmação do código");
});
process.exit(ok ? 0 : 1);
