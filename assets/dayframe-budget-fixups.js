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

  function injectStyle() {
    if ($('df-budget-fixups-style')) return;
    var style = document.createElement('style');
    style.id = 'df-budget-fixups-style';
    style.textContent = [
      '.money-page.df-budget-focused .money-metrics{display:none!important}',
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
      var root = $('df-budget-redesign');
      if (!root) return;
      observeBudgetRoot();
      root.querySelectorAll('button').forEach(function (button) {
        if ((button.getAttribute('onclick') || '').indexOf('dayframeBudgetAskAi') === -1) return;
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

  function installAiAction() {
    window.dayframeBudgetAskAi = async function () {
      if (aiBusy) return;
      syncBankData();
      if (typeof window.buildSuggestedBudget !== 'function') {
        setAiMessage('Budget setup is available if you need to add income, bills or category limits.', 5000);
        return;
      }
      var values = {};
      try {
        values = typeof window.budgetPlanValues === 'function' ? window.budgetPlanValues() : {};
      } catch (_) {
        values = {};
      }
      if (!Number(values.income || 0)) {
        setAiMessage('Add your monthly income in Budget setup first, then Dayframe can suggest category limits.', 6500);
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
