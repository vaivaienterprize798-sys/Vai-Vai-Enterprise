// Installable PWA service worker.
// Network-first with fast timeout fallback so mobile devices never hang on a cold server or stalled network.
const CACHE = 'rsr-vaivai-v4';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u))))
      .catch(() => {})
      .finally(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function fetchWithTimeout(req, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(req, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Firebase / Google APIs

  // Skip Vite dev internals, API endpoints, and live version check probes
  const path = url.pathname;
  if (
    path.startsWith('/@') ||
    path.startsWith('/src/') ||
    path.startsWith('/node_modules/') ||
    path.startsWith('/__vite') ||
    path.startsWith('/api/') ||
    url.searchParams.has('v')
  ) {
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    const shellFallback = req.mode === 'navigate'
      ? (await caches.match('/')) || (await caches.match('/index.html'))
      : undefined;
    const hasFallback = Boolean(cached || shellFallback);

    // If we already have a cached copy, don't let mobile hang >3.5s waiting on a cold/slow server.
    const timeoutMs = hasFallback ? 3500 : 12000;

    try {
      const res = await fetchWithTimeout(req, timeoutMs);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }
      // If upstream returned 5xx/4xx while waking up and we have a cached copy, serve cache safely.
      if (cached) return cached;
      if (shellFallback) return shellFallback;
      return res;
    } catch (err) {
      if (cached) return cached;
      if (shellFallback) return shellFallback;
      throw err;
    }
  })());
});
