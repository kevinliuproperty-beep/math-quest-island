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
   with core.js shapeKey by hand; the audit's key it descends from is identical. */
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
function session(tid) {
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
    if (rnd() < ACC) { rightRow++; wrongRow = 0; if (rightRow >= 3 && level < 3) { level++; rightRow = 0; } }
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
console.log(bad ? `\nfeed-sim FAILED (${bad})` : '\nfeed-sim OK');
process.exit(bad ? 1 : 0);
