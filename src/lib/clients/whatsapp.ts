/**
 * Números de WhatsApp no formato internacional (E.164): +244923456789.
 * Aceita o que se escreve no dia-a-dia ("923 456 789", "00351 912...", "+244-923...").
 */

export const DEFAULT_COUNTRY_CODE = "244"; // Angola

export const E164_RE = /^\+[1-9][0-9]{6,14}$/;

export type WhatsappResult = { ok: true; value: string } | { ok: false; error: string };

export function normalizeWhatsapp(input: string, defaultCountry = DEFAULT_COUNTRY_CODE): WhatsappResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Indique o número de WhatsApp." };
  if (/[a-z]/i.test(raw)) return { ok: false, error: "O número só pode ter algarismos." };
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (digits.indexOf("+") > 0) return { ok: false, error: "Número inválido." };
  let value: string;
  if (digits.startsWith("+")) {
    value = digits;
  } else if (defaultCountry === "244" && digits.startsWith("244") && digits.length === 12) {
    value = "+" + digits;
  } else {
    value = "+" + defaultCountry + digits.replace(/^0+/, "");
  }
  if (!E164_RE.test(value)) return { ok: false, error: "Número inválido. Use o formato internacional, por exemplo +244 923 456 789." };
  if (value.startsWith("+244") && !/^\+2449\d{8}$/.test(value)) {
    return { ok: false, error: "Número angolano inválido: deve ter 9 algarismos e começar por 9." };
  }
  return { ok: true, value };
}

/** +244923456789 -> "+244 923 456 789" (só para mostrar). */
export function formatWhatsapp(value: string): string {
  const m = /^\+244(\d{3})(\d{3})(\d{3})$/.exec(value);
  if (m) return `+244 ${m[1]} ${m[2]} ${m[3]}`;
  return value;
}

/** Ligação para abrir a conversa no WhatsApp (sem mensagem; os modelos chegam na Fase 2). */
export function whatsappLink(value: string, text?: string): string {
  const base = `https://wa.me/${value.replace(/^\+/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
