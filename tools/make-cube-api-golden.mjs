/* make-cube-api-golden.mjs - THE VALUE ORACLE FOR CUBE_API.
 *
 * ==========================================================================
 * KILL 1 OF THE EXTRACT REFUTATION, in the refuter's own words
 * ==========================================================================
 *
 *   "tools/cube-engine/api.js is NOT one of the four marked blocks. Section B's byte check
 *    compares the blocks; block-guard.json guards the blocks; the snapshot is recorded from
 *    the monolith, which contains no CUBE_API at all. So the only thing standing between an
 *    edit to api.js and the iPad is section F's spot checks and the Swift bridge suite -
 *    and both check SHAPES AND COUNTS, never VALUES."
 *
 * Eleven corruptions of api.js passed every gate on both sides. Six of them geometry:
 * every edge block's two stickers swapped faces; corner colours read off the slot instead
 * of the piece; the wrong four blocks animating on every face turn; the six face normals
 * pointing the wrong way; every middle square showing the next face's colour; the edge
 * block list reversed. Five more: every sentence of the coached solve replaced; the
 * painter's swatch order reversed; the step rail's words replaced; the method restarting at
 * step 1 forever; the colour map the painter needs dropped after a legal painting.
 *
 * THIS FILE IS THE ANSWER. It records what CUBE_API ANSWERS, verbatim-by-hash, for a fixed
 * battery of states, and freezes it in tools/fixtures/cube-api-golden.json. Both gates -
 * cube/tools/cube-engine-sanity.mjs on the node side and CubeGoldenTests on the Swift side -
 * replay the battery through the COMMITTED BUNDLE and compare. An api.js edit that changes
 * one number in one matrix moves a hash and both gates go red.
 *
 * WHERE THE TRUTH COMES FROM.
 *
 * The recorder does NOT read the committed bundle. It reads cube/index.html - the same
 * single input the extractor has, the file the web serves - lifts the four blocks by the
 * shared marker matcher, and evaluates them together with the host shim and api.js in a
 * bare Node vm. A golden recorded from the artifact it polices proves only that the
 * artifact equals itself; this one is recorded from the page.
 *
 * AND IT REFUSES TO RECORD A LIE. Before writing anything, the recorder cross-checks
 * CUBE_API's answers against the CORES' OWN FUNCTIONS on every battery state - geometry
 * rows against placement(), sticker views against stateToStickers(), move geometry against
 * moveSpin/moveSlots/movingPieces, every step against the predicate the method names,
 * every plan's beats against CC.buildPlan - and against THE PAGE'S OWN `canNameByColour`,
 * lifted out of cube/index.html by name (see below). One disagreement and it exits 1
 * without touching the fixture. So the frozen file is not merely "what api.js said today":
 * it is what api.js said WHILE AGREEING WITH THE PAGE.
 *
 * THE NAMEABLE PREDICATE (refutation wound 1).
 *
 * cube/index.html line 5782 calls
 *     INFER.bestQuestion(C, known, res.list, { nameable: canNameByColour })
 * and api.js used to call it with {}. Measured, the winning square differed in 200 of 200
 * seeded paintings: the iPad asked the child about a different square from the web.
 *
 * `canNameByColour` is at line 4119 and sits OUTSIDE all four marked blocks, in the
 * painter's scope, at the top of a chain of five functions closing over `app`. It is not a
 * stable standalone function, so it could not be lifted as a fifth guarded block - and
 * writing markers into cube/index.html is forbidden to this lane by Q83 and would be
 * erased by the next Studio deploy anyway. IT IS THEREFORE REIMPLEMENTED IN api.js AND
 * GATED HERE: this recorder lifts `PEEK_RANK`, `big`, `facePer`, `faceOfSid`,
 * `otherFacesOf`, `floorSids`, `assumedSid`, `knownColourAt`, `anchorsOf`,
 * `sideAnchorsOf` and `canNameByColour` OUT OF THE PAGE BY NAME, evaluates them beside the
 * cores exactly as the page has them, drives them over every battery painting, and refuses
 * to record if api.js's `nameable` array differs by one square.
 *
 * Run:  node tools/make-cube-api-golden.mjs             (npm run build:cube-api-golden)
 *       node tools/make-cube-api-golden.mjs --verify    record nothing, just cross-check
 *
 * Regenerating is a DELIBERATE, REVIEWED act: the fixture carries the page's sha256 and
 * api.js's own sha256, so a diff says which of the two moved.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BLOCKS, locateBlocks } from './cube-engine/markers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'cube/index.html');
const API_JS = path.join(ROOT, 'tools/cube-engine/api.js');
const SHIM_JS = path.join(ROOT, 'tools/cube-engine/host-shim.js');
const OUT = path.join(ROOT, 'tools/fixtures/cube-api-golden.json');
const VERIFY_ONLY = process.argv.includes('--verify');

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

/* WHAT IS HASHED: THE ENGINE'S OWN JSON STRING, byte for byte, exactly as CUBE_API returned
   it - never a re-serialisation of a parsed object.

   That matters because the Swift half of this gate has to compute the same hash inside
   JavaScriptCore, and a Swift re-serialisation would have to reproduce ECMAScript's number
   formatting (6.123233995736766e-17 and friends) and its property order by hand. Hashing
   the RETURNED STRING sidesteps both: JSON.stringify's output is specified - integer-like
   keys ascending then string keys in insertion order, Number::toString for the numbers -
   and the split refutation already proved the two runtimes agree on it to the byte (a
   4,358,229-byte probe digest identical in Node and in JSC). So the Swift side hashes the
   raw string off the bridge and the two hashes are comparable by construction.

   None of the recorded calls is an error envelope, so no runtime-specific `stack` is ever
   inside a hashed string - the recorder refuses to record if any call comes back !ok. */
const h = s => sha256(String(s)).slice(0, 32);

/* Only used for the recorder's own cross-checks against the cores, never for a recorded
   hash: there, a canonical form is what makes two differently-built objects comparable. */
function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}

function die(msg) {
  console.error('make-cube-api-golden: ' + (Array.isArray(msg) ? msg.join('\n  ') : msg));
  process.exit(1);
}

/* ------------------------------------------------------------------ the page, in a vm */

function bareSandbox() {
  const sandbox = {
    Math, JSON, Object, Array, String, Number, Boolean, Error, TypeError, RangeError,
    RegExp, Date, isNaN, isFinite, parseInt, parseFloat
  };
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox);
}

/**
 * Lift one top-level `function NAME(` or `var NAME =` out of the page by name, brace-
 * matched, and hand back its exact source text. Anchored at the page's own two-space
 * indent so a mention inside a string or another function cannot be mistaken for it, and
 * a name that appears twice is a hard failure rather than a guess.
 */
function liftFromPage(html, name, kind) {
  const needle = kind === 'var' ? `\n  var ${name} = ` : `\n  function ${name}(`;
  const first = html.indexOf(needle);
  if (first < 0) die(`cube/index.html no longer defines \`${name}\` at the page's own indent. `
    + 'The nameable predicate is lifted from the page by name; a rename has to be seen, not guessed.');
  if (html.indexOf(needle, first + 1) >= 0) {
    die(`cube/index.html defines \`${name}\` more than once at the page's own indent; refusing to guess which.`);
  }
  const start = first + 1;
  if (kind === 'var') {
    /* a one-line `var X = ...;` */
    const nl = html.indexOf('\n', start);
    return html.slice(start, nl + 1);
  }
  let i = html.indexOf('{', start);
  if (i < 0) die(`could not find the body of \`${name}\``);
  let depth = 0, inStr = null;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" ) { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(start, i) + '\n';
}

/* The page-side functions the nameable predicate is made of, in the order they must be
   evaluated (they are function declarations, so order barely matters; PEEK_RANK is a var
   and does). Every one is lifted VERBATIM - none of it is retyped here. */
const PAGE_PIECES = [
  ['PEEK_RANK', 'var'],
  ['big', 'fn'],
  ['facePer', 'fn'],
  ['faceOfSid', 'fn'],
  ['otherFacesOf', 'fn'],
  ['floorSids', 'fn'],
  ['assumedSid', 'fn'],
  ['knownColourAt', 'fn'],
  ['anchorsOf', 'fn'],
  ['sideAnchorsOf', 'fn'],
  ['canNameByColour', 'fn']
];

/**
 * The monolith's four blocks, the host shim and api.js in one bare context, PLUS the
 * page's own painter predicate wired to a stand-in `app`.
 *
 * The stand-in is the smallest honest one. The page holds `app.paint` (the raw painting),
 * `app.inferRes` (the completion search) and `app.whiteDown`; `known`, the array it hands
 * bestQuestion, is `effPaint()` - the painting with white filled in at every floor square
 * when whiteDown is set. Setting `app.paint = known` and `app.whiteDown = false` gives
 * `knownColourAt` byte-identical behaviour, because assumedSid's only job is to add the
 * white that effPaint has already added. Nothing else about `app` is reachable from these
 * eleven functions.
 */
function loadPage() {
  const html = fs.readFileSync(SOURCE, 'utf8');
  const { found, errors } = locateBlocks(html);
  if (errors.length) die(['cube/index.html does not carry the four blocks:', ...errors]);

  const ctx = bareSandbox();
  const shim = fs.readFileSync(SHIM_JS, 'utf8');
  const api = fs.readFileSync(API_JS, 'utf8');
  vm.runInContext(shim, ctx, { filename: 'host-shim.js' });
  for (const name of BLOCKS) vm.runInContext(found[name].text, ctx, { filename: SOURCE + '#' + name });
  vm.runInContext(api, ctx, { filename: 'api.js' });

  for (const n of ['CUBE', 'CUBE3', 'INFER', 'GUIDE', 'CUBE_API']) {
    if (!ctx[n]) die(`${n} did not end up defined after loading cube/index.html's blocks + api.js`);
  }

  /* the page's own predicate, lifted verbatim and wired to a stand-in app */
  const pieces = PAGE_PIECES.map(([name, kind]) => liftFromPage(html, name, kind));
  const preamble =
    'var app = { size: 2, paint: [], inferRes: null, whiteDown: false };\n'
    + 'var C = CUBE;\n'
    + 'function PAGE_SET(size, painted, res) {\n'
    + '  app.size = size; app.paint = painted; app.inferRes = res; app.whiteDown = false;\n'
    + '  C = size === 3 ? CUBE3 : CUBE;\n'
    + '}\n'
    + 'function PAGE_NAMEABLE() {\n'
    + '  var n = INFER.stickerCount(C), out = [], i;\n'
    + '  for (i = 0; i < n; i++) out.push(!!canNameByColour(i));\n'
    + '  return out;\n'
    + '}\n';
  vm.runInContext(preamble + pieces.join('\n'), ctx, { filename: SOURCE + '#painter-predicate' });

  return {
    ctx, html,
    sourceSha256: sha256(html),
    apiSha256: sha256(api),
    shimSha256: sha256(shim),
    blocks: BLOCKS.map(n => ({
      name: n, startLine: found[n].startLine + 1, endLine: found[n].endLine + 1,
      bytes: Buffer.byteLength(found[n].text, 'utf8'),
      sha256: sha256(found[n].text).slice(0, 16)
    })),
    liftedPredicate: {
      names: PAGE_PIECES.map(p => p[0]),
      bytes: pieces.reduce((a, s) => a + Buffer.byteLength(s, 'utf8'), 0),
      sha256: sha256(pieces.join('\n')).slice(0, 32)
    }
  };
}

/* ------------------------------------------------------------------ the battery */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function wholeSeq(CC, k) { return CC.MOVE[k] ? [k] : CC.WHOLE[k].moves.slice(); }

/* At least 300 states per size, and NOT 300 random scrambles: the refutation's own lesson
   is that a broad random sample is thin exactly where the method turns. So the battery is
   solved, every whole-cube turn, every preset, the class states the 609-state battery
   misses (twist multisets, step1Done true, finished-but-rotated, rotated frames, daisy),
   every depth 1..30, and then random states to fill out to the floor. */
const STATES_PER_SIZE = 320;

function batteryStates(CC, size) {
  const out = [];
  const seen = {};
  const add = (label, s) => {
    const k = CC.keyOf(s);
    if (seen[k]) return;          /* a duplicate state records a duplicate row, not a check */
    seen[k] = true;
    out.push({ label, s });
  };

  add('solved', CC.solved());
  for (const k of CC.WHOLE_KEYS) add('whole:' + k, CC.applySeq(CC.solved(), wholeSeq(CC, k)));
  for (const p of CC.PRESETS) add('preset:' + p.id, CC.presetState(p));

  if (size === 2) {
    add('twist-class:11111112', { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [1, 1, 1, 1, 1, 1, 1, 2] });
    add('twist-class:11111112 permuted', { cp: [3, 0, 1, 2, 7, 4, 5, 6], co: [1, 1, 1, 2, 1, 1, 1, 1] });
    add('twist-class:22222221', { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [2, 2, 2, 2, 2, 2, 2, 1] });
    const flipped = CC.applySeq(CC.solved(), wholeSeq(CC, 'x2'));
    add('step1Done:flip only', flipped);
    for (const seq of [['D'], ["D'"], ['D2'], ['D', 'D'], ["D'", 'D2']]) {
      add('step1Done:flip+' + seq.join(''), CC.applySeq(flipped, seq));
    }
    add('step1Done:false, one chant in', CC.applySeq(flipped, CC.chantSeq('righty')));
  } else {
    const scr = CC.randomState(9, mulberry32(5));
    for (const k of CC.WHOLE_KEYS) add('rotated-frame:' + k, CC.applySeq(scr, wholeSeq(CC, k)));
    const scr2 = CC.randomState(14, mulberry32(6));
    for (const k of CC.WHOLE_KEYS) add('rotated-frame2:' + k, CC.applySeq(scr2, wholeSeq(CC, k)));
    const rnd = mulberry32(7);
    let dA = 0, dD = 0;
    for (let i = 0; i < 60000 && (dA < 3 || dD < 3); i++) {
      const s = CC.randomState(1 + (i % 8), rnd);
      if (CC.daisyDone(s) && dD < 3) { add('daisyDone:' + dD, s); dD++; continue; }
      if (CC.daisyAnywhere(s) && dA < 3) { add('daisyAnywhere:' + dA, s); dA++; }
    }
  }

  /* every depth 1..30 gets at least one state, then fill to the floor */
  const rnd = mulberry32(size === 2 ? 0xC0DE2 : 0xC0DE3);
  for (let d = 1; d <= 30; d++) add('depth:' + d, CC.randomState(d, rnd));
  let guard = 0;
  while (out.length < STATES_PER_SIZE && guard++ < 20000) {
    add('fill:' + out.length, CC.randomState(1 + (out.length % 30), rnd));
  }
  if (out.length < STATES_PER_SIZE) {
    die(`only ${out.length} distinct ${size}x${size} battery states; the floor is ${STATES_PER_SIZE}`);
  }
  return out;
}

/* Paintings for the inference engine. Every one is a REAL cube's sticker view with squares
   taken away, which is what the painter is always looking at.

   TWO SHAPES PER STATE, and the second one is the point. An EVENLY SPREAD painting leaves
   almost every unpainted square with a painted neighbour on its own block, so almost every
   square is nameable and the nameable branch rarely changes the winner. A SPARSE, CLUMPED
   painting is what the painter actually has three taps in - and it is where
   `{ nameable: canNameByColour }` and `{}` part company. Recording only the tidy shape
   would have re-created the very hole this file exists to close. */
function paintingFor(stickers, index, kind) {
  const total = stickers.length;
  const out = new Array(total).fill(null);
  if (kind === 'spread') {
    const keepEvery = 2 + (index % 5);          /* 2..6 */
    const offset = index % keepEvery;
    for (let i = 0; i < total; i++) if (i % keepEvery === offset) out[i] = stickers[i];
    return out;
  }
  /* sparse: a seeded handful of squares, clumped by starting from one face */
  const rnd = mulberry32(0x5A5A0000 + index * 2654435761);
  const per = total === 24 ? 4 : 9;
  const want = 2 + Math.floor(rnd() * (total === 24 ? 7 : 14));   /* 2..8 / 2..15 squares */
  const face = Math.floor(rnd() * 6);
  let placed = 0;
  for (let i = 0; i < per && placed < want; i++) {
    if (rnd() < 0.7) { out[face * per + i] = stickers[face * per + i]; placed++; }
  }
  let guard = 0;
  while (placed < want && guard++ < 500) {
    const sid = Math.floor(rnd() * total);
    if (out[sid] === null) { out[sid] = stickers[sid]; placed++; }
  }
  return out;
}

/* ------------------------------------------------------------------ the record */

function record() {
  const page = loadPage();
  const ctx = page.ctx;
  const API = ctx.CUBE_API;
  const raw = (m, a) => API[m](a === undefined ? undefined : JSON.stringify(a));
  const call = (m, a) => { const s = raw(m, a); const v = JSON.parse(s); v.__raw = s; return v; };

  const problems = [];
  const sizes = {};
  let rowTotal = 0, callTotal = 0;

  for (const size of [2, 3]) {
    const CC = size === 2 ? ctx.CUBE : ctx.CUBE3;
    const tag = size + 'x' + size + ': ';
    const states = batteryStates(CC, size);
    const moves = Object.keys(CC.MOVE).sort();
    const wholeKeys = CC.WHOLE_KEYS.slice();

    /* ---- the singletons ---- */
    const wordsR = call('words', { size });
    if (!wordsR.ok) die(tag + 'words() failed: ' + wordsR.error.message);
    const scriptR = call('guideScript', { size });
    if (!scriptR.ok) die(tag + 'guideScript() failed: ' + scriptR.error.message);

    /* guideNode for EVERY id, hashed one by one so a red gate names the node */
    const guideNodes = {};
    for (const id of scriptR.script.order) {
      const n = call('guideNode', { size, id });
      if (!n.ok) die(tag + 'guideNode(' + id + ') failed: ' + n.error.message);
      guideNodes[id] = h(n.__raw);
      callTotal++;
      /* and it must be the same node the script carries */
      const inScript = scriptR.script.nodes.find(x => x.id === id);
      if (stable(inScript) !== stable(n.node)) problems.push(tag + 'guideNode(' + id + ') differs from the script node');
    }

    const rows = [];
    const witnesses = [];

    states.forEach(({ label, s }, index) => {
      const state = JSON.parse(JSON.stringify(s));
      /* `calls` is flat string -> hash and `moveGeometry` is its own map, so the Swift
         half can decode this file with two plain [String: String] dictionaries. */
      const row = { label, index, state, key: CC.keyOf(s), calls: {}, moveGeometry: {} };

      const stickersR = call('stickers', { size, state });
      const validateR = call('validate', { size, stickers: stickersR.stickers });
      const stepR = call('stepStatus', { size, state });
      const planR = call('buildPlan', { size, state });
      const geoR = call('geometry', { size, state });
      const stateR = call('validateState', { size, state });
      const solvedR = call('isSolved', { size, state });
      callTotal += 7;

      for (const [k, r] of [['stickers', stickersR], ['validate', validateR], ['stepStatus', stepR],
                            ['buildPlan', planR], ['geometry', geoR], ['validateState', stateR],
                            ['isSolved', solvedR]]) {
        if (!r.ok) { problems.push(tag + label + ': ' + k + ' returned ' + r.error.message); return; }
        row.calls[k] = h(r.__raw);
      }

      /* ---- moveGeometry for EVERY face turn AND every whole-cube turn ---- */
      const mg = {};
      for (const m of moves.concat(wholeKeys.filter(k => moves.indexOf(k) < 0))) {
        const r = call('moveGeometry', { size, state, move: m });
        callTotal++;
        if (!r.ok) { problems.push(tag + label + ': moveGeometry(' + m + ') returned ' + r.error.message); continue; }
        mg[m] = h(r.__raw);
        /* cross-check against the cores' own answer for this move */
        const spin = (CC.WHOLE && CC.WHOLE[m] && !CC.MOVE[m]) ? CC.WHOLE[m] : CC.moveSpin(m);
        if (r.deg !== spin.deg || stable(r.axis) !== stable(spin.axis)) {
          problems.push(tag + label + ': moveGeometry(' + m + ') is not the core\'s own spin');
        }
        if (size === 2 && CC.MOVE[m]) {
          const wantSlots = CC.moveSlots(m);
          const wantKeys = wantSlots.map(sl => 'c' + s.cp[sl]);
          if (stable(r.pieces) !== stable(wantKeys)) {
            problems.push(tag + label + ': moveGeometry(' + m + ').pieces is not moveSlots -> cp');
          }
        }
        if (size === 3 && CC.MOVE[m]) {
          const wantKeys = CC.movingPieces(s, m).map(p => p[0] + p[1]);
          if (stable(r.pieces) !== stable(wantKeys)) {
            problems.push(tag + label + ': moveGeometry(' + m + ').pieces is not movingPieces');
          }
        }
      }
      row.moveGeometry = mg;

      /* ---- bestQuestion, WITH and WITHOUT the nameable option, on two painting shapes ---- */
      row.questions = [];
      for (const kind of ['spread', 'sparse']) {
        const painted = paintingFor(stickersR.stickers, index, kind);
        const bqR = call('bestQuestion', { size, painted });
        const bqPlainR = call('bestQuestion', { size, painted, nameable: false });
        callTotal += 2;
        if (!bqR.ok || !bqPlainR.ok) {
          problems.push(tag + label + '/' + kind + ': bestQuestion returned an error');
          continue;
        }

        /* THE PAGE'S OWN PREDICATE. Lifted out of cube/index.html by name, driven over
           this very painting with the engine's own completion list in app.inferRes, and
           compared square by square with api.js's array. This is the ONLY thing in the
           bundle that is a reimplementation rather than a quote, and it is the reason this
           recorder exists rather than a simpler one. */
        const comp = ctx.INFER.completions(CC, painted, { cap: 240, budget: 20000 });
        ctx.PAGE_SET(size, painted.slice(), comp);
        const pageArr = ctx.PAGE_NAMEABLE();
        const apiArr = bqR.nameable;
        if (!Array.isArray(apiArr) || apiArr.length !== pageArr.length) {
          problems.push(tag + label + '/' + kind + ': CUBE_API.bestQuestion returned no nameable array');
        } else {
          const bad = [];
          for (let i = 0; i < pageArr.length; i++) if (!!pageArr[i] !== !!apiArr[i]) bad.push(i);
          if (bad.length) {
            problems.push(tag + label + '/' + kind + ': the nameable predicate disagrees with the page at square(s) '
              + bad.slice(0, 8).join(', ') + (bad.length > 8 ? ' (+' + (bad.length - 8) + ')' : ''));
          }
        }
        /* and the page's own answer to the question the page asks, compared with the API's */
        const pageBest = ctx.INFER.bestQuestion(CC, painted, comp.list,
          { nameable: function (sid) { return !!pageArr[sid]; } });
        if (stable(bqR.best) !== stable(pageBest === undefined ? null : JSON.parse(JSON.stringify(pageBest)))) {
          problems.push(tag + label + '/' + kind + ': bestQuestion is not the question the page asks');
        }

        row.questions.push({
          kind, painted,
          bestQuestion: h(bqR.__raw),
          bestQuestionPlain: h(bqPlainR.__raw),
          bestSid: bqR.best ? bqR.best.sid : null,
          plainSid: bqR.plain ? bqR.plain.sid : null,
          differs: !!bqR.differs,
          nameableCount: bqR.nameableCount,
          nameableHash: h(JSON.stringify(pageArr))
        });
      }

      /* ---- cross-checks against the cores' own functions ----
         The golden must not merely be "what api.js said": it must be what api.js said
         while agreeing with the code the child plays. */
      if (stable(stickersR.stickers) !== stable(CC.stateToStickers(s))) {
        problems.push(tag + label + ': stickers() is not stateToStickers()');
      }
      {
        const v = CC.validate(CC.stateToStickers(s));
        const r = validateR.result;
        if (!!v.ok !== !!r.ok) problems.push(tag + label + ': validate() disagrees with the core');
        if (v.ok && stable(r.scheme) !== stable({ map: v.scheme.map, back: v.scheme.back })) {
          problems.push(tag + label + ': validate().scheme is not the core\'s own scheme');
        }
        if (!v.ok && (r.code !== String(v.code || '') || r.message !== String(v.msg || ''))) {
          problems.push(tag + label + ': validate() refusal is not the core\'s own words');
        }
      }
      {
        const want = size === 2
          ? [CC.layerIntact(s) !== null, CC.ceilingAllYellow(s), CC.facesAllOneColour(s)]
          : [CC.daisyDone(s), CC.crossDone(s), CC.firstLayerDone(s), CC.twoLayersDone(s),
             CC.yellowCeilEdges(s).length === 4, CC.matchedCeilEdges(s).length === 4,
             CC.homeCeilCorners(s).length === 4, CC.facesAllOneColour(s)];
        const got = stepR.steps.map(x => !!x.done);
        if (stable(got) !== stable(want.map(Boolean))) {
          problems.push(tag + label + ': stepStatus\'s steps are not the method\'s own predicates');
        }
        let first = null;
        for (let i = 0; i < want.length; i++) { if (!want[i] && first === null) first = i + 1; }
        if (stepR.firstUnfinished !== first) {
          problems.push(tag + label + ': stepStatus.firstUnfinished is ' + stepR.firstUnfinished + ', want ' + first);
        }
        if (size === 3 && stepR.extras.resumePoint !== CC.resumePoint(s)) {
          problems.push(tag + label + ': stepStatus.extras.resumePoint is not CUBE3.resumePoint');
        }
      }
      {
        const pl = CC.buildPlan(s);
        const body = planR.plan;
        if (!!pl !== !!body) problems.push(tag + label + ': buildPlan disagrees about whether there is a plan');
        else if (pl) {
          const wantBeats = (pl.beats || []).map(b => ({
            phase: b.phase === undefined ? null : b.phase,
            kind: b.kind || '',
            moves: (b.moves || []).slice(),
            chant: b.chant === undefined ? null : b.chant,
            say: String(b.say === undefined ? '' : b.say),
            why: String(b.why === undefined ? '' : b.why),
            title: String(b.title === undefined ? '' : b.title)
          }));
          const gotBeats = body.beats.map(b => ({
            phase: b.phase, kind: b.kind, moves: b.moves, chant: b.chant,
            say: b.say, why: b.why, title: b.title
          }));
          if (stable(gotBeats) !== stable(wantBeats)) {
            problems.push(tag + label + ': buildPlan\'s beats (moves AND words) are not the core\'s own');
          }
        }
      }
      {
        const pieces = geoR.pieces;
        const wantCount = size === 2 ? 8 : 26;
        if (pieces.length !== wantCount) problems.push(tag + label + ': geometry returned ' + pieces.length + ' pieces');
        if (stable(geoR.faceDirections) !== stable(CC.FACE_DIR)) {
          problems.push(tag + label + ': geometry.faceDirections is not FACE_DIR');
        }
        for (let i = 0; i < pieces.length; i++) {
          const p = pieces[i];
          const want = size === 2 ? CC.placement(s, p.index) : CC.placement(s, p.kind, p.index);
          if (p.slot !== want.slot || p.twist !== want.twist
              || stable(p.m) !== stable(want.m) || stable(p.t) !== stable(want.t)) {
            problems.push(tag + label + ': geometry piece ' + p.key + ' is not placement()\'s own row');
            break;
          }
          const wantFaces = p.kind === 'c' ? CC.HOME[p.index]
                          : p.kind === 'e' ? CC.EHOME[p.index] : [p.index];
          const wantCols = p.kind === 'c' ? CC.cornerColours(p.index)
                         : p.kind === 'e' ? CC.edgeColours(p.index) : [CC.FACE_COLOUR[p.index]];
          if (stable(p.faces) !== stable(wantFaces) || stable(p.colours) !== stable(wantCols)) {
            problems.push(tag + label + ': geometry piece ' + p.key + ' carries the wrong faces or colours');
            break;
          }
        }
      }

      rows.push(row);
      rowTotal++;

      /* a handful of states kept VERBATIM, so a red gate is legible rather than a hash */
      if (index < 4) {
        const bare = r => { const c = JSON.parse(JSON.stringify(r)); delete c.__raw; return c; };
        witnesses.push({
          label, key: row.key, state,
          stickers: bare(stickersR), validate: bare(validateR), stepStatus: bare(stepR),
          geometry: bare(geoR), isSolved: bare(solvedR), validateState: bare(stateR),
          buildPlanBeatCount: planR.plan ? planR.plan.beatCount : null,
          buildPlanFirstBeats: planR.plan ? planR.plan.beats.slice(0, 3) : null,
          questions: row.questions.map(q => ({
            kind: q.kind, bestSid: q.bestSid, plainSid: q.plainSid,
            differs: q.differs, nameableCount: q.nameableCount
          }))
        });
      }
    });

    /* the whole-battery rollup, so one number moves when anything does */
    sizes[String(size)] = {
      size,
      stateCount: rows.length,
      moves: moves,
      wholeKeys: wholeKeys,
      solvedKey: CC.keyOf(CC.solved()),
      words: h(wordsR.__raw),
      wordsVerbatim: wordsR.words,
      guideScript: h(scriptR.__raw),
      guideScriptText: h(scriptR.script.nodes.map(n => n.id + ' ' + n.say + ' ' + n.why + ' ' + n.title).join('')),
      guideNodeCount: scriptR.script.nodeCount,
      guideNodes,
      rows,
      witnesses,
      rollup: h(JSON.stringify(rows.map(r => [r.calls, r.moveGeometry,
        r.questions.map(q => [q.bestQuestion, q.bestQuestionPlain])])))
    };
    console.log('  ' + tag + rows.length + ' states, ' + moves.length + ' moves, '
      + Object.keys(guideNodes).length + ' guide nodes');
  }

  if (problems.length) {
    die(['REFUSING TO RECORD. CUBE_API does not agree with the page it was extracted from.',
      ...problems.slice(0, 30),
      problems.length > 30 ? `... and ${problems.length - 30} more` : '',
      '',
      'The golden corpus is only worth anything if it was true when it was written.',
      'Fix tools/cube-engine/api.js, or accept that cube/index.html changed and say so.'].filter(Boolean));
  }

  const doc = {
    note: 'THE VALUE ORACLE FOR CUBE_API (tools/cube-engine/api.js), which is NOT one of the '
      + 'four guarded blocks and which eleven refuter corruptions rode straight through every '
      + 'gate on both sides. Recorded by tools/make-cube-api-golden.mjs from cube/index.html - '
      + 'the page itself, never the committed bundle - with api.js layered over the page\'s own '
      + 'blocks, and with every answer cross-checked against the cores\' own functions and '
      + 'against the page\'s own canNameByColour before a byte was written. Replayed against the '
      + 'COMMITTED bundle by cube/tools/cube-engine-sanity.mjs (node) and CubeGoldenTests '
      + '(JavaScriptCore). Regenerate deliberately: npm run build:cube-api-golden.',
    goldenVersion: 1,
    capturedFrom: 'cube/index.html',
    sourceSha256: page.sourceSha256,
    apiSha256: page.apiSha256,
    shimSha256: page.shimSha256,
    blocks: page.blocks,
    liftedPredicate: page.liftedPredicate,
    statesPerSize: STATES_PER_SIZE,
    totals: { states: rowTotal, apiCalls: callTotal },
    sizes
  };
  return doc;
}

const doc = record();
console.log('cross-checks: PASS  (' + doc.totals.states + ' states, ' + doc.totals.apiCalls
  + ' CUBE_API calls, every one agreeing with the cores and with the page\'s own predicate)');

if (VERIFY_ONLY) {
  console.log('--verify: nothing written');
  process.exit(0);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc) + '\n');
console.log('wrote ' + path.relative(ROOT, OUT) + '  '
  + (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + ' MB');
console.log('  page   sha256 ' + doc.sourceSha256.slice(0, 16));
console.log('  api.js sha256 ' + doc.apiSha256.slice(0, 16));
