"use strict";
/* Math Quest Island topic: p4ops (P4). Self-contained. Typed numeric answers.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope limits (MOE Oct 2025, p.37, Whole Numbers item 3 "Four Operations"),
 * clamped in the generators, never hoped for:
 *   3.1 multiplication algorithm - up to 4 digits by 1 digit
 *                                - up to 3 digits by 2 digits
 *   3.2 division algorithm       - up to 4 digits by 1 digit
 * So: a multiplicand is at most 9999 when the multiplier is a single digit and
 * at most 999 when the multiplier has two digits; a dividend is at most 9999 and
 * a divisor is always a single digit. Those bounds are enforced by ri() ranges.
 *
 * NOT AUTHORED HERE, on purpose. The P4 page of the syllabus lists no
 * "word problems with the four operations" item and no estimation item under
 * Four Operations, so neither appears: the lane brief asked for both, the PDF
 * wins (P3/P4/P5 refutations: nothing outside the syllabus). Division WITH a
 * remainder stays, because it is the same division algorithm applied to a
 * dividend the divisor does not divide, and the contexts below are single-step
 * dressings of 3.1/3.2, not multi-step problem sums.
 *
 * Every answer is typed (finishTyped), so there are no authored distractors to
 * collide with the key. Oracles for the four word stems live in
 * tools/gen-sanity.mjs under "P4 lane: four operations"; the two bare-algorithm
 * stems ("a x b = ?", "a / b = ?") are re-derived by the typed mul/div oracles
 * that already sit in that file.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishTyped = G.finishTyped;

  /* Singapore contexts. Each entry is [singular container, plural container, plural item]. */
  const PACKS = [
    ['tray', 'trays', 'kaya toast sets'],
    ['box', 'boxes', 'pineapple tarts'],
    ['crate', 'crates', 'rambutans'],
    ['carton', 'cartons', 'chrysanthemum tea packets'],
    ['basket', 'baskets', 'mandarin oranges'],
    ['tin', 'tins', 'kueh bangkit']
  ];
  /* The multiplier here runs into the hundreds (3 digits by 2 digits is the MOE
     ceiling), so the container has to be something a warehouse really holds
     hundreds of: "954 MRT carriages" is arithmetically in scope and factually
     silly, and a silly context is the thing a child stops trusting. */
  const HOLDERS = [
    ['carton', 'cartons', 'packets of chrysanthemum tea'],
    ['box', 'boxes', 'pineapple tarts'],
    ['case', 'cases', 'bottles of barley water'],
    ['sack', 'sacks', 'kilograms of rice']
  ];

  /* ---- 3.1 multiplication algorithm ---- */

  /* up to 4 digits by 1 digit */
  function gMul4x1() {
    const a = ri(1002, 9999), b = ri(3, 9);
    return finishTyped(a + ' x ' + b + ' = ?', a * b,
      'Multiply place by place: ' + a + ' x ' + b + ' = ' + (a * b) + '.');
  }
  /* up to 3 digits by 2 digits */
  function gMul3x2() {
    const a = ri(112, 999), b = ri(12, 99);
    const tens = Math.floor(b / 10) * 10, ones = b % 10;
    return finishTyped(a + ' x ' + b + ' = ?', a * b,
      ones === 0
        /* A round ten has nothing to split off, so "split 50 into 50" would be
           telling the child to split a number into itself. Multiply by the tens
           digit and scale by ten instead. */
        ? b + ' is ' + (b / 10) + ' tens, so ' + a + ' x ' + (b / 10) + ' = ' + (a * (b / 10)) +
          ' and then x 10 = ' + (a * b) + '.'
        : 'Split ' + b + ' into ' + tens + ' + ' + ones + '. ' + a + ' x ' + tens + ' = ' + (a * tens) +
          ' and ' + a + ' x ' + ones + ' = ' + (a * ones) + '. Add them: ' + (a * b) + '.');
  }
  /* up to 3 digits by 2 digits, dressed as one step of counting */
  function gMulWord() {
    const h = pick(HOLDERS), b = ri(14, 99), n = ri(102, 999);
    return finishTyped('One ' + h[0] + ' holds ' + b + ' ' + h[2] + '. How many ' + h[2] +
      ' are in ' + n + ' ' + h[1] + '?', n * b,
      'Each of the ' + n + ' ' + h[1] + ' holds ' + b + ', so multiply: ' + n + ' x ' + b + ' = ' + (n * b) + '.');
  }

  /* ---- 3.2 division algorithm (up to 4 digits by 1 digit) ---- */

  /* exact division, so the quotient is a whole number */
  function gDivExact() {
    const b = ri(3, 9);
    const q = ri(150, Math.floor(9999 / b));      /* dividend a = q * b stays <= 9999 */
    const a = q * b;
    return finishTyped(a + ' / ' + b + ' = ?', q,
      'Divide from the left: ' + a + ' / ' + b + ' = ' + q + ', and ' + q + ' x ' + b + ' = ' + a + ' checks it.');
  }
  /* division that leaves a remainder: the quotient half */
  function gDivQuotient() {
    const p = pick(PACKS), b = ri(3, 9);
    const q = ri(120, Math.floor(9900 / b));
    const r = ri(1, b - 1);                        /* never 0: "full" would be the whole lot */
    const a = q * b + r;
    return finishTyped(a + ' ' + p[2] + ' are packed into ' + p[1] + ' of ' + b +
      '. Only full ' + p[1] + ' are sold. How many full ' + p[1] + ' are there?', q,
      a + ' / ' + b + ' = ' + q + ' with ' + r + ' left over, so ' + q + ' ' + p[1] + ' are full.');
  }
  /* division that leaves a remainder: the remainder half, same stem family */
  function gDivRemainderWord() {
    const p = pick(PACKS), b = ri(3, 9);
    const q = ri(120, Math.floor(9900 / b));
    const r = ri(1, b - 1);
    const a = q * b + r;
    return finishTyped(a + ' ' + p[2] + ' are packed into ' + p[1] + ' of ' + b +
      '. How many ' + p[2] + ' are left over?', r,
      a + ' / ' + b + ' = ' + q + ' remainder ' + r + ', so ' + r + ' are left over.');
  }
  /* the remainder asked bare, no context */
  function gRemainderOf() {
    const b = ri(3, 9);
    const q = ri(150, Math.floor(9900 / b));
    const r = ri(1, b - 1);
    const a = q * b + r;
    return finishTyped('What is the remainder when ' + a + ' is divided by ' + b + '?', r,
      b + ' x ' + q + ' = ' + (q * b) + ', and ' + a + ' - ' + (q * b) + ' = ' + r + '.');
  }

  MQI.registerTopic({
    id: 'p4ops', level: 'P4', strand: 'Number and Algebra',
    moeSubTopic: 'Four Operations: multiplication algorithm (up to 4 digits by 1 digit; up to 3 digits by 2 digits); division algorithm (up to 4 digits by 1 digit)',
    label: 'Long Sum Landing', short: 'Multiply & Divide', e: '✖️',
    skills: {
      mul1: { label: 'Multiply by a 1-digit number', tip: 'Ask for the tens and ones separately: 4 x 2 000, then 4 x 300, then add. The written method is only that, stacked.' },
      mul2: { label: 'Multiply by a 2-digit number', tip: 'Split the 2-digit number into its tens and its ones, multiply twice, then add the two answers.' },
      div1: { label: 'Divide by a 1-digit number', tip: 'Check any division by multiplying back: quotient x divisor should return the number you started with.' },
      rem:  { label: 'Remainders', tip: 'Share out a packet of biscuits and ask what is left over. The remainder is always smaller than the number of people.' }
    },
    pools: {
      1: [[gMul4x1, 'mul1'], [gDivExact, 'div1']],
      2: [[gMul3x2, 'mul2'], [gMulWord, 'mul2'], [gRemainderOf, 'rem']],
      3: [[gDivQuotient, 'div1'], [gDivRemainderWord, 'rem'], [gMulWord, 'mul2']]
    }
  });
})();
