import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconInicio = (p: P) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></svg>
);
export const IconClientes = (p: P) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></svg>
);
export const IconVendas = (p: P) => (
  <svg {...base} {...p}><path d="M5 7h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 7Z" /><path d="M9 7V5.5a3 3 0 0 1 6 0V7" /></svg>
);
export const IconProdutos = (p: P) => (
  <svg {...base} {...p}><path d="M9 3h6v3H9z" /><path d="M10 6v2.5" /><path d="M14 6v2.5" /><rect x="6" y="8.5" width="12" height="12.5" rx="3" /><path d="M9 14h6" /></svg>
);
export const IconMais = (p: P) => (
  <svg {...base} {...p}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>
);
export const IconOffline = (p: P) => (
  <svg {...base} {...p}><path d="M2 8.5a15 15 0 0 1 4.3-2.6" /><path d="M10 4.6A15 15 0 0 1 22 8.5" /><path d="M5 12a10 10 0 0 1 3.5-2" /><path d="M14 9.7A10 10 0 0 1 19 12" /><path d="M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1" /><path d="m3 3 18 18" /></svg>
);
