"use strict";
/* Math Quest Island topic: p4factors (P4). Self-contained. Multiple choice, numeric.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limits (MOE Oct 2025, p.37, Whole Numbers item 2):
 *   2.2 pins factor questions to a 1-digit factor of a number WITHIN 100, so every
 *   "is a factor of" stem uses a number <= 100 and 1-digit candidates.
 *   2.5 pins common multiples to two 1-digit numbers. Prime factorisation, HCF/LCM
 *   as named methods, and index notation are secondary work and never appear.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

  function factorsOf(n) { const o = []; for (let i = 1; i <= n; i++) if (n % i === 0) o.push(i); return o; }
  function gcd2(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }
  function lcm2(a, b) { return a * b / gcd2(a, b); }
  const ORD = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th' };

  /* ---- factors ---- */
  function gIsFactor() {
    const n = ri(24, 100);
    const f = shuffle(factorsOf(n).filter(x => x > 1 && x < 10));
    if (!f.length) return gIsFactor();
    const correct = f[0];
    const wrong = shuffle([2, 3, 4, 5, 6, 7, 8, 9].filter(x => n % x !== 0)).slice(0, 3);
    if (wrong.length < 3) return gIsFactor();
    return finishNum('Which of these is a factor of ' + n + '?', '', correct, wrong, '',
      correct + ' divides ' + n + ' exactly: ' + n + ' / ' + correct + ' = ' + (n / correct) + ', with nothing left over.');
  }
  function gCountFactors() {
    const n = pick([12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 56, 60, 64, 72, 80, 90, 96, 100]);
    const c = factorsOf(n).length;
    return finishNum('How many factors does ' + n + ' have?', '', c,
      [c + 1, c - 1, c + 2, c + 3, c - 2].filter(x => x > 0), '',
      'Pair them up from 1: ' + factorsOf(n).join(', ') + '. That is ' + c + ' factors in all.');
  }
  function gCommonFactor() {
    let a, b, common;
    do {
      a = ri(12, 60); b = ri(12, 60);
      common = factorsOf(gcd2(a, b)).filter(x => x > 1);
    } while (a === b || common.length < 1);
    const correct = pick(common);
    const wrong = shuffle([2, 3, 4, 5, 6, 7, 8, 9].filter(x => !(a % x === 0 && b % x === 0))).slice(0, 3);
    if (wrong.length < 3) return gCommonFactor();
    return finishNum('Which of these is a common factor of ' + a + ' and ' + b + '?', '', correct, wrong, '',
      correct + ' divides both: ' + a + ' / ' + correct + ' = ' + (a / correct) + ' and ' + b + ' / ' + correct +
      ' = ' + (b / correct) + '. A common factor has to divide BOTH numbers.');
  }

  /* ---- multiples ---- */
  function gIsMultiple() {
    const d = ri(3, 9);
    const correct = d * ri(4, 11);
    const wrong = [];
    while (wrong.length < 3) {
      const c = ri(12, 100);
      if (c % d !== 0 && c !== correct && wrong.indexOf(c) < 0) wrong.push(c);
    }
    return finishNum('Which of these is a multiple of ' + d + '?', '', correct, wrong, '',
      'Count in ' + d + 's: ' + [1, 2, 3, 4].map(k => d * k).join(', ') + '... ' + correct + ' = ' + d + ' x ' +
      (correct / d) + ', so it is on the list.');
  }
  function gNthMultiple() {
    const d = ri(3, 9), k = ri(4, 9), ans = d * k;
    return finishNum('What is the ' + ORD[k] + ' multiple of ' + d + '?', '', ans,
      [ans + d, ans - d, d + k, ans + 1], '',
      'The multiples of ' + d + ' are ' + d + ', ' + 2 * d + ', ' + 3 * d + ', ... so the ' + ORD[k] +
      ' one is ' + d + ' x ' + k + ' = ' + ans + '.');
  }
  function gCommonMultiple() {
    let a, b;
    do { a = ri(2, 9); b = ri(2, 9); } while (a === b || lcm2(a, b) > 72);
    const ans = lcm2(a, b);
    /* when one number divides the other, a*b, ans*2, ans+a and ans+b collapse onto
       each other, so carry spares: finishNum must never fall through to its
       correct+1 giveaway padding (P3 pilot rubric lesson 4) */
    const cands = [a * b, ans * 2, a + b, ans + a, ans + b, ans * 3, ans + a * b, a * b * 2, ans + a + b]
      .filter(x => x !== ans && x > 0);
    return finishNum('What is the smallest number that is a multiple of both ' + a + ' and ' + b + '?', '', ans,
      cands, '',
      'List the multiples of ' + a + ' and of ' + b + ' and find the first one that appears on both lists: ' +
      ans + ' = ' + a + ' x ' + (ans / a) + ' = ' + b + ' x ' + (ans / b) + '.');
  }

  MQI.registerTopic({
    id: 'p4factors', level: 'P4', strand: 'Number and Algebra',
    moeSubTopic: 'Factors and Multiples: factors, multiples and their relationship; determining if a 1-digit number is a factor of a given number within 100; finding the common factors of two given numbers; determining if a number is a multiple of a given 1-digit number; finding the common multiples of two given 1-digit numbers',
    label: 'Factor Reef', short: 'Factors', e: '🐚',
    skills: {
      factor:   { label: 'Factors', tip: 'A factor divides with nothing left over. Share out sweets and see if any are left.' },
      multiple: { label: 'Multiples', tip: 'Skip-count together in the wet market: 6, 12, 18, 24 eggs.' },
      common:   { label: 'Common factors and multiples', tip: 'Common means it has to work for BOTH numbers, not just one.' }
    },
    pools: {
      1: [[gIsFactor, 'factor'], [gIsMultiple, 'multiple']],
      2: [[gCommonFactor, 'common'], [gNthMultiple, 'multiple']],
      3: [[gCommonMultiple, 'common'], [gCountFactors, 'factor']]
    }
  });
})();
