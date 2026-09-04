(function () {
  if (window.__dayframeBillsPersistenceFixLoaded) return;
  window.__dayframeBillsPersistenceFixLoaded = true;

  var BACKUP_KEY = 'dayframe_bills_pending_v1';
  var installed = false;
  var restoreTimer = 0;
  var pendingSuggestion = null;
  var openingFromSuggestion = false;
  var openingFromEdit = false;
  var editingBillId = '';
  var billRowsObserver = null;

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

  function setSaveButtonLabel(label) {
    var form = $('money-bill-form');
    var button = form && form.querySelector('.life-btn-primary');
    if (button) button.textContent = label || 'Save bill';
  }

  function setEditingBill(id) {
    editingBillId = id ? String(id) : '';
    var form = $('money-bill-form');
    if (!form) return;
    if (editingBillId) form.dataset.editingBillId = editingBillId;
    else delete form.dataset.editingBillId;
    setSaveButtonLabel(editingBillId ? 'Save changes' : 'Save bill');
  }

  function currentEditingBillId() {
    var form = $('money-bill-form');
    return String((form && form.dataset.editingBillId) || editingBillId || '');
  }

  function isoFromDate(date) {
    try {
      if (typeof window.hubDateISO === 'function') return window.hubDateISO(date);
    } catch (_) {}
    var d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function todayISO() {
    return isoFromDate(new Date());
  }

  function dateFromISO(value) {
    return new Date(String(value || todayISO()).slice(0, 10) + 'T12:00:00');
  }

  function shiftMonth(baseMonth, shift) {
    try {
      if (typeof window.moneyMonthShift === 'function') return window.moneyMonthShift(baseMonth, shift);
    } catch (_) {}
    var parts = String(baseMonth || monthKey()).split('-').map(Number);
    var date = new Date(parts[0] || new Date().getFullYear(), (parts[1] || 1) - 1 + Number(shift || 0), 1, 12);
    return isoFromDate(date).slice(0, 7);
  }

  function dateForMonth(monthKey, day) {
    try {
      if (typeof window.moneyBillDateFor === 'function') return window.moneyBillDateFor(monthKey, day);
    } catch (_) {}
    var parts = String(monthKey || todayISO().slice(0, 7)).split('-').map(Number);
    var year = parts[0] || new Date().getFullYear();
    var month = (parts[1] || 1) - 1;
    var max = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.max(1, Math.min(Number(day) || 1, max)), 12);
  }

  function budgetCycle(data, reference) {
    try {
      if (typeof window.moneyBudgetCycle === 'function') return window.moneyBudgetCycle(data || loadHub() || {}, reference || new Date());
    } catch (_) {}
    data = data || loadHub() || {};
    var startDay = Math.max(1, Math.min(31, Math.round(Number(data && data.budgetPlan && data.budgetPlan.startDay) || 1)));
    var now = reference ? new Date(reference) : new Date();
    var anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    var cycleDate = function (year, month) {
      var max = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(startDay, max), 12);
    };
    var start = cycleDate(anchor.getFullYear(), anchor.getMonth());
    if (anchor < start) start = cycleDate(anchor.getFullYear(), anchor.getMonth() - 1);
    var next = cycleDate(start.getFullYear(), start.getMonth() + 1);
    var end = new Date(next);
    end.setDate(end.getDate() - 1);
    return { start: isoFromDate(start), end: isoFromDate(end), startDay: startDay };
  }

  function nextBudgetCycle(cycle) {
    var reference = dateFromISO(cycle && cycle.end);
    reference.setDate(reference.getDate() + 1);
    return budgetCycle(loadHub() || {}, reference);
  }

  function inBudgetCycle(value, cycle) {
    try {
      if (typeof window.moneyInBudgetCycle === 'function') return window.moneyInBudgetCycle(value, cycle);
    } catch (_) {}
    var date = String(value || '').slice(0, 10);
    return !!date && !!cycle && date >= cycle.start && date <= cycle.end;
  }

  function billDueDateForCycle(cycle, dueDay) {
    var start = dateFromISO(cycle && cycle.start);
    var end = dateFromISO(cycle && cycle.end);
    var candidates = [];
    for (var offset = 0; offset <= 2; offset += 1) {
      var month = new Date(start.getFullYear(), start.getMonth() + offset, 1, 12);
      candidates.push(dateForMonth(isoFromDate(month).slice(0, 7), dueDay));
    }
    var inCycle = candidates.find(function (candidate) {
      return candidate >= start && candidate <= end;
    });
    if (inCycle) return inCycle;
    return candidates.find(function (candidate) { return candidate >= start; }) || start;
  }

  function daysBetween(left, right) {
    return Math.round(Math.abs(dateFromISO(left) - dateFromISO(right)) / 86400000);
  }

  function isTransferCategory(category) {
    var clean = normaliseCategory(category);
    return clean === 'Transfer' || clean === 'Transfers' || clean === 'Savings & Investments' || clean === 'Salary' || clean === 'Income';
  }

  function prettyMerchant(value) {
    try {
      if (typeof window.moneyPrettyMerchant === 'function') return window.moneyPrettyMerchant(value);
    } catch (_) {}
    return String(value || 'Transaction').trim() || 'Transaction';
  }

  function bankData() {
    try {
      if (typeof _moneyBankData !== 'undefined') return _moneyBankData || {};
    } catch (_) {}
    return window._moneyBankData || {};
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

  function softAmountMatches(billAmount, transactionAmount) {
    var a = Math.abs(Number(billAmount || 0));
    var b = Math.abs(Number(transactionAmount || 0));
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return false;
    var tolerance = Math.max(0.75, Math.min(5, a * 0.08));
    return Math.abs(a - b) <= tolerance;
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

  function transactionCategory(data, item) {
    var rawId = item && (item.raw_id || item.id);
    var bankKey = item && item.bank ? 'bank:' + String(rawId || '') : '';
    var override = bankKey ? ((data && data.transactionCategoryOverrides) || {})[bankKey] || '' : '';
    if (override) return normaliseCategory(override);
    try {
      if (typeof window.moneyRuleCategory === 'function') return normaliseCategory(window.moneyRuleCategory(data || {}, item || {}) || (item && item.category) || 'Other');
    } catch (_) {}
    return normaliseCategory((item && item.category) || 'Other');
  }

  function billTransactionsForCycle(data, cycle) {
    data = data || loadHub() || {};
    var manual = (Array.isArray(data.money) ? data.money : []).map(function (item) {
      return {
        id: item.id,
        raw_id: item.id,
        source: 'manual',
        sourceKey: 'manual:' + String(item.id || ''),
        desc: item.desc || item.name || item.merchant || 'Manual transaction',
        amount: Math.abs(Number(item.amount || 0)),
        type: item.type === 'income' ? 'income' : 'expense',
        category: transactionCategory(data, item),
        date: String(item.date || '').slice(0, 10),
        bank: false,
      };
    });
    var bank = (Array.isArray(bankData().transactions) ? bankData().transactions : []).map(function (item) {
      var rawId = item.id;
      var desc = item.merchant || item.description || item.name || 'Bank transaction';
      var tx = {
        id: rawId,
        raw_id: rawId,
        source: 'bank',
        sourceKey: 'bank:' + String(rawId || ''),
        desc: prettyMerchant(desc),
        merchant: desc,
        amount: Math.abs(Number(item.amount || 0)),
        type: item.direction === 'income' ? 'income' : 'expense',
        category: item.category || 'Other',
        date: String(item.timestamp || item.date || '').slice(0, 10),
        bank: true,
      };
      tx.category = transactionCategory(data, tx);
      return tx;
    });
    return manual.concat(bank).filter(function (tx) {
      return tx.type === 'expense'
        && tx.date
        && inBudgetCycle(tx.date, cycle)
        && Number.isFinite(tx.amount)
        && tx.amount > 0
        && !isTransferCategory(tx.category);
    });
  }

  function transactionMatchScore(bill, tx, cycle) {
    if (!bill || !tx || !softAmountMatches(bill.amount, tx.amount)) return 0;
    var txKey = recurringKey(tx.merchant || tx.desc);
    var billNameKey = recurringKey(bill.name);
    var sourceKeys = billSourceKeys(bill);
    var sourceMatch = sourceKeys.indexOf(txKey) !== -1 || sourceKeys.some(function (key) {
      return knownRenameMatch(key, txKey) || tokenOverlap(key, txKey);
    });
    var nameMatch = tokenOverlap(billNameKey, txKey) || knownRenameMatch(txKey, billNameKey);
    var category = transactionCategory(loadHub() || {}, tx);
    var categoryMatch = normaliseCategory(bill.category) !== 'Other' && normaliseCategory(bill.category) === category;
    var dueISO = isoFromDate(billDueDateForCycle(cycle, bill.dueDay || 1));
    var dueGap = daysBetween(tx.date, dueISO);
    var dueClose = dueGap <= 15;

    var score = 0;
    if (sourceMatch) score += 8;
    if (nameMatch) score += 4;
    if (categoryMatch) score += 2;
    if (dueGap <= 4) score += 3;
    else if (dueClose) score += 1;
    if (score >= 8) return score;
    // A clear name + amount match anywhere near the due date is enough to
    // auto-mark paid — these are the "obviously in my transactions" bills.
    if (dueClose && score >= 4) return score;
    return 0;
  }

  function findBillPayment(bill, data, cycle) {
    var dueISO = isoFromDate(billDueDateForCycle(cycle, bill && bill.dueDay || 1));
    return billTransactionsForCycle(data, cycle).map(function (tx) {
      return {
        tx: tx,
        score: transactionMatchScore(bill, tx, cycle),
        dueGap: daysBetween(tx.date, dueISO),
      };
    }).filter(function (item) {
      return item.score > 0;
    }).sort(function (a, b) {
      return b.score - a.score || a.dueGap - b.dueGap || a.tx.date.localeCompare(b.tx.date);
    })[0]?.tx || null;
  }

  function billPaidForCycle(bill, cycle) {
    if (!bill || !cycle) return false;
    if (bill.manualUnpaidCycle === cycle.start) return false;
    if (bill.paidCycle === cycle.start || bill.autoPaidCycle === cycle.start) return true;
    var dueMonth = isoFromDate(billDueDateForCycle(cycle, bill.dueDay || 1)).slice(0, 7);
    if (bill.paidMonth === dueMonth) return true;
    if (bill.paidMonth === monthKey()) return true;
    return !!findBillPayment(bill, loadHub() || {}, cycle);
  }

  function syncAutoPaidBills() {
    var data = loadHub();
    if (!data || !Array.isArray(data.bills)) return false;
    var cycle = budgetCycle(data);
    var changed = false;
    data.bills.forEach(function (bill) {
      if (!bill || bill.manualUnpaidCycle === cycle.start) return;
      var match = findBillPayment(bill, data, cycle);
      if (match) {
        var dueMonth = isoFromDate(billDueDateForCycle(cycle, bill.dueDay || 1)).slice(0, 7);
        var matchKey = match.sourceKey || ((match.bank ? 'bank:' : 'manual:') + String(match.raw_id || match.id || ''));
        if (bill.autoPaidCycle !== cycle.start || bill.autoPaidTransactionId !== matchKey || bill.paidCycle !== cycle.start || bill.paidSource !== 'transaction') {
          bill.paidMonth = dueMonth;
          bill.paidCycle = cycle.start;
          bill.paidSource = 'transaction';
          bill.autoPaidCycle = cycle.start;
          bill.autoPaidMonth = dueMonth;
          bill.autoPaidTransactionId = matchKey;
          bill.autoPaidTransactionDate = match.date;
          delete bill.manualUnpaidCycle;
          changed = true;
        }
      } else if (bill.autoPaidCycle === cycle.start) {
        delete bill.autoPaidCycle;
        delete bill.autoPaidMonth;
        delete bill.autoPaidTransactionId;
        delete bill.autoPaidTransactionDate;
        if (bill.paidCycle === cycle.start && bill.paidSource === 'transaction') {
          delete bill.paidCycle;
          delete bill.paidSource;
          bill.paidMonth = '';
        }
        changed = true;
      }
    });
    if (changed) saveNow(data);
    return changed;
  }

  // Grace window: a bill whose due date this month has already passed is only
  // flagged "overdue" for this many days. After that we roll the shown date
  // forward to next month's occurrence and treat it as upcoming again — a
  // monthly bill 10+ days past its date is really just waiting for its next run,
  // not something to nag about with a stale last-month date.
  var OVERDUE_GRACE_DAYS = 6;

  function cycleBillMeta(bill) {
    var data = loadHub() || {};
    var cycle = budgetCycle(data);
    var today = dateFromISO(todayISO());
    var dueDay = (bill && bill.dueDay) || 1;
    var paid = billPaidForCycle(bill, cycle);
    var todayMonth = todayISO().slice(0, 7);
    var thisMonthDue = dateForMonth(todayMonth, dueDay);
    var nextMonthDue = dateForMonth(shiftMonth(todayMonth, 1), dueDay);
    var due;
    var status;
    if (paid) {
      status = 'paid';
      due = thisMonthDue >= today ? thisMonthDue : nextMonthDue;
    } else if (thisMonthDue >= today) {
      status = 'upcoming';
      due = thisMonthDue;
    } else {
      var daysPast = Math.round((today - thisMonthDue) / 86400000);
      if (daysPast <= OVERDUE_GRACE_DAYS) {
        status = 'overdue';
        due = thisMonthDue;
      } else {
        status = 'upcoming';
        due = nextMonthDue;
      }
    }
    var days = Math.round((dateFromISO(isoFromDate(due)) - today) / 86400000);
    return { due: due, status: status, days: days, dateISO: isoFromDate(due) };
  }

  function wrapBillMeta() {
    var original = window.moneyBillMeta;
    if (typeof original !== 'function' || original.__dayframeCycleBillMetaWrapped) return false;
    var wrapped = function (bill) {
      try {
        return cycleBillMeta(bill);
      } catch (_) {
        return original.apply(this, arguments);
      }
    };
    wrapped.__dayframeCycleBillMetaWrapped = true;
    window.moneyBillMeta = wrapped;
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
      if (id === 'money-bill-form' && open && !openingFromSuggestion && !openingFromEdit) {
        clearSuggestionMeta();
        setEditingBill('');
      }
      if (id === 'money-bill-form' && open === false) {
        clearSuggestionMeta();
        setEditingBill('');
      }
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
    scheduleBillRowEnhancement();
  }

  function injectStyle() {
    if ($('df-bills-persistence-style')) return;
    var style = document.createElement('style');
    style.id = 'df-bills-persistence-style';
    style.textContent = [
      '.money-bill-row .money-bill-edit{height:32px;padding:0 11px;border:1px solid #e2e6f1;border-radius:10px;background:#fff;color:#6759e8;font:850 10px/1 var(--fd,var(--ff,inherit));cursor:pointer;white-space:nowrap}',
      '.money-bill-row .money-bill-edit:hover{background:#f4f1ff;border-color:#dcd8ff}',
      '.money-bill-row.df-bill-auto-paid{background:linear-gradient(90deg,#f6fffb,#fff)}',
      '.money-bill-row.df-bill-auto-paid .money-chip-status.paid{background:#e7faf3;color:#168a68}',
      '@media(max-width:560px){.money-bill-row{align-items:flex-start}.money-bill-row .money-bill-edit,.money-bill-row .money-bill-toggle{height:30px;padding:0 9px}}'
    ].join('\n');
    document.head.appendChild(style);
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
    setEditingBill('');
  }

  function startEditBill(id) {
    var data = loadHub();
    var bill = data && Array.isArray(data.bills) ? data.bills.find(function (item) {
      return String(item.id) === String(id);
    }) : null;
    if (!bill) {
      toast('That bill could not be found');
      return;
    }
    var nameInput = $('money-bill-name');
    var amountInput = $('money-bill-amount');
    var categoryInput = $('money-bill-category');
    var dayInput = $('money-bill-day');
    if (nameInput) nameInput.value = bill.name || '';
    if (amountInput) amountInput.value = Number(bill.amount || 0) || '';
    if (categoryInput) categoryInput.value = bill.category || 'Other';
    if (dayInput) dayInput.value = Number(bill.dueDay || 1) || 1;
    if (bill.sourceMerchantKey) {
      writeFormMeta({
        sourceMerchantKey: bill.sourceMerchantKey,
        sourceMerchantName: bill.sourceMerchantName || bill.name || '',
        sourceAmount: Number(bill.sourceAmount || bill.amount || 0),
        sourceCategory: bill.sourceCategory || bill.category || 'Other',
        sourceDueDay: Number(bill.sourceDueDay || bill.dueDay || 0),
      });
    } else {
      clearSuggestionMeta();
    }
    setEditingBill(id);
    openingFromEdit = true;
    try {
      if (typeof window.toggleLifeForm === 'function') window.toggleLifeForm('money-bill-form', true);
    } catch (_) {}
    openingFromEdit = false;
    var form = $('money-bill-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    var editId = currentEditingBillId();
    var existing = editId ? data.bills.find(function (item) {
      return String(item.id) === String(editId);
    }) : null;
    var bill = {
      id: existing ? existing.id : Date.now(),
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
    if (existing) {
      Object.assign(existing, bill);
    } else {
      data.bills.unshift(bill);
    }

    saveNow(data);
    clearBillForm();
    try {
      if (typeof window.toggleLifeForm === 'function') window.toggleLifeForm('money-bill-form', false);
    } catch (_) {}
    refreshMoney();
    toast(existing ? 'Bill updated' : 'Bill saved');
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
    var cycle = budgetCycle(data);
    if (billPaidForCycle(bill, cycle)) {
      bill.paidMonth = '';
      delete bill.paidCycle;
      delete bill.paidSource;
      if (bill.autoPaidCycle === cycle.start) {
        delete bill.autoPaidCycle;
        delete bill.autoPaidMonth;
        delete bill.autoPaidTransactionId;
        delete bill.autoPaidTransactionDate;
      }
      bill.manualUnpaidCycle = cycle.start;
    } else {
      var dueMonth = isoFromDate(billDueDateForCycle(cycle, bill.dueDay || 1)).slice(0, 7);
      bill.paidMonth = dueMonth;
      bill.paidCycle = cycle.start;
      bill.paidSource = 'manual';
      delete bill.manualUnpaidCycle;
    }
    saveNow(data);
    refreshMoney();
    toast(bill.paidCycle === cycle.start ? 'Marked as paid' : 'Marked as unpaid');
  }

  function billIdFromRow(row) {
    var button = row && row.querySelector('[onclick*="deleteBillItem"],[onclick*="toggleBillPaid"]');
    var match = button && String(button.getAttribute('onclick') || '').match(/\((['"]?)([^'")]+)\1\)/);
    return match ? match[2] : '';
  }

  function enhanceBillRows() {
    var list = $('money-bills-list');
    if (!list) return;
    var data = loadHub() || {};
    var cycle = budgetCycle(data);
    list.querySelectorAll('.money-bill-row').forEach(function (row) {
      var id = billIdFromRow(row);
      var toggle = row.querySelector('.money-bill-toggle');
      if (!id || !toggle) return;
      var bill = Array.isArray(data.bills) ? data.bills.find(function (item) {
        return String(item.id) === String(id);
      }) : null;
      var status = row.querySelector('.money-chip-status');
      var isAutoPaid = !!(bill && bill.autoPaidCycle === cycle.start && billPaidForCycle(bill, cycle));
      row.classList.toggle('df-bill-auto-paid', isAutoPaid);
      if (isAutoPaid) {
        if (status) status.textContent = 'Paid from transaction';
        toggle.title = 'Matched to a payment in this budget cycle. Click if this is not the bill payment.';
      } else if (status && status.textContent === 'Paid from transaction') {
        status.textContent = toggle.classList.contains('paid') ? 'Paid this cycle' : 'Due';
        toggle.removeAttribute('title');
      }
      if (row.dataset.dfBillEditEnhanced === '1') return;
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'money-bill-edit';
      edit.textContent = 'Edit';
      edit.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        startEditBill(id);
      });
      toggle.parentNode.insertBefore(edit, toggle);
      row.dataset.dfBillEditEnhanced = '1';
    });
  }

  function scheduleBillRowEnhancement() {
    setTimeout(enhanceBillRows, 40);
  }

  function observeBillRows() {
    var list = $('money-bills-list');
    if (!list || list.__dfBillsPersistenceObserved) return;
    list.__dfBillsPersistenceObserved = true;
    billRowsObserver = new MutationObserver(scheduleBillRowEnhancement);
    billRowsObserver.observe(list, { childList: true, subtree: true });
    scheduleBillRowEnhancement();
  }

  function wrapRenderMoney() {
    var original = window.renderMoney;
    if (typeof original !== 'function' || original.__dayframeBillsEditWrapped) return false;
    var wrapped = function () {
      syncAutoPaidBills();
      var result = original.apply(this, arguments);
      observeBillRows();
      scheduleBillRowEnhancement();
      return result;
    };
    wrapped.__dayframeBillsEditWrapped = true;
    window.renderMoney = wrapped;
    return true;
  }

  function install() {
    if (typeof window.hubLoad !== 'function') return false;
    injectStyle();
    window.addBillItem = addBillItem;
    window.deleteBillItem = deleteBillItem;
    window.toggleBillPaid = toggleBillPaid;
    window.editBillItem = startEditBill;
    window.startEditBillItem = startEditBill;
    wrapBillMeta();
    wrapRenderMoney();
    wrapBillSuggestionFinder();
    wrapBillSuggestionPicker();
    wrapToggleLifeForm();
    observeBillRows();
    installed = true;
    syncAutoPaidBills();
    scheduleRestore();
    scheduleBillRowEnhancement();
    setTimeout(wrapBillMeta, 400);
    setTimeout(wrapRenderMoney, 400);
    setTimeout(wrapBillSuggestionFinder, 400);
    setTimeout(wrapBillSuggestionPicker, 400);
    setTimeout(wrapToggleLifeForm, 400);
    setTimeout(observeBillRows, 400);
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
  document.addEventListener('dayframe:money-rendered', function () {
    scheduleRestore();
    observeBillRows();
    scheduleBillRowEnhancement();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  Object.defineProperty(window, '__dayframeBillsPersistenceFixInstalled', {
    configurable: true,
    get: function () { return installed; },
  });
})();
