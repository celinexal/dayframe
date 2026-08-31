(() => {
  'use strict';

  const VERSION = 'customise-v1';
  const FLAG = 'data-dayframe-essentials-customise';
  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const STYLE_ID = 'df-essentials-customise-style';
  const STYLE = `
    #pg-driving.df-essentials-customising .driving-home-grid>.driving-home-card:not(.df-widget-hidden){cursor:grab!important;outline:2px dashed rgba(117,100,242,.28)!important;outline-offset:4px!important}
    #pg-driving.df-essentials-customising .driving-home-grid>.driving-home-card:not(.df-widget-hidden):active{cursor:grabbing!important}
    #pg-driving .driving-home-card.df-widget-dragging{opacity:.45!important;transform:scale(.985)!important}
    #pg-driving .driving-home-card.df-widget-drop-target{box-shadow:0 0 0 3px rgba(239,106,169,.22),0 18px 45px rgba(39,49,75,.1)!important}
    #df-essentials-widget-panel.df-widget-picker{padding:22px!important}
    .df-widget-picker .df-widget-panel-head{margin-bottom:14px!important}
    .df-widget-choice-list{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
    .df-widget-choice{display:grid!important;grid-template-columns:38px minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;border:1px solid #e8ebf3!important;border-radius:18px!important;background:rgba(255,255,255,.86)!important;padding:12px!important}
    .df-widget-choice.is-off{background:rgba(248,249,252,.72)!important;color:#8490a3!important}
    .df-widget-choice-icon{width:38px!important;height:38px!important;border-radius:14px!important;display:grid!important;place-items:center!important;background:#fff2f8!important;color:#d84d91!important;font-size:12px!important;font-weight:950!important}
    .df-widget-choice strong{display:block!important;font-size:13px!important;color:#172033!important}
    .df-widget-choice span{display:block!important;margin-top:4px!important;font-size:10.5px!important;line-height:1.35!important;color:#718096!important;font-weight:750!important}
    .df-widget-switch{width:48px!important;height:28px!important;border:0!important;border-radius:999px!important;background:#e8ecf4!important;padding:3px!important;cursor:pointer!important;box-shadow:inset 0 0 0 1px rgba(113,128,150,.12)!important}
    .df-widget-switch span{display:block!important;width:22px!important;height:22px!important;border-radius:999px!important;background:#fff!important;box-shadow:0 4px 10px rgba(39,49,75,.18)!important;transition:transform .16s ease!important}
    .df-widget-switch.is-on{background:linear-gradient(135deg,#7564f2,#ef6aa9)!important}
    .df-widget-switch.is-on span{transform:translateX(20px)!important}
    @media(max-width:900px){.df-widget-choice-list{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:640px){.df-widget-choice-list{grid-template-columns:1fr!important}.df-widget-choice{grid-template-columns:34px minmax(0,1fr) auto!important}.df-widget-choice-icon{width:34px!important;height:34px!important}}
  `;

  const WIDGETS = [
    { key: 'car', label: 'My Car', desc: 'Vehicle details, renewals and reminders.', icon: 'C', card: () => document.querySelector('#pg-driving .driving-home-card.car') },
    { key: 'myflo', label: 'MyFlo', desc: 'Calendar estimates and reminders.', icon: 'M', card: () => document.getElementById('df-period-card') },
    { key: 'documents', label: 'Documents', desc: 'IDs, renewals and where each document is kept.', icon: 'D', card: () => document.getElementById('df-documents-card') },
    { key: 'health', label: 'Health', desc: 'Dentist, GP, prescriptions and checkups.', icon: 'H', card: () => document.getElementById('df-health-card') },
    { key: 'home', label: 'Home & Rent', desc: 'Rent dates, tenancy notes and moving tasks.', icon: 'H', card: () => document.getElementById('df-home-card') },
    { key: 'work-study', label: 'Work & Study', desc: 'Shifts, applications, courses and deadlines.', icon: 'W', card: () => document.getElementById('df-work-study-card') },
  ];
  const ORDER = WIDGETS.map((widget) => widget.key);
  const WIDGET_MAP = new Map(WIDGETS.map((widget) => [widget.key, widget]));
  const NAV_ATTRS = ['data-essentials-tool-card', 'data-essentials-open-flo', 'data-essentials-open-page', 'onclick'];
  const DRIVING_SUBPAGES = new Set(['driving-theory', 'driving-car', 'driving-cycle', 'driving-documents', 'driving-health', 'driving-home-admin', 'driving-work-study']);
  let dragInstalled = false;
  let draggedKey = '';
  let suppressClickUntil = 0;
  let originalGo = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function claim(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
  }

  function ensureStyle() {
    const style = document.getElementById(STYLE_ID) || document.createElement('style');
    style.id = STYLE_ID;
    if (style.textContent !== STYLE) style.textContent = STYLE;
    if (!style.parentElement) document.head.appendChild(style);
  }

  function hubData() {
    return typeof window.hubLoad === 'function' ? (window.hubLoad() || {}) : {};
  }

  function hubSaveData(next) {
    if (typeof window.hubSave === 'function') window.hubSave(next);
  }

  function normalisePrefs(raw = {}) {
    const valid = new Set(ORDER);
    const seen = new Set();
    const order = [];
    (Array.isArray(raw.order) ? raw.order : ORDER).forEach((key) => {
      if (valid.has(key) && !seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    });
    ORDER.forEach((key) => { if (!seen.has(key)) order.push(key); });
    const hidden = [...new Set(Array.isArray(raw.hidden) ? raw.hidden : [])].filter((key) => valid.has(key));
    return { order, hidden };
  }

  function prefs() {
    return normalisePrefs(hubData()?.essentials?.widgetPrefs || {});
  }

  function savePrefs(nextPrefs, message = 'Essentials updated') {
    const wasCustomising = isCustomising();
    const next = hubData();
    next.essentials = next.essentials || {};
    next.essentials.widgetPrefs = normalisePrefs(nextPrefs);
    hubSaveData(next);
    try { window.dayframeRefreshEssentialsWidgets?.(); } catch {}
    ensurePanel();
    setCustomising(wasCustomising);
    syncCards();
    try { window.renderHome?.(); } catch {}
    try { window.hubToast?.(message); } catch {}
    return next.essentials.widgetPrefs;
  }

  function isCustomising() {
    return document.getElementById('pg-driving')?.classList.contains('df-essentials-customising');
  }

  function cardFor(key) {
    return WIDGET_MAP.get(key)?.card() || null;
  }

  function keyFromCard(card) {
    if (!card) return '';
    if (card.dataset.essentialsWidgetKey) return card.dataset.essentialsWidgetKey;
    if (card.matches('#pg-driving .driving-home-card.car')) return 'car';
    if (card.id === 'df-period-card') return 'myflo';
    const match = card.id?.match(/^df-(documents|health|home|work-study)-card$/);
    return match ? match[1] : '';
  }

  function stashAttr(attr) {
    return `data-df-stashed-${attr.replace(/^data-/, '')}`;
  }

  function suppressCardNavigation(card, suppress) {
    if (!card) return;
    NAV_ATTRS.forEach((attr) => {
      const stash = stashAttr(attr);
      if (suppress) {
        if (card.hasAttribute(attr) && !card.hasAttribute(stash)) card.setAttribute(stash, card.getAttribute(attr) || '');
        if (card.hasAttribute(attr)) card.removeAttribute(attr);
      } else if (card.hasAttribute(stash)) {
        card.setAttribute(attr, card.getAttribute(stash) || '');
        card.removeAttribute(stash);
      }
    });
  }

  function choiceHTML(key, current) {
    const widget = WIDGET_MAP.get(key);
    if (!widget) return '';
    const visible = !current.hidden.includes(key);
    return `<article class="df-widget-choice ${visible ? 'is-on' : 'is-off'}" data-widget-choice="${esc(key)}"><div class="df-widget-choice-icon">${esc(widget.icon)}</div><div><strong>${esc(widget.label)}</strong><span>${esc(widget.desc)}</span></div><button type="button" class="df-widget-switch ${visible ? 'is-on' : ''}" aria-label="${visible ? 'Hide' : 'Show'} ${esc(widget.label)}" aria-pressed="${visible ? 'true' : 'false'}" onclick="dayframeToggleEssentialsWidget('${esc(key)}', event)"><span></span></button></article>`;
  }

  function ensurePanel() {
    const hero = document.getElementById('pg-driving')?.querySelector('.driving-hub-hero');
    if (!hero) return;
    let panel = document.getElementById('df-essentials-widget-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'df-essentials-widget-panel';
      panel.hidden = true;
      hero.insertAdjacentElement('afterend', panel);
    }
    if (panel.className !== 'df-essentials-widget-panel df-widget-picker') panel.className = 'df-essentials-widget-panel df-widget-picker';
    const current = prefs();
    const html = `<div class="df-widget-panel-head"><div><span>Essentials</span><h2>Show in Essentials</h2></div><button type="button" onclick="dayframeCloseEssentialsCustomise(event)">Done</button></div><div class="df-widget-choice-list">${current.order.map((key) => choiceHTML(key, current)).join('')}</div>`;
    if (panel.innerHTML !== html) panel.innerHTML = html;
  }

  function setCustomising(active) {
    const page = document.getElementById('pg-driving');
    if (!page) return;
    installGoGuard();
    page.classList.toggle('df-essentials-customising', Boolean(active));
    const value = active ? 'true' : 'false';
    if (page.getAttribute('data-essentials-customising') !== value) page.setAttribute('data-essentials-customising', value);
    const panel = document.getElementById('df-essentials-widget-panel');
    if (panel) panel.hidden = !active;
    syncCards();
  }

  function syncCards() {
    const current = prefs();
    const editing = isCustomising();
    ORDER.forEach((key) => {
      const card = cardFor(key);
      if (!card) return;
      if (card.dataset.essentialsWidgetKey !== key) card.dataset.essentialsWidgetKey = key;
      const canDrag = editing && !current.hidden.includes(key);
      if (card.draggable !== canDrag) card.draggable = canDrag;
      card.classList.toggle('df-widget-can-drag', canDrag);
      if (card.getAttribute('aria-grabbed') !== 'false') card.setAttribute('aria-grabbed', 'false');
      suppressCardNavigation(card, editing);
    });
  }

  function reorderWidgets(sourceKey, targetKey, insertAfter = false) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const current = prefs();
    const order = current.order.filter((key) => key !== sourceKey);
    const targetIndex = order.indexOf(targetKey);
    if (targetIndex < 0) return;
    order.splice(targetIndex + (insertAfter ? 1 : 0), 0, sourceKey);
    savePrefs({ order, hidden: current.hidden }, 'Essentials order updated');
  }

  function installDragHandlers() {
    if (dragInstalled || !document.body) return;
    dragInstalled = true;
    document.addEventListener('dragstart', (event) => {
      if (!isCustomising()) return;
      const card = event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card');
      const key = keyFromCard(card);
      if (!key || prefs().hidden.includes(key)) return;
      draggedKey = key;
      card.classList.add('df-widget-dragging');
      card.setAttribute('aria-grabbed', 'true');
      event.dataTransfer?.setData('text/plain', key);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    }, true);
    document.addEventListener('dragover', (event) => {
      if (!draggedKey || !isCustomising()) return;
      const card = event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card');
      const key = keyFromCard(card);
      if (!key || key === draggedKey) return;
      event.preventDefault();
      document.querySelectorAll('.df-widget-drop-target').forEach((item) => item.classList.remove('df-widget-drop-target'));
      card.classList.add('df-widget-drop-target');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    }, true);
    document.addEventListener('drop', (event) => {
      if (!draggedKey || !isCustomising()) return;
      const card = event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card');
      const targetKey = keyFromCard(card);
      if (!targetKey) return;
      claim(event);
      const rect = card.getBoundingClientRect();
      reorderWidgets(draggedKey, targetKey, event.clientX > rect.left + rect.width / 2);
      suppressClickUntil = Date.now() + 450;
      draggedKey = '';
      document.querySelectorAll('.df-widget-dragging,.df-widget-drop-target').forEach((item) => item.classList.remove('df-widget-dragging', 'df-widget-drop-target'));
    }, true);
    document.addEventListener('dragend', () => {
      if (draggedKey) suppressClickUntil = Date.now() + 450;
      draggedKey = '';
      document.querySelectorAll('.df-widget-dragging,.df-widget-drop-target').forEach((item) => item.classList.remove('df-widget-dragging', 'df-widget-drop-target'));
    }, true);
  }

  function installClickGuard() {
    document.addEventListener('click', (event) => {
      if (Date.now() < suppressClickUntil) {
        claim(event);
        return;
      }
      if (isCustomising() && event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card')) {
        claim(event);
      }
    }, true);
  }

  function installGoGuard() {
    if (window.go?.__dayframeCustomiseGuard === VERSION) return;
    originalGo = typeof window.go === 'function' ? window.go : originalGo;
    if (!originalGo) return;
    const guardedGo = function dayframeCustomiseGuardedGo(name, btn) {
      if (isCustomising() && DRIVING_SUBPAGES.has(name)) return undefined;
      return originalGo.apply(this, arguments);
    };
    guardedGo.__dayframeCustomiseGuard = VERSION;
    guardedGo.__dayframeStableGoVersion = originalGo.__dayframeStableGoVersion || '';
    window.go = guardedGo;
  }

  function installGlobals() {
    window.dayframeToggleEssentialsCustomise = function dayframeToggleEssentialsCustomise(event) {
      claim(event);
      ensurePanel();
      setCustomising(!isCustomising());
    };
    window.dayframeCloseEssentialsCustomise = function dayframeCloseEssentialsCustomise(event) {
      claim(event);
      setCustomising(false);
    };
    window.dayframeToggleEssentialsWidget = function dayframeToggleEssentialsWidget(key, event) {
      claim(event);
      if (!WIDGET_MAP.has(key)) return;
      const current = prefs();
      const hidden = new Set(current.hidden);
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      savePrefs({ order: current.order, hidden: [...hidden] });
      setCustomising(true);
      if (hidden.has(key) && key === 'myflo') {
        const periodPanel = document.getElementById('df-period-panel');
        if (periodPanel) periodPanel.hidden = true;
      }
    };
    window.dayframeSetEssentialsWidget = function dayframeSetEssentialsWidget(key, visible) {
      if (!WIDGET_MAP.has(key)) return;
      const current = prefs();
      const hidden = new Set(current.hidden);
      if (visible) hidden.delete(key);
      else hidden.add(key);
      savePrefs({ order: current.order, hidden: [...hidden] });
    };
    window.dayframeMoveEssentialsWidget = function dayframeMoveEssentialsWidget(key, direction, event) {
      claim(event);
      if (!WIDGET_MAP.has(key)) return;
      const current = prefs();
      const from = current.order.indexOf(key);
      const to = Math.max(0, Math.min(current.order.length - 1, from + (Number(direction) || 0)));
      if (from < 0 || from === to) return;
      const order = [...current.order];
      const [item] = order.splice(from, 1);
      order.splice(to, 0, item);
      savePrefs({ order, hidden: current.hidden }, 'Essentials order updated');
      setCustomising(true);
    };
  }

  function apply() {
    ensureStyle();
    ensurePanel();
    installGlobals();
    installDragHandlers();
    installGoGuard();
    syncCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(apply, delay));
  if (typeof MutationObserver === 'function') {
    new MutationObserver(() => {
      const panel = document.getElementById('df-essentials-widget-panel');
      if (!panel || isCustomising() || !panel.classList.contains('df-widget-picker') || !panel.querySelector('[data-widget-choice]')) apply();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  installClickGuard();
})();
