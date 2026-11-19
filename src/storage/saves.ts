// Gravações (Prompt 5, Bloco A1): ranhuras por conta em IndexedDB. Cada gravação guarda o registo do jogo (semente,
// clube, perfil, semanas e comandos) e um resumo para a lista; carregar = reconstruir o jogo no worker.
// Sem IndexedDB (navegação privada, testes), as gravações ficam em memória durante a sessão.
import type { RegistoJogo } from '../jogo/sessao.ts';

export interface Gravacao {
  conta: string;
  ranhura: number;
  clube: string;
  cores: [string, string];
  liga: string;
  data: string;
  epoca: string;
  semanas: number;
  /** Momento da gravação (relógio do aparelho). */
  gravadoEm: number;
  automatica: boolean;
  registo: RegistoJogo;
}

const BD = 'futceo-gravacoes', LOJA = 'ranhuras';
const memoria = new Map<string, Gravacao>();
const chave = (conta: string, r: number) => `${conta}/${r}`;

function abrir(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((ok) => {
    try {
      const r = indexedDB.open(BD, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
}

async function tx<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await abrir();
  if (!db) return null;
  return new Promise((ok, erro) => {
    const t = db.transaction(LOJA, modo);
    const req = f(t.objectStore(LOJA));
    t.oncomplete = () => ok(req.result);
    t.onerror = () => erro(t.error);
  });
}

export async function guardar(g: Gravacao): Promise<void> {
  memoria.set(chave(g.conta, g.ranhura), g);
  await tx('readwrite', (s) => s.put(g, chave(g.conta, g.ranhura)));
}

export async function listar(conta: string): Promise<Gravacao[]> {
  const todas = (await tx('readonly', (s) => s.getAll() as IDBRequest<Gravacao[]>)) ?? [...memoria.values()];
  return todas.filter((g) => g.conta === conta).sort((a, b) => a.ranhura - b.ranhura);
}

export async function apagar(conta: string, ranhura: number): Promise<void> {
  memoria.delete(chave(conta, ranhura));
  await tx('readwrite', (s) => s.delete(chave(conta, ranhura)));
}

/** Primeira ranhura livre (1…n), ou null. */
export async function ranhuraLivre(conta: string, n: number): Promise<number | null> {
  const usadas = new Set((await listar(conta)).map((g) => g.ranhura));
  for (let r = 1; r <= n; r++) if (!usadas.has(r)) return r;
  return null;
}
