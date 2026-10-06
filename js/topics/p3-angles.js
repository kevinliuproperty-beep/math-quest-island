"use strict";
/* Math Quest Island topic: p3angles (P3). Self-contained. All multiple choice.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope (MOE 2021 Primary Mathematics syllabus, updated Oct 2025, PRIMARY THREE,
 * MEASUREMENT AND GEOMETRY, sub-strand GEOMETRY):
 *   1. Angles                           1.1 concepts of angle
 *                                       1.2 right angles, angles greater than /
 *                                           smaller than a right angle
 *   2. Perpendicular and Parallel Lines 2.1 perpendicular and parallel lines
 *                                       2.2 drawing them - the app has no drawing
 *                                           surface, so 2.2 is tested as RECOGNITION
 *                                           ("which drawing shows ...").
 *
 * NOT here, deliberately:
 *   - degrees, protractors, measuring or drawing an angle of a given size, and the
 *     ∠ABC / ∠a notation: all P4 (js/topics/p4-angles.js). No item prints a degree
 *     sign or a ∠. A marked angle is called "angle p" in words.
 *   - acute / obtuse / reflex as WORDS: not in the P3 line, which says "greater than
 *     / smaller than a right angle". Those are the only words used.
 *   - concave shapes in any ANGLE item. The inside corner of an L-shape is greater
 *     than two right angles, and whether a P3 child should count it as "a right
 *     angle seen from outside" is exactly the second reading this file may not
 *     have. Angle items draw CONVEX shapes only; the L-shape appears in line items,
 *     where its corners are never asked about.
 *   - "perpendicular" between two sides that do NOT meet. Whether two lines that
 *     never touch on the page are perpendicular is a second reading at P3, so no
 *     item keys it, offers it as a wrong answer, or asks about it. Perpendicular
 *     is only ever asked of two lines that meet.
 *
 * THE MARGIN RULE (the one that matters most). Every angle a child is asked to
 * judge by eye is EXACTLY a right angle, or at most 60 degrees, or at least 120
 * degrees (and less than a straight line). Shapes are built on the dot grid from
 * square corners and 45-degree cuts, so a right angle sits on the grid lines and
 * every other angle is 45 or 135, or comes from a flat triangle whose corners
 * are checked against the same rule. Single angles drawn in panels are 25-55 or
 * 125-155. Nothing a child sees can be "nearly" a right angle, and the harness
 * re-measures every drawn angle off the rendered picture and fails a draw that
 * breaks the rule.
 *
 * The figures are js/figures.js `geom` (lines and shapes, optionally as four
 * captioned panels) and `clocks`. Both are documented in js/topics/README.md.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle;

  const fig = (q, figure) => (q.figure = figure, q);
  const PANEL_LETTERS = ['A', 'B', 'C', 'D'];
  const LABEL_SETS = [['A', 'B', 'C', 'D', 'E', 'F', 'G'], ['P', 'Q', 'R', 'S', 'T', 'U', 'V'],
                      ['J', 'K', 'L', 'M', 'N', 'P', 'Q'], ['R', 'S', 'T', 'U', 'V', 'W', 'X']];
  const R2 = v => Math.round(v * 1000) / 1000;
  /* A child's name opens every picture item. Not decoration: the feed's identity key
     (core.js qIdentity, frozen) reads the stem and the options but cannot see a
     figure, so a fixed stem over fixed "Angle A..D" options was ONE identity per
     ask - the session's no-duplicate guard starved the item after a single draw and
     the feed ran the topic's other banks back to back (feed-sim P3 worst run 6). */
  const NAMES = ['Wei Jie', 'Aisyah', 'Kavitha', 'Jun Hao', 'Siti', 'Priya', 'Daryl', 'Xin Yi', 'Farhan', 'Nurul',
                 'Mei Ling', 'Ravi', 'Hui Min', 'Arjun'];
  const who = () => pick(NAMES);

  /* ---------- angle arithmetic ---------- */
  function angleAt(P, v, a, b) {
    const ux = P[a][0] - P[v][0], uy = P[a][1] - P[v][1];
    const wx = P[b][0] - P[v][0], wy = P[b][1] - P[v][1];
    const c = (ux * wx + uy * wy) / (Math.hypot(ux, uy) * Math.hypot(wx, wy));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }
  const isRight = d => Math.abs(d - 90) < 0.5;
  const kindOf = d => (isRight(d) ? 'right' : (d < 90 ? 'small' : 'big'));
  const clearOf = d => isRight(d) || d <= 60.5 || (d >= 119.5 && d < 179.5);
  const PHRASE = { right: 'a right angle', small: 'smaller than a right angle', big: 'greater than a right angle' };

  /* ---------- shapes on the dot grid (integer corners, y DOWN) ---------- */
  function rectCut(w, h, cuts) {
    const C = [[0, 0], [w, 0], [w, h], [0, h]], pts = [];
    for (let k = 0; k < 4; k++) {
      const c = cuts[k], x = C[k][0], y = C[k][1];
      if (!c) { pts.push([x, y]); continue; }
      const pv = C[(k + 3) % 4], nx = C[(k + 1) % 4];
      pts.push([x + Math.sign(pv[0] - x) * c, y + Math.sign(pv[1] - y) * c]);
      pts.push([x + Math.sign(nx[0] - x) * c, y + Math.sign(nx[1] - y) * c]);
    }
    return { pts, w, h };
  }
  function cutsFit(w, h, c) {
    return c[0] + c[1] < w && c[2] + c[3] < w && c[1] + c[2] < h && c[3] + c[0] < h;
  }
  function makeRectCut(nCuts, maxW, maxH) {
    for (let g = 0; g < 200; g++) {
      const w = ri(3, maxW), h = ri(2, maxH);
      const which = shuffle([0, 1, 2, 3]).slice(0, nCuts);
      const c = [0, 0, 0, 0];
      for (const k of which) c[k] = ri(1, 2);
      if (cutsFit(w, h, c)) return rectCut(w, h, c);
    }
    return rectCut(4, 3, [nCuts > 0 ? 1 : 0, nCuts > 1 ? 1 : 0, nCuts > 2 ? 1 : 0, nCuts > 3 ? 1 : 0]);
  }
  const rightTri = a => ({ pts: [[0, 0], [a, a], [0, a]], w: a, h: a });
  const flatTri = (b, h) => ({ pts: [[b / 2, 0], [b, h], [0, h]], w: b, h });
  const para = (w, h) => ({ pts: [[h, 0], [w + h, 0], [w, h], [0, h]], w: w + h, h });
  const rTrap = (w, h) => ({ pts: [[0, 0], [w - h, 0], [w, h], [0, h]], w, h });
  const iTrap = (w, h) => ({ pts: [[h, 0], [w - h, 0], [w, h], [0, h]], w, h });
  const lShape = (W, H, a, b) => ({ pts: [[0, 0], [W - a, 0], [W - a, b], [W, b], [W, H], [0, H]], w: W, h: H });

  /* mirror left-right and/or top-bottom: angles and parallels are unchanged */
  function flip(s) {
    const fx = Math.random() < 0.5, fy = Math.random() < 0.5;
    let pts = s.pts.map(p => [fx ? s.w - p[0] : p[0], fy ? s.h - p[1] : p[1]]);
    if (fx !== fy) pts = pts.reverse();          /* keep one winding direction */
    return { pts, w: s.w, h: s.h };
  }
  const anglesOf = pts => pts.map((_, i) => angleAt(pts, i, (i + pts.length - 1) % pts.length, (i + 1) % pts.length));

  /* A CONVEX shape for the angle items, with every corner obeying the margin rule.
     `want` filters: e.g. s => s.right >= 1. */
  function convexShape(want, opts) {
    const o = opts || {};
    const maxW = o.maxW || 7, maxH = o.maxH || 5;
    for (let g = 0; g < 400; g++) {
      const t = ri(0, 7);
      let s;
      if (t <= 2) s = makeRectCut(t === 0 ? ri(0, 1) : t === 1 ? 1 : ri(2, 3), maxW, maxH);
      else if (t === 3) s = rightTri(ri(2, Math.min(4, maxH)));
      else if (t === 4) { const fb = pick([[4, 1], [6, 1], [8, 2]]); if (fb[0] > maxW) continue; s = flatTri(fb[0], fb[1]); }
      else if (t === 5) { const h = ri(1, 3), w = ri(2, maxW - h); s = para(w, h); }
      else if (t === 6) { const h = ri(1, 3), w = ri(h + 1, maxW); s = rTrap(w, h); }
      else { const h = ri(1, 2), w = ri(2 * h + 1, maxW); s = iTrap(w, h); }
      if (s.w > maxW || s.h > maxH) continue;
      s = flip(s);
      const angs = anglesOf(s.pts);
      if (!angs.every(clearOf)) continue;
      s.angles = angs;
      s.n = angs.length;
      s.right = angs.filter(d => kindOf(d) === 'right').length;
      s.small = angs.filter(d => kindOf(d) === 'small').length;
      s.big = angs.filter(d => kindOf(d) === 'big').length;
      if (!want || want(s)) return s;
    }
    return null;
  }

  /* one or more shapes drawn on one dot grid, 1 unit of margin round each */
  function gridSpec(shapes, named) {
    const px = [], py = [], names = [], segs = [];
    let x0 = 1, rows = 0;
    shapes.forEach((s, si) => {
      const base = px.length;
      s.pts.forEach((p, i) => {
        px.push(x0 + p[0]); py.push(1 + p[1]);
        names.push(named && si === 0 ? named[i] : '');
      });
      for (let i = 0; i < s.pts.length; i++) segs.push([base + i, base + (i + 1) % s.pts.length]);
      x0 += s.w + 2;
      rows = Math.max(rows, s.h + 2);
    });
    return { type: 'geom', cols: x0 - 1, rows, grid: 1, px, py, names, segs, arcs: [], arcNames: [], panels: [] };
  }

  /* ---------- panels: four small separate drawings ---------- */
  const PCOLS = 5, PROWS = 3.5;
  /* fit a point list into one panel cell, keeping its shape (uniform scale) */
  function fitPanel(pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min(1, (PCOLS - 0.9) / Math.max(x1 - x0, 0.01), (PROWS - 0.9) / Math.max(y1 - y0, 0.01));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return pts.map(p => [R2(PCOLS / 2 + (p[0] - cx) * k), R2(PROWS / 2 + (p[1] - cy) * k)]);
  }
  const dirPt = (deg, len) => [len * Math.cos(deg * Math.PI / 180), -len * Math.sin(deg * Math.PI / 180)];

  /* one angle: vertex + two arms. Returns panel-local points [v, a, b]. */
  function anglePanel(size, l1, l2) {
    const r = ri(0, 23) * 15;
    const a = dirPt(r, l1), b = dirPt(r + size, l2);
    return fitPanel([[0, 0], a, b]);
  }
  const armLen = p => Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]);
  function panelSpec(panelPts, segsPer, arcsPer) {
    const px = [], py = [], names = [], pp = [], segs = [], arcs = [], arcNames = [];
    panelPts.forEach((pts, k) => {
      const base = px.length;
      for (const p of pts) { px.push(p[0]); py.push(p[1]); names.push(''); pp.push(k); }
      for (const sg of segsPer[k]) segs.push([base + sg[0], base + sg[1]]);
      for (const ar of (arcsPer ? arcsPer[k] : [])) { arcs.push([base + ar[0], base + ar[1], base + ar[2]]); arcNames.push(''); }
    });
    return { type: 'geom', cols: PCOLS, rows: PROWS, grid: 0, px, py, names, pp, segs, arcs, arcNames,
             panels: PANEL_LETTERS.slice(0, panelPts.length) };
  }
  /* a fixed-order letter answer: options read A, B, C, D in that order */
  function finishLetters(stem, keyIdx, explain, word) {
    const choices = PANEL_LETTERS.map(l => word + ' ' + l);
    return { q: stem, extra: '', choices, correct: keyIdx, explain, answerText: choices[keyIdx] };
  }
  /* A COUNT answer with the key's rank among the four numbers chosen uniformly from
     the ranks the candidates allow, so neither "pick the smallest" nor "pick the
     second smallest" is a route. `prefer` are the misconception values (the child
     who counts every corner, who counts the wrong kind, ...); they are used first,
     on whichever side of the key they fall, and plain neighbours fill the rest.
     0 is a legal wrong answer ("no right angles"), so this does not use finishNum,
     which drops it. */
  function finishCount(stem, key, prefer, lowest, explain) {
    const uniq = a => a.filter((v, i) => Number.isInteger(v) && v >= lowest && v !== key && a.indexOf(v) === i);
    const near = [key - 1, key + 1, key - 2, key + 2, key - 3, key + 3, key + 4];
    const below = uniq(shuffle(prefer.filter(v => v < key)).concat(near.filter(v => v < key)));
    const above = uniq(shuffle(prefer.filter(v => v > key)).concat(near.filter(v => v > key)));
    const ranks = [0, 1, 2, 3].filter(r => below.length >= r && above.length >= 3 - r);
    const r = pick(ranks);
    const nums = [key].concat(below.slice(0, r), above.slice(0, 3 - r));
    const order = shuffle([0, 1, 2, 3]);
    return { q: stem, extra: '', choices: order.map(i => String(nums[i])), correct: order.indexOf(0),
             explain, answerText: String(key) };
  }
  /* text options, shuffled */
  function finishText(stem, correct, wrongs, explain) {
    const opts = [correct];
    for (const w of wrongs) if (opts.length < 4 && w && !opts.includes(w)) opts.push(w);
    if (opts.length < 4) return null;
    const order = shuffle([0, 1, 2, 3]);
    return { q: stem, extra: '', choices: order.map(i => opts[i]), correct: order.indexOf(0), explain, answerText: correct };
  }

  const SMALL_SIZES = [25, 30, 35, 40, 45, 50, 55];
  const BIG_SIZES = [125, 130, 135, 140, 145, 150, 155];
  const sizeOf = k => (k === 'right' ? 90 : k === 'small' ? pick(SMALL_SIZES) : pick(BIG_SIZES));
  const KINDS = ['small', 'right', 'big'];

  /* ================= pool 1 ================= */

  /* 1.1 concept of angle: an angle is where two sides meet, so a shape has as many
     angles as corners. Wrong answers: one off either way, and the number of RIGHT
     angles (the child who only counts the square corners). */
  function gCountAngles() {
    const s = convexShape(null);
    if (!s) return gCountAngles();
    const n = s.n;
    return fig(finishCount(who() + ' drew this shape on dot paper. How many angles does the shape have?', n, s.right > 0 ? [s.right] : [], 2,
      'An angle is made where two sides of the shape meet. Count the corners: this shape has ' + n +
      ' corners, so it has ' + n + ' angles. Every corner counts, not only the square ones.'), gridSpec([s]));
  }

  /* 1.2: four single angles, exactly one of the asked kind. */
  function gAnglePick() {
    const want = pick(KINDS);
    const key = ri(0, 3);
    const kinds = PANEL_LETTERS.map((_, i) => (i === key ? want : pick(KINDS.filter(k => k !== want))));
    if (new Set(kinds).size < 2) return gAnglePick();
    const pts = kinds.map(k => anglePanel(sizeOf(k), 2 + Math.random() * 1.6, 2 + Math.random() * 1.6));
    const stem = who() + ' drew four angles. ' + (want === 'right' ? 'Which angle is a right angle?' : 'Which angle is ' + PHRASE[want] + '?');
    return fig(finishLetters(stem, key,
      'Compare each angle with the corner of a square, which is a right angle. Angle ' + PANEL_LETTERS[key] +
      ' is ' + PHRASE[want] + '. ' +
      PANEL_LETTERS.filter((_, i) => i !== key).map(l => 'Angle ' + l + ' is ' + PHRASE[kinds[PANEL_LETTERS.indexOf(l)]]).join('. ') + '.',
      'Angle'), panelSpec(pts, pts.map(() => [[0, 1], [0, 2]]), pts.map(() => [[0, 1, 2]])));
  }

  /* 1.2 on a clock face: at 3 o'clock and 9 o'clock the hands make a right angle. */
  const CLOCK_KIND = { 1: 'small', 2: 'small', 10: 'small', 11: 'small', 3: 'right', 9: 'right',
                       4: 'big', 5: 'big', 7: 'big', 8: 'big' };
  const HOURS = Object.keys(CLOCK_KIND).map(Number);
  function gClockPick() {
    const want = pick(KINDS);
    const key = ri(0, 3);
    const hours = [];
    for (let i = 0; i < 4; i++) {
      const pool = HOURS.filter(h => (i === key ? CLOCK_KIND[h] === want : CLOCK_KIND[h] !== want) && !hours.includes(h));
      hours.push(pick(pool));
    }
    const stem = who() + ' looked at four clocks. On which clock do the two hands make ' +
      (want === 'right' ? 'a right angle' : 'an angle ' + PHRASE[want]) + '?';
    return fig(finishLetters(stem, key,
      'Clock ' + PANEL_LETTERS[key] + ' shows ' + hours[key] + " o'clock. " +
      (want === 'right' ? "At 3 o'clock and at 9 o'clock the two hands make a right angle, like the corner of a square."
        : 'The hands make an angle ' + PHRASE[want] + ": compare it with 3 o'clock, where the hands make a right angle."),
      'Clock'), { type: 'clocks', hours, names: PANEL_LETTERS.slice() });
  }

  /* 2.1 / 2.2 as recognition: which drawing shows parallel / perpendicular lines. */
  function linePair(kind) {
    const r = ri(0, 11) * 15;
    const L1 = 2.6 + Math.random() * 1.2, L2 = 2.6 + Math.random() * 1.2;
    const d = a => dirPt(a, 1), add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
    const u = d(r), nrm = d(r + 90);
    let pts;
    if (kind === 'par') {
      const off = 1.1 + Math.random() * 0.5, sh = (Math.random() - 0.5) * 0.8;
      const a0 = [0, 0], b0 = add(add([0, 0], nrm, off), u, sh);
      pts = [a0, add(a0, u, L1), b0, add(b0, u, L2)];
    } else if (kind === 'perp') {
      const v = d(r + 90), style = ri(0, 2);
      const a0 = [0, 0], a1 = add(a0, u, L1);
      const t = style === 0 ? 0 : style === 1 ? L1 / 2 : L1 * (0.35 + Math.random() * 0.3);
      const m = add(a0, u, t);
      const back = style === 2 ? L2 * 0.45 : 0;          /* style 2 crosses right through */
      pts = [a0, a1, add(m, v, -back), add(m, v, L2 - back)];
    } else if (kind === 'cross') {
      const ang = pick([30, 35, 40, 45, 50, 55, 125, 130, 135, 140, 145, 150]);
      const v = d(r + ang), a0 = [0, 0], a1 = add(a0, u, L1), m = add(a0, u, L1 / 2);
      pts = [a0, a1, add(m, v, -L2 / 2), add(m, v, L2 / 2)];
    } else if (kind === 'vee') {
      const ang = pick([35, 40, 45, 50, 130, 135, 140, 145]);
      pts = [[0, 0], d(r).map(x => x * L1), [0, 0], dirPt(r + ang, L2)];
    } else {                                              /* 'conv': not touching, not parallel */
      const dl = pick([20, 24, 28, 32]) * (Math.random() < 0.5 ? 1 : -1);
      const off = 1.5;
      const a0 = [0, 0], mid = add(add(a0, u, L1 / 2), nrm, off), w = d(r + dl);
      pts = [a0, add(a0, u, L1), add(mid, w, -L2 / 2), add(mid, w, L2 / 2)];
    }
    return fitPanel(pts);
  }
  /* classify a pair of segments [p0,p1] [p2,p3] exactly as the oracle does */
  function pairKind(P) {
    const ux = P[1][0] - P[0][0], uy = P[1][1] - P[0][1], wx = P[3][0] - P[2][0], wy = P[3][1] - P[2][1];
    const deg = Math.acos(Math.abs(ux * wx + uy * wy) / (Math.hypot(ux, uy) * Math.hypot(wx, wy))) * 180 / Math.PI;
    const meet = segsMeet(P[0], P[1], P[2], P[3]);
    if (deg < 0.5) return meet ? 'bad' : 'par';
    if (Math.abs(deg - 90) < 0.5) return meet ? 'perp' : 'bad';
    if (deg < 15) return 'bad';
    return 'other';
  }
  function segsMeet(a, b, c, d) {
    const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
    const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d);
    const eps = 1e-6;
    if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) return true;
    const near = (p, q, r) => Math.min(Math.hypot(r[0] - p[0], r[1] - p[1]), Math.hypot(r[0] - q[0], r[1] - q[1]),
      distSeg(r, p, q)) < 0.02;
    return near(c, d, a) || near(c, d, b) || near(a, b, c) || near(a, b, d);
  }
  function distSeg(p, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L));
    return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy);
  }
  function gLinePick() {
    const want = Math.random() < 0.5 ? 'par' : 'perp';
    const key = ri(0, 3);
    const others = want === 'par' ? ['perp', 'cross', 'conv'] : ['par', 'cross', 'vee'];
    const kinds = PANEL_LETTERS.map((_, i) => (i === key ? want : null));
    const rest = shuffle(others.concat([pick(others)])).slice(0, 3);
    let j = 0;
    for (let i = 0; i < 4; i++) if (!kinds[i]) kinds[i] = rest[j++];
    const pts = kinds.map(linePair);
    for (let i = 0; i < 4; i++) {
      const k = pairKind(pts[i]);
      if (k === 'bad' || (i === key) !== (k === want)) return gLinePick();
    }
    const word = want === 'par' ? 'parallel' : 'perpendicular';
    const why = want === 'par'
      ? 'Parallel lines go in exactly the same direction and stay the same distance apart, so they never meet, however far you draw them. '
      : 'Perpendicular lines meet at a right angle, like the corner of a square. They do not have to be up-and-down and across: turn the page and they are still perpendicular. ';
    const trap = want === 'par'
      ? 'Two lines that do not touch on the page are not always parallel: if the gap between them gets smaller, they would meet if you drew them longer.'
      : 'Lines that cross or meet are only perpendicular if the angle between them is a right angle.';
    return fig(finishLetters(who() + ' drew four pairs of lines. Which drawing shows a pair of ' + word + ' lines?', key,
      why + 'Drawing ' + PANEL_LETTERS[key] + ' shows them. ' + trap, 'Drawing'),
      panelSpec(pts, pts.map(() => [[0, 1], [2, 3]]), null));
  }

  /* ================= pool 2 ================= */

  /* 1.1: the size of an angle is how far the arms open, NOT how long they are. The
     drawing with the LONGEST arms is never the key, so "longest arms = biggest
     angle" always lands on a wrong answer. */
  function gLargestAngle() {
    const big = Math.random() < 0.5;
    let sizes;
    for (let g = 0; g < 50; g++) {
      sizes = [0, 1, 2, 3].map(() => ri(4, 32) * 5);
      const srt = sizes.slice().sort((a, b) => a - b);
      if (srt.every((v, i) => i === 0 || v - srt[i - 1] >= 30) && sizes.every(v => v !== 90)) break;
      sizes = null;
    }
    if (!sizes) return gLargestAngle();
    const key = sizes.indexOf(big ? Math.max(...sizes) : Math.min(...sizes));
    const pts = sizes.map(sz => { const l = 1.8 + Math.random() * 1.9; return anglePanel(sz, l, l); });
    /* arm lengths AS DRAWN (a wide angle is shrunk to fit its panel) */
    const lens = pts.map(armLen);
    const longest = lens.indexOf(Math.max(...lens));
    if (longest === key) return gLargestAngle();
    const runnerUp = Math.max(...lens.filter((_, i) => i !== longest));
    if (lens[longest] - runnerUp < 0.2) return gLargestAngle();   /* the longest arms must LOOK longest */
    if (Math.max(...lens) - Math.min(...lens) < 0.8) return gLargestAngle();
    const word = big ? 'largest' : 'smallest';
    return fig(finishLetters(who() + ' drew four angles. Which angle is the ' + word + '?', key,
      'The size of an angle is how wide its two arms open, not how long the arms are. Angle ' + PANEL_LETTERS[key] +
      ' opens the ' + (big ? 'widest' : 'least') + ', so it is the ' + word + ' angle. Angle ' + PANEL_LETTERS[longest] +
      ' has the longest arms, but that does not make it ' + (big ? 'larger' : 'smaller') + '.', 'Angle'),
      panelSpec(pts, pts.map(() => [[0, 1], [0, 2]]), pts.map(() => [[0, 1, 2]])));
  }

  /* 1.2: count the right angles in a shape. Wrong answers: every corner (counting
     all angles), the corners that are NOT right angles, one off. */
  function gCountRight() {
    const s = convexShape(t => t.right >= 1);
    if (!s) return gCountRight();
    const e = s.right;
    return fig(finishCount(who() + ' drew this shape on dot paper. How many right angles are there in the shape?', e, [s.n, s.n - e], 0,
      'A right angle is a square corner, like the corner of a square. Check each of the ' + s.n +
      ' corners: ' + e + (e === 1 ? ' is a right angle' : ' are right angles') +
      (s.n - e ? ' and ' + (s.n - e) + (s.n - e === 1 ? ' is not' : ' are not') : '') + '.'), gridSpec([s]));
  }

  /* 1.2, no picture: which time makes the stated angle between the hands. */
  function gClockTime() {
    const want = pick(KINDS);
    const keyH = pick(HOURS.filter(h => CLOCK_KIND[h] === want));
    const wrong = shuffle(HOURS.filter(h => CLOCK_KIND[h] !== want)).slice(0, 3);
    const opts = [keyH].concat(wrong).map(h => h + " o'clock");
    const out = finishText('At which of these times do the hour hand and the minute hand of a clock make ' +
      (want === 'right' ? 'a right angle' : 'an angle ' + PHRASE[want]) + '?', opts[0], opts.slice(1),
      "At every o'clock time the minute hand points straight up at 12. At 3 o'clock and 9 o'clock the hour hand points straight across, " +
      'so the hands make a right angle. At ' + keyH + " o'clock the angle is " + PHRASE[want] + '.');
    return out || gClockTime();
  }

  /* 2.1 in a labelled figure: which side is parallel / perpendicular to a given side. */
  function namedShape() {
    const t = ri(0, 4);
    let s;
    if (t === 0) { const W = ri(4, 7), H = ri(3, 5); s = lShape(W, H, ri(1, W - 2), ri(1, H - 2)); }
    else if (t === 1) s = makeRectCut(ri(1, 3), 7, 5);
    else if (t === 2) { const h = ri(1, 3); s = rTrap(ri(h + 2, 7), h); }
    else if (t === 3) { const h = ri(1, 2); s = iTrap(ri(2 * h + 2, 7), h); }
    else { const h = ri(1, 3); s = para(ri(2, 7 - h), h); }
    s = flip(s);
    const L = pick(LABEL_SETS), n = s.pts.length;
    const start = ri(0, n - 1);
    const names = s.pts.map((_, i) => L[(i - start + n) % n]);
    const sides = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      sides.push({ i, j, name: [names[i], names[j]].sort().join(''),
                   v: [s.pts[j][0] - s.pts[i][0], s.pts[j][1] - s.pts[i][1]] });
    }
    return { s, names, sides };
  }
  const isPar = (a, b) => a.v[0] * b.v[1] - a.v[1] * b.v[0] === 0;
  const isPerpDir = (a, b) => a.v[0] * b.v[0] + a.v[1] * b.v[1] === 0;
  const touch = (a, b) => a.i === b.i || a.i === b.j || a.j === b.i || a.j === b.j;

  function gSideRelation() {
    const mode = Math.random() < 0.5 ? 'par' : 'perp';
    for (let g = 0; g < 200; g++) {
      const ns = namedShape();
      const XY = pick(ns.sides);
      const others = ns.sides.filter(x => x !== XY);
      let keys, wrongs;
      if (mode === 'par') {
        keys = others.filter(x => isPar(x, XY));
        wrongs = others.filter(x => !isPar(x, XY));
      } else {
        keys = others.filter(x => touch(x, XY) && isPerpDir(x, XY));
        wrongs = others.filter(x => !isPerpDir(x, XY));
      }
      if (!keys.length || wrongs.length < 3) continue;
      const key = pick(keys);
      const word = mode === 'par' ? 'parallel' : 'perpendicular';
      const out = finishText('Look at the shape. Which line is ' + word + ' to ' + XY.name + '?', key.name,
        shuffle(wrongs).slice(0, 3).map(x => x.name),
        mode === 'par'
          ? key.name + ' goes in the same direction as ' + XY.name + ' and the two lines stay the same distance apart, so ' +
            key.name + ' is parallel to ' + XY.name + '. We write ' + XY.name + ' // ' + key.name + '.'
          : key.name + ' meets ' + XY.name + ' at a right angle, like the corner of a square, so ' + key.name +
            ' is perpendicular to ' + XY.name + '. We write ' + XY.name + ' ⊥ ' + key.name + '.');
      if (!out) continue;
      return fig(out, gridSpec([ns.s], ns.names));
    }
    return gSideRelation();
  }

  /* ================= pool 3: two steps each ================= */

  /* 1.1 + 1.2: put four angles in order, smallest first. The arm-length order is
     always one of the wrong answers (the "longer arms, bigger angle" slip), and
     each of the two orders also appears once with one neighbouring pair swapped,
     so the key is not the centre of the option set. */
  function gOrderAngles() {
    let sizes;
    for (let g = 0; g < 50; g++) {
      sizes = [0, 1, 2, 3].map(() => ri(4, 32) * 5);
      const srt = sizes.slice().sort((a, b) => a - b);
      if (srt.every((v, i) => i === 0 || v - srt[i - 1] >= 30) && sizes.every(v => v !== 90)) break;
      sizes = null;
    }
    if (!sizes) return gOrderAngles();
    const pts = sizes.map(sz => { const l = 1.3 + Math.random() * 2.3; return anglePanel(sz, l, l); });
    const lens = pts.map(armLen);                         /* as drawn */
    const byLen = [0, 1, 2, 3].sort((a, b) => lens[a] - lens[b]);
    const bySize = [0, 1, 2, 3].sort((a, b) => sizes[a] - sizes[b]);
    const srtL = lens.slice().sort((a, b) => a - b);
    if (!srtL.every((v, i) => i === 0 || v - srtL[i - 1] >= 0.25)) return gOrderAngles();
    const txt = o => o.map(i => PANEL_LETTERS[i]).join(', ');
    const swap = (o, k) => { const c = o.slice(); const t = c[k]; c[k] = c[k + 1]; c[k + 1] = t; return c; };
    const key = txt(bySize);
    const wrongs = [txt(byLen), txt(swap(bySize, ri(0, 2))), txt(swap(byLen, ri(0, 2)))];
    if (wrongs.includes(key) || new Set(wrongs).size < 3) return gOrderAngles();
    const out = finishText(who() + ' drew four angles. Arrange them in order, starting with the smallest.', key, wrongs,
      'Look at how wide each angle opens, not at how long its arms are. From the smallest opening to the widest the order is ' +
      key + '. Ordering by the length of the arms gives ' + txt(byLen) + ', which is the trap.');
    if (!out) return gOrderAngles();
    return fig(out, panelSpec(pts, pts.map(() => [[0, 1], [0, 2]]), pts.map(() => [[0, 1, 2]])));
  }

  /* 1.2 in a composite figure: classify every angle in two shapes, then count. */
  function gCountKind() {
    const want = Math.random() < 0.5 ? 'small' : 'big';
    for (let g = 0; g < 100; g++) {
      const a = convexShape(null, { maxW: 5, maxH: 4 });
      const b = convexShape(null, { maxW: 5, maxH: 4 });
      if (!a || !b) continue;
      const e = a[want] + b[want];
      if (e < 1) continue;
      const other = want === 'small' ? 'big' : 'small';
      return fig(finishCount(who() + ' drew these two shapes on dot paper. How many angles in the two shapes are ' + PHRASE[want] + '?', e,
        [a.n + b.n, a[other] + b[other], a[want], b[want]], 0,
        'Check every corner of both shapes against a right angle. The first shape has ' + a[want] + ' and the second has ' +
        b[want] + ' angle' + (b[want] === 1 ? '' : 's') + ' ' + PHRASE[want] + ', so there are ' + a[want] + ' + ' + b[want] +
        ' = ' + e + ' altogether. Right angles do not count.'), gridSpec([a, b]));
    }
    return gCountKind();
  }

  /* 2.1: count the pairs of parallel sides. Every shape here has at most two sides
     in any one direction, so the pairs never overlap and there is one count. */
  function gParallelPairs() {
    for (let g = 0; g < 200; g++) {
      const t = ri(0, 4);
      let s;
      if (t <= 1) s = makeRectCut(ri(0, 4), 7, 5);
      else if (t === 2) { const h = ri(1, 3); s = rTrap(ri(h + 1, 7), h); }
      else if (t === 3) { const h = ri(1, 2); s = iTrap(ri(2 * h + 1, 7), h); }
      else { const h = ri(1, 3); s = para(ri(2, 7 - h), h); }
      s = flip(s);
      const n = s.pts.length;
      const v = s.pts.map((p, i) => [s.pts[(i + 1) % n][0] - p[0], s.pts[(i + 1) % n][1] - p[1]]);
      let pairs = 0, ok = true;
      for (let i = 0; i < n; i++) {
        let same = 0;
        for (let j = 0; j < n; j++) if (j !== i && v[i][0] * v[j][1] - v[i][1] * v[j][0] === 0) same++;
        if (same > 1) ok = false;
        pairs += same;
      }
      pairs /= 2;
      if (!ok || pairs < 1) continue;
      const right = anglesOf(s.pts).filter(isRight).length;
      return fig(finishCount(who() + ' drew this shape on dot paper. How many pairs of parallel lines are there in the shape?', pairs, [n, right], 0,
        'Parallel lines go in the same direction and never meet. Look at the sides two at a time: ' + pairs +
        (pairs === 1 ? ' pair of sides goes' : ' pairs of sides go') + ' in the same direction. ' +
        'Sides that meet at a corner are never parallel.'), gridSpec([s]));
    }
    return gParallelPairs();
  }

  /* 2.1, two steps: test four statements about a labelled shape; one is true.
     Perpendicular is only claimed of sides that MEET, or of sides that are not
     perpendicular in direction at all, so no statement has a second reading. */
  function gStatementTrue() {
    for (let g = 0; g < 300; g++) {
      const ns = namedShape();
      const S = ns.sides, n = S.length;
      const trues = [], falses = [];
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        const A = S[a], B = S[b];
        const p = isPar(A, B), d = isPerpDir(A, B), t = touch(A, B);
        const [x, y] = Math.random() < 0.5 ? [A, B] : [B, A];
        const parS = x.name + ' is parallel to ' + y.name + '.';
        const perS = x.name + ' is perpendicular to ' + y.name + '.';
        (p ? trues : falses).push({ s: parS, kind: 'par' });
        if (t && d) trues.push({ s: perS, kind: 'perp' });
        else if (!d) falses.push({ s: perS, kind: 'perp' });
      }
      const wantKind = Math.random() < 0.5 ? 'par' : 'perp';
      const tk = trues.filter(x => x.kind === wantKind);
      if (!tk.length) continue;
      const key = pick(tk);
      /* mix the wrong statements' wording so "the odd word out" is not the key */
      const fP = shuffle(falses.filter(x => x.kind === 'par')), fQ = shuffle(falses.filter(x => x.kind === 'perp'));
      const nSame = ri(0, 2);
      const sameK = wantKind === 'par' ? fP : fQ, otherK = wantKind === 'par' ? fQ : fP;
      if (sameK.length < nSame || otherK.length < 3 - nSame) continue;
      const wrongs = sameK.slice(0, nSame).concat(otherK.slice(0, 3 - nSame)).map(x => x.s);
      const out = finishText('Look at the shape. Which one of these is true?', key.s, wrongs,
        'Check each statement against the drawing. ' + key.s.replace(/\.$/, '') +
        (key.kind === 'par' ? ': the two lines go in the same direction and never meet.'
          : ': the two lines meet at a right angle.') +
        ' Each of the other statements is false when you look at the drawing.');
      if (!out) continue;
      return fig(out, gridSpec([ns.s], ns.names));
    }
    return gStatementTrue();
  }

  MQI.registerTopic({
    id: 'p3angles', level: 'P3', strand: 'Measurement and Geometry',
    moeSubTopic: 'Angles: concepts of angle; right angles, angles greater than/smaller than a right angle. ' +
      'Perpendicular and Parallel Lines: perpendicular and parallel lines; drawing perpendicular and parallel lines',
    label: 'Right Angle Rock', short: 'Angles & lines', e: '📐',
    skills: {
      angle: { label: 'What an angle is', tip: 'An angle is where two lines meet. Its size is how wide the arms open, not how long they are: open and close a pair of scissors together.' },
      right: { label: 'Right angles', tip: 'Fold a piece of paper twice to make a right-angle checker, then hunt for square corners round the house and test angles against it.' },
      lines: { label: 'Parallel and perpendicular', tip: 'Parallel lines are like railway tracks and never meet; perpendicular lines meet at a right angle, like the corner of a window.' }
    },
    pools: {
      1: [[gCountAngles, 'angle'], [gAnglePick, 'right'], [gClockPick, 'right'], [gLinePick, 'lines']],
      2: [[gLargestAngle, 'angle'], [gCountRight, 'right'], [gClockTime, 'right'], [gSideRelation, 'lines']],
      3: [[gOrderAngles, 'angle'], [gCountKind, 'right'], [gParallelPairs, 'lines'], [gStatementTrue, 'lines']]
    }
  });
})();
