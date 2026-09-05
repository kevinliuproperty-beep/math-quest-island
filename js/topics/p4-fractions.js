"use strict";
/* Math Quest Island topic: p4fractions (P4). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope limits (MOE Oct 2025, p.37, SUB-STRAND: FRACTIONS), clamped in the
 * generators:
 *   1.1 mixed numbers, improper fractions and their relationship
 *   2.1 fraction as part of a set
 *   3.1 adding and subtracting fractions with denominators of given fractions
 *       not exceeding 12 and not more than two different denominators
 * So every denominator drawn here is <= 12, and an addition or subtraction item
 * shows at most two different denominators (like, or related: one denominator a
 * multiple of the other).
 *
 * NOT AUTHORED HERE, on purpose. Equivalent fractions, simplest form, and
 * comparing/ordering unlike fractions are the PRIMARY THREE fractions items
 * (p.35, items 1.1-1.4) and already live in js/topics/p3-fractions.js; the lane
 * brief listed them as P4, the PDF wins and they stay out of this file.
 * Multiplying fractions and adding mixed numbers are P5 (p.38) and never appear.
 *
 * Answer types. Mixed-number, improper-fraction and fraction-of-a-set items are
 * TYPED WHOLE NUMBERS: the harness requires a finite numeric `answer` on a typed
 * question, so a typed "3 1/2" is not shippable, and asking for the numerator or
 * the whole-number part keeps the answer unambiguous. Items whose answer really
 * is a fraction are multiple choice via finishFrac, which drops any distractor
 * equal in value to the key, so no authored distractor can equal the answer.
 * Oracles: tools/gen-sanity.mjs, "P4 lane: fractions" (typed) plus the existing
 * two-fraction "= ?" branch, which re-derives every add/subtract item.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, gcd = G.gcd, fr = G.fr, finishFrac = G.finishFrac,
        finishTyped = G.finishTyped;

  /* denominator -> the plural noun a P4 child would use for that unit fraction */
  const UNITS = {
    2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths',
    7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 11: 'elevenths', 12: 'twelfths'
  };
  const DENS = [3, 4, 5, 6, 8, 9, 10, 12];
  /* [small, big] with big a multiple of small, both <= 12: the "related" pairs */
  const RELATED = [[2, 4], [2, 6], [2, 8], [2, 10], [2, 12], [3, 6], [3, 9], [3, 12],
                   [4, 8], [4, 12], [5, 10], [6, 12]];
  /* [plural noun, where it sits, the subset] - kept in three pieces so the closing
     question reads "How many pupils are there in the class?" and not the run-on
     "How many pupils in the class are there altogether?" */
  const SETS = [
    ['pupils', 'in the class', 'girls'],
    ['durians', 'in the crate', 'ripe ones'],
    ['bowls of laksa', 'on the tray', 'extra spicy ones'],
    ['seats', 'in the MRT carriage', 'reserved ones']
  ];
  const TRAYS = [
    ['kaya toast sets', 'sold'],
    ['pineapple tarts', 'eaten'],
    ['mandarin oranges', 'given away'],
    ['curry puffs', 'sold']
  ];

  function simp(n, d) { const g = gcd(n, d) || 1; return [n / g, d / g]; }
  /* A numerator that shares a factor with d makes the mixed number ambiguous:
     28/8 is "3 and 4 eighths" AND "3 and a half", so "what is the numerator of
     the fraction part" would have two right answers. Every fraction part drawn
     in this file is therefore already in its simplest form. */
  function coprimeNum(d) { let n; do { n = ri(1, d - 1); } while (gcd(n, d) !== 1); return n; }

  /* ---- 1.1 mixed numbers, improper fractions and their relationship ---- */

  /* mixed -> improper, asked as "how many <unit>s" so the answer is a whole number */
  function gMixedToImproper() {
    const d = pick(DENS), w = ri(2, 6), n = coprimeNum(d);
    return finishTyped('How many ' + UNITS[d] + ' are there in ' + w + ' ' + fr(n, d) + '?',
      w * d + n,
      'Each whole is ' + d + ' ' + UNITS[d] + ', so ' + w + ' wholes are ' + (w * d) + ' ' + UNITS[d] +
      '. Add the extra ' + n + ': ' + (w * d + n) + '.');
  }
  /* improper -> mixed, whole-number part */
  function gImproperWhole() {
    const d = pick(DENS), w = ri(2, 6), n = coprimeNum(d), top = w * d + n;
    return finishTyped('Write ' + fr(top, d) + ' as a mixed number. What is the whole number part?', w,
      d + ' ' + UNITS[d] + ' make one whole, and ' + top + ' / ' + d + ' = ' + w + ' remainder ' + n +
      ', so there are ' + w + ' wholes.');
  }
  /* improper -> mixed, numerator of the fraction part */
  function gImproperNumerator() {
    const d = pick(DENS), w = ri(2, 6), n = coprimeNum(d), top = w * d + n;
    return finishTyped('Write ' + fr(top, d) + ' as a mixed number. What is the numerator of the fraction part?', n,
      w + ' wholes use up ' + (w * d) + ' of the ' + top + ' ' + UNITS[d] + ', leaving ' + n + ', so the fraction part is ' +
      n + ' out of ' + d + '.');
  }

  /* ---- 2.1 fraction as part of a set ---- */

  /* part of a set, given the whole */
  function gFracOfSetPart() {
    const t = pick(TRAYS), d = pick([3, 4, 5, 6, 8, 10, 12]), n = coprimeNum(d);
    const groups = ri(2, 9), total = groups * d;
    return finishTyped('There are ' + total + ' ' + t[0] + ' on a tray. ' + fr(n, d) +
      ' of them are ' + t[1] + '. How many are ' + t[1] + '?', groups * n,
      'Split ' + total + ' into ' + d + ' equal groups of ' + groups + '. ' + n + ' of those groups is ' +
      n + ' x ' + groups + ' = ' + (groups * n) + '.');
  }
  /* the whole of a set, given the part */
  function gFracOfSetWhole() {
    const s = pick(SETS), d = pick([3, 4, 5, 6, 8, 10, 12]);
    const groups = ri(2, 9), part = groups;
    return finishTyped(fr(1, d) + ' of the ' + s[0] + ' ' + s[1] + ' are ' + s[2] + '. There are ' +
      part + ' ' + s[2] + '. How many ' + s[0] + ' are there ' + s[1] + '?', part * d,
      'One of the ' + d + ' equal groups holds ' + part + ', so all ' + d + ' groups hold ' + d + ' x ' + part +
      ' = ' + (part * d) + '.');
  }
  /* part of a set expressed AS a fraction (multiple choice: the answer is a fraction) */
  function gSetAsFraction() {
    const g = ri(2, 6);                     /* shared group size keeps the answer's denominator small */
    const a = g * ri(1, 5), b = g * ri(1, 5);
    const total = a + b;
    const ans = simp(a, total);
    if (ans[1] > 12) return gSetAsFraction();   /* denominator cap, redrawn not hoped for */
    return finishFrac('A box holds ' + a + ' red marbles and ' + b + ' blue marbles. What fraction of the marbles are red?',
      '', ans,
      [simp(b, total),                      /* counted the blue ones instead */
       a < b ? simp(a, b) : simp(b, a),      /* part-to-part instead of part-to-whole */
       [ans[0], ans[1] + 1], [ans[0] + 1, ans[1] + 1]],   /* mis-counted one group */
      'There are ' + total + ' marbles altogether and ' + a + ' are red, so ' + a + ' out of ' + total +
      ', which is ' + ans[0] + ' out of ' + ans[1] + '.');
  }

  /* ---- 3.1 adding and subtracting fractions (denominators <= 12, two at most) ---- */

  function gAddLike() {
    const d = pick(DENS);
    const n1 = ri(1, d - 2), n2 = ri(1, d - 1 - n1);   /* sum stays below one whole */
    const ans = simp(n1 + n2, d);
    return finishFrac(fr(n1, d) + ' + ' + fr(n2, d) + ' = ?', '', ans,
      [[n1 + n2, d + d],                       /* added the denominators too */
       [n1 * n2, d], [n1 + n2 + 1, d], [Math.max(1, n1 + n2 - 1), d]],
      'The denominators are the same, so add the numerators only: ' + n1 + ' + ' + n2 + ' = ' + (n1 + n2) +
      ' ' + UNITS[d] + ', which is ' + ans[0] + ' out of ' + ans[1] + '.');
  }
  function gSubLike() {
    const d = pick(DENS);
    const n1 = ri(2, d - 1), n2 = ri(1, n1 - 1);
    const ans = simp(n1 - n2, d);
    return finishFrac(fr(n1, d) + ' - ' + fr(n2, d) + ' = ?', '', ans,
      [[n1 + n2, d],                           /* added instead of subtracted */
       [n2, d], [n1 - n2 + 1, d], [Math.max(1, n1 - n2 - 1), d]],
      'The denominators are the same, so subtract the numerators only: ' + n1 + ' - ' + n2 + ' = ' + (n1 - n2) +
      ' ' + UNITS[d] + ', which is ' + ans[0] + ' out of ' + ans[1] + '.');
  }
  function gAddRelated() {
    const p = pick(RELATED), s = p[0], big = p[1], k = big / s;
    const n1 = ri(1, s - 1), n2 = ri(1, big - n1 * k - 1);   /* sum stays below one whole */
    const ans = simp(n1 * k + n2, big);
    return finishFrac(fr(n1, s) + ' + ' + fr(n2, big) + ' = ?', '', ans,
      [[n1 + n2, big], [n1 + n2, s + big], [n1 * k + n2 + 1, big], [Math.max(1, n1 * k + n2 - 1), big]],
      big + ' is ' + k + ' x ' + s + ', so ' + n1 + ' out of ' + s + ' is the same as ' + (n1 * k) + ' out of ' + big +
      '. Then ' + (n1 * k) + ' + ' + n2 + ' = ' + (n1 * k + n2) + ' ' + UNITS[big] + ', which is ' +
      ans[0] + ' out of ' + ans[1] + '.');
  }
  function gSubRelated() {
    const p = pick(RELATED), s = p[0], big = p[1], k = big / s;
    const n1 = ri(1, s - 1);                       /* the amount taken away, in the SMALL denominator */
    const n2 = ri(n1 * k + 1, big - 1);            /* the starting amount, in the BIG one */
    const ans = simp(n2 - n1 * k, big);
    return finishFrac(fr(n2, big) + ' - ' + fr(n1, s) + ' = ?', '', ans,
      [[n2 - n1, big], [n2 - n1, big - s], [n2 - n1 * k + 1, big], [Math.max(1, n2 - n1 * k - 1), big]],
      big + ' is ' + k + ' x ' + s + ', so ' + n1 + ' out of ' + s + ' is the same as ' + (n1 * k) + ' out of ' + big +
      '. Then ' + n2 + ' - ' + (n1 * k) + ' = ' + (n2 - n1 * k) + ' ' + UNITS[big] + ', which is ' +
      ans[0] + ' out of ' + ans[1] + '.');
  }

  MQI.registerTopic({
    id: 'p4fractions', level: 'P4', strand: 'Number and Algebra',
    moeSubTopic: 'Mixed Numbers and Improper Fractions: mixed numbers, improper fractions and their relationship; Fraction of a Set: fraction as part of a set; Addition and Subtraction: adding and subtracting fractions with denominators of given fractions not exceeding 12 and not more than two different denominators',
    label: 'Mixed Number Cove', short: 'P4 Fractions', e: '🥧',
    skills: {
      mixed:  { label: 'Mixed and improper fractions', tip: 'Cut a prata into quarters at dinner: three whole pratas is twelve quarters, so 3 and a quarter is thirteen quarters.' },
      set:    { label: 'Fraction of a set', tip: 'Split a packet of sweets into equal piles first. The denominator says how many piles, the numerator how many you take.' },
      addsub: { label: 'Adding and subtracting fractions', tip: 'Same denominator: add the numerators only, never the denominators. Different denominators: make them match first.' }
    },
    pools: {
      1: [[gMixedToImproper, 'mixed'], [gAddLike, 'addsub']],
      2: [[gImproperWhole, 'mixed'], [gSubLike, 'addsub'], [gFracOfSetPart, 'set']],
      3: [[gImproperNumerator, 'mixed'], [gAddRelated, 'addsub'], [gSubRelated, 'addsub'],
          [gFracOfSetWhole, 'set'], [gSetAsFraction, 'set']]
    }
  });
})();
