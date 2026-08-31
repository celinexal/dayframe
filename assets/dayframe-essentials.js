(() => {
  'use strict';

  const STYLE_ID = 'df-essentials-loader-style';
  const CLEANUP_SRC = '/assets/dayframe-essentials-cleanup.js?v=20260831-essentials-cleanup-v3';
  const FLO_SRC = '/assets/dayframe-essentials-flo.js?v=20260831-flo-v1';

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '#df-essentials-stage-panel,.driving-side-nav [data-driving-page="driving-theory"],#pg-driving .driving-home-card.theory,#pg-driving-costs,[data-driving-page="driving-costs"],.df-polish-nav-costs{display:none!important}';
    document.head.appendChild(style);
  }

  function loadScript(src, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return null;
    const script = document.createElement('script');
    script.dataset[marker] = 'true';
    script.src = src;
    script.async = false;
    script.defer = true;
    document.head.appendChild(script);
    return script;
  }

  const cleanup = document.documentElement.hasAttribute('data-dayframe-essentials-cleanup')
    ? null
    : loadScript(CLEANUP_SRC, 'dayframeEssentialsCleanupLoader');

  const loadFlo = () => loadScript(FLO_SRC, 'dayframeEssentialsFloLoader');
  if (cleanup) {
    cleanup.addEventListener('load', loadFlo, { once: true });
    setTimeout(loadFlo, 900);
  } else {
    loadFlo();
  }
})();
