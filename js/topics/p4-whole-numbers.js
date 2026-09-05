"use strict";
/* Math Quest Island topic: p4numbers (P4). Self-contained. Multiple choice, numeric.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limits (MOE Oct 2025, p.37, Whole Numbers item 1):
 *   ceiling is 100 000, so every number here is 4 or 5 digits (1000-99999).
 *   Covered: 1.1 place values (ten thousands ... ones), 1.3 comparing and
 *   ordering, 1.4 patterns in number sequences, 1.5 rounding to the nearest
 *   10, 100 or 1000. NOT covered here: 1.2 numerals-to-words (needs a
 *   words input the finishers do not support) and 1.6 use of the approx sign.
 *   Numbers up to 10 million are P5 and never appear.
 * Numerals are printed Singapore-style with a thin space before the last three
 * digits (47 253); the oracles in tools/gen-sanity.mjs read that same format.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

  const PLACES = [
    { name: 'ten thousands', v: 10000 },
    { name: 'thousands',     v: 1000  },
    { name: 'hundreds',      v: 100   },
    { name: 'tens',          v: 10    }
  ];

  /* 47253 -> "47 253" */
  function sp(n) { return String(n).replace(/(\d{3})$/, ' $1').trim(); }

  /* a 5-digit number whose digits are all different, so "the digit 7" is unambiguous */
  function distinct5() {
    const d = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5);
    return d;
  }
  function roundTo(n, u) { return Math.floor(n / u + 0.5) * u; }

  /* ---- place value ---- */
  function gStandsFor() {
    const d = distinct5(), n = Number(d.join(''));
    const i = ri(0, 3), p = PLACES[i], val = d[i] * p.v;
    return finishNum('In ' + sp(n) + ', the digit ' + d[i] + ' stands for how much?', '', val,
      /* the five place values of the same digit; exactly one collapses onto the
         answer and finishNum drops it, leaving four real misconception choices.
         Nothing here can exceed 90 000, so no choice leaves the topic's range. */
      [d[i], d[i] * 10, d[i] * 100, d[i] * 1000, d[i] * 10000], '',
      'The ' + d[i] + ' sits in the ' + p.name + ' place, so it stands for ' + d[i] + ' x ' + p.v + ' = ' + sp(val) + '.');
  }
  function gWhichDigit() {
    const d = distinct5(), n = Number(d.join(''));
    const i = ri(0, 3), p = PLACES[i];
    return finishNum('Which digit is in the ' + p.name + ' place of ' + sp(n) + '?', '', d[i],
      [d[(i + 1) % 5], d[(i + 2) % 5], d[(i + 3) % 5], d[4]], '',
      'Count the places from the right: ones, tens, hundreds, thousands, ten thousands. The ' + p.name +
      ' digit of ' + sp(n) + ' is ' + d[i] + '.');
  }

  /* ---- rounding ---- */
  function rounder(unit, lo, hi, tie) {
    return function () {
      let n = ri(lo, hi);
      if (tie) n = Math.floor(n / unit) * unit + unit / 2;   /* land exactly on the halfway mark */
      /* never ask a child to round a number that is already on the unit: the answer
         is the number itself and the "sits between" explain reads as nonsense */
      else if (n % unit === 0) n += ri(1, unit - 1);
      const r = roundTo(n, unit);
      const down = Math.floor(n / unit) * unit, up = down + unit;
      return finishNum('Round ' + sp(n) + ' to the nearest ' + unit + '.', '', r,
        /* five candidates, all positive integers, so finishNum never has to pad with
           correct+1 giveaways when two of them collide (P3 pilot rubric lesson 4) */
        [down === r ? up : down, r + unit, r > unit ? r - unit : r + 2 * unit,
         roundTo(n, unit * 10), r + 2 * unit, Math.floor(n / unit) * unit + unit], '',
        (tie ? 'It is exactly halfway, and halfway always rounds up. ' : '') +
        sp(n) + ' sits between ' + sp(down) + ' and ' + sp(up) + ', and it is nearer ' + sp(r) + '.');
    };
  }
  /* the harness reports one row per function NAME, so a factory-made generator
     must be named or four of them collapse into a single "(anonymous)" row */
  function named(fn, name) { Object.defineProperty(fn, 'name', { value: name }); return fn; }
  /* upper bounds are set so that the LARGEST distractor (r + 2 units) still sits
     inside 100 000: the topic's ceiling is enforced by the generator, not hoped for. */
  const gRound10     = named(rounder(10,   1000,  9949,  false), 'gRound10');
  const gRound100    = named(rounder(100,  10000, 99449, false), 'gRound100');
  const gRound1000   = named(rounder(1000, 10000, 96999, false), 'gRound1000');
  const gRound100Tie = named(rounder(100,  10000, 99349, true),  'gRound100Tie');

  /* ---- number patterns ---- */
  function gPatternUp() {
    const step = pick([25, 50, 100, 200, 250, 500, 1000, 2000]);
    const start = ri(10, 40) * 1000 + ri(0, 3) * step;
    const t = [0, 1, 2, 3].map(k => start + k * step), ans = start + 4 * step;
    return finishNum('What number continues the pattern? ' + t.map(sp).join(', ') + ', ?', '', ans,
      [ans + step, ans + 2 * step, ans - 2 * step, ans + 10], '',
      'Each number goes up by ' + sp(step) + '. ' + sp(t[3]) + ' + ' + sp(step) + ' = ' + sp(ans) + '.');
  }
  function gPatternDown() {
    const step = pick([25, 50, 100, 200, 250, 500, 1000, 2000]);
    const ans = ri(12, 40) * 1000 + ri(0, 3) * step;
    const t = [4, 3, 2, 1].map(k => ans + k * step);
    return finishNum('What number continues the pattern? ' + t.map(sp).join(', ') + ', ?', '', ans,
      [ans - step, ans + step, ans - 2 * step, ans + 2 * step], '',
      'Each number goes down by ' + sp(step) + '. ' + sp(t[3]) + ' - ' + sp(step) + ' = ' + sp(ans) + '.');
  }

  /* ---- comparing and ordering (the choices ARE the list) ---- */
  function four(spread) {
    const base = ri(20, 89) * 1000;
    const set = new Set();
    while (set.size < 4) set.add(base + ri(0, spread));
    return Array.from(set);
  }
  function gGreatest() {
    const ns = four(999);
    const top = Math.max.apply(null, ns);
    return finishNum('Which of these is the greatest number?', '', top, ns.filter(x => x !== top), '',
      'All four start the same way, so compare the next place, then the next. ' + sp(top) + ' is the greatest.');
  }
  function gSmallest() {
    const ns = four(99);
    const low = Math.min.apply(null, ns);
    return finishNum('Which of these is the smallest number?', '', low, ns.filter(x => x !== low), '',
      'These four only differ in the last two places, so compare the tens first, then the ones. ' +
      sp(low) + ' is the smallest.');
  }

  MQI.registerTopic({
    id: 'p4numbers', level: 'P4', strand: 'Number and Algebra',
    moeSubTopic: 'Numbers up to 100 000: number notation, representations and place values (ten thousands, thousands, hundreds, tens, ones); comparing and ordering numbers; patterns in number sequences; rounding numbers to the nearest 10, 100 or 1000',
    label: 'Ten Thousand Bay', short: 'Big Numbers', e: '🏝️',
    skills: {
      place:   { label: 'Place value to 100 000', tip: 'Read a car plate or an HDB block number aloud and ask which digit is in the thousands place.' },
      round:   { label: 'Rounding', tip: 'Ask which ten or hundred a price is nearer to. Exactly halfway always rounds up.' },
      seq:     { label: 'Number patterns', tip: 'Find the step first: what is added or taken away each time?' },
      compare: { label: 'Comparing numbers', tip: 'Compare from the left, place by place, and stop at the first place where they differ.' }
    },
    pools: {
      1: [[gStandsFor, 'place'], [gWhichDigit, 'place'], [gRound10, 'round']],
      2: [[gRound100, 'round'], [gPatternUp, 'seq'], [gGreatest, 'compare']],
      3: [[gRound1000, 'round'], [gRound100Tie, 'round'], [gPatternDown, 'seq'], [gSmallest, 'compare']]
    }
  });
})();
