"use strict";
/* Math Quest Island topic: algebra (P6). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, p.43, PRIMARY SIX,
 * SUB-STRAND: ALGEBRA 1):
 *   1.1 using a letter to represent an unknown number
 *   1.2 notation, representations and interpretation of simple algebraic expressions
 *       such as a ± 3, a × 3 or 3a, a ÷ 3 or a/3
 *   1.3 simplifying simple linear expressions excluding brackets
 *   1.4 evaluating simple linear expressions by substitution
 *   1.5 simple linear equations involving whole number coefficient only
 * Clamps: no item prints a bracket; every coefficient printed in a stem, an option or a
 * key is a positive whole number (no fractional coefficient, no negative coefficient in
 * an answer); every typed answer is a positive whole number. The letters m, g, l and h
 * are never used as unknowns, so an expression can never be read as a unit (5m, 3g).
 *
 * P5-P6 mirror (Sprint 1): every item carries q.syl = 'P6'. MCQ distractors carry
 * q.miscon + q.optionFeedback; typed items carry q.slips. Tags live in `misconceptions`.
 * Pool 3 is PSLE Paper 2 shape: band 3, worded, q.exam = 'problem', coached.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishTyped = G.finishTyped;

  const NAMES = ['Farid', 'Kavitha', 'Jun Hao', 'Siti', 'Ravi', 'Mei Ling', 'Ahmad',
                 'Bala', 'Xin Yi', 'Priya', 'Daniel', 'Nurul', 'Wei Jie', 'Aisyah'];
  const LETTERS = ['a', 'b', 'c', 'k', 'n', 'p', 'r', 't', 'w', 'y'];
  const P3_LETTERS = ['k', 'n', 'p', 't', 'w', 'y'];
  const two = () => { const a = pick(NAMES); let b = pick(NAMES); while (b === a) b = pick(NAMES); return [a, b]; };
  const P6 = q => (q.syl = 'P6', q);

  /* "3k", "k" (coefficient 1) */
  const T = (c, L) => (c === 1 ? L : c + L);
  /* linear expression c*L + d in house form: "3k + 7", "3k − 7", "3k" */
  const LIN = (c, d, L) => T(c, L) + (d > 0 ? ' + ' + d : d < 0 ? ' − ' + (-d) : '');

  function mcq(stem, key, dist, explain) {
    const seen = [key], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      if (!d || seen.indexOf(d[0]) !== -1) continue;
      seen.push(d[0]); keep.push(d);
    }
    if (keep.length < 3) return null;
    const rows = shuffle([[key, null, null]].concat(keep));
    const q = { q: stem, extra: '', choices: rows.map(r => r[0]), correct: 0, explain, answerText: key };
    q.correct = rows.findIndex(r => r[1] === null);
    q.miscon = {}; q.optionFeedback = {};
    rows.forEach((r, i) => { if (r[1]) { q.miscon[i] = r[1]; q.optionFeedback[i] = r[2]; } });
    return P6(q);
  }
  function slips(q, list) {
    const s = {};
    for (const [v, tag] of list) if (Number.isInteger(v) && v > 0 && v !== q.answer && !(String(v) in s)) s[String(v)] = tag;
    q.slips = s;
    return P6(q);
  }
  const money = (q, n) => (q.answerText = '$' + n, q);
  /* the "(in dollars, e.g. N)" hint never shows the key */
  const eg = ans => '(in dollars, e.g. ' + [12, 15, 20].filter(x => x !== ans)[0] + ')';

  /* ---------- 1.1 / 1.2: write an expression for a story (pool 1) ---------- */
  function gWriteExpr() {
    const N = pick(NAMES), L = pick(LETTERS), b = ri(2, 9), kind = pick(['add', 'sub', 'mul', 'div']);
    let stem, key, dist;
    if (kind === 'add') {
      stem = N + ' has ' + L + ' stickers. ' + N + '\'s friend gives ' + N + ' ' + b + ' more stickers. How many stickers does ' + N + ' have now?';
      key = L + ' + ' + b;
      dist = [[L + ' − ' + b, 'wrong-operation', 'Getting more stickers makes the number bigger, so add ' + b + '.'],
              [b + L, 'times-for-plus', b + L + ' means ' + b + ' × ' + L + '. ' + N + ' gets just ' + b + ' more, so add.'],
              [b + ' − ' + L, 'order-reversed', 'Start from what ' + N + ' has, ' + L + ', then add the ' + b + ' new stickers.']];
    } else if (kind === 'sub') {
      stem = N + ' has ' + L + ' stickers. ' + N + ' gives away ' + b + ' stickers. How many stickers does ' + N + ' have left?';
      key = L + ' − ' + b;
      dist = [[b + ' − ' + L, 'order-reversed', 'Start from what ' + N + ' has, ' + L + ', then take away ' + b + '.'],
              [L + ' + ' + b, 'wrong-operation', 'Giving stickers away leaves fewer, so take away ' + b + '.'],
              [b + L, 'wrong-operation', b + L + ' means ' + b + ' × ' + L + '. Giving some away is taking away.']];
    } else if (kind === 'mul') {
      stem = 'There are ' + L + ' pencils in each box. ' + N + ' buys ' + b + ' boxes. How many pencils does ' + N + ' buy?';
      key = b + L;
      dist = [[L + ' + ' + b, 'wrong-operation', b + ' boxes with ' + L + ' pencils in each is ' + b + ' groups of ' + L + ', so multiply.'],
              [L + ' ÷ ' + b, 'wrong-operation', 'Nothing is being shared here. ' + b + ' equal boxes means ' + b + ' × ' + L + '.'],
              [L + ' − ' + b, 'wrong-operation', 'Buying more boxes gives more pencils. ' + b + ' groups of ' + L + ' is ' + b + L + '.']];
    } else {
      stem = N + ' shares ' + L + ' sweets equally among ' + b + ' friends. How many sweets does each friend get?';
      key = L + ' ÷ ' + b;
      dist = [[b + ' ÷ ' + L, 'order-reversed', 'The ' + L + ' sweets are being shared, so ' + L + ' comes first: ' + L + ' ÷ ' + b + '.'],
              [b + L, 'wrong-operation', 'Sharing equally means dividing, not multiplying.'],
              [L + ' − ' + b, 'wrong-operation', 'Each friend gets an equal share, so divide ' + L + ' by ' + b + '.']];
    }
    return mcq(stem, key, dist, 'The unknown number is ' + L + '. The story gives ' + key + '.') || gWriteExpr();
  }

  /* ---------- 1.2: interpret notation (pool 1) ---------- */
  function gMeaning() {
    const L = pick(LETTERS), k = ri(2, 9), kind = pick(['coef', 'coef', 'div', 'slash', 'less', 'more', 'times']);
    let stem, key, dist, explain;
    if (kind === 'coef') {
      stem = 'Which of these means the same as ' + k + L + '?';
      key = k <= 4 ? Array(k).fill(L).join(' + ') : k + ' × ' + L;
      dist = [[k + ' + ' + L, 'juxtapose-add', k + L + ' means ' + k + ' × ' + L + ', not ' + k + ' + ' + L + '.'],
              [L + ' ÷ ' + k, 'wrong-operation', 'A number written in front of a letter multiplies it.'],
              [L + ' − ' + k, 'wrong-operation', k + L + ' means ' + k + ' groups of ' + L + '.'],
              [L + ' + ' + k, 'juxtapose-add', k + L + ' is ' + k + ' lots of ' + L + ', so it is ' + k + ' × ' + L + '.']];
      explain = k + L + ' means ' + k + ' × ' + L + (k <= 4 ? ', which is ' + key + '.' : '.');
    } else if (kind === 'div') {
      stem = 'Which of these means the same as ' + L + ' ÷ ' + k + '?';
      key = L + '/' + k;
      dist = [[k + '/' + L, 'order-reversed', L + ' ÷ ' + k + ' puts ' + L + ' on top: ' + L + '/' + k + '.'],
              [k + L, 'wrong-operation', k + L + ' means ' + k + ' × ' + L + ', not a division.'],
              [L + ' − ' + k, 'wrong-operation', 'Dividing by ' + k + ' is not the same as taking away ' + k + '.']];
      explain = L + ' ÷ ' + k + ' can be written as the fraction ' + L + '/' + k + '.';
    } else if (kind === 'slash') {
      stem = 'Which of these means the same as ' + L + '/' + k + '?';
      key = L + ' ÷ ' + k;
      dist = [[k + ' ÷ ' + L, 'order-reversed', 'The top of the fraction is divided by the bottom: ' + L + ' ÷ ' + k + '.'],
              [k + ' × ' + L, 'wrong-operation', 'A fraction line means divide.'],
              [L + ' − ' + k, 'wrong-operation', 'A fraction line means divide, not take away.']];
      explain = L + '/' + k + ' means ' + L + ' divided by ' + k + '.';
    } else if (kind === 'less') {
      stem = 'Which expression means "' + k + ' less than ' + L + '"?';
      key = L + ' − ' + k;
      dist = [[k + ' − ' + L, 'order-reversed', '"' + k + ' less than ' + L + '" starts from ' + L + ' and takes ' + k + ' away.'],
              [L + ' + ' + k, 'wrong-operation', '"Less than" means take away.'],
              [k + L, 'wrong-operation', k + L + ' means ' + k + ' × ' + L + '. "Less than" means take away.']];
      explain = 'Start with ' + L + ' and take away ' + k + ': ' + key + '.';
    } else if (kind === 'more') {
      stem = 'Which expression means "' + k + ' more than ' + L + '"?';
      key = L + ' + ' + k;
      dist = [[L + ' − ' + k, 'wrong-operation', '"More than" means add.'],
              [k + L, 'times-for-plus', k + L + ' means ' + k + ' × ' + L + '. "' + k + ' more" means add ' + k + '.'],
              [k + ' − ' + L, 'order-reversed', '"More than" means add ' + k + ' to ' + L + '.']];
      explain = 'Start with ' + L + ' and add ' + k + ': ' + key + '.';
    } else {
      stem = 'Which expression means "' + L + ' multiplied by ' + k + '"?';
      key = k + L;
      dist = [[L + ' + ' + k, 'wrong-operation', 'Multiplied by ' + k + ' means ' + k + ' × ' + L + ', written ' + k + L + '.'],
              [L + ' ÷ ' + k, 'wrong-operation', 'Multiplying is not dividing.'],
              [L + ' − ' + k, 'wrong-operation', 'Multiplied by ' + k + ' means ' + k + ' groups of ' + L + '.']];
      explain = L + ' × ' + k + ' is written ' + k + L + ', number first.';
    }
    return mcq(stem, key, dist, explain) || gMeaning();
  }

  /* ---------- 1.3: simplify (pool 1 easy, pool 2 harder) ---------- */
  /* terms: [[sign, coef, isLetter]], first sign +. Returns key + distractors. */
  function simplifyItem(terms, L) {
    const show = terms.map((t, i) => (i === 0 ? '' : t[0] > 0 ? ' + ' : ' − ') + (t[2] ? T(t[1], L) : t[1])).join('');
    let c = 0, d = 0, cAbs = 0, dAbs = 0, all = 0;
    for (const [s, v, isL] of terms) { if (isL) { c += s * v; cAbs += v; } else { d += s * v; dAbs += v; } all += s * v; }
    const key = LIN(c, d, L);
    const dist = [
      all > 0 && dAbs > 0 ? [T(all, L), 'unlike-terms', 'Only the ' + L + ' terms can be put together. The number ' + (d > 0 ? 'stays on its own' : 'stays separate') + '.'] : null,
      cAbs !== c ? [LIN(cAbs, d, L), 'sign-slip', 'Look at the sign in front of each ' + L + ' term: a minus means take that many ' + L + ' away.'] : null,
      dAbs !== Math.abs(d) || (d < 0 && dAbs > 0) ? [LIN(c, dAbs, L), 'sign-slip', 'Look at the sign in front of each number: a minus means take it away.'] : null,
      dAbs > 0 && c + d > 0 ? [String(c + d), 'dropped-letter', 'The letter does not disappear. Keep ' + T(c, L) + ' and the number apart.'] : null,
      dAbs > 0 ? [LIN(c + 1, d, L), 'miscount', 'Count the ' + L + ' terms again, using each sign.'] : null,
      dAbs === 0 ? [String(c), 'dropped-letter', 'The answer is still a number of ' + L + '\'s, so keep the letter: ' + T(c, L) + '.'] : null,
      dAbs === 0 ? [L + ' + ' + c, 'times-for-plus', T(c, L) + ' means ' + c + ' × ' + L + ', which is not ' + L + ' + ' + c + '.'] : null,
      dAbs === 0 && c > 1 ? [T(c + 1, L), 'miscount', 'Count the ' + L + ' terms again, using each sign.'] : null,
      dAbs === 0 && c > 2 ? [T(c - 1, L), 'miscount', 'Count every ' + L + ', including the first one.'] : null,
      d !== 0 ? [LIN(c, -d, L), 'sign-slip', 'Check the sign of the number: it keeps the sign written in front of it.'] : null
    ];
    return { show, key, dist, c, d };
  }
  function gSimplify(level) {
    const L = pick(LETTERS);
    let terms;
    for (let tries = 0; tries < 200; tries++) {
      const a = ri(2, 9), b = ri(1, 8), c = ri(2, 12), d = ri(1, 9), e = ri(1, 6);
      const f = level === 1 ? pick(['plus', 'minus', 'same', 'plusc']) : pick(['abcd', 'mixc', 'three', 'minusc', 'cfirst']);
      if (f === 'plus') terms = [[1, a, 1], [1, b, 1]];
      else if (f === 'minus') { if (b >= a) continue; terms = [[1, a, 1], [-1, b, 1]]; }
      else if (f === 'same') { const n = ri(3, 5); terms = Array(n).fill([1, 1, 1]); }
      else if (f === 'plusc') terms = [[1, a, 1], [1, c, 0], [1, b, 1]];
      else if (f === 'abcd') { if (c <= d) continue; terms = [[1, a, 1], [1, c, 0], [1, b, 1], [-1, d, 0]]; }
      else if (f === 'mixc') { if (b >= a) continue; terms = [[1, a, 1], [-1, b, 1], [1, c, 0]]; }
      else if (f === 'three') { if (a + b <= e) continue; terms = [[1, a, 1], [1, b, 1], [-1, e, 1]]; }
      else if (f === 'minusc') { if (b >= a) continue; terms = [[1, a, 1], [1, c, 0], [-1, b, 1], [1, d, 0]]; }
      else { if (b >= a) continue; terms = [[1, c, 0], [1, a, 1], [-1, b, 1]]; }
      break;
    }
    const it = simplifyItem(terms, L);
    const out = mcq('Simplify ' + it.show + '.', it.key, it.dist,
      'Put the ' + L + ' terms together' + (it.d !== 0 ? ' and the numbers together' : '') + ': ' + it.show + ' = ' + it.key + '.');
    return out || gSimplify(level);
  }
  const gSimplify1 = () => gSimplify(1);
  const gSimplify2 = () => gSimplify(2);

  /* ---------- 1.4: evaluate by substitution, typed (pools 1 and 2) ---------- */
  function gEvaluate(level) {
    const L = pick(LETTERS);
    for (;;) {
      const a = ri(2, 9), b = ri(1, 20), V = ri(2, 12);
      const f = level === 1 ? pick(['ap', 'am', 'pl']) : pick(['ap', 'am', 'div', 'back', 'two']);
      let expr, ans, sl = [];
      if (f === 'ap') { expr = a + L + ' + ' + b; ans = a * V + b; sl = [[a + V + b, 'times-for-plus'], [a * V, 'dropped-term']]; if (V < 10) sl.push([(a * 10 + V) + b, 'juxtapose']); }
      else if (f === 'am') { if (a * V <= b) continue; expr = a + L + ' − ' + b; ans = a * V - b; sl = [[a * V + b, 'sign-slip'], [a + V - b, 'times-for-plus']]; if (V < 10) sl.push([(a * 10 + V) - b, 'juxtapose']); }
      else if (f === 'pl') { expr = L + ' + ' + b; ans = V + b; sl = [[V * b, 'wrong-operation'], [V, 'dropped-term']]; }
      else if (f === 'div') { const W = a * V; expr = L + ' ÷ ' + a + ' + ' + b; ans = V + b; sl = [[W * a + b, 'wrong-operation'], [W - a + b, 'wrong-operation'], [V, 'dropped-term']];
        const q1 = finishTyped('Find the value of ' + expr + ' when ' + L + ' = ' + W + '.', ans,
          'Replace ' + L + ' with ' + W + ': ' + W + ' ÷ ' + a + ' + ' + b + ' = ' + V + ' + ' + b + ' = ' + ans + '.');
        return slips(q1, sl); }
      else if (f === 'back') { const c = ri(3, 9) * 10; if (a * V >= c) continue; expr = c + ' − ' + a + L; ans = c - a * V; sl = [[c + a * V, 'sign-slip'], [c - a - V, 'times-for-plus'], [a * V, 'dropped-term']]; }
      else { const e = ri(2, 6); expr = a + L + ' + ' + e + L + ' + ' + b; ans = (a + e) * V + b; sl = [[(a + e) * V, 'dropped-term'], [a * V + e + b, 'miscount'], [a + e + V + b, 'times-for-plus']]; }
      const q1 = finishTyped('Find the value of ' + expr + ' when ' + L + ' = ' + V + '.', ans,
        'Replace ' + L + ' with ' + V + ' in ' + expr + '. A number written next to the letter multiplies it. The value is ' + ans + '.');
      return slips(q1, sl);
    }
  }
  const gEvaluate1 = () => gEvaluate(1);
  const gEvaluate2 = () => gEvaluate(2);

  /* ---------- 1.5: solve a linear equation, typed (pools 1 and 2) ---------- */
  function gSolve(level) {
    const L = pick(LETTERS);
    for (;;) {
      const a = ri(2, 9), b = ri(1, 30), V = ri(2, 15);
      const f = level === 1 ? pick(['plus', 'times', 'minus1']) : pick(['ap', 'am', 'ap', 'two']);
      if (V === a || V === b) continue;      /* the key never repeats a printed number */
      let lhs, c, sl = [];
      if (f === 'plus') { lhs = L + ' + ' + b; c = V + b; sl = [[c + b, 'inverse-sign']]; }
      else if (f === 'minus1') { const bb = ri(1, 9), VV = ri(2 * bb + 1, 2 * bb + 20); lhs = L + ' − ' + bb; c = VV - bb;
        const q0 = finishTyped('Solve the equation ' + lhs + ' = ' + c + '. What is the value of ' + L + '?', VV,
          'Undo the taking away: ' + c + ' + ' + bb + ' = ' + VV + ', so ' + L + ' = ' + VV + '.');
        return slips(q0, [[c - bb, 'inverse-sign'], [c, 'dropped-term']]); }
      else if (f === 'times') { lhs = a + L; c = a * V; sl = [[c - a, 'wrong-operation'], [c * a, 'inverse-sign']]; }
      else if (f === 'ap') { lhs = a + L + ' + ' + b; c = a * V + b; sl = [[c - b, 'stopped-early'], [(c + b) / a, 'inverse-sign'], [c / a, 'undo-order']]; }
      else if (f === 'am') { lhs = a + L + ' − ' + b; c = a * V - b; if (c < 1) continue; sl = [[c + b, 'stopped-early'], [(c - b) / a, 'inverse-sign'], [c / a, 'undo-order']]; }
      else { const e = ri(1, 6); if (V === e) continue; lhs = a + L + ' + ' + T(e, L); c = (a + e) * V; sl = [[c / a, 'miscount'], [c - a - e, 'wrong-operation']]; }
      const q1 = finishTyped('Solve the equation ' + lhs + ' = ' + c + '. What is the value of ' + L + '?', V,
        'Undo each step in reverse order. ' + lhs + ' = ' + c + ' gives ' + L + ' = ' + V + '. Check: put ' + V + ' back in and you get ' + c + '.');
      return slips(q1, sl);
    }
  }
  const gSolve1 = () => gSolve(1);
  const gSolve2 = () => gSolve(2);

  /* ---------- 1.1 / 1.2: two-step story expression, MCQ (pool 2) ---------- */
  function gStoryExpr() {
    const N = pick(NAMES), L = pick(LETTERS), a = ri(2, 6), b = ri(2, 9);
    let stem;
    if (Math.random() < 0.5) {
      stem = 'A notebook costs $' + L + '. ' + N + ' buys ' + a + ' notebooks and a pen that costs $' + b + '. How much does ' + N + ' spend altogether, in dollars?';
    } else {
      stem = N + ' is ' + L + ' years old. ' + N + '\'s mother is ' + a + ' times as old as ' + N + '. How old will ' + N + '\'s mother be in ' + b + ' years\' time?';
    }
    const key = a + L + ' + ' + b;
    const out = mcq(stem, key, [
      [(a + b) + L, 'unlike-terms', a + L + ' and ' + b + ' cannot be put together: one has a letter, the other does not.'],
      [L + ' + ' + (a + b), 'times-for-plus', a + ' times as much is ' + a + ' × ' + L + ', written ' + a + L + '.'],
      [a + L + ' − ' + b, 'wrong-operation', 'The extra ' + b + ' is added on, not taken away.'],
      [b + L + ' + ' + a, 'order-reversed', 'The ' + a + ' multiplies ' + L + '; the ' + b + ' is added on.']
    ], 'First ' + a + ' × ' + L + ' = ' + a + L + ', then add ' + b + ': ' + key + '.');
    return out || gStoryExpr();
  }

  /* ---------- Paper 2: ages in terms of n, then substitute (pool 3, band 3) ---------- */
  function gAgeTotal() {
    const N = pick(NAMES), L = pick(P3_LETTERS), older = Math.random() < 0.5;
    let a, b, V;
    do { a = ri(3, 6); b = ri(2, 9); V = ri(b + 3, 14); } while (a * V < 25 || a * V > 60 || (a - 1) * V < 20);   /* a believable father */
    const sib = older ? 'brother' : 'sister', s = older ? 1 : -1;
    const ans = (a + 2) * V + s * b, P = (a + 2) * V;
    const stem = N + ' is ' + L + ' years old. ' + N + '\'s father is ' + a + ' times as old as ' + N + '. ' + N + '\'s ' + sib + ' is ' + b +
      ' years ' + (older ? 'older' : 'younger') + ' than ' + N + '. Find the total of their three ages when ' + L + ' = ' + V + '.';
    const sibE = L + (older ? ' + ' : ' − ') + b;
    const q1 = finishTyped(stem, ans,
      'Total = ' + L + ' + ' + a + L + ' + ' + sibE + ' = ' + LIN(a + 2, s * b, L) + '. When ' + L + ' = ' + V + ', that is ' + P + (older ? ' + ' : ' − ') + b + ' = ' + ans + '.', 'years');
    q1.band = 3; q1.exam = 'problem';
    q1.technique = 'Draw a model';
    q1.steps = [
      'Draw 1 bar for ' + N + ', who is ' + L + ' years old, and ' + a + ' bars of the same size for the father: ' + a + L + ' years.',
      'The ' + sib + ' is ' + sibE + ' years old.',
      'Add the three ages: ' + L + ' + ' + a + L + ' + ' + sibE + ' = ' + LIN(a + 2, s * b, L) + '.',
      'Put in ' + L + ' = ' + V + ': ' + (a + 2) + ' × ' + V + ' = ' + P + '.',
      'So the total is ' + P + (older ? ' + ' : ' − ') + b + ' = <b>' + ans + '</b> years.'
    ];
    return slips(q1, [[(a + 1) * V + s * b, 'missed-term'], [P - s * b, 'sign-slip'], [P, 'dropped-term'], [(a + 2) + V + s * b, 'times-for-plus']]);
  }

  /* ---------- Paper 2: cost of x items, then change (pool 3, band 3) ---------- */
  function gCostChange() {
    const N = pick(NAMES), L = pick(P3_LETTERS);
    for (;;) {
      const p = ri(2, 6), r = ri(2, 4), f = ri(2, 5), V = ri(2, 9), note = pick([50, 100]);
      const K = p + r * f, KV = K * V, ans = note - KV;
      if (ans < 2) continue;
      const stem = 'A pen costs $' + L + '. A file costs ' + r + ' times as much as a pen. ' + N + ' buys ' + p + ' pens and ' + f +
        ' files, and pays with a $' + note + ' note. How much change does ' + N + ' receive when ' + L + ' = ' + V + '? ' + eg(ans);
      const q1 = money(finishTyped(stem, ans,
        'Total cost = ' + p + L + ' + ' + (r * f) + L + ' = ' + K + L + ' dollars. When ' + L + ' = ' + V + ', that is $' + KV + ', so the change is $' + note + ' − $' + KV + ' = $' + ans + '.', '$'), ans);
      q1.band = 3; q1.exam = 'problem';
      q1.technique = 'Draw a model';
      q1.steps = [
        'The pens cost ' + p + L + ' dollars. One file costs ' + r + L + ' dollars, so ' + f + ' files cost ' + (r * f) + L + ' dollars.',
        'Total cost: ' + p + L + ' + ' + (r * f) + L + ' = ' + K + L + ' dollars.',
        'Put in ' + L + ' = ' + V + ': ' + K + ' × ' + V + ' = ' + KV + ', so the total is $' + KV + '.',
        'Change: $' + note + ' − $' + KV + ' = <b>$' + ans + '</b>.'
      ];
      return slips(q1, [[KV, 'answered-total'], [note - (p + f) * V, 'missed-term'], [note - (p + r + f) * V, 'times-for-plus']]);
    }
  }

  /* ---------- Paper 2: perimeter in terms of y, then evaluate (pool 3, band 3) ---------- */
  function gPerimeter() {
    const L = pick(P3_LETTERS);
    if (Math.random() < 0.5) {
      for (;;) {
        const a = ri(2, 5), b = ri(2, 9), V = ri(3, 12);
        if (a * V - b < 2) continue;
        const ans = 4 * a * V - 2 * b, X = 4 * a * V;
        const br = T(a, L) + ' − ' + b;
        const stem = 'A rectangle is ' + T(a, L) + ' cm long. Its breadth is ' + b + ' cm shorter than its length. Find the perimeter of the rectangle when ' + L + ' = ' + V + '.';
        const q1 = finishTyped(stem, ans,
          'Perimeter = ' + T(a, L) + ' + ' + T(a, L) + ' + ' + br + ' + ' + br + ' = ' + LIN(4 * a, -2 * b, L) + ' cm. When ' + L + ' = ' + V + ', that is ' + X + ' − ' + (2 * b) + ' = ' + ans + ' cm.', 'cm');
        q1.band = 3; q1.exam = 'problem';
        q1.technique = 'Sketch and label';
        q1.steps = [
          'Sketch the rectangle. Label the length ' + T(a, L) + ' cm and the breadth ' + br + ' cm.',
          'Add all four sides: ' + T(a, L) + ' + ' + T(a, L) + ' + ' + br + ' + ' + br + ' = ' + LIN(4 * a, -2 * b, L) + ' cm.',
          'Put in ' + L + ' = ' + V + ': ' + (4 * a) + ' × ' + V + ' = ' + X + '.',
          'The perimeter is ' + X + ' − ' + (2 * b) + ' = <b>' + ans + '</b> cm.'
        ];
        return slips(q1, [[2 * a * V - b, 'half-perimeter'], [X + 2 * b, 'sign-slip'], [X, 'dropped-term']]);
      }
    }
    let a, b, V;
    do { a = ri(2, 5); b = ri(2, 9); V = ri(2, 12); } while (a * V <= b);   /* triangle inequality: aV + aV > aV + b */
    const ans = 3 * a * V + b, X = 3 * a * V;
    const stem = 'Each of the two equal sides of an isosceles triangle is ' + T(a, L) + ' cm long. The third side is ' + b +
      ' cm longer than one of the equal sides. Find the perimeter of the triangle when ' + L + ' = ' + V + '.';
    const th = T(a, L) + ' + ' + b;
    const q1 = finishTyped(stem, ans,
      'Perimeter = ' + T(a, L) + ' + ' + T(a, L) + ' + ' + th + ' = ' + LIN(3 * a, b, L) + ' cm. When ' + L + ' = ' + V + ', that is ' + X + ' + ' + b + ' = ' + ans + ' cm.', 'cm');
    q1.band = 3; q1.exam = 'problem';
    q1.technique = 'Sketch and label';
    q1.steps = [
      'Sketch the triangle. Label the two equal sides ' + T(a, L) + ' cm and the third side ' + th + ' cm.',
      'Add the three sides: ' + T(a, L) + ' + ' + T(a, L) + ' + ' + th + ' = ' + LIN(3 * a, b, L) + ' cm.',
      'Put in ' + L + ' = ' + V + ': ' + (3 * a) + ' × ' + V + ' = ' + X + '.',
      'The perimeter is ' + X + ' + ' + b + ' = <b>' + ans + '</b> cm.'
    ];
    return slips(q1, [[2 * a * V + b, 'missed-term'], [X - b, 'sign-slip'], [X, 'dropped-term']]);
  }

  /* ---------- Paper 2: an equation from a story (pool 3, band 3) ---------- */
  function gStoryEquation() {
    const [N, N2] = two(), L = pick(P3_LETTERS), kind = pick(['think', 'thinkm', 'buy', 'age']);
    const a = ri(3, 9), b = ri(4, 40), V = ri(4, 25);
    if (V === a || V === b) return gStoryEquation();
    if (kind === 'think' || kind === 'thinkm') {
      const plus = kind === 'think', c = plus ? a * V + b : a * V - b;
      if (c < 2) return gStoryEquation();
      const stem = N + ' thinks of a whole number ' + L + '. ' + N + ' multiplies it by ' + a + ' and then ' + (plus ? 'adds ' : 'subtracts ') + b +
        '. The result is ' + c + '. What is the value of ' + L + '?';
      const X = a * V;
      const q1 = finishTyped(stem, V, 'The equation is ' + a + L + (plus ? ' + ' : ' − ') + b + ' = ' + c + '. Work backwards: ' + c + (plus ? ' − ' : ' + ') + b + ' = ' + X + ', and ' + X + ' ÷ ' + a + ' = ' + V + '.');
      q1.band = 3; q1.exam = 'problem';
      q1.technique = 'Work backwards';
      q1.steps = [
        'Write the story as an equation: ' + a + L + (plus ? ' + ' : ' − ') + b + ' = ' + c + '.',
        'Undo the last step first: ' + c + (plus ? ' − ' : ' + ') + b + ' = ' + X + ', so ' + a + L + ' is ' + X + '.',
        'Undo the multiplying: ' + X + ' ÷ ' + a + ' = <b>' + V + '</b>.'
      ];
      return slips(q1, [[X, 'stopped-early'], [plus ? (c + b) / a : (c - b) / a, 'inverse-sign'], [c / a, 'undo-order']]);
    }
    if (kind === 'buy') {
      const c = a * V + b;
      const stem = N + ' buys ' + a + ' identical files at $' + L + ' each and a bag that costs $' + b + '. ' + N + ' spends $' + c +
        ' altogether. Find the value of ' + L + '. ' + eg(V);
      const X = a * V;
      const q1 = money(finishTyped(stem, V, a + L + ' + ' + b + ' = ' + c + ', so ' + a + L + ' = ' + c + ' − ' + b + ' = ' + X + ' and ' + L + ' = ' + X + ' ÷ ' + a + ' = ' + V + '.', '$'), V);
      q1.band = 3; q1.exam = 'problem';
      q1.technique = 'Work backwards';
      q1.steps = [
        'The files cost ' + a + L + ' dollars, so the equation is ' + a + L + ' + ' + b + ' = ' + c + '.',
        'Take away the bag: ' + c + ' − ' + b + ' = ' + X + ', so ' + a + L + ' is ' + X + '.',
        'One file: ' + X + ' ÷ ' + a + ' = <b>$' + V + '</b>.'
      ];
      return slips(q1, [[X, 'stopped-early'], [(c + b) / a, 'inverse-sign'], [c / a, 'undo-order']]);
    }
    /* a believable second person: another child under 25; a parent when 25..60 and at
       least 20 years older; a grandparent when 61..75 and at least 45 years older */
    let k, P2, tries = 0;
    for (;;) {
      k = ri(2, 6); const age = k * V, gap = (k - 1) * V;
      if (++tries > 200) return gStoryEquation();
      if (age < 25) { P2 = N2; break; }
      if (age <= 60 && gap >= 20) { P2 = N + '\'s ' + pick(['mother', 'father']); break; }
      if (age > 60 && age <= 75 && gap >= 45) { P2 = N + '\'s ' + pick(['grandmother', 'grandfather']); break; }
    }
    const c = (k + 1) * V;
    const stem = N + ' is ' + L + ' years old. ' + P2 + ' is ' + k + ' times as old as ' + N + '. The sum of their ages is ' + c +
      ' years. What is the value of ' + L + '?';
    const q1 = finishTyped(stem, V, L + ' + ' + k + L + ' = ' + (k + 1) + L + ' = ' + c + ', so ' + L + ' = ' + c + ' ÷ ' + (k + 1) + ' = ' + V + '.', 'years');
    q1.band = 3; q1.exam = 'problem';
    q1.technique = 'Work backwards';
    q1.steps = [
      P2 + ' is ' + k + L + ' years old.',
      'The sum of their ages is ' + L + ' + ' + k + L + ' = ' + (k + 1) + L + ', so ' + (k + 1) + L + ' is ' + c + '.',
      'Divide: ' + c + ' ÷ ' + (k + 1) + ' = <b>' + V + '</b>.'
    ];
    return slips(q1, [[c / k, 'miscount'], [k * V, 'answered-other'], [c - k, 'wrong-operation']]);
  }

  MQI.registerTopic({
    id: 'algebra', level: 'P6', strand: 'Number and Algebra',
    moeSubTopic: 'Algebra: using a letter to represent an unknown number; notation, representations and interpretation of simple algebraic expressions; simplifying simple linear expressions excluding brackets; evaluating simple linear expressions by substitution; simple linear equations involving whole number coefficient only',
    label: 'Algebra Atoll', short: 'Algebra', e: '🌀',
    skills: {
      write:     { label: 'Letters for numbers', tip: 'Tell the story with a number first (say 10), then swap the 10 for the letter.' },
      notation:  { label: 'Reading expressions', tip: 'A number stuck to a letter multiplies it: 3k is 3 × k, never 3 + k.' },
      simplify:  { label: 'Simplifying', tip: 'Circle the letter terms with their signs, put them together, and leave the numbers on their own.' },
      evaluate:  { label: 'Substitution', tip: 'Rewrite the expression with the number in place of the letter and a × sign where they touched.' },
      solve:     { label: 'Solving equations', tip: 'Undo the steps in reverse order, then put the answer back in to check it.' },
      problems:  { label: 'Algebra word problems', tip: 'Write each quantity in terms of the letter first, add them up, then substitute.' }
    },
    misconceptions: {
      'wrong-operation':  'Picks an operation that does not match the story or the symbol.',
      'order-reversed':   'Writes the terms of a subtraction or division the wrong way round.',
      'times-for-plus':   'Treats "3k" and "k + 3" as the same, mixing up multiplying and adding.',
      'juxtapose-add':    'Reads a number written next to a letter as adding.',
      'juxtapose':        'Substitutes by writing the digits side by side (4n with n = 6 read as 46).',
      'unlike-terms':     'Combines a letter term with a plain number.',
      'sign-slip':        'Ignores or flips the sign in front of a term.',
      'dropped-letter':   'Drops the letter and gives a plain number.',
      'dropped-term':     'Leaves out one of the terms.',
      'miscount':         'Miscounts how many of the letter there are.',
      'inverse-sign':     'Undoes a step with the same operation instead of its inverse.',
      'stopped-early':    'Undoes only one step of a two-step equation.',
      'undo-order':       'Undoes the multiplying before the adding or taking away.',
      'missed-term':      'Leaves out one person\'s or one item\'s share when writing the total.',
      'half-perimeter':   'Adds only two of the sides instead of going all the way round.',
      'answered-total':   'Gives the total cost when the question asks for the change.',
      'answered-other':   'Gives the other person\'s value instead of the unknown asked for.'
    },
    pools: {
      1: [[gWriteExpr, 'write'], [gMeaning, 'notation'], [gSimplify1, 'simplify'], [gEvaluate1, 'evaluate'], [gSolve1, 'solve']],
      2: [[gStoryExpr, 'write'], [gSimplify2, 'simplify'], [gEvaluate2, 'evaluate'], [gSolve2, 'solve']],
      3: [[gAgeTotal, 'problems'], [gCostChange, 'problems'], [gPerimeter, 'problems'], [gStoryEquation, 'solve']]
    }
  });
})();
