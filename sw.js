// CabWizz Fare Estimator — Service Worker v3.4 (R1/R2/R3 tuned)
const CACHE = 'cabwizz-cache-v34'; // bump this each release
const ASSETS = [
  './',
  'index.html',
  'sw.js',
  'manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((res) => {
        return res || fetch(event.request).then((networkRes) => {
          const copy = networkRes.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return networkRes;
        }).catch(() => caches.match('index.html'));
      })
    );
  }
});
