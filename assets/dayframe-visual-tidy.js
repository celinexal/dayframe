(() => {
  'use strict';

  const FLAG = 'data-dayframe-visual-tidy';
  const STYLE_ID = 'df-visual-tidy-style';
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

  function isTransferCategory(category) {
    if (typeof moneyIsTransferCategory === 'function') return moneyIsTransferCategory(category);
    return TRANSFER_CATEGORIES.has(normaliseCategory(category));
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
        type: item.direction === 'income' ? 'income' : 'expense',
        amount: Math.abs(Number(item.amount || 0)),
        category: normaliseCategory(overrides[key] || item.category || 'Other'),
        date: String(item.timestamp || item.date || '').slice(0, 10),
      };
      const ruleCategory = safeCall(() => moneyRuleCategory(d, item), '');
      if (!overrides[key] && ruleCategory) mapped.category = normaliseCategory(ruleCategory);
      return mapped;
    });
  }

  function spendingSummary(d, cycle) {
    const rows = {};
    [...localTransactions(d), ...bankTransactions(d)].forEach((item) => {
      const category = normaliseCategory(item.category);
      if (item.type !== 'expense' || !inCycle(item.date, cycle) || isTransferCategory(category)) return;
      rows[category] = rows[category] || { category, spent: 0, count: 0 };
      rows[category].spent += Number(item.amount || 0);
      rows[category].count += 1;
    });
    return rows;
  }

  function getBudget(d, category) {
    return (d.budgets || []).find((budget) => normaliseCategory(budget.category) === category);
  }

  function trendText(current, previous) {
    const diff = current - previous;
    if (previous <= 0 && current <= 0) return 'No spending last cycle';
    if (previous <= 0) return 'New this cycle';
    if (Math.abs(diff) < 0.01) return 'Same as last cycle';
    return `${money(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than last cycle`;
  }

  function overviewRow(row, index) {
    const pct = row.limit > 0 ? Math.round((row.spent / row.limit) * 100) : 0;
    const width = Math.max(0, Math.min(100, pct));
    const state = !row.limit ? 'unset' : row.remaining < -0.005 ? 'bad' : pct >= 85 ? 'warn' : 'good';
    const status = !row.limit
      ? 'Set budget'
      : row.remaining < -0.005
        ? `${money(Math.abs(row.remaining))} over`
        : `${money(row.remaining)} left`;
    const meta = row.limit ? `${money(row.spent)} / ${money(row.limit, 0)}` : `${money(row.spent)} spent`;
    const encoded = encodeURIComponent(row.category).replace(/'/g, '%27');
    return `
      <button class="df-budget-overview-row ${state}" type="button" onclick="moneyOpenTransactions('${encoded}','cycle')" style="--df-row-index:${index}">
        <span class="df-budget-overview-dot" aria-hidden="true"></span>
        <span class="df-budget-overview-main">
          <strong>${esc(row.category)}</strong>
          <small>${row.count} transaction${row.count === 1 ? '' : 's'} this cycle</small>
        </span>
        <span class="df-budget-overview-amount">
          <strong>${meta}</strong>
          <small>${esc(trendText(row.spent, row.lastSpent))}</small>
        </span>
        <span class="df-budget-overview-state">${status}</span>
        <span class="df-budget-overview-track" aria-hidden="true"><i style="width:${width}%"></i></span>
      </button>
    `;
  }

  function renderBudgetOverview() {
    const host = byId('money-budget-overview');
    if (!host || typeof hubLoad !== 'function') return;
    const d = hubLoad();
    const cycle = cycleFor(new Date());
    const previous = previousCycle(cycle);
    const currentSpending = spendingSummary(d, cycle);
    const previousSpending = spendingSummary(d, previous);
    const categories = [...new Set([
      ...(d.budgets || []).map((budget) => normaliseCategory(budget.category)),
      ...Object.keys(currentSpending),
      ...Object.keys(previousSpending),
    ])].filter((category) => category && !isTransferCategory(category));

    host.classList.add('df-budget-overview');
    const card = host.closest('section');
    const title = card?.querySelector('.life-card-title');
    const sub = card?.querySelector('.life-card-sub');
    if (title) title.textContent = 'Budget progress';
    if (sub) sub.textContent = 'Current cycle, limits and last cycle';

    if (!categories.length) {
      host.innerHTML = `<div class="budget-overview-cta"><div><strong>No category budgets yet</strong><span>Add category limits in Budget, then this panel will track how each one is going.</span></div><button onclick="moneyOpenTab('budget')">Add budgets</button></div>`;
      return;
    }

    const rows = categories.map((category) => {
      const budget = getBudget(d, category);
      const limit = Math.max(0, Number(budget?.limit || 0));
      const spent = currentSpending[category]?.spent || 0;
      const lastSpent = previousSpending[category]?.spent || 0;
      return {
        category,
        limit,
        spent,
        lastSpent,
        count: currentSpending[category]?.count || 0,
        remaining: limit - spent,
        hasBudget: limit > 0,
      };
    }).sort((a, b) => {
      const aOver = a.hasBudget && a.remaining < 0 ? 1 : 0;
      const bOver = b.hasBudget && b.remaining < 0 ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      if (a.hasBudget !== b.hasBudget) return Number(b.hasBudget) - Number(a.hasBudget);
      const aPct = a.limit > 0 ? a.spent / a.limit : 0;
      const bPct = b.limit > 0 ? b.spent / b.limit : 0;
      return bPct - aPct || b.spent - a.spent || a.category.localeCompare(b.category);
    });

    const totalLimit = rows.reduce((sum, row) => sum + row.limit, 0);
    const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
    const totalRemaining = totalLimit - totalSpent;
    const usedPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    const overCount = rows.filter((row) => row.hasBudget && row.remaining < -0.005).length;
    const summaryState = overCount ? 'bad' : totalLimit && usedPct >= 85 ? 'warn' : 'good';
    const summaryLabel = totalLimit
      ? totalRemaining < 0 ? `${money(Math.abs(totalRemaining))} over` : `${money(totalRemaining)} left`
      : `${money(totalSpent)} tracked`;

    host.innerHTML = `
      <div class="df-budget-overview-summary ${summaryState}">
        <div><span>Status</span><strong>${summaryLabel}</strong></div>
        <div><span>Used</span><strong>${totalLimit ? `${usedPct}%` : 'No limits'}</strong></div>
        <div><span>Over</span><strong>${overCount}</strong></div>
      </div>
      <div class="df-budget-overview-list">
        ${rows.map(overviewRow).join('')}
      </div>
      <div class="df-budget-overview-foot">${esc(cycleLabel(cycle))} · tap a category to see its transactions.</div>
    `;
  }

  function tidyInvestLearning() {
    const bridge = document.querySelector('#pg-dashboard .invest-learn-bridge');
    if (!bridge) return;
    bridge.classList.add('df-invest-learning-quiet');
    const heading = bridge.querySelector('.invest-learn-intro h2');
    const copy = bridge.querySelector('.invest-learn-intro p');
    const kicker = bridge.querySelector('.invest-learn-kicker');
    const action = bridge.querySelector('.invest-learn-intro > button');
    if (kicker) kicker.textContent = 'Learning';
    if (heading) heading.textContent = 'Learn the numbers as you go';
    if (copy) copy.textContent = 'Short explainers for risk, diversification and research terms while you review your portfolio.';
    if (action) action.textContent = 'Open library';
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet{
        grid-template-columns:minmax(220px,.62fr) minmax(0,1.38fr);
        gap:14px;
        align-items:center;
        margin:0 0 16px;
        padding:16px 18px;
        border:1px solid #e7ebf3;
        border-radius:16px;
        background:linear-gradient(135deg,#ffffff 0%,#f8fbff 52%,#f7f4ff 100%);
        color:#1f2937;
        box-shadow:0 12px 30px rgba(32,40,59,.075);
      }
      #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet:after{display:none}
      #pg-dashboard .df-invest-learning-quiet .invest-learn-kicker{
        padding:0;
        border:0;
        background:transparent;
        border-radius:0;
        font-size:9px;
        letter-spacing:.08em;
        color:#7c8799;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-intro h2{
        margin:5px 0 4px;
        font-size:18px;
        line-height:1.2;
        letter-spacing:0;
        color:#1f2937;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-intro p{
        max-width:520px;
        font-size:10.5px;
        line-height:1.55;
        color:#6b7688;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-intro>button{
        margin-top:10px;
        padding:7px 10px;
        border:1px solid #e0e5f1;
        border-radius:10px;
        background:#fff;
        color:#685cf0;
        font-size:10px;
        box-shadow:0 4px 12px rgba(32,40,59,.045);
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-links{
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-links>button{
        min-height:72px;
        padding:11px 12px;
        border:1px solid #e7ebf3;
        border-radius:12px;
        background:rgba(255,255,255,.72);
        color:#2f394c;
        box-shadow:none;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-links>button:hover{
        transform:translateY(-1px);
        background:#fff;
        border-color:#dbe2f1;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-icon{
        width:27px;
        height:27px;
        border-radius:9px;
        font-size:12px;
        background:#f2f5fb;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-links strong{
        color:#263246;
        font-size:10.5px;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-links small{
        color:#7a8597;
        font-size:9px;
        line-height:1.4;
      }
      #pg-dashboard .df-invest-learning-quiet .invest-learn-links i{
        color:#98a2b3;
      }
      #money-budget-overview.df-budget-overview{gap:0}
      .df-budget-overview-summary{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        margin-bottom:12px;
      }
      .df-budget-overview-summary>div{
        min-width:0;
        padding:9px 10px;
        border:1px solid #edf0f6;
        border-radius:10px;
        background:#fbfcff;
      }
      .df-budget-overview-summary span{
        display:block;
        margin-bottom:3px;
        color:#98a2b3;
        font-size:8.5px;
        font-weight:850;
        letter-spacing:.08em;
        text-transform:uppercase;
      }
      .df-budget-overview-summary strong{
        display:block;
        color:#263246;
        font-family:var(--fd);
        font-size:15px;
        line-height:1.12;
        word-break:break-word;
      }
      .df-budget-overview-summary.bad>div:first-child{background:#fff6f4;border-color:#ffd8cd}
      .df-budget-overview-summary.warn>div:first-child{background:#fff9ec;border-color:#f5e4ba}
      .df-budget-overview-list{
        display:flex;
        flex-direction:column;
        gap:6px;
        max-height:min(56vh,560px);
        overflow:auto;
        padding-right:2px;
        scrollbar-gutter:stable;
      }
      .df-budget-overview-list::-webkit-scrollbar{width:7px}
      .df-budget-overview-list::-webkit-scrollbar-thumb{background:#dce1ea;border-radius:999px}
      .df-budget-overview-row{
        width:100%;
        min-width:0;
        display:grid;
        grid-template-columns:10px minmax(0,1fr) auto auto;
        gap:5px 10px;
        align-items:center;
        padding:9px 0;
        border:0;
        border-bottom:1px solid #eef1f6;
        background:transparent;
        color:inherit;
        font-family:var(--ff);
        text-align:left;
        cursor:pointer;
      }
      .df-budget-overview-row:last-child{border-bottom:0}
      .df-budget-overview-row:hover,.df-budget-overview-row:focus-visible{
        background:#fafbff;
        outline:0;
      }
      .df-budget-overview-dot{
        width:8px;
        height:8px;
        border-radius:50%;
        background:#54bf8f;
      }
      .df-budget-overview-row.warn .df-budget-overview-dot,.df-budget-overview-row.unset .df-budget-overview-dot{background:#f1b83a}
      .df-budget-overview-row.bad .df-budget-overview-dot{background:#ff7454}
      .df-budget-overview-main,.df-budget-overview-amount{
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:2px;
      }
      .df-budget-overview-main strong{
        color:#4b5669;
        font-size:10.5px;
        font-weight:850;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .df-budget-overview-main small,.df-budget-overview-amount small,.df-budget-overview-foot{
        color:#96a0b0;
        font-size:9px;
        line-height:1.35;
      }
      .df-budget-overview-amount{text-align:right}
      .df-budget-overview-amount strong{
        color:#687386;
        font-size:10px;
        font-weight:850;
        white-space:nowrap;
      }
      .df-budget-overview-state{
        min-width:76px;
        justify-self:end;
        padding:5px 8px;
        border-radius:999px;
        background:#eefaf5;
        color:#218464;
        font-size:9px;
        font-weight:850;
        text-align:center;
        white-space:nowrap;
      }
      .df-budget-overview-row.warn .df-budget-overview-state,.df-budget-overview-row.unset .df-budget-overview-state{background:#fff7e6;color:#b36b12}
      .df-budget-overview-row.bad .df-budget-overview-state{background:#fff1ed;color:#d74f32}
      .df-budget-overview-track{
        grid-column:2 / -1;
        height:6px;
        border-radius:999px;
        background:#eef1f6;
        overflow:hidden;
      }
      .df-budget-overview-track>i{
        display:block;
        height:100%;
        border-radius:999px;
        background:#54bf8f;
      }
      .df-budget-overview-row.warn .df-budget-overview-track>i,.df-budget-overview-row.unset .df-budget-overview-track>i{background:#f1b83a}
      .df-budget-overview-row.bad .df-budget-overview-track>i{background:#ff7454}
      .df-budget-overview-foot{
        margin-top:10px;
        padding-top:9px;
        border-top:1px solid #eef1f6;
      }
      @media(max-width:920px){
        #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet{grid-template-columns:1fr}
        #pg-dashboard .df-invest-learning-quiet .invest-learn-links{grid-template-columns:1fr}
      }
      @media(max-width:760px){
        #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet{padding:14px;border-radius:14px}
        #pg-dashboard .df-invest-learning-quiet .invest-learn-links{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:7px;
          overflow:visible;
          padding-bottom:0;
        }
        #pg-dashboard .df-invest-learning-quiet .invest-learn-links>button{
          min-width:0;
          min-height:58px;
          grid-template-columns:1fr;
          padding:9px;
        }
        #pg-dashboard .df-invest-learning-quiet .invest-learn-icon{display:none}
        #pg-dashboard .df-invest-learning-quiet .invest-learn-links strong{font-size:9.5px;line-height:1.25;white-space:normal}
        #pg-dashboard .df-invest-learning-quiet .invest-learn-links small,
        #pg-dashboard .df-invest-learning-quiet .invest-learn-links i{display:none}
        .df-budget-overview-summary{grid-template-columns:1fr 1fr}
        .df-budget-overview-summary>div:first-child{grid-column:1/-1}
        .df-budget-overview-row{grid-template-columns:10px minmax(0,1fr) auto}
        .df-budget-overview-state{grid-column:2 / -1;justify-self:start;min-width:0}
        .df-budget-overview-track{grid-column:2 / -1}
      }
    `;
    document.head.appendChild(style);
  }

  function patchRenderMoney() {
    if (typeof globalThis.renderMoney !== 'function' || globalThis.renderMoney.__dayframeVisualTidy) return;
    const original = globalThis.renderMoney;
    const wrapped = function dayframeVisualTidyRenderMoney() {
      const result = original.apply(this, arguments);
      renderBudgetOverview();
      return result;
    };
    wrapped.__dayframeVisualTidy = true;
    globalThis.renderMoney = wrapped;
  }

  function apply() {
    ensureStyle();
    tidyInvestLearning();
    patchRenderMoney();
    renderBudgetOverview();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  setTimeout(apply, 250);
  setTimeout(apply, 1000);
})();