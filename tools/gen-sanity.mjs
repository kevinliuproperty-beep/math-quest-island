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

/* ---------- independent oracles, dispatched on the rendered question ---------- */
/* Return: null = verified, string = failure, false = no oracle matched. */
function oracle(q) {
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

  /* ===== SWEEP 2026-09-15 lane: p3numbers (Thousand Isles) ==================
     One oracle per FORMAT in the rebuilt bank, each re-deriving the key from the
     RENDERED stem and never from the generator's own answerText. Several also
     refute the item's own PREMISE: the error-spotting oracles fail if the printed
     wrong answer is actually right, or if it maps to two named misconceptions, or
     if a distractor option ALSO explains it. Anchored stems, above the loose
     "a + b = ?" / "which number is the greatest" branches further down.
     The column arithmetic here is written out independently; it is not imported
     from the topic file. ------------------------------------------------------- */
  const P3_PLACES = ['thousands', 'hundreds', 'tens', 'ones'];
  const P3_POW = [1000, 100, 10, 1];
  const p3dig = n => [0, 1, 2, 3].map(i => Math.floor(n / P3_POW[i]) % 10);
  const p3add = (a, b, suppressAt) => {
    const A = p3dig(a), B = p3dig(b); let carry = 0, out = 0;
    for (let i = 3; i >= 0; i--) { const s = A[i] + B[i] + carry; out += (s % 10) * P3_POW[i]; carry = (s >= 10 && i !== suppressAt) ? 1 : 0; }
    return out + carry * 10000;
  };
  const p3carryCols = (a, b) => {
    const A = p3dig(a), B = p3dig(b), out = []; let c = 0;
    for (let i = 3; i >= 0; i--) { const s = A[i] + B[i] + c; if (s >= 10) { out.push(i); c = 1; } else c = 0; }
    return out;
  };
  const p3noCarry = (a, b) => { const A = p3dig(a), B = p3dig(b); let o = 0; for (let i = 0; i < 4; i++) o += ((A[i] + B[i]) % 10) * P3_POW[i]; return o; };
  const p3smallFromBig = (a, b) => { const A = p3dig(a), B = p3dig(b); let o = 0; for (let i = 0; i < 4; i++) o += Math.abs(A[i] - B[i]) * P3_POW[i]; return o; };
  const p3digitSum = n => p3dig(n).reduce((s, d) => s + d, 0);
  const p3opts = qq => (qq.choices || []).map(strip);

  /* PLACE VALUE - compare two digit values inside one number (was gStandsHard) */
  if ((m = text.match(/^In (\d+), how much more does the digit (\d) stand for than the digit (\d)\?$/))) {
    const s = m[1], di = m[2], dj = m[3];
    if (s.length !== 4) return 'p3 stands-compare: expected a 4-digit number, got ' + s;
    if (s.split(di).length !== 2 || s.split(dj).length !== 2) return 'p3 stands-compare: a named digit is not unique in ' + s;
    const i = s.indexOf(di), j = s.indexOf(dj);
    if (i >= j) return 'p3 stands-compare: the first digit named must sit further left, got ' + s + ' ' + di + '/' + dj;
    const e = Number(di) * Math.pow(10, 3 - i) - Number(dj) * Math.pow(10, 3 - j);
    if (e <= 0) return 'p3 stands-compare: the difference is not positive';
    return near(e, ansNum) ? null : `p3 stands-compare: expected ${e}, got ${ansNum}`;
  }

  /* PLACE VALUE - expanded form. Every option is evaluated; exactly one may sum
     to the number in the stem, and it must be the key. */
  if ((m = text.match(/^Which of these shows (\d+) in expanded form\?$/))) {
    const n = Number(m[1]);
    const sums = p3opts(q).map(o => {
      const parts = o.split('+').map(t => t.trim());
      if (!parts.length || parts.some(t => !/^\d+$/.test(t))) return NaN;
      return parts.reduce((s, t) => s + Number(t), 0);
    });
    if (sums.some(Number.isNaN)) return 'p3 expanded: an option is not a sum of whole numbers: ' + p3opts(q).join(' | ');
    const hits = sums.filter(v => v === n).length;
    if (hits !== 1) return `p3 expanded: ${hits} of the four options add up to ${n}`;
    if (sums[q.correct] !== n) return `p3 expanded: the flagged option adds to ${sums[q.correct]}, not ${n}`;
    return null;
  }

  /* PLACE VALUE - error spotting, DIAGNOSE. Re-derives which offered READING
     produced the printed claim, fails if it is none, two, or the true value, and
     fails if a distractor option would also explain the claim. */
  if ((m = text.match(/^In (\d+), (\S+(?: \S+)?) says the digit (\d) stands for (\d+)\. What did (he|she) do wrong\?$/))) {
    const s = m[1], dig = Number(m[3]), claim = Number(m[4]);
    if (s.length !== 4) return 'p3 stands-error: expected a 4-digit number, got ' + s;
    if (s.split(m[3]).length !== 2) return 'p3 stands-error: the digit is not unique in ' + s;
    const p = s.indexOf(m[3]), val = dig * Math.pow(10, 3 - p);
    if (claim === val) return `p3 stands-error: the "wrong" claim ${claim} is the correct value`;
    /* KILL 1 (Sweep p3numbers Refutation, 2026-09-15). This loop used to walk only
       the three NAMED slips, so a "filler" option that also explained the printed
       claim was invisible to it: the gate reported the class as impossible while
       the generator shipped it on 353 of 200,000 draws ("In 6293 the digit 2
       stands for 20" - one column right gives 20, and 6+2+9+3 gives 20 too).
       Every option this item can print is a reading with arithmetic of its own,
       and all FIVE are now checked, against the claim and against every option. */
    const slipText = {
      digit: ' wrote the digit, not what it is worth.',
      right: ' used the column one place to the right.',
      left: ' used the column one place to the left.',
      sum: ' added up all four digits of the number.',
      next: ' wrote the digit that comes next in it.'
    };
    const sd = s.split('').map(Number);
    const claimOf = k => k === 'digit' ? dig
      : k === 'right' ? (p < 3 ? dig * Math.pow(10, 3 - p - 1) : null)
      : k === 'left' ? (p > 0 ? dig * Math.pow(10, 3 - p + 1) : null)
      : k === 'sum' ? sd.reduce((x, y) => x + y, 0)
      : (p < 3 ? sd[p + 1] : null);
    const fired = Object.keys(slipText).filter(k => claimOf(k) === claim);
    if (fired.length !== 1) return `p3 stands-error: ${fired.length} of the five offered readings produce ${claim}`;
    const want = slipText[fired[0]];
    const key = strip(q.answerText);
    if (!key.endsWith(want)) return `p3 stands-error: claim ${claim} is the "${fired[0]}" reading but the key reads "${key}"`;
    for (const o of p3opts(q)) {
      if (o === key) continue;
      for (const k of Object.keys(slipText)) {
        if (o.endsWith(slipText[k]) && claimOf(k) === claim) return `p3 stands-error: a distractor also explains ${claim}: "${o}"`;
      }
    }
    return null;
  }

  /* PLACE VALUE - error spotting, CORRECT the mistake, then step on. The stem's
     own premise (the number written with the empty hundreds place left out) is
     re-derived, and so is the second described number. W4, 2026-09-15: the old
     one-step form of this item ("what number should he have written?") is gone,
     so the old oracle branch is gone with it - a stem in that shape now matches
     nothing here and would be reported as uncovered. */
  if ((m = text.match(/^(\S+(?: \S+)?) writes (\d) thousands?, 0 hundreds, (\d) tens? and (\d) ones? as (\d+)\. What is (\d+) (more|less) than the correct number\?$/))) {
    const th = Number(m[2]), t = Number(m[3]), o = Number(m[4]), printed = Number(m[5]);
    const step = Number(m[6]), sg = m[7] === 'more' ? 1 : -1;
    if (th === 1 && /1 thousands/.test(text)) return 'p3 zero-fix: "1 thousands" in the stem';
    const squashed = th * 100 + t * 10 + o;
    if (printed !== squashed) return `p3 zero-fix: the stem prints ${printed}, but dropping the zero gives ${squashed}`;
    const meant = th * 1000 + t * 10 + o;
    if (![10, 100, 1000].includes(step)) return `p3 zero-fix: ${step} is not a tens/hundreds/thousands step`;
    const e = meant + sg * step;
    /* W3, second pass: 2.28% of keys were 3-digit numbers, in the one item whose
       whole lesson is that the zero stops the number shrinking. */
    if (e < 1000 || e > 9999) return `p3 zero-fix: the answer ${e} is not a 4-digit number`;
    /* the item is two-step only if the number it asks for is NOT the rebuilt one */
    if (e === meant) return 'p3 zero-fix: the second number equals the rebuilt number, so the item is one step';
    if (strip(q.q).split(/\s+/).length > 22) return `p3 zero-fix: the stem runs to ${strip(q.q).split(/\s+/).length} words`;
    return near(e, ansNum) ? null : `p3 zero-fix: expected ${e}, got ${ansNum}`;
  }

  /* COMPARE - which line compares the stem's pair correctly (v11). Every option is
     evaluated from the rendered text. The row must carry the stem's pair with BOTH
     symbols and a second pair with both symbols, so that exactly TWO of the four
     lines are true as written and the agree/disagree split is 2-2 - which is what
     kills the "the statement that agrees with the order is the odd one out"
     deduction a 1-3 split hands to a child who cannot read either symbol. The key
     is the true line about the STEM's pair; the other true line is about the other
     pair and does not answer the question asked. */
  if ((m = text.match(/^Which line compares (\d+) and (\d+) correctly\?$/)) &&
      (q.choices || []).every(c => /^\d+ [<>] \d+$/.test(strip(c)))) {
    const sx = Number(m[1]), sy = Number(m[2]);
    const st = p3opts(q).map(o => {
      const p = o.split(' ');
      return { text: o, l: Number(p[0]), sign: p[1], r: Number(p[2]) };
    });
    if (st.length !== 4) return 'p3 compare-line: expected four statements';
    if (st.some(x => x.l === x.r)) return 'p3 compare-line: a statement compares a number with itself';
    if (st.some(x => x.l < 1 || x.l > 9999 || x.r < 1 || x.r > 9999)) return 'p3 compare-line: a printed number is outside scope';
    const isTrue = x => x.sign === '>' ? x.l > x.r : x.l < x.r;
    const mine = st.filter(x => x.l === sx && x.r === sy);
    const other = st.filter(x => !(x.l === sx && x.r === sy));
    if (mine.length !== 2) return `p3 compare-line: ${mine.length} of the four lines are about the stem's pair, not 2`;
    if (mine[0].sign === mine[1].sign) return 'p3 compare-line: the stem pair is printed with the same symbol twice, so the symbol is not load-bearing';
    if (other.length !== 2 || other[0].l !== other[1].l || other[0].r !== other[1].r)
      return 'p3 compare-line: the other two lines are not the same pair, so "the pair that repeats" names the key';
    if (other[0].sign === other[1].sign) return 'p3 compare-line: the decoy pair is printed with one symbol, so its two lines are not 1 true and 1 false';
    const hits = mine.filter(isTrue);
    if (hits.length !== 1) return `p3 compare-line: ${hits.length} of the stem's two lines are true`;
    if (hits[0].text !== strip(q.answerText)) return `p3 compare-line: the true line is "${hits[0].text}" but the key reads "${strip(q.answerText)}"`;
    if (st.filter(isTrue).length !== 2) return `p3 compare-line: ${st.filter(isTrue).length} of the four lines are true as written, so the agree/disagree split is not 2-2`;
    const gt = st.filter(x => x.sign === '>').length;
    if (gt !== 2) return `p3 compare-line: ${gt} of the four statements print ">", so the sign is a tell`;
    return null;
  }

  /* COMPARE - the deciding place and what it is worth (v11). Re-derived from the
     two printed numbers alone: pad both to four places, walk from the left, and
     the first place whose digits differ carries the answer. */
  if ((m = text.match(/^Compare (\d+) and (\d+)\. Read from the left and stop at the first place where the digits are different\. How much more is the bigger number worth at that place\?$/))) {
    const pad = n => String(n).padStart(4, '0');
    const da = pad(m[1]), db = pad(m[2]);
    if (da === db) return 'p3 compare-place: the two printed numbers are equal';
    const i = [0,1,2,3].find(k => da[k] !== db[k]);
    const want = Math.abs(Number(da[i]) - Number(db[i])) * Math.pow(10, 3 - i);
    const opts = p3opts(q);
    /* every option must be ONE digit at ONE place value - the 2x2 grid the board
       balance rests on, re-checked here rather than asserted in a comment */
    if (opts.length !== 4 || !opts.every(o => /^[1-9]0*$/.test(o)))
      return 'p3 compare-place: an option is not a single digit at a single place value';
    return near(want, ansNum) ? null : `p3 compare-place: expected ${want}, got ${ansNum}`;
  }

  /* COMPARE - between two numbers. Exactly one option may lie strictly between. */
  if ((m = text.match(/^Which number is between (\d+) and (\d+)\?$/))) {
    const lo = Number(m[1]), hi = Number(m[2]);
    if (!(hi > lo)) return `p3 between: the stem prints ${lo} and ${hi}, which are not in order`;
    const vals = p3opts(q).map(Number);
    if (vals.some(v => !Number.isFinite(v))) return 'p3 between: an option is not a number';
    const hits = vals.filter(v => v > lo && v < hi);
    if (hits.length !== 1) return `p3 between: ${hits.length} of the four options lie between ${lo} and ${hi}`;
    return near(hits[0], ansNum) ? null : `p3 between: expected ${hits[0]}, got ${ansNum}`;
  }

  /* COMPARE - order four numbers. Every option must be the SAME four numbers in
     some order, and exactly one of them may be ascending. */
  if (/^Which list is in order from the smallest to the greatest\?$/.test(text)) {
    const lists = p3opts(q).map(o => o.split(',').map(t => Number(t.trim())));
    if (lists.some(l => l.length !== 4 || l.some(v => !Number.isFinite(v)))) return 'p3 order: an option is not four numbers';
    const sig = l => l.slice().sort((x, y) => x - y).join(',');
    if (new Set(lists.map(sig)).size !== 1) return 'p3 order: the options are not all the same four numbers';
    const asc = l => l.every((v, i) => i === 0 || v > l[i - 1]);
    const hits = lists.filter(asc).length;
    if (hits !== 1) return `p3 order: ${hits} of the four options are in ascending order`;
    if (!asc(lists[q.correct])) return 'p3 order: the flagged option is not in ascending order';
    return null;
  }

  /* COMPARE - error spotting on a comparison. The claim must be genuinely false,
     the named slip must be the one the numbers exhibit, and NEITHER filler option
     may also produce the claim on this draw. */
  if ((m = text.match(/^\S+(?: \S+)? says (\d+) is greater than (\d+)\. What did (he|she) do wrong\?$/))) {
    const a = Number(m[1]), b = Number(m[2]);
    if (!(b > a)) return `p3 compare-error: the claim "${a} is greater than ${b}" is true, so there is no mistake`;
    const FIRST = ' only compared the first digit of each.';
    const RIGHT = ' compared from the right, not the left.';
    const ODD = ' counted the odd digits in each instead.';
    const SUM = ' added the digits up and compared those.';
    const lead = n => Number(String(n)[0]);
    const oddC = n => String(n).split('').filter(d => Number(d) % 2 === 1).length;
    const dSum = n => String(n).split('').reduce((s, d) => s + Number(d), 0);
    const fires = { [FIRST]: lead(a) > lead(b), [RIGHT]: a % 10 > b % 10, [ODD]: oddC(a) > oddC(b), [SUM]: dSum(a) > dSum(b) };
    const firing = Object.keys(fires).filter(k => fires[k]);
    if (firing.length !== 1) return `p3 compare-error: ${firing.length} of the four offered explanations produce "${a} > ${b}"`;
    const key = strip(q.answerText);
    if (!key.endsWith(firing[0])) return `p3 compare-error: the slip that fires is "${firing[0].trim()}" but the key reads "${key}"`;
    if (!p3opts(q).some(o => o === key)) return 'p3 compare-error: the key is not among the options';
    return null;
  }

  /* PATTERN - name the jump */
  if ((m = text.match(/^In this number pattern, what is the jump from one number to the next\? ([\d, ]+)$/))) {
    const t = m[1].split(',').map(x => Number(x.trim()));
    if (t.length < 3 || t.some(v => !Number.isFinite(v))) return 'p3 jump: could not read the sequence';
    const d = t[1] - t[0];
    if (!t.every((v, i) => i === 0 || v - t[i - 1] === d)) return 'p3 jump: the printed terms are not an arithmetic sequence: ' + t.join(',');
    if (t.some(v => v < 1000 || v > 9999)) return 'p3 jump: a term is outside 1000..9999: ' + t.join(',');
    return near(d, ansNum) ? null : `p3 jump: expected ${d}, got ${ansNum}`;
  }

  /* PATTERN - counting on/back in tens, hundreds, thousands. The stem NAMES the
     unit, so the oracle checks the printed terms really move by that unit in that
     direction before it derives the next one. */
  if ((m = text.match(/^Count (on|back) in (tens|hundreds|thousands)\. What number comes next\? ([\d, ]+), \?$/))) {
    const unit = { tens: 10, hundreds: 100, thousands: 1000 }[m[2]];
    const sgn = m[1] === 'on' ? 1 : -1;
    const t = m[3].split(',').map(x => Number(x.trim()));
    if (t.length !== 5 || t.some(v => !Number.isFinite(v))) return 'p3 count: expected five printed terms';
    if (!t.every((v, i) => i === 0 || v - t[i - 1] === sgn * unit)) return `p3 count: the terms do not move ${sgn * unit} each time: ` + t.join(',');
    if (t.some(v => v < 1000 || v > 9999)) return 'p3 count: a term is outside 1000..9999: ' + t.join(',');
    const e = t[4] + sgn * unit;
    if (e < 1 || e > 9999) return `p3 count: the answer ${e} is outside 1..9999`;
    return near(e, ansNum) ? null : `p3 count: expected ${e}, got ${ansNum}`;
  }

  /* PATTERN - missing middle term, jump NOT given. The oracle derives the jump
     from the printed neighbours and refuses a stem whose knowns disagree. */
  if ((m = text.match(/^What is the missing number in this pattern\? ([\d,? ]+)$/))) {
    const raw = m[1].split(',').map(x => x.trim());
    if (raw.length !== 5) return 'p3 missing: expected five slots';
    const gapAt = raw.indexOf('?');
    if (gapAt < 0 || raw.filter(x => x === '?').length !== 1) return 'p3 missing: expected exactly one ?';
    if (gapAt === 0 || gapAt === 4) return 'p3 missing: the gap must be inside the sequence, not at an end';
    const known = raw.map((x, i) => (i === gapAt ? null : Number(x)));
    if (known.some((v, i) => i !== gapAt && !Number.isFinite(v))) return 'p3 missing: a printed term is not a number';
    let d = null;
    for (let i = 1; i < 5; i++) {
      if (i === gapAt || i - 1 === gapAt) continue;
      const step = known[i] - known[i - 1];
      if (d === null) d = step;
      else if (d !== step) return `p3 missing: the printed terms are not one arithmetic sequence (${d} then ${step})`;
    }
    if (d === null || d === 0) return 'p3 missing: could not derive the jump from the printed terms';
    const e = known[gapAt - 1] + d;
    if (e !== known[gapAt + 1] - d) return 'p3 missing: the two sides of the gap disagree';
    if (e < 1 || e > 9999) return `p3 missing: the answer ${e} is outside 1..9999`;
    /* W2 (Sweep p3numbers Refutation, 2026-09-15): the explanation derived the
       jump from terms[4] and terms[3] whatever the gap index was, so on 33.7% of
       draws it told the child to work from a number that is not on the page - and
       that number was the ANSWER. The teaching sentence is now read back out of
       the rendered explanation and every number it works from must be PRINTED in
       the stem, adjacent, and one jump apart. */
    const ex = strip(q.explain || '');
    const em = ex.match(/next to each other: (\d+) and (\d+) are (\d+) apart/);
    if (!em) return 'p3 missing: the explanation does not say which two numbers the jump comes from';
    const u = Number(em[1]), v = Number(em[2]), apart = Number(em[3]);
    const iu = known.indexOf(u), iv = known.indexOf(v);
    if (iu < 0 || iv < 0) return `p3 missing: the explanation derives the jump from ${u} and ${v}, and one of them is not printed in the stem`;
    if (iu === gapAt || iv === gapAt) return 'p3 missing: the explanation derives the jump from the hidden term';
    if (Math.abs(iu - iv) !== 1) return `p3 missing: the explanation calls ${u} and ${v} neighbours, but they are ${Math.abs(iu - iv)} places apart`;
    if (Math.abs(u - v) !== apart || apart !== Math.abs(d)) return `p3 missing: the explanation says ${u} and ${v} are ${apart} apart, but the jump is ${Math.abs(d)}`;
    const jm = ex.match(/one jump from (\d+) gives/);
    if (!jm) return 'p3 missing: the explanation does not say which number it jumps from';
    if (known.indexOf(Number(jm[1])) < 0 || known.indexOf(Number(jm[1])) === gapAt)
      return `p3 missing: the explanation jumps from ${jm[1]}, which is not a printed term`;
    return near(e, ansNum) ? null : `p3 missing: expected ${e}, got ${ansNum}`;
  }

  /* PATTERN - the odd one out. The oracle finds, independently, the one printed
     position whose value is off the line the other five sit on; it fails unless
     exactly one such position exists, unless the key is that number, and unless
     every other option is a printed term that DOES sit on the line. */
  if ((m = text.match(/^One number does not belong in this pattern\. Which one is it\? ([\d, ]+)$/))) {
    const t = m[1].split(',').map(x => Number(x.trim()));
    if (t.length !== 6 || t.some(v => !Number.isFinite(v))) return 'p3 odd-one-out: expected six printed terms';
    if (t.some(v => v < 1 || v > 9999)) return 'p3 odd-one-out: a term is outside 1..9999: ' + t.join(',');
    const onLine = [];
    for (let i = 0; i < 6; i++) {
      const J = [0, 1, 2, 3, 4, 5].filter(j => j !== i);
      const D = (t[J[1]] - t[J[0]]) / (J[1] - J[0]);
      if (!Number.isInteger(D) || D === 0) continue;
      if (J.every(j => t[j] === t[J[0]] + (j - J[0]) * D)) onLine.push(i);
    }
    if (onLine.length !== 1) return `p3 odd-one-out: ${onLine.length} of the six terms could be the one that does not belong`;
    const e = t[onLine[0]];
    const vals = p3opts(q).map(Number);
    if (vals.length !== 4 || vals.some(v => !Number.isFinite(v))) return 'p3 odd-one-out: expected four numeric options';
    if (vals.filter(v => v === e).length !== 1) return `p3 odd-one-out: the off-pattern number ${e} is not offered exactly once`;
    for (const v of vals) {
      if (v === e) continue;
      if (t.indexOf(v) < 0) return `p3 odd-one-out: the option ${v} is not one of the printed terms`;
    }
    return near(e, ansNum) ? null : `p3 odd-one-out: expected ${e}, got ${ansNum}`;
  }

  /* ADD/SUB - concept check: what the carried 1 is WORTH. The prose form of this
     item was retired by the PM on the SIXTH pass's kill (five lexical axes, five
     passes, the last one answered by the key being the ONLY option with no
     private phrase of its own), and the concept check is now numeric, so this
     oracle re-derives the key from the RENDERED column addition rather than
     matching a sentence. Everything the stem asserts is re-checked:

       - the named source column really does make the printed total, which means
         the columns to its RIGHT must not carry into it;
       - the printed total really does regroup (>= 10) and the digit the stem
         says stays behind really is its ones digit;
       - the column the small 1 is written above is the one immediately LEFT of
         the source column;
       - both addends and their sum are inside the 10 000 ceiling;
       - and the key is that column's place value, re-derived here and never
         read from answerText. */
  if ((m = text.match(/^(\S+(?: \S+)?) works out (\d+) \+ (\d+) in columns\. The (\w+) column makes (\d+), so (?:he|she) writes (\d+) in the (\w+) column and a small 1 above the (\w+) column\. How much is that small 1 worth\?$/))) {
    const a = Number(m[2]), b = Number(m[3]), s = Number(m[5]), keep = Number(m[6]);
    const src = P3_PLACES.indexOf(m[4]), col = P3_PLACES.indexOf(m[8]);
    if (src < 0) return `p3 add-concept: "${m[4]}" is not a column name`;
    if (col < 0) return `p3 add-concept: "${m[8]}" is not a column name`;
    if (m[7] !== m[4]) return `p3 add-concept: the digit stays in the ${m[7]} column but the total was the ${m[4]} column's`;
    if (col !== src - 1) return `p3 add-concept: a carry out of the ${m[4]} column goes to the ${P3_PLACES[src - 1]} column, not the ${m[8]} column`;
    if (String(a).length !== 4 || String(b).length !== 4) return `p3 add-concept: expected two 4-digit addends, got ${a} + ${b}`;
    if (a + b > 9999) return `p3 add-concept: ${a} + ${b} = ${a + b} is past the 10 000 ceiling`;
    const A = p3dig(a), B = p3dig(b);
    for (let i = 3; i > src; i--) {
      if (A[i] + B[i] >= 10) return `p3 add-concept: the ${P3_PLACES[i]} column carries into the ${m[4]} column, so it does not make ${s} on its own`;
    }
    if (A[src] + B[src] !== s) return `p3 add-concept: the ${m[4]} column of ${a} + ${b} makes ${A[src] + B[src]}, not ${s}`;
    if (s < 10) return `p3 add-concept: ${s} does not regroup, so there is nothing to carry`;
    if (s > 19) return `p3 add-concept: two digits cannot make ${s}`;
    if (keep !== s % 10) return `p3 add-concept: ${s} leaves ${s % 10} in the column, not ${keep}`;
    const want = P3_POW[col];
    if (!near(want, ansNum)) return `p3 add-concept: the small 1 above the ${m[8]} column is worth ${want}, got ${ansNum}`;
    /* the four options are bare numbers, so the magnitude rank gate and RULES
       A-D below own the rest; what is asserted per draw is that exactly one of
       them is the value the carry is worth. */
    const hits = p3opts(q).filter(o => Number(o) === want).length;
    if (hits !== 1) return `p3 add-concept: ${hits} of the four options are ${want}`;
    return null;
  }

  /* W2, SEVENTH pass. On three draws in five the stem describes the carry by the
     column TOTAL and never names the column, so the child has to find the column
     before there is a place name to translate. The oracle finds it the same way -
     by adding the columns of the RENDERED addends - and asserts the premise that
     makes the stem answerable at all: exactly ONE column can make the printed
     total. Nothing here reads the generator's answerText. */
  if ((m = text.match(/^(\S+(?: \S+)?) works out (\d+) \+ (\d+) in columns\. One column makes (\d+), so (?:he|she) writes (\d+) in that column and a small 1 above the column on its left\. How much is that small 1 worth\?$/))) {
    const a = Number(m[2]), b = Number(m[3]), s = Number(m[4]), keep = Number(m[5]);
    if (String(a).length !== 4 || String(b).length !== 4) return `p3 add-concept (by total): expected two 4-digit addends, got ${a} + ${b}`;
    if (a + b > 9999) return `p3 add-concept (by total): ${a} + ${b} = ${a + b} is past the 10 000 ceiling`;
    if (s < 10) return `p3 add-concept (by total): ${s} does not regroup, so there is nothing to carry`;
    if (s > 19) return `p3 add-concept (by total): two digits cannot make ${s}`;
    if (keep !== s % 10) return `p3 add-concept (by total): ${s} leaves ${s % 10} in the column, not ${keep}`;
    const A = p3dig(a), B = p3dig(b);
    const made = [];
    for (let i = 3; i >= 0; i--) if (A[i] + B[i] === s) made.push(i);
    if (made.length !== 1) return `p3 add-concept (by total): ${made.length} columns of ${a} + ${b} make ${s}, so "one column makes ${s}" does not point at one column`;
    const src = made[0];
    if (src === 0) return 'p3 add-concept (by total): the thousands column has no column on its left';
    for (let i = 3; i > src; i--) {
      if (A[i] + B[i] >= 10) return `p3 add-concept (by total): the ${P3_PLACES[i]} column carries into the ${P3_PLACES[src]} column, so it does not make ${s} on its own`;
    }
    const want = P3_POW[src - 1];
    if (!near(want, ansNum)) return `p3 add-concept (by total): the small 1 above the ${P3_PLACES[src - 1]} column is worth ${want}, got ${ansNum}`;
    const hits = p3opts(q).filter(o => Number(o) === want).length;
    if (hits !== 1) return `p3 add-concept (by total): ${hits} of the four options are ${want}`;
    return null;
  }

  /* ADD/SUB - direct compute. Also asserts the item is genuinely a REGROUPING
     item, which is the principle this whole skill exists to teach. */
  if ((m = text.match(/^What is (\d+) \+ (\d+)\?$/))) {
    const a = Number(m[1]), b = Number(m[2]), e = a + b;
    if (e > 9999) return `p3 add: ${a} + ${b} = ${e} is past the 10 000 ceiling`;
    if (p3carryCols(a, b).length < 2) return `p3 add: ${a} + ${b} regroups in fewer than two columns, so it is not a regrouping item`;
    return near(e, ansNum) ? null : `p3 add: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^What is (\d+) [−-] (\d+)\?$/))) {
    const a = Number(m[1]), b = Number(m[2]), e = a - b;
    if (e < 1) return `p3 sub: ${a} − ${b} = ${e} is not a positive whole number`;
    if (p3smallFromBig(a, b) === e) return `p3 sub: ${a} − ${b} needs no regrouping, so it is not a regrouping item`;
    return near(e, ansNum) ? null : `p3 sub: expected ${e}, got ${ansNum}`;
  }

  /* ADD/SUB - mental strategy: make the next ten, then adjust */
  if ((m = text.match(/^\S+(?: \S+)? works out (\d+) \+ (\d+) in (?:his|her) head\. (?:He|She) makes (\d+) first\. (\d+) \+ (\d+) = (\d+) \+ \?$/))) {
    const a = Number(m[1]), b = Number(m[2]), r = Number(m[3]);
    if (Number(m[4]) !== a || Number(m[5]) !== b || Number(m[6]) !== r) return 'p3 mental: the stem restates different numbers on its second line';
    if (a < 10 || a > 99 || b < 10 || b > 99) return `p3 mental: MOE 2.2 is two 2-digit numbers, got ${a} and ${b}`;
    /* W1, EIGHTH pass: the two addends are printed in a drawn order now, so the
       number that was rounded up is the FIRST on one draw in two and the SECOND on
       the other. `a + b - r` is the key either way (that is why the item has one
       answer whichever addend the child rounds), so the premise the oracle holds
       the stem to is the weaker, true one: r is the next ten up from one of them. */
    const nextTen = v => r > v && r - v < 10;
    if (r % 10 !== 0 || !(nextTen(a) || nextTen(b)))
      return `p3 mental: ${r} is not the next ten up from ${a} or from ${b}`;
    const e = a + b - r;
    if (e < 1) return `p3 mental: the adjusted part ${e} is not positive`;
    return near(e, ansNum) ? null : `p3 mental: expected ${e}, got ${ansNum}`;
  }

  /* ADD/SUB - error spotting, DIAGNOSE. The printed wrong total must be produced
     by exactly one named misconception, and the two filler options must not
     produce it either. */
  if ((m = text.match(/^\S+(?: \S+)? works out (\d+) \+ (\d+) and gets (\d+)\. What did (he|she) do wrong\?$/))) {
    const a = Number(m[1]), b = Number(m[2]), claim = Number(m[3]), e = a + b;
    if (claim === e) return `p3 add-error: the "wrong" total ${claim} is the correct answer`;
    const cols = p3carryCols(a, b);
    if (!cols.length) return `p3 add-error: ${a} + ${b} regroups in no column, so there is no carry to forget`;
    const key = strip(q.answerText);
    const NOCARRY = ' did not carry any of the tens at all.';
    const oneOf = c => ` forgot the carry in the ${P3_PLACES[c]} column.`;
    const byAll = p3noCarry(a, b) === claim;
    const byOne = cols.filter(c => p3add(a, b, c) === claim);
    if (byAll && byOne.length) return `p3 add-error: ${claim} is produced by two different named slips`;
    if (!byAll && byOne.length !== 1) return `p3 add-error: ${byOne.length} single-carry slips produce ${claim}`;
    const want = byAll ? NOCARRY : oneOf(byOne[0]);
    if (!key.endsWith(want)) return `p3 add-error: ${claim} is the "${want.trim()}" slip but the key reads "${key}"`;
    if (a - b === claim) return `p3 add-error: "subtracted instead of adding" also gives ${claim}`;
    if (p3digitSum(a) + p3digitSum(b) === claim) return `p3 add-error: "added all the digits together" also gives ${claim}`;
    for (const o of p3opts(q)) {
      if (o === key) continue;
      if (o.endsWith(NOCARRY) && byAll) return 'p3 add-error: a distractor repeats the key';
      for (const c of cols) if (o.endsWith(oneOf(c)) && p3add(a, b, c) === claim) return `p3 add-error: a distractor also explains ${claim}: "${o}"`;
    }
    return null;
  }

  /* ADD/SUB - error spotting, CORRECT the mistake. The stem NAMES the slip, so the
     oracle checks the printed wrong answer really is what that slip produces.
     Second pass, 2026-09-15: the v2 "how much bigger is her answer" form and its
     oracle branch are both gone - that rebuild was answered on 97.67% of draws by
     picking the smallest option. A stem in the v2 shape now matches nothing here
     and would be reported as uncovered. The magnitude-rank gate below is what
     keeps this form honest instead. */
  if ((m = text.match(/^\S+(?: \S+)? works out (\d+) [−-] (\d+)\. In every column (?:he|she) takes the smaller digit away from the bigger one, and gets (\d+)\. What is the correct answer\?$/))) {
    const a = Number(m[1]), b = Number(m[2]), claim = Number(m[3]), e = a - b;
    if (p3smallFromBig(a, b) !== claim) return `p3 sub-error: the stem says small-from-big and prints ${claim}, but that slip gives ${p3smallFromBig(a, b)}`;
    if (claim === e) return `p3 sub-error: the "wrong" answer ${claim} is the correct one, so the item contradicts itself`;
    if (e < 1) return `p3 sub-error: ${a} − ${b} is not a positive whole number`;
    return near(e, ansNum) ? null : `p3 sub-error: expected ${e}, got ${ansNum}`;
  }

  /* ADD/SUB - two-step word problem */
  if ((m = text.match(/^The (.+) sold (\d+) (.+) last month\. This month it sold (\d+) more (.+) than last month\. How many (.+) altogether in the two months\?$/))) {
    if (m[3] !== m[5] || m[3] !== m[6]) return 'p3 two-step: the stem changes what it is counting part-way through';
    const first = Number(m[2]), more = Number(m[4]), e = first + (first + more);
    if (e > 9999) return `p3 two-step: the total ${e} is past the 10 000 ceiling`;
    return near(e, ansNum) ? null : `p3 two-step: expected ${e}, got ${ansNum}`;
  }

  /* ADD/SUB - working backwards */
  if ((m = text.match(/^\S+(?: \S+)? had some (.+)\. (?:He|She) gave away (\d+) of them, then bought (\d+) more\. Now (?:he|she) has (\d+)\. How many (.+) did (?:he|she) have at first\?$/))) {
    if (m[1] !== m[5]) return 'p3 backwards: the stem changes what it is counting part-way through';
    const gave = Number(m[2]), got = Number(m[3]), now = Number(m[4]);
    const e = now + gave - got;
    if (e < 1 || e > 9999) return `p3 backwards: the starting amount ${e} is outside 1..9999`;
    if (e - gave < 0) return `p3 backwards: ${e} cannot give away ${gave}`;
    return near(e, ansNum) ? null : `p3 backwards: expected ${e}, got ${ansNum}`;
  }
  /* ===== end SWEEP p3numbers block ======================================== */

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
  const PURE = /^\d+(\.\d+)?( (cm²|cm|m²|m|km|kg|g|ℓ|ml|min|s|°|%))?$/;
  const rawOpts = (q.choices || []).map(strip);
  const numeric = rawOpts.length > 0 && rawOpts.every(c => PURE.test(c));
  const opts = rawOpts.map(parseFloat);
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
/* SWEEP 2026-09-15: p3numbers joins the pilot files, so the format-tell rule and
   the "long" >= "wide" rule now bind Thousand Isles too. */
const PILOT_TOPICS = new Set(['geometry', 'tables', 'p4area', 'p3numbers']);
const optForm = s => {
  const t = strip(s);
  if (/^\$?\d+(\.\d+)?$/.test(t)) return 'number';
  if (/^\$?\d+(\.\d+)?\s*(cm²|cm2|cm|mm|km|m|kg|g|ml|ℓ|h|min|s)$/.test(t)) return 'number+unit';
  if (/^[\d\s+×x*÷/\-=().$]+$/.test(t)) return 'expression';
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

  /* RULE 3, THE PLURALISER (Sweep p3numbers Refutation W1, 2026-09-15). Six
     generators in p3-whole-numbers.js printed "1 tens", "1 ones" or "1 thousands"
     - one of them in the STEM a child reads, on 31% of its draws - in a file that
     already contained the pluraliser that fixes it. This is v4's W-A ("A 18 cm by
     14 cm") in a different dress: an English error in a question a parent reads.
     Every surface the child sees is checked, the EXPLANATION included, because
     five of the six sites were in explanations and no other gate reads those. */
  const prose = [strip(q.q), strip(q.extra || ''), strip(q.explain || '')]
    .concat((q.choices || []).map(strip));
  for (const f of prose) {
    const bad = f.match(/\b1 (tens|ones|hundreds|thousands)\b/);
    if (bad) return `pluraliser: "${bad[0]}" in "${f}"`;
  }
  return null;
}

/* ---------- SWEEP 2026-09-15 gates: p3numbers (Thousand Isles) only ---------
   RULE A, SCOPE CEILING. The topic is "Numbers up to 10 000". No whole number
   printed in a stem, an extra or an option may exceed 9999 - the P3 Pilot
   Refutation caught exactly this leak (gMoreLess offering 17342 as an option on
   a 1000-more item), and a tolerance downstream is not a fix.

   RULE B, THE DISTRACTOR CONTRACT, BINDING ON EVERY DRAW. The 2026-09-05
   refutation's §6 finding was that q.authored only stamped on 2,569 of 7,200
   draws, so the distractor-identity gate was quietly off most of the time. Here
   every four-option question whose options are all plain numbers must declare
   which kind it is: `q.authored` (all three distractors are named
   misconceptions, and nothing was padded in by finishNum) or `q.optionSet` (the
   four options ARE the data the child compares - greatest, smallest, between,
   which list is in order). A question that declares neither fails. */
function sweepGates(q, topic) {
  if (topic !== 'p3numbers') return null;
  const fields = [strip(q.q), strip(q.extra || '')].concat((q.choices || []).map(strip));
  for (const f of fields) {
    for (const tok of (f.match(/\d+/g) || [])) {
      if (Number(tok) > 9999) return `scope: ${tok} is past the 10 000 ceiling, in "${f}"`;
    }
  }
  const opts = (q.choices || []).map(strip);
  /* RULE C, THE FORMAT TELL BY LENGTH. pilotGates already bans an option whose
     coarse FORM is the odd one out. The second refutation's actual kill was
     subtler: gLPerimDiff's key was the only option over four characters, so the
     tell was LENGTH, not form. On a word-answer item every option must therefore
     be in the same size bracket - a key more than 1.4x the longest distractor is
     a question a child can win without the mathematics. (Candidate for promotion
     into pilotGates once the other three pilot files have been measured.) */
  if (opts.length === 4 && q.correct >= 0) {
    const key = opts[q.correct].length;
    const other = Math.max.apply(null, opts.filter((_, i) => i !== q.correct).map(o => o.length));
    if (key > other * 1.4) {
      return `format tell by length: the key is ${key} characters against a longest distractor of ${other} (${opts.join(' | ')})`;
    }
  }
  /* RULE D, THE OPTION-LENGTH CEILING (Sweep p3numbers Refutation §6, 2026-09-15).
     gAddConcept shipped a 68-character option - "Write 5 in the ones column and
     carry 1 ten into the hundreds column." - against a previous bank maximum of
     48 characters (p4pie.gPieWrongStatement) and a bank median of 3, in POOL 1
     where every child meets it, and tools/layout-gate.mjs has never been run on
     this file. 48 is the widest string the bank has actually shipped, so it is
     the ceiling until something has been read on glass. */
  for (const o of opts) {
    if (o.length > 48) return `option length: ${o.length} characters, past the 48-character bank maximum ("${o}")`;
  }
  if (opts.length === 4 && opts.every(o => /^\d+$/.test(o))) {
    if (!Array.isArray(q.authored) && q.optionSet !== true) {
      return `distractor contract: a numeric MC declared neither q.authored nor q.optionSet (${opts.join(' | ')})`;
    }
    if (Array.isArray(q.authored) && q.optionSet === true) {
      return 'distractor contract: a question declared both q.authored and q.optionSet';
    }
  }
  /* RULE E, AN EXPLANATION MAY ONLY NAME A WRONG ANSWER THAT IS ON THE ROW
     (Sweep p3numbers Refutation, SIXTH pass, W5 - and the same class the p2 lane
     closed one pass earlier, where it is rule 5). Four banks ended their
     explanation by naming ONE misconception and its value while the three
     printed distractors are drawn by slipSet out of a LARGER family, so the
     number the sentence blamed was not on the options row on `gSubRegroup`
     52.98%, `gTwoStepWord` 49.95%, `gAddRegroup` 49.15% and `gBuildNum` 38.06%
     of draws. No arithmetic in any of them is wrong and nothing leaks while the
     child is choosing - which is why six passes walked over it - but it is an
     explanation asserting something about the option list that the draw did not
     deliver, and it sends the reader to look for a number that is not on the
     screen. No gate read explanations for this.

     The rule is the narrowest one that binds: every number an explanation names
     immediately after an ANSWER-NAMING verb - "gives", "give you", "you get",
     "answers", "leaves you with", "would give" - must be one of the four printed
     options. A sentence about the key passes, because the key is an option; a
     sentence about a slip that did not ship does not.

     The number must also be TERMINAL - not followed by an operator - because an
     answer is a value and working is a sum. Two pattern banks write "One more
     jump gives 5777 + 100 = 5877", where the number after the verb opens the
     working and the ANSWER is the key at the far end of it; without that
     lookahead the rule fires on both of them and catches neither's defect.
     Everything else a p3numbers explanation prints ("1 thousand = 1000",
     "4739 + 100 = 4839") never follows one of the verbs at all.

     Negative control: the v6 `gSubRegroup` explanation and its own option row,
     rebuilt from their own strings, which must come out RED. */
  {
    const ex = strip(q.explain || '');
    const optNums = new Set();
    for (const o of opts) for (const t of (o.match(/\d+/g) || [])) optNums.add(t);
    let em;
    /* (?!\d) forces the whole digit run to be taken before the operator test, so
       the engine cannot backtrack to a PREFIX of the number and slip past it */
    const re = /\b(gives you|give you|gives|you get|answers|leaves you with|would give) (\d+)(?!\d)(?!\s*[-+−×÷=])/g;
    while ((em = re.exec(ex))) {
      if (!optNums.has(em[2])) {
        return `explanation names an absent answer: "${em[1]} ${em[2]}", but ${em[2]} is not one of the four options (${[...optNums].join(', ')})`;
      }
    }
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
    const sweep = sweepGates(q, g.topic);
    if (sweep) { err = sweep; badQ = q; break; }
    distinct.add(qKey(q));
    const o = oracle(q);
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

/* ---------- MAGNITUDE-RANK GATE (second-pass KILL, 2026-09-15) --------------
   The v2 gSubError rebuild shipped a question that "pick the smallest number on
   the screen" answered on 48,835 of 50,000 draws. Nothing here could see it:
   RULE 1 measures option FORM, RULE C measures the key's LENGTH against the
   longest distractor, RULE D caps option length - all three count characters,
   and every option in that item was four characters or fewer. The tell was
   MAGNITUDE, and the harness had no ruler for it.

   This is the ruler. For every numeric four-option MC bank in the topic it draws
   2,000 items and tallies where the key sits among the four printed numbers by
   SIZE. A bank fails if any one rank takes more than 45% of its draws (chance is
   25%), or if "pick the smallest" or "pick the largest" clears 40%.

   THE FLOOR (Sweep p3numbers Refutation, THIRD pass, W3). The ruler used to be
   one-sided: it failed a rank above 45% and passed a rank at 0.00%. A rank that
   is EMPTY is as much a tell as a rank that is full - it tells the child which
   option to cross out, and crossing one out takes a guesser from 25% to 33.3% on
   100% of draws. gMentalMake's key was never the largest of the four and
   gTwoStepWord's never the smallest, each on 20,000 / 20,000, and four more banks
   sat between 5.8% and 7.2% on one rank. A bank now also fails if any rank falls
   BELOW 12% of its draws. 12% is half of chance and eight standard errors below
   it at this sample size, so a bank that is flat by construction cannot trip it
   by noise.

   EXEMPT - and this is the part the third pass was actually about. The exemption
   used to be a REGEX ON THE STEM, /\b(greatest|smallest|between)\b/, printing
   "there the ordering of the options IS the question". That sentence was true for
   two banks and false for the third: gBetween's stem carries the two bounds on
   100% of draws, so the options are NOT the data, and "pick the third smallest"
   answered a slot the topic file calls "2 steps: check both ends" on 20,000 /
   20,000 draws while this table printed it as exempt. A gate that exempts a bank
   is a claim about that bank and needs the same evidence as a gate that passes
   one.

   So the exemption is now an explicit per-generator ALLOWLIST of two banks, each
   with its measured justification, and the premise of each is re-checked on every
   draw below (an exempt bank whose stem ever prints a digit fails the gate):

     p3numbers.gGreatest - "Which number is the greatest?" The stem carries NO
       number at all on 20,000 / 20,000 draws (measured). The four options are the
       entire data of the question and "the greatest is the largest one" is the
       mathematics, not a shortcut past it.
     p3numbers.gSmallest - "Which number is the smallest?" Same measurement: no
       number in the stem on 20,000 / 20,000 draws, all four options needed.

   Nothing else is exempt - not gBetween, not gOrder, not gPatternOdd, not any
   other optionSet bank. A regex would also have handed a free pass to any future
   numeric bank whose stem merely contained the word: "the difference between 4021
   and 1278" is one sentence away.

   FLAT-RANK EXEMPT, and it is a different exemption from the one above (fourth
   pass, W1, and the PM's ruling on it). MAGNITUDE_EXEMPT above says "the four
   options ARE the data"; its premise is that the stem prints no number. gBetween
   cannot claim that and does not. What it claims is narrower and is measured:

     p3numbers.gBetween - "Which number is between LO and HI?" The three wrong
       answers STRADDLE the range, at least one below LO and at least one above
       HI on 20,000 / 20,000 draws, so neither single bound settles the item -
       the demand the FORMAT comment declares ("2 steps: check both ends") is the
       demand the item makes. The key is inside the range and every distractor
       outside it, so the key's rank IS the count of distractors below it: a
       straddle forces rank 1 or 2 and forbids rank 0 and rank 3. Measured
       0.00 / 49.9 / 50.1 / 0.00 over 20,000 draws, so "pick the second or third
       smallest" is worth ~50% against 25% chance. That is the STRUCTURAL FLOOR
       of any four-option between-item whose distractors straddle, not a property
       of this one, and it is bought with the elimination it removes. v4 took the
       other branch - flat rank, all three wrong answers on one side of the range
       on 49.91% of draws - and shipped an explanation that was false on exactly
       those draws.

   The premise is re-checked on every draw, and it is checked in BOTH directions,
   because "rank 1 or 2 only" is not on its own a claim worth exempting - v3's
   killed option set satisfied it too (far < below < key < above: two wrong
   answers below, one above, key rank 2 on 100.00% of draws, "pick the third
   smallest" deterministic). A flat-rank-exempt bank must therefore show BOTH:

     1. the key is NEVER the smallest and NEVER the largest of the four - the
        straddle actually holds, so neither single bound settles the item; and
     2. the two ranks that remain are SHARED, each at 35% or more of draws - so
        the ~50% is a two-way guess and not the v3 kill wearing an exemption.

   Fail either and the topic goes red. The v3 gBetween negative control below is
   run through the UNEXEMPTED ruler and fails the 45% ceiling there; run through
   this one it would fail clause 2, which is the point of writing clause 2 down.

   The gate carries two negative controls: the v2 gSubError option set and the
   v3 gBetween option set, each rebuilt here from its own arithmetic so neither
   control depends on the topic file still containing the defect. Both must come
   out RED. --- */
const RANK_N = 2000;
const RANK_CAP = 0.45, EXTREME_CAP = 0.40, RANK_FLOOR = 0.12;
const MAGNITUDE_EXEMPT = new Set(['p3numbers.gGreatest', 'p3numbers.gSmallest']);
const FLAT_RANK_EXEMPT = new Set(['p3numbers.gBetween']);
const rankRows = [];
function rankOf(q) {
  const opts = (q.choices || []).map(strip);
  if (opts.length !== 4 || !opts.every(o => /^\d+$/.test(o))) return null;
  const key = Number(strip(q.answerText));
  if (!Number.isFinite(key)) return null;
  const sorted = opts.map(Number).sort((a, b) => a - b);
  const r = sorted.indexOf(key);
  return r < 0 ? null : r;
}
function rankBank(draw) {
  const tally = [0, 0, 0, 0];
  let seen = 0, stem = '', withNumber = 0;
  for (let i = 0; i < RANK_N; i++) {
    let q;
    try { q = draw(); } catch (e) { return { tally, seen, stem, withNumber, threw: e.message }; }
    const r = rankOf(q);
    if (r === null) continue;
    if (!stem) stem = strip(q.q);
    if (/\d/.test(strip(q.q))) withNumber++;
    tally[r]++; seen++;
  }
  return { tally, seen, stem, withNumber };
}
function rankVerdict(row) {
  if (!row.seen) return null;
  const f = row.tally.map(t => t / row.seen);
  if (f[0] > EXTREME_CAP) return `"pick the smallest" answers it on ${(100 * f[0]).toFixed(1)}% of draws`;
  if (f[3] > EXTREME_CAP) return `"pick the largest" answers it on ${(100 * f[3]).toFixed(1)}% of draws`;
  for (let r = 0; r < 4; r++) if (f[r] > RANK_CAP) return `the key is rank ${r} of 4 by size on ${(100 * f[r]).toFixed(1)}% of draws`;
  for (let r = 0; r < 4; r++) if (f[r] < RANK_FLOOR) return `rank ${r} of 4 by size is all but empty - ${(100 * f[r]).toFixed(1)}% of draws, so that option is a free elimination`;
  return null;
}
/* An exemption is a claim, so it is checked. An exempt bank is exempt BECAUSE the
   four options are the whole of the data - which means its stem cannot be
   carrying the question's numbers. If one ever does, the exemption is void and
   the bank must be gated like the rest. This is the line gBetween would have
   failed at b41111e. */
function exemptVerdict(row) {
  if (!row.withNumber) return null;
  return `exempt but its stem prints a number on ${(100 * row.withNumber / row.seen).toFixed(1)}% of draws - the options are not the whole of the data, so the ordering is NOT the question`;
}
/* The flat-rank exemption's premise, re-measured on every draw. Both clauses, in
   the order the header states them. */
const STRADDLE_SHARE = 0.35;
function flatExemptVerdict(row) {
  if (!row.seen) return null;
  const f = row.tally.map(t => t / row.seen);
  if (f[0] > 0 || f[3] > 0)
    return `flat-rank exempt on a STRADDLE premise, but the key is the smallest of the four on ${(100 * f[0]).toFixed(1)}% of draws and the largest on ${(100 * f[3]).toFixed(1)}% - the three wrong answers do not straddle, so one bound settles the item and the exemption is not being paid for`;
  if (Math.min(f[1], f[2]) < STRADDLE_SHARE)
    return `flat-rank exempt, but its two live ranks run ${(100 * f[1]).toFixed(1)}% / ${(100 * f[2]).toFixed(1)}% - the key's rank is all but fixed, which is the third pass's KILL ("pick the third smallest", 100.00%) and not the two-way guess the exemption declares`;
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const row = rankBank(g.fn);
  if (!row.seen) continue;                       /* not a numeric four-option bank */
  row.name = g.name; row.lvl = g.level;
  row.exempt = MAGNITUDE_EXEMPT.has(g.topic + '.' + g.name);
  row.flat = FLAT_RANK_EXEMPT.has(g.topic + '.' + g.name);
  row.err = row.exempt ? exemptVerdict(row) : row.flat ? flatExemptVerdict(row) : rankVerdict(row);
  rankRows.push(row);
  if (row.err) failures++;
}
/* the negative control: the v2 gSubError option set, rebuilt from its own
   arithmetic so the control does not depend on the topic file still containing
   the defect. It must come out RED. */
let rankControl = 'the v2 gSubError option set was not rejected by the rank gate';
{
  const PW = [1000, 100, 10, 1];
  const dg = n => [0, 1, 2, 3].map(i => Math.floor(n / PW[i]) % 10);
  const sfb = (a, b) => { const A = dg(a), B = dg(b); let o = 0; for (let i = 0; i < 4; i++) o += Math.abs(A[i] - B[i]) * PW[i]; return o; };
  const bcols = (a, b) => { const A = dg(a), B = dg(b), o = []; let br = 0; for (let i = 3; i >= 0; i--) { const t = A[i] - br; if (t < B[i]) { o.push(i); br = 1; } else br = 0; } return o; };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const v2SubError = () => {
    for (let g = 0; g < 400; g++) {
      const a = rnd(2000, 9999), b = rnd(1000, a - 1000);
      const key = a - b, claim = sfb(a, b), cols = bcols(a, b);
      if (!cols.length || claim <= key) continue;
      const gap = claim - key, far = gap + PW[cols[0]] * 10;
      const opts = [gap, key, claim, far];
      if (new Set(opts).size !== 4 || opts.some(v => v < 1 || v > 9999)) continue;
      return { q: 'v2 gSubError control', choices: opts.map(String), answerText: String(gap), correct: 0 };
    }
    return { q: 'v2 gSubError control', choices: ['1', '2', '3', '4'], answerText: '2', correct: 0 };
  };
  const ctl = rankBank(v2SubError);
  const verdict = rankVerdict(ctl);
  if (verdict) rankControl = `the v2 gSubError rebuild goes red - ${verdict}`;
  else failures++;
}
/* the second negative control: the v3 gBetween option set, which the stem-word
   regex exempted and which "pick the third smallest" answered on 100% of draws.
   Rebuilt from its own arithmetic, it must come out RED through the same ruler
   that now runs over the real bank. */
let betweenControl = 'the v3 gBetween option set was not rejected by the rank gate';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const v3Between = () => {
    for (let g = 0; g < 400; g++) {
      const lo = rnd(1200, 8600), hi = lo + rnd(40, 700);
      if (hi - lo <= 30) continue;
      const key = lo + rnd(10, hi - lo - 10);
      const below = lo - rnd(5, 300), above = hi + rnd(5, 300), far = lo - rnd(400, 900);
      const opts = [key, below, above, far];
      if (new Set(opts).size !== 4 || opts.some(v => v < 1 || v > 9999)) continue;
      return { q: `Which number is between ${lo} and ${hi}?`, choices: opts.map(String), answerText: String(key), correct: 0 };
    }
    return { q: 'v3 gBetween control', choices: ['1', '2', '3', '4'], answerText: '2', correct: 0 };
  };
  const ctl = rankBank(v3Between);
  const verdict = rankVerdict(ctl);
  if (verdict) betweenControl = `the v3 gBetween option set goes red - ${verdict}`;
  else failures++;
}

/* ---------- LENGTH-RANK GATE (third-pass W4, 2026-09-15) --------------------
   RULE C above measures the key's length against the longest distractor ON ONE
   DRAW, and only upwards: it fails a key more than 1.4x the longest wrong
   answer. RULE D caps the maximum. Neither looks DOWN, and neither looks ACROSS
   DRAWS - so gAddConcept, the pool-1 flagship of this topic, shipped a key that
   was the uniquely SHORTEST of its four options on 20,000 / 20,000 draws at a
   margin of exactly one character, and the second pass's line "no generator has a
   readable shortest-option tell" was true only by that one character.

   This is the other direction and the other axis. For every four-option bank in
   the topic it draws 2,000 items and counts how often the key is the uniquely
   shortest option, and how often it is the uniquely longest. Either at 90% or
   more is a deterministic tell a child can learn without the mathematics, and
   fails the topic. Below that it is reported, because a bank drifting towards it
   is worth seeing before it arrives.

   THE TIED KEY, AND WHY THE PRINTED NUMBER WAS NOT HONEST (fourth pass, W2).
   The ruler counts a draw only when the key is UNIQUELY at the extreme, so a key
   tied with one other option at the minimum reads as 0.0% - and "pick one of the
   shortest options" is worth 50% on every such draw, against 25% chance. Three
   banks live there: gAddConcept and gCompareError are tied at the minimum on
   100% of draws, gExpanded tied at the maximum on 100%, and gAddError is
   UNIQUELY shortest on ~50% and is the only one of the four any pass has named.

   The thresholds do not move: a one-character margin is not readable, which is
   the standard this bank has been held to throughout, and every margin in this
   topic is one character. What moves is the printed number. Two more columns are
   measured and printed - PICK-SHORT and PICK-LONG, the value of "pick one of the
   shortest (longest) options" summed as 1/k over the k options tied at that
   extreme - so a bank whose key is tied at the minimum prints 50.0%, not 0.0%,
   and a bank whose four options are all the same length prints 25.0%, which is
   chance and is the honest number for it too.

   Negative control: the v2 gAddConcept option set, rebuilt here from its own
   strings so the control does not depend on the topic file still containing the
   defect. It must come out RED. --- */
const LEN_N = 2000, LEN_CAP = 0.90;
const lenRows = [];
function lenBank(draw) {
  let n = 0, uShort = 0, uLong = 0, pShort = 0, pLong = 0, step = 0, stepHi = 0, spread = 0;
  for (let i = 0; i < LEN_N; i++) {
    let q;
    try { q = draw(); } catch (e) { return { n, uShort, uLong, pShort, pLong, step, stepHi, spread, threw: e.message }; }
    const opts = (q.choices || []).map(strip);
    if (opts.length !== 4 || !(q.correct >= 0)) continue;
    const L = opts.map(o => o.length);
    const lo = Math.min.apply(null, L), hi = Math.max.apply(null, L);
    const nLo = L.filter(x => x === lo).length, nHi = L.filter(x => x === hi).length;
    if (nLo === 1 && L[q.correct] === lo) uShort++;
    if (nHi === 1 && L[q.correct] === hi) uLong++;
    if (L[q.correct] === lo) pShort += 1 / nLo;
    if (L[q.correct] === hi) pLong += 1 / nHi;
    /* fifth pass, W1: the value of "pick one of the shortest" says nothing about
       whether the eye can SEE which options those are. That is the STEP from the
       shortest option to the next length up - 1 character at 4e50301, 4 at
       cfa2da8 on this bank, and the number no column in this gate printed. */
    const up = L.filter(x => x > lo), dn = L.filter(x => x < hi);
    step += up.length ? Math.min.apply(null, up) - lo : 0;
    stepHi += dn.length ? hi - Math.max.apply(null, dn) : 0;
    spread += hi - lo;
    n++;
  }
  return { n, uShort, uLong, pShort, pLong, step, stepHi, spread };
}
function lenVerdict(row) {
  if (!row.n) return null;
  if (row.uShort / row.n >= LEN_CAP) return `the key is the uniquely SHORTEST option on ${(100 * row.uShort / row.n).toFixed(1)}% of draws`;
  if (row.uLong / row.n >= LEN_CAP) return `the key is the uniquely LONGEST option on ${(100 * row.uLong / row.n).toFixed(1)}% of draws`;
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const row = lenBank(g.fn);
  if (!row.n) continue;
  row.name = g.name; row.lvl = g.level;
  row.err = lenVerdict(row);
  lenRows.push(row);
  if (row.err) failures++;
}
let lenControl = 'the v2 gAddConcept option set was not rejected by the length gate';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const v2AddConcept = () => {
    const s = rnd(12, 18), keep = s % 10;
    const opts = [
      'Write ' + keep + ', carry 1 ten into the tens column.',
      'Write ' + s + ' in the ones column, carry nothing.',
      'Write ' + keep + ', carry 1 ten into the hundreds column.',
      'Write 1, carry ' + keep + ' tens into the tens column.'
    ];
    return { q: 'v2 gAddConcept control', choices: opts, answerText: opts[0], correct: 0 };
  };
  const ctl = lenBank(v2AddConcept);
  const verdict = lenVerdict(ctl);
  if (verdict) lenControl = `the v2 gAddConcept option set goes red - ${verdict}`;
  else failures++;
}

/* ---------- WIDTH-CLASS RANK GATE (seventh-pass KILL, 2026-09-16) -----------
   THREE RULERS POINTED AT THIS OPTION ROW AND ALL THREE MISSED IT. MAGNITUDE
   RANK ranks the key against ALL FOUR options; LENGTH RANK ranks it against the
   EXTREMES (uniquely shortest, uniquely longest, and the value of picking one of
   those); RULES C and D cap its width. Nothing ranked the key against the
   options it is CONFUSABLE WITH - the ones printed at the same width - and that
   is the cell the seventh pass's KILL lived in:

     In this number pattern, what is the jump?  9103, 9203, 9303, 9403
       1000 (4)  |  100 (3) <- key  |  200 (3)  |  10 (2)

   Two options are three characters long; the answer is the smaller of those two.
   No arithmetic, no subtraction, no reading of the run - 69.63% / 69.48% of
   20,000 draws at each of two seeds on gPatternConcept, pool 1's busiest
   generator, while MAGNITUDE RANK printed 16.6 / 31.4 / 35.2 / 16.9 pass and
   LENGTH RANK printed uSHORTEST 0.0% PICK-SHORT 8.4% pass. Both were true.

   THE MECHANISM IS THE HOUSE CONSTRUCTION, NOT ONE BANK. Slip families here are
   built by MULTIPLYING the key - 2*step, keep*POW[col], s*POW[src] - and a small
   multiple of a number is printed at that number's own width, ABOVE it. So
   wherever such a slip ships, the key is the MINIMUM of its own width class by
   construction. The rule fired on six banks of this topic (69.6 / 45.8 / 25.4 /
   23.3 / 9.0 / 6.8%) and it will fire on any slipSet-shaped family in the game.

   WHAT IS MEASURED. Every numeric four-option bank in the topic, 2,000 draws.
   The options are grouped by printed character width; the COMMONEST class is the
   width with the strictly greatest count, and it must hold at least two options
   and must NOT hold all four (a row that is all one width is the magnitude
   gate's business, and "the smallest of all four" is already gated there). If
   there is no such class the rule declines. Otherwise the key is MIN, MID or MAX
   inside that class, or OUT of it - and OUT is a pass, because a rule that fires
   and points at a wrong answer is worse than useless to a child.

   THE GATE. Each of MIN / MID / MAX must stay under 45% of draws, and the two
   rules a child can actually run - "commonest width, then the smallest" and
   "commonest width, then the largest" - must each stay under 40%. NO BANK IS
   EXEMPT and none needs to be: the three comparison anchors print four options
   of one width, so the rule declines on 100% of their draws.

   Negative control: the v7 gPatternConcept option set, rebuilt here from its own
   arithmetic so the control does not depend on the topic file still containing
   the defect. It must come out RED. --- */
/* THE TIE CLAUSE FLOOR IS 5% (Sweep p3numbers Refutation, NINTH pass, Call 3 -
   REJECTED as written, and the refutation's number taken). The clause shipped at
   10%, and the only 2-2 tie left anywhere in the topic is gAddConcept's, at
   8.37 / 8.29% with the key in the NARROWER pair on 100.00% of it - every other
   bank is at 0.00%. A threshold set 1.6 points above the single surviving
   instance is not gating, it is describing: the clause built to catch a 2-2 tie
   with a certainty on it passed the only one in the file. At 5% it fails
   gAddConcept and nothing else, and gAddConcept carries a NAMED exemption with
   the trade written into the gate line, so the certainty the threshold used to
   hide is one the harness says out loud.

   THE TRADE, AND ITS PREMISE, RE-CHECKED. Closing the tie means refusing the
   subsets that make it, which costs 14 of the bank's 64 distinct option rows. A
   64-row board is the larger defect and a 50-row one is worse, so the trade is
   worth making - but only while it is actually being paid for. The exemption is
   therefore void if the board ever falls to 50 rows or fewer, which is exactly
   the board closing the tie would have left. */
const WIDTH_N = 2000, WIDTH_RANK_CAP = 0.45, WIDTH_RULE_CAP = 0.40;
const WIDTH_ELIM_CAP = 0.40, WIDTH_TIE_FLOOR = 0.05, WIDTH_TIE_CAP = 0.95;
/* EMPTY since v11 (2026-09-16). gAddConcept's tie exemption rested on a BOARD
   trade - "closing the 2-2 width tie costs 14 of the bank's 64 option rows, and a
   50-row board is the larger defect". The v11 rebuild makes the board worthless
   instead of wide (7 rows, every one of them worth exactly chance), and the tie it
   still ships puts the key in the wider pair on 50.0% of draws rather than on
   100.0%, so it passes the unexempted branch and needs no allowlist. */
const TIE_EXEMPT = {};
const widthRows = [];
/* BOTH DIRECTIONS (W3 + W4, EIGHTH pass, 2026-09-16). The v8 column scored where
   the key sits INSIDE the commonest class and treated KEY OUT as a pass, so
   nothing measured the other direction - "the key is IN the class, so cross out
   every option that is not the commonest width". On eight banks that elimination
   was a CERTAINTY (KEY IN 100.00% of the draws where a class exists:
   gPatternConcept, gBuildNum, gStandsCompare, gMentalMake, gPattern4, gMoreLess,
   gPatternMissing, gBackFromTotal; gZeroFix 99.83 / 99.78%). And where two widths
   tied 2-2 the ruler DECLINED by design, which is where the tell was loudest:
   gStandsCompare tied on 17.61 / 17.23% of draws with the key in the WIDER pair on
   100.00% of them, gAddConcept on 8.37 / 8.29% with the key in the NARROWER pair on
   100.00%. The column now reads both directions and the tie branch, and gates the
   VALUE of the elimination a child can actually run. */
function widthDetail(opts, correct) {
  const w = opts.map(o => o.length);
  const cnt = new Map();
  for (const x of w) cnt.set(x, (cnt.get(x) || 0) + 1);
  let best = -1, bestW = null, tie = false;
  for (const [ww, c] of cnt) {
    if (c > best) { best = c; bestW = ww; tie = false; }
    else if (c === best) tie = true;
  }
  const key = Number(opts[correct]);
  /* the 2-2 branch: two widths hold the same, largest count, and it is at least
     two - so there is a pair to keep and a pair to cross out, and no commonest
     class for the rank columns to read. Four distinct widths is not this: there
     the rule declines because there is no class at all. */
  if (tie && best >= 2) {
    const widest = Math.max.apply(null, w);
    const keep = opts.filter((o, i) => w[i] === widest).map(Number);
    return { cls: 'none', tie: true, wide: w[correct] === widest, keep: keep };
  }
  if (best < 2 || best === opts.length) return { cls: 'none', tie: false };
  const group = opts.filter((o, i) => w[i] === bestW).map(Number);
  if (w[correct] !== bestW) return { cls: 'out', tie: false, group: group };
  if (key === Math.min.apply(null, group)) return { cls: 'min', tie: false, group: group };
  if (key === Math.max.apply(null, group)) return { cls: 'max', tie: false, group: group };
  return { cls: 'mid', tie: false, group: group };
}
function widthClassOf(opts, correct) { return widthDetail(opts, correct).cls; }
function widthBank(draw) {
  const t = { n: 0, min: 0, mid: 0, max: 0, out: 0, none: 0, tie: 0, tieWide: 0, elim: 0, board: new Set() };
  for (let i = 0; i < WIDTH_N; i++) {
    let q;
    try { q = draw(); } catch (e) { return Object.assign(t, { threw: e.message }); }
    const opts = (q.choices || []).map(strip);
    if (opts.length !== 4 || !opts.every(o => /^\d+$/.test(o)) || !(q.correct >= 0)) continue;
    /* the option BOARD, which is what the tie exemption's trade is paid in */
    t.board.add(opts.slice().sort((a, b) => Number(a) - Number(b)).join(','));
    const d = widthDetail(opts, q.correct);
    t[d.cls]++; t.n++;
    /* ELIM is the value of the whole rule a child can run: keep only the options
       printed at the commonest width, and on a 2-2 tie keep the wider pair; guess
       inside what is left, or across all four when the rule declines. */
    if (d.tie) {
      t.tie++;
      if (d.wide) t.tieWide++;
      t.elim += d.wide ? 1 / d.keep.length : 0;
    } else if (d.cls === 'none') t.elim += 0.25;
    else if (d.cls === 'out') t.elim += 0;
    else t.elim += 1 / d.group.length;
  }
  return t;
}
function widthVerdict(row) {
  if (!row.n) return null;
  const f = k => row[k] / row.n;
  if (f('min') > WIDTH_RULE_CAP)
    return `"take the commonest printed width, then the smallest number in it" answers it on ${(100 * f('min')).toFixed(1)}% of draws`;
  if (f('max') > WIDTH_RULE_CAP)
    return `"take the commonest printed width, then the largest number in it" answers it on ${(100 * f('max')).toFixed(1)}% of draws`;
  for (const k of ['min', 'mid', 'max']) {
    if (f(k) > WIDTH_RANK_CAP)
      return `the key is the ${k.toUpperCase()} of its own printed-width class on ${(100 * f(k)).toFixed(1)}% of draws`;
  }
  /* W3: the KEY IN direction, scored by the VALUE of the elimination rather than
     by the bare rate, because a certainty that cannot fire is not a route. */
  if (f('elim') > WIDTH_ELIM_CAP)
    return `"cross out every option that is not the commonest printed width" is worth ${(100 * f('elim')).toFixed(1)}% to a guesser`;
  /* W4: the tie branch the ruler used to decline on. A bank that ships one often
     must not put the key on the same side of it every time. */
  if (f('tie') >= WIDTH_TIE_FLOOR) {
    const wide = row.tieWide / row.tie;
    if (wide > WIDTH_TIE_CAP || 1 - wide > WIDTH_TIE_CAP) {
      const side = wide > 0.5 ? 'WIDER' : 'NARROWER';
      const rate = (100 * (wide > 0.5 ? wide : 1 - wide)).toFixed(1);
      const said = `two widths tie 2-2 on ${(100 * f('tie')).toFixed(1)}% of draws and the key is in the ${side} pair on ${rate}% of them`;
      const floor = TIE_EXEMPT[row.name];
      if (floor === undefined) return said;
      /* allowlisted by name, and the trade re-checked: the tie is kept because
         closing it would cost 14 of the bank's option rows, so the exemption only
         stands while the board it buys is actually wider than the closed one */
      if (row.board.size <= floor)
        return `tie-exempt by name on a BOARD premise, but the board is ${row.board.size} distinct option rows - closing the tie would leave ${floor}, so the trade is not being paid for`;
      row.tieDeclared = `DECLARED (allowlisted by name): ${said}; kept because closing it costs 14 of ${row.board.size} option rows, and a ${floor}-row board is the larger defect`;
      return null;
    }
  }
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const row = widthBank(g.fn);
  if (!row.n) continue;                          /* not a numeric four-option bank */
  row.name = g.name; row.lvl = g.level;
  row.err = widthVerdict(row);
  widthRows.push(row);
  if (row.err) failures++;
}
let widthControl = 'the v7 gPatternConcept option set was not rejected by the width-class gate';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const v7PatternConcept = () => {
    const step = [10, 100, 1000][rnd(0, 2)];
    const fam = [1, 10, 100, 1000, 2 * step].filter(v => v !== step);
    const below = fam.filter(v => v < step), above = fam.filter(v => v > step);
    const lo = Math.max(0, 3 - above.length), hi = Math.min(3, below.length);
    const r = rnd(lo, hi);
    const opts = shuf(shuf(below).slice(0, r).concat(shuf(above).slice(0, 3 - r)).concat([step]));
    return { q: 'v7 gPatternConcept control', choices: opts.map(String),
             answerText: String(step), correct: opts.indexOf(step) };
  };
  const ctl = widthBank(v7PatternConcept);
  const verdict = widthVerdict(ctl);
  if (verdict) widthControl = `the v7 gPatternConcept option set goes red - ${verdict}`;
  else failures++;
}
/* W3's own control: a row whose key is always inside a TWO-member commonest class
   and never outside it - the elimination is then worth 50% on every draw, which is
   what KEY IN at 100% buys a child when the class is small. */
let elimControl = 'a key always inside a two-member width class was not rejected by the KEY IN direction';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const twoWide = () => {
    const key = rnd(2000, 8000);
    /* 30 draws in 100 print four distinct widths and the rule declines; on the
       other 70 one distractor sits at the key's own width and two are narrower, so
       the elimination keeps TWO options and the key is always one of them. The key
       is the smaller of the pair half the time and the larger half the time, which
       keeps MIN and MAX under their own caps: the only column that can see this
       row is the value of the elimination itself. */
    const opts = rnd(1, 100) <= 30
      ? [String(key), String(rnd(100, 999)), String(rnd(10, 99)), String(rnd(1, 9))]
      : [String(key), String(rnd(0, 1) ? key + rnd(1, 900) : key - rnd(1, 900)),
         String(rnd(10, 99)), String(rnd(100, 999))];
    const sh = shuf(opts);
    return { q: 'two-member width class control', choices: sh,
             answerText: String(key), correct: sh.indexOf(String(key)) };
  };
  const ctl = widthBank(twoWide);
  const verdict = widthVerdict(ctl);
  if (verdict) elimControl = `a key always inside a two-member width class goes red - ${verdict}`;
  else failures++;
}
/* W4's own control: the v8 gStandsCompare tie shape - two widths tying 2-2 on a
   fifth of draws with the key always in the wider pair. */
let tieControl = 'a key always in the wider half of a 2-2 width tie was not rejected';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const tied = () => {
    /* one draw in five ties 2-2 with the key in the wider pair; the rest print
       four distinct widths and decline, so the elimination is worth only 30% and
       the tie clause is the one column that can fail this row. */
    if (rnd(1, 5) > 1) {
      const key = rnd(1000, 9999);
      const sh = shuf([String(key), String(rnd(100, 999)), String(rnd(10, 99)), String(rnd(1, 9))]);
      return { q: '2-2 width tie control', choices: sh,
               answerText: String(key), correct: sh.indexOf(String(key)) };
    }
    const key = rnd(100, 499);
    const sh = shuf([String(key), String(key + rnd(100, 400)), String(rnd(10, 49)), String(rnd(50, 99))]);
    return { q: '2-2 width tie control', choices: sh,
             answerText: String(key), correct: sh.indexOf(String(key)) };
  };
  const ctl = widthBank(tied);
  const verdict = widthVerdict(ctl);
  if (verdict) tieControl = `a key always in the wider half of a 2-2 width tie goes red - ${verdict}`;
  else failures++;
}

/* ---------- SHAPE RULER (eighth-pass KILL, 2026-09-16) ----------------------
   TWO KILLS IN TWO PASSES ON AN AXIS NOTHING IN THIS HARNESS HAD EVER READ. The
   seventh pass killed gPatternConcept on WIDTH; the v8 fix took the key off the
   power-of-ten ladder and left the ladder in the distractor family, and the
   eighth pass killed the same bank again on SHAPE:

     In this number pattern, what is the jump?  1314, 3814, 6314, 8814
       10  |  1  |  2500 <- key  |  100

   Three options are 1-followed-by-zeros and one is not. "Cross out 1, 10, 100 and
   1000, then take the smallest of what is left" answered pool 1's busiest
   generator on 67.07% / 66.44% of 20,000 draws at two seeds, was NEVER wrong when
   it fired (0 exceptions in 40,000), needed no arithmetic and never read the four
   printed terms. MAGNITUDE RANK printed 17.0 / 28.1 / 27.2 / 27.7 pass, LENGTH
   RANK passed, and the WIDTH-CLASS column - added one pass earlier for exactly
   this class of defect - printed 25.6% MIN and passed. All three were true.

   WHAT IS MEASURED. Every numeric four-option bank in the topic, 2,000 draws, and
   three per-option features a child can see without arithmetic:

     "is 1 followed by zeros"      1, 10, 100, 1000
     "is a multiple of 100"        100, 300, 1000, 2500
     "is round to the nearest ten" 10, 20, 150, 250

   Two things are scored for each feature. UNIQUENESS, both directions: the key is
   the only option that HAS it (a pure odd-one-out), or the only option that has it
   NOT (equivalently, all three distractors have it and the key does not). And the
   ROUTE, which is what the kill actually was: cross out every option that has the
   feature - or every option that does not - and then take the smallest or the
   largest of what survives. A route is scored OUTRIGHT over every draw, so a rule
   that declines scores nothing, exactly as the width column scores MIN.

   THE GATE. Neither uniqueness direction may reach 60% of draws, and no route may
   reach 45%.

   THE ROUTE CAP IS 45% AND `gAddConcept` IS ALLOWLISTED BY NAME (Sweep p3numbers
   Refutation, NINTH pass, Call 1 - REJECTED as written, and the refutation's
   number taken). The cap this ruler shipped with was 60%, chosen so that
   `gAddConcept` - which sits at 51.9% structurally, because its key is the value
   of a carried 1 and therefore a power of ten, so on the tens column no multiple
   of ten can be printed below it and on the ones column the key IS 1 - would pass
   under it. A cap set eight points above the one bank that cannot comply is that
   bank's figure plus slack, and no measurement supports the slack. The second
   highest live shape route in the topic is 41.1%. The cap is now 45%, the same
   number the width-class ruler takes, and `gAddConcept` carries a NAMED exemption
   with its premise re-checked on every draw - the mechanism gGreatest, gSmallest
   and gBetween already use on the magnitude gate. It matters immediately: at 60%
   this cap would not have caught the ninth pass's digit-column route on four of
   the seven banks it lit up; at 45% it would have caught all four.

   A FOURTH FEATURE (ninth pass, W5). "Contains a zero digit anywhere" answered
   gStandsCompare on 42.4% of draws and this ruler could not see it: the three
   features it shipped with are all about a number's TAIL, and this one is about
   its BODY. It is at least as visible to a child as the other three, and it was
   found by a feature sweep rather than by anyone's intuition, which is the reason
   it belongs in the ruler rather than in a residual.

   Negative control: the v8 gPatternConcept option set, rebuilt here from its own
   arithmetic so the control does not depend on the topic file still containing the
   defect. It must come out RED on the route. --- */
const SHAPE_N = 2000, SHAPE_UNIQ_CAP = 0.60, SHAPE_RULE_CAP = 0.45;
const SHAPE_FEATURES = [
  ['1 followed by zeros', o => /^10*$/.test(o)],
  ['a multiple of 100', o => Number(o) % 100 === 0],
  ['round to the nearest ten', o => Number(o) % 10 === 0],
  ['carrying a 0 digit', o => o.indexOf('0') !== -1]
];
/* The allowlisted banks, each with the premise its exemption rests on, re-checked
   on every draw. An exemption is a claim; if the premise ever stops holding the
   exemption lapses and the bank runs through the unexempted ruler.

   gAddConcept IS NO LONGER HERE (v11, 2026-09-16). Its exemption rested on "the
     key is the worth of a carried 1, so it is 1 followed by zeros on every draw",
     and the v11 rebuild widens the key set: the bank now asks for the worth of
     the carried 1 OR the worth of the digit that stays, so the key is 1 followed
     by zeros on half the draws and a multiple of a digit on the other half, the
     option row splits 2-2 on this feature, and every route sits at 25.0%. The
     51.9% the exemption was written for is gone with the premise, and an
     exemption whose premise has stopped holding is a failure, not a pass - which
     is exactly what the re-check below printed when the rebuild landed.
   gGreatest / gSmallest - the SAME two banks, on the SAME premise, that the
     magnitude gate has allowlisted since the third pass: their stem prints no
     number, so the four options ARE the data and the ordering IS the question.
     Every shape route ends in "take the largest" or "take the smallest", so on
     these two banks the route the ruler scores is the item. W5's fourth feature
     is what brought them over the line (46.8% and 49.2%), not a change to either
     bank; the eighth pass's three tail features never split their rows hard
     enough to show it. Exempting them from the ROUTE cap and nothing else is the
     same call the magnitude gate already made, written down here too. */
const SHAPE_EXEMPT = {
  gGreatest:   ['the stem prints no number, so the four options ARE the data and the ordering IS the question',
                (o, q) => !/\d/.test(strip(q.q) + ' ' + strip(q.extra || ''))],
  gSmallest:   ['the stem prints no number, so the four options ARE the data and the ordering IS the question',
                (o, q) => !/\d/.test(strip(q.q) + ' ' + strip(q.extra || ''))]
};
const shapeRows = [];
function shapeBank(draw, exempt) {
  const t = { n: 0, premise: 0, f: SHAPE_FEATURES.map(() => ({ uKey: 0, uWrong: 0, outSmall: 0, outLarge: 0, inSmall: 0, inLarge: 0 })) };
  for (let i = 0; i < SHAPE_N; i++) {
    let q;
    try { q = draw(); } catch (e) { return Object.assign(t, { threw: e.message }); }
    const opts = (q.choices || []).map(strip);
    if (opts.length !== 4 || !opts.every(o => /^\d+$/.test(o)) || !(q.correct >= 0)) continue;
    t.n++;
    if (exempt && exempt[1](opts[q.correct], q)) t.premise++;
    const key = Number(opts[q.correct]);
    for (let k = 0; k < SHAPE_FEATURES.length; k++) {
      const has = SHAPE_FEATURES[k][1], c = t.f[k];
      const yes = opts.filter(o => has(o)).map(Number);
      const no = opts.filter(o => !has(o)).map(Number);
      if (yes.length === 1 && yes[0] === key) c.uKey++;
      if (no.length === 1 && no[0] === key) c.uWrong++;
      /* A ROUTE only counts where the shape actually SPLITS the row. If every
         option has the feature, or none does, then "cross out the ones that have
         it and take the largest" IS "take the largest", which is the MAGNITUDE
         RANK gate's business - and that gate allowlists the two comparison
         anchors by name with their premise re-checked, because there the ordering
         is the question. Scoring it here would fail gGreatest and gSmallest on
         the very thing they ask. */
      if (yes.length && no.length) {
        if (Math.min.apply(null, no) === key) c.outSmall++;
        if (Math.max.apply(null, no) === key) c.outLarge++;
        if (Math.min.apply(null, yes) === key) c.inSmall++;
        if (Math.max.apply(null, yes) === key) c.inLarge++;
      }
    }
  }
  return t;
}
function shapeVerdict(row) {
  if (!row.n) return null;
  for (let k = 0; k < SHAPE_FEATURES.length; k++) {
    const name = SHAPE_FEATURES[k][0], c = row.f[k], f = x => c[x] / row.n;
    if (f('outSmall') > SHAPE_RULE_CAP)
      return `"cross out every option that is ${name}, then take the smallest of the rest" answers it on ${(100 * f('outSmall')).toFixed(1)}% of draws`;
    if (f('outLarge') > SHAPE_RULE_CAP)
      return `"cross out every option that is ${name}, then take the largest of the rest" answers it on ${(100 * f('outLarge')).toFixed(1)}% of draws`;
    if (f('inSmall') > SHAPE_RULE_CAP)
      return `"keep only the options that are ${name}, then take the smallest" answers it on ${(100 * f('inSmall')).toFixed(1)}% of draws`;
    if (f('inLarge') > SHAPE_RULE_CAP)
      return `"keep only the options that are ${name}, then take the largest" answers it on ${(100 * f('inLarge')).toFixed(1)}% of draws`;
  }
  return shapeVerdictUniq(row);
}
/* the uniqueness half on its own: the allowlisted bank is exempt from the ROUTE
   cap and from nothing else */
function shapeVerdictUniq(row) {
  if (!row.n) return null;
  for (let k = 0; k < SHAPE_FEATURES.length; k++) {
    const name = SHAPE_FEATURES[k][0], c = row.f[k], f = x => c[x] / row.n;
    if (f('uKey') > SHAPE_UNIQ_CAP)
      return `the key is the ONLY option that is ${name} on ${(100 * f('uKey')).toFixed(1)}% of draws`;
    if (f('uWrong') > SHAPE_UNIQ_CAP)
      return `all three distractors are ${name} and the key is not, on ${(100 * f('uWrong')).toFixed(1)}% of draws`;
  }
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const ex = SHAPE_EXEMPT[g.name];
  const row = shapeBank(g.fn, ex);
  if (!row.n) continue;                          /* not a numeric four-option bank */
  row.name = g.name; row.lvl = g.level;
  row.err = shapeVerdict(row);
  if (ex) {
    /* the premise, re-checked on every draw - not asserted once in a comment */
    if (row.premise === row.n) {
      row.exempt = `exempt from the ROUTE cap (allowlisted by name): ${ex[0]}, re-checked on all ${row.n} draws`;
      row.err = shapeVerdictUniq(row);            /* the uniqueness caps still bind */
    } else {
      row.err = `allowlisted by name, but the premise FAILED - ${ex[0]} on only ${(100 * row.premise / row.n).toFixed(1)}% of draws`;
    }
  }
  shapeRows.push(row);
  if (row.err) failures++;
}
let shapeControl = 'the v8 gPatternConcept option set was not rejected by the shape ruler';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const v8PatternConcept = () => {
    let step, fam;
    if (rnd(0, 2) === 0) {                       /* the counting anchor, one draw in three */
      step = [10, 100, 1000][rnd(0, 2)];
      fam = [1, 10, 100, 1000].filter(v => v !== step);
    } else {                                     /* the v8 in-between branch */
      step = [15, 25, 150, 250, 1500, 2500][rnd(0, 5)];
      fam = [1, 10, 100, 1000, 2 * step, 3 * step].filter(v => v !== step && v <= 9999);
    }
    const opts = shuf(shuf(fam).slice(0, 3).concat([step])).map(String);
    return { q: 'v8 gPatternConcept control', choices: opts,
             answerText: String(step), correct: opts.indexOf(String(step)) };
  };
  const ctl = shapeBank(v8PatternConcept);
  const verdict = shapeVerdict(ctl);
  if (verdict) shapeControl = `the v8 gPatternConcept option set goes red - ${verdict}`;
  else failures++;
}

/* ---------- COLUMN RULER (ninth-pass KILL, 2026-09-16) ----------------------
   NINE RULERS READ THIS TOPIC AND NOT ONE OF THEM EVER READ ACROSS THE FOUR
   PRINTED NUMBERS DIGIT BY DIGIT. MAGNITUDE ranks the key against all four;
   LENGTH ranks it against the extremes; WIDTH-CLASS ranks it inside its own
   width; SHAPE reads each option's roundness; PHRASE reads prose. The ninth pass
   read the option row as a COLUMN OF DIGITS and the topic fell over:

     What is the missing number in this pattern?  3069, ?, 3469, 3669, 3869
       1269  |  3469  |  2869  |  3269 <- key
     Thousands: 1, 3, 2, 3 - cross out 1269 and 2869. Hundreds: 2, 4, 8, 2 -
     cross out 3469. One answer left, and it is right. The run was never read.

         "Look down each column of the four answers.
          If a digit is in the minority there, cross that answer out."

   answered gPatternMissing - pool 3, served 2.12 items per 30-item session at
   0.80 accuracy - on 72.58 / 72.68% of 20,000 draws at two seeds, with no
   arithmetic and without the stem being read at all; gMoreLess on 77.7%,
   gPattern4 on 67.1%, gSubError / gSubRegroup / gMissingAddend on 58.5 - 58.8%
   and gAddRegroup on 53.7%.

   IT WAS slipSet's OWN DESIGN PRINCIPLE, MEASURED FROM THE OUTSIDE - see the
   long comment on slipSet in js/topics/p3-whole-numbers.js for the algebra, for
   why the ninth pass's own proposed contract ("at most one slip per draw may
   differ from the key in exactly one digit column") does NOT close it, and for
   the two row shapes that do.

   WHAT IS MEASURED, on every numeric four-option bank in the topic, 2,000 draws,
   off the RENDERED options and nothing else. The four numbers are laid out
   right-aligned by place value, exactly as a child reads a column; a number that
   does not reach a column has a BLANK there and a blank is a symbol like any
   other. Then, in both directions:

     ROUTE   the elimination leaves exactly one option standing and it is the key
     VALUE   what the elimination is WORTH - cross out every minority digit, then
             guess among whatever is left. 25% is chance; the rule leaving all
             four, or crossing the whole row out, scores exactly chance. This is
             the unit Call 2 of the ninth pass argued for and it is the one that
             binds here too: a rate is not a route, a value is.
     LONER   the MIRROR, and the direction residual 3 has declared on gPatternOdd
             since the sixth pass: the option that stands ALONE in some column
             while the rest agree, taken as the answer.
     3-of-4  reported, not gated: how often some column carries the key's digit in
             exactly three of the four printed numbers. That shape hands one
             option away as a free cross-out, and what a free cross-out is worth
             is what VALUE already measures.

   THE GATE. ROUTE, VALUE and LONER each under 40%. No bank is exempt.

   Negative control: the v9 gPatternMissing option set, rebuilt here from its own
   arithmetic so the control does not depend on the topic file still containing
   the defect. It must come out RED. --- */
const COL_N = 2000, COL_ROUTE_CAP = 0.40, COL_VALUE_CAP = 0.40, COL_LONER_CAP = 0.40;
const colRows = [];
function colGrid(opts) {
  const d = opts.map(o => o.split('').reverse());
  let w = 0;
  for (const x of d) if (x.length > w) w = x.length;
  const cols = [];
  for (let i = 0; i < w; i++) cols.push(d.map(x => i < x.length ? x[i] : ' '));
  return cols;
}
function colBank(draw) {
  const t = { n: 0, route: 0, value: 0, loner: 0, three: 0 };
  for (let i = 0; i < COL_N; i++) {
    let q;
    try { q = draw(); } catch (e) { return Object.assign(t, { threw: e.message }); }
    const opts = (q.choices || []).map(strip);
    if (opts.length !== 4 || !opts.every(o => /^\d+$/.test(o)) || !(q.correct >= 0)) continue;
    t.n++;
    const cols = colGrid(opts);
    const alive = [true, true, true, true], lone = [false, false, false, false];
    let three = false;
    for (const col of cols) {
      const cnt = new Map();
      for (const c of col) cnt.set(c, (cnt.get(c) || 0) + 1);
      let max = 0;
      for (const v of cnt.values()) if (v > max) max = v;
      for (let k = 0; k < 4; k++) {
        if (cnt.get(col[k]) < max) alive[k] = false;
        if (cnt.get(col[k]) === 1 && max >= 2) lone[k] = true;
      }
      if (cnt.get(col[q.correct]) === 3) three = true;
    }
    let n = 0;
    for (const a of alive) if (a) n++;
    if (n === 1 && alive[q.correct]) t.route++;
    t.value += n ? (alive[q.correct] ? 1 / n : 0) : 0.25;
    const idx = [];
    for (let k = 0; k < 4; k++) if (lone[k]) idx.push(k);
    if (idx.length === 1 && idx[0] === q.correct) t.loner++;
    if (three) t.three++;
  }
  return t;
}
function colVerdict(row) {
  if (!row.n) return null;
  const f = k => row[k] / row.n;
  if (f('route') > COL_ROUTE_CAP)
    return `"in each column cross out any answer whose digit is in the minority" answers it outright on ${(100 * f('route')).toFixed(1)}% of draws`;
  if (f('value') > COL_VALUE_CAP)
    return `that elimination is worth ${(100 * f('value')).toFixed(1)}% to a guesser`;
  if (f('loner') > COL_LONER_CAP)
    return `the MIRROR - "take the answer that stands alone in a column" - answers it on ${(100 * f('loner')).toFixed(1)}% of draws`;
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const row = colBank(g.fn);
  if (!row.n) continue;                          /* not a numeric four-option bank */
  row.name = g.name; row.lvl = g.level;
  row.err = colVerdict(row);
  colRows.push(row);
  if (row.err) failures++;
}
let colControl = 'the v9 gPatternMissing option set was not rejected by the column ruler';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const okv = v => Number.isInteger(v) && v >= 1 && v <= 9999;
  /* v9's slipSet: the below/above split drawn, then the three slips taken
     UNIFORMLY from each side - no column scoring anywhere. */
  const v9SlipSet = (key, family, keepOne) => {
    const seen = new Set([key]);
    const usable = v => okv(v) && !seen.has(v) && Math.abs(v - key) >= 10;
    const live = keepOne.filter(usable);
    if (!live.length) return null;
    const kept = live[rnd(0, live.length - 1)];
    seen.add(kept);
    const below = [], above = [];
    for (const v of family) { if (!usable(v)) continue; seen.add(v); (v < key ? below : above).push(v); }
    const lo = Math.max(0, 2 - above.length), hi = Math.min(2, below.length);
    if (lo > hi) return null;
    const r = rnd(lo, hi);
    return shuf(shuf(below).slice(0, r).concat(shuf(above).slice(0, 2 - r)).concat([kept]));
  };
  const v9PatternMissing = () => {
    for (let tries = 0; tries < 200; tries++) {
      const step = [100, 150, 200, 250, 500][rnd(0, 4)];
      const up = rnd(0, 1) === 0, s = up ? step : -step;
      const start = up ? rnd(1000 + step, 9999 - 5 * step) : rnd(1000 + 5 * step, 9999 - step);
      const gap = rnd(1, 3);
      const terms = [0, 1, 2, 3, 4].map(k => start + k * s);
      const key = terms[gap];
      const cands = v9SlipSet(key,
        [terms[gap - 1], key + s / 10, key - s / 10, terms[gap - 1] + 2 * s, key + 10 * s, key - 10 * s],
        [terms[4] + s, terms[0] - s, key + 10 * s, key - 10 * s]);
      if (!cands || cands.length !== 3) continue;
      const set = new Set([key].concat(cands));
      if (set.size !== 4 || !cands.every(okv)) continue;
      const opts = shuf([key].concat(cands)).map(String);
      return { q: 'v9 gPatternMissing control', choices: opts,
               answerText: String(key), correct: opts.indexOf(String(key)) };
    }
    return { q: '', choices: [] };
  };
  const ctl = colBank(v9PatternMissing);
  const verdict = colVerdict(ctl);
  if (verdict) colControl = `the v9 gPatternMissing option set goes red - ${verdict}`;
  else failures++;
}

/* ---------- PHRASE RULER (fifth-pass KILL, 2026-09-16) ----------------------
   NOTHING IN THIS HARNESS READ THE WORDS UNTIL v5, AND THEN IT READ TWO OF THEM.
   RULE C and RULE D count characters; the LENGTH RANK gate counts characters in
   the other direction; the MAGNITUDE RANK gate counts numbers. The v5 TOKEN
   RULER read tokens and ADJACENT PAIRS - and the fifth pass answered the pool-1
   flagship with a FOUR-word phrase, "ten into the tens", on 20,000 / 20,000
   draws at two seeds, while the gate printed 0.00% at n = 1 and n = 2 and
   reported the bank clean. Its negative control could not save it either: the
   control rebuilt the v4 option set, whose tell was a BIGRAM, so it certified
   the ruler against the defect the ruler was built from rather than against the
   class it names. Five kills, five axes, and each new gate was built exactly one
   notch short of the next one: magnitude after form, character length after
   magnitude, a word after character length, and now a PHRASE after a word.

   This ruler is built so there is no next notch on this axis. It reads

     PHRASES OF EVERY LENGTH.  Not tokens and pairs: every contiguous n-gram at
       every n from one word to the whole option, over THREE token streams - raw,
       lightly stemmed ("tens" -> "ten", so a plural cannot hide a repeat), and
       digit-normalised-plus-stemmed (every run of digits -> "#", so a phrase is
       not diluted by the draw's own numbers changing under it, which was the v5
       ruler's other written-down blind spot).

     WORD SETS, UNORDERED.  Every combination of the key's words up to size
       three, present in the key and absent from all three distractors. This is
       the axis that answered v5 in its simplest form: the key was the only
       option holding both "ten" and "tens", so a child scanning for "ten ...
       tens" did not even need them in order. Raw and stemmed.

   TWO BOUNDS, AND WHY THEY ARE THERE RATHER THAN HIDDEN.

     (a) A key-only phrase cannot be eliminated at EVERY n. The whole key is one
         of its own n-grams and no distractor may equal the key, so at n = the
         key's own length every four-option bank in the game is "100% key-only"
         and an uncapped phrase FAILURE rule is unsatisfiable by construction.
         What a child can actually use is a SHORT distinctive phrase, so the
         failure rule is capped at PHRASE_CAP words - and the SHORTEST key-only
         phrase length is measured with no cap at all and printed for every bank
         on every run, so a tell sitting just above the cap is visible rather
         than absent. gAddConcept at cfa2da8 printed 4; at HEAD it prints 10.

     (b) The same is true of word sets - the key's FULL word set is key-only
         unless some distractor holds every word it holds - so the failure rule
         is capped at three words, and the uncapped fact is printed instead: the
         SUPERSET column says how often a distractor holds every word the key
         holds, which is the only construction that kills the word-set axis at
         every size at once. A bank at 100% there cannot be answered by any word
         combination, ordered or not, of any size.

   A bank fails when one feature inside those bounds clears 60% of its draws in
   either direction - (a) key-only, a child picking the key out by a phrase; or
   (b) present in all three distractors and absent from the key, a child crossing
   three options out by one. 60% is well clear of the honest structural halves
   this bank has: gCompareError's two flavours put "only" in the key and nowhere
   else on ~50% of draws, gAddError's "forgot" on ~50%, gStandsError's "not" on
   ~43% - each is the item's own two- or three-way design showing through, not a
   shortcut past it, and each is reported rather than failed.

   Negative control: the v5 gAddConcept option set, rebuilt here from its own
   strings so the control does not depend on the topic file still containing the
   defect. It must come out RED - and it must come out red on a FOUR-word phrase
   and on the two-word SET, neither of which the v5 ruler could see. --- */
/* THE MIRROR COLUMN (sixth-pass KILL, 2026-09-16). Every column the v6 ruler
   printed was a fact about the KEY - key-only phrase, key-only word set,
   all-wrong phrase, the key's MIN-n, and how often a distractor is a superset of
   the key. The v6 `gAddConcept` rebuild lifted the key's MIN-n to 10 words and
   left the three distractors at 1, 1 and 2 ("14", "right", "Write 1"), so the
   key became the only option in the bank with nothing of its own: "cross out the
   three options that say something none of the others say and take the one that
   is left" answered the pool-1 flagship on 100.00% of 20,000 draws at each of
   two seeds. The row printed `MIN-n 10 ... pass`, and the evidence of safety and
   the mechanism of the defect were the same number read from opposite ends.

   The ruler now measures EVERY option the same way and gates the SPREAD. For
   each draw the shortest private phrase of all four options is computed - a
   phrase present in that option and absent from the other three - and the bank
   FAILS when the key's exceeds EVERY distractor's by more than GAP_CAP words on
   60% or more of draws. A key-only phrase that is long is not a defect on its
   own; a key-only phrase that is long while every distractor's is short IS one,
   because the difference is what a child eliminates on. The three distractor
   values are printed as min / mid / max on every run next to the key's, so the
   comparison that answers the item is visible in the row that certifies it.

   The general lesson, which this ruler is the fix for: a ruler that measures
   only the key is measuring half the item. Every option on a four-option row is
   a choice the child compares against the others, so the property worth gating
   is a property of the spread across four, never of one of them. */
const TOK_N = 2000, TOK_CAP = 0.60, PHRASE_CAP = 6, SET_CAP = 3, GAP_CAP = 2;
const tokRows = [];
const stemTok = w => (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) ? w.slice(0, -1) : w;
const tokenise = s => (strip(s).toLowerCase().match(/[a-z0-9]+/g) || []);
/* feature -> phrase length in words, over the three streams */
function phraseFeats(t) {
  const out = new Map();
  const streams = [['r', t], ['s', t.map(stemTok)], ['#', t.map(w => /^\d+$/.test(w) ? '#' : stemTok(w))]];
  for (const [tag, arr] of streams)
    for (let n = 1; n <= arr.length; n++)
      for (let i = 0; i + n <= arr.length; i++) out.set(tag + ':' + arr.slice(i, i + n).join(' '), n);
  return out;
}
function setsUpTo(words, k) {
  const out = [];
  const rec = (start, cur) => {
    if (cur.length) out.push(cur.slice());
    if (cur.length === k) return;
    for (let i = start; i < words.length; i++) { cur.push(words[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  return out;
}
function tokBank(draw) {
  const keyOnly = new Map(), wrongOnly = new Map(), setOnly = new Map(), shortest = new Map();
  let n = 0, sample = null, superset = 0;
  /* the mirror column: the key's own MIN-n summed, the three distractors' summed
     as min / mid / max, and how often the key's exceeds all three by > GAP_CAP */
  let dn = 0, kSum = 0, dLo = 0, dMid = 0, dHi = 0, gap = 0, gapSample = null;
  const out = () => ({ n, keyOnly, wrongOnly, setOnly, shortest, superset, sample,
                       dn, kSum, dLo, dMid, dHi, gap, gapSample });
  for (let i = 0; i < TOK_N; i++) {
    let q;
    try { q = draw(); } catch (e) { const r = out(); r.threw = e.message; return r; }
    const opts = (q.choices || []).map(strip);
    if (opts.length !== 4 || !(q.correct >= 0)) continue;
    if (opts.every(o => /^\d+$/.test(o))) continue;      /* bare-number banks: the magnitude ruler owns those */
    const T = opts.map(tokenise);
    const F = T.map(phraseFeats);
    const k = q.correct, w = [0, 1, 2, 3].filter(j => j !== k);
    let minN = Infinity;
    for (const [f, len] of F[k]) if (w.every(j => !F[j].has(f))) {
      if (len < minN) minN = len;
      if (len <= PHRASE_CAP) {
        keyOnly.set(f, (keyOnly.get(f) || 0) + 1);
        if (!sample) sample = opts.slice();
      }
    }
    shortest.set(minN, (shortest.get(minN) || 0) + 1);
    /* the same measurement, run on the three DISTRACTORS (sixth-pass KILL) */
    {
      const privMin = idx => {
        const others = [0, 1, 2, 3].filter(j => j !== idx);
        let mn = Infinity;
        for (const [f, len] of F[idx]) if (len < mn && others.every(j => !F[j].has(f))) mn = len;
        return mn;
      };
      const dm = w.map(privMin).sort((x, y) => x - y);
      if (Number.isFinite(minN) && dm.every(Number.isFinite)) {
        dn++; kSum += minN; dLo += dm[0]; dMid += dm[1]; dHi += dm[2];
        if (minN - dm[2] > GAP_CAP) { gap++; if (!gapSample) gapSample = opts.slice(); }
      }
    }
    for (const [f, len] of F[w[0]]) if (len <= PHRASE_CAP && F[w[1]].has(f) && F[w[2]].has(f) && !F[k].has(f)) {
      wrongOnly.set(f, (wrongOnly.get(f) || 0) + 1);
      if (!sample) sample = opts.slice();
    }
    /* unordered word sets, raw and stemmed. The two streams overlap on every
       word a stem does not change, so the hits are deduped INSIDE the draw
       before they are tallied: a feature found twice in one draw is still one
       draw, not two. */
    {
      const hit = new Set();
      let sup = false;
      for (const st of [x => x, stemTok]) {
        const S = T.map(t => new Set(t.map(st)));
        const kw = [...new Set(T[k].map(st))];
        if (w.some(j => kw.every(x => S[j].has(x)))) sup = true;
        for (const c of setsUpTo(kw, SET_CAP))
          if (w.every(j => !c.every(x => S[j].has(x)))) hit.add('{' + c.slice().sort().join(' + ') + '}');
      }
      if (sup) superset++;
      for (const f of hit) setOnly.set(f, (setOnly.get(f) || 0) + 1);
      if (hit.size && !sample) sample = opts.slice();
    }
    n++;
  }
  return out();
}
const tokTop = m => [...m.entries()].reduce((a, e) => e[1] > a[1] ? e : a, ['-', 0]);
const tokMinN = row => [...row.shortest.entries()].reduce((a, e) => e[1] > a[1] ? e : a, [0, 0])[0];
const tokDist = row => row.dn ? [row.dLo / row.dn, row.dMid / row.dn, row.dHi / row.dn] : [0, 0, 0];
function tokVerdict(row) {
  if (!row.n) return null;
  const k = tokTop(row.keyOnly), w = tokTop(row.wrongOnly), s = tokTop(row.setOnly);
  const opts = row.sample ? `  (${row.sample.join(' | ')})` : '';
  /* THE MIRROR RULE (sixth-pass KILL): the key has no phrase of its own and each
     distractor does, so the child crosses out the three that say something none
     of the others say and takes the one that is left. */
  if (row.dn && row.gap / row.dn >= TOK_CAP) {
    const d = tokDist(row).map(x => x.toFixed(2));
    const g = row.gapSample ? `  (${row.gapSample.join(' | ')})` : opts;
    return `the KEY's shortest private phrase is more than ${GAP_CAP} words longer than EVERY distractor's on ${row.gap} of ${row.dn} draws (${(100 * row.gap / row.dn).toFixed(1)}%), at or over the ${Math.round(100 * TOK_CAP)}% ceiling - MIN-n key ${(row.kSum / row.dn).toFixed(2)} against distractors ${d[0]} / ${d[1]} / ${d[2]}; a child crosses out the three options that say something none of the others say${g}`;
  }
  if (k[1] / row.n >= TOK_CAP)
    return `"${k[0]}" is in the KEY and in no distractor on ${k[1]} of ${row.n} draws (${(100 * k[1] / row.n).toFixed(1)}%), at or over the ${Math.round(100 * TOK_CAP)}% ceiling - a child picks the key out by that phrase alone${opts}`;
  if (s[1] / row.n >= TOK_CAP)
    return `the word set ${s[0]} is in the KEY and in no distractor on ${s[1]} of ${row.n} draws (${(100 * s[1] / row.n).toFixed(1)}%), at or over the ${Math.round(100 * TOK_CAP)}% ceiling - a child picks the key out by those words in any order${opts}`;
  if (w[1] / row.n >= TOK_CAP)
    return `"${w[0]}" is in ALL THREE distractors and not in the key on ${w[1]} of ${row.n} draws (${(100 * w[1] / row.n).toFixed(1)}%), at or over the ${Math.round(100 * TOK_CAP)}% ceiling - a child crosses three options out by that phrase alone${opts}`;
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const row = tokBank(g.fn);
  if (!row.n) continue;
  row.name = g.name; row.lvl = g.level;
  row.err = tokVerdict(row);
  tokRows.push(row);
  if (row.err) failures++;
}
let tokControl = 'the v5 gAddConcept option set was not rejected by the phrase ruler';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const v5AddConcept = () => {
    const s = rnd(12, 18), keep = s % 10;
    const opts = [
      'Write ' + keep + ', carry 1 ten into the tens column.',
      'Write ' + s + ' in the ones column, carry no ten.',
      'Write ' + keep + ', carry 1 ten into the hundreds column.',
      'Write 1 and carry ' + keep + ' tens into the tens column.'
    ];
    return { q: 'v5 gAddConcept control', choices: opts, answerText: opts[0], correct: 0 };
  };
  const ctl = tokBank(v5AddConcept);
  const verdict = tokVerdict(ctl);
  const phrase = tokTop(ctl.keyOnly), set = tokTop(ctl.setOnly);
  /* the control is only doing its job if BOTH new axes fire: the four-word
     phrase the v5 ruler was one notch short of, and the unordered pair */
  const phraseOk = phrase[1] / ctl.n >= TOK_CAP && /ten into the ten/.test(phrase[0]);
  const setOk = set[1] / ctl.n >= TOK_CAP && /ten \+ tens/.test(set[0]);
  if (verdict && phraseOk && setOk)
    tokControl = `the v5 gAddConcept option set goes red - "${phrase[0]}" key-only on ${(100 * phrase[1] / ctl.n).toFixed(1)}% (a FOUR-word phrase, which the v5 ruler could not see) and the word set ${set[0]} key-only on ${(100 * set[1] / ctl.n).toFixed(1)}%; shortest key-only phrase ${tokMinN(ctl)} words`;
  else failures++;
}
/* the THIRD negative control, for the mirror rule: the v6 gAddConcept option
   set, which every column the v6 ruler printed reported as `pass`. It must come
   out red, and it must come out red ON THE GAP - a key MIN-n of 10 words against
   distractors at 1 / 1 / 2 - because none of the v6 axes can see it. */
let gapControl = 'the v6 gAddConcept option set was not rejected by the mirror rule';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const v6AddConcept = () => {
    const s = rnd(12, 18), keep = s % 10;
    const opts = [
      'Write ' + keep + ', carry 1 ten to the column on its left.',
      'Write ' + s + ', carry 1 ten to the column on its left.',
      'Write ' + keep + ', carry 1 ten to the column on its right.',
      'Write 1 ten, carry ' + keep + ' to the column on its left.'
    ];
    return { q: 'v6 gAddConcept control', choices: opts, answerText: opts[0], correct: 0 };
  };
  const ctl = tokBank(v6AddConcept);
  const verdict = tokVerdict(ctl);
  const d = tokDist(ctl), keyMin = ctl.dn ? ctl.kSum / ctl.dn : 0;
  /* the control is only doing its job if the MIRROR rule is what fires: the v6
     set is clean on every axis the v6 ruler carried, so a red on one of those
     would mean the control had drifted off the class it exists to certify. */
  const mirrorFired = !!verdict && /shortest private phrase/.test(verdict);
  const shape = ctl.dn && keyMin >= 8 && d[2] <= 3 && ctl.gap / ctl.dn >= TOK_CAP;
  const oldAxesQuiet = tokTop(ctl.keyOnly)[1] / ctl.n < TOK_CAP &&
                       tokTop(ctl.setOnly)[1] / ctl.n < TOK_CAP &&
                       tokTop(ctl.wrongOnly)[1] / ctl.n < TOK_CAP;
  if (mirrorFired && shape && oldAxesQuiet)
    gapControl = `the v6 gAddConcept option set goes red on the MIRROR rule - MIN-n key ${keyMin.toFixed(2)} words against distractors ${d[0].toFixed(2)} / ${d[1].toFixed(2)} / ${d[2].toFixed(2)} on ${(100 * ctl.gap / ctl.dn).toFixed(1)}% of draws - while every axis the v6 ruler carried reports it clean (key-only phrase ${(100 * tokTop(ctl.keyOnly)[1] / ctl.n).toFixed(1)}%, key-only word set ${(100 * tokTop(ctl.setOnly)[1] / ctl.n).toFixed(1)}%, all-wrong ${(100 * tokTop(ctl.wrongOnly)[1] / ctl.n).toFixed(1)}%, SUPERSET ${(100 * ctl.superset / ctl.n).toFixed(1)}%)`;
  else failures++;
}
/* the negative control for RULE E: the v6 gSubRegroup explanation on its own
   option row, with the "commonest slip" value left off the row exactly as
   slipSet left it off on 52.98% of draws. */
let explControl = 'the v6 gSubRegroup explanation was not rejected by RULE E';
{
  const ctlQ = {
    q: 'What is 5042 − 1867?', extra: '',
    choices: ['3175', '3275', '3165', '4175'], correct: 0, answerText: '3175',
    authored: [3275, 3165, 4175],
    explain: '5042 − 1867 = 3175. In the ones column you cannot take away enough, so you take one ' +
      'from the column on its left and turn it into ten. Taking the smaller digit away from the ' +
      'bigger one in every column instead - which is the commonest slip - gives 3182.'
  };
  const hit = sweepGates(ctlQ, 'p3numbers');
  if (hit && /explanation names an absent answer/.test(hit) && /3182/.test(hit))
    explControl = `the v6 gSubRegroup explanation goes red - ${hit}`;
  else failures++;
}

/* ---------- READING A NUMERIC ROW OFF ANY OPTION SET (v11, 2026-09-16) --------
   THE STRUCTURAL FINDING OF THE TENTH PASS, in one line of code repeated five
   times. Every numeric ruler in this file was gated on

       if (opts.length !== 4 || !opts.every(o => /^\d+$/.test(o))) return null;

   so magnitude, length, width-class, shape and column all returned null the
   moment an option stopped being a bare numeral - and the six prose banks were
   left to the phrase ruler, which reads words. `gCompareError` was answered
   outright on 100.00% of draws by counting the characters in the two numbers its
   stem printed, and no ruler with the shape to find it could see the row at all.

   The gate is now a READING, not a test. `numRow` returns the four options as
   numerals whenever the row can honestly be read as four numbers - bare numerals
   as before, PLACE NAMES at their place value ("the hundreds" -> 100), and mixed
   rows where each option carries exactly one numeral ("12 cm" -> 12). Every
   numeric ruler then runs on that reading, so a bank that answers with a place
   name or a measurement is gated by the same five rulers as a bank that answers
   with a bare number. Rows whose options carry NO numeral, or more than one
   (comparison statements, expanded forms, ordered lists), are not numbers and
   are not pretended to be: they go to the OPTION-ROW GEOMETRY ruler below. --- */
const PLACE_VALUE = {
  one: 1, ones: 1, ten: 10, tens: 10, hundred: 100, hundreds: 100,
  thousand: 1000, thousands: 1000, 'ten thousand': 10000, 'ten thousands': 10000
};
function numRow(opts) {
  if (!opts || opts.length !== 4) return null;
  if (opts.every(o => /^\d+$/.test(o))) return opts.slice();
  const out = [];
  for (const o of opts) {
    const t = String(o).trim().toLowerCase().replace(/^the\s+/, '').replace(/\s+(place|column)$/, '');
    if (PLACE_VALUE[t] !== undefined) { out.push(String(PLACE_VALUE[t])); continue; }
    const n = String(o).match(/\d+/g);
    if (n && n.length === 1) { out.push(n[0]); continue; }
    return null;
  }
  return out;
}

/* ---------- OPTION-ROW GEOMETRY RULER (tenth-pass KILL, v11) ------------------
   NOTHING IN THIS HARNESS HAD EVER READ THE NUMBERS INSIDE A PROSE OPTION. The
   tenth pass killed `gCompareTrue` on exactly that:

     Which of these is true?
       2678 > 2849 | 2678 > 2504 <- key | 2678 < 2521 | 2678 < 2522

   Every line started with the same number, so a child covered it and read the
   four numbers on the right: three bunched and one off on its own. The loner's
   line carried a ">", so "take the OTHER > line" answered the item on 79.22 /
   79.14% of 20,000 draws at each of two seeds - and, because the rule never uses
   what either symbol MEANS, a child who thinks "<" means greater scored exactly
   the same. The item could not tell the two children apart.

   WHAT IS MEASURED. Every four-option bank in the topic whose options are NOT a
   numeric row but DO carry numerals. The numerals are read off the rendered
   option in order, and four things are scored.

   1. POSITION RANK. For the first, the last and the largest numeral of each
      option, where the key's sits among the four. A rank past 45%, or an extreme
      past 40%, is the magnitude gate's complaint one layer in.
   2. LONER -> SYMBOL. Find the option whose numeral at a position sits apart from
      the other three (nearest neighbour furthest away), read the non-numeric
      separator on ITS line, and take the other line carrying the same separator.
      This is the v10 kill, and it is scored outright. Cap 40%.
   3. THE AGREE / DISAGREE SINGLETON, which is the general result behind it. Take
      any "which of these is true?" row over four DIFFERENT pairs with exactly one
      true statement. A child compares each pair - real work, no symbol knowledge
      - and asks only "does the symbol agree with the order I found?". Exactly one
      line agrees, so the split is 1-3 and the singleton is the key WHICHEVER WAY
      the child believes the symbols point. That is 100% on any such bank. The
      only structure that breaks it is the same number pair on the row with both
      symbols, which makes the split 2-2. Scored both ways round; cap 40%.
   4. THE REPEAT NARROWING, which is the price of breaking 3. When the row carries
      one pair twice, "keep the lines that use the stem's two numbers" is worth
      50% to a guesser and cannot be lowered - a pair's two true statements are
      "p > q" and "q < p" and its two false ones "p < q" and "q > p", so any third
      line about the same pair puts the key in the doubled writing order. It is
      REPORTED against a 60% cap, the same structural-floor treatment gBetween's
      straddle gets on the magnitude gate.

   Negative control: the v10 gCompareTrue option row, rebuilt here from its own
   arithmetic so the control does not depend on the topic file still containing
   the defect. It must come out RED on 2 and on 3. --- */
const GEO_N = 2000, GEO_RANK_CAP = 0.45, GEO_EXTREME_CAP = 0.40;
const GEO_ROUTE_CAP = 0.40, GEO_NARROW_CAP = 0.60;
const geoRows = [];
function geoParts(o) {
  const nums = (String(o).match(/\d+/g) || []).map(Number);
  const sym = String(o).replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  return { nums, sym };
}
function geoBank(draw, exempt) {
  const t = { n: 0, rank: { first: [0,0,0,0], last: [0,0,0,0], max: [0,0,0,0] },
              seen: { first: 0, last: 0, max: 0 }, dec: { first: 0, last: 0, max: 0 },
              loner: 0, single: 0, narrow: 0, pairRow: 0, premise: 0 };
  for (let i = 0; i < GEO_N; i++) {
    let q;
    try { q = draw(); } catch (e) { return Object.assign(t, { threw: e.message }); }
    const opts = (q.choices || []).map(strip);
    if (opts.length !== 4 || !(q.correct >= 0)) continue;
    if (numRow(opts)) continue;                       /* the numeric rulers own those */
    const P = opts.map(geoParts);
    if (!P.every(p => p.nums.length)) continue;
    t.n++;
    if (exempt && exempt[1](P)) t.premise++;
    /* 1. where the key's numeral sits, at three read-off positions */
    const at = {
      first: P.map(p => p.nums[0]),
      last: P.map(p => p.nums[p.nums.length - 1]),
      max: P.map(p => Math.max.apply(null, p.nums))
    };
    /* RANK IS ONLY READ WHERE THE ROW HAS ONE. When two lines carry the same
       number at a position - which is exactly what the same-pair-twice structure
       makes happen - "take the line with the smallest first number" does not name
       a line at all, and scoring it as though it did would print a 50% route that
       no child can run. The ruler declines that position and says so (DECLINED),
       the way the width-class ruler declines a row with no commonest width. */
    for (const k of ['first', 'last', 'max']) {
      if (new Set(at[k]).size !== 4) { t.dec[k]++; continue; }
      t.seen[k]++;
      const sorted = at[k].slice().sort((a, b) => a - b);
      const r = sorted.indexOf(at[k][q.correct]);
      if (r >= 0) t.rank[k][r]++;
    }
    /* 2. the loner at each position names a separator; take the other line with it */
    let lonerHit = false;
    for (const k of ['first', 'last', 'max']) {
      const v = at[k];
      if (new Set(v).size < 4) continue;
      let bi = 0, bv = -1;
      for (let a = 0; a < 4; a++) {
        let dm = Infinity;
        for (let b = 0; b < 4; b++) if (a !== b) dm = Math.min(dm, Math.abs(v[a] - v[b]));
        if (dm > bv) { bv = dm; bi = a; }
      }
      const sym = P[bi].sym;
      const same = [];
      for (let a = 0; a < 4; a++) if (a !== bi && P[a].sym === sym) same.push(a);
      if (same.length === 1 && same[0] === q.correct) lonerHit = true;
    }
    if (lonerHit) t.loner++;
    /* 3. the agree / disagree singleton, on rows of the form "a SYM b" */
    const two = P.every(p => p.nums.length === 2 && /^[<>]$/.test(p.sym));
    if (two) {
      const agree = [];
      for (let a = 0; a < 4; a++) {
        const p = P[a];
        agree.push(p.sym === '>' ? p.nums[0] > p.nums[1] : p.nums[0] < p.nums[1]);
      }
      const yes = [0,1,2,3].filter(a => agree[a]);
      const no = [0,1,2,3].filter(a => !agree[a]);
      if ((yes.length === 1 && yes[0] === q.correct) || (no.length === 1 && no[0] === q.correct)) t.single++;
      /* 4. the repeat narrowing: the option set whose numeral pair appears most */
      const cnt = new Map();
      for (const p of P) {
        const k = p.nums.slice().sort((a, b) => a - b).join('-');
        cnt.set(k, (cnt.get(k) || 0) + 1);
      }
      const top = Math.max.apply(null, [...cnt.values()]);
      if (top >= 2) t.pairRow++;
      const dom = [...cnt].filter(e => e[1] === top);
      if (dom.length === 1) {
        const live = [0,1,2,3].filter(a => P[a].nums.slice().sort((x, y) => x - y).join('-') === dom[0][0]);
        t.narrow += live.indexOf(q.correct) >= 0 ? 1 / live.length : 0;
      } else t.narrow += 0.25;
    } else t.narrow += 0.25;
  }
  return t;
}
/* gOrder is allowlisted from the RANK caps and from nothing else, on the same
   premise gGreatest and gSmallest carry on the magnitude gate and with the same
   re-check on every draw: its four options are the SAME four numbers in four
   different orders, so the ordering IS the question. Residual 28 is the number
   this exemption is about. The composed rule - "cross out every list that does
   not start with the smallest first number, then cross out every list that does
   not end with the biggest last number" - answers gOrder OUTRIGHT on 90.20 /
   89.94% of 20,000 draws at each of two seeds, and the seventh pass's 58.01% was
   the UNIQUE-start figure, not the route. The refutation rules it in-skill as a
   P3 teacher and this file adopts that ruling: finding the smallest of four
   numbers and the biggest of four numbers is MOE 1.4 comparison, which is the
   skill the item is for - the child has shortened a four-number sort to two
   comparisons, not escaped it. It is DECLARED at 90.2%, not at 58%. */
const GEO_EXEMPT = {
  gOrder: ['every option is the same four numbers in a different order, so the ordering IS the question',
           (P) => {
             const k = P.map(p => p.nums.slice().sort((a, b) => a - b).join(','));
             return k.every(x => x === k[0]);
           }]
};
function geoVerdict(row) {
  if (!row.n) return null;
  if (row.loner / row.n > GEO_ROUTE_CAP)
    return `"the number that sits apart names a symbol - take the other line with it" answers it on ${(100 * row.loner / row.n).toFixed(1)}% of draws`;
  if (row.single / row.n > GEO_ROUTE_CAP)
    return `the AGREE/DISAGREE singleton - "the one line whose symbol is the odd one out" - answers it on ${(100 * row.single / row.n).toFixed(1)}% of draws, and it needs no knowledge of which symbol means greater`;
  if (row.narrow / row.n > GEO_NARROW_CAP)
    return `"keep only the lines built from the numbers that repeat" is worth ${(100 * row.narrow / row.n).toFixed(1)}% to a guesser`;
  if (row.exempt) return null;
  for (const k of ['first', 'last', 'max']) {
    if (!row.seen[k]) continue;
    const f = row.rank[k].map(x => x / row.seen[k]);
    if (f[0] > GEO_EXTREME_CAP) return `"take the line with the uniquely smallest ${k.toUpperCase()} number" answers it on ${(100 * f[0]).toFixed(1)}% of the draws that have one`;
    if (f[3] > GEO_EXTREME_CAP) return `"take the line with the uniquely largest ${k.toUpperCase()} number" answers it on ${(100 * f[3]).toFixed(1)}% of the draws that have one`;
    for (let r = 0; r < 4; r++) if (f[r] > GEO_RANK_CAP)
      return `the key's ${k.toUpperCase()} number is rank ${r} of 4 on ${(100 * f[r]).toFixed(1)}% of the draws that have a rank`;
  }
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const ex = GEO_EXEMPT[g.name];
  const row = geoBank(g.fn, ex);
  if (!row.n) continue;
  row.name = g.name; row.lvl = g.level;
  if (ex) {
    if (row.premise === row.n) { row.exempt = `exempt from the RANK caps (allowlisted by name): ${ex[0]}, re-checked on all ${row.n} draws`; }
    else { row.err = `allowlisted by name, but the premise FAILED - ${ex[0]} on only ${(100 * row.premise / row.n).toFixed(1)}% of draws`; }
  }
  if (!row.err) row.err = geoVerdict(row);
  geoRows.push(row);
  if (row.err) failures++;
}
let geoControl = 'the v10 gCompareTrue option row was not rejected by the geometry ruler';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  /* v10's draw: three companions on ONE side of n and one on the other, the key
     taken from the three, so the lone companion is the extreme of the four and
     its statement carries the key's sign. */
  const v10CompareTrue = () => {
    const th = rnd(1, 9), n = th * 1000 + rnd(120, 879);
    const below = Math.random() < 0.5, many = [], one = [];
    let guard = 0;
    while (many.length < 3 && guard++ < 400) {
      const v = below ? th * 1000 + rnd(0, (n % 1000) - 1) : th * 1000 + rnd((n % 1000) + 1, 999);
      if (v !== n && many.indexOf(v) < 0) many.push(v);
    }
    guard = 0;
    while (one.length < 1 && guard++ < 400) {
      const v = below ? th * 1000 + rnd((n % 1000) + 1, 999) : th * 1000 + rnd(0, (n % 1000) - 1);
      if (v !== n && many.indexOf(v) < 0) one.push(v);
    }
    const others = many.concat(one), ki = rnd(0, 2);
    const key = n + ' ' + (others[ki] < n ? '>' : '<') + ' ' + others[ki];
    const wrongs = others.filter((_, i) => i !== ki).map(v => n + ' ' + (v < n ? '<' : '>') + ' ' + v);
    const opts = shuf([key].concat(wrongs));
    return { q: 'Which of these is true?', extra: '', choices: opts,
             answerText: key, correct: opts.indexOf(key) };
  };
  const ctl = geoBank(v10CompareTrue);
  const verdict = geoVerdict(ctl);
  if (verdict && /sits apart|singleton/.test(verdict))
    geoControl = `the v10 gCompareTrue option row goes red - ${verdict}` +
      ` (and the AGREE/DISAGREE singleton alone is ${(100 * ctl.single / ctl.n).toFixed(1)}%, which is the general result: on a row of four DIFFERENT pairs with one true statement it is 100% by construction)`;
  else failures++;
}

/* ---------- STEM RULER (tenth-pass KILL, v11) ---------------------------------
   THE OTHER HALF OF THE GAP. Nothing anywhere read a STEM feature against which
   option string is the key, and that is where `gCompareError` died at 100.00%:
   one boolean chose both the shape of the stem (a 3-digit number against a
   4-digit one, or two 4-digit ones) and which of four fixed sentences was the
   key. Counting the characters in the two printed numbers answered the busiest
   bank in the topic with certainty, twice a session, and the phrase ruler read
   both live sentences at ~50% and called it the item's own two-way design.

   WHAT IS MEASURED. For every four-option bank in the topic, four cheap countable
   properties of the RENDERED stem:

     LENGTHS   the sorted character-lengths of every numeral the stem prints
     COUNT     how many numerals it prints
     ROUND     which of them are round to ten and to a hundred, as a sorted flag
     NAME      the child's name, where the stem uses one

   For each property the ruler fits a lookup on the FIRST half of the draws -
   property value -> the option STRING that is most often the key at that value -
   and scores it on the SECOND half, answering with that string when it is on the
   row and guessing uniformly when it is not. Fitting and scoring on different
   halves is what stops a bank with an unbounded key set from scoring itself; a
   bank whose four option strings are fixed and whose key is a function of the
   stem's shape scores 100%.

   THE GATE. No stem property may answer a bank past 40%.

   WHAT IS NOT MEASURED, and why. The QUESTION'S OWN WORDS. A stem that asks "how
   much is that small 1 worth?" rather than "how much is the digit that stays
   worth?" has told the child which of two answers to look for, and that is
   reading, not a tell - the child still owes the column. The properties above are
   all about the numerals a stem PRINTS, which is the axis the kill lived on.

   Negative control: the v10 gCompareError stem and option row, rebuilt here from
   its own arithmetic. It must come out RED at 100%. --- */
const STEM_N = 4000, STEM_CAP = 0.40, STEM_LIFT_CAP = 0.15;
const stemRows = [];
const STEM_FEATURES = [
  ['NUMERAL LENGTHS', s => (s.match(/\d+/g) || []).map(x => x.length).sort().join(',')],
  ['NUMERAL COUNT', s => String((s.match(/\d+/g) || []).length)],
  ['ROUNDNESS', s => (s.match(/\d+/g) || []).map(x => (Number(x) % 100 === 0 ? 'H' : Number(x) % 10 === 0 ? 'T' : '-')).sort().join('')],
  ['NAME', s => (s.match(/\b(Aisyah|Jun Wei|Kavitha|Marcus|Siti|Priya|Daryl|Xin Yi|Farhan|Mei Ling|Wei Jie|Nurul|Ryan|Hui Min)\b/) || ['-'])[0]]
];
function stemBank(draw, exempt) {
  const half = STEM_N >> 1;
  const sample = [];
  for (let i = 0; i < STEM_N; i++) {
    let q;
    try { q = draw(); } catch (e) { return { n: 0, threw: e.message }; }
    const opts = (q.choices || []).map(strip);
    if (opts.length !== 4 || !(q.correct >= 0)) continue;
    const st = strip(q.q) + ' ' + strip(q.extra || '');
    sample.push({ stem: st, opts, key: opts[q.correct] });
  }
  let prem = 0;
  if (exempt) for (const x of sample) if (exempt[1](x.stem)) prem++;
  const out = { n: sample.length, base: 0, premise: prem, f: STEM_FEATURES.map(() => ({ hit: 0, vals: 0 })) };
  if (sample.length < 200) return out;
  /* THE BASELINE, and why every cell is read against it. A bank whose option pool
     holds strings that are NEVER the answer hands a child a constant rule with no
     stem in it at all - gAddError's two fillers never key, so "always say he did
     not carry" is worth 50% before a single numeral has been read. That is the
     tenth pass's W3 and it belongs to the option pool, not to the stem. The stem
     ruler therefore gates the LIFT a property adds over the best constant answer,
     and prints both numbers so the two defects cannot be mistaken for each other. */
  {
    const t = new Map();
    for (let i = 0; i < half; i++) t.set(sample[i].key, (t.get(sample[i].key) || 0) + 1);
    let b = null, bn = -1;
    for (const [k, n] of t) if (n > bn) { bn = n; b = k; }
    let score = 0, seen = 0;
    for (let i = half; i < sample.length; i++) {
      seen++;
      if (sample[i].opts.indexOf(b) < 0) score += 0.25;
      else if (b === sample[i].key) score += 1;
    }
    out.base = seen ? score / seen : 0;
  }
  for (let k = 0; k < STEM_FEATURES.length; k++) {
    const of = STEM_FEATURES[k][1];
    const table = new Map();
    for (let i = 0; i < half; i++) {
      const v = of(sample[i].stem);
      if (!table.has(v)) table.set(v, new Map());
      const t = table.get(v);
      t.set(sample[i].key, (t.get(sample[i].key) || 0) + 1);
    }
    const best = new Map();
    for (const [v, t] of table) {
      let b = null, bn = -1;
      for (const [s, n] of t) if (n > bn) { bn = n; b = s; }
      best.set(v, b);
    }
    out.f[k].vals = best.size;
    let score = 0, seen = 0;
    for (let i = half; i < sample.length; i++) {
      const v = of(sample[i].stem), guess = best.get(v);
      seen++;
      if (guess === undefined || sample[i].opts.indexOf(guess) < 0) score += 0.25;
      else if (guess === sample[i].key) score += 1;
    }
    out.f[k].hit = seen ? score / seen : 0;
  }
  return out;
}
/* gStandsError is allowlisted from the stem cap and from nothing else, on the
   refutation's own ruling (TENTH pass, W4). Its stem prints three numerals - the
   4-digit number, the digit being talked about, and the VALUE the child in the
   stem claims for it - and the item asks whether that claim is the digit's worth.
   So the claimed value's SIZE is the question, and a property that reads it is
   reading the item rather than its packaging: "count the digits in the value he
   claims; if it is a single digit he wrote the digit not its worth, otherwise
   compare that count with how many places the named digit sits from the right".
   The refutation measured that at 100.00 / 100.00% and ruled it IN-SKILL as a P3
   teacher - locating the named digit's column is the item's own work, and a child
   who can do it has understood place value. This file adopts that ruling and
   DECLARES the number rather than hiding it; the premise below is re-checked on
   every draw, and if the stem ever stops printing the claim the exemption lapses. */
const STEM_EXEMPT = {
  gStandsError: ['the stem prints the VALUE the child claims for the named digit, and whether that claim is the digit\'s worth IS the question',
                 s => (s.match(/\d+/g) || []).length === 3]
};
function stemVerdict(row) {
  if (!row.n || row.n < 200) return null;
  for (let k = 0; k < STEM_FEATURES.length; k++) {
    if (row.f[k].vals < 2) continue;
    if (row.f[k].hit > STEM_CAP && row.f[k].hit - row.base > STEM_LIFT_CAP)
      return `the stem's ${STEM_FEATURES[k][0]} names the key on ${(100 * row.f[k].hit).toFixed(1)}% of held-out draws, ${(100 * (row.f[k].hit - row.base)).toFixed(1)} points over the best answer that reads no stem at all`;
  }
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const ex = STEM_EXEMPT[g.name];
  const row = stemBank(g.fn, ex);
  if (!row.n) continue;
  row.name = g.name; row.lvl = g.level;
  if (ex) {
    if (row.premise === row.n) row.exempt = `exempt by name: ${ex[0]}, re-checked on all ${row.n} draws`;
    else row.err = `allowlisted by name, but the premise FAILED - ${ex[0]} on only ${(100 * row.premise / row.n).toFixed(1)}% of draws`;
  }
  if (!row.err && !row.exempt) row.err = stemVerdict(row);
  stemRows.push(row);
  if (row.err) failures++;
}
let stemControl = 'the v10 gCompareError stem was not rejected by the stem ruler';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const FIRST = 'She only compared the first digit of each.';
  const RIGHT = 'She compared from the right, not the left.';
  const F1 = 'She counted the odd digits in each instead.';
  const F2 = 'She added the digits up and compared those.';
  const v10CompareError = () => {
    const wantDigits = Math.random() < 0.5;
    let a, b, g = 0;
    do {
      if (wantDigits) { a = rnd(100, 999); b = rnd(1000, 9999); }
      else { const th = rnd(1, 9); a = th * 1000 + rnd(0, 999); b = th * 1000 + rnd(0, 999); }
      g++;
    } while (g < 400 && !(b > a));
    if (!(b > a)) { a = 968; b = 1024; }
    const key = wantDigits ? FIRST : RIGHT;
    const opts = shuf([key, wantDigits ? RIGHT : FIRST, F1, F2]);
    return { q: 'Xin Yi says ' + a + ' is greater than ' + b + '. What did she do wrong?', extra: '',
             choices: opts, answerText: key, correct: opts.indexOf(key) };
  };
  const ctl = stemBank(v10CompareError);
  const verdict = stemVerdict(ctl);
  if (verdict && /NUMERAL LENGTHS/.test(verdict))
    stemControl = `the v10 gCompareError stem goes red - ${verdict}`;
  else failures++;
}

/* ---------- BOARD WORTH x EXPOSURE (tenth-pass KILL, v11) ---------------------
   RESIDUAL 23 AND RESIDUAL 6 SAT IN THE SWEEP NOTE FOR THREE PASSES AND NOBODY
   MULTIPLIED THEM. Residual 23 recorded that `gPatternConcept` prints only 139
   distinct option rows and `gAddConcept` only 64, and that the row alone pins the
   key on most of them. Residual 6 recorded that `gPatternConcept` is served 5.00
   times per 30-item session at 0.45 accuracy and `gAddConcept` 3.37. Put together
   they are a child who owns the whole board inside thirty sessions and then
   answers 78.17% / 73.11% of both banks with no mathematics - a kill on both
   clauses of the termination rule, and the PM ruled that the kill STANDS.

   WHAT IS MEASURED, for every bank in the topic.

     SATURATION - the distinct option rows over N draws against the rows over
       N/2. A board that stops growing is FINITE and is a thing a child can own;
       a board still doubling with the sample is not a board at all, and is
       reported and not gated. This is the "finite option pool" clause, measured
       rather than asserted.
     RECALL - full-table recall accuracy: remember, for each row, the answer it
       carries most often, and answer with it. 25.0% is chance on four options.
     SERVED - items per 30-item session through the app's own MQI.createFeed and
       its own 3-right-up / 2-wrong-down climb, at 0.80 and at 0.45 accuracy.
     SESSIONS TO OWN - rows divided by the busier of the two served figures: how
       many sessions a child needs before the whole board has gone past once.

   THE GATE. A bank FAILS when its board is finite AND recall is 60% or more AND
   it is served at least once per session AND the whole board goes past inside
   SESSIONS_CAP sessions. All four clauses are load-bearing: the third is the
   PM's exposure clause, and the fourth is what stops the gate reading a 500-row
   board a child meets once every six hundred sessions as the same defect as a
   7-row board they own in three.

   Negative controls: the v10 gPatternConcept board and the v10 gAddConcept board,
   both rebuilt here from their own arithmetic. Both must come out RED. --- */
const BOARD_N = 4000, BOARD_RECALL_CAP = 0.60, BOARD_SERVED_CAP = 1.0;
const BOARD_SESSIONS_CAP = 60, BOARD_GROWTH = 1.10, BOARD_SESSIONS = 400;
const boardRows = [];
function boardBank(draw) {
  const half = BOARD_N >> 1;
  const rowsHalf = new Set(), tab = new Map();
  let n = 0;
  for (let i = 0; i < BOARD_N; i++) {
    let q;
    try { q = draw(); } catch (e) { return { n: 0, threw: e.message }; }
    const opts = (q.choices || []).map(strip);
    if (opts.length !== 4 || !(q.correct >= 0)) continue;
    const row = opts.slice().sort().join(' | ');
    if (i < half) rowsHalf.add(row);
    if (!tab.has(row)) tab.set(row, new Map());
    const t = tab.get(row);
    t.set(opts[q.correct], (t.get(opts[q.correct]) || 0) + 1);
    n++;
  }
  let worth = 0;
  for (const [, t] of tab) worth += Math.max.apply(null, [...t.values()]);
  /* the key share of every option string that ever appears: the 1:3 the PM asked
     for, reported as the widest and the narrowest share on the board */
  return { n, rows: tab.size, half: rowsHalf.size, recall: n ? worth / n : 0,
           finite: rowsHalf.size ? tab.size / rowsHalf.size <= BOARD_GROWTH : false };
}
/* exposure, through the app's own feed and its own climb */
function servedPerSession(acc) {
  const T = TOPICS['p3numbers'];
  const tally = new Map();
  for (let s = 0; s < BOARD_SESSIONS; s++) {
    const feed = MQI.createFeed('p3numbers');
    let level = 1, r = 0, w = 0;
    for (let i = 0; i < 30; i++) {
      const q = feed.next(level);
      const nm = q.__gen;
      if (nm) tally.set(nm, (tally.get(nm) || 0) + 1);
      if (Math.random() < acc) { r++; w = 0; if (r >= 3 && level < 3) { level++; r = 0; } }
      else { w++; r = 0; if (w >= 2 && level > 1) { level--; w = 0; } }
    }
  }
  const out = new Map();
  for (const [k, v] of tally) out.set(k, v / BOARD_SESSIONS);
  return out;
}
let served80 = new Map(), served45 = new Map();
{
  /* stamp generator identity on the pool entries, exactly as tools/feed-sim.mjs
     does, so the feed's own selection code reports who it served */
  const T = TOPICS['p3numbers'];
  const originals = { 1: T.pools[1], 2: T.pools[2], 3: T.pools[3] };
  for (const lvl of [1, 2, 3]) {
    T.pools[lvl] = T.pools[lvl].map(pr => {
      const fn = pr[0], nm = fn.name;
      return [() => { const q = fn(); q.__gen = nm; return q; }, pr[1]];
    });
  }
  served80 = servedPerSession(0.80);
  served45 = servedPerSession(0.45);
  for (const lvl of [1, 2, 3]) T.pools[lvl] = originals[lvl];
}
function boardVerdict(row) {
  if (!row.n) return null;
  if (!row.finite) return null;
  const served = Math.max(row.s80 || 0, row.s45 || 0);
  const toOwn = served ? row.rows / served : Infinity;
  if (row.recall >= BOARD_RECALL_CAP && served >= BOARD_SERVED_CAP && toOwn <= BOARD_SESSIONS_CAP)
    return `a FINITE board of ${row.rows} rows worth ${(100 * row.recall).toFixed(1)}% to full-table recall, served ${served.toFixed(2)} per session - the whole board goes past in ${toOwn.toFixed(0)} sessions`;
  return null;
}
for (const g of GENS) {
  if (g.topic !== 'p3numbers') continue;
  const row = boardBank(g.fn);
  if (!row.n) continue;
  row.name = g.name; row.lvl = g.level;
  row.s80 = served80.get(g.name) || 0;
  row.s45 = served45.get(g.name) || 0;
  row.err = boardVerdict(row);
  boardRows.push(row);
  if (row.err) failures++;
}
let boardControl = 'the v10 option boards were not rejected by the board gate';
{
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const okv = v => Number.isInteger(v) && v >= 1 && v <= 9999;
  /* the v10 gPatternConcept board: the anchor a third of the time, and otherwise
     three members of famOf(step) - a family derived from the step, so each row
     belongs to exactly one key. */
  const W = v => String(v).length;
  const hiPart = s => { const p = Math.pow(10, W(s) - 1); return p * Math.floor(s / p); };
  const famOf = s => {
    const seen = new Set([s]), f = [];
    for (const v of [2*s, 3*s, s + 10, s - 10, hiPart(s), s - hiPart(s), s >= 100 ? s/10 : s*10, 2*s - 10]) {
      if (!okv(v) || seen.has(v)) continue;
      seen.add(v); f.push(v);
    }
    return f;
  };
  const v10PatternConcept = () => {
    let step, wrong;
    if (rnd(0, 2) === 0) { step = [10, 100, 1000][rnd(0, 2)]; wrong = [1, 10, 100, 1000].filter(v => v !== step); }
    else { step = [15, 25, 150, 250][rnd(0, 3)]; wrong = shuf(famOf(step)).slice(0, 3); }
    const opts = shuf([step].concat(wrong)).map(String);
    return { q: 'v10 gPatternConcept control', choices: opts, answerText: String(step), correct: opts.indexOf(String(step)) };
  };
  /* the v10 gAddConcept board: the key is POW[col], a power of ten, and the three
     distractors come from a family built out of the same column's digits. */
  const POWV = [1000, 100, 10, 1];
  /* the v10 gAddConcept board: the key is POW[col] - the worth of a carried 1, so
     always a power of ten - and the three distractors are the 3-subset of that
     column's named slip family that is WIDTH-FREE first and then holds the MOST
     place values, which is exactly the narrowing that took the board to 64 rows. */
  const v10AddConcept = () => {
    const s = rnd(12, 18), keep = s % 10;
    const r0 = rnd(0, 3);
    let col = rnd(0, 2);
    /* v10 draws the RANK first and then picks a COLUMN that can supply it; doing
       it the other way round loosens the board and understates the defect */
    for (const c of shuf([0, 1, 2])) {
      const kk = POWV[c], f2 = [1, keep, s, POWV[c + 1], keep * POWV[c + 1], s * POWV[c + 1]];
      if (c > 0) f2.push(keep * kk);
      f2.push(s * kk, 1, 10, 100, 1000);
      const sn = new Set([kk]), ff = [];
      for (const v of f2) { if (!okv(v) || sn.has(v)) continue; sn.add(v); ff.push(v); }
      let any = false;
      for (let i = 0; i < ff.length && !any; i++) for (let j = i + 1; j < ff.length && !any; j++) for (let k = j + 1; k < ff.length && !any; k++)
        if ([ff[i], ff[j], ff[k]].filter(v => v < kk).length === r0) any = true;
      if (any) { col = c; break; }
    }
    const src = col + 1, key = POWV[col];
    const raw = [1, keep, s, POWV[src], keep * POWV[src], s * POWV[src]];
    if (col > 0) raw.push(keep * POWV[col]);
    raw.push(s * POWV[col], 1, 10, 100, 1000);
    const seen = new Set([key]), fam = [];
    for (const v of raw) { if (!okv(v) || seen.has(v)) continue; seen.add(v); fam.push(v); }
    const kw = String(key).length; let sets = [];
    for (let i = 0; i < fam.length; i++) for (let j = i + 1; j < fam.length; j++) for (let k = j + 1; k < fam.length; k++) {
      const t = [fam[i], fam[j], fam[k]];
      if (Math.max.apply(null, t.map(v => String(v).length)) * 1.4 < kw) continue;
      sets.push(t);
    }
    if (!sets.length) sets.push(fam.slice(0, 3));
    /* the RANK is drawn FIRST, exactly as v10 draws it, and it is what keeps the
       all-powers-of-ten subset off most rows - without it the board collapses to
       one row and the control measures nothing. */
    const atRank = sets.filter(t => t.filter(v => v < key).length === r0);
    if (atRank.length) sets = atRank;
    const free = sets.filter(t => t.every(v => String(v).length !== kw));
    const live = free.length ? free : sets;
    const pv = t => t.filter(v => /^10*$/.test(String(v))).length;
    const best = Math.max.apply(null, live.map(pv));
    const chosen = live.filter(t => pv(t) === best);
    const wrong = chosen[rnd(0, chosen.length - 1)];
    const opts = shuf([key].concat(wrong)).map(String);
    return { q: 'v10 gAddConcept control', choices: opts, answerText: String(key), correct: opts.indexOf(String(key)) };
  };
  const a = boardBank(v10PatternConcept), b = boardBank(v10AddConcept);
  a.s45 = 5.00; a.s80 = 1.28; a.name = 'v10 gPatternConcept';
  b.s45 = 3.37; b.s80 = 0.75; b.name = 'v10 gAddConcept';
  const va = boardVerdict(a), vb = boardVerdict(b);
  if (va && vb) boardControl = `the v10 option boards go red - gPatternConcept: ${va}; gAddConcept: ${vb}`;
  else failures++;
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
if (rankRows.length) {
  console.log(`\nMAGNITUDE RANK  p3numbers, ${RANK_N} draws per numeric bank  (every rank ${Math.round(RANK_FLOOR * 100)}-${Math.round(RANK_CAP * 100)}%, smallest/largest < ${Math.round(EXTREME_CAP * 100)}%)\n`);
  console.log(pad('GENERATOR', 18) + pad('POOL', 6) + pad('N', 7) + pad('SMALLEST', 10) + pad('2nd', 8) + pad('3rd', 8) + pad('LARGEST', 9) + 'RESULT');
  console.log('-'.repeat(84));
  for (const r of rankRows) {
    const f = r.tally.map(t => (100 * t / r.seen).toFixed(1) + '%');
    console.log(pad(r.name, 18) + pad(r.lvl, 6) + pad(r.seen, 7) + pad(f[0], 10) + pad(f[1], 8) + pad(f[2], 8) + pad(f[3], 9) +
      (r.err ? 'FAIL  ' + r.err
             : r.exempt ? 'exempt (allowlisted by name): no number in the stem on any of ' + r.seen + ' draws, so the options ARE the data'
             : r.flat ? 'flat-rank exempt (allowlisted by name): the wrong answers STRADDLE the range on all ' + r.seen + ' draws, so neither bound settles it and the key is 2nd or 3rd by construction'
             : 'pass'));
  }
  const gated = rankRows.filter(r => !r.exempt && !r.flat).length;
  console.log('');
  if (rankRows.every(r => !r.err)) console.log(`ok   magnitude rank: ${gated} numeric banks inside ${Math.round(RANK_FLOOR * 100)}-${Math.round(RANK_CAP * 100)}% / ${Math.round(EXTREME_CAP * 100)}%, ${rankRows.filter(r => r.exempt).length} comparison anchors and ${rankRows.filter(r => r.flat).length} straddle bank exempt by name, every premise re-checked`);
  console.log(`${/goes red/.test(rankControl) ? 'ok  ' : 'FAIL'} magnitude negative control: ${rankControl}`);
  console.log(`${/goes red/.test(betweenControl) ? 'ok  ' : 'FAIL'} magnitude negative control: ${betweenControl}`);
}
if (lenRows.length) {
  console.log(`\nLENGTH RANK  p3numbers, ${LEN_N} draws per bank  (the key uniquely shortest OR uniquely longest on < ${Math.round(LEN_CAP * 100)}% of draws)\n`);
  console.log(pad('GENERATOR', 18) + pad('POOL', 6) + pad('N', 7) + pad('uSHORTEST', 12) + pad('uLONGEST', 11) +
    pad('PICK-SHORT', 12) + pad('PICK-LONG', 11) + pad('LO-STEP', 9) + pad('HI-STEP', 9) + pad('SPREAD', 9) + 'RESULT');
  console.log('-'.repeat(120));
  for (const r of lenRows) {
    console.log(pad(r.name, 18) + pad(r.lvl, 6) + pad(r.n, 7) +
      pad((100 * r.uShort / r.n).toFixed(1) + '%', 12) + pad((100 * r.uLong / r.n).toFixed(1) + '%', 11) +
      pad((100 * r.pShort / r.n).toFixed(1) + '%', 12) + pad((100 * r.pLong / r.n).toFixed(1) + '%', 11) +
      pad((r.step / r.n).toFixed(2), 9) + pad((r.stepHi / r.n).toFixed(2), 9) + pad((r.spread / r.n).toFixed(2), 9) +
      (r.err ? 'FAIL  ' + r.err : 'pass'));
  }
  console.log('');
  console.log(`     PICK-SHORT / PICK-LONG are the value of "pick one of the shortest (longest) options", counted 1/k over the k options tied at that extreme.`);
  console.log(`     LO-STEP / HI-STEP (fifth pass, W1) are the gap in CHARACTERS from the shortest option up to the next length, and from the longest option down to`);
  console.log(`     the next, and SPREAD is shortest to longest. A key tied at one extreme is read off the step at THAT end: gCompareError's is LO-STEP. PICK-SHORT`);
  console.log(`     measures the value of the rule and uSHORTEST measures uniqueness; only MIN-STEP says whether the eye can see which options the rule points at.`);
  console.log(`     All REPORTED, not gated: 25.0% is chance, and a key tied with one other option reads 50.0% under PICK-SHORT and 0.0% under "uniquely".`);
  if (lenRows.every(r => !r.err)) console.log(`ok   length rank: ${lenRows.length} banks, no key uniquely shortest or uniquely longest on ${Math.round(LEN_CAP * 100)}% of draws`);
  console.log(`${/goes red/.test(lenControl) ? 'ok  ' : 'FAIL'} length negative control: ${lenControl}`);
}
if (widthRows.length) {
  console.log(`\nWIDTH-CLASS RANK  p3numbers, ${WIDTH_N} draws per numeric bank  (both directions: each of MIN / MID / MAX < ${Math.round(WIDTH_RANK_CAP * 100)}%, "commonest width, then smallest / largest" < ${Math.round(WIDTH_RULE_CAP * 100)}%, the KEY IN elimination worth < ${Math.round(WIDTH_ELIM_CAP * 100)}%, and no 2-2 tie branch on >= ${Math.round(WIDTH_TIE_FLOOR * 100)}% of draws with the key on one side past ${Math.round(WIDTH_TIE_CAP * 100)}%)\n`);
  console.log(pad('GENERATOR', 18) + pad('POOL', 6) + pad('N', 7) + pad('CLASS', 8) + pad('KEY MIN', 9) +
    pad('KEY MID', 9) + pad('KEY MAX', 9) + pad('KEY OUT', 9) + pad('KEY IN', 9) + pad('ELIM', 8) +
    pad('TIE', 8) + pad('TIE WIDE', 10) + pad('NO CLASS', 10) + 'RESULT');
  console.log('-'.repeat(150));
  for (const r of widthRows) {
    const f = k => (100 * r[k] / r.n).toFixed(1) + '%';
    const cls = r.min + r.mid + r.max + r.out;
    console.log(pad(r.name, 18) + pad(r.lvl, 6) + pad(r.n, 7) +
      pad((100 * cls / r.n).toFixed(1) + '%', 8) +
      pad(f('min'), 9) + pad(f('mid'), 9) + pad(f('max'), 9) + pad(f('out'), 9) +
      pad(cls ? (100 * (r.min + r.mid + r.max) / cls).toFixed(1) + '%' : '-', 9) +
      pad(f('elim'), 8) + pad(f('tie'), 8) +
      pad(r.tie ? (100 * r.tieWide / r.tie).toFixed(1) + '%' : '-', 10) +
      pad(f('none'), 10) +
      (r.err ? 'FAIL  ' + r.err : (r.tieDeclared || 'pass')));
  }
  console.log('');
  console.log(`     CLASS is how often a commonest width exists at all (at least two options, never all four - a row that is all one width is the magnitude gate's).`);
  console.log(`     KEY OUT means the rule fires and points at a WRONG option; NO CLASS means it declines. MIN is the rule the seventh pass killed this topic with.`);
  console.log(`     KEY IN (W3, eighth pass) is the OTHER direction: of the draws where a class exists, how often the key is inside it - at 100% "cross out every`);
  console.log(`     option that is not the commonest width" is a free elimination that is never wrong. ELIM is what that rule is actually WORTH to a guesser, and it`);
  console.log(`     is ELIM that is gated at ${Math.round(WIDTH_ELIM_CAP * 100)}%: a certainty that keeps three options, or that fires on one draw in fifty, is not a route.`);
  console.log(`     TIE (W4) is the 2-2 branch the class rule DECLINES on, and TIE WIDE is how often the key is in the wider pair of it. A bank that ships a tie on`);
  console.log(`     ${Math.round(WIDTH_TIE_FLOOR * 100)}% of draws or more fails if the key sits on the same side of it past ${Math.round(WIDTH_TIE_CAP * 100)}% (ninth pass, Call 3: the floor was 10%, which sat 1.6 points`);
  console.log(`     above the only surviving tie in the topic and therefore described it instead of gating it). One bank is allowlisted by name on the tie clause,`);
  console.log(`     with its trade re-checked on the option board it buys; no bank is exempt from the other four.`);
  {
    /* Call 2's amendment: a per-bank ELIM column nobody reads is a per-bank
       column nobody reads. The worst figure in the topic is named here, so the
       next pass can see it move without re-deriving it by hand. */
    const worst = widthRows.slice().sort((a, b) => b.elim / b.n - a.elim / a.n)[0];
    if (worst) console.log(`     WORST ELIM in the topic: ${worst.name} at ${(100 * worst.elim / worst.n).toFixed(2)}%, ${(100 * (WIDTH_ELIM_CAP - worst.elim / worst.n)).toFixed(1)} points under the ${Math.round(WIDTH_ELIM_CAP * 100)}% cap.`);
    for (const r of widthRows) if (r.tieDeclared) console.log(`     ${r.name}: ${r.tieDeclared}`);
  }
  if (widthRows.every(r => !r.err)) console.log(`ok   width-class rank: ${widthRows.length} numeric banks, no key MIN / MID / MAX past ${Math.round(WIDTH_RANK_CAP * 100)}%, no width rule past ${Math.round(WIDTH_RULE_CAP * 100)}%, no elimination worth ${Math.round(WIDTH_ELIM_CAP * 100)}%, and every 2-2 tie branch either absent or declared by name`);
  console.log(`${/goes red/.test(widthControl) ? 'ok  ' : 'FAIL'} width-class negative control: ${widthControl}`);
  console.log(`${/goes red/.test(elimControl) ? 'ok  ' : 'FAIL'} width-class negative control: ${elimControl}`);
  console.log(`${/goes red/.test(tieControl) ? 'ok  ' : 'FAIL'} width-class negative control: ${tieControl}`);
}
if (shapeRows.length) {
  console.log(`\nSHAPE RULER  p3numbers, ${SHAPE_N} draws per numeric bank  (per-option SHAPE: no route past ${Math.round(SHAPE_RULE_CAP * 100)}%, and no shape value unique to the key or to all three distractors on ${Math.round(SHAPE_UNIQ_CAP * 100)}% of draws)\n`);
  console.log(pad('GENERATOR', 18) + pad('POOL', 6) + pad('N', 7) +
    SHAPE_FEATURES.map(f => pad(f[0].slice(0, 12).toUpperCase(), 14) + pad('uKEY', 8) + pad('uWRONG', 9) + pad('ROUTE', 8)).join('') + 'RESULT');
  console.log('-'.repeat(170));
  for (const r of shapeRows) {
    let line = pad(r.name, 18) + pad(r.lvl, 6) + pad(r.n, 7);
    for (let k = 0; k < SHAPE_FEATURES.length; k++) {
      const c = r.f[k], best = Math.max(c.outSmall, c.outLarge, c.inSmall, c.inLarge);
      line += pad('', 14) + pad((100 * c.uKey / r.n).toFixed(1) + '%', 8) +
        pad((100 * c.uWrong / r.n).toFixed(1) + '%', 9) + pad((100 * best / r.n).toFixed(1) + '%', 8);
    }
    console.log(line + (r.err ? 'FAIL  ' + r.err : (r.exempt || 'pass')));
  }
  console.log('');
  console.log(`     The ${SHAPE_FEATURES.length} features are ${SHAPE_FEATURES.map(f => '"' + f[0] + '"').join(', ')}, read off the RENDERED option and nothing else.`);
  console.log(`     uKEY is "the key is the only option with this shape" and uWRONG is "all three distractors have it and the key does not" - the two directions`);
  console.log(`     the eighth pass's kill lived between. ROUTE is the best of the four orderings the shape allows: cross out the options that have the shape (or`);
  console.log(`     the ones that do not), then take the smallest (or the largest) of what is left. The kill was the first of those, worth 67.07% on gPatternConcept.`);
  console.log(`     The ROUTE cap is ${Math.round(SHAPE_RULE_CAP * 100)}% (ninth pass, Call 1 - it was 60%, which was gAddConcept's structural 51.9% plus slack nothing measured). gAddConcept is`);
  console.log(`     allowlisted BY NAME with its premise re-checked on every draw, and it is the ONLY exemption; at 60% this cap would have missed four of the`);
  console.log(`     seven banks the ninth pass's digit-column route lit up, and at ${Math.round(SHAPE_RULE_CAP * 100)}% it would have caught all four.`);
  if (shapeRows.every(r => !r.err)) console.log(`ok   shape ruler: ${shapeRows.length} numeric banks, no shape route past ${Math.round(SHAPE_RULE_CAP * 100)}% and no shape value unique to the key or to all three distractors past ${Math.round(SHAPE_UNIQ_CAP * 100)}%, ${Object.keys(SHAPE_EXEMPT).length} banks allowlisted by name with every premise re-checked on every draw`);
  console.log(`${/goes red/.test(shapeControl) ? 'ok  ' : 'FAIL'} shape negative control: ${shapeControl}`);
}
if (colRows.length) {
  console.log(`\nCOLUMN RULER  p3numbers, ${COL_N} draws per numeric bank  (the four options read as a right-aligned column of digits: "cross out any answer whose digit is in the minority" < ${Math.round(COL_ROUTE_CAP * 100)}% outright and worth < ${Math.round(COL_VALUE_CAP * 100)}%, and its mirror < ${Math.round(COL_LONER_CAP * 100)}%)\n`);
  console.log(pad('GENERATOR', 18) + pad('POOL', 6) + pad('N', 7) + pad('ROUTE', 9) + pad('VALUE', 9) +
    pad('LONER', 9) + pad('3-of-4 COL', 12) + 'RESULT');
  console.log('-'.repeat(120));
  for (const r of colRows) {
    const f = k => (100 * r[k] / r.n).toFixed(1) + '%';
    console.log(pad(r.name, 18) + pad(r.lvl, 6) + pad(r.n, 7) + pad(f('route'), 9) + pad(f('value'), 9) +
      pad(f('loner'), 9) + pad(f('three'), 12) + (r.err ? 'FAIL  ' + r.err : 'pass'));
  }
  console.log('');
  console.log(`     Every named slip in this topic used to be a ONE-COLUMN misreading of the key, so three of them beside it put the key's digit in three of the`);
  console.log(`     four printed numbers in every column - the key was the column-wise CONSENSUS of its own option row, by construction, and nothing in the`);
  console.log(`     harness could express that. VALUE is the unit that binds: 25.0% is chance, and a rule that leaves all four options - or crosses the whole`);
  console.log(`     row out - scores exactly chance. 3-of-4 COL is REPORTED, not gated: it is the shape that hands ONE option away, and what one free`);
  console.log(`     cross-out is worth is what VALUE already counts. LONER is the mirror, which is the only direction any earlier pass had ever looked at.`);
  if (colRows.every(r => !r.err)) console.log(`ok   column ruler: ${colRows.length} numeric banks, no minority-elimination route past ${Math.round(COL_ROUTE_CAP * 100)}% outright, none worth ${Math.round(COL_VALUE_CAP * 100)}% to a guesser, and no loner direction past ${Math.round(COL_LONER_CAP * 100)}%`);
  console.log(`${/goes red/.test(colControl) ? 'ok  ' : 'FAIL'} column negative control: ${colControl}`);
}
if (tokRows.length) {
  console.log(`\nPHRASE RULER  p3numbers, ${TOK_N} draws per prose bank  (no contiguous phrase of <= ${PHRASE_CAP} words, and no unordered word set of <= ${SET_CAP} words, in the key alone - or in all three distractors alone - on >= ${Math.round(100 * TOK_CAP)}% of draws)\n`);
  console.log(pad('GENERATOR', 18) + pad('POOL', 5) + pad('N', 6) + pad('KEY-ONLY PHRASE', 26) + pad('RATE', 8) +
    pad('KEY-ONLY WORD SET', 22) + pad('RATE', 8) + pad('ALL-WRONG', 16) + pad('RATE', 8) +
    pad('MIN-n KEY', 11) + pad('MIN-n D min/mid/max', 21) + pad('GAP>' + GAP_CAP, 9) + pad('SUPERSET', 10) + 'RESULT');
  console.log('-'.repeat(180));
  for (const r of tokRows) {
    const k = tokTop(r.keyOnly), w = tokTop(r.wrongOnly), st = tokTop(r.setOnly), d = tokDist(r);
    console.log(pad(r.name, 18) + pad(r.lvl, 5) + pad(r.n, 6) +
      pad('"' + k[0] + '"', 26) + pad((100 * k[1] / r.n).toFixed(1) + '%', 8) +
      pad(st[0], 22) + pad((100 * st[1] / r.n).toFixed(1) + '%', 8) +
      pad('"' + w[0] + '"', 16) + pad((100 * w[1] / r.n).toFixed(1) + '%', 8) +
      pad(r.dn ? (r.kSum / r.dn).toFixed(2) : tokMinN(r), 11) +
      pad(d.map(x => x.toFixed(2)).join(' / '), 21) +
      pad(r.dn ? (100 * r.gap / r.dn).toFixed(1) + '%' : '-', 9) +
      pad((100 * r.superset / r.n).toFixed(1) + '%', 10) +
      (r.err ? 'FAIL  ' + r.err : 'pass'));
  }
  console.log('');
  console.log(`     MIN-n KEY is the length in WORDS of the shortest key-only phrase, measured with NO cap: at n = the key's own length every four-option bank is`);
  console.log(`     key-only by identity, so an uncapped failure rule on the key alone is unsatisfiable, and a bank whose MIN-n sits above ${PHRASE_CAP} is visible here.`);
  console.log(`     MIN-n D is the SAME measurement on the three DISTRACTORS, printed min / mid / max - the mirror the sixth pass's kill lived in. GAP>${GAP_CAP} is how`);
  console.log(`     often the key's exceeds EVERY distractor's by more than ${GAP_CAP} words, and it IS gated at ${Math.round(100 * TOK_CAP)}%: a long key-only phrase is safe, a long one beside`);
  console.log(`     three short ones is the elimination "cross out the options that say something none of the others say". Measure every option, print the spread.`);
  console.log(`     SUPERSET is how often some distractor holds EVERY word the key holds; at 100% no word combination of ANY size can single the key out.`);
  if (tokRows.every(r => !r.err)) console.log(`ok   phrase ruler: ${tokRows.length} prose banks, no key-only and no all-distractor phrase or word set at or over ${Math.round(100 * TOK_CAP)}% of draws, and no key MIN-n more than ${GAP_CAP} words past every distractor's`);
  console.log(`${/goes red/.test(tokControl) ? 'ok  ' : 'FAIL'} phrase negative control: ${tokControl}`);
  console.log(`${/goes red/.test(gapControl) ? 'ok  ' : 'FAIL'} phrase negative control: ${gapControl}`);
  console.log(`${/goes red/.test(explControl) ? 'ok  ' : 'FAIL'} explanation negative control: ${explControl}`);

  /* ---------- OPTION-ROW GEOMETRY ---------- */
  console.log(`\nOPTION-ROW GEOMETRY  p3numbers, ${GEO_N} draws per prose bank  (the numbers INSIDE the option strings: no rank past ${Math.round(GEO_RANK_CAP * 100)}%, no extreme past ${Math.round(GEO_EXTREME_CAP * 100)}%, the loner-names-the-symbol route and the AGREE/DISAGREE singleton each < ${Math.round(GEO_ROUTE_CAP * 100)}%, the repeat narrowing < ${Math.round(GEO_NARROW_CAP * 100)}%)\n`);
  console.log('GENERATOR         POOL N     FIRST-RANK               LAST-RANK                LONER   SINGLETON  NARROW  PAIR-ROW  RESULT');
  console.log('-'.repeat(140));
  for (const r of geoRows) {
    const f = k => r.rank[k].map(x => (100 * x / r.n).toFixed(0) + '%').join('/').padEnd(22);
    console.log(`${r.name.padEnd(17)} ${String(r.lvl).padEnd(4)} ${String(r.n).padEnd(5)} ${f('first')}   ${f('last')}   ${(100 * r.loner / r.n).toFixed(1).padStart(5)}%  ${(100 * r.single / r.n).toFixed(1).padStart(7)}%  ${(100 * r.narrow / r.n).toFixed(1).padStart(5)}%  ${(100 * r.pairRow / r.n).toFixed(1).padStart(7)}%  ${r.err ? 'FAIL  ' + r.err : 'pass'}`);
  }
  console.log(`
     PAIR-ROW is how often the row carries one number pair TWICE - the structure that makes the AGREE/DISAGREE singleton
     impossible, because two lines are then true as written and the split is 2-2 instead of 1-3. NARROW is what that costs:
     "keep the lines built from the numbers that repeat" is a 50% guesser and it cannot be lowered, which is why it is
     reported against a 60% cap rather than the 40% the routes take. It is the same structural floor gBetween's straddle
     is declared at, reached from the other side.`);
  for (const r of geoRows) if (r.exempt) console.log(`     ${r.name}: ${r.exempt}`);
  if (geoRows.every(r => !r.err)) console.log(`ok   option-row geometry: ${geoRows.length} prose banks, no position rank past ${Math.round(GEO_RANK_CAP * 100)}%, no loner-to-symbol route and no agree/disagree singleton past ${Math.round(GEO_ROUTE_CAP * 100)}%, and no repeat narrowing past ${Math.round(GEO_NARROW_CAP * 100)}%`);
  console.log(`${/goes red/.test(geoControl) ? 'ok  ' : 'FAIL'} option-row geometry negative control: ${geoControl}`);

  /* ---------- STEM RULER ---------- */
  console.log(`\nSTEM RULER  p3numbers, ${STEM_N} draws per bank, fitted on the first half and scored on the second  (no cheap countable property of the printed stem names the key past ${Math.round(STEM_CAP * 100)}%)\n`);
  console.log('GENERATOR         POOL N     ' + STEM_FEATURES.map(f => f[0].padEnd(18)).join('') + 'RESULT');
  console.log('-'.repeat(140));
  for (const r of stemRows) {
    const cells = r.f.map((c, k) => ((100 * c.hit).toFixed(1) + '% /' + String(c.vals) + 'v').padEnd(18)).join('');
    console.log(`${r.name.padEnd(17)} ${String(r.lvl).padEnd(4)} ${String(r.n).padEnd(5)} ${cells}${r.err ? 'FAIL  ' + r.err : 'pass'}`);
  }
  console.log(`
     Each cell is the held-out score of "remember which answer this property value carries, and answer with it when it is on
     the row" - 25.0% is chance - followed by how many distinct values the property took. A bank whose four option strings are
     fixed and whose key is a function of the stem's shape scores 100%; that is what gCompareError did, twice a session, for
     ten passes. The question's OWN WORDS are deliberately not a property here: a stem that asks for one of two named things
     has told the child which to look for, and that is reading, not a tell.`);
  for (const r of stemRows) if (r.exempt) console.log(`     ${r.name}: ${r.exempt}`);
  if (stemRows.every(r => !r.err)) console.log(`ok   stem ruler: ${stemRows.length} banks, no numeral-shape or name property of the stem naming the key past ${Math.round(STEM_CAP * 100)}% on held-out draws`);
  console.log(`${/goes red/.test(stemControl) ? 'ok  ' : 'FAIL'} stem negative control: ${stemControl}`);

  /* ---------- BOARD WORTH x EXPOSURE ---------- */
  console.log(`\nBOARD WORTH x EXPOSURE  p3numbers, ${BOARD_N} draws per bank and ${BOARD_SESSIONS} sessions x 30 through MQI.createFeed  (a FINITE board worth >= ${Math.round(BOARD_RECALL_CAP * 100)}% to full-table recall, served >= ${BOARD_SERVED_CAP.toFixed(2)} per session, and owned inside ${BOARD_SESSIONS_CAP} sessions, FAILS)\n`);
  console.log('GENERATOR         POOL ROWS    FINITE  RECALL   SERVED@0.80  SERVED@0.45  SESSIONS TO OWN  RESULT');
  console.log('-'.repeat(140));
  for (const r of boardRows.slice().sort((a, b) => b.recall - a.recall)) {
    const served = Math.max(r.s80, r.s45);
    const own = r.finite && served ? (r.rows / served).toFixed(0) : '-';
    console.log(`${r.name.padEnd(17)} ${String(r.lvl).padEnd(4)} ${String(r.rows).padEnd(7)} ${(r.finite ? 'yes' : 'no').padEnd(7)} ${(100 * r.recall).toFixed(1).padStart(5)}%   ${r.s80.toFixed(2).padStart(10)}   ${r.s45.toFixed(2).padStart(10)}   ${String(own).padStart(14)}   ${r.err ? 'FAIL  ' + r.err : 'pass'}`);
  }
  console.log(`
     FINITE is measured, not asserted: the distinct rows over ${BOARD_N} draws against the rows over the first half, and a board
     that has stopped growing is one a child can own. A board still doubling with the sample is reported and not gated - it is
     not a board. RECALL is full-table recall: remember, for each row, the answer it carries most often. 25.0% is chance.`);
  if (boardRows.every(r => !r.err)) console.log(`ok   board gate: ${boardRows.filter(r => r.finite).length} finite boards of ${boardRows.length} banks, none worth ${Math.round(BOARD_RECALL_CAP * 100)}% to full-table recall while served ${BOARD_SERVED_CAP.toFixed(2)} per session and owned inside ${BOARD_SESSIONS_CAP} sessions`);
  console.log(`${/go red/.test(boardControl) ? 'ok  ' : 'FAIL'} board negative control: ${boardControl}`);

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

const uncovered = rows.filter(r => r.cov === 0).map(r => r.topic + '.' + r.name);
if (uncovered.length) console.log(`\nWARN no independent oracle matched (shape + integrity only): ${uncovered.join(', ')}`);

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll ${GENS.length} generators passed (${N} samples each).`);
