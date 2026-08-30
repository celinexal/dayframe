(() => {
  'use strict';

  const FLAG = 'data-dayframe-essentials-cleanup';
  const STYLE_ID = 'df-essentials-cleanup-style';
  const DRIVING_PAGES = new Set(['driving', 'driving-theory', 'driving-car', 'driving-costs']);
  const INVESTING_PAGES = new Set(['dashboard', 'holdings', 'signals', 'charts', 'themes-hub', 'education', 'isa-guide', 'intel', 'health', 'alerts', 'chatter']);
  const MODULES = [
    { key: 'money', label: 'Money', note: 'Spending, bills, budgets and credit' },
    { key: 'planner', label: 'Plans', note: 'Tasks, goals and dates' },
    { key: 'driving', label: 'Essentials', note: 'Car and private personal trackers' },
    { key: 'diary', label: 'Diary', note: 'Private notes and mood' },
    { key: 'bible', label: 'Bible Study', note: 'Reading, notes and highlights' },
    { key: 'investing', label: 'Investing', note: 'Learning, holdings and research' },
  ];
  const WIDGETS = [
    { key: 'coming', label: 'Coming up', note: 'Tasks, bills and saved dates' },
    { key: 'goals', label: 'Goal progress', note: 'Your first active goal' },
    { key: 'diary', label: 'Diary prompt', note: 'Daily check-in' },
  ];

  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  let applyQueued = false;
  let goPatched = false;
  let originalHomeOpenEditor = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    if (typeof window.hubEsc === 'function') return window.hubEsc(value);
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function getData() {
    if (typeof window.hubLoad !== 'function') return null;
    const d = window.hubLoad();
    d.preferences = d.preferences || {};
    d.preferences.dayframe = d.preferences.dayframe || {};
    const setup = d.preferences.dayframe;
    let changed = false;
    const originalHidden = setup.hiddenSpaces;
    const filteredHidden = Array.isArray(originalHidden)
      ? originalHidden.filter((key) => MODULES.some((item) => item.key === key))
      : [];
    if (!Array.isArray(originalHidden) || filteredHidden.length !== originalHidden.length || filteredHidden.some((key, index) => key !== originalHidden[index])) {
      changed = true;
    }
    setup.hiddenSpaces = filteredHidden;
    if (!['learning', 'active', 'none'].includes(setup.investingStage)) {
      setup.investingStage = 'learning';
      changed = true;
    }
    if (setup.essentialsStage !== 'ready') {
      setup.essentialsStage = 'ready';
      changed = true;
    }
    if (setup.drivingStage !== 'learning') {
      setup.drivingStage = 'learning';
      changed = true;
    }
    if (changed && typeof window.hubSave === 'function') window.hubSave(d);
    return d;
  }

  function setupFromData(d = getData()) {
    const raw = d?.preferences?.dayframe || {};
    return {
      hiddenSpaces: Array.isArray(raw.hiddenSpaces) ? raw.hiddenSpaces : [],
      investingStage: ['learning', 'active', 'none'].includes(raw.investingStage) ? raw.investingStage : 'learning',
    };
  }

  function hiddenSpaces(setup = setupFromData()) {
    const hidden = new Set(setup.hiddenSpaces);
    if (setup.investingStage === 'none') hidden.add('investing');
    return hidden;
  }

  function homePrefs(d) {
    d.preferences = d.preferences || {};
    const allowed = MODULES.map((item) => item.key);
    const raw = d.preferences.home || {};
    const saved = Array.isArray(raw.modules) ? raw.modules.filter((key) => allowed.includes(key)) : [];
    const modules = [...new Set(saved.concat(allowed))];
    const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter((key) => allowed.includes(key)) : [];
    const widgets = Object.assign({ coming: true, goals: true, diary: true }, raw.widgets || {});
    const out = { modules, hidden, widgets };
    d.preferences.home = out;
    return out;
  }

  function saveSetup(mutator) {
    const d = getData();
    if (!d || typeof window.hubSave !== 'function') return;
    const setup = setupFromData(d);
    mutator(setup, d);
    d.preferences.dayframe = Object.assign({}, d.preferences.dayframe, {
      hiddenSpaces: setup.hiddenSpaces,
      investingStage: setup.investingStage,
      essentialsStage: 'ready',
      drivingStage: 'learning',
    });
    window.hubSave(d);
    renderEditor();
    applyNow();
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

  function optionButton(label, on, js) {
    return `<button type="button" class="${on ? 'on' : ''}" onclick="${js}">${esc(label)}</button>`;
  }

  function spaceToggle(item, on) {
    return `
      <button class="df-life-space-toggle ${on ? 'on' : ''}" role="switch" aria-checked="${on ? 'true' : 'false'}" type="button" onclick="dayframeToggleSpace('${item.key}')">
        <span class="df-life-switch" aria-hidden="true"><i></i></span>
        <span><strong>${esc(item.label)}</strong><small>${esc(item.note)}</small></span>
      </button>
    `;
  }

  function homeRow(item, index, pref, visibleModules) {
    const checked = !pref.hidden.includes(item.key);
    return `
      <div class="df-life-home-row">
        <input class="df-life-home-check" type="checkbox" ${checked ? 'checked' : ''} aria-label="Show ${esc(item.label)} on Home" onchange="dayframeToggleHomeModule('${item.key}',this.checked)">
        <div class="df-life-home-copy"><strong>${esc(item.label)}</strong><small>${esc(item.note)}</small></div>
        <div class="df-life-home-move">
          <button type="button" ${index === 0 ? 'disabled' : ''} onclick="dayframeMoveHomeModule('${item.key}',-1)" aria-label="Move ${esc(item.label)} up">^</button>
          <button type="button" ${index === visibleModules.length - 1 ? 'disabled' : ''} onclick="dayframeMoveHomeModule('${item.key}',1)" aria-label="Move ${esc(item.label)} down">v</button>
        </div>
      </div>
    `;
  }

  function widgetRow(item, pref) {
    const checked = pref.widgets[item.key] !== false;
    return `
      <div class="df-life-home-row">
        <input class="df-life-home-check" type="checkbox" ${checked ? 'checked' : ''} aria-label="Show ${esc(item.label)}" onchange="dayframeToggleHomeWidget('${item.key}',this.checked)">
        <div class="df-life-home-copy"><strong>${esc(item.label)}</strong><small>${esc(item.note)}</small></div>
        <div></div>
      </div>
    `;
  }

  function ensureStyle() {
    const existing = byId(STYLE_ID);
    if (existing) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .df-essentials-hidden,#df-essentials-stage-panel,.driving-side-nav [data-driving-page="driving-theory"],#pg-driving .driving-home-card.theory{display:none!important}
      #pg-driving .driving-hub-hero{background:linear-gradient(135deg,#ffffff 0%,#fff4fb 46%,#effdfa 100%)!important;border:1px solid #e6eaf2!important;box-shadow:0 18px 44px rgba(39,49,75,.09)!important;color:#172033!important}
      #pg-driving .driving-hub-title{color:#172033!important;text-shadow:none!important;letter-spacing:0!important}
      #pg-driving .driving-hub-sub{color:#5f6b7e!important}
      #pg-driving .driving-hub-eyebrow{color:#d75096!important}
      #pg-driving .driving-hub-eyebrow i{background:#ef6aa9!important}
      #pg-driving .driving-hub-pill{background:#fff!important;border:1px solid #e8ebf2!important;color:#5f6b7e!important}
      #pg-driving .driving-hub-pill b{background:#ef6aa9!important}
      body.driving-mode .driving-sidepanel{display:block!important}
      #pg-driving .driving-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #pg-driving .driving-home-card.car{display:grid!important}
      .driving-home-card.df-car-card{gap:16px;text-align:left;cursor:default;background:linear-gradient(145deg,#fff 0%,#fbf9ff 56%,#f4fffc 100%)!important;border-color:#e6e3ff!important}
      .df-car-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:2px}
      .df-car-actions button{height:34px;border-radius:999px;border:1px solid #e4e8f1;background:#fff;color:#6b60ee;font:850 10px var(--ff);padding:0 13px;cursor:pointer;box-shadow:0 8px 18px rgba(39,49,75,.045)}
      .df-car-actions button.primary{border-color:transparent;background:#172033;color:#fff}
      .df-car-question{font-size:10.5px;line-height:1.45;color:#738095;margin-top:2px}
      .driving-home-card.df-period-card{background:linear-gradient(145deg,#fff8fb 0%,#fff 58%,#effdf9 100%)!important;border-color:#f2d5ea!important}
      .driving-home-card.df-period-card .driving-home-icon{background:#fff0f7!important;color:#d94e9c!important}
      .df-period-card-summary{display:inline-flex;align-items:center;min-height:26px;margin-top:14px;padding:0 10px;border-radius:999px;background:#fff;border:1px solid #eadffc;color:#7368e9;font-size:9.5px;font-weight:850}
      .df-period-panel{margin-top:16px;border:1px solid #e8ebf3;border-radius:20px;background:#fff;box-shadow:0 16px 34px rgba(39,49,75,.055);overflow:hidden}
      .df-period-panel[hidden]{display:none!important}
      .df-period-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 18px;border-bottom:1px solid #edf0f5;background:linear-gradient(135deg,#fff7fb,#f6f3ff 54%,#effefa)}
      .df-period-panel-head span{display:block;margin-bottom:4px;color:#d94e9c;font-size:9px;font-weight:900;letter-spacing:0}
      .df-period-panel-head h2{margin:0;font-family:var(--fd);font-size:20px;color:#172033;letter-spacing:0}
      .df-period-panel-head p{margin:5px 0 0;color:#7a8495;font-size:10.5px;line-height:1.5}
      .df-period-panel-close{width:32px;height:32px;border:1px solid #e4e8f1;border-radius:11px;background:#fff;color:#6d7788;font-weight:900;cursor:pointer}
      .df-period-body{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:14px;padding:16px}
      .df-period-estimate{padding:16px;border:1px solid #f0e4f4;border-radius:17px;background:linear-gradient(145deg,#fff,#fff6fb)}
      .df-period-estimate small{display:block;color:#8a94a4;font-size:9.5px;font-weight:850;letter-spacing:0}
      .df-period-estimate strong{display:block;margin:5px 0;font-family:var(--fd);font-size:26px;line-height:1;color:#172033;letter-spacing:0}
      .df-period-estimate p{margin:0;color:#6d7788;font-size:10.5px;line-height:1.55}
      .df-period-form{display:grid;gap:10px}
      .df-period-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      .df-period-form label{display:grid;gap:5px;color:#7b8494;font-size:9.5px;font-weight:850;letter-spacing:0}
      .df-period-form input,.df-period-form textarea{width:100%;border:1px solid #e5e9f2;border-radius:12px;background:#f8f9fc;color:#172033;font:750 12px var(--ff);padding:10px;outline:none}
      .df-period-form textarea{min-height:82px;resize:vertical;line-height:1.5}
      .df-period-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .df-period-actions button{height:34px;border-radius:999px;border:1px solid #dfd8ff;background:#fff;color:#6e5ff0;font:850 10px var(--ff);padding:0 13px;cursor:pointer}
      .df-period-actions button.primary{border-color:transparent;background:linear-gradient(135deg,#7564f2,#ef6aa9);color:#fff}
      .df-period-privacy{margin-top:10px;padding:10px 12px;border-radius:14px;background:#f8f9fc;color:#7a8495;font-size:10px;line-height:1.5}
      .df-life-editor{display:grid;gap:13px}
      .df-life-editor-section{padding:14px;border:1px solid #e8ebf3;border-radius:17px;background:#fff;box-shadow:0 10px 24px rgba(39,49,75,.04)}
      .df-life-editor-section.soft{background:linear-gradient(135deg,#fff 0%,#fff7fb 52%,#f3fffc 100%);border-color:#eadff5}
      .df-life-section-title{margin:0;font-family:var(--fd);font-size:17px;line-height:1.15;color:#172033;letter-spacing:0}
      .df-life-section-copy{margin:5px 0 0;color:#738095;font-size:11px;line-height:1.5}
      .df-life-stage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .df-life-stage-card{display:grid;gap:8px;padding:12px;border:1px solid #e7ebf3;border-radius:15px;background:rgba(255,255,255,.88)}
      .df-life-stage-card>strong{font-size:12px;color:#172033}
      .df-life-stage-card>small{display:block;color:#748196;font-size:10.5px;line-height:1.45}
      .df-life-segments{display:flex;gap:7px;flex-wrap:wrap}
      .df-life-segments button{height:30px;border-radius:999px;border:1px solid #e3e7f0;background:#fff;color:#647086;font:850 10px var(--ff);padding:0 11px;cursor:pointer}
      .df-life-segments button.on{border-color:#e6dcff;background:#f3efff;color:#705ff0;box-shadow:0 7px 16px rgba(112,95,240,.10)}
      .df-life-space-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .df-life-space-toggle{display:flex;align-items:center;gap:10px;width:100%;min-height:58px;padding:10px;border:1px solid #e7ebf3;border-radius:15px;background:#fff;text-align:left;font-family:var(--ff);cursor:pointer}
      .df-life-space-toggle strong,.df-life-home-copy strong{display:block;color:#1b2435;font-size:11.5px;line-height:1.2}
      .df-life-space-toggle small,.df-life-home-copy small{display:block;margin-top:3px;color:#7d8798;font-size:9.5px;line-height:1.35}
      .df-life-space-toggle.on{border-color:#ded7ff;background:#fbfaff}
      .df-life-switch{position:relative;flex:0 0 34px;width:34px;height:20px;border-radius:999px;background:#e9edf4}
      .df-life-switch i{position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:999px;background:#fff;box-shadow:0 2px 6px rgba(39,49,75,.18);transition:transform .2s}
      .df-life-space-toggle.on .df-life-switch{background:linear-gradient(135deg,#7564f2,#ef6aa9)}
      .df-life-space-toggle.on .df-life-switch i{transform:translateX(14px)}
      .df-life-home-list{display:grid;gap:8px}
      .df-life-home-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border:1px solid #e8ebf3;border-radius:14px;background:#fff}
      .df-life-home-check{width:18px;height:18px;accent-color:#7564f2}
      .df-life-home-move{display:flex;gap:5px}
      .df-life-home-move button{width:28px;height:28px;border-radius:10px;border:1px solid #e2e7f1;background:#f8f9fc;color:#697489;font-weight:900;cursor:pointer}
      .df-life-home-move button:disabled{opacity:.35;cursor:default}
      .df-life-note{padding:10px 12px;border:1px solid #f0e3f3;border-radius:14px;background:#fff9fd;color:#778295;font-size:10.5px;line-height:1.45}
      @media(max-width:900px){#pg-driving .driving-home-grid,.df-life-stage-grid,.df-life-space-grid,.df-period-body,.df-period-form-grid{grid-template-columns:1fr!important}.df-car-actions button{width:100%}.df-life-home-row{grid-template-columns:auto minmax(0,1fr)}.df-life-home-move{grid-column:2;justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function num(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  }

  function periodSettings(d = getData()) {
    const p = d?.essentials?.period || {};
    return {
      lastStart: typeof p.lastStart === 'string' ? p.lastStart : '',
      cycleLength: num(p.cycleLength, 28, 15, 60),
      periodLength: num(p.periodLength, 5, 1, 14),
      notes: typeof p.notes === 'string' ? p.notes : '',
    };
  }

  function addDaysISO(iso, days) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const date = new Date(iso + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return '';
    date.setDate(date.getDate() + days);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  function prettyDate(iso) {
    return typeof window.hubPrettyDate === 'function' ? window.hubPrettyDate(iso) : iso;
  }

  function daysUntil(iso) {
    return typeof window.hubDaysUntil === 'function' ? window.hubDaysUntil(iso) : null;
  }

  function periodSummary(p = periodSettings()) {
    if (!p.lastStart) {
      return { date: 'Not set', detail: 'Add your last period date when you want this tracker on.', badge: 'Set up when useful' };
    }
    const next = addDaysISO(p.lastStart, p.cycleLength);
    const day = daysUntil(next);
    const timing = day === null ? '' : day < 0 ? `${Math.abs(day)} days ago` : day === 0 ? 'estimated today' : day === 1 ? 'estimated tomorrow' : `in about ${day} days`;
    return {
      date: prettyDate(next),
      detail: `Based on a usual ${p.cycleLength}-day cycle and ${p.periodLength}-day period. This is an estimate only.`,
      badge: timing || 'Estimate ready',
    };
  }

  function ensureCarToolCard() {
    const grid = byId('pg-driving')?.querySelector('.driving-home-grid');
    const current = grid?.querySelector('.driving-home-card.car');
    if (!grid || !current) return;
    if (current.classList.contains('df-car-card')) {
      const title = current.querySelector('.driving-home-title');
      const desc = current.querySelector('.driving-home-desc');
      if (title) title.textContent = 'My Car';
      if (desc) desc.textContent = 'Store car details, renewals, service notes and quick theory help when needed.';
      if (!current.querySelector('.df-car-actions')) {
        current.insertAdjacentHTML('beforeend', `
          <div class="df-car-question">Need help passing your theory?</div>
          <div class="df-car-actions">
            <button class="primary" type="button" onclick="go('driving-car')">Open My Car</button>
            <button type="button" onclick="dayframeOpenTheoryHelp()">Theory help</button>
          </div>
        `);
      }
      return;
    }
    const card = document.createElement('article');
    card.className = 'driving-home-card car df-car-card';
    card.setAttribute('aria-hidden', 'false');
    card.innerHTML = `
      <div class="driving-card-top">
        <div class="driving-home-icon"><svg viewBox="0 0 24 24"><path d="M5 13l1.8-5.1A2 2 0 018.7 6.5h6.6a2 2 0 011.9 1.4L19 13"/><rect x="3" y="12" width="18" height="6.5" rx="2"/><path d="M6 18.5V21M18 18.5V21M7 15h.1M17 15h.1"/></svg></div>
        <div class="driving-card-number">01</div>
      </div>
      <div class="driving-home-copy">
        <div class="driving-home-kicker">Your vehicle</div>
        <div class="driving-home-title">My Car</div>
        <div class="driving-home-desc">Store car details, renewals, service notes and quick theory help when needed.</div>
      </div>
      <div class="driving-card-tags"><span class="driving-card-tag">MOT</span><span class="driving-card-tag">Tax</span><span class="driving-card-tag">Insurance</span><span class="driving-card-tag">Service</span></div>
      <div class="df-car-question">Need help passing your theory?</div>
      <div class="df-car-actions">
        <button class="primary" type="button" onclick="go('driving-car')">Open My Car</button>
        <button type="button" onclick="dayframeOpenTheoryHelp()">Theory help</button>
      </div>
    `;
    current.replaceWith(card);
  }

  function ensurePeriodTracker() {
    const page = byId('pg-driving');
    const grid = page?.querySelector('.driving-home-grid');
    if (!page || !grid) return;
    if (!byId('df-period-card')) {
      grid.insertAdjacentHTML('beforeend', `
        <button class="driving-home-card df-period-card" id="df-period-card" onclick="dayframeOpenPeriodTracker()">
          <div class="driving-card-top">
            <div class="driving-home-icon"><svg viewBox="0 0 24 24"><path d="M12 3.5c3.6 3.2 5.4 6.1 5.4 8.7a5.4 5.4 0 11-10.8 0C6.6 9.6 8.4 6.7 12 3.5z"/><path d="M9.3 13.2c.8 1.4 1.7 2.1 2.7 2.1s1.9-.7 2.7-2.1"/></svg></div>
            <div class="driving-card-number">02</div>
          </div>
          <div class="driving-home-copy"><div class="driving-home-kicker">Health</div><div class="driving-home-title">Period tracker</div><div class="driving-home-desc" id="df-period-card-desc">Save your cycle dates privately and see the next estimate.</div></div>
          <div class="df-period-card-summary" id="df-period-card-summary">Set up when useful</div>
          <div class="driving-home-arrow">-&gt;</div>
        </button>
      `);
    }
    if (!byId('df-period-panel')) {
      grid.insertAdjacentHTML('afterend', `
        <section class="df-period-panel" id="df-period-panel" hidden>
          <div class="df-period-panel-head">
            <div><span>Private health tool</span><h2>Period tracker</h2><p>Use this as a gentle reminder, not as medical advice.</p></div>
            <button class="df-period-panel-close" type="button" onclick="dayframeClosePeriodTracker()" aria-label="Close period tracker">x</button>
          </div>
          <div class="df-period-body">
            <div class="df-period-estimate">
              <small>Next estimate</small>
              <strong id="df-period-next-date">Not set</strong>
              <p id="df-period-next-detail">Add your last period date when you want this tracker on.</p>
              <div class="df-period-privacy">Only your signed-in Dayframe account should receive this saved data. Treat estimates as reminders, not medical guidance.</div>
            </div>
            <div class="df-period-form">
              <div class="df-period-form-grid">
                <label>Last period started<input id="df-period-last-start" type="date"></label>
                <label>Usual cycle length<input id="df-period-cycle-length" type="number" min="15" max="60" step="1"></label>
                <label>Usual period length<input id="df-period-length" type="number" min="1" max="14" step="1"></label>
              </div>
              <label>Notes<textarea id="df-period-notes" placeholder="Symptoms, reminders or anything you want to remember."></textarea></label>
              <div class="df-period-actions">
                <button type="button" onclick="dayframeClearPeriodTracker()">Clear</button>
                <button class="primary" type="button" onclick="dayframeSavePeriodTracker()">Save tracker</button>
              </div>
            </div>
          </div>
        </section>
      `);
    }
    renderPeriodTracker();
  }

  function renderPeriodTracker() {
    const p = periodSettings();
    const summary = periodSummary(p);
    const desc = byId('df-period-card-desc');
    const badge = byId('df-period-card-summary');
    const nextDate = byId('df-period-next-date');
    const nextDetail = byId('df-period-next-detail');
    if (desc) desc.textContent = p.lastStart ? `Next estimate: ${summary.date}.` : 'Save your cycle dates privately and see the next estimate.';
    if (badge) badge.textContent = summary.badge;
    if (nextDate) nextDate.textContent = summary.date;
    if (nextDetail) nextDetail.textContent = summary.detail;
    const last = byId('df-period-last-start');
    const cycle = byId('df-period-cycle-length');
    const length = byId('df-period-length');
    const notes = byId('df-period-notes');
    if (last) last.value = p.lastStart;
    if (cycle) cycle.value = String(p.cycleLength);
    if (length) length.value = String(p.periodLength);
    if (notes) notes.value = p.notes;
  }

  function applyLabels() {
    const setup = setupFromData();
    const hidden = hiddenSpaces(setup);
    MODULES.forEach((item) => {
      const shouldHide = hidden.has(item.key);
      setHidden(document.querySelector(`.df-nav-btn[data-main-page="${item.key}"]`), shouldHide);
      setHidden(document.querySelector(`[data-mobile-page="${item.key}"]`), shouldHide);
      document.querySelectorAll(`[data-home-module="${item.key}"]`).forEach((el) => setHidden(el, shouldHide));
    });
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`), hidden.has('driving'));
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('dashboard')"]`), hidden.has('investing'));
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('diary')"]`), hidden.has('diary'));
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('bible')"]`), hidden.has('bible'));

    document.querySelectorAll('#df-essentials-stage-panel').forEach((el) => el.remove());
    setHidden(document.querySelector('.driving-side-nav [data-driving-page="driving-theory"]'), true);
    setHidden(document.querySelector('#pg-driving .driving-home-card.theory'), true);
    setHidden(document.querySelector('.driving-side-nav [data-driving-page="driving-car"]'), false);
    setHidden(document.querySelector('#pg-driving .driving-home-card.car'), false);

    const sideKicker = document.querySelector('.driving-side-kicker');
    const sideTitle = document.querySelector('.driving-side-title');
    if (sideKicker) sideKicker.textContent = 'Essentials';
    if (sideTitle) sideTitle.textContent = 'Personal tools';
    const overview = document.querySelector('.driving-side-nav [data-driving-page="driving"]');
    if (overview) setButtonLabel(overview, 'Overview');
    setButtonLabel(document.querySelector('.df-nav-btn[data-main-page="driving"]'), 'Essentials');
    setButtonLabel(document.querySelector(`.sb-nav .ni[onclick*="'driving'"]`), 'Essentials');

    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`);
    if (mobileMore) {
      const strong = mobileMore.querySelector('strong');
      const small = mobileMore.querySelector('small');
      if (strong) strong.textContent = 'Essentials';
      if (small) small.textContent = 'Car and personal trackers';
    }

    const heroEyebrow = document.querySelector('#pg-driving .driving-hub-eyebrow');
    const heroTitle = document.querySelector('#pg-driving .driving-hub-title');
    const heroSub = document.querySelector('#pg-driving .driving-hub-sub');
    const heroPills = document.querySelector('#pg-driving .driving-hub-pills');
    if (heroEyebrow) heroEyebrow.innerHTML = '<i></i>Essentials';
    if (heroTitle) heroTitle.textContent = 'Your everyday essentials.';
    if (heroSub) heroSub.textContent = 'Keep car details and private personal trackers in one calm place. Open theory help from My Car only if you need it.';
    if (heroPills) heroPills.innerHTML = '<span class="driving-hub-pill"><b></b>My Car</span><span class="driving-hub-pill"><b></b>Period tracker</span><span class="driving-hub-pill"><b></b>Theory help when needed</span>';

    const homeCard = document.querySelector('[data-home-module="driving"]');
    if (homeCard?.querySelector('.hub-module-title')) homeCard.querySelector('.hub-module-title').textContent = 'Essentials';
    if (homeCard?.querySelector('.hub-module-desc')) homeCard.querySelector('.hub-module-desc').textContent = 'My Car, private trackers and useful reminders in one place.';
    document.querySelectorAll('#pg-driving-theory .life-back,#pg-driving-car .life-back,#pg-driving-costs .life-back').forEach((button) => {
      button.textContent = '< Essentials';
    });
  }

  function applyHomePreferenceVisibility(d = getData()) {
    if (!d) return;
    const pref = homePrefs(d);
    const hidden = hiddenSpaces(setupFromData(d));
    const grid = document.querySelector('.hub-module-grid');
    if (grid) {
      pref.modules.forEach((key, index) => {
        const card = grid.querySelector(`[data-home-module="${key}"]`);
        if (!card) return;
        card.style.order = String(index);
        card.classList.toggle('home-item-hidden', pref.hidden.includes(key) || hidden.has(key));
      });
    }
    let visibleWidgets = 0;
    document.querySelectorAll('[data-home-widget]').forEach((card) => {
      const show = pref.widgets[card.dataset.homeWidget] !== false;
      card.classList.toggle('home-item-hidden', !show);
      if (show) visibleWidgets += 1;
    });
    const lower = document.querySelector('.home-glance-grid');
    if (lower) {
      lower.classList.remove('home-visible-0', 'home-visible-1', 'home-visible-2', 'home-visible-3');
      lower.classList.add('home-visible-' + visibleWidgets);
    }
  }

  function renderEditor() {
    const out = byId('home-editor-content');
    const d = getData();
    if (!out || !d) return;
    ensureStyle();
    const setup = setupFromData(d);
    const hidden = hiddenSpaces(setup);
    const pref = homePrefs(d);
    const stageModules = MODULES.filter((item) => !hidden.has(item.key));
    const visibleModules = pref.modules.map((key) => stageModules.find((item) => item.key === key)).filter(Boolean);
    const spaces = MODULES.filter((item) => ['money', 'planner', 'driving', 'diary', 'bible'].includes(item.key));
    out.innerHTML = `
      <div class="df-life-editor">
        <section class="df-life-editor-section soft">
          <h3 class="df-life-section-title">Customise Dayframe</h3>
          <p class="df-life-section-copy">Choose the main spaces and Home order. Essentials stays simple: My Car, period tracker, and theory help inside My Car.</p>
        </section>
        <section class="df-life-editor-section">
          <h3 class="df-life-section-title">Spaces</h3>
          <p class="df-life-section-copy">Turn off anything that is not part of your life right now.</p>
          <div class="df-life-space-grid">${spaces.map((item) => spaceToggle(item, !hidden.has(item.key))).join('')}</div>
        </section>
        <section class="df-life-editor-section">
          <h3 class="df-life-section-title">Investing</h3>
          <p class="df-life-section-copy">${setup.investingStage === 'active' ? 'Portfolio, research and sector themes stay visible.' : setup.investingStage === 'none' ? 'Investing is hidden from the main app.' : 'Lessons and plain-English research stay visible.'}</p>
          <div class="df-life-segments">
            ${optionButton('Learning', setup.investingStage === 'learning', "dayframeSetInvestingStage('learning')")}
            ${optionButton('Active', setup.investingStage === 'active', "dayframeSetInvestingStage('active')")}
            ${optionButton('Hide', setup.investingStage === 'none', "dayframeSetInvestingStage('none')")}
          </div>
        </section>
        <section class="df-life-editor-section">
          <h3 class="df-life-section-title">Home layout</h3>
          <p class="df-life-section-copy">Choose what appears on Home and put the important spaces first.</p>
          <div class="df-life-home-list">${visibleModules.length ? visibleModules.map((item, index) => homeRow(item, index, pref, visibleModules)).join('') : '<div class="df-life-note">Turn on a space above to add it back to Home.</div>'}</div>
        </section>
        <section class="df-life-editor-section">
          <h3 class="df-life-section-title">At a glance</h3>
          <div class="df-life-home-list">${WIDGETS.map((item) => widgetRow(item, pref)).join('')}</div>
        </section>
      </div>
    `;
  }

  function showPage(name, btn) {
    document.querySelectorAll('.pg.on[id^="pg-"]').forEach((old) => {
      old.classList.remove('on');
      old.style.display = '';
    });
    const pg = byId('pg-' + name);
    if (pg) {
      pg.classList.add('on');
      pg.style.display = '';
    }
    document.querySelectorAll('.ni').forEach((button) => button.classList.remove('on'));
    if (btn) btn.classList.add('on');
    else document.querySelector(`.ni[onclick*="'${name}'"]`)?.classList.add('on');
    const isInvesting = INVESTING_PAGES.has(name);
    const isDriving = DRIVING_PAGES.has(name);
    document.body.classList.toggle('investing-mode', isInvesting);
    document.body.classList.toggle('driving-mode', isDriving);
    document.querySelectorAll('.df-nav-btn[data-main-page]').forEach((button) => button.classList.remove('on'));
    const mainKey = isInvesting ? 'investing' : isDriving ? 'driving' : name;
    document.querySelector(`.df-nav-btn[data-main-page="${mainKey}"]`)?.classList.add('on');
    const mobileKey = ['home', 'money', 'planner', 'bible'].includes(mainKey) ? mainKey : 'more';
    document.querySelectorAll('.df-mobile-nav button[data-mobile-page]').forEach((button) => button.classList.toggle('on', button.dataset.mobilePage === mobileKey));
    window.dfCloseSheets?.();
    document.querySelectorAll('.invest-side-nav button').forEach((button) => button.classList.toggle('on', button.dataset.investPage === name));
    document.querySelectorAll('.driving-side-nav button').forEach((button) => button.classList.toggle('on', button.dataset.drivingPage === name));
    window.renderLifePage?.(name);
    if (name === 'driving-theory') setTimeout(() => window.syncTheoryFrameSession?.(), 120);
    if (window.innerWidth <= 768 && typeof window.closeSB === 'function') window.closeSB();
  }

  function patchGo() {
    if (goPatched || typeof window.go !== 'function') return;
    const previousGo = window.go;
    window.go = function dayframeEssentialsCleanGo(name, btn, ...args) {
      if (DRIVING_PAGES.has(name)) {
        if (hiddenSpaces().has('driving')) name = 'home';
        else {
          showPage(name, btn);
          applySoon(30);
          return undefined;
        }
      }
      const result = previousGo.call(this, name, btn, ...args);
      applySoon(90);
      return result;
    };
    goPatched = true;
  }

  function openEssentialsEditor() {
    if (typeof window.dfOpenSheet === 'function') window.dfOpenSheet('home-editor-sheet');
    else originalHomeOpenEditor?.call(this);
    renderEditor();
    applySoon(20);
  }

  function installEditor() {
    if (window.homeOpenEditor !== openEssentialsEditor && typeof window.homeOpenEditor === 'function') {
      originalHomeOpenEditor = window.homeOpenEditor;
    }
    window.homeOpenEditor = openEssentialsEditor;
    window.homeOpenEditor.__dayframeLifeStage = true;
    window.homeOpenEditor.__dayframeEssentials = true;
    window.homeOpenEditor.__dayframeEssentialsCleanup = true;
    window.homeRenderEditor = renderEditor;
    window.homeRenderEditor.__dayframeEssentialsCleanup = true;
  }

  function applyNow() {
    applyQueued = false;
    getData();
    ensureStyle();
    patchGo();
    installEditor();
    document.documentElement.dataset.dayframeEssentialsStage = 'ready';
    document.documentElement.dataset.dayframeDrivingStage = 'learning';
    ensureCarToolCard();
    ensurePeriodTracker();
    applyLabels();
    applyHomePreferenceVisibility();
    const editButton = document.querySelector('.home-edit-button');
    if (editButton) {
      editButton.classList.add('df-customise-home');
      editButton.innerHTML = '<span>*</span> Customise Dayframe';
    }
    const title = byId('home-editor-title');
    if (title) title.textContent = 'Customise Dayframe';
    const copy = document.querySelector('#home-editor-sheet .df-sheet-head p');
    if (copy) copy.textContent = 'Choose what applies to you and what appears on Home.';
  }

  function applySoon(delay = 50) {
    if (applyQueued) return;
    applyQueued = true;
    setTimeout(applyNow, delay);
  }

  window.dayframeSetInvestingStage = function dayframeSetInvestingStage(stage) {
    saveSetup((setup) => {
      setup.investingStage = ['learning', 'active', 'none'].includes(stage) ? stage : 'learning';
      setup.hiddenSpaces = setup.hiddenSpaces.filter((key) => key !== 'investing');
    });
  };

  window.dayframeToggleSpace = function dayframeToggleSpace(key) {
    saveSetup((setup) => {
      const hidden = new Set(setup.hiddenSpaces);
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      setup.hiddenSpaces = [...hidden];
    });
  };

  window.dayframeToggleHomeModule = function dayframeToggleHomeModule(key, show) {
    const d = getData();
    if (!d || typeof window.hubSave !== 'function') return;
    const pref = homePrefs(d);
    pref.hidden = pref.hidden.filter((item) => item !== key);
    if (!show) pref.hidden.push(key);
    window.hubSave(d);
    renderEditor();
    applyNow();
  };

  window.dayframeMoveHomeModule = function dayframeMoveHomeModule(key, direction) {
    const d = getData();
    if (!d || typeof window.hubSave !== 'function') return;
    const pref = homePrefs(d);
    const visibleKeys = pref.modules.filter((item) => !hiddenSpaces(setupFromData(d)).has(item));
    const visibleFrom = visibleKeys.indexOf(key);
    const visibleTo = Math.max(0, Math.min(visibleKeys.length - 1, visibleFrom + direction));
    if (visibleFrom < 0 || visibleFrom === visibleTo) return;
    const targetKey = visibleKeys[visibleTo];
    const from = pref.modules.indexOf(key);
    const to = pref.modules.indexOf(targetKey);
    pref.modules.splice(from, 1);
    pref.modules.splice(to, 0, key);
    window.hubSave(d);
    renderEditor();
    applyNow();
  };

  window.dayframeToggleHomeWidget = function dayframeToggleHomeWidget(key, show) {
    const d = getData();
    if (!d || typeof window.hubSave !== 'function') return;
    const pref = homePrefs(d);
    pref.widgets[key] = Boolean(show);
    window.hubSave(d);
    renderEditor();
    applyNow();
  };

  window.dayframeOpenTheoryHelp = function dayframeOpenTheoryHelp() {
    showPage('driving-theory');
    applySoon(30);
  };

  window.dayframeOpenPeriodTracker = function dayframeOpenPeriodTracker() {
    ensurePeriodTracker();
    const panel = byId('df-period-panel');
    if (!panel) return;
    panel.hidden = false;
    renderPeriodTracker();
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  window.dayframeClosePeriodTracker = function dayframeClosePeriodTracker() {
    const panel = byId('df-period-panel');
    if (panel) panel.hidden = true;
  };

  window.dayframeSavePeriodTracker = function dayframeSavePeriodTracker() {
    if (typeof window.hubLoad !== 'function' || typeof window.hubSave !== 'function') return;
    const lastStart = byId('df-period-last-start')?.value || '';
    if (!lastStart) {
      window.hubToast?.('Add the last period start date');
      return;
    }
    const d = window.hubLoad();
    d.essentials = d.essentials || {};
    d.essentials.period = {
      lastStart,
      cycleLength: num(byId('df-period-cycle-length')?.value, 28, 15, 60),
      periodLength: num(byId('df-period-length')?.value, 5, 1, 14),
      notes: byId('df-period-notes')?.value || '',
      updatedAt: new Date().toISOString(),
    };
    window.hubSave(d);
    renderPeriodTracker();
    window.renderHome?.();
    applySoon(30);
    window.hubToast?.('Period tracker saved');
  };

  window.dayframeClearPeriodTracker = function dayframeClearPeriodTracker() {
    if (typeof window.hubLoad !== 'function' || typeof window.hubSave !== 'function') return;
    const d = window.hubLoad();
    d.essentials = d.essentials || {};
    d.essentials.period = { lastStart: '', cycleLength: 28, periodLength: 5, notes: '' };
    window.hubSave(d);
    renderPeriodTracker();
    applySoon(30);
    window.hubToast?.('Period tracker cleared');
  };

  function init() {
    applyNow();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  [120, 420, 1100, 2300, 4200].forEach((delay) => setTimeout(init, delay));
})();
