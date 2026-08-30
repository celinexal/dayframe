(function () {
  if (window.__dayframeBillsPersistenceFixLoaded) return;
  window.__dayframeBillsPersistenceFixLoaded = true;

  var BACKUP_KEY = 'dayframe_bills_pending_v1';
  var installed = false;
  var restoreTimer = 0;

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
    data.bills.unshift({
      id: Date.now(),
      name: name,
      amount: amount,
      category: rememberCategory(data, rawCategory || 'Other'),
      dueDay: dueDay,
    });

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
    installed = true;
    scheduleRestore();
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
