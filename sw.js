const DAYFRAME_CACHE = 'dayframe-shell-v18';
const DAYFRAME_SHELL = ['/', '/manifest.webmanifest', '/dayframe-icon.svg', '/assets/dayframe-theory-session.js', '/assets/dayframe-2026-polish.js', '/assets/dayframe-news-sources.js', '/assets/dayframe-remove-panels.js', '/assets/dayframe-risk-holdings-fix.js', '/assets/dayframe-car-costs-merge.js', '/assets/dayframe-category-budget-focus.js', '/assets/dayframe-visual-tidy.js', '/assets/dayframe-visual-calm.js'];
const DAYFRAME_THEORY_SESSION_SRC = '/assets/dayframe-theory-session.js?v=20260827-theory-frame';
const DAYFRAME_POLISH_SRC = '/assets/dayframe-2026-polish.js?v=20260826-theory-guidance';
const DAYFRAME_NEWS_SRC = '/assets/dayframe-news-sources.js?v=20260826-remove-panels';
const DAYFRAME_REMOVE_PANELS_SRC = '/assets/dayframe-remove-panels.js?v=20260826-money-cleanup';
const DAYFRAME_RISK_FIX_SRC = '/assets/dayframe-risk-holdings-fix.js?v=20260827-current-holdings';
const DAYFRAME_CAR_COSTS_SRC = '/assets/dayframe-car-costs-merge.js?v=20260827-car-costs';
const DAYFRAME_CATEGORY_BUDGET_SRC = '/assets/dayframe-category-budget-focus.js?v=20260827-all-category-budgets';
const DAYFRAME_VISUAL_TIDY_SRC = '/assets/dayframe-visual-tidy.js?v=20260827-visual-tidy-fit';
const DAYFRAME_VISUAL_CALM_SRC = '/assets/dayframe-visual-calm.js?v=20260827-visual-calm';
const DAYFRAME_POLISH_MARKER = 'data-dayframe-polish-loader';
const DAYFRAME_DISMISSED_GUIDANCE_STYLE = '<style id="df-dismissed-guidance-style">#df-money-guidance,#df-invest-guidance{display:none!important}</style>';

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
  if (!body.includes('df-dismissed-guidance-style')) {
    tags.push(DAYFRAME_DISMISSED_GUIDANCE_STYLE);
  }
  if (!body.includes('dayframe-theory-session.js')) {
    tags.push(`<script data-dayframe-theory-session-loader src="${DAYFRAME_THEORY_SESSION_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-2026-polish.js')) {
    tags.push(`<script ${DAYFRAME_POLISH_MARKER} src="${DAYFRAME_POLISH_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-news-sources.js')) {
    tags.push(`<script data-dayframe-news-source-loader src="${DAYFRAME_NEWS_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-remove-panels.js')) {
    tags.push(`<script data-dayframe-remove-panels-loader src="${DAYFRAME_REMOVE_PANELS_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-risk-holdings-fix.js')) {
    tags.push(`<script data-dayframe-risk-holdings-fix-loader src="${DAYFRAME_RISK_FIX_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-car-costs-merge.js')) {
    tags.push(`<script data-dayframe-car-costs-merge-loader src="${DAYFRAME_CAR_COSTS_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-category-budget-focus.js')) {
    tags.push(`<script data-dayframe-category-budget-focus-loader src="${DAYFRAME_CATEGORY_BUDGET_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-visual-tidy.js')) {
    tags.push(`<script data-dayframe-visual-tidy-loader src="${DAYFRAME_VISUAL_TIDY_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-visual-calm.js')) {
    tags.push(`<script data-dayframe-visual-calm-loader src="${DAYFRAME_VISUAL_CALM_SRC}" defer></script>`);
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