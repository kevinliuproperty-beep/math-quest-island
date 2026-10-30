/* Oracle plug-in: p6circles (Circle Cove, P6 Area and Circumference of Circle).
 *
 * Exhaustive. Every answer is re-derived from the RENDERED figure (kit.renderFigure),
 * never from the spec's fields:
 *   1. The outline (`path.cf-shape`) is parsed into straight edges and circular arcs.
 *   2. The px-per-unit scale is FOUND by search: every printed label (`.cf-lab`, "14 cm")
 *      must match some drawn length (an edge, an arc radius or chord, a dashed line) at
 *      one common scale - which is also the proof the picture is to scale.
 *   3. Each arc is classified off the drawing (its swept angle: a half or a quarter
 *      turn) and as bulging out of or into the figure.
 *   4. Area = chord-polygon shoelace +/- the circular segments, perimeter = straight
 *      edges + arcs, both with the STEM's π (22/7 or 3.14). Cross-checked against a
 *      brute-force sampled outline with the true π (within 0.5%).
 *   5. Every straight edge must be a printed label or a sum/difference of two, and every
 *      arc radius a label or half of one: the child has every number needed.
 * The stem names the quantity and the shape; the drawing must agree with the stem
 * (a "semicircle" stem draws exactly one half-turn arc, and so on).
 */
export const topic = 'p6circles';

const PI_OF = { '22/7': 22 / 7, '3.14': 3.14 };
const near6 = (a, b) => Math.abs(a - b) < 1e-6;
const dp2 = x => Math.round(x * 100) / 100;

function parseFigure(html) {
  const dm = html.match(/<path class="cf-shape" d="([^"]+)"/);
  if (!dm) return null;
  const tok = dm[1].trim().split(/\s+/);
  let i = 0, cur = null, start = null;
  const segs = [];
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M') { cur = [num(), num()]; start = cur; }
    else if (c === 'L') { const p = [num(), num()]; segs.push({ k: 'L', P: cur, Q: p }); cur = p; }
    else if (c === 'A') {
      const rx = num(); num(); num(); const large = num(), sweep = num(); const p = [num(), num()];
      segs.push({ k: 'A', P: cur, Q: p, r: rx, large, sweep }); cur = p;
    } else if (c === 'Z') { if (Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 0.05) segs.push({ k: 'L', P: cur, Q: start }); cur = start; }
    else return null;
  }
  const labs = [...html.matchAll(/<text class="cf-lab (cf-[a-zA-Z]+)"[^>]*>(\d+(?:\.\d+)?) (cm|m)<\/text>/g)]
    .map(m => ({ cls: m[1], v: Number(m[2]), unit: m[3] }));
  const dashes = [...html.matchAll(/<line class="cf-(?:dash|frame)" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)]
    .map(m => Math.hypot(m[3] - m[1], m[4] - m[2]));
  const frames = (html.match(/<line class="cf-frame"/g) || []).length;
  return { frames, segs: segs.filter(s => s.k === 'A' || Math.hypot(s.Q[0] - s.P[0], s.Q[1] - s.P[1]) > 0.05), labs, dashes };
}

/* the circle an SVG arc lies on, and its sweep, chosen by the SVG rules */
function arcGeom(a) {
  const [px, py] = a.P, [qx, qy] = a.Q;
  const c = Math.hypot(qx - px, qy - py);
  /* the renderer rounds radius and end points to 0.1 px separately: a radius within
     0.2 px of half the chord IS a half turn */
  const r = Math.abs(a.r - c / 2) < 0.2 ? c / 2 : Math.max(a.r, c / 2);
  const h = Math.sqrt(Math.max(0, r * r - c * c / 4));
  const mx = (px + qx) / 2, my = (py + qy) / 2, nx = -(qy - py) / c, ny = (qx - px) / c;
  for (const sgn of [1, -1]) {
    const cx = mx + sgn * h * nx, cy = my + sgn * h * ny;
    const a0 = Math.atan2(py - cy, px - cx), a1 = Math.atan2(qy - cy, qx - cx);
    let d = a.sweep ? a1 - a0 : a0 - a1;
    while (d <= 1e-9) d += 2 * Math.PI;
    while (d > 2 * Math.PI) d -= 2 * Math.PI;
    if ((d > Math.PI + 1e-3) === !!a.large || h < 1e-6) return { cx, cy, r, a0, d: a.sweep ? d : -d, theta: d };
  }
  return null;
}

/* area and perimeter of a figure off its drawing, in units, with a given π */
function measure(fig, s, pi) {
  const U = x => Math.round(x / s * 2) / 2;               /* drawn px -> units, half-unit grid */
  /* an axis-aligned edge sits on the half-unit grid; a slanting one (a chord) is measured as drawn */
  const len = g => { const dx = g.Q[0] - g.P[0], dy = g.Q[1] - g.P[1], d = Math.hypot(dx, dy);
    return Math.abs(dx) < 0.05 || Math.abs(dy) < 0.05 ? U(d) : d / s; };
  const pts = [fig.segs[0].P].concat(fig.segs.map(g => g.Q)).map(p => [U(p[0]), U(p[1])]);
  let Ac = 0;
  for (let k = 0; k + 1 < pts.length; k++) Ac += (pts[k][0] * pts[k + 1][1] - pts[k + 1][0] * pts[k][1]) / 2;
  /* brute force: sample the outline */
  let At = 0, Pt = 0, prev = null, first = null;
  const add = p => { if (prev) { At += (prev[0] * p[1] - p[0] * prev[1]) / 2; Pt += Math.hypot(p[0] - prev[0], p[1] - prev[1]); } else first = p; prev = p; };
  const arcs = [];
  for (const g of fig.segs) {
    if (!prev) add([g.P[0] / s, g.P[1] / s]);
    if (g.k === 'L') { add([g.Q[0] / s, g.Q[1] / s]); continue; }
    const A = arcGeom(g);
    if (!A) return { err: 'an arc in the outline is not a circular arc' };
    for (let t = 1; t <= 400; t++) {
      const ang = A.a0 + A.d * t / 400;
      add([(A.cx + A.r * Math.cos(ang)) / s, (A.cy + A.r * Math.sin(ang)) / s]);
    }
    arcs.push({ g, A });
  }
  add(first);
  const sg = Math.sign(At);
  let area = sg * Ac, areaTrue = sg * Ac, per = 0, perTrue = 0;
  const kinds = [];
  for (const g of fig.segs) if (g.k === 'L') { const L = len(g); per += L; perTrue += L; }
  for (const { g, A } of arcs) {
    const r = U(A.r);
    let kind;
    if (Math.abs(A.theta - Math.PI) < 0.05) kind = 'half';
    else if (Math.abs(A.theta - Math.PI / 2) < 0.05) kind = 'quarter';
    else return { err: `an arc sweeps ${(A.theta * 180 / Math.PI).toFixed(1)} degrees, neither a half nor a quarter turn` };
    const mid = A.a0 + A.d / 2, M = [A.cx + A.r * Math.cos(mid), A.cy + A.r * Math.sin(mid)];
    const cr = (g.Q[0] - g.P[0]) * (M[1] - g.P[1]) - (g.Q[1] - g.P[1]) * (M[0] - g.P[0]);
    const inward = Math.sign(cr) === sg;
    const seg = p => kind === 'half' ? p * r * r / 2 : p * r * r / 4 - r * r / 2;
    area += (inward ? -1 : 1) * seg(pi); areaTrue += (inward ? -1 : 1) * seg(Math.PI);
    per += kind === 'half' ? pi * r : pi * r / 2; perTrue += kind === 'half' ? Math.PI * r : Math.PI * r / 2;
    kinds.push({ kind, r, inward });
  }
  if (Math.abs(areaTrue - Math.abs(At)) > 0.005 * Math.abs(At)) return { err: `the drawn area ${Math.abs(At).toFixed(2)} disagrees with the decomposition ${areaTrue.toFixed(2)}` };
  if (Math.abs(perTrue - Pt) > 0.005 * Pt) return { err: `the drawn perimeter ${Pt.toFixed(2)} disagrees with the decomposition ${perTrue.toFixed(2)}` };
  const straight = fig.segs.filter(g => g.k === 'L').map(len);
  return { area, per, arcLen: per - straight.reduce((a, b) => a + b, 0), kinds, straight };
}

/* the scale, found by search: every label must be some drawn length at ONE scale.
   A label's class says what it measures, which is what a child reads off its place:
   cf-r a radius, cf-d a diameter, cf-W / cf-H a side of the rectangle. */
function findScale(fig) {
  const radii = fig.segs.filter(g => g.k === 'A').map(g => g.r);
  const axis = g => Math.abs(g.Q[0] - g.P[0]) < 0.05 || Math.abs(g.Q[1] - g.P[1]) < 0.05;
  const sides = fig.segs.filter(g => g.k === 'L' && axis(g)).map(g => Math.hypot(g.Q[0] - g.P[0], g.Q[1] - g.P[1])).concat(fig.dashes);
  const featsOf = cls => cls === 'cf-r' ? (radii.length ? radii : sides) : cls === 'cf-d' ? radii.map(x => 2 * x).concat(sides) : (sides.length ? sides : radii.map(x => 2 * x));
  const cands = [];
  for (const l of fig.labs) for (const f of featsOf(l.cls)) cands.push(f / l.v);
  const ok = s => fig.labs.every(l => {
    if (l.cls === 'cf-r' && radii.length && !radii.some(f => Math.abs(f - l.v * s) < 0.6) && !sides.some(f => Math.abs(f - l.v * s) < 0.6)) return false;
    return featsOf(l.cls).some(f => Math.abs(f - l.v * s) < 0.6);
  });
  /* a circle's radius label must BE a drawn radius; a diameter label twice one */
  const strict = s => fig.labs.every(l => l.cls === 'cf-r' && fig.segs.every(g => g.k === 'A') ? radii.some(f => Math.abs(f - l.v * s) < 0.6)
    : l.cls === 'cf-d' ? radii.some(f => Math.abs(2 * f - l.v * s) < 0.8) : true);
  const good = cands.filter(s => ok(s) && strict(s)).sort((a, b) => a - b);
  if (!good.length) return null;
  const s0 = good[Math.floor(good.length / 2)];
  if (good.some(x => Math.abs(x - s0) > 0.02 * s0)) return null;
  /* refine: least squares over the label-to-length matches */
  let num = 0, den = 0;
  for (const l of fig.labs) {
    const f = featsOf(l.cls).reduce((b, x) => Math.abs(x - l.v * s0) < Math.abs(b - l.v * s0) ? x : b, Infinity);
    num += f * l.v; den += l.v * l.v;
  }
  const s = num / den;
  /* every drawn length sits on the half-unit grid at this scale (0.1 px rounding allowed) */
  const tol = Math.max(0.12, 0.3 / s);
  if (!radii.concat(sides).every(f => Math.abs(f / s * 2 - Math.round(f / s * 2)) < tol)) return null;
  return s;
}

export function oracle(q, kit) {
  const text = kit.strip(q.q);
  const fail = s => 'p6circles: ' + s + ' :: ' + text;
  const T = kit.TOPICS.p6circles, MIS = (T && T.misconceptions) || {};
  if (q.syl !== 'P6') return fail('every item must carry syl P6');
  if (!q.typed) {
    for (let i = 0; i < (q.choices || []).length; i++) {
      if (i === q.correct) { if (q.miscon && q.miscon[i] != null) return fail('the key carries a misconception tag'); continue; }
      const t = q.miscon && q.miscon[i];
      if (!t || !MIS[t]) return fail(`distractor ${i} has no misconception tag from the dictionary (${t})`);
      if (!q.optionFeedback || typeof q.optionFeedback[i] !== 'string' || !q.optionFeedback[i].trim()) return fail(`distractor ${i} has no coaching line`);
    }
  } else {
    if (!q.slips || !Object.keys(q.slips).length) return fail('a typed item carries no slips');
    for (const [v, t] of Object.entries(q.slips)) {
      if (near6(Number(v), q.answer)) return fail('a slip equals the key');
      if (!MIS[t]) return fail(`slip tag ${t} is not in the dictionary`);
    }
  }
  const pm = text.match(/Take π = (22\/7|3\.14)\./);
  if (!pm) return fail('the stem does not say which π to take');
  const P = pm[1], pi = PI_OF[P];
  if (P === '3.14' && q.typed && q.dp !== 2) return fail('a 3.14 typed item must declare q.dp = 2');
  const exact = v => near6(v, dp2(v));
  const checkTyped = (want, unit) => {
    if (!exact(want)) return fail(`the true answer ${want} needs more than 2 decimal places`);
    if (!Number.isInteger(dp2(want)) && q.dp !== 2) return fail('a decimal answer must declare q.dp = 2');
    if (q.unit !== unit) return fail(`the answer unit should be ${unit}, got ${JSON.stringify(q.unit)}`);
    return near6(q.answer, want) ? null : fail(`expected ${dp2(want)}, got ${q.answer}`);
  };
  let m;

  /* working backwards, no figure: search for the diameter */
  if ((m = text.match(/^The circumference of a ([a-z ]+) is (\d+(?:\.\d+)?) (cm|m)\. Take π = (?:22\/7|3\.14)\. What is the (radius|diameter) of the \1, in \3\?$/))) {
    if (q.figure) return fail('the working-backwards item draws no figure');
    const C = Number(m[2]);
    const hits = [];
    for (let k = 1; k <= 4000; k++) { const d = k / 2; if (near6(dp2(pi * d), C)) hits.push(d); }
    if (hits.length !== 1) return fail(`${hits.length} diameters give circumference ${C}`);
    return checkTyped(m[4] === 'radius' ? hits[0] / 2 : hits[0], m[3]);
  }

  if (!q.figure) return fail('no figure and not a working-backwards stem');
  const fig = parseFigure(kit.renderFigure(q.figure));
  if (!fig || !fig.segs.length) return fail('the rendered figure has no outline');
  if (!fig.labs.length) return fail('the rendered figure prints no lengths');
  const U = fig.labs[0].unit;
  if (fig.labs.some(l => l.unit !== U)) return fail('the labels mix units');
  const s = findScale(fig);
  if (!s) return fail('the printed labels do not match the drawing at one scale');
  const g = measure(fig, s, pi);
  if (g.err) return fail(g.err);
  const halves = g.kinds.filter(k => k.kind === 'half').length, quarters = g.kinds.filter(k => k.kind === 'quarter').length;
  const isCircle = halves === 2 && quarters === 0 && !g.straight.length && g.kinds.every(k => !k.inward);
  let qty = null, unitWord = null, composite = false;
  if ((m = text.match(/^What is the (circumference|area) of the circle(?:, in (cm|cm²))?\? Take π = (?:22\/7|3\.14)\.$/))) {
    if (!isCircle) return fail('a circle stem must draw a circle');
    qty = m[1] === 'area' ? 'area' : 'per';
    if (!!q.typed !== !!m[2]) return fail('the typed circle stem names its unit; the MCQ one does not');
  } else if ((m = text.match(/^What is the (area|perimeter) of the (semicircle|quarter circle), in (cm|cm²|m|m²)\? Take π = (?:22\/7|3\.14)\.$/))) {
    const want = m[2] === 'semicircle' ? [1, 0] : [0, 1];
    if (halves !== want[0] || quarters !== want[1] || g.kinds.some(k => k.inward)) return fail(`the drawing is not a ${m[2]}`);
    qty = m[1] === 'area' ? 'area' : 'per'; unitWord = m[3];
  } else if ((m = text.match(/^The figure shows a quarter circle\. A straight line joins the ends of its curved edge, making a right-angled triangle with the two radii\. The part between the straight line and the curved edge is shaded\. Take π = (?:22\/7|3\.14)\. What is the area of the shaded part, in (cm²|m²)\?$/))) {
    /* the segment: one quarter-turn arc and its chord, and the white triangle's two legs drawn */
    if (quarters !== 1 || halves || g.straight.length !== 1 || g.kinds[0].inward) return fail('the drawing is not a quarter-circle segment');
    if (fig.frames < 2) return fail('the white triangle is not drawn');
    qty = 'area'; unitWord = m[1]; composite = true;
    if (q.band !== 3 || q.exam !== 'problem' || !q.typed) return fail('a Paper 2 item must be typed, band 3, exam problem');
  } else if ((m = text.match(/^The figure shows a square\. Two quarter circles are drawn inside it, each centred on a corner of the square, at opposite corners\. The part where they overlap is shaded\. Take π = (?:22\/7|3\.14)\. What is the (area|perimeter) of the shaded part, in (cm|cm²|m|m²)\?$/))) {
    /* the leaf: two outward quarter-turn arcs, no straight edge, inside a drawn square */
    if (quarters !== 2 || halves || g.straight.length || g.kinds.some(k => k.inward)) return fail('the drawing is not a leaf');
    if (fig.frames !== 4) return fail('the square is not drawn');
    if (!g.kinds.every(k => fig.labs.some(l => near6(l.v, k.r)))) return fail('the radius is not the printed side of the square');
    qty = m[1] === 'area' ? 'area' : 'per'; unitWord = m[2]; composite = true;
    if (q.band !== 3 || q.exam !== 'problem' || !q.typed) return fail('a Paper 2 item must be typed, band 3, exam problem');
  } else if ((m = text.match(/^(?:A garden|A flower bed|A running track|A school field|A jogging path|The figure shows|A wooden board|A piece of land|A lawn) .+ Take π = (?:22\/7|3\.14)\. (How long is the fence|What is the area of the flower bed|How far does the runner go|What is the area covered with grass|What is the area of the shaded part|How much ribbon is needed|What area does [A-Z][a-z]+(?: [A-Z][a-z]+)? paint|How long is the tape|What is the area of the land|How far does (?:he|she) walk), in (m|m²|cm|cm²)\?$/))) {
    composite = true;
    qty = /area/i.test(m[1]) ? 'area' : 'per';
    unitWord = m[2];
    if (!g.straight.length || !g.kinds.length) return fail('a composite figure must have straight and curved edges');
    if (/semicircle at each end/.test(text) && !(halves === 2 && quarters === 0)) return fail('a track draws two semicircles');
    if (/quarter circle/.test(text) && quarters !== 1) return fail('the stem names a quarter circle the drawing lacks');
    if (/(?:and|with) a semicircle(?! at each end)/.test(text) && halves !== 1) return fail('the stem names one semicircle');
    if (/cut (?:away|out)/.test(text) !== g.kinds.some(k => k.inward)) return fail('the stem and the drawing disagree about a cut');
    if (q.band !== 3 || q.exam !== 'problem') return fail('a composite Paper 2 item must be band 3, exam problem');
    if (text.split(/\s+/).length < 12) return fail('a Paper 2 stem has at least 12 words');
    if (!q.typed) return fail('a Paper 2 item is typed');
  } else return fail('unmatched stem');

  /* the child has every number: straight edges are labels or a sum/difference of two, radii labels or half of one */
  const L = fig.labs.map(l => l.v);
  const derivable = x => L.some(a => near6(a, x)) || L.some(a => L.some(b => near6(a + b, x) || near6(a - b, x)));
  for (const e of (qty === 'per' ? g.straight : [])) if (!derivable(e)) return fail(`a straight edge of ${e} ${U} cannot be worked out from the printed labels`);
  for (const k of g.kinds) if (!L.some(a => near6(a, k.r) || near6(a / 2, k.r))) return fail(`an arc of radius ${k.r} ${U} cannot be worked out from the printed labels`);

  const want = qty === 'area' ? g.area : g.per;
  const unit = qty === 'area' ? U + '²' : U;
  if (unitWord && unitWord !== unit) return fail(`the stem asks in ${unitWord} but the figure is in ${U}`);
  if (q.typed) return checkTyped(want, unit);
  if (!exact(want)) return fail(`the true answer ${want} needs more than 2 decimal places`);
  const vals = q.choices.map(c => { const mm = kit.strip(c).match(/^(\d+(?:\.\d+)?) (cm²|cm|m²|m)$/); return mm && mm[2] === unit ? Number(mm[1]) : null; });
  if (vals.some(v => v === null)) return fail(`every option must be a number in ${unit}`);
  const right = vals.map((v, i) => near6(v, dp2(want)) ? i : -1).filter(i => i >= 0);
  if (right.length !== 1) return fail(`${right.length} options equal ${dp2(want)}`);
  return right[0] === q.correct ? null : fail(`the key should be option ${right[0]}`);
}
