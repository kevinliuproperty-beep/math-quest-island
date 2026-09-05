/* Deterministic sanity harness for Math Quest Island question generators.
 *
 * Post-split version. The app is zero-build static JS, so this is a
 * zero-dependency Node script (built-ins only). It loads js/core.js (the pure,
 * DOM-free generator kit + registries) and every js/topics/*.js into a bare vm
 * context with no browser globals, then for each registered generator:
 *
 *   1. samples it N times (env SAMPLES, default 200),
 *   2. checks the shape (4 distinct choices, correct index in range,
 *      answerText === choices[correct], typed answers finite),
 *   3. checks integrity (no NaN / undefined / null / Infinity anywhere in the
 *      rendered strings, numeric choices finite and positive integers),
 *   4. INDEPENDENTLY re-derives the answer from the rendered question text
 *      wherever an oracle matches - it never trusts the generator's own
 *      answerText,
 *   5. counts distinct question texts to catch a collapsed sample space.
 *
 * It then runs buildSetFor() for every registered topic and asserts full,
 * unique, valid sets at all three difficulty pools.
 *
 * Run:  node tools/gen-sanity.mjs      (or: npm test)
 * Exit: 0 if every generator passes, 1 on any failure.
 *
 * ORACLE COVERAGE is reported per generator. A sample with no matching oracle
 * is a WARN, not a failure: it still passed shape + integrity, but its answer
 * key was not independently re-derived. Content lanes must not ship a new
 * generator whose oracle coverage is 0% - add the oracle here in the same
 * sitting (see js/topics/README.md).
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const N = Number(process.env.SAMPLES) || 200;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- load the pure layer in a DOM-less vm ---------- */
const ctx = { Math, console, Number, Array, Set, Map, JSON, String, Object, Boolean, Error, isNaN, parseInt, parseFloat };
ctx.globalThis = ctx;
vm.createContext(ctx);

const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
load('js/core.js');
const topicFiles = fs.readdirSync(path.join(ROOT, 'js/topics')).filter(f => f.endsWith('.js')).sort();
for (const f of topicFiles) load('js/topics/' + f);

const MQI = ctx.MQI;
const TOPICS = MQI.topics;

/* ---------- helpers ---------- */
const strip = s => String(s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const near = (x, y) => Math.abs(x - y) < 1e-9;
const parseFrac = html => {
  const m = String(html).match(/<span class="n">(\d+)<\/span><span class="d">(\d+)<\/span>/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
const allFracs = html => [...String(html).matchAll(/<span class="n">(\d+)<\/span><span class="d">(\d+)<\/span>/g)]
  .map(m => [Number(m[1]), Number(m[2])]);
const gcd = (a, b) => { while (b) { [a, b] = [b, a % b]; } return a; };

/* Independent re-evaluator for the P5 order-of-operations / brackets stems.
   Space-separated tokens only: numbers, + - x /, and ( ). Deliberately NOT eval:
   it re-applies the precedence rule the question is testing. Returns null if the
   expression is not in that shape. */
function evalExpr(src) {
  const toks = String(src).trim().split(/\s+/);
  if (!toks.length) return null;
  if (!toks.every(t => /^(\d+|[+\-x/()])$/.test(t))) return null;
  const flat = list => {
    if (!list.length || list.length % 2 === 0) return null;
    let vals = [Number(list[0])], ops = [];
    for (let i = 1; i < list.length; i += 2) {
      const op = list[i], v = Number(list[i + 1]);
      if (!Number.isFinite(v)) return null;
      if (op === 'x') vals[vals.length - 1] *= v;
      else if (op === '/') vals[vals.length - 1] /= v;
      else if (op === '+' || op === '-') { ops.push(op); vals.push(v); }
      else return null;
    }
    let acc = vals[0];
    for (let i = 0; i < ops.length; i++) acc = ops[i] === '+' ? acc + vals[i + 1] : acc - vals[i + 1];
    return acc;
  };
  let work = toks.slice(), guard = 0;
  while (work.includes('(')) {
    if (++guard > 20) return null;
    const close = work.indexOf(')');
    if (close < 0) return null;
    const open = work.lastIndexOf('(', close);
    if (open < 0) return null;
    const inner = flat(work.slice(open + 1, close));
    if (inner === null || !Number.isFinite(inner)) return null;
    work = work.slice(0, open).concat([String(inner)], work.slice(close + 1));
  }
  if (work.includes(')')) return null;
  const out = flat(work);
  return Number.isFinite(out) ? out : null;
}

/* A question's identity is its stem PLUS its rendered extra PLUS its options:
   several generators keep a fixed stem ("Which fraction is the greatest?") and
   vary only the choices, and buildSetFor's own dedup key is the raw HTML. */
const qKey = q => strip(q.q) + '|' + String(q.extra || '') + '|' +
  (q.typed ? String(q.answer) : (q.choices || []).map(strip).join(','));

/* ---------- shape + integrity, applied to every sample ---------- */
const BAD = /\b(NaN|undefined|null|Infinity)\b/;
function checkShape(q) {
  if (!q || typeof q.q !== 'string' || !q.q.length) return 'empty question';
  if (typeof q.answerText !== 'string' || !q.answerText.length) return 'empty answerText';
  for (const [k, v] of Object.entries({ q: q.q, extra: q.extra || '', explain: q.explain || '', answerText: q.answerText })) {
    if (BAD.test(String(v))) return `NaN/undefined leaked into ${k}: ${strip(v)}`;
  }
  if (q.typed) {
    if (!Number.isFinite(q.answer)) return 'typed answer not finite';
    if (q.correct !== -1) return 'typed question must carry correct:-1';
    return null;
  }
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return 'expected 4 choices, got ' + (q.choices || []).length;
  if (!(q.correct >= 0 && q.correct < q.choices.length)) return 'correct index out of range: ' + q.correct;
  const plain = q.choices.map(strip);
  if (plain.some(p => !p.length)) return 'blank choice';
  if (plain.some(p => BAD.test(p))) return 'NaN/undefined in a choice: ' + plain.join(' | ');
  if (new Set(plain).size !== plain.length) return 'duplicate choices: ' + plain.join(' | ');
  if (strip(q.choices[q.correct]) !== strip(q.answerText)) return 'answerText != choices[correct]';
  /* Distractor-identity contract (P3 refutation 2026-09-05): a generator that sets
     q.authored asserts that EVERY authored distractor differs from the answer and
     that no shipped option was silently padded in by finishNum. */
  if (Array.isArray(q.authored)) {
    const ans = parseFloat(strip(q.answerText));
    if (q.authored.some(c => near(c, ans))) return 'authored distractor identical to the answer: ' + q.authored.join(',');
    const allowed = new Set(q.authored.map(Number));
    for (let i = 0; i < q.choices.length; i++) {
      if (i === q.correct) continue;
      const v = parseFloat(strip(q.choices[i]));
      if (!allowed.has(v)) return 'padded distractor shipped (' + v + '); authored: ' + q.authored.join(',');
    }
  }
  // numeric choices must be finite and positive (no negative or absurd distractors)
  for (const p of plain) {
    const n = parseFloat(p);
    if (!Number.isNaN(n) && !/^\d+\/\d+$/.test(p)) {
      if (!Number.isFinite(n)) return 'non-finite numeric choice: ' + p;
      if (n < 0) return 'negative choice offered: ' + p;
    }
  }
  return null;
}

/* ---------- independent oracles, dispatched on the rendered question ---------- */
/* Return: null = verified, string = failure, false = no oracle matched. */
function oracle(q) {
  const text = strip(q.q);
  const extra = strip(q.extra || '');
  const ansNum = parseFloat(strip(q.answerText));
  const ansFrac = parseFrac(q.answerText);
  let m;

  /* --- typed (Puzzle Caves) --- */
  if (q.typed) {
    if ((m = text.match(/What comes next\? *([\d,\s]+), \?/))) {
      const t = m[1].split(',').map(s => Number(s.trim())).filter(Number.isFinite);
      const d = t[1] - t[0];
      const arith = t.every((v, i) => i === 0 || v - t[i - 1] === d);
      if (arith) return near(t[t.length - 1] + d, q.answer) ? null : `pattern: expected ${t[t.length - 1] + d}, got ${q.answer}`;
      const r = t[1] / t[0];
      const geo = t.every((v, i) => i === 0 || near(v / t[i - 1], r));
      if (geo) return near(t[t.length - 1] * r, q.answer) ? null : `pattern(geo): expected ${t[t.length - 1] * r}, got ${q.answer}`;
      return 'pattern: sequence is neither arithmetic nor geometric: ' + t.join(',');
    }
    if ((m = text.match(/multiply by (\d+), then add (\d+), and get (\d+)/))) {
      const e = (Number(m[3]) - Number(m[2])) / Number(m[1]);
      return near(e, q.answer) ? null : `backwards2: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/I add (\d+) and get (\d+)/))) {
      const e = Number(m[2]) - Number(m[1]);
      return near(e, q.answer) ? null : `backwards+: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/I subtract (\d+) and get (\d+)/))) {
      const e = Number(m[2]) + Number(m[1]);
      return near(e, q.answer) ? null : `backwards-: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/gave away (\d+), then got (\d+) more\. Now she has (\d+)/))) {
      const e = Number(m[3]) + Number(m[1]) - Number(m[2]);
      return near(e, q.answer) ? null : `give/take: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/There are (\d+) heads and (\d+) legs\. How many goats/))) {
      const heads = Number(m[1]), legs = Number(m[2]), e = (legs - 2 * heads) / 2;
      if (!Number.isInteger(e) || e < 0 || e > heads) return `heads/legs: impossible puzzle ${heads}h ${legs}l`;
      return near(e, q.answer) ? null : `heads/legs: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) \+ \? = (\d+)$/))) {
      const e = Number(m[2]) - Number(m[1]);
      return near(e, q.answer) ? null : `missing addend: expected ${e}, got ${q.answer}`;
    }

    /* --- P3 pilot: division with remainder + 3-digit-by-1-digit algorithms --- */
    if ((m = text.match(/packs (\d+) [^.]*into (\d+) boxes[^.]*\. How many are left over\?/))) {
      const e = Number(m[1]) % Number(m[2]);
      return near(e, q.answer) ? null : `left over: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/packs (\d+) [^.]*into boxes of (\d+)\. How many boxes are needed/))) {
      const e = Math.ceil(Number(m[1]) / Number(m[2]));
      return near(e, q.answer) ? null : `boxes needed: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/How many groups of (\d+) can be made from (\d+)\?/))) {
      const e = Math.floor(Number(m[2]) / Number(m[1]));
      return near(e, q.answer) ? null : `groups of: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) x (\d+) = \?$/))) {
      const e = Number(m[1]) * Number(m[2]);
      return near(e, q.answer) ? null : `typed mul: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) \/ (\d+) = \?$/))) {
      const e = Number(m[1]) / Number(m[2]);
      return near(e, q.answer) ? null : `typed div: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/buys (\d+) trays of eggs[^.]*\. Each tray holds (\d+) eggs\. (\d+) eggs crack/))) {
      const e = Number(m[1]) * Number(m[2]) - Number(m[3]);
      return near(e, q.answer) ? null : `eggs two-step: expected ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: order of operations and brackets (expression re-parsed) --- */
    if ((m = text.match(/^Work out: (.+) = \?$/))) {
      const e = evalExpr(m[1]);
      if (e === null) return 'order of ops: could not parse "' + m[1] + '"';
      return near(e, q.answer) ? null : `order of ops: ${m[1]} = ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: whole numbers, x / by 10, 100, 1000 and their multiples --- */
    if ((m = text.match(/orders (\d+) packets of kaya toast[^.]*\. Each packet costs (\d+) cents/))) {
      const e = Number(m[1]) * Number(m[2]);
      return near(e, q.answer) ? null : `kaya toast: expected ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: percentage --- */
    if ((m = text.match(/There are (\d+) [^.]*\. (\d+) of them wear spectacles/))) {
      const e = Number(m[2]) * 100 / Number(m[1]);
      return near(e, q.answer) ? null : `part as %: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/saves (\d+)% of the \$(\d+) collected/))) {
      const e = Number(m[1]) * Number(m[2]) / 100;
      return near(e, q.answer) ? null : `% of money: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/before GST is \$(\d+)\. GST is (\d+)%/))) {
      const p = Number(m[1]);
      const e = p + p * Number(m[2]) / 100;
      return near(e, q.answer) ? null : `GST: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/puts \$(\d+) into a POSB account that pays (\d+)% interest/))) {
      const e = Number(m[1]) * Number(m[2]) / 100;
      return near(e, q.answer) ? null : `interest: expected ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: area of triangle --- */
    if ((m = text.match(/base of (\d+) cm and a height of (\d+) cm\. What is its area/))) {
      const e = Number(m[1]) * Number(m[2]) / 2;
      return near(e, q.answer) ? null : `triangle area: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/area of (\d+) cm² and a height of (\d+) cm\. What is the length of its base/))) {
      const e = 2 * Number(m[1]) / Number(m[2]);
      return near(e, q.answer) ? null : `triangle base: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/area of (\d+) cm² and a base of (\d+) cm\. What is its height/))) {
      const e = 2 * Number(m[1]) / Number(m[2]);
      return near(e, q.answer) ? null : `triangle height: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/rectangle (\d+) cm by (\d+) cm with a triangle of base (\d+) cm and height (\d+) cm/))) {
      const e = Number(m[1]) * Number(m[2]) + Number(m[3]) * Number(m[4]) / 2;
      return near(e, q.answer) ? null : `composite area: expected ${e}, got ${q.answer}`;
    }

    /* --- P5 lane: volume of cube and cuboid --- */
    if ((m = text.match(/builds a solid (\d+) cubes long, (\d+) cubes wide and (\d+) cubes high/))) {
      const e = Number(m[1]) * Number(m[2]) * Number(m[3]);
      return near(e, q.answer) ? null : `unit cubes: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/^(\d+) ℓ (\d+) ml of barley water/))) {
      const e = Number(m[1]) * 1000 + Number(m[2]);
      return near(e, q.answer) ? null : `litres to cm³: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/base (\d+) cm by (\d+) cm\. Water is poured in to a depth of (\d+) cm/))) {
      const e = Number(m[1]) * Number(m[2]) * Number(m[3]);
      return near(e, q.answer) ? null : `tank volume: expected ${e}, got ${q.answer}`;
    }
    if ((m = text.match(/base (\d+) cm by (\d+) cm to a depth of (\d+) cm/))) {
      const e = Number(m[1]) * Number(m[2]) * Number(m[3]);
      return near(e, q.answer) ? null : `tank ml: expected ${e}, got ${q.answer}`;
    }

    /* --- P3 pilot: money in decimal notation (all amounts read off the stem) --- */
    if (/\$\d/.test(text)) {
      const amts = [...text.matchAll(/\$(\d+\.\d{2})/g)].map(x => Math.round(parseFloat(x[1]) * 100));
      if (amts.length >= 2) {
        const sum = arr => arr.reduce((s, v) => s + v, 0);
        let cents = null;
        if (/change should/.test(text)) cents = amts[amts.length - 1] - sum(amts.slice(0, -1));
        else if (/in total/.test(text)) cents = sum(amts);
        else if (/money is left/.test(text)) cents = amts[0] - sum(amts.slice(1));
        if (cents !== null) {
          const e = Number((cents / 100).toFixed(2));
          return near(e, q.answer) ? null : `money: expected ${e}, got ${q.answer}`;
        }
      }
    }
    return false;
  }

  /* --- P4 lane: whole numbers up to 100 000 (spaced numerals: "47 253") ---
     These sit ABOVE the P3 branches on purpose: the P3 stems are the same shape
     with an unspaced numeral, and a looser branch that matched first would
     report a content bug that is not there (P3 pilot rubric lesson 2). */
  const unsp = s => Number(String(s).replace(/[ ,]/g, ''));
  const chNums = qq => (qq.choices || []).map(c => unsp(String(c)));
  if ((m = text.match(/^In (\d[\d ]*), the digit (\d) stands for how much\?$/))) {
    const s = m[1].replace(/ /g, ''), idx = s.indexOf(m[2]);
    if (idx < 0) return 'p4 stands-for: digit is not in the number ' + s;
    if (s.split(m[2]).length > 2) return 'p4 stands-for: digit appears twice, question is ambiguous';
    const e = Number(m[2]) * Math.pow(10, s.length - 1 - idx);
    return near(e, ansNum) ? null : `p4 stands for: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which digit is in the (ten thousands|thousands|hundreds|tens|ones) place of (\d[\d ]*)\?$/))) {
    const s = m[2].replace(/ /g, '');
    const pos = { 'ten thousands': 10000, thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[m[1]];
    if (Number(s) < pos) return 'p4 which-digit: number is too small for the ' + m[1] + ' place';
    const e = Math.floor(Number(s) / pos) % 10;
    return near(e, ansNum) ? null : `p4 which digit: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Round (\d[\d ]*) to the nearest (10|100|1000)\.$/))) {
    const n = unsp(m[1]), u = Number(m[2]);
    const e = Math.floor(n / u + 0.5) * u;                 /* halfway rounds up, MOE convention */
    return near(e, ansNum) ? null : `p4 round ${n} to ${u}: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^What number continues the pattern\? (.+), \?$/))) {
    const t = m[1].split(',').map(unsp).filter(Number.isFinite);
    if (t.length < 3) return 'p4 pattern: could not read the sequence';
    const d = t[1] - t[0];
    if (!t.every((v, i) => i === 0 || v - t[i - 1] === d)) return 'p4 pattern: not an arithmetic sequence: ' + t.join(',');
    const e = t[t.length - 1] + d;
    return near(e, ansNum) ? null : `p4 pattern: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which of these is the (greatest|smallest) number\?$/))) {
    const ns = chNums(q);
    if (ns.length !== 4 || ns.some(x => !Number.isFinite(x))) return 'p4 compare: choices are not four numbers';
    const e = m[1] === 'greatest' ? Math.max.apply(null, ns) : Math.min.apply(null, ns);
    return near(e, ansNum) ? null : `p4 ${m[1]}: expected ${e}, got ${ansNum}`;
  }

  /* --- P4 lane: factors and multiples --- */
  if ((m = text.match(/^Which of these is a factor of (\d+)\?$/))) {
    const n = Number(m[1]), hits = chNums(q).filter(c => c > 0 && n % c === 0);
    if (hits.length !== 1) return `p4 factor: ${hits.length} of the choices divide ${n}, question is ambiguous`;
    return near(hits[0], ansNum) ? null : `p4 factor of ${n}: expected ${hits[0]}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which of these is a common factor of (\d+) and (\d+)\?$/))) {
    const a = Number(m[1]), b = Number(m[2]);
    const hits = chNums(q).filter(c => c > 0 && a % c === 0 && b % c === 0);
    if (hits.length !== 1) return `p4 common factor: ${hits.length} of the choices divide both ${a} and ${b}`;
    return near(hits[0], ansNum) ? null : `p4 common factor: expected ${hits[0]}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which of these is a multiple of (\d+)\?$/))) {
    const d = Number(m[1]), hits = chNums(q).filter(c => c > 0 && c % d === 0);
    if (hits.length !== 1) return `p4 multiple: ${hits.length} of the choices are multiples of ${d}`;
    return near(hits[0], ansNum) ? null : `p4 multiple of ${d}: expected ${hits[0]}, got ${ansNum}`;
  }
  if ((m = text.match(/^What is the (\d)(?:st|nd|rd|th) multiple of (\d+)\?$/))) {
    const e = Number(m[1]) * Number(m[2]);
    return near(e, ansNum) ? null : `p4 nth multiple: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^What is the smallest number that is a multiple of both (\d+) and (\d+)\?$/))) {
    const a = Number(m[1]), b = Number(m[2]);
    let e = a; while (e % b !== 0) e += a;
    return near(e, ansNum) ? null : `p4 common multiple of ${a},${b}: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^How many factors does (\d+) have\?$/))) {
    const n = Number(m[1]); let c = 0;
    for (let i = 1; i <= n; i++) if (n % i === 0) c++;
    return near(c, ansNum) ? null : `p4 factor count of ${n}: expected ${c}, got ${ansNum}`;
  }

  /* --- P3 pilot: whole numbers up to 10 000 --- */
  if ((m = text.match(/^In (\d+), the digit (\d+) stands for how much\?$/))) {
    const s = m[1], idx = s.indexOf(m[2]);
    if (idx < 0) return 'stands-for: digit is not in the number ' + s;
    if (s.split(m[2]).length > 2) return 'stands-for: digit appears twice, question is ambiguous';
    const e = Number(m[2]) * Math.pow(10, s.length - 1 - idx);
    return near(e, ansNum) ? null : `stands for: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which digit is in the (thousands|hundreds|tens|ones) place of (\d+)\?$/))) {
    const s = m[2];
    if (s.length !== 4) return 'which-digit: expected a 4-digit number, got ' + s;
    const e = Number(s[{ thousands: 0, hundreds: 1, tens: 2, ones: 3 }[m[1]]]);
    return near(e, ansNum) ? null : `which digit: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^Which number has (\d+) thousands?, (\d+) hundreds?, (\d+) tens? and (\d+) ones?\?$/))) {
    const e = Number(m[1]) * 1000 + Number(m[2]) * 100 + Number(m[3]) * 10 + Number(m[4]);
    return near(e, ansNum) ? null : `build number: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^What number is (\d+) (more|less) than (\d+)\?$/))) {
    const e = m[2] === 'more' ? Number(m[3]) + Number(m[1]) : Number(m[3]) - Number(m[1]);
    return near(e, ansNum) ? null : `more/less: expected ${e}, got ${ansNum}`;
  }

  /* --- P3 pilot: compound units (km/m, m/cm, kg/g, litre/ml) --- */
  const UF = { km: 1000, m: 100, kg: 1000, 'ℓ': 1000 };
  if ((m = text.match(/^(\d+) (km|m|kg|ℓ) (\d+) (m|cm|g|ml) = \?$/))) {
    const e = Number(m[1]) * UF[m[2]] + Number(m[3]);
    return near(e, ansNum) ? null : `compound -> small: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^(\d+) (m|cm|g|ml) = (\d+) (km|m|kg|ℓ) \? (m|cm|g|ml)$/))) {
    const e = Number(m[1]) - Number(m[3]) * UF[m[4]];
    return near(e, ansNum) ? null : `small -> compound (small part): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^(\d+) (m|cm|g|ml) = \? (km|m|kg|ℓ) (\d+) (m|cm|g|ml)$/))) {
    const e = (Number(m[1]) - Number(m[4])) / UF[m[3]];
    return near(e, ansNum) ? null : `small -> compound (big part): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/holding (\d+) (km|m|kg|ℓ) (\d+) (m|cm|g|ml) [^.]*?(?:drinks|cooks) (\d+) (m|cm|g|ml)\. How much is left/))) {
    const e = Number(m[1]) * UF[m[2]] + Number(m[3]) - Number(m[5]);
    return near(e, ansNum) ? null : `compound word (left): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/(?:measures|weighs) (\d+) (km|m|kg|ℓ) (\d+) (m|cm|g|ml) and .*?(?:measures|weighs) (\d+) (km|m|kg|ℓ) (\d+) (m|cm|g|ml)\. How much (?:heavier|longer)/))) {
    const e = (Number(m[1]) * UF[m[2]] + Number(m[3])) - (Number(m[5]) * UF[m[6]] + Number(m[7]));
    return near(e, ansNum) ? null : `compound word (compare): expected ${e}, got ${ansNum}`;
  }

  /* --- P3 pilot: bar graphs. RENDERED SURFACE ONLY: every value is read off the
     bar's own printed number label and cross-checked against the printed axis
     ticks, exactly as a child reads it. No data-* attribute exists any more. --- */
  if (/class="bargraph"/.test(String(q.extra))) {
    const raw = String(q.extra);
    const cap = extra.match(/Each unit along the bottom of the graph stands for (\d+) /);
    if (!cap) return 'bar graph: no scale caption printed under the graph';
    const scale = Number(cap[1]);
    const ticks = [...raw.matchAll(/<span class="bg-tick"[^>]*>(\d+)<\/span>/g)].map(t => Number(t[1]));
    if (ticks.length < 3) return 'bar graph: value axis has fewer than 3 printed ticks';
    if (ticks[0] !== 0) return 'bar graph: axis does not start at 0, got ' + ticks[0];
    for (let i = 1; i < ticks.length; i++) {
      if (ticks[i] - ticks[i - 1] !== scale) return `bar graph: tick step ${ticks[i] - ticks[i - 1]} != scale ${scale}`;
    }
    const bars = {};
    for (const b of raw.matchAll(/<span class="bg-cat"[^>]*>([^<]+)<\/span><span class="bg-bar"[^>]*><\/span><span class="bg-val"[^>]*>(\d+)<\/span>/g)) {
      bars[b[1]] = Number(b[2]);
    }
    const names = Object.keys(bars);
    if (names.length < 4) return 'bar graph: fewer than 4 labelled bars rendered';
    for (const c of names) {
      if (!ticks.includes(bars[c])) return `bar graph: bar "${c}" prints ${bars[c]}, which is not on the axis`;
    }
    const val = c => (c in bars ? bars[c] : null);
    if ((m = text.match(/does the graph show for (.+)\?$/))) {
      const e = val(m[1]);
      if (e === null) return 'bar graph: category "' + m[1] + '" is not on the graph';
      return near(e, ansNum) ? null : `bar read: expected ${e}, got ${ansNum}`;
    }
    if ((m = text.match(/are shown for (.+) than for (.+)\?$/))) {
      const a = val(m[1]), b = val(m[2]);
      if (a === null || b === null) return 'bar graph: compared category is not on the graph';
      return near(a - b, ansNum) ? null : `bar diff: expected ${a - b}, got ${ansNum}`;
    }
    if ((m = text.match(/are shown for (.+) and (.+) altogether\?$/))) {
      const a = val(m[1]), b = val(m[2]);
      if (a === null || b === null) return 'bar graph: summed category is not on the graph';
      return near(a + b, ansNum) ? null : `bar total: expected ${a + b}, got ${ansNum}`;
    }
    return 'bar graph: rendered a graph but no oracle matched the stem';
  }

  /* --- fraction arithmetic (rendered via fr(), so read the markup) --- */
  if (/[+] *\? *= *1|\+ \? = 1/.test(strip(q.q).replace(/\s+/g, ' ')) || /\+ \? &nbsp; What is the missing/.test(q.q)) {
    const f = parseFrac(q.q);
    if (f && ansFrac) {
      const ok = near(f[0] / f[1] + ansFrac[0] / ansFrac[1], 1);
      return ok ? null : `make-one: ${f[0]}/${f[1]} + ${ansFrac[0]}/${ansFrac[1]} != 1`;
    }
  }
  if (/^1 [−-]/.test(text)) {
    const f = parseFrac(q.q);
    if (f && ansFrac) {
      const ok = near(1 - f[0] / f[1], ansFrac[0] / ansFrac[1]);
      return ok ? null : `1 - ${f[0]}/${f[1]} != ${ansFrac[0]}/${ansFrac[1]}`;
    }
  }
  if (/= \?$/.test(text) && allFracs(q.q).length === 2) {
    const [a, b] = allFracs(q.q);
    const op = /[−-]/.test(text) ? '-' : '+';
    if (ansFrac) {
      const e = op === '+' ? a[0] / a[1] + b[0] / b[1] : a[0] / a[1] - b[0] / b[1];
      const got = ansFrac[0] / ansFrac[1];
      return near(e, got) ? null : `frac ${op}: expected ${e}, got ${got}`;
    }
  }
  if (/missing numerator/i.test(text)) {
    const from = parseFrac(q.q);
    const to = q.q.match(/<span class="n">\?<\/span><span class="d">(\d+)<\/span>/);
    if (from && to) {
      const e = from[0] * (Number(to[1]) / from[1]);
      return near(e, ansNum) ? null : `missing numerator: expected ${e} for ${from[0]}/${from[1]} -> ?/${to[1]}, got ${ansNum}`;
    }
  }
  if (/missing denominator/i.test(text)) {
    const from = parseFrac(q.q);
    const to = q.q.match(/<span class="n">(\d+)<\/span><span class="d">\?<\/span>/);
    if (from && to) {
      const e = from[1] * (Number(to[1]) / from[0]);
      return near(e, ansNum) ? null : `missing denominator: expected ${e}, got ${ansNum}`;
    }
  }
  if (/equivalent to/.test(text)) {
    const f = parseFrac(q.q);
    if (f && ansFrac) {
      const ok = f[0] * ansFrac[1] === ansFrac[0] * f[1];
      if (!ok) return `equivalent: ${ansFrac[0]}/${ansFrac[1]} not equivalent to ${f[0]}/${f[1]}`;
      // and no distractor may also be equivalent
      const dupes = q.choices.filter((c, i) => { const g = parseFrac(c); return i !== q.correct && g && g[0] * f[1] === f[0] * g[1]; });
      return dupes.length ? 'equivalent: a distractor is also equivalent' : null;
    }
  }
  if (/simplest form|in its simplest/i.test(text)) {
    const f = parseFrac(q.q);
    if (f && ansFrac) {
      const g = gcd(f[0], f[1]);
      const e = [f[0] / g, f[1] / g];
      return (ansFrac[0] === e[0] && ansFrac[1] === e[1]) ? null
        : `simplest: expected ${e[0]}/${e[1]}, got ${ansFrac[0]}/${ansFrac[1]}`;
    }
  }
  if (/greatest|largest|biggest|smallest/i.test(text)) {
    const vals = q.choices.map(c => { const f = parseFrac(c); return f ? f[0] / f[1] : parseFloat(strip(c)); });
    if (vals.every(Number.isFinite)) {
      const want = /smallest/i.test(text) ? Math.min(...vals) : Math.max(...vals);
      return near(vals[q.correct], want) ? null
        : `compare: flagged ${vals[q.correct]}, extreme is ${want}`;
    }
  }
  if (/fraction of the bar is blue/i.test(text)) {
    const on = (q.extra.match(/class="seg fill"/g) || []).length;
    const total = (q.extra.match(/class="seg[ "]/g) || []).length;
    if (total && ansFrac) {
      return near(on / total, ansFrac[0] / ansFrac[1]) ? null
        : `bar model: ${on}/${total} shaded but answer is ${ansFrac[0]}/${ansFrac[1]}`;
    }
  }

  /* --- geometry --- */
  if (/perimeter of this rectangle/i.test(text)) {
    const nums = (extra.match(/(\d+) cm/g) || []).map(s => parseInt(s, 10));
    if (nums.length >= 2) {
      const e = 2 * (nums[0] + nums[1]);
      return near(e, ansNum) ? null : `rect perimeter: expected ${e} from ${nums.join('x')}, got ${ansNum}`;
    }
  }
  if (/area of this rectangle/i.test(text)) {
    const nums = (extra.match(/(\d+) cm/g) || []).map(s => parseInt(s, 10));
    if (nums.length >= 2) {
      const e = nums[0] * nums[1];
      return near(e, ansNum) ? null : `rect area: expected ${e} from ${nums.join('x')}, got ${ansNum}`;
    }
  }
  if ((m = text.match(/A square has sides of (\d+) cm\. What is its (perimeter|area)/))) {
    const s = Number(m[1]);
    const e = m[2] === 'perimeter' ? 4 * s : s * s;
    return near(e, ansNum) ? null : `square ${m[2]}(${s}): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/area of (\d+) cm.*breadth is (\d+) cm.*length/i))) {
    const e = Number(m[1]) / Number(m[2]);
    return near(e, ansNum) ? null : `missing side: expected ${e}, got ${ansNum}`;
  }

  /* --- whole-number arithmetic --- */
  if ((m = text.match(/^([\d.]+) ([×x*]) ([\d.]+) = \?$/))) {
    const e = Number(m[1]) * Number(m[3]);
    return near(e, ansNum) ? null : `mul: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) ÷ ([\d.]+) = \?$/))) {
    const e = Number(m[1]) / Number(m[2]);
    return near(e, ansNum) ? null : `div: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) \+ ([\d.]+) = \?$/))) {
    const e = Number(m[1]) + Number(m[2]);
    return near(e, ansNum) ? null : `add: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) [−-] ([\d.]+) = \?$/))) {
    const e = Number(m[1]) - Number(m[2]);
    return near(e, ansNum) ? null : `sub: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) \+ \? = ([\d.]+)$/))) {
    const e = Number(m[2]) - Number(m[1]);
    return near(e, ansNum) ? null : `missing addend: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/^([\d.]+) ([×x*]) \? = ([\d.]+)$/))) {
    const e = Number(m[3]) / Number(m[1]);
    return near(e, ansNum) ? null : `missing factor: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/Which number is (greater|smaller|the greatest|the smallest)/i))) {
    const vals = q.choices.map(c => parseFloat(strip(c)));
    if (vals.every(Number.isFinite)) {
      const want = /small/i.test(m[1]) ? Math.min(...vals) : Math.max(...vals);
      return near(vals[q.correct], want) ? null : `compare num: flagged ${vals[q.correct]}, extreme ${want}`;
    }
  }

  /* --- decimals (kept live for the Phase 1 Decimal Bay lane) --- */
  if ((m = text.match(/value of the digit (\d+) in ([\d.]+)/))) {
    const dec = m[2].split('.')[1] || '';
    const idx = dec.indexOf(m[1]);
    if (idx < 0) return 'place-value digit not in decimal part: ' + m[2];
    const e = Number(m[1]) / Math.pow(10, idx + 1);
    return near(e, ansNum) ? null : `place value: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/Round ([\d.]+) to the (nearest whole number|1 decimal place|2 decimal places)/))) {
    const to = m[2].startsWith('nearest whole') ? 0 : (m[2].startsWith('1') ? 1 : 2);
    const f = Math.pow(10, to);
    const e = Math.round(parseFloat(m[1]) * f + 1e-9) / f;
    return near(e, ansNum) ? null : `round(${m[1]},${to}dp): expected ${e}, got ${ansNum}`;
  }
  if (/Write .* as a decimal/.test(text)) {
    const f = parseFrac(q.q);
    if (f) {
      const e = f[0] / f[1];
      return near(e, ansNum) ? null : `frac->dec: expected ${e}, got ${ansNum}`;
    }
  }

  /* --- P5 lane: MC percentage, area of triangle, volume --- */
  if ((m = text.match(/^(\d+)% of (\d+) = \?$/))) {
    const e = Number(m[1]) * Number(m[2]) / 100;
    return near(e, ansNum) ? null : `% of whole: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/costing \$(\d+) has a (\d+)% discount/))) {
    const p = Number(m[1]);
    const e = p - p * Number(m[2]) / 100;
    return near(e, ansNum) ? null : `discount: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/triangle has a base of (\d+) cm and a height of (\d+) cm/))) {
    const e = Number(m[1]) * Number(m[2]) / 2;
    return near(e, ansNum) ? null : `triangle area (MC): expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/kite paper (\d+) cm long and (\d+) cm wide in half along a diagonal/))) {
    const e = Number(m[1]) * Number(m[2]) / 2;
    return near(e, ansNum) ? null : `half rectangle: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/A cube has edges of (\d+) cm\. What is its volume\?$/))) {
    const s = Number(m[1]), e = s * s * s;
    return near(e, ansNum) ? null : `cube volume: expected ${e}, got ${ansNum}`;
  }
  if ((m = text.match(/A cuboid measures (\d+) cm by (\d+) cm by (\d+) cm\. What is its volume\?$/))) {
    const e = Number(m[1]) * Number(m[2]) * Number(m[3]);
    return near(e, ansNum) ? null : `cuboid volume: expected ${e}, got ${ansNum}`;
  }

  return false; // no oracle matched
}

/* ---------- collect every registered generator ---------- */
const GENS = []; // { topic, skill, level, name, fn }
for (const [tid, t] of Object.entries(TOPICS)) {
  const seen = new Set();
  for (const lvl of [1, 2, 3]) {
    for (const [fn, skill] of t.pools[lvl]) {
      const name = fn.name || '(anonymous)';
      const key = tid + '.' + name;
      if (seen.has(key)) continue;
      seen.add(key);
      GENS.push({ topic: tid, skill, level: lvl, name, fn });
    }
  }
}

/* ---------- run ---------- */
let failures = 0;
const DISTINCT_FLOOR = Math.min(8, N);
const rows = [];

for (const g of GENS) {
  let err = null, badQ = null, matched = 0;
  const distinct = new Set();
  for (let i = 0; i < N; i++) {
    let q;
    try { q = g.fn(); } catch (e) { err = 'threw: ' + e.message; break; }
    const shape = checkShape(q);
    if (shape) { err = shape; badQ = q; break; }
    distinct.add(qKey(q));
    const o = oracle(q);
    if (o === false) continue;
    matched++;
    if (o) { err = o; badQ = q; break; }
  }
  if (!err && distinct.size < DISTINCT_FLOOR) {
    err = `sample space collapsed: only ${distinct.size} distinct questions in ${N} draws`;
  }
  const cov = Math.round((matched / N) * 100);
  rows.push({ topic: g.topic, name: g.name, skill: g.skill, n: N, distinct: distinct.size, cov, err });
  if (err) {
    failures++;
    if (badQ) console.error(`   sample: ${JSON.stringify({ q: strip(badQ.q), extra: strip(badQ.extra || ''), choices: (badQ.choices || []).map(strip), correct: badQ.correct, answerText: strip(badQ.answerText), answer: badQ.answer })}`);
  }
}

/* ---------- wiring smoke: buildSetFor for every registered topic ---------- */
const setRows = [];
for (const tid of Object.keys(TOPICS)) {
  let ok = true, note = '';
  for (const lvl of [1, 2, 3]) {
    const set = MQI.buildSetFor(tid, 30);
    if (!set[lvl] || set[lvl].length < 30) { ok = false; note = `L${lvl} only ${set[lvl] ? set[lvl].length : 0}/30`; break; }
    const keys = set[lvl].map(qKey);
    if (new Set(keys).size !== keys.length) { ok = false; note = `L${lvl} duplicate questions inside one set`; break; }
    for (const q of set[lvl]) { const e = checkShape(q); if (e) { ok = false; note = `L${lvl} ${e}`; break; } }
    if (!ok) break;
  }
  setRows.push({ tid, ok, note });
  if (!ok) failures++;
}

/* ---------- report ---------- */
const pad = (s, w) => String(s).padEnd(w);
console.log(`\nMath Quest Island generator sanity  (SAMPLES=${N}, ${GENS.length} generators, ${Object.keys(TOPICS).length} topics)\n`);
console.log(pad('TOPIC', 12) + pad('GENERATOR', 18) + pad('SKILL', 12) + pad('N', 7) + pad('DISTINCT', 10) + pad('ORACLE', 9) + 'RESULT');
console.log('-'.repeat(84));
for (const r of rows) {
  console.log(pad(r.topic, 12) + pad(r.name, 18) + pad(r.skill, 12) + pad(r.n, 7) + pad(r.distinct, 10) + pad(r.cov + '%', 9) + (r.err ? 'FAIL  ' + r.err : 'pass'));
}
console.log('');
for (const s of setRows) console.log(`${s.ok ? 'ok  ' : 'FAIL'} buildSetFor(${s.tid})  30 x 3 levels${s.note ? '  ' + s.note : ''}`);

const uncovered = rows.filter(r => r.cov === 0).map(r => r.topic + '.' + r.name);
if (uncovered.length) console.log(`\nWARN no independent oracle matched (shape + integrity only): ${uncovered.join(', ')}`);

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll ${GENS.length} generators passed (${N} samples each).`);
