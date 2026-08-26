(() => {
  'use strict';

  const FLAG = 'data-dayframe-news-sources';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
  const cleanTicker = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9.^=-]/g, '').slice(0, 20);

  const MARKET_ALIASES = { SIVE: 'SIVE.ST', SOI: 'SOI.PA', ALRIB: 'ALRIB.PA', IQEPF: 'IQE.L' };
  const T212_ALIASES = {
    IPOE: 'SOFI', IPOD: 'SOFI', IPOF: 'SOFI', VACQ: 'RKLB', NPA: 'ASTS', TWND: 'BURU',
    CNDB: 'GCTS', TE: 'T1E', 1337: 'GRAB', AGC: 'GRAB', ASTL: 'ASTL', YNDX: 'NBIS',
  };

  const style = document.createElement('style');
  style.textContent = `
    .df-source-news{display:grid;gap:8px}
    .df-source-news-card{border:1px solid var(--bd,#e2e6ef);border-radius:12px;background:var(--sf,#fff);padding:11px 12px;box-shadow:0 4px 14px rgba(28,36,58,.04);min-width:0}
    .df-source-news-card.compact{box-shadow:none;border-radius:10px;padding:9px 0;border-width:0 0 1px;background:transparent}
    .df-source-news-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px}
    .df-source-news-ticker{font-size:10px;font-weight:850;background:var(--blb,#eef2ff);color:var(--bl,#5263c6);border:1px solid var(--blbr,#d7ddff);padding:2px 7px;border-radius:6px;letter-spacing:.2px}
    .df-source-news-meta{font-size:9px;font-weight:750;color:var(--t3,#8993a5);text-transform:uppercase;letter-spacing:.35px}
    .df-source-news-title{font-size:12.5px;line-height:1.45;font-weight:650;color:var(--tx,#172033);text-decoration:none;overflow-wrap:anywhere}
    .df-source-news-title:hover{text-decoration:underline}
    .df-source-news-summary{font-size:12px;color:var(--t2,#586274);line-height:1.6;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd,#e2e6ef)}
    .df-source-news-foot{font-size:10px;color:var(--t3,#8993a5);line-height:1.5;margin-top:7px}
    .df-source-empty{font-size:12px;color:var(--t3,#8993a5);line-height:1.65;padding:10px 0}
    .df-source-pill{display:inline-flex;align-items:center;border:1px solid #dfe4ee;background:#f8f9fc;color:#687389;border-radius:999px;padding:3px 8px;font-size:9.5px;font-weight:800}
  `;
  document.head.appendChild(style);

  function canonicalTicker(value, name = '', isin = '') {
    const raw = String(value || '').trim();
    const base = raw.replace(/\.(?:DE|US|GB|L|ST)$/i, '')
      .replace(/_(?:US|CA|GB|SGD|HKD|EUR|AUD|SG|DE)?_?EQ$/i, '')
      .replace(/_(?:US|CA|GB|SGD|EUR|AUD|SG|DE)$/i, '');
    const upper = cleanTicker(base);
    const sivers = String(isin || '').trim().toUpperCase() === 'SE0003917798'
      || /sivers\s+semiconductors/i.test(String(name || ''))
      || /^2DG[A-Z]*$/i.test(base);
    return sivers ? 'SIVE' : (T212_ALIASES[upper] || upper);
  }

  function userJson(key, fallback) {
    try {
      if (typeof globalThis.dfKey !== 'function') return fallback;
      const raw = localStorage.getItem(globalThis.dfKey(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function contextFor(ticker) {
    try {
      return typeof globalThis.stockContext === 'function' ? globalThis.stockContext(ticker) : null;
    } catch {
      return null;
    }
  }

  function addHolding(map, ticker, meta = {}, rank = 50) {
    const safe = cleanTicker(canonicalTicker(ticker, meta.name, meta.isin));
    if (!safe) return;
    const ctx = contextFor(safe) || {};
    const next = {
      ticker: safe,
      name: String(meta.name || ctx.name || safe),
      isin: String(meta.isin || ctx.isin || ''),
      val: Number(meta.val ?? meta.currentValue ?? ctx.val ?? 0) || 0,
      rank,
    };
    const previous = map.get(safe);
    if (!previous || next.rank < previous.rank || (next.val && !previous.val)) map.set(safe, { ...previous, ...next });
  }

  function currentHoldings(limit = 8, includeWatchlist = false) {
    const map = new Map();
    const snapshot = userJson('t212_last_snapshot_v1', null);
    const positions = Array.isArray(snapshot?.data?.positions) ? snapshot.data.positions : [];
    positions.filter((p) => Number(p?.quantity) > 0 && Number(p?.currentValue) > 0)
      .sort((a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0))
      .forEach((p) => addHolding(map, p.ticker, { name: p.name, isin: p.isin, currentValue: p.currentValue }, 10));

    const manual = userJson('p_manual_holdings', []);
    if (Array.isArray(manual)) manual.forEach((h) => addHolding(map, h.ticker, { name: h.name, val: h.val }, 15));

    document.querySelectorAll('#hbody .tc, #news-ticker-sel option, #dash-research-holdings button').forEach((node) => {
      addHolding(map, node.value || node.textContent, {}, 25);
    });
    document.querySelectorAll('.invest-holding-chip[data-tk]').forEach((node) => {
      addHolding(map, node.getAttribute('data-tk'), { name: node.querySelector('small')?.textContent }, 20);
    });

    if (!map.size && includeWatchlist) {
      const watchlist = userJson('p_wl', []);
      if (Array.isArray(watchlist)) watchlist.slice(0, limit).forEach((ticker) => addHolding(map, ticker, {}, 40));
    }
    return [...map.values()].sort((a, b) => (b.val || 0) - (a.val || 0) || a.rank - b.rank).slice(0, limit);
  }

  function researchSymbol(ticker) {
    try {
      if (typeof globalThis.marketSymbolFor === 'function') {
        const symbol = cleanTicker(globalThis.marketSymbolFor(ticker));
        if (symbol) return symbol;
      }
    } catch {}
    const safe = cleanTicker(ticker);
    return MARKET_ALIASES[safe] || safe;
  }

  function formatDate(value, withTime = false) {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 32);
    return withTime
      ? date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async function signedFetch(input, options) {
    if (typeof globalThis.dfBankFetch === 'function') return globalThis.dfBankFetch(input, options);
    return fetch(input, options);
  }

  async function fetchResearch(holding) {
    const ticker = cleanTicker(holding?.ticker);
    if (!ticker) return { ticker, news: [] };
    const symbol = researchSymbol(ticker);
    const search = [holding?.name, holding?.isin].map((part) => String(part || '').trim()).filter(Boolean).join(' ');
    const response = await signedFetch('/api/investing/research/' + encodeURIComponent(symbol) + (search ? '?search=' + encodeURIComponent(search) : ''));
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.error || ('Research request failed for ' + ticker));
    const raw = Array.isArray(data.news) ? data.news : (Array.isArray(data) ? data : []);
    return {
      ticker,
      symbol,
      data,
      news: raw.map((item) => ({
        ticker,
        symbol,
        title: String(item?.title || item?.headline || 'Untitled headline').trim(),
        publisher: String(item?.publisher || item?.source || 'Source').trim(),
        published_at: item?.published_at || item?.date || '',
        url: String(item?.url || item?.link || '').trim(),
        summary: String(item?.summary || item?.desc || '').trim(),
        related_tickers: Array.isArray(item?.related_tickers) ? item.related_tickers : [],
      })).filter((item) => item.title && item.title !== 'Untitled headline'),
    };
  }

  async function collectHeadlines(options = {}) {
    const holdings = currentHoldings(options.holdingLimit || 8, !!options.includeWatchlist);
    if (!holdings.length) return { holdings, news: [], research: [], errors: [] };
    const settled = await Promise.allSettled(holdings.map(fetchResearch));
    const seen = new Set();
    const news = [];
    const research = [];
    const errors = [];
    settled.forEach((result) => {
      if (result.status !== 'fulfilled') {
        errors.push(String(result.reason?.message || result.reason || 'A source could not be loaded.'));
        return;
      }
      research.push(result.value);
      result.value.news.slice(0, options.perTicker || 3).forEach((item) => {
        const key = (item.url || item.title).toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        news.push(item);
      });
    });
    news.sort((a, b) => (new Date(b.published_at).getTime() || 0) - (new Date(a.published_at).getTime() || 0));
    return { holdings, news: news.slice(0, options.total || 8), research, errors };
  }

  async function collectMarketContext() {
    const base = await collectHeadlines({ holdingLimit: 8, perTicker: 1, total: 10 });
    if (!base.holdings.length) return base;
    const marketSettled = await Promise.allSettled([
      { ticker: 'SPY', name: 'S&P 500 market ETF' },
      { ticker: 'QQQ', name: 'Nasdaq 100 market ETF' },
    ].map(fetchResearch));
    const seen = new Set();
    const combined = [];
    const add = (item) => {
      const key = (item.url || item.title).toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      combined.push(item);
    };
    marketSettled.forEach((result) => {
      if (result.status !== 'fulfilled') {
        base.errors.push(String(result.reason?.message || result.reason || 'A market source could not be loaded.'));
        return;
      }
      base.research.push(result.value);
      result.value.news.slice(0, 3).forEach(add);
    });
    base.news.forEach(add);
    combined.sort((a, b) => (new Date(b.published_at).getTime() || 0) - (new Date(a.published_at).getTime() || 0));
    return { ...base, news: combined.slice(0, 12) };
  }

  globalThis.dfToggleSourceNews = function dfToggleSourceNews(id, toggleId) {
    const detail = document.getElementById(id);
    const toggle = document.getElementById(toggleId);
    if (!detail) return;
    const open = detail.style.display === 'block';
    detail.style.display = open ? 'none' : 'block';
    if (toggle) toggle.textContent = open ? '▸' : '▾';
  };

  function newsItem(item, index, options = {}) {
    const detailId = `df-news-detail-${options.full ? 'full' : 'mini'}-${index}`;
    const toggleId = `df-news-toggle-${options.full ? 'full' : 'mini'}-${index}`;
    const href = /^https?:\/\//i.test(item.url || '') ? item.url : '';
    const title = href
      ? `<a class="df-source-news-title" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a>`
      : `<div class="df-source-news-title">${esc(item.title)}</div>`;
    const details = `<div id="${detailId}" class="df-source-news-summary" style="display:none">${item.summary ? `<div>${esc(item.summary)}</div>` : '<div>Open the source and check whether it changes revenue, cash, debt, dilution risk, guidance, regulation or position size.</div>'}<div class="df-source-news-foot">Source: ${esc(item.publisher)} · ${esc(formatDate(item.published_at, true))}</div><div style="margin-top:8px"><button class="btn ba" style="font-size:10px;padding:5px 9px" type="button" data-open-chart="${esc(item.ticker)}">Open ${esc(item.ticker)} research</button></div></div>`;
    return `<div class="df-source-news-card${options.compact ? ' compact' : ''}" style="${options.compact ? '' : 'margin-bottom:10px;overflow:hidden;border-left:3px solid #6574d6'}"><div style="display:flex;align-items:flex-start;gap:10px;cursor:pointer" onclick="dfToggleSourceNews('${detailId}','${toggleId}')"><div style="flex:1;min-width:0"><div class="df-source-news-top"><span class="df-source-news-ticker">${esc(item.ticker)}</span>${options.full ? '<span class="df-source-pill">Dated source</span>' : ''}<span class="df-source-news-meta">${esc(item.publisher)} · ${esc(formatDate(item.published_at))}</span></div>${title}</div><span style="font-size:10px;color:var(--t3);flex-shrink:0;margin-top:2px" id="${toggleId}">▸</span></div>${details}</div>`;
  }

  function emptyNews(errors = []) {
    const authHint = errors.some((message) => /401|sign|session|auth/i.test(message));
    return `<div class="df-source-empty">${authHint ? 'Sign in again to load signed, source-backed market requests.' : 'No dated headlines were returned from current sources yet. Try again later or open an individual stock research page.'}</div>`;
  }

  function renderRawMarket(body, news, holdings) {
    if (!news.length) {
      body.innerHTML = emptyNews();
      return;
    }
    const owned = new Set(holdings.map((h) => h.ticker));
    body.innerHTML = news.slice(0, 5).map((item) => {
      const related = [item.ticker, ...(item.related_tickers || []).map(cleanTicker)].filter((ticker, i, arr) => ticker && owned.has(ticker) && arr.indexOf(ticker) === i).slice(0, 4);
      return '<article class="macro-evidence-item"><div class="macro-evidence-head"><span style="color:var(--bl)">SOURCE</span><small>' + esc(formatDate(item.published_at)) + '</small></div><strong>' + esc(item.title) + '</strong>' +
        (related.length ? '<div class="macro-evidence-tickers">' + related.map((ticker) => '<button type="button" data-open-chart="' + esc(ticker) + '">' + esc(ticker) + '</button>').join('') + '</div>' : '') +
        '<p>Check whether this changes the company thesis, guidance, cash needs, debt, dilution risk, regulation, or the position size you are comfortable with.</p><small>Evidence: ' + esc(item.publisher) + (item.url ? ' · <a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">Open source</a>' : '') + '</small></article>';
    }).join('') + '<div class="macro-evidence-foot">Fetched from signed research sources at ' + esc(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) + ' · educational, not financial advice</div>';
  }

  function patchNews() {
    if (!globalThis.fetchMiniNews?.__dayframeSourceBacked) {
      const fetchMiniNews = async () => {
        const out = document.getElementById('mini-news-out');
        if (!out) return;
        out.innerHTML = '<div class="ldg"><span class="spin"></span>Loading sourced headlines...</div>';
        try {
          const { holdings, news, errors } = await collectHeadlines({ holdingLimit: 8, perTicker: 2, total: 6 });
          if (!holdings.length) {
            out.innerHTML = '<div class="df-source-empty">Connect or sync holdings first, then this card can show source-backed headlines for companies you own.</div>';
            return;
          }
          out.innerHTML = news.length ? '<div class="df-source-news">' + news.map((item, i) => newsItem(item, i, { compact: true })).join('') + '</div><div class="df-source-news-foot">Live sources checked ' + esc(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) + ' · open sources before acting.</div>' : emptyNews(errors);
        } catch (error) {
          out.innerHTML = emptyNews([String(error?.message || error)]);
        }
      };
      fetchMiniNews.__dayframeSourceBacked = true;
      globalThis.fetchMiniNews = fetchMiniNews;
    }

    if (!globalThis.fetchNews?.__dayframeSourceBacked) {
      const fetchNews = async () => {
        const out = document.getElementById('news-out');
        const spin = document.getElementById('news-spin');
        if (!out) return;
        if (spin) spin.style.display = 'inline-block';
        out.innerHTML = '<div class="ldg"><span class="spin"></span>Loading dated headlines...</div>';
        try {
          const { holdings, news, errors } = await collectHeadlines({ holdingLimit: 8, perTicker: 3, total: 10, includeWatchlist: true });
          if (spin) spin.style.display = 'none';
          if (!holdings.length) {
            out.innerHTML = '<div class="df-source-empty">Connect holdings or add watchlist tickers, then Dayframe can load source-backed headlines here.</div>';
            return;
          }
          const sig = document.getElementById('sig-ts');
          if (sig) sig.textContent = 'Last updated: ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          out.innerHTML = news.length ? news.map((item, i) => newsItem(item, i, { full: true })).join('') + '<div class="df-source-news-foot">Headlines are fetched from the signed research endpoint and shown without AI guessing. Use AI analysis only as a second-pass explanation.</div>' : emptyNews(errors);
        } catch (error) {
          if (spin) spin.style.display = 'none';
          out.innerHTML = emptyNews([String(error?.message || error)]);
        }
      };
      fetchNews.__dayframeSourceBacked = true;
      globalThis.fetchNews = fetchNews;
    }

    if (!globalThis.loadMacroEvents?.__dayframeSourceBacked) {
      const loadMacroEvents = async () => {
        const body = document.getElementById('macro-events-body');
        if (!body) return;
        body.style.display = 'block';
        body.innerHTML = '<div class="ldg"><span class="spin"></span>Checking dated market headlines...</div>';
        try {
          const { holdings, news, errors } = await collectMarketContext();
          if (!holdings.length) {
            body.innerHTML = '<div class="df-source-empty">Sync holdings first, then this card can connect current headlines to companies you own.</div>';
            return;
          }
          if (!news.length) {
            body.innerHTML = emptyNews(errors);
            return;
          }
          const tickers = holdings.map((h) => h.ticker);
          let result = '';
          if (typeof globalThis.callClaude === 'function') {
            const evidence = news.slice(0, 12).map((item, i) => '[H' + (i + 1) + '] ' + formatDate(item.published_at, true) + ' | ' + item.publisher + ' | ' + item.ticker + ' | ' + item.title).join('\n');
            try {
              result = await globalThis.callClaude('Use ONLY the dated headline evidence below. Do not add facts from memory. Evidence may include broad-market references such as SPY or QQQ plus company-specific headlines. The user is a UK beginner investor and holds: ' + tickers.join(', ') + '.\n\n' + evidence + '\n\nReturn up to five items using exactly:\nEVENT: ...\nTYPE: ONGOING or UPCOMING\nIMPACT: UP or DOWN or MIXED\nSTOCKS: comma-separated tickers from the user list only\nREASON: explain simply why it may matter\nWATCH: what evidence to watch next, without telling the user to buy or sell\nSOURCE: one or more H labels\n---', 850);
            } catch {}
          }
          const get = (part, key) => (part.match(new RegExp(key + ':\\s*([^\\n]+)', 'i')) || [])[1]?.trim() || '';
          const events = String(result || '').split(/---+/).map((part) => part.trim()).filter((part) => /EVENT:/i.test(part));
          if (!events.length) {
            renderRawMarket(body, news, holdings);
            return;
          }
          body.innerHTML = events.slice(0, 5).map((part) => {
            const impact = esc(get(part, 'IMPACT').toUpperCase() || 'MIXED');
            const type = esc(get(part, 'TYPE').toUpperCase() || 'ONGOING');
            const stocks = get(part, 'STOCKS').split(',').map(cleanTicker).filter((ticker) => tickers.includes(ticker));
            const col = impact === 'UP' ? 'var(--gn)' : impact === 'DOWN' ? 'var(--rd)' : 'var(--am)';
            return '<article class="macro-evidence-item"><div class="macro-evidence-head"><span style="color:' + col + '">' + impact + '</span><small>' + type + '</small></div><strong>' + esc(get(part, 'EVENT')) + '</strong>' +
              (stocks.length ? '<div class="macro-evidence-tickers">' + stocks.map((ticker) => '<button type="button" data-open-chart="' + esc(ticker) + '">' + esc(ticker) + '</button>').join('') + '</div>' : '') +
              '<p>' + esc(get(part, 'REASON')) + '</p><p><b>Watch:</b> ' + esc(get(part, 'WATCH')) + '</p><small>Evidence: ' + esc(get(part, 'SOURCE')) + '</small></article>';
          }).join('') + '<div class="macro-evidence-foot">Based only on dated headlines fetched at ' + esc(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) + ' · educational, not financial advice</div>';
        } catch (error) {
          body.innerHTML = emptyNews([String(error?.message || error)]);
        }
      };
      loadMacroEvents.__dayframeSourceBacked = true;
      globalThis.loadMacroEvents = loadMacroEvents;
    }

    if (!globalThis.loadNow?.__dayframeSourceBacked) {
      const loadNow = async (tk, h) => {
        const body = document.getElementById('now-body');
        const ticker = cleanTicker(tk);
        if (!body || !ticker) return;
        body.innerHTML = '<div class="ldg"><span class="spin"></span>Checking current evidence...</div>';
        try {
          const ctx = contextFor(ticker) || {};
          const research = await fetchResearch({ ticker, name: h?.name || ctx.name || ticker, isin: h?.isin || ctx.isin || '', val: h?.val });
          const news = research.news.slice(0, 5);
          const evidence = news.map((item, i) => '[H' + (i + 1) + '] ' + formatDate(item.published_at, true) + ' | ' + item.publisher + ' | ' + item.title).join('\n');
          let result = '';
          if (evidence && typeof globalThis.callClaude === 'function') {
            const position = h?.val > 0 ? 'The user owns this stock. Current value: GBP ' + Number(h.val).toFixed(0) + '. P&L: ' + (Number(h.gain) >= 0 ? '+' : '') + Number(h.gain || 0).toFixed(0) + ' (' + Number(h.gainPct || 0).toFixed(1) + '%).' : 'The user is researching this stock.';
            try {
              result = await globalThis.callClaude('Use ONLY this dated evidence. Do not add remembered news, prices, contracts or dates. If evidence is thin, say so. ' + position + '\n\n' + evidence + '\n\nFormat exactly:\nLATEST: [what the evidence says]\nMARKET: [how it could matter]\nWATCH: [specific evidence to monitor next]\nREVIEW: [one cautious next-step framework, no buy/sell command]\nSOURCES: [H labels used]', 800);
            } catch {}
          }
          const section = (key) => (String(result || '').match(new RegExp(key + ':\\s*([\\s\\S]*?)(?=\\n[A-Z]+:|$)', 'i')) || [])[1]?.trim() || '';
          const latest = section('LATEST');
          const market = section('MARKET');
          const watch = section('WATCH');
          const review = section('REVIEW');
          const sources = section('SOURCES');
          const row = (label, text, col) => '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--bd)"><div><div style="font-size:10px;font-weight:700;color:' + col + ';text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">' + label + '</div><div style="font-size:13px;color:var(--t2);line-height:1.65">' + esc(text) + '</div></div></div>';
          if (latest || market || watch || review) {
            body.innerHTML = (latest ? row('Latest evidence', latest, 'var(--bl)') : '') + (market ? row('Market context', market, '#7c3aed') : '') + (watch ? row('What to watch', watch, '#b45309') : '') + (review ? '<div style="margin-top:12px;padding:10px 14px;background:var(--blb);border:1px solid var(--blbr);border-radius:8px"><div style="font-size:10px;font-weight:700;color:var(--bl);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Review framework</div><div style="font-size:13px;color:var(--tx);font-weight:600;line-height:1.6">' + esc(review) + '</div></div>' : '') + '<div style="font-size:10px;color:var(--t3);margin-top:8px">Live sources: signed research endpoint' + (sources ? ' · Evidence: ' + esc(sources) : '') + ' · educational, not financial advice</div>';
            return;
          }
          body.innerHTML = news.length ? news.map((item, i) => newsItem(item, i, { compact: true })).join('') + '<div class="df-source-news-foot">Open the sources and check whether the headline changes the original thesis.</div>' : emptyNews();
        } catch (error) {
          body.innerHTML = emptyNews([String(error?.message || error)]);
        }
      };
      loadNow.__dayframeSourceBacked = true;
      globalThis.loadNow = loadNow;
    }
  }

  function repairStaleMessages() {
    const stale = /(do not have access to real-time news|don.?t have access to real-time news|No current headlines were available|no live news available|Add AI key for news|No news found)/i;
    [['mini-news-out', 'fetchMiniNews'], ['news-out', 'fetchNews'], ['macro-events-body', 'loadMacroEvents']].forEach(([id, fn], index) => {
      const el = document.getElementById(id);
      if (el && stale.test(el.textContent || '') && el.dataset.dayframeNewsRepair !== '1') {
        el.dataset.dayframeNewsRepair = '1';
        setTimeout(() => globalThis[fn]?.(), 60 + index * 30);
      }
    });
  }

  function apply() {
    patchNews();
    repairStaleMessages();
  }

  const observer = new MutationObserver(() => {
    if (observer._queued) return;
    observer._queued = true;
    requestAnimationFrame(() => {
      observer._queued = false;
      apply();
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setTimeout(apply, 300);
  setTimeout(apply, 1200);
})();
