"use client";

import { useSyncExternalStore } from "react";
import { IconOffline } from "./icons";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/**
 * Indicador de ligação. Aparece só quando não há internet.
 * O número de alterações pendentes (fila de sincronização) é ligado no passo 1I.
 */
export function ConnectionStatus({ pending = 0 }: { pending?: number }) {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online && pending === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-vinho-escuro px-4 py-2 text-sm font-medium text-creme"
    >
      {!online && <IconOffline className="h-4 w-4" />}
      <span>
        {online ? "A sincronizar" : "Offline"}
        {pending > 0 && ` · ${pending} ${pending === 1 ? "alteração pendente" : "alterações pendentes"}`}
      </span>
    </div>
  );
}
