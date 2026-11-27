// Ícones (os mesmos do protótipo).
export const ICON: Record<string, string> = {
  inicio: '<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  plantel: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
  escritorio: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  jogador: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/>',
  tactica: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/><circle cx="12" cy="12" r="3"/>',
  mercado: '<path d="M4 7h16l-1.5 12h-13z"/><path d="M8 7a4 4 0 0 1 8 0"/>',
  financas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  guardar: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
  imprensa: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  classificacao: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  infra: '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>',
  staff: '<circle cx="12" cy="6" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/><path d="M9 13l3 3 3-3"/>',
  academia: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  env: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  seta: '<path d="M9 6l6 6-6 6"/>',
  troca: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  livre: '<circle cx="10" cy="8" r="3.5"/><path d="M4 20c0-3.3 2.7-6 6-6 1.6 0 3 .6 4.1 1.6M17 14v6M14 17h6"/>',
  liga: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',
  taca: '<path d="M7 3h10v4a5 5 0 0 1-10 0z"/><path d="M12 12v5M8 21h8M9 17h6"/>',
  cont: '<path d="M12 2l2.9 6.2 6.6.6-5 4.5 1.5 6.6L12 16.6 6 19.9l1.5-6.6-5-4.5 6.6-.6z"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  som: '<path d="M4 9v6h4l5 5V4L8 9z"/><path d="M17 8.5a5 5 0 0 1 0 7"/><path d="M19.5 6a8 8 0 0 1 0 12"/>',
  somMudo: '<path d="M4 9v6h4l5 5V4L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
};

export const svg = (k: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] ?? ''}</svg>`;

/** Escudo gerado com as duas cores do clube. */
export const escudo = (cores: [string, string], w = 34) => `<svg class="escudo" viewBox="0 0 34 38" width="${w}" aria-hidden="true"><path d="M17 1 L32 6 V18 C32 28 25 34 17 37 C9 34 2 28 2 18 V6 Z" fill="${cores[0]}" stroke="${cores[1]}" stroke-width="2"/><path d="M17 1 V37" stroke="${cores[1]}" stroke-width="5" opacity=".55"/></svg>`;
