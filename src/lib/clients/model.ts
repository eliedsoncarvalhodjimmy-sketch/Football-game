import { normalizeWhatsapp } from "./whatsapp";

export type ClientType = "cliente_final" | "revendedor" | "empresa";
export type FunnelStage = "contacto" | "follow_up" | "proposta" | "fechamento" | "pos_venda";

export const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: "cliente_final", label: "Cliente final" },
  { value: "revendedor", label: "Revendedor" },
  { value: "empresa", label: "Empresa" },
];

export const FUNNEL_STAGES: { value: FunnelStage; label: string }[] = [
  { value: "contacto", label: "Contacto" },
  { value: "follow_up", label: "Follow-up" },
  { value: "proposta", label: "Proposta" },
  { value: "fechamento", label: "Fechamento" },
  { value: "pos_venda", label: "Pós-venda" },
];

export const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function clientTypeLabel(t: ClientType): string {
  return CLIENT_TYPES.find((x) => x.value === t)?.label ?? t;
}
export function stageLabel(s: FunnelStage): string {
  return FUNNEL_STAGES.find((x) => x.value === s)?.label ?? s;
}

export interface Client {
  id: string;
  code: number | null;
  temp_code: string | null;
  name: string;
  whatsapp: string;
  address: string;
  birthday_day: number | null;
  birthday_month: number | null;
  occupation: string;
  client_type: ClientType;
  seller_id: string | null;
  funnel_stage: FunnelStage;
  referred_by: string | null;
  consent: boolean;
  consent_at: string | null;
  consent_by: string | null;
  opt_out: boolean;
  opt_out_at: string | null;
  notes: string;
  perfume_preferences: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  erased_at: string | null;
}

export interface ClientSummary {
  client_id: string;
  last_purchase_at: string | null;
  days_without_purchase: number | null;
  total_spent: number | string;
  open_debt: number | string;
  points: number;
  active_coupons: number;
  referrals_who_bought: number;
}

/** O que o formulário envia (texto tal como escrito). */
export interface ClientFormInput {
  name: string;
  whatsapp: string;
  address: string;
  birthdayDay: string;
  birthdayMonth: string;
  occupation: string;
  clientType: ClientType;
  sellerId: string;
  funnelStage: FunnelStage;
  referredBy: string;
  consent: boolean;
  optOut: boolean;
  notes: string;
  perfumePreferences: string;
}

export type ClientRecord = Pick<
  Client,
  | "name" | "whatsapp" | "address" | "birthday_day" | "birthday_month" | "occupation" | "client_type"
  | "seller_id" | "funnel_stage" | "referred_by" | "consent" | "opt_out" | "notes" | "perfume_preferences"
>;

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 29/02 permitido (sem ano)

export type ValidationResult = { ok: true; value: ClientRecord } | { ok: false; errors: Partial<Record<keyof ClientFormInput, string>> };

/** Valida e converte o formulário de cliente. */
export function validateClientForm(input: ClientFormInput, selfId?: string): ValidationResult {
  const errors: Partial<Record<keyof ClientFormInput, string>> = {};
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Indique o nome do cliente.";
  if (name.length > 120) errors.name = "Nome demasiado longo.";

  const wa = normalizeWhatsapp(input.whatsapp);
  if (!wa.ok) errors.whatsapp = wa.error;

  let day: number | null = null;
  let month: number | null = null;
  if (input.birthdayDay || input.birthdayMonth) {
    day = Number(input.birthdayDay);
    month = Number(input.birthdayMonth);
    if (!input.birthdayDay || !input.birthdayMonth) {
      errors.birthdayDay = "Indique o dia e o mês do aniversário (ou deixe ambos em branco).";
    } else if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.birthdayMonth = "Mês inválido.";
    } else if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_MONTH[month - 1]) {
      errors.birthdayDay = `O mês de ${MONTHS[month - 1]} não tem dia ${input.birthdayDay}.`;
    }
  }

  if (selfId && input.referredBy === selfId) errors.referredBy = "Um cliente não pode indicar-se a si próprio.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      whatsapp: wa.ok ? wa.value : "",
      address: input.address.trim(),
      birthday_day: day,
      birthday_month: month,
      occupation: input.occupation.trim(),
      client_type: input.clientType,
      seller_id: input.sellerId || null,
      funnel_stage: input.funnelStage,
      referred_by: input.referredBy || null,
      consent: input.consent,
      opt_out: input.optOut,
      notes: input.notes.trim(),
      perfume_preferences: input.perfumePreferences.trim(),
    },
  };
}

/** Código temporário para clientes criados sem internet (o servidor dá o código final). */
export function makeTempCode(id: string): string {
  return `TEMP-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function emptyClientForm(sellerId: string): ClientFormInput {
  return {
    name: "", whatsapp: "", address: "", birthdayDay: "", birthdayMonth: "", occupation: "",
    clientType: "cliente_final", sellerId, funnelStage: "contacto", referredBy: "",
    consent: false, optOut: false, notes: "", perfumePreferences: "",
  };
}

export function clientToForm(c: Client): ClientFormInput {
  return {
    name: c.name, whatsapp: c.whatsapp, address: c.address,
    birthdayDay: c.birthday_day ? String(c.birthday_day) : "",
    birthdayMonth: c.birthday_month ? String(c.birthday_month) : "",
    occupation: c.occupation, clientType: c.client_type, sellerId: c.seller_id ?? "",
    funnelStage: c.funnel_stage, referredBy: c.referred_by ?? "", consent: c.consent, optOut: c.opt_out,
    notes: c.notes, perfumePreferences: c.perfume_preferences,
  };
}
