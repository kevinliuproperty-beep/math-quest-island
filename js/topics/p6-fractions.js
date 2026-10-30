"use strict";
/* Math Quest Island topic: p6fractions (P6). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, PRIMARY SIX,
 * SUB-STRAND: FRACTIONS, 1. Four Operations):
 *   1.1 dividing a proper fraction by a whole number without calculator
 *   1.2 dividing a whole number/proper fraction by a proper fraction without calculator
 * Every dividend is a whole number or a PROPER fraction, every fraction divisor is a
 * PROPER fraction, and a whole-number divisor is 2 or more. No mixed number is ever
 * printed (that is P5 territory). Pool 3 Paper 2 problems may subtract two unlike
 * proper fractions (P5 4.1) or take a fraction of a whole (P5 4.3) on the way to the
 * division the item teaches.
 *
 * P5-P6 mirror (Sprint 1, 2026-10-30): every item carries q.syl = 'P6'. MCQ distractors
 * carry q.miscon = { choiceIndex: tag } and a coaching line in q.optionFeedback; typed
 * items carry q.slips = { '<wrong value as typed>': tag }. A fraction slip is keyed by
 * its reduced 'n/d' text. Typed fraction answers carry q.fracAnswer = [n, d] (reduced),
 * so 6/8, 3/4 and 0.75 all grade alike. Pool 3 is PSLE Paper 2 shape: band 3, worded,
 * q.exam = 'problem', coached with a model or before-after walk-through.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr,
        finishTyped = G.finishTyped;

  const NAMES = ['Hui Min', 'Farid', 'Kavitha', 'Jun Hao', 'Siti', 'Ravi', 'Mei Ling', 'Ahmad',
                 'Bala', 'Xin Yi', 'Daniel', 'Nurul', 'Wei Jie', 'Aisyah'];
  const P6 = q => (q.syl = 'P6', q);

  /* exact fractions, reduced, denominator positive */
  const R = (n, d) => { const g = gcd(Math.abs(n), Math.abs(d)) || 1; return [n / g, d / g]; };
  const same = (x, y) => x[0] * y[1] === y[0] * x[1];
  const show = r => (r[1] === 1 ? String(r[0]) : fr(r[0], r[1]));     /* rendered */
  const txt = r => (r[1] === 1 ? String(r[0]) : r[0] + '/' + r[1]);   /* typed / steps */
  const isProper = (a, b) => a >= 1 && a < b;
  const properFrac = (bLo, bHi) => {
    let b = ri(bLo, bHi), a = ri(1, b - 1);
    while (gcd(a, b) !== 1) { b = ri(bLo, bHi); a = ri(1, b - 1); }
    return [a, b];
  };
  const plainLen = s => String(s).replace(/<[^>]*>/g, '');

  /* MCQ with tagged distractors over fraction VALUES. dist = [[[n,d], tag, coaching], ...];
     the first three whose value differs from the key and from each other are kept.
     Returns null if fewer than three survive (or two options would strip to the same
     text, e.g. 1/12 and 11/2), and the caller redraws. */
  function mcq(stem, key, dist, explain) {
    const seen = [key], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      const v = R(d[0][0], d[0][1]);
      if (v[0] <= 0 || seen.some(s => same(s, v))) continue;
      seen.push(v); keep.push([v, d[1], d[2]]);
    }
    if (keep.length < 3) return null;
    const rows = shuffle([[key, null, null]].concat(keep));
    const flat = rows.map(r => plainLen(show(r[0])));
    if (new Set(flat).size !== flat.length) return null;
    const q = { q: stem, extra: '', choices: rows.map(r => show(r[0])), correct: 0, explain, answerText: show(key) };
    q.correct = rows.findIndex(r => r[1] === null);
    q.miscon = {}; q.optionFeedback = {};
    rows.forEach((r, i) => { if (r[1]) { q.miscon[i] = r[1]; q.optionFeedback[i] = r[2]; } });
    return P6(q);
  }

  /* typed answer that may be a fraction: the key is reduced, fracAnswer carries it */
  function typedFrac(stem, key, explain, unit) {
    const q = finishTyped(stem, key[0] / key[1], explain, unit);
    if (key[1] !== 1) q.fracAnswer = [key[0], key[1]];
    else q.answer = key[0];
    const u = Array.isArray(q.unit) ? q.unit[0] : q.unit;
    const mixed = key[1] !== 1 && key[0] > key[1] ? ' (= ' + Math.floor(key[0] / key[1]) + ' ' + (key[0] % key[1]) + '/' + key[1] + ')' : '';
    q.answerText = txt(key) + (u ? ' ' + u : '') + mixed;
    return q;
  }
  /* typed slips: [[ [n,d], tag ], ...], positive values that differ from the key */
  function slips(q, key, list) {
    const s = {};
    for (const [v0, tag] of list) {
      const v = R(v0[0], v0[1]);
      if (!(v[0] > 0) || same(v, key)) continue;
      const k = txt(v);
      if (!(k in s)) s[k] = tag;
    }
    q.slips = s;
    return P6(q);
  }
  const problem = (q, technique, steps) => (q.band = 3, q.exam = 'problem', q.technique = technique, q.steps = steps, q);

  /* ---------- 1.1 proper fraction ÷ whole number ---------- */
  function divByWholeParts(bHi, nHi) {
    const [a, b] = properFrac(3, bHi), n = ri(2, nHi);
    return { a, b, n, key: R(a, b * n) };
  }
  function divByWholeExplain(a, b, n, key) {
    return 'Dividing by ' + n + ' is the same as taking 1/' + n + ' of the amount: ' + fr(a, b) + ' × ' + fr(1, n) +
      ' = ' + fr(a, b * n) + (key[1] === b * n ? '' : ' = ' + show(key)) + '.';
  }
  function gDivByWholeMC() {
    const { a, b, n, key } = divByWholeParts(10, 5);
    const out = mcq('Find the value of ' + fr(a, b) + ' ÷ ' + n + '.', key, [
      [[a * n, b], 'multiplied-instead', 'Sharing ' + fr(a, b) + ' into ' + n + ' equal parts makes each part SMALLER. Multiply by ' + fr(1, n) + ', not by ' + n + '.'],
      [[b * n, a], 'order-reversed', 'That works out ' + n + ' ÷ ' + fr(a, b) + '. Keep the order of the question: ' + fr(a, b) + ' is shared by ' + n + '.'],
      [[b, a * n], 'flipped-wrong-number', 'Only the divisor gets turned over. Keep ' + fr(a, b) + ' as it is and multiply it by ' + fr(1, n) + '.'],
      [[a, b + n], 'added-to-denominator', 'Adding ' + n + ' to the bottom number is not dividing. Multiply the bottom number by ' + n + ' instead.']
    ], divByWholeExplain(a, b, n, key));
    return out || gDivByWholeMC();
  }
  function gDivByWholeTyped() {
    const { a, b, n, key } = divByWholeParts(12, 9);
    const q = typedFrac('Find the value of ' + fr(a, b) + ' ÷ ' + n + '.', key, divByWholeExplain(a, b, n, key));
    return slips(q, key, [[[a * n, b], 'multiplied-instead'], [[b * n, a], 'order-reversed'], [[b, a * n], 'flipped-wrong-number'], [[a, b + n], 'added-to-denominator']]);
  }

  /* ---------- 1.2 whole number ÷ proper fraction ---------- */
  function wholeDivExplain(n, a, b, key) {
    return 'Dividing by ' + fr(a, b) + ' is the same as multiplying by its reciprocal ' + fr(b, a) + ': ' + n + ' × ' + fr(b, a) +
      ' = ' + show(R(n * b, a)) + '. Check: ' + show(key) + ' × ' + fr(a, b) + ' = ' + n + '.';
  }
  function gWholeDivFracMC() {
    const [a, b] = properFrac(2, 9), n = a * ri(1, 4);
    if (n < 2) return gWholeDivFracMC();
    const key = R(n * b, a);
    const out = mcq('Find the value of ' + n + ' ÷ ' + fr(a, b) + '.', key, [
      [[n * a, b], 'multiplied-not-flipped', 'Dividing by a fraction means multiplying by the fraction turned upside down: ' + n + ' × ' + fr(b, a) + '.'],
      [[a, n * b], 'order-reversed', 'That works out ' + fr(a, b) + ' ÷ ' + n + '. Keep the order: how many ' + fr(a, b) + 's are there in ' + n + '?'],
      [[n * b, 1], 'numerator-ignored', 'Multiplying by ' + b + ' finds the number of ' + fr(1, b) + 's. Each group is ' + fr(a, b) + ', so divide that by ' + a + ' too.'],
      [[b, n * a], 'flipped-wrong-number', 'That is the answer turned upside down. Ask: how many ' + fr(a, b) + 's fit into ' + n + '? It is more than ' + n + '.']
    ], wholeDivExplain(n, a, b, key));
    return out || gWholeDivFracMC();
  }
  function gWholeDivFracTyped() {
    const [a, b] = properFrac(3, 12), n = ri(2, 9);
    const key = R(n * b, a);
    const q = typedFrac('Find the value of ' + n + ' ÷ ' + fr(a, b) + '.', key, wholeDivExplain(n, a, b, key));
    return slips(q, key, [[[n * a, b], 'multiplied-not-flipped'], [[a, n * b], 'order-reversed'], [[b, n * a], 'flipped-wrong-number'], [[n * b, 1], 'numerator-ignored']]);
  }

  /* ---------- 1.2 proper fraction ÷ proper fraction ---------- */
  function fracDivExplain(a, b, c, d, key) {
    return 'Turn the divisor over and multiply: ' + fr(a, b) + ' × ' + fr(d, c) + ' = ' + fr(a * d, b * c) +
      (key[1] === b * c ? '' : ' = ' + show(key)) + '. Check: ' + show(key) + ' × ' + fr(c, d) + ' = ' + fr(a, b) + '.';
  }
  function fracDivMC(easy) {
    let a, b, c, d;
    if (easy) {                                  /* same bottom number, or one bottom number a factor of the other */
      d = ri(3, 10); b = pick([d, d * 2 <= 12 ? d * 2 : d]);
      a = ri(1, b - 1); c = ri(1, d - 1);
      if (gcd(a, b) !== 1) return null;
    } else {
      [a, b] = properFrac(3, 10); [c, d] = properFrac(3, 10);
    }
    if (gcd(c, d) !== 1 || same([a, b], [c, d])) return null;
    const key = R(a * d, b * c);
    if (same(key, [c, d])) return null;
    return mcq('Find the value of ' + fr(a, b) + ' ÷ ' + fr(c, d) + '.', key, [
      [[a * c, b * d], 'multiplied-not-flipped', 'Dividing is not multiplying straight across. Turn ' + fr(c, d) + ' upside down first, then multiply.'],
      [[b * c, a * d], 'order-reversed', 'That turned the first fraction over instead of the second. Only the divisor ' + fr(c, d) + ' is turned over.'],
      [[b * d, a * c], 'flipped-both', 'Only the divisor is turned over. Keep ' + fr(a, b) + ' the right way up.']
    ], fracDivExplain(a, b, c, d, key));
  }
  function gFracDivFracEasyMC() { return fracDivMC(true) || gFracDivFracEasyMC(); }
  function gFracDivFracMC() { return fracDivMC(false) || gFracDivFracMC(); }
  function gFracDivFracTyped() {
    const [a, b] = properFrac(3, 12), [c, d] = properFrac(3, 12);
    const key = R(a * d, b * c);
    if (same([a, b], [c, d]) || same(key, [c, d])) return gFracDivFracTyped();
    const q = typedFrac('Find the value of ' + fr(a, b) + ' ÷ ' + fr(c, d) + '.', key, fracDivExplain(a, b, c, d, key));
    return slips(q, key, [[[a * c, b * d], 'multiplied-not-flipped'], [[b * c, a * d], 'order-reversed'], [[b * d, a * c], 'flipped-both']]);
  }

  /* ---------- word problems, pool 2 ---------- */
  /* [what, unit word in the stem, declared unit, container noun, verb phrase] */
  const FILLS = [
    ['soya milk', 'litres', 'litre', 'bottles', 'pours all of it into bottles that each hold'],
    ['orange juice', 'litres', 'litre', 'jugs', 'pours all of it into jugs that each hold'],
    ['rice', 'kg', 'kg', 'bags', 'packs all of it into bags that each hold'],
    ['flour', 'kg', 'kg', 'packets', 'packs all of it into packets that each hold'],
    ['ribbon', 'm', 'm', 'pieces', 'cuts all of it into pieces that are each']
  ];
  /* 1.2: how many a/b-sized parts in W (exact) */
  function gHowManyParts() {
    const f = pick(FILLS), who = pick(NAMES);
    const [a, b] = properFrac(2, 8), k = ri(2, 6), W = a * k, ans = k * b;
    if (W < 2) return gHowManyParts();
    const stem = who + ' has ' + W + ' ' + f[1] + ' of ' + f[0] + '. ' + who + ' ' + f[4] + ' ' + fr(a, b) + ' ' + f[2] +
      '. How many ' + f[3] + ' are there?';
    const q = finishTyped(stem, ans,
      'Find how many ' + fr(a, b) + 's there are in ' + W + ': ' + W + ' ÷ ' + fr(a, b) + ' = ' + W + ' × ' + fr(b, a) + ' = ' + ans +
      '. Check: ' + ans + ' × ' + fr(a, b) + ' = ' + W + '.', f[3]);
    return slips(q, [ans, 1], [[[W * a, b], 'multiplied-not-flipped'], [[W * b, 1], 'numerator-ignored'], [[a, W * b], 'order-reversed']]);
  }
  /* [what, unit, container, question noun] */
  const SHARES = [
    ['flour', 'kg', 'bags', 'What is the mass of flour in each bag, in kg?'],
    ['paint', 'l', 'cans', 'How many litres of paint are there in each can?'],
    ['ribbon', 'm', 'pieces', 'How long is each piece of ribbon, in m?'],
    ['sugar', 'kg', 'jars', 'What is the mass of sugar in each jar, in kg?']
  ];
  /* 1.1: a/b shared equally into n */
  function gShareEqually() {
    const s = pick(SHARES), who = pick(NAMES);
    const { a, b, n, key } = divByWholeParts(9, 6);
    if (b * n > 24) return gShareEqually();
    const amt = s[1] === 'l' ? ' litre of ' : ' ' + s[1] + ' of ';
    const verb = s[0] === 'ribbon' ? ' cuts it into ' + n + ' equal pieces. ' : ' divides it equally into ' + n + ' ' + s[2] + '. ';
    const stem = who + ' has ' + fr(a, b) + amt + s[0] + '. ' + who + verb + s[3];
    const q = typedFrac(stem, key, divByWholeExplain(a, b, n, key), s[1]);
    return slips(q, key, [[[a * n, b], 'multiplied-instead'], [[b * n, a], 'order-reversed'], [[a, b + n], 'added-to-denominator']]);
  }

  /* ---------- Paper 2 problems, pool 3 (band 3) ---------- */
  /* drink part, share the rest equally (Draw a model) */
  function gLeftThenShare() {
    const who = pick(NAMES);
    for (let t = 0; t < 400; t++) {
      const [p, q0] = properFrac(3, 12), [r, s] = properFrac(2, 12);
      if (r * q0 >= p * s || q0 === s) continue;          /* drank less than there was; unlike fractions */
      const rest = R(p * s - r * q0, q0 * s);
      if (rest[1] > 24) continue;
      const n = ri(2, 6), key = R(rest[0], rest[1] * n);
      if (key[1] > 72 || key[0] * 12 < key[1] || same(key, [r, s])) continue;   /* each cup at least 1/12 l; key never the amount drunk */
      const stem = who + ' had ' + fr(p, q0) + ' l of juice. ' + who + ' drank ' + fr(r, s) + ' l of the juice and poured the rest equally into ' +
        n + ' cups. How much juice was there in each cup, in litres?';
      const q = typedFrac(stem, key,
        'Juice left: ' + fr(p, q0) + ' − ' + fr(r, s) + ' = ' + show(rest) + ' l. Shared into ' + n + ' cups: ' + show(rest) + ' ÷ ' + n + ' = ' + show(key) + ' l.', 'l');
      problem(q, 'Draw a model', [
        'Draw a bar for the ' + p + '/' + q0 + ' l of juice and cut off the ' + r + '/' + s + ' l that ' + who + ' drank.',
        'The juice left is ' + p + '/' + q0 + ' − ' + r + '/' + s + ' = ' + txt(rest) + ' l.',
        'Cut the part that is left into ' + n + ' equal cups, so each cup gets ' + txt(rest) + ' ÷ ' + n + '.',
        'Each cup has ' + txt(rest) + ' ÷ ' + n + ' = <b>' + txt(key) + '</b> l.'
      ]);
      return slips(q, key, [[rest, 'forgot-to-share'], [[p, q0 * n], 'ignored-used-part'], [[rest[0] * n, rest[1]], 'multiplied-instead']]);
    }
    return gUseThenPack();
  }
  /* use a fraction of a whole, pack the rest into a/b-sized bags (Draw a model) */
  const PACKS = [['rice', 'bags'], ['flour', 'packets'], ['sugar', 'bags'], ['green beans', 'packets']];
  function gUseThenPack() {
    const who = pick(NAMES), P = pick(PACKS);
    for (let t = 0; t < 400; t++) {
      const [p, q0] = properFrac(3, 6), [a, b] = properFrac(2, 8), tt = ri(1, 4);
      const W = a * q0 * tt, used = W / q0 * p, rest = W - used, bags = rest * b / a;
      if (W > 30 || W < 6 || !Number.isInteger(bags) || bags > 60 || bags === W) continue;
      const stem = who + ' bought ' + W + ' kg of ' + P[0] + '. ' + who + ' used ' + fr(p, q0) + ' of it for a party and packed the rest into ' +
        P[1] + ' of ' + fr(a, b) + ' kg each. How many ' + P[1] + ' of ' + P[0] + ' did ' + who + ' pack?';
      const q = finishTyped(stem, bags,
        fr(p, q0) + ' of ' + W + ' kg is ' + used + ' kg, so ' + W + ' − ' + used + ' = ' + rest + ' kg was left. ' + rest + ' ÷ ' + fr(a, b) + ' = ' + rest + ' × ' + fr(b, a) +
        ' = ' + bags + ' ' + P[1] + '.', P[1]);
      problem(q, 'Draw a model', [
        'Draw a bar for the ' + W + ' kg and cut it into ' + q0 + ' equal units: 1 unit is ' + W + ' ÷ ' + q0 + ' = ' + (W / q0) + ' kg.',
        who + ' used ' + p + ' units: ' + p + ' × ' + (W / q0) + ' = ' + used + ' kg, so ' + W + ' − ' + used + ' = ' + rest + ' kg was left.',
        'Each of the ' + P[1] + ' holds ' + a + '/' + b + ' kg, so find how many ' + a + '/' + b + 's there are in ' + rest + '.',
        rest + ' ÷ ' + a + '/' + b + ' = <b>' + bags + '</b> ' + P[1] + '.'
      ]);
      return slips(q, [bags, 1], [[[W * b, a], 'ignored-used-part'], [[used * b, a], 'packed-used-part'], [[rest * a, b], 'multiplied-not-flipped']]);
    }
    return gLeftThenShare();
  }
  /* fraction of the remainder, work back to the whole (Before and after) */
  /* [first item, its price cap, second item, its price cap]: the second item never costs more than the first */
  const BUYS = [['a book', 60, 'a pen', 20], ['a bag', 150, 'a cap', 40], ['a watch', 400, 'a wallet', 80],
                ['a game', 120, 'some snacks', 40], ['a jacket', 250, 'a pair of socks', 20]];
  function gRemainderBack() {
    const who = pick(NAMES), B0 = pick(BUYS), B = [B0[0], B0[2]];
    for (let t = 0; t < 4000; t++) {
      const [p, q0] = properFrac(3, 7), [r, s] = properFrac(2, 6), tt = ri(1, 8);
      const M = q0 * s * tt * pick([1, 2, 5]), after1 = M - M / q0 * p, L = after1 - after1 / s * r;
      if (M > 1200 || M < 40 || !Number.isInteger(L) || L <= 0) continue;
      const cost1 = M - after1, cost2 = after1 - L;
      if (cost2 > cost1 || cost1 > B0[1] || cost2 > B0[3]) continue;
      const F = R((q0 - p) * (s - r), q0 * s);
      const stem = who + ' had some money. ' + who + ' spent ' + fr(p, q0) + ' of the money on ' + B[0] + ' and ' + fr(r, s) + ' of the remaining money on ' + B[1] + '. ' + who + ' had $' + L +
        ' left. How much money did ' + who + ' have at first? (in dollars)';
      const q = finishTyped(stem, M,
        'After ' + B[0] + ', ' + fr(q0 - p, q0) + ' of the money was left. After ' + B[1] + ', ' + fr(s - r, s) + ' of THAT was left, which is ' +
        fr(s - r, s) + ' × ' + fr(q0 - p, q0) + ' = ' + show(F) + ' of the money at first. $' + L + ' ÷ ' + show(F) + ' = $' + M + '.', '$');
      q.answerText = '$' + M;
      problem(q, 'Before and after', [
        'After ' + B[0] + ', 1 − ' + p + '/' + q0 + ' = ' + (q0 - p) + '/' + q0 + ' of the money was left.',
        'Then ' + r + '/' + s + ' of the remainder went on ' + B[1] + ', so 1 − ' + r + '/' + s + ' = ' + (s - r) + '/' + s + ' of the remainder was left.',
        'The money left is ' + (s - r) + '/' + s + ' × ' + (q0 - p) + '/' + q0 + ' = ' + txt(F) + ' of the money at first, and that is $' + L + '.',
        'At first: $' + L + ' ÷ ' + txt(F) + ' = <b>$' + M + '</b>.'
      ]);
      const wrong = [];
      const both = R(q0 * s - p * s - r * q0, q0 * s);     /* took both fractions of the WHOLE */
      if (both[0] > 0) wrong.push([[L * both[1], both[0]], 'fraction-of-whole-not-remainder']);
      wrong.push([[L * s, s - r], 'one-step-only']);
      wrong.push([[L * q0, q0 - p], 'one-step-only']);
      const q1 = slips(q, [M, 1], wrong);
      for (const k of Object.keys(q1.slips)) if (k.indexOf('/') >= 0) delete q1.slips[k];   /* dollars: whole slips only */
      return q1;
    }
    return gUseThenPack();
  }

  MQI.registerTopic({
    id: 'p6fractions', level: 'P6', strand: 'Number and Algebra',
    moeSubTopic: 'Fractions: dividing a proper fraction by a whole number without calculator; dividing a whole number/proper fraction by a proper fraction without calculator',
    label: 'Fraction Falls', short: 'Dividing fractions', e: '🌗',
    skills: {
      fracbywhole: { label: 'Fraction ÷ whole number', tip: 'Sharing by 3 is the same as taking 1/3 of it: multiply the bottom number by 3.' },
      bydivfrac:   { label: 'Dividing by a fraction', tip: 'Ask "how many of these fit in?" then turn the divisor over and multiply.' },
      wordfrac:    { label: 'Fraction word problems', tip: 'Decide first: is it sharing into equal parts, or counting how many parts of a size fit in?' },
      model:       { label: 'Model problems', tip: 'Draw the bar, cut off what was used, then work with what is left.' },
      beforeafter: { label: 'Fraction of the remainder', tip: 'Each new fraction is of what was LEFT, so multiply the fractions left over, then work back.' }
    },
    misconceptions: {
      'multiplied-instead':      'Multiplies by the whole number instead of dividing by it.',
      'order-reversed':          'Swaps the dividend and the divisor.',
      'flipped-wrong-number':    'Turns over the dividend (or the answer) instead of the divisor.',
      'added-to-denominator':    'Adds the whole number to the bottom number instead of multiplying.',
      'multiplied-not-flipped':  'Multiplies by the fraction without turning it over.',
      'numerator-ignored':       'Multiplies by the bottom number of the divisor and forgets to divide by its top number.',
      'flipped-both':            'Turns over both fractions instead of only the divisor.',
      'forgot-to-share':         'Stops at the amount left and does not share it out.',
      'ignored-used-part':       'Leaves out the part that was used before sharing or packing.',
      'packed-used-part':        'Packs the part that was used instead of the part that was left.',
      'fraction-of-whole-not-remainder': 'Takes the second fraction of the whole amount instead of the remainder.',
      'one-step-only':           'Uses only one of the two fractions when working back.'
    },
    pools: {
      1: [[gDivByWholeMC, 'fracbywhole'], [gWholeDivFracMC, 'bydivfrac'], [gFracDivFracEasyMC, 'bydivfrac']],
      2: [[gDivByWholeTyped, 'fracbywhole'], [gWholeDivFracTyped, 'bydivfrac'], [gFracDivFracMC, 'bydivfrac'], [gFracDivFracTyped, 'bydivfrac'],
          [gHowManyParts, 'wordfrac'], [gShareEqually, 'wordfrac']],
      3: [[gLeftThenShare, 'model'], [gUseThenPack, 'model'], [gRemainderBack, 'beforeafter']]
    }
  });
})();
