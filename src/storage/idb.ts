// Gravações no browser (IndexedDB): várias ranhuras; cada época é gravada à
// parte (gravação incremental), comprimida com gzip (CompressionStream).
import type { RegistoEpoca } from '../engine/history.ts';
import { serializarHistorico, desserializarHistorico } from './serializar.ts';

const BD = 'futceo';
const LOJA = 'epocas';

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function comprimir(b: Uint8Array): Promise<Blob> {
  return new Response(new Blob([b as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
}

async function descomprimir(b: Blob): Promise<Uint8Array> {
  return new Uint8Array(await new Response(b.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}

export async function guardarEpoca(ranhura: string, r: RegistoEpoca): Promise<void> {
  const db = await abrir();
  const dados = await comprimir(serializarHistorico([r]));
  await new Promise<void>((ok, erro) => {
    const tx = db.transaction(LOJA, 'readwrite');
    tx.objectStore(LOJA).put(dados, `${ranhura}/${r.epoca}`);
    tx.oncomplete = () => ok();
    tx.onerror = () => erro(tx.error);
  });
}

export async function lerRanhura(ranhura: string): Promise<RegistoEpoca[]> {
  const db = await abrir();
  const pares = await new Promise<[string, Blob][]>((ok, erro) => {
    const out: [string, Blob][] = [];
    const tx = db.transaction(LOJA, 'readonly');
    const req = tx.objectStore(LOJA).openCursor(IDBKeyRange.bound(`${ranhura}/`, `${ranhura}/￿`));
    req.onsuccess = () => {
      const c = req.result;
      if (c) { out.push([String(c.key), c.value as Blob]); c.continue(); } else ok(out);
    };
    req.onerror = () => erro(req.error);
  });
  const out: RegistoEpoca[] = [];
  for (const [, b] of pares.sort((x, y) => x[0].localeCompare(y[0]))) out.push(...desserializarHistorico(await descomprimir(b)));
  return out;
}

export async function listarRanhuras(): Promise<string[]> {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const tx = db.transaction(LOJA, 'readonly');
    const req = tx.objectStore(LOJA).getAllKeys();
    req.onsuccess = () => ok([...new Set(req.result.map((k) => String(k).split('/')[0]))]);
    req.onerror = () => erro(req.error);
  });
}
