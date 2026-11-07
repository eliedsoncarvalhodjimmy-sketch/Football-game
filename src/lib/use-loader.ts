"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Carrega dados de forma assíncrona e permite recarregar.
 * `fn` deve ser estável (useCallback) e devolver os dados (ou lançar erro).
 */
export function useLoader<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    fn().then(
      (data) => active && setState({ data, error: null }),
      (e: unknown) => active && setState((s) => ({ data: s.data, error: e instanceof Error ? e.message : String(e) })),
    );
    return () => {
      active = false;
    };
  }, [fn, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data: state.data, error: state.error, reload };
}
