(function () {
  if (window.__dayframeBillSuggestionsRestoreLoaded) return;
  window.__dayframeBillSuggestionsRestoreLoaded = true;
  var restoreTimer = 0;

  function restoreBillSuggestions() {
    var style = document.getElementById('df-budget-fixups-style');
    if (style && style.textContent.indexOf('money-bill-suggestions') !== -1) {
      style.textContent = style.textContent
        .replace(/\n?#money-bill-suggestions,\.df-hide-bill-suggestions\{display:none!important\}/g, '');
    }

    var host = document.getElementById('money-bill-suggestions');
    var card = host && host.closest ? host.closest('.life-card') : null;
    if (card) {
      card.classList.remove('df-hide-bill-suggestions');
      card.style.removeProperty('display');
    }
    if (host) host.style.removeProperty('display');
  }

  function scheduleRestore() {
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(function () {
      restoreTimer = 0;
      restoreBillSuggestions();
      setTimeout(restoreBillSuggestions, 120);
      setTimeout(restoreBillSuggestions, 650);
    }, 40);
  }

  var observer = new MutationObserver(scheduleRestore);
  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  }

  window.addEventListener('focus', scheduleRestore);
  document.addEventListener('visibilitychange', scheduleRestore);
  document.addEventListener('dayframe:money-rendered', scheduleRestore);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleRestore, { once: true });
  else scheduleRestore();
})();
