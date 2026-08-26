(() => {
  'use strict';

  if (typeof globalThis.syncTheoryFrameSession === 'function') return;

  function readUserId() {
    try {
      const session = JSON.parse(localStorage.getItem('dayframe_session') || '{}');
      return session?.user?.id || session?.user_id || '';
    } catch {
      return '';
    }
  }

  globalThis.syncTheoryFrameSession = function syncTheoryFrameSession() {
    const frame = document.querySelector('#pg-driving-theory iframe.driving-frame');
    const userId = readUserId();
    if (!frame?.contentWindow || !userId) return;
    try {
      frame.contentWindow.postMessage({ type: 'DAYFRAME_AUTH', user_id: userId }, location.origin);
    } catch {
      // Same-origin frame sync is best effort; the tracker also reads local session storage.
    }
  };
})();