(() => {
  'use strict';

  const VERSION = 'essentials-bible-v2';
  const FLAG = 'data-dayframe-essentials-bible';
  const STYLE_ID = 'df-essentials-bible-style';
  const ORDER = ['car', 'myflo', 'documents', 'health', 'bible'];
  const DISALLOWED = new Set(['home', 'work-study']);
  const LABELS = {
    car: 'My Car',
    myflo: 'MyFlo',
    documents: 'Documents',
    health: 'Health',
    bible: 'Bible',
  };
  const DETAILS = {
    car: {
      label: 'My Car',
      desc: 'Vehicle details, renewals and reminders.',
      icon: 'C',
      card: () => document.querySelector('#pg-driving .driving-home-card.car'),
      page: 'driving-car',
    },
    myflo: {
      label: 'MyFlo',
      desc: 'Calendar estimates and reminders.',
      icon: 'M',
      card: () => document.getElementById('df-period-card'),
      page: 'driving-cycle',
    },
    documents: {
      label: 'Documents',
      desc: 'IDs, renewals and where each document is kept.',
      icon: 'D',
      card: () => document.getElementById('df-documents-card'),
      page: 'driving-documents',
    },
    health: {
      label: 'Health',
      desc: 'Dentist, GP, prescriptions and checkups.',
      icon: 'H',
      card: () => document.getElementById('df-health-card'),
      page: 'driving-health',
    },
    bible: {
      label: 'Bible',
      desc: "Scripture, today's verse and private reflections.",
      icon: 'B',
      card: () => document.getElementById('df-bible-card'),
      page: 'bible',
    },
  };

  let queued = false;
  let dragKey = '';
  let clickInstalled = false;
  let dragInstalled = false;
  let observerStarted = false;
  let upstreamOpenTool = null;
  let upstreamOpenRealTool = null;

  function esc(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
  }

  function claim(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
  }

  function page() {
    return document.getElementById('pg-driving');
  }

  function grid() {
    return page()?.querySelector('.driving-home-grid') || null;
  }

  function hubData() {
    try {
      return typeof window.hubLoad === 'function' ? (window.hubLoad() || {}) : {};
    } catch {
      return {};
    }
  }

  function hubSaveData(next) {
    try {
      if (typeof window.hubSave === 'function') window.hubSave(next);
    } catch {}
  }

  // Switching "Bible" off in Edit Home also hides it from Essentials.
  function homeBibleHidden() {
    try {
      const hidden = hubData()?.preferences?.home?.hidden;
      return Array.isArray(hidden) && hidden.includes('bible');
    } catch {
      return false;
    }
  }

  function normalisePrefs(raw = {}) {
    const seen = new Set();
    const order = [];
    (Array.isArray(raw.order) ? raw.order : ORDER).forEach((key) => {
      if (ORDER.includes(key) && !seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    });
    ORDER.forEach((key) => {
      if (!seen.has(key)) order.push(key);
    });
    const hidden = [...new Set(Array.isArray(raw.hidden) ? raw.hidden : [])]
      .filter((key) => ORDER.includes(key));
    return { order, hidden };
  }

  function samePrefs(a, b) {
    return JSON.stringify(normalisePrefs(a)) === JSON.stringify(normalisePrefs(b));
  }

  function currentPrefs() {
    return normalisePrefs(hubData()?.essentials?.widgetPrefs || {});
  }

  function savePrefs(nextPrefs, message) {
    const next = hubData();
    next.essentials = next.essentials || {};
    const clean = normalisePrefs(nextPrefs);
    const previous = next.essentials.widgetPrefs || {};
    if (!samePrefs(previous, clean)) {
      next.essentials.widgetPrefs = clean;
      hubSaveData(next);
      try { window.hubToast?.(message || 'Essentials updated'); } catch {}
    }
    return clean;
  }

  function cleanSavedPrefs() {
    const data = hubData();
    data.essentials = data.essentials || {};
    const previous = data.essentials.widgetPrefs || {};
    const clean = normalisePrefs(previous);
    const previousOrder = Array.isArray(previous.order) ? previous.order : [];
    const previousHidden = Array.isArray(previous.hidden) ? previous.hidden : [];
    const hadBlocked = [...previousOrder, ...previousHidden].some((key) => DISALLOWED.has(key));
    if (hadBlocked || !samePrefs(previous, clean)) {
      data.essentials.widgetPrefs = clean;
      hubSaveData(data);
    }
    return clean;
  }

  function ensureStyle() {
    if (!document.head) return;
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    const css = `
      [data-home-module="bible"],
      .df-nav-btn[data-main-page="bible"],
      .df-mobile-nav button[data-mobile-page="bible"],
      #df-home-card,
      #df-work-study-card,
      #pg-driving-home-admin,
      #pg-driving-work-study,
      .driving-side-nav [data-driving-page="driving-home-admin"],
      .driving-side-nav [data-driving-page="driving-work-study"]{display:none!important}
      #pg-driving #df-bible-card{grid-column:span 4!important;background:linear-gradient(145deg,#fff,#fff8ef 54%,#f5fbff)!important}
      #pg-driving #df-bible-card:before{background:linear-gradient(90deg,#b88242,#6b78e6)!important}
      #pg-driving #df-bible-card .driving-home-icon{background:#fff4e4!important;color:#9d6424!important}
      #pg-driving #df-bible-card .driving-home-arrow{background:#fff4e4!important;color:#9d6424!important}
      .driving-side-nav [data-driving-page="bible"] span{font-weight:900}
      @media(max-width:1180px){#pg-driving #df-bible-card{grid-column:auto!important}}
    `.replace(/\s+/g, ' ').trim();
    if (style.textContent !== css) style.textContent = css;
  }

  function bibleCardHTML() {
    return `
      <div class="driving-card-top">
        <div class="driving-home-icon"><svg viewBox="0 0 24 24"><path d="M5 5.5A2.5 2.5 0 017.5 3H20v16H7.5A2.5 2.5 0 015 16.5z"/><path d="M8 3v16M10.5 7H16M10.5 11H17"/></svg></div>
        <div class="driving-card-number">05</div>
      </div>
      <div class="driving-home-copy">
        <div class="driving-home-kicker">Faith</div>
        <div class="driving-home-title">Bible</div>
        <div class="driving-home-desc">Read Scripture, follow today's verse and keep private reflections.</div>
      </div>
      <div class="driving-card-tags"><span class="driving-card-tag">Verse</span><span class="driving-card-tag">Reader</span><span class="driving-card-tag">Notes</span></div>
      <div class="driving-home-arrow">-&gt;</div>
    `;
  }

  function ensureBibleCard() {
    const host = grid();
    if (!host) return null;
    let card = document.getElementById('df-bible-card');
    if (!card) {
      card = document.createElement('button');
      card.type = 'button';
      card.id = 'df-bible-card';
      card.className = 'driving-home-card df-bible-card df-essentials-tool-card';
      host.appendChild(card);
    }
    if (card.type !== 'button') card.type = 'button';
    if (card.dataset.essentialsWidgetKey !== 'bible') card.dataset.essentialsWidgetKey = 'bible';
    if (card.dataset.essentialsOpenPage !== 'bible') card.dataset.essentialsOpenPage = 'bible';
    if (card.getAttribute('aria-label') !== 'Open Bible') card.setAttribute('aria-label', 'Open Bible');
    if (card.hasAttribute('onclick')) card.removeAttribute('onclick');
    if (!card.querySelector('.driving-home-title') || !/Bible/i.test(card.textContent || '')) {
      card.innerHTML = bibleCardHTML();
    }
    return card;
  }

  function ensureBibleSideNav() {
    const nav = document.querySelector('.driving-side-nav');
    if (!nav) return null;
    let item = nav.querySelector('[data-driving-page="bible"]');
    if (!item) {
      item = document.createElement('button');
      item.type = 'button';
      item.dataset.drivingPage = 'bible';
      item.dataset.essentialsOpenPage = 'bible';
      item.innerHTML = '<span>B</span>Bible';
      const car = nav.querySelector('[data-driving-page="driving-car"]');
      car?.insertAdjacentElement('afterend', item) || nav.appendChild(item);
    }
    if (item.hasAttribute('onclick')) item.removeAttribute('onclick');
    if (item.dataset.essentialsOpenPage !== 'bible') item.dataset.essentialsOpenPage = 'bible';
    return item;
  }

  function setVisible(el, visible) {
    if (!el) return;
    el.classList.toggle('df-widget-hidden', !visible);
    if (el.hidden !== !visible) el.hidden = !visible;
    const aria = visible ? 'false' : 'true';
    if (el.getAttribute('aria-hidden') !== aria) el.setAttribute('aria-hidden', aria);
    const display = visible ? '' : 'none';
    if (el.style.display !== display) el.style.display = display;
  }

  function cardFor(key) {
    return DETAILS[key]?.card() || null;
  }

  function keyFromCard(card) {
    if (!card) return '';
    if (card.dataset.essentialsWidgetKey) return card.dataset.essentialsWidgetKey;
    if (card.matches?.('#pg-driving .driving-home-card.car')) return 'car';
    if (card.id === 'df-period-card') return 'myflo';
    const match = card.id?.match(/^df-(documents|health|bible)-card$/);
    return match ? match[1] : '';
  }

  function hideStalePieces() {
    ['df-home-card', 'df-work-study-card', 'pg-driving-home-admin', 'pg-driving-work-study'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        if (el.hidden !== true) el.hidden = true;
        if (el.getAttribute('aria-hidden') !== 'true') el.setAttribute('aria-hidden', 'true');
        el.classList.add('df-widget-hidden');
        if (el.style.display !== 'none') el.style.display = 'none';
      }
    });
    document.querySelectorAll('[data-driving-page="driving-home-admin"],[data-driving-page="driving-work-study"],[data-home-module="bible"],.df-nav-btn[data-main-page="bible"],.df-mobile-nav button[data-mobile-page="bible"]').forEach((el) => {
      if (el.hidden !== true) el.hidden = true;
      if (el.getAttribute('aria-hidden') !== 'true') el.setAttribute('aria-hidden', 'true');
      if (el.style.display !== 'none') el.style.display = 'none';
    });
    document.querySelectorAll('#df-essentials-widget-panel [data-widget-choice="home"],#df-essentials-widget-panel [data-widget-choice="work-study"]').forEach((el) => el.remove());
    document.querySelectorAll('#home-editor-content .home-editor-row,#home-editor-content [data-home-editor-row]').forEach((row) => {
      const text = row.textContent || '';
      // The Bible row stays in Edit Home so it can be switched off there;
      // only the removed Home & Work/Study rows are hidden.
      if (/Home\s*&\s*Rent|Work\s*&\s*Study/i.test(text)) {
        if (row.hidden !== true) row.hidden = true;
        if (row.style.display !== 'none') row.style.display = 'none';
      }
    });
    const drivingTile = document.querySelector('[data-home-module="driving"]');
    const drivingTitle = drivingTile?.querySelector('.hub-module-title');
    const drivingDesc = drivingTile?.querySelector('.hub-module-desc');
    if (drivingTitle) drivingTitle.textContent = 'Essentials';
    if (drivingDesc) drivingDesc.textContent = 'Car, MyFlo, documents, health and Bible in one place.';
    const back = document.querySelector('#pg-bible .bible-back-new');
    if (back) {
      if (back.textContent !== '< Essentials') back.textContent = '< Essentials';
      if (back.hasAttribute('onclick')) back.removeAttribute('onclick');
      back.onclick = (event) => {
        claim(event);
        openEssentials();
      };
    }
  }

  function widgetHidden(prefs, key) {
    return prefs.hidden.includes(key) || (key === 'bible' && homeBibleHidden());
  }
  function visibleLabels(prefs) {
    return prefs.order.filter((key) => !widgetHidden(prefs, key)).map((key) => LABELS[key]).filter(Boolean);
  }

  function ensureCustomiseButton() {
    const hero = page()?.querySelector('.driving-hub-hero');
    if (!hero) return null;
    let button = document.getElementById('df-essentials-customise-button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'df-essentials-customise-button';
      button.className = 'driving-hub-pill df-essentials-customise-button';
      button.innerHTML = '<b></b>Customise';
      button.addEventListener('click', (event) => window.dayframeToggleEssentialsCustomise?.(event));
    }
    const pills = hero.querySelector('.driving-hub-pills') || (() => {
      const created = document.createElement('div');
      created.className = 'driving-hub-pills';
      hero.appendChild(created);
      return created;
    })();
    if (!pills.contains(button)) pills.appendChild(button);
    return button;
  }

  function updateHeroCopy(prefs) {
    const hostPage = page();
    if (!hostPage) return;
    const eyebrow = hostPage.querySelector('.driving-hub-eyebrow');
    const title = hostPage.querySelector('.driving-hub-title');
    const sub = hostPage.querySelector('.driving-hub-sub');
    if (eyebrow && eyebrow.textContent.trim() !== 'Your essentials') eyebrow.innerHTML = '<i></i>Your essentials';
    if (title && title.textContent !== 'Essentials for real life.') title.textContent = 'Essentials for real life.';
    if (sub && sub.textContent !== 'Keep your car, MyFlo, documents, health and Bible together without the extra clutter.') {
      sub.textContent = 'Keep your car, MyFlo, documents, health and Bible together without the extra clutter.';
    }
    const labels = visibleLabels(prefs).slice(0, 5);
    const pills = hostPage.querySelector('.driving-hub-pills');
    if (pills) {
      const button = ensureCustomiseButton();
      const existing = [...pills.querySelectorAll('.driving-hub-pill:not(#df-essentials-customise-button)')];
      const current = existing.map((pill) => (pill.textContent || '').trim());
      if (current.join('|') !== labels.join('|')) {
        existing.forEach((pill) => pill.remove());
        labels.forEach((label) => {
          const pill = document.createElement('span');
          pill.className = 'driving-hub-pill';
          pill.innerHTML = '<b></b>' + esc(label);
          pills.insertBefore(pill, button || null);
        });
      } else if (button && pills.lastElementChild !== button) {
        pills.appendChild(button);
      }
    }
  }

  function isCustomising() {
    return Boolean(page()?.classList.contains('df-essentials-customising'));
  }

  function choiceHTML(key, prefs) {
    const detail = DETAILS[key];
    if (!detail) return '';
    const visible = !widgetHidden(prefs, key);
    return `<article class="df-widget-choice ${visible ? 'is-on' : 'is-off'}" data-widget-choice="${esc(key)}"><div class="df-widget-choice-icon">${esc(detail.icon)}</div><div><strong>${esc(detail.label)}</strong><span>${esc(detail.desc)}</span></div><button type="button" class="df-widget-switch ${visible ? 'is-on' : ''}" aria-label="${visible ? 'Hide' : 'Show'} ${esc(detail.label)}" aria-pressed="${visible ? 'true' : 'false'}" onclick="dayframeToggleEssentialsWidget('${esc(key)}', event)"><span></span></button></article>`;
  }

  function renderPanel(open) {
    const hero = page()?.querySelector('.driving-hub-hero');
    if (!hero) return null;
    let panel = document.getElementById('df-essentials-widget-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'df-essentials-widget-panel';
      hero.insertAdjacentElement('afterend', panel);
    }
    panel.className = 'df-essentials-widget-panel df-widget-picker';
    const prefs = currentPrefs();
    const html = `<div class="df-widget-panel-head"><div><span>Essentials</span><h2>Show in Essentials</h2></div><button type="button" onclick="dayframeCloseEssentialsCustomise(event)">Done</button></div><div class="df-widget-choice-list">${prefs.order.map((key) => choiceHTML(key, prefs)).join('')}</div>`;
    if (panel.innerHTML !== html) panel.innerHTML = html;
    if (panel.hidden !== !open) panel.hidden = !open;
    return panel;
  }

  function setCustomising(active) {
    const hostPage = page();
    if (!hostPage) return;
    hostPage.classList.toggle('df-essentials-customising', Boolean(active));
    const value = active ? 'true' : 'false';
    if (hostPage.getAttribute('data-essentials-customising') !== value) hostPage.setAttribute('data-essentials-customising', value);
    renderPanel(Boolean(active));
    syncCards();
  }

  function updateCardOrderAndNumbers(prefs) {
    const host = grid();
    if (!host) return;
    const visibleCards = [];
    prefs.order.forEach((key) => {
      const card = cardFor(key);
      if (!card) return;
      const visible = !widgetHidden(prefs, key);
      setVisible(card, visible);
      if (card.dataset.essentialsWidgetKey !== key) card.dataset.essentialsWidgetKey = key;
      const dragging = isCustomising() && visible;
      if (card.draggable !== dragging) card.draggable = dragging;
      card.classList.toggle('df-widget-can-drag', dragging);
      if (visible) visibleCards.push(card);
    });
    let previous = null;
    visibleCards.forEach((card) => {
      if (card.parentElement !== host) {
        host.appendChild(card);
      }
      if (!previous) {
        if (host.firstElementChild !== card) host.insertBefore(card, host.firstElementChild);
      } else if (previous.nextElementSibling !== card) {
        previous.insertAdjacentElement('afterend', card);
      }
      previous = card;
    });
    visibleCards.forEach((card, index) => {
      const number = card.querySelector('.driving-card-number');
      const value = String(index + 1).padStart(2, '0');
      if (number && number.textContent !== value) number.textContent = value;
    });
    const empty = document.getElementById('df-essentials-empty');
    if (empty && empty.hidden !== visibleCards.length > 0) empty.hidden = visibleCards.length > 0;
  }

  function syncCards() {
    const prefs = cleanSavedPrefs();
    ensureStyle();
    ensureBibleCard();
    const bibleNav = ensureBibleSideNav();
    setVisible(bibleNav, !widgetHidden(prefs, 'bible'));
    hideStalePieces();
    updateHeroCopy(prefs);
    updateCardOrderAndNumbers(prefs);
    renderPanel(isCustomising());
    applyRouteState();
  }

  function rememberUpstreamOpeners() {
    if (typeof window.dayframeOpenEssentialsTool === 'function' && window.dayframeOpenEssentialsTool !== openWidget) {
      upstreamOpenTool = window.dayframeOpenEssentialsTool;
    }
    if (typeof window.dayframeOpenRealEssentialsTool === 'function' && window.dayframeOpenRealEssentialsTool !== openWidget) {
      upstreamOpenRealTool = window.dayframeOpenRealEssentialsTool;
    }
  }

  function openEssentials() {
    if (typeof window.go === 'function') window.go('driving');
    else {
      document.querySelectorAll('.pg').forEach((item) => item.classList.toggle('on', item.id === 'pg-driving'));
    }
    queue();
  }

  function openBible(event) {
    claim(event);
    if (isCustomising()) return;
    if (typeof window.go === 'function') window.go('bible');
    else document.querySelectorAll('.pg').forEach((item) => item.classList.toggle('on', item.id === 'pg-bible'));
    setTimeout(() => {
      try { window.renderBible?.(); } catch {}
      applyRouteState();
      hideStalePieces();
    }, 40);
  }

  function openWidget(key, event) {
    if (key === 'bible') {
      openBible(event);
      return true;
    }
    if (isCustomising() && event?.target?.closest?.('#pg-driving .driving-home-grid > .driving-home-card')) {
      claim(event);
      return true;
    }
    if (DISALLOWED.has(key)) return false;
    const upstream = upstreamOpenRealTool || upstreamOpenTool;
    if (upstream && (key === 'documents' || key === 'health')) return upstream.call(window, key, event);
    claim(event);
    if (key === 'myflo' && typeof window.dayframeOpenPeriodTracker === 'function') {
      return window.dayframeOpenPeriodTracker(event);
    }
    const destination = DETAILS[key]?.page;
    if (destination && typeof window.go === 'function') {
      window.go(destination);
      return true;
    }
    return false;
  }

  function installGlobals() {
    rememberUpstreamOpeners();
    window.dayframeOpenEssentialsTool = openWidget;
    window.dayframeOpenRealEssentialsTool = openWidget;
    window.dayframeToggleEssentialsCustomise = function dayframeToggleEssentialsCustomise(event) {
      claim(event);
      setCustomising(!isCustomising());
    };
    window.dayframeCloseEssentialsCustomise = function dayframeCloseEssentialsCustomise(event) {
      claim(event);
      setCustomising(false);
    };
    window.dayframeToggleEssentialsWidget = function dayframeToggleEssentialsWidget(key, event) {
      claim(event);
      if (!ORDER.includes(key)) return;
      const prefs = currentPrefs();
      const hidden = new Set(prefs.hidden);
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      savePrefs({ order: prefs.order, hidden: [...hidden] });
      setCustomising(true);
    };
    window.dayframeSetEssentialsWidget = function dayframeSetEssentialsWidget(key, visible) {
      if (!ORDER.includes(key)) return;
      const prefs = currentPrefs();
      const hidden = new Set(prefs.hidden);
      if (visible) hidden.delete(key);
      else hidden.add(key);
      savePrefs({ order: prefs.order, hidden: [...hidden] });
      syncCards();
    };
    window.dayframeMoveEssentialsWidget = function dayframeMoveEssentialsWidget(key, direction, event) {
      claim(event);
      if (!ORDER.includes(key)) return;
      const prefs = currentPrefs();
      const from = prefs.order.indexOf(key);
      const to = Math.max(0, Math.min(prefs.order.length - 1, from + (Number(direction) || 0)));
      if (from < 0 || from === to) return;
      const order = [...prefs.order];
      const [item] = order.splice(from, 1);
      order.splice(to, 0, item);
      savePrefs({ order, hidden: prefs.hidden }, 'Essentials order updated');
      setCustomising(true);
    };
  }

  function installClickHandlers() {
    if (clickInstalled) return;
    clickInstalled = true;
    document.addEventListener('click', (event) => {
      const bibleTarget = event.target.closest?.('#df-bible-card,[data-essentials-open-page="bible"],.driving-side-nav [data-driving-page="bible"]');
      if (bibleTarget) {
        openBible(event);
        return;
      }
      const blockedTarget = event.target.closest?.('#df-home-card,#df-work-study-card,[data-driving-page="driving-home-admin"],[data-driving-page="driving-work-study"]');
      if (blockedTarget) claim(event);
    }, true);
  }

  function reorderCards(sourceKey, targetKey, after) {
    if (!ORDER.includes(sourceKey) || !ORDER.includes(targetKey) || sourceKey === targetKey) return;
    const prefs = currentPrefs();
    const order = prefs.order.filter((key) => key !== sourceKey);
    const index = order.indexOf(targetKey);
    if (index < 0) return;
    order.splice(index + (after ? 1 : 0), 0, sourceKey);
    savePrefs({ order, hidden: prefs.hidden }, 'Essentials order updated');
    setCustomising(true);
  }

  function installDragHandlers() {
    if (dragInstalled) return;
    dragInstalled = true;
    document.addEventListener('dragstart', (event) => {
      if (!isCustomising()) return;
      const card = event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card');
      const key = keyFromCard(card);
      if (!ORDER.includes(key) || currentPrefs().hidden.includes(key)) return;
      dragKey = key;
      card.classList.add('df-widget-dragging');
      card.setAttribute('aria-grabbed', 'true');
      event.dataTransfer?.setData('text/plain', key);
    }, true);
    document.addEventListener('dragover', (event) => {
      if (!dragKey || !isCustomising()) return;
      const card = event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card');
      const key = keyFromCard(card);
      if (!ORDER.includes(key) || key === dragKey) return;
      event.preventDefault();
      card.classList.add('df-widget-drop-target');
    }, true);
    document.addEventListener('drop', (event) => {
      if (!dragKey || !isCustomising()) return;
      const card = event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card');
      const targetKey = keyFromCard(card);
      if (!ORDER.includes(targetKey)) return;
      claim(event);
      const rect = card.getBoundingClientRect();
      reorderCards(dragKey, targetKey, event.clientX > rect.left + rect.width / 2);
      dragKey = '';
      document.querySelectorAll('.df-widget-dragging,.df-widget-drop-target').forEach((item) => item.classList.remove('df-widget-dragging', 'df-widget-drop-target'));
    }, true);
    document.addEventListener('dragend', () => {
      dragKey = '';
      document.querySelectorAll('.df-widget-dragging,.df-widget-drop-target').forEach((item) => item.classList.remove('df-widget-dragging', 'df-widget-drop-target'));
    }, true);
  }

  function activePageId() {
    return document.querySelector('.pg.on')?.id || '';
  }

  function applyRouteState() {
    const active = activePageId();
    const onBible = active === 'pg-bible';
    hideStalePieces();
    if (onBible) {
      document.querySelectorAll('.df-nav-btn[data-main-page]').forEach((button) => {
        button.classList.toggle('on', button.dataset.mainPage === 'driving');
      });
      document.querySelectorAll('.df-mobile-nav button[data-mobile-page]').forEach((button) => {
        button.classList.toggle('on', button.dataset.mobilePage === 'more');
      });
    }
    document.querySelectorAll('.driving-side-nav button').forEach((button) => {
      const key = button.dataset.drivingPage;
      button.classList.toggle('on', onBible ? key === 'bible' : key === active.replace(/^pg-/, ''));
    });
  }

  function patchGo() {
    const original = typeof window.go === 'function' ? window.go : null;
    if (!original || original.__dayframeEssentialsBible === VERSION) return;
    const patched = function dayframeEssentialsBibleGo(name, btn) {
      if (name === 'driving-home-admin' || name === 'driving-work-study') name = 'driving';
      const result = original.call(this, name, btn);
      setTimeout(queue, 0);
      setTimeout(queue, 120);
      return result;
    };
    patched.__dayframeEssentialsBible = VERSION;
    patched.__dayframeStableGoVersion = original.__dayframeStableGoVersion || '';
    window.go = patched;
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }

  function startObserver() {
    if (observerStarted || typeof MutationObserver !== 'function' || !document.documentElement) return;
    observerStarted = true;
    new MutationObserver(() => queue()).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function apply() {
    if (!document.documentElement || document.documentElement.getAttribute(FLAG) === VERSION + ':applying') return;
    document.documentElement.setAttribute(FLAG, VERSION + ':applying');
    try {
      ensureStyle();
      rememberUpstreamOpeners();
      installGlobals();
      installClickHandlers();
      installDragHandlers();
      patchGo();
      syncCards();
      startObserver();
      document.documentElement.setAttribute(FLAG, VERSION);
    } catch (error) {
      document.documentElement.setAttribute(FLAG, VERSION + ':error');
      console.warn('[Dayframe] Essentials Bible patch failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  [80, 200, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(apply, delay));
})();
