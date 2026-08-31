(() => {
  'use strict';

  const VERSION = 'clickfix-v8';
  const FLAG = 'data-dayframe-essentials-clickfix';
  const HOME_DESC = 'My Car, MyFlo, documents and reminders in one place.';
  const MOBILE_DESC = 'My Car, MyFlo, documents and reminders';

  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const TOOL_PAGES = {
    documents: 'driving-documents',
    health: 'driving-health',
    home: 'driving-home-admin',
    'work-study': 'driving-work-study',
  };

  const MAIN_PAGES = {
    home: 'home',
    money: 'money',
    planner: 'planner',
    driving: 'driving',
    diary: 'diary',
    bible: 'bible',
    investing: 'dashboard',
    dashboard: 'dashboard',
  };

  const INVESTING_PAGES = new Set(['dashboard', 'holdings', 'signals', 'charts', 'themes-hub', 'education', 'isa-guide', 'intel', 'health', 'alerts', 'chatter']);
  const DRIVING_PAGES = new Set(['driving', 'driving-theory', 'driving-car', 'driving-cycle', 'driving-documents', 'driving-health', 'driving-home-admin', 'driving-work-study']);

  function fixVisibleHomeLanguage() {
    const reveal = (el) => {
      if (!el) return;
      el.classList.remove('df-life-hidden', 'df-essentials-hidden', 'home-item-hidden');
      el.style.display = '';
      el.setAttribute('aria-hidden', 'false');
    };
    const homeCard = document.querySelector('[data-home-module="driving"]');
    reveal(homeCard);
    const homeTitle = homeCard?.querySelector('.hub-module-title');
    const homeDesc = homeCard?.querySelector('.hub-module-desc');
    if (homeTitle && homeTitle.textContent.trim() !== 'Essentials') homeTitle.textContent = 'Essentials';
    if (homeDesc && homeDesc.textContent.trim() !== HOME_DESC) homeDesc.textContent = HOME_DESC;

    const topNav = document.querySelector('.df-nav-btn[data-main-page="driving"]');
    reveal(topNav);
    if (topNav && topNav.textContent.trim() !== 'Essentials') topNav.textContent = 'Essentials';

    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`);
    reveal(mobileMore);
    const mobileTitle = mobileMore?.querySelector('strong');
    const mobileDesc = mobileMore?.querySelector('small');
    if (mobileTitle && mobileTitle.textContent.trim() !== 'Essentials') mobileTitle.textContent = 'Essentials';
    if (mobileDesc && mobileDesc.textContent.trim() !== MOBILE_DESC) mobileDesc.textContent = MOBILE_DESC;

    const essentialsPage = document.getElementById('pg-driving');
    const heroPills = essentialsPage?.querySelector('.driving-hub-pills');
    if (heroPills && /(^|[^A-Za-z])Flo([^A-Za-z]|$)/.test(heroPills.textContent || '')) {
      heroPills.innerHTML = ['My Car', 'MyFlo', 'Documents', 'Health', 'Home & Rent', 'Work & Study'].map((label) => `<span class="driving-hub-pill"><b></b>${label}</span>`).join('');
    }

    const floNav = essentialsPage?.querySelector('[data-driving-page="driving-cycle"]');
    if (floNav && floNav.textContent.trim() === 'Flo') {
      const textNode = [...floNav.childNodes].reverse().find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (textNode) textNode.textContent = 'MyFlo';
      else floNav.appendChild(document.createTextNode('MyFlo'));
    }

    const floCard = document.getElementById('df-period-card');
    const floCardTitle = floCard?.querySelector('.driving-home-title');
    const floPanelTitle = document.querySelector('#df-period-panel .df-period-panel-head h2');
    if (floCardTitle && floCardTitle.textContent.trim() === 'Flo') floCardTitle.textContent = 'MyFlo';
    if (floPanelTitle && floPanelTitle.textContent.trim() === 'Flo') floPanelTitle.textContent = 'MyFlo';

    document.querySelectorAll('#pg-home .hub-hero p, .hub-hero p').forEach((copy) => {
      if (/driving admin|money, plans, goals/i.test(copy.textContent || '')) {
        copy.textContent = '';
        copy.style.display = 'none';
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('data-dayframe-essentials-copy-removed', 'true');
      }
    });
  }

  function claim(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
  }

  function openTool(key, event) {
    if (!TOOL_PAGES[key]) return;
    claim(event);
    if (typeof window.dayframeOpenEssentialsTool === 'function') {
      window.dayframeOpenEssentialsTool(key, event);
      return;
    }
    forcePage(TOOL_PAGES[key]);
  }

  function openPage(name, event) {
    claim(event);
    forcePage(name);
  }

  function mainKeyFor(page) {
    if (INVESTING_PAGES.has(page)) return 'investing';
    if (DRIVING_PAGES.has(page)) return 'driving';
    return page;
  }

  function setButtonState(page) {
    fixVisibleHomeLanguage();
    const main = mainKeyFor(page);
    document.querySelectorAll('.df-nav-btn[data-main-page]').forEach((button) => {
      button.classList.toggle('on', button.dataset.mainPage === main);
    });
    document.querySelectorAll('.df-mobile-nav button[data-mobile-page]').forEach((button) => {
      const key = ['home', 'money', 'planner', 'bible'].includes(main) ? main : 'more';
      button.classList.toggle('on', button.dataset.mobilePage === key);
    });
    document.querySelectorAll('.invest-side-nav button').forEach((button) => {
      button.classList.toggle('on', button.dataset.investPage === page);
    });
    document.querySelectorAll('.driving-side-nav button').forEach((button) => {
      button.classList.toggle('on', button.dataset.drivingPage === page);
    });
    document.querySelectorAll('.ni').forEach((button) => {
      const text = (button.textContent || '').toLowerCase();
      const shouldBeOn =
        (main === 'home' && text.includes('home')) ||
        (main === 'money' && text.includes('money')) ||
        (main === 'planner' && text.includes('plan')) ||
        (main === 'driving' && (text.includes('essential') || text.includes('driving'))) ||
        (main === 'diary' && text.includes('diary')) ||
        (main === 'bible' && text.includes('bible')) ||
        (main === 'investing' && text.includes('invest'));
      button.classList.toggle('on', shouldBeOn);
    });
  }

  function forcePage(page) {
    if (page === 'driving-costs') page = 'driving-car';
    if (page === 'driving-cycle') {
      forcePage('driving');
      window.dayframeOpenPeriodTracker?.();
      return true;
    }
    const target = document.getElementById(`pg-${page}`);
    if (!target) return false;
    document.querySelectorAll('.pg.on[id^="pg-"]').forEach((old) => {
      old.classList.remove('on');
      old.style.display = '';
    });
    target.classList.add('on');
    target.style.display = '';

    document.body?.classList.toggle('investing-mode', INVESTING_PAGES.has(page));
    document.body?.classList.toggle('driving-mode', DRIVING_PAGES.has(page));
    setButtonState(page);
    window.dfCloseSheets?.();
    if (window.innerWidth <= 768 && typeof window.closeSB === 'function') window.closeSB();

    try { window.renderLifePage?.(page); } catch {}
    if (page === 'charts') {
      try { window.rCF?.(); } catch {}
      try { if (window.activeTk) window.openChart?.(window.activeTk); } catch {}
    }
    if (page === 'intel' && !window.intelScanned && window.aiKey) {
      window.intelScanned = true;
      setTimeout(() => { try { window.runIntelScan?.(); } catch {} }, 400);
    }
    if (page === 'health') { try { window.rHealth?.(); } catch {} }
    if (page === 'alerts') { try { window.rAlerts?.(); } catch {} }
    if (page === 'signals') {
      try { window.rEarnings?.(); } catch {}
      try { window.rConfCalendar?.(); } catch {}
      const news = document.getElementById('news-out');
      if (news && /Press Refresh|Loading your latest/.test(news.innerHTML || '')) {
        try { window.fetchNews?.(); } catch {}
      }
    }
    if (page === 'chatter') { try { window.initChatterPills?.(); } catch {} }
    if (page === 'education') { try { window.rEducation?.(); } catch {} }
    if (page !== 'education') {
      const bar = document.getElementById('edu-back-bar');
      if (bar) bar.style.display = 'none';
    }
    if (page === 'driving-theory') setTimeout(() => { try { window.syncTheoryFrameSession?.(); } catch {} }, 120);
    fixVisibleHomeLanguage();
    return true;
  }

  function navigateMain(key, event) {
    const page = MAIN_PAGES[key];
    if (!page) return false;
    claim(event);
    forcePage(page);
    setTimeout(() => {
      const active = document.querySelector('.pg.on')?.id || '';
      if (active !== `pg-${page}`) forcePage(page);
      else setButtonState(page);
    }, 0);
    setTimeout(() => {
      const active = document.querySelector('.pg.on')?.id || '';
      if (active !== `pg-${page}`) forcePage(page);
      else setButtonState(page);
    }, 80);
    return true;
  }

  function routeFromMoreButton(button) {
    const raw = button?.getAttribute?.('onclick') || '';
    const match = raw.match(/dfMoreGo\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : '';
  }

  function routeFromGoHandler(element) {
    const raw = element?.getAttribute?.('onclick') || '';
    const match = raw.match(/\bgo\(['"]([^'"]+)['"]/);
    return match ? match[1] : '';
  }

  function openFlo(event) {
    claim(event);
    if (typeof window.dayframeOpenPeriodTracker === 'function') {
      window.dayframeOpenPeriodTracker(event);
    }
  }

  function installStableGo() {
    const stableGo = function dayframeStableGo(name, btn) {
      const page = MAIN_PAGES[name] || name;
      const ok = forcePage(page);
      if (ok && btn?.classList) btn.classList.add('on');
      return undefined;
    };
    stableGo.__dayframeStableGoVersion = VERSION;
    window.go = stableGo;
  }

  function markTargets() {
    fixVisibleHomeLanguage();
    const homeCard = document.querySelector('[data-home-module="driving"]');
    if (homeCard) homeCard.dataset.essentialsOpenPage = 'driving';

    const myCar = document.querySelector('#pg-driving .driving-home-card.car');
    if (myCar) myCar.dataset.essentialsOpenPage = 'driving-car';

    const flo = document.getElementById('df-period-card');
    if (flo) {
      if ('type' in flo) flo.type = 'button';
      flo.dataset.essentialsOpenFlo = 'true';
    }

    Object.entries(TOOL_PAGES).forEach(([key, page]) => {
      const card = document.getElementById(`df-${key}-card`);
      if (card) {
        if ('type' in card) card.type = 'button';
        card.dataset.essentialsToolCard = key;
      }
      const nav = document.querySelector(`.driving-side-nav [data-driving-page="${page}"]`);
      if (nav) nav.dataset.essentialsToolNav = key;
    });
  }

  document.addEventListener('click', (event) => {
    const topNavTarget = event.target.closest?.('.df-nav-btn[data-main-page]');
    if (topNavTarget && navigateMain(topNavTarget.dataset.mainPage, event)) return;

    const mobileNavTarget = event.target.closest?.('.df-mobile-nav button[data-mobile-page]');
    if (mobileNavTarget) {
      const key = mobileNavTarget.dataset.mobilePage;
      if (key && key !== 'more' && navigateMain(key, event)) return;
    }

    const homeModuleTarget = event.target.closest?.('[data-home-module]');
    if (homeModuleTarget && navigateMain(homeModuleTarget.dataset.homeModule, event)) return;

    const moreSheetTarget = event.target.closest?.('#df-more-sheet button');
    const moreRoute = routeFromMoreButton(moreSheetTarget);
    if (moreRoute && navigateMain(moreRoute, event)) return;

    const toolTarget = event.target.closest?.('[data-essentials-tool-card],[data-essentials-tool-nav]');
    if (toolTarget) {
      openTool(toolTarget.dataset.essentialsToolCard || toolTarget.dataset.essentialsToolNav, event);
      return;
    }

    const floTarget = event.target.closest?.('[data-essentials-open-flo="true"],#df-period-card');
    if (floTarget) {
      openFlo(event);
      return;
    }

    const myCarTarget = event.target.closest?.('#pg-driving .driving-home-card.car');
    if (myCarTarget) {
      openPage('driving-car', event);
      return;
    }

    const pageTarget = event.target.closest?.('[data-essentials-open-page]');
    if (pageTarget) {
      openPage(pageTarget.dataset.essentialsOpenPage, event);
      return;
    }

    const goTarget = event.target.closest?.('[onclick*="go("]');
    const goRoute = routeFromGoHandler(goTarget);
    if (goRoute) {
      claim(event);
      forcePage(MAIN_PAGES[goRoute] || goRoute);
    }
  }, true);

  function apply() {
    installStableGo();
    markTargets();
    fixVisibleHomeLanguage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();

  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(apply, delay));
  if (typeof MutationObserver === 'function') {
    new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
