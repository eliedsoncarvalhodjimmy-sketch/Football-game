import { describe, expect, it } from "vitest";
import { saleErrorMessage } from "./api";

describe("saleErrorMessage", () => {
  it("mantém as mensagens do servidor em português", () => {
    expect(saleErrorMessage("Os pagamentos ultrapassam o total da venda.")).toBe("Os pagamentos ultrapassam o total da venda.");
    expect(saleErrorMessage("“Paga 1, leva 2” precisa de pelo menos 2 perfumes na venda.")).toMatch(/2 perfumes/);
  });
  it("traduz erros técnicos", () => {
    expect(saleErrorMessage("TypeError: Failed to fetch")).toMatch(/Sem ligação/);
    expect(saleErrorMessage("new row violates row-level security policy")).toMatch(/permissão/);
    expect(saleErrorMessage("syntax error at or near")).toBe("Não foi possível gravar a venda. Tente de novo.");
  });
});
