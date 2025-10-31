// ------- CabWizz SW (cache + offline) -------
const CACHE_NAME = 'cabwizz-cache-v16';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  // add icons here if you add them to the project:
  // 'icons/icon-192.png',
  // 'icons/icon-512.png',
];

// INSTALL: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ACTIVATE: remove old versions, claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('cabwizz-cache-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH: strategy matrix
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // 1) Navigations → network-first + offline fallback
  if (sameOrigin && req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((c) => c.put('index.html', copy))
          );
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // 2) Same-origin static assets → stale-while-revalidate
  if (sameOrigin && ['script','style','image','font','document'].includes(req.destination)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchAndUpdate = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              event.waitUntil(
                caches.open(CACHE_NAME).then((c) => c.put(req, copy))
              );
            }
            return res;
          })
          .catch(() => cached || Promise.reject('offline'));
        return cached || fetchAndUpdate;
      })
    );
    return;
  }

  // 3) Everything else → network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (sameOrigin && res && res.ok) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((c) => c.put(req, copy)));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
