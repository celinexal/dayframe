(() => {
  'use strict';

  const FLAG = 'data-dayframe-life-stage';
  const STYLE_ID = 'df-life-stage-style';
  const MODULES = [
    { key: 'money', label: 'Money', note: 'Spending, bills, budgets and credit' },
    { key: 'planner', label: 'Plans', note: 'Tasks, goals and dates' },
    { key: 'driving', label: 'Driving', note: 'Theory or car admin' },
    { key: 'diary', label: 'Diary', note: 'Private notes and mood' },
    { key: 'bible', label: 'Bible Study', note: 'Reading, notes and highlights' },
    { key: 'investing', label: 'Investing', note: 'Learning, holdings and research' },
  ];
  const WIDGETS = [
    { key: 'coming', label: 'Coming up', note: 'Tasks, bills and vehicle dates' },
    { key: 'goals', label: 'Goal progress', note: 'Your first active goal' },
    { key: 'diary', label: 'Diary prompt', note: 'Daily check-in' },
  ];
  const DEFAULT_SETUP = {
    hiddenSpaces: [],
    drivingStage: 'learning',
    investingStage: 'learning',
  };
  const INVESTING_PAGES = new Set(['dashboard', 'holdings', 'signals', 'charts', 'themes-hub', 'education', 'isa-guide', 'intel', 'health', 'alerts', 'chatter']);
  const DRIVING_PAGES = new Set(['driving', 'driving-theory', 'driving-car', 'driving-costs']);
  const ORIGINAL_TEXT = new WeakMap();

  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  let patched = false;
  let applyQueued = false;

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

  function visiblePageName() {
    const page = document.querySelector('.pg.on[id^="pg-"]');
    return page ? page.id.replace(/^pg-/, '') : '';
  }

  function getData() {
    if (typeof window.hubLoad !== 'function') return null;
    const d = window.hubLoad();
    d.preferences = d.preferences || {};
    d.preferences.dayframe = d.preferences.dayframe || {};
    const raw = d.preferences.dayframe;
    raw.hiddenSpaces = Array.isArray(raw.hiddenSpaces) ? raw.hiddenSpaces.filter((key) => MODULES.some((item) => item.key === key)) : [];
    raw.drivingStage = ['learning', 'passed', 'none'].includes(raw.drivingStage) ? raw.drivingStage : DEFAULT_SETUP.drivingStage;
    raw.investingStage = ['learning', 'active', 'none'].includes(raw.investingStage) ? raw.investingStage : DEFAULT_SETUP.investingStage;
    return d;
  }

  function setupFromData(d = getData()) {
    const raw = d?.preferences?.dayframe || {};
    return {
      hiddenSpaces: Array.isArray(raw.hiddenSpaces) ? raw.hiddenSpaces : [],
      drivingStage: raw.drivingStage || DEFAULT_SETUP.drivingStage,
      investingStage: raw.investingStage || DEFAULT_SETUP.investingStage,
    };
  }

  function fullHiddenSpaces(setup = setupFromData()) {
    const hidden = new Set(setup.hiddenSpaces);
    if (setup.drivingStage === 'none') hidden.add('driving');
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
    d.preferences.dayframe = setup;
    window.hubSave(d);
    renderEditor();
    applyNow();
    const page = visiblePageName();
    if (page && pageShouldRedirect(page, setup)) {
      setTimeout(() => window.go?.(normalPage(page, setup)), 30);
    }
  }

  function pageShouldRedirect(name, setup = setupFromData()) {
    const hidden = fullHiddenSpaces(setup);
    if (hidden.has('money') && name === 'money') return true;
    if (hidden.has('planner') && name === 'planner') return true;
    if (hidden.has('diary') && name === 'diary') return true;
    if (hidden.has('bible') && name === 'bible') return true;
    if (hidden.has('driving') && DRIVING_PAGES.has(name)) return true;
    if (hidden.has('investing') && INVESTING_PAGES.has(name)) return true;
    if (setup.drivingStage === 'passed' && (name === 'driving' || name === 'driving-theory')) return true;
    return false;
  }

  function normalPage(name, setup = setupFromData()) {
    const hidden = fullHiddenSpaces(setup);
    if (hidden.has('driving') && DRIVING_PAGES.has(name)) return 'home';
    if (hidden.has('investing') && INVESTING_PAGES.has(name)) return 'home';
    if (hidden.has('money') && name === 'money') return 'home';
    if (hidden.has('planner') && name === 'planner') return 'home';
    if (hidden.has('diary') && name === 'diary') return 'home';
    if (hidden.has('bible') && name === 'bible') return 'home';
    if (setup.drivingStage === 'passed' && (name === 'driving' || name === 'driving-theory')) return 'driving-car';
    return name;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('df-life-hidden', Boolean(hidden));
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function setOriginalText(el, next) {
    if (!el) return;
    if (!ORIGINAL_TEXT.has(el)) ORIGINAL_TEXT.set(el, el.textContent || '');
    el.textContent = next === null ? ORIGINAL_TEXT.get(el) : next;
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .df-life-hidden{display:none!important}
      .home-edit-button.df-customise-home{gap:7px}
      .df-life-editor{display:grid;gap:18px}
      .df-life-editor-section{border:1px solid #e6eaf2;border-radius:18px;background:#fff;padding:16px}
      .df-life-editor-section.soft{background:linear-gradient(135deg,#ffffff 0%,#fbfdff 52%,#fff7fb 100%)}
      .df-life-section-title{font-family:var(--fd);font-size:16px;font-weight:850;color:#172033;letter-spacing:0;margin:0 0 4px}
      .df-life-section-copy{font-size:10.5px;line-height:1.55;color:#7a8495;margin:0 0 14px}
      .df-life-stage-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .df-life-stage-card{border:1px solid #edf0f5;border-radius:15px;background:rgba(255,255,255,.86);padding:13px}
      .df-life-stage-card strong{display:block;font-size:12px;color:#253044;margin-bottom:3px}
      .df-life-stage-card small{display:block;font-size:9.5px;line-height:1.45;color:#8c96a7;margin-bottom:10px}
      .df-life-segments{display:flex;flex-wrap:wrap;gap:7px}
      .df-life-segments button,.df-life-mini-button{height:32px;border:1px solid #e2e6f0;border-radius:999px;background:#fff;color:#697386;font-family:var(--ff);font-size:10px;font-weight:800;padding:0 11px;cursor:pointer}
      .df-life-segments button.on{border-color:#d9ccff;background:linear-gradient(135deg,#f3efff,#fff0f7);color:#6d5bea;box-shadow:0 8px 18px rgba(107,91,234,.10)}
      .df-life-space-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .df-life-space-toggle{width:100%;display:flex;align-items:center;gap:11px;text-align:left;border:1px solid #e8ebf2;border-radius:14px;background:#fff;padding:11px;font-family:var(--ff);cursor:pointer}
      .df-life-space-toggle:hover{border-color:#ddd7ff;background:#fcfbff}
      .df-life-switch{width:34px;height:20px;border-radius:999px;background:#e8ecf3;position:relative;flex:0 0 auto;transition:.16s ease}
      .df-life-switch i{position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(18,25,40,.16);transition:.16s ease}
      .df-life-space-toggle.on .df-life-switch{background:linear-gradient(135deg,#7463f2,#f46aa7)}
      .df-life-space-toggle.on .df-life-switch i{transform:translateX(14px)}
      .df-life-space-toggle strong{display:block;font-size:11px;color:#334055}
      .df-life-space-toggle small{display:block;margin-top:2px;font-size:9px;line-height:1.35;color:#929bab}
      .df-life-home-list{display:grid;gap:8px}
      .df-life-home-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;border:1px solid #edf0f5;border-radius:14px;background:#fff;padding:10px}
      .df-life-home-check{width:18px;height:18px;accent-color:#7564f2}
      .df-life-home-copy strong{display:block;font-size:11px;color:#344155}
      .df-life-home-copy small{display:block;margin-top:2px;font-size:9px;line-height:1.35;color:#929bab}
      .df-life-home-move{display:flex;gap:5px}
      .df-life-home-move button{width:29px;height:29px;border:1px solid #e3e7f0;border-radius:9px;background:#fff;color:#7065e9;font-weight:850;cursor:pointer}
      .df-life-home-move button:disabled{opacity:.38;cursor:not-allowed}
      .df-life-note{font-size:10px;line-height:1.5;color:#7d8798;background:#f7f8fc;border:1px solid #edf0f5;border-radius:13px;padding:10px 12px}
      #pg-home .hub-hero-copy>p,#home-setup-card,#home-setup-nudge{display:none!important}
      #pg-home .hub-hero-side{display:none!important}
      #pg-home .hub-hero{grid-template-columns:1fr!important;min-height:220px}
      html[data-dayframe-driving-stage="passed"] body.driving-mode .driving-sidepanel{display:none!important}
      html[data-dayframe-driving-stage="passed"] body.driving-mode .main>.pg{margin-left:0!important;width:100%!important}
      html[data-dayframe-driving-stage="passed"] #pg-driving .driving-home-grid{grid-template-columns:minmax(0,620px)}
      html[data-dayframe-driving-stage="passed"] #pg-driving .driving-home-card.car{min-height:190px}
      html[data-dayframe-driving-stage="passed"] #pg-driving .driving-card-number{display:none}
      @media(max-width:680px){
        .df-life-stage-grid,.df-life-space-grid{grid-template-columns:1fr}
        .df-life-editor-section{padding:14px}
        .df-life-home-row{grid-template-columns:auto 1fr}
        .df-life-home-move{grid-column:2}
      }
    `;
    document.head.appendChild(style);
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

  function renderEditor() {
    const out = byId('home-editor-content');
    const d = getData();
    if (!out || !d) return;
    ensureStyle();
    const setup = setupFromData(d);
    const hidden = fullHiddenSpaces(setup);
    const pref = homePrefs(d);
    const stageModules = MODULES.filter((item) => !hidden.has(item.key));
    const visibleModules = pref.modules.map((key) => stageModules.find((item) => item.key === key)).filter(Boolean);
    const moneyPlansDiaryBible = MODULES.filter((item) => ['money', 'planner', 'diary', 'bible'].includes(item.key));
    out.innerHTML = `
      <div class="df-life-editor">
        <section class="df-life-editor-section soft">
          <h3 class="df-life-section-title">Make Dayframe fit you</h3>
          <p class="df-life-section-copy">Choose the spaces that apply right now. This only changes the app layout; saved records stay in your account.</p>
          <div class="df-life-stage-grid">
            <div class="df-life-stage-card">
              <strong>Driving</strong>
              <small>${setup.drivingStage === 'passed' ? 'Driving opens My Car and hides theory.' : setup.drivingStage === 'none' ? 'Driving is hidden from the main app.' : 'Theory, hazard practice and My Car stay visible.'}</small>
              <div class="df-life-segments">
                ${optionButton('Learning', setup.drivingStage === 'learning', "dayframeSetDrivingStage('learning')")}
                ${optionButton('Passed', setup.drivingStage === 'passed', "dayframeSetDrivingStage('passed')")}
                ${optionButton('Hide', setup.drivingStage === 'none', "dayframeSetDrivingStage('none')")}
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
          <div class="df-life-space-grid">${moneyPlansDiaryBible.map((item) => spaceToggle(item, !hidden.has(item.key))).join('')}</div>
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

  function applyHomePreferenceVisibility(d = getData()) {
    if (!d) return;
    const pref = homePrefs(d);
    const setup = setupFromData(d);
    const hidden = fullHiddenSpaces(setup);
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

  function applyStage() {
    const d = getData();
    if (!d) return;
    ensureStyle();
    const setup = setupFromData(d);
    const hidden = fullHiddenSpaces(setup);
    document.documentElement.dataset.dayframeDrivingStage = setup.drivingStage;
    document.documentElement.dataset.dayframeInvestingStage = setup.investingStage;

    MODULES.forEach((item) => {
      setHidden(document.querySelector(`.df-nav-btn[data-main-page="${item.key}"]`), hidden.has(item.key));
      setHidden(document.querySelector(`[data-mobile-page="${item.key}"]`), hidden.has(item.key));
      document.querySelectorAll(`[data-home-module="${item.key}"]`).forEach((el) => setHidden(el, hidden.has(item.key)));
    });

    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`), hidden.has('driving'));
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('dashboard')"]`), hidden.has('investing'));
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('diary')"]`), hidden.has('diary'));
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('bible')"]`), hidden.has('bible'));

    const editButton = document.querySelector('.home-edit-button');
    if (editButton) {
      editButton.classList.add('df-customise-home');
      editButton.innerHTML = '<span>*</span> Customise Dayframe';
    }
    const moreEdit = document.querySelector(`#df-more-sheet button[onclick*="homeOpenEditor"]`);
    if (moreEdit) {
      const strong = moreEdit.querySelector('strong');
      const small = moreEdit.querySelector('small');
      if (strong) strong.textContent = 'Customise Dayframe';
      if (small) small.textContent = 'Choose spaces and layout';
    }
    const sheetTitle = byId('home-editor-title');
    if (sheetTitle) sheetTitle.textContent = 'Customise Dayframe';
    const sheetCopy = document.querySelector('#home-editor-sheet .df-sheet-head p');
    if (sheetCopy) sheetCopy.textContent = 'Choose what applies to you and what appears on Home.';

    applyDrivingCopy(setup);
    applyInvestingCopy(setup);
    applyHomePreferenceVisibility(d);
  }

  function applyDrivingCopy(setup) {
    const sideTitle = document.querySelector('.driving-side-title');
    const overviewBtn = document.querySelector('.driving-side-nav [data-driving-page="driving"]');
    const theoryBtn = document.querySelector('.driving-side-nav [data-driving-page="driving-theory"]');
    const theoryCard = document.querySelector('#pg-driving .driving-home-card.theory');
    const drivingCard = document.querySelector('[data-home-module="driving"]');
    const drivingCardTitle = drivingCard?.querySelector('.hub-module-title');
    const drivingCardDesc = drivingCard?.querySelector('.hub-module-desc');
    const carCardTitle = document.querySelector('#pg-driving .driving-home-card.car .driving-home-title');
    const carCardDesc = document.querySelector('#pg-driving .driving-home-card.car .driving-home-desc');
    const heroTitle = document.querySelector('#pg-driving .driving-hub-title');
    const heroSub = document.querySelector('#pg-driving .driving-hub-sub');

    const passed = setup.drivingStage === 'passed';
    setHidden(theoryBtn, passed);
    setHidden(theoryCard, passed);
    if (overviewBtn) setOriginalText(overviewBtn.lastChild || overviewBtn, passed ? 'My Car' : null);
    setOriginalText(sideTitle, passed ? 'Car admin' : null);
    setOriginalText(heroTitle, passed ? 'Keep your car admin together.' : null);
    setOriginalText(heroSub, passed ? 'MOT, tax, insurance, service dates and notes in one calm place.' : null);
    setOriginalText(drivingCardTitle, passed ? 'My Car' : null);
    setOriginalText(drivingCardDesc, passed ? 'MOT, tax, insurance, service dates and vehicle notes without digging through emails.' : null);
    setOriginalText(carCardTitle, passed ? 'My Car' : null);
    setOriginalText(carCardDesc, passed ? 'Save renewal dates, vehicle details and the small notes you need before you drive.' : null);
  }

  function applyInvestingCopy(setup) {
    const card = document.querySelector('[data-home-module="investing"]');
    const desc = card?.querySelector('.hub-module-desc');
    if (!desc) return;
    if (setup.investingStage === 'learning') {
      setOriginalText(desc, 'Plain-English lessons, risk basics and research before you put money to work.');
    } else if (setup.investingStage === 'active') {
      setOriginalText(desc, 'Your holdings, risk score, research and current sector themes in one place.');
    } else {
      setOriginalText(desc, null);
    }
  }

  function applyNow() {
    applyQueued = false;
    applyStage();
  }

  function applySoon(delay = 40) {
    if (applyQueued) return;
    applyQueued = true;
    setTimeout(applyNow, delay);
  }

  function patchFunctions() {
    if (patched || typeof window.hubLoad !== 'function') return;
    patched = true;

    const originalGo = window.go;
    if (typeof originalGo === 'function' && !originalGo.__dayframeLifeStage) {
      window.go = function dayframeLifeStageGo(name, ...args) {
        const setup = setupFromData();
        const next = normalPage(name, setup);
        const result = originalGo.call(this, next, ...(next === name ? args : []));
        applySoon(20);
        return result;
      };
      window.go.__dayframeLifeStage = true;
    }

    const originalHomeOpenEditor = window.homeOpenEditor;
    if (typeof originalHomeOpenEditor === 'function' && !originalHomeOpenEditor.__dayframeLifeStage) {
      window.homeOpenEditor = function dayframeLifeStageOpenEditor() {
        if (typeof window.dfOpenSheet === 'function') window.dfOpenSheet('home-editor-sheet');
        else originalHomeOpenEditor.call(this);
        renderEditor();
        applySoon(20);
      };
      window.homeOpenEditor.__dayframeLifeStage = true;
    }

    window.homeRenderEditor = renderEditor;

    ['renderHome', 'renderDriving', 'renderMoney', 'renderPlanner', 'renderDiary', 'renderBible'].forEach((name) => {
      const original = window[name];
      if (typeof original !== 'function' || original.__dayframeLifeStage) return;
      window[name] = function patchedRenderer(...args) {
        const result = original.apply(this, args);
        applySoon(30);
        return result;
      };
      window[name].__dayframeLifeStage = true;
    });
  }

  window.dayframeSetDrivingStage = function dayframeSetDrivingStage(stage) {
    saveSetup((setup) => {
      setup.drivingStage = ['learning', 'passed', 'none'].includes(stage) ? stage : 'learning';
      setup.hiddenSpaces = setup.hiddenSpaces.filter((key) => key !== 'driving');
    });
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
      const isHidden = hidden.has(key);
      if (isHidden) hidden.delete(key);
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
    const visibleKeys = pref.modules.filter((item) => !fullHiddenSpaces(setup).has(item));
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

  function init() {
    patchFunctions();
    applyNow();
    const page = visiblePageName();
    if (page && pageShouldRedirect(page)) {
      setTimeout(() => window.go?.(normalPage(page)), 60);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
  [250, 900, 1800].forEach((delay) => setTimeout(init, delay));
})();