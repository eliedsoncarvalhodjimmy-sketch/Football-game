// Teste de ecrã do passo 1C: entrada, troca de palavra-passe, utilizadores, etiquetas, definições.
// Uso: node tests/e2e/fase1c.mjs  (precisa do Playwright e de "npm run build" feito com as variáveis abaixo)
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { ANON_KEY, SERVICE_KEY, startMock } from "./mock-supabase.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 3200;
const BASE = `http://localhost:${PORT}`;

function assert(cond, msg) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

const { server, state } = await startMock(54321);
const app = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
  stdio: "ignore",
  detached: true,
});
for (let i = 0; i < 60; i++) {
  try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
}

const browser = await chromium.launch();
let failed = false;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());

  console.log("Entrada");
  await page.goto(BASE + "/");
  await page.waitForURL("**/entrar");
  assert(true, "sem sessão vai para /entrar");
  await page.getByLabel("Email").fill("ceo@smell.ao");
  await page.getByLabel("Palavra-passe").fill("errada123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByText("Email ou palavra-passe incorrectos.").waitFor();
  assert(true, "palavra-passe errada mostra erro em português");
  await page.getByLabel("Palavra-passe").fill("ceo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("heading", { name: /Eliedson/ }).waitFor();
  assert(true, "CEO entra e vê a saudação");

  console.log("Utilizadores");
  await page.goto(BASE + "/mais/utilizadores");
  await page.getByRole("button", { name: "Novo utilizador" }).click();
  await page.getByLabel("Nome").fill("Ana Vendedora");
  await page.getByLabel("Email").fill("ana@smell.ao");
  await page.getByRole("button", { name: "Criar conta" }).click();
  const reveal = page.locator("p.font-mono");
  await reveal.waitFor();
  const anaPassword = (await reveal.textContent()).trim();
  assert(/^[A-Za-z2-9]{12}$/.test(anaPassword), "palavra-passe gerada e mostrada uma vez");
  const ana = state.tables.profiles.find((p) => p.email === "ana@smell.ao");
  assert(ana && ana.must_change_password && ana.full_name === "Ana Vendedora", "perfil criado com troca obrigatória");

  console.log("Etiquetas");
  await page.goto(BASE + "/mais/etiquetas");
  await page.getByLabel("Nome").fill("  Clientes   da direcção ");
  await page.getByRole("button", { name: "Criar" }).click();
  await page.getByText('Etiqueta "Clientes da direcção" criada.').waitFor();
  assert(state.tables.tags.some((t) => t.name === "Clientes da direcção"), "etiqueta criada (nome limpo)");
  await page.locator("li", { hasText: "Clientes da direcção" }).waitFor();
  assert((await page.getByRole("button", { name: "Apagar" }).count()) === 1, "VIP e Embaixador não têm botão Apagar");

  console.log("Restrição por etiqueta");
  await page.goto(BASE + "/mais/utilizadores");
  await page.getByRole("button", { name: /Ana Vendedora/ }).click();
  await page.getByRole("checkbox").nth(0).click();
  await page.getByText("Restrição actualizada.").waitFor();
  assert(state.tables.tag_restrictions.some((r) => r.user_id === ana.id), "restrição guardada para a vendedora");

  console.log("Definições");
  await page.goto(BASE + "/mais/definicoes");
  await page.getByRole("switch", { name: "Pontos de fidelidade" }).click();
  await page.getByText("Regra desligada.").waitFor();
  assert(state.tables.settings.find((s) => s.key === "fidelidade.pontos").active === false, "pontos desligados");
  const cupao = page.locator("section", { has: page.getByText("Cupões de indicação") }).last();
  await cupao.getByLabel("Desconto do cupão (%)").fill("150");
  await cupao.getByRole("button", { name: "Guardar" }).click();
  await cupao.getByText("Desconto do cupão: máximo 100.").waitFor();
  assert(true, "valor inválido recusado");
  await cupao.getByLabel("Desconto do cupão (%)").fill("7");
  await cupao.getByRole("button", { name: "Guardar" }).click();
  await cupao.getByText(/Guardado/).waitFor();
  assert(state.tables.settings.find((s) => s.key === "fidelidade.cupao_indicacao").value.percentagem === 7, "cupão passa a 7%");
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/definicoes.png`, fullPage: true });

  console.log("Sair");
  await page.goto(BASE + "/mais/conta");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.waitForURL("**/entrar");
  assert(true, "CEO sai");

  console.log("Primeiro acesso da vendedora (telemóvel)");
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await mob.newPage();
  await m.goto(BASE + "/entrar");
  await m.getByLabel("Email").fill("ana@smell.ao");
  await m.getByLabel("Palavra-passe").fill(anaPassword);
  await m.getByRole("button", { name: "Entrar" }).click();
  await m.waitForURL("**/trocar-palavra-passe");
  assert(true, "obrigada a trocar a palavra-passe");
  await m.getByLabel("Nova palavra-passe", { exact: true }).fill("curta");
  await m.getByLabel("Repita a nova palavra-passe").fill("curta");
  await m.getByRole("button", { name: "Guardar palavra-passe" }).click();
  await m.getByText(/8 caracteres/).first().waitFor();
  await m.getByLabel("Nova palavra-passe", { exact: true }).fill("perfume2026");
  await m.getByLabel("Repita a nova palavra-passe").fill("perfume2026");
  await m.getByRole("button", { name: "Guardar palavra-passe" }).click();
  await m.getByRole("heading", { name: /Ana/ }).waitFor();
  assert(state.users.find((u) => u.email === "ana@smell.ao").password === "perfume2026", "palavra-passe trocada");
  await m.goto(BASE + "/mais");
  await m.getByRole("link", { name: /A minha conta/ }).waitFor();
  assert((await m.getByRole("link", { name: /Definições/ }).count()) === 0, "vendedora não vê Definições no menu");
  await m.goto(BASE + "/mais/definicoes");
  await m.getByText("Esta área é só para o CEO.").waitFor();
  assert(true, "vendedora bloqueada nas Definições");
  if (process.env.SHOT_DIR) await m.screenshot({ path: `${process.env.SHOT_DIR}/vendedora-mais.png` });

  console.log("Desactivar conta");
  await page.goto(BASE + "/entrar");
  await page.getByLabel("Email").fill("ceo@smell.ao");
  await page.getByLabel("Palavra-passe").fill("ceo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("heading", { name: /Eliedson/ }).waitFor();
  await page.goto(BASE + "/mais/utilizadores");
  await page.getByRole("button", { name: /Ana Vendedora/ }).click();
  await page.getByRole("switch", { name: "Conta activa" }).click();
  await page.getByText("Conta desactivada.").waitFor();
  assert(state.users.find((u) => u.email === "ana@smell.ao").banned, "conta bloqueada no acesso");
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/utilizadores.png`, fullPage: true });
  // A vendedora ainda tinha sessão aberta: ao abrir a app é posta fora.
  await m.goto(BASE + "/mais/conta");
  await m.waitForURL("**/entrar");
  await m.getByText("A sua conta está desactivada. Fale com o CEO.").waitFor();
  assert(true, "sessão aberta de conta desactivada é terminada");
  await m.reload();
  await m.getByLabel("Email").fill("ana@smell.ao");
  await m.getByLabel("Palavra-passe").fill("perfume2026");
  await m.getByRole("button", { name: "Entrar" }).click();
  await m.getByText("A sua conta está desactivada. Fale com o CEO.").waitFor();
  assert(true, "conta desactivada não entra");
  console.log("\n✓ Passo 1C: todos os testes de ecrã passaram.");
} catch (e) {
  failed = true;
  console.error(e);
  console.error("Últimos pedidos ao Supabase simulado:", state.log.slice(-8));
} finally {
  await browser.close();
  try { process.kill(-app.pid, "SIGTERM"); } catch { app.kill(); }
  server.close();
  process.exit(failed ? 1 : 0);
}
