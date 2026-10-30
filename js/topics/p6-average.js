"use strict";
/* Math Quest Island topic: p6average (P6). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, PRIMARY SIX,
 * STATISTICS, SUB-STRAND: DATA ANALYSIS, 1. Average of a Set of Data):
 *   1.1 average as 'total value ÷ number of data'
 *   1.2 relationship between average, total value and number of data
 * Every average, total and count printed or asked is a whole number, so no item
 * needs a decimal answer. Pool 3 is PSLE Paper 2 shape: band 3, worded,
 * q.exam = 'problem', coached (someone joins, someone leaves, a new average, a
 * target average), every step a total = average × number of data.
 *
 * P5-P6 mirror (Sprint 1, 2026-10-30): every item carries q.syl = 'P6'. MCQ distractors
 * carry q.miscon = { choiceIndex: tag } and a coaching line in q.optionFeedback; typed
 * items carry q.slips = { '<wrong value>': tag }. Tags live in `misconceptions` below.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishTyped = G.finishTyped;

  const NAMES = ['Hui Min', 'Farid', 'Kavitha', 'Jun Hao', 'Siti', 'Ravi', 'Mei Ling', 'Ahmad',
                 'Bala', 'Xin Yi', 'Daniel', 'Nurul', 'Wei Jie', 'Aisyah'];
  const BOYS = ['Farid', 'Jun Hao', 'Ravi', 'Ahmad', 'Bala', 'Daniel', 'Wei Jie'];
  const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  const P6 = q => (q.syl = 'P6', q);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const listOf = (xs, f) => { const s = xs.map(f || String); return s.slice(0, -1).join(', ') + ' and ' + s[s.length - 1]; };
  const isPosInt = v => Number.isInteger(v) && v > 0;

  /* n whole numbers in [lo, hi] whose average is a whole number A (returned with them) */
  function dataSet(n, lo, hi) {
    for (let t = 0; t < 500; t++) {
      const xs = [];
      for (let i = 0; i < n - 1; i++) xs.push(ri(lo, hi));
      const s = xs.reduce((a, b) => a + b, 0);
      const A = Math.round((s + ri(lo, hi)) / n), last = A * n - s;
      if (last < lo || last > hi) continue;
      xs.push(last);
      if (new Set(xs).size < n - 1) continue;
      return { xs: shuffle(xs), A, total: A * n };
    }
    return null;
  }

  /* MCQ over whole numbers. dist = [[value, tag, coaching], ...]; keeps the first three
     positive whole values that differ from the key and each other. */
  function mcq(stem, key, dist, explain, unitPre) {
    const seen = [key], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      if (!isPosInt(d[0]) || seen.indexOf(d[0]) !== -1) continue;
      seen.push(d[0]); keep.push(d);
    }
    if (keep.length < 3) return null;
    const pre = unitPre || '';
    const rows = shuffle([[key, null, null]].concat(keep));
    const q = { q: stem, extra: '', choices: rows.map(r => pre + r[0]), correct: 0, explain, answerText: pre + key };
    q.correct = rows.findIndex(r => r[1] === null);
    q.miscon = {}; q.optionFeedback = {};
    rows.forEach((r, i) => { if (r[1]) { q.miscon[i] = r[1]; q.optionFeedback[i] = r[2]; } });
    return P6(q);
  }
  function slips(q, list) {
    const s = {};
    for (const [v, tag] of list) if (isPosInt(v) && v !== q.answer && !(String(v) in s)) s[String(v)] = tag;
    q.slips = s;
    return P6(q);
  }
  const money = (q, n) => (q.answerText = '$' + n, q);
  const problem = (q, technique, steps) => (q.band = 3, q.exam = 'problem', q.technique = technique, q.steps = steps, q);

  /* ---------- 1.1 average of a set (pool 1, MCQ) ---------- */
  function gAvgOfSetMC() {
    const n = ri(3, 5), d = dataSet(n, 4, 40);
    if (!d) return gAvgOfSetMC();
    const { xs, A, total } = d, sorted = xs.slice().sort((a, b) => a - b);
    const ends = (sorted[0] + sorted[n - 1]) / 2;
    const out = mcq('Find the average of ' + listOf(xs) + '.', A, [
      [total, 'total-not-divided', 'That is the total. Share it out equally: divide the total by how many numbers there are.'],
      [total / (n - 1), 'wrong-count', 'Count the numbers again: there are ' + n + ', so divide the total by ' + n + '.'],
      [total / (n + 1), 'wrong-count', 'Count the numbers again: there are ' + n + ', so divide the total by ' + n + '.'],
      [ends, 'ends-average', 'The average uses every number, not just the smallest and the largest. Add them all first.'],
      [n % 2 ? sorted[(n - 1) / 2] : -1, 'middle-value', 'The middle number is not the average. Add all ' + n + ' numbers and divide by ' + n + '.'],
      [sorted[n - 1], 'largest-value', 'The average sits between the smallest and the largest number. Add them all and share the total equally.']
    ], 'Total = ' + xs.join(' + ') + ' = ' + total + '. There are ' + n + ' numbers, so the average is ' + total + ' ÷ ' + n + ' = ' + A + '.');
    return out || gAvgOfSetMC();
  }

  /* ---------- 1.2 total from the average (pool 1, MCQ) ---------- */
  function gTotalFromAvgMC() {
    const n = ri(3, 8), A = ri(6, 50), T = A * n;
    const out = mcq('The average of ' + WORD[n] + ' numbers is ' + A + '. What is the total of the ' + WORD[n] + ' numbers?', T, [
      [A + n, 'added-count', 'Average × number of data gives the total. Multiply ' + A + ' by ' + n + ', do not add.'],
      [A, 'average-as-total', 'The average is what each number would be if they were all equal. The total is ' + n + ' of those.'],
      [A * (n - 1), 'wrong-count', 'There are ' + n + ' numbers, so the total is ' + n + ' × ' + A + '.'],
      [A * (n + 1), 'wrong-count', 'There are ' + n + ' numbers, so the total is ' + n + ' × ' + A + '.']
    ], 'Total = average × number of data = ' + A + ' × ' + n + ' = ' + T + '.');
    return out || gTotalFromAvgMC();
  }

  /* ---------- 1.2 the missing value (pools 1 and 2, typed) ---------- */
  function gMissingValue() {
    const n = ri(3, 6), d = dataSet(n, 5, 60);
    if (!d) return gMissingValue();
    const { xs, A, total } = d, ans = xs[n - 1], others = xs.slice(0, n - 1), so = total - ans;
    if (ans === A) return gMissingValue();          /* else the average-as-value slip would be the key */
    const stem = 'The average of ' + WORD[n] + ' numbers is ' + A + '. ' + cap(WORD[n - 1]) + ' of the numbers are ' + listOf(others) +
      '. What is the ' + ORD[n] + ' number?';
    const q = finishTyped(stem, ans,
      'Total of all ' + n + ' numbers = ' + A + ' × ' + n + ' = ' + total + '. The ' + WORD[n - 1] + ' numbers given add up to ' + so +
      ', so the ' + ORD[n] + ' number is ' + total + ' − ' + so + ' = ' + ans + '.');
    return slips(q, [[A, 'average-as-value'], [total, 'answered-total'], [A * (n - 1) - so, 'wrong-count'], [so, 'answered-total']]);
  }

  /* ---------- 1.1 average in context (pool 2, typed) ---------- */
  function gAvgWord() {
    const kind = ri(0, 2), n = ri(3, 6);
    if (kind === 0) {
      const who = pick(NAMES), d = dataSet(n, 5, 40);
      if (!d) return gAvgWord();
      const stem = who + ' saved ' + listOf(d.xs, x => '$' + x) + ' in ' + n + ' weeks. What was the average amount ' + who +
        ' saved per week? (in dollars)';
      const q = money(finishTyped(stem, d.A, 'Total = $' + d.total + '. Average = $' + d.total + ' ÷ ' + n + ' = $' + d.A + ' per week.', '$'), d.A);
      return slips(q, [[d.total, 'total-not-divided'], [d.total / (n - 1), 'wrong-count'], [d.total / (n + 1), 'wrong-count']]);
    }
    const C = kind === 1 ? ['masses', 'parcels', 'kg', 'mass', 1, 15] : ['heights', 'plants', 'cm', 'height', 20, 95];
    const d = dataSet(n, C[4], C[5]);
    if (!d) return gAvgWord();
    const stem = 'The ' + C[0] + ' of ' + n + ' ' + C[1] + ' are ' + listOf(d.xs, x => x + ' ' + C[2]) + '. What is the average ' + C[3] +
      ' of the ' + C[1] + ', in ' + C[2] + '?';
    const q = finishTyped(stem, d.A, 'Total = ' + d.total + ' ' + C[2] + '. Average = ' + d.total + ' ÷ ' + n + ' = ' + d.A + ' ' + C[2] + '.', C[2]);
    return slips(q, [[d.total, 'total-not-divided'], [d.total / (n - 1), 'wrong-count'], [d.total / (n + 1), 'wrong-count']]);
  }

  /* ---------- 1.2 total from the average, in context (pool 2, typed) ---------- */
  function gTotalTyped() {
    const n = ri(4, 12);
    if (Math.random() < 0.5) {
      const A = ri(28, 55), T = A * n;
      const q = finishTyped('The average mass of ' + n + ' boys is ' + A + ' kg. What is the total mass of the ' + n + ' boys, in kg?', T,
        'Total = average × number of data = ' + A + ' × ' + n + ' = ' + T + ' kg.', 'kg');
      return slips(q, [[A + n, 'added-count'], [A, 'average-as-total'], [A * (n - 1), 'wrong-count']]);
    }
    const A = ri(4, 30), T = A * n;
    const q = money(finishTyped('The average price of ' + n + ' storybooks is $' + A + '. What is the total price of the ' + n +
      ' storybooks? (in dollars)', T, 'Total = average × number of data = $' + A + ' × ' + n + ' = $' + T + '.', '$'), T);
    return slips(q, [[A + n, 'added-count'], [A, 'average-as-total'], [A * (n - 1), 'wrong-count']]);
  }

  /* ---------- 1.2 number of data from total and average (pool 2, typed) ---------- */
  function gCountTyped() {
    const n = ri(4, 25), A = ri(6, 40), T = A * n;
    if (Math.random() < 0.5) {
      const q = finishTyped('A group of pupils collected ' + T + ' cans altogether. On average, each pupil collected ' + A +
        ' cans. How many pupils were there in the group?', n,
        'Number of data = total ÷ average = ' + T + ' ÷ ' + A + ' = ' + n + ' pupils.', 'pupils');
      return slips(q, [[T * A, 'multiplied-instead'], [T - A, 'subtracted-instead'], [A, 'average-as-count']]);
    }
    const q = finishTyped('Some boxes hold ' + T + ' marbles altogether. On average, each box holds ' + A +
      ' marbles. How many boxes are there?', n,
      'Number of data = total ÷ average = ' + T + ' ÷ ' + A + ' = ' + n + ' boxes.', 'boxes');
    return slips(q, [[T * A, 'multiplied-instead'], [T - A, 'subtracted-instead'], [A, 'average-as-count']]);
  }

  /* ---------- Paper 2 problems (pool 3, band 3) ---------- */
  /* one joins: find the newcomer's value */
  function gJoin() {
    const who = pick(BOYS);
    for (let t = 0; t < 400; t++) {
      const n = ri(3, 9), A = ri(32, 48), B = A + pick([-3, -2, -1, 1, 2, 3]);
      const T1 = n * A, T2 = (n + 1) * B, X = T2 - T1;
      if (X < 25 || X > 75) continue;
      const stem = 'The average mass of ' + n + ' boys is ' + A + ' kg. When ' + who + ' joins the group, the average mass of the ' + (n + 1) +
        ' boys becomes ' + B + ' kg. What is ' + who + '\'s mass, in kg?';
      const q = finishTyped(stem, X, 'Total before = ' + n + ' × ' + A + ' = ' + T1 + ' kg. Total after = ' + (n + 1) + ' × ' + B + ' = ' + T2 +
        ' kg. ' + who + '\'s mass is the difference: ' + T2 + ' − ' + T1 + ' = ' + X + ' kg.', 'kg');
      problem(q, 'Before and after', [
        'Before: the total mass of the ' + n + ' boys is ' + n + ' × ' + A + ' = ' + T1 + ' kg.',
        'After: the total mass of the ' + (n + 1) + ' boys is ' + (n + 1) + ' × ' + B + ' = ' + T2 + ' kg.',
        'Only ' + who + ' joined, so the extra mass in the total is ' + who + '\'s mass.',
        who + '\'s mass is ' + T2 + ' − ' + T1 + ' = <b>' + X + '</b> kg.'
      ]);
      return slips(q, [[B, 'average-as-value'], [T2, 'answered-total'], [Math.abs(B - A), 'difference-of-averages']]);
    }
    return gTarget();
  }
  /* one leaves: find the leaver's value */
  function gLeave() {
    const who = pick(NAMES);
    for (let t = 0; t < 400; t++) {
      const n = ri(4, 9), A = ri(20, 60), B = A + pick([-4, -3, -2, 2, 3, 4]);
      const T1 = n * A, T2 = (n - 1) * B, X = T1 - T2;
      if (X < 5 || X > 150) continue;
      const stem = 'The average amount of money saved by ' + n + ' pupils is $' + A + '. After ' + who + ' leaves the group, the average amount saved by the other ' +
        (n - 1) + ' pupils is $' + B + '. How much money did ' + who + ' save? (in dollars)';
      const q = money(finishTyped(stem, X, 'Total before = ' + n + ' × $' + A + ' = $' + T1 + '. Total after = ' + (n - 1) + ' × $' + B + ' = $' + T2 +
        '. ' + who + ' saved the difference: $' + T1 + ' − $' + T2 + ' = $' + X + '.', '$'), X);
      problem(q, 'Before and after', [
        'Before: the ' + n + ' pupils saved ' + n + ' × $' + A + ' = $' + T1 + ' altogether.',
        'After: the other ' + (n - 1) + ' pupils saved ' + (n - 1) + ' × $' + B + ' = $' + T2 + ' altogether.',
        'The only money that left the total is ' + who + '\'s savings.',
        who + ' saved $' + T1 + ' − $' + T2 + ' = <b>$' + X + '</b>.'
      ]);
      return slips(q, [[A, 'average-as-value'], [B, 'average-as-value'], [T1, 'answered-total'], [Math.abs(A - B), 'difference-of-averages']]);
    }
    return gJoin();
  }
  /* one joins with a known score: the new average */
  function gNewAvg() {
    const who = pick(NAMES);
    for (let t = 0; t < 400; t++) {
      const n = ri(4, 9), A = ri(55, 80), B = A + pick([-3, -2, -1, 1, 2, 3]);
      const T1 = n * A, T2 = (n + 1) * B, X = T2 - T1;
      if (X < 30 || X > 100 || X === B) continue;
      const stem = 'The average score of ' + n + ' players in a quiz team is ' + A + ' points. A new player, ' + who + ', who scored ' + X +
        ' points, joins the team. What is the new average score of the ' + (n + 1) + ' players?';
      const q = finishTyped(stem, B, 'Total before = ' + n + ' × ' + A + ' = ' + T1 + '. Add ' + who + '\'s ' + X + ': ' + T1 + ' + ' + X + ' = ' + T2 +
        '. New average = ' + T2 + ' ÷ ' + (n + 1) + ' = ' + B + ' points.', 'points');
      problem(q, 'Before and after', [
        'Before: the ' + n + ' players scored ' + n + ' × ' + A + ' = ' + T1 + ' points altogether.',
        'After ' + who + ' joins: ' + T1 + ' + ' + X + ' = ' + T2 + ' points altogether.',
        'Now there are ' + n + ' + 1 = ' + (n + 1) + ' players sharing the total.',
        'New average = ' + T2 + ' ÷ ' + (n + 1) + ' = <b>' + B + '</b> points.'
      ]);
      return slips(q, [[(A + X) / 2, 'averaged-the-averages'], [T2 / n, 'wrong-count'], [T2, 'answered-total']]);
    }
    return gJoin();
  }
  /* reach a target average: how much is needed next */
  function gTarget() {
    const who = pick(NAMES);
    for (let t = 0; t < 400; t++) {
      const n = ri(3, 6), A = ri(20, 60), B = A + ri(2, 6);
      const T1 = n * A, T2 = (n + 1) * B, X = T2 - T1;
      if (X > 120) continue;
      const stem = 'In the first ' + n + ' months of the year, ' + who + ' saved an average of $' + A + ' a month. How much must ' + who +
        ' save in the next month to make the average for the ' + (n + 1) + ' months $' + B + '? (in dollars)';
      const q = money(finishTyped(stem, X, 'Saved so far = ' + n + ' × $' + A + ' = $' + T1 + '. Needed in total = ' + (n + 1) + ' × $' + B + ' = $' + T2 +
        '. Next month: $' + T2 + ' − $' + T1 + ' = $' + X + '.', '$'), X);
      problem(q, 'Work backwards', [
        'Start from the goal: an average of $' + B + ' over ' + (n + 1) + ' months needs ' + (n + 1) + ' × $' + B + ' = $' + T2 + ' altogether.',
        'Saved so far: ' + n + ' × $' + A + ' = $' + T1 + '.',
        'The next month must make up what is still missing from the total.',
        'Next month: $' + T2 + ' − $' + T1 + ' = <b>$' + X + '</b>.'
      ]);
      return slips(q, [[B, 'average-as-value'], [B - A, 'difference-of-averages'], [T2, 'answered-total']]);
    }
    return gNewAvg();
  }

  MQI.registerTopic({
    id: 'p6average', level: 'P6', strand: 'Statistics',
    moeSubTopic: 'Average of a Set of Data: average as ‘total value ÷ number of data’; relationship between average, total value and number of data',
    label: 'Average Atoll', short: 'Average', e: '📊',
    skills: {
      mean:    { label: 'Finding the average', tip: 'Add everything up, then share the total equally: divide by how many there are.' },
      total:   { label: 'Total from the average', tip: 'Total = average × number of data. Say it out loud before every average question.' },
      missing: { label: 'The missing value', tip: 'Find the total the average needs, then take away the values you already know.' },
      change:  { label: 'Joining and leaving', tip: 'Work out the total before and the total after. The change in the total is the one who joined or left.' }
    },
    misconceptions: {
      'total-not-divided':       'Gives the total instead of dividing it by the number of data.',
      'wrong-count':             'Divides or multiplies by the wrong number of data.',
      'ends-average':            'Averages only the smallest and largest values.',
      'middle-value':            'Takes the middle value as the average.',
      'largest-value':           'Picks the largest value as the average.',
      'added-count':             'Adds the number of data to the average instead of multiplying.',
      'average-as-total':        'Treats the average as the total.',
      'average-as-value':        'Gives an average when the question asks for one value.',
      'answered-total':          'Gives a total when the question asks for one value or an average.',
      'multiplied-instead':      'Multiplies the total by the average instead of dividing.',
      'subtracted-instead':      'Takes the average away from the total instead of dividing.',
      'average-as-count':        'Gives the average when the question asks for the number of data.',
      'difference-of-averages':  'Works with the change in the average instead of the change in the total.',
      'averaged-the-averages':   'Averages the old average and the new value as if each counted once.'
    },
    pools: {
      1: [[gAvgOfSetMC, 'mean'], [gTotalFromAvgMC, 'total'], [gMissingValue, 'missing']],
      2: [[gAvgWord, 'mean'], [gTotalTyped, 'total'], [gCountTyped, 'total'], [gMissingValue, 'missing']],
      3: [[gJoin, 'change'], [gLeave, 'change'], [gNewAvg, 'mean'], [gTarget, 'missing']]
    }
  });
})();
