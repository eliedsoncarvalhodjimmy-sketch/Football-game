import type { Metadata } from "next";
import { ComingStep } from "@/components/coming-step";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Mais" };

export default function MaisPage() {
  return (
    <>
      <PageHeader title="Mais" />
      <ComingStep step="1C" what="Definições, utilizadores e dívidas" />
    </>
  );
}
