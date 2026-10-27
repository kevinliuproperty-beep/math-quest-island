/* Math Quest Island - PSLE Maths Paper mode (P5-P6 mirror, Sprint 1, 2026-10-28)
 *
 * The P5/P6 twin of the P3 Mock Paper. It REUSES that mode's engine (js/modes/p3-mock.js:
 * buildPaper, scorePaper, the exam navigator, timing and snapshots) and changes only the
 * format, the node weights and the HUD.
 *
 * FORMAT: SEAB PSLE Mathematics (0008), for examination from 2026
 * (https://isomer-user-content.by.gov.sg/334/fe51f29b-04ae-4fcb-a907-8db04c028510/0008_y26_sy.pdf):
 *   Paper 1, 1 h 10 min, NO calculator, 50 marks:
 *     Booklet A  10 MCQ x 1 mark + 8 MCQ x 2 marks = 26
 *     Booklet B  12 short-answer x 2 marks          = 24
 *   Paper 2, 1 h 20 min, calculator ALLOWED, 50 marks:
 *     5 short-answer x 2 marks = 10, then 10 structured/long-answer questions of 3, 4 or 5
 *     marks = 40. SEAB fixes the total, not the split; this paper uses 3 x 3 + 4 x 4 + 3 x 5.
 *   Total 100 marks, 2 h 30 min. A P5 child sits the same shape on P4-P5 content.
 *
 * CALCULATOR: Paper 2 shows a "physical calculator allowed" notice; there is no on-screen
 * calculator. PSLE candidates use their own SEAB-approved calculator, so rehearsing with
 * the same device is the point; an on-screen keypad on an iPad would also cover the
 * question card and the typed-answer box the layout gate protects.
 *
 * MARKING: all-or-nothing by slot value, as the P3 mock. PSLE awards method marks on
 * short answers (1 of 2) and on every structured question; capturing working is a
 * Sprint 2 design (vault: P5-P6 Sprint 1 report, "Working-aware diagnosis"). The
 * report says so.
 *
 * Self-test: node js/modes/psle-mock.js --selftest
 */
(function (global) {
  "use strict";

  /* p3-mock.js loads before this file in index.html's manifest and registers at once. */
  var base = global.MQI && global.MQI.modes && global.MQI.modes["p3-mock"];
  if (!base && typeof require === "function") {
    /* node: p3-mock runs ITS self-test on a --selftest argv at load; hide the flag from it */
    var argv = process.argv;
    process.argv = argv.filter(function (a) { return a !== "--selftest"; });
    try { base = require("./p3-mock.js"); } finally { process.argv = argv; }
  }
  if (!base) return;   /* no engine to reuse: the PSLE paper simply does not appear */

  var CONFIG = {
    FORMATS: {
      paper1: { id: "paper1", label: "PSLE Paper 1", minutes: 70, calculator: false, sections: [
        { id: "A1", name: "Booklet A", kind: "mcq",   count: 10, marks: 1, mix: { 1: 0.6, 2: 0.4 } },
        { id: "A2", name: "Booklet A", kind: "mcq",   count: 8,  marks: 2, mix: { 2: 0.5, 3: 0.5 }, hardTail: 2 },
        { id: "B1", name: "Booklet B", kind: "short", count: 12, marks: 2, mix: { 1: 0.3, 2: 0.4, 3: 0.3 } }
      ] },
      paper2: { id: "paper2", label: "PSLE Paper 2", minutes: 80, calculator: true, sections: [
        { id: "S1", name: "Short answer", kind: "short",   count: 5, marks: 2, mix: { 2: 0.5, 3: 0.5 } },
        { id: "L3", name: "Structured",   kind: "problem", count: 3, marks: 3, minExam: 1 },
        { id: "L4", name: "Structured",   kind: "problem", count: 4, marks: 4, minExam: 2 },
        { id: "L5", name: "Structured",   kind: "problem", count: 3, marks: 5, minExam: 2 }
      ] }
    },
    DEFAULT_VARIANT: "paper1",
    /* Node weights: the paper's own level carries most; earlier levels are assumed
       knowledge (PSLE examines the whole primary syllabus). The shell passes only the
       nodes for the child's level and below, so a P5 paper never sees P6 content. */
    WEIGHTS: { p6ratio: 3, percent: 3, algebra: 3,
               p5numbers: 1.5, p5percent: 2, p5triangle: 1.5, p5volume: 1.5, p5fractions: 2,
               p5decimals: 1.5, p5rate: 1.5, p5shapes: 1.5, angles: 1.5, heuristics: 0.5 },
    DEFAULT_WEIGHT: 0.75,       /* a P4 node, or a new node nobody weighted yet */
    TRIES_PER_TOPIC: 6,
    PROBLEM_MIN_WORDS: 12,
    MAX_STRETCH: 1,
    NEVER_PROBLEM: [],
    SHAPE_RING: 3
  };

  function fmtClock(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function calcText(p) { return p.calculator ? "🧮 Calculator allowed" : "🚫 No calculator"; }
  function renderHud(paper, i, leftMs) {
    var it = paper.items[Math.min(i, paper.items.length - 1)];
    var low = leftMs <= 300000;
    return '<div class="mk-hud">' +
      '<span class="mk-sec">' + (it ? it.sectionName : "") + '</span>' +
      '<span class="mk-q">Q' + Math.min(i + 1, paper.items.length) + ' of ' + paper.items.length +
        (it ? ' · <b class="mk-marks">' + base.marksText(it.marks) + '</b>' : '') + '</span>' +
      '<span class="mk-calc' + (paper.calculator ? ' on' : '') + '">' + calcText(paper) + '</span>' +
      '<span class="mk-clock' + (low ? ' mk-low' : '') + '">⏱ ' + fmtClock(leftMs) + '</span></div>';
  }
  function buildPaper(opts) {
    var o = {}; for (var k in opts) o[k] = opts[k];
    o.config = o.config || CONFIG;
    var p = base.buildPaper(o);
    var fmt = o.config.FORMATS[p.variant] || {};
    p.calculator = !!fmt.calculator;
    p.paperOf = "psle";
    return p;
  }

  var mode = Object.create(base);
  mode.id = "psle-mock";
  mode.name = "PSLE Maths Paper";
  mode.description = "PSLE-format rehearsal: Paper 1 (no calculator) or Paper 2 (calculator), marks at the end.";
  mode.config = CONFIG;
  mode.buildPaper = buildPaper;
  mode.renderHud = renderHud;
  mode.start = function (ctx) {
    var o = (ctx && ctx.options) || {};
    if (!o.resume) { o.config = o.config || CONFIG; }
    /* base.start builds the paper with o.config (p3-mock honours it), then paints its own HUD;
       ours replaces it at once, and the banner states the calculator rule up front */
    var paper = base.start.call(this, ctx);
    var fmt = CONFIG.FORMATS[paper.variant] || {};
    paper.calculator = !!fmt.calculator;
    paper.paperOf = "psle";
    if (ctx && ctx.ui) {
      ctx.ui.setHud(renderHud(paper, 0, paper.durationMs - this._offsetMs));
      ctx.ui.setBanner("<b>" + paper.label + "</b> · " + (paper.calculator
        ? "🧮 Have your own calculator ready. It is allowed on this paper."
        : "🚫 No calculator on this paper.") + (o.resume ? " · paper resumed" : ""));
    }
    return paper;
  };
  mode.tick = function (ctx) {
    if (!this._paper || this._ended) return;
    var left = this._paper.durationMs - this.elapsedMs(ctx);
    if (ctx && ctx.ui) ctx.ui.setHud(renderHud(this._paper, this._i, left));
    if (this.done() || left <= 0) return this.end(ctx);
  };
  mode.end = function (ctx) {
    var sc = base.end.call(this, ctx);
    if (sc) { sc.mode = "psle-mock"; sc.calculator = !!(this._paper && this._paper.calculator); }
    return sc;
  };

  /* ------------------------------------------------------------------ *
   * Self-test: the PSLE shapes on synthetic nodes (the engine's own     *
   * routing rules are p3-mock's self-test).                             *
   * ------------------------------------------------------------------ */
  function selfTest(log) {
    log = log || function () {};
    var fails = 0, checks = 0;
    function ok(c, label) { checks++; if (c) log("  PASS  " + label); else { fails++; log("  FAIL  " + label); } }
    var seed = 20261028;
    var rng = function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var parse = function (s) { var v = Number(String(s).replace(/^\$/, "")); return isFinite(v) && s !== "" ? { ok: true, value: v, unit: "" } : { ok: false }; };
    var grade = function (raw, q) { var p = parse(raw); return p.ok && Math.abs(p.value - q.answer) < 1e-9; };
    var k = 0;
    var mcq = function (id) { k++; var a = 10 + k; return { q: id + " sum " + k + " = ?", choices: [String(a), String(a + 1), String(a + 2), String(a + 3)], correct: 0, skill: "s", answerText: String(a), explain: "x" }; };
    var hardMcq = function (id) { var q = mcq(id); q.band = 3; return q; };
    var problem = function (id) { k++; return { q: "A long worded ratio problem about " + id + " number " + k + " that needs a model and three steps to finish.", typed: true, answer: k, choices: [], correct: -1, skill: "w", answerText: String(k), explain: "y", band: 3, exam: "problem" }; };
    var nodes = [{ id: "p6ratio", label: "Ratio" }, { id: "p5percent", label: "Percentage" }, { id: "p5rate", label: "Rate" }, { id: "p4numbers", label: "Numbers" }];
    var plain = function (id) { var q = problem(id); delete q.band; delete q.exam; return q; };
    /* like the real banks: Ratio's pool 3 is all band-3 problems, the P5 pools mix */
    var draw = function (id, lvl) {
      if (lvl !== 3) return mcq(id);
      if (id === "p6ratio") return problem(id);
      if (id === "p5rate") return k % 2 ? problem(id) : plain(id);
      if (id === "p5percent") return k % 2 ? hardMcq(id) : mcq(id);
      return mcq(id);
    };
    var sum = function (l) { var s = 0; l.forEach(function (it) { s += it.marks; }); return s; };
    var p1 = buildPaper({ variant: "paper1", nodes: nodes, draw: draw, parse: parse, grade: grade, rng: rng });
    var A = p1.items.filter(function (it) { return it.sectionName === "Booklet A"; });
    var B = p1.items.filter(function (it) { return it.sectionName === "Booklet B"; });
    ok(p1.items.length === 30 && p1.totalMarks === 50, "paper 1: 30 questions, 50 marks (" + p1.items.length + ", " + p1.totalMarks + ")");
    ok(A.length === 18 && sum(A) === 26 && A.every(function (it) { return !it.q.typed; }), "paper 1: Booklet A = 18 MCQ, 26 marks");
    ok(B.length === 12 && sum(B) === 24 && B.every(function (it) { return it.q.typed && it.marks === 2; }), "paper 1: Booklet B = 12 short answers x 2 marks");
    ok(p1.minutes === 70 && !p1.calculator, "paper 1: 1 h 10 min, no calculator");
    var p2 = buildPaper({ variant: "paper2", nodes: nodes, draw: draw, parse: parse, grade: grade, rng: rng });
    var S = p2.items.filter(function (it) { return it.sectionName === "Short answer"; });
    var L = p2.items.filter(function (it) { return it.sectionName === "Structured"; });
    ok(p2.items.length === 15 && p2.totalMarks === 50, "paper 2: 15 questions, 50 marks (" + p2.items.length + ", " + p2.totalMarks + ")");
    ok(S.length === 5 && sum(S) === 10, "paper 2: 5 short answers x 2 marks");
    ok(L.length === 10 && sum(L) === 40 && L.every(function (it) { return [3, 4, 5].indexOf(it.marks) !== -1 && it.q.typed; }), "paper 2: 10 structured questions of 3, 4 or 5 marks = 40");
    ok(p2.minutes === 80 && p2.calculator, "paper 2: 1 h 20 min, calculator allowed");
    ok(renderHud(p2, 0, 60000).indexOf("Calculator allowed") !== -1 && renderHud(p1, 0, 60000).indexOf("No calculator") !== -1, "the HUD states the calculator rule");
    var m = Object.create(mode), ui = { hud: "", banner: "", setHud: function (h) { this.hud = h; }, setBanner: function (h) { this.banner = h; }, setTheme: function () {} };
    m.start({ ui: ui, options: { variant: "paper2", nodes: nodes, draw: draw, parse: parse, grade: grade, rng: rng } });
    ok(/calculator/i.test(ui.banner) && /Calculator allowed/.test(ui.hud), "starting paper 2 announces the calculator");
    m.record(0, { correct: true, given: "1" }); m.submit();
    var rec = m.end({ elapsedMs: 1000 });
    ok(rec.mode === "psle-mock" && rec.calculator === true && rec.marks === m._paper.items[0].marks && rec.total === 50, "end() returns a psle-mock record, marked by slot value");
    ok(base.config.FORMATS.full.minutes === 90, "the P3 mock's own formats are untouched");
    log(fails === 0 ? "SELFTEST OK - " + checks + " checks passed" : "SELFTEST FAILED - " + fails + "/" + checks);
    return { ok: fails === 0, checks: checks, fails: fails };
  }
  mode.selfTest = selfTest;

  if (typeof window !== "undefined") {
    window.MQI = window.MQI || {};
    if (typeof window.MQI.registerMode === "function") window.MQI.registerMode(mode);
    else (window.MQI.pendingModes = window.MQI.pendingModes || []).push(mode);
  }
  if (typeof module !== "undefined" && module.exports) module.exports = mode;
  if (typeof process !== "undefined" && process.argv && process.argv.indexOf("--selftest") !== -1 &&
      /psle-mock\.js$/.test(process.argv[1] || "")) {
    process.exit(selfTest(function (l) { console.log(l); }).ok ? 0 : 1);
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
