(function () {
  'use strict';

  const VERSION = 'performance-guard-v3';
  const FLAG = 'data-dayframe-performance-guard';
  if (document.documentElement?.getAttribute(FLAG) === VERSION) return;
  if (document.documentElement) document.documentElement.setAttribute(FLAG, VERSION);
  else document.addEventListener('DOMContentLoaded', () => document.documentElement?.setAttribute(FLAG, VERSION), { once: true });

  const nativeSetAttribute = Element.prototype.setAttribute;
  const nativeRemoveAttribute = Element.prototype.removeAttribute;

  Element.prototype.setAttribute = function dayframeGuardedSetAttribute(name, value) {
    const next = String(value);
    if (this.getAttribute(name) === next) return undefined;
    return nativeSetAttribute.call(this, name, value);
  };

  Element.prototype.removeAttribute = function dayframeGuardedRemoveAttribute(name) {
    if (!this.hasAttribute(name)) return undefined;
    return nativeRemoveAttribute.call(this, name);
  };

  function openTheory(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    if (typeof window.go === 'function') window.go('driving-theory');
  }

  function wireTheoryButton(button) {
    if (!button) return;
    const text = (button.textContent || '').replace(/\s+/g, ' ').trim();
    if (text !== 'Still learning?') button.textContent = 'Still learning?';
    if (button.getAttribute('role') !== 'button') button.setAttribute('role', 'button');
    if (button.getAttribute('tabindex') !== '0') button.setAttribute('tabindex', '0');
    if (button.getAttribute('title') !== 'Open Pass your theory') button.setAttribute('title', 'Open Pass your theory');
    button.onclick = openTheory;
    button.onkeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') openTheory(event);
    };
  }

  function dedupeTheoryButtons() {
    const page = document.getElementById('pg-driving');
    if (!page) return;

    const matchesTheoryCta = (element) => /Still learning|Need help passing your theory|Need to pass your theory|Pass your theory/i.test(element.textContent || '');
    const candidates = [...page.querySelectorAll('button,a,[role="button"],.df-car-question')].filter(matchesTheoryCta);
    let keeper = page.querySelector('.df-car-question');
    if (!keeper || !matchesTheoryCta(keeper)) {
      keeper = candidates.find((element) => /Still learning/i.test(element.textContent || '')) || candidates[0];
    }

    if (keeper) wireTheoryButton(keeper);

    candidates.forEach((element) => {
      if (element === keeper || element.contains(keeper) || keeper?.contains(element)) return;
      if (matchesTheoryCta(element)) element.remove();
    });

    page.querySelectorAll('.df-car-actions').forEach((actions) => {
      if (keeper && actions.contains(keeper) && actions.parentElement) {
        actions.parentElement.insertBefore(keeper, actions);
      }
      actions.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dedupeTheoryButtons, { once: true });
  } else {
    dedupeTheoryButtons();
  }
  [100, 500, 1200, 2600, 5200].forEach((delay) => window.setTimeout(dedupeTheoryButtons, delay));
  document.addEventListener('dayframe:essentials-refresh', dedupeTheoryButtons);

  const NativeMutationObserver = window.MutationObserver;
  if (typeof NativeMutationObserver === 'function' && !NativeMutationObserver.__dayframePerformanceGuard) {
    const cosmeticAttributes = new Set(['class', 'aria-label', 'aria-hidden', 'role', 'tabindex', 'title', 'data-theme-term', 'data-theme-topic', 'data-essentials-tool-nav', 'data-essentials-tool-card', 'data-essentials-open-page', 'data-essentials-open-flo']);
    const trackedObservers = new Set();
    const broadTargets = new Set([document, document.documentElement, document.body]);

    window.MutationObserver = class DayframeBatchedMutationObserver extends NativeMutationObserver {
      constructor(callback) {
        let queued = false;
        let pending = [];
        let lastFlush = 0;

        super((records, observer) => {
          pending.push(...records);
          if (queued) return;

          queued = true;
          const cosmeticOnly = pending.every((record) => record.type === 'attributes' && cosmeticAttributes.has(record.attributeName || ''));
          if (cosmeticOnly) {
            pending = [];
            queued = false;
            return;
          }
          const now = performance.now();
          const minimumGap = cosmeticOnly ? 160 : 32;
          const delay = Math.max(0, minimumGap - (now - lastFlush));

          window.setTimeout(() => {
            queued = false;
            lastFlush = performance.now();
            const batch = pending;
            pending = [];
            callback(batch, observer);
          }, delay);
        });
      }

      observe(target, options) {
        this.__dayframeObserveTarget = target;
        this.__dayframeObserveOptions = options || {};
        trackedObservers.add(this);
        return super.observe(target, options);
      }
    };
    window.MutationObserver.__dayframePerformanceGuard = true;

    function quietBroadObservers() {
      dedupeTheoryButtons();
      trackedObservers.forEach((observer) => {
        const options = observer.__dayframeObserveOptions || {};
        const target = observer.__dayframeObserveTarget;
        const watchesWholePage = broadTargets.has(target) || target === document.body || target === document.documentElement;
        if (watchesWholePage && options.subtree && (options.childList || options.attributes || options.characterData)) {
          try { observer.disconnect(); } catch {}
        }
      });
      window.__dayframeBroadObserversQuieted = true;
      window.setTimeout(dedupeTheoryButtons, 40);
    }

    window.dayframeQuietBroadObservers = quietBroadObservers;
    window.setTimeout(quietBroadObservers, 2400);
    window.setTimeout(quietBroadObservers, 5200);
  }

  let refreshQueued = false;
  window.dayframeRequestEssentialsRefresh = function dayframeRequestEssentialsRefresh(reason) {
    if (refreshQueued) return;
    refreshQueued = true;
    window.setTimeout(() => {
      refreshQueued = false;
      document.dispatchEvent(new CustomEvent('dayframe:essentials-refresh', { detail: { reason: reason || 'manual' } }));
    }, 30);
  };
})();
