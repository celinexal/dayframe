const DAYFRAME_CACHE = 'dayframe-shell-v5';
const DAYFRAME_SHELL = ['/', '/manifest.webmanifest', '/dayframe-icon.svg', '/assets/dayframe-2026-polish.js', '/assets/dayframe-news-sources.js', '/assets/dayframe-remove-panels.js'];
const DAYFRAME_POLISH_SRC = '/assets/dayframe-2026-polish.js?v=20260826-news';
const DAYFRAME_NEWS_SRC = '/assets/dayframe-news-sources.js?v=20260826-remove-panels';
const DAYFRAME_REMOVE_PANELS_SRC = '/assets/dayframe-remove-panels.js?v=20260826';
const DAYFRAME_POLISH_MARKER = 'data-dayframe-polish-loader';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(DAYFRAME_CACHE)
      .then(cache => cache.addAll(DAYFRAME_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('dayframe-shell-') && key !== DAYFRAME_CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function withPolish(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('text/html')) return response;

  let body = await response.text();
  const tags = [];
  if (!body.includes('dayframe-2026-polish.js')) {
    tags.push(`<script ${DAYFRAME_POLISH_MARKER} src="${DAYFRAME_POLISH_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-news-sources.js')) {
    tags.push(`<script data-dayframe-news-source-loader src="${DAYFRAME_NEWS_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-remove-panels.js')) {
    tags.push(`<script data-dayframe-remove-panels-loader src="${DAYFRAME_REMOVE_PANELS_SRC}" defer></script>`);
  }
  if (tags.length) {
    const markup = tags.join('');
    body = /<\/body>/i.test(body) ? body.replace(/<\/body>/i, `${markup}</body>`) : body + markup;
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          caches.open(DAYFRAME_CACHE).then(cache => cache.put('/', copy));
        }
        return withPolish(response);
      } catch {
        const cached = await caches.match('/');
        return cached ? withPolish(cached) : cached;
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(DAYFRAME_CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    }))
  );
});