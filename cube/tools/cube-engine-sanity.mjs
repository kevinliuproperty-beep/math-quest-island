/* cube-engine-sanity.mjs - the gate for the EXTRACTED Cube Quest engine bundle.
 *
 * Run:  node cube/tools/cube-engine-sanity.mjs          (npm run test:cube-engine)
 *       node cube/tools/cube-engine-sanity.mjs --verbose
 *       node cube/tools/cube-engine-sanity.mjs --bundle <path>     mutation testing
 *       node cube/tools/cube-engine-sanity.mjs --record            re-capture the snapshot
 *
 * WHAT THIS IS NOT. It is not a rerun of the split lane's cube-sanity.mjs. That harness
 * lives on lane/cube-split and this lane does not touch it; its 46 checks are the ALGEBRA
 * and the PLAN and they are green against code carved straight out of this bundle (proved
 * in the lane note, not here). This one exists for the NINE mutations its refutation found
 * that nothing caught, and it is built section by section against them.
 *
 * SIX SECTIONS.
 *
 *   A. THE BUNDLE LOADS WITH NO DOM. One file, evaluated in a Node vm whose global has
 *      Math and JSON and the language and nothing else. CUBE, CUBE3, INFER, GUIDE and
 *      CUBE_API must all be there afterwards, and no browser global may exist. The source
 *      is scanned too, comments and strings stripped, so a reference on a path this run
 *      does not take is caught as well.
 *
 *   B. THE FOUR BLOCKS ARE THE MONOLITH'S, BYTE FOR BYTE. Each block is located inside the
 *      bundle by its own marker and compared against the same marker's bytes in
 *      cube/index.html. Exactly one occurrence of each, in the recorded order. This is the
 *      claim the whole Extract-only ruling rests on: what ships to the iPad is the code
 *      that ships to the web, not a copy of it.
 *
 *   C. WOUND 1 - THE VALUES. Every export the API touches, compared against a snapshot
 *      recorded from the monolith: the words (CAPTION both sizes, CHANT_TWICE, preset
 *      hints AND which quiz answer is right, SLOT_NAMES, ESLOT_NAMES, ordinal, the chant
 *      table) and the geometry (placement, moveSpin, slotCentre, moveSlots, movingPieces,
 *      the matrix kernel) and INFER.blockSids for every square.
 *
 *   D. WOUND 2 - VALIDATE'S REFUSALS. The refusal corpus, one case per branch, each with
 *      its code, its whole message and its suspect list. The split fixture never reached
 *      one of these: you could DELETE the "not a real cube block" refusal and it stayed
 *      green.
 *
 *   E. WOUND 3 - THE THICKER BATTERY. The state classes the 609 random scrambles miss,
 *      built to order and asserted to actually BE those classes before they are compared.
 *
 *   F. CUBE_API AGREES WITH THE CORES. The normalisation layer is new code, so it is
 *      checked against the raw exports it wraps rather than trusted: same states, same
 *      answers, both sizes, plus the error envelope on bad input and a round-trip battery.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadBundle, loadMonolith, runValueProbe, sha, mulberry32 } from './cube-engine-probe.mjs';
import { allBlocks as markerBlocks } from '../../tools/cube-engine/markers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const BUNDLE = path.resolve(arg('--bundle')
  || path.join(ROOT, 'ios/Packages/MQCubeEngineJS/Sources/MQCubeEngineJS/Resources/cube-engine.bundle.js'));
const SOURCE = path.resolve(arg('--source') || path.join(ROOT, 'cube/index.html'));
const SNAPSHOT = path.resolve(arg('--snapshot') || path.join(here, 'fixtures', 'cube-engine-snapshot.json'));
const RECORD = process.argv.includes('--record');
const VERBOSE = process.argv.includes('--verbose');

const sha256Full = str => crypto.createHash('sha256').update(str).digest('hex');

let checks = 0;
const fails = [];
function ok(cond, what, detail) {
  checks++;
  if (!cond) fails.push(detail ? what + '  ' + detail : what);
  else if (VERBOSE) console.log('  ok  ' + what);
}
function section(t) { console.log('\n' + t); }
function report() {
  console.log('\n' + '-'.repeat(74));
  if (fails.length) {
    console.log('FAIL  ' + fails.length + ' of ' + checks + ' checks');
    for (const f of fails) console.log('  x  ' + f);
    process.exit(1);
  }
  console.log('PASS  ' + checks + ' checks, the extracted bundle is the monolith\'s logic');
  process.exit(0);
}

/* ================================================================ --record */
if (RECORD) {
  /* The snapshot is captured from the MONOLITH, never from the bundle. A snapshot taken
     from the artifact it is supposed to police proves only that the artifact equals
     itself. */
  const ns = loadMonolith(SOURCE);
  const probe = runValueProbe(ns);
  const snap = {
    note: 'Value-level oracle for the extracted cube engine. Recorded from the MONOLITH '
      + '(cube/index.html), which is the same file main ships to the web, so a bundle '
      + 'compared against it is being compared against what the child actually plays. '
      + 'Re-record deliberately with `node cube/tools/cube-engine-sanity.mjs --record`.',
    capturedFrom: path.relative(ROOT, SOURCE),
    sourceSha256: sha(fs.readFileSync(SOURCE, 'utf8')),
    probe
  };
  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify(snap, null, 1) + '\n');
  const kb = (fs.statSync(SNAPSHOT).size / 1024).toFixed(0);
  console.log('recorded ' + path.relative(ROOT, SNAPSHOT) + '  ' + kb + ' kB  from '
    + path.relative(ROOT, SOURCE) + ' (sha256 ' + snap.sourceSha256.slice(0, 16) + ')');
  for (const size of ['2', '3']) {
    const s = probe.sizes[size];
    console.log('  ' + size + 'x' + size + ': ' + s.exports.length + ' exports, '
      + s.refusals.cases.length + ' refusal cases (' + s.refusals.codes.filter(c => c !== 'OK').length + ' codes), '
      + s.battery.length + ' class states, ' + s.geometry.placements.length + ' geometry states, '
      + s.infer.total + ' infer squares, ' + s.guide.nodeCount + ' guide nodes');
  }
  process.exit(0);
}

/* ================================================================ A. the bundle loads */
section('A. the bundle loads in a bare vm, with no DOM and no browser globals');

if (!fs.existsSync(BUNDLE)) {
  ok(false, 'the cube engine bundle exists', BUNDLE + '  (run: npm run build:cube-engine)');
  report();
}
const bundleText = fs.readFileSync(BUNDLE, 'utf8');
let ns;
try {
  ns = loadBundle(BUNDLE);
  ok(true, 'cube-engine.bundle.js evaluates in a vm with no browser globals');
} catch (e) {
  ok(false, 'the bundle threw in a bare vm', String((e && e.message) || e));
  report();
}
for (const n of ['CUBE', 'CUBE3', 'INFER', 'GUIDE']) ok(!!ns[n], n + ' is exported by the bundle');
ok(!!ns.CUBE_API, 'CUBE_API is exported by the bundle');
ok(ns.CUBE !== ns.CUBE3, 'the two cube sizes are separate namespaces, not one shadowing the other');
for (const g of ['window', 'document', 'navigator', 'localStorage', 'setTimeout', 'fetch', 'alert',
                 'requestAnimationFrame', 'XMLHttpRequest', 'location', 'speechSynthesis']) {
  ok(typeof ns.context[g] === 'undefined', 'the bundle did not invent `' + g + '`');
}

/* source scan, comments and strings stripped, so a reference this run does not execute
   is caught too */
function stripCodeOnly(src) {
  let out = '', i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; out += ' '; continue; }
    if (c === '/' && d === '/') { const j = src.indexOf('\n', i); i = j < 0 ? n : j; out += ' '; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; out += ' "" '; continue;
    }
    out += c; i++;
  }
  return out;
}
{
  const code = stripCodeOnly(bundleText);
  const hits = [];
  /* `console` is deliberately absent from this list: the host shim installs a buffered
     one on purpose, and a Swift test asserts it is the shim's and not the host's. */
  for (const g of ['document', 'window', 'navigator', 'localStorage', 'sessionStorage',
                   'requestAnimationFrame', 'setTimeout', 'setInterval', 'alert',
                   'speechSynthesis', 'fetch', 'XMLHttpRequest', 'HTMLElement', 'location']) {
    const re = new RegExp('(^|[^\\w$.])' + g + '\\b', 'g');
    let m;
    while ((m = re.exec(code))) hits.push(g + '@' + code.slice(0, m.index).split('\n').length);
  }
  ok(hits.length === 0, 'no browser global appears anywhere in the bundle source', hits.slice(0, 8).join(', '));
}

/* ================================================================ B. byte identity */
section('B. the four blocks are cube/index.html\'s own bytes');

/* WOUND 6. This used to be four free non-greedy regexes declared right here, while the
   extractor next door insisted on a whole-line match. An INDENTED end marker planted inside
   CORE therefore built, --check'd and --record-guard'd clean, and was caught only because
   the two tools then disagreed about the block's bytes - a check that fires because two
   tools disagree is not a check. There is now ONE matcher, in tools/cube-engine/markers.mjs,
   and the extractor, this gate, the probe and the golden recorder all import it. */
const allBlocks = markerBlocks;
if (!fs.existsSync(SOURCE)) {
  ok(false, 'cube/index.html exists to compare against', SOURCE);
} else {
  const html = fs.readFileSync(SOURCE, 'utf8');
  const inHtml = allBlocks(html);
  const inBundle = allBlocks(bundleText);
  let last = -1;
  for (const name of ['CORE', 'CORE3', 'INFER', 'GUIDE']) {
    ok(inHtml[name].length === 1, name + ' appears exactly once in cube/index.html',
       'found ' + inHtml[name].length);
    ok(inBundle[name].length === 1, name + ' appears exactly once in the bundle',
       'found ' + inBundle[name].length);
    if (inHtml[name].length === 1 && inBundle[name].length === 1) {
      ok(inHtml[name][0] === inBundle[name][0],
         name + ' is byte-identical between cube/index.html and the bundle  ('
         + inHtml[name][0].length + ' bytes, sha ' + sha(inHtml[name][0]).slice(0, 16) + ')');
      const at = bundleText.indexOf(inBundle[name][0]);
      ok(at > last, name + ' sits after the block before it in the bundle');
      last = at;
    }
  }
  /* the guard file's recorded hashes must still describe this source */
  const guardPath = path.join(ROOT, 'tools/cube-engine/block-guard.json');
  if (fs.existsSync(guardPath)) {
    const guard = JSON.parse(fs.readFileSync(guardPath, 'utf8'));
    for (const name of ['CORE', 'CORE3', 'INFER', 'GUIDE']) {
      const g = guard.blocks[name];
      ok(!!g, 'block-guard.json records ' + name);
      if (g && inHtml[name].length === 1) {
        ok(sha(inHtml[name][0]).slice(0, 16) === g.blockSha256,
           'block-guard.json\'s recorded sha for ' + name + ' still matches cube/index.html',
           g.blockSha256 + ' vs ' + sha(inHtml[name][0]).slice(0, 16));
      }
    }
  } else {
    ok(false, 'tools/cube-engine/block-guard.json exists', guardPath);
  }
}

/* ================================================================ the probe */
if (!fs.existsSync(SNAPSHOT)) {
  section('C-E. the value snapshot');
  ok(false, 'the value snapshot exists', SNAPSHOT + '  (capture it with --record)');
  report();
}
const snap = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
const want = snap.probe;
const got = runValueProbe(ns, want.opts);

/* Walk two probe results together and name the first few places they part company. */
function walk(a, b, p, out) {
  if (out.length > 200) return;
  if (a === b) return;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(p + ': ' + short(a) + ' -> ' + short(b));
    return;
  }
  if (Array.isArray(a) !== Array.isArray(b)) { out.push(p + ': array/object shape changed'); return; }
  if (Array.isArray(a)) {
    if (a.length !== b.length) { out.push(p + ': length ' + a.length + ' -> ' + b.length); return; }
    for (let i = 0; i < a.length; i++) walk(a[i], b[i], p + '[' + i + ']', out);
    return;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) walk(a[k], b[k], p ? p + '.' + k : k, out);
}
function short(v) { const s = JSON.stringify(v); return s === undefined ? 'undefined' : (s.length > 70 ? s.slice(0, 67) + '...' : s); }
function compare(label, a, b) {
  const misses = [];
  walk(a, b, '', misses);
  ok(misses.length === 0, label,
     misses.length ? '(' + misses.length + ' differences, first: ' + misses.slice(0, 4).join(' | ') + ')' : '');
  return misses.length;
}

/* ================================================================ C. wound 1 */
section('C. wound 1 - the VALUES behind the exports, not just their names');
console.log('   snapshot captured from ' + snap.capturedFrom + '  (source sha256 ' + snap.sourceSha256.slice(0, 16) + ')');

for (const size of ['2', '3']) {
  const w = want.sizes[size], g = got.sizes[size];
  const tag = size + 'x' + size + ': ';
  compare(tag + 'the export surface is unchanged (' + w.exports.length + ' names)', w.exports, g.exports);

  /* THE WORDS. Named one by one rather than compared as a blob, because a red gate has
     to say WHICH sentence moved - these are the words the child reads and a Cube Quest
     law forbids changing them silently. */
  for (const k of Object.keys(w.words)) {
    compare(tag + 'words: ' + k + ' is verbatim', w.words[k], g.words[k]);
  }
  ok(sha(w.words) === sha(g.words), tag + 'the whole word surface hashes equal (' + sha(w.words).slice(0, 16) + ')');

  /* THE GEOMETRY. Same treatment: a SceneKit view is the consumer and a sign flip in
     moveSpin makes every prime move animate backwards with no other symptom. */
  for (const k of Object.keys(w.geometry)) {
    compare(tag + 'geometry: ' + k + ' matches the monolith', w.geometry[k], g.geometry[k]);
  }
  console.log('   ' + String(w.geometry.placements.length).padStart(4) + '  ' + tag + 'geometry states, '
    + w.geometry.placements[0].rows.length + ' pieces each');

  compare(tag + 'INFER.blockSids / pieceOf for every one of the ' + w.infer.total + ' squares',
          w.infer, g.infer);
  compare(tag + 'the guided script, node by node (' + w.guide.nodeCount + ' nodes)', w.guide, g.guide);
  ok(w.guide.textHash === g.guide.textHash,
     tag + 'the guided script text is byte-identical (' + w.guide.textHash + ')');
}

/* ================================================================ D. wound 2 */
section('D. wound 2 - validate\'s refusals, which the split fixture never reached');

for (const size of ['2', '3']) {
  const w = want.sizes[size].refusals, g = got.sizes[size].refusals;
  const tag = size + 'x' + size + ': ';
  const codes = w.codes.filter(c => c !== 'OK');
  console.log('   ' + String(w.cases.length).padStart(4) + '  ' + tag + 'refusal cases over '
    + codes.length + ' codes: ' + codes.join(', '));
  if (w.unreached && w.unreached.length) {
    console.log('         ' + tag + 'not reached by this corpus: ' + w.unreached.join(', '));
  }
  /* the unreached list is part of the record: a branch becoming reachable, or a reached
     one going quiet, is a diff a reviewer sees rather than a number that moves */
  compare(tag + 'the reached / unreached refusal branches are unchanged',
          { codes: w.codes, unreached: w.unreached }, { codes: g.codes, unreached: g.unreached });
  compare(tag + 'every refusal case reproduces (code, whole message and suspect list)', w, g);
  ok(w.cases.length > 0, tag + 'the refusal corpus is not empty');
  /* the branch the refutation could delete outright and stay green */
  const central = w.cases.filter(c => c.code === 'notreal' || c.code === 'enotreal');
  ok(central.length > 0, tag + 'the "that is not a real cube block" refusal is exercised by name');
  /* and the shallow ones, which a swap can never produce */
  for (const need of ['blank', 'odd', 'counts']) {
    ok(w.cases.some(c => c.code === need), tag + 'the `' + need + '` refusal is exercised');
  }
  if (size === '3') {
    for (const need of ['flip', 'parity']) {
      ok(w.cases.some(c => c.code === need), tag + 'the `' + need + '` refusal is exercised');
    }
  }
  /* every recorded refusal must still REFUSE - not merely return the same object shape */
  const stillRefuses = g.cases.every(c => c.code && c.code !== 'OK' && c.msg.length > 0);
  ok(stillRefuses, tag + 'every corpus painting is still refused, with a message');
}

/* ================================================================ E. wound 3 */
section('E. wound 3 - the state classes the 609-state battery misses');

for (const size of ['2', '3']) {
  const w = want.sizes[size].battery, g = got.sizes[size].battery;
  const tag = size + 'x' + size + ': ';
  console.log('   ' + String(w.length).padStart(4) + '  ' + tag + 'class states');
  compare(tag + 'every class state\'s predicates, validate, plan and geometry match', w, g);

  /* A fixture that quietly stops containing its own class is worse than no fixture, so
     the classes are asserted to BE what they claim before they are compared. */
  const labels = g.map(r => r.label);
  const CC = size === '2' ? ns.CUBE : ns.CUBE3;
  if (size === '2') {
    const t = g.find(r => r.label === 'twist-class:11111112');
    ok(!!t, '2x2: the unsampled twist multiset 11111112 is in the corpus');
    ok(t && t.validate.ok === true, '2x2: ...and it is a LEGAL cube (twist sum 9, a multiple of 3)');
    const built = g.filter(r => r.pred.step1Done && r.pred.step1Done.v === true);
    ok(built.length >= 3, '2x2: step1Done is TRUE in at least 3 corpus states  [' + built.length + ']',
       'the 609-state battery had exactly one witness');
    const unfinished = built.filter(r => r.pred.facesAllOneColour && r.pred.facesAllOneColour.v === false);
    ok(unfinished.length >= 1, '2x2: ...and at least one of them is an UNFINISHED cube');
    const spun = g.filter(r => r.pred.facesAllOneColour && r.pred.facesAllOneColour.v === true
                            && r.key !== CC.keyOf(CC.solved()));
    ok(spun.length >= 4, '2x2: a finished cube standing in another orientation  [' + spun.length + ']');
  } else {
    const rot = g.filter(r => /^rotated-frame/.test(r.label));
    ok(rot.length >= 10, '3x3: frame-rotated states are in the corpus  [' + rot.length + ']',
       'the 609-state battery had 2, both presets');
    ok(rot.every(r => r.validate.ok === true),
       '3x3: ...and every one is LEGAL - validate normalises the frame before reading parity');
    const parityMismatch = rot.filter(r => {
      const s = keyToState3(r.key);
      return s && CC.permParity(s.cp) !== CC.permParity(s.ep);
    });
    ok(parityMismatch.length >= 1,
       '3x3: ...including states whose RAW cp/ep parities differ  [' + parityMismatch.length + ']',
       'this is the branch the 609 states reached twice');
    ok(labels.some(l => /^daisyAnywhere/.test(l)), '3x3: daisyAnywhere is in the corpus');
    ok(labels.some(l => /^daisyDone/.test(l)), '3x3: daisyDone is in the corpus');
  }
}
function keyToState3(key) {
  const p = String(key).split('.');
  if (p.length !== 5) return null;
  return { cp: p[0].split('').map(Number), ep: p[2].split(',').map(Number) };
}

/* ================================================================ F. CUBE_API */
section('F. CUBE_API answers what the cores answer (the normalisation layer is new code)');

const API = ns.CUBE_API;
const rawCall = (m, a) => API[m](a === undefined ? undefined : JSON.stringify(a));
const call = (m, a) => JSON.parse(rawCall(m, a));

{
  const b = call('build');
  ok(b.ok === true, 'build() answers');
  ok(b.build.blocks.length === 4, 'build() names four extracted blocks');
  ok(b.build.exportCounts.CUBE === Object.keys(ns.CUBE).length
     && b.build.exportCounts.CUBE3 === Object.keys(ns.CUBE3).length,
     'build() reports the real export counts ('
     + Object.keys(ns.CUBE).length + ' / ' + Object.keys(ns.CUBE3).length + ')');
  const stamp = (bundleText.match(/\/\* CUBE_ENGINE_BUILD ([^\s*]+) \*\//) || [])[1] || null;
  ok(stamp !== null && b.build.stamp === stamp,
     'build().stamp matches the CUBE_ENGINE_BUILD line in the file  (' + stamp + ')');
}

for (const size of [2, 3]) {
  const CC = size === 2 ? ns.CUBE : ns.CUBE3;
  const tag = size + 'x' + size + ': ';

  /* deterministic scrambles: the same seed twice, and the moves the core would make */
  const a1 = call('scramble', { size, seed: 1234, depth: 20 });
  const a2 = call('scramble', { size, seed: 1234, depth: 20 });
  ok(a1.ok && a1.key === a2.key && a1.moves.join(' ') === a2.moves.join(' '),
     tag + 'scramble(seed) is deterministic');
  const direct = CC.applySeq(CC.solved(), CC.randomScramble(20, mulberry32(1234)));
  ok(a1.key === CC.keyOf(direct), tag + 'scramble(seed) is the core\'s own randomScramble');

  /* the round trip, through the API only */
  const undo = call('applyMoves', { size, state: a1.state, moves: CC.invertSeq(a1.moves) });
  ok(undo.ok && call('isSolved', { size, state: undo.state }).solved === true,
     tag + 'applyMoves undoes a scramble back to solved');

  /* the whole-turn asymmetry: 'y' is a MOVE on the big cube and a pair on the small one */
  const wsolved = call('newSolved', { size });
  const wy = call('applyMoves', { size, state: wsolved.state, moves: 'y' });
  ok(wy.ok === true, tag + 'applyMoves accepts the whole-turn key `y` on both sizes');
  ok(wy.ok && call('isSolved', { size, state: wy.state }).facesAllOneColour === true,
     tag + '...and a whole turn leaves every side one colour');

  /* isSolved's two readings */
  const iso = call('isSolved', { size, state: wy.state });
  ok(iso.solved === false && iso.facesAllOneColour === true,
     tag + 'isSolved separates "keyed solved" from "every side one colour"');

  /* stickers / validate agree with the core */
  const st = call('stickers', { size, state: a1.state });
  ok(JSON.stringify(st.stickers) === JSON.stringify(CC.stateToStickers(a1.state)),
     tag + 'stickers() is stateToStickers()');
  const val = call('validate', { size, stickers: st.stickers });
  ok(val.result.ok === true && val.result.key === a1.key,
     tag + 'validate() accepts a real painting and rebuilds the same cube');

  /* EVERY refusal in the SNAPSHOT, fed back in through the API rather than the core. This
     is the one that would have caught the deleted "not a real cube block" branch: the
     paintings come out of a file recorded from the monolith, so they cannot drift with the
     code they are testing. */
  const corpus = want.sizes[String(size)].refusals.cases;
  let apiAgreed = 0;
  const apiDrift = [];
  for (const c of corpus) {
    const r = call('validate', { size, stickers: c.stickers });
    if (r.ok && r.result.ok === false && r.result.code === c.code && r.result.message === c.msg
        && JSON.stringify(r.result.suspects) === JSON.stringify(c.suspects)) apiAgreed++;
    else apiDrift.push(c.how + ' -> ' + (r.ok ? (r.result.ok ? 'ACCEPTED' : r.result.code) : 'THREW'));
  }
  ok(apiAgreed === corpus.length,
     tag + 'all ' + corpus.length + ' recorded refusals come back identically through CUBE_API',
     apiDrift.slice(0, 4).join(' | '));
  const blank = call('validate', { size, stickers: new Array(size === 2 ? 24 : 54).fill(null) });
  ok(blank.result.ok === false && blank.result.code === 'blank',
     tag + 'validate() through the API refuses an empty painting');
  const tooMany = call('validate', { size, stickers: new Array((size === 2 ? 24 : 54) + 1).fill('white') });
  ok(tooMany.ok === false && /has \d+ squares/.test(tooMany.error.message),
     tag + 'validate() through the API names an over-long sticker list');

  /* stepStatus agrees with the cores' own predicates */
  const ss = call('stepStatus', { size, state: a1.state });
  ok(ss.steps.length === (size === 2 ? 3 : 8), tag + 'stepStatus reports every method step');
  if (size === 2) {
    ok(ss.steps[0].done === (CC.layerIntact(a1.state) !== null), tag + 'step 1 is layerIntact');
    ok(ss.extras.step1DoneAtCeiling === CC.step1Done(a1.state),
       tag + 'step1Done travels alongside step 1, not as it');
    ok(ss.steps[1].done === CC.ceilingAllYellow(a1.state), tag + 'step 2 is ceilingAllYellow');
    ok(ss.steps[2].done === CC.facesAllOneColour(a1.state), tag + 'step 3 is facesAllOneColour');
  } else {
    ok(ss.steps[0].done === CC.daisyDone(a1.state), tag + 'step 1 is daisyDone');
    ok(ss.steps[3].done === CC.twoLayersDone(a1.state), tag + 'step 4 is twoLayersDone');
    ok(ss.extras.resumePoint === CC.resumePoint(a1.state), tag + 'resumePoint travels with the steps');
  }

  /* buildPlan: the beats must actually solve the cube, replayed through the API */
  let solvedPlans = 0, endMatched = 0, planned = 0;
  const rnd = mulberry32(size === 2 ? 8888 : 9999);
  for (let i = 0; i < 25; i++) {
    const s = CC.randomState(8 + (i % 15), rnd);
    const r = call('buildPlan', { size, state: s });
    if (!r.ok || !r.plan || !r.plan.ok) continue;
    planned++;
    let cur = s;
    for (const b of r.plan.beats) cur = CC.applySeq(cur, b.moves || []);
    if (CC.facesAllOneColour(cur)) solvedPlans++;
    if (r.plan.endKey && CC.keyOf(cur) === r.plan.endKey) endMatched++;
  }
  ok(planned === 25, tag + 'buildPlan() answered on all 25 states', planned + ' planned');
  ok(solvedPlans === planned, tag + 'replaying the API\'s beats solves the cube (' + planned + ' plans)');
  ok(endMatched === planned, tag + 'the replay lands on the plan\'s own recorded end state');

  /* the guided script, and one node fetched by id */
  const gs = call('guideScript', { size });
  ok(gs.script.nodeCount === (size === 2 ? 28 : 75),
     tag + 'guideScript returns every node (' + gs.script.nodeCount + ')');
  const raw = got.sizes[String(size)].guide;
  const apiHash = sha(gs.script.nodes.map(n => n.id + ' ' + n.say + ' ' + n.why + ' ' + n.title).join(''));
  ok(apiHash === raw.textHash, tag + 'guideScript\'s text hashes equal to GUIDE.build()\'s own');
  const one = call('guideNode', { size, id: gs.script.order[3] });
  ok(one.node.say === gs.script.nodes[3].say, tag + 'guideNode(id) returns the same words as the script');
  const missing = call('guideNode', { size, id: 'no-such-node' });
  ok(missing.ok === false && missing.error.where === 'guideNode',
     tag + 'guideNode names an unknown id in the error envelope');

  /* geometry: the API's rows must be the cores' own placement output */
  const geo = call('geometry', { size, state: a1.state });
  const wantPieces = size === 2 ? 8 : 26;
  ok(geo.pieces.length === wantPieces, tag + 'geometry returns ' + wantPieces + ' pieces');
  const p0 = size === 2 ? CC.placement(a1.state, 0) : CC.placement(a1.state, 'c', 0);
  ok(JSON.stringify(geo.pieces[0].m) === JSON.stringify(p0.m)
     && JSON.stringify(geo.pieces[0].t) === JSON.stringify(p0.t),
     tag + 'geometry rows are placement()\'s own matrix and centre');
  const mg = call('moveGeometry', { size, state: a1.state, move: 'R' });
  ok(mg.deg === CC.moveSpin('R').deg && JSON.stringify(mg.axis) === JSON.stringify(CC.moveSpin('R').axis),
     tag + 'moveGeometry is moveSpin()');
  const mgw = call('moveGeometry', { size, state: a1.state, move: 'x2' });
  ok(mgw.ok === true && mgw.isWhole === true && mgw.pieces.length === wantPieces,
     tag + 'moveGeometry handles a whole-cube turn on both sizes');

  /* bestQuestion through the API, against INFER directly.
     WOUND 1: the API used to call INFER with {} while the web calls it with
     { nameable: canNameByColour }, and this very check could not see it because it compared
     CUBE_API to INFER with the same empty opts. Now BOTH answers come back and both are
     checked against the thing they are supposed to be. */
  const painted = st.stickers.map((c, i) => (i % 4 === 0 ? c : null));
  const bq = call('bestQuestion', { size, painted });
  const comp = ns.INFER.completions(CC, painted, { cap: 240, budget: 20000 });
  const rawPlain = ns.INFER.bestQuestion(CC, painted, comp.list, {});
  ok(bq.completions.count === comp.count, tag + 'bestQuestion reports INFER\'s own completion count');
  ok(JSON.stringify(bq.plain && bq.plain.sid) === JSON.stringify(rawPlain && rawPlain.sid),
     tag + 'bestQuestion\'s `plain` answer is INFER with no options, unchanged');
  ok(Array.isArray(bq.nameable) && bq.nameable.length === (size === 2 ? 24 : 54),
     tag + 'bestQuestion resolves the nameable predicate the web supplies');
  const rawNamed = ns.INFER.bestQuestion(CC, painted, comp.list,
    { nameable: sid => !!bq.nameable[sid], slack: 1 });
  ok(JSON.stringify(bq.best && bq.best.sid) === JSON.stringify(rawNamed && rawNamed.sid),
     tag + 'bestQuestion\'s `best` answer is INFER WITH the nameable predicate');
  ok(bq.ranking.length > 0, tag + 'the whole ask ranking comes back, not just the winner');
  ok(bq.plainRanking.length > 0, tag + 'and the un-named ranking beside it');
  /* an explicit boolean array must be honoured, and an all-false one must fall back to plain */
  const none = new Array(size === 2 ? 24 : 54).fill(false);
  const bqNone = call('bestQuestion', { size, painted, nameable: none });
  ok(JSON.stringify(bqNone.best && bqNone.best.sid) === JSON.stringify(rawPlain && rawPlain.sid),
     tag + 'a caller-supplied all-false nameable array falls back to the plain answer');

  /* stateIn's domain checks (wound 5): a nonsense cube is REFUSED, not answered */
  {
    const nonsense = size === 2 ? { cp: [0,0,0,0,0,0,0,0], co: [0,0,0,0,0,0,0,0] }
                                : { cp: [0,0,0,0,0,0,0,0], co: [0,0,0,0,0,0,0,0],
                                    ep: [0,0,0,0,0,0,0,0,0,0,0,0], eo: [0,0,0,0,0,0,0,0,0,0,0,0],
                                    cn: [0,0,0,0,0,0] };
    const p = call('buildPlan', { size, state: nonsense });
    ok(p.ok === false && p.error.code === 'bad-state',
       tag + 'a cp of all zeros is refused, not answered with "plan ok, beats 0"',
       JSON.stringify(p).slice(0, 120));
    const big = JSON.parse(JSON.stringify(nonsense));
    big.cp = [9007199254740993, 1, 2, 3, 4, 5, 6, 7];
    const bigR = call('isSolved', { size, state: big });
    ok(bigR.ok === false && bigR.error.code === 'bad-state',
       tag + 'a number too big for a fixed-width integer is refused by name');
    const frac = JSON.parse(JSON.stringify(a1.state));
    frac.co = frac.co.slice(); frac.co[0] = 0.5;
    const fracR = call('stepStatus', { size, state: frac });
    ok(fracR.ok === false && fracR.error.code === 'bad-state',
       tag + 'a fractional orientation is refused by name');
    const neg = JSON.parse(JSON.stringify(a1.state));
    neg.co = neg.co.slice(); neg.co[0] = -1;
    const negR = call('stepStatus', { size, state: neg });
    ok(negR.ok === false && negR.error.code === 'bad-state',
       tag + 'a negative orientation is refused by name');
    /* and validateState says the same thing, in a shape a UI can show */
    const vs = call('validateState', { size, state: nonsense });
    ok(vs.ok === true && vs.domainOk === false && vs.problems.length > 0,
       tag + 'validateState names the problems instead of throwing');
    const vsGood = call('validateState', { size, state: a1.state });
    ok(vsGood.ok === true && vsGood.domainOk === true && vsGood.legal === true,
       tag + 'validateState accepts a real cube and says it is legal');
  }

  /* words through the API */
  const wds = call('words', { size });
  const rawWords = got.sizes[String(size)].words;
  ok(JSON.stringify(wds.words.CAPTION) === JSON.stringify(rawWords.CAPTION),
     tag + 'words() carries CAPTION verbatim');
  ok(JSON.stringify(wds.words.PRESETS) === JSON.stringify(rawWords.PRESETS),
     tag + 'words() carries PRESETS in full, including which quiz answer is right');
  ok(JSON.stringify(wds.words.ordinal) === JSON.stringify(rawWords.ordinal),
     tag + 'words() carries ordinal(0..8)');
  if (size === 2) {
    ok(wds.words.CHANT_TWICE === String(CC.CHANT_TWICE), tag + 'words() carries CHANT_TWICE');
    ok(JSON.stringify(wds.words.SLOT_NAMES) === JSON.stringify(CC.SLOT_NAMES), tag + 'words() carries SLOT_NAMES');
  } else {
    ok(JSON.stringify(wds.words.ESLOT_NAMES) === JSON.stringify(CC.ESLOT_NAMES), tag + 'words() carries ESLOT_NAMES');
  }

  /* the error envelope */
  const badState = call('applyMoves', { size, state: { cp: [0, 1], co: [0] }, moves: 'R' });
  ok(badState.ok === false && /state\.cp must be an array of 8/.test(badState.error.message),
     tag + 'a malformed state comes back as a named error, not a crash');
  const badMove = call('applyMoves', { size, state: a1.state, moves: 'Q' });
  ok(badMove.ok === false && badMove.error.stack.length > 0,
     tag + 'an unknown move comes back with a JS stack');
  ok(badMove.error.code === 'bad-move', tag + 'and with a runtime-independent code');
  /* WOUND 7: the host's own JSON parser wording must not cross the boundary in `message` */
  const badJSON = JSON.parse(API.applyMoves('{oops'));
  ok(badJSON.ok === false && badJSON.error.code === 'bad-json',
     tag + 'bad JSON comes back as the code `bad-json`');
  ok(badJSON.error.message === 'applyMoves: arguments were not JSON',
     tag + '...and the message carries no runtime-specific parser text',
     JSON.stringify(badJSON.error.message));
  ok(typeof badJSON.error.hostDetail === 'string' && badJSON.error.hostDetail.length > 0,
     tag + '...with the runtime\'s own wording quarantined in hostDetail');
}
{
  const bad = call('newSolved', { size: 4 });
  ok(bad.ok === false && /size must be 2 or 3/.test(bad.error.message), 'size 4 is refused by name');
}


/* ================================================================ G. the golden corpus */
/* KILL 1. tools/cube-engine/api.js is not one of the four guarded blocks, the snapshot is
   recorded from a monolith that contains no CUBE_API at all, and section F above checks
   the normalisation layer by SPOT CHECK. Eleven refuter corruptions of api.js rode through
   all of it: every edge block's stickers swapped faces, the wrong four blocks animating on
   every turn, the six face normals reversed, every sentence of the coached solve replaced,
   the method restarting at step 1 forever, the colour map dropped after a legal painting.

   tools/fixtures/cube-api-golden.json is the value oracle those needed. It is recorded from
   cube/index.html itself by tools/make-cube-api-golden.mjs - which refuses to record unless
   CUBE_API agrees with the cores' own functions AND with the page's own canNameByColour -
   and everything below replays it through the COMMITTED BUNDLE and compares the engine's
   own JSON strings, hash for hash. */
section('G. kill 1 - the golden corpus: CUBE_API\'s own answers, hash for hash');

const GOLDEN = path.resolve(arg('--golden') || path.join(ROOT, 'tools/fixtures/cube-api-golden.json'));
if (!fs.existsSync(GOLDEN)) {
  ok(false, 'the CUBE_API golden corpus exists', GOLDEN + '  (record it: npm run build:cube-api-golden)');
  report();
}
const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
const gsha = str => sha(str);   /* the probe's sha() is sha256 truncated to 32, same as the recorder's */

{
  const srcSha = fs.existsSync(SOURCE) ? sha256Full(fs.readFileSync(SOURCE, 'utf8')) : null;
  ok(golden.sourceSha256 === srcSha,
     'the golden was recorded from THIS cube/index.html',
     'golden ' + String(golden.sourceSha256).slice(0, 16) + ' vs page ' + String(srcSha).slice(0, 16)
     + '  (re-record: npm run build:cube-api-golden)');
  const apiPath = path.join(ROOT, 'tools/cube-engine/api.js');
  const apiSha = fs.existsSync(apiPath) ? sha256Full(fs.readFileSync(apiPath, 'utf8')) : null;
  ok(golden.apiSha256 === apiSha,
     'the golden was recorded from THIS tools/cube-engine/api.js',
     'golden ' + String(golden.apiSha256).slice(0, 16) + ' vs api.js ' + String(apiSha).slice(0, 16)
     + '  (api.js changed - re-record the golden and read the diff)');
  ok(golden.statesPerSize >= 300, 'the golden battery carries at least 300 states per size  ['
     + golden.statesPerSize + ']');
  ok(golden.liftedPredicate && golden.liftedPredicate.names.indexOf('canNameByColour') >= 0,
     'the golden lifted the page\'s own canNameByColour to check the reimplementation against');
}

for (const size of [2, 3]) {
  const band = golden.sizes[String(size)];
  const tag = size + 'x' + size + ': ';
  if (!band) { ok(false, tag + 'the golden carries this size'); continue; }

  ok(band.rows.length >= 300, tag + 'the golden battery has ' + band.rows.length + ' states');
  ok(new Set(band.rows.map(r => r.key)).size === band.rows.length,
     tag + 'every golden state is a DIFFERENT cube (a repeated row proves nothing)');
  ok(call('newSolved', { size }).key === band.solvedKey, tag + 'the solved key matches the golden');

  /* the singletons */
  ok(gsha(rawCall('words', { size })) === band.words, tag + 'words() is the golden\'s, byte for byte');
  ok(gsha(rawCall('guideScript', { size })) === band.guideScript,
     tag + 'guideScript() is the golden\'s in full (' + band.guideNodeCount + ' nodes)');
  {
    const script = call('guideScript', { size });
    ok(gsha(script.script.nodes.map(n => n.id + ' ' + n.say + ' ' + n.why + ' ' + n.title).join(''))
       === band.guideScriptText, tag + 'the guided script TEXT hashes to the golden');
    let nodeBad = 0, firstNode = null;
    for (const id of Object.keys(band.guideNodes)) {
      if (gsha(rawCall('guideNode', { size, id })) !== band.guideNodes[id]) {
        nodeBad++; if (!firstNode) firstNode = id;
      }
    }
    ok(nodeBad === 0, tag + 'guideNode(id) matches the golden for all '
       + Object.keys(band.guideNodes).length + ' nodes',
       nodeBad ? nodeBad + ' differ, first: ' + firstNode : '');
  }

  /* the battery */
  const misses = [];
  let cells = 0, moveCells = 0, questionCells = 0, differing = 0;
  for (const row of band.rows) {
    const state = row.state;
    for (const [method, want] of Object.entries(row.calls)) {
      const args = method === 'validate'
        ? { size, stickers: call('stickers', { size, state }).stickers }
        : { size, state };
      const got = gsha(rawCall(method, args));
      cells++;
      if (got !== want) misses.push(row.label + '/' + method);
    }
    for (const [move, want] of Object.entries(row.moveGeometry || {})) {
      const got = gsha(rawCall('moveGeometry', { size, state, move }));
      moveCells++;
      if (got !== want) misses.push(row.label + '/moveGeometry(' + move + ')');
    }
    /* applyMoves, chants and whole-cube turns included. This is the one method the state
       battery would otherwise never reach, and `inverse` is a field a corruption can move
       without touching anything else. */
    for (const [seq, want] of Object.entries(row.applyMoves || {})) {
      const got = gsha(rawCall('applyMoves', { size, state, moves: seq }));
      moveCells++;
      if (got !== want) misses.push(row.label + '/applyMoves(' + seq + ')');
    }
    for (const q of row.questions || []) {
      const gotBest = gsha(rawCall('bestQuestion', { size, painted: q.painted }));
      const gotPlain = gsha(rawCall('bestQuestion', { size, painted: q.painted, nameable: false }));
      questionCells += 2;
      if (gotBest !== q.bestQuestion) misses.push(row.label + '/bestQuestion(' + q.kind + ')');
      if (gotPlain !== q.bestQuestionPlain) misses.push(row.label + '/bestQuestion-plain(' + q.kind + ')');
      if (q.differs) differing++;
    }
    if (misses.length > 40) break;
  }
  ok(misses.length === 0,
     tag + cells + ' state calls + ' + moveCells + ' move-geometry calls + ' + questionCells
     + ' ask calls all match the golden',
     misses.length ? misses.length + '+ differ, first: ' + misses.slice(0, 5).join(', ') : '');
  console.log('   ' + String(band.rows.length).padStart(4) + '  ' + tag + 'golden states, '
    + (cells + moveCells + questionCells) + ' CUBE_API calls replayed');

  /* THE NAMEABLE BRANCH IS ALIVE. If somebody drops the predicate again, every one of these
     rows goes back to agreeing with `plain` - so the count is asserted by name and not left
     to a hash that could be re-recorded without anyone noticing what it meant. */
  const allQ = band.rows.flatMap(r => r.questions || []);
  ok(allQ.length >= 2 * band.rows.length,
     tag + 'every golden state carries both painting shapes  [' + allQ.length + ']');
  const varied = new Set(allQ.map(q => q.nameableCount));
  ok(varied.size > 5, tag + 'the nameable predicate is not constant across the battery  ['
     + varied.size + ' distinct counts, min ' + Math.min(...varied) + ', max ' + Math.max(...varied) + ']');
  if (size === 3) {
    ok(differing >= 25,
       '3x3: the nameable option CHANGES THE QUESTION in ' + differing + ' golden paintings',
       'the web asks with { nameable: canNameByColour }; if this drops to 0 the bridge is '
       + 'asking a different question from the web again');
  }
}

report();
