/* ---------- P6 AVERAGE ORACLE (P5-P6 mirror, Sprint 1, 2026-10-30) ----------
   Exhaustive for topic p6average: every stem must match one of these shapes or the
   draw fails. Keys are re-derived from the RENDERED stem by a different route from
   the generator's: an average by summing the printed list one value at a time and
   searching for the share that, repeated once per value, rebuilds that sum (never a
   division); a total by repeated addition; the missing value, the newcomer, the
   leaver, the new average and the target by SEARCHING candidate values and checking
   that the resulting data set has the stated average. MCQs must have exactly one
   option that passes; every distractor carries a tag from the topic's dictionary and
   a coaching line; every draw is syl 'P6'; units are declared; slips never equal the
   key; pool 3 shapes are band 3 and exam:problem. */
export const topic = 'p6average';

const WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const ORDS = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7 };
const NAME = '([A-Z][a-z]+(?: [A-Z][a-z]+)?)';
/* "a, b, c and d" -> [a, b, c, d]; each item may carry a $ or a trailing unit */
const listNums = (s, pre, post) => {
  const parts = s.split(/, | and /);
  const out = [];
  for (const p of parts) {
    const m = p.match(new RegExp('^' + (pre ? '\\$' : '') + '(\\d+)' + (post ? ' ' + post : '') + '$'));
    if (!m) return null;
    out.push(Number(m[1]));
  }
  return out;
};
const rep = (v, k) => { let t = 0; for (let i = 0; i < k; i++) t += v; return t; };
const sum = xs => xs.reduce((a, b) => a + b, 0);
/* the whole-number average of a data set, by search; null if it is not whole */
const avgOf = xs => { const s = sum(xs); for (let a = 0, t = 0; t <= s; a++, t = rep(a, xs.length)) if (t === s) return a; return null; };
/* does this data set have average A? (its total is A repeated once per value) */
const avgIs = (xs, A) => sum(xs) === rep(A, xs.length);

export function oracle(q, kit) {
  const { strip, TOPICS } = kit;
  const text = strip(q.q);
  const fail = s => 'p6average: ' + s + ' :: ' + text;
  const MIS = (TOPICS.p6average && TOPICS.p6average.misconceptions) || {};
  if (q.syl !== 'P6') return fail('every item must carry syl P6');
  if (!q.typed) {
    const n = (q.choices || []).length;
    for (let i = 0; i < n; i++) {
      if (i === q.correct) { if (q.miscon && q.miscon[i] != null) return fail('the key carries a misconception tag'); continue; }
      const t = q.miscon && q.miscon[i];
      if (!t || !MIS[t]) return fail(`distractor ${i} has no misconception tag from the dictionary (${t})`);
      if (!q.optionFeedback || typeof q.optionFeedback[i] !== 'string' || !q.optionFeedback[i].trim()) return fail(`distractor ${i} has no coaching line`);
    }
  } else if (q.slips) {
    for (const [v, t] of Object.entries(q.slips)) {
      if (Number(v) === q.answer) return fail('a slip equals the key');
      if (!MIS[t]) return fail(`slip tag ${t} is not in the dictionary`);
    }
  }
  const unit = Array.isArray(q.unit) ? q.unit[0] : (q.unit || '');
  const p3 = () => (q.band !== 3 || q.exam !== 'problem') ? fail('a Paper 2 problem is band 3 and exam:problem') : null;
  const typedIs = (want, u) => {
    if (!q.typed) return fail('expected a typed item');
    if (unit !== u) return fail(`should declare "${u}", got "${unit}"`);
    if (u === '$' && q.answerText !== '$' + q.answer) return fail('dollar answerText should read $' + q.answer);
    return q.answer === want ? null : fail(`expected ${want}, got ${q.answer}`);
  };
  const mcqIs = want => {
    if (q.typed) return fail('expected an MCQ');
    if (Number(strip(q.answerText)) !== want) return fail(`expected ${want}, got ${q.answerText}`);
    const right = q.choices.filter(c => Number(strip(c)) === want).length;
    return right === 1 ? null : fail(`${right} options equal ${want}`);
  };
  let m;

  if ((m = text.match(/^Find the average of ([\d, and]+)\.$/))) {
    const xs = listNums(m[1]);
    if (!xs || xs.length < 3) return fail('could not read the data');
    const a = avgOf(xs);
    if (a === null) return fail('the average is not a whole number');
    return mcqIs(a);
  }
  if ((m = text.match(/^The average of (two|three|four|five|six|seven|eight) numbers is (\d+)\. What is the total of the \1 numbers\?$/))) {
    const n = WORDS[m[1]];
    return mcqIs(rep(+m[2], n));
  }
  if ((m = text.match(/^The average of (three|four|five|six|seven) numbers is (\d+)\. (Two|Three|Four|Five|Six) of the numbers are ([\d, and]+)\. What is the (second|third|fourth|fifth|sixth|seventh) number\?$/))) {
    const n = WORDS[m[1]], A = +m[2], k = WORDS[m[3].toLowerCase()], xs = listNums(m[4]);
    if (!xs || xs.length !== k || k !== n - 1 || ORDS[m[5]] !== n) return fail('the counts in the stem do not agree');
    const sols = [];
    for (let x = 1; x <= 1000; x++) if (avgIs(xs.concat([x]), A)) sols.push(x);
    if (sols.length !== 1) return fail(`${sols.length} missing values work`);
    if (sols[0] === A) return fail('the missing value equals the average, so the average-as-value slip is the key');
    if (unit) return fail('a bare number carries no unit');
    return typedIs(sols[0], '');
  }
  if ((m = text.match(new RegExp('^' + NAME + ' saved (.+) in (\\d+) weeks\\. What was the average amount \\1 saved per week\\? \\(in dollars\\)$')))) {
    const xs = listNums(m[2], true);
    if (!xs || xs.length !== +m[3]) return fail('the number of weeks does not match the list');
    const a = avgOf(xs);
    if (a === null) return fail('the average is not a whole number');
    return typedIs(a, '$');
  }
  if ((m = text.match(/^The (masses|heights) of (\d+) (parcels|plants) are (.+)\. What is the average (mass|height) of the \3, in (kg|cm)\?$/))) {
    const xs = listNums(m[4], false, m[6]);
    if (!xs || xs.length !== +m[2]) return fail('the count does not match the list');
    const a = avgOf(xs);
    if (a === null) return fail('the average is not a whole number');
    return typedIs(a, m[6]);
  }
  if ((m = text.match(/^The average mass of (\d+) boys is (\d+) kg\. What is the total mass of the \1 boys, in kg\?$/))) {
    return typedIs(rep(+m[2], +m[1]), 'kg');
  }
  if ((m = text.match(/^The average price of (\d+) storybooks is \$(\d+)\. What is the total price of the \1 storybooks\? \(in dollars\)$/))) {
    return typedIs(rep(+m[2], +m[1]), '$');
  }
  if ((m = text.match(/^A group of pupils collected (\d+) cans altogether\. On average, each pupil collected (\d+) cans\. How many pupils were there in the group\?$/))
      || (m = text.match(/^Some boxes hold (\d+) marbles altogether\. On average, each box holds (\d+) marbles\. How many boxes are there\?$/))) {
    const T = +m[1], A = +m[2];
    let n = null;
    for (let k = 1; k <= T; k++) if (rep(A, k) === T) { n = k; break; }
    if (n === null) return fail('the total is not a whole number of averages');
    return typedIs(n, /pupils/.test(text) ? 'pupils' : 'boxes');
  }
  /* Paper 2 */
  if ((m = text.match(new RegExp('^The average mass of (\\d+) boys is (\\d+) kg\\. When ' + NAME + ' joins the group, the average mass of the (\\d+) boys becomes (\\d+) kg\\. What is \\3\'s mass, in kg\\?$')))) {
    const n = +m[1], A = +m[2], B = +m[5];
    if (+m[4] !== n + 1) return fail('the group after does not have one more boy');
    const r = p3(); if (r) return r;
    const base = Array(n).fill(A), sols = [];                    /* any data set with average A has the same total */
    for (let x = 1; x <= 500; x++) if (avgIs(base.concat([x]), B)) sols.push(x);
    if (sols.length !== 1) return fail(`${sols.length} masses work`);
    return typedIs(sols[0], 'kg');
  }
  if ((m = text.match(new RegExp('^The average amount of money saved by (\\d+) pupils is \\$(\\d+)\\. After ' + NAME + ' leaves the group, the average amount saved by the other (\\d+) pupils is \\$(\\d+)\\. How much money did \\3 save\\? \\(in dollars\\)$')))) {
    const n = +m[1], A = +m[2], B = +m[5];
    if (+m[4] !== n - 1) return fail('the group after does not have one fewer pupil');
    const r = p3(); if (r) return r;
    const rest = Array(n - 1).fill(B), sols = [];
    for (let x = 1; x <= 2000; x++) if (avgIs(rest.concat([x]), A)) sols.push(x);
    if (sols.length !== 1) return fail(`${sols.length} amounts work`);
    return typedIs(sols[0], '$');
  }
  if ((m = text.match(new RegExp('^The average score of (\\d+) players in a quiz team is (\\d+) points\\. A new player, ' + NAME + ', who scored (\\d+) points, joins the team\\. What is the new average score of the (\\d+) players\\?$')))) {
    const n = +m[1], A = +m[2], X = +m[4];
    if (+m[5] !== n + 1) return fail('the team after does not have one more player');
    const r = p3(); if (r) return r;
    const a = avgOf(Array(n).fill(A).concat([X]));
    if (a === null) return fail('the new average is not a whole number');
    return typedIs(a, 'points');
  }
  if ((m = text.match(new RegExp('^In the first (\\d+) months of the year, ' + NAME + ' saved an average of \\$(\\d+) a month\\. How much must \\2 save in the next month to make the average for the (\\d+) months \\$(\\d+)\\? \\(in dollars\\)$')))) {
    const n = +m[1], A = +m[3], B = +m[5];
    if (+m[4] !== n + 1) return fail('the months do not add up');
    const r = p3(); if (r) return r;
    const sols = [];
    for (let x = 1; x <= 2000; x++) if (avgIs(Array(n).fill(A).concat([x]), B)) sols.push(x);
    if (sols.length !== 1) return fail(`${sols.length} amounts work`);
    return typedIs(sols[0], '$');
  }
  return fail('no oracle matched this stem - every p6average stem must ship its oracle');
}
