(function () {
  'use strict';

  const VERSION = 'performance-guard-v1';
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

  const NativeMutationObserver = window.MutationObserver;
  if (typeof NativeMutationObserver === 'function' && !NativeMutationObserver.__dayframePerformanceGuard) {
    const cosmeticAttributes = new Set(['class', 'aria-label', 'aria-hidden', 'role', 'tabindex', 'title', 'data-theme-term', 'data-theme-topic', 'data-essentials-tool-nav', 'data-essentials-tool-card', 'data-essentials-open-page', 'data-essentials-open-flo']);

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
          const minimumGap = 32;
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
    };
    window.MutationObserver.__dayframePerformanceGuard = true;
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