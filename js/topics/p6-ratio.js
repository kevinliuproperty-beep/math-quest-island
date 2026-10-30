"use strict";
/* Math Quest Island topic: p6ratio (P6). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, p.43, PRIMARY SIX,
 * SUB-STRAND: RATIO 1):
 *   1.1 notation, representations and interpretation of a:b and a:b:c, where a, b and c
 *       are whole numbers, excluding ratios involving fractions and decimals
 *   1.2 equivalent ratios
 *   1.3 dividing a quantity in a given ratio
 *   1.4 expressing a ratio in its simplest form
 *   1.5 finding the ratio of two or three given quantities
 *   1.6 finding the missing term in a pair of equivalent ratios
 *   1.7 relationship between fraction and ratio
 * Every term printed in a ratio is a whole number (1.1's exclusion), so no item writes
 * a ratio of fractions or decimals. Every answer is a whole number.
 *
 * P5-P6 mirror (Sprint 1, 2026-10-28): every item carries q.syl = 'P6'. MCQ distractors
 * carry q.miscon = { choiceIndex: tag } and a coaching line in q.optionFeedback; typed
 * items carry q.slips = { '<wrong value>': tag } for the slips a child typically types,
 * so a wrong typed answer can be diagnosed, not just marked. Tags are defined once, in
 * the topic's `misconceptions` map below. Pool 3 is PSLE Paper 2 shape: band 3, worded,
 * q.exam = 'problem', coached with a model or before-after walk-through.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr,
        finishTyped = G.finishTyped;

  const NAMES = ['Hui Min', 'Farid', 'Kavitha', 'Jun Hao', 'Siti', 'Ravi', 'Mei Ling', 'Ahmad',
                 'Bala', 'Xin Yi', 'Daniel', 'Nurul', 'Wei Jie', 'Aisyah'];
  const two = () => { const a = pick(NAMES); let b = pick(NAMES); while (b === a) b = pick(NAMES); return [a, b]; };
  const three = () => { const [a, b] = two(); let c = pick(NAMES); while (c === a || c === b) c = pick(NAMES); return [a, b, c]; };
  const R2 = (a, b) => a + ' : ' + b;
  const R3 = (a, b, c) => a + ' : ' + b + ' : ' + c;
  const g3 = (a, b, c) => gcd(gcd(a, b), c);
  const P6 = q => (q.syl = 'P6', q);

  /* MCQ with tagged distractors. dist = [[text, tag, coaching], ...]; the first three
     that differ from the key (and from each other) are kept. Returns null if fewer than
     three survive, and the caller redraws. */
  function mcq(stem, key, dist, explain) {
    const seen = [key], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      if (seen.indexOf(d[0]) !== -1) continue;
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
  /* typed slips: only whole, positive values that differ from the key */
  function slips(q, list) {
    const s = {};
    for (const [v, tag] of list) if (Number.isInteger(v) && v > 0 && v !== q.answer && !(String(v) in s)) s[String(v)] = tag;
    q.slips = s;
    return P6(q);
  }
  const money = (q, n) => (q.answerText = '$' + n, q);

  /* 1.5 / 1.4: the ratio of two given quantities, simplest form (pool 1) */
  function gRatioOfTwo() {
    const ITEMS = [['red beads', 'blue beads', 'In a box there are '], ['story books', 'comics', 'On a shelf there are '],
                   ['boys', 'girls', 'In a CCA group there are '], ['durians', 'mangoes', 'In a basket there are '], ['ducks', 'swans', 'In a pond there are ']];
    const it = pick(ITEMS);
    let p = ri(1, 7), q = ri(2, 9);
    while (p === q || gcd(p, q) !== 1) { p = ri(1, 7); q = ri(2, 9); }
    const k = ri(2, 6), a = p * k, b = q * k;
    const where = it[2];
    const stem = where + a + ' ' + it[0] + ' and ' + b + ' ' + it[1] + '. What is the ratio of the number of ' + it[0] +
      ' to the number of ' + it[1] + '? Give it in its simplest form.';
    const out = mcq(stem, R2(p, q), [
      [R2(q, p), 'order-reversed', 'The ratio follows the order of the words: ' + it[0] + ' first, then ' + it[1] + '.'],
      [R2(a, b), 'not-simplest', a + ' : ' + b + ' is right but not in its simplest form. Divide both terms by ' + k + '.'],
      [R2(p, p + q), 'part-whole', 'That compares the ' + it[0] + ' with ALL the items. The question compares ' + it[0] + ' with ' + it[1] + '.'],
      [R2(a, a + b), 'part-whole', 'That compares the ' + it[0] + ' with all the items, not with the ' + it[1] + '.']
    ], it[0] + ' : ' + it[1] + ' = ' + a + ' : ' + b + '. Both terms divide by ' + k + ', so the simplest form is ' + R2(p, q) + '.');
    return out || gRatioOfTwo();
  }

  /* 1.4: simplest form of a given ratio (pool 1) */
  function gSimplest() {
    let p = ri(1, 8), q = ri(2, 9);
    while (p === q || gcd(p, q) !== 1) { p = ri(1, 8); q = ri(2, 9); }
    const k = pick([4, 6, 8, 9, 12]), A = p * k, B = q * k;
    const d = pick([2, 3, 4, 6].filter(x => k % x === 0 && x < k));
    /* "take the same small amount off both terms": additive thinking, kept positive and not equivalent */
    const m = pick([1, 2, 3].filter(x => A - x > 0 && (A - x) * q !== (B - x) * p));
    const dist = [
      [R2(A / d, B / d), 'not-simplest', 'Both terms still share a factor. Keep dividing until only 1 goes into both.'],
      [R2(q, p), 'order-reversed', 'Keep the terms in the same order as the question: ' + A + ' first.'],
      [R2(A - m, B - m), 'additive', 'Taking the same number off both terms changes the ratio. Divide both terms by the same number instead.'],
      [R2(p, B), 'one-term-only', 'Only the first term was divided. Both terms must be divided by the same number.']
    ];
    const out = mcq('Express ' + R2(A, B) + ' in its simplest form.', R2(p, q), dist,
      'The highest common factor of ' + A + ' and ' + B + ' is ' + k + '. ' + A + ' ÷ ' + k + ' = ' + p + ' and ' + B + ' ÷ ' + k + ' = ' + q + ', so ' + R2(A, B) + ' = ' + R2(p, q) + '.');
    return out || gSimplest();
  }

  /* 1.2: equivalent ratios (pool 1) */
  function gEquivalent() {
    let p = ri(1, 7), q = ri(2, 9);
    while (p === q || gcd(p, q) !== 1) { p = ri(1, 7); q = ri(2, 9); }
    const m = ri(2, 7);
    const ok = (x, y) => x * q === y * p;
    const dist = [
      [p + m, q + m, 'additive', 'Adding the same number to both terms does not keep the ratio the same. Multiply both terms instead.'],
      [q * m, p * m, 'order-reversed', 'The terms have swapped places. The first term must stay ' + p + '-sized.'],
      [p * m, q, 'one-term-only', 'Only the first term was multiplied. Both terms must be multiplied by the same number.'],
      [p, q * m, 'one-term-only', 'Only the second term was multiplied. Both terms must be multiplied by the same number.']
    ].filter(d => !ok(d[0], d[1])).map(d => [R2(d[0], d[1]), d[2], d[3]]);
    const out = mcq('Which ratio is equivalent to ' + R2(p, q) + '?', R2(p * m, q * m), dist,
      'Multiply both terms of ' + R2(p, q) + ' by ' + m + ': ' + p + ' × ' + m + ' = ' + (p * m) + ' and ' + q + ' × ' + m + ' = ' + (q * m) + '.');
    return out || gEquivalent();
  }

  /* 1.6: the missing term in a pair of equivalent ratios, typed (pools 1 and 2) */
  function gMissingTerm() {
    let p = ri(1, 8), q = ri(2, 9);
    while (p === q || gcd(p, q) !== 1) { p = ri(1, 8); q = ri(2, 9); }
    const m = ri(3, 9), first = Math.random() < 0.5;
    const stem = first
      ? 'Find the missing number: ' + R2(p, q) + ' = ? : ' + (q * m)
      : 'Find the missing number: ' + R2(p, q) + ' = ' + (p * m) + ' : ?';
    const ans = first ? p * m : q * m;
    const explain = first
      ? q + ' × ' + m + ' = ' + (q * m) + ', so multiply the first term by ' + m + ' too: ' + p + ' × ' + m + ' = ' + ans + '.'
      : p + ' × ' + m + ' = ' + (p * m) + ', so multiply the second term by ' + m + ' too: ' + q + ' × ' + m + ' = ' + ans + '.';
    const q1 = finishTyped(stem, ans, explain);
    return slips(q1, first
      ? [[p + q * m - q, 'additive'], [q * m - q, 'additive']]
      : [[q + p * m - p, 'additive'], [p * m - p, 'additive']]);
  }

  /* 1.5 / 1.1: the ratio of three given quantities (pool 2) */
  function gThreeTerm() {
    const [x, y, z] = three();
    let a = ri(1, 6), b = ri(1, 6), c = ri(1, 6);
    while (g3(a, b, c) !== 1 || a === b || b === c || a === c) { a = ri(1, 6); b = ri(1, 6); c = ri(1, 6); }
    const k = ri(2, 9) * 5;
    const A = a * k, B = b * k, C = c * k;
    const stem = x + ' has $' + A + ', ' + y + ' has $' + B + ' and ' + z + ' has $' + C + '. What is the ratio of ' +
      x + '\'s money to ' + y + '\'s money to ' + z + '\'s money in its simplest form?';
    const half = k % 2 === 0 ? 2 : 5;
    const out = mcq(stem, R3(a, b, c), [
      [R3(b, a, c), 'order-reversed', 'Follow the order of the names in the question: ' + x + ', then ' + y + ', then ' + z + '.'],
      [R3(A / half, B / half, C / half), 'not-simplest', 'All three terms still share a factor. Divide until only 1 goes into all three.'],
      [R3(a, b, a + b + c), 'part-whole', 'The last term should be ' + z + '\'s share, not the total of all three.'],
      [R3(c, b, a), 'order-reversed', 'Follow the order of the names in the question: ' + x + ' first.']
    ], 'Write ' + R3(A, B, C) + ' and divide every term by ' + k + ': ' + R3(a, b, c) + '.');
    return out || gThreeTerm();
  }

  /* 1.3: dividing a quantity in a given ratio, typed $ (pools 2 and 3) */
  function gDivide() {
    const [x, y] = two();
    let p = ri(1, 7), q = ri(2, 8);
    while (p === q || gcd(p, q) !== 1) { p = ri(1, 7); q = ri(2, 8); }
    const u = ri(4, 40), T = (p + q) * u, wantSecond = Math.random() < 0.5;
    const ans = (wantSecond ? q : p) * u, who = wantSecond ? y : x;
    const stem = '$' + T + ' is shared between ' + x + ' and ' + y + ' in the ratio ' + R2(p, q) +
      '. How much money does ' + who + ' get? (in dollars, e.g. 45)';
    const q1 = money(finishTyped(stem, ans,
      'There are ' + p + ' + ' + q + ' = ' + (p + q) + ' units. 1 unit = $' + T + ' ÷ ' + (p + q) + ' = $' + u +
      '. ' + who + ' gets ' + (wantSecond ? q : p) + ' units = $' + ans + '.', '$'), ans);
    q1.technique = 'Draw a model';
    q1.steps = [
      'Draw ' + p + ' units for ' + x + ' and ' + q + ' units for ' + y + '.',
      'Count all the units: ' + p + ' + ' + q + ' = ' + (p + q) + ' units.',
      'The ' + (p + q) + ' units are $' + T + ', so 1 unit is $' + T + ' ÷ ' + (p + q) + ' = $' + u + '.',
      who + ' gets ' + (wantSecond ? q : p) + ' units: ' + (wantSecond ? q : p) + ' × $' + u + ' = <b>$' + ans + '</b>.'
    ];
    return slips(q1, [[(wantSecond ? p : q) * u, 'wrong-part'], [u, 'one-unit-only']]);
  }

  /* 1.7: fraction of the whole from a ratio (pool 2) */
  function gFracOfWhole() {
    const G2 = [['boys', 'girls', 'a choir'], ['adults', 'children', 'a concert hall'], ['cats', 'dogs', 'an animal shelter']];
    const g = pick(G2);
    let p = ri(2, 7), q = ri(2, 8);
    while (p === q || gcd(p, q) !== 1) { p = ri(2, 7); q = ri(2, 8); }
    const second = Math.random() < 0.5, n = second ? q : p, o = second ? p : q, d = p + q;
    const who = second ? g[1] : g[0];
    const F = (a, b) => (b === 1 ? String(a) : fr(a, b));
    const stem = 'The ratio of the number of ' + g[0] + ' to the number of ' + g[1] + ' in ' + g[2] + ' is ' + R2(p, q) +
      '. What fraction of the ' + g[0] + ' and ' + g[1] + ' altogether are ' + who + '?';
    const dist = [
      [F(n, o), 'ratio-as-fraction', 'That fraction compares ' + who + ' with the others only. The question asks about ' + who + ' out of everyone.'],
      [F(o, d), 'wrong-part', 'That is the fraction for the other group. Check which group the question asks about.'],
      [F(o, n), 'ratio-as-fraction', 'A ratio is not a fraction of the whole. Add the terms to find the whole first.']
    ];
    const out = mcq(stem, F(n, d), dist,
      'There are ' + p + ' + ' + q + ' = ' + d + ' units altogether, and ' + n + ' of them are ' + who + '. So the fraction is ' + n + '/' + d + '.');
    if (out) { out.fracKey = [n, d]; return out; }
    return gFracOfWhole();
  }

  /* 1.7: ratio from a fraction statement (pool 2) */
  function gFracToRatio() {
    const [x, y] = two();
    let a = ri(1, 7), b = ri(3, 9);
    while (a >= b || gcd(a, b) !== 1 || b === 2 * a) { a = ri(1, 7); b = ri(3, 9); }
    /* [what, of whom] -> "the length of Siti's ribbon" */
    const thing = pick([
      n => 'the length of ' + n + '\'s ribbon',
      n => 'the mass of ' + n + '\'s bag of rice',
      n => 'the volume of water in ' + n + '\'s bottle']);
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const stem = cap(thing(x)) + ' is ' + fr(a, b) + ' of ' + thing(y) + '. What is the ratio of ' + thing(x) + ' to ' + thing(y) + '?';
    const out = mcq(stem, R2(a, b), [
      [R2(b, a), 'order-reversed', 'The ratio follows the order of the question: ' + x + ' first.'],
      [R2(a, a + b), 'part-whole', 'The fraction compares ' + x + ' with ' + y + ', not with the two together.'],
      [R2(b - a, b), 'complement', 'That is what is left over. The fraction ' + a + '/' + b + ' already gives ' + x + '\'s share.']
    ], 'If ' + thing(y) + ' is ' + b + ' units, ' + thing(x) + ' is ' + a + ' units. So the ratio is ' + R2(a, b) + '.');
    return out || gFracToRatio();
  }

  /* Paper 2 shape: the difference gives the unit (pool 3, band 3) */
  function gDiffToTotal() {
    const [x, y] = two();
    const OBJ = pick(['marbles', 'stickers', 'beads', 'books']);
    let p = ri(1, 7), q = ri(2, 9);
    while (p >= q || gcd(p, q) !== 1) { p = ri(1, 7); q = ri(2, 9); }
    const u = ri(6, 45), D = (q - p) * u, T = (p + q) * u;
    const stem = 'The ratio of the number of ' + OBJ + ' ' + x + ' has to the number of ' + OBJ + ' ' + y + ' has is ' + R2(p, q) +
      '. ' + y + ' has ' + D + ' more ' + OBJ + ' than ' + x + '. How many ' + OBJ + ' do they have altogether?';
    const q1 = finishTyped(stem, T,
      'The difference is ' + q + ' − ' + p + ' = ' + (q - p) + ' units, which is ' + D + ' ' + OBJ + '. 1 unit = ' + D + ' ÷ ' + (q - p) + ' = ' + u +
      '. Altogether there are ' + (p + q) + ' units = ' + (p + q) + ' × ' + u + ' = ' + T + ' ' + OBJ + '.', OBJ);
    q1.band = 3; q1.exam = 'problem';
    q1.technique = 'Draw a model';
    q1.steps = [
      'Draw ' + p + ' units for ' + x + ' and ' + q + ' units for ' + y + ', lined up from the left.',
      y + ' has ' + q + ' − ' + p + ' = ' + (q - p) + ' more units, and those units are the ' + D + ' extra ' + OBJ + '.',
      'So 1 unit is ' + D + ' ÷ ' + (q - p) + ' = ' + u + ' ' + OBJ + '.',
      'Altogether they have ' + (p + q) + ' units: ' + (p + q) + ' × ' + u + ' = <b>' + T + '</b> ' + OBJ + '.'
    ];
    return slips(q1, [[q * u, 'answered-one-part'], [D * (p + q), 'difference-as-unit'], [D, 'answered-difference']]);
  }

  /* Paper 2 shape: before and after, one quantity unchanged (pool 3, band 3) */
  function gBeforeAfter() {
    const [x, y] = two();
    for (let tries = 0; tries < 400; tries++) {
      const p = ri(2, 9), q = ri(2, 9), r = ri(1, 8), s = ri(2, 9);
      if (gcd(p, q) !== 1 || gcd(r, s) !== 1 || p === q || r === s) continue;
      if (r * q >= p * s) continue;                     /* the first person's share must go DOWN */
      const L = q * s / gcd(q, s), m1 = L / q, m2 = L / s;
      if (m1 === 1 && m2 === 1) continue;
      const before = p * m1, after = r * m2, k = before - after;
      if (k < 1 || L > 30) continue;
      const v = ri(2, 12) * 5, ans = before * v, d = k * v;
      if (ans > 900) continue;
      const stem = 'At first, the ratio of ' + x + '\'s money to ' + y + '\'s money was ' + R2(p, q) + '. After ' + x + ' spent $' + d +
        ', the ratio became ' + R2(r, s) + '. ' + y + '\'s money did not change. How much money did ' + x + ' have at first? (in dollars, e.g. 120)';
      const q1 = money(finishTyped(stem, ans,
        y + '\'s money stays the same, so make ' + y + '\'s units equal: ' + R2(p, q) + ' = ' + R2(before, L) + ' and ' + R2(r, s) + ' = ' + R2(after, L) +
        '. ' + x + ' spent ' + before + ' − ' + after + ' = ' + k + ' units = $' + d + ', so 1 unit = $' + v + '. At first ' + x + ' had ' + before + ' units = $' + ans + '.', '$'), ans);
      q1.band = 3; q1.exam = 'problem';
      q1.technique = 'Before and after';
      q1.steps = [
        y + '\'s money does not change, so give ' + y + ' the same number of units before and after: ' + q + ' × ' + m1 + ' = ' + L + ' and ' + s + ' × ' + m2 + ' = ' + L + '.',
        'Before, ' + x + ' had ' + p + ' × ' + m1 + ' = ' + before + ' units. After, ' + x + ' had ' + r + ' × ' + m2 + ' = ' + after + ' units.',
        x + ' spent ' + before + ' − ' + after + ' = ' + k + ' units, and that is $' + d + '. So 1 unit is $' + d + ' ÷ ' + k + ' = $' + v + '.',
        'At first ' + x + ' had ' + before + ' units: ' + before + ' × $' + v + ' = <b>$' + ans + '</b>.'
      ];
      return slips(q1, [[after * v, 'answered-after'], [p * v, 'units-not-matched'], [d, 'answered-change']]);
    }
    return gDiffToTotal();   /* never reached in 20,000 review draws; stays a band-3 Paper 2 item if it is */
  }

  /* Paper 2 shape: three-way share, compare two shares (pool 3, band 3) */
  function gShareThree() {
    const [x, y, z] = three();
    let a = ri(1, 5), b = ri(1, 6), c = ri(2, 7);
    while (g3(a, b, c) !== 1 || c <= a || a === b || b === c) { a = ri(1, 5); b = ri(1, 6); c = ri(2, 7); }
    const u = ri(3, 30) * 2, T = (a + b + c) * u, ans = (c - a) * u;
    const stem = 'Some money was shared among ' + x + ', ' + y + ' and ' + z + ' in the ratio ' + R3(a, b, c) + '. The total amount of money was $' + T +
      '. How much more money did ' + z + ' get than ' + x + '? (in dollars, e.g. 36)';
    const q1 = money(finishTyped(stem, ans,
      'There are ' + a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c) + ' units, so 1 unit = $' + T + ' ÷ ' + (a + b + c) + ' = $' + u + '. ' + z + ' got ' + (c - a) +
      ' more units than ' + x + ', which is $' + ans + '.', '$'), ans);
    q1.band = 3; q1.exam = 'problem';
    q1.technique = 'Draw a model';
    q1.steps = [
      'Draw ' + a + ' units for ' + x + ', ' + b + ' for ' + y + ' and ' + c + ' for ' + z + ': ' + a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c) + ' units.',
      'The ' + (a + b + c) + ' units are $' + T + ', so 1 unit is $' + T + ' ÷ ' + (a + b + c) + ' = $' + u + '.',
      z + ' has ' + c + ' − ' + a + ' = ' + (c - a) + ' more units than ' + x + '.',
      'So ' + z + ' got ' + (c - a) + ' × $' + u + ' = <b>$' + ans + '</b> more.'
    ];
    return slips(q1, [[c * u, 'answered-one-part'], [c - a, 'units-not-valued'], [a * u, 'wrong-part']]);
  }

  MQI.registerTopic({
    id: 'p6ratio', level: 'P6', strand: 'Number and Algebra',
    moeSubTopic: 'Ratio: notation, representations and interpretation of a:b and a:b:c; equivalent ratios; dividing a quantity in a given ratio; expressing a ratio in its simplest form; finding the ratio of two or three given quantities; finding the missing term in a pair of equivalent ratios; relationship between fraction and ratio',
    label: 'Ratio Ridge', short: 'Ratio', e: '⚖️',
    skills: {
      notation:    { label: 'Writing a ratio', tip: 'Read the question aloud and write the terms in the same order as the words.' },
      simplest:    { label: 'Simplest form', tip: 'Keep dividing both terms by the same number until only 1 goes into both.' },
      equivalent:  { label: 'Equivalent ratios', tip: 'Ask: what did I multiply BOTH terms by? Adding the same number never works.' },
      missing:     { label: 'Missing term', tip: 'Find what one known term was multiplied by, then do the same to the other.' },
      divide:      { label: 'Sharing in a ratio', tip: 'Add the terms to get the number of units, then find 1 unit first.' },
      fraction:    { label: 'Fractions and ratio', tip: 'Draw the units: the fraction of the whole uses the total number of units underneath.' },
      model:       { label: 'Model problems', tip: 'Draw the bars, mark the difference, and find what 1 unit is worth.' },
      beforeafter: { label: 'Before and after', tip: 'Find the quantity that stays the same and make its units match before and after.' }
    },
    /* the misconception tags carried by q.miscon (MCQ) and q.slips (typed) */
    misconceptions: {
      'order-reversed':     'Writes the terms in a different order from the question.',
      'not-simplest':       'Stops before the ratio is in its simplest form.',
      'part-whole':         'Compares one part with the whole instead of with the other part.',
      'additive':           'Adds or takes away the same number on both terms instead of multiplying or dividing.',
      'one-term-only':      'Multiplies or divides only one term of the ratio.',
      'wrong-part':         'Finds the share of the other person or group.',
      'one-unit-only':      'Stops at the value of 1 unit.',
      'ratio-as-fraction':  'Reads a ratio p : q as the fraction p/q of the whole.',
      'complement':         'Uses the part that is left over instead of the part given.',
      'answered-one-part':  'Gives one person\'s amount when the question asks for the total or a difference.',
      'difference-as-unit': 'Treats the difference itself as 1 unit.',
      'answered-after':     'Gives the amount after the change when the question asks for the amount at first.',
      'units-not-matched':  'Uses the two ratios without making the unchanged quantity\'s units equal.',
      'answered-change':    'Gives the amount spent instead of the amount at first.',
      'answered-difference':'Gives the difference printed in the question instead of the total.',
      'units-not-valued':   'Gives a number of units instead of its value in dollars.'
    },
    pools: {
      1: [[gRatioOfTwo, 'notation'], [gSimplest, 'simplest'], [gEquivalent, 'equivalent'], [gMissingTerm, 'missing']],
      2: [[gThreeTerm, 'notation'], [gDivide, 'divide'], [gFracOfWhole, 'fraction'], [gFracToRatio, 'fraction'], [gMissingTerm, 'missing']],
      3: [[gDiffToTotal, 'model'], [gBeforeAfter, 'beforeafter'], [gShareThree, 'divide']]
    }
  });
})();
