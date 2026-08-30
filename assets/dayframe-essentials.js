(() => {
  'use strict';

  const STYLE_ID = 'df-essentials-loader-style';
  const SRC = '/assets/dayframe-essentials-cleanup.js?v=20260831-essentials-cleanup-v3';

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '#df-essentials-stage-panel,.driving-side-nav [data-driving-page="driving-theory"],#pg-driving .driving-home-card.theory,#pg-driving-costs,[data-driving-page="driving-costs"],.df-polish-nav-costs{display:none!important}';
    document.head.appendChild(style);
  }

  if (document.documentElement.hasAttribute('data-dayframe-essentials-cleanup')) return;
  if (document.querySelector('script[data-dayframe-essentials-cleanup-loader]')) return;

  const script = document.createElement('script');
  script.dataset.dayframeEssentialsCleanupLoader = 'true';
  script.src = SRC;
  script.defer = true;
  document.head.appendChild(script);
})();
