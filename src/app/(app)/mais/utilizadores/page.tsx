"use client";

import { useCallback, useState, type FormEvent } from "react";
import { CeoOnly } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { TagChip } from "@/components/tag-chip";
import { Badge, Button, Card, Field, Notice, Select, Spinner, Toggle } from "@/components/ui";
import { apiFetch, useProfile } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/format";
import { generatePassword } from "@/lib/password";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile, Role, Tag } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";

type Msg = { kind: "erro" | "sucesso"; text: string } | null;

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Não foi possível concluir. Verifique a ligação.";
}

/** Mostra uma palavra-passe nova UMA vez, para o CEO a passar ao utilizador. */
function PasswordReveal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Notice kind="sucesso">
      <p className="font-semibold">Palavra-passe de {email}:</p>
      <p className="my-2 select-all font-mono text-lg tracking-wider text-vinho-escuro">{password}</p>
      <p className="text-xs">Passe-a ao utilizador em privado. Ele vai ter de a trocar no primeiro acesso. Não voltará a ser mostrada.</p>
      <div className="mt-2 flex gap-2">
        <Button
          variant="secundario"
          onClick={() => {
            void navigator.clipboard?.writeText(password).then(() => setCopied(true));
          }}
        >
          {copied ? "Copiada" : "Copiar"}
        </Button>
        <Button variant="texto" onClick={onClose}>Fechar</Button>
      </div>
    </Notice>
  );
}

function NewUserForm({ onCreated }: { onCreated: (email: string, password: string) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [role, setRole] = useState<Role>("vendedor");
  const [isAdm, setIsAdm] = useState(false);
  const [mustChange, setMustChange] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!navigator.onLine) return setError("Precisa de internet para criar contas.");
    setBusy(true);
    const res = await apiFetch("/api/utilizadores", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, role, isAdm, mustChangePassword: mustChange }),
    });
    setBusy(false);
    if (!res.ok) return setError(await readError(res));
    onCreated(email.trim().toLowerCase(), password);
    setFullName("");
    setEmail("");
    setPassword(generatePassword());
    setRole("vendedor");
    setIsAdm(false);
    setMustChange(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error && <Notice kind="erro">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Palavra-passe inicial" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" hint="Gerada automaticamente; pode escrever outra." />
          </div>
          <Button type="button" variant="secundario" className="mb-5" onClick={() => setPassword(generatePassword())}>Gerar</Button>
        </div>
        <Select label="Perfil" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="vendedor">Vendedor</option>
          <option value="ceo">CEO</option>
        </Select>
      </div>
      <Toggle label="Permissão ADM" description="Pode registar entradas de mercadoria e ajustes de stock." checked={isAdm} onChange={setIsAdm} />
      <Toggle label="Obrigar a trocar a palavra-passe no primeiro acesso" checked={mustChange} onChange={setMustChange} />
      <Button type="submit" loading={busy} disabled={!fullName || !email || !password} className="self-start">
        Criar conta
      </Button>
    </form>
  );
}

function UserEditor({
  user,
  tags,
  restricted,
  isSelf,
  onChanged,
  onPassword,
}: {
  user: Profile;
  tags: Tag[];
  restricted: Set<string>;
  isSelf: boolean;
  onChanged: (msg: Msg) => void;
  onPassword: (email: string, password: string) => void;
}) {
  const supabase = getSupabaseBrowserClient();
  const [fullName, setFullName] = useState(user.full_name);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, ok: string) {
    if (!navigator.onLine) {
      onChanged({ kind: "erro", text: "Precisa de internet para alterar contas." });
      return false;
    }
    setBusy(true);
    const res = await apiFetch(`/api/utilizadores/${user.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    onChanged(res.ok ? { kind: "sucesso", text: ok } : { kind: "erro", text: await readError(res) });
    return res.ok;
  }

  async function toggleRestriction(tagId: string, on: boolean) {
    const { error } = on
      ? await supabase.from("tag_restrictions").insert({ tag_id: tagId, user_id: user.id })
      : await supabase.from("tag_restrictions").delete().eq("tag_id", tagId).eq("user_id", user.id);
    onChanged(error ? { kind: "erro", text: "Não foi possível guardar a restrição." } : { kind: "sucesso", text: "Restrição actualizada." });
  }

  async function resetPassword() {
    if (!window.confirm(`Gerar uma nova palavra-passe para ${user.email}? A actual deixa de funcionar.`)) return;
    const pw = generatePassword();
    const done = await patch({ newPassword: pw, mustChangePassword: true }, "Nova palavra-passe gerada.");
    if (done) onPassword(user.email, pw);
  }

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-linha pt-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Nome" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <Button variant="secundario" className="mb-0" loading={busy} onClick={() => void patch({ fullName }, "Nome guardado.")}>Guardar</Button>
      </div>
      {!isSelf && (
        <>
          <Select label="Perfil" value={user.role} disabled={busy} onChange={(e) => void patch({ role: e.target.value }, "Perfil alterado.")}>
            <option value="vendedor">Vendedor</option>
            <option value="ceo">CEO</option>
          </Select>
          <Toggle label="Conta activa" description="Desactivar bloqueia a entrada na app de imediato." checked={user.active} disabled={busy} onChange={(v) => void patch({ active: v }, v ? "Conta activada." : "Conta desactivada.")} />
        </>
      )}
      <Toggle label="Permissão ADM" description="Entradas de mercadoria e ajustes de stock." checked={user.is_adm || user.role === "ceo"} disabled={busy || user.role === "ceo"} onChange={(v) => void patch({ isAdm: v }, "Permissão ADM actualizada.")} />
      {user.role === "vendedor" && tags.length > 0 && (
        <div>
          <p className="text-sm font-medium text-vinho-escuro">Etiquetas que este vendedor NÃO pode ver</p>
          <p className="mb-2 text-xs text-texto-suave">Os clientes com estas etiquetas ficam invisíveis para ele.</p>
          <div className="flex flex-wrap gap-3">
            {tags.map((t) => (
              <label key={t.id} className="flex min-h-11 items-center gap-2">
                <input type="checkbox" className="h-5 w-5 accent-[#710014]" checked={restricted.has(t.id)} onChange={(e) => void toggleRestriction(t.id, e.target.checked)} />
                <TagChip name={t.name} color={t.color} />
              </label>
            ))}
          </div>
        </div>
      )}
      {!isSelf && (
        <Button variant="secundario" loading={busy} className="self-start" onClick={() => void resetPassword()}>
          Gerar nova palavra-passe
        </Button>
      )}
    </div>
  );
}

function UtilizadoresInner() {
  const me = useProfile();
  const supabase = getSupabaseBrowserClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);

  const fetchAll = useCallback(async () => {
    const [u, t, r] = await Promise.all([
      supabase.from("profiles").select("*").order("role").order("full_name"),
      supabase.from("tags").select("id, name, color, is_system").order("name"),
      supabase.from("tag_restrictions").select("tag_id, user_id"),
    ]);
    if (u.error || t.error || r.error) throw new Error("Não foi possível carregar os utilizadores. Verifique a ligação.");
    return {
      users: (u.data as Profile[]) ?? [],
      tags: (t.data as Tag[]) ?? [],
      restrictions: (r.data as { tag_id: string; user_id: string }[]) ?? [],
    };
  }, [supabase]);
  const { data, error: loadError, reload: load } = useLoader(fetchAll);
  const users = data?.users ?? null;
  const tags = data?.tags ?? [];
  const restrictions = data?.restrictions ?? [];

  function changed(m: Msg) {
    setMsg(m);
    load();
  }

  return (
    <>
      <PageHeader
        title="Utilizadores"
        subtitle="Só o CEO cria contas. Não há registo público."
        actions={!showNew && <Button onClick={() => setShowNew(true)}>Novo utilizador</Button>}
      />
      <div className="flex flex-col gap-4">
        {reveal && <PasswordReveal email={reveal.email} password={reveal.password} onClose={() => setReveal(null)} />}
        {loadError && <Notice kind="erro">{loadError}</Notice>}
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        {showNew && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Novo utilizador</h2>
              <Button variant="texto" onClick={() => setShowNew(false)}>Fechar</Button>
            </div>
            <NewUserForm
              onCreated={(email, password) => {
                setShowNew(false);
                setReveal({ email, password });
                setMsg({ kind: "sucesso", text: `Conta de ${email} criada.` });
                load();
              }}
            />
          </Card>
        )}
        {users === null ? (
          <Spinner />
        ) : (
          <ul className="flex flex-col gap-3">
            {users.map((u) => (
              <li key={u.id}>
                <Card>
                  <button type="button" className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={openId === u.id} onClick={() => setOpenId(openId === u.id ? null : u.id)}>
                    <span>
                      <span className="block font-semibold text-vinho-escuro">{u.full_name || "(sem nome)"}{u.id === me.id && " (eu)"}</span>
                      <span className="block text-sm text-texto-suave">{u.email} · desde {formatDate(u.created_at)}</span>
                    </span>
                    <span className="flex flex-wrap justify-end gap-1">
                      <Badge tone="vinho">{u.role === "ceo" ? "CEO" : "Vendedor"}</Badge>
                      {u.is_adm && u.role !== "ceo" && <Badge tone="dourado">ADM</Badge>}
                      {!u.active && <Badge tone="cinza">Desactivada</Badge>}
                      {u.must_change_password && <Badge tone="cinza">Troca pendente</Badge>}
                    </span>
                  </button>
                  {openId === u.id && (
                    <UserEditor
                      user={u}
                      tags={tags}
                      restricted={new Set(restrictions.filter((r) => r.user_id === u.id).map((r) => r.tag_id))}
                      isSelf={u.id === me.id}
                      onChanged={changed}
                      onPassword={(email, password) => setReveal({ email, password })}
                    />
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function UtilizadoresPage() {
  return (
    <CeoOnly>
      <UtilizadoresInner />
    </CeoOnly>
  );
}
