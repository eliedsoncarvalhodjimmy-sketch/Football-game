import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { carregarDados, type Dados } from '../src/data/load.ts';
import { construirMundo, type World } from '../src/engine/world.ts';

const RAIZ = new URL('../packs/', import.meta.url).pathname;
let cache: Dados | null = null;

export async function dados(): Promise<Dados> {
  if (!cache) cache = await carregarDados(new LocalFileSource(RAIZ));
  return cache;
}

export async function mundo(semente = 2026): Promise<World> {
  // Recarrega para não partilhar objectos de clubes entre mundos.
  const d = await carregarDados(new LocalFileSource(RAIZ));
  return construirMundo(d, { semente, modo: 'teste' });
}
