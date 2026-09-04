(() => {
  'use strict';

  const VERSION = 'clickfix-v13';
  const FLAG = 'data-dayframe-essentials-clickfix';
  const STYLE_ID = 'df-essentials-clickfix-style';
  const HIDDEN_STYLE = '#pg-driving .driving-home-card.df-widget-hidden,#pg-driving .driving-home-grid>.df-widget-hidden,.driving-side-nav .df-widget-hidden{display:none!important}.df-tool-form select{width:100%;border:1px solid #e5e9f2;border-radius:13px;background:#f8f9fc;color:#172033;font:750 12px var(--ff);padding:11px;outline:none;cursor:pointer}.df-tool-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}.df-tool-type{display:inline-flex;align-items:center;border-radius:999px;background:#f4f1ff;color:#6e5ff0;font-size:10px;font-weight:900;padding:6px 9px}.df-tool-reference{display:inline-flex;align-items:center;max-width:100%;border-radius:999px;background:#effefa;color:#168a76;font-size:10px;font-weight:900;padding:6px 9px;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.df-tool-empty{line-height:1.5}.df-tool-empty strong{display:block;color:#172033;font-size:14px;margin-bottom:4px}';
  const WIDGET_LABELS = {
    car: 'My Car',
    myflo: 'MyFlo',
    documents: 'Documents',
    health: 'Health',
    home: 'Home & Rent',
    'work-study': 'Work & Study',
  };
  const DEFAULT_WIDGET_ORDER = ['car', 'myflo', 'documents', 'health', 'home', 'work-study'];
  const REAL_TOOLS = {
    documents: { page: 'driving-documents', label: 'Documents', desc: 'IDs, expiry dates and where each document is kept.', tags: ['ID', 'Passport', 'Licence', 'Renewals'], types: ['ID', 'Passport', 'Licence', 'Renewal', 'Insurance', 'Other'], empty: 'No documents saved', emptyHint: 'Save a passport expiry, licence renewal or the place you keep an important document.', list: 'Saved documents', formTitle: 'Add a document', itemLabel: 'Document name', dateLabel: 'Expiry or renewal date', placeholder: 'Passport, provisional licence, railcard or insurance document.', referenceLabel: 'Saved at / link', referencePlaceholder: 'iCloud folder, Drive link, photo album or where you keep it.', save: 'Save document', saved: 'Document saved', deleted: 'Document deleted', store: 'documents' },
    health: { page: 'driving-health', label: 'Health', desc: 'Dentist, GP, prescriptions and checkups.', tags: ['Dentist', 'GP', 'Optician', 'Medication'], types: ['Dentist', 'GP', 'Optician', 'Medication', 'Checkup', 'Other'], empty: 'No health reminders saved', emptyHint: 'Add the next appointment, prescription refill or checkup date.', list: 'Health reminders', formTitle: 'Add a health reminder', itemLabel: 'What is it?', dateLabel: 'Date', placeholder: 'Dentist appointment, GP call, prescription refill or eye test.', save: 'Save reminder', saved: 'Reminder saved', deleted: 'Reminder deleted', store: 'health' },
    home: { page: 'driving-home-admin', label: 'Home & Rent', desc: 'Rent dates, tenancy notes and moving tasks.', tags: ['Rent date', 'Tenancy', 'Deposit', 'Moving'], types: ['Rent date', 'Tenancy', 'Deposit', 'Moving', 'Utility', 'Other'], empty: 'No home or rent reminders saved', emptyHint: 'Keep rent dates, tenancy renewals, deposit notes or moving tasks here.', list: 'Home and rent', formTitle: 'Add a home reminder', itemLabel: 'What needs tracking?', dateLabel: 'Date', placeholder: 'Rent review, tenancy end, deposit note or moving task.', save: 'Save reminder', saved: 'Home reminder saved', deleted: 'Home reminder deleted', store: 'home' },
    'work-study': { page: 'driving-work-study', label: 'Work & Study', desc: 'Shifts, applications, courses and deadlines.', tags: ['Shifts', 'Courses', 'Applications', 'Certificates'], types: ['Shift', 'Course', 'Application', 'Interview', 'Certificate', 'Deadline', 'Other'], empty: 'No work or study dates saved', emptyHint: 'Add a shift, interview, deadline, course date or certificate renewal.', list: 'Work and study dates', formTitle: 'Add a work or study date', itemLabel: 'What is it?', dateLabel: 'Date', placeholder: 'Shift, course date, application, interview or certificate.', save: 'Save date', saved: 'Date saved', deleted: 'Date deleted', store: 'workStudy' },
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function ensureHiddenStyle() {
    const style = document.getElementById(STYLE_ID) || document.createElement('style');
    style.id = STYLE_ID;
    if (style.textContent !== HIDDEN_STYLE) style.textContent = HIDDEN_STYLE;
    if (!style.parentElement) document.head.appendChild(style);
  }

  function keepCustomiseButton(heroPills) {
    if (!heroPills) return;
    let button = document.getElementById('df-essentials-customise-button');
    if (!button && typeof window.dayframeToggleEssentialsCustomise === 'function') {
      button = document.createElement('button');
      button.id = 'df-essentials-customise-button';
      button.className = 'df-essentials-customise-btn';
      button.type = 'button';
      button.textContent = 'Customise';
      button.addEventListener('click', (event) => window.dayframeToggleEssentialsCustomise?.(event));
    }
    if (button && button.parentElement !== heroPills) heroPills.appendChild(button);
  }

  function normalisePrefs(raw = {}) {
    const valid = new Set(DEFAULT_WIDGET_ORDER);
    const seen = new Set();
    const order = [];
    (Array.isArray(raw.order) ? raw.order : DEFAULT_WIDGET_ORDER).forEach((key) => {
      if (valid.has(key) && !seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    });
    DEFAULT_WIDGET_ORDER.forEach((key) => {
      if (!seen.has(key)) order.push(key);
    });
    const hidden = [...new Set(Array.isArray(raw.hidden) ? raw.hidden : [])].filter((key) => valid.has(key));
    return { order, hidden };
  }

  function visibleWidgetLabels() {
    const data = typeof window.hubLoad === 'function' ? (window.hubLoad() || {}) : {};
    const prefs = normalisePrefs(data?.essentials?.widgetPrefs || {});
    return prefs.order.filter((key) => !prefs.hidden.includes(key)).map((key) => WIDGET_LABELS[key]).filter(Boolean);
  }

  function listLabels(labels, max) {
    if (!labels.length) return 'Choose what Essentials shows';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    if (labels.length <= max) return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
    return `${labels.slice(0, max).join(', ')} and ${labels.length - max} more`;
  }

  function homeDescText() {
    return `${listLabels(visibleWidgetLabels(), 3)}.`;
  }

  function mobileDescText() {
    return listLabels(visibleWidgetLabels(), 2);
  }

  const realData = () => (typeof window.hubLoad === 'function' ? (window.hubLoad() || {}) : {});
  const realSave = (next) => { if (typeof window.hubSave === 'function') window.hubSave(next); };
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const safeId = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || `item-${Date.now()}`;
  const typeValue = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'other';
  const inputId = (key, name) => `df-${key}-${name}`;

  function realTool(key) {
    return REAL_TOOLS[key] ? { key, ...REAL_TOOLS[key] } : null;
  }

  function typeOptions(tool) {
    return (Array.isArray(tool.types) && tool.types.length ? tool.types : tool.tags).map((label) => ({ value: typeValue(label), label }));
  }

  function normalizeType(tool, value) {
    const incoming = typeValue(value);
    const matched = typeOptions(tool).find((option) => option.value === incoming || typeValue(option.label) === incoming);
    return matched?.value || typeOptions(tool)[0]?.value || 'other';
  }

  function typeLabel(tool, value) {
    const normal = normalizeType(tool, value);
    return typeOptions(tool).find((option) => option.value === normal)?.label || tool.tags?.[0] || 'Item';
  }

  function optionHTML(tool, selectedValue = '') {
    const selected = normalizeType(tool, selectedValue);
    return typeOptions(tool).map((option) => `<option value="${esc(option.value)}" ${option.value === selected ? 'selected' : ''}>${esc(option.label)}</option>`).join('');
  }

  function prettyDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'No date';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? 'No date' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function referenceHTML(value) {
    const text = String(value || '').trim().slice(0, 240);
    if (!text) return '';
    let link = '';
    try {
      const url = new URL(text);
      if (['http:', 'https:'].includes(url.protocol)) link = url.href;
    } catch {}
    if (link) return `<a class="df-tool-reference" href="${esc(link)}" target="_blank" rel="noreferrer">Open link</a>`;
    return `<span class="df-tool-reference">${esc(text)}</span>`;
  }

  function realItems(tool) {
    const raw = realData()?.essentials?.[tool.store];
    const source = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
    return source.map((item) => ({
      id: safeId(item?.id),
      title: String(item?.title || '').trim().slice(0, 120),
      type: normalizeType(tool, item?.type || item?.category || item?.tag || tool.tags?.[0]),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(item?.date || '')) ? String(item.date) : '',
      reference: String(item?.reference || item?.location || item?.link || '').trim().slice(0, 240),
      notes: String(item?.notes || '').trim().slice(0, 500),
    })).filter((item) => item.title).sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  function saveRealItems(tool, items) {
    const next = realData();
    next.essentials = next.essentials || {};
    const previous = next.essentials[tool.store];
    const base = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
    next.essentials[tool.store] = { ...base, items, updatedAt: new Date().toISOString() };
    realSave(next);
  }

  function realSummary(tool) {
    const items = realItems(tool);
    if (!items.length) return tool.empty;
    const upcoming = items.find((item) => item.date && item.date >= todayISO());
    if (upcoming) return `${typeLabel(tool, upcoming.type)}: ${prettyDate(upcoming.date)}`;
    return items.length === 1 ? '1 saved' : `${items.length} saved`;
  }

  function realPageHTML(tool) {
    const referenceField = tool.referenceLabel ? `<label>${esc(tool.referenceLabel)}<input id="${esc(inputId(tool.key, 'reference'))}" type="text" maxlength="240" placeholder="${esc(tool.referencePlaceholder || '')}"></label>` : '';
    return `<section class="pg df-essentials-tool-page" id="pg-${esc(tool.page)}"><button class="life-back" type="button" onclick="go('driving')">&lt; Essentials</button><section class="df-tool-hero"><div class="df-tool-kicker">Essentials</div><h1>${esc(tool.label)}</h1><p>${esc(tool.desc)}</p></section><div class="df-tool-layout"><section class="df-tool-panel"><h2>${esc(tool.formTitle)}</h2><form class="df-tool-form" onsubmit="dayframeSaveEssentialsItem('${esc(tool.key)}', event)"><input id="${esc(inputId(tool.key, 'id'))}" type="hidden"><label>Type<select id="${esc(inputId(tool.key, 'type'))}">${optionHTML(tool)}</select></label><label>${esc(tool.itemLabel)}<input id="${esc(inputId(tool.key, 'title'))}" type="text" maxlength="120" placeholder="${esc(tool.placeholder)}"></label><label>${esc(tool.dateLabel)}<input id="${esc(inputId(tool.key, 'date'))}" type="date"></label>${referenceField}<label>Notes<textarea id="${esc(inputId(tool.key, 'notes'))}" maxlength="500" placeholder="Anything useful to remember."></textarea></label><div class="df-tool-actions"><button type="button" onclick="dayframeClearEssentialsForm('${esc(tool.key)}')">Clear</button><button class="primary" type="submit">${esc(tool.save)}</button></div></form></section><section class="df-tool-panel"><div class="df-tool-list-head"><h2>${esc(tool.list)}</h2><span class="df-tool-count" id="df-${esc(tool.key)}-count"></span></div><div class="df-tool-list" id="df-${esc(tool.key)}-list"></div></section></div></section>`;
  }

  function renderRealTool(tool) {
    const items = realItems(tool);
    const summary = document.getElementById(`df-${tool.key}-summary`);
    const list = document.getElementById(`df-${tool.key}-list`);
    const count = document.getElementById(`df-${tool.key}-count`);
    const summaryText = realSummary(tool);
    const countText = items.length === 1 ? '1 item' : `${items.length} items`;
    if (summary && summary.textContent !== summaryText) summary.textContent = summaryText;
    if (count && count.textContent !== countText) count.textContent = countText;
    if (!list) return;
    let html = '';
    if (!items.length) {
      html = `<div class="df-tool-empty"><strong>${esc(tool.empty)}</strong>${esc(tool.emptyHint)}</div>`;
    } else {
      html = items.map((item) => {
        const details = [item.date ? prettyDate(item.date) : 'No date', item.notes].filter(Boolean).join(' - ');
        return `<article class="df-tool-item"><div><strong>${esc(item.title)}</strong><span>${esc(details)}</span><div class="df-tool-meta"><span class="df-tool-type">${esc(typeLabel(tool, item.type))}</span>${referenceHTML(item.reference)}</div></div><div class="df-tool-item-actions"><button type="button" onclick="dayframeEditEssentialsItem('${esc(tool.key)}','${esc(item.id)}')">Edit</button><button type="button" onclick="dayframeDeleteEssentialsItem('${esc(tool.key)}','${esc(item.id)}')">Delete</button></div></article>`;
      }).join('');
    }
    if (list.innerHTML !== html) list.innerHTML = html;
  }

  function ensureRealWidgets() {
    const parent = document.getElementById('pg-driving')?.parentElement || document.querySelector('main') || document.body;
    Object.entries(REAL_TOOLS).forEach(([key, config]) => {
      const tool = { key, ...config };
      const card = document.getElementById(`df-${key}-card`);
      if (card) {
        const desc = card.querySelector('.driving-home-desc');
        const tags = card.querySelector('.driving-card-tags');
        const tagsHTML = tool.tags.map((tag) => `<span class="driving-card-tag">${esc(tag)}</span>`).join('');
        if (desc && desc.textContent !== tool.desc) desc.textContent = tool.desc;
        if (tags && tags.innerHTML !== tagsHTML) tags.innerHTML = tagsHTML;
      }
      const existing = document.getElementById(`pg-${tool.page}`);
      if (!existing) {
        parent.insertAdjacentHTML('beforeend', realPageHTML(tool));
      } else if (!document.getElementById(inputId(key, 'type'))) {
        existing.insertAdjacentHTML('afterend', realPageHTML(tool));
        existing.remove();
      }
      renderRealTool(tool);
    });
  }

  function clearRealForm(tool) {
    ['id', 'title', 'date', 'reference', 'notes'].forEach((name) => {
      const input = document.getElementById(inputId(tool.key, name));
      if (input) input.value = '';
    });
    const type = document.getElementById(inputId(tool.key, 'type'));
    if (type) type.value = normalizeType(tool, tool.tags?.[0]);
  }

  function openRealTool(key, event) {
    const tool = realTool(key);
    if (!tool) return false;
    claim(event);
    ensureRealWidgets();
    forcePage(tool.page);
    renderRealTool(tool);
    return true;
  }

  function installRealWidgetHandlers() {
    window.dayframeOpenRealEssentialsTool = openRealTool;
    window.dayframeOpenEssentialsTool = openRealTool;
    window.dayframeClearEssentialsForm = function dayframeClearEssentialsForm(key) {
      const tool = realTool(key);
      if (tool) clearRealForm(tool);
    };
    window.dayframeEditEssentialsItem = function dayframeEditEssentialsItem(key, id) {
      const tool = realTool(key);
      const item = tool ? realItems(tool).find((entry) => entry.id === id) : null;
      if (!tool || !item) return;
      document.getElementById(inputId(key, 'id')).value = item.id;
      document.getElementById(inputId(key, 'type')).value = normalizeType(tool, item.type);
      document.getElementById(inputId(key, 'title')).value = item.title;
      document.getElementById(inputId(key, 'date')).value = item.date;
      const reference = document.getElementById(inputId(key, 'reference'));
      if (reference) reference.value = item.reference || '';
      document.getElementById(inputId(key, 'notes')).value = item.notes;
      document.getElementById(inputId(key, 'title'))?.focus();
    };
    window.dayframeDeleteEssentialsItem = function dayframeDeleteEssentialsItem(key, id) {
      const tool = realTool(key);
      if (!tool) return;
      saveRealItems(tool, realItems(tool).filter((item) => item.id !== id));
      renderRealTool(tool);
      window.hubToast?.(tool.deleted);
    };
    window.dayframeSaveEssentialsItem = function dayframeSaveEssentialsItem(key, event) {
      event?.preventDefault?.();
      const tool = realTool(key);
      if (!tool) return;
      const title = document.getElementById(inputId(key, 'title'))?.value.trim() || '';
      if (!title) return window.hubToast?.('Add a name first');
      const id = safeId(document.getElementById(inputId(key, 'id'))?.value || `item-${Date.now()}`);
      const next = {
        id,
        title,
        type: normalizeType(tool, document.getElementById(inputId(key, 'type'))?.value || tool.tags?.[0]),
        date: document.getElementById(inputId(key, 'date'))?.value || '',
        reference: document.getElementById(inputId(key, 'reference'))?.value || '',
        notes: document.getElementById(inputId(key, 'notes'))?.value || '',
        updatedAt: new Date().toISOString(),
      };
      const items = realItems(tool).filter((item) => item.id !== id);
      items.push(next);
      saveRealItems(tool, items);
      clearRealForm(tool);
      renderRealTool(tool);
      window.renderHome?.();
      fixVisibleHomeLanguage();
      window.hubToast?.(tool.saved);
    };
  }

  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const TOOL_PAGES = {
    documents: 'driving-documents',
    health: 'driving-health',
    home: 'driving-home-admin',
    'work-study': 'driving-work-study',
  };

  const MAIN_PAGES = {
    home: 'home',
    money: 'money',
    planner: 'planner',
    driving: 'driving',
    diary: 'diary',
    bible: 'bible',
    investing: 'dashboard',
    dashboard: 'dashboard',
  };

  const INVESTING_PAGES = new Set(['dashboard', 'holdings', 'signals', 'charts', 'themes-hub', 'education', 'isa-guide', 'intel', 'health', 'alerts', 'chatter']);
  const DRIVING_PAGES = new Set(['driving', 'driving-theory', 'driving-car', 'driving-cycle', 'driving-documents', 'driving-health', 'driving-home-admin', 'driving-work-study']);

  function fixVisibleHomeLanguage() {
    ensureHiddenStyle();
    const reveal = (el) => {
      if (!el) return;
      el.classList.remove('df-life-hidden', 'df-essentials-hidden', 'home-item-hidden');
      el.style.display = '';
      el.setAttribute('aria-hidden', 'false');
    };
    const homeCard = document.querySelector('[data-home-module="driving"]');
    reveal(homeCard);
    const homeTitle = homeCard?.querySelector('.hub-module-title');
    const homeDesc = homeCard?.querySelector('.hub-module-desc');
    if (homeTitle && homeTitle.textContent.trim() !== 'Essentials') homeTitle.textContent = 'Essentials';
    const homeDescValue = homeDescText();
    if (homeDesc && homeDesc.textContent.trim() !== homeDescValue) homeDesc.textContent = homeDescValue;

    const topNav = document.querySelector('.df-nav-btn[data-main-page="driving"]');
    reveal(topNav);
    if (topNav && topNav.textContent.trim() !== 'Essentials') topNav.textContent = 'Essentials';

    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`);
    reveal(mobileMore);
    const mobileTitle = mobileMore?.querySelector('strong');
    const mobileDesc = mobileMore?.querySelector('small');
    if (mobileTitle && mobileTitle.textContent.trim() !== 'Essentials') mobileTitle.textContent = 'Essentials';
    const mobileDescValue = mobileDescText();
    if (mobileDesc && mobileDesc.textContent.trim() !== mobileDescValue) mobileDesc.textContent = mobileDescValue;

    const essentialsPage = document.getElementById('pg-driving');
    const heroTitle = essentialsPage?.querySelector('.driving-hub-title');
    if (heroTitle && heroTitle.textContent.trim() !== 'Essentials') heroTitle.textContent = 'Essentials';

    const carQuestion = essentialsPage?.querySelector('.df-car-question');
    if (carQuestion && carQuestion.textContent.trim() !== 'Still learning?') carQuestion.textContent = 'Still learning?';
    const carButtons = [...(essentialsPage?.querySelectorAll('.df-car-actions button') || [])];
    if (carButtons[0] && carButtons[0].textContent.trim() !== 'Pass your theory') carButtons[0].textContent = 'Pass your theory';
    if (carButtons[1] && carButtons[1].textContent.trim() !== 'Practice questions') carButtons[1].textContent = 'Practice questions';

    const heroPills = essentialsPage?.querySelector('.driving-hub-pills');
    if (heroPills) {
      const labels = visibleWidgetLabels();
      const current = [...heroPills.querySelectorAll('.driving-hub-pill')].map((pill) => pill.textContent.trim());
      const expected = labels.length ? labels.join('|') : 'Choose your essentials';
      if (current.join('|') !== expected) {
        const pillMarkup = labels.length
          ? labels.map((label) => `<span class="driving-hub-pill"><b></b>${esc(label)}</span>`).join('')
          : '<span class="driving-hub-pill"><b></b>Choose your essentials</span>';
        const customButton = document.getElementById('df-essentials-customise-button');
        heroPills.innerHTML = pillMarkup;
        if (customButton) heroPills.appendChild(customButton);
        keepCustomiseButton(heroPills);
      } else {
        keepCustomiseButton(heroPills);
      }
    }

    const floNav = essentialsPage?.querySelector('[data-driving-page="driving-cycle"]');
    if (floNav && floNav.textContent.trim() === 'Flo') {
      const textNode = [...floNav.childNodes].reverse().find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (textNode) textNode.textContent = 'MyFlo';
      else floNav.appendChild(document.createTextNode('MyFlo'));
    }

    const floCard = document.getElementById('df-period-card');
    const floCardTitle = floCard?.querySelector('.driving-home-title');
    const floPanelTitle = document.querySelector('#df-period-panel .df-period-panel-head h2');
    if (floCardTitle && floCardTitle.textContent.trim() === 'Flo') floCardTitle.textContent = 'MyFlo';
    if (floPanelTitle && floPanelTitle.textContent.trim() === 'Flo') floPanelTitle.textContent = 'MyFlo';

    document.querySelectorAll('#pg-home .hub-hero p, .hub-hero p').forEach((copy) => {
      if (/driving admin|money, plans, goals/i.test(copy.textContent || '')) {
        copy.textContent = '';
        copy.style.display = 'none';
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('data-dayframe-essentials-copy-removed', 'true');
      }
    });
  }

  function claim(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
  }

  function openTool(key, event) {
    if (!TOOL_PAGES[key]) return;
    claim(event);
    if (typeof window.dayframeOpenRealEssentialsTool === 'function') {
      window.dayframeOpenRealEssentialsTool(key, event);
      return;
    }
    if (typeof window.dayframeOpenEssentialsTool === 'function') {
      window.dayframeOpenEssentialsTool(key, event);
      return;
    }
    forcePage(TOOL_PAGES[key]);
  }

  function openPage(name, event) {
    claim(event);
    forcePage(name);
  }

  function mainKeyFor(page) {
    if (INVESTING_PAGES.has(page)) return 'investing';
    if (DRIVING_PAGES.has(page)) return 'driving';
    return page;
  }

  function setButtonState(page) {
    fixVisibleHomeLanguage();
    const main = mainKeyFor(page);
    document.querySelectorAll('.df-nav-btn[data-main-page]').forEach((button) => {
      button.classList.toggle('on', button.dataset.mainPage === main);
    });
    document.querySelectorAll('.df-mobile-nav button[data-mobile-page]').forEach((button) => {
      const key = ['home', 'money', 'planner', 'driving'].includes(main) ? main : 'more';
      button.classList.toggle('on', button.dataset.mobilePage === key);
    });
    document.querySelectorAll('.invest-side-nav button').forEach((button) => {
      button.classList.toggle('on', button.dataset.investPage === page);
    });
    document.querySelectorAll('.driving-side-nav button').forEach((button) => {
      button.classList.toggle('on', button.dataset.drivingPage === page);
    });
    document.querySelectorAll('.ni').forEach((button) => {
      const text = (button.textContent || '').toLowerCase();
      const shouldBeOn =
        (main === 'home' && text.includes('home')) ||
        (main === 'money' && text.includes('money')) ||
        (main === 'planner' && text.includes('plan')) ||
        (main === 'driving' && (text.includes('essential') || text.includes('driving'))) ||
        (main === 'diary' && text.includes('diary')) ||
        (main === 'bible' && text.includes('bible')) ||
        (main === 'investing' && text.includes('invest'));
      button.classList.toggle('on', shouldBeOn);
    });
  }

  function forcePage(page) {
    if (page === 'driving-costs') page = 'driving-car';
    if (page === 'driving-cycle') {
      forcePage('driving');
      window.dayframeOpenPeriodTracker?.();
      return true;
    }
    const target = document.getElementById(`pg-${page}`);
    if (!target) return false;
    document.querySelectorAll('.pg.on[id^="pg-"]').forEach((old) => {
      old.classList.remove('on');
      old.style.display = '';
    });
    target.classList.add('on');
    target.style.display = '';

    document.body?.classList.toggle('investing-mode', INVESTING_PAGES.has(page));
    document.body?.classList.toggle('driving-mode', DRIVING_PAGES.has(page));
    setButtonState(page);
    window.dfCloseSheets?.();
    if (window.innerWidth <= 768 && typeof window.closeSB === 'function') window.closeSB();

    try { window.renderLifePage?.(page); } catch {}
    if (page === 'charts') {
      try { window.rCF?.(); } catch {}
      try { if (window.activeTk) window.openChart?.(window.activeTk); } catch {}
    }
    if (page === 'intel' && !window.intelScanned && window.aiKey) {
      window.intelScanned = true;
      setTimeout(() => { try { window.runIntelScan?.(); } catch {} }, 400);
    }
    if (page === 'health') { try { window.rHealth?.(); } catch {} }
    if (page === 'alerts') { try { window.rAlerts?.(); } catch {} }
    if (page === 'signals') {
      try { window.rEarnings?.(); } catch {}
      try { window.rConfCalendar?.(); } catch {}
      const news = document.getElementById('news-out');
      if (news && /Press Refresh|Loading your latest/.test(news.innerHTML || '')) {
        try { window.fetchNews?.(); } catch {}
      }
    }
    if (page === 'chatter') { try { window.initChatterPills?.(); } catch {} }
    if (page === 'education') { try { window.rEducation?.(); } catch {} }
    if (page !== 'education') {
      const bar = document.getElementById('edu-back-bar');
      if (bar) bar.style.display = 'none';
    }
    if (page === 'driving-theory') setTimeout(() => { try { window.syncTheoryFrameSession?.(); } catch {} }, 120);
    fixVisibleHomeLanguage();
    return true;
  }

  function navigateMain(key, event) {
    const page = MAIN_PAGES[key];
    if (!page) return false;
    claim(event);
    forcePage(page);
    setTimeout(() => {
      const active = document.querySelector('.pg.on')?.id || '';
      if (active !== `pg-${page}`) forcePage(page);
      else setButtonState(page);
    }, 0);
    setTimeout(() => {
      const active = document.querySelector('.pg.on')?.id || '';
      if (active !== `pg-${page}`) forcePage(page);
      else setButtonState(page);
    }, 80);
    return true;
  }

  function routeFromMoreButton(button) {
    const raw = button?.getAttribute?.('onclick') || '';
    const match = raw.match(/dfMoreGo\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : '';
  }

  function routeFromGoHandler(element) {
    const raw = element?.getAttribute?.('onclick') || '';
    const match = raw.match(/\bgo\(['"]([^'"]+)['"]/);
    return match ? match[1] : '';
  }

  function openFlo(event) {
    claim(event);
    if (typeof window.dayframeOpenPeriodTracker === 'function') {
      window.dayframeOpenPeriodTracker(event);
    }
  }

  function installStableGo() {
    const stableGo = function dayframeStableGo(name, btn) {
      const page = MAIN_PAGES[name] || name;
      const ok = forcePage(page);
      if (ok && btn?.classList) btn.classList.add('on');
      return undefined;
    };
    stableGo.__dayframeStableGoVersion = VERSION;
    window.go = stableGo;
  }

  function markTargets() {
    fixVisibleHomeLanguage();
    const homeCard = document.querySelector('[data-home-module="driving"]');
    if (homeCard) homeCard.dataset.essentialsOpenPage = 'driving';

    const myCar = document.querySelector('#pg-driving .driving-home-card.car');
    if (myCar) myCar.dataset.essentialsOpenPage = 'driving-car';

    const flo = document.getElementById('df-period-card');
    if (flo) {
      if ('type' in flo) flo.type = 'button';
      flo.dataset.essentialsOpenFlo = 'true';
    }

    Object.entries(TOOL_PAGES).forEach(([key, page]) => {
      const card = document.getElementById(`df-${key}-card`);
      if (card) {
        if ('type' in card) card.type = 'button';
        card.dataset.essentialsToolCard = key;
      }
      const nav = document.querySelector(`.driving-side-nav [data-driving-page="${page}"]`);
      if (nav) nav.dataset.essentialsToolNav = key;
    });
  }

  document.addEventListener('click', (event) => {
    const topNavTarget = event.target.closest?.('.df-nav-btn[data-main-page]');
    if (topNavTarget && navigateMain(topNavTarget.dataset.mainPage, event)) return;

    const mobileNavTarget = event.target.closest?.('.df-mobile-nav button[data-mobile-page]');
    if (mobileNavTarget) {
      const key = mobileNavTarget.dataset.mobilePage;
      if (key && key !== 'more' && navigateMain(key, event)) return;
    }

    const homeModuleTarget = event.target.closest?.('[data-home-module]');
    if (homeModuleTarget && navigateMain(homeModuleTarget.dataset.homeModule, event)) return;

    const moreSheetTarget = event.target.closest?.('#df-more-sheet button');
    const moreRoute = routeFromMoreButton(moreSheetTarget);
    if (moreRoute && navigateMain(moreRoute, event)) return;

    const toolTarget = event.target.closest?.('[data-essentials-tool-card],[data-essentials-tool-nav]');
    if (toolTarget) {
      openTool(toolTarget.dataset.essentialsToolCard || toolTarget.dataset.essentialsToolNav, event);
      return;
    }

    const floTarget = event.target.closest?.('[data-essentials-open-flo="true"],#df-period-card');
    if (floTarget) {
      openFlo(event);
      return;
    }

    const myCarTarget = event.target.closest?.('#pg-driving .driving-home-card.car');
    if (myCarTarget) {
      openPage('driving-car', event);
      return;
    }

    const pageTarget = event.target.closest?.('[data-essentials-open-page]');
    if (pageTarget) {
      openPage(pageTarget.dataset.essentialsOpenPage, event);
      return;
    }

    const goTarget = event.target.closest?.('[onclick*="go("]');
    const goRoute = routeFromGoHandler(goTarget);
    if (goRoute) {
      claim(event);
      forcePage(MAIN_PAGES[goRoute] || goRoute);
    }
  }, true);

  function apply() {
    ensureHiddenStyle();
    installStableGo();
    ensureRealWidgets();
    installRealWidgetHandlers();
    markTargets();
    fixVisibleHomeLanguage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();

  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(apply, delay));
  if (typeof MutationObserver === 'function') {
    new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
