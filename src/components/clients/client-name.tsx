import { formatClientCode } from "@/lib/format";

/** Código antes do nome, em todo o lado (C4). */
export function ClientName({ code, tempCode, name, className = "" }: { code: number | null; tempCode?: string | null; name: string; className?: string }) {
  return (
    <span className={className}>
      <span className="mr-1.5 font-mono text-sm text-texto-suave">{code !== null ? formatClientCode(code) : (tempCode ?? "—")}</span>{" "}
      <span>{name}</span>
    </span>
  );
}

/** Selo dourado do Embaixador. */
export function AmbassadorSeal() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-dourado px-2.5 py-0.5 text-xs font-semibold text-vinho-escuro" title="Embaixador Smell">
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden fill="currentColor"><path d="m12 2 2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" /></svg>
      Embaixador
    </span>
  );
}
