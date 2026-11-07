// Arranque comum dos testes de ecrã: Supabase simulado + app (next start) + browser.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { ANON_KEY, SERVICE_KEY, startMock } from "./mock-supabase.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

export function assert(cond, msg) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

export async function run(title, port, fn) {
  const { server, state } = await startMock(54321);
  const app = spawn("npx", ["next", "start", "-p", String(port)], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
    stdio: "ignore",
    detached: true, // grupo de processos próprio: assim o "next start" é mesmo terminado no fim
  });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  const browser = await chromium.launch();
  let failed = false;
  try {
    await fn({ browser, base, state });
    console.log(`\n✓ ${title}: todos os testes de ecrã passaram.`);
  } catch (e) {
    failed = true;
    console.error(e);
    if (process.env.SHOT_DIR) {
      for (const ctx of browser.contexts()) for (const [i, pg] of ctx.pages().entries()) await pg.screenshot({ path: `${process.env.SHOT_DIR}/falha-${i}.png` }).catch(() => {});
    }
    console.error("Últimos pedidos ao Supabase simulado:", state.log.slice(-8));
  } finally {
    await browser.close();
    try { process.kill(-app.pid, "SIGTERM"); } catch { app.kill(); }
    server.close();
  }
  return !failed;
}

export async function login(page, base, email, password) {
  await page.goto(base + "/entrar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Palavra-passe").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}
