"use strict";
/* Math Quest Island topic: p6quads (P6). Self-contained. Typed + MC, every item drawn.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, p.43, PRIMARY SIX,
 * MEASUREMENT AND GEOMETRY, SUB-STRAND: GEOMETRY, 1. Special Quadrilaterals):
 *   1.1 finding unknown angles, without additional construction of lines, in composite
 *       geometric figures involving square, rectangle, triangle, parallelogram, rhombus,
 *       trapezium
 * Facts a child may use (all taught by P5, js/topics/p5-shapes.js + p5-angles.js):
 * angles on a straight line, at a point, angle sum of a triangle, isosceles and
 * equilateral triangles, right angles of a rectangle/square, opposite angles of a
 * parallelogram/rhombus are equal, and the two angles between a pair of parallel sides
 * add up to 180 deg (parallelogram, rhombus, trapezium). NEVER alternate or corresponding
 * angles (secondary school), and every line a solution needs is already drawn.
 *
 * THE FIGURE is the existing 'geom' type, STRICTLY TO SCALE: every point is built from
 * the given angles with exact trigonometry, so an angle on the glass IS the angle in the
 * stem. Every given angle is printed twice (in the stem and as an arc label on the
 * figure); the unknown is the arc labelled x and is also named in the stem. The oracle
 * (tools/oracles/p6quads.mjs) re-measures every labelled arc off the RENDERED drawing,
 * checks each shape claim (parallel sides parallel, equal sides equal, points on lines),
 * and re-derives the key from the stem's numbers by its own route.
 *
 * House pattern (js/topics/p6-ratio.js): q.syl = 'P6'; MCQ distractors carry q.miscon +
 * q.optionFeedback; typed items carry q.slips and declare '°'; pool 3 is PSLE Paper 2
 * shape (band 3, q.exam = 'problem', technique + 3-5 steps whose equations are all true).
 * Equations in steps are written without the degree sign so the coaching check reads them.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishTyped = G.finishTyped;

  const DEG = '°';
  /* five letters per figure: four for the quadrilateral (in order round it) + one extra
     point. No X (it would sit beside the unknown x). */
  const LETTERS = [['A', 'B', 'C', 'D', 'E'], ['P', 'Q', 'R', 'S', 'T'], ['K', 'L', 'M', 'N', 'P'],
                   ['E', 'F', 'G', 'H', 'J'], ['J', 'K', 'L', 'M', 'N'], ['W', 'V', 'U', 'T', 'S']];
  const P6 = q => (q.syl = 'P6', q);
  const rad = d => d * Math.PI / 180;
  const pol = (p, deg, len) => [p[0] + len * Math.cos(rad(deg)), p[1] + len * Math.sin(rad(deg))];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const sub = (p, v) => [p[0] - v[0], p[1] - v[1]];
  const dist = (p, v) => Math.hypot(p[0] - v[0], p[1] - v[1]);
  const evenIn = (lo, hi) => 2 * ri(Math.ceil(lo / 2), Math.floor(hi / 2));

  /* A letter set, an angle namer and a shape namer over ROLE letters A..E. */
  function namer() {
    const set = pick(LETTERS), L = { A: set[0], B: set[1], C: set[2], D: set[3], E: set[4] };
    const nm = s => s.split('').map(c => L[c]).join('');
    return { L, nm, ang: s => '∠' + nm(s) };
  }

  /* Points in MATH coordinates (y up) -> a 'geom' spec, scaled into an 11 x 7 box.
     segs: ['AB', ...]; arcs: [['DAE', label], ...] marks the angle at the MIDDLE letter. */
  function spec(P, segs, arcs, L) {
    const roles = Object.keys(P);
    const xs = roles.map(r => P[r][0]), ys = roles.map(r => P[r][1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const W = maxX - minX, H = maxY - minY, k = Math.min(11 / W, 7 / H);
    const ix = r => roles.indexOf(r);
    return {
      type: 'geom', cols: +(W * k).toFixed(3), rows: +(H * k).toFixed(3), grid: 0,
      px: roles.map(r => +((P[r][0] - minX) * k).toFixed(3)),
      py: roles.map(r => +((maxY - P[r][1]) * k).toFixed(3)),
      names: roles.map(r => L[r]),
      segs: segs.map(s => [ix(s[0]), ix(s[1])]),
      arcs: arcs.map(a => [ix(a[0][1]), ix(a[0][0]), ix(a[0][2])]),
      arcNames: arcs.map(a => a[1]),
      panels: [], pp: []
    };
  }
  const fig = (q, f) => (q.figure = f, q.extra = '', q);

  function mcq(stem, key, dist, explain) {
    const seen = [key], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      if (!(Number.isInteger(d[0]) && d[0] > 0 && d[0] < 180) || seen.indexOf(d[0]) !== -1) continue;
      seen.push(d[0]); keep.push(d);
    }
    if (keep.length < 3) return null;
    const rows = shuffle([[key, null, null]].concat(keep));
    const q = { q: stem, extra: '', choices: rows.map(r => r[0] + DEG), correct: 0, explain, answerText: key + DEG };
    q.correct = rows.findIndex(r => r[1] === null);
    q.miscon = {}; q.optionFeedback = {};
    rows.forEach((r, i) => { if (r[1]) { q.miscon[i] = r[1]; q.optionFeedback[i] = r[2]; } });
    return P6(q);
  }
  function typed(stem, key, explain, list) {
    const q = finishTyped(stem, key, explain, DEG);
    q.answerText = key + DEG;
    const s = {};
    for (const [v, tag] of list) if (Number.isInteger(v) && v > 0 && v < 360 && v !== key && !(String(v) in s)) s[String(v)] = tag;
    q.slips = s;
    return P6(q);
  }
  const P2 = (q, steps) => (q.band = 3, q.exam = 'problem', q.technique = 'Sketch and label', q.steps = steps, q);

  /* parallelogram / rhombus: A at the origin, AB along the base, angle a at A */
  function para(w, len, a) {
    const A = [0, 0], B = [w, 0], D = pol(A, a, len), C = add(B, D);
    return { A, B, C, D };
  }

  /* ---------------- pool 1 ---------------- */

  /* rectangle + triangle: E on DC, AE drawn. p = angle DAE fixes the figure; ONE of the four
     angles round AE is given (only one of at least 50 deg, so its label sits clear of the
     arms) and a different one, of a different size, is asked. */
  function gRectTri() {
    const p = ri(30, 55);   /* every angle round AE is at least 30, so an x label always fits its wedge */
    if (p === 45) return gRectTri();
    const { L, nm, ang } = namer();
    const H = 6, W = 10;
    const P = { A: [0, H], B: [W, H], C: [W, 0], D: [0, 0], E: [H * Math.tan(rad(p)), 0] };
    const V = { DAE: p, BAE: 90 - p, AED: 90 - p, AEC: 90 + p };
    const given = pick(Object.keys(V).filter(k => V[k] >= 50));
    const mode = pick(Object.keys(V).filter(k => k !== given && V[k] !== V[given]));
    const v = V[given], key = V[mode];
    const stem = 'In the figure, ' + nm('ABCD') + ' is a rectangle and ' + L.E + ' is a point on ' + nm('DC') + '. ' +
      ang(given) + ' = ' + v + DEG + '. Find ' + ang(mode) + ', marked x.';
    const toP = {
      DAE: '',
      BAE: 'The corner ' + ang('DAB') + ' is a right angle, so ' + ang('DAE') + ' = 90' + DEG + ' − ' + v + DEG + ' = ' + p + DEG + '. ',
      AED: 'In triangle ' + nm('ADE') + ', ' + ang('ADE') + ' = 90' + DEG + ', so ' + ang('DAE') + ' = 180' + DEG + ' − 90' + DEG + ' − ' + v + DEG + ' = ' + p + DEG + '. ',
      AEC: nm('DEC') + ' is a straight line, so ' + ang('AED') + ' = 180' + DEG + ' − ' + v + DEG + ' = ' + (90 - p) + DEG + ', and in triangle ' + nm('ADE') + ' ' +
        ang('DAE') + ' = 180' + DEG + ' − 90' + DEG + ' − ' + (90 - p) + DEG + ' = ' + p + DEG + '. '
    }[given];
    const toKey = {
      DAE: 'x = ' + p + DEG + '.',
      BAE: 'x = 90' + DEG + ' − ' + p + DEG + ' = ' + key + DEG + ' (the rest of the right angle at ' + L.A + ').',
      AED: 'In triangle ' + nm('ADE') + ', x = 180' + DEG + ' − 90' + DEG + ' − ' + p + DEG + ' = ' + key + DEG + '.',
      AEC: ang('AED') + ' = 90' + DEG + ' − ' + p + DEG + ' = ' + (90 - p) + DEG + ', and ' + nm('DEC') + ' is a straight line, so x = 180' + DEG + ' − ' + (90 - p) + DEG + ' = ' + key + DEG + '.'
    }[mode];
    const q = mcq(stem, key, [
      [v, 'copied-given', 'That is the angle given in the question. x is the angle marked at ' + L[mode[1]] + '.'],
      [180 - key, 'interior-exterior', 'That angle and x would add up to 180' + DEG + '. Check which angle the x is drawn in.'],
      [key < 90 ? 90 + key : key - 90, 'missed-right-angle', 'Use the right angle at the corner of the rectangle carefully: it is 90' + DEG + ' and it is not x.'],
      [180 - v, 'interior-exterior', 'That is 180' + DEG + ' take away the given angle. Start from the 90' + DEG + ' corners of the rectangle.']
    ], toP + toKey);
    if (!q) return gRectTri();
    return fig(q, spec(P, ['AB', 'BC', 'CD', 'DA', 'AE'], [[given, v + DEG], [mode, 'x']], L));
  }

  /* trapezium + diagonal: given the angle at D and the part of the angle at A */
  function gTrapDiag() {
    for (let t = 0; t < 300; t++) {
      const d = ri(12, 23) * 5, p = ri(10, 14) * 5, c3 = 180 - d - p, e = ri(60, 115);   /* given angles >= 50: their labels sit clear of the arms */
      if (c3 < 30 || c3 === p || c3 === d || d === 90 || Math.abs(e - d) < 6) continue;   /* key never a printed angle; AD not parallel to BC */   /* AD must not be parallel to BC */
      const c = 10, AD = c * Math.sin(rad(c3)) / Math.sin(rad(p));
      const D = [0, 0], C = [c, 0], A = pol(D, d, AD), h = A[1];
      const B = [c + h / Math.tan(rad(e)), h];
      if (B[0] - A[0] < 3 || h < 2.5) continue;
      const { L, nm, ang } = namer();
      const key = 180 - d - p;
      const stem = 'In the figure, ' + nm('ABCD') + ' is a trapezium with ' + nm('AB') + ' parallel to ' + nm('DC') + ', and ' + nm('AC') +
        ' is a diagonal. ' + ang('ADC') + ' = ' + d + DEG + ' and ' + ang('DAC') + ' = ' + p + DEG + '. Find ' + ang('CAB') + ', marked x.';
      const q = mcq(stem, key, [
        [180 - d, 'stopped-early', 'That is the whole of ' + ang('DAB') + '. Take ' + ang('DAC') + ' away from it.'],
        [d - p, 'parallel-angles-equal', ang('DAB') + ' is not equal to ' + ang('ADC') + '. Because ' + nm('AB') + ' is parallel to ' + nm('DC') + ', they add up to 180' + DEG + '.'],
        [180 - p, 'missed-angle', 'Both given angles are needed: ' + ang('ADC') + ' tells you the whole angle at ' + L.A + '.'],
        [p, 'copied-given', 'That is ' + ang('DAC') + ', the other part of the angle at ' + L.A + '.']
      ], ang('DAB') + ' + ' + ang('ADC') + ' = 180' + DEG + ' (' + nm('AB') + ' is parallel to ' + nm('DC') + '), so ' + ang('DAB') + ' = ' + (180 - d) + DEG +
        '. x = ' + (180 - d) + DEG + ' − ' + p + DEG + ' = ' + key + DEG + '.');
      if (!q) continue;
      return fig(q, spec({ A, B, C, D }, ['AB', 'BC', 'CD', 'DA', 'AC'], [['ADC', d + DEG], ['DAC', p + DEG], ['CAB', 'x']], L));
    }
    return gRectTri();
  }

  /* ---------------- pool 2 ---------------- */

  /* parallelogram + triangle: E on AB, DE drawn */
  function gParaPoint() {
    for (let t = 0; t < 300; t++) {
      const a = ri(55, 80), dd = ri(50, 65), aed = 180 - a - dd;   /* given angles >= 50: their labels sit clear of the arms */
      if (aed < 40) continue;
      const len = 6, w = 11;
      const P = para(w, len, a), AE = len * Math.sin(rad(dd)) / Math.sin(rad(aed));
      if (AE < 2 || AE > w - 2.5) continue;
      P.E = [AE, 0];
      const { L, nm, ang } = namer();
      const mode = pick(['DEB', 'EDC']);
      const key = mode === 'DEB' ? a + dd : 180 - a - dd;
      if (key === a || key === dd) continue;   /* the key is never a printed angle */
      const stem = 'In the figure, ' + nm('ABCD') + ' is a parallelogram and ' + L.E + ' is a point on ' + nm('AB') + '. ' + ang('DAB') + ' = ' + a + DEG +
        ' and ' + ang('ADE') + ' = ' + dd + DEG + '. Find ' + ang(mode) + ', marked x.';
      const why = mode === 'DEB'
        ? ang('AED') + ' = 180' + DEG + ' − ' + a + DEG + ' − ' + dd + DEG + ' = ' + aed + DEG + '. ' + nm('AEB') + ' is a straight line, so x = 180' + DEG + ' − ' + aed + DEG + ' = ' + key + DEG + '.'
        : ang('ADC') + ' = 180' + DEG + ' − ' + a + DEG + ' = ' + (180 - a) + DEG + ' (angles between the parallel sides). x = ' + (180 - a) + DEG + ' − ' + dd + DEG + ' = ' + key + DEG + '.';
      const q = typed(stem, key, why, mode === 'DEB'
        ? [[aed, 'interior-exterior'], [180 - dd, 'missed-angle'], [a, 'copied-given']]
        : [[180 - a, 'stopped-early'], [a - dd, 'parallel-angles-equal'], [dd, 'copied-given']]);
      return fig(q, spec(P, ['AB', 'BC', 'CD', 'DA', 'DE'], [['DAB', a + DEG], ['ADE', dd + DEG], [mode, 'x']], L));
    }
    return gRectTri();
  }

  /* rhombus + its diagonal: the two triangles are isosceles */
  function gRhombusDiag() {
    const { L, nm, ang } = namer();
    const mode = pick(['B', 'D', 'A']);
    const g = evenIn(50, 118);   /* key (180 - g) / 2 is at least 31: room for the x label */
    if (g === 90 || g === 60) return gRhombusDiag();   /* 60/120: the key would equal a printed or halved angle */
    const a = 180 - g;                                  /* the angle at A that builds the rhombus; the given is never at A or C (the diagonal would strike its label) */
    const P = para(8, 8, a);
    let stem, key, why, slipList, arcs;
    if (mode === 'B') {
      key = (180 - g) / 2;
      stem = 'In the figure, ' + nm('ABCD') + ' is a rhombus and ' + nm('AC') + ' is a diagonal. ' + ang('ABC') + ' = ' + g + DEG + '. Find ' + ang('BAC') + ', marked x.';
      why = nm('BA') + ' = ' + nm('BC') + ', so triangle ' + nm('ABC') + ' is isosceles. x = (180' + DEG + ' − ' + g + DEG + ') ÷ 2 = ' + key + DEG + '.';
      slipList = [[180 - g, 'not-halved'], [g / 2, 'halved-given'], [g, 'copied-given']];
      arcs = [['ABC', g + DEG], ['BAC', 'x']];
    } else if (mode === 'D') {
      key = (180 - g) / 2;
      stem = 'In the figure, ' + nm('ABCD') + ' is a rhombus and ' + nm('AC') + ' is a diagonal. ' + ang('ADC') + ' = ' + g + DEG + '. Find ' + ang('DCA') + ', marked x.';
      why = nm('DA') + ' = ' + nm('DC') + ', so triangle ' + nm('ADC') + ' is isosceles. x = (180' + DEG + ' − ' + g + DEG + ') ÷ 2 = ' + key + DEG + '.';
      slipList = [[180 - g, 'not-halved'], [g / 2, 'halved-given'], [g, 'copied-given']];
      arcs = [['ADC', g + DEG], ['DCA', 'x']];
    } else {
      key = (180 - g) / 2;
      stem = 'In the figure, ' + nm('ABCD') + ' is a rhombus and ' + nm('AC') + ' is a diagonal. ' + ang('ADC') + ' = ' + g + DEG + '. Find ' + ang('BAC') + ', marked x.';
      why = 'Opposite angles of a rhombus are equal, so ' + ang('ABC') + ' = ' + g + DEG + '. ' + nm('BA') + ' = ' + nm('BC') + ', so x = (180' + DEG + ' − ' + g + DEG + ') ÷ 2 = ' + key + DEG + '.';
      slipList = [[g, 'copied-given'], [180 - g, 'not-halved'], [g / 2, 'halved-given']];
      arcs = [['ADC', g + DEG], ['BAC', 'x']];
    }
    return fig(typed(stem, key, why, slipList), spec(P, ['AB', 'BC', 'CD', 'DA', 'AC'], arcs, L));
  }

  /* square + a triangle on side BC with BE = BC. Half the draws: the isosceles triangle with
     a printed apex angle k (the key moves with k); half: the classic equilateral triangle. */
  function gSquareEquil() {
    const { L, nm, ang } = namer();
    if (Math.random() < 0.5) return gSquareIsos(L, nm, ang);
    const inside = Math.random() < 0.5, s = 6, h = s * Math.sin(rad(60));
    const P = { A: [0, s], B: [s, s], C: [s, 0], D: [0, 0], E: inside ? [s - h, s / 2] : [s + h, s / 2] };
    const mode = pick(inside ? ['BAE', 'AEB', 'AED'] : ['ABE', 'DAE', 'AEC']);
    const KEY = { BAE: 75, AEB: 75, AED: 150, ABE: 150, DAE: 75, AEC: 45 };
    const key = KEY[mode];
    const where = inside ? 'inside' : 'outside';
    const stem = 'In the figure, ' + nm('ABCD') + ' is a square and ' + nm('BCE') + ' is an equilateral triangle. ' + L.E + ' lies ' + where +
      ' the square. Find ' + ang(mode) + ', marked x.';
    const eq = 'Every angle of the equilateral triangle is 60' + DEG + '. ';
    const WHY = {
      BAE: eq + ang('ABE') + ' = 90' + DEG + ' − 60' + DEG + ' = 30' + DEG + '. ' + nm('BA') + ' = ' + nm('BE') + ', so x = (180' + DEG + ' − 30' + DEG + ') ÷ 2 = 75' + DEG + '.',
      AEB: eq + ang('ABE') + ' = 90' + DEG + ' − 60' + DEG + ' = 30' + DEG + '. ' + nm('BA') + ' = ' + nm('BE') + ', so x = (180' + DEG + ' − 30' + DEG + ') ÷ 2 = 75' + DEG + '.',
      AED: eq + 'Triangles ' + nm('ABE') + ' and ' + nm('DCE') + ' are isosceles with 30' + DEG + ' at the top, so ' + ang('AEB') + ' = ' + ang('DEC') + ' = 75' + DEG +
        '. Angles at a point: x = 360' + DEG + ' − 75' + DEG + ' − 60' + DEG + ' − 75' + DEG + ' = 150' + DEG + '.',
      ABE: eq + 'x = 90' + DEG + ' + 60' + DEG + ' = 150' + DEG + '.',
      DAE: eq + ang('ABE') + ' = 150' + DEG + ' and ' + nm('BA') + ' = ' + nm('BE') + ', so ' + ang('BAE') + ' = (180' + DEG + ' − 150' + DEG + ') ÷ 2 = 15' + DEG +
        '. x = 90' + DEG + ' − 15' + DEG + ' = 75' + DEG + '.',
      AEC: eq + ang('ABE') + ' = 150' + DEG + ' and ' + nm('BA') + ' = ' + nm('BE') + ', so ' + ang('AEB') + ' = 15' + DEG + '. x = 60' + DEG + ' − 15' + DEG + ' = 45' + DEG + '.'
    };
    const tri = ' is a corner of the equilateral triangle only.';
    const iso = [[30, 'stopped-early', '30' + DEG + ' is the angle between the side of the square and the side of the triangle. Use the isosceles triangle it sits in.'],
           [60, 'equilateral-everywhere', '60' + DEG + tri + ' x is not one of its corners.'],
           [150, 'not-halved', 'After taking the top angle from 180' + DEG + ', share what is left equally between the two equal angles.']];
    const DIST = {
      BAE: iso, AEB: iso,
      AED: [[75, 'stopped-early', '75' + DEG + ' is one of the base angles. Use the angles at the point ' + L.E + ': they add up to 360' + DEG + '.'],
            [60, 'equilateral-everywhere', '60' + DEG + tri],
            [90, 'square-corner', '90' + DEG + ' is a corner of the square. x is at ' + L.E + '.']],
      ABE: [[30, 'subtracted-not-added', L.E + ' is outside the square, so the two corners add: 90' + DEG + ' + 60' + DEG + '.'],
            [60, 'equilateral-everywhere', '60' + DEG + tri],
            [90, 'square-corner', '90' + DEG + ' is only the corner of the square. Add the corner of the triangle.']],
      DAE: [[15, 'stopped-early', '15' + DEG + ' is ' + ang('BAE') + '. x is the rest of the 90' + DEG + ' corner at ' + L.A + '.'],
            [105, 'added-not-subtracted', 'x is part of the 90' + DEG + ' corner at ' + L.A + ', so take 15' + DEG + ' away from 90' + DEG + '.'],
            [60, 'equilateral-everywhere', '60' + DEG + tri]],
      AEC: [[15, 'stopped-early', '15' + DEG + ' is ' + ang('AEB') + '. x is the rest of the 60' + DEG + ' corner at ' + L.E + '.'],
            [60, 'equilateral-everywhere', '60' + DEG + ' is the whole corner at ' + L.E + '; x is only part of it.'],
            [75, 'wrong-angle', 'That is an angle at ' + L.A + '. x is at ' + L.E + '.']]
    };
    const q = mcq(stem, key, DIST[mode], WHY[mode]);
    /* AE only when the asked angle uses it (it would cross the x label at B otherwise) */
    const segs = ['AB', 'BC', 'CD', 'DA', 'BE', 'CE'].concat(mode === 'ABE' ? [] : ['AE'], mode === 'AED' ? ['DE'] : []);
    return fig(q, spec(P, segs, [[mode, 'x']], L));
  }

  function gSquareIsos(L, nm, ang) {
    const inside = Math.random() < 0.5, s = 6;
    const k = inside ? evenIn(50, 66) : evenIn(50, 86);   /* inside above 66 puts E too near the side AD */
    const B = [s, s], E = pol(B, inside ? -90 - k : -90 + k, s);
    const P = { A: [0, s], B, C: [s, 0], D: [0, 0], E };
    const abe = inside ? 90 - k : 90 + k, bae = (180 - abe) / 2;
    const mode = inside ? pick(['BAE', 'AEB']) : 'DAE';
    const key = inside ? bae : 90 - bae;
    const stem = 'In the figure, ' + nm('ABCD') + ' is a square and ' + nm('BCE') + ' is a triangle with ' + nm('BE') + ' = ' + nm('BC') + '. ' + ang('EBC') + ' = ' + k + DEG +
      '. ' + L.E + ' lies ' + (inside ? 'inside' : 'outside') + ' the square. Find ' + ang(mode) + ', marked x.';
    const why = (inside ? ang('ABE') + ' = 90' + DEG + ' − ' + k + DEG + ' = ' + abe + DEG : ang('ABE') + ' = 90' + DEG + ' + ' + k + DEG + ' = ' + abe + DEG) +
      '. ' + nm('BA') + ' = ' + nm('BC') + ' = ' + nm('BE') + ', so triangle ' + nm('ABE') + ' is isosceles and ' + ang('BAE') + ' = ' + ang('AEB') + ' = (180' + DEG + ' − ' + abe + DEG + ') ÷ 2 = ' + bae + DEG + '.' +
      (inside ? '' : ' x = 90' + DEG + ' − ' + bae + DEG + ' = ' + key + DEG + '.');
    const q = mcq(stem, key, inside ? [
      [abe, 'stopped-early', 'That is ' + ang('ABE') + ', the angle at the top of triangle ' + nm('ABE') + '. Now find its two equal angles.'],
      [180 - abe, 'not-halved', 'After taking ' + ang('ABE') + ' from 180' + DEG + ', share what is left equally between the two equal angles.'],
      [k, 'copied-given', 'That is the given angle at ' + L.B + '. x is the angle marked x.'],
      [(90 - k) / 2 + 45, 'wrong-angle', 'Check which angle the x is drawn in.']
    ] : [
      [bae, 'stopped-early', 'That is ' + ang('BAE') + '. x is the rest of the 90' + DEG + ' corner at ' + L.A + '.'],
      [abe, 'subtracted-not-added', 'That is ' + ang('ABE') + ', at ' + L.B + '. x is at ' + L.A + '.'],
      [k, 'copied-given', 'That is the given angle at ' + L.B + '. x is the angle marked x.'],
      [90 + bae, 'added-not-subtracted', 'x is part of the 90' + DEG + ' corner at ' + L.A + ', so take ' + ang('BAE') + ' away from 90' + DEG + '.']
    ], why);
    return fig(q, spec(P, ['AB', 'BC', 'CD', 'DA', 'BE', 'CE', 'AE'], [['EBC', k + DEG], [mode, 'x']], L));
  }

  /* ---------------- pool 3: Paper 2 composite figures ---------------- */

  /* parallelogram + isosceles triangle on the extended side: ABE straight, CB = CE */
  function gParaIsos() {
    const { L, nm, ang } = namer();
    const a = ri(50, 75), viaD = Math.random() < 0.5, g = 180 - a;   /* x = 180 - 2a is at least 30 */
    if (a === 60) return gParaIsos();   /* x = 180 - 2a would equal the printed 60 */
    const P = para(7, 6, a);
    P.E = [7 + 2 * 6 * Math.cos(rad(a)), 0];
    const key = 180 - 2 * a;
    const given = viaD ? ang('ADC') + ' = ' + g + DEG : ang('DAB') + ' = ' + a + DEG;
    const stem = 'In the figure, ' + nm('ABCD') + ' is a parallelogram and ' + nm('ABE') + ' is a straight line. ' + nm('CB') + ' = ' + nm('CE') +
      ' and ' + given + '. Find ' + ang('BCE') + ', marked x.';
    const first = viaD
      ? 'Opposite angles of a parallelogram are equal: ' + ang('ABC') + ' = ' + ang('ADC') + ' = ' + g + DEG + '.'
      : 'Angles between the parallel sides add up to 180' + DEG + ': ' + ang('ABC') + ' = 180 − ' + a + ' = ' + g + DEG + '.';
    const q = typed(stem, key, 'x = 180' + DEG + ' − ' + a + DEG + ' − ' + a + DEG + ' = ' + key + DEG + '.',
      [[a, 'answered-base-angle'], [g, 'stopped-early'], [2 * a, 'not-from-180']]);
    q.explain = first + ' ' + nm('ABE') + ' is a straight line, so ' + ang('CBE') + ' = 180' + DEG + ' − ' + g + DEG + ' = ' + a + DEG + '. ' + nm('CB') + ' = ' + nm('CE') +
      ', so ' + ang('CEB') + ' = ' + a + DEG + ' too, and x = 180' + DEG + ' − ' + a + DEG + ' − ' + a + DEG + ' = ' + key + DEG + '.';
    P2(q, [
      first,
      nm('ABE') + ' is a straight line: ' + ang('CBE') + ' = 180 − ' + g + ' = ' + a + DEG + '.',
      nm('CB') + ' = ' + nm('CE') + ', so triangle ' + nm('BCE') + ' is isosceles and ' + ang('CEB') + ' = ' + ang('CBE') + ' = ' + a + DEG + '.',
      'Angles of triangle ' + nm('BCE') + ': x = 180 − ' + a + ' − ' + a + ' = <b>' + key + DEG + '</b>.'
    ]);
    return fig(q, spec(P, ['AE', 'BC', 'CD', 'DA', 'CE'], [[viaD ? 'ADC' : 'DAB', (viaD ? g : a) + DEG], ['BCE', 'x']], L));
  }

  /* trapezium + diagonal, with an isosceles triangle: DA = DC */
  function gTrapIsos() {
    for (let t = 0; t < 400; t++) {
      const d = evenIn(60, 120), e = ri(55, 115), half = (180 - d) / 2, key = 180 - e - half;
      if (key < 30 || d === 90 || key === half || key === d || key === e || Math.abs(e - d) < 6) continue;   /* key never a printed angle */   /* AD must not be parallel to BC */
      const c = 8, D = [0, 0], C = [c, 0], A = pol(D, d, c), h = A[1];
      const B = [c + h / Math.tan(rad(e)), h];
      if (B[0] - A[0] < 2.5) continue;
      const { L, nm, ang } = namer();
      const stem = 'In the figure, ' + nm('ABCD') + ' is a trapezium with ' + nm('AB') + ' parallel to ' + nm('DC') + ', and ' + nm('AC') + ' is a diagonal. ' +
        nm('DA') + ' = ' + nm('DC') + ', ' + ang('ADC') + ' = ' + d + DEG + ' and ' + ang('ABC') + ' = ' + e + DEG + '. Find ' + ang('ACB') + ', marked x.';
      const q = typed(stem, key, 'Triangle ' + nm('ADC') + ' is isosceles, so ' + ang('DAC') + ' = (180' + DEG + ' − ' + d + DEG + ') ÷ 2 = ' + half + DEG + '. ' +
        ang('DAB') + ' = 180' + DEG + ' − ' + d + DEG + ' = ' + (180 - d) + DEG + ', so ' + ang('CAB') + ' = ' + (180 - d) + DEG + ' − ' + half + DEG + ' = ' + half + DEG +
        '. In triangle ' + nm('ABC') + ', x = 180' + DEG + ' − ' + half + DEG + ' − ' + e + DEG + ' = ' + key + DEG + '.',
        [[half, 'answered-step'], [180 - e, 'stopped-early'], [180 - e - (d - half), 'parallel-angles-equal']]);
      P2(q, [
        nm('DA') + ' = ' + nm('DC') + ', so triangle ' + nm('ADC') + ' is isosceles: 180 − ' + d + ' = ' + (180 - d) + ', and ' + ang('DAC') + ' = ' + (180 - d) + ' ÷ 2 = ' + half + DEG + '.',
        nm('AB') + ' is parallel to ' + nm('DC') + ', so ' + ang('DAB') + ' = 180 − ' + d + ' = ' + (180 - d) + DEG + '.',
        ang('CAB') + ' is the rest of ' + ang('DAB') + ': ' + (180 - d) + ' − ' + half + ' = ' + half + DEG + '.',
        'Angles of triangle ' + nm('ABC') + ': x = 180 − ' + half + ' − ' + e + ' = <b>' + key + DEG + '</b>.'
      ]);
      return fig(q, spec({ A, B, C, D }, ['AB', 'BC', 'CD', 'DA', 'AC'], [['ADC', d + DEG], ['ABC', e + DEG], ['ACB', 'x']], L));
    }
    return gParaIsos();
  }

  /* rhombus + equilateral triangle on one side, outside: DCE equilateral, AE drawn */
  function gRhombusEquil() {
    const { L, nm, ang } = namer();
    const b = evenIn(60, 110), viaC = Math.random() < 0.5, c = 180 - b;   /* b = angle ABC = angle ADC */
    if (b === 90) return gRhombusEquil();                                 /* a right-angled rhombus is a square */
    const s = 6, P = para(s, s, 180 - b);
    P.E = [P.D[0] + s / 2, P.D[1] + s * Math.sin(rad(60))];
    const t = b + 60, u = 180 - t, y = u / 2, key = 60 - y;
    const given = viaC ? ang('BCD') + ' = ' + c + DEG : ang('ABC') + ' = ' + b + DEG;
    const stem = 'In the figure, ' + nm('ABCD') + ' is a rhombus and ' + nm('DCE') + ' is an equilateral triangle. ' + nm('AE') + ' is joined. ' +
      given + '. Find ' + ang('AEC') + ', marked x.';
    const first = viaC
      ? 'Angles between the parallel sides add up to 180' + DEG + ': ' + ang('ADC') + ' = 180 − ' + c + ' = ' + b + DEG + '.'
      : 'Opposite angles of a rhombus are equal: ' + ang('ADC') + ' = ' + ang('ABC') + ' = ' + b + DEG + '.';
    const q = typed(stem, key, first + ' ' + ang('ADE') + ' = ' + b + DEG + ' + 60' + DEG + ' = ' + t + DEG + '. ' + nm('DA') + ' = ' + nm('DC') + ' = ' + nm('DE') +
      ', so triangle ' + nm('ADE') + ' is isosceles and ' + ang('DEA') + ' = (180' + DEG + ' − ' + t + DEG + ') ÷ 2 = ' + y + DEG + '. x = 60' + DEG + ' − ' + y + DEG + ' = ' + key + DEG + '.',
      [[y, 'answered-step'], [60, 'equilateral-everywhere'], [t, 'answered-step'], [60 - u, 'not-halved'], [(b - 60) / 2, 'missed-equilateral']]);
    P2(q, [
      first,
      'Triangle ' + nm('DCE') + ' is equilateral, so ' + ang('CDE') + ' = 60' + DEG + ' and ' + ang('ADE') + ' = ' + b + ' + 60 = ' + t + DEG + '.',
      nm('DA') + ' = ' + nm('DC') + ' = ' + nm('DE') + ', so triangle ' + nm('ADE') + ' is isosceles: 180 − ' + t + ' = ' + u + ', and ' + ang('DEA') + ' = ' + u + ' ÷ 2 = ' + y + DEG + '.',
      ang('DEC') + ' = 60' + DEG + ' and x is the rest of it: 60 − ' + y + ' = <b>' + key + DEG + '</b>.'
    ]);
    return fig(q, spec(P, ['AB', 'BC', 'CD', 'DA', 'DE', 'CE', 'AE'], [[viaC ? 'BCD' : 'ABC', (viaC ? c : b) + DEG], ['AEC', 'x']], L));
  }

  /* parallelogram + isosceles triangle inside: E on DC, BE = BC */
  function gParaInside() {
    for (let t = 0; t < 300; t++) {
      /* mode EBC: given angle ADC (g), find the apex EBC. mode ADC: given the apex EBC (k, at
         least 50 so its label is clear), find angle ADC: the base angle first, then 180 less it. */
      const mode = pick(['EBC', 'ADC']);
      const k = mode === 'ADC' ? evenIn(50, 100) : 0;
      const g = mode === 'ADC' ? 90 + k / 2 : ri(103, 140), a = 180 - g, len = 5, w = 11;
      if (2 * len * Math.cos(rad(a)) > w - 2.5) continue;
      const { L, nm, ang } = namer();
      const P = para(w, len, a);
      P.E = [P.C[0] - 2 * len * Math.cos(rad(a)), P.C[1]];
      const ebc = 2 * g - 180, key = mode === 'EBC' ? ebc : g;
      if (key < 30) continue;
      const given = mode === 'EBC' ? ang('ADC') + ' = ' + g + DEG : ang('EBC') + ' = ' + k + DEG;
      const stem = 'In the figure, ' + nm('ABCD') + ' is a parallelogram and ' + L.E + ' is a point on ' + nm('DC') + '. ' + nm('BE') + ' = ' + nm('BC') +
        ' and ' + given + '. Find ' + ang(mode) + ', marked x.';
      const steps = mode === 'EBC' ? [
        'Angles between the parallel sides add up to 180' + DEG + ': ' + ang('BCD') + ' = 180 − ' + g + ' = ' + a + DEG + '.',
        nm('BE') + ' = ' + nm('BC') + ', so triangle ' + nm('BCE') + ' is isosceles: ' + ang('BEC') + ' = ' + ang('BCE') + ' = ' + a + DEG + '.',
        'Angles of triangle ' + nm('BCE') + ': x = 180 − ' + a + ' − ' + a + ' = <b>' + key + DEG + '</b>.'
      ] : [
        nm('BE') + ' = ' + nm('BC') + ', so triangle ' + nm('BCE') + ' is isosceles and ' + ang('BEC') + ' = ' + ang('BCE') + '.',
        'The two equal angles share what is left: 180 − ' + k + ' = ' + (180 - k) + ', and ' + ang('BCE') + ' = ' + (180 - k) + ' ÷ 2 = ' + a + DEG + '.',
        ang('BCD') + ' and ' + ang('ADC') + ' sit between the parallel sides, so they add up to 180' + DEG + '.',
        'x = 180 − ' + a + ' = <b>' + key + DEG + '</b>.'
      ];
      const q = typed(stem, key, steps.join(' ').replace(/<\/?b>/g, ''), mode === 'EBC'
        ? [[a, 'answered-base-angle'], [180 - a, 'stopped-early'], [2 * a, 'not-from-180']]
        : [[a, 'answered-base-angle'], [180 - k, 'not-halved'], [k, 'copied-given'], [180 - a / 2, 'halved-given']]);
      P2(q, steps);
      return fig(q, spec(P, ['AB', 'BC', 'CD', 'DA', 'BE'], [mode === 'EBC' ? ['ADC', g + DEG] : ['EBC', k + DEG], [mode, 'x']], L));
    }
    return gParaIsos();
  }

  MQI.registerTopic({
    id: 'p6quads', level: 'P6', strand: 'Measurement and Geometry',
    moeSubTopic: 'Special Quadrilaterals: finding unknown angles, without additional construction of lines, in composite geometric figures involving square, rectangle, triangle, parallelogram, rhombus, trapezium',
    label: 'Rhombus Reef', short: 'Special quadrilaterals', e: '🔷',
    skills: {
      split:    { label: 'Shapes split by a line', tip: 'Mark every angle you know on the figure first, then look for a triangle with only one unknown angle.' },
      parallel: { label: 'Parallel sides', tip: 'Between a pair of parallel sides, the two angles add up to 180°. Point to the pair before you use it.' },
      isos:     { label: 'Hidden isosceles triangles', tip: 'Look for two sides marked equal, or two sides of a rhombus or square: the angles facing them are equal.' }
    },
    misconceptions: {
      'interior-exterior':      'Gives the angle on the other side of a straight line.',
      'missed-right-angle':     'Leaves out the right angle at a corner of a rectangle or square.',
      'copied-given':           'Gives an angle printed in the question.',
      'stopped-early':          'Stops one step before the marked angle.',
      'added-not-subtracted':   'Adds an angle that should be taken away.',
      'parallel-angles-equal':  'Treats the two angles between a pair of parallel sides as equal instead of adding to 180°.',
      'used-360':               'Uses 360° where the facts give 180°.',
      'missed-angle':           'Leaves out one of the angles that must be taken away.',
      'not-halved':             'Forgets to share the remaining angle between the two equal angles of an isosceles triangle.',
      'halved-given':           'Halves the given angle instead of the angle that is left.',
      'wrong-angle-halved':     'Halves the wrong angle of the rhombus.',
      'equilateral-everywhere': 'Uses 60° for an angle that is not a corner of the equilateral triangle.',
      'square-corner':          'Uses 90° for an angle that is not a corner of the square.',
      'subtracted-not-added':   'Takes the triangle\'s angle away from the square\'s corner when the triangle is outside.',
      'wrong-angle':            'Finds a different angle from the one marked x.',
      'answered-base-angle':    'Gives a base angle of the isosceles triangle instead of the angle asked.',
      'not-from-180':           'Doubles the base angle but does not take it from 180°.',
      'answered-step':          'Gives an angle found on the way instead of the marked angle.',
      'missed-equilateral':     'Leaves out the 60° corner of the equilateral triangle.'
    },
    pools: {
      1: [[gRectTri, 'split'], [gTrapDiag, 'parallel']],
      2: [[gParaPoint, 'parallel'], [gRhombusDiag, 'isos'], [gSquareEquil, 'isos']],
      3: [[gParaIsos, 'isos'], [gTrapIsos, 'parallel'], [gRhombusEquil, 'isos'], [gParaInside, 'isos']]
    }
  });
})();
