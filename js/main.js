/* ==========================================================================
   Violette Holistic Massage — scripts
   ========================================================================== */

(function () {
  'use strict';

  var hasObserver = 'IntersectionObserver' in window;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Réservation : lien Calendly avec le soin déjà choisi ----------
     Coller ici l'adresse de la page Calendly de Violette, par exemple
     'https://calendly.com/violette-holistic/seance'. Tant qu'elle est vide,
     les boutons « Réserver » mènent à la section réservation de la page.

     Dans Calendly, la question « Quel soin souhaites-tu ? » doit être la
     PREMIÈRE question du formulaire (c'est elle que remplit « a1 »), et ses
     choix doivent porter exactement les noms indiqués dans data-soin
     (« Drainage corps entier », « Massage liftant japonais »…).
     Les paramètres utm_* permettent de voir dans Calendly depuis quel bouton
     chaque rendez-vous a été pris. */
  var CALENDLY_URL = '';

  var bookLinks = document.querySelectorAll('[data-book]');

  function bookingPlace(link) {
    if (link.closest('.site-header')) return 'en-tete';
    if (link.closest('[data-mobile-cta]')) return 'barre-mobile';
    if (link.closest('.site-footer')) return 'pied-de-page';
    var section = link.closest('section');
    if (!section) return 'page';
    return section.id || section.classList[0];
  }

  bookLinks.forEach(function (link) {
    var place = bookingPlace(link);
    var soin = link.getAttribute('data-soin');

    if (CALENDLY_URL) {
      var params = ['utm_source=site', 'utm_content=' + encodeURIComponent(place)];
      if (soin) params.unshift('a1=' + encodeURIComponent(soin));
      link.href = CALENDLY_URL + (CALENDLY_URL.indexOf('?') === -1 ? '?' : '&') + params.join('&');
      link.target = '_blank';
      link.rel = 'noopener';
    }

    /* Mesure d'audience (Plausible, sans cookie) : compte chaque clic sur
       « Réserver », avec l'emplacement du bouton et le soin éventuel.
       Ne fait rien tant que Plausible n'est pas activé dans le <head>. */
    link.addEventListener('click', function () {
      if (typeof window.plausible !== 'function') return;
      var props = { emplacement: place };
      if (soin) props.soin = soin;
      window.plausible('Réserver', { props: props });
    });
  });

  /* ---------- Défilement fluide (Lenis) ----------
     Uniquement à la molette et au pavé tactile : sur écran tactile, le
     défilement natif du téléphone est conservé. Entièrement désactivé avec
     le réglage « réduire les animations », même s'il change en cours de
     visite. Les liens d'ancre sont gérés juste en dessous. */
  var lenis = null;

  function updateSmoothScroll() {
    if (!window.Lenis) return;
    if (reduceMotion.matches && lenis) {
      lenis.destroy();
      lenis = null;
    } else if (!reduceMotion.matches && !lenis) {
      lenis = new window.Lenis({ lerp: 0.135, autoRaf: true });
    }
  }

  updateSmoothScroll();
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', updateSmoothScroll);

  /* ---------- Liens internes : arriver au milieu de ce qu'on vise ----------
     On mesure le contenu visé (sans les marges intérieures de sa section)
     et l'espace réellement visible : sous l'en-tête collant (ordinateur),
     au-dessus de la barre « Réserver » (téléphone).
     - Le contenu tient dans cet espace : il arrive centré.
     - Il est plus haut que l'écran : son début arrive en haut de l'espace
       visible, avec un peu d'air, pour ne pas couper son titre.
     Une cible peut désigner le bloc à cadrer avec data-scroll-focus
     (par exemple le contenu d'une section). */
  var siteHeader = document.querySelector('.site-header');
  var bookingBar = document.querySelector('[data-mobile-cta]');
  var SCROLL_AIR = 24;

  function visibleArea(target) {
    var top = 0;
    if (siteHeader && getComputedStyle(siteHeader).position !== 'relative') {
      top = siteHeader.offsetHeight;
    }
    var bottom = window.innerHeight;
    /* La barre du bas se masque d'elle-même sur la réservation et le pied de page */
    var barHides = target.closest('#reserver, .site-footer');
    if (bookingBar && !barHides && getComputedStyle(bookingBar).display !== 'none') {
      bottom -= bookingBar.offsetHeight;
    }
    return { top: top, height: bottom - top };
  }

  function contentBox(el) {
    var rect = el.getBoundingClientRect();
    var style = getComputedStyle(el);
    var padTop = parseFloat(style.paddingTop) || 0;
    var padBottom = parseFloat(style.paddingBottom) || 0;
    return { top: rect.top + padTop, height: rect.height - padTop - padBottom };
  }

  function scrollPositionFor(target) {
    var focusSelector = target.getAttribute('data-scroll-focus');
    var box = contentBox((focusSelector && target.querySelector(focusSelector)) || target);
    var area = visibleArea(target);
    var offset = box.height <= area.height - 2 * SCROLL_AIR
      ? (area.height - box.height) / 2
      : SCROLL_AIR;
    var y = window.scrollY + box.top - area.top - offset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(max, Math.round(y)));
  }

  function scrollToTarget(target, instant) {
    var corrected = false;

    /* Pendant le trajet, des photos encore non chargées peuvent s'afficher
       et décaler légèrement la page : à l'arrivée, on remesure et on
       ajuste une fois si besoin. */
    var arrived = function () {
      var y = scrollPositionFor(target);
      if (!corrected && Math.abs(window.scrollY - y) > 2) {
        corrected = true;
        go(y);
      }
    };

    var go = function (y) {
      if (lenis && !instant) {
        lenis.scrollTo(y, { onComplete: arrived });
        return;
      }
      var smooth = !instant && !reduceMotion.matches;
      window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
      if (!smooth || Math.abs(window.scrollY - y) < 2) {
        arrived();
      } else if ('onscrollend' in window) {
        window.addEventListener('scrollend', arrived, { once: true });
      } else {
        setTimeout(arrived, 900);
      }
    };

    go(scrollPositionFor(target));

    /* Comme un lien d'ancre classique : le clavier repart de la cible */
    if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;

    event.preventDefault();
    if (id === 'top') {
      if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    } else {
      scrollToTarget(target, false);
    }
    if (history.pushState) history.pushState(null, '', '#' + id);
  });

  /* Arrivée sur la page avec une ancre (lien partagé, e-mail…) : même cadrage */
  window.addEventListener('load', function () {
    var id = decodeURIComponent(location.hash.slice(1));
    var target = id && id !== 'top' ? document.getElementById(id) : null;
    if (target) scrollToTarget(target, true);
  });

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

  /* ---------- Avis : posés côte à côte, on les fait glisser ----------
     L'avis du centre est net, ses voisins dépassent en transparence.
     On passe de l'un à l'autre :
     - en faisant glisser à la souris ou au doigt (l'avis suit le geste) ;
     - en balayant le pavé tactile de l'ordinateur à deux doigts ;
     - avec les points, ou les flèches ← → du clavier ;
     - en cliquant sur un avis voisin.
     Le fil ne boucle pas : il résiste un peu au premier et au dernier avis. */
  var carousel = document.querySelector('.reviews__carousel');

  if (carousel) {
    var viewport = carousel.querySelector('.reviews__viewport');
    var track = carousel.querySelector('.reviews__track');
    var slides = track.querySelectorAll('.review');
    var dots = document.querySelectorAll('.reviews__dots .dot');
    var slideCount = slides.length;
    var current = 0;

    var slideOffset = function (dx) {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var width = slides[0].offsetWidth;
      return (viewport.clientWidth - width) / 2 - current * (width + gap) + (dx || 0);
    };
    var renderTrack = function (dx) {
      track.style.transform = 'translate3d(' + slideOffset(dx) + 'px, 0, 0)';
    };
    /* Résistance élastique quand on tire au-delà du premier ou du dernier avis */
    var resist = function (dx) {
      return (current === 0 && dx > 0) || (current === slideCount - 1 && dx < 0) ? dx * 0.3 : dx;
    };
    var goTo = function (index) {
      current = Math.max(0, Math.min(slideCount - 1, index));
      slides.forEach(function (slide, n) {
        slide.classList.toggle('is-active', n === current);
        slide.setAttribute('aria-hidden', n === current ? 'false' : 'true');
      });
      dots.forEach(function (dot, n) {
        if (n === current) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      renderTrack(0);
    };
    /* Placement sans animation (arrivée sur la page, changement de taille) */
    var placeInstantly = function () {
      track.classList.add('is-dragging');
      renderTrack(0);
      void track.offsetWidth;
      track.classList.remove('is-dragging');
    };

    dots.forEach(function (dot, n) {
      dot.addEventListener('click', function () { goTo(n); });
    });

    carousel.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current + 1); }
    });

    /* Glisser à la souris ou au doigt (Pointer Events). Le geste ne compte
       que s'il est surtout horizontal : la page défile toujours normalement
       quand on glisse vers le haut ou le bas. */
    var pointerId = null, startX = 0, startY = 0, startTime = 0;
    var pressing = false, dragging = false, justDragged = false;

    viewport.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startTime = Date.now();
      pressing = true;
      dragging = false;
    });

    viewport.addEventListener('pointermove', function (event) {
      if (!pressing || event.pointerId !== pointerId) return;
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { pressing = false; return; }
        dragging = true;
        viewport.setPointerCapture(pointerId);
        viewport.classList.add('is-dragging');
        track.classList.add('is-dragging');
      }
      renderTrack(resist(dx));
    });

    var endDrag = function (event, cancelled) {
      if (!pressing || event.pointerId !== pointerId) return;
      pressing = false;
      if (!dragging) return;
      dragging = false;
      justDragged = true;
      viewport.classList.remove('is-dragging');
      track.classList.remove('is-dragging');
      var dx = cancelled ? 0 : event.clientX - startX;
      var speed = dx / Math.max(1, Date.now() - startTime);
      /* Assez loin, ou lancé assez vite : on change d'avis */
      if (dx < -70 || (speed < -0.45 && dx < -20)) goTo(current + 1);
      else if (dx > 70 || (speed > 0.45 && dx > 20)) goTo(current - 1);
      else goTo(current);
    };
    viewport.addEventListener('pointerup', function (event) { endDrag(event, false); });
    viewport.addEventListener('pointercancel', function (event) { endDrag(event, true); });
    viewport.addEventListener('dragstart', function (event) { event.preventDefault(); });

    /* Un clic sur un avis voisin l'amène au centre (sauf juste après un glissement) */
    track.addEventListener('click', function (event) {
      if (justDragged) { justDragged = false; return; }
      var slide = event.target.closest('.review');
      if (slide && !slide.classList.contains('is-active')) {
        goTo(Array.prototype.indexOf.call(slides, slide));
      }
    });

    /* Pavé tactile : balayage horizontal à deux doigts. L'avis suit les
       doigts ; passé un seuil, on change d'avis une seule fois par geste.

       Après un balayage, le Mac continue d'envoyer des événements de plus
       en plus faibles pendant 1 à 2 s (l'élan). Ils doivent être ignorés,
       sinon un geste ferait défiler plusieurs avis. Mais on ne peut pas
       attendre la fin de l'élan pour accepter le geste suivant : si on
       rebalaie pendant l'élan, le flux d'événements ne s'arrête jamais.
       On reconnaît donc un nouveau geste à sa forme :
       - l'élan ne fait que ralentir et ne change jamais de sens ;
       - un nouveau balayage accélère (au moins deux événements de suite
         nettement plus forts que l'élan), ou part dans l'autre sens.
       Un silence de 180 ms termine aussi le geste en cours. */
    var WHEEL_STEP = 90;          /* distance à parcourir pour changer d'avis */
    var wheelDistance = 0;
    var wheelLocked = false;      /* avis changé : on ignore l'élan */
    var wheelLockTime = 0;
    var wheelLockSign = 0;
    var wheelRecent = [];         /* intensités récentes de l'élan */
    var wheelRises = 0;
    var wheelTimer = null;

    var wheelUnlock = function () {
      wheelLocked = false;
      wheelDistance = 0;
      wheelRecent = [];
      wheelRises = 0;
    };

    /* Pendant l'élan : ce nouvel événement commence-t-il un autre geste ? */
    var isNewGesture = function (strength, sign) {
      if (sign !== wheelLockSign && strength >= 4) return true;
      var settled = Date.now() - wheelLockTime > 250 && wheelRecent.length >= 3;
      var floor = Math.min.apply(null, wheelRecent.length ? wheelRecent : [strength]);
      wheelRises = settled && strength > floor * 1.5 + 2 ? wheelRises + 1 : 0;
      wheelRecent.push(strength);
      if (wheelRecent.length > 5) wheelRecent.shift();
      return wheelRises >= 2;
    };

    viewport.addEventListener('wheel', function (event) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      var delta = event.deltaMode === 1 ? event.deltaX * 16 : event.deltaX;

      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () {
        if (!wheelLocked) {
          track.classList.remove('is-dragging');
          goTo(current);
        }
        wheelUnlock();
      }, 180);

      if (wheelLocked) {
        if (!isNewGesture(Math.abs(delta), delta > 0 ? 1 : -1)) return;
        wheelUnlock();
      }

      wheelDistance -= delta;
      if (Math.abs(wheelDistance) > WHEEL_STEP) {
        wheelLocked = true;
        wheelLockTime = Date.now();
        wheelLockSign = delta > 0 ? 1 : -1;
        track.classList.remove('is-dragging');
        goTo(current + (wheelDistance < 0 ? 1 : -1));
        return;
      }
      track.classList.add('is-dragging');
      renderTrack(resist(wheelDistance));
    }, { passive: false });

    window.addEventListener('resize', placeInstantly);
    goTo(0);
    placeInstantly();
  }

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
