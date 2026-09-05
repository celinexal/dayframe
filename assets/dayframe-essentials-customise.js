/*
 * Disabled on purpose.
 *
 * The Essentials "Customise" / "Show in Essentials" panel is now rendered
 * entirely by dayframe-essentials-bible.js (which also adds Bible as a
 * widget option and drops the two older home-admin/work-scheduling entries).
 *
 * This older layer built the same #df-essentials-widget-panel element with
 * its own 6-item list (no Bible) and, critically, kept rebuilding it on a
 * fixed timer (150/500/1200/2600/5200ms after load) regardless of what was
 * currently on screen. Whichever engine's timer fired last would silently
 * replace the other's rendered rows — reported as "hide one option and the
 * whole section disappears until you close and reopen it". The wiring
 * (service worker shell, deploy injection) is kept so nothing else has to
 * change; the script simply does nothing now.
 */
(function () {
  /* intentionally empty */
})();
