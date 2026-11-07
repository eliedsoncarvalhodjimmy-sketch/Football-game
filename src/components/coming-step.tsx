/** Aviso temporário durante a construção da Fase 1 (desaparece quando o passo indicado estiver feito). */
export function ComingStep({ step, what }: { step: string; what: string }) {
  return (
    <div className="rounded-[var(--radius-cartao)] border border-dashed border-linha bg-superficie p-6 text-center">
      <p className="font-medium text-vinho-escuro">{what}</p>
      <p className="mt-1 text-sm text-texto-suave">Em construção — passo {step} da Fase 1.</p>
    </div>
  );
}
