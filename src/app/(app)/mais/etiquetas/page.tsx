"use client";

import { useCallback, useState, type FormEvent } from "react";
import { CeoOnly } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { TagChip } from "@/components/tag-chip";
import { Button, Card, Field, Notice, Select, Spinner } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TAG_COLORS, normalizeTagName } from "@/lib/tags";
import type { Tag } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";

function friendlyError(message: string): string {
  if (/duplicate|unique/i.test(message)) return "Já existe uma etiqueta com esse nome.";
  if (/sistema/i.test(message)) return "As etiquetas VIP e Embaixador não podem ser apagadas nem renomeadas.";
  return "Não foi possível guardar. Verifique a ligação.";
}

function EtiquetasInner() {
  const supabase = getSupabaseBrowserClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0].value);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [msg, setMsg] = useState<{ kind: "erro" | "sucesso"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchTags = useCallback(async () => {
    const { data, error } = await supabase.from("tags").select("id, name, color, is_system").order("is_system", { ascending: false }).order("name");
    if (error) throw new Error("Não foi possível carregar as etiquetas. Verifique a ligação.");
    return (data as Tag[]) ?? [];
  }, [supabase]);
  const { data: tags, error: loadError, reload: load } = useLoader(fetchTags);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const clean = normalizeTagName(name);
    if (!clean) return setMsg({ kind: "erro", text: "Escreva o nome da etiqueta." });
    setBusy(true);
    const { error } = await supabase.from("tags").insert({ name: clean, color });
    setBusy(false);
    if (error) return setMsg({ kind: "erro", text: friendlyError(error.message) });
    setName("");
    setMsg({ kind: "sucesso", text: `Etiqueta "${clean}" criada.` });
    load();
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const clean = normalizeTagName(editing.name);
    if (!clean) return setMsg({ kind: "erro", text: "Escreva o nome da etiqueta." });
    setBusy(true);
    const { error } = await supabase.from("tags").update({ name: clean, color: editing.color }).eq("id", editing.id);
    setBusy(false);
    if (error) return setMsg({ kind: "erro", text: friendlyError(error.message) });
    setEditing(null);
    setMsg({ kind: "sucesso", text: "Etiqueta actualizada." });
    load();
  }

  async function onDelete(tag: Tag) {
    if (!window.confirm(`Apagar a etiqueta "${tag.name}"? Será retirada de todos os clientes.`)) return;
    const { error } = await supabase.from("tags").delete().eq("id", tag.id);
    if (error) return setMsg({ kind: "erro", text: friendlyError(error.message) });
    setMsg({ kind: "sucesso", text: `Etiqueta "${tag.name}" apagada.` });
    load();
  }

  return (
    <>
      <PageHeader title="Etiquetas" subtitle="Usadas para agrupar clientes e para esconder clientes de certos vendedores." />
      <div className="flex flex-col gap-4">
        {loadError && <Notice kind="erro">{loadError}</Notice>}
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <Card>
          <h2 className="mb-4 font-semibold">Nova etiqueta</h2>
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <Field label="Nome" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            <Select label="Cor" value={color} onChange={(e) => setColor(e.target.value)}>
              {TAG_COLORS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
            <Button type="submit" loading={busy}>Criar</Button>
          </form>
        </Card>
        <Card>
          {tags === null ? (
            <Spinner />
          ) : (
            <ul className="divide-y divide-linha">
              {tags.map((t) => (
                <li key={t.id} className="py-3">
                  {editing?.id === t.id ? (
                    <form onSubmit={onSaveEdit} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto_auto] sm:items-end">
                      <Field label="Nome" value={editing.name} maxLength={40} disabled={t.is_system} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                      <Select label="Cor" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })}>
                        {TAG_COLORS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </Select>
                      <Button type="submit" loading={busy}>Guardar</Button>
                      <Button type="button" variant="texto" onClick={() => setEditing(null)}>Cancelar</Button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <TagChip name={t.name} color={t.color} />
                        {t.is_system && <span className="text-xs text-texto-suave">do sistema</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="texto" onClick={() => setEditing(t)}>Editar</Button>
                        {!t.is_system && (
                          <Button variant="texto" className="text-erro" onClick={() => void onDelete(t)}>Apagar</Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

export default function EtiquetasPage() {
  return (
    <CeoOnly>
      <EtiquetasInner />
    </CeoOnly>
  );
}
