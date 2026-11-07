import Image from "next/image";
import type { ReactNode } from "react";

/** Moldura dos ecrãs de entrada e troca de palavra-passe. */
export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image src="/brand/vertical-vinho-dourado.png" alt="Smell — Cuidamos de si!" width={180} height={143} priority />
        </div>
        <div className="rounded-[var(--radius-cartao)] border border-linha bg-superficie p-6 shadow-sm">
          <h1 className="mb-5 text-xl font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
