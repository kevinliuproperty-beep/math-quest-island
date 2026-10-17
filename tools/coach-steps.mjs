/* COACHING STEP CHECK (Maths Coaching Card, 2026-10-17).
 *
 * A coached maths generator emits, on every draw:
 *   q.technique       one name from TECHNIQUES (the SG P3 heuristics vocabulary)
 *   q.steps           3-5 short think-aloud steps built from THAT draw's own numbers
 *   q.optionFeedback  optional, MCQ only: { <choice index>: 'coaching for that slip' }
 *
 * The rule this file enforces is the card's: "steps must reach the generated answer
 * when followed literally". Two halves, on at least 2,000 draws of every coached
 * generator:
 *   1. EVERY written equation in every step is TRUE. An equation is a run of numbers
 *      joined by + - × ÷ followed by "= number" ("3 × 45 = 135", "$80 − $36 = $44",
 *      "1/4 + 2/8 = 4/8"). It is re-computed here with exact fractions and the usual
 *      order of operations, never read back.
 *   2. The FINAL step carries the answer: its last <b>...</b> is the key, and the last
 *      equation in it re-computes to the key. A compound answer ("2 kg 350 g") is
 *      compared in its smaller unit (2350).
 * Plus the shape rules (3-5 non-empty steps, a technique from the list, optionFeedback
 * on a real distractor index) and the tone rule (no "wrong", "incorrect", "careless").
 *
 * Imported by tools/gen-sanity.mjs (it runs last there, so it never shifts the seeded
 * stream any earlier ruler reads). Also runnable alone for a fast loop while authoring:
 *     node tools/coach-steps.mjs            (COACH_DRAWS=<n> to change the 2,000)
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* The vocabulary (card "Maths technique vocabulary"), plus the two this lane added
   because none of the seven fits: "Sketch and label" (a perimeter/area figure: draw it,
   write every side on it) and "Draw a timeline" (start, finish and duration: the time
   topic's own parent tip already says "draw a timeline"). */
export const TECHNIQUES = ['Draw a model', 'Before and after', 'Work backwards', 'Make a list', 'Guess and check',
  'Units check', 'Read, compare, conclude', 'Sketch and label', 'Draw a timeline'];
export const COACH_DRAWS_MIN = 2000;

const gcdN = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
const R = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcdN(n, d); return [n / g, d / g]; };
const radd = (a, b) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const rsub = (a, b) => R(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const rmul = (a, b) => R(a[0] * b[0], a[1] * b[1]);
const rdiv = (a, b) => (b[0] === 0 ? null : R(a[0] * b[1], a[1] * b[0]));
const req = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

/* the plain text a child reads: a fraction span becomes n/d, tags and &nbsp; go */
export function plainStep(s) {
  return String(s)
    .replace(/<span class="frac"><span class="n">(\d+)<\/span><span class="d">(\d+)<\/span><\/span>/g, '$1/$2')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/* A number as written in a step: an optional $, digits, an optional /digits, then an
   optional unit word (stripped). A unit only counts when it is a whole word. */
const UNIT = '(?:\\s?(?:cm²|m²|cm|km|kg|ml|mm|min|ℓ|m|g|h|l|units?|gaps?)(?![A-Za-z²]))?';
const NUM = '\\$?\\d+(?:\\/\\d+)?' + UNIT;
const OP = '\\s*[+×÷−-]\\s*';
/* never start inside a clock time (9.45, 13:35) or after the hours of "1 h 25 min";
   never end on the hours of a clock time */
const EQ_RE = new RegExp('(?<![\\d/.:$])(?<!\\d h )(' + NUM + '(?:' + OP + NUM + ')+)\\s*=\\s*(' + NUM + ')(?![\\d/:]|\\.\\d|\\s?h \\d|\\s\\d+ min)', 'g');

/* Clock arithmetic, in minutes after midnight: "9.45 a.m. + 1 h 20 min = 11.05 a.m.",
   "15:40 − 25 min = 15:15", and the conversion "1 h 25 min = 85 min". */
const T12 = '(?:\\d{1,2}\\.\\d{2} [ap]\\.m\\.|12 noon)';
const T24 = '(?:\\d{2}:\\d{2})';
const TIME = '(?:' + T12 + '|' + T24 + ')';
const DUR = '(?:\\d+ h \\d+ min|\\d+ h|\\d+ min)';
const TEQ_RE = new RegExp('(' + TIME + ')\\s*([+−-])\\s*(' + DUR + ')\\s*=\\s*(' + TIME + ')', 'g');
/* minutes added up to an h-min duration: "40 min + 45 min = 1 h 25 min" */
const DSUM_RE = new RegExp('(?<![\\d/.:$])(?<!\\d h )(' + NUM + '(?:' + OP + NUM + ')+)\\s*=\\s*(\\d+ h \\d+ min|\\d+ h)(?![\\d])', 'g');
const DEQ_RE = new RegExp('(?<![\\d.:])(\\d+ h \\d+ min|\\d+ h)\\s*=\\s*(\\d+) min', 'g');
export function timeOf(s) {
  s = String(s).trim();
  if (/^12 noon/.test(s)) return 720;
  let m = s.match(/^(\d{1,2})\.(\d{2}) ([ap])\.m\./);
  if (m) return (Number(m[1]) % 12) * 60 + Number(m[2]) + (m[3] === 'p' ? 720 : 0);
  m = s.match(/^(\d{2}):(\d{2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}
export function durOf(s) {
  const m = String(s).trim().match(/^(?:(\d+) h)?\s*(?:(\d+) min)?$/);
  if (!m || (m[1] === undefined && m[2] === undefined)) return null;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}
const numOf = t => {
  const m = String(t).replace(/^\$/, '').match(/^(\d+)(?:\/(\d+))?/);
  return m ? R(Number(m[1]), m[2] ? Number(m[2]) : 1) : null;
};
function evalChain(src) {
  const toks = [...src.matchAll(new RegExp('(' + NUM + ')|([+×÷−-])', 'g'))].map(m => m[1] !== undefined ? numOf(m[1]) : m[2]);
  /* × and ÷ first, then + and − left to right */
  const vals = [toks[0]], ops = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i], v = toks[i + 1];
    if (op === '×' || op === '÷') {
      const r = op === '×' ? rmul(vals[vals.length - 1], v) : rdiv(vals[vals.length - 1], v);
      if (!r) return null;
      vals[vals.length - 1] = r;
    } else { ops.push(op); vals.push(v); }
  }
  let acc = vals[0];
  for (let i = 0; i < ops.length; i++) acc = ops[i] === '+' ? radd(acc, vals[i + 1]) : rsub(acc, vals[i + 1]);
  return acc;
}
export function equations(text) {
  const out = [];
  for (const m of text.matchAll(EQ_RE)) out.push({ at: m.index, src: m[0], lhs: evalChain(m[1]), rhs: numOf(m[2]) });
  for (const m of text.matchAll(TEQ_RE)) {
    const t = timeOf(m[1]), d = durOf(m[3]);
    out.push({ at: m.index, src: m[0], lhs: R(m[2] === '+' ? t + d : t - d), rhs: R(timeOf(m[4])) });
  }
  for (const m of text.matchAll(DSUM_RE)) out.push({ at: m.index, src: m[0], lhs: evalChain(m[1]), rhs: R(durOf(m[2])) });
  for (const m of text.matchAll(DEQ_RE)) out.push({ at: m.index, src: m[0], lhs: R(durOf(m[1])), rhs: R(Number(m[2])) });
  return out.sort((a, b) => a.at - b.at);
}

/* compound "2 kg 350 g" -> 2350 (the smaller unit), else the leading number */
const PAIRS = { km: 1000, kg: 1000, 'ℓ': 1000, l: 1000, m: 100 };
function valueOf(text) {
  const t = plainStep(text).replace(/\s+/g, ' ').trim();
  const c = t.match(/^(\d+) (km|kg|ℓ|l|m) (\d+) (m|g|ml|cm)$/);
  if (c) return R(Number(c[1]) * PAIRS[c[2]] + Number(c[3]));
  const tm = timeOf(t);
  if (tm !== null) return R(tm);
  if (/^\d+ h( \d+ min)?$/.test(t)) return R(durOf(t));
  return numOf(t.replace(/^\$\s*/, ''));
}
function keyOf(q) {
  if (q.typed) {
    if (Array.isArray(q.fracAnswer)) return R(q.fracAnswer[0], q.fracAnswer[1]);
    return Number.isInteger(q.answer) ? R(q.answer) : null;
  }
  return valueOf(q.answerText);
}
const TONE = /\b(wrong|incorrect|careless|silly|mistake)\b/i;

/* Run the check over GENS ({topic, name, fn}). Returns rows and a failure count. */
export function checkCoaching(GENS, draws) {
  const n = Math.max(COACH_DRAWS_MIN, draws || 0);
  const rows = [];
  let failures = 0;
  for (const g of GENS) {
    const first = g.fn();
    if (!first || (!first.technique && !first.steps)) continue;   /* not coached */
    const techs = new Map();
    let err = null, eqs = 0, finals = 0;
    for (let i = 0; i < n && !err; i++) {
      const q = i === 0 ? first : g.fn();
      const where = `draw ${i + 1}: ${plainStep(q.q).slice(0, 90)}`;
      if (TECHNIQUES.indexOf(q.technique) < 0) { err = `technique ${JSON.stringify(q.technique)} is not in the vocabulary (${where})`; break; }
      techs.set(q.technique, (techs.get(q.technique) || 0) + 1);
      const st = q.steps;
      if (!Array.isArray(st) || st.length < 3 || st.length > 5) { err = `steps must be 3-5 strings, saw ${Array.isArray(st) ? st.length : typeof st} (${where})`; break; }
      for (let k = 0; k < st.length && !err; k++) {
        if (typeof st[k] !== 'string' || !plainStep(st[k])) { err = `step ${k + 1} is empty (${where})`; break; }
        const p = plainStep(st[k]);
        if (p.length > 220) err = `step ${k + 1} is ${p.length} characters; a step is one short sentence or two (${where})`;
        else if (TONE.test(p)) err = `step ${k + 1} uses red-pen language: "${p}" (${where})`;
        else for (const e of equations(p)) {
          eqs++;
          if (!req(e.lhs, e.rhs)) { err = `step ${k + 1} writes "${e.src}", which is not true (${where})`; break; }
        }
      }
      if (err) break;
      const last = st[st.length - 1], key = keyOf(q);
      if (!key) { err = `the key ${JSON.stringify(q.answerText)} could not be read as a number (${where})`; break; }
      const bolds = [...last.matchAll(/<b>(.*?)<\/b>/g)];
      if (!bolds.length) { err = `the final step does not bold the answer (${where})`; break; }
      if (!req(valueOf(bolds[bolds.length - 1][1]), key)) { err = `the final step bolds "${plainStep(bolds[bolds.length - 1][1])}" but the key is "${plainStep(q.answerText)}" (${where})`; break; }
      const fe = equations(plainStep(last));
      if (!fe.length) { err = `the final step has no working to re-compute ("${plainStep(last)}") (${where})`; break; }
      if (!req(fe[fe.length - 1].rhs, key)) { err = `the final step's last working "${fe[fe.length - 1].src}" does not reach the key "${plainStep(q.answerText)}" (${where})`; break; }
      finals++;
      if (q.optionFeedback !== undefined) {
        if (q.typed) { err = `optionFeedback on a typed item (${where})`; break; }
        for (const [kk, v] of Object.entries(q.optionFeedback)) {
          const ix = Number(kk);
          if (!Number.isInteger(ix) || ix < 0 || ix >= q.choices.length || ix === q.correct) { err = `optionFeedback key ${kk} is not a distractor index (${where})`; break; }
          if (typeof v !== 'string' || !plainStep(v) || TONE.test(plainStep(v))) { err = `optionFeedback[${kk}] is empty or uses red-pen language (${where})`; break; }
        }
      }
    }
    if (err) failures++;
    rows.push({ topic: g.topic, name: g.name, ok: !err, err, techs: [...techs.keys()], eqs, finals, n });
  }
  return { rows, failures, draws: n };
}

export function printCoaching(res, log = console.log) {
  log('');
  log(`COACHING STEPS  (${res.rows.length} coached generators x ${res.draws} draws: every written equation re-computed, ` +
    `the final step reaches the key)`);
  const by = {};
  for (const r of res.rows) {
    if (!r.ok) log(`FAIL coach  ${r.topic}.${r.name}  ${r.err}`);
    else log(`  ok   ${r.topic}.${r.name}  [${r.techs.join(', ')}]  ${r.eqs} equations, ${r.finals}/${r.n} finals`);
    for (const t of r.techs) by[t] = (by[t] || 0) + 1;
  }
  log('  by technique: ' + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([t, k]) => `${t} ${k}`).join(' · '));
}

/* ---------- standalone: load the engine in a bare vm and run the check ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const ctx = { Math, console, Number, Array, Set, Map, JSON, String, Object, Boolean, Error, isNaN, parseInt, parseFloat };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  load('js/core.js'); load('js/figures.js');
  for (const f of fs.readdirSync(path.join(ROOT, 'js/topics')).filter(f => f.endsWith('.js')).sort()) load('js/topics/' + f);
  const GENS = [];
  for (const [tid, t] of Object.entries(ctx.MQI.topics)) {
    const seen = new Set();
    for (const lvl of [1, 2, 3]) for (const [fn] of t.pools[lvl]) {
      if (seen.has(fn.name)) continue; seen.add(fn.name);
      GENS.push({ topic: tid, name: fn.name, fn });
    }
  }
  const res = checkCoaching(GENS, Number(process.env.COACH_DRAWS) || COACH_DRAWS_MIN);
  printCoaching(res);
  if (res.failures) { console.error(`\n${res.failures} coaching failure(s).`); process.exit(1); }
}
