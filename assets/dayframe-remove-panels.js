(() => {
  'use strict';

  const FLAG = 'data-dayframe-remove-panels';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  const HIDE_STYLE = '#df-money-guidance,#df-invest-guidance{display:none!important}';

  function addHideStyle() {
    if (document.getElementById('df-dismissed-guidance-style')) return;
    const style = document.createElement('style');
    style.id = 'df-dismissed-guidance-style';
    style.textContent = HIDE_STYLE;
    document.head.appendChild(style);
  }

  function textMatchesDismissedPanel(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return (
      /Money habits/i.test(clean)
      && /Small controls that help users stay in charge/i.test(clean)
      && /Payday order/i.test(clean)
      && /Sinking funds/i.test(clean)
      && /Subscription audit/i.test(clean)
    ) || (
      /Decision rules/i.test(clean)
      && /Know what would make you trim, sell or wait/i.test(clean)
      && /Trim \/ sell triggers/i.test(clean)
    );
  }

  function removeDismissedGuidance() {
    addHideStyle();
    document.getElementById('df-money-guidance')?.remove();
    document.getElementById('df-invest-guidance')?.remove();
    document.querySelectorAll('.df-polish-panel, section').forEach((node) => {
      if (textMatchesDismissedPanel(node.textContent)) node.remove();
    });
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
  removeDismissedGuidance();
  setTimeout(removeDismissedGuidance, 60);
  setTimeout(removeDismissedGuidance, 300);
  setTimeout(removeDismissedGuidance, 1200);
  setTimeout(removeDismissedGuidance, 3000);
  setTimeout(removeDismissedGuidance, 6000);
})();