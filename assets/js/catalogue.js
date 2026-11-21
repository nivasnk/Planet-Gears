/*!
 * Product catalogue — filter, search, sort (GSAP Flip for layout transitions)
 * Products are plain HTML in products.html (good for SEO); this script only filters them.
 */
(function () {
  'use strict';
  var grid = document.getElementById('catalogue-grid');
  if (!grid) return;

  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap, Flip = window.Flip;
  if (gsap && Flip) gsap.registerPlugin(Flip);

  var cards = $$('.product-card', grid);
  var form = document.getElementById('filter-form');
  var search = document.getElementById('f-search');
  var industry = document.getElementById('f-industry');
  var sort = document.getElementById('f-sort');
  var countEl = document.getElementById('result-count');
  var chipsEl = document.getElementById('active-chips');
  var empty = document.getElementById('empty-state');
  var panel = document.getElementById('filters');
  var labels = {};
  $$('input[type="checkbox"]', form).forEach(function (cb) { labels[cb.name + ':' + cb.value] = cb.closest('label').querySelector('.lbl').textContent; });
  if (industry) $$('option', industry).forEach(function (o) { if (o.value) labels['industry:' + o.value] = o.textContent; });

  // facet counts
  ['category', 'material'].forEach(function (facet) {
    $$('input[name="' + facet + '"]', form).forEach(function (cb) {
      var n = cards.filter(function (c) { return c.getAttribute('data-' + facet) === cb.value; }).length;
      var badge = cb.closest('label').querySelector('.count');
      if (badge) badge.textContent = n;
    });
  });

  function checked(name) { return $$('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; }); }

  function state() {
    return { category: checked('category'), material: checked('material'), industry: industry ? industry.value : '', q: (search ? search.value : '').trim().toLowerCase() };
  }

  function matches(card, s) {
    if (s.category.length && s.category.indexOf(card.getAttribute('data-category')) < 0) return false;
    if (s.material.length && s.material.indexOf(card.getAttribute('data-material')) < 0) return false;
    if (s.industry && (' ' + card.getAttribute('data-industry') + ' ').indexOf(' ' + s.industry + ' ') < 0) return false;
    if (s.q && card.textContent.toLowerCase().indexOf(s.q) < 0) return false;
    return true;
  }

  function sortCards() {
    var v = sort ? sort.value : 'featured';
    var list = cards.slice();
    if (v === 'name') list.sort(function (a, b) { return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name')); });
    else if (v === 'size') list.sort(function (a, b) { return parseFloat(b.getAttribute('data-size')) - parseFloat(a.getAttribute('data-size')); });
    else list.sort(function (a, b) { return parseFloat(a.getAttribute('data-order')) - parseFloat(b.getAttribute('data-order')); });
    list.forEach(function (c) { grid.appendChild(c); });
  }

  function renderChips(s) {
    chipsEl.innerHTML = '';
    var add = function (key, txt) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.setAttribute('data-key', key);
      b.innerHTML = '<span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      b.firstChild.textContent = txt;
      b.setAttribute('aria-label', 'Remove filter ' + txt);
      chipsEl.appendChild(b);
    };
    s.category.forEach(function (v) { add('category:' + v, labels['category:' + v]); });
    s.material.forEach(function (v) { add('material:' + v, labels['material:' + v]); });
    if (s.industry) add('industry:' + s.industry, labels['industry:' + s.industry]);
    if (s.q) add('q:', '“' + s.q + '”');
  }

  function apply(animate) {
    var s = state();
    var flipState = animate && Flip && !reduceMotion ? Flip.getState(cards) : null;
    sortCards();
    var shown = 0;
    cards.forEach(function (c) { var ok = matches(c, s); c.hidden = !ok; if (ok) shown++; });
    countEl.innerHTML = 'Showing <strong>' + shown + '</strong> of ' + cards.length + ' products';
    empty.classList.toggle('is-visible', shown === 0);
    renderChips(s);
    if (flipState) {
      Flip.from(flipState, {
        duration: 0.55, ease: 'power2.inOut', absolute: true, nested: true,
        onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45 }); },
        onLeave: function (els) { return gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.3 }); }
      });
    }
    // keep URL shareable
    var params = new URLSearchParams();
    if (s.category.length) params.set('cat', s.category.join(','));
    if (s.material.length) params.set('mat', s.material.join(','));
    if (s.industry) params.set('ind', s.industry);
    if (s.q) params.set('q', s.q);
    var qs = params.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) { /* e.g. inside the editor preview */ }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  // initial state from URL (e.g. products.html?cat=bevel from the mega menu)
  var params = new URLSearchParams(location.search);
  (params.get('cat') || '').split(',').forEach(function (v) { var cb = form.querySelector('input[name="category"][value="' + v + '"]'); if (cb) cb.checked = true; });
  (params.get('mat') || '').split(',').forEach(function (v) { var cb = form.querySelector('input[name="material"][value="' + v + '"]'); if (cb) cb.checked = true; });
  if (params.get('ind') && industry) industry.value = params.get('ind');
  if (params.get('q') && search) search.value = params.get('q');

  form.addEventListener('change', function () { apply(true); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  var t;
  if (search) search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { apply(true); }, 220); });
  if (sort) sort.addEventListener('change', function () { apply(true); });

  function clearAll() {
    $$('input[type="checkbox"]', form).forEach(function (i) { i.checked = false; });
    if (industry) industry.value = '';
    if (search) search.value = '';
    apply(true);
  }
  $$('[data-clear-filters]').forEach(function (b) { b.addEventListener('click', clearAll); });

  chipsEl.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var key = chip.getAttribute('data-key').split(':');
    if (key[0] === 'q') search.value = '';
    else if (key[0] === 'industry') industry.value = '';
    else { var cb = form.querySelector('input[name="' + key[0] + '"][value="' + key[1] + '"]'); if (cb) cb.checked = false; }
    apply(true);
  });

  // mobile filter drawer
  var overlay = document.querySelector('.nav-overlay');
  function openFilters(open) {
    panel.classList.toggle('is-open', open);
    if (overlay) overlay.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var f = panel.querySelector('input, select'); if (f) f.focus(); }
  }
  $$('[data-open-filters]').forEach(function (b) { b.addEventListener('click', function () { openFilters(true); }); });
  $$('[data-close-filters]').forEach(function (b) { b.addEventListener('click', function () { openFilters(false); }); });
  if (overlay) overlay.addEventListener('click', function () { if (panel.classList.contains('is-open')) openFilters(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) openFilters(false); });

  apply(false);
})();
