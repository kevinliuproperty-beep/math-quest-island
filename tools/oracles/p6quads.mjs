/* P6 SPECIAL QUADRILATERALS ORACLE (P5-P6 mirror fan-out, lane m-vol-quads, 2026-10-30).
   Exhaustive for topic p6quads (js/topics/p6-quadrilaterals.js): every stem must match one
   of the templates below, or the draw fails.

   Two independent routes to every key, and the figure is audited against the stem:
     1. MEASURED: the 'geom' spec is rendered through the app's own js/figures.js and every
        angle is re-measured off the DRAWING (the .gm-pt + .gm-name points, the .gm-seg
        lines, the .gm-ang arcs and their .gm-mark labels), as p3AnglesOracle does. Each arc
        is resolved to its vertex (the named point 14 px from both arc ends) and to the
        named points along each arm (a drawn line through the vertex in the arc end's
        direction). The arc labelled x must measure the key to within 0.5 deg, and every
        arc labelled "N deg" must measure N to within 0.5 deg.
     2. DERIVED: the key is re-derived from the numbers printed in the stem with the
        P5 angle facts, in this file's own arithmetic.
   The figure must say what the stem says: every stem angle has its labelled arc at the
   right vertex between the right arms and no arc is unexplained; the named shape really
   is that shape (right angles, parallel sides parallel to 0.3 deg, equal sides equal to
   1%, a trapezium has exactly one pair of parallel sides); a point "on" a side lies
   strictly inside it; a "straight line" is straight; "inside/outside the square" holds;
   every side, diagonal and joining line the stem names is drawn.
   Plus the house checks: syl 'P6', MCQ exactly one option equal to the key with every
   distractor tagged and coached, typed answers declare the degree sign and their slips
   never equal the key, pool 3 is band 3 + exam 'problem' + coached. */
export const topic = 'p6quads';

const NUM = '(-?[\\d.]+)';
const PT_RE = /<circle class="gm-pt" cx="(-?[\d.]+)" cy="(-?[\d.]+)"[^>]*\/><text class="gm-name"[^>]*>([A-Z])<\/text>/g;
const SEG_RE = new RegExp('<line class="gm-seg" x1="' + NUM + '" y1="' + NUM + '" x2="' + NUM + '" y2="' + NUM + '"', 'g');
const ANG_RE = /<g class="gm-ang"><path class="gm-arc" d="M (-?[\d.]+) (-?[\d.]+) A 14 14 0 0 [01] (-?[\d.]+) (-?[\d.]+)"[^>]*\/>(?:<text class="gm-mark"[^>]*>([^<]*)<\/text>)?<\/g>/g;

const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const vec = (p, q) => [q[0] - p[0], q[1] - p[1]];
function deg(u, w) {
  const c = (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]));
  return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
}
function distSeg(p, s) {
  const a = s[0], b = s[1], vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L));
  return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy);
}

function readFigure(raw) {
  const pts = {};
  for (const m of raw.matchAll(PT_RE)) {
    if (pts[m[3]]) return { err: 'point ' + m[3] + ' is named twice' };
    pts[m[3]] = [+m[1], +m[2]];
  }
  const segs = [...raw.matchAll(SEG_RE)].map(m => [[+m[1], +m[2]], [+m[3], +m[4]]]);
  const arcsRaw = [...raw.matchAll(ANG_RE)].map(m => ({ a: [+m[1], +m[2]], b: [+m[3], +m[4]], label: m[5] || '' }));
  if ((raw.match(/class="gm-ang"/g) || []).length !== arcsRaw.length) return { err: 'an arc could not be read' };
  /* is the straight piece from p to q drawn (both ends on one drawn line)? */
  const drawn = (p, q) => segs.some(s => distSeg(p, s) < 0.35 && distSeg(q, s) < 0.35);
  const names = Object.keys(pts);
  const arcs = [];
  for (const r of arcsRaw) {
    const vs = names.filter(n => Math.abs(dist(pts[n], r.a) - 14) < 0.35 && Math.abs(dist(pts[n], r.b) - 14) < 0.35);
    if (vs.length !== 1) return { err: `arc "${r.label}" has ${vs.length} possible vertices` };
    const v = vs[0], V = pts[v];
    const arm = end => names.filter(n => n !== v && deg(vec(V, end), vec(V, pts[n])) < 2.5 && drawn(V, pts[n]))
      .sort((x, y) => dist(V, pts[y]) - dist(V, pts[x]));
    const A1 = arm(r.a), A2 = arm(r.b);
    if (!A1.length || !A2.length) return { err: `arc "${r.label}" at ${v}: an end does not lie along a drawn arm to a named point` };
    arcs.push({ v, arm1: A1, arm2: A2, label: r.label, deg: deg(vec(V, pts[A1[0]]), vec(V, pts[A2[0]])) });
  }
  return { pts, segs, arcs, drawn };
}

export function oracle(q, kit) {
  const { strip, TOPICS } = kit;
  const text = strip(q.q);
  const fail = s => 'p6quads: ' + s + ' :: ' + text;
  const MIS = (TOPICS.p6quads && TOPICS.p6quads.misconceptions) || {};
  if (q.syl !== 'P6') return fail('every item must carry syl P6');
  if (!q.typed) {
    for (let i = 0; i < (q.choices || []).length; i++) {
      if (i === q.correct) { if (q.miscon && q.miscon[i] != null) return fail('the key carries a misconception tag'); continue; }
      const t = q.miscon && q.miscon[i];
      if (!t || !MIS[t]) return fail(`distractor ${i} has no misconception tag from the dictionary (${t})`);
      if (!q.optionFeedback || typeof q.optionFeedback[i] !== 'string' || !q.optionFeedback[i].trim()) return fail(`distractor ${i} has no coaching line`);
    }
  } else {
    if (q.unit !== '°') return fail('a typed angle must declare the degree sign');
    if (!q.slips || !Object.keys(q.slips).length) return fail('a typed item carries no slips');
    for (const [v, t] of Object.entries(q.slips)) {
      if (Number(v) === q.answer) return fail('a slip equals the key');
      if (!MIS[t]) return fail(`slip tag ${t} is not in the dictionary`);
    }
  }
  if (!q.figure || q.figure.type !== 'geom') return fail('every item is drawn with a geom figure');
  const raw = String(q.extra || kit.renderFigure(q.figure));
  const F = readFigure(raw);
  if (F.err) return fail(F.err);
  const { pts, arcs, drawn } = F;
  const P = n => { if (!pts[n]) throw new Error('point ' + n + ' is not drawn'); return pts[n]; };

  /* ---- figure predicates, all on the rendered drawing ---- */
  const angle = (a, v, b) => deg(vec(P(v), P(a)), vec(P(v), P(b)));
  const par = (a, b, c, d) => { const x = deg(vec(P(a), P(b)), vec(P(c), P(d))); return Math.min(x, 180 - x) < 0.3; };
  const eqLen = (a, b, c, d) => { const x = dist(P(a), P(b)), y = dist(P(c), P(d)); return Math.abs(x - y) / Math.max(x, y) < 0.01; };
  const between = (p, a, b) => distSeg(P(p), [P(a), P(b)]) < 0.35 && dist(P(p), P(a)) > 8 && dist(P(p), P(b)) > 8;
  const sides = quad => [0, 1, 2, 3].every(i => drawn(P(quad[i]), P(quad[(i + 1) % 4])));
  const isPara = Q => sides(Q) && par(Q[0], Q[1], Q[3], Q[2]) && par(Q[0], Q[3], Q[1], Q[2]);
  const isRhombus = Q => isPara(Q) && eqLen(Q[0], Q[1], Q[1], Q[2]);
  const isRect = Q => sides(Q) && [0, 1, 2, 3].every(i => Math.abs(angle(Q[(i + 3) % 4], Q[i], Q[(i + 1) % 4]) - 90) < 0.3);
  const isSquare = Q => isRect(Q) && eqLen(Q[0], Q[1], Q[1], Q[2]);
  const isTrap = Q => sides(Q) && par(Q[0], Q[1], Q[3], Q[2]) && !par(Q[0], Q[3], Q[1], Q[2]);
  const insidePoly = (p, Q) => {   /* strictly inside a convex polygon */
    const s = Q.map((n, i) => { const a = P(n), b = P(Q[(i + 1) % Q.length]); return Math.sign((b[0] - a[0]) * (P(p)[1] - a[1]) - (b[1] - a[1]) * (P(p)[0] - a[0])); });
    return s.every(x => x === s[0] && x !== 0);
  };

  /* ---- the stem's angles against the drawing's arcs ---- */
  const givens = [...text.matchAll(/∠([A-Z])([A-Z])([A-Z]) = (\d+)°/g)].map(m => ({ a: m[1], v: m[2], b: m[3], n: +m[4] }));
  const ask = text.match(/Find ∠([A-Z])([A-Z])([A-Z]), marked x\.$/);
  if (!ask) return fail('the stem does not name the marked angle');
  const arcFor = (a, v, b) => arcs.filter(r => r.v === v && ((r.arm1.includes(a) && r.arm2.includes(b)) || (r.arm1.includes(b) && r.arm2.includes(a))));
  const used = new Set();
  for (const g of givens) {
    const hit = arcFor(g.a, g.v, g.b).filter(r => r.label === g.n + '°');
    if (hit.length !== 1) return fail(`∠${g.a}${g.v}${g.b} = ${g.n}° has ${hit.length} matching labelled arcs on the figure`);
    if (Math.abs(hit[0].deg - g.n) > 0.5) return fail(`∠${g.a}${g.v}${g.b} is printed ${g.n}° but drawn ${hit[0].deg.toFixed(2)}°`);
    used.add(hit[0]);
  }
  const xs = arcFor(ask[1], ask[2], ask[3]).filter(r => r.label === 'x');
  if (xs.length !== 1 || arcs.filter(r => r.label === 'x').length !== 1) return fail('the arc marked x is missing, doubled, or not at the angle the stem names');
  used.add(xs[0]);
  if (arcs.some(r => !used.has(r))) return fail('the figure carries an arc the stem does not explain');
  const measured = xs[0].deg;

  /* ---- templates: shape claims + the derived key ---- */
  const asked = ask[1] + ask[2] + ask[3];
  const same = (s, t) => s === t || s === t.split('').reverse().join('');
  let m, key = null, band3 = false;
  try {
    if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a rectangle and ([A-Z]) is a point on \4\3\. ∠([A-Z]{3}) = (\d+)°\. Find/))) {
      const [, A, B, C, D, E] = m, v = +m[7];
      if (!isRect([A, B, C, D]) || !between(E, D, C) || !drawn(P(A), P(E))) return fail('rectangle figure does not match its description');
      /* recover angle DAE from whichever angle is printed, then walk to the asked one */
      const g = m[6], p = g === D + A + E ? v : g === B + A + E ? 90 - v : g === A + E + D ? 180 - 90 - v : g === A + E + C ? v - 90 : null;
      if (p === null) return fail('the printed angle is not one round AE');
      if (same(asked, D + A + E)) key = p;
      else if (same(asked, B + A + E)) key = 90 - p;                 /* the rest of the right angle at A */
      else if (same(asked, A + E + D)) key = 180 - 90 - p;           /* triangle ADE */
      else if (same(asked, A + E + C)) key = 90 + p;                 /* exterior angle of triangle ADE */
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a trapezium with \1\2 parallel to \4\3, and \1\3 is a diagonal\. ∠\1\4\3 = (\d+)° and ∠\4\1\3 = (\d+)°\. Find ∠\3\1\2, marked x\.$/))) {
      const [, A, B, C, D] = m, d = +m[5], p = +m[6];
      if (!isTrap([A, B, C, D]) || !drawn(P(A), P(C))) return fail('trapezium figure does not match its description');
      key = (180 - d) - p;
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a parallelogram and ([A-Z]) is a point on \1\2\. ∠\4\1\2 = (\d+)° and ∠\1\4\5 = (\d+)°\. Find/))) {
      const [, A, B, C, D, E] = m, a = +m[6], dd = +m[7];
      if (!isPara([A, B, C, D]) || !between(E, A, B) || !drawn(P(D), P(E))) return fail('parallelogram figure does not match its description');
      if (same(asked, D + E + B)) key = a + dd;                      /* exterior angle of triangle ADE */
      else if (same(asked, E + D + C)) key = 180 - a - dd;           /* angle D = 180 - a, less ADE */
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a rhombus and \1\3 is a diagonal\. ∠([A-Z]{3}) = (\d+)°\. Find/))) {
      const [, A, B, C, D] = m, g = +m[6];
      if (!isRhombus([A, B, C, D]) || !drawn(P(A), P(C))) return fail('rhombus figure does not match its description');
      if (m[5] === A + B + C && same(asked, B + A + C)) key = 90 - g / 2;
      else if (m[5] === A + D + C && same(asked, D + C + A)) key = 90 - g / 2;
      else if (m[5] === A + D + C && same(asked, B + A + C)) key = 90 - g / 2;    /* opposite angle at B, then isosceles ABC */
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a square and \2\3([A-Z]) is a triangle with \2\5 = \2\3\. ∠\5\2\3 = (\d+)°\. \5 lies (inside|outside) the square\. Find/))) {
      const [, A, B, C, D, E] = m, k = +m[6], inside = m[7] === 'inside';
      if (!isSquare([A, B, C, D]) || !drawn(P(B), P(E)) || !drawn(P(C), P(E)) || !drawn(P(A), P(E)) || !eqLen(B, E, B, C)) return fail('square figure does not match its description');
      if (insidePoly(E, [A, B, C, D]) !== inside) return fail('the triangle is not on the side of the square the stem says');
      const abe = inside ? 90 - k : 90 + k, bae = (180 - abe) / 2;   /* BA = BC = BE */
      if (inside && (same(asked, B + A + E) || same(asked, A + E + B))) key = bae;
      else if (!inside && same(asked, D + A + E)) key = 90 - bae;
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a square and \2\3([A-Z]) is an equilateral triangle\. \5 lies (inside|outside) the square\. Find/))) {
      const [, A, B, C, D, E] = m, inside = m[6] === 'inside';
      if (!isSquare([A, B, C, D]) || !drawn(P(B), P(E)) || !drawn(P(C), P(E)) || !eqLen(B, E, B, C) || !eqLen(C, E, B, C)) return fail('square figure does not match its description');
      if (insidePoly(E, [A, B, C, D]) !== inside) return fail('the triangle is not on the side of the square the stem says');
      if (!same(asked, A + B + E) && !drawn(P(A), P(E))) return fail('AE is not drawn');
      const abe = inside ? 90 - 60 : 90 + 60, bae = (180 - abe) / 2;
      if (inside && (same(asked, B + A + E) || same(asked, A + E + B))) key = bae;
      else if (inside && same(asked, A + E + D)) { if (!drawn(P(D), P(E))) return fail('DE is not drawn'); key = 360 - 60 - bae - bae; }
      else if (!inside && same(asked, A + B + E)) key = abe;
      else if (!inside && same(asked, D + A + E)) key = 90 - bae;
      else if (!inside && same(asked, A + E + C)) key = 60 - bae;
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a parallelogram and \1\2([A-Z]) is a straight line\. \3\2 = \3\5 and ∠([A-Z]{3}) = (\d+)°\. Find ∠\2\3\5, marked x\.$/))) {
      const [, A, B, C, D, E] = m, g = +m[7];
      if (!isPara([A, B, C, D]) || !between(B, A, E) || !drawn(P(A), P(E)) || !drawn(P(C), P(E)) || !eqLen(C, B, C, E)) return fail('parallelogram figure does not match its description');
      const cbe = m[6] === D + A + B ? g : m[6] === A + D + C ? 180 - g : null;   /* straight line at B */
      if (cbe !== null) { key = 180 - 2 * cbe; band3 = true; }
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a trapezium with \1\2 parallel to \4\3, and \1\3 is a diagonal\. \4\1 = \4\3, ∠\1\4\3 = (\d+)° and ∠\1\2\3 = (\d+)°\. Find ∠\1\3\2, marked x\.$/))) {
      const [, A, B, C, D] = m, d = +m[5], e = +m[6];
      if (!isTrap([A, B, C, D]) || !drawn(P(A), P(C)) || !eqLen(D, A, D, C)) return fail('trapezium figure does not match its description');
      const dca = (180 - d) / 2, bcd = 180 - e;                      /* route: at C, angle BCD less angle DCA */
      key = bcd - dca; band3 = true;
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a rhombus and \4\3([A-Z]) is an equilateral triangle\. \1\5 is joined\. ∠([A-Z]{3}) = (\d+)°\. Find ∠\1\5\3, marked x\.$/))) {
      const [, A, B, C, D, E] = m, g = +m[7];
      if (!isRhombus([A, B, C, D]) || !drawn(P(D), P(E)) || !drawn(P(C), P(E)) || !drawn(P(A), P(E)) || !eqLen(D, E, D, C) || !eqLen(C, E, D, C)) return fail('rhombus figure does not match its description');
      if (insidePoly(E, [A, B, C, D])) return fail('the equilateral triangle must be outside the rhombus');
      const adc = m[6] === A + B + C ? g : m[6] === B + C + D ? 180 - g : null;
      if (adc !== null) { const dea = (180 - (adc + 60)) / 2; key = 60 - dea; band3 = true; }   /* isosceles ADE, then the rest of the 60 at E */
    } else if ((m = text.match(/^In the figure, ([A-Z])([A-Z])([A-Z])([A-Z]) is a parallelogram and ([A-Z]) is a point on \4\3\. \2\5 = \2\3 and ∠([A-Z]{3}) = (\d+)°\. Find/))) {
      const [, A, B, C, D, E] = m, v = +m[7];
      if (!isPara([A, B, C, D]) || !between(E, D, C) || !drawn(P(B), P(E)) || !eqLen(B, E, B, C)) return fail('parallelogram figure does not match its description');
      if (m[6] === A + D + C && same(asked, E + B + C)) { const c = 180 - v; key = 180 - c - c; }          /* base angles of BCE */
      else if (m[6] === E + B + C && same(asked, A + D + C)) { const c = (180 - v) / 2; key = 180 - c; }  /* base angle, then parallel sides */
      band3 = true;
    } else return fail('no oracle matched this stem - every p6quads stem must ship its oracle');
  } catch (e) { return fail(e.message); }

  if (key === null) return fail(`the marked angle ${asked} is not one this template asks`);
  if (!Number.isInteger(key) || key <= 0 || key >= 180) return fail(`derived key ${key} is not a whole angle under 180°`);
  if (givens.some(g => g.n === key)) return fail(`the key ${key}° is also printed in the stem`);
  if (Math.abs(measured - key) > 0.5) return fail(`derived ${key}° but the arc marked x measures ${measured.toFixed(2)}° on the drawing`);
  if (band3) {
    if (q.band !== 3 || q.exam !== 'problem' || !q.typed) return fail('a Paper 2 composite-figure problem is typed, band 3 and exam:problem');
    if (!q.technique || !Array.isArray(q.steps) || q.steps.length < 3 || q.steps.length > 5) return fail('a Paper 2 problem must be coached');
  }
  if (q.typed) return q.answer === key ? null : fail(`expected ${key}, got ${q.answer}`);
  const vals = q.choices.map(c => { const t = strip(c).match(/^(\d+)°$/); return t ? +t[1] : null; });
  if (vals.some(v => v === null)) return fail('an option is not a whole number of degrees');
  const hits = vals.map((v, i) => v === key ? i : -1).filter(i => i >= 0);
  if (hits.length !== 1) return fail(`${hits.length} options equal ${key}°`);
  return hits[0] === q.correct ? null : fail(`key is option ${q.correct}, ${key}° is option ${hits[0]}`);
}
