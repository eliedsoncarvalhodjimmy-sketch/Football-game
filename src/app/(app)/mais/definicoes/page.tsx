"use client";

import { useCallback, useState, type FormEvent } from "react";
import { CeoOnly } from "@/components/auth-gate";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Field, Notice, Select, Spinner, Toggle } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { SETTINGS_CATALOG, crossCheck, getAt, parseFieldInput, setAt, type FieldDef, type SettingDef } from "@/lib/settings/catalog";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SettingRow } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";

const SUFFIX: Partial<Record<FieldDef["kind"], string>> = { kz: "Kz", percentagem: "%" };

function toText(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function SettingCard({ def, row, onSaved }: { def: SettingDef; row: SettingRow; onSaved: () => void }) {
  const supabase = getSupabaseBrowserClient();
  const [draft, setDraft] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(def.fields.map((f) => {
      const v = getAt(row.value, f.path);
      return [f.path.join("."), f.kind === "sim_nao" ? v === true : toText(v)];
    })),
  );
  const [msg, setMsg] = useState<{ kind: "erro" | "sucesso"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function setActive(active: boolean) {
    setBusy(true);
    const { error } = await supabase.from("settings").update({ active }).eq("key", def.key);
    setBusy(false);
    setMsg(error ? { kind: "erro", text: "Não foi possível guardar. Verifique a ligação." } : { kind: "sucesso", text: active ? "Regra ligada." : "Regra desligada." });
    onSaved();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    let value: unknown = row.value;
    for (const f of def.fields) {
      const parsed = parseFieldInput(f, draft[f.path.join(".")]);
      if (!parsed.ok) return setMsg({ kind: "erro", text: parsed.error });
      value = setAt(value, f.path, parsed.value);
    }
    const problem = crossCheck(def.key, value);
    if (problem) return setMsg({ kind: "erro", text: problem });
    setBusy(true);
    const { error } = await supabase.from("settings").update({ value }).eq("key", def.key);
    setBusy(false);
    setMsg(error ? { kind: "erro", text: "Não foi possível guardar. Verifique a ligação." } : { kind: "sucesso", text: "Guardado. A regra aplica-se a partir de agora." });
    onSaved();
  }

  return (
    <Card>
      <div className="mb-1">
        {def.canDisable ? (
          <Toggle label={def.title} description={def.description} checked={row.active} disabled={busy} onChange={(v) => void setActive(v)} />
        ) : (
          <>
            <h3 className="font-medium text-vinho-escuro">{def.title}</h3>
            <p className="text-xs text-texto-suave">{def.description}</p>
          </>
        )}
      </div>
      {msg && <div className="mt-3"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      {def.fields.length > 0 && (
        <form onSubmit={onSubmit} className={`mt-4 flex flex-col gap-4 ${row.active || !def.canDisable ? "" : "opacity-60"}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {def.fields.map((f) => {
              const k = f.path.join(".");
              if (f.kind === "sim_nao") {
                return <Toggle key={k} label={f.label} checked={draft[k] === true} onChange={(v) => setDraft({ ...draft, [k]: v })} />;
              }
              if (f.kind === "escolha") {
                return (
                  <Select key={k} label={f.label} value={String(draft[k])} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                );
              }
              const numeric = f.kind !== "texto";
              return (
                <Field
                  key={k}
                  label={SUFFIX[f.kind] ? `${f.label} (${SUFFIX[f.kind]})` : f.label}
                  hint={f.hint}
                  inputMode={numeric ? "decimal" : undefined}
                  value={String(draft[k])}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-texto-suave">Última alteração: {formatDateTime(row.updated_at)}</span>
            <Button type="submit" variant="secundario" loading={busy}>Guardar</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function DefinicoesInner() {
  const supabase = getSupabaseBrowserClient();
  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase.from("settings").select("key, value, active, description, updated_at");
    if (error) throw new Error("Não foi possível carregar as definições. Verifique a ligação.");
    return Object.fromEntries(((data as SettingRow[]) ?? []).map((r) => [r.key, r])) as Record<string, SettingRow>;
  }, [supabase]);
  const { data: rows, error, reload: load } = useLoader(fetchRows);

  const groups = Array.from(new Set(SETTINGS_CATALOG.map((d) => d.group)));

  return (
    <>
      <PageHeader title="Definições" subtitle="Ligue, desligue e ajuste as regras. As alterações valem de imediato e ficam no histórico." />
      {error && <Notice kind="erro">{error}</Notice>}
      {rows === null ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{g}</h2>
              {SETTINGS_CATALOG.filter((d) => d.group === g).map((d) =>
                rows[d.key] ? (
                  <SettingCard key={d.key} def={d} row={rows[d.key]} onSaved={load} />
                ) : (
                  <Notice key={d.key} kind="erro">A definição “{d.title}” não existe na base de dados. Aplique as migrações (README).</Notice>
                ),
              )}
            </section>
          ))}
          <p className="text-xs text-texto-suave">
            Lembretes, metas, comissões e horário de silêncio aparecem aqui na Fase 2, quando passarem a funcionar.
          </p>
        </div>
      )}
    </>
  );
}

export default function DefinicoesPage() {
  return (
    <CeoOnly>
      <DefinicoesInner />
    </CeoOnly>
  );
}
