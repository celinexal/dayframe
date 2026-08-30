(function () {
  if (window.__dayframeBillsPersistenceFixLoaded) return;
  window.__dayframeBillsPersistenceFixLoaded = true;

  var BACKUP_KEY = 'dayframe_bills_pending_v1';
  var installed = false;
  var restoreTimer = 0;
  var pendingSuggestion = null;
  var openingFromSuggestion = false;

  function $(id) {
    return document.getElementById(id);
  }

  function storageKey() {
    try {
      return typeof window.dfKey === 'function' ? window.dfKey(BACKUP_KEY) : BACKUP_KEY;
    } catch (_) {
      return BACKUP_KEY;
    }
  }

  function loadHub() {
    try {
      return typeof window.hubLoad === 'function' ? window.hubLoad() : null;
    } catch (_) {
      return null;
    }
  }

  function toast(message) {
    try {
      if (typeof window.hubToast === 'function') window.hubToast(message);
    } catch (_) {}
  }

  function rememberCategory(data, category) {
    try {
      if (typeof window.moneyRememberCategory === 'function') return window.moneyRememberCategory(data, category);
    } catch (_) {}
    return String(category || 'Other').trim() || 'Other';
  }

  function monthKey() {
    try {
      if (typeof window.moneyCurrentMonth === 'function') return window.moneyCurrentMonth();
    } catch (_) {}
    return new Date().toISOString().slice(0, 7);
  }

  function normaliseCategory(value) {
    try {
      if (typeof window.moneyNormaliseCategory === 'function') return window.moneyNormaliseCategory(value);
    } catch (_) {}
    return String(value || 'Other').trim() || 'Other';
  }

  function recurringKey(value) {
    try {
      if (typeof window.moneyRecurringMerchantKey === 'function') return window.moneyRecurringMerchantKey(value);
    } catch (_) {}
    return String(value || '')
      .toLowerCase()
      .replace(/\b(visa|mastercard|amex)?\s*purchase\b/g, ' ')
      .replace(/\b(apple\s*pay|google\s*pay|contactless|faster payments?|direct debit|dd|ref|card payment)\b/g, ' ')
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
      .replace(/\b\d{4,}\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function suggestionMeta(source) {
    if (!source) return null;
    var sourceName = String(source.name || source.merchant || source.description || '').trim();
    var key = recurringKey(source.sourceMerchantName || sourceName);
    if (!key) return null;
    return {
      sourceMerchantKey: key,
      sourceMerchantName: sourceName,
      sourceAmount: Number(source.amount || 0),
      sourceCategory: normaliseCategory(source.category || 'Other'),
      sourceDueDay: Number(source.dueDay || 0),
    };
  }

  function cloneMeta(meta) {
    if (!meta || !meta.sourceMerchantKey) return null;
    return {
      sourceMerchantKey: meta.sourceMerchantKey,
      sourceMerchantName: meta.sourceMerchantName || '',
      sourceAmount: Number(meta.sourceAmount || 0),
      sourceCategory: normaliseCategory(meta.sourceCategory || 'Other'),
      sourceDueDay: Number(meta.sourceDueDay || 0),
    };
  }

  function writeFormMeta(meta) {
    var form = $('money-bill-form');
    meta = cloneMeta(meta);
    if (!form || !meta) return;
    form.dataset.sourceMerchantKey = meta.sourceMerchantKey;
    form.dataset.sourceMerchantName = meta.sourceMerchantName || '';
    form.dataset.sourceAmount = String(Number(meta.sourceAmount || 0));
    form.dataset.sourceCategory = meta.sourceCategory || 'Other';
    form.dataset.sourceDueDay = String(Number(meta.sourceDueDay || 0));
  }

  function readFormMeta() {
    var form = $('money-bill-form');
    if (!form || !form.dataset.sourceMerchantKey) return cloneMeta(pendingSuggestion);
    return cloneMeta({
      sourceMerchantKey: form.dataset.sourceMerchantKey,
      sourceMerchantName: form.dataset.sourceMerchantName,
      sourceAmount: Number(form.dataset.sourceAmount || 0),
      sourceCategory: form.dataset.sourceCategory || 'Other',
      sourceDueDay: Number(form.dataset.sourceDueDay || 0),
    });
  }

  function clearSuggestionMeta() {
    pendingSuggestion = null;
    var form = $('money-bill-form');
    if (!form) return;
    delete form.dataset.sourceMerchantKey;
    delete form.dataset.sourceMerchantName;
    delete form.dataset.sourceAmount;
    delete form.dataset.sourceCategory;
    delete form.dataset.sourceDueDay;
  }

  function billSourceKeys(bill) {
    return [
      bill && bill.sourceMerchantKey,
      bill && bill.sourceSuggestionKey,
      bill && bill.suggestionKey,
      recurringKey(bill && bill.sourceMerchantName),
      recurringKey(bill && bill.originalName),
      recurringKey(bill && bill.name),
    ].filter(Boolean);
  }

  function amountMatches(billAmount, suggestionAmount) {
    var a = Number(billAmount || 0);
    var b = Number(suggestionAmount || 0);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.02;
  }

  function importantTokens(value) {
    var ignored = {
      direct: true,
      debit: true,
      card: true,
      payment: true,
      purchase: true,
      paid: true,
      features: true,
      corp: true,
      ltd: true,
      limited: true,
      plan: true,
    };
    return recurringKey(value).split(' ').filter(function (token) {
      return token.length >= 4 && !ignored[token];
    });
  }

  function tokenOverlap(a, b) {
    var left = importantTokens(a);
    var right = importantTokens(b);
    return left.some(function (token) { return right.indexOf(token) !== -1; });
  }

  function knownRenameMatch(sourceKey, billKey) {
    return ((/\bx\s*corp\b/.test(sourceKey) || sourceKey.indexOf('paid features') !== -1) && billKey.indexOf('twitter') !== -1)
      || (sourceKey.indexOf('twitter') !== -1 && (/\bx\s*corp\b/.test(billKey) || billKey.indexOf('paid features') !== -1));
  }

  function billMatchesSuggestion(bill, meta) {
    if (!bill || !meta || !meta.sourceMerchantKey) return false;
    var keys = billSourceKeys(bill);
    if (keys.indexOf(meta.sourceMerchantKey) !== -1) return true;

    var billNameKey = recurringKey(bill.name);
    if (knownRenameMatch(meta.sourceMerchantKey, billNameKey)) return true;
    if (!amountMatches(bill.amount, meta.sourceAmount)) return false;

    var dueDay = Number(bill.dueDay || 0);
    var dueDayMatches = meta.sourceDueDay > 0 && dueDay > 0 && meta.sourceDueDay === dueDay;
    var categoryMatches = meta.sourceCategory !== 'Other' && normaliseCategory(bill.category) === meta.sourceCategory;
    return dueDayMatches || categoryMatches || tokenOverlap(meta.sourceMerchantKey, billNameKey);
  }

  function findCoveredBill(suggestion, bills) {
    var meta = suggestionMeta(suggestion);
    if (!meta) return null;
    return (Array.isArray(bills) ? bills : []).find(function (bill) {
      return billMatchesSuggestion(bill, meta);
    }) || null;
  }

  function rememberSuggestionSource(bill, suggestion) {
    var meta = suggestionMeta(suggestion);
    if (!bill || !meta || bill.sourceMerchantKey) return false;
    bill.sourceMerchantKey = meta.sourceMerchantKey;
    bill.sourceMerchantName = meta.sourceMerchantName;
    bill.sourceAmount = meta.sourceAmount;
    bill.sourceCategory = meta.sourceCategory;
    bill.sourceDueDay = meta.sourceDueDay;
    bill.createdFromSuggestion = true;
    return true;
  }

  function filterCoveredSuggestions(data, suggestions) {
    var bills = Array.isArray(data && data.bills) ? data.bills : [];
    var changed = false;
    var filtered = (Array.isArray(suggestions) ? suggestions : []).filter(function (suggestion) {
      var bill = findCoveredBill(suggestion, bills);
      if (!bill) return true;
      changed = rememberSuggestionSource(bill, suggestion) || changed;
      return false;
    });
    if (changed) saveNow(data);
    return filtered;
  }

  function wrapBillSuggestionFinder() {
    var original = window.moneyFindBillSuggestions;
    if (typeof original !== 'function' || original.__dayframeSuggestionDedupeWrapped) return false;
    var wrapped = function (data) {
      var suggestions = original.apply(this, arguments);
      return filterCoveredSuggestions(data || loadHub() || {}, suggestions);
    };
    wrapped.__dayframeSuggestionDedupeWrapped = true;
    window.moneyFindBillSuggestions = wrapped;
    return true;
  }

  function currentSuggestionAt(index) {
    try {
      if (Array.isArray(window._moneyBillSuggestions)) return window._moneyBillSuggestions[index];
    } catch (_) {}
    try {
      if (typeof window.moneyFindBillSuggestions === 'function') {
        return (window.moneyFindBillSuggestions(loadHub() || {}) || [])[index];
      }
    } catch (_) {}
    return null;
  }

  function wrapBillSuggestionPicker() {
    var original = window.moneyUseBillSuggestion;
    if (typeof original !== 'function' || original.__dayframeSuggestionSourceWrapped) return false;
    var wrapped = function (index) {
      var meta = suggestionMeta(currentSuggestionAt(index));
      pendingSuggestion = cloneMeta(meta);
      openingFromSuggestion = true;
      try {
        return original.apply(this, arguments);
      } finally {
        openingFromSuggestion = false;
        writeFormMeta(meta);
      }
    };
    wrapped.__dayframeSuggestionSourceWrapped = true;
    window.moneyUseBillSuggestion = wrapped;
    return true;
  }

  function wrapToggleLifeForm() {
    var original = window.toggleLifeForm;
    if (typeof original !== 'function' || original.__dayframeBillMetaWrapped) return false;
    var wrapped = function (id, open) {
      if (id === 'money-bill-form' && open && !openingFromSuggestion) clearSuggestionMeta();
      if (id === 'money-bill-form' && open === false) clearSuggestionMeta();
      return original.apply(this, arguments);
    };
    wrapped.__dayframeBillMetaWrapped = true;
    window.toggleLifeForm = wrapped;
    return true;
  }

  function saveBackup(data) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify({
        savedAt: Date.now(),
        bills: Array.isArray(data && data.bills) ? data.bills : [],
      }));
    } catch (_) {}
  }

  function readBackup() {
    try {
      return JSON.parse(localStorage.getItem(storageKey()) || 'null');
    } catch (_) {
      return null;
    }
  }

  function clearBackupIfCurrent(data) {
    var backup = readBackup();
    if (!backup) return;
    try {
      if (JSON.stringify(backup.bills || []) === JSON.stringify((data && data.bills) || [])) {
        localStorage.removeItem(storageKey());
      }
    } catch (_) {}
  }

  function saveNow(data) {
    saveBackup(data);
    try {
      if (typeof window.hubSaveImmediate === 'function') {
        return window.hubSaveImmediate(data).then(function (saved) {
          if (saved) clearBackupIfCurrent(data);
          return saved;
        }).catch(function () {
          return false;
        });
      }
      if (typeof window.hubSave === 'function') window.hubSave(data);
    } catch (_) {}
    return Promise.resolve(false);
  }

  function refreshMoney() {
    try {
      if (typeof window.renderMoney === 'function') window.renderMoney();
    } catch (_) {}
    try {
      if (typeof window.renderHome === 'function') window.renderHome();
    } catch (_) {}
  }

  function restorePendingBills() {
    var backup = readBackup();
    if (!backup || !Array.isArray(backup.bills)) return false;

    var age = Date.now() - Number(backup.savedAt || 0);
    if (!Number.isFinite(age) || age > 7 * 24 * 60 * 60 * 1000) {
      try { localStorage.removeItem(storageKey()); } catch (_) {}
      return false;
    }

    var data = loadHub();
    if (!data) return false;
    var current = Array.isArray(data.bills) ? data.bills : [];
    try {
      if (JSON.stringify(current) === JSON.stringify(backup.bills)) return false;
    } catch (_) {}

    data.bills = backup.bills;
    saveNow(data);
    refreshMoney();
    return true;
  }

  function scheduleRestore() {
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(restorePendingBills, 250);
  }

  function clearBillForm() {
    ['money-bill-name', 'money-bill-amount', 'money-bill-day', 'money-bill-category'].forEach(function (id) {
      var input = $(id);
      if (input) input.value = '';
    });
    clearSuggestionMeta();
  }

  function addBillItem() {
    var nameInput = $('money-bill-name');
    var amountInput = $('money-bill-amount');
    var categoryInput = $('money-bill-category');
    var dayInput = $('money-bill-day');
    var name = String(nameInput && nameInput.value || '').trim();
    var amount = Number(amountInput && amountInput.value);
    var dueDay = Number(dayInput && dayInput.value);
    var rawCategory = categoryInput && categoryInput.value;

    if (!name || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
      toast('Add a bill name, amount and due day');
      return;
    }

    var data = loadHub();
    if (!data) return;
    data.bills = Array.isArray(data.bills) ? data.bills : [];
    var category = rememberCategory(data, rawCategory || 'Other');
    var bill = {
      id: Date.now(),
      name: name,
      amount: amount,
      category: category,
      dueDay: dueDay,
    };
    var meta = readFormMeta();
    if (meta && meta.sourceMerchantKey) {
      bill.createdFromSuggestion = true;
      bill.sourceMerchantKey = meta.sourceMerchantKey;
      bill.sourceMerchantName = meta.sourceMerchantName;
      bill.sourceAmount = meta.sourceAmount;
      bill.sourceCategory = meta.sourceCategory;
      bill.sourceDueDay = meta.sourceDueDay;
    }
    data.bills.unshift(bill);

    saveNow(data);
    clearBillForm();
    try {
      if (typeof window.toggleLifeForm === 'function') window.toggleLifeForm('money-bill-form', false);
    } catch (_) {}
    refreshMoney();
    toast('Bill saved');
  }

  function deleteBillItem(id) {
    var data = loadHub();
    if (!data) return;
    data.bills = (Array.isArray(data.bills) ? data.bills : []).filter(function (bill) {
      return String(bill.id) !== String(id);
    });
    saveNow(data);
    refreshMoney();
  }

  function toggleBillPaid(id) {
    var data = loadHub();
    if (!data) return;
    data.bills = Array.isArray(data.bills) ? data.bills : [];
    var bill = data.bills.find(function (item) {
      return String(item.id) === String(id);
    });
    if (!bill) return;
    var currentMonth = monthKey();
    bill.paidMonth = bill.paidMonth === currentMonth ? '' : currentMonth;
    saveNow(data);
    refreshMoney();
    toast(bill.paidMonth ? 'Marked as paid' : 'Marked as unpaid');
  }

  function install() {
    if (typeof window.hubLoad !== 'function') return false;
    window.addBillItem = addBillItem;
    window.deleteBillItem = deleteBillItem;
    window.toggleBillPaid = toggleBillPaid;
    wrapBillSuggestionFinder();
    wrapBillSuggestionPicker();
    wrapToggleLifeForm();
    installed = true;
    scheduleRestore();
    setTimeout(wrapBillSuggestionFinder, 400);
    setTimeout(wrapBillSuggestionPicker, 400);
    setTimeout(wrapToggleLifeForm, 400);
    setTimeout(restorePendingBills, 900);
    setTimeout(restorePendingBills, 2200);
    return true;
  }

  function boot() {
    var attempts = 0;
    (function tick() {
      attempts += 1;
      if (!install() && attempts < 60) setTimeout(tick, 200);
    })();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && readBackup()) {
      var data = loadHub();
      if (data) saveNow(data);
    } else if (document.visibilityState === 'visible') {
      scheduleRestore();
    }
  });

  window.addEventListener('pagehide', function () {
    if (readBackup()) {
      var data = loadHub();
      if (data) saveNow(data);
    }
  });

  window.addEventListener('focus', scheduleRestore);
  document.addEventListener('dayframe:money-rendered', scheduleRestore);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  Object.defineProperty(window, '__dayframeBillsPersistenceFixInstalled', {
    configurable: true,
    get: function () { return installed; },
  });
})();
