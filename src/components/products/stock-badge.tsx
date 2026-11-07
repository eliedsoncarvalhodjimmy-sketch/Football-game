import { stockStatus } from "@/lib/products/stock";

export function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const s = stockStatus(stock, minStock);
  const styles = {
    esgotado: "bg-erro text-white",
    baixo: "bg-dourado text-vinho-escuro",
    ok: "bg-creme text-vinho-escuro",
  }[s];
  const text = s === "esgotado" ? (stock < 0 ? `Stock ${stock}` : "Esgotado") : s === "baixo" ? `Stock baixo: ${stock}` : `${stock} em stock`;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{text}</span>;
}
