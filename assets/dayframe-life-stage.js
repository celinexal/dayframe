(() => {
  'use strict';

  const VERSION = 'life-stage-v3';
  const FLAG = 'data-dayframe-life-stage';
  const STYLE_ID = 'df-life-stage-style';

  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const MODULES = [
    { key: 'money', label: 'Money', note: 'Spending, bills, budgets and credit' },
    { key: 'planner', label: 'Plans', note: 'Tasks, goals and dates' },
    { key: 'driving', label: 'Essentials', note: 'My Car, MyFlo, documents and reminders' },
    { key: 'diary', label: 'Diary', note: 'Private notes and mood' },
    { key: 'bible', label: 'Bible Study', note: 'Reading, notes and highlights' },
    { key: 'investing', label: 'Investing', note: 'Learning, holdings and research' },
  ];
  const WIDGETS = [
    { key: 'coming', label: 'Coming up', note: 'Tasks, bills and vehicle dates' },
    { key: 'goals', label: 'Goal progress', note: 'Your first active goal' },
    { key: 'diary', label: 'Diary prompt', note: 'Daily check-in' },
  ];
  const DRIVING_STAGES = ['learning', 'passed', 'car', 'none'];
  const INVESTING_STAGES = ['learning', 'active', 'none'];
  const INVESTING_PAGES = new Set(['dashboard', 'holdings', 'signals', 'charts', 'themes-hub', 'education', 'isa-guide', 'intel', 'health', 'alerts', 'chatter']);
  const DRIVING_PAGES = new Set(['driving', 'driving-theory', 'driving-car', 'driving-cycle', 'driving-documents', 'driving-health', 'driving-home-admin', 'driving-work-study']);
  const routeMemory = { page: 'home', at: 0 };

  let patched = false;
  let queued = false;

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

  function setText(el, text) {
    if (el && el.textContent.trim() !== text) el.textContent = text;
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
    raw.hiddenSpaces = Array.isArray(raw.hiddenSpaces)
      ? raw.hiddenSpaces.filter((key) => MODULES.some((item) => item.key === key) && key !== 'driving')
      : [];
    raw.drivingStage = DRIVING_STAGES.includes(raw.drivingStage) ? raw.drivingStage : 'learning';
    raw.investingStage = INVESTING_STAGES.includes(raw.investingStage) ? raw.investingStage : 'learning';
    return d;
  }

  function setupFromData(d = getData()) {
    const raw = d?.preferences?.dayframe || {};
    return {
      hiddenSpaces: Array.isArray(raw.hiddenSpaces) ? raw.hiddenSpaces.filter((key) => key !== 'driving') : [],
      drivingStage: DRIVING_STAGES.includes(raw.drivingStage) ? raw.drivingStage : 'learning',
      investingStage: INVESTING_STAGES.includes(raw.investingStage) ? raw.investingStage : 'learning',
    };
  }

  function hiddenSpaces(setup = setupFromData()) {
    const hidden = new Set((setup.hiddenSpaces || []).filter((key) => key !== 'driving'));
    if (setup.investingStage === 'none') hidden.add('investing');
    return hidden;
  }

  function normalPage(name, setup = setupFromData()) {
    const hidden = hiddenSpaces(setup);
    if (name === 'driving-costs') return 'driving-car';
    if (name === 'driving-theory' && setup.drivingStage !== 'learning') return 'driving';
    if (name === 'driving-car' && setup.drivingStage === 'none') return 'driving';
    if (hidden.has('investing') && INVESTING_PAGES.has(name)) return 'home';
    if (hidden.has(name)) return 'home';
    return name;
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('df-life-hidden', Boolean(hidden));
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .df-life-hidden{display:none!important}
      .df-life-editor{display:grid;gap:16px}
      .df-life-editor-section{border:1px solid #e8ebf3;border-radius:18px;background:#fff;padding:16px}
      .df-life-section-title{margin:0 0 4px;font-family:var(--fd);font-size:17px;font-weight:850;color:#172033;letter-spacing:0}
      .df-life-section-copy{margin:0 0 14px;color:#7a8495;font-size:10.5px;line-height:1.55}
      .df-life-home-list{display:grid;gap:8px}
      .df-life-home-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;border:1px solid #edf0f5;border-radius:14px;background:#fff;padding:10px}
      .df-life-home-check{width:18px;height:18px;accent-color:#7564f2}
      .df-life-home-copy strong{display:block;color:#344155;font-size:11px}
      .df-life-home-copy small{display:block;margin-top:2px;color:#929bab;font-size:9px;line-height:1.35}
      .df-life-home-move{display:flex;gap:5px}
      .df-life-home-move button{width:29px;height:29px;border:1px solid #e3e7f0;border-radius:9px;background:#fff;color:#7065e9;font-weight:850;cursor:pointer}
      .df-life-home-move button:disabled{opacity:.38;cursor:not-allowed}
      #df-essentials-stage-panel{display:none!important}
      @media(max-width:680px){
        .df-life-home-row{grid-template-columns:auto 1fr}
        .df-life-home-move{grid-column:2}
      }
    `;
    document.head.appendChild(style);
  }

  function homePrefs(d = getData()) {
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

  function moduleRow(item, index, pref, visibleModules) {
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
    const pref = homePrefs(d);
    const visibleModules = pref.modules.map((key) => MODULES.find((item) => item.key === key)).filter(Boolean);
    out.innerHTML = `
      <div class="df-life-editor">
        <section class="df-life-editor-section">
          <h3 class="df-life-section-title">Home spaces</h3>
          <p class="df-life-section-copy">Choose what appears on Home and put the spaces you use most first.</p>
          <div class="df-life-home-list">${visibleModules.map((item, index) => moduleRow(item, index, pref, visibleModules)).join('')}</div>
        </section>
        <section class="df-life-editor-section">
          <h3 class="df-life-section-title">At a glance</h3>
          <div class="df-life-home-list">${WIDGETS.map((item) => widgetRow(item, pref)).join('')}</div>
        </section>
      </div>
    `;
  }

  function applyHomePreferences(d = getData()) {
    if (!d) return;
    const pref = homePrefs(d);
    const grid = document.querySelector('.hub-module-grid');
    if (grid) {
      pref.modules.forEach((key, index) => {
        const card = grid.querySelector(`[data-home-module="${key}"]`);
        if (!card) return;
        card.style.order = String(index);
        card.classList.toggle('home-item-hidden', pref.hidden.includes(key));
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
      lower.classList.add(`home-visible-${visibleWidgets}`);
    }
  }

  function applyLabels() {
    const homeCard = document.querySelector('[data-home-module="driving"]');
    const homeTitle = homeCard?.querySelector('.hub-module-title');
    const homeDesc = homeCard?.querySelector('.hub-module-desc');
    setText(homeTitle, 'Essentials');
    setText(homeDesc, 'My Car, MyFlo, documents and reminders in one place.');

    const topNav = document.querySelector('.df-nav-btn[data-main-page="driving"]');
    setHidden(topNav, false);
    setText(topNav, 'Essentials');

    const sidebarNav = document.querySelector(`.sb-nav .ni[onclick*="'driving'"]`);
    if (sidebarNav) {
      const textNode = [...sidebarNav.childNodes].reverse().find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (textNode) textNode.textContent = 'Essentials';
    }

    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`);
    setHidden(mobileMore, false);
    setText(mobileMore?.querySelector('strong'), 'Essentials');
    setText(mobileMore?.querySelector('small'), 'My Car, MyFlo, documents and reminders');

    const sideTitle = document.querySelector('.driving-side-title');
    const sideKicker = document.querySelector('.driving-side-kicker');
    setText(sideTitle, 'Essentials');
    setText(sideKicker, 'DAYFRAME');
    const overview = document.querySelector('.driving-side-nav [data-driving-page="driving"]');
    if (overview) {
      const textNode = [...overview.childNodes].reverse().find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (textNode) textNode.textContent = 'Overview';
    }

    const heroTitle = document.querySelector('#pg-driving .driving-hub-title');
    const heroSub = document.querySelector('#pg-driving .driving-hub-sub');
    setText(heroTitle, 'Essentials');
    setText(heroSub, 'My Car first, then the small things you do not want to lose track of.');
    const stagePanel = byId('df-essentials-stage-panel');
    if (stagePanel) stagePanel.remove();
  }

  function applyDrivingStage(setup = setupFromData()) {
    const showTheory = setup.drivingStage === 'learning';
    const showCar = setup.drivingStage !== 'none';
    setHidden(document.querySelector('.driving-side-nav [data-driving-page="driving-theory"]'), !showTheory);
    setHidden(document.querySelector('#pg-driving .driving-home-card.theory'), !showTheory);
    setHidden(document.querySelector('.driving-side-nav [data-driving-page="driving-car"]'), !showCar);
    setHidden(document.querySelector('#pg-driving .driving-home-card.car'), !showCar);
    document.documentElement.dataset.dayframeDrivingStage = setup.drivingStage;
    document.documentElement.dataset.dayframeEssentialsStage = setup.drivingStage;
    document.documentElement.dataset.dayframeInvestingStage = setup.investingStage;
  }

  function applySpaceVisibility(setup = setupFromData()) {
    const hidden = hiddenSpaces(setup);
    MODULES.forEach((item) => {
      setHidden(document.querySelector(`.df-nav-btn[data-main-page="${item.key}"]`), hidden.has(item.key));
      setHidden(document.querySelector(`[data-mobile-page="${item.key}"]`), hidden.has(item.key));
      document.querySelectorAll(`[data-home-module="${item.key}"]`).forEach((el) => setHidden(el, hidden.has(item.key)));
    });
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('dashboard')"]`), hidden.has('investing'));
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('diary')"]`), hidden.has('diary'));
    setHidden(document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('bible')"]`), hidden.has('bible'));
  }

  function applyNow() {
    queued = false;
    ensureStyle();
    const d = getData();
    const setup = setupFromData(d);
    applyLabels();
    applyDrivingStage(setup);
    applySpaceVisibility(setup);
    applyHomePreferences(d);
  }

  function applySoon(delay = 40) {
    if (queued) return;
    queued = true;
    setTimeout(applyNow, delay);
  }

  function patchFunctions() {
    if (patched || typeof window.hubLoad !== 'function') return;
    patched = true;

    const originalGo = window.go;
    if (typeof originalGo === 'function' && !originalGo.__dayframeLifeStageV3) {
      window.go = function dayframeLifeStageGo(name, ...args) {
        const setup = setupFromData();
        const page = normalPage(name, setup);
        routeMemory.page = page;
        routeMemory.at = Date.now();
        const result = originalGo.call(this, page, ...(page === name ? args : []));
        applySoon(20);
        return result;
      };
      window.go.__dayframeLifeStageV3 = true;
    }

    const originalHomeOpenEditor = window.homeOpenEditor;
    if (typeof originalHomeOpenEditor === 'function' && !originalHomeOpenEditor.__dayframeLifeStageV3) {
      window.homeOpenEditor = function dayframeLifeStageOpenEditor() {
        if (typeof window.dfOpenSheet === 'function') window.dfOpenSheet('home-editor-sheet');
        else originalHomeOpenEditor.call(this);
        renderEditor();
        applySoon(20);
      };
      window.homeOpenEditor.__dayframeLifeStageV3 = true;
    }

    window.homeRenderEditor = renderEditor;

    ['renderHome', 'renderDriving', 'renderMoney', 'renderPlanner', 'renderDiary', 'renderBible'].forEach((name) => {
      const original = window[name];
      if (typeof original !== 'function' || original.__dayframeLifeStageV3) return;
      window[name] = function dayframeLifeStageRenderer(...args) {
        const result = original.apply(this, args);
        applySoon(30);
        return result;
      };
      window[name].__dayframeLifeStageV3 = true;
    });
  }

  function saveSetup(mutator) {
    const d = getData();
    if (!d || typeof window.hubSave !== 'function') return;
    const setup = setupFromData(d);
    mutator(setup, d);
    setup.hiddenSpaces = setup.hiddenSpaces.filter((key) => key !== 'driving');
    d.preferences.dayframe = setup;
    window.hubSave(d);
    renderEditor();
    applyNow();
    const current = visiblePageName();
    const next = normalPage(current, setup);
    if (current && next !== current) window.go?.(next);
  }

  window.dayframeSetDrivingStage = function dayframeSetDrivingStage(stage) {
    saveSetup((setup) => {
      setup.drivingStage = DRIVING_STAGES.includes(stage) ? stage : 'learning';
    });
  };

  window.dayframeSetInvestingStage = function dayframeSetInvestingStage(stage) {
    saveSetup((setup) => {
      setup.investingStage = INVESTING_STAGES.includes(stage) ? stage : 'learning';
    });
  };

  window.dayframeToggleSpace = function dayframeToggleSpace(key) {
    if (key === 'driving') {
      applyNow();
      return;
    }
    saveSetup((setup) => {
      const hidden = new Set(setup.hiddenSpaces);
      hidden.has(key) ? hidden.delete(key) : hidden.add(key);
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
    const visible = pref.modules.filter((item) => MODULES.some((module) => module.key === item));
    const fromVisible = visible.indexOf(key);
    const toVisible = Math.max(0, Math.min(visible.length - 1, fromVisible + direction));
    if (fromVisible < 0 || fromVisible === toVisible) return;
    const targetKey = visible[toVisible];
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
    const current = visiblePageName();
    const next = normalPage(current);
    if (current && next !== current) setTimeout(() => window.go?.(next), 60);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  [250, 900, 1800].forEach((delay) => setTimeout(init, delay));
})();