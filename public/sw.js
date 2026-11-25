const CACHE_NAME = 'ads2pub-static-v1';
const OFFLINE_URL = '/offline.html';

// Only cache public, non-sensitive static shell assets.
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isSafeStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  // Never cache API calls, tracking redirects, auth endpoints, or authenticated HTML pages.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/t/') ||
    url.pathname.startsWith('/send/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/publisher') ||
    url.pathname.startsWith('/traffic')
  ) {
    return false;
  }
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/offline.html' ||
    /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Navigation requests: network-only with honest offline fallback page (never serve cached private HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Only cache verified public static assets
  if (isSafeStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        });
      })
    );
  }
});

