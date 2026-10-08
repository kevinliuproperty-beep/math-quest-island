/* Mock-paper routing gate for Math Quest Island (card X1, Math Hardness Calibration 2026-10-07).
 *
 * Builds N simulated P3 Mock Papers HEADLESSLY through the real code: js/core.js,
 * every js/topics/*.js, js/registry.js and js/modes/p3-mock.js in a bare vm with a
 * seeded Math.random, drawn exactly the way js/app.js draws for the live paper (one
 * dedup feed per node, pools stamped with q.gen). Nothing here re-implements the
 * paper; swap in another p3-mock.js and it measures that one.
 *
 * It prints, for the Full paper (and a shape check on Quick and Long):
 *   - mark total and item count (every paper must add up to the format's total)
 *   - section counts (A1 5, A2 5, B1 4, B2 8, B3 5)
 *   - band share per section (band 3 / band 2 / untagged)
 *   - share of long-problem (B3) slots that are q.exam === 'problem'
 *   - stretch items per paper (<= 1, never in Booklet A)
 *   - forbidden banks (CONFIG.NEVER_PROBLEM) in the long problems
 *   - duplicate items within a paper
 *   - topic share against the weight table
 *
 * Run:  node tools/mock-sim.mjs            (1000 Full papers, 200 Quick, 200 Long)
 *       node tools/mock-sim.mjs --papers 2000 --seed 7
 *       node tools/mock-sim.mjs --strict   on the MERGED hard-wave tree: also requires
 *                                          the Booklet A hard tail to be band 3
 * Exit: 0 if every gated line holds, 1 otherwise.
 *
 * WHAT IS GATED vs PRINTED. Structure is gated everywhere (totals, counts, stretch,
 * forbidden banks, duplicates, every long problem band 3 and worded, enough exam
 * problems). Band share of the Booklet A hard tail is PRINTED on a tree where no node
 * serves band-3 MCQs yet (the routing degrades to band 2 by design, see fit() in
 * p3-mock.js) and GATED under --strict, which is how the integrator runs it on the
 * merged tree. Topic share is printed against the weight table and not gated: the long
 * problems can only come from band-3 nodes, so on a thin tree the share leans to them.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argOf = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const PAPERS = Number(argOf('--papers')) || 1000;
const SIDE = Number(argOf('--side')) || 200;        /* Quick and Long papers each */
const SEED = Number(argOf('--seed')) || 20261027;
const STRICT = argv.includes('--strict');

/* ---------- seeded RNG (mulberry32), one stream for the generators and the paper ---------- */
let _s = SEED >>> 0;
function rnd() {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const SeededMath = Object.create(Math);
SeededMath.random = rnd;
const ctx = { Math: SeededMath, console, Number, Array, Set, Map, JSON, String, Object, Boolean, Error, isNaN,
              parseInt, parseFloat, RegExp, Date, Symbol, module: { exports: {} } };
ctx.globalThis = ctx;
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
load('js/core.js');
load('js/figures.js');
for (const f of fs.readdirSync(path.join(ROOT, 'js/topics')).filter(f => f.endsWith('.js')).sort()) load('js/topics/' + f);
load('js/registry.js');
load('js/modes/p3-mock.js');                        /* no window: it hands itself to module.exports */
const MQI = ctx.MQI;
const mode = ctx.module.exports;
if (!mode || typeof mode.buildPaper !== 'function') { console.log('FAIL  js/modes/p3-mock.js did not export the mode'); process.exit(1); }
const CFG = mode.config;

/* ---------- the shell's draw, mirrored from js/app.js (mockNodes + stampedFeed) ---------- */
function mockNodes() {
  return (MQI.levelNodes.P3 || [])
    .filter(id => MQI.mapNodes.some(n => n.id === id && n.status === 'live') && MQI.topics[id])
    .map(id => { const t = MQI.topics[id], sk = {};
      for (const k in t.skills) sk[k] = (t.skills[k] && t.skills[k].label) || k;
      return { id, label: t.short || t.label || id, skills: sk }; });
}
function stampedFeed(id) {
  const def = MQI.topics[id], keep = def.pools, pools = {};
  for (const l of [1, 2, 3]) pools[l] = keep[l].map(pr => { const fn = pr[0];
    const w = function () { const q = fn(); if (q && !q.gen) q.gen = id + '.' + (fn.name || 'anon'); return q; };
    return [w, pr[1]]; });
  def.pools = pools;
  try { return MQI.createFeed(id, { alternateL3: false }); } finally { def.pools = keep; }
}
function build(variant) {
  const feeds = {};
  const draw = (id, lvl) => { if (!feeds[id]) feeds[id] = stampedFeed(id); return feeds[id].next(lvl); };
  return mode.buildPaper({ variant, nodes: NODES, draw, parse: MQI.parseTypedAnswer, grade: MQI.gradeTyped,
                           shapeOf: MQI.shapeKey, rng: rnd });
}
const NODES = mockNodes();
const strip = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const words = q => strip(q.q).split(' ').filter(w => /[a-z]{2}/i.test(w)).length;
const identity = q => (q.q + '|' + (q.extra || '') + '|' + (q.typed ? String(q.answer) : (q.choices || []).slice().sort().join(''))).replace(/\s+/g, '');
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : 'n/a';
const bandOf = q => (q.band >= 3 ? 3 : (q.band === 2 ? 2 : 0));   /* 0 = untagged legacy, counts as <= 2 */

let fails = 0;
const gate = (ok, label) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + label); if (!ok) fails++; };
const note = label => console.log('  note  ' + label);

/* ---------- the Full paper ---------- */
function expectOf(variant) {
  const f = CFG.FORMATS[variant]; let m = 0, n = 0;
  f.sections.forEach(s => { m += s.count * s.marks; n += s.count; });
  return { marks: m, items: n, sections: f.sections };
}
function simulate(variant, N) {
  const want = expectOf(variant);
  const st = { marksOk: 0, itemsOk: 0, secOk: 0, stretchOver: 0, stretchA: 0, forbidden: 0, dupPapers: 0,
               longNotHard: 0, longNotWorded: 0, examShort: 0, tailNotHard: 0, tailSlots: 0, longSlots: 0, longExam: 0,
               shortPapers: 0, perSec: {}, topic: {}, longTopic: {}, forbiddenNames: {}, byGen: {} };
  const sawSec = {};
  for (let i = 0; i < N; i++) {
    const p = build(variant);
    if (p.totalMarks === want.marks) st.marksOk++;
    if (p.items.length === want.items) st.itemsOk++;
    if (p.shortSections && p.shortSections.length) st.shortPapers++;
    const counts = {};
    p.items.forEach(it => { counts[it.section] = (counts[it.section] || 0) + 1; });
    if (want.sections.every(s => counts[s.id] === s.count)) st.secOk++;
    let stretch = 0; const ids = new Set(); let dup = false;
    p.items.forEach(it => {
      const q = it.q, b = bandOf(q);
      const ps = st.perSec[it.section] || (st.perSec[it.section] = { n: 0, b3: 0, b2: 0, b0: 0 });
      ps.n++; ps[b === 3 ? 'b3' : b === 2 ? 'b2' : 'b0']++;
      st.topic[it.topic] = (st.topic[it.topic] || 0) + 1;
      if (q.stretch) { stretch++; if (it.sectionName === 'Booklet A') st.stretchA++; }
      const key = identity(q); if (ids.has(key)) dup = true; ids.add(key);
      if (it.kind === 'problem') {
        st.longSlots++;
        st.longTopic[it.topic] = (st.longTopic[it.topic] || 0) + 1;
        if (q.exam === 'problem') st.longExam++;
        if (b !== 3) st.longNotHard++;
        if (words(q) < (CFG.PROBLEM_MIN_WORDS || 0)) st.longNotWorded++;
        if (q.gen && CFG.NEVER_PROBLEM.indexOf(q.gen) !== -1) { st.forbidden++; st.forbiddenNames[q.gen] = (st.forbiddenNames[q.gen] || 0) + 1; }
        if (q.gen) st.byGen[q.gen] = (st.byGen[q.gen] || 0) + 1;
      }
    });
    want.sections.forEach(s => {
      if (!s.hardTail) return;
      const tail = p.items.filter(it => it.section === s.id).slice(-s.hardTail);
      tail.forEach(it => { st.tailSlots++; if (bandOf(it.q) !== 3) st.tailNotHard++; });
    });
    const minExam = want.sections.filter(s => s.kind === 'problem').reduce((a, s) => a + (s.minExam || 0), 0);
    if (p.items.filter(it => it.kind === 'problem' && it.q.exam === 'problem').length < minExam) st.examShort++;
    if (stretch > (CFG.MAX_STRETCH == null ? 1 : CFG.MAX_STRETCH)) st.stretchOver++;
    if (dup) st.dupPapers++;
  }
  return { st, want };
}

console.log(`mock-sim: ${NODES.length} live P3 nodes (${NODES.map(n => n.id).join(', ')}), seed ${SEED}`);
const bandNodes = {};
for (const n of NODES) for (const l of [1, 2, 3]) for (const pr of MQI.topics[n.id].pools[l]) {
  for (let k = 0; k < 3; k++) { const q = pr[0](); if (q && q.band >= 3) { bandNodes[n.id] = (bandNodes[n.id] || 0) + 1; break; } }
}
note(`nodes serving band-3 items on this tree: ${Object.keys(bandNodes).join(', ') || 'none'}`);

console.log(`\n=== Full paper x ${PAPERS} ===`);
{
  const { st, want } = simulate('full', PAPERS);
  gate(st.marksOk === PAPERS, `mark total always ${want.marks} (${st.marksOk}/${PAPERS})`);
  gate(st.itemsOk === PAPERS, `item count always ${want.items} (${st.itemsOk}/${PAPERS})`);
  gate(st.secOk === PAPERS, `section counts ${want.sections.map(s => s.id + ' ' + s.count).join(', ')} (${st.secOk}/${PAPERS})`);
  gate(st.shortPapers === 0, `no section ever comes up short (${st.shortPapers} papers short)`);
  console.log('  band share per section (band 3 / band 2 / untagged):');
  for (const s of want.sections) {
    const ps = st.perSec[s.id] || { n: 0, b3: 0, b2: 0, b0: 0 };
    console.log(`    ${s.id.padEnd(3)} ${s.kind.padEnd(8)} ${pct(ps.b3, ps.n).padStart(6)} / ${pct(ps.b2, ps.n).padStart(6)} / ${pct(ps.b0, ps.n).padStart(6)}  (${ps.n} slots)`);
  }
  gate(st.longNotHard === 0, `every long-problem (B3) slot is band 3 (${st.longSlots - st.longNotHard}/${st.longSlots})`);
  gate(st.longNotWorded === 0, `every long-problem slot is worded, >= ${CFG.PROBLEM_MIN_WORDS} words (${st.longNotWorded} bare)`);
  gate(st.examShort === 0, `every paper has at least its minExam q.exam problems in B3 (${PAPERS - st.examShort}/${PAPERS})`);
  console.log(`  share of B3 slots that are q.exam === 'problem': ${pct(st.longExam, st.longSlots)}`);
  const tailLine = `Booklet A hard tail is band 3: ${pct(st.tailSlots - st.tailNotHard, st.tailSlots)} of ${st.tailSlots} slots`;
  if (STRICT) gate(st.tailNotHard === 0, tailLine);
  else note(tailLine + (st.tailNotHard ? '  (degrades to band 2 while no node serves band-3 MCQs; gated under --strict on the merged tree)' : ''));
  gate(st.stretchOver === 0 && st.stretchA === 0, `stretch items <= ${CFG.MAX_STRETCH} per paper and never in Booklet A (${st.stretchOver} over, ${st.stretchA} in A)`);
  gate(st.forbidden === 0, `zero forbidden banks in the long problems (${st.forbidden}${st.forbidden ? ': ' + JSON.stringify(st.forbiddenNames) : ''})`);
  gate(st.dupPapers === 0, `zero duplicate items in a paper (${st.dupPapers} papers with a duplicate)`);
  const wOf = n => (Object.prototype.hasOwnProperty.call(CFG.WEIGHTS, n.id) ? CFG.WEIGHTS[n.id] : CFG.DEFAULT_WEIGHT);
  const wSum = NODES.reduce((a, n) => a + wOf(n), 0), total = PAPERS * want.items;
  console.log('  topic share vs weight table (items drawn / weight target; long-problem slots in brackets):');
  let worst = 0;
  for (const n of NODES.slice().sort((a, b) => wOf(b) - wOf(a))) {
    const got = (st.topic[n.id] || 0) / total, tgt = wOf(n) / wSum;
    worst = Math.max(worst, Math.abs(got - tgt));
    console.log(`    ${n.id.padEnd(11)} ${pct(got, 1).padStart(6)} vs ${pct(tgt, 1).padStart(6)}  [${st.longTopic[n.id] || 0} long]`);
  }
  note(`largest topic deviation from its weight target: ${(100 * worst).toFixed(1)} points (printed, not gated)`);
  const gens = Object.entries(st.byGen).sort((a, b) => b[1] - a[1]);
  note(`distinct generators seen in B3: ${gens.length}; top: ${gens.slice(0, 5).map(g => g[0] + ' ' + g[1]).join(', ')}`);
}

for (const v of ['quick', 'long']) {
  console.log(`\n=== ${CFG.FORMATS[v].label} x ${SIDE} ===`);
  const { st, want } = simulate(v, SIDE);
  gate(st.marksOk === SIDE && st.itemsOk === SIDE, `${want.marks} marks / ${want.items} items every time (${st.marksOk}, ${st.itemsOk} of ${SIDE})`);
  gate(st.secOk === SIDE, `section counts ${want.sections.map(s => s.id + ' ' + s.count).join(', ')} (${st.secOk}/${SIDE})`);
  gate(st.longNotHard === 0 && st.longNotWorded === 0, `every long problem band 3 and worded (${st.longNotHard} not hard, ${st.longNotWorded} bare)`);
  gate(st.stretchOver === 0 && st.stretchA === 0 && st.forbidden === 0 && st.dupPapers === 0,
       `stretch <= 1 never in A, zero forbidden banks, zero duplicates (${st.stretchOver}/${st.stretchA}/${st.forbidden}/${st.dupPapers})`);
  console.log(`  B3 exam share ${pct(st.longExam, st.longSlots)}; hard tail band 3 ${pct(st.tailSlots - st.tailNotHard, st.tailSlots)}`);
}

console.log(fails ? `\nMOCK-SIM FAILED - ${fails} gated line(s)` : `\nMOCK-SIM OK - ${PAPERS} Full, ${SIDE} Quick, ${SIDE} Long papers`);
process.exit(fails ? 1 : 0);
