(() => {
  'use strict';

  const FLAG = 'data-dayframe-remove-panels';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  function removeDismissedGuidance() {
    document.getElementById('df-money-guidance')?.remove();
    document.getElementById('df-invest-guidance')?.remove();
  }

  const observer = new MutationObserver(() => {
    if (observer._queued) return;
    observer._queued = true;
    requestAnimationFrame(() => {
      observer._queued = false;
      removeDismissedGuidance();
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeDismissedGuidance, { once: true });
  } else {
    removeDismissedGuidance();
  }
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(removeDismissedGuidance, 300);
  setTimeout(removeDismissedGuidance, 1200);
})();