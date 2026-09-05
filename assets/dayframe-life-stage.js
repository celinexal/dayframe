/*
 * Disabled on purpose.
 *
 * Everything this layer did is now owned by dayframe-essentials-cleanup.js:
 * the Home/Customise editor, space visibility, the go() patch, home
 * preferences and labels. Its globals were a strict subset of cleanup.js's
 * (the one exception, dayframeSetDrivingStage, was never called by anything).
 *
 * It kept winning anyway because of load order: the build injects the newer
 * scripts into <head>, but this file is only added by the service worker's
 * withPolish() at the end of <body> — so it ran LAST and its
 * window.homeRenderEditor / applySpaceVisibility overwrote cleanup.js's.
 * That surfaced as an old "Home spaces" Customise sheet and a Money button
 * missing from the mobile task bar, because the two layers disagreed about
 * which spaces were hidden. Fetching the page directly never showed the
 * problem, since the injection only happens through the service worker.
 *
 * The wiring (service worker shell, injection) is kept so nothing else has
 * to change; the script simply does nothing.
 */
(function () {
  /* intentionally empty */
})();
