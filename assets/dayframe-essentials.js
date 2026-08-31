(() => {
  'use strict';

  const STYLE_ID = 'df-essentials-loader-style';
  const CLEANUP_SRC = '/assets/dayframe-essentials-cleanup.js?v=20260831-essentials-cleanup-v3';
  const FLO_SRC = '/assets/dayframe-essentials-flo.js?v=20260831-myflo-v3';
  const MORE_SRC = '/assets/dayframe-essentials-more.js?v=20260831-more-personal-v7';
  const CLICKFIX_SRC = '/assets/dayframe-essentials-clickfix.js?v=20260831-clickfix-v12';
  const HOME_DESC = 'My Car, MyFlo, documents and reminders in one place.';
  const MOBILE_DESC = 'My Car, MyFlo, documents and reminders';
  const LOADER_STYLE = '#df-essentials-stage-panel,.driving-side-nav [data-driving-page="driving-theory"],#pg-driving .driving-home-card.theory,#pg-driving-costs,[data-driving-page="driving-costs"],.df-polish-nav-costs,#pg-driving .driving-home-card.df-widget-hidden,#pg-driving .driving-home-grid>.df-widget-hidden,.driving-side-nav .df-widget-hidden{display:none!important}';

  const style = document.getElementById(STYLE_ID) || document.createElement('style');
  style.id = STYLE_ID;
  if (style.textContent !== LOADER_STYLE) style.textContent = LOADER_STYLE;
  if (!style.parentElement) document.head.appendChild(style);

  let labelQueued = false;
  let labelObserverInstalled = false;

  function fixOverviewLabels() {
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
  }

  function scheduleLabelFix(delay = 40) {
    if (labelQueued) return;
    labelQueued = true;
    setTimeout(() => {
      labelQueued = false;
      fixOverviewLabels();
    }, delay);
  }

  function installLabelObserver() {
    if (labelObserverInstalled || !document.body || typeof MutationObserver !== 'function') return;
    labelObserverInstalled = true;
    new MutationObserver(() => scheduleLabelFix(30)).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function startLabelGuard() {
    fixOverviewLabels();
    installLabelObserver();
    [120, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(fixOverviewLabels, delay));
    document.addEventListener('click', () => scheduleLabelFix(80), true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startLabelGuard, { once: true });
  else startLabelGuard();

  function sameAssetLoaded(src, attr) {
    if (document.querySelector('script[' + attr + ']')) return true;
    let targetPath = '';
    try {
      targetPath = new URL(src, location.href).pathname;
    } catch {
      return false;
    }
    return Array.from(document.scripts).some((script) => {
      if (!script.src) return false;
      try {
        return new URL(script.src, location.href).pathname === targetPath;
      } catch {
        return false;
      }
    });
  }

  function loadScript(src, attr) {
    if (sameAssetLoaded(src, attr)) return null;
    const script = document.createElement('script');
    script.setAttribute(attr, 'true');
    script.src = src;
    script.async = false;
    script.defer = true;
    document.head.appendChild(script);
    return script;
  }

  const loadClickFix = () => loadScript(CLICKFIX_SRC, 'data-dayframe-essentials-clickfix-loader');
  const loadMore = () => {
    const more = loadScript(MORE_SRC, 'data-dayframe-essentials-more-loader');
    if (more) {
      more.addEventListener('load', loadClickFix, { once: true });
      setTimeout(loadClickFix, 900);
    } else {
      loadClickFix();
    }
  };
  const loadFlo = () => {
    const flo = loadScript(FLO_SRC, 'data-dayframe-essentials-flo-loader');
    if (flo) {
      flo.addEventListener('load', loadMore, { once: true });
      setTimeout(loadMore, 900);
    } else {
      loadMore();
    }
  };

  const cleanup = document.documentElement.hasAttribute('data-dayframe-essentials-cleanup')
    ? null
    : loadScript(CLEANUP_SRC, 'data-dayframe-essentials-cleanup-loader');

  if (cleanup) {
    cleanup.addEventListener('load', loadFlo, { once: true });
    setTimeout(loadFlo, 900);
  } else {
    loadFlo();
  }
})();
