// ------- CabWizz SW (cache + offline) -------
// 🔁 Bump BOTH of these together for a new release:
const APP_VERSION = 'v16';
const CACHE_NAME  = `cabwizz-cache-${APP_VERSION}`;

const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  // add icons here if you add them:
  // 'icons/icon-192.png',
  // 'icons/icon-512.png',
];

// INSTALL: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

// ACTIVATE: remove old caches, claim clients
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

// FETCH: offline strategies
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // Navigations → network-first, fallback to cached index
  if (sameOrigin && req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((c) => c.put('index.html', copy)));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Same-origin static → stale-while-revalidate
  if (sameOrigin && ['script','style','image','font','document'].includes(req.destination)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchAndUpdate = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              event.waitUntil(caches.open(CACHE_NAME).then((c) => c.put(req, copy)));
            }
            return res;
          })
          .catch(() => cached || Promise.reject('offline'));
        return cached || fetchAndUpdate;
      })
    );
    return;
  }

  // Everything else → network-first with cache fallback
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

// 👉 Version messaging: page asks; SW replies with version & cache
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: APP_VERSION, cache: CACHE_NAME });
  }
});
