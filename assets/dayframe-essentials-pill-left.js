(() => {
  'use strict';

  const VERSION = 'pill-left-v2';
  const FLAG = 'data-dayframe-essentials-pill-left';
  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const STYLE_ID = 'df-essentials-pill-left-style';
  const CSS = `
    #pg-driving .driving-hub-pills{
      grid-column:1/-1!important;
      justify-self:stretch!important;
      justify-content:flex-start!important;
      align-self:start!important;
      margin-top:2px!important;
    }
  `;

  function ensureStyle() {
    const style = document.getElementById(STYLE_ID) || document.createElement('style');
    style.id = STYLE_ID;
    if (style.textContent !== CSS) style.textContent = CSS;
    if (!style.parentElement) document.head.appendChild(style);
  }

  ensureStyle();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureStyle, { once: true });
  }
  setTimeout(ensureStyle, 600);
  setTimeout(ensureStyle, 1600);
})();

(() => {
  'use strict';

  const PATCHES = [
    {
      src: '/assets/dayframe-essentials-bible.js?v=20260902-essentials-bible-v1',
      marker: 'data-dayframe-essentials-bible-loader',
      ready: 'data-dayframe-essentials-bible',
      value: 'essentials-bible-v1',
    },
  ];

  function loadPatch(config) {
    if (!document.head) return;
    if (document.documentElement.getAttribute(config.ready) === config.value) return;
    if (document.querySelector(`script[${config.marker}]`)) return;
    const script = document.createElement('script');
    script.src = config.src;
    script.defer = true;
    script.setAttribute(config.marker, 'true');
    document.head.appendChild(script);
  }

  function loadBiblePatches() {
    PATCHES.forEach(loadPatch);
  }

  loadBiblePatches();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadBiblePatches, { once: true });
  [250, 900, 2200, 5200].forEach((delay) => setTimeout(loadBiblePatches, delay));
})();
