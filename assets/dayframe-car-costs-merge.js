(() => {
  'use strict';

  const FLAG = 'data-dayframe-car-costs-removed';
  const STYLE_ID = 'df-car-costs-removed-style';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #pg-driving-costs,
      #df-car-costs-section,
      [data-driving-page="driving-costs"],
      [data-dayframe-polish="driving-costs-card"],
      .df-polish-nav-costs,
      [onclick*="driving-costs"]{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function resetCarCopy() {
    const heroText = 'Save your vehicle details, renewal dates and important notes once, then let Dayframe keep them ready when you need them.';
    const heroCopy = document.querySelector('#pg-driving-car .personal-hero-copy p');
    if (heroCopy && heroCopy.textContent !== heroText) {
      heroCopy.textContent = heroText;
    }

    const homeText = 'Store the details that matter and see every important renewal without searching through emails.';
    const homeDesc = document.querySelector('.driving-home-card.car .driving-home-desc');
    if (homeDesc && homeDesc.textContent !== homeText) {
      homeDesc.textContent = homeText;
    }

    document.querySelectorAll('[data-car-cost-tag]').forEach((tag) => tag.remove());
  }

  function removeNode(node) {
    if (!node || node.matches('html,body,head,script,style')) return;
    const target = node.closest('button,a,[role="button"],li') || node;
    if (!target.matches('html,body,head,script,style')) target.remove();
  }

  function removeCostsUi() {
    ensureStyle();
    resetCarCopy();

    byId('df-car-costs-section')?.remove();

    const costsPage = byId('pg-driving-costs');
    if (costsPage) costsPage.remove();

    document.querySelectorAll('[data-driving-page="driving-costs"], [data-dayframe-polish="driving-costs-card"], .df-polish-nav-costs, [onclick*="driving-costs"]').forEach(removeNode);

    document.querySelectorAll('#driving-sidepanel *, .driving-side-nav *').forEach((node) => {
      const text = (node.textContent || '').trim().toLowerCase();
      if (text === 'driving costs') removeNode(node);
    });
  }

  function patchRouting() {
    if (typeof globalThis.go !== 'function' || globalThis.go.__dayframeCarCostsRemoved) return;
    const originalGo = globalThis.go;
    const wrappedGo = function dayframeCarCostsRemovedGo(name, btn) {
      const target = name === 'driving-costs' ? 'driving-car' : name;
      const result = originalGo.call(this, target, btn);
      setTimeout(removeCostsUi, 0);
      return result;
    };
    wrappedGo.__dayframeCarCostsRemoved = true;
    globalThis.go = wrappedGo;
  }

  function patchRenderLifePage() {
    if (typeof globalThis.renderLifePage !== 'function' || globalThis.renderLifePage.__dayframeCarCostsRemoved) return;
    const originalRenderLifePage = globalThis.renderLifePage;
    const wrappedRenderLifePage = function dayframeCarCostsRemovedRenderLifePage(name) {
      if (name === 'driving-costs' && typeof globalThis.go === 'function') {
        setTimeout(() => globalThis.go('driving-car'), 0);
        return originalRenderLifePage.call(this, 'driving-car');
      }
      const result = originalRenderLifePage.apply(this, arguments);
      removeCostsUi();
      return result;
    };
    wrappedRenderLifePage.__dayframeCarCostsRemoved = true;
    globalThis.renderLifePage = wrappedRenderLifePage;
  }

  function apply() {
    patchRouting();
    patchRenderLifePage();
    removeCostsUi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  [50, 300, 1200, 2500, 5000].forEach((delay) => setTimeout(apply, delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      removeCostsUi();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();