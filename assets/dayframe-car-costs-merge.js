(() => {
  'use strict';

  const FLAG = 'data-dayframe-car-costs-merge';
  const STYLE_ID = 'df-car-costs-merge-style';
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
      #pg-driving-costs{display:none!important}
      #df-car-costs-section{margin-top:18px}
      #df-car-costs-section .driving-cost-grid{margin-top:12px}
      #df-car-costs-section .life-grid{margin-top:14px}
      .df-car-costs-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:10px}
      .df-car-costs-kicker{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#6f7a91;margin-bottom:5px}
      .df-car-costs-title{font-family:var(--fd);font-size:24px;font-weight:850;color:var(--tx);line-height:1.1}
      .df-car-costs-sub{font-size:13px;line-height:1.55;color:var(--t3);margin-top:5px;max-width:620px}
      .df-car-costs-add{flex:0 0 auto}
      @media(max-width:760px){
        #df-car-costs-section{margin-top:14px}
        .df-car-costs-head{align-items:stretch;flex-direction:column}
        .df-car-costs-title{font-size:21px}
        .df-car-costs-add{width:100%;justify-content:center}
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceCarCopy() {
    const heroCopy = document.querySelector('#pg-driving-car .personal-hero-copy p');
    if (heroCopy && heroCopy.dataset.carCostsMerged !== 'true') {
      heroCopy.textContent = 'Save your vehicle details, renewal dates, notes and running costs once, then let Dayframe keep them ready when you need them.';
      heroCopy.dataset.carCostsMerged = 'true';
    }

    const homeDesc = document.querySelector('.driving-home-card.car .driving-home-desc');
    if (homeDesc && homeDesc.dataset.carCostsMerged !== 'true') {
      homeDesc.textContent = 'Store renewals, running costs and vehicle notes without searching through emails.';
      homeDesc.dataset.carCostsMerged = 'true';
    }

    const tags = document.querySelector('.driving-home-card.car .driving-card-tags');
    if (tags && !tags.querySelector('[data-car-cost-tag]')) {
      ['Costs', 'Fuel'].forEach((label) => {
        const tag = document.createElement('span');
        tag.className = 'driving-card-tag';
        tag.dataset.carCostTag = 'true';
        tag.textContent = label;
        tags.appendChild(tag);
      });
    }
  }

  function createSection() {
    const section = document.createElement('section');
    section.id = 'df-car-costs-section';
    section.setAttribute('aria-label', 'Car costs');
    section.innerHTML = `
      <div class="df-car-costs-head">
        <div>
          <div class="df-car-costs-kicker">My Car</div>
          <div class="df-car-costs-title">Car costs</div>
          <div class="df-car-costs-sub">Fuel, parking, insurance, repairs and anything else your car costs you, kept with the rest of your vehicle details.</div>
        </div>
        <button class="life-add df-car-costs-add" type="button" onclick="toggleLifeForm('driving-cost-form')">+ Add cost</button>
      </div>
    `;
    return section;
  }

  function moveCostsIntoCar() {
    ensureStyle();
    enhanceCarCopy();

    const carPage = byId('pg-driving-car');
    const costsPage = byId('pg-driving-costs');
    if (!carPage || !costsPage) return false;

    const carWrap = carPage.querySelector(':scope > .life-wrap') || carPage;
    const costsWrap = costsPage.querySelector(':scope > .life-wrap') || costsPage;
    let section = byId('df-car-costs-section');
    let changed = false;
    if (!section) {
      section = createSection();
      carWrap.appendChild(section);
      changed = true;
    }

    const oldHeader = costsWrap.querySelector(':scope > .life-header');
    if (oldHeader) {
      oldHeader.remove();
      changed = true;
    }

    const costStats = costsWrap.querySelector(':scope > .driving-cost-grid') || byId('driving-cost-month')?.closest('.driving-cost-grid');
    const costBody = costsWrap.querySelector(':scope > .life-grid') || byId('driving-cost-list')?.closest('.life-grid');

    if (costStats && !section.contains(costStats)) {
      section.appendChild(costStats);
      changed = true;
    }
    if (costBody && !section.contains(costBody)) {
      section.appendChild(costBody);
      changed = true;
    }

    if (costsPage.classList.contains('on')) {
      costsPage.classList.remove('on');
      changed = true;
    }
    if (costsPage.getAttribute('aria-hidden') !== 'true') {
      costsPage.setAttribute('aria-hidden', 'true');
      changed = true;
    }
    if (costsPage.style.display !== 'none') {
      costsPage.style.display = 'none';
      changed = true;
    }

    if (changed) {
      try { globalThis.renderDrivingCosts?.(); } catch {}
    }
    return changed;
  }

  function patchRouting() {
    if (typeof globalThis.go !== 'function' || globalThis.go.__dayframeCarCostsMerged) return;
    const originalGo = globalThis.go;
    const wrappedGo = function dayframeCarCostsMergedGo(name, btn) {
      const target = name === 'driving-costs' ? 'driving-car' : name;
      const result = originalGo.call(this, target, btn);
      if (target === 'driving-car' || target === 'driving') {
        setTimeout(() => {
          moveCostsIntoCar();
          if (target === 'driving-car') {
            try { globalThis.renderDrivingCosts?.(); } catch {}
          }
        }, 0);
      }
      return result;
    };
    wrappedGo.__dayframeCarCostsMerged = true;
    globalThis.go = wrappedGo;
  }

  function patchRenderDriving() {
    if (typeof globalThis.renderDriving !== 'function' || globalThis.renderDriving.__dayframeCarCostsMerged) return;
    const originalRenderDriving = globalThis.renderDriving;
    const wrappedRenderDriving = function dayframeCarCostsMergedRenderDriving() {
      const result = originalRenderDriving.apply(this, arguments);
      moveCostsIntoCar();
      try { globalThis.renderDrivingCosts?.(); } catch {}
      return result;
    };
    wrappedRenderDriving.__dayframeCarCostsMerged = true;
    globalThis.renderDriving = wrappedRenderDriving;
  }

  function patchRenderLifePage() {
    if (typeof globalThis.renderLifePage !== 'function' || globalThis.renderLifePage.__dayframeCarCostsMerged) return;
    const originalRenderLifePage = globalThis.renderLifePage;
    const wrappedRenderLifePage = function dayframeCarCostsMergedRenderLifePage(name) {
      const result = originalRenderLifePage.apply(this, arguments);
      if (name === 'driving-car' || name === 'driving-costs') moveCostsIntoCar();
      return result;
    };
    wrappedRenderLifePage.__dayframeCarCostsMerged = true;
    globalThis.renderLifePage = wrappedRenderLifePage;
  }

  function apply() {
    patchRouting();
    patchRenderDriving();
    patchRenderLifePage();
    moveCostsIntoCar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  setTimeout(apply, 300);
  setTimeout(apply, 1200);
})();