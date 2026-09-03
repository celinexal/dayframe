(function () {
  if (window.__dayframeBrokersLoaded) return;
  window.__dayframeBrokersLoaded = true;

  var STYLE_ID = 'df-brokers-style';
  var PENDING_KEY = 'dayframe_pending_brokers_v1';
  var BROKER_NAMES = [
    'Vanguard', 'Hargreaves Lansdown', 'AJ Bell', 'Fidelity', 'interactive investor',
    'Freetrade', 'InvestEngine', 'Moneybox', 'Nutmeg', 'Charles Stanley Direct',
    'Wealthify', 'Standard Life', 'Aviva', 'Trading 212 (second account)', 'Other'
  ];

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
    renderPills();
    renderValue();
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
      '.df-broker-pills{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap}',
      '.df-broker-pill{display:flex;align-items:center;gap:9px;padding:9px 13px;border:1px solid rgba(255,255,255,.14);border-radius:13px;background:rgba(255,255,255,.08);backdrop-filter:blur(6px);font-family:var(--ff)}',
      '.df-broker-pill>i{flex:0 0 8px;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.35);box-shadow:0 0 0 4px rgba(255,255,255,.08)}',
      '.df-broker-pill.on>i{background:#71dfb5;box-shadow:0 0 0 4px rgba(113,223,181,.14)}',
      '.df-broker-pill span{display:flex;flex-direction:column;min-width:0}',
      '.df-broker-pill b{font-size:10px;color:#fff;white-space:nowrap}',
      '.df-broker-pill small{font-size:8.5px;color:rgba(255,255,255,.6);white-space:nowrap}',
      '.df-broker-pill.df-broker-add{cursor:pointer;border-style:dashed;background:rgba(255,255,255,.05)}',
      '.df-broker-pill.df-broker-add:hover{background:rgba(255,255,255,.12)}',
      '.df-broker-pill.df-broker-add b{color:rgba(255,255,255,.92)}',
      '#df-broker-breakdown{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin:2px 0 6px;padding:11px 14px;border-radius:13px;background:var(--sf2,#f4f6fb);border:1px solid var(--bd,#e6e8f0)}',
      '#df-broker-breakdown .df-bd-title{font-size:10px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:var(--t3,#8a94a6)}',
      '#df-broker-breakdown .df-bd-item{display:flex;align-items:baseline;gap:6px;font-size:12px;color:var(--t2,#4a5568)}',
      '#df-broker-breakdown .df-bd-item b{font-size:12.5px;color:var(--tx,#1a202c);font-weight:750}',
      '#df-broker-breakdown .df-bd-edit{margin-left:auto;border:0;background:transparent;color:var(--bl,#4d82f3);font:750 11px var(--ff);cursor:pointer}',
      '#df-broker-connect-card .df-broker-add-row{display:flex;gap:8px;margin-top:4px}',
      '#df-broker-connect-card select,#df-broker-connect-card .df-broker-row input{height:38px;border:1px solid #dfe3eb;border-radius:10px;padding:0 10px;background:#fbfcff;color:#353e50;font:600 12px var(--ff);min-width:0}',
      '#df-broker-connect-card select{flex:1}',
      '#df-broker-connect-card .df-broker-add-btn{flex:0 0 auto;height:38px;padding:0 15px;border:0;border-radius:10px;background:#6759df;color:#fff;font:800 12px var(--ff);cursor:pointer}',
      '#df-broker-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}',
      '#df-broker-list:empty{display:none}',
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

  function renderPills() {
    var host = document.querySelector('#pg-dashboard .portfolio-dashboard-header .dash-header-right');
    if (!host) return;
    ensureStyle();
    var wrap = host.querySelector('.df-broker-pills');
    if (!wrap) {
      var native = host.querySelector('.dash-sync-pill');
      if (native) native.style.display = 'none';
      wrap = document.createElement('div');
      wrap.className = 'df-broker-pills';
      host.appendChild(wrap);
    }
    var accs = accounts();
    var html = '';
    var t = t212Total();
    var tConn = t212IsConnected();
    if (tConn || !accs.length) {
      html += '<div class="df-broker-pill' + (tConn ? ' on' : ' df-broker-add') + '"'
        + (tConn ? '' : ' role="button" tabindex="0" onclick="dfBrokerOpenConnect()"')
        + '><i></i><span><b>Trading 212</b><small>'
        + (tConn ? (t != null ? gbp(t) + ' · auto' : 'Updates automatically') : 'Tap to connect') + '</small></span></div>';
    }
    accs.forEach(function (a) {
      html += '<div class="df-broker-pill on"><i></i><span><b>' + esc(a.name) + '</b><small>'
        + gbp(a.value) + (a.value > 0 ? '' : ' · add value') + '</small></span></div>';
    });
    html += '<div class="df-broker-pill df-broker-add" role="button" tabindex="0" onclick="dfBrokerOpenConnect()" '
      + 'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();dfBrokerOpenConnect()}">'
      + '<i></i><span><b>+ Connect a broker</b><small>Vanguard, AJ Bell, more</small></span></div>';
    wrap.innerHTML = html;
  }

  function renderValue() {
    var mval = document.getElementById('m-val');
    var mrow = document.querySelector('#pg-dashboard .mrow');
    if (!mval || !mrow) return;
    ensureStyle();
    var accs = accounts();
    var manual = accs.reduce(function (s, a) { return s + (Number(a.value) || 0); }, 0);
    var t = t212Total();
    var hasT = (t != null);

    var bd = document.getElementById('df-broker-breakdown');

    if (!accs.length) {
      if (bd) bd.remove();
      return; // no extra brokers — leave native T212 behaviour untouched
    }

    var total = (hasT ? t : 0) + manual;
    var pfx = prefix();
    if (hasT || manual > 0) {
      mval.textContent = pfx + Math.round(total).toLocaleString('en-GB');
    }
    if (!hasT) {
      var cash = document.getElementById('m-cash');
      if (cash && (cash.textContent === 'connect T212' || !cash.textContent.trim())) cash.textContent = 'across your brokers';
      var dsub = document.getElementById('dsub');
      if (dsub && /connect trading 212/i.test(dsub.textContent || '')) dsub.textContent = 'Your combined portfolio across your brokers';
    }

    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'df-broker-breakdown';
      mrow.parentNode.insertBefore(bd, mrow.nextSibling);
    }
    var parts = ['<span class="df-bd-title">By broker</span>'];
    if (hasT) parts.push('<span class="df-bd-item">Trading 212 <b>' + gbp(t) + '</b></span>');
    accs.forEach(function (a) {
      parts.push('<span class="df-bd-item">' + esc(a.name) + ' <b>' + gbp(a.value) + '</b></span>');
    });
    parts.push('<span class="df-bd-item">Total <b>' + gbp(total) + '</b></span>');
    parts.push('<button type="button" class="df-bd-edit" onclick="dfBrokerOpenConnect()">Manage</button>');
    bd.innerHTML = parts.join('');
  }

  function ensureDrawerSection() {
    var grid = document.querySelector('#invest-connections-modal .invest-connect-grid');
    if (!grid || document.getElementById('df-broker-connect-card')) { renderDrawerList(); return; }
    ensureStyle();
    var sec = document.createElement('section');
    sec.className = 'invest-service-card';
    sec.id = 'df-broker-connect-card';
    var opts = ['<option value="">Choose a broker…</option>'].concat(
      BROKER_NAMES.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; })
    ).join('');
    sec.innerHTML =
      '<div class="invest-service-top"><span class="invest-service-icon">+</span>'
      + '<div><h3>Other brokers</h3><p>Add Vanguard, AJ Bell, Freetrade and others. Trading 212 syncs automatically above — everything else you keep up to date yourself.</p></div></div>'
      + '<div class="df-broker-add-row">'
      + '<select id="df-broker-add-select">' + opts + '</select>'
      + '<button type="button" class="df-broker-add-btn" onclick="(function(){var s=document.getElementById(\'df-broker-add-select\');if(s&&s.value){dfBrokerAdd(s.value);s.value=\'\'}})()">Add</button>'
      + '</div>'
      + '<div id="df-broker-list"></div>'
      + '<div class="df-broker-hint">Most UK brokers (Vanguard included) do not offer a personal data connection, so enter each account’s current value and update it whenever you like. It is added to your portfolio total and shown separately by broker.</div>';
    grid.appendChild(sec);
    renderDrawerList();
  }

  function renderDrawerList() {
    var list = document.getElementById('df-broker-list');
    if (!list) return;
    var accs = accounts();
    list.innerHTML = accs.map(function (a) {
      return '<div class="df-broker-row" data-id="' + a.id + '">'
        + '<span class="df-broker-name">' + esc(a.name) + '</span>'
        + '<span class="df-broker-cur">£</span>'
        + '<input type="number" inputmode="decimal" min="0" step="1" value="' + (Number(a.value) || 0)
        + '" aria-label="' + esc(a.name) + ' current value" '
        + 'onchange="dfBrokerSetValue(\'' + a.id + '\',this.value)" '
        + 'onkeydown="if(event.key===\'Enter\')this.blur()">'
        + '<button type="button" class="df-broker-del" title="Remove ' + esc(a.name) + '" onclick="dfBrokerRemove(\'' + a.id + '\')">×</button>'
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
    var chips = ['Trading 212', 'Vanguard', 'Hargreaves Lansdown', 'AJ Bell', 'Freetrade', 'InvestEngine', 'interactive investor', 'Moneybox']
      .map(function (n) {
        var on = chosen.indexOf(n) !== -1 ? ' on' : '';
        return '<button type="button" class="df-signup-chip' + on + '" onclick="dfSignupToggleBroker(this,\'' + esc(n) + '\')">' + esc(n) + '</button>';
      }).join('');
    block.innerHTML = '<span>Which brokers do you invest with? (optional)</span>'
      + '<div class="df-chip-wrap">' + chips + '</div>'
      + '<small>We’ll add these to your investing dashboard. You can connect Trading 212 automatically and add others after signing in.</small>';
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
        renderPills();
        renderValue();
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
    renderPills();
    renderValue();
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
