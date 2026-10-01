/* ==========================================================================
   Violette Holistic Massage — scripts
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Avis : navigation par points ---------- */
  var dots = document.querySelectorAll('.reviews__dots .dot');

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      dots.forEach(function (other) {
        var slide = document.getElementById(other.getAttribute('aria-controls'));
        var isActive = other === dot;
        slide.hidden = !isActive;
        if (isActive) {
          other.setAttribute('aria-current', 'true');
        } else {
          other.removeAttribute('aria-current');
        }
      });
    });
  });

  /* ---------- Barre « Réserver » sur téléphone ----------
     Masquée tant qu'un autre bouton de réservation bien visible est à l'écran
     (carte du hero, section réservation, pied de page), pour ne pas doubler. */
  var mobileCta = document.querySelector('[data-mobile-cta]');

  if (mobileCta && 'IntersectionObserver' in window) {
    var visibleZones = new Set();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visibleZones.add(entry.target);
        } else {
          visibleZones.delete(entry.target);
        }
      });
      mobileCta.classList.toggle('is-hidden', visibleZones.size > 0);
    });

    ['.hero__card .btn', '#reserver', '.site-footer'].forEach(function (selector) {
      var zone = document.querySelector(selector);
      if (zone) observer.observe(zone);
    });
  }
})();
