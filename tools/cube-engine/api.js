/* ===== cube engine bundle: CUBE_API (appended by tools/build-cube-engine.mjs) =====
 *
 * The one surface the Swift bridge (ios/Packages/MQCubeEngineJS) touches. Every method
 * takes a JSON STRING and returns a JSON STRING, the same contract MQI_API uses for the
 * question engine, and for the same reason: it is the only shape that crosses
 * JavaScriptCore without annotating engine objects for Objective-C bridging - i.e.
 * without editing the gate-verified code this bundle exists to carry unedited.
 *
 * WHY THIS FILE EXISTS AT ALL: THE TWO CORES ARE NOT ONE API.
 *
 * The refutation of the split lane found this by calling it, not by reading it: its
 * first JSContext probe died on `CUBE3.isSolved is not a function`.
 *
 *     CUBE   83 exports        CUBE3  114 exports
 *     on CUBE only:  28 names  (isSolved, step1Done, whiteProgress, layerIntact,
 *                               bestSeat, stickersToState, CHANT_TWICE, SWAP, HOLDS,
 *                               moveSlots, slotCentre, SIDE_WORDS, ...)
 *     on CUBE3 only: 59 names  (crossDone, midDone, resumePoint, compose, EHOME,
 *                               permParity, transpose, movingPieces, ESLOT_NAMES, ...)
 *
 * That asymmetry is PRE-EXISTING and CORRECT: a 2x2 has no edge blocks and no middle
 * squares, so a 3x3 predicate has nothing to compute. It is also byte-identical to what
 * ships on the web today and nothing here changes it. What this file does is put ONE
 * SHAPE in front of both, so a Swift caller says `isSolved(size:state:)` and never
 * branches on the cube size to find out which name exists. Every normalisation below is
 * a QUOTE of a core's own function, never a re-derivation:
 *
 *   isSolved   2x2 -> CUBE.isSolved             3x3 -> keyOf(s) === keyOf(solved())
 *              plus facesAllOneColour on BOTH, because a solved cube can be sitting in
 *              any orientation and the method turns the whole cube over on purpose.
 *   validate   both cores have their own; the refusal CODES differ (the 3x3 has edge
 *              blocks, so it has etwice/enotreal/missinge/flip/parity that the 2x2
 *              cannot have) and are reported verbatim, never folded together.
 *   stepStatus the step tables are the ones cube/tools/cube-sanity.mjs gates, which were
 *              themselves verified against the PRE-SPLIT monolith with --source.
 *   geometry   2x2 placement(state, cubie) and 3x3 placement(state, kind, idx) are one
 *              call here; the returned rows carry the same {slot, twist, m, t}.
 *
 * STATELESSNESS. Nothing is held between calls. A state travels in and out as plain
 * JSON ({cp,co} on the small cube, {cp,co,ep,eo,cn} on the big one), so a Swift app can
 * persist a cube, quit, relaunch and carry on. There is no session map and no cache: the
 * cube engine is a pure function of its arguments, which is what lets the parity corpus
 * be a fixed committed file rather than something generated per run.
 *
 * DETERMINISM. `scramble` takes a SEED, not the host's Math.random, and runs it through
 * the same mulberry32 the split lane's probe uses. Two runs of the same seed on the same
 * size produce the same moves in Node and in JavaScriptCore - that is what makes the
 * committed parity corpus meaningful. `Math.random` is never called in this file.
 *
 * ENVELOPE. Every return is {"ok":true, ...} or
 *   {"ok":false,"error":{"name":..,"code":..,"message":..,"stack":..,"where":..
 *                        [,"hostDetail":..]}}.
 * A throw from inside a core is CAUGHT here and returned in that envelope with the JS
 * stack intact; the bridge turns it into a Swift error carrying the stack. `code` is the
 * runtime-independent handle - "bad-json", "bad-state", "bad-move", "bad-size",
 * "bad-args", "no-preset", "no-node", or "engine-threw" for anything a core raised - and
 * `message` is this file's own sentence, byte-identical in node and in JavaScriptCore.
 * `stack` and `hostDetail` are the only fields that CANNOT be identical across runtimes
 * (V8 and JSC format frames and word their JSON parser errors differently); they are
 * diagnostics, nothing asserts on them and no corpus records them.
 */
var CUBE_API = (function () {
  'use strict';

  /* ---------- the two cores, behind one door ---------- */
  function core(size) {
    var n = Number(size);
    if (n === 2) return CUBE;
    if (n === 3) return CUBE3;
    throw err('bad-size', 'size must be 2 or 3, got ' + JSON.stringify(size));
  }
  function isBig(size) { return Number(size) === 3; }

  /* ---------- deterministic PRNG ----------
     mulberry32, byte-for-byte the one cube/tools/cube-probe.mjs uses, so a seeded
     scramble is the same sequence in Node and in JavaScriptCore. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- FNV-1a, so a corpus row can pin a move list in 8 characters ----------
     Reimplemented in Swift in MQCubeEngineJS's tests; both are the standard 32-bit
     constants, so a mismatch means the moves differ, not that the hash differs. */
  function fnv1a(str) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i) & 0xff;
      if (str.charCodeAt(i) > 0xff) h ^= (str.charCodeAt(i) >>> 8);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  /* ---------- errors carry a CODE, not just a sentence ----------
     WOUND 7 of the extract refutation. Bad JSON in returned
       node: "arguments were not JSON (Expected property name or '}' in JSON at position 1)"
       JSC:  "arguments were not JSON (JSON Parse error: Expected '}')"
     The HOST's wording crossed the boundary into whatever the app shows, and into anything
     comparing node's answer with JavaScriptCore's. Every message this file writes is now
     its own, every failure carries a stable `code`, and a runtime's own text - the only
     part that can differ between V8 and JSC - travels in `hostDetail`, which is diagnostic
     and is never part of a corpus, a fixture or an assertion. */
  function err(code, message, hostDetail) {
    var e = new Error(message);
    e.code = code;
    if (hostDetail !== undefined && hostDetail !== null) e.hostDetail = String(hostDetail);
    return e;
  }

  /* ---------- argument handling ---------- */
  function parse(argsJSON, where) {
    if (argsJSON === undefined || argsJSON === null || argsJSON === '') return {};
    if (typeof argsJSON === 'object') return argsJSON;
    try { return JSON.parse(String(argsJSON)); }
    catch (e) {
      /* the host parser's own sentence is DELIBERATELY not in `message` - see err() */
      throw err('bad-json', where + ': arguments were not JSON', (e && e.message) ? e.message : String(e));
    }
  }
  function J(v) { return JSON.parse(JSON.stringify(v === undefined ? null : v)); }

  /* ---------- a state arriving from Swift is plain JSON ----------
     SHAPE IS NOT ENOUGH, and the refutation proved it three times over:

       CubeState(cp: Array(repeating: Int.max, count: 8), co: ...) round-tripped. isFinite
       is true of 9223372036854775807, JavaScript rounds it to 9223372036854776000, the
       engine answered {"ok":true,...} and echoed that number back - whereupon Swift's
       JSONDecoder THREW DecodingError.dataCorrupted decoding it into an Int. "No
       engine-supplied number may decode into a fixed-width Swift integer" is the engine-
       bridge lane's fix #2, and it was not honoured here.

       co: [0.5, ...] and co: [-1, ...] round-tripped too, minting keys like
       "41207563.2001.51002" and "41207563.1-1-100-1-11".

       And a WELL-SHAPED NONSENSE cube was answered cheerfully: cp all zero gave
       "isSolved ok, facesAllOneColour false" and "buildPlan ok, beats 0" - an app would
       have shown the child a plan that finishes nothing.

     So the DOMAIN is checked, not merely the shape: every entry a whole number inside the
     range a fixed-width integer survives, orientations inside their own range, and
     cp / ep / cn each a PERMUTATION of their slots. Every refusal comes back as a
     structured code in the {"ok":false} envelope - never a plausible-looking answer, and
     never a decode failure on the Swift side. */
  var SAFE_INT = 9007199254740991;   /* Number.MAX_SAFE_INTEGER, spelled out for ES5 */

  /* name -> [length, min, max, mustBeAPermutation] */
  var STATE_SPEC = {
    cp: [8, 0, 7, true],
    co: [8, 0, 2, false],
    ep: [12, 0, 11, true],
    eo: [12, 0, 1, false],
    cn: [6, 0, 5, true]
  };
  function stateFields(size) { return isBig(size) ? ['cp', 'co', 'ep', 'eo', 'cn'] : ['cp', 'co']; }

  /* Everything wrong with a candidate state, as sentences. Empty means usable.
     Written to REPORT rather than to throw, so CUBE_API.validateState can hand a restored
     save's problems to a UI and stateIn can turn the same list into one named refusal. */
  function stateProblems(size, s) {
    var out = [], names, i, k, name, spec, v, t, n, seen, missing;
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      return ['`state` must be an object carrying the cube\'s own arrays'];
    }
    names = stateFields(size);
    /* an array the OTHER size carries is a caller confusing the two cubes; saying so is
       cheaper than letting a 2x2 silently ignore twelve edges */
    for (k in STATE_SPEC) {
      if (!Object.prototype.hasOwnProperty.call(STATE_SPEC, k)) continue;
      if (names.indexOf(k) < 0 && s[k] !== undefined && s[k] !== null) {
        out.push('state.' + k + ' does not exist on the ' + Number(size) + 'x' + Number(size));
      }
    }
    for (k = 0; k < names.length; k++) {
      name = names[k]; spec = STATE_SPEC[name]; v = s[name];
      if (!Array.isArray(v) || v.length !== spec[0]) {
        out.push('state.' + name + ' must be an array of ' + spec[0] +
          ' (got ' + (Array.isArray(v) ? v.length : typeof v) + ')');
        continue;
      }
      seen = {};
      for (i = 0; i < spec[0]; i++) {
        t = v[i];
        if (typeof t !== 'number') { out.push('state.' + name + '[' + i + '] is not a number'); continue; }
        n = t;
        if (!isFinite(n)) { out.push('state.' + name + '[' + i + '] is not a finite number'); continue; }
        if (n !== Math.floor(n)) { out.push('state.' + name + '[' + i + '] is not a whole number'); continue; }
        if (n > SAFE_INT || n < -SAFE_INT) {
          /* printed as the ENGINE sees it, which is the point: a Swift Int.max does not
             arrive here as Int.max */
          out.push('state.' + name + '[' + i + '] is outside the range a whole number survives (' + n + ')');
          continue;
        }
        if (n < spec[1] || n > spec[2]) {
          out.push('state.' + name + '[' + i + '] is ' + n + ', outside ' + spec[1] + '..' + spec[2]);
          continue;
        }
        if (spec[3]) {
          if (seen[n]) out.push('state.' + name + ' names slot ' + n + ' more than once, so it is not a permutation');
          seen[n] = true;
        }
      }
      if (spec[3]) {
        missing = [];
        for (i = spec[1]; i <= spec[2]; i++) { if (!seen[i]) missing.push(i); }
        if (missing.length) {
          out.push('state.' + name + ' never names ' + missing.join(', ') + ', so it is not a permutation');
        }
      }
    }
    return out;
  }

  function stateIn(size, s, where) {
    var problems = stateProblems(size, s);
    if (problems.length) {
      /* the FIRST problem keeps the sentence short and stable (gates match on it); the
         rest travel in the same message so a caller sees all of them at once */
      throw err('bad-state', where + ': ' + problems[0]
        + (problems.length > 1
          ? '  (and ' + (problems.length - 1) + ' more: ' + problems.slice(1).join('; ') + ')'
          : ''));
    }
    var out = {}, names = stateFields(size), i;
    for (i = 0; i < names.length; i++) out[names[i]] = s[names[i]].slice();
    return out;
  }

  /* Moves arrive either as an array or as a chant/scramble string; the cores' own
     seqFromString is the parser, never a regex written here.

     THE THIRD CORE ASYMMETRY, and one a bridge hits on day one. Whole-cube turns are
     first-class MOVE entries on the big cube (`CUBE3.MOVE` carries y, yp, x, xp, x2) and
     are NOT on the small one - `CUBE.WHOLE.y` instead holds `{moves:['U',"D'"]}`, the
     pair of face turns that comes to the same thing on a 2x2. So `applyMoves(2, s, 'y')`
     would be an unknown move and `applyMoves(3, s, 'y')` would work, for a caller who
     wrote the same sentence. Here a whole-turn key is expanded through the core's own
     WHOLE table when the core does not carry it as a move, and left alone when it does.
     Nothing is invented: the expansion is the table's own `moves` array. */
  function expandMove(CC, tok) {
    if (CC.MOVE[tok]) return [tok];
    var w = CC.WHOLE && CC.WHOLE[tok];
    if (w && w.moves) return w.moves.slice();
    return null;
  }
  function movesIn(CC, moves, where) {
    if (moves === undefined || moves === null) return [];
    var list = Array.isArray(moves) ? moves.map(String) : CC.seqFromString(String(moves));
    var out = [], i, ex;
    for (i = 0; i < list.length; i++) {
      ex = expandMove(CC, list[i]);
      if (!ex) throw err('bad-move', where + ': "' + list[i] + '" is not a move on this cube');
      out = out.concat(ex);
    }
    return out;
  }

  function stateOut(CC, s) {
    var out = { cp: s.cp.slice(), co: s.co.slice() };
    if (s.ep) { out.ep = s.ep.slice(); out.eo = s.eo.slice(); out.cn = s.cn.slice(); }
    return out;
  }

  /* ---------- the step tables ----------
     Quoted from cube/tools/cube-sanity.mjs section D, which was itself run against the
     PRE-SPLIT monolith with --source before being trusted. Nothing is recomputed: each
     entry names a predicate the core exports and reads it.

     THE SMALL CUBE'S STEP 1 IS THE ONE TO READ CAREFULLY. step1Done() asks whether the
     white layer is built AT THE CEILING - the are-we-there-yet test used WHILE she
     builds - and the last beat of step 1 turns the cube over, after which it is false BY
     DESIGN and layerIntact is the test that means "built, held some way". So the step's
     `done` is layerIntact and step1Done travels alongside it as `atCeiling`. A harness
     that got this backwards went red on 150 of 150 solves and the code was correct. */
  var STEPS_2 = [
    { n: 1, id: 'white', label: 'Make white', done: function (CC, s) { return CC.layerIntact(s) !== null; } },
    { n: 2, id: 'yellow', label: 'Get yellow', done: function (CC, s) { return CC.ceilingAllYellow(s); } },
    { n: 3, id: 'solve', label: 'Solve', done: function (CC, s) { return CC.facesAllOneColour(s); } }
  ];
  var STEPS_3 = [
    { n: 1, id: 'daisy', label: 'The daisy', done: function (CC, s) { return CC.daisyDone(s); } },
    { n: 2, id: 'cross', label: 'The white cross', done: function (CC, s) { return CC.crossDone(s); } },
    { n: 3, id: 'layer', label: 'The white layer', done: function (CC, s) { return CC.firstLayerDone(s); } },
    { n: 4, id: 'middle', label: 'The middle row', done: function (CC, s) { return CC.twoLayersDone(s); } },
    { n: 5, id: 'ycross', label: 'The yellow cross', done: function (CC, s) { return CC.yellowCeilEdges(s).length === 4; } },
    { n: 6, id: 'matched', label: 'Cross blocks matched', done: function (CC, s) { return CC.matchedCeilEdges(s).length === 4; } },
    { n: 7, id: 'homes', label: 'Corners in their homes', done: function (CC, s) { return CC.homeCeilCorners(s).length === 4; } },
    { n: 8, id: 'twist', label: 'Cube solved', done: function (CC, s) { return CC.facesAllOneColour(s); } }
  ];

  /* ---------- envelope ---------- */
  function ok(extra) {
    var out = { ok: true }, k;
    for (k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k]; }
    return JSON.stringify(out);
  }
  /* `code` is the runtime-independent handle a caller branches on; `message` is this
     file's own sentence and is byte-identical in node and JavaScriptCore; `stack` and
     `hostDetail` are the two fields that CANNOT be (V8 and JSC format frames differently
     and word their parser errors differently), and they are diagnostics only - nothing
     asserts on them and no corpus records them. */
  function fail(where, e) {
    var out = {
      name: (e && e.name) ? String(e.name) : 'Error',
      code: (e && e.code) ? String(e.code) : 'engine-threw',
      message: (e && e.message) ? String(e.message) : String(e),
      stack: (e && e.stack) ? String(e.stack) : '',
      where: where
    };
    if (e && e.hostDetail) out.hostDetail = String(e.hostDetail);
    return JSON.stringify({ ok: false, error: out });
  }
  function guard(where, fn) {
    return function (argsJSON) {
      try { return fn(parse(argsJSON, where)); }
      catch (e) { return fail(where, e); }
    };
  }

  /* ================================================================ the surface */

  var API = {};

  /* ---- build ---- */
  API.build = guard('build', function () {
    return ok({
      build: {
        stamp: (typeof CUBE_ENGINE_META !== 'undefined' && CUBE_ENGINE_META) ? CUBE_ENGINE_META.stamp : 'unstamped',
        date: (typeof CUBE_ENGINE_META !== 'undefined' && CUBE_ENGINE_META) ? CUBE_ENGINE_META.date : '',
        sha: (typeof CUBE_ENGINE_META !== 'undefined' && CUBE_ENGINE_META) ? CUBE_ENGINE_META.sha : '',
        payloadHash: (typeof CUBE_ENGINE_META !== 'undefined' && CUBE_ENGINE_META) ? CUBE_ENGINE_META.payloadHash : '',
        source: (typeof CUBE_ENGINE_META !== 'undefined' && CUBE_ENGINE_META) ? CUBE_ENGINE_META.source : '',
        blocks: (typeof CUBE_ENGINE_META !== 'undefined' && CUBE_ENGINE_META) ? CUBE_ENGINE_META.blocks : [],
        platform: CUBE_HOST.platform,
        sizes: [2, 3],
        exportCounts: { CUBE: Object.keys(CUBE).length, CUBE3: Object.keys(CUBE3).length },
        api: Object.keys(API).sort()
      }
    });
  });

  /* ---- states ---- */
  API.newSolved = guard('newSolved', function (a) {
    var CC = core(a.size), s = CC.solved();
    return ok({ size: Number(a.size), state: stateOut(CC, s), key: CC.keyOf(s) });
  });

  /* scramble({size, seed, depth})      deterministic, mulberry32(seed)
     scramble({size, moves:"R U R'"})   an explicit sequence, parsed by the core
     scramble({size, preset:"daisy"})   one of the app's own named messes
     `state` may be given to scramble ON TOP of an existing cube instead of from solved. */
  API.scramble = guard('scramble', function (a) {
    var CC = core(a.size), moves, from, i, p, preset = null;
    from = (a.state === undefined || a.state === null) ? CC.solved() : stateIn(a.size, a.state, 'scramble');
    if (a.preset !== undefined && a.preset !== null) {
      for (i = 0; i < CC.PRESETS.length; i++) { if (CC.PRESETS[i].id === a.preset) preset = CC.PRESETS[i]; }
      if (!preset) throw err('no-preset', 'scramble: no preset "' + a.preset + '" on the ' + a.size + 'x' + a.size);
      p = CC.presetState(preset);
      return ok({ size: Number(a.size), state: stateOut(CC, p), key: CC.keyOf(p),
                  moves: CC.seqFromString(preset.scramble), preset: preset.id, seed: null });
    }
    if (a.moves !== undefined && a.moves !== null) {
      moves = movesIn(CC, a.moves, 'scramble');
    } else {
      if (a.seed === undefined || a.seed === null) throw err('bad-args', 'scramble: give `seed`, `moves` or `preset`');
      var depth = (a.depth === undefined || a.depth === null) ? 20 : Number(a.depth);
      if (!isFinite(depth) || depth < 0 || depth > 5000) throw err('bad-args', 'scramble: depth must be 0..5000');
      moves = CC.randomScramble(depth, mulberry32(Number(a.seed) | 0));
    }
    var s = CC.applySeq(from, moves);
    return ok({ size: Number(a.size), state: stateOut(CC, s), key: CC.keyOf(s), moves: moves,
                movesHash: fnv1a(moves.join(' ')),
                seed: (a.seed === undefined ? null : Number(a.seed)), preset: null });
  });

  API.applyMoves = guard('applyMoves', function (a) {
    var CC = core(a.size);
    var s = stateIn(a.size, a.state, 'applyMoves');
    var moves = movesIn(CC, a.moves, 'applyMoves');
    var after = CC.applySeq(s, moves);
    var inv = CC.invertSeq(moves);
    return ok({ size: Number(a.size), state: stateOut(CC, after), key: CC.keyOf(after),
                keyBefore: CC.keyOf(s), inverse: inv, moves: moves, movesHash: fnv1a(moves.join(' ')) });
  });

  /* isSolved: BOTH readings, because they are different questions and the method needs
     both. `solved` is "keyed identical to the solved cube" (CUBE.isSolved on the small
     one; the same comparison on the big one, which has no isSolved of its own).
     `facesAllOneColour` is "every side is one colour", which is what a finished cube
     looks like after the method has turned it over - both cores export that one. */
  API.isSolved = guard('isSolved', function (a) {
    var CC = core(a.size), s = stateIn(a.size, a.state, 'isSolved');
    var key = CC.keyOf(s), solvedKey = CC.keyOf(CC.solved());
    return ok({
      size: Number(a.size), key: key, solvedKey: solvedKey,
      solved: isBig(a.size) ? (key === solvedKey) : CC.isSolved(s),
      facesAllOneColour: CC.facesAllOneColour(s),
      normalisedBy: isBig(a.size) ? 'keyOf(state) === keyOf(solved())  (CUBE3 exports no isSolved)'
                                  : 'CUBE.isSolved(state)'
    });
  });

  /* ---- is this thing a cube at all? ----
     The lane's own selling point is "persist a cube, quit, relaunch, carry on", and there
     was no way to ASK whether the thing that came back off disk is a cube. Two layers,
     reported separately because they fail for different reasons and a UI does different
     things about them:

       domain   is it a state - eight corners, a permutation, twists 0..2, whole numbers a
                fixed-width integer survives. A save file that lost bytes fails here.
       legal    is it a cube a child could be holding - the cores' own validate(), run over
                this state's own sticker view. Twist and parity refusals live here.

     A restored save is checked with this BEFORE it is drawn. `problems` is the same list
     stateIn refuses on, so the two can never disagree. */
  API.validateState = guard('validateState', function (a) {
    var size = Number(a.size);
    if (size !== 2 && size !== 3) throw err('bad-size', 'size must be 2 or 3, got ' + JSON.stringify(a.size));
    var problems = stateProblems(size, a.state);
    if (problems.length) {
      return ok({ size: size, domainOk: false, problems: problems,
                  legal: false, code: 'bad-state', message: problems[0],
                  key: null, facesAllOneColour: null });
    }
    var CC = core(size), s = stateIn(size, a.state, 'validateState');
    var v = CC.validate(CC.stateToStickers(s));
    return ok({
      size: size, domainOk: true, problems: [],
      legal: !!v.ok,
      code: v.ok ? null : String(v.code || ''),
      message: v.ok ? '' : String(v.msg || ''),
      key: CC.keyOf(s),
      facesAllOneColour: CC.facesAllOneColour(s)
    });
  });

  API.stickers = guard('stickers', function (a) {
    var CC = core(a.size), s = stateIn(a.size, a.state, 'stickers');
    var sk = CC.stateToStickers(s);
    return ok({ size: Number(a.size), stickers: sk, count: sk.length, key: CC.keyOf(s) });
  });

  /* validate takes the STICKER VIEW - the painter's door into the core - and this is the
     one API method whose REFUSALS matter more than its acceptances. The refutation's
     wound 2: the split fixture only ever fed it legal paintings, so every rejection
     branch was unreached in all 1,218 fixture rows, and a mutation that DELETED the "not
     a real cube block" refusal outright passed every gate. The refusal corpus in
     cube/tools/cube-engine-sanity.mjs walks these branches by name. */
  API.validate = guard('validate', function (a) {
    var CC = core(a.size);
    if (!Array.isArray(a.stickers)) throw err('bad-args', 'validate: `stickers` must be an array');
    var want = isBig(a.size) ? 54 : 24;
    /* A SHORT array is a legitimate thing to ask about (a half-painted cube), so it is
       passed straight through to the core rather than rejected here - the core answers
       'blank'. A LONG one is a caller bug and is named as such. */
    if (a.stickers.length > want) {
      throw err('bad-args', 'validate: the ' + a.size + 'x' + a.size + ' has ' + want +
        ' squares, got ' + a.stickers.length);
    }
    var sk = [], i;
    for (i = 0; i < want; i++) sk.push(a.stickers[i] === undefined ? null : a.stickers[i]);
    var v = CC.validate(sk);
    var out = { size: Number(a.size), ok: !!v.ok, code: v.ok ? null : String(v.code || ''),
                message: v.ok ? '' : String(v.msg || ''), suspects: v.ok ? [] : J(v.suspects || []) };
    if (v.ok) {
      out.state = stateOut(CC, v.state);
      out.key = CC.keyOf(v.state);
      out.scheme = J(v.scheme ? { map: v.scheme.map, back: v.scheme.back } : null);
    }
    return ok({ result: out });
  });

  /* ---- the method ---- */
  API.stepStatus = guard('stepStatus', function (a) {
    var CC = core(a.size), s = stateIn(a.size, a.state, 'stepStatus');
    var table = isBig(a.size) ? STEPS_3 : STEPS_2;
    var steps = [], i, done, first = null;
    for (i = 0; i < table.length; i++) {
      done = !!table[i].done(CC, s);
      steps.push({ n: table[i].n, id: table[i].id, label: table[i].label, done: done });
      if (!done && first === null) first = table[i].n;
    }
    var extras = { diagnose: J(CC.diagnose(s)) };
    if (isBig(a.size)) {
      extras.resumePoint = J(CC.resumePoint(s));
      extras.petalCount = CC.petalCount(s);
      extras.daisyAnywhere = J(CC.daisyAnywhere(s));
      extras.whiteCornersHome = CC.whiteCornersHome(s);
      extras.midDone = CC.midDone(s);
      extras.whiteFaceDone = CC.whiteFaceDone(s);
      extras.crossShape = J(CC.crossShape(s));
      extras.yellowCeilEdges = J(CC.yellowCeilEdges(s));
      extras.matchedCeilEdges = J(CC.matchedCeilEdges(s));
      extras.homeCeilCorners = J(CC.homeCeilCorners(s));
      extras.yellowCeilCorners = J(CC.yellowCeilCorners(s));
      extras.ceilCornersDone = CC.ceilCornersDone(s);
      extras.bestCeilStop = J(CC.bestCeilStop(s));
    } else {
      extras.whiteProgress = J(CC.whiteProgress(s));
      /* the are-we-there-yet test, reported next to step 1 rather than AS step 1 */
      extras.step1DoneAtCeiling = CC.step1Done(s);
      extras.layerIntact = J(CC.layerIntact(s));
      extras.readSides = J(CC.readSides(s));
      extras.matchingSides = J(CC.matchingSides(s)).length;
      extras.bestSeat = J(CC.bestSeat(s));
      extras.faceHold = J(CC.faceHold(s));
      extras.faceHoldUp = J(CC.faceHoldUp(s));
      extras.ceilingAllYellow = CC.ceilingAllYellow(s);
    }
    return ok({
      size: Number(a.size), key: CC.keyOf(s), steps: steps,
      firstUnfinished: first, allDone: first === null,
      facesAllOneColour: CC.facesAllOneColour(s), extras: extras
    });
  });

  /* The plan, beat by beat. `text:false` drops say/why/title and keeps the shape, which
     is what a 10,000-plan sweep wants; the default keeps every word, because the words
     are the product. */
  API.buildPlan = guard('buildPlan', function (a) {
    var CC = core(a.size), s = stateIn(a.size, a.state, 'buildPlan');
    var pl = (a.hint === undefined || a.hint === null) ? CC.buildPlan(s) : CC.buildPlan(s, a.hint);
    var keepText = (a.text === undefined) ? true : !!a.text;
    if (!pl) return ok({ size: Number(a.size), plan: null });
    var beats = (pl.beats || []).map(function (b) {
      var row = {
        phase: b.phase === undefined ? null : b.phase,
        kind: b.kind || '',
        moves: (b.moves || []).slice(),
        chant: b.chant === undefined ? null : b.chant,
        ord: b.ord === undefined ? null : b.ord,
        of: b.of === undefined ? null : b.of
      };
      if (keepText) {
        row.say = String(b.say === undefined ? '' : b.say);
        row.why = String(b.why === undefined ? '' : b.why);
        row.title = String(b.title === undefined ? '' : b.title);
      }
      return row;
    });
    return ok({
      size: Number(a.size), key: CC.keyOf(s),
      plan: {
        ok: !!pl.ok, beatCount: beats.length, beats: beats,
        end: pl.end ? stateOut(CC, pl.end) : null,
        endKey: pl.end ? CC.keyOf(pl.end) : null,
        stateKeys: pl.stateKeys ? J(pl.stateKeys) : null
      }
    });
  });

  /* ---- the guided script, verbatim ----
     Cube Quest law: the instruction text is never changed. So it crosses the bridge
     WORD FOR WORD, and the Swift gate hashes every node's text against a snapshot
     recorded from the monolith. */
  function scriptOf(CC) { return GUIDE.build(CC); }
  function nodeOut(CC, n) {
    return {
      id: n.id, phase: n.phase === undefined ? null : n.phase,
      title: String(n.title === undefined ? '' : n.title),
      say: String(n.say === undefined ? '' : n.say),
      why: String(n.why === undefined ? '' : n.why),
      src: n.src === undefined ? null : n.src,
      kind: n.kind === undefined ? null : n.kind,
      moves: (n.moves || []).slice(),
      chant: n.chant === undefined ? null : n.chant,
      cheer: n.cheer === undefined ? null : n.cheer,
      panic: !!n.panic, end: !!n.end, method: !!n.method,
      askOnly: !!n.askOnly, rephrase: !!n.rephrase,
      ask: n.ask ? J(n.ask) : null,
      to: n.to || null,
      worldKey: n.world ? CC.keyOf(n.world) : null,
      exits: J(GUIDE.exits(n))
    };
  }
  API.guideScript = guard('guideScript', function (a) {
    var CC = core(a.size), sc = scriptOf(CC);
    var nodes = sc.order.map(function (id) { return nodeOut(CC, sc.nodes[id]); });
    return ok({
      size: Number(a.size),
      script: {
        ok: !!sc.ok, missing: J(sc.missing), first: sc.first, last: sc.last,
        order: sc.order.slice(), nodeCount: sc.order.length, nodes: nodes,
        walk: J(GUIDE.walk(sc)),
        coverage: J(GUIDE.coverage(CC, GUIDE.plansOf(CC)))
      }
    });
  });
  API.guideNode = guard('guideNode', function (a) {
    var CC = core(a.size), sc = scriptOf(CC);
    var n = sc.nodes[a.id];
    if (!n) throw err('no-node', 'guideNode: no node "' + a.id + '" in the ' + a.size + 'x' + a.size + ' script');
    return ok({ size: Number(a.size), node: nodeOut(CC, n) });
  });

  /* ---- WOUND 1 of the extract refutation: the option the bridge dropped ----
   *
   * The web painter asks
   *     INFER.bestQuestion(C, known, res.list, { nameable: canNameByColour })
   * (cube/index.html line 5782) and this file used to ask
   *     INFER.bestQuestion(CC, painted, comp.list, {}).
   * Measured with a nameable predicate supplied, the winning square differs from the {}
   * answer in 200 of 200 seeded paintings: THE IPAD WAS ASKING THE CHILD ABOUT A
   * DIFFERENT SQUARE FROM THE WEB. The whole nameable/slack branch - whose own source
   * comment says "a question nobody can name is a question nobody can answer" - was dead
   * across the bridge, and section F could not see it because it compared CUBE_API to
   * INFER with the same empty opts.
   *
   * WHY THIS IS A REIMPLEMENTATION AND NOT A FIFTH BLOCK.
   *
   * `canNameByColour` is cube/index.html line 4119 and it is not a standalone function:
   * it is the top of a five-function chain (`anchorsOf`, `sideAnchorsOf`, `otherFacesOf`,
   * `knownColourAt`, plus `facePer`/`big`) living in the PAINTER's own scope, closing over
   * `app.paint`, `app.inferRes`, `app.whiteDown` / `assumedSid` and the page constant
   * `PEEK_RANK`. Those are app state, not method logic, and they sit outside all four
   * marked blocks. Lifting a fifth block round them would mean writing markers INTO
   * cube/index.html - which Q83 forbids this lane from doing, and which the next Studio
   * deploy would erase anyway. So it is REIMPLEMENTED here, in ES5, and the equivalence
   * is not asserted, it is GATED: tools/make-cube-api-golden.mjs lifts those very
   * functions out of cube/index.html by name, drives the MONOLITH'S OWN
   * `canNameByColour` over the same battery of paintings, and records the answer in
   * tools/fixtures/cube-api-golden.json. If one character of the page's predicate moves,
   * or one character of this reimplementation does, the golden gate goes red on both the
   * node side and the Swift side.
   *
   * THE TRANSLATION, line by line, and why it is faithful:
   *
   *   knownColourAt(sid)  page: app.paint[sid] -> assumedSid(sid) ? 'white' -> the colour
   *     every remaining candidate agrees on (null when the search was CUT SHORT).
   *     Here: painted[sid] -> the unanimous colour. The two agree because the array the
   *     page hands bestQuestion is `known` = effPaint(), which ALREADY carries 'white' at
   *     every floor square when whiteDown is set - that is exactly what assumedSid says.
   *   anchorsOf / sideAnchorsOf / otherFacesOf  quoted move for move, including the
   *     PEEK_RANK sort (which cannot change a boolean, and is kept so the code reads as
   *     the page's) and the `out.length === o.length` test that makes a side anchor count
   *     only when EVERY other face of the block is known.
   *   canNameByColour     anchors OR side anchors, non-empty.
   */
  var PEEK_RANK = [0, 2, 1, 0, 2, 1];

  function nameableArray(CC, size, painted, comp) {
    var big = isBig(size);
    /* a CUT SHORT search is not truth - the page refuses to infer a colour from it, and so
       does this (`res.capped` in knownColourAt) */
    var list = (comp && !comp.capped && comp.list && comp.list.length) ? comp.list : null;

    function knownColourAt(sid) {
      if (painted[sid]) return painted[sid];
      if (!list) return null;
      var c = list[0].stickers[sid], i;
      for (i = 1; i < list.length; i++) { if (list[i].stickers[sid] !== c) return null; }
      return c;
    }
    function otherFacesOf(pc) {
      var home = (pc.kind === 'e' ? CC.EHOME : CC.HOME)[pc.slot], out = [], i;
      for (i = 0; i < home.length; i++) { if (home[i] !== pc.face) out.push(home[i]); }
      out.sort(function (x, y) { return PEEK_RANK[x] - PEEK_RANK[y]; });
      return out;
    }
    function anchorsOf(sid) {
      var pc = INFER.pieceOf(CC, sid), sids = INFER.blockSids(CC, pc), out = [], i, c;
      for (i = 0; i < sids.length; i++) {
        if (sids[i] === sid) continue;
        c = knownColourAt(sids[i]);
        if (c && out.indexOf(c) < 0) out.push(c);
      }
      return out;
    }
    function sideAnchorsOf(sid) {
      if (!big) return [];
      var pc = INFER.pieceOf(CC, sid);
      if (pc.kind === 'n') return [];
      var o = otherFacesOf(pc), out = [], i, c;
      for (i = 0; i < o.length; i++) {
        c = knownColourAt(CC.WHERE_N[o[i]]);
        if (c && out.indexOf(c) < 0) out.push(c);
      }
      return out.length === o.length ? out : [];
    }

    var total = INFER.stickerCount(CC), arr = [], sid;
    for (sid = 0; sid < total; sid++) {
      arr.push(anchorsOf(sid).length > 0 || sideAnchorsOf(sid).length > 0);
    }
    return arr;
  }

  /* ---- the inference engine ----
     `painted` is the sticker view with nulls where she has not coloured yet.

     BOTH ANSWERS COME BACK, always:
       best / ranking            with the nameable predicate - THE WEB'S OWN QUESTION
       plain / plainRanking      with {} - what this bridge used to answer, kept so a
                                 caller can see the difference rather than inherit it
       nameable                  the resolved boolean array, so a Swift painter can supply
                                 it back (`nameable: [Bool]`) or read why a square won
       differs                   true when the two winners are not the same square

     `nameable: false` asks for the plain ranking in `best` as well, for a caller that
     genuinely wants the un-named ranking; anything else (absent, true, or an explicit
     boolean array) uses the predicate.

     The whole ask RANKING is returned, not just the winner: a tie-break that changes which
     of two equally sharp squares wins moves the ranking even when the winner is unchanged.
     The nameable array is held FIXED across the ranking's steps - the ranking is a probe of
     one painting, not a simulation of her answering. */
  API.bestQuestion = guard('bestQuestion', function (a) {
    var CC = core(a.size);
    var total = INFER.stickerCount(CC);
    if (!Array.isArray(a.painted)) throw err('bad-args', 'bestQuestion: `painted` must be an array of ' + total);
    if (a.painted.length > total) {
      throw err('bad-args', 'bestQuestion: the ' + a.size + 'x' + a.size + ' has ' + total +
        ' squares, got ' + a.painted.length);
    }
    var painted = [], i;
    for (i = 0; i < total; i++) painted.push(a.painted[i] === undefined ? null : a.painted[i]);
    var opts = { cap: (a.cap === undefined ? 240 : Number(a.cap)),
                 budget: (a.budget === undefined ? 20000 : Number(a.budget)) };
    var comp = INFER.completions(CC, painted, opts);

    /* the resolved predicate: a caller may hand the boolean array across the bridge (JSON
       cannot carry a function), otherwise the API computes the page's own */
    var nameable = null;
    if (Array.isArray(a.nameable)) {
      nameable = [];
      for (i = 0; i < total; i++) nameable.push(!!a.nameable[i]);
    } else if (a.nameable !== false) {
      nameable = nameableArray(CC, a.size, painted, comp);
    }
    var slack = (a.slack === undefined || a.slack === null) ? 1 : Number(a.slack);
    if (!isFinite(slack) || slack < 0) throw err('bad-args', 'bestQuestion: slack must be a number >= 0');
    var withOpts = nameable
      ? { nameable: function (sid) { return !!nameable[sid]; }, slack: slack }
      : {};

    var best = INFER.bestQuestion(CC, painted, comp.list, withOpts);
    var plain = INFER.bestQuestion(CC, painted, comp.list, {});
    var scs = INFER.schemes(CC, painted);
    var depth = (a.rankDepth === undefined ? 8 : Number(a.rankDepth));

    function rankWith(o) {
      var rank = [], p = painted.slice(), k, b;
      for (k = 0; k < depth; k++) {
        b = INFER.bestQuestion(CC, p, comp.list, o);
        if (!b || b.sid === undefined || b.sid === null) break;
        rank.push({ sid: b.sid, worst: b.worst, spread: b.spread, easy: b.easy,
                    nameable: !!b.nameable });
        p[b.sid] = 'x';
      }
      return rank;
    }
    var nameableCount = 0;
    if (nameable) { for (i = 0; i < total; i++) { if (nameable[i]) nameableCount++; } }

    return ok({
      size: Number(a.size),
      completions: { count: comp.count, capped: !!comp.capped, listSize: comp.list.length },
      best: best ? J(best) : null,
      ranking: rankWith(withOpts),
      plain: plain ? J(plain) : null,
      plainRanking: rankWith({}),
      nameable: nameable ? nameable.slice() : null,
      nameableCount: nameableCount,
      slack: nameable ? slack : null,
      differs: !!(best && plain && best.sid !== plain.sid),
      schemeCount: scs ? scs.length : 0,
      findable: J(INFER.findable(CC, painted, (a.sid === undefined ? 0 : Number(a.sid)))),
      pieceOf: J(INFER.pieceOf(CC, (a.sid === undefined ? 0 : Number(a.sid)))),
      blockSids: J(INFER.blockSids(CC, INFER.pieceOf(CC, (a.sid === undefined ? 0 : Number(a.sid)))))
    });
  });

  /* ---- geometry: everything a SceneKit view needs to place and spin a block ----
     ALL OF IT lives inside the two cores already (CORE lines 865-910, CORE3 lines
     1698-1985 of cube/index.html), so no fifth block had to be extracted out of
     render.js. What render.js adds on top is CSS, not maths: a hex palette, the six
     per-face CSS transforms, a pixel scale (50 px on the small cube, 200/3 on the big
     one) and the ring's transform. A SceneKit renderer supplies its own equivalents of
     those four and consumes the rows below unchanged.

       m  a 3x3 rotation matrix, rows-of-3, ready for a SCNMatrix4 / simd_float3x3
       t  the block's centre in cubie units; multiply by whatever edge length the scene
          uses (render.js multiplies by 50 / by 200/3)
       faces  which of the six faces carry a sticker on this block, in the core's own
          order, with the colour each one shows right now */
  function geomRows(CC, size, s) {
    var rows = [], i, p;
    if (!isBig(size)) {
      for (i = 0; i < 8; i++) {
        p = CC.placement(s, i);
        rows.push({ key: 'c' + i, kind: 'c', index: i, slot: p.slot, twist: p.twist,
                    m: J(p.m), t: J(p.t), faces: CC.HOME[i].slice(), colours: CC.cornerColours(i) });
      }
      return rows;
    }
    for (i = 0; i < 8; i++) {
      p = CC.placement(s, 'c', i);
      rows.push({ key: 'c' + i, kind: 'c', index: i, slot: p.slot, twist: p.twist,
                  m: J(p.m), t: J(p.t), faces: CC.HOME[i].slice(), colours: CC.cornerColours(i) });
    }
    for (i = 0; i < 12; i++) {
      p = CC.placement(s, 'e', i);
      rows.push({ key: 'e' + i, kind: 'e', index: i, slot: p.slot, twist: p.twist,
                  m: J(p.m), t: J(p.t), faces: CC.EHOME[i].slice(), colours: CC.edgeColours(i) });
    }
    for (i = 0; i < 6; i++) {
      p = CC.placement(s, 'n', i);
      rows.push({ key: 'n' + i, kind: 'n', index: i, slot: p.slot, twist: p.twist,
                  m: J(p.m), t: J(p.t), faces: [i], colours: [CC.FACE_COLOUR[i]] });
    }
    return rows;
  }
  API.geometry = guard('geometry', function (a) {
    var CC = core(a.size), s = stateIn(a.size, a.state, 'geometry');
    return ok({ size: Number(a.size), key: CC.keyOf(s), pieces: geomRows(CC, a.size, s),
                faceDirections: J(CC.FACE_DIR), faceColours: J(CC.FACE_COLOUR),
                faceLetters: J(CC.FACE_LETTER) });
  });

  /* Which blocks a move turns, and about what. The 2x2 answers in SLOTS (moveSlots) and
     the 3x3 in PIECES (movingPieces); both are returned as a piece-key list so a
     renderer animates the same way on either size. */
  API.moveGeometry = guard('moveGeometry', function (a) {
    var CC = core(a.size), s = stateIn(a.size, a.state, 'moveGeometry');
    var m = String(a.move === undefined ? '' : a.move);
    var whole = (CC.WHOLE && CC.WHOLE[m]) ? CC.WHOLE[m] : null;
    if (!CC.MOVE[m] && !whole) throw err('bad-move', 'moveGeometry: "' + m + '" is not a move on this cube');
    /* A whole-cube turn on the SMALL cube is not a MOVE at all (see expandMove), so
       CUBE.moveSpin would read its letter off FACE_LETTER and miss. The WHOLE table has
       the axis and the degrees, and every block travels. */
    var axis, deg, keys = [], i, slots = null;
    if (whole && !CC.MOVE[m]) { axis = whole.axis; deg = whole.deg; }
    else { var spin = CC.moveSpin(m); axis = spin.axis; deg = spin.deg; }
    if (!isBig(a.size)) {
      if (whole) { for (i = 0; i < 8; i++) keys.push('c' + i); }
      else {
        slots = CC.moveSlots(m);
        for (i = 0; i < slots.length; i++) keys.push('c' + s.cp[slots[i]]);
      }
    } else {
      var pcs = CC.movingPieces(s, m);
      for (i = 0; i < pcs.length; i++) keys.push(pcs[i][0] + pcs[i][1]);
    }
    return ok({ size: Number(a.size), move: m, axis: J(axis), deg: deg,
                slots: slots, pieces: keys, isWhole: !!whole,
                moves: movesIn(CC, [m], 'moveGeometry'),
                inverse: CC.MOVE[m] ? CC.invertMove(m) : null });
  });

  /* ---- the words ----
     The refutation's wound 1: the split fixture recorded the export NAMES and never the
     VALUES behind them, so `CAPTION`, `CHANT_TWICE`, preset hints, `SLOT_NAMES` and
     `ordinal` could all be rewritten and every gate stayed green. These are the sentences
     the child reads. They cross the bridge whole and the Swift gate hashes them. */
  API.words = guard('words', function (a) {
    var CC = core(a.size), out = {}, i;
    out.CAPTION = J(CC.CAPTION);
    out.CHANTS = J(CC.CHANTS);
    out.PRESETS = J(CC.PRESETS);
    out.SLOT_NAMES = J(CC.SLOT_NAMES);
    out.COLOURS = J(CC.COLOURS);
    out.FACE_COLOUR = J(CC.FACE_COLOUR);
    out.FACE_LETTER = J(CC.FACE_LETTER);
    out.PLAIN_SCHEME = J(CC.PLAIN_SCHEME);
    out.ordinal = [];
    for (i = 0; i <= 8; i++) out.ordinal.push(CC.ordinal(i));
    if (isBig(a.size)) {
      out.ESLOT_NAMES = J(CC.ESLOT_NAMES);
      out.SIDE_WORD = J(CC.SIDE_WORD);
      out.CHANT_KEYS = J(CC.CHANT_KEYS);
      out.CHANT_TWICE = null;
    } else {
      out.CHANT_TWICE = String(CC.CHANT_TWICE);
      out.SIDE_WORDS = J(CC.SIDE_WORDS);
      out.SIDE_FACES = J(CC.SIDE_FACES);
    }
    return ok({ size: Number(a.size), words: out });
  });

  /* ---- diagnostics ---- */
  API.drainLogs = guard('drainLogs', function () { return ok({ logs: CUBE_HOST.drainLogs() }); });
  API.exports = guard('exports', function (a) {
    var CC = core(a.size);
    return ok({ size: Number(a.size), names: Object.keys(CC).sort(), count: Object.keys(CC).length });
  });

  return API;
})();
