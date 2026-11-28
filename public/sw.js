// Service worker mínimo: offline-first (cache dos ficheiros pedidos).
const CACHE = 'futceo-v1';
// Prompt 10, Bloco 5: o áudio fica numa cache à parte, cache-first (não volta a pedir à rede uma vez guardado) e
// com limite e limpeza — nunca pré-cacheia o pacote todo na instalação, só `mus_menu` (o resto só quando é usado).
const CACHE_AUDIO = 'futceo-audio-v1';
const LIMITE_AUDIO_BYTES = 30 * 1024 * 1024;
const PRE_CACHE_AUDIO = ['audio/audio.json', 'audio/mus_menu.mp3'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_AUDIO).then((c) => Promise.all(
      PRE_CACHE_AUDIO.map((p) => fetch(p).then((r) => (r.ok ? c.put(p, r) : null)).catch(() => null)),
    )),
  );
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

/** Apaga as entradas mais antigas da cache de áudio até caber no orçamento (nunca apaga `mus_menu`, pré-cacheado). */
async function limparCacheAudio(c) {
  const chaves = await c.keys();
  const pesos = await Promise.all(chaves.map(async (req) => {
    const res = await c.match(req);
    return { req, tam: Number(res?.headers.get('content-length') ?? 0) };
  }));
  let total = pesos.reduce((s, p) => s + p.tam, 0);
  for (const p of pesos) {
    if (total <= LIMITE_AUDIO_BYTES) break;
    if (p.req.url.endsWith('mus_menu.mp3')) continue;
    await c.delete(p.req);
    total -= p.tam;
  }
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Dados de referência da calibração (data/referencia/): nunca entram na cache (nem no jogo).
  if (url.pathname.includes('/data/referencia/')) return;
  const ehAudio = url.pathname.includes('/audio/');
  e.respondWith(
    caches.open(ehAudio ? CACHE_AUDIO : CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      if (ehAudio && hit) return hit; // cache-first: um som já guardado nunca volta a pedir à rede
      const rede = fetch(e.request).then(async (r) => {
        if (r.ok) { await c.put(e.request, r.clone()); if (ehAudio) await limparCacheAudio(c); }
        return r;
      }).catch(() => hit);
      return hit || rede;
    }),
  );
});
