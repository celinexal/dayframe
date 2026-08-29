(() => {
  'use strict';

  const FLAG = 'data-dayframe-standard-home';
  const HIDDEN_FLAG = 'data-dayframe-standard-home-hidden';
  const COPY_FLAG = 'data-dayframe-standard-home-copy';
  const STYLE_ID = 'df-standard-home-style';
  const HEADLINE = 'Everything that matters, without the mental clutter.';
  const OBSERVER_LIFETIME_MS = 7000;

  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  let observer = null;
  let observerStopTimer = 0;
  let queued = false;
  let instructionPasses = 0;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [${HIDDEN_FLAG}="true"]{display:none!important}
      [data-dayframe-standard-home-hero="true"] h1,
      h1[data-dayframe-standard-home-title="true"]{
        letter-spacing:0!important;
      }
      [${COPY_FLAG}="true"]{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function visible(el) {
    if (!el || !el.isConnected || el.getAttribute(HIDDEN_FLAG) === 'true') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function textOf(el) {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function norm(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function isAppChrome(el) {
    return Boolean(el.closest('nav, header, aside, .topbar, .navbar, .sidebar, [role="navigation"]'));
  }

  function isSelectedHomeNav() {
    return [...document.querySelectorAll('a, button, [role="tab"], [role="link"], .nav-item, .tab')].some((el) => {
      if (norm(textOf(el)) !== 'home') return false;
      const activeTarget = el.closest('[aria-current="page"], [aria-selected="true"], .active, .is-active, .selected, .current') || el;
      const classes = String(activeTarget.className || '');
      return /active|selected|current/.test(classes) || activeTarget.getAttribute?.('aria-current') === 'page' || activeTarget.getAttribute?.('aria-selected') === 'true';
    });
  }

  function isHeroTitle(el) {
    const text = norm(textOf(el));
    return /everything that matters|mental clutter|connect.*account|connect.*bank|start.*account|welcome.*dayframe|your day in one place|money.*plans.*driving|all your.*money.*plans/.test(text);
  }

  function findHeroTitle() {
    return [...document.querySelectorAll('main h1, section h1, article h1, h1')]
      .filter((el) => visible(el) && !isAppChrome(el))
      .find(isHeroTitle) || null;
  }

  function findSupportCopy(hero, title) {
    const root = hero || title?.closest('section, main, article, .hero, .home-hero, .landing, .dashboard-hero, .intro, .panel, .card') || document.body;
    const copy = [...root.querySelectorAll('p, .subtitle, .subcopy, .lead, [class*="subtitle"], [class*="subcopy"]')]
      .filter((el) => visible(el) && !isAppChrome(el));
    return copy.find((el) => {
      const text = norm(textOf(el));
      return /money|plans|goals|driving|investments|account|clutter|attention/.test(text) && text.length < 260;
    }) || copy.find((el) => {
      const length = norm(textOf(el)).length;
      return length > 20 && length < 260;
    }) || null;
  }

  function hideSupportCopy(copy) {
    if (!copy) return;
    copy.textContent = '';
    copy.setAttribute(COPY_FLAG, 'true');
    copy.setAttribute(HIDDEN_FLAG, 'true');
    copy.setAttribute('aria-hidden', 'true');
  }

  function standardiseHero() {
    const title = findHeroTitle();
    if (!title) return false;
    const hero = title.closest('section, main, article, .hero, .home-hero, .landing, .dashboard-hero, .intro, .panel, .card');
    title.textContent = HEADLINE;
    title.setAttribute('data-dayframe-standard-home-title', 'true');
    if (hero) hero.setAttribute('data-dayframe-standard-home-hero', 'true');
    hideSupportCopy(findSupportCopy(hero, title));
    return true;
  }

  const instructionPatterns = [
    /connect your accounts? to/i,
    /connect your bank accounts?/i,
    /link your bank accounts?/i,
    /add your first account/i,
    /start by connecting/i,
    /once you connect your accounts?/i,
    /before you connect/i,
    /how to use dayframe/i,
    /set up your money/i,
    /quick setup/i,
    /getting started/i,
    /follow these steps/i,
    /step 1/i,
    /step one/i
  ];

  function shouldHideInstruction(el) {
    if (!visible(el) || isAppChrome(el)) return false;
    if (el.querySelector('input, textarea, select, h1[data-dayframe-standard-home-title="true"]')) return false;
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight * 1.75) return false;
    const text = textOf(el);
    if (!text || text.length > 1400) return false;
    if (/everything that matters, without the mental clutter/i.test(text)) return false;
    if (!instructionPatterns.some((pattern) => pattern.test(text))) return false;

    const buttonText = [...el.querySelectorAll('button, a')].map(textOf).join(' ');
    if (/log out|saved|home|money|plans|driving|diary|bible|investing/i.test(buttonText)) return false;
    return true;
  }

  function hideInstructionPanels() {
    const candidates = [...document.querySelectorAll('section, article, .card, .panel, .notice, .callout, .banner, .intro-card, .onboarding, [data-onboarding], [id*="onboarding"], [class*="onboarding"], [id*="instruction"], [class*="instruction"], [id*="setup"], [class*="setup"]')].slice(0, 80);
    candidates.forEach((el) => {
      if (shouldHideInstruction(el)) {
        el.setAttribute(HIDDEN_FLAG, 'true');
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function stopObserver() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
    clearTimeout(observerStopTimer);
    observerStopTimer = 0;
  }

  function stopObserverSoon(delay = 1200) {
    if (!observer) return;
    clearTimeout(observerStopTimer);
    observerStopTimer = setTimeout(stopObserver, delay);
  }

  function startObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(() => runSoon(180));
    observer.observe(document.documentElement, { childList: true, subtree: true });
    clearTimeout(observerStopTimer);
    observerStopTimer = setTimeout(stopObserver, OBSERVER_LIFETIME_MS);
  }

  function run() {
    ensureStyle();
    const didHero = standardiseHero();
    if ((didHero || isSelectedHomeNav()) && instructionPasses < 4) {
      instructionPasses += 1;
      hideInstructionPanels();
    }
    if (didHero && instructionPasses >= 2) stopObserverSoon();
  }

  function idle(callback) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 800 });
    } else {
      callback();
    }
  }

  function runSoon(delay = 80) {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      idle(() => {
        queued = false;
        run();
      });
    }, delay);
  }

  function resetAndRun() {
    instructionPasses = 0;
    startObserver();
    runSoon(100);
    setTimeout(() => runSoon(0), 600);
  }

  document.addEventListener('click', (event) => {
    const target = event.target?.closest?.('a, button, [role="tab"], [role="link"], .nav-item, .tab');
    if (target && norm(textOf(target)) === 'home') resetAndRun();
  }, true);

  ['hashchange', 'popstate'].forEach((name) => window.addEventListener(name, resetAndRun));
  ['pushState', 'replaceState'].forEach((method) => {
    const original = history[method];
    if (typeof original !== 'function') return;
    history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      resetAndRun();
      return result;
    };
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resetAndRun, { once: true });
  } else {
    resetAndRun();
  }

  [300, 900, 2000, 4500].forEach((delay) => setTimeout(() => runSoon(0), delay));
})();
