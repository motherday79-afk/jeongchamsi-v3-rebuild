(function () {
  var app = document.getElementById('app');
  if (!app || app.querySelector('.app-initial-loading')) return false;
  // 167 explicitly marks readiness after rendering and interaction binding.
  if (app.hasAttribute('data-jcs-ready')) return app.getAttribute('data-jcs-ready') === 'true';
  // Compatibility with the deployed 166 site, whose shell is rendered after data.
  var page = app.querySelector('.site-shell .page-wrap');
  return !!(page && page.children.length && page.textContent.trim());
})()
