const CACHE_NAME = 'zenbarber-subpath-20260727';
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/core.js',
  './js/bootstrap.js',
  './js/modules/auth.js',
  './js/modules/dashboard.js',
  './js/modules/components.js',
  './js/modules/cadastros.js',
  './js/modules/agenda.js',
  './js/modules/caixa.js',
  './js/modules/clientesfixos.js',
  './js/modules/relatorios.js',
  './js/modules/supportchat.js',
  './js/modules/admin.js',
  './js/modules/meunegocio.js',
  './js/modules/agendamentopublico.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => null))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Para HTML e JS/CSS, tenta buscar a versão nova primeiro. Se estiver offline, usa cache.
  if (request.mode === 'navigate' || /\.(html|js|css|json)$/i.test(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(new URL('./index.html', self.location).href)))
    );
    return;
  }

  // Ícones e imagens: cache primeiro para deixar a abertura mais rápida.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return response;
    }))
  );
});
