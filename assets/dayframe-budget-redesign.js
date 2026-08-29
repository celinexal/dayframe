(function () {
  if (window.__dayframeBudgetRedesignLoaded) return;
  window.__dayframeBudgetRedesignLoaded = true;

  var COLORS = ['#7c61f3', '#ff7aa8', '#38bfa7', '#ff914d', '#4f8cff', '#f2b93b'];
  var EXCLUDED = new Set(['Transfer', 'Transfers', 'Savings & Investments', 'Salary', 'Income']);
  var state = {
    filter: 'all',
    selected: ''
  };
  var renderTimer = 0;
  var installAttempts = 0;
  var aiBusy = false;
  var aiMessage = '';

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    if (typeof window.hubEsc === 'function') return window.hubEsc(value);
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normaliseCategory(value) {
    if (typeof window.moneyNormaliseCategory === 'function') return window.moneyNormaliseCategory(value);
    var clean = String(value || 'Other').trim();
    return clean || 'Other';
  }

  function money(value, digits) {
    if (typeof window.hubMoney === 'function') return window.hubMoney(value, digits);
    var amount = Number(value) || 0;
    return '&pound;' + amount.toLocaleString('en-GB', {
      minimumFractionDigits: digits == null ? 2 : digits,
      maximumFractionDigits: digits == null ? 2 : digits
    });
  }

  function prettyDate(value) {
    if (typeof window.hubPrettyDate === 'function') return window.hubPrettyDate(value);
    if (!value) return '';
    try {
      return new Date(String(value).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      });
    } catch (_) {
      return String(value).slice(0, 10);
    }
  }

  function safeCall(fn, fallback) {
    try {
      return typeof fn === 'function' ? fn.apply(null, Array.prototype.slice.call(arguments, 2)) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function syncBudgetPageState() {
    var page = $('pg-money');
    var pane = $('money-pane-budget');
    if (page && pane) page.classList.toggle('df-budget-focused', pane.classList.contains('on'));
  }

  function injectStyle() {
    if ($('df-budget-redesign-style')) return;
    var style = document.createElement('style');
    style.id = 'df-budget-redesign-style';
    style.textContent = [
      '#money-pane-budget.df-budget-applied>.budget-builder,#money-pane-budget.df-budget-applied>.money-pane-grid{display:none!important}',
      '#money-pane-budget.df-budget-applied.df-budget-show-setup>.budget-builder{display:block!important;margin-top:18px}',
      '#money-pane-budget.df-budget-applied.df-budget-show-setup>.money-pane-grid{display:grid!important;margin-top:18px}',
      '.money-page.df-budget-focused .money-metrics{display:none!important}',
      '#df-budget-redesign{display:flex;flex-direction:column;gap:18px}',
      '.df-budget-shell{display:flex;flex-direction:column;gap:18px}',
      '.df-budget-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:4px 2px}',
      '.df-budget-kicker{display:block;font:800 10px/1 var(--fd,inherit);letter-spacing:.08em;text-transform:uppercase;color:#7b879a;margin-bottom:8px}',
      '.df-budget-header h2{margin:0;font:850 clamp(28px,4vw,46px)/1.02 var(--fd,inherit);letter-spacing:0;color:#182033}',
      '.df-budget-header p{margin:9px 0 0;max-width:620px;color:#7d8798;font:650 14px/1.45 var(--fd,inherit)}',
      '.df-budget-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}',
      '.df-budget-action{border:1px solid #e4e8f2;background:#fff;color:#6858e8;border-radius:999px;padding:11px 15px;font:850 12px/1 var(--fd,inherit);box-shadow:0 12px 30px rgba(35,43,70,.07);cursor:pointer}',
      '.df-budget-action.primary{background:#7565f2;color:#fff;border-color:#7565f2}',
      '.df-budget-top{display:grid;grid-template-columns:minmax(300px,.88fr) minmax(0,1.12fr);gap:16px;align-items:stretch}',
      '.df-budget-total,.df-budget-checks,.df-budget-panel,.df-budget-detail{background:rgba(255,255,255,.92);border:1px solid #e7ebf3;border-radius:22px;box-shadow:0 18px 48px rgba(31,40,65,.08)}',
      '.df-budget-total{padding:24px;display:flex;flex-direction:column;justify-content:space-between;min-height:182px}',
      '.df-budget-total small,.df-budget-check small,.df-budget-panel-eyebrow,.df-detail-eyebrow{display:block;color:#7f8a9d;font:850 10px/1 var(--fd,inherit);text-transform:uppercase;letter-spacing:.08em}',
      '.df-budget-total strong{display:block;margin-top:10px;font:900 clamp(44px,7vw,78px)/.95 var(--fd,inherit);letter-spacing:0;color:#141b2d}',
      '.df-budget-total strong.over{color:#ef5d6f}',
      '.df-budget-meter{height:12px;border-radius:999px;background:#edf0f6;overflow:hidden;margin-top:18px}',
      '.df-budget-meter i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#7565f2,#ff7aa8);width:0}',
      '.df-budget-total-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;color:#7e899a;font:800 12px/1.35 var(--fd,inherit);flex-wrap:wrap}',
      '.df-budget-pill{display:inline-flex;align-items:center;border-radius:999px;padding:8px 10px;background:#f2efff;color:#7565f2;font:850 11px/1 var(--fd,inherit);white-space:nowrap}',
      '.df-budget-pill.warning{background:#fff1f3;color:#e45263}',
      '.df-budget-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;overflow:hidden}',
      '.df-budget-check{padding:22px;background:#fff;min-width:0}',
      '.df-budget-check span{display:block;margin-top:13px;color:#151d31;font:900 clamp(24px,3vw,34px)/1 var(--fd,inherit);letter-spacing:0;overflow-wrap:anywhere}',
      '.df-budget-check b{display:block;margin-top:8px;color:#838fa2;font:800 12px/1.25 var(--fd,inherit)}',
      '.df-budget-main{display:grid;grid-template-columns:minmax(320px,.92fr) minmax(380px,1.08fr);gap:18px;align-items:start}',
      '.df-budget-panel{padding:18px}',
      '.df-detail-button{border:0;border-radius:999px;background:#171f34;color:#fff;padding:11px 14px;font:850 12px/1 var(--fd,inherit);cursor:pointer}',
      '.df-budget-ai-note{margin-top:10px;border-radius:14px;background:#f4f1ff;color:#6659d9;padding:10px 12px;font:800 11px/1.35 var(--fd,inherit)}',
      '.df-budget-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}',
      '.df-budget-panel-head h3,.df-budget-detail h3{margin:5px 0 0;color:#172036;font:900 22px/1.1 var(--fd,inherit);letter-spacing:0}',
      '.df-budget-panel-head p{margin:5px 0 0;color:#7c8798;font:650 12px/1.35 var(--fd,inherit)}',
      '.df-budget-add{border:1px solid #e4e8f2;background:#fff;border-radius:999px;color:#6d5df0;padding:10px 12px;font:850 12px/1 var(--fd,inherit);cursor:pointer;white-space:nowrap}',
      '.df-budget-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}',
      '.df-budget-filter{border:1px solid #e4e8f2;background:#fff;color:#69758a;border-radius:999px;padding:9px 12px;font:850 12px/1 var(--fd,inherit);cursor:pointer}',
      '.df-budget-filter.active{background:#ede9ff;color:#6d5df0;border-color:#ded6ff}',
      '.df-budget-category-list{display:flex;flex-direction:column;gap:9px;max-height:590px;overflow:auto;padding-right:3px}',
      '.df-budget-row{border:1px solid #e8ecf4;background:#fff;border-radius:18px;padding:14px;text-align:left;cursor:pointer;box-shadow:0 8px 22px rgba(29,39,64,.04)}',
      '.df-budget-row.active{border-color:#aa9dff;box-shadow:0 12px 30px rgba(117,101,242,.12)}',
      '.df-budget-row-top,.df-budget-row-meta{display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '.df-budget-row-title{display:flex;align-items:center;gap:10px;min-width:0}',
      '.df-budget-dot{width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 5px rgba(124,97,243,.1);flex:none}',
      '.df-budget-row strong{color:#283247;font:900 14px/1.2 var(--fd,inherit);letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.df-budget-status{font:900 12px/1.2 var(--fd,inherit);white-space:nowrap;color:#2aa474}',
      '.df-budget-status.over{color:#eb5366}.df-budget-status.close{color:#d88d12}',
      '.df-budget-row-bar{display:block;height:10px;border-radius:999px;background:#edf0f6;overflow:hidden;margin:12px 0 8px}',
      '.df-budget-row-bar i{display:block;height:100%;border-radius:999px;width:0}',
      '.df-budget-row-meta{color:#8490a2;font:800 11px/1.3 var(--fd,inherit)}',
      '.df-budget-detail{padding:22px;min-height:520px}',
      '.df-budget-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}',
      '.df-detail-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}',
      '.df-detail-button.secondary{background:#fff;color:#6d5df0;border:1px solid #ded8ff}',
      '.df-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}',
      '.df-detail-stat{border:1px solid #e8ecf4;border-radius:16px;padding:14px;background:#fbfcff;min-width:0}',
      '.df-detail-stat small{display:block;color:#7f8a9d;font:850 10px/1 var(--fd,inherit);text-transform:uppercase;letter-spacing:.07em}',
      '.df-detail-stat strong{display:block;margin-top:9px;color:#171f34;font:900 20px/1 var(--fd,inherit);letter-spacing:0;overflow-wrap:anywhere}',
      '.df-recent-list{display:flex;flex-direction:column;gap:9px;margin-top:13px}',
      '.df-recent-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e8ecf4;border-radius:16px;padding:12px 13px;background:#fff}',
      '.df-recent-row strong{display:block;color:#334058;font:850 13px/1.2 var(--fd,inherit);letter-spacing:0}',
      '.df-recent-row small{display:block;margin-top:4px;color:#8995a7;font:750 11px/1.25 var(--fd,inherit)}',
      '.df-recent-row b{color:#ef6575;font:900 13px/1 var(--fd,inherit);white-space:nowrap}',
      '.df-budget-empty{border:1px dashed #dfe5f1;border-radius:18px;padding:22px;text-align:center;color:#798599;font:750 13px/1.45 var(--fd,inherit);background:#fbfcff}',
      '@media(max-width:980px){.df-budget-header,.df-budget-top,.df-budget-main{grid-template-columns:1fr;display:grid}.df-budget-header{gap:14px}.df-budget-actions{justify-content:flex-start}.df-budget-checks{grid-template-columns:1fr 1fr}.df-budget-detail{min-height:0}}',
      '@media(max-width:620px){#df-budget-redesign{gap:14px}.df-budget-header h2{font-size:34px}.df-budget-header p{font-size:13px}.df-budget-top,.df-budget-main{gap:12px}.df-budget-total,.df-budget-panel,.df-budget-detail{border-radius:18px;padding:16px}.df-budget-checks{grid-template-columns:1fr}.df-budget-check{padding:16px}.df-budget-total strong{font-size:52px}.df-detail-grid{grid-template-columns:1fr}.df-budget-detail-head{flex-direction:column}.df-detail-actions{justify-content:flex-start}.df-budget-row-meta{display:block}.df-budget-row-meta span{display:block;margin-top:3px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function cycleFor(d, reference) {
    return safeCall(window.moneyBudgetCycle, fallbackCycle(d), d, reference);
  }

  function fallbackCycle(d) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    var end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12);
    return {
      start: isoDate(start),
      end: isoDate(end),
      startDay: Number(d && d.budgetPlan && d.budgetPlan.startDay) || 1
    };
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function cycleLabel(cycle) {
    return safeCall(window.moneyBudgetCycleLabel, prettyDate(cycle.start) + ' - ' + prettyDate(cycle.end), cycle);
  }

  function inCycle(value, cycle) {
    if (typeof window.moneyInBudgetCycle === 'function') return window.moneyInBudgetCycle(value, cycle);
    var date = String(value || '').slice(0, 10);
    return !!date && date >= cycle.start && date <= cycle.end;
  }

  function previousCycle(d, cycle) {
    var ref = new Date(cycle.start + 'T12:00:00');
    ref.setDate(ref.getDate() - 1);
    return cycleFor(d, ref);
  }

  function bankData() {
    var data = {};
    try {
      data = typeof _moneyBankData !== 'undefined' ? _moneyBankData : (window._moneyBankData || {});
    } catch (_) {
      data = window._moneyBankData || {};
    }
    return {
      accounts: Array.isArray(data.accounts) ? data.accounts : [],
      transactions: Array.isArray(data.transactions) ? data.transactions : []
    };
  }

  function transactionCategory(d, transaction, isBank) {
    var key = isBank ? 'bank:' + String(transaction.id || transaction.raw_id || '') : 'local:' + String(transaction.id || '');
    var override = (d.transactionCategoryOverrides || {})[key];
    var rule = safeCall(window.moneyRuleCategory, '', d, transaction);
    return normaliseCategory(override || rule || transaction.category || 'Other');
  }

  function collectTransactions(d) {
    var data = bankData();
    var manualAccountNames = new Map((d.accounts || []).map(function (account) {
      return [String(account.id), account.name || ''];
    }));
    var bank = data.transactions.map(function (transaction) {
      return {
        id: 'bank-' + String(transaction.id || ''),
        raw_id: transaction.id,
        desc: safeCall(window.moneyPrettyMerchant, transaction.merchant || transaction.description || 'Bank transaction', transaction.merchant || transaction.description || 'Bank transaction'),
        amount: Math.abs(Number(transaction.amount || 0)),
        type: String(transaction.direction || '').toLowerCase() === 'income' ? 'income' : 'expense',
        category: transactionCategory(d, transaction, true),
        date: String(transaction.timestamp || '').slice(0, 10),
        account_name: transaction.account_name || ''
      };
    });
    var local = (d.money || []).map(function (transaction) {
      return {
        id: 'local-' + String(transaction.id || ''),
        raw_id: transaction.id,
        desc: transaction.desc || transaction.name || 'Transaction',
        amount: Math.abs(Number(transaction.amount || 0)),
        type: transaction.type === 'income' ? 'income' : 'expense',
        category: transactionCategory(d, transaction, false),
        date: String(transaction.date || '').slice(0, 10),
        account_name: transaction.account_name || manualAccountNames.get(String(transaction.account_id || '')) || ''
      };
    });
    return bank.concat(local).sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function planValues(d) {
    var fallback = d.budgetPlan || {};
    var values = safeCall(window.budgetPlanValues, null);
    if (!values || typeof values !== 'object') {
      values = {
        income: Number(fallback.income || 0),
        rent: Number(fallback.rent || 0),
        bills: Number(fallback.regularBills || 0),
        savings: Number(fallback.savings || 0),
        buffer: Number(fallback.buffer || 0),
        investing: Number(fallback.investing || 0),
        extraCredit: Number(fallback.extraCredit || 0),
        credit: (d.creditPlans || []).reduce(function (sum, plan) {
          return sum + Number(plan.monthlyPayment || plan.minimumPayment || 0);
        }, 0)
      };
      values.flexible = values.income - values.rent - values.bills - values.credit - values.buffer - values.savings - values.investing - values.extraCredit;
    }
    Object.keys(values).forEach(function (key) {
      values[key] = Number(values[key] || 0);
    });
    return values;
  }

  function summariseSpending(transactions, cycle) {
    var totals = {};
    var items = {};
    transactions.forEach(function (transaction) {
      if (transaction.type !== 'expense') return;
      if (!inCycle(transaction.date, cycle)) return;
      var category = normaliseCategory(transaction.category);
      if (EXCLUDED.has(category)) return;
      totals[category] = (totals[category] || 0) + Number(transaction.amount || 0);
      (items[category] = items[category] || []).push(transaction);
    });
    return { totals: totals, items: items };
  }

  function buildRows(d, transactions, cycle, previous) {
    var current = summariseSpending(transactions, cycle);
    var last = summariseSpending(transactions, previous);
    var categories = new Set();
    (d.budgets || []).forEach(function (budget) {
      var category = normaliseCategory(budget.category);
      if (!EXCLUDED.has(category)) categories.add(category);
    });
    Object.keys(current.totals).forEach(function (category) { categories.add(category); });
    Object.keys(last.totals).forEach(function (category) { categories.add(category); });
    var budgets = new Map((d.budgets || []).map(function (budget) {
      return [normaliseCategory(budget.category), budget];
    }));
    return Array.from(categories).map(function (category, index) {
      var budget = budgets.get(category) || {};
      var limit = Math.max(0, Number(budget.limit || 0));
      var spent = Math.max(0, Number(current.totals[category] || 0));
      var lastSpent = Math.max(0, Number(last.totals[category] || 0));
      var ratio = limit > 0 ? spent / limit : spent > 0 ? 1 : 0;
      var status = limit > 0 && spent > limit ? 'over' : limit > 0 && ratio >= 0.85 ? 'close' : 'track';
      return {
        category: category,
        limit: limit,
        spent: spent,
        left: limit - spent,
        lastSpent: lastSpent,
        ratio: ratio,
        status: status,
        color: COLORS[index % COLORS.length],
        items: (current.items[category] || []).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
      };
    }).sort(function (a, b) {
      var rank = { over: 0, close: 1, track: 2 };
      return rank[a.status] - rank[b.status] || Math.abs(b.left) - Math.abs(a.left) || a.category.localeCompare(b.category);
    });
  }

  function compareText(row) {
    var diff = row.spent - row.lastSpent;
    if (!row.lastSpent && !row.spent) return 'No spending this cycle';
    if (!row.lastSpent) return 'No last-cycle spending';
    if (Math.abs(diff) < 1) return 'Roughly the same as last cycle';
    return money(Math.abs(diff), 2) + (diff > 0 ? ' more than last cycle' : ' less than last cycle');
  }

  function statusText(row) {
    if (!row.limit) return row.spent ? money(row.spent, 2) + ' spent' : 'No limit yet';
    if (row.left < 0) return money(Math.abs(row.left), 2) + ' over';
    return money(row.left, 2) + ' left';
  }

  function filteredRows(rows) {
    if (state.filter === 'over') return rows.filter(function (row) { return row.status === 'over'; });
    if (state.filter === 'close') return rows.filter(function (row) { return row.status === 'close'; });
    if (state.filter === 'track') return rows.filter(function (row) { return row.status === 'track'; });
    return rows;
  }

  function chooseSelected(rows) {
    if (state.selected && rows.some(function (row) { return row.category === state.selected; })) return state.selected;
    var priority = rows.find(function (row) { return row.status === 'over' && row.category === 'Subscriptions'; }) ||
      rows.find(function (row) { return row.status === 'over'; }) ||
      rows.find(function (row) { return row.status === 'close'; }) ||
      rows[0];
    state.selected = priority ? priority.category : '';
    return state.selected;
  }

  function totalSummary(rows, values) {
    var allocated = rows.reduce(function (sum, row) { return sum + Number(row.limit || 0); }, 0);
    var spent = rows.reduce(function (sum, row) { return sum + Number(row.spent || 0); }, 0);
    var left = allocated ? allocated - spent : Number(values.flexible || 0);
    var over = rows.filter(function (row) { return row.status === 'over'; }).length;
    var close = rows.filter(function (row) { return row.status === 'close'; }).length;
    return { allocated: allocated, spent: spent, left: left, over: over, close: close };
  }

  function renderChecks(values) {
    var bills = Number(values.rent || 0) + Number(values.bills || 0);
    var credit = Number(values.credit || 0) + Number(values.extraCredit || 0);
    return [
      ['Income', money(values.income, 0), 'This cycle'],
      ['Bills', money(bills, 0), 'Regular payments'],
      ['Credit payments', money(credit, 0), 'Planned this month']
    ].map(function (item) {
      return '<div class="df-budget-check"><small>' + esc(item[0]) + '</small><span>' + item[1] + '</span><b>' + esc(item[2]) + '</b></div>';
    }).join('');
  }

  function rowHtml(row, index) {
    var pct = row.limit ? Math.min(100, Math.max(3, row.spent / row.limit * 100)) : row.spent ? 100 : 0;
    var encoded = encodeURIComponent(row.category).replace(/'/g, '%27');
    var barColor = row.status === 'over' ? '#ef5d6f' : row.status === 'close' ? '#f2b93b' : row.color;
    return '<button type="button" class="df-budget-row ' + (state.selected === row.category ? 'active' : '') + '" onclick="dayframeBudgetSelectCategory(\'' + encoded + '\')">' +
      '<span class="df-budget-row-top"><span class="df-budget-row-title"><i class="df-budget-dot" style="background:' + row.color + '"></i><strong>' + esc(row.category) + '</strong></span><span class="df-budget-status ' + row.status + '">' + statusText(row) + '</span></span>' +
      '<span class="df-budget-row-bar"><i style="width:' + pct.toFixed(1) + '%;background:' + barColor + '"></i></span>' +
      '<span class="df-budget-row-meta"><span>' + money(row.spent, 2) + (row.limit ? ' of ' + money(row.limit, 0) : ' spent') + '</span><span>' + esc(compareText(row)) + '</span></span>' +
      '</button>';
  }

  function filterButton(filter, label, count) {
    return '<button type="button" class="df-budget-filter ' + (state.filter === filter ? 'active' : '') + '" onclick="dayframeBudgetFilter(\'' + filter + '\')">' + esc(label) + (count != null ? ' ' + count : '') + '</button>';
  }

  function aiButtonLabel() {
    return aiBusy ? 'Working...' : 'Draft budgets';
  }

  function aiStatusHtml() {
    return aiMessage ? '<div class="df-budget-ai-note">' + esc(aiMessage) + '</div>' : '';
  }

  function detailHtml(row) {
    if (!row) {
      return '<section class="df-budget-detail"><div class="df-budget-empty"><strong>No categories yet</strong><br>Set your income and category limits to start tracking the cycle.</div></section>';
    }
    var encoded = encodeURIComponent(row.category).replace(/'/g, '%27');
    var recent = row.items.slice(0, 5).map(function (item) {
      return '<div class="df-recent-row"><span><strong>' + esc(item.desc) + '</strong><small>' + esc(prettyDate(item.date)) + (item.account_name ? ' - ' + esc(item.account_name) : '') + '</small></span><b>-' + money(item.amount, 2) + '</b></div>';
    }).join('') || '<div class="df-budget-empty">No payments in this category this cycle.</div>';
    return '<section class="df-budget-detail">' +
      '<div class="df-budget-detail-head"><div><span class="df-detail-eyebrow">Category detail</span><h3>' + esc(row.category) + '</h3></div><div class="df-detail-actions"><button type="button" class="df-detail-button secondary" onclick="dayframeBudgetEditCategory(\'' + encoded + '\')">Edit limit</button><button type="button" class="df-detail-button" onclick="dayframeBudgetOpenTransactions(\'' + encoded + '\')">Transactions</button></div></div>' +
      '<div class="df-detail-grid"><div class="df-detail-stat"><small>Spent</small><strong>' + money(row.spent, 2) + '</strong></div><div class="df-detail-stat"><small>Budget</small><strong>' + (row.limit ? money(row.limit, 0) : 'No limit') + '</strong></div><div class="df-detail-stat"><small>Last cycle</small><strong>' + money(row.lastSpent, 2) + '</strong></div></div>' +
      '<span class="df-detail-eyebrow">Recent payments</span><div class="df-recent-list">' + recent + '</div>' +
      '</section>';
  }

  function emptyHtml(values) {
    return '<div class="df-budget-shell"><div class="df-budget-header"><div><span class="df-budget-kicker">Budget</span><h2>Budget</h2><p>Income, bills, credit and category limits in one place.</p></div><div class="df-budget-actions"><button type="button" class="df-budget-action" onclick="dayframeBudgetToggleSetup(true)">Plan budget</button><button type="button" class="df-budget-action primary" onclick="dayframeBudgetAskAi()">' + aiButtonLabel() + '</button></div></div>' + aiStatusHtml() +
      '<section class="df-budget-top"><div class="df-budget-total"><div><small>Left this cycle</small><strong>' + money(Number(values.flexible || 0), 0) + '</strong></div><div class="df-budget-meter"><i style="width:0%"></i></div><div class="df-budget-total-foot"><span class="df-budget-pill">No categories yet</span></div></div><div class="df-budget-checks">' + renderChecks(values) + '</div></section>' +
      '<div class="df-budget-empty"><strong>No category limits yet</strong><br>Use Plan budget or let Dayframe draft category limits.</div></div>';
  }

  function renderBudgetRedesign() {
    var pane = $('money-pane-budget');
    if (!pane) return;
    injectStyle();
    syncBudgetPageState();
    pane.classList.add('df-budget-applied');
    var root = $('df-budget-redesign');
    if (!root) {
      root = document.createElement('div');
      root.id = 'df-budget-redesign';
      pane.insertBefore(root, pane.firstElementChild || null);
    }
    var d = safeCall(window.hubLoad, {});
    d.budgets = Array.isArray(d.budgets) ? d.budgets : [];
    d.money = Array.isArray(d.money) ? d.money : [];
    d.accounts = Array.isArray(d.accounts) ? d.accounts : [];
    d.creditPlans = Array.isArray(d.creditPlans) ? d.creditPlans : [];
    d.budgetPlan = d.budgetPlan || {};
    var cycle = cycleFor(d);
    var previous = previousCycle(d, cycle);
    var values = planValues(d);
    var rows = buildRows(d, collectTransactions(d), cycle, previous);
    chooseSelected(rows);
    var visibleRows = filteredRows(rows);
    var selected = rows.find(function (row) { return row.category === state.selected; }) || visibleRows[0] || rows[0];
    var totals = totalSummary(rows, values);
    var usedPct = totals.allocated ? Math.min(100, Math.max(0, totals.spent / totals.allocated * 100)) : 0;
    if (!rows.length) {
      root.innerHTML = emptyHtml(values);
      return;
    }
    var footLabel = totals.over ? totals.over + ' over budget' : totals.close ? totals.close + ' close to limit' : 'On track';
    var footClass = totals.over ? ' warning' : '';
    var leftLabel = totals.left < 0 ? money(Math.abs(totals.left), 0) + ' over' : money(totals.left, 0);
    root.innerHTML = '<div class="df-budget-shell">' +
      '<div class="df-budget-header"><div><span class="df-budget-kicker">Budget</span><h2>Budget</h2><p>Income, bills, credit and category limits in one place.</p></div><div class="df-budget-actions"><button type="button" class="df-budget-action" onclick="dayframeBudgetToggleSetup()">Plan budget</button><button type="button" class="df-budget-action primary" onclick="dayframeBudgetAskAi()">' + aiButtonLabel() + '</button></div></div>' + aiStatusHtml() +
      '<section class="df-budget-top"><div class="df-budget-total"><div><small>Left this cycle</small><strong class="' + (totals.left < 0 ? 'over' : '') + '">' + leftLabel + '</strong></div><div class="df-budget-meter"><i style="width:' + usedPct.toFixed(1) + '%"></i></div><div class="df-budget-total-foot"><span class="df-budget-pill' + footClass + '">' + esc(footLabel) + '</span></div></div><div class="df-budget-checks">' + renderChecks(values) + '</div></section>' +
      '<div class="df-budget-main"><section class="df-budget-panel">' +
      '<div class="df-budget-panel-head"><div><span class="df-budget-panel-eyebrow">Categories</span><h3>Categories</h3><p>Tap one to compare budget, spending and last cycle.</p></div><button type="button" class="df-budget-add" onclick="dayframeBudgetAddCategory()">Add category</button></div>' +
      '<div class="df-budget-filters">' +
      filterButton('all', 'All', rows.length) +
      filterButton('over', 'Over', rows.filter(function (row) { return row.status === 'over'; }).length) +
      filterButton('close', 'Close', rows.filter(function (row) { return row.status === 'close'; }).length) +
      filterButton('track', 'On track', rows.filter(function (row) { return row.status === 'track'; }).length) +
      '</div><div class="df-budget-category-list">' + (visibleRows.length ? visibleRows.map(rowHtml).join('') : '<div class="df-budget-empty">No categories match this filter.</div>') + '</div></section>' +
      detailHtml(selected) + '</div></div>';
  }

  function scheduleRender(delay) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderBudgetRedesign, delay == null ? 60 : delay);
  }

  function wrapFunction(name) {
    var fn = window[name];
    if (typeof fn !== 'function' || fn.__dfBudgetWrapped) return false;
    var wrapped = function () {
      var result = fn.apply(this, arguments);
      scheduleRender(80);
      return result;
    };
    wrapped.__dfBudgetWrapped = true;
    window[name] = wrapped;
    return true;
  }

  function install() {
    installAttempts += 1;
    wrapFunction('renderMoney');
    wrapFunction('budgetPlannerPreview');
    var openTab = window.moneyOpenTab;
    if (typeof openTab === 'function' && !openTab.__dfBudgetWrapped) {
      var wrappedOpenTab = function (tab) {
        var result = openTab.apply(this, arguments);
        setTimeout(syncBudgetPageState, 0);
        if (tab === 'budget') scheduleRender(60);
        return result;
      };
      wrappedOpenTab.__dfBudgetWrapped = true;
      window.moneyOpenTab = wrappedOpenTab;
    }
    scheduleRender(installAttempts > 2 ? 120 : 0);
    setTimeout(syncBudgetPageState, 0);
    if (installAttempts < 40 && (!$('money-pane-budget') || typeof window.hubLoad !== 'function')) {
      setTimeout(install, 250);
    }
  }

  window.dayframeBudgetFilter = function (filter) {
    state.filter = filter || 'all';
    scheduleRender(0);
  };

  window.dayframeBudgetSelectCategory = function (encoded) {
    state.selected = normaliseCategory(decodeURIComponent(encoded || ''));
    scheduleRender(0);
  };

  window.dayframeBudgetToggleSetup = function (force) {
    var pane = $('money-pane-budget');
    if (!pane) return;
    var show = typeof force === 'boolean' ? force : !pane.classList.contains('df-budget-show-setup');
    pane.classList.toggle('df-budget-show-setup', show);
    scheduleRender(0);
    if (show) {
      setTimeout(function () {
        pane.querySelector('.budget-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  window.dayframeBudgetEditPayday = function () {
    if (typeof window.dayframeBudgetOpenSetupPage === 'function') {
      window.dayframeBudgetOpenSetupPage({ focusId: 'budget-cycle-start' });
      return;
    }
    window.dayframeBudgetToggleSetup(true);
    setTimeout(function () {
      var input = $('budget-cycle-start');
      if (input) input.focus({ preventScroll: true });
    }, 120);
  };

  window.dayframeBudgetAskAi = async function () {
    if (aiBusy) return;
    if (typeof window.buildSuggestedBudget !== 'function') {
      aiMessage = 'Plan budget is available if you need to add income, bills or category limits.';
      scheduleRender(0);
      return;
    }
    var values = planValues(safeCall(window.hubLoad, {}));
    if (!Number(values.income || 0)) {
      aiMessage = 'Add your monthly income in Plan budget first, then Dayframe can draft category limits.';
      scheduleRender(0);
      return;
    }
    aiBusy = true;
    aiMessage = 'Dayframe is drafting category limits from your income, bills, credit plan and spending.';
    scheduleRender(0);
    try {
      await window.buildSuggestedBudget();
      aiMessage = 'Budget draft added. Check the categories below and edit anything that does not fit.';
    } catch (error) {
      aiMessage = 'Could not draft budgets right now. Your current budget is still safe.';
    } finally {
      aiBusy = false;
      scheduleRender(0);
      setTimeout(function () {
        aiMessage = '';
        scheduleRender(0);
      }, 5500);
    }
  };

  window.dayframeBudgetAddCategory = function () {
    window.dayframeBudgetToggleSetup(true);
    setTimeout(function () {
      if (typeof window.toggleLifeForm === 'function') window.toggleLifeForm('money-budget-form', true);
      var input = $('money-budget-category');
      if (input) input.focus({ preventScroll: true });
    }, 120);
  };

  window.dayframeBudgetEditCategory = function (encoded) {
    var category = normaliseCategory(decodeURIComponent(encoded || ''));
    window.dayframeBudgetToggleSetup(true);
    setTimeout(function () {
      var d = safeCall(window.hubLoad, {});
      var match = (d.budgets || []).find(function (budget) {
        return normaliseCategory(budget.category) === category;
      });
      if (match && typeof window.editBudgetItem === 'function') {
        window.editBudgetItem(match.id);
        return;
      }
      if (typeof window.toggleLifeForm === 'function') window.toggleLifeForm('money-budget-form', true);
      var input = $('money-budget-category');
      if (input) input.value = category;
      var limit = $('money-budget-limit');
      if (limit) limit.focus({ preventScroll: true });
    }, 120);
  };

  window.dayframeBudgetOpenTransactions = function (encoded) {
    var category = normaliseCategory(decodeURIComponent(encoded || ''));
    if (typeof window.moneyOpenTransactions === 'function') {
      window.moneyOpenTransactions(category, 'cycle');
      return;
    }
    if (typeof window.moneyOpenTab === 'function') window.moneyOpenTab('transactions');
    if (typeof window.moneySetTransactionCategory === 'function') window.moneySetTransactionCategory(category);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
