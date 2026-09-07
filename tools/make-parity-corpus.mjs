/* Regenerate the node/Swift GRADING PARITY CORPUS.
 *
 * WHY THIS EXISTS
 * ---------------
 * The refuter killed the bridge on a node/Swift divergence sitting on the child's own
 * input path: a typed fraction whose reduced numerator exceeded Int64
 * ("99999999999999999999/3") made Swift's `grade()` THROW where node returned a normal
 * "wrong value or unit" verdict. `Verdict.Parsed.frac` was `[Int]?` and `reduceFrac`
 * in js/core.js returns unbounded JavaScript numbers. Per the brief's own rule, any
 * divergence between node and Swift is a bridge bug and a kill.
 *
 * One fixed test would have caught that one bug. This corpus is the class: every
 * generator the engine has, crossed with every way a child (or an iOS keyboard, or a
 * paste) can spell an answer, plus a unicode/control fuzz band and the hand-built
 * numeric edges - graded once here by node, then re-graded BY BOTH SIDES against the
 * same recorded verdicts.
 *
 *   tools/parity-test.mjs                          node re-grades, must match
 *   ios/.../Tests/.../ParityCorpusTests.swift      Swift re-grades, must match
 *
 * Both compare to the same committed expectations, so agreement with the file is
 * agreement with each other, pairwise, item by item. Neither can be green while the
 * other is red on a pair.
 *
 * THE CORPUS IS COMMITTED, NOT GENERATED AT TEST TIME. Generators use unseeded
 * Math.random, so a corpus built at test time would be a different corpus every run -
 * it would find flaky things and prove nothing. Regenerating is a deliberate act with
 * a diff:
 *
 *     node tools/make-parity-corpus.mjs        (or: npm run build:parity-corpus)
 *
 * Do that when the engine's grading behaviour legitimately changes; the diff is then
 * the record of what changed and by how much.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(ROOT, 'ios/Packages/MQEngineJS/Sources/MQEngineJS/Resources/engine.bundle.js');
const OUT = path.join(ROOT, 'tools/fixtures/parity-corpus.json');

/* ---------- CLEAN TREE OR NOTHING (Unit Sweep Refutation W4, 2026-09-07) ----------
 *
 * The committed fixture carries `generatedAgainst.stamp`, its provenance line. The
 * unit sweep shipped one reading "20260907-cb2220b-dirty": generated from an
 * uncommitted working tree at a commit that PREDATED the fix it was recording, so
 * the fixture could not be re-derived from any commit on the branch. Nothing went
 * red - both gates compare `payloadHash` and only PRINT on a stamp difference - and
 * that is exactly the problem: a stamp nobody checks is a provenance line that can
 * lie for free.
 *
 * So it is checked here, at the only place that can write it, and it is a HARD FAIL
 * with no override. Committing the sources first is the whole cost, and it is what
 * makes the corpus a re-derivable artefact instead of a snapshot of somebody's desk.
 * If the tree is not a git checkout at all, there is no provenance to protect and
 * the build proceeds. */
{
  let porcelain = null;
  try {
    porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    porcelain = null;   /* not a git tree (a tarball, a sandbox): nothing to protect */
  }
  if (porcelain) {
    console.error('FAIL  make-parity-corpus: the working tree is DIRTY, so the corpus would record');
    console.error('      a `generatedAgainst.stamp` ending in "-dirty" - a provenance line naming a');
    console.error('      tree that exists on nobody\'s machine but this one, and that no commit can');
    console.error('      reproduce (Unit Sweep Refutation W4, 2026-09-07).');
    console.error('');
    console.error('      Commit the engine sources AND the rebuilt bundle first, then regenerate:');
    console.error('        git commit …                 sources');
    console.error('        npm run build:engine         rebuild the bundle off that commit');
    console.error('        git commit …                 the bundle');
    console.error('        npm run build:parity-corpus  <- clean tree, re-derivable stamp');
    console.error('');
    console.error('      uncommitted:');
    for (const line of porcelain.split('\n')) console.error('        ' + line);
    process.exit(1);
  }
}

const DRAWS_PER_REF = Number(process.env.PARITY_DRAWS) || 2;   /* questions per generator ref */
const FUZZ_PAIRS = Number(process.env.PARITY_FUZZ) || 3000;

/* ---------- load the bundle exactly as the harnesses do: a bare context ---------- */
const ctx = Object.create(null);
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), ctx, { filename: 'engine.bundle.js' });
const API = ctx.MQI_API;
if (!API) throw new Error('the bundle did not define MQI_API');

const call = (m, a) => {
  const r = JSON.parse(a === undefined ? API[m]() : API[m](JSON.stringify(a)));
  if (!r.ok) throw new Error(m + ': ' + r.error.message + '\n' + r.error.stack);
  return r;
};

/* ---------- a seeded PRNG, so a regeneration differs only where the ENGINE differs ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260907);
const pick = arr => arr[Math.floor(rnd() * arr.length)];

/* ---------- the 15 child spellings ----------
 * Every one of these is something that actually reaches a grader from a real iPad:
 * a paste carrying NBSP, a full-width keyboard, a child who types the unit, a child
 * who types nothing. Applied to typed and choice questions alike (a choice question
 * can be answered by index OR by text, and api.js supports both).
 */
const NBSP = ' ', THIN = ' ';
function toFullWidth(s) {
  return String(s).replace(/[0-9.]/g, ch => ch === '.' ? '．'
    : String.fromCharCode(0xFF10 + (ch.charCodeAt(0) - 48)));
}

function typedSpellings(base, unit) {
  const n = String(base);
  return [
    ['plain', { text: n }],
    ['padded', { text: '  ' + n + '   ' }],
    ['newline', { text: '\n' + n + '\n' }],
    ['nbsp', { text: NBSP + n + NBSP }],
    ['thin-space', { text: THIN + n + THIN }],
    ['full-width', { text: toFullWidth(n) }],
    ['dollar', { text: '$' + n }],
    ['comma-grouped', { text: n.replace(/\B(?=(\d{3})+(?!\d))/g, ',') }],
    ['wrong', { text: String(Number(n) + 1) }],
    ['with-unit', { text: n + ' ' + (unit || 'cm') }],
    ['unit-no-space', { text: n + (unit || 'cm') }],
    ['upper-unit', { text: n + ' ' + String(unit || 'cm').toUpperCase() }],
    ['nbsp-unit', { text: n + NBSP + (unit || 'cm') }],
    /* The RIGHT number under a unit the question definitely does not want. Every
       other unit spelling above types the question's OWN unit, so before this the
       corpus never carried a single wrong-unit verdict and the two runtimes never
       compared one - the exact hole that let the reason string mean two different
       things for as long as it did (Unit Sweep Refutation W1, 2026-09-07). This is
       the pair whose expected reason is 'wrong-unit'. */
    ['wrong-unit', { text: n + ' ' + wrongUnitFor(unit) }],
    ['empty', { text: '' }]
  ];
}
/* A unit that is not the declared one and not an alias of it, so the cell is always
   a unit rejection and never an accidental accept. */
function wrongUnitFor(unit) {
  const declared = new Set((Array.isArray(unit) ? unit : [unit])
    .filter(Boolean).map(u => ctx.MQI.normUnit(u)));
  for (const cand of ['kg', 'cm', 'pages', 'min']) if (!declared.has(cand)) return cand;
  return 'beads';
}

function choiceSpellings(q) {
  const right = q.correctIndex;
  const wrong = (right + 1) % Math.max(1, q.choices.length);
  return [
    ['index-right', { choice: right }],
    ['index-wrong', { choice: wrong }],
    ['index-zero', { choice: 0 }],
    ['index-last', { choice: Math.max(0, q.choices.length - 1) }],
    ['index-negative', { choice: -1 }],
    ['index-out-of-range', { choice: 99 }],
    ['index-huge', { choice: 2147483647 }],
    ['text-right', { text: q.choices[right] }],
    ['text-plain-right', { text: q.choiceTexts[right] }],
    ['text-wrong', { text: q.choices[wrong] }],
    ['text-padded', { text: '  ' + q.choiceTexts[right] + ' ' }],
    ['text-nbsp', { text: NBSP + q.choiceTexts[right] }],
    ['text-nonsense', { text: 'not one of the options' }],
    ['empty', { text: '' }]
  ];
}

/* ---------- unicode / control fuzz ----------
 * The alphabet the refuter used: digits, separators, the units that appear in stems,
 * the lookalike operators (U+2044 fraction slash, U+2212 minus), and the invisible
 * troublemakers a paste or an RTL keyboard can carry.
 */
const FUZZ_ALPHABET = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '.', ',', '/', ' ', '-', '+', '$',
  'cm', 'cm²', 'm', 'kg', 'ml', '°', '%',
  '⁄',        /* fraction slash */
  '−',        /* minus sign */
  '﻿',        /* BOM */
  '​',        /* zero-width space */
  '́',        /* combining acute */
  '‮',        /* right-to-left override */
  '🎉',  /* emoji */
  '\t', '\n', '\\', '"', '', NBSP, THIN,
  '１', '２', '３',   /* full-width digits */
  '١', '٢'              /* arabic-indic digits */
];

/* ---------- draw ---------- */
const cat = call('listTopics');
const refs = cat.topics.flatMap(t => t.generators.map(g => g.ref));
console.log('corpus: ' + refs.length + ' generator refs x ' + DRAWS_PER_REF + ' draws');

const questions = [];
const pairs = [];
const addPair = (qIndex, set, name, answer) => pairs.push({ q: qIndex, set, name, answer });

for (const ref of refs) {
  const drawn = call('nextQuestion', { generator: ref, count: DRAWS_PER_REF }).questions;
  for (const q of drawn) {
    const qi = questions.push(q) - 1;
    if (q.kind === 'typed') {
      const base = (q.key && typeof q.key.answer === 'number') ? q.key.answer : 0;
      for (const [name, answer] of typedSpellings(base, q.unit)) addPair(qi, 'wide', name, answer);
    } else {
      for (const [name, answer] of choiceSpellings(q)) addPair(qi, 'wide', name, answer);
    }
  }
}
const wideCount = pairs.length;

/* fuzz: random junk answers against randomly chosen real questions */
for (let i = 0; i < FUZZ_PAIRS; i++) {
  const qi = Math.floor(rnd() * questions.length);
  const len = 1 + Math.floor(rnd() * 8);
  let s = '';
  for (let j = 0; j < len; j++) s += pick(FUZZ_ALPHABET);
  addPair(qi, 'fuzz', 'fuzz' + i, { text: s });
}

/* ---------- hand-built edges ----------
 * Every one of these is a number or a key shape that has, or plausibly could, cross a
 * fixed-width Swift integer or a strict decoder. The first entry IS kill 2.
 */
function templateQuestion(overrides) {
  const base = {
    id: 'edge', topic: 'p4area', generator: null, pool: 1, level: 1, skill: 'area',
    kind: 'typed', stem: 'edge case', stemText: 'edge case', extra: '', extraText: '',
    extraIsMarkup: false, figure: null, choices: [], choiceTexts: [], correctIndex: -1,
    answerText: '0', answerTextPlain: '0', explain: '', explainText: '', unit: '',
    key: { typed: true, correct: -1, answer: 0 }
  };
  return Object.assign({}, base, overrides);
}

const edges = [
  /* KILL 2 itself: reduceFrac returns a numerator past Int64. */
  ['kill2-huge-numerator', templateQuestion({}), { text: '99999999999999999999/3' }],
  ['kill2-huge-numerator-negative', templateQuestion({}), { text: '-99999999999999999999/7' }],
  ['kill2-huge-mixed-number', templateQuestion({}), { text: '99999999999999999999 1/2' }],
  ['huge-denominator', templateQuestion({}), { text: '1/99999999999999999999' }],
  ['both-huge', templateQuestion({}), { text: '99999999999999999999/88888888888888888888' }],

  /* keys the app must carry back verbatim without ever narrowing them */
  ['key-1e21', templateQuestion({ key: { typed: true, correct: -1, answer: 1e21 } }), { text: '1e21' }],
  ['key-1e21-typed-plain', templateQuestion({ key: { typed: true, correct: -1, answer: 1e21 } }),
    { text: '1000000000000000000000' }],
  ['key-negative-1e21', templateQuestion({ key: { typed: true, correct: -1, answer: -1e21 } }), { text: '-1e21' }],
  ['key-max-safe-plus-two', templateQuestion({ key: { typed: true, correct: -1, answer: 9007199254740993 } }),
    { text: '9007199254740993' }],
  ['key-minus-zero', templateQuestion({ key: { typed: true, correct: -1, answer: -0 } }), { text: '-0' }],
  ['key-minus-zero-plain', templateQuestion({ key: { typed: true, correct: -1, answer: -0 } }), { text: '0' }],
  ['key-tiny', templateQuestion({ key: { typed: true, correct: -1, answer: 5e-324 } }), { text: '0' }],
  ['key-float-sum', templateQuestion({ key: { typed: true, correct: -1, answer: 0.1 + 0.2 } }), { text: '0.3' }],
  ['key-float-sum-exact', templateQuestion({ key: { typed: true, correct: -1, answer: 0.1 + 0.2 } }),
    { text: '0.30000000000000004' }],

  /* dp declared, the money/rounding path */
  ['key-dp0', templateQuestion({ key: { typed: true, correct: -1, answer: 4.75, dp: 0 } }), { text: '5' }],
  ['key-dp2', templateQuestion({ key: { typed: true, correct: -1, answer: 4.75, dp: 2 } }), { text: '4.75' }],
  ['key-dp2-truncated', templateQuestion({ key: { typed: true, correct: -1, answer: 4.75, dp: 2 } }), { text: '4' }],

  /* fracAnswer keys, including out-of-range ones */
  ['frac-key-normal', templateQuestion({ key: { typed: true, correct: -1, answer: 0.75, fracAnswer: [3, 4] } }),
    { text: '3/4' }],
  ['frac-key-unreduced', templateQuestion({ key: { typed: true, correct: -1, answer: 0.75, fracAnswer: [6, 8] } }),
    { text: '3/4' }],
  ['frac-key-huge', templateQuestion({
    key: { typed: true, correct: -1, answer: 1, fracAnswer: [1e20, 3e20] } }), { text: '1/3' }],
  ['frac-key-zero-denominator', templateQuestion({
    key: { typed: true, correct: -1, answer: 1, fracAnswer: [1, 0] } }), { text: '1/0' }],

  /* key shapes Swift must carry without interpreting */
  ['key-answer-string', templateQuestion({ key: { typed: true, correct: -1, answer: '42' } }), { text: '42' }],
  ['key-answer-null', templateQuestion({ key: { typed: true, correct: -1, answer: null } }), { text: '42' }],
  ['key-answer-array', templateQuestion({ key: { typed: true, correct: -1, answer: [1, 2, 3] } }), { text: '1' }],
  ['key-answer-nested-object', templateQuestion({
    key: { typed: true, correct: -1, answer: 7, extras: { nested: { deep: [1, { x: null }] } } } }), { text: '7' }],
  ['key-empty', templateQuestion({ key: {} }), { text: '7' }],

  /* unicode units and the operators that look like ASCII but are not */
  ['unicode-unit-declared', templateQuestion({ unit: 'cm²', key: { typed: true, correct: -1, answer: 12, unit: 'cm²' } }),
    { text: '12 cm²' }],
  ['unicode-unit-ascii-alias', templateQuestion({ unit: 'cm²', key: { typed: true, correct: -1, answer: 12, unit: 'cm²' } }),
    { text: '12 cm2' }],
  ['unicode-minus', templateQuestion({ key: { typed: true, correct: -1, answer: -5 } }), { text: '−5' }],
  ['unicode-fraction-slash', templateQuestion({ key: { typed: true, correct: -1, answer: 0.75 } }), { text: '3⁄4' }],
  ['full-width-digits', templateQuestion({ key: { typed: true, correct: -1, answer: 6.45 } }), { text: '６．４５' }],
  ['arabic-indic-digits', templateQuestion({ key: { typed: true, correct: -1, answer: 12 } }), { text: '١٢' }],
  ['bom-prefixed', templateQuestion({ key: { typed: true, correct: -1, answer: 12 } }), { text: '﻿12' }],
  ['zwsp-inside', templateQuestion({ key: { typed: true, correct: -1, answer: 12 } }), { text: '1​2' }],
  ['rtl-override', templateQuestion({ key: { typed: true, correct: -1, answer: 12 } }), { text: '‮12' }],

  /* choice questions, including correctIndex 0 (the Bool-vs-number trap) */
  ['choice-index-zero-correct', templateQuestion({
    kind: 'choice', correctIndex: 0, choices: ['a', 'b', 'c', 'd'], choiceTexts: ['a', 'b', 'c', 'd'],
    key: { typed: false, correct: 0 } }), { choice: 0 }],
  ['choice-index-zero-wrong', templateQuestion({
    kind: 'choice', correctIndex: 0, choices: ['a', 'b', 'c', 'd'], choiceTexts: ['a', 'b', 'c', 'd'],
    key: { typed: false, correct: 0 } }), { choice: 1 }],
  ['choice-by-text', templateQuestion({
    kind: 'choice', correctIndex: 2, choices: ['a', 'b', 'c', 'd'], choiceTexts: ['a', 'b', 'c', 'd'],
    key: { typed: false, correct: 2 } }), { text: 'c' }],
  ['choice-by-plaintext', templateQuestion({
    kind: 'choice', correctIndex: 1, choices: ['<b>x</b>', '<b>y</b>', 'z', 'w'], choiceTexts: ['x', 'y', 'z', 'w'],
    key: { typed: false, correct: 1 } }), { text: 'y' }],
  ['choice-huge-index', templateQuestion({
    kind: 'choice', correctIndex: 1, choices: ['a', 'b', 'c', 'd'], choiceTexts: ['a', 'b', 'c', 'd'],
    key: { typed: false, correct: 1 } }), { choice: 2147483647 }],
  ['choice-key-correct-huge', templateQuestion({
    kind: 'choice', correctIndex: 1, choices: ['a', 'b', 'c', 'd'], choiceTexts: ['a', 'b', 'c', 'd'],
    key: { typed: false, correct: 1e21 } }), { choice: 1 }],

  /* nothing, and near-nothing */
  ['empty-answer', templateQuestion({}), { text: '' }],
  ['whitespace-answer', templateQuestion({}), { text: '   ' }],
  ['unit-only', templateQuestion({ unit: 'cm' }), { text: 'cm' }],
  ['sign-only', templateQuestion({}), { text: '-' }],
  ['dot-only', templateQuestion({}), { text: '.' }],
  ['slash-only', templateQuestion({}), { text: '/' }],
  ['divide-by-zero', templateQuestion({}), { text: '5/0' }],
  ['nan-word', templateQuestion({}), { text: 'NaN' }],
  ['infinity-word', templateQuestion({}), { text: 'Infinity' }],
  ['exponent-overflow', templateQuestion({}), { text: '1e400' }],
  ['very-long-digits', templateQuestion({}), { text: '9'.repeat(400) }]
];

for (const [name, q, answer] of edges) {
  const qi = questions.push(q) - 1;
  addPair(qi, 'edge', name, answer);
}

/* ---------- grade every pair with node, and record the verdict ---------- */
const items = pairs.map(p => ({ question: questions[p.q], answer: p.answer }));
const verdicts = [];
const BATCH = 500;
for (let i = 0; i < items.length; i += BATCH) {
  verdicts.push(...call('grade', { items: items.slice(i, i + BATCH) }).verdicts);
}
if (verdicts.length !== pairs.length) throw new Error('grade returned ' + verdicts.length + ' for ' + pairs.length);

/* Only the fields BOTH runtimes can compare exactly. Doubles are stored as JSON
   numbers, so each side reads the same text and holds the same double - printing
   differences (node "1e+21" vs Swift "1e+21") never enter the comparison.

   INDEX NORMALISATION. `expectedIndex` / `chosenIndex` are Ints on the Swift side
   because that is what a UI needs, and Swift SATURATES an out-of-range one
   (JSONValue.clampedIntValue) rather than trapping or throwing. A hostile key can
   carry `correct: 1e21`, which JavaScript keeps as a Double and Swift cannot. Both
   sides therefore record the SATURATED value, and the saturation is the same
   arithmetic on both. Real engine output is always a small index, so this only ever
   bites the hand-built hostile keys - which is the point of having them.

   The clamp bound is JavaScript's OWN safe-integer limit (2^53 - 1), not Int64's.
   Int64's bound is not exactly representable as a Double, so it could not survive a
   round trip through JSON and the two sides would disagree about the sentinel itself.
   Beyond ±(2^53 - 1) an index is not an index; both sides saturate there. */
const SAFE_MAX = 9007199254740991, SAFE_MIN = -9007199254740991;
function clampIndex(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return -1;
  if (n >= SAFE_MAX) return SAFE_MAX;
  if (n <= SAFE_MIN) return SAFE_MIN;
  return Math.trunc(n);
}

const expected = verdicts.map(v => ({
  correct: !!v.correct,
  kind: String(v.kind),
  reason: v.reason === undefined ? null : v.reason,
  expectedIndex: clampIndex(v.expectedIndex),
  chosenIndex: clampIndex(v.chosenIndex),
  parsedOk: v.parsed ? !!v.parsed.ok : null,
  parsedValue: (v.parsed && typeof v.parsed.value === 'number' && isFinite(v.parsed.value)) ? v.parsed.value : null,
  parsedUnit: v.parsed ? String(v.parsed.unit || '') : null,
  parsedFrac: (v.parsed && Array.isArray(v.parsed.frac)) ? v.parsed.frac.map(Number) : null,
  parsedReason: (v.parsed && v.parsed.reason !== undefined && v.parsed.reason !== null)
    ? String(v.parsed.reason) : null
}));

const build = call('build').build;
/* The second half of the clean-tree rule. The stamp is baked into the BUNDLE at
   build time, not recomputed here, so a clean tree holding a bundle that was itself
   built dirty would still write "-dirty" into the fixture's provenance. Refuse that
   too: rebuild the bundle from the commit, then regenerate. */
if (String(build.stamp).endsWith('-dirty')) {
  console.error('FAIL  make-parity-corpus: the committed engine bundle carries a DIRTY stamp (' + build.stamp + ').');
  console.error('      Re-run `npm run build:engine` on a clean tree and commit the bundle, then regenerate.');
  process.exit(1);
}
const corpus = {
  note: 'Generated by tools/make-parity-corpus.mjs. Both tools/parity-test.mjs and '
    + 'ios/Packages/MQEngineJS/Tests/MQEngineJSTests/ParityCorpusTests.swift re-grade every pair '
    + 'and must match `expected` exactly - which makes them agree with each other pairwise.',
  generatedAgainst: { stamp: build.stamp, payloadHash: build.payloadHash },
  counts: {
    questions: questions.length,
    pairs: pairs.length,
    wide: wideCount,
    fuzz: FUZZ_PAIRS,
    edge: edges.length,
    refs: refs.length,
    drawsPerRef: DRAWS_PER_REF
  },
  questions,
  pairs: pairs.map((p, i) => ({ q: p.q, set: p.set, name: p.name, answer: p.answer, expect: expected[i] }))
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(corpus) + '\n');
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log('wrote    tools/fixtures/parity-corpus.json  ' + kb + ' kB');
console.log('pairs    ' + pairs.length + '  (wide ' + wideCount + ', fuzz ' + FUZZ_PAIRS + ', edge ' + edges.length + ')');
console.log('questions ' + questions.length + '  from ' + refs.length + ' generator refs');
console.log('engine   ' + build.stamp + '  payload ' + build.payloadHash);
