(() => {
  'use strict';

  const VERSION = 'essentials-bible-late-v1';
  const FLAG = 'data-dayframe-essentials-bible-late';
  const ALLOWED = ['My Car', 'MyFlo', 'Documents', 'Health', 'Bible'];
  let queued = false;
  let observerStarted = false;

  function hide(selector) {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.hidden !== true) el.hidden = true;
      if (el.getAttribute('aria-hidden') !== 'true') el.setAttribute('aria-hidden', 'true');
      if (el.style.display !== 'none') el.style.display = 'none';
    });
  }

  function labelsFromPanel() {
    const choices = [...document.querySelectorAll('#df-essentials-widget-panel [data-widget-choice]')];
    const labels = choices
      .filter((choice) => !choice.classList.contains('is-off'))
      .map((choice) => choice.querySelector('strong')?.textContent?.trim())
      .filter((label) => ALLOWED.includes(label));
    return labels.length ? labels : ALLOWED;
  }

  function ensureCustomiseButton(pills) {
    let button = document.getElementById('df-essentials-customise-button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'df-essentials-customise-button';
      button.className = 'driving-hub-pill df-essentials-customise-button';
      button.innerHTML = '<b></b>Customise';
      button.addEventListener('click', (event) => window.dayframeToggleEssentialsCustomise?.(event));
    }
    if (!pills.contains(button)) pills.appendChild(button);
    return button;
  }

  function syncPills() {
    const pills = document.querySelector('#pg-driving .driving-hub-pills');
    if (!pills) return;
    const button = ensureCustomiseButton(pills);
    const labels = labelsFromPanel();
    const currentPills = [...pills.querySelectorAll('.driving-hub-pill:not(#df-essentials-customise-button)')];
    const current = currentPills.map((pill) => (pill.textContent || '').trim());
    if (current.join('|') !== labels.join('|')) {
      currentPills.forEach((pill) => pill.remove());
      labels.forEach((label) => {
        const pill = document.createElement('span');
        pill.className = 'driving-hub-pill';
        pill.innerHTML = '<b></b>' + label;
        pills.insertBefore(pill, button);
      });
    } else if (pills.lastElementChild !== button) {
      pills.appendChild(button);
    }
  }

  function apply() {
    if (!document.documentElement || document.documentElement.getAttribute(FLAG) === VERSION + ':applying') return;
    document.documentElement.setAttribute(FLAG, VERSION + ':applying');
    try {
      hide('[data-home-module="bible"],.df-nav-btn[data-main-page="bible"],.df-mobile-nav button[data-mobile-page="bible"]');
      hide('#df-home-card,#df-work-study-card,#pg-driving-home-admin,#pg-driving-work-study');
      hide('.driving-side-nav [data-driving-page="driving-home-admin"],.driving-side-nav [data-driving-page="driving-work-study"]');
      document.querySelectorAll('#df-essentials-widget-panel [data-widget-choice="home"],#df-essentials-widget-panel [data-widget-choice="work-study"]').forEach((el) => el.remove());
      syncPills();
      document.documentElement.setAttribute(FLAG, VERSION);
    } catch (error) {
      document.documentElement.setAttribute(FLAG, VERSION + ':error');
      console.warn('[Dayframe] Essentials Bible late cleanup failed', error);
    }
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
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { apply(); startObserver(); }, { once: true });
  else {
    apply();
    startObserver();
  }
  [100, 400, 1000, 2400, 5200, 9000, 15000, 30000].forEach((delay) => setTimeout(apply, delay));
})();
