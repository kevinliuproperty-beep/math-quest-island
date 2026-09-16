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
  const m = String(html).match(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
const allFracs = html => [...String(html).matchAll(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/g)]
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
  /* The same contract for a FRACTION MC (depth sweep 2026-09-15). q.authored is
     parsed with parseFloat, and a rendered fraction strips to its digits run
     together, so a fraction bank could not use it. A generator that sets
     q.authoredFrac asserts the same three things in fraction arithmetic: three
     named misconceptions, none worth what the key is worth, and NOTHING else
     shipped - which is what makes finishFrac's padding branch provably dead on
     every draw rather than on the lucky ones (refutation §6). */
  if (Array.isArray(q.authoredFrac)) {
    const rf = s => {
      const mm = String(s).match(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/);
      return mm ? [Number(mm[1]), Number(mm[2])] : null;
    };
    const key = rf(q.answerText);
    if (!key) return 'authoredFrac set but the key is not a rendered fraction';
    if (q.authoredFrac.length !== 3) return `authoredFrac: ${q.authoredFrac.length} named distractors, expected 3`;
    for (const s of q.authoredFrac) {
      if (!Array.isArray(s) || s.length !== 2 || !Number.isInteger(s[0]) || !Number.isInteger(s[1]))
        return 'authoredFrac: a named distractor is not an [n, d] pair of integers';
      if (key[0] * s[1] === s[0] * key[1])
        return `authoredFrac: named distractor ${s[0]}/${s[1]} is worth what the key ${key[0]}/${key[1]} is worth`;
    }
    for (let i = 0; i < q.choices.length; i++) {
      if (i === q.correct) continue;
      const o = rf(q.choices[i]);
      if (!o) return 'authoredFrac: a shipped option is not a rendered fraction';
      if (!q.authoredFrac.some(s => s[0] * o[1] === o[0] * s[1]))
        return `padded distractor shipped (${o[0]}/${o[1]}); authored: ${q.authoredFrac.map(s => s[0] + '/' + s[1]).join(', ')}`;
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
/* Return: null = verified, string = failure, false = no oracle matched.
   `topic` is the registered topic id the generator was drawn from. It is used by
   exactly one block - the P3 fractions bank added by the 2026-09-15 depth sweep -
   so that a bank of house stem shapes cannot claim another topic's stems, and
   another topic's looser branch cannot claim the bank's. Everything else here
   still dispatches on the rendered text alone. */
function oracle(q, topic) {
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
      /(\d+)\s*<span class="frac"><span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/g)]
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

  /* ===== DEPTH SWEEP 2026-09-15: THE P3 FRACTIONS BANK ======================
     js/topics/p3-fractions.js, 25 generators, one oracle branch each. Every key
     is re-derived from the RENDERED stem - or, for the three picture formats,
     from the bar model's own shaded segments - and never from the generator's
     answerText. Premises are re-derived too: an error-spotting claim must map to
     exactly ONE named misconception and must never be the right answer, a
     comparison must have a unique extreme, an ordering must run in the direction
     the stem asks for, and a "related fractions" stem must actually print two
     related denominators.

     THIS BLOCK MUST STAY ABOVE the loose fraction branches below it. Those fire
     on any stem containing "equivalent to", "simplest form", "greatest" or
     ending "= ?" with two rendered fractions, and three of them would MIS-READ
     these stems rather than merely under-check them: the loose compare branch
     reads the ordering item's four three-fraction options as single fractions
     and reports a false failure. Specific above loose, per the P3 pilot rule.

     The block is scoped to the `fractions` topic because its stems are HOUSE
     shapes, not universal ones: "a/d + b/d = ?" is drawn by p2 (whole numbers),
     by p4fractions (which REDUCES its answers) and by p5fractions too, and a bank
     oracle that claimed those would report a false failure on four generators it
     was never written for. Scoping is the fence, not a weakening - coverage
     inside `fractions` is 100% on all 25 generators, and the loose branches below
     keep serving every other topic exactly as before. */
  if (topic === 'fractions') {
    const fOpts = (q.choices || []).map(c => parseFrac(c));
    const fEq = (a, b) => !!a && !!b && a[0] * b[1] === b[0] * a[1];
    const fVal = a => a[0] / a[1];
    const keyF = parseFrac(q.answerText);
    const show = a => a ? a[0] + '/' + a[1] : '?';

    /* SWEEP FRACTIONS REFUTATION, SECOND PASS 2026-09-15, WOUND 1. Four branches
       below used to assert that one PARTICULAR named distractor sat on the row -
       "the shaded fraction itself", "the part taken away", "the printed wrong
       answer", "the stop-after-step-1 answer". That assertion is exactly what held
       the distractor sets fixed, and a fixed set of named beliefs is one-sided in
       VALUE, which pinned the key's rank to one place on 100.00% of draws in five
       generators (RULE 7 below). The generators now draw three of a longer named
       list, on both sides of the key, so the check is INVERTED and made stronger:
       the oracle re-derives the whole named list from the rendered stem or from the
       drawn bar and fails any option that is not on it. A padded distractor still
       cannot ship - and neither can an arbitrary one - while a both-sided row can. */
    const fromList = (label, list) => {
      const named = list.filter(c => Array.isArray(c) && Number.isInteger(c[0]) && Number.isInteger(c[1]) &&
                                     c[0] >= 1 && c[1] >= 2);
      for (let i = 0; i < (q.choices || []).length; i++) {
        if (i === q.correct) continue;
        const o = fOpts[i];
        if (!o) return `${label}: option "${strip(q.choices[i])}" is not a rendered fraction`;
        if (!named.some(c => c[0] === o[0] && c[1] === o[1]))
          return `${label}: ${show(o)} is not one of the misconceptions this item names (${named.map(show).join(', ')})`;
      }
      return null;
    };

    /* --- the three picture formats, read off the rendered bar model ---------
       The oracle counts `seg` / `seg fill` divs exactly as a child counts parts
       and shaded parts, and the closing branch fails any NEW bar-model generator
       that arrives without an oracle, so a picture can never ship unchecked. */
    if (/class="barModel"/.test(String(q.extra))) {
      const raw = String(q.extra);
      const on = (raw.match(/class="seg fill"/g) || []).length;
      const total = (raw.match(/class="seg[ "]/g) || []).length;
      if (!total) return 'bar model: no segments rendered';
      if (on < 1 || on >= total) return `bar model: ${on} of ${total} parts shaded - a P3 fraction of a whole must be proper`;
      if (total > 12) return `bar model: ${total} parts exceeds the P3 denominator limit of 12`;
      if (/^What fraction of the bar is blue\?$/.test(text)) {
        if (!keyF) return 'bar identify: the key is not a rendered fraction';
        if (keyF[1] !== total) return `bar identify: key ${show(keyF)} is not written in ${total}ths`;
        const badI = fromList('bar identify', [
          [total-on, total], [on, total-1], [on+1, total], [on-1, total], [on, total+1],
          /* THIRD PASS 2026-09-16, W5: the two "a blue piece AND a part miscounted"
             entries, added so all four value-rank seatings are reachable. */
          [on+1, total-1], [on-1, total-1]
        ]);
        if (badI) return badI;
        /* SECOND PASS, W2: on a half-shaded bar the complement IS the key, and the
           card said so - "3/6 is the part that is NOT blue" under the key 3/6, on
           12.96% of draws. */
        if (2 * on === total && /is the part that is NOT blue/.test(strip(q.explain)))
          return `bar identify: the card calls the key ${show(keyF)} "the part that is NOT blue" on a half-shaded bar`;
        return near(on / total, fVal(keyF)) ? null
          : `bar identify: ${on}/${total} shaded but the key is ${show(keyF)}`;
      }
      if (/^What fraction of the bar is not blue\?$/.test(text)) {
        if (!keyF) return 'bar complement: the key is not a rendered fraction';
        if (keyF[1] !== total) return `bar complement: key ${show(keyF)} is not written in ${total}ths`;
        /* WOUND 4 (refutation 2026-09-15) took the "shaded fraction must be offered"
           requirement down to where it could be met (it IS the key on a half-shaded
           bar); the SECOND PASS replaces it with the whole named list, re-derived
           from the drawn bar. */
        const badU = fromList('bar complement', [
          [on, total], [total-on+1, total], [total-on-1, total],
          [total-on, total-1], [total-on, total+1],
          [total-on+1, total-1], [total-on-1, total-1],
          /* THIRD PASS 2026-09-16, W5(a): the misread only a PICTURE affords -
             the blue count and the white count written the wrong way round. It is
             named here and in no other `wholes` format, which is half of what
             separates this generator's answer space from gSubFromOne's and
             gMakeOne's (Jaccard 100.0% -> 31.2% / 19.1%). */
          [on, total-on], [total-on, on]
        ]);
        if (badU) return badU;
        /* SECOND PASS, W2: the card may not name the key and then call it the other
           part - which is what it did on 22.6% of draws once the halves arrived. */
        if (2 * on === total && /is the blue part, not the answer/.test(strip(q.explain)))
          return `bar complement: the card calls the key ${show(keyF)} "the blue part, not the answer" on a half-shaded bar`;
        return near((total - on) / total, fVal(keyF)) ? null
          : `bar complement: ${total - on}/${total} is not blue but the key is ${show(keyF)}`;
      }
      /* SIXTH PASS 2026-09-16, W3: the singular is generated now, so the oracle
         reads both and asserts the agreement rather than assuming the plural. */
      if ((m = text.match(/^The bar below is cut into (\d+) equal parts, and (\d+) of them (is|are) blue\. Which fraction is equivalent to the blue fraction\?$/))) {
        const p = Number(m[1]), b = Number(m[2]);
        if (m[3] !== (b === 1 ? 'is' : 'are'))
          return `bar equivalence: the stem prints "${b} of them ${m[3]} blue"`;
        if (p !== total || b !== on) return `bar equivalence: the stem says ${b} of ${p} but the picture shows ${on} of ${total}`;
        if (!keyF) return 'bar equivalence: the key is not a rendered fraction';
        if (!near(on / total, fVal(keyF))) return `bar equivalence: key ${show(keyF)} is not worth ${on}/${total}`;
        /* WOUND 4 (refutation 2026-09-15): the generator used to draw the scaled-UP
           bar every time and key the reduced form every time, so the key was the
           unique smallest bottom number on 20,000 of 20,000 draws. It now runs both
           ways, so the oracle asserts the invariant that holds in both: the key
           names the same amount in a DIFFERENT number of parts, and when it is the
           regrouped one it has gone as far as it will go. */
        if (keyF[1] === total) return `bar equivalence: key ${show(keyF)} is written over the same ${total} parts the picture shows, so nothing was regrouped`;
        if (keyF[1] > 12) return `bar equivalence: key denominator ${keyF[1]} exceeds the P3 limit of 12`;
        if (keyF[1] < total && gcd(keyF[0], keyF[1]) !== 1) return `bar equivalence: regrouped key ${show(keyF)} is not itself in simplest form`;
        for (let i = 0; i < fOpts.length; i++)
          if (i !== q.correct && fEq(fOpts[i], keyF)) return 'bar equivalence: a distractor is also equivalent';
        return null;
      }
      /* THIRD PASS 2026-09-16, W1. The v3 stem was "Which of these fractions is
         greater/less than the blue fraction?" with exactly one option on the named
         side, which makes the key the strict maximum or the strict minimum BY
         CONSTRUCTION: "read the direction word, take that extreme of the option
         row, never look at the bar" scored 100.00% of 20,000 draws in the one
         format written for pictorial support, and RANK_EXEMPT excused it under a
         printed reason ("the stem asks for an extreme") that was true of the four
         comparison formats beside it and false of this one.

         The stem now names TWO conditions and the second one can only be got by
         counting the bar: the bottom number (or, on a coin flip, the top number)
         the picture itself carries. Two options satisfy the direction and only one
         of those carries the counted number. This oracle re-derives both from the
         DRAWN bar: exactly one option may satisfy both, every option must share a
         top or a bottom number with the blue fraction so that every comparison is
         a P3 rule, and the row must be split 2-2 between the two conditions so it
         cannot degenerate back into a single-threshold question. */
      /* FOURTH PASS 2026-09-16, W1. The two-condition stem above still never needed
         the picture: the row was always exactly two pairs, the stem named which
         pair, and the blue fraction sat strictly BETWEEN the named pair's two
         members on 100.00% of draws - so "find the pair sharing the named feature
         and take the direction extreme of those two" answered it on 100.00% and
         reading the bar changed the answer on 0.00% of 20,000 draws.

         A threshold condition cannot escape that: the unique option past a
         threshold IS an extreme of the row. The stem asks for the NEAREST option
         past it instead - the smallest still greater, or the greatest still less -
         so the answer moves when the shading moves, and the row on its own cannot
         say which of the four it is. This oracle re-derives that from the DRAWN
         bar: all four options must be comparable with the blue fraction by ONE P3
         rule (all four over its bottom number, or all four carrying its top), the
         nearest option past the threshold must exist and be unique, and it must be
         the key. RULE 10 gates the rest - that no option-row-only policy answers
         the item - over every bank in the topic that draws a picture. */
      if ((m = text.match(/^The bar below shows one fraction shaded blue\. Which of these fractions is the (smallest|greatest) one that is still (greater|less) than the blue fraction\?$/))) {
        const wantGreater = m[2] === 'greater';
        if ((m[1] === 'smallest') !== wantGreater)
          return `bar compare: the stem asks for the ${m[1]} option that is ${m[2]} than the blue fraction, which names no option at all`;
        if (fOpts.length !== 4 || fOpts.some(o => !o)) return 'bar compare: an option is not a rendered fraction';
        if (fOpts.some(o => o[0] === on && o[1] === total)) return 'bar compare: the shaded fraction itself is one of the options';
        const allD = fOpts.every(o => o[1] === total), allN = fOpts.every(o => o[0] === on);
        if (!allD && !allN)
          return 'bar compare: the four options are not all written over the bar\'s bottom number nor all carrying its top number, so one of them cannot be compared with the picture by a P3 rule';
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++)
          if (fEq(fOpts[i], fOpts[j])) return `bar compare: ${show(fOpts[i])} is on the row twice`;
        const side = fOpts.filter(o => wantGreater ? o[0] * total > on * o[1] : o[0] * total < on * o[1]);
        if (!side.length) return `bar compare: no option is ${m[2]} than ${on}/${total}`;
        side.sort((p, q2) => (p[0] * q2[1] - q2[0] * p[1]) * (wantGreater ? 1 : -1));
        const want = side[0];
        if (side.length > 1 && want[0] * side[1][1] === side[1][0] * want[1])
          return `bar compare: two options tie for the ${m[1]} one ${m[2]} than ${on}/${total}`;
        return fEq(want, keyF) ? null : `bar compare: expected ${show(want)}, key is ${show(keyF)}`;
      }
      /* --- the equal-parts concept check, rebuilt as a PICTURE item -----------
         SWEEP FRACTIONS REFUTATION, FIFTH PASS 2026-09-16, THE KILL (fourth
         consecutive pass on this generator). The prose form is retired: four
         sentences can always be told apart by some feature of the sentences, and
         three fixes running have moved the tell rather than removed the class.
         The row is four bare part counts now - no word to count, no frame to
         match, nothing for a word-set complement to isolate.

         The key is re-derived from the DRAWN BAR and the stem's own number: k
         equal pieces in the picture, n equal parts cut into each of them in the
         words, k x n equal parts in the whole. Every distractor must be one of
         the named beliefs, re-derived the same way, so nothing arbitrary can
         reach the row. */
      if ((m = text.match(/cut into equal pieces, and .+'s piece is blue\. (?:She|He) then cuts every piece into (\d+) equal parts\./))) {
        const per = Number(m[1]);
        if (on !== 1) return `equal parts: ${on} of ${total} pieces are blue - exactly one piece is the child's`;
        if (per < 2) return `equal parts: every piece cut into ${per} parts is not a cutting`;
        if (total < 2) return `equal parts: ${total} piece is not a cutting either`;
        const want = total * per;
        if (want > 12) return `equal parts: ${total} x ${per} = ${want} is past the P3 limit of 12`;
        const opts = (q.choices || []).map(strip);
        if (!opts.every(o => /^\d+$/.test(o)))
          return `equal parts: the option row is not four bare part counts (${opts.join(' | ')})`;
        if (new Set(opts).size !== 4) return `equal parts: two options print the same number (${opts.join(' | ')})`;
        if (opts.some(o => Number(o) < 1 || Number(o) > 12))
          return `equal parts: an option is outside 1..12 (${opts.join(' | ')})`;
        /* added the two numbers; cut every piece but her own; counted the new CUTS
           in each piece; one part out either way; one part too many in every
           piece; one piece too many; and the two numbers the child can read off
           the screen, which are the two commonest wrong answers of all. */
        const named = [total + per, per * (total - 1), total * (per - 1), want - 1, want + 1,
                       total * (per + 1), (total + 1) * per, total, per];
        for (let i = 0; i < 4; i++) {
          if (i === q.correct) continue;
          if (named.indexOf(Number(opts[i])) < 0)
            return `equal parts: ${opts[i]} is not one of the misconceptions this item names (${named.join(', ')})`;
        }
        if (Number(strip(q.answerText)) !== want)
          return `equal parts: ${total} pieces cut into ${per} parts each is ${want}, the key is ${strip(q.answerText)}`;
        /* RULE 10's new clause, checked here where the figure is: another legal
           bar - the same cutting over a different number of pieces - gives a
           different answer, so the picture is load-bearing by construction. */
        if ((total + 1) * per === want || (total - 1) * per === want)
          return 'equal parts: the answer does not move when the bar does';
        return null;
      }
      /* --- the pool-1 refill: a fraction read off the bar after one step -----
         SWEEP FRACTIONS REFUTATION, SEVENTH PASS 2026-09-16, KILL 1. The v7 stem
         printed the child's piece count and the number she ate, and "the answer's
         TOP number is a - g" - one subtraction on those two numerals - answered
         the item at 79.6% with the ties guessed and 88.7% once the repeated bottom
         number broke them, with the bar never counted. RULE 14 is the general form.

         THE REBUILD IS ASSERTED HERE RATHER THAN MEASURED AROUND: this stem prints
         NO NUMERAL AT ALL. The take-away is a word, the blue count and the part
         count are both in the picture only, and both halves of the key are read off
         the DRAWN bar - so there is nothing for an expression over the stem to be
         an expression over. A digit anywhere in the stem is a failure. */
      if ((m = text.match(/^The bar below shows an? (.+?) cut into equal pieces, and (.+?)'s pieces are blue\. (?:She|He) eats (one|two|three) of (?:her|his) pieces\. What fraction of the \1 is still \2's\?$/))) {
        const g2 = { one: 1, two: 2, three: 3 }[m[3]];
        if (/\d/.test(text))
          return 'take away: the stem prints a numeral - this format exists because BOTH halves of its key are counted off the bar, and a numeral in the words is a half-key route (RULE 14)';
        const a = on;
        if (a < g2 + 2) return `take away: ${a} blue pieces less ${g2} eaten leaves nothing worth naming`;
        if (total > 12) return `take away: ${total} parts exceeds the P3 denominator limit of 12`;
        if (a >= total) return `take away: ${a} blue pieces out of ${total} is the whole bar or more`;
        const want = [a - g2, total];
        if (!keyF) return 'take away: the key is not a rendered fraction';
        if (!(keyF[0] === want[0] && keyF[1] === want[1]))
          return `take away: the bar draws ${a} blue of ${total} and the child eats ${g2}, which is ${want[0]} out of the bar's own ${total} parts, and the key is ${show(keyF)}`;
        const named = [[a, total], [g2, total], [total - a, total], [total - a + g2, total],
                       [want[0] + 1, total], [want[0] - 1, total], [want[0] + 2, total], [want[0] - 2, total],
                       [want[0], total - 1], [want[0], total + 1], [want[0], total - 2], [want[0], total + 2],
                       [want[0] + 1, total - 1], [want[0] - 1, total + 1], [a, total - 1], [g2, total + 1]];
        const badT = fromList('take away', named);
        if (badT) return badT;
        if (!fOpts.some((o, i) => i !== q.correct && o && o[1] === total))
          return 'take away: the key is the only option written over the bar\'s own part count, so the coupling rule isolates it';
        return null;
      }
      return 'bar model: rendered a bar model but no oracle matched the stem';
    }

    /* --- concept check: the parts must be EQUAL (RETIRED, v6) ----------------
       FIFTH PASS 2026-09-16: the prose form of this item is gone and the oracle
       for its picture rebuild lives in the bar-model block above. The branch is
       kept, unreachable, as the record of what it could never see - it re-derived
       the whole option set from the four named beliefs and passed a bank that was
       answerable at 100.00% by "pick the option with no word of its own", because
       an oracle that checks the sentences ARE the authored sentences cannot ask
       whether being the authored sentences is itself the tell. */
    if ((m = text.match(/^(.+) cuts a (.+) into (\d+) pieces, but the pieces are not all the same size\. (?:She|He) takes 1 piece\. Why can (?:she|he) not call that piece/))) {
      const d = Number(m[3]);
      const f = parseFrac(q.q);
      if (!f || f[0] !== 1 || f[1] !== d) return `equal parts: the stem prints ${show(f)} for 1 of ${d} pieces`;
      if (d > 12) return `equal parts: ${d} pieces exceeds the P3 denominator limit of 12`;
      /* THIRD PASS 2026-09-16, THE KILL. The v3 key restated the stem's own second
         clause word for word and was the only option on the row containing "equal",
         "same", "size" or "all", so the item was answered by matching a sentence on
         100.00% of 20,000 draws. The key is reworded and every content word in it
         is now printed by at least one distractor; RULE 8 below gates that over the
         whole generator, and the v3 option set is its negative control. */
      /* FOURTH PASS 2026-09-16, THE KILL AGAIN. The v4 key was the only option on the
         row carrying "counts" - the distractor printed "count" - and the only
         COMPOUND sentence, which handed a child "and", "these" and "that" as well.
         All four sentences are one shape now and the whole row is re-derived here:
         the same frame, the same parts-word, and the four named beliefs. RULE 9 is
         the general form of this check and runs on every prose bank in the topic. */
      const P = /\bparts\b/.test(strip(q.answerText)) ? 'parts' : 'pieces';
      const frame = 'A fraction needs the whole cut into ';
      const want = frame + P + ' of the same size.';
      if (strip(q.answerText) !== want) return `equal parts: expected "${want}", got "${strip(q.answerText)}"`;
      const wantRow = [want, frame + P + ' of one shape.',
        frame + d + ' ' + P + ' of any size.',
        frame + 'an even number of ' + P + ' of the same size.'];
      const got = (q.choices || []).map(strip).slice().sort();
      if (got.join(' | ') !== wantRow.slice().sort().join(' | '))
        return `equal parts: the option row is not the four named beliefs (${got.join(' | ')})`;
      if (strip(q.answerText).indexOf('not all the same size') >= 0)
        return 'equal parts: the key repeats the stem\'s own clause, so the item is answered by matching words';
      return null;
    }

    /* --- comparing: three stems, one rule each, all with a UNIQUE extreme ---- */
    const compareFour = (label, wantMax, needUnit) => {
      if (fOpts.length !== 4 || fOpts.some(o => !o)) return `${label}: an option is not a rendered fraction`;
      if (fOpts.some(o => o[0] >= o[1] || o[1] > 12)) return `${label}: an option is not a proper fraction with a denominator to 12`;
      if (needUnit && fOpts.some(o => o[0] !== 1)) return `${label}: an option is not a unit fraction`;
      const vals = fOpts.map(fVal);
      const want = wantMax ? Math.max(...vals) : Math.min(...vals);
      if (vals.filter(v => near(v, want)).length !== 1) return `${label}: the ${wantMax ? 'greatest' : 'smallest'} is not unique`;
      const sameD = fOpts.every(o => o[1] === fOpts[0][1]), sameN = fOpts.every(o => o[0] === fOpts[0][0]);
      if (!sameD && !sameN) return `${label}: the four fractions share neither the top nor the bottom number, so no P3 comparing rule applies`;
      return near(vals[q.correct], want) ? null : `${label}: flagged ${vals[q.correct]}, the extreme is ${want}`;
    };
    if ((m = text.match(/^These fractions are all one part of a whole\. Which one is the (greatest|smallest)\?$/)))
      return compareFour('unit compare', m[1] === 'greatest', true);
    if ((m = text.match(/^These fractions all have the same bottom number\. Which one is the (greatest|smallest)\?$/))) {
      if (fOpts.length === 4 && fOpts.every(Boolean) && !fOpts.every(o => o[1] === fOpts[0][1]))
        return 'like compare: the stem promises one bottom number and the options do not share one';
      return compareFour('like compare', m[1] === 'greatest', false);
    }
    if ((m = text.match(/^Which of these fractions is the (greatest|smallest)\?$/)))
      return compareFour('mixed compare', m[1] === 'greatest', false);

    /* --- comparing, as a Singapore word problem. The wholes must be declared the
       same size: comparing fractions of different wholes is not a question. --- */
    if ((m = text.match(/^.+ each bought a same-size .+\. .+\. Who ate the (most|least)\?$/))) {
      const wantMax = m[1] === 'most';
      const pairs = [...String(q.q).matchAll(/([A-Z][a-z]+) ate <span class="frac"><span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/g)]
        .map(x => [x[1], Number(x[2]), Number(x[3])]);
      if (pairs.length !== 4) return `who ate most: ${pairs.length} name+fraction pairs found, expected 4`;
      if (pairs.some(p => p[1] >= p[2] || p[2] > 12)) return 'who ate most: a share is not a proper fraction with a denominator to 12';
      const vals = pairs.map(p => p[1] / p[2]);
      if (new Set(vals.map(v => Math.round(v * 1e6))).size !== 4) return 'who ate most: two of the four shares are the same amount';
      const tops = new Set(pairs.map(p => p[1])), bots = new Set(pairs.map(p => p[2]));
      if (tops.size !== 1 && bots.size !== 1) return 'who ate most: the shares share neither the top nor the bottom number, so no P3 comparing rule applies';
      const want = wantMax ? Math.max(...vals) : Math.min(...vals);
      const who = pairs[vals.findIndex(v => near(v, want))][0];
      const opts = q.choices.map(strip);
      if (new Set(opts).size !== 4 || !pairs.every(p => opts.includes(p[0])))
        return 'who ate most: the four options are not the four names in the stem';
      return strip(q.answerText) === who ? null : `who ate most: expected ${who}, got ${strip(q.answerText)}`;
    }

    /* --- error spotting 1 of 3: DIAGNOSE a comparing belief ------------------
       THE KILL, Sweep fractions Refutation 2026-09-15. The old item printed one
       belief and one fixed key sentence, and the key was the only option not
       written "X should have ..." and the longest option, on 2,000 of 2,000
       draws. Three beliefs are authored now and the key rotates between them, so
       the oracle can no longer check a constant: it re-derives WHICH belief the
       stem printed and then demands the matching sentence.

       gAddError fingerprints its belief by the claim's VALUE. A comparison claim
       carries no such number - "A is greater than B" is the same sentence
       whichever wrong rule produced it - so the fingerprint is the child's stated
       REASON, and this oracle fails the build unless that reason matches exactly
       one of the three authored forms, is arithmetically true of the two printed
       fractions, and runs the same way round as the claim it is given for.

       It must stay ABOVE the add error-spot branch: the `sum` belief's reason
       prints "1 + 6 = 7 and 1 + 4 = 5", which that branch's regex would claim. */
    if ((m = text.match(/^(.+?) says (\d+) is (greater|smaller) than (\d+)\. (?:She|He) worked out (\d+) for (\d+) and (\d+) for (\d+), and took the larger of those two numbers to mean the larger fraction\. What did (?:she|he) do wrong\?$/))) {
      const name = m[1], rel = m[3];
      const X = Number(m[5]), Y = Number(m[7]);
      const fs = allFracs(q.q);
      if (fs.length !== 4) return `compare error-spot: ${fs.length} fractions in the stem, expected 4`;
      const A = fs[0], B = fs[1];
      /* the stem prints each fraction twice - once in the claim, once beside the
         number the child worked out - and the oracle refuses a stem where the two
         printings disagree, which is how "7 for 2/5" is tied to 2/5 */
      if (fs[2][0] !== A[0] || fs[2][1] !== A[1] || fs[3][0] !== B[0] || fs[3][1] !== B[1])
        return 'compare error-spot: the two workings are not written beside the two fractions of the claim';
      if (m[2] !== String(A[0]) + String(A[1]) || m[4] !== String(B[0]) + String(B[1]) ||
          m[6] !== String(A[0]) + String(A[1]) || m[8] !== String(B[0]) + String(B[1]))
        return 'compare error-spot: the rendered claim does not read back as the two fractions';
      if (A[0] >= A[1] || B[0] >= B[1] || A[1] > 12 || B[1] > 12)
        return `compare error-spot: ${show(A)} or ${show(B)} is not a proper fraction with a denominator to 12`;
      if (A[0] * B[1] === B[0] * A[1]) return `compare error-spot: ${show(A)} and ${show(B)} are worth the same amount`;
      /* the child's rule is "the bigger number I worked out is the bigger
         fraction", so the claim follows from the two printed numbers ... */
      if (X === Y) return 'compare error-spot: the two workings are the same number, so no claim follows from them';
      if ((X > Y) !== (rel === 'greater'))
        return `compare error-spot: ${X} against ${Y} does not produce the claim "${show(A)} is ${rel} than ${show(B)}"`;
      /* ... and the claim it produces must be FALSE, or there is nothing to diagnose */
      if ((X > Y) === (A[0] * B[1] > B[0] * A[1]))
        return `compare error-spot: the claim ${show(A)} is ${rel} than ${show(B)} is actually TRUE`;
      /* THE FINGERPRINT. Five passes fingerprinted the belief by the WORDS of the
         child's stated reason, and every one of those was read back off the row by
         some attack. The stem prints only the two numbers now, and which named
         belief produced them is a fact about the two printed fractions: exactly one
         of the four must fit, or the item does not name a single mistake. */
      const SAY = {
        top:    { f: p => p[0],        s: ' compared the top numbers and left the bottom numbers out.' },
        bottom: { f: p => p[1],        s: ' thought a bigger bottom number makes a bigger fraction.' },
        sum:    { f: p => p[0] + p[1], s: ' added the top number to the bottom number in each fraction.' },
        gap:    { f: p => p[1] - p[0], s: ' counted the pieces that are missing instead of the ones there.' }
      };
      const hits = Object.keys(SAY).filter(id => SAY[id].f(A) === X && SAY[id].f(B) === Y);
      if (hits.length !== 1)
        return `compare error-spot: ${X} for ${show(A)} and ${Y} for ${show(B)} matches ${hits.length} named beliefs, expected exactly 1`;
      const want = name + SAY[hits[0]].s;
      if (strip(q.answerText) !== want) return `compare error-spot: expected "${want}", got "${strip(q.answerText)}"`;
      /* EVERY row is the same four sentences - the PM's wave-1 law. There is no
         filler paired to the belief any more, which is what made the v5 row name
         its own key on 100.00% of draws, and no option carries anything the other
         three do not, so the row alone is worth chance and nothing else. */
      const opts = q.choices.map(strip);
      const wantRow = Object.keys(SAY).map(id => name + SAY[id].s).sort();
      if (opts.slice().sort().join(' | ') !== wantRow.join(' | '))
        return `compare error-spot: the option row is not the four named beliefs (${opts.join(' | ')})`;
      return null;
    }

    /* --- ordering three fractions, in the direction the stem asks for -------- */
    if ((m = text.match(/^Put these fractions in order, from the (smallest to the greatest|greatest to the smallest): .+\. Which order is correct\?$/))) {
      const asc = m[1] === 'smallest to the greatest';
      const shown = allFracs(q.q);
      if (shown.length !== 3) return `ordering: ${shown.length} fractions in the stem, expected 3`;
      if (shown.some(f => f[0] >= f[1] || f[1] > 12)) return 'ordering: a fraction is not proper with a denominator to 12';
      const vals = shown.map(f => f[0] / f[1]);
      if (new Set(vals.map(v => Math.round(v * 1e6))).size !== 3) return 'ordering: two of the three fractions are the same amount';
      const want = shown.slice().sort((a, b) => asc ? a[0] * b[1] - b[0] * a[1] : b[0] * a[1] - a[0] * b[1]);
      const seq = s => allFracs(s).map(f => f[0] + '/' + f[1]).join(' ');
      const wantSeq = want.map(f => f[0] + '/' + f[1]).join(' ');
      const opts = (q.choices || []).map(seq);
      if (opts.length !== 4 || opts.some(o => o.split(' ').length !== 3)) return 'ordering: an option does not list exactly three fractions';
      const setOf = o => o.split(' ').slice().sort().join(' ');
      if (opts.some(o => setOf(o) !== setOf(wantSeq))) return 'ordering: an option lists a fraction that is not in the stem';
      const right = opts.filter(o => o === wantSeq).length;
      if (right !== 1) return `ordering: ${right} of the four options are in the right order`;
      if (seq(q.q) === wantSeq) return 'ordering: the stem already lists the fractions in the answer order';
      return seq(q.answerText) === wantSeq ? null : `ordering: expected ${wantSeq}, got ${seq(q.answerText)}`;
    }

    /* --- the gap in an already-ordered row (WOUND 1's second `order` format) ---
       SECOND PASS 2026-09-15, WOUND 2. The gap used to be the MIDDLE slot on every
       draw, so this oracle could look for the one option "between the two printed
       neighbours" - and so could a child, without ever knowing which way the row
       ran. The gap is now the smallest, the middle or the greatest slot, drawn
       evenly, so the oracle re-derives the row from the rendered '?' position and
       asserts the general rule: dropping the option into the gap must leave the
       whole row strictly increasing in value in the direction the stem declares,
       and EXACTLY one of the four may do it. At an end that is a one-sided test,
       which is the point - a child running the order backwards now gets it wrong. */
    if ((m = text.match(/^These fractions are in order, from the (smallest to the greatest|greatest to the smallest): (.+)\. Which fraction belongs in the gap\?$/))) {
      const asc = m[1] === 'smallest to the greatest';
      const cells = m[2].split(', ');
      if (cells.length !== 3) return `ordered gap: the row prints ${cells.length} cells, expected 3`;
      const gapAt = cells.indexOf('?');
      if (gapAt < 0 || cells.filter(c => c === '?').length !== 1) return 'ordered gap: the row does not print exactly one gap';
      const shown = allFracs(q.q);
      if (shown.length !== 2) return `ordered gap: ${shown.length} fractions printed in the row, expected 2`;
      if (shown.some(f => f[0] >= f[1] || f[1] > 12)) return 'ordered gap: a fraction in the row is not proper with a denominator to 12';
      if (fOpts.length !== 4 || fOpts.some(o => !o)) return 'ordered gap: an option is not a rendered fraction';
      if (fOpts.some(o => o[0] >= o[1] || o[1] > 12)) return 'ordered gap: an option is not proper with a denominator to 12';
      const sameD = shown[0][1] === shown[1][1] && fOpts.every(o => o[1] === shown[0][1]);
      const sameN = shown[0][0] === shown[1][0] && fOpts.every(o => o[0] === shown[0][0]);
      if (!sameD && !sameN) return 'ordered gap: the row and the options share neither the top nor the bottom number, so no P3 ordering rule applies';
      if (fOpts.some(o => shown.some(p => fEq(o, p)))) return 'ordered gap: an option repeats a fraction already printed in the row';
      /* rebuild the row with the candidate in the gap, read in VALUE order */
      const fitsRow = o => {
        const cell = cells.map(c => c === '?' ? o : null);
        let j = 0;
        for (let i = 0; i < 3; i++) if (!cell[i]) cell[i] = shown[j++];
        const seq = asc ? cell : cell.slice().reverse();
        return seq[0][0]*seq[1][1] < seq[1][0]*seq[0][1] && seq[1][0]*seq[2][1] < seq[2][0]*seq[1][1];
      };
      /* the printed pair must already run the way the stem says */
      const pair = asc ? shown : shown.slice().reverse();
      if (!(pair[0][0]*pair[1][1] < pair[1][0]*pair[0][1]))
        return `ordered gap: the row prints ${show(shown[0])} then ${show(shown[1])} but declares ${m[1]}`;
      const fitters = fOpts.filter(fitsRow);
      if (fitters.length !== 1) return `ordered gap: ${fitters.length} of the four options fit the gap, expected exactly 1`;
      return fEq(fitters[0], keyF) ? null : `ordered gap: expected ${show(fitters[0])}, key is ${show(keyF)}`;
    }

    /* --- equivalence: the two inverses, then recognition -------------------- */
    if (/What is the missing numerator\?$/.test(text)) {
      const from = parseFrac(q.q);
      const to = q.q.match(/<span class="n">\?<\/span><span class="d">(-?\d+)<\/span>/);
      if (!from || !to) return 'missing numerator: the stem does not print n/d = ?/D';
      const D = Number(to[1]);
      if (D > 12) return `missing numerator: denominator ${D} exceeds 12`;
      if (gcd(from[0], from[1]) !== 1) return `missing numerator: the given fraction ${show(from)} is not in its simplest form`;
      if (D % from[1] !== 0) return `missing numerator: ${D} is not a whole number of ${from[1]}s`;
      const k = D / from[1];
      if (k < 2) return 'missing numerator: the scale factor is not greater than 1';
      const e = from[0] * k;
      if (e >= D) return `missing numerator: ${e}/${D} is not a proper fraction`;
      return near(e, ansNum) ? null : `missing numerator: expected ${e} for ${show(from)} -> ?/${D}, got ${ansNum}`;
    }
    if (/What is the missing denominator\?$/.test(text)) {
      const from = parseFrac(q.q);
      const to = q.q.match(/<span class="n">(-?\d+)<\/span><span class="d">\?<\/span>/);
      if (!from || !to) return 'missing denominator: the stem does not print n/d = N/?';
      const N = Number(to[1]);
      if (gcd(from[0], from[1]) !== 1) return `missing denominator: the given fraction ${show(from)} is not in its simplest form`;
      if (N % from[0] !== 0) return `missing denominator: ${N} is not a whole number of ${from[0]}s`;
      const k = N / from[0];
      if (k < 2) return 'missing denominator: the scale factor is not greater than 1';
      const e = from[1] * k;
      if (e > 12) return `missing denominator: ${e} exceeds the P3 denominator limit of 12`;
      if (N >= e) return `missing denominator: ${N}/${e} is not a proper fraction`;
      return near(e, ansNum) ? null : `missing denominator: expected ${e} for ${show(from)} -> ${N}/?, got ${ansNum}`;
    }
    if (/^Which fraction is equivalent to /.test(text)) {
      const f = parseFrac(q.q);
      if (!f || !keyF) return 'equivalent: the stem or the key has no rendered fraction';
      if (f[0] >= f[1] || f[1] > 12) return `equivalent: the given fraction ${show(f)} is not proper with a denominator to 12`;
      if (!fEq(f, keyF)) return `equivalent: ${show(keyF)} is not equivalent to ${show(f)}`;
      if (keyF[1] > 12) return `equivalent: key denominator ${keyF[1]} exceeds 12`;
      /* WOUND 2 (refutation 2026-09-15): the stem used to print the simplest-form
         fraction on every draw, which is why the generator had ELEVEN distinct
         stems. It now runs both ways, so the direction-specific assertion splits:
         scaling UP must start from a fraction already in its simplest form, and
         regrouping DOWN must land on one. Either way the key may not be written
         over the same bottom number as the fraction it is equivalent to. */
      if (keyF[1] === f[1]) return `equivalent: the key ${show(keyF)} is written over the same bottom number as ${show(f)}`;
      if (keyF[1] > f[1] && gcd(f[0], f[1]) !== 1) return `equivalent: scaling up from ${show(f)}, which is not itself in its simplest form`;
      if (keyF[1] < f[1] && gcd(keyF[0], keyF[1]) !== 1) return `equivalent: the regrouped key ${show(keyF)} is not itself in its simplest form`;
      for (let i = 0; i < fOpts.length; i++)
        if (i !== q.correct && fEq(fOpts[i], f)) return 'equivalent: a distractor is also equivalent';
      return null;
    }

    /* --- simplest form: direct, negative form, and CORRECT the mistake ------- */
    if (/^Express .+ in its simplest form\.$/.test(text)) {
      const f = parseFrac(q.q);
      if (!f || !keyF) return 'simplest: the stem or the key has no rendered fraction';
      if (f[0] >= f[1] || f[1] > 12) return `simplest: ${show(f)} is not a proper fraction with a denominator to 12`;
      const g2 = gcd(f[0], f[1]);
      if (g2 < 2) return `simplest: ${show(f)} is already in its simplest form, so the question has nothing to do`;
      const e = [f[0] / g2, f[1] / g2];
      if (keyF[0] !== e[0] || keyF[1] !== e[1]) return `simplest: expected ${show(e)}, got ${show(keyF)}`;
      for (let i = 0; i < fOpts.length; i++)
        if (i !== q.correct && fEq(fOpts[i], keyF)) return 'simplest: a distractor is worth what the key is worth';
      return null;
    }
    if (/^Which of these fractions is already in its simplest form\?$/.test(text)) {
      if (fOpts.length !== 4 || fOpts.some(o => !o)) return 'already simplest: an option is not a rendered fraction';
      if (fOpts.some(o => o[0] >= o[1] || o[1] > 12)) return 'already simplest: an option is not a proper fraction with a denominator to 12';
      const simp = fOpts.filter(o => gcd(o[0], o[1]) === 1);
      if (simp.length !== 1) return `already simplest: ${simp.length} of the four options are already in simplest form`;
      if (!keyF || keyF[0] !== simp[0][0] || keyF[1] !== simp[0][1])
        return `already simplest: expected ${show(simp[0])}, got ${show(keyF)}`;
      /* WOUND 4 (refutation 2026-09-15): `why` was built from the slips array, i.e.
         the order BEFORE finishFrac shuffles, so the teaching card walked the three
         distractors in a different order from the screen in 83.3% of draws and a P3
         child had to hunt for each line. Gated, not just fixed. */
      const walk = [...String(q.explain || '').matchAll(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/g)]
        .map(x => x[1] + '/' + x[2]).slice(0, 3).join(' ');
      const screen = fOpts.map((o, i) => i === q.correct ? null : o).filter(Boolean).map(o => o[0] + '/' + o[1]).join(' ');
      if (walk !== screen)
        return `already simplest: the card walks ${walk} but the screen shows ${screen} - the explanation is out of step with the options`;
      return null;
    }
    if ((m = text.match(/^(.+?) says .+ in its simplest form is .+, because (?:she|he) took (\d+) away from the top and (\d+) away from the bottom\. What is .+ in its simplest form\?$/))) {
      const t2 = Number(m[2]);
      if (Number(m[3]) !== t2) return 'simplest error-spot: the stem takes different amounts off the top and the bottom';
      const fs = allFracs(q.q);
      if (fs.length !== 3) return `simplest error-spot: ${fs.length} fractions in the stem, expected 3`;
      const F = fs[0], claim = fs[1], F2 = fs[2];
      if (F[0] !== F2[0] || F[1] !== F2[1]) return 'simplest error-spot: the stem names two different fractions';
      if (F[0] >= F[1] || F[1] > 12) return `simplest error-spot: ${show(F)} is not a proper fraction with a denominator to 12`;
      if (claim[0] !== F[0] - t2 || claim[1] !== F[1] - t2)
        return `simplest error-spot: the printed claim ${show(claim)} is not ${F[0]} - ${t2} over ${F[1]} - ${t2}`;
      const g2 = gcd(F[0], F[1]);
      if (g2 < 2) return `simplest error-spot: ${show(F)} is already in its simplest form`;
      const e = [F[0] / g2, F[1] / g2];
      if (claim[0] * e[1] === e[0] * claim[1]) return `simplest error-spot: the "wrong" claim ${show(claim)} is worth the right answer`;
      if (!keyF || keyF[0] !== e[0] || keyF[1] !== e[1]) return `simplest error-spot: expected ${show(e)}, got ${show(keyF)}`;
      /* SECOND PASS, WOUND 1: the whole named list, re-derived from the stem, in
         place of "the printed wrong answer must be offered" - which was what kept
         two of the three slips below the key on every draw. */
      return fromList('simplest error-spot', [
        [F[0]-t2, F[1]-t2], [F[0]+t2, F[1]+t2], [F[0]+1, F[1]], [e[0], F[1]], [F[0]-t2, F[1]],
        [e[0], e[1]-1], [e[0]-1, e[1]-1], [e[0]+1, e[1]], [e[0]+1, e[1]+1],
        /* THIRD PASS 2026-09-16, W5: [N+t, D+t] is the only candidate the named
           beliefs put ABOVE the key and the 12 cap takes it off most draws, so
           three-above - the key as the smallest of four - sat at 13.7%, inside the
           new rank floor's noise. These five are its mirrors and its miscounts. */
        [F[0]+t2, F[1]], [F[0]+2, F[1]], [F[0]+1, F[1]-1], [F[0]+2, F[1]-1],
        [e[0]-1, e[1]], [e[0]+1, e[1]-1], [e[0], e[1]-2], [e[0], e[1]+1]
      ]);
    }

    /* --- adding and subtracting: like, from one whole, related, and the two
       word formats. Every key must be printed in the house form (the exact
       numerator over the exact denominator), not merely equivalent to it. --- */
    /* (?!1 ) keeps "1 - a/d = ?" out of this branch: stripped, its first token is
       the whole number 1, not a fraction, and it has its own oracle below. */
    if ((m = text.match(/^(?!1 )\d+ ([+−-]) \d+ = \?$/))) {
      const fs = allFracs(q.q);
      if (fs.length !== 2) return `like fractions: ${fs.length} fractions rendered, expected 2`;
      const A = fs[0], B = fs[1];
      if (A[1] !== B[1]) return `like fractions: ${A[1]} and ${B[1]} are not the same bottom number`;
      if (A[1] > 12) return `like fractions: denominator ${A[1]} exceeds 12`;
      if (A[0] >= A[1] || B[0] >= B[1]) return 'like fractions: an operand is not a proper fraction';
      const top = m[1] === '+' ? A[0] + B[0] : A[0] - B[0];
      if (top < 1) return 'like fractions: the answer is zero or negative';
      if (top >= A[1]) return 'like fractions: the answer is not within one whole';
      if (!keyF) return 'like fractions: the key is not a rendered fraction';
      return (keyF[0] === top && keyF[1] === A[1]) ? null
        : `like fractions: expected ${top}/${A[1]}, got ${show(keyF)}`;
    }
    if (/^1 [−-] \d+ = \?$/.test(text)) {
      const fs = allFracs(q.q);
      if (fs.length !== 1) return `one minus: ${fs.length} fractions rendered, expected 1`;
      const A = fs[0];
      if (A[0] >= A[1] || A[1] > 12) return `one minus: ${show(A)} is not a proper fraction with a denominator to 12`;
      if (!keyF) return 'one minus: the key is not a rendered fraction';
      const top = A[1] - A[0];
      /* SECOND PASS, WOUND 1: the whole named list, re-derived, in place of the one
         distractor the old check demanded. */
      const badM = fromList('one minus', [
        [A[0], A[1]], [top+1, A[1]], [top-1, A[1]], [top, A[1]-1], [top, A[1]+1],
        [top+1, A[1]-1], [top-1, A[1]-1]
      ]);
      if (badM) return badM;
      /* SECOND PASS, W2: on d = 2a the part taken away IS what is left, and the card
         said it was "not the part that is left" - 26.0% of draws. */
      if (2 * A[0] === A[1] && /is the part that was taken away, not the part that is left/.test(strip(q.explain)))
        return `one minus: the card calls the key ${show(keyF)} "the part that was taken away, not the part that is left"`;
      return (keyF[0] === top && keyF[1] === A[1]) ? null
        : `one minus: expected ${top}/${A[1]}, got ${show(keyF)}`;
    }
    /* --- making one whole, answered in SMALLER pieces (WOUND 1's second `wholes`
       format). Two steps, so the oracle checks both: the answer completes the
       whole, AND it is written over the bottom number the stem asks for, which
       must be a genuine multiple of the stem's own. --- */
    /* SECOND PASS 2026-09-15, W4: authored at 25 distinct stems and served 1.70
       times a session, so the same move is asked three ways now. The oracle admits
       exactly those three readings and nothing else. */
    if ((m = text.match(/^(.+) What is the missing fraction, written in (\d+)ths\?$/))) {
      const lead = m[1], D = Number(m[2]);
      if (!/^(?:\d+ \+ \? = 1|\? \+ \d+ = 1|1 [−-] \d+ = \?)$/.test(lead))
        return `make one in parts: the stem reads "${lead}", which is not one of the three one-whole forms`;
      const fs = allFracs(q.q);
      if (fs.length !== 1) return `make one in parts: ${fs.length} fractions rendered, expected 1`;
      const A = fs[0];
      if (A[0] >= A[1] || A[1] > 12) return `make one in parts: ${show(A)} is not a proper fraction with a denominator to 12`;
      if (D > 12) return `make one in parts: the answer is asked for in ${D}ths, past the P3 denominator limit of 12`;
      if (D % A[1] !== 0) return `make one in parts: ${D} is not a whole number of ${A[1]}s, so the two are not RELATED fractions`;
      if (D / A[1] < 2) return 'make one in parts: the answer is asked for in the same pieces the stem prints, so there is no second step';
      if (!keyF) return 'make one in parts: the key is not a rendered fraction';
      const top = D - (D / A[1]) * A[0];
      if (!near(A[0] / A[1] + fVal(keyF), 1)) return `make one in parts: ${show(A)} + ${show(keyF)} != 1`;
      return (keyF[0] === top && keyF[1] === D) ? null
        : `make one in parts: expected ${top}/${D}, got ${show(keyF)}`;
    }
    if (/\+ \? = 1 What is the missing fraction\?$/.test(text)) {
      const fs = allFracs(q.q);
      if (fs.length !== 1) return `make one: ${fs.length} fractions rendered, expected 1`;
      const A = fs[0];
      if (A[0] >= A[1] || A[1] > 12) return `make one: ${show(A)} is not a proper fraction with a denominator to 12`;
      if (!keyF) return 'make one: the key is not a rendered fraction';
      const top = A[1] - A[0];
      if (!near(A[0] / A[1] + fVal(keyF), 1)) return `make one: ${show(A)} + ${show(keyF)} != 1`;
      return (keyF[0] === top && keyF[1] === A[1]) ? null
        : `make one: expected ${top}/${A[1]}, got ${show(keyF)}`;
    }
    if ((m = text.match(/^(Add|Subtract): \d+ [+−-] \d+ = \?$/))) {
      const fs = allFracs(q.q);
      if (fs.length !== 2) return `related fractions: ${fs.length} fractions rendered, expected 2`;
      const A = fs[0], B = fs[1];
      if (A[0] >= A[1] || B[0] >= B[1]) return 'related fractions: an operand is not a proper fraction';
      if (B[1] > 12) return `related fractions: denominator ${B[1]} exceeds 12`;
      if (B[1] % A[1] !== 0) return `related fractions: ${B[1]} is not a multiple of ${A[1]}, so the fractions are not RELATED (that is P4 work)`;
      const k = B[1] / A[1];
      if (k < 2) return 'related fractions: the two denominators are the same - that is a LIKE fraction item, not a related one';
      const top = m[1] === 'Add' ? k * A[0] + B[0] : k * A[0] - B[0];
      if (top < 1) return 'related fractions: the answer is zero or negative';
      if (top >= B[1]) return 'related fractions: the answer is not within one whole';
      if (gcd(top, B[1]) !== 1) return `related fractions: the key ${top}/${B[1]} is not in its simplest form, so an equivalent option would be defensible too`;
      if (!keyF) return 'related fractions: the key is not a rendered fraction';
      return (keyF[0] === top && keyF[1] === B[1]) ? null
        : `related fractions: expected ${top}/${B[1]}, got ${show(keyF)}`;
    }

    /* --- the pool-3 refill: which fraction lies BETWEEN two printed ones -----
       SWEEP FRACTIONS REFUTATION, SIXTH PASS 2026-09-16, KILL 2. gCompareError is
       retired and this is the format that takes its pool-3 `compare` slot. The
       oracle re-derives the whole item from the two RENDERED bounds: the two ends
       must be related (one bottom number a multiple of the other, which is the
       only comparison P3 owns), exactly ONE option may lie strictly between them,
       that option must be the key, and at least two values must lie between the
       ends so that the stem cannot name the key by itself - which is the RULE 12
       condition written where the numbers are. */
    if ((m = text.match(/^Which of these fractions is between (.+) and (.+)\?$/))) {
      const fs = allFracs(q.q);
      if (fs.length !== 2) return `between: ${fs.length} fractions in the stem, expected 2`;
      const L = fs[0], U = fs[1];
      if (!fOpts.every(o => o)) return 'between: an option is not a rendered fraction';
      if (L[1] > 12 || U[1] > 12) return `between: a printed bottom number exceeds the P3 limit of 12`;
      if (L[0] >= L[1] || U[0] >= U[1]) return 'between: a printed end is not a proper fraction';
      if (L[0] * U[1] >= U[0] * L[1]) return `between: the ends ${show(L)} and ${show(U)} are not printed smallest first`;
      const big = Math.max(L[1], U[1]), small = Math.min(L[1], U[1]);
      if (big % small !== 0) return `between: ${L[1]} and ${U[1]} are not related bottom numbers, so comparing them is not a P3 step`;
      if (big === small) return 'between: both ends are written over the same bottom number, so no conversion is needed and the item is one step';
      /* how many bottom-number-`big` fractions lie strictly between the ends */
      const inside = [];
      for (let t = 1; t < big; t++)
        if (L[0] * big < t * L[1] && t * U[1] < U[0] * big) inside.push(t);
      if (inside.length < 2)
        return `between: only ${inside.length} fraction(s) in ${big}ths lie between ${show(L)} and ${show(U)}, so the stem alone names the key`;
      const strictly = p => L[0] * p[1] < p[0] * L[1] && p[0] * U[1] < U[0] * p[1];
      const hits = fOpts.map((o, i) => strictly(o) ? i : -1).filter(i => i >= 0);
      if (hits.length !== 1) return `between: ${hits.length} options lie strictly between ${show(L)} and ${show(U)}`;
      if (hits[0] !== q.correct)
        return `between: the option strictly between the ends is ${show(fOpts[hits[0]])}, and the key is ${show(keyF)}`;
      if (keyF[1] !== big) return `between: the key ${show(keyF)} is not written in the smaller pieces the conversion produces (${big}ths)`;
      if (!fOpts.some((o, i) => i !== q.correct && o[1] === keyF[1]))
        return 'between: the key is the only option over its own bottom number, so "pick the odd bottom number" answers it';
      if (!fOpts.some((o, i) => i !== q.correct && o[1] === small))
        return 'between: no option is written over the smaller bottom number the stem prints, so the coupling rule isolates the key';
      return null;
    }

    /* --- error spotting 2 of 3: DIAGNOSE the added-denominators mistake ------ */
    if ((m = text.match(/^(.+?) says .+ \+ .+ = .+\. What did (?:she|he) do wrong\?$/))) {
      const name = m[1];
      const fs = allFracs(q.q);
      if (fs.length !== 3) return `add error-spot: ${fs.length} fractions in the stem, expected 3`;
      const A = fs[0], B = fs[1], claim = fs[2];
      if (A[1] !== B[1]) return 'add error-spot: the two fractions are not like fractions';
      if (A[1] > 12) return `add error-spot: denominator ${A[1]} exceeds 12`;
      const trueTop = A[0] + B[0];
      if (trueTop >= A[1]) return 'add error-spot: the true sum is not within one whole';
      if (claim[0] * A[1] === trueTop * claim[1]) return `add error-spot: the "wrong" claim ${show(claim)} is worth the true answer`;
      /* WOUND 3 (refutation 2026-09-15): with b === 1 the multiply claim a x 1 = a
         IS one of the addends, so 31.8% of draws printed "Siti says 5/12 + 1/12 =
         5/12" - the named belief invisible and the reading a child actually has
         ("she forgot the second one") not on the option list. */
      if (claim[0] * A[1] === A[0] * claim[1] || claim[0] * B[1] === B[0] * claim[1])
        return `add error-spot: the "wrong" claim ${show(claim)} is worth one of the two addends, so the named belief leaves no trace`;
      /* SIXTH PASS 2026-09-16, RULE 13. `bottoms` was the only belief whose claim
         was NOT written over the stem's own bottom number, so one glyph test -
         "is the claim's bottom number the one the question prints?" - split the
         three beliefs one against two and settled the item on 76.8% of draws with
         no fraction read. It comes off the CLAIM bank and stays on the option row
         as a never-true sentence (the printed claim is always over d, so the
         bottom numbers were plainly not added). `gap`, over d like the other two,
         takes its place. See js/topics/p3-fractions.js FORMAT 4g. */
      const SLIPS = [
        [[A[0] - B[0], A[1]], name + ' subtracted the top numbers instead of adding them.'],
        [[A[0] * B[0], A[1]], name + ' multiplied the top numbers instead of adding them.'],
        [[A[1] - A[0] - B[0], A[1]], name + ' counted the empty pieces instead of the full ones.']
      ];
      const NEVER = [name + ' should have made the bottom numbers the same first.',
                     name + ' added both bottom numbers as well as the top ones.'];
      if (claim[1] !== A[1])
        return `add error-spot: the claim ${show(claim)} is not written over the stem's own bottom number ${A[1]}, so one glyph test separates the beliefs`;
      if (!q.choices.some(c => NEVER.indexOf(strip(c)) >= 0))
        return 'add error-spot: neither never-true sentence is on the row, so the fourth option is not drawn from the filler bank';
      if (q.choices.filter(c => NEVER.indexOf(strip(c)) >= 0).length !== 1)
        return 'add error-spot: two never-true sentences on one row, so a named belief has been dropped';
      const hits = SLIPS.filter(s => s[0][0] === claim[0] && s[0][1] === claim[1]);
      if (hits.length !== 1) return `add error-spot: the printed claim ${show(claim)} matches ${hits.length} named misconceptions for ${show(A)} + ${show(B)}`;
      if (strip(q.answerText) !== hits[0][1]) return `add error-spot: expected "${hits[0][1]}", got "${strip(q.answerText)}"`;
      if (q.choices.filter(c => strip(c).indexOf(name) === 0).length !== 4)
        return 'add error-spot: not every option opens with the name, so the key is the odd one out';
      /* THIRD PASS 2026-09-16, W3. All three belief sentences must be on the row -
         an unused belief is a distractor, not a missing one - and the three of them
         must be written to ONE length, so that neither the longest-option reader
         nor the shortest-option reader has anything to read. v3's key was the
         uniquely shortest option on exactly the 53.6% of draws where it was the
         answer. RULE 6 below now measures both directions across the run; this is
         the per-draw half of the same rule. */
      for (const s of SLIPS)
        if (!q.choices.some(c => strip(c) === s[1]))
          return `add error-spot: the belief "${s[1]}" is not on the option list, so the key has fewer than two named rivals`;
      const beliefLens = SLIPS.map(s => s[1].length);
      if (Math.max(...beliefLens) - Math.min(...beliefLens) > 2)
        return `add error-spot: the three belief sentences run ${Math.min(...beliefLens)}-${Math.max(...beliefLens)} characters, so the key can be picked with a ruler`;
      return null;
    }

    /* --- two-step word problem: add, then take from one whole --------------- */
    if (/^.+ eats .+ of a .+ and .+ eats .+ of the same .+\. What fraction of the .+ is left\?$/.test(text)) {
      const fs = allFracs(q.q);
      if (fs.length !== 2) return `cake left: ${fs.length} fractions in the stem, expected 2`;
      const A = fs[0], B = fs[1];
      if (A[1] !== B[1]) return 'cake left: the two shares are not like fractions';
      if (A[1] > 12) return `cake left: denominator ${A[1]} exceeds 12`;
      const eaten = A[0] + B[0];
      if (eaten >= A[1]) return 'cake left: the two of them eat a whole cake or more, so nothing is left to name';
      if (!keyF) return 'cake left: the key is not a rendered fraction';
      const top = A[1] - eaten;
      /* SECOND PASS, WOUND 1: the whole named list, re-derived from the two shares,
         in place of "the stop-after-step-1 answer must be offered" - which, with
         "subtracted only one share", held the key at the bottom of the row on 56.8%
         of draws. */
      /* FOURTH PASS 2026-09-16, W4(a). The stop-after-step-1 answer is the belief
         this format exists to catch, every earlier pass named it, and v4 quietly
         stopped offering it on two draws in three (65.3% -> 35.3%) because the
         value-rank seating reaches for whichever candidates balance the row. It is
         asserted here rather than left to the generator's good intentions. */
      if (!fOpts.some(o => o && o[0] === eaten && o[1] === A[1]))
        return `cake left: the stop-after-step-1 answer ${eaten}/${A[1]} is not on the row, so the two-step item's own belief is not offered`;
      const badC = fromList('cake left', [
        [eaten, A[1]], [A[1]-A[0], A[1]], [A[1]-B[0], A[1]],
        /* THIRD PASS 2026-09-16, W4: [eaten, 2*A[1]] - "added the bottom numbers as
           well" - printed a bottom number past 12 on 39.6% of this item's option
           rows and is out with the cap. Its place below the key is taken by the
           second-order miscounts the rest of the file already names. */
        [top-1, A[1]], [top, A[1]+1], [top-1, A[1]-1], [top, A[1]+2],
        [top+1, A[1]], [top, A[1]-1]
      ]);
      if (badC) return badC;
      return (keyF[0] === top && keyF[1] === A[1]) ? null
        : `cake left: expected ${top}/${A[1]}, got ${show(keyF)}`;
    }
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
    const to = q.q.match(/<span class="n">\?<\/span><span class="d">(-?\d+)<\/span>/);
    if (from && to) {
      const e = from[0] * (Number(to[1]) / from[1]);
      return near(e, ansNum) ? null : `missing numerator: expected ${e} for ${from[0]}/${from[1]} -> ?/${to[1]}, got ${ansNum}`;
    }
  }
  if (/missing denominator/i.test(text)) {
    const from = parseFrac(q.q);
    const to = q.q.match(/<span class="n">(-?\d+)<\/span><span class="d">\?<\/span>/);
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
  /* THE FRACTION FORM OF THE SAME BAN (depth sweep 2026-09-15). The rule above
     compares options as NUMBERS, and a rendered fraction strips to its digits run
     together ("3/8" -> "38"), so 1/2 beside 3/6 sailed through it: two options
     worth the same amount, which to a child who can reduce is two right answers
     and to one who cannot is a duplicate. Fires on any question whose options are
     ALL rendered fractions, in any topic.
     ONE EXEMPTION, declared: a "simplest form" stem legitimately offers an
     unsimplified equivalent (4/6 beside the key 2/3) - there the FORM is what is
     asked for, not the amount, and only one option is in simplest form. Nothing
     in this repo uses it today; the exemption exists so a later author does not
     have to weaken the rule to write that item. */
  {
    const fr4 = (q.choices || []).map(c => {
      const mm = String(c).match(/^<span class="frac"><span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span><\/span>$/);
      return mm ? [Number(mm[1]), Number(mm[2])] : null;
    });
    const asksForm = /simplest form/i.test(text);
    if (!asksForm && fr4.length > 1 && fr4.every(Boolean)) {
      for (let i = 0; i < fr4.length; i++) for (let j = i + 1; j < fr4.length; j++) {
        if (fr4[i][0] * fr4[j][1] === fr4[j][0] * fr4[i][1])
          return `coincidence: options ${fr4[i][0]}/${fr4[i][1]} and ${fr4[j][0]}/${fr4[j][1]} are the same amount`;
      }
    }
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
   print X >= Y. Was flipped in 1,710 of 8,000 draws across three generators.

   DEPTH SWEEP 2026-09-15 adds `fractions` to the set and two rules that are the
   fraction twins of rule 2:

   RULE 3, SAME-SIZE WHOLES. A stem in which two or more people eat or take a
   fraction must say the wholes are the same size. "Siti ate 3/8 and Kumar ate
   3/5" is not a question at all unless the two cakes are the same cake, and the
   wording inversion the refutation warned about is exactly this class: a stem
   whose words quietly contradict the arithmetic it wants.

   RULE 4, SYLLABUS SHAPE. Every rendered fraction in a P3 fractions item must be
   PROPER (an improper fraction and a mixed number are both MOE P4), and the KEY
   may not carry a denominator past 12. A named misconception is allowed a bigger
   bottom number up to 24 - adding the denominators really does give 5/14, and
   refusing to print it would take the mistake off the table - but nothing a child
   is asked to produce may leave the syllabus.

   SWEEP FRACTIONS REFUTATION 2026-09-15 adds the two rules that RULE 1 was too
   coarse to see. gCompareError shipped four options that were all prose, all four
   opening with the same child's name - so RULE 1's four-way form tally was 4-0
   and said nothing - while three of them read "X should have ..." and the key
   alone read "X forgot that ...", and the key was also the longest option, on
   2,000 of 2,000 draws. Form is not the only thing that can single an option out;
   the SENTENCE FRAME and the LENGTH are the other two, and both are now gated.

   RULE 5, SENTENCE FRAME (per draw, in pilotGates). When all four options are
   prose of two words or more, strip the words every option shares at the front
   (the child's name, "The", and so on) and take the next two words of each. If
   exactly one option's opening differs and the other three share one, that is the
   gLPerimDiff tell in prose clothing and the build fails. A 2-2 split, or three
   or four distinct openings, is fine - what is banned is the single odd one out.

   RULE 6, LENGTH (per GENERATOR, in the run loop below, because no single draw
   can show it). If the key is the unique longest of four prose options in 100% of
   a generator's draws, the item can be answered with a ruler. One exemption is
   declared: p4area.gLConcept, whose fixed option set keys "It stays the same."
   against "It gets smaller." / "It gets bigger." / "It is halved." - a real
   instance of this defect, two characters wide, in a file outside this lane's
   fence. It is named here rather than hidden so the next lane inherits it as a
   debt and not as a silent pass.

   THIRD PASS 2026-09-16, W3. RULE 6 looked only UPWARDS and only at 100%, and a
   ruler reads both ways: p3-fractions.js gAddError keyed the uniquely SHORTEST of
   its four sentences on 53.6% of 20,000 draws - the same 53.6% on which its key
   had stopped rotating - and nothing in this file could see it. The rule is now
   two-directional and the bar is 90% rather than 100%, matching the length-rank
   gate the p3numbers lane landed for the same defect class, and both rates are
   printed on every run so a bank drifting towards the line is visible before it
   arrives. The one declared exemption covers both directions.

   RULE 8, THE STEM ECHO (per GENERATOR, same loop; the gate that would have
   caught this pass's kill). RULE 8 was written for gCompareError in the second
   pass and SCOPED TO IT BY NAME inside its own oracle branch, so it never looked
   at gEqualParts twenty lines away - whose key restated the stem's own clause
   word for word and was the only option on the row containing "equal", "same",
   "size" or "all", on 100.00% of 20,000 draws out of eighteen option sets. Five
   gates and none of them could see the one thing wrong with it: RULE 1 saw four
   prose options, RULE 5 saw no odd opening, RULE 6 saw no length tell, RULE 7
   skips a row of sentences.

   So the rule is lifted out of one oracle branch and run over every prose bank in
   the topic, in two halves:
     - PER DRAW: at least two of the four options must name something the stem
       names (share a content word with it). One option repeating the stem is a
       word-matching item, not a mathematics item.
     - PER GENERATOR: the draws on which the key carries a content word OF THE
       STEM that no other option carries must stay under 60%. That is the
       measurable form of "the child can be right by matching the sentence".
   Scoped to `fractions`, like RULE 7 and for the same reason: the prose banks
   outside this lane have never been measured this way and two of them
   (geometry.gPeriError, p4area.gLConcept) go red on the per-draw half on the
   first run. Widening it is one entry in STEM_ECHO_TOPICS plus whatever those
   banks need, and it should go in before a fifth topic takes the depth-pilot
   contract. */
const PILOT_TOPICS = new Set(['geometry', 'tables', 'p4area', 'fractions']);
/* RULE 6's one declared exemption - see the block comment above. Both directions. */
const LENGTH_TELL_EXEMPT = new Set(['p4area.gLConcept']);
const LENGTH_TELL_CAP = 0.90;
/* RULE 8's fence - see the block comment above. */
const STEM_ECHO_TOPICS = new Set(['fractions']);
const STEM_ECHO_CAP = 0.60;
/* Function words only: "same", "size", "all" and "equal" are exactly the words the
   kill turned on, so none of them may be treated as noise. */
const ECHO_STOP = new Set(('the a an and or but so of to in on at is are was were be been it its this that these ' +
  'those for from with not no into out as by he she they you we his her their your my what which who why how when ' +
  'where can could would should has have had do does did than then them there here').split(' '));
const contentWords = s => strip(s).toLowerCase().replace(/[^a-z ]+/g, ' ').split(/\s+/).filter(Boolean)
  .map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))   /* one plural, one word */
  .filter(w => w.length >= 3 && !ECHO_STOP.has(w));
const optWords = s2 => strip(s2).split(' ').filter(Boolean);
/* all four options are sentences a child reads, not bare numbers or fraction rows */
const allProse = opts => opts.length === 4 &&
  opts.every(o => /[A-Za-z]{3}/.test(strip(o)) && optWords(o).length >= 2);
/* the two words that open each option once the shared opening is stripped off */
function frameOpenings(opts) {
  const ws = opts.map(optWords);
  const min = Math.min(...ws.map(w => w.length));
  let c = 0;
  while (c < min && ws.every(w => w[c].toLowerCase() === ws[0][c].toLowerCase())) c++;
  return ws.map(w => w.slice(c, c + 2).join(' ').toLowerCase());
}
/* the key is the unique longest of the four */
const keyIsLongest = (opts, correct) => {
  const lens = opts.map(o => strip(o).length), mx = Math.max(...lens);
  return lens[correct] === mx && lens.filter(l => l === mx).length === 1;
};
/* ... and the other direction (THIRD PASS 2026-09-16, W3) */
const keyIsShortest = (opts, correct) => {
  const lens = opts.map(o => strip(o).length), mn = Math.min(...lens);
  return lens[correct] === mn && lens.filter(l => l === mn).length === 1;
};
/* RULE 8's two measurements, on one draw. `named` is how many options say
   something the stem says; `echo` is true when the key alone carries a word of
   the stem. */
function stemEcho(stem, opts, correct) {
  const S = new Set(contentWords(stem));
  const W = opts.map(o => new Set(contentWords(o)));
  const named = W.filter(w => [...w].some(x => S.has(x))).length;
  const solo = [...W[correct]].filter(x => S.has(x) && W.every((w, j) => j === correct || !w.has(x)));
  return { named, solo };
}
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
    /* RULE 5: the same tell one layer in, on the sentence frame. */
    if (allProse(opts)) {
      const open = frameOpenings(opts);
      const t2 = new Map();
      for (const o of open) t2.set(o, (t2.get(o) || 0) + 1);
      if (t2.size === 2) {
        const odd2 = [...t2.entries()].find(([, c]) => c === 1);
        if (odd2) {
          const bulk2 = [...t2.entries()].find(([, c]) => c === 3);
          return `sentence-frame tell: one option opens "${odd2[0]} ..." while the other three open "${bulk2[0]} ..." (${opts.map(strip).join(' | ')})`;
        }
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
  if (topic === 'fractions') {
    const stem = strip(q.q);
    /* RULE 3: two or more people's fractions, one unstated whole. */
    const eaters = (stem.match(/ (ate|eats|takes|took) /g) || []).length;
    if (eaters >= 2 && !/same/.test(stem))
      return `two or more shares are compared or combined without saying the wholes are the same size: "${stem}"`;
    /* RULE 4: syllabus shape, on every rendered fraction reachable from the item. */
    const seen = [];
    eachString({ q: q.q, extra: q.extra || '', explain: q.explain || '', answerText: q.answerText, choices: q.choices || [] },
      '', seen, new Set());
    for (const [where, s] of seen) {
      for (const f of [...String(s).matchAll(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/g)]) {
        const n = Number(f[1]), d = Number(f[2]);
        /* n === d is allowed and is deliberate: "one whole is 8/8" is how P3
           teaches making one whole, and every explain in the `wholes` bank prints
           it. What is banned is n > d, which is a genuine improper fraction. */
        if (n > d) return `improper fraction ${n}/${d} rendered in ${where} - improper fractions and mixed numbers are MOE P4`;
        /* SECOND PASS 2026-09-15, W3(a)/W4 banned THIRTEEN and kept a readability
           cap of 24 for the named beliefs that genuinely overshoot.

           THIRD PASS 2026-09-16, W4: the cap of 24 is gone and TWELVE is the whole
           rule. "Thirteen is banned outright" read as a tightening while the
           ceiling in fact ROSE, undeclared, in four formats - sided() reaches for
           an overshoot candidate to break a one-sided value rank, and the overshoot
           a subtraction bank has is [a-b, 2d] and [a-b, d+b]. Measured on v3:
           gSubSame 39.8% of option rows past 12 (v2 declared 0.0%), gSubRelated
           40.1% (0.0%), gAddRelated 53.8%, gSimplest and gSimplestError ~4.8% each,
           ceilings 12 -> 24 and 12 -> 16. Rather than re-declare a moving ceiling a
           fourth time, NOTHING a P3 fractions item renders - stem, option, teaching
           card or figure - may carry a bottom number past 12. No named belief is
           lost to it: each one that used to overshoot is either still reachable at
           a smaller bottom number (gAddError draws the BELIEF first and then the
           numbers that fit it) or is now named in WORDS on the card instead of
           being printed as an off-syllabus fraction a child is asked to choose.
           Negative control: DEFECTS below reintroduces [a+b, 2d]. */
        if (d > 12) return `denominator ${d} rendered in ${where} is past the P3 limit of 12`;
      }
    }
    const kf = String(q.answerText).match(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/);
    if (kf && Number(kf[2]) > 12)
      return `the key ${kf[1]}/${kf[2]} carries a denominator past the P3 limit of 12`;
    /* FOURTH PASS 2026-09-16, W2. RULE 4 has never looked at an option that is a
       NUMBER rather than a fraction, and the two completion formats are the only
       place in the file where the option IS a bottom (or top) number: the child
       puts it into the stem's blank, so the row is a row of fractions that happen
       to be printed one half at a time. gEqMissingDen offered a bottom number past
       12 on 51.3% of draws, largest 22, while every rendered fraction in the file
       was inside 12 - the gate scanned for markup and this option is the string
       "18". The completed fraction is reconstructed here and held to the same rule.

       ASYMMETRY, DECLARED. The numerator row is also held to PROPER (a top number
       under the printed bottom), because the generator can afford that filter. The
       denominator row is held to the cap only: refusing every option that completes
       an improper fraction as well would leave that bank too few candidates to seat
       all four value ranks, and the lane note carries it as a declared residual. */
    const stemRaw = String(q.q);
    const bare = (q.choices || []).map(c => strip(c));
    if (bare.length === 4 && bare.every(t => /^\d+$/.test(t))) {
      let mm2 = stemRaw.match(/<span class="n">(-?\d+)<\/span><span class="d">\?<\/span>/);
      if (mm2 && /missing <b>denominator<\/b>/.test(stemRaw)) {
        const N = Number(mm2[1]);
        for (const t of bare) {
          const D = Number(t);
          if (D > 12) return `option "${t}" completes ${N}/${D}, a bottom number past the P3 limit of 12 - the option row of a completion stem IS a fraction`;
          if (D < 2) return `option "${t}" completes ${N}/${D}, which is not a fraction of a whole`;
        }
      }
      mm2 = stemRaw.match(/<span class="n">\?<\/span><span class="d">(-?\d+)<\/span>/);
      if (mm2 && /missing <b>numerator<\/b>/.test(stemRaw)) {
        const D = Number(mm2[1]);
        for (const t of bare) {
          const N = Number(t);
          if (D > 12) return `the completion stem prints a bottom number of ${D}, past the P3 limit of 12`;
          if (N >= D) return `option "${t}" completes ${N}/${D}, which is not a proper fraction`;
        }
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
/* RULE 6 + RULE 8's table: printed on every run, because a bank drifting towards
   either line is worth seeing before it arrives (THIRD PASS 2026-09-16). */
const proseRows = [];

for (const g of GENS) {
  let err = null, badQ = null, matched = 0;
  /* RULE 6 tallies: no single draw can show a length tell, only the whole run can.
     RULE 8's per-generator half rides in the same tally (THIRD PASS 2026-09-16). */
  let proseDraws = 0, keyLongest = 0, keyShortest = 0, keySolo = 0, lastProse = null;
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
    if (PILOT_TOPICS.has(g.topic) && allProse(q.choices || [])) {
      proseDraws++;
      lastProse = q;
      if (keyIsLongest(q.choices, q.correct)) keyLongest++;
      if (keyIsShortest(q.choices, q.correct)) keyShortest++;
      if (STEM_ECHO_TOPICS.has(g.topic)) {
        const e = stemEcho(q.q, q.choices, q.correct);
        if (e.solo.length) keySolo++;
        /* RULE 8, per draw. */
        if (e.named < 2) {
          err = `stem echo: only ${e.named} of the four options name anything the stem names, so the item is answered by matching the words (${(q.choices || []).map(strip).join(' | ')})`;
          badQ = q;
          break;
        }
      }
    }
    distinct.add(qKey(q));
    const o = oracle(q, g.topic);
    if (o === false) continue;
    matched++;
    if (o) { err = o; badQ = q; break; }
  }
  if (!err && distinct.size < DISTINCT_FLOOR) {
    err = `sample space collapsed: only ${distinct.size} distinct questions in ${N} draws`;
  }
  /* RULE 6, the length tell, BOTH WAYS (Sweep fractions Refutation, third pass). */
  if (!err && proseDraws >= 20 && !LENGTH_TELL_EXEMPT.has(g.topic + '.' + g.name)) {
    if (keyLongest / proseDraws >= LENGTH_TELL_CAP)
      err = `length tell: the key is the uniquely LONGEST of the four sentences in ${keyLongest} of ${proseDraws} draws - the item can be answered with a ruler`;
    else if (keyShortest / proseDraws >= LENGTH_TELL_CAP)
      err = `length tell: the key is the uniquely SHORTEST of the four sentences in ${keyShortest} of ${proseDraws} draws - the item can be answered with a ruler`;
    if (err) badQ = lastProse;
  }
  /* RULE 8, the stem echo, per generator (Sweep fractions Refutation, third pass). */
  if (!err && proseDraws >= 20 && STEM_ECHO_TOPICS.has(g.topic) && keySolo / proseDraws >= STEM_ECHO_CAP) {
    err = `stem echo: the key carries a word of the STEM that no other option carries in ${keySolo} of ${proseDraws} draws - "pick the option that repeats the sentence you just read" answers the item`;
    badQ = lastProse;
  }
  if (proseDraws >= 20) proseRows.push({
    name: g.topic + '.' + g.name, n: proseDraws,
    uLong: keyLongest / proseDraws, uShort: keyShortest / proseDraws,
    solo: STEM_ECHO_TOPICS.has(g.topic) ? keySolo / proseDraws : null,
    exempt: LENGTH_TELL_EXEMPT.has(g.topic + '.' + g.name)
  });
  const cov = Math.round((matched / N) * 100);
  rows.push({ topic: g.topic, name: g.name, skill: g.skill, n: N, distinct: distinct.size, cov, err });
  if (err) {
    failures++;
    if (badQ) console.error(`   sample: ${JSON.stringify({ q: strip(badQ.q), extra: strip(badQ.extra || ''), choices: (badQ.choices || []).map(strip), correct: badQ.correct, answerText: strip(badQ.answerText), answer: badQ.answer })}`);
  }
}

/* ---------- RULE 7: THE VALUE-RANK GATE -------------------------------------
   SWEEP FRACTIONS REFUTATION, SECOND PASS 2026-09-15, WOUND 1 - the one finding
   that reaches past this lane.

   RULE 1 gates option FORM, RULE 5 the SENTENCE FRAME, RULE 6 the LENGTH. Nothing
   anywhere in this repo asked where the KEY sits when the four options are sorted
   by VALUE. Sorted that way, five generators in p3-fractions.js pinned the key to
   one rank on 100.00% of 50,000 draws - gAddSame 3rd of 4, gEquivFromBar 2nd,
   gSubSame smallest, gSubRelated 3rd, gEqMissingDen LARGEST - covering 5.4 of every
   30 served items, and gEqMissingDen was therefore answered by "circle the biggest
   number on the row" every single time, without a fraction being read. Its twin
   gEqMissing keyed a non-extreme on 100.00%, which halves the row for any child who
   has noticed.

   THE CAUSE IS THE CONTRACT, which is why this gate matters beyond one file. "Key
   plus exactly three NAMED beliefs, padding branch provably dead" is the depth
   pilot's strongest rule and it is what produces the defect: a misconception errs
   in ONE direction, so three of them land on one side of the key and the rank
   collapses. Measured on the shipped baseline, a blind ranking policy scores 52.4%
   of served items; on this lane 52.1% - so it is not a topic-level regression. What
   changed is CONCENTRATION: the baseline's worst pin was 83.4%, the lane's were
   100.00%. A 50% pin is not learnable. A 100% pin is permanent.

   THE GATE. Over its OWN 4,000 draws - fixed, not SAMPLES, because a 33% rate
   cannot be told from a 45% one in 200 - every generator whose four options are all
   bare positive numbers or all single rendered fractions must keep:
     - the key's rank by value under 45% for each of the four ranks;
     - the key's rank by value at or OVER 12% for each of the four ranks;
     - "pick the smallest", "pick the largest", "pick the second largest" and
       "pick the second smallest" each under 40%;
     - "pick the smallest bottom number", scored as a policy (guess evenly among
       ties), under 40%.

   THIRD PASS 2026-09-16, W5, adds the last two of those. A CAP with no FLOOR only
   gates half the defect: a rank the key almost never takes is a rank a child can
   eliminate, and three generators left one nearly empty - gAddRelated keyed the
   smallest of four on 7.4%, gSubSame the largest on 8.4%, gEqMissing the largest on
   11.0%, each worth 4-6 percentage points to a child who has noticed. And the 40%
   policy cap covered smallest, largest and second largest but NOT second smallest,
   which was therefore allowed up to 45%; gPicIdentify sat at 39.2% and
   gEquivFromBar at 39.0% inside that gap. Both are closed, and the draw count is
   raised from 2,000 to 4,000 so that a bank sitting a few points inside a line is
   not failed or passed by sampling noise.

   FOR THE INTEGRATOR. The gate is scoped to `fractions` - the file this lane
   rewrote - and NOT to the rest of the bank, which has never been measured this way
   and whose generators would light up red on a first run. The two helpers below
   (valueRank and smallestDenPolicy) are the whole of the measurement and are
   deliberately topic-agnostic: widening the gate is one entry in RANK_TOPICS plus
   whatever exemptions that topic's compare/order formats need. It should go in
   before the depth-pilot contract is applied to a fourth topic, because the
   contract CAUSES the defect and nothing in the repo could see it.

   EXEMPTIONS, declared not hidden. A stem that PRINTS the extreme it wants
   ("which of these is the greatest?") keys the extreme BY CONSTRUCTION - that is
   the skill, not a tell - so the comparison formats whose stems do that are named
   here, and the exemption is checked against the stem rather than asserted: each
   entry below prints "greatest", "smallest", "most" or "least".

   THIRD PASS 2026-09-16, W1: gCompareBar is OUT of this set. It was the only one
   of the five whose stem does not name an extreme - 0.0% of draws against 100.0%
   for the other four - and it carried the exemption under a printed reason that
   was false of it, while "read the direction word and take that extreme of the
   row" answered it on 100.00% of 20,000 draws without the bar being read. The
   format has been rebuilt (js/topics/p3-fractions.js FORMAT 3b) and is gated here
   like everything else. gCompareWords stays listed and is separately vacuous - its
   options are names, so the row is not rankable and RULE 7 skips it anyway - but a
   dead entry that says what it is beats a silent one. */
const RANK_TOPICS = new Set(['fractions']);
const RANK_EXEMPT = new Set([
  'fractions.gCompareUnit', 'fractions.gCompareSameD',
  'fractions.gCompareWords', 'fractions.gGreatest4'
]);
const RANK_DRAWS = 4000;
const RANK_CAP = 0.45;          /* no single rank may hold more than this */
const RANK_FLOOR = 0.12;        /* ... and none may hold less: an empty rank is one a child eliminates */
const RANK_POLICY_CAP = 0.40;   /* "pick smallest / 2nd smallest / 2nd largest / largest / smallest bottom" */
/* The option row's four values, or null when it is not a rankable row: four bare
   positive integers, or four single rendered fractions. */
function optionValues(q) {
  const opts = q.choices || [];
  if (opts.length !== 4) return null;
  const vals = [];
  for (const o of opts) {
    const t = strip(o);
    const fs = [...String(o).matchAll(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/g)];
    if (fs.length === 1 && !/[A-Za-z]/.test(t)) { vals.push(Number(fs[0][1]) / Number(fs[0][2])); continue; }
    if (fs.length === 0 && /^\d+$/.test(t)) { vals.push(Number(t)); continue; }
    return null;
  }
  return vals;
}
/* 1 = the key is the smallest of the four by value, 4 = the largest. */
function valueRank(q) {
  const vals = optionValues(q);
  if (!vals) return null;
  const kv = vals[q.correct];
  if (vals.filter(v => v === kv).length !== 1) return null;
  return vals.filter(v => v < kv).length + 1;
}
/* "pick the smallest bottom number", scored as a policy: guess evenly among the
   options that tie for the smallest denominator. */
function smallestDenPolicy(q) {
  const opts = q.choices || [];
  if (opts.length !== 4) return null;
  const ds = [];
  for (const o of opts) {
    const fs = [...String(o).matchAll(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/g)];
    if (fs.length !== 1 || /[A-Za-z]/.test(strip(o))) return null;
    ds.push(Number(fs[0][2]));
  }
  const mn = Math.min(...ds), tied = ds.filter(d => d === mn).length;
  return ds[q.correct] === mn ? 1 / tied : 0;
}
/* The whole of RULE 7's verdict, in one place so the negative controls below run
   the same code the gate does rather than a restatement of it. */
const RANK_NAMES = ['smallest', 'second smallest', 'second largest', 'largest'];
function rankVerdict(rate, ranked, den, denDraws) {
  const over = rate.findIndex(x => x > RANK_CAP);
  if (over >= 0)
    return `value-rank tell: the key is the ${RANK_NAMES[over]} of the four options by value in ${(100 * rate[over]).toFixed(1)}% of ${ranked} draws - "pick the ${RANK_NAMES[over]}" answers the item without the mathematics`;
  for (const i of [0, 3, 2, 1])
    if (rate[i] >= RANK_POLICY_CAP)
      return `value-rank tell: "pick the ${RANK_NAMES[i]}" is right in ${(100 * rate[i]).toFixed(1)}% of ${ranked} draws`;
  /* THIRD PASS 2026-09-16, W5: the floor. A rank the key hardly ever takes is a
     rank a child learns to cross off, which turns a 1-in-4 guess into a 1-in-3. */
  const under = rate.findIndex(x => x < RANK_FLOOR);
  if (under >= 0)
    return `value-rank floor: the key is the ${RANK_NAMES[under]} of the four options by value in only ${(100 * rate[under]).toFixed(1)}% of ${ranked} draws - "the answer is never the ${RANK_NAMES[under]}" is worth ${(100 * (0.25 - rate[under]) / 3).toFixed(1)}pp to a child who has noticed`;
  if (denDraws && den >= RANK_POLICY_CAP)
    return `bottom-number tell: "pick the smallest bottom number" scores ${(100 * den).toFixed(1)}% over ${denDraws} draws`;
  return null;
}
/* One bank's rank profile, measured the way the gate measures it. */
function rankBank(draw, n) {
  const r = [0, 0, 0, 0];
  let ranked = 0, denDraws = 0, denScore = 0;
  for (let i = 0; i < n; i++) {
    let q;
    try { q = draw(); } catch (e) { break; }
    const rk = valueRank(q);
    if (rk) { ranked++; r[rk - 1]++; }
    const dp = smallestDenPolicy(q);
    if (dp !== null) { denDraws++; denScore += dp; }
  }
  return { rate: r.map(x => x / (ranked || 1)), ranked, den: denDraws ? denScore / denDraws : 0, denDraws };
}
const rankRows = [];
for (const g of GENS) {
  if (!RANK_TOPICS.has(g.topic)) continue;
  const key = g.topic + '.' + g.name;
  const r = [0, 0, 0, 0];
  let ranked = 0, denDraws = 0, denScore = 0;
  for (let i = 0; i < RANK_DRAWS; i++) {
    let q;
    try { q = g.fn(); } catch (e) { break; }
    const rk = valueRank(q);
    if (rk) { ranked++; r[rk - 1]++; }
    const dp = smallestDenPolicy(q);
    if (dp !== null) { denDraws++; denScore += dp; }
  }
  if (ranked < RANK_DRAWS / 2) continue;      /* not a numeric / fraction MC bank */
  const rate = r.map(x => x / ranked);
  const den = denDraws ? denScore / denDraws : 0;
  let err = null;
  if (!RANK_EXEMPT.has(key)) err = rankVerdict(rate, ranked, den, denDraws);
  rankRows.push({ name: key, skill: g.skill, ranked, rate, den, exempt: RANK_EXEMPT.has(key), err });
  if (err) failures++;
}

/* ---------- RULE 9: THE TOKEN RULER ------------------------------------------
   SWEEP FRACTIONS REFUTATION, FOURTH PASS 2026-09-16, THE KILL.

   NOTHING IN THIS HARNESS HAS EVER READ THE WHOLE ROW. RULE 1 reads option FORM,
   RULE 5 the SENTENCE FRAME, RULE 6 the LENGTH, RULE 7 the MAGNITUDE, and RULE 8 -
   the one written for exactly this class - reads only the words that appear in the
   STEM. gEqualParts has now been killed on the same axis three passes running, and
   the third time the gate written for it measured the bank at 0.0% and passed it:
   the stem says "cuts", the key said "counts", the distractor said "count", and the
   fix missed by one letter. Three more words - "and", "these", "that" - were unique
   to the key on 100% of draws for a reason no measurement had ever looked for: the
   key was the only COMPOUND sentence on the row.

   THE RULER. For every prose bank in the topic, draw 2,000 items; strip the markup,
   lowercase, cut each option into tokens (runs of letters and digits) and every
   adjacent PAIR of tokens. Per draw, tally (a) every feature in the KEY and in none
   of the three distractors, and (b) every feature in all THREE distractors and not
   in the key. A bank fails when one feature clears 60% of its draws either way. (a)
   is a child picking the key out by a word; (b) is a child crossing three options
   off with one. Function words are IN - "and", "these" and "that" are three of this
   pass's four kills - and so are the numerals.

   RAW AND STEMMED, BOTH. Light stemming (a trailing s / es / ed / ing) is what
   makes "counts" and "count" the same word, which is the right reading of the
   rewrite requirement - and it is also exactly what would have HIDDEN the v4
   defect, because the two forms collapse. So the ruler runs twice over each row and
   a feature unique to the key in EITHER normalisation fails the bank. The negative
   control below is the v4 gEqualParts option set and goes red on the raw "counts".

   60% is clear of the honest structural halves this topic has: gCompareError's two
   flavours put a word in the key and nowhere else on about half its draws, which is
   its own two-way design showing through rather than a shortcut past it. Those are
   reported in the table and not failed. --- */
const TOK_TOPICS = new Set(['fractions']);
const TOK_N = 2000, TOK_CAP = 0.60;
const tokWords = (s, stemIt) => (strip(s).toLowerCase().match(/[a-z0-9]+/g) || [])
  .map(w => stemIt ? w.replace(/(ies|es|ed|ing|s)$/, x => (x === 'ies' ? 'y' : '')) : w);
function tokFeats(s, stemIt) {
  const t = tokWords(s, stemIt);
  const out = new Set(t);
  for (let i = 0; i + 1 < t.length; i++) out.add(t[i] + ' ' + t[i + 1]);
  return out;
}
const bump = (m2, k2) => m2.set(k2, (m2.get(k2) || 0) + 1);
/* RULE 9's COMPLEMENT CLAUSE (FIFTH PASS 2026-09-16, THE KILL). RULE 9 as written
   asks "is there a word unique TO the key?" and the v5 gEqualParts rewrite made the
   answer no BY CONSTRUCTION - every token the key printed was printed by some
   distractor. That fix is the tell, because no DISTRACTOR has the property: each
   keeps a word of its own, so "pick the option with no word of its own" answered
   the bank on 100.00% of 40,000 draws while RULE 9 measured it at 0.00% and passed
   it. The rule and the defect are the same fact read from opposite ends.

   So the ruler runs the complement too: the draws on which the KEY is the UNIQUE
   option every one of whose words is printed somewhere else on the row. Same 60%
   ceiling, same two normalisations. It fails the v5 option set at 100% and passes
   the v4 one at 0%, so it is a new gate and not a restatement of the old one. */
function keyHasNoPrivateWord(opts, correct) {
  for (const stemIt of [false, true]) {
    const W = opts.map(o => new Set(tokWords(o, stemIt)));
    const priv = i => [...W[i]].some(t => W.every((w, j) => j === i || !w.has(t)));
    const bare = [0, 1, 2, 3].filter(i => !priv(i));
    if (bare.length === 1 && bare[0] === correct) return true;
  }
  return false;
}
function tokBank(draw, n) {
  const keyOnly = new Map(), wrongOnly = new Map();
  let seen = 0, sample = null, noPrivate = 0;
  for (let i = 0; i < n; i++) {
    let q;
    try { q = draw(); } catch (e) { break; }
    const opts = q.choices || [];
    if (opts.length !== 4 || !(q.correct >= 0) || !allProse(opts)) continue;
    const k = q.correct, w = [0, 1, 2, 3].filter(j => j !== k);
    for (const stemIt of [false, true]) {
      const F = opts.map(o => tokFeats(o, stemIt)), tag = stemIt ? '~' : '';
      for (const f of F[k]) if (w.every(j => !F[j].has(f))) bump(keyOnly, tag + f);
      for (const f of F[w[0]]) if (F[w[1]].has(f) && F[w[2]].has(f) && !F[k].has(f)) bump(wrongOnly, tag + f);
    }
    if (keyHasNoPrivateWord(opts, k)) noPrivate++;
    if (!sample) sample = opts.map(strip);
    seen++;
  }
  return { n: seen, keyOnly, wrongOnly, sample, noPrivate };
}
const tokTop = m2 => [...m2.entries()].reduce((a, e) => e[1] > a[1] ? e : a, ['-', 0]);
function tokVerdict(row) {
  if (!row.n) return null;
  const k = tokTop(row.keyOnly), w = tokTop(row.wrongOnly);
  const shown = f => f.charAt(0) === '~' ? `"${f.slice(1)}" (stemmed)` : `"${f}"`;
  const opts = row.sample ? `  (${row.sample.join(' | ')})` : '';
  if (k[1] / row.n >= TOK_CAP)
    return `token ruler: ${shown(k[0])} is in the KEY and in no distractor on ${k[1]} of ${row.n} draws (${(100 * k[1] / row.n).toFixed(1)}%), at or over the ${Math.round(100 * TOK_CAP)}% ceiling - a child picks the key out by that word alone${opts}`;
  if (w[1] / row.n >= TOK_CAP)
    return `token ruler: ${shown(w[0])} is in ALL THREE distractors and not in the key on ${w[1]} of ${row.n} draws (${(100 * w[1] / row.n).toFixed(1)}%), at or over the ${Math.round(100 * TOK_CAP)}% ceiling - a child crosses three options off with that word alone${opts}`;
  if ((row.noPrivate || 0) / row.n >= TOK_CAP)
    return `token ruler, THE COMPLEMENT: the key is the UNIQUE option with no word of its own on ${row.noPrivate} of ${row.n} draws (${(100 * row.noPrivate / row.n).toFixed(1)}%), at or over the ${Math.round(100 * TOK_CAP)}% ceiling - writing every key word into some distractor makes the key the only option with nothing unique${opts}`;
  return null;
}
const tokRows = [];
for (const g of GENS) {
  if (!TOK_TOPICS.has(g.topic)) continue;
  const row = tokBank(g.fn, TOK_N);
  if (row.n < TOK_N / 2) continue;               /* not a prose bank */
  row.name = g.topic + '.' + g.name;
  row.err = tokVerdict(row);
  tokRows.push(row);
  if (row.err) failures++;
}

/* ---------- RULE 10: THE PICTURE RULER ---------------------------------------
   SWEEP FRACTIONS REFUTATION, FOURTH PASS 2026-09-16, WOUND 1. gCompareBar renders
   a bar on 100% of draws and was read on 0.00% of them, twice running, under two
   different designs and two different declared fixes. Nothing here has ever asked
   the only question that matters about a picture: DOES THE ANSWER MOVE WHEN THE
   PICTURE MOVES? The gate is the contrapositive, measured where a child stands -
   an item that draws a picture may not be answerable from its option row alone.

   For every bank in the topic that draws a figure, 2,000 draws are sorted by STEM
   SHAPE (the stem with its numerals removed, so "greater" and "less" are different
   attacks, as they must be - v4's killer policy read the feature word out of the
   stem), and inside each shape every option-row-only policy is scored: each of the
   four value ranks, the smallest and largest top and bottom number, and - the v4
   killer - the larger and the smaller member of the one pair that shares a top or a
   bottom number with itself. Ties score 1/k, an inapplicable policy scores a guess.
   The bank's number is the weighted average of the BEST policy in each stem shape,
   which is what a child who has noticed the pattern actually gets.

   TWO LINES, AND THE REASON FOR BOTH. The CEILING is 60%, which is the PM's own
   termination bar ("answerable with NO mathematics on >= 60% of draws") and RULE 9's
   number. It is not 40%, and the first run of this rule is why: the three banks that
   read a fraction OFF a picture sit at 39.8% (gPicIdentify), 43.3% (gEquivFromBar)
   and 47.5% (gPicUnshaded) against 25% for chance, and none of them is a shortcut
   past the mathematics. It is the format's own shape showing through - the key is
   written over the bar's part count and the named miscounts are that count plus or
   minus one, so three of the four options share a bottom number with each other by
   construction and "pick one of those" is worth a third of a row before any child
   has thought about anything. A rule set under that line would fail four honest
   banks to catch one dishonest one.

   The WATCH LINE is 40%, printed beside every bank and carried in the lane note as
   a declared residual rather than being quietly dropped: the mirror of RULE 7's
   "pick the smallest bottom number" - pick the LARGEST - is what puts gEquivFromBar
   and gPicUnshaded where they are, and nothing has ever gated that direction. It is
   named here so the fifth pass inherits a number rather than a discovery.

   gCompareBar, the bank this rule was written for, measures 27.4% against 100.00%
   for the v4 row - which is the negative control, rebuilt from its own construction
   and scoring 100.0%. */
const PIC_N = 2000, PIC_CAP = 0.60, PIC_WATCH = 0.40;
function optFracPairs(q) {
  const out = [];
  for (const o of (q.choices || [])) {
    const fs = [...String(o).matchAll(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/g)];
    if (fs.length !== 1 || /[A-Za-z]/.test(strip(o))) return null;
    out.push([Number(fs[0][1]), Number(fs[0][2])]);
  }
  return out.length === 4 ? out : null;
}
/* Every policy a child can run on the option row with the picture covered up. */
function picPolicies(fo, correct) {
  const val = p => p[0] / p[1];
  const score = sel => {                       /* sel: array of chosen indices */
    if (!sel.length) return 0.25;              /* the policy does not apply: a guess */
    return sel.indexOf(correct) >= 0 ? 1 / sel.length : 0;
  };
  const byExtreme = (f, want) => {
    const xs = fo.map(f), m2 = want === 'min' ? Math.min(...xs) : Math.max(...xs);
    return score(xs.map((x, i) => x === m2 ? i : -1).filter(i => i >= 0));
  };
  const out = {};
  const sorted = fo.map((p, i) => [val(p), i]).sort((a, b) => a[0] - b[0]);
  for (let r = 0; r < 4; r++) {
    const v = sorted[r][0];
    out['rank ' + (r + 1)] = score(sorted.filter(s => s[0] === v).map(s => s[1]));
  }
  out['smallest bottom'] = byExtreme(p => p[1], 'min');
  out['largest bottom'] = byExtreme(p => p[1], 'max');
  out['smallest top'] = byExtreme(p => p[0], 'min');
  out['largest top'] = byExtreme(p => p[0], 'max');
  /* the pair rule: the one pair sharing a bottom (or a top) number with itself */
  for (const [label, idx] of [['bottom', 1], ['top', 0]]) {
    const groups = new Map();
    fo.forEach((p, i) => { const k2 = p[idx]; groups.set(k2, (groups.get(k2) || []).concat(i)); });
    const pairs = [...groups.values()].filter(v => v.length === 2);
    const pr = pairs.length === 1 ? pairs[0] : null;
    for (const side of ['bigger', 'smaller']) {
      let sel = [];
      if (pr) {
        const a = pr[0], b = pr[1], av = val(fo[a]), bv = val(fo[b]);
        sel = av === bv ? [a, b] : [side === 'bigger' ? (av > bv ? a : b) : (av < bv ? a : b)];
      }
      out[`${side} of the ${label}-sharing pair`] = score(sel);
    }
  }
  return out;
}
function picBank(draw, n) {
  const shapes = new Map();                    /* stem shape -> { n, scores } */
  let seen = 0, drew = 0, sample = null;
  for (let i = 0; i < n; i++) {
    let q;
    try { q = draw(); } catch (e) { break; }
    if (!q || !q.figure) continue;
    drew++;
    const fo = optFracPairs(q);
    if (!fo || !(q.correct >= 0)) continue;
    const shape = strip(q.q).replace(/\d+/g, '#');
    if (!shapes.has(shape)) shapes.set(shape, { n: 0, s: new Map() });
    const row = shapes.get(shape);
    row.n++;
    const pol = picPolicies(fo, q.correct);
    for (const [k2, v] of Object.entries(pol)) row.s.set(k2, (row.s.get(k2) || 0) + v);
    if (!sample) sample = (q.choices || []).map(strip);
    seen++;
  }
  if (!seen) return { n: 0, drew };
  let total = 0, best = '-', bestRate = 0;
  for (const row of shapes.values()) {
    let mx = 0, mxName = '-';
    for (const [k2, v] of row.s.entries()) if (v > mx) { mx = v; mxName = k2; }
    total += mx;
    if (mx / row.n > bestRate) { bestRate = mx / row.n; best = mxName; }
  }
  return { n: seen, drew, rate: total / seen, best, bestRate, shapes: shapes.size, sample };
}
function picVerdict(row) {
  if (!row.n) return null;
  return row.rate >= PIC_CAP
    ? `picture ruler: the best option-row-only policy - "${row.best}", read off ${row.shapes} stem shape(s) - answers the item on ${(100 * row.rate).toFixed(1)}% of ${row.n} draws, at or over the ${Math.round(100 * PIC_CAP)}% ceiling, so the picture is decoration (${(row.sample || []).join(' | ')})`
    : null;
}
const picRows = [];
for (const g of GENS) {
  if (!TOK_TOPICS.has(g.topic)) continue;
  const row = picBank(g.fn, PIC_N);
  if (!row.n || row.n < PIC_N / 2) continue;    /* not a figure bank with a fraction row */
  row.name = g.topic + '.' + g.name;
  row.err = picVerdict(row);
  picRows.push(row);
  if (row.err) failures++;
}

/* ---------- RULE 11: THE ROW-ONLY RULE ---------------------------------------
   SWEEP FRACTIONS REFUTATION, FIFTH PASS 2026-09-16 - the PM's wave-1 deliverable,
   and the rule two of this file's three kills would have been caught by.

   RULE 10 asks whether a fixed HEURISTIC over the option row answers a picture
   item. That is one of the two ways a row can give itself away, and the fifth pass
   killed on the other: gCompareError's row was three fixed belief sentences plus a
   filler drawn from a bank PAIRED to the belief, so the odd sentence out named the
   answer - 54 option rows, 54 (row, key) pairs, 54/54 deterministic, and the two
   printed fractions changed the answer on 0.00% of draws. No heuristic is
   involved. The child does not reason about the row at all; they RECOGNISE it.

   THE RULER, and both halves are needed. Draw 2,000 items as a child's exposure,
   and 2,000 more as the test. For each test draw, look its option ROW up in what
   the first 2,000 taught - the row stripped of markup, sorted, stem discarded -
   and answer with the key that row most often carries, guessing at chance for a
   row never seen. That is what memory buys, measured where a child stands.

   A HIGH RATE IS ONLY A DEFECT ON A ROW SPACE A CHILD CAN MEET TWICE. Every bank
   that prints four fractions scores 85-99% on that lookup, because a row of four
   particular fractions belongs to one question - which is not a shortcut, it is
   what it means for an option row to be drawn from the mathematics. gSubSame has
   616 rows and is served 1.3 times a session: a child meets the same row again
   about once a year. gEqualParts had EIGHTEEN, served 3.5 times a session to a
   struggling child, and had met all of them inside a week. So the gate is a
   conjunction: a bank fails when its row space is MEMORISABLE (under 60 distinct
   rows in 2,000 draws) AND the row names the key at or over 40%.

   The 60 is calibrated on this file and printed in full on every run so that drift
   is visible: below the line sit gAddError (6 rows, 33.3% - six rows with three
   keys each, so the row settles nothing), gCompareWords (15, 25.0%) and the
   rebuilt gCompareError (6, 25.0% - the same four sentences every draw, which is
   chance exactly). The two negative controls below are the v5 rows that were
   killed on it: gEqualParts at 18 / 100% and gCompareError at 54 / 100%. --- */
/* ---------- RULE 11's SHAPE CLAUSE -------------------------------------------
   SWEEP FRACTIONS REFUTATION, SIXTH PASS 2026-09-16, WOUND 1 - the correction to
   the rule written one pass earlier, and the largest un-gated class in the topic.

   RULE 11 as first written exempts a bank with 60 or more distinct ROWS, on the
   reasoning that a child meets the same row about once a year. A CHILD DOES NOT
   MEMORISE ROWS. They memorise a row SHAPE: put the four options in order of the
   bottom number they print and note which numerals repeat and where, and
   `7/8 5/9 7/9 5/10` and `3/5 3/6 4/6 4/7` are the same picture. Masked that way,
   gAddSame - 677 distinct rows, comfortably exempt - had EIGHTEEN shapes, and
   every one of the eighteen named the key's SLOT on 100.0% of held-out draws, at
   5.18 served items a session to a struggling child. RULE 7 reports its value
   ranks as a flat 25/25/25/25; that flatness is an AVERAGE over shapes each of
   which pins the rank at 100%.

   THE RULER. The same learn-2,000 / test-2,000 lookup RULE 11 already runs, with
   two substitutions: the signature is the masked SHAPE rather than the row, and
   the answer looked up is the key's SLOT in the ordered row rather than its text.
   Numerals are masked by order of first appearance, so nothing of the arithmetic
   survives - only the pattern of repeats a child can see without reading a value.

   WHERE THE LINE SITS, and this is the honest part. Twelve banks in this topic
   score 73-98% on that lookup over 4 to 123 shapes. Failing all twelve would fail
   the topic, and the refutation that found the class called it a WOUND and wave-2
   work for exactly that reason: putting four bottom numbers in order is
   whole-number work standing in for fraction work, not NO mathematics. So the
   clause gates the one thing that is not a heuristic at all - A SIGHT RULE THAT IS
   NEVER WRONG. A bank fails when its shape space is memorisable (under 60 shapes)
   and the shape names the key's slot on 100% of held-out draws: at that point the
   child is not guessing better, they are reading the answer off the picture. Every
   bank at or over the 40% WATCH LINE is printed with its numbers on every run and
   carried in the lane note as the declared row-shape class. The negative control
   below is the v6 gAddSame row, rebuilt from its own construction, at 18 / 100%. */
const ROW_N = 2000, ROW_CAP = 0.40, ROW_MEMO = 60;
const SHAPE_CAP = 1.0, SHAPE_WATCH = 0.40, SHAPE_MEMO = 60;
const rowKeyOf = q => (q.choices || []).map(strip).slice().sort().join(' ~ ');
/* a rendered fraction is two numerals with no separator once the markup is gone,
   so it is opened out BEFORE stripping or the two collapse into one number */
const openFrac = s => String(s).replace(/<span class="n">(-?[\d?]+)<\/span><span class="d">(-?[\d?]+)<\/span>/g, ' $1 / $2 ');
const numsOfHtml = s => (strip(openFrac(s)).match(/\d+/g) || []).map(Number);
/* the row ordered by the bottom number each option prints, then masked: every
   numeral becomes the order in which it first appears. */
function orderedRow(q) {
  const opts = (q.choices || []);
  const withN = opts.map((o, i) => ({ i, n: numsOfHtml(o) }));
  if (withN.some(w => !w.n.length)) return null;          /* a prose row: no shape */
  withN.sort((a, b) => (a.n[a.n.length - 1] - b.n[b.n.length - 1]) || (a.n[0] - b.n[0]));
  return withN;
}
function shapeKeyOf(q) {
  const r = orderedRow(q);
  if (!r) return (q.choices || []).map(strip).slice().sort().join(' ~ ');
  const seen = new Map();
  const mask = v => { if (!seen.has(v)) seen.set(v, seen.size); return seen.get(v); };
  return r.map(w => w.n.map(mask).join('/')).join(' ');
}
function shapeSlotOf(q) {
  const r = orderedRow(q);
  if (!r) return strip(q.choices[q.correct]);
  return String(r.findIndex(w => w.i === q.correct));
}
function rowBank(draw, n) {
  const seen = new Map(), shapes = new Map();
  let bad = 0;
  const learn = () => {
    for (let i = 0; i < n; i++) {
      let q; try { q = draw(); } catch (e) { bad++; break; }
      if (!q || !(q.choices || []).length || !(q.correct >= 0)) { bad++; continue; }
      const r = rowKeyOf(q), a = strip(q.choices[q.correct]);
      if (!seen.has(r)) seen.set(r, new Map());
      const m = seen.get(r);
      m.set(a, (m.get(a) || 0) + 1);
      const sh = shapeKeyOf(q), sl = shapeSlotOf(q);
      if (!shapes.has(sh)) shapes.set(sh, new Map());
      const m2 = shapes.get(sh);
      m2.set(sl, (m2.get(sl) || 0) + 1);
    }
  };
  learn();
  const modalOf = (m, a) => {
    let best = -1;
    for (const [, c] of m) if (c > best) best = c;
    const modal = [...m].filter(([, c]) => c === best).map(([v]) => v);
    return modal.indexOf(a) >= 0 ? 1 / modal.length : 0;
  };
  let score = 0, sScore = 0, tested = 0;
  for (let i = 0; i < n; i++) {
    let q; try { q = draw(); } catch (e) { break; }
    if (!q || !(q.choices || []).length || !(q.correct >= 0)) continue;
    tested++;
    const m = seen.get(rowKeyOf(q));
    score += m ? modalOf(m, strip(q.choices[q.correct])) : 0.25;
    const m2 = shapes.get(shapeKeyOf(q));
    sScore += m2 ? modalOf(m2, shapeSlotOf(q)) : 0.25;
  }
  return { rows: seen.size, n: tested, rate: tested ? score / tested : 0,
           shapes: shapes.size, sRate: tested ? sScore / tested : 0 };
}
function rowVerdict(row) {
  if (!row.n) return null;
  if (row.rows < ROW_MEMO && row.rate >= ROW_CAP)
    return `row-only tell: the option row alone names the key on ${(100 * row.rate).toFixed(1)}% of draws over a space of only ${row.rows} distinct rows - a child who has met the bank recognises the row and never reads the stem`;
  if (row.shapes < SHAPE_MEMO && row.sRate >= SHAPE_CAP)
    return `row-SHAPE tell: the masked shape of the option row names the key's SLOT on ${(100 * row.sRate).toFixed(1)}% of held-out draws over only ${row.shapes} shapes - a sight rule that is never wrong is not a heuristic, it is the answer printed in a pattern`;
  return null;
}
const rowRows = [];
for (const g of GENS) {
  if (!TOK_TOPICS.has(g.topic)) continue;
  const row = rowBank(g.fn, ROW_N);
  if (!row.n) continue;
  row.name = g.topic + '.' + g.name;
  row.err = rowVerdict(row);
  rowRows.push(row);
  if (row.err) failures++;
}

/* ---------- RULE 12: THE STEM-ONLY RULE --------------------------------------
   SWEEP FRACTIONS REFUTATION, SIXTH PASS 2026-09-16, KILL 1 - the PM's wave-1
   deliverable, and RULE 11's mirror.

   Nothing in this file had ever asked whether THE STEM ALONE NAMES THE KEY.
   RULE 8 asks whether the key echoes a WORD of the stem; RULE 9 reads the row's
   words; RULE 10 reads the row against a picture; RULE 11 reads the row on its
   own. The sixth pass killed on the one surface none of them covers: v6's
   gEqualParts printed exactly ONE numeral in its stem, and under its declared
   `k x n <= 10` cap a FOUR-LINE TABLE over that numeral (2->8, 3->6, 4->8, 5->10)
   answered the declared pool-1 concept anchor on 65.52% / 66.42% of 20,000 draws
   on each of two seeds. The bar was never counted, and on two of the seven shapes
   the picture was redundant by construction.

   TWO CLAUSES, and the second one is the gate.

   (a) THE RECALL CLAUSE, measured on every bank and printed in full. Learn a
   table over the stem's NUMERAL SIGNATURE - the stem's numerals in order, the row
   and the figure discarded - keep only the SIX commonest signatures, which is what
   a child carries, and test on held-out draws: where the table names a value, take
   it off the row; where it does not, guess. Six banks in this topic sit over 60%
   on that clause, and every one of them is the SMALL-STEM-SPACE residual this file
   has carried since the first refutation: the stem determines the key because the
   stem IS the whole question, and the defect is that there are only 7 to 36
   distinct stems to meet. Gating it would fail six honest banks and close nothing,
   so it is DECLARED with its numbers rather than hidden - the same treatment
   RULE 10's watch line gets - and handed on as the stem-space class.

   (b) THE FIGURE CLAUSE, gated. A bank that RENDERS A PICTURE may not be
   answerable from the numerals of its stem alone on 60% or more of draws. That is
   the precise thing v6's gEqualParts did: it claimed the bar was load-bearing and
   the stem's one numeral answered it anyway. RULE 10 asks the same question of the
   option row; this asks it of the words. The two together say a picture item must
   need its picture. The best of the six-row table and a library of one-expression
   arithmetic over the stem's numerals (each numeral, each one more and one less,
   and every pairwise sum, difference and product, alone or as a fraction) is
   scored, because a recalled table and a memorised formula are the same shortcut.

   Measured on this file: the five figure banks sit at 25.5, 26.0, 25.6, 39.4 and
   43.8% on clause (b) against 25% for a guess. The negative control below is the
   v6 gEqualParts stem, rebuilt from its own construction, and it goes red. --- */
const STEM_N = 2000, STEM_CAP = 0.60, STEM_ROWS = 6;
const stemSigOf = q => numsOfHtml(q.q).join(',');
const optText = o => {
  const m = String(o).match(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/);
  return m ? m[1] + '/' + m[2] : strip(o);
};
function stemBank(draw, n) {
  const seen = new Map();
  let drew = 0, figs = 0;
  for (let i = 0; i < n; i++) {
    let q; try { q = draw(); } catch (e) { break; }
    if (!q || !(q.correct >= 0) || !(q.choices || []).length) continue;
    drew++;
    if (q.figure) figs++;
    const s = stemSigOf(q), a = optText(q.choices[q.correct]);
    if (!seen.has(s)) seen.set(s, new Map());
    const m = seen.get(s); m.set(a, (m.get(a) || 0) + 1);
  }
  if (!drew) return { n: 0 };
  const tot = s => { let t = 0; for (const [, c] of seen.get(s)) t += c; return t; };
  const table = new Map();
  for (const s of [...seen.keys()].sort((a, b) => tot(b) - tot(a)).slice(0, STEM_ROWS)) {
    const m = seen.get(s);
    let best = -1; for (const [, c] of m) if (c > best) best = c;
    table.set(s, [...m].filter(([, c]) => c === best).map(([v]) => v));
  }
  /* the arithmetic library, learnt over the same draws: which single expression
     over the stem's numerals names the key most often */
  const hit = new Map();
  const exprs = q => {
    const ns = numsOfHtml(q.q), lab = [];
    ns.forEach((v, i) => lab.push(['n' + i, v], ['n' + i + '+1', v + 1], ['n' + i + '-1', v - 1]));
    for (let x = 0; x < ns.length; x++) for (let y = 0; y < ns.length; y++) if (x !== y)
      lab.push(['n' + x + '+n' + y, ns[x] + ns[y]], ['n' + x + '-n' + y, ns[x] - ns[y]],
               ['n' + x + '*n' + y, ns[x] * ns[y]]);
    return lab;
  };
  let score = 0, tested = 0;
  for (let i = 0; i < n; i++) {
    let q; try { q = draw(); } catch (e) { break; }
    if (!q || !(q.correct >= 0) || !(q.choices || []).length) continue;
    tested++;
    const a = optText(q.choices[q.correct]);
    const t = table.get(stemSigOf(q));
    if (!t) score += 0.25;
    else {
      const named = t[0];
      const sel = q.choices.map(optText).map((o, j) => o === named ? j : -1).filter(j => j >= 0);
      score += sel.length ? (sel.indexOf(q.correct) >= 0 ? 1 / sel.length : 0) : 0.25;
    }
    const lab = exprs(q), names = new Set();
    for (const [nm, v] of lab) if (String(v) === a) names.add(nm);
    for (const [n1, v1] of lab) for (const [n2, v2] of lab)
      if (v1 > 0 && v2 > 0 && v1 + '/' + v2 === a) names.add(n1 + '/' + n2);
    for (const nm of names) hit.set(nm, (hit.get(nm) || 0) + 1);
  }
  let best = ['-', 0];
  for (const e of hit) if (e[1] > best[1]) best = e;
  return { n: tested, sigs: seen.size, rate: tested ? score / tested : 0,
           arith: tested ? best[1] / tested : 0, expr: best[0], fig: figs > drew / 2 };
}
function stemVerdict(row) {
  if (!row.n) return null;
  const worst = Math.max(row.rate, row.arith);
  if (row.fig && worst >= STEM_CAP)
    return `stem-only tell: this bank draws a PICTURE and is answered from the numerals of its stem alone - ${row.arith > row.rate ? `the expression "${row.expr}"` : `a ${STEM_ROWS}-row table over ${row.sigs} stem signature(s)`} names the key on ${(100 * worst).toFixed(1)}% of draws with the row and the figure discarded, at or over the ${Math.round(100 * STEM_CAP)}% ceiling, so the picture is not load-bearing in the one direction RULE 10 cannot see`;
  return null;
}
const stemRows = [];
for (const g of GENS) {
  if (!TOK_TOPICS.has(g.topic)) continue;
  const row = stemBank(g.fn, STEM_N);
  if (!row.n) continue;
  row.name = g.topic + '.' + g.name;
  row.err = stemVerdict(row);
  stemRows.push(row);
  if (row.err) failures++;
}

/* ---------- RULE 13: THE GLYPH RULE ------------------------------------------
   SWEEP FRACTIONS REFUTATION, SIXTH PASS 2026-09-16, KILL 2 - the second wave-1
   deliverable, and the one rule in this file that reads a numeral as a SHAPE ON
   THE PAGE rather than as a value.

   v6's gCompareError was rebuilt so that the child's mistake is named by the two
   numbers it prints "only in the light of the two printed fractions". Row-only
   fell to chance and the printed fractions became load-bearing on 88% - all true,
   and the item is still answered by a four-clause rule with NO ARITHMETIC IN ANY
   CLAUSE on 91.84% / 91.19% of 20,000 draws on each of two seeds: are the two
   worked-out numbers the same NUMERALS as the two top numbers? as the two bottom
   numbers? does either have TWO DIGITS? The belief's arithmetic output was
   PRINTED, and for two of the four beliefs that output is a numeral already on the
   screen - so copying a numeral, which is not a fraction operation, names the
   misconception.

   THE RULER, and every ingredient is a glyph: numeral IDENTITY, numeral
   MEMBERSHIP and DIGIT COUNT, across the rendered stem and the rendered row.
     - the stem's signature is the EQUALITY PARTITION of its numerals in order
       (which position repeats which) plus the digit count of each - no value, no
       ordering, no arithmetic;
     - each option's tag is, for a numeric option, whether each of its numerals
       appears in the stem and how many digits it has; for an option that prints no
       numeral at all, the words it does NOT share with the stem, which is a fixed
       sentence RECOGNISED rather than read (that is what the child does with a
       four-sentence bank, and it is the only way this ruler can reach a prose row).
   Learn the modal key TAG per stem signature over 2,000 draws, test on 2,000 more,
   and score the draws on which the rule SETTLES - names exactly one option, and
   that option is the key. Ties do not settle and are not counted: leaving a child
   with two options is not answering the item.

   60% is the PM's own termination bar and RULE 9's, 10's and 12's number. It fails
   the v6 gCompareError row at 91.5% (the negative control below, rebuilt from its
   own construction) and passes every live bank in this topic, the widest of which
   is 38%. It also caught the rebuilt gAddError at 76.8% on its first run - the
   only belief whose claim was not written over the stem's own bottom number was
   separated from the other two by one glyph test - which is fixed at the site and
   measured at 50.5%. --- */
const GLY_N = 2000, GLY_CAP = 0.60;
function glyphSigOf(q) {
  const sn = numsOfHtml(q.q);
  /* SEVENTH PASS 2026-09-16. This returned null for a stem with no numerals in it,
     and the caller SKIPS a null - so a bank whose stem prints no numeral at all
     dropped out of RULE 13 entirely rather than being measured at chance. v8's
     gPicTakeAway is exactly that bank, and a ruler that goes quiet on the newest
     format is how six of the seven kills happened. A numeral-free stem is now one
     signature: every option's membership tag is "out", so the rule can only settle
     on digit count, and it is measured like everything else. */
  if (!sn.length) return '-|-';
  const first = new Map();
  const part = sn.map(v => { if (!first.has(v)) first.set(v, first.size); return first.get(v); }).join('.');
  return part + '|' + sn.map(v => String(v).length).join('.');
}
function glyphTagOf(q, i) {
  const on = numsOfHtml(q.choices[i]);
  const sn = new Set(numsOfHtml(q.q));
  if (on.length) return 'N:' + on.map(v => (sn.has(v) ? 'in' : 'out') + String(v).length).join('.') + ':' + on.length;
  const st = new Set(strip(q.q).toLowerCase().match(/[a-z]+/g) || []);
  return 'T:' + (strip(q.choices[i]).toLowerCase().match(/[a-z]+/g) || []).filter(w => !st.has(w)).join(' ');
}
function glyphBank(draw, n) {
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    let q; try { q = draw(); } catch (e) { break; }
    if (!q || (q.choices || []).length !== 4 || !(q.correct >= 0)) continue;
    const s = glyphSigOf(q); if (s === null) continue;
    if (!seen.has(s)) seen.set(s, new Map());
    const m = seen.get(s), t = glyphTagOf(q, q.correct);
    m.set(t, (m.get(t) || 0) + 1);
  }
  let settle = 0, tested = 0, sample = null;
  for (let i = 0; i < n; i++) {
    let q; try { q = draw(); } catch (e) { break; }
    if (!q || (q.choices || []).length !== 4 || !(q.correct >= 0)) continue;
    const s = glyphSigOf(q); if (s === null) continue;
    tested++;
    if (!sample) sample = q.choices.map(strip);
    const m = seen.get(s);
    if (!m) continue;
    let best = -1; for (const [, c] of m) if (c > best) best = c;
    const modal = new Set([...m].filter(([, c]) => c === best).map(([v]) => v));
    const sel = [0, 1, 2, 3].filter(j => modal.has(glyphTagOf(q, j)));
    if (sel.length === 1 && sel[0] === q.correct) settle++;
  }
  return { n: tested, sigs: seen.size, rate: tested ? settle / tested : 0, sample };
}
function glyphVerdict(row) {
  if (!row.n) return null;
  return row.rate >= GLY_CAP
    ? `glyph tell: a rule built only from numeral identity, numeral membership and digit count - ${row.sigs} stem signature(s), no arithmetic anywhere in it - SETTLES the item on exactly one option, and that option is the key, on ${(100 * row.rate).toFixed(1)}% of draws, at or over the ${Math.round(100 * GLY_CAP)}% ceiling (${(row.sample || []).join(' | ')})`
    : null;
}
const glyRows = [];
for (const g of GENS) {
  if (!TOK_TOPICS.has(g.topic)) continue;
  const row = glyphBank(g.fn, GLY_N);
  if (!row.n || row.n < GLY_N / 2) continue;
  row.name = g.topic + '.' + g.name;
  row.err = glyphVerdict(row);
  glyRows.push(row);
  if (row.err) failures++;
}

/* ---------- THE PROSE AGREEMENT CLAUSE ---------------------------------------
   SWEEP FRACTIONS REFUTATION, SIXTH PASS 2026-09-16, W3. NOTHING IN THIS HARNESS
   HAS EVER READ PROSE FOR GRAMMAR. gEquivFromBar - the pool-1 equivalence anchor,
   served 1.30 per session at 80% accuracy and 5.09 at 45% - hard-coded
   " of them are blue.", so it printed "1 of them ARE blue" on 22.81% / 22.68% of
   draws, while gPicUnshaded twenty lines away handled the singular correctly. A
   generated sentence is read by a child; the harness now reads it too.

   The clause is deliberately the smallest one that is NEVER WRONG, which means it
   only reads the two constructions these banks actually generate: "<n> of them
   <verb>" and "<n> <pieces|parts> <verb>". It does NOT read a bare "<n> ... is",
   because "4 out of 9 equal parts is 4/9" and "2/4 is the same amount as 6/12" are
   both correct English with a plural numeral in front of a singular verb - the
   first run of this clause failed seven honest banks on exactly those two
   sentences, which is the calibration and is why the pattern is narrow. --- */
const AGREE_N = 500;
const AGREE_BAD = [
  [/\b1 of (?:them|these|those|the \w+|the \w+ \w+) (?:are|were|have)\b/i, '"1 of them ARE"'],
  [/\b(?!1\b)\d+ of (?:them|these|those|the \w+|the \w+ \w+) (?:is|was|has)\b/i, '"<more than one> of them IS"'],
  [/\b1 (?:pieces|parts|slices) (?:are|were|have)\b/i, '"1 pieces ARE"'],
  [/\b(?!1\b)\d+ (?:piece|part|slice) (?:is|was|has)\b/i, '"<more than one> piece IS"']
];
const agreeRows = [];
for (const g of GENS) {
  if (!TOK_TOPICS.has(g.topic)) continue;
  let bad = 0, n = 0, sample = null;
  for (let i = 0; i < AGREE_N; i++) {
    let q; try { q = g.fn(); } catch (e) { break; }
    if (!q) continue;
    n++;
    const text = strip(openFrac(q.q)) + ' ' + strip(openFrac(q.explain || '')) + ' ' +
      (q.choices || []).map(o => strip(openFrac(o))).join(' ');
    for (const [re, lab] of AGREE_BAD)
      if (re.test(text)) { bad++; if (!sample) sample = lab + ' in: ' + text.slice(0, 150); break; }
  }
  if (!n) continue;
  const row = { name: g.topic + '.' + g.name, n, bad, rate: bad / n, sample };
  row.err = bad ? `prose agreement: a number disagrees with its verb on ${bad} of ${n} draws - ${sample}` : null;
  agreeRows.push(row);
  if (row.err) failures++;
}

/* ---------- THE SIGN GATE -----------------------------------------------------
   SWEEP FRACTIONS REFUTATION, SEVENTH PASS 2026-09-16, KILL 2. js/topics/
   p3-fractions.js:2447 ended gSubRelated's teaching card with fr(a-b, D-d), and
   `b` runs to D-1 while `a` stops at d-1, so the card printed a NEGATIVE numerator
   to a P3 child on 49.97 / 50.70% of draws and a zero one on 15.19 / 14.36% -
   "subtracting the tops and the bottoms straight off would give -1/8". Negative
   numbers enter at Secondary 1. A scope leak, on the highest-salience surface in
   the app, in a bank served 0.91 items a session, INHERITED from 11b5ce5 and
   earlier and never once reported.

   WHY SIX PASSES AND FIFTEEN CONTROLS WALKED PAST IT, which is the lesson worth
   more than the fix: EVERY FRACTION REGEX IN THIS FILE WAS (\d+). A minus sign is
   not a digit, so parseFrac and allFracs returned null on the offending markup and
   RULE 4's syllabus scan, the off-row card walker and the layout gate all read
   straight through it. The ruler could not read the character the defect was
   written in. Every one of those regexes is (-?\d+) now, and THIS gate is the
   direct assertion the file never made:

   NO SURFACE OF ANY QUESTION IN THE GAME MAY RENDER A FRACTION WITH A NUMERATOR
   BELOW 1 OR A DENOMINATOR BELOW 1 - stem, extra, option row, answer text or
   teaching card. It runs over every bank in every topic, not only fractions,
   because there is no topic in this game in which a rendered negative or zero
   part of a whole is anything but a leak. A '?' is the one legal non-numeral (the
   two completion banks render it by design). Negative control: the v7
   gSubRelated card.

   EIGHTH PASS 2026-09-16, W1 - THE GATE READ ONE RENDERING AND THE GAME HAS THREE.
   The scanner was `<span class="n">...</span><span class="d">...</span>`, which is
   robust to anything WITHIN that markup - a unicode minus, a space, a letter - and
   blind to a fraction that is not written in that markup at all. THIRTY-SIX BANKS
   ACROSS NINE TOPICS write theirs as plain text, `n + '/' + d`: the whole of
   js/topics/p5-fractions.js - the game's mixed-number bank, led by gMixedAdd at
   ten per draw - plus gShareAsFraction, gDivideAsFraction, gMixedTimesWhole,
   gMixedSub, gImproperTimesImproper and p4pie.gPieFracOfSet, and not one of them
   was inside the gate. Its verdict was correct and its STATED SCOPE was not, which
   is the same defect as the kill it was written for: the ruler could not read the
   spelling. It reads the stripped text of every surface now - the rendered
   fractions opened out into it, so one pass covers both renderings - plus a UNARY
   MINUS in front of any number anywhere, which is the leak one step before a
   fraction is built out of it. --- */
/* the same opening-out openFrac does, but it reads a sign, because the whole
   point of this gate is the character the other readers cannot see. */
const openFracAny = s => String(s).replace(/<span class="n">(-?[\d?]+)<\/span><span class="d">(-?[\d?]+)<\/span>/g, ' $1/$2 ');
const SIGN_N = 500;
const SIGN_RE = /<span class="n">([^<]*)<\/span><span class="d">([^<]*)<\/span>/g;
/* a fraction written as plain text, in the stripped reading of the surface */
const SIGN_TEXT = /(-?\d+)\s*\/\s*(-?\d+)/g;
/* a minus sign fixed to a number: the app renders every subtraction as ' - ' with
   spaces on both sides, so a sign with no space after it is a unary one */
const SIGN_UNARY = /[-−]\d/;
function signScan(q) {
  const where = [['stem', q.q], ['extra', q.extra || ''], ['card', q.explain || ''],
                 ['answer', q.answerText || '']]
    .concat((q.choices || []).map((c, i) => ['option ' + (i + 1), c]));
  for (const [label, html] of where) {
    for (const m of String(html).matchAll(SIGN_RE)) {
      const n = m[1], d = m[2];
      const badN = n !== '?' && !(Number(n) >= 1), badD = d !== '?' && !(Number(d) >= 1);
      if (badN || badD)
        return `the ${label} renders ${n}/${d} - a ${badN ? 'numerator' : 'denominator'} below 1 is not a P3 fraction and not a P4 or P5 one either (${strip(openFracAny(html)).slice(0, 110)})`;
    }
    /* the same assertion over every OTHER way this game writes a fraction */
    const text = strip(openFracAny(html));
    for (const m of text.matchAll(SIGN_TEXT)) {
      const n = Number(m[1]), d = Number(m[2]);
      if (!(n >= 1) || !(d >= 1))
        return `the ${label} prints ${m[1]}/${m[2]} as text - a ${!(n >= 1) ? 'numerator' : 'denominator'} below 1 is not a P3 fraction and not a P4 or P5 one either (${text.slice(0, 110)})`;
    }
    if (SIGN_UNARY.test(text))
      return `the ${label} prints a minus sign fixed to a number - negative numbers enter at Secondary 1 (${text.slice(0, 110)})`;
  }
  return null;
}
const signRows = [];
for (const g of GENS) {
  let bad = 0, n = 0, sample = null;
  for (let i = 0; i < SIGN_N; i++) {
    let q; try { q = g.fn(); } catch (e) { break; }
    if (!q) continue;
    n++;
    const v = signScan(q);
    if (v) { bad++; if (!sample) sample = v; }
  }
  if (!n) continue;
  const row = { name: g.topic + '.' + g.name, n, bad, sample };
  row.err = bad ? `sign gate: a rendered fraction is below 1 on ${bad} of ${n} draws - ${sample}` : null;
  signRows.push(row);
  if (row.err) failures++;
}

/* ---------- THE CARD-ROW CLAUSE ----------------------------------------------
   SWEEP FRACTIONS REFUTATION, SEVENTH PASS 2026-09-16, WOUND 2. The teaching card
   is the one surface in this app that nothing re-derives, and four banks ended
   theirs by naming a WRONG ANSWER the child could not see: gSimplest 58.6 / 58.3%,
   gEquivFromBar 52.3 / 52.5%, gSubRelated 27.3 / 27.6% and gSimplestError
   25.5 / 25.7%. The cause is always the same and it is structural: the sentence
   names a CANDIDATE, and sided() seats three of a dozen or more. A child reading
   "taking 1 off the bottom of 1/6 gives 1/5" under a row with no 1/5 on it is
   being taught about an item they were not shown.

   The fifth pass fixed exactly this in gPickEquiv with a ternary and the class was
   left open in four siblings, so it is a GATE now rather than a habit: in any
   teaching card, every fraction rendered inside a WRONG-ANSWER SENTENCE must be
   printed on the option row or in the stem. A wrong-answer sentence is one
   carrying one of the file's own markers - "would give", "gives", "instead",
   "a different amount", "too small". Correct intermediate values ("the whole bar
   is 9/9", "she had 7/10") are NOT touched: they sit in neutral sentences, which
   is the calibration and is why the marker list is narrow rather than a scan of
   every fraction on the card. Three more banks went red on its first run -
   gMakeOneIn 49.8 / 50.0%, gPickEquiv 26.8 / 26.1% and gSubSame 2.2 / 2.6% - and
   gPickEquiv's is the subtle one the class hides: its v5 ternary asked whether the
   candidate's VALUE was on the row and then printed the candidate's OWN form,
   while sided()'s uniq() seats whichever of two equal-valued candidates is written
   in the bigger pieces, so the card said "2/8" over a row showing "1/4". All seven
   are fixed at their sites and the gate is set at zero.

   EIGHTH PASS 2026-09-16, KILL 2 - THE CLAUSE CLOSED THE RENDERING, NOT THE
   DEFECT. Three of those seven "fixes" did not stop NAMING an off-row wrong
   answer; they stopped RENDERING it, and this clause could only read the
   rendering. gSimplest went on naming one on 64.5 / 63.5% ("leaving the bottom
   number at 10", with "8 / 2 = 4" two clauses earlier - the two numerals of 4/10
   and the instruction to put one over the other) and gMakeOneIn on 49.1 / 49.6%
   ("the old top number 1 over the new bottom number 6"), both flat against their
   declared "before" rates of 58.6% and 49.8%. WORSE, THE TWO NUMERIC-OPTION BANKS
   WERE NEVER IN SCOPE AT ALL: gEqMissing and gEqMissingDen answer with a BARE
   NUMBER, so allFracs found nothing on their cards and the clause skipped them -
   51.3 / 50.7% and 50.9 / 51.3%, never once measured.

   THE CLAUSE READS EVERY SPELLING THE TOPIC USES NOW, which is the ninth pass's
   question asked of this ruler: what else could this defect be written as?
     (a) a RENDERED fraction, as before;
     (b) a PLAIN-TEXT fraction, "4/10";
     (c) a WORD fraction - "4 over 10", "4 out of 10", and the split form "the top
         number 4 ... the bottom number 10";
     (d) a LONE HALF of one, on a bank whose options are fractions: "leaving the
         bottom number at 10" hands the child one part of a wrong answer and never
         shows the whole, which is the assembly instruction itself. A wrong-answer
         sentence may name a PART only when it also names the whole fraction and
         that fraction is on the screen; otherwise it names the belief in words,
         which is exactly what the v8 note claimed all seven banks already did;
     (e) a BARE NUMBER, on a bank whose options are bare numbers - every numeral in
         a wrong-answer sentence must be printed on the option row or in the stem,
         because on those banks the wrong answer IS a bare number.
   Rendered fractions are masked out before (b)-(e) run, so "taking 1 off the
   bottom of 2/3" is read as a rendered fraction and not as a lone part. Negative
   controls: the v8 gSimplest card, the v8 gMakeOneIn card and the v8 gEqMissingDen
   card, all three red. --- */
const CARD_N = 500;
const CARD_WRONG = /would give|would be|would make|gives|instead|a different amount|a smaller amount|a bigger amount|too small|too big|not even close/i;
/* a numeral introduced as one half of a fraction */
const CARD_PART = /\b(top|bottom)\s+number\s+(?:at\s+|of\s+|is\s+)?(-?\d+)|\b(top|bottom)\s+at\s+(-?\d+)/gi;
const CARD_OVER = /(-?\d+)[^.\d]{0,40}?\b(?:over|out of)\b[^.\d]{0,40}?(-?\d+)/gi;
const CARD_SPLIT = /\btop\s+number\s+(?:at\s+|of\s+|is\s+)?(-?\d+)[^.]{0,60}?\bbottom\s+number\s+(?:at\s+|of\s+|is\s+)?(-?\d+)/gi;
const CARD_SLASH = /(-?\d+)\s*\/\s*(-?\d+)/g;
function cardScan(q) {
  const card = String(q.explain || '');
  if (!card) return null;
  const onScreen = new Set();
  const onNums = new Set();
  for (const src of (q.choices || []).concat([q.q, q.extra || ''])) {
    for (const f of allFracs(src)) onScreen.add(f[0] + '/' + f[1]);
    for (const x of strip(openFracAny(src)).match(/-?\d+/g) || []) onNums.add(x);
  }
  /* Which kind of answer this bank takes. `strip` alone will not tell: stripping
     the markup off a rendered fraction leaves its two numerals side by side, so
     every fraction bank reads as a bare-number one. The rendered fractions have to
     be COUNTED, not removed. */
  const ch = q.choices || [];
  const numericBank = ch.length > 0 && ch.every(c => allFracs(c).length === 0 && /^-?\d+$/.test(strip(String(c))));
  const fracBank = ch.length > 0 && ch.every(c => allFracs(c).length > 0);
  for (const sent of card.split(/(?<=\.)\s+/)) {
    const text = strip(sent);
    if (!CARD_WRONG.test(text)) continue;
    const shown = allFracs(sent);
    for (const f of shown) {
      const t = f[0] + '/' + f[1];
      if (!onScreen.has(t))
        return `the card names ${t} as a wrong answer and ${t} is on neither the option row nor the stem ("${strip(openFracAny(sent)).slice(0, 110)}")`;
    }
    /* everything below reads the sentence with its RENDERED fractions masked out,
       so a fraction already checked above cannot be re-read as loose numerals */
    const masked = strip(String(sent).replace(/<span class="frac">[\s\S]*?<\/span><\/span>/g, ' [FRAC] ')
      .replace(/<span class="n">-?\d+<\/span><span class="d">-?\d+<\/span>/g, ' [FRAC] '));
    const pair = (a, b, how) => {
      const t = a + '/' + b;
      return onScreen.has(t) ? null
        : `the card names ${t} as a wrong answer ${how} and ${t} is on neither the option row nor the stem ("${masked.slice(0, 110)}")`;
    };
    for (const m of masked.matchAll(CARD_SLASH)) { const v = pair(m[1], m[2], 'in plain text'); if (v) return v; }
    for (const m of masked.matchAll(CARD_SPLIT)) { const v = pair(m[1], m[2], 'in words'); if (v) return v; }
    for (const m of masked.matchAll(CARD_OVER)) { const v = pair(m[1], m[2], 'in words'); if (v) return v; }
    if (fracBank && !shown.length) {
      for (const m of masked.matchAll(CARD_PART)) {
        const half = (m[1] || m[3]).toLowerCase(), val = m[2] === undefined ? m[4] : m[2];
        return `the card hands the child the ${half} number ${val} of a wrong answer and never shows the fraction it makes, on a bank whose options are fractions ("${masked.slice(0, 110)}")`;
      }
    }
    if (numericBank) {
      for (const x of masked.match(/-?\d+/g) || [])
        if (!onNums.has(x))
          return `the card names ${x} as a wrong answer and ${x} is on neither the option row nor the stem, on a bank whose options are bare numbers ("${masked.slice(0, 110)}")`;
    }
  }
  return null;
}
const cardRows = [];
for (const g of GENS) {
  if (!TOK_TOPICS.has(g.topic)) continue;
  let bad = 0, n = 0, sample = null;
  for (let i = 0; i < CARD_N; i++) {
    let q; try { q = g.fn(); } catch (e) { break; }
    if (!q) continue;
    n++;
    const v = cardScan(q);
    if (v) { bad++; if (!sample) sample = v; }
  }
  if (!n) continue;
  const row = { name: g.topic + '.' + g.name, n, bad, sample };
  row.err = bad ? `card-row clause: the teaching card names a wrong answer that is not on the screen on ${bad} of ${n} draws - ${sample}` : null;
  cardRows.push(row);
  if (row.err) failures++;
}

/* ---------- RULE 14: THE HALF-KEY RULE ---------------------------------------
   SWEEP FRACTIONS REFUTATION, SEVENTH PASS 2026-09-16, KILL 1 - the deliverable,
   and the fourth ruler in a row written because the tell moved to the surface the
   newest ruler could not read.

   v7's gPicTakeAway was built to RULE 12 and passed it: the bar's part count is
   the key's bottom number and appears in no word of the stem, the six-row stem
   table measured 39.5%, and "another legal bar changes the answer on every draw"
   proved the figure DETERMINES the key. None of that is the same claim as the
   child NEEDING it. The stem printed her piece count `a` and the number she ate
   `g`, and:

     - "the answer's TOP number is a - g" was true on 100.00% of draws;
     - it isolated the key on 59.6 / 59.0% of them;
     - take it and guess among the ties: 79.6 / 79.2%;
     - break the tie on "the bottom number printed twice on the row" - the seat
       sameDen() is REQUIRED to fill: 88.7 / 88.8%.

   RULE 12's arithmetic library scores only an expression naming the WHOLE key
   (v1/v2 against "a/b"), so a numerator-only match scored nothing and the column
   reported 14.7% while a - g named the top on every single draw. RULE 10 and
   RULE 11 discard the stem. RULE 13 reads numeral membership, and a - g is
   arithmetic. The route fell through the middle of all four.

   THE RULE. No bank may have ONE HALF of its key - the numerator or the
   denominator - named by a single expression over the stem's numerals to the point
   where the OPTION ROW then settles the item on 60% or more of draws. The ruler
   learns the best such expression on 2,000 draws and tests on 2,000 more: take the
   options carrying that numeral in that position, and guess among them (a rule
   that leaves two options standing is worth half a draw, exactly as RULE 13 scores
   it, and a rule that names nothing on the row is worth a guess).

   THE METHOD EXEMPTION, which is what makes it gateable and is not a fudge. On
   four banks the named expression IS THE ITEM WORKING, and each is declared BY
   NAME with the mathematics it stands for below. "Add the two top numbers and keep
   the bottom number" names gAddSame's numerator on every draw because that is the
   whole of adding like fractions - the same call RULE 12 already makes for its
   arithmetic column. The exemption is keyed to the (bank, expression) PAIR: a bank
   on the list whose tell moves to a DIFFERENT expression still fails, and the
   second control below proves that rather than asserting it.

   Negative control: the v7 gPicTakeAway construction, rebuilt from its own draw
   and its own candidate bank, red at ~80%.

   EIGHTH PASS 2026-09-16, KILL 1 - THE LIBRARY WAS ONE OPERATION AND THE TELL WAS
   TWO. v8 shipped this rule with its own blind spot declared as residual 9: "the
   expression library is ONE operation over the stem's numerals ... a two-operation
   half-key route is invisible to it". It was not theoretical. `(n1)/2` - halve the
   bottom number the stem prints - named gSimplestError's key on 76.2 / 76.9% of
   draws and answered the item on 70.5 / 70.7%, and gSimplest's on 71.7% at 66.6%,
   on two banks served 1.81 and 1.35 items a session. THE RULE as stated says "a
   single expression"; only the IMPLEMENTATION's library kept the gate quiet, so the
   line this file printed on every run was false as a claim about the FILE and true
   only as a claim about the RULER. THE LIBRARY IS TWO OPERATIONS NOW: every
   one-operation value composed once more with the same operations plus the halving
   family the residual names - A op n_k, A op 1, A op 2, A/2, A/3, A/n_k. Distinct
   VALUES only are composed, because two spellings of one number cannot score
   differently and that dedupe is what keeps the widened sweep inside the harness's
   running time.

   AND THE EXEMPTION LIST IS KEYED BY VALUE, NOT BY SPELLING, which is the same
   lesson applied to the fix. "n0+n2" and "(n0)+n2" are one piece of arithmetic, so
   a list keyed to the STRING would have failed all four exempted banks the moment
   the library learnt to write their own method a second way. A learnt expression is
   exempt when it is value-identical, on EVERY tested draw, to an expression the
   list declares for that bank.

   THE TWO RELATED-FRACTION EXEMPTIONS ARE GONE. v8 declared gAddRelated|n3 and
   gSubRelated|n3 at 60.9% and 58.1%; those were v7 numbers printed in a v8 table.
   After v8's own row change the banks measure 49.9% and 44.0%, so the exemptions
   were two permanent holes with no evidence behind them - a later edit could push
   either bank's n3 route back over the ceiling with the gate staying quiet. Deleted;
   both banks are gated like every other.

   Live banks after the ninth-pass rebuild: the four exempted ones at 70.3-77.7% on
   their own method, and nothing else over 50%. --- */
const HALF_N = 2000, HALF_CAP = 0.60;
/* (bank, expression) -> the mathematics that expression IS, in the item's own
   words. Adding a line here is a claim about the SYLLABUS, not about the file. The
   match is by VALUE: any spelling of the same arithmetic is the same exemption. */
const HALF_METHOD = {
  'fractions.gAddSame|n0+n2': 'add the two top numbers and keep the bottom number',
  'fractions.gSubSame|n0-n2': 'take the second top number from the first and keep the bottom number',
  'fractions.gSubFromOne|n2-n1': 'one whole is d/d, so take the top number from the bottom number',
  'fractions.gMakeOne|n1-n0': 'what is missing from one whole is the bottom number less the top number'
};
/* every expression any exemption is written in, for the value-alias test below */
const HALF_METHOD_EXPRS = [...new Set(Object.keys(HALF_METHOD).map(k => k.split('|')[1]))];
/* ONE operation over the stem's numerals, then a SECOND over the result. Walked
   rather than materialised: the library is ~1,400 values on an eight-numeral stem
   and building an array of it on every draw is most of the running time. */
/* the v8 library, kept so a control can show that the WIDENING is what reads the
   two-operation route and not the rest of the rule */
function halfWalk1(ns, cb) {
  ns.forEach((v, i) => { cb('n' + i, v); cb('n' + i + '+1', v + 1); cb('n' + i + '-1', v - 1); });
  for (let x = 0; x < ns.length; x++) for (let y = 0; y < ns.length; y++) if (x !== y) {
    cb('n' + x + '+n' + y, ns[x] + ns[y]);
    cb('n' + x + '-n' + y, ns[x] - ns[y]);
    cb('n' + x + '*n' + y, ns[x] * ns[y]);
  }
}
function halfWalk(ns, cb) {
  const base = [];
  const one = (nm, v) => { base.push([nm, v]); cb(nm, v); };
  ns.forEach((v, i) => { one('n' + i, v); one('n' + i + '+1', v + 1); one('n' + i + '-1', v - 1); });
  for (let x = 0; x < ns.length; x++) for (let y = 0; y < ns.length; y++) if (x !== y) {
    one('n' + x + '+n' + y, ns[x] + ns[y]);
    one('n' + x + '-n' + y, ns[x] - ns[y]);
    one('n' + x + '*n' + y, ns[x] * ns[y]);
  }
  const done = new Set();
  const two = (nm, v) => { if (Number.isInteger(v)) cb(nm, v); };
  for (const [nm, v] of base) {
    if (done.has(v)) continue;
    done.add(v);
    two('(' + nm + ')/2', v / 2); two('(' + nm + ')/3', v / 3); two('(' + nm + ')*2', v * 2);
    two('(' + nm + ')+1', v + 1); two('(' + nm + ')-1', v - 1);
    two('(' + nm + ')+2', v + 2); two('(' + nm + ')-2', v - 2);
    for (let k = 0; k < ns.length; k++) {
      two('(' + nm + ')+n' + k, v + ns[k]);
      two('(' + nm + ')-n' + k, v - ns[k]);
      two('(' + nm + ')*n' + k, v * ns[k]);
      if (ns[k]) two('(' + nm + ')/n' + k, v / ns[k]);
    }
  }
}
/* One expression's value on one stem, so the TEST pass costs O(1) instead of
   rebuilding the library. undefined when the expression does not land on a whole
   number - the file's own convention, and why a rule that names nothing on the row
   is scored as a guess rather than as a miss. */
const halfBase = (nm, ns) => {
  let m = /^n(\d+)$/.exec(nm);
  if (m) return ns[+m[1]];
  m = /^n(\d+)([+-])1$/.exec(nm);
  if (m) return ns[+m[1]] === undefined ? undefined : ns[+m[1]] + (m[2] === '+' ? 1 : -1);
  m = /^n(\d+)([+\-*])n(\d+)$/.exec(nm);
  if (!m) return undefined;
  const a = ns[+m[1]], b = ns[+m[3]];
  if (a === undefined || b === undefined) return undefined;
  return m[2] === '+' ? a + b : m[2] === '-' ? a - b : a * b;
};
function halfEval(nm, ns) {
  const m = /^\((.+)\)([+\-*/])(\d+|n\d+)$/.exec(nm);
  if (!m) return halfBase(nm, ns);
  const a = halfBase(m[1], ns);
  if (a === undefined) return undefined;
  const b = m[3][0] === 'n' ? ns[+m[3].slice(1)] : Number(m[3]);
  if (b === undefined) return undefined;
  const v = m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === '*' ? a * b : (b ? a / b : NaN);
  return Number.isInteger(v) ? v : undefined;
}
const halfPair = o => {
  const m = String(o).match(/<span class="n">(-?\d+)<\/span><span class="d">(-?\d+)<\/span>/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
function halfBank(draw, n, walk) {
  const lib = walk || halfWalk;
  const cnt = new Map();
  const bump = (k, i) => { const v = cnt.get(k) || [0, 0]; v[i]++; cnt.set(k, v); };
  let drew = 0;
  for (let i = 0; i < n; i++) {
    let q; try { q = draw(); } catch (e) { break; }
    if (!q || !(q.correct >= 0) || (q.choices || []).length !== 4) continue;
    const k = halfPair(q.choices[q.correct]);
    if (!k) continue;
    drew++;
    const sn = new Set(), sd = new Set();
    lib(numsOfHtml(q.q), (nm, v) => { if (v === k[0]) sn.add(nm); if (v === k[1]) sd.add(nm); });
    for (const nm of sn) bump(nm, 0);
    for (const nm of sd) bump(nm, 1);
  }
  if (!drew) return { n: 0 };
  /* EIGHTH PASS 2026-09-16. v8 learnt the ONE expression that names a half most
     often and reported its route. That is not the same as the best ROUTE: naming
     the key's bottom number on 77% is worth less than naming it on 71% if the
     first one leaves three options standing and the second isolates. On the v8
     gSimplest control the two tie at ~71% and the ruler picked whichever the
     library happened to emit first - 42% instead of 66%. The HALF_TOP candidates
     by naming frequency are all carried into the test pass now and the WORST of
     them is the bank's verdict, which is the honest reading of "a child who has
     found the rule" and costs one integer evaluation per candidate per draw. */
  const HALF_TOP = 12;
  const cands = [];
  for (const [k, v] of cnt) { cands.push([k, 0, v[0]]); cands.push([k, 1, v[1]]); }
  cands.sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const picks = cands.slice(0, HALF_TOP).map(c => ({
    expr: c[0], half: c[1], names: 0, score: 0, alias: new Set(HALF_METHOD_EXPRS)
  }));
  /* SEVENTH PASS 2026-09-16. A stem with NO numeral in it has no expression to
     learn, and a ruler that drops such a bank from its table is the failure mode
     this whole pass is about - five of the seven kills landed on the surface the
     newest ruler did not read. v8's gPicTakeAway prints no numeral by design, so
     it is reported at zero rather than omitted. */
  if (!picks.length) return { n: drew, expr: '-none-', half: 'n/a', names: 0, rate: 0, aliases: [] };
  let tested = 0;
  for (let i = 0; i < n; i++) {
    let q; try { q = draw(); } catch (e) { break; }
    if (!q || !(q.correct >= 0) || (q.choices || []).length !== 4) continue;
    const k = halfPair(q.choices[q.correct]);
    if (!k) continue;
    tested++;
    const ns = numsOfHtml(q.q);
    const pairs = [];
    for (let j = 0; j < 4; j++) pairs.push(halfPair(q.choices[j]));
    for (const p of picks) {
      const v = halfEval(p.expr, ns);
      /* which declared-method expressions this one is value-identical to, on every
         draw: an exemption that reads only the SPELLING is the same defect the
         widened library was written to catch, one level up */
      for (const e of p.alias) if (halfEval(e, ns) !== v) p.alias.delete(e);
      if (v === undefined) { p.score += 0.25; continue; }
      if (k[p.half] === v) p.names++;
      const hits = [];
      for (let j = 0; j < 4; j++) if (pairs[j] && pairs[j][p.half] === v) hits.push(j);
      p.score += hits.length ? (hits.indexOf(q.correct) >= 0 ? 1 / hits.length : 0) : 0.25;
    }
  }
  if (!tested) return { n: 0 };
  let win = picks[0];
  for (const p of picks) if (p.score > win.score) win = p;
  return { n: tested, expr: win.expr, half: win.half ? 'denominator' : 'numerator',
           aliases: [...win.alias], names: win.names / tested, rate: win.score / tested };
}
/* The exemption this row qualifies for under `name`, by spelling OR by value. */
function halfMethodOf(row, name) {
  if (!row || !row.expr) return null;
  for (const e of [row.expr].concat(row.aliases || []))
    if (HALF_METHOD[name + '|' + e]) return HALF_METHOD[name + '|' + e];
  return null;
}
function halfVerdict(row, name) {
  if (!row.n || row.rate < HALF_CAP) return null;
  if (halfMethodOf(row, name)) return null;
  return `half-key tell: the single expression "${row.expr}" over the stem's numerals names the key's ${row.half} on ${(100 * row.names).toFixed(1)}% of draws, and taking the options that carry it answers the item on ${(100 * row.rate).toFixed(1)}% - at or over the ${Math.round(100 * HALF_CAP)}% ceiling, with the other half of the key settled by the OPTION ROW and the item's own mathematics never done`;
}
const halfRows = [];
for (const g of GENS) {
  if (!TOK_TOPICS.has(g.topic)) continue;
  const row = halfBank(g.fn, HALF_N);
  if (!row.n) continue;
  row.name = g.topic + '.' + g.name;
  row.method = halfMethodOf(row, row.name);
  row.err = halfVerdict(row, row.name);
  halfRows.push(row);
  if (row.err) failures++;
}

/* ---------- NEGATIVE CONTROLS for the third pass's new gates -----------------
   SWEEP FRACTIONS REFUTATION, THIRD PASS 2026-09-16. Four rules went in or were
   widened this pass, and a rule that has never been shown to go red is a comment,
   not a gate. Each control below rebuilds the ACTUAL v3 defect from its own
   strings - so the control does not depend on the topic file still containing it -
   runs the gate's own code over it, and fails the build if the gate stays quiet.
   The controls measure; they do not register a generator, so nothing here can
   reach the app. --- */
const FR = (n, d) => '<span class="frac"><span class="n">' + n + '</span><span class="d">' + d + '</span></span>';
const controlRows = [];
function control(label, fn) {
  let got = null, threw = null;
  try { got = fn(); } catch (e) { threw = e.message; }
  const ok = !!got && !threw;
  controlRows.push({ label, ok, note: threw ? 'threw: ' + threw : (got || 'NOT REJECTED - the gate stayed quiet on a defect it is written to catch') });
  if (!ok) failures++;
}
const CTL_N = 400;

/* 1. RULE 4, the 12 cap: v3's "added the bottom numbers as well" option, 7/24, on
      a gSubSame-shaped row. v3 allowed it to 24; 40% of that item's rows carried
      one. */
control('RULE 4 denominator cap - the v3 [a+b, 2d] option, 7/24', () => pilotGates({
  q: FR(5, 12) + ' − ' + FR(2, 12) + ' = ?', extra: '',
  choices: [FR(3, 12), FR(7, 24), FR(4, 12), FR(2, 12)], correct: 0,
  answerText: FR(3, 12), explain: ''
}, 'fractions'));

/* 2. RULE 6, the direction it did not look: v3's gAddError sentence bank, whose
      key was the uniquely SHORTEST option on every draw it was the answer. */
control('RULE 6 two-direction - the v3 gAddError sentence bank (key uniquely shortest)', () => {
  const NM = ['Siti', 'Kumar', 'Ravi'];
  let uShort = 0, uLong = 0, n = 0;
  for (let i = 0; i < CTL_N; i++) {
    const nm = NM[Math.floor(Math.random() * NM.length)];
    const key = nm + ' added the bottom numbers as well.';
    const opts = [key,
      nm + ' subtracted the top numbers instead of adding them.',
      nm + ' multiplied the top numbers instead of adding them.',
      nm + ' should have made the bottom numbers the same first.'];
    if (!allProse(opts)) continue;
    n++;
    if (keyIsShortest(opts, 0)) uShort++;
    if (keyIsLongest(opts, 0)) uLong++;
  }
  if (!n) return null;
  if (uShort / n >= LENGTH_TELL_CAP)
    return `the key is the uniquely SHORTEST of the four sentences on ${(100 * uShort / n).toFixed(1)}% of draws`;
  if (uLong / n >= LENGTH_TELL_CAP) return 'uniquely longest';
  return null;
});

/* 3. RULE 8, the stem echo: v3's gEqualParts option set. The key restates the
      stem's clause and is the only option carrying "same", "size" or "all". */
control('RULE 8 stem echo - the v3 gEqualParts option set', () => {
  let solo = 0, n = 0, worstNamed = 4;
  for (let i = 0; i < CTL_N; i++) {
    const d = 4 + Math.floor(Math.random() * 9);
    const key = 'The pieces are not all the same size, so 1 piece is not 1 out of ' + d + ' equal parts.';
    const opts = [key,
      'Nothing is wrong: 1 piece out of ' + d + ' pieces is always ' + FR(1, d) + ' of it.',
      'The bottom number should be the number of pieces she did not take.',
      'A fraction can only be written when the whole is cut into an even number of pieces.'];
    const stem = 'Siti cuts a kueh lapis into ' + d + ' pieces, but the pieces are <b>not</b> all the same size. ' +
      'She takes 1 piece. <b>Why can she not call that piece ' + FR(1, d) + ' of it?</b>';
    if (!allProse(opts)) continue;
    n++;
    const e = stemEcho(stem, opts, 0);
    if (e.solo.length) solo++;
    worstNamed = Math.min(worstNamed, e.named);
  }
  if (!n) return null;
  return solo / n >= STEM_ECHO_CAP
    ? `the key carries a word of the stem that no other option carries on ${(100 * solo / n).toFixed(1)}% of draws (fewest options naming the stem: ${worstNamed})`
    : null;
});

/* 4. RULE 7's new FLOOR, on its own: a row inside the 45% cap and inside the 40%
      policy caps, with one rank nearly empty. Only the floor can catch it. */
control('RULE 7 rank floor - a bank that keys the largest of four on 8% of draws', () => {
  const NUM = x => String(x);
  const draw = () => {
    const r = Math.random();
    const rank = r < 0.30 ? 1 : r < 0.62 ? 2 : r < 0.92 ? 3 : 4;   /* 30 / 32 / 30 / 8 */
    const below = [7, 8, 9], above = [11, 12, 13];
    const opts = [10].concat(below.slice(0, rank - 1)).concat(above.slice(0, 4 - rank));
    const order = opts.map((_, i) => i).sort(() => Math.random() - 0.5);
    return { q: 'floor control', extra: '', choices: order.map(i => NUM(opts[i])),
             correct: order.indexOf(0), answerText: NUM(10) };
  };
  const row = rankBank(draw, 4000);
  const v = rankVerdict(row.rate, row.ranked, row.den, row.denDraws);
  return v && /rank floor/.test(v) ? v : null;
});

/* 5. RULE 7's new SECOND-SMALLEST policy cap, on its own: the rank that used to be
      allowed up to 45% while its three neighbours were held to 40%. */
control('RULE 7 second-smallest policy cap - a bank that keys it on 43% of draws', () => {
  const draw = () => {
    const r = Math.random();
    const rank = r < 0.20 ? 1 : r < 0.63 ? 2 : r < 0.83 ? 3 : 4;   /* 20 / 43 / 20 / 17 */
    const below = [7, 8, 9], above = [11, 12, 13];
    const opts = [10].concat(below.slice(0, rank - 1)).concat(above.slice(0, 4 - rank));
    const order = opts.map((_, i) => i).sort(() => Math.random() - 0.5);
    return { q: 'policy control', extra: '', choices: order.map(i => String(opts[i])),
             correct: order.indexOf(0), answerText: String(10) };
  };
  const row = rankBank(draw, 4000);
  const v = rankVerdict(row.rate, row.ranked, row.den, row.denDraws);
  return v && /second smallest/.test(v) ? v : null;
});

/* 6. The exemption that was carrying a tell: v3's gCompareBar row, one option on
      the named side and three on the other, so the key is the strict extreme. It
      passed only because RANK_EXEMPT named it; out of that set, it must go red. */
control('RULE 7 without the gCompareBar exemption - the v3 one-sided bar row', () => {
  const draw = () => {
    let d = 8, n = 3, up = true, right = [], wrong = [], g = 0;
    do {
      d = 4 + Math.floor(Math.random() * 9); n = 1 + Math.floor(Math.random() * (d - 1));
      up = Math.random() < 0.5;
      const bank = [];
      for (let x = 1; x <= d - 1; x++) if (x !== n) bank.push(x);
      right = bank.filter(x => up ? x > n : x < n);
      wrong = bank.filter(x => up ? x < n : x > n);
      g++;
    } while (g < 200 && (!right.length || wrong.length < 3));
    const key = right[Math.floor(Math.random() * right.length)];
    const three = wrong.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [key].concat(three);
    const order = opts.map((_, i) => i).sort(() => Math.random() - 0.5);
    return { q: 'The bar below shows one fraction shaded blue. Which of these fractions is <b>' +
                (up ? 'greater' : 'less') + '</b> than the blue fraction?', extra: '',
             choices: order.map(i => FR(opts[i], d)), correct: order.indexOf(0), answerText: FR(key, d) };
  };
  const row = rankBank(draw, 4000);
  return rankVerdict(row.rate, row.ranked, row.den, row.denDraws);
});

/* 7. RULE 9, the TOKEN RULER: v4's gEqualParts option set, rebuilt from its own
      strings so the control does not depend on the topic file still carrying the
      defect. The key is the only option printing "counts" (the distractor prints
      "count") and the only compound sentence, so "and", "these" and "that" isolate
      it too. It must go red, and on the RAW "counts" - a stemmed-only ruler would
      collapse count / counts and see nothing, which is why RULE 9 runs both. */
control('RULE 9 token ruler - the v4 gEqualParts option set (the "counts" kill)', () => {
  const NM = [['Siti', 'she'], ['Kumar', 'he'], ['Ravi', 'he']];
  const draw = () => {
    const d = 4 + Math.floor(Math.random() * 9), nm = NM[Math.floor(Math.random() * NM.length)];
    const key = 'A fraction counts parts that are of equal size, and these ' + d + ' pieces are different sizes.';
    const opts = [key,
      'Nothing is wrong: any ' + d + ' pieces of one whole are always ' + d + ' equal parts, at different sizes.',
      'The bottom number should count only the pieces of the same size as the piece ' + nm[1] + ' took.',
      'A fraction can only be written when the whole is cut into an even number of equal parts.'];
    return { q: 'v4 gEqualParts control', extra: '', choices: opts, correct: 0, answerText: opts[0] };
  };
  const v = tokVerdict(tokBank(draw, TOK_N));
  return v && /counts/.test(v) ? v : (v || null);
});

/* 8. RULE 10, the PICTURE RULER: v4's gCompareBar row, rebuilt from its own
      construction - two options carrying the feature the stem names, two carrying
      the other one, the blue fraction between the named pair. "Find the pair that
      shares the named feature, take the direction extreme of those two" answers it
      without the bar ever being counted. It must go red. */
control('RULE 10 picture ruler - the v4 gCompareBar two-pair row', () => {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pk = arr => arr[Math.floor(Math.random() * arr.length)];
  const draw = () => {
    let d = 8, n = 3, mode = 'sameD', dir = 'greater', key = [5, 8], others = [[3, 4], [2, 8], [3, 10]], g = 0, ok = false;
    do {
      d = rnd(4, 12); n = rnd(1, d - 1);
      mode = Math.random() < 0.5 ? 'sameD' : 'sameN';
      dir = Math.random() < 0.5 ? 'greater' : 'less';
      const up = dir === 'greater';
      const right = p => up ? p[0] * d > n * p[1] : p[0] * d < n * p[1];
      const wrong = p => up ? p[0] * d < n * p[1] : p[0] * d > n * p[1];
      const bankD = [], bankN = [];
      for (let x = 1; x <= d - 1; x++) if (x !== n) bankD.push([x, d]);
      for (let e = n + 1; e <= 12; e++) if (e !== d) bankN.push([n, e]);
      const named = mode === 'sameD' ? bankD : bankN, off = mode === 'sameD' ? bankN : bankD;
      const kB = named.filter(right), aB = off.filter(right), bB = named.filter(wrong), cB = off.filter(wrong);
      ok = kB.length && aB.length && bB.length && cB.length;
      if (ok) { key = pk(kB); others = [pk(aB), pk(bB), pk(cB)]; }
      g++;
    } while (g < 200 && !ok);
    const pairs = [key].concat(others);
    const order = pairs.map((_, i) => i).sort(() => Math.random() - 0.5);
    return { q: 'The bar below shows one fraction shaded blue. Which of these fractions has the <b>same ' +
                (mode === 'sameD' ? 'bottom' : 'top') + ' number</b> as the bar AND is <b>' + dir + '</b> than the blue fraction?',
             extra: '', figure: { type: 'fractionBar', parts: d, filled: n },
             choices: order.map(i => FR(pairs[i][0], pairs[i][1])), correct: order.indexOf(0),
             answerText: FR(key[0], key[1]) };
  };
  return picVerdict(picBank(draw, PIC_N));
});

/* The v5 gEqualParts option set, rebuilt from its own construction: one frame,
   one parts-word drawn for all four sentences, and every token the key prints
   also printed by at least one distractor. It is the row RULE 9 measured at
   0.00% and passed, and it is answerable at 100% by the complement. Both new
   clauses are run over it below. */
const V5_EQP = () => {
  const P = Math.random() < 0.5 ? 'pieces' : 'parts';
  const d = 4 + Math.floor(Math.random() * 9);
  const frame = 'A fraction needs the whole cut into ';
  const key = frame + P + ' of the same size.';
  const opts = [key, frame + P + ' of one shape.', frame + d + ' ' + P + ' of any size.',
                frame + 'an even number of ' + P + ' of the same size.'];
  const order = opts.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { q: 'v5 gEqualParts control', extra: '', choices: order.map(i => opts[i]),
           correct: order.indexOf(0), answerText: key };
};

/* 9. RULE 9's COMPLEMENT CLAUSE (FIFTH PASS 2026-09-16, THE KILL). The v5 fix -
      every token in the key printed by some distractor - is exactly what makes the
      key the only option with nothing of its own, because each distractor keeps
      one (`an`/`even`/`number`, `one`/`shape`, the numeral and `any`). RULE 9's
      original clause measures this row at 0.00% and passes it, which is the whole
      finding; the complement must fail it. */
control('RULE 9 complement - the v5 gEqualParts option set ("no word of its own")', () => {
  const row = tokBank(V5_EQP, CTL_N);
  if (!row.n) return null;
  const k = tokTop(row.keyOnly);
  if (k[1] / row.n >= TOK_CAP) return 'caught by the ORIGINAL clause, not the complement - the control is not measuring what it claims';
  return tokVerdict(row);
});

/* 10. RULE 11, the ROW-ONLY RULE: the same v5 gEqualParts row. Eighteen option
       sets, each with one key, on a bank served 3.5 times a session to a
       struggling child - the row is memorised inside a week and the stem is never
       read again. */
control('RULE 11 row-only - the v5 gEqualParts row (18 option sets, one key each)', () =>
  rowVerdict(rowBank(V5_EQP, ROW_N)));

/* 11. RULE 11 again, on the row this pass actually killed: v5's gCompareError.
       Three fixed belief sentences and a fourth drawn from a bank PAIRED to the
       belief, so the odd sentence out names the key - 54 rows, 54 keys, and the
       two printed fractions changed nothing. Rebuilt here from its own
       construction so the control does not depend on the topic file. */
control('RULE 11 row-only - the v5 gCompareError paired-filler row (54 rows, 54 keys)', () => {
  const NM = ['Siti', 'Kumar', 'Mei Ling', 'Ravi', 'Aisyah', 'Wei Jie'];
  const SAY = {
    bottom: ' thought a bigger bottom number makes a bigger fraction.',
    sum:    ' added the top number to the bottom number in each fraction.',
    top:    ' used the bottom number rule on the top numbers instead.'
  };
  const NEVER = {
    bottom: [' made the bottom numbers the same before comparing them.',
             ' drew both fractions on bars with the same bottom number.',
             ' counted each bottom number as the pieces left over.'],
    top:    [' made the top numbers the same before comparing them.',
             ' drew both fractions on bars with the same top number.',
             ' counted each top number as the pieces left over.'],
    sum:    [' added the two top numbers together and compared the totals.',
             ' added the two bottom numbers together and compared the totals.',
             ' added one to each top number before comparing the totals.']
  };
  const ids = Object.keys(SAY);
  const draw = () => {
    const nm = NM[Math.floor(Math.random() * NM.length)];
    const id = ids[Math.floor(Math.random() * ids.length)];
    const key = nm + SAY[id];
    const opts = [key].concat(ids.filter(x => x !== id).map(x => nm + SAY[x]))
      .concat([nm + NEVER[id][Math.floor(Math.random() * 3)]]);
    const order = opts.map((_, i) => i).sort(() => Math.random() - 0.5);
    return { q: 'v5 gCompareError control', extra: '', choices: order.map(i => opts[i]),
             correct: order.indexOf(0), answerText: key };
  };
  return rowVerdict(rowBank(draw, ROW_N));
});

/* ---------- NEGATIVE CONTROLS for the SIXTH pass's three new gates -----------
   SWEEP FRACTIONS REFUTATION, SIXTH PASS 2026-09-16. Each rebuilds the ACTUAL v6
   defect from its own construction, so nothing here depends on the topic file
   still containing the generator that was killed - both of them are retired. */

/* 12. RULE 12, THE STEM-ONLY RULE: v6's gEqualParts. A bar of k equal pieces with
       one blue, the stem naming only `n` (the parts each piece is cut into), the
       key k x n, and the declared k x n <= 10 cap collapsing the (k, n) grid to
       seven cells. A four-line table over the ONE numeral the stem prints answers
       it, and the bar is never counted. The row is four bare part counts, so
       RULE 9, RULE 10 and RULE 11 are all quiet on it - which is the finding. */
/* The seven (k, n) shapes are NOT served evenly by the v6 generator: it draws the
   key's value rank first and retries until a shape can seat it, and (2,5), (3,3)
   and (5,2) are rejected more often - measured at 10.7% against 16.8% for the
   other four. That skew is part of the defect, because it is what makes the n = 3
   row of the table decisive rather than a coin, so the control reproduces it
   rather than drawing the seven uniformly. */
const V6_EQP = () => {
  const SH = [[2,3],[2,3],[2,4],[2,4],[3,2],[3,2],[4,2],[4,2],[2,5],[3,3],[5,2]];
  const s = SH[Math.floor(Math.random() * SH.length)], k = s[0], n = s[1], key = k * n;
  const bank = [k + n, n * (k - 1), k * (n - 1), key - 1, key + 1, k * (n + 1), (k + 1) * n,
                Math.random() < 0.5 ? k : n];
  const opts = [];
  for (const c of bank) { if (opts.length >= 3) break; if (c >= 1 && c <= 12 && c !== key && opts.indexOf(c) < 0) opts.push(c); }
  while (opts.length < 3) { const c = 1 + Math.floor(Math.random() * 12); if (c !== key && opts.indexOf(c) < 0) opts.push(c); }
  const row = [key].concat(opts);
  const order = row.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { q: 'The bar below shows a cake cut into equal pieces, and her piece is blue. She then cuts every piece into ' +
             n + ' equal parts. Into how many equal parts is the whole cake cut now?',
           extra: '', figure: { type: 'fractionBar', parts: k, filled: 1 },
           choices: order.map(i => String(row[i])), correct: order.indexOf(0), answerText: String(key) };
};
control('RULE 12 stem-only - the v6 gEqualParts stem (one numeral, four-line table)', () => {
  const row = stemBank(V6_EQP, STEM_N);
  if (!row.n) return null;
  if (!row.fig) return 'the control does not render a figure, so the gated clause cannot see it';
  if (process.env.CTL_DEBUG) console.log(`    [debug] v6 gEqualParts control: ${row.sigs} stem signature(s), table ${(100 * row.rate).toFixed(2)}%, arithmetic ${(100 * row.arith).toFixed(2)}%`);
  return stemVerdict(row);
});

/* 13. RULE 13, THE GLYPH RULE: v6's gCompareError. Four beliefs, each printing the
       number its own mistake produces for each of the two fractions - and for two
       of the four that number is a numeral already on the screen, which is what a
       rule with no arithmetic in it reads. Rebuilt from its own construction. */
const V6_CE = () => {
  const NM = ['Siti', 'Kumar', 'Mei Ling', 'Ravi', 'Aisyah', 'Wei Jie'];
  const B = [
    { id: 'top',    f: p => p[0],        say: n => n + ' compared the top numbers and left the bottom numbers out.' },
    { id: 'bottom', f: p => p[1],        say: n => n + ' thought a bigger bottom number makes a bigger fraction.' },
    { id: 'sum',    f: p => p[0] + p[1], say: n => n + ' added the top number to the bottom number in each fraction.' },
    { id: 'gap',    f: p => p[1] - p[0], say: n => n + ' counted the pieces that are missing instead of the ones there.' }
  ];
  const nm = NM[Math.floor(Math.random() * NM.length)];
  const bel = B[Math.floor(Math.random() * B.length)];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  let A = [2, 12], C = [1, 3], ok = false;
  for (let t = 0; t < 200 && !ok; t++) {
    if (bel.id === 'top' || Math.random() < 0.5) {
      const bb = [[1,2],[1,3],[2,3],[1,4],[3,4],[1,6],[5,6]][Math.floor(Math.random() * 7)];
      const m = rnd(2, Math.floor(12 / bb[1]));
      if (m < 2) continue;
      C = bb; A = [rnd(1, m * bb[1] - 1), m * bb[1]];
    } else {
      const n0 = rnd(1, 3);
      A = [n0, rnd(n0 + 1, 12)]; C = [n0, rnd(n0 + 1, 12)];
    }
    const X = bel.f(A), Y = bel.f(C);
    ok = A[0] < A[1] && C[0] < C[1] && A[1] <= 12 && C[1] <= 12 && A[0] * C[1] !== C[0] * A[1] &&
         X !== Y && X >= 1 && Y >= 1 && (X > Y) !== (A[0] * C[1] > C[0] * A[1]) &&
         B.filter(s => s.f(A) === X && s.f(C) === Y).length === 1;
  }
  const X = bel.f(A), Y = bel.f(C);
  const key = bel.say(nm);
  const opts = [key].concat(B.filter(s => s !== bel).map(s => s.say(nm)));
  const order = opts.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { q: nm + ' says ' + FR(A[0], A[1]) + ' is greater than ' + FR(C[0], C[1]) + '. She worked out ' + X +
             ' for ' + FR(A[0], A[1]) + ' and ' + Y + ' for ' + FR(C[0], C[1]) +
             ', and took the larger of those two numbers to mean the larger fraction. What did she do wrong?',
           extra: '', choices: order.map(i => opts[i]), correct: order.indexOf(0), answerText: key };
};
control('RULE 13 glyph - the v6 gCompareError row (numeral identity + digit count, no arithmetic)', () =>
  glyphVerdict(glyphBank(V6_CE, GLY_N)));

/* 14. RULE 11's SHAPE CLAUSE: v6's gAddSame row. 677 distinct rows and EIGHTEEN
       masked shapes, each of which named the key's slot on 100% of draws - the
       exemption the row count granted and the shape count refuses. Rebuilt from
       the v6 candidate bank (before this pass widened it). */
const V6_ADDSAME = () => {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  let d = 9, a = 4, b = 3, key = [7, 9], slips = [];
  for (let t = 0; t < 200; t++) {
    d = rnd(4, 12); a = rnd(1, d - 2); b = rnd(1, d - a - 1);
    if (a === b || a + b + 1 >= d) continue;
    key = [a + b, d];
    const cands = [[Math.abs(a - b), d], [a + b + 1, d], [a + b - 1, d],
                   (a + b < d - 1 ? [a + b, d - 1] : null), (d + 1 <= 12 ? [a + b, d + 1] : null),
                   [a + b + 1, d + 1], [a, d], [b, d],
                   (d + 1 <= 12 ? [Math.abs(a - b), d + 1] : null)]
      .filter(Boolean).filter(p => p[0] >= 1 && p[1] >= 2 && p[0] < p[1] && p[1] <= 12 &&
                                   p[0] * key[1] !== key[0] * p[1]);
    const u = rnd(0, 3);
    /* sided()'s own ordering, which is the mechanism: candidates written over a
       SMALLER bottom number than the key's are seated first, so an all-one-bottom
       row can only ever be an all-below seating - which is what pins the key to
       the biggest top on 100% of those draws. */
    const small = arr => arr.filter(c => c[1] < key[1]).concat(arr.filter(c => c[1] >= key[1]));
    const above = small(cands.filter(c => c[0] * key[1] > key[0] * c[1]).sort(() => Math.random() - 0.5));
    const below = small(cands.filter(c => c[0] * key[1] < key[0] * c[1]).sort(() => Math.random() - 0.5));
    if (u > above.length || 3 - u > below.length) continue;
    slips = above.slice(0, u).concat(below.slice(0, 3 - u));
    const vals = new Set([key[0] / key[1]].concat(slips.map(s => s[0] / s[1])));
    if (vals.size === 4) break;
    slips = [];
  }
  if (slips.length !== 3) { key = [7, 9]; slips = [[1, 9], [8, 9], [7, 8]]; }
  const row = [key].concat(slips);
  const order = row.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { q: FR(a, d) + ' + ' + FR(b, d) + ' = ?', extra: '',
           choices: order.map(i => FR(row[i][0], row[i][1])), correct: order.indexOf(0),
           answerText: FR(key[0], key[1]) };
};
control('RULE 11 shape clause - the v6 gAddSame row (677 rows, 18 shapes, key slot 100%)', () => {
  const row = rowBank(V6_ADDSAME, ROW_N);
  if (!row.n) return null;
  if (row.rows < ROW_MEMO) return 'the control has fewer than ' + ROW_MEMO + ' rows, so the ROW clause catches it and the shape clause is not what is being measured';
  if (process.env.CTL_DEBUG) console.log(`    [debug] v6 gAddSame control: ${row.rows} rows, ${row.shapes} shapes, shape names the key's slot on ${(100 * row.sRate).toFixed(2)}%`);
  return rowVerdict(row);
});

/* 15. THE PROSE AGREEMENT CLAUSE: the v6 gEquivFromBar sentence, with its
       hard-coded plural verb. */
control('prose agreement - the v6 gEquivFromBar sentence ("1 of them are blue")', () => {
  const text = 'The bar below is cut into 5 equal parts, and 1 of them are blue. Which fraction is equivalent to the blue fraction?';
  for (const [re, lab] of AGREE_BAD) if (re.test(text)) return 'prose agreement: ' + lab + ' caught';
  return null;
});

/* ---------- NEGATIVE CONTROLS for the SEVENTH pass's three new gates ---------
   SWEEP FRACTIONS REFUTATION, SEVENTH PASS 2026-09-16. Each rebuilds the ACTUAL v7
   defect from its own construction, so nothing here depends on the topic file
   still carrying it. --- */

/* 16. THE SIGN GATE: v7's gSubRelated teaching card, rebuilt from its own draw.
       `b` runs to D-1 and `a` stops at d-1, so a - b is negative on half of all
       draws and zero on a seventh, and fr(a-b, D-d) printed it. The gate must
       reject the card; the SIGN of the numerator is the whole finding, and every
       other reader in this file used to return null on that markup. */
const V7_SUBREL = () => {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pk = arr => arr[Math.floor(Math.random() * arr.length)];
  let d = 4, k = 2, D = 8, a = 3, b = 1;
  for (let t = 0; t < 200; t++) {
    d = pk([2, 3, 4, 5, 6]); k = pk([2, 3, 4, 5, 6]); D = k * d;
    a = rnd(2, Math.max(2, d - 1)); b = rnd(1, Math.max(1, D - 1));
    if (D <= 12 && a < d && k * a - b >= 2 && k * a - b + 1 < D && gcd(k * a - b, D) === 1) break;
  }
  const key = [k * a - b, D];
  const row = [key, [a, d], [k * a, D], [k * a - b, D - 1]];
  const order = row.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { q: FR(a, d) + ' − ' + FR(b, D) + ' = ?', extra: '',
           choices: order.map(i => FR(row[i][0], row[i][1])), correct: order.indexOf(0),
           answerText: FR(key[0], key[1]),
           explain: 'Now take the pieces away: ' + (k * a) + ' − ' + b + ' = ' + (k * a - b) + ', giving ' +
             FR(k * a - b, D) + '. Subtracting the tops and the bottoms straight off would give ' +
             FR(a - b, D - d) + ', which is a different amount altogether.' };
};
control('sign gate - the v7 gSubRelated card (fr(a-b, D-d), negative on half of all draws)', () => {
  let bad = 0, n = 0, sample = null;
  for (let i = 0; i < CTL_N; i++) {
    const q = V7_SUBREL();
    n++;
    const v = signScan(q);
    if (v) { bad++; if (!sample) sample = v; }
  }
  if (!n) return null;
  if (!bad) return null;
  return `caught on ${bad} of ${n} draws - ${sample}`;
});

/* 17. RULE 14, THE HALF-KEY RULE: v7's gPicTakeAway, rebuilt from its own draw and
       its own candidate bank, including sided()'s seating and the sameDen() seat -
       which is the part that makes the route work, because the seat GUARANTEES the
       key's bottom number is printed twice. The stem prints `a` and `g`, so
       "n0-n1" names the key's top number on 100% of draws, and taking the options
       that carry it answers the item at ~80% with the ties guessed. */
const V7_TAKEAWAY = () => {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const sh = arr => arr.slice().sort(() => Math.random() - 0.5);
  const val = p => p[0] / p[1];
  const rank = rnd(1, 4);
  let d = 8, a = 5, g2 = 2, key = [3, 8], slips = [[5, 8], [2, 8], [3, 7]];
  for (let t = 0; t < 200; t++) {
    d = rnd(6, 12); a = rnd(3, d - 2); g2 = rnd(1, Math.min(2, a - 1));
    key = [a - g2, d];
    const cands = [[a, d], [g2, d], [d - a, d], [d - a + g2, d], [a - g2 + 1, d], [a - g2 - 1, d],
                   [a - g2, d - 1], [a - g2, d + 1], [a - g2, d - 2], [a - g2, d + 2],
                   [a - g2 + 1, d - 1], [a - g2 - 1, d + 1], [a, d - 1], [g2, d + 1]]
      .filter(p => p[0] >= 1 && p[1] >= 2 && p[0] < p[1] && p[1] <= 12 && val(p) !== val(key));
    /* the coupling seat: one or two options over the bar's own part count */
    const same = sh(cands.filter(c => c[1] === d));
    if (!same.length) continue;
    const must = same.slice(0, same.length > 1 && Math.random() < 0.5 ? 2 : 1);
    const rest = sh(cands.filter(c => !must.some(x => val(x) === val(c))));
    const u = 4 - rank, hi = must.filter(c => val(c) > val(key)).length;
    const above = rest.filter(c => val(c) > val(key)), below = rest.filter(c => val(c) < val(key));
    const na = u - hi, nb = (3 - u) - (must.length - hi);
    if (na < 0 || nb < 0 || na > above.length || nb > below.length) continue;
    slips = must.concat(above.slice(0, na)).concat(below.slice(0, nb));
    if (new Set([key].concat(slips).map(val)).size === 4) break;
    slips = [];
  }
  if (slips.length !== 3) { key = [3, 8]; slips = [[5, 8], [2, 8], [3, 7]]; a = 5; g2 = 2; d = 8; }
  const row = [key].concat(slips);
  const order = row.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { q: 'The bar below shows a cake cut into equal pieces, and Siti\'s ' + a +
             ' pieces are blue. She eats ' + g2 + ' of her pieces. What fraction of the cake is still Siti\'s?',
           extra: '', figure: { type: 'fractionBar', parts: d, filled: a },
           choices: order.map(i => FR(row[i][0], row[i][1])), correct: order.indexOf(0),
           answerText: FR(key[0], key[1]), explain: '' };
};
control('RULE 14 half-key - the v7 gPicTakeAway stem ("a - g" names the top, the row settles the bottom)', () => {
  const row = halfBank(V7_TAKEAWAY, HALF_N);
  if (!row.n) return null;
  if (process.env.CTL_DEBUG) console.log(`    [debug] v7 gPicTakeAway control: "${row.expr}" names the ${row.half} on ${(100 * row.names).toFixed(2)}%, route ${(100 * row.rate).toFixed(2)}%`);
  return halfVerdict(row, 'control.v7PicTakeAway');
});

/* 18. RULE 14's METHOD EXEMPTION IS KEYED TO THE EXPRESSION, NOT TO THE BANK. The
       same construction, handed an exemption for a DIFFERENT expression, must
       still go red - otherwise a bank on the list could move its tell to a new
       expression and keep its pass. */
control('RULE 14 exemption keyed to the expression - the v7 row exempted on the WRONG expression', () => {
  const row = halfBank(V7_TAKEAWAY, HALF_N);
  if (!row.n) return null;
  const name = 'control.v7PicTakeAway';
  const other = row.expr === 'n0+n1' ? 'n0*n1' : 'n0+n1';
  HALF_METHOD[name + '|' + other] = 'a method this item does not have';
  const v = halfVerdict(row, name);
  delete HALF_METHOD[name + '|' + other];
  return v;
});

/* 19. ... and the other direction, which is what stops RULE 14 from being a rule
       against arithmetic itself: the v6 gAddSame row, where "n0+n2" names the key's
       top number because ADDING THE TOP NUMBERS IS THE ITEM. Over the ceiling
       without the exemption, quiet with it. A control that only ever goes red
       cannot show that a gate discriminates. */
const V8_ADDLIKE = () => {
  const rnd = (x, y) => x + Math.floor(Math.random() * (y - x + 1));
  const sh = arr => arr.slice().sort(() => Math.random() - 0.5);
  const val = p => p[0] / p[1];
  const rank = rnd(1, 4);
  let d = 9, a = 4, b = 3, key = [7, 9], slips = [];
  for (let t = 0; t < 200; t++) {
    d = rnd(5, 12); a = rnd(1, d - 2); b = rnd(1, d - a - 1);
    if (a === b || a + b + 1 >= d) continue;
    key = [a + b, d];
    const cands = [[Math.abs(a - b), d], [a + b + 1, d], [a + b - 1, d], [a + b, d - 1], [a + b, d + 1],
                   [a + b + 1, d + 1], [a, d], [b, d], [Math.abs(a - b), d + 1],
                   [a + b, d - 2], [a + b, d + 2], [a + b + 1, d - 1], [a + b - 1, d + 1],
                   [a, d - 1], [b, d + 1]]
      .filter(p => p[0] >= 1 && p[1] >= 2 && p[0] < p[1] && p[1] <= 12 && val(p) !== val(key));
    const same = sh(cands.filter(c => c[1] === d));
    if (!same.length) continue;
    const must = same.slice(0, same.length > 1 && Math.random() < 0.5 ? 2 : 1);
    const rest = sh(cands.filter(c => !must.some(x => val(x) === val(c))));
    const u = 4 - rank, hi = must.filter(c => val(c) > val(key)).length;
    const above = rest.filter(c => val(c) > val(key)), below = rest.filter(c => val(c) < val(key));
    const na = u - hi, nb = (3 - u) - (must.length - hi);
    if (na < 0 || nb < 0 || na > above.length || nb > below.length) continue;
    slips = must.concat(above.slice(0, na)).concat(below.slice(0, nb));
    if (new Set([key].concat(slips).map(val)).size === 4) break;
    slips = [];
  }
  if (slips.length !== 3) { key = [7, 9]; slips = [[1, 9], [8, 9], [7, 8]]; a = 4; b = 3; d = 9; }
  const row = [key].concat(slips);
  const order = row.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { q: FR(a, d) + ' + ' + FR(b, d) + ' = ?', extra: '',
           choices: order.map(i => FR(row[i][0], row[i][1])), correct: order.indexOf(0),
           answerText: FR(key[0], key[1]), explain: '' };
};
control('RULE 14 method exemption - the gAddSame row (n0+n2 IS adding like fractions)', () => {
  const row = halfBank(V8_ADDLIKE, HALF_N);
  if (!row.n) return null;
  if (row.rate < HALF_CAP)
    return `the control measures ${(100 * row.rate).toFixed(1)}%, under the ${Math.round(100 * HALF_CAP)}% ceiling - it is not exercising the exemption at all`;
  const bare = halfVerdict(row, 'control.addSameNoMethod');
  if (!bare) return 'the rule stayed quiet on the row WITHOUT any exemption - the control is not measuring what it claims';
  const exempt = halfVerdict(row, 'fractions.gAddSame');
  return exempt ? null
    : `caught at ${(100 * row.rate).toFixed(1)}% on "${row.expr}" and exempted by its mathematics: ${halfMethodOf(row, 'fractions.gAddSame')}`;
});

/* 19b. THE EXEMPTION MUST READ THE ARITHMETIC, NOT THE SPELLING - the eighth
        pass's lesson applied to the exemption list itself. The same adding-like-
        fractions row, with the ONE spelling the list declares deleted and only a
        two-operation spelling of the SAME arithmetic left, must still be exempt.
        Keyed to a string it would go red on an honest bank the moment the widened
        library found a second way to write "add the two top numbers". */
control('RULE 14 exemption reads the arithmetic, not the spelling - "(n2)+n0" is "n0+n2"', () => {
  const name = 'control.addSameSpelling', spelling = '(n2)+n0';
  HALF_METHOD[name + '|' + spelling] = 'add the two top numbers and keep the bottom number';
  HALF_METHOD_EXPRS.push(spelling);
  const row = halfBank(V8_ADDLIKE, HALF_N);
  const v = halfVerdict(row, name);
  delete HALF_METHOD[name + '|' + spelling];
  HALF_METHOD_EXPRS.pop();
  if (!row.n) return null;
  if (row.rate < HALF_CAP) return `the control measures ${(100 * row.rate).toFixed(1)}%, under the ceiling - it is not exercising the exemption at all`;
  if (row.expr === spelling) return `the ruler learnt the declared spelling itself, so this control proves nothing`;
  return v ? null
    : `"${row.expr}" recognised as the declared "${spelling}" by its value and exempted at ${(100 * row.rate).toFixed(1)}%`;
});

/* 19c. RULE 14 READS TWO OPERATIONS, and this is the row that proves the widening
        rather than asserting it: v8's gSimplest, rebuilt from its own base table,
        its own factor draw and its own candidate bank. `pick(SCALABLE)` then
        `pick(scalesFor(d))` puts the common factor at 2 on ~71% of draws, so
        "halve the bottom number the stem prints" names the key's bottom number on
        ~72% and settles the row at ~66%. The v8 ONE-operation library is run over
        the SAME construction in the same control and must stay under the ceiling:
        if it did not, the widening would not be what catches this. */
const V8_SIMPLEST = () => {
  const rnd = (x, y) => x + Math.floor(Math.random() * (y - x + 1));
  const sh = arr => arr.slice().sort(() => Math.random() - 0.5);
  const val = p => p[0] / p[1];
  const ok = p => Array.isArray(p) && p[0] >= 1 && p[1] >= 2 && p[0] < p[1] && p[1] <= 12;
  const BASE = [];
  for (let d0 = 2; d0 <= 6; d0++) for (let n0 = 1; n0 < d0; n0++) if (gcd(n0, d0) === 1) BASE.push([n0, d0]);
  let n = 2, d = 3, N = 4, D = 6, key = [2, 3], slips = [];
  for (let tr = 0; tr < 200; tr++) {
    const b = BASE[rnd(0, BASE.length - 1)];
    n = b[0]; d = b[1];
    const ks = []; for (let z = 2; z <= 6; z++) if (z * d <= 12) ks.push(z);
    const k = ks[rnd(0, ks.length - 1)], t = n >= 2 ? k : 1;
    N = k * n; D = k * d; key = [n, d];
    const cands = [[N - t, D - t], [N + t, D + t], [N + 1, D], [N + t, D], [N + 2, D], [n, D], [N - t, D],
                   [n + 1, d], [n - 1, d], [n, d - 1], [n - 1, d - 1], [n + 1, d - 1], [n, d - 2],
                   [n + 1, d + 1], [n, d + 1]]
      .filter(p => ok(p) && val(p) !== val(key));
    /* sided()'s uniq(): two candidates of equal value collapse to the one written
       in the bigger pieces */
    const u = [];
    for (const c of sh(cands)) {
      const i = u.findIndex(z => val(z) === val(c));
      if (i < 0) u.push(c); else if (c[1] < u[i][1]) u[i] = c;
    }
    /* sided()'s small(): a candidate written over a bottom number UNDER the key's
       is taken first, which is the seat that breaks "pick the smallest bottom
       number" - and, on this bank, the seat that leaves the key's OWN bottom
       number alone on the row */
    const small = arr => arr.filter(c => c[1] < key[1]).concat(arr.filter(c => c[1] >= key[1]));
    const above = small(sh(u.filter(c => val(c) > val(key)))), below = small(sh(u.filter(c => val(c) < val(key))));
    const us = []; for (let z = 0; z <= 3; z++) if (z <= above.length && 3 - z <= below.length) us.push(z);
    if (!us.length) continue;
    const uu = us[rnd(0, us.length - 1)];
    slips = above.slice(0, uu).concat(below.slice(0, 3 - uu));
    if (slips.every(c => c[1] > key[1])) {
      const pool = above.concat(below).filter(c => c[1] < key[1]);
      for (let i = slips.length - 1; i >= 0; i--) {
        const up = val(slips[i]) > val(key);
        const alt = pool.find(c => (val(c) > val(key)) === up && !slips.some(z => val(z) === val(c)));
        if (alt) { slips[i] = alt; break; }
      }
    }
    if (new Set([key].concat(slips).map(val)).size === 4) break;
    slips = [];
  }
  if (slips.length !== 3) { n = 2; d = 3; N = 4; D = 6; key = [2, 3]; slips = [[2, 4], [2, 6], [1, 3]]; }
  const row = [key].concat(slips);
  const order = row.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { q: 'Express ' + FR(N, D) + ' in its <b>simplest form</b>.', extra: '',
           choices: order.map(i => FR(row[i][0], row[i][1])), correct: order.indexOf(0),
           answerText: FR(key[0], key[1]), explain: '' };
};
control('RULE 14 two operations - the v8 gSimplest row ("(n1)/2" halves the printed bottom number)', () => {
  const two = halfBank(V8_SIMPLEST, HALF_N);
  if (!two.n) return null;
  const v = halfVerdict(two, 'control.v8Simplest');
  if (process.env.CTL_DEBUG) console.log(`    [debug] v8 gSimplest control: two-op "${two.expr}" names the ${two.half} on ${(100 * two.names).toFixed(2)}%, route ${(100 * two.rate).toFixed(2)}%`);
  if (!v) return null;
  const one = halfBank(V8_SIMPLEST, HALF_N, halfWalk1);
  if (one.n && halfVerdict(one, 'control.v8Simplest'))
    return null;   /* the v8 library caught it too, so this is not a two-operation control */
  return `${v} - and the v8 ONE-operation library learnt "${one.expr}" at ${(100 * one.rate).toFixed(1)}%, under the ceiling, which is how this route shipped`;
});

/* 20. THE CARD-ROW CLAUSE: v7's gSimplestError card, whose last sentence named
       fr(low) whether or not sided() had seated it - 25.5 / 25.7% of draws. */
control('card-row clause - the v7 gSimplestError card ("gives 1/5", 1/5 not on the row)', () => {
  const q = {
    q: 'Siti says ' + FR(4, 6) + ' in its simplest form is ' + FR(3, 5) + ', because she took 1 away from the top and 1 away from the bottom. What is ' + FR(4, 6) + ' in its simplest form?',
    extra: '', choices: [FR(2, 3), FR(3, 5), FR(2, 6), FR(5, 7)], correct: 0, answerText: FR(2, 3),
    explain: 'To simplify you DIVIDE both by the same number: 4 / 2 = 2 and 6 / 2 = 3, so ' + FR(4, 6) +
      ' = ' + FR(2, 3) + '. Carrying the same habit on to the answer - taking 1 off the top and the bottom of ' +
      FR(2, 3) + ' - gives ' + FR(1, 2) + ', which is a different amount again.'
  };
  return cardScan(q);
});

/* 21. THE CARD-ROW CLAUSE, EVERY OTHER SPELLING (eighth pass, KILL 2). Three cards
       that the v8 clause passed and a P3 child could not: one naming a lone half,
       one naming a fraction in words, one naming a bare number on a bank whose
       options are bare numbers. Each is the v8 card verbatim. */
control('card-row clause - the v8 gSimplest card ("leaving the bottom number at 10")', () => cardScan({
  q: 'Express ' + FR(8, 10) + ' in its <b>simplest form</b>.', extra: '',
  choices: [FR(4, 5), FR(5, 6), FR(3, 4), FR(3, 5)], correct: 0, answerText: FR(4, 5),
  explain: 'Simplest form means dividing the top and the bottom by the same number until you cannot go ' +
    'any further. 8 ÷ 2 = 4 and 10 ÷ 2 = 5, so ' + FR(8, 10) + ' = ' + FR(4, 5) + '. It is the same ' +
    'amount, written with bigger parts. Dividing only the top and leaving the bottom number at 10 would ' +
    'make the pieces smaller as well as fewer, which is a different amount.'
}));
control('card-row clause - the v8 gMakeOneIn card ("the old top number 1 over the new bottom number 6")', () => cardScan({
  q: FR(1, 2) + ' + ? = 1 &nbsp; What is the missing fraction, written in 6ths?', extra: '',
  choices: [FR(3, 6), FR(2, 6), FR(4, 6), FR(5, 6)], correct: 0, answerText: FR(3, 6),
  explain: 'Step 1: one whole is ' + FR(2, 2) + ', so what is missing is 2 − 1 = 1 of the big pieces, ' +
    'which is ' + FR(1, 2) + '. Step 2: write that in 6ths. 2 × 3 = 6, so each big piece is 3 small ' +
    'ones: 1 × 3 = 3, giving ' + FR(3, 6) + '. Keeping the old top number 1 over the new bottom number ' +
    '6 would be too small: each big piece became 3 small ones, so the top number has to grow as well.'
}));
control('card-row clause - the v8 gEqMissingDen card ("would give 16", a bare-number bank)', () => cardScan({
  q: FR(3, 4) + ' = ' + FR(9, '?') + ' &nbsp; What is the missing <b>denominator</b>?', extra: '',
  choices: ['12', '10', '7', '4'], correct: 0, answerText: '12',
  explain: 'The top number was multiplied by 3 (3 × 3 = 9), so the bottom number must be multiplied by ' +
    '3 too: 4 × 3 = 12. Leaving the bottom at 4 would make the fraction 3 times bigger, and multiplying ' +
    'it by 4 would give 16, which is too small an amount.'
}));

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
/* RULE 7, printed in full: the table IS the finding, so it is on the record of
   every run and not only when it goes red. */
if (rankRows.length) {
  console.log(`\nRULE 7  VALUE RANK OF THE KEY  (${RANK_DRAWS} draws each; cap ${(100*RANK_CAP).toFixed(0)}% and floor ` +
    `${(100*RANK_FLOOR).toFixed(0)}% per rank, ${(100*RANK_POLICY_CAP).toFixed(0)}% for smallest / 2nd smallest / ` +
    `2nd largest / largest / smallest bottom number)\n`);
  console.log(pad('GENERATOR', 26) + pad('SMALLEST', 10) + pad('2nd', 10) + pad('3rd', 10) + pad('LARGEST', 10) + pad('SMALL-DEN', 11) + 'RESULT');
  console.log('-'.repeat(84));
  for (const r of rankRows) {
    console.log(pad(r.name, 26) + r.rate.map(x => pad((100 * x).toFixed(1) + '%', 10)).join('') +
      pad((100 * r.den).toFixed(1) + '%', 11) +
      (r.err ? 'FAIL  ' + r.err : (r.exempt ? 'exempt (the stem prints the extreme it wants)' : 'pass')));
  }
}

/* RULE 6 + RULE 8, printed in full for the same reason (THIRD PASS 2026-09-16). */
if (proseRows.length) {
  console.log(`\nRULE 6 + RULE 8  PROSE BANKS  (key uniquely shortest OR longest under ${(100*LENGTH_TELL_CAP).toFixed(0)}%; ` +
    `a STEM word carried by the key alone under ${(100*STEM_ECHO_CAP).toFixed(0)}%)\n`);
  console.log(pad('GENERATOR', 26) + pad('DRAWS', 8) + pad('uLONGEST', 11) + pad('uSHORTEST', 12) + pad('STEM-ECHO', 12) + 'RESULT');
  console.log('-'.repeat(84));
  for (const r of proseRows) {
    const row = rows.find(x => x.topic + '.' + x.name === r.name);
    console.log(pad(r.name, 26) + pad(r.n, 8) + pad((100 * r.uLong).toFixed(1) + '%', 11) +
      pad((100 * r.uShort).toFixed(1) + '%', 12) +
      pad(r.solo === null ? 'n/a' : (100 * r.solo).toFixed(1) + '%', 12) +
      (row && row.err ? 'FAIL  ' + row.err
        : (r.exempt ? 'exempt (declared: a fixed 4-sentence set outside this lane)'
          : (r.solo === null ? 'pass (RULE 6 only - RULE 8 is scoped to fractions)' : 'pass'))));
  }
}

/* RULE 9, printed in full: the table IS the finding, and the second column is the
   one three passes of this generator's history did not have (FOURTH PASS). */
if (tokRows.length) {
  console.log(`\nRULE 9  TOKEN RULER  (${TOK_N} draws per prose bank, raw and stemmed: no token or two-word ` +
    `phrase in the key alone - or in all three distractors alone - on >= ${Math.round(100*TOK_CAP)}% of draws)\n`);
  console.log(pad('GENERATOR', 26) + pad('DRAWS', 8) + pad('KEY-ONLY', 22) + pad('RATE', 9) + pad('ALL-WRONG', 20) + pad('RATE', 9) + pad('NO-PRIVATE', 12) + 'RESULT');
  console.log('-'.repeat(122));
  for (const r of tokRows) {
    const k = tokTop(r.keyOnly), w = tokTop(r.wrongOnly);
    console.log(pad(r.name, 26) + pad(r.n, 8) +
      pad('"' + k[0] + '"', 22) + pad((100 * k[1] / r.n).toFixed(1) + '%', 9) +
      pad('"' + w[0] + '"', 20) + pad((100 * w[1] / r.n).toFixed(1) + '%', 9) +
      pad((100 * (r.noPrivate || 0) / r.n).toFixed(1) + '%', 12) +
      (r.err ? 'FAIL  ' + r.err : 'pass'));
  }
  console.log('');
  console.log('     a leading ~ marks the stemmed pass (a trailing s / es / ed / ing removed), where "counts" and "count" are one word.');
  console.log('     NO-PRIVATE is the complement clause: the draws on which the KEY is the unique option with no word of its own.');
  if (tokRows.every(r => !r.err)) console.log(`ok   RULE 9 token ruler: ${tokRows.length} prose banks, no key-only and no all-distractor word or phrase, and no key without a word of its own, at or over ${Math.round(100*TOK_CAP)}% of draws`);
}

/* RULE 10, printed in full (FOURTH PASS 2026-09-16, W1). */
if (picRows.length) {
  console.log(`\nRULE 10  PICTURE RULER  (${PIC_N} draws per figure bank: the best option-row-only policy, ` +
    `taken per stem shape, under ${Math.round(100*PIC_CAP)}%; watch line ${Math.round(100*PIC_WATCH)}%, chance 25%)\n`);
  console.log(pad('GENERATOR', 26) + pad('DRAWS', 8) + pad('SHAPES', 8) + pad('BEST BLIND POLICY', 34) + pad('RATE', 9) + 'RESULT');
  console.log('-'.repeat(110));
  for (const r of picRows)
    console.log(pad(r.name, 26) + pad(r.n, 8) + pad(r.shapes, 8) + pad(r.best, 34) +
      pad((100 * r.rate).toFixed(1) + '%', 9) + (r.err ? 'FAIL  ' + r.err
        : (r.rate >= PIC_WATCH ? 'pass - over the ' + Math.round(100*PIC_WATCH) + '% watch line, declared residual' : 'pass')));
  console.log('');
  console.log('     the watch line is not a failure: the three banks that read a fraction OFF a picture share a bottom number across');
  console.log('     three of their four options by construction, which is worth a third of a row to nobody who has done the mathematics.');
  if (picRows.every(r => !r.err)) console.log(`ok   RULE 10 picture ruler: ${picRows.length} figure banks, no option-row-only policy at or over ${Math.round(100*PIC_CAP)}% - every picture in the topic is load-bearing`);
}

/* RULE 11, printed in full: the row space IS the finding, and the next lane
   inherits a number rather than a discovery (FIFTH PASS 2026-09-16). */
if (rowRows.length) {
  console.log(`\nRULE 11  ROW-ONLY RULE + THE SHAPE CLAUSE  (${ROW_N} draws learnt + ${ROW_N} tested. The option row alone, ` +
    `stem discarded,\n         may not name the key on >= ${Math.round(100*ROW_CAP)}% over < ${ROW_MEMO} distinct rows; ` +
    `and its MASKED SHAPE may not name the key's slot on ${Math.round(100*SHAPE_CAP)}% over < ${SHAPE_MEMO} shapes)\n`);
  console.log(pad('GENERATOR', 26) + pad('DRAWS', 7) + pad('ROWS', 8) + pad('ROW>KEY', 10) +
    pad('SHAPES', 8) + pad('SHAPE>SLOT', 12) + 'RESULT');
  console.log('-'.repeat(118));
  for (const r of rowRows)
    console.log(pad(r.name, 26) + pad(r.n, 7) + pad(r.rows, 8) + pad((100 * r.rate).toFixed(1) + '%', 10) +
      pad(r.shapes, 8) + pad((100 * r.sRate).toFixed(1) + '%', 12) +
      (r.err ? 'FAIL  ' + r.err
        : (r.sRate >= SHAPE_WATCH ? 'pass - over the ' + Math.round(100*SHAPE_WATCH) + '% shape watch line, declared residual'
          : (r.rows < ROW_MEMO ? 'pass - memorisable row space, and the row settles nothing' : 'pass'))));
  console.log('');
  console.log('     a high ROW rate over a LARGE row space is not a tell: a row of four particular fractions belongs to one question,');
  console.log('     which is what it means for the options to be drawn from the mathematics. The gate is the conjunction of both columns.');
  console.log('     the SHAPE watch line is the row-shape class (sixth pass, wound 1): ordering four bottom numbers by sight is');
  console.log('     whole-number work standing in for fraction work, so it is declared with its numbers, and only a sight rule that is');
  console.log('     NEVER WRONG over a memorisable shape space is failed. Every bank listed over 40% is carried in the lane note.');
  if (rowRows.every(r => !r.err)) console.log(`ok   RULE 11 row-only rule: ${rowRows.length} banks, no memorisable option row that names its own key at or over ${Math.round(100*ROW_CAP)}%, and no masked row shape that names the key's slot every time`);
}

/* RULE 12, printed in full: the recall clause is a declared residual for six banks
   and the number is the deliverable (SIXTH PASS 2026-09-16). */
if (stemRows.length) {
  console.log(`\nRULE 12  STEM-ONLY RULE  (${STEM_N} draws learnt + ${STEM_N} tested, option row and figure discarded.\n` +
    `         (a) a ${STEM_ROWS}-row table over the stem's numerals, and (b) one arithmetic expression over them.\n` +
    `         GATED on banks that draw a PICTURE at ${Math.round(100*STEM_CAP)}%; measured and declared on every other)\n`);
  console.log(pad('GENERATOR', 26) + pad('DRAWS', 7) + pad('STEM SIGS', 11) + pad('TABLE', 9) +
    pad('ARITHMETIC', 12) + pad('BEST EXPR', 14) + pad('FIG', 5) + 'RESULT');
  console.log('-'.repeat(122));
  for (const r of stemRows)
    console.log(pad(r.name, 26) + pad(r.n, 7) + pad(r.sigs, 11) + pad((100 * r.rate).toFixed(1) + '%', 9) +
      pad((100 * r.arith).toFixed(1) + '%', 12) + pad(r.expr, 14) + pad(r.fig ? 'yes' : '-', 5) +
      (r.err ? 'FAIL  ' + r.err
        : (r.rate >= STEM_CAP ? 'pass - over the table line, the STEM-SPACE residual, declared'
          : (r.arith >= STEM_CAP ? 'pass - the stem IS the whole question here; no picture is claimed' : 'pass'))));
  console.log('');
  console.log('     an arithmetic expression over the stem naming the key is the item WORKING for a bank with no picture -');
  console.log('     "add the two tops, keep the bottom" is the whole of gAddSame. The gate is therefore the FIGURE clause:');
  console.log('     a bank that draws a picture may not be answered from its words alone. The table column over 60% is the');
  console.log('     small-stem-space class the first refutation named (7 to 36 distinct stems), declared in the lane note.');
  if (stemRows.every(r => !r.err)) console.log(`ok   RULE 12 stem-only rule: ${stemRows.filter(r => r.fig).length} picture banks, none answerable from the numerals of its stem alone at or over ${Math.round(100*STEM_CAP)}%`);
}

/* RULE 13, printed in full (SIXTH PASS 2026-09-16). */
if (glyRows.length) {
  console.log(`\nRULE 13  GLYPH RULE  (${GLY_N} draws learnt + ${GLY_N} tested: numeral identity, numeral membership and digit\n` +
    `         count across the rendered stem and row, no arithmetic anywhere - may not SETTLE the key on >= ${Math.round(100*GLY_CAP)}%)\n`);
  console.log(pad('GENERATOR', 26) + pad('DRAWS', 8) + pad('STEM SIGS', 12) + pad('SETTLES ON KEY', 17) + 'RESULT');
  console.log('-'.repeat(110));
  for (const r of glyRows)
    console.log(pad(r.name, 26) + pad(r.n, 8) + pad(r.sigs, 12) + pad((100 * r.rate).toFixed(1) + '%', 17) +
      (r.err ? 'FAIL  ' + r.err : 'pass'));
  console.log('');
  console.log('     a rule that leaves two options standing does not settle anything, so ties are not counted: this column is the');
  console.log('     draws on which the glyphs name exactly one option and that option is the key. A bank of four fractions cannot');
  console.log('     reach far past chance here unless one option is the unique one carrying the stem\'s own numerals.');
  if (glyRows.every(r => !r.err)) console.log(`ok   RULE 13 glyph rule: ${glyRows.length} banks, no key settled by numeral identity, membership and digit count at or over ${Math.round(100*GLY_CAP)}%`);
}

/* RULE 14, printed in full: the exemption list IS the claim, so it is on the
   record of every run (SEVENTH PASS 2026-09-16). */
if (halfRows.length) {
  console.log(`\nRULE 14  HALF-KEY RULE  (${HALF_N} draws learnt + ${HALF_N} tested: one expression over the stem's numerals\n` +
    `         names HALF the key and the option row settles the rest - may not answer the item on >= ${Math.round(100*HALF_CAP)}%,\n` +
    `         unless that expression IS the item's own declared mathematics, named in the table below)\n`);
  console.log(pad('GENERATOR', 26) + pad('DRAWS', 8) + pad('EXPRESSION', 12) + pad('HALF', 13) +
    pad('NAMES IT', 10) + pad('ANSWERS', 10) + 'RESULT');
  console.log('-'.repeat(122));
  for (const r of halfRows)
    console.log(pad(r.name, 26) + pad(r.n, 8) + pad(r.expr, 12) + pad(r.half, 13) +
      pad((100 * r.names).toFixed(1) + '%', 10) + pad((100 * r.rate).toFixed(1) + '%', 10) +
      (r.err ? 'FAIL  ' + r.err
        : (r.rate >= HALF_CAP ? 'pass - THE ITEM WORKING: ' + r.method : 'pass')));
  console.log('');
  console.log('     the exemption is keyed to the (bank, expression) PAIR and every line of it is a claim about the syllabus:');
  console.log('     "add the two tops and keep the bottom" names gAddSame\'s key on every draw because that IS adding like');
  console.log('     fractions. A bank on the list whose tell moves to another expression still fails - control 18 proves it.');
  if (halfRows.every(r => !r.err)) console.log(`ok   RULE 14 half-key rule: ${halfRows.length} banks, no half of a key named by a ONE- or TWO-operation expression over the stem's numerals that the row then settles at or over ${Math.round(100*HALF_CAP)}%, outside the ${Object.keys(HALF_METHOD).length} declared methods (matched by value, in any spelling)`);
}

/* THE CARD-ROW CLAUSE and THE SIGN GATE, printed when they have something to say
   (SEVENTH PASS 2026-09-16). */
if (cardRows.length) {
  const bad = cardRows.filter(r => r.err);
  console.log('');
  if (bad.length) for (const r of bad) console.log(`FAIL card-row  ${r.name}  ${r.err}`);
  else console.log(`ok   card-row clause: ${cardRows.length} banks x ${CARD_N} draws, every wrong answer a teaching card names - rendered, plain text, in words, one half of one, or a bare number on a bare-number bank - is printed on the option row or in the stem`);
}
if (signRows.length) {
  const bad = signRows.filter(r => r.err);
  console.log('');
  if (bad.length) for (const r of bad) console.log(`FAIL sign gate  ${r.name}  ${r.err}`);
  else console.log(`ok   sign gate: ${signRows.length} banks x ${SIGN_N} draws in every topic, no fraction with a numerator or a denominator below 1 and no unary minus on any surface, in any rendering`);
}

/* THE PROSE AGREEMENT CLAUSE, printed only when it has something to say. */
if (agreeRows.length) {
  const bad = agreeRows.filter(r => r.err);
  console.log('');
  if (bad.length) for (const r of bad) console.log(`FAIL prose agreement  ${r.name}  ${r.err}`);
  else console.log(`ok   prose agreement: ${agreeRows.length} banks x ${AGREE_N} draws, no numeral disagreeing with its verb in any stem, option or teaching card`);
}

/* The negative controls, on the record of every run (THIRD PASS 2026-09-16). */
if (controlRows.length) {
  console.log('\nNEGATIVE CONTROLS  (each rebuilds a v3 defect and must be REJECTED by the gate written for it)\n');
  for (const c of controlRows)
    console.log(`${c.ok ? 'ok   caught' : 'FAIL       '}  ${c.label}\n             ${c.note}`);
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
