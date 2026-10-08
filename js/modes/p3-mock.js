/* Math Quest Island - P3 Mock Paper mode (exam rehearsal)
 *
 * Charlotte sits her P3 end-of-year maths paper on 2026-10-27. This mode is a
 * dress rehearsal for it: a timed paper with NO feedback while it runs, then a
 * marked report (score, marks by topic and by skill, every miss with its answer
 * and explanation) and a "practise my weak spots" hand-off.
 *
 * FORMAT (Math Hardness Calibration 2026-10-07, card X1: 16 real 2023-25 P3 EOY
 * papers, 14 of them this shape). FULL paper (the default): 50 marks, 90 min, no
 * calculator. Booklet A = 5 MCQ x 1 + 5 MCQ x 2 = 15. Booklet B = 4 short x 1 +
 * 8 short x 2 = 20, then 5 long problems x 3 = 15. The older 80-mark / 80-min shape
 * (MGS / Nan Hua style) stays as the LONG variant; QUICK is a ~20-mark, 25-min
 * mini of the Full paper with 2 long problems. The app marks all-or-nothing by
 * slot value (a 3-mark problem is 3 or 0): no method marks, as the report says.
 *
 * ROUTING reads the item tags the topic banks set: q.band (3 = exam-hard; an
 * untagged legacy item counts as band <= 2), q.exam === 'problem' (a Booklet B word
 * problem) and q.stretch (top-school shape). Long-problem slots take ONLY band-3
 * items with a worded stem, at least MIN_EXAM of them q.exam problems, the rest
 * spread over other topics. The last Booklet A MCQs are band 3. At most one stretch
 * item per paper, never in Booklet A. Everywhere else band 3 is kept out, so the
 * paper's mark spread stays near the real one.
 *
 * ITEMS come from every node the shell registers for P3 - the mode never reads
 * TOPICS. A node it has no weight for joins at DEFAULT_WEIGHT automatically, and any
 * band-3 item from any node is eligible for a hard slot.
 *
 * Contract: js/modes/README.md. The shell passes everything through ctx.options:
 *   { variant, nodes:[{id,label,skills:{key:label}}], draw(id, level) -> q,
 *     parse(raw, q), grade(raw, q), shapeOf(q) }
 * Self-test: node js/modes/p3-mock.js --selftest
 */
(function (global) {
  "use strict";

  var CONFIG = {
    /* mix = pool-level odds per slot; hardTail = last N MCQs drawn band 3;
       minExam = long-problem slots that must be q.exam problems when any exist */
    FORMATS: {
      full: { id: "full", label: "Full paper", minutes: 90, sections: [
        { id: "A1", name: "Booklet A", kind: "mcq",     count: 5, marks: 1, mix: { 1: 0.6, 2: 0.4 } },
        { id: "A2", name: "Booklet A", kind: "mcq",     count: 5, marks: 2, mix: { 2: 0.5, 3: 0.5 }, hardTail: 2 },
        { id: "B1", name: "Booklet B", kind: "short",   count: 4, marks: 1, mix: { 1: 0.5, 2: 0.5 } },
        { id: "B2", name: "Booklet B", kind: "short",   count: 8, marks: 2, mix: { 2: 0.4, 3: 0.6 } },
        { id: "B3", name: "Booklet B", kind: "problem", count: 5, marks: 3, minExam: 2 }
      ] },
      long: { id: "long", label: "Long paper", minutes: 80, sections: [
        { id: "A",  name: "Booklet A", kind: "mcq",     count: 24, marks: 2, mix: { 1: 0.2, 2: 0.45, 3: 0.35 }, hardTail: 2 },
        { id: "B1", name: "Booklet B", kind: "short",   count: 6,  marks: 2, mix: { 2: 0.5, 3: 0.5 } },
        { id: "B3", name: "Booklet B", kind: "problem", count: 5,  marks: 4, minExam: 2 }
      ] },
      quick: { id: "quick", label: "Quick paper", minutes: 25, sections: [
        { id: "A1", name: "Booklet A", kind: "mcq",     count: 3, marks: 1, mix: { 1: 0.6, 2: 0.4 } },
        { id: "A2", name: "Booklet A", kind: "mcq",     count: 2, marks: 2, mix: { 2: 0.5, 3: 0.5 }, hardTail: 1 },
        { id: "B1", name: "Booklet B", kind: "short",   count: 1, marks: 1, mix: { 1: 0.5, 2: 0.5 } },
        { id: "B2", name: "Booklet B", kind: "short",   count: 3, marks: 2, mix: { 2: 0.4, 3: 0.6 } },
        { id: "B3", name: "Booklet B", kind: "problem", count: 2, marks: 3, minExam: 1 }
      ] }
    },
    DEFAULT_VARIANT: "full",
    /* Share of a P3 EOY paper by node (calibration X1 weights; model and heuristic
       word problems carry 25-35% of real marks, mostly in the long problems). */
    WEIGHTS: { p3word: 3, p3numbers: 3, tables: 1.5, fractions: 2, p3divide: 1.5, p3money: 2,
               p3measure: 2, p3time: 1.5, geometry: 1.5, p3angles: 1, p3bargraph: 1.2, heuristics: 0.5 },
    DEFAULT_WEIGHT: 1.5,
    TRIES_PER_TOPIC: 6,
    PROBLEM_MIN_WORDS: 10,      /* worded stem: a bare computation or fact never sits in a long slot */
    MAX_STRETCH: 1,
    /* Banks that may never sit in a long-problem slot whatever their band (card X1):
       recall, error-spotting and pattern banks that read long but are one step. The
       shell stamps q.gen = "<node>.<generator>" on every mock draw; an item with no
       stamp is judged on its tags alone. */
    NEVER_PROBLEM: ["tables.gDivError", "p3numbers.gPatternMissing", "p3numbers.gStandsFix",
                    "p3numbers.gStandsCompare", "p3numbers.gZeroFix", "p3angles.gCountKind",
                    "p3angles.gParallelPairs", "geometry.gAreaRect"],
    SHAPE_RING: 3
  };

  function isHard(q) { return !!q && q.band >= 3; }   /* untagged legacy items count as band <= 2 */
  function marksText(m) { return m + (m === 1 ? " mark" : " marks"); }

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

  /* Build the paper up front: a list of { n, section, sectionName, kind, marks, topic, q, hard }. */
  function buildPaper(opts) {
    var cfg = opts.config || CONFIG;
    var fmt = cfg.FORMATS[opts.variant] || cfg.FORMATS[cfg.DEFAULT_VARIANT || "full"];
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
    var minWords = cfg.PROBLEM_MIN_WORDS || 0, maxStretch = cfg.MAX_STRETCH == null ? 1 : cfg.MAX_STRETCH;
    var never = cfg.NEVER_PROBLEM || [];
    var items = [], ring = [], prevTopic = null, stretch = 0, short = [];
    var worded = function (q) { return strip(q.q).split(" ").filter(function (w) { return /[a-z]{2}/i.test(w); }).length >= minWords; };

    /* Does q fit this slot? { q } = yes; { near } = the next-best band, taken only if
       nothing exact turns up; { weak } = two bands down, the last resort. THIN POOLS
       DEGRADE, THEY NEVER HANG OR LEAVE A HOLE: on a tree where few nodes carry band-3
       tags yet (each hard lane adds its own), a hard MCQ slot takes a band-2 MCQ, and
       a long-problem slot takes a worded band-2 typed item, so the paper still adds
       up to its full mark total. Only a slot nothing worded can serve comes up short. */
    function fit(slot, q) {
      if (q.stretch && (slot.kind === "mcq" || stretch >= maxStretch)) return null;
      if (slot.kind === "mcq") {
        if (q.typed || !q.choices || q.choices.length < 2) return null;
        if (slot.hard) return isHard(q) ? { q: q } : { near: q };
        return isHard(q) ? null : { q: q };
      }
      var tq = toTyped(q, parse, grade);
      if (slot.kind === "short") {
        if (isHard(q)) return null;
        return tq ? { q: tq } : (!q.typed ? { near: q } : null);
      }
      /* long problem: band 3, typed, worded - never a recall or bare-computation bank,
         and never one of the banks the calibration card names outright */
      if (!tq || !worded(tq)) return null;
      if (tq.gen && never.indexOf(tq.gen) !== -1) return null;
      if (!isHard(tq)) return { weak: tq };
      if (slot.exam && tq.exam !== "problem") return { near: tq };
      return { q: tq };
    }
    function fill(slot, avoid) {
      var unfit = {}, near = null, weak = null;
      for (var round = 0; round < nodes.length; round++) {
        var cands = nodes.filter(function (n) { return !unfit[n.id] && avoid.indexOf(n.id) === -1; });
        if (!cands.length) cands = nodes.filter(function (n) { return !unfit[n.id]; });
        if (!cands.length) break;
        var node = pickWeighted(cands, function (n) { return Math.max(0, target[n.id] - used[n.id]) + 0.05 * wOf(n); }, rng);
        for (var t = 0; t < cfg.TRIES_PER_TOPIC; t++) {
          var q = opts.draw(node.id, slot.level);
          if (!q) continue;
          if (ring.indexOf(shapeOf(q)) !== -1 && t < cfg.TRIES_PER_TOPIC - 1) continue;
          var r = fit(slot, q);
          if (r && r.q) return { q: r.q, topic: node.id };
          if (r && r.near && !near) near = { q: r.near, topic: node.id };
          if (r && r.weak && !weak) weak = { q: r.weak, topic: node.id };
        }
        unfit[node.id] = true;
      }
      return near || weak;      /* every node tried: settle for the next band down */
    }
    function take(r) {
      used[r.topic]++;
      if (r.q.stretch) stretch++;
      ring.push(shapeOf(r.q)); while (ring.length > cfg.SHAPE_RING) ring.shift();
      r.q.topic = r.topic;
    }
    /* order a section so the same topic never sits back to back when it can be helped */
    function arrange(list) {
      for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), x = list[i]; list[i] = list[j]; list[j] = x; }
      var out = [], last = prevTopic;
      while (list.length) {
        var left = {}, k = -1, m;
        list.forEach(function (r) { left[r.topic] = (left[r.topic] || 0) + 1; });
        for (m = 0; m < list.length; m++)        /* the topic with most left goes next */
          if (list[m].topic !== last && (k < 0 || left[list[m].topic] > left[list[k].topic])) k = m;
        if (k < 0) k = 0;
        last = list[k].topic; out.push(list.splice(k, 1)[0]);
      }
      return out;
    }

    fmt.sections.forEach(function (sec) {
      var slots = [], i, got = [];
      if (sec.kind === "problem") {
        for (i = 0; i < sec.count; i++) slots.push({ kind: sec.kind, level: 3, hard: true, exam: i < (sec.minExam || 0) });
      } else {
        var tail = Math.min(sec.hardTail || 0, sec.count), lv = [];
        for (i = 0; i < sec.count - tail; i++) lv.push(Number(pickWeighted([1, 2, 3], function (x) { return sec.mix[x] || 0; }, rng)));
        lv.sort();                                  /* a paper climbs: easiest first */
        lv.forEach(function (L) { slots.push({ kind: sec.kind, level: L }); });
        for (i = 0; i < tail; i++) slots.push({ kind: sec.kind, level: 3, hard: true });
      }
      if (sec.kind === "problem") {
        var secUsed = [];                           /* spread the long problems over topics */
        slots.forEach(function (slot) {
          var r = fill(slot, slot.exam ? [] : secUsed);
          if (!r) { short.push(sec.id); return; }   /* a section can come up short; never hang */
          take(r); secUsed.push(r.topic); got.push(r);
        });
        got = arrange(got);
      } else {
        slots.forEach(function (slot) {
          var r = fill(slot, prevTopic ? [prevTopic] : []);
          if (!r) { short.push(sec.id); return; }
          take(r); prevTopic = r.topic; got.push(r);
        });
      }
      got.forEach(function (r) {
        prevTopic = r.topic;
        items.push({ n: items.length + 1, section: sec.id, sectionName: sec.name, kind: sec.kind,
                     marks: sec.marks, topic: r.topic, q: r.q, hard: isHard(r.q) });
      });
    });
    var marks = 0; items.forEach(function (it) { marks += it.marks; });
    return { variant: fmt.id, label: fmt.label, minutes: fmt.minutes, durationMs: fmt.minutes * 60000,
             items: items, totalMarks: marks, shortSections: short };
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
        (it ? ' · <b class="mk-marks">' + marksText(it.marks) + '</b>' : '') + '</span>' +
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
    isHard: isHard,
    marksText: marksText,

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
    /* band tags as the topic banks set them: p3word = exam problems (band 3 at level 3,
       one stretch shape); p3numbers serves a band-3 MCQ and a band-3 bare computation
       at level 3; geometry a band-3 worded problem with no exam tag; tables untagged. */
    var hardMcq = function (id) { var q = mcq(id); q.q = id + " hard " + k + ": she gave 8 away and has 30 more; how many more now?"; q.band = 3; return q; };
    var bareHard = function (id) { k++; return { q: (900 + k) + " × 7 = ?", typed: true, answer: (900 + k) * 7, choices: [], correct: -1, skill: "c", answerText: String((900 + k) * 7), explain: "z", band: 3 }; };
    var exam = function (id, lvl) { var q = typed(id); q.exam = "problem"; q.band = lvl === 3 ? 3 : 2; if (lvl === 3 && k % 7 === 0) q.stretch = true; return q; };
    var nodes = [{ id: "p3numbers", label: "Numbers" }, { id: "tables", label: "Tables" }, { id: "p3money", label: "Money" },
                 { id: "newnode", label: "New" }, { id: "p3word", label: "Word problems" }, { id: "geometry", label: "Geometry" }];
    var draw = function (id, lvl) {
      if (id === "p3word") return exam(id, lvl);
      if (id === "p3money") return typed(id);
      if (id === "geometry" && lvl === 3) { if (k % 3 === 0) return hardMcq(id); var g = typed(id); g.band = 3; return g; }
      if (id === "p3numbers" && lvl === 3) return k % 2 ? hardMcq(id) : bareHard(id);
      return mcq(id);
    };
    var SHAPE = { full: [27, 50, 15, 90], long: [35, 80, 48, 80], quick: [11, 20, 7, 25] };   /* items, marks, Booklet A marks, minutes */
    var sum = function (list) { var s = 0; list.forEach(function (it) { s += it.marks; }); return s; };

    ["full", "long", "quick"].forEach(function (v) {
      var p = buildPaper({ variant: v, nodes: nodes, draw: draw, parse: parse, grade: grade, rng: rng });
      var A = p.items.filter(function (it) { return it.sectionName === "Booklet A"; });
      var B = p.items.filter(function (it) { return it.sectionName !== "Booklet A"; });
      var L = p.items.filter(function (it) { return it.kind === "problem"; });
      ok(p.items.length === SHAPE[v][0], v + ": " + SHAPE[v][0] + " items (got " + p.items.length + ")");
      ok(p.totalMarks === SHAPE[v][1] && sum(A) === SHAPE[v][2], v + ": " + SHAPE[v][1] + " marks, Booklet A " + SHAPE[v][2] + " (got " + p.totalMarks + ", A " + sum(A) + ")");
      ok(p.minutes === SHAPE[v][3], v + ": " + SHAPE[v][3] + " minutes");
      ok(A.every(function (it) { return !it.q.typed; }), v + ": Booklet A is all MCQ");
      ok(B.every(function (it) { return it.q.typed; }), v + ": Booklet B is all typed (converted where safe)");
      ok(L.length >= 2 && L.every(function (it) { return it.q.band === 3 && it.q.typed; }), v + ": " + L.length + " long problems, every one band 3");
      ok(L.every(function (it) { return strip(it.q.q).split(" ").length >= 10; }), v + ": no bare computation in a long slot");
      var nEx = L.filter(function (it) { return it.q.exam === "problem"; }).length, wantEx = v === "quick" ? 1 : 2;
      ok(nEx >= wantEx, v + ": at least " + wantEx + " long problems are exam word problems (" + nEx + ")");
      var tailN = v === "quick" ? 1 : 2;
      ok(A.slice(-tailN).every(function (it) { return it.q.band === 3; }), v + ": last " + tailN + " Booklet A MCQ are band 3");
      var hardElse = p.items.filter(function (it) { return it.q.band >= 3 && it.kind !== "problem"; }).length;
      ok(hardElse === tailN, v + ": band 3 only in the hard slots (" + hardElse + " outside long problems)");
      var adj = 0; for (var i = 1; i < p.items.length; i++) if (p.items[i].topic === p.items[i - 1].topic) adj++;
      ok(adj === 0, v + ": no topic back to back (" + adj + ") " + (adj ? p.items.map(function (it) { return it.section + ":" + it.topic; }).join(" ") : ""));
      ok(p.items.some(function (it) { return it.topic === "newnode"; }), v + ": an unweighted new node is drawn");
      var ans = p.items.map(function (it, i) { return { correct: i % 2 === 0 }; });
      var sc = scorePaper(p, ans, nodes);
      var want2 = 0; p.items.forEach(function (it, i) { if (i % 2 === 0) want2 += it.marks; });
      ok(sc.marks === want2, v + ": score adds up by slot value (" + sc.marks + ")");
      var allLong = scorePaper(p, p.items.map(function (it) { return { correct: it.kind === "problem" }; }), nodes);
      ok(allLong.marks === sum(L), v + ": long problems right only = " + sum(L) + " marks (" + allLong.marks + ")");
      ok(sc.weakSkills.length === 2, v + ": two weakest skills named");
    });
    ok(buildPaper({ nodes: nodes, draw: draw, parse: parse, grade: grade, rng: rng }).variant === "full", "the default paper is the Full 50-mark paper");
    var maxStretch = 0, stretchA = 0, spread = 0, P = 200;
    for (var pi = 0; pi < P; pi++) {
      var pp = buildPaper({ variant: "full", nodes: nodes, draw: draw, parse: parse, grade: grade, rng: rng });
      var ns = pp.items.filter(function (it) { return it.q.stretch; });
      maxStretch = Math.max(maxStretch, ns.length);
      stretchA += ns.filter(function (it) { return it.sectionName === "Booklet A"; }).length;
      var lt = {}; pp.items.forEach(function (it) { if (it.kind === "problem") lt[it.topic] = 1; });
      if (Object.keys(lt).length >= 2) spread++;
    }
    ok(maxStretch <= 1 && stretchA === 0, "at most 1 stretch item per paper, never in Booklet A (" + P + " papers, max " + maxStretch + ")");
    ok(spread === P, "long problems spread over 2+ topics when 2+ can serve them (" + spread + "/" + P + ")");
    var only = buildPaper({ variant: "full", nodes: nodes.filter(function (n) { return n.id !== "p3word"; }), draw: draw, parse: parse, grade: grade, rng: rng });
    ok(only.items.filter(function (it) { return it.kind === "problem"; }).length === 5, "with no exam-tagged node, any band-3 worded item fills the long slots");
    /* thin band-3 pools degrade, never hang: untagged worded typed items (p3money) take the
       long slots two bands down and the paper still adds up to 50 */
    var none = buildPaper({ variant: "full", nodes: [nodes[1], nodes[2], nodes[3]], draw: draw, parse: parse, grade: grade, rng: rng });
    var noneL = none.items.filter(function (it) { return it.kind === "problem"; });
    ok(noneL.length === 5 && none.totalMarks === 50 && noneL.every(function (it) { return it.topic === "p3money" && !isHard(it.q); }),
       "with no band-3 bank at all the long slots fill from worded band-2 typed items, still 50 marks (" + noneL.length + " long, " + none.totalMarks + ")");
    var bare = buildPaper({ variant: "full", nodes: [nodes[1]], draw: draw, parse: parse, grade: grade, rng: rng });
    ok(bare.items.filter(function (it) { return it.kind === "problem"; }).length === 0 && bare.shortSections.indexOf("B3") !== -1,
       "a bare-computation bank never fills a long slot (section comes up short, no hang)");
    /* the banks the card bars from the long problems stay out even when tagged band 3 */
    var barred = function (id, lvl) { var q = draw(id, lvl); if (id === "tables" && lvl === 3) { q = typed(id); q.band = 3; q.gen = "tables.gDivError"; } return q; };
    var nb = 0, nbL = 0;
    for (pi = 0; pi < 50; pi++) {
      var bp = buildPaper({ variant: "full", nodes: [nodes[1], nodes[2], nodes[4]], draw: barred, parse: parse, grade: grade, rng: rng });
      bp.items.forEach(function (it) { if (it.kind === "problem") { nbL++; if (it.q.gen === "tables.gDivError") nb++; } });
    }
    ok(nb === 0 && nbL === 250, "a NEVER_PROBLEM bank never sits in a long slot even at band 3 (" + nb + " of " + nbL + ")");
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
