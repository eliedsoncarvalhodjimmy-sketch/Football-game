"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CLIENT_TYPES, FUNNEL_STAGES, MONTHS, validateClientForm, type ClientFormInput, type ClientRecord } from "@/lib/clients/model";
import type { ClientRow } from "@/lib/clients/filters";
import { normalizeWhatsapp } from "@/lib/clients/whatsapp";
import { formatDateTime } from "@/lib/format";
import type { ClientsBundle } from "@/lib/clients/api";
import { Button, Card, Checkbox, Field, Notice, Select, TextArea } from "@/components/ui";
import { ClientName } from "./client-name";
import { ClientPicker } from "./client-picker";
import { TagSelector } from "./tag-selector";

export function ClientForm({
  initial,
  initialTags,
  bundle,
  selfId,
  consentInfo,
  referralLocked,
  submitLabel,
  onSubmit,
}: {
  initial: ClientFormInput;
  initialTags: string[];
  bundle: ClientsBundle;
  selfId?: string;
  consentInfo?: { at: string | null; byName: string | null };
  referralLocked?: boolean;
  submitLabel: string;
  onSubmit: (record: ClientRecord, tagIds: string[]) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [tagIds, setTagIds] = useState(initialTags);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormInput, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ClientFormInput>(k: K, v: ClientFormInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Aviso de número repetido (não bloqueia: pode ser a mesma família)
  const duplicate = useMemo<ClientRow | undefined>(() => {
    const wa = normalizeWhatsapp(form.whatsapp);
    if (!wa.ok) return undefined;
    return bundle.rows.find((r) => r.client.whatsapp === wa.value && r.client.id !== selfId);
  }, [form.whatsapp, bundle.rows, selfId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const r = validateClientForm(form, selfId);
    if (!r.ok) {
      setErrors(r.errors);
      setError("Corrija os campos assinalados.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit(r.value, tagIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível guardar.");
    } finally {
      setBusy(false);
    }
  }

  const activeTeam = bundle.team.filter((p) => p.active || p.id === form.sellerId);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && <Notice kind="erro">{error}</Notice>}
      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">Contacto</h2>
        <Field label="Nome *" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} autoComplete="off" />
        <Field
          label="WhatsApp *"
          type="tel"
          inputMode="tel"
          value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          onBlur={() => {
            const wa = normalizeWhatsapp(form.whatsapp);
            if (wa.ok) set("whatsapp", wa.value);
          }}
          error={errors.whatsapp}
          hint="Números de Angola podem ser escritos sem +244. Estrangeiros: com o indicativo (ex.: +351…)."
        />
        {duplicate && (
          <Notice>
            Atenção: este número já pertence a <ClientName code={duplicate.client.code} tempCode={duplicate.client.temp_code} name={duplicate.client.name} />.
          </Notice>
        )}
        <Field label="Morada" value={form.address} onChange={(e) => set("address", e.target.value)} autoComplete="off" />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Aniversário — dia" value={form.birthdayDay} onChange={(e) => set("birthdayDay", e.target.value)}>
            <option value="">—</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
          </Select>
          <Select label="Mês" value={form.birthdayMonth} onChange={(e) => set("birthdayMonth", e.target.value)}>
            <option value="">—</option>
            {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </Select>
        </div>
        {(errors.birthdayDay || errors.birthdayMonth) && <p className="-mt-2 text-xs text-erro">{errors.birthdayDay ?? errors.birthdayMonth}</p>}
        <Field label="Profissão / ocupação" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">Relação com a Smell</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo" value={form.clientType} onChange={(e) => set("clientType", e.target.value as ClientFormInput["clientType"])}>
            {CLIENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Select label="Etapa do funil" value={form.funnelStage} onChange={(e) => set("funnelStage", e.target.value as ClientFormInput["funnelStage"])}>
            {FUNNEL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Select label="Vendedor responsável" value={form.sellerId} onChange={(e) => set("sellerId", e.target.value)}>
            <option value="">— Nenhum —</option>
            {activeTeam.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </Select>
        </div>
        {referralLocked ? (
          <p className="text-sm text-texto-suave">Indicado por: não pode ser alterado (o cliente já comprou).</p>
        ) : (
          <ClientPicker label="Indicado por" rows={bundle.rows} value={form.referredBy} onChange={(v) => set("referredBy", v)} excludeId={selfId} error={errors.referredBy} />
        )}
        {bundle.tags.length > 0 && <TagSelector tags={bundle.tags} value={tagIds} onChange={setTagIds} />}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">Mensagens</h2>
        <Checkbox
          label="O cliente consentiu receber mensagens da Smell"
          description="Marque só se o cliente disse que sim. Fica registado quem marcou e quando."
          checked={form.consent}
          onChange={(v) => set("consent", v)}
        />
        {consentInfo?.at && form.consent && (
          <p className="-mt-2 text-xs text-texto-suave">Consentimento marcado por {consentInfo.byName ?? "—"} em {formatDateTime(consentInfo.at)}.</p>
        )}
        <Checkbox
          label="O cliente pediu para não receber mensagens (recusa)"
          description="Com a recusa marcada, nunca lhe serão enviadas mensagens automáticas."
          checked={form.optOut}
          onChange={(v) => set("optOut", v)}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">Preferências e notas</h2>
        <TextArea label="Preferências de perfume" value={form.perfumePreferences} onChange={(e) => set("perfumePreferences", e.target.value)} hint="Ex.: amadeirados, florais, intensidade, marcas preferidas." />
        <TextArea label="Notas" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Card>

      <Button type="submit" loading={busy} className="self-start">{submitLabel}</Button>
    </form>
  );
}
