(() => {
  'use strict';

  const VERSION = 'clickfix-v1';
  const FLAG = 'data-dayframe-essentials-clickfix';

  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const TOOL_PAGES = {
    documents: 'driving-documents',
    health: 'driving-health',
    home: 'driving-home-admin',
    'work-study': 'driving-work-study',
  };

  function openTool(key, event) {
    if (!TOOL_PAGES[key]) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (typeof window.dayframeOpenEssentialsTool === 'function') {
      window.dayframeOpenEssentialsTool(key, event);
      return;
    }
    window.go?.(TOOL_PAGES[key]);
  }

  function openPage(name, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.go?.(name);
  }

  function openFlo(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (typeof window.dayframeOpenPeriodTracker === 'function') {
      window.dayframeOpenPeriodTracker(event);
    }
  }

  function markTargets() {
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
    if (pageTarget) openPage(pageTarget.dataset.essentialsOpenPage, event);
  }, true);

  function apply() {
    markTargets();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();

  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(apply, delay));
  if (typeof MutationObserver === 'function') {
    new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
