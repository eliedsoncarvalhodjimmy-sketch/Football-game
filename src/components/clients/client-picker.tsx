"use client";

import { useId, useMemo, useState } from "react";
import { EMPTY_FILTERS, filterClients, sortByCode, type ClientRow } from "@/lib/clients/filters";
import { ClientName } from "./client-name";

/** Escolher um cliente por código ou nome (ex.: "Indicado por"). */
export function ClientPicker({
  label,
  rows,
  value,
  onChange,
  excludeId,
  error,
}: {
  label: string;
  rows: ClientRow[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
  error?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const selected = rows.find((r) => r.client.id === value)?.client;
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return sortByCode(filterClients(rows, { ...EMPTY_FILTERS, search: query }))
      .filter((r) => r.client.id !== excludeId)
      .slice(0, 6);
  }, [rows, query, excludeId]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-vinho-escuro">{label}</label>
      {selected ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-linha bg-white px-3">
          <ClientName code={selected.code} tempCode={selected.temp_code} name={selected.name} />
          <button type="button" className="min-h-11 px-2 text-sm font-semibold text-vinho" onClick={() => onChange("")}>Retirar</button>
        </div>
      ) : (
        <>
          <input
            id={id}
            type="search"
            placeholder="Código ou nome"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-11 rounded-xl border border-linha bg-white px-3 text-base outline-none focus:border-vinho"
          />
          {results.length > 0 && (
            <ul className="rounded-xl border border-linha bg-white" role="listbox" aria-label={`Resultados para ${label}`}>
              {results.map((r) => (
                <li key={r.client.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="flex min-h-11 w-full items-center px-3 text-left hover:bg-creme"
                    onClick={() => {
                      onChange(r.client.id);
                      setQuery("");
                    }}
                  >
                    <ClientName code={r.client.code} tempCode={r.client.temp_code} name={r.client.name} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && results.length === 0 && <p className="text-xs text-texto-suave">Nenhum cliente encontrado.</p>}
        </>
      )}
      {error && <p className="text-xs text-erro">{error}</p>}
    </div>
  );
}
