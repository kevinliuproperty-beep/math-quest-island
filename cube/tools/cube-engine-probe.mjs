/* cube-engine-probe.mjs - the VALUE-level probe for Cube Quest's pure logic.
 *
 * WHY THIS EXISTS. The split lane's cube-probe.mjs has real teeth on the cube ALGEBRA
 * and on the PLAN, and none at all on the two other things the cores export. Its
 * refutation proved it by mutation: of 22 mutations, NINE were caught by nothing -
 * `CAPTION`, `CHANT_TWICE`, preset hints, `PRESETS[].quiz.right`, `SLOT_NAMES`,
 * `ordinal`, `INFER.blockSids`, and - worst - `validate`'s "that is not a real cube
 * block" refusal DELETED OUTRIGHT. The pattern was not random: cube-probe records
 * `Object.keys(CC).sort()` for the export surface, so a name DISAPPEARING is caught and
 * the VALUE behind any name outside its predicate battery is not.
 *
 * The two unguarded families are exactly the two the iOS packet needs:
 *
 *   THE WORDS the child reads. CAPTION (both sizes), CHANT_TWICE, PRESETS in full
 *   including which quiz answer is RIGHT, SLOT_NAMES / ESLOT_NAMES, SIDE_WORDS,
 *   ordinal, the chant table. Cube Quest law: instruction text never changes.
 *
 *   THE GEOMETRY a SceneKit view draws with. placement, moveSpin, slotCentre,
 *   moveSlots, movingPieces, matMul / matVec / rodrigues, INFER.blockSids. Every one
 *   lives inside CORE and CORE3 and cube-sanity never calls one of them.
 *
 * It also walks the two things the split fixture could not reach at all:
 *
 *   VALIDATE'S REFUSALS. cube-probe only ever fed validate stickers taken from a REAL
 *   state, so every rejection branch was unreached in all 1,218 fixture rows. Here the
 *   refusal corpus is built by BREAKING a legal painting - one swap of two squares,
 *   counts preserved - which is the child's actual failure mode (the 09-05 swatch-row
 *   class: the painter offers a colour, she picks the wrong one, and the cube she has
 *   described cannot exist). One case per refusal code, found by deterministic search,
 *   with the code, the whole message and the suspect list recorded.
 *
 *   THE STATE CLASSES the 609-state battery misses. The 2x2 twist multiset 11111112
 *   (seven corners twisted one way, one the other - never sampled), 3x3 frame-rotated
 *   states (2 of 609, both presets), step1Done TRUE cases (1 witness of 609),
 *   facesAllOneColour on a cube standing in another orientation, daisyAnywhere.
 *
 * ONE probe, TWO doors, like the split lane's: it runs against a MONOLITH
 * (cube/index.html, the blocks lifted by marker) and against the extracted BUNDLE, and
 * the two must agree exactly. The snapshot in fixtures/ is recorded from the monolith,
 * so the bundle is always being checked against the file it was extracted from.
 *
 * Deterministic throughout: one seeded mulberry32, fixed counts, fixed orders. No
 * Math.random, no Date, no DOM.
 */

import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

/* ------------------------------------------------------------------ loading */

const MARKERS = {
  CUBE: /\/\* ===== CORE START =====[\s\S]*?\/\* ===== CORE END ===== \*\//,
  CUBE3: /\/\* ===== CORE3 START =====[\s\S]*?\/\* ===== CORE3 END ===== \*\//,
  INFER: /\/\* ===== INFER START =====[\s\S]*?\/\* ===== INFER END ===== \*\//,
  GUIDE: /\/\* ===== GUIDE START =====[\s\S]*?\/\* ===== GUIDE END ===== \*\//
};

/* A context with nothing a browser would give you. Math and JSON and the language, and
   that is all. Anything reaching for document / window / a timer throws here. */
export function bareContext() {
  const sandbox = {
    Math, JSON, Object, Array, String, Number, Boolean, Error, TypeError, RangeError,
    RegExp, Date, isNaN, isFinite, parseInt, parseFloat
  };
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox);
}

/** The four namespaces, lifted out of a single-file Studio HTML by marker. */
export function loadMonolith(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const ctx = bareContext();
  for (const [name, re] of Object.entries(MARKERS)) {
    const m = html.match(re);
    if (!m) throw new Error('could not find the ' + name + ' block in ' + htmlPath);
    vm.runInContext(m[0], ctx, { filename: htmlPath + '#' + name });
  }
  return pick(ctx, htmlPath);
}

/** The four namespaces plus CUBE_API, out of one extracted bundle file. */
export function loadBundle(bundlePath) {
  const ctx = bareContext();
  vm.runInContext(fs.readFileSync(bundlePath, 'utf8'), ctx, { filename: bundlePath });
  const ns = pick(ctx, bundlePath);
  ns.CUBE_API = ctx.CUBE_API;
  ns.CUBE_HOST = ctx.CUBE_HOST;
  ns.context = ctx;
  return ns;
}

function pick(ctx, where) {
  const out = {};
  for (const name of Object.keys(MARKERS)) {
    if (!ctx[name]) throw new Error(name + ' did not end up defined after loading ' + where);
    out[name] = ctx[name];
  }
  return out;
}

/* ------------------------------------------------------------------ helpers */

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function sha(v) {
  return createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 32);
}
const J = v => JSON.parse(JSON.stringify(v === undefined ? null : v));

/* A whole-cube turn is a first-class MOVE on the big cube and a PAIR OF FACE TURNS on
   the small one (CUBE.WHOLE.y.moves = ['U', "D'"]). Same asymmetry CUBE_API normalises;
   quoted here so the probe can drive both sizes with one sentence. */
function wholeSeq(CC, k) { return CC.MOVE[k] ? [k] : CC.WHOLE[k].moves.slice(); }

function callIt(fn, ...args) {
  if (typeof fn !== 'function') return { absent: true };
  try { return { v: J(fn(...args)) }; }
  catch (e) { return { threw: String((e && e.message) || e) }; }
}

/* ------------------------------------------------------------------ 1. the words */
/* WOUND 1, first half. Every string-bearing export the bridge will read, VERBATIM.
   Not a hash: a diff has to be legible, and these are the sentences the child hears. */
function words(CC, size) {
  const out = {
    CAPTION: J(CC.CAPTION),
    CHANTS: J(CC.CHANTS),
    PRESETS: J(CC.PRESETS),          /* in full: id, name, hint, scramble, quiz incl. `right` */
    SLOT_NAMES: J(CC.SLOT_NAMES),
    COLOURS: J(CC.COLOURS),
    FACE_COLOUR: J(CC.FACE_COLOUR),
    FACE_LETTER: J(CC.FACE_LETTER),
    PLAIN_SCHEME: J(CC.PLAIN_SCHEME),
    ordinal: []
  };
  for (let i = 0; i <= 8; i++) out.ordinal.push(CC.ordinal(i));
  if (size === 3) {
    out.ESLOT_NAMES = J(CC.ESLOT_NAMES);
    out.SIDE_WORD = J(CC.SIDE_WORD);
    out.CHANT_KEYS = J(CC.CHANT_KEYS);
    out.FLAT_K = J(CC.FLAT_K);
  } else {
    out.CHANT_TWICE = String(CC.CHANT_TWICE);
    out.SIDE_WORDS = J(CC.SIDE_WORDS);
    out.SIDE_FACES = J(CC.SIDE_FACES);
    out.RIGHTY = J(CC.RIGHTY);
    out.SWAP = J(CC.SWAP);
    out.HOLDS = J(CC.HOLDS);
  }
  return out;
}

/* ------------------------------------------------------------------ 2. the geometry */
/* WOUND 1, second half. The numbers a SceneKit view consumes to place and spin a block.
   All of them live inside the two cores; render.js only scales them into CSS pixels. */
function geometry(CC, size, opts) {
  const rnd = mulberry32(size === 2 ? 0x6E0 : 0x6E1);
  const states = [{ label: 'solved', s: CC.solved() }];
  for (const k of CC.WHOLE_KEYS) {
    states.push({ label: 'whole:' + k, s: CC.applySeq(CC.solved(), wholeSeq(CC, k)) });
  }
  for (let i = 0; i < opts.geomStates; i++) {
    states.push({ label: 'scramble:' + i, s: CC.randomState(2 + (i % 17), rnd) });
  }

  const placements = states.map(({ label, s }) => {
    const rows = [];
    if (size === 2) {
      for (let i = 0; i < 8; i++) rows.push({ k: 'c' + i, p: J(CC.placement(s, i)) });
    } else {
      for (let i = 0; i < 8; i++) rows.push({ k: 'c' + i, p: J(CC.placement(s, 'c', i)) });
      for (let i = 0; i < 12; i++) rows.push({ k: 'e' + i, p: J(CC.placement(s, 'e', i)) });
      for (let i = 0; i < 6; i++) rows.push({ k: 'n' + i, p: J(CC.placement(s, 'n', i)) });
    }
    return { label, key: CC.keyOf(s), rows };
  });

  /* every move's spin, and every whole-cube turn's, on both sizes. moveSpin is where a
     sign error makes every prime move animate backwards - mutation M15, which the split
     fixture never saw. */
  const spins = {};
  for (const m of Object.keys(CC.MOVE).sort()) spins[m] = J(CC.moveSpin(m));
  const wholeSpins = {};
  for (const k of CC.WHOLE_KEYS) {
    wholeSpins[k] = CC.MOVE[k]
      ? J(CC.moveSpin(k))
      : { axis: J(CC.WHOLE[k].axis), deg: CC.WHOLE[k].deg, viaMoves: J(CC.WHOLE[k].moves) };
  }

  const out = { placements, spins, wholeSpins, FACE_DIR: J(CC.FACE_DIR) };

  if (size === 2) {
    /* slotCentre and moveSlots are 2x2-only exports */
    out.slotCentre = [];
    for (let p = 0; p < 8; p++) out.slotCentre.push(J(CC.slotCentre(p)));
    out.moveSlots = {};
    for (const m of Object.keys(CC.MOVE).sort()) out.moveSlots[m] = J(CC.moveSlots(m));
    out.HOME = J(CC.HOME);
    out.cornerColours = [];
    for (let i = 0; i < 8; i++) out.cornerColours.push(J(CC.cornerColours(i)));
  } else {
    /* movingPieces is state-dependent, so it is probed over the same states */
    out.movingPieces = placements.slice(0, 8).map(({ label }, i) => {
      const s = states[i].s;
      const per = {};
      for (const m of Object.keys(CC.MOVE).sort()) per[m] = J(CC.movingPieces(s, m));
      return { label, per };
    });
    out.HOME = J(CC.HOME);
    out.EHOME = J(CC.EHOME);
    out.cornerColours = [];
    for (let i = 0; i < 8; i++) out.cornerColours.push(J(CC.cornerColours(i)));
    out.edgeColours = [];
    for (let i = 0; i < 12; i++) out.edgeColours.push(J(CC.edgeColours(i)));
  }

  /* the three matrix primitives, on fixed inputs, so a sign flip inside one is caught
     even where a placement happens to survive it */
  out.matrixKernel = {
    rodrigues: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0]].map(ax =>
      [90, -90, 180].map(d => J(CC.rodrigues(ax, d)))),
    matMul: J(CC.matMul(CC.rodrigues([1, 0, 0], 90), CC.rodrigues([0, 1, 0], 90))),
    matVec: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, -1, 1]].map(v =>
      J(CC.matVec(CC.rodrigues([0, 0, 1], 90), v)))
  };
  return out;
}

/* ------------------------------------------------------------------ 3. INFER's block map */
/* WOUND 1, third part. blockSids(pieceOf(sid)) for EVERY square, both sizes. Mutation
   M23 reversed an edge's squares and nothing caught it; the whole map is recorded here,
   which is the only way a reordering shows. */
function inferMap(INFER, CC, size) {
  const total = INFER.stickerCount(CC);
  const rows = [];
  for (let sid = 0; sid < total; sid++) {
    const pc = callIt(INFER.pieceOf, CC, sid);
    rows.push({
      sid,
      pieceOf: pc.v === undefined ? pc : pc.v,
      blockSids: pc.v === undefined ? null : callIt(INFER.blockSids, CC, pc.v).v
    });
  }
  return { total, rows };
}

/* ------------------------------------------------------------------ 4. validate's refusals */
/* WOUND 2. Break a LEGAL painting and record what the core says.
 *
 * Two families, and the distinction is the child's:
 *
 *   SINGLE SWAP of two squares. Counts stay right, so the shallow checks pass and the
 *   deep refusals - twice, notreal, missing, twist, flip, parity, and the scheme errors -
 *   are the ones that fire. This IS the 09-05 swatch-row class: she is offered a colour
 *   for a square, picks the wrong one, and has now described a cube that cannot exist.
 *   Found by deterministic search over swap pairs in a fixed order, first example per
 *   refusal code, up to two distinct messages per code.
 *
 *   HAND-MADE damage for the shallow branches a swap can never reach: everything blank,
 *   one square blank, one square an unknown colour, a colour count off by one, and a
 *   single corner rotated in place (which is the classic twist refusal).
 */
function refusals(CC, size, opts) {
  const total = size === 2 ? 24 : 54;
  const base = CC.stateToStickers(CC.randomState(12, mulberry32(size === 2 ? 0xEF2 : 0xEF3)));
  return refusalsFrom(CC, size, base, total, opts);
}

function refusalsFrom(CC, size, base, total, opts) {
  const cases = [];
  const seen = {};   /* code -> messages seen */

  function record(kind, how, sk) {
    const v = CC.validate(sk);
    const code = v.ok ? 'OK' : String(v.code || '');
    const msg = v.ok ? '' : String(v.msg || '');
    seen[code] = seen[code] || [];
    if (v.ok) return false;
    if (seen[code].indexOf(msg) >= 0) return false;
    if (seen[code].length >= 2) return false;
    seen[code].push(msg);
    /* the painting itself is kept, not only its hash: the corpus is the thing a Swift
       test and a node test both feed back in, and a hash cannot be fed back in */
    cases.push({ kind, how, code, msg, suspects: J(v.suspects || []), stickers: sk.slice() });
    return true;
  }

  /* --- hand-made: the shallow branches --- */
  record('handmade', 'every square blank', new Array(total).fill(null));
  {
    const sk = base.slice(); sk[0] = null;
    record('handmade', 'square 0 blank', sk);
  }
  {
    const sk = base.slice(); sk[3] = 'pink';
    record('handmade', 'square 3 painted a colour the cube does not have', sk);
  }
  {
    /* counts: repaint one square with another colour that is already present */
    const sk = base.slice();
    const other = CC.COLOURS.filter(c => c !== sk[5])[0];
    sk[5] = other;
    record('handmade', 'square 5 repainted ' + other + ' (counts now uneven)', sk);
  }
  {
    /* a single corner rotated on the spot - the twist refusal, counts untouched.
       The square list for corner slot 0 is WHERE on the small cube and WHERE_C on the
       big one: the two cores name it differently, which is the same asymmetry again. */
    const w = size === 2 ? CC.WHERE[0] : CC.WHERE_C[0];
    const sk = base.slice();
    if (w && w.length === 3) {
      const t = [sk[w[0]], sk[w[1]], sk[w[2]]];
      sk[w[0]] = t[2]; sk[w[1]] = t[0]; sk[w[2]] = t[1];
      record('handmade', 'corner slot 0 rotated on the spot', sk);
    }
    if (size === 3) {
      /* and one edge flipped in place - the flip refusal, which the 2x2 cannot have */
      const e = CC.WHERE_E[0], sk2 = base.slice();
      if (e && e.length === 2) {
        const t2 = [sk2[e[0]], sk2[e[1]]];
        sk2[e[0]] = t2[1]; sk2[e[1]] = t2[0];
        record('handmade', 'edge slot 0 flipped in place', sk2);
      }
    }
  }

  /* --- the swatch-row class: one swap of two squares, counts preserved --- */
  let tried = 0;
  outer:
  for (let i = 0; i < total; i++) {
    for (let j = i + 1; j < total; j++) {
      if (base[i] === base[j]) continue;
      tried++;
      const sk = base.slice();
      sk[i] = base[j]; sk[j] = base[i];
      record('swatch-row single swap', 'squares ' + i + ' and ' + j + ' swapped', sk);
      if (cases.length >= opts.refusalCap) break outer;
    }
  }

  /* --- two swaps, for the branches one swap cannot reach ---
     Some refusals are guarded by an EARLIER refusal that a single mis-paint always trips
     first. `no-white` on the big cube is the clean example: move white off the white
     middle square with one swap and the colour you put there already belongs to another
     middle square, so `centre-twice` fires and `no-white` never does. A second swap
     clears the way. Seeded and bounded, so the corpus is reproducible. */
  const missing = KNOWN_CODES[size].filter(c => !seen[c]);
  const rnd = mulberry32(size === 2 ? 0x2B2 : 0x2B3);
  let pairs = 0;
  if (missing.length) {
    for (let n = 0; n < opts.doubleSwapBudget && cases.length < opts.refusalCap; n++) {
      const sk = base.slice();
      const idx = [];
      for (let k = 0; k < 4; k++) idx.push(Math.floor(rnd() * total));
      if (idx[0] === idx[1] || idx[2] === idx[3]) continue;
      let t = sk[idx[0]]; sk[idx[0]] = sk[idx[1]]; sk[idx[1]] = t;
      t = sk[idx[2]]; sk[idx[2]] = sk[idx[3]]; sk[idx[3]] = t;
      pairs++;
      const before = cases.length;
      record('two swaps', 'squares ' + idx[0] + '/' + idx[1] + ' and ' + idx[2] + '/' + idx[3] + ' swapped', sk);
      /* only keep a two-swap case if it opened a code the single swaps could not */
      if (cases.length > before && missing.indexOf(cases[cases.length - 1].code) < 0) cases.pop();
    }
  }

  const codes = Object.keys(seen).filter(c => c !== 'OK').sort();
  return {
    total, baseHash: sha(base), swapsTried: tried, doubleSwapsTried: pairs,
    codes,
    /* Named, not hidden. A refusal branch this corpus cannot reach is a fact about the
       core's own ordering, and it belongs in the record where the next lane can read it -
       see UNREACHABLE below for the ones that are provably unreachable rather than merely
       unfound. */
    unreached: KNOWN_CODES[size].filter(c => codes.indexOf(c) < 0),
    cases
  };
}

/* Every refusal code the two `validate` implementations can return, read off the source.
   Kept here so the corpus can say which ones it reached AND which it did not; a code
   appearing or disappearing from the reached set is then itself a diff. */
const KNOWN_CODES = {
  2: ['blank', 'odd', 'counts', 'twice', 'blocks-with-white', 'no-opposite', 'pairs',
      'notreal', 'missing', 'twist'],
  3: ['blank', 'odd', 'counts', 'centre-blank', 'centre-twice', 'no-white', 'pairs',
      'twice', 'notreal', 'missingc', 'etwice', 'enotreal', 'missinge', 'twist', 'flip',
      'parity']
};

/* One of these is unreachable through `validate` BY CONSTRUCTION rather than by weak
   searching, and saying which is which is worth more than a corpus that implies coverage
   it does not have:
 *
 *   3x3 `centre-blank` is DEAD ON THIS PATH. It is schemeFrom's own first refusal, but
 *   `validate` runs its whole-cube blank check before calling schemeFrom, so a blank
 *   middle square is always reported as `blank`. The branch is live for the PAINTER, which
 *   calls schemeFrom directly on a half-finished painting; it cannot be reached through
 *   validate at all, and a corpus entry claiming otherwise would be a lie.
 *
 * The rest of the `unreached` list is honest ignorance: this corpus damages ONE legal
 * painting by one or two swaps, and those codes want a differently-shaped mistake. They
 * are recorded in the snapshot so that a code moving between reached and unreached is
 * itself a diff a reviewer sees.
 *
 * A NOTE ON 2x2 `missing`, because the first draft of this file argued it was impossible.
 * The reasoning was: counts must already balance, the eight real corner blocks use each
 * colour exactly four times, so a duplicated block cannot balance them. That is wrong -
 * two swaps redistribute colours across three or four blocks at once, and the search finds
 * it. The claim was removed rather than weakened; a plausible impossibility argument that
 * a 40,000-attempt search refutes is exactly the kind of thing that ends up quoted.
 */
export const UNREACHABLE = {
  2: {},
  3: { 'centre-blank': 'validate\'s whole-cube blank check runs first and reports `blank`' }
};

/* ------------------------------------------------------------------ 5. the thicker battery */
/* WOUND 3. States built TO ORDER for the classes the 609 random scrambles miss, each one
   carrying the full predicate battery, validate, the plan's shape and a geometry hash. */
function classStates(CC, size) {
  const out = [];
  const add = (label, s) => out.push({ label, s });

  add('solved', CC.solved());
  for (const k of CC.WHOLE_KEYS) {
    /* facesAllOneColour true, keyOf NOT the solved key: a finished cube in another
       orientation, which the method produces on purpose and the battery had 1 witness of */
    add('solved+whole:' + k, CC.applySeq(CC.solved(), wholeSeq(CC, k)));
  }
  for (let i = 0; i < CC.PRESETS.length; i++) {
    add('preset:' + CC.PRESETS[i].id, CC.presetState(CC.PRESETS[i]));
  }

  if (size === 2) {
    /* THE UNSAMPLED TWIST CLASS. 15 twist multisets are achievable on a 2x2 and the
       609-state battery sampled 14: 11111112 - seven corners turned one way and one the
       other - was never seen. Built here directly, and its legality asserted rather than
       assumed (the twist sum is 9, a multiple of 3, so a real cube can be in this state). */
    add('twist-class:11111112', { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [1, 1, 1, 1, 1, 1, 1, 2] });
    add('twist-class:11111112 permuted', { cp: [3, 0, 1, 2, 7, 4, 5, 6], co: [1, 1, 1, 2, 1, 1, 1, 1] });
    add('twist-class:22222221', { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [2, 2, 2, 2, 2, 2, 2, 1] });

    /* step1Done TRUE. The battery had ONE witness in 609 states, which is one bug away
       from no witness. x2 puts the white layer at the ceiling; floor turns then leave it
       intact, so every one of these is "layer built, cube unfinished". */
    const flipped = CC.applySeq(CC.solved(), wholeSeq(CC, 'x2'));
    add('step1Done:flip only', flipped);
    for (const seq of [['D'], ["D'"], ['D2'], ['D', 'D'], ["D'", 'D2']]) {
      add('step1Done:flip+' + seq.join(''), CC.applySeq(flipped, seq));
    }
    /* and the other side of the boundary: one righty chant off a built layer */
    add('step1Done:false, one chant in', CC.applySeq(flipped, CC.chantSeq('righty')));
  } else {
    /* ROTATED FRAMES. All four cp/ep parity combinations appear in the 609, but the two
       frame-rotated ones came from exactly 2 states, both presets. Every whole-cube turn
       applied to a real scramble, so the cn vector is off the identity and validate has
       to normalise the frame before it can read parity at all. */
    const scr = CC.randomState(9, mulberry32(5));
    for (const k of CC.WHOLE_KEYS) add('rotated-frame:' + k, CC.applySeq(scr, wholeSeq(CC, k)));
    const scr2 = CC.randomState(14, mulberry32(6));
    for (const k of CC.WHOLE_KEYS) add('rotated-frame2:' + k, CC.applySeq(scr2, wholeSeq(CC, k)));

    /* daisyAnywhere and daisyDone, whose positive side had ONE witness each. Found by a
       fixed seeded search; the harness asserts the search actually found them, because a
       fixture that quietly stops containing its own class is worse than no fixture. */
    const rnd = mulberry32(7);
    let dA = 0, dD = 0;
    for (let i = 0; i < 60000 && (dA < 3 || dD < 3); i++) {
      const s = CC.randomState(1 + (i % 8), rnd);
      if (CC.daisyDone(s) && dD < 3) { add('daisyDone:' + dD, s); dD++; continue; }
      if (CC.daisyAnywhere(s) && dA < 3) { add('daisyAnywhere:' + dA, s); dA++; }
    }
  }
  return out;
}

/* Named explicitly rather than swept off the export object, so a predicate silently
   disappearing fails the harness instead of vanishing from it. Only the ones that take
   the state ALONE are here; the two-argument ones (slotOf, targetCeilSlot,
   spinsToCorner) get their own small tables below, because calling them with one
   argument records a plausible-looking wrong answer rather than a failure. */
const BATTERY_2 = ['isSolved', 'whiteProgress', 'step1Done', 'layerIntact', 'readSides',
  'matchingSides', 'facesAllOneColour', 'ceilingAllYellow', 'bestSeat', 'diagnose', 'keyOf',
  'faceHold', 'faceHoldUp', 'clashes'];
const BATTERY_3 = ['petalCount', 'daisyDone', 'daisyAnywhere', 'crossDone', 'whiteCornersHome',
  'firstLayerDone', 'midDone', 'twoLayersDone', 'whiteFaceDone', 'yellowCeilEdges',
  'crossShape', 'matchedCeilEdges', 'bestCeilStop', 'homeCeilCorners', 'yellowCeilCorners',
  'ceilingAllYellow', 'ceilCornersDone', 'resumePoint', 'diagnose', 'keyOf',
  'facesAllOneColour'];

function battery(CC, size) {
  const names = size === 2 ? BATTERY_2 : BATTERY_3;
  return classStates(CC, size).map(({ label, s }) => {
    const row = { label, key: CC.keyOf(s), pred: {} };
    for (const n of names) row.pred[n] = callIt(CC[n], s);
    if (size === 2) {
      row.slotOf = [];
      for (let c = 0; c < 8; c++) row.slotOf.push(callIt(CC.slotOf, s, c).v);
      row.spinsToCorner = [0, 1, 2, 3].map(p => callIt(CC.spinsToCorner, p).v);
    } else {
      row.targetCeilSlot = [0, 1, 2, 3].map(c => callIt(CC.targetCeilSlot, s, c).v);
    }
    const sk = callIt(CC.stateToStickers, s);
    row.stickerHash = sk.v ? sha(sk.v) : null;
    row.validate = sk.v ? (() => {
      const v = CC.validate(sk.v);
      return { ok: !!v.ok, code: v.ok ? null : String(v.code || ''), msg: v.ok ? '' : String(v.msg || '') };
    })() : { absent: true };
    const pl = callIt(CC.buildPlan, s);
    row.plan = pl.v ? {
      ok: !!pl.v.ok, n: (pl.v.beats || []).length,
      endKey: pl.v.end ? CC.keyOf(pl.v.end) : null,
      shape: sha((pl.v.beats || []).map(b => [b.phase, b.kind, (b.moves || []).join(' '), b.chant, b.ord].join('|'))),
      text: sha((pl.v.beats || []).map(b => String(b.say || '') + '|' + String(b.why || '') + '|' + String(b.title || '')).join('\n'))
    } : pl;
    /* the geometry of THIS state, so the class corpus guards the renderer too */
    const geo = [];
    if (size === 2) { for (let i = 0; i < 8; i++) geo.push(CC.placement(s, i)); }
    else {
      for (let i = 0; i < 8; i++) geo.push(CC.placement(s, 'c', i));
      for (let i = 0; i < 12; i++) geo.push(CC.placement(s, 'e', i));
      for (let i = 0; i < 6; i++) geo.push(CC.placement(s, 'n', i));
    }
    row.geometryHash = sha(geo);
    return row;
  });
}

/* ------------------------------------------------------------------ 6. the guided script */
/* Kept verbatim, node by node. The split fixture already covers this and it is cheap;
   it is here so that ONE file is the whole oracle for the extracted bundle. */
function guide(GUIDE, CC, size) {
  const sc = GUIDE.build(CC);
  const nodes = sc.order.map(id => {
    const n = sc.nodes[id];
    return {
      id: n.id, phase: n.phase, title: n.title, say: n.say, why: n.why, src: n.src,
      moves: (n.moves || []).join(' '), chant: n.chant, kind: n.kind,
      cheer: n.cheer, panic: !!n.panic, end: !!n.end, method: !!n.method,
      askOnly: !!n.askOnly, rephrase: !!n.rephrase,
      ask: n.ask ? J(n.ask) : null, to: n.to || null,
      worldKey: n.world ? CC.keyOf(n.world) : null,
      exits: J(GUIDE.exits(n)),
      textHash: sha(String(n.title || '') + ' ' + String(n.say || '') + ' ' + String(n.why || ''))
    };
  });
  return {
    size, ok: !!sc.ok, first: sc.first, last: sc.last, order: sc.order,
    nodeCount: sc.order.length,
    textHash: sha(nodes.map(n => n.id + ' ' + n.say + ' ' + n.why + ' ' + n.title).join('')),
    nodes
  };
}

/* ------------------------------------------------------------------ entry point */

export const DEFAULT_OPTS = { geomStates: 24, refusalCap: 40, doubleSwapBudget: 40000 };

export function runValueProbe(ns, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  const { CUBE, CUBE3, INFER, GUIDE } = ns;
  const out = { probeVersion: 2, opts: o, sizes: {} };
  for (const [size, CC] of [[2, CUBE], [3, CUBE3]]) {
    out.sizes[String(size)] = {
      size,
      exports: Object.keys(CC).sort(),
      words: words(CC, size),
      geometry: geometry(CC, size, o),
      infer: inferMap(INFER, CC, size),
      refusals: refusals(CC, size, o),
      battery: battery(CC, size),
      guide: guide(GUIDE, CC, size)
    };
  }
  return out;
}
