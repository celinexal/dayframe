const DAYFRAME_CACHE = 'dayframe-shell-v128';
const DAYFRAME_SHELL = ['/', '/manifest.webmanifest', '/dayframe-icon.svg', '/dayframe-icon-2026.svg', '/assets/dayframe-performance-guard.js', '/assets/dayframe-theory-session.js', '/assets/dayframe-2026-polish.js', '/assets/dayframe-news-sources.js', '/assets/dayframe-remove-panels.js', '/assets/dayframe-risk-holdings-fix.js', '/assets/dayframe-sector-themes-current.js', '/assets/dayframe-car-costs-merge.js', '/assets/dayframe-money-performance.js', '/assets/dayframe-bills-persistence-fix.js', '/assets/dayframe-bill-suggestions-restore.js', '/assets/dayframe-transactions-default-cleanup.js', '/assets/dayframe-visual-tidy.js', '/assets/dayframe-visual-calm.js', '/assets/dayframe-stock-etf-foundation.js', '/assets/dayframe-login-input-fix.js', '/assets/dayframe-standard-home.js', '/assets/dayframe-life-stage.js', '/assets/dayframe-essentials.js', '/assets/dayframe-essentials-cleanup.js', '/assets/dayframe-essentials-clickfix.js', '/assets/dayframe-essentials-customise.js', '/assets/dayframe-essentials-pill-left.js', '/assets/dayframe-myflo-calendar-actions.js', '/assets/dayframe-diary-delete-fix.js', '/assets/dayframe-brokers.js'];
const DAYFRAME_THEORY_SESSION_SRC = '/assets/dayframe-theory-session.js?v=20260827-theory-frame';
const DAYFRAME_PERFORMANCE_GUARD_SRC = '/assets/dayframe-performance-guard.js?v=20260901-performance-guard-v1';
const DAYFRAME_POLISH_SRC = '/assets/dayframe-2026-polish.js?v=20260831-polish-no-nav-wrap';
const DAYFRAME_NEWS_SRC = '/assets/dayframe-news-sources.js?v=20260826-remove-panels';
const DAYFRAME_REMOVE_PANELS_SRC = '/assets/dayframe-remove-panels.js?v=20260826-money-cleanup';
const DAYFRAME_RISK_FIX_SRC = '/assets/dayframe-risk-holdings-fix.js?v=20260827-current-holdings';
const DAYFRAME_SECTOR_THEMES_CURRENT_SRC = '/assets/dayframe-sector-themes-current.js?v=20260901-sector-clarity-v1';
const DAYFRAME_CAR_COSTS_SRC = '/assets/dayframe-car-costs-merge.js?v=20260831-car-costs-no-nav-wrap';
const DAYFRAME_MONEY_PERFORMANCE_SRC = '/assets/dayframe-money-performance.js?v=20260829-fast-money-v2';
const DAYFRAME_BILLS_PERSISTENCE_SRC = '/assets/dayframe-bills-persistence-fix.js?v=20260830-auto-paid-bills';
const DAYFRAME_BILL_SUGGESTIONS_RESTORE_SRC = '/assets/dayframe-bill-suggestions-restore.js?v=20260830-restore-bill-suggestions';
const DAYFRAME_TRANSACTIONS_CLEANUP_SRC = '/assets/dayframe-transactions-default-cleanup.js?v=20260827-default-transactions-clean-wide';
const DAYFRAME_VISUAL_TIDY_SRC = '/assets/dayframe-visual-tidy.js?v=20260829-defer-budget-overview';
const DAYFRAME_VISUAL_CALM_SRC = '/assets/dayframe-visual-calm.js?v=20260829-no-persistent-visual-observer';
const DAYFRAME_STOCK_ETF_FOUNDATION_SRC = '/assets/dayframe-stock-etf-foundation.js?v=20260903-stock-etf-examples-v6';
const DAYFRAME_BROKERS_SRC = '/assets/dayframe-brokers.js?v=20260903-brokers-always-hero-v6';
const DAYFRAME_LOGIN_INPUT_FIX_SRC = '/assets/dayframe-login-input-fix.js?v=20260829-ios-input-focus';
const DAYFRAME_STANDARD_HOME_SRC = '/assets/dayframe-standard-home.js?v=20260902-no-setup-card-v1';
const DAYFRAME_LIFE_STAGE_SRC = '/assets/dayframe-life-stage.js?v=20260831-essentials-life-v3';
const DAYFRAME_ESSENTIALS_SRC = '/assets/dayframe-essentials.js?v=20260831-essentials-customise-v20';
const DAYFRAME_ESSENTIALS_CLEANUP_SRC = '/assets/dayframe-essentials-cleanup.js?v=20260903-essentials-cleanup-v4';
const DAYFRAME_ESSENTIALS_CLICKFIX_SRC = '/assets/dayframe-essentials-clickfix.js?v=20260901-clickfix-v19';
const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC = '/assets/dayframe-essentials-customise.js?v=20260901-customise-v3';
const DAYFRAME_ESSENTIALS_MORE_SRC = '/assets/dayframe-essentials-more.js?v=20260901-essentials-more-v12';
const DAYFRAME_ESSENTIALS_PILL_LEFT_SRC = '/assets/dayframe-essentials-pill-left.js?v=20260831-pill-left-v1';
const DAYFRAME_MYFLO_CALENDAR_ACTIONS_SRC = '/assets/dayframe-myflo-calendar-actions.js?v=20260903-myflo-calendar-actions-disabled-v3';
const DAYFRAME_DIARY_DELETE_FIX_SRC = '/assets/dayframe-diary-delete-fix.js?v=20260830-diary-delete';
const DAYFRAME_POLISH_MARKER = 'data-dayframe-polish-loader';
const DAYFRAME_ESSENTIALS_BOOTSTRAP_MARKER = 'data-dayframe-essentials-cleanup-bootstrap';
const DAYFRAME_DISMISSED_GUIDANCE_STYLE = '<style id="df-dismissed-guidance-style">#df-money-guidance,#df-invest-guidance{display:none!important}</style>';
const DAYFRAME_DRIVING_COSTS_STYLE = '<style id="df-driving-costs-style">#pg-driving-costs,#df-car-costs-section,[data-driving-page="driving-costs"],[data-dayframe-polish="driving-costs-card"],.df-polish-nav-costs,[onclick*="driving-costs"]{display:none!important}</style>';
const DAYFRAME_INVESTING_CLEANUP_STYLE = '<style id="df-investing-cleanup-style">#pg-dashboard .dash-market-context,.dash-market-context{display:none!important}</style>';
const DAYFRAME_HOME_NO_SETUP_STYLE = '<style id="df-home-no-setup-style">#home-setup-card,#home-setup-nudge,.home-setup-card,.home-setup-nudge,.home-setup-step{display:none!important}</style>';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(DAYFRAME_CACHE)
      .then(cache => Promise.all(DAYFRAME_SHELL.map(url => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const stale = keys.filter(key => key.startsWith('dayframe-shell-') && key !== DAYFRAME_CACHE);
    await Promise.all(stale.map(key => caches.delete(key)));
    await self.clients.claim();
    // If this activation replaced an older shell cache, force every open
    // window/PWA to reload so it immediately runs the new HTML and assets.
    // Without this, a stale tab or installed app can keep showing old code
    // until it is fully closed — which people rarely do on mobile.
    if (stale.length) {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(windows.map(client => {
        try { return Promise.resolve(client.navigate(client.url)).catch(() => undefined); }
        catch (e) { return undefined; }
      }));
    }
  })());
});

function stripStalePanels(body) {
  if (typeof body !== 'string') return body;
  return body
    .replace(/<link rel="icon" href="\/dayframe-icon\.svg" type="image\/svg\+xml">/i, '<link rel="icon" href="/dayframe-icon-2026.svg" type="image/svg+xml">')
    .replace(/<link rel="apple-touch-icon" href="\/dayframe-icon\.svg">/i, '<link rel="apple-touch-icon" href="/dayframe-icon-2026.svg">')
    .replace(/<h1>\s*Everything\s*<\/h1>/i, '<h1>Everything that matters, without the mental clutter.</h1>')
    .replace(/<div class="pg life-page" id="pg-driving-costs"[\s\S]*?(?=<!-- DIARY -->)/i, '')
    .replace(/<div class="dash-card dash-market-context">[\s\S]*?<\/div>\s*<!-- ROW: Risk \+ Sectors \+ Research -->/i, '<!-- ROW: Risk + Sectors + Research -->')
    .replace(/Market context/g, 'Big picture')
    .replace(/<script[^>]*src="[^"]*dayframe-budget-(?:redesign|fixups|limits-editor|mobile-strip)\.js[^"]*"[^>]*><\/script>/gi, '')
    .replace(/<script[^>]*src="[^"]*dayframe-category-budget-focus\.js[^"]*"[^>]*><\/script>/gi, '');
}

function refreshScriptVersions(body) {
  if (typeof body !== 'string') return body;
  return body
    .replace(/\/assets\/dayframe-performance-guard\.js\?v=[^"']+/g, DAYFRAME_PERFORMANCE_GUARD_SRC)
    .replace(/\/assets\/dayframe-standard-home\.js\?v=[^"']+/g, DAYFRAME_STANDARD_HOME_SRC)
    .replace(/\/assets\/dayframe-life-stage\.js\?v=[^"']+/g, DAYFRAME_LIFE_STAGE_SRC)
    .replace(/\/assets\/dayframe-essentials\.js\?v=[^"']+/g, DAYFRAME_ESSENTIALS_SRC)
    .replace(/\/assets\/dayframe-essentials-cleanup\.js\?v=[^"']+/g, DAYFRAME_ESSENTIALS_CLEANUP_SRC)
    .replace(/\/assets\/dayframe-essentials-more\.js\?v=[^"']+/g, DAYFRAME_ESSENTIALS_MORE_SRC)
    .replace(/\/assets\/dayframe-essentials-clickfix\.js\?v=[^"']+/g, DAYFRAME_ESSENTIALS_CLICKFIX_SRC)
    .replace(/\/assets\/dayframe-essentials-customise\.js\?v=[^"']+/g, DAYFRAME_ESSENTIALS_CUSTOMISE_SRC)
    .replace(/\/assets\/dayframe-essentials-pill-left\.js\?v=[^"']+/g, DAYFRAME_ESSENTIALS_PILL_LEFT_SRC)
    .replace(/\/assets\/dayframe-myflo-calendar-actions\.js\?v=[^"']+/g, DAYFRAME_MYFLO_CALENDAR_ACTIONS_SRC)
    .replace(/\/assets\/dayframe-stock-etf-foundation\.js\?v=[^"']+/g, DAYFRAME_STOCK_ETF_FOUNDATION_SRC)
    .replace(/\/assets\/dayframe-brokers\.js\?v=[^"']+/g, DAYFRAME_BROKERS_SRC)
    .replace(/\/assets\/dayframe-sector-themes-current\.js\?v=[^"']+/g, DAYFRAME_SECTOR_THEMES_CURRENT_SRC);
}

async function withPolish(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('text/html')) return response;

  let body = refreshScriptVersions(stripStalePanels(await response.text()));
  const guardTag = `<script data-dayframe-performance-guard-loader src="${DAYFRAME_PERFORMANCE_GUARD_SRC}" defer></script>`;
  if (!body.includes('dayframe-performance-guard.js')) {
    body = /<script\b/i.test(body) ? body.replace(/<script\b/i, `${guardTag}<script`) : `${guardTag}${body}`;
  }
  const hasEssentialsBootstrap = body.includes(DAYFRAME_ESSENTIALS_BOOTSTRAP_MARKER);
  const tags = [];
  if (!body.includes('df-dismissed-guidance-style')) {
    tags.push(DAYFRAME_DISMISSED_GUIDANCE_STYLE);
  }
  if (!body.includes('df-driving-costs-style')) {
    tags.push(DAYFRAME_DRIVING_COSTS_STYLE);
  }
  if (!body.includes('df-investing-cleanup-style')) {
    tags.push(DAYFRAME_INVESTING_CLEANUP_STYLE);
  }
  if (!body.includes('df-home-no-setup-style')) {
    tags.push(DAYFRAME_HOME_NO_SETUP_STYLE);
  }
  if (!body.includes('dayframe-standard-home.js')) {
    tags.push(`<script data-dayframe-standard-home-loader src="${DAYFRAME_STANDARD_HOME_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-life-stage.js')) {
    tags.push(`<script data-dayframe-life-stage-loader src="${DAYFRAME_LIFE_STAGE_SRC}" defer></script>`);
  }
  if (!hasEssentialsBootstrap && !body.includes('dayframe-essentials.js')) {
    tags.push(`<script data-dayframe-essentials-loader src="${DAYFRAME_ESSENTIALS_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-essentials-cleanup.js')) {
    tags.push(`<script data-dayframe-essentials-cleanup-loader src="${DAYFRAME_ESSENTIALS_CLEANUP_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-essentials-clickfix.js')) {
    tags.push(`<script data-dayframe-essentials-clickfix-loader src="${DAYFRAME_ESSENTIALS_CLICKFIX_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-essentials-customise.js')) {
    tags.push(`<script data-dayframe-essentials-customise-loader src="${DAYFRAME_ESSENTIALS_CUSTOMISE_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-essentials-pill-left.js')) {
    tags.push(`<script data-dayframe-essentials-pill-left-loader src="${DAYFRAME_ESSENTIALS_PILL_LEFT_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-myflo-calendar-actions.js')) {
    tags.push(`<script data-dayframe-myflo-calendar-actions-loader src="${DAYFRAME_MYFLO_CALENDAR_ACTIONS_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-diary-delete-fix.js')) {
    tags.push(`<script data-dayframe-diary-delete-fix-loader src="${DAYFRAME_DIARY_DELETE_FIX_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-login-input-fix.js')) {
    tags.push(`<script data-dayframe-login-input-fix-loader src="${DAYFRAME_LOGIN_INPUT_FIX_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-bills-persistence-fix.js')) {
    tags.push(`<script data-dayframe-bills-persistence-loader src="${DAYFRAME_BILLS_PERSISTENCE_SRC}" defer></script>`);
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
  if (!body.includes('dayframe-sector-themes-current.js')) {
    tags.push(`<script data-dayframe-sector-themes-current-loader src="${DAYFRAME_SECTOR_THEMES_CURRENT_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-car-costs-merge.js')) {
    tags.push(`<script data-dayframe-car-costs-merge-loader src="${DAYFRAME_CAR_COSTS_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-money-performance.js')) {
    tags.push(`<script data-dayframe-money-performance-loader src="${DAYFRAME_MONEY_PERFORMANCE_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-bill-suggestions-restore.js')) {
    tags.push(`<script data-dayframe-bill-suggestions-restore-loader src="${DAYFRAME_BILL_SUGGESTIONS_RESTORE_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-transactions-default-cleanup.js')) {
    tags.push(`<script data-dayframe-transactions-default-cleanup-loader src="${DAYFRAME_TRANSACTIONS_CLEANUP_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-visual-tidy.js')) {
    tags.push(`<script data-dayframe-visual-tidy-loader src="${DAYFRAME_VISUAL_TIDY_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-visual-calm.js')) {
    tags.push(`<script data-dayframe-visual-calm-loader src="${DAYFRAME_VISUAL_CALM_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-stock-etf-foundation.js')) {
    tags.push(`<script data-dayframe-stock-etf-foundation-loader src="${DAYFRAME_STOCK_ETF_FOUNDATION_SRC}" defer></script>`);
  }
  if (!body.includes('dayframe-brokers.js')) {
    tags.push(`<script data-dayframe-brokers-loader src="${DAYFRAME_BROKERS_SRC}" defer></script>`);
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
        const response = await fetch(request, { cache: 'no-store' });
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

  if (url.pathname.startsWith('/assets/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) {
          const copy = response.clone();
          caches.open(DAYFRAME_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return fetch(request);
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

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data && data.type === 'DAYFRAME_SKIP_WAITING') self.skipWaiting();
});
// data-dayframe-skip-waiting-handler-v1

// data-dayframe-push-handlers-v1
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data && event.data.text ? event.data.text() : '' }; }
  const title = payload.title || 'Dayframe';
  const options = {
    body: payload.body || 'You have something coming up.',
    icon: '/dayframe-icon-2026.svg',
    badge: '/dayframe-icon-2026.svg',
    tag: payload.tag || 'dayframe-reminder',
    renotify: true,
    data: { url: payload.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsArr) {
      if ('focus' in client) {
        client.navigate ? await client.navigate(target).catch(() => {}) : null;
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
