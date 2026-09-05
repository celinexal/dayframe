(() => {
  'use strict';

  const VERSION = 'flo-v12';
  const FLAG = 'data-dayframe-essentials-flo';
  const LABEL = 'MyFlo';
  const DAY_MS = 86400000;

  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  let queued = false;
  let observing = false;
  let calendarCursor = firstOfMonth(new Date());

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
  const clamp = (value, fallback, min, max) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
  };
  const iso = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const isISO = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  const parseISO = (value) => {
    if (!isISO(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  };
  const dayStart = (value) => {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  };
  const addDays = (value, days) => {
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    if (!date) return null;
    date.setDate(date.getDate() + days);
    return date;
  };
  const addDaysISO = (value, days) => {
    const date = addDays(value, days);
    return date ? iso(date) : '';
  };
  function firstOfMonth(value) {
    const date = value ? new Date(value) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }
  function addMonths(value, months) {
    const date = firstOfMonth(value);
    date.setMonth(date.getMonth() + months);
    return firstOfMonth(date);
  }
  function diffDays(later, earlier) {
    const a = typeof later === 'string' ? parseISO(later) : later;
    const b = typeof earlier === 'string' ? parseISO(earlier) : earlier;
    if (!a || !b) return 0;
    return Math.round((dayStart(a).getTime() - dayStart(b).getTime()) / DAY_MS);
  }
  function shortDate(value) {
    const date = typeof value === 'string' ? parseISO(value) : value;
    return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Not set';
  }
  function shortRange(start, end) {
    if (!start || !end) return 'Not set';
    return start.slice(0, 7) === end.slice(0, 7) ? `${Number(start.slice(8))}-${shortDate(end)}` : `${shortDate(start)}-${shortDate(end)}`;
  }

  function loadData() {
    const data = typeof window.hubLoad === 'function' ? (window.hubLoad() || {}) : {};
    data.essentials = data.essentials || {};
    data.essentials.period = data.essentials.period || {};
    return data;
  }
  function savePeriod(next) {
    if (typeof window.hubSave !== 'function') return false;
    const data = loadData();
    data.essentials.period = Object.assign({}, data.essentials.period || {}, next, {
      updatedAt: new Date().toISOString(),
    });
    delete data.essentials.period.reminderKinds;
    window.hubSave(data);
    return true;
  }
  function settings() {
    const raw = loadData().essentials?.period || {};
    const reminderDays = Array.isArray(raw.reminderDays)
      ? raw.reminderDays.map(Number).filter((day) => [3, 2, 1, 0].includes(day))
      : [3, 1];
    const dayLogs = cleanDayLogs(raw.dayLogs);
    const derivedCycle = deriveCycle(periodRuns(dayLogs));
    return {
      lastStart: isISO(raw.lastStart) ? raw.lastStart : '',
      lastEnd: isISO(raw.lastEnd) ? raw.lastEnd : '',
      cycleLength: derivedCycle || clamp(raw.cycleLength, 28, 15, 60),
      periodLength: clamp(raw.periodLength, 5, 1, 14),
      notes: String(raw.notes || ''),
      loggedStarts: Array.isArray(raw.loggedStarts) ? raw.loggedStarts.filter(isISO).slice(-24) : [],
      loggedEnds: Array.isArray(raw.loggedEnds) ? raw.loggedEnds.filter(isISO).slice(-24) : [],
      reminderDays: reminderDays.length ? [...new Set(reminderDays)].sort((a, b) => b - a) : [1],
      reminderTime: /^\d{2}:\d{2}$/.test(String(raw.reminderTime || '')) ? raw.reminderTime : '09:00',
      browserNotifications: raw.browserNotifications === true,
      lastReminders: raw.lastReminders && typeof raw.lastReminders === 'object' ? raw.lastReminders : {},
      contraception: typeof raw.contraception === 'string' ? raw.contraception : '',
      pillLog: Array.isArray(raw.pillLog) ? raw.pillLog.filter(isISO).slice(-90) : [],
      dayLogs,
    };
  }
  const CONTRA_METHODS = ['', 'Combined pill', 'Progestogen-only pill', 'Contraceptive patch', 'Vaginal ring', 'Contraceptive implant', 'Hormonal coil (IUS)', 'Copper coil (IUD)', 'Contraceptive injection', 'Condoms only', 'Other'];
  const FLOW_LEVELS = ['light', 'medium', 'heavy'];
  const MYFLO_SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Tender breasts', 'Fatigue', 'Low mood', 'Mood swings', 'Acne', 'Backache', 'Nausea', 'Cravings', 'Spotting'];
  function normDayLog(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const flow = FLOW_LEVELS.includes(entry.flow) ? entry.flow : '';
    const symptoms = Array.isArray(entry.symptoms) ? [...new Set(entry.symptoms.filter((x) => MYFLO_SYMPTOMS.includes(x)))] : [];
    const sex = (entry.sex === 'protected' || entry.sex === 'unprotected') ? entry.sex : '';
    if (!flow && !symptoms.length && !sex) return null;
    return { flow, symptoms, sex };
  }
  function cleanDayLogs(raw) {
    const out = {};
    if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach((key) => {
        if (!isISO(key)) return;
        const norm = normDayLog(raw[key]);
        if (norm) out[key] = norm;
      });
    }
    return out;
  }
  function periodRuns(dayLogs) {
    const days = Object.keys(dayLogs || {}).filter((k) => dayLogs[k] && dayLogs[k].flow).sort();
    const runs = [];
    days.forEach((day) => {
      const last = runs[runs.length - 1];
      if (last && diffDays(day, last[last.length - 1]) === 1) last.push(day);
      else runs.push([day]);
    });
    return runs;
  }
  function median(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  function deriveCycle(runs) {
    const starts = runs.map((run) => run[0]);
    if (starts.length < 2) return null;
    const gaps = [];
    for (let i = 1; i < starts.length; i += 1) {
      const gap = diffDays(starts[i], starts[i - 1]);
      if (gap >= 15 && gap <= 60) gaps.push(gap);
    }
    if (!gaps.length) return null;
    return clamp(median(gaps.slice(-4)), 28, 15, 60);
  }
  function derivePeriod(dayLogs) {
    const runs = periodRuns(dayLogs);
    if (!runs.length) return null;
    const latest = runs[runs.length - 1];
    const out = {
      lastStart: latest[0],
      lastEnd: latest[latest.length - 1],
      loggedStarts: runs.map((run) => run[0]).slice(-24),
      loggedEnds: runs.map((run) => run[run.length - 1]).slice(-24),
    };
    // Cycle length works itself out from the gap between logged periods.
    // Period length is left to the user (set in the day popover).
    const cyc = deriveCycle(runs);
    if (cyc) out.cycleLength = cyc;
    return out;
  }
  function saveDayLogs(dayLogs) {
    const clean = cleanDayLogs(dayLogs);
    const patch = { dayLogs: clean };
    const derived = derivePeriod(clean);
    if (derived) Object.assign(patch, derived);
    return savePeriod(patch);
  }
  let _openMenuDate = '';
  function editMyFloDay(dateISO, mutate) {
    if (!isISO(dateISO)) return;
    const s = settings();
    const logs = Object.assign({}, s.dayLogs);
    const entry = Object.assign({ flow: '', symptoms: [], sex: '' }, logs[dateISO] || {});
    entry.symptoms = Array.isArray(entry.symptoms) ? entry.symptoms.slice() : [];
    mutate(entry);
    logs[dateISO] = entry;
    _openMenuDate = dateISO;
    if (saveDayLogs(logs)) {
      renderMyFlo(true);
      window.renderHome?.();
    }
  }
  // The old "Basics" form is removed — everything comes from logged days
  // and the calendar-day popover now.
  function formSettings() {
    return settings();
  }
  function cycleAnchor(s, base = new Date()) {
    let anchor = parseISO(s.lastStart);
    if (!anchor) return null;
    while (diffDays(addDays(anchor, s.cycleLength), base) <= 0) anchor = addDays(anchor, s.cycleLength);
    while (diffDays(anchor, base) > 0) anchor = addDays(anchor, -s.cycleLength);
    return anchor;
  }
  function nextPeriodStart(s, base = new Date()) {
    const anchor = cycleAnchor(s, base);
    if (!anchor) return '';
    const offset = diffDays(base, anchor);
    return offset >= 0 && offset < s.periodLength ? iso(anchor) : iso(addDays(anchor, s.cycleLength));
  }
  function fertileForPeriod(periodStart) {
    if (!periodStart) return null;
    const ovulation = addDaysISO(periodStart, -14);
    return { start: addDaysISO(ovulation, -5), end: ovulation, ovulation };
  }
  function nextFertile(s, base = new Date()) {
    if (!s.lastStart) return null;
    let start = nextPeriodStart(s, base);
    let fertile = fertileForPeriod(start);
    if (fertile && diffDays(fertile.end, base) < 0) fertile = fertileForPeriod(addDaysISO(start, s.cycleLength));
    return fertile;
  }
  function summary(s = settings()) {
    if (!s.lastStart) return { status: 'Not set', headline: 'Set your dates', detail: 'Add a start date to see your calendar.', card: 'Calendar and reminders' };
    const today = dayStart(new Date());
    const anchor = cycleAnchor(s, today);
    const offset = anchor ? diffDays(today, anchor) : 0;
    if (offset >= 0 && offset < s.periodLength) {
      return {
        status: 'Current period',
        headline: `Day ${offset + 1}`,
        detail: `Started ${shortDate(anchor)}. Next estimate ${shortDate(addDays(anchor, s.cycleLength))}.`,
        card: `Period day ${offset + 1}`,
      };
    }
    const next = nextPeriodStart(s, today);
    const days = diffDays(next, today);
    return {
      status: 'Next period',
      headline: shortDate(next),
      detail: days === 0 ? 'Estimated today.' : days === 1 ? 'Estimated tomorrow.' : `Estimated in about ${days} days.`,
      card: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In about ${days} days`,
    };
  }

  function dayState(dateISO, s) {
    const classes = [];
    const dots = [];
    if (dateISO === iso(new Date())) classes.push('is-today');
    if (s.loggedStarts.includes(dateISO)) {
      classes.push('is-logged');
      dots.push('Saved start');
    }
    const log = s.dayLogs && s.dayLogs[dateISO];
    if (log) {
      if (log.flow) {
        classes.push('is-period', 'is-logged');
        dots.unshift('Period logged');
      }
      if ((log.symptoms && log.symptoms.length) || log.sex) classes.push('has-note');
    }
    if (!s.lastStart) return { classes, dots };
    let start = parseISO(s.lastStart);
    const current = parseISO(dateISO);
    const min = addDays(current, -70);
    const max = addDays(current, 70);
    while (diffDays(start, min) > 0) start = addDays(start, -s.cycleLength);
    while (diffDays(start, max) <= 0) {
      const startISO = iso(start);
      const offset = diffDays(dateISO, start);
      if (offset >= 0 && offset < s.periodLength) {
        classes.push('is-period');
        dots.push(startISO === dateISO ? 'Period start' : 'Period');
      }
      const fertile = fertileForPeriod(startISO);
      if (fertile && diffDays(dateISO, fertile.start) >= 0 && diffDays(fertile.end, dateISO) >= 0) {
        classes.push('is-fertile');
        dots.push(dateISO === fertile.ovulation ? 'Ovulation estimate' : 'Fertile estimate');
      }
      if (fertile?.ovulation === dateISO) classes.push('is-ovulation');
      start = addDays(start, s.cycleLength);
    }
    return { classes: [...new Set(classes)], dots: [...new Set(dots)] };
  }
  function renderMonth(monthDate, s) {
    const month = firstOfMonth(monthDate);
    const start = addDays(month, -month.getDay());
    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const day = addDays(start, index);
      const dateISO = iso(day);
      const state = dayState(dateISO, s);
      if (day.getMonth() !== month.getMonth()) state.classes.push('is-outside');
      cells.push(`<button class="df-myflo-day ${state.classes.join(' ')}" type="button" data-date="${dateISO}" onclick="dayframeMyFloDayMenu('${dateISO}', event)" aria-label="${esc(day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}"><span>${day.getDate()}</span><i>${state.dots.slice(0, 2).map(() => '<b></b>').join('')}</i></button>`);
    }
    return `<article class="df-myflo-month"><h4>${esc(month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}</h4><div class="df-myflo-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="df-myflo-days">${cells.join('')}</div></article>`;
  }
  function renderContraception(s) {
    const isDaily = /pill/i.test(s.contraception);
    const todayISO = iso(new Date());
    const takenToday = s.pillLog.includes(todayISO);
    let daily = '';
    if (isDaily) {
      const dots = [];
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const di = iso(d);
        dots.push(`<b class="${s.pillLog.includes(di) ? 'on' : ''}"></b>`);
      }
      let streak = 0;
      const walk = new Date();
      while (s.pillLog.includes(iso(walk)) && streak < 400) { streak += 1; walk.setDate(walk.getDate() - 1); }
      daily = `<div class="df-myflo-pill"><button type="button" class="${takenToday ? 'on' : ''}" onclick="dayframeToggleMyFloPillToday()">${takenToday ? '✓ Taken today' : 'Mark today taken'}</button><div class="df-myflo-pill-dots" aria-hidden="true">${dots.join('')}</div><span>${streak ? `${streak}-day streak` : 'Last 7 days'}</span></div>`;
    }
    const removeBtn = s.contraception
      ? `<button type="button" class="df-myflo-contra-remove" onclick="dayframeRemoveMyFloContraception()">Remove method</button>`
      : '';
    return `<section class="df-myflo-contra"><div class="df-myflo-section-head"><div><span>Private record</span><h3>Contraception</h3></div>${removeBtn}</div><p class="df-myflo-helper">A personal record only. The fertile and ovulation estimates are not contraception and must not be relied on to prevent or plan pregnancy.</p><label class="df-myflo-contra-field"><span>Method</span><select onchange="dayframeSetMyFloContraception(this.value)">${CONTRA_METHODS.map((m) => `<option value="${esc(m)}" ${m === s.contraception ? 'selected' : ''}>${esc(m || 'Not set / none')}</option>`).join('')}</select></label>${daily}</section>`;
  }
  function renderReminders(s) {
    const options = [{ value: 3, label: '3 days before' }, { value: 2, label: '2 days before' }, { value: 1, label: '1 day before' }, { value: 0, label: 'On the day' }];
    const supported = 'Notification' in window;
    const permission = supported ? window.Notification.permission : 'unsupported';
    const permissionText = permission === 'granted' ? 'Phone alerts allowed' : permission === 'denied' ? 'Alerts blocked in browser settings' : 'Allow phone alerts';
    return `<section class="df-myflo-reminders"><div class="df-myflo-section-head"><div><span>Notifications</span><h3>Period reminders</h3></div><button type="button" onclick="dayframeSaveMyFloReminders()">Save</button></div><p class="df-myflo-helper">Choose when Dayframe reminds you before your estimated period. Fertile and ovulation days are marked automatically from your saved dates.</p><div class="df-myflo-chip-row" role="group" aria-label="Period reminder days">${options.map((option) => `<label class="df-myflo-chip"><input type="checkbox" name="df-myflo-reminder-day" value="${option.value}" ${s.reminderDays.includes(option.value) ? 'checked' : ''}><span>${option.label}</span></label>`).join('')}</div><div class="df-myflo-reminder-bottom"><label>Time <input id="df-myflo-reminder-time" type="time" value="${esc(s.reminderTime)}"></label><button type="button" onclick="dayframeEnableMyFloBrowserNotifications()" ${supported ? '' : 'disabled'}>${esc(permissionText)}</button></div></section>`;
  }
  function closeMyFloDayMenu() {
    _openMenuDate = '';
    document.getElementById('df-myflo-daypop')?.remove();
    document.querySelectorAll('.df-myflo-day.df-myflo-day-open').forEach((el) => el.classList.remove('df-myflo-day-open'));
    document.removeEventListener('click', myFloDayMenuOutside, true);
  }
  function myFloDayMenuOutside(event) {
    const pop = document.getElementById('df-myflo-daypop');
    if (pop && !pop.contains(event.target) && !(event.target.closest && event.target.closest('.df-myflo-day'))) closeMyFloDayMenu();
  }
  window.dayframeCloseMyFloDayMenu = closeMyFloDayMenu;
  window.dayframeToggleMyFloPeriodDay = function (dateISO) {
    editMyFloDay(dateISO, (entry) => { entry.flow = entry.flow ? '' : 'medium'; });
  };
  window.dayframeSetMyFloFlow = function (dateISO, level) {
    editMyFloDay(dateISO, (entry) => { entry.flow = FLOW_LEVELS.includes(level) ? level : 'medium'; });
  };
  window.dayframeToggleMyFloSymptom = function (dateISO, symptom) {
    editMyFloDay(dateISO, (entry) => {
      const at = entry.symptoms.indexOf(symptom);
      if (at >= 0) entry.symptoms.splice(at, 1);
      else if (MYFLO_SYMPTOMS.includes(symptom)) entry.symptoms.push(symptom);
    });
  };
  window.dayframeSetMyFloIntimacy = function (dateISO, kind) {
    editMyFloDay(dateISO, (entry) => {
      entry.sex = entry.sex === kind ? '' : ((kind === 'protected' || kind === 'unprotected') ? kind : '');
    });
  };
  window.dayframeClearMyFloDayLog = function (dateISO) {
    editMyFloDay(dateISO, (entry) => { entry.flow = ''; entry.symptoms = []; entry.sex = ''; });
  };
  function latestPeriodRun(s) {
    const runs = periodRuns(s.dayLogs);
    return runs.length ? runs[runs.length - 1] : null;
  }
  function runContaining(s, dateISO) {
    const runs = periodRuns(s.dayLogs);
    return runs.find((run) => run.includes(dateISO)) || latestPeriodRun(s);
  }
  window.dayframeEndMyFloPeriodOn = function dayframeEndMyFloPeriodOn(dateISO) {
    if (!isISO(dateISO)) return;
    const s = settings();
    const run = latestPeriodRun(s);
    if (!run) return window.hubToast?.('Log the first period day first');
    const start = run[0];
    const length = diffDays(dateISO, start) + 1;
    if (length < 1) return window.hubToast?.('That day is before this period started');
    if (length > 14) return window.hubToast?.('That is more than 14 days — log it as a new period');
    const logs = Object.assign({}, s.dayLogs);
    let cur = start;
    for (let i = 0; i < length; i += 1) {
      const entry = Object.assign({ flow: '', symptoms: [], sex: '' }, logs[cur] || {});
      entry.symptoms = Array.isArray(entry.symptoms) ? entry.symptoms.slice() : [];
      if (!entry.flow) entry.flow = 'medium';
      logs[cur] = entry;
      cur = addDaysISO(cur, 1);
    }
    _openMenuDate = dateISO;
    if (saveDayLogs(logs)) {
      renderMyFlo(true);
      window.renderHome?.();
      window.hubToast?.(length === 1 ? 'Period logged' : `Period saved · ${length} days`);
    }
  };
  window.dayframeDeleteMyFloPeriod = function dayframeDeleteMyFloPeriod(dateISO) {
    const s = settings();
    const run = runContaining(s, dateISO);
    if (!run || !run.length) return;
    const logs = Object.assign({}, s.dayLogs);
    run.forEach((day) => {
      if (logs[day]) {
        const entry = Object.assign({}, logs[day]);
        entry.flow = '';
        logs[day] = entry;
      }
    });
    closeMyFloDayMenu();
    if (saveDayLogs(logs)) {
      renderMyFlo();
      window.renderHome?.();
      window.hubToast?.('Period removed');
    }
  };
  window.dayframeRemoveMyFloContraception = function dayframeRemoveMyFloContraception() {
    if (savePeriod({ contraception: '', pillLog: [] })) {
      renderMyFlo();
      window.hubToast?.('Method removed');
    }
  };
  window.dayframeSetMyFloPeriodLength = function dayframeSetMyFloPeriodLength(delta) {
    const s = settings();
    const next = clamp(s.periodLength + (Number(delta) || 0), s.periodLength, 1, 14);
    if (next === s.periodLength) return;
    if (savePeriod({ periodLength: next })) {
      renderMyFlo(true);
      window.renderHome?.();
    }
  };
  window.dayframeResetMyFlo = function dayframeResetMyFlo() {
    if (!window.confirm('Clear all your MyFlo data? This removes every logged day, symptom and note.')) return;
    if (savePeriod({ lastStart: '', lastEnd: '', cycleLength: 28, periodLength: 5, notes: '', loggedStarts: [], loggedEnds: [], dayLogs: {} })) {
      calendarCursor = firstOfMonth(new Date());
      renderMyFlo();
      window.renderHome?.();
      window.hubToast?.('MyFlo cleared');
    }
  };
  window.dayframeOpenMyFloToday = function () {
    const todayISO = iso(new Date());
    const btn = document.querySelector(`.df-myflo-day[data-date="${todayISO}"]`);
    window.dayframeMyFloDayMenu(todayISO, btn ? { target: btn } : null);
  };
  window.dayframeMyFloDayMenu = function dayframeMyFloDayMenu(dateISO, event) {
    if (!isISO(dateISO)) return;
    closeMyFloDayMenu();
    _openMenuDate = dateISO;
    const s = settings();
    const log = s.dayLogs[dateISO] || {};
    const flow = FLOW_LEVELS.includes(log.flow) ? log.flow : '';
    const isPeriod = !!flow;
    const symptoms = Array.isArray(log.symptoms) ? log.symptoms : [];
    const sex = (log.sex === 'protected' || log.sex === 'unprotected') ? log.sex : '';
    const hasAny = isPeriod || symptoms.length || sex;
    const run = latestPeriodRun(s);
    const inThisRun = !!(run && run.includes(dateISO));
    const daysFromStart = run ? diffDays(dateISO, run[0]) + 1 : 0;
    const canEndHere = !!run && !isPeriod
      && diffDays(dateISO, run[run.length - 1]) >= 1
      && daysFromStart >= 2 && daysFromStart <= 14;
    const canDeletePeriod = isPeriod || inThisRun || (run && run.includes(dateISO));
    const parsed = parseISO(dateISO);
    const label = parsed ? parsed.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) : dateISO;
    const startLabel = run ? (parseISO(run[0])?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) || run[0]) : '';
    const D = dateISO;
    const pop = document.createElement('div');
    pop.id = 'df-myflo-daypop';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = `<div class="df-myflo-daypop-date">${esc(label)}</div>`
      + `<button type="button" class="df-myflo-dp-period${isPeriod ? ' on' : ''}" onclick="dayframeToggleMyFloPeriodDay('${D}')">${isPeriod ? '● Period day · tap to remove' : 'Log period'}</button>`
      + (canEndHere
        ? `<button type="button" class="df-myflo-dp-end" onclick="dayframeEndMyFloPeriodOn('${D}')">End period here · ${daysFromStart} days from ${esc(startLabel)}</button>`
        : '')
      + (isPeriod
        ? `<div class="df-myflo-dp-seg">${FLOW_LEVELS.map((level) => `<button type="button" class="${flow === level ? 'on' : ''}" onclick="dayframeSetMyFloFlow('${D}','${level}')">${level.charAt(0).toUpperCase() + level.slice(1)}</button>`).join('')}</div>`
        : '')
      + (canDeletePeriod
        ? `<button type="button" class="df-myflo-dp-delperiod" onclick="dayframeDeleteMyFloPeriod('${D}')">Delete this whole period</button>`
        : '')
      + `<div class="df-myflo-dp-plen"><span>Typical period length</span><div><button type="button" onclick="dayframeSetMyFloPeriodLength(-1)" aria-label="Fewer days">−</button><b>${s.periodLength} day${s.periodLength === 1 ? '' : 's'}</b><button type="button" onclick="dayframeSetMyFloPeriodLength(1)" aria-label="More days">+</button></div></div>`
      + `<details class="df-myflo-dp-sympwrap"${symptoms.length ? ' open' : ''}><summary>Symptoms${symptoms.length ? ` · ${symptoms.length}` : ''}</summary>`
      + `<div class="df-myflo-dp-symp">${MYFLO_SYMPTOMS.map((symptom) => `<button type="button" class="${symptoms.includes(symptom) ? 'on' : ''}" onclick="dayframeToggleMyFloSymptom('${D}','${esc(symptom)}')">${esc(symptom)}</button>`).join('')}</div></details>`
      + `<div class="df-myflo-dp-label">Intimacy</div>`
      + `<div class="df-myflo-dp-seg"><button type="button" class="${sex === 'protected' ? 'on' : ''}" onclick="dayframeSetMyFloIntimacy('${D}','protected')">Protected</button><button type="button" class="${sex === 'unprotected' ? 'on' : ''}" onclick="dayframeSetMyFloIntimacy('${D}','unprotected')">Unprotected</button></div>`
      + (hasAny ? `<button type="button" class="df-myflo-daypop-clear" onclick="dayframeClearMyFloDayLog('${D}');dayframeCloseMyFloDayMenu()">Clear this day</button>` : '')
      + `<button type="button" class="df-myflo-daypop-done" onclick="dayframeCloseMyFloDayMenu()">Done</button>`;
    document.body.appendChild(pop);
    document.querySelectorAll('.df-myflo-day.df-myflo-day-open').forEach((el) => el.classList.remove('df-myflo-day-open'));
    const anchor = (event && event.target && event.target.closest) ? event.target.closest('.df-myflo-day') : null;
    if (anchor) anchor.classList.add('df-myflo-day-open');
    const rect = anchor
      ? anchor.getBoundingClientRect()
      : { left: window.innerWidth / 2 - 20, top: window.innerHeight / 2 - 20, bottom: window.innerHeight / 2 + 20, width: 40, height: 40 };
    const pw = pop.offsetWidth || 210;
    const ph = pop.offsetHeight || 150;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let left = Math.max(10, Math.min(cx - pw / 2, window.innerWidth - pw - 10));
    let top = Math.max(10, Math.min(cy - ph / 2, window.innerHeight - ph - 10));
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    setTimeout(() => document.addEventListener('click', myFloDayMenuOutside, true), 0);
  };
  function reopenMyFloDayMenu() {
    if (!_openMenuDate) return;
    const target = _openMenuDate;
    const btn = document.querySelector(`.df-myflo-day[data-date="${target}"]`);
    window.dayframeMyFloDayMenu(target, btn ? { target: btn } : null);
  }
  window.dayframeSetMyFloEndOn = function dayframeSetMyFloEndOn(dateISO) {
    if (!isISO(dateISO)) return;
    const s = formSettings();
    if (!s.lastStart) return window.hubToast?.('Mark the start day first');
    const length = diffDays(dateISO, s.lastStart) + 1;
    if (length < 1) return window.hubToast?.('End day is before the start day');
    if (length > 14) return window.hubToast?.('That is more than 14 days after the start day');
    const loggedEnds = [...new Set((s.loggedEnds || []).concat(dateISO))].filter(isISO).slice(-24);
    if (savePeriod(Object.assign({}, s, { lastEnd: dateISO, loggedEnds, periodLength: clamp(length, s.periodLength, 1, 14) }))) {
      renderMyFlo();
      window.renderHome?.();
      window.hubToast?.('Period end saved');
    }
  };
  window.dayframeClearMyFloDay = function dayframeClearMyFloDay(dateISO) {
    const s = formSettings();
    const loggedStarts = (s.loggedStarts || []).filter((x) => x !== dateISO);
    const loggedEnds = (s.loggedEnds || []).filter((x) => x !== dateISO);
    const next = Object.assign({}, s, { loggedStarts, loggedEnds });
    if (s.lastStart === dateISO) next.lastStart = loggedStarts.length ? loggedStarts[loggedStarts.length - 1] : '';
    if (s.lastEnd === dateISO) next.lastEnd = '';
    if (savePeriod(next)) {
      renderMyFlo();
      window.renderHome?.();
      window.hubToast?.('Day cleared');
    }
  };
  function renderSignature(s) {
    const notif = ('Notification' in window) ? window.Notification.permission : '';
    return `v10|${iso(new Date())}|${iso(calendarCursor)}|${notif}|${JSON.stringify(s)}`;
  }
  function renderMyFlo(preserveMenu) {
    if (!preserveMenu) closeMyFloDayMenu();
    const panel = $('df-period-panel');
    if (!panel) return;
    const s = settings();
    const sig = renderSignature(s);
    const existingView = $('df-myflo-view');
    // Nothing meaningful changed — skip the rebuild. Other patch files'
    // MutationObservers fire this often; rebuilding innerHTML each time
    // causes the calendar to flicker and cascades re-renders across scripts.
    if (!preserveMenu && existingView && existingView.children.length && existingView.dataset.floSig === sig) {
      return;
    }
    const sum = summary(s);
    const fertile = nextFertile(s);
    const head = panel.querySelector('.df-period-panel-head');
    if (head) {
      const eyebrow = head.querySelector('span');
      const title = head.querySelector('h2');
      const copy = head.querySelector('p');
      if (eyebrow && eyebrow.textContent !== 'Private tracker') eyebrow.textContent = 'Private tracker';
      if (title && title.textContent !== LABEL) title.textContent = LABEL;
      if (copy && copy.textContent !== 'Track your dates and let Dayframe estimate the rest.') copy.textContent = 'Track your dates and let Dayframe estimate the rest.';
    }
    let view = existingView;
    if (!view) {
      view = document.createElement('div');
      view.id = 'df-myflo-view';
      const body = panel.querySelector('.df-period-body');
      if (body) panel.insertBefore(view, body);
      else panel.appendChild(view);
    }
    view.dataset.floSig = sig;
    view.innerHTML = `<section class="df-myflo-calendar df-myflo-calendar-top"><div class="df-myflo-calendar-head"><button type="button" onclick="dayframeShiftMyFloCalendar(-1)" aria-label="Previous month">&lt;</button><div><span>Calendar</span><h3>Tap a day to log an entry</h3></div><button type="button" onclick="dayframeShiftMyFloCalendar(1)" aria-label="Next month">&gt;</button></div><div class="df-myflo-months">${renderMonth(calendarCursor, s)}${renderMonth(addMonths(calendarCursor, 1), s)}</div><div class="df-myflo-legend"><span><b class="period"></b>Period</span><span><b class="fertile"></b>Fertile</span><span><b class="ovulation"></b>Ovulation</span><span><b class="note"></b>Logged note</span><span><b class="today"></b>Today</span></div></section><section class="df-myflo-stats" aria-label="MyFlo overview"><article class="df-myflo-stat is-main"><span>${esc(sum.status)}</span><strong>${esc(sum.headline)}</strong><small>${esc(sum.detail)}</small></article><article class="df-myflo-stat"><span>Fertile window</span><strong>${esc(fertile ? shortRange(fertile.start, fertile.end) : 'Not set')}</strong><small>Estimated automatically from your period dates.</small></article><article class="df-myflo-stat"><span>Ovulation</span><strong>${esc(fertile ? shortDate(fertile.ovulation) : 'Not set')}</strong><small>Estimate only, not contraception guidance.</small></article></section>${renderContraception(s)}${renderReminders(s)}<div class="df-myflo-reset-row"><button type="button" onclick="dayframeResetMyFlo()">Reset all MyFlo data</button></div>`;
    updateSummary(s, sum);
    sendDueReminder(s);
    if (preserveMenu) reopenMyFloDayMenu();
  }

  function decorateBaseForm(s) {
    const body = $('df-period-panel')?.querySelector('.df-period-body');
    const form = body?.querySelector('.df-period-form');
    if (!body || !form) return;
    body.classList.add('df-myflo-basics');
    if (!form.querySelector('.df-myflo-form-title')) form.insertAdjacentHTML('afterbegin', '<div class="df-myflo-form-title"><span>Basics</span><h3>Keep the estimate accurate</h3></div>');
    const save = form.querySelector('.df-period-actions button.primary');
    const clear = form.querySelector('.df-period-actions button:not(.primary)');
    if (save) save.textContent = 'Save MyFlo';
    if (clear) clear.textContent = 'Reset';
    const last = $('df-period-last-start');
    if (last && !last.dataset.myfloHint) {
      last.dataset.myfloHint = 'true';
      last.closest('label')?.appendChild(Object.assign(document.createElement('small'), { textContent: 'You can also tap a date on the calendar.' }));
    }
    const A = document.activeElement;
    if (last && A !== last) last.value = s.lastStart;
    const cyc = $('df-period-cycle-length'); if (cyc && A !== cyc) cyc.value = String(s.cycleLength);
    const len = $('df-period-length'); if (len && A !== len) len.value = String(s.periodLength);
    const notes = $('df-period-notes'); if (notes && A !== notes) notes.value = s.notes;
    if (!s.lastStart) calendarCursor = firstOfMonth(new Date());
  }
  function updateSummary(s = settings(), sum = summary(s)) {
    const card = $('df-period-card');
    const desc = $('df-period-card-desc') || card?.querySelector('.driving-home-desc');
    const badge = $('df-period-card-summary');
    const nextDate = $('df-period-next-date');
    const nextDetail = $('df-period-next-detail');
    if (desc) desc.textContent = s.lastStart ? `${sum.status}: ${sum.headline}.` : 'Calendar and reminders.';
    if (badge) badge.textContent = sum.card;
    if (nextDate) nextDate.textContent = sum.headline;
    if (nextDetail) nextDetail.textContent = sum.detail;
  }

  function ensureStyle() {
    if ($('df-essentials-flo-style')) return;
    const style = document.createElement('style');
    style.id = 'df-essentials-flo-style';
    style.textContent = `
      #pg-driving .driving-hub-sub{display:none!important}.df-flo-nav{display:flex!important}#df-period-panel{border:1px solid #f0d9ec!important;background:linear-gradient(145deg,#fff 0%,#fff7fb 52%,#edfffb 100%)!important}#df-period-panel .df-period-panel-head{background:linear-gradient(120deg,#fff7fb 0%,#fff 48%,#effffb 100%)!important}#df-period-panel .df-period-estimate{display:none!important}#df-period-panel .df-period-body{display:none!important}
      .df-myflo-reset-row{display:flex;justify-content:center;margin-top:2px}.df-myflo-reset-row button{border:0;background:transparent;color:#a2879a;font:750 10px var(--ff);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:6px}.df-myflo-reset-row button:hover{color:#d94382}
      #df-myflo-daypop .df-myflo-dp-plen{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid #ecd7e3;border-radius:11px;background:#fff}#df-myflo-daypop .df-myflo-dp-plen>span{font:900 8px var(--ff);text-transform:uppercase;letter-spacing:.06em;color:#9aa0ab}#df-myflo-daypop .df-myflo-dp-plen>div{display:flex;align-items:center;gap:8px}#df-myflo-daypop .df-myflo-dp-plen b{font:850 11px var(--ff);color:#b83a72;min-width:44px;text-align:center}#df-myflo-daypop .df-myflo-dp-plen button{width:26px;height:26px;padding:0;text-align:center;border-radius:8px;border-color:#ecd7e3;color:#b83a72;font-size:14px}
      #df-myflo-daypop .df-myflo-dp-sympwrap{border:1px solid #e7e0ea;border-radius:11px;background:#fff}#df-myflo-daypop .df-myflo-dp-sympwrap>summary{list-style:none;cursor:pointer;padding:8px 11px;font:800 10.5px var(--ff);color:#7a4fa0}#df-myflo-daypop .df-myflo-dp-sympwrap>summary::-webkit-details-marker{display:none}#df-myflo-daypop .df-myflo-dp-sympwrap>summary:before{content:"▸ ";font-size:9px}#df-myflo-daypop .df-myflo-dp-sympwrap[open]>summary:before{content:"▾ "}#df-myflo-daypop .df-myflo-dp-sympwrap .df-myflo-dp-symp{padding:0 9px 9px}
      #df-myflo-view{display:grid;gap:14px;padding:16px}.df-myflo-stats{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:12px}.df-myflo-stat{min-height:118px;border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.78);padding:16px;box-shadow:0 14px 28px rgba(42,54,84,.055)}.df-myflo-stat.is-main{background:linear-gradient(135deg,#fff 0%,#fff1f7 55%,#eefffb 100%);border-color:#f5cde2}.df-myflo-stat span,.df-myflo-section-head span,.df-myflo-calendar-head span,.df-myflo-form-title span,.df-myflo-actions span{display:block;color:#7c879a;font-size:9px;font-weight:900;text-transform:uppercase}.df-myflo-stat strong{display:block;margin:8px 0 7px;font-family:var(--fd);font-size:28px;line-height:1;color:#172033}.df-myflo-stat small{display:block;color:#6f7a8c;font-size:11px;line-height:1.45;font-weight:750}
      .df-myflo-actions{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #f3d8e8;border-radius:18px;background:linear-gradient(135deg,#fff 0%,#fff3f8 58%,#effffc 100%);padding:15px 16px;box-shadow:0 14px 28px rgba(42,54,84,.052)}.df-myflo-actions h3{margin:3px 0 4px;font-family:var(--fd);font-size:19px;color:#172033}.df-myflo-actions p{margin:0;color:#6f7a8c;font-size:11px;line-height:1.45;font-weight:750}.df-myflo-action-buttons{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.df-myflo-action-buttons button{height:38px;border:1px solid #f2bdd7;border-radius:999px;background:#fff;color:#d94382;font:850 11px var(--ff);padding:0 14px;cursor:pointer}.df-myflo-action-buttons button:first-child{background:#ff5d93;color:#fff;border-color:#ff5d93;box-shadow:0 10px 20px rgba(255,93,147,.18)}
      .df-myflo-contra{border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.84);padding:14px 16px;box-shadow:0 14px 28px rgba(42,54,84,.052)}.df-myflo-contra-field{display:grid;gap:6px;color:#7b8495;font-size:9.5px;font-weight:850;max-width:340px}.df-myflo-contra-field select{height:38px;border:1px solid #e7eaf3;border-radius:12px;background:#f8f9fc;padding:0 10px;color:#172033;font:800 12px var(--ff)}.df-myflo-pill{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px}.df-myflo-pill button{height:38px;border:1px solid #f2bdd7;border-radius:999px;background:#fff;color:#d94382;font:850 11px var(--ff);padding:0 16px;cursor:pointer}.df-myflo-pill button.on{background:#ff5d93;color:#fff;border-color:#ff5d93;box-shadow:0 10px 20px rgba(255,93,147,.18)}.df-myflo-pill-dots{display:flex;gap:5px}.df-myflo-pill-dots b{width:10px;height:10px;border-radius:999px;background:#eceef4;display:inline-block}.df-myflo-pill-dots b.on{background:#ff5d93}.df-myflo-pill span{color:#7b8495;font-size:10.5px;font-weight:850}
      .df-myflo-board{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px;align-items:start}.df-myflo-calendar,.df-myflo-reminders{border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.84);padding:14px;box-shadow:0 14px 28px rgba(42,54,84,.052)}.df-myflo-calendar-head,.df-myflo-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.df-myflo-calendar-head h3,.df-myflo-section-head h3,.df-myflo-form-title h3{margin:3px 0 0;font-family:var(--fd);font-size:18px;line-height:1.1;color:#172033}.df-myflo-calendar-head button,.df-myflo-section-head button,.df-myflo-reminder-bottom button{height:34px;border:1px solid #eadffc;border-radius:999px;background:#fff;color:#7161f1;font:850 11px var(--ff);padding:0 13px;cursor:pointer}.df-myflo-calendar-head button{width:34px;padding:0;font-size:18px}
      .df-myflo-months{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.df-myflo-month{border:1px solid #f0edf5;border-radius:16px;background:#fff;padding:12px}.df-myflo-month h4{margin:0 0 11px;text-align:center;font-family:var(--fd);font-size:18px;color:#172033}.df-myflo-weekdays,.df-myflo-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.df-myflo-weekdays span{text-align:center;color:#8a94a4;font-size:9px;font-weight:900}.df-myflo-day{position:relative;display:grid;place-items:center;aspect-ratio:1;border:0;border-radius:999px;background:transparent;color:#172033;font:850 12px var(--ff);cursor:pointer}.df-myflo-day span{position:relative;z-index:2}.df-myflo-day i{position:absolute;left:50%;bottom:4px;display:flex;gap:2px;transform:translateX(-50%);font-style:normal}.df-myflo-day i b{width:4px;height:4px;border-radius:999px;background:#c6cdd8}.df-myflo-day.is-outside{color:#c4cad5}.df-myflo-day.is-period{background:#ff5d93;color:#fff;box-shadow:0 7px 16px rgba(255,93,147,.22)}.df-myflo-day.is-period:not(.is-logged){background:#fff1f6;color:#e84f87;border:1px dashed #f06fa1;box-shadow:none}.df-myflo-day.is-fertile:not(.is-period){background:#ecfffb;color:#10998f}.df-myflo-day.is-ovulation{outline:2px dotted #32b8ab;outline-offset:2px}.df-myflo-day.is-today:after{content:"";position:absolute;inset:2px;border:2px solid #7564f2;border-radius:999px}.df-myflo-day.is-logged{background:#ff5d93;color:#fff}
      .df-myflo-legend{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;color:#7b8495;font-size:10px;font-weight:850}.df-myflo-legend span{display:inline-flex;align-items:center;gap:6px;border:1px solid #eef1f6;border-radius:999px;background:#fff;padding:6px 8px}.df-myflo-legend b{width:9px;height:9px;border-radius:999px;display:inline-block}.df-myflo-legend .period{background:#ff5d93}.df-myflo-legend .fertile{background:#48d5c2}.df-myflo-legend .ovulation{border:2px dotted #32b8ab}.df-myflo-legend .today{border:2px solid #7564f2}.df-myflo-chip-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.df-myflo-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid #efe5f7;border-radius:999px;background:#fff;padding:8px 10px;color:#606c80;font-size:10.5px;font-weight:850;cursor:pointer}.df-myflo-chip input{accent-color:#ef5f9b}.df-myflo-chip:has(input:checked){background:#fff1f7;border-color:#f4b9d5;color:#d94382}.df-myflo-helper{margin:-3px 0 8px;color:#738095;font-size:10.5px;line-height:1.5;font-weight:750}.df-myflo-reminder-bottom{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:12px}.df-myflo-reminder-bottom label{display:grid;gap:5px;color:#7b8495;font-size:9.5px;font-weight:850}.df-myflo-reminder-bottom input{height:34px;border:1px solid #e7eaf3;border-radius:12px;background:#f8f9fc;padding:0 10px;color:#172033;font:800 12px var(--ff)}#df-period-panel .df-period-body.df-myflo-basics{display:block!important;padding:0 16px 16px!important}#df-period-panel .df-period-form{border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.82);padding:14px;box-shadow:0 14px 28px rgba(42,54,84,.05)}
      .df-myflo-day.df-myflo-day-open{outline:2px solid #ef5f9b;outline-offset:1px;border-radius:10px}
      .df-myflo-day.has-note:not(.is-period) span{text-decoration:underline;text-decoration-color:#b48bd6;text-underline-offset:3px}
      .df-myflo-day.has-note.is-period:before{content:"";position:absolute;top:3px;right:3px;width:5px;height:5px;border-radius:999px;background:#fff;z-index:3}
      .df-myflo-legend .note{background:#b48bd6}
      #df-myflo-daypop{position:fixed;z-index:26000;width:250px;max-width:calc(100vw - 20px);max-height:min(74vh,480px);overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:12px;border:1px solid #f0d9ea;border-radius:16px;background:#fff;box-shadow:0 22px 48px rgba(42,54,84,.24)}.df-myflo-daypop-date{font:900 9px var(--ff);text-transform:uppercase;letter-spacing:.06em;color:#8a94a4}#df-myflo-daypop button{height:36px;border:1px solid #f2bdd7;border-radius:11px;background:#fff;color:#d94382;font:850 11px var(--ff);cursor:pointer;text-align:left;padding:0 12px}#df-myflo-daypop button:hover{background:#fff1f6}#df-myflo-daypop .df-myflo-dp-period.on{background:#ff5d93;color:#fff;border-color:#ff5d93}#df-myflo-daypop .df-myflo-dp-label{margin-top:4px;font:900 8px var(--ff);text-transform:uppercase;letter-spacing:.07em;color:#9aa0ab;text-align:left}#df-myflo-daypop .df-myflo-dp-seg{display:flex;gap:5px}#df-myflo-daypop .df-myflo-dp-seg button{flex:1;height:31px;padding:0;text-align:center;border-color:#ecd7e3;color:#8a7f88;font-size:10px}#df-myflo-daypop .df-myflo-dp-seg button.on{background:#f5d9e6;border-color:#e6a9c6;color:#b83a72}#df-myflo-daypop .df-myflo-dp-symp{display:flex;flex-wrap:wrap;gap:5px}#df-myflo-daypop .df-myflo-dp-symp button{height:auto;padding:5px 9px;border-radius:999px;border-color:#e7e0ea;color:#6f6675;font-size:10px}#df-myflo-daypop .df-myflo-dp-symp button.on{background:#efe4f6;border-color:#cdb6dd;color:#7a4fa0}#df-myflo-daypop button.df-myflo-daypop-clear{border-color:#e7eaf3;color:#7b8495}#df-myflo-daypop button.df-myflo-daypop-clear:hover{background:#f6f7fb}#df-myflo-daypop button.df-myflo-daypop-done{text-align:center;background:#fff1f6;border-color:#f3c9dd;color:#b83a72;font-weight:900}#df-myflo-daypop button.df-myflo-dp-end{background:#ff5d93;color:#fff;border-color:#ff5d93;text-align:center;font-weight:900;height:auto;min-height:36px;padding:7px 12px;line-height:1.25}#df-myflo-daypop button.df-myflo-dp-end:hover{background:#f5468a}#df-myflo-daypop button.df-myflo-dp-delperiod{border-color:#eddfe3;color:#c0556b;text-align:center;font-weight:850}#df-myflo-daypop button.df-myflo-dp-delperiod:hover{background:#fdf0f3}
      .df-myflo-contra .df-myflo-section-head{align-items:center}
      .df-myflo-contra-remove{flex:0 0 auto;height:30px;border:1px solid #e7eaf3;border-radius:999px;background:#fff;color:#c0556b;font:800 10px var(--ff);padding:0 13px;cursor:pointer}
      .df-myflo-contra-remove:hover{background:#fdf0f3}
      @media(max-width:980px){.df-myflo-stats,.df-myflo-board,.df-myflo-months{grid-template-columns:1fr}.df-myflo-reminder-bottom{grid-template-columns:1fr}.df-myflo-stat{min-height:0}.df-myflo-actions{align-items:flex-start;flex-direction:column}.df-myflo-action-buttons{justify-content:flex-start}}@media(max-width:520px){#df-myflo-view{padding:12px}.df-myflo-stat strong{font-size:24px}.df-myflo-day{font-size:11px}.df-myflo-month{padding:10px}}
    `;
    document.head.appendChild(style);
  }

  function ensureNavAndCards() {
    const nav = document.querySelector('.driving-side-nav');
    let flo = nav?.querySelector('[data-driving-page="driving-cycle"]');
    if (nav && !flo) {
      flo = document.createElement('button');
      flo.type = 'button';
      flo.className = 'df-flo-nav';
      flo.dataset.drivingPage = 'driving-cycle';
      flo.setAttribute('onclick', 'dayframeOpenPeriodTracker(event)');
      flo.innerHTML = '<span>F</span>MyFlo';
      const car = nav.querySelector('[data-driving-page="driving-car"]');
      if (car?.nextSibling) nav.insertBefore(flo, car.nextSibling);
      else nav.appendChild(flo);
    }
    if (flo) {
      if (flo.textContent.replace(/\s+/g, '') !== 'FMyFlo') flo.innerHTML = '<span>F</span>MyFlo';
      if (flo.classList.contains('df-essentials-hidden')) flo.classList.remove('df-essentials-hidden');
      if (flo.getAttribute('aria-hidden') !== 'false') flo.setAttribute('aria-hidden', 'false');
    }
    const theory = nav?.querySelector('[data-driving-page="driving-theory"]');
    if (theory && !theory.classList.contains('df-essentials-hidden')) {
      theory.classList.add('df-essentials-hidden');
      theory.setAttribute('aria-hidden', 'true');
    }
    const card = $('df-period-card');
    if (card) {
      if (card.getAttribute('onclick') !== 'dayframeOpenPeriodTracker(event)') card.setAttribute('onclick', 'dayframeOpenPeriodTracker(event)');
      const title = card.querySelector('.driving-home-title');
      const kicker = card.querySelector('.driving-home-kicker');
      if (title && title.textContent !== LABEL) title.textContent = LABEL;
      if (kicker && kicker.textContent !== 'Private') kicker.textContent = 'Private';
      updateSummary();
    }
    const panelTitle = $('df-period-panel')?.querySelector('.df-period-panel-head h2');
    if (panelTitle && panelTitle.textContent !== LABEL) panelTitle.textContent = LABEL;
  }

  window.dayframeSavePeriodTracker = function dayframeSavePeriodTracker() {
    const s = formSettings();
    if (!s.lastStart) return window.hubToast?.('Add the first day of your period');
    const loggedStarts = [...new Set((s.loggedStarts || []).concat(s.lastStart))].filter(isISO).slice(-24);
    if (savePeriod(Object.assign({}, s, { loggedStarts }))) {
      renderMyFlo();
      window.renderHome?.();
      queue();
      window.hubToast?.('MyFlo saved');
    }
  };
  window.dayframeClearPeriodTracker = function dayframeClearPeriodTracker() {
    if (savePeriod({ lastStart: '', lastEnd: '', cycleLength: 28, periodLength: 5, notes: '', loggedStarts: [], loggedEnds: [] })) {
      renderMyFlo();
      window.renderHome?.();
      window.hubToast?.('MyFlo reset');
    }
  };
  window.dayframeSetMyFloStart = function dayframeSetMyFloStart(dateISO) {
    if (!isISO(dateISO)) return;
    const s = formSettings();
    const loggedStarts = [...new Set((s.loggedStarts || []).concat(dateISO))].filter(isISO).slice(-24);
    if (savePeriod(Object.assign({}, s, { lastStart: dateISO, lastEnd: '', loggedStarts }))) {
      calendarCursor = firstOfMonth(parseISO(dateISO));
      renderMyFlo();
      window.renderHome?.();
      window.hubToast?.('Period start saved');
    }
  };
  window.dayframeMarkMyFloStartedToday = () => window.dayframeSetMyFloStart(iso(new Date()));
  window.dayframeMarkMyFloEndedToday = function dayframeMarkMyFloEndedToday() {
    const s = formSettings();
    const today = iso(new Date());
    if (!s.lastStart) return window.hubToast?.('Save the start date first');
    const length = diffDays(today, s.lastStart) + 1;
    if (length < 1 || length > 14) return window.hubToast?.('End date should be within this period');
    const loggedEnds = [...new Set((s.loggedEnds || []).concat(today))].filter(isISO).slice(-24);
    if (savePeriod(Object.assign({}, s, { lastEnd: today, loggedEnds, periodLength: clamp(length, s.periodLength, 1, 14) }))) {
      renderMyFlo();
      window.renderHome?.();
      window.hubToast?.('Period end saved');
    }
  };
  window.dayframeShiftMyFloCalendar = function dayframeShiftMyFloCalendar(months) {
    calendarCursor = addMonths(calendarCursor, Number(months) || 0);
    renderMyFlo();
  };
  window.dayframeSaveMyFloReminders = function dayframeSaveMyFloReminders() {
    const s = formSettings();
    const reminderDays = [...document.querySelectorAll('input[name="df-myflo-reminder-day"]:checked')]
      .map((input) => Number(input.value))
      .filter((value) => [3, 2, 1, 0].includes(value));
    if (savePeriod(Object.assign({}, s, {
      reminderDays: reminderDays.length ? reminderDays : [1],
      reminderTime: $('df-myflo-reminder-time')?.value || s.reminderTime,
    }))) {
      renderMyFlo();
      window.hubToast?.('MyFlo reminders saved');
    }
  };
  window.dayframeSetMyFloContraception = function dayframeSetMyFloContraception(value) {
    const v = CONTRA_METHODS.includes(value) ? value : '';
    if (savePeriod({ contraception: v })) {
      renderMyFlo();
      window.hubToast?.(v ? 'Contraception saved' : 'Contraception cleared');
    }
  };
  window.dayframeToggleMyFloPillToday = function dayframeToggleMyFloPillToday() {
    const s = settings();
    const todayISO = iso(new Date());
    const set = new Set(s.pillLog);
    set.has(todayISO) ? set.delete(todayISO) : set.add(todayISO);
    if (savePeriod({ pillLog: [...set].sort().slice(-90) })) {
      renderMyFlo();
      window.hubToast?.(set.has(todayISO) ? 'Logged for today' : 'Removed today');
    }
  };
  window.dayframeEnableMyFloBrowserNotifications = async function dayframeEnableMyFloBrowserNotifications() {
    if (!('Notification' in window)) return window.hubToast?.('Notifications are not available in this browser');
    const permission = await window.Notification.requestPermission();
    savePeriod({ browserNotifications: permission === 'granted' });
    renderMyFlo();
    window.hubToast?.(permission === 'granted' ? 'Phone alerts allowed' : 'Notifications not allowed');
  };
  window.dayframeOpenPeriodTracker = function dayframeOpenPeriodTracker(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (typeof window.go === 'function' && document.querySelector('.pg.on')?.id !== 'pg-driving') window.go('driving');
    apply();
    document.querySelectorAll('.driving-side-nav button').forEach((button) => button.classList.toggle('on', button.dataset.drivingPage === 'driving-cycle'));
    const panel = $('df-period-panel');
    if (panel) {
      panel.hidden = false;
      panel.style.display = '';
      setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    }
  };

  function sendDueReminder(s) {
    if (!s.browserNotifications || !('Notification' in window) || window.Notification.permission !== 'granted' || !s.lastStart) return;
    const today = iso(new Date());
    const next = nextPeriodStart(s, new Date());
    const lead = diffDays(next, today);
    if (!s.reminderDays.includes(lead)) return;
    const key = `period-${next}-${lead}`;
    if (s.lastReminders[key]) return;
    try {
      new window.Notification('MyFlo', { body: lead === 0 ? 'Your period is estimated for today.' : `Your period is estimated in ${lead} day${lead === 1 ? '' : 's'}.` });
    } catch {}
    savePeriod({ lastReminders: Object.assign({}, s.lastReminders, { [key]: new Date().toISOString() }) });
  }
  function observe() {
    if (observing || !document.body || typeof MutationObserver !== 'function') return;
    observing = true;
    const target = document.getElementById('pg-driving') || document.body;
    new MutationObserver(() => {
      // Only re-apply if our nav item or rendered view actually went missing.
      // renderMyFlo() is signature-guarded, so a spurious queue() is cheap.
      const nav = document.querySelector('.driving-side-nav [data-driving-page="driving-cycle"]');
      if (!nav || (!$('df-myflo-view') && $('df-period-panel'))) queue(80);
    }).observe(target, { childList: true, subtree: true });
  }
  function apply() {
    queued = false;
    ensureStyle();
    ensureNavAndCards();
    renderMyFlo();
    observe();
  }
  function queue(delay = 30) {
    if (queued) return;
    queued = true;
    setTimeout(apply, delay);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(apply, delay));
})();
