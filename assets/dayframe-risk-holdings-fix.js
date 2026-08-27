(() => {
  'use strict';

  const FLAG = 'data-dayframe-risk-holdings-fix';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  const IGNORE = new Set(['ALUS', 'YNDX', 'CFV']);
  const T212_ALIASES = {
    IPOE: 'SOFI',
    IPOD: 'SOFI',
    IPOF: 'SOFI',
    VACQ: 'RKLB',
    NPA: 'ASTS',
    TWND: 'BURU',
    CNDB: 'GCTS',
    TE: 'T1E',
    1337: 'GRAB',
    AGC: 'GRAB',
    ASTL: 'ASTL',
    YNDX: 'NBIS',
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

  function canonicalTicker(value, name = '', isin = '') {
    try {
      if (typeof canonicalT212Ticker === 'function') {
        return String(canonicalT212Ticker(value, name, isin) || '').toUpperCase();
      }
    } catch {}
    const raw = String(value || '').trim();
    const base = raw
      .replace(/\.(?:DE|US|GB|L|ST)$/i, '')
      .replace(/_(?:US|CA|GB|SGD|HKD|EUR|AUD|SG|DE)?_?EQ$/i, '')
      .replace(/_(?:US|CA|GB|SGD|HKD|EUR|AUD|SG|DE)$/i, '');
    const upper = base.toUpperCase().replace(/[^A-Z0-9.^=-]/g, '').slice(0, 20);
    const sivers = String(isin || '').trim().toUpperCase() === 'SE0003917798'
      || /sivers\s+semiconductors/i.test(String(name || ''))
      || /^2DG[A-Z]*$/i.test(base);
    return sivers ? 'SIVE' : (T212_ALIASES[upper] || upper);
  }

  function readUserJson(key, fallback = null) {
    try {
      const storageKey = typeof dfKey === 'function' ? dfKey(key) : key;
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function rawHoldings() {
    try {
      return Array.isArray(H) ? H : [];
    } catch {
      return [];
    }
  }

  function setHoldings(rows) {
    try {
      H = rows;
      return true;
    } catch {
      return false;
    }
  }

  function numberValue(...values) {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return NaN;
  }

  function isLivePosition(position) {
    const quantity = numberValue(position?.quantity, position?.ownedQuantity);
    const value = numberValue(position?.currentValue, position?.val, position?.walletImpact?.currentValue);
    if (!Number.isFinite(quantity) || quantity <= 0.0000001) return false;
    return !Number.isFinite(value) || value > 0.004;
  }

  function snapshotPositions(sourceData) {
    const direct = Array.isArray(sourceData?.positions) ? sourceData.positions : null;
    const saved = direct ? null : readUserJson('t212_last_snapshot_v1', null);
    const positions = direct || (Array.isArray(saved?.data?.positions) ? saved.data.positions : []);
    return positions.filter(isLivePosition);
  }

  function snapshotTickerSet(sourceData) {
    const positions = snapshotPositions(sourceData);
    const tickers = new Set();
    positions.forEach((position) => {
      const ticker = canonicalTicker(position?.ticker, position?.name, position?.isin);
      if (ticker && !IGNORE.has(ticker)) tickers.add(ticker);
    });
    return tickers;
  }

  function holdingHasValue(holding) {
    const value = numberValue(holding?.val, holding?.currentValue);
    if (!Number.isFinite(value) || value <= 0.004) return false;
    const quantity = numberValue(holding?.quantity);
    return !Number.isFinite(quantity) || quantity > 0.0000001;
  }

  function normalizePercentages(rows) {
    const total = rows.reduce((sum, holding) => sum + (Number(holding.val) || 0), 0);
    return rows.map((holding) => ({
      ...holding,
      pct: total > 0 ? +(((Number(holding.val) || 0) / total) * 100).toFixed(2) : 0,
    })).sort((a, b) => (Number(b.val) || 0) - (Number(a.val) || 0));
  }

  function activeHoldings(sourceData) {
    const snapshotSet = snapshotTickerSet(sourceData);
    const useSnapshotAsAuthority = snapshotSet.size > 0;
    return normalizePercentages(rawHoldings().filter((holding) => {
      const ticker = canonicalTicker(holding?.ticker, holding?.name, holding?.isin);
      if (!ticker || IGNORE.has(ticker) || !holdingHasValue(holding)) return false;
      if (holding?._manual) return true;
      return !useSnapshotAsAuthority || snapshotSet.has(ticker);
    }));
  }

  function pruneCurrentHoldings(sourceData) {
    const before = rawHoldings();
    if (!before.length) return false;
    const after = activeHoldings(sourceData);
    if (after.length === before.length && after.every((h, i) => h.ticker === before[i]?.ticker && h.pct === before[i]?.pct)) {
      return false;
    }
    return setHoldings(after);
  }

  function fixedRiskScore() {
    const holdings = activeHoldings();
    let score = 0;
    const specList = holdings
      .filter((h) => ['sell', 'review', 'watch'].includes(h.verdict) || Number(h.gainPct) < -20)
      .map((h) => h.ticker);
    const dilList = holdings.filter((h) => h.dilution).map((h) => h.ticker);
    const lossList = holdings.filter((h) => Number(h.gain) < 0).map((h) => h.ticker);
    const topHeavy = Number(holdings[0]?.pct) > 15 || Number(holdings[1]?.pct) > 12;
    const sectors = {};
    holdings.forEach((h) => {
      const sector = h.sector || 'Other';
      sectors[sector] = (sectors[sector] || 0) + (Number(h.val) || 0);
    });
    const total = holdings.reduce((sum, h) => sum + (Number(h.val) || 0), 0);
    const topSector = Object.values(sectors).sort((a, b) => b - a)[0] || 0;
    score += Math.min(specList.length * 0.5, 3);
    score += Math.min(dilList.length * 0.3, 2);
    score += Math.min(lossList.length * 0.2, 2);
    if (topHeavy) score += 1;
    if (total > 0 && (topSector / total) * 100 > 30) score += 1;
    score = holdings.length ? Math.min(Math.round(score + 2), 10) : 0;
    return {
      score,
      speculative: specList.length,
      diluted: dilList.length,
      inLoss: lossList.length,
      specList,
      dilList,
      lossList,
      holdings,
    };
  }

  function renderTickerPills(tickers) {
    return `<div style="display:flex;flex-wrap:wrap;gap:5px">${tickers.map((ticker) => (
      `<span class="tc" style="font-size:11px;cursor:pointer" data-open-chart="${esc(ticker)}">${esc(ticker)}</span>`
    )).join('')}</div>`;
  }

  function patchedRiskCard() {
    const el = document.getElementById('risk-card');
    if (!el) return;
    const { score, specList, dilList, lossList, holdings } = fixedRiskScore();
    if (!holdings.length) {
      el.innerHTML = '<div style="font-size:13px;color:var(--t3);line-height:1.65">Sync Trading 212 or add a manual holding to calculate risk from current positions.</div>';
      return;
    }
    const col = score <= 3 ? 'var(--gn)' : score <= 6 ? 'var(--am)' : 'var(--rd)';
    const label = score <= 3 ? 'Low risk' : score <= 5 ? 'Moderate risk' : score <= 7 ? 'High risk' : 'Very high risk';
    const riskClass = score <= 3 ? 'risk-2' : score <= 5 ? 'risk-4' : score <= 7 ? 'risk-6' : 'risk-7';
    el.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px">
        <span style="font-size:36px;font-weight:800;color:${col};letter-spacing:-.5px">${score}</span>
        <span style="font-size:15px;color:var(--t3);font-weight:500">/10</span>
        <span style="font-size:13px;font-weight:700;color:${col};margin-left:6px">${label}</span>
      </div>
      <div class="risk-bar" style="margin-bottom:14px"><div class="risk-fill ${riskClass}" style="width:${score * 10}%"></div></div>
      ${specList.length ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--rd);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Speculative positions (${specList.length})</div>${renderTickerPills(specList)}</div>` : ''}
      ${dilList.length ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--am);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Dilution risk (${dilList.length})</div>${renderTickerPills(dilList)}</div>` : ''}
      ${lossList.length ? `<div><div style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Currently in loss (${lossList.length})</div>${renderTickerPills(lossList)}</div>` : ''}
      <div style="font-size:10px;color:var(--t3);line-height:1.5;margin-top:12px">Based on current synced holdings only.</div>`;
  }

  function withActiveHoldings(fn, thisArg, args) {
    const original = rawHoldings();
    const active = activeHoldings();
    const same = active.length === original.length
      && active.every((holding, index) => holding.ticker === original[index]?.ticker && holding.pct === original[index]?.pct);
    if (!original.length || same) return fn.apply(thisArg, args);
    if (!setHoldings(active)) return fn.apply(thisArg, args);
    try {
      return fn.apply(thisArg, args);
    } finally {
      setHoldings(original);
    }
  }

  function gainText(holding) {
    const pct = Number(holding?.gainPct) || 0;
    return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  async function patchedGenToday() {
    const textEl = document.getElementById('today-text');
    const timeEl = document.getElementById('today-time');
    if (!textEl) return;
    if (typeof aiKey !== 'undefined' && !aiKey) {
      textEl.textContent = 'Dayframe AI is temporarily unavailable.';
      return;
    }
    const holdings = activeHoldings();
    if (!holdings.length) {
      textEl.textContent = 'Sync Trading 212 or add a manual holding first so this can use your current positions.';
      return;
    }
    textEl.innerHTML = '<span class="spin"></span>Thinking...';
    const { score } = fixedRiskScore();
    const topLosers = holdings.filter((h) => Number(h.gain) < 0).sort((a, b) => Number(a.gainPct) - Number(b.gainPct)).slice(0, 3);
    const topWinners = holdings.filter((h) => Number(h.gain) > 0).sort((a, b) => Number(b.gainPct) - Number(a.gainPct)).slice(0, 3);
    const holdingLine = holdings.map((h) => `${h.ticker} (${Number(h.pct || 0).toFixed(1)}% of current portfolio, ${gainText(h)})`).join(', ');
    const prompt = [
      'I am a beginner UK investor.',
      'Use only these current synced holdings: ' + holdingLine + '.',
      'My portfolio risk score is ' + score + '/10.',
      topLosers.length ? 'Current biggest losers: ' + topLosers.map((h) => h.ticker + ' ' + gainText(h)).join(', ') + '.' : 'No current holding is in loss.',
      topWinners.length ? 'Current biggest winners: ' + topWinners.map((h) => h.ticker + ' ' + gainText(h)).join(', ') + '.' : 'No current holding is in profit.',
      'In exactly 2 sentences, give the single most useful thing to review today.',
      'Do not mention any ticker outside the current synced holdings list unless it is a broad market index or clearly labelled market context.',
      'Do not give direct buy or sell commands. Use a cautious review framework.',
    ].join('\n');
    try {
      const result = await callClaude(prompt);
      if (!result) {
        textEl.textContent = 'No AI response returned.';
        return;
      }
      const clean = typeof cleanMD === 'function' ? cleanMD : (value) => esc(value).replace(/\n/g, '<br>');
      textEl.innerHTML = clean(result);
      if (timeEl) timeEl.textContent = 'Generated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      textEl.textContent = 'Could not generate: ' + (error?.message || 'AI request failed.');
    }
  }

  function rerenderRiskViews() {
    try { globalThis.rRiskCard?.(); } catch {}
    try { globalThis.rDashHealth?.(); } catch {}
    try {
      if (document.getElementById('pg-health')?.classList.contains('on')) globalThis.rHealth?.();
    } catch {}
  }

  function patchFunctions() {
    if (typeof globalThis.calcRiskScore === 'function' && !globalThis.calcRiskScore.__dayframeCurrentOnly) {
      fixedRiskScore.__dayframeCurrentOnly = true;
      globalThis.calcRiskScore = fixedRiskScore;
    }
    if (typeof globalThis.rRiskCard === 'function' && !globalThis.rRiskCard.__dayframeCurrentOnly) {
      patchedRiskCard.__dayframeCurrentOnly = true;
      globalThis.rRiskCard = patchedRiskCard;
    }
    if (typeof globalThis.genToday === 'function' && !globalThis.genToday.__dayframeCurrentOnly) {
      patchedGenToday.__dayframeCurrentOnly = true;
      globalThis.genToday = patchedGenToday;
    }
    if (typeof globalThis.rDashHealth === 'function' && !globalThis.rDashHealth.__dayframeCurrentOnly) {
      const original = globalThis.rDashHealth;
      const wrapped = function dayframeCurrentOnlyDashHealth() {
        return withActiveHoldings(original, this, arguments);
      };
      wrapped.__dayframeCurrentOnly = true;
      globalThis.rDashHealth = wrapped;
    }
    if (typeof globalThis.rHealth === 'function' && !globalThis.rHealth.__dayframeCurrentOnly) {
      const original = globalThis.rHealth;
      const wrapped = function dayframeCurrentOnlyHealth() {
        return withActiveHoldings(original, this, arguments);
      };
      wrapped.__dayframeCurrentOnly = true;
      globalThis.rHealth = wrapped;
    }
    if (typeof globalThis.applyT212Snapshot === 'function' && !globalThis.applyT212Snapshot.__dayframeCurrentOnly) {
      const original = globalThis.applyT212Snapshot;
      const wrapped = function dayframeCurrentOnlySnapshot(data, options) {
        const result = original.apply(this, arguments);
        pruneCurrentHoldings(data);
        rerenderRiskViews();
        return result;
      };
      wrapped.__dayframeCurrentOnly = true;
      globalThis.applyT212Snapshot = wrapped;
    }
    if (typeof globalThis.mergeManualIntoH === 'function' && !globalThis.mergeManualIntoH.__dayframeCurrentOnly) {
      const original = globalThis.mergeManualIntoH;
      const wrapped = function dayframeCurrentOnlyManualMerge() {
        const result = original.apply(this, arguments);
        rerenderRiskViews();
        return result;
      };
      wrapped.__dayframeCurrentOnly = true;
      globalThis.mergeManualIntoH = wrapped;
    }
  }

  function apply(render = true) {
    patchFunctions();
    const changed = pruneCurrentHoldings();
    if (render || changed) rerenderRiskViews();
  }

  const observer = new MutationObserver(() => {
    if (observer._queued) return;
    observer._queued = true;
    requestAnimationFrame(() => {
      observer._queued = false;
      apply(false);
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(apply, 300);
  setTimeout(apply, 1200);
  setTimeout(apply, 3000);
})();