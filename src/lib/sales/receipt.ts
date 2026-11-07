import { formatClientCode, formatDate, formatDateTime, formatKz } from "@/lib/format";
import { methodLabel } from "./model";

export interface ReceiptCompany {
  nome?: string;
  lema?: string;
  nif?: string;
  morada?: string;
  telefone?: string;
  iban?: string;
}

export interface ReceiptData {
  company: ReceiptCompany;
  number: number;
  date: string;
  client: { code: number | null; name: string };
  seller: string;
  items: { name: string; quantity: number; unitPrice: string; discount: string; total: string; free: boolean }[];
  subtotal: string;
  couponDiscount: string;
  pointsDiscount: string;
  manualDiscount: string;
  total: string;
  payments: { date: string; method: string; amount: string }[];
  dueDate: string | null;
  cancelled: boolean;
}

export const RECEIPT_FOOTER = "Documento sem valor fiscal. Não substitui a factura.";

/** Texto do recibo, já formatado (separado do desenho para poder ser testado). */
export function receiptLines(d: ReceiptData) {
  const paid = d.payments.reduce((a, p) => a + Number(p.amount), 0);
  const balance = Math.max(Number(d.total) - paid, 0);
  const companyLines = [
    d.company.nif ? `NIF: ${d.company.nif}` : "",
    d.company.morada ?? "",
    d.company.telefone ? `Tel.: ${d.company.telefone}` : "",
    d.company.iban ? `IBAN: ${d.company.iban}` : "",
  ].filter(Boolean);
  const discounts = [
    Number(d.couponDiscount) > 0 ? { label: "Desconto do cupão", value: `- ${formatKz(d.couponDiscount)}` } : null,
    Number(d.pointsDiscount) > 0 ? { label: "Desconto de pontos", value: `- ${formatKz(d.pointsDiscount)}` } : null,
    Number(d.manualDiscount) > 0 ? { label: "Desconto", value: `- ${formatKz(d.manualDiscount)}` } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);
  return {
    title: `Recibo n.º ${String(d.number).padStart(4, "0")}`,
    companyName: d.company.nome || "Smell",
    tagline: d.company.lema || "Cuidamos de si!",
    companyLines,
    meta: [
      `Data: ${formatDateTime(d.date)}`,
      `Cliente: ${formatClientCode(d.client.code)} ${d.client.name}`,
      `Atendido por: ${d.seller}`,
    ],
    items: d.items.map((i) => ({
      name: i.free ? `${i.name} (oferta)` : i.name,
      quantity: String(i.quantity),
      unit: formatKz(i.unitPrice),
      total: formatKz(i.total),
    })),
    subtotal: formatKz(d.subtotal),
    discounts,
    total: formatKz(d.total),
    payments: d.payments.map((p) => `${formatDate(p.date)} · ${methodLabel(p.method)} · ${formatKz(p.amount)}`),
    paid: formatKz(paid),
    balance: formatKz(balance),
    balanceLine: balance > 0 ? `Saldo em dívida: ${formatKz(balance)}${d.dueDate ? ` (pagar até ${formatDate(d.dueDate)})` : ""}` : "Pago na totalidade.",
    cancelled: d.cancelled ? "VENDA CANCELADA" : "",
    footer: RECEIPT_FOOTER,
  };
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/brand/horizontal-vinho-dourado.png");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Gera e descarrega o PDF (no aparelho, funciona sem internet). */
export async function downloadReceipt(d: ReceiptData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const t = receiptLines(d);
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  const M = 12;
  const wine: [number, number, number] = [113, 0, 20];
  const dark: [number, number, number] = [76, 2, 11];
  let y = 12;

  const logo = await loadLogo();
  if (logo) {
    doc.addImage(logo, "PNG", M, y, 42, 13);
    y += 17;
  } else {
    doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...wine).text(t.companyName, M, y + 6);
    y += 12;
  }
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90, 80, 80);
  doc.text(t.tagline, M, y);
  y += 4;
  for (const l of t.companyLines) {
    doc.text(l, M, y);
    y += 3.6;
  }
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...dark).text(t.title, W - M, 18, { align: "right" });
  if (t.cancelled) doc.setTextColor(161, 18, 31).setFontSize(11).text(t.cancelled, W - M, 25, { align: "right" });

  y += 3;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40, 30, 30);
  for (const l of t.meta) {
    doc.text(l, M, y);
    y += 4.5;
  }

  y += 2;
  doc.setDrawColor(...wine).setLineWidth(0.4).line(M, y, W - M, y);
  y += 5;
  doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("Perfume", M, y);
  doc.text("Qtd.", W - M - 52, y, { align: "right" });
  doc.text("Preço", W - M - 28, y, { align: "right" });
  doc.text("Total", W - M, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "normal");
  for (const it of t.items) {
    const nameLines = doc.splitTextToSize(it.name, W - 2 * M - 62) as string[];
    doc.text(nameLines, M, y);
    doc.text(it.quantity, W - M - 52, y, { align: "right" });
    doc.text(it.unit, W - M - 28, y, { align: "right" });
    doc.text(it.total, W - M, y, { align: "right" });
    y += 4.2 * nameLines.length + 1;
  }
  doc.setDrawColor(220, 210, 180).line(M, y, W - M, y);
  y += 5;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, W - M - 45, y, { align: "right" });
    doc.text(value, W - M, y, { align: "right" });
    y += 4.5;
  };
  row("Subtotal", t.subtotal);
  for (const d2 of t.discounts) row(d2.label, d2.value);
  doc.setFontSize(11).setTextColor(...dark);
  row("Total", t.total, true);
  doc.setFontSize(9).setTextColor(40, 30, 30);

  if (t.payments.length) {
    y += 2;
    doc.setFont("helvetica", "bold").text("Pagamentos", M, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    for (const p of t.payments) {
      doc.text(p, M, y);
      y += 4.2;
    }
  }
  y += 2;
  doc.setFont("helvetica", "bold").text(t.balanceLine, M, y);

  const H = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(110, 90, 90);
  doc.text(t.footer, W / 2, H - 10, { align: "center" });
  doc.save(`smell-recibo-${String(d.number).padStart(4, "0")}.pdf`);
}
