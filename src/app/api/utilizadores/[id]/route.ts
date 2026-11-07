import { jsonError, requireCeo } from "@/lib/auth/require-ceo";
import { parseUserUpdate } from "@/lib/users/validate";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O CEO altera uma conta: nome, perfil, ADM, activa/desactivada, nova palavra-passe. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const check = await requireCeo(request);
  if (!check.ok) return jsonError(check.status, check.error);

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return jsonError(400, "Utilizador inválido.");

  const parsed = parseUserUpdate(await request.json().catch(() => null));
  if (!parsed.ok) return jsonError(400, parsed.error);
  const input = parsed.value;

  if (id === check.ceoId && (input.active === false || input.role === "vendedor")) {
    return jsonError(400, "Não pode desactivar nem despromover a sua própria conta.");
  }

  // 1) Conta de acesso (palavra-passe, bloqueio)
  const authUpdate: { password?: string; ban_duration?: string } = {};
  if (input.newPassword) authUpdate.password = input.newPassword;
  if (input.active !== undefined) authUpdate.ban_duration = input.active ? "none" : "876000h";
  if (Object.keys(authUpdate).length > 0) {
    const { error } = await check.admin.auth.admin.updateUserById(id, authUpdate);
    if (error) return jsonError(400, "Não foi possível actualizar a conta de acesso.");
  }

  // 2) Perfil (com auditoria na base de dados)
  const profileUpdate: Record<string, unknown> = {};
  if (input.fullName !== undefined) profileUpdate.full_name = input.fullName;
  if (input.role !== undefined) profileUpdate.role = input.role;
  if (input.isAdm !== undefined) profileUpdate.is_adm = input.isAdm;
  if (input.active !== undefined) profileUpdate.active = input.active;
  if (input.mustChangePassword !== undefined) profileUpdate.must_change_password = input.mustChangePassword;
  else if (input.newPassword) profileUpdate.must_change_password = true;
  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await check.asCeo.from("profiles").update(profileUpdate).eq("id", id);
    if (error) {
      const msg = /CEO activo/.test(error.message) ? "Tem de existir pelo menos um CEO activo." : "Não foi possível guardar o perfil.";
      return jsonError(400, msg);
    }
  }
  return Response.json({ ok: true });
}
