const CACHE_NAME = 'sgq-pwa-v18-vercel';
const APP_SHELL = [
  '/',
  '/novo-relatorio',
  '/inspecoes',
  '/cronograma',
  '/relatorios',
  '/manifest.webmanifest',
  '/torque-template.xlsx',
  '/topography-template.xlsx',
  '/visual-solda-template.xlsx',
  '/liquido-penetrante-template.xlsx',
  '/fabrica-dimensional-template.xlsx',
  '/fabrica-lp-template.xlsx',
  '/fabrica-visual-solda-template.xlsx',
  '/template.docx',
  '/logo-1.jpeg',
  '/logo-2.png',
  '/icons/sgq-192.png',
  '/icons/sgq-512.png',
  '/icons/sgq-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // Arquivos versionados do Next.js, ícones e modelos: cache primeiro (não mudam sem trocar de nome/versão).
  const immutable = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || /\.(xlsx|docx|png|jpe?g|svg|webmanifest)$/.test(url.pathname);
  if (immutable) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }

  // Dados de tela do Next.js (RSC) e demais pedidos: rede primeiro, cópia local só sem internet.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || Response.error()))
  );
});
