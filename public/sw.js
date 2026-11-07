/*
 * Service worker do Smell CRM.
 * - Guarda o "esqueleto" da app (páginas, scripts, estilos, ícones) para abrir sem internet.
 * - Páginas: tenta a rede primeiro; sem rede, usa a cópia guardada.
 * - Ficheiros estáticos do Next (/_next/static) têm nome único por versão: cache primeiro.
 * - Pedidos à base de dados (Supabase) NUNCA passam por esta cache: os dados offline
 *   vivem no IndexedDB do dispositivo (passo 1I).
 */
const VERSION = "smell-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const SHELL_URLS = [
  "/", "/entrar", "/trocar-palavra-passe",
  "/clientes", "/clientes/novo", "/clientes/ficha", "/clientes/editar",
  "/vendas", "/produtos",
  "/mais", "/mais/conta", "/mais/definicoes", "/mais/utilizadores", "/mais/etiquetas",
  "/offline.html", "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(SHELL_URLS.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase e outros: sem cache aqui
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || (await caches.match("/")) || caches.match("/offline.html")),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|ico|woff2?|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Restantes pedidos (ex.: dados das rotas do Next): rede primeiro, cópia guardada se falhar.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
