(function () {
  'use strict';
  // Match the actual selectors in src/ui/interactions.js. Do not change routing.
  var drawer = document.querySelector('[data-drawer]');
  if (drawer && !drawer.hidden && drawer.classList.contains('is-open')) {
    var close = drawer.querySelector('[data-drawer-close]') || document.querySelector('[data-drawer-close]');
    if (close) { close.click(); return true; }
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    return !!drawer.hidden;
  }
  var launcher = document.querySelector('[data-launcher-toggle]');
  if (launcher && launcher.getAttribute('aria-expanded') === 'true') {
    launcher.click(); return true;
  }
  return false;
})()
