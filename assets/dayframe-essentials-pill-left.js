(() => {
  'use strict';

  const VERSION = 'pill-left-v1';
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

  const SRC = '/assets/dayframe-essentials-bible.js?v=20260902-essentials-bible-v1';
  const MARKER = 'data-dayframe-essentials-bible-loader';
  const READY_FLAG = 'data-dayframe-essentials-bible';

  function loadBiblePatch() {
    if (!document.head) return;
    if (document.documentElement.getAttribute(READY_FLAG) === 'essentials-bible-v1') return;
    if (document.querySelector(`script[${MARKER}]`)) return;
    const script = document.createElement('script');
    script.src = SRC;
    script.defer = true;
    script.setAttribute(MARKER, 'true');
    document.head.appendChild(script);
  }

  loadBiblePatch();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadBiblePatch, { once: true });
  [250, 900, 2200].forEach((delay) => setTimeout(loadBiblePatch, delay));
})();
