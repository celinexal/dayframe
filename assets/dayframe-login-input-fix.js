(() => {
  'use strict';

  const FLAG = 'data-dayframe-login-input-fix';
  const STYLE_ID = 'df-login-input-fix-style';
  const AUTH_ROOT_SELECTOR = [
    '#auth-login',
    '#auth-signup',
    '#auth-reset',
    '#auth-update',
    '.auth-card',
    '.auth-panel',
    '[data-auth]',
    '[id*="auth"]',
    '[class*="auth"]',
    '[id*="login"]',
    '[class*="login"]',
    '[id*="signup"]',
    '[class*="signup"]'
  ].join(',');
  const INPUT_SELECTOR = [
    'input[type="email"]',
    'input[type="password"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]'
  ].join(',');

  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ${AUTH_ROOT_SELECTOR} ${INPUT_SELECTOR},
      ${INPUT_SELECTOR}{
        pointer-events:auto!important;
        -webkit-user-select:text!important;
        user-select:text!important;
        touch-action:manipulation!important;
        caret-color:auto!important;
      }
      ${AUTH_ROOT_SELECTOR}{
        -webkit-user-select:auto!important;
        user-select:auto!important;
      }
    `;
    document.head.appendChild(style);
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  function isAuthInput(input) {
    if (!input || !input.matches(INPUT_SELECTOR)) return false;
    return Boolean(input.closest(AUTH_ROOT_SELECTOR)) || input.type === 'email' || input.autocomplete === 'email' || input.autocomplete === 'username';
  }

  function unlockInput(input) {
    if (!isAuthInput(input) || !isVisible(input)) return;
    input.style.pointerEvents = 'auto';
    input.style.webkitUserSelect = 'text';
    input.style.userSelect = 'text';
    input.style.touchAction = 'manipulation';
    input.removeAttribute('inert');

    if ((input.type === 'email' || input.inputMode === 'email') && !input.autocomplete) {
      input.autocomplete = 'email';
    }
    if (input.type === 'password' && !input.autocomplete) {
      input.autocomplete = 'current-password';
    }
    if (input.disabled && input.closest(AUTH_ROOT_SELECTOR)) {
      input.disabled = false;
    }
    if (input.readOnly && input.closest(AUTH_ROOT_SELECTOR) && !input.hasAttribute('data-dayframe-readonly')) {
      input.readOnly = false;
    }
  }

  function unlockInputs() {
    ensureStyle();
    document.querySelectorAll(INPUT_SELECTOR).forEach(unlockInput);
  }

  function focusTarget(target) {
    const input = target?.closest?.(INPUT_SELECTOR);
    if (!input) return;
    unlockInput(input);
    if (!isAuthInput(input) || !isVisible(input)) return;
    setTimeout(() => {
      try {
        input.focus({ preventScroll: true });
      } catch (_) {
        input.focus();
      }
    }, 0);
  }

  ['pointerdown', 'touchstart', 'click'].forEach((eventName) => {
    document.addEventListener(eventName, (event) => focusTarget(event.target), true);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', unlockInputs, { once: true });
  } else {
    unlockInputs();
  }

  [100, 500, 1200, 2500, 5000].forEach((delay) => setTimeout(unlockInputs, delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      unlockInputs();
    });
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'readonly', 'inert', 'style', 'class']
  });
})();
