import { passwordProblem } from "../password";

export type Role = "ceo" | "vendedor";

export interface NewUserInput {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  isAdm: boolean;
  mustChangePassword: boolean;
}

export interface UserUpdateInput {
  fullName?: string;
  role?: Role;
  isAdm?: boolean;
  active?: boolean;
  newPassword?: string;
  mustChangePassword?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isRole(v: unknown): v is Role {
  return v === "ceo" || v === "vendedor";
}

/** Valida o pedido do CEO para criar uma conta (corre no servidor). */
export function parseNewUser(body: unknown): Result<NewUserInput> {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Pedido inválido." };
  const b = body as Record<string, unknown>;
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const role = b.role ?? "vendedor";
  if (fullName.length < 2) return { ok: false, error: "Indique o nome." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Email inválido." };
  const pw = passwordProblem(password);
  if (pw) return { ok: false, error: pw };
  if (!isRole(role)) return { ok: false, error: "Perfil inválido." };
  return {
    ok: true,
    value: {
      fullName,
      email,
      password,
      role,
      isAdm: b.isAdm === true,
      mustChangePassword: b.mustChangePassword !== false,
    },
  };
}

/** Valida alterações a uma conta existente. */
export function parseUserUpdate(body: unknown): Result<UserUpdateInput> {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Pedido inválido." };
  const b = body as Record<string, unknown>;
  const out: UserUpdateInput = {};
  if (b.fullName !== undefined) {
    if (typeof b.fullName !== "string" || b.fullName.trim().length < 2) return { ok: false, error: "Indique o nome." };
    out.fullName = b.fullName.trim();
  }
  if (b.role !== undefined) {
    if (!isRole(b.role)) return { ok: false, error: "Perfil inválido." };
    out.role = b.role;
  }
  for (const k of ["isAdm", "active", "mustChangePassword"] as const) {
    if (b[k] !== undefined) {
      if (typeof b[k] !== "boolean") return { ok: false, error: "Pedido inválido." };
      out[k] = b[k] as boolean;
    }
  }
  if (b.newPassword !== undefined) {
    if (typeof b.newPassword !== "string") return { ok: false, error: "Pedido inválido." };
    const pw = passwordProblem(b.newPassword);
    if (pw) return { ok: false, error: pw };
    out.newPassword = b.newPassword;
  }
  if (Object.keys(out).length === 0) return { ok: false, error: "Nada para alterar." };
  return { ok: true, value: out };
}
