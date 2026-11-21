/*!
 * TORQLINE — main interactions
 * GSAP + ScrollTrigger: scroll reveals, hero, counters, section transitions
 * Motion: hover physics, modal & menu transitions
 * Swiper: category + featured sliders
 * Lucide: icons
 */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var M = window.Motion || null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* If the animation layer can't run, show everything immediately. */
  var late = hasGSAP && !reduceMotion && !doc.classList.contains('has-anim');
  if (!hasGSAP || reduceMotion) doc.classList.remove('has-anim');
  window.__animReady = true;

  /* Scripts arrived after the 4s safety timeout (slow phone connection): the page is already visible.
     Keep what the visitor can see as it is, but re-arm the animations for everything further down. */
  if (late) {
    doc.classList.add('has-anim', 'anim-late');
    var fold = window.innerHeight * 0.95;
    $$('[data-reveal]').forEach(function (el) { if (el.getBoundingClientRect().top < fold) el.classList.add('is-in'); });
  }

  /* ---------- Icons ---------- */
  if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.75, 'aria-hidden': 'true' } });

  /* ---------- Gear art (lazy) ---------- */
  if (window.GearArt) window.GearArt.renderAll();

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });

  /* =========================================================
     Header: scrolled state + back-to-top
     ========================================================= */
  var header = $('.site-header');
  var toTop = $('.to-top');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 30);
    if (toTop) toTop.classList.toggle('is-visible', y > 900);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  /* =========================================================
     Navigation: mega menu + mobile drawer
     ========================================================= */
  var nav = $('.main-nav');
  var overlay = $('.nav-overlay');
  var menuBtn = $('.menu-toggle');
  var isMobile = function () { return window.matchMedia('(max-width: 1024px)').matches; };

  function openDrawer(open) {
    if (!nav) return;
    nav.classList.toggle('is-open', open);
    if (overlay) overlay.classList.toggle('is-open', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = $('.nav-drawer-head button', nav);
      if (first) first.focus();
      if (M && !reduceMotion) M.animate($$('.nav-list > li', nav), { opacity: [0, 1], x: [24, 0] }, { delay: M.stagger(0.04, { startDelay: 0.12 }), duration: 0.4, ease: [0.22, 0.8, 0.24, 1] });
    } else if (menuBtn) { menuBtn.focus(); }
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { openDrawer(true); });
  $$('[data-close-nav]').forEach(function (b) { b.addEventListener('click', function () { openDrawer(false); }); });
  if (overlay) overlay.addEventListener('click', function () { openDrawer(false); });
  $$('.main-nav a').forEach(function (a) {
    a.addEventListener('click', function () { if (isMobile() && nav.classList.contains('is-open')) openDrawer(false); });
  });

  $$('.has-mega').forEach(function (li) {
    var btn = $('.mega-toggle', li);
    var panel = $('.mega', li);
    var closeT;
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      if (open && M && !reduceMotion && !isMobile()) {
        M.animate($$('.mega-item, .mega-feature', panel), { opacity: [0, 1], y: [12, 0] }, { delay: M.stagger(0.03), duration: 0.35, ease: [0.22, 0.8, 0.24, 1] });
      }
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      set(btn.getAttribute('aria-expanded') !== 'true');
    });
    li.addEventListener('mouseenter', function () { if (!isMobile()) { clearTimeout(closeT); if (btn.getAttribute('aria-expanded') !== 'true') set(true); } });
    li.addEventListener('mouseleave', function () { if (!isMobile()) closeT = setTimeout(function () { set(false); }, 160); });
    li.addEventListener('focusout', function (e) { if (!isMobile() && !li.contains(e.relatedTarget)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) { set(false); btn.focus(); } });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav && nav.classList.contains('is-open')) openDrawer(false); });

  /* Active section highlighting (home page) */
  var sectionLinks = $$('.nav-link[data-section]');
  if (sectionLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    sectionLinks.forEach(function (l) { map[l.getAttribute('data-section')] = l; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          sectionLinks.forEach(function (l) { l.classList.remove('is-active'); });
          var l = map[e.target.id];
          if (l) l.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* =========================================================
     Hero gear train
     ========================================================= */
  var heroHost = $('[data-hero-gears]');
  var hero = heroHost && window.GearArt ? window.GearArt.buildHero(heroHost) : null;
  if (hero && !reduceMotion) {
    var angle = 0, boost = 0, visible = true, running = false, last = 0;
    var heroSec = $('.hero');
    var loop = function (now) {
      if (!visible || document.hidden) { running = false; return; }
      var dt = Math.min(now - last, 64) / 1000; last = now;
      angle += dt * (7 + boost);
      boost *= 0.94;
      hero.setAngle(angle);
      requestAnimationFrame(loop);
    };
    var start = function () {
      if (running || !visible || document.hidden) return;
      running = true; last = performance.now();
      requestAnimationFrame(loop);
    };
    if ('IntersectionObserver' in window && heroSec) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; start(); }).observe(heroSec);
    }
    window.addEventListener('scroll', function () { if (visible) boost = Math.min(boost + 2.4, 30); }, { passive: true });
    document.addEventListener('visibilitychange', start);
    start();
  }

  /* =========================================================
     GSAP scroll animations
     ========================================================= */
  if (hasGSAP && !reduceMotion) {
    var gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    var ST = window.ScrollTrigger;
    gsap.defaults({ ease: 'power3.out', duration: 0.9 });
    // Phones: don't recalculate every time the address bar slides in/out (avoids jumps while scrolling)
    if (ST) ST.config({ ignoreMobileResize: true });

    // Hero intro (skipped if the hero was already shown by the slow-connection fallback)
    if ($('.hero') && !late) {
      gsap.set('.hero [data-hero]', { y: 20 });
      var tl = gsap.timeline({ delay: 0.1 });
      tl.to('.hero h1 .line > span', { y: 0, duration: 1.1, stagger: 0.1, ease: 'power4.out' })
        .to('.hero [data-hero]', { opacity: 1, y: 0, stagger: 0.08, duration: 0.8 }, '-=0.7')
        .from('.hero-visual', { opacity: 0, scale: 0.92, rotate: -6, duration: 1.4, ease: 'expo.out', clearProps: 'transform' }, 0.15)
        .from('.hero-chip', { opacity: 0, y: 20, stagger: 0.15, duration: 0.7 }, 0.9)
        .from('.hero-strip .item', { opacity: 0, y: 20, stagger: 0.08, duration: 0.6 }, 0.8);

      if (ST) {
        gsap.to('.hero-visual .hero-gears', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } });
        gsap.to('.hero-copy', { yPercent: -10, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: 0.6 } });
      }
    }

    // Page hero (catalogue)
    if ($('.page-hero') && !late) {
      gsap.from('.page-hero [data-hero-item]', { opacity: 0, y: 30, stagger: 0.1, duration: 0.9 });
      gsap.from('.page-hero [data-gear]', { opacity: 0, rotate: -30, scale: 0.9, duration: 1.6, ease: 'expo.out' });
    }

    if (ST) {
      // Batched reveals — one observer, cheap transforms only
      ST.batch('[data-reveal]', {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          batch = batch.filter(function (el) { return !el.classList.contains('is-in'); });
          if (!batch.length) return;
          gsap.to(batch, {
            opacity: 1, y: 0, x: 0, stagger: 0.09, duration: 0.9, overwrite: true,
            // lock the finished state with a class before removing inline styles, so nothing snaps back
            onComplete: function () { batch.forEach(function (el) { el.classList.add('is-in'); }); gsap.set(batch, { clearProps: 'opacity,transform' }); }
          });
        }
      });

      // Section-to-section transition: each marked section's content rises into place as it slides over the previous one
      $$('[data-transition]').forEach(function (sec) {
        var inner = sec.querySelector(':scope > .container');
        if (inner) gsap.from(inner, { y: 70, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 45%', scrub: 0.5 } });
      });

      // Section eyebrows: tracking tightens in
      $$('.section .eyebrow').forEach(function (e) {
        gsap.from(e, { letterSpacing: '0.5em', opacity: 0, duration: 1, scrollTrigger: { trigger: e, start: 'top 90%', once: true } });
      });

      // Parallax art
      $$('[data-parallax]').forEach(function (n) {
        var amt = parseFloat(n.getAttribute('data-parallax')) || 12;
        gsap.fromTo(n, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: n.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });

      // Rotate decorative gears on scroll
      $$('[data-scroll-spin]').forEach(function (n) {
        var amt = parseFloat(n.getAttribute('data-scroll-spin')) || 90;
        gsap.to(n, { rotate: amt, ease: 'none', scrollTrigger: { trigger: n.closest('section') || n, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
      });

      // Process line
      var pl = $('.process-line i');
      if (pl) gsap.fromTo(pl, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.process-track', start: 'top 80%', end: 'bottom 60%', scrub: 0.6 } });
      $$('.step').forEach(function (s, i) {
        gsap.from(s.querySelector('.dot'), { scale: 0.4, opacity: 0, rotate: -45, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: s, start: 'top 85%', once: true }, delay: i * 0.05 });
      });

      // Counters
      $$('[data-count]').forEach(function (n) {
        var target = parseFloat(n.getAttribute('data-count'));
        var obj = { v: 0 };
        var fmt = new Intl.NumberFormat('en-US');
        n.textContent = '0';
        ST.create({
          trigger: n, start: 'top 88%', once: true,
          onEnter: function () {
            gsap.to(obj, { v: target, duration: 2.2, ease: 'power2.out', onUpdate: function () { n.textContent = fmt.format(Math.round(obj.v)); } });
            var bar = n.closest('.stat') && n.closest('.stat').querySelector('.bar i');
            if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 2.2, ease: 'power2.out' });
          }
        });
      });

      // Industries stagger
      if ($('.ind-grid')) gsap.from('.ind-card', { opacity: 0, y: 40, stagger: { each: 0.06, grid: 'auto', from: 'start' }, duration: 0.8, scrollTrigger: { trigger: '.ind-grid', start: 'top 82%', once: true } });

      window.addEventListener('load', function () { ST.refresh(); });
    }
  }

  /* =========================================================
     Swiper sliders
     ========================================================= */
  if (window.Swiper) {
    var catEl = $('.cat-slider');
    if (catEl) {
      new window.Swiper(catEl, {
        slidesPerView: 1.15, spaceBetween: 16, speed: 700, grabCursor: true, watchSlidesProgress: true,
        navigation: { nextEl: '.cat-next', prevEl: '.cat-prev' },
        pagination: { el: '.cat-progress', type: 'progressbar' },
        keyboard: { enabled: true, onlyInViewport: true },
        a11y: { enabled: true },
        breakpoints: { 560: { slidesPerView: 2.1, spaceBetween: 18 }, 900: { slidesPerView: 3, spaceBetween: 22 }, 1280: { slidesPerView: 4, spaceBetween: 24 } }
      });
    }
    var featEl = $('.featured-slider');
    if (featEl) {
      new window.Swiper(featEl, {
        slidesPerView: 1.08, spaceBetween: 16, speed: 700, grabCursor: true,
        autoplay: reduceMotion ? false : { delay: 4800, disableOnInteraction: false, pauseOnMouseEnter: true },
        navigation: { nextEl: '.feat-next', prevEl: '.feat-prev' },
        pagination: { el: '.feat-progress', type: 'progressbar' },
        keyboard: { enabled: true, onlyInViewport: true },
        a11y: { enabled: true },
        breakpoints: { 620: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 3, spaceBetween: 24 } }
      });
    }
  }

  /* =========================================================
     Motion: hover physics
     ========================================================= */
  function spinArt(card, to) {
    var host = card.querySelector('[data-gear]');
    if (!host || !window.GearArt) return;
    var spin = window.GearArt.render(host);
    if (!M || reduceMotion) return;
    var from = host.__angle || 0;
    if (host.__anim) host.__anim.stop();
    host.__anim = M.animate(from, to, {
      duration: 1.1, ease: [0.22, 0.8, 0.24, 1],
      onUpdate: function (v) { host.__angle = v; spin(v); }
    });
  }

  if (finePointer && !reduceMotion) {
    $$('.product-card, .cat-card').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        if (M) M.animate(card, { y: -8 }, { type: 'spring', stiffness: 260, damping: 22 });
        spinArt(card, (card.querySelector('[data-gear]').__angle || 0) + 45);
      });
      card.addEventListener('mouseleave', function () {
        if (M) M.animate(card, { y: 0, rotateX: 0, rotateY: 0 }, { type: 'spring', stiffness: 260, damping: 24 });
      });
      card.addEventListener('mousemove', function (e) {
        if (!M) return;
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        M.animate(card, { rotateY: px * 4, rotateX: -py * 4, transformPerspective: 900 }, { duration: 0.3 });
      });
    });

    // Magnetic CTA buttons
    $$('[data-magnetic]').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        if (!M) return;
        var r = b.getBoundingClientRect();
        M.animate(b, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.3 }, { duration: 0.3 });
      });
      b.addEventListener('mouseleave', function () { if (M) M.animate(b, { x: 0, y: 0 }, { type: 'spring', stiffness: 300, damping: 15 }); });
    });

    // Certification + QA hover nudge
    $$('.cert, .contact-card').forEach(function (c) {
      c.addEventListener('mouseenter', function () { if (M) M.animate(c, { x: 6 }, { type: 'spring', stiffness: 300, damping: 20 }); });
      c.addEventListener('mouseleave', function () { if (M) M.animate(c, { x: 0 }, { type: 'spring', stiffness: 300, damping: 20 }); });
    });
  }

  /* =========================================================
     Touch screens (phones / tablets): no hover, so animate on scroll and tap instead
     ========================================================= */
  if (!finePointer && !reduceMotion) {
    // Gear artwork turns as each card scrolls (or is swiped) into view
    if ('IntersectionObserver' in window) {
      var spinIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var host = e.target.querySelector('[data-gear]');
          spinArt(e.target, ((host && host.__angle) || 0) + 60);
        });
      }, { threshold: 0.6 });
      $$('.product-card, .cat-card').forEach(function (c) { spinIO.observe(c); });
    }

    // Press feedback: cards and buttons sink slightly under the finger, then spring back
    if (M) {
      $$('.product-card, .cat-card, .ind-card, .btn, .slider-btn, .cert, .contact-card').forEach(function (el) {
        var down = function () { M.animate(el, { scale: 0.97 }, { duration: 0.12 }); };
        var up = function () { M.animate(el, { scale: 1 }, { type: 'spring', stiffness: 420, damping: 18 }); };
        el.addEventListener('pointerdown', down, { passive: true });
        el.addEventListener('pointerup', up, { passive: true });
        el.addEventListener('pointercancel', up, { passive: true });
        el.addEventListener('pointerleave', up, { passive: true });
      });
    }

    // Hover-only highlights become "active while in the middle of the screen"
    if (hasGSAP && window.ScrollTrigger) {
      $$('.ind-card, .step, .cert').forEach(function (el) {
        window.ScrollTrigger.create({ trigger: el, start: 'top 62%', end: 'bottom 38%', toggleClass: 'is-active' });
      });
    }
  }

  /* =========================================================
     Enquiry modal
     ========================================================= */
  var modal = $('#enquiry-modal');
  var lastFocus = null;
  function openModal(product) {
    if (!modal) return;
    lastFocus = document.activeElement;
    var field = $('[name="product"]', modal);
    var pill = $('.product-pill', modal);
    if (field) field.value = product || '';
    if (pill) pill.textContent = product ? 'Enquiry for: ' + product : '';
    var status = $('.form-status', modal);
    if (status) status.classList.remove('is-visible', 'is-error');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    var dialog = $('.modal-dialog', modal);
    if (M && !reduceMotion) {
      M.animate($('.modal-backdrop', modal), { opacity: [0, 1] }, { duration: 0.3 });
      M.animate(dialog, { opacity: [0, 1], y: [40, 0], scale: [0.97, 1] }, { type: 'spring', stiffness: 220, damping: 24 });
    }
    setTimeout(function () { var f = $('input[name="name"]', modal); if (f) f.focus(); }, 60);
  }
  function closeModal() {
    if (!modal || !modal.classList.contains('is-open')) return;
    var closed = false;
    var done = function () {
      if (closed) return;
      closed = true;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (lastFocus) lastFocus.focus();
    };
    if (M && !reduceMotion) {
      M.animate($('.modal-backdrop', modal), { opacity: 0 }, { duration: 0.2 });
      M.animate($('.modal-dialog', modal), { opacity: 0, y: 30 }, { duration: 0.22 });
      setTimeout(done, 240);
    } else done();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-enquire]');
    if (t) { e.preventDefault(); openModal(t.getAttribute('data-product') || ''); }
    if (e.target.closest('[data-close-modal]')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (!modal || !modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      var f = $$('a[href], button, input, select, textarea', modal).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* =========================================================
     Forms — GitHub Pages is static, so:
     - If the form has data-endpoint (e.g. a free Formspree URL) it POSTs there.
     - Otherwise it opens the visitor's email client with the enquiry pre-filled.
     ========================================================= */
  $$('form[data-enquiry-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('.form-status', form);
      var msg = status ? $('span', status) : null;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = new FormData(form);
      if (data.get('_gotcha')) return; // honeypot
      var endpoint = form.getAttribute('data-endpoint');
      var btn = $('button[type="submit"]', form);
      var show = function (ok, text) {
        if (!status) return;
        status.classList.add('is-visible');
        status.classList.toggle('is-error', !ok);
        if (msg) msg.textContent = text;
      };
      if (endpoint) {
        if (btn) btn.disabled = true;
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error('bad');
            form.reset();
            show(true, 'Thank you — your enquiry has been received. Our engineering team will respond within one business day.');
          })
          .catch(function () { show(false, 'Sorry, something went wrong. Please email us directly at ' + (form.getAttribute('data-mailto') || 'our sales address') + '.'); })
          .then(function () { if (btn) btn.disabled = false; });
      } else {
        var to = form.getAttribute('data-mailto') || 'sales@example.com';
        var subject = 'Enquiry' + (data.get('product') ? ': ' + data.get('product') : '') + ' — ' + (data.get('company') || data.get('name') || '');
        var lines = [];
        data.forEach(function (v, k) { if (k.charAt(0) !== '_' && v) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ': ' + v); });
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
        show(true, 'Your email app has opened with the enquiry pre-filled — just press send.');
      }
    });
  });
})();
