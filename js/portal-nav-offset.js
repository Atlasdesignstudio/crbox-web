(function () {
  'use strict';

  function applyHeaderOffset() {
    var header = document.querySelector('header.sticky-header');
    if (!header) return;
    var h = header.offsetHeight;
    if (h > 0) {
      document.documentElement.style.setProperty('--portal-header-h', h + 'px');
    }
  }

  var _resizeTimer;
  function onResize() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(applyHeaderOffset, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHeaderOffset);
  } else {
    applyHeaderOffset();
  }

  window.addEventListener('resize', onResize);
}());
