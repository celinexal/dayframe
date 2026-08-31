(() => {
  'use strict';

  const VERSION = 'flo-v1';
  const FLAG = 'data-dayframe-essentials-flo';

  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);

  let applyQueued = false;
  let observerInstalled = false;
  let previousFloOpener = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function isHidden(el) {
    if (!el) return true;
    const style = getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('df-essentials-hidden', Boolean(hidden));
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function setButtonLabel(button, label) {
    if (!button) return;
    const textNode = [...button.childNodes].reverse().find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (textNode) textNode.textContent = label;
    else button.appendChild(document.createTextNode(label));
  }

  function ensureStyle() {
    if (byId('df-essentials-flo-style')) return;
    const style = document.createElement('style');
    style.id = 'df-essentials-flo-style';
    style.textContent = `
      #pg-driving .driving-hub-sub{display:none!important}
      #pg-driving .driving-home-card.car{cursor:pointer!important}
      .df-flo-nav{display:flex!important}
    `;
    document.head.appendChild(style);
  }

  function ensureFloNav() {
    const nav = document.querySelector('.driving-side-nav');
    if (!nav) return;
    let flo = nav.querySelector('[data-driving-page="driving-cycle"]');
    if (!flo) {
      flo = document.createElement('button');
      flo.type = 'button';
      flo.className = 'df-flo-nav';
      flo.dataset.drivingPage = 'driving-cycle';
      flo.setAttribute('onclick', 'dayframeOpenPeriodTracker(event)');
      flo.innerHTML = '<span>F</span>Flo';
      const car = nav.querySelector('[data-driving-page="driving-car"]');
      if (car?.nextSibling) nav.insertBefore(flo, car.nextSibling);
      else nav.appendChild(flo);
    }
    setButtonLabel(flo, 'Flo');
    setHidden(flo, false);
    setHidden(nav.querySelector('[data-driving-page="driving-theory"]'), true);
  }

  function updateMyCarCard() {
    const card = document.querySelector('#pg-driving .driving-home-card.car');
    if (!card) return;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('onclick', 'dayframeOpenMyCarCard(event)');
    card.setAttribute('onkeydown', 'dayframeOpenMyCarCardKey(event)');
    const title = card.querySelector('.driving-home-title');
    const desc = card.querySelector('.driving-home-desc');
    const question = card.querySelector('.df-car-question');
    if (title) title.textContent = 'My Car';
    if (desc) desc.textContent = 'Vehicle details, dates and reminders.';
    if (question) question.textContent = 'Need to pass your theory?';
    card.querySelector('.df-car-actions button.primary')?.remove();
    let actions = card.querySelector('.df-car-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'df-car-actions';
      card.appendChild(actions);
    }
    let button = actions.querySelector('button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      actions.appendChild(button);
    }
    button.textContent = 'Practise theory';
    button.setAttribute('onclick', 'dayframeOpenTheoryHelp(event)');
  }

  function updateFloCard() {
    const card = byId('df-period-card');
    if (!card) return;
    const title = card.querySelector('.driving-home-title');
    const desc = card.querySelector('.driving-home-desc');
    const kicker = card.querySelector('.driving-home-kicker');
    if (title) title.textContent = 'Flo';
    if (desc) desc.textContent = desc.textContent.includes('Next estimate') ? desc.textContent : 'Save dates privately and see the next estimate.';
    if (kicker) kicker.textContent = 'Private';
    card.setAttribute('onclick', 'dayframeOpenPeriodTracker(event)');
  }

  function updateFloPanel() {
    const panel = byId('df-period-panel');
    if (!panel) return;
    const title = panel.querySelector('.df-period-panel-head h2');
    const close = panel.querySelector('.df-period-panel-close');
    if (title) title.textContent = 'Flo';
    if (close) close.setAttribute('aria-label', 'Close Flo');
  }

  function updateLabels() {
    const page = byId('pg-driving');
    const heroTitle = page?.querySelector('.driving-hub-title');
    const heroSub = page?.querySelector('.driving-hub-sub');
    const heroPills = page?.querySelector('.driving-hub-pills');
    if (heroTitle) heroTitle.textContent = 'Essentials';
    if (heroSub) heroSub.textContent = '';
    if (heroPills) heroPills.innerHTML = '<span class="driving-hub-pill"><b></b>My Car</span><span class="driving-hub-pill"><b></b>Flo</span>';

    const mobileMore = document.querySelector(`#df-more-sheet button[onclick*="dfMoreGo('driving')"]`);
    if (mobileMore) {
      const strong = mobileMore.querySelector('strong');
      const small = mobileMore.querySelector('small');
      if (strong) strong.textContent = 'Essentials';
      if (small) small.textContent = 'My Car, Flo and everyday tools';
    }

    const homeCard = document.querySelector('[data-home-module="driving"]');
    if (homeCard?.querySelector('.hub-module-title')) homeCard.querySelector('.hub-module-title').textContent = 'Essentials';
    if (homeCard?.querySelector('.hub-module-desc')) homeCard.querySelector('.hub-module-desc').textContent = 'My Car, Flo and everyday tools in one place.';

    const editor = byId('home-editor-content');
    if (editor && !isHidden(editor)) {
      editor.querySelectorAll('small').forEach((small) => {
        if (/Car and period tracker|Car and cycle tracker/.test(small.textContent)) {
          small.textContent = 'My Car, Flo and everyday tools';
        }
      });
      editor.querySelectorAll('p').forEach((p) => {
        if (/period tracker|theory help inside My Car/i.test(p.textContent)) {
          p.textContent = 'Choose the main spaces and Home order. Essentials keeps My Car, Flo and everyday tools together.';
        }
      });
    }
  }

  function selectFloNav() {
    document.querySelectorAll('.driving-side-nav button').forEach((button) => {
      button.classList.toggle('on', button.dataset.drivingPage === 'driving-cycle');
    });
  }

  function applyNow() {
    applyQueued = false;
    ensureStyle();
    patchGo();
    ensureFloNav();
    updateLabels();
    updateMyCarCard();
    updateFloCard();
    updateFloPanel();
    installObserver();
    installFloOpener();
  }

  function applySoon(delay = 30) {
    if (applyQueued) return;
    applyQueued = true;
    setTimeout(applyNow, delay);
  }

  function needsApply() {
    const text = document.body?.innerText || '';
    return /My Car and personal trackers|Car details stay|Theory help|Period tracker|Cycle tracker|Car and period tracker/i.test(text);
  }

  function installObserver() {
    if (observerInstalled || !document.body || typeof MutationObserver !== 'function') return;
    observerInstalled = true;
    const observer = new MutationObserver(() => {
      if (needsApply()) applySoon(20);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function patchGo() {
    if (typeof window.go !== 'function' || window.go.__dayframeEssentialsFloVersion === VERSION) return;
    const previousGo = window.go;
    window.go = function dayframeEssentialsFloGo(name, btn, ...args) {
      if (name === 'driving-cycle') {
        window.dayframeOpenPeriodTracker?.();
        return undefined;
      }
      const result = previousGo.call(this, name, btn, ...args);
      applySoon(50);
      return result;
    };
    window.go.__dayframeEssentialsFloVersion = VERSION;
    window.go.__dayframeEssentialsFloPrevious = previousGo;
  }

  window.dayframeOpenMyCarCard = function dayframeOpenMyCarCard(event) {
    if (event?.target?.closest?.('button,a,input,textarea,select,label')) return;
    window.go?.('driving-car');
    applySoon(50);
  };

  window.dayframeOpenMyCarCardKey = function dayframeOpenMyCarCardKey(event) {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    window.go?.('driving-car');
    applySoon(50);
  };

  window.dayframeOpenTheoryHelp = function dayframeOpenTheoryHelp(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.go?.('driving-theory');
    applySoon(50);
  };

  function installFloOpener() {
    if (window.dayframeOpenPeriodTracker?.__dayframeEssentialsFloVersion === VERSION) return;
    if (typeof window.dayframeOpenPeriodTracker === 'function') previousFloOpener = window.dayframeOpenPeriodTracker;
    window.dayframeOpenPeriodTracker = function dayframeOpenFlo(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      window.go?.('driving');
      if (typeof previousFloOpener === 'function') previousFloOpener.call(this);
      applyNow();
      selectFloNav();
      const panel = byId('df-period-panel');
      if (panel) {
        panel.hidden = false;
        setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
      }
    };
    window.dayframeOpenPeriodTracker.__dayframeEssentialsFloVersion = VERSION;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyNow, { once: true });
  else applyNow();
  [150, 500, 1200, 2600, 5200].forEach((delay) => setTimeout(applyNow, delay));
})();
