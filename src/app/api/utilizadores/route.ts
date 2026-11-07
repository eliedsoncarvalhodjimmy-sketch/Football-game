import { jsonError, requireCeo } from "@/lib/auth/require-ceo";
import { parseNewUser } from "@/lib/users/validate";

/** O CEO cria a conta de um utilizador (vendedor ou outro CEO). */
export async function POST(request: Request) {
  const check = await requireCeo(request);
  if (!check.ok) return jsonError(check.status, check.error);

  const parsed = parseNewUser(await request.json().catch(() => null));
  if (!parsed.ok) return jsonError(400, parsed.error);
  const input = parsed.value;

  const { data, error } = await check.admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, must_change_password: input.mustChangePassword },
  });
  if (error || !data.user) {
    const msg = /already|registered|exists/i.test(error?.message ?? "")
      ? "Já existe uma conta com este email."
      : "Não foi possível criar a conta.";
    return jsonError(400, msg);
  }

  // O perfil é criado automaticamente (trigger); acertamos perfil e permissões.
  const { error: profileError } = await check.asCeo
    .from("profiles")
    .update({
      full_name: input.fullName,
      role: input.role,
      is_adm: input.isAdm,
      must_change_password: input.mustChangePassword,
    })
    .eq("id", data.user.id);
  if (profileError) return jsonError(500, "Conta criada, mas falhou a gravação do perfil. Edite-o na lista.");

  return Response.json({ id: data.user.id }, { status: 201 });
}
