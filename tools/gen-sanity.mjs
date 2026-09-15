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
  /* Same contract for WORD-ANSWER banks (p2 sweep refutation 2026-09-15, WOUND 2).
     q.authored cannot bind an item whose options are sentences, so a generator
     whose four options are all authored strings declares q.optionSet instead: the
     exact set it built, key included. Nothing outside that set may ship, the set
     may not contain a duplicate, and the key must be in it - which is what makes
     an arithmetic padding loop (the one gBondDiagnose and gDivCheckP2 used to
     fall through to) impossible to reintroduce in silence. */
  if (Array.isArray(q.optionSet)) {
    const declared = q.optionSet.map(strip);
    if (declared.length !== q.choices.length) {
      return `optionSet declares ${declared.length} options but ${q.choices.length} shipped`;
    }
    if (new Set(declared).size !== declared.length) return 'optionSet contains a duplicate option: ' + declared.join(' | ');
    const dset = new Set(declared);
    for (const p of plain) {
      if (!dset.has(p)) return 'undeclared option shipped ("' + p + '"); optionSet: ' + declared.join(' | ');
    }
    if (!dset.has(strip(q.answerText))) return 'the key is not one of the declared options: ' + declared.join(' | ');
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

  /* ===== SWEEP 2026-09-15 lane: p2 "Number Beach" format banks ===============
     One branch per new format in js/topics/p2-number-beach.js. Every key is
     re-derived from the RENDERED stem, never from the generator's answerText,
     and most branches also REFUTE THE ITEM'S OWN PREMISE the way the depth
     pilot's error-spotting oracles do: an error-spotting item whose "mistake" is
     actually correct, a skip count that does not step by the number it names, a
     near-ten strategy on a number that is not near a ten, a fact family with two
     true statements, an ordering item with two ordered lists, or a compare item
     that a single digit already settles, all fail here rather than shipping.

     THIS BLOCK SITS AT THE TOP OF THE MULTIPLE-CHOICE SECTION ON PURPOSE. Two of
     the p2 stems below carry words the loose branches further down would claim
     and then mis-derive: "Which list is in order from smallest to greatest?"
     matches the /greatest|smallest/ compare branch, which would read the first
     number of each list and fail a correct item. Specific above loose, per the
     P3 pilot rule. Every regex here is anchored at both ends. --- */
  {
    const opts = (q.choices || []).map(strip);
    const keyTxt = strip(q.answerText);
    const nums = s => (String(s).match(/\d+/g) || []).map(Number);
    /* the named P2 column-subtraction bug: take the smaller digit from the
       larger in every column instead of renaming. Re-implemented here so the
       oracle never borrows the topic file's own helper. */
    const sfl = (x, y) => {
      let out = 0, mul = 1;
      for (let i = 0; i < 4; i++) {
        out += Math.abs((Math.floor(x / mul) % 10) - (Math.floor(y / mul) % 10)) * mul;
        mul *= 10;
      }
      return out;
    };

    /* THE WORD-ANSWER DISTRACTOR CONTRACT, ASSERTED (refutation second pass
       2026-09-15, WOUND 1). q.optionSet was structurally incapable of failing:
       mcText builds the declaration out of the very array it ships, so "declared
       set === shipped set in 20,000 of 20,000 draws" only ever measured that
       mcText was called. checkShape still compares the declaration against the
       RENDERED options - that catches anything that mutates the option list after
       the generator built it - but the real contract is here: every word-answer
       bank's option set is REBUILT from the rendered stem, out of this file's own
       arithmetic, and compared against what shipped. Nine of the ten banks are
       fully determined by the stem and are checked by exact set equality; the two
       whose distractors are themselves drawn (gBondPair's near-miss pairs,
       gDivCheckP2's wrong quotients, gOrderP2's permutations) are checked against
       the named FORM, which is the strongest statement that is true of them. */
    const sameSet = (want, got) =>
      want.length === got.length &&
      want.slice().sort().join(' ‖ ') === got.slice().sort().join(' ‖ ');

    /* --- PRINCIPLE 1: number bonds --- */
    if ((m = text.match(/^Which pair of numbers makes (\d+)\?$/))) {
      const T = Number(m[1]);
      const hits = opts.filter(o => { const n = nums(o); return n.length === 2 && n[0] + n[1] === T; });
      if (hits.length !== 1) return `p2 bond pair: ${hits.length} of the four pairs make ${T} (${opts.join(' | ')})`;
      if (hits[0] !== keyTxt) return `p2 bond pair: key "${keyTxt}" but "${hits[0]}" is the pair that makes ${T}`;
      for (const o of opts) {
        if (o === keyTxt) continue;
        const p = o.match(/^(\d+) and (\d+)$/);
        if (!p) return `p2 bond pair: an option is not a pair of numbers ("${o}")`;
        const x = Number(p[1]), y = Number(p[2]), miss = y - (T - x);
        /* the three NAMED near misses: one ten too many, one ten too few, and the
           ones not quite meeting. Nothing else may ship as a distractor. */
        if (miss !== 10 && miss !== -10 && miss !== 1) {
          return `p2 bond pair: "${o}" is not one of the three named near misses (it is ${miss > 0 ? miss + ' over' : -miss + ' under'} ${T})`;
        }
      }
      return null;
    }
    if ((m = text.match(/^You know that (\d+) \+ (\d+) = (\d+)\. Which subtraction fact belongs to the same number bond\?$/))) {
      const b = Number(m[1]), a = Number(m[2]), T = Number(m[3]);
      if (b + a !== T) return `p2 bond family: the printed bond ${b} + ${a} does not make ${T}`;
      const hits = opts.filter(o => {
        const p = o.match(/^(\d+) − (\d+) = (\d+)$/);
        return p && Number(p[1]) - Number(p[2]) === Number(p[3]);
      });
      if (hits.length !== 1) return `p2 bond family: ${hits.length} of the four statements are true (${opts.join(' | ')})`;
      if (hits[0] !== keyTxt) return `p2 bond family: key "${keyTxt}" is not the true statement "${hits[0]}"`;
      const wantFam = [`${T} − ${b} = ${a}`, `${T} − ${b} = ${a + 10}`,
                       `${a} − ${b} = ${T}`, `${T} − ${a} = ${b + 10}`];
      if (!sameSet(wantFam, opts)) {
        return `p2 bond family: option set is not the four named statements - want [${wantFam.join(' | ')}], got [${opts.join(' | ')}]`;
      }
      return null;
    }
    if ((m = text.match(/^[A-Za-z ]+ says (\d+) − (\d+) = (\d+)\. (?:He|She) checked it by working out (\d+) \+ (\d+) = (\d+)\. What should (\d+) − (\d+) be\?$/))) {
      const T = Number(m[1]), a = Number(m[2]), claim = Number(m[3]);
      if (Number(m[4]) !== a || Number(m[5]) !== claim) return 'p2 bond error: the printed check does not use the two numbers in the claim';
      if (Number(m[6]) !== a + claim) return `p2 bond error: the printed check ${a} + ${claim} = ${m[6]} is not that sum`;
      if (Number(m[7]) !== T || Number(m[8]) !== a) return 'p2 bond error: the question re-asks a different subtraction';
      if (a + claim === T) return `p2 bond error: the "wrong" answer ${claim} is actually correct`;
      /* W5, ASSERTED (refutation second pass 2026-09-15, WOUND 2). The fixed
         explanation used to name a slip that cannot have happened in 39.2% of
         draws - "took the tens away and then ADDED the 1 back", when 1 has no
         tens. The sentence is branched on the digits of the draw now, and the
         file said that branch was "asserted by the p2 gate, both directions". It
         was not. It is here, both directions, re-derived from the rendered stem. */
      {
        const ex = strip(q.explain || '');
        const r = a % 10;
        const tensLine = `took the tens away and then ADDED the ${r} back instead of taking it away too.`;
        const onesLine = `ADDED the ${a} instead of taking it away, which is why the check overshoots by ${2 * a}.`;
        if (a >= 10) {
          if (ex.indexOf(tensLine) < 0) return `p2 bond error: ${a} has tens, but the explanation never names the slip "${tensLine}"`;
          if (ex.indexOf('instead of taking it away, which is why') >= 0) {
            return `p2 bond error: the explanation names the single-digit slip on a draw where ${a} does have tens`;
          }
        } else {
          if (ex.indexOf('took the tens away') >= 0) {
            return `p2 bond error: the explanation says the tens were taken away, but ${a} has no tens`;
          }
          if (ex.indexOf(onesLine) < 0) return `p2 bond error: ${a} is a single digit, but the explanation never names the slip "${onesLine}"`;
        }
      }
      const e = T - a;
      return near(e, ansNum) ? null : `p2 bond error: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/^[A-Za-z ]+ needs (\d+) [A-Za-z ]+ for the [A-Za-z ]+\. (?:He|She) already has (\d+) and gets (\d+) more\. How many more [A-Za-z ]+ are still needed\?$/))) {
      const T = Number(m[1]), A = Number(m[2]), B = Number(m[3]);
      const e = T - A - B;
      if (e <= 0) return `p2 bond word: ${A} + ${B} already makes ${A + B} of ${T}, so nothing is still needed`;
      return near(e, ansNum) ? null : `p2 bond word: expected ${e}, got ${ansNum}`;
    }
    /* REFUTATION FIX 2026-09-15, SECOND PASS (WOUND 4). This bank used to give
       two of its four options away: "They make T, so nothing is wrong." was on
       screen in 20,000 of 20,000 draws and the key in 0, and the key's sum was
       never the smallest of the three numeric options - 50% with no arithmetic.
       The option set is now FOUR readings of the same addition, and the contract
       is asserted here rather than declared by the generator: every option must
       be the one sentence, must state a sum whose stated gap from the whole is
       arithmetically right, must be distinct, and must fall on the SAME side of
       the whole as the truth does, so the direction word cannot settle it. */
    if ((m = text.match(/^[A-Za-z ]+ says (\d+) \+ (\d+) = (\d+)\. What is wrong\?$/))) {
      const A = Number(m[1]), B = Number(m[2]), T = Number(m[3]), S = A + B;
      if (S === T) return `p2 bond diagnose: ${A} + ${B} really is ${T}, so nothing is wrong`;
      const line = v => `They make ${v}, which is ${Math.abs(v - T)} ${v > T ? 'too many' : 'too few'}.`;
      if (keyTxt !== line(S)) return `p2 bond diagnose: key "${keyTxt}" should be "${line(S)}"`;
      const sums = [];
      for (const o of opts) {
        const p = o.match(/^They make (\d+), which is (\d+) too (many|few)\.$/);
        if (!p) return `p2 bond diagnose: an option is not a reading of the addition ("${o}")`;
        const v = Number(p[1]);
        if (o !== line(v)) return `p2 bond diagnose: "${o}" does not state its own gap from ${T} correctly`;
        if (o !== keyTxt && v === S) return `p2 bond diagnose: a distractor also states the true sum ${S}`;
        if ((v > T) !== (S > T)) {
          return `p2 bond diagnose: "${o}" falls on the other side of ${T} from the truth, so the direction word gives the item away`;
        }
        sums.push(v);
      }
      if (new Set(sums).size !== 4) return `p2 bond diagnose: two options state the same sum (${sums.join(', ')})`;
      return null;
    }

    /* --- PRINCIPLE 2: addition and subtraction with regrouping --- */
    if ((m = text.match(/^[A-Za-z ]+ adds (\d+) \+ (\d+) in columns\. What happens in the ones column\?$/))) {
      const a = Number(m[1]), b = Number(m[2]), s = (a % 10) + (b % 10);
      if (s < 10) return `p2 regroup concept: ${a % 10} + ${b % 10} = ${s} does not regroup, so nothing is carried`;
      const head = `${a % 10} + ${b % 10} = ${s}, so `;
      const want = head + `write ${s % 10} and carry 1 ten.`;
      if (keyTxt !== want) return `p2 regroup concept: key "${keyTxt}" should be "${want}"`;
      const wantSet = [want, head + `write ${s} in the ones column.`,
                       head + `write 1 and carry ${s % 10} tens.`,
                       head + `write ${s % 10} and carry 1 hundred.`];
      if (!sameSet(wantSet, opts)) {
        return `p2 regroup concept: option set is not the four named readings - want [${wantSet.join(' | ')}], got [${opts.join(' | ')}]`;
      }
      return null;
    }
    if ((m = text.match(/^[A-Za-z ]+ works out (\d+) \+ (\d+) by adding (\d+) and then taking some away\. What is (\d+) \+ (\d+)\?$/))) {
      const a = Number(m[1]), b = Number(m[2]), r = Number(m[3]);
      if (Number(m[4]) !== a || Number(m[5]) !== b) return 'p2 near ten: the question re-asks a different sum';
      if (r % 10 !== 0) return `p2 near ten: ${r} is not a whole ten`;
      if (r <= b || r - b > 2) return `p2 near ten: ${b} is not within 2 of ${r}, so the strategy the stem describes does not apply`;
      return near(a + b, ansNum) ? null : `p2 near ten: expected ${a + b}, got ${ansNum}`;
    }
    if ((m = text.match(/^A number is added to (\d+)\. The answer is (\d+)\. What is the number\?$/))) {
      const P = Number(m[1]), W = Number(m[2]);
      if (W <= P) return `p2 inverse: the answer ${W} is not bigger than ${P}, so nothing was added`;
      return near(W - P, ansNum) ? null : `p2 inverse: expected ${W - P}, got ${ansNum}`;
    }
    /* REFUTATION FIX 2026-09-15, SECOND PASS (KILL B): the v2 stem asked "What
       went wrong, and what is a − b?" and every option carried the slip and the
       result. Because the stem prints ONE fixed misconception, the true diagnosis
       was one fixed English clause in 20,000 of 20,000 draws and the item was
       answerable with no arithmetic at all. The stem is back to the bare
       subtraction, and this branch back to the premise checks that made it
       strong: the "mistake" may not be accidentally correct, the ones column must
       actually need renaming, and the printed claim must be exactly what the
       named bug produces. */
    if ((m = text.match(/^[A-Za-z ]+ works out (\d+) − (\d+) in columns and gets (\d+)\. What is (\d+) − (\d+)\?$/))) {
      const a = Number(m[1]), b = Number(m[2]), claim = Number(m[3]);
      if (Number(m[4]) !== a || Number(m[5]) !== b) return 'p2 column error: the question re-asks a different subtraction';
      if (claim === a - b) return `p2 column error: the "mistake" ${claim} is actually correct`;
      if ((b % 10) <= (a % 10)) return 'p2 column error: the ones column needs no renaming, so the named mistake cannot arise';
      if (claim !== sfl(a, b)) return `p2 column error: the printed claim ${claim} is not what the named mistake gives (${sfl(a, b)})`;
      return near(a - b, ansNum) ? null : `p2 column error: expected ${a - b}, got ${ansNum}`;
    }
    if ((m = text.match(/^[A-Za-z ]+ had (\d+) ([a-z]+) and bought (\d+) more\. (?:He|She) then gave away (\d+) ([a-z]+) at [a-z ]+\. How many ([a-z]+) are left\?$/))) {
      const A = Number(m[1]), B = Number(m[3]), C = Number(m[4]);
      if (m[2] !== m[5] || m[2] !== m[6]) return 'p2 addsub word: the stem changes what is being counted half-way through';
      const e = A + B - C;
      if (e <= 0) return `p2 addsub word: ${C} given away out of only ${A + B}`;
      return near(e, ansNum) ? null : `p2 addsub word: expected ${e}, got ${ansNum}`;
    }

    /* --- PRINCIPLE 3: equal groups --- */
    if ((m = text.match(/^[A-Za-z ]+ has (\d+) ([a-z]+) with (\d+) ([a-z]+) at each ([a-z]+)\. How many ([a-z]+) are there altogether\?$/))) {
      const a = Number(m[1]), b = Number(m[3]);
      if (m[4] !== m[6]) return 'p2 equal groups: the stem asks for something other than what sits in each group';
      return near(a * b, ansNum) ? null : `p2 equal groups: expected ${a * b}, got ${ansNum}`;
    }
    if ((m = text.match(/^[A-Za-z ]+ counts in (\d+)s: ([\d, ]+), … What number comes next\?$/))) {
      const step = Number(m[1]);
      const seq = m[2].split(',').map(s => Number(s.trim()));
      if (seq.length < 3 || seq.some(v => !Number.isFinite(v))) return 'p2 skip count: could not read the printed count';
      for (let i = 1; i < seq.length; i++) {
        if (seq[i] - seq[i - 1] !== step) return `p2 skip count: the printed count ${seq.join(', ')} does not step by ${step}`;
      }
      if (seq[0] % step !== 0) return `p2 skip count: the count starts on ${seq[0]}, which is not in the ${step} times table`;
      const e = seq[seq.length - 1] + step;
      return near(e, ansNum) ? null : `p2 skip count: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/^Which multiplication has the same answer as ([\d + ]+)\?$/))) {
      const addends = m[1].split('+').map(s => Number(s.trim()));
      if (addends.length < 2 || addends.some(v => !Number.isFinite(v))) return 'p2 repeated addition: could not read the addends';
      if (addends.some(v => v !== addends[0])) return `p2 repeated addition: the addends ${addends.join(',')} are not all equal, so this is not equal groups`;
      const total = addends.reduce((s, v) => s + v, 0);
      const value = o => {
        const p = o.match(/^(\d+) ([×+]) (\d+)$/);
        if (!p) return null;
        return p[2] === '×' ? Number(p[1]) * Number(p[3]) : Number(p[1]) + Number(p[3]);
      };
      const vals = opts.map(value);
      if (vals.some(v => v === null)) return `p2 repeated addition: an option is not a two-number expression (${opts.join(' | ')})`;
      const hits = opts.filter((o, i) => vals[i] === total);
      if (hits.length !== 1) return `p2 repeated addition: ${hits.length} options evaluate to ${total}`;
      if (hits[0] !== keyTxt) return `p2 repeated addition: key "${keyTxt}" is not the option that makes ${total}`;
      const kp = keyTxt.match(/^(\d+) × (\d+)$/);
      if (!kp) return `p2 repeated addition: the key "${keyTxt}" is not a multiplication`;
      if (Number(kp[1]) !== addends.length || Number(kp[2]) !== addends[0]) {
        return `p2 repeated addition: key ${keyTxt} does not read as ${addends.length} groups of ${addends[0]}`;
      }
      {
        /* REFUTATION FIX (third pass 2026-09-15, KILL 2): the fourth option used
           to be "n + v", not a multiplication at all, which left the key as the
           only option multiplying two DIFFERENT numbers in 20,000 of 20,000
           draws. All four are multiplications now and two of them have unlike
           factors, so the form cannot single the key out; the p2 option-feature
           gate below asserts that class for every p2 bank. The miscount sits
           either side of the true count so the key is not always the smaller of
           the two unlike products, which would be a win by sorting. */
        const n = addends.length, v = addends[0];
        const setFor = w => [`${n} × ${v}`, `${w} × ${v}`, `${n} × ${n}`, `${v} × ${v}`];
        if (!sameSet(setFor(n + 1), opts) && !(n > 1 && sameSet(setFor(n - 1), opts))) {
          return `p2 repeated addition: option set is not the four named readings - want [${setFor(n + 1).join(' | ')}] or [${setFor(n - 1).join(' | ')}], got [${opts.join(' | ')}]`;
        }
      }
      return null;
    }
    /* REFUTATION FIX 2026-09-15, SECOND PASS (KILL B): same story as the column
       error above - the v2 "What went wrong, and what is a × b?" stem made the
       key one fixed clause on every draw the generator can produce, so the stem
       is back to the bare table fact. The premise checks below are the ones that
       make this the strongest item in the file and they are untouched: the
       printed count really is the a times table, really has b+1 entries, and
       really ends on the claim. */
    if ((m = text.match(/^[A-Za-z ]+ works out (\d+) × (\d+) by counting in (\d+)s: ([\d, ]+)\. (?:He|She) says (\d+) × (\d+) = (\d+)\. What is (\d+) × (\d+)\?$/))) {
      const a = Number(m[1]), b = Number(m[2]), claim = Number(m[7]);
      if (Number(m[3]) !== a) return 'p2 mul error: the count is not in the first factor';
      if (Number(m[5]) !== a || Number(m[6]) !== b || Number(m[8]) !== a || Number(m[9]) !== b) {
        return 'p2 mul error: the stem changes the fact half-way through';
      }
      const seq = m[4].split(',').map(s => Number(s.trim()));
      if (seq.some((v, i) => v !== a * (i + 1))) return `p2 mul error: the printed count ${seq.join(', ')} is not the ${a} times table`;
      if (seq.length !== b + 1) return `p2 mul error: the printed count has ${seq.length} numbers, the named slip needs ${b + 1}`;
      if (seq[seq.length - 1] !== claim) return `p2 mul error: the count ends on ${seq[seq.length - 1]} but the claim is ${claim}`;
      if (claim === a * b) return `p2 mul error: the "wrong" answer ${claim} is actually correct`;
      return near(a * b, ansNum) ? null : `p2 mul error: expected ${a * b}, got ${ansNum}`;
    }
    if ((m = text.match(/^[A-Za-z ]+ buys (\d+) ([a-z]+) of ([a-z ]+)\. Each ([a-z]+) holds (\d+) ([a-z ]+)\. (?:He|She) gives away (\d+) ([a-z ]+)\. How many ([a-z ]+) are left\?$/))) {
      const a = Number(m[1]), b = Number(m[5]), c = Number(m[7]);
      if (m[3] !== m[6] || m[3] !== m[8] || m[3] !== m[9]) return 'p2 mul word: the stem changes what is being counted half-way through';
      if (m[2].slice(0, 2) !== m[4].slice(0, 2)) return 'p2 mul word: the container in the second sentence is not the one bought';
      const e = a * b - c;
      if (e <= 0) return `p2 mul word: ${c} given away out of only ${a * b}`;
      return near(e, ansNum) ? null : `p2 mul word: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/^You know that (\d+) × (\d+) = (\d+)\. Which division fact uses the same three numbers\?$/))) {
      const a = Number(m[1]), b = Number(m[2]), p = Number(m[3]);
      if (a * b !== p) return `p2 div family: the printed fact ${a} × ${b} does not make ${p}`;
      const hits = opts.filter(o => {
        const t = o.match(/^(\d+) ÷ (\d+) = (\d+)$/);
        return t && Number(t[2]) !== 0 && Number(t[1]) / Number(t[2]) === Number(t[3]);
      });
      if (hits.length !== 1) return `p2 div family: ${hits.length} of the four statements are true (${opts.join(' | ')})`;
      if (hits[0] !== keyTxt) return `p2 div family: key "${keyTxt}" is not the true statement "${hits[0]}"`;
      const wantDiv = [`${p} ÷ ${a} = ${b}`, `${p} ÷ ${b} = ${a + 1}`,
                       `${a} ÷ ${b} = ${p}`, `${p} ÷ ${b + 1} = ${a}`];
      if (!sameSet(wantDiv, opts)) {
        return `p2 div family: option set is not the four named statements - want [${wantDiv.join(' | ')}], got [${opts.join(' | ')}]`;
      }
      return null;
    }
    if ((m = text.match(/^[A-Za-z ]+ shares (\d+) ([a-z ]+) equally among (\d+) ([a-z]+)\. How many ([a-z ]+) do (\d+) ([a-z]+) get altogether\?$/))) {
      const T = Number(m[1]), gN = Number(m[3]), want = Number(m[6]);
      if (m[2] !== m[5] || m[4] !== m[7]) return 'p2 sharing: the stem changes what is shared or who is sharing it';
      if (T % gN !== 0) return `p2 sharing: ${T} does not share equally among ${gN}`;
      if (!(want > 0 && want < gN)) return `p2 sharing: the question asks about ${want} of only ${gN} sharers`;
      const e = (T / gN) * want;
      return near(e, ansNum) ? null : `p2 sharing: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/^The [A-Za-z ]+ has (\d+) ([a-z]+)\. Each ([a-z]+) holds (\d+) ([a-z]+)\. (\d+) ([a-z]+) have already been filled\. How many more ([a-z]+) are needed\?$/))) {
      const T = Number(m[1]), per = Number(m[4]), filled = Number(m[6]);
      if (m[2] !== m[5]) return 'p2 grouping: the stem changes what is being packed';
      if (m[7] !== m[8]) return 'p2 grouping: the stem changes what is being counted';
      if (m[3].slice(0, 2) !== m[7].slice(0, 2)) return 'p2 grouping: the container that holds and the container counted are different things';
      if (T % per !== 0) return `p2 grouping: ${T} does not fill whole ${m[7]}`;
      const groups = T / per;
      if (filled >= groups) return `p2 grouping: ${filled} already filled out of only ${groups}`;
      const e = groups - filled;
      return near(e, ansNum) ? null : `p2 grouping: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/^[A-Za-z ]+ works out (\d+) ÷ (\d+) and gets (\d+)\. (?:He|She) checks: (\d+) × (\d+) = (\d+)\. What does the check tell (?:him|her)\?$/))) {
      const T = Number(m[1]), d = Number(m[2]), claim = Number(m[3]);
      if (Number(m[4]) !== d || Number(m[5]) !== claim) return 'p2 div check: the check does not multiply the divisor by the claim';
      if (Number(m[6]) !== d * claim) return `p2 div check: the printed check ${d} × ${claim} = ${m[6]} is not that product`;
      if (T % d !== 0) return `p2 div check: ${T} does not divide by ${d}`;
      const quot = T / d;
      /* REFUTATION FIX 2026-09-15 (KILL 2 + WOUND 1). claim === quot is no longer
         a defect - it is the 1-in-4 draw in which "The answer is correct." really
         IS the key, which is what stops that option from being a free elimination.

         REFUTATION FIX, SECOND PASS (KILL A): the branch used to REQUIRE the three
         wrong quotients to straddle the key, and that requirement WAS the value
         tell - the key was never the smallest and never the largest of the four,
         in 20,000 of 20,000 draws, so "discard the extremes, take the one of the
         two left that does not read correct" found the key 75.2% of the time with
         no division done. The straddle is gone from here and from the draw. What
         the key's value rank may NOT be is degenerate, and that is asserted by
         sampling across a whole bank in the rank gate below, not per draw - a
         single draw cannot carry the evidence for a distribution claim.

         What this branch still asserts per draw: the claim is inside the P2
         quotient range, the key sentence is the one the arithmetic implies, every
         option states a quotient and the verdict that quotient implies about the
         claim, the four quotients are distinct, no distractor prints the true
         quotient, and exactly one option reads "correct" - the one whose quotient
         is the claim - so the wording cannot settle it either. */
      if (!(claim >= 1 && claim <= 10)) {
        return `p2 div check: the claim ${claim} is outside the P2 quotient range 1-10`;
      }
      const verdict = n => claim > n ? 'too big' : (claim < n ? 'too small' : 'correct');
      const want = `The answer is ${verdict(quot)}. ${T} ÷ ${d} = ${quot}.`;
      if (keyTxt !== want) return `p2 div check: key "${keyTxt}" should be "${want}"`;
      const seenQ = [];
      for (const o of opts) {
        const p = o.match(/^The answer is (?:too big|too small|correct)\. (\d+) ÷ (\d+) = (\d+)\.$/);
        if (!p) return `p2 div check: an option is not a verdict plus a quotient ("${o}")`;
        if (Number(p[1]) !== T || Number(p[2]) !== d) return `p2 div check: "${o}" re-states a different division`;
        const n = Number(p[3]);
        if (o !== `The answer is ${verdict(n)}. ${T} ÷ ${d} = ${n}.`) {
          return `p2 div check: "${o}" does not state the verdict its own quotient implies about ${claim}`;
        }
        if (o !== keyTxt && n === quot) return `p2 div check: a distractor also prints the true quotient ${quot}`;
        seenQ.push(n);
      }
      if (new Set(seenQ).size !== 4) return `p2 div check: two options print the same quotient (${seenQ.join(', ')})`;
      if (seenQ.filter(n => n === claim).length !== 1) {
        return `p2 div check: the claim ${claim} is not on screen, so no option reads "correct" and the wording is a free elimination (${seenQ.join(', ')})`;
      }
      return null;
    }

    /* --- PRINCIPLE 4: comparing and ordering numbers to 1000 --- */
    if ((m = text.match(/^(\d+) = (\d+) \+ \? \+ (\d+)\. What is the missing number\?$/))) {
      const W = Number(m[1]), h = Number(m[2]), o = Number(m[3]);
      if (h % 100 !== 0 || o >= 10) return 'p2 place value: the stem is not in hundreds + tens + ones form';
      const e = W - h - o;
      if (e <= 0 || e % 10 !== 0 || e >= 100) return `p2 place value: the missing piece ${e} is not a whole number of tens`;
      return near(e, ansNum) ? null : `p2 place value: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/^Which list is in order from (smallest to greatest|greatest to smallest)\?$/))) {
      const up = m[1] === 'smallest to greatest';
      const ordered = s => {
        const n = nums(s);
        if (n.length < 2) return false;
        for (let i = 1; i < n.length; i++) if (up ? n[i] <= n[i - 1] : n[i] >= n[i - 1]) return false;
        return true;
      };
      const hits = opts.filter(ordered);
      if (hits.length !== 1) return `p2 ordering: ${hits.length} of the four lists run ${m[1]} (${opts.join(' | ')})`;
      if (hits[0] !== keyTxt) return `p2 ordering: key "${keyTxt}" is not the ordered list "${hits[0]}"`;
      {
        const sig = s => nums(s).slice().sort((x, y) => x - y).join(',');
        const want = sig(keyTxt);
        for (const o of opts) {
          if (nums(o).length !== 3) return `p2 ordering: an option is not a list of three numbers ("${o}")`;
          if (sig(o) !== want) return `p2 ordering: "${o}" is not a re-ordering of the same three numbers (${want})`;
        }
      }
      return null;
    }
    if ((m = text.match(/^[A-Za-z ]+ says (\d+) is greater than (\d+), because (\d+) is more than (\d+)\. What went wrong\?$/))) {
      const a = Number(m[1]), b = Number(m[2]);
      if (a >= b) return `p2 compare error: ${a} really is greater than ${b}, so nothing went wrong`;
      if (Number(m[3]) !== a % 10 || Number(m[4]) !== b % 10) return 'p2 compare error: the printed reason does not quote the two ones digits';
      const ha = Math.floor(a / 100), hb = Math.floor(b / 100);
      if (ha >= hb) return 'p2 compare error: the hundreds do not settle it, so the stated fix is not the fix';
      if (!((a % 10) > (b % 10) && Math.floor(a / 10) % 10 > Math.floor(b / 10) % 10)) {
        return 'p2 compare error: the ones or the tens already point the right way, so one digit settles the item';
      }
      /* REFUTATION FIX (third pass 2026-09-15, KILL 1). Every distractor used to
         end on the number the CHARACTER named, so the key was the only option on
         the screen that disagreed with her - 100% with no digit read, on the
         most-served generator in the topic - and one distractor stated the
         correct hundreds comparison and then drew the opposite conclusion.
         The rule below re-derives each option from the printed digits instead of
         trusting a template: every option must quote a's digit and then b's digit
         at the place it names, must name the number its own comparison implies
         (so a self-contradicting option cannot ship), and exactly one must be
         SOUND - the right place, read the right way round - which must be the
         key. Finally at least two options must name each number, so the
         conclusion alone never settles the item. */
      const ta = Math.floor(a / 10) % 10, tb = Math.floor(b / 10) % 10;
      const digitAt = (n, place) => place === 'hundreds' ? Math.floor(n / 100)
                                  : place === 'tens' ? Math.floor(n / 10) % 10 : n % 10;
      const sound = [], named = [];
      for (const o of opts) {
        const p = o.match(/^Start with the (hundreds|tens|ones): (\d+) is (less|more) than (\d+), so (\d+) is greater\.$/);
        if (!p) return `p2 compare error: an option is not a place-value reading ("${o}")`;
        const place = p[1], x = Number(p[2]), word = p[3], y = Number(p[4]), win = Number(p[5]);
        if (x !== digitAt(a, place) || y !== digitAt(b, place)) {
          return `p2 compare error: "${o}" does not quote the ${place} digit of ${a} and then of ${b} (${digitAt(a, place)}, ${digitAt(b, place)})`;
        }
        if (win !== a && win !== b) return `p2 compare error: "${o}" names ${win}, which is not one of the two numbers`;
        if ((word === 'less') !== (win === b)) {
          return `p2 compare error: "${o}" states a comparison and then names the other number - no child makes that mistake`;
        }
        if (place === 'hundreds' && (word === 'less' ? x < y : x > y)) sound.push(o);
        named.push(win);
      }
      if (sound.length !== 1) {
        return `p2 compare error: ${sound.length} of the four options start on the hundreds AND read them correctly (${opts.join(' | ')})`;
      }
      if (sound[0] !== keyTxt) return `p2 compare error: key "${keyTxt}" is not the sound reading "${sound[0]}"`;
      const forB = named.filter(w => w === b).length;
      if (forB < 2 || named.length - forB < 2) {
        return `p2 compare error: ${forB} of the four options name ${b} as the greater number, so the conclusion alone singles out the key`;
      }
      const wantCmp = [
        `Start with the hundreds: ${ha} is less than ${hb}, so ${b} is greater.`,
        `Start with the hundreds: ${ha} is more than ${hb}, so ${a} is greater.`,
        `Start with the tens: ${ta} is more than ${tb}, so ${a} is greater.`,
        `Start with the ones: ${a % 10} is less than ${b % 10}, so ${b} is greater.`];
      if (!sameSet(wantCmp, opts)) {
        return `p2 compare error: option set is not the four named readings - want [${wantCmp.join(' | ')}], got [${opts.join(' | ')}]`;
      }
      return null;
    }
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
/* SWEEP 2026-09-15: 'p2' joins the pilot set. Number Beach was rebuilt to the
   same contract, and rule 1 is what keeps its four word-answer banks honest -
   gBondDiagnose, gRegroupConcept, gDivCheckP2 and gCompareError each ship four
   options written to one pattern, and the rule fails the build the moment an
   edit makes the key the only prose (or the only long) option. Rule 2 binds
   trivially here (no p2 stem says "long"/"wide") and is left on so a later
   measurement format inherits it. */
const PILOT_TOPICS = new Set(['geometry', 'tables', 'p4area', 'p2']);
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
  return null;
}

/* ---------- p2 SWEEP REFUTATION GATE (2026-09-15) ---------------------------
   The sweep note claimed "nothing printed anywhere in the topic - stem, option or
   explanation - exceeds 1000, and no multiplication uses a table outside those
   five", and its own note admitted both were "scanned, not asserted". The refuter
   found the second half false in two generators: gDivShareP2 multiplied outside
   the five tables in 112 of 2,000 draws (and printed the out-of-table product as
   the answer key), gDivCheckP2 printed a true out-of-table multiplication in its
   own stem in 213 of 2,000. Both were one-line draw bounds, and because nothing
   asserted the claim, both would have reopened silently on the next edit. This is
   the gate that claim always needed - the depth-pilot v4 wound-3 pattern ("a gate
   narrower than the claim it is taken to support") closed for this file.

   RULE 1, the 1000 ceiling. No integer above 1000 in a stem, an option or an
   explanation.
   RULE 2, the five tables. Every multiplication "a × b" printed anywhere must
   have one factor in {2,3,4,5,10} and the other in 1-10. Every TRUE division
   "a ÷ b" (bare, "= ?", or "= c" with c the real quotient) must be that same
   multiplication read backwards. A division statement that is deliberately FALSE
   is exempt from rule 2 and only from rule 2: gDivFamilyP2 offers "20 ÷ 11 = 2"
   as a distractor whose whole point is that the child rejects it by inspection
   ("uses the same three numbers"), and no child is asked to divide by 11 to see
   it. Rule 1 still binds on every number in it.
   RULE 3, the distractor contract. Every p2 draw must declare the options it
   authored - q.authored for the numeric banks, q.optionSet for the word-answer
   banks - so no generator can reach the child through a padding branch.

   RULE 2b, TRUE MEANS TRUE (refutation third pass 2026-09-15, WOUND 4). Rule 2
   validated a multiplication's FACTORS but never that a printed product is
   right: "4 × 5 = 21" passed it, and the false-division arm silently waved
   through any division whose stated answer was wrong. Every printed "a × b = c"
   and "a ÷ b = c" must now be TRUE unless the generator is named below, with its
   reason, as one that deliberately prints a false fact. */
const P2_TABLE = new Set([2, 3, 4, 5, 10]);
const p2InTables = (x, y) => (P2_TABLE.has(x) && y >= 1 && y <= 10) ||
                             (P2_TABLE.has(y) && x >= 1 && x <= 10);
/* The three banks that PRINT a fact which is deliberately wrong, each with the
   reason it has to. Nothing else in the topic may, and a new name here needs the
   same argument.
     gMulError    - the stem prints the child's own wrong claim ("10 × 5 = 60");
                    spotting it IS the item, and the oracle re-derives the printed
                    skip count to prove the claim really is what that slip gives.
     gDivFamilyP2 - one distractor is "20 ÷ 11 = 2", rejected by inspection
                    ("uses the same three numbers"), never by dividing by 11.
     gDivCheckP2  - three of the four options state a quotient that is not the
                    true one, by construction; exactly one is true and the oracle
                    checks which. */
const P2_FALSE_FACT_OK = new Set(['gMulError', 'gDivFamilyP2', 'gDivCheckP2']);
function p2Gates(q, topic, name) {
  if (topic !== 'p2') return null;
  const text = [strip(q.q), strip(q.extra || ''), strip(q.explain || '')]
    .concat((q.choices || []).map(strip)).join(' ‖ ');
  for (const n of text.match(/\d+/g) || []) {
    if (Number(n) > 1000) return `p2 scope: ${n} is printed, and the P2 number range stops at 1000`;
  }
  let mm;
  const mul = /(\d+) × (\d+)(?: = (\d+))?/g;
  while ((mm = mul.exec(text))) {
    const x = Number(mm[1]), y = Number(mm[2]);
    const stated = mm[3] === undefined ? null : Number(mm[3]);
    if (stated !== null && x * y !== stated) {
      if (!P2_FALSE_FACT_OK.has(name)) {
        return `p2 scope: "${x} × ${y} = ${stated}" is printed, but ${x} × ${y} is ${x * y}, and this bank is not one of the declared false-fact banks`;
      }
      continue;   /* declared false claim: rule 1 only */
    }
    if (!p2InTables(x, y)) {
      return `p2 scope: "${x} × ${y}" is printed, which is outside the 2, 3, 4, 5 and 10 times tables`;
    }
  }
  const div = /(\d+) ÷ (\d+)(?: = (\d+))?/g;
  while ((mm = div.exec(text))) {
    const x = Number(mm[1]), y = Number(mm[2]);
    const stated = mm[3] === undefined ? null : Number(mm[3]);
    if (stated !== null && x !== y * stated) {
      if (!P2_FALSE_FACT_OK.has(name)) {
        return `p2 scope: "${x} ÷ ${y} = ${stated}" is printed, but that division is not true, and this bank is not one of the declared false-fact banks`;
      }
      continue;   /* declared false claim: rule 1 only */
    }
    if (y === 0 || x % y !== 0) return `p2 scope: "${x} ÷ ${y}" is printed as a true fact but does not divide exactly`;
    if (!p2InTables(y, x / y)) {
      return `p2 scope: "${x} ÷ ${y} = ${x / y}" is printed, which is outside the 2, 3, 4, 5 and 10 times tables`;
    }
  }
  if (!Array.isArray(q.authored) && !Array.isArray(q.optionSet)) {
    return 'p2 distractor contract: the draw declares neither q.authored nor q.optionSet, so nothing binds its distractors';
  }
  /* RULE 4, W4 ASSERTED (refutation second pass 2026-09-15, WOUND 2).
     gCompareNum's explanation used to claim on every draw that "two of these
     share a hundreds digit on purpose, so the tens have to be read too": false in
     55.9% of draws, "two" wrong in 21.4%, and flatly false in 0.45%. The sentence
     is branched now - and the source comment claimed the branch was "asserted by
     the p2 gate in tools/gen-sanity.mjs, both directions" when nothing anywhere
     matched the words. This is that assertion. It lives in p2Gates rather than in
     an oracle branch because "Which number is the greatest?" is also a
     p3-whole-numbers stem, and only this gate knows the topic. */
  {
    const st = strip(q.q);
    const cm = st.match(/^Which number is the (greatest|smallest)\?$/);
    const ch = (q.choices || []).map(strip);
    if (cm && ch.length === 4 && ch.every(c => /^\d+$/.test(c))) {
      const ns = ch.map(Number);
      const best = cm[1] === 'greatest' ? Math.max(...ns) : Math.min(...ns);
      if (String(best) !== strip(q.answerText)) {
        return `p2 compare: the ${cm[1]} of ${ns.join(', ')} is ${best}, but the key is ${strip(q.answerText)}`;
      }
      const bh = Math.floor(best / 100);
      const tie = ns.filter(n => Math.floor(n / 100) === bh).length > 1;
      const ex = strip(q.explain || '');
      if (tie) {
        if (ex.indexOf(`Another number starts with ${bh} too, so the tens have to be read to settle it.`) < 0) {
          return `p2 compare: ${best} shares its hundreds digit with another option (${ns.join(', ')}), but the explanation does not say the tens have to be read`;
        }
        if (/settles it on its own/.test(ex)) {
          return `p2 compare: the explanation says the hundreds digit settles it on its own, but another number also starts with ${bh} (${ns.join(', ')})`;
        }
      } else {
        if (ex.indexOf(`No other number starts with ${bh}, so the hundreds digit settles it on its own.`) < 0) {
          return `p2 compare: no other number starts with ${bh} (${ns.join(', ')}), but the explanation does not say the hundreds digit settles it`;
        }
        if (/the tens have to be read/.test(ex)) {
          return `p2 compare: the explanation says the tens have to be read, but ${best} is settled by its hundreds digit alone (${ns.join(', ')})`;
        }
      }
    }
  }
  return null;
}

/* ---------- p2 KEY VALUE RANK GATE (refutation second pass 2026-09-15, WOUND 3)
   Three NAMED misconceptions arranged around one key is the contract the whole
   sweep is built on, and it has a cost nothing used to look at: if all three
   named slips land above the key (or all three below it), the key sits at the
   same position in the sorted option list on EVERY draw. "Sort the four numbers
   and take the third" then beats the mathematics. The refuter measured a single
   fixed rank on eight numeric banks - 20,000 of 20,000 draws each - and two of
   four ranks on nine more.

   This gate is a DISTRIBUTION claim, so unlike every other rule here it is not a
   per-draw check: it tallies the key's rank across a whole generator's sample and
   fails the generator if any one rank holds more than 45% of the draws it could
   rank. At the default 200 samples a genuinely uniform bank sits six standard
   deviations inside that ceiling, so the gate does not flap.

   THE FLOOR (refutation third pass 2026-09-15, WOUND 1). A ceiling alone never
   looks at a rank that is nearly EMPTY, and an almost-empty rank is a free
   elimination - the same win by sorting the ceiling exists to stop. gDivGroupWord
   shipped [31.7 / 31.7 / 31.2 / 5.4] and passed: the key was not the largest
   option in 94.6% of draws. No rank may hold less than 12% of the ranked draws.
   Being a distribution claim on a finite sample it is tested with a 1.5
   standard-error allowance, so at the default 200 samples it fires below about
   8.6% and at SAMPLES=50000 below about 11.8% - tight enough to catch a 5%
   rank at 200, loose enough that the thinnest honest bank in the file (gBonds,
   17.5% at rank 3, where single-digit keys leave too few whole numbers
   underneath) never flaps.

   EXEMPTION, declared and reasoned: gCompareNum asks "Which number is the
   greatest?". Its key is the extremum BY DEFINITION, so rank 0 or rank 3 in 100%
   of draws is the question being asked, not a tell a child can exploit. It is the
   only exemption, and a generator added to this set needs the same argument. */
const P2_RANK_EXEMPT = new Set(['gCompareNum']);
const P2_RANK_CEILING = 0.45;
const P2_RANK_FLOOR = 0.12;
const P2_RANK_SE = 1.5;            /* standard errors of slack on the floor test */
const P2_RANK_NAME = ['smallest', 'second smallest', 'second largest', 'largest'];
/* the four NUMERIC READINGS of an option set - four bare numbers, four options
   that each end on "= n." (the verdict-plus-quotient bank), or four that each open
   "They make n," (the bond-diagnose bank). Anything else has no numeric reading
   and cannot be ranked. */
function p2Readings(q) {
  const opts = (q.choices || []).map(strip);
  if (opts.length !== 4) return null;
  const forms = [
    o => (/^\d+$/.test(o) ? Number(o) : null),
    o => { const mm = o.match(/= (\d+)\.$/); return mm ? Number(mm[1]) : null; },
    o => { const mm = o.match(/^They make (\d+),/); return mm ? Number(mm[1]) : null; }
  ];
  for (const f of forms) {
    const v = opts.map(f);
    if (v.every(x => x !== null) && new Set(v).size === 4) return v;
  }
  return null;
}

/* ---------- p2 OPTION FEATURE GATE (refutation third pass 2026-09-15, KILLS 1-2)
   The rank gate made the numeric side honest and the format-tell rule catches a
   coarse odd-one-out, and between them they missed both of the third pass's
   kills, because both lived on the WORD-ANSWER side in a feature neither looks
   at:
     - gCompareError shipped three distractors that all ended on the number the
       character named, so the key was the only option disagreeing with her -
       100% of draws, no digit read;
     - gMulRepeatAdd shipped n × v, v × v, n × n and n + v with n !== v forced, so
       the key was the only option multiplying two DIFFERENT numbers - 100% of
       draws, no addend counted. optForm classes "3 + 10" and "3 × 10" alike as an
       expression, by design, so rule 1 could never see it.

   This gate reads a small feature off every option of every p2 draw whose options
   are not four bare numbers (those are the rank gate's business) and fails the
   generator when the KEY is the only option carrying a feature's value in 90% or
   more of the sample. The features are deliberately coarse - the kind of thing a
   seven-year-old spots without doing any mathematics:
     form       - is it a bare number, prose, or "x OP y"; and if it is an
                  expression, WHICH operator and are its two numbers the same or
                  different. This is optForm sharpened exactly where it was blunt.
     stem num   - the BIGGEST number printed in the stem that the option names
                  again, which is the number the option is about. "The key is the
                  only option that names the other number" is exactly this. It is
                  the biggest rather than the whole set because a stem that quotes
                  single digits ("because 9 is more than 5") collides with the
                  digits inside the options, and the full set then separates two
                  options that are talking about the same number.
     direction  - the comparison direction words it states (less/more than, too
                  many/few, too big/small, correct).
   It is a distribution claim like the rank gate, so it is sampled, not per-draw.
   The 90% ceiling is deliberately loose: two accepted floors sit under it and
   must stay passing - gDivCheckP2's verdict word is unique to the key in 38.0% of
   draws (the honest 62.5% strategy floor of the verdict-plus-quotient format),
   and gRegroupConcept's key is the only option reading "carry 1 ten" on every
   draw, which every pass has accepted because that invariant IS the concept and
   is not one of the features here. */
const P2_FEATURES = [
  { label: 'its form (bare number, prose, or which operator over two numbers that are the same or different)',
    of: o => {
      if (/^\d+$/.test(o)) return 'number';
      const mm = o.match(/^(\d+)\s*([+×÷−-])\s*(\d+)(?:\s*=\s*(\d+))?$/);
      if (mm) return mm[2] + ':' + (mm[1] === mm[3] ? 'same' : 'different');
      return 'prose';
    } },
  { label: 'the biggest stem number it names again',
    of: (o, stemNums) => {
      const hit = (o.match(/\d+/g) || []).map(Number).filter(n => stemNums.has(n));
      return hit.length ? String(Math.max(...hit)) : 'none';
    } },
  { label: 'the comparison direction it states',
    of: o => [...new Set(o.match(/less than|more than|too many|too few|too big|too small|correct/g) || [])]
               .sort().join(',') || 'none' }
];
const P2_FEATURE_CEILING = 0.90;

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
  const rankN = [0, 0, 0, 0];
  let ranked = 0;
  const featHit = P2_FEATURES.map(() => 0);
  const featSample = P2_FEATURES.map(() => null);
  let featN = 0;
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
    const scope = p2Gates(q, g.topic, g.name);
    if (scope) { err = scope; badQ = q; break; }
    if (g.topic === 'p2' && !P2_RANK_EXEMPT.has(g.name)) {
      const vals = p2Readings(q);
      if (vals) {
        const kv = vals[q.correct];
        if (Number.isFinite(kv)) { rankN[vals.filter(v => v < kv).length]++; ranked++; }
      }
    }
    if (g.topic === 'p2') {
      const fopts = (q.choices || []).map(strip);
      if (fopts.length === 4 && !fopts.every(o => /^\d+$/.test(o))) {
        featN++;
        const stemNums = new Set(((strip(q.q) + ' ' + strip(q.extra || '')).match(/\d+/g) || []).map(Number));
        const keyOpt = strip(q.answerText);
        for (let fi = 0; fi < P2_FEATURES.length; fi++) {
          const kv = P2_FEATURES[fi].of(keyOpt, stemNums);
          if (fopts.filter(o => P2_FEATURES[fi].of(o, stemNums) === kv).length === 1) {
            featHit[fi]++;
            featSample[fi] = { kv, opts: fopts.slice() };
          }
        }
      }
    }
    distinct.add(qKey(q));
    const o = oracle(q);
    if (o === false) continue;
    matched++;
    if (o) { err = o; badQ = q; break; }
  }
  if (!err && distinct.size < DISTINCT_FLOOR) {
    err = `sample space collapsed: only ${distinct.size} distinct questions in ${N} draws`;
  }
  if (!err && ranked >= 50) {
    const spread = `[${rankN.map(n => (100 * n / ranked).toFixed(0) + '%').join(' / ')}]`;
    const worst = Math.max(...rankN), at = rankN.indexOf(worst);
    const thin = Math.min(...rankN), atThin = rankN.indexOf(thin);
    const slack = P2_RANK_SE * Math.sqrt(P2_RANK_FLOOR * (1 - P2_RANK_FLOOR) / ranked);
    if (worst / ranked > P2_RANK_CEILING) {
      err = `p2 key value rank: the key is the ${P2_RANK_NAME[at]} of the four printed numbers in ` +
            `${worst} of ${ranked} draws (${(100 * worst / ranked).toFixed(1)}%), over the ` +
            `${(100 * P2_RANK_CEILING).toFixed(0)}% ceiling - named slips all on one side of the key let ` +
            `a child sort four numbers instead of doing the mathematics ${spread}`;
    } else if (thin / ranked < P2_RANK_FLOOR - slack) {
      err = `p2 key value rank: the key is the ${P2_RANK_NAME[atThin]} of the four printed numbers in ` +
            `only ${thin} of ${ranked} draws (${(100 * thin / ranked).toFixed(1)}%), under the ` +
            `${(100 * P2_RANK_FLOOR).toFixed(0)}% floor - a rank the key almost never takes is a free ` +
            `elimination, which is the same win by sorting the ceiling exists to stop ${spread}`;
    }
  }
  if (!err && featN >= 50) {
    for (let fi = 0; fi < P2_FEATURES.length; fi++) {
      if (featHit[fi] / featN < P2_FEATURE_CEILING) continue;
      const s = featSample[fi];
      err = `p2 option feature: the key is the ONLY option with ${P2_FEATURES[fi].label} in ` +
            `${featHit[fi]} of ${featN} draws (${(100 * featHit[fi] / featN).toFixed(1)}%), at or over ` +
            `the ${(100 * P2_FEATURE_CEILING).toFixed(0)}% ceiling - a child can pick the key out by ` +
            `that alone, with no mathematics (key value "${s.kv}", options: ${s.opts.join(' | ')})`;
      break;
    }
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

const uncovered = rows.filter(r => r.cov === 0).map(r => r.topic + '.' + r.name);
if (uncovered.length) console.log(`\nWARN no independent oracle matched (shape + integrity only): ${uncovered.join(', ')}`);

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll ${GENS.length} generators passed (${N} samples each).`);
