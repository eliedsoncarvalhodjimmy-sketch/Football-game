import { ComingStep } from "@/components/coming-step";
import { PageHeader } from "@/components/page-header";

export default function InicioPage() {
  return (
    <>
      <PageHeader title="Início" subtitle="Cuidamos de si!" />
      <ComingStep step="1C" what="Entrada com email e palavra-passe, perfis CEO e Vendedor" />
    </>
  );
}
