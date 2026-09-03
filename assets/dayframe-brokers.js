(function () {
  if (window.__dayframeBrokersLoaded) return;
  window.__dayframeBrokersLoaded = true;

  var STYLE_ID = 'df-brokers-style';
  var PENDING_KEY = 'dayframe_pending_brokers_v1';
  var BROKER_NAMES = [
    'Vanguard', 'Moneybox', 'DEGIRO', 'Hargreaves Lansdown', 'AJ Bell', 'Fidelity',
    'interactive investor', 'Freetrade', 'InvestEngine', 'Nutmeg', 'Charles Stanley Direct',
    'Wealthify', 'Standard Life', 'Aviva', 'Trading 212 (second account)', 'Other'
  ];

  // Only Trading 212 publishes a personal API, so it is the only broker Dayframe
  // can sync live. For every other broker we show where to read the figure.
  var LIVE_SYNC = {
    'Trading 212': {
      live: true,
      steps: [
        'In the Trading 212 app open Menu → Settings → API (Beta) and accept the warning.',
        'Choose Generate API key, name it “Dayframe” and enable read-only Account data + Portfolio.',
        'Copy the API Key and API Secret Key, then paste both into the Trading 212 card above.',
        'It then refreshes on its own — no need to type a value.'
      ]
    },
    'Trading 212 (second account)': {
      live: true,
      steps: [
        'Switch Trading 212 to the second account (e.g. your ISA), then Menu → Settings → API (Beta).',
        'Generate a separate read-only key pair for that account.',
        'Paste it into the Trading 212 card above — Dayframe keeps both accounts in the total.'
      ]
    },
    'Vanguard': {
      live: false,
      steps: [
        'Vanguard UK has no personal API, so this figure is kept up to date by you.',
        'Open the Vanguard UK app or website and go to My Portfolio.',
        'Use the Total value shown at the top, and update it here whenever it moves.'
      ]
    },
    'DEGIRO': {
      live: false,
      steps: [
        'DEGIRO has no live personal API. It does offer an Account statement / Portfolio CSV export under Activity, but that is a manual download.',
        'Open DEGIRO, go to Portfolio and read the total value at the top.',
        'Enter that number here and refresh it when you check your account.'
      ]
    },
    'Hargreaves Lansdown': { live: false, steps: ['HL has no personal API.', 'Open the HL app → Account summary.', 'Use Total value and update it here.'] },
    'AJ Bell': { live: false, steps: ['AJ Bell has no personal API.', 'Open the AJ Bell app → Dashboard.', 'Use Total account value and update it here.'] },
    'Fidelity': { live: false, steps: ['Fidelity UK has no personal API.', 'Open Fidelity → Portfolio summary.', 'Use Total value and update it here.'] },
    'interactive investor': { live: false, steps: ['ii has no personal API.', 'Open the ii app → Portfolio.', 'Use Total value and update it here.'] },
    'Freetrade': { live: false, steps: ['Freetrade has no personal API.', 'Open Freetrade → Portfolio tab.', 'Use the large figure at the top and update it here.'] },
    'InvestEngine': { live: false, steps: ['InvestEngine has no personal API.', 'Open InvestEngine → Portfolio.', 'Use Portfolio value and update it here.'] },
    'Moneybox': { live: false, steps: ['Moneybox has no personal API.', 'Open the Moneybox app → Home.', 'Use Total balance and update it here.'] },
    'Nutmeg': { live: false, steps: ['Nutmeg has no personal API.', 'Open Nutmeg → Overview.', 'Use Portfolio value and update it here.'] },
    'Charles Stanley Direct': { live: false, steps: ['No personal API.', 'Open Charles Stanley Direct → Portfolio valuation.', 'Use the total and update it here.'] },
    'Wealthify': { live: false, steps: ['No personal API.', 'Open Wealthify → Plans.', 'Add up your plan values, or use the headline total, and update it here.'] },
    'Standard Life': { live: false, steps: ['No personal API.', 'Open Standard Life → your plan.', 'Use the current plan value and update it here.'] },
    'Aviva': { live: false, steps: ['No personal API.', 'Open MyAviva → your investment or pension.', 'Use the current value and update it here.'] },
    'Other': { live: false, steps: ['Most brokers do not offer a personal data feed.', 'Open your broker and find the total portfolio or account value.', 'Enter it here and update it when it changes.'] }
  };
  function brokerGuide(name) {
    return LIVE_SYNC[name] || LIVE_SYNC.Other;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function gbp(n) {
    n = Number(n) || 0;
    return '£' + Math.round(n).toLocaleString('en-GB');
  }
  function hub() {
    try { return window.hubLoad ? window.hubLoad() : null; } catch (e) { return null; }
  }
  function saveHub(d) {
    try { if (window.hubSave) window.hubSave(d); } catch (e) {}
  }
  function accounts() {
    var d = hub();
    if (!d) return [];
    if (!Array.isArray(d.brokerAccounts)) return [];
    return d.brokerAccounts;
  }
  function t212IsConnected() {
    if (typeof window.t212Connected === 'boolean' && window.t212Connected) return true;
    try { if (typeof window.t212CachedAt === 'function' && window.t212CachedAt() > 0) return true; } catch (e) {}
    return typeof window.__dfT212Total === 'number' && isFinite(window.__dfT212Total);
  }
  function t212Total() {
    return (typeof window.__dfT212Total === 'number' && isFinite(window.__dfT212Total)) ? window.__dfT212Total : null;
  }
  function prefix() {
    return window.__dfT212Prefix || '£';
  }

  /* ---------------------------------------------------------------- data ops */

  window.dfBrokerAdd = function (name) {
    name = String(name || '').trim();
    if (!name) return;
    var d = hub();
    if (!d) return;
    if (!Array.isArray(d.brokerAccounts)) d.brokerAccounts = [];
    if (d.brokerAccounts.some(function (a) { return (a.name || '').toLowerCase() === name.toLowerCase(); })) {
      if (window.hubToast) window.hubToast(name + ' is already on your list');
      return;
    }
    d.brokerAccounts.push({
      id: 'bk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      value: 0,
      updatedAt: new Date().toISOString()
    });
    saveHub(d);
    renderAll();
    setTimeout(function () {
      var last = document.querySelector('#df-broker-list .df-broker-row:last-child input');
      if (last) { last.focus(); last.select(); }
    }, 30);
  };

  window.dfBrokerSetValue = function (id, val) {
    var d = hub();
    if (!d || !Array.isArray(d.brokerAccounts)) return;
    var a = null;
    for (var i = 0; i < d.brokerAccounts.length; i++) if (d.brokerAccounts[i].id === id) a = d.brokerAccounts[i];
    if (!a) return;
    a.value = Math.max(0, Number(val) || 0);
    a.updatedAt = new Date().toISOString();
    saveHub(d);
    renderPortfolio();
  };

  window.dfBrokerRemove = function (id) {
    var d = hub();
    if (!d || !Array.isArray(d.brokerAccounts)) return;
    d.brokerAccounts = d.brokerAccounts.filter(function (x) { return x.id !== id; });
    saveHub(d);
    renderAll();
  };

  window.dfBrokerOpenConnect = function () {
    if (typeof window.toggleInvestConnections === 'function') {
      var modal = document.getElementById('invest-connections-modal');
      if (!modal || !modal.classList.contains('open')) window.toggleInvestConnections();
    }
    setTimeout(function () {
      var sec = document.getElementById('df-broker-connect-card');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var sel = document.getElementById('df-broker-add-select');
      if (sel) sel.focus();
    }, 160);
  };

  /* --------------------------------------------------------------- rendering */

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      /* full-width portfolio-value widget */
      '#pg-dashboard.df-has-brokers .portfolio-dashboard-header .dash-header-right{display:none}',
      '#pg-dashboard.df-has-brokers .mrow{grid-template-columns:repeat(4,minmax(0,1fr))}',
      '@media(max-width:1180px){#pg-dashboard.df-has-brokers .mrow{grid-template-columns:repeat(3,minmax(0,1fr))}}',
      '@media(max-width:700px){#pg-dashboard.df-has-brokers .mrow{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '#pg-dashboard.df-has-brokers .mc.mc-live{display:none}',
      '.df-pf-hero{margin:0 0 14px;padding:20px 22px;border-radius:20px;background:linear-gradient(120deg,#12324b 0%,#1c4c6b 55%,#276173 100%);color:#fff;box-shadow:0 18px 40px rgba(20,40,60,.22);font-family:var(--ff)}',
      '.df-pf-hero-main{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
      '.df-pf-hero-kicker{display:block;font-size:9px;font-weight:850;letter-spacing:1.1px;text-transform:uppercase;color:rgba(255,255,255,.62)}',
      '.df-pf-hero-total{display:block;margin:5px 0 3px;font-family:var(--fd,var(--ff));font-size:34px;font-weight:900;letter-spacing:-.5px;line-height:1}',
      '.df-pf-hero-note{display:block;font-size:10.5px;color:rgba(255,255,255,.6)}',
      '.df-pf-hero-manage{flex:0 0 auto;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font:800 10.5px var(--ff);padding:8px 13px;border-radius:11px;cursor:pointer}',
      '.df-pf-hero-manage:hover{background:rgba(255,255,255,.2)}',
      '.df-pf-hero-grid{display:grid;gap:8px;margin-top:15px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}',
      '.df-pf-hero[data-count="1"] .df-pf-hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '.df-pf-hero[data-count="2"] .df-pf-hero-grid{grid-template-columns:repeat(3,minmax(0,1fr))}',
      '.df-pf-acct{display:flex;flex-direction:column;gap:2px;padding:12px 13px;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(255,255,255,.09);min-width:0;text-align:left}',
      '.df-pf-acct>i{width:7px;height:7px;border-radius:50%;background:#7ee6bf;box-shadow:0 0 0 4px rgba(126,230,191,.16);margin-bottom:5px}',
      '.df-pf-acct>b{font-size:11px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.df-pf-acct>span{font-size:15px;font-weight:850;color:#fff;letter-spacing:-.2px}',
      '.df-pf-acct>em{font-style:normal;font-size:8.5px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:rgba(255,255,255,.5)}',
      '.df-pf-acct.df-pf-acct-add{cursor:pointer;border-style:dashed;background:rgba(255,255,255,.05);justify-content:center}',
      '.df-pf-acct.df-pf-acct-add:hover{background:rgba(255,255,255,.14)}',
      '.df-pf-acct.df-pf-acct-add>i{background:none;box-shadow:none;width:auto;height:auto;margin:0;font-style:normal;font-size:15px;font-weight:700;color:rgba(255,255,255,.8)}',
      '.df-pf-acct.df-pf-acct-add>span{font-size:9px;font-weight:750;color:rgba(255,255,255,.55)}',
      '@media(max-width:640px){.df-pf-hero-total{font-size:28px}.df-pf-hero[data-count="1"] .df-pf-hero-grid,.df-pf-hero[data-count="2"] .df-pf-hero-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '#df-broker-connect-card .df-broker-add-row{display:flex;gap:8px;margin-top:4px}',
      '#df-broker-connect-card select,#df-broker-connect-card .df-broker-row input{height:38px;border:1px solid #dfe3eb;border-radius:10px;padding:0 10px;background:#fbfcff;color:#353e50;font:600 12px var(--ff);min-width:0}',
      '#df-broker-connect-card select{flex:1}',
      '#df-broker-connect-card .df-broker-add-btn{flex:0 0 auto;height:38px;padding:0 15px;border:0;border-radius:10px;background:#6759df;color:#fff;font:800 12px var(--ff);cursor:pointer}',
      '#df-broker-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}',
      '#df-broker-list:empty{display:none}',
      '.df-broker-item{border:1px solid #e8eaf1;border-radius:12px;background:#fff;overflow:hidden}',
      '.df-broker-item .df-broker-row{border:0;border-radius:0}',
      '.df-broker-guide{border-top:1px solid #eef0f5;background:#fbfbfe}',
      '.df-broker-guide summary{list-style:none;cursor:pointer;padding:9px 11px;font:750 10.5px var(--ff);color:#6a63c9}',
      '.df-broker-guide summary::-webkit-details-marker{display:none}',
      '.df-broker-guide summary:before{content:"▸ ";font-size:9px}',
      '.df-broker-guide[open] summary:before{content:"▾ "}',
      '.df-broker-guide-note{margin:0;padding:0 12px;font-size:10px;color:#94a0b4}',
      '.df-broker-guide ol{margin:6px 0 11px;padding:0 12px 0 27px;display:flex;flex-direction:column;gap:5px}',
      '.df-broker-guide li{font-size:10.5px;line-height:1.5;color:#5a6273}',
      '.df-broker-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid #e8eaf1;border-radius:12px;background:#fff}',
      '.df-broker-row .df-broker-name{flex:1;font:700 12px var(--ff);color:#2f3852;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.df-broker-row .df-broker-cur{color:#94a0b4;font-weight:800;font-size:12px}',
      '.df-broker-row input{width:104px;text-align:right}',
      '.df-broker-row .df-broker-del{flex:0 0 auto;width:30px;height:30px;border:1px solid #edd6da;border-radius:9px;background:#fff;color:#c9556b;font-size:15px;line-height:1;cursor:pointer}',
      '.df-broker-hint{margin-top:10px;font-size:10.5px;line-height:1.55;color:#8b95a6}',
      '.df-signup-brokers{margin:4px 0 6px}',
      '.df-signup-brokers>span{display:block;font-size:11px;font-weight:700;color:#5a6479;margin-bottom:7px}',
      '.df-signup-brokers .df-chip-wrap{display:flex;flex-wrap:wrap;gap:7px}',
      '.df-signup-chip{border:1px solid #d9dced;border-radius:999px;padding:7px 13px;background:#fff;color:#4b5468;font:650 11.5px var(--ff);cursor:pointer}',
      '.df-signup-chip.on{background:#6759df;border-color:#6759df;color:#fff}',
      '.df-signup-brokers small{display:block;margin-top:8px;font-size:10px;color:#98a1b2}',
      '@media(max-width:700px){#pg-dashboard .dash-header-right{width:100%}.df-broker-pills{width:100%}}'
    ].join('');
    document.head.appendChild(s);
  }

  function renderPortfolio() {
    var pg = document.getElementById('pg-dashboard');
    var header = pg && pg.querySelector('.portfolio-dashboard-header');
    var mval = document.getElementById('m-val');
    if (!pg || !header) return;
    ensureStyle();

    var accs = accounts();
    var manual = accs.reduce(function (s, a) { return s + (Number(a.value) || 0); }, 0);
    var t = t212Total();
    var hasT = (t != null);
    var tConn = hasT || t212IsConnected();
    var total = (hasT ? t : 0) + manual;
    var pfx = prefix();
    var count = (tConn ? 1 : 0) + accs.length;
    var totalText = count ? pfx + Math.round(total).toLocaleString('en-GB') : pfx + '0';
    if (mval && (hasT || manual > 0)) mval.textContent = totalText;

    pg.classList.add('df-has-brokers');

    var cards = '';
    if (tConn) {
      cards += '<div class="df-pf-acct"><i></i><b>Trading 212</b><span>'
        + (hasT ? pfx + Math.round(t).toLocaleString('en-GB') : '—') + '</span><em>Auto-synced</em></div>';
    } else {
      cards += '<button type="button" class="df-pf-acct df-pf-acct-add" onclick="dfBrokerOpenConnect()">'
        + '<i>+</i><b>Connect Trading 212</b><span>Live automatic sync</span></button>';
    }
    accs.forEach(function (a) {
      cards += '<div class="df-pf-acct"><i></i><b>' + esc(a.name) + '</b><span>'
        + gbp(a.value) + '</span><em>' + (a.value > 0 ? 'Manual' : 'Add value') + '</em></div>';
    });
    cards += '<button type="button" class="df-pf-acct df-pf-acct-add" onclick="dfBrokerOpenConnect()">'
      + '<i>+</i><b>Add an investing account</b><span>Vanguard, Moneybox, AJ Bell…</span></button>';

    var note = count
      ? (count + ' account' + (count === 1 ? '' : 's') + (hasT ? ' · Trading 212 updates automatically' : ''))
      : 'Add your first account to see your total';

    var hero = document.getElementById('df-pf-hero');
    if (!hero) {
      hero = document.createElement('section');
      hero.id = 'df-pf-hero';
      hero.className = 'df-pf-hero';
      header.parentNode.insertBefore(hero, header.nextSibling);
    }
    hero.setAttribute('data-count', String(count));
    hero.innerHTML =
      '<div class="df-pf-hero-main"><div>'
      + '<span class="df-pf-hero-kicker">Portfolio value</span>'
      + '<strong class="df-pf-hero-total">' + esc(totalText) + '</strong>'
      + '<span class="df-pf-hero-note">' + esc(note) + '</span>'
      + '</div><button type="button" class="df-pf-hero-manage" onclick="dfBrokerOpenConnect()">Manage</button></div>'
      + '<div class="df-pf-hero-grid">' + cards + '</div>';

    var bd = document.getElementById('df-broker-breakdown');
    if (bd) bd.remove();
    var pills = document.querySelector('#pg-dashboard .df-broker-pills');
    if (pills) pills.remove();
  }


  function ensureDrawerSection() {
    var grid = document.querySelector('#invest-connections-modal .invest-connect-grid');
    if (!grid || document.getElementById('df-broker-connect-card')) { renderDrawerList(); return; }
    ensureStyle();
    var sec = document.createElement('section');
    sec.className = 'invest-service-card';
    sec.id = 'df-broker-connect-card';
    var opts = ['<option value="">Choose a provider…</option>'].concat(
      BROKER_NAMES.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; })
    ).join('');
    sec.innerHTML =
      '<div class="invest-service-top"><span class="invest-service-icon">+</span>'
      + '<div><h3>Your other investing accounts</h3><p>A “broker” is just the app or company you invest through — Vanguard, Moneybox, AJ Bell and so on. Trading 212 connects automatically above; add the rest here.</p></div></div>'
      + '<div class="df-broker-add-row">'
      + '<select id="df-broker-add-select">' + opts + '</select>'
      + '<button type="button" class="df-broker-add-btn" onclick="(function(){var s=document.getElementById(\'df-broker-add-select\');if(s&&s.value){dfBrokerAdd(s.value);s.value=\'\'}})()">Add</button>'
      + '</div>'
      + '<div id="df-broker-list"></div>'
      + '<div class="df-broker-hint">Trading 212 is the only one of these that lets an app pull your balance for you, so it is the only account Dayframe updates live. For the rest (Vanguard, Moneybox and so on) each one shows a short note on where to find the figure — type it in and it is added to your total and shown on its own.</div>';
    grid.appendChild(sec);
    renderDrawerList();
  }

  function renderDrawerList() {
    var list = document.getElementById('df-broker-list');
    if (!list) return;
    var accs = accounts();
    list.innerHTML = accs.map(function (a) {
      var g = brokerGuide(a.name);
      var steps = (g.steps || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
      return '<div class="df-broker-item">'
        + '<div class="df-broker-row" data-id="' + a.id + '">'
        + '<span class="df-broker-name">' + esc(a.name) + '</span>'
        + '<span class="df-broker-cur">£</span>'
        + '<input type="number" inputmode="decimal" min="0" step="1" value="' + (Number(a.value) || 0)
        + '" aria-label="' + esc(a.name) + ' current value" '
        + 'onchange="dfBrokerSetValue(\'' + a.id + '\',this.value)" '
        + 'onkeydown="if(event.key===\'Enter\')this.blur()">'
        + '<button type="button" class="df-broker-del" title="Remove ' + esc(a.name) + '" onclick="dfBrokerRemove(\'' + a.id + '\')">×</button>'
        + '</div>'
        + '<details class="df-broker-guide">'
        + '<summary>' + (g.live ? 'How to connect ' + esc(a.name) + ' (live sync)' : 'How to keep ' + esc(a.name) + ' up to date') + '</summary>'
        + (g.live ? '' : '<p class="df-broker-guide-note">' + esc(a.name) + ' does not offer a live connection.</p>')
        + '<ol>' + steps + '</ol>'
        + '</details>'
        + '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------ signup chips */

  function pendingList() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch (e) { return []; }
  }
  function setPending(arr) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  window.dfSignupToggleBroker = function (btn, name) {
    var arr = pendingList();
    var i = arr.indexOf(name);
    if (i === -1) { arr.push(name); btn.classList.add('on'); }
    else { arr.splice(i, 1); btn.classList.remove('on'); }
    setPending(arr);
  };

  function ensureSignupChips() {
    var form = document.getElementById('auth-signup');
    if (!form || document.getElementById('df-signup-brokers')) return;
    var btn = document.getElementById('signup-btn');
    if (!btn) return;
    var chosen = pendingList();
    var block = document.createElement('div');
    block.className = 'df-signup-brokers auth-field';
    block.id = 'df-signup-brokers';
    var chips = ['Trading 212', 'Vanguard', 'Moneybox', 'Hargreaves Lansdown', 'AJ Bell', 'Freetrade', 'InvestEngine', 'DEGIRO']
      .map(function (n) {
        var on = chosen.indexOf(n) !== -1 ? ' on' : '';
        return '<button type="button" class="df-signup-chip' + on + '" onclick="dfSignupToggleBroker(this,\'' + esc(n) + '\')">' + esc(n) + '</button>';
      }).join('');
    block.innerHTML = '<span>Where do you invest? (optional)</span>'
      + '<div class="df-chip-wrap">' + chips + '</div>'
      + '<small>Pick the apps or providers you use — Vanguard, Moneybox, Trading 212 and so on. We’ll add them to your investing dashboard; Trading 212 can connect automatically once you’re signed in.</small>';
    btn.parentNode.insertBefore(block, btn);
  }

  function seedFromPending() {
    var arr = pendingList();
    if (!arr.length) return;
    var d = hub();
    if (!d) return;
    if (!Array.isArray(d.brokerAccounts)) d.brokerAccounts = [];
    var changed = false;
    arr.forEach(function (name) {
      if (name === 'Trading 212') return; // handled by the real T212 connector
      var exists = d.brokerAccounts.some(function (a) { return (a.name || '').toLowerCase() === name.toLowerCase(); });
      if (!exists) {
        d.brokerAccounts.push({
          id: 'bk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: name, value: 0, updatedAt: new Date().toISOString()
        });
        changed = true;
      }
    });
    if (changed) saveHub(d);
    setPending([]);
  }

  /* ----------------------------------------------------------------- wiring */

  function wrapT212Snapshot() {
    if (typeof window.applyT212Snapshot === 'function' && !window.applyT212Snapshot.__dfBrokers) {
      var orig = window.applyT212Snapshot;
      window.applyT212Snapshot = function (data) {
        var r = orig.apply(this, arguments);
        try {
          var cash = (data && data.summary) || {};
          var total = Number(cash.total);
          if (!isFinite(total)) {
            var pos = (data && Array.isArray(data.positions)) ? data.positions : [];
            total = pos.reduce(function (s, p) { return s + (Number(p.currentValue) || 0); }, 0);
          }
          window.__dfT212Total = total;
          if (typeof window.t212MoneyPrefix === 'function') window.__dfT212Prefix = window.t212MoneyPrefix(cash.currency);
        } catch (e) {}
        renderPortfolio();
        return r;
      };
      window.applyT212Snapshot.__dfBrokers = true;
    }
  }

  function wrapGo() {
    if (typeof window.go === 'function' && !window.go.__dfBrokers) {
      var orig = window.go;
      window.go = function (name) {
        var r = orig.apply(this, arguments);
        if (name === 'dashboard') setTimeout(renderAll, 30);
        return r;
      };
      window.go.__dfBrokers = true;
    }
  }

  function wrapConnToggle() {
    if (typeof window.toggleInvestConnections === 'function' && !window.toggleInvestConnections.__dfBrokers) {
      var orig = window.toggleInvestConnections;
      window.toggleInvestConnections = function () {
        var r = orig.apply(this, arguments);
        setTimeout(ensureDrawerSection, 20);
        return r;
      };
      window.toggleInvestConnections.__dfBrokers = true;
    }
  }

  function authScreenVisible() {
    var el = document.getElementById('auth-screen');
    return !!el && !el.classList.contains('hidden');
  }
  function renderAll() {
    ensureStyle();
    if (pendingList().length && !authScreenVisible() && hub()) seedFromPending();
    renderPortfolio();
    ensureDrawerSection();
    ensureSignupChips();
  }

  function boot() {
    ensureStyle();
    wrapT212Snapshot();
    wrapGo();
    wrapConnToggle();
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  [250, 800, 1600, 3000].forEach(function (ms) { setTimeout(boot, ms); });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#pg-dashboard, .invest-side-nav, .ni')) setTimeout(renderAll, 60);
  }, true);
})();
