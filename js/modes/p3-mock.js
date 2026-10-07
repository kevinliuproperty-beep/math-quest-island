/* Math Quest Island - P3 Mock Paper mode (exam rehearsal)
 *
 * Charlotte sits her P3 end-of-year maths paper on 2026-10-27. This mode is a
 * dress rehearsal for it: a timed paper with NO feedback while it runs, then a
 * marked report (score, marks by topic and by skill, every miss with its answer
 * and explanation) and a "practise my weak spots" hand-off.
 *
 * FORMAT. SG school P3 EOY maths papers (2023-2025 school assessment-format
 * notices, e.g. Evergreen Primary "Primary 3 Assessment Format", Term 4): 80 marks,
 * 1 h 20 min, no calculator. Booklet A = 24 MCQ x 2 marks = 48; Booklet B = 11
 * short-answer / structured problems = 32. Booklet B is modelled here as
 * 6 short-answer x 2 marks + 5 multi-step problems x 4 marks = 32. The app marks
 * all-or-nothing: there are no method marks, which is stated on the report.
 * The Quick paper keeps the same shape at ~1/3 scale in 15 minutes.
 *
 * ITEMS come from every node the shell registers for P3 - the mode never reads
 * TOPICS. A node it has no weight for (a new P3 Time or Angles node) joins at
 * DEFAULT_WEIGHT automatically.
 *
 * Contract: js/modes/README.md. The shell passes everything through ctx.options:
 *   { variant, nodes:[{id,label,skills:{key:label}}], draw(id, level) -> q,
 *     parse(raw, q), grade(raw, q), shapeOf(q) }
 * Self-test: node js/modes/p3-mock.js --selftest
 */
(function (global) {
  "use strict";

  var CONFIG = {
    FORMATS: {
      quick: { id: "quick", label: "Quick paper", minutes: 15, sections: [
        { id: "A",  name: "Booklet A", kind: "mcq",     count: 8, marks: 2, mix: { 1: 0.2, 2: 0.45, 3: 0.35 } },
        { id: "B1", name: "Booklet B", kind: "short",   count: 3, marks: 2, mix: { 2: 0.5, 3: 0.5 } },
        { id: "B2", name: "Booklet B", kind: "problem", count: 2, marks: 4, mix: { 3: 1 } }
      ] },
      full: { id: "full", label: "Full paper", minutes: 80, sections: [
        { id: "A",  name: "Booklet A", kind: "mcq",     count: 24, marks: 2, mix: { 1: 0.2, 2: 0.45, 3: 0.35 } },
        { id: "B1", name: "Booklet B", kind: "short",   count: 6,  marks: 2, mix: { 2: 0.5, 3: 0.5 } },
        { id: "B2", name: "Booklet B", kind: "problem", count: 5,  marks: 4, mix: { 3: 1 } }
      ] }
    },
    /* Rough share of a P3 EOY paper by node (MOE P3 syllabus: whole numbers and
       the four operations carry the most; data and puzzles the least). */
    WEIGHTS: { p3numbers: 3, tables: 2, fractions: 2.5, p3divide: 1.5, p3money: 1.5,
               p3measure: 1.5, geometry: 1.5, p3bargraph: 1, heuristics: 0.5 },
    DEFAULT_WEIGHT: 1.5,
    TRIES_PER_TOPIC: 6,
    PROBLEM_MIN_STEM: 60,       /* characters of stem text that read as a word problem */
    SHAPE_RING: 3
  };

  function strip(html) { return String(html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }

  /* An MCQ item whose four options are all plain numbers (same unit) and whose stem
     does not lean on the options can be asked as a typed short answer. Anything
     else stays as it is - a wrong conversion would be a second-correct-reading. */
  var LEANS_ON_OPTIONS = /\b(which|choose|pick|options?|true|false|following|estimate|about|closest|could|might|possible|best|likely|statements?)\b/i;
  function toTyped(q, parse, grade) {
    if (!q) return null;
    if (q.typed) return q;
    if (!q.choices || !(q.correct >= 0) || q.choices.length < 2) return null;
    if (LEANS_ON_OPTIONS.test(strip(q.q))) return null;
    var vals = [], unit = null;
    for (var i = 0; i < q.choices.length; i++) {
      if (/class="frac"/.test(String(q.choices[i]))) return null;
      var txt = strip(q.choices[i]).replace(/(\d)\s(?=\d{3}\b)/g, "$1");
      var p = parse(txt, null);
      if (!p || !p.ok || p.frac) return null;
      if (unit === null) unit = p.unit || ""; else if ((p.unit || "") !== unit) return null;
      vals.push(p.value);
    }
    var t = {};
    for (var k in q) t[k] = q[k];
    t.typed = true; t.answer = vals[q.correct]; t.choices = []; t.correct = -1;
    t.unit = unit || undefined; t.converted = true;
    /* The options used to say which unit; typed, "6 m 33 cm - 1 m 49 cm" has a second
       right reading ("4 m 84 cm") unless the stem names the unit, as a paper would. */
    if (unit) t.q = q.q + " (Give your answer in " + unit + ".)";
    if (!t.answerText) t.answerText = strip(q.choices[q.correct]);
    if (!grade(String(t.answer), t)) return null;
    if (!grade(strip(q.choices[q.correct]).replace(/(\d)\s(?=\d{3}\b)/g, "$1"), t)) return null;
    return t;
  }

  function pickWeighted(items, weightOf, rng) {
    var tot = 0, i;
    for (i = 0; i < items.length; i++) tot += Math.max(0, weightOf(items[i]));
    if (!(tot > 0)) return items.length ? items[Math.floor(rng() * items.length)] : null;
    var r = rng() * tot;
    for (i = 0; i < items.length; i++) { r -= Math.max(0, weightOf(items[i])); if (r < 0) return items[i]; }
    return items[items.length - 1];
  }

  /* Build the paper up front: a list of { n, section, sectionName, kind, marks, topic, q }. */
  function buildPaper(opts) {
    var cfg = opts.config || CONFIG;
    var fmt = cfg.FORMATS[opts.variant] || cfg.FORMATS.quick;
    var rng = opts.rng || Math.random;
    var nodes = (opts.nodes || []).filter(function (n) { return n && n.id; });
    if (!nodes.length) throw new Error("p3-mock: no P3 nodes to draw from");
    var parse = opts.parse, grade = opts.grade, shapeOf = opts.shapeOf || function (q) { return strip(q.q); };
    var total = 0;
    fmt.sections.forEach(function (s) { total += s.count; });
    var wOf = function (n) { return cfg.WEIGHTS.hasOwnProperty(n.id) ? cfg.WEIGHTS[n.id] : cfg.DEFAULT_WEIGHT; };
    var wSum = 0; nodes.forEach(function (n) { wSum += wOf(n); });
    var target = {}, used = {};
    nodes.forEach(function (n) { target[n.id] = total * wOf(n) / wSum; used[n.id] = 0; });

    var items = [], ring = [], prevTopic = null;
    fmt.sections.forEach(function (sec) {
      /* levels for this section, easiest first - a paper climbs */
      var lv = [];
      for (var i = 0; i < sec.count; i++) {
        var L = Number(pickWeighted([1, 2, 3], function (x) { return sec.mix[x] || 0; }, rng));
        lv.push(L);
      }
      lv.sort();
      var unfit = {};
      for (var j = 0; j < sec.count; j++) {
        var got = null, gotTopic = null, fallback = null, fallbackTopic = null;
        for (var round = 0; round < nodes.length + 1 && !got; round++) {
          var cands = nodes.filter(function (n) { return !unfit[n.id] && n.id !== prevTopic; });
          if (!cands.length) cands = nodes.filter(function (n) { return !unfit[n.id]; });
          if (!cands.length) break;
          var node = pickWeighted(cands, function (n) { return Math.max(0, target[n.id] - used[n.id]) + 0.05 * wOf(n); }, rng);
          for (var t = 0; t < cfg.TRIES_PER_TOPIC; t++) {
            var q = opts.draw(node.id, lv[j]);
            if (!q) continue;
            var shape = shapeOf(q);
            if (ring.indexOf(shape) !== -1 && t < cfg.TRIES_PER_TOPIC - 1) continue;
            if (sec.kind === "mcq") {
              if (!q.typed && q.choices && q.choices.length >= 2) { got = q; break; }
            } else {
              var tq = toTyped(q, parse, grade);
              if (tq && (sec.kind !== "problem" || strip(tq.q).length >= cfg.PROBLEM_MIN_STEM)) { got = tq; break; }
              if (tq && !fallback) { fallback = tq; fallbackTopic = node.id; }
              else if (!fallback && !q.typed) { fallback = q; fallbackTopic = node.id; }
            }
          }
          if (got) gotTopic = node.id;
          else if (sec.kind === "mcq") unfit[node.id] = true;
          else if (!fallback || fallbackTopic !== node.id) unfit[node.id] = true;
          else if (round >= 2) { got = fallback; gotTopic = fallbackTopic; }
        }
        if (!got && fallback) { got = fallback; gotTopic = fallbackTopic; }
        if (!got) continue;           /* a section can come up short; never hang */
        used[gotTopic]++;
        prevTopic = gotTopic;
        ring.push(shapeOf(got)); while (ring.length > cfg.SHAPE_RING) ring.shift();
        got.topic = gotTopic;
        items.push({ n: items.length + 1, section: sec.id, sectionName: sec.name, kind: sec.kind,
                     marks: sec.marks, topic: gotTopic, q: got });
      }
    });
    var marks = 0; items.forEach(function (it) { marks += it.marks; });
    return { variant: fmt.id, label: fmt.label, minutes: fmt.minutes, durationMs: fmt.minutes * 60000,
             items: items, totalMarks: marks };
  }

  /* Score a finished paper. answers[i] = { correct, given, skipped } or undefined. */
  function scorePaper(paper, answers, nodes) {
    var label = {}, skillLabel = {};
    (nodes || []).forEach(function (n) { label[n.id] = n.label || n.id; skillLabel[n.id] = n.skills || {}; });
    var got = 0, byTopic = {}, bySkill = {}, sections = {}, attempted = 0;
    paper.items.forEach(function (it, i) {
      var a = answers[i];
      var ok = !!(a && a.correct);
      if (a && !a.skipped) attempted++;
      var m = ok ? it.marks : 0;
      got += m;
      var tk = it.topic;
      if (!byTopic[tk]) byTopic[tk] = { topic: tk, label: label[tk] || tk, got: 0, total: 0, seen: 0, lost: 0 };
      byTopic[tk].got += m; byTopic[tk].total += it.marks;
      /* an item the clock took is not evidence of a weak spot; a wrong or skipped one is */
      if (a) { byTopic[tk].seen += it.marks; byTopic[tk].lost += it.marks - m; }
      var sk = tk + "|" + (it.q.skill || "");
      if (!bySkill[sk]) bySkill[sk] = { topic: tk, skill: it.q.skill || "", topicLabel: label[tk] || tk,
        label: (skillLabel[tk] && skillLabel[tk][it.q.skill]) || it.q.skill || "", got: 0, total: 0, seen: 0, lost: 0 };
      bySkill[sk].got += m; bySkill[sk].total += it.marks;
      if (a) { bySkill[sk].seen += it.marks; bySkill[sk].lost += it.marks - m; }
      var secKey = it.sectionName;
      if (!sections[secKey]) sections[secKey] = { name: secKey, got: 0, total: 0 };
      sections[secKey].got += m; sections[secKey].total += it.marks;
    });
    var weakOrder = function (a, b) {
      return (a.got / a.total) - (b.got / b.total) || (b.total - b.got) - (a.total - a.got);
    };
    var vals = function (o) { return Object.keys(o).map(function (k) { return o[k]; }); };
    var topics = vals(byTopic).sort(weakOrder), skills = vals(bySkill).sort(weakOrder);
    var weakest = function (list) {
      var seen = list.filter(function (s) { return s.lost > 0; }).sort(function (a, b) {
        return (b.lost / b.seen) - (a.lost / a.seen) || b.lost - a.lost; });
      return seen.length ? seen : list.filter(function (s) { return s.got < s.total; });
    };
    return {
      marks: got, total: paper.totalMarks,
      pct: paper.totalMarks ? Math.round(got / paper.totalMarks * 100) : 0,
      attempted: attempted, items: paper.items.length,
      sections: vals(sections), byTopic: topics, bySkill: skills,
      weakSkills: weakest(skills).slice(0, 2),
      weakTopics: weakest(topics).slice(0, 2).map(function (s) { return s.label; })
    };
  }

  function fmtClock(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function renderHud(paper, i, leftMs) {
    var it = paper.items[Math.min(i, paper.items.length - 1)];
    var low = leftMs <= 120000;
    return '<div class="mk-hud">' +
      '<span class="mk-sec">' + (it ? it.sectionName : "") + '</span>' +
      '<span class="mk-q">Q' + Math.min(i + 1, paper.items.length) + ' of ' + paper.items.length +
        (it ? ' · ' + it.marks + ' marks' : '') + '</span>' +
      '<span class="mk-clock' + (low ? ' mk-low' : '') + '">⏱ ' + fmtClock(leftMs) + '</span></div>';
  }

  var mode = {
    id: "p3-mock",
    name: "P3 Mock Paper",
    description: "Exam rehearsal: a timed P3 paper, no feedback until the end.",
    config: CONFIG,
    buildPaper: buildPaper,
    scorePaper: scorePaper,
    toTyped: toTyped,

    start: function (ctx) {
      var o = (ctx && ctx.options) || {};
      var r = o.resume || null;          /* a paper reloaded mid-sit (shell's localStorage copy) */
      this._nodes = o.nodes || [];
      this._paper = r ? r.paper : buildPaper(o);
      if (!r && o.durationMs > 0) this._paper.durationMs = o.durationMs;
      this._answers = r ? (r.answers || []) : [];
      this._visited = r ? (r.visited || []) : [];
      this._flags = r ? (r.flags || []) : [];
      this._offsetMs = r ? (r.elapsedMs || 0) : 0;   /* the clock kept running while the page was away */
      this._submitted = false;
      this._ended = false;
      this._i = -1;
      this._lastSec = null;
      if (ctx && ctx.ui) {
        ctx.ui.setTheme("mode-mock");
        ctx.ui.setHud(renderHud(this._paper, 0, this._paper.durationMs - this._offsetMs));
        ctx.ui.setBanner("<b>" + this._paper.label + "</b> · " + (r ? "paper resumed" : "marks at the end"));
      }
      this._lastSec = null;
      this.goto(ctx, r ? (r.i || 0) : 0, true);
      return this._paper;
    },

    /* the item now on the paper (the shell's question feed reads this) */
    current: function () {
      var p = this._paper;
      return p && p.items[this._i] ? p.items[this._i] : null;
    },
    /* The paper ends only when it is handed in (or the clock runs out). */
    done: function () { return !!this._submitted; },

    /* Exam navigation: any question, any order, answers kept until hand-in. */
    goto: function (ctx, i, quiet) {
      var p = this._paper;
      if (!p || this._ended || !p.items.length) return null;
      i = Math.max(0, Math.min(p.items.length - 1, i | 0));
      this._i = i;
      this._visited[i] = true;
      var it = p.items[i];
      if (ctx && ctx.ui && !quiet && this._lastSec && it.sectionName !== this._lastSec) {
        ctx.ui.setBanner("<b>" + it.sectionName + "</b>" + (it.q.typed ? " · type your answers" : ""));
      }
      this._lastSec = it.sectionName;
      if (ctx && ctx.nextQuestion) ctx.nextQuestion();
      return it;
    },
    /* answer = { correct, given, choice?, raw? } or null to clear it */
    record: function (i, answer) {
      if (!this._paper || this._ended || !this._paper.items[i]) return;
      this._answers[i] = answer || undefined;
    },
    toggleFlag: function (i) {
      if (!this._paper || this._ended || !this._paper.items[i]) return false;
      this._flags[i] = !this._flags[i];
      return this._flags[i];
    },
    /* what the navigator draws: one entry per item */
    status: function () {
      var self = this, p = this._paper;
      if (!p) return [];
      return p.items.map(function (it, i) {
        return { n: it.n, section: it.section, sectionName: it.sectionName, answered: !!self._answers[i],
                 flagged: !!self._flags[i], current: i === self._i };
      });
    },
    elapsedMs: function (ctx) { return this._offsetMs + ((ctx && typeof ctx.elapsedMs === "number") ? ctx.elapsedMs : 0); },
    /* a JSON-safe copy the shell keeps in localStorage so a reload resumes the paper */
    snapshot: function (ctx) {
      if (!this._paper || this._ended) return null;
      return { paper: this._paper, answers: this._answers, visited: this._visited, flags: this._flags,
               i: this._i, elapsedMs: this.elapsedMs(ctx) };
    },
    submit: function () { if (this._paper && !this._ended) this._submitted = true; },

    /* Legacy one-way flow (kept for the mode contract): answer the item on the
       paper and move to the next one. Never hands the paper in by itself. */
    onAnswer: function (ctx, correct, meta) {
      if (!this._paper || this._ended || this.done()) return { ignored: true };
      meta = meta || {};
      this._answers[this._i] = meta.skipped ? undefined : { correct: !!correct, given: meta.given };
      if (this._i < this._paper.items.length - 1) this.goto(ctx, this._i + 1);
      return { ignored: false };
    },

    tick: function (ctx) {
      if (!this._paper || this._ended) return;
      var left = this._paper.durationMs - this.elapsedMs(ctx);
      if (ctx && ctx.ui) ctx.ui.setHud(renderHud(this._paper, this._i, left));
      if (this.done() || left <= 0) return this.end(ctx);
    },

    end: function (ctx) {
      if (!this._paper || this._ended) return null;
      this._ended = true;
      var p = this._paper;
      /* An item she opened and left blank counts exactly as a Skip used to; one she
         never reached (the clock took it) stays undefined, as before. */
      for (var k = 0; k < p.items.length; k++) {
        if (!this._answers[k] && this._visited[k]) this._answers[k] = { correct: false, given: null, skipped: true };
      }
      var sc = scorePaper(p, this._answers, this._nodes);
      var used = Math.min(this.elapsedMs(ctx), p.durationMs);
      var self = this;
      sc.mode = "p3-mock";
      sc.variant = p.variant;
      sc.label = p.label;
      sc.durationMs = p.durationMs;
      sc.usedMs = used;
      sc.timedOut = !this._submitted;
      sc.t = Date.now();
      sc.review = p.items.map(function (it, i) {
        var a = self._answers[i];
        return { n: it.n, section: it.sectionName, marks: it.marks, topic: it.topic, q: it.q,
                 correct: !!(a && a.correct), given: a ? a.given : null,
                 attempted: !!(a && !a.skipped), skipped: !!(a && a.skipped) };
      });
      return sc;
    }
  };

  /* ------------------------------------------------------------------ *
   * Self-test (synthetic nodes; the real-bank check runs in the browser) *
   * ------------------------------------------------------------------ */
  function selfTest(log) {
    log = log || function () {};
    var fails = 0, checks = 0;
    function ok(c, label) { checks++; if (c) log("  PASS  " + label); else { fails++; log("  FAIL  " + label); } }
    var seed = 20261027;
    var rng = function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var parse = function (s) { var v = Number(String(s).replace(/^\$/, "").replace(/\s*(cm|kg)$/, "")); return isFinite(v) && s !== "" ? { ok: true, value: v, unit: (String(s).match(/(cm|kg)$/) || [""])[0] } : { ok: false }; };
    var grade = function (raw, q) { var p = parse(raw); return p.ok && Math.abs(p.value - q.answer) < 1e-9; };
    var k = 0;
    var mcq = function (id) { k++; var a = 10 + k; return { q: id + " sum " + k + " = ?", choices: [String(a), String(a + 1), String(a + 2), String(a + 3)], correct: 0, skill: "s" + (k % 3), answerText: String(a), explain: "x" }; };
    var typed = function (id) { k++; return { q: "A long word problem about " + id + " number " + k + " that needs two steps to finish properly.", typed: true, answer: k, choices: [], correct: -1, skill: "w", answerText: String(k), explain: "y" }; };
    var nodes = [{ id: "p3numbers", label: "Numbers" }, { id: "tables", label: "Tables" }, { id: "p3money", label: "Money" }, { id: "newnode", label: "New" }];
    var draw = function (id) { return id === "p3money" ? typed(id) : mcq(id); };

    ["quick", "full"].forEach(function (v) {
      var p = buildPaper({ variant: v, nodes: nodes, draw: draw, parse: parse, grade: grade, rng: rng });
      var want = v === "quick" ? 13 : 35, marks = v === "quick" ? 30 : 80;
      ok(p.items.length === want, v + ": " + want + " items (got " + p.items.length + ")");
      ok(p.totalMarks === marks, v + ": " + marks + " marks (got " + p.totalMarks + ")");
      ok(p.items.filter(function (it) { return it.section === "A"; }).every(function (it) { return !it.q.typed; }), v + ": Booklet A is all MCQ");
      ok(p.items.filter(function (it) { return it.section !== "A"; }).every(function (it) { return it.q.typed; }), v + ": Booklet B is all typed (converted where safe)");
      var adj = 0; for (var i = 1; i < p.items.length; i++) if (p.items[i].topic === p.items[i - 1].topic) adj++;
      ok(adj === 0, v + ": no topic back to back (" + adj + ")");
      ok(p.items.some(function (it) { return it.topic === "newnode"; }), v + ": an unweighted new node is drawn");
      var ans = p.items.map(function (it, i) { return { correct: i % 2 === 0 }; });
      var sc = scorePaper(p, ans, nodes);
      var want2 = 0; p.items.forEach(function (it, i) { if (i % 2 === 0) want2 += it.marks; });
      ok(sc.marks === want2, v + ": score adds up (" + sc.marks + ")");
      ok(sc.weakSkills.length === 2, v + ": two weakest skills named");
    });
    /* navigation: answers survive jumps; opened-but-blank = skipped; unopened = clock took it */
    var nm = Object.create(mode);
    nm.start({ options: { variant: "quick", nodes: nodes, draw: draw, parse: parse, grade: grade, rng: rng } });
    nm.record(0, { correct: true, given: "x" }); nm.goto(null, 4); nm.goto(null, 2); nm.goto(null, 0);
    nm.record(0, { correct: false, given: "y" }); nm.toggleFlag(2); nm.submit();
    var rec = nm.end({ elapsedMs: 1000 });
    ok(rec.review[0].given === "y" && !rec.review[0].correct, "a changed answer is the one marked");
    ok(rec.review[2].skipped && rec.review[4].skipped && !rec.review[1].skipped && !rec.review[1].attempted, "blank-opened = skipped, never-opened = untouched");
    ok(!rec.timedOut && rec.attempted === 1, "handed in, one attempted");
    ok(toTyped({ q: "Which is the biggest?", choices: ["1", "2", "3", "4"], correct: 2 }, parse, grade) === null, "a 'which' stem stays MCQ");
    ok(toTyped({ q: "12 + 7 = ?", choices: ["19", "18", "two", "20"], correct: 0 }, parse, grade) === null, "a non-number option keeps it MCQ");
    var c = toTyped({ q: "12 + 7 = ?", choices: ["19", "18", "21", "20"], correct: 0 }, parse, grade);
    ok(c && c.typed && c.answer === 19, "a plain sum converts to typed");
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
  if (typeof process !== "undefined" && process.argv && process.argv.indexOf("--selftest") !== -1) {
    process.exit(selfTest(function (l) { console.log(l); }).ok ? 0 : 1);
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
