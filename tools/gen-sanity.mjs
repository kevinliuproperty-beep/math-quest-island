/* Deterministic sanity harness for Math Quest Island question generators.
 *
 * The repo ships no build/test tooling, so this is a zero-dependency Node
 * script (built-ins only). It extracts the pure-generator block from
 * index.html (everything between the GEN-START and GEN-END markers), runs it
 * in a DOM-less vm context, then samples every shipped generator N times and
 * INDEPENDENTLY re-derives the answer from the rendered question text. It does
 * not trust the generator's own answerText; it parses the question and checks
 * the flagged correct choice against a from-scratch oracle. This is the
 * generator-level check the adversarial certification pass builds on.
 *
 * Run:  node tools/gen-sanity.mjs
 * Exit: 0 if every generator passes, 1 on any failure.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const N = Number(process.env.SAMPLES) || 200; // samples per generator
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const a = html.indexOf('/* ================= GEN-START');
const b = html.indexOf('/* ================= GEN-END');
if (a < 0 || b < 0) { console.error('Could not find GEN-START/GEN-END markers'); process.exit(1); }
const genSrc = html.slice(a, b);

const ctx = { Math, console, Number, Array, Set, JSON, String };
vm.createContext(ctx);
vm.runInContext(genSrc, ctx, { filename: 'index.html#GEN' });

/* ---------- helpers ---------- */
const strip = s => String(s).replace(/<[^>]*>/g, '');
const near = (x, y) => Math.abs(x - y) < 1e-9;
// parse a fraction rendered by fr(n,d)
function parseFrac(html) {
  const m = html.match(/<span class="n">(\d+)<\/span><span class="d">(\d+)<\/span>/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}
// count decimal places in a numeric string like "3.47"
const dpOf = s => (s.split('.')[1] || '').length;
// exact decimal op via integer scaling
function decOp(aStr, op, bStr) {
  const dp = Math.max(dpOf(aStr), dpOf(bStr));
  const sc = Math.pow(10, dp);
  const ai = Math.round(parseFloat(aStr) * sc), bi = Math.round(parseFloat(bStr) * sc);
  return (op === '+' ? ai + bi : ai - bi) / sc;
}
// round half up, `to` decimal places
function roundHalfUp(val, to) {
  const f = Math.pow(10, to);
  return Math.round(val * f + 1e-9) / f; // +epsilon keeps exact .5 rounding up
}

/* ---------- shared shape checks for every question ---------- */
function checkShape(q) {
  if (!q || typeof q.q !== 'string' || !q.q.length) return 'empty question';
  if (typeof q.answerText !== 'string' || !q.answerText.length) return 'empty answerText';
  if (q.typed) {
    if (!Number.isFinite(q.answer)) return 'typed answer not finite';
    return null;
  }
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return 'expected 4 choices, got ' + (q.choices || []).length;
  if (!(q.correct >= 0 && q.correct < q.choices.length)) return 'correct index out of range: ' + q.correct;
  const plain = q.choices.map(strip);
  if (new Set(plain).size !== plain.length) return 'duplicate choices: ' + plain.join(' | ');
  if (strip(q.choices[q.correct]) !== strip(q.answerText)) return 'answerText != choices[correct]';
  return null;
}

/* ---------- per-shape independent oracle (dispatch on question text) ---------- */
function oracle(q) {
  const shape = checkShape(q);
  if (shape) return shape;
  const text = strip(q.q);
  const ans = parseFloat(strip(q.answerText));

  let m;
  // place value: "value of the digit D in N"
  if ((m = text.match(/value of the digit (\d+) in ([\d.]+)/))) {
    const d = m[1], num = m[2];
    const dec = num.split('.')[1] || '';
    const idx = dec.indexOf(d);
    if (idx < 0) return 'place-value digit not found in decimal part: ' + num;
    const place = idx + 1;
    const expect = Number(d) / Math.pow(10, place);
    return near(expect, ans) ? null : `place value: expected ${expect}, got ${ans} (${num}, digit ${d})`;
  }
  // compare: "Which decimal is the greatest/smallest?"
  if ((m = text.match(/Which decimal is the (greatest|smallest)/))) {
    const vals = q.choices.map(c => parseFloat(strip(c)));
    const expect = m[1] === 'greatest' ? Math.max(...vals) : Math.min(...vals);
    return near(expect, ans) && near(vals[q.correct], expect)
      ? null : `compare(${m[1]}): expected ${expect}, flagged ${vals[q.correct]}`;
  }
  // rounding: "Round X to the nearest whole number|1 decimal place."
  if ((m = text.match(/Round ([\d.]+) to the (nearest whole number|1 decimal place)/))) {
    const val = parseFloat(m[1]);
    const to = m[2] === '1 decimal place' ? 1 : 0;
    const expect = roundHalfUp(val, to);
    return near(expect, ans) ? null : `round(${val}, ${to}dp): expected ${expect}, got ${ans}`;
  }
  // fraction -> decimal: "Write n/d as a decimal."
  if (/Write .* as a decimal/.test(text)) {
    const fr = parseFrac(q.q);
    if (!fr) return 'could not parse fraction in: ' + q.q;
    const expect = fr[0] / fr[1];
    return near(expect, ans) ? null : `frac->dec: expected ${expect} for ${fr[0]}/${fr[1]}, got ${ans}`;
  }
  // add / subtract: "A + B = ?" or "A − B = ?"
  if ((m = text.match(/([\d.]+)\s*([+−])\s*([\d.]+)\s*=\s*\?/))) {
    const expect = decOp(m[1], m[2] === '−' ? '-' : '+', m[3]);
    return near(expect, ans) ? null : `addsub: ${m[1]} ${m[2]} ${m[3]} expected ${expect}, got ${ans}`;
  }
  return 'no oracle matched question: ' + text;
}

/* ---------- run ---------- */
// Every shipped decimals generator path (the wrappers the pools reference).
const GENS = [
  'gDecPV1', 'gDecPV2', 'gDecPV3',
  'gDecCmp1', 'gDecCmp2',
  'gDecRoundWhole', 'gDecRound1',
  'gFracToDec10', 'gFracToDec100',
  'gDecAdd1', 'gDecAdd2', 'gDecSub1', 'gDecSub2',
];

let failures = 0;
for (const name of GENS) {
  const fn = ctx[name];
  if (typeof fn !== 'function') { console.error(`MISSING generator: ${name}`); failures++; continue; }
  let bad = null, badQ = null;
  for (let i = 0; i < N; i++) {
    const q = fn();
    const err = oracle(q);
    if (err) { bad = err; badQ = q; break; }
  }
  if (bad) {
    failures++;
    console.error(`FAIL ${name}: ${bad}`);
    console.error('   sample:', JSON.stringify({ q: strip(badQ.q), choices: (badQ.choices || []).map(strip), correct: badQ.correct, answerText: strip(badQ.answerText) }));
  } else {
    console.log(`ok   ${name}  (${N}/${N})`);
  }
}

/* Wiring + regression smoke: buildSetFor must produce full, valid, unique sets
 * for every topic (catches registry breakage and pool-variety exhaustion). */
const TOPIC_IDS = ['p2', 'fractions', 'tables', 'geometry', 'heuristics', 'decimals'];
for (const t of TOPIC_IDS) {
  const set = ctx.buildSetFor(t, 30);
  for (const lvl of [1, 2, 3]) {
    if (!set[lvl] || set[lvl].length < 30) { failures++; console.error(`FAIL buildSetFor(${t}) level ${lvl}: only ${set[lvl] ? set[lvl].length : 0}/30`); continue; }
    // decimals questions must also pass the oracle end-to-end
    if (t === 'decimals') {
      for (const q of set[lvl]) { const e = oracle(q); if (e) { failures++; console.error(`FAIL decimals set L${lvl}: ${e}`); break; } }
    }
  }
  console.log(`ok   buildSetFor(${t})  30 x3 levels`);
}

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll generators passed (${N} samples each).`);
