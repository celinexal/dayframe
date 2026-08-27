(() => {
  'use strict';

  const FLAG = 'data-dayframe-category-budget-focus';
  const STYLE_ID = 'df-category-budget-focus-style';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  const TRANSFER_CATEGORIES = new Set(['Transfer', 'Transfers', 'Savings & Investments']);

  function byId(id) {
    return document.getElementById(id);
  }

  function safeCall(fn, fallback) {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  function esc(value) {
    if (typeof hubEsc === 'function') return hubEsc(value);
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function money(value, decimals) {
    if (typeof hubMoney === 'function') return hubMoney(value, decimals);
    const amount = Number(value) || 0;
    return '\u00a3' + amount.toFixed(decimals ?? 2);
  }

  function normaliseCategory(value) {
    if (typeof moneyNormaliseCategory === 'function') return moneyNormaliseCategory(value);
    const map = { Bills: 'Bills & Utilities', Food: 'Groceries', Fun: 'Entertainment', Everyday: 'Shopping' };
    const clean = String(value || 'Other').trim();
    return map[clean] || clean || 'Other';
  }

  function currentSelectedCategory() {
    const lexical = safeCall(() => _moneyTransactionCategory, '');
    if (lexical) return normaliseCategory(lexical);
    const select = byId('money-transaction-filter')?.querySelector('select');
    return select?.value ? normaliseCategory(select.value) : '';
  }

  function cycleFor(reference) {
    if (typeof moneyBudgetCycle === 'function') return moneyBudgetCycle(hubLoad(), reference);
    const now = reference || new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12);
    const iso = (date) => date.toISOString().slice(0, 10);
    return { start: iso(start), end: iso(end), startDay: 1 };
  }

  function previousCycle(current) {
    const ref = new Date(String(current.start || '').slice(0, 10) + 'T12:00:00');
    if (!Number.isFinite(ref.getTime())) return cycleFor(new Date(Date.now() - 31 * 86400000));
    ref.setDate(ref.getDate() - 1);
    return cycleFor(ref);
  }

  function cycleLabel(cycle) {
    if (typeof moneyBudgetCycleLabel === 'function') return moneyBudgetCycleLabel(cycle);
    return `${cycle.start} to ${cycle.end}`;
  }

  function inCycle(date, cycle) {
    if (typeof moneyInBudgetCycle === 'function') return moneyInBudgetCycle(date, cycle);
    const value = String(date || '').slice(0, 10);
    return Boolean(value && value >= cycle.start && value <= cycle.end);
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .df-category-budget-panel{display:flex;flex-direction:column;gap:14px}
      .df-category-budget-status{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;padding:15px;border:1px solid #e8ebf4;border-radius:14px;background:linear-gradient(135deg,#fbfcff,#f6f7fb)}
      .df-category-budget-kicker{font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#8b95a8;margin-bottom:4px}
      .df-category-budget-title{font-family:var(--fd);font-size:25px;font-weight:850;line-height:1.08;color:var(--tx)}
      .df-category-budget-sub{font-size:12px;line-height:1.55;color:var(--t3);margin-top:7px}
      .df-category-budget-pill{justify-self:end;padding:6px 10px;border-radius:999px;background:#eefbf6;color:#19856a;font-size:10px;font-weight:850;white-space:nowrap}
      .df-category-budget-pill.warn{background:#fff6ed;color:#c96f1f}
      .df-category-budget-pill.bad{background:#fff0f0;color:#d64f4f}
      .df-category-budget-progress{height:11px;border-radius:999px;background:#edf0f6;overflow:hidden}
      .df-category-budget-progress>i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#6c63f5,#a586ff);width:0}
      .df-category-budget-progress.warn>i{background:linear-gradient(90deg,#f2b45d,#ff8a4a)}
      .df-category-budget-progress.bad>i{background:linear-gradient(90deg,#f56c6c,#ef4444)}
      .df-category-budget-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .df-category-budget-stat{padding:11px;border:1px solid #edf0f6;border-radius:12px;background:#fff}
      .df-category-budget-stat span{display:block;font-size:9px;font-weight:850;letter-spacing:.07em;text-transform:uppercase;color:#98a2b3;margin-bottom:4px}
      .df-category-budget-stat strong{display:block;font-family:var(--fd);font-size:19px;line-height:1.1;color:#20283a;word-break:break-word}
      .df-category-budget-stat small{display:block;margin-top:4px;font-size:10px;line-height:1.45;color:#8a95a8}
      .df-category-budget-compare{padding:12px;border:1px solid #edf0f6;border-radius:12px;background:#fff}
      .df-category-budget-compare-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      .df-category-budget-compare-head strong{font-size:12px;color:#30384c}
      .df-category-budget-compare-head span{font-size:10px;font-weight:800;color:#7c8799;text-align:right}
      .df-category-budget-actions{display:flex;gap:8px;flex-wrap:wrap}
      .df-category-budget-actions button{border:0;border-radius:10px;padding:9px 11px;font:800 11px var(--ff);cursor:pointer}
      .df-category-budget-primary{background:var(--bl);color:#fff}
      .df-category-budget-secondary{background:#f0f2f8;color:#596376}
      @media(max-width:760px){
        .df-category-budget-status{grid-template-columns:1fr}
        .df-category-budget-pill{justify-self:start}
        .df-category-budget-stats{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function localTransactions(d) {
    return (d.money || []).map((item) => {
      const ruleCategory = safeCall(() => moneyRuleCategory(d, item), '');
      return {
        id: item.id,
        type: item.type === 'income' ? 'income' : 'expense',
        amount: Math.abs(Number(item.amount || 0)),
        category: normaliseCategory(ruleCategory || item.category || 'Other'),
        date: String(item.date || '').slice(0, 10),
      };
    });
  }

  function bankTransactions(d) {
    const overrides = d.transactionCategoryOverrides || {};
    return safeCall(() => (_moneyBankData.transactions || []), []).map((item) => {
      const key = 'bank:' + String(item.id);
      const mapped = {
        id: item.id,
        raw_id: item.id,
        merchant: item.merchant,
        description: item.description,
        amount: Math.abs(Number(item.amount || 0)),
        type: item.direction === 'income' ? 'income' : 'expense',
        category: normaliseCategory(overrides[key] || item.category || 'Other'),
        date: String(item.timestamp || item.date || '').slice(0, 10),
        bank: true,
      };
      const ruleCategory = safeCall(() => moneyRuleCategory(d, mapped), '');
      if (!overrides[key] && ruleCategory) mapped.category = normaliseCategory(ruleCategory);
      return mapped;
    });
  }

  function spendingForCategory(d, category, cycle) {
    return [...localTransactions(d), ...bankTransactions(d)].filter((item) => (
      item.type === 'expense'
      && inCycle(item.date, cycle)
      && normaliseCategory(item.category) === category
      && !TRANSFER_CATEGORIES.has(normaliseCategory(item.category))
    ));
  }

  function getBudget(d, category) {
    return (d.budgets || []).find((budget) => normaliseCategory(budget.category) === category);
  }

  function trendText(current, previous) {
    const diff = current - previous;
    if (previous <= 0 && current <= 0) return 'No spending in either cycle';
    if (previous <= 0) return 'New spending this cycle';
    if (Math.abs(diff) < 0.01) return 'About the same as last cycle';
    return `${money(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than last cycle`;
  }

  function renderCategoryBudgetPanel() {
    ensureStyle();
    const pane = byId('money-pane-transactions');
    const breakdown = byId('money-breakdown');
    if (!pane || !breakdown) return;

    const card = breakdown.closest('section');
    const title = card?.querySelector('.life-card-title');
    const sub = card?.querySelector('.life-card-sub');
    const category = currentSelectedCategory();

    if (!category || !pane.classList.contains('on')) {
      if (title) title.textContent = 'This budget cycle';
      if (sub) sub.textContent = 'Where your spending is going';
      return;
    }

    const d = hubLoad();
    const cycle = cycleFor(new Date());
    const prev = previousCycle(cycle);
    const budget = getBudget(d, category);
    const currentItems = spendingForCategory(d, category, cycle);
    const previousItems = spendingForCategory(d, category, prev);
    const spent = currentItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const lastSpent = previousItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const limit = Math.max(0, Number(budget?.limit || 0));
    const remaining = limit - spent;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const capped = Math.max(0, Math.min(100, pct));
    const state = !limit ? 'warn' : remaining < -0.005 ? 'bad' : pct >= 85 ? 'warn' : 'good';
    const stateLabel = !limit ? 'No budget set' : remaining < -0.005 ? 'Over budget' : pct >= 85 ? 'Close to limit' : 'On track';
    const headline = !limit ? money(spent) : remaining < 0 ? money(Math.abs(remaining)) + ' over' : money(remaining) + ' left';
    const progressClass = state === 'bad' ? 'bad' : state === 'warn' ? 'warn' : '';
    const source = budget?.source === 'linked' ? 'linked from fixed costs' : budget?.source === 'ai' ? 'AI suggested in Budget' : budget ? 'set in Budget' : 'not set yet';

    if (title) title.textContent = category + ' budget';
    if (sub) sub.textContent = 'Linked to the Budget section';

    breakdown.innerHTML = `
      <div class="df-category-budget-panel">
        <div class="df-category-budget-status">
          <div>
            <div class="df-category-budget-kicker">${esc(category)}</div>
            <div class="df-category-budget-title">${headline}</div>
            <div class="df-category-budget-sub">${limit ? `${esc(cycleLabel(cycle))} &middot; ${pct}% of ${money(limit)} used` : `${esc(cycleLabel(cycle))} &middot; set a category limit in Budget to track remaining money.`}</div>
          </div>
          <div class="df-category-budget-pill ${state === 'good' ? '' : state}">${stateLabel}</div>
        </div>
        <div class="df-category-budget-progress ${progressClass}"><i style="width:${capped}%"></i></div>
        <div class="df-category-budget-stats">
          <div class="df-category-budget-stat"><span>Allocated</span><strong>${limit ? money(limit) : 'Not set'}</strong><small>${esc(source)}</small></div>
          <div class="df-category-budget-stat"><span>Spent</span><strong>${money(spent)}</strong><small>${currentItems.length} transaction${currentItems.length === 1 ? '' : 's'} this cycle</small></div>
          <div class="df-category-budget-stat"><span>Last cycle</span><strong>${money(lastSpent)}</strong><small>${previousItems.length} transaction${previousItems.length === 1 ? '' : 's'}</small></div>
        </div>
        <div class="df-category-budget-compare">
          <div class="df-category-budget-compare-head"><strong>Compared with last cycle</strong><span>${esc(cycleLabel(prev))}</span></div>
          <div class="df-category-budget-sub">${esc(trendText(spent, lastSpent))}</div>
        </div>
        <div class="df-category-budget-actions">
          <button class="df-category-budget-primary" type="button" onclick="dayframeOpenBudgetForCategory('${encodeURIComponent(category)}')">${limit ? 'Edit budget' : 'Set budget'}</button>
          <button class="df-category-budget-secondary" type="button" onclick="moneySetTransactionPeriod('cycle')">Show this cycle</button>
        </div>
      </div>
    `;
  }

  globalThis.dayframeOpenBudgetForCategory = function dayframeOpenBudgetForCategory(encodedCategory) {
    let category = '';
    try {
      category = normaliseCategory(decodeURIComponent(encodedCategory || ''));
    } catch {
      category = normaliseCategory(encodedCategory || '');
    }
    const d = hubLoad();
    const budget = getBudget(d, category);
    try { moneyOpenTab('budget'); } catch {}
    setTimeout(() => {
      try { toggleLifeForm('money-budget-form', true); } catch {}
      const categoryInput = byId('money-budget-category');
      const limitInput = byId('money-budget-limit');
      if (categoryInput) categoryInput.value = category;
      if (limitInput && budget) limitInput.value = Number(budget.limit || 0) || '';
      byId('money-budget-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      categoryInput?.focus();
    }, 80);
  };

  function patchRenderMoney() {
    if (typeof globalThis.renderMoney !== 'function' || globalThis.renderMoney.__dayframeCategoryBudgetFocus) return;
    const original = globalThis.renderMoney;
    const wrapped = function dayframeCategoryBudgetFocusRenderMoney() {
      const result = original.apply(this, arguments);
      renderCategoryBudgetPanel();
      return result;
    };
    wrapped.__dayframeCategoryBudgetFocus = true;
    globalThis.renderMoney = wrapped;
  }

  function apply() {
    patchRenderMoney();
    renderCategoryBudgetPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  setTimeout(apply, 300);
  setTimeout(apply, 1200);
})();