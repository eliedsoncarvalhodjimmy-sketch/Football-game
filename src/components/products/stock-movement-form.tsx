"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Notice } from "@/components/ui";
import { addStockMovement } from "@/lib/products/api";
import { validateMovement, type ManualMovement } from "@/lib/products/stock";

export function StockMovementForm({ variantId, type, onDone, onCancel }: { variantId: string; type: ManualMovement; onDone: (msg: string) => void; onCancel: () => void }) {
  const [qty, setQty] = useState("");
  const [direction, setDirection] = useState<"mais" | "menos">("menos");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = validateMovement(type, qty, direction, reason);
    if (!r.ok) return setError(r.error);
    if (!navigator.onLine) return setError("Precisa de internet para registar movimentos de stock (o modo offline chega no passo 1I).");
    setBusy(true);
    try {
      await addStockMovement(variantId, type, r.quantity, r.reason);
      onDone(type === "entrada" ? `Entrada de ${r.quantity} registada.` : `Ajuste de ${r.quantity > 0 ? "+" : ""}${r.quantity} registado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3 rounded-xl border border-linha bg-white p-3" noValidate>
      <p className="font-semibold text-vinho-escuro">{type === "entrada" ? "Entrada de mercadoria" : "Ajuste de stock"}</p>
      {error && <Notice kind="erro">{error}</Notice>}
      {type === "ajuste" && (
        <div className="flex gap-2" role="radiogroup" aria-label="Sentido do ajuste">
          {(["menos", "mais"] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => setDirection(d)}
              className={`min-h-11 flex-1 rounded-full border-2 px-3 text-sm font-semibold ${direction === d ? "border-vinho bg-vinho text-creme" : "border-linha text-vinho-escuro"}`}
            >
              {d === "menos" ? "Retirar (perda, partido…)" : "Acrescentar (contagem)"}
            </button>
          ))}
        </div>
      )}
      <Field label="Quantidade" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
      <Field label={type === "ajuste" ? "Motivo *" : "Observação (fornecedor, factura…)"} value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2">
        <Button type="submit" loading={busy}>Registar</Button>
        <Button type="button" variant="texto" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
