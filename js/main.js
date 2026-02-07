// Abyss — minimal interactions

(function () {
  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--anim-duration', '0s');
  }
})();
