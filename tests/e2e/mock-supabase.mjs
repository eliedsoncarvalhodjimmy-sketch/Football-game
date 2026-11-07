// Supabase simulado (só para testes de ecrã): Auth + uma parte do PostgREST, em memória.
// Não imita as regras RLS — essas são testadas na base de dados real (npm run test:db).
import http from "node:http";
import crypto from "node:crypto";
import { salesRpc } from "./mock-sales.mjs";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (sub, role = "authenticated") =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, role, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })}.sig`;

export const SERVICE_KEY = jwt("service", "service_role");
export const ANON_KEY = jwt("anon", "anon");

export function createState() {
  const now = new Date().toISOString();
  const ceo = { id: crypto.randomUUID(), email: "ceo@smell.ao", password: "ceo12345", banned: false };
  return {
    users: [ceo],
    tables: {
      profiles: [{ id: ceo.id, full_name: "Eliedson", email: ceo.email, role: "ceo", is_adm: false, active: true, must_change_password: false, created_at: now }],
      tags: [
        { id: crypto.randomUUID(), name: "VIP", color: "#710014", is_system: true },
        { id: crypto.randomUUID(), name: "Embaixador", color: "#C4AA6F", is_system: true },
      ],
      tag_restrictions: [],
      clients: [],
      client_tags: [],
      client_notes: [],
      coupons: [],
      referrals: [],
      summary_overrides: [],
      products: [],
      product_variants: [],
      product_variant_costs: [],
      stock_movements: [],
      sales: [],
      sale_items: [],
      sale_item_costs: [],
      payments: [],
      loyalty_ledger: [],
      notifications: [],
      settings: [
        { key: "fidelidade.pontos", active: true, description: "", updated_at: now, value: { kz_por_ponto: 10000, expiram: false, validade_dias: null, minimo_troca: 50, escaloes: [{ pontos: 50, tipo: "percentagem", valor: 15 }, { pontos: 100, tipo: "percentagem", valor: 30 }, { pontos: 150, tipo: "paga1leva2", item_gratis: "menor_valor" }] } },
        { key: "fidelidade.cupao_indicacao", active: true, description: "", updated_at: now, value: { percentagem: 5, validade_dias: 30 } },
        { key: "fidelidade.embaixador", active: true, description: "", updated_at: now, value: { minimo_indicados_que_compraram: 5 } },
        { key: "vendas.tecto_custo", active: true, description: "", updated_at: now, value: { por_item: true } },
        { key: "vendas.prazo_divida_dias", active: true, description: "", updated_at: now, value: { dias: 35 } },
        { key: "empresa", active: true, description: "", updated_at: now, value: { nome: "Smell", lema: "Cuidamos de si!", nif: "", morada: "", telefone: "", iban: "" } },
      ],
    },
    log: [],
  };
}

function userJson(u) {
  return { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
}
function session(u) {
  return { access_token: jwt(u.id), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: crypto.randomUUID(), user: userJson(u) };
}
function subFromAuth(req) {
  const t = (req.headers.authorization || "").replace("Bearer ", "");
  try { return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; }
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    if (v.startsWith("eq.")) out = out.filter((r) => String(r[k]) === v.slice(3));
    if (v === "is.null") out = out.filter((r) => r[k] === null || r[k] === undefined);
    if (v.startsWith("in.(")) {
      const set = v.slice(4, -1).split(",").map((x) => x.replace(/^"|"$/g, ""));
      out = out.filter((r) => set.includes(String(r[k])));
    }
  }
  return out;
}

export function startMock(port = 54321, state = createState()) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    let json = null;
    try { json = body.length ? JSON.parse(body.toString()) : null; } catch { json = null; }
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      "Access-Control-Expose-Headers": "*",
    };
    const send = (status, data, extra = {}) => {
      res.writeHead(status, { "Content-Type": "application/json", ...cors, ...extra });
      res.end(data === undefined ? "" : JSON.stringify(data));
    };
    if (req.method === "OPTIONS") return send(204);
    state.log.push(`${req.method} ${url.pathname}${url.search}`);
    const p = url.pathname;

    // ---------- Auth ----------
    if (p === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
      const u = state.users.find((x) => x.email === json.email && x.password === json.password);
      if (!u) return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      if (u.banned) return send(400, { code: 400, error_code: "user_banned", msg: "User is banned" });
      return send(200, session(u));
    }
    if (p === "/auth/v1/user" && req.method === "GET") {
      const u = state.users.find((x) => x.id === subFromAuth(req));
      return u ? send(200, userJson(u)) : send(401, { msg: "invalid JWT" });
    }
    if (p === "/auth/v1/user" && req.method === "PUT") {
      const u = state.users.find((x) => x.id === subFromAuth(req));
      if (!u) return send(401, { msg: "invalid JWT" });
      if (json.password) u.password = json.password;
      return send(200, userJson(u));
    }
    if (p === "/auth/v1/logout") return send(204);
    if (p === "/auth/v1/admin/users" && req.method === "POST") {
      if (state.users.some((x) => x.email === json.email)) return send(422, { code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" });
      const u = { id: crypto.randomUUID(), email: json.email, password: json.password, banned: false };
      state.users.push(u);
      const m = json.user_metadata || {};
      state.tables.profiles.push({ id: u.id, full_name: m.full_name || "", email: u.email, role: "vendedor", is_adm: false, active: true, must_change_password: !!m.must_change_password, created_at: new Date().toISOString() });
      return send(200, userJson(u));
    }
    const adminUser = p.match(/^\/auth\/v1\/admin\/users\/([^/]+)$/);
    if (adminUser && req.method === "PUT") {
      const u = state.users.find((x) => x.id === adminUser[1]);
      if (!u) return send(404, { msg: "not found" });
      if (json.password) u.password = json.password;
      if (json.ban_duration) u.banned = json.ban_duration !== "none";
      return send(200, userJson(u));
    }

    // ---------- RPC ----------
    if (p === "/rest/v1/rpc/update_my_profile") {
      const prof = state.tables.profiles.find((x) => x.id === subFromAuth(req));
      if (json.p_full_name) prof.full_name = json.p_full_name;
      if (json.p_password_changed) prof.must_change_password = false;
      return send(204);
    }

    // ---------- Clientes (vista calculada e funções) ----------
    if (p === "/rest/v1/client_summary" && req.method === "GET") {
      const rows = state.tables.clients.map((c) => ({
        client_id: c.id, last_purchase_at: null, days_without_purchase: null, total_spent: "0.00", open_debt: "0.00", points: 0, active_coupons: 0,
        referrals_who_bought: 0,
        points: state.tables.loyalty_ledger.filter((l) => l.client_id === c.id).reduce((a, l) => a + l.points, 0),
        ...(state.tables.summary_overrides.find((o) => o.client_id === c.id) || {}),
      }));
      const out = applyFilters(rows, url.searchParams);
      if ((req.headers.accept || "").includes("vnd.pgrst.object")) return out.length === 1 ? send(200, out[0]) : send(406, { code: "PGRST116" });
      return send(200, out);
    }
    const rpc = p.match(/^\/rest\/v1\/rpc\/(submit_sale|decide_sale|cancel_sale)$/);
    if (rpc) {
      const [status, data] = salesRpc(state, rpc[1], json, subFromAuth(req));
      return send(status, data);
    }
    if (p === "/rest/v1/sale_margins" && req.method === "GET") {
      const me = state.tables.profiles.find((x) => x.id === subFromAuth(req));
      if (!me || me.role !== "ceo") return send(200, []);
      const sid = (url.searchParams.get("sale_id") || "").replace("eq.", "");
      const m = state.tables.sale_item_costs.filter((c) => c.sale_id === sid).reduce((a, c) => a + Number(c.margin), 0);
      const row = { sale_id: sid, margin: m.toFixed(2) };
      return (req.headers.accept || "").includes("vnd.pgrst.object") ? send(200, row) : send(200, [row]);
    }
    if (p === "/rest/v1/sales" && req.method === "GET") {
      const rows = applyFilters(state.tables.sales, url.searchParams).map((s) => {
        const c = state.tables.clients.find((x) => x.id === s.client_id);
        return { ...s, clients: c ? { code: c.code, name: c.name, client_type: c.client_type } : null };
      });
      if ((req.headers.accept || "").includes("vnd.pgrst.object")) return rows.length === 1 ? send(200, rows[0]) : send(406, { code: "PGRST116" });
      return send(200, rows.reverse());
    }
    if (p === "/rest/v1/rpc/export_client_data") {
      const c = state.tables.clients.find((x) => x.id === json.p_client_id);
      return send(200, { cliente: c, notas: state.tables.client_notes.filter((n) => n.client_id === c.id) });
    }
    if (p === "/rest/v1/rpc/erase_client") {
      state.tables.clients = state.tables.clients.filter((x) => x.id !== json.p_client_id);
      return send(200, "apagado");
    }

    // ---------- Produtos: stock calculado e Storage ----------
    if (p === "/rest/v1/variant_stock" && req.method === "GET") {
      const rows = state.tables.product_variants.map((v) => ({
        variant_id: v.id, quantity: state.tables.stock_movements.filter((m) => m.variant_id === v.id).reduce((a, m) => a + m.quantity, 0),
      }));
      return send(200, applyFilters(rows, url.searchParams));
    }
    if (p === "/rest/v1/product_variant_costs" && req.method === "GET") {
      const me = state.tables.profiles.find((x) => x.id === subFromAuth(req));
      if (!me || me.role !== "ceo") return send(200, []); // RLS: só o CEO
    }
    const up = p.match(/^\/storage\/v1\/object\/produtos\/(.+)$/);
    if (up && req.method === "POST") {
      state.photos = state.photos || {};
      state.photos[up[1]] = body;
      return send(200, { Key: `produtos/${up[1]}` });
    }
    if (p.startsWith("/storage/v1/object/public/produtos/")) {
      // PNG 1x1 vinho
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAIAAAADnC86AAAAMUlEQVR4nO3NQREAAAQAMGRQVP+PGO7cVmA50XGhTlaxWCwWi8VisVgsFovFYvHTeAHZtwDVypzilwAAAABJRU5ErkJggg==", "base64");
      res.writeHead(200, { "Content-Type": "image/png", ...cors });
      return res.end(png);
    }
    if (p === "/storage/v1/object/produtos" && req.method === "DELETE") return send(200, []);

    // ---------- Tabelas ----------
    const tm = p.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (tm && state.tables[tm[1]]) {
      const name = tm[1];
      const rows = state.tables[name];
      const sub = subFromAuth(req);
      const me = state.tables.profiles.find((x) => x.id === sub);
      const isService = sub === "service";
      const isCeo = isService || (me && me.role === "ceo" && me.active);
      const wantsObject = (req.headers.accept || "").includes("vnd.pgrst.object");
      if (req.method === "GET") {
        const out = applyFilters(rows, url.searchParams);
        if (wantsObject) return out.length === 1 ? send(200, out[0]) : send(406, { code: "PGRST116", message: "no rows" });
        return send(200, out);
      }
      const anyoneWrites = ["clients", "client_tags", "client_notes"].includes(name) || (name === "stock_movements" && me && me.is_adm);
      if (!isCeo && !anyoneWrites && name !== "profiles") return send(403, { code: "42501", message: "permission denied" });
      if (req.method === "POST") {
        const items = Array.isArray(json) ? json : [json];
        for (const it of items) {
          if (name === "tags" && rows.some((r) => r.name === it.name)) return send(409, { code: "23505", message: "duplicate key value violates unique constraint" });
          if (name === "clients") {
            state.seq = (state.seq || 0) + 1;
            const nowIso = new Date().toISOString();
            rows.push({
              address: "", birthday_day: null, birthday_month: null, occupation: "", client_type: "cliente_final", seller_id: null,
              funnel_stage: "contacto", referred_by: null, consent: false, opt_out: false, notes: "", perfume_preferences: "", erased_at: null,
              ...it, code: state.seq, created_at: nowIso, updated_at: nowIso, created_by: sub,
              consent_at: it.consent ? nowIso : null, consent_by: it.consent ? sub : null, opt_out_at: it.opt_out ? nowIso : null,
            });
            continue;
          }
          if (name === "stock_movements") {
            if (it.movement_type === "entrada" && it.quantity <= 0) return send(400, { code: "23514", message: "stock_movements_sign" });
            rows.push({ ...it, created_at: new Date().toISOString(), created_by: sub, sale_id: null });
            continue;
          }
          const key = name === "product_variant_costs" ? "variant_id" : "id";
          const existing = rows.find((r) => it[key] !== undefined && r[key] === it[key]);
          if (existing && (req.headers.prefer || "").includes("merge-duplicates")) {
            Object.assign(existing, it);
            continue;
          }
          if (name === "product_variants") {
            it.sku = String(it.sku).trim().toUpperCase();
            if (rows.some((r) => r.sku === it.sku)) return send(409, { code: "23505", message: "duplicate key value violates unique constraint product_variants_sku_key" });
          }
          if (name === "client_notes") {
            rows.push({ ...it, created_at: new Date().toISOString(), created_by: sub });
            continue;
          }
          rows.push(name === "client_tags" ? { ...it } : { id: crypto.randomUUID(), is_system: false, ...it });
        }
        return send(201);
      }
      if (req.method === "PATCH") {
        if (!isCeo && !anyoneWrites) return send(200, []);
        const target = applyFilters(rows, url.searchParams);
        for (const r of target) {
          if (name === "tags" && r.is_system && json.name && json.name !== r.name) return send(400, { code: "P0001", message: "A etiqueta é do sistema" });
          if (name === "clients" && json.consent && !r.consent) Object.assign(json, { consent_at: new Date().toISOString(), consent_by: sub });
          Object.assign(r, json, name === "settings" ? { updated_at: new Date().toISOString() } : {});
        }
        return send(204);
      }
      if (req.method === "DELETE") {
        const target = applyFilters(rows, url.searchParams);
        if (name === "tags" && target.some((r) => r.is_system)) return send(400, { code: "P0001", message: "A etiqueta é do sistema" });
        state.tables[name] = rows.filter((r) => !target.includes(r));
        return send(204);
      }
    }
    send(404, { message: `mock: rota não simulada ${req.method} ${p}` });
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, state })));
}
