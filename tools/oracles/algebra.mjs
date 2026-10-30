/* Oracle plug-in for Algebra Atoll (topic 'algebra', P6 Algebra 1.1-1.5).
   Exhaustive: every stem the topic emits is matched here, or the draw fails.
   Method, independent of the generator's own formulas:
     - expressions (stems and MCQ options) are PARSED from the rendered text by a small
       precedence parser (× ÷ / before + −, coefficient-letter "3k" = 3 × k) and compared
       by SUBSTITUTION at six values of the letter, never by string;
     - MCQ: exactly one option is equivalent to what the stem describes; the key is it;
     - simplify keys must also be in simplest form (one letter term + at most one number);
     - equations are solved by BRUTE-FORCE search over 0..2000, never by inverse operations;
     - word problems are re-modelled from the numbers in the stem, then substituted;
     - syllabus clamps: no brackets in any expression, whole positive coefficients, typed
       keys are positive whole numbers, money and cm stems declare their unit. */
export const topic = 'algebra';

const TEST_VALUES = [2, 3, 5, 7, 11, 13];
const WORD = { 'two': 2, 'three': 3 };

/* parse an expression in one letter L into v => number, or null */
function parseExpr(src, L) {
  const s = String(src).trim();
  if (/[()]/.test(s)) return null;
  const re = /\s*(\d+[a-z]|[a-z]\/\d+|\d+\/[a-z]|\d+|[a-z]|[+−×÷])/y;
  const toks = [];
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) return null;
    toks.push(m[1]); i = re.lastIndex;
    while (i < s.length && s[i] === ' ') i++;
  }
  const isOp = t => '+−×÷'.includes(t);
  if (!toks.length || toks.length % 2 === 0) return null;
  for (let k = 0; k < toks.length; k++) if ((k % 2 === 1) !== isOp(toks[k])) return null;
  for (const t of toks) { const letters = t.match(/[a-z]/g); if (letters && letters.some(c => c !== L)) return null; }
  const atom = (t, v) => {
    let m;
    if ((m = t.match(/^(\d+)([a-z])$/))) return Number(m[1]) * v;
    if ((m = t.match(/^([a-z])\/(\d+)$/))) return v / Number(m[2]);
    if ((m = t.match(/^(\d+)\/([a-z])$/))) return Number(m[1]) / v;
    if (/^[a-z]$/.test(t)) return v;
    return Number(t);
  };
  return v => {
    let total = 0, sign = 1, term = atom(toks[0], v);
    for (let k = 1; k < toks.length; k += 2) {
      const op = toks[k], x = atom(toks[k + 1], v);
      if (op === '×') term *= x;
      else if (op === '÷') term /= x;
      else { total += sign * term; sign = op === '+' ? 1 : -1; term = x; }
    }
    return total + sign * term;
  };
}
const equivFn = (f, g, near) => !!f && !!g && TEST_VALUES.every(v => near(f(v), g(v)));

export function oracle(q, kit) {
  const { strip, near, TOPICS } = kit;
  const text = strip(q.q);
  const fail = s => 'algebra: ' + s + ' :: ' + text;
  const MIS = (TOPICS.algebra && TOPICS.algebra.misconceptions) || {};
  if (q.syl !== 'P6') return fail('every item must carry syl P6');

  /* tags */
  if (!q.typed) {
    const n = (q.choices || []).length;
    for (let i = 0; i < n; i++) {
      if (/[()]/.test(strip(q.choices[i]))) return fail('an option prints a bracket');
      if (i === q.correct) { if (q.miscon && q.miscon[i] != null) return fail('the key carries a misconception tag'); continue; }
      const t = q.miscon && q.miscon[i];
      if (!t || !MIS[t]) return fail(`distractor ${i} has no misconception tag from the dictionary (${t})`);
      if (!q.optionFeedback || typeof q.optionFeedback[i] !== 'string' || !q.optionFeedback[i].trim()) return fail(`distractor ${i} has no coaching line`);
    }
  } else {
    if (!Number.isInteger(q.answer) || q.answer <= 0) return fail('a typed key must be a positive whole number');
    if (!q.slips || typeof q.slips !== 'object') return fail('typed item without slips');
    for (const [v, t] of Object.entries(q.slips)) {
      if (Number(v) === q.answer) return fail('a slip equals the key');
      if (!MIS[t]) return fail(`slip tag ${t} is not in the dictionary`);
    }
  }
  /* brackets only in the "(in dollars, e.g. 12)" hint */
  if (/[()]/.test(text.replace(/ \(in dollars, e\.g\. \d+\)$/, ''))) return fail('the stem prints a bracket');

  /* MCQ: exactly one option equivalent to want(v); the key is that option */
  const oneEquiv = (want, L) => {
    const hits = [];
    for (let i = 0; i < q.choices.length; i++) {
      const f = parseExpr(strip(q.choices[i]), L);
      if (!f) return `option "${strip(q.choices[i])}" is not an expression in ${L}`;
      if (equivFn(f, want, near)) hits.push(i);
    }
    if (hits.length !== 1) return `${hits.length} options are equivalent to the answer`;
    if (hits[0] !== q.correct) return 'the key is not the equivalent option';
    return null;
  };
  const posCoefs = s => !/(^|[^\d])0[a-z]/.test(s);
  const band3 = () => (q.band === 3 && q.exam === 'problem' && q.typed && text.split(/\s+/).length >= 12) ? null : fail('a Paper 2 item must be band 3, exam problem, typed, >= 12 words');
  const want = (val, unit) => {
    if (unit !== undefined) {
      const u = Array.isArray(q.unit) ? q.unit[0] : q.unit;
      if (u !== unit) return fail(`must declare unit ${unit}, has ${JSON.stringify(q.unit)}`);
    }
    if (!Number.isInteger(val) || val <= 0) return fail(`the re-derived answer ${val} is not a positive whole number`);
    return q.answer === val ? null : fail(`expected ${val}, got ${q.answer}`);
  };
  const NAME = "([A-Z][a-z]+(?: [A-Z][a-z]+)?)";
  /* the money hint's example never shows the key */
  const hint = text.match(/\(in dollars, e\.g\. (\d+)\)$/);
  if (hint && Number(hint[1]) === q.answer) return fail('the e.g. hint shows the key');
  /* the key never repeats a number printed in an equation's left side */
  const notPrinted = (lhs, v) => ((String(lhs).match(/\d+/g) || []).map(Number).includes(v) ? fail(`the key ${v} is printed in the question`) : null);
  let m;

  /* ---- 1.1 / 1.2 story expressions (MCQ) ---- */
  if ((m = text.match(new RegExp(`^${NAME} has ([a-z]) stickers\\. \\1's friend gives \\1 (\\d+) more stickers\\. How many stickers does \\1 have now\\?$`)))) {
    const L = m[2], b = +m[3]; const r = oneEquiv(v => v + b, L); return r ? fail(r) : null;
  }
  if ((m = text.match(new RegExp(`^${NAME} has ([a-z]) stickers\\. \\1 gives away (\\d+) stickers\\. How many stickers does \\1 have left\\?$`)))) {
    const L = m[2], b = +m[3]; const r = oneEquiv(v => v - b, L); return r ? fail(r) : null;
  }
  if ((m = text.match(new RegExp(`^There are ([a-z]) pencils in each box\\. ${NAME} buys (\\d+) boxes\\. How many pencils does \\2 buy\\?$`)))) {
    const L = m[1], b = +m[3]; const r = oneEquiv(v => b * v, L); return r ? fail(r) : null;
  }
  if ((m = text.match(new RegExp(`^${NAME} shares ([a-z]) sweets equally among (\\d+) friends\\. How many sweets does each friend get\\?$`)))) {
    const L = m[2], b = +m[3]; const r = oneEquiv(v => v / b, L); return r ? fail(r) : null;
  }
  if ((m = text.match(new RegExp(`^A notebook costs \\$([a-z])\\. ${NAME} buys (\\d+) notebooks and a pen that costs \\$(\\d+)\\. How much does \\2 spend altogether, in dollars\\?$`)))) {
    const L = m[1], a = +m[3], b = +m[4]; const r = oneEquiv(v => a * v + b, L); return r ? fail(r) : null;
  }
  if ((m = text.match(new RegExp(`^${NAME} is ([a-z]) years old\\. \\1's mother is (\\d+) times as old as \\1\\. How old will \\1's mother be in (\\d+) years' time\\?$`)))) {
    const L = m[2], a = +m[3], b = +m[4]; const r = oneEquiv(v => a * v + b, L); return r ? fail(r) : null;
  }

  /* ---- 1.2 interpretation (MCQ) ---- */
  if ((m = text.match(/^Which of these means the same as (.+)\?$/))) {
    const L = (m[1].match(/[a-z]/) || [])[0];
    const f = L && parseExpr(m[1], L);
    if (!f) return fail('the given expression does not parse');
    const r = oneEquiv(f, L); return r ? fail(r) : null;
  }
  if ((m = text.match(/^Which expression means "(\d+) (less|more) than ([a-z])"\?$/))) {
    const k = +m[1], L = m[3]; const r = oneEquiv(m[2] === 'less' ? v => v - k : v => v + k, L); return r ? fail(r) : null;
  }
  if ((m = text.match(/^Which expression means "([a-z]) multiplied by (\d+)"\?$/))) {
    const L = m[1], k = +m[2]; const r = oneEquiv(v => v * k, L); return r ? fail(r) : null;
  }

  /* ---- 1.3 simplify (MCQ) ---- */
  if ((m = text.match(/^Simplify (.+)\.$/))) {
    const L = (m[1].match(/[a-z]/) || [])[0];
    const f = L && parseExpr(m[1], L);
    if (!f) return fail('the expression does not parse');
    if (/[×÷\/]/.test(m[1])) return fail('a simplify stem should be a sum of like and unlike terms only');
    const r = oneEquiv(f, L); if (r) return fail(r);
    const key = strip(q.answerText);
    const km = key.match(/^(\d*)([a-z])(?: ([+−]) (\d+))?$/);
    if (!km || km[2] !== L) return fail(`the key "${key}" is not in simplest form`);
    if (km[1] === '1' || km[1] === '0') return fail('a coefficient of 1 or 0 is printed');
    return null;
  }

  /* ---- 1.4 evaluate (typed) ---- */
  if ((m = text.match(/^Find the value of (.+) when ([a-z]) = (\d+)\.$/))) {
    const L = m[2], f = parseExpr(m[1], L);
    if (!f) return fail('the expression does not parse');
    if (!posCoefs(m[1])) return fail('a zero coefficient');
    if (q.unit) return fail('a plain evaluation carries no unit');
    return want(f(+m[3]));
  }

  /* ---- 1.5 solve (typed) ---- */
  const solve = (f, c) => {
    const sols = [];
    for (let v = 0; v <= 2000; v++) if (near(f(v), c)) sols.push(v);
    return sols.length === 1 ? sols[0] : null;
  };
  if ((m = text.match(/^Solve the equation (.+) = (\d+)\. What is the value of ([a-z])\?$/))) {
    const L = m[3], f = parseExpr(m[1], L);
    if (!f) return fail('the left side does not parse');
    if (/[÷\/]/.test(m[1])) return fail('whole-number coefficients only');
    const v = solve(f, +m[2]);
    if (v === null) return fail('no unique whole-number solution');
    if (q.unit) return fail('a plain equation carries no unit');
    return notPrinted(m[1], v) || want(v);
  }

  /* ---- Paper 2 (typed, band 3) ---- */
  if ((m = text.match(new RegExp(`^${NAME} is ([a-z]) years old\\. \\1's father is (\\d+) times as old as \\1\\. \\1's (sister|brother) is (\\d+) years (younger|older) than \\1\\. Find the total of their three ages when \\2 = (\\d+)\\.$`)))) {
    const b3 = band3(); if (b3) return b3;
    const a = +m[3], b = +m[5], V = +m[7];
    if ((m[4] === 'sister') !== (m[6] === 'younger')) return fail('sister/brother wording drifted');
    const sib = m[6] === 'older' ? V + b : V - b;
    if (sib <= 0) return fail('the sibling has no positive age');
    const dad = a * V;
    if (dad < 25 || dad > 60 || dad - V < 20) return fail(`an unbelievable father aged ${dad} with a child of ${V}`);
    return want(V + dad + sib, 'years');
  }
  if ((m = text.match(new RegExp(`^A pen costs \\$([a-z])\\. A file costs (\\d+) times as much as a pen\\. ${NAME} buys (\\d+) pens and (\\d+) files, and pays with a \\$(\\d+) note\\. How much change does \\3 receive when \\1 = (\\d+)\\? \\(in dollars, e\\.g\\. \\d+\\)$`)))) {
    const b3 = band3(); if (b3) return b3;
    const r = +m[2], p = +m[4], f = +m[5], note = +m[6], V = +m[7];
    let spent = 0;
    for (let i = 0; i < p; i++) spent += V;
    for (let i = 0; i < f; i++) spent += r * V;
    if (q.answerText !== '$' + q.answer) return fail('money answerText must read $n');
    return want(note - spent, '$');
  }
  if ((m = text.match(/^A rectangle is (\d*)([a-z]) cm long\. Its breadth is (\d+) cm shorter than its length\. Find the perimeter of the rectangle when \2 = (\d+)\.$/))) {
    const b3 = band3(); if (b3) return b3;
    const a = m[1] === '' ? 1 : +m[1], b = +m[3], V = +m[4];
    const len = a * V, br = len - b;
    if (br <= 0) return fail('the breadth is not positive');
    return want(len + br + len + br, 'cm');
  }
  if ((m = text.match(/^Each of the two equal sides of an isosceles triangle is (\d*)([a-z]) cm long\. The third side is (\d+) cm longer than one of the equal sides\. Find the perimeter of the triangle when \2 = (\d+)\.$/))) {
    const b3 = band3(); if (b3) return b3;
    const a = m[1] === '' ? 1 : +m[1], b = +m[3], V = +m[4];
    const side = a * V;
    if (!(side + side > side + b)) return fail(`sides ${side}, ${side}, ${side + b} break the triangle inequality`);
    return want(side + side + (side + b), 'cm');
  }
  if ((m = text.match(new RegExp(`^${NAME} thinks of a whole number ([a-z])\\. \\1 multiplies it by (\\d+) and then (adds|subtracts) (\\d+)\\. The result is (\\d+)\\. What is the value of \\2\\?$`)))) {
    const b3 = band3(); if (b3) return b3;
    const a = +m[3], b = +m[5], c = +m[6], plus = m[4] === 'adds';
    const v = solve(x => plus ? a * x + b : a * x - b, c);
    if (v === null) return fail('no unique whole-number solution');
    if (q.unit) return fail('a number puzzle carries no unit');
    return notPrinted(a + ' ' + b, v) || want(v);
  }
  if ((m = text.match(new RegExp(`^${NAME} buys (\\d+) identical files at \\$([a-z]) each and a bag that costs \\$(\\d+)\\. \\1 spends \\$(\\d+) altogether\\. Find the value of \\3\\. \\(in dollars, e\\.g\\. \\d+\\)$`)))) {
    const b3 = band3(); if (b3) return b3;
    const a = +m[2], b = +m[4], c = +m[5];
    const v = solve(x => a * x + b, c);
    if (v === null) return fail('no unique whole-number solution');
    if (q.answerText !== '$' + q.answer) return fail('money answerText must read $n');
    return notPrinted(a + ' ' + b, v) || want(v, '$');
  }
  if ((m = text.match(new RegExp(`^${NAME} is ([a-z]) years old\\. (${NAME.slice(1, -1)}|\\1's (?:mother|father|grandmother|grandfather)) is (\\d+) times as old as \\1\\. The sum of their ages is (\\d+) years\\. What is the value of \\2\\?$`)))) {
    const b3 = band3(); if (b3) return b3;
    if (m[1] === m[3]) return fail('the two people share a name');
    const k = +m[4], c = +m[5];
    const v = solve(x => x + k * x, c);
    if (v === null) return fail('no unique whole-number solution');
    const age = k * v, gap = age - v, who = m[3];
    if (age > 75) return fail(`the second person is ${age}`);
    if (/grand/.test(who) ? (age <= 60 || gap < 45) : /'s/.test(who) ? (age < 25 || age > 60 || gap < 20) : age >= 25)
      return fail(`${who} aged ${age} beside a child of ${v} is not believable`);
    return want(v, 'years');
  }
  return fail('unmatched stem');
}
