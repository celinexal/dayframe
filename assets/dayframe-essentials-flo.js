(() => {
  'use strict';

  const VERSION = 'flo-v2';
  const FLAG = 'data-dayframe-essentials-flo';
  const LABEL = 'MyFlo';
  const HOME_DESC = 'My Car, MyFlo, documents and reminders in one place.';
  const MOBILE_DESC = 'My Car, MyFlo and everyday tools';
  const DAY_MS = 86400000;

  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  let applyQueued = false;
  let observerInstalled = false;
  let previousFloOpener = null;
  let calendarCursor = firstOfMonth(new Date());

  function byId(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function clampNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function isHidden(el) {
    if (!el) return true;
    const style = getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('df-essentials-hidden', Boolean(hidden));
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function setButtonLabel(button, label) {
    if (!button) return;
    const textNode = [...button.childNodes].reverse().find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (textNode) textNode.textContent = label;
    else button.appendChild(document.createTextNode(label));
  }

  function readData() {
    if (typeof window.hubLoad !== 'function') return {};
    const data = window.hubLoad() || {};
    data.essentials = data.essentials || {};
    data.essentials.period = data.essentials.period || {};
    return data;
  }

  function savePeriodPatch(nextPeriod) {
    if (typeof window.hubLoad !== 'function' || typeof window.hubSave !== 'function') return false;
    const data = readData();
    data.essentials.period = Object.assign({}, data.essentials.period || {}, nextPeriod, {
      updatedAt: new Date().toISOString(),
    });
    window.hubSave(data);
    return true;
  }

  function isISO(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  }

  function parseISO(value) {
    if (!isISO(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function isoFromDate(value) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function firstOfMonth(value) {
    const date = value ? new Date(value) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  }

  function addDays(value, days) {
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    if (!date) return null;
    date.setDate(date.getDate() + days);
    return date;
  }

  function addDaysISO(value, days) {
    const date = addDays(value, days);
    return date ? isoFromDate(date) : '';
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
    return Math.round((firstOfDay(a).getTime() - firstOfDay(b).getTime()) / DAY_MS);
  }

  function firstOfDay(value) {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  }

  function formatShort(value) {
    const date = typeof value === 'string' ? parseISO(value) : value;
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function formatRange(start, end) {
    if (!start || !end) return 'Not set';
    if (start.slice(0, 7) === end.slice(0, 7)) {
      return `${Number(start.slice(8))}-${formatShort(end)}`;
    }
    return `${formatShort(start)}-${formatShort(end)}`;
  }

  function readSettings() {
    const raw = readData().essentials?.period || {};
    const reminderDays = Array.isArray(raw.reminderDays) ? raw.reminderDays.map(Number).filter((day) => [7, 3, 2, 1, 0].includes(day)) : [3, 1];
    const loggedStarts = Array.isArray(raw.loggedStarts) ? raw.loggedStarts.filter(isISO).slice(-24) : [];
    return {
      lastStart: isISO(raw.lastStart) ? raw.lastStart : '',
      cycleLength: clampNumber(raw.cycleLength, 28, 15, 60),
      periodLength: clampNumber(raw.periodLength, 5, 1, 14),
      notes: String(raw.notes || ''),
      loggedStarts,
      reminderDays: reminderDays.length ? [...new Set(reminderDays)].sort((a, b) => b - a) : [3, 1],
      reminderTime: /^\d{2}:\d{2}$/.test(String(raw.reminderTime || '')) ? raw.reminderTime : '09:00',
      reminderKinds: Object.assign({ period: true, fertile: false, ovulation: false }, raw.reminderKinds || {}),
      browserNotifications: raw.browserNotifications === true,
      lastReminders: raw.lastReminders && typeof raw.lastReminders === 'object' ? raw.lastReminders : {},
    };
  }

  function cycleAnchor(settings, base = new Date()) {
    const start = parseISO(settings.lastStart);
    if (!start) return null;
    let anchor = start;
    while (diffDays(addDays(anchor, settings.cycleLength), base) <= 0) {
      anchor = addDays(anchor, settings.cycleLength);
    }
    while (diffDays(anchor, base) > 0) {
      anchor = addDays(anchor, -settings.cycleLength);
    }
    return anchor;
  }

  function nextPeriodStart(settings, base = new Date()) {
    const anchor = cycleAnchor(settings, base);
    if (!anchor) return '';
    const dayInCycle = diffDays(base, anchor);
    if (dayInCycle >= 0 && dayInCycle < settings.periodLength) return isoFromDate(anchor);
    return isoFromDate(addDays(anchor, settings.cycleLength));
  }

  function fertileWindowForPeriod(periodStart) {
    if (!periodStart) return null;
    const ovulation = addDaysISO(periodStart, -14);
    return {
      start: addDaysISO(ovulation, -5),
      end: ovulation,
      ovulation,
    };
  }

  function nextFertileWindow(settings, base = new Date()) {
    if (!settings.lastStart) return null;
    let periodStart = nextPeriodStart(settings, base);
    let window = fertileWindowForPeriod(periodStart);
    if (window && diffDays(window.end, base) < 0) {
      periodStart = addDaysISO(periodStart, settings.cycleLength);
      window = fertileWindowForPeriod(periodStart);
    }
    return window;
  }

  function periodSummary(settings = readSettings()) {
    if (!settings.lastStart) {
      return {
        headline: 'Set your dates',
        detail: 'Add a start date to see your calendar.',
        card: 'Calendar, fertile window and reminders',
        status: 'Not set',
      };
    }
    const today = firstOfDay(new Date());
    const anchor = cycleAnchor(settings, today);
    const dayInCycle = anchor ? diffDays(today, anchor) : 0;
    if (dayInCycle >= 0 && dayInCycle < settings.periodLength) {
      return {
        headline: `Day ${dayInCycle + 1}`,
        detail: `Started ${formatShort(anchor)}. Next estimate ${formatShort(addDays(anchor, settings.cycleLength))}.`,
        card: `Period day ${dayInCycle + 1}`,
        status: 'Current period',
      };
    }
    const next = nextPeriodStart(settings, today);
    const days = diffDays(next, today);
    return {
      headline: formatShort(next),
      detail: days === 1 ? 'Estimated tomorrow.' : days === 0 ? 'Estimated today.' : `Estimated in about ${days} days.`,
      card: days === 1 ? 'Tomorrow' : days === 0 ? 'Today' : `In about ${days} days`,
      status: 'Next period',
    };
  }

  function dayClasses(iso, settings) {
    const classes = [];
    const dots = [];
    const today = isoFromDate(new Date());
    if (iso === today) classes.push('is-today');
    if (settings.loggedStarts.includes(iso)) {
      classes.push('is-logged');
      dots.push('Saved start');
    }
    if (settings.lastStart) {
      let start = parseISO(settings.lastStart);
      const current = parseISO(iso);
      const min = addDays(current, -70);
      const max = addDays(current, 70);
      while (diffDays(start, min) > 0) start = addDays(start, -settings.cycleLength);
      while (diffDays(start, max) <= 0) {
        const startIso = isoFromDate(start);
        const dayOffset = diffDays(iso, start);
        if (dayOffset >= 0 && dayOffset < settings.periodLength) {
          classes.push('is-period');
          dots.push(startIso === iso ? 'Period start' : 'Period');
        }
        const fertile = fertileWindowForPeriod(startIso);
        if (fertile && diffDays(iso, fertile.start) >= 0 && diffDays(fertile.end, iso) >= 0) {
          classes.push('is-fertile');
          dots.push(iso === fertile.ovulation ? 'Ovulation estimate' : 'Fertile estimate');
        }
        if (fertile?.ovulation === iso) classes.push('is-ovulation');
        start = addDays(start, settings.cycleLength);
      }
    }
    return { classes: [...new Set(classes)], dots: [...new Set(dots)] };
  }

  function renderMonth(monthDate, settings) {
    const month = firstOfMonth(monthDate);
    const start = addDays(month, -month.getDay());
    const title = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const day = addDays(start, index);
      const iso = isoFromDate(day);
      const state = dayClasses(iso, settings);
      if (day.getMonth() !== month.getMonth()) state.classes.push('is-outside');
      cells.push(`
        <button class="df-myflo-day ${state.classes.join(' ')}" type="button" onclick="dayframeSetMyFloStart('${iso}')" aria-label="${esc(day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}">
          <span>${day.getDate()}</span>
          <i>${state.dots.slice(0, 2).map(() => '<b></b>').join('')}</i>
        </button>
      `);
    }
    return `
      <article class="df-myflo-month">
        <h4>${esc(title)}</h4>
        <div class="df-myflo-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
        <div class="df-myflo-days">${cells.join('')}</div>
      </article>
    `;
  }

  function renderReminderOptions(settings) {
    const dayOptions = [
      { value: 3, label: '3 days before' },
      { value: 2, label: '2 days before' },
      { value: 1, label: '1 day before' },
      { value: 0, label: 'On the day' },
    ];
    const kindOptions = [
      { key: 'period', label: 'Period' },
      { key: 'fertile', label: 'Fertile window' },
      { key: 'ovulation', label: 'Ovulation' },
    ];
    const notifySupported = 'Notification' in window;
    const permission = notifySupported ? window.Notification.permission : 'unsupported';
    const permissionText = permission === 'granted' ? 'Phone alerts allowed' : permission === 'denied' ? 'Alerts blocked in browser settings' : 'Allow phone alerts';
    return `
      <section class="df-myflo-reminders">
        <div class="df-myflo-section-head">
          <div><span>Notifications</span><h3>Choose your reminders</h3></div>
          <button type="button" onclick="dayframeSaveMyFloReminders()">Save</button>
        </div>
        <div class="df-myflo-chip-row" role="group" aria-label="Period reminder days">
          ${dayOptions.map((option) => `
            <label class="df-myflo-chip">
              <input type="checkbox" name="df-myflo-reminder-day" value="${option.value}" ${settings.reminderDays.includes(option.value) ? 'checked' : ''}>
              <span>${option.label}</span>
            </label>
          `).join('')}
        </div>
        <div class="df-myflo-chip-row" role="group" aria-label="Reminder type">
          ${kindOptions.map((option) => `
            <label class="df-myflo-chip muted">
              <input type="checkbox" name="df-myflo-reminder-kind" value="${option.key}" ${settings.reminderKinds[option.key] ? 'checked' : ''}>
              <span>${option.label}</span>
            </label>
          `).join('')}
        </div>
        <div class="df-myflo-reminder-bottom">
          <label>Time <input id="df-myflo-reminder-time" type="time" value="${esc(settings.reminderTime)}"></label>
          <button type="button" onclick="dayframeEnableMyFloBrowserNotifications()" ${notifySupported ? '' : 'disabled'}>${esc(permissionText)}</button>
        </div>
      </section>
    `;
  }

  function renderMyFloExperience() {
    const panel = byId('df-period-panel');
    if (!panel) return;
    const settings = readSettings();
    const summary = periodSummary(settings);
    const fertile = nextFertileWindow(settings);

    const head = panel.querySelector('.df-period-panel-head');
    if (head) {
      const eyebrow = head.querySelector('span');
      const title = head.querySelector('h2');
      const copy = head.querySelector('p');
      if (eyebrow) eyebrow.textContent = 'Private tracker';
      if (title) title.textContent = LABEL;
      if (copy) copy.textContent = 'Track your dates, estimates and reminders privately.';
    }

    let view = byId('df-myflo-view');
    if (!view) {
      view = document.createElement('div');
      view.id = 'df-myflo-view';
      const body = panel.querySelector('.df-period-body');
      if (body) panel.insertBefore(view, body);
      else panel.appendChild(view);
    }

    view.innerHTML = `
      <section class="df-myflo-stats" aria-label="MyFlo overview">
        <article class="df-myflo-stat is-main">
          <span>${esc(summary.status)}</span>
          <strong>${esc(summary.headline)}</strong>
          <small>${esc(summary.detail)}</small>
        </article>
        <article class="df-myflo-stat">
          <span>Fertile window</span>
          <strong>${esc(fertile ? formatRange(fertile.start, fertile.end) : 'Not set')}</strong>
          <small>Estimate only, not contraception guidance.</small>
        </article>
        <article class="df-myflo-stat">
          <span>Ovulation</span>
          <strong>${esc(fertile ? formatShort(fertile.ovulation) : 'Not set')}</strong>
          <small>Based on your saved cycle length.</small>
        </article>
      </section>
      <section class="df-myflo-board">
        <div class="df-myflo-calendar">
          <div class="df-myflo-calendar-head">
            <button type="button" onclick="dayframeShiftMyFloCalendar(-1)" aria-label="Previous month">&lt;</button>
            <div><span>Calendar</span><h3>Tap the first day to update</h3></div>
            <button type="button" onclick="dayframeShiftMyFloCalendar(1)" aria-label="Next month">&gt;</button>
          </div>
          <div class="df-myflo-months">
            ${renderMonth(calendarCursor, settings)}
            ${renderMonth(addMonths(calendarCursor, 1), settings)}
          </div>
          <div class="df-myflo-legend">
            <span><b class="period"></b>Period</span>
            <span><b class="fertile"></b>Fertile</span>
            <span><b class="ovulation"></b>Ovulation</span>
            <span><b class="today"></b>Today</span>
          </div>
        </div>
        ${renderReminderOptions(settings)}
      </section>
    `;

    decorateOldForm(settings);
    syncExistingFields(settings);
    updateExistingSummary(settings, summary);
    maybeSendDueReminder(settings);
  }

  function decorateOldForm(settings) {
    const body = byId('df-period-panel')?.querySelector('.df-period-body');
    const form = body?.querySelector('.df-period-form');
    if (!body || !form) return;
    body.classList.add('df-myflo-basics');
    if (!form.querySelector('.df-myflo-form-title')) {
      form.insertAdjacentHTML('afterbegin', `
        <div class="df-myflo-form-title">
          <span>Basics</span>
          <h3>Keep the estimate accurate</h3>
        </div>
      `);
    }
    const save = form.querySelector('.df-period-actions button.primary');
    if (save) save.textContent = 'Save MyFlo';
    const clear = form.querySelector('.df-period-actions button:not(.primary)');
    if (clear) clear.textContent = 'Reset';
    const last = byId('df-period-last-start');
    if (last && !last.dataset.myfloHint) {
      last.dataset.myfloHint = 'true';
      last.closest('label')?.appendChild(Object.assign(document.createElement('small'), {
        textContent: 'You can also tap the calendar.',
      }));
    }
    if (!settings.lastStart) calendarCursor = firstOfMonth(new Date());
  }

  function syncExistingFields(settings = readSettings()) {
    const last = byId('df-period-last-start');
    const cycle = byId('df-period-cycle-length');
    const length = byId('df-period-length');
    const notes = byId('df-period-notes');
    if (last) last.value = settings.lastStart;
    if (cycle) cycle.value = String(settings.cycleLength);
    if (length) length.value = String(settings.periodLength);
    if (notes) notes.value = settings.notes;
  }

  function updateExistingSummary(settings = readSettings(), summary = periodSummary(settings)) {
    const card = byId('df-period-card');
    const desc = byId('df-period-card-desc') || card?.querySelector('.driving-home-desc');
    const badge = byId('df-period-card-summary');
    const nextDate = byId('df-period-next-date');
    const nextDetail = byId('df-period-next-detail');
    if (desc) desc.textContent = settings.lastStart ? `${summary.status}: ${summary.headline}.` : 'Calendar, fertile window and reminders.';
    if (badge) badge.textContent = summary.card;
    if (nextDate) nextDate.textContent = summary.headline;
    if (nextDetail) nextDetail.textContent = summary.detail;
  }

  function ensureStyle() {
    if (byId('df-essentials-flo-style')) return;
    const style = document.createElement('style');
    style.id = 'df-essentials-flo-style';
    style.textContent = `
      #pg-driving .driving-hub-sub{display:none!important}
      #pg-driving .driving-home-card.car{cursor:pointer!important}
      .df-flo-nav{display:flex!important}
      #df-period-panel{border:1px solid #f0d9ec!important;background:linear-gradient(145deg,#fff 0%,#fff7fb 52%,#edfffb 100%)!important}
      #df-period-panel .df-period-panel-head{background:linear-gradient(120deg,#fff7fb 0%,#fff 48%,#effffb 100%)!important}
      #df-period-panel .df-period-estimate{display:none!important}
      #df-myflo-view{display:grid;gap:14px;padding:16px}
      .df-myflo-stats{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:12px}
      .df-myflo-stat{min-height:118px;border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.78);padding:16px;box-shadow:0 14px 28px rgba(42,54,84,.055)}
      .df-myflo-stat.is-main{background:linear-gradient(135deg,#fff 0%,#fff1f7 55%,#eefffb 100%);border-color:#f5cde2}
      .df-myflo-stat span,.df-myflo-section-head span,.df-myflo-calendar-head span,.df-myflo-form-title span{display:block;color:#7c879a;font-size:9px;font-weight:900;letter-spacing:0;text-transform:uppercase}
      .df-myflo-stat strong{display:block;margin:8px 0 7px;font-family:var(--fd);font-size:28px;line-height:1;color:#172033;letter-spacing:0}
      .df-myflo-stat small{display:block;color:#6f7a8c;font-size:11px;line-height:1.45;font-weight:750}
      .df-myflo-board{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px;align-items:start}
      .df-myflo-calendar,.df-myflo-reminders{border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.84);padding:14px;box-shadow:0 14px 28px rgba(42,54,84,.052)}
      .df-myflo-calendar-head,.df-myflo-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
      .df-myflo-calendar-head h3,.df-myflo-section-head h3,.df-myflo-form-title h3{margin:3px 0 0;font-family:var(--fd);font-size:18px;line-height:1.1;color:#172033;letter-spacing:0}
      .df-myflo-calendar-head button,.df-myflo-section-head button,.df-myflo-reminder-bottom button{height:34px;border:1px solid #eadffc;border-radius:999px;background:#fff;color:#7161f1;font:850 11px var(--ff);padding:0 13px;cursor:pointer}
      .df-myflo-calendar-head button{width:34px;padding:0;font-size:18px}
      .df-myflo-months{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .df-myflo-month{border:1px solid #f0edf5;border-radius:16px;background:#fff;padding:12px}
      .df-myflo-month h4{margin:0 0 11px;text-align:center;font-family:var(--fd);font-size:18px;color:#172033;letter-spacing:0}
      .df-myflo-weekdays,.df-myflo-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
      .df-myflo-weekdays span{text-align:center;color:#8a94a4;font-size:9px;font-weight:900}
      .df-myflo-day{position:relative;display:grid;place-items:center;aspect-ratio:1;border:0;border-radius:999px;background:transparent;color:#172033;font:850 12px var(--ff);cursor:pointer}
      .df-myflo-day span{position:relative;z-index:2}
      .df-myflo-day i{position:absolute;left:50%;bottom:4px;display:flex;gap:2px;transform:translateX(-50%);font-style:normal}
      .df-myflo-day i b{width:4px;height:4px;border-radius:999px;background:#c6cdd8}
      .df-myflo-day.is-outside{color:#c4cad5}
      .df-myflo-day.is-period{background:#ff5d93;color:#fff;box-shadow:0 7px 16px rgba(255,93,147,.22)}
      .df-myflo-day.is-period:not(.is-logged){background:#fff1f6;color:#e84f87;border:1px dashed #f06fa1;box-shadow:none}
      .df-myflo-day.is-fertile:not(.is-period){background:#ecfffb;color:#10998f}
      .df-myflo-day.is-ovulation{outline:2px dotted #32b8ab;outline-offset:2px}
      .df-myflo-day.is-today:after{content:"";position:absolute;inset:2px;border:2px solid #7564f2;border-radius:999px}
      .df-myflo-day.is-logged{background:#ff5d93;color:#fff}
      .df-myflo-legend{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;color:#7b8495;font-size:10px;font-weight:850}
      .df-myflo-legend span{display:inline-flex;align-items:center;gap:6px;border:1px solid #eef1f6;border-radius:999px;background:#fff;padding:6px 8px}
      .df-myflo-legend b{width:9px;height:9px;border-radius:999px;display:inline-block}
      .df-myflo-legend .period{background:#ff5d93}.df-myflo-legend .fertile{background:#48d5c2}.df-myflo-legend .ovulation{border:2px dotted #32b8ab}.df-myflo-legend .today{border:2px solid #7564f2}
      .df-myflo-chip-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
      .df-myflo-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid #efe5f7;border-radius:999px;background:#fff;padding:8px 10px;color:#606c80;font-size:10.5px;font-weight:850;cursor:pointer}
      .df-myflo-chip input{accent-color:#ef5f9b}
      .df-myflo-chip:has(input:checked){background:#fff1f7;border-color:#f4b9d5;color:#d94382}
      .df-myflo-chip.muted:has(input:checked){background:#edfffb;border-color:#bceee5;color:#168d84}
      .df-myflo-reminder-bottom{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:12px}
      .df-myflo-reminder-bottom label{display:grid;gap:5px;color:#7b8495;font-size:9.5px;font-weight:850}
      .df-myflo-reminder-bottom input{height:34px;border:1px solid #e7eaf3;border-radius:12px;background:#f8f9fc;padding:0 10px;color:#172033;font:800 12px var(--ff)}
      #df-period-panel .df-period-body.df-myflo-basics{display:block!important;padding:0 16px 16px!important}
      #df-period-panel .df-period-form{border:1px solid #edf0f7;border-radius:18px;background:rgba(255,255,255,.82);padding:14px;box-shadow:0 14px 28px rgba(42,54,84,.05)}
      #df-period-panel .df-period-form-grid label small{color:#a2abb9;font-size:9px;font-weight:750}
      @media(max-width:980px){.df-myflo-stats,.df-myflo-board,.df-myflo-months{grid-template-columns:1fr}.df-myflo-reminder-bottom{grid-template-columns:1fr}.df-myflo-stat{min-height:0}}
      @media(max-width:520px){#df-myflo-view{padding:12px}.df-myflo-stat strong{font-size:24px}.df-myflo-day{font-size:11px}.df-myflo-month{padding:10px}}
    `;
    document.head.appendChild(style);
  }

  function ensureFloNav() {
    const nav = document.querySelector('.driving-side-nav');
    if (!nav) return;
    let flo = nav.querySelector('[data-driving-page="driving-cycle"]');
    if (!flo) {
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
    setButtonLabel(flo, LABEL);
    setHidden(flo, false);
    setHidden(nav.querySelector('[data-driving-page="driving-theory"]'), true);
  }

  function updateMyCarCard() {
    const card = document.querySelector('#pg-driving .driving-home-card.car');
    if (!card) return;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('onclick', 'dayframeOpenMyCarCard(event)');
    card.setAttribute('onkeydown', 'dayframeOpenMyCarCardKey(event)');
    const title = card.querySelector('.driving-home-title');
    const desc = card.querySelector('.driving-home-desc');
    const question = card.querySelector('.df-car-question');
    if (title) title.textContent = 'My Car';
    if (desc) desc.textContent = 'Vehicle details, dates and reminders.';
    if (question) question.textContent = 'Need to pass your theory?';
    card.querySelector('.df-car-actions button.primary')?.remove();
    let actions = card.querySelector('.df-car-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'df-car-actions';
      card.appendChild(actions);
    }
    let button = actions.querySelector('button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      actions.appendChild(button);
    }
    button.textContent = 'Practise theory';
    button.setAttribute('onclick', 'dayframeOpenTheoryHelp(event)');
  }

  function updateFloCard() {
    const card = byId('df-period-card');
    if (!card) return;
    const settings = readSettings();
    const summary = periodSummary(settings);
    const title = card.querySelector('.driving-home-title');
    const kicker = card.querySelector('.driving-home-kicker');
    if (title) title.textContent = LABEL;
    if (kicker) kicker.textContent = 'Private';
    card.setAttribute('onclick', 'dayframeOpenPeriodTracker(event)');
    updateExistingSummary(settings, summary);
  }

  function updateFloPanel() {
    const panel = byId('df-period-panel');
    if (!panel) return;
    const title = panel.querySelector('.df-period-panel-head h2');
    const close = panel.querySelector('.df-period-panel-close');
    if (title) title.textContent = LABEL;
    if (close) close.setAttribute('aria-label', `Close ${LABEL}`);
    renderMyFloExperience();
  }

  function updateLabels() {
    const page = byId('pg-driving');
    const heroTitle = page?.querySelector('.driving-hub-title');
    const heroSub = page?.querySelector('.driving-hub-sub');
    const heroPills = page?.querySelector('.driving-hub-pills');
    if (heroTitle) heroTitle.textContent = 'Essentials';
    if (heroSub) heroSub.textContent = '';
    if (heroPills) heroPills.innerHTML = '<span class="driving-hub-pill"><b></b>My Car</span><span class="driving-hub-pill"><b></b>MyFlo</span>';

    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`);
    if (mobileMore) {
      const strong = mobileMore.querySelector('strong');
      const small = mobileMore.querySelector('small');
      if (strong) strong.textContent = 'Essentials';
      if (small) small.textContent = MOBILE_DESC;
    }

    const homeCard = document.querySelector('[data-home-module="driving"]');
    if (homeCard?.querySelector('.hub-module-title')) homeCard.querySelector('.hub-module-title').textContent = 'Essentials';
    if (homeCard?.querySelector('.hub-module-desc')) homeCard.querySelector('.hub-module-desc').textContent = HOME_DESC;

    const editor = byId('home-editor-content');
    if (editor && !isHidden(editor)) {
      editor.querySelectorAll('small').forEach((small) => {
        if (/Car and period tracker|Car and cycle tracker|My Car, Flo/i.test(small.textContent)) {
          small.textContent = MOBILE_DESC;
        }
      });
      editor.querySelectorAll('p').forEach((p) => {
        if (/period tracker|cycle tracker|theory help inside My Car|My Car, Flo/i.test(p.textContent)) {
          p.textContent = 'Choose the main spaces and Home order. Essentials keeps My Car, MyFlo and everyday tools together.';
        }
      });
    }
  }

  function selectFloNav() {
    document.querySelectorAll('.driving-side-nav button').forEach((button) => {
      button.classList.toggle('on', button.dataset.drivingPage === 'driving-cycle');
    });
  }

  function readFormSettings() {
    const current = readSettings();
    return Object.assign({}, current, {
      lastStart: byId('df-period-last-start')?.value || current.lastStart,
      cycleLength: clampNumber(byId('df-period-cycle-length')?.value, current.cycleLength, 15, 60),
      periodLength: clampNumber(byId('df-period-length')?.value, current.periodLength, 1, 14),
      notes: byId('df-period-notes')?.value || '',
    });
  }

  window.dayframeSavePeriodTracker = function dayframeSavePeriodTracker() {
    const settings = readFormSettings();
    if (!settings.lastStart) {
      window.hubToast?.('Add the first day of your period');
      return;
    }
    const loggedStarts = [...new Set((settings.loggedStarts || []).concat(settings.lastStart))].filter(isISO).slice(-24);
    if (savePeriodPatch(Object.assign({}, settings, { loggedStarts }))) {
      renderMyFloExperience();
      window.renderHome?.();
      applySoon(30);
      window.hubToast?.('MyFlo saved');
    }
  };

  window.dayframeClearPeriodTracker = function dayframeClearPeriodTracker() {
    if (savePeriodPatch({
      lastStart: '',
      cycleLength: 28,
      periodLength: 5,
      notes: '',
      loggedStarts: [],
    })) {
      renderMyFloExperience();
      applySoon(30);
      window.hubToast?.('MyFlo reset');
    }
  };

  window.dayframeSetMyFloStart = function dayframeSetMyFloStart(iso) {
    if (!isISO(iso)) return;
    const settings = readFormSettings();
    const loggedStarts = [...new Set((settings.loggedStarts || []).concat(iso))].filter(isISO).slice(-24);
    if (savePeriodPatch(Object.assign({}, settings, { lastStart: iso, loggedStarts }))) {
      calendarCursor = firstOfMonth(parseISO(iso));
      renderMyFloExperience();
      window.renderHome?.();
      window.hubToast?.('MyFlo start date saved');
    }
  };

  window.dayframeShiftMyFloCalendar = function dayframeShiftMyFloCalendar(months) {
    calendarCursor = addMonths(calendarCursor, Number(months) || 0);
    renderMyFloExperience();
  };

  window.dayframeSaveMyFloReminders = function dayframeSaveMyFloReminders() {
    const settings = readFormSettings();
    const reminderDays = Array.from(document.querySelectorAll('input[name="df-myflo-reminder-day"]:checked')).map((input) => Number(input.value)).filter((value) => [3, 2, 1, 0].includes(value));
    const kinds = Array.from(document.querySelectorAll('input[name="df-myflo-reminder-kind"]:checked')).map((input) => input.value);
    const reminderKinds = {
      period: kinds.includes('period'),
      fertile: kinds.includes('fertile'),
      ovulation: kinds.includes('ovulation'),
    };
    if (savePeriodPatch(Object.assign({}, settings, {
      reminderDays: reminderDays.length ? reminderDays : [1],
      reminderKinds,
      reminderTime: byId('df-myflo-reminder-time')?.value || settings.reminderTime,
    }))) {
      renderMyFloExperience();
      window.hubToast?.('MyFlo reminders saved');
    }
  };

  window.dayframeEnableMyFloBrowserNotifications = async function dayframeEnableMyFloBrowserNotifications() {
    if (!('Notification' in window)) {
      window.hubToast?.('Notifications are not available in this browser');
      return;
    }
    const permission = await window.Notification.requestPermission();
    const settings = readSettings();
    savePeriodPatch(Object.assign({}, settings, { browserNotifications: permission === 'granted' }));
    renderMyFloExperience();
    window.hubToast?.(permission === 'granted' ? 'Phone alerts allowed' : 'Notifications not allowed');
  };

  function maybeSendDueReminder(settings) {
    if (!settings.browserNotifications || !('Notification' in window) || window.Notification.permission !== 'granted' || !settings.lastStart) return;
    const today = isoFromDate(new Date());
    const due = [];
    const nextPeriod = nextPeriodStart(settings, new Date());
    const periodLead = diffDays(nextPeriod, today);
    if (settings.reminderKinds.period && settings.reminderDays.includes(periodLead)) {
      due.push({ key: `period-${nextPeriod}-${periodLead}`, body: periodLead === 0 ? 'Your period is estimated for today.' : `Your period is estimated in ${periodLead} day${periodLead === 1 ? '' : 's'}.` });
    }
    const fertile = nextFertileWindow(settings, new Date());
    if (fertile && settings.reminderKinds.fertile && fertile.start === today) due.push({ key: `fertile-${fertile.start}`, body: 'Your fertile window estimate starts today.' });
    if (fertile && settings.reminderKinds.ovulation && fertile.ovulation === today) due.push({ key: `ovulation-${fertile.ovulation}`, body: 'Your ovulation estimate is today.' });
    if (!due.length) return;
    const sent = Object.assign({}, settings.lastReminders || {});
    due.forEach((item) => {
      if (sent[item.key]) return;
      try { new window.Notification('MyFlo', { body: item.body }); } catch {}
      sent[item.key] = new Date().toISOString();
    });
    savePeriodPatch({ lastReminders: sent });
  }

  function applyNow() {
    applyQueued = false;
    ensureStyle();
    patchGo();
    ensureFloNav();
    updateLabels();
    updateMyCarCard();
    updateFloCard();
    updateFloPanel();
    installObserver();
    installFloOpener();
  }

  function applySoon(delay = 30) {
    if (applyQueued) return;
    applyQueued = true;
    setTimeout(applyNow, delay);
  }

  function needsApply() {
    const text = document.body?.innerText || '';
    const floLabel = document.querySelector('[data-driving-page="driving-cycle"]')?.textContent?.trim() || '';
    const cardTitle = byId('df-period-card')?.querySelector('.driving-home-title')?.textContent?.trim() || '';
    const panelTitle = byId('df-period-panel')?.querySelector('.df-period-panel-head h2')?.textContent?.trim() || '';
    return /My Car and personal trackers|Car details stay|Theory help|Period tracker|Cycle tracker|Car and period tracker/i.test(text)
      || floLabel === 'Flo'
      || cardTitle === 'Flo'
      || panelTitle === 'Flo'
      || Boolean(byId('df-period-panel') && !byId('df-myflo-view'));
  }

  function installObserver() {
    if (observerInstalled || !document.body || typeof MutationObserver !== 'function') return;
    observerInstalled = true;
    const observer = new MutationObserver(() => {
      if (needsApply()) applySoon(20);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function patchGo() {
    if (typeof window.go !== 'function' || window.go.__dayframeStableGoVersion || window.go.__dayframeEssentialsFloVersion === VERSION) return;
    const previousGo = window.go;
    window.go = function dayframeEssentialsFloGo(name, btn, ...args) {
      if (name === 'driving-cycle') {
        window.dayframeOpenPeriodTracker?.();
        return undefined;
      }
      const result = previousGo.call(this, name, btn, ...args);
      applySoon(50);
      return result;
    };
    window.go.__dayframeEssentialsFloVersion = VERSION;
    window.go.__dayframeEssentialsFloPrevious = previousGo;
  }

  window.dayframeOpenMyCarCard = function dayframeOpenMyCarCard(event) {
    if (event?.target?.closest?.('button,a,input,textarea,select,label')) return;
    window.go?.('driving-car');
    applySoon(50);
  };

  window.dayframeOpenMyCarCardKey = function dayframeOpenMyCarCardKey(event) {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    window.go?.('driving-car');
    applySoon(50);
  };

  window.dayframeOpenTheoryHelp = function dayframeOpenTheoryHelp(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.go?.('driving-theory');
    applySoon(50);
  };

  function installFloOpener() {
    if (window.dayframeOpenPeriodTracker?.__dayframeEssentialsFloVersion === VERSION) return;
    if (typeof window.dayframeOpenPeriodTracker === 'function') previousFloOpener = window.dayframeOpenPeriodTracker;
    window.dayframeOpenPeriodTracker = function dayframeOpenFlo(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      window.go?.('driving');
      if (typeof previousFloOpener === 'function') previousFloOpener.call(this);
      applyNow();
      selectFloNav();
      const panel = byId('df-period-panel');
      if (panel) {
        panel.hidden = false;
        setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
      }
    };
    window.dayframeOpenPeriodTracker.__dayframeEssentialsFloVersion = VERSION;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyNow, { once: true });
  else applyNow();
  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(applyNow, delay));
})();
