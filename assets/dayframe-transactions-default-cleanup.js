(() => {
  'use strict';

  const FLAG = 'data-dayframe-transactions-default-cleanup';
  const STYLE_ID = 'df-transactions-default-cleanup-style';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  function byId(id) {
    return document.getElementById(id);
  }

  function normaliseCategory(value) {
    if (typeof moneyNormaliseCategory === 'function') return moneyNormaliseCategory(value);
    const map = { Bills: 'Bills & Utilities', Food: 'Groceries', Fun: 'Entertainment', Everyday: 'Shopping' };
    const clean = String(value || '').trim();
    return map[clean] || clean;
  }

  function selectedCategory() {
    try {
      if (_moneyTransactionCategory) return normaliseCategory(_moneyTransactionCategory);
    } catch {}
    const select = byId('money-transaction-filter')?.querySelector('select');
    return select?.value ? normaliseCategory(select.value) : '';
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #money-pane-transactions.df-transactions-default-clean .life-grid{
        grid-template-columns:1fr!important;
      }
      #money-pane-transactions .df-transactions-budget-side-hidden{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function setSideVisible(visible) {
    const pane = byId('money-pane-transactions');
    const breakdown = byId('money-breakdown');
    const card = breakdown?.closest('section');
    const sideColumn = card?.parentElement;
    if (!pane || !card || !sideColumn) return;

    pane.classList.toggle('df-transactions-default-clean', !visible);
    sideColumn.classList.toggle('df-transactions-budget-side-hidden', !visible);
    card.hidden = !visible;
    if (visible) card.removeAttribute('hidden');
  }

  function apply() {
    ensureStyle();
    const pane = byId('money-pane-transactions');
    if (!pane?.classList.contains('on')) return;
    setSideVisible(Boolean(selectedCategory()));
  }

  function patchRenderMoney() {
    if (typeof globalThis.renderMoney !== 'function' || globalThis.renderMoney.__dayframeTransactionsDefaultCleanup) return;
    const original = globalThis.renderMoney;
    const wrapped = function dayframeTransactionsDefaultCleanupRenderMoney() {
      const result = original.apply(this, arguments);
      apply();
      return result;
    };
    wrapped.__dayframeTransactionsDefaultCleanup = true;
    globalThis.renderMoney = wrapped;
  }

  function boot() {
    patchRenderMoney();
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  setTimeout(boot, 300);
  setTimeout(boot, 1200);
})();