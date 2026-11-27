// Prompt 11, Bloco 5: liga os dois clubes de um jogo aos seus escudos reais, por `public/escudos/escudos.json`
// (gerado por `scripts/cutscene/gerar-escudos.ts`, ver Bloco 2). Sem manifesto, sem entrada para o clube, ou erro
// de rede: fica `null` para esse clube — a cena usa o escudo genérico (`src/cutscene/escudo.ts`), nunca lança.
import { carregarImagens } from './imagens.ts';
import type { EscudosCena } from './cenas/comum.ts';

let manifestoCache: Promise<Record<string, string>> | null = null;

function carregarManifesto(baseUrl: string): Promise<Record<string, string>> {
  if (!manifestoCache) manifestoCache = fetch(`${baseUrl}escudos/escudos.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return manifestoCache;
}

/** Os escudos reais do clube de casa e do adversário (por id), já carregados; `baseUrl` é o prefixo do sítio
 *  (ex.: `import.meta.env.BASE_URL`). */
export async function carregarEscudosReais(casaId: string, foraId: string, baseUrl = ''): Promise<EscudosCena> {
  const manifesto = await carregarManifesto(baseUrl);
  const ficheiroCasa = manifesto[casaId], ficheiroFora = manifesto[foraId];
  const urlCasa = ficheiroCasa ? `${baseUrl}escudos/${ficheiroCasa}` : null;
  const urlFora = ficheiroFora ? `${baseUrl}escudos/${ficheiroFora}` : null;
  const urls = [urlCasa, urlFora].filter((u): u is string => u !== null);
  if (!urls.length) return { casa: null, fora: null };
  const carregadas = await carregarImagens(urls);
  return { casa: urlCasa ? carregadas.get(urlCasa) ?? null : null, fora: urlFora ? carregadas.get(urlFora) ?? null : null };
}
