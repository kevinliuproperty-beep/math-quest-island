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
 *   {"ok":false,"error":{"name":..,"message":..,"stack":..,"where":..}}.
 * A throw from inside a core is CAUGHT here and returned in that envelope with the JS
 * stack intact; the bridge turns it into a Swift error carrying the stack.
 */
var CUBE_API = (function () {
  'use strict';

  /* ---------- the two cores, behind one door ---------- */
  function core(size) {
    var n = Number(size);
    if (n === 2) return CUBE;
    if (n === 3) return CUBE3;
    throw new Error('size must be 2 or 3, got ' + JSON.stringify(size));
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

  /* ---------- argument handling ---------- */
  function parse(argsJSON, where) {
    if (argsJSON === undefined || argsJSON === null || argsJSON === '') return {};
    if (typeof argsJSON === 'object') return argsJSON;
    try { return JSON.parse(String(argsJSON)); }
    catch (e) { throw new Error(where + ': arguments were not JSON (' + e.message + ')'); }
  }
  function J(v) { return JSON.parse(JSON.stringify(v === undefined ? null : v)); }

  /* A state arriving from Swift is plain JSON. Check its SHAPE here so a typo comes back
     as a named error rather than as a TypeError three frames inside a core. */
  function stateIn(size, s, where) {
    if (!s || typeof s !== 'object') throw new Error(where + ': `state` is required (an object)');
    function arr(name, len) {
      var v = s[name];
      if (!Array.isArray(v) || v.length !== len) {
        throw new Error(where + ': state.' + name + ' must be an array of ' + len +
          ' (got ' + (Array.isArray(v) ? v.length : typeof v) + ')');
      }
      var out = [], i;
      for (i = 0; i < len; i++) {
        var n = Number(v[i]);
        if (!isFinite(n)) throw new Error(where + ': state.' + name + '[' + i + '] is not a number');
        out.push(n);
      }
      return out;
    }
    if (!isBig(size)) return { cp: arr('cp', 8), co: arr('co', 8) };
    return { cp: arr('cp', 8), co: arr('co', 8), ep: arr('ep', 12), eo: arr('eo', 12), cn: arr('cn', 6) };
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
      if (!ex) throw new Error(where + ': "' + list[i] + '" is not a move on this cube');
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
  function fail(where, e) {
    return JSON.stringify({
      ok: false,
      error: {
        name: (e && e.name) ? String(e.name) : 'Error',
        message: (e && e.message) ? String(e.message) : String(e),
        stack: (e && e.stack) ? String(e.stack) : '',
        where: where
      }
    });
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
      if (!preset) throw new Error('scramble: no preset "' + a.preset + '" on the ' + a.size + 'x' + a.size);
      p = CC.presetState(preset);
      return ok({ size: Number(a.size), state: stateOut(CC, p), key: CC.keyOf(p),
                  moves: CC.seqFromString(preset.scramble), preset: preset.id, seed: null });
    }
    if (a.moves !== undefined && a.moves !== null) {
      moves = movesIn(CC, a.moves, 'scramble');
    } else {
      if (a.seed === undefined || a.seed === null) throw new Error('scramble: give `seed`, `moves` or `preset`');
      var depth = (a.depth === undefined || a.depth === null) ? 20 : Number(a.depth);
      if (!isFinite(depth) || depth < 0 || depth > 5000) throw new Error('scramble: depth must be 0..5000');
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
    if (!Array.isArray(a.stickers)) throw new Error('validate: `stickers` must be an array');
    var want = isBig(a.size) ? 54 : 24;
    /* A SHORT array is a legitimate thing to ask about (a half-painted cube), so it is
       passed straight through to the core rather than rejected here - the core answers
       'blank'. A LONG one is a caller bug and is named as such. */
    if (a.stickers.length > want) {
      throw new Error('validate: the ' + a.size + 'x' + a.size + ' has ' + want +
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
    if (!n) throw new Error('guideNode: no node "' + a.id + '" in the ' + a.size + 'x' + a.size + ' script');
    return ok({ size: Number(a.size), node: nodeOut(CC, n) });
  });

  /* ---- the inference engine ----
     `painted` is the sticker view with nulls where she has not coloured yet. The whole
     ask RANKING is returned, not just the winner: a tie-break that changes which of two
     equally sharp squares wins moves the ranking even when the winner is unchanged. That
     is exactly the hole the split lane's first probe had. */
  API.bestQuestion = guard('bestQuestion', function (a) {
    var CC = core(a.size);
    var total = INFER.stickerCount(CC);
    if (!Array.isArray(a.painted)) throw new Error('bestQuestion: `painted` must be an array of ' + total);
    if (a.painted.length > total) {
      throw new Error('bestQuestion: the ' + a.size + 'x' + a.size + ' has ' + total +
        ' squares, got ' + a.painted.length);
    }
    var painted = [], i;
    for (i = 0; i < total; i++) painted.push(a.painted[i] === undefined ? null : a.painted[i]);
    var opts = { cap: (a.cap === undefined ? 240 : Number(a.cap)),
                 budget: (a.budget === undefined ? 20000 : Number(a.budget)) };
    var comp = INFER.completions(CC, painted, opts);
    var best = INFER.bestQuestion(CC, painted, comp.list, {});
    var scs = INFER.schemes(CC, painted);
    var depth = (a.rankDepth === undefined ? 8 : Number(a.rankDepth));
    var rank = [], p = painted.slice(), k, b;
    for (k = 0; k < depth; k++) {
      b = INFER.bestQuestion(CC, p, comp.list, {});
      if (!b || b.sid === undefined || b.sid === null) break;
      rank.push({ sid: b.sid, worst: b.worst, spread: b.spread, easy: b.easy });
      p[b.sid] = 'x';
    }
    return ok({
      size: Number(a.size),
      completions: { count: comp.count, capped: !!comp.capped, listSize: comp.list.length },
      best: best ? J(best) : null,
      schemeCount: scs ? scs.length : 0,
      ranking: rank,
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
    if (!CC.MOVE[m] && !whole) throw new Error('moveGeometry: "' + m + '" is not a move on this cube');
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
