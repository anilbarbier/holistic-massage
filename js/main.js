/* ==========================================================================
   Violette Holistic Massage — scripts
   ========================================================================== */

(function () {
  'use strict';

  var hasObserver = 'IntersectionObserver' in window;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Apparitions au défilement (brief, animations 4, 5, 7, 8) ----------
     Un bloc [data-reveal] reçoit .is-visible la première fois qu'il est
     visible à 15 %, puis reste en place. Le CSS décrit l'animation. */
  /* ---------- Test « mixed media » : cadre esquissé à main levée ----------
     Quatre traits légèrement courbes qui dépassent aux coins, décalés de
     la photo (--frame-dx / --frame-dy). Tirage pseudo-aléatoire fixe
     (data-seed) : le même dessin à chaque visite, redessiné à la bonne
     taille si la photo change de dimensions. */
  function drawSketchFrame(svg) {
    var path = svg.querySelector('path');
    var w = svg.clientWidth;
    var h = svg.clientHeight;
    if (!path || !w || !h) return;

    var style = getComputedStyle(svg);
    var dx = parseFloat(style.getPropertyValue('--frame-dx')) || 0;
    var dy = parseFloat(style.getPropertyValue('--frame-dy')) || 0;
    var seed = parseInt(svg.getAttribute('data-seed'), 10) || 1;
    var rnd = function () {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647 - 0.5;
    };
    var r = function (n) { return Math.round(n * 10) / 10; };

    function stroke(ax, ay, bx, by) {
      var len = Math.hypot(bx - ax, by - ay);
      var ux = (bx - ax) / len, uy = (by - ay) / len;
      var nx = -uy, ny = ux;
      var over0 = 10 + rnd() * 8, over1 = 12 + rnd() * 10;
      var sx = ax - ux * over0 + nx * rnd() * 5, sy = ay - uy * over0 + ny * rnd() * 5;
      var ex = bx + ux * over1 + nx * rnd() * 5, ey = by + uy * over1 + ny * rnd() * 5;
      var cx = (sx + ex) / 2 + nx * rnd() * 8, cy = (sy + ey) / 2 + ny * rnd() * 8;
      return 'M' + r(sx) + ' ' + r(sy) + 'Q' + r(cx) + ' ' + r(cy) + ' ' + r(ex) + ' ' + r(ey);
    }

    var x0 = dx, y0 = dy, x1 = w + dx, y1 = h + dy;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    path.setAttribute('d',
      stroke(x0, y0, x1, y0) + stroke(x1, y0, x1, y1) +
      stroke(x1, y1, x0, y1) + stroke(x0, y1, x0, y0));
    path.style.setProperty('--len', Math.ceil(path.getTotalLength()) + 1);
  }

  var sketchFrames = document.querySelectorAll('.mixed__frame');
  sketchFrames.forEach(drawSketchFrame);
  if ('ResizeObserver' in window) {
    var frameObserver = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) { drawSketchFrame(entry.target); });
    });
    sketchFrames.forEach(function (svg) { frameObserver.observe(svg); });
  }

  document.querySelectorAll('.leaf path, .mixed__sprig path').forEach(function (path) {
    if (path.getTotalLength) {
      path.style.setProperty('--len', Math.ceil(path.getTotalLength()) + 1);
    }
  });

  var revealEls = document.querySelectorAll('[data-reveal]');

  if (hasObserver) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Respiration du halo : en pause quand la bande est hors écran,
     pour que sa respiration se joue quand on la regarde ---------- */
  var halo = document.querySelector('.respire__halo');

  if (halo && hasObserver) {
    new IntersectionObserver(function (entries) {
      halo.classList.toggle('is-paused', !entries[0].isIntersecting);
    }).observe(document.querySelector('.respire__band'));
  }

  /* ---------- En-tête : ombre légère une fois le hero dépassé ---------- */
  var header = document.querySelector('.site-header');
  var hero = document.querySelector('.hero');

  if (header && hero && hasObserver) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(hero);
  }

  /* ---------- Avis : navigation par points, en fondu enchaîné ---------- */
  var dots = document.querySelectorAll('.reviews__dots .dot');
  var slides = Array.prototype.map.call(dots, function (dot) {
    return document.getElementById(dot.getAttribute('aria-controls'));
  });
  var fadeTimer = null;

  function cleanSlides() {
    slides.forEach(function (slide) {
      slide.classList.remove('is-entering', 'is-leaving');
      slide.removeAttribute('aria-hidden');
    });
  }

  dots.forEach(function (dot, index) {
    dot.addEventListener('click', function () {
      var next = slides[index];
      var current = slides.filter(function (slide) {
        return !slide.hidden && !slide.classList.contains('is-leaving');
      })[0];
      if (next === current) return;

      clearTimeout(fadeTimer);
      cleanSlides();

      dots.forEach(function (other) {
        if (other === dot) {
          other.setAttribute('aria-current', 'true');
        } else {
          other.removeAttribute('aria-current');
        }
      });

      slides.forEach(function (slide) {
        if (slide !== next && slide !== current) slide.hidden = true;
      });
      next.hidden = false;

      if (reduceMotion.matches || !current) {
        if (current) current.hidden = true;
        return;
      }

      /* L'ancien avis s'efface pendant que le nouveau apparaît */
      current.classList.add('is-leaving');
      current.setAttribute('aria-hidden', 'true');
      next.classList.add('is-entering');
      fadeTimer = setTimeout(function () {
        current.hidden = true;
        cleanSlides();
      }, 600);
    });
  });

  /* ---------- FAQ : ouverture et fermeture avec une hauteur fluide ----------
     Le <details> natif reste la base (clavier, lecteurs d'écran, recherche
     dans la page) ; on anime seulement sa hauteur entre les deux états. */
  var faqEase = 'cubic-bezier(0.22, 1, 0.36, 1)';

  document.querySelectorAll('.faq__item').forEach(function (item) {
    var summary = item.querySelector('summary');
    var answer = item.querySelector('.faq__a');
    var animation = null;

    function closedHeight() {
      var style = getComputedStyle(item);
      return summary.offsetHeight +
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    }

    function finish() {
      item.style.overflow = '';
      item.classList.remove('is-closing');
      animation = null;
    }

    summary.addEventListener('click', function (event) {
      if (reduceMotion.matches || !item.animate) return;
      event.preventDefault();

      var startHeight = item.offsetHeight;
      var opening = !item.open || item.classList.contains('is-closing');
      if (animation) animation.cancel();
      item.style.overflow = 'hidden';

      if (opening) {
        item.classList.remove('is-closing');
        item.open = true;
        var endHeight = item.offsetHeight;
        animation = item.animate({ height: [startHeight + 'px', endHeight + 'px'] }, { duration: 450, easing: faqEase });
        answer.animate({ opacity: [0, 1] }, { duration: 450, easing: 'ease' });
        animation.onfinish = finish;
      } else {
        item.classList.add('is-closing');
        animation = item.animate({ height: [startHeight + 'px', closedHeight() + 'px'] }, { duration: 380, easing: faqEase });
        animation.onfinish = function () {
          item.open = false;
          finish();
        };
      }
    });
  });

  /* ---------- Barre « Réserver » sur téléphone ----------
     Masquée tant qu'un autre bouton de réservation bien visible est à l'écran
     (carte du hero, section réservation, pied de page), pour ne pas doubler. */
  var mobileCta = document.querySelector('[data-mobile-cta]');

  if (mobileCta && hasObserver) {
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

  /* ---------- Carte des soins : photo du visage quand on lit les soins visage ----------
     Uniquement quand la photo reste collée à côté de la carte (grand écran).
     Elle passe sur le visage quand la catégorie arrive au centre de l'écran,
     reste ainsi en dessous, et revient à la photo d'origine au-dessus. */
  var soinsPhoto = document.querySelector('.soins__photo');
  var visageCat = document.getElementById('soins-visage');

  if (soinsPhoto && visageCat && hasObserver) {
    var wide = window.matchMedia('(min-width: 961px)');
    var visageReached = false;
    var updatePhoto = function () {
      soinsPhoto.classList.toggle('is-visage', wide.matches && visageReached);
    };

    new IntersectionObserver(function (entries) {
      var entry = entries[0];
      var middle = window.innerHeight / 2;
      visageReached = entry.isIntersecting || entry.boundingClientRect.top < middle;
      updatePhoto();
    }, { rootMargin: '-45% 0px -45% 0px' }).observe(visageCat);

    if (wide.addEventListener) wide.addEventListener('change', updatePhoto);
  }

  /* ---------- Soins conseillés : le cercle « à la main » se trace à l'arrivée ---------- */
  var notes = document.querySelectorAll('.note-reco');

  if (notes.length && hasObserver) {
    document.documentElement.classList.add('js-trace');
    var noteObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-drawn');
          noteObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -20% 0px' });
    notes.forEach(function (note) { noteObserver.observe(note); });
  }
})();
