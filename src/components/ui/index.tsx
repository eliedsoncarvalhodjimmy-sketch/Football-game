"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";

type Variant = "primario" | "secundario" | "perigo" | "texto";

const variants: Record<Variant, string> = {
  primario: "bg-vinho text-creme hover:bg-vinho-escuro disabled:opacity-50",
  secundario: "border border-vinho text-vinho bg-superficie hover:bg-creme disabled:opacity-50",
  perigo: "border border-erro text-erro bg-superficie hover:bg-red-50 disabled:opacity-50",
  texto: "text-vinho underline-offset-4 hover:underline disabled:opacity-50",
};

export function Button({
  variant = "primario",
  className = "",
  loading = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 font-semibold transition-colors ${variants[variant]} ${className}`}
    >
      {loading ? "A processar…" : children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--radius-cartao)] border border-linha bg-superficie p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-vinho-escuro">
        {label}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-d` : undefined}
        className={`min-h-11 rounded-xl border bg-white px-3 text-base text-texto outline-none focus:border-vinho ${
          error ? "border-erro" : "border-linha"
        } ${props.className ?? ""}`}
      />
      {(error || hint) && (
        <p id={`${id}-d`} className={`text-xs ${error ? "text-erro" : "text-texto-suave"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-vinho-escuro">
        {label}
      </label>
      <select
        id={id}
        {...props}
        className="min-h-11 rounded-xl border border-linha bg-white px-3 text-base text-texto outline-none focus:border-vinho"
      >
        {children}
      </select>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="font-medium text-vinho-escuro">
          {label}
        </label>
        {description && <p className="text-xs text-texto-suave">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-vinho" : "bg-linha"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "erro" | "sucesso"; children: ReactNode }) {
  const styles = {
    info: "border-linha bg-superficie text-texto",
    erro: "border-erro/40 bg-red-50 text-erro",
    sucesso: "border-sucesso/40 bg-green-50 text-sucesso",
  }[kind];
  return (
    <div role={kind === "erro" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutro" }: { children: ReactNode; tone?: "neutro" | "vinho" | "dourado" | "cinza" }) {
  const styles = {
    neutro: "bg-creme text-vinho-escuro",
    vinho: "bg-vinho text-creme",
    dourado: "bg-dourado text-vinho-escuro",
    cinza: "bg-linha text-texto-suave",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{children}</span>;
}

export function Spinner({ label = "A carregar…" }: { label?: string }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-texto-suave">
      {label}
    </p>
  );
}

export function TextArea({
  label,
  hint,
  ...props
}: import("react").TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-vinho-escuro">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        {...props}
        className="rounded-xl border border-linha bg-white px-3 py-2 text-base text-texto outline-none focus:border-vinho"
      />
      {hint && <p className="text-xs text-texto-suave">{hint}</p>}
    </div>
  );
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3">
      <input id={id} type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#710014]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span className="font-medium text-vinho-escuro">{label}</span>
        {description && <span className="block text-xs text-texto-suave">{description}</span>}
      </label>
    </div>
  );
}
