(function () {
  if (window.__dayframeBudgetFixupsLoaded) return;
  window.__dayframeBudgetFixupsLoaded = true;

  var aiBusy = false;
  var aiMessage = '';
  var tidyTimer = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function syncBankData() {
    try {
      if (typeof _moneyBankData !== 'undefined') window._moneyBankData = _moneyBankData;
    } catch (_) {}
  }

  function budgetIsOpen() {
    var pane = $('money-pane-budget');
    return !!pane && pane.classList.contains('on');
  }

  function syncBudgetFocus() {
    var page = $('pg-money');
    if (page) page.classList.toggle('df-budget-focused', budgetIsOpen());
  }

  function directChild(parent, selector) {
    if (!parent) return null;
    for (var i = 0; i < parent.children.length; i += 1) {
      if (parent.children[i].matches(selector)) return parent.children[i];
    }
    return null;
  }

  function decodeValue(value) {
    try {
      return decodeURIComponent(value || '');
    } catch (_) {
      return value || '';
    }
  }

  function safeHubData() {
    try {
      return typeof window.hubLoad === 'function' ? window.hubLoad() : {};
    } catch (_) {
      return {};
    }
  }

  function countLabel(count, singular, plural) {
    return count + ' ' + (count === 1 ? singular : plural);
  }

  function escapeText(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normaliseCategory(value) {
    if (typeof window.moneyNormaliseCategory === 'function') return window.moneyNormaliseCategory(value);
    var clean = String(value || '').trim();
    return clean || 'Other';
  }

  function moneyOrdinal(value) {
    if (typeof window.moneyOrdinal === 'function') return window.moneyOrdinal(value);
    var n = Number(value) || 1;
    var suffix = n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
    return n + suffix;
  }

  function formatAmount(value) {
    var n = Number(value || 0);
    return n ? String(Math.round(n * 100) / 100) : '';
  }

  function creditPaymentMatchCount(d) {
    try {
      if (typeof window.moneyCreditPaymentSuggestions !== 'function') return 0;
      return (d.accounts || []).filter(function (account) {
        return ['credit-card', 'bnpl'].indexOf(account.type) !== -1;
      }).reduce(function (sum, account) {
        return sum + window.moneyCreditPaymentSuggestions(account, d).length;
      }, 0);
    } catch (_) {
      return 0;
    }
  }

  function hasCreditPlan(d) {
    return (d.creditPlans || []).some(function (plan) {
      return Number(plan.monthlyPayment || plan.minimumPayment || plan.balance || 0) > 0;
    });
  }

  function ensureBudgetSetupPage() {
    var budgetPane = $('money-pane-budget');
    if (!budgetPane) return false;
    budgetPane.classList.add('df-budget-no-inline-setup');
    budgetPane.classList.remove('df-budget-show-setup');

    var tabs = document.querySelector('#pg-money .money-tabs');
    if (tabs) tabs.querySelectorAll('[data-money-tab="budget-setup"]').forEach(function (tab) { tab.remove(); });

    var setupPane = $('money-pane-budget-setup');
    if (!setupPane) {
      setupPane = document.createElement('div');
      setupPane.id = 'money-pane-budget-setup';
      setupPane.className = 'money-pane df-budget-setup-pane';
      budgetPane.insertAdjacentElement('afterend', setupPane);
    } else {
      setupPane.classList.add('df-budget-setup-pane');
    }
    setupPane.classList.remove('on');
    setupPane.setAttribute('hidden', '');

    var builder = directChild(budgetPane, '.budget-builder');
    var lowerGrid = directChild(budgetPane, '.money-pane-grid');
    if (builder) setupPane.appendChild(builder);
    if (lowerGrid) setupPane.appendChild(lowerGrid);
    return true;
  }

  function closeQuickBudgetEditor() {
    var existing = document.querySelector('.df-budget-quick-backdrop');
    if (existing) existing.remove();
  }

  function dayOptions(selected) {
    var current = Math.max(1, Math.min(31, Math.round(Number(selected) || 1)));
    var html = '';
    for (var i = 1; i <= 31; i += 1) {
      html += '<option value="' + i + '"' + (i === current ? ' selected' : '') + '>' + escapeText(moneyOrdinal(i)) + '</option>';
    }
    return html;
  }

  function saveAndRefresh(d, message) {
    if (typeof window.hubSave === 'function') window.hubSave(d);
    if (typeof window.renderMoney === 'function') window.renderMoney();
    tidyBudgetUi();
    if (typeof window.hubToast === 'function' && message) window.hubToast(message);
  }

  function openQuickBudgetEditor(kind, encodedCategory) {
    ensureBudgetSetupPage();
    closeQuickBudgetEditor();
    var d = safeHubData();
    d.budgetPlan = d.budgetPlan || {};
    d.budgets = Array.isArray(d.budgets) ? d.budgets : [];
    var categoryName = normaliseCategory(decodeValue(encodedCategory || ''));
    var existingBudget = d.budgets.find(function (budget) {
      return normaliseCategory(budget.category) === categoryName;
    });
    var title = 'Edit income';
    var intro = 'Update the amount Dayframe uses for this budget cycle.';
    var fields = '<label class="df-budget-quick-field"><span>Monthly income</span><input class="life-input" data-df-budget-field="income" type="number" step="0.01" inputmode="decimal" value="' + escapeText(formatAmount(d.budgetPlan.income)) + '" placeholder="0.00"></label>';

    if (kind === 'payday') {
      title = 'Edit payday';
      intro = 'Choose when this budget cycle starts each month.';
      fields = '<label class="df-budget-quick-field"><span>Budget month starts on</span><select class="life-input" data-df-budget-field="startDay">' + dayOptions(d.budgetPlan.startDay || 1) + '</select></label>';
    } else if (kind === 'category') {
      title = existingBudget ? 'Edit category' : 'Add category';
      intro = 'Set the monthly limit used on the budget screen.';
      fields =
        '<label class="df-budget-quick-field"><span>Category</span><input class="life-input" data-df-budget-field="category" value="' + escapeText(existingBudget ? existingBudget.category : (categoryName === 'Other' && !encodedCategory ? '' : categoryName)) + '" placeholder="e.g. Food"></label>' +
        '<label class="df-budget-quick-field"><span>Monthly limit</span><input class="life-input" data-df-budget-field="limit" type="number" step="0.01" inputmode="decimal" value="' + escapeText(formatAmount(existingBudget ? existingBudget.limit : 0)) + '" placeholder="0.00"></label>';
    }

    var backdrop = document.createElement('div');
    backdrop.className = 'df-budget-quick-backdrop';
    backdrop.innerHTML =
      '<div class="df-budget-quick-modal" role="dialog" aria-modal="true" aria-label="' + escapeText(title) + '">' +
      '<button type="button" class="df-budget-quick-close" data-df-budget-close>Close</button>' +
      '<form class="df-budget-quick-form">' +
      '<span class="df-budget-quick-kicker">Budget</span><h3>' + escapeText(title) + '</h3><p>' + escapeText(intro) + '</p>' +
      fields +
      '<div class="df-budget-quick-actions"><button type="button" class="life-btn-secondary" data-df-budget-close>Cancel</button><button type="submit" class="life-btn-primary">Save</button></div>' +
      '</form></div>';
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop || event.target.hasAttribute('data-df-budget-close')) closeQuickBudgetEditor();
    });
    backdrop.querySelector('form').addEventListener('submit', function (event) {
      event.preventDefault();
      var next = safeHubData();
      next.budgetPlan = next.budgetPlan || {};
      next.budgets = Array.isArray(next.budgets) ? next.budgets : [];
      if (kind === 'payday') {
        var startDay = Math.max(1, Math.min(31, Math.round(Number(backdrop.querySelector('[data-df-budget-field="startDay"]')?.value) || 1)));
        next.budgetPlan.startDay = startDay;
        closeQuickBudgetEditor();
        saveAndRefresh(next, 'Payday updated');
        return;
      }
      if (kind === 'category') {
        var raw = String(backdrop.querySelector('[data-df-budget-field="category"]')?.value || '').trim();
        var limit = Math.max(0, Number(backdrop.querySelector('[data-df-budget-field="limit"]')?.value) || 0);
        if (!raw || !limit) {
          if (typeof window.hubToast === 'function') window.hubToast('Add a category and monthly limit');
          return;
        }
        var category = typeof window.moneyRememberCategory === 'function' ? window.moneyRememberCategory(next, raw) : normaliseCategory(raw);
        var match = next.budgets.find(function (budget) {
          return normaliseCategory(budget.category) === category;
        });
        if (match) {
          match.category = category;
          match.limit = limit;
        } else {
          next.budgets.unshift({ id: Date.now(), category: category, limit: limit, source: 'manual' });
        }
        closeQuickBudgetEditor();
        saveAndRefresh(next, match ? 'Category updated' : 'Category added');
        return;
      }
      var income = Math.max(0, Number(backdrop.querySelector('[data-df-budget-field="income"]')?.value) || 0);
      next.budgetPlan.income = income;
      next.budgetPlan.incomeSource = 'manual';
      closeQuickBudgetEditor();
      saveAndRefresh(next, 'Income updated');
    });
    setTimeout(function () {
      var first = backdrop.querySelector('input,select,button');
      if (first) first.focus({ preventScroll: true });
    }, 30);
  }

  function openBudgetSetupPage(options) {
    options = options || {};
    if (options.focusId === 'budget-cycle-start') return openQuickBudgetEditor('payday');
    if (options.form === 'money-budget-form' || options.category) return openQuickBudgetEditor('category', options.category || '');
    return openQuickBudgetEditor('income');
  }

  function openBillsPage(addNew) {
    if (typeof window.moneyOpenTab === 'function') window.moneyOpenTab('bills');
    setTimeout(function () {
      if (addNew && typeof window.toggleLifeForm === 'function') window.toggleLifeForm('money-bill-form', true);
      var target = addNew ? $('money-bill-form') : $('money-bills-list');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 90);
  }

  function openPaydayEditor() {
    openQuickBudgetEditor('payday');
  }

  function openCreditPlan(addNew) {
    if (typeof window.moneyOpenTab === 'function') window.moneyOpenTab('credit');
    setTimeout(function () {
      if (addNew && typeof window.beginCreditPlanAdd === 'function') window.beginCreditPlanAdd();
      var target = $('money-credit-form') || $('money-credit-list');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
  }

  function openCreditMatches() {
    var d = safeHubData();
    var match = null;
    try {
      if (typeof window.moneyCreditPaymentSuggestions === 'function') {
        match = (d.accounts || []).find(function (account) {
          return ['credit-card', 'bnpl'].indexOf(account.type) !== -1 &&
            window.moneyCreditPaymentSuggestions(account, d).length > 0;
        }) || null;
      }
    } catch (_) {
      match = null;
    }
    if (match && typeof window.moneyOpenAccountDetail === 'function') {
      if (typeof window.moneyOpenTab === 'function') window.moneyOpenTab('accounts');
      setTimeout(function () {
        window.moneyOpenAccountDetail('manual:' + match.id);
      }, 120);
      return;
    }
    openCreditPlan(false);
  }

  function addCheckActions(card, signature, actions) {
    var holder = card.querySelector('.df-budget-check-actions');
    if (holder && holder.dataset.signature === signature) return;
    if (holder) holder.remove();
    holder = document.createElement('div');
    holder.className = 'df-budget-check-actions';
    holder.dataset.signature = signature;
    actions.forEach(function (action) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'df-budget-card-action' + (action.primary ? ' primary' : '');
      button.textContent = action.label;
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        action.handler();
      });
      holder.appendChild(button);
    });
    card.appendChild(holder);
  }

  function hideBillSuggestions() {
    var host = $('money-bill-suggestions');
    var card = host && host.closest ? host.closest('.life-card') : null;
    if (card) card.classList.add('df-hide-bill-suggestions');
  }

  function enhanceBudgetChecks(root) {
    var cards = root ? root.querySelectorAll('.df-budget-check') : [];
    if (!cards.length) return;
    var d = safeHubData();
    var creditCount = creditPaymentMatchCount(d);
    var creditPlanned = hasCreditPlan(d);
    var configs = [
      {
        title: 'Income',
        subtitle: 'This cycle',
        actions: [
          { label: 'Edit', handler: function () { openBudgetSetupPage({ focusId: 'budget-plan-income' }); } },
          { label: 'Edit payday', handler: openPaydayEditor }
        ]
      },
      {
        title: 'Bills',
        subtitle: 'Regular payments',
        actions: [{ label: 'Edit', handler: function () { openBillsPage(false); } }]
      },
      {
        title: 'Credit payments',
        subtitle: creditCount ? countLabel(creditCount, 'possible repayment found', 'possible repayments found') : creditPlanned ? 'Planned this month' : 'No plan yet',
        actions: creditCount ? [
          { label: 'Edit', handler: function () { openCreditPlan(false); } },
          { label: 'Matches', primary: true, handler: openCreditMatches }
        ] : [
          { label: creditPlanned ? 'Edit' : 'Add plan', handler: function () { openCreditPlan(!creditPlanned); } }
        ]
      }
    ];
    configs.forEach(function (config, index) {
      var card = cards[index];
      if (!card) return;
      var label = card.querySelector('small');
      if (label && label.textContent !== config.title) label.textContent = config.title;
      var subtitle = card.querySelector('b');
      if (subtitle && subtitle.textContent !== config.subtitle) subtitle.textContent = config.subtitle;
      var signature = config.title + '|' + config.subtitle + '|' + config.actions.map(function (action) {
        return action.label + ':' + (action.primary ? '1' : '0');
      }).join(',');
      addCheckActions(card, signature, config.actions);
    });
  }

  function injectStyle() {
    if ($('df-budget-fixups-style')) return;
    var style = document.createElement('style');
    style.id = 'df-budget-fixups-style';
    style.textContent = [
      '.money-page.df-budget-focused .money-metrics{display:none!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-top{align-items:start!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-checks{align-self:start!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check{position:relative!important;min-height:92px!important;padding:15px 16px!important;border:1px solid #e7ebf3!important;border-radius:16px!important;background:linear-gradient(180deg,#fff 0%,#fbfcff 100%)!important;box-shadow:0 10px 24px rgba(31,40,65,.055)!important;overflow:hidden!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check:before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,#7866f2,#ff7aa8)}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check:nth-child(2):before{background:linear-gradient(90deg,#38bfa7,#6e8cff)}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check:nth-child(3):before{background:linear-gradient(90deg,#ff9a62,#ff7aa8)}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check small{font-size:10px!important;line-height:1!important;color:#7b879a!important;letter-spacing:.07em!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check span{margin-top:10px!important;font-size:26px!important;line-height:1!important;color:#162036!important;letter-spacing:0!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check b{margin-top:7px!important;font-size:11px!important;line-height:1.25!important;color:#7e8898!important}',
      '@media(max-width:980px){.money-page.df-budget-focused #df-budget-redesign .df-budget-checks{grid-template-columns:repeat(3,minmax(0,1fr))!important}.money-page.df-budget-focused #df-budget-redesign .df-budget-check{min-height:86px!important;padding:13px!important}.money-page.df-budget-focused #df-budget-redesign .df-budget-check span{font-size:22px!important}}',
      '@media(max-width:620px){.money-page.df-budget-focused #df-budget-redesign .df-budget-checks{grid-template-columns:1fr!important}.money-page.df-budget-focused #df-budget-redesign .df-budget-check{min-height:0!important}}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-suggestion{display:none!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-detail-note{display:none!important}',
      '#money-bill-suggestions,.df-hide-bill-suggestions{display:none!important}',
      '#pg-money .money-tab[data-money-tab="budget-setup"],#money-pane-budget-setup.df-budget-setup-pane{display:none!important}',
      '#money-pane-budget.df-budget-no-inline-setup>.budget-builder,#money-pane-budget.df-budget-no-inline-setup>.money-pane-grid{display:none!important}',
      '#money-pane-budget.df-budget-no-inline-setup.df-budget-show-setup>.budget-builder,#money-pane-budget.df-budget-no-inline-setup.df-budget-show-setup>.money-pane-grid{display:none!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check{display:flex!important;flex-direction:column!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check span{white-space:nowrap!important;overflow-wrap:normal!important;word-break:normal!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check-actions{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-card-action{border:1px solid #e2e6f1;background:#fff;color:#6759e8;border-radius:999px;padding:7px 9px;font:850 10px/1 var(--fd,inherit);cursor:pointer}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-card-action.primary{background:#7565f2;border-color:#7565f2;color:#fff}',
      '.df-budget-ai-note{margin-top:10px;border-radius:14px;background:#f4f1ff;color:#6659d9;padding:10px 12px;font:800 11px/1.35 var(--fd,inherit)}',
      '.df-budget-quick-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(16,22,36,.32);display:flex;align-items:center;justify-content:center;padding:18px}',
      '.df-budget-quick-modal{position:relative;width:min(440px,100%);border-radius:22px;border:1px solid #e6eaf4;background:#fff;box-shadow:0 24px 80px rgba(17,25,43,.22);padding:22px}',
      '.df-budget-quick-close{position:absolute;right:14px;top:14px;border:1px solid #e3e7f0;border-radius:999px;background:#fff;color:#748096;font:850 11px/1 var(--fd,inherit);padding:8px 10px;cursor:pointer}',
      '.df-budget-quick-form{display:flex;flex-direction:column;gap:14px}',
      '.df-budget-quick-kicker{color:#7f8a9d;font:850 10px/1 var(--fd,inherit);letter-spacing:.08em;text-transform:uppercase}',
      '.df-budget-quick-form h3{margin:0;color:#172036;font:900 26px/1.05 var(--fd,inherit);letter-spacing:0}',
      '.df-budget-quick-form p{margin:-6px 0 0;color:#79859a;font:700 13px/1.45 var(--fd,inherit)}',
      '.df-budget-quick-field{display:flex;flex-direction:column;gap:7px;color:#5d687b;font:850 12px/1.2 var(--fd,inherit)}',
      '.df-budget-quick-field .life-input{width:100%;box-sizing:border-box}',
      '.df-budget-quick-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}',
      '#df-budget-redesign button[onclick*="dayframeBudgetAskAi"][disabled]{opacity:.68;cursor:wait}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function setAiMessage(message, timeout) {
    aiMessage = message || '';
    tidyBudgetUi();
    if (timeout) {
      setTimeout(function () {
        if (aiMessage === message) {
          aiMessage = '';
          tidyBudgetUi();
        }
      }, timeout);
    }
  }

  function tidyBudgetUi() {
    clearTimeout(tidyTimer);
    tidyTimer = setTimeout(function () {
      syncBankData();
      syncBudgetFocus();
      ensureBudgetSetupPage();
      hideBillSuggestions();
      var root = $('df-budget-redesign');
      if (!root) return;
      observeBudgetRoot();
      var intro = root.querySelector('.df-budget-header p');
      if (intro && intro.textContent !== 'Income, bills, credit and category limits in one place.') {
        intro.textContent = 'Income, bills, credit and category limits in one place.';
      }
      root.querySelectorAll('.df-budget-suggestion').forEach(function (card) {
        card.remove();
      });
      enhanceBudgetChecks(root);
      root.querySelectorAll('button').forEach(function (button) {
        var onclick = button.getAttribute('onclick') || '';
        if (onclick.indexOf('dayframeBudgetToggleSetup') !== -1) {
          button.remove();
          return;
        }
        if (onclick.indexOf('dayframeBudgetAskAi') === -1) return;
        var label = aiBusy ? 'Working...' : 'Draft budgets';
        if (button.textContent !== label) button.textContent = label;
        button.disabled = aiBusy;
        button.setAttribute('aria-busy', aiBusy ? 'true' : 'false');
      });
      var note = $('df-budget-fixup-ai-note');
      if (aiMessage) {
        if (!note) {
          note = document.createElement('div');
          note.id = 'df-budget-fixup-ai-note';
          note.className = 'df-budget-ai-note';
          var header = root.querySelector('.df-budget-header');
          if (header) header.insertAdjacentElement('afterend', note);
          else root.insertBefore(note, root.firstChild || null);
        }
        if (note.textContent !== aiMessage) note.textContent = aiMessage;
      } else if (note) {
        note.remove();
      }
    }, 25);
  }

  function wrapRenderMoney() {
    var original = window.renderMoney;
    if (typeof original !== 'function' || original.__dfBudgetFixupsWrapped) return false;
    var wrapped = function () {
      syncBankData();
      var result = original.apply(this, arguments);
      syncBankData();
      ensureBudgetSetupPage();
      tidyBudgetUi();
      setTimeout(tidyBudgetUi, 120);
      return result;
    };
    wrapped.__dfBudgetFixupsWrapped = true;
    window.renderMoney = wrapped;
    return true;
  }

  function wrapMoneyOpenTab() {
    var original = window.moneyOpenTab;
    if (typeof original !== 'function' || original.__dfBudgetFixupsWrapped) return false;
    var wrapped = function () {
      if (arguments[0] === 'budget-setup') arguments[0] = 'budget';
      var result = original.apply(this, arguments);
      syncBankData();
      ensureBudgetSetupPage();
      syncBudgetFocus();
      tidyBudgetUi();
      return result;
    };
    wrapped.__dfBudgetFixupsWrapped = true;
    window.moneyOpenTab = wrapped;
    return true;
  }

  function wrapMoneyLoadBankData() {
    var original = window.moneyLoadBankData;
    if (typeof original !== 'function' || original.__dfBudgetFixupsWrapped) return false;
    var wrapped = async function () {
      var result = await original.apply(this, arguments);
      syncBankData();
      if (budgetIsOpen() && typeof window.renderMoney === 'function') window.renderMoney();
      else tidyBudgetUi();
      return result;
    };
    wrapped.__dfBudgetFixupsWrapped = true;
    window.moneyLoadBankData = wrapped;
    return true;
  }

  function wrapMoneyRuleCategory() {
    var original = window.moneyRuleCategory;
    if (typeof original !== 'function' || original.__dfBudgetFixupsWrapped) return false;
    var wrapped = function (d, transaction) {
      var category = transaction && typeof transaction.category === 'string' ? transaction.category.trim() : '';
      if (category && !/^other$/i.test(category) && !/^uncategor/i.test(category)) return category;
      return original.apply(this, arguments);
    };
    wrapped.__dfBudgetFixupsWrapped = true;
    window.moneyRuleCategory = wrapped;
    return true;
  }

  function wrapMoneyPrimaryAction() {
    var original = window.moneyPrimaryAction;
    if (typeof original !== 'function' || original.__dfBudgetFixupsWrapped) return false;
    var wrapped = function () {
      var active = document.querySelector('#pg-money .money-tab.on')?.dataset.moneyTab || '';
      if (active === 'budget') {
        openQuickBudgetEditor('category');
        return;
      }
      return original.apply(this, arguments);
    };
    wrapped.__dfBudgetFixupsWrapped = true;
    window.moneyPrimaryAction = wrapped;
    return true;
  }

  function installBudgetSetupPageActions() {
    window.dayframeBudgetOpenSetupPage = function (options) {
      openBudgetSetupPage(options);
    };
    window.dayframeBudgetToggleSetup = function () {
      openQuickBudgetEditor('income');
    };
    window.dayframeBudgetOpenIncomeEditor = function () {
      openQuickBudgetEditor('income');
    };
    window.dayframeBudgetOpenPaydayEditor = function () {
      openQuickBudgetEditor('payday');
    };
    window.dayframeBudgetOpenCategoryEditor = function (encoded) {
      openQuickBudgetEditor('category', encoded || '');
    };
    window.dayframeBudgetAddCategory = function () {
      openQuickBudgetEditor('category');
    };
    window.dayframeBudgetEditPayday = function () {
      openPaydayEditor();
    };
    window.dayframeBudgetEditCategory = function (encoded) {
      var category = decodeValue(encoded).trim();
      openQuickBudgetEditor('category', category);
    };
  }

  function installAiAction() {
    window.dayframeBudgetAskAi = async function () {
      if (aiBusy) return;
      syncBankData();
      if (typeof window.buildSuggestedBudget !== 'function') {
        setAiMessage('Add income, bills or category limits before drafting budgets.', 5000);
        return;
      }
      var values = {};
      try {
        values = typeof window.budgetPlanValues === 'function' ? window.budgetPlanValues() : {};
      } catch (_) {
        values = {};
      }
      if (!Number(values.income || 0)) {
        setAiMessage('Add your monthly income first, then Dayframe can draft category limits.', 6500);
        return;
      }
      var pane = $('money-pane-budget');
      if (pane) pane.classList.remove('df-budget-show-setup');
      aiBusy = true;
      setAiMessage('Dayframe is drafting category limits from your income, bills, credit plan and spending.');
      try {
        await window.buildSuggestedBudget();
        syncBankData();
        setAiMessage('Budget draft added. Check the categories below and edit anything that does not fit.', 6500);
        if (typeof window.renderMoney === 'function') setTimeout(function () { window.renderMoney(); }, 60);
      } catch (_) {
        setAiMessage('Could not draft budgets right now. Your current budget is still safe.', 6500);
      } finally {
        aiBusy = false;
        tidyBudgetUi();
      }
    };
  }

  function observeBudgetRoot() {
    var root = $('df-budget-redesign');
    if (!root || root.__dfBudgetFixupsObserved) return;
    root.__dfBudgetFixupsObserved = true;
    new MutationObserver(tidyBudgetUi).observe(root, { childList: true, subtree: true });
  }

  function install() {
    injectStyle();
    syncBankData();
    wrapRenderMoney();
    wrapMoneyOpenTab();
    wrapMoneyLoadBankData();
    wrapMoneyRuleCategory();
    wrapMoneyPrimaryAction();
    ensureBudgetSetupPage();
    installBudgetSetupPageActions();
    installAiAction();
    syncBudgetFocus();
    tidyBudgetUi();
    observeBudgetRoot();
  }

  var attempts = 0;
  function boot() {
    attempts += 1;
    install();
    if (attempts < 40 && (!$('money-pane-budget') || typeof window.renderMoney !== 'function')) {
      setTimeout(boot, 250);
      return;
    }
    setTimeout(function () {
      syncBankData();
      if (budgetIsOpen() && typeof window.renderMoney === 'function') window.renderMoney();
      tidyBudgetUi();
      observeBudgetRoot();
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
