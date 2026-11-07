import { describe, expect, it } from "vitest";
import { RECEIPT_FOOTER, receiptLines, type ReceiptData } from "./receipt";

const data: ReceiptData = {
  company: { nome: "Smell", lema: "Cuidamos de si!", nif: "5000000000", morada: "Cuito, Bié", telefone: "+244 923 000 000", iban: "" },
  number: 12,
  date: "2026-11-07T10:00:00Z",
  client: { code: 7, name: "Ana Conceição" },
  seller: "Eliedson",
  items: [
    { name: "Oud Real 50 ml", quantity: 2, unitPrice: "30000.00", discount: "0", total: "60000.00", free: false },
    { name: "Acácia 30 ml", quantity: 1, unitPrice: "20000.00", discount: "20000.00", total: "0.00", free: true },
  ],
  subtotal: "80000.00",
  couponDiscount: "3000.00",
  pointsDiscount: "20000.00",
  manualDiscount: "0",
  total: "57000.00",
  payments: [{ date: "2026-11-07T10:00:00Z", method: "multicaixa_express", amount: "20000.00" }],
  dueDate: "2026-12-12",
  cancelled: false,
};

describe("recibo", () => {
  it("tem o número, o cliente com código e os dados da Smell preenchidos", () => {
    const t = receiptLines(data);
    expect(t.title).toBe("Recibo n.º 0012");
    expect(t.meta).toContain("Cliente: 0007 Ana Conceição");
    expect(t.companyLines).toEqual(["NIF: 5000000000", "Cuito, Bié", "Tel.: +244 923 000 000"]);
  });
  it("mostra descontos, oferta, pagamentos e saldo em Kz", () => {
    const t = receiptLines(data);
    expect(t.items[1].name).toBe("Acácia 30 ml (oferta)");
    expect(t.discounts.map((d) => d.label)).toEqual(["Desconto do cupão", "Desconto de pontos"]);
    expect(t.total).toBe("57 000,00 Kz");
    expect(t.payments[0]).toBe("07/11/2026 · Multicaixa Express · 20 000,00 Kz");
    expect(t.balanceLine).toBe("Saldo em dívida: 37 000,00 Kz (pagar até 12/12/2026)");
  });
  it("avisa que não tem valor fiscal (não é factura AGT)", () => {
    expect(receiptLines(data).footer).toBe(RECEIPT_FOOTER);
    expect(RECEIPT_FOOTER).toMatch(/sem valor fiscal/);
  });
  it("venda paga e venda cancelada", () => {
    const t = receiptLines({ ...data, payments: [{ date: data.date, method: "numerario", amount: "57000.00" }], cancelled: true });
    expect(t.balanceLine).toBe("Pago na totalidade.");
    expect(t.cancelled).toBe("VENDA CANCELADA");
  });
});

describe("compatibilidade com a fonte do PDF", () => {
  it("só usa caracteres que a fonte do PDF consegue desenhar (sem − nem espaços especiais)", () => {
    const t = receiptLines(data);
    const all = JSON.stringify(t);
    expect(all).not.toMatch(/[−  ]/);
  });
});
