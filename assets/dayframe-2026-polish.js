(() => {
  'use strict';

  const RUN_FLAG = 'data-dayframe-2026-polish';
  if (document.documentElement.hasAttribute(RUN_FLAG)) return;
  document.documentElement.setAttribute(RUN_FLAG, 'true');

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
  const html = (strings, ...values) => strings.reduce((out, part, i) => out + part + (i < values.length ? values[i] : ''), '');

  const style = document.createElement('style');
  style.textContent = `
    .df-polish-panel{margin:16px 0 20px}
    .df-polish-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:0 0 10px}
    .df-polish-head span{font-size:9px;font-weight:850;letter-spacing:.9px;text-transform:uppercase;color:#6c7588}
    .df-polish-head h2{margin:3px 0 0;font-family:var(--fd,serif);font-size:18px;line-height:1.2;color:#20293b}
    .df-polish-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .df-polish-card{min-width:0;border:1px solid #e3e7ef;border-radius:14px;background:#fff;padding:14px 15px;box-shadow:0 8px 22px rgba(35,45,68,.045)}
    .df-polish-card b{display:block;font-size:12px;line-height:1.35;color:#263044;margin-bottom:6px}
    .df-polish-card p{margin:0;font-size:10.5px;line-height:1.58;color:#737d90}
    .df-polish-card a{display:inline-flex;margin-top:8px;font-size:9px;font-weight:800;color:#5968ca;text-decoration:none}
    .df-polish-card a:hover{text-decoration:underline}
    .df-polish-card.green{box-shadow:inset 0 3px 0 #45ad86,0 8px 22px rgba(35,45,68,.045)}
    .df-polish-card.blue{box-shadow:inset 0 3px 0 #6478d8,0 8px 22px rgba(35,45,68,.045)}
    .df-polish-card.amber{box-shadow:inset 0 3px 0 #d99542,0 8px 22px rgba(35,45,68,.045)}
    .df-polish-card.rose{box-shadow:inset 0 3px 0 #db7483,0 8px 22px rgba(35,45,68,.045)}
    .df-polish-card.violet{box-shadow:inset 0 3px 0 #8a72da,0 8px 22px rgba(35,45,68,.045)}
    .df-polish-mini-note{margin-top:9px;padding:10px 11px;border:1px solid #e7ebf2;border-radius:12px;background:#fafbfe;color:#7f8899;font-size:9.5px;line-height:1.55}
    @media(max-width:900px){.df-polish-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:620px){.df-polish-head{align-items:flex-start;flex-direction:column}.df-polish-grid{grid-template-columns:1fr}.df-polish-card{padding:13px}.df-polish-panel{margin:14px 0 18px}}
  `;
  document.head.appendChild(style);

  function card(tone, title, body, href, label) {
    return html`<article class="df-polish-card ${tone}"><b>${esc(title)}</b><p>${esc(body)}</p>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label || 'Open source')}</a>` : ''}</article>`;
  }

  function panel(id, kicker, title, cards, note) {
    return html`
      <section class="df-polish-panel" id="${id}">
        <div class="df-polish-head"><div><span>${esc(kicker)}</span><h2>${esc(title)}</h2></div></div>
        <div class="df-polish-grid">${cards.join('')}</div>
        ${note ? `<div class="df-polish-mini-note">${esc(note)}</div>` : ''}
      </section>
    `;
  }

  function insertAfter(target, markup, id) {
    if (document.getElementById(id)) return;
    const node = typeof target === 'string' ? document.querySelector(target) : target;
    if (!node) return;
    node.insertAdjacentHTML('afterend', markup);
  }

  function removeDrivingCostsEntry() {
    const costsPage = document.getElementById('pg-driving-costs');
    if (costsPage) costsPage.remove();
    document.getElementById('df-car-costs-section')?.remove();
    document.querySelectorAll('[data-driving-page="driving-costs"], [data-dayframe-polish="driving-costs-card"], .df-polish-nav-costs, [onclick*="driving-costs"]').forEach((node) => {
      if (node.matches('#pg-driving-costs')) return;
      const target = node.closest('button,a,[role="button"],li') || node;
      target.remove();
    });
    document.querySelectorAll('#driving-sidepanel *, .driving-side-nav *').forEach((node) => {
      const text = (node.textContent || '').trim().toLowerCase();
      if (text === 'driving costs') {
        const target = node.closest('button,a,[role="button"],li') || node;
        target.remove();
      }
    });
  }

  function addDrivingCostsNav() {
    removeDrivingCostsEntry();
  }

  function addDrivingCostsCard() {
    removeDrivingCostsEntry();
  }

  function addDrivingGuidance() {
    const target = document.querySelector('#pg-driving-theory .driving-tracker-head');
    const existing = document.getElementById('df-driving-guidance');
    if (!target) {
      existing?.remove();
      return;
    }
    if (existing && existing.previousElementSibling === target) return;
    existing?.remove();
    const markup = panel('df-driving-guidance', 'Official checks', 'Theory, hazard perception and first-car admin', [
      card('blue', 'Theory test facts', 'The car theory test is 50 multiple-choice questions in 57 minutes. The current pass mark is 43 out of 50.', 'https://www.gov.uk/theory-test/pass-mark-and-result', 'GOV.UK pass marks'),
      card('amber', 'Hazard perception', 'The hazard section has 14 video clips. There are 15 scoreable developing hazards, worth up to 5 marks each; the car pass mark is 44 out of 75.', 'https://www.gov.uk/theory-test/hazard-perception-test', 'GOV.UK hazards'),
      card('green', 'Practice rhythm', 'Keep a mistakes list, repeat weak Highway Code topics, and do hazard clips when you are awake enough to spot movement early.'),
    ], 'GOV.UK lists The Highway Code as updated on 22 October 2025. Keeping these official links beside the theory tracker helps users verify the rules they are learning.');
    insertAfter(target, markup, 'df-driving-guidance');
  }

  function removeDismissedGuidance() {
    document.getElementById('df-money-guidance')?.remove();
    document.getElementById('df-invest-guidance')?.remove();
  }

  function addMoneyGuidance() {
    removeDismissedGuidance();
  }

  function addInvestingGuidance() {
    removeDismissedGuidance();
  }

  const replacements = new Map([
    ['Already down 80%. More bad news = exit completely.', 'Already down sharply. Review whether fresh evidence still supports holding any position.'],
    ['EML era ending. Sell AAOI immediately on this news.', 'If this happens, review AAOI against current evidence before keeping or adding risk.'],
    ['EML cycle ending faster. Rotate into AXTI/TSEM.', 'Review whether the thesis is weakening, then compare alternatives only with fresh evidence.'],
    ['Thesis is dead. Cut losses and redeploy.', 'Treat this as a thesis-break review and decide using position size, evidence and risk.'],
    ['Take profits. EML cycle in final stages.', 'Review whether to trim profits, especially if the position has grown beyond plan.'],
    ['Bad for SoFi. Consider reducing.', 'Review SoFi sizing and sensitivity before changing the position.'],
    ['CPO wave arriving. Add more AXTI — this is the catalyst.', 'A possible catalyst. Check source quality and position size before adding risk.'],
    ['Major milestone. Consider adding to position.', 'Major milestone. Recheck valuation, position size and downside before adding.'],
    ['Huge tailwind for SoFi. Hold tight or add.', 'Potential tailwind. Hold or add only if the thesis and sizing still fit.'],
    ['most important stock in your portfolio', 'a stock idea that needs fresh evidence before it earns size'],
    ['Should you copy this trade?', 'Could this trade fit your plan?'],
    ['specific stop loss', 'risk level to review'],
    ['Buy More', 'Review Add'],
    ['Strong Buy', 'Strong case'],
  ]);

  function softenDirectAdvice(root = document.body) {
    if (!root) return;
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

  function patchGo() {
    if (typeof globalThis.go !== 'function' || globalThis.go.__dayframePolished) return;
    const original = globalThis.go;
    const wrapped = function patchedGo(name, btn) {
      if (name === 'driving-costs') {
        const result = original.call(this, 'driving-car', btn);
        requestAnimationFrame(applyPolish);
        return result;
      }
      const result = original.apply(this, arguments);
      requestAnimationFrame(applyPolish);
      return result;
    };
    wrapped.__dayframePolished = true;
    globalThis.go = wrapped;
  }

  function patchWatchlistAI() {
    if (globalThis.analyseWL?.__dayframePolished) return;
    if (typeof globalThis.callClaude !== 'function') return;
    const patched = async function analyseWatchlistWithSafeMarkup() {
      const out = document.getElementById('dash-wl-analysis') || document.getElementById('wl-analysis');
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

  function applyPolish() {
    addDrivingCostsNav();
    addDrivingCostsCard();
    addDrivingGuidance();
    addMoneyGuidance();
    addInvestingGuidance();
    patchGo();
    patchWatchlistAI();
    softenDirectAdvice();
  }

  const observer = new MutationObserver(() => {
    if (observer._queued) return;
    observer._queued = true;
    requestAnimationFrame(() => {
      observer._queued = false;
      softenDirectAdvice();
      addDrivingCostsNav();
      addDrivingCostsCard();
      addDrivingGuidance();
      removeDismissedGuidance();
      patchWatchlistAI();
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPolish, { once: true });
  } else {
    applyPolish();
  }
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setTimeout(applyPolish, 300);
  setTimeout(applyPolish, 1200);
})();