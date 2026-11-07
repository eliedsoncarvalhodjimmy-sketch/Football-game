/**
 * Definições que o CEO pode ajustar na Fase 1 (Parte C3).
 * Cada definição tem um interruptor (activo) e campos. Os valores ficam na tabela "settings".
 * As definições da Fase 2 (lembretes, metas, comissões, silêncio) já existem na base de dados,
 * mas só aparecem neste ecrã quando passarem a ter efeito.
 */

export type FieldKind = "inteiro" | "kz" | "percentagem" | "texto" | "sim_nao" | "escolha";

export interface FieldDef {
  path: (string | number)[];
  label: string;
  kind: FieldKind;
  hint?: string;
  min?: number;
  max?: number;
  optional?: boolean;
  options?: { value: string; label: string }[];
}

export interface SettingDef {
  key: string;
  group: "Fidelização" | "Vendas" | "Empresa (recibo)";
  title: string;
  description: string;
  canDisable: boolean;
  fields: FieldDef[];
}

export const SETTINGS_CATALOG: SettingDef[] = [
  {
    key: "fidelidade.pontos",
    group: "Fidelização",
    title: "Pontos de fidelidade",
    description: "Pontos ganhos com compras pagas (valor depois dos descontos) e trocados por descontos.",
    canDisable: true,
    fields: [
      { path: ["kz_por_ponto"], label: "Kz pagos por cada ponto", kind: "kz", min: 1 },
      { path: ["minimo_troca"], label: "Mínimo de pontos para trocar", kind: "inteiro", min: 1 },
      { path: ["expiram"], label: "Os pontos expiram", kind: "sim_nao" },
      { path: ["validade_dias"], label: "Validade dos pontos (dias)", kind: "inteiro", min: 1, optional: true, hint: "Só conta se os pontos expirarem." },
      { path: ["escaloes", 0, "pontos"], label: "Escalão 1 — pontos", kind: "inteiro", min: 1 },
      { path: ["escaloes", 0, "valor"], label: "Escalão 1 — desconto", kind: "percentagem", min: 1, max: 100 },
      { path: ["escaloes", 1, "pontos"], label: "Escalão 2 — pontos", kind: "inteiro", min: 1 },
      { path: ["escaloes", 1, "valor"], label: "Escalão 2 — desconto", kind: "percentagem", min: 1, max: 100 },
      { path: ["escaloes", 2, "pontos"], label: "Escalão 3 (paga 1, leva 2) — pontos", kind: "inteiro", min: 1 },
      {
        path: ["escaloes", 2, "item_gratis"],
        label: "Escalão 3 — perfume oferecido",
        kind: "escolha",
        options: [
          { value: "menor_valor", label: "O de menor valor" },
          { value: "maior_valor", label: "O de maior valor" },
        ],
      },
    ],
  },
  {
    key: "fidelidade.cupao_indicacao",
    group: "Fidelização",
    title: "Cupões de indicação",
    description: "Quem indica um cliente recebe um cupão quando a 1.ª compra do indicado estiver paga.",
    canDisable: true,
    fields: [
      { path: ["percentagem"], label: "Desconto do cupão", kind: "percentagem", min: 1, max: 100 },
      { path: ["validade_dias"], label: "Validade (dias)", kind: "inteiro", min: 1 },
    ],
  },
  {
    key: "fidelidade.embaixador",
    group: "Fidelização",
    title: "Embaixador automático",
    description: "Etiqueta Embaixador atribuída automaticamente.",
    canDisable: true,
    fields: [{ path: ["minimo_indicados_que_compraram"], label: "Indicados que compraram", kind: "inteiro", min: 1 }],
  },
  {
    key: "vendas.tecto_custo",
    group: "Vendas",
    title: "Tecto de desconto (nunca abaixo do custo)",
    description: "Nenhum item fica abaixo do preço de custo, mesmo com cupões, pontos e descontos.",
    canDisable: true,
    fields: [],
  },
  {
    key: "vendas.prazo_divida_dias",
    group: "Vendas",
    title: "Prazo de pagamento por defeito",
    description: "Data limite proposta para vendas a crédito.",
    canDisable: false,
    fields: [{ path: ["dias"], label: "Dias", kind: "inteiro", min: 1, max: 365 }],
  },
  {
    key: "empresa",
    group: "Empresa (recibo)",
    title: "Dados da Smell",
    description: "Aparecem no recibo em PDF.",
    canDisable: false,
    fields: [
      { path: ["nome"], label: "Nome", kind: "texto" },
      { path: ["lema"], label: "Lema", kind: "texto", optional: true },
      { path: ["nif"], label: "NIF", kind: "texto", optional: true },
      { path: ["morada"], label: "Morada", kind: "texto", optional: true },
      { path: ["telefone"], label: "Telefone", kind: "texto", optional: true },
      { path: ["iban"], label: "IBAN", kind: "texto", optional: true },
    ],
  },
];

export function getAt(obj: unknown, path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[p];
  }
  return cur;
}

export function setAt<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  const base: Record<string | number, unknown> = Array.isArray(obj)
    ? [...(obj as unknown[])] as unknown as Record<number, unknown>
    : { ...((obj ?? {}) as Record<string, unknown>) };
  base[head] = setAt(base[head], rest, value);
  return base as T;
}

/** Converte o texto escrito no formulário no valor a guardar; devolve erro em português. */
export function parseFieldInput(def: FieldDef, raw: string | boolean): { ok: true; value: unknown } | { ok: false; error: string } {
  if (def.kind === "sim_nao") return { ok: true, value: raw === true };
  const text = String(raw).trim();
  if (def.kind === "texto") {
    if (!text && !def.optional) return { ok: false, error: `${def.label}: obrigatório.` };
    return { ok: true, value: text };
  }
  if (def.kind === "escolha") {
    if (!def.options?.some((o) => o.value === text)) return { ok: false, error: `${def.label}: escolha inválida.` };
    return { ok: true, value: text };
  }
  if (!text) {
    if (def.optional) return { ok: true, value: null };
    return { ok: false, error: `${def.label}: obrigatório.` };
  }
  const n = Number(text.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return { ok: false, error: `${def.label}: tem de ser um número.` };
  if ((def.kind === "inteiro" || def.kind === "kz") && !Number.isInteger(n)) {
    return { ok: false, error: `${def.label}: tem de ser um número inteiro.` };
  }
  if (def.min !== undefined && n < def.min) return { ok: false, error: `${def.label}: mínimo ${def.min}.` };
  if (def.max !== undefined && n > def.max) return { ok: false, error: `${def.label}: máximo ${def.max}.` };
  return { ok: true, value: n };
}

/** Regras que envolvem vários campos ao mesmo tempo. */
export function crossCheck(key: string, value: unknown): string | null {
  if (key === "fidelidade.pontos") {
    const min = Number(getAt(value, ["minimo_troca"]));
    const tiers = [0, 1, 2].map((i) => Number(getAt(value, ["escaloes", i, "pontos"])));
    if (!(tiers[0] < tiers[1] && tiers[1] < tiers[2])) return "Os escalões têm de ter pontos crescentes.";
    if (tiers[0] < min) return "O primeiro escalão não pode ter menos pontos do que o mínimo para trocar.";
  }
  return null;
}
