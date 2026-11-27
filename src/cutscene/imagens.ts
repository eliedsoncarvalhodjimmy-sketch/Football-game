// Prompt 11, Bloco 2: carregamento e cache das imagens (fotografias, logótipos, escudos). Quem chama decide quando
// ("só na véspera do dia europeu", Bloco 5) — este módulo só carrega e guarda em cache; uma imagem em falta nunca
// lança erro, resolve a `null` e a cena usa um fundo simples.
const cache = new Map<string, Promise<HTMLImageElement | null>>();

function carregarUma(url: string): Promise<HTMLImageElement | null> {
  let p = cache.get(url);
  if (p) return p;
  p = new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = url;
  });
  cache.set(url, p);
  return p;
}

/** Carrega várias imagens (por url) em paralelo; cada uma fica em cache. Nunca lança — as que falharem ficam `null`. */
export async function carregarImagens(urls: string[]): Promise<Map<string, HTMLImageElement | null>> {
  const resultados = await Promise.all(urls.map(async (u) => [u, await carregarUma(u)] as const));
  return new Map(resultados);
}

/** Liberta as imagens já carregadas (ex.: ao terminar a cutscene, como pede o Bloco 6 de desempenho). Só remove da
 *  cache deste módulo (se o navegador ainda tiver os bytes em cache HTTP, o próximo carregamento é rápido). */
export function libertarImagens(urls: string[]) { for (const u of urls) cache.delete(u); }

export const PASTA_CUTSCENE = 'cutscene/';
export const PASTA_ESCUDOS = 'escudos/';

/** Nomes dos ficheiros de uma competição (sem a pasta), tal como no protótipo. */
export const FICHEIROS_COMPETICAO = {
  champions: ['cl_estadio.jpg', 'cl_trofeu.jpg', 'cl_bola.png', 'cl_logo.png'],
  europa: ['el_trofeu.jpg', 'el_multidao.jpg', 'el_logo.png'],
} as const;
