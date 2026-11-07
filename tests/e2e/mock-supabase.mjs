// Supabase simulado (só para testes de ecrã): Auth + uma parte do PostgREST, em memória.
// Não imita as regras RLS — essas são testadas na base de dados real (npm run test:db).
import http from "node:http";
import crypto from "node:crypto";

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
  }
  return out;
}

export function startMock(port = 54321, state = createState()) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let body = "";
    for await (const c of req) body += c;
    const json = body ? JSON.parse(body) : null;
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
      if (!isCeo && name !== "profiles") return send(403, { code: "42501", message: "permission denied" });
      if (req.method === "POST") {
        const items = Array.isArray(json) ? json : [json];
        for (const it of items) {
          if (name === "tags" && rows.some((r) => r.name === it.name)) return send(409, { code: "23505", message: "duplicate key value violates unique constraint" });
          rows.push({ id: crypto.randomUUID(), is_system: false, ...it });
        }
        return send(201);
      }
      if (req.method === "PATCH") {
        if (!isCeo) return send(200, []);
        const target = applyFilters(rows, url.searchParams);
        for (const r of target) {
          if (name === "tags" && r.is_system && json.name && json.name !== r.name) return send(400, { code: "P0001", message: "A etiqueta é do sistema" });
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
