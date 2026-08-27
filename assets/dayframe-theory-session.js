(() => {
  'use strict';

  const INIT_FLAG = '__dayframeTheorySessionFrameFixV1';
  const FRAME_SELECTOR = '#pg-driving-theory iframe.driving-frame';
  const THEORY_PATH = '/driving/theory';

  if (globalThis[INIT_FLAG]) return;
  globalThis[INIT_FLAG] = true;

  function readUserId() {
    try {
      const session = JSON.parse(localStorage.getItem('dayframe_session') || '{}');
      return session?.user?.id || session?.user_id || '';
    } catch {
      return '';
    }
  }

  function desiredFrameSrc(frame) {
    const raw = frame?.getAttribute('src') || THEORY_PATH;
    let url;
    try {
      url = new URL(raw, location.origin);
    } catch {
      return THEORY_PATH;
    }

    if (url.origin !== location.origin) {
      url = new URL(THEORY_PATH, location.origin);
    }
    if (url.pathname === '/driving/theory.html' || url.pathname === '/driving/theory/') {
      url.pathname = THEORY_PATH;
    }
    if (url.pathname !== THEORY_PATH) {
      url.pathname = THEORY_PATH;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function normaliseTheoryFrame() {
    const frame = document.querySelector(FRAME_SELECTOR);
    if (!frame) return null;
    const nextSrc = desiredFrameSrc(frame);
    if (frame.getAttribute('src') !== nextSrc) {
      frame.setAttribute('src', nextSrc);
    }
    return frame;
  }

  function sync() {
    const frame = normaliseTheoryFrame();
    const userId = readUserId();
    if (!frame?.contentWindow || !userId) return;
    try {
      frame.contentWindow.postMessage({ type: 'DAYFRAME_AUTH', user_id: userId }, location.origin);
    } catch {
      // Same-origin frame sync is best effort; the tracker also reads local session storage.
    }
  }

  function wireFrame() {
    const frame = normaliseTheoryFrame();
    if (!frame || frame.dataset.dayframeTheorySync === 'true') return;
    frame.dataset.dayframeTheorySync = 'true';
    frame.addEventListener('load', () => setTimeout(sync, 50));
  }

  globalThis.syncTheoryFrameSession = sync;

  function run() {
    wireFrame();
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  setTimeout(run, 250);
  setTimeout(run, 1000);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();