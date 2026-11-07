import type { Metadata } from "next";
import { ComingStep } from "@/components/coming-step";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Vendas" };

export default function VendasPage() {
  return (
    <>
      <PageHeader title="Vendas" />
      <ComingStep step="1F" what="Nova venda, descontos, cupões e pontos" />
    </>
  );
}
