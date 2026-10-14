/**
 * MatiSathi Offline Service Worker
 * Caches app shell, tutor page (/matisathi), and core static assets.
 * Enables zero-signal offline usage for rural Class 9 students in Odisha.
 */

const CACHE_NAME = 'matisathi-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/learn',
  '/matisathi',
  '/manifest.json',
  '/openmaic-mark.png',
  '/logo-horizontal.png',
];

// Install: precache app shell and assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('[SW] Precache partial error (ignored for non-fatal assets):', err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate: purge stale caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch: Network-first for navigation with offline fallback; cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (APIs will be handled by IndexedDB offline queue)
  if (request.method !== 'GET') {
    return;
  }

  // Navigation requests (HTML pages like /matisathi)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback: serve cached /learn, /matisathi, or root
          const cached = await caches.match(request);
          if (cached) return cached;
          const learnFallback = await caches.match('/learn');
          if (learnFallback) return learnFallback;
          const fallback = await caches.match('/matisathi');
          if (fallback) return fallback;
          return caches.match('/');
        }),
    );
    return;
  }

  // Static assets (Next.js chunks, fonts, images)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Update in background if online (Stale-While-Revalidate)
          fetch(request)
            .then((res) => {
              if (res && res.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, res));
              }
            })
            .catch(() => {});
          return cached;
        }

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  );
});
