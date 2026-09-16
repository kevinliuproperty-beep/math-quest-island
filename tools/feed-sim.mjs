/* Feed variety gate for Math Quest Island.
 *
 * Kevin played the shipped build on 2026-09-05 and got "perimeter, perimeter,
 * area, area": "if you ask the same question 5 times in a row with different
 * numbers that's the definition of easy". The Repetition + Demand Audit measured
 * it - the next item repeated the previous question's TEMPLATE (same generator
 * function) 32 - 38% of the time, worst same-template run 12 in a 30-question
 * session. This harness is the regression gate for the fix.
 *
 * It loads js/core.js, every js/topics/*.js and js/registry.js into a bare vm
 * with a SEEDED Math.random, then runs 30-question sessions x 200 seeds for
 * P3 / P4 / P5 at 80% simulated accuracy THROUGH THE REAL SELECTION CODE
 * (MQI.createFeed + the app's own 3-right-up / 2-wrong-down climb). Nothing here
 * reimplements the feed; swap in another core.js and it measures that one.
 *
 * Run:      node tools/feed-sim.mjs          (or: npm test)
 * Baseline: node tools/feed-sim.mjs --core /path/to/old/core.js
 *           An older core.js with no MQI.createFeed is measured on its own
 *           buildSetFor + makeQuestionFor path, so the before/after table is
 *           real code on both sides.
 *
 * Exit: 0 if every level is inside THRESHOLDS, 1 otherwise. --no-gate to report only.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argOf = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COREPATH = argOf('--core') || path.join(ROOT, 'js/core.js');
const GATE = !argv.includes('--no-gate');
const SEEDS = Number(argOf('--seeds')) || 200;
const LEN = Number(argOf('--len')) || 30;
const ACC = Number(argOf('--acc')) || 0.8;
const GRADES = (argOf('--grades') || 'P3,P4,P5').split(',');

/* same-template (same generator function) ceiling per level, and the worst
   same-template run any seed may produce. */
const THRESHOLDS = {
  P3: { sameTemplate: 0.05, sameSkill: 0.35 },
  P4: { sameTemplate: 0.05, sameSkill: 0.35 },
  P5: { sameTemplate: 0.12, sameSkill: 0.35 }
};
const MAX_RUN = 4;
/* Wave-3 blocker (Dress Rehearsal Wave 3 leg 2): the geometry feed served six
   consecutive items all tagged skill 'peri' and this gate did not see it, because
   it only ever asserted on TEMPLATE identity. Skill repetition is the thing Kevin
   actually complained about ("perimeter, perimeter, area, area"), so it is gated
   in its own right: P(next item repeats the previous item's skill) and the longest
   same-skill run any seed may produce. */
const MAX_SKILL_RUN = 3;

/* ---------- seeded RNG (mulberry32) ---------- */
let _s = 1;
const setSeed = n => { _s = n >>> 0; };
function rnd() {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* ---------- load the app's pure layer, with Math.random under our control ----------
   Math is passed by reference into the vm, so the context gets a DELEGATING clone;
   overriding random on it must never touch the host's Math. */
const SeededMath = Object.create(Math);
SeededMath.random = rnd;
const ctx = {
  Math: SeededMath, console, Number, Array, Set, Map, JSON, String, Object, Boolean,
  Error, isNaN, parseInt, parseFloat, RegExp, Date, Symbol
};
ctx.globalThis = ctx;
vm.createContext(ctx);
const runFile = (src, name) => vm.runInContext(src, ctx, { filename: name });
runFile(fs.readFileSync(COREPATH, 'utf8'), COREPATH);
for (const f of fs.readdirSync(path.join(ROOT, 'js/topics')).filter(f => f.endsWith('.js')).sort()) {
  runFile(fs.readFileSync(path.join(ROOT, 'js/topics', f), 'utf8'), 'js/topics/' + f);
}
runFile(fs.readFileSync(path.join(ROOT, 'js/registry.js'), 'utf8'), 'js/registry.js');

const MQI = ctx.MQI;
const TOPICS = MQI.topics;
const HAS_FEED = typeof MQI.createFeed === 'function';

/* ---------- generator identity + stem shape ----------
   Generator identity is the pool entry's function, so "same template" is exact.
   Shape uses the app's own shapeKey when the core under test has one (it is the
   guard's own key), else the audit's equivalent. */
const genIds = new Map();
let nextGid = 0;
const gid = fn => { if (!genIds.has(fn)) genIds.set(fn, 'g' + (nextGid++)); return genIds.get(fn); };
const GEN_OF = new Map();   // topic|level|skill -> [fn, ...] for identity lookup
for (const tid of Object.keys(TOPICS)) {
  for (const lvl of [1, 2, 3]) for (const pr of TOPICS[tid].pools[lvl]) gid(pr[0]);
}
/* The harness masks stems itself rather than calling MQI.shapeKey, so a core
   under test that predates the fix is measured with the SAME ruler. Kept in step
   with core.js shapeKey by hand; the audit's key it descends from is identical.

   EIGHTH PASS 2026-09-16, W7. v8 widened the fraction regex below to `-?\d+` when
   it widened every fraction regex in tools/gen-sanity.mjs, and js/core.js:370's
   shapeKey - which this block exists to MIRROR - was left at `\d+`. Inert while
   nothing in the game renders a negative fraction, but the simulator and the app
   were no longer computing the same shape key, so the repeat guard this file
   certifies was not quite the one the app runs. Back in step with core.js;
   core.js is out of this lane's fence and is untouched. */
const SHAPE_STOP = new Set(('A An The What Which How If In On At Of For From To And Or But So Then When Where Why Who '
  + 'Find Work Round Write Express Simplify Solve Calculate Convert Complete Give Use Look Read Add Subtract Multiply '
  + 'Divide Count Fill Choose Pick Draw Shade Here There This That It Is Are Was Were Do Does Each Every After Before '
  + 'True False Yes No Total Sum Both All Some One Two Three Four Five Six Seven Eight Nine Ten First Second Third '
  + 'Last Next Same Answer Question Hint Note').split(' '));
const SHAPE = q => {
  let s = String((q && q.q) || '') + ' ||X|| ' + String((q && q.extra) || '');
  s = s.replace(/<span class="frac">[\s\S]*?<\/span><\/span>/g, ' [FRAC] ');
  s = s.replace(/<span class="n">\d+<\/span><span class="d">\d+<\/span>/g, ' [FRAC] ');
  s = s.replace(/<[^>]*>/g, ' [T] ');
  s = s.replace(/&nbsp;/g, ' ');
  s = s.replace(/\$\s?[\d, ]+(\.\d+)?/g, ' [MONEY] ');
  s = s.replace(/\d[\d, ]*(\.\d+)?/g, ' [NUM] ');
  s = s.replace(/"[^"]*"/g, ' [QUOTED] ');
  s = s.replace(/[A-Z][a-z']+/g, w => SHAPE_STOP.has(w) ? w : ' [NAME] ');
  return s.replace(/\s+/g, ' ').trim();
};

/* A generated question does not carry its generator, so identity is recovered by
   wrapping every pool entry's function once and stamping the id on the result. */
for (const tid of Object.keys(TOPICS)) {
  for (const lvl of [1, 2, 3]) {
    TOPICS[tid].pools[lvl] = TOPICS[tid].pools[lvl].map(pr => {
      const id = gid(pr[0]), fn = pr[0];
      const wrapped = () => { const q = fn(); q.__gen = id; return q; };
      GEN_OF.set(id, fn);
      return [wrapped, pr[1]];
    });
  }
}

const liveTopics = grade => (MQI.levelNodes[grade] || [])
  .filter(id => MQI.mapNodes.some(n => n.id === id && n.status === 'live') && TOPICS[id]);

/* ---------- one session, through the real selection code ---------- */
function session(tid, acc) {
  const hit = acc === undefined ? ACC : acc;
  const feed = HAS_FEED ? MQI.createFeed(tid) : null;
  const qset = HAS_FEED ? null : MQI.buildSetFor(tid, LEN);   /* the shipped-baseline path */
  const out = [];
  let level = 1, rightRow = 0, wrongRow = 0;
  for (let i = 0; i < LEN; i++) {
    let q;
    if (feed) q = feed.next(level);
    else q = (qset[level] && qset[level].length) ? qset[level].shift() : MQI.makeQuestionFor(tid, level);
    out.push({ gen: q.__gen, skill: q.skill, shape: SHAPE(q), pool: q.level || level });
    /* the app's mastery climb, verbatim: 3 right in a row up, 2 wrong in a row down */
    if (rnd() < hit) { rightRow++; wrongRow = 0; if (rightRow >= 3 && level < 3) { level++; rightRow = 0; } }
    else { wrongRow++; rightRow = 0; if (wrongRow >= 2 && level > 1) { level--; wrongRow = 0; } }
  }
  return out;
}

function measure(grade) {
  const topics = liveTopics(grade);
  let pairs = 0, sameGen = 0, sameShape = 0, sameSkill = 0, total = 0;
  const pool = { 1: 0, 2: 0, 3: 0 };
  const runs = [], skillRuns = [];
  for (let s = 0; s < SEEDS; s++) {
    setSeed(1000003 + s * 7919);
    const tid = topics[Math.floor(rnd() * topics.length)];
    const items = session(tid);
    let run = 1, best = 1, skRun = 1, skBest = 1;
    for (let i = 0; i < items.length; i++) {
      const q = items[i];
      pool[q.pool] = (pool[q.pool] || 0) + 1; total++;
      if (i === 0) continue;
      const p = items[i - 1];
      pairs++;
      if (p.gen === q.gen) { sameGen++; run++; } else { best = Math.max(best, run); run = 1; }
      if (p.shape === q.shape) sameShape++;
      if (p.skill === q.skill) { sameSkill++; skRun++; } else { skBest = Math.max(skBest, skRun); skRun = 1; }
    }
    runs.push(Math.max(best, run));
    skillRuns.push(Math.max(skBest, skRun));
  }
  return {
    grade,
    sameTemplate: sameGen / pairs,
    sameShape: sameShape / pairs,
    sameSkill: sameSkill / pairs,
    meanRun: runs.reduce((a, b) => a + b, 0) / runs.length,
    worstRun: Math.max(...runs),
    worstSkillRun: Math.max(...skillRuns),
    pool: [pool[1] / total, pool[2] / total, pool[3] / total]
  };
}

/* ---------- SKILL SERVICE, one topic at a time ---------------------------------
   The decimals refutation's seventh pass (W3) measured something this harness could
   not see. Its table reads TEMPLATE repetition, which was Kevin's complaint; it
   never read how many items of each SKILL a child actually gets. At 45% simulated
   accuracy the p4 decimals feed was serving five of its six skills about 5.8 items
   in a thirty-item session and the sixth - `round`, one of the topic's own declared
   skills - 1.11, every one of them from a pool the struggling child is not sitting
   in. A skill a topic declares and then does not serve is invisible to every other
   arm in this file, so it is printed here: items per session by skill and by
   generator, at the accuracy the argument is about.

   Reported, not gated: what the right number is, is a pool decision a lane makes
   with its eyes open, and a threshold here would guess it. --- */
const SKILL_TID = argOf('--skills') || 'decimals';
function skillTable(tid, acc, seeds) {
  const bySkill = new Map(), byGen = new Map();
  const worst = new Map(), worstGen = new Map();
  const keepAcc = ACC;
  for (let s = 0; s < seeds; s++) {
    setSeed(2000003 + s * 7919);
    const items = sessionAt(tid, acc);
    const here = new Map(), hereGen = new Map();
    for (const q of items) {
      bySkill.set(q.skill, (bySkill.get(q.skill) || 0) + 1);
      byGen.set(q.gen, (byGen.get(q.gen) || 0) + 1);
      here.set(q.skill, (here.get(q.skill) || 0) + 1);
      hereGen.set(q.gen, (hereGen.get(q.gen) || 0) + 1);
    }
    for (const [k, v] of here) worst.set(k, Math.max(worst.get(k) || 0, v));
    for (const [k, v] of hereGen) worstGen.set(k, Math.max(worstGen.get(k) || 0, v));
  }
  void keepAcc;
  return { bySkill, byGen, worst, worstGen, seeds };
}
/* the same session loop as above with the accuracy passed in rather than global */
function sessionAt(tid, acc) {
  const feed = HAS_FEED ? MQI.createFeed(tid) : null;
  const qset = HAS_FEED ? null : MQI.buildSetFor(tid, LEN);
  const out = [];
  let level = 1, rightRow = 0, wrongRow = 0;
  for (let i = 0; i < LEN; i++) {
    const q = feed ? feed.next(level)
      : ((qset[level] && qset[level].length) ? qset[level].shift() : MQI.makeQuestionFor(tid, level));
    out.push({ gen: q.__gen, skill: q.skill, pool: q.level || level });
    if (rnd() < acc) { rightRow++; wrongRow = 0; if (rightRow >= 3 && level < 3) { level++; rightRow = 0; } }
    else { wrongRow++; rightRow = 0; if (wrongRow >= 2 && level > 1) { level--; wrongRow = 0; } }
  }
  return out;
}

/* ---------- report ---------- */
const f3 = x => x.toFixed(3);
console.log(`feed-sim  core=${path.relative(ROOT, COREPATH) || COREPATH}  path=${HAS_FEED ? 'createFeed (round-robin + no-repeat-3)' : 'legacy buildSetFor (uniform draw)'}`);
console.log(`${SEEDS} seeds x ${LEN} questions, simulated accuracy ${ACC}\n`);
console.log('Level | same template | same shape | same skill | mean run | worst run | worst skill run | pools 1/2/3');
console.log('------|---------------|------------|------------|----------|-----------|-----------------|------------');
const rows = GRADES.map(measure);
for (const r of rows) {
  console.log(`${r.grade}    | ${f3(r.sameTemplate).padStart(13)} | ${f3(r.sameShape).padStart(10)} | ${f3(r.sameSkill).padStart(10)} | ${r.meanRun.toFixed(2).padStart(8)} | ${String(r.worstRun).padStart(9)} | ${String(r.worstSkillRun).padStart(15)} | ${r.pool.map(f3).join(' / ')}`);
}

/* ---------- LEVEL-3 POOL SOURCE (v4 refutation wound 1, 2026-09-15) ----------
   The table above measures VARIETY. It cannot see DILUTION: core.js's level-3
   borrow serves a pool-2 item when the climb asked for level 3, and every repeat
   metric stays perfect while it does so. That is how the depth pilot lost half its
   payload unnoticed - deleting gMissSide took `geometry` pool 3 from three skills
   to two, thinL3 flipped true, and 48.8% of the climb's level-3 turns came out of
   pool 2, halving the two pool-3-only formats the pilot was built for (20.3% ->
   10.3% of a session).
   THE RULE: a topic whose pool 3 carries 2 OR MORE distinct skills must serve
   level 3 entirely from pool 3. At one skill the carousel genuinely cannot hide a
   repeat, so the borrow is still allowed there and the share is reported only. */
const L3_MIN_SKILLS = 2;
const l3rows = [];
if (HAS_FEED) {
  const live = new Set();
  for (const g of GRADES) for (const tid of liveTopics(g)) live.add(tid);
  for (const tid of [...live].sort()) {
    const mix = { 1: 0, 2: 0, 3: 0 };
    let total = 0, want3 = 0, from2 = 0;
    for (let s = 0; s < SEEDS; s++) {
      setSeed(2000003 + s * 7919);
      const feed = MQI.createFeed(tid);
      let level = 1, rightRow = 0, wrongRow = 0;
      for (let i = 0; i < LEN; i++) {
        const want = level;
        const q = feed.next(level);
        const served = q.level || level;
        mix[served] = (mix[served] || 0) + 1; total++;
        if (want === 3) { want3++; if (served !== 3) from2++; }
        if (rnd() < ACC) { rightRow++; wrongRow = 0; if (rightRow >= 3 && level < 3) { level++; rightRow = 0; } }
        else { wrongRow++; rightRow = 0; if (wrongRow >= 2 && level > 1) { level--; wrongRow = 0; } }
      }
    }
    const skills = new Set(TOPICS[tid].pools[3].map(pr => pr[1])).size;
    l3rows.push({ tid, skills, want3, from2, share: want3 ? from2 / want3 : 0,
                  pool: [mix[1] / total, mix[2] / total, mix[3] / total] });
  }
  console.log('\nLevel-3 pool source (the borrow) - a topic with >= ' + L3_MIN_SKILLS +
              ' pool-3 skills must serve level 3 from pool 3');
  console.log('Topic            | pool-3 skills | L3 turns from pool 2 | pools 1/2/3');
  console.log('-----------------|---------------|----------------------|------------');
  for (const r of l3rows)
    console.log(`${r.tid.padEnd(16)} | ${String(r.skills).padStart(13)} | ${(r.from2 + '/' + r.want3).padStart(11)} (${(100 * r.share).toFixed(1).padStart(5)}%) | ${r.pool.map(f3).join(' / ')}`);
} else {
  console.log('\nLevel-3 pool source: skipped, core under test has no createFeed');
}

/* ---------- the struggling child, per topic. REPORT ONLY ----------------------
   Sweep p3numbers Refutation (second pass, 2026-09-15), W2: the table above is a
   GRADE aggregate at one accuracy. measure() picks a random live topic per seed,
   so a per-topic number never appears; and 0.8 accuracy keeps the simulated child
   near the top of the climb, so pool 1 is barely sampled. The child who is
   struggling lives somewhere else entirely: at 0.45 accuracy the climb sends him
   DOWN, p3numbers served pool 1 for 79.5% of a session, and the single generator
   on pool 1's `compare` peg came round 5.25 times in 30 items, worst 8 - with one
   masked shape, and invisible to every line above, which measures only ADJACENT
   repeats.

   So this section runs every live topic on its own at 0.45 and prints the busiest
   generator in a session. It gates nothing: the thresholds above were set against
   measured behaviour at 0.8 and are not re-argued here. It is the ruler that was
   missing, and a topic whose busiest pool-1 generator comes round five times a
   session is a topic to look at, not a failure to stop the build. ---

   INTEGRATOR (wave 1): lane/sweep-fractions arrived at the identical section from
   its own third pass. Its measurements are kept here rather than dropped, because
   they are a second topic's numbers on the same ruler:

   Sweep fractions Refutation (THIRD PASS, 2026-09-16), W2 - and the same finding
   the p3numbers second pass landed, arriving here by a different road. Every feed
   measurement in three sweeps and three refutations has been taken at ONE accuracy,
   0.8, which keeps the simulated child near the top of the climb; and measure()
   picks a random live topic per seed, so no per-topic number ever appears.

   The app's climb is 3-right-up / 2-wrong-down, so accuracy does not shift the pool
   mix a little - it inverts it. Measured on `fractions` at 0.45: pool 1 carries
   79.9% of a 30-item session against 19.8% at 0.8, and the twelve pool-3 formats
   this lane was written to add fall to 3.3% between them. The kill and the wound
   this pass found both sit in pool 1, which is to say they land almost entirely on
   the child who is not doing well.

   This section is the ruler that was missing. It runs every live topic on its own
   at 0.45 and prints the pool mix and the busiest generator in a session. It GATES
   NOTHING: the thresholds above were set against measured behaviour at 0.8 and are
   not re-argued here. FOR THE INTEGRATOR - this is a fleet finding, not a fractions
   one: the pool composition and the climb live in js/core.js, outside this lane's
   fence, and a topic whose busiest pool-1 generator comes round four times a
   session is a topic to look at, not a build to stop. --- */
{
  const LOW = 0.45;
  console.log(`\nstruggling-child pass  accuracy ${LOW}, ${SEEDS} seeds x ${LEN}, per topic  (REPORT ONLY, nothing here gates)\n`);
  console.log('TOPIC           | pools 1/2/3         | same template | worst run | busiest generator per session');
  console.log('----------------|---------------------|---------------|-----------|------------------------------');
  const done = new Set();
  for (const grade of GRADES) {
    for (const tid of liveTopics(grade)) {
      if (done.has(tid)) continue;              /* a node can hang off two grades */
      done.add(tid);
      let pairs = 0, sameGen = 0, total = 0, worstRun = 1;
      const pool = { 1: 0, 2: 0, 3: 0 };
      const counts = new Map();                   /* gen id -> per-session counts */
      for (let s = 0; s < SEEDS; s++) {
        setSeed(4000037 + s * 7919);
        const items = session(tid, LOW);
        const seen = new Map();
        let run = 1;
        for (let i = 0; i < items.length; i++) {
          const q = items[i];
          pool[q.pool] = (pool[q.pool] || 0) + 1; total++;
          seen.set(q.gen, (seen.get(q.gen) || 0) + 1);
          if (i === 0) continue;
          pairs++;
          if (items[i - 1].gen === q.gen) { sameGen++; run++; } else { worstRun = Math.max(worstRun, run); run = 1; }
        }
        worstRun = Math.max(worstRun, run);
        for (const [id, c] of seen) {
          if (!counts.has(id)) counts.set(id, { n: 0, worst: 0 });
          const r = counts.get(id); r.n += c; r.worst = Math.max(r.worst, c);
        }
      }
      let top = null;
      for (const [id, r] of counts) if (!top || r.n > top.r.n) top = { id, r };
      const name = top ? ((GEN_OF.get(top.id) || {}).name || top.id) : '-';
      console.log(`${tid.padEnd(15)} | ${[pool[1], pool[2], pool[3]].map(v => f3(v / total)).join(' / ')} | ` +
        `${f3(sameGen / pairs).padStart(13)} | ${String(worstRun).padStart(9)} | ` +
        `${name} ${(top ? top.r.n / SEEDS : 0).toFixed(2)}, worst ${top ? top.r.worst : 0}`);
    }
  }
}

/* ---------- SKILL SERVICE, per skill and per generator. REPORT ONLY -----------
   lane/sweep-decimals' own ruler on the same question the struggling-child pass
   above asks: which skill, and which bank, actually reaches the child. Kept in the
   union because it reads the feed one level finer than the block above. */
if (TOPICS[SKILL_TID]) {
  const accs = [ACC, 0.45];
  const label = a => (a * 100).toFixed(0) + '%';
  const tables = accs.map(a => [a, skillTable(SKILL_TID, a, SEEDS)]);
  const skills = [...new Set(tables.flatMap(([, t]) => [...t.bySkill.keys()]))].sort();
  console.log(`\nSKILL SERVICE  (${SKILL_TID}, ${SEEDS} seeds x ${LEN} questions, items per session by skill)`);
  console.log(`skill    | ` + accs.map(a => `at ${label(a)}  worst`).join(' | '));
  for (const sk of skills) {
    const cells = tables.map(([, t]) =>
      `${((t.bySkill.get(sk) || 0) / t.seeds).toFixed(2).padStart(5)}  ${String(t.worst.get(sk) || 0).padStart(5)}`);
    console.log(`${String(sk).padEnd(8)} | ` + cells.join(' | '));
  }
  const lo = tables[tables.length - 1][1];
  const gens = [...lo.byGen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log(`  busiest six generators at ${label(0.45)}: ` +
    gens.map(([id, n]) => `${(GEN_OF.get(id) || {}).name || id} ${(n / lo.seeds).toFixed(2)}`).join(', '));
  /* --gen-table prints EVERY generator's items-per-session at each accuracy. The
     refutation notes quote per-bank service numbers - "2.02 items a session at
     45%", "1.44 at 80%" - and a lane that can only see its busiest six has to
     rebuild the feed to check one, which is how two passes ended up quoting a
     number nobody could reproduce from the repo's own harness. */
  if (argv.includes('--gen-table')) {
    const ids = [...new Set(tables.flatMap(([, t]) => [...t.byGen.keys()]))];
    const name = id => (GEN_OF.get(id) || {}).name || id;
    ids.sort((a, b) => String(name(a)).localeCompare(String(name(b))));
    console.log(`\nGENERATOR SERVICE  (${SKILL_TID}, ${SEEDS} seeds x ${LEN} questions, items per session)`);
    console.log(`generator          | ` + accs.map(a => `at ${label(a)}  worst`).join(' | '));
    for (const id of ids) {
      const cells = tables.map(([, t]) =>
        `${((t.byGen.get(id) || 0) / t.seeds).toFixed(2).padStart(5)}  ${String((t.worstGen && t.worstGen.get(id)) || 0).padStart(5)}`);
      console.log(`${String(name(id)).padEnd(18)} | ` + cells.join(' | '));
    }
  }
}

if (!GATE) process.exit(0);
let bad = 0;
console.log('');
for (const r of rows) {
  const th = THRESHOLDS[r.grade];
  if (!th) { console.log(`skip ${r.grade}  no threshold declared`); continue; }
  const okT = r.sameTemplate <= th.sameTemplate;
  const okR = r.worstRun <= MAX_RUN;
  const okS = r.sameSkill <= th.sameSkill;
  const okSR = r.worstSkillRun <= MAX_SKILL_RUN;
  if (!okT) { bad++; console.log(`FAIL ${r.grade}  same template ${f3(r.sameTemplate)} > ${th.sameTemplate}`); }
  if (!okR) { bad++; console.log(`FAIL ${r.grade}  worst same-template run ${r.worstRun} > ${MAX_RUN}`); }
  if (!okS) { bad++; console.log(`FAIL ${r.grade}  same skill ${f3(r.sameSkill)} > ${th.sameSkill}`); }
  if (!okSR) { bad++; console.log(`FAIL ${r.grade}  worst same-skill run ${r.worstSkillRun} > ${MAX_SKILL_RUN}`); }
  if (okT && okR && okS && okSR) console.log(`ok   ${r.grade}  same template ${f3(r.sameTemplate)} <= ${th.sameTemplate}, worst run ${r.worstRun} <= ${MAX_RUN}, same skill ${f3(r.sameSkill)} <= ${th.sameSkill}, worst skill run ${r.worstSkillRun} <= ${MAX_SKILL_RUN}`);
}
let diluted = 0;
for (const r of l3rows) {
  if (r.skills < L3_MIN_SKILLS) { console.log(`note ${r.tid}  pool 3 has ${r.skills} skill, borrow allowed; ${(100 * r.share).toFixed(1)}% of level-3 turns from pool 2`); continue; }
  if (r.from2) { bad++; diluted++; console.log(`FAIL ${r.tid}  level 3 diluted: ${r.from2}/${r.want3} (${(100 * r.share).toFixed(1)}%) of level-3 turns served from pool 2, but pool 3 carries ${r.skills} skills`); }
}
if (l3rows.length && !diluted) console.log(`ok   level-3 pool source  every topic with >= ${L3_MIN_SKILLS} pool-3 skills serves level 3 entirely from pool 3`);
console.log(bad ? `\nfeed-sim FAILED (${bad})` : '\nfeed-sim OK');
process.exit(bad ? 1 : 0);
