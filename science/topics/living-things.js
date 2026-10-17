"use strict";
/* P3 Science — Diversity of Living and Non-Living Things (lane: living-things).
   Data only. The small helpers below build HTML/SVG strings for figures; no DOM code. */
(function () {

  // ---------- figure helpers (string builders only) ----------
  var TB = 'border-collapse:collapse;margin:6px auto;font-size:14px;';
  var TD = 'border:1px solid #999;padding:5px 8px;text-align:center;';
  function table(head, rows) {
    var h = '<table style="' + TB + '"><tr>' + head.map(function (c) {
      return '<th style="' + TD + 'font-weight:bold">' + c + '</th>';
    }).join('') + '</tr>';
    rows.forEach(function (r) {
      h += '<tr>' + r.map(function (c) { return '<td style="' + TD + '">' + c + '</td>'; }).join('') + '</tr>';
    });
    return h + '</table>';
  }
  function box(t) {
    return '<div style="display:inline-block;border:2px solid #888;border-radius:8px;padding:4px 8px;margin:2px;font-size:13px;line-height:1.3">' + t + '</div>';
  }
  // n = leaf string, or { q, yes, no }
  function tree(n) {
    if (typeof n === 'string') return box(n);
    var c = 'text-align:center;vertical-align:top;padding:2px;border:none;width:50%;';
    return '<table style="border-collapse:collapse;margin:0 auto;width:100%"><tr><td colspan="2" style="' + c + 'width:100%">' + box('<b>' + n.q + '</b>') + '</td></tr>' +
      '<tr><td style="' + c + 'font-size:12px">Yes &darr;</td><td style="' + c + 'font-size:12px">No &darr;</td></tr>' +
      '<tr><td style="' + c + '">' + tree(n.yes) + '</td><td style="' + c + '">' + tree(n.no) + '</td></tr></table>';
  }
  // Classification chart rendered as a borderless HTML table (validator: figure must be <svg> or <table>).
  function chart(root, n) {
    return '<table style="border-collapse:collapse;margin:6px auto;max-width:380px;width:100%"><tr><td style="text-align:center;border:none;padding:2px">' +
      box('<b>' + root + '</b>') + '<div style="font-size:12px">&darr;</div>' + tree(n) + '</td></tr></table>';
  }
  var SVG0 = '<svg viewBox="0 0 320 180" width="100%" style="max-width:340px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">' +
    '<rect x="0" y="0" width="320" height="180" rx="8" fill="#fff"/>';

  // Spider: 2 body parts, 8 legs (4 pairs) all from the front body part, no feelers, no wings.
  var SPIDER = SVG0 +
    '<g stroke="#333" stroke-width="3" fill="none" stroke-linecap="round">' +
    // upper legs
    '<polyline points="118,78 100,45 82,38"/><polyline points="126,74 116,35 104,22"/>' +
    '<polyline points="136,74 146,35 158,22"/><polyline points="144,78 164,45 182,38"/>' +
    // lower legs
    '<polyline points="118,102 100,135 82,142"/><polyline points="126,106 116,145 104,158"/>' +
    '<polyline points="136,106 146,145 158,158"/><polyline points="144,102 164,135 182,142"/>' +
    '</g>' +
    '<ellipse cx="131" cy="90" rx="26" ry="20" fill="#8d6e63" stroke="#333" stroke-width="2"/>' +
    '<ellipse cx="196" cy="90" rx="40" ry="30" fill="#a1887f" stroke="#333" stroke-width="2"/>' +
    '<text x="308" y="24" text-anchor="end" fill="#222">Animal Y</text></svg>';

  // Insect, top view: head, thorax, abdomen; 3 pairs of legs on the thorax; 1 pair of feelers.
  function insect(withWings, labels) {
    var s = SVG0 + '<g stroke="#333" stroke-width="3" fill="none" stroke-linecap="round">' +
      '<path d="M56 84 Q44 66 26 64" stroke-width="1.5"/><path d="M56 96 Q44 114 26 116" stroke-width="1.5"/>' + // feelers: thin, curved, pointing forward so they are not counted as legs
      '<polyline points="98,76 90,50 76,40"/><polyline points="108,75 108,45 100,30"/><polyline points="118,76 128,50 140,40"/>' +
      '<polyline points="98,104 90,130 76,140"/><polyline points="108,105 108,135 100,150"/><polyline points="118,104 128,130 140,140"/>' +
      '</g>';
    if (withWings) {
      s += '<ellipse cx="150" cy="62" rx="45" ry="16" fill="#bbdefb" fill-opacity="0.7" stroke="#333" transform="rotate(-12 150 62)"/>' +
           '<ellipse cx="150" cy="118" rx="45" ry="16" fill="#bbdefb" fill-opacity="0.7" stroke="#333" transform="rotate(12 150 118)"/>';
    }
    s += '<circle cx="66" cy="90" r="13" fill="#6d4c41" stroke="#333" stroke-width="2"/>' +
         '<ellipse cx="108" cy="90" rx="26" ry="16" fill="#8d6e63" stroke="#333" stroke-width="2"/>' +
         '<ellipse cx="185" cy="90" rx="48" ry="20" fill="#a1887f" stroke="#333" stroke-width="2"/>';
    if (labels) {
      // B's leader runs between the middle and back legs (x=113), not on top of the middle leg,
      // and ends in a dot on the thorax (By-Eye F9)
      s += '<g fill="#222" font-weight="bold"><text x="60" y="172">A</text><text x="108" y="172">B</text><text x="180" y="172">C</text></g>' +
           '<g stroke="#555" stroke-width="1"><line x1="66" y1="158" x2="66" y2="97"/><line x1="113" y1="158" x2="113" y2="97"/><line x1="185" y1="158" x2="185" y2="101"/></g>' +
           '<g fill="#222"><circle cx="66" cy="96" r="2.5"/><circle cx="113" cy="96" r="2.5"/><circle cx="185" cy="100" r="2.5"/></g>';
    }
    if (!labels) s += '<text x="308" y="24" text-anchor="end" fill="#222">Animal Z</text>';
    return s + '</svg>';
  }

  // Fern frond plus a close-up of the underside of one leaflet with dots X.
  var FERN = SVG0 +
    '<line x1="80" y1="165" x2="80" y2="20" stroke="#2e7d32" stroke-width="3"/>' +
    (function () {
      var g = '';
      for (var i = 0; i < 6; i++) {
        var y = 40 + i * 21, w = 18 + i * 5;
        g += '<ellipse cx="' + (80 - w / 2 - 2) + '" cy="' + y + '" rx="' + (w / 2) + '" ry="6" fill="#66bb6a"/>' +
             '<ellipse cx="' + (80 + w / 2 + 2) + '" cy="' + y + '" rx="' + (w / 2) + '" ry="6" fill="#66bb6a"/>';
      }
      return g;
    })() +
    '<text x="40" y="178" fill="#222" font-size="12">fern leaf</text>' +
    '<ellipse cx="225" cy="85" rx="70" ry="28" fill="#81c784" stroke="#2e7d32" stroke-width="2"/>' +
    '<g fill="#6d4c41"><circle cx="185" cy="78" r="5"/><circle cx="185" cy="94" r="5"/><circle cx="210" cy="76" r="5"/><circle cx="210" cy="94" r="5"/>' +
    '<circle cx="235" cy="76" r="5"/><circle cx="235" cy="94" r="5"/><circle cx="260" cy="78" r="5"/><circle cx="260" cy="93" r="5"/></g>' +
    '<text x="160" y="40" fill="#222" font-size="12">Underside of a leaf</text>' +
    '<text x="268" y="140" fill="#222" font-weight="bold">X</text><line x1="270" y1="128" x2="261" y2="99" stroke="#555"/>' +
    '<line x1="115" y1="60" x2="155" y2="75" stroke="#555" stroke-dasharray="4 3"/></svg>';

  // Potted plant inside a box with one opening facing the light (set-up only; the stem is straight).
  var PLANT_BOX = '<svg viewBox="0 0 360 210" width="100%" style="max-width:360px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">' +
    '<rect x="0" y="0" width="360" height="210" rx="8" fill="#fff"/>' +
    '<rect x="30" y="30" width="200" height="160" fill="#efe3c8" stroke="#6d4c41" stroke-width="4"/>' +
    '<rect x="224" y="58" width="12" height="40" fill="#fff"/>' +
    '<g stroke="#f9a825" stroke-width="2"><line x1="296" y1="66" x2="248" y2="66"/><line x1="296" y1="78" x2="248" y2="78"/><line x1="296" y1="90" x2="248" y2="90"/></g>' +
    '<g fill="#f9a825"><polygon points="242,66 250,62 250,70"/><polygon points="242,78 250,74 250,82"/><polygon points="242,90 250,86 250,94"/></g>' +
    '<circle cx="320" cy="78" r="18" fill="#ffd54f" stroke="#f9a825" stroke-width="2"/>' +
    '<text x="320" y="122" text-anchor="middle" fill="#222">light</text>' +
    '<text x="236" y="48" fill="#222">opening</text>' +
    '<text x="42" y="54" fill="#222">box</text>' +
    '<path d="M130 148 L130 82" stroke="#2e7d32" stroke-width="4" fill="none"/>' +
    '<ellipse cx="116" cy="112" rx="14" ry="6" fill="#66bb6a" transform="rotate(-25 116 112)"/>' +
    '<ellipse cx="144" cy="98" rx="14" ry="6" fill="#66bb6a" transform="rotate(25 144 98)"/>' +
    '<ellipse cx="130" cy="78" rx="6" ry="10" fill="#66bb6a"/>' +
    '<rect x="103" y="146" width="54" height="7" fill="#5d4037"/>' +
    '<polygon points="105,152 155,152 148,186 112,186" fill="#bf6f4a" stroke="#6d4c41" stroke-width="2"/></svg>';

  // Bar graph: number of tiny living things X counted each day (food used up by end of Day 3).
  var GRAPH_X = (function () {
    var v = [3, 6, 12, 24, 24, 14, 6], base = 190, k = 6.25;
    var s = '<svg viewBox="0 0 360 240" width="100%" style="max-width:360px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">' +
      '<rect x="0" y="0" width="360" height="240" rx="8" fill="#fff"/>' +
      '<text x="8" y="22" fill="#222">Number of X</text>';
    [0, 6, 12, 18, 24].forEach(function (t) {
      var y = base - t * k;
      s += '<line x1="50" y1="' + y + '" x2="345" y2="' + y + '" stroke="#ddd"/>' +
           '<text x="44" y="' + (y + 5) + '" text-anchor="end" fill="#222" font-size="13">' + t + '</text>';
    });
    v.forEach(function (n, d) {
      var x = 75 + d * 40, h = n * k;
      s += '<rect x="' + (x - 13) + '" y="' + (base - h) + '" width="26" height="' + h + '" fill="#7986cb" stroke="#3949ab"/>' +
           '<text x="' + x + '" y="208" text-anchor="middle" fill="#222" font-size="13">' + d + '</text>';
    });
    return s + '<line x1="50" y1="' + base + '" x2="345" y2="' + base + '" stroke="#333" stroke-width="2"/>' +
      '<line x1="50" y1="34" x2="50" y2="' + base + '" stroke="#333" stroke-width="2"/>' +
      '<text x="198" y="232" text-anchor="middle" fill="#222">Day</text></svg>';
  })();

  // ---------- shared figures ----------
  var TABLE_ANIMALS_ABCD = table(
    ['Animal', 'Body covering', 'How it reproduces', 'Breathes through'],
    [['A', 'feathers', 'lays eggs with hard shells', 'lungs'],
     ['B', 'dry scaly skin', 'lays eggs', 'lungs'],
     ['C', 'moist skin', 'lays eggs in water', 'gills when young, lungs and skin as adult'],
     ['D', 'scales', 'lays eggs', 'gills']]);

  var TABLE_WXYZ = table(
    ['Living thing', 'Can make its own food', 'Reproduces by spores', 'Has flowers'],
    [['W', '&#10003;', '&#10003;', '&#10007;'],
     ['X', '&#10007;', '&#10003;', '&#10007;'],
     ['Y', '&#10003;', '&#10007;', '&#10003;'],
     ['Z', '&#10007;', '&#10007;', '&#10007;']]);

  var TABLE_PQRS = table(
    ['Animal', 'Body covering', 'Breathes through', 'How it reproduces'],
    [['P', 'fur', 'lungs', 'gives birth to young alive; feeds young on milk'],
     ['Q', 'scales', 'gills', 'lays eggs in water'],
     ['R', 'feathers', 'lungs', 'lays eggs with hard shells'],
     ['S', 'dry scaly skin', 'lungs', 'lays eggs on land']]);

  var TABLE_MOULD = '<div style="text-align:center;font-size:13px">Three slices of the same type and size of bread, left for 5 days</div>' + table(
    ['Slice', 'Sprinkled with water?', 'Kept at', 'Mould seen after 5 days'],
    [['A', 'no (dry)', 'room temperature (warm)', 'very little'],
     ['B', 'yes (damp)', 'room temperature (warm)', 'a lot'],
     ['C', 'yes (damp)', 'in the fridge (cold)', 'very little']]);

  /* ---------- x17 figure helpers (lane sci-x-living, 2026-10-17) ----------
     Every x17 figure is an SVG 360 units wide with labels of 13 units or more, so text
     stays at about 12 px or more on a 390 px phone. xFlow draws a classification
     flowchart with real connector lines, arrowheads and Yes/No tags on the branches
     (By-Eye F30: the older chart() has floating labels and no lines). */
  var XK = '#2B2540';
  function xr(v) { return Math.round(v * 10) / 10; }
  function xe(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function xWrap(s, n) {
    var out = [];
    String(s).split('\n').forEach(function (p) {
      var line = '';
      p.split(' ').forEach(function (w) {
        if (!line) line = w;
        else if ((line + ' ' + w).length <= n) line += ' ' + w;
        else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out;
  }
  function xSvg(w, h, label, maxw) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '"' + (maxw ? ' data-maxw="' + maxw + '"' : '') +
      ' role="img" aria-label="' + xe(label) + '" font-family="sans-serif" font-size="14" fill="' + XK + '">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="8" fill="#fff"/>';
  }

  /* xFlow(root, opt). Node shapes:
       { q: 'Question?', yes: node, no: node, blank: true? }   a yes/no question (Yes always on the left)
       { box: 'Title', kids: [node, ...] }                     a plain heading box (no Yes/No tags)
       'A'  or  { t: 'Group K', items: ['cat', 'dog'] }         an end box
     Columns are shared out by the number of end boxes under each node. */
  function xFlow(root, opt) {
    opt = opt || {};
    var W = 360, LH = 17, GAP = 46, TOP = 8, CHB = 7.8, CHN = 7.2, all = [], rowH = [];
    function kidsOf(n) { return (n && typeof n === 'object') ? (n.q != null ? [n.yes, n.no] : (n.kids || [])) : []; }
    function count(n) { var k = kidsOf(n); return k.length ? k.reduce(function (a, c) { return a + count(c); }, 0) : 1; }
    function lay(n, x0, x1, d) {
      if (typeof n === 'string') n = { t: n };
      var k = kidsOf(n), span = x1 - x0;
      var o = { d: d, cx: (x0 + x1) / 2, kids: [], q: n.q != null, leaf: !k.length, blank: !!n.blank };
      var maxW = Math.min(span - 8, k.length ? (opt.qMax || 236) : (opt.leafMax || 160));
      if (o.leaf && n.t && n.t.length <= 2 && !n.items) { o.lines = [{ s: n.t, b: 1, big: 1 }]; o.w = Math.min(maxW, 46); o.h = 36; }
      else {
        var head = n.q != null ? n.q : (n.box != null ? n.box : n.t), lines = [], longest = 0;
        if (head) xWrap(head, Math.floor((maxW - 14) / CHB)).forEach(function (s) { lines.push({ s: s, b: 1 }); });
        (n.items || []).forEach(function (it) { xWrap(it, Math.floor((maxW - 14) / CHN)).forEach(function (s) { lines.push({ s: s, b: 0 }); }); });
        lines.forEach(function (l) { longest = Math.max(longest, l.s.length * (l.b ? CHB : CHN)); });
        o.lines = lines; o.w = Math.max(o.blank ? 64 : 56, Math.min(maxW, longest + 18)); o.h = lines.length * LH + 11;
      }
      rowH[d] = Math.max(rowH[d] || 0, o.h);
      all.push(o);
      var x = x0, tot = count(n);
      k.forEach(function (c) { var w = span * count(c) / tot; o.kids.push(lay(c, x, x + w, d + 1)); x += w; });
      return o;
    }
    lay(root, 0, W, 0);
    var ys = [TOP], d;
    for (d = 1; d < rowH.length; d++) ys[d] = ys[d - 1] + rowH[d - 1] + GAP;
    var H = ys[rowH.length - 1] + rowH[rowH.length - 1] + TOP;
    var wires = '', tags = '', boxes = '';
    all.forEach(function (o) {
      var y = ys[o.d];
      if (o.kids.length) {
        var m = y + o.h + 13, yk = ys[o.d + 1];   /* the bar sits just under this box, not under the row's tallest box */
        var xs = o.kids.map(function (c) { return c.cx; }).concat([o.cx]);
        wires += '<path d="M' + xr(o.cx) + ' ' + xr(y + o.h) + 'V' + xr(m) +
          (o.kids.length > 1 ? 'M' + xr(Math.min.apply(null, xs)) + ' ' + xr(m) + 'H' + xr(Math.max.apply(null, xs)) : '') + '"/>';
        o.kids.forEach(function (c, i) {
          wires += '<path d="M' + xr(c.cx) + ' ' + xr(m) + 'V' + xr(yk - 7) + '"/>';
          tags += '<polygon points="' + xr(c.cx - 5) + ',' + xr(yk - 8) + ' ' + xr(c.cx + 5) + ',' + xr(yk - 8) + ' ' + xr(c.cx) + ',' + xr(yk - 1) + '" fill="#555"/>';
          if (o.q) {
            var ty = m + 15;
            tags += '<rect x="' + xr(c.cx - 17) + '" y="' + xr(ty - 9) + '" width="34" height="18" rx="4" fill="#fff" stroke="#555" stroke-width="1"/>' +
              '<text x="' + xr(c.cx) + '" y="' + xr(ty + 5) + '" text-anchor="middle" font-size="13" font-weight="700">' + (i === 0 ? 'Yes' : 'No') + '</text>';
          }
        });
      }
      var fill = o.blank ? '#FFF8E1' : o.q ? '#F3EEFF' : o.leaf ? '#FFFFFF' : '#E8F5E9';
      var stroke = o.blank ? '#C99A00' : o.q ? '#6B5FA5' : '#7A7590';
      boxes += '<rect x="' + xr(o.cx - o.w / 2) + '" y="' + xr(y) + '" width="' + xr(o.w) + '" height="' + o.h + '" rx="7" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"' + (o.blank ? ' stroke-dasharray="6 4"' : '') + '/>';
      o.lines.forEach(function (l, i) {
        if (l.big) boxes += '<text x="' + xr(o.cx) + '" y="' + xr(y + 25) + '" text-anchor="middle" font-size="20" font-weight="700">' + xe(l.s) + '</text>';
        else boxes += '<text x="' + xr(o.cx) + '" y="' + xr(y + 18 + i * LH) + '" text-anchor="middle" font-size="13.5"' + (l.b ? ' font-weight="700"' : '') + '>' + xe(l.s) + '</text>';
      });
    });
    return xSvg(W, H, opt.label || 'Classification flowchart', opt.maxw || 470) +
      '<g fill="none" stroke="#555" stroke-width="2">' + wires + '</g>' + tags + boxes + '</svg>';
  }

  /* xBug(cx, cy, sp): top view of a small animal, head on the left.
     sp = { segs: [[rx, ry], ...] head first, legs: { segIndex: pairs }, legLen, feelers, wings: 0|2|4, wingSeg, fill } */
  function xBug(cx, cy, sp) {
    var segs = sp.segs, L = 0, pos = [], x, legs = '', wings = '', body = '', feel = '';
    segs.forEach(function (g) { L += 2 * g[0]; });
    x = cx - L / 2;
    segs.forEach(function (g) { pos.push(x + g[0]); x += 2 * g[0]; });
    Object.keys(sp.legs || {}).forEach(function (k) {
      var i = +k, p = sp.legs[k], g = segs[i], c = pos[i], len = sp.legLen || 26;
      for (var j = 0; j < p; j++) {
        var f = p === 1 ? 0 : (j / (p - 1)) * 2 - 1;            /* -1 = front leg, +1 = back leg */
        var ax = c + f * g[0] * 0.6, dx = f * (sp.fan || 14);
        [-1, 1].forEach(function (sg) {
          legs += '<polyline points="' + xr(ax) + ',' + xr(cy + sg * (g[1] - 2)) + ' ' + xr(ax + dx * 0.6) + ',' + xr(cy + sg * (g[1] + len * 0.6)) + ' ' +
            xr(ax + dx * 1.4) + ',' + xr(cy + sg * (g[1] + len)) + '"/>';
        });
      }
    });
    if (sp.wings) {
      var ws = sp.wingSeg == null ? 1 : sp.wingSeg, wg = segs[ws], wx = pos[ws];
      [-1, 1].forEach(function (sg) {
        function wing(dx, dy, rx, ry, rot) {
          var ex = xr(wx + dx), ey = xr(cy + sg * dy);
          return '<ellipse cx="' + ex + '" cy="' + ey + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + (sg * rot) + ' ' + ex + ' ' + ey + ')"/>';
        }
        /* 4 wings: the front pair angles well out to the side and the back pair lies along the body,
           so all four outlines and tips can be counted */
        wings += sp.wings === 4 ? wing(18, wg[1] + 18, 30, 8, 45) + wing(34, wg[1] + 4, 30, 7, 8)
                                : wing(28, wg[1] + 11, 31, 10, 16);
      });
    }
    segs.forEach(function (g, i) { body += '<ellipse cx="' + xr(pos[i]) + '" cy="' + cy + '" rx="' + g[0] + '" ry="' + g[1] + '"/>'; });
    if (sp.feelers) {
      var hx = pos[0] - segs[0][0] + 2;
      feel = '<path d="M' + xr(hx) + ' ' + (cy - 3) + ' Q' + xr(hx - 14) + ' ' + (cy - 8) + ' ' + xr(hx - 22) + ' ' + (cy - 26) + '"/>' +
             '<path d="M' + xr(hx) + ' ' + (cy + 3) + ' Q' + xr(hx - 14) + ' ' + (cy + 8) + ' ' + xr(hx - 22) + ' ' + (cy + 26) + '"/>';
    }
    return '<g fill="none" stroke="#333" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + legs + '</g>' +
      (wings ? '<g fill="#bbdefb" fill-opacity="0.75" stroke="#3f51b5" stroke-width="1.5">' + wings + '</g>' : '') +
      '<g fill="' + (sp.fill || '#8d6e63') + '" stroke="#333" stroke-width="2">' + body + '</g>' +
      (feel ? '<g fill="none" stroke="#333" stroke-width="1.6" stroke-linecap="round">' + feel + '</g>' : '');
  }
  function xWorm(cx, cy) {
    var d = 'M' + (cx - 62) + ' ' + cy + ' C' + (cx - 40) + ' ' + (cy - 22) + ' ' + (cx - 14) + ' ' + (cy + 22) + ' ' + (cx + 8) + ' ' + cy +
      ' S' + (cx + 44) + ' ' + (cy - 18) + ' ' + (cx + 62) + ' ' + (cy - 2);
    return '<path d="' + d + '" fill="none" stroke="#b5655f" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#e3a29b" stroke-width="13" stroke-linecap="round" stroke-dasharray="2 7"/>';
  }
  var XB_INSECT = function (wings) { return { segs: [[8, 7], [12, 9], [24, 11]], legs: { 1: 3 }, feelers: true, wings: wings }; };
  var XB_ANT = { segs: [[8, 7], [9, 6], [17, 11]], legs: { 1: 3 }, feelers: true, fill: '#5d4037' };
  var XB_SPIDER = { segs: [[14, 12], [21, 16]], legs: { 0: 4 }, legLen: 32, fan: 18 };
  var XB_CENTI = (function () {
    var s = [[6, 5]], l = {};
    for (var i = 1; i <= 9; i++) { s.push([5.5, 5]); l[i] = 1; }
    return { segs: s, legs: l, legLen: 15, feelers: true, fill: '#a1662f' };
  })();
  /* panels: [{ L: 'P', sp: spec } or { L: 'R', worm: true }]; 4 panels = 2 x 2 grid, else one row */
  function xBugs(panels, label, maxw) {
    var n = panels.length, grid = n === 4, W = n === 1 ? 200 : 360, pw = grid ? 180 : W / n, ph = 140, H = grid ? 2 * ph : ph;
    var s = xSvg(W, H, label, maxw || (n === 1 ? 300 : 470));
    panels.forEach(function (p, i) {
      var x0 = grid ? (i % 2) * pw : i * pw, y0 = grid ? Math.floor(i / 2) * ph : 0, cx = x0 + pw / 2, cy = y0 + 78;
      s += '<rect x="' + (x0 + 4) + '" y="' + (y0 + 4) + '" width="' + (pw - 8) + '" height="' + (ph - 8) + '" rx="8" fill="#fbfaf7" stroke="#cfc9dc" stroke-width="1.5"/>' +
        '<text x="' + (x0 + 14) + '" y="' + (y0 + 26) + '" font-size="17" font-weight="700">' + p.L + '</text>' +
        (p.worm ? xWorm(cx + 6, cy) : xBug(cx + 8, cy, p.sp));
    });
    return s + '</svg>';
  }

  /* Bread slice centred on (cx, cy); k = scale; o = { brown, drops, mould: number of patches, fuzzy } */
  function xSlice(cx, cy, k, o) {
    o = o || {};
    function p(dx, dy) { return xr(cx + dx * k) + ' ' + xr(cy + dy * k); }
    var s = '<path d="M' + p(-22, 28) + ' L' + p(-22, -8) + ' C' + p(-31, -28) + ' ' + p(-7, -35) + ' ' + p(0, -26) +
      ' C' + p(7, -35) + ' ' + p(31, -28) + ' ' + p(22, -8) + ' L' + p(22, 28) + ' Z" fill="' + (o.brown ? '#c58f57' : '#f6dca8') + '" stroke="#a86a2c" stroke-width="2.5"/>';
    var spots = [[-11, -14], [9, -17], [-3, 2], [12, 8], [-13, 16], [4, 19], [14, -4], [-8, -24]];
    for (var i = 0; i < (o.mould || 0) && i < spots.length; i++) {
      var sx = spots[i][0], sy = spots[i][1];
      s += o.fuzzy
        ? '<g stroke="#5b7a4a" stroke-width="1"><circle cx="' + p(sx, sy).split(' ')[0] + '" cy="' + p(sx, sy).split(' ')[1] + '" r="' + xr(5.5 * k) + '" fill="#8fae6b"/>' +
          '<circle cx="' + p(sx + 4, sy - 3).split(' ')[0] + '" cy="' + p(sx + 4, sy - 3).split(' ')[1] + '" r="' + xr(3.8 * k) + '" fill="#e8eee0"/>' +
          '<circle cx="' + p(sx - 4, sy + 3).split(' ')[0] + '" cy="' + p(sx - 4, sy + 3).split(' ')[1] + '" r="' + xr(3.4 * k) + '" fill="#6f8f55"/></g>'
        : '<circle cx="' + p(sx, sy).split(' ')[0] + '" cy="' + p(sx, sy).split(' ')[1] + '" r="' + xr(3.6 * k) + '" fill="#5f7f45" stroke="#3e5a2c"/>';
    }
    if (o.drops) [[-12, -4], [6, -10], [-2, 12], [13, 16]].forEach(function (d) {
      var X = cx + d[0] * k, Y = cy + d[1] * k;
      s += '<path d="M' + xr(X) + ' ' + xr(Y - 6) + ' Q' + xr(X + 4.5) + ' ' + xr(Y) + ' ' + xr(X) + ' ' + xr(Y + 2.5) + ' Q' + xr(X - 4.5) + ' ' + xr(Y) + ' ' + xr(X) + ' ' + xr(Y - 6) + 'Z" fill="#42a5f5" stroke="#1565c0" stroke-width="0.8"/>';
    });
    return s;
  }
  /* Sealed bags of bread in a row. panels: [{ L, place: 'cupboard'|'fridge'|'counter', damp, brown, lines: [...] }] */
  function xBags(panels, label) {
    var n = panels.length, pw = 360 / n, nl = 0;
    panels.forEach(function (p) { nl = Math.max(nl, (p.lines || []).length); });
    var H = 186 + nl * 17 + 6;
    var s = xSvg(360, H, label, n <= 2 ? 360 : 470);
    var PL = { cupboard: ['#efe3c8', '#8d6e63', 'cupboard'], fridge: ['#dcecfb', '#42a5f5', 'fridge'], counter: ['#fafafa', '#bdbdbd', 'counter'] };
    panels.forEach(function (p, i) {
      var cx = pw * (i + 0.5), pl = PL[p.place] || PL.counter;
      s += '<rect x="' + xr(cx - pw / 2 + 5) + '" y="8" width="' + xr(pw - 10) + '" height="152" rx="6" fill="' + pl[0] + '" stroke="' + pl[1] + '" stroke-width="2"/>' +
        '<text x="' + xr(cx) + '" y="27" text-anchor="middle" font-size="13.5">' + pl[2] + '</text>' +
        '<rect x="' + xr(cx - 29) + '" y="38" width="58" height="112" rx="7" fill="#ffffff" fill-opacity="0.55" stroke="#78909c" stroke-width="2"/>' +
        '<line x1="' + xr(cx - 29) + '" y1="49" x2="' + xr(cx + 29) + '" y2="49" stroke="#607d8b" stroke-width="2.5"/>' +
        xSlice(cx, 103, 0.95, { brown: p.brown, drops: p.damp, mould: p.mould || 0 }) +
        '<text x="' + xr(cx) + '" y="182" text-anchor="middle" font-size="17" font-weight="700">' + p.L + '</text>';
      (p.lines || []).forEach(function (t, j) {
        s += '<text x="' + xr(cx) + '" y="' + (199 + j * 17) + '" text-anchor="middle" font-size="13.5">' + xe(t) + '</text>';
      });
    });
    return s + '</svg>';
  }

  /* Bar chart and line graph. o = { yTitle, labels: ['a', 'b\nc'], values, max, step, xTitle } */
  function xAxes(o, n) {
    var X0 = 54, X1 = 346, Y0 = 196, Y1 = 46, s = '';
    for (var v = 0; v <= o.max; v += o.step) {
      var y = Y0 - v / o.max * (Y0 - Y1);
      s += '<line x1="' + X0 + '" y1="' + xr(y) + '" x2="' + X1 + '" y2="' + xr(y) + '" stroke="#e0dde8"/>' +
        '<text x="' + (X0 - 7) + '" y="' + xr(y + 5) + '" text-anchor="end" font-size="13">' + v + '</text>';
    }
    s += '<text x="10" y="24" font-size="14" font-weight="700">' + xe(o.yTitle) + '</text>';
    var slot = (X1 - X0) / n, nl = 1;
    o.labels.forEach(function (lb, i) {
      var parts = String(lb).split('\n'); nl = Math.max(nl, parts.length);
      parts.forEach(function (t, j) { s += '<text x="' + xr(X0 + slot * (i + 0.5)) + '" y="' + (215 + j * 16) + '" text-anchor="middle" font-size="13">' + xe(t) + '</text>'; });
    });
    var H = 215 + (nl - 1) * 16 + (o.xTitle ? 26 : 10);
    if (o.xTitle) s += '<text x="' + ((X0 + X1) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="14" font-weight="700">' + xe(o.xTitle) + '</text>';
    s += '<line x1="' + X0 + '" y1="' + Y0 + '" x2="' + X1 + '" y2="' + Y0 + '" stroke="#333" stroke-width="2"/>' +
      '<line x1="' + X0 + '" y1="' + (Y1 - 8) + '" x2="' + X0 + '" y2="' + Y0 + '" stroke="#333" stroke-width="2"/>';
    return { s: s, H: H, X0: X0, Y0: Y0, Y1: Y1, slot: slot };
  }
  function xBars(o) {
    var n = o.values.length, a = xAxes(o, n), bars = '';
    o.values.forEach(function (v, i) {
      var h = v / o.max * (a.Y0 - a.Y1), bw = Math.min(54, a.slot * 0.5), x = a.X0 + a.slot * (i + 0.5);
      bars += '<rect x="' + xr(x - bw / 2) + '" y="' + xr(a.Y0 - h) + '" width="' + xr(bw) + '" height="' + xr(h) + '" fill="#7986cb" stroke="#3949ab" stroke-width="1.5"/>';
    });
    return xSvg(360, a.H, o.label || 'Bar graph', o.maxw || 470) + a.s + bars + '</svg>';
  }
  function xLine(o) {
    var n = o.values.length, a = xAxes(o, n), pts = [], dots = '';
    o.values.forEach(function (v, i) {
      var x = a.X0 + a.slot * (i + 0.5), y = a.Y0 - v / o.max * (a.Y0 - a.Y1);
      pts.push(xr(x) + ',' + xr(y));
      dots += '<circle cx="' + xr(x) + '" cy="' + xr(y) + '" r="4.5" fill="#3949ab"/>';
    });
    return xSvg(360, a.H, o.label || 'Line graph', o.maxw || 470) + a.s +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#3949ab" stroke-width="2.5"/>' + dots + '</svg>';
  }

  // ---------- x17 shared figures ----------
  var XF_ZOO = xFlow({ box: 'Animals', kids: [{ q: 'Does it have feathers?', yes: 'A',
    no: { q: 'Does it have six legs?', yes: 'B', no: { q: 'Does it feed its young on milk?', yes: 'C', no: 'D' } } }] },
    { label: 'Flowchart: feathers? six legs? feeds young on milk? ending in boxes A to D' });
  var XF_LIFE = xFlow({ box: 'Living things', kids: [{ q: 'Can it make its own food?',
    yes: { q: 'Does it have flowers?', yes: 'P', no: 'Q' },
    no: { q: 'Does it reproduce by spores?', yes: 'R', no: 'S' } }] },
    { label: 'Flowchart: makes own food? flowers? spores? ending in boxes P, Q, R and S' });
  var XF_GARDEN = xFlow({ box: 'Animals', kids: [{ q: 'Does it have hair or fur?', yes: 'W',
    no: { q: 'Does it have feathers?', yes: 'X', no: { q: 'Does it have six legs?', yes: 'Y', no: 'Z' } } }] },
    { label: 'Flowchart: hair or fur? feathers? six legs? ending in boxes W, X, Y and Z' });
  var XF_BAGS_PLAN = xBags([
    { L: 'A', place: 'cupboard', damp: true, lines: ['damp', 'white bread'] },
    { L: 'B', place: 'fridge', lines: ['dry', 'white bread'] },
    { L: 'C', place: 'fridge', damp: true, lines: ['damp', 'white bread'] },
    { L: 'D', place: 'cupboard', brown: true, lines: ['dry', 'wholemeal'] }],
    'Four sealed bags of bread: A damp white bread in a cupboard, B dry white bread in a fridge, C damp white bread in a fridge, D dry wholemeal bread in a cupboard');

  SCI.registerTopic({
    id: 'living-things',
    title: 'Living Things',
    emoji: '🐞',
    theme: 'Diversity',
    moeRef: 'Diversity of Living and Non-Living Things (P3): Describe the characteristics of living things (need water, food and air to survive; grow, respond and reproduce). Recognise some broad groups of living things based on similarities and differences: plants (flowering, non-flowering), animals (amphibians, birds, fish, insects, mammals, reptiles), fungi (mould, mushroom, yeast), bacteria. Classify living things into broad groups based on common observable characteristics.',

    notes: [
      { title: 'Living or non-living?',
        body: 'ALL living things: need food, water and air to survive; grow; respond to changes around them; reproduce (make young ones of their own kind). A non-living thing may seem to do some of these (a car needs fuel and air to run), but it cannot grow and reproduce. Moving from place to place is NOT on the list, because plants are living but stay in one place.' },
      { title: 'Plants',
        body: 'Plants can make their own food. Flowering plants (hibiscus, rose, sunflower, mango tree, rice) have flowers and reproduce by seeds. Non-flowering plants have no flowers: ferns and mosses reproduce by spores (fern spores are found on the underside of the leaves). A fern or moss growing on a tree trunk or a wall still makes its own food; it does not take food from the tree or the wall.' },
      { title: 'Mammals and birds',
        body: 'Mammals: hair or fur, breathe through lungs, most give birth to young alive, feed their young on milk. A whale, dolphin and bat are MAMMALS (not fish, not birds). Birds: feathers, a beak, two wings and two legs, lay eggs with hard shells, breathe through lungs. A penguin and an ostrich cannot fly but are still BIRDS because they have feathers.' },
      { title: 'Fish, amphibians, reptiles',
        body: 'Fish: live in water, most have scales and fins, breathe through gills, most lay eggs. Amphibians (frog, toad): moist skin, lay eggs in water; the young (tadpoles) breathe through gills, adults breathe through lungs and moist skin. Reptiles (crocodile, snake, lizard, turtle): dry scaly skin, breathe through lungs, most lay eggs on land.' },
      { title: 'Insects (and the spider trap)',
        body: 'Insects have 3 body parts (head, thorax, abdomen), 6 legs (3 pairs) joined to the thorax, and 1 pair of feelers. Many have wings, but not all. Examples: ant, butterfly, beetle, grasshopper, mosquito. A SPIDER is NOT an insect: it has 8 legs and only 2 body parts.' },
      { title: 'Fungi',
        body: 'Mushrooms, moulds and yeast are FUNGI. Fungi are NOT plants: they cannot make their own food and they have no leaves, flowers or roots. They take in food from dead or decaying matter (and from food like bread). Mushrooms and moulds reproduce by spores. A mushroom and a fern both use spores, but they are in different groups: the fern makes its own food, the mushroom cannot. Yeast is used to make bread: it feeds on sugar.' },
      { title: 'Mould experiments',
        body: 'Mould needs water (moisture), warmth, air and food to grow. Toasted or dried food has very little water, so little or no mould grows. A fridge is cold, so mould grows more SLOWLY there, but it can still grow. Light is not needed: mould grows well in a dark cupboard. Fair test: change only ONE thing (e.g. damp or dry bread), keep everything else the same (type and size of bread, place, number of days), and measure the amount of mould (e.g. the number of mould spots).' },
      { title: 'Bacteria',
        body: 'Bacteria are living things. They are so tiny that we can only see them with a microscope. Some bacteria are useful (used to make yoghurt and cheese; break down dead plants and animals). Some are harmful (cause diseases such as food poisoning, spoil food, cause tooth decay). Being invisible does NOT make them non-living.' },
      { title: 'Reading a classification chart',
        body: 'Each question splits the group into YES and NO. The characteristic must be TRUE for every living thing on the YES side and FALSE for every one on the NO side. To find a missing label, test each option against EVERY living thing on both sides. Watch out: "Can it fly?" fails for penguins and bats; "Does it lay eggs?" fails because many groups lay eggs.' },
      { title: 'Exam traps to remember',
        body: 'Whale, dolphin, bat = mammals. Penguin, ostrich = birds. Spider = not an insect. Mushroom, mould, yeast = fungi, not plants. Ferns and mosses have no flowers and use spores. Bacteria are living. Moss (a plant) is not mould (a fungus).' }
    ],

    items: [
      // ---------------- Living vs non-living ----------------
      { id: 'liv-001', type: 'mcq', level: 2,
        stem: 'Ravi observed four things, P, Q, R and S, for some weeks. He recorded what he found in the table. Which one is most likely to be a living thing?',
        figure: table(['Thing', 'Needs air', 'Grows bigger', 'Makes young of its own kind'],
          [['P', '&#10003;', '&#10003;', '&#10007;'],
           ['Q', '&#10007;', '&#10003;', '&#10007;'],
           ['R', '&#10003;', '&#10003;', '&#10003;'],
           ['S', '&#10003;', '&#10007;', '&#10007;']]),
        options: ['P', 'Q', 'R', 'S'],
        answer: 2,
        explain: 'Only R grows AND makes young ones of its own kind. P needs air and gets bigger, like a fire, and Q gets bigger, like a crystal, but neither can reproduce. A living thing must be able to reproduce.' },
      { id: 'liv-002', type: 'mcq', level: 1,
        stem: 'Which of these is NOT a characteristic of ALL living things?',
        figure: null,
        options: ['They need water.', 'They grow.', 'They move from place to place.', 'They reproduce.'],
        answer: 2,
        explain: 'Plants are living things but they do not move from place to place. All living things need water, grow and reproduce.' },
      { id: 'liv-003', type: 'mcq', level: 2,
        stem: 'A car can move, needs fuel and gives out smoke. Why is a car still a non-living thing?',
        figure: null,
        options: ['It is made of metal.', 'It cannot grow or reproduce.', 'It does not need air.', 'It cannot move by itself.'],
        answer: 1,
        explain: 'Living things grow and reproduce. A car cannot grow or make young cars, so it is non-living. What it is made of does not decide if it is living.' },
      { id: 'liv-004', type: 'mcq', level: 2,
        stem: 'When Sara touched the leaves of a mimosa (touch-me-not) plant, the leaves folded up. Which characteristic of living things does this show?',
        figure: null,
        options: ['Living things need air.', 'Living things grow.', 'Living things reproduce.', 'Living things respond to changes.'],
        answer: 3,
        explain: 'The touch is a change around the plant, and folding its leaves is the plant responding to it.' },
      { id: 'liv-005', type: 'mcq', level: 2,
        stem: 'Mei kept some guppies in a fish tank. Which observation shows that guppies can reproduce?',
        figure: null,
        options: ['They swam quickly towards the food she dropped in.', 'They grew from 1 cm to 3 cm long in two months.', 'Many tiny guppies appeared in the tank after a few weeks.', 'They needed clean water in the tank to stay alive.'],
        answer: 2,
        explain: 'Making young ones of their own kind (the tiny guppies) is reproduction. Swimming towards food is responding to a change, getting longer is growing, and needing clean water is a need for survival.' },
      { id: 'liv-006', type: 'mcq', level: 2,
        stem: 'Aisha measured the height of a bean seedling every three days. Her results are shown in the table. Which characteristic of living things do her results show?',
        figure: table(['Day', 'Height of seedling (cm)'], [['0', '3'], ['3', '5'], ['6', '8'], ['9', '12']]),
        options: ['Living things need air.', 'Living things reproduce.', 'Living things respond to changes.', 'Living things grow.'],
        answer: 3,
        explain: 'The seedling became taller every time it was measured (3 cm to 12 cm), so the results show that it grows. The table says nothing about air, young ones or changes around it.' },

      // ---------------- Plants ----------------
      { id: 'liv-007', type: 'mcq', level: 2,
        stem: 'Some moss is growing on a damp brick wall, where there is no soil. Ken said, "The moss gets its food from the bricks." Which statement is correct?',
        figure: null,
        options: ['Ken is wrong: moss is a plant, so it makes its own food.', 'Ken is right: moss takes in food from the bricks.', 'Ken is wrong: moss is a fungus, so it feeds on dead things.', 'Ken is wrong: moss is a plant, so it does not need food.'],
        answer: 0,
        explain: 'Moss is a non-flowering plant, and all plants make their own food. The wall only gives it a damp place to grow. Moss is not a fungus, and every living thing needs food.' },
      { id: 'liv-008', type: 'mcq', level: 2,
        stem: 'Plant K has green leaves but never has flowers. New K plants grow from tiny brown dust-like things that fall from the underside of its leaves. Which statement about plant K is correct?',
        figure: null,
        options: ['It is a fungus because it has no flowers.', 'It reproduces by spores.', 'It cannot make its own food.', 'It reproduces by seeds found in its fruits.'],
        answer: 1,
        explain: 'K is a non-flowering plant, like a fern: the dust-like things are spores. It is a plant, so it makes its own food. Fruits and seeds come from flowers, which K does not have.' },
      { id: 'liv-009', type: 'mcq', level: 2,
        stem: 'Which statement about non-flowering plants is correct?',
        figure: null,
        options: ['They cannot make their own food.', 'They reproduce by seeds found in fruits.', 'Ferns and mosses reproduce by spores.', 'They have flowers that are too small to see.'],
        answer: 2,
        explain: 'Ferns and mosses reproduce by spores. Seeds inside fruits come from flowers, so they belong to flowering plants. All plants, flowering or not, make their own food.' },

      // ---------------- Animals ----------------
      { id: 'liv-010', type: 'mcq', level: 2,
        stem: 'Animal T lives in the sea and swims with flippers. It comes up to the surface to breathe air through its lungs. It has dry scaly skin and lays its eggs in the sand on a beach. Which group does T belong to?',
        figure: null,
        options: ['Fish', 'Amphibians', 'Birds', 'Reptiles'],
        answer: 3,
        explain: 'Dry scaly skin, breathing through lungs and laying eggs on land make T a reptile (a sea turtle). Living in the sea does not make it a fish: fish breathe through gills. Amphibians have moist skin and lay eggs in water; birds have feathers.' },
      { id: 'liv-011', type: 'mcq', level: 1,
        stem: 'How many legs does an insect have?',
        figure: null,
        options: ['4', '6', '8', '10'],
        answer: 1,
        explain: 'Insects have 6 legs (3 pairs). An animal with 8 legs, like a spider, is not an insect.' },
      { id: 'liv-012', type: 'mcq', level: 2,
        stem: 'A whale lives in the sea and has fins. It breathes through lungs, gives birth to its young alive and feeds its young on milk. Which group does the whale belong to?',
        figure: null,
        options: ['Fish', 'Amphibians', 'Reptiles', 'Mammals'],
        answer: 3,
        explain: 'Breathing through lungs and feeding its young on milk make the whale a mammal. Living in water and having fins do not make it a fish.' },
      { id: 'liv-013', type: 'mcq', level: 2,
        stem: 'A bat can fly. It has fur on its body, gives birth to its young alive and feeds its young on milk. Which group does the bat belong to?',
        figure: null,
        options: ['Mammals', 'Birds', 'Insects', 'Reptiles'],
        answer: 0,
        explain: 'Fur and feeding its young on milk make the bat a mammal. Being able to fly does not make it a bird; birds have feathers.' },
      { id: 'liv-014', type: 'mcq', level: 2,
        stem: 'A penguin cannot fly. It has feathers and a beak, and it lays eggs with hard shells. Which group does the penguin belong to?',
        figure: null,
        options: ['Birds', 'Fish', 'Mammals', 'Reptiles'],
        answer: 0,
        explain: 'A penguin has feathers, so it is a bird. Not all birds can fly.' },
      { id: 'liv-015', type: 'mcq', level: 2,
        stem: 'Study animal Y in the diagram. Which statement about animal Y is correct?',
        figure: SPIDER,
        options: ['It is an insect because it has legs.', 'It is not an insect because it has 8 legs and only 2 body parts.', 'It is an insect because it has 2 body parts.', 'It is not an insect because it has no wings.'],
        answer: 1,
        explain: 'Count the legs: 8, on a body with only 2 parts. Insects have 6 legs and 3 body parts, so animal Y (a spider) is not an insect. Having no wings is not the reason: some insects, like worker ants, have no wings.' },
      { id: 'liv-016', type: 'mcq', level: 2,
        stem: 'Which one of these animals is an insect?',
        figure: null,
        options: ['Beetle', 'Spider', 'Centipede', 'Earthworm'],
        answer: 0,
        explain: 'A beetle has 3 body parts, 6 legs and a pair of feelers, so it is an insect. A spider has 8 legs, a centipede has many legs and an earthworm has no legs.' },
      { id: 'liv-017', type: 'mcq', level: 2,
        stem: 'A pet shop keeps its frogs in a tank lined with damp moss. A worker sprays them with water every few hours so that their skin never dries out. Why is it important to keep a frog\'s skin moist?',
        figure: null,
        options: ['The frog also breathes through its moist skin.', 'The frog makes its own food through its skin.', 'The frog lays its eggs on its moist skin.', 'The frog\'s moist skin keeps its scales soft.'],
        answer: 0,
        explain: 'An adult frog (an amphibian) breathes through its lungs AND its moist skin. If its skin dries out, it cannot take in enough air. Frogs have no scales, and animals cannot make their own food.' },
      { id: 'liv-018', type: 'mcq', level: 1,
        stem: 'What kind of body covering do reptiles have?',
        figure: null,
        options: ['Dry scaly skin', 'Moist skin', 'Feathers', 'Fur'],
        answer: 0,
        explain: 'Reptiles such as snakes, lizards and crocodiles have dry scaly skin. Moist skin belongs to amphibians.' },
      { id: 'liv-019', type: 'mcq', level: 1,
        stem: 'Fish breathe through their ____.',
        figure: null,
        options: ['lungs', 'moist skin', 'fins', 'gills'],
        answer: 3,
        explain: 'Fish breathe through gills. Fins help them swim; they are not for breathing.' },
      { id: 'liv-020', type: 'mcq', level: 2,
        stem: 'A young frog (tadpole) lives in water and breathes through gills. How does an adult frog breathe?',
        figure: null,
        options: ['Through gills only', 'Through lungs only', 'Through lungs and its moist skin', 'Through gills and lungs'],
        answer: 2,
        explain: 'Adult amphibians breathe through lungs and through their moist skin. That is why a frog\'s skin must stay moist.' },
      { id: 'liv-021', type: 'mcq', level: 2,
        stem: 'Which animal is matched to the correct group?',
        figure: null,
        options: ['Dolphin : fish', 'Bat : bird', 'Turtle : reptile', 'Spider : insect'],
        answer: 2,
        explain: 'A turtle has dry scaly skin and is a reptile. A dolphin and a bat are mammals; a spider is not an insect.' },
      { id: 'liv-022', type: 'mcq', level: 2,
        stem: 'Which characteristic do ALL birds have?',
        figure: null,
        options: ['They can fly.', 'They build nests in trees.', 'They eat insects.', 'They have feathers.'],
        answer: 3,
        explain: 'Every bird has feathers. Penguins and ostriches cannot fly, and birds eat many different foods.' },
      { id: 'liv-023', type: 'mcq', level: 1,
        stem: 'Which animal gives birth to its young alive and feeds its young on milk?',
        figure: null,
        options: ['Cat', 'Chicken', 'Crocodile', 'Frog'],
        answer: 0,
        explain: 'A cat is a mammal. Chickens, crocodiles and frogs lay eggs.' },
      { id: 'liv-024', type: 'mcq', level: 2,
        stem: 'The table shows some information about animals A, B, C and D. Which animal is a reptile?',
        figure: TABLE_ANIMALS_ABCD,
        options: ['A', 'B', 'C', 'D'],
        answer: 1,
        explain: 'Dry scaly skin and breathing through lungs = reptile (B). A is a bird (feathers), C is an amphibian (moist skin, gills when young), D is a fish (scales and gills).' },
      { id: 'liv-025', type: 'mcq', level: 2,
        stem: 'The diagram shows an insect. To which body part are its legs joined?',
        figure: insect(false, true),
        options: ['A', 'B', 'C', 'A and C'],
        answer: 1,
        explain: 'An insect has three body parts: head (A), thorax (B) and abdomen (C). All 6 legs are joined to the thorax, the middle part.' },

      // ---------------- Fungi and bacteria ----------------
      { id: 'liv-026', type: 'mcq', level: 2,
        stem: 'A mushroom and a fern both reproduce by spores. Why is the mushroom placed in a different group from the fern?',
        figure: null,
        options: ['The mushroom grows in damp places.', 'The mushroom is smaller than a fern.', 'The mushroom does not need water.', 'The mushroom cannot make its own food.'],
        answer: 3,
        explain: 'The fern is a plant and makes its own food. The mushroom is a fungus: it cannot make its own food and feeds on dead or decaying matter. Ferns also grow in damp places, size does not decide the group, and every living thing needs water.' },
      { id: 'liv-027', type: 'mcq', level: 1,
        stem: 'Which one of these is NOT a fungus?',
        figure: null,
        options: ['Mushroom', 'Bread mould', 'Yeast', 'Moss'],
        answer: 3,
        explain: 'Moss is a non-flowering plant: it makes its own food. Do not mix up moss (a plant) with mould (a fungus).' },
      { id: 'liv-028', type: 'mcq', level: 3,
        stem: 'Which of the following statements about a mushroom are correct?\nA  It reproduces by spores.\nB  It makes its own food.\nC  It takes in food from dead or decaying matter.\nD  It is a plant without flowers.',
        figure: null,
        options: ['A and B only', 'A and C only', 'B and D only', 'A, C and D only'],
        answer: 1,
        explain: 'A is correct: mushrooms reproduce by spores. C is correct: a mushroom feeds on dead or decaying matter. B is wrong: a mushroom cannot make its own food. D is wrong: a mushroom is a fungus, not a plant.' },
      { id: 'liv-029', type: 'mcq', level: 3,
        stem: 'Which of the following statements about bacteria are correct?\nA  They can only be seen with a microscope.\nB  Some of them cause food to spoil.\nC  All of them are harmful, so we should get rid of all bacteria.\nD  Some of them break down dead plants and animals.',
        figure: null,
        options: ['A and B only', 'A and C only', 'B, C and D only', 'A, B and D only'],
        answer: 3,
        explain: 'A, B and D are correct. Bacteria are living things too tiny to see without a microscope; some spoil food, and some are useful because they break down dead plants and animals. C is wrong: not all bacteria are harmful (some are used to make yoghurt and cheese).' },
      { id: 'liv-030', type: 'mcq', level: 2,
        stem: 'Which one of these shows bacteria being USEFUL to people?',
        figure: null,
        options: ['Making yoghurt', 'Causing food poisoning', 'Making bread dough rise', 'Causing tooth decay'],
        answer: 0,
        explain: 'Bacteria are used to make yoghurt. Bread dough rises because of yeast, which is a fungus, not bacteria. Food poisoning and tooth decay are harmful.' },
      { id: 'liv-031', type: 'mcq', level: 1,
        stem: 'Yeast is used to make bread. Which group does yeast belong to?',
        figure: null,
        options: ['Fungi', 'Plants', 'Animals', 'Bacteria'],
        answer: 0,
        explain: 'Yeast is a fungus, like mushrooms and moulds.' },
      { id: 'liv-032', type: 'mcq', level: 2,
        stem: 'Mould grows fastest on bread that is kept in a place that is ____.',
        figure: null,
        options: ['cold and dry', 'cold and damp', 'warm and dry', 'warm and damp'],
        answer: 3,
        explain: 'Mould grows best in warm, damp places. Keeping bread cold (in the fridge) and dry slows down mould growth.' },
      { id: 'liv-033', type: 'mcq', level: 2,
        stem: 'Living thing X cannot make its own food. It grows on a rotting log, reproduces by spores and has no leaves. What is X most likely to be?',
        figure: null,
        options: ['A fern', 'A mushroom', 'A moss', 'A kind of bacteria'],
        answer: 1,
        explain: 'Ferns and mosses also reproduce by spores, but they are plants and make their own food. Something that cannot make its own food and reproduces by spores is a fungus, such as a mushroom.' },

      // ---------------- Classification charts and tables ----------------
      { id: 'liv-034', type: 'mcq', level: 2,
        stem: 'Study the classification chart. Which group of living things is Group B?',
        figure: chart('Living things', { q: 'Can it make its own food?',
          yes: 'Group A<br>fern, hibiscus',
          no: { q: 'Does it reproduce by spores?', yes: 'Group B<br>mushroom, bread mould', no: 'Group C<br>cat, sparrow' } }),
        options: ['Fungi', 'Plants', 'Animals', 'Bacteria'],
        answer: 0,
        explain: 'Group B cannot make its own food and reproduces by spores, and it contains a mushroom and bread mould. These are fungi.' },
      { id: 'liv-035', type: 'mcq', level: 2,
        stem: 'Study the classification chart. Which living things could be placed in Group Q and Group R?',
        figure: chart('Living things', { q: 'Can it make its own food?',
          yes: { q: 'Does it have flowers?', yes: 'Group P', no: 'Group Q' },
          no: 'Group R' }),
        options: ['Q: moss; R: mushroom', 'Q: mushroom; R: moss', 'Q: fern; R: hibiscus', 'Q: rose; R: yeast'],
        answer: 0,
        explain: 'Group Q makes its own food but has no flowers: a non-flowering plant such as moss. Group R cannot make its own food: a mushroom (a fungus) fits. A mushroom cannot go in Q because it cannot make its own food; hibiscus and rose have flowers, so they belong in P.' },
      { id: 'liv-036', type: 'mcq', level: 3,
        stem: 'The label at the top of this classification chart is missing. Which question could be the missing label?',
        figure: chart('Animals', { q: '???',
          yes: 'sparrow, penguin',
          no: { q: 'Does it have six legs?', yes: 'ant, butterfly', no: 'cat, frog, spider' } }),
        options: ['Can it fly?', 'Does it have feathers?', 'Does it lay eggs?', 'Does it live in water?'],
        answer: 1,
        explain: 'Only the sparrow and penguin have feathers. "Can it fly?" fails: the penguin cannot fly but the butterfly can. "Does it lay eggs?" fails: the ant, butterfly, frog and spider also lay eggs.' },
      { id: 'liv-037', type: 'mcq', level: 3,
        stem: 'Some animals are sorted into two groups. Group X: cat, whale, bat. Group Y: chicken, crocodile, frog. Which question was used to sort them?',
        figure: table(['Group X', 'Group Y'], [['cat', 'chicken'], ['whale', 'crocodile'], ['bat', 'frog']]),
        options: ['Can it fly?', 'Does it live in water?', 'Does it feed its young on milk?', 'Does it breathe through lungs?'],
        answer: 2,
        explain: 'Cat, whale and bat are mammals that feed their young on milk; chicken, crocodile and frog do not. "Fly" and "water" mix the groups (bat and chicken; whale and frog). All six animals breathe through lungs (adult frogs too), so that question cannot split them.' },
      { id: 'liv-038', type: 'mcq', level: 3,
        stem: 'The table shows information about living things W, X, Y and Z. Which statement is correct?',
        figure: TABLE_WXYZ,
        options: ['W is a fungus because it reproduces by spores.', 'X is a plant because it has no flowers.', 'Y reproduces by seeds.', 'Z could be a moss.'],
        answer: 2,
        explain: 'Y makes its own food and has flowers, so it is a flowering plant and reproduces by seeds. W makes its own food, so it is a plant (like a fern), not a fungus. X cannot make its own food, so it is not a plant (it could be a mushroom). Z cannot make its own food, so it cannot be a moss.' },
      { id: 'liv-039', type: 'mcq', level: 3,
        stem: 'The table shows information about living things W, X, Y and Z. Which TWO of them are NOT plants?',
        figure: TABLE_WXYZ,
        options: ['W and X', 'X and Z', 'Y and Z', 'W and Y'],
        answer: 1,
        explain: 'All plants make their own food. X and Z cannot, so they are not plants. X reproduces by spores but cannot make its own food, like a mushroom (a fungus); Z could be an animal. W (spores, no flowers) and Y (flowers) are both plants.' },

      // ---------------- OEQ ----------------
      { id: 'liv-040', type: 'oeq', level: 3, marks: 3,
        stem: 'Sam put one grasshopper into each of three similar glass jars, P, Q and R, and kept the jars in the same place. The table shows what each jar had.\n(a) In which jar is the grasshopper likely to live the longest? (1 mark)\n(b) The grasshopper in jar Q died first. Explain why. (2 marks)',
        figure: table(['Jar', 'Lid', 'Fresh leaves (food)', 'Damp cotton wool (water)'],
          [['P', 'with air holes', '&#10003;', '&#10003;'],
           ['Q', 'airtight, no air holes', '&#10003;', '&#10003;'],
           ['R', 'with air holes', '&#10007;', '&#10003;']]),
        model: '(a) Jar P. (b) The lid of jar Q has no air holes, so no fresh air could enter the jar. The grasshopper needs air to survive, so it died when the air in the jar was used up.',
        keys: [['jar P'], ['no air holes', 'no fresh air', 'airtight', 'no air'], ['needs air', 'need air', 'air to survive', 'air to live']],
        explain: 'Only jar P gives the grasshopper all three things it needs: food, water and air. In (b), one mark for the evidence (no air holes, so no fresh air) and one for the reason (living things need air to survive). The grasshopper in R had no food, but it could still get air.' },
      { id: 'liv-041', type: 'oeq', level: 2, marks: 2,
        stem: 'A toy robot can move and make sounds. Explain why it is a non-living thing.',
        figure: null,
        model: 'The toy robot cannot grow and it cannot reproduce, which living things do.',
        keys: [['cannot grow', 'does not grow', 'not grow'], ['cannot reproduce', 'does not reproduce', 'not reproduce', 'cannot make young']],
        explain: 'Moving and making sounds do not make something living. Markers look for "cannot grow" and "cannot reproduce".' },
      { id: 'liv-042', type: 'oeq', level: 3, marks: 2,
        stem: 'Peter kept some dry green bean seeds on a shelf for months and they did not change. He said, "Seeds are non-living." His sister put the seeds on damp cotton wool. A few days later, they grew into seedlings. Is Peter correct? Explain using what happened.',
        figure: null,
        model: 'No. The seeds are living things, because when they were given water they grew into seedlings.',
        keys: [['seeds are living', 'are living things', 'is a living', 'not correct'], ['grew', 'grow', 'germinate']],
        explain: 'A seed is living but resting. It needs water to start growing. Growing shows it is living.' },
      { id: 'liv-043', type: 'oeq', level: 2, marks: 2,
        stem: 'Ah Meng said, "Bacteria are not living things because we cannot see them." Explain why he is wrong.',
        figure: null,
        model: 'Bacteria are living things. They are too tiny to see with our eyes, but they can be seen with a microscope, and they grow and reproduce.',
        keys: [['are living', 'living things'], ['grow', 'reproduce', 'need food', 'need water', 'need air']],
        explain: 'Size does not decide if something is living. Markers look for "bacteria are living things" plus one characteristic of living things (grow, reproduce, need food/water/air).' },
      { id: 'liv-044', type: 'oeq', level: 2, marks: 2,
        stem: 'Jun said, "All bacteria are harmful, so we should get rid of every kind of bacteria." Do you agree? Explain your answer using one example.',
        figure: null,
        model: 'No, I do not agree. Not all bacteria are harmful; some bacteria are useful. For example, some bacteria are used to make yoghurt (or cheese), and some break down dead plants and animals.',
        keys: [['not all', 'some bacteria are useful', 'useful', 'do not agree', 'disagree'], ['yoghurt', 'cheese', 'break down', 'decompose', 'dead']],
        explain: 'One mark for disagreeing because some bacteria are useful, one mark for a correct useful example. Making bread uses yeast (a fungus), not bacteria, so it does not earn the example mark.' },
      { id: 'liv-045', type: 'oeq', level: 1, marks: 1,
        stem: 'Name the group of living things that includes mushrooms, moulds and yeast.',
        figure: null,
        model: 'Fungi.',
        keys: [['fungi', 'fungus']],
        explain: 'Mushrooms, moulds and yeast are fungi. They are not plants and not animals.' },
      { id: 'liv-046', type: 'oeq', level: 2, marks: 2,
        stem: 'Siti said, "A mushroom is a plant." Is she correct? Explain your answer.',
        figure: null,
        model: 'No. A mushroom is a fungus. Unlike a plant, it cannot make its own food.',
        keys: [['fungus', 'fungi'], ['cannot make its own food', 'cannot make food', 'does not make its own food', 'cannot make its food']],
        explain: 'The key difference markers want: plants make their own food, fungi cannot. "No flowers or leaves" alone does not prove it, because ferns and mosses have no flowers either.' },
      { id: 'liv-047', type: 'oeq', level: 2, marks: 2,
        stem: 'State one way a fern and a mushroom are similar, and one way they are different.',
        figure: null,
        model: 'Similar: both reproduce by spores. Different: a fern can make its own food but a mushroom cannot.',
        keys: [['spores'], ['make its own food', 'makes its own food', 'own food', 'make food', 'leaves']],
        explain: 'Spores is the similarity. Making its own food is the big difference: a fern is a plant, a mushroom is a fungus. "A fern has green leaves but a mushroom has no leaves" is also accepted.' },
      { id: 'liv-048', type: 'oeq', level: 2, marks: 2,
        stem: 'The diagram shows a fern leaf and a close-up of the underside of one of its leaves. (a) What do the dots labelled X contain? (b) How does this help the fern?',
        figure: FERN,
        model: '(a) X contains spores. (b) The spores help the fern to reproduce; they can grow into new fern plants.',
        keys: [['spores', 'spore'], ['reproduce', 'new fern', 'new plants', 'new plant']],
        explain: 'Ferns have no flowers and no seeds. They reproduce by spores, found in the spore cases on the underside of the leaves.' },
      { id: 'liv-049', type: 'oeq', level: 2, marks: 2,
        stem: 'How is the way a moss plant reproduces different from the way a hibiscus plant reproduces?',
        figure: null,
        model: 'Moss has no flowers and reproduces by spores. The hibiscus is a flowering plant that reproduces by seeds.',
        keys: [['spores'], ['seeds', 'seed']],
        explain: 'Moss = non-flowering, spores. Hibiscus = flowering, seeds. One mark for each correct method.' },
      { id: 'liv-050', type: 'oeq', level: 2, marks: 1,
        stem: 'Ming saw a patch of moss on a damp wall. Over a few months, new patches of moss appeared further along the wall, although moss never has flowers or seeds. How does moss reproduce?',
        figure: null,
        model: 'Moss reproduces by spores.',
        keys: [['spores', 'spore']],
        explain: 'Moss is a non-flowering plant. Its tiny spores are carried by wind or water and grow into new moss plants where it is damp.' },
      { id: 'liv-051', type: 'oeq', level: 3, marks: 2,
        stem: 'Study the classification chart. (a) Suggest a suitable question for the box labelled "?". (b) Which group of living things do the fern and hibiscus both belong to?',
        figure: chart('Living things', { q: 'Can it make its own food?',
          yes: 'fern, hibiscus',
          no: { q: '?', yes: 'mushroom, bread mould', no: 'cat, eagle' } }),
        model: '(a) Does it reproduce by spores? (b) Plants.',
        keys: [['spores', 'spore'], ['plants', 'plant']],
        explain: 'Mushrooms and moulds reproduce by spores; cats and eagles do not. Other correct questions are accepted if they are true for both fungi and false for both animals. Living things that make their own food are plants.' },
      { id: 'liv-052', type: 'oeq', level: 2, marks: 2,
        stem: 'Some plants are sorted into two groups. (a) What characteristic was used to sort them? (b) How do the plants in Group A reproduce?',
        figure: table(['Group A', 'Group B'], [['fern', 'hibiscus'], ['moss', 'rambutan tree']]),
        model: '(a) Whether the plant has flowers (Group A has no flowers, Group B has flowers). (b) By spores.',
        keys: [['flowers', 'flower', 'flowering'], ['spores', 'spore']],
        explain: 'Ferns and mosses are non-flowering plants that reproduce by spores; hibiscus and rambutan trees are flowering plants.' },
      { id: 'liv-053', type: 'oeq', level: 2, marks: 2,
        stem: 'The table compares a whale with a fish. Using the table, give two reasons why a whale is a mammal and not a fish.',
        figure: table(['', 'Whale', 'Fish'],
          [['Breathes through', 'lungs', 'gills'], ['How it reproduces', 'gives birth to young alive', 'lays eggs'], ['Feeds young on milk?', 'yes', 'no']]),
        model: 'A whale breathes through lungs, not gills. It gives birth to its young alive and feeds its young on milk.',
        keys: [['lungs'], ['gives birth', 'young alive', 'milk']],
        explain: 'Living in water and having fins do not decide the group. Breathing through lungs and feeding young on milk are mammal characteristics.' },
      { id: 'liv-054', type: 'oeq', level: 2, marks: 2,
        stem: 'The diagram shows an animal. (a) Which group of animals does it belong to? (b) Give one characteristic from the diagram that helped you decide.',
        figure: insect(true, false),
        model: '(a) Insects. (b) It has 6 legs / 3 body parts / a pair of feelers.',
        keys: [['insect', 'insects'], ['six legs', '6 legs', 'three pairs of legs', 'three body parts', '3 body parts', 'feelers', 'antennae']],
        explain: 'Count carefully: 3 body parts, 6 legs, 2 feelers. Wings alone do not prove it is an insect: birds and bats have wings too.' },
      { id: 'liv-055', type: 'oeq', level: 2, marks: 2,
        stem: 'John said, "A penguin cannot fly, so it is not a bird." Is John correct? Explain.',
        figure: null,
        model: 'No. A penguin is a bird because it has feathers (and a beak, and lays eggs with hard shells). Not all birds can fly.',
        keys: [['is a bird', 'still a bird', 'not correct'], ['feathers', 'feather']],
        explain: 'Feathers are the characteristic only birds have. Flying is not: bats and insects fly, penguins and ostriches do not.' },
      { id: 'liv-056', type: 'oeq', level: 2, marks: 2,
        stem: 'A frog lays its eggs in water. (a) Which group of animals does a frog belong to? (b) State one other characteristic of this group.',
        figure: null,
        model: '(a) Amphibians. (b) They have moist skin / the young (tadpoles) live in water and breathe through gills / adults breathe through lungs and moist skin.',
        keys: [['amphibian', 'amphibians'], ['moist skin', 'moist', 'tadpole', 'gills', 'lungs and skin']],
        explain: 'Amphibians have moist skin. Their young live in water and breathe through gills; adults breathe through lungs and moist skin.' },
      { id: 'liv-057', type: 'oeq', level: 2, marks: 3,
        stem: 'The table shows information about animals P, Q, R and S. Name the group of animals that P, Q and S each belong to.',
        figure: TABLE_PQRS,
        model: 'P is a mammal. Q is a fish. S is a reptile. (R is a bird.)',
        keys: [['mammal'], ['fish'], ['reptile']],
        explain: 'P: fur and milk = mammal. Q: scales and gills = fish. S: dry scaly skin, lungs = reptile. One mark each.' },
      { id: 'liv-058', type: 'oeq', level: 2, marks: 2,
        stem: 'A shark is a fish. A dolphin is a mammal. Both live in the sea and have fins. State how the way they breathe is different.',
        figure: null,
        model: 'A dolphin breathes through lungs, but a shark breathes through gills.',
        keys: [['lungs'], ['gills']],
        explain: 'Mammals breathe through lungs (a dolphin comes up to the surface to breathe air). Fish breathe through gills.' },
      { id: 'liv-059', type: 'oeq', level: 3, marks: 3,
        stem: 'Mei Ling left three slices of bread for 5 days, as shown in the table.\n(a) Which group of living things does bread mould belong to? (1 mark)\n(b) From her results, state two conditions that help mould to grow. (2 marks)',
        figure: TABLE_MOULD,
        model: '(a) Fungi. (b) Warmth and moisture: mould grows best when the bread is warm and damp.',
        keys: [['fungi', 'fungus'], ['warm', 'warmth'], ['damp', 'moist', 'water', 'wet']],
        explain: 'Compare A and B: only water is different, and B (damp) had more mould. Compare B and C: only temperature is different, and B (warm) had more mould.' },
      { id: 'liv-060', type: 'oeq', level: 3, marks: 2,
        stem: 'Mei Ling left three slices of bread for 5 days, as shown in the table.\n(a) Why did she use the same type and size of bread for all three slices? (1 mark)\n(b) Which two slices should she compare to find out if temperature affects mould growth? (1 mark)',
        figure: TABLE_MOULD,
        model: '(a) To make it a fair test, so that only one thing is changed each time. (b) Slices B and C.',
        keys: [['fair test', 'fair', 'only one', 'one variable'], ['B and C', 'B, C', 'C and B']],
        explain: 'In a fair test, only the thing being tested changes. B and C are both damp; only the temperature is different (warm vs fridge).' },
      { id: 'liv-061', type: 'oeq', level: 1, marks: 1,
        stem: 'Yeast is a fungus. Name one food that is made using yeast.',
        figure: null,
        model: 'Bread.',
        keys: [['bread', 'buns', 'pau', 'dough']],
        explain: 'Yeast makes bread dough rise. (Yoghurt is made using bacteria, not yeast.)' },

      // ---------------- Exam-style set-ups (hardness calibration, 2026-10-07) ----------------
      { id: 'liv-062', type: 'oeq', level: 3, marks: 3,
        stem: 'Jun placed a potted plant inside a box with one opening on its side. The opening faced a sunny window, as shown. He watered the plant every day.\n(a) Predict how the stem of the plant will look after one week. (1 mark)\n(b) Which characteristic of living things does your answer to (a) show? (1 mark)\n(c) Why did Jun water the plant every day? (1 mark)',
        figure: PLANT_BOX,
        model: '(a) The stem will bend and grow towards the opening (towards the light). (b) Living things respond to changes around them. (c) The plant needs water to survive.',
        keys: [['towards the opening', 'towards the light', 'towards the window', 'bend towards', 'grow towards'], ['respond'], ['needs water', 'need water', 'water to survive', 'water to live', 'stay alive']],
        explain: 'Light only enters through the opening, so the stem grows towards it: the plant is responding to a change around it (light from one side). All living things need water to survive, so Jun kept watering it.' },
      { id: 'liv-063', type: 'mcq', level: 3,
        stem: 'Lina put a few tiny living things X into a dish of food and kept the dish in a warm place. Each day she counted the number of X using a microscope. By the end of Day 3, all the food in the dish had been used up. The graph shows her results.\nWhich of the following statements are correct?\nA  X can reproduce.\nB  X needs food to survive.\nC  X is non-living because it can only be seen with a microscope.',
        figure: GRAPH_X,
        options: ['A only', 'A and B only', 'B and C only', 'A, B and C'],
        answer: 1,
        explain: 'A: the number of X doubled each day from Day 0 to Day 3, so X made more of its own kind. B: after the food was used up, the number of X fell from Day 4 to Day 6, so X needs food to survive. C is wrong: being too tiny to see without a microscope does not make something non-living (bacteria are living).' },
      { id: 'liv-064', type: 'mcq', level: 3,
        stem: 'Which of the following statements are correct?\nA  Frogs and turtles both lay eggs.\nB  A frog\'s moist skin helps it to breathe.\nC  A crocodile breathes through gills when it swims underwater.\nD  A lizard has dry scaly skin.',
        figure: null,
        options: ['A and C only', 'B and D only', 'A, B and D only', 'B, C and D only'],
        answer: 2,
        explain: 'A: frogs (amphibians) and turtles (reptiles) both lay eggs. B: an adult frog breathes through its lungs and its moist skin. D: lizards are reptiles with dry scaly skin. C is wrong: a crocodile is a reptile and breathes through lungs; it comes up to the surface for air.' },
      { id: 'liv-065', type: 'mcq', level: 3,
        stem: 'Jia Hui sprinkled water on two identical slices of bread and sealed each slice in a plastic bag. She kept bag P in a dark kitchen cupboard and bag Q in the fridge. The table shows her results.\nWhich of the following statements are correct?\nA  Mould grows better in warm places than in cold places.\nB  Mould needs light to grow.\nC  Keeping bread in the fridge slows down the growth of mould.\nD  Mould makes its own food.',
        figure: table(['Bag', 'Kept in', 'Mould after 5 days'],
          [['P', 'dark cupboard (warm)', 'a lot'], ['Q', 'fridge (cold)', 'very little']]),
        options: ['A and B only', 'A and C only', 'B and D only', 'C and D only'],
        answer: 1,
        explain: 'Only the temperature was different, and the warm bread (P) grew much more mould, so A and C are correct. B is wrong: bag P was in a dark cupboard and still grew a lot of mould. D is wrong: mould is a fungus and takes in food from the bread.' },
      { id: 'liv-066', type: 'oeq', level: 3, marks: 4,
        stem: 'Ben toasted a slice of bread until it was dry and crisp. He left another slice of the same bread untoasted. He sealed each slice in a plastic bag and kept both bags in the same cupboard for 6 days. The table shows his results.\n(a) What is the aim of Ben\'s experiment? (1 mark)\n(b) State one variable Ben must keep the same to make it a fair test. (1 mark)\n(c) Explain why no mould grew on the bread in bag K. (2 marks)',
        figure: table(['Bag', 'Bread', 'Mould after 6 days'],
          [['J', 'untoasted (soft)', 'a lot'], ['K', 'toasted (dry and crisp)', 'none']]),
        model: '(a) To find out whether toasting the bread (making it dry) affects the amount of mould that grows on it. (b) The type of bread / the size of the slice / the place where the bags were kept / the number of days. (c) Toasting removed most of the water from the bread in bag K, so it was dry. Mould needs water (moisture) to grow, so no mould grew on it.',
        keys: [['toasting', 'toasted', 'amount of water', 'dry'], ['type of bread', 'size', 'same cupboard', 'place', 'temperature', 'number of days', 'type of bag'], ['dry', 'no water', 'little water', 'less water', 'removed most of the water', 'removed the water'], ['mould needs water', 'needs water to grow', 'needs moisture', 'water to grow']],
        explain: 'Ben changed only one thing: whether the bread was toasted. (c) is marked Claim + Reason: the toasted bread had very little water (claim/evidence), and mould needs water to grow (reason). Mould also needs warmth, air and food, but both bags had those.' },
      { id: 'liv-067', type: 'oeq', level: 3, marks: 3,
        stem: 'Ah Hock sealed a slice of bread in a plastic bag and kept it in the fridge. He said, "No mould will ever grow on this bread because it is in the fridge."\n(a) Do you agree with him? Explain your answer. (2 marks)\n(b) Mould cannot make its own food. How does the mould on bread get its food? (1 mark)',
        figure: null,
        model: '(a) No, I do not agree. The fridge is cold, and cold only slows down the growth of mould. The bread still has water (moisture), air and food, so mould can still grow on it slowly. (b) The mould takes in food from the bread that it grows on.',
        keys: [['slows down', 'slowly', 'slower'], ['still has water', 'water', 'moisture', 'air'], ['from the bread', 'feeds on the bread', 'takes in food from']],
        explain: 'A fridge does not stop mould; it makes it grow more slowly. The bread in the bag still gives mould water, air and food. Mould is a fungus: it takes in food from the bread.' },
      { id: 'liv-068', type: 'oeq', level: 3, marks: 4,
        stem: 'Kumar put two pieces of the same cake into two similar covered containers, A and B. He sprinkled water on the cake in B only. He kept both containers on the same kitchen shelf. After 4 days, he counted the mould spots on each piece of cake.\n(a) What did Kumar change in his experiment? (1 mark)\n(b) What can Kumar conclude from his results? (1 mark)\n(c) Kumar then set up container C, the same as B but kept in the fridge. Predict whether C will have more or fewer mould spots than B after 4 days. Explain your answer. (2 marks)',
        figure: table(['Container', 'Water sprinkled on cake?', 'Number of mould spots after 4 days'],
          [['A', 'no', '3'], ['B', 'yes', '18']]),
        model: '(a) Whether water was sprinkled on the cake (the amount of water in the cake). (b) Mould grows better on food that is damp than on food that is dry. (c) C will have fewer mould spots than B, because the fridge is cold and mould grows more slowly in cold places than in warm places.',
        keys: [['water', 'moisture', 'damp'], ['grows better', 'more mould', 'damp food'], ['fewer', 'less'], ['cold', 'temperature']],
        explain: 'Only the water was changed, so the extra mould on B (18 spots vs 3) came from the water. In (c), one mark for "fewer" and one for the reason: the fridge is cold, and mould grows more slowly in the cold.' },
      { id: 'liv-069', type: 'oeq', level: 3, marks: 3,
        stem: 'The table describes four adult animals, W, X, Y and Z. They are sorted using the classification chart below the table.\n(a) Suggest a suitable question for box (a). (1 mark)\n(b) Suggest a suitable question for box (b). (1 mark)\n(c) Which group of animals does Y belong to? (1 mark)',
        figure: table(['Animal', 'Body covering', 'Breathes through', 'How it reproduces'],
          [['W', 'hair', 'lungs', 'gives birth to young alive'],
           ['X', 'feathers', 'lungs', 'lays eggs with hard shells'],
           ['Y', 'moist skin', 'lungs and moist skin', 'lays eggs in water'],
           ['Z', 'scales', 'gills', 'lays eggs in water']]) +
          chart('Animals W, X, Y, Z', { q: '(a) ?', yes: 'W', no: { q: '(b) ?', yes: 'X', no: { q: 'Does it breathe through gills?', yes: 'Z', no: 'Y' } } }),
        model: '(a) Does it give birth to its young alive? / Does it have hair? (b) Does it have feathers? / Does it lay eggs with hard shells (on land)? (c) Amphibians.',
        keys: [['give birth', 'young alive', 'hair', 'fur', 'milk'], ['feathers', 'hard shells', 'on land'], ['amphibian']],
        explain: 'Box (a) must be YES for W only: only W gives birth to young alive and has hair. Box (b) must be YES for X but NO for Y and Z: only X has feathers. "Does it breathe through lungs?" fails, because W, X and Y all do. Y has moist skin and lays eggs in water, so it is an amphibian.' },
      { id: 'liv-070', type: 'oeq', level: 3, marks: 4,
        stem: 'On a nature walk, Mei found two living things, F and G.\nF was growing on the trunk of a tree. It had green leaves with rows of brown dots on their underside.\nG was growing on a rotting log. It had no leaves. When Mei shook G over a sheet of paper, a fine brown powder fell out.\n(a) Mei said, "F takes its food from the tree it grows on." Do you agree? Explain. (2 marks)\n(b) State one way F and G are similar. (1 mark)\n(c) How does G get its food? (1 mark)',
        figure: null,
        model: '(a) No, I do not agree. F has green leaves, so it is a plant (a fern), and plants make their own food. F only grows on the tree trunk; it does not take food from the tree. (b) Both F and G reproduce by spores (the brown dots and the brown powder contain spores). (c) G takes in food from the rotting log (dead or decaying matter), because it cannot make its own food.',
        keys: [['plant', 'fern', 'green leaves'], ['makes its own food', 'make their own food', 'make its own food', 'own food'], ['spores', 'spore', 'need water', 'need air'], ['rotting log', 'dead', 'decaying', 'rotting']],
        explain: 'F is a fern: a plant, so it makes its own food; the tree trunk is only a place to grow. G is a mushroom: a fungus with no leaves that feeds on dead or decaying matter. Both reproduce by spores, which is why they are easy to mix up, but they are in different groups.' },
      { id: 'liv-071', type: 'oeq', level: 3, marks: 3,
        stem: 'Animal K lives in the sea. It can leap out of the water and glide through the air for some distance using its large, wing-like fins. Its body is covered with scales and it breathes through gills.\n(a) Which group of animals does K belong to? (1 mark)\n(b) Lina said, "K is a bird because it can fly." Explain why she is wrong. (2 marks)',
        figure: null,
        model: '(a) Fish. (b) Being able to fly does not make an animal a bird. K has no feathers, but all birds have feathers. K has scales and breathes through gills, which are characteristics of fish.',
        keys: [['fish'], ['no feathers', 'feathers'], ['gills', 'scales']],
        explain: 'Flying is not a characteristic of one group: birds, bats and many insects fly, and penguins cannot. Birds are the animals with feathers. Scales, fins and gills make K a fish (a flying fish).' },
      { id: 'liv-072', type: 'oeq', level: 2, marks: 2,
        stem: 'A dugong lives in the sea. It has a tail fin and two flippers. It comes up to the surface to breathe air, gives birth to its young alive and feeds its young on milk. Jay said, "A dugong is a fish because it has fins and lives in water." Do you agree? Explain.',
        figure: null,
        model: 'No, I do not agree. A dugong is a mammal because it feeds its young on milk and gives birth to young alive. It breathes air through its lungs, but fish breathe through gills.',
        keys: [['mammal'], ['milk', 'young alive', 'lungs', 'breathe air']],
        explain: 'Fins and living in water do not decide the group. Feeding young on milk is a mammal characteristic, like the whale and dolphin.' },
      { id: 'liv-073', type: 'oeq', level: 3, marks: 3,
        stem: 'Wei sorted some living things into two groups, as shown in the table.\n(a) Suggest a suitable heading for Group X. (1 mark)\n(b) Suggest a suitable heading for Group Y. (1 mark)\n(c) Wei wrote "Non-flowering plants" as the heading for Group X. Explain why this heading is not correct. (1 mark)',
        figure: table(['Group X', 'Group Y'], [['fern', 'hibiscus'], ['moss', 'mango tree'], ['mushroom', 'rose'], ['bread mould', '']]),
        model: '(a) Living things that reproduce by spores / do not have flowers. (b) Living things that reproduce by seeds / have flowers (flowering plants). (c) The mushroom and bread mould are fungi, not plants, so not everything in Group X is a plant.',
        keys: [['spores', 'no flowers', 'do not have flowers', 'without flowers'], ['seeds', 'have flowers', 'flowering plants'], ['fungi', 'fungus', 'not plants', 'not a plant']],
        explain: 'A heading must fit EVERY member of the group. Fern, moss, mushroom and bread mould all reproduce by spores and have no flowers. The trap in (c): mushrooms and moulds are fungi, so "plants" does not fit them.' },
      { id: 'liv-074', type: 'mcq', level: 3,
        stem: 'The table describes four animals, K, L, M and N. They are sorted using the classification chart. Which question could be written in the box labelled "?"',
        figure: table(['Animal', 'Body covering', 'How it reproduces'],
          [['K', 'hair', 'gives birth to young alive'],
           ['L', 'moist skin', 'lays eggs in water'],
           ['M', 'dry scaly skin', 'lays eggs on land'],
           ['N', 'feathers', 'lays eggs with hard shells']]) +
          chart('Animals K, L, M, N', { q: 'Does it lay eggs?', yes: { q: '?', yes: 'L', no: 'M, N' }, no: 'K' }),
        options: ['Does it lay its eggs in water?', 'Does it breathe through its lungs?', 'Does it have dry scaly skin?', 'Does it have feathers on its body?'],
        answer: 0,
        explain: 'Only L lays its eggs in water; M and N lay eggs on land. "Lungs" cannot split them, because adult L, M and N all breathe through lungs. "Dry scaly skin" would put M on the YES side, and "feathers" would put N on the YES side.' },
      { id: 'liv-075', type: 'mcq', level: 3,
        stem: 'Hana put the same amount of warm water into three similar bottles, A, B and C. She added the things shown in the table and stretched a balloon over the mouth of each bottle. Which conclusion can she make from her results?',
        figure: table(['Bottle', 'Added to the warm water', 'Balloon after 30 minutes'],
          [['A', 'yeast and sugar', 'became bigger'], ['B', 'sugar only', 'no change'], ['C', 'yeast only', 'no change']]),
        options: ['Sugar alone can make the balloon become bigger.', 'Warm water makes the balloon become bigger.', 'Yeast needs sugar to make the balloon become bigger.', 'Yeast alone can make the balloon become bigger.'],
        answer: 2,
        explain: 'Yeast is a living fungus. In A it took in the sugar as food and gave out a gas that filled the balloon. B shows sugar without yeast does nothing; C shows yeast without sugar (food) does nothing. All three had warm water, so warm water alone is not the cause.' },
      { id: 'liv-076', type: 'mcq', level: 3,
        stem: 'Siva set up four slices of the same bread as shown in the table. Which two set-ups should he compare to find out whether mould needs air to grow?',
        figure: table(['Set-up', 'Bread', 'Where it was kept', 'Mould after 5 days'],
          [['A', 'damp', 'warm, open dish', 'a lot'],
           ['B', 'dry', 'warm, open dish', 'very little'],
           ['C', 'damp', 'cold, open dish in the fridge', 'very little'],
           ['D', 'damp', 'warm, jar with the air pumped out', 'none']]),
        options: ['A and B', 'B and C', 'C and D', 'A and D'],
        answer: 3,
        explain: 'A fair test changes only ONE thing. A and D are both damp and warm; the only difference is that D has no air. D grew no mould, so mould needs air. B and C change water or temperature, not air.' },
      { id: 'liv-077', type: 'oeq', level: 3, marks: 2,
        stem: 'Mrs Tan set up two cups of warm milk, P and Q, as shown in the table, and kept them in a warm place for 8 hours.\n(a) What living things in the spoonful of yoghurt turned the milk in cup P into yoghurt? (1 mark)\n(b) Why did Mrs Tan set up cup Q? (1 mark)',
        figure: table(['Cup', 'What was put in', 'After 8 hours'],
          [['P', 'warm milk + 1 spoonful of yoghurt', 'thick and sour (yoghurt)'], ['Q', 'warm milk only', 'no change']]),
        model: '(a) Bacteria. (b) To compare with cup P, to show that the milk turned into yoghurt only because of the bacteria in the yoghurt (milk alone does not become yoghurt).',
        keys: [['bacteria'], ['compare', 'to show', 'only because', 'milk alone']],
        explain: 'Yoghurt contains useful bacteria that turn milk into yoghurt. Cup Q has no added bacteria and did not change, so the comparison shows the bacteria caused the change in P.' },
      { id: 'liv-078', type: 'mcq', level: 3,
        stem: 'Which of the following statements about a fern and a mushroom are correct?\nA  Both reproduce by spores.\nB  Both make their own food.\nC  Both need air and water to survive.\nD  Both have no flowers.',
        figure: null,
        options: ['A and B only', 'B and D only', 'A, C and D only', 'A, B, C and D'],
        answer: 2,
        explain: 'A, C and D are correct: ferns and mushrooms both reproduce by spores, have no flowers, and (like all living things) need air and water. B is wrong: the fern makes its own food, but the mushroom is a fungus and cannot.' },

      /* x17 science expansion — lane sci-x-living */
      /* hints: [first-miss nudge, second-miss reveal]. The shell does not show it yet (see the lane report, Shared requests). */
      // ---- classification flowcharts (archetype 8) ----
      { id: 'x17-liv-01', type: 'mcq', level: 1,
        stem: 'Nadia used this flowchart to sort the animals she saw at the zoo. Into which box, A, B, C or D, should she put a fruit bat?',
        figure: XF_ZOO,
        options: ['A', 'B', 'C', 'D'],
        answer: 2,
        hints: ['Start at the top and answer each question about the bat, one at a time. Does a bat have feathers?',
               'A bat has fur, not feathers: No. It has 2 legs, not 6: No. It feeds its young on milk: Yes. So the bat goes in box C.'],
        explain: 'Follow the arrows. A fruit bat has no feathers (No), it does not have six legs (No), and it feeds its young on milk (Yes), so it ends in box C, with the mammals. Box A is the trap: a bat flies, but only birds have feathers. Box B is for animals with six legs, such as insects.' },
      { id: 'x17-liv-02', type: 'mcq', level: 2,
        stem: 'Look at the same flowchart. Which animal could be in box D?',
        figure: XF_ZOO,
        options: ['Sparrow', 'Cat', 'Grasshopper', 'Crocodile'],
        answer: 3,
        hints: ['Box D is reached by answering No three times. Which animal has no feathers, does not have six legs and does not feed its young on milk?',
               'Sparrow: feathers, so A. Grasshopper: six legs, so B. Cat: feeds its young on milk, so C. The crocodile answers No to all three, so it is in D.'],
        explain: 'To reach D, the answer to every question must be No. A crocodile has no feathers, has four legs and does not feed its young on milk, so it goes in D. The sparrow has feathers (A), the grasshopper has six legs (B) and the cat feeds its young on milk (C).' },
      { id: 'x17-liv-03', type: 'mcq', level: 2,
        stem: 'Study the flowchart. Which living thing belongs in box Q?',
        figure: XF_LIFE,
        options: ['Mushroom', 'Fern', 'Hibiscus', 'Bread mould'],
        answer: 1,
        hints: ['To reach Q, the living thing must make its own food (Yes) but have no flowers (No).',
               'A fern is a plant, so it makes its own food, and it has no flowers. A mushroom and bread mould cannot make their own food, so they go down the No side to R.'],
        explain: 'Box Q is for living things that make their own food but have no flowers: non-flowering plants such as the fern. The mushroom and bread mould also have no flowers, but they cannot make their own food, so they are fungi and end in R. The hibiscus has flowers, so it is in P.' },
      { id: 'x17-liv-04', type: 'mcq', level: 3,
        stem: 'Look at the same flowchart. Ali put a mushroom in box Q because it has no flowers. Which statement explains his mistake?',
        figure: XF_LIFE,
        options: ['A mushroom has flowers, so it belongs in box P.', 'A mushroom does not reproduce by spores, so it belongs in box S.', 'A mushroom cannot make its own food, so it goes down the No side of the first question.', 'A mushroom is an animal, so it belongs in box S.'],
        answer: 2,
        hints: ['Ali skipped a question. Which question comes FIRST in the flowchart, and what is the answer for a mushroom?',
               'The first question is "Can it make its own food?" A mushroom cannot, so it goes down the No side. Then it reproduces by spores (Yes), so it belongs in R, not Q.'],
        explain: 'You must answer the questions in order, starting at the top. A mushroom cannot make its own food, so it goes down the No side and can never reach Q or P. It reproduces by spores, so it ends in R. A mushroom has no flowers, does reproduce by spores, and is a fungus, not an animal.' },
      { id: 'x17-liv-05', type: 'mcq', level: 3,
        stem: 'The question in the dashed box of this flowchart is missing. Which question could it be?',
        figure: xFlow({ box: 'Living things', kids: [{ q: '?', blank: true,
          yes: { q: 'Does it have flowers?', yes: { t: 'G', items: ['sunflower', 'rambutan tree'] }, no: { t: 'H', items: ['fern', 'moss'] } },
          no: { t: 'J', items: ['mushroom', 'bread mould'] } }] },
          { label: 'Flowchart with a missing first question. Yes side: sunflower, rambutan tree, fern, moss. No side: mushroom, bread mould' }),
        options: ['Can it make its own food?', 'Does it reproduce by spores?', 'Does it grow in damp places?', 'Does it need water to survive?'],
        answer: 0,
        hints: ['The missing question must be YES for everything in G and H, and NO for both things in J. Test each option on the fern and the mushroom.',
               'The sunflower, rambutan tree, fern and moss are plants: they make their own food. The mushroom and bread mould are fungi: they cannot. So the question is "Can it make its own food?"'],
        explain: 'Everything on the Yes side (sunflower, rambutan tree, fern, moss) is a plant and makes its own food, and both things on the No side are fungi, which cannot. "Spores" fails: the fern and moss use spores too. "Damp places" fails: ferns, moss and mushrooms all grow in damp places. "Needs water" fails: every living thing needs water.' },
      { id: 'x17-liv-06', type: 'mcq', level: 3,
        stem: 'Hui Min sorted some adult animals using this flowchart. She placed ONE animal in the wrong group. Which animal is it?',
        figure: xFlow({ box: 'Adult animals', kids: [{ q: 'Does it have feathers?',
          yes: { t: 'Group K', items: ['penguin', 'ostrich', 'bat'] },
          no: { q: 'Does it breathe through gills?', yes: { t: 'Group L', items: ['shark', 'guppy'] }, no: { t: 'Group M', items: ['dolphin', 'frog', 'lizard'] } } }] },
          { label: 'Flowchart: feathers? then gills? Group K penguin, ostrich, bat. Group L shark, guppy. Group M dolphin, frog, lizard' }),
        options: ['Penguin', 'Bat', 'Dolphin', 'Frog'],
        answer: 1,
        hints: ['Check each animal in Group K against its question: does it really have feathers?',
               'A bat has fur, not feathers. It is a mammal that breathes through lungs, so it should go No, then No again, into Group M.'],
        explain: 'A bat can fly, but it has fur, not feathers, so it belongs in Group M. The penguin and ostrich cannot fly but have feathers, so Group K is right for them. The dolphin lives in water but breathes through lungs, and an adult frog breathes through lungs and moist skin, so both are correct in Group M.' },
      { id: 'x17-liv-07', type: 'oeq', level: 2, marks: 2,
        stem: 'Daniel used this flowchart to sort animals in his school garden. Into which box, W, X, Y or Z, should he put:\n(a) a cockroach? (1 mark)\n(b) a frog? (1 mark)',
        figure: XF_GARDEN,
        model: '(a) Box Y: a cockroach has no hair or fur and no feathers, but it has six legs. (b) Box Z: a frog has no hair or fur, no feathers and only four legs.',
        keys: [['Box Y'], ['Box Z']],
        hints: ['Answer the questions in order for each animal. How many legs does a cockroach have? How many does a frog have?',
               'Cockroach: No, No, Yes (six legs), so box Y. Frog: No, No, No (four legs), so box Z.'],
        explain: 'Give the box and the path that leads to it. A cockroach is an insect with six legs (Y). A frog is an amphibian with moist skin and four legs (Z).' },
      { id: 'x17-liv-08', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at the same flowchart. Lina said, "A mynah and a penguin will end up in different boxes, because only the mynah can fly." Do you agree? Explain using the flowchart.',
        figure: XF_GARDEN,
        model: 'No, I do not agree. Both the mynah and the penguin have no hair or fur, and both have feathers, so both end up in box X. The flowchart asks about feathers, not about flying.',
        keys: [['do not agree', 'disagree', 'both end up in box X', 'box X'], ['both have feathers', 'feathers']],
        hints: ['Find the question in the flowchart that sorts birds. Is it about flying?',
               'The question is "Does it have feathers?" Both the mynah and the penguin have feathers, so both go to box X.'],
        explain: 'Claim: they are in the same box (X). Evidence: both have feathers and no hair or fur. Reasoning: the flowchart sorts by feathers, and flying is not one of its questions. A penguin cannot fly, but it is still a bird.' },
      { id: 'x17-liv-09', type: 'oeq', level: 3, marks: 3,
        stem: 'Study the flowchart.\n(a) Suggest a suitable question for box (a). (1 mark)\n(b) Siti said, "The mushroom should be in box Q with the fern, because both reproduce by spores." Explain why the flowchart puts them in different boxes. (2 marks)',
        figure: xFlow({ box: 'Living things', kids: [{ q: 'Can it make its own food?',
          yes: { q: '(a) ?', blank: true, yes: { t: 'P', items: ['hibiscus', 'durian tree'] }, no: { t: 'Q', items: ['fern', 'moss'] } },
          no: { q: 'Does it reproduce by spores?', yes: { t: 'R', items: ['mushroom', 'bread mould'] }, no: { t: 'S', items: ['cat', 'earthworm'] } } }] },
          { label: 'Flowchart with box (a) missing. P hibiscus, durian tree. Q fern, moss. R mushroom, bread mould. S cat, earthworm' }),
        model: '(a) Does it have flowers? (b) The first question asks if it can make its own food. The fern is a plant and makes its own food, so it goes down the Yes side, but the mushroom cannot make its own food, so it goes down the No side. They split before the question about spores is asked.',
        keys: [['have flowers', 'flowers', 'reproduce by seeds', 'seeds'], ['makes its own food', 'fern is a plant'], ['cannot make its own food', 'mushroom cannot', 'No side']],
        hints: ['(a) What do the hibiscus and durian tree have that the fern and moss do not? (b) Look at the very first question.',
               '(a) Flowers. (b) The first question is "Can it make its own food?" The fern can (Yes); the mushroom cannot (No). So they are split before spores are asked about.'],
        explain: '(a) The hibiscus and durian tree have flowers; the fern and moss do not. "Does it reproduce by seeds?" also works. (b) Both use spores, but the chart splits them at the first question: the fern, a plant, makes its own food; the mushroom, a fungus, cannot.' },

      // ---- living vs non-living charts (archetype 9) ----
      { id: 'x17-liv-10', type: 'mcq', level: 1,
        stem: 'Ravi sorted some things he saw in the school garden. Which one has he put in the wrong group?',
        figure: xFlow({ box: 'Things Ravi saw in the school garden', kids: [
          { t: 'Living things', items: ['ant', 'fern', 'mushroom', 'kite'] },
          { t: 'Non-living things', items: ['stone', 'watering can', 'flower pot'] }] },
          { label: 'Chart: living things ant, fern, mushroom, kite. Non-living things stone, watering can, flower pot' }),
        options: ['Ant', 'Mushroom', 'Kite', 'Fern'],
        answer: 2,
        hints: ['A kite can move in the wind. Is moving enough to make something living?',
               'A kite cannot grow, reproduce or take in food. It moves only because the wind pushes it, so it is non-living.'],
        explain: 'The kite is non-living: it cannot grow or reproduce, and it only moves when the wind pushes it. The ant, fern and mushroom all grow and reproduce. The mushroom is a fungus, and it is still a living thing.' },
      { id: 'x17-liv-11', type: 'mcq', level: 2,
        stem: 'Aunty Lin sorted some things in her kitchen into two groups. Which one is in the wrong group?',
        figure: xFlow({ box: "Things in Aunty Lin's kitchen", kids: [
          { t: 'Living things', items: ['cockroach', 'potted chilli plant', 'yeast'] },
          { t: 'Non-living things', items: ['plastic flower', 'bread mould', 'spoon', 'stove'] }] },
          { label: 'Chart: living things cockroach, potted chilli plant, yeast. Non-living things plastic flower, bread mould, spoon, stove' }),
        options: ['Bread mould', 'Plastic flower', 'Yeast', 'Cockroach'],
        answer: 0,
        hints: ['One of the non-living things can grow and reproduce. Think about what happens to old bread.',
               'Bread mould grows bigger on the bread and reproduces by spores. It is a fungus, so it is a living thing.'],
        explain: 'Bread mould is a fungus: it grows on the bread, takes in food from it and reproduces by spores, so it is living. Yeast is also a living fungus and is correctly placed. The plastic flower looks like a plant, but it cannot grow or reproduce, so it is correctly non-living.' },
      { id: 'x17-liv-12', type: 'mcq', level: 2,
        stem: 'Wen Hui sorted six things into Group K and Group L. Which headings best fill K and L?',
        figure: xFlow({ box: 'Six things', kids: [
          { t: 'K', items: ['fire', 'cloud', 'toy robot'] },
          { t: 'L', items: ['moss', 'yeast', 'ant'] }] },
          { label: 'Chart: Group K fire, cloud, toy robot. Group L moss, yeast, ant' }),
        options: ['K: does not need air; L: needs air', 'K: cannot reproduce; L: can reproduce', 'K: cannot move; L: can move', 'K: can reproduce; L: cannot reproduce'],
        answer: 1,
        hints: ['A heading must be true for EVERY thing in its group. Test each option on the fire and on the moss.',
               'Fire needs air to burn, so "does not need air" fails. The toy robot moves and moss does not, so "can move" fails. Moss, yeast and ants reproduce; fire, clouds and robots cannot.'],
        explain: 'Group L (moss, yeast, ant) are living things, and all of them can reproduce; nothing in Group K can. Fire needs air to keep burning, so the air headings fail. The toy robot and clouds move but moss does not, so the moving headings fail. The last option swaps the two groups.' },
      { id: 'x17-liv-13', type: 'oeq', level: 2, marks: 2,
        stem: 'Mei sorted some things she saw at East Coast Park into two groups.\n(a) Give a suitable heading for Group M. (1 mark)\n(b) Her brother said, "The kite should be in Group M, because it moves in the wind." Explain why he is wrong. (1 mark)',
        figure: xFlow({ box: 'Things Mei saw at the park', kids: [
          { t: 'Group M', items: ['crab', 'coconut tree', 'mushroom'] },
          { t: 'Group N', items: ['sand', 'kite', 'plastic bottle'] }] },
          { label: 'Chart: Group M crab, coconut tree, mushroom. Group N sand, kite, plastic bottle' }),
        model: '(a) Living things. (b) The kite moves only because the wind pushes it. It cannot grow and cannot reproduce, so it is a non-living thing.',
        keys: [['living things', 'can reproduce', 'can grow'], ['cannot grow', 'cannot reproduce']],
        hints: ['(a) What do a crab, a coconut tree and a mushroom all do that sand cannot? (b) Moving is not on the list of characteristics of living things.',
               '(a) They grow and reproduce: they are living things. (b) The kite cannot grow or reproduce, so it stays in the non-living group.'],
        explain: 'All of Group M grow and reproduce, so "living things" (or "things that can reproduce") fits. Moving is not a characteristic of living things: plants are living but stay in one place, and a kite moves only when the wind pushes it.' },

      // ---- animal groups from pictures and tables (archetype 11) ----
      { id: 'x17-liv-14', type: 'mcq', level: 1,
        stem: 'Kai drew four small animals he found in an HDB garden. Which animal is an insect?',
        figure: xBugs([{ L: 'P', sp: XB_SPIDER }, { L: 'Q', sp: XB_CENTI }, { L: 'R', worm: true }, { L: 'S', sp: XB_ANT }],
          'P: 2 body parts, 8 legs, no feelers. Q: many body parts, many legs, feelers. R: no legs. S: 3 body parts, 6 legs, 2 feelers, no wings'),
        options: ['P', 'Q', 'R', 'S'],
        answer: 3,
        hints: ['An insect has 3 body parts, 6 legs and 1 pair of feelers. Count the legs on each animal.',
               'P has 8 legs (a spider). Q has many legs (a centipede). R has no legs (an earthworm). S has 3 body parts, 6 legs and 2 feelers: S is the insect, even with no wings.'],
        explain: 'S has 3 body parts, 6 legs and 1 pair of feelers, so it is an insect (an ant). It has no wings, but not all insects have wings. P has 8 legs and 2 body parts (a spider), Q has too many legs (a centipede) and R has no legs at all (an earthworm).' },
      { id: 'x17-liv-15', type: 'mcq', level: 2,
        stem: 'Riddle: "I have 3 body parts and 6 legs. I have 1 pair of feelers and 2 pairs of wings." Which animal in the drawing am I?',
        figure: xBugs([{ L: 'P', sp: XB_INSECT(2) }, { L: 'Q', sp: XB_SPIDER }, { L: 'R', sp: XB_INSECT(4) }, { L: 'S', sp: XB_ANT }],
          'P: insect with 2 wings. Q: 8 legs, no feelers. R: insect with 4 wings. S: insect with no wings'),
        options: ['P', 'Q', 'R', 'S'],
        answer: 2,
        hints: ['2 pairs of wings means 4 wings. Count the wings on each animal.',
               'P has 2 wings, R has 4 wings and S has none. Q has 8 legs and no feelers. Only R matches every clue.'],
        explain: 'R has 3 body parts, 6 legs, 2 feelers and 4 wings (2 pairs). P is also an insect, but it has only 2 wings (1 pair). S has no wings. Q has 8 legs and no feelers, so it is not an insect at all.' },
      { id: 'x17-liv-16', type: 'mcq', level: 2,
        stem: 'The table shows some information about animals P, Q, R and S. Which of them are insects?',
        figure: table(['Animal', 'Body parts', 'Legs', 'Feelers', 'Wings'],
          [['P', '2', '8', '0', '0'], ['Q', '3', '6', '2', '0'], ['R', '3', '6', '2', '4'], ['S', 'many', 'about 30', '2', '0']]),
        options: ['Q and R', 'R only', 'P and Q', 'Q, R and S'],
        answer: 0,
        hints: ['Look for 3 body parts AND 6 legs AND 2 feelers. Do not use wings to decide.',
               'Q and R both have 3 body parts, 6 legs and 2 feelers. Q has no wings, but it is still an insect.'],
        explain: 'Q and R both have 3 body parts, 6 legs and 1 pair of feelers, so they are insects. "R only" is the wings trap: some insects, like ants, have no wings. P has 8 legs (a spider) and S has many legs (a centipede); having feelers alone does not make S an insect.' },
      { id: 'x17-liv-17', type: 'oeq', level: 3, marks: 2,
        stem: 'Jun found animal X under a flower pot and drew it. He said, "X is not an insect, because it has no wings." Do you agree? Explain using the drawing.',
        figure: xBugs([{ L: 'X', sp: XB_ANT }], 'Animal X: 3 body parts, 6 legs, 2 feelers, no wings'),
        model: 'No, I do not agree. X has 3 body parts, 6 legs and 1 pair of feelers, so it is an insect. Not all insects have wings; for example, a worker ant has no wings.',
        keys: [['do not agree', 'disagree', 'is an insect'], ['6 legs', 'six legs', '3 body parts', 'three body parts', 'feelers'], ['not all insects have wings', 'some insects have no wings', 'ant has no wings']],
        hints: ['Count X\'s body parts, legs and feelers. Do all insects have wings?',
               'X has 3 body parts, 6 legs and 2 feelers, which are what make an insect. Wings do not decide it: worker ants have no wings.'],
        explain: 'Claim: X is an insect. Evidence from the drawing: 3 body parts, 6 legs, 1 pair of feelers. Reasoning: those are the characteristics of insects, and wings are not, because some insects have none. Markers want the counts taken from X, not a general list.' },
      { id: 'x17-liv-18', type: 'mcq', level: 2,
        stem: 'Faizal filled in this table about four animals. Which row has a mistake?',
        figure: table(['Row', 'Animal', 'Body covering', 'Group'],
          [['1', 'sparrow', 'feathers', 'bird'], ['2', 'toad', 'moist skin', 'amphibian'], ['3', 'house gecko', 'dry scaly skin', 'amphibian'], ['4', 'goldfish', 'scales', 'fish']]),
        options: ['Row 1', 'Row 2', 'Row 3', 'Row 4'],
        answer: 2,
        hints: ['Match each body covering to its group. Which group has dry scaly skin?',
               'Dry scaly skin belongs to reptiles. A house gecko (cicak) is a reptile, not an amphibian, so Row 3 is wrong.'],
        explain: 'A house gecko has dry scaly skin and lays its eggs on land, so it is a reptile, like a lizard. Amphibians, such as the toad in Row 2, have moist skin. The sparrow (feathers, bird) and goldfish (scales, fish) are correct.' },
      { id: 'x17-liv-19', type: 'oeq', level: 2, marks: 2,
        stem: 'A crocodile and a frog both spend time in water and on land.\n(a) State one way in which they are similar. (1 mark)\n(b) State one way in which they are different. (1 mark)',
        figure: null,
        model: '(a) Both lay eggs. (Adults of both breathe through lungs.) (b) A crocodile has dry scaly skin, but a frog has moist skin. (A crocodile lays its eggs on land, but a frog lays its eggs in water.)',
        keys: [['lay eggs', 'lungs'], ['dry scaly skin', 'moist skin', 'eggs on land', 'eggs in water']],
        hints: ['A crocodile is a reptile and a frog is an amphibian. Think about how they reproduce and what their skin is like.',
               'Similar: both lay eggs. Different: the crocodile has dry scaly skin, the frog has moist skin.'],
        explain: 'Reptiles and amphibians both lay eggs, and the adults breathe through lungs. They differ in skin (dry scaly vs moist) and in where they lay eggs (on land vs in water). "Both live in water and on land" is in the question, so it earns no mark.' },

      // ---- mould and bacteria set-ups (archetype 12) ----
      { id: 'x17-liv-20', type: 'mcq', level: 1,
        stem: 'Shanti sealed three slices of the same bread in plastic bags, P, Q and R, as shown. She sprinkled water on Q and R only. Which slice is most likely to have the most mould after 5 days?',
        figure: xBags([
          { L: 'P', place: 'cupboard', lines: ['dry'] },
          { L: 'Q', place: 'cupboard', damp: true, lines: ['damp'] },
          { L: 'R', place: 'fridge', damp: true, lines: ['damp'] }],
          'Three sealed bags of bread: P dry in a cupboard, Q damp in a cupboard, R damp in a fridge'),
        options: ['P', 'Q', 'R', 'All three will have the same amount.'],
        answer: 1,
        hints: ['Mould grows best where it is warm AND damp. Which bag has both?',
               'P is warm but dry. R is damp but cold (fridge). Q is damp and warm (cupboard), so it will grow the most mould.'],
        explain: 'Mould needs water and warmth to grow well. Q is damp and in a warm cupboard. P is warm but dry, so little mould grows. R is damp but in the cold fridge, where mould grows slowly.' },
      { id: 'x17-liv-21', type: 'mcq', level: 3,
        stem: 'Mrs Goh wants to find out if mould needs water to grow. She set up four sealed bags of bread, as shown. Which two set-ups should she compare?',
        figure: XF_BAGS_PLAN,
        options: ['A and D', 'A and B', 'A and C', 'B and C'],
        answer: 3,
        hints: ['A fair comparison changes ONLY the water. Find two bags that are the same in every other way: same place and same type of bread.',
               'B and C are both white bread in the fridge. The only difference is that B is dry and C is damp. A and D also differ in the type of bread.'],
        explain: 'B and C are both white bread kept in the fridge; only the water is different, so it is a fair test. A and D also differ in the type of bread (white vs wholemeal). A and B also differ in the place (cupboard vs fridge). A and C are both damp, so they test temperature, not water.' },
      { id: 'x17-liv-22', type: 'oeq', level: 3, marks: 2,
        stem: 'Kelvin sprinkled the same amount of water on two identical slices of bread and sealed each in a plastic bag. He kept bag P on the kitchen counter and bag Q in the fridge. After 5 days, he counted the mould spots. Explain why bag Q had fewer mould spots than bag P.',
        figure: xBars({ yTitle: 'Number of mould spots', labels: ['P\n(kitchen counter)', 'Q\n(fridge)'], values: [20, 4], max: 20, step: 4, xTitle: 'Bag', label: 'Bar graph: bag P 20 mould spots, bag Q 4 mould spots' }),
        model: 'Bag Q had only 4 mould spots, while bag P had 20. The fridge is cold, and mould grows more slowly in cold places than in warm places, so fewer mould spots grew on the bread in bag Q.',
        keys: [['cold', 'fridge is cold'], ['grows more slowly', 'slowly', 'slower']],
        hints: ['Both slices were damp. What was different about the place where bag Q was kept?',
               'The fridge is cold. Mould grows more slowly in the cold, so Q had 4 spots and P had 20.'],
        explain: 'Claim: the cold slowed the mould down. Evidence: 4 spots in the fridge against 20 on the counter. Reasoning: mould grows more slowly in cold places. Note that the fridge did not stop the mould: Q still grew 4 spots.' },
      { id: 'x17-liv-23', type: 'mcq', level: 2,
        stem: 'Priya kept two damp slices of the same bread in sealed bags on the same shelf. Bag J was in the open, in a room where the lights were on all day. Bag K was inside a black box next to it. The graph shows her results after 5 days. What can she conclude?',
        figure: xBars({ yTitle: 'Number of mould spots', labels: ['J\n(in the light)', 'K\n(in the dark)'], values: [12, 14], max: 16, step: 2, xTitle: 'Bag', label: 'Bar graph: bag J in the light 12 mould spots, bag K in the dark 14 mould spots' }),
        options: ['Mould needs light to grow.', 'Mould grows only in the dark.', 'Mould makes its own food using light.', 'Mould does not need light to grow.'],
        answer: 3,
        hints: ['Bag K got no light at all. Did mould still grow on it?',
               'K, in the dark, grew 14 spots, about the same as J in the light (12). So mould does not need light.'],
        explain: 'Bag K was in the dark and still grew 14 mould spots, about the same as bag J in the light, so light is not needed. "Only in the dark" is wrong because J grew mould in the light. Mould is a fungus: it cannot make its own food and takes in food from the bread.' },
      { id: 'x17-liv-24', type: 'mcq', level: 2,
        stem: 'Amir poured the same amount of fresh milk into three identical covered cups. At the start, the milk in each cup had 1 unit of bacteria. He kept the cups in three different places for one day. The kitchen was the warmest place and the fridge was the coldest. Which statement is correct?',
        figure: xBars({ yTitle: 'Amount of bacteria (units)', labels: ['fridge', 'air-con\nroom', 'kitchen'], values: [4, 8, 20], max: 20, step: 4, xTitle: 'Where the cup was kept', label: 'Bar graph: fridge 4 units, air-con room 8 units, kitchen 20 units of bacteria' }),
        options: ['Bacteria increase faster in warmer places.', 'Bacteria do not increase in the fridge.', 'Bacteria need light to increase.', 'The milk in the kitchen had no bacteria at the start.'],
        answer: 0,
        hints: ['All three cups started with 1 unit. Which cup had the most after a day, and how warm was its place?',
               'The warmer the place, the more bacteria: fridge 4, air-con room 8, kitchen 20. Even the fridge cup went from 1 to 4.'],
        explain: 'The warmer the place, the more the bacteria increased (4, then 8, then 20 units). The fridge cup still went from 1 to 4 units, so bacteria do increase in the cold, only more slowly. Light was not tested (the cups were covered), and every cup started with 1 unit.' },
      { id: 'x17-liv-25', type: 'oeq', level: 2, marks: 2,
        stem: 'Mei found fuzzy green and white patches on a slice of bread that had been left out for a week. Her brother Ravi said, "The patches are bacteria." Do you agree? Explain.',
        figure: xSvg(220, 190, 'A slice of bread with fuzzy green and white patches', 300) + xSlice(110, 90, 2.0, { mould: 6, fuzzy: true }) +
          '<text x="110" y="180" text-anchor="middle" font-size="14">Mei\'s bread after a week</text></svg>',
        model: 'No, I do not agree. The fuzzy patches are mould, which is a fungus. Bacteria are too tiny to be seen without a microscope, but these mould patches can be seen with our eyes.',
        keys: [['mould', 'fungus', 'fungi'], ['microscope', 'too tiny', 'too small to see']],
        hints: ['Could you see bacteria on bread with your eyes alone?',
               'Bacteria can only be seen with a microscope. Fuzzy patches you can see are mould, a fungus.'],
        explain: 'Claim: the patches are mould (a fungus), not bacteria. Evidence: Mei could see them with her eyes. Reasoning: bacteria are too tiny to see without a microscope. Mould is a fungus that grows on food and reproduces by spores.' },
      { id: 'x17-liv-26', type: 'mcq', level: 3,
        stem: 'Daniel kept a pair of leather shoes in each of two identical cupboards in the same room. A moisture absorber takes in water from the air around it. Which statement best explains his results?',
        figure: table(['Cupboard', 'Moisture absorber inside?', 'Leather shoes after 3 weeks'],
          [['A', 'no', 'white fuzzy patches'], ['B', 'yes', 'no change']]),
        options: ['The absorber made cupboard B colder, so no mould grew.', 'The absorber kept the air in B dry, and mould needs moisture to grow.', 'Cupboard A was darker, and mould needs darkness to grow.', 'The shoes in A made their own food, so mould grew on them.'],
        answer: 1,
        hints: ['The only difference between the cupboards is the absorber. What does an absorber take away?',
               'The absorber takes water from the air, so cupboard B stayed dry. Mould needs moisture, so none grew on the shoes in B.'],
        explain: 'Only the absorber was different. It took in water from the air, so cupboard B stayed dry, and mould needs moisture to grow. Both cupboards were in the same room, so the temperature and light were the same. Shoes cannot make food; the mould took in food from the leather.' },

      // ---- which characteristic of living things (archetype 14, scenario and graph half) ----
      { id: 'x17-liv-27', type: 'mcq', level: 2,
        stem: 'Duckweed is a tiny plant that floats on water. Hana counted the duckweed plants in a tank in her school garden once a week. Which characteristic of living things does her graph show?',
        figure: xLine({ yTitle: 'Number of duckweed plants', labels: ['0', '1', '2', '3', '4'], values: [10, 20, 40, 60, 80], max: 80, step: 10, xTitle: 'Week', label: 'Line graph: number of duckweed plants 10, 20, 40, 60, 80 in weeks 0 to 4' }),
        options: ['Living things grow.', 'Living things reproduce.', 'Living things respond to changes.', 'Living things need air.'],
        answer: 1,
        hints: ['Read the label on the side of the graph. Is it the SIZE of a plant, or the NUMBER of plants?',
               'The number of plants went up from 10 to 80. New duckweed plants were made, so the graph shows reproduction.'],
        explain: 'The graph shows the NUMBER of duckweed plants rising from 10 to 80, so new plants of the same kind were being made: the duckweed reproduces. A graph of the size or height of one plant would show growth. Nothing in the graph shows a response or a need for air.' },
      { id: 'x17-liv-28', type: 'mcq', level: 1,
        stem: 'Wei weighed his kitten, Mochi, once a month. Which characteristic of living things does his graph show?',
        figure: xLine({ yTitle: "Mochi's mass (g)", labels: ['0', '1', '2', '3', '4'], values: [500, 1000, 1500, 2000, 2500], max: 2500, step: 500, xTitle: 'Month', label: 'Line graph: kitten mass 500 g, 1000 g, 1500 g, 2000 g, 2500 g in months 0 to 4' }),
        options: ['Living things reproduce.', 'Living things need water.', 'Living things grow.', 'Living things respond to changes.'],
        answer: 2,
        hints: ['The graph shows ONE kitten getting heavier. What is that called?',
               'Mochi\'s mass went from 500 g to 2500 g. Getting bigger and heavier is growing.'],
        explain: 'One kitten became heavier every month (500 g to 2500 g), so the graph shows that living things grow. Reproduction would be more kittens being born. The graph says nothing about water or changes around Mochi.' },
      { id: 'x17-liv-29', type: 'mcq', level: 3,
        stem: 'Thing T can move, needs air and gets bigger over time. Which ONE more observation would show that T is a living thing?',
        figure: null,
        options: ['T gives out heat and light.', 'T moves faster when the wind blows.', 'T gets bigger when more fuel is added.', 'T makes young ones of its own kind.'],
        answer: 3,
        hints: ['A fire can move, needs air and gets bigger. Which option could NOT be true of a fire?',
               'A fire gives out heat and light, spreads in the wind and gets bigger with fuel, but it cannot make young ones of its own kind. Only living things reproduce.'],
        explain: 'Every clue in the question, and three of the options, also fit a fire, which is non-living. Only reproducing (making young ones of its own kind) belongs to living things alone.' },
      { id: 'x17-liv-30', type: 'oeq', level: 3, marks: 2,
        stem: 'Wei kept a pet hamster and wrote down four observations, shown in the table.\n(a) Which observation shows that the hamster can reproduce? (1 mark)\n(b) Which characteristic of living things does observation 4 show? Explain. (1 mark)',
        figure: table(['Observation', 'What Wei saw'],
          [['1', 'Its mass went from 40&nbsp;g to 90&nbsp;g in two months.'], ['2', 'It drank water from its bottle every day.'], ['3', 'It gave birth to five babies.'], ['4', 'It ran into its tunnel when the dog barked.']]),
        model: '(a) Observation 3: the hamster gave birth to five babies, which are young of its own kind. (b) Living things respond to changes: the hamster ran into its tunnel when it heard the dog bark.',
        keys: [['observation 3'], ['respond']],
        hints: ['(a) Reproduce means making young ones. (b) What changed around the hamster just before it ran?',
               '(a) Observation 3 (five babies). (b) The dog barked (a change around it), and the hamster ran away: it responds to changes.'],
        explain: 'Observation 1 shows growth, 2 shows a need for water, 3 shows reproduction and 4 shows a response to a change (the bark). In (b), name the characteristic and tie it to the bark: a bare "responds" earns less than "it ran into its tunnel when the dog barked".' }
    ]
  });
})();
