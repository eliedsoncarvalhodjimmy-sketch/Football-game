// Service worker mínimo: offline-first (cache dos ficheiros pedidos).
const CACHE = 'futceo-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Dados de referência da calibração (data/referencia/): nunca entram na cache (nem no jogo).
  if (new URL(e.request.url).pathname.includes('/data/referencia/')) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      const rede = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || rede;
    }),
  );
});
