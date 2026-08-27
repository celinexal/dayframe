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
      .driving-side-nav [data-driving-page="driving-costs"],
      button[data-driving-page="driving-costs"],
      button[onclick*="go('driving-costs')"],
      button[onclick*='go("driving-costs")']{
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

  function removeCostsUi() {
    ensureStyle();
    resetCarCopy();

    const mergedSection = byId('df-car-costs-section');
    if (mergedSection) mergedSection.remove();

    const costsPage = byId('pg-driving-costs');
    if (costsPage) {
      costsPage.classList.remove('on');
      costsPage.setAttribute('aria-hidden', 'true');
      costsPage.style.display = 'none';
    }

    document.querySelectorAll('.driving-side-nav button').forEach((button) => {
      const isCosts =
        button.dataset.drivingPage === 'driving-costs' ||
        /driving-costs/.test(button.getAttribute('onclick') || '') ||
        button.textContent.trim().toLowerCase() === 'driving costs';
      if (isCosts) button.remove();
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
  setTimeout(apply, 300);
  setTimeout(apply, 1200);

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