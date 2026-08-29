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

  function billSuggestionCount(d) {
    try {
      if (typeof window.moneyFindBillSuggestions === 'function') {
        return window.moneyFindBillSuggestions(d).length;
      }
    } catch (_) {}
    try {
      if (typeof window.moneyRegularBillOptions === 'function') {
        return window.moneyRegularBillOptions(d).filter(function (option) {
          return option && option.likely;
        }).length;
      }
    } catch (_) {}
    return 0;
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

  function ensureBudgetSetupPage() {
    var budgetPane = $('money-pane-budget');
    if (!budgetPane) return false;
    budgetPane.classList.add('df-budget-no-inline-setup');
    budgetPane.classList.remove('df-budget-show-setup');

    var tabs = document.querySelector('#pg-money .money-tabs');
    if (tabs && !tabs.querySelector('[data-money-tab="budget-setup"]')) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'money-tab';
      tab.dataset.moneyTab = 'budget-setup';
      tab.textContent = 'Plan budget';
      tab.setAttribute('onclick', "moneyOpenTab('budget-setup',this)");
      var budgetTab = tabs.querySelector('[data-money-tab="budget"]');
      if (budgetTab && budgetTab.nextSibling) tabs.insertBefore(tab, budgetTab.nextSibling);
      else if (budgetTab) budgetTab.insertAdjacentElement('afterend', tab);
      else tabs.appendChild(tab);
    }

    var setupPane = $('money-pane-budget-setup');
    if (!setupPane) {
      setupPane = document.createElement('div');
      setupPane.id = 'money-pane-budget-setup';
      setupPane.className = 'money-pane df-budget-setup-pane';
      budgetPane.insertAdjacentElement('afterend', setupPane);
    } else {
      setupPane.classList.add('df-budget-setup-pane');
    }

    var builder = directChild(budgetPane, '.budget-builder');
    var lowerGrid = directChild(budgetPane, '.money-pane-grid');
    if (builder) setupPane.appendChild(builder);
    if (lowerGrid) setupPane.appendChild(lowerGrid);
    return true;
  }

  function openBudgetSetupPage(options) {
    ensureBudgetSetupPage();
    if (typeof window.moneyOpenTab === 'function') window.moneyOpenTab('budget-setup');
    setTimeout(function () {
      if (options && options.form && typeof window.toggleLifeForm === 'function') {
        window.toggleLifeForm(options.form, true);
      }
      if (options && options.category) {
        var categoryInput = $('money-budget-category');
        if (categoryInput) categoryInput.value = options.category;
      }
      var focus = options && options.focusId ? $(options.focusId) : null;
      if (focus) focus.focus({ preventScroll: true });
      var pane = $('money-pane-budget-setup');
      if (pane) pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function openBillSuggestions() {
    openBudgetSetupPage({ focusId: 'budget-plan-regular-bills' });
    setTimeout(function () {
      try {
        if (typeof window.moneySetRegularBillFilter === 'function') window.moneySetRegularBillFilter('likely');
        var picker = $('budget-regular-bill-picker');
        if (picker && !picker.classList.contains('open') && typeof window.moneyToggleRegularBillPicker === 'function') {
          window.moneyToggleRegularBillPicker();
        }
        picker = $('budget-regular-bill-picker');
        if (picker) picker.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {}
    }, 140);
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

  function enhanceBudgetChecks(root) {
    var cards = root ? root.querySelectorAll('.df-budget-check') : [];
    if (!cards.length) return;
    var d = safeHubData();
    var billCount = billSuggestionCount(d);
    var creditCount = creditPaymentMatchCount(d);
    var configs = [
      {
        title: 'Income',
        subtitle: 'This cycle',
        actions: [{ label: 'Edit', handler: function () { openBudgetSetupPage({ focusId: 'budget-plan-income' }); } }]
      },
      {
        title: 'Bills',
        subtitle: billCount ? countLabel(billCount, 'transaction suggestion', 'transaction suggestions') : 'Rent + regular bills',
        actions: [
          { label: 'Edit', handler: function () { openBudgetSetupPage({ focusId: 'budget-plan-regular-bills' }); } },
          { label: billCount ? 'Review' : 'Find', primary: !!billCount, handler: openBillSuggestions }
        ]
      },
      {
        title: 'Credit payments',
        subtitle: creditCount ? countLabel(creditCount, 'repayment match', 'repayment matches') : 'From Credit Plan',
        actions: [
          { label: 'Edit', handler: function () { openCreditPlan(false); } },
          { label: creditCount ? 'Review' : 'Add', primary: !!creditCount, handler: creditCount ? openCreditMatches : function () { openCreditPlan(true); } }
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
      '#money-pane-budget.df-budget-no-inline-setup>.budget-builder,#money-pane-budget.df-budget-no-inline-setup>.money-pane-grid{display:none!important}',
      '#money-pane-budget.df-budget-no-inline-setup.df-budget-show-setup>.budget-builder,#money-pane-budget.df-budget-no-inline-setup.df-budget-show-setup>.money-pane-grid{display:none!important}',
      '#money-pane-budget-setup.df-budget-setup-pane{padding-top:0}',
      '#money-pane-budget-setup.df-budget-setup-pane>.budget-builder{margin-bottom:14px}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check{display:flex!important;flex-direction:column!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check span{white-space:nowrap!important;overflow-wrap:normal!important;word-break:normal!important}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-check-actions{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-card-action{border:1px solid #e2e6f1;background:#fff;color:#6759e8;border-radius:999px;padding:7px 9px;font:850 10px/1 var(--fd,inherit);cursor:pointer}',
      '.money-page.df-budget-focused #df-budget-redesign .df-budget-card-action.primary{background:#7565f2;border-color:#7565f2;color:#fff}',
      '.df-budget-ai-note{margin-top:10px;border-radius:14px;background:#f4f1ff;color:#6659d9;padding:10px 12px;font:800 11px/1.35 var(--fd,inherit)}',
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
          if (button.textContent !== 'Plan budget') button.textContent = 'Plan budget';
          button.onclick = function (event) {
            if (event) event.preventDefault();
            openBudgetSetupPage();
          };
          button.setAttribute('onclick', 'dayframeBudgetOpenSetupPage()');
          return;
        }
        if (onclick.indexOf('dayframeBudgetAskAi') === -1) return;
        var label = aiBusy ? 'Working...' : 'Suggest budgets';
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
        openBudgetSetupPage({ form: 'money-budget-form', focusId: 'money-budget-category' });
        return;
      }
      return original.apply(this, arguments);
    };
    wrapped.__dfBudgetFixupsWrapped = true;
    window.moneyPrimaryAction = wrapped;
    return true;
  }

  function installBudgetSetupPageActions() {
    window.dayframeBudgetOpenSetupPage = function () {
      openBudgetSetupPage();
    };
    window.dayframeBudgetToggleSetup = function () {
      openBudgetSetupPage();
    };
    window.dayframeBudgetAddCategory = function () {
      openBudgetSetupPage({ form: 'money-budget-form', focusId: 'money-budget-category' });
    };
    window.dayframeBudgetEditCategory = function (encoded) {
      var category = decodeValue(encoded).trim();
      openBudgetSetupPage({ category: category, focusId: 'money-budget-limit' });
      setTimeout(function () {
        var d = {};
        try {
          d = typeof window.hubLoad === 'function' ? window.hubLoad() : {};
        } catch (_) {
          d = {};
        }
        var match = (d.budgets || []).find(function (budget) {
          return String(budget.category || '').trim().toLowerCase() === category.toLowerCase();
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
      }, 140);
    };
  }

  function installAiAction() {
    window.dayframeBudgetAskAi = async function () {
      if (aiBusy) return;
      syncBankData();
      if (typeof window.buildSuggestedBudget !== 'function') {
        setAiMessage('Open Plan budget if you need to add income, bills or category limits.', 5000);
        return;
      }
      var values = {};
      try {
        values = typeof window.budgetPlanValues === 'function' ? window.budgetPlanValues() : {};
      } catch (_) {
        values = {};
      }
      if (!Number(values.income || 0)) {
        setAiMessage('Add your monthly income in Plan budget first, then Dayframe can suggest category limits.', 6500);
        return;
      }
      var pane = $('money-pane-budget');
      if (pane) pane.classList.remove('df-budget-show-setup');
      aiBusy = true;
      setAiMessage('Dayframe is drafting category limits from your income, bills, credit plan and spending.');
      try {
        await window.buildSuggestedBudget();
        syncBankData();
        setAiMessage('Suggested budgets added. Check the categories below and edit anything that does not fit.', 6500);
        if (typeof window.renderMoney === 'function') setTimeout(function () { window.renderMoney(); }, 60);
      } catch (_) {
        setAiMessage('Could not create a suggestion right now. Your current budget is still safe.', 6500);
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