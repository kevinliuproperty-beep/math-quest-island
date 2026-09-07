/* ===== engine bundle: MQI_API (appended by tools/build-engine.mjs) =====
 *
 * The one surface the Swift bridge (ios/Packages/MQEngineJS) touches. Every method
 * takes a JSON STRING and returns a JSON STRING, because that is the only shape
 * that crosses JavaScriptCore without a per-type JSExport dance and without the
 * bridge having to know anything about the engine's internals.
 *
 * Stable surface (do not rename; MQEngineJS decodes these exact keys):
 *
 *   MQI_API.listTopics()            -> {ok, count, topics[], nodes[], grades[]}
 *   MQI_API.nextQuestion(argsJSON)  -> {ok, question?, questions[]}
 *   MQI_API.grade(argsJSON)         -> {ok, verdict?, verdicts[]}
 *   MQI_API.explain(argsJSON)       -> {ok, explanation}
 *   MQI_API.build()                 -> {ok, build}
 *
 * Plus three lifecycle helpers the five above imply:
 *   MQI_API.endSession(argsJSON)    -> {ok, ended, open, cap, evicted}
 *                                      {session:"id"} one · {all:true} every one
 *   MQI_API.sessionStats()          -> {ok, open, cap, evicted}
 *   MQI_API.drainLogs()             -> {ok, logs[]}
 *
 * ENVELOPE. Every return is {"ok":true, ...} or
 *   {"ok":false,"error":{"message":..,"name":..,"stack":..,"where":..}}.
 * Errors thrown by a generator are CAUGHT here and returned in that envelope with
 * the JS stack intact; the bridge turns them into a Swift error carrying the stack.
 * A hard JavaScriptCore exception (a syntax error in the bundle, an OOM) escapes
 * to the host instead, and the bridge reports that separately.
 *
 * STATELESSNESS. grade() and explain() take the QUESTION OBJECT BACK, exactly as
 * nextQuestion returned it. Nothing about a question is held on the JS side, so a
 * Swift app can persist a question, quit, relaunch, and still grade it. The only
 * state the engine holds is the feed session map (createFeed's no-repeat rings),
 * which is explicitly named by the caller.
 *
 * ADDRESSING A GENERATOR. Every pool entry has a stable ref "<topic>/<pool>/<index>"
 * (e.g. "p4area/3/2"). listTopics() lists them; nextQuestion({generator:ref}) draws
 * from that one entry, bypassing the feed. That is how the gate proves EVERY
 * generator reachable through this API produces decodable, gradable questions -
 * the feed's carousel would never guarantee hitting all of them.
 */
var MQI_API = (function () {
  'use strict';

  /* ---------- plain text ---------- */
  /* The engine still emits HTML in stems (fraction spans, <b>, &nbsp;) and the six
     figure topics still emit SVG in `extra` until the figure-spec lane lands. The
     bridge needs BOTH: the markup (a web renderer / a rich text view may want it)
     and a plain-text reduction SwiftUI can put in a Text() today. */
  function plain(html) {
    return String(html === undefined || html === null ? '' : html)
      .replace(/<span class="frac"><span class="n">(\d+)<\/span><span class="d">(\d+)<\/span><\/span>/g, '$1/$2')
      .replace(/<span class="n">(\d+)<\/span><span class="d">(\d+)<\/span>/g, '$1/$2')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function hasMarkup(s) { return /<[a-zA-Z/][^>]*>/.test(String(s || '')); }

  /* ---------- generator refs ---------- */
  function refOf(topicId, pool, index) { return topicId + '/' + pool + '/' + index; }
  function parseRef(ref) {
    var m = String(ref || '').match(/^(.+)\/([123])\/(\d+)$/);
    if (!m) throw new Error('bad generator ref "' + ref + '" (want "<topic>/<pool 1-3>/<index>")');
    var topic = m[1], pool = Number(m[2]), index = Number(m[3]);
    var def = MQI.topics[topic];
    if (!def) throw new Error('unknown topic "' + topic + '" in generator ref "' + ref + '"');
    var entry = def.pools[pool] && def.pools[pool][index];
    if (!entry) throw new Error('generator ref "' + ref + '" is out of range (pool ' + pool +
      ' has ' + ((def.pools[pool] || []).length) + ' entries)');
    return { topic: topic, pool: pool, index: index, gen: entry[0], skill: entry[1] || '' };
  }

  /* ---------- the grading key ----------
     Everything gradeTyped() reads, and nothing else. It travels with the question
     so grade() never needs the generator that made it. */
  function keyOf(q) {
    var k = { typed: !!q.typed, correct: (typeof q.correct === 'number' ? q.correct : -1) };
    if (q.typed) {
      k.answer = q.answer;
      /* q.unit may be a STRING or an ARRAY of equivalent units (["cm³","ml"]).
         The key is what gradeTyped reads, so the array travels whole - flatten it
         to a string here and "ml" stops being accepted on a cm³ question the
         moment the question crosses the bridge. */
      if (Array.isArray(q.unit)) { if (q.unit.length) k.unit = q.unit.map(String); }
      else if (q.unit) k.unit = String(q.unit);
      if (Array.isArray(q.units)) { if (q.units.length) k.units = q.units.map(String); }
      else if (q.units) k.units = String(q.units);
      if (Array.isArray(q.fracAnswer)) k.fracAnswer = [Number(q.fracAnswer[0]), Number(q.fracAnswer[1])];
      if (typeof q.dp === 'number' && isFinite(q.dp)) k.dp = q.dp;
    }
    return k;
  }

  var seq = 0;
  function serialize(q, meta) {
    var typed = !!q.typed;
    var choices = typed ? [] : (q.choices || []).map(String);
    var unitsAccepted = MQI.unitList(q.unit || q.units).map(String);
    seq += 1;
    return {
      id: 'q' + seq,
      topic: meta.topic,
      generator: meta.generator || null,
      pool: (typeof meta.pool === 'number') ? meta.pool : (typeof q.level === 'number' ? q.level : 1),
      level: (typeof q.level === 'number') ? q.level : 1,
      skill: String(q.skill || ''),
      kind: typed ? 'typed' : 'choice',
      stem: String(q.q || ''),
      stemText: plain(q.q),
      extra: String(q.extra || ''),
      extraText: plain(q.extra),
      /* Set by the figure-spec lane once generators emit `figure: {...}` instead of
         markup. Null until then; the bridge decodes it into MQContent.Figure and
         falls back to .unsupported for a type it does not know yet. */
      figure: (q.figure === undefined || q.figure === null) ? null : q.figure,
      /* True while a topic still paints its diagram as an SVG/HTML string in
         `extra`. The figure-spec lane drives this to false everywhere; MQFigures
         can use it to decide between a spec renderer and a web fallback. */
      extraIsMarkup: hasMarkup(q.extra),
      choices: choices,
      choiceTexts: choices.map(plain),
      correctIndex: typed ? -1 : (typeof q.correct === 'number' ? q.correct : -1),
      answerText: String(q.answerText === undefined ? '' : q.answerText),
      answerTextPlain: plain(q.answerText),
      explain: String(q.explain === undefined || q.explain === null ? '' : q.explain),
      explainText: plain(q.explain),
      /* The CANONICAL unit, for a keypad to print beside the field: the first member
         when the question declares a set of equivalents. Grading reads key.unit,
         which carries the whole set. */
      unit: unitsAccepted.length ? unitsAccepted[0] : '',
      /* EVERY unit this question accepts, canonical first. Quest Refutation K3/K7
         (2026-09-07): a unit chip row built from the canonical member alone offers
         "ml" as a wrong-unit distractor on a cm³ question that grades "ml" CORRECT,
         so the app teaches a falsehood its own p5volume stem contradicts. A client
         cannot derive the set from `unit`, and `key` is opaque to it, so the set is
         published here. */
      units: unitsAccepted,
      key: keyOf(q)
    };
  }

  /* ---------- feed sessions ----------
     MQI.createFeed holds the no-repeat rings (shape ring, last generator, last
     skill) that make a session feel varied. One per named session id.

     BOUNDED, and that is a fix not a nicety. The map used to hold every session for
     the life of the JSContext and only an explicit endSession freed one: 20,000
     un-ended sessions measured 189 MB resident, dead linear, no plateau. On a 2 GB
     iPad that is the jetsam surface. It is now an LRU capped at MAX_SESSIONS - no
     child has 64 feeds open at once, and a caller that forgets to end one loses a
     no-repeat ring (it rebuilds on the next draw) instead of leaking. Evictions are
     reported by endSession/sessionStats so a caller who really needs more than the
     cap finds out rather than guessing. */
  var MAX_SESSIONS = 64;
  var sessions = Object.create(null);
  var sessionOrder = [];            /* least-recently-used first */
  var evictedCount = 0;

  function touchSession(id) {
    var at = sessionOrder.indexOf(id);
    if (at !== -1) sessionOrder.splice(at, 1);
    sessionOrder.push(id);
  }
  function dropSession(id) {
    if (!(id in sessions)) return false;
    delete sessions[id];
    var at = sessionOrder.indexOf(id);
    if (at !== -1) sessionOrder.splice(at, 1);
    return true;
  }
  function feedFor(sessionId, topic) {
    var s = sessions[sessionId];
    if (s && s.topic === topic) { touchSession(sessionId); return s.feed; }
    sessions[sessionId] = { topic: topic, feed: MQI.createFeed(topic) };
    touchSession(sessionId);
    while (sessionOrder.length > MAX_SESSIONS) {
      dropSession(sessionOrder[0]);
      evictedCount += 1;
    }
    return sessions[sessionId].feed;
  }

  /* ---------- envelope ---------- */
  function ok(obj) { obj.ok = true; return JSON.stringify(obj); }
  function fail(err, where) {
    return JSON.stringify({
      ok: false,
      error: {
        name: (err && err.name) ? String(err.name) : 'Error',
        message: (err && err.message) ? String(err.message) : String(err),
        stack: (err && err.stack) ? String(err.stack) : '',
        where: where || ''
      }
    });
  }
  function args(json, where) {
    if (json === undefined || json === null || json === '') return {};
    if (typeof json === 'object') return json;   /* tolerated: a host that passes an object */
    var a = JSON.parse(json);
    if (a === null || typeof a !== 'object') throw new Error(where + ': args must be a JSON object');
    return a;
  }

  /* ---------- listTopics ---------- */
  function listTopics() {
    try {
      var nodeById = Object.create(null);
      (MQI.mapNodes || []).forEach(function (n) { nodeById[n.id] = n; });

      var topics = Object.keys(MQI.topics).map(function (id) {
        var def = MQI.topics[id];
        var node = nodeById[id] || null;
        var gens = [];
        [1, 2, 3].forEach(function (pool) {
          (def.pools[pool] || []).forEach(function (entry, i) {
            gens.push({ ref: refOf(id, pool, i), pool: pool, index: i, skill: String(entry[1] || '') });
          });
        });
        return {
          id: id,
          level: String(def.level || ''),
          strand: String(def.strand || ''),
          moeSubTopic: String(def.moeSubTopic || ''),
          label: String(def.label || ''),
          short: String(def.short || ''),
          emoji: String(def.e || ''),
          name: node ? String(node.name || '') : String(def.label || ''),
          blurb: node ? String(node.blurb || '') : '',
          grades: node ? (node.grades || []).map(String) : [],
          status: node ? String(node.status || 'live') : 'live',
          skills: Object.keys(def.skills || {}).map(function (k) {
            var s = def.skills[k] || {};
            return { id: k, label: String(s.label || k), tip: String(s.tip || '') };
          }),
          poolSizes: { 1: (def.pools[1] || []).length, 2: (def.pools[2] || []).length, 3: (def.pools[3] || []).length },
          generators: gens
        };
      });

      return ok({
        count: topics.length,
        generatorCount: topics.reduce(function (n, t) { return n + t.generators.length; }, 0),
        topics: topics,
        grades: (MQI.grades || []).map(String),
        nodes: (MQI.mapNodes || []).map(function (n) {
          return {
            id: String(n.id), emoji: String(n.e || ''), name: String(n.name || ''),
            blurb: String(n.blurb || ''), grades: (n.grades || []).map(String),
            status: String(n.status || 'live'), playable: String(n.status || 'live') === 'live' && !!MQI.topics[n.id]
          };
        })
      });
    } catch (e) { return fail(e, 'listTopics'); }
  }

  /* ---------- nextQuestion ----------
   * args, any ONE of:
   *   {generator:"p4area/3/2"}                      one named pool entry, no feed
   *   {topic:"p4area", level:2}                     one uniform pool draw (makeQuestionFor)
   *   {topic:"p4area", level:2, session:"abc"}      through MQI.createFeed (no-repeat rings)
   * plus optional {count:200} to draw a batch in one crossing of the bridge.
   */
  function nextQuestion(json) {
    try {
      var a = args(json, 'nextQuestion');
      var count = (typeof a.count === 'number' && a.count > 0) ? Math.floor(a.count) : 1;
      if (count > 5000) throw new Error('nextQuestion: count ' + count + ' exceeds the 5000 cap');
      var out = [];

      if (a.generator) {
        var g = parseRef(a.generator);
        for (var i = 0; i < count; i++) {
          var q = g.gen();
          q.level = (typeof a.level === 'number') ? a.level : g.pool;
          q.skill = g.skill;
          out.push(serialize(q, { topic: g.topic, generator: a.generator, pool: g.pool }));
        }
      } else {
        var topic = String(a.topic || '');
        if (!topic) throw new Error('nextQuestion: need `topic` or `generator`');
        if (!MQI.topics[topic]) throw new Error('nextQuestion: unknown topic "' + topic + '"');
        var level = (a.level === 2 || a.level === 3) ? a.level : 1;
        if (a.session) {
          var feed = feedFor(String(a.session), topic);
          for (var j = 0; j < count; j++) out.push(serialize(feed.next(level), { topic: topic }));
        } else {
          for (var k = 0; k < count; k++) out.push(serialize(MQI.makeQuestionFor(topic, level), { topic: topic, pool: level }));
        }
      }
      return ok({ question: out[0] || null, questions: out, count: out.length });
    } catch (e) { return fail(e, 'nextQuestion'); }
  }

  /* ---------- grade ----------
   * args: {question:<as returned>, answer:{choice:2} | {text:"113 cm"}}
   *   or  {items:[{question, answer}, ...]}
   * The typed path calls MQI.gradeTyped - the SAME function js/app.js calls - so a
   * unit mismatch ("113 cm" against a cm2 answer) is rejected here exactly as it is
   * on the web. Never reimplement grading on the Swift side.
   */
  function gradeOne(item) {
    var q = item && item.question;
    if (!q || typeof q !== 'object') throw new Error('grade: missing `question`');
    var key = q.key || {};
    var ans = item.answer || {};
    var v = { correct: false, kind: key.typed ? 'typed' : 'choice', questionId: q.id || null, reason: null };

    if (key.typed) {
      var raw = (ans.text !== undefined && ans.text !== null) ? String(ans.text)
              : (ans.value !== undefined && ans.value !== null) ? String(ans.value) : '';
      var parsed = MQI.parseTypedAnswer(raw, key);
      v.correct = MQI.gradeTyped(raw, key);
      v.typedRaw = raw;
      v.parsed = parsed.ok
        ? { ok: true, value: parsed.value, unit: parsed.unit || '', frac: parsed.frac || null, reason: null }
        : { ok: false, value: null, unit: '', frac: null, reason: String(parsed.reason || 'unparsed') };
      /* WHY it was wrong, machine-readable. The single string 'wrong value or unit'
         made a SwiftUI view as blind as the web card was (Unit Sweep Refutation W1):
         it could not tell "your number was right, the unit was not" from "that is
         the wrong number". MQI.typedRejectReason is the ONE definition of that
         split - the same call js/app.js resolve() makes to write the child's card. */
      if (!v.correct) v.reason = String(MQI.typedRejectReason(raw, key) || 'wrong-value');
      v.expectedIndex = -1;
      v.expectedText = String(q.answerTextPlain || q.answerText || '');
      v.chosenIndex = -1;
    } else {
      var idx = (typeof ans.choice === 'number') ? ans.choice : -1;
      if (idx < 0 && ans.text !== undefined && ans.text !== null) {
        var texts = q.choices || [];
        idx = texts.indexOf(String(ans.text));
        if (idx < 0) idx = (q.choiceTexts || []).indexOf(String(ans.text));
        if (idx < 0) v.reason = 'no such choice';
      }
      v.chosenIndex = idx;
      v.expectedIndex = (typeof key.correct === 'number') ? key.correct : -1;
      v.expectedText = String(q.answerTextPlain || q.answerText || '');
      v.correct = idx >= 0 && idx === v.expectedIndex;
      if (!v.correct && v.reason === null) v.reason = (idx < 0 ? 'no answer given' : 'wrong option');
    }
    return v;
  }
  function grade(json) {
    try {
      var a = args(json, 'grade');
      if (Array.isArray(a.items)) {
        var out = [];
        for (var i = 0; i < a.items.length; i++) out.push(gradeOne(a.items[i]));
        return ok({ verdict: out[0] || null, verdicts: out, count: out.length });
      }
      var v = gradeOne(a);
      return ok({ verdict: v, verdicts: [v], count: 1 });
    } catch (e) { return fail(e, 'grade'); }
  }

  /* ---------- explain ----------
   * args: {question:<as returned>}. The explanation the child sees after a wrong
   * answer, plus the parent tip for the skill the item exercised.
   */
  function explain(json) {
    try {
      var a = args(json, 'explain');
      var q = a.question;
      if (!q || typeof q !== 'object') throw new Error('explain: missing `question`');
      var def = MQI.topics[q.topic];
      var skill = (def && def.skills && def.skills[q.skill]) || null;
      return ok({
        explanation: {
          questionId: q.id || null,
          topic: String(q.topic || ''),
          skill: String(q.skill || ''),
          skillLabel: skill ? String(skill.label || q.skill || '') : String(q.skill || ''),
          skillTip: skill ? String(skill.tip || '') : '',
          html: String(q.explain || ''),
          text: String(q.explainText || plain(q.explain)),
          answerText: String(q.answerText || ''),
          answerTextPlain: String(q.answerTextPlain || plain(q.answerText))
        }
      });
    } catch (e) { return fail(e, 'explain'); }
  }

  /* ---------- build ---------- */
  function build() {
    try {
      var meta = (typeof MQI_ENGINE_META !== 'undefined') ? MQI_ENGINE_META : {};
      var topicIds = Object.keys(MQI.topics);
      var entries = 0, fns = [];
      topicIds.forEach(function (id) {
        [1, 2, 3].forEach(function (p) {
          (MQI.topics[id].pools[p] || []).forEach(function (e) {
            entries += 1;
            if (fns.indexOf(e[0]) === -1) fns.push(e[0]);
          });
        });
      });
      return ok({
        build: {
          stamp: String(meta.stamp || ''),
          date: String(meta.date || ''),
          sha: String(meta.sha || ''),
          dirty: !!meta.dirty,
          payloadHash: String(meta.payloadHash || ''),
          files: (meta.files || []).map(String),
          fileCount: Number(meta.fileCount || 0),
          topicCount: topicIds.length,
          generatorCount: entries,
          distinctGenerators: fns.length,
          platform: (typeof MQI_HOST !== 'undefined' && MQI_HOST) ? String(MQI_HOST.platform) : 'unknown'
        }
      });
    } catch (e) { return fail(e, 'build'); }
  }

  /* ---------- session lifecycle + logs ---------- */
  function endSession(json) {
    try {
      var a = args(json, 'endSession');
      var ended = [];
      if (a.all) {
        ended = sessionOrder.slice();
        sessions = Object.create(null);
        sessionOrder = [];
      } else if (a.session) {
        var id = String(a.session);
        if (dropSession(id)) ended.push(id);
      }
      return ok({
        ended: ended,
        open: sessionOrder.length,
        cap: MAX_SESSIONS,
        evicted: evictedCount
      });
    } catch (e) { return fail(e, 'endSession'); }
  }
  /* Read-only: what the session map is holding. The Swift side's memory-pressure hook
     asserts on this after draining, and the gate asserts the cap actually binds. */
  function sessionStats() {
    try {
      return ok({ open: sessionOrder.length, cap: MAX_SESSIONS, evicted: evictedCount });
    } catch (e) { return fail(e, 'sessionStats'); }
  }
  function drainLogs() {
    try {
      var logs = (typeof MQI_HOST !== 'undefined' && MQI_HOST && MQI_HOST.drainLogs) ? MQI_HOST.drainLogs() : [];
      return ok({ logs: logs });
    } catch (e) { return fail(e, 'drainLogs'); }
  }

  return {
    listTopics: listTopics,
    nextQuestion: nextQuestion,
    grade: grade,
    explain: explain,
    build: build,
    endSession: endSession,
    sessionStats: sessionStats,
    drainLogs: drainLogs
  };
})();
