import { fold } from "@/lib/clients/filters";
import { centsToDb, toCents } from "@/lib/money";

export const CATEGORIES = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "unissexo", label: "Unissexo" },
];

export function categoryLabel(v: string): string {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  photo_paths: string[];
  active: boolean;
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  label: string;
  photo_path: string | null;
  price_retail: string | number;
  price_reseller: string | number;
  min_stock: number;
  replenish_days: number;
  active: boolean;
}

export interface CatalogRow {
  variant_id: string;
  sku: string;
  product_id: string;
  product_name: string;
  brand: string;
  category: string;
  label: string;
  photo_path: string | null;
  price_retail: string | number;
  price_reseller: string | number;
  min_stock: number;
  replenish_days: number;
  stock: number;
  low_stock: boolean;
  active: boolean;
}

/** Formulário de uma variação (texto tal como escrito). */
export interface VariantForm {
  id: string; // UUID gerado no aparelho para variações novas
  isNew: boolean;
  sku: string;
  label: string;
  priceRetail: string;
  priceReseller: string;
  cost: string; // só o CEO vê/edita
  minStock: string;
  replenishDays: string;
  active: boolean;
  photoPath: string | null;
}

export interface ProductForm {
  name: string;
  brand: string;
  description: string;
  category: string;
  active: boolean;
  photoPaths: string[];
  variants: VariantForm[];
}

export interface VariantRecord {
  id: string;
  sku: string;
  label: string;
  price_retail: string;
  price_reseller: string;
  min_stock: number;
  replenish_days: number;
  active: boolean;
  photo_path: string | null;
}

export interface ProductRecord {
  product: Omit<Product, "id">;
  variants: VariantRecord[];
  costs: { variant_id: string; cost_price: string }[];
  warnings: string[];
}

export type ProductValidation = { ok: true; value: ProductRecord } | { ok: false; errors: string[] };

export function newVariantForm(id: string, defaults: Partial<VariantForm> = {}): VariantForm {
  return {
    id, isNew: true, sku: "", label: "", priceRetail: "", priceReseller: "", cost: "",
    minStock: "2", replenishDays: "60", active: true, photoPath: null, ...defaults,
  };
}

function intOrNull(s: string): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

/** Sugere um SKU a partir do nome e da variação: "Oud Real" + "100 ml" -> "OUDREA-100". */
export function suggestSku(name: string, label: string, taken: string[] = []): string {
  const letters = fold(name).replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const stem = (letters.length === 1 ? letters[0].slice(0, 6) : letters.map((w) => w.slice(0, 3)).join("").slice(0, 6)).toUpperCase() || "SML";
  const ml = (label.match(/\d+/) ?? [""])[0];
  const base = ml ? `${stem}-${ml}` : stem;
  const used = new Set(taken.map((t) => t.toUpperCase()));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}

/**
 * Valida o produto e as variações. `canSeeCost` = CEO.
 * Erros bloqueiam; avisos (ex.: preço abaixo do custo) só informam.
 */
export function validateProductForm(form: ProductForm, canSeeCost: boolean, otherSkus: string[] = []): ProductValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = form.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.push("Indique o nome do perfume.");
  if (!form.category) errors.push("Escolha a categoria.");
  if (form.variants.length === 0) errors.push("Adicione pelo menos uma variação (ex.: 50 ml).");

  const seen = new Set(otherSkus.map((s) => s.toUpperCase()));
  const variants: VariantRecord[] = [];
  const costs: ProductRecord["costs"] = [];
  form.variants.forEach((v, i) => {
    const tag = `Variação ${i + 1}${v.label.trim() ? ` (${v.label.trim()})` : ""}`;
    const sku = v.sku.trim().toUpperCase();
    if (!sku) errors.push(`${tag}: indique o código (SKU).`);
    else if (!/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(sku)) errors.push(`${tag}: o código só pode ter letras, números e hífenes.`);
    else if (seen.has(sku)) errors.push(`${tag}: o código ${sku} já existe.`);
    seen.add(sku);
    if (!v.label.trim()) errors.push(`${tag}: indique a variação (ex.: 50 ml).`);

    const retail = toCents(v.priceRetail);
    const reseller = toCents(v.priceReseller);
    if (retail === null || retail <= 0) errors.push(`${tag}: preço de cliente final inválido.`);
    if (reseller === null || reseller <= 0) errors.push(`${tag}: preço de revendedor inválido.`);
    if (retail !== null && reseller !== null && reseller > retail) warnings.push(`${tag}: o preço de revendedor é maior do que o de cliente final.`);

    let cost: number | null = null;
    if (canSeeCost) {
      cost = toCents(v.cost);
      if (cost === null || cost < 0) errors.push(`${tag}: preço de custo inválido.`);
      else if (reseller !== null && cost > reseller) warnings.push(`${tag}: o custo é maior do que o preço de revendedor (venda com prejuízo).`);
      else if (retail !== null && cost > retail) warnings.push(`${tag}: o custo é maior do que o preço de cliente final.`);
    }
    const minStock = intOrNull(v.minStock);
    if (minStock === null) errors.push(`${tag}: stock mínimo tem de ser um número inteiro.`);
    const days = intOrNull(v.replenishDays);
    if (days === null || days < 1) errors.push(`${tag}: duração estimada tem de ser um número de dias.`);

    if (retail !== null && reseller !== null && minStock !== null && days !== null && days > 0) {
      variants.push({
        id: v.id, sku, label: v.label.trim(), price_retail: centsToDb(retail), price_reseller: centsToDb(reseller),
        min_stock: minStock, replenish_days: days, active: v.active, photo_path: v.photoPath,
      });
      if (canSeeCost && cost !== null && cost >= 0) costs.push({ variant_id: v.id, cost_price: centsToDb(cost) });
    }
  });

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      product: { name, brand: form.brand.trim(), description: form.description.trim(), category: form.category, photo_paths: form.photoPaths, active: form.active },
      variants,
      costs,
      warnings,
    },
  };
}

/** Margem unitária (CEO): preço − custo, em cêntimos, e percentagem sobre o preço. */
export function unitMargin(priceCents: number, costCents: number): { cents: number; percent: number } {
  const cents = priceCents - costCents;
  return { cents, percent: priceCents > 0 ? Math.round((cents / priceCents) * 1000) / 10 : 0 };
}

export interface ProductFilters {
  search: string;
  category: string;
  lowOnly: boolean;
  showInactive: boolean;
}

export const EMPTY_PRODUCT_FILTERS: ProductFilters = { search: "", category: "", lowOnly: false, showInactive: false };

type FilterableProduct = Pick<Product, "name" | "brand" | "category" | "active"> & {
  variants: { sku: string; label: string; stock: number; min_stock: number; active: boolean }[];
};

/** Pesquisa por nome, marca, variação ou SKU; filtros de categoria, stock baixo e inactivos. */
export function filterProducts<T extends FilterableProduct>(products: T[], f: ProductFilters): T[] {
  const words = fold(f.search.trim()).split(/\s+/).filter(Boolean);
  return products.filter((p) => {
    if (!f.showInactive && !p.active) return false;
    if (f.category && p.category !== f.category) return false;
    const variants = f.showInactive ? p.variants : p.variants.filter((v) => v.active);
    if (f.lowOnly && !variants.some((v) => v.stock <= v.min_stock)) return false;
    if (words.length) {
      const hay = fold([p.name, p.brand, ...variants.map((v) => `${v.sku} ${v.label}`)].join(" "));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}
