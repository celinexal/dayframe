(() => {
  'use strict';

  const VERSION = 'flo-v3';
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
    return {
      lastStart: isISO(raw.lastStart) ? raw.lastStart : '',
      lastEnd: isISO(raw.lastEnd) ? raw.lastEnd : '',
      cycleLength: clamp(raw.cycleLength, 28, 15, 60),
      periodLength: clamp(raw.periodLength, 5, 1, 14),
      notes: String(raw.notes || ''),
      loggedStarts: Array.isArray(raw.loggedStarts) ? raw.loggedStarts.filter(isISO).slice(-24) : [],
      loggedEnds: Array.isArray(raw.loggedEnds) ? raw.loggedEnds.filter(isISO).slice(-24) : [],
      reminderDays: reminderDays.length ? [...new Set(reminderDays)].sort((a, b) => b - a) : [1],
      reminderTime: /^\d{2}:\d{2}$/.test(String(raw.reminderTime || '')) ? raw.reminderTime : '09:00',
      browserNotifications: raw.browserNotifications === true,
      lastReminders: raw.lastReminders && typeof raw.lastReminders === 'object' ? raw.lastReminders : {},
    };
  }
  function formSettings() {
    const current = settings();
    return Object.assign({}, current, {
      lastStart: $('df-period-last-start')?.value || current.lastStart,
      cycleLength: clamp($('df-period-cycle-length')?.value, current.cycleLength, 15, 60),
      periodLength: clamp($('df-period-length')?.value, current.periodLength, 1, 14),
      notes: $('df-period-notes')?.value || '',
    });
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
      cells.push(`<button class="df-myflo-day ${state.classes.join(' ')}" type="button" onclick="dayframeSetMyFloStart('${dateISO}')" aria-label="${esc(day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}"><span>${day.getDate()}</span><i>${state.dots.slice(0, 2).map(() => '<b></b>').join('')}</i></button>`);
    }
    return `<article class="df-myflo-month"><h4>${esc(month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}</h4><div class="df-myflo-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="df-myflo-days">${cells.join('')}</div></article>`;
  }
  function renderReminders(s) {
    const options = [{ value: 3, label: '3 days before' }, { value: 2, label: '2 days before' }, { value: 1, label: '1 day before' }, { value: 0, label: 'On the day' }];
    const supported = 'Notification' in window;
    const permission = supported ? window.Notification.permission : 'unsupported';
    const permissionText = permission === 'granted' ? 'Phone alerts allowed' : permission === 'denied' ? 'Alerts blocked in browser settings' : 'Allow phone alerts';
    return `<section class="df-myflo-reminders"><div class="df-myflo-section-head"><div><span>Notifications</span><h3>Period reminders</h3></div><button type="button" onclick="dayframeSaveMyFloReminders()">Save</button></div><p class="df-myflo-helper">Choose when Dayframe reminds you before your estimated period. Fertile and ovulation days are marked automatically from your saved dates.</p><div class="df-myflo-chip-row" role="group" aria-label="Period reminder days">${options.map((option) => `<label class="df-myflo-chip"><input type="checkbox" name="df-myflo-reminder-day" value="${option.value}" ${s.reminderDays.includes(option.value) ? 'checked' : ''}><span>${option.label}</span></label>`).join('')}</div><div class="df-myflo-reminder-bottom"><label>Time <input id="df-myflo-reminder-time" type="time" value="${esc(s.reminderTime)}"></label><button type="button" onclick="dayframeEnableMyFloBrowserNotifications()" ${supported ? '' : 'disabled'}>${esc(permissionText)}</button></div></section>`;
  }
  function renderMyFlo() {
    const panel = $('df-period-panel');
    if (!panel) return;
    const s = settings();
    const sum = summary(s);
    const fertile = nextFertile(s);
    const head = panel.querySelector('.df-period-panel-head');
    if (head) {
      const eyebrow = head.querySelector('span');
      const title = head.querySelector('h2');
      const copy = head.querySelector('p');
      if (eyebrow) eyebrow.textContent = 'Private tracker';
      if (title) title.textContent = LABEL;
      if (copy) copy.textContent = 'Track your dates and let Dayframe estimate the rest.';
    }
    let view = $('df-myflo-view');
    if (!view) {
      view = document.createElement('div');
      view.id = 'df-myflo-view';
      const body = panel.querySelector('.df-period-body');
      if (body) panel.insertBefore(view, body);
      else panel.appendChild(view);
    }
    const savedRange = s.lastEnd && s.lastStart && diffDays(s.lastEnd, s.lastStart) >= 0
      ? `Last saved: ${shortDate(s.lastStart)} to ${shortDate(s.lastEnd)}.`
      : 'Tap one button when your period starts or finishes. Dayframe updates the calendar estimates after that.';
    view.innerHTML = `<section class="df-myflo-stats" aria-label="MyFlo overview"><article class="df-myflo-stat is-main"><span>${esc(sum.status)}</span><strong>${esc(sum.headline)}</strong><small>${esc(sum.detail)}</small></article><article class="df-myflo-stat"><span>Fertile window</span><strong>${esc(fertile ? shortRange(fertile.start, fertile.end) : 'Not set')}</strong><small>Estimated automatically from your period dates.</small></article><article class="df-myflo-stat"><span>Ovulation</span><strong>${esc(fertile ? shortDate(fertile.ovulation) : 'Not set')}</strong><small>Estimate only, not contraception guidance.</small></article></section><section class="df-myflo-actions" aria-label="Period tracking"><div><span>Today</span><h3>Update your period</h3><p>${esc(savedRange)}</p></div><div class="df-myflo-action-buttons"><button type="button" onclick="dayframeMarkMyFloStartedToday()">Period started today</button><button type="button" onclick="dayframeMarkMyFloEndedToday()">Period ended today</button></div></section><section class="df-myflo-board"><div class="df-myflo-calendar"><div class="df-myflo-calendar-head"><button type="button" onclick="dayframeShiftMyFloCalendar(-1)" aria-label="Previous month">&lt;</button><div><span>Calendar</span><h3>Estimated from your period dates</h3></div><button type="button" onclick="dayframeShiftMyFloCalendar(1)" aria-label="Next month">&gt;</button></div><div class="df-myflo-months">${renderMonth(calendarCursor, s)}${renderMonth(addMonths(calendarCursor, 1), s)}</div><div class="df-myflo-legend"><span><b class="period"></b>Period</span><span><b class="fertile"></b>Fertile</span><span><b class="ovulation"></b>Ovulation</span><span><b class="today"></b>Today</span></div></div>${renderReminders(s)}</section>`;
    decorateBaseForm(s);
    updateSummary(s, sum);
    sendDueReminder(s);
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
    if (last) last.value = s.lastStart;
    if ($('df-period-cycle-length')) $('df-period-cycle-length').value = String(s.cycleLength);
    if ($('df-period-length')) $('df-period-length').value = String(s.periodLength);
    if ($('df-period-notes')) $('df-period-notes').value = s.notes;
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
      #pg-driving .driving-hub-sub{display:none!important}.df-flo-nav{display:flex!important}#df-period-panel{border:1px solid #f0d9ec!important;background:linear-gradient(145deg,#fff 0%,#fff7fb 52%,#edfffb 100%)!important}#df-period-panel .df-period-panel-head{background:linear-gradient(120deg,#fff7fb 0%,#fff 48%,#effffb 100%)!important}#df-period-panel .df-period-estimate{display:none!important}
      #df-myflo-view{display:grid;gap:14px;padding:16px}.df-myflo-stats{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:12px}.df-myflo-stat{min-height:118px;border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.78);padding:16px;box-shadow:0 14px 28px rgba(42,54,84,.055)}.df-myflo-stat.is-main{background:linear-gradient(135deg,#fff 0%,#fff1f7 55%,#eefffb 100%);border-color:#f5cde2}.df-myflo-stat span,.df-myflo-section-head span,.df-myflo-calendar-head span,.df-myflo-form-title span,.df-myflo-actions span{display:block;color:#7c879a;font-size:9px;font-weight:900;text-transform:uppercase}.df-myflo-stat strong{display:block;margin:8px 0 7px;font-family:var(--fd);font-size:28px;line-height:1;color:#172033}.df-myflo-stat small{display:block;color:#6f7a8c;font-size:11px;line-height:1.45;font-weight:750}
      .df-myflo-actions{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #f3d8e8;border-radius:18px;background:linear-gradient(135deg,#fff 0%,#fff3f8 58%,#effffc 100%);padding:15px 16px;box-shadow:0 14px 28px rgba(42,54,84,.052)}.df-myflo-actions h3{margin:3px 0 4px;font-family:var(--fd);font-size:19px;color:#172033}.df-myflo-actions p{margin:0;color:#6f7a8c;font-size:11px;line-height:1.45;font-weight:750}.df-myflo-action-buttons{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.df-myflo-action-buttons button{height:38px;border:1px solid #f2bdd7;border-radius:999px;background:#fff;color:#d94382;font:850 11px var(--ff);padding:0 14px;cursor:pointer}.df-myflo-action-buttons button:first-child{background:#ff5d93;color:#fff;border-color:#ff5d93;box-shadow:0 10px 20px rgba(255,93,147,.18)}
      .df-myflo-board{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px;align-items:start}.df-myflo-calendar,.df-myflo-reminders{border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.84);padding:14px;box-shadow:0 14px 28px rgba(42,54,84,.052)}.df-myflo-calendar-head,.df-myflo-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.df-myflo-calendar-head h3,.df-myflo-section-head h3,.df-myflo-form-title h3{margin:3px 0 0;font-family:var(--fd);font-size:18px;line-height:1.1;color:#172033}.df-myflo-calendar-head button,.df-myflo-section-head button,.df-myflo-reminder-bottom button{height:34px;border:1px solid #eadffc;border-radius:999px;background:#fff;color:#7161f1;font:850 11px var(--ff);padding:0 13px;cursor:pointer}.df-myflo-calendar-head button{width:34px;padding:0;font-size:18px}
      .df-myflo-months{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.df-myflo-month{border:1px solid #f0edf5;border-radius:16px;background:#fff;padding:12px}.df-myflo-month h4{margin:0 0 11px;text-align:center;font-family:var(--fd);font-size:18px;color:#172033}.df-myflo-weekdays,.df-myflo-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.df-myflo-weekdays span{text-align:center;color:#8a94a4;font-size:9px;font-weight:900}.df-myflo-day{position:relative;display:grid;place-items:center;aspect-ratio:1;border:0;border-radius:999px;background:transparent;color:#172033;font:850 12px var(--ff);cursor:pointer}.df-myflo-day span{position:relative;z-index:2}.df-myflo-day i{position:absolute;left:50%;bottom:4px;display:flex;gap:2px;transform:translateX(-50%);font-style:normal}.df-myflo-day i b{width:4px;height:4px;border-radius:999px;background:#c6cdd8}.df-myflo-day.is-outside{color:#c4cad5}.df-myflo-day.is-period{background:#ff5d93;color:#fff;box-shadow:0 7px 16px rgba(255,93,147,.22)}.df-myflo-day.is-period:not(.is-logged){background:#fff1f6;color:#e84f87;border:1px dashed #f06fa1;box-shadow:none}.df-myflo-day.is-fertile:not(.is-period){background:#ecfffb;color:#10998f}.df-myflo-day.is-ovulation{outline:2px dotted #32b8ab;outline-offset:2px}.df-myflo-day.is-today:after{content:"";position:absolute;inset:2px;border:2px solid #7564f2;border-radius:999px}.df-myflo-day.is-logged{background:#ff5d93;color:#fff}
      .df-myflo-legend{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;color:#7b8495;font-size:10px;font-weight:850}.df-myflo-legend span{display:inline-flex;align-items:center;gap:6px;border:1px solid #eef1f6;border-radius:999px;background:#fff;padding:6px 8px}.df-myflo-legend b{width:9px;height:9px;border-radius:999px;display:inline-block}.df-myflo-legend .period{background:#ff5d93}.df-myflo-legend .fertile{background:#48d5c2}.df-myflo-legend .ovulation{border:2px dotted #32b8ab}.df-myflo-legend .today{border:2px solid #7564f2}.df-myflo-chip-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.df-myflo-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid #efe5f7;border-radius:999px;background:#fff;padding:8px 10px;color:#606c80;font-size:10.5px;font-weight:850;cursor:pointer}.df-myflo-chip input{accent-color:#ef5f9b}.df-myflo-chip:has(input:checked){background:#fff1f7;border-color:#f4b9d5;color:#d94382}.df-myflo-helper{margin:-3px 0 8px;color:#738095;font-size:10.5px;line-height:1.5;font-weight:750}.df-myflo-reminder-bottom{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:12px}.df-myflo-reminder-bottom label{display:grid;gap:5px;color:#7b8495;font-size:9.5px;font-weight:850}.df-myflo-reminder-bottom input{height:34px;border:1px solid #e7eaf3;border-radius:12px;background:#f8f9fc;padding:0 10px;color:#172033;font:800 12px var(--ff)}#df-period-panel .df-period-body.df-myflo-basics{display:block!important;padding:0 16px 16px!important}#df-period-panel .df-period-form{border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.82);padding:14px;box-shadow:0 14px 28px rgba(42,54,84,.05)}
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
      flo.innerHTML = '<span>F</span>MyFlo';
      flo.classList.remove('df-essentials-hidden');
      flo.setAttribute('aria-hidden', 'false');
    }
    const theory = nav?.querySelector('[data-driving-page="driving-theory"]');
    if (theory) {
      theory.classList.add('df-essentials-hidden');
      theory.setAttribute('aria-hidden', 'true');
    }
    const card = $('df-period-card');
    if (card) {
      card.setAttribute('onclick', 'dayframeOpenPeriodTracker(event)');
      const title = card.querySelector('.driving-home-title');
      const kicker = card.querySelector('.driving-home-kicker');
      if (title) title.textContent = LABEL;
      if (kicker) kicker.textContent = 'Private';
      updateSummary();
    }
    const panelTitle = $('df-period-panel')?.querySelector('.df-period-panel-head h2');
    if (panelTitle) panelTitle.textContent = LABEL;
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
    new MutationObserver(() => {
      if (/Period tracker|Cycle tracker|\bFlo\b/.test(document.body.innerText || '') || !$('df-myflo-view')) queue();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
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
