(() => {
  'use strict';

  const VERSION = 'more-v3';
  const FLAG = 'data-dayframe-essentials-more';

  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  const TOOLS = [
    {
      key: 'documents',
      page: 'driving-documents',
      label: 'Documents',
      icon: 'D',
      iconSvg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 3.5h6.8L18.5 8v12a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M14 3.5V8h4.5M9 12h6M9 15.5h6M9 19h3"/></svg>',
      number: '03',
      kicker: 'Important',
      desc: 'IDs, renewals and documents you might need quickly.',
      tags: ['ID', 'Passport', 'Licence', 'Renewals'],
      empty: 'No documents saved',
      list: 'Saved documents',
      itemLabel: 'Document or card',
      dateLabel: 'Renewal or expiry date',
      placeholder: 'Passport, provisional licence, railcard or insurance document.',
      save: 'Save document',
      saved: 'Document saved',
      deleted: 'Document deleted',
      store: 'documents',
    },
    {
      key: 'health',
      page: 'driving-health',
      label: 'Health',
      icon: 'H',
      iconSvg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 5.8a4 4 0 0 0-5.7 0L12 7.6l-1.8-1.8a4 4 0 0 0-5.7 5.7L12 19l7.5-7.5a4 4 0 0 0 0-5.7z"/><path d="M12 10.5v4M10 12.5h4"/></svg>',
      number: '04',
      kicker: 'Appointments',
      desc: 'Dentist, GP, prescriptions and checkups.',
      tags: ['Dentist', 'GP', 'Optician', 'Medication'],
      empty: 'No health reminders saved',
      list: 'Health reminders',
      itemLabel: 'Reminder',
      dateLabel: 'Date',
      placeholder: 'Dentist, prescription, GP appointment or optician reminder.',
      save: 'Save reminder',
      saved: 'Reminder saved',
      deleted: 'Reminder deleted',
      store: 'health',
    },
    {
      key: 'home',
      page: 'driving-home-admin',
      label: 'Home & Rent',
      icon: 'H',
      iconSvg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/><path d="M9.5 20v-6h5v6"/></svg>',
      number: '05',
      kicker: 'Home',
      desc: 'Track rent dates, tenancy notes and moving tasks.',
      tags: ['Rent date', 'Tenancy', 'Deposit', 'Moving'],
      empty: 'No home or rent reminders saved',
      list: 'Home and rent reminders',
      itemLabel: 'Home or rent item',
      dateLabel: 'Date',
      placeholder: 'Rent review, tenancy end, deposit note or moving task.',
      save: 'Save note',
      saved: 'Home note saved',
      deleted: 'Home note deleted',
      store: 'home',
    },
    {
      key: 'work-study',
      page: 'driving-work-study',
      label: 'Work & Study',
      icon: 'W',
      iconSvg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"/><path d="M4.5 8.5h15v10A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-10z"/><path d="M4.5 12.5h15M10 15h4"/></svg>',
      number: '06',
      kicker: 'Dates',
      desc: 'Keep shifts, applications, certificates and deadlines visible.',
      tags: ['Shifts', 'Courses', 'Applications', 'Certificates'],
      empty: 'No work or study dates saved',
      list: 'Work and study dates',
      itemLabel: 'Work or study item',
      dateLabel: 'Date',
      placeholder: 'Shift, course date, application, interview or certificate.',
      save: 'Save date',
      saved: 'Date saved',
      deleted: 'Date deleted',
      store: 'workStudy',
    },
  ];

  const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.key, tool]));
  let applyQueued = false;
  let observerInstalled = false;
  let clickHandlerInstalled = false;

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

  function iconMarkup(tool) {
    return tool.iconSvg || esc(tool.icon);
  }

  function safeId(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || `item-${Date.now()}`;
  }

  function getData() {
    if (typeof window.hubLoad !== 'function') return {};
    return window.hubLoad() || {};
  }

  function saveData(data) {
    if (typeof window.hubSave === 'function') window.hubSave(data);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function prettyDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'No date';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return 'No date';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  function normaliseItem(item) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(item?.date || '')) ? String(item.date) : '';
    return {
      id: safeId(item?.id),
      title: String(item?.title || '').trim().slice(0, 120),
      date,
      notes: String(item?.notes || '').trim().slice(0, 500),
      updatedAt: String(item?.updatedAt || ''),
    };
  }

  function itemsFor(tool, data = getData()) {
    const raw = data?.essentials?.[tool.store];
    const source = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
    return source.map(normaliseItem).filter((item) => item.title);
  }

  function saveItems(tool, items) {
    const data = getData();
    data.essentials = data.essentials || {};
    const previous = data.essentials[tool.store];
    const base = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
    data.essentials[tool.store] = {
      ...base,
      items,
      updatedAt: new Date().toISOString(),
    };
    saveData(data);
  }

  function sortedItems(tool) {
    return itemsFor(tool).sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  function summaryFor(tool) {
    const items = sortedItems(tool);
    if (!items.length) return tool.empty;
    const upcoming = items.find((item) => item.date && item.date >= todayISO());
    if (upcoming) return `${upcoming.title}: ${prettyDate(upcoming.date)}`;
    return items.length === 1 ? '1 saved' : `${items.length} saved`;
  }

  function inputId(tool, name) {
    return `df-${tool.key}-${name}`;
  }

  function ensureStyle() {
    if (byId('df-essentials-more-style')) return;
    const style = document.createElement('style');
    style.id = 'df-essentials-more-style';
    style.textContent = `
      #pg-driving{max-width:1500px!important}
      #pg-driving .driving-hub-hero{position:relative!important;min-height:0!important;margin-bottom:18px!important;padding:30px 34px!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:20px!important;align-items:end!important;border:1px solid #eadff5!important;border-radius:22px!important;background:linear-gradient(135deg,#fff 0%,#fff3fb 40%,#f0fffb 72%,#f4f6ff 100%)!important;box-shadow:0 18px 48px rgba(39,49,75,.08)!important;overflow:hidden!important}
      #pg-driving .driving-hub-hero:before{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#7564f2,#ef6aa9,#42c7ae,#5a9bff)}
      #pg-driving .driving-hub-eyebrow{margin-bottom:8px!important;color:#8a94a4!important;font-size:10px!important;font-weight:900!important;letter-spacing:0!important;text-transform:uppercase!important}
      #pg-driving .driving-hub-title{margin:0!important;font-size:clamp(36px,4.8vw,58px)!important;line-height:.96!important;color:#151d33!important;letter-spacing:0!important}
      #pg-driving .driving-hub-sub{display:block!important;max-width:590px!important;margin-top:12px!important;color:#677287!important;font-size:13px!important;line-height:1.55!important}
      #pg-driving .driving-hub-pills{display:flex!important;justify-content:flex-end!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important}
      #pg-driving .driving-hub-pill{height:34px!important;padding:0 13px!important;border:1px solid rgba(117,100,242,.14)!important;border-radius:999px!important;background:rgba(255,255,255,.74)!important;box-shadow:0 8px 22px rgba(39,49,75,.06)!important;color:#4f5b70!important;font-size:10px!important;font-weight:900!important}
      #pg-driving .driving-hub-pill b{background:linear-gradient(135deg,#7564f2,#ef6aa9)!important}
      #pg-driving .driving-home-grid{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:16px!important;align-items:stretch!important}
      #pg-driving .driving-home-card{position:relative!important;min-height:190px!important;display:flex!important;flex-direction:column!important;gap:14px!important;text-align:left!important;border:1px solid #e7ebf4!important;border-radius:20px!important;background:#fff!important;box-shadow:0 16px 42px rgba(39,49,75,.07)!important;overflow:hidden!important;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease!important}
      #pg-driving .driving-home-card:before{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#7564f2,#ef6aa9)}
      #pg-driving .driving-home-card:hover{transform:translateY(-2px)!important;box-shadow:0 20px 52px rgba(39,49,75,.11)!important;border-color:#dcd7ff!important}
      #pg-driving .df-car-card{grid-column:span 5!important;min-height:250px!important;background:linear-gradient(135deg,#fff 0%,#fff4fb 58%,#f0fffb 100%)!important}
      #pg-driving #df-period-card{grid-column:span 3!important;min-height:250px!important;background:linear-gradient(145deg,#fff 0%,#fff2f8 54%,#f8f4ff 100%)!important}
      #pg-driving #df-documents-card{grid-column:span 4!important}
      #pg-driving #df-health-card,#pg-driving #df-home-card,#pg-driving #df-work-study-card{grid-column:span 4!important}
      #pg-driving .driving-card-top{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;margin-bottom:2px!important}
      #pg-driving .driving-home-icon{width:46px!important;height:46px!important;border-radius:15px!important;display:grid!important;place-items:center!important;background:#f4f1ff!important;color:#7564f2!important;font-weight:900!important;font-size:13px!important;box-shadow:inset 0 0 0 1px rgba(117,100,242,.08)!important}
      #pg-driving .driving-home-icon svg{width:23px!important;height:23px!important;display:block!important;fill:none!important;stroke:currentColor!important;stroke-width:1.9!important;stroke-linecap:round!important;stroke-linejoin:round!important}
      #pg-driving .df-car-card .driving-home-icon{background:#f0efff!important;color:#7564f2!important}
      #pg-driving #df-period-card .driving-home-icon{background:#fff0f8!important;color:#d94d95!important}
      #pg-driving #df-period-card:before{background:linear-gradient(90deg,#ef6aa9,#42c7ae)!important}
      #pg-driving .df-essentials-tool-card.documents:before{background:linear-gradient(90deg,#7564f2,#5a9bff)!important}
      #pg-driving .df-essentials-tool-card.health:before{background:linear-gradient(90deg,#42c7ae,#80d6a0)!important}
      #pg-driving .df-essentials-tool-card.home-admin:before{background:linear-gradient(90deg,#f4b747,#ef6aa9)!important}
      #pg-driving .df-essentials-tool-card.work-study:before{background:linear-gradient(90deg,#5a9bff,#7564f2)!important}
      #pg-driving .df-essentials-tool-card.documents .driving-home-icon{background:#f2f3ff!important;color:#7564f2!important}
      #pg-driving .df-essentials-tool-card.health .driving-home-icon{background:#effbf7!important;color:#24a88f!important}
      #pg-driving .df-essentials-tool-card.home-admin .driving-home-icon{background:#fff6e6!important;color:#d89110!important}
      #pg-driving .df-essentials-tool-card.work-study .driving-home-icon{background:#eef5ff!important;color:#4d86e8!important}
      #pg-driving .driving-card-number{min-width:32px!important;height:24px!important;display:inline-grid!important;place-items:center!important;border-radius:999px!important;background:rgba(255,255,255,.72)!important;border:1px solid rgba(218,224,236,.9)!important;color:#8a94a4!important;font-size:10px!important;font-weight:900!important;letter-spacing:0!important}
      #pg-driving .driving-home-kicker{margin-bottom:7px!important;color:#8a94a4!important;font-size:10px!important;font-weight:900!important;letter-spacing:0!important;text-transform:uppercase!important}
      #pg-driving .driving-home-title{font-size:clamp(22px,2vw,30px)!important;line-height:1!important;color:#151d33!important;letter-spacing:0!important}
      #pg-driving .driving-home-desc{max-width:460px!important;margin-top:8px!important;color:#667288!important;font-size:13px!important;line-height:1.48!important}
      #pg-driving .driving-card-tags{display:flex!important;gap:7px!important;flex-wrap:wrap!important;margin-top:auto!important}
      #pg-driving .driving-card-tag{height:28px!important;display:inline-flex!important;align-items:center!important;padding:0 10px!important;border:1px solid #e8ecf4!important;border-radius:999px!important;background:rgba(255,255,255,.72)!important;color:#667288!important;font-size:10px!important;font-weight:850!important}
      #pg-driving .df-tool-summary,#pg-driving .df-period-card-summary{display:inline-flex!important;align-items:center!important;min-height:28px!important;width:max-content!important;max-width:100%!important;margin-top:2px!important;padding:0 11px!important;border-radius:999px!important;background:#fff!important;border:1px solid #e6eaf2!important;color:#6d60e8!important;font-size:10px!important;font-weight:850!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #pg-driving .df-car-question{width:max-content!important;max-width:100%!important;margin-top:auto!important;border:1px solid rgba(117,100,242,.13)!important;border-radius:999px!important;background:rgba(255,255,255,.72)!important;color:#4f5b70!important;font-size:11px!important;font-weight:900!important;padding:8px 11px!important}
      #pg-driving .df-car-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}
      #pg-driving .df-car-actions button{height:36px!important;border:0!important;border-radius:999px!important;background:linear-gradient(135deg,#7564f2,#ef6aa9)!important;color:#fff!important;font:900 11px var(--ff)!important;padding:0 15px!important;box-shadow:0 10px 24px rgba(117,100,242,.2)!important}
      #pg-driving .driving-home-arrow{position:absolute!important;right:18px!important;bottom:18px!important;width:34px!important;height:34px!important;display:grid!important;place-items:center!important;border-radius:999px!important;background:#f4f6fb!important;color:#6e5ff0!important;font-size:0!important}
      #pg-driving .driving-home-arrow:before{content:'->';font-size:13px!important;font-weight:900!important}
      .df-essentials-nav{display:flex!important}
      .df-essentials-tool-card{cursor:pointer!important}
      .df-essentials-tool-card.documents{background:linear-gradient(145deg,#fff 0%,#fbf9ff 54%,#f3f7ff 100%)!important;border-color:#e2e4ff!important}
      .df-essentials-tool-card.health{background:linear-gradient(145deg,#fff 0%,#f3fffb 56%,#fffaf1 100%)!important;border-color:#d5f2e8!important}
      .df-essentials-tool-card.home-admin{background:linear-gradient(145deg,#fff 0%,#fff8ef 55%,#fff4fb 100%)!important;border-color:#f5dfb8!important}
      .df-essentials-tool-card.work-study{background:linear-gradient(145deg,#fff 0%,#f4f8ff 54%,#f8f4ff 100%)!important;border-color:#d9e8ff!important}
      .df-essentials-tool-page{padding:32px clamp(18px,4vw,42px)!important}
      .df-essentials-tool-page:not(.on){display:none!important}
      .df-tool-hero{position:relative;margin-bottom:18px;border:1px solid #e8ebf3;border-radius:20px;background:linear-gradient(135deg,#fff 0%,#fff7fb 48%,#effefa 100%);box-shadow:0 18px 44px rgba(39,49,75,.08);padding:24px;overflow:hidden}
      .df-tool-hero:before{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#7564f2,#ef6aa9,#42c7ae)}
      .df-tool-kicker{margin-bottom:7px;color:#d75096;font-size:10px;font-weight:900;letter-spacing:0;text-transform:uppercase}
      .df-tool-hero h1{margin:0;font-family:var(--fd);font-size:clamp(30px,4vw,48px);line-height:1;color:#172033;letter-spacing:0}
      .df-tool-hero p{margin:10px 0 0;max-width:680px;color:#6e798c;font-size:13px;line-height:1.55}
      .df-tool-layout{display:grid;grid-template-columns:minmax(280px,.82fr) minmax(0,1.18fr);gap:18px}
      .df-tool-panel{border:1px solid #e8ebf3;border-radius:20px;background:#fff;box-shadow:0 16px 34px rgba(39,49,75,.055);padding:18px}
      .df-tool-panel h2{margin:0 0 12px;font-family:var(--fd);font-size:22px;color:#172033;letter-spacing:0}
      .df-tool-form{display:grid;gap:11px}
      .df-tool-form label{display:grid;gap:6px;color:#7b8494;font-size:10px;font-weight:850;letter-spacing:0}
      .df-tool-form input,.df-tool-form textarea{width:100%;border:1px solid #e5e9f2;border-radius:13px;background:#f8f9fc;color:#172033;font:750 12px var(--ff);padding:11px;outline:none}
      .df-tool-form textarea{min-height:98px;resize:vertical;line-height:1.5}
      .df-tool-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .df-tool-actions button,.df-tool-item-actions button{height:34px;border-radius:999px;border:1px solid #ded8ff;background:#fff;color:#6e5ff0;font:850 10px var(--ff);padding:0 13px;cursor:pointer}
      .df-tool-actions button.primary{border-color:transparent;background:linear-gradient(135deg,#7564f2,#ef6aa9);color:#fff}
      .df-tool-list{display:grid;gap:10px}
      .df-tool-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
      .df-tool-list-head h2{margin:0;font-family:var(--fd);font-size:22px;color:#172033}
      .df-tool-count{color:#8a94a4;font-size:10px;font-weight:850}
      .df-tool-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #e8ebf3;border-radius:16px;background:linear-gradient(145deg,#fff,#fbfcff);padding:13px}
      .df-tool-item strong{display:block;color:#172033;font-size:13px}
      .df-tool-item span{display:block;margin-top:4px;color:#758094;font-size:10.5px;line-height:1.45}
      .df-tool-item-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      .df-tool-empty{border:1px dashed #dfe5ef;border-radius:17px;background:#fafbfe;color:#8a94a4;text-align:center;font-size:12px;font-weight:800;padding:26px}
      @media(max-width:1180px){#pg-driving .driving-hub-hero{grid-template-columns:1fr!important;align-items:start!important}#pg-driving .driving-hub-pills{justify-content:flex-start!important}#pg-driving .driving-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}#pg-driving .df-car-card,#pg-driving #df-period-card,#pg-driving #df-documents-card,#pg-driving #df-health-card,#pg-driving #df-home-card,#pg-driving #df-work-study-card{grid-column:auto!important}.df-tool-layout{grid-template-columns:1fr}}
      @media(max-width:760px){#pg-driving .driving-hub-hero{padding:24px 20px!important;border-radius:18px!important}#pg-driving .driving-hub-title{font-size:40px!important}#pg-driving .driving-home-grid{grid-template-columns:1fr!important}#pg-driving .driving-home-card{min-height:0!important;padding:20px!important}.df-tool-item{grid-template-columns:1fr}.df-tool-item-actions{justify-content:flex-start}.df-tool-actions button{flex:1}.df-tool-hero{padding:20px}.df-essentials-tool-page{padding:20px 14px!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureSideNav() {
    const nav = document.querySelector('.driving-side-nav');
    if (!nav) return;
    const overview = nav.querySelector('[data-driving-page="driving"]');
    let anchor = overview || nav.firstElementChild;

    const car = nav.querySelector('[data-driving-page="driving-car"]');
    const flo = nav.querySelector('[data-driving-page="driving-cycle"]');
    [car, flo].forEach((button) => {
      if (!button) return;
      nav.insertBefore(button, anchor?.nextSibling || null);
      anchor = button;
    });

    TOOLS.forEach((tool) => {
      let button = nav.querySelector(`[data-driving-page="${tool.page}"]`);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'df-essentials-nav';
        button.dataset.drivingPage = tool.page;
        button.innerHTML = `<span>${esc(tool.icon)}</span>${esc(tool.label)}`;
        button.dataset.essentialsToolNav = tool.key;
        button.setAttribute('onclick', `dayframeOpenEssentialsTool('${tool.key}', event)`);
      }
      button.dataset.essentialsToolNav = tool.key;
      nav.insertBefore(button, anchor?.nextSibling || null);
      anchor = button;
    });
  }

  function toolCardHTML(tool) {
    return `
      <button type="button" class="driving-home-card df-essentials-tool-card ${esc(tool.key === 'home' ? 'home-admin' : tool.key)}" id="df-${esc(tool.key)}-card" data-essentials-tool-card="${esc(tool.key)}" onclick="dayframeOpenEssentialsTool('${esc(tool.key)}', event)">
        <div class="driving-card-top">
          <div class="driving-home-icon">${iconMarkup(tool)}</div>
          <div class="driving-card-number">${esc(tool.number)}</div>
        </div>
        <div class="driving-home-copy">
          <div class="driving-home-kicker">${esc(tool.kicker)}</div>
          <div class="driving-home-title">${esc(tool.label)}</div>
          <div class="driving-home-desc">${esc(tool.desc)}</div>
        </div>
        <div class="driving-card-tags">${tool.tags.map((tag) => `<span class="driving-card-tag">${esc(tag)}</span>`).join('')}</div>
        <div class="df-tool-summary" id="df-${esc(tool.key)}-summary">${esc(tool.empty)}</div>
        <div class="driving-home-arrow">-&gt;</div>
      </button>
    `;
  }

  function ensureCards() {
    const grid = byId('pg-driving')?.querySelector('.driving-home-grid');
    if (!grid) return;
    TOOLS.forEach((tool) => {
      if (!byId(`df-${tool.key}-card`)) grid.insertAdjacentHTML('beforeend', toolCardHTML(tool));
      const card = byId(`df-${tool.key}-card`);
      if (card) {
        card.type = 'button';
        card.dataset.essentialsToolCard = tool.key;
      }
    });
    [
      '#pg-driving .driving-home-card.car',
      '#df-period-card',
      '#df-documents-card',
      '#df-health-card',
      '#df-home-card',
      '#df-work-study-card',
    ].forEach((selector) => {
      const card = document.querySelector(selector);
      if (card) grid.appendChild(card);
    });
  }

  function pageHTML(tool) {
    return `
      <section class="pg df-essentials-tool-page" id="pg-${esc(tool.page)}">
        <button class="life-back" type="button" onclick="go('driving')">&lt; Essentials</button>
        <section class="df-tool-hero">
          <div class="df-tool-kicker">Essentials</div>
          <h1>${esc(tool.label)}</h1>
          <p>${esc(tool.desc)}</p>
        </section>
        <div class="df-tool-layout">
          <section class="df-tool-panel">
            <h2>Add or edit</h2>
            <form class="df-tool-form" onsubmit="dayframeSaveEssentialsItem('${esc(tool.key)}', event)">
              <input id="${esc(inputId(tool, 'id'))}" type="hidden">
              <label>${esc(tool.itemLabel)}<input id="${esc(inputId(tool, 'title'))}" type="text" maxlength="120" placeholder="${esc(tool.placeholder)}"></label>
              <label>${esc(tool.dateLabel)}<input id="${esc(inputId(tool, 'date'))}" type="date"></label>
              <label>Notes<textarea id="${esc(inputId(tool, 'notes'))}" maxlength="500" placeholder="Anything useful to remember."></textarea></label>
              <div class="df-tool-actions">
                <button type="button" onclick="dayframeClearEssentialsForm('${esc(tool.key)}')">Clear</button>
                <button class="primary" type="submit">${esc(tool.save)}</button>
              </div>
            </form>
          </section>
          <section class="df-tool-panel">
            <div class="df-tool-list-head">
              <h2>${esc(tool.list)}</h2>
              <span class="df-tool-count" id="df-${esc(tool.key)}-count"></span>
            </div>
            <div class="df-tool-list" id="df-${esc(tool.key)}-list"></div>
          </section>
        </div>
      </section>
    `;
  }

  function ensurePages() {
    const parent = byId('pg-driving')?.parentElement || document.querySelector('main') || document.body;
    TOOLS.forEach((tool) => {
      if (!byId(`pg-${tool.page}`)) parent.insertAdjacentHTML('beforeend', pageHTML(tool));
    });
  }

  function clearForm(tool) {
    ['id', 'title', 'date', 'notes'].forEach((name) => {
      const input = byId(inputId(tool, name));
      if (input) input.value = '';
    });
  }

  function renderTool(tool) {
    const items = sortedItems(tool);
    const summary = byId(`df-${tool.key}-summary`);
    const list = byId(`df-${tool.key}-list`);
    const count = byId(`df-${tool.key}-count`);
    if (summary) summary.textContent = summaryFor(tool);
    if (count) count.textContent = items.length === 1 ? '1 item' : `${items.length} items`;
    if (!list) return;
    if (!items.length) {
      list.innerHTML = `<div class="df-tool-empty">${esc(tool.empty)}</div>`;
      return;
    }
    list.innerHTML = items.map((item) => `
      <article class="df-tool-item">
        <div>
          <strong>${esc(item.title)}</strong>
          <span>${esc(item.date ? prettyDate(item.date) : 'No date')}${item.notes ? ` - ${esc(item.notes)}` : ''}</span>
        </div>
        <div class="df-tool-item-actions">
          <button type="button" onclick="dayframeEditEssentialsItem('${esc(tool.key)}','${esc(item.id)}')">Edit</button>
          <button type="button" onclick="dayframeDeleteEssentialsItem('${esc(tool.key)}','${esc(item.id)}')">Delete</button>
        </div>
      </article>
    `).join('');
  }

  function renderAll() {
    TOOLS.forEach(renderTool);
  }

  function updateLabels() {
    const page = byId('pg-driving');
    const pills = page?.querySelector('.driving-hub-pills');
    if (pills) {
      const labels = ['My Car', 'Flo', 'Documents', 'Health', 'Home & Rent', 'Work & Study'];
      pills.innerHTML = labels.map((label) => `<span class="driving-hub-pill"><b></b>${esc(label)}</span>`).join('');
    }

    const heroSub = page?.querySelector('.driving-hub-sub');
    if (heroSub) heroSub.textContent = 'My Car first, then the small things you do not want to lose track of.';
    const carDesc = page?.querySelector('.df-car-card .driving-home-desc');
    if (carDesc) carDesc.textContent = 'Vehicle details, renewals and reminders.';
    const carQuestion = page?.querySelector('.df-car-question');
    if (carQuestion) carQuestion.textContent = 'Still learning?';
    const theoryButton = page?.querySelector('.df-car-actions button');
    if (theoryButton) theoryButton.textContent = 'Pass your theory';

    const homeCard = document.querySelector('[data-home-module="driving"]');
    homeCard?.querySelector('.hub-module-desc') && (homeCard.querySelector('.hub-module-desc').textContent = 'My Car, Flo, documents and reminders in one place.');
    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"] small`);
    if (mobileMore) mobileMore.textContent = 'My Car, Flo, documents and reminders';
  }

  function selectNav(page) {
    document.querySelectorAll('.driving-side-nav button').forEach((button) => {
      button.classList.toggle('on', button.dataset.drivingPage === page);
    });
  }

  function openTool(key, event) {
    const tool = TOOL_MAP.get(key);
    if (!tool) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    applyNow();
    document.querySelectorAll('.pg.on[id^="pg-"]').forEach((page) => page.classList.remove('on'));
    byId(`pg-${tool.page}`)?.classList.add('on');
    document.body?.classList.add('driving-mode');
    selectNav(tool.page);
    renderTool(tool);
    if (window.innerWidth <= 768 && typeof window.closeSB === 'function') window.closeSB();
  }

  function openDrivingPage(name, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.go?.(name);
  }

  function openFlo(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (typeof window.dayframeOpenPeriodTracker === 'function') window.dayframeOpenPeriodTracker(event);
  }

  function markClickableCards() {
    const homeCard = document.querySelector('[data-home-module="driving"]');
    if (homeCard) homeCard.dataset.essentialsOpenPage = 'driving';

    const myCar = document.querySelector('#pg-driving .driving-home-card.car');
    if (myCar) myCar.dataset.essentialsOpenPage = 'driving-car';

    const flo = byId('df-period-card');
    if (flo) {
      if ('type' in flo) flo.type = 'button';
      flo.dataset.essentialsOpenFlo = 'true';
    }

    TOOLS.forEach((tool) => {
      const card = byId(`df-${tool.key}-card`);
      const nav = document.querySelector(`.driving-side-nav [data-driving-page="${tool.page}"]`);
      if (card) {
        if ('type' in card) card.type = 'button';
        card.dataset.essentialsToolCard = tool.key;
      }
      if (nav) nav.dataset.essentialsToolNav = tool.key;
    });
  }

  function installClickHandler() {
    if (clickHandlerInstalled || !document.body) return;
    clickHandlerInstalled = true;
    document.addEventListener('click', (event) => {
      const toolTarget = event.target.closest?.('[data-essentials-tool-card],[data-essentials-tool-nav]');
      if (toolTarget) {
        openTool(toolTarget.dataset.essentialsToolCard || toolTarget.dataset.essentialsToolNav, event);
        return;
      }

      const floTarget = event.target.closest?.('[data-essentials-open-flo="true"]');
      if (floTarget) {
        openFlo(event);
        return;
      }

      const pageTarget = event.target.closest?.('[data-essentials-open-page]');
      if (pageTarget) openDrivingPage(pageTarget.dataset.essentialsOpenPage, event);
    }, true);
  }

  function patchGo() {
    document.querySelectorAll('.df-essentials-tool-page.on').forEach((page) => page.classList.remove('on'));
  }

  function applyNow() {
    applyQueued = false;
    ensureStyle();
    patchGo();
    ensureSideNav();
    ensureCards();
    ensurePages();
    updateLabels();
    markClickableCards();
    installClickHandler();
    renderAll();
    installObserver();
  }

  function applySoon(delay = 40) {
    if (applyQueued) return;
    applyQueued = true;
    setTimeout(applyNow, delay);
  }

  function needsApply() {
    const page = byId('pg-driving');
    if (!page) return false;
    const pills = page.querySelector('.driving-hub-pills')?.innerText || '';
    return TOOLS.some((tool) => !byId(`df-${tool.key}-card`) || !document.querySelector(`.driving-side-nav [data-driving-page="${tool.page}"]`) || !pills.includes(tool.label));
  }

  function installObserver() {
    if (observerInstalled || !document.body || typeof MutationObserver !== 'function') return;
    observerInstalled = true;
    new MutationObserver(() => {
      if (needsApply()) applySoon(30);
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.dayframeOpenEssentialsTool = openTool;

  window.dayframeClearEssentialsForm = function dayframeClearEssentialsForm(key) {
    const tool = TOOL_MAP.get(key);
    if (!tool) return;
    clearForm(tool);
  };

  window.dayframeEditEssentialsItem = function dayframeEditEssentialsItem(key, id) {
    const tool = TOOL_MAP.get(key);
    if (!tool) return;
    const item = itemsFor(tool).find((entry) => entry.id === id);
    if (!item) return;
    byId(inputId(tool, 'id')).value = item.id;
    byId(inputId(tool, 'title')).value = item.title;
    byId(inputId(tool, 'date')).value = item.date;
    byId(inputId(tool, 'notes')).value = item.notes;
    byId(inputId(tool, 'title'))?.focus();
  };

  window.dayframeDeleteEssentialsItem = function dayframeDeleteEssentialsItem(key, id) {
    const tool = TOOL_MAP.get(key);
    if (!tool) return;
    saveItems(tool, itemsFor(tool).filter((item) => item.id !== id));
    renderTool(tool);
    window.hubToast?.(tool.deleted);
  };

  window.dayframeSaveEssentialsItem = function dayframeSaveEssentialsItem(key, event) {
    event?.preventDefault?.();
    const tool = TOOL_MAP.get(key);
    if (!tool) return;
    const title = byId(inputId(tool, 'title'))?.value.trim() || '';
    if (!title) {
      window.hubToast?.('Add a name first');
      return;
    }
    const id = safeId(byId(inputId(tool, 'id'))?.value || `item-${Date.now()}`);
    const next = {
      id,
      title,
      date: byId(inputId(tool, 'date'))?.value || '',
      notes: byId(inputId(tool, 'notes'))?.value || '',
      updatedAt: new Date().toISOString(),
    };
    const items = itemsFor(tool).filter((item) => item.id !== id);
    items.push(next);
    saveItems(tool, items);
    clearForm(tool);
    renderTool(tool);
    window.renderHome?.();
    window.hubToast?.(tool.saved);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyNow, { once: true });
  else applyNow();
  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(applyNow, delay));
})();
