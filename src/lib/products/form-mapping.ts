import { centsToInput, toCents } from "@/lib/money";
import type { ProductWithVariants } from "./api";
import { newVariantForm, type ProductForm } from "./model";

export function emptyProductForm(): ProductForm {
  return { name: "", brand: "Smell", description: "", category: "unissexo", active: true, photoPaths: [], variants: [newVariantForm(crypto.randomUUID())] };
}

export function productToForm(p: ProductWithVariants): ProductForm {
  return {
    name: p.name, brand: p.brand, description: p.description, category: p.category, active: p.active, photoPaths: p.photo_paths,
    variants: p.variants.map((v) => ({
      id: v.id, isNew: false, sku: v.sku, label: v.label,
      priceRetail: centsToInput(toCents(v.price_retail)), priceReseller: centsToInput(toCents(v.price_reseller)),
      cost: v.cost === null ? "" : centsToInput(toCents(v.cost)),
      minStock: String(v.min_stock), replenishDays: String(v.replenish_days), active: v.active, photoPath: v.photo_path,
    })),
  };
}
