(function () {
  const VERSION = 'myflo-calendar-actions-v1';
  const FLAG = 'data-dayframe-myflo-calendar-actions';
  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const SUMMARY = 'Your chosen everyday essentials, kept together.';
  let selectedDate = '';
  let baseOpen = null;
  let baseShift = null;
  let baseSetStart = null;
  let baseStartToday = null;
  let baseEndToday = null;
  let wrapped = false;
  let observerQueued = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
  const isISO = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  const parseISO = (value) => {
    const [year, month, day] = String(value || '').split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000);
  const shortDate = (value) => {
    if (!isISO(value)) return '';
    return parseISO(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const longDate = (value) => {
    if (!isISO(value)) return '';
    return parseISO(value).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));

  function ensureSummaryStyle() {
    if ($('#df-essentials-summary-override-style')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="df-essentials-summary-override-style">
      .df-essentials-summary-override{font-size:0!important;line-height:1.45!important}
      .df-essentials-summary-override::after{content:"${SUMMARY}";font-size:13px;line-height:1.45;color:inherit}
      @media(max-width:560px){.df-essentials-summary-override::after{font-size:12px}}
    </style>`);
  }

  function getISOFromDay(day) {
    const onclick = day?.getAttribute?.('onclick') || '';
    const match = onclick.match(/'(\d{4}-\d{2}-\d{2})'/) || onclick.match(/"(\d{4}-\d{2}-\d{2})"/);
    return match ? match[1] : '';
  }

  function getPeriod() {
    const data = window.hubLoad?.() || {};
    data.essentials = data.essentials || {};
    data.essentials.period = data.essentials.period || {};
    return { data, period: data.essentials.period };
  }

  function savePeriod(period) {
    const { data } = getPeriod();
    data.essentials.period = Object.assign({}, data.essentials.period || {}, period);
    window.hubSave?.(data);
    window.dayframeRefreshEssentialsWidgets?.();
  }

  function patchSummaryCopy() {
    ensureSummaryStyle();
    const selectors = [
      '[data-home-module="driving"] .hub-module-desc',
      '[data-home-module="essentials"] .hub-module-desc',
      '.mobile-space-card[data-section="driving"] p',
      '.mobile-space-card[data-section="essentials"] p',
      '.df-essentials-overview p',
    ];
    selectors.forEach((selector) => {
      $$(selector).forEach((node) => {
        const text = (node.textContent || '').trim();
        if (!text || /My Car, MyFlo, Documents/i.test(text) || /^Chosen everyday essentials$/i.test(text)) {
          node.classList.add('df-essentials-summary-override');
          node.setAttribute('aria-label', SUMMARY);
        }
      });
    });
    $$('p, .hub-module-desc, .mobile-space-card p').forEach((node) => {
      const text = (node.textContent || '').trim();
      if (/^My Car, MyFlo, Documents and \d+ more\.?$/i.test(text)) {
        node.classList.add('df-essentials-summary-override');
        node.setAttribute('aria-label', SUMMARY);
      }
    });
  }

  function dayTags(day) {
    const tags = [];
    if (day.classList.contains('is-period')) tags.push('Period');
    if (day.classList.contains('is-fertile')) tags.push('Fertile estimate');
    if (day.classList.contains('is-ovulation')) tags.push('Ovulation estimate');
    if (day.classList.contains('is-today')) tags.push('Today');
    return tags;
  }

  function dayDetail(tags) {
    if (!tags.length) return 'No cycle mark on this date yet. You can use it to correct your saved period dates.';
    const parts = [];
    if (tags.includes('Period')) parts.push('period day');
    if (tags.includes('Fertile estimate')) parts.push('fertile estimate');
    if (tags.includes('Ovulation estimate')) parts.push('ovulation estimate');
    if (tags.includes('Today')) parts.push('today');
    return `This date is marked as ${parts.join(', ')}. The fertile and ovulation marks are calculated automatically from your saved period dates.`;
  }

  function selectedPanelHTML() {
    if (!selectedDate) {
      return '<div class="df-myflo-selected is-empty" data-myflo-selection-panel data-selected-date=""><span>Selected date</span><strong>No date selected</strong><p>Tap a calendar date to see what the marks mean, or to change a saved period start or end date.</p></div>';
    }
    const day = $$('.df-myflo-day').find((item) => getISOFromDay(item) === selectedDate);
    const tags = day ? dayTags(day) : [];
    return `<div class="df-myflo-selected" data-myflo-selection-panel data-selected-date="${esc(selectedDate)}"><span>Selected date</span><strong>${esc(longDate(selectedDate))}</strong><p>${esc(dayDetail(tags))}</p><div class="df-myflo-mark-tags">${(tags.length ? tags : ['No mark']).map((tag) => `<b>${esc(tag)}</b>`).join('')}</div><div class="df-myflo-selected-actions"><button type="button" onclick="dayframeSetSelectedMyFloStart()">Set as period start</button><button type="button" onclick="dayframeSetSelectedMyFloEnd()">Set as period end</button></div></div>`;
  }

  function patchOneMyFloPanel(view) {
    if (!view) return;

    $$('.df-myflo-day', view).forEach((day) => {
      const iso = getISOFromDay(day);
      day.classList.toggle('is-selected', Boolean(iso && iso === selectedDate));
      const tags = dayTags(day);
      const labelBits = [iso ? longDate(iso) : '', ...tags, iso === selectedDate ? 'Selected' : ''].filter(Boolean);
      if (labelBits.length) day.setAttribute('aria-label', labelBits.join(', '));
    });

    const legend = $('.df-myflo-legend', view);
    if (legend) {
      const panels = $$('[data-myflo-selection-panel]', view);
      const existing = panels[0];
      panels.slice(1).forEach((panel) => panel.remove());
      const html = selectedPanelHTML();
      if (existing && (existing.getAttribute('data-selected-date') || '') !== selectedDate) existing.outerHTML = html;
      else if (!existing) legend.insertAdjacentHTML('afterend', html);
    }

    const basicsText = $('#df-period-panel .df-period-form');
    if (basicsText && /You can also tap a date on the calendar\.?/.test(basicsText.innerHTML)) {
      basicsText.innerHTML = basicsText.innerHTML.replace(
        /You can also tap a date on the calendar\.?/g,
        'Select a date on the calendar if you need to change it.'
      );
    }
  }

  function patchMyFloPanel() {
    $$('#df-myflo-view').forEach(patchOneMyFloPanel);
  }

  function rerenderMyFlo() {
    window.dayframeOpenPeriodTracker?.();
    setTimeout(patchMyFloPanel, 80);
  }

  window.dayframeSelectMyFloDate = function dayframeSelectMyFloDate(dateISO) {
    if (!isISO(dateISO)) return;
    selectedDate = selectedDate === dateISO ? '' : dateISO;
    patchMyFloPanel();
  };

  window.dayframeSetSelectedMyFloStart = function dayframeSetSelectedMyFloStart() {
    if (!isISO(selectedDate)) return window.hubToast?.('Select a date first');
    const date = selectedDate;
    selectedDate = '';
    if (typeof baseSetStart === 'function') baseSetStart(date);
    else savePeriod({ lastStart: date, lastEnd: '', loggedStarts: [date] });
    setTimeout(patchMyFloPanel, 80);
  };

  window.dayframeSetSelectedMyFloEnd = function dayframeSetSelectedMyFloEnd() {
    if (!isISO(selectedDate)) return window.hubToast?.('Select a date first');
    const date = selectedDate;
    const { period } = getPeriod();
    if (!isISO(period.lastStart)) return window.hubToast?.('Save the start date first');
    const length = diffDays(date, period.lastStart) + 1;
    if (length < 1 || length > 14) return window.hubToast?.('Choose a date inside this period');
    const loggedEnds = [...new Set([...(period.loggedEnds || []), date])].filter(isISO).slice(-24);
    selectedDate = '';
    savePeriod({ lastEnd: date, loggedEnds, periodLength: clamp(length, 1, 14) });
    rerenderMyFlo();
  };

  function wrapMyFloFunctions() {
    if (wrapped || typeof window.dayframeOpenPeriodTracker !== 'function') return;
    wrapped = true;
    baseOpen = window.dayframeOpenPeriodTracker;
    baseShift = window.dayframeShiftMyFloCalendar;
    baseSetStart = window.dayframeSetMyFloStart;
    baseStartToday = window.dayframeMarkMyFloStartedToday;
    baseEndToday = window.dayframeMarkMyFloEndedToday;

    window.dayframeOpenPeriodTracker = function dayframeOpenPeriodTrackerPatched(event) {
      selectedDate = '';
      const result = baseOpen.call(this, event);
      setTimeout(patchMyFloPanel, 80);
      return result;
    };
    if (typeof baseShift === 'function') {
      window.dayframeShiftMyFloCalendar = function dayframeShiftMyFloCalendarPatched(months) {
        const result = baseShift.call(this, months);
        setTimeout(patchMyFloPanel, 80);
        return result;
      };
    }
    if (typeof baseSetStart === 'function') {
      window.dayframeSetMyFloStart = function dayframeSetMyFloStartPatched(dateISO) {
        selectedDate = '';
        const result = baseSetStart.call(this, dateISO);
        setTimeout(patchMyFloPanel, 80);
        return result;
      };
    }
    if (typeof baseStartToday === 'function') {
      window.dayframeMarkMyFloStartedToday = function dayframeMarkMyFloStartedTodayPatched() {
        selectedDate = '';
        const result = baseStartToday.call(this);
        setTimeout(patchMyFloPanel, 80);
        return result;
      };
    }
    if (typeof baseEndToday === 'function') {
      window.dayframeMarkMyFloEndedToday = function dayframeMarkMyFloEndedTodayPatched() {
        selectedDate = '';
        const result = baseEndToday.call(this);
        setTimeout(patchMyFloPanel, 80);
        return result;
      };
    }
  }

  document.addEventListener('click', (event) => {
    const day = event.target?.closest?.('.df-myflo-day');
    const view = day?.closest?.('#df-myflo-view');
    if (!day || !view) return;
    const iso = getISOFromDay(day);
    if (!isISO(iso)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.dayframeSelectMyFloDate(iso);
  }, true);

  function queuePatch() {
    if (observerQueued) return;
    observerQueued = true;
    requestAnimationFrame(() => {
      observerQueued = false;
      patchSummaryCopy();
      wrapMyFloFunctions();
      patchMyFloPanel();
    });
  }

  new MutationObserver(queuePatch).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queuePatch);
  else queuePatch();
  let sweeps = 0;
  const sweepTimer = setInterval(() => {
    queuePatch();
    sweeps += 1;
    if (sweeps >= 120) clearInterval(sweepTimer);
  }, 100);
})();
