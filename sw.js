// Bump this to force refresh after any change:
const CACHE = 'cabwizz-v7';

self.addEventListener('install', (e) => {
  const root = self.location.pathname.replace(/sw\.js$/, '');
  const assets = [ root, root + 'index.html', root + 'manifest.webmanifest' ];
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(assets)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e)=>{
  if (e.data && e.data.action === 'SKIP_WAITING') self.skipWaiting();
});

// Cache-first for same-origin GET; fall back to network
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then(hit => {
      const fetchPromise = fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return resp;
      }).catch(() => hit);
      return hit || fetchPromise;
    })
  );
});
