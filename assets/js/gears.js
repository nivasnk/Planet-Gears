/*!
 * Gear renderer — draws metallic, correctly-meshing SVG gears.
 * No images required: every product visual and the hero machinery are generated here.
 * Exposes window.GearArt = { render(el), renderAll(root), buildHero(el) }
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;
  var DEG = 180 / Math.PI;

  /* Tone stops: highlight, light, mid, sheen, shadow */
  var TONES = {
    steel:   ['#f6f8fa', '#c9cfd6', '#8c949f', '#dfe3e8', '#5d646e'],
    dark:    ['#9098a3', '#555c67', '#30353d', '#646b76', '#1c1f24'],
    orange:  ['#ffc794', '#ff7b26', '#de560c', '#ff9850', '#8f3505'],
    bronze:  ['#f7dfb3', '#d2a865', '#9a6f34', '#e4bf7f', '#664716'],
    polymer: ['#fbfaf7', '#e7e5df', '#bfbdb5', '#f1efea', '#97958d']
  };

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function f(n) { return Math.round(n * 100) / 100; }
  function circlePath(cx, cy, r) {
    return 'M' + f(cx + r) + ' ' + f(cy) +
      'A' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(cx - r) + ' ' + f(cy) +
      'A' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(cx + r) + ' ' + f(cy) + 'Z';
  }

  /* Tooth outline. internal=true points the teeth inwards (ring gears). */
  function toothPath(z, m, o) {
    o = o || {};
    var rp = m * z / 2;
    var ra = o.internal ? rp - m : rp + m * (o.add || 1);
    var rf = o.internal ? rp + 1.25 * m : rp - m * (o.ded || 1.25);
    var step = 2 * Math.PI / z;
    var tip = step * (o.tip || 0.15), pit = step * 0.25, root = step * 0.31;
    var d = '';
    for (var i = 0; i < z; i++) {
      var c = i * step;
      var pts = [[rf, c - root], [rp, c - pit], [ra, c - tip], [ra, c + tip], [rp, c + pit], [rf, c + root]];
      for (var j = 0; j < pts.length; j++) {
        d += (i === 0 && j === 0 ? 'M' : 'L') + f(pts[j][0] * Math.cos(pts[j][1])) + ' ' + f(pts[j][0] * Math.sin(pts[j][1]));
      }
      var na = c + step - root;
      d += 'A' + f(rf) + ' ' + f(rf) + ' 0 0 1 ' + f(rf * Math.cos(na)) + ' ' + f(rf * Math.sin(na));
    }
    return d + 'Z';
  }

  /* Gradients are created per-SVG so IDs never collide. */
  function makeDefs(svg) {
    var id = 'ga' + (++uid);
    var defs = el('defs', null, svg);
    var ids = {};
    Object.keys(TONES).forEach(function (t) {
      var s = TONES[t];
      var lg = el('linearGradient', { id: id + t, x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
      [[0, s[0]], [0.28, s[1]], [0.52, s[2]], [0.7, s[3]], [1, s[4]]].forEach(function (p) {
        el('stop', { offset: p[0], 'stop-color': p[1] }, lg);
      });
      var vg = el('linearGradient', { id: id + t + 'v', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
      [[0, s[4]], [0.22, s[1]], [0.42, s[0]], [0.62, s[2]], [1, s[4]]].forEach(function (p) {
        el('stop', { offset: p[0], 'stop-color': p[1] }, vg);
      });
      var rg = el('radialGradient', { id: id + t + 'r', cx: '0.38', cy: '0.32', r: '0.8' }, defs);
      [[0, s[0]], [0.55, s[2]], [1, s[4]]].forEach(function (p) {
        el('stop', { offset: p[0], 'stop-color': p[1] }, rg);
      });
      ids[t] = { metal: 'url(#' + id + t + ')', bar: 'url(#' + id + t + 'v)', hub: 'url(#' + id + t + 'r)', edge: s[4], light: s[0] };
    });
    var sh = el('radialGradient', { id: id + 'sh' }, defs);
    el('stop', { offset: 0, 'stop-color': '#000', 'stop-opacity': '.45' }, sh);
    el('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': '0' }, sh);
    ids.shadow = 'url(#' + id + 'sh)';
    return ids;
  }

  /*
   * Build one gear. Returns { g, rp, z, setRotation(deg) }.
   * o: z, m, tone, holes, depth, helical, x, y, phase, detail
   */
  function gear(parent, ids, o) {
    var tone = ids[o.tone || 'steel'];
    var rp = o.m * o.z / 2, rf = rp - 1.25 * o.m;
    var g = el('g', { transform: 'translate(' + f(o.x || 0) + ' ' + f(o.y || 0) + ')' }, parent);
    var rots = [];
    var boreR = Math.max(rf * 0.15, o.m * 1.1);
    var hubR = boreR * 2.15;

    var body = toothPath(o.z, o.m, o) + circlePath(0, 0, boreR);
    if (o.holes) {
      var hc = (rf * 0.82 + hubR) / 2, hr = (rf * 0.86 - hubR) / 2 * 0.7;
      if (hr > 2) {
        for (var i = 0; i < o.holes; i++) {
          var a = (i + 0.5) * 2 * Math.PI / o.holes;
          body += circlePath(hc * Math.cos(a), hc * Math.sin(a), hr);
        }
      }
    }

    if (o.depth) {
      var back = el('g', { transform: 'translate(' + f(o.depth * 0.55) + ' ' + f(o.depth) + ')' }, g);
      var br = el('g', null, back);
      el('path', { d: body, 'fill-rule': 'evenodd', fill: ids.dark.metal }, br);
      rots.push({ n: br, off: o.helical ? 180 / o.z * 0.8 : 0 });
    }

    var front = el('g', null, g);
    el('path', { d: body, 'fill-rule': 'evenodd', fill: tone.metal, stroke: tone.edge, 'stroke-width': f(Math.max(0.6, o.m * 0.08)), 'stroke-linejoin': 'round' }, front);
    if (o.detail !== false) {
      el('circle', { r: f(rf * 0.86), fill: 'none', stroke: 'rgba(0,0,0,.28)', 'stroke-width': f(o.m * 0.32) }, front);
      el('circle', { r: f(rf * 0.86 + o.m * 0.24), fill: 'none', stroke: 'rgba(255,255,255,.4)', 'stroke-width': f(o.m * 0.1) }, front);
      el('path', { d: circlePath(0, 0, hubR) + circlePath(0, 0, boreR), 'fill-rule': 'evenodd', fill: tone.hub, stroke: 'rgba(0,0,0,.35)', 'stroke-width': f(o.m * 0.12) }, front);
      el('rect', { x: f(-boreR * 0.28), y: f(-boreR - o.m * 0.45), width: f(boreR * 0.56), height: f(o.m * 0.6), fill: 'rgba(12,14,17,.8)' }, front);
    }
    rots.push({ n: front, off: 0 });

    var obj = {
      g: g, rp: rp, z: o.z, x: o.x || 0, y: o.y || 0, phase: o.phase || 0, ratio: 1,
      setRotation: function (deg) {
        for (var k = 0; k < rots.length; k++) rots[k].n.setAttribute('transform', 'rotate(' + f(deg + rots[k].off) + ')');
      }
    };
    obj.setRotation(obj.phase);
    return obj;
  }

  /* Phase of a gear B meshing externally with gear A (rotation rhoA) at angle theta (deg). */
  function meshPhase(zA, zB, rhoA, thetaDeg) {
    return thetaDeg + 180 + 180 / zB + (thetaDeg - rhoA) * zA / zB;
  }

  function svgRoot(host, vb, label) {
    var svg = el('svg', { viewBox: vb, role: 'img', 'aria-label': label || 'Gear illustration', preserveAspectRatio: 'xMidYMid meet', focusable: 'false' });
    host.appendChild(svg);
    return svg;
  }

  function shadow(svg, ids, cx, cy, rx, ry) {
    el('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry, fill: ids.shadow }, svg);
  }

  /* ---------- Product art (viewBox 400 x 300) ---------- */
  var ART = {
    spur: function (svg, ids, d) {
      var z = d.teeth || 28, m = 226 / (z + 2);
      shadow(svg, ids, 210, 276, 150, 16);
      var g = gear(svg, ids, { z: z, m: m, tone: d.tone || 'steel', holes: d.holes == null ? 6 : d.holes, depth: 12, x: 196, y: 142 });
      return function (a) { g.setRotation(a); };
    },
    helical: function (svg, ids, d) {
      var z = d.teeth || 34, m = 226 / (z + 2);
      shadow(svg, ids, 210, 276, 150, 16);
      var g = gear(svg, ids, { z: z, m: m, tone: d.tone || 'steel', holes: d.holes == null ? 5 : d.holes, depth: 16, helical: true, x: 194, y: 140 });
      return function (a) { g.setRotation(a); };
    },
    sprocket: function (svg, ids, d) {
      var z = d.teeth || 24, m = 222 / (z + 2);
      shadow(svg, ids, 210, 276, 150, 16);
      var g = gear(svg, ids, { z: z, m: m, tone: d.tone || 'steel', holes: 5, depth: 18, tip: 0.05, add: 0.95, ded: 1.45, x: 194, y: 140 });
      return function (a) { g.setRotation(a); };
    },
    bevel: function (svg, ids, d) {
      var z = d.teeth || 30, tone = ids[d.tone || 'steel'];
      var R1 = 132, R2 = 82, y1 = 205, y2 = 118, k = 0.4;
      shadow(svg, ids, 200, 262, 150, 16);
      var root = el('g', null, svg);
      // cone side
      el('path', { d: 'M' + (200 - R1) + ' ' + y1 + 'L' + (200 - R2) + ' ' + y2 + 'L' + (200 + R2) + ' ' + y2 + 'L' + (200 + R1) + ' ' + y1 +
        'A' + R1 + ' ' + (R1 * k) + ' 0 0 1 ' + (200 - R1) + ' ' + y1 + 'Z', fill: ids.dark.bar }, root);
      var teeth = el('g', null, root);
      // back face ring
      el('ellipse', { cx: 200, cy: y1 + 16, rx: R1 + 6, ry: (R1 + 6) * k, fill: ids.dark.metal, opacity: '.9' }, root).parentNode.insertBefore(root.lastChild, root.firstChild);
      // top face
      var top = el('g', { transform: 'translate(200 ' + y2 + ') scale(1 ' + k + ')' }, root);
      var tg = gear(top, ids, { z: z, m: (R2 * 2) / (z + 2), tone: d.tone || 'steel', holes: 0, detail: true });
      function drawTeeth(a) {
        while (teeth.firstChild) teeth.removeChild(teeth.firstChild);
        var step = 360 / z, path = '', dark = '';
        for (var i = 0; i < z; i++) {
          var ang = (i * step + a) / DEG;
          var s = Math.sin(ang);
          if (s < -0.05) continue; // front half only
          var x1 = 200 + R1 * Math.cos(ang), yy1 = y1 + R1 * k * s;
          var x2 = 200 + R2 * Math.cos(ang), yy2 = y2 + R2 * k * s;
          var w = 0.32 * step / DEG;
          var xa = 200 + R1 * Math.cos(ang + w), ya = y1 + R1 * k * Math.sin(ang + w);
          var xb = 200 + R2 * Math.cos(ang + w), yb = y2 + R2 * k * Math.sin(ang + w);
          path += 'M' + f(x1) + ' ' + f(yy1) + 'L' + f(x2) + ' ' + f(yy2) + 'L' + f(xb) + ' ' + f(yb) + 'L' + f(xa) + ' ' + f(ya) + 'Z';
          dark += 'M' + f(x1) + ' ' + f(yy1) + 'L' + f(x2) + ' ' + f(yy2);
        }
        el('path', { d: path, fill: tone.metal, opacity: '.9' }, teeth);
        el('path', { d: dark, stroke: 'rgba(0,0,0,.45)', 'stroke-width': 1.2, fill: 'none' }, teeth);
      }
      drawTeeth(0);
      return function (a) { tg.setRotation(a); drawTeeth(a); };
    },
    worm: function (svg, ids, d) {
      shadow(svg, ids, 205, 278, 160, 14);
      var wheel = gear(svg, ids, { z: 36, m: 5.4, tone: 'bronze', holes: 6, depth: 10, x: 210, y: 118 });
      var g = el('g', null, svg);
      el('rect', { x: 14, y: 226, width: 372, height: 16, rx: 3, fill: ids.steel.bar }, g);
      el('rect', { x: 62, y: 206, width: 276, height: 56, rx: 10, fill: ids.steel.bar, stroke: ids.steel.edge, 'stroke-width': 1 }, g);
      var threads = el('g', null, g);
      var clip = el('clipPath', { id: 'wc' + (++uid) }, svg);
      el('rect', { x: 62, y: 206, width: 276, height: 56, rx: 10 }, clip);
      threads.setAttribute('clip-path', 'url(#' + clip.id + ')');
      function draw(a) {
        while (threads.firstChild) threads.removeChild(threads.firstChild);
        var off = ((a % 360) / 360) * 24, p = '', h = '';
        for (var x = 30 + off; x < 360; x += 24) {
          p += 'M' + f(x) + ' 206L' + f(x + 11) + ' 206L' + f(x + 25) + ' 262L' + f(x + 14) + ' 262Z';
          h += 'M' + f(x + 11) + ' 206L' + f(x + 25) + ' 262';
        }
        el('path', { d: p, fill: 'rgba(20,22,26,.42)' }, threads);
        el('path', { d: h, stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1.4, fill: 'none' }, threads);
      }
      draw(0);
      return function (a) { wheel.setRotation(a / 36); draw(a); };
    },
    rack: function (svg, ids, d) {
      var m = 8, pl = 210, z = 16, rp = m * z / 2, pitch = Math.PI * m;
      shadow(svg, ids, 200, 280, 175, 12);
      var rack = el('g', null, svg);
      var bar = el('g', null, rack);
      function drawRack(shift) {
        while (bar.firstChild) bar.removeChild(bar.firstChild);
        var top = pl - m, bot = pl + 1.25 * m, dpath = 'M10 ' + f(bot);
        var start = 200 - pitch * 8 + (shift % pitch);
        while (start - pitch * 0.31 < 12) start += pitch;
        for (var x = start; x + pitch * 0.31 < 388; x += pitch) {
          dpath += 'L' + f(x - pitch * 0.31) + ' ' + f(bot) + 'L' + f(x - pitch * 0.15) + ' ' + f(top) + 'L' + f(x + pitch * 0.15) + ' ' + f(top) + 'L' + f(x + pitch * 0.31) + ' ' + f(bot);
        }
        dpath += 'L390 ' + f(bot) + 'L390 ' + f(bot + 36) + 'L10 ' + f(bot + 36) + 'Z';
        el('path', { d: dpath, fill: ids.steel.bar, stroke: ids.steel.edge, 'stroke-width': 1 }, bar);
        el('rect', { x: 10, y: f(bot + 24), width: 380, height: 4, fill: 'rgba(0,0,0,.18)' }, bar);
      }
      var pin = gear(svg, ids, { z: z, m: m, tone: d.tone || 'orange', holes: 0, depth: 8, x: 200, y: pl - rp, phase: 90 + 180 / z });
      drawRack(0);
      return function (a) {
        pin.setRotation(90 + 180 / z + a);
        drawRack(-(a / DEG) * rp);
      };
    },
    planetary: function (svg, ids, d) {
      var m = 3.5, zs = 18, zp = 21, zr = 60, cx = 200, cy = 146;
      var rs = m * zs / 2, rpl = m * zp / 2, orbit = rs + rpl;
      shadow(svg, ids, 205, 280, 140, 12);
      var ringG = el('g', { transform: 'translate(' + cx + ' ' + cy + ')' }, svg);
      var ringRot = el('g', null, ringG);
      var rr = m * zr / 2, outer = rr + 1.25 * m + 14;
      var ringPhase = 0;
      el('path', { d: circlePath(0, 0, outer) + toothPath(zr, m, { internal: true }), 'fill-rule': 'evenodd', fill: ids.dark.metal, stroke: '#111', 'stroke-width': 1 }, ringRot);
      for (var b = 0; b < 8; b++) {
        var ba = b * Math.PI / 4;
        el('circle', { cx: f((outer - 7) * Math.cos(ba)), cy: f((outer - 7) * Math.sin(ba)), r: 3, fill: ids.steel.hub }, ringRot);
      }
      var sun = gear(svg, ids, { z: zs, m: m, tone: 'orange', holes: 0, x: cx, y: cy });
      var planets = [];
      for (var i = 0; i < 3; i++) {
        var th = -90 + i * 120;
        var ph = meshPhase(zs, zp, 0, th);
        planets.push({ th: th, ph: ph, g: gear(svg, ids, { z: zp, m: m, tone: 'steel', holes: 4, x: cx + orbit * Math.cos(th / DEG), y: cy + orbit * Math.sin(th / DEG), phase: ph }) });
      }
      // ring phase from first planet (internal mesh, same direction)
      var p0 = planets[0];
      ringPhase = p0.th - (p0.th - p0.ph) * zp / zr - 180 / zr;
      ringRot.setAttribute('transform', 'rotate(' + f(ringPhase) + ')');
      // fixed ring: sun drives, planets orbit (carrier)
      return function (a) {
        var carrier = a * zs / (zs + zr);
        sun.setRotation(a);
        planets.forEach(function (p) {
          var th = p.th + carrier;
          p.g.g.setAttribute('transform', 'translate(' + f(cx + orbit * Math.cos(th / DEG)) + ' ' + f(cy + orbit * Math.sin(th / DEG)) + ')');
          // planet rotation relative to fixed ring
          p.g.setRotation(p.ph + carrier - (a - carrier) * zs / zp);
        });
      };
    },
    ring: function (svg, ids, d) {
      var m = 4.2, z = 52, cx = 200, cy = 146, rr = m * z / 2, outer = rr + 1.25 * m + 18;
      shadow(svg, ids, 205, 282, 150, 12);
      var g = el('g', { transform: 'translate(' + (cx + 8) + ' ' + (cy + 12) + ')' }, svg);
      el('path', { d: circlePath(0, 0, outer) + circlePath(0, 0, rr - m), 'fill-rule': 'evenodd', fill: ids.dark.metal }, g);
      var g2 = el('g', { transform: 'translate(' + cx + ' ' + cy + ')' }, svg);
      var rot = el('g', null, g2);
      el('path', { d: circlePath(0, 0, outer) + toothPath(z, m, { internal: true }), 'fill-rule': 'evenodd', fill: ids[d.tone || 'steel'].metal, stroke: ids.steel.edge, 'stroke-width': 1 }, rot);
      el('circle', { r: f(outer - 9), fill: 'none', stroke: 'rgba(0,0,0,.25)', 'stroke-width': 1.5 }, rot);
      for (var b = 0; b < 12; b++) {
        var ba = b * Math.PI / 6;
        el('circle', { cx: f((outer - 9) * Math.cos(ba)), cy: f((outer - 9) * Math.sin(ba)), r: 3.6, fill: '#22262c' }, rot);
      }
      return function (a) { rot.setAttribute('transform', 'rotate(' + f(a * 0.4) + ')'); };
    },
    shaft: function (svg, ids, d) {
      shadow(svg, ids, 200, 262, 175, 12);
      var g = el('g', null, svg);
      var bar = ids.steel.bar;
      el('rect', { x: 18, y: 134, width: 70, height: 30, rx: 3, fill: bar }, g);
      el('rect', { x: 86, y: 124, width: 70, height: 50, rx: 3, fill: bar }, g);
      el('rect', { x: 238, y: 128, width: 92, height: 42, rx: 3, fill: bar }, g);
      el('rect', { x: 328, y: 138, width: 56, height: 22, rx: 3, fill: bar }, g);
      var spl = el('g', null, g);
      var pin = el('g', null, g);
      el('rect', { x: 156, y: 72, width: 84, height: 154, rx: 4, fill: ids[d.tone || 'orange'].bar, stroke: 'rgba(0,0,0,.35)' }, pin);
      var lines = el('g', null, pin);
      function draw(a) {
        while (lines.firstChild) lines.removeChild(lines.firstChild);
        while (spl.firstChild) spl.removeChild(spl.firstChild);
        var off = (a % 30) / 30 * 11, p = '', s = '';
        for (var y = 72 + off; y < 226; y += 11) p += 'M158 ' + f(y) + 'L238 ' + f(y + 3);
        for (var y2 = 128 + (off % 6); y2 < 170; y2 += 6) s += 'M240 ' + f(y2) + 'H328';
        el('path', { d: p, stroke: 'rgba(0,0,0,.4)', 'stroke-width': 2, fill: 'none' }, lines);
        el('path', { d: s, stroke: 'rgba(0,0,0,.28)', 'stroke-width': 1.4, fill: 'none' }, spl);
      }
      draw(0);
      return draw;
    }
  };
  ART.herringbone = ART.helical;
  ART.polymer = function (svg, ids, d) { d.tone = 'polymer'; return ART.spur(svg, ids, d); };

  function render(host) {
    if (host.__gearDone) return host.__spin;
    host.__gearDone = true;
    var type = host.getAttribute('data-gear') || 'spur';
    var data = {
      teeth: parseInt(host.getAttribute('data-teeth'), 10) || 0,
      tone: host.getAttribute('data-tone') || null,
      holes: host.hasAttribute('data-holes') ? parseInt(host.getAttribute('data-holes'), 10) : null
    };
    var svg = svgRoot(host, '0 0 400 300', host.getAttribute('data-label') || (type + ' gear illustration'));
    var ids = makeDefs(svg);
    var spin = (ART[type] || ART.spur)(svg, ids, data) || function () {};
    host.__spin = spin;
    return spin;
  }

  /* Lazy render: only build SVGs when near the viewport. */
  function renderAll(root) {
    var nodes = (root || document).querySelectorAll('[data-gear]');
    if (!('IntersectionObserver' in global)) { nodes.forEach(render); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { render(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '300px 0px' });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Hero gear train ---------- */
  function buildHero(host) {
    var svg = svgRoot(host, '0 0 1000 900', 'Interlocking precision gear train');
    var ids = makeDefs(svg);
    var M = 14;
    // engineering drawing layer
    var draft = el('g', { class: 'hero-draft', fill: 'none', stroke: 'rgba(200,210,222,.16)', 'stroke-width': 1 }, svg);

    var train = [];
    function add(o, parent, theta) {
      if (parent) {
        var dist = parent.rp + M * o.z / 2;
        o.x = parent.x + dist * Math.cos(theta / DEG);
        o.y = parent.y + dist * Math.sin(theta / DEG);
        o.phase = meshPhase(parent.z, o.z, parent.phase, theta);
      }
      o.m = M;
      var g = gear(svg, ids, o);
      g.ratio = parent ? -parent.ratio * parent.z / o.z : 1;
      train.push(g);
      return g;
    }
    var A = add({ z: 36, tone: 'steel', holes: 6, depth: 14, x: 560, y: 470 });
    var B = add({ z: 16, tone: 'orange', holes: 0, depth: 12 }, A, -38);
    add({ z: 12, tone: 'dark', holes: 0, depth: 10 }, B, -112);
    var D = add({ z: 22, tone: 'dark', holes: 5, depth: 12 }, A, 152);
    add({ z: 14, tone: 'steel', holes: 0, depth: 10 }, D, 228);
    add({ z: 18, tone: 'steel', holes: 4, depth: 12 }, A, 62);

    // pitch circles + centre lines for the "engineering drawing" look
    train.forEach(function (g) {
      el('circle', { cx: f(g.x), cy: f(g.y), r: f(g.rp), 'stroke-dasharray': '10 6 2 6' }, draft);
      el('path', { d: 'M' + f(g.x - g.rp - 30) + ' ' + f(g.y) + 'H' + f(g.x + g.rp + 30) + 'M' + f(g.x) + ' ' + f(g.y - g.rp - 30) + 'V' + f(g.y + g.rp + 30), 'stroke-dasharray': '18 6 3 6' }, draft);
    });
    // move drafting layer behind gears
    svg.insertBefore(draft, svg.firstChild.nextSibling);
    var label = el('g', { class: 'hero-annot', fill: 'rgba(220,226,234,.55)', 'font-family': 'Barlow Condensed, sans-serif', 'font-size': 18, 'letter-spacing': '2' }, svg);
    el('text', { x: f(A.x - 70), y: f(A.y + A.rp + 70) }, label).textContent = 'Z36 · M14 · DIN 6';
    el('text', { x: f(B.x + 40), y: f(B.y - B.rp - 30) }, label).textContent = 'Z16 · 20° PA';

    var angle = 0;
    return {
      train: train,
      setAngle: function (a) {
        angle = a;
        for (var i = 0; i < train.length; i++) train[i].setRotation(train[i].phase + a * train[i].ratio);
      },
      getAngle: function () { return angle; }
    };
  }

  global.GearArt = { render: render, renderAll: renderAll, buildHero: buildHero };
})(window);
