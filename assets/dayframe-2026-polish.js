(() => {
  'use strict';

  const RUN_FLAG = 'data-dayframe-2026-polish';
  const STYLE_ID = 'df-polish-style';
  if (document.documentElement.hasAttribute(RUN_FLAG)) return;
  document.documentElement.setAttribute(RUN_FLAG, 'true');

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

  const replacements = new Map([
    ['Already down 80%. More bad news = exit completely.', 'Already down sharply. Review whether fresh evidence still supports holding any position.'],
    ['EML era ending. Sell AAOI immediately on this news.', 'If this happens, review AAOI against current evidence before keeping or adding risk.'],
    ['EML cycle ending faster. Rotate into AXTI/TSEM.', 'Review whether the thesis is weakening, then compare alternatives only with fresh evidence.'],
    ['Thesis is dead. Cut losses and redeploy.', 'Treat this as a thesis-break review and decide using position size, evidence and risk.'],
    ['Take profits. EML cycle in final stages.', 'Review whether to trim profits, especially if the position has grown beyond plan.'],
    ['Bad for SoFi. Consider reducing.', 'Review SoFi sizing and sensitivity before changing the position.'],
    ['CPO wave arriving. Add more AXTI - this is the catalyst.', 'A possible catalyst. Check source quality and position size before adding risk.'],
    ['Major milestone. Consider adding to position.', 'Major milestone. Recheck valuation, position size and downside before adding.'],
    ['Huge tailwind for SoFi. Hold tight or add.', 'Potential tailwind. Hold or add only if the thesis and sizing still fit.'],
    ['most important stock in your portfolio', 'a stock idea that needs fresh evidence before it earns size'],
    ['Should you copy this trade?', 'Could this trade fit your plan?'],
    ['specific stop loss', 'risk level to review'],
    ['Buy More', 'Review Add'],
    ['Strong Buy', 'Strong case'],
  ]);

  function byId(id) {
    return document.getElementById(id);
  }

  function idle(callback, timeout = 900) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 0);
    }
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #df-money-guidance,#df-invest-guidance,#pg-driving-costs,#df-car-costs-section,[data-driving-page="driving-costs"],[data-dayframe-polish="driving-costs-card"],.df-polish-nav-costs,[onclick*="driving-costs"]{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function removeDrivingCostsEntry() {
    byId('pg-driving-costs')?.remove();
    byId('df-car-costs-section')?.remove();
    document.querySelectorAll('[data-driving-page="driving-costs"], [data-dayframe-polish="driving-costs-card"], .df-polish-nav-costs, [onclick*="driving-costs"]').forEach((node) => {
      const target = node.closest('button,a,[role="button"],li') || node;
      target.remove();
    });
    document.querySelectorAll('#driving-sidepanel *, .driving-side-nav *').forEach((node) => {
      if ((node.textContent || '').trim().toLowerCase() === 'driving costs') {
        const target = node.closest('button,a,[role="button"],li') || node;
        target.remove();
      }
    });
  }

  function removeDismissedGuidance() {
    byId('df-money-guidance')?.remove();
    byId('df-invest-guidance')?.remove();
  }

  function softenDirectAdvice(root = document.body) {
    if (!root || root.__dayframeAdviceSoftened) return;
    root.__dayframeAdviceSoftened = true;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        const text = node.nodeValue || '';
        for (const phrase of replacements.keys()) {
          if (text.includes(phrase)) return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let text = node.nodeValue || '';
      replacements.forEach((to, from) => { text = text.split(from).join(to); });
      node.nodeValue = text;
    });
  }

  let applyQueued = false;
  function queueApply(includeAdvice = false) {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(() => {
      idle(() => {
        applyQueued = false;
        ensureStyle();
        removeDrivingCostsEntry();
        removeDismissedGuidance();
        patchGo();
        patchWatchlistAI();
        if (includeAdvice) softenDirectAdvice();
      });
    });
  }

  function patchGo() {
    if (typeof globalThis.go !== 'function' || globalThis.go.__dayframePolished) return;
    const original = globalThis.go;
    const wrapped = function patchedGo(name, btn) {
      const target = name === 'driving-costs' ? 'driving-car' : name;
      const result = original.call(this, target, btn);
      queueApply(false);
      return result;
    };
    wrapped.__dayframePolished = true;
    globalThis.go = wrapped;
  }

  function patchWatchlistAI() {
    if (globalThis.analyseWL?.__dayframePolished) return;
    if (typeof globalThis.callClaude !== 'function') return;
    const patched = async function analyseWatchlistWithSafeMarkup() {
      const out = byId('dash-wl-analysis') || byId('wl-analysis');
      if (!out) return;
      if (typeof aiKey !== 'undefined' && !aiKey) {
        if (typeof noKey === 'function') noKey(out);
        return;
      }
      if (typeof WL === 'undefined' || !WL.length) {
        out.innerHTML = '<div style="color:var(--t3);font-size:13px;font-weight:500">Add stocks below first.</div>';
        return;
      }
      out.innerHTML = '<div class="ldg"><span class="spin"></span>Deep analysing your watchlist...</div>';
      const prompt = [
        'Analyse this watchlist for education only: ' + WL.join(', ') + '.',
        'For each [TICKER], give: stance using Review/Add/Hold/Trim/Avoid, reason, evidence to verify, key risk, one catalyst, and what would change the decision.',
        'Do not write direct buy/sell instructions. Prefer position-sizing, source quality and thesis-break triggers.',
      ].join('\n');
      try {
        const result = await globalThis.callClaude(prompt, 900);
        if (!result) {
          if (typeof noKey === 'function') noKey(out);
          return;
        }
        const safe = typeof hubEsc === 'function' ? hubEsc : esc;
        const clean = typeof cleanMD === 'function' ? cleanMD : (text) => safe(text).replace(/\n/g, '<br>');
        const items = [];
        const lines = String(result).split('\n').filter((line) => line.trim());
        let current = null;
        let buffer = [];
        for (const line of lines) {
          const match = line.match(/^\[([A-Z0-9.^=-]+)\]/);
          if (match) {
            if (current) items.push({ ticker: current, text: buffer.join(' ') });
            current = match[1];
            buffer = [line.replace(/^\[[A-Z0-9.^=-]+\]\s*/, '').trim()].filter(Boolean);
          } else if (current) {
            buffer.push(line.trim());
          }
        }
        if (current) items.push({ ticker: current, text: buffer.join(' ') });
        out.innerHTML = items.length
          ? `<div style="font-size:12px;color:var(--t3);margin-bottom:12px;font-weight:500">Watchlist review powered by Dayframe AI. Verify fresh sources before acting. ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>` +
            items.map((item) => `<div class="aip inf" style="margin-bottom:12px"><div class="at">${safe(item.ticker)}</div><div class="ax">${safe(item.text)}</div></div>`).join('')
          : `<div class="ax" style="line-height:1.75">${clean(result)}</div>`;
        softenDirectAdvice(out);
      } catch (error) {
        out.innerHTML = `<div style="color:var(--rd);font-size:13px">Error: ${esc(error?.message || 'Could not analyse the watchlist.')}</div>`;
      }
    };
    patched.__dayframePolished = true;
    globalThis.analyseWL = patched;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => queueApply(true), { once: true });
  } else {
    queueApply(true);
  }

  [300, 1200, 3000].forEach((delay) => setTimeout(() => queueApply(delay === 1200), delay));
})();
