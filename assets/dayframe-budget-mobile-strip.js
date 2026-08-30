(function () {
  if (window.__dayframeBudgetMobileStripLoaded) return;
  window.__dayframeBudgetMobileStripLoaded = true;

  function inject() {
    if (document.getElementById('df-budget-mobile-strip-style')) return;
    var style = document.createElement('style');
    style.id = 'df-budget-mobile-strip-style';
    style.textContent = [
      '@media(max-width:620px){',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-top{grid-template-columns:1fr 1fr!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-total{grid-column:1/-1!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check{min-height:0!important;height:auto!important;border-left:0!important;border-top:1px solid #eef1f7!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check.credit{grid-column:1/-1!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-total strong{font-size:48px!important}',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
