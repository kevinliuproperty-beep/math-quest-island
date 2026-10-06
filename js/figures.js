"use strict";
/* Math Quest Island — the figure renderer.
 *
 * ONE renderer for every diagram in the game. Generators emit PURE DATA
 * (`q.figure = { type: 'bar' | 'line' | 'pie' | 'rect' | 'lshape' |
 * 'fractionBar' | 'table' | 'geom' | 'clocks', ...fields }`) and never a byte of
 * markup; this file turns a spec into the SVG/HTML the web app paints. A native renderer (SwiftUI,
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
 *   - RESPONSIVE, NOT WIDTH-CONDITIONAL (Phone Width Lane, 2026-09-07). Every
 *     drawing is ONE drawing at every screen width: a viewBox that scales, never a
 *     second layout below some breakpoint. `bar` was redrawn as an svg for exactly
 *     this reason (its HTML box model had a hard 450 px width and spilled off a
 *     390 px phone, taking the tallest bar's printed value with it); `table` is the
 *     one figure that scrolls instead of scaling, because shrinking a table of
 *     numbers stops a child reading it, and that scroll now carries a visible
 *     edge shadow. Drawings are centred in their own card.
 *
 * Load order: AFTER js/core.js (core.js assigns `window.MQI` wholesale), before
 * js/app.js. In the harness: core.js, then js/figures.js, then js/topics/*.js.
 */
(function (root) {

  /* ---------------- bar: horizontal bar graph (p3bargraph) ----------------
   * { type:'bar', title, cats:[String], units:[Number], scale, maxUnit, unitLabel }
   * Bar i is `units[i]` units long and prints `units[i] * scale`; the value axis
   * carries one tick per unit from 0 to maxUnit, labelled `k * scale`. */
  const BAR_ROW = 24, BAR_BARH = 15;        /* px: row pitch, bar thickness - FIXED, never scaled */
  const BAR_GUT = 30;                       /* px: right gutter - room for the last tick number and the longest value */
  /* px: the plot's floor and its natural (desktop) width. The floor is 140 and not 150
     because at 320 px a 150 px floor put a five-bar graph 2 px over its card and made
     the whole thing scroll for the sake of those 2 px - reintroducing, behind a cue,
     exactly the "the tallest bar's value is off the glass" defect this figure was
     redrawn for. 140 px of plot leaves ~12 px of slack at 320 with ordinary category
     names; longer ones still scroll, which is the sanctioned last resort. */
  const BAR_PLOT_MIN = 140, BAR_PLOT_NAT = 240;
  const BAR_CATPAD = 8;                     /* px: gap between the category column and the plot */
  const BAR_AXISH = 22;                     /* px: the axis strip under the last row */

  /* PHONE-WIDTH FIX, SECOND PASS (Phone Width Refutation K4, 2026-09-07).
     ---------------------------------------------------------------------------
     History, because both previous shapes were wrong in instructive ways:

     (1) Until 2026-09-07 the bar was an absolutely-positioned HTML box model with a
         HARD 450 px intrinsic width (12 + 156 + 240 + 30 + 12). `max-width:100%`
         cannot shrink a block whose children are placed in px - it spills - so at a
         390 px viewport the card ran from x = -30 to x = 420, the page gained a
         sideways scroll, and 100% of bar graphs lost the tallest bar's printed value
         off the right edge.
     (2) The first phone-width pass redrew it as ONE viewBox-scaled svg. That fixed
         the width and broke the READING: a viewBox scales EVERYTHING, text included,
         so the 13 px category names and 11 px tick numbers came out at 7.13 px (360),
         7.51 (375), 7.90 (390) - the smallest text in the app, under Apple's 11 pt
         floor, on numbers a child must read to answer 52.5% of bar items. A drawing
         whose labels shrink below reading size has lost the value just as surely as
         one that pushes it off the screen.

     (3) THE RULE NOW: the picture scales, the words never do.

         The bar is an HTML/CSS box model again - but placed in PERCENTAGES of the
         plot instead of pixels, so it is fully responsive - and every label is real
         HTML text at a fixed size: category 13 px, value 13 px, tick number 11 px, at
         EVERY viewport width. What absorbs a narrow screen is the PLOT: the plot
         column is `minmax(150px, 240px)`, so it gives up bar length (and the category
         column wraps its names) before anything gives up legibility. Only if even the
         150 px floor plus the category column's own min-content width will not fit
         does the card scroll horizontally IN PLACE, in the same visibly-cued
         `.fig-scroll` box the table uses - never the page.

     Geometry (js/topics/README.md carries the same numbers; a native MQFigures
     reproduces them, and percentages port to SwiftUI unchanged):
       two grid columns: [category: min-content..max-content, 8 px right pad]
                         [plot cell: 150..240 px of plot + a 30 px right gutter]
       row i is 24 px tall (taller if its category name wraps); the bar is 15 px
         thick, vertically centred, and runs from the plot's left edge to
         `units[i] / maxUnit * 100%` of the plot, right corners rounded r = 2
       gridline k sits at `k / maxUnit * 100%` of the plot, full height of the rows;
         k = 0 is #64748b, the rest #e2e8f0
       the axis rule is a 2 px #475569 border across the whole plot cell (plot +
         gutter); each tick drops 5 px from it at its own gridline
       the value label starts 6 px past its bar's right edge, on the bar's own centre
         line; the tick number is centred on its own gridline, 11 px
     Title and caption stay prose OUTSIDE the drawing so they wrap at reading size. */

  /* VERTICAL FIT (Phone Width Refutation wound 3, 2026-09-07).
     -------------------------------------------------------------------------------
     iOS Safari's visible area on a 390 x 844 iPhone is ~664 px with the URL bar
     showing, and that is the state the phone is in for the first scroll of every
     session. At 390 x 664 the pie drew 25 px ABOVE its card and 97 px BELOW it,
     painting over both HP numbers and 55 px into the answer buttons; `line` was
     34.3 px past its card and `lshape` 41.5 px. Nothing in the app measured height.

     The rule now, and `npm run test:layout` gates it at 390x664, 375x548, 360x640,
     320x568 and the tall viewports: a figure NEVER paints over the fighters or the
     answer buttons. Three halves, in order of preference:
       1. A SCALING drawing shrinks. `pie` and `line` carry `data-fit="1"`, which
          declares "my picture may be scaled down to fit the height available; my
          words may not". `width` and `height` are `auto` so the browser's
          replaced-element sizing keeps the aspect ratio exactly, and syncFigures()
          in js/app.js hands the element the height that is left once the card's own
          prose (title, legend, caption, padding) has been measured - measured, not
          guessed, because a guessed constant made a 1024 px desktop shrink a pie that
          had room to spare.
       2. Otherwise the drawing SCROLLS inside the card (#qextra), with the "⌄ more"
          cue - the vertical twin of the table's rule. A five-row bar graph on a
          375 x 548 SE has nowhere else to go.
       3. It never paints over the play surface, and the page never scrolls.
     A native MQFigures reads rule 1 as: fit the plot into (available card height -
     the card's own text), aspect preserved, floor 72 px. */
  const FIG_FIT = 'width:auto;height:auto;max-width:100%';

  /* The ONE scroll allowance in the figure contract, shared by `table` and by `bar`
     when even the plot's 150 px floor will not fit. Three parts:
       - `.fig-scroll` is the box that scrolls, and the only class in the app allowed
         to scroll sideways (tools/layout-gate.mjs whitelists exactly this class);
       - the four-layer scroll shadow (two white covers attached `local`, two grey
         edge shadows attached `scroll`) shades an edge only when there is more
         content off it and draws NOTHING when the content fits, so a desktop figure
         is pixel-unchanged;
       - `.fig-more` is the cue a CHILD can see: a white fade and a chevron drawn
         OUTSIDE the scroller, as a later sibling inside `.fig-frame`, so the table's
         own opaque header row cannot paint over it (Phone Width Refutation wound 2 -
         the shadow was previously drawn on the value row only). The shell toggles
         `[data-more]` on the frame from `scrollWidth > clientWidth`; see FIGURE_CSS
         at the foot of this file for the two rules, which live in index.html because
         a cue that must appear only when there IS more cannot be an inline value. */
  function scrollBox(cls, inner) {
    return '<div class="fig-frame" style="position:relative;max-width:100%">' +
      '<div class="fig-scroll ' + cls + '" style="max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;' +
      'background:linear-gradient(to right,#fff 60%,rgba(255,255,255,0)) left/34px 100% no-repeat local,' +
      'linear-gradient(to left,#fff 60%,rgba(255,255,255,0)) right/34px 100% no-repeat local,' +
      'radial-gradient(farthest-side at 0 50%,rgba(15,23,42,.28),rgba(15,23,42,0)) left/12px 100% no-repeat scroll,' +
      'radial-gradient(farthest-side at 100% 50%,rgba(15,23,42,.28),rgba(15,23,42,0)) right/12px 100% no-repeat scroll">' +
      inner + '</div><div class="fig-more" aria-hidden="true">›</div></div>';
  }

  function bar(f) {
    const cats = f.cats, units = f.units, scale = f.scale;
    const maxU = f.maxUnit, n = cats.length;
    const pct = k => (k / maxU * 100).toFixed(3) + '%';
    /* every layer measures against the PLOT, which is the cell minus its right gutter */
    const PLOT = 'position:absolute;left:0;right:' + BAR_GUT + 'px;top:0;bottom:0';

    /* the gridlines are ONE layer spanning every bar row, emitted first so bars and
       value labels paint over them */
    let s = '<div class="bg-lines" style="grid-column:2;grid-row:1/span ' + n +
      ';position:relative"><div style="' + PLOT + '">';
    for (let k = 0; k <= maxU; k++) {
      s += '<div style="position:absolute;left:' + pct(k) + ';top:0;bottom:0;width:1px;background:' +
        (k === 0 ? '#64748b' : '#e2e8f0') + (k === maxU ? ';margin-left:-1px' : '') + '"></div>';
    }
    s += '</div></div>';

    for (let i = 0; i < n; i++) {
      s += '<div class="bg-cat" style="grid-column:1;grid-row:' + (i + 1) +
        ';align-self:center;text-align:right;padding-right:' + BAR_CATPAD +
        'px;font-size:13px;color:#0f172a;overflow-wrap:break-word">' + cats[i] + '</div>' +
        '<div style="grid-column:2;grid-row:' + (i + 1) + ';position:relative;min-height:' +
        BAR_ROW + 'px"><div style="' + PLOT + '">' +
        '<div class="bg-bar" style="position:absolute;left:0;top:50%;transform:translateY(-50%);height:' +
        BAR_BARH + 'px;width:' + pct(units[i]) + ';background:#4c8bf5;border-radius:0 2px 2px 0"></div>' +
        '<span class="bg-val" style="position:absolute;left:' + pct(units[i]) +
        ';top:50%;transform:translateY(-50%);margin-left:6px;font-size:13px;font-weight:600;' +
        'color:#0f172a;white-space:nowrap">' + (units[i] * scale) + '</span></div></div>';
    }

    s += '<div class="bg-axis" style="grid-column:2;grid-row:' + (n + 1) + ';position:relative;height:' +
      BAR_AXISH + 'px;border-top:2px solid #475569"><div style="' + PLOT + '">';
    for (let k = 0; k <= maxU; k++) {
      s += '<div style="position:absolute;left:' + pct(k) + ';top:0;height:5px;width:1px;background:#475569' +
        (k === maxU ? ';margin-left:-1px' : '') + '"></div>' +
        '<span class="bg-tick" style="position:absolute;left:' + pct(k) +
        ';top:6px;transform:translateX(-50%);font-size:11px;color:#475569;white-space:nowrap">' +
        (k * scale) + '</span>';
    }
    s += '</div></div>';

    return '<div class="bargraph" style="text-align:left;font-size:13px;line-height:1.3;' +
      /* the card's own side padding tightens on a phone, exactly as the table's cell
         padding does, and is exactly the old 12 px at any viewport >= 400 px */
      'color:#0f172a;background:#fff;padding:10px clamp(6px,3vw,12px) 6px;border-radius:8px;display:inline-block;' +
      'max-width:100%">' +
      '<div style="font-weight:600;margin-bottom:8px">' + f.title + '</div>' +
      scrollBox('bg-scroll', '<div class="bg-grid" style="display:grid;grid-template-columns:' +
        'minmax(min-content,max-content) minmax(' + (BAR_PLOT_MIN + BAR_GUT) + 'px,' +
        (BAR_PLOT_NAT + BAR_GUT) + 'px)">' + s + '</div>') +
      '<div style="margin-top:2px;font-size:.85em;color:#475569">Each unit along the bottom of the graph stands for ' +
      f.scale + ' ' + f.unitLabel + '.</div></div>';
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
    const w = +(L * s).toFixed(1);   /* the height is L:B of it, drawn by aspect-ratio below */
    /* PHONE WIDTH, 320 px (Phone Width Refutation - 320 is one of the gate's viewports
       now). The widest box is 240 px and the label gutter is another 64, which is
       304 px: inside a 390 px card, as the README says, and OUTSIDE a 320 px one
       (268 px), where it made #qextra scroll sideways. `max-width:100%` plus
       `aspect-ratio` is the isotropic answer - the box shrinks to the card and the
       drawn aspect stays exactly length : breadth, which is the whole rect contract.
       `width` is still the natural px size, so nothing moves where there is room. */
    return '<div style="display:inline-block;max-width:100%;padding:0 56px 0 8px">' +
      '<div class="rectBox" style="width:' + w + 'px;max-width:100%;aspect-ratio:' + L + '/' + B +
      ';box-sizing:border-box;' +
      'border:3px solid #6ee7f9;border-radius:6px;background:rgba(110,231,249,.12);' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto;position:relative;' +
      'font-size:13px;color:#9ef0ff;font-weight:700">' +
      '<span class="rectLabelB" style="position:absolute;right:-4px;top:50%;' +
      'transform:translate(100%,-50%);padding-left:6px">' + B + ' ' + unit + '</span></div>' +
      '<div class="rectLabelL" style="width:' + w + 'px;max-width:100%;text-align:center;color:#9ef0ff;' +
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
    /* PHONE-WIDTH LANE 2026-09-07: `max-width:100%` on the card and `margin:0 auto` on
       the drawing. The L is at most 176 x 154 px but its caption is one long prose
       line, so at 1024 px the card measured 612 px and the figure hugged its left
       edge, ~196 px left of centre - the worst case of the rehearsal's "figures sit
       off-centre in their cards". Desktop pixels move; the 11 px/unit scale does not. */
    return '<div class="lfig" style="display:inline-block;background:#fff;padding:16px 22px;' +
      'border-radius:8px;color:#0f172a;max-width:100%">' +
      '<div style="position:relative;width:' + w + 'px;height:' + h + 'px;margin:0 auto">' +
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
   * `hidden` is the index printed as '?' (-1 for none).
   *
   * PHONE-WIDTH FIX (Phone Width Lane, 2026-09-07). The W3 lane wrote "the card is
   * capped and scrolls in place rather than pushing the last column off the screen"
   * and gave `.dtable` `max-width:100%; overflow-x:auto` - but the cap resolved
   * against `#qextra`, which was a shrink-to-fit flex item and therefore ALREADY
   * wider than the screen, so nothing capped anything: measured at 390 px, a
   * 5-column table drew 421 px from x = -15.6 to x = 405.6 and the last column (the
   * `?` column in 20.2% of items) sat off the glass. Three parts to the fix:
   *   1. `#qextra` is now a full-width, min-width:0 block (index.html), so every
   *      figure's `max-width:100%` finally resolves against the CARD.
   *   2. Only the TABLE scrolls, not the whole card: the title and caption stay put
   *      while `.dt-scroll` takes the overflow.
   *   3. The scroll is VISIBLE - and, since Phone Width Refutation wound 2, visible
   *      WHERE A CHILD LOOKS. The four-layer scroll shadow is a background of the
   *      scroll box, so `th { background:#f1f5f9 }` painted over its top half and the
   *      cue only ever showed on the value row. `.fig-more` (see scrollBox above) is
   *      now drawn OUTSIDE the scroller as a later sibling - a full-height white fade
   *      with a chevron, over the header row as well - and the shell shows it exactly
   *      when there is more table to the right. The `?` column may still start
   *      off-screen (that is the scroll's whole point) but the child is now told.
   *   4. Cell padding is `clamp(5px, 2.4vw, 12px)` horizontally, which is exactly the
   *      old 12 px at any viewport >= 500 px (desktop untouched) and tightens to
   *      ~9 px on a phone, so most 5-column tables now fit outright and only the
   *      widest ones need the scroll at all. */
  function table(f) {
    const cats = f.cats, values = f.values, hidden = (typeof f.hidden === 'number' ? f.hidden : -1);
    const pad = 'padding:5px clamp(5px,2.4vw,12px)';
    let html = '<div class="dtable" style="display:inline-block;background:#fff;color:#0f172a;' +
      'padding:12px 14px;border-radius:8px;font-size:13px;text-align:left;max-width:100%">' +
      '<div style="font-weight:600;margin-bottom:8px">' + f.title + '</div>';
    let rows = '<table style="border-collapse:collapse"><tr>';
    for (let i = 0; i < cats.length; i++) {
      rows += '<th class="dt-cat" style="border:1px solid #94a3b8;' + pad + ';background:#f1f5f9;color:#0f172a;' +
        'font-weight:600;white-space:nowrap">' + cats[i] + '</th>';
    }
    rows += '</tr><tr>';
    for (let i = 0; i < cats.length; i++) {
      rows += '<td class="dt-val" style="border:1px solid #94a3b8;' + pad + ';text-align:center;color:#0f172a">' +
        (i === hidden ? '?' : values[i]) + '</td>';
    }
    rows += '</tr></table>';
    html += scrollBox('dt-scroll', rows) +
      '<div style="margin-top:6px;font-size:.85em;color:#475569">Number of ' +
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
      /* PHONE-WIDTH LANE 2026-09-07: `margin:0 auto`. The svg is 380 px wide inside a
         card that is as wide as its longest prose line (the caption), so a
         left-aligned drawing sat off-centre in its own card - measured 12 px at
         1024 px and up to 70 px on the pie, which is the "figures sit off-centre"
         item on the dress rehearsal's parent-visible list. Centring the drawing
         moves pixels at DESKTOP width; it changes no geometry inside the viewBox. */
      '" data-fit="1" style="display:block;margin:0 auto;font-family:inherit;' + FIG_FIT + '">';
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
      /* PHONE-WIDTH LANE 2026-09-07: `margin:0 auto` + `max-width:100%;height:auto`.
         The 230 px circle sat at the LEFT edge of a card whose width is set by the
         caption, so it drew 73 px left of the card's centre at 1024 px - the
         "pie 73 px left" line on the rehearsal's parent-visible list. Desktop pixels
         move; the sweep arithmetic does not. */
      '<svg data-fit="1" width="230" height="230" viewBox="0 0 230 230" style="display:block;margin:0 auto;' +
      FIG_FIT + ';font-family:inherit">' +
      svg + lab + '</svg>' + legend +
      '<div style="margin-top:6px;font-size:.85em;color:#475569">' + f.caption + '</div></div>';
  }

  /* ---------------- geom: lines, angles and shapes (p3angles) ----------------
   * { type:'geom', cols, rows, grid, px:[], py:[], names:[], segs:[[i,j]],
   *   arcs:[[v,a,b]], arcNames:[], panels:[] }
   *
   * Points live on an abstract grid: point i is at (px[i], py[i]) in GRID UNITS,
   * x to the right and y DOWN, inside 0..cols x 0..rows. No pixels in the spec.
   *
   *   segs      each [i, j] is a straight line drawn from point i to point j.
   *   names[i]  printed beside point i ('' = an unnamed point, no dot, no label).
   *             The label is pushed OUTSIDE the corner, away from the lines that
   *             meet there, so it never sits on a line.
   *   arcs      each [v, a, b] marks the angle at point v between the arms towards
   *             a and b with a small arc, always across the SMALLER opening, and
   *             prints arcNames[k] ('' = arc only) just outside the arc.
   *   grid      1 draws a light dot at every whole grid point (the squared-dot
   *             paper a P3 child knows), so a square corner reads as square.
   *   panels    [] = one drawing. ['A','B','C','D'] = that many SEPARATE small
   *             drawings in ONE row (2 x 2 hid C and D below the fold on a
   *             375 x 548 SE), each captioned with its letter under it;
   *             then cols x rows is the size of ONE panel and `pp[i]` names the
   *             panel point i belongs to. A segment is drawn in its points' panel.
   *
   * Strictly to scale, one px-per-unit on both axes (the `rect` rule):
   *   one drawing   s = min(24, 236 / cols, 160 / rows)
   *   panels        s = min(22, 72 / cols, 60 / rows), 12 px between panels
   * so an angle's size on the glass is exactly the angle in the spec - which is
   * the whole point, because the question is usually "is it bigger or smaller
   * than a right angle". Labels are 13-14 px TEXT inside a viewBox svg that
   * declares data-fit, so the shell may shrink the picture only down to the
   * reading floor (js/app.js syncFigures), never the words below it.
   *
   * Every coordinate the oracle needs is the drawing itself: `.gm-seg` lines,
   * `.gm-pt` + `.gm-name` pairs, `.gm-ang` groups (an arc from one arm to the
   * other, centred on its vertex), `.gm-panel` groups with a `.gm-cap` letter.
   * tools/gen-sanity.mjs re-measures every angle off these. */
  const GM_PAD = 20, GM_PGAP = 12, GM_CAPH = 20, GM_ARC = 14;

  function geom(f) {
    const panels = Array.isArray(f.panels) ? f.panels : [];
    const np = panels.length;
    const cols = f.cols, rows = f.rows;
    const s = np ? Math.min(22, 72 / cols, 60 / rows) : Math.min(24, 236 / cols, 160 / rows);
    const cw = cols * s, ch = rows * s;
    const ncol = np || 1;
    const pad = np ? 6 : GM_PAD;
    const W = pad * 2 + ncol * cw + (ncol - 1) * (np ? GM_PGAP : 0);
    const H = pad * 2 + ch + (np ? GM_CAPH : 0);
    const r1 = v => +v.toFixed(1);
    const ox = k => pad + k * (cw + GM_PGAP);
    const oy = () => pad;
    const pp = i => (np && Array.isArray(f.pp) ? f.pp[i] : 0);
    const X = i => r1(ox(pp(i)) + f.px[i] * s), Y = i => r1(oy(pp(i)) + f.py[i] * s);
    const segs = f.segs || [], arcs = f.arcs || [], names = f.names || [];
    const parts = [];
    for (let k = 0; k < Math.max(np, 1); k++) parts.push([]);

    if (!np && f.grid) {
      let dots = '';
      for (let gx = 0; gx <= cols; gx++) for (let gy = 0; gy <= rows; gy++) {
        dots += '<circle cx="' + r1(pad + gx * s) + '" cy="' + r1(pad + gy * s) + '" r="1.4" fill="#cbd5e1"/>';
      }
      parts[0].push(dots);
    }
    if (np) {
      for (let k = 0; k < np; k++) {
        parts[k].push('<rect x="' + r1(ox(k) - 4) + '" y="' + r1(oy(k) - 4) + '" width="' + r1(cw + 8) + '" height="' +
          r1(ch + GM_CAPH + 4) + '" rx="6" fill="none" stroke="#e2e8f0" stroke-width="1"/>');
      }
    }
    for (const sg of segs) {
      parts[pp(sg[0])].push('<line class="gm-seg" x1="' + X(sg[0]) + '" y1="' + Y(sg[0]) + '" x2="' + X(sg[1]) +
        '" y2="' + Y(sg[1]) + '" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/>');
    }
    /* unit vector from point i towards point j, in drawn px */
    const unit = (i, j) => { const dx = X(j) - X(i), dy = Y(j) - Y(i), d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
    for (let k = 0; k < arcs.length; k++) {
      const v = arcs[k][0], ua = unit(v, arcs[k][1]), ub = unit(v, arcs[k][2]);
      const ax = r1(X(v) + ua[0] * GM_ARC), ay = r1(Y(v) + ua[1] * GM_ARC);
      const bx = r1(X(v) + ub[0] * GM_ARC), by = r1(Y(v) + ub[1] * GM_ARC);
      const sweep = (ua[0] * ub[1] - ua[1] * ub[0]) > 0 ? 1 : 0;   /* the short way round */
      let mx = ua[0] + ub[0], my = ua[1] + ub[1];
      const md = Math.hypot(mx, my) || 1; mx /= md; my /= md;
      const nm = (f.arcNames && f.arcNames[k]) || '';
      parts[pp(v)].push('<g class="gm-ang"><path class="gm-arc" d="M ' + ax + ' ' + ay + ' A ' + GM_ARC + ' ' + GM_ARC +
        ' 0 0 ' + sweep + ' ' + bx + ' ' + by + '" fill="none" stroke="#ea580c" stroke-width="2"/>' +
        (nm ? '<text class="gm-mark" x="' + r1(X(v) + mx * (GM_ARC + 11)) + '" y="' + r1(Y(v) + my * (GM_ARC + 11) + 5) +
          '" text-anchor="middle" font-size="14" font-weight="700" font-style="italic" fill="#c2410c">' + nm + '</text>' : '') +
        '</g>');
    }
    for (let i = 0; i < f.px.length; i++) {
      if (!names[i]) continue;
      /* push the label away from every line that meets at this point */
      let dx = 0, dy = 0;
      for (const sg of segs) {
        if (sg[0] === i) { const u = unit(i, sg[1]); dx -= u[0]; dy -= u[1]; }
        if (sg[1] === i) { const u = unit(i, sg[0]); dx -= u[0]; dy -= u[1]; }
      }
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
      parts[pp(i)].push('<circle class="gm-pt" cx="' + X(i) + '" cy="' + Y(i) + '" r="3" fill="#0f172a"/>' +
        '<text class="gm-name" x="' + r1(X(i) + dx * 12) + '" y="' + r1(Y(i) + dy * 12 + 5) +
        '" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">' + names[i] + '</text>');
    }
    let body = '';
    if (np) {
      for (let k = 0; k < np; k++) {
        body += '<g class="gm-panel">' + parts[k].join('') + '<text class="gm-cap" x="' + r1(ox(k) + cw / 2) + '" y="' +
          r1(oy(k) + ch + 15) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">' + panels[k] +
          '</text></g>';
      }
    } else body = parts[0].join('');
    return '<div class="gmfig" style="display:inline-block;background:#fff;color:#0f172a;padding:8px 10px;' +
      'border-radius:8px;font-size:13px;max-width:100%">' +
      '<svg class="geomfig" data-fit="1" width="' + r1(W) + '" height="' + r1(H) + '" viewBox="0 0 ' + r1(W) + ' ' + r1(H) +
      '" style="display:block;margin:0 auto;font-family:inherit;' + FIG_FIT + '">' + body + '</svg></div>';
  }

  /* ---------------- clocks: clock faces in a row (p3angles) ----------------
   * { type:'clocks', hours:[h], names:[] }
   * One clock face per entry of `hours` (1..12), each showing exactly h o'clock:
   * the minute hand straight up at 12, the hour hand ON the h. names[k] is printed
   * under clock k ('' = no caption). Twelve hour ticks, the four at 12, 3, 6 and 9 longer and
   * heavier. No numerals: a printed "12" sat under the minute hand, and the question
   * is always the angle between the hands, never the time. Faces are r = 30 px, in ONE row, 10 px apart: four clocks are
   * 4 x 72 + 3 x 10 = 318 px, which is a viewBox that scales to a phone card. */
  const CK_R = 30, CK_CELL = 72, CK_GAP = 10, CK_CAPH = 20;

  function clocks(f) {
    const hours = f.hours, n = hours.length, names = f.names || [];
    const W = n * CK_CELL + (n - 1) * CK_GAP, H = CK_CELL + (names.some(Boolean) ? CK_CAPH : 0);
    const r1 = v => +v.toFixed(1);
    let body = '';
    for (let k = 0; k < n; k++) {
      const cx = k * (CK_CELL + CK_GAP) + CK_CELL / 2, cy = CK_CELL / 2;
      let face = '<circle cx="' + cx + '" cy="' + cy + '" r="' + CK_R + '" fill="#fff" stroke="#0f172a" stroke-width="2"/>';
      for (let t = 0; t < 12; t++) {
        const a = t * Math.PI / 6, sx = Math.sin(a), sy = -Math.cos(a);
        const tl = t % 3 === 0 ? 8 : 4;
        face += '<line x1="' + r1(cx + sx * (CK_R - tl)) + '" y1="' + r1(cy + sy * (CK_R - tl)) + '" x2="' + r1(cx + sx * CK_R) +
          '" y2="' + r1(cy + sy * CK_R) + '" stroke="#64748b" stroke-width="' + (t % 3 === 0 ? 2.2 : 1.2) + '"/>';
      }
      const ha = (hours[k] % 12) * Math.PI / 6;
      face += '<line class="ck-min" x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + r1(cy - (CK_R - 6)) +
        '" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/>' +
        '<line class="ck-hour" x1="' + cx + '" y1="' + cy + '" x2="' + r1(cx + Math.sin(ha) * (CK_R - 13)) + '" y2="' +
        r1(cy - Math.cos(ha) * (CK_R - 13)) + '" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="2.5" fill="#0f172a"/>';
      body += '<g class="ck-face">' + face + (names[k] ? '<text class="ck-cap" x="' + cx + '" y="' + (CK_CELL + 15) +
        '" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">' + names[k] + '</text>' : '') + '</g>';
    }
    return '<div class="ckfig" style="display:inline-block;background:#fff;color:#0f172a;padding:8px 10px;' +
      'border-radius:8px;font-size:13px;max-width:100%">' +
      '<svg class="clockfig" data-fit="1" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
      '" style="display:block;margin:0 auto;font-family:inherit;' + FIG_FIT + '">' + body + '</svg></div>';
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
    '.barModel .seg.fill': 'background:linear-gradient(180deg,#6ee7f9,#3aa7ff);',
    /* The scroll cue (wound 2). It is hidden by default and shown only when the shell
       has measured more content off the right edge, which no inline value can express;
       a native renderer draws the same 30 px fade + chevron under the same condition. */
    '.fig-more': 'position:absolute; top:0; bottom:0; right:0; width:30px; display:none; align-items:center; justify-content:flex-end; padding-right:3px; pointer-events:none; font-size:17px; font-weight:800; line-height:1; color:#0f172a; background:linear-gradient(to left,#fff 34%,rgba(255,255,255,.92) 70%,rgba(255,255,255,0));',
    '.fig-frame[data-more="1"] .fig-more': 'display:flex;'
  };

  /* ---------------- the registry ---------------- */

  const RENDERERS = { bar, rect, fractionBar, lshape, table, line, pie, geom, clocks };

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
