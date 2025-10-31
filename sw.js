const APP_VERSION = 'v16';
const CACHE = 'cabwizz-cache-' + APP_VERSION;
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => {
        if (k.startsWith('cabwizz-cache-') && k !== CACHE) {
          return caches.delete(k);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(res => {
      return res || fetch(req).then(networkRes => {
        return caches.open(CACHE).then(c => {
          c.put(req, networkRes.clone());
          return networkRes;
        });
      });
    })
  );
});

// respond to version requests
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({
      type: 'VERSION',
      version: APP_VERSION,
      cache: CACHE
    });
  }
});
