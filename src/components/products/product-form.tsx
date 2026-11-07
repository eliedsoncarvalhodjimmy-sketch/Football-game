"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Checkbox, Field, Notice, Select, TextArea } from "@/components/ui";
import { formatKz, formatPercent } from "@/lib/format";
import { toCents } from "@/lib/money";
import { compressImage } from "@/lib/products/image";
import { addStockMovement, removeProductPhoto, saveProduct, uploadProductPhoto } from "@/lib/products/api";
import { CATEGORIES, newVariantForm, suggestSku, unitMargin, validateProductForm, type ProductForm as Form, type VariantForm } from "@/lib/products/model";
import { ProductPhoto } from "./product-photo";

const MAX_PHOTOS = 4;

function MarginPreview({ price, cost }: { price: string; cost: string }) {
  const p = toCents(price);
  const c = toCents(cost);
  if (p === null || c === null || p <= 0) return null;
  const m = unitMargin(p, c);
  return (
    <p className={`text-xs ${m.cents < 0 ? "text-erro" : "text-texto-suave"}`}>
      Margem (cliente final): {formatKz(m.cents / 100)} ({formatPercent(m.percent)})
    </p>
  );
}

export function ProductForm({
  productId,
  initial,
  otherSkus,
  onSaved,
}: {
  productId: string | null;
  initial: Form;
  otherSkus: string[];
  onSaved: (id: string) => void;
}) {
  const [form, setForm] = useState<Form>(initial);
  const [draftId] = useState(() => productId ?? crypto.randomUUID());
  const [initialStock, setInitialStock] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirmWarnings, setConfirmWarnings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Qualquer alteração obriga a voltar a confirmar os avisos
  const touched = () => {
    setConfirmWarnings(false);
    setWarnings([]);
  };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    touched();
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setVariant = (i: number, patch: Partial<VariantForm>) => {
    touched();
    setForm((f) => ({ ...f, variants: f.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));
  };

  function skusExcept(i: number): string[] {
    return [...otherSkus, ...form.variants.filter((_, j) => j !== i).map((v) => v.sku)];
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!navigator.onLine) return setErrors(["Precisa de internet para enviar fotos."]);
    setPhotoBusy(true);
    setErrors([]);
    try {
      const blob = await compressImage(file);
      const path = await uploadProductPhoto(draftId, blob);
      set("photoPaths", [...form.photoPaths, path]);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Não foi possível enviar a foto."]);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = validateProductForm(form, true, otherSkus);
    if (!r.ok) {
      setErrors(r.errors);
      setWarnings([]);
      return;
    }
    setErrors([]);
    if (r.value.warnings.length && !confirmWarnings) {
      setWarnings(r.value.warnings);
      setConfirmWarnings(true);
      return;
    }
    setBusy(true);
    try {
      const id = await saveProduct(productId ?? draftId, r.value, !productId);
      for (const v of form.variants.filter((x) => x.isNew)) {
        const q = Number((initialStock[v.id] ?? "").trim());
        if (Number.isInteger(q) && q > 0) await addStockMovement(v.id, "entrada", q, "Stock inicial");
      }
      onSaved(id);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Não foi possível guardar."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {errors.length > 0 && (
        <Notice kind="erro">
          <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </Notice>
      )}
      {warnings.length > 0 && (
        <Notice>
          <p className="font-semibold">Confirme antes de guardar:</p>
          <ul className="list-disc pl-4">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          <p className="mt-1">Se estiver certo, carregue outra vez em Guardar.</p>
        </Notice>
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">Perfume</h2>
        <Field label="Nome *" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marca" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          <Select label="Categoria *" value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>
        <TextArea label="Descrição" value={form.description} onChange={(e) => set("description", e.target.value)} hint="Notas olfactivas, ocasiões de uso…" />
        <div>
          <p className="mb-2 text-sm font-medium text-vinho-escuro">Fotos (até {MAX_PHOTOS})</p>
          <div className="flex flex-wrap items-center gap-3">
            {form.photoPaths.map((p) => (
              <div key={p} className="flex flex-col items-center gap-1">
                <ProductPhoto path={p} alt={form.name} size={80} />
                <button
                  type="button"
                  className="min-h-11 text-xs font-semibold text-erro"
                  onClick={() => {
                    set("photoPaths", form.photoPaths.filter((x) => x !== p));
                    void removeProductPhoto(p);
                  }}
                >
                  Retirar
                </button>
              </div>
            ))}
            {form.photoPaths.length < MAX_PHOTOS && (
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-linha text-center text-xs font-semibold text-vinho">
                {photoBusy ? "A enviar…" : "+ Foto"}
                <input type="file" accept="image/*" className="sr-only" disabled={photoBusy} onChange={(e) => void onPhoto(e.target.files?.[0])} />
              </label>
            )}
          </div>
          <p className="mt-1 text-xs text-texto-suave">As fotos são reduzidas no telemóvel antes de enviar, para poupar dados.</p>
        </div>
        <Checkbox label="Produto activo (aparece nas vendas)" checked={form.active} onChange={(v) => set("active", v)} />
      </Card>

      {form.variants.map((v, i) => (
        <Card key={v.id} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Variação {i + 1}{v.label ? ` — ${v.label}` : ""}</h2>
            {v.isNew && form.variants.length > 1 && (
              <Button type="button" variant="texto" className="text-erro" onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}>Retirar</Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Variação * (ex.: 50 ml)" value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="Código (SKU) *" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} />
              </div>
              <Button type="button" variant="secundario" onClick={() => setVariant(i, { sku: suggestSku(form.name, v.label, skusExcept(i)) })}>Sugerir</Button>
            </div>
            <Field label="Preço cliente final (Kz) *" inputMode="decimal" value={v.priceRetail} onChange={(e) => setVariant(i, { priceRetail: e.target.value })} />
            <Field label="Preço revendedor (Kz) *" inputMode="decimal" value={v.priceReseller} onChange={(e) => setVariant(i, { priceReseller: e.target.value })} />
            <div className="flex flex-col gap-1">
              <Field label="Preço de custo (Kz) * — só o CEO vê" inputMode="decimal" value={v.cost} onChange={(e) => setVariant(i, { cost: e.target.value })} />
              <MarginPreview price={v.priceRetail} cost={v.cost} />
            </div>
            <Field label="Stock mínimo (alerta)" inputMode="numeric" value={v.minStock} onChange={(e) => setVariant(i, { minStock: e.target.value })} />
            <Field label="Duração estimada (dias)" inputMode="numeric" hint="Para o lembrete de reposição (Fase 2)." value={v.replenishDays} onChange={(e) => setVariant(i, { replenishDays: e.target.value })} />
            {v.isNew && (
              <Field label="Stock inicial" inputMode="numeric" hint="Opcional: regista logo uma entrada de mercadoria." value={initialStock[v.id] ?? ""} onChange={(e) => setInitialStock({ ...initialStock, [v.id]: e.target.value })} />
            )}
          </div>
          {!v.isNew && <Checkbox label="Variação activa" checked={v.active} onChange={(val) => setVariant(i, { active: val })} />}
        </Card>
      ))}

      <Button type="button" variant="secundario" className="self-start" onClick={() => set("variants", [...form.variants, newVariantForm(crypto.randomUUID())])}>
        + Adicionar variação
      </Button>
      <Button type="submit" loading={busy} className="self-start">{confirmWarnings && warnings.length ? "Guardar mesmo assim" : "Guardar produto"}</Button>
    </form>
  );
}
