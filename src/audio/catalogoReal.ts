// Prompt 10, Bloco 2: carrega `public/audio/audio.json` (escrito por `scripts/audio/preparar.ts`) e dá um `Catalogo`
// (a interface que o `AudioManager` já espera) que resolve ids para ficheiros em `public/audio/`. Manifesto em
// falta, vazio ou inválido: devolve o catálogo vazio (tudo em silêncio) — nunca lança.
import { CATALOGO_VAZIO, type Catalogo, type ItemCatalogo } from './tipos.ts';

/** `baseUrl` é o prefixo do sítio (ex.: `import.meta.env.BASE_URL`). */
export async function carregarCatalogoReal(baseUrl = ''): Promise<Catalogo> {
  try {
    const r = await fetch(`${baseUrl}audio/audio.json`);
    if (!r.ok) return CATALOGO_VAZIO;
    const itens = (await r.json()) as ItemCatalogo[];
    const mapa = new Map(itens.map((i) => [i.id, { ...i, ficheiro: `${baseUrl}audio/${i.ficheiro}` }]));
    return { obter: (id) => mapa.get(id) };
  } catch {
    return CATALOGO_VAZIO;
  }
}
