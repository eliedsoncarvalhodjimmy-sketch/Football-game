// Contas locais (3, predispostas no ecrã de entrada) e perfis de jogo por conta. Só separam perfis e gravações num
// aparelho partilhado: não é segurança a sério. As palavras-passe não estão no código: compara-se o SHA-256 de
// "futceo:<utilizador em minúsculas>:<palavra-passe>" com o de src/config/perfis.ts.
import { CONTAS } from '../config/perfis.ts';

export interface PerfilJogo {
  nome: string;
  nascimento: string;
  nacionalidade: string;
  perfilDono: string;
  /** Foto (data URL, 256 px), só neste aparelho. */
  foto: string | null;
}

export const contas = () => CONTAS.map((c) => ({ id: c.utilizador.toLowerCase(), nome: c.utilizador }));

/** SHA-256 (hex): crypto.subtle quando existe; senão, implementação em JS (páginas sem contexto seguro). */
export async function sha256(t: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    try {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
    } catch { /* cai para a versão em JS */ }
  }
  return sha256js(t);
}

export function sha256js(txt: string): string {
  const K: number[] = [], H: number[] = [];
  const primo = (n: number) => { for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  const fr = (x: number) => ((x - Math.floor(x)) * 2 ** 32) >>> 0;
  for (let n = 2, k = 0; k < 64; n++) if (primo(n)) { if (k < 8) H[k] = fr(n ** 0.5); K[k++] = fr(n ** (1 / 3)); }
  const b = [...new TextEncoder().encode(txt)], l = b.length * 8;
  b.push(0x80);
  while (b.length % 64 !== 56) b.push(0);
  for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
  const r = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < b.length; o += 64) {
    const w: number[] = [];
    for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    [a, bb, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) >>> 0));
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}

/** Verifica a palavra-passe de uma conta. */
export async function entrar(conta: string, palavraPasse: string): Promise<boolean> {
  const c = CONTAS.find((x) => x.utilizador.toLowerCase() === conta);
  return !!c && (await sha256(`futceo:${conta}:${palavraPasse}`)) === c.hash;
}

const chave = (conta: string) => `futceo.perfil.${conta}`;
export function lerPerfil(conta: string): PerfilJogo | null {
  try { return JSON.parse(localStorage.getItem(chave(conta)) ?? 'null'); } catch { return null; }
}
export function gravarPerfil(conta: string, p: PerfilJogo) {
  try { localStorage.setItem(chave(conta), JSON.stringify(p)); } catch { /* sem armazenamento: o perfil dura só esta sessão */ }
}
