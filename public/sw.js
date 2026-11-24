// public/sw.js - Pixelify Service Worker for offline resilience
const CACHE_NAME = 'pixelify-cache-v2';

// Static resources to cache on install for core offline availability
const PRECACHE_ASSETS = [
  '/',
  '/upscaler/',
  '/bg_remove/',
  '/blog/',
  '/about/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/products/',
  '/story/',
  '/docs/',
  '/offline.html',
  '/favicon.svg',
  '/favicon-192.png',
  '/apple-touch-icon.png',
  '/fonts/Minecrafter.Reg.ttf',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.debug('[SW] Precache skipped:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            // Retire only previous app-shell caches. LiteRT/ONNX model caches
            // live in Cache Storage too and must survive worker activation.
            if (key.startsWith('pixelify-cache-') && key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle HTTP/HTTPS GET requests; ignore chrome-extension or external protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-first with smart cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              // Also cache normalized pathname for exact offline matching
              cache.put(url.pathname, response.clone());
            });
          }
          return response;
        })
        .catch(async () => {
          // 1. Try exact request
          const cached = await caches.match(request);
          if (cached) return cached;

          // 2. Try normalized pathname
          const pathCached = await caches.match(url.pathname);
          if (pathCached) return pathCached;

          // 3. Try toggling trailing slash
          const pathname = url.pathname;
          const alternatePath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname + '/';
          const alternateCached = await caches.match(alternatePath);
          if (alternateCached) return alternateCached;

          // 4. Try index.html resolution
          const indexCached = await caches.match(pathname.replace(/\/$/, '') + '/index.html');
          if (indexCached) return indexCached;

          // 5. If root requested, return root
          if (pathname === '/' || pathname === '') {
            const rootCached = await caches.match('/');
            if (rootCached) return rootCached;
          }

          // 6. Safe fallback for uncached subpages: return offline.html (NEVER '/' which causes Next.js hydration crashes)
          const offlineFallback = await caches.match('/offline.html');
          if (offlineFallback) return offlineFallback;

          return new Response('Offline: Page not cached yet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 2. Next.js static assets, fonts, and scripts: Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // 3. All other requests: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
