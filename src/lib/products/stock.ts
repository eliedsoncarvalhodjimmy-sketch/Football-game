export type ManualMovement = "entrada" | "ajuste";

export const MOVEMENT_LABELS: Record<string, string> = {
  entrada: "Entrada de mercadoria",
  ajuste: "Ajuste",
  venda: "Venda",
  cancelamento: "Venda cancelada (devolução ao stock)",
};

export type MovementResult = { ok: true; quantity: number; reason: string } | { ok: false; error: string };

/**
 * Valida uma entrada ou ajuste. Entrada: quantidade positiva.
 * Ajuste: positivo (sobra) ou negativo (perda, frasco partido…), sempre com motivo.
 */
export function validateMovement(type: ManualMovement, quantityText: string, direction: "mais" | "menos", reason: string): MovementResult {
  const t = quantityText.trim();
  if (!/^\d+$/.test(t) || Number(t) === 0) return { ok: false, error: "Indique uma quantidade (número inteiro maior que zero)." };
  const n = Number(t);
  if (n > 10000) return { ok: false, error: "Quantidade demasiado grande." };
  const r = reason.trim();
  if (type === "ajuste" && r.length < 3) return { ok: false, error: "Explique o motivo do ajuste (ex.: frasco partido, contagem)." };
  const quantity = type === "entrada" ? n : direction === "menos" ? -n : n;
  return { ok: true, quantity, reason: r };
}

/** Situação do stock para mostrar ao utilizador. */
export function stockStatus(stock: number, minStock: number): "esgotado" | "baixo" | "ok" {
  if (stock <= 0) return "esgotado";
  if (stock <= minStock) return "baixo";
  return "ok";
}
