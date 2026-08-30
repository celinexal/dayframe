(function () {
  if (window.__dayframeBudgetLimitsEditorLoaded) return;
  window.__dayframeBudgetLimitsEditorLoaded = true;

  var renderTimer = 0;
  var observer = null;
  var EXCLUDED = [
    'Transfer',
    'Transfers',
    'Savings & Investments',
    'Salary',
    'Income',
    'Rent',
    'Mortgage',
    'Council Tax',
    'Bills',
    'Bill',
    'Bills & Utilities',
    'Bills and Utilities',
    'Utilities',
    'Regular Bills',
    'Insurance',
    'Phone',
    'Internet',
    'Broadband',
    'Dental Plan',
    'Credit Balance',
    'Credit Card',
    'Credit Cards',
    'Credit Payment',
    'Credit Payments',
    'Debt',
    'Debts',
    'Loan',
    'Loans',
    'BNPL',
    'PayPal Credit',
    'Paypal Credit',
    'Klarna',
    'Clearpay'
  ];
  var DEFAULT_LIMITS = [
    ['Groceries', 0.30],
    ['Transport', 0.16],
    ['Shopping', 0.14],
    ['Eating Out', 0.11],
    ['Subscriptions', 0.10],
    ['Entertainment', 0.08],
    ['Beauty', 0.06],
    ['Other', 0.05]
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function normaliseCategory(value) {
    try {
      if (typeof window.moneyNormaliseCategory === 'function') return window.moneyNormaliseCategory(value);
    } catch (_) {}
    return text(value) || 'Other';
  }

  function categoryKey(value) {
    return normaliseCategory(value)
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isEverydayCategory(value) {
    var key = categoryKey(value);
    return !EXCLUDED.some(function (label) {
      return categoryKey(label) === key;
    });
  }

  function money(value, digits) {
    try {
      if (typeof window.hubMoney === 'function') return window.hubMoney(value, digits == null ? 0 : digits);
    } catch (_) {}
    var amount = Number(value || 0);
    return '&pound;' + amount.toLocaleString('en-GB', {
      minimumFractionDigits: digits == null ? 0 : digits,
      maximumFractionDigits: digits == null ? 0 : digits
    });
  }

  function loadData() {
    try {
      return typeof window.hubLoad === 'function' ? window.hubLoad() : {};
    } catch (_) {
      return {};
    }
  }

  function saveData(data, message) {
    var result = Promise.resolve(false);
    try {
      if (typeof window.hubSaveImmediate === 'function') result = window.hubSaveImmediate(data);
      else if (typeof window.hubSave === 'function') {
        window.hubSave(data);
        result = Promise.resolve(true);
      }
    } catch (_) {}
    try {
      if (typeof window.renderMoney === 'function') window.renderMoney();
      if (typeof window.renderHome === 'function') window.renderHome();
      if (message && typeof window.hubToast === 'function') window.hubToast(message);
    } catch (_) {}
    return result;
  }

  function planValues(data) {
    try {
      if (typeof window.budgetPlanValues === 'function') return window.budgetPlanValues();
    } catch (_) {}
    data = data || loadData();
    var plan = data.budgetPlan || {};
    var credit = (data.creditPlans || []).reduce(function (sum, item) {
      return sum + Math.max(0, Number(item.monthlyPayment || item.minimumPayment || 0));
    }, 0);
    var values = {
      income: Math.max(0, Number(plan.income || 0)),
      rent: Math.max(0, Number(plan.rent || 0)),
      bills: Math.max(0, Number(plan.regularBills || 0)),
      savings: Math.max(0, Number(plan.savings || 0)),
      buffer: Math.max(0, Number(plan.buffer || 0)),
      investing: Math.max(0, Number(plan.investing || 0)),
      extraCredit: Math.max(0, Number(plan.extraCredit || 0)),
      credit: credit
    };
    values.availableAfterFixed = values.income - values.rent - values.bills - values.credit - values.buffer;
    values.flexible = values.availableAfterFixed - values.savings - values.investing - values.extraCredit;
    return values;
  }

  function budgetCapacity(data) {
    var values = planValues(data);
    return Math.max(0, Number(values.flexible || 0));
  }

  function spendingPattern(data) {
    try {
      if (typeof window.moneyBudgetPattern === 'function') return window.moneyBudgetPattern(data || loadData()) || {};
    } catch (_) {}
    return {};
  }

  function knownCategories(data) {
    var seen = {};
    var categories = [];
    function add(category) {
      category = normaliseCategory(category);
      var key = categoryKey(category);
      if (!category || seen[key] || !isEverydayCategory(category)) return;
      seen[key] = true;
      categories.push(category);
    }
    (data.budgets || []).forEach(function (budget) { add(budget.category); });
    Object.keys(spendingPattern(data)).forEach(add);
    DEFAULT_LIMITS.forEach(function (item) { add(item[0]); });
    return categories;
  }

  function currentLimitRows(data) {
    data.budgets = Array.isArray(data.budgets) ? data.budgets : [];
    var byKey = {};
    data.budgets.forEach(function (budget) {
      if (!isEverydayCategory(budget.category)) return;
      byKey[categoryKey(budget.category)] = {
        category: normaliseCategory(budget.category),
        limit: Math.max(0, Number(budget.limit || 0))
      };
    });
    Object.keys(spendingPattern(data)).forEach(function (category) {
      if (!isEverydayCategory(category)) return;
      var key = categoryKey(category);
      if (!byKey[key]) byKey[key] = { category: normaliseCategory(category), limit: 0 };
    });
    return Object.keys(byKey).map(function (key) { return byKey[key]; }).sort(function (a, b) {
      return a.category.localeCompare(b.category);
    });
  }

  function closeEditor() {
    var existing = document.querySelector('.df-limits-backdrop');
    if (existing) existing.remove();
  }

  function rowHtml(row) {
    return '<div class="df-limits-row">' +
      '<label><span>Category</span><input class="life-input" data-df-limit-category list="df-budget-limit-category-options" value="' + esc(row && row.category || '') + '" placeholder="e.g. Groceries"></label>' +
      '<label><span>Limit</span><input class="life-input" data-df-limit-amount type="number" step="0.01" min="0" inputmode="decimal" value="' + esc(formatInput(row && row.limit)) + '" placeholder="0.00"></label>' +
      '<button type="button" class="df-limits-remove" data-df-limit-remove aria-label="Remove category">Remove</button>' +
      '</div>';
  }

  function formatInput(value) {
    var amount = Number(value || 0);
    return amount ? String(Math.round(amount * 100) / 100) : '';
  }

  function readRows(modal) {
    var rows = [];
    var seen = {};
    modal.querySelectorAll('.df-limits-row').forEach(function (row) {
      var raw = text(row.querySelector('[data-df-limit-category]')?.value);
      if (!raw) return;
      var category = normaliseCategory(raw);
      if (!isEverydayCategory(category)) return;
      var key = categoryKey(category);
      if (seen[key]) return;
      seen[key] = true;
      rows.push({
        category: category,
        limit: Math.max(0, Number(row.querySelector('[data-df-limit-amount]')?.value) || 0)
      });
    });
    return rows;
  }

  function rowsTotal(rows) {
    return rows.reduce(function (sum, row) { return sum + Number(row.limit || 0); }, 0);
  }

  function updateSummary(modal) {
    var data = loadData();
    var capacity = budgetCapacity(data);
    var total = rowsTotal(readRows(modal));
    var difference = capacity - total;
    var summary = modal.querySelector('[data-df-limits-summary]');
    if (!summary) return;
    summary.innerHTML =
      '<div><span>Available</span><strong>' + money(capacity, 0) + '</strong></div>' +
      '<div><span>Limits total</span><strong>' + money(total, 0) + '</strong></div>' +
      '<div class="' + (difference < 0 ? 'over' : '') + '"><span>' + (difference < 0 ? 'Over' : 'Unassigned') + '</span><strong>' + money(Math.abs(difference), 0) + '</strong></div>';
  }

  function setStatus(modal, message, tone) {
    var status = modal.querySelector('[data-df-limits-status]');
    if (!status) return;
    status.textContent = message || '';
    status.className = 'df-limits-status ' + (tone || '');
  }

  function setRows(modal, rows) {
    var list = modal.querySelector('[data-df-limits-list]');
    if (!list) return;
    list.innerHTML = (rows.length ? rows : [{ category: '', limit: 0 }]).map(rowHtml).join('');
    updateSummary(modal);
  }

  function addBlankRow(modal) {
    var list = modal.querySelector('[data-df-limits-list]');
    if (!list) return;
    list.insertAdjacentHTML('beforeend', rowHtml({ category: '', limit: 0 }));
    var last = list.querySelector('.df-limits-row:last-child [data-df-limit-category]');
    if (last) last.focus();
    updateSummary(modal);
  }

  function defaultWeight(category) {
    var key = categoryKey(category);
    var match = DEFAULT_LIMITS.find(function (item) { return categoryKey(item[0]) === key; });
    return match ? match[1] : 0.05;
  }

  function roundFive(value) {
    return Math.max(0, Math.round(Number(value || 0) / 5) * 5);
  }

  function localSuggestedRows(data) {
    var capacity = budgetCapacity(data);
    var pattern = spendingPattern(data);
    var currentRows = currentLimitRows(data);
    var currentByKey = {};
    currentRows.forEach(function (row) { currentByKey[categoryKey(row.category)] = row.limit; });
    var categories = knownCategories(data).slice(0, 10);
    var currentTotal = rowsTotal(currentRows);
    var spentTotal = Object.values(pattern).reduce(function (sum, amount) { return sum + Number(amount || 0); }, 0);
    var target = capacity || currentTotal || spentTotal || 0;
    var hasCreditPressure = (data.creditPlans || []).some(function (plan) {
      return Number(plan.balance || 0) > 0 && Number(plan.apr || 0) >= 15;
    });
    var reserve = hasCreditPressure && capacity > 150 ? Math.min(100, Math.round(capacity * 0.1 / 5) * 5) : 0;
    target = Math.max(0, target - reserve);
    var weighted = categories.map(function (category) {
      var key = categoryKey(category);
      var spent = Math.max(0, Number(pattern[category] || 0));
      var current = Math.max(0, Number(currentByKey[key] || 0));
      return {
        category: category,
        weight: spent * 0.7 + current * 0.25 + target * defaultWeight(category) * 0.05
      };
    }).filter(function (row) {
      return row.weight > 0 || categories.length <= DEFAULT_LIMITS.length;
    });
    var weightTotal = weighted.reduce(function (sum, row) { return sum + row.weight; }, 0) || 1;
    var rows = weighted.map(function (row) {
      return {
        category: row.category,
        limit: roundFive(target * row.weight / weightTotal)
      };
    }).filter(function (row) {
      return row.limit > 0;
    });
    if (!rows.length && target > 0) {
      rows = DEFAULT_LIMITS.map(function (item) {
        return { category: item[0], limit: roundFive(target * item[1]) };
      }).filter(function (row) { return row.limit > 0; });
    }
    var total = rowsTotal(rows);
    var safety = 0;
    while (total > target && safety < 1000 && rows.some(function (row) { return row.limit > 0; })) {
      rows.sort(function (a, b) { return b.limit - a.limit; });
      rows[0].limit = Math.max(0, rows[0].limit - 5);
      total = rowsTotal(rows);
      safety += 1;
    }
    return {
      rows: rows.filter(function (row) { return row.limit > 0; }).sort(function (a, b) { return a.category.localeCompare(b.category); }),
      note: reserve ? 'Suggested limits leave ' + stripTags(money(reserve, 0)) + ' unassigned because credit balances are part of the plan.' : 'Suggested limits use your current spending pattern and the money left after fixed costs, goals and credit payments.'
    };
  }

  function stripTags(value) {
    var div = document.createElement('div');
    div.innerHTML = value;
    return div.textContent || div.innerText || '';
  }

  function parseAiRows(answer, data) {
    var match = String(answer || '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON budget limits returned');
    var parsed = JSON.parse(match[0]);
    var raw = Array.isArray(parsed.categories) ? parsed.categories : [];
    var capacity = budgetCapacity(data);
    var rows = raw.map(function (item) {
      return {
        category: normaliseCategory(String(item.category || '').slice(0, 45)),
        limit: Math.max(0, Math.round(Number(item.limit || 0)))
      };
    }).filter(function (row) {
      return row.category && row.limit > 0 && isEverydayCategory(row.category);
    }).slice(0, 12);
    var total = rowsTotal(rows);
    if (capacity > 0 && total > capacity && total > 0) {
      rows = rows.map(function (row) {
        return { category: row.category, limit: Math.max(1, Math.floor(row.limit * capacity / total)) };
      });
    }
    if (rows.length < 2) throw new Error('Too few useful categories');
    return {
      rows: rows.sort(function (a, b) { return a.category.localeCompare(b.category); }),
      note: String(parsed.note || 'Suggested from income, fixed costs, goals, credit payments and recent category spending.').slice(0, 240)
    };
  }

  async function suggestLimits(modal) {
    var data = loadData();
    var capacity = budgetCapacity(data);
    var pattern = spendingPattern(data);
    var payload = {
      available_for_category_limits: Math.round(capacity),
      current_limits: currentLimitRows(data).map(function (row) {
        return { category: row.category, limit: Math.round(row.limit) };
      }),
      spending_this_cycle: Object.fromEntries(Object.entries(pattern).map(function (entry) {
        return [entry[0], Math.round(Number(entry[1] || 0))];
      })),
      plan: {
        income: Math.round(planValues(data).income || 0),
        fixed_costs: Math.round((planValues(data).rent || 0) + (planValues(data).bills || 0)),
        planned_credit_payments: Math.round((planValues(data).credit || 0) + (planValues(data).extraCredit || 0)),
        savings_goals: Math.round((planValues(data).savings || 0) + (planValues(data).buffer || 0)),
        optional_investing: Math.round(planValues(data).investing || 0)
      },
      credit_balances: (data.creditPlans || []).map(function (plan) {
        return {
          name: plan.name || 'Credit',
          balance: Math.round(Number(plan.balance || 0)),
          apr: Number(plan.apr || 0),
          minimum_payment: Math.round(Number(plan.minimumPayment || 0)),
          planned_payment: Math.round(Number(plan.monthlyPayment || 0))
        };
      }).slice(0, 8)
    };
    setStatus(modal, 'Thinking about the limits...', '');
    try {
      if (typeof window.callClaude !== 'function') throw new Error('AI unavailable');
      var answer = await window.callClaude('You are helping a UK user set everyday category budget limits. Return ONLY valid JSON in this shape: {"categories":[{"category":"Groceries","limit":260}],"note":"one short reason"}. Keep the total category limits within available_for_category_limits when that value is above zero. Fixed costs, savings goals, optional investing and planned credit payments are already listed, so do not create categories for bills, rent, credit cards, transfers, savings, investing, Klarna or Clearpay. Use current spending and existing limits, but if credit balances look expensive, leave a little money unassigned rather than filling every pound. No financial product recommendations. DATA: ' + JSON.stringify(payload));
      var ai = parseAiRows(answer, data);
      setRows(modal, ai.rows);
      setStatus(modal, ai.note || 'Suggested limits loaded. Review them, then save.', 'ok');
    } catch (_) {
      var smart = localSuggestedRows(data);
      setRows(modal, smart.rows);
      setStatus(modal, smart.note + ' Review them, then save.', 'ok');
    }
  }

  function saveRows(modal) {
    var data = loadData();
    data.budgets = Array.isArray(data.budgets) ? data.budgets : [];
    var rows = readRows(modal);
    if (!rows.length) {
      setStatus(modal, 'Add at least one category limit.', 'error');
      return;
    }
    var preserved = data.budgets.filter(function (budget) {
      return !isEverydayCategory(budget.category);
    });
    var existingByKey = {};
    data.budgets.forEach(function (budget) {
      existingByKey[categoryKey(budget.category)] = budget;
    });
    var base = Date.now();
    var nextRows = rows.map(function (row, index) {
      var category = typeof window.moneyRememberCategory === 'function' ? window.moneyRememberCategory(data, row.category) : normaliseCategory(row.category);
      var previous = existingByKey[categoryKey(category)] || {};
      return {
        id: previous.id || base + index,
        category: category,
        limit: Math.max(0, Math.round(Number(row.limit || 0) * 100) / 100),
        source: previous.source || 'manual'
      };
    });
    data.budgets = preserved.concat(nextRows);
    closeEditor();
    saveData(data, 'Budget limits saved');
  }

  function openEditor(options) {
    options = options || {};
    closeEditor();
    var data = loadData();
    var categories = knownCategories(data);
    var rows = currentLimitRows(data);
    if (options.addBlank || !rows.length) rows.push({ category: '', limit: 0 });
    var backdrop = document.createElement('div');
    backdrop.className = 'df-limits-backdrop';
    backdrop.innerHTML =
      '<div class="df-limits-modal" role="dialog" aria-modal="true" aria-label="Category limits">' +
      '<button type="button" class="df-limits-close" data-df-limits-close>Close</button>' +
      '<div class="df-limits-head"><span>Budget</span><h3>Category limits</h3><p>Set every everyday category limit in one place.</p></div>' +
      '<div class="df-limits-toolbar"><button type="button" class="df-limits-ai" data-df-limits-suggest>AI suggested limits</button><button type="button" class="df-limits-add" data-df-limits-add>Add category</button></div>' +
      '<div class="df-limits-summary" data-df-limits-summary></div>' +
      '<datalist id="df-budget-limit-category-options">' + categories.map(function (category) { return '<option value="' + esc(category) + '"></option>'; }).join('') + '</datalist>' +
      '<div class="df-limits-list" data-df-limits-list>' + rows.map(rowHtml).join('') + '</div>' +
      '<div class="df-limits-status" data-df-limits-status></div>' +
      '<div class="df-limits-actions"><button type="button" class="life-btn-secondary" data-df-limits-close>Cancel</button><button type="button" class="life-btn-primary" data-df-limits-save>Save limits</button></div>' +
      '</div>';
    document.body.appendChild(backdrop);
    updateSummary(backdrop);
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop || event.target.hasAttribute('data-df-limits-close')) closeEditor();
      if (event.target.hasAttribute('data-df-limits-add')) addBlankRow(backdrop);
      if (event.target.hasAttribute('data-df-limits-save')) saveRows(backdrop);
      if (event.target.hasAttribute('data-df-limits-suggest')) suggestLimits(backdrop);
      if (event.target.hasAttribute('data-df-limit-remove')) {
        var row = event.target.closest('.df-limits-row');
        if (row) row.remove();
        if (!backdrop.querySelector('.df-limits-row')) addBlankRow(backdrop);
        updateSummary(backdrop);
      }
    });
    backdrop.addEventListener('input', function (event) {
      if (event.target.matches('[data-df-limit-category],[data-df-limit-amount]')) updateSummary(backdrop);
    });
    setTimeout(function () {
      var focus = backdrop.querySelector('[data-df-limit-amount], [data-df-limit-category]');
      if (focus) focus.focus({ preventScroll: true });
      if (options.suggest) suggestLimits(backdrop);
    }, 30);
  }

  function injectStyle() {
    if ($('df-budget-limits-editor-style')) return;
    var style = document.createElement('style');
    style.id = 'df-budget-limits-editor-style';
    style.textContent = [
      '.df-budget-limit-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}',
      '#df-budget-redesign .df-budget-limit-actions .df-budget-add{background:#fff;color:#6d5df0}',
      '#df-budget-redesign .df-detail-actions .df-detail-button.secondary[onclick*="dayframeBudgetEditCategory"]{display:none!important}',
      '.df-budget-limit-primary,.df-budget-limit-ai{border:1px solid #e3e7f2;border-radius:999px;height:36px;padding:0 13px;font:850 12px/1 var(--fd,inherit);cursor:pointer;white-space:nowrap}',
      '.df-budget-limit-primary{background:#151d31;color:#fff;border-color:#151d31}',
      '.df-budget-limit-ai{background:linear-gradient(135deg,#f3f0ff,#fff2f7);color:#6f5ee8;border-color:#e2dafe}',
      '.df-limits-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(17,24,39,.34);display:flex;align-items:center;justify-content:center;padding:18px}',
      '.df-limits-modal{position:relative;width:min(760px,100%);max-height:min(86vh,780px);display:flex;flex-direction:column;border:1px solid #e6eaf4;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(17,25,43,.24);overflow:hidden}',
      '.df-limits-close{position:absolute;right:16px;top:15px;z-index:2;border:1px solid #e3e7f0;border-radius:999px;background:#fff;color:#748096;font:850 11px/1 var(--fd,inherit);padding:8px 10px;cursor:pointer}',
      '.df-limits-head{padding:24px 24px 12px}.df-limits-head span{display:block;color:#7f8a9d;font:850 10px/1 var(--fd,inherit);letter-spacing:.08em;text-transform:uppercase}.df-limits-head h3{margin:7px 0 0;color:#172036;font:900 28px/1 var(--fd,inherit);letter-spacing:0}.df-limits-head p{margin:8px 0 0;color:#7b8798;font:700 13px/1.45 var(--fd,inherit)}',
      '.df-limits-toolbar{display:flex;gap:9px;flex-wrap:wrap;padding:0 24px 16px}.df-limits-ai,.df-limits-add{height:36px;border-radius:999px;padding:0 13px;font:850 12px/1 var(--fd,inherit);cursor:pointer}.df-limits-ai{border:0;background:linear-gradient(135deg,#7565f2,#ff7aa8);color:#fff;box-shadow:0 14px 28px rgba(117,101,242,.18)}.df-limits-add{border:1px solid #e2e6f1;background:#fff;color:#6759e8}',
      '.df-limits-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0 24px 16px}.df-limits-summary div{border:1px solid #e8ecf4;border-radius:16px;padding:12px;background:#fbfcff}.df-limits-summary span{display:block;color:#7f8a9d;font:850 10px/1 var(--fd,inherit);letter-spacing:.06em;text-transform:uppercase}.df-limits-summary strong{display:block;margin-top:8px;color:#172036;font:900 20px/1 var(--fd,inherit);letter-spacing:0}.df-limits-summary .over strong{color:#e64f72}',
      '.df-limits-list{overflow:auto;display:flex;flex-direction:column;gap:9px;padding:0 24px 14px}.df-limits-row{display:grid;grid-template-columns:minmax(180px,1fr) minmax(120px,170px) auto;gap:10px;align-items:end;border:1px solid #e8ecf4;border-radius:18px;background:#fff;padding:12px}.df-limits-row label{display:flex;flex-direction:column;gap:7px;color:#687386;font:850 11px/1.1 var(--fd,inherit);text-transform:uppercase;letter-spacing:.04em}.df-limits-row .life-input{width:100%;box-sizing:border-box}.df-limits-remove{height:38px;border:1px solid #ffe0e4;background:#fff6f7;color:#e05869;border-radius:12px;font:850 11px/1 var(--fd,inherit);cursor:pointer}',
      '.df-limits-status{min-height:20px;margin:0 24px 6px;color:#7d8798;font:750 12px/1.45 var(--fd,inherit)}.df-limits-status.ok{color:#5d6bdc}.df-limits-status.error{color:#e05869}',
      '.df-limits-actions{display:flex;justify-content:flex-end;gap:10px;padding:16px 24px 22px;border-top:1px solid #eef1f7;background:#fbfcff}',
      '@media(max-width:680px){.df-budget-limit-actions{justify-content:flex-start}.df-limits-backdrop{align-items:flex-end;padding:0}.df-limits-modal{max-height:92vh;border-radius:22px 22px 0 0}.df-limits-summary{grid-template-columns:1fr}.df-limits-row{grid-template-columns:1fr}.df-limits-actions{position:sticky;bottom:0}.df-limits-head,.df-limits-toolbar,.df-limits-summary,.df-limits-list{padding-left:16px;padding-right:16px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function installBudgetButtons() {
    injectStyle();
    var root = $('df-budget-redesign');
    if (!root) return;
    root.querySelectorAll('.df-detail-actions .df-detail-button.secondary').forEach(function (button) {
      if (text(button.textContent).toLowerCase() === 'edit limit') button.remove();
    });
    var head = root.querySelector('.df-budget-panel-head');
    if (!head || head.querySelector('.df-budget-limit-actions')) return;
    var oldAdd = head.querySelector('.df-budget-add');
    if (oldAdd) oldAdd.remove();
    var actions = document.createElement('div');
    actions.className = 'df-budget-limit-actions';
    actions.innerHTML =
      '<button type="button" class="df-budget-limit-primary">Edit limits</button>' +
      '<button type="button" class="df-budget-limit-ai">AI suggested limits</button>' +
      '<button type="button" class="df-budget-add">Add category</button>';
    actions.querySelector('.df-budget-limit-primary').addEventListener('click', function () { openEditor(); });
    actions.querySelector('.df-budget-limit-ai').addEventListener('click', function () { openEditor({ suggest: true }); });
    actions.querySelector('.df-budget-add').addEventListener('click', function () { openEditor({ addBlank: true }); });
    head.appendChild(actions);
  }

  function scheduleInstall() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(installBudgetButtons, 40);
  }

  function wrapRenderMoney() {
    var original = window.renderMoney;
    if (typeof original !== 'function' || original.__dfBudgetLimitsWrapped) return false;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      scheduleInstall();
      return result;
    };
    wrapped.__dfBudgetLimitsWrapped = true;
    window.renderMoney = wrapped;
    return true;
  }

  function wrapMoneyPrimaryAction() {
    var original = window.moneyPrimaryAction;
    if (typeof original !== 'function' || original.__dfBudgetLimitsWrapped) return false;
    var wrapped = function () {
      var active = document.querySelector('#pg-money .money-tab.on')?.dataset.moneyTab || '';
      if (active === 'budget') {
        openEditor();
        return;
      }
      return original.apply(this, arguments);
    };
    wrapped.__dfBudgetLimitsWrapped = true;
    window.moneyPrimaryAction = wrapped;
    return true;
  }

  function observeBudget() {
    var root = $('df-budget-redesign');
    if (!root || observer) return;
    observer = new MutationObserver(scheduleInstall);
    observer.observe(root, { childList: true, subtree: true });
  }

  function install() {
    injectStyle();
    window.dayframeBudgetOpenLimitsEditor = function () { openEditor(); };
    window.dayframeBudgetSuggestLimits = function () { openEditor({ suggest: true }); };
    wrapRenderMoney();
    wrapMoneyPrimaryAction();
    installBudgetButtons();
    observeBudget();
  }

  var attempts = 0;
  function boot() {
    attempts += 1;
    install();
    if (attempts < 50 && (!$('df-budget-redesign') || typeof window.renderMoney !== 'function')) setTimeout(boot, 250);
  }

  document.addEventListener('dayframe:money-rendered', scheduleInstall);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
