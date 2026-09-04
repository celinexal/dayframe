(() => {
  'use strict';

  const VERSION = 'more-v7';
  const FLAG = 'data-dayframe-essentials-more';
  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const TOOLS = [
    { key: 'documents', page: 'driving-documents', label: 'Documents', icon: 'D', kicker: 'Important', desc: 'IDs, renewals and documents you might need quickly.', tags: ['ID', 'Passport', 'Licence', 'Renewals'], empty: 'No documents saved', list: 'Saved documents', itemLabel: 'Document or card', dateLabel: 'Renewal or expiry date', placeholder: 'Passport, provisional licence, railcard or insurance document.', save: 'Save document', saved: 'Document saved', deleted: 'Document deleted', store: 'documents' },
    { key: 'health', page: 'driving-health', label: 'Health', icon: 'H', kicker: 'Appointments', desc: 'Dentist, GP, prescriptions and checkups.', tags: ['Dentist', 'GP', 'Optician', 'Medication'], empty: 'No health reminders saved', list: 'Health reminders', itemLabel: 'Reminder', dateLabel: 'Date', placeholder: 'Dentist, prescription, GP appointment or optician reminder.', save: 'Save reminder', saved: 'Reminder saved', deleted: 'Reminder deleted', store: 'health', info: { label: 'Key health info', note: 'Handy to have in one place — saved privately to your Dayframe account.', fields: ['NHS number', 'GP surgery', 'Surgery phone', 'Blood type', 'Allergies', 'Repeat prescription', 'Health insurance or cover'] } },
    { key: 'home', page: 'driving-home-admin', label: 'Home & Rent', icon: 'H', kicker: 'Home', desc: 'Track rent dates, tenancy notes and moving tasks.', tags: ['Rent date', 'Tenancy', 'Deposit', 'Moving'], empty: 'No home or rent reminders saved', list: 'Home and rent reminders', itemLabel: 'Home or rent item', dateLabel: 'Date', placeholder: 'Rent review, tenancy end, deposit note or moving task.', save: 'Save note', saved: 'Home note saved', deleted: 'Home note deleted', store: 'home' },
    { key: 'work-study', page: 'driving-work-study', label: 'Work & Study', icon: 'W', kicker: 'Dates', desc: 'Keep shifts, applications, certificates and deadlines visible.', tags: ['Shifts', 'Courses', 'Applications', 'Certificates'], empty: 'No work or study dates saved', list: 'Work and study dates', itemLabel: 'Work or study item', dateLabel: 'Date', placeholder: 'Shift, course date, application, interview or certificate.', save: 'Save date', saved: 'Date saved', deleted: 'Date deleted', store: 'workStudy' },
  ];

  const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.key, tool]));
  const WIDGETS = [
    { key: 'car', label: 'My Car', desc: 'Vehicle details, MOT, tax, insurance and theory support.', navPage: 'driving-car', cardSelector: '#pg-driving .driving-home-card.car' },
    { key: 'myflo', label: 'MyFlo', desc: 'Period dates, calendar estimates and reminders.', navPage: 'driving-cycle', cardSelector: '#df-period-card' },
    ...TOOLS.map((tool) => ({ key: tool.key, label: tool.label, desc: tool.desc, navPage: tool.page, cardSelector: `#df-${tool.key}-card` })),
  ];
  const WIDGET_MAP = new Map(WIDGETS.map((widget) => [widget.key, widget]));
  const DEFAULT_ORDER = WIDGETS.map((widget) => widget.key);
  let queued = false;
  let observing = false;
  let clickHandlerInstalled = false;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const data = () => (typeof window.hubLoad === 'function' ? (window.hubLoad() || {}) : {});
  const save = (next) => { if (typeof window.hubSave === 'function') window.hubSave(next); };
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const safeId = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || `item-${Date.now()}`;

  function prefs(source = data()) {
    const raw = source?.essentials?.widgetPrefs || {};
    const valid = new Set(DEFAULT_ORDER);
    const seen = new Set();
    const order = [];
    (Array.isArray(raw.order) ? raw.order : DEFAULT_ORDER).forEach((key) => {
      if (valid.has(key) && !seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    });
    DEFAULT_ORDER.forEach((key) => { if (!seen.has(key)) order.push(key); });
    const hidden = [...new Set(Array.isArray(raw.hidden) ? raw.hidden : [])].filter((key) => valid.has(key));
    return { order, hidden };
  }

  function savePrefs(nextPrefs) {
    const next = data();
    next.essentials = next.essentials || {};
    next.essentials.widgetPrefs = prefs({ essentials: { widgetPrefs: nextPrefs } });
    save(next);
    return next.essentials.widgetPrefs;
  }

  function visibleLabels(current = prefs()) {
    return current.order.filter((key) => !current.hidden.includes(key)).map((key) => WIDGET_MAP.get(key)?.label).filter(Boolean);
  }

  function labelList(labels, max) {
    if (!labels.length) return 'Choose what Essentials shows';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    if (labels.length <= max) return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
    return `${labels.slice(0, max).join(', ')} and ${labels.length - max} more`;
  }

  const homeSummary = () => `${labelList(visibleLabels(), 3)}.`;
  const mobileSummary = () => labelList(visibleLabels(), 2);
  const cardFor = (key) => document.querySelector(WIDGET_MAP.get(key)?.cardSelector || '');
  const navFor = (key) => {
    const page = WIDGET_MAP.get(key)?.navPage;
    return page ? document.querySelector(`.driving-side-nav [data-driving-page="${page}"]`) : null;
  };

  function setVisible(element, visible) {
    if (!element) return;
    element.classList.toggle('df-widget-hidden', !visible);
    element.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (visible) element.removeAttribute('tabindex');
    else element.setAttribute('tabindex', '-1');
  }

  function prettyDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'No date';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? 'No date' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function toolItems(tool) {
    const raw = data()?.essentials?.[tool.store];
    const source = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
    return source.map((item) => ({
      id: safeId(item?.id),
      title: String(item?.title || '').trim().slice(0, 120),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(item?.date || '')) ? String(item.date) : '',
      notes: String(item?.notes || '').trim().slice(0, 500),
    })).filter((item) => item.title).sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  function saveItems(tool, items) {
    const next = data();
    next.essentials = next.essentials || {};
    const previous = next.essentials[tool.store];
    const base = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
    next.essentials[tool.store] = { ...base, items, updatedAt: new Date().toISOString() };
    save(next);
  }

  function summaryFor(tool) {
    const items = toolItems(tool);
    if (!items.length) return tool.empty;
    const upcoming = items.find((item) => item.date && item.date >= todayISO());
    if (upcoming) return `${upcoming.title}: ${prettyDate(upcoming.date)}`;
    return items.length === 1 ? '1 saved' : `${items.length} saved`;
  }

  const inputId = (tool, name) => `df-${tool.key}-${name}`;
  const infoInputId = (tool, field) => `df-${tool.key}-info-${safeId(field)}`;
  function toolInfoValues(tool) {
    const raw = data()?.essentials?.[tool.store];
    const info = raw && typeof raw === 'object' && !Array.isArray(raw) && raw.info && typeof raw.info === 'object' ? raw.info : {};
    return info;
  }
  function infoPanelHTML(tool) {
    if (!tool.info || !Array.isArray(tool.info.fields) || !tool.info.fields.length) return '';
    const note = tool.info.note ? `<p class="df-tool-info-note">${esc(tool.info.note)}</p>` : '';
    return `<section class="df-tool-panel df-tool-info"><h2>${esc(tool.info.label || 'Key info')}</h2>${note}<form class="df-tool-form" autocomplete="off" onsubmit="dayframeSaveEssentialsInfo('${esc(tool.key)}', event)">${tool.info.fields.map((field) => `<label>${esc(field)}<input id="${esc(infoInputId(tool, field))}" type="text" autocomplete="off" maxlength="120"></label>`).join('')}<div class="df-tool-actions"><button class="primary" type="submit">Save key info</button></div></form></section>`;
  }

  function ensureStyle() {
    if ($('df-essentials-more-style')) return;
    const style = document.createElement('style');
    style.id = 'df-essentials-more-style';
    style.textContent = `
      #pg-driving{max-width:1500px!important}
      #pg-driving .driving-hub-hero{position:relative!important;min-height:0!important;margin-bottom:18px!important;padding:30px 34px!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:20px!important;align-items:end!important;border:1px solid #eadff5!important;border-radius:22px!important;background:linear-gradient(135deg,#fff 0%,#fff3fb 45%,#effefa 100%)!important;box-shadow:0 18px 48px rgba(39,49,75,.08)!important;overflow:hidden!important}
      #pg-driving .driving-hub-hero:before,#pg-driving .driving-home-card:before,.df-tool-hero:before{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#7564f2,#ef6aa9,#42c7ae,#5a9bff)}
      #pg-driving .driving-hub-title{margin:0!important;font-size:clamp(36px,4.8vw,58px)!important;line-height:.96!important;color:#151d33!important;letter-spacing:0!important}
      #pg-driving .driving-hub-sub{display:block!important;margin-top:12px!important;color:#667288!important;font-size:13px!important;line-height:1.55!important}
      #pg-driving .driving-hub-pills{display:flex!important;justify-content:flex-end!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important}
      #pg-driving .driving-hub-pill,#pg-driving .df-essentials-customise-btn{height:34px!important;display:inline-flex!important;align-items:center!important;padding:0 13px!important;border-radius:999px!important;font-size:10px!important;font-weight:900!important}
      #pg-driving .driving-hub-pill{border:1px solid rgba(117,100,242,.14)!important;background:rgba(255,255,255,.76)!important;color:#4f5b70!important;box-shadow:0 8px 22px rgba(39,49,75,.06)!important}
      #pg-driving .df-essentials-customise-btn{border:0!important;background:linear-gradient(135deg,#7564f2,#ef6aa9)!important;color:#fff!important;cursor:pointer!important;box-shadow:0 12px 24px rgba(117,100,242,.18)!important}
      #pg-driving .driving-home-grid{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:16px!important;align-items:stretch!important}
      #pg-driving .driving-home-card{position:relative!important;min-height:210px!important;display:flex!important;flex-direction:column!important;gap:14px!important;text-align:left!important;border:1px solid #e7ebf4!important;border-radius:20px!important;background:#fff!important;box-shadow:0 16px 42px rgba(39,49,75,.07)!important;overflow:hidden!important}
      #pg-driving .df-car-card{grid-column:span 5!important;background:linear-gradient(135deg,#fff,#fff4fb 58%,#f0fffb)!important}
      #pg-driving #df-period-card{grid-column:span 3!important;background:linear-gradient(145deg,#fff,#fff2f8 54%,#f8f4ff)!important}
      #pg-driving #df-documents-card,#pg-driving #df-health-card,#pg-driving #df-home-card,#pg-driving #df-work-study-card{grid-column:span 4!important}
      #pg-driving #df-period-card:before{background:linear-gradient(90deg,#ef6aa9,#42c7ae)!important}#pg-driving #df-documents-card:before{background:linear-gradient(90deg,#7564f2,#5a9bff)!important}#pg-driving #df-health-card:before{background:linear-gradient(90deg,#42c7ae,#80d6a0)!important}#pg-driving #df-home-card:before{background:linear-gradient(90deg,#f4b747,#ef6aa9)!important}
      #pg-driving .driving-card-top{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important}
      #pg-driving .driving-home-icon{width:46px!important;height:46px!important;border-radius:15px!important;display:grid!important;place-items:center!important;background:#f4f1ff!important;color:#7564f2!important;font-weight:900!important;font-size:13px!important}
      #pg-driving .driving-card-number{min-width:32px!important;height:24px!important;display:inline-grid!important;place-items:center!important;border-radius:999px!important;background:rgba(255,255,255,.74)!important;border:1px solid rgba(218,224,236,.9)!important;color:#8a94a4!important;font-size:10px!important;font-weight:900!important}
      #pg-driving .driving-home-kicker{margin-bottom:7px!important;color:#8a94a4!important;font-size:10px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:0!important}
      #pg-driving .driving-home-title{font-size:clamp(22px,2vw,30px)!important;line-height:1!important;color:#151d33!important;letter-spacing:0!important}
      #pg-driving .driving-home-desc{margin-top:8px!important;color:#667288!important;font-size:13px!important;line-height:1.48!important}
      #pg-driving .driving-card-tags{display:flex!important;gap:7px!important;flex-wrap:wrap!important;margin-top:auto!important}.driving-card-tag,.df-tool-summary,#pg-driving .df-period-card-summary{display:inline-flex!important;align-items:center!important;border:1px solid #e8ecf4!important;border-radius:999px!important;background:rgba(255,255,255,.76)!important;color:#667288!important;font-size:10px!important;font-weight:850!important;padding:7px 10px!important}
      #pg-driving .driving-home-arrow{position:absolute!important;right:18px!important;bottom:18px!important;width:34px!important;height:34px!important;display:grid!important;place-items:center!important;border-radius:999px!important;background:#f4f6fb!important;color:#6e5ff0!important;font-size:0!important}#pg-driving .driving-home-arrow:before{content:'->';font-size:13px!important;font-weight:900!important}
      #pg-driving .df-car-question{width:max-content!important;max-width:100%!important;margin-top:auto!important;border:1px solid rgba(117,100,242,.13)!important;border-radius:999px!important;background:rgba(255,255,255,.72)!important;color:#4f5b70!important;font-size:11px!important;font-weight:900!important;padding:8px 11px!important}
      #pg-driving .df-car-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}#pg-driving .df-car-actions button{height:36px!important;border:0!important;border-radius:999px!important;background:linear-gradient(135deg,#7564f2,#ef6aa9)!important;color:#fff!important;font:900 11px var(--ff)!important;padding:0 15px!important}
      .df-widget-hidden{display:none!important}.df-essentials-nav{display:flex!important}.df-essentials-tool-card{cursor:pointer!important}
      #pg-driving .df-essentials-widget-panel{margin:-2px 0 18px!important;border:1px solid #eadff8!important;border-radius:22px!important;background:linear-gradient(135deg,#fff,#fff8fc 55%,#effefa)!important;box-shadow:0 18px 48px rgba(39,49,75,.08)!important;padding:18px!important}#pg-driving .df-essentials-widget-panel[hidden],#pg-driving .df-essentials-empty[hidden]{display:none!important}
      #pg-driving .df-widget-panel-head{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:14px!important;margin-bottom:14px!important}#pg-driving .df-widget-panel-head span{display:block!important;color:#8a94a4!important;font-size:10px!important;font-weight:900!important;text-transform:uppercase!important}#pg-driving .df-widget-panel-head h2{margin:4px 0 0!important;font-family:var(--fd)!important;font-size:26px!important;line-height:1!important;color:#151d33!important}
      #pg-driving .df-widget-panel-head button,#pg-driving .df-widget-actions button{height:34px!important;border:1px solid #dfd9ff!important;border-radius:999px!important;background:#fff!important;color:#6d60e8!important;font:900 11px var(--ff)!important;padding:0 14px!important;cursor:pointer!important}
      #pg-driving .df-widget-list{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.df-widget-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;border:1px solid #e8ebf3!important;border-radius:16px!important;background:rgba(255,255,255,.84)!important;padding:13px!important}.df-widget-row.is-off{background:rgba(248,249,252,.75)!important}.df-widget-row strong{display:block!important;color:#151d33!important;font-size:13px!important}.df-widget-row span{display:block!important;margin-top:5px!important;color:#718096!important;font-size:10.5px!important;line-height:1.4!important;font-weight:750!important}.df-widget-actions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;flex-wrap:wrap!important}.df-widget-actions .df-widget-toggle{min-width:68px!important;background:#f1fffa!important;color:#1b9b83!important}.df-widget-row.is-off .df-widget-toggle{background:#fff3f8!important;color:#d84d91!important}
      #pg-driving .df-essentials-empty{grid-column:1/-1!important;border:1px dashed #dde4ef!important;border-radius:18px!important;background:rgba(255,255,255,.78)!important;color:#738095!important;text-align:center!important;font-size:13px!important;font-weight:850!important;padding:28px!important}
      .df-essentials-tool-page{padding:32px clamp(18px,4vw,42px)!important}.df-essentials-tool-page:not(.on){display:none!important}.df-tool-hero,.df-tool-panel{border:1px solid #e8ebf3;border-radius:20px;background:#fff;box-shadow:0 16px 38px rgba(39,49,75,.06)}.df-tool-hero{position:relative;margin-bottom:18px;background:linear-gradient(135deg,#fff,#fff7fb 48%,#effefa);padding:24px;overflow:hidden}.df-tool-kicker{margin-bottom:7px;color:#d75096;font-size:10px;font-weight:900;text-transform:uppercase}.df-tool-hero h1{margin:0;font-family:var(--fd);font-size:clamp(30px,4vw,48px);line-height:1;color:#172033}.df-tool-hero p{margin:10px 0 0;color:#6e798c;font-size:13px;line-height:1.55}.df-tool-layout{display:grid;grid-template-columns:minmax(280px,.82fr) minmax(0,1.18fr);gap:18px}.df-tool-panel{padding:18px}.df-tool-panel h2,.df-tool-list-head h2{margin:0 0 12px;font-family:var(--fd);font-size:22px;color:#172033}.df-tool-form{display:grid;gap:11px}.df-tool-form label{display:grid;gap:6px;color:#7b8494;font-size:10px;font-weight:850}.df-tool-form input,.df-tool-form textarea{width:100%;border:1px solid #e5e9f2;border-radius:13px;background:#f8f9fc;color:#172033;font:750 12px var(--ff);padding:11px;outline:none}.df-tool-form textarea{min-height:98px;resize:vertical;line-height:1.5}.df-tool-actions,.df-tool-item-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.df-tool-actions button,.df-tool-item-actions button{height:34px;border-radius:999px;border:1px solid #ded8ff;background:#fff;color:#6e5ff0;font:850 10px var(--ff);padding:0 13px;cursor:pointer}.df-tool-actions button.primary{border-color:transparent;background:linear-gradient(135deg,#7564f2,#ef6aa9);color:#fff}.df-tool-list{display:grid;gap:10px}.df-tool-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.df-tool-count{color:#8a94a4;font-size:10px;font-weight:850}.df-tool-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #e8ebf3;border-radius:16px;background:linear-gradient(145deg,#fff,#fbfcff);padding:13px}.df-tool-item strong{display:block;color:#172033;font-size:13px}.df-tool-item span{display:block;margin-top:4px;color:#758094;font-size:10.5px;line-height:1.45}.df-tool-empty{border:1px dashed #dfe5ef;border-radius:17px;background:#fafbfe;color:#8a94a4;text-align:center;font-size:12px;font-weight:800;padding:26px}.df-tool-info{margin-top:18px}.df-tool-info-note{margin:-4px 0 12px;color:#8a94a4;font-size:11px;font-weight:750;line-height:1.5}
      @media(max-width:1180px){#pg-driving .driving-hub-hero{grid-template-columns:1fr!important;align-items:start!important}#pg-driving .driving-hub-pills{justify-content:flex-start!important}#pg-driving .driving-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}#pg-driving .df-car-card,#pg-driving #df-period-card,#pg-driving #df-documents-card,#pg-driving #df-health-card,#pg-driving #df-home-card,#pg-driving #df-work-study-card{grid-column:auto!important}.df-tool-layout{grid-template-columns:1fr}}@media(max-width:760px){#pg-driving .driving-hub-hero{padding:24px 20px!important}#pg-driving .driving-home-grid,#pg-driving .df-widget-list{grid-template-columns:1fr!important}#pg-driving .driving-home-card{min-height:0!important;padding:20px!important}.df-widget-row,.df-tool-item{grid-template-columns:1fr!important}.df-widget-actions,.df-tool-item-actions{justify-content:flex-start!important}.df-tool-actions button{flex:1}.df-essentials-tool-page{padding:20px 14px!important}}
    `;
    document.head.appendChild(style);
  }

  function toolCardHTML(tool, index) {
    return `<button type="button" class="driving-home-card df-essentials-tool-card ${esc(tool.key === 'home' ? 'home-admin' : tool.key)}" id="df-${esc(tool.key)}-card" data-essentials-tool-card="${esc(tool.key)}"><div class="driving-card-top"><div class="driving-home-icon">${esc(tool.icon)}</div><div class="driving-card-number">${String(index + 3).padStart(2, '0')}</div></div><div class="driving-home-copy"><div class="driving-home-kicker">${esc(tool.kicker)}</div><div class="driving-home-title">${esc(tool.label)}</div><div class="driving-home-desc">${esc(tool.desc)}</div></div><div class="driving-card-tags">${tool.tags.map((tag) => `<span class="driving-card-tag">${esc(tag)}</span>`).join('')}</div><div class="df-tool-summary" id="df-${esc(tool.key)}-summary">${esc(tool.empty)}</div><div class="driving-home-arrow">-&gt;</div></button>`;
  }

  function pageHTML(tool) {
    return `<section class="pg df-essentials-tool-page" id="pg-${esc(tool.page)}"><button class="life-back" type="button" onclick="go('driving')">&lt; Essentials</button><section class="df-tool-hero"><div class="df-tool-kicker">Essentials</div><h1>${esc(tool.label)}</h1><p>${esc(tool.desc)}</p></section><div class="df-tool-layout"><section class="df-tool-panel"><h2>Add or edit</h2><form class="df-tool-form" onsubmit="dayframeSaveEssentialsItem('${esc(tool.key)}', event)"><input id="${esc(inputId(tool, 'id'))}" type="hidden"><label>${esc(tool.itemLabel)}<input id="${esc(inputId(tool, 'title'))}" type="text" maxlength="120" placeholder="${esc(tool.placeholder)}"></label><label>${esc(tool.dateLabel)}<input id="${esc(inputId(tool, 'date'))}" type="date"></label><label>Notes<textarea id="${esc(inputId(tool, 'notes'))}" maxlength="500" placeholder="Anything useful to remember."></textarea></label><div class="df-tool-actions"><button type="button" onclick="dayframeClearEssentialsForm('${esc(tool.key)}')">Clear</button><button class="primary" type="submit">${esc(tool.save)}</button></div></form></section><section class="df-tool-panel"><div class="df-tool-list-head"><h2>${esc(tool.list)}</h2><span class="df-tool-count" id="df-${esc(tool.key)}-count"></span></div><div class="df-tool-list" id="df-${esc(tool.key)}-list"></div></section></div>${infoPanelHTML(tool)}</section>`;
  }

  function ensureSideNav() {
    const nav = document.querySelector('.driving-side-nav');
    if (!nav) return;
    TOOLS.forEach((tool) => {
      if (nav.querySelector(`[data-driving-page="${tool.page}"]`)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'df-essentials-nav';
      button.dataset.drivingPage = tool.page;
      button.dataset.essentialsToolNav = tool.key;
      button.innerHTML = `<span>${esc(tool.icon)}</span>${esc(tool.label)}`;
      nav.appendChild(button);
    });
    orderSideNav();
  }

  function ensureCards() {
    const grid = $('pg-driving')?.querySelector('.driving-home-grid');
    if (!grid) return;
    TOOLS.forEach((tool, index) => {
      if (!$(`df-${tool.key}-card`)) grid.insertAdjacentHTML('beforeend', toolCardHTML(tool, index));
      const card = $(`df-${tool.key}-card`);
      if (card) card.dataset.essentialsToolCard = tool.key;
    });
    const car = document.querySelector('#pg-driving .driving-home-card.car');
    if (car) car.dataset.essentialsOpenPage = 'driving-car';
    const flo = $('df-period-card');
    if (flo) flo.dataset.essentialsOpenFlo = 'true';
    orderCards();
  }

  function ensurePages() {
    const parent = $('pg-driving')?.parentElement || document.querySelector('main') || document.body;
    TOOLS.forEach((tool) => {
      if (!$(`pg-${tool.page}`)) parent.insertAdjacentHTML('beforeend', pageHTML(tool));
    });
  }

  function rowHTML(key, index, current) {
    const widget = WIDGET_MAP.get(key);
    if (!widget) return '';
    const visible = !current.hidden.includes(key);
    return `<article class="df-widget-row ${visible ? '' : 'is-off'}" data-widget-row="${esc(key)}"><div><strong>${esc(widget.label)}</strong><span>${esc(widget.desc)}</span></div><div class="df-widget-actions"><button type="button" onclick="dayframeMoveEssentialsWidget('${esc(key)}', -1, event)" aria-label="Move ${esc(widget.label)} up" ${index === 0 ? 'disabled' : ''}>Up</button><button type="button" onclick="dayframeMoveEssentialsWidget('${esc(key)}', 1, event)" aria-label="Move ${esc(widget.label)} down" ${index === current.order.length - 1 ? 'disabled' : ''}>Down</button><button type="button" class="df-widget-toggle" aria-pressed="${visible ? 'true' : 'false'}" onclick="dayframeToggleEssentialsWidget('${esc(key)}', event)">${visible ? 'Shown' : 'Hidden'}</button></div></article>`;
  }

  function ensureCustomizer() {
    const hero = $('pg-driving')?.querySelector('.driving-hub-hero');
    if (!hero) return;
    let panel = $('df-essentials-widget-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'df-essentials-widget-panel';
      panel.className = 'df-essentials-widget-panel';
      panel.hidden = true;
      hero.insertAdjacentElement('afterend', panel);
    }
    const current = prefs();
    panel.innerHTML = `<div class="df-widget-panel-head"><div><span>Essentials</span><h2>Choose what shows</h2></div><button type="button" onclick="dayframeCloseEssentialsCustomise(event)">Done</button></div><div class="df-widget-list">${current.order.map((key, index) => rowHTML(key, index, current)).join('')}</div>`;
  }

  function ensureEmpty(grid) {
    let empty = $('df-essentials-empty');
    if (!empty) {
      empty = document.createElement('div');
      empty.id = 'df-essentials-empty';
      empty.className = 'df-essentials-empty';
      empty.textContent = 'Nothing selected yet. Customise Essentials to choose what shows here.';
    }
    if (empty.parentElement !== grid) grid.appendChild(empty);
    return empty;
  }

  function orderCards() {
    const grid = $('pg-driving')?.querySelector('.driving-home-grid');
    if (!grid) return;
    const current = prefs();
    const shown = [];
    current.order.forEach((key) => {
      const card = cardFor(key);
      const visible = !current.hidden.includes(key);
      setVisible(card, visible);
      if (card && visible) {
        grid.appendChild(card);
        shown.push(key);
      }
    });
    const empty = ensureEmpty(grid);
    empty.hidden = shown.length > 0;
    grid.appendChild(empty);
  }

  function orderSideNav() {
    const nav = document.querySelector('.driving-side-nav');
    if (!nav) return;
    const overview = nav.querySelector('[data-driving-page="driving"]');
    let anchor = overview || nav.firstElementChild;
    const current = prefs();
    current.order.forEach((key) => {
      const button = navFor(key);
      const visible = !current.hidden.includes(key);
      setVisible(button, visible);
      if (button) {
        nav.insertBefore(button, anchor?.nextSibling || null);
        anchor = button;
      }
    });
  }

  function updateLabels() {
    const page = $('pg-driving');
    const pills = page?.querySelector('.driving-hub-pills');
    if (pills) {
      const labels = visibleLabels();
      const pillMarkup = labels.length ? labels.map((label) => `<span class="driving-hub-pill"><b></b>${esc(label)}</span>`).join('') : '<span class="driving-hub-pill"><b></b>Choose your essentials</span>';
      pills.innerHTML = `${pillMarkup}<button class="df-essentials-customise-btn" id="df-essentials-customise-button" type="button" onclick="dayframeToggleEssentialsCustomise(event)">Customise</button>`;
    }
    const heroSub = page?.querySelector('.driving-hub-sub');
    if (heroSub) heroSub.textContent = homeSummary();
    const carDesc = page?.querySelector('.df-car-card .driving-home-desc');
    if (carDesc) carDesc.textContent = 'Vehicle details, renewals and reminders.';
    const carQuestion = page?.querySelector('.df-car-question');
    if (carQuestion) carQuestion.textContent = 'Still learning?';
    const theoryButton = page?.querySelector('.df-car-actions button');
    if (theoryButton) theoryButton.textContent = 'Pass your theory';
    const homeCard = document.querySelector('[data-home-module="driving"]');
    if (homeCard) homeCard.dataset.essentialsOpenPage = 'driving';
    const homeTitle = homeCard?.querySelector('.hub-module-title');
    const homeDesc = homeCard?.querySelector('.hub-module-desc');
    if (homeTitle) homeTitle.textContent = 'Essentials';
    if (homeDesc) homeDesc.textContent = homeSummary();
    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`);
    const mobileTitle = mobileMore?.querySelector('strong');
    const mobileDesc = mobileMore?.querySelector('small');
    if (mobileTitle) mobileTitle.textContent = 'Essentials';
    if (mobileDesc) mobileDesc.textContent = mobileSummary();
  }

  function syncWidgets() {
    const current = prefs();
    orderSideNav();
    orderCards();
    updateLabels();
    if (current.hidden.includes('myflo')) {
      const panel = $('df-period-panel');
      if (panel) panel.hidden = true;
    }
    const active = document.querySelector('.pg.on')?.id || '';
    const hiddenActive = WIDGETS.find((widget) => `pg-${widget.navPage}` === active && current.hidden.includes(widget.key));
    if (hiddenActive && typeof window.go === 'function') window.go('driving');
  }

  function clearForm(tool) {
    ['id', 'title', 'date', 'notes'].forEach((name) => {
      const input = $(inputId(tool, name));
      if (input) input.value = '';
    });
  }

  function renderTool(tool) {
    const items = toolItems(tool);
    const summary = $(`df-${tool.key}-summary`);
    const list = $(`df-${tool.key}-list`);
    const count = $(`df-${tool.key}-count`);
    if (summary) summary.textContent = summaryFor(tool);
    if (count) count.textContent = items.length === 1 ? '1 item' : `${items.length} items`;
    if (tool.info && Array.isArray(tool.info.fields)) {
      const info = toolInfoValues(tool);
      tool.info.fields.forEach((field) => {
        const el = $(infoInputId(tool, field));
        if (el && document.activeElement !== el) el.value = info[field] || '';
      });
    }
    if (!list) return;
    if (!items.length) {
      list.innerHTML = `<div class="df-tool-empty">${esc(tool.empty)}</div>`;
      return;
    }
    list.innerHTML = items.map((item) => `<article class="df-tool-item"><div><strong>${esc(item.title)}</strong><span>${esc(item.date ? prettyDate(item.date) : 'No date')}${item.notes ? ` - ${esc(item.notes)}` : ''}</span></div><div class="df-tool-item-actions"><button type="button" onclick="dayframeEditEssentialsItem('${esc(tool.key)}','${esc(item.id)}')">Edit</button><button type="button" onclick="dayframeDeleteEssentialsItem('${esc(tool.key)}','${esc(item.id)}')">Delete</button></div></article>`).join('');
  }

  function openTool(key, event) {
    const tool = TOOL_MAP.get(key);
    if (!tool) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    apply();
    if (prefs().hidden.includes(key)) {
      window.go?.('driving');
      return;
    }
    document.querySelectorAll('.pg.on[id^="pg-"]').forEach((page) => page.classList.remove('on'));
    $(`pg-${tool.page}`)?.classList.add('on');
    document.body?.classList.add('driving-mode');
    document.querySelectorAll('.driving-side-nav button').forEach((button) => button.classList.toggle('on', button.dataset.drivingPage === tool.page));
    renderTool(tool);
    if (window.innerWidth <= 768 && typeof window.closeSB === 'function') window.closeSB();
  }

  function installClickHandler() {
    if (clickHandlerInstalled || !document.body) return;
    clickHandlerInstalled = true;
    document.addEventListener('click', (event) => {
      if (event.target.closest?.('#df-essentials-customise-button')) return;
      const toolTarget = event.target.closest?.('[data-essentials-tool-card],[data-essentials-tool-nav]');
      if (toolTarget) {
        openTool(toolTarget.dataset.essentialsToolCard || toolTarget.dataset.essentialsToolNav, event);
        return;
      }
      const floTarget = event.target.closest?.('[data-essentials-open-flo="true"]');
      if (floTarget) {
        event.preventDefault();
        event.stopPropagation();
        window.dayframeOpenPeriodTracker?.(event);
        return;
      }
      const pageTarget = event.target.closest?.('[data-essentials-open-page]');
      if (pageTarget) {
        event.preventDefault();
        event.stopPropagation();
        window.go?.(pageTarget.dataset.essentialsOpenPage);
      }
    }, true);
  }

  function needsApply() {
    const current = prefs();
    const pills = $('pg-driving')?.querySelector('.driving-hub-pills');
    const currentPills = [...(pills?.querySelectorAll('.driving-hub-pill') || [])].map((pill) => pill.textContent.trim()).join('|');
    const expectedPills = visibleLabels(current).join('|') || 'Choose your essentials';
    const homeDesc = document.querySelector('[data-home-module="driving"] .hub-module-desc')?.textContent?.trim() || '';
    const mobileDesc = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"] small`)?.textContent?.trim() || '';
    const widgetMismatch = WIDGETS.some((widget) => {
      const shouldShow = !current.hidden.includes(widget.key);
      const card = cardFor(widget.key);
      const nav = navFor(widget.key);
      return (card && card.classList.contains('df-widget-hidden') === shouldShow) || (nav && nav.classList.contains('df-widget-hidden') === shouldShow);
    });
    return !$('df-essentials-widget-panel') || !$('df-essentials-customise-button') || currentPills !== expectedPills || (homeDesc && homeDesc !== homeSummary()) || (mobileDesc && mobileDesc !== mobileSummary()) || TOOLS.some((tool) => !$(`df-${tool.key}-card`) || !$(`pg-${tool.page}`)) || widgetMismatch;
  }

  function apply() {
    queued = false;
    ensureStyle();
    ensureSideNav();
    ensureCards();
    ensurePages();
    ensureCustomizer();
    installClickHandler();
    TOOLS.forEach(renderTool);
    syncWidgets();
    observe();
  }

  function queue(delay = 40) {
    if (queued) return;
    queued = true;
    setTimeout(apply, delay);
  }

  function observe() {
    if (observing || !document.body || typeof MutationObserver !== 'function') return;
    observing = true;
    new MutationObserver(() => { if (needsApply()) queue(30); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function saveWidgetChange(mutator, message = 'Essentials updated') {
    const panelOpen = $('df-essentials-widget-panel')?.hidden === false;
    const current = prefs();
    savePrefs(mutator({ order: [...current.order], hidden: [...current.hidden] }) || current);
    apply();
    const panel = $('df-essentials-widget-panel');
    if (panel) panel.hidden = !panelOpen;
    window.renderHome?.();
    window.hubToast?.(message);
  }

  window.dayframeOpenEssentialsTool = openTool;
  window.dayframeRefreshEssentialsWidgets = syncWidgets;
  window.dayframeToggleEssentialsCustomise = function dayframeToggleEssentialsCustomise(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    apply();
    const panel = $('df-essentials-widget-panel');
    if (panel) panel.hidden = panel.hidden === false;
  };
  window.dayframeCloseEssentialsCustomise = function dayframeCloseEssentialsCustomise(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const panel = $('df-essentials-widget-panel');
    if (panel) panel.hidden = true;
  };
  window.dayframeToggleEssentialsWidget = function dayframeToggleEssentialsWidget(key, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!WIDGET_MAP.has(key)) return;
    saveWidgetChange((current) => {
      const hidden = new Set(current.hidden);
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      return { order: current.order, hidden: [...hidden] };
    });
  };
  window.dayframeSetEssentialsWidget = function dayframeSetEssentialsWidget(key, visible) {
    if (!WIDGET_MAP.has(key)) return;
    saveWidgetChange((current) => {
      const hidden = new Set(current.hidden);
      if (visible) hidden.delete(key);
      else hidden.add(key);
      return { order: current.order, hidden: [...hidden] };
    });
  };
  window.dayframeMoveEssentialsWidget = function dayframeMoveEssentialsWidget(key, direction, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!WIDGET_MAP.has(key)) return;
    saveWidgetChange((current) => {
      const from = current.order.indexOf(key);
      const to = Math.max(0, Math.min(current.order.length - 1, from + (Number(direction) || 0)));
      if (from < 0 || from === to) return current;
      const order = [...current.order];
      const [item] = order.splice(from, 1);
      order.splice(to, 0, item);
      return { order, hidden: current.hidden };
    }, 'Essentials order updated');
  };
  window.dayframeClearEssentialsForm = (key) => { const tool = TOOL_MAP.get(key); if (tool) clearForm(tool); };
  window.dayframeEditEssentialsItem = function dayframeEditEssentialsItem(key, id) {
    const tool = TOOL_MAP.get(key);
    const item = tool ? toolItems(tool).find((entry) => entry.id === id) : null;
    if (!tool || !item) return;
    $(inputId(tool, 'id')).value = item.id;
    $(inputId(tool, 'title')).value = item.title;
    $(inputId(tool, 'date')).value = item.date;
    $(inputId(tool, 'notes')).value = item.notes;
    $(inputId(tool, 'title'))?.focus();
  };
  window.dayframeDeleteEssentialsItem = function dayframeDeleteEssentialsItem(key, id) {
    const tool = TOOL_MAP.get(key);
    if (!tool) return;
    saveItems(tool, toolItems(tool).filter((item) => item.id !== id));
    renderTool(tool);
    window.hubToast?.(tool.deleted);
  };
  window.dayframeSaveEssentialsInfo = function dayframeSaveEssentialsInfo(key, event) {
    event?.preventDefault?.();
    const tool = TOOL_MAP.get(key);
    if (!tool || !tool.info || !Array.isArray(tool.info.fields)) return;
    const next = data();
    next.essentials = next.essentials || {};
    const previous = next.essentials[tool.store];
    const base = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
    const info = {};
    tool.info.fields.forEach((field) => {
      const value = ($(infoInputId(tool, field))?.value || '').trim();
      if (value) info[field] = value.slice(0, 200);
    });
    next.essentials[tool.store] = { ...base, info, updatedAt: new Date().toISOString() };
    save(next);
    window.hubToast?.('Key info saved');
  };
  window.dayframeSaveEssentialsItem = function dayframeSaveEssentialsItem(key, event) {
    event?.preventDefault?.();
    const tool = TOOL_MAP.get(key);
    if (!tool) return;
    const title = $(inputId(tool, 'title'))?.value.trim() || '';
    if (!title) return window.hubToast?.('Add a name first');
    const id = safeId($(inputId(tool, 'id'))?.value || `item-${Date.now()}`);
    const next = { id, title, date: $(inputId(tool, 'date'))?.value || '', notes: $(inputId(tool, 'notes'))?.value || '', updatedAt: new Date().toISOString() };
    const items = toolItems(tool).filter((item) => item.id !== id);
    items.push(next);
    saveItems(tool, items);
    clearForm(tool);
    renderTool(tool);
    window.renderHome?.();
    window.hubToast?.(tool.saved);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(apply, delay));
})();