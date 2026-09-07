"use strict";
/* Math Quest Island — the figure renderer.
 *
 * ONE renderer for every diagram in the game. Generators emit PURE DATA
 * (`q.figure = { type: 'bar' | 'line' | 'pie' | 'rect' | 'lshape' |
 * 'fractionBar' | 'table', ...fields }`) and never a byte of markup; this file
 * turns a spec into the SVG/HTML the web app paints. A native renderer (SwiftUI,
 * `MQFigures`) is written against the same spec, from the documentation in
 * js/topics/README.md alone — that is the whole point of the split.
 *
 * Rules this file lives by:
 *   - PURE. String building only. No DOM, no `document`, no browser globals, so
 *     tools/gen-sanity.mjs can load it in a bare Node vm and re-derive answers
 *     from the same rendered labels a child reads.
 *   - EVERY number the child needs is printed as on-screen TEXT. Nothing rides
 *     in a data-* attribute: the harness oracle parses what is drawn, so a
 *     figure that stops printing a value fails the gate rather than the child.
 *   - THE PICTURE MATCHES THE DOC. js/topics/README.md is the contract a SwiftUI
 *     author writes from; where this file draws something the doc does not
 *     describe, the doc is the bug and so is this file. `rect` was killed on
 *     exactly that (2026-09-07) and is now genuinely to scale.
 *   - The refuter fixes are carried HERE now, and the comments travel with them:
 *     line-graph value labels sit level with their OWN gridline; the last line
 *     label flips left of its dot; the table scrolls in place at phone width;
 *     the pie legend prints every sector's value a second time and sectors are
 *     drawn strictly proportional to their weights; rect uses one px-per-unit
 *     on both axes.
 *
 * Load order: AFTER js/core.js (core.js assigns `window.MQI` wholesale), before
 * js/app.js. In the harness: core.js, then js/figures.js, then js/topics/*.js.
 */
(function (root) {

  /* ---------------- bar: horizontal bar graph (p3bargraph) ----------------
   * { type:'bar', title, cats:[String], units:[Number], scale, maxUnit, unitLabel }
   * Bar i is `units[i]` units long and prints `units[i] * scale`; the value axis
   * carries one tick per unit from 0 to maxUnit, labelled `k * scale`. */
  const BAR_LBL = 156, BAR_PLOTW = 240;   /* px: category column, plot area */

  function bar(f) {
    const cats = f.cats, units = f.units, scale = f.scale;
    const maxU = f.maxUnit;
    const x = k => Math.round(k / maxU * BAR_PLOTW);

    /* WOUND 4 (Figure Spec Refutation, 2026-09-07): `.bargraph` was the only one of the
       seven renderers with no max-width, so at a 390 px viewport its intrinsic ~450 px
       ran past the card and 100% of bar graphs lost the tallest bar's printed value.
       `line`, `table` and `pie` all already carried max-width:100%. NOTE: this is inert
       on its own - the page itself still overflows at 390 px (avatar row, answer grid,
       card), so max-width:100% resolves against a box that is already wider than the
       screen. That page-level 390 px layout fix is ITS OWN packet and is deliberately
       not chased here. */
    let html = '<div class="bargraph" style="text-align:left;font-size:13px;line-height:1.3;' +
      'color:#0f172a;background:#fff;padding:10px 12px 6px;border-radius:8px;display:inline-block;' +
      'max-width:100%;overflow-x:auto">' +
      '<div style="font-weight:600;margin-bottom:8px">' + f.title + '</div>' +
      '<div style="position:relative;padding-left:' + BAR_LBL + 'px">' +
      '<div style="position:absolute;left:' + BAR_LBL + 'px;top:0;bottom:0;width:' + BAR_PLOTW + 'px">';
    for (let k = 0; k <= maxU; k++) {
      html += '<div style="position:absolute;left:' + x(k) + 'px;top:0;bottom:0;width:1px;background:' +
        (k === 0 ? '#64748b' : '#e2e8f0') + '"></div>';
    }
    html += '</div>';
    for (let i = 0; i < cats.length; i++) {
      html += '<div class="bg-row" style="position:relative;display:flex;align-items:center;height:20px;margin:4px 0">' +
        '<span class="bg-cat" style="position:absolute;left:-' + BAR_LBL + 'px;width:' + (BAR_LBL - 8) +
        'px;text-align:right;white-space:nowrap">' + cats[i] + '</span>' +
        '<span class="bg-bar" style="display:inline-block;height:15px;background:#4c8bf5;border-radius:0 2px 2px 0;width:' +
        x(units[i]) + 'px"></span>' +
        '<span class="bg-val" style="margin-left:6px;font-weight:600">' + (units[i] * scale) + '</span>' +
        '</div>';
    }
    html += '</div>' +
      '<div style="position:relative;height:24px;margin-left:' + BAR_LBL + 'px;width:' + (BAR_PLOTW + 30) +
      'px;border-top:2px solid #475569">';
    for (let k = 0; k <= maxU; k++) {
      html += '<span style="position:absolute;left:' + x(k) + 'px;top:0;width:1px;height:5px;background:#475569"></span>' +
        '<span class="bg-tick" style="position:absolute;left:' + x(k) +
        'px;top:7px;transform:translateX(-50%);font-size:11px;color:#475569">' + (k * scale) + '</span>';
    }
    html += '</div>' +
      '<div style="margin-top:2px;font-size:.85em;color:#475569">Each unit along the bottom of the graph stands for ' +
      f.scale + ' ' + f.unitLabel + '.</div></div>';
    return html;
  }

  /* ---------------- rect: a labelled rectangle (geometry, P3) ----------------
   * { type:'rect', length, breadth, unit }
   *
   * KILL FIX K2 (Figure Spec Refutation, 2026-09-07). The old rect was NOT to
   * scale: 20 px per unit horizontally but 16 px per unit vertically, with the
   * height floored at 34 and capped at 110 independently of the width's cap of
   * 240. 78.9% of the rect draws the generators can make carried >20% aspect
   * error and EVERY square drew as a wide box - 12x12 cm rendered 240x110 px,
   * 2.18:1, and `refute/revy-a.png` caught a 4 cm x 4 cm square drawn visibly
   * wider than tall on the live review screen. The README said "drawn to scale",
   * so a SwiftUI MQFigures written from the doc alone would draw a materially
   * different picture - the exact failure the figure-spec contract exists to
   * prevent.
   *
   * The rule now, and it is the one written in js/topics/README.md:
   *
   *     s = min(20, 240 / length, 130 / breadth)      px per unit
   *     w = length * s      h = breadth * s           (border-box)
   *
   * ONE scale on BOTH axes, so the drawn aspect always equals length : breadth
   * exactly. 20 px/unit is the natural size; 240 px and 130 px are the caps, and
   * whichever side hits its cap first pulls the other down with it, so capping
   * never distorts. `box-sizing:border-box` is load-bearing: without it the 3 px
   * border adds 6 px to each axis and a square stops measuring square.
   *
   * Sanity of the caps: 12x12 -> s = 10.83, 130x130 px, square. 40x3 -> s = 6,
   * 240x18 px, which with the wrapper's 8 + 56 px padding is 304 px and still
   * fits a 390 px phone card.
   *
   * Labels: breadth OUTSIDE the box at its right edge (the old comment here said
   * "inside the box" and was simply wrong - .rectLabelB is right:-4px with
   * translate(100%,-50%), i.e. outside; the README was the correct one, and the
   * 56 px right padding on the wrapper is the room it needs). Length is centred
   * UNDERNEATH the box, on the box's own width.
   *
   * WOUND 8: this renderer used to carry no styling at all - its geometry lived
   * in index.html's `.rectBox` / `.rectLabelB` / `.rectLabelL` rules, so
   * js/figures.js was not the "reference drawing" the contract calls it. Every
   * declaration is now inline here and those three CSS rules are gone from
   * index.html. The class names stay: they are how a reader and a refuter find
   * the parts. (fractionBar keeps its rules in index.html on purpose - see
   * FIGURE_CSS at the foot of this file, which is gated against them.) */
  const RECT_MAXW = 240, RECT_MAXH = 130, RECT_PXU = 20;   /* px caps, px per unit */

  function rect(f) {
    const L = f.length, B = f.breadth, unit = f.unit || 'cm';
    const s = Math.min(RECT_PXU, RECT_MAXW / L, RECT_MAXH / B);
    const w = +(L * s).toFixed(1), h = +(B * s).toFixed(1);
    return '<div style="display:inline-block;padding:0 56px 0 8px">' +
      '<div class="rectBox" style="width:' + w + 'px;height:' + h + 'px;box-sizing:border-box;' +
      'border:3px solid #6ee7f9;border-radius:6px;background:rgba(110,231,249,.12);' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto;position:relative;' +
      'font-size:13px;color:#9ef0ff;font-weight:700">' +
      '<span class="rectLabelB" style="position:absolute;right:-4px;top:50%;' +
      'transform:translate(100%,-50%);padding-left:6px">' + B + ' ' + unit + '</span></div>' +
      '<div class="rectLabelL" style="width:' + w + 'px;text-align:center;color:#9ef0ff;' +
      'font-weight:700;font-size:13px;margin-top:4px">' + L + ' ' + unit + '</div></div>';
  }

  /* ---------------- fractionBar: the P3 bar model ----------------
   * { type:'fractionBar', parts, filled }
   * `parts` equal segments, the first `filled` of them shaded. The oracle counts
   * `class="seg fill"` off this markup, so the class names are load-bearing.
   *
   * WOUND 8: unlike the other six this renderer emits no inline style, because a
   * segment's width is deliberately RESPONSIVE - clamp(28px, 6vw, 46px) - which
   * is a stylesheet job, not a string-building one. So its geometry stays in
   * index.html and is published here instead as FIGURE_CSS (foot of this file),
   * which tools/gen-sanity.mjs asserts verbatim against index.html. That is the
   * "documented stylesheet block": one source of truth, gated, and a Swift
   * author reads the numbers off FIGURE_CSS without opening index.html. */
  function fractionBar(f) {
    let bar = '<div class="barModel">';
    for (let i = 0; i < f.parts; i++) bar += '<div class="seg' + (i < f.filled ? ' fill' : '') + '"></div>';
    return bar + '</div>';
  }

  /* ---------------- lshape: composite figure, six sides labelled ----------------
   * { type:'lshape', W, H, a, b, unit }
   * A W x H rectangle with an a x b piece removed from the TOP-RIGHT corner.
   * Sides clockwise from the top-left: top = W - a, cut down = b, cut across = a,
   * right = H - b, bottom = W, left = H. All six are printed; the renderer
   * derives them, so a spec can never disagree with its own picture. */
  const L_S = 11;   /* px per cm */

  function lshape(f) {
    const W = f.W, H = f.H, a = f.a, b = f.b, unit = f.unit || 'cm';
    const lab = (cls, v, css) =>
      '<span class="lf-' + cls + '" style="position:absolute;font-size:12px;font-weight:600;' +
      'color:#0f172a;background:#fff;padding:0 2px;' + css + '">' + v + '</span>';

    const w = W * L_S, h = H * L_S, aw = a * L_S, bh = b * L_S;
    return '<div class="lfig" style="display:inline-block;background:#fff;padding:16px 22px;' +
      'border-radius:8px;color:#0f172a">' +
      '<div style="position:relative;width:' + w + 'px;height:' + h + 'px">' +
      /* the L drawn as two solid blocks */
      '<div style="position:absolute;left:0;top:0;width:' + (w - aw) + 'px;height:' + bh +
      'px;background:#93c5fd;border:2px solid #1d4ed8;border-right:none;border-bottom:none;box-sizing:border-box"></div>' +
      '<div style="position:absolute;left:0;top:' + bh + 'px;width:' + w + 'px;height:' + (h - bh) +
      'px;background:#93c5fd;border:2px solid #1d4ed8;border-top:none;box-sizing:border-box"></div>' +
      '<div style="position:absolute;left:0;top:' + bh + 'px;width:' + (w - aw) +
      'px;height:2px;background:#93c5fd"></div>' +
      /* the six printed side lengths */
      lab('top', W - a, 'left:' + ((w - aw) / 2) + 'px;top:-9px;transform:translateX(-50%)') +
      lab('cutdown', b, 'left:' + (w - aw) + 'px;top:' + (bh / 2) + 'px;transform:translate(-50%,-50%)') +
      lab('cutacross', a, 'left:' + (w - aw / 2) + 'px;top:' + (bh - 9) + 'px;transform:translateX(-50%)') +
      lab('right', H - b, 'left:' + w + 'px;top:' + (bh + (h - bh) / 2) + 'px;transform:translate(-50%,-50%)') +
      lab('bottom', W, 'left:' + (w / 2) + 'px;top:' + (h - 9) + 'px;transform:translateX(-50%)') +
      lab('left', H, 'left:0;top:' + (h / 2) + 'px;transform:translate(-50%,-50%)') +
      '</div>' +
      '<div style="margin-top:10px;font-size:.85em;color:#475569">All lengths are in ' + unit + '. ' +
      'Every side of the figure is labelled. The corners are all right angles.</div></div>';
  }

  /* ---------------- table: a one-row data table ----------------
   * { type:'table', title, cats, values, hidden, unitLabel }
   * `hidden` is the index printed as '?' (-1 for none). W3 cosmetic: a 5-column
   * table is wider than a 360px column, so the card is capped and scrolls in
   * place rather than pushing the last column off the screen. */
  function table(f) {
    const cats = f.cats, values = f.values, hidden = (typeof f.hidden === 'number' ? f.hidden : -1);
    let html = '<div class="dtable" style="display:inline-block;background:#fff;color:#0f172a;' +
      'padding:12px 14px;border-radius:8px;font-size:13px;text-align:left;max-width:100%;overflow-x:auto">' +
      '<div style="font-weight:600;margin-bottom:8px">' + f.title + '</div>' +
      '<table style="border-collapse:collapse"><tr>';
    for (let i = 0; i < cats.length; i++) {
      html += '<th class="dt-cat" style="border:1px solid #94a3b8;padding:5px 12px;background:#f1f5f9;color:#0f172a;' +
        'font-weight:600;white-space:nowrap">' + cats[i] + '</th>';
    }
    html += '</tr><tr>';
    for (let i = 0; i < cats.length; i++) {
      html += '<td class="dt-val" style="border:1px solid #94a3b8;padding:5px 12px;text-align:center;color:#0f172a">' +
        (i === hidden ? '?' : values[i]) + '</td>';
    }
    html += '</tr></table><div style="margin-top:6px;font-size:.85em;color:#475569">Number of ' +
      f.unitLabel + '.</div></div>';
    return html;
  }

  /* ---------------- line: a line graph ----------------
   * { type:'line', title, cats, units, step, maxUnit, unitLabel }
   * Point i sits `units[i]` units up and prints `units[i] * step`; the value axis
   * carries a tick, a gridline and a number for every unit from 0 to maxUnit. */
  const LG_PW = 300, LG_PH = 150, LG_PADL = 46, LG_PADT = 18, LG_PADB = 34;

  function line(f) {
    const cats = f.cats, units = f.units, step = f.step, n = cats.length;
    const vals = units.map(u => u * step);
    const maxU = f.maxUnit;
    const y = u => LG_PADT + LG_PH - Math.round(u / maxU * LG_PH);
    const x = i => LG_PADL + Math.round(i * LG_PW / (n - 1));
    const W = LG_PADL + LG_PW + 34, H = LG_PADT + LG_PH + LG_PADB;

    let s = '<div class="linegraph" style="display:inline-block;background:#fff;color:#0f172a;' +
      'padding:10px 12px;border-radius:8px;font-size:13px;text-align:left;max-width:100%">' +
      '<div style="font-weight:600;margin-bottom:6px">' + f.title + '</div>' +
      '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
      /* W3 cosmetic (Dress Rehearsal Wave 2, item 1), second half: at a 390px phone
         width the fixed 380px card overflowed its column and the RIGHTMOST point and
         its value label were cut off the screen entirely. The svg now scales to the
         card (max-width:100%, height:auto) and the card itself is capped, so every
         point stays inside the viewBox at any width. */
      '" style="display:block;font-family:inherit;max-width:100%;height:auto">';
    for (let k = 0; k <= maxU; k++) {
      s += '<line x1="' + LG_PADL + '" y1="' + y(k) + '" x2="' + (LG_PADL + LG_PW) + '" y2="' + y(k) +
        '" stroke="' + (k === 0 ? '#475569' : '#e2e8f0') + '" stroke-width="' + (k === 0 ? 2 : 1) + '"/>' +
        '<line x1="' + (LG_PADL - 5) + '" y1="' + y(k) + '" x2="' + LG_PADL + '" y2="' + y(k) +
        '" stroke="#475569" stroke-width="1"/>' +
        '<text class="lg-tick" x="' + (LG_PADL - 9) + '" y="' + (y(k) + 4) +
        '" text-anchor="end" font-size="11" fill="#475569">' + (k * step) + '</text>';
    }
    s += '<line x1="' + LG_PADL + '" y1="' + LG_PADT + '" x2="' + LG_PADL + '" y2="' + (LG_PADT + LG_PH) +
      '" stroke="#475569" stroke-width="2"/>';
    s += '<polyline fill="none" stroke="#4c8bf5" stroke-width="2.5" points="' +
      units.map((u, i) => x(i) + ',' + y(u)).join(' ') + '"/>';
    for (let i = 0; i < n; i++) {
      s += '<circle cx="' + x(i) + '" cy="' + y(units[i]) + '" r="4" fill="#1d4ed8"/>' +
        /* KILL FIX (P4 Area+Graphs Refutation, §5): the value label used to be drawn at
           y(units[i]) - 9, a FIXED 9px above the dot, while one tick step is PH/maxU =
           18.75px. Every label therefore floated half a step high and sat level with the
           gridline ONE STEP ABOVE the value it named - 228 of 228 graphs, and on a step-5
           graph the label was 5 units adrift of the line it lined up with. The label y is
           now the value's OWN tick position, y(units[i]), so the printed number is level
           with its own gridline. Drawn to the RIGHT of the dot (text-anchor="start") so it
           never covers the point and so point 0, which sits on the y-axis itself, clears
           the tick-number column. */
        /* W3 cosmetic (Dress Rehearsal Wave 2, item 1): the RIGHTMOST point sits on
           x = PADL + PW, so a label drawn 12px to its right ran into the last 34px of
           the viewBox and crowded the edge once the card shrank to a phone width. The
           last label is flipped to the LEFT of its dot (text-anchor="end", 8px clear).
           It still sits on its own gridline, and the nearest other label is a full
           point-gap away, so nothing overlaps. */
        '<text class="lg-val" x="' + (i === n - 1 ? x(i) - 8 : x(i) + 12) + '" y="' + (y(units[i]) + 4) +
        '" text-anchor="' + (i === n - 1 ? 'end' : 'start') + '" font-size="12" font-weight="600" fill="#0f172a">' + vals[i] + '</text>' +
        '<text class="lg-cat" x="' + x(i) + '" y="' + (LG_PADT + LG_PH + 17) +
        '" text-anchor="middle" font-size="11" fill="#475569">' + cats[i] + '</text>';
    }
    s += '</svg><div style="margin-top:2px;font-size:.85em;color:#475569">Number of ' + f.unitLabel +
      '. Each step up the side of the graph stands for ' + step + '.</div></div>';
    return s;
  }

  /* ---------------- pie: a pie chart with a legend ----------------
   * { type:'pie', title, cats, weights, labels, caption }
   * Sector i sweeps `weights[i] / sum(weights)` of the circle — strictly
   * proportional, measured off the arc endpoints by the refuter at 0 error in
   * 6,500 draws — and prints `labels[i]` (a count, a fraction like "1/4", or "?")
   * INSIDE the sector and a second time in the legend beside its category name.
   * Category names never sit on a slice, so two labels can never collide. */
  const PIE_CX = 112, PIE_CY = 112, PIE_R = 92, PIE_LR = 57;
  const PIE_FILL = ['#93c5fd', '#fdba74', '#86efac', '#f9a8d4', '#fcd34d'];
  const pieX = a => PIE_CX + PIE_R * Math.cos(a), pieY = a => PIE_CY + PIE_R * Math.sin(a);

  function pie(f) {
    const cats = f.cats, weights = f.weights, labels = f.labels;
    const S = weights.reduce((a, b) => a + b, 0);
    let a0 = -Math.PI / 2, svg = '', lab = '';
    for (let i = 0; i < cats.length; i++) {
      const sweep = weights[i] / S * Math.PI * 2, a1 = a0 + sweep;
      svg += '<path class="pie-sec" d="M ' + PIE_CX + ' ' + PIE_CY + ' L ' + pieX(a0).toFixed(1) + ' ' +
        pieY(a0).toFixed(1) + ' A ' + PIE_R + ' ' + PIE_R + ' 0 ' + (sweep > Math.PI ? 1 : 0) + ' 1 ' +
        pieX(a1).toFixed(1) + ' ' + pieY(a1).toFixed(1) + ' Z" fill="' + PIE_FILL[i % PIE_FILL.length] +
        '" stroke="#ffffff" stroke-width="2"/>';
      const am = a0 + sweep / 2;
      lab += '<text class="pie-lab" x="' + (PIE_CX + PIE_LR * Math.cos(am)).toFixed(1) + '" y="' +
        (PIE_CY + PIE_LR * Math.sin(am) + 5).toFixed(1) + '" text-anchor="middle" font-size="15" ' +
        'font-weight="700" fill="#0f172a">' + labels[i] + '</text>';
      a0 = a1;
    }
    let legend = '<div class="pie-legend" style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px">';
    for (let i = 0; i < cats.length; i++) {
      legend += '<span class="pie-key" style="display:inline-flex;align-items:center;gap:6px;font-size:13px">' +
        '<span style="width:13px;height:13px;border-radius:3px;background:' + PIE_FILL[i % PIE_FILL.length] +
        ';border:1px solid #94a3b8;display:inline-block"></span>' +
        '<span class="pie-cat" style="color:#0f172a">' + cats[i] + '</span>' +
        '<b class="pie-val" style="color:#0f172a">' + labels[i] + '</b></span>';
    }
    legend += '</div>';
    return '<div class="piechart" style="display:inline-block;background:#fff;color:#0f172a;' +
      'padding:12px 14px;border-radius:8px;font-size:13px;text-align:left;max-width:100%">' +
      '<div style="font-weight:600;margin-bottom:6px">' + f.title + '</div>' +
      '<svg width="230" height="230" viewBox="0 0 230 230" style="display:block;font-family:inherit">' +
      svg + lab + '</svg>' + legend +
      '<div style="margin-top:6px;font-size:.85em;color:#475569">' + f.caption + '</div></div>';
  }

  /* ---------------- the documented stylesheet block (WOUND 8) ----------------
   * Six of the seven renderers are self-contained: every declaration they need is
   * inline in the string they build, so this file IS the reference drawing the
   * contract claims it is. `fractionBar` is the one exception - a segment's width
   * is responsive (`6vw`), which cannot be expressed as a fixed inline value - so
   * its three rules live in index.html's stylesheet and are declared HERE, in the
   * renderer, as the contract.
   *
   * tools/gen-sanity.mjs asserts each selector/body below appears verbatim (modulo
   * whitespace) in index.html, so the two can never drift apart in silence. A
   * native renderer reads the geometry off this constant: 3 px gap, segments
   * centred, each segment 28-46 px wide (6% of viewport width) and 34 px tall,
   * 2.5 px white border, 6 px radius, unfilled at 6% white, filled with a vertical
   * #6ee7f9 -> #3aa7ff gradient. */
  const FIGURE_CSS = {
    '.barModel': 'display:flex; gap:3px; justify-content:center;',
    '.barModel .seg': 'width:clamp(28px,6vw,46px); height:34px; border:2.5px solid #fff; border-radius:6px; background:rgba(255,255,255,.06);',
    '.barModel .seg.fill': 'background:linear-gradient(180deg,#6ee7f9,#3aa7ff);'
  };

  /* ---------------- the registry ---------------- */

  const RENDERERS = { bar, rect, fractionBar, lshape, table, line, pie };

  function renderFigure(fig) {
    if (!fig) return '';
    const f = RENDERERS[fig.type];
    if (!f) throw new Error('renderFigure: unknown figure type "' + fig.type + '"');
    return f(fig);
  }

  /* core.js assigns window.MQI wholesale, so this file MUST load after it. */
  const MQI = root.MQI = root.MQI || {};
  MQI.renderFigure = renderFigure;
  MQI.figureTypes = Object.keys(RENDERERS);
  MQI.figureCss = FIGURE_CSS;

})(typeof window !== 'undefined' ? window : globalThis);
