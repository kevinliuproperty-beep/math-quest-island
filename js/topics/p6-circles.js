"use strict";
/* Math Quest Island topic: p6circles (P6). Self-contained. Typed + MC, every item drawn.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, p.44, PRIMARY SIX,
 * MEASUREMENT AND GEOMETRY, SUB-STRAND: AREA AND VOLUME, 1. Area and Circumference of Circle):
 *   1.1 area and circumference of circle
 *   1.2 finding the area and perimeter of semicircle, quarter circle
 *   1.3 finding the area and perimeter of composite figures made up of square, rectangle,
 *       triangle, semicircle and quarter circle
 * PSLE convention: every stem says "Take π = 22/7" or "Take π = 3.14". With 22/7 the
 * lengths are multiples of 7 so the answers are exact; with 3.14 every typed item declares
 * q.dp = 2 and no answer needs more than 2 decimal places. The perimeter of a semicircle or
 * quarter circle INCLUDES its straight edges; leaving them out is a tagged slip.
 * Figures are `circlefig` specs (js/figures.js): the numbers live on the drawing, as on a
 * PSLE paper, and the oracle (tools/oracles/p6circles.mjs) re-reads them off the render.
 *
 * P5-P6 mirror (Sprint 1): every item carries q.syl = 'P6'; MCQ distractors carry q.miscon
 * + q.optionFeedback, typed items q.slips; tags are defined once in `misconceptions`.
 * Pool 3 is PSLE Paper 2 shape: band 3, worded composite figures, coached.
 * Triangles (1.3): the segment item takes a right-angled triangle away from a quarter circle;
 * the leaf item overlaps two quarter circles inside a square.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishTyped = G.finishTyped;

  const P6 = q => (q.syl = 'P6', q);
  const fig = (q, figure) => (q.figure = figure, q);
  const r2 = x => Math.round(x * 100) / 100;
  const fmt = x => String(r2(x));
  /* π times a length, exact for 22/7 (multiply first, divide by 7 last) */
  const PI = { '22/7': x => r2(22 * x / 7), '3.14': x => r2(314 * x / 100) };
  const take = p => 'Take π = ' + p + '.';
  const SHE = new Set(['Mrs Tan', 'Siti', 'Mei Ling', 'Kavitha', 'Nurul', 'Mdm Wong']);
  const NAMES = ['Mr Lim', 'Mrs Tan', 'Siti', 'Ravi', 'Mei Ling', 'Ahmad', 'Farid', 'Kavitha', 'Jun Hao', 'Nurul', 'Mdm Wong', 'Mr Rahman'];

  /* MCQ: key and distractor VALUES, all printed with the same unit. dist = [[value, tag, coaching], ...] */
  function mcq(stem, key, unit, dist, explain) {
    const K = fmt(key) + ' ' + unit, seen = [K], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      if (!(d[0] > 0)) continue;
      const t = fmt(d[0]) + ' ' + unit;
      if (seen.indexOf(t) !== -1) continue;
      seen.push(t); keep.push([t, d[1], d[2]]);
    }
    if (keep.length < 3) return null;
    const rows = shuffle([[K, null, null]].concat(keep));
    const q = { q: stem, extra: '', choices: rows.map(r => r[0]), correct: 0, explain, answerText: K };
    q.correct = rows.findIndex(r => r[1] === null);
    q.miscon = {}; q.optionFeedback = {};
    rows.forEach((r, i) => { if (r[1]) { q.miscon[i] = r[1]; q.optionFeedback[i] = r[2]; } });
    return P6(q);
  }
  /* typed: answer + unit, q.dp = 2 whenever π = 3.14 or the answer is not whole */
  function typed(stem, ans, unit, explain, p, slipList) {
    const q = finishTyped(stem, r2(ans), explain, unit);
    if (p === '3.14' || !Number.isInteger(q.answer)) q.dp = 2;
    const s = {};
    for (const [v0, tag] of slipList) {
      const v = r2(v0);
      if (Number.isFinite(v) && v > 0 && Math.abs(v - q.answer) > 1e-9 && !(String(v) in s)) s[String(v)] = tag;
    }
    q.slips = s;
    return P6(q);
  }
  const cfCircle = (r, mark, unit) => ({ type: 'circlefig', shape: 'circle', unit, r, mark });
  const cfSemi = (r, mark, unit) => ({ type: 'circlefig', shape: 'semi', unit, r, mark });
  const cfQuarter = (r, unit) => ({ type: 'circlefig', shape: 'quarter', unit, r });
  const cfSeg = (r, unit) => ({ type: 'circlefig', shape: 'segment', unit, r });
  const cfLeaf = (r, unit) => ({ type: 'circlefig', shape: 'leaf', unit, r });
  const cfRect = (W, H, r, semis, quarters, unit) => ({ type: 'circlefig', shape: 'rect', unit, W, H, r, semis, quarters });

  /* a radius for a plain circle item: Paper 1 friendly in pool 1, wider in pool 2 */
  function radius(p, big) {
    if (p === '22/7') return 7 * (big ? ri(1, 5) : ri(1, 2));
    return big ? pick([3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 20]) : pick([3, 4, 5, 10]);
  }

  /* ---------- 1.1 circumference, MCQ (pool 1) ---------- */
  function gCircumference() {
    const p = pick(['22/7', '3.14']), mark = pick(['r', 'd']), r = radius(p, false), d = 2 * r, M = PI[p];
    const key = M(d);
    const dist = mark === 'r' ? [
      [M(r), 'radius-for-diameter', 'That is π × radius. The circumference is π × diameter, and the diameter is 2 × ' + r + ' = ' + d + ' cm.'],
      [M(r * r), 'area-for-circumference', 'π × r × r gives the area. The circumference is the distance round the circle: π × diameter.'],
      [M(2 * d), 'diameter-for-radius', 'The radius was doubled twice. The diameter is 2 × ' + r + ' = ' + d + ' cm, then multiply by π once.'],
      [M(r) + d, 'semicircle-perimeter', 'That is the perimeter of a semicircle: half the curved edge plus the diameter. A whole circle\'s edge is π × diameter.']
    ] : [
      [M(2 * d), 'diameter-for-radius', 'That is 2 × π × ' + d + '. The ' + d + ' cm is already the diameter, so the circumference is π × ' + d + '.'],
      [M(r * r), 'area-for-circumference', 'π × r × r gives the area. The circumference is the distance round the circle: π × diameter.'],
      [M(r), 'radius-for-diameter', 'That is π × radius. Use the whole diameter, ' + d + ' cm.'],
      [M(d * d), 'area-for-circumference', 'π × d × d is not a circle formula. The circumference is π × diameter.']
    ];
    const out = mcq('What is the circumference of the circle? ' + take(p), key, 'cm', dist,
      'Circumference = π × diameter. The diameter is ' + d + ' cm, so the circumference is ' + p + ' × ' + d + ' = ' + fmt(key) + ' cm.');
    return out ? fig(out, cfCircle(r, mark, 'cm')) : gCircumference();
  }

  /* ---------- 1.1 area, MCQ (pool 1) ---------- */
  function gCircleArea() {
    const p = pick(['22/7', '3.14']), mark = pick(['r', 'd']), M = PI[p];
    const r = p === '22/7' ? 7 * ri(1, 2) : radius(p, false), d = 2 * r;
    const key = M(r * r);
    const dist = [
      [M(d * d), 'diameter-for-radius', 'That uses the diameter twice. Area = π × radius × radius, and the radius is ' + r + ' cm.'],
      [M(d), 'circumference-for-area', 'π × diameter is the circumference, the distance round. The area is π × r × r.'],
      [M(r), 'no-square', 'Multiply by the radius TWICE: π × ' + r + ' × ' + r + '.'],
      [M(2 * r * r), 'doubled', 'Area = π × r × r. There is no extra × 2 in the area formula.']
    ];
    const out = mcq('What is the area of the circle? ' + take(p), key, 'cm²', dist,
      'The radius is ' + r + ' cm. Area = π × r × r = ' + p + ' × ' + r + ' × ' + r + ' = ' + fmt(key) + ' cm².');
    return out ? fig(out, cfCircle(r, mark, 'cm')) : gCircleArea();
  }

  /* ---------- 1.2 semicircle area, typed (pool 1) ---------- */
  function gSemiArea() {
    const U = pick(['cm', 'm']);
    const p = pick(['22/7', '3.14']), M = PI[p];
    const r = p === '22/7' ? 7 * ri(1, 5) : ri(2, 12);
    const mark = pick(['r', 'd']), d = 2 * r, ans = M(r * r) / 2;
    return fig(typed('What is the area of the semicircle, in ' + U + '²? ' + take(p), ans, U + '²',
      'The radius is ' + r + ' ' + U + '. A semicircle is half a circle: 1/2 × ' + p + ' × ' + r + ' × ' + r + ' = ' + fmt(ans) + ' ' + U + '².', p,
      [[M(r * r), 'whole-circle'], [M(d * d) / 2, 'diameter-for-radius'], [M(r) / 2, 'no-square'], [M(r), 'circumference-for-area']]),
      cfSemi(r, mark, U));
  }

  /* ---------- 1.1 circle, typed (pool 2) ---------- */
  function gCircleTyped() {
    const p = pick(['22/7', '3.14']), M = PI[p], r = radius(p, true), d = 2 * r, mark = pick(['r', 'd']);
    if (Math.random() < 0.5) {
      const ans = M(d);
      return fig(typed('What is the circumference of the circle, in cm? ' + take(p), ans, 'cm',
        'Circumference = π × diameter = ' + p + ' × ' + d + ' = ' + fmt(ans) + ' cm.', p,
        [[M(r), 'radius-for-diameter'], [M(2 * d), 'diameter-for-radius'], [M(r * r), 'area-for-circumference']]),
        cfCircle(r, mark, 'cm'));
    }
    const ans = M(r * r);
    return fig(typed('What is the area of the circle, in cm²? ' + take(p), ans, 'cm²',
      'Area = π × r × r = ' + p + ' × ' + r + ' × ' + r + ' = ' + fmt(ans) + ' cm².', p,
      [[M(d * d), 'diameter-for-radius'], [M(d), 'circumference-for-area'], [M(r), 'no-square']]),
      cfCircle(r, mark, 'cm'));
  }

  /* ---------- 1.2 semicircle perimeter, typed (pool 2) ---------- */
  function gSemiPerimeter() {
    const p = pick(['22/7', '3.14']), M = PI[p];
    const r = p === '22/7' ? 7 * ri(1, 5) : ri(2, 12), d = 2 * r, mark = pick(['r', 'd']);
    const arc = M(r), ans = arc + d;
    return fig(typed('What is the perimeter of the semicircle, in cm? ' + take(p), ans, 'cm',
      'The curved edge is half the circumference: 1/2 × ' + p + ' × ' + d + ' = ' + fmt(arc) + ' cm. The perimeter also includes the straight edge, the diameter ' +
      d + ' cm: ' + fmt(arc) + ' + ' + d + ' = ' + fmt(ans) + ' cm.', p,
      [[arc, 'forgot-diameter'], [arc + r, 'radius-for-diameter'], [M(d) + d, 'whole-circumference']]),
      cfSemi(r, mark, 'cm'));
  }

  /* ---------- 1.2 quarter circle perimeter, typed (pool 2) ---------- */
  function gQuarterPerimeter() {
    const p = pick(['22/7', '3.14']), M = PI[p];
    const r = p === '22/7' ? 7 * ri(1, 6) : ri(2, 20);
    const arc = M(2 * r) / 4, ans = arc + 2 * r;
    return fig(typed('What is the perimeter of the quarter circle, in cm? ' + take(p), ans, 'cm',
      'The curved edge is a quarter of the circumference: 1/4 × ' + p + ' × ' + (2 * r) + ' = ' + fmt(arc) + ' cm. Add the two straight edges, each ' + r +
      ' cm: ' + fmt(arc) + ' + ' + r + ' + ' + r + ' = ' + fmt(ans) + ' cm.', p,
      [[arc, 'forgot-radii'], [arc + r, 'one-radius'], [M(2 * r) + 2 * r, 'whole-circumference'], [M(2 * r) / 2 + 2 * r, 'half-for-quarter']]),
      cfQuarter(r, 'cm'));
  }

  /* ---------- 1.2 quarter circle area, typed (pool 2) ---------- */
  function gQuarterArea() {
    const U = pick(['cm', 'm']);
    const p = pick(['22/7', '3.14']), M = PI[p];
    const r = p === '22/7' ? 14 * ri(1, 3) : 2 * ri(1, 10);
    const ans = M(r * r) / 4;
    return fig(typed('What is the area of the quarter circle, in ' + U + '²? ' + take(p), ans, U + '²',
      'A quarter circle is 1/4 of a circle: 1/4 × ' + p + ' × ' + r + ' × ' + r + ' = ' + fmt(ans) + ' ' + U + '².', p,
      [[M(r * r), 'whole-circle'], [M(r * r) / 2, 'half-for-quarter'], [M(2 * r) / 4, 'circumference-for-area']]),
      cfQuarter(r, U));
  }

  /* ---------- 1.1 working backwards from the circumference, typed, no figure (pool 2) ---------- */
  function gFromCircumference() {
    const T = pick([['circular plate', 'cm'], ['round clock face', 'cm'], ['hula hoop', 'cm'], ['circular pond', 'm'], ['round flower bed', 'm']]);
    const p = pick(['22/7', '3.14']), M = PI[p];
    const d = p === '22/7' ? 14 * ri(1, 6) : pick([10, 20, 30, 40, 50, 60]);
    const C = M(d), want = pick(['radius', 'diameter']), ans = want === 'radius' ? d / 2 : d;
    const q = typed('The circumference of a ' + T[0] + ' is ' + fmt(C) + ' ' + T[1] + '. ' + take(p) + ' What is the ' + want +
      ' of the ' + T[0] + ', in ' + T[1] + '?', ans, T[1],
      'Circumference = π × diameter, so the diameter is ' + fmt(C) + ' ÷ ' + p + ' = ' + d + ' ' + T[1] + '.' +
      (want === 'radius' ? ' The radius is half of it: ' + d + ' ÷ 2 = ' + (d / 2) + ' ' + T[1] + '.' : ''), p,
      want === 'radius' ? [[d, 'radius-diameter-swap'], [d / 4, 'halved-twice']] : [[d / 2, 'radius-diameter-swap'], [2 * d, 'doubled-diameter']]);
    return q;
  }

  /* ================= Paper 2: composite figures (pool 3, band 3) ================= */
  const P2 = (q, steps) => { q.band = 3; q.exam = 'problem'; q.technique = 'Sketch and label'; q.steps = steps; return q; };

  /* rectangle + a semicircle added on one side */
  function gGardenSemi() {
    const side = pick(['right', 'top']), D = 14 * ri(1, 2), other = ri(10, 30);
    const W = side === 'right' ? other : D, H = side === 'right' ? D : other;
    if (W === H) return gGardenSemi();
    const who = pick(NAMES), M = PI['22/7'], arc = M(D) / 2, rr = D / 2;
    const straight = side === 'right' ? [W, H, W] : [H, W, H], S = straight[0] + straight[1] + straight[2];
    const f = cfRect(W, H, 0, [[side, 'out']], [], 'm');
    if (Math.random() < 0.5) {
      const ans = arc + S;
      const q = typed('A garden is made up of a rectangle and a semicircle, as shown. ' + who + ' puts a fence along the whole edge of the garden. ' +
        take('22/7') + ' How long is the fence, in m?', ans, 'm',
        'Curved edge = 1/2 × 22/7 × ' + D + ' = ' + arc + ' m. Straight edges = ' + straight.join(' + ') + ' = ' + S + ' m. Fence = ' + arc + ' + ' + S + ' = ' + ans + ' m.', '22/7',
        [[ans + D, 'counted-inside-line'], [M(D) + S, 'whole-circumference'], [S, 'forgot-part']]);
      return fig(P2(q, [
        'The curved edge is half the circumference of a circle with diameter ' + D + ' m.',
        'Curved edge = 1/2 × 22/7 × ' + D + ' = ' + arc + ' m.',
        'The dashed diameter is inside the garden, so only the other three sides count: ' + straight.join(' + ') + ' = ' + S + ' m.',
        'Fence = ' + arc + ' + ' + S + ' = <b>' + ans + '</b> m.'
      ]), f);
    }
    const R = W * H, Sm = M(rr * rr) / 2, ans = R + Sm;
    const q = typed('A flower bed is made up of a rectangle and a semicircle, as shown. ' + who + ' covers the whole flower bed with soil. ' +
      take('22/7') + ' What is the area of the flower bed, in m²?', ans, 'm²',
      'Rectangle = ' + W + ' × ' + H + ' = ' + R + ' m². Semicircle = 1/2 × 22/7 × ' + rr + ' × ' + rr + ' = ' + Sm + ' m². Total = ' + ans + ' m².', '22/7',
      [[R + 2 * Sm, 'whole-circle'], [R, 'forgot-part'], [R + M(D * D) / 2, 'diameter-for-radius']]);
    return fig(P2(q, [
      'Area of the rectangle = ' + W + ' × ' + H + ' = ' + R + ' m².',
      'The semicircle has diameter ' + D + ' m, so its radius is ' + D + ' ÷ 2 = ' + rr + ' m.',
      'Area of the semicircle = 1/2 × 22/7 × ' + rr + ' × ' + rr + ' = ' + Sm + ' m².',
      'Total area = ' + R + ' + ' + Sm + ' = <b>' + ans + '</b> m².'
    ]), f);
  }

  /* running track: a rectangle with a semicircle added at each end */
  function gTrack() {
    const per = Math.random() < 0.5, p = Math.random() < 0.6 ? '22/7' : '3.14', M = PI[p];
    const H = p === '22/7' ? 14 * ri(3, 5) : (per ? pick([50, 100]) : pick([20, 40, 60]));
    const W = 10 * ri(8, 12);
    if (W <= H) return gTrack();
    const f = cfRect(W, H, 0, [['left', 'out'], ['right', 'out']], [], 'm');
    const ctx = per ? pick(['A running track', 'A jogging path']) : pick(['A school field', 'A lawn']);
    if (per) {
      const C = M(H), ans = C + 2 * W;
      const q = typed(ctx + ' is made up of a rectangle with a semicircle at each end, as shown. ' + pick(NAMES) + ' runs once round its edge. ' +
        take(p) + ' How far does ' + 'the runner go, in m?', ans, 'm',
        'The two semicircles make one circle: ' + p + ' × ' + H + ' = ' + fmt(C) + ' m. Add the two straight sides: ' + fmt(C) + ' + ' + W + ' + ' + W + ' = ' + ans + ' m.', p,
        [[ans + 2 * H, 'counted-inside-line'], [2 * C + 2 * W, 'whole-circumference'], [2 * W, 'forgot-part']]);
      return fig(P2(q, [
        'The two semicircles at the ends together make one whole circle of diameter ' + H + ' m.',
        'Curved edges = ' + p + ' × ' + H + ' = ' + fmt(C) + ' m.',
        'The straight edges are the top and bottom: ' + W + ' + ' + W + ' = ' + (2 * W) + ' m.',
        'Distance = ' + fmt(C) + ' + ' + (2 * W) + ' = <b>' + ans + '</b> m.'
      ]), f);
    }
    const rr = H / 2, R = W * H, Ci = M(rr * rr), ans = R + Ci;
    const q = typed(ctx + ' is made up of a rectangle with a semicircle at each end, as shown. The whole of it is covered with grass. ' +
      take(p) + ' What is the area covered with grass, in m²?', ans, 'm²',
      'Rectangle = ' + W + ' × ' + H + ' = ' + R + ' m². The two semicircles make a circle of radius ' + rr + ' m: ' + p + ' × ' + rr + ' × ' + rr + ' = ' + fmt(Ci) +
      ' m². Total = ' + ans + ' m².', p,
      [[R + 2 * Ci, 'whole-circle'], [R, 'forgot-part'], [R + M(H * H), 'diameter-for-radius']]);
    return fig(P2(q, [
      'Area of the rectangle = ' + W + ' × ' + H + ' = ' + R + ' m².',
      'The two semicircles make one circle of radius ' + H + ' ÷ 2 = ' + rr + ' m.',
      'Area of the circle = ' + (p === '22/7' ? '22/7 × ' + rr + ' × ' + rr : rr + ' × ' + rr + ' × 3.14') + ' = ' + fmt(Ci) + ' m².',
      'Total area = ' + R + ' + ' + fmt(Ci) + ' = <b>' + ans + '</b> m².'
    ]), f);
  }

  /* a quarter circle cut from one corner of a square or rectangle card */
  function gCornerCut() {
    const corner = pick(['tl', 'tr', 'br', 'bl']), area = Math.random() < 0.5, square = Math.random() < 0.5;
    let p = '22/7', W, H, r;
    if (square) {
      if (area && Math.random() < 0.4) { p = '3.14'; W = pick([20, 40]); }
      else W = 14 * ri(1, 2);
      H = W; r = W;
    } else {
      r = area ? 14 : pick([7, 14]);
      W = r + ri(3, 16); H = r + ri(3, 16);
      if (W === H) return gCornerCut();
    }
    const M = PI[p], f = cfRect(W, H, r, [], [[corner, 'in']], 'cm');
    const card = square ? 'a square card' : 'a rectangular card', who = pick(NAMES);
    if (area) {
      const R = W * H, Q = M(r * r) / 4, ans = R - Q;
      const q = typed('The figure shows ' + card + ' with a quarter circle cut away from one corner. The quarter circle is centred on that corner. ' +
        take(p) + ' What is the area of the shaded part, in cm²?', ans, 'cm²',
        'Card = ' + W + ' × ' + H + ' = ' + R + ' cm². Quarter circle = 1/4 × ' + p + ' × ' + r + ' × ' + r + ' = ' + fmt(Q) + ' cm². Shaded part = ' + R + ' − ' + fmt(Q) + ' = ' + ans + ' cm².', p,
        [[R + Q, 'added-cut-part'], [Q, 'forgot-part'], [R - M(r * r), 'whole-circle']]);
      return fig(P2(q, [
        'Area of the card before the cut = ' + W + ' × ' + H + ' = ' + R + ' cm².',
        'The piece cut away is a quarter of a circle with radius ' + r + ' cm.',
        'Area of the quarter circle = ' + (p === '22/7' ? '1/4 × 22/7 × ' + r + ' × ' + r : r + ' × ' + r + ' × 3.14 ÷ 4') + ' = ' + fmt(Q) + ' cm².',
        'Shaded part = ' + R + ' − ' + fmt(Q) + ' = <b>' + ans + '</b> cm².'
      ]), f);
    }
    const arc = M(2 * r) / 4, a = W - r, b = H - r, ans = arc + W + H + a + b;
    const q = typed('The figure shows ' + card + ' with a quarter circle cut away from one corner. The quarter circle is centred on that corner. ' + who + ' sticks ribbon along the whole edge of the shaded part. ' +
      take(p) + ' How much ribbon is needed, in cm?', ans, 'cm',
      'Curved edge = 1/4 × 2 × 22/7 × ' + r + ' = ' + arc + ' cm. Edge = ' + arc + ' + ' + W + ' + ' + H + (square ? '' : ' + ' + a + ' + ' + b) + ' = ' + ans + ' cm.', p,
      [[ans - arc, 'forgot-part'], [ans + 2 * r, 'counted-inside-line'], [arc + W + H, 'forgot-part']]);
    return fig(P2(q, [
      'The curved edge is a quarter of the circumference of a circle with radius ' + r + ' cm.',
      'Curved edge = 1/4 × 2 × 22/7 × ' + r + ' = ' + arc + ' cm.',
      square ? 'The two uncut sides are ' + W + ' cm and ' + H + ' cm; the dashed lines are not edges.'
        : 'The two cut sides are now ' + W + ' − ' + r + ' = ' + a + ' cm and ' + H + ' − ' + r + ' = ' + b + ' cm.',
      'Ribbon = ' + arc + ' + ' + W + ' + ' + H + (square ? '' : ' + ' + a + ' + ' + b) + ' = <b>' + ans + '</b> cm.'
    ]), f);
  }

  /* a semicircle cut out of one side of a rectangular board */
  function gSemiCut() {
    const side = pick(['top', 'right']), area = Math.random() < 0.5;
    const D = area ? 14 * ri(1, 2) : 14 * ri(1, 3);
    const other = D / 2 + ri(4, 14);
    const W = side === 'top' ? D : other, H = side === 'top' ? other : D;
    if (W === H) return gSemiCut();
    const M = PI['22/7'], f = cfRect(W, H, 0, [[side, 'in']], [], 'cm'), who = pick(NAMES);
    if (area) {
      const R = W * H, rr = D / 2, Sm = M(rr * rr) / 2, ans = R - Sm;
      const q = typed('A wooden board is a rectangle with a semicircle cut out of one side, as shown. ' + who + ' paints the top of the board. ' +
        take('22/7') + ' What area does ' + who + ' paint, in cm²?', ans, 'cm²',
        'Rectangle = ' + W + ' × ' + H + ' = ' + R + ' cm². Semicircle = 1/2 × 22/7 × ' + rr + ' × ' + rr + ' = ' + Sm + ' cm². Painted area = ' + R + ' − ' + Sm + ' = ' + ans + ' cm².', '22/7',
        [[R + Sm, 'added-cut-part'], [R, 'forgot-part'], [R - 2 * Sm, 'whole-circle']]);
      return fig(P2(q, [
        'Area of the rectangle = ' + W + ' × ' + H + ' = ' + R + ' cm².',
        'The semicircle cut out has diameter ' + D + ' cm, so its radius is ' + D + ' ÷ 2 = ' + rr + ' cm.',
        'Area of the semicircle = 1/2 × 22/7 × ' + rr + ' × ' + rr + ' = ' + Sm + ' cm².',
        'Painted area = ' + R + ' − ' + Sm + ' = <b>' + ans + '</b> cm².'
      ]), f);
    }
    const arc = M(D) / 2, oth = side === 'top' ? [W, H, H] : [H, W, W], S = oth[0] + oth[1] + oth[2], ans = arc + S;
    const q = typed('A wooden board is a rectangle with a semicircle cut out of one side, as shown. ' + who + ' glues a strip of tape along the whole edge of the board. ' +
      take('22/7') + ' How long is the tape, in cm?', ans, 'cm',
      'Curved edge = 1/2 × 22/7 × ' + D + ' = ' + arc + ' cm. Straight edges = ' + oth.join(' + ') + ' = ' + S + ' cm. Tape = ' + ans + ' cm.', '22/7',
      [[ans + D, 'counted-inside-line'], [2 * (W + H), 'used-whole-rectangle'], [S, 'forgot-part']]);
    return fig(P2(q, [
      'The curved edge is half the circumference of a circle with diameter ' + D + ' cm.',
      'Curved edge = 1/2 × 22/7 × ' + D + ' = ' + arc + ' cm.',
      'The side with the cut has no straight edge left, so the straight edges are ' + oth.join(' + ') + ' = ' + S + ' cm.',
      'Tape = ' + arc + ' + ' + S + ' = <b>' + ans + '</b> cm.'
    ]), f);
  }

  /* a rectangle with a quarter circle added on one side */
  function gFanShape() {
    const corner = pick(['br', 'bl']), area = Math.random() < 0.5;
    const r = area ? 14 * ri(1, 2) : 7 * ri(1, 4), H = r, W = ri(Math.max(8, r - 6), r + 18);
    if (W === H) return gFanShape();
    const M = PI['22/7'], f = cfRect(W, H, r, [], [[corner, 'out']], 'm');
    if (area) {
      const R = W * H, Q = M(r * r) / 4, ans = R + Q;
      const q = typed('A piece of land is made up of a rectangle and a quarter circle, as shown. The whole piece of land is covered with tiles. ' +
        take('22/7') + ' What is the area of the land, in m²?', ans, 'm²',
        'Rectangle = ' + W + ' × ' + H + ' = ' + R + ' m². Quarter circle = 1/4 × 22/7 × ' + r + ' × ' + r + ' = ' + Q + ' m². Total = ' + ans + ' m².', '22/7',
        [[R + M(r * r), 'whole-circle'], [R, 'forgot-part'], [R + M(r * r) / 2, 'half-for-quarter']]);
      return fig(P2(q, [
        'Area of the rectangle = ' + W + ' × ' + H + ' = ' + R + ' m².',
        'The quarter circle has radius ' + r + ' m.',
        'Area of the quarter circle = 1/4 × 22/7 × ' + r + ' × ' + r + ' = ' + Q + ' m².',
        'Total area = ' + R + ' + ' + Q + ' = <b>' + ans + '</b> m².'
      ]), f);
    }
    const arc = M(2 * r) / 4, B = W + r, ans = H + W + arc + B;
    const who = pick(NAMES);
    const q = typed('A piece of land is made up of a rectangle and a quarter circle, as shown. ' + who + ' walks once round the edge of the land. ' +
      take('22/7') + ' How far does ' + (SHE.has(who) ? 'she' : 'he') + ' walk, in m?', ans, 'm',
      'Curved edge = 1/4 × 2 × 22/7 × ' + r + ' = ' + arc + ' m. Bottom edge = ' + W + ' + ' + r + ' = ' + B + ' m. Distance = ' + H + ' + ' + W + ' + ' + arc + ' + ' + B + ' = ' + ans + ' m.', '22/7',
      [[ans + r, 'counted-inside-line'], [ans - r, 'forgot-part'], [H + W + M(2 * r) + B, 'whole-circumference']]);
    return fig(P2(q, [
      'The dashed radius is inside the land, so it is not part of the edge.',
      'Curved edge = 1/4 × 2 × 22/7 × ' + r + ' = ' + arc + ' m.',
      'The bottom edge runs under the rectangle and the quarter circle: ' + W + ' + ' + r + ' = ' + B + ' m.',
      'Distance = ' + H + ' + ' + W + ' + ' + arc + ' + ' + B + ' = <b>' + ans + '</b> m.'
    ]), f);
  }

  /* the segment: a quarter circle minus the right triangle on its two radii */
  function gSegment() {
    const U = pick(['cm', 'm']);
    const p = Math.random() < 0.7 ? '22/7' : '3.14', M = PI[p];
    const r = p === '22/7' ? 14 * ri(1, 5) : 20 * ri(1, 3);
    const Q = M(r * r) / 4, Tr = r * r / 2, ans = Q - Tr;
    const q = typed('The figure shows a quarter circle. A straight line joins the ends of its curved edge, making a right-angled triangle with the two radii. ' +
      'The part between the straight line and the curved edge is shaded. ' + take(p) + ' What is the area of the shaded part, in ' + U + '²?', ans, U + '²',
      'Quarter circle = 1/4 × ' + p + ' × ' + r + ' × ' + r + ' = ' + fmt(Q) + ' ' + U + '². Triangle = 1/2 × ' + r + ' × ' + r + ' = ' + Tr + ' ' + U + '². Shaded part = ' + fmt(Q) + ' − ' + Tr + ' = ' + ans + ' ' + U + '².', p,
      [[Q, 'forgot-part'], [Tr, 'wrong-region'], [Q + Tr, 'added-cut-part'], [M(r * r) - Tr, 'whole-circle']]);
    return fig(P2(q, [
      'The shaded part is the quarter circle with the white right-angled triangle taken away.',
      'Area of the quarter circle = ' + (p === '22/7' ? '1/4 × 22/7 × ' + r + ' × ' + r : r + ' × ' + r + ' × 3.14 ÷ 4') + ' = ' + fmt(Q) + ' ' + U + '².',
      'The triangle has base ' + r + ' ' + U + ' and height ' + r + ' ' + U + ': 1/2 × ' + r + ' × ' + r + ' = ' + Tr + ' ' + U + '².',
      'Shaded part = ' + fmt(Q) + ' − ' + Tr + ' = <b>' + ans + '</b> ' + U + '².'
    ]), cfSeg(r, U));
  }

  /* the leaf: two quarter circles in a square, their overlap shaded */
  function gLeaf() {
    const U = pick(['cm', 'm']);
    const area = Math.random() < 0.5;
    const p = area && Math.random() < 0.4 ? '3.14' : '22/7', M = PI[p];
    const a = p === '3.14' ? 20 * ri(1, 3) : 14 * ri(1, 5);
    const stem0 = 'The figure shows a square. Two quarter circles are drawn inside it, each centred on a corner of the square, at opposite corners. ' +
      'The part where they overlap is shaded. ' + take(p);
    if (area) {
      const Q = M(a * a) / 4, S = a * a, ans = 2 * Q - S;
      const q = typed(stem0 + ' What is the area of the shaded part, in ' + U + '²?', ans, U + '²',
        'Each quarter circle = ' + fmt(Q) + ' ' + U + '². Together they cover the square once and the shaded part twice, so the shaded part = ' + fmt(Q) + ' + ' + fmt(Q) + ' − ' + S + ' = ' + ans + ' ' + U + '².', p,
        [[2 * Q, 'overlap-not-removed'], [S - Q, 'wrong-region'], [Q, 'forgot-part'], [2 * (S - Q), 'wrong-region']]);
      return fig(P2(q, [
        'Each quarter circle has radius ' + a + ' ' + U + ', the side of the square.',
        'Area of one quarter circle = ' + (p === '22/7' ? '1/4 × 22/7 × ' + a + ' × ' + a : a + ' × ' + a + ' × 3.14 ÷ 4') + ' = ' + fmt(Q) + ' ' + U + '².',
        'The two quarter circles cover the square once and the shaded part twice. Square = ' + a + ' × ' + a + ' = ' + S + ' ' + U + '².',
        'Shaded part = ' + fmt(Q) + ' + ' + fmt(Q) + ' − ' + S + ' = <b>' + ans + '</b> ' + U + '².'
      ]), cfLeaf(a, U));
    }
    const arc = M(2 * a) / 4, ans = 2 * arc;
    const q = typed(stem0 + ' What is the perimeter of the shaded part, in ' + U + '?', ans, U,
      'The shaded part has two curved edges, each a quarter of a circle of radius ' + a + ' ' + U + ': 1/4 × 2 × 22/7 × ' + a + ' = ' + arc + ' ' + U + '. Perimeter = ' + arc + ' + ' + arc + ' = ' + ans + ' ' + U + '.', p,
      [[arc, 'forgot-part'], [ans + 2 * a, 'added-square-sides'], [2 * arc + 4 * a, 'added-square-sides'], [4 * arc, 'whole-circumference']]);
    return fig(P2(q, [
      'The shaded part has no straight edges: its edge is two curved edges.',
      'Each curved edge is a quarter of a circle with radius ' + a + ' ' + U + '.',
      'One curved edge = 1/4 × 2 × 22/7 × ' + a + ' = ' + arc + ' ' + U + '.',
      'Perimeter = ' + arc + ' + ' + arc + ' = <b>' + ans + '</b> ' + U + '.'
    ]), cfLeaf(a, U));
  }

  MQI.registerTopic({
    id: 'p6circles', level: 'P6', strand: 'Measurement and Geometry',
    moeSubTopic: 'Area and Circumference of Circle: area and circumference of circle; finding the area and perimeter of semicircle, quarter circle; finding the area and perimeter of composite figures made up of square, rectangle, triangle, semicircle and quarter circle',
    label: 'Circle Cove', short: 'Circles', e: '⭕',
    skills: {
      circ:      { label: 'Circumference', tip: 'Circumference = π × diameter. Check first: is the number on the picture the radius or the diameter?' },
      area:      { label: 'Area of a circle', tip: 'Area = π × radius × radius. Halve a diameter before you use it.' },
      semi:      { label: 'Semicircles', tip: 'Half the circle for the curved edge, then ADD the straight diameter for the perimeter.' },
      quarter:   { label: 'Quarter circles', tip: 'A quarter circle has one curved edge and two straight radii. Count all three for the perimeter.' },
      backwards: { label: 'Working backwards', tip: 'Circumference ÷ π gives the diameter; halve it for the radius.' },
      composite: { label: 'Composite figures', tip: 'Trace the edge with a finger and list each piece; dashed lines inside the figure are not edges.' }
    },
    misconceptions: {
      'radius-for-diameter':    'Uses the radius where the diameter is needed.',
      'diameter-for-radius':    'Uses the diameter where the radius is needed.',
      'area-for-circumference': 'Works out an area when the question asks for a length round the edge.',
      'circumference-for-area': 'Works out the circumference when the question asks for the area.',
      'no-square':              'Multiplies π by the radius once instead of by radius × radius.',
      'doubled':                'Puts an extra × 2 into the area formula.',
      'semicircle-perimeter':   'Gives the perimeter of a semicircle (half the curved edge plus the diameter) for a whole circle.',
      'halved-twice':           'Halves the diameter twice, giving half the radius.',
      'doubled-diameter':       'Doubles the diameter, as if it were the radius.',
      'wrong-region':           'Finds the area of an unshaded piece instead of the shaded part.',
      'overlap-not-removed':    'Adds the two quarter circles but does not take away the square, so the overlap is counted twice.',
      'forgot-diameter':        'Gives only the curved edge of a semicircle; its perimeter also includes the straight diameter.',
      'forgot-radii':           'Gives only the curved edge of a quarter circle; its perimeter also includes the two straight radii.',
      'one-radius':             'Adds only one of the quarter circle\'s two straight edges.',
      'whole-circle':           'Uses the whole circle instead of the half or quarter in the figure.',
      'half-for-quarter':       'Halves the circle when the figure has only a quarter of it.',
      'whole-circumference':    'Uses the whole circumference for a curved edge that is only part of a circle.',
      'counted-inside-line':    'Adds a line inside the figure (a dashed diameter or radius) to its perimeter.',
      'added-square-sides':     'Adds sides of the square, which are not edges of the shaded part.',
      'forgot-part':            'Leaves out one of the pieces that make up the figure.',
      'added-cut-part':         'Adds the cut-out piece instead of taking it away.',
      'used-whole-rectangle':   'Uses the rectangle\'s full sides after part of them was cut away.',
      'radius-diameter-swap':   'Gives the radius when asked for the diameter, or the other way round.'
    },
    pools: {
      1: [[gCircumference, 'circ'], [gCircleArea, 'area'], [gSemiArea, 'semi']],
      2: [[gCircleTyped, 'circ'], [gSemiPerimeter, 'semi'], [gQuarterPerimeter, 'quarter'], [gQuarterArea, 'quarter'], [gFromCircumference, 'backwards']],
      3: [[gGardenSemi, 'composite'], [gTrack, 'circ'], [gCornerCut, 'quarter'], [gSemiCut, 'semi'], [gFanShape, 'composite'], [gSegment, 'quarter'], [gLeaf, 'quarter']]
    }
  });
})();
