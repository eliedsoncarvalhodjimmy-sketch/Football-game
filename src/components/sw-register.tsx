"use client";

import { useEffect } from "react";

/** Regista o service worker (só em produção, para não atrapalhar o desenvolvimento). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sem service worker a app continua a funcionar online; só perde o modo offline.
    });
  }, []);
  return null;
}
