/* ---------- P6 FRACTIONS ORACLE (P5-P6 mirror, Sprint 1, 2026-10-30) ----------
   Exhaustive for topic p6fractions: every stem must match one of these shapes or the
   draw fails. The generator divides by turning the divisor over and multiplying; this
   oracle NEVER does. Every quotient is verified by the inverse operation instead
   (key × divisor = dividend, in exact integer cross-multiplication), and the word
   problems are solved by brute-force search (count the parts that fit, search the
   amount at first and replay the story forwards). MCQs must have EXACTLY ONE option
   that passes the check; every distractor carries a tag from the topic's dictionary and
   a coaching line; every draw is syl 'P6'; the syllabus clamps are enforced on the
   rendered numbers (dividend whole or PROPER, fraction divisor PROPER, whole divisor
   >= 2); typed fraction keys carry q.fracAnswer; slips never equal the key. */
export const topic = 'p6fractions';

const plain = s => String(s)
  .replace(/<span class="frac"><span class="n">(\d+)<\/span><span class="d">(\d+)<\/span><\/span>/g, '$1/$2')
  .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const num = s => { const m = String(s).trim().match(/^(\d+)(?:\/(\d+))?$/); return m ? [Number(m[1]), m[2] ? Number(m[2]) : 1] : null; };
const eqv = (x, y) => !!x && !!y && x[0] * y[1] === y[0] * x[1];
const mul = (x, y) => [x[0] * y[0], x[1] * y[1]];
const proper = f => f[0] >= 1 && f[0] < f[1];

export function oracle(q, kit) {
  const { TOPICS, gcd } = kit;
  const text = plain(q.q);
  const fail = s => 'p6fractions: ' + s + ' :: ' + text;
  const MIS = (TOPICS.p6fractions && TOPICS.p6fractions.misconceptions) || {};
  if (q.syl !== 'P6') return fail('every item must carry syl P6');

  /* the key, read off the item */
  let key;
  if (!q.typed) {
    const n = (q.choices || []).length;
    for (let i = 0; i < n; i++) {
      if (i === q.correct) { if (q.miscon && q.miscon[i] != null) return fail('the key carries a misconception tag'); continue; }
      const t = q.miscon && q.miscon[i];
      if (!t || !MIS[t]) return fail(`distractor ${i} has no misconception tag from the dictionary (${t})`);
      if (!q.optionFeedback || typeof q.optionFeedback[i] !== 'string' || !q.optionFeedback[i].trim()) return fail(`distractor ${i} has no coaching line`);
    }
    key = num(plain(q.answerText));
    if (!key) return fail('the key is not a number or fraction');
  } else {
    if (Array.isArray(q.fracAnswer)) {
      key = [Number(q.fracAnswer[0]), Number(q.fracAnswer[1])];
      if (gcd(key[0], key[1]) !== 1 || key[1] < 2) return fail('fracAnswer must be reduced and not a whole number');
      if (Math.abs(q.answer - key[0] / key[1]) > 1e-9) return fail('answer and fracAnswer disagree');
    } else {
      if (!Number.isInteger(q.answer)) return fail('a non-whole typed key must carry fracAnswer');
      key = [q.answer, 1];
    }
    if (q.slips) for (const [v, t] of Object.entries(q.slips)) {
      const sv = num(v);
      if (!sv) return fail(`slip ${v} is not a typed number or fraction`);
      if (eqv(sv, key)) return fail('a slip equals the key');
      if (!MIS[t]) return fail(`slip tag ${t} is not in the dictionary`);
    }
  }
  const unit = Array.isArray(q.unit) ? q.unit[0] : (q.unit || '');
  /* MCQ: exactly one option passes; typed: the key passes */
  const settle = (ok, what) => {
    if (!ok(key)) return fail(`the key ${key[0]}/${key[1]} does not pass the check (${what})`);
    if (q.typed) return null;
    const right = q.choices.filter(c => { const v = num(plain(c)); return v && ok(v); }).length;
    return right === 1 ? null : fail(`${right} options pass the check (${what})`);
  };
  const p3 = () => (q.band !== 3 || q.exam !== 'problem') ? fail('a Paper 2 problem is band 3 and exam:problem') : null;
  let m;

  /* bare divisions */
  if ((m = text.match(/^Find the value of (\d+)\/(\d+) ÷ (\d+)\.$/))) {
    const A = [+m[1], +m[2]], n = +m[3];
    if (!proper(A) || n < 2) return fail('1.1 is a proper fraction divided by a whole number >= 2');
    if (unit) return fail('a bare division carries no unit');
    return settle(v => eqv(mul(v, [n, 1]), A), 'key × ' + n + ' = ' + A.join('/'));
  }
  if ((m = text.match(/^Find the value of (\d+) ÷ (\d+)\/(\d+)\.$/))) {
    const n = +m[1], C = [+m[2], +m[3]];
    if (!proper(C) || n < 1) return fail('1.2 divides a whole number by a proper fraction');
    if (unit) return fail('a bare division carries no unit');
    return settle(v => eqv(mul(v, C), [n, 1]), 'key × ' + C.join('/') + ' = ' + n);
  }
  if ((m = text.match(/^Find the value of (\d+)\/(\d+) ÷ (\d+)\/(\d+)\.$/))) {
    const A = [+m[1], +m[2]], C = [+m[3], +m[4]];
    if (!proper(A) || !proper(C)) return fail('1.2 divides a proper fraction by a proper fraction');
    if (unit) return fail('a bare division carries no unit');
    return settle(v => eqv(mul(v, C), A), 'key × ' + C.join('/') + ' = ' + A.join('/'));
  }

  /* how many a/b-sized parts in W: count them off one by one */
  if ((m = text.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?) has (\d+) (litres|kg|m) of ([a-z ]+)\. \1 (?:pours|packs|cuts) all of it into (bottles|jugs|bags|packets|pieces) that (?:each hold|are each) (\d+)\/(\d+) (litre|kg|m)\. How many \5 are there\?$/))) {
    const W = +m[2], C = [+m[6], +m[7]];
    if (!proper(C)) return fail('the part size must be a proper fraction');
    if ((m[3] === 'litres') !== (m[8] === 'litre') || (m[3] !== 'litres' && m[3] !== m[8])) return fail('the two units differ');
    if (unit !== m[5]) return fail(`a count of ${m[5]} should declare "${m[5]}", got "${unit}"`);
    let k = 0, filled = [0, 1];
    while (filled[0] * 1 < W * filled[1] && k < 10000) { k++; filled = [k * C[0], C[1]]; }
    if (filled[0] !== W * filled[1]) return fail('the parts do not fit exactly, so "how many" is ambiguous');
    return settle(v => v[1] === 1 && v[0] === k, 'counted ' + k + ' parts');
  }
  /* a/b shared equally into n */
  if ((m = text.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?) has (\d+)\/(\d+) (kg|litre|m) of ([a-z]+)\. \1 (?:divides it equally into (\d+) ([a-z]+)|cuts it into (\d+) equal pieces)\. (?:What is the mass of \5 in each [a-z]+, in kg|How many litres of \5 are there in each [a-z]+|How long is each piece of \5, in m)\?$/))) {
    const A = [+m[2], +m[3]], n = +(m[6] || m[8]);
    if (!proper(A) || n < 2) return fail('1.1 is a proper fraction shared into 2 or more');
    const want = m[4] === 'litre' ? 'l' : m[4];
    if (unit !== want) return fail(`should declare "${want}", got "${unit}"`);
    return settle(v => eqv(mul(v, [n, 1]), A), 'each × ' + n + ' = ' + A.join('/'));
  }
  /* Paper 2: drank some, shared the rest: replay forwards (each × n + drunk = had) */
  if ((m = text.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?) had (\d+)\/(\d+) l of juice\. \1 drank (\d+)\/(\d+) l of the juice and poured the rest equally into (\d+) cups\. How much juice was there in each cup, in litres\?$/))) {
    const H = [+m[2], +m[3]], D = [+m[4], +m[5]], n = +m[6];
    if (!proper(H) || !proper(D) || D[0] * H[1] >= H[0] * D[1]) return fail('drank must be less than the proper amount there was');
    if (unit !== 'l') return fail('should declare "l"');
    const r = p3(); if (r) return r;
    const ok = v => { const t = [v[0] * n, v[1]]; return t[0] * D[1] * H[1] + D[0] * t[1] * H[1] === H[0] * t[1] * D[1]; };
    return settle(ok, 'each × ' + n + ' + drunk = had');
  }
  /* Paper 2: used a fraction, packed the rest: search the number of bags */
  if ((m = text.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?) bought (\d+) kg of ([a-z ]+)\. \1 used (\d+)\/(\d+) of it for a party and packed the rest into (bags|packets) of (\d+)\/(\d+) kg each\. How many \6 of \3 did \1 pack\?$/))) {
    const W = +m[2], U = [+m[4], +m[5]], C = [+m[7], +m[8]];
    if (!proper(U) || !proper(C)) return fail('both fractions must be proper');
    if (unit !== m[6]) return fail(`should declare "${m[6]}"`);
    const r = p3(); if (r) return r;
    const sols = [];
    for (let k = 1; k <= 5000; k++) {                 /* k bags of C plus the used part make W */
      if (k * C[0] * U[1] + W * U[0] * C[1] === W * C[1] * U[1]) sols.push(k);
    }
    if (sols.length !== 1) return fail(`${sols.length} whole numbers of ${m[6]} fit`);
    return settle(v => v[1] === 1 && v[0] === sols[0], 'searched ' + sols[0]);
  }
  /* Paper 2: fraction of the remainder: search the money at first, replay the spending */
  if ((m = text.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?) had some money\. \1 spent (\d+)\/(\d+) of the money on [a-z ]+ and (\d+)\/(\d+) of the remaining money on [a-z ]+\. \1 had \$(\d+) left\. How much money did \1 have at first\? \(in dollars\)$/))) {
    const P = [+m[2], +m[3]], S = [+m[4], +m[5]], L = +m[6];
    if (!proper(P) || !proper(S)) return fail('both fractions must be proper');
    if (unit !== '$') return fail('a dollar answer must declare $');
    if (q.answerText !== '$' + q.answer) return fail('dollar answerText should read $' + q.answer);
    const r = p3(); if (r) return r;
    const sols = [];
    for (let M = 1; M <= 20000; M++) {
      if ((M * P[0]) % P[1]) continue;
      const a1 = M - M * P[0] / P[1];
      if ((a1 * S[0]) % S[1]) continue;
      if (a1 - a1 * S[0] / S[1] === L) sols.push(M);
    }
    if (sols.length !== 1) return fail(`${sols.length} whole-dollar amounts at first`);
    return settle(v => v[1] === 1 && v[0] === sols[0], 'searched $' + sols[0]);
  }
  return fail('no oracle matched this stem - every p6fractions stem must ship its oracle');
}
