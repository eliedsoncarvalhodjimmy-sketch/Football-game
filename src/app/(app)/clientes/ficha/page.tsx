"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState, type FormEvent, type ReactNode } from "react";
import { AmbassadorSeal, ClientName } from "@/components/clients/client-name";
import { TagChip } from "@/components/tag-chip";
import { Badge, Button, Card, Notice, Spinner, TextArea } from "@/components/ui";
import { useProfile } from "@/lib/auth/auth-context";
import { addClientNote, eraseClient, exportClientData, fetchClientDetail, fetchClientsBundle } from "@/lib/clients/api";
import { MONTHS, clientTypeLabel, stageLabel } from "@/lib/clients/model";
import { formatWhatsapp, whatsappLink } from "@/lib/clients/whatsapp";
import { formatClientCode, formatDate, formatDateTime, formatKz } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "erro" }) {
  return (
    <div className="rounded-xl border border-linha bg-white p-3">
      <p className="text-xs text-texto-suave">{label}</p>
      <p className={`mt-1 font-semibold ${tone === "erro" ? "text-erro" : "text-vinho-escuro"}`}>{value}</p>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-texto-suave">{label}</dt>
      <dd className="text-texto">{children || "—"}</dd>
    </div>
  );
}

function FichaInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const isNew = params.get("novo") === "1";
  const me = useProfile();
  const router = useRouter();
  const load = useCallback(async () => {
    const [detail, bundle] = await Promise.all([fetchClientDetail(id), fetchClientsBundle()]);
    return { detail, bundle };
  }, [id]);
  const { data, error, reload } = useLoader(load);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ kind: "erro" | "sucesso"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <Notice kind="erro">{error}</Notice>;
  if (!data) return <Spinner />;
  if (!data.detail) return <Notice kind="erro">Cliente não encontrado (ou sem permissão para o ver).</Notice>;

  const { client: c, summary: s, tagIds, notes, referrer, referred, coupons } = data.detail;
  const { team, tags } = data.bundle;
  const person = (pid: string | null) => {
    const p = team.find((x) => x.id === pid);
    return p ? p.full_name || p.email : "—";
  };
  const ambassador = tags.find((t) => t.is_system && t.name === "Embaixador");
  const codeText = c.code !== null ? formatClientCode(c.code) : (c.temp_code ?? "");

  async function onAddNote(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addClientNote(c.id, note);
      setNote("");
      setMsg(null);
      reload();
    } catch (err) {
      setMsg({ kind: "erro", text: err instanceof Error ? err.message : "Erro." });
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    try {
      const json = await exportClientData(c.id);
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `smell-cliente-${codeText}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg({ kind: "sucesso", text: "Ficheiro com os dados do cliente descarregado." });
    } catch (err) {
      setMsg({ kind: "erro", text: err instanceof Error ? err.message : "Erro." });
    }
  }

  async function onErase() {
    const typed = window.prompt(
      `Apagar os dados pessoais de ${codeText} ${c.name}?\n\nIsto não pode ser desfeito. Se o cliente tiver compras, estas ficam guardadas sem os dados pessoais.\n\nPara confirmar, escreva o código do cliente (${codeText}):`,
    );
    if (typed === null) return;
    if (typed.trim() !== codeText) {
      setMsg({ kind: "erro", text: "Código não confirmado. Nada foi apagado." });
      return;
    }
    try {
      const result = await eraseClient(c.id);
      window.alert(result === "apagado" ? "Cliente apagado." : "Dados pessoais apagados. As compras ficam registadas como “Cliente apagado”.");
      router.replace("/clientes");
    } catch (err) {
      setMsg({ kind: "erro", text: err instanceof Error ? err.message : "Erro." });
    }
  }

  const birthday = c.birthday_day && c.birthday_month ? `${c.birthday_day} de ${MONTHS[c.birthday_month - 1]}` : "";

  return (
    <>
      <Link href="/clientes" className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-vinho">← Clientes</Link>
      {isNew && <div className="mb-4"><Notice kind="sucesso">Cliente {codeText} registado.</Notice></div>}
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <ClientName code={c.code} tempCode={c.temp_code} name={c.name} />
          </h1>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge>{clientTypeLabel(c.client_type)}</Badge>
            {ambassador && tagIds.includes(ambassador.id) && <AmbassadorSeal />}
            {tagIds.filter((t) => t !== ambassador?.id).map((t) => {
              const tag = tags.find((x) => x.id === t);
              return tag ? <TagChip key={t} name={tag.name} color={tag.color} /> : null;
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={whatsappLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-vinho px-5 font-semibold text-creme hover:bg-vinho-escuro">
            Abrir WhatsApp
          </a>
          <Link href={`/clientes/editar?id=${c.id}`} className="inline-flex min-h-11 items-center rounded-full border border-vinho bg-superficie px-5 font-semibold text-vinho hover:bg-creme">
            Editar
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Última compra" value={s?.last_purchase_at ? formatDate(s.last_purchase_at) : "Ainda não comprou"} />
        <Stat label="Dias sem comprar" value={s?.days_without_purchase ?? "—"} />
        <Stat label="Total gasto" value={formatKz(s?.total_spent)} />
        <Stat label="Dívida em aberto" value={formatKz(s?.open_debt)} tone={Number(s?.open_debt ?? 0) > 0 ? "erro" : undefined} />
        <Stat label="Pontos" value={s?.points ?? 0} />
        <Stat label="Cupões activos" value={s?.active_coupons ?? 0} />
        <Stat label="Indicações que compraram" value={s?.referrals_who_bought ?? 0} />
        <Stat label="Etapa do funil" value={stageLabel(c.funnel_stage)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Dados</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Info label="WhatsApp">{formatWhatsapp(c.whatsapp)}</Info>
            <Info label="Morada">{c.address}</Info>
            <Info label="Aniversário">{birthday}</Info>
            <Info label="Profissão / ocupação">{c.occupation}</Info>
            <Info label="Vendedor responsável">{c.seller_id ? person(c.seller_id) : ""}</Info>
            <Info label="Indicado por">
              {referrer ? (
                <Link className="font-semibold text-vinho underline-offset-4 hover:underline" href={`/clientes/ficha?id=${referrer.id}`}>
                  <ClientName code={referrer.code} name={referrer.name} />
                </Link>
              ) : ""}
            </Info>
            <Info label="Mensagens">
              {c.opt_out ? (
                <span className="font-semibold text-erro">Recusou receber mensagens{c.opt_out_at ? ` (${formatDate(c.opt_out_at)})` : ""}</span>
              ) : c.consent ? (
                <>Consentiu — marcado por {person(c.consent_by)} em {formatDateTime(c.consent_at)}</>
              ) : (
                "Sem consentimento registado"
              )}
            </Info>
            <Info label="Cliente desde">{formatDate(c.created_at)} ({person(c.created_by)})</Info>
          </dl>
          {(c.perfume_preferences || c.notes) && (
            <div className="mt-4 flex flex-col gap-3 border-t border-linha pt-4">
              {c.perfume_preferences && <Info label="Preferências de perfume"><span className="whitespace-pre-line">{c.perfume_preferences}</span></Info>}
              {c.notes && <Info label="Notas"><span className="whitespace-pre-line">{c.notes}</span></Info>}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Conversas</h2>
          <form onSubmit={onAddNote} className="mb-4 flex flex-col gap-2">
            <TextArea label="Nova nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que se falou com o cliente?" />
            <Button type="submit" variant="secundario" loading={busy} disabled={!note.trim()} className="self-start">Registar nota</Button>
          </form>
          {notes.length === 0 ? (
            <p className="text-sm text-texto-suave">Ainda não há conversas registadas.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-creme p-3">
                  <p className="text-xs text-texto-suave">{formatDateTime(n.created_at)} · {person(n.created_by)}</p>
                  <p className="mt-1 whitespace-pre-line">{n.body}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {(referred.length > 0 || coupons.length > 0) && (
          <Card>
            {referred.length > 0 && (
              <>
                <h2 className="mb-3 font-semibold">Clientes que indicou</h2>
                <ul className="mb-4 flex flex-col gap-1">
                  {referred.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <Link className="text-vinho underline-offset-4 hover:underline" href={`/clientes/ficha?id=${r.id}`}>
                        <ClientName code={r.code} name={r.name} />
                      </Link>
                      <Badge tone={r.bought ? "dourado" : "cinza"}>{r.bought ? "Já comprou" : "Ainda não comprou"}</Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {coupons.length > 0 && (
              <>
                <h2 className="mb-3 font-semibold">Cupões activos</h2>
                <ul className="flex flex-col gap-1">
                  {coupons.map((cp) => (
                    <li key={cp.id} className="flex justify-between gap-2">
                      <span className="font-mono">{cp.code}</span>
                      <span>{Number(cp.percent)}% · válido até {formatDate(cp.expires_at)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        )}

        {me.role === "ceo" && (
          <Card>
            <h2 className="mb-1 font-semibold">Protecção de dados</h2>
            <p className="mb-3 text-sm text-texto-suave">A pedido do cliente (Lei n.º 22/11): exportar ou apagar os seus dados pessoais.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secundario" onClick={() => void onExport()}>Exportar dados</Button>
              <Button variant="perigo" onClick={() => void onErase()}>Apagar dados</Button>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

export default function FichaClientePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FichaInner />
    </Suspense>
  );
}
