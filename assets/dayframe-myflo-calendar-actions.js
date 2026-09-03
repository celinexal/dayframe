/*
 * Disabled on purpose.
 *
 * MyFlo is now rendered entirely by dayframe-essentials-flo.js, which opens
 * an on-date popover (dayframeMyFloDayMenu) when you tap a calendar day so you
 * can set that day as a period start or end right there.
 *
 * This older layer added a capture-phase click handler that swallowed those
 * day taps (stopImmediatePropagation) and instead pushed a separate
 * "Selected date / Set as period start / Set as period end" panel to the
 * bottom of the view. That blocked the popover, so this file is now a no-op.
 * The wiring (service worker shell, deploy injection) is kept so nothing
 * else has to change; the script simply does nothing.
 */
(function () {
  /* intentionally empty */
})();
