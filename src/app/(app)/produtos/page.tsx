import type { Metadata } from "next";
import { ComingStep } from "@/components/coming-step";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Produtos" };

export default function ProdutosPage() {
  return (
    <>
      <PageHeader title="Produtos" />
      <ComingStep step="1E" what="Produtos, variações, preços e stock" />
    </>
  );
}
