import type { Metadata } from "next";
import { ComingStep } from "@/components/coming-step";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <>
      <PageHeader title="Clientes" />
      <ComingStep step="1D" what="Registo, pesquisa e ficha de clientes" />
    </>
  );
}
