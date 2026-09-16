/* Deterministic sanity harness for Math Quest Island question generators.
 *
 * Post-split version. The app is zero-build static JS, so this is a
 * zero-dependency Node script (built-ins only). It loads js/core.js (the pure,
 * DOM-free generator kit + registries) and every js/topics/*.js into a bare vm
 * context with no browser globals, then for each registered generator:
 *
 *   1. samples it N times (env SAMPLES, default 200),
 *   2. checks the shape (4 distinct choices, correct index in range,
 *      answerText === choices[correct], typed answers finite),
 *   3. checks integrity (no NaN / undefined / null / Infinity anywhere in the
 *      rendered strings, numeric choices finite and positive integers),
 *   4. INDEPENDENTLY re-derives the answer from the rendered question text
 *      wherever an oracle matches - it never trusts the generator's own
 *      answerText,
 *   5. counts distinct question texts to catch a collapsed sample space.
 *
 * It then runs buildSetFor() for every registered topic and asserts full,
 * unique, valid sets at all three difficulty pools.
 *
 * Run:  node tools/gen-sanity.mjs      (or: npm test)
 * Exit: 0 if every generator passes, 1 on any failure.
 *
 * ORACLE COVERAGE is reported per generator. A sample with no matching oracle
 * is a WARN, not a failure: it still passed shape + integrity, but its answer
 * key was not independently re-derived. Content lanes must not ship a new
 * generator whose oracle coverage is 0% - add the oracle here in the same
 * sitting (see js/topics/README.md).
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const N = Number(process.env.SAMPLES) || 200;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- load the pure layer in a DOM-less vm ---------- */
const ctx = { Math, console, Number, Array, Set, Map, JSON, String, Object, Boolean, Error, isNaN, parseInt, parseFloat };
ctx.globalThis = ctx;
vm.createContext(ctx);

const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
load('js/core.js');
/* js/figures.js is the ONE renderer for every diagram in the game. It is pure
   string building with no DOM, so it loads in this bare vm exactly as it loads in
   the browser, and the harness draws each q.figure spec with the SAME code the app
   uses. That is what keeps every oracle below independent: they parse the rendered
   labels a child reads, never the generator's own return values. */
load('js/figures.js');
const topicFiles = fs.readdirSync(path.join(ROOT, 'js/topics')).filter(f => f.endsWith('.js')).sort();
for (const f of topicFiles) load('js/topics/' + f);

const MQI = ctx.MQI;
const TOPICS = MQI.topics;

/* ---------- helpers ---------- */
const strip = s => String(s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const near = (x, y) => Math.abs(x - y) < 1e-9;
const parseFrac = html => {
  const m = String(html).match(/<span class="n">(\d+)<\/span><span class="d">(\d+)<\/span>/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
const allFracs = html => [...String(html).matchAll(/<span class="n">(\d+)<\/span><span class="d">(\d+)<\/span>/g)]
  .map(m => [Number(m[1]), Number(m[2])]);
const gcd = (a, b) => { while (b) { [a, b] = [b, a % b]; } return a; };

/* Independent re-evaluator for the P5 order-of-operations / brackets stems.
   Space-separated tokens only: numbers, + - x /, and ( ). Deliberately NOT eval:
   it re-applies the precedence rule the question is testing. Returns null if the
   expression is not in that shape. */
function evalExpr(src) {
  const toks = String(src).trim().split(/\s+/);
  if (!toks.length) return null;
  if (!toks.every(t => /^(\d+|[+\-x/()])$/.test(t))) return null;
  const flat = list => {
    if (!list.length || list.length % 2 === 0) return null;
    let vals = [Number(list[0])], ops = [];
    for (let i = 1; i < list.length; i += 2) {
      const op = list[i], v = Number(list[i + 1]);
      if (!Number.isFinite(v)) return null;
      if (op === 'x') vals[vals.length - 1] *= v;
      else if (op === '/') vals[vals.length - 1] /= v;
      else if (op === '+' || op === '-') { ops.push(op); vals.push(v); }
      else return null;
    }
    let acc = vals[0];
    for (let i = 0; i < ops.length; i++) acc = ops[i] === '+' ? acc + vals[i + 1] : acc - vals[i + 1];
    return acc;
  };
  let work = toks.slice(), guard = 0;
  while (work.includes('(')) {
    if (++guard > 20) return null;
    const close = work.indexOf(')');
    if (close < 0) return null;
    const open = work.lastIndexOf('(', close);
    if (open < 0) return null;
    const inner = flat(work.slice(open + 1, close));
    if (inner === null || !Number.isFinite(inner)) return null;
    work = work.slice(0, open).concat([String(inner)], work.slice(close + 1));
  }
  if (work.includes(')')) return null;
  const out = flat(work);
  return Number.isFinite(out) ? out : null;
}

/* A question's identity is its stem PLUS its rendered extra PLUS its options:
   several generators keep a fixed stem ("Which fraction is the greatest?") and
   vary only the choices, and buildSetFor's own dedup key is the raw HTML. */
const qKey = q => strip(q.q) + '|' + String(q.extra || '') + '|' +
  (q.typed ? String(q.answer) : (q.choices || []).map(strip).join(','));

/* ---------- the figure contract (iOS phase 0) ----------
 * A generator emits its diagram as PURE DATA on `q.figure` ({type, ...fields},
 * documented in js/topics/README.md) and NEVER as markup, so the same engine can
 * feed a web renderer and a SwiftUI one. Two gates enforce it:
 *
 *   checkNoMarkup   an ALLOWLIST over EVERY string in the question object.
 *   drawFigure      renders q.figure through js/figures.js into q.extra BEFORE
 *                   any oracle runs, so every answer key is still re-derived from
 *                   the rendered labels and qKey still sees the whole picture.
 *
 * KILL FIX K1 (Figure Spec Refutation, 2026-09-07). The first version of this rule
 * was a two-token DENYLIST (`<svg`, `<div`) over four named fields. The refuter
 * walked two real bar models straight through it and onto the child's screen:
 *
 *   A2  '<table class=barModel><tr><td bgcolor=blue width=24 height=18>...'
 *   B2  '<span style="display:block;width:120px;height:14px;background:#4c8bf5">'
 *
 * both in `q.extra` with NO `q.figure` - and app.js's figHtml() falls back to
 * q.extra whenever q.figure is absent, so both rendered. `<img>` passed too, and
 * so did markup on any key the four-field list did not name (wound 1, `q.extra2`).
 * A denylist can only ever ban the pictures somebody already thought of.
 *
 * The rule is now inverted and total:
 *
 *   1. EVERY string reachable from `q` is checked - the stem, extra, explain,
 *      answerText, every choice, every nested object and array, every key nobody
 *      has invented yet. The walk is recursive and cycle-safe.
 *   2. In each of those strings, a '<' followed by a letter or '/' opens a tag.
 *      The tag must appear VERBATIM in MARKUP_ALLOWLIST below. There is no
 *      pattern, no attribute sniffing and no denylist: an unlisted tag fails,
 *      full stop, and so does a listed tag carrying an attribute (`<span
 *      style=...>` is not `<span class="frac">`).
 *   3. Adding a tag is a deliberate edit to that list plus a row in
 *      js/topics/README.md. Pictures never qualify: a picture is a q.figure spec.
 *   4. `q.figure` itself is held to the stricter rule it already had - data only,
 *      not one '<' anywhere - and its `type` must be one js/figures.js draws.
 *   5. Belt: a generator carrying a q.figure must leave q.extra EMPTY, which is
 *      what the README already says. drawFigure() fills it in afterwards.
 *
 * The allowlist is INLINE TEXT markup a stem is genuinely allowed to carry: bold,
 * emphasis, super/subscript, a line break, and the fraction spans core.js's fr()
 * builds. Nothing here has geometry, colour or a box.
 */
const MARKUP_ALLOWLIST = [
  '<b>', '</b>',
  '<i>', '</i>',
  '<em>', '</em>',
  '<strong>', '</strong>',
  '<sup>', '</sup>',
  '<sub>', '</sub>',
  '<br>',
  '<span class="frac">',       /* core.js fr(): the fraction stack */
  '<span class="n">',          /*   numerator  */
  '<span class="d">',          /*   denominator */
  '</span>'
];
const ALLOWED = new Set(MARKUP_ALLOWLIST);

/* Returns the offending tag, or null. A '<' that is not followed by a letter or a
   '/' is arithmetic ("3 < 5"), not markup, and is left alone. */
function markupIn(s) {
  const str = String(s);
  for (let i = str.indexOf('<'); i >= 0; i = str.indexOf('<', i + 1)) {
    const c = str[i + 1];
    if (!c || !/[a-zA-Z/]/.test(c)) continue;
    const end = str.indexOf('>', i);
    if (end < 0) return `"${str.slice(i, i + 40)}" (unterminated tag)`;
    const tag = str.slice(i, end + 1);
    if (!ALLOWED.has(tag)) return `"${tag}"`;
  }
  return null;
}

/* Every string reachable from a value, with the path that reached it. Cycle-safe;
   functions, numbers and booleans are skipped (they cannot carry markup). */
function eachString(v, path, out, seen) {
  if (v === null || v === undefined) return;
  if (typeof v === 'string') { out.push([path || '(root)', v]); return; }
  if (typeof v !== 'object') return;
  if (seen.has(v)) return;
  seen.add(v);
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) eachString(v[i], `${path}[${i}]`, out, seen); return; }
  for (const k of Object.keys(v)) eachString(v[k], path ? `${path}.${k}` : k, out, seen);
}

function checkNoMarkup(q) {
  if (!q) return null;
  if (q.figure !== undefined) {
    if (!q.figure || typeof q.figure !== 'object' || typeof q.figure.type !== 'string') {
      return 'q.figure must be an object carrying a string `type`';
    }
    let json;
    try { json = JSON.stringify(q.figure); } catch (e) { return 'q.figure is not serialisable data: ' + e.message; }
    if (json === undefined || json.indexOf('<') >= 0) {
      return 'q.figure carries markup - a figure spec is data only';
    }
    if (!ctx.MQI.figureTypes.includes(q.figure.type)) {
      return `unknown figure type "${q.figure.type}" - js/figures.js draws [${ctx.MQI.figureTypes.join(', ')}]`;
    }
    if (q.extra) {
      return 'a generator with a q.figure must leave q.extra empty - the harness and app.js draw the spec (js/topics/README.md)';
    }
  }
  const strings = [];
  const { figure, ...rest } = q;          /* q.figure is checked above, by the stricter rule */
  eachString(rest, '', strings, new Set());
  for (const [path, s] of strings) {
    const bad = markupIn(s);
    if (bad) {
      return `figure markup in generator output field "${path}": ${bad} is not on the inline-text allowlist ` +
        `- a picture is a q.figure spec, not markup (js/topics/README.md)`;
    }
  }
  return null;
}
function drawFigure(q) {
  if (!q || !q.figure) return null;
  try { q.extra = ctx.MQI.renderFigure(q.figure); }
  catch (e) { return 'renderFigure threw on this spec: ' + e.message; }
  if (!q.extra || !q.extra.length) return 'renderFigure returned nothing for type ' + q.figure.type;
  return null;
}

/* ---------- the typed-unit gate (Dress Rehearsal Phase 0, 2026-09-07) ----------
 *
 * THE DEFECT. finishTyped's 4th argument lands on q.unit, and gradeTyped rejects
 * a MISMATCHED unit while accepting a missing one. A generator that passes no
 * unit therefore leaves q.unit empty, and gradeTyped's other branch takes over:
 * a unit typed on a question that declares none is accepted whenever it appears
 * on core.js's shared TYPED_UNITS list. On Triangle Terrace's
 *   "A triangle has a base of 14 cm and a height of 20 cm. What is its area, in cm²?"
 * the clean-room rehearsal typed into the live grader and got
 *   140 -> true · 140 cm -> true · 140 kg -> true · 140 pupils -> true.
 * Not a wrong key and never a right answer marked wrong, but the wave-2 unit
 * contract simply not applied. Four generators in one file, and the harness had
 * nothing to say about it.
 *
 * THE RULE. A TYPED question whose STEM text carries a unit token must declare
 * q.unit. Anything else fails the build, naming the generator. The token list is
 * the set of things the grader will silently strip off a child's answer
 * (core.js TYPED_UNITS) plus the three the stems write but core does not strip
 * ('$', 'cents', 'dollars'). Stem text only - the explanation is not scanned,
 * because the explanation is not what the child is answering.
 *
 * q.unit may be a STRING or an ARRAY of EQUIVALENT units (['cm³','ml']); the array
 * satisfies the rule the same way and its shape is validated by unitDeclErr below.
 *
 * WHAT THE RULE DOES NOT DO. It does not check that the declared unit is the
 * RIGHT one: gFindBase's stem says cm² and its answer is in cm, and both are
 * correct. Declaring anything is enough; declaring nothing is the bug.
 *
 * COUNT ANSWERS, and how they are disambiguated. "How many pupils are there in
 * the class?" names a token ('pupils' is on TYPED_UNITS, so the grader strips it)
 * but the answer is a bare number. Three legal ways out, and a lane must pick one
 * deliberately:
 *   1. DECLARE the count noun - p5-rate.js already ships 'pages' and 'buns' this
 *      way. A bare number still passes (a missing unit is always accepted), and
 *      "24 kg" starts failing. This is the right answer for most count stems and
 *      is what p4-fractions.js gFracOfSetWhole and p3-puzzle-caves.js gGiveTake
 *      now do.
 *   2. DECLARE AN ARRAY when two spellings are the same quantity and BOTH are
 *      right - p5-volume.js gUnitCubes counts 1 cm cubes, so 'cubes' and 'cm³' are
 *      both correct and it declares ['cubes','cm³']. That is the exit that used to
 *      need the opt-out below, and it closes the hole the opt-out left ("48 kg" was
 *      being accepted the whole time).
 *   3. OPT OUT EXPLICITLY, with a reason, when NO declaration can express what is
 *      right - the last resort, and there is NO USER of it today (gUnitCubes, the
 *      only one the unit sweep took, moved to the array form under Unit Sweep
 *      Refutation W3, whose finding was that its reason named a right answer the
 *      build rejected). The generator attaches `q.unitOptOut = '<why>'` in its own
 *      topic file. The reason is mandatory and must be a real sentence - an empty,
 *      missing or token reason is itself a failure, so the escape hatch cannot be
 *      taken silently, and it is refused outright on a generator that DOES declare
 *      a unit. Before taking it, check the array form cannot say what you mean.
 */
const UNIT_SYMBOLS = ['cm³', 'cm3', 'cm²', 'cm2', 'm³', 'm3', 'm²', 'm2', 'ℓ', '°', '%', '$'];
/* Word tokens are matched on their own, never inside a word, and never straight
   after a full stop or an apostrophe - which is what keeps the 'g' in "e.g." and
   the 's' in "Children's Day" from reading as grams and seconds. The two
   one-letter time units core.js strips, 'h' and 's', are deliberately NOT scanned
   for here: no stem in the app writes them, and they collide with ordinary prose.
   Every other token below is one core.js will strip off a typed answer. */
const UNIT_WORDS = ['km', 'cm', 'mm', 'ml', 'kg', 'm', 'g', 'l',
  'degrees', 'degree', 'deg',
  'minutes', 'minute', 'mins', 'min', 'hours', 'hour', 'hr', 'seconds', 'secs', 'sec',
  'litres', 'litre', 'cents', 'cent', 'dollars', 'dollar',
  'pages', 'page', 'buns', 'bun', 'books', 'book', 'pupils', 'pupil',
  'marbles', 'marble', 'stickers', 'sticker', 'beads', 'bead'].sort((a, b) => b.length - a.length);
const UNIT_WORD_RE = new RegExp("(?<![A-Za-z0-9.'’])(" + UNIT_WORDS.join('|') + ')(?![A-Za-z0-9])', 'i');
function stemUnitToken(text) {
  for (const s of UNIT_SYMBOLS) if (text.indexOf(s) !== -1) return s;
  const m = text.match(UNIT_WORD_RE);
  return m ? m[1].toLowerCase() : null;
}
/* THE ARRAY FORM. q.unit may be a STRING (one unit) or an ARRAY of EQUIVALENT units
   (['cm³','ml']), any of which gradeTyped accepts, the FIRST being canonical and the
   one printed. It exists because 1 ml IS 1 cm³ and three p5volume stems print that
   identity themselves while a single declared unit rejected the other half of it
   (Unit Sweep Refutation W2, 2026-09-07). The gate validates the shape rather than
   trusting it: an empty array declares nothing, a blank or non-string member is a
   typo, and two members that normalise to the SAME unit ('cm³' + 'cm3') are a
   misunderstanding of what the array is for - it is for equivalent QUANTITIES, not
   for spellings, which core.js's alias table already handles. */
function unitDeclErr(declared) {
  if (!Array.isArray(declared)) return null;
  if (!declared.length) return 'declares q.unit as an EMPTY array, which declares nothing (pass a string, or the units in accept order)';
  const seen = new Set();
  for (const u of declared) {
    if (typeof u !== 'string' || !u.trim()) {
      return `q.unit array holds a non-string / blank member ${JSON.stringify(u)} - every member must be a unit the child may type`;
    }
    const n = ctx.MQI.normUnit(u);
    if (seen.has(n)) {
      return `q.unit array lists ${JSON.stringify(u)} twice over (it normalises to "${n}", already declared) - ` +
        `the array is for EQUIVALENT quantities, not spellings; core.js aliases cm3/cm² style spellings already`;
    }
    seen.add(n);
  }
  return null;
}
function checkTypedUnit(q) {
  if (!q || !q.typed) return null;
  const declared = q.unit || q.units || '';
  const why = typeof q.unitOptOut === 'string' ? q.unitOptOut.trim() : '';
  const shapeErr = unitDeclErr(declared);
  if (shapeErr) return shapeErr;
  const declares = Array.isArray(declared) ? declared.length > 0 : !!declared;
  if (declares && why) return 'declares a unit AND opts out of the unit rule: pick one';
  if (declares) return null;
  const tok = stemUnitToken(strip(q.q));
  if (!tok) return null;
  if (!why) {
    return `typed stem names the unit "${tok}" but the generator declares no q.unit, ` +
      `so the grader accepts ANY unit on it (pass the unit as finishTyped's 4th argument, ` +
      `or opt out with q.unitOptOut = '<why the answer is a bare number>')`;
  }
  if (why.length < 20 || why.split(/\s+/).length < 5) {
    return `q.unitOptOut needs a real reason, got ${JSON.stringify(q.unitOptOut)}`;
  }
  return null;
}
/* Drift guard: every measurement token above must still be one core.js strips off
   a typed answer. If TYPED_UNITS is ever narrowed, this rule would be scanning for
   something the grader no longer accepts, and the list has to be re-cut by hand. */
/* Quest Refutation K2 (2026-09-07): `$ cents cent dollars dollar` used to live in
   here, because the stems wrote them and the grader stripped none of them. They
   are on TYPED_UNITS now, so the drift guard checks them like any other token. */
const UNIT_STEM_ONLY = new Set(['m3', 'm³',
  'book', 'pupil', 'marble', 'sticker', 'bead']);
{
  const drift = [];
  for (const t of UNIT_SYMBOLS.concat(UNIT_WORDS)) {
    if (UNIT_STEM_ONLY.has(t)) continue;
    const p = ctx.MQI.parseTypedAnswer('7 ' + t);
    if (!p.ok || p.unit.toLowerCase() !== t.toLowerCase()) drift.push(t);
  }
  if (drift.length) {
    console.error(`FAIL  typed-unit gate: core.js no longer strips ${drift.join(', ')} - re-cut UNIT_WORDS/UNIT_SYMBOLS against TYPED_UNITS`);
    process.exit(1);
  }
}

/* ---------- shape + integrity, applied to every sample ---------- */
const BAD = /\b(NaN|undefined|null|Infinity)\b/;
function checkShape(q) {
  if (!q || typeof q.q !== 'string' || !q.q.length) return 'empty question';
  if (typeof q.answerText !== 'string' || !q.answerText.length) return 'empty answerText';
  for (const [k, v] of Object.entries({ q: q.q, extra: q.extra || '', explain: q.explain || '', answerText: q.answerText })) {
    if (BAD.test(String(v))) return `NaN/undefined leaked into ${k}: ${strip(v)}`;
  }
  /* EXPLANATION ORACLE (P4 refutation, recommended gate). A rounding item that
     lands exactly on the halfway mark may not tell the child it "is nearer" the
     answer: it is not nearer, it is equidistant. Checked on the RENDERED stem +
     RENDERED explanation, so it binds any generator that writes rounding prose. */
  {
    const st = strip(q.q), ex = strip(q.explain || '');
    const rm = st.match(/^Round ([\d ,]+) to the nearest (10|100|1000)\.$/);
    if (rm) {
      const n = Number(rm[1].replace(/[ ,]/g, '')), u = Number(rm[2]);
      const tie = n % u === u / 2;
      if (tie && /is nearer/.test(ex)) return `false "is nearer" on a halfway value: ${st} / ${ex}`;
      if (!tie && /exactly halfway/.test(ex)) return `claims "exactly halfway" on a non-tie value: ${st}`;
    }
  }
  if (q.typed) {
    if (!Number.isFinite(q.answer)) return 'typed answer not finite';
    if (q.correct !== -1) return 'typed question must carry correct:-1';
    return null;
  }
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return 'expected 4 choices, got ' + (q.choices || []).length;
  if (!(q.correct >= 0 && q.correct < q.choices.length)) return 'correct index out of range: ' + q.correct;
  const plain = q.choices.map(strip);
  if (plain.some(p => !p.length)) return 'blank choice';
  if (plain.some(p => BAD.test(p))) return 'NaN/undefined in a choice: ' + plain.join(' | ');
  if (new Set(plain).size !== plain.length) return 'duplicate choices: ' + plain.join(' | ');
  if (strip(q.choices[q.correct]) !== strip(q.answerText)) return 'answerText != choices[correct]';
  /* Distractor-identity contract (P3 refutation 2026-09-05): a generator that sets
     q.authored asserts that EVERY authored distractor differs from the answer and
     that no shipped option was silently padded in by finishNum. */
  if (Array.isArray(q.authored)) {
    const ans = parseFloat(strip(q.answerText));
    if (q.authored.some(c => near(c, ans))) return 'authored distractor identical to the answer: ' + q.authored.join(',');
    const allowed = new Set(q.authored.map(Number));
    for (let i = 0; i < q.choices.length; i++) {
      if (i === q.correct) continue;
      const v = parseFloat(strip(q.choices[i]));
      if (!allowed.has(v)) return 'padded distractor shipped (' + v + '); authored: ' + q.authored.join(',');
    }
  }
  // numeric choices must be finite and positive (no negative or absurd distractors)
  for (const p of plain) {
    const n = parseFloat(p);
    if (!Number.isNaN(n) && !/^\d+\/\d+$/.test(p)) {
      if (!Number.isFinite(n)) return 'non-finite numeric choice: ' + p;
      if (n < 0) return 'negative choice offered: ' + p;
    }
  }
  return null;
}

/* ===== SWEEP 2026-09-15: P4 DECIMALS ========================================
 * The decimals bank is dispatched on the TOPIC ID, before every other branch,
 * and decimalsOracle() never returns `false`: a decimals stem that matches no
 * branch is a build FAILURE, not the usual "no oracle matched" warning. That is
 * the strongest reading of the depth-pilot contract's "oracle in the same commit
 * as the generator", and it means the file cannot grow a generator whose key is
 * never re-derived.
 *
 * Every re-derivation here is done in SCALED INTEGERS. "0.1 + 0.2 === 0.3" is
 * false in floating point, and a harness that re-derives a decimal key with
 * Number arithmetic is re-deriving it with the same class of error it is meant
 * to catch. `DP` parses a printed decimal into { n, dp }; nothing below divides.
 */
const DP = s => {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(s).trim());
  if (!m) return null;
  const f = m[3] || '';
  return { n: (m[1] === '-' ? -1 : 1) * Number(m[2] + f), dp: f.length };
};
const TEN = k => Math.pow(10, k);
const DCMP = (a, b) => { const m = Math.max(a.dp, b.dp); return a.n * TEN(m - a.dp) - b.n * TEN(m - b.dp); };
const DEQ = (a, b) => DCMP(a, b) === 0;
const DV = (n, dp) => ({ n, dp });
function DROUND(d, to) {
  if (d.dp <= to) return DV(d.n * TEN(to - d.dp), to);
  const cut = TEN(d.dp - to), base = Math.floor(d.n / cut), rem = d.n - base * cut;
  return DV(rem * 2 >= cut ? base + 1 : base, to);
}
function DTXT(d) {
  if (d.dp === 0) return String(d.n);
  const p = TEN(d.dp), w = Math.floor(Math.abs(d.n) / p);
  let f = String(Math.abs(d.n) - w * p);
  while (f.length < d.dp) f = '0' + f;
  return (d.n < 0 ? '-' : '') + w + '.' + f;
}
const DEC_UNIT = /\s*(kg|km|cm|mm|m|g|ℓ|ml|l)$/i;
const decOf = s => DP(String(s).replace(/^\$/, '').replace(DEC_UNIT, '').trim());
const decOpts = q => (q.choices || []).map(c => decOf(strip(c)));
const DEC_PLACES = ['ones', 'tenths', 'hundredths', 'thousandths'];
const DEC_PLACE_ONE = ['one', 'tenth', 'hundredth', 'thousandth'];
const DECQTY = (n, place) => n + ' ' + (n === 1 ? DEC_PLACE_ONE[place] : DEC_PLACES[place]);
const DEC_ROUND_TO = { 'the nearest whole number': 0, '1 decimal place': 1, '2 decimal places': 2 };
const DEC_ROUND_PHRASE = ['the nearest whole number', '1 decimal place', '2 decimal places'];
const decCountWhere = (q, pred) => decOpts(q).filter(v => v && pred(v)).length;
/* the four ways a place miscount can go, re-derived here rather than imported, so
   the generator and the oracle cannot drift into agreement by sharing a string */
const DEC_MISCOUNT = k => 'counted ' + (Math.abs(k) === 1 ? 'one place' : 'two places') + ' too ' +
  (k > 0 ? 'many' : 'few') + ' after the decimal point';
/* every number token an option prints, as exact { n, dp } pairs */
const decTokens = s => [...String(strip(s)).matchAll(/\d+(?:\.\d+)?/g)].map(x => DP(x[0])).filter(Boolean);

/* ---------- DEFENSIBILITY ORACLE, the rounding-diagnosis family ------------------
   THE KILL, THIRD PASS (refutation v3 @ c9d26fb). gDecRoundError shipped TWO
   defensible answers on 40,000 of 40,000 draws, and no gate in any lane could see
   it: there was no tell to find. The item asked which digit the child had looked
   at, keyed the unique OTHER digit that justifies the direction under a correctly
   applied rule, and shipped the option naming the ROUNDING digit as wrong - even
   though a child who reads the right digit and applies "4 or less rounds up"
   produces the claimed answer exactly, which is the commonest P4 rounding error.

   THE RULE NOBODY HAD: every option of an error-diagnosis item must be REFUTED BY
   SOMETHING THE STEM ACTUALLY STATES. So this re-derives the defensibility of all
   four options from the rendered stem and the build FAILS unless exactly one
   survives. It parses both shapes on purpose - the shipped one and the killed one
   - so the killed shape is a live negative control rather than a frozen string.

   v4 (shipped): the stem pins the method (which digit the child read, and that the
   5-or-more rule was applied to it correctly), and the options are a 2 x 2 grid
   over the right digit and the right answer. An option is defensible only if BOTH
   halves are right.
   v3 (killed, control only): nothing is pinned, and an option is defensible under
   the single-error reading if the child either read the right digit and applied
   the rule backwards, or read a wrong digit and applied the rule correctly. That
   is two options on every draw, which is the kill. --------------------------- */
const DEC_ORD4 = ['first', 'second', 'third', 'fourth'];
const DEC_V4_STEM = /^(.+?) rounds (\d+\.\d+) to (the nearest whole number|1 decimal place|2 decimal places)\. \1 looks at the (\d), says that (\d) is (5 or more|4 or less), rounds (up|down), and gives the answer (\d+(?:\.\d+)?)\. Which digit should \1 have looked at, and what is the correct answer\?$/;
/* v5 (this pass): the stem names the PLACE the child read, not the digit, and
   declares no answer at all; the two answers offered are the number rounded the
   right way and the number rounded the wrong way, both at the place the stem
   names. See the block comment on gDecRoundError. */
const DEC_V5_STEM = /^(.+?) rounds (\d+\.\d+) to (the nearest whole number|1 decimal place|2 decimal places)\. \1 looks at the (tens|ones|tenths|hundredths|thousandths) digit\. Which digit should \1 have looked at, and what is the correct answer\?$/;
const DEC_V3_STEM = /^(.+?) rounds (\d+\.\d+) to (the nearest whole number|1 decimal place|2 decimal places) and says the answer is (\d+(?:\.\d+)?)\. Which digit did \1 look at\?$/;
const DEC_V4_OPT = /^(.+?) should have looked at the digit (\d), and the answer is (\d+(?:\.\d+)?)\.$/;
const DEC_V3_OPT = /^(.+?) rounded (up|down) after looking at the (first|second|third|fourth) digit, (\d)\.$/;
/* the facts a rounding-diagnosis stem states, re-derived from the rendered text */
function decRoundDiagnosis(text) {
  let m, shape = null;
  if ((m = text.match(DEC_V5_STEM))) shape = 'v5';
  else if ((m = text.match(DEC_V4_STEM))) shape = 'v4';
  else if ((m = text.match(DEC_V3_STEM))) shape = 'v3';
  else return null;
  const who = m[1], v = DP(m[2]), to = DEC_ROUND_TO[m[3]];
  const digs = (m[2].replace('.', '').match(/\d/g) || []).map(Number);
  const wlen = m[2].indexOf('.');
  const said = shape === 'v5' ? null : DP(shape === 'v4' ? m[8] : m[4]);
  const f = { shape, who, v, to, digs, wlen, ci: wlen + to, said, truth: DROUND(v, to) };
  f.dc = f.digs[f.ci];
  if (shape === 'v4') { f.dx = Number(m[4]); f.dxSaid = Number(m[5]); f.rule = m[6]; f.dir = m[7]; }
  if (shape === 'v5') {
    f.xPlace = m[4];
    /* the index of the place the stem names, in the digits of the printed numeral.
       DEC_PLACES runs ones, tenths, hundredths, thousandths, and the ones digit is
       at wlen - 1, so the offset is that index minus one. */
    f.xi = m[4] === 'tens' ? wlen - 2 : wlen + DEC_PLACES.indexOf(m[4]) - 1;
    /* both answers live at the place the stem names, one column apart */
    const cut = TEN(v.dp - to), base = Math.floor(v.n / cut);
    f.wrong = DV(base + (f.dc >= 5 ? 0 : 1), to);
  }
  return f;
}
/* the direction the stem's own claim says the child went */
const decWentUp = f => DCMP(f.said, f.truth) > 0;
/* is this option consistent with everything the stem states? null = unparsed. */
function decRoundDefensible(f, optText) {
  let m;
  if (f.shape === 'v5') {
    if (!(m = optText.match(DEC_V4_OPT))) return null;      /* same option frame as v4 */
    const r = DP(m[3]);
    if (!r) return null;
    /* the stem pins the number and the place; the two live questions are which
       digit rounding is allowed to look at, and what that digit then gives */
    return Number(m[2]) === f.dc && DEQ(r, f.truth);
  }
  if (f.shape === 'v4') {
    if (!(m = optText.match(DEC_V4_OPT))) return null;
    const r = DP(m[3]);
    if (!r) return null;
    /* the stem pins the digit AND the rule, so the only live question is which
       digit rounding is allowed to look at - and what that digit then gives */
    return Number(m[2]) === f.dc && DEQ(r, f.truth);
  }
  if (!(m = optText.match(DEC_V3_OPT))) return null;
  const i = DEC_ORD4.indexOf(m[3]), d = Number(m[4]);
  if (i < 0 || f.digs[i] !== d) return false;          /* it misdescribes the number */
  const went = decWentUp(f) ? 'up' : 'down';
  if (m[2] !== went) return false;                     /* it contradicts the stem's claim */
  const correctly = d >= 5 ? 'up' : 'down';
  /* ONE error, which is the most generous reading a marker would allow: the right
     digit with the rule backwards, or a wrong digit with the rule applied right */
  return i === f.ci ? correctly !== went : correctly === went;
}

function decimalsOracle(q) {
  const text = strip(q.q);
  const ans = decOf(strip(q.answerText));
  const opts = decOpts(q);
  const keyIdx = q.correct;
  let m;

  /* --- PRINCIPLE 1: place value ------------------------------------------- */
  if ((m = text.match(/^What is the value of the digit (\d) in (\d+\.\d+)\?$/))) {
    /* KILL 2 (refutation v5 @ 8cf212b): the row is now the named digit at ALL FOUR
       places, so the ONES place is askable and the digit may sit before the point.
       The re-derivation reads the whole numeral, not just its tail. */
    const [w, dec] = m[2].split('.');
    const all = w + dec;
    const hits = [...all].filter(c => c === m[1]).length;
    if (hits !== 1) return `digit value: "${m[1]}" appears ${hits} times in ${m[2]} - the question has no single answer`;
    const place = w.indexOf(m[1]) >= 0 ? 0 : dec.indexOf(m[1]) + 1;
    if (place === 0 && w.length !== 1) return `digit value: ${m[2]} has more than one whole-number digit`;
    const want = DV(Number(m[1]), place);
    if (!ans || !DEQ(ans, want)) return `digit value: ${m[1]} in ${m[2]} is ${DTXT(want)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, v => DEQ(v, want)) !== 1) return 'digit value: two options are the same quantity as the key';
    /* and the KILL's own rule, asserted on every draw: the four options must be the
       named digit at four DIFFERENT depths, so neither "the commonest depth on the
       row" nor "the one ending in the digit the question names" can single one out. */
    const raw = q.choices.map(strip), vals = raw.map(decOf);
    if (vals.some(v => !v)) return 'digit value: an option is not a plain number';
    if (new Set(vals.map(v => v.dp)).size !== 4) {
      return `digit value: two options are written to the same depth (${raw.join(' | ')}) - "the commonest depth, ending in the named digit" reads the key off the row`;
    }
    if (vals.some(v => v.n !== Number(m[1]))) {
      return `digit value: an option is not the digit ${m[1]} at a place (${raw.join(' | ')}) - only the place may differ`;
    }
    return null;
  }
  if ((m = text.match(/^In (\d+\.\d+), which place is the digit (\d) in\?$/))) {
    const [w, dec] = m[1].split('.');
    const all = w + dec;
    if ([...all].filter(c => c === m[2]).length !== 1) return `name place: digit ${m[2]} is not unique in ${m[1]}`;
    const want = w.indexOf(m[2]) >= 0 ? 'ones' : DEC_PLACES[dec.indexOf(m[2]) + 1];
    const keyText = strip(q.choices[keyIdx]);
    if (keyText !== want) return `name place: ${m[2]} in ${m[1]} is ${want}, key says "${keyText}"`;
    if (q.choices.filter(c => strip(c) === want).length !== 1) return 'name place: the true place is offered twice';
    return null;
  }
  if ((m = text.match(/^Which number is made up of (.+)\?$/))) {
    let n = 0, seen = 0;
    for (const part of m[1].split(/,| and /)) {
      const pm = part.trim().match(/^(\d+) (ones?|tenths?|hundredths?|thousandths?)$/);
      if (!pm) return `build: cannot read the part "${part.trim()}"`;
      const place = DEC_PLACES.findIndex(p => p.startsWith(pm[2].replace(/s$/, '')));
      n += Number(pm[1]) * TEN(3 - place); seen++;
    }
    if (seen < 3) return 'build: fewer than three place-value parts named';
    const want = DV(n, 3);
    return ans && DEQ(ans, want) ? null : `build: parts make ${DTXT(want)}, key says ${strip(q.answerText)}`;
  }
  if ((m = text.match(/^How many (tenths|hundredths|thousandths) are there in (\d+\.\d+)\?$/))) {
    const j = DEC_PLACES.indexOf(m[1]), v = DP(m[2]);
    if (!v || v.dp > j) return `how many: ${m[2]} is finer than ${m[1]}`;
    const want = v.n * TEN(j - v.dp);
    return ans && ans.dp === 0 && ans.n === want ? null : `how many ${m[1]} in ${m[2]}: expected ${want}, key says ${strip(q.answerText)}`;
  }
  if ((m = text.match(/^Which of these shows (\d+\.\d+) written as the sum of its place values\?$/))) {
    const [w, dec] = m[1].split('.');
    const want = [w].concat([...dec].map((d, i) => DTXT(DV(Number(d), i + 1)))).join(' + ');
    const keyText = strip(q.choices[keyIdx]);
    if (keyText !== want) return `expanded form: ${m[1]} is "${want}", key says "${keyText}"`;
    if (q.choices.filter(c => strip(c) === want).length !== 1) return 'expanded form: the true sum is offered twice';
    return null;
  }
  if ((m = text.match(/^(.+?) says the digit (\d) in (\d+\.\d+) is worth (\d) (tenths?|hundredths?|thousandths?)\. What did .+ get wrong\?$/))) {
    const [wh, dec] = m[3].split('.');
    if ([...(wh + dec)].filter(c => c === m[2]).length !== 1) return `place error: digit ${m[2]} is not unique in ${m[3]}`;
    const place = wh.indexOf(m[2]) >= 0 ? 0 : dec.indexOf(m[2]) + 1;
    const said = DEC_PLACES.findIndex(p => p.startsWith(m[5].replace(/s$/, '')));
    if (said === place) return `place error: the claimed place (${m[5]}) is the RIGHT one - the stem contradicts itself`;
    if (said > dec.length) return `place error: the claim names ${m[5]}, a place ${m[3]} does not have`;
    if (Number(m[4]) !== Number(m[2])) return 'place error: the claim is about a different digit';
    /* WOUND 3 (refutation 2026-09-15). The options used to be the four PLACE NAMES
       written as sentences, so "find the place the digit is really in, pick the
       option naming that place" answered the item on 20,000 of 20,000 draws with
       the printed claim NEVER READ - the demand of the pool-1 lookup gDecNamePlace
       with a story round it. They are now the four ways the MISCOUNT can go, and
       the miscount exists only in the difference between the true place and the
       claimed one, so neither half of the answer is in the stem alone. This branch
       re-derives that difference and requires all four to be on offer exactly once,
       so the set can never narrow by inspection either. */
    const off = said - place;
    if (off === 0 || Math.abs(off) > 2) return `place error: the miscount is ${off} places - only -2, -1, 1 and 2 are offered`;
    const want = `${m[1]} ${DEC_MISCOUNT(off)}.`;
    const keyText = strip(q.choices[keyIdx]);
    if (keyText !== want) return `place error: expected key "${want}", got "${keyText}"`;
    const offered = [-2, -1, 1, 2].map(k => `${m[1]} ${DEC_MISCOUNT(k)}.`);
    for (const o of offered) {
      const hits = q.choices.filter(c => strip(c) === o).length;
      if (hits !== 1) return `place error: "${o}" is offered ${hits} times - all four miscounts must appear exactly once`;
    }
    return null;
  }

  /* --- PRINCIPLE 2: comparing, ordering, rounding -------------------------- */
  if ((m = text.match(/^Which decimal is the (greatest|smallest)\?$/))) {
    if (opts.some(v => !v)) return 'compare: an option is not a plain decimal';
    let best = opts[0];
    for (const v of opts) if (m[1] === 'greatest' ? DCMP(v, best) > 0 : DCMP(v, best) < 0) best = v;
    if (opts.filter(v => DEQ(v, best)).length !== 1) return 'compare: two options are the same number';
    return DEQ(opts[keyIdx], best) ? null
      : `compare: flagged ${strip(q.answerText)} as the ${m[1]}, but it is ${DTXT(best)}`;
  }
  if ((m = text.match(/^Which list is in order from the (smallest to the greatest|greatest to the smallest)\?$/))) {
    const asc = m[1].startsWith('smallest');
    const lists = q.choices.map(c => strip(c).split(',').map(s => DP(s.trim())));
    if (lists.some(l => l.length < 3 || l.some(v => !v))) return 'order: an option is not a list of decimals';
    const sortedCount = lists.filter(l => {
      for (let i = 1; i < l.length; i++) { const d = DCMP(l[i], l[i - 1]); if (asc ? d <= 0 : d >= 0) return false; }
      return true;
    }).length;
    if (sortedCount !== 1) return `order: ${sortedCount} of the four lists are in order - there must be exactly one`;
    const k = lists[keyIdx];
    for (let i = 1; i < k.length; i++) { const d = DCMP(k[i], k[i - 1]); if (asc ? d <= 0 : d >= 0) return `order: the key list is not in order (${strip(q.choices[keyIdx])})`; }
    return null;
  }
  if ((m = text.match(/^(.+?) says (\d+\.\d+) is greater than (\d+\.\d+), because (\d+) is greater than (\d+)\. Which of these puts it right\?$/))) {
    const A = DP(m[2]), B = DP(m[3]);
    if (DCMP(A, B) >= 0) return `compare error: the stem's "wrong" claim is TRUE - ${m[2]} is not less than ${m[3]}`;
    if (A.n !== Number(m[4]) || B.n !== Number(m[5])) {
      return `compare error: the printed digit strings (${m[4]}, ${m[5]}) are not the digits of ${m[2]} and ${m[3]}`;
    }
    if (A.n <= B.n) return 'compare error: the misconception does not even hold on the digits';
    if (A.dp !== B.dp + 1) return `compare error: ${m[2]} and ${m[3]} are ${A.dp - B.dp} places apart - the options only stay the same length at one`;
    /* KILL 2 (refutation v2 @ 0157aa1). The four options used to be four different
       sentences, three of which were the key on 0 / 40,000 draws - one of them the
       identical string every time. They are now four readings of the SAME
       comparison: B padded into A's place or not, crossed with which number is
       named as the greater. Exactly one is true, and the verdict splits 2-2 so the
       option naming the true greater number is not free. */
    const deep = DV(B.n * 10, A.dp), flat = DV(B.n, A.dp);
    const rows = [[deep, B], [flat, A], [deep, A], [flat, B]];
    const lined = /^Lined up with /.test(strip(q.choices[keyIdx]));
    const say = r => lined
      ? `Lined up with ${m[2]}, ${m[3]} is written ${DTXT(r[0])}, so ${DTXT(r[1])} is the greater one.`
      : `${m[2]} is ${A.n} ${DEC_PLACES[A.dp]} and ${m[3]} is ${r[0].n} ${DEC_PLACES[A.dp]}, so ${DTXT(r[1])} is the greater one.`;
    const offered = rows.map(say);
    for (const o of offered) {
      if (q.choices.filter(c => strip(c) === o).length !== 1) return `compare error: "${o}" is not offered exactly once`;
    }
    if (strip(q.choices[keyIdx]) !== offered[0]) return `compare error: expected key "${offered[0]}", got "${strip(q.choices[keyIdx])}"`;
    /* the verdict must split 2-2, or "pick the one naming the other number" wins */
    const namesB = q.choices.filter(c => strip(c).endsWith(`${m[3]} is the greater one.`)).length;
    if (namesB !== 2) return `compare error: ${namesB} of the four options name ${m[3]} as the greater - the verdict must split 2-2`;
    return null;
  }
  /* WOUND 4: the second `compare` voice in pool 3. One list, exactly one adjacent
     pair out of order, and the four options are the four adjacent pairs. */
  if ((m = text.match(/^(.+?) puts these decimals in order from the smallest to the greatest and writes: ([\d.,\s]+)\. Which two numbers are the wrong way round\?$/))) {
    const list = m[2].split(',').map(s => DP(s.trim()));
    if (list.length !== 5 || list.some(v => !v)) return 'order error: the printed list is not five decimals';
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      if (DEQ(list[i], list[j])) return `order error: ${DTXT(list[i])} appears twice in the list`;
    }
    const down = [];
    for (let i = 0; i < 4; i++) if (DCMP(list[i], list[i + 1]) > 0) down.push(i);
    if (down.length !== 1) return `order error: ${down.length} adjacent pairs are out of order - there must be exactly one`;
    const pair = i => `${DTXT(list[i])} and ${DTXT(list[i + 1])}`;
    for (let i = 0; i < 4; i++) {
      if (q.choices.filter(c => strip(c) === pair(i)).length !== 1) return `order error: the pair "${pair(i)}" is not offered exactly once`;
    }
    if (strip(q.choices[keyIdx]) !== pair(down[0])) return `order error: expected key "${pair(down[0])}", got "${strip(q.choices[keyIdx])}"`;
    /* the item must be worth setting: reading the digits as whole numbers has to
       give a different order from the true one, or there is no decimal work in it */
    const byDigits = list.slice().sort((x, y) => x.n - y.n);
    const byValue = list.slice().sort(DCMP);
    if (byDigits.every((v, i) => DEQ(v, byValue[i]))) return 'order error: the digit-string order and the true order agree - the trap does not bite';
    return null;
  }
  if ((m = text.match(/^Between which two whole numbers does (\d+\.\d+) lie\?$/))) {
    const v = DP(m[1]);
    const w = Math.floor(v.n / TEN(v.dp));
    if (v.n % TEN(v.dp) === 0) return `between: ${m[1]} is a whole number, so it lies between nothing`;
    const want = `${w} and ${w + 1}`;
    const hits = q.choices.map(strip).filter(t => {
      const pm = t.match(/^(\d+) and (\d+)$/);
      return pm && Number(pm[1]) * TEN(v.dp) <= v.n && v.n <= Number(pm[2]) * TEN(v.dp);
    }).length;
    if (hits !== 1) return `between: ${hits} of the options actually bracket ${m[1]}`;
    return strip(q.choices[keyIdx]) === want ? null : `between: expected "${want}", key says "${strip(q.choices[keyIdx])}"`;
  }
  if ((m = text.match(/^Round (\d+\.\d+) to (the nearest whole number|1 decimal place|2 decimal places)\.$/))) {
    const v = DP(m[1]), to = DEC_ROUND_TO[m[2]];
    if (v.dp > 3) return `round: ${m[1]} carries ${v.dp} decimal places - MOE P4 stops at 3`;
    if (v.dp <= to) return `round: ${m[1]} is already at ${m[2]}`;
    const want = DROUND(v, to);
    if (!ans || !DEQ(ans, want)) return `round(${m[1]} -> ${m[2]}): expected ${DTXT(want)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, x => DEQ(x, want)) !== 1) return 'round: two options are the correct answer';
    return null;
  }
  if ((m = text.match(/^(.+?) rounds a number to (the nearest whole number|1 decimal place|2 decimal places) and gets (\d+(?:\.\d+)?)\. Which of these could the number have been\?$/))) {
    const to = DEC_ROUND_TO[m[2]], target = DP(m[3]);
    if (target.dp !== to) return `round back: the target ${m[3]} is not written to ${m[2]}`;
    const hits = decCountWhere(q, v => DEQ(DROUND(v, to), target));
    if (hits !== 1) return `round back: ${hits} of the options round to ${m[3]} - there must be exactly one`;
    if (!opts[keyIdx] || !DEQ(DROUND(opts[keyIdx], to), target)) return 'round back: the key does not round to the target';
    return null;
  }
  {
    const f = decRoundDiagnosis(text);
    if (f) {
      /* THE KILL, third pass: the killed shape had two defensible answers, so its
         stem may not ship at all. THE KILL, fourth pass: the v4 stem printed the
         digit the child read AND offered a wrong answer written to a different
         place, so the rounding phrase deleted two options for free and the digit
         standing next to the printed one deleted a third. Both shapes are kept
         parseable only as negative controls. */
      if (f.shape === 'v3') {
        return 'round error: this is the v3 stem ("Which digit did X look at?"), which has two defensible answers - ' +
               'the stem must pin the method it is diagnosing';
      }
      if (f.shape === 'v4') {
        return 'round error: this is the v4 stem, which PRINTS the digit the child read and offers an answer ' +
               'written to a different place - "the answer at the place the stem names" and "the digit beside the ' +
               'one the stem names" settle it on 79% of draws with no arithmetic';
      }
      if (f.shape === 'v5') {
        const { v, to, digs, wlen, ci, dc, xi, truth, wrong } = f;
        if (digs.length !== 4) return `round error: ${DTXT(v)} prints ${digs.length} digits - the draw must print exactly four`;
        if (new Set(digs).size !== 4) return `round error: ${DTXT(v)} repeats a digit, so a named digit is ambiguous`;
        if (ci < 0 || ci > 3) return `round error: rounding ${DTXT(v)} to ${DEC_ROUND_PHRASE[to]} looks past the four printed digits`;
        if (xi < 0 || xi > 3) return `round error: the stem names the ${f.xPlace} place, which ${DTXT(v)} does not print`;
        if (xi === ci) return 'round error: the stem says the child read the very place rounding points at, so nothing went wrong';
        const cut = TEN(v.dp - to), base = Math.floor(v.n / cut);
        if (!DEQ(truth, DV(base + (dc >= 5 ? 1 : 0), to))) return 'round error: the correct answer does not re-derive';
        if (DEQ(wrong, truth) || wrong.n <= 0) return 'round error: the wrong-way answer is not a second answer';
        const raw = q.choices.map(strip);
        const parsed = raw.map(o => o.match(DEC_V4_OPT));
        if (parsed.some(x => !x)) return `round error: an option is not in the diagnosis frame ("${raw[parsed.findIndex(x => !x)]}")`;
        /* (a) THE ANSWER AXIS IS ARITHMETIC. Both answers must be written to the
           place the stem names, or the rounding phrase deletes two options for
           free - which is exactly the fourth pass's kill. */
        for (const pz of parsed) {
          const r = DP(pz[3]);
          if (!r) return 'round error: an option does not print a number';
          if (r.dp !== to) {
            return `round error: the option answer ${pz[3]} is not written to ${DEC_ROUND_PHRASE[to]} - ` +
                   'the rounding phrase would delete it with no arithmetic';
          }
          if (!DEQ(r, truth) && !DEQ(r, wrong)) return `round error: ${pz[3]} is neither the right answer nor the wrong-way one`;
        }
        /* (b) THE STEM NAMES A PLACE, NOT A DIGIT. No digit printed in the stem may
           be matched against, and the digit sitting in the named place may never be
           offered, or one option is refuted by reading alone. */
        const dx = digs[xi];
        for (const pz of parsed) if (Number(pz[2]) === dx) {
          return `round error: the digit in the ${f.xPlace} place (${dx}) is offered back - the stem refutes it for free`;
        }
        const verdicts = raw.map(o => decRoundDefensible(f, o));
        const live = verdicts.filter(Boolean).length;
        if (live !== 1) return `round error: ${live} defensible options - every distractor must be refuted by something the stem states`;
        if (!verdicts[keyIdx]) return `round error: the key is not the defensible option ("${raw[keyIdx]}")`;
        /* the 2 x 2 contract: two digits and two answers, each printed by exactly
           two of the four options, so no token singles an option out */
        const dSet = new Map(), rSet = new Map();
        for (const pz of parsed) {
          dSet.set(pz[2], (dSet.get(pz[2]) || 0) + 1);
          rSet.set(pz[3], (rSet.get(pz[3]) || 0) + 1);
        }
        if (dSet.size !== 2 || [...dSet.values()].some(c => c !== 2)) {
          return `round error: the option set is not a 2 x 2 grid - digits ${[...dSet.keys()].join(', ')}`;
        }
        if (rSet.size !== 2 || [...rSet.values()].some(c => c !== 2)) {
          return `round error: the option set is not a 2 x 2 grid - answers ${[...rSet.keys()].join(', ')}`;
        }
        if (!dSet.has(String(dc))) return 'round error: the digit rounding points at is not among the options';
        return null;
      }
      const { v, to, digs, wlen, ci, dc, dx, said, truth } = f;
      if (digs.length !== 4) return `round error: ${DTXT(v)} prints ${digs.length} digits - the draw must print exactly four`;
      if (new Set(digs).size !== 4) return `round error: ${DTXT(v)} repeats a digit, so the digit the stem names is ambiguous`;
      if (ci < 0 || ci > 3) return `round error: rounding ${DTXT(v)} to ${DEC_ROUND_PHRASE[to]} looks past the four printed digits`;
      if (said.dp !== to) return `round error: the claim ${DTXT(said)} is not even written to ${DEC_ROUND_PHRASE[to]}`;
      if (DEQ(said, truth)) return `round error: the printed claim ${DTXT(said)} is CORRECT - the stem contradicts itself`;
      /* the stem's own account of the child's method has to hold together: the
         digit it names must be a digit of the number, must not be the one rounding
         points at, and the rule and the direction it prints must be that digit's */
      if (f.dxSaid !== dx) return 'round error: the stem names two different digits for the one the child read';
      if (digs.indexOf(dx) < 0) return `round error: the stem says the child read ${dx}, which is not a digit of ${DTXT(v)}`;
      if (dx === dc) return 'round error: the stem says the child read the very digit rounding points at, so nothing went wrong';
      if (f.rule !== (dx >= 5 ? '5 or more' : '4 or less')) return `round error: the stem reads the 5-or-more rule wrongly on ${dx}`;
      if (f.dir !== (dx >= 5 ? 'up' : 'down')) return `round error: the stem's direction is not what ${dx} gives`;
      const cut = TEN(v.dp - to), base = Math.floor(v.n / cut);
      const wantSaid = DV(base + (dx >= 5 ? 1 : 0), to);
      if (!DEQ(said, wantSaid)) {
        return `round error: the claim ${DTXT(said)} is not what reading ${dx} gives (${DTXT(wantSaid)})`;
      }
      if (!DEQ(truth, DV(base + (dc >= 5 ? 1 : 0), to))) return 'round error: the correct answer does not re-derive';
      /* THE DEFENSIBILITY GATE. Every option is re-derived against the stem and
         exactly one may survive - the rule that the third pass's kill needed and
         that nothing in any lane expressed. */
      const raw = q.choices.map(strip);
      const verdicts = raw.map(o => decRoundDefensible(f, o));
      if (verdicts.some(x => x === null)) {
        return `round error: an option is not in the diagnosis frame ("${raw[verdicts.indexOf(null)]}")`;
      }
      const live = verdicts.filter(Boolean).length;
      if (live !== 1) return `round error: ${live} defensible options - every distractor must be refuted by something the stem states`;
      if (!verdicts[keyIdx]) return `round error: the key is not the defensible option ("${raw[keyIdx]}")`;
      /* the 2 x 2 contract that makes the option set unreadable: two digits and two
         answers, each printed by exactly two of the four options, so no token, no
         length and no value singles one option out */
      const parsed = raw.map(o => o.match(DEC_V4_OPT));
      const dSet = new Map(), rSet = new Map();
      for (const p of parsed) {
        dSet.set(p[2], (dSet.get(p[2]) || 0) + 1);
        rSet.set(p[3], (rSet.get(p[3]) || 0) + 1);
      }
      if (dSet.size !== 2 || [...dSet.values()].some(c => c !== 2)) {
        return `round error: the option set is not a 2 x 2 grid - digits ${[...dSet.keys()].join(', ')}`;
      }
      if (rSet.size !== 2 || [...rSet.values()].some(c => c !== 2)) {
        return `round error: the option set is not a 2 x 2 grid - answers ${[...rSet.keys()].join(', ')}`;
      }
      if (!dSet.has(String(dc))) return 'round error: the digit rounding points at is not among the options';
      if (![...rSet.keys()].some(r => DEQ(DP(r), truth))) return 'round error: the correct answer is not among the options';
      /* and nothing may hand the child the number the stem declares wrong */
      for (const c of q.choices) {
        if (decTokens(c).some(t => DEQ(t, said))) return `round error: an option repeats ${DTXT(said)}, the number the stem declares wrong ("${strip(c)}")`;
      }
      return null;
    }
  }
  if ((m = text.match(/weighing (\d+\.\d+) kg .* weighing (\d+\.\d+) kg\. Rounded to the nearest kilogram, what is the total mass/))) {
    const a = DP(m[1]), b = DP(m[2]);
    const d = Math.max(a.dp, b.dp);
    const total = DV(a.n * TEN(d - a.dp) + b.n * TEN(d - b.dp), d);
    const want = DROUND(total, 0);
    if (!ans || !DEQ(ans, want)) return `round sum: ${m[1]} + ${m[2]} = ${DTXT(total)} -> ${DTXT(want)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, x => DEQ(x, want)) !== 1) return 'round sum: two options are the correct answer';
    return null;
  }

  /* --- PRINCIPLE 3: decimals and fractions --------------------------------- */
  if (/^Write .* as a decimal\.$/.test(text)) {
    const f = parseFrac(q.q);
    if (!f) return 'frac -> dec: the stem does not render a fraction';
    if (!ans) return 'frac -> dec: the key is not a plain decimal';
    /* exact: n/den === ans.n / 10^ans.dp  <=>  n * 10^dp === ans.n * den */
    return f[0] * TEN(ans.dp) === ans.n * f[1] ? null
      : `frac -> dec: ${f[0]}/${f[1]} is not ${strip(q.answerText)}`;
  }
  if (/What decimal does the shaded part show\?$/.test(text)) {
    const on = (String(q.extra).match(/class="seg fill"/g) || []).length;
    const total = (String(q.extra).match(/class="seg[ "]/g) || []).length;
    if (!total) return 'shaded bar: the figure rendered no segments';
    if (!ans) return 'shaded bar: the key is not a plain decimal';
    if (!/cut into <b>10 equal parts<\/b>/.test(q.q) || total !== 10) return `shaded bar: the stem says 10 parts but the figure drew ${total}`;
    return on * TEN(ans.dp) === ans.n * total ? null
      : `shaded bar: ${on}/${total} shaded but the key is ${strip(q.answerText)}`;
  }
  if ((m = text.match(/^Write (\d+\.\d+) as a fraction in its simplest form\.$/))) {
    const v = DP(m[1]), f = parseFrac(q.answerText);
    if (!f) return 'dec -> frac: the key is not a fraction';
    if (f[0] * TEN(v.dp) !== v.n * f[1]) return `dec -> frac: ${f[0]}/${f[1]} is not ${m[1]}`;
    if (gcd(f[0], f[1]) !== 1) return `dec -> frac: ${f[0]}/${f[1]} is not in its simplest form`;
    const all = q.choices.map(parseFrac);
    if (all.some(x => !x)) return 'dec -> frac: an option is not a fraction';
    for (const of of all) if (gcd(of[0], of[1]) !== 1) return `dec -> frac: the option ${of[0]}/${of[1]} is not in its simplest form, but the stem asks for one`;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      if (all[i][0] * all[j][1] === all[j][0] * all[i][1]) return `dec -> frac: two options are the same fraction (${all[i].join('/')} and ${all[j].join('/')})`;
    }
    return null;
  }
  if ((m = text.match(/costs (\d+) cents, which is written \$(\d+\.\d\d)\. What fraction of one dollar is that, in its simplest form\?$/))) {
    const c = Number(m[1]), printed = DP(m[2]);
    if (printed.n !== c) return `money fraction: the stem prints $${m[2]} against ${c} cents`;
    const f = parseFrac(q.answerText);
    if (!f) return 'money fraction: the key is not a fraction';
    if (f[0] * 100 !== c * f[1]) return `money fraction: ${f[0]}/${f[1]} is not ${c}/100`;
    if (gcd(f[0], f[1]) !== 1) return `money fraction: ${f[0]}/${f[1]} is not in its simplest form`;
    for (const o of q.choices) {
      const of = parseFrac(o);
      if (!of) return 'money fraction: an option is not a fraction';
      if (gcd(of[0], of[1]) !== 1) return `money fraction: the option ${of[0]}/${of[1]} is not in its simplest form, but the stem asks for one`;
    }
    return null;
  }
  if ((m = text.match(/^(.+?) says that (\d+\.\d+) of a dollar is \$(\d+\.\d\d)\. Which of these puts it right\?$/))) {
    const v = DP(m[2]);
    if (v.dp < 1 || v.dp > 2) return `money decimal: ${m[2]} is not tenths or hundredths of a dollar`;
    const d = v.n;
    if (d < 2 || d > 9) return `money decimal: ${m[2]} is not a single non-unit digit of its place`;
    const trueC = TEN(2 - v.dp);                       /* cents in one of that place */
    const trueCents = d * trueC;
    const claim = Math.round(Number(m[3]) * 100);
    if (trueCents === claim) return `money decimal: the printed claim ($${m[3]}) is CORRECT - the stem contradicts itself`;
    /* WOUND 3 (refutation v2 @ 0157aa1). Two of the four frames were the key on
       0 / 20,000 draws, so "neither the longest nor the shortest" was a coin flip
       that never deleted the key. All four options now wear ONE frame over three
       live beliefs about what a single place of a dollar is worth, plus the
       add-instead-of-multiply slip; every amount is money, so all four are exactly
       the same length. */
    const other = trueC === 10 ? 1 : 10;
    const rows = [[trueC, trueCents], [100, d * 100], [other, d * other], [trueC, trueC + d]];
    const MONEY = c => '$' + DTXT(DV(c, 2));
    const headFirst = /^A /.test(strip(q.choices[keyIdx]));
    const qtyD = `${d} ${DEC_PLACES[v.dp]}`;
    const say = r => headFirst
      ? `A ${DEC_PLACE_ONE[v.dp]} of a dollar is ${MONEY(r[0])}, and ${m[2]} is ${qtyD}, so that is ${MONEY(r[1])}.`
      : `${m[2]} is ${qtyD}, and a ${DEC_PLACE_ONE[v.dp]} of a dollar is ${MONEY(r[0])}, so that is ${MONEY(r[1])}.`;
    const offered = rows.map(say);
    if (new Set(offered).size !== 4) return 'money decimal: two of the four named readings collide';
    for (const o of offered) {
      if (q.choices.filter(c => strip(c) === o).length !== 1) return `money decimal: "${o}" is not offered exactly once`;
    }
    if (strip(q.choices[keyIdx]) !== offered[0]) return `money decimal: expected key "${offered[0]}", got "${strip(q.choices[keyIdx])}"`;
    /* the misconception the stem states must be on the list, or the item answers a
       question nobody asked */
    if (!offered.some(o => o.endsWith(`so that is $${m[3]}.`))) {
      return `money decimal: the claim $${m[3]} the stem calls wrong is not one of the four readings`;
    }
    /* all four exactly the same length: no length rank exists to read */
    const lens = q.choices.map(c => strip(c).length);
    if (Math.max(...lens) - Math.min(...lens) > 2) {
      return `money decimal: the four options span ${Math.max(...lens) - Math.min(...lens)} characters - they must be within two`;
    }
    return null;
  }

  /* --- PRINCIPLE 4: operations in money and measures ------------------------ */
  /* MOE P4 3.2 - a whole number divided by a whole number, quotient as a decimal.
     The sub-strand the shipped bank covered with zero generators. Both formats are
     verified by the same rule: the division is EXACT, the quotient is NOT a whole
     number, the divisor is one of the five whose quotient terminates inside three
     places, and nothing repeats. */
  const decQuotient = (aStr, bStr, what) => {
    const A = Number(aStr), B = Number(bStr);
    if (![2, 4, 5, 8, 10].includes(B)) return `${what}: ${B} is not one of the MOE 3.2 divisors (2, 4, 5, 8, 10)`;
    if (A % B === 0) return `${what}: ${A} / ${B} is a whole number - the sub-strand is the DECIMAL quotient`;
    const wantN = A * (1000 / B);
    if (wantN % 1 !== 0) return `${what}: ${A} / ${B} does not terminate inside three decimal places`;
    if (!ans) return `${what}: the key is not a plain decimal`;
    /* exact: ans === A / B  <=>  ans.n * B === A * 10^ans.dp */
    if (ans.n * B !== A * TEN(ans.dp)) return `${what}: ${A} / ${B} is not ${strip(q.answerText)}`;
    if (ans.dp === 0) return `${what}: the key ${strip(q.answerText)} carries no decimal part`;
    if (decCountWhere(q, x => DEQ(x, ans)) !== 1) return `${what}: two options are the correct answer`;
    /* The remainder written after the point is the slip this item exists to kill:
       it may be offered, but it may never BE the answer - EXCEPT at a divisor of
       10, where the remainder genuinely IS the tenths digit (13 / 10 = 1.3) and
       the slip coincides with the truth. The generator offers no such distractor
       on those draws, and this branch does not demand one. */
    const rem = DV(Math.floor(A / B) * 10 + (A % B), 1);
    if (B !== 10 && DEQ(rem, ans)) return `${what}: the key is what writing the remainder after the point gives`;
    if (B !== 10 && decCountWhere(q, x => DEQ(x, rem)) !== 1) return `${what}: the remainder-after-the-point slip is missing or doubled`;
    return null;
  };
  if ((m = text.match(/^(\d+) ÷ (\d+) = \?$/))) return decQuotient(m[1], m[2], 'whole / whole');
  if ((m = text.match(/^At the provision shop .+ splits (\d+) kg of .+ equally into (\d+) \w+\. How much .+ is in each \w+\?$/))) {
    return decQuotient(m[1], m[2], 'split evenly');
  }
  if ((m = text.match(/^(\d+\.\d+) ([+−×÷]) (\d+(?:\.\d+)?) = \?$/))) {
    const a = DP(m[1]), b = DP(m[3]);
    let want;
    if (m[2] === '+' || m[2] === '−') {
      const d = Math.max(a.dp, b.dp);
      const x = a.n * TEN(d - a.dp), y = b.n * TEN(d - b.dp);
      want = DV(m[2] === '+' ? x + y : x - y, d);
      if (want.n < 0) return `${m[2]}: the stem asks for a negative answer`;
    } else if (m[2] === '×') {
      if (b.dp !== 0) return '×: P4 multiplies a decimal by a WHOLE number only';
      want = DV(a.n * b.n, a.dp);
    } else {
      if (b.dp !== 0) return '÷: P4 divides a decimal by a WHOLE number only';
      if (a.n % b.n !== 0) return `÷: ${m[1]} does not divide exactly by ${m[3]}`;
      want = DV(a.n / b.n, a.dp);
    }
    if (!ans || !DEQ(ans, want)) return `${m[1]} ${m[2]} ${m[3]}: expected ${DTXT(want)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, x => DEQ(x, want)) !== 1) return 'arithmetic: two options are the correct answer';
    return null;
  }
  if ((m = text.match(/spends \$(\d+\.\d\d) at .* and has \$(\d+\.\d\d) left\. How much money did .* have at first\?$/))) {
    const want = DV(DP(m[1]).n + DP(m[2]).n, 2);
    return ans && DEQ(ans, want) ? null : `start amount: ${m[1]} + ${m[2]} = ${DTXT(want)}, key says ${strip(q.answerText)}`;
  }
  if ((m = text.match(/^At NTUC (a|an) (.+?) costs \$(\d+\.\d\d) and (?:a|an) (.+?) costs \$(\d+\.\d\d)\. How much more does the (.+?) cost\?$/))) {
    if (m[6] !== m[2]) return `money compare: the stem prices "${m[2]}" but asks about "${m[6]}"`;
    const hi = DP(m[3]), lo = DP(m[5]);
    if (hi.n <= lo.n) return `money compare: the item asked about ($${m[3]}) is not the dearer one`;
    const want = DV(hi.n - lo.n, 2);
    return ans && DEQ(ans, want) ? null : `money compare: ${m[3]} − ${m[5]} = ${DTXT(want)}, key says ${strip(q.answerText)}`;
  }
  if ((m = text.match(/^(.+?) works out (\d+(?:\.\d+)?) \+ (\d+(?:\.\d+)?)\. .+ writes the (\d) underneath the (\d) and gets (\d+\.\d+)\. What is the correct answer\?$/))) {
    const a = DP(m[2]), b = DP(m[3]), claim = DP(m[6]);
    if (!a || !b) return 'align error: an operand is not a decimal';
    if (m[5] !== m[2].slice(-1) || m[4] !== m[3].slice(-1)) return 'align error: the digits named are not the LAST digits of the two numbers';
    if (Math.abs(a.dp - b.dp) !== 1) return `align error: ${m[2]} and ${m[3]} are ${Math.abs(a.dp - b.dp)} columns apart - the slip slides by exactly one`;
    /* v6: the whole-number-plus-a-tenth shape is gone. Its answer was the two printed
       numbers written side by side, so it asked no arithmetic and three passes found
       a route through it; a draw that brings it back fails the build. */
    if (a.dp === 0 || b.dp === 0) return `align error: "${m[2]} + ${m[3]}" has a whole-number addend, so the answer is the two printed numbers side by side`;
    if (m[4] === m[5]) return `align error: "writes the ${m[4]} underneath the ${m[5]}" names the same digit twice`;
    const d = Math.max(a.dp, b.dp);
    const want = DV(a.n * TEN(d - a.dp) + b.n * TEN(d - b.dp), d);
    /* the printed wrong answer must be EXACTLY what lining up the last digits gives */
    const slip = DV(a.n + b.n, d);
    if (!DEQ(claim, slip)) return `align error: the printed slip ${m[6]} is not what lining up the last digits gives (${DTXT(slip)})`;
    if (DEQ(claim, want)) return `align error: the printed "wrong" answer ${m[6]} is correct`;
    if (!ans || !DEQ(ans, want)) return `align error: ${m[2]} + ${m[3]} = ${DTXT(want)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, x => DEQ(x, want)) !== 1) return 'align error: two options are the correct answer';
    /* THE KILL's rule, here too: the number the stem declares wrong is not on offer */
    if (decCountWhere(q, x => DEQ(x, claim)) !== 0) return `align error: ${m[6]} is offered as an option, and the stem has already declared it wrong`;
    return null;
  }
  if ((m = text.match(/buys (?:a|an) .+ for \$(\d+\.\d\d) and (?:a|an) .+ for \$(\d+\.\d\d), and pays with a \$(\d+) note\. How much change, in dollars\?$/))) {
    const want = Number(m[3]) * 100 - DP(m[1]).n - DP(m[2]).n;
    if (want <= 0) return `change: the note $${m[3]} does not cover the basket`;
    if (!q.typed) return 'change: this item is meant to be typed';
    if (Math.round(q.answer * 100) !== want) return `change: expected ${DTXT(DV(want, 2))}, key says ${q.answer}`;
    if (strip(q.answerText) !== '$' + DTXT(DV(want, 2))) return `change: answerText "${strip(q.answerText)}" is not the money form`;
    return null;
  }
  /* gDecMulConcept, rebuilt NUMERIC at v6 (refutation v5 @ 8cf212b, KILL 1). The
     "which calculation" demand was killed on the operator (v2), on the operand
     shape (v4) and on the operand SET (v5), and it cannot be saved: over {price,
     count} only two arrangements can ever be the key, so "pick the multiplication"
     wins 50% of draws whatever the row does. The item now asks for the total as a
     NUMBER, with the named misconceptions as its values, so this branch re-derives
     the money key from the rendered price and count in exact cents. */
  if ((m = text.match(/^At the school bookshop (?:a|an) (.+?) costs \$(\d+\.\d\d)\. How much do (\d+) (.+?) cost altogether\?$/))) {
    const p = DP(m[2]), n = Number(m[3]);
    if (!p || p.dp !== 2) return `bookshop total: "$${m[2]}" is not a money amount`;
    if (n < 2 || n > 9) return `bookshop total: ${n} is not a 1-digit count`;
    if (p.n % 100 === 0) return `bookshop total: $${m[2]} carries no cents, so nothing is multiplied past the point`;
    const want = DV(p.n * n, 2);
    if (!ans || !DEQ(ans, want)) return `bookshop total: ${n} × $${m[2]} = ${DTXT(want)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, x => DEQ(x, want)) !== 1) return 'bookshop total: two options are the correct answer';
    /* the cents must carry, or the item is two separate one-digit multiplications
       and the named "forgot to carry" slip is the key */
    if (n * (p.n % 100) < 100) return `bookshop total: ${n} × ${p.n % 100} cents does not carry, so "forgot to carry" is not a wrong answer`;
    return null;
  }
  if ((m = text.match(/^One lap of the running track at .+ is (\d+\.\d+) km\. .+ runs (\d+) laps\./))) {
    const lap = DP(m[1]);
    const want = DV(lap.n * Number(m[2]), lap.dp);
    if (!ans || !DEQ(ans, want)) return `track: ${m[1]} × ${m[2]} = ${DTXT(want)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, x => DEQ(x, want)) !== 1) return 'track: two options are the correct answer';
    return null;
  }
  if ((m = text.match(/pumps (\d+) litres of petrol at \$(\d+\.\d\d) per litre and pays with a \$(\d+) note\. How much change is there\?$/))) {
    const cost = Number(m[1]) * DP(m[2]).n;
    const want = DV(Number(m[3]) * 100 - cost, 2);
    if (want.n <= 0) return `petrol: the note $${m[3]} does not cover ${m[1]} litres at $${m[2]}`;
    if (!ans || !DEQ(ans, want)) return `petrol: change is ${DTXT(want)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, x => DEQ(x, want)) !== 1) return 'petrol: two options are the correct answer';
    return null;
  }
  if ((m = text.match(/^A stall at the wet market packs (\d+\.\d+) kg of .+ equally into (\d+) (\w+)\. How much do (\d+) of the \3 hold altogether\?$/))) {
    const total = DP(m[1]), trays = Number(m[2]), want = Number(m[4]);
    if (want >= trays) return `share: asked for ${want} of ${trays} - that is the whole lot`;
    if (total.n % trays !== 0) return `share: ${m[1]} kg does not share equally into ${trays}`;
    const per = total.n / trays;
    const key = DV(per * want, total.dp);
    if (!ans || !DEQ(ans, key)) return `share: ${m[1]} ÷ ${trays} × ${want} = ${DTXT(key)}, key says ${strip(q.answerText)}`;
    if (decCountWhere(q, x => DEQ(x, key)) !== 1) return 'share: two options are the correct answer';
    if (decCountWhere(q, x => DEQ(x, DV(per, total.dp))) !== 1) return 'share: the stop-after-dividing distractor is missing or doubled';
    return null;
  }

  return 'decimals: no oracle matched this stem - every generator in js/topics/p4-decimals.js ' +
    'must ship its oracle in the same commit (js/topics/README.md)';
}

/* ---------- DECIMALS GATES: the coincidence / format-tell / wording rules,
   extended for a topic whose answers are decimals (sweep 2026-09-15) ---------
   RULE D1  matching decimal places. In an MC whose options are all plain
            decimals, the KEY's number of decimal places must be shared by at
            least one distractor. "0.5" against "0.45 / 0.62 / 0.38" points at
            itself as loudly as gLPerimDiff's prose key did.
   RULE D2  the digit-count trap must bite. A generator that declares
            q.decCompare is offering the numbers themselves for comparison, so
            D1 does not apply; instead the key may not be the ONLY option with
            the most decimal places (asking for the greatest) or the fewest
            (asking for the smallest) - otherwise "count the digits" wins.
   RULE D3  money is written like money. Any $ amount carrying a decimal point,
            in the stem or in an option, must show exactly two places.
   RULE D4  named distractors only. A generator that stamps q.decAuthored
            asserts those three strings ARE the three non-key options: no padded
            distractor, and no named one colliding with the key. This is the
            string form of the shared q.authored contract, and it binds on the
            money items, where parseFloat("$6.25") is NaN and q.authored cannot.

   The four rules below are the refutation of 2026-09-15 turned into gates. Each
   one is the rule that would have caught a finding the harness shipped green.

   RULE D5  nothing may hand back the number the stem declares wrong. THE KILL:
            gDecRoundError gave exactly two of four options a "..., so the answer
            is N" tail, and one of those two printed the number the stem had
            already called wrong, so the item was settled by reading on 20,000 of
            20,000 draws. The rule is general - any decimals stem that declares a
            wrong ANSWER ("and says the answer is N", "and gets N") may not then
            offer that number back, as a plain option or inside a sentence.
   RULE D6  prose format tell. pilotGates' RULE 1 is coarse by design: it counts
            option FORMS, so four prose options tally 4-0 and nothing fires. This
            is the same rule one level finer, on the TAIL PHRASE with every number
            masked. It fails when a shared tail singles the key out - the key
            alone against three that share a tail (the odd one out), or the key
            plus exactly one partner against two that share nothing. A symmetric
            2-2 split, where BOTH halves share a phrase, is a real distinction a
            child has to earn and is left alone.
   RULE D7  a fraction option set may not be padded either. buildFracChoices pads
            with [correct[0] + n, correct[1] + n] when it runs out of candidates,
            and that is how gDecMoneyFrac shipped 2/3 against a money key on
            10.03% of draws. q.fracAuthored is the fraction half of D4.
   RULE D8  no "1 parts". The lane's own scan tested three literal strings
            ("1 tenths", "1 ones", "1 cents"); gDecBar printed "1 parts are
            shaded" on 12.8% of its draws and went straight through. This is the
            pattern, over the stem, the options AND the explanation. */
const DEC_PURE = /^\$?\d+(\.\d+)?( (kg|km|cm|mm|m|g|ℓ|ml|l))?$/;
/* the number a decimals stem declares wrong, when it declares one at all */
function decDeclaredWrong(t) {
  const mm = t.match(/ and says the answer is (\d+(?:\.\d+)?)\./) || t.match(/ and gets (\d+(?:\.\d+)?)\./) ||
             t.match(/ and gives the answer (\d+(?:\.\d+)?)\./);
  return mm ? DP(mm[1]) : null;
}
/* the last k words of an option with every number masked, so "so the answer is
   4.7." and "so the answer is 5." are recognised as the SAME tail phrase */
function decTail(s, k) {
  const w = strip(s).replace(/\d+(?:\.\d+)?/g, '#').toLowerCase().split(/\s+/).filter(Boolean);
  return w.length < k ? null : w.slice(-k).join(' ');
}
/* RULE D8's pattern, with two narrowings that keep it honest rather than noisy.
   (1) The "1" must be a COUNT, so it may not be preceded by a digit or a decimal
       point - "3.1 rounds to 3" is not a plural error, it is a number.
   (2) The word after it must be a noun. Everything on this list is a VERB or a
       function word that happens to end in "s" ("step 1 gives...", "the 1 slides
       one column"), and nothing on it is a thing the file counts. A new entry
       here means somebody wrote a new verb straight after a numeral; a missing
       one reds the build, which is the safe direction. */
const DEC_NOT_PLURAL = new Set(['is', 'was', 'has', 'as', 'its', 'this', 'thus', 'us', 'yes',
  'less', 'plus', 'minus', 'gets', 'goes', 'does', 'always', 'perhaps', 'across', 'unless',
  'gives', 'rounds', 'slides', 'makes', 'means', 'shows', 'holds', 'costs', 'weighs', 'needs',
  'takes', 'comes', 'puts', 'writes', 'reads', 'leaves', 'adds', 'says', 'runs', 'buys',
  'spends', 'shares', 'splits', 'packs', 'pumps', 'pays', 'sits', 'lies', 'stays', 'keeps']);
/* WOUND 1 (refutation v3 @ c9d26fb): gDecBetween printed "1 whole ones" on 12.55%
   of its draws and walked straight through, because the rule looked for the plural
   in the word IMMEDIATELY after the numeral and here it sits one word to the right.
   The pattern now allows a single intervening word - the adjective a counted noun
   takes ("1 whole ones", "1 equal parts") - and the verb list still carries the
   second word, which is what keeps "the 1 slides 4.6 one whole column" out. */
function decPluralSlip(s) {
  const t = strip(s);
  let mm; const re = /(?<![\d.])\b1 (?:([a-z]+) )?([a-z]+)s\b/g;
  while ((mm = re.exec(t))) {
    if (DEC_NOT_PLURAL.has(mm[2] + 's')) continue;
    if (mm[1] && DEC_NOT_PLURAL.has(mm[1])) continue;    /* "1 is ...s" is a verb, not a count */
    return '1 ' + (mm[1] ? mm[1] + ' ' : '') + mm[2] + 's';
  }
  return null;
}
function decGates(q, topic) {
  if (topic !== 'decimals') return null;
  /* RULE D8 - the stem, every option AND the explanation */
  for (const part of [q.q, q.explain].concat(q.choices || [])) {
    const slip = decPluralSlip(part);
    if (slip) return `plural: "${slip}" is not English - count through the file's own pluraliser`;
  }
  /* RULE D5 */
  const declared = decDeclaredWrong(strip(q.q));
  if (declared) {
    for (const c of (q.choices || [])) {
      if (decTokens(c).some(t => DEQ(t, declared))) {
        return `declared-wrong number offered back: the stem calls ${DTXT(declared)} wrong and an option repeats it ("${strip(c)}")`;
      }
    }
  }
  /* RULE D6 */
  const opts4 = (q.choices || []).map(strip);
  if (opts4.length === 4 && Number.isInteger(q.correct)) {
    for (let k = 3; k <= 8; k++) {
      const tails = opts4.map(c => decTail(c, k));
      if (tails.some(t => t === null)) break;
      const groups = new Map();
      tails.forEach((t, i) => { if (!groups.has(t)) groups.set(t, []); groups.get(t).push(i); });
      const mine = groups.get(tails[q.correct]);
      const rest = [...groups.entries()].filter(([t]) => t !== tails[q.correct]);
      if (mine.length === 1 && rest.length === 1 && rest[0][1].length === 3) {
        return `prose format tell: the key is the only option NOT ending "...${rest[0][0]}" (${opts4.join(' | ')})`;
      }
      if (mine.length === 2 && !(rest.length === 1 && rest[0][1].length === 2)) {
        return `prose format tell: the key and one other option share the tail "...${tails[q.correct]}" while the rest share nothing (${opts4.join(' | ')})`;
      }
    }
  }
  /* RULE D7 */
  if (Array.isArray(q.fracAuthored)) {
    const named = q.fracAuthored;
    const keyFrac = parseFrac(q.choices[q.correct]);
    if (!keyFrac) return 'fracAuthored declared but the key is not a fraction';
    if (named.some(p => p[0] * keyFrac[1] === keyFrac[0] * p[1])) {
      return `named fraction identical to the key (${keyFrac.join('/')})`;
    }
    for (let i = 0; i < q.choices.length; i++) {
      if (i === q.correct) continue;
      const f = parseFrac(q.choices[i]);
      if (!f) return `fracAuthored declared but an option is not a fraction ("${strip(q.choices[i])}")`;
      if (!named.some(p => p[0] * f[1] === f[0] * p[1])) {
        return `padded fraction shipped (${f.join('/')}); named: ${named.map(p => p.join('/')).join(', ')}`;
      }
    }
  }
  const stemMoney = String(strip(q.q)).match(/\$\d+\.\d+/g) || [];
  for (const mm of stemMoney) if (!/^\$\d+\.\d\d$/.test(mm)) return `money format: the stem writes "${mm}" - a money amount with a point shows two places`;
  const raw = (q.choices || []).map(strip);
  for (const c of raw) {
    const om = c.match(/\$\d+\.\d+/g) || [];
    for (const mm of om) if (!/^\$\d+\.\d\d$/.test(mm)) return `money format: an option writes "${mm}" - a money amount with a point shows two places`;
  }
  /* RULE D9 - no decimals option may be ZERO. The v2 fix to gDecAddSub left its
     redraw guard unsatisfiable on every add draw (`Set(...).size === 5` where the
     add branch can only reach 4, because noCarry IS key - scale there), so the
     loop ran to its ceiling and shipped "0.0" against "4.93 + 1.37 = ?" on 0.77%
     of draws. Zero is not an answer any child weighs to a sum of two positive
     numbers - it is a free elimination wearing a named distractor's badge, and
     mcDec's own filter tested c.n < 0, not c.n <= 0. Nothing in the harness
     expressed either half. */
  for (const c of (q.choices || [])) {
    const z = decOf(strip(c));
    if (z && z.n === 0) return `zero option shipped ("${strip(c)}") - zero is a free elimination, not a named misconception`;
  }
  if (Array.isArray(q.decAuthored)) {
    const named = new Set(q.decAuthored);
    if (named.has(raw[q.correct])) return `named distractor identical to the key (${raw[q.correct]})`;
    for (let i = 0; i < raw.length; i++) {
      if (i === q.correct) continue;
      if (!named.has(raw[i])) return `padded distractor shipped ("${raw[i]}"); named: ${q.decAuthored.join(', ')}`;
    }
  }
  if (raw.length !== 4 || !raw.every(c => DEC_PURE.test(c))) return null;
  const dps = raw.map(c => { const v = decOf(c); return v ? v.dp : -1; });
  if (dps.some(d => d < 0)) return null;
  const keyDp = dps[q.correct];
  if (q.decCompare) {
    if (new Set(dps).size < 2) return 'decCompare declared but every option has the same number of decimal places';
    const maxDp = Math.max(...dps), minDp = Math.min(...dps);
    const wantMax = /greatest/i.test(strip(q.q));
    if (wantMax && keyDp === maxDp && dps.filter(d => d === maxDp).length === 1) {
      return `digit-count tell: the greatest is the ONLY option with ${maxDp} decimal places (${raw.join(' | ')})`;
    }
    if (!wantMax && keyDp === minDp && dps.filter(d => d === minDp).length === 1) {
      return `digit-count tell: the smallest is the ONLY option with ${minDp} decimal places (${raw.join(' | ')})`;
    }
    return null;
  }
  /* RULE D1, refined at v6 (KILL 2 on gDecDigitValue). "The key is alone at its own
     decimal-place count" is a tell only when some OTHER options SHARE a count: the
     child's move is "three of these look alike and one does not". Where all four
     options are written to four DIFFERENT depths the odd one out does not exist,
     the depth names nobody, and every depth rule is a flat 1-in-4 - the same
     principle the coupling gate's feature arm already applies (a value every option
     differs on carries no information). The negative control still reds the real
     tell, 0.5 / 0.45 / 0.62 / 0.38, whose depths are 1-2-2-2. */
  if (dps.filter(d => d === keyDp).length === 1 && new Set(dps).size < 4) {
    return `decimal-place tell: the key is the only option written to ${keyDp} decimal place(s) (${raw.join(' | ')})`;
  }
  return null;
}

/* ---------- independent oracles, dispatched on the rendered question ---------- */
/* Return: null = verified, string = failure, false = no oracle matched. */
function oracle(q, topic) {
  /* SWEEP 2026-09-15: the decimals bank is dispatched first and exhaustively, so
     no looser branch below can claim one of its stems and no stem can escape. */
  if (topic === 'decimals') return decimalsOracle(q);
  const text = strip(q.q);
  const extra = strip(q.extra || '');
  const ansNum = parseFloat(strip(q.answerText));
  const ansFrac = parseFrac(q.answerText);
  let m;

  /* --- typed (Puzzle Caves) --- */
  if (q.typed) {
    /* ===== WAVE 2 lane: P5 fractions + P5 decimals, typed ======================
       These sit at the TOP of the typed block on purpose. Every stem below opens
       with a word prefix ("Multiply:", "Divide:", "Express", "... Express that in")
       that no other topic emits, and each pattern is anchored, so nothing above is
       shadowed. They are ABOVE the looser branches because the two-fraction branch
       further down matches ANY stem ending "= ?" that renders exactly two
       fractions and then assumes the operator is + or -: it would read
       "2/3 x 3/5 = ?" as an addition. Specific above loose, per the P3 pilot rule.
       These oracles also enforce the P5 SCOPE CLAMPS, so a later edit that widens a
       generator past the syllabus fails the harness rather than shipping:
         - a decimal may only be multiplied/divided by a MULTIPLE OF TEN (P5 1.1);
         - a conversion may only use one of the four MOE unit pairs (P5 1.2);
         - every typed decimal item must declare q.dp, or the 0.005 fallback
           tolerance would wave a wrongly-rounded answer through;
         - every typed fraction item must carry q.fracAnswer, or a child typing
           3/4 for 0.75 is graded wrong;
         - nothing here divides BY a fraction: that is P6 (PDF p.43). */
    const r3 = x => Math.round(x * 1000) / 1000;
    const dpOf = x => { const s = String(x), i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };
    /* Cross-multiplied, so an unreduced key still verifies. */
    const fracKeyOk = (n, d) => Array.isArray(q.fracAnswer) &&
      Number(q.fracAnswer[0]) * d === n * Number(q.fracAnswer[1]);
    const saysIt = s => String(q.explain).indexOf(String(s)) >= 0;
    const PER = { 'm|km': 1000, 'cm|m': 100, 'g|kg': 1000, 'ml|l': 1000 };

    /* P5 FRACTIONS 1.1 - dividing a whole number by a whole number, quotient as a fraction */
    if ((m = text.match(/share (\d+) [^.]*equally among the (\d+) of them\. What fraction of one does each get\?/))) {
      const n = Number(m[1]), d = Number(m[2]);
      if (n >= d) return `p5 share-as-fraction: ${n}/${d} is not a proper fraction, so "fraction of one" is a false stem`;
      if (!fracKeyOk(n, d)) return `p5 share-as-fraction: expected key ${n}/${d}, got ${JSON.stringify(q.fracAnswer)}`;
      const g0 = gcd(n, d) || 1;
      if (!saysIt((n / g0) + '/' + (d / g0))) return `p5 share-as-fraction: explanation never states ${n / g0}/${d / g0}`;
      return near(r3(n / d), r3(q.answer)) ? null : `p5 share-as-fraction: expected ${n / d}, got ${q.answer}`;
    }
    if ((m = text.match(/^Divide (\d+) by (\d+)\. Give the quotient as a fraction/))) {
      const n = Number(m[1]), d = Number(m[2]);
      if (n % d === 0) return `p5 divide-as-fraction: ${n}/${d} is a whole number, so the stem asks for a fraction that is not one`;
      if (!fracKeyOk(n, d)) return `p5 divide-as-fraction: expected key ${n}/${d}, got ${JSON.stringify(q.fracAnswer)}`;
      const g0 = gcd(n, d) || 1;
      if (!saysIt((n / g0) + '/' + (d / g0))) return `p5 divide-as-fraction: explanation never states ${n / g0}/${d / g0}`;
      return near(r3(n / d), r3(q.answer)) ? null : `p5 divide-as-fraction: expected ${n / d}, got ${q.answer}`;
    }

    /* P5 FRACTIONS 1.2 - expressing fractions as decimals */
    if (/^Express .+ as a decimal\./.test(text)) {
      const f = parseFrac(q.q);
      if (!f) return 'p5 frac->dec: no fraction rendered in the stem';
      if (q.dp !== 3) return 'p5 frac->dec: q.dp not declared, so "0.4" would pass for 0.375 on the 0.005 fallback';
      const e = r3(f[0] / f[1]);
      if (dpOf(e) > 3) return `p5 frac->dec: ${f[0]}/${f[1]} does not terminate within 3 dp`;
      if (!saysIt(String(e))) return `p5 frac->dec: explanation never states ${e}`;
      return near(e, r3(q.answer)) ? null : `p5 frac->dec: expected ${e}, got ${q.answer}`;
    }

    /* P5 FRACTIONS 2.2/2.3/2.4 - multiplication, typed as a fraction */
    if (/^Multiply the two improper fractions: /.test(text) ||
        (/^Multiply: /.test(text) && / \(type a fraction/.test(text))) {
      const fs = allFracs(q.q);
      if (!/ x /.test(text)) return 'p5 frac mul: stem is not a multiplication';
      if (/ \/ /.test(text)) return 'p5 frac mul: division by a fraction is P6, not P5';
      let n, d;
      if (fs.length === 2) {
        if (/^Multiply the two improper fractions/.test(text) &&
            !(fs[0][0] > fs[0][1] && fs[1][0] > fs[1][1]))
          return 'p5 frac mul: stem says improper but an operand is proper';
        n = fs[0][0] * fs[1][0]; d = fs[0][1] * fs[1][1];
      } else if (fs.length === 1) {
        const w = text.match(/ x (\d+) = \? \(type a fraction/);
        if (!w) return 'p5 frac mul: one fraction rendered but no whole-number operand found';
        n = fs[0][0] * Number(w[1]); d = fs[0][1];
      } else {
        return `p5 frac mul: ${fs.length} fractions rendered, expected 1 or 2`;
      }
      if (!fracKeyOk(n, d)) return `p5 frac mul: expected key ${n}/${d}, got ${JSON.stringify(q.fracAnswer)}`;
      const g0 = gcd(n, d) || 1;
      if (!saysIt((n / g0) + '/' + (d / g0))) return `p5 frac mul: explanation never states ${n / g0}/${d / g0}`;
      return near(r3(n / d), r3(q.answer)) ? null : `p5 frac mul: expected ${n / d}, got ${q.answer}`;
    }

    /* P5 DECIMALS 1.1 - x and / by 10, 100, 1000 and their multiples */
    if ((m = text.match(/^Multiply: ([\d.]+) x (\d+) = \?$/))) {
      const a = Number(m[1]), k = Number(m[2]);
      if (k % 10 !== 0) return `p5 dec mul: multiplier ${k} is not a multiple of ten; P5 1.1 is 10/100/1000 and their multiples only`;
      if (dpOf(a) > 3) return `p5 dec mul: ${a} runs past 3 decimal places`;
      if (q.dp !== 3) return 'p5 dec mul: q.dp not declared, trailing-zero/rounding guard missing';
      const e = r3(a * k);
      if (!saysIt(String(e))) return `p5 dec mul: explanation never states ${e}`;
      return near(e, r3(q.answer)) ? null : `p5 dec mul: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^Divide: ([\d.]+) \/ (\d+) = \?$/))) {
      const a = Number(m[1]), k = Number(m[2]);
      if (k % 10 !== 0) return `p5 dec div: divisor ${k} is not a multiple of ten; P5 1.1 is 10/100/1000 and their multiples only`;
      /* P5 Fractions+Decimals Refutation, WOUND 1. MOE P5 1.1 is "multiplying and
         dividing DECIMALS (up to 3 dp) by 10, 100, 1000 and their multiples". A WHOLE
         number over 1000 is P4 3.2 wearing this badge, and it shipped on 302/500
         gDivideByPowerOfTen draws and 145/500 gDivideByMultipleOfTen draws because the
         lane note's claimed clamp did not exist in the code. The dividend must carry a
         decimal point. */
      if (!/\./.test(m[1])) return `p5 dec div: dividend ${a} is a whole number; that is P4 3.2, not P5 1.1`;
      if (dpOf(a) > 3) return `p5 dec div: ${a} runs past 3 decimal places`;
      if (q.dp !== 3) return 'p5 dec div: q.dp not declared, trailing-zero/rounding guard missing';
      const e = r3(a / k);
      if (dpOf(e) > 3) return `p5 dec div: ${a} / ${k} = ${e} runs past 3 decimal places`;
      if (!saysIt(String(e))) return `p5 dec div: explanation never states ${e}`;
      return near(e, r3(q.answer)) ? null : `p5 dec div: expected ${e}, got ${q.answer}`;
    }

    /* P5 DECIMALS 1.2 - measurement conversion, both directions */
    if ((m = text.match(/ ([\d.]+) (km|kg|ml|cm|m|g|l)(?: long| heavy)?\. Express that in (km|kg|ml|cm|m|g|l)\./))) {
      const val = Number(m[1]), from = m[2], to = m[3];
      const down = PER[from + '|' + to], up = PER[to + '|' + from];
      if (down === undefined && up === undefined)
        return `p5 convert: ${from} -> ${to} is not one of the four MOE P5 pairs (km/m, m/cm, kg/g, l/ml)`;
      if (q.dp !== 3) return 'p5 convert: q.dp not declared';
      const declTo = ctx.MQI.unitList(q.unit)[0] || '';
      if (declTo && declTo !== to) return `p5 convert: q.unit "${declTo}" contradicts the unit the stem asks for, "${to}"`;
      const e = down !== undefined ? r3(val / down) : r3(val * up);
      if (dpOf(e) > 3) return `p5 convert: ${val} ${from} = ${e} ${to} runs past 3 decimal places`;
      /* Going to the smaller unit must land on a whole number of that unit:
         8.005 m is 800.5 cm, and rounding it to 801 ships a false answer key. */
      if (up !== undefined && !Number.isInteger(e))
        return `p5 convert: ${val} ${from} = ${e} ${to}, not a whole number of ${to}`;
      if (!saysIt(String(e))) return `p5 convert: explanation never states ${e}`;
      return near(e, r3(q.answer)) ? null : `p5 convert ${from} -> ${to}: expected ${e}, got ${q.answer}`;
    }
    if (/How far is that altogether, in |How long is the ribbon now, in |What is the total mass, in |How much is in the pot, in /.test(text)) {
      const asked = text.match(/, in (km|kg|ml|cm|m|g|l)\?/);
      if (!asked) return 'p5 convert word: the stem never names the unit it wants';
      const parts = [...text.matchAll(/([\d.]+) (km|kg|ml|cm|m|g|l)\b/g)].map(x => [Number(x[1]), x[2]]);
      if (parts.length !== 2) return `p5 convert word: found ${parts.length} quantities, expected 2`;
      const big = parts[0], small = parts[1];
      if (big[1] !== asked[1]) return `p5 convert word: first quantity is in ${big[1]} but the answer is asked in ${asked[1]}`;
      const per = PER[small[1] + '|' + big[1]];
      if (per === undefined) return `p5 convert word: ${small[1]} -> ${big[1]} is not one of the four MOE P5 pairs`;
      if (q.dp !== 3) return 'p5 convert word: q.dp not declared';
      const declAsked = ctx.MQI.unitList(q.unit)[0] || '';
      if (declAsked && declAsked !== asked[1]) return `p5 convert word: q.unit "${declAsked}" contradicts the asked unit "${asked[1]}"`;
      const e = r3(big[0] + small[0] / per);
      if (dpOf(e) > 3) return `p5 convert word: ${e} runs past 3 decimal places`;
      if (!saysIt(String(e))) return `p5 convert word: explanation never states ${e}`;
      return near(e, r3(q.answer)) ? null : `p5 convert word: expected ${e}, got ${q.answer}`;
    }
    /* ===== end WAVE 2 typed block ============================================ */

    if ((m = text.match(/What comes next\? *([\d,\s]+), \?/))) {
      const t = m[1].split(',').map(s => Number(s.trim())).filter(Number.isFinite);
      const d = t[1] - t[0];
      const arith = t.every((v, i) => i === 0 || v - t[i - 1] === d);
      if (arith) return near(t[t.length - 1] + d, q.answer) ? null : `pattern: expected ${t[t.length - 1] + d}, got ${q.answer}`;
      const r = t[1] / t[0];
      const geo = t.every((v, i) => i === 0 || near(v / t[i - 1], r));
      if (geo) return near(t[t.length - 1] * r, q.answer) ? null : `pattern(geo): expected ${t[t.length - 1] * r}, got ${q.answer}`;
      return 'pattern: sequence is neither arithmetic nor geometric: ' + t.join(',');
    }
    if ((m = text.match(/multiply by (\d+), then add (\d+), and get (\d+)/))) {
      const e = (Number(m[3]) - Number(m[2])) / Number(m[1]);
      return near(e, q.answer) ? null : `backwards2: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/I add (\d+) and get (\d+)/))) {
      const e = Number(m[2]) - Number(m[1]);
      return near(e, q.answer) ? null : `backwards+: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/I subtract (\d+) and get (\d+)/))) {
      const e = Number(m[2]) + Number(m[1]);
      return near(e, q.answer) ? null : `backwards-: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/gave away (\d+), then got (\d+) more\. Now she has (\d+)/))) {
      const e = Number(m[3]) + Number(m[1]) - Number(m[2]);
      return near(e, q.answer) ? null : `give/take: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/There are (\d+) heads and (\d+) legs\. How many goats/))) {
      const heads = Number(m[1]), legs = Number(m[2]), e = (legs - 2 * heads) / 2;
      if (!Number.isInteger(e) || e < 0 || e > heads) return `heads/legs: impossible puzzle ${heads}h ${legs}l`;
      return near(e, q.answer) ? null : `heads/legs: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) \+ \? = (\d+)$/))) {
      const e = Number(m[2]) - Number(m[1]);
      return near(e, q.answer) ? null : `missing addend: expected ${e}, got ${q.answer}`;
    }

    /* --- P4 lane: four operations (js/topics/p4-multiplication-division.js) ---
       These sit ABOVE the P3 "packs ... into boxes" branches on purpose: the
       shapes are neighbours and a looser branch matching first would re-derive
       the wrong quantity (P3 pilot rubric lesson 2). The bare "a x b = ?" and
       "a / b = ?" stems are deliberately NOT re-stated here - the existing typed
       mul/div branches below already re-derive them from the rendered text. */
    if ((m = text.match(/^(\d+) ([a-z ]+) are packed into ([a-z]+) of (\d+)\. Only full \3 are sold\. How many full \3 are there\?$/))) {
      const a = Number(m[1]), b = Number(m[4]);
      if (b < 2 || b > 9) return `p4 full packs: divisor ${b} is not a single digit`;
      if (a > 9999) return `p4 full packs: dividend ${a} exceeds 4 digits`;
      const e = Math.floor(a / b);
      return near(e, q.answer) ? null : `p4 full packs: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) ([a-z ]+) are packed into [a-z]+ of (\d+)\. How many \2 are left over\?$/))) {
      const a = Number(m[1]), b = Number(m[3]);
      if (b < 2 || b > 9) return `p4 left over: divisor ${b} is not a single digit`;
      if (a > 9999) return `p4 left over: dividend ${a} exceeds 4 digits`;
      const e = a % b;
      return near(e, q.answer) ? null : `p4 left over: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^What is the remainder when (\d+) is divided by (\d+)\?$/))) {
      const a = Number(m[1]), b = Number(m[2]);
      if (b < 2 || b > 9) return `p4 remainder: divisor ${b} is not a single digit`;
      if (a > 9999) return `p4 remainder: dividend ${a} exceeds 4 digits`;
      const e = a % b;
      return near(e, q.answer) ? null : `p4 remainder: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^One ([A-Za-z ]+) holds (\d+) ([A-Za-z ]+)\. How many \3 are in (\d+) ([A-Za-z ]+)\?$/))) {
      const per = Number(m[2]), n = Number(m[4]);
      /* MOE p.37 3.1: 3 digits by 2 digits is the ceiling for a 2-digit multiplier */
      if (n > 999 || per > 99) return `p4 mul word: ${n} x ${per} is outside 3 digits by 2 digits`;
      const e = n * per;
      return near(e, q.answer) ? null : `p4 mul word: expected ${e}, got ${q.answer}`;
    }

    /* --- P4 lane: fractions (js/topics/p4-fractions.js). Typed items only.
       The fraction itself is read off the RENDERED markup with parseFrac, never
       from answerText; the stripped stem collapses a rendered fraction to its
       digits, so the words carry the match and parseFrac carries the numbers. */
    const P4UNITS = { halves: 2, thirds: 3, quarters: 4, fifths: 5, sixths: 6,
                      sevenths: 7, eighths: 8, ninths: 9, tenths: 10, elevenths: 11, twelfths: 12 };
    if ((m = text.match(/^How many ([a-z]+) are there in (\d+) /))) {
      const f = parseFrac(q.q);
      if (!f) return 'p4 mixed->improper: no fraction rendered in the stem';
      if (P4UNITS[m[1]] !== f[1]) return `p4 mixed->improper: stem says ${m[1]} but the fraction is /${f[1]}`;
      if (f[1] > 12) return `p4 mixed->improper: denominator ${f[1]} exceeds 12`;
      const e = Number(m[2]) * f[1] + f[0];
      return near(e, q.answer) ? null : `p4 mixed->improper: expected ${e}, got ${q.answer}`;
    }
    if (/^Write .* as a mixed number\. What is the whole number part\?$/.test(text)) {
      const f = parseFrac(q.q);
      if (!f) return 'p4 improper->mixed: no fraction rendered in the stem';
      if (f[0] <= f[1]) return `p4 improper->mixed: ${f[0]}/${f[1]} is not an improper fraction`;
      const e = Math.floor(f[0] / f[1]);
      return near(e, q.answer) ? null : `p4 improper->mixed whole: expected ${e}, got ${q.answer}`;
    }
    if (/^Write .* as a mixed number\. What is the numerator of the fraction part\?$/.test(text)) {
      const f = parseFrac(q.q);
      if (!f) return 'p4 improper->mixed: no fraction rendered in the stem';
      const e = f[0] % f[1];
      if (e === 0) return `p4 improper->mixed: ${f[0]}/${f[1]} has no fraction part`;
      return near(e, q.answer) ? null : `p4 improper->mixed numerator: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^There are (\d+) [a-z ]+ on a tray\. \d+ of them are ([a-z ]+)\. How many are \2\?$/))) {
      const f = parseFrac(q.q);
      if (!f) return 'p4 fraction of a set: no fraction rendered in the stem';
      const total = Number(m[1]);
      if (total % f[1] !== 0) return `p4 fraction of a set: ${total} does not split into ${f[1]} equal groups`;
      const e = total * f[0] / f[1];
      return near(e, q.answer) ? null : `p4 fraction of a set: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^\d+ of the [A-Za-z ]+ are ([A-Za-z ]+)\. There are (\d+) \1\. How many [A-Za-z ]+\?$/))) {
      const f = parseFrac(q.q);
      if (!f) return 'p4 set from a part: no fraction rendered in the stem';
      const e = Number(m[2]) * f[1] / f[0];
      if (!Number.isInteger(e)) return `p4 set from a part: ${m[2]} is not ${f[0]}/${f[1]} of a whole number`;
      return near(e, q.answer) ? null : `p4 set from a part: expected ${e}, got ${q.answer}`;
    }

    /* --- P3 pilot: division with remainder + 3-digit-by-1-digit algorithms --- */
    if ((m = text.match(/packs (\d+) [^.]*into (\d+) boxes[^.]*\. How many are left over\?/))) {
      const e = Number(m[1]) % Number(m[2]);
      return near(e, q.answer) ? null : `left over: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/packs (\d+) [^.]*into boxes of (\d+)\. How many boxes are needed/))) {
      const e = Math.ceil(Number(m[1]) / Number(m[2]));
      return near(e, q.answer) ? null : `boxes needed: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/How many groups of (\d+) can be made from (\d+)\?/))) {
      const e = Math.floor(Number(m[2]) / Number(m[1]));
      return near(e, q.answer) ? null : `groups of: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) x (\d+) = \?$/))) {
      const e = Number(m[1]) * Number(m[2]);
      return near(e, q.answer) ? null : `typed mul: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) \/ (\d+) = \?$/))) {
      const e = Number(m[1]) / Number(m[2]);
      return near(e, q.answer) ? null : `typed div: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/buys (\d+) trays of eggs[^.]*\. Each tray holds (\d+) eggs\. (\d+) eggs crack/))) {
      const e = Number(m[1]) * Number(m[2]) - Number(m[3]);
      return near(e, q.answer) ? null : `eggs two-step: expected ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: order of operations and brackets (expression re-parsed) --- */
    if ((m = text.match(/^Work out: (.+) = \?$/))) {
      const e = evalExpr(m[1]);
      if (e === null) return 'order of ops: could not parse "' + m[1] + '"';
      return near(e, q.answer) ? null : `order of ops: ${m[1]} = ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: whole numbers, x / by 10, 100, 1000 and their multiples --- */
    if ((m = text.match(/orders (\d+) packets of kaya toast[^.]*\. Each packet costs (\d+) cents/))) {
      const e = Number(m[1]) * Number(m[2]);
      return near(e, q.answer) ? null : `kaya toast: expected ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: percentage --- */
    if ((m = text.match(/There are (\d+) [^.]*\. (\d+) of them wear spectacles/))) {
      const e = Number(m[2]) * 100 / Number(m[1]);
      return near(e, q.answer) ? null : `part as %: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/saves (\d+)% of the \$(\d+) collected/))) {
      const e = Number(m[1]) * Number(m[2]) / 100;
      return near(e, q.answer) ? null : `% of money: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/before GST is \$(\d+)\. GST is (\d+)%/))) {
      const p = Number(m[1]);
      const e = p + p * Number(m[2]) / 100;
      return near(e, q.answer) ? null : `GST: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/puts \$(\d+) into a POSB account that pays (\d+)% interest/))) {
      const e = Number(m[1]) * Number(m[2]) / 100;
      return near(e, q.answer) ? null : `interest: expected ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: area of triangle --- */
    if ((m = text.match(/base of (\d+) cm and a height of (\d+) cm\. What is its area/))) {
      const e = Number(m[1]) * Number(m[2]) / 2;
      return near(e, q.answer) ? null : `triangle area: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/area of (\d+) cm² and a height of (\d+) cm\. What is the length of its base/))) {
      const e = 2 * Number(m[1]) / Number(m[2]);
      return near(e, q.answer) ? null : `triangle base: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/area of (\d+) cm² and a base of (\d+) cm\. What is its height/))) {
      const e = 2 * Number(m[1]) / Number(m[2]);
      return near(e, q.answer) ? null : `triangle height: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/rectangle (\d+) cm by (\d+) cm, and a triangle with base (\d+) cm and height (\d+) cm/))) {
      const e = Number(m[1]) * Number(m[2]) + Number(m[3]) * Number(m[4]) / 2;
      return near(e, q.answer) ? null : `composite area: expected ${e}, got ${q.answer}`;
    }

    /* --- P4 area+graphs lane: missing dimension of a rectangle/square, and
       composite figures described in words. Every dimension is re-read off the
       rendered stem; nothing is taken from answerText. These sit ABOVE the P5
       triangle branches' looser neighbours because each anchors on wording no
       other topic emits ("its breadth", "length of one side", "do not overlap"). --- */
    if ((m = text.match(/area of (\d+) cm² and its length is (\d+) cm\. What is its breadth/))) {
      const e = Number(m[1]) / Number(m[2]);
      return near(e, q.answer) ? null : `rect breadth from area: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/perimeter of the \w+ is (\d+) cm and its length is (\d+) cm\. What is its breadth/))) {
      const e = Number(m[1]) / 2 - Number(m[2]);
      return near(e, q.answer) ? null : `rect breadth from perimeter: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/perimeter of the \w+ is (\d+) cm\. What is the length of one side/))) {
      const e = Number(m[1]) / 4;
      return near(e, q.answer) ? null : `square side from perimeter: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/area of (\d+) cm²\. What is the length of one side/))) {
      const e = Math.sqrt(Number(m[1]));
      if (!Number.isInteger(e)) return `square side from area: ${m[1]} is not a perfect square`;
      return near(e, q.answer) ? null : `square side from area: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/two rectangles that do not overlap\. One rectangle measures (\d+) cm by (\d+) cm\. The other measures (\d+) cm by (\d+) cm/))) {
      const e = Number(m[1]) * Number(m[2]) + Number(m[3]) * Number(m[4]);
      return near(e, q.answer) ? null : `composite words (add): expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/card measures (\d+) cm by (\d+) cm\. A square hole of side (\d+) cm is cut out/))) {
      const e = Number(m[1]) * Number(m[2]) - Number(m[3]) * Number(m[3]);
      return near(e, q.answer) ? null : `composite words (sub): expected ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: volume of cube and cuboid --- */
    if ((m = text.match(/builds a solid (\d+) cubes long, (\d+) cubes wide and (\d+) cubes high/))) {
      const e = Number(m[1]) * Number(m[2]) * Number(m[3]);
      return near(e, q.answer) ? null : `unit cubes: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) ℓ (\d+) ml of barley water/))) {
      const e = Number(m[1]) * 1000 + Number(m[2]);
      return near(e, q.answer) ? null : `litres to cm³: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/base (\d+) cm by (\d+) cm\. Water is poured in to a depth of (\d+) cm/))) {
      const e = Number(m[1]) * Number(m[2]) * Number(m[3]);
      return near(e, q.answer) ? null : `tank volume: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/base (\d+) cm by (\d+) cm to a depth of (\d+) cm/))) {
      const e = Number(m[1]) * Number(m[2]) * Number(m[3]);
      return near(e, q.answer) ? null : `tank ml: expected ${e}, got ${q.answer}`;
    }

    /* --- P5 wave 2: rate (typed). Every stem gives two of the three quantities. --- */
    if ((m = text.match(/prints (\d+) pages in (\d+) minutes\. How many pages does it print in 1 minute\?$/))) {
      const e = Number(m[1]) / Number(m[2]);
      return near(e, q.answer) ? null : `rate per minute: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/packs (\d+) buns per minute\. How many minutes does it take to pack (\d+) buns\?$/))) {
      const e = Number(m[2]) / Number(m[1]);
      return near(e, q.answer) ? null : `rate units: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/packs (\d+) buns each minute\. How many buns does it pack in 1 hour (\d+) minutes\?$/))) {
      const e = Number(m[1]) * (60 + Number(m[2]));
      return near(e, q.answer) ? null : `rate hour+min: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/A tap fills (\d+) ℓ of water in (\d+) minutes\. At the same rate, how much water flows in (\d+) minutes\?$/))) {
      const e = Number(m[1]) / Number(m[2]) * Number(m[3]);
      return near(e, q.answer) ? null : `rate two-step: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/charges \$(\d+\.\d\d) per hour\..* parks there for (\d+) hours\./))) {
      const e = Number((Math.round(parseFloat(m[1]) * 100) * Number(m[2]) / 100).toFixed(2));
      return near(e, q.answer) ? null : `parking rate: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/charges \$(\d+\.\d\d) for (\d+) kg of washing\. What is the charge for 1 kg/))) {
      const e = Number((Math.round(parseFloat(m[1]) * 100) / Number(m[2]) / 100).toFixed(2));
      return near(e, q.answer) ? null : `laundry rate: expected ${e}, got ${q.answer}`;
    }

    /* --- P3 pilot: money in decimal notation (all amounts read off the stem) --- */
    if (/\$\d/.test(text)) {
      const amts = [...text.matchAll(/\$(\d+\.\d{2})/g)].map(x => Math.round(parseFloat(x[1]) * 100));
      if (amts.length >= 2) {
        const sum = arr => arr.reduce((s, v) => s + v, 0);
        let cents = null;
        if (/change should/.test(text)) cents = amts[amts.length - 1] - sum(amts.slice(0, -1));
        else if (/in total/.test(text)) cents = sum(amts);
        else if (/money is left/.test(text)) cents = amts[0] - sum(amts.slice(1));
        if (cents !== null) {
          const e = Number((cents / 100).toFixed(2));
          return near(e, q.answer) ? null : `money: expected ${e}, got ${q.answer}`;
        }
      }
    }
    return false;
  }

  /* --- P4 lane: whole numbers up to 100 000 (spaced numerals: "47 253") ---
     These sit ABOVE the P3 branches on purpose: the P3 stems are the same shape
     with an unspaced numeral, and a looser branch that matched first would
     report a content bug that is not there (P3 pilot rubric lesson 2). */
  const unsp = s => Number(String(s).replace(/[ ,]/g, ''));
  const chNums = qq => (qq.choices || []).map(c => unsp(String(c)));
  if ((m = text.match(/^In (\d[\d ]*), the digit (\d) stands for how much\?$/))) {
    const s = m[1].replace(/ /g, ''), idx = s.indexOf(m[2]);
    if (idx < 0) return 'p4 stands-for: digit is not in the number ' + s;
    if (s.split(m[2]).length > 2) return 'p4 stands-for: digit appears twice, question is ambiguous';
    const e = Number(m[2]) * Math.pow(10, s.length - 1 - idx);
    return near(e, ansNum) ? null : `p4 stands for: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which digit is in the (ten thousands|thousands|hundreds|tens|ones) place of (\d[\d ]*)\?$/))) {
    const s = m[2].replace(/ /g, '');
    const pos = { 'ten thousands': 10000, thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[m[1]];
    if (Number(s) < pos) return 'p4 which-digit: number is too small for the ' + m[1] + ' place';
    const e = Math.floor(Number(s) / pos) % 10;
    return near(e, ansNum) ? null : `p4 which digit: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Round (\d[\d ]*) to the nearest (10|100|1000)\.$/))) {
    const n = unsp(m[1]), u = Number(m[2]);
    const e = Math.floor(n / u + 0.5) * u;                 /* halfway rounds up, MOE convention */
    return near(e, ansNum) ? null : `p4 round ${n} to ${u}: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^What number continues the pattern\? (.+), \?$/))) {
    const t = m[1].split(',').map(unsp).filter(Number.isFinite);
    if (t.length < 3) return 'p4 pattern: could not read the sequence';
    const d = t[1] - t[0];
    if (!t.every((v, i) => i === 0 || v - t[i - 1] === d)) return 'p4 pattern: not an arithmetic sequence: ' + t.join(',');
    const e = t[t.length - 1] + d;
    return near(e, ansNum) ? null : `p4 pattern: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which of these is the (greatest|smallest) number\?$/))) {
    const ns = chNums(q);
    if (ns.length !== 4 || ns.some(x => !Number.isFinite(x))) return 'p4 compare: choices are not four numbers';
    const e = m[1] === 'greatest' ? Math.max.apply(null, ns) : Math.min.apply(null, ns);
    return near(e, ansNum) ? null : `p4 ${m[1]}: expected ${e}, got ${ansNum}`;
  }

  /* --- P4 lane: factors and multiples --- */
  if ((m = text.match(/^Which of these is a factor of (\d+)\?$/))) {
    const n = Number(m[1]), hits = chNums(q).filter(c => c > 0 && n % c === 0);
    if (hits.length !== 1) return `p4 factor: ${hits.length} of the choices divide ${n}, question is ambiguous`;
    return near(hits[0], ansNum) ? null : `p4 factor of ${n}: expected ${hits[0]}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which of these is a common factor of (\d+) and (\d+)\?$/))) {
    const a = Number(m[1]), b = Number(m[2]);
    const hits = chNums(q).filter(c => c > 0 && a % c === 0 && b % c === 0);
    if (hits.length !== 1) return `p4 common factor: ${hits.length} of the choices divide both ${a} and ${b}`;
    return near(hits[0], ansNum) ? null : `p4 common factor: expected ${hits[0]}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which of these is a multiple of (\d+)\?$/))) {
    const d = Number(m[1]), hits = chNums(q).filter(c => c > 0 && c % d === 0);
    if (hits.length !== 1) return `p4 multiple: ${hits.length} of the choices are multiples of ${d}`;
    return near(hits[0], ansNum) ? null : `p4 multiple of ${d}: expected ${hits[0]}, got ${ansNum}`;
  }
  if ((m = text.match(/^What is the (\d)(?:st|nd|rd|th) multiple of (\d+)\?$/))) {
    const e = Number(m[1]) * Number(m[2]);
    return near(e, ansNum) ? null : `p4 nth multiple: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^How many factors does (\d+) have\?$/))) {
    const n = Number(m[1]); let c = 0;
    for (let i = 1; i <= n; i++) if (n % i === 0) c++;
    return near(c, ansNum) ? null : `p4 factor count of ${n}: expected ${c}, got ${ansNum}`;
  }

  /* --- P4 lane: fraction as part of a set, answered AS a fraction (MC).
     Sits above the generic fraction branches: the answer is compared by cross
     multiplication, so an unsimplified key would still verify, and the simplest
     form is asserted separately. --- */
  if ((m = text.match(/^A box holds (\d+) red marbles and (\d+) blue marbles\. What fraction of the marbles are red\?$/))) {
    const a = Number(m[1]), b = Number(m[2]), total = a + b;
    if (!ansFrac) return 'p4 set as fraction: the key is not a rendered fraction';
    if (a * ansFrac[1] !== ansFrac[0] * total) return `p4 set as fraction: expected ${a}/${total}, got ${ansFrac[0]}/${ansFrac[1]}`;
    if (gcd(ansFrac[0], ansFrac[1]) !== 1) return `p4 set as fraction: ${ansFrac[0]}/${ansFrac[1]} is not in simplest form`;
    if (ansFrac[1] > 12) return `p4 set as fraction: denominator ${ansFrac[1]} exceeds 12`;
    return null;
  }

  /* --- P3 pilot: whole numbers up to 10 000 --- */
  if ((m = text.match(/^In (\d+), the digit (\d+) stands for how much\?$/))) {
    const s = m[1], idx = s.indexOf(m[2]);
    if (idx < 0) return 'stands-for: digit is not in the number ' + s;
    if (s.split(m[2]).length > 2) return 'stands-for: digit appears twice, question is ambiguous';
    const e = Number(m[2]) * Math.pow(10, s.length - 1 - idx);
    return near(e, ansNum) ? null : `stands for: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which digit is in the (thousands|hundreds|tens|ones) place of (\d+)\?$/))) {
    const s = m[2];
    if (s.length !== 4) return 'which-digit: expected a 4-digit number, got ' + s;
    const e = Number(s[{ thousands: 0, hundreds: 1, tens: 2, ones: 3 }[m[1]]]);
    return near(e, ansNum) ? null : `which digit: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which number has (\d+) thousands?, (\d+) hundreds?, (\d+) tens? and (\d+) ones?\?$/))) {
    const e = Number(m[1]) * 1000 + Number(m[2]) * 100 + Number(m[3]) * 10 + Number(m[4]);
    return near(e, ansNum) ? null : `build number: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^What number is (\d+) (more|less) than (\d+)\?$/))) {
    const e = m[2] === 'more' ? Number(m[3]) + Number(m[1]) : Number(m[3]) - Number(m[1]);
    return near(e, ansNum) ? null : `more/less: expected ${e}, got ${ansNum}`;
  }

  /* --- P3 pilot: compound units (km/m, m/cm, kg/g, litre/ml) --- */
  const UF = { km: 1000, m: 100, kg: 1000, 'ℓ': 1000 };
  if ((m = text.match(/^(\d+) (km|m|kg|ℓ) (\d+) (m|cm|g|ml) = \?$/))) {
    const e = Number(m[1]) * UF[m[2]] + Number(m[3]);
    return near(e, ansNum) ? null : `compound -> small: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^(\d+) (m|cm|g|ml) = (\d+) (km|m|kg|ℓ) \? (m|cm|g|ml)$/))) {
    const e = Number(m[1]) - Number(m[3]) * UF[m[4]];
    return near(e, ansNum) ? null : `small -> compound (small part): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^(\d+) (m|cm|g|ml) = \? (km|m|kg|ℓ) (\d+) (m|cm|g|ml)$/))) {
    const e = (Number(m[1]) - Number(m[4])) / UF[m[3]];
    return near(e, ansNum) ? null : `small -> compound (big part): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/holding (\d+) (km|m|kg|ℓ) (\d+) (m|cm|g|ml) [^.]*?(?:drinks|cooks) (\d+) (m|cm|g|ml)\. How much is left/))) {
    const e = Number(m[1]) * UF[m[2]] + Number(m[3]) - Number(m[5]);
    return near(e, ansNum) ? null : `compound word (left): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/(?:measures|weighs) (\d+) (km|m|kg|ℓ) (\d+) (m|cm|g|ml) and .*?(?:measures|weighs) (\d+) (km|m|kg|ℓ) (\d+) (m|cm|g|ml)\. How much (?:heavier|longer)/))) {
    const e = (Number(m[1]) * UF[m[2]] + Number(m[3])) - (Number(m[5]) * UF[m[6]] + Number(m[7]));
    return near(e, ansNum) ? null : `compound word (compare): expected ${e}, got ${ansNum}`;
  }

  /* --- P4 area+graphs lane: composite L-shape figure. RENDERED SURFACE ONLY: the
     six side lengths are read off the six printed labels, exactly as a child reads
     them. The oracle first checks the figure closes (top + cut-across = bottom, and
     cut-down + right = left), then derives area and perimeter from those six numbers
     alone. Sits above the bar-graph branch because it anchors on class="lfig". --- */
  if (/class="lfig"/.test(String(q.extra))) {
    const raw = String(q.extra);
    const side = c => {
      const t = raw.match(new RegExp('<span class="lf-' + c + '"[^>]*>(\\d+)</span>'));
      return t ? Number(t[1]) : null;
    };
    const top = side('top'), cutd = side('cutdown'), cuta = side('cutacross'),
          right = side('right'), bottom = side('bottom'), left = side('left');
    if ([top, cutd, cuta, right, bottom, left].some(v => v === null))
      return 'L figure: a side length is not printed on the figure';
    if (top + cuta !== bottom) return `L figure: ${top} + ${cuta} != bottom ${bottom}`;
    if (cutd + right !== left) return `L figure: ${cutd} + ${right} != left ${left}`;
    /* WOUND 3 GATE: a cut deeper than two thirds of a side leaves a sliver a
       child cannot picture. Was exceeded in 24% of draws (max 0.81). */
    if (cuta * 3 > bottom * 2) return `L figure: the cut is ${cuta}/${bottom} of the width (cap 2/3)`;
    if (cutd * 3 > left * 2) return `L figure: the cut is ${cutd}/${left} of the height (cap 2/3)`;
    /* KILL 3 GATE: perimeter and area may never print the same number. */
    {
      const per = top + cutd + cuta + right + bottom + left, area = bottom * left - cuta * cutd;
      if (per === area) return `L figure: coincidence - perimeter and area are both ${per}`;
    }
    if (/What is the area of this figure/.test(text)) {
      const e = bottom * left - cuta * cutd;
      return near(e, ansNum) ? null : `L area: expected ${e}, got ${ansNum}`;
    }
    if (/What is the perimeter of this figure/.test(text)) {
      const e = top + cutd + cuta + right + bottom + left;
      return near(e, ansNum) ? null : `L perimeter: expected ${e}, got ${ansNum}`;
    }
    /* DEPTH PILOT format bank on the same rendered figure. */
    if (/What is the correct perimeter of this figure/.test(text)) {
      const e = top + cutd + cuta + right + bottom + left;
      const claim = Number((text.match(/says the perimeter is (\d+) cm/) || [])[1]);
      if (!Number.isFinite(claim)) return 'L error-spot: no claimed perimeter in the stem';
      if (claim === e) return `L error-spot: the "wrong" claim ${claim} equals the true perimeter`;
      /* KILL 1 GATE (refutation 2026-09-05). The stem says Ravi adds "the four
         longest sides", so the two he omits must BE the two shortest sides of the
         rendered figure, and the printed claim must be the sum of the other four.
         Before the fix this premise was false in 67% of draws: a child obeying the
         stem reached a third number that was neither the key nor the claim. */
      if (/adds up only the four longest sides/.test(text)) {
        const others = [top, right, bottom, left];
        if (Math.max(cuta, cutd) >= Math.min(...others))
          return `L error-spot: stem says "four longest" but the omitted notch sides (${cuta}, ${cutd}) are not the two shortest of ${[top, cutd, cuta, right, bottom, left].join(',')}`;
        /* WOUND 4 GATE (v3): a 1 cm gap between the 4th and 5th longest sides turned
           "the four longest" into a sorting exercise off six near-equal labels. */
        if (Math.max(cuta, cutd) + 2 > Math.min(...others))
          return `L error-spot: the 4th/5th side gap is only ${Math.min(...others) - Math.max(cuta, cutd)} cm (need >= 2)`;
        const four = others.reduce((s, v) => s + v, 0);
        if (claim !== four)
          return `L error-spot: the four longest sides sum to ${four}, but the stem prints ${claim}`;
      }
      if (claim !== e - cuta - cutd) return `L error-spot: claim ${claim} is not the named misconception (${e - cuta - cutd})`;
      return near(e, ansNum) ? null : `L error-spot: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/A square of side (\d+) cm sits beside this figure\. How much longer is the perimeter of (the figure|the square)/))) {
      const per = top + cutd + cuta + right + bottom + left, sq = 4 * Number(m[1]);
      const bigger = per > sq ? 'the figure' : 'the square';
      if (m[2] !== bigger) return `L compare: stem names ${m[2]} as longer but ${bigger} is`;
      const e = Math.abs(per - sq);
      return near(e, ansNum) ? null : `L compare: expected ${e}, got ${ansNum}`;
    }
    return 'L figure: rendered a figure but no oracle matched the stem';
  }

  /* --- W3 lane: PIE CHARTS (p4pie). RENDERED SURFACE ONLY. Every sector prints its
     value twice - inside the slice (`pie-lab`) and in the legend beside the category
     name (`pie-cat` + `pie-val`). The oracle reads the LEGEND, cross-checks it against
     the slice labels, and re-derives every answer from those printed strings. Nothing
     is taken from the generator's data array or from answerText. --- */
  if (/class="piechart"/.test(String(q.extra))) {
    const raw = String(q.extra);
    const keys = [...raw.matchAll(/<span class="pie-cat"[^>]*>([^<]+)<\/span><b class="pie-val"[^>]*>([^<]+)<\/b>/g)];
    const slice = [...raw.matchAll(/<text class="pie-lab"[^>]*>([^<]+)<\/text>/g)].map(t => t[1]);
    if (keys.length < 3) return 'pie: fewer than 3 labelled sectors';
    if (slice.length !== keys.length) return `pie: ${slice.length} slice labels but ${keys.length} legend keys`;
    for (let i = 0; i < slice.length; i++) {
      if (slice[i] !== keys[i][2]) return `pie: slice prints "${slice[i]}" but the key prints "${keys[i][2]}"`;
    }
    const names = keys.map(k => k[1]), labs = keys.map(k => k[2]);
    if (new Set(names).size !== names.length) return 'pie: a category appears twice in the key';
    const sectors = [...raw.matchAll(/class="pie-sec"/g)].length;
    if (sectors !== keys.length) return `pie: ${sectors} drawn sectors but ${keys.length} keys`;
    const fracOf = s => { const mm = /^(\d+)\/(\d+)$/.exec(s); return mm ? Number(mm[1]) / Number(mm[2]) : null; };
    const isCount = labs.every(s => /^\d+$/.test(s));
    const isFrac = labs.every(s => fracOf(s) !== null);
    const hidden = labs.filter(s => s === '?').length;
    const val = c => { const i = names.indexOf(c); return i < 0 ? null : Number(labs[i]); };

    if (isFrac) {
      const sum = labs.reduce((s, f) => s + fracOf(f), 0);
      if (Math.abs(sum - 1) > 1e-9) return `pie fractions: printed sectors sum to ${sum}, not 1 whole`;
      const fv = c => { const i = names.indexOf(c); return i < 0 ? null : fracOf(labs[i]); };
      if ((m = text.match(/shows how all (\d+) .+ are shared out\. How many .+ are shown for (.+)\?$/))) {
        const f = fv(m[2]);
        if (f === null) return 'pie fraction-of-set: category "' + m[2] + '" is not in the key';
        const e = f * Number(m[1]);
        if (!Number.isInteger(e)) return `pie fraction-of-set: ${m[2]} is not a whole number of items`;
        return near(e, ansNum) ? null : `pie fraction of set: expected ${e}, got ${ansNum}`;
      }
      if ((m = text.match(/^On the pie chart, the (.+) sector stands for (\d+) .+\. How many .+ are there altogether\?$/))) {
        const i = names.indexOf(m[1]);
        if (i < 0) return 'pie find-the-whole: category "' + m[1] + '" is not in the key';
        /* exact rational: part / (n/d) = part * d / n. Doing this in floating point
           turned 35 / (7/12) into 59.999999999999993 and failed a correct key. */
        const fm = /^(\d+)\/(\d+)$/.exec(labs[i]);
        const e = Number(m[2]) * Number(fm[2]) / Number(fm[1]);
        if (!Number.isInteger(e)) return `pie find-the-whole: ${m[2]} over its fraction is not whole`;
        return near(e, ansNum) ? null : `pie find the whole: expected ${e}, got ${ansNum}`;
      }
      return 'pie: rendered a fraction pie but no oracle matched the stem';
    }

    if (hidden === 1 && labs.filter(s => /^\d+$/.test(s)).length === labs.length - 1) {
      if ((m = text.match(/^Altogether there are (\d+) .+ How many .+ are shown for (.+)\?$/))) {
        const i = names.indexOf(m[2]);
        if (i < 0) return 'pie missing: category "' + m[2] + '" is not in the key';
        if (labs[i] !== '?') return 'pie missing: the asked sector is not the hidden one';
        const known = labs.filter(s => s !== '?').map(Number);
        const e = Number(m[1]) - known.reduce((s, v) => s + v, 0);
        return near(e, ansNum) ? null : `pie missing sector: expected ${e}, got ${ansNum}`;
      }
      return 'pie: rendered a pie with a hidden sector but no oracle matched the stem';
    }

    if (!isCount) return 'pie: sector labels are neither all counts nor all fractions: ' + labs.join(' | ');
    const nums = labs.map(Number);
    const total = nums.reduce((a, b) => a + b, 0);
    const big = Math.max.apply(null, nums), small = Math.min.apply(null, nums);

    if (/^One of these statements about the pie chart is WRONG\. Which one is it\?$/.test(text)) {
      const truth = s => {
        let t;
        if ((t = s.match(/^(.+) shows the most .+\.$/))) { const v = val(t[1]); return v === null ? null : v === big; }
        if ((t = s.match(/^(.+) shows the fewest .+\.$/))) { const v = val(t[1]); return v === null ? null : v === small; }
        if ((t = s.match(/^(.+) shows more .+ than (.+)\.$/))) {
          const a = val(t[1]), b = val(t[2]); return (a === null || b === null) ? null : a > b;
        }
        if ((t = s.match(/^(.+) and (.+) together show (\d+) .+\.$/))) {
          const a = val(t[1]), b = val(t[2]); return (a === null || b === null) ? null : a + b === Number(t[3]);
        }
        if ((t = s.match(/^There are (\d+) .+ altogether on the chart\.$/))) return total === Number(t[1]);
        return null;
      };
      const verdicts = q.choices.map(c => truth(strip(c)));
      if (verdicts.some(v => v === null)) return 'pie wrong-statement: an option is not a checkable claim';
      const falses = verdicts.filter(v => v === false).length;
      if (falses !== 1) return `pie wrong-statement: ${falses} false options, expected exactly 1`;
      return verdicts[q.correct] === false ? null
        : 'pie wrong-statement: the keyed option is true, not false';
    }
    /* Wave-3 integration: the two extra statement shapes added when the pie refuter's
       wound 3 was applied. Same truth evaluator, inverted key / pairwise differences. */
    const claimTruth = s2 => {
      let t;
      if ((t = s2.match(/^(.+) shows the most .+\.$/))) { const v = val(t[1]); return v === null ? null : v === big; }
      if ((t = s2.match(/^(.+) shows the fewest .+\.$/))) { const v = val(t[1]); return v === null ? null : v === small; }
      if ((t = s2.match(/^(.+) shows (\d+) more .+ than (.+)\.$/))) {
        const a = val(t[1]), b = val(t[3]); return (a === null || b === null) ? null : a - b === Number(t[2]);
      }
      if ((t = s2.match(/^(.+) shows more .+ than (.+)\.$/))) {
        const a = val(t[1]), b = val(t[2]); return (a === null || b === null) ? null : a > b;
      }
      if ((t = s2.match(/^(.+) and (.+) together show (\d+) .+\.$/))) {
        const a = val(t[1]), b = val(t[2]); return (a === null || b === null) ? null : a + b === Number(t[3]);
      }
      if ((t = s2.match(/^There are (\d+) .+ altogether on the chart\.$/))) return total === Number(t[1]);
      return null;
    };
    if (/^Three of these statements about the pie chart are WRONG\. Which one is TRUE\?$/.test(text)) {
      const verdicts = q.choices.map(c => claimTruth(strip(c)));
      if (verdicts.some(v => v === null)) return 'pie true-statement: an option is not a checkable claim';
      const trues = verdicts.filter(v => v === true).length;
      if (trues !== 1) return `pie true-statement: ${trues} true options, expected exactly 1`;
      return verdicts[q.correct] === true ? null : 'pie true-statement: the keyed option is false, not true';
    }
    if (/^Each statement below compares two sectors of the pie chart\. Which one is WRONG\?$/.test(text)) {
      const verdicts = q.choices.map(c => claimTruth(strip(c)));
      if (verdicts.some(v => v === null)) return 'pie compare-statement: an option is not a checkable difference claim';
      const falses = verdicts.filter(v => v === false).length;
      if (falses !== 1) return `pie compare-statement: ${falses} false options, expected exactly 1`;
      return verdicts[q.correct] === false ? null : 'pie compare-statement: the keyed option is true, not false';
    }
    if ((m = text.match(/^On the pie chart, one sector shows (\d+) .+\. Which one is it\?$/))) {
      const hits = names.filter((_, i) => nums[i] === Number(m[1]));
      if (hits.length !== 1) return `pie which-sector: ${hits.length} sectors print ${m[1]}`;
      return strip(q.answerText) === hits[0] ? null
        : `pie which sector: expected ${hits[0]}, got ${strip(q.answerText)}`;
    }
    if (/^How many .+ are shown on the whole pie chart altogether\?$/.test(text)) {
      return near(total, ansNum) ? null : `pie total: expected ${total}, got ${ansNum}`;
    }
    if (/one sector is bigger than all the others/.test(text)) {
      if (nums.filter(v => v === big).length !== 1) return 'pie biggest: the largest sector is tied';
      return near(big, ansNum) ? null : `pie biggest: expected ${big}, got ${ansNum}`;
    }
    if (/one sector is smaller than all the others/.test(text)) {
      if (nums.filter(v => v === small).length !== 1) return 'pie smallest: the smallest sector is tied';
      return near(small, ansNum) ? null : `pie smallest: expected ${small}, got ${ansNum}`;
    }
    if ((m = text.match(/^How many sectors of the pie chart show more than (\d+) .+\?$/))) {
      const e = nums.filter(v => v > Number(m[1])).length;
      return near(e, ansNum) ? null : `pie count-above: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/^On the pie chart, (.+) and (.+) are put together\. How many more .+ is that than (.+) alone\?$/))) {
      const a = val(m[1]), b = val(m[2]), c = val(m[3]);
      if (a === null || b === null || c === null) return 'pie two-step: a named sector is not in the key';
      return near(a + b - c, ansNum) ? null : `pie two-step: expected ${a + b - c}, got ${ansNum}`;
    }
    if ((m = text.match(/are shown for (.+) than for (.+)\?$/))) {
      const a = val(m[1]), b = val(m[2]);
      if (a === null || b === null) return 'pie diff: a compared sector is not in the key';
      return near(a - b, ansNum) ? null : `pie diff: expected ${a - b}, got ${ansNum}`;
    }
    if ((m = text.match(/are shown for (.+) and (.+) altogether\?$/))) {
      const a = val(m[1]), b = val(m[2]);
      if (a === null || b === null) return 'pie combine: a summed sector is not in the key';
      return near(a + b, ansNum) ? null : `pie combine: expected ${a + b}, got ${ansNum}`;
    }
    if ((m = text.match(/^On the pie chart, how many .+ are shown for (.+)\?$/))) {
      const e = val(m[1]);
      if (e === null) return 'pie read: category "' + m[1] + '" is not in the key';
      return near(e, ansNum) ? null : `pie read: expected ${e}, got ${ansNum}`;
    }
    return 'pie: rendered a pie chart but no oracle matched the stem';
  }

  /* --- P4 area+graphs lane: tables. Every cell is printed text; the oracle reads the
     header row and the value row and pairs them by column order. --- */
  if (/class="dtable"/.test(String(q.extra))) {
    const raw = String(q.extra);
    const cats = [...raw.matchAll(/<th class="dt-cat"[^>]*>([^<]+)<\/th>/g)].map(t => t[1]);
    const cells = [...raw.matchAll(/<td class="dt-val"[^>]*>([^<]+)<\/td>/g)].map(t => t[1]);
    if (cats.length < 4) return 'table: fewer than 4 printed column headings';
    if (cats.length !== cells.length) return `table: ${cats.length} headings but ${cells.length} cells`;
    const val = c => { const i = cats.indexOf(c); return i < 0 ? null : cells[i]; };
    if ((m = text.match(/are recorded for (.+)\?$/))) {
      const v = val(m[1]);
      if (v === null || v === '?') return 'table: category "' + m[1] + '" is not readable in the table';
      return near(Number(v), ansNum) ? null : `table read: expected ${v}, got ${ansNum}`;
    }
    if (/What is the total number of .+ in the table\?$/.test(text)) {
      if (cells.includes('?')) return 'table total asked but a cell is hidden';
      const e = cells.reduce((s, v) => s + Number(v), 0);
      return near(e, ansNum) ? null : `table total: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/Altogether there were (\d+) .+ were there for (.+)\?$/))) {
      const i = cats.indexOf(m[2]);
      if (i < 0) return 'table: missing-cell category "' + m[2] + '" is not a column';
      if (cells[i] !== '?') return 'table: the asked column is not the hidden one';
      const known = cells.filter(v => v !== '?').map(Number);
      if (known.length !== cells.length - 1) return 'table: more than one hidden cell';
      const e = Number(m[1]) - known.reduce((s, v) => s + v, 0);
      return near(e, ansNum) ? null : `table complete: expected ${e}, got ${ansNum}`;
    }
    return 'table: rendered a table but no oracle matched the stem';
  }

  /* --- P4 area+graphs lane: line graphs. RENDERED SURFACE ONLY: the value at each
     point is read off the number printed above that point, and cross-checked against
     the numbers printed beside the axis ticks. --- */
  if (/class="linegraph"/.test(String(q.extra))) {
    const raw = String(q.extra);
    const cap = extra.match(/Each step up the side of the graph stands for (\d+)\.?/);
    if (!cap) return 'line graph: no scale caption printed under the graph';
    const step = Number(cap[1]);
    const ticks = [...raw.matchAll(/<text class="lg-tick"[^>]*>(\d+)<\/text>/g)].map(t => Number(t[1]));
    if (ticks.length < 3) return 'line graph: value axis has fewer than 3 printed ticks';
    const asc = ticks.slice().sort((a, b) => a - b);
    if (asc[0] !== 0) return 'line graph: axis does not start at 0, got ' + asc[0];
    for (let i = 1; i < asc.length; i++) {
      if (asc[i] - asc[i - 1] !== step) return `line graph: tick step ${asc[i] - asc[i - 1]} != ${step}`;
    }
    const vals = [...raw.matchAll(/<text class="lg-val"[^>]*>(\d+)<\/text>/g)].map(t => Number(t[1]));
    const cats = [...raw.matchAll(/<text class="lg-cat"[^>]*>([^<]+)<\/text>/g)].map(t => t[1]);
    if (cats.length < 4) return 'line graph: fewer than 4 labelled points';
    if (cats.length !== vals.length) return `line graph: ${cats.length} labels but ${vals.length} values`;
    for (let i = 0; i < vals.length; i++) {
      if (!ticks.includes(vals[i])) return `line graph: point "${cats[i]}" prints ${vals[i]}, which is not on the axis`;
    }
    const val = c => { const i = cats.indexOf(c); return i < 0 ? null : vals[i]; };
    if ((m = text.match(/^On the line graph, how many .+ are shown for (.+)\?$/)) &&
        !/ than for | and .+ altogether/.test(text)) {
      const e = val(m[1]);
      if (e === null) return 'line graph: category "' + m[1] + '" is not on the graph';
      return near(e, ansNum) ? null : `line read: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/are shown for (.+) than for (.+)\?$/))) {
      const a = val(m[1]), b = val(m[2]);
      if (a === null || b === null) return 'line graph: compared category is not on the graph';
      return near(a - b, ansNum) ? null : `line diff: expected ${a - b}, got ${ansNum}`;
    }
    if ((m = text.match(/are shown for (.+) and (.+) altogether\?$/))) {
      const a = val(m[1]), b = val(m[2]);
      if (a === null || b === null) return 'line graph: summed category is not on the graph';
      return near(a + b, ansNum) ? null : `line total: expected ${a + b}, got ${ansNum}`;
    }
    return 'line graph: rendered a graph but no oracle matched the stem';
  }

  /* --- P3 pilot: bar graphs. RENDERED SURFACE ONLY: every value is read off the
     bar's own printed number label and cross-checked against the printed axis
     ticks, exactly as a child reads it. No data-* attribute exists any more. --- */
  if (/class="bargraph"/.test(String(q.extra))) {
    const raw = String(q.extra);
    const cap = extra.match(/Each unit along the bottom of the graph stands for (\d+) /);
    if (!cap) return 'bar graph: no scale caption printed under the graph';
    const scale = Number(cap[1]);
    /* `bar` has been redrawn twice on 2026-09-07 and the oracle has followed both
       times WITHOUT loosening: the same four printed labels in the same order -
       .bg-cat, .bg-bar, .bg-val per row and .bg-tick on the axis - only the elements
       carrying them change. Pre-lane: <span>/<span>. Phone Width Lane: <text>/<path>/
       <text> inside a viewBox svg. Phone Width Refutation K4 (the viewBox scaled the
       LABELS down to 7.9 px on a 390 px phone): back to an HTML box model, but placed
       in percentages of the plot, so .bg-cat/.bg-val/.bg-tick are real HTML text at a
       fixed reading size. Still adjacency-strict: .bg-bar must be IMMEDIATELY followed
       by its .bg-val, and no second .bg-cat may appear between a category and its bar,
       so a row that stops printing any of the three still fails here. */
    const ticks = [...raw.matchAll(/<span class="bg-tick"[^>]*>(\d+)<\/span>/g)].map(t => Number(t[1]));
    if (ticks.length < 3) return 'bar graph: value axis has fewer than 3 printed ticks';
    if (ticks[0] !== 0) return 'bar graph: axis does not start at 0, got ' + ticks[0];
    for (let i = 1; i < ticks.length; i++) {
      if (ticks[i] - ticks[i - 1] !== scale) return `bar graph: tick step ${ticks[i] - ticks[i - 1]} != scale ${scale}`;
    }
    const bars = {};
    for (const b of raw.matchAll(/<div class="bg-cat"[^>]*>([^<]+)<\/div>(?:(?!class="bg-cat")[\s\S])*?<div class="bg-bar"[^>]*><\/div><span class="bg-val"[^>]*>(\d+)<\/span>/g)) {
      bars[b[1]] = Number(b[2]);
    }
    const names = Object.keys(bars);
    if (names.length < 4) return 'bar graph: fewer than 4 labelled bars rendered';
    for (const c of names) {
      if (!ticks.includes(bars[c])) return `bar graph: bar "${c}" prints ${bars[c]}, which is not on the axis`;
    }
    const val = c => (c in bars ? bars[c] : null);
    if ((m = text.match(/does the graph show for (.+)\?$/))) {
      const e = val(m[1]);
      if (e === null) return 'bar graph: category "' + m[1] + '" is not on the graph';
      return near(e, ansNum) ? null : `bar read: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/are shown for (.+) than for (.+)\?$/))) {
      const a = val(m[1]), b = val(m[2]);
      if (a === null || b === null) return 'bar graph: compared category is not on the graph';
      return near(a - b, ansNum) ? null : `bar diff: expected ${a - b}, got ${ansNum}`;
    }
    if ((m = text.match(/are shown for (.+) and (.+) altogether\?$/))) {
      const a = val(m[1]), b = val(m[2]);
      if (a === null || b === null) return 'bar graph: summed category is not on the graph';
      return near(a + b, ansNum) ? null : `bar total: expected ${a + b}, got ${ansNum}`;
    }
    return 'bar graph: rendered a graph but no oracle matched the stem';
  }

  /* --- WAVE 2 lane: P5 fraction of a quantity, multiple choice (MOE p.41, FRACTIONS 2.2:
     multiplying a proper fraction and a whole number, dressed as a word problem).
     Guarded on a rendered fraction, so the P5 percentage stems that also open
     "There are N ..." (they render no fraction, and are typed) cannot reach it. --- */
  if (/^There are (\d+) /.test(text) && /How many .+ are .+\?$/.test(text) && parseFrac(q.q)) {
    const total = Number(text.match(/^There are (\d+) /)[1]);
    const f = parseFrac(q.q);
    if (allFracs(q.q).length !== 1) return 'p5 fraction-of: more than one fraction rendered in the stem';
    if (f[0] >= f[1]) return `p5 fraction-of: ${f[0]}/${f[1]} is not a proper fraction of a set`;
    if (total * f[0] % f[1] !== 0) return `p5 fraction-of: ${f[0]}/${f[1]} of ${total} is not a whole number of objects`;
    const e = total * f[0] / f[1];
    const chosen = parseFloat(strip(q.answerText));
    for (let i = 0; i < q.choices.length; i++) {
      if (i !== q.correct && near(parseFloat(strip(q.choices[i])), e))
        return 'p5 fraction-of: a distractor equals the answer';
    }
    if (String(q.explain).indexOf('= ' + e + '.') < 0) return `p5 fraction-of: explanation never states ${e}`;
    return near(e, chosen) ? null : `p5 fraction-of: expected ${e}, got ${chosen}`;
  }

  /* --- WAVE 2 lane: P5 mixed numbers, multiple choice (MOE p.41, FRACTIONS 2.1 and 2.5).
     THIS BLOCK MUST STAY ABOVE the two-fraction branch immediately below it. That
     branch fires on any stem ending "= ?" that renders exactly two fractions, and
     it assumes the operator is + or -; a mixed-number stem renders two fractions,
     so the loose branch would compare 3/4 + 1/2 against a mixed answer key and
     report a false failure on the adds and a false PASS on nothing at all. It
     also cannot read the whole-number parts, which is the whole point of 2.1.
     Mixed numbers are rendered as "2 <frac>3/4</frac>": strip() eats the tags and
     would turn that into "2 34", so this reads the RAW markup. --- */
  if (/^(Add|Subtract) the mixed numbers: /.test(text) || /^Multiply: \d+ \d+ x \d+ = \?$/.test(text)) {
    const allMixed = html => [...String(html).matchAll(
      /(\d+)\s*<span class="frac"><span class="n">(\d+)<\/span><span class="d">(\d+)<\/span>/g)]
      .map(x => [Number(x[1]), Number(x[2]), Number(x[3])]);
    const mval = t => t[0] + t[1] / t[2];
    const mixQ = allMixed(q.q), mixA = allMixed(q.answerText);
    if (q.typed) return 'p5 mixed: a mixed-number answer may not be typed - MQI.parseTypedAnswer rejects "1 1/2"';
    if (mixA.length !== 1) return 'p5 mixed: the answer is not a single rendered mixed number';
    if (mixA[0][1] >= mixA[0][2]) return `p5 mixed: answer fraction part ${mixA[0][1]}/${mixA[0][2]} is not proper`;
    let e;
    if (/^Add the mixed numbers/.test(text)) {
      if (mixQ.length !== 2) return `p5 mixed add: ${mixQ.length} mixed numbers in the stem, expected 2`;
      e = mval(mixQ[0]) + mval(mixQ[1]);
    } else if (/^Subtract the mixed numbers/.test(text)) {
      if (mixQ.length !== 2) return `p5 mixed sub: ${mixQ.length} mixed numbers in the stem, expected 2`;
      e = mval(mixQ[0]) - mval(mixQ[1]);
      if (e <= 0) return 'p5 mixed sub: the stem has a negative or zero answer';
    } else {
      if (mixQ.length !== 1) return `p5 mixed mul: ${mixQ.length} mixed numbers in the stem, expected 1`;
      const w = text.match(/ x (\d+) = \?$/);
      if (!w) return 'p5 mixed mul: no whole-number operand found';
      e = mval(mixQ[0]) * Number(w[1]);
    }
    /* No authored distractor may be worth what the answer is worth. */
    for (let i = 0; i < q.choices.length; i++) {
      if (i === q.correct) continue;
      const c = allMixed(q.choices[i]);
      if (c.length === 1 && near(mval(c[0]), mval(mixA[0])))
        return `p5 mixed: distractor ${strip(q.choices[i])} equals the answer in value`;
    }
    /* The explanation is checked against the re-derived answer, not the generator's. */
    const want = mixA[0][0] + ' and ' + mixA[0][1] + '/' + mixA[0][2];
    if (String(q.explain).indexOf(want) < 0) return `p5 mixed: explanation never states the answer "${want}"`;
    return near(e, mval(mixA[0])) ? null : `p5 mixed: expected ${e}, got ${mval(mixA[0])}`;
  }

  /* --- fraction arithmetic (rendered via fr(), so read the markup) --- */
  if (/[+] *\? *= *1|\+ \? = 1/.test(strip(q.q).replace(/\s+/g, ' ')) || /\+ \? &nbsp; What is the missing/.test(q.q)) {
    const f = parseFrac(q.q);
    if (f && ansFrac) {
      const ok = near(f[0] / f[1] + ansFrac[0] / ansFrac[1], 1);
      return ok ? null : `make-one: ${f[0]}/${f[1]} + ${ansFrac[0]}/${ansFrac[1]} != 1`;
    }
  }
  if (/^1 [−-]/.test(text)) {
    const f = parseFrac(q.q);
    if (f && ansFrac) {
      const ok = near(1 - f[0] / f[1], ansFrac[0] / ansFrac[1]);
      return ok ? null : `1 - ${f[0]}/${f[1]} != ${ansFrac[0]}/${ansFrac[1]}`;
    }
  }
  if (/= \?$/.test(text) && allFracs(q.q).length === 2) {
    const [a, b] = allFracs(q.q);
    const op = /[−-]/.test(text) ? '-' : '+';
    if (ansFrac) {
      const e = op === '+' ? a[0] / a[1] + b[0] / b[1] : a[0] / a[1] - b[0] / b[1];
      const got = ansFrac[0] / ansFrac[1];
      return near(e, got) ? null : `frac ${op}: expected ${e}, got ${got}`;
    }
  }
  if (/missing numerator/i.test(text)) {
    const from = parseFrac(q.q);
    const to = q.q.match(/<span class="n">\?<\/span><span class="d">(\d+)<\/span>/);
    if (from && to) {
      const e = from[0] * (Number(to[1]) / from[1]);
      return near(e, ansNum) ? null : `missing numerator: expected ${e} for ${from[0]}/${from[1]} -> ?/${to[1]}, got ${ansNum}`;
    }
  }
  if (/missing denominator/i.test(text)) {
    const from = parseFrac(q.q);
    const to = q.q.match(/<span class="n">(\d+)<\/span><span class="d">\?<\/span>/);
    if (from && to) {
      const e = from[1] * (Number(to[1]) / from[0]);
      return near(e, ansNum) ? null : `missing denominator: expected ${e}, got ${ansNum}`;
    }
  }
  if (/equivalent to/.test(text)) {
    const f = parseFrac(q.q);
    if (f && ansFrac) {
      const ok = f[0] * ansFrac[1] === ansFrac[0] * f[1];
      if (!ok) return `equivalent: ${ansFrac[0]}/${ansFrac[1]} not equivalent to ${f[0]}/${f[1]}`;
      // and no distractor may also be equivalent
      const dupes = q.choices.filter((c, i) => { const g = parseFrac(c); return i !== q.correct && g && g[0] * f[1] === f[0] * g[1]; });
      return dupes.length ? 'equivalent: a distractor is also equivalent' : null;
    }
  }
  if (/simplest form|in its simplest/i.test(text)) {
    const f = parseFrac(q.q);
    if (f && ansFrac) {
      const g = gcd(f[0], f[1]);
      const e = [f[0] / g, f[1] / g];
      return (ansFrac[0] === e[0] && ansFrac[1] === e[1]) ? null
        : `simplest: expected ${e[0]}/${e[1]}, got ${ansFrac[0]}/${ansFrac[1]}`;
    }
  }
  if (/greatest|largest|biggest|smallest/i.test(text)) {
    const vals = q.choices.map(c => { const f = parseFrac(c); return f ? f[0] / f[1] : parseFloat(strip(c)); });
    if (vals.every(Number.isFinite)) {
      const want = /smallest/i.test(text) ? Math.min(...vals) : Math.max(...vals);
      return near(vals[q.correct], want) ? null
        : `compare: flagged ${vals[q.correct]}, extreme is ${want}`;
    }
  }
  if (/fraction of the bar is blue/i.test(text)) {
    const on = (q.extra.match(/class="seg fill"/g) || []).length;
    const total = (q.extra.match(/class="seg[ "]/g) || []).length;
    if (total && ansFrac) {
      return near(on / total, ansFrac[0] / ansFrac[1]) ? null
        : `bar model: ${on}/${total} shaded but answer is ${ansFrac[0]}/${ansFrac[1]}`;
    }
  }

  /* --- DEPTH PILOT 2026-09-05: format banks for P3 perimeter, P3 mul/div facts and
     the P4 L-shape. Each stem shape gets its own oracle, re-derived from the RENDERED
     text exactly as a child reads it. These sit above the loose geometry and
     whole-number branches because several of them contain the words "perimeter" or
     a "a x b" fragment that the looser branches below would otherwise claim. --- */

  /* P3 perimeter bank */
  if ((m = text.match(/A rectangle is (\d+) cm long and (\d+) cm wide\. Which calculation gives its perimeter\?$/))) {
    const e = 2 * (Number(m[1]) + Number(m[2]));
    const got = evalExpr(strip(q.answerText).replace(/×/g, 'x'));
    if (got === null) return `perimeter concept: answer "${strip(q.answerText)}" is not an evaluable calculation`;
    return near(e, got) ? null : `perimeter concept: chosen calculation gives ${got}, perimeter is ${e}`;
  }
  if ((m = text.match(/^A rectangle has a perimeter of (\d+) cm and a breadth of (\d+) cm\./))) {
    const e = Number(m[1]) / 2 - Number(m[2]);
    return near(e, ansNum) ? null : `perimeter inverse: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Rectangle A is (\d+) cm by (\d+) cm\. Rectangle B is (\d+) cm by (\d+) cm\. How much longer is the perimeter of A/))) {
    const e = 2 * (Number(m[1]) + Number(m[2])) - 2 * (Number(m[3]) + Number(m[4]));
    if (e <= 0) return `perimeter compare: A is not longer than B (${e})`;
    return near(e, ansNum) ? null : `perimeter compare: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Mei Ling says the perimeter of a rectangle (\d+) cm by (\d+) cm is (\d+) cm\. What did she do wrong\?$/))) {
    const L = Number(m[1]), B = Number(m[2]), claim = Number(m[3]), p = 2 * (L + B);
    if (claim === p) return `perimeter error-spot: the "wrong" claim ${claim} is the true perimeter`;
    const want = claim === L + B ? 'She added only two sides.'
      : claim === L * B ? 'She worked out the area instead.'
      : claim === 2 * L + B ? 'She left out one side.' : null;
    if (want === null) return `perimeter error-spot: claim ${claim} matches no named misconception for ${L}x${B}`;
    return strip(q.answerText) === want ? null
      : `perimeter error-spot: expected "${want}", got "${strip(q.answerText)}"`;
  }
  if ((m = text.match(/(\d+) m long and (\d+) m wide\. The [a-z ]+ costs \$(\d+) per metre/))) {
    const e = 2 * (Number(m[1]) + Number(m[2])) * Number(m[3]);
    return near(e, ansNum) ? null : `fence cost: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^A square garden tile has a perimeter of (\d+) cm\. A bigger square tile has double that perimeter\./))) {
    const e = 2 * Number(m[1]) / 4;
    return near(e, ansNum) ? null : `doubled perimeter: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/area of (\d+) cm.? and a length of (\d+) cm\. What is its perimeter\?$/))) {
    const a = Number(m[1]), L = Number(m[2]);
    if (a % L !== 0) return `perimeter from area: ${a} is not a whole number of ${L}s`;
    const e = 2 * (L + a / L);
    return near(e, ansNum) ? null : `perimeter from area: expected ${e}, got ${ansNum}`;
  }

  /* P3 multiplication / division fact bank */
  if ((m = text.match(/(\d+) [a-z ]+, with (\d+) [a-z ]+\. How many [a-z]+ are there altogether\?$/))) {
    const e = Number(m[1]) * Number(m[2]);
    return near(e, ansNum) ? null : `equal groups: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^You know that (\d+) × (\d+) = (\d+)\. Which division fact belongs to the same fact family\?$/))) {
    const a = Number(m[1]), b = Number(m[2]), p = Number(m[3]);
    if (a * b !== p) return `fact family: the given fact ${a}x${b}=${p} is false`;
    const f = strip(q.answerText).match(/^(\d+) ÷ (\d+) = (\d+)$/);
    if (!f) return `fact family: chosen option "${strip(q.answerText)}" is not a division fact`;
    const ok = Number(f[1]) === p && Number(f[1]) / Number(f[2]) === Number(f[3]) &&
      (Number(f[2]) === a || Number(f[2]) === b);
    return ok ? null : `fact family: "${strip(q.answerText)}" is not in the family of ${a}, ${b}, ${p}`;
  }
  if ((m = text.match(/^Which of these numbers is NOT in the (\d+) times table\?$/))) {
    const a = Number(m[1]);
    const vals = q.choices.map(c => Number(strip(c)));
    if (vals.some(v => !Number.isFinite(v))) return 'not-in-table: a choice is not a number';
    const outs = vals.filter(v => v % a !== 0);
    if (outs.length !== 1) return `not-in-table: ${outs.length} of the four options are not in the ${a} times table`;
    return near(outs[0], ansNum) ? null : `not-in-table: expected ${outs[0]}, got ${ansNum}`;
  }
  if ((m = text.match(/^You know that (\d+) × (\d+) = (\d+)\. Use doubling to work out (\d+) × (\d+)\.$/))) {
    const a = Number(m[1]), b = Number(m[2]), p = Number(m[3]);
    if (a * b !== p) return `doubling: the given fact ${a}x${b}=${p} is false`;
    if (Number(m[4]) !== 2 * a || Number(m[5]) !== b) return 'doubling: the target fact is not the doubled one';
    const e = 2 * p;
    return near(e, ansNum) ? null : `doubling: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/(\d+) [a-z ]+ equally into (\d+) [a-z]+\. How many [a-z ]+ are in (\d+) [a-z]+\?$/))) {
    const total = Number(m[1]), g = Number(m[2]), want = Number(m[3]);
    if (total % g !== 0) return `share then take: ${total} does not divide by ${g}`;
    if (want >= g) return `share then take: asking for ${want} of only ${g} groups`;
    const e = total / g * want;
    return near(e, ansNum) ? null : `share then take: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Ravi says (\d+) ÷ (\d+) = (\d+)\. He checked it by working out (\d+) × (\d+) = (\d+)\./))) {
    const p = Number(m[1]), a = Number(m[2]), claim = Number(m[3]);
    if (p % a !== 0) return `division error-spot: ${p} does not divide by ${a}`;
    if (claim === p / a) return 'division error-spot: the "wrong" claim is the true quotient';
    if (Number(m[4]) !== a || Number(m[5]) !== claim || Number(m[6]) !== a * claim)
      return 'division error-spot: the printed check does not match the claim';
    const e = p / a;
    return near(e, ansNum) ? null : `division error-spot: expected ${e}, got ${ansNum}`;
  }

  /* P4 L-shape bank, described in words */
  if ((m = text.match(/^A rectangular sheet of card is (\d+) cm long and (\d+) cm wide\. A corner piece (\d+) cm by (\d+) cm is cut away/))) {
    const W = Number(m[1]), H = Number(m[2]), a = Number(m[3]), b = Number(m[4]);
    if (a >= W || b >= H) return `L in words: the cut ${a}x${b} does not fit inside ${W}x${H}`;
    const e = 2 * (W + H);
    return near(e, ansNum) ? null : `L in words: expected ${e}, got ${ansNum}`;
  }
  if (/^A rectangular corner is cut out of a rectangle to make an L-shape/.test(text)) {
    return strip(q.answerText) === 'It stays the same.' ? null
      : `L concept: expected "It stays the same.", got "${strip(q.answerText)}"`;
  }
  if ((m = text.match(/^An L-shape is made from a (\d+) cm by (\d+) cm rectangle with a rectangular corner cut out\. The corner cut out is (\d+) cm wide\. The area of the L-shape is (\d+) cm/))) {
    const W = Number(m[1]), H = Number(m[2]), a = Number(m[3]), area = Number(m[4]);
    const gone = W * H - area;
    if (gone <= 0 || gone % a !== 0) return `L inverse: cut area ${gone} is not a whole number of ${a}s`;
    const e = gone / a;
    if (e >= H) return `L inverse: the cut is ${e} cm tall in a ${H} cm rectangle`;
    /* WOUND 3 GATE, described-in-words twin of the rendered-figure cap. */
    if (a * 3 > W * 2) return `L inverse: the cut is ${a}/${W} of the width (cap 2/3)`;
    if (e * 3 > H * 2) return `L inverse: the cut is ${e}/${H} of the height (cap 2/3)`;
    if (2 * (W + H) === area) return `L inverse: coincidence - perimeter and area are both ${area}`;
    return near(e, ansNum) ? null : `L inverse: expected ${e}, got ${ansNum}`;
  }

  /* DEPTH PILOT v2: the corner cut asked as a DIFFERENCE. The answer is 0 and the
     oracle insists on it - if a rewrite ever makes the difference non-zero the
     item's whole point has gone. */
  if ((m = text.match(/^A (\d+) cm by (\d+) cm rectangular tile has a corner piece (\d+) cm by (\d+) cm cut away, leaving an L-shape with right angles at every corner\. How much longer is the perimeter of the whole rectangle than the perimeter of the L-shape\?$/))) {
    const W = Number(m[1]), H = Number(m[2]), a = Number(m[3]), b = Number(m[4]);
    if (a * 3 > W * 2 || b * 3 > H * 2) return `L difference: the cut ${a}x${b} exceeds 2/3 of ${W}x${H}`;
    const rectPer = 2 * (W + H), lPer = (W - a) + b + a + (H - b) + W + H;
    if (rectPer - lPer !== 0) return `L difference: rectangle ${rectPer} vs L ${lPer}, difference is not 0`;
    if (rectPer === W * H - a * b) return `L difference: coincidence - perimeter and area are both ${rectPer}`;
    /* KILL GATE (v3): the key is "0 cm" and nothing more. It used to read
       "0 cm, the perimeters are the same." - the only prose option in the set, a
       format tell a child settles in a second with no geometry at all. */
    return strip(q.answerText) === '0 cm' ? null
      : `L difference: expected the key "0 cm", got "${strip(q.answerText)}"`;
  }

  /* DEPTH PILOT v2: a notch in the MIDDLE of a side, not at a corner. This is the
     one composite in the bank whose perimeter is genuinely NOT 2(W + H): the two
     new sides are added and nothing is taken away, so it grows by twice the depth. */
  if ((m = text.match(/^A rectangular banner is (\d+) cm long and (\d+) cm wide\. A notch (\d+) cm wide and (\d+) cm deep is cut out of the middle of one long side/))) {
    const W = Number(m[1]), H = Number(m[2]), n = Number(m[3]), d = Number(m[4]);
    if (n >= W - 1) return `notch: a ${n} cm notch cannot sit inside a ${W} cm side with a gap at each end`;
    if (d >= H) return `notch: a ${d} cm notch is deeper than the ${H} cm banner`;
    /* WOUND 3 GATE (v3): the figure must stay a notched banner and never become a U,
       and the stem must describe all eight sides so the oracle can walk them. */
    const sp = text.match(/there is (\d+) cm of edge before the notch and (\d+) cm after it, and the banner is still (\d+) cm wide behind the notch/);
    if (!sp) return 'notch: the stem does not print the two edge spans, so the figure is not fully described';
    const s1 = Number(sp[1]), s2 = Number(sp[2]), back = Number(sp[3]);
    if (s1 + n + s2 !== W) return `notch: ${s1} + ${n} + ${s2} != the ${W} cm long side`;
    if (back !== H - d) return `notch: ${back} cm behind the notch != ${H} - ${d}`;
    if (2 * n >= W) return `notch: a ${n} cm notch is half or more of the ${W} cm side`;
    if (2 * d >= H) return `notch: a ${d} cm notch cuts half or more of the ${H} cm width - a U, not a notch`;
    if (d >= Math.min(s1, s2)) return `notch: depth ${d} is not shorter than the shortest adjacent side (${Math.min(s1, s2)})`;
    const e = 2 * (W + H) + 2 * d;
    const walk = s1 + d + n + d + s2 + H + W + H;
    if (walk !== e) return `notch: the eight described sides walk to ${walk}, not ${e}`;
    if (e === W * H - n * d) return `notch: coincidence - perimeter and area are both ${e}`;
    if (e === 2 * (W + H)) return 'notch: the notch left the perimeter unchanged, so it is a corner cut';
    return near(e, ansNum) ? null : `notch perimeter: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^An L-shaped kitchen floor is a (\d+) m by (\d+) m rectangle .* at \$(\d+) per metre/))) {
    const e = 2 * (Number(m[1]) + Number(m[2])) * Number(m[3]);
    return near(e, ansNum) ? null : `skirting cost: expected ${e}, got ${ansNum}`;
  }

  /* --- geometry --- */
  if (/perimeter of this rectangle/i.test(text)) {
    const nums = (extra.match(/(\d+) cm/g) || []).map(s => parseInt(s, 10));
    if (nums.length >= 2) {
      const e = 2 * (nums[0] + nums[1]);
      return near(e, ansNum) ? null : `rect perimeter: expected ${e} from ${nums.join('x')}, got ${ansNum}`;
    }
  }
  if (/area of this rectangle/i.test(text)) {
    const nums = (extra.match(/(\d+) cm/g) || []).map(s => parseInt(s, 10));
    if (nums.length >= 2) {
      const e = nums[0] * nums[1];
      return near(e, ansNum) ? null : `rect area: expected ${e} from ${nums.join('x')}, got ${ansNum}`;
    }
  }
  if ((m = text.match(/A square has sides of (\d+) cm\. What is its (perimeter|area)/))) {
    const s = Number(m[1]);
    const e = m[2] === 'perimeter' ? 4 * s : s * s;
    return near(e, ansNum) ? null : `square ${m[2]}(${s}): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/area of (\d+) cm.*breadth is (\d+) cm.*length/i))) {
    const e = Number(m[1]) / Number(m[2]);
    return near(e, ansNum) ? null : `missing side: expected ${e}, got ${ansNum}`;
  }

  /* --- whole-number arithmetic --- */
  if ((m = text.match(/^([\d.]+) ([×x*]) ([\d.]+) = \?$/))) {
    const e = Number(m[1]) * Number(m[3]);
    return near(e, ansNum) ? null : `mul: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) ÷ ([\d.]+) = \?$/))) {
    const e = Number(m[1]) / Number(m[2]);
    return near(e, ansNum) ? null : `div: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) \+ ([\d.]+) = \?$/))) {
    const e = Number(m[1]) + Number(m[2]);
    return near(e, ansNum) ? null : `add: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) [−-] ([\d.]+) = \?$/))) {
    const e = Number(m[1]) - Number(m[2]);
    return near(e, ansNum) ? null : `sub: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) \+ \? = ([\d.]+)$/))) {
    const e = Number(m[2]) - Number(m[1]);
    return near(e, ansNum) ? null : `missing addend: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) ([×x*]) \? = ([\d.]+)$/))) {
    const e = Number(m[3]) / Number(m[1]);
    return near(e, ansNum) ? null : `missing factor: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/Which number is (greater|smaller|the greatest|the smallest)/i))) {
    const vals = q.choices.map(c => parseFloat(strip(c)));
    if (vals.every(Number.isFinite)) {
      const want = /small/i.test(m[1]) ? Math.min(...vals) : Math.max(...vals);
      return near(vals[q.correct], want) ? null : `compare num: flagged ${vals[q.correct]}, extreme ${want}`;
    }
  }

  /* --- decimals (kept live for the Phase 1 Decimal Bay lane) --- */
  if ((m = text.match(/value of the digit (\d+) in ([\d.]+)/))) {
    const dec = m[2].split('.')[1] || '';
    const idx = dec.indexOf(m[1]);
    if (idx < 0) return 'place-value digit not in decimal part: ' + m[2];
    const e = Number(m[1]) / Math.pow(10, idx + 1);
    return near(e, ansNum) ? null : `place value: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/Round ([\d.]+) to the (nearest whole number|1 decimal place|2 decimal places)/))) {
    const to = m[2].startsWith('nearest whole') ? 0 : (m[2].startsWith('1') ? 1 : 2);
    const f = Math.pow(10, to);
    const e = Math.round(parseFloat(m[1]) * f + 1e-9) / f;
    return near(e, ansNum) ? null : `round(${m[1]},${to}dp): expected ${e}, got ${ansNum}`;
  }
  if (/Write .* as a decimal/.test(text)) {
    const f = parseFrac(q.q);
    if (f) {
      const e = f[0] / f[1];
      return near(e, ansNum) ? null : `frac->dec: expected ${e}, got ${ansNum}`;
    }
  }

  /* --- P5 lane: MC percentage, area of triangle, volume --- */
  if ((m = text.match(/^(\d+)% of (\d+) = \?$/))) {
    const e = Number(m[1]) * Number(m[2]) / 100;
    return near(e, ansNum) ? null : `% of whole: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/costing \$(\d+) has a (\d+)% discount/))) {
    const p = Number(m[1]);
    const e = p - p * Number(m[2]) / 100;
    return near(e, ansNum) ? null : `discount: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/triangle has a base of (\d+) cm and a height of (\d+) cm/))) {
    const e = Number(m[1]) * Number(m[2]) / 2;
    return near(e, ansNum) ? null : `triangle area (MC): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/kite paper (\d+) cm long and (\d+) cm wide in half along a diagonal/))) {
    const e = Number(m[1]) * Number(m[2]) / 2;
    return near(e, ansNum) ? null : `half rectangle: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/A cube has edges of (\d+) cm\. What is its volume\?$/))) {
    const s = Number(m[1]), e = s * s * s;
    return near(e, ansNum) ? null : `cube volume: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/A cuboid measures (\d+) cm by (\d+) cm by (\d+) cm\. What is its volume\?$/))) {
    const e = Number(m[1]) * Number(m[2]) * Number(m[3]);
    return near(e, ansNum) ? null : `cuboid volume: expected ${e}, got ${ansNum}`;
  }

  /* --- P5 wave 2: rate (MC) --- */
  if ((m = text.match(/fills a tank at (\d+) ℓ per minute\. How much water flows in (\d+) minutes\?$/))) {
    const e = Number(m[1]) * Number(m[2]);
    return near(e, ansNum) ? null : `tap total: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/Printer A prints (\d+) pages in (\d+) minutes\. Printer B prints (\d+) pages in (\d+) minutes\. How many more pages/))) {
    const e = Number(m[1]) / Number(m[2]) - Number(m[3]) / Number(m[4]);
    return near(e, ansNum) ? null : `rate compare: expected ${e}, got ${ansNum}`;
  }

  /* --- P5 wave 2: angles. Every configuration is described in words, so the
     oracle re-derives from the rendered stem exactly as a child would read it.
     Ordered most specific first: the two-step vertically-opposite stem shares a
     prefix with the plain vertically-opposite one. --- */
  if ((m = text.match(/One of the four angles formed is (\d+)°\. Angle p is next to that angle on a straight line, and angle q is vertically opposite angle p\./))) {
    const e = 180 - Number(m[1]);
    return near(e, ansNum) ? null : `vert opp two-step: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/One of the four angles formed is (\d+)°\. Angle p is next to it, on the same straight line\./))) {
    const e = 180 - Number(m[1]);
    return near(e, ansNum) ? null : `vert adjacent: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/One of the four angles formed is (\d+)°\. What is the angle vertically opposite it\?$/))) {
    const e = Number(m[1]);
    return near(e, ansNum) ? null : `vert opposite: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Angle a and angle b sit side by side on a straight line, with no gap between them\. Angle a is (\d+)°\./))) {
    const e = 180 - Number(m[1]);
    return near(e, ansNum) ? null : `straight line pair: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Three angles sit side by side on a straight line, with no gaps between them\. Two of them are (\d+)° and (\d+)°\./))) {
    const e = 180 - Number(m[1]) - Number(m[2]);
    return near(e, ansNum) ? null : `straight line trio: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Angle x, a right angle and angle y sit side by side on a straight line, with no gaps between them\. Angle x is (\d+)°\./))) {
    const e = 90 - Number(m[1]);
    return near(e, ansNum) ? null : `right angle on line: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Three angles meet at a point and together they fill the whole turn\. Two of them are (\d+)° and (\d+)°\./))) {
    const e = 360 - Number(m[1]) - Number(m[2]);
    return near(e, ansNum) ? null : `at a point, three: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Four angles meet at a point and together they fill the whole turn\. Three of them are (\d+)°, (\d+)° and (\d+)°\./))) {
    const e = 360 - Number(m[1]) - Number(m[2]) - Number(m[3]);
    return near(e, ansNum) ? null : `at a point, four: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Angles meet at a point and together they fill the whole turn\. One of them is (\d+)°, and the other (\d+) angles are all equal/))) {
    const e = (360 - Number(m[1])) / Number(m[2]);
    return near(e, ansNum) ? null : `at a point, equal share: expected ${e}, got ${ansNum}`;
  }

  /* ===== WAVE 3 lane: P4 angles (naming + measuring) ========================
     Every configuration is described in words, so the oracle re-derives from the
     rendered stem exactly as a child would read it. The naming items have TEXT
     keys, so they are checked against strip(q.answerText), not ansNum.
     These oracles also enforce the P4 SCOPE CLAMPS: no named angle reaches 180,
     and nothing here may lean on a straight-line (180) or point (360) fact. --- */
  if ((m = text.match(/^Two straight arms meet at point (\w)\. One arm runs from \1 to (\w) and the other arm runs from \1 to (\w)\. Which of these is a correct name for the angle between the two arms\?$/))) {
    const [, v, p, r] = m;
    const key = strip(q.answerText);
    if (key !== '∠' + p + v + r && key !== '∠' + r + v + p) return `angle naming: vertex ${v} must be the middle letter, got ${key}`;
    for (const ch of q.choices.map(strip)) {
      if (ch === key) continue;
      if (ch === '∠' + p + v + r || ch === '∠' + r + v + p) return `angle naming: a distractor also names the same angle (${ch})`;
    }
    return null;
  }
  if ((m = text.match(/^An angle is named ∠(\w)(\w)(\w)\. Which of these names the SAME angle\?$/))) {
    const [, p, v, r] = m;
    const key = strip(q.answerText);
    return key === '∠' + r + v + p ? null : `same angle: expected ∠${r}${v}${p}, got ${key}`;
  }
  if ((m = text.match(/^Two straight arms meet at point (\w)\. One arm runs from \1 to (\w) and the other arm runs from \1 to (\w)\. Three of the names below are correct names for that angle\. Which one is WRONG\?$/))) {
    const [, v, p, r] = m;
    const key = strip(q.answerText);
    if (key === '∠' + p + v + r || key === '∠' + r + v + p) return `wrong-name item: key ${key} is actually correct`;
    if (!/^∠\w\w\w$/.test(key)) return `wrong-name item: key is not a three-letter name (${key})`;
    if (key[2] === v) return `wrong-name item: key ${key} still has the vertex in the middle`;
    for (const ch of q.choices.map(strip)) {
      if (ch === key) continue;
      const ok = ch === '∠' + p + v + r || ch === '∠' + r + v + p ||
                 ch === 'the angle marked ∠' + v.toLowerCase() + ' at the point ' + v;
      if (!ok) return `wrong-name item: distractor ${ch} is not a correct name either`;
    }
    return null;
  }
  if ((m = text.match(/^∠\w+ is measured as (\d+)° and ∠\w+ is measured as (\d+)°\. What is the size of the larger of the two angles\?$/))) {
    const e = Math.max(Number(m[1]), Number(m[2]));
    if (e >= 180) return `P4 larger angle: ${e}° is not below 180`;
    return near(e, ansNum) ? null : `P4 larger of two: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^∠(\w+) is measured as (\d+)° and ∠(\w+) is measured as (\d+)°\. How many degrees larger is ∠\3 than ∠\1\?$/))) {
    const e = Number(m[4]) - Number(m[2]);
    if (e <= 0) return `P4 how much larger: the named angle is not the larger one`;
    return near(e, ansNum) ? null : `P4 how much larger: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^∠(\w)(\w)(\w) is measured as (\d+)° and ∠\3\2(\w) is measured as (\d+)°\. The two angles sit side by side at the vertex \2, sharing the arm \2\3 with no gap between them, so together they make ∠\1\2\5\. What is the size of ∠\1\2\5\?$/))) {
    const e = Number(m[4]) + Number(m[6]);
    if (e >= 180) return `P4 adjacent sum: ${e}° reaches 180, a P5 fact wearing a P4 badge`;
    return near(e, ansNum) ? null : `P4 add adjacent: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^∠(\w)(\w)(\w) is measured as (\d+)° and ∠\3\2(\w) is measured as (\d+)°\. They sit side by side at \2, sharing the arm \2\3 with no gap, so together they make ∠\1\2\5\. ∠\w+ is measured as (\d+)°\. How many degrees larger is ∠\1\2\5 than ∠\w+\?$/))) {
    const big = Number(m[4]) + Number(m[6]);
    if (big >= 180) return `P4 two-step diff: the built angle ${big}° reaches 180`;
    const e = big - Number(m[7]);
    return near(e, ansNum) ? null : `P4 two-step diff: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^The arm (\w)(\w) is drawn inside ∠(\w)\1(\w), splitting it into ∠\3\1\2 and ∠\2\1\4 with no gap between them\. ∠\3\1\4 is measured as (\d+)° and ∠\3\1\2 is measured as (\d+)°\. What is the size of ∠\2\1\4\?$/))) {
    const whole = Number(m[5]), part = Number(m[6]);
    if (whole >= 180) return `P4 missing part: the whole angle ${whole}° reaches 180`;
    const e = whole - part;
    return near(e, ansNum) ? null : `P4 missing part: expected ${e}, got ${ansNum}`;
  }

  /* ===== WAVE 3 lane: P5 triangles + four-sided figures =====================
     Described in words, exactly one unknown, oracle re-derives from the rendered
     stem. GEOMETRIC POSSIBILITY is enforced here as well, so a later widening that
     emits an impossible figure fails the harness rather than shipping: every
     triangle's three angles are positive whole numbers, each strictly below 180,
     summing to exactly 180; every quadrilateral angle is strictly below 180. --- */
  const triOk = (list, label) => {
    for (const x of list) {
      if (!Number.isFinite(x) || x <= 0 || !Number.isInteger(x)) return `${label}: angle ${x} is not a positive whole number`;
      if (x >= 180) return `${label}: angle ${x}° is not below 180`;
    }
    const s = list.reduce((a, b) => a + b, 0);
    return s === 180 ? null : `${label}: the three angles sum to ${s}, not 180`;
  };
  if ((m = text.match(/^In triangle (\w)(\w)(\w), ∠\1 = (\d+)° and ∠\2 = (\d+)°\. What is the size of ∠\3\?$/))) {
    const a = Number(m[4]), b = Number(m[5]), e = 180 - a - b;
    const bad = triOk([a, b, e], 'triangle angle sum'); if (bad) return bad;
    return near(e, ansNum) ? null : `triangle third angle: expected ${e}, got ${ansNum}`;
  }
  if (/^Triangle \w+ is an equilateral triangle\. What is the size of ∠\w\?$/.test(text)) {
    return near(60, ansNum) ? null : `equilateral: expected 60, got ${ansNum}`;
  }
  if ((m = text.match(/^In triangle (\w)(\w)(\w), \1\2 = \1\3 and ∠\2 = (\d+)°\. What is the size of ∠\1\?$/))) {
    const b = Number(m[4]), e = 180 - 2 * b;
    const bad = triOk([b, b, e], 'isosceles (base given)'); if (bad) return bad;
    return near(e, ansNum) ? null : `isosceles apex: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^In triangle (\w)(\w)(\w), \1\2 = \1\3 and ∠\1 = (\d+)°\. What is the size of ∠\2\?$/))) {
    const a = Number(m[4]), e = (180 - a) / 2;
    if (!Number.isInteger(e)) return `isosceles (apex given): base angle ${e} is not a whole number`;
    const bad = triOk([a, e, e], 'isosceles (apex given)'); if (bad) return bad;
    return near(e, ansNum) ? null : `isosceles base: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^In triangle (\w)(\w)(\w), ∠\2 is a right angle and ∠\1 = (\d+)°\. What is the size of ∠\3\?$/))) {
    const a = Number(m[4]), e = 90 - a;
    const bad = triOk([90, a, e], 'right-angled triangle'); if (bad) return bad;
    return near(e, ansNum) ? null : `right triangle: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/is a parallelogram, with the four corners in the order \w, \w, \w, \w round the shape\. ∠\w = (\d+)°\. What is the size of ∠\w, the angle at the opposite corner\?$/))) {
    const e = Number(m[1]);
    if (e >= 180) return `parallelogram: given angle ${e}° is not below 180`;
    return near(e, ansNum) ? null : `parallelogram opposite: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/is a parallelogram, with the four corners in the order \w, \w, \w, \w round the shape\. ∠\w = (\d+)°\. What is the size of ∠\w, the angle at the next corner along\?$/))) {
    const a = Number(m[1]), e = 180 - a;
    if (a >= 180 || e <= 0) return `parallelogram: ${a}° cannot sit in a parallelogram`;
    return near(e, ansNum) ? null : `parallelogram adjacent: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/is a rhombus, with the four corners in the order \w, \w, \w, \w round the shape, and all four sides equal\. ∠\w = (\d+)°\. What is the size of ∠\w, the angle at the (opposite corner|next corner along)\?$/))) {
    const a = Number(m[1]), e = m[2] === 'opposite corner' ? a : 180 - a;
    if (a >= 180 || e <= 0) return `rhombus: ${a}° cannot sit in a rhombus`;
    return near(e, ansNum) ? null : `rhombus: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/is a trapezium in which the side (\w)(\w) is parallel to the side (\w)(\w)\. The side \1\3 joins the two parallel sides\. ∠\1 = (\d+)°\. What is the size of ∠\3\?$/))) {
    const a = Number(m[5]), e = 180 - a;
    if (a >= 180 || e <= 0) return `trapezium: ${a}° cannot sit between the parallel sides`;
    return near(e, ansNum) ? null : `trapezium: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^In triangle (\w)(\w)(\w), ∠\1 = (\d+)° and ∠\2 = (\d+)°\. The side \2\3 is extended to the point (\w), so \2, \3 and \6 lie on one straight line\. What is the size of ∠\1\3\6\?$/))) {
    const a = Number(m[4]), b = Number(m[5]), inner = 180 - a - b, e = 180 - inner;
    const bad = triOk([a, b, inner], 'exterior angle (triangle part)'); if (bad) return bad;
    if (e >= 180) return `exterior angle: ${e}° is not below 180`;
    return near(e, ansNum) ? null : `exterior angle: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^In triangle (\w)(\w)(\w), \1\2 = \1\3 and ∠\1 = (\d+)°\. The side \2\3 is extended to the point (\w), so \2, \3 and \5 lie on one straight line\. What is the size of ∠\1\3\5\?$/))) {
    const a = Number(m[4]), base = (180 - a) / 2, e = 180 - base;
    if (!Number.isInteger(base)) return `isosceles on a line: base angle ${base} is not a whole number`;
    const bad = triOk([a, base, base], 'isosceles on a line'); if (bad) return bad;
    if (e >= 180) return `isosceles on a line: ${e}° is not below 180`;
    return near(e, ansNum) ? null : `isosceles on a line: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/is a parallelogram, with the four corners in the order (\w), (\w), (\w), (\w) round the shape\. ∠\1 = (\d+)°\. The side \4\3 is extended to the point (\w), so \4, \3 and \6 lie on one straight line\. What is the size of ∠\2\3\6\?$/))) {
    const a = Number(m[5]), e = 180 - a;
    if (a >= 180 || e <= 0) return `parallelogram on a line: ${a}° cannot sit in a parallelogram`;
    return near(e, ansNum) ? null : `parallelogram on a line: expected ${e}, got ${ansNum}`;
  }
  if (/^Each set below is meant to be the three angles of a triangle\. Which set CANNOT be the three angles of a triangle\?$/.test(text)) {
    const parse = s => strip(s).split(',').map(x => Number(String(x).replace('°', '').trim()));
    let impossible = 0;
    for (const ch of q.choices) {
      const set = parse(ch);
      if (set.length !== 3 || set.some(x => !Number.isInteger(x) || x <= 0 || x >= 180)) return `impossible-triangle: malformed set ${strip(ch)}`;
      const sum = set.reduce((a, b) => a + b, 0);
      const isKey = strip(ch) === strip(q.answerText);
      if (sum !== 180) { impossible++; if (!isKey) return `impossible-triangle: ${strip(ch)} sums to ${sum} but is not the key`; }
      else if (isKey) return `impossible-triangle: the key ${strip(ch)} sums to exactly 180, so it IS a triangle`;
    }
    return impossible === 1 ? null : `impossible-triangle: ${impossible} sets fail the 180 sum, expected exactly 1`;
  }

  /* --- WAVE 3 integration: oracles for the five generators rewritten when the
     angles+shapes refutation wounds were applied. Each re-derives from the NEW
     rendered stem; the pre-rewrite oracles above no longer match those stems. --- */
  if ((m = text.match(/^Two straight arms meet at point (\w)\. One arm runs from \1 to (\w) and the other arm runs from \1 to (\w)\. The angle at \1 is marked \u2220(\w) on the diagram\. Three of the names below are correct names for that angle\. Which one is WRONG\?$/))) {
    const [, v, p2, r, sh] = m;
    if (sh !== v.toLowerCase()) return `wrong-name item: the stem marks \u2220${sh} but the vertex is ${v}`;
    const key = strip(q.answerText);
    if (key === '\u2220' + p2 + v + r || key === '\u2220' + r + v + p2) return `wrong-name item: key ${key} is actually correct`;
    if (!/^\u2220\w\w\w$/.test(key)) return `wrong-name item: key is not a three-letter name (${key})`;
    if (key[2] === v) return `wrong-name item: key ${key} still has the vertex in the middle`;
    for (const ch of q.choices.map(strip)) {
      if (ch === key) continue;
      const ok = ch === '\u2220' + p2 + v + r || ch === '\u2220' + r + v + p2 ||
                 ch === 'the angle marked \u2220' + v.toLowerCase() + ' at the point ' + v;
      if (!ok) return `wrong-name item: distractor ${ch} is not a correct name either`;
    }
    return null;
  }
  if ((m = text.match(/^The arm (\w)(\w) is drawn inside \u2220(\w)\1(\w), splitting it into \u2220\3\1\2 and \u2220\2\1\4 with no gap between them\. \u2220\3\1\4 is measured as (\d+)\u00b0 and \u2220\3\1\2 is measured as (\d+)\u00b0\. How many degrees larger is \u2220\2\1\4 than \u2220\3\1\2\?$/))) {
    const whole = Number(m[5]), part1 = Number(m[6]);
    if (whole >= 180) return `P4 missing part: the whole angle ${whole}\u00b0 reaches 180`;
    const other = whole - part1;
    if (other <= 0) return `P4 missing part: the second part is ${other}\u00b0`;
    const e = other - part1;
    if (e <= 0) return `P4 missing part: "how many degrees larger" but the second part is not larger`;
    return near(e, ansNum) ? null : `P4 missing part compare: expected ${e}, got ${ansNum}`;
  }
  if (/^Triangle \w+ is an equilateral triangle\. What is \u2220\w \+ \u2220\w\?$/.test(text)) {
    return near(120, ansNum) ? null : `equilateral pair: expected 120, got ${ansNum}`;
  }
  if ((m = text.match(/^Triangle (\w)(\w)(\w) is an equilateral triangle\. The arm (\w)(\w) is drawn inside \u2220\4, splitting it into \u2220(\w)\4\5 and the rest, with no gap\. \u2220\6\4\5 is measured as (\d+)\u00b0\. What is the size of the other part of \u2220\4\?$/))) {
    const a = Number(m[7]), e = 60 - a;
    if (e <= 0) return `equilateral part: ${a}\u00b0 does not fit inside a 60\u00b0 angle`;
    return near(e, ansNum) ? null : `equilateral part: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/is a parallelogram, with the four corners in the order (\w), (\w), (\w), (\w) round the shape\. \u2220\1 = (\d+)\u00b0\. The side \4\3 is extended to the point (\w), so \4, \3 and \6 lie on one straight line\. How many degrees larger is \u2220\2\3\6 than \u2220\2\3\4\?$/))) {
    const a = Number(m[5]);
    if (a >= 180) return `parallelogram on a line: ${a}\u00b0 cannot sit in a parallelogram`;
    const onLine = 180 - a;
    if (onLine <= 0 || onLine >= 180) return `parallelogram on a line: ${onLine}\u00b0 is not a valid angle`;
    const e = onLine - a;
    if (e <= 0) return `parallelogram on a line: the straight-line angle is not the larger one`;
    return near(e, ansNum) ? null : `parallelogram on a line compare: expected ${e}, got ${ansNum}`;
  }
  if (/^The four corner angles of a shape are listed in order round the shape\. Which set COULD be the four angles of a rhombus\?$/.test(text)) {
    const parse = t2 => strip(t2).split(',').map(x => Number(String(x).replace('\u00b0', '').trim()));
    const isRhombus = set => set.length === 4 &&
      set.every(x => Number.isInteger(x) && x > 0 && x < 180) &&
      set[0] === set[2] && set[1] === set[3] && set[0] + set[1] === 180;
    let good = 0;
    for (const ch of q.choices) {
      const set = parse(ch);
      const isKey = strip(ch) === strip(q.answerText);
      if (set.length !== 4 || set.some(x => !Number.isFinite(x))) return `which-rhombus: malformed set ${strip(ch)}`;
      if (isRhombus(set)) { good++; if (!isKey) return `which-rhombus: ${strip(ch)} is a valid rhombus but is not the key`; }
      else if (isKey) return `which-rhombus: the key ${strip(ch)} is not a valid rhombus`;
    }
    return good === 1 ? null : `which-rhombus: ${good} valid sets, expected exactly 1`;
  }
  if ((m = text.match(/is a trapezium in which the side (\w)(\w) is parallel to the side (\w)(\w)\. The side \1\3 and the side \2\4 each join the two parallel sides\. \u2220\1 = (\d+)\u00b0 and \u2220\2 = (\d+)\u00b0\. How many degrees larger is \u2220\3 than \u2220\4\?$/))) {
    const a = Number(m[5]), b = Number(m[6]);
    const angD = 180 - a, angC = 180 - b;
    if (a >= 180 || b >= 180 || angD <= 0 || angC <= 0) return `trapezium difference: an angle does not fit between the parallel sides`;
    const e = angD - angC;
    if (e <= 0) return `trapezium difference: the named angle is not the larger one`;
    return near(e, ansNum) ? null : `trapezium difference: expected ${e}, got ${ansNum}`;
  }

  return false; // no oracle matched
}

/* ---------- KILL 3 GATE: the coincidence ban, run on EVERY question ----------
   Refutation 2026-09-05 §3: 5.7% of 8,000 perimeter/area draws printed the same
   number for the figure's perimeter and its area (a square of side 4 is 16 and
   16; gSquarePA 9.8%), and in "which calculation gives the perimeter?" that
   coincidence makes two of four options defensible outright. This check reads
   the rectangle off the RENDERED stem or figure exactly as a child does and
   fails the harness on any coincidence - so the ban cannot silently regress in
   a later edit. It also fails on two options that evaluate to the same number,
   and on a printed option that equals the other quantity for the same figure.
   Returns null when clean (or when no rectangle is nameable in the stem). */
function coincidence(q) {
  const text = strip(q.q), extra = strip(q.extra || '');
  /* Only a plain number (optionally with one unit word) counts as numeric here.
     A calculation option ("6 + 3 + 6 + 3") or a rendered mixed number would
     otherwise parseFloat down to its first digit and collide spuriously. */
  /* SWEEP 2026-09-15: a leading "$" is part of how a money option is WRITTEN, not
     a reason to stop checking it. Without this the duplicate-option half of this
     gate skipped every money MC in the game. */
  const PURE = /^\$?\d+(\.\d+)?( (cm²|cm|m²|m|km|kg|g|ℓ|ml|min|s|°|%))?$/;
  const rawOpts = (q.choices || []).map(strip);
  const numeric = rawOpts.length > 0 && rawOpts.every(c => PURE.test(c));
  const opts = rawOpts.map(c => parseFloat(String(c).replace(/^\$/, '')));
  let m, L = null, B = null, where = '';
  const sq = s => { L = s; B = s; };

  if (/class="rectBox"/.test(String(q.extra))) {
    const nums = (extra.match(/(\d+) cm/g) || []).map(s => parseInt(s, 10));
    if (nums.length >= 2) { L = nums[0]; B = nums[1]; where = 'rendered rectangle'; }
  }
  if (L === null && (m = text.match(/A square has sides of (\d+) cm/))) { sq(Number(m[1])); where = 'square'; }
  if (L === null && (m = text.match(/perimeter of the [a-z]+ is (\d+) cm\. What is the length of one side/))) { sq(Number(m[1]) / 4); where = 'square from perimeter'; }
  if (L === null && (m = text.match(/has an area of (\d+) cm.\. What is the length of one side/))) { sq(Math.sqrt(Number(m[1]))); where = 'square from area'; }
  if (L === null && (m = text.match(/A rectangle is (\d+) cm long and (\d+) cm wide/))) { L = Number(m[1]); B = Number(m[2]); where = 'rectangle in words'; }
  if (L === null && (m = text.match(/rectangle (\d+) cm by (\d+) cm/))) { L = Number(m[1]); B = Number(m[2]); where = 'rectangle in words'; }
  if (L === null && (m = text.match(/Rectangle A is (\d+) cm by (\d+) cm\. Rectangle B is (\d+) cm by (\d+) cm/))) {
    for (const [x, y] of [[Number(m[1]), Number(m[2])], [Number(m[3]), Number(m[4])]])
      if (2 * (x + y) === x * y) return `coincidence: compared rectangle ${x} by ${y} prints perimeter and area both ${x * y}`;
  }
  if (L === null && (m = text.match(/(\d+) m long and (\d+) m wide/))) { L = Number(m[1]); B = Number(m[2]); where = 'plot in words'; }
  if (L === null && (m = text.match(/an area of (\d+) cm.\. Its breadth is (\d+) cm/))) { L = Number(m[1]) / Number(m[2]); B = Number(m[2]); where = 'rectangle from area'; }
  if (L === null && (m = text.match(/an area of (\d+) cm. and (?:its|a) length is (\d+) cm/))) { L = Number(m[2]); B = Number(m[1]) / Number(m[2]); where = 'rectangle from area'; }
  if (L === null && (m = text.match(/area of (\d+) cm. and a length of (\d+) cm/))) { L = Number(m[2]); B = Number(m[1]) / Number(m[2]); where = 'frame from area'; }
  if (L === null && (m = text.match(/perimeter of the [a-z]+ is (\d+) cm and its length is (\d+) cm/))) { L = Number(m[2]); B = Number(m[1]) / 2 - Number(m[2]); where = 'rectangle from perimeter'; }
  if (L === null && (m = text.match(/is (\d+) cm long and (\d+) cm wide\. A corner piece/))) { L = Number(m[1]); B = Number(m[2]); where = 'card before the cut'; }

  if (L !== null && Number.isFinite(L) && Number.isFinite(B) && L > 0 && B > 0) {
    const per = 2 * (L + B), area = L * B;
    if (per === area) return `coincidence: ${where} (${L} by ${B}) prints perimeter and area both ${per}`;
    /* an option that IS the other quantity is only a defect when the two are
       different questions with the same printed number, which the line above
       already rules out; what remains to catch is a stem asking for one of them
       while a SECOND option also evaluates to it. */
    if (numeric) {
      const want = /perimeter/i.test(text) ? per : (/area/i.test(text) ? area : null);
      if (want !== null) {
        const hits = opts.filter(v => Math.abs(v - want) < 1e-9).length;
        if (hits > 1) return `coincidence: ${hits} options equal the asked ${want}`;
      }
    }
  }
  if (numeric) {
    const s = new Set(opts.map(v => Math.round(v * 1e6)));
    if (s.size !== opts.length) return `coincidence: two options are the same number (${opts.join(', ')})`;
  }
  return null;
}

/* ---------- DEPTH PILOT v3 gates: the three pilot files only ----------------
   PILOT_TOPICS are the files the depth pilot rewrote (p3-area-perimeter.js,
   p3-times-tables.js, p4-area-perimeter.js). Two rules apply to them and, for
   now, only to them - the rest of the bank has not been through the pilot pass.

   RULE 1, FORMAT TELL (second-refutation KILL): no MC item may have exactly one
   option whose FORM differs from the other three. gLPerimDiff shipped a key
   reading "0 cm, the perimeters are the same." against three distractors reading
   "12 cm" - in 2,000 of 2,000 draws the key was the only prose option and the only
   one over four characters, so a child settled it in a second with no geometry.
   Form here is coarse on purpose: a bare number, a number with a unit, an
   arithmetic expression, or prose. A 2-2 or 3-1-by-design split of expressions is
   fine; what is banned is the single odd one out that points at the answer.

   RULE 2, "long" >= "wide": a stem that prints "X ... long and Y ... wide" must
   print X >= Y. Was flipped in 1,710 of 8,000 draws across three generators. */
/* SWEEP 2026-09-15: `decimals` joins the pilot files - the format-tell rule and
   the "long" >= "wide" rule are contract rules, not geometry rules. */
const PILOT_TOPICS = new Set(['geometry', 'tables', 'p4area', 'decimals']);
const optForm = s => {
  const t = strip(s);
  if (/^\$?\d+(\.\d+)?$/.test(t)) return 'number';
  if (/^\$?\d+(\.\d+)?\s*(cm²|cm2|cm|mm|km|m|kg|g|ml|ℓ|h|min|s)$/.test(t)) return 'number+unit';
  /* U+2212 MINUS SIGN is what the topic files print; without it "$2.20 - $1.60"
     read as prose and a calculation bank tallied 3-1 against itself. */
  if (/^[\d\s+×x*÷/\-−=().$]+$/.test(t)) return 'expression';
  return 'prose';
};
function pilotGates(q, topic) {
  if (!PILOT_TOPICS.has(topic)) return null;
  const opts = q.choices || [];
  if (opts.length === 4) {
    const forms = opts.map(optForm);
    const tally = new Map();
    for (const f of forms) tally.set(f, (tally.get(f) || 0) + 1);
    if (tally.size === 2) {
      const odd = [...tally.entries()].find(([, c]) => c === 1);
      if (odd) {
        const bulk = [...tally.entries()].find(([, c]) => c === 3);
        return `format tell: one option is ${odd[0]} while the other three are ${bulk[0]} (${opts.map(strip).join(' | ')})`;
      }
    }
  }
  const all = strip(q.q) + ' ' + strip(q.extra || '');
  let mm;
  const re = /(\d+)\s*(cm|m|km|mm)\s+long and\s+(\d+)\s*(cm|m|km|mm)\s+wide/g;
  while ((mm = re.exec(all))) {
    if (Number(mm[1]) < Number(mm[3]))
      return `"long" prints shorter than "wide": ${mm[1]} ${mm[2]} long and ${mm[3]} ${mm[4]} wide`;
  }
  return null;
}

/* ---------- collect every registered generator ---------- */
const GENS = []; // { topic, skill, level, name, fn }
for (const [tid, t] of Object.entries(TOPICS)) {
  const seen = new Set();
  for (const lvl of [1, 2, 3]) {
    for (const [fn, skill] of t.pools[lvl]) {
      const name = fn.name || '(anonymous)';
      const key = tid + '.' + name;
      if (seen.has(key)) continue;
      seen.add(key);
      GENS.push({ topic: tid, skill, level: lvl, name, fn });
    }
  }
}

/* ---------- run ---------- */
let failures = 0;
const DISTINCT_FLOOR = Math.min(8, N);
const rows = [];

for (const g of GENS) {
  let err = null, badQ = null, matched = 0;
  const distinct = new Set();
  for (let i = 0; i < N; i++) {
    let q;
    try { q = g.fn(); } catch (e) { err = 'threw: ' + e.message; break; }
    const markup = checkNoMarkup(q);
    if (markup) { err = markup; badQ = q; break; }
    const drawn = drawFigure(q);
    if (drawn) { err = drawn; badQ = q; break; }
    const shape = checkShape(q);
    if (shape) { err = shape; badQ = q; break; }
    const unitErr = checkTypedUnit(q);
    if (unitErr) { err = unitErr; badQ = q; break; }
    const coin = coincidence(q);
    if (coin) { err = coin; badQ = q; break; }
    const pilot = pilotGates(q, g.topic);
    if (pilot) { err = pilot; badQ = q; break; }
    const dec = decGates(q, g.topic);
    if (dec) { err = dec; badQ = q; break; }
    distinct.add(qKey(q));
    const o = oracle(q, g.topic);
    if (o === false) continue;
    matched++;
    if (o) { err = o; badQ = q; break; }
  }
  if (!err && distinct.size < DISTINCT_FLOOR) {
    err = `sample space collapsed: only ${distinct.size} distinct questions in ${N} draws`;
  }
  const cov = Math.round((matched / N) * 100);
  rows.push({ topic: g.topic, name: g.name, skill: g.skill, n: N, distinct: distinct.size, cov, err });
  if (err) {
    failures++;
    if (badQ) console.error(`   sample: ${JSON.stringify({ q: strip(badQ.q), extra: strip(badQ.extra || ''), choices: (badQ.choices || []).map(strip), correct: badQ.correct, answerText: strip(badQ.answerText), answer: badQ.answer })}`);
  }
}

/* ---------- wiring smoke: buildSetFor for every registered topic ---------- */
const setRows = [];
for (const tid of Object.keys(TOPICS)) {
  let ok = true, note = '';
  for (const lvl of [1, 2, 3]) {
    const set = MQI.buildSetFor(tid, 30);
    if (!set[lvl] || set[lvl].length < 30) { ok = false; note = `L${lvl} only ${set[lvl] ? set[lvl].length : 0}/30`; break; }
    /* draw every figure spec before keying: a set's identity is the picture too */
    for (const q of set[lvl]) {
      const m = checkNoMarkup(q) || drawFigure(q);
      if (m) { ok = false; note = `L${lvl} ${m}`; break; }
    }
    if (!ok) break;
    const keys = set[lvl].map(qKey);
    if (new Set(keys).size !== keys.length) { ok = false; note = `L${lvl} duplicate questions inside one set`; break; }
    for (const q of set[lvl]) { const e = checkShape(q); if (e) { ok = false; note = `L${lvl} ${e}`; break; } }
    if (!ok) break;
  }
  setRows.push({ tid, ok, note });
  if (!ok) failures++;
}

/* ---------- pool skill-coverage gate (Wave 3 blocker, Dress Rehearsal leg 2) ------
   js/topics/p3-area-perimeter.js pool 1 tagged BOTH of its generators 'peri', so the
   feed's skill round-robin had a single skill to cycle and served six consecutive
   perimeter items. That is a structural fault in the data, invisible to a per-generator
   harness. Rule: any topic declaring >= 2 skills must expose >= 2 DISTINCT skill tags
   in every one of its three pools. --- */
const poolSkillRows = [];
for (const tid of Object.keys(TOPICS)) {
  const t = TOPICS[tid];
  const nSkills = Object.keys(t.skills || {}).length;
  if (nSkills < 2) { poolSkillRows.push({ tid, ok: true, note: `only ${nSkills} skill declared - exempt` }); continue; }
  for (const lvl of [1, 2, 3]) {
    const tags = [...new Set((t.pools[lvl] || []).map(pr => pr[1]))];
    const ok = tags.length >= 2;
    poolSkillRows.push({ tid, ok, note: ok
      ? `pool ${lvl}: ${tags.length} skills [${tags.join(', ')}]`
      : `pool ${lvl} exposes only ${tags.length} skill [${tags.join(', ')}] but the topic declares ${nSkills} - the feed cannot interleave skills here` });
    if (!ok) failures++;
  }
}

/* ---------- MAGNITUDE-RANK GATE (refutation 2026-09-15, WOUND 1) ------------------
   The lane's own cheap-strategy table measured LENGTH and DECIMAL PLACES - longest
   4.7%, shortest 4.3%, most dp 2.3%, fewest dp 1.7% - and concluded the format-bank
   contract worked. It never measured MAGNITUDE. "Always pick the second biggest
   number" won 38.5% of the decimals bank against a 25% floor and 100% of SIX
   generators outright, because each of those authored three named distractors that
   bracketed the key the same way on every draw, for ever: two below and one above.
   Session-weighted that is a +7-point edge for doing no decimals at all.

   A per-item rule cannot see this: every individual item is fine. It is a property
   of a GENERATOR across draws, so this is a second pass, and it is deliberately
   written as a standalone helper - decRankOf() for one item, decRankScan() for a
   list of { name, fn } - so the integrator lifts it into the shared harness without
   touching the decimals-specific code around it.

   EXEMPTION, declared not inferred: an item that stamps q.optionSet is offering the
   numbers THEMSELVES for comparison (gDecCompare, gDecCmpMixed). "Pick the biggest"
   is not a cheap strategy there, it is the question. Everything else is gated. --- */
const RANK_LABELS = ['largest', '2nd largest', '3rd largest', 'smallest'];
const RANK_DRAWS = Number(process.env.RANK_SAMPLES || 2000);
const RANK_CEILING = 0.45;
const RANK_FLOOR = 200;                 /* below this many measurable draws, no verdict */
/* how many options are strictly bigger than the key: 0 = key largest, 3 = smallest.
   -1 when the item is not rank-measurable (not four plain numbers, or a tie). */
function decRankOf(q) {
  const raw = (q.choices || []).map(strip);
  if (raw.length !== 4 || !Number.isInteger(q.correct)) return -1;
  /* a fraction strips to its two numbers run together - fr(3, 10) reads "310" and
     DEC_PURE happily matches it. Magnitude rank is meaningless on a fraction set,
     so they are dropped BEFORE the test rather than measured as nonsense. */
  if ((q.choices || []).some(c => /class="frac"/.test(String(c)))) return -1;
  if (!raw.every(c => DEC_PURE.test(c))) return -1;
  const vals = raw.map(decOf);
  if (vals.some(v => !v)) return -1;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (DEQ(vals[i], vals[j])) return -1;
  const key = vals[q.correct];
  let above = 0;
  for (const v of vals) if (DCMP(v, key) > 0) above++;
  return above;
}
function decRankScan(gens, draws) {
  const out = [], bank = [0, 0, 0, 0], gatedTally = [0, 0, 0, 0];
  for (const g of gens) {
    const hist = [0, 0, 0, 0];
    let n = 0, exempt = false, first = true;
    for (let i = 0; i < draws; i++) {
      let q;
      try { q = g.fn(); } catch (e) { continue; }
      if (first) { exempt = !!(q.optionSet || q.decCompare); first = false; }
      const r = decRankOf(q);
      if (r < 0) continue;
      hist[r]++; n++; bank[r]++;
      if (!exempt) gatedTally[r]++;
    }
    const top = n ? Math.max(...hist) : 0;
    out.push({ name: g.name, n, hist, exempt, worst: n ? top / n : 0, rank: hist.indexOf(top) });
  }
  const best = arr => {
    const t = arr.reduce((a, b) => a + b, 0);
    return { share: t ? Math.max(...arr) / t : 0, rank: arr.indexOf(Math.max(...arr)), n: t };
  };
  return { rows: out, bank: best(bank), gated: best(gatedTally) };
}

const rankRows = [];
let rankReport = null;
{
  const decGens = GENS.filter(g => g.topic === 'decimals').map(g => ({ name: g.name, fn: g.fn }));
  rankReport = decRankScan(decGens, RANK_DRAWS);
  for (const r of rankReport.rows) {
    if (r.exempt || r.n < RANK_FLOOR) { rankRows.push({ ...r, ok: true }); continue; }
    const ok = r.worst <= RANK_CEILING;
    rankRows.push({ ...r, ok });
    if (!ok) failures++;
  }
}

/* ---------- PROSE OPTION GATE (refutation SECOND PASS 2026-09-15, KILLS 1-2) ------
   FOR THE INTEGRATOR: this is the decimals sibling of the p2 option-feature gate
   (P2_FEATURES / P2_FEATURE_CEILING in the p2 lane's gen-sanity) and of the
   fractions lane's RULE 8. Same shape, same vocabulary, one axis further on:

     - p2's gate reads coarse FEATURES off every option of a draw and fails a
       generator when the key is the only option carrying a feature's value in 90%
       or more of the sample. That arm is reproduced here verbatim in structure,
       with a decimals feature list and a TIGHTER ceiling (60%), because the
       decimals banks are prose-heavy and 90% let three settles through.
     - fractions' RULE 8 is the same idea applied per draw inside one oracle: the
       words the stem uses must be repeated by at least two options, so the item
       cannot be answered by matching vocabulary.
     - what NEITHER expresses, and what both of tonight's kills lived in, is the
       key's SENTENCE SHAPE ACROSS DRAWS. The MAGNITUDE-RANK gate measures a
       numeric key's rank among numeric options; RULE D6 compares masked tails
       WITHIN one item; pilotGates counts option forms. gDecRoundError's key was
       the only option naming a direction and the only one carrying "but" on
       40,000 / 40,000 draws, and gDecCmpError shipped three never-correct frames
       on every draw, one of them the identical sentence every time. Both are
       properties of a GENERATOR, not of an item, so both are sampled here.

   THE THREE ARMS, all on draws whose four options are NOT four bare numbers
   (those are the rank gate's business):

     FEATURE    no single feature value may be unique to the key on 60% or more of
                the sample. Features are deliberately coarse - the kind of thing a
                ten-year-old spots without doing any mathematics.
     FRAME      mask the names and every number. (a) No masked frame that ships on
                50% or more of draws may be the key on NONE of them - a
                never-correct frame is a free elimination that never moves. (b) The
                key must wear at least THREE distinct masked frames, unless the
                generator ships fewer than three frames in total, in which case the
                frame carries no information at all (gDecBetween's four options are
                all "# and #", and that is exactly right).
     LENGTH     on draws where the four options span more than two characters, the
                key's length rank - competition rank, broken by the shipped order,
                so exactly equal lengths land uniformly - may not exceed 45%. Only
                sentence options are measured: the length of a NUMBER is its
                magnitude, which the rank gate already owns, and "3 + 0.1 + 0.09"
                is not a sentence a child eyeballs for length. --- */
const DEC_FEATURES = [
  { label: 'the rounding or comparison direction it states',
    of: o => [...new Set((o.match(/\b(up|down|greater|less|more|fewer|smaller|bigger|left|right|further|nearer)\b/gi) || [])
                .map(s => s.toLowerCase()))].sort().join(',') || 'none' },
  { label: 'the connective it hangs on',
    of: o => [...new Set((o.match(/\b(but|instead|because|so|then|although|however)\b/gi) || [])
                .map(s => s.toLowerCase()))].sort().join(',') || 'none' },
  { label: 'its form (bare number, prose, or which operator it uses)',
    of: o => {
      if (/^\$?\d+(\.\d+)?( [a-zℓ]+)?$/.test(o)) return 'number';
      const ops = [...new Set(o.match(/[+×÷−]/g) || [])].sort().join('');
      return ops ? 'op:' + ops : 'prose';
    } },
  { label: 'the biggest number printed in the stem that it names again',
    of: (o, stemNums) => {
      const hit = (o.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(n => stemNums.has(n));
      return hit.length ? String(Math.max(...hit)) : 'none';
    } },
  { label: 'its length to the nearest four characters',
    of: o => String(Math.round(o.length / 4)) }
];
const DEC_FEATURE_CEILING = 0.60;
const DEC_FRAME_SHIP = 0.50;            /* a frame this common that is never the key */
const DEC_KEY_FRAMES = 3;               /* ... and the key may not wear one sentence */
const DEC_LEN_CEILING = 0.45;
const DEC_LEN_SPREAD = 2;               /* under this many characters, length is not a tell */
const DEC_MODAL_CEILING = 0.45;         /* ... and no key may be the same answer this often */
const DEC_PROSE_FLOOR = 200;            /* below this many measurable draws, no verdict */
const DEC_NAME_MASK = /\b(Mei Ling|Siti|Ravi|Kumar|Wei Jie|Nurul|Jun Hao|Priya|Ah Seng|Aisyah)\b/g;
const decFrame = s => s.replace(DEC_NAME_MASK, '@').replace(/\d+(?:\.\d+)?/g, '#').toLowerCase();
const decIsSentence = o => (o.match(/[A-Za-z]{2,}/g) || []).length >= 3;
/* one generator, sampled. Returns every arm's tally so the report can print it. */
function decProseScan(gens, draws) {
  const out = [];
  for (const g of gens) {
    const hit = DEC_FEATURES.map(() => 0), sample = DEC_FEATURES.map(() => null);
    const shipped = new Map(), keyFrames = new Map(), keyVals = new Map();
    const lenRank = [0, 0, 0, 0];
    let n = 0, lenN = 0, allN = 0;
    for (let i = 0; i < draws; i++) {
      let q;
      try { q = g.fn(); } catch (e) { continue; }
      const opts = (q.choices || []).map(strip);
      if (opts.length !== 4 || !Number.isInteger(q.correct)) continue;
      /* THE MODAL-KEY ARM runs on EVERY draw, prose or not. gDecRoundSum's key was
         "5 kg" on 48.7% of its draws - four distinct answers in the whole
         generator - and MAGNITUDE-RANK is blind to it by construction: it asks
         where the key sits among its own OPTIONS, never how often the key is the
         same NUMBER. "Always answer 5 kg" beat the rank gate's own ceiling on the
         axis the rank gate does not measure. */
      allN++;
      keyVals.set(opts[q.correct], (keyVals.get(opts[q.correct]) || 0) + 1);
      if (opts.every(o => /^\$?\d+(\.\d+)?( [a-zℓ]+)?$/.test(o))) continue;
      n++;
      const key = opts[q.correct];
      const stemNums = new Set(((strip(q.q) + ' ' + strip(q.extra || '')).match(/\d+(?:\.\d+)?/g) || []).map(Number));
      for (let fi = 0; fi < DEC_FEATURES.length; fi++) {
        const kv = DEC_FEATURES[fi].of(key, stemNums);
        if (opts.filter(o => DEC_FEATURES[fi].of(o, stemNums) === kv).length === 1) {
          hit[fi]++;
          sample[fi] = { kv, opts: opts.slice() };
        }
      }
      const frames = opts.map(decFrame);
      for (const f of new Set(frames)) shipped.set(f, (shipped.get(f) || 0) + 1);
      keyFrames.set(frames[q.correct], (keyFrames.get(frames[q.correct]) || 0) + 1);
      if (opts.every(decIsSentence)) {
        const lens = opts.map(o => o.length);
        const spread = Math.max(...lens) - Math.min(...lens);
        if (spread > DEC_LEN_SPREAD) {
          let r = 0;
          for (let j = 0; j < 4; j++) if (lens[j] > lens[q.correct] || (lens[j] === lens[q.correct] && j < q.correct)) r++;
          lenRank[r]++; lenN++;
        }
      }
    }
    const dead = [...shipped.entries()].filter(([f, c]) => c / (n || 1) >= DEC_FRAME_SHIP && !keyFrames.has(f));
    const modal = [...keyVals.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
    out.push({ name: g.name, n, hit, sample, lenRank, lenN,
      frames: shipped.size, keyFrames: keyFrames.size, dead,
      allN, modalText: modal[0], modalShare: allN ? modal[1] / allN : 0 });
  }
  return out;
}
const proseRows = [];
{
  const decGens = GENS.filter(g => g.topic === 'decimals').map(g => ({ name: g.name, fn: g.fn }));
  for (const r of decProseScan(decGens, RANK_DRAWS)) {
    let note = null;
    if (r.allN >= DEC_PROSE_FLOOR && r.modalShare > DEC_MODAL_CEILING) {
      note = `modal key: the answer is "${r.modalText}" on ${(100 * r.modalShare).toFixed(1)}% of ${r.allN} draws, over the ` +
        `${(100 * DEC_MODAL_CEILING).toFixed(0)}% ceiling - "always answer the same thing" then beats chance, on the value ` +
        `axis the magnitude-rank gate does not measure`;
    }
    if (note) { proseRows.push({ ...r, ok: false, note }); failures++; continue; }
    if (r.n < DEC_PROSE_FLOOR) { proseRows.push({ ...r, ok: true, note: 'not enough prose draws to judge' }); continue; }
    for (let fi = 0; fi < DEC_FEATURES.length; fi++) {
      if (r.hit[fi] / r.n < DEC_FEATURE_CEILING) continue;
      const s = r.sample[fi];
      note = `prose option feature: the key is the ONLY option with ${DEC_FEATURES[fi].label} in ` +
        `${r.hit[fi]} of ${r.n} draws (${(100 * r.hit[fi] / r.n).toFixed(1)}%), at or over the ` +
        `${(100 * DEC_FEATURE_CEILING).toFixed(0)}% ceiling - a child picks the key out by that alone, with no ` +
        `mathematics (key value "${s.kv}", options: ${s.opts.join(' | ')})`;
      break;
    }
    if (!note && r.dead.length) {
      note = `never-correct frame: "${r.dead[0][0]}" ships on ${(100 * r.dead[0][1] / r.n).toFixed(1)}% of draws and is ` +
        `the key on NONE of them - a free elimination that never moves`;
    }
    if (!note && r.frames >= DEC_KEY_FRAMES && r.keyFrames < DEC_KEY_FRAMES) {
      note = `the key wears ${r.keyFrames} masked sentence${r.keyFrames === 1 ? '' : 's'} across ${r.n} draws while the ` +
        `generator ships ${r.frames} - a prose key may not wear the same sentence every time`;
    }
    if (!note && r.lenN >= DEC_PROSE_FLOOR) {
      const worst = Math.max(...r.lenRank), at = r.lenRank.indexOf(worst);
      if (worst / r.lenN > DEC_LEN_CEILING) {
        note = `prose length rank: the key is the ${RANK_LABELS[at].replace('largest', 'longest').replace('smallest', 'shortest')} ` +
          `option on ${worst} of ${r.lenN} draws (${(100 * worst / r.lenN).toFixed(1)}%), over the ` +
          `${(100 * DEC_LEN_CEILING).toFixed(0)}% ceiling - "neither the longest nor the shortest" then beats chance`;
      }
    }
    proseRows.push({ ...r, ok: !note, note });
    if (note) failures++;
  }
}

/* ---------- ROUND-ERROR DEFENSIBILITY + OPTION-LIST SCAN (third-pass KILL) --------
   Two measurements the third pass asked for by name, on the generator it killed,
   at 20,000 draws of its own - printed on every run so the numbers are in the gate
   output and not only in a note.

   (a) DEFENSIBILITY. Every option re-derived against the rendered stem; exactly one
       may survive. At c9d26fb two did, on 40,000 of 40,000 draws, and no tell gate
       could see it because there was no tell - the defect was that a distractor was
       TRUE. The killed generator is rebuilt below and scanned by the same rule as a
       negative control, where it must report 2.
   (b) THE OPTION LIST WITH THE STEM UNREAD. Nine rules a ten-year-old can apply to
       four option strings and nothing else. A rule counts only when it picks ONE
       option; it settles only when that option is the key. The two the third pass
       measured are in the list by name ("the digit alone on its side of 5", which
       was 100.00%, and "the smallest of the four digits", which was 60.56%), and
       both must now come in under 40%. --------------------------------------- */
const ROUND_DRAWS = Number(process.env.ROUND_SAMPLES || 20000);
const ROUND_CEILING = 0.40;
/* the single digit an option names, as opposed to a number it prints: not part of a
   longer numeral and not either side of a decimal point, but a full stop right
   after it is just the end of the sentence ("... the third digit, 6.") */
const decLoneDigit = o => { const mm = String(o).match(/(?<![\d.])\d(?!\.?\d)/); return mm ? Number(mm[0]) : null; };
const decAllNums = o => (String(o).match(/\d+(?:\.\d+)?/g) || []).map(Number);
const decWords = o => String(o).toLowerCase().replace(/[^a-z0-9.]+/g, ' ').split(' ').filter(Boolean);
function decUniqueBy(opts, score, want) {
  const vs = opts.map(score);
  if (vs.some(v => v === null || v === undefined || Number.isNaN(v))) return -1;
  const best = want === 'max' ? Math.max(...vs) : Math.min(...vs);
  const hits = [];
  vs.forEach((v, i) => { if (v === best) hits.push(i); });
  return hits.length === 1 ? hits[0] : -1;
}
const DEC_OPT_RULES = [
  { name: 'pick the longest option', of: o => decUniqueBy(o, s => s.length, 'max') },
  { name: 'pick the shortest option', of: o => decUniqueBy(o, s => s.length, 'min') },
  { name: 'pick the smallest of the four digits', of: o => decUniqueBy(o, decLoneDigit, 'min') },
  { name: 'pick the largest of the four digits', of: o => decUniqueBy(o, decLoneDigit, 'max') },
  { name: 'pick the digit alone on its side of 5', of: o => {
      const ds = o.map(decLoneDigit);
      if (ds.some(d => d === null)) return -1;
      const hi = ds.map(d => d >= 5), up = hi.filter(Boolean).length;
      if (up === 1) return hi.indexOf(true);
      if (up === 3) return hi.indexOf(false);
      return -1;
    } },
  { name: 'pick the option whose direction word agrees with its own digit', of: o => {
      const hits = [];
      o.forEach((s, i) => {
        const d = decLoneDigit(s), up = /\bup\b/.test(s), down = /\bdown\b/.test(s);
        if (d === null || up === down) return;
        if ((up && d >= 5) || (down && d <= 4)) hits.push(i);
      });
      return hits.length === 1 ? hits[0] : -1;
    } },
  { name: 'pick the option with a word no other option uses', of: o => {
      const sets = o.map(s => new Set(decWords(s))), hits = [];
      sets.forEach((s, i) => { for (const w of s) if (sets.every((t, j) => j === i || !t.has(w))) { hits.push(i); return; } });
      return hits.length === 1 ? hits[0] : -1;
    } },
  { name: 'pick the option printing the smallest number',
    of: o => decUniqueBy(o, s => { const v = decAllNums(s); return v.length ? Math.min(...v) : null; }, 'min') },
  { name: 'pick the option printing the largest number',
    of: o => decUniqueBy(o, s => { const v = decAllNums(s); return v.length ? Math.max(...v) : null; }, 'max') }
];
function decRoundScan(fn, draws) {
  const settle = DEC_OPT_RULES.map(() => 0), fires = DEC_OPT_RULES.map(() => 0);
  const live = new Map();
  let n = 0, unparsed = 0;
  for (let i = 0; i < draws; i++) {
    let q;
    try { q = fn(); } catch (e) { continue; }
    if (!q || !Array.isArray(q.choices) || q.choices.length !== 4 || !Number.isInteger(q.correct)) continue;
    n++;
    const opts = q.choices.map(strip);
    for (let r = 0; r < DEC_OPT_RULES.length; r++) {
      const at = DEC_OPT_RULES[r].of(opts);
      if (at < 0) continue;
      fires[r]++;
      if (at === q.correct) settle[r]++;
    }
    const f = decRoundDiagnosis(strip(q.q));
    if (!f) { unparsed++; continue; }
    const verdicts = opts.map(o => decRoundDefensible(f, o));
    if (verdicts.some(x => x === null)) { unparsed++; continue; }
    const c = verdicts.filter(Boolean).length;
    live.set(c, (live.get(c) || 0) + 1);
  }
  const best = settle.map((s, i) => ({ name: DEC_OPT_RULES[i].name, settle: n ? s / n : 0, fires: n ? fires[i] / n : 0 }))
    .sort((a, b) => b.settle - a.settle)[0];
  const smallest = { name: DEC_OPT_RULES[2].name, settle: n ? settle[2] / n : 0, fires: n ? fires[2] / n : 0 };
  const lone = { name: DEC_OPT_RULES[4].name, settle: n ? settle[4] / n : 0, fires: n ? fires[4] / n : 0 };
  return { n, unparsed, live, best, smallest, lone };
}
/* gDecRoundError as it shipped at c9d26fb, rebuilt here so the kill is a LIVE
   negative control: the same draw predicate, the same four options, scanned by the
   same defensibility rule, which must find two defensible answers on every draw. */
function ctlV3RoundError() {
  const shuffle4 = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  for (let guard = 0; guard < 900; guard++) {
    const wlen = 1 + Math.floor(Math.random() * 2), dp = 4 - wlen;
    const to = Math.floor(Math.random() * 2), ci = wlen + to;
    if (ci > 3 || to >= dp) continue;
    const digits = shuffle4([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
    const dc = digits[ci];
    const val = DV(digits.reduce((a, d) => a * 10 + d, 0), dp);
    const truth = DROUND(val, to), up = dc < 5;
    const said = DV(truth.n + (up ? 1 : -1), to);
    if (said.n <= 0 || truth.n <= 0 || DEQ(said, truth)) continue;
    if (to > 0 && (said.n % 10 === 0 || truth.n % 10 === 0)) continue;
    const just = [];
    for (let i = 0; i < 4; i++) if (i !== ci && (up ? digits[i] >= 5 : digits[i] <= 4)) just.push(i);
    if (just.length !== 1) continue;
    if (said.dp === 0 && said.n < 10 && digits.indexOf(said.n) !== -1) continue;
    const dir = up ? 'up' : 'down';
    const all = [0, 1, 2, 3].map(i => `Siti rounded ${dir} after looking at the ${DEC_ORD4[i]} digit, ${digits[i]}.`);
    const key = all[just[0]];
    shuffle4(all);
    return { q: `Siti rounds <b>${DTXT(val)}</b> to <b>${DEC_ROUND_PHRASE[to]}</b> and says the answer is <b>${DTXT(said)}</b>. ` +
                `<b>Which digit did Siti look at?</b>`,
             extra: '', choices: all, correct: all.indexOf(key), answerText: key, explain: 'A negative control.' };
  }
  return null;
}
let roundScan = null, roundCtl = null;
{
  const g = GENS.find(x => x.topic === 'decimals' && x.name === 'gDecRoundError');
  if (g) {
    roundScan = decRoundScan(g.fn, ROUND_DRAWS);
    roundCtl = decRoundScan(ctlV3RoundError, 2000);
    const notOne = [...roundScan.live.entries()].filter(([c]) => c !== 1).reduce((a, [, k]) => a + k, 0);
    if (roundScan.unparsed || notOne) failures++;
    if (roundScan.best.settle >= ROUND_CEILING || roundScan.smallest.settle >= ROUND_CEILING) failures++;
    /* the control has to come back red, or the rule above is measuring nothing */
    const ctlTwo = (roundCtl.live.get(2) || 0) === roundCtl.n;
    if (!ctlTwo) failures++;
    roundCtl.two = ctlTwo;
  }
}

/* ---------- STEM-OPTION COUPLING GATE (refutation FOURTH PASS 2026-09-16) --------
   FOR THE INTEGRATOR: this is the arm the fourth pass named as a whole missing
   AXIS, and it is written as a standalone helper - decCouplingScan() over a list of
   { name, fn } - so it lifts into the shared harness without the decimals code
   round it. Every other arm in every lane looks at ONE side of an item:

     MAGNITUDE-RANK        where the key sits among its own OPTIONS
     PROSE-OPTION GATE     which features the key alone carries, among its OPTIONS
     RULE D1 / D6          decimal places and masked tails, among its OPTIONS
     RULE D5               one number the STEM declares wrong
     the per-item oracles  the STEM's premise and the key

   Nothing measured the STEM AND THE OPTIONS TOGETHER, and all three of the fourth
   pass's worst findings lived exactly there:

     gDecRoundError  the stem's rounding phrase fixed the answer's decimal places,
                     so two options died with no arithmetic (100% of draws); the
                     digit standing next to the one the stem printed killed a third.
                     Together: 79.14% settled, 100% right.
     gDecMulConcept  the key was the only option naming two different money amounts
                     from the stem (mode 1) and the only one shaped "a stem price
                     shared into a count" (mode 2). 66.83% settled, 100% right.
     gDecDivWhole    the must-candidate carried the KEY's whole-number part and the
                     STEM's own digits after the point, so "of the two sharing a
                     whole part, take the one that is not the stem's digits" settled
                     100.00% of draws with no division done.

   HOW IT WORKS. For every draw, each option is scored against a small family of
   COARSE relations - the kind a ten-year-old sees without doing any mathematics -
   to the rendered stem and to the other options. Two arms then run:

     PAIR ARM        every relation, both ways round ("the options that have it",
                     "the options that do not"), alone and in pairs. A rule KEEPS
                     the options that satisfy it; it SETTLES when exactly one option
                     survives. A generator fails when any such rule settles 60% or
                     more of its draws and is right 90% or more of the times it
                     settles. Pairs matter: on gDecRoundError each half alone left
                     two options and settled 0.0%, and the harness therefore read
                     zero for three passes.
     FEATURE ARM     coarse CATEGORICAL values (the operand shape, which of the
                     stem's prices an option names, the depth it ends on). Scored
                     the way the prose gate's feature arm is: the share of draws on
                     which the KEY is the only option carrying its own value. A
                     value every option differs on carries no information at all -
                     "the odd one out" does not exist - so a feature is only counted
                     on draws where it PARTITIONS the four.

   PER STEM SHAPE. Both arms are scored inside each stem shape as well as over the
   whole generator, because a tell that lives in one mode of three is invisible at a
   bank-wide ceiling and is 100% to the child in front of it - which is exactly how
   gDecMulConcept read 33.8% on the prose gate while being settled outright on
   two-thirds of its draws. The shape key is the sequence of numeric-token CLASSES
   the stem prints plus its rounding phrase: coarse on purpose, so it is invariant
   across the nouns and names a generator rotates and each mode has enough draws in
   it to judge. --------------------------------------------------------------- */
const CPL_CEILING = 0.60;               /* settles this share of a shape's draws ... */
const CPL_ACC = 0.90;                   /* ... and is right this often when it does */
const CPL_SHAPE_FLOOR = 200;            /* below this many draws a shape is not judged */
const cplNums = c => (String(c).match(/\d+(?:\.\d+)?/g) || []);
const cplWhole = t => String(t).split('.')[0];
const cplFrac = t => { const i = String(t).indexOf('.'); return i < 0 ? null : String(t).slice(i + 1); };
const cplDp = t => { const f = cplFrac(t); return f === null ? 0 : f.length; };
const cplMoney = c => String(c).match(/\$\d+(?:\.\d\d)?/g) || [];
const cplShape = c => String(c).replace(/\$\d+(?:\.\d\d)?/g, 'M').replace(/\d+(?:\.\d+)?/g, 'C').replace(/[^MC+×÷−-]/g, '');
const cplOperands = c => cplShape(c).replace(/[^MC]/g, '');
const cplOperator = c => { const mm = String(c).match(/[+×÷−]/g); return mm ? [...new Set(mm)].sort().join('') : null; };
/* a single digit an option NAMES, as opposed to a number it prints */
const cplLone = c => [...String(c).matchAll(/(?<![\d.])(\d)(?![\d.])/g)].map(x => Number(x[1]));
/* the BARE COUNTS an option carries - a whole number with no money sign and no
   decimal point, which is what a child reads as "how many", not "how much" */
const cplCounts = c => [...String(c).matchAll(/(?<![$\d.])\d+(?![\d.])/g)].map(x => x[0]);
/* everything the rendered stem offers an option to match itself against */
function cplStem(q) {
  const t = strip(q.q) + ' ' + strip(q.extra || '');
  /* the rounding phrase prints a lone "1" or "2" of its own ("1 decimal place");
     those are not digits the stem NAMES, so they are cut before the digit scan */
  const bare = t.replace(/\b[12] decimal places?\b/g, ' ');
  const numerals = cplNums(t);
  const ph = t.match(/(the nearest whole number|1 decimal place|2 decimal places)/);
  const named = cplLone(bare);
  const adj = new Set();
  for (const nu of numerals) {
    const ds = nu.replace('.', '').split('').map(Number);
    for (let i = 0; i < ds.length; i++) if (named.indexOf(ds[i]) !== -1) {
      if (i > 0) adj.add(ds[i - 1]);
      if (i < ds.length - 1) adj.add(ds[i + 1]);
    }
  }
  return { text: t, numerals, set: new Set(numerals), named: new Set(named),
    roundTo: ph ? DEC_ROUND_TO[ph[1]] : null,
    fracs: new Set(numerals.map(cplFrac).filter(x => x !== null)),
    wholes: new Set(numerals.map(cplWhole)), dps: new Set(numerals.map(cplDp)),
    money: new Set(cplMoney(t)), adj,
    digits: new Set(numerals.join('').replace(/\./g, '').split('').map(Number)) };
}
const CPL_PREDS = [
  { k: 'repeats a number printed in the stem', of: (o, st) => cplNums(o).some(v => st.set.has(v)) },
  { k: 'repeats the largest number printed in the stem', of: (o, st) => {
      if (!st.numerals.length) return false;
      const mx = Math.max(...st.numerals.map(Number));
      return cplNums(o).some(v => Number(v) === mx); } },
  { k: "its digits after the point are a stem number's", of: (o, st) => {
      const v = cplNums(o); if (!v.length) return false;
      return v.some(x => { const f = cplFrac(x); return f !== null && st.fracs.has(f); }); } },
  { k: "its whole-number part is a stem number's", of: (o, st) => {
      const v = cplNums(o); if (!v.length) return false;
      return v.some(x => st.wholes.has(cplWhole(x))); } },
  { k: "its decimal places equal the stem's rounding phrase", of: (o, st) => {
      if (st.roundTo === null) return false;
      const v = cplNums(o); if (!v.length) return false;
      return cplDp(v[v.length - 1]) === st.roundTo; } },
  { k: "its decimal places equal a stem number's", of: (o, st) => {
      const v = cplNums(o); if (!v.length) return false;
      return st.dps.has(cplDp(v[v.length - 1])); } },
  { k: 'it names a digit sitting beside a digit the stem names', of: (o, st) =>
      cplLone(o).some(d => st.adj.has(d)) },
  { k: 'it names a digit the stem prints', of: (o, st) => cplLone(o).some(d => st.digits.has(d)) },
  { k: 'it names two different money amounts from the stem', of: (o, st) => {
      const mm = cplMoney(o).filter(x => st.money.has(x));
      return mm.length >= 2 && new Set(mm).size >= 2; } },
  { k: 'its first operand is a money amount from the stem', of: (o, st) => {
      const sh = cplShape(o); return sh.length > 1 && sh[0] === 'M' && st.money.size > 0; } },
  { k: 'its last operand is a bare count', of: o => { const sh = cplShape(o); return sh.length > 1 && sh[sh.length - 1] === 'C'; } },
  /* and the option-to-option half of the same axis, which is where gDecDivWhole's
     "the two options sharing a whole-number part" route lived */
  /* these two read "the whole-number part of an option" and "the digits after the
     point of an option", which only mean anything when the option IS a number. On
     a calculation like "$1.25 + $3.50" the last token is an OPERAND, and matching
     operands across options is a relation no child reads - so bare-number option
     sets only, which is where gDecDivWhole's route lived. */
  { k: 'it shares its whole-number part with another option', of: (o, st, all) => {
      if (!all.every(x => DEC_PURE.test(x))) return false;
      const v = cplNums(o); if (!v.length) return false;
      const w = cplWhole(v[0]);
      return all.filter(x => { const u = cplNums(x); return u.length && cplWhole(u[0]) === w; }).length > 1; } },
  { k: 'it shares its digits after the point with another option', of: (o, st, all) => {
      if (!all.every(x => DEC_PURE.test(x))) return false;
      const v = cplNums(o); const f = v.length ? cplFrac(v[0]) : null;
      if (f === null) return false;
      return all.filter(x => { const u = cplNums(x); return u.length && cplFrac(u[0]) === f; }).length > 1; } },
  { k: 'its operand shape is shared with another option', of: (o, st, all) => {
      const sh = cplOperands(o); if (sh.length < 2) return false;
      return all.filter(x => cplOperands(x) === sh).length > 1; } },
  /* ---- the SIX relations the fifth pass found the gate blind to (W3) ------------
     Each one is named here with the finding it was built from, so a later pass can
     tell what the arm is for. Four of them settled a live generator outright:

       repeats the SMALLEST stem number        the v5 gDecMulConcept kill, mode 0 -
                                               the gate had "the largest" and not
                                               its mirror, and the demand was always
                                               about the cheaper of two prices.
       its last digit is a digit the stem
         prints                                the v5 gDecDigitValue kill, half of
                                               it: "of the options at the commonest
                                               depth, take the one ending in the
                                               named digit", 100.00% at 100%.
       its decimal depth is the commonest
         on the row                            the other half of the same kill, and
                                               the first option-to-option relation
                                               here that is about FORMAT rather than
                                               about a numeral's parts.
       a bare count it names also appears
         in another option                     the whole of the v5 gDecMulConcept
                                               mode-2 kill: the first box's count
                                               was printed three times on the row and
                                               the second box's once.
       its digit string is a proper prefix
         of a stem number's                    gDecRound's "nearest whole number"
                                               shape, 56.75% at 100%.
       its digit multiset is a stem
         number's                              gDecHowMany asked for the number's own
                                               last place on half its draws, and the
                                               key was then the stem's digits with
                                               the point rubbed out. 100% at 100%. */
  { k: 'repeats the smallest number printed in the stem', of: (o, st) => {
      if (!st.numerals.length) return false;
      const mn = Math.min(...st.numerals.map(Number));
      return cplNums(o).some(v => Number(v) === mn); } },
  /* these four read a NUMERAL's own shape - its last digit, its depth, its digits -
     so like the two option-to-option relations above they mean nothing on a row of
     calculations or of prose, where the last token is an operand or a word. Bare-
     number option sets only, which is where all four of the findings lived. */
  { k: 'its last digit is the digit the stem names', of: (o, st, all) => {
      if (!all.every(x => DEC_PURE.test(x))) return false;
      const v = cplNums(o); if (!v.length || !st.named.size) return false;
      const t = v[v.length - 1].replace('.', '');
      return st.named.has(Number(t[t.length - 1])); } },
  { k: 'its decimal depth is the commonest on the row', of: (o, st, all) => {
      if (!all.every(x => DEC_PURE.test(x))) return false;
      const dpOf = c => { const v = cplNums(c); return v.length ? cplDp(v[v.length - 1]) : null; };
      const mine = dpOf(o); if (mine === null) return false;
      const tally = new Map();
      for (const c of all) { const d = dpOf(c); if (d !== null) tally.set(d, (tally.get(d) || 0) + 1); }
      let best = -1, bestN = 0, tie = false;
      for (const [d, k2] of tally) { if (k2 > bestN) { best = d; bestN = k2; tie = false; } else if (k2 === bestN) tie = true; }
      return !tie && bestN > 1 && mine === best; } },
  { k: 'a bare count it names also appears in another option', of: (o, st, all) => {
      const mine = cplCounts(o); if (!mine.length) return false;
      return all.some(x => x !== o && cplCounts(x).some(v => mine.indexOf(v) >= 0)); } },
  { k: "its digit string is a proper prefix of a stem number's", of: (o, st, all) => {
      if (!all.every(x => DEC_PURE.test(x))) return false;
      const v = cplNums(o); if (!v.length) return false;
      return v.some(x => { const s = x.replace('.', '');
        return st.numerals.some(u => { const t = u.replace('.', ''); return t.length > s.length && t.indexOf(s) === 0; }); }); } },
  { k: "its digit multiset is a stem number's", of: (o, st, all) => {
      if (!all.every(x => DEC_PURE.test(x))) return false;
      const v = cplNums(o); if (!v.length) return false;
      const sorted = s => s.replace('.', '').split('').sort().join('');
      return v.some(x => st.numerals.some(u => sorted(u) === sorted(x))); } },
  /* ---- the relation the SIXTH pass found the gate blind to (THE KILL) -----------
     The gate scored a numeral's DIGITS against the stem and a numeral's PARTS
     against another option, and a point move changes both parts at once: "3.7" and
     "0.37" share neither a whole part ("3" against "0") nor a fractional part ("7"
     against "37"). The whole DIGIT STRING across two options was the missing
     corner, and it is where every point-placement slip in this file lives. Paired
     with "its decimal depth is the commonest on the row" it settled seven
     generators on 75-94% of their draws at 100.000% accuracy - "two of these are
     the same digits with the point in a different place; take the one written to as
     many decimal places as another number on the row" - while every shipped
     relation read 18-39%. Bare-number option sets only, the same restriction the
     other option-to-option relations carry: matching digit strings across two
     CALCULATIONS is a relation no child reads. */
  { k: 'it shares its digit string with another option', of: (o, st, all) => {
      if (!all.every(x => DEC_PURE.test(x))) return false;
      const bare = c => { const v = cplNums(c); if (!v.length) return null;
        return v[v.length - 1].replace('.', '').replace(/^0+(?=\d)/, ''); };
      const mine = bare(o); if (mine === null) return false;
      return all.filter(x => bare(x) === mine).length > 1; } }
];
const CPL_FEATS = [
  { k: 'the operand-and-operator shape it is written in', of: o => { const sh = cplShape(o); return sh.length > 1 ? sh : null; } },
  { k: "which of the stem's money amounts it names", of: (o, st) => st.money.size ? cplMoney(o).filter(v => st.money.has(v)).sort().join(',') : null },
  { k: "which of the stem's numbers it repeats", of: (o, st) => st.set.size ? cplNums(o).filter(v => st.set.has(v)).sort().join(',') : null },
  { k: 'the decimal places of the number it ends on', of: o => { const v = cplNums(o); return v.length ? String(cplDp(v[v.length - 1])) : null; } },
  { k: 'the operator it is written with', of: o => cplOperator(o) },
  { k: 'the lone digits it names', of: o => { const d = cplLone(o); return d.length ? d.slice().sort().join(',') : null; } }
];
const CPL_POP = new Uint8Array(16);
for (let i = 0; i < 16; i++) CPL_POP[i] = (i & 1) + ((i >> 1) & 1) + ((i >> 2) & 1) + ((i >> 3) & 1);
const cplFrame = t => {
  const toks = [...String(t).matchAll(/\$?\d+(?:\.\d+)?/g)].map(x => x[0]);
  const cls = toks.map(v => v[0] === '$' ? 'M' : (v.indexOf('.') >= 0 ? 'D' : 'C')).join('');
  const ph = String(t).match(/(the nearest whole number|1 decimal place|2 decimal places)/);
  return cls + (ph ? '|' + ph[1] : '');
};
const cplLabel = i => (i % 2 ? 'NOT ' : '') + CPL_PREDS[i >> 1].k;
const cplRule = r => r.feat !== undefined
  ? `the key is the ONLY option with its value of ${CPL_FEATS[r.feat].k}`
  : (r.a === r.b ? `"${cplLabel(r.a)}"` : `"${cplLabel(r.a)}" AND "${cplLabel(r.b)}"`);
function decCouplingScan(gens, draws) {
  const P = CPL_PREDS.length, S = 2 * P, F = CPL_FEATS.length;
  const out = [];
  for (const g of gens) {
    const mk = () => ({ n: 0, fires: new Int32Array(S * S), right: new Int32Array(S * S), feat: new Int32Array(F) });
    const bank = mk(), groups = new Map();
    for (let i = 0; i < draws; i++) {
      let q;
      try { q = g.fn(); } catch (e) { continue; }
      const opts = (q.choices || []).map(strip);
      if (opts.length !== 4 || !Number.isInteger(q.correct)) continue;
      const st = cplStem(q);
      const fr = cplFrame(st.text);
      let grp = groups.get(fr);
      if (!grp) { grp = mk(); groups.set(fr, grp); }
      bank.n++; grp.n++;
      for (let f = 0; f < F; f++) {
        const vals = opts.map(o => CPL_FEATS[f].of(o, st));
        if (vals.some(v => v === null)) continue;
        if (new Set(vals).size >= 4) continue;
        if (vals.filter(v => v === vals[q.correct]).length === 1) { bank.feat[f]++; grp.feat[f]++; }
      }
      const masks = new Int32Array(S);
      for (let p = 0; p < P; p++) {
        let mk2 = 0;
        for (let j = 0; j < 4; j++) if (CPL_PREDS[p].of(opts[j], st, opts)) mk2 |= (1 << j);
        masks[2 * p] = mk2; masks[2 * p + 1] = (~mk2) & 15;
      }
      const kb = 1 << q.correct;
      for (let a = 0; a < S; a++) for (let b = a; b < S; b++) {
        const mm = masks[a] & masks[b];
        if (CPL_POP[mm] !== 1) continue;
        const idx = a * S + b;
        bank.fires[idx]++; grp.fires[idx]++;
        if (mm === kb) { bank.right[idx]++; grp.right[idx]++; }
      }
    }
    const best = t => {
      if (!t.n) return null;
      let o = null;
      for (let f = 0; f < F; f++) {
        const settle = t.feat[f] / t.n;
        if (!o || settle > o.settle) o = { feat: f, settle, acc: 1 };
      }
      for (let a = 0; a < S; a++) for (let b = a; b < S; b++) {
        const idx = a * S + b, fr2 = t.fires[idx];
        if (!fr2) continue;
        const acc = t.right[idx] / fr2, settle = fr2 / t.n;
        if (acc < CPL_ACC) continue;
        if (!o || settle > o.settle) o = { a, b, settle, acc };
      }
      return o;
    };
    let worst = best(bank), at = '(whole bank)';
    for (const [fr, grp] of groups) {
      if (grp.n < CPL_SHAPE_FLOOR) continue;
      const w = best(grp);
      if (w && (!worst || w.settle > worst.settle)) { worst = w; at = fr; }
    }
    out.push({ name: g.name, n: bank.n, shapes: groups.size, worst, at,
      ok: !(worst && worst.settle >= CPL_CEILING && worst.acc >= CPL_ACC) });
  }
  return out;
}

/* gDecRoundError and gDecMulConcept AS THEY SHIPPED AT 7ec7919, rebuilt here so the
   two routes the fourth pass killed are LIVE negative controls: this gate has to
   find each of them, or it is measuring nothing. Both were green on every other arm
   in this harness on the day they were killed. */
function ctlV4RoundError() {
  const rand = n => Math.floor(Math.random() * n);
  const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  for (let guard = 0; guard < 900; guard++) {
    const wlen = 1 + rand(2), dp = 4 - wlen, to = rand(dp), ci = wlen + to;
    if (ci > 3) continue;
    const digits = sh([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
    const dc = digits[ci];
    const v = DV(digits.reduce((a, d) => a * 10 + d, 0), dp);
    const cut = TEN(dp - to), base = Math.floor(v.n / cut);
    const truth = DV(base + (dc >= 5 ? 1 : 0), to);
    const xs = [];
    for (let i = 0; i < 4; i++) if (i !== ci && (i === ci - 1 || i > ci) && (digits[i] >= 5) !== (dc >= 5)) xs.push(i);
    if (!xs.length) continue;
    const xi = xs[rand(xs.length)];
    const said = DV(base + (digits[xi] >= 5 ? 1 : 0), to);
    let ys = [ci - 1, 3].filter(i => i >= 0 && i !== ci && i !== xi);
    if (!ys.length) ys = [0, 1, 2, 3].filter(i => i !== ci && i !== xi);
    const yi = ys[rand(ys.length)];
    /* the v4 wrong answer: rounded to the place NEXT DOOR, so it is written to a
       different number of decimal places than the stem's rounding phrase implies */
    const other = DROUND(v, to === 0 ? 1 : to - 1);
    if (truth.n <= 0 || said.n <= 0 || other.n <= 0) continue;
    if (DEQ(said, truth) || DEQ(other, truth) || DEQ(other, said)) continue;
    if (to > 0 && (truth.n % 10 === 0 || said.n % 10 === 0)) continue;
    if (other.dp > 0 && other.n % 10 === 0) continue;
    const opt = (d, r) => `Siti should have looked at the digit ${d}, and the answer is ${DTXT(r)}.`;
    const key = opt(dc, truth);
    const all = sh([key, opt(dc, other), opt(digits[yi], truth), opt(digits[yi], other)]);
    return { q: `Siti rounds <b>${DTXT(v)}</b> to <b>${DEC_ROUND_PHRASE[to]}</b>. Siti looks at the ` +
                `<b>${digits[xi]}</b>, says that ${digits[xi]} is ${digits[xi] >= 5 ? '5 or more' : '4 or less'}, ` +
                `rounds ${digits[xi] >= 5 ? 'up' : 'down'}, and gives the answer <b>${DTXT(said)}</b>. ` +
                `<b>Which digit should Siti have looked at, and what is the correct answer?</b>`,
             extra: '', choices: all, correct: all.indexOf(key), answerText: key, explain: 'A negative control.' };
  }
  return null;
}
function ctlV4MulConcept() {
  const rand = n => Math.floor(Math.random() * n);
  const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const M = c => '$' + DTXT(DV(c, 2));
  const XS = [105, 115, 120, 125, 135, 140, 145, 150, 160, 175, 180, 195];
  const YS = [210, 220, 240, 250, 265, 280, 295, 310, 325, 350, 375, 420];
  const x = XS[rand(XS.length)], y = YS[rand(YS.length)], n = 3 + rand(7), total = n * x;
  const mode = rand(3);
  let stem, key, wrongs;
  if (mode === 0) {
    stem = `At the school bookshop a pen costs <b>${M(x)}</b> and a ruler costs <b>${M(y)}</b>. <b>Which calculation</b> gives the cost of <b>${n} pens</b>?`;
    key = `${n} × ${M(x)}`;
    wrongs = [`${n} × ${M(y)}`, `${M(x)} + ${M(y)}`, `${M(x)} + ${M(x)}`];
  } else if (mode === 1) {
    /* the killed mode: the key is the ONLY option naming two different prices */
    stem = `At the school bookshop a pen costs <b>${M(x)}</b> and a ruler costs <b>${M(y)}</b>. <b>Which calculation</b> gives the cost of <b>one of each</b>?`;
    key = `${M(x)} + ${M(y)}`;
    wrongs = [`${M(y)} + ${M(y)}`, `${n} × ${M(x)}`, `${n} × ${M(y)}`];
  } else {
    /* the killed mode: the key is the ONLY option shaped "money shared into a count" */
    stem = `At the school bookshop a box of <b>${n} pens</b> costs <b>${M(total)}</b>, and a ruler costs <b>${M(y)}</b>. <b>Which calculation</b> gives the cost of <b>one pen</b>?`;
    key = `${M(total)} ÷ ${n}`;
    wrongs = [`${n} ÷ ${M(total)}`, `${n} × ${M(y)}`, `${M(total)} + ${M(y)}`];
  }
  const all = sh([key].concat(wrongs));
  return { q: stem, extra: '', choices: all, correct: all.indexOf(key), answerText: key, explain: 'A negative control.' };
}

/* gDecMulConcept and gDecDigitValue AS THEY SHIPPED AT 8cf212b, for the same reason:
   the fifth pass killed both on relations this gate did not score, and the six added
   above are the fix. If these two do not go red the arm is still blind. */
function ctlV5MulConcept() {
  const rand = n => Math.floor(Math.random() * n);
  const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const M = c => '$' + DTXT(DV(c, 2));
  const XS = [105, 115, 120, 125, 135, 140, 145, 150, 160, 175, 180, 195];
  const YS = [210, 220, 240, 250, 265, 280, 295, 310, 325, 350, 375, 420];
  for (let guard = 0; guard < 900; guard++) {
    const x = XS[rand(XS.length)], y = YS[rand(YS.length)], n = 3 + rand(7);
    const m = 3 + rand(7), z = XS[rand(XS.length)], z2 = YS[rand(YS.length)];
    if (new Set([n * x, n * y, x + y, y + z2, x + x, n * (n * x)]).size !== 6) continue;
    if (m === n || z === x || m * z === n * x || z2 === x || z2 === y) continue;
    const total = n * x, other = m * z, mode = rand(3);
    let stem, key, wrongs;
    if (mode === 0) {
      stem = `At the school bookshop a pen costs <b>${M(x)}</b> and a ruler costs <b>${M(y)}</b>. <b>Which calculation</b> gives the cost of <b>${n} pens</b>?`;
      key = `${n} × ${M(x)}`;
      wrongs = [`${n} × ${M(y)}`, `${M(x)} + ${M(y)}`, `${M(x)} + ${M(x)}`];
    } else if (mode === 1) {
      stem = `At the school bookshop a pen costs <b>${M(x)}</b>, a ruler costs <b>${M(y)}</b> and an eraser costs <b>${M(z2)}</b>. <b>Which calculation</b> gives the cost of <b>one pen and one ruler</b>?`;
      key = `${M(x)} + ${M(y)}`;
      wrongs = [`${M(y)} + ${M(z2)}`, `${n} × ${M(x)}`, `${n} × ${M(y)}`];
    } else {
      stem = `At the school bookshop a box of <b>${n} pens</b> costs <b>${M(total)}</b>, and a box of <b>${m} rulers</b> costs <b>${M(other)}</b>. <b>Which calculation</b> gives the cost of <b>one pen</b>?`;
      key = `${M(total)} ÷ ${n}`;
      wrongs = [`${M(other)} ÷ ${m}`, `${n} × ${M(total)}`, `${n} × ${M(other)}`];
    }
    const all = sh([key].concat(wrongs));
    return { q: stem, extra: '', choices: all, correct: all.indexOf(key), answerText: key, explain: 'A negative control.' };
  }
  return null;
}
function ctlV5DigitValue() {
  const rand = n => Math.floor(Math.random() * n);
  const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const nat = d => { let n = d.n, dp = d.dp; while (dp > 0 && n % 10 === 0) { n /= 10; dp--; } return DV(n, dp); };
  const dp = 1 + rand(3);
  const ds = sh([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, dp + 1);
  const whole = ds[0], dec = ds.slice(1), place = 1 + rand(dp), d = dec[place - 1];
  const key = DV(d, place);
  const opts = [key, nat(DV(d * 10, place)), DV(whole, place),
                dp > 1 ? DV(dec[place % dp], place) : DV(d, Math.min(3, place + 1))].map(DTXT);
  const all = sh(opts.slice());
  return { q: `What is the value of the digit <b>${d}</b> in <b>${whole}.${dec.join('')}</b>?`,
           extra: '', choices: all, correct: all.indexOf(opts[0]), answerText: opts[0],
           explain: 'A negative control.' };
}

/* ---- the SIXTH pass's KILL, rebuilt exactly as the two worst banks shipped at
   5a5fb3b: the v6 candidate lists and the v6 rank picker - a spread rank and RULE
   D1's single preference, with NOTHING steering the point-placement twin. Both
   were green on every arm in this file on the day they were killed, so if the
   digit-string relation above does not turn both red, it is measuring nothing. */
function v6Rand(n) { return Math.floor(Math.random() * n); }
function v6Sh(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = v6Rand(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const v6Ri = (a, b) => a + v6Rand(b - a + 1);
function v6RankPick(pool, cmp, dpOf, keyDp) {
  const musts = pool.filter(c => c.must), rest = pool.filter(c => !c.must);
  const need = 3 - musts.length;
  const above = rest.filter(c => cmp(c) > 0), below = rest.filter(c => cmp(c) < 0);
  const hi = Math.min(need, above.length), lo = Math.max(0, need - below.length);
  if (lo > hi) return null;
  let fallback = null;
  for (let t = 0; t < 30; t++) {
    const a = v6Ri(lo, hi);
    const sel = musts.concat(v6Sh(above).slice(0, a), v6Sh(below).slice(0, need - a));
    if (sel.length !== 3) continue;
    if (!fallback) fallback = sel;
    if (keyDp == null || sel.some(c => dpOf(c) === keyDp)) return sel;
  }
  return fallback;
}
function v6McDec(stem, key, cands, unit) {
  const pool = [];
  for (const c of cands) {
    if (!c || !Number.isFinite(c.n) || c.n <= 0) continue;
    if (DEQ(c, key) || pool.some(k => DEQ(k, c))) continue;
    pool.push(c);
  }
  let kept = v6RankPick(pool, c => DCMP(c, key), c => c.dp, key.dp) || pool.slice(0, 3);
  let t = 1;
  while (kept.length < 3 && t < 90) {
    for (const cand of [DV(key.n + t, key.dp), DV(key.n - t, key.dp)]) {
      if (kept.length >= 3) break;
      if (cand.n <= 0 || DEQ(cand, key) || kept.some(k => DEQ(k, cand))) continue;
      kept = kept.concat([cand]);
    }
    t++;
  }
  const u = unit ? ' ' + unit : '';
  const keyStr = DTXT(key) + u;
  const all = v6Sh([keyStr].concat(kept.slice(0, 3).map(c => DTXT(c) + u)));
  return { q: stem, extra: '', choices: all, correct: all.indexOf(keyStr), answerText: keyStr,
           explain: 'A negative control.' };
}
function ctlV6AddSub() {
  const dwDiff = (a, b, dp) => {
    let out = 0, mul = 1, x = a, y = b;
    for (let i = 0; i <= dp; i++) {
      const da = i < dp ? x % 10 : x, db = i < dp ? y % 10 : y;
      out += Math.abs(da - db) * mul;
      if (i < dp) { x = Math.floor(x / 10); y = Math.floor(y / 10); mul *= 10; }
    }
    return out;
  };
  const dp = v6Ri(1, 2), scale = TEN(dp), addMode = Math.random() < 0.5;
  let a = 0, b = 0, key = 0, noCarry = 0, other = 0, overCarry = 0, rounded = 0, guard = 0;
  do {
    guard++;
    if (addMode) {
      a = v6Ri(scale + 1, 6 * scale); b = v6Ri(scale + 1, 3 * scale);
      key = a + b; noCarry = key - scale; other = Math.abs(a - b); overCarry = key + scale;
    } else {
      a = v6Ri(3 * scale, 9 * scale); b = v6Ri(scale + 1, a - scale);
      key = a - b; noCarry = dwDiff(a, b, dp); other = a + b; overCarry = key + scale;
    }
    rounded = addMode ? a + Math.ceil(b / scale) * scale : a - Math.ceil(b / scale) * scale;
  } while (guard < 300 && !(key > scale && noCarry > 0 && other > 0 && rounded > 0 &&
           a % 10 !== 0 && b % 10 !== 0 &&
           new Set([key, noCarry, other, overCarry, key - scale, rounded]).size === (addMode ? 5 : 6)));
  const K = DV(key, dp);
  return v6McDec(`<b>${DTXT(DV(a, dp))} ${addMode ? '+' : '−'} ${DTXT(DV(b, dp))} = ?</b>`, K,
    [DV(noCarry, dp), DV(other, dp), DV(overCarry, dp), DV(key - scale, dp), DV(rounded, dp),
     DV(key, Math.max(0, dp - 1)), dp < 3 ? DV(key, dp + 1) : null], '');
}
function ctlV6Track() {
  let lap = 4, laps = 6, guard = 0;
  do { lap = v6Ri(2, 9); laps = v6Ri(4, 9); guard++; }
  while (guard < 200 && !(lap !== laps && (lap * laps) % 10 !== 0 &&
         (lap * (laps - 1)) % 10 !== 0 && (lap * (laps + 1)) % 10 !== 0));
  const key = DV(lap * laps, 1);
  return v6McDec(`One lap of the running track at the stadium is <b>${DTXT(DV(lap, 1))} km</b>. Siti runs ` +
    `<b>${laps}</b> laps. <b>How far does Siti run altogether?</b>`, key,
    [DV(lap + laps * 10, 1), DV(lap * laps, 2), DV(lap * laps, 0),
     DV(lap * (laps - 1), 1), DV(lap * (laps + 1), 1)], 'km');
}

const couplingRows = [];
{
  const decGens = GENS.filter(g => g.topic === 'decimals').map(g => ({ name: g.name, fn: g.fn }));
  for (const r of decCouplingScan(decGens, RANK_DRAWS)) {
    couplingRows.push(r);
    if (!r.ok) failures++;
  }
}

/* ---------- NAMED-DISTRACTOR CONTRACT COVERAGE (refutation WOUND 2) ---------------
   The lane's note claimed the contract bound on 29 of 32 generators. It bound on 27:
   gDecCompare and gDecCmpMixed stamped nothing at all and were not in the exemption
   list. There is no exemption list any more - every multiple-choice decimals
   generator must stamp one of the four contracts on EVERY draw, and a typed item,
   which has no options to contract over, is the only thing excused. --- */
const contractRows = [];
{
  const STAMPS = ['decAuthored', 'authored', 'optionSet', 'fracAuthored'];
  for (const g of GENS.filter(x => x.topic === 'decimals')) {
    let stamped = 0, typed = 0, n = 0;
    for (let i = 0; i < 400; i++) {
      let q;
      try { q = g.fn(); } catch (e) { continue; }
      n++;
      if (q.typed) { typed++; continue; }
      if (STAMPS.some(s => q[s] !== undefined && q[s] !== null)) stamped++;
    }
    const ok = stamped + typed === n;
    contractRows.push({ name: g.name, ok, typed: typed === n,
      note: ok ? (typed === n ? 'typed - no option set to contract over' : 'stamped on 100% of draws')
               : `${n - stamped - typed} of ${n} draws shipped an UNSTAMPED option set` });
    if (!ok) failures++;
  }
}

/* ---------- NEGATIVE CONTROLS for the new decimals gates -------------------------
   A gate nobody has seen fail is a gate nobody has tested. Each control below is the
   defect the rule was written for, rebuilt by hand, and the run fails if the rule
   lets it through. The first is THE KILL exactly as it shipped. --- */
const negRows = [];
{
  const ctl = (name, want, got) => {
    const ok = typeof got === 'string' && got.length > 0;
    negRows.push({ name, ok, note: ok ? got : `NOT CAUGHT (expected ${want})` });
    if (!ok) failures++;
  };
  const fr = (n, d) => `<span class="frac"><span class="n">${n}</span><span class="d">${d}</span></span>`;
  const decQ = (stem, choices, correct, explain) => ({
    q: stem, extra: '', choices, correct, explain: explain || 'A negative control.',
    answerText: choices[correct]
  });

  /* 1. THE KILL, verbatim: two of four options end "so the answer is N", and one of
        those two prints the number the stem has already declared wrong. */
  ctl('THE KILL - old gDecRoundError, declared-wrong number offered back', 'RULE D5',
    decGates(decQ(
      'Priya rounds <b>7.4</b> to <b>the nearest whole number</b> and says the answer is <b>8</b>. <b>What went wrong?</b>',
      ['Priya rounded up. The next digit is 4, and 4 or less rounds down, so the answer is 7.',
       'Priya rounded down. The next digit is 4, and 4 or more rounds up, so the answer is 8.',
       'Priya rounded to the wrong place, and should have rounded to 1 decimal place instead.',
       'Priya looked at every digit after the ones place instead of only the next one.'], 0), 'decimals'));

  /* 2. the same shape with the repeated number scrubbed, so only the TAIL gives it
        away - the rule that catches the kill's form rather than its arithmetic. */
  ctl('THE KILL - the answer-bearing tail alone, on two of four options', 'RULE D6',
    decGates(decQ(
      'Priya rounds <b>7.4</b> to <b>the nearest whole number</b> and says the answer is <b>9</b>. <b>What went wrong?</b>',
      ['Priya rounded up. The next digit is 4, and 4 or less rounds down, so the answer is 7.',
       'Priya rounded down. The next digit is 4, and 4 or more rounds up, so the answer is 8.',
       'Priya rounded to the wrong place, and should have rounded to 1 decimal place instead.',
       'Priya looked at every digit after the ones place instead of only the next one.'], 0), 'decimals'));

  /* 3. WOUND 5: the sentence gDecBar printed on 12.8% of its draws. */
  ctl('WOUND 5 - "1 parts are shaded" in an explanation', 'RULE D8',
    decGates({ q: 'What decimal does the shaded part show?', extra: '', choices: ['0.1', '0.9', '0.01', '1'],
      correct: 0, answerText: '0.1',
      explain: 'The whole is cut into 10 equal parts, so each part is one tenth. 1 parts are shaded, which is 1 tenth.' },
      'decimals'));

  /* 4. WOUND 2: the padded fraction gDecMoneyFrac shipped at 50 cents. */
  ctl('WOUND 2 - buildFracChoices padding 2/3 into a money fraction', 'RULE D7',
    decGates({ q: 'At the school bookshop an eraser costs <b>50 cents</b>, which is written <b>$0.50</b>. What fraction of one dollar is that?',
      extra: '',
      choices: [fr(1, 2), fr(1, 20), fr(11, 20), fr(2, 3)], correct: 0, answerText: fr(1, 2),
      explain: 'A negative control.', fracAuthored: [[1, 20], [11, 20], [9, 20]] }, 'decimals'));

  /* 5. WOUND 1: a generator whose key is the second biggest on 100% of its draws -
        exactly the shape gDecHowMany, gDecStartAmount, gDecTrack, gDecRoundSum,
        gDecAlignError and gDecShareMass all had. Every individual item is clean; it
        is only visible across draws, which is what decRankScan is for. */
  const secondBiggest = () => {
    const k = 200 + Math.floor(Math.random() * 600);
    const opts = [DTXT(DV(k, 2)), DTXT(DV(k - 100, 2)), DTXT(DV(k - 50, 2)), DTXT(DV(k + 100, 2))];
    return { q: 'A negative control.', extra: '', choices: opts, correct: 0, answerText: opts[0],
             explain: 'A negative control.' };
  };
  const scan = decRankScan([{ name: 'ctlSecondBiggest', fn: secondBiggest }], 2000);
  const row = scan.rows[0];
  ctl('WOUND 1 - a generator whose key is the 2nd biggest on 100% of draws', 'the magnitude-rank ceiling',
    row.worst > RANK_CEILING
      ? `key at "${RANK_LABELS[row.rank]}" on ${(row.worst * 100).toFixed(1)}% of ${row.n} draws, ceiling ${(RANK_CEILING * 100).toFixed(0)}%`
      : null);

  /* 6. and the control on the control: a generator that DOES spread its key's rank
        must pass, or the ceiling is just failing everything. */
  const spread = () => {
    const k = 400, a = Math.floor(Math.random() * 4);
    const others = [];
    for (let i = 0; i < a; i++) others.push(k + 100 * (i + 1));
    for (let i = others.length; i < 3; i++) others.push(k - 100 * (i + 1));
    const opts = [DTXT(DV(k, 2))].concat(others.map(v => DTXT(DV(v, 2))));
    return { q: 'A negative control.', extra: '', choices: opts, correct: 0, answerText: opts[0],
             explain: 'A negative control.' };
  };
  const spreadRow = decRankScan([{ name: 'ctlSpread', fn: spread }], 2000).rows[0];
  negRows.push({ name: 'WOUND 1 - a generator that DOES spread its rank passes the ceiling',
    ok: spreadRow.worst <= RANK_CEILING,
    note: `worst rank share ${(spreadRow.worst * 100).toFixed(1)}% over ${spreadRow.n} draws` });
  if (spreadRow.worst > RANK_CEILING) failures++;

  /* ---- negative controls for the PROSE-OPTION GATE (second pass, KILLS 1-2) ----
     Both kills rebuilt here as they shipped at 0157aa1. Each is a distribution
     over draws, not a defect in any one item - every individual draw below passes
     every per-item rule in the harness, which is why they shipped green twice. */
  /* every arm that fires is reported, not just the first, so each of the gate's
     three arms is separately proven by the controls rather than shadowed by
     whichever one happens to run first */
  const proseCtl = (name, fn) => {
    const r = decProseScan([{ name, fn }], 2000)[0];
    const why = [];
    for (let fi = 0; fi < DEC_FEATURES.length; fi++) {
      if (r.hit[fi] / r.n >= DEC_FEATURE_CEILING) {
        why.push(`FEATURE ${DEC_FEATURES[fi].label} unique to the key on ${(100 * r.hit[fi] / r.n).toFixed(1)}%`);
      }
    }
    if (r.dead.length) why.push(`FRAME ${r.dead.length} never-correct frame(s), the commonest on ${(100 * r.dead[0][1] / r.n).toFixed(1)}% of draws`);
    if (r.frames >= DEC_KEY_FRAMES && r.keyFrames < DEC_KEY_FRAMES) {
      why.push(`FRAME the key wears ${r.keyFrames} sentence(s) of the ${r.frames} shipped`);
    }
    if (r.lenN >= 200 && Math.max(...r.lenRank) / r.lenN > DEC_LEN_CEILING) {
      why.push(`LENGTH the key is pinned to one rank on ${(100 * Math.max(...r.lenRank) / r.lenN).toFixed(1)}% of draws`);
    }
    if (r.modalShare > DEC_MODAL_CEILING) {
      why.push(`MODAL the key is "${r.modalText}" on ${(100 * r.modalShare).toFixed(1)}% of draws`);
    }
    ctl(name, 'the prose-option gate', why.length ? why.join('; ') : null);
  };
  /* KILL 1 as it shipped: the key is the only option naming a direction, the only
     one carrying "but", and the only one outside three never-correct frames. */
  proseCtl('SECOND-PASS KILL 1 - v2 gDecRoundError, the key is the only option with a direction', () => {
    const up = Math.random() < 0.5, lo = up ? 1 : 5, hi = up ? 4 : 9;
    const roll = () => lo + Math.floor(Math.random() * (hi - lo + 1));
    let d0, d1, d2;
    do { d0 = roll(); d1 = roll(); d2 = roll(); } while (new Set([d0, d1, d2]).size !== 3);
    const who = 'Priya', went = up ? 'up' : 'down', right = up ? 'down' : 'up';
    const opts = [
      `${who} used the next digit, ${d1}, but rounded ${went} instead of ${right}.`,
      `${who} used the last digit, ${d2}, instead of the next one.`,
      `${who} used the ones digit itself, ${d0}, instead of the next one.`,
      `${who} rounded to 1 decimal place first and then rounded that answer again.`
    ];
    const order = opts.slice(1);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const all = order.slice();
    const at = Math.floor(Math.random() * 4);
    all.splice(at, 0, opts[0]);
    return { q: `${who} rounds <b>${d0}.${d1}${d2}</b> to <b>the nearest whole number</b>. <b>What went wrong?</b>`,
             extra: '', choices: all, correct: at, answerText: opts[0], explain: 'A negative control.' };
  });
  /* KILL 2 as it shipped: three never-correct frames, one of them a literal
     constant, and the key's frame never appears as a distractor. */
  proseCtl('SECOND-PASS KILL 2 - v2 gDecCmpError, three never-correct frames on every draw', () => {
    const t = 3 + Math.floor(Math.random() * 7);
    let h; do { h = 11 + Math.floor(Math.random() * (t * 10 - 12)); } while (h % 10 === 0);
    const small = DTXT(DV(h, 2)), big = DTXT(DV(t, 1));
    const key = `${small} is ${DECQTY(Math.floor(h / 10), 1)} and ${DECQTY(h % 10, 2)}, which is less than ` +
      `${DECQTY(t, 1)}, so ${big} is the greater one.`;
    const all = [key,
      `Nothing is wrong. ${h} is greater than ${t}, so ${small} is greater than ${big}.`,
      `${big} should have been written as ${DTXT(DV(t, 2))} first, and then ${small} would be the greater one.`,
      'The digits after the point should have been counted, because the number with more digits is always the greater one.'];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return { q: `Jun Hao says <b>${small}</b> is greater than <b>${big}</b>. <b>What is wrong with that?</b>`,
             extra: '', choices: all, correct: all.indexOf(key), answerText: key, explain: 'A negative control.' };
  });
  /* WOUND 5: the prose LENGTH-RANK gap. Four generators sat at one length rank on
     100% of draws and "neither the longest nor the shortest" was a coin flip on
     each. Every shipped decimals bank now keeps its prose options within two
     characters, so nothing in the live file exercises this arm - which is exactly
     why it needs a control. Same frame, same direction, same feature values on all
     four options; only the key is always the 2nd longest. */
  proseCtl('WOUND 5 - a prose generator whose key is the 2nd longest on every draw', () => {
    /* one masked frame, one coarse length bucket, no direction word, no connective
       and no stem number - a three-character spread and nothing else, so the RANK
       arm is the only thing that can see the key pinned to 2nd longest */
    const all = ['Siti counted up to 6789 and stopped.', 'Siti counted up to 23456 and stopped.',
                 'Siti counted up to 12 and stopped.', 'Siti counted up to 345 and stopped.'];
    const key = all[0];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return { q: 'A negative control.', extra: '', choices: all, correct: all.indexOf(key),
             answerText: key, explain: 'A negative control.' };
  });
  /* WOUND 4: the VALUE axis. gDecRoundSum's draw ranges concentrated the total so
     hard that the key was one of four numbers and "always answer 5 kg" won 48.7%,
     over the magnitude-rank gate's own ceiling on the axis it cannot see. Every
     individual item is clean and every rank is spread; only the answer repeats. */
  proseCtl('WOUND 4 - a generator whose key is the same number on half its draws', () => {
    const k = Math.random() < 0.5 ? 5 : 4 + Math.floor(Math.random() * 4);
    const all = [`${k} kg`, `${k + 1} kg`, `${k - 1} kg`, `${k + 2} kg`];
    const at = Math.floor(Math.random() * 4);
    const opts = all.slice(1);
    opts.splice(at, 0, all[0]);
    return { q: 'A negative control.', extra: '', choices: opts, correct: at, answerText: all[0],
             explain: 'A negative control.' };
  });
  /* ---- negative controls for the STEM-OPTION COUPLING gate (fourth pass) ----
     The two generators the fourth pass killed, rebuilt exactly as they shipped at
     7ec7919. Both were green on every other arm in this file on the day they were
     killed, so if this gate does not turn them red it is measuring nothing. */
  const couplingCtl = (name, fn, want) => {
    const r = decCouplingScan([{ name, fn }], 2000)[0];
    ctl(name, want, r.ok ? null
      : `${cplRule(r.worst)} settles ${(100 * r.worst.settle).toFixed(2)}% at ${(100 * r.worst.acc).toFixed(1)}%` +
        (r.at === '(whole bank)' ? '' : `, inside one of its ${r.shapes} stem shapes`));
  };
  couplingCtl('FOURTH-PASS KILL 1 - v4 gDecRoundError, the rounding phrase and the neighbouring digit',
    ctlV4RoundError, 'the stem-option coupling ceiling');
  couplingCtl('FOURTH-PASS KILL 2 - v4 gDecMulConcept, the operand shape of the option list',
    ctlV4MulConcept, 'the stem-option coupling ceiling');
  couplingCtl('FIFTH-PASS KILL 1 - v5 gDecMulConcept, the price list that never overlaps',
    ctlV5MulConcept, 'the stem-option coupling ceiling');
  couplingCtl('FIFTH-PASS KILL 2 - v5 gDecDigitValue, the commonest depth ending in the named digit',
    ctlV5DigitValue, 'the stem-option coupling ceiling');
  couplingCtl('SIXTH-PASS KILL - v6 gDecAddSub, the point-placement twin with a depth-mate',
    ctlV6AddSub, 'the stem-option coupling ceiling');
  couplingCtl('SIXTH-PASS KILL - v6 gDecTrack, the point-placement twin with a depth-mate',
    ctlV6Track, 'the stem-option coupling ceiling');
  /* and the control on those controls: a generator that borrows nothing from its
     stem must pass, or the ceiling is just failing every bank that prints a number */
  {
    const fn = () => {
      const k = 200 + Math.floor(Math.random() * 600), a = Math.floor(Math.random() * 4);
      const others = [];
      for (let i = 0; i < a; i++) others.push(k + 17 * (i + 1));
      for (let i = others.length; i < 3; i++) others.push(k - 17 * (i + 1));
      const all = [DTXT(DV(k, 2))].concat(others.map(v => DTXT(DV(v, 2))));
      const at = Math.floor(Math.random() * 4), rest = all.slice(1);
      rest.splice(at, 0, all[0]);
      return { q: `A negative control asks for <b>${DTXT(DV(k * 3, 2))}</b> shared into <b>3</b>.`,
               extra: '', choices: rest, correct: at, answerText: all[0], explain: 'A negative control.' };
    };
    const r = decCouplingScan([{ name: 'ctlNoCoupling', fn }], 2000)[0];
    negRows.push({ name: 'FOURTH-PASS KILLS - a generator that borrows nothing from its stem passes',
      ok: r.ok, note: r.worst ? `worst rule settles ${(100 * r.worst.settle).toFixed(2)}% at ${(100 * r.worst.acc).toFixed(1)}%`
                              : 'no rule of that accuracy fires at all' });
    if (!r.ok) failures++;
  }

  /* and the control on the controls: a prose generator that DOES rotate its key's
     frame, shares its direction word and keeps its options the same length must
     pass, or the gate is just failing every word-answer bank. */
  {
    const ORD = ['first', 'second', 'third', 'fourth'];
    const fn = () => {
      const ds = [1, 2, 3, 4, 5, 6, 7, 8, 9].slice();
      for (let i = ds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ds[i], ds[j]] = [ds[j], ds[i]]; }
      const d = ds.slice(0, 4), dir = Math.random() < 0.5 ? 'up' : 'down';
      const all = [0, 1, 2, 3].map(i => `Siti rounded ${dir} after looking at the ${ORD[i]} digit, ${d[i]}.`);
      const at = Math.floor(Math.random() * 4);
      return { q: 'A negative control.', extra: '', choices: all, correct: at, answerText: all[at],
               explain: 'A negative control.' };
    };
    const r = decProseScan([{ name: 'ctlProseSpread', fn }], 2000)[0];
    const worstFeat = Math.max(...r.hit) / r.n;
    const ok = worstFeat < DEC_FEATURE_CEILING && !r.dead.length && r.keyFrames >= DEC_KEY_FRAMES;
    negRows.push({ name: 'SECOND-PASS KILLS - a prose generator that DOES rotate its key\'s frame passes',
      ok, note: `worst feature ${(worstFeat * 100).toFixed(1)}%, key frames ${r.keyFrames}, never-correct frames ${r.dead.length}` });
    if (!ok) failures++;
  }
}

/* ---------- manifest gate (Wave 3, W3 Pie+Cosmetics Refutation KILL) --------------
   p4-pie-charts.js passed 200/200 here while being absent from index.html's script
   list, so the topic shipped dark: the harness reads js/topics/*.js off disk and never
   read the manifest. That seam is now gated. Every topic file must be referenced by
   index.html, and every path index.html lists must exist. --- */
const manifestRows = [];
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const listed = new Set([...html.matchAll(/"(js\/topics\/[A-Za-z0-9._-]+\.js)"/g)].map(x => x[1]));
  for (const f of topicFiles) {
    const rel = 'js/topics/' + f;
    const ok = listed.has(rel);
    manifestRows.push({ rel, ok, note: ok ? '' : 'NOT referenced by index.html - the topic would ship dark' });
    if (!ok) failures++;
  }
  for (const rel of listed) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      manifestRows.push({ rel, ok: false, note: 'listed in index.html but the file does not exist' });
      failures++;
    }
  }
  /* Same seam, one layer deeper: js/figures.js draws EVERY diagram in the game, so
     if it drops out of the manifest the app renders empty figure slots and the
     harness would still be green - it loads the renderer off disk. It must be
     listed, and its position must be a TOTAL order, not a partial one.

     WOUND 2 (Figure Spec Refutation, 2026-09-07): this checked only iFig > iCore,
     so moving js/figures.js AFTER js/app.js and js/boot.js passed while the failure
     message claimed to prove the load order. Harmless in fact - figHtml() resolves
     MQI.renderFigure at call time - but a gate that does not prove its own message
     is not a gate. The renderer must sit strictly between core.js (which assigns
     window.MQI wholesale, so a renderer loaded first is thrown away) and app.js +
     boot.js (which are the consumers). */
  const iCore = html.indexOf('"js/core.js"'), iFig = html.indexOf('"js/figures.js"');
  const iApp = html.indexOf('"js/app.js"'), iBoot = html.indexOf('"js/boot.js"');
  let figNote = '';
  if (iFig < 0) figNote = 'NOT referenced by index.html - every figure would render blank';
  else if (iCore < 0 || iApp < 0 || iBoot < 0) figNote = 'js/core.js, js/app.js or js/boot.js is missing from the manifest';
  else if (iFig < iCore) figNote = 'listed BEFORE js/core.js - core.js would overwrite MQI.renderFigure';
  else if (iFig > iApp || iFig > iBoot) figNote = 'listed AFTER js/app.js or js/boot.js - the renderer must load before its consumers';
  const figOk = figNote === '';
  manifestRows.push({ rel: 'js/figures.js', ok: figOk, note: figNote });
  if (!figOk) failures++;

  /* WOUND 8, second half. Six of the seven renderers are self-contained; fractionBar
     cannot be, because a segment's width is responsive (6vw). js/figures.js declares
     those rules as MQI.figureCss - the "documented stylesheet block" a SwiftUI author
     reads instead of index.html - and they are asserted verbatim here so the renderer
     and the stylesheet can never drift apart in silence. */
  const squash = s => String(s).replace(/\s+/g, '');
  const cssHtml = squash(html);
  for (const [sel, body] of Object.entries(ctx.MQI.figureCss || {})) {
    const want = squash(sel + '{' + body + '}');
    const ok = cssHtml.indexOf(want) >= 0;
    manifestRows.push({ rel: 'figureCss ' + sel, ok, note: ok ? ''
      : 'js/figures.js MQI.figureCss and index.html disagree - the fractionBar geometry has drifted from its documented block' });
    if (!ok) failures++;
  }
}

/* ---------- report ---------- */
const pad = (s, w) => String(s).padEnd(w);
console.log(`\nMath Quest Island generator sanity  (SAMPLES=${N}, ${GENS.length} generators, ${Object.keys(TOPICS).length} topics)\n`);
console.log(pad('TOPIC', 12) + pad('GENERATOR', 18) + pad('SKILL', 12) + pad('N', 7) + pad('DISTINCT', 10) + pad('ORACLE', 9) + 'RESULT');
console.log('-'.repeat(84));
for (const r of rows) {
  console.log(pad(r.topic, 12) + pad(r.name, 18) + pad(r.skill, 12) + pad(r.n, 7) + pad(r.distinct, 10) + pad(r.cov + '%', 9) + (r.err ? 'FAIL  ' + r.err : 'pass'));
}
console.log('');
for (const s of setRows) console.log(`${s.ok ? 'ok  ' : 'FAIL'} buildSetFor(${s.tid})  30 x 3 levels${s.note ? '  ' + s.note : ''}`);

const badPoolSkill = poolSkillRows.filter(r => !r.ok);
console.log('');
if (badPoolSkill.length) for (const r of badPoolSkill) console.log(`FAIL pool skills  ${r.tid}  ${r.note}`);
else console.log(`ok   pool skill coverage: every multi-skill topic exposes >= 2 skills in all 3 pools (${poolSkillRows.length} checks)`);

const badManifest = manifestRows.filter(r => !r.ok);
console.log('');
if (badManifest.length) for (const r of badManifest) console.log(`FAIL manifest  ${r.rel}  ${r.note}`);
else console.log(`ok   index.html manifest: all ${manifestRows.length} topic files + the figure renderer are loaded by the app`);

/* ---------- decimals: magnitude rank, contract coverage, negative controls ---------- */
if (rankReport) {
  console.log('');
  console.log(`MAGNITUDE-RANK  (${RANK_DRAWS} draws x ${rankReport.rows.length} decimals generators, ceiling ${(RANK_CEILING * 100).toFixed(0)}% per rank)`);
  console.log(`  bank-wide best rank strategy : "always pick the ${RANK_LABELS[rankReport.bank.rank]}" wins ` +
    `${(rankReport.bank.share * 100).toFixed(1)}%  (${rankReport.bank.n} numeric-option draws, floor 25.0%)`);
  console.log(`  gated generators only        : "always pick the ${RANK_LABELS[rankReport.gated.rank]}" wins ` +
    `${(rankReport.gated.share * 100).toFixed(1)}%  (${rankReport.gated.n} draws, q.optionSet items excluded)`);
  const badRank = rankRows.filter(r => !r.ok);
  if (badRank.length) {
    for (const r of badRank) {
      console.log(`FAIL rank  ${r.name}  key is the ${RANK_LABELS[r.rank]} on ${(r.worst * 100).toFixed(1)}% of ${r.n} draws ` +
        `[${r.hist.map((h, i) => RANK_LABELS[i] + ' ' + (r.n ? (h / r.n * 100).toFixed(1) : '0.0') + '%').join(', ')}]`);
    }
  } else {
    const gatedRows = rankRows.filter(r => !r.exempt && r.n >= RANK_FLOOR).sort((a, b) => b.worst - a.worst);
    const w = gatedRows[0];
    console.log(`  ok   no gated generator's key sits at one rank on more than ${(RANK_CEILING * 100).toFixed(0)}% of its draws` +
      (w ? `  (worst: ${w.name} ${(w.worst * 100).toFixed(1)}% "${RANK_LABELS[w.rank]}")` : ''));
  }
}
if (proseRows.length) {
  console.log('');
  const judged = proseRows.filter(r => r.n >= DEC_PROSE_FLOOR);
  console.log(`PROSE-OPTION GATE  (${RANK_DRAWS} draws x ${proseRows.length} decimals generators, ${judged.length} of them with ` +
    `word-answer draws; feature ceiling ${(DEC_FEATURE_CEILING * 100).toFixed(0)}%, key frames >= ${DEC_KEY_FRAMES}, ` +
    `length rank ceiling ${(DEC_LEN_CEILING * 100).toFixed(0)}%, modal key ceiling ${(DEC_MODAL_CEILING * 100).toFixed(0)}%)`);
  const badProse = proseRows.filter(r => !r.ok);
  if (badProse.length) {
    for (const r of badProse) console.log(`FAIL prose  ${r.name}  ${r.note}`);
  } else {
    const worstFeat = judged.map(r => ({ name: r.name, v: Math.max(...r.hit) / r.n,
      fi: r.hit.indexOf(Math.max(...r.hit)) })).sort((a, b) => b.v - a.v)[0];
    const lenRows = judged.filter(r => r.lenN >= DEC_PROSE_FLOOR)
      .map(r => ({ name: r.name, v: Math.max(...r.lenRank) / r.lenN })).sort((a, b) => b.v - a.v)[0];
    console.log(`  ok   no feature value is unique to the key on ${(DEC_FEATURE_CEILING * 100).toFixed(0)}% or more of a ` +
      `generator's draws  (worst: ${worstFeat.name} ${(worstFeat.v * 100).toFixed(1)}%, ${DEC_FEATURES[worstFeat.fi].label})`);
    console.log(`  ok   no never-correct frame ships on ${(DEC_FRAME_SHIP * 100).toFixed(0)}% or more of any generator's draws, ` +
      `and every multi-frame key wears >= ${DEC_KEY_FRAMES} sentences  (thinnest: ` +
      `${judged.filter(r => r.frames >= DEC_KEY_FRAMES).sort((a, b) => a.keyFrames - b.keyFrames)[0].name} ` +
      `${judged.filter(r => r.frames >= DEC_KEY_FRAMES).sort((a, b) => a.keyFrames - b.keyFrames)[0].keyFrames})`);
    /* WOUND 4 (refutation v3 @ c9d26fb): this line read "no generator spans that
       far" while three prose banks did - they are excluded upstream as not-
       sentences, and MAGNITUDE-RANK cannot measure them either, so they sit in the
       gap between the two gates. The arm is KEPT (its negative control proves it,
       and it is the rule that catches the next generator to widen its options) but
       the line now says plainly that it runs on no live generator and names what it
       does not reach, because an arm nobody re-checks is an arm nobody maintains. */
    const skipped = proseRows.filter(r => r.n >= DEC_PROSE_FLOOR && r.lenN < DEC_PROSE_FLOOR).map(r => r.name);
    console.log(`  ok   no prose key sits at one length rank on more than ${(DEC_LEN_CEILING * 100).toFixed(0)}% of the draws ` +
      `whose options span more than ${DEC_LEN_SPREAD} characters` +
      (lenRows ? `  (worst: ${lenRows.name} ${(lenRows.v * 100).toFixed(1)}%)`
               : `  -- the arm RUNS ON NO LIVE GENERATOR: all ${skipped.length} word-answer banks keep their options ` +
                 `inside ${DEC_LEN_SPREAD} characters or are not four sentences, so only its negative control exercises it`));
    const modalWorst = proseRows.filter(r => r.allN >= DEC_PROSE_FLOOR).sort((a, b) => b.modalShare - a.modalShare)[0];
    console.log(`  ok   no generator's key is the same answer on more than ${(DEC_MODAL_CEILING * 100).toFixed(0)}% of its draws` +
      (modalWorst ? `  (worst: ${modalWorst.name} ${(modalWorst.modalShare * 100).toFixed(1)}% "${modalWorst.modalText}")` : ''));
  }
}

if (roundScan) {
  console.log('');
  console.log(`ROUND-ERROR DEFENSIBILITY  (${roundScan.n} draws x gDecRoundError, every option re-derived from the rendered stem; ` +
    `option-list ceiling ${(ROUND_CEILING * 100).toFixed(0)}%)`);
  const counts = [...roundScan.live.entries()].sort((a, b) => a[0] - b[0]);
  const notOne = counts.filter(([c]) => c !== 1);
  if (roundScan.unparsed) {
    console.log(`FAIL round-error  ${roundScan.unparsed} of ${roundScan.n} draws could not be re-derived from the stem`);
  } else if (notOne.length) {
    console.log(`FAIL round-error  ${notOne.map(([c, k]) => `${k} draws with ${c} defensible options`).join(', ')}` +
      ` - exactly one option may survive the stem`);
  } else {
    console.log(`  ok   exactly ONE defensible option on ${roundScan.n} of ${roundScan.n} draws  ` +
      `(the third-pass kill was two, on 40,000 of 40,000)`);
  }
  const line = r => `"${r.name}" settles ${(r.settle * 100).toFixed(1)}%  (picks one option on ${(r.fires * 100).toFixed(1)}% of draws)`;
  const verdict = r => (r.settle >= ROUND_CEILING ? 'FAIL round-error  ' : '  ok   ');
  console.log(`${verdict(roundScan.best)}best of ${DEC_OPT_RULES.length} stem-free option-list rules: ${line(roundScan.best)}`);
  console.log(`${verdict(roundScan.smallest)}${line(roundScan.smallest)}  [was 60.56% at c9d26fb]`);
  console.log(`${verdict(roundScan.lone)}${line(roundScan.lone)}  [was 100.00% at c9d26fb]`);
  console.log(`  ${roundCtl.two ? 'ok  ' : 'FAIL'} control, gDecRoundError as it shipped at c9d26fb: ` +
    `${[...roundCtl.live.entries()].sort((a, b) => a[0] - b[0]).map(([c, k]) => `${k}/${roundCtl.n} draws with ${c} defensible options`).join(', ')}`);
  console.log(`         ... and on the same control the same two rules read ` +
    `"${roundCtl.lone.name}" ${(roundCtl.lone.settle * 100).toFixed(1)}%, ` +
    `"${roundCtl.smallest.name}" ${(roundCtl.smallest.settle * 100).toFixed(1)}%`);
}

if (couplingRows.length) {
  console.log('');
  const judged = couplingRows.filter(r => r.worst);
  console.log(`STEM-OPTION COUPLING  (${RANK_DRAWS} draws x ${couplingRows.length} decimals generators, ` +
    `${CPL_PREDS.length} stem/option relations scored alone and in pairs plus ${CPL_FEATS.length} categorical ` +
    `features, per generator AND per stem shape; ceiling ${(CPL_CEILING * 100).toFixed(0)}% settled at ` +
    `${(CPL_ACC * 100).toFixed(0)}% accuracy)`);
  const badCpl = couplingRows.filter(r => !r.ok);
  if (badCpl.length) {
    for (const r of badCpl) {
      console.log(`FAIL coupling  ${r.name}  ${cplRule(r.worst)} settles ${(100 * r.worst.settle).toFixed(2)}% of ` +
        `draws and is right ${(100 * r.worst.acc).toFixed(1)}% of the time` +
        (r.at === '(whole bank)' ? '' : `  [inside one of its ${r.shapes} stem shapes]`));
    }
  } else {
    /* the worst THREE, not the worst one: a lane that has just moved the top bank
       down needs to see what is now underneath it, and a single name hides that. */
    const top = judged.sort((a, b) => b.worst.settle - a.worst.settle).slice(0, 3);
    console.log(`  ok   no rule built from the stem and the option list together settles ` +
      `${(CPL_CEILING * 100).toFixed(0)}% of any generator's draws at ${(CPL_ACC * 100).toFixed(0)}% accuracy` +
      (top.length ? `  (worst three: ` + top.map(w =>
        `${w.name} ${(100 * w.worst.settle).toFixed(2)}% at ${(100 * w.worst.acc).toFixed(1)}%`).join(', ') + ')' : ''));
  }
}

const badContract = contractRows.filter(r => !r.ok);
console.log('');
if (badContract.length) for (const r of badContract) console.log(`FAIL contract  ${r.name}  ${r.note}`);
else console.log(`ok   named-distractor contract: ${contractRows.length} of ${contractRows.length} decimals generators stamp it on every draw ` +
  `(${contractRows.filter(r => r.typed).length} typed item exempt)`);
console.log('');
for (const r of negRows) console.log(`${r.ok ? 'ok  ' : 'FAIL'} neg-control  ${r.name}  --  ${r.note}`);

const uncovered = rows.filter(r => r.cov === 0).map(r => r.topic + '.' + r.name);
if (uncovered.length) console.log(`\nWARN no independent oracle matched (shape + integrity only): ${uncovered.join(', ')}`);

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll ${GENS.length} generators passed (${N} samples each).`);
