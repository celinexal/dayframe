(() => {
  'use strict';

  const FLAG = 'data-dayframe-standard-home';
  const HIDDEN_FLAG = 'data-dayframe-standard-home-hidden';
  const STYLE_ID = 'df-standard-home-style';
  const HEADLINE = 'Everything that matters, without the mental clutter.';
  const SUPPORT = 'Keep your money, plans, goals, driving admin and investments together \u2014 so you can see what needs attention and get on with your day.';

  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

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
      [data-dayframe-standard-home-copy="true"]{
        max-width:980px!important;
      }
    `;
    document.head.appendChild(style);
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
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
      return /active|selected|current/.test(activeTarget.className || '') || activeTarget.getAttribute?.('aria-current') === 'page' || activeTarget.getAttribute?.('aria-selected') === 'true';
    });
  }

  function isHeroTitle(el) {
    const text = norm(textOf(el));
    return /everything that matters|mental clutter|connect.*account|connect.*bank|start.*account|welcome.*dayframe|your day in one place|money.*plans.*driving|all your.*money.*plans/.test(text);
  }

  function findHeroTitle() {
    return [...document.querySelectorAll('h1, [class*="hero"] h1, [class*="landing"] h1, [data-hero] h1')]
      .filter((el) => visible(el) && !isAppChrome(el))
      .find(isHeroTitle) || null;
  }

  function findSupportCopy(hero, title) {
    const root = hero || title?.closest('section, main, article, .hero, .home-hero, .landing, .dashboard-hero, .intro, .panel, .card') || document.body;
    const copy = [...root.querySelectorAll('p, .subtitle, .subcopy, .lead, [class*="subtitle"], [class*="subcopy"], [class*="eyebrow"]')]
      .filter((el) => visible(el) && !isAppChrome(el));
    return copy.find((el) => {
      const text = norm(textOf(el));
      return /money|plans|goals|driving|investments|account|clutter|attention/.test(text) && text.length < 260;
    }) || copy.find((el) => norm(textOf(el)).length > 20 && norm(textOf(el)).length < 260) || null;
  }

  function standardiseHero() {
    const title = findHeroTitle();
    if (!title) return false;
    const hero = title.closest('section, main, article, .hero, .home-hero, .landing, .dashboard-hero, .intro, .panel, .card');
    title.textContent = HEADLINE;
    title.setAttribute('data-dayframe-standard-home-title', 'true');
    if (hero) hero.setAttribute('data-dayframe-standard-home-hero', 'true');

    const copy = findSupportCopy(hero, title);
    if (copy) {
      copy.textContent = SUPPORT;
      copy.setAttribute('data-dayframe-standard-home-copy', 'true');
    }
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
    if (el.querySelector('input, textarea, select')) return false;
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight * 1.5) return false;
    const text = textOf(el);
    if (!text || text.length > 1400) return false;
    if (/everything that matters, without the mental clutter/i.test(text)) return false;
    if (!instructionPatterns.some((pattern) => pattern.test(text))) return false;

    const buttonText = [...el.querySelectorAll('button, a')].map(textOf).join(' ');
    if (/log out|saved|home|money|plans|driving|diary|bible|investing/i.test(buttonText)) return false;
    return true;
  }

  function hideInstructionPanels() {
    const candidates = [...document.querySelectorAll('section, article, .card, .panel, .notice, .callout, .banner, .intro-card, .onboarding, [data-onboarding], [id*="onboarding"], [class*="onboarding"], [id*="instruction"], [class*="instruction"], [id*="setup"], [class*="setup"]')];
    candidates.forEach((el) => {
      if (shouldHideInstruction(el)) {
        el.setAttribute(HIDDEN_FLAG, 'true');
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function run() {
    ensureStyle();
    const didHero = standardiseHero();
    if (didHero || isSelectedHomeNav()) {
      hideInstructionPanels();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  [100, 400, 1000, 2000, 5000].forEach((delay) => setTimeout(run, delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      run();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
