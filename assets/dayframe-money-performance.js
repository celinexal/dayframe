(() => {
  'use strict';

  const FLAG = 'data-dayframe-money-performance';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  let lastTransactions = null;
  let lastOverrides = null;
  let lastRules = null;
  let lastTransactionLength = -1;
  let familyOverrides = new Map();
  let legacyFamilyRules = new Map();
  let rulePatched = false;
  let renderPatched = false;
  let transactionsPatched = false;

  function bankTransactions() {
    try {
      return (typeof _moneyBankData !== 'undefined' && Array.isArray(_moneyBankData.transactions)) ? _moneyBankData.transactions : [];
    } catch {
      return [];
    }
  }

  function rebuildCaches(d) {
    const transactions = bankTransactions();
    const overrides = d?.transactionCategoryOverrides || {};
    const rules = d?.transactionCategoryRules || {};
    if (
      transactions === lastTransactions &&
      overrides === lastOverrides &&
      rules === lastRules &&
      transactions.length === lastTransactionLength
    ) {
      return { overrides, rules };
    }

    lastTransactions = transactions;
    lastOverrides = overrides;
    lastRules = rules;
    lastTransactionLength = transactions.length;

    const overrideBuckets = new Map();
    for (const item of transactions) {
      const override = overrides['bank:' + String(item?.id)];
      if (!override) continue;
      const family = moneyMerchantFamilyKey(item?.merchant || item?.description || '');
      if (!family) continue;
      if (!overrideBuckets.has(family)) overrideBuckets.set(family, new Set());
      overrideBuckets.get(family).add(String(override));
    }
    familyOverrides = new Map();
    overrideBuckets.forEach((values, family) => {
      if (values.size === 1) familyOverrides.set(family, [...values][0]);
    });

    const legacyBuckets = new Map();
    Object.entries(rules).forEach(([key, value]) => {
      if (!value || String(key).startsWith('family:')) return;
      const family = moneyMerchantFamilyKey(key);
      if (!family) return;
      if (!legacyBuckets.has(family)) legacyBuckets.set(family, new Set());
      legacyBuckets.get(family).add(String(value));
    });
    legacyFamilyRules = new Map();
    legacyBuckets.forEach((values, family) => {
      if (values.size === 1) legacyFamilyRules.set(family, [...values][0]);
    });

    return { overrides, rules };
  }

  function installCategoryRuleCache() {
    if (rulePatched) return true;
    if (typeof globalThis.moneyRuleCategory !== 'function') return false;
    if (globalThis.moneyRuleCategory.__dayframeFastCategoryRules) {
      rulePatched = true;
      return true;
    }
    if (typeof globalThis.moneyMerchantRuleKey !== 'function' || typeof globalThis.moneyMerchantFamilyKey !== 'function') return false;

    const original = globalThis.moneyRuleCategory;
    const fastMoneyRuleCategory = function fastMoneyRuleCategory(d, item) {
      try {
        const raw = item?.merchant || item?.description || item?.desc || '';
        const exact = moneyMerchantRuleKey(raw);
        if (!exact) return '';
        const family = moneyMerchantFamilyKey(exact);
        const { rules } = rebuildCaches(d || {});
        if (rules[exact]) return String(rules[exact]);
        if (!family) return '';
        if (rules['family:' + family]) return String(rules['family:' + family]);
        if (legacyFamilyRules.has(family)) return legacyFamilyRules.get(family);
        return familyOverrides.get(family) || '';
      } catch {
        return original.apply(this, arguments);
      }
    };

    fastMoneyRuleCategory.__dayframeFastCategoryRules = true;
    fastMoneyRuleCategory.__dayframeOriginal = original;
    globalThis.moneyRuleCategory = fastMoneyRuleCategory;
    rulePatched = true;
    return true;
  }

  function installInactiveTransactionRender() {
    if (renderPatched) return true;
    if (typeof globalThis.renderMoney !== 'function') return false;

    const original = globalThis.renderMoney;
    const fastInactiveTransactionsRenderMoney = function fastInactiveTransactionsRenderMoney() {
      const pane = document.getElementById('money-pane-transactions');
      const transactionsActive = Boolean(pane && pane.classList.contains('on'));
      let shouldRestore = false;
      let previousPeriod = '';
      try {
        if (!transactionsActive && typeof _moneyTransactionPeriod !== 'undefined' && _moneyTransactionPeriod === 'all') {
          previousPeriod = _moneyTransactionPeriod;
          _moneyTransactionPeriod = 'cycle';
          shouldRestore = true;
        }
      } catch {}

      try {
        return original.apply(this, arguments);
      } finally {
        if (shouldRestore) {
          try { _moneyTransactionPeriod = previousPeriod; } catch {}
        }
      }
    };

    fastInactiveTransactionsRenderMoney.__dayframeFastInactiveTransactions = true;
    fastInactiveTransactionsRenderMoney.__dayframeOriginal = original;
    globalThis.renderMoney = fastInactiveTransactionsRenderMoney;
    renderPatched = true;
    return true;
  }

  function installTransactionDefaults() {
    if (transactionsPatched) return true;
    if (typeof globalThis.moneyOpenTransactions !== 'function') return false;

    const original = globalThis.moneyOpenTransactions;
    const defaultTransactionsToCycle = function defaultTransactionsToCycle(encodedCategory = '', period = 'all', btn) {
      const hasCategory = Boolean(String(encodedCategory || '').trim());
      const nextPeriod = !hasCategory && period === 'all' ? 'cycle' : period;
      return original.call(this, encodedCategory, nextPeriod, btn);
    };

    defaultTransactionsToCycle.__dayframeDefaultTransactionsToCycle = true;
    defaultTransactionsToCycle.__dayframeOriginal = original;
    globalThis.moneyOpenTransactions = defaultTransactionsToCycle;
    transactionsPatched = true;
    return true;
  }

  function install() {
    const rules = installCategoryRuleCache();
    const render = installInactiveTransactionRender();
    const transactions = installTransactionDefaults();
    return rules && render && transactions;
  }

  if (!install()) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
    [100, 350, 1000, 2500].forEach((delay) => setTimeout(install, delay));
  }
})();
