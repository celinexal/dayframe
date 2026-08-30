(() => {
  'use strict';

  const FLAG = 'data-dayframe-essentials';
  const STYLE_ID = 'df-essentials-style';
  const DRIVING_STAGES = ['learning', 'passed', 'car', 'none'];
  const INVESTING_PAGES = new Set(['dashboard', 'holdings', 'signals', 'charts', 'themes-hub', 'education', 'isa-guide', 'intel', 'health', 'alerts', 'chatter']);
  const DRIVING_PAGES = new Set(['driving', 'driving-theory', 'driving-car', 'driving-costs']);
  const MODULES = [
    { key: 'money', label: 'Money', note: 'Spending, bills, budgets and credit' },
    { key: 'planner', label: 'Plans', note: 'Tasks, goals and dates' },
    { key: 'driving', label: 'Essentials', note: 'Theory, car and personal health tools' },
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

  const ORIGINAL_TEXT = new WeakMap();
  let applyQueued = false;
  let goPatched = false;

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
    setup.hiddenSpaces = Array.isArray(setup.hiddenSpaces)
      ? setup.hiddenSpaces.filter((key) => MODULES.some((item) => item.key === key))
      : [];
    const stage = DRIVING_STAGES.includes(setup.essentialsStage)
      ? setup.essentialsStage
      : DRIVING_STAGES.includes(setup.drivingStage)
        ? setup.drivingStage
        : 'learning';
    if (setup.essentialsStage !== stage) {
      setup.essentialsStage = stage;
      changed = true;
    }
    if (setup.drivingStage !== 'learning') {
      setup.drivingStage = 'learning';
      changed = true;
    }
    setup.investingStage = ['learning', 'active', 'none'].includes(setup.investingStage) ? setup.investingStage : 'learning';
    if (changed && typeof window.hubSave === 'function') window.hubSave(d);
    return d;
  }

  function setupFromData(d = getData()) {
    const raw = d?.preferences?.dayframe || {};
    return {
      hiddenSpaces: Array.isArray(raw.hiddenSpaces) ? raw.hiddenSpaces : [],
      drivingStage: DRIVING_STAGES.includes(raw.essentialsStage) ? raw.essentialsStage : 'learning',
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
      essentialsStage: setup.drivingStage,
      drivingStage: 'learning',
      investingStage: setup.investingStage,
    });
    window.hubSave(d);
    renderEditor();
    applyNow();
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('df-life-hidden', Boolean(hidden));
    el.classList.toggle('df-essentials-hidden', Boolean(hidden));
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function setOriginalText(el, next) {
    if (!el) return;
    if (!ORIGINAL_TEXT.has(el)) ORIGINAL_TEXT.set(el, el.textContent || '');
    el.textContent = next === null ? ORIGINAL_TEXT.get(el) : next;
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

  function stageChoice(key, label, note, setup) {
    return `
      <button type="button" class="df-essentials-stage-choice ${setup.drivingStage === key ? 'on' : ''}" onclick="dayframeSetDrivingStage('${key}')">
        <strong>${esc(label)}</strong>
        <small>${esc(note)}</small>
      </button>
    `;
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .df-essentials-hidden{display:none!important}
      #pg-driving .driving-hub-hero{
        background:linear-gradient(135deg,#ffffff 0%,#fff4fb 46%,#effdfa 100%)!important;
        border:1px solid #e6eaf2!important;
        box-shadow:0 18px 44px rgba(39,49,75,.09)!important;
        color:#172033!important;
      }
      #pg-driving .driving-hub-title{color:#172033!important;text-shadow:none!important;letter-spacing:0!important}
      #pg-driving .driving-hub-sub{color:#5f6b7e!important}
      #pg-driving .driving-hub-eyebrow{color:#d75096!important}
      #pg-driving .driving-hub-eyebrow i{background:#ef6aa9!important}
      #pg-driving .driving-hub-pill{background:#fff!important;border:1px solid #e8ebf2!important;color:#5f6b7e!important}
      #pg-driving .driving-hub-pill b{background:#ef6aa9!important}
      html[data-dayframe-essentials-stage] body.driving-mode .driving-sidepanel{display:block!important}
      html[data-dayframe-essentials-stage] #pg-driving .driving-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      html[data-dayframe-essentials-stage="passed"] #pg-driving .driving-card-number,
      html[data-dayframe-essentials-stage="car"] #pg-driving .driving-card-number,
      html[data-dayframe-essentials-stage="none"] #pg-driving .driving-card-number{display:block!important}
      html[data-dayframe-essentials-stage="passed"] .driving-side-nav [data-driving-page="driving-theory"],
      html[data-dayframe-essentials-stage="car"] .driving-side-nav [data-driving-page="driving-theory"],
      html[data-dayframe-essentials-stage="none"] .driving-side-nav [data-driving-page="driving-theory"],
      html[data-dayframe-essentials-stage="passed"] #pg-driving .driving-home-card.theory,
      html[data-dayframe-essentials-stage="car"] #pg-driving .driving-home-card.theory,
      html[data-dayframe-essentials-stage="none"] #pg-driving .driving-home-card.theory,
      html[data-dayframe-essentials-stage="none"] .driving-side-nav [data-driving-page="driving-car"],
      html[data-dayframe-essentials-stage="none"] #pg-driving .driving-home-card.car{display:none!important}
      .df-essentials-stage-panel{margin:0 0 16px;padding:14px;border:1px solid #e8ebf3;border-radius:18px;background:linear-gradient(135deg,#fff 0%,#fff7fb 52%,#effefa 100%);box-shadow:0 14px 30px rgba(39,49,75,.055)}
      .df-essentials-stage-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}
      .df-essentials-stage-top h2{margin:0;font-family:var(--fd);font-size:18px;line-height:1.15;color:#172033;letter-spacing:0}
      .df-essentials-stage-top p{margin:4px 0 0;font-size:10.5px;line-height:1.5;color:#7a8495}
      .df-essentials-stage-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .df-essentials-stage-choice{min-height:72px;padding:10px;border:1px solid #e7eaf2;border-radius:14px;background:#fff;text-align:left;font-family:var(--ff);cursor:pointer;box-shadow:0 8px 20px rgba(39,49,75,.035)}
      .df-essentials-stage-choice strong,.df-essentials-stage-choice small{display:block;letter-spacing:0}
      .df-essentials-stage-choice strong{font-size:11px;color:#263144}
      .df-essentials-stage-choice small{margin-top:4px;font-size:9px;line-height:1.35;color:#8a94a4}
      .df-essentials-stage-choice.on{border-color:#d9ccff;background:linear-gradient(135deg,#f4f0ff,#fff0f7);box-shadow:0 10px 24px rgba(116,99,242,.10)}
      .df-essentials-stage-choice.on strong{color:#6c5bea}
      .driving-home-card.df-period-card{background:linear-gradient(145deg,#fff8fb 0%,#fff 58%,#effdf9 100%);border-color:#f2d5ea}
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
      @media(max-width:900px){html[data-dayframe-essentials-stage] #pg-driving .driving-home-grid,.df-essentials-stage-grid,.df-period-body,.df-period-form-grid{grid-template-columns:1fr!important}}
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

  function ensureStagePanel(setup) {
    const page = byId('pg-driving');
    const grid = page?.querySelector('.driving-home-grid');
    if (!page || !grid) return;
    let panel = byId('df-essentials-stage-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'df-essentials-stage-panel';
      panel.className = 'df-essentials-stage-panel';
      grid.parentElement.insertBefore(panel, grid);
    }
    panel.innerHTML = `
      <div class="df-essentials-stage-top">
        <div>
          <h2>What should Essentials show?</h2>
          <p>Choose where you are with driving. Health tools can sit here too without taking over the app.</p>
        </div>
      </div>
      <div class="df-essentials-stage-grid">
        ${stageChoice('learning', 'Need theory', 'Show Pass your theory.', setup)}
        ${stageChoice('passed', 'Passed theory', 'Hide theory, keep car tools.', setup)}
        ${stageChoice('car', 'Have a car', 'Keep My Car upfront.', setup)}
        ${stageChoice('none', 'Not driving', 'Hide driving-specific cards.', setup)}
      </div>
    `;
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
            <div class="driving-card-number">03</div>
          </div>
          <div class="driving-home-copy"><div class="driving-home-kicker">Health</div><div class="driving-home-title">Period tracker</div><div class="driving-home-desc" id="df-period-card-desc">Save your cycle dates privately and see the next estimate.</div></div>
          <div class="df-period-card-summary" id="df-period-card-summary">Set up when useful</div>
          <div class="driving-home-arrow">→</div>
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

  function applyLabels(setup) {
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

    setOriginalText(document.querySelector('.driving-side-kicker'), 'Essentials');
    setOriginalText(document.querySelector('.driving-side-title'), 'Personal tools');
    setOriginalText(document.querySelector('.driving-side-nav [data-driving-page="driving"]')?.lastChild || document.querySelector('.driving-side-nav [data-driving-page="driving"]'), 'Overview');
    setOriginalText(document.querySelector('.df-nav-btn[data-main-page="driving"]'), 'Essentials');
    setButtonLabel(document.querySelector(`.sb-nav .ni[onclick*="'driving'"]`), 'Essentials');

    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`);
    if (mobileMore) {
      const strong = mobileMore.querySelector('strong');
      const small = mobileMore.querySelector('small');
      if (strong) strong.textContent = 'Essentials';
      if (small) small.textContent = 'Car, theory and health';
    }

    const heroEyebrow = document.querySelector('#pg-driving .driving-hub-eyebrow');
    const heroTitle = document.querySelector('#pg-driving .driving-hub-title');
    const heroSub = document.querySelector('#pg-driving .driving-hub-sub');
    const heroPills = document.querySelector('#pg-driving .driving-hub-pills');
    if (heroEyebrow) heroEyebrow.innerHTML = '<i></i>Your essentials';
    setOriginalText(heroTitle, 'Personal tools that fit your stage.');
    setOriginalText(heroSub, 'Keep theory, car details and private health reminders here only when they are useful to you.');
    if (heroPills) {
      heroPills.innerHTML = '<span class="driving-hub-pill"><b></b>Theory if needed</span><span class="driving-hub-pill"><b></b>Car renewals</span><span class="driving-hub-pill"><b></b>Health reminders</span>';
    }

    const showTheory = setup.drivingStage === 'learning';
    const showCar = setup.drivingStage !== 'none';
    setHidden(document.querySelector('.driving-side-nav [data-driving-page="driving-theory"]'), !showTheory);
    setHidden(document.querySelector('#pg-driving .driving-home-card.theory'), !showTheory);
    setHidden(document.querySelector('.driving-side-nav [data-driving-page="driving-car"]'), !showCar);
    setHidden(document.querySelector('#pg-driving .driving-home-card.car'), !showCar);

    const homeCard = document.querySelector('[data-home-module="driving"]');
    setOriginalText(homeCard?.querySelector('.hub-module-title'), 'Essentials');
    setOriginalText(homeCard?.querySelector('.hub-module-desc'), setup.drivingStage === 'learning'
      ? 'Pass your theory, car details and private health tools in one place.'
      : setup.drivingStage === 'none'
        ? 'Personal health tools, reminders and optional records without extra clutter.'
        : 'Car renewals, useful records and private health tools without digging through tabs.');

    setOriginalText(document.querySelector('#pg-driving .driving-home-card.car .driving-home-title'), 'My Car');
    setOriginalText(document.querySelector('#pg-driving .driving-home-card.car .driving-home-desc'), setup.drivingStage === 'car'
      ? 'Save renewal dates, vehicle details and the small notes you need before you drive.'
      : 'Keep car details ready for when they matter: MOT, insurance, tax, service and notes.');

    document.querySelectorAll('#pg-driving-theory .life-back,#pg-driving-car .life-back,#pg-driving-costs .life-back').forEach((button) => {
      button.textContent = '< Essentials';
    });
  }

  function applyHomePreferenceVisibility(d = getData()) {
    if (!d) return;
    const pref = homePrefs(d);
    const setup = setupFromData(d);
    const hidden = hiddenSpaces(setup);
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
          <h3 class="df-life-section-title">Make Dayframe fit you</h3>
          <p class="df-life-section-copy">Choose the spaces that apply right now. This only changes the app layout; saved records stay in your account.</p>
          <div class="df-life-stage-grid">
            <div class="df-life-stage-card">
              <strong>Essentials</strong>
              <small>${setup.drivingStage === 'learning' ? 'Pass your theory stays visible.' : setup.drivingStage === 'none' ? 'Driving-specific cards are hidden; other essentials can stay.' : setup.drivingStage === 'car' ? 'My Car is prioritised and theory is hidden.' : 'Theory is hidden, but car tools stay available.'}</small>
              <div class="df-life-segments">
                ${optionButton('Need theory', setup.drivingStage === 'learning', "dayframeSetDrivingStage('learning')")}
                ${optionButton('Passed theory', setup.drivingStage === 'passed', "dayframeSetDrivingStage('passed')")}
                ${optionButton('Have a car', setup.drivingStage === 'car', "dayframeSetDrivingStage('car')")}
                ${optionButton('Not driving', setup.drivingStage === 'none', "dayframeSetDrivingStage('none')")}
              </div>
            </div>
            <div class="df-life-stage-card">
              <strong>Investing</strong>
              <small>${setup.investingStage === 'active' ? 'Portfolio, research and sector themes stay visible.' : setup.investingStage === 'none' ? 'Investing is hidden from the main app.' : 'Lessons and plain-English research stay visible.'}</small>
              <div class="df-life-segments">
                ${optionButton('Learning', setup.investingStage === 'learning', "dayframeSetInvestingStage('learning')")}
                ${optionButton('Active', setup.investingStage === 'active', "dayframeSetInvestingStage('active')")}
                ${optionButton('Hide', setup.investingStage === 'none', "dayframeSetInvestingStage('none')")}
              </div>
            </div>
          </div>
        </section>
        <section class="df-life-editor-section">
          <h3 class="df-life-section-title">Spaces</h3>
          <p class="df-life-section-copy">Turn off anything that is not part of your life right now.</p>
          <div class="df-life-space-grid">${spaces.map((item) => spaceToggle(item, !hidden.has(item.key))).join('')}</div>
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
        <div class="df-life-note">This is designed for teens through adults: not childish, not expert-only, just what applies to the person using it.</div>
      </div>
    `;
  }

  function routeTarget(name, setup = setupFromData()) {
    const hidden = hiddenSpaces(setup);
    if (hidden.has('driving') && DRIVING_PAGES.has(name)) return 'home';
    if (setup.drivingStage !== 'learning' && name === 'driving-theory') return 'driving';
    if (setup.drivingStage === 'none' && name === 'driving-car') return 'driving';
    return name;
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
    else {
      const nb = document.querySelector(`.ni[onclick*="'${name}'"]`);
      if (nb) nb.classList.add('on');
    }
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
    if (name === 'charts') {
      window.rCF?.();
      if (window.activeTk) window.openChart?.(window.activeTk);
    }
    if (name === 'health') window.rHealth?.();
    if (name === 'alerts') window.rAlerts?.();
    if (name === 'education') window.rEducation?.();
    if (name !== 'education') {
      const bar = byId('edu-back-bar');
      if (bar) bar.style.display = 'none';
    }
  }

  function patchGo() {
    if (goPatched || typeof window.go !== 'function') return;
    window.go = function dayframeEssentialsGo(name, btn) {
      const next = routeTarget(name, setupFromData());
      showPage(next, btn);
      applySoon(30);
      return undefined;
    };
    goPatched = true;
  }

  function applyNow() {
    applyQueued = false;
    const d = getData();
    if (!d) return;
    ensureStyle();
    patchGo();
    const setup = setupFromData(d);
    document.documentElement.dataset.dayframeDrivingStage = setup.drivingStage;
    document.documentElement.dataset.dayframeEssentialsStage = setup.drivingStage;
    document.documentElement.dataset.dayframeInvestingStage = setup.investingStage;
    window.homeRenderEditor = renderEditor;
    applyLabels(setup);
    ensureStagePanel(setup);
    ensurePeriodTracker();
    applyHomePreferenceVisibility(d);
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

  window.dayframeSetDrivingStage = function dayframeSetDrivingStage(stage) {
    saveSetup((setup) => {
      setup.drivingStage = DRIVING_STAGES.includes(stage) ? stage : 'learning';
      setup.hiddenSpaces = setup.hiddenSpaces.filter((key) => key !== 'driving');
    });
    if (DRIVING_PAGES.has(document.querySelector('.pg.on[id^="pg-"]')?.id?.replace(/^pg-/, '') || '')) {
      window.go?.('driving');
    }
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
    const setup = setupFromData(d);
    const visibleKeys = pref.modules.filter((item) => !hiddenSpaces(setup).has(item));
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

  const existingHomeOpenEditor = window.homeOpenEditor;
  window.homeOpenEditor = function dayframeEssentialsOpenEditor() {
    if (typeof window.dfOpenSheet === 'function') window.dfOpenSheet('home-editor-sheet');
    else existingHomeOpenEditor?.call(this);
    renderEditor();
    applySoon(20);
  };

  function init() {
    applyNow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
  [250, 900, 1900].forEach((delay) => setTimeout(init, delay));
})();