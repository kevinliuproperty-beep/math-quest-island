"use strict";
/* Math Quest Island topic: p5rate (P5). Self-contained. MC + typed.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope limit (MOE Oct 2025, p.41, SUB-STRAND: RATE):
 *   1.1 rate as the amount of a quantity per unit of another quantity
 *   1.2 finding rate, total amount or number of units given the other two quantities
 * That is the whole sub-strand. Nothing else is in it.
 *
 * NOT here: speed (P6, p.44 - distance/time is its own sub-strand and a rate
 * question must never be dressed as one), average (P6), ratio (P6), and any
 * tiered/stepped tariff, which needs two rates and a threshold and is therefore
 * outside "the other two quantities". Every item gives exactly two of the three
 * quantities and asks for the third.
 *
 * Money answers are exact 2-dp values computed in CENTS and only then divided,
 * so no float dust reaches the stem, the answer or the explanation.
 *
 * TYPED UNITS. Every finishTyped call here passes the unit its stem asks for as the
 * 4th argument, so MQI.gradeTyped strips that unit off what the child types instead
 * of scoring "30 pages" or "3870 buns" as a wrong answer (P5 Rate+Angles Refutation,
 * KILL 1). A bare number stays correct; a MISMATCHED unit is rejected.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishNum = G.finishNum, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie', 'Aisyah', 'Kavitha', 'Jun Hao', 'Siti', 'Priya', 'Daryl', 'Xin Yi', 'Farhan', 'Nurul'];
  const MALLS = ['Jurong Point', 'Tampines Mall', 'Nex', 'Causeway Point', 'Bugis Junction', 'Waterway Point'];

  /* Rubric lesson 4: finishNum silently drops a distractor equal to the answer and
     pads with correct+1 giveaways. Keep only clearly-separated positive integers. */
  function clean(correct, list) {
    const out = [];
    for (const c of list) {
      if (c > 0 && Number.isInteger(c) && Math.abs(c - correct) > 3 && !out.includes(c)) out.push(c);
    }
    return out;
  }
  const money = cents => '$' + (cents / 100).toFixed(2);

  /* ---------- pool 1: what a rate is, one step ---------- */

  function gFindRate() {
    const per = pick([25, 30, 35, 40, 45, 50, 60, 75, 80]), min = ri(4, 12);
    const total = per * min;
    /* Unit DECLARED (4th arg): the stem asks for pages, so gradeTyped now strips a
       trailing "pages" and accepts "30 pages" as well as a bare "30". */
    return finishTyped('A photocopier in the school office prints ' + total + ' pages in ' + min +
      ' minutes. How many pages does it print in 1 minute?', per,
      'A rate is the amount for ONE unit. Share the pages equally over the minutes: ' +
      total + ' ÷ ' + min + ' = ' + per + ' pages in 1 minute.', 'pages');
  }

  function gTapTotal() {
    const rate = ri(6, 24), min = ri(3, 12), v = rate * min;
    const cs = clean(v, [rate + min, rate * (min + 1), rate * (min - 1), v * 2, rate * min * 10 / 10 + rate * 2]);
    if (cs.length < 3) return gTapTotal();
    return finishNum('A tap fills a tank at ' + rate + ' ℓ per minute. How much water flows in ' +
      min + ' minutes?', '', v, cs, 'ℓ',
      rate + ' ℓ flows every minute, so in ' + min + ' minutes the tank gets ' + rate + ' × ' +
      min + ' = ' + v + ' ℓ.');
  }

  /* ---------- pool 2: the third quantity, and rate in dollars ---------- */

  function gFindUnits() {
    const per = pick([12, 15, 18, 24, 25, 30, 36, 45]), n = ri(6, 20);
    const total = per * n;
    /* Unit DECLARED: the stem asks for minutes. "min", "mins" and "minutes" all
       normalise to min, so any of them now grades correct, as does a bare number. */
    return finishTyped('A machine at a bakery packs ' + per + ' buns per minute. How many minutes does it take to pack ' +
      total + ' buns?', n,
      'Each minute accounts for ' + per + ' buns, so the number of minutes is ' + total + ' ÷ ' +
      per + ' = ' + n + ' minutes.', 'min');
  }

  function gParkingCharge() {
    const rateC = pick([80, 120, 150, 200, 250, 300]), hrs = ri(2, 9);
    const totalC = rateC * hrs;
    const who = pick(NAMES);
    /* Unit DECLARED as '$': the stem asks "in dollars". gradeTyped strips a leading
       $ already, and the declaration also lets a trailing "$" through and keeps a
       bare number correct. answerText is re-rendered as money so the review card
       reads "$27.00" rather than the raw "27 $" the generic formatter would give. */
    const q = finishTyped('The carpark at ' + pick(MALLS) + ' charges ' + money(rateC) +
      ' per hour. ' + who + ' parks there for ' + hrs + ' hours. How much is the parking charge, in dollars?',
      Number((totalC / 100).toFixed(2)),
      'The charge for 1 hour is ' + money(rateC) + ', so ' + hrs + ' hours cost ' + money(rateC) +
      ' × ' + hrs + ' = ' + money(totalC) + '.', '$');
    q.answerText = money(totalC);
    return q;
  }

  function gLaundryRate() {
    /* Prices are Singapore wash-and-fold, roughly $3 to $5 per kg (2026). The old
       60-180 cent band was 3x to 5x under the market and read as wrong to a parent.
       Still whole cents, still integer arithmetic - no floats. */
    const perC = pick([300, 320, 350, 380, 400, 420, 450, 480, 500]), kg = ri(3, 12);
    const totalC = perC * kg;
    /* Unit DECLARED as '$' (stem says "in dollars"); answerText re-rendered as money. */
    const q = finishTyped('A laundry shop charges ' + money(totalC) + ' for ' + kg +
      ' kg of washing. What is the charge for 1 kg, in dollars?',
      Number((perC / 100).toFixed(2)),
      'Divide the whole charge by the number of kilograms: ' + money(totalC) + ' ÷ ' + kg +
      ' = ' + money(perC) + ' for 1 kg.', '$');
    q.answerText = money(perC);
    return q;
  }

  /* ---------- pool 3: two steps, and comparing two rates ---------- */

  function gRateThenTotal() {
    const rate = ri(6, 20), a = ri(4, 12), b = a + ri(2, 12);
    const first = rate * a, v = rate * b;
    /* Unit DECLARED as 'l': the stem asks for litres. "ℓ" and "litres" both
       normalise to l, so "255 ℓ", "255 l" and a bare "255" all grade correct. */
    return finishTyped('A tap fills ' + first + ' ℓ of water in ' + a +
      ' minutes. At the same rate, how much water flows in ' + b + ' minutes?', v,
      'First find the rate: ' + first + ' ÷ ' + a + ' = ' + rate + ' ℓ per minute. Then ' +
      rate + ' × ' + b + ' = ' + v + ' ℓ in ' + b + ' minutes.', 'l');
  }

  function gHourAndMinutes() {
    const per = ri(12, 60), extra = pick([15, 20, 30, 40, 45]);
    const mins = 60 + extra, v = per * mins;
    /* Unit DECLARED: the stem asks for buns, so "3870 buns" now grades correct. */
    return finishTyped('A machine packs ' + per + ' buns each minute. How many buns does it pack in 1 hour ' +
      extra + ' minutes?', v,
      '1 hour ' + extra + ' minutes is 60 + ' + extra + ' = ' + mins + ' minutes. At ' + per +
      ' buns a minute that is ' + per + ' × ' + mins + ' = ' + v + ' buns.', 'buns');
  }

  function gComparePrinters() {
    const ra = ri(30, 80), rb = ri(10, ra - 8), ta = ri(2, 9), tb = ri(2, 9);
    const pa = ra * ta, pb = rb * tb, d = ra - rb;
    const cs = clean(d, [pa - pb, ra + rb, ra, rb, ra + d, pa - pb + ra]);
    if (cs.length < 3) return gComparePrinters();
    return finishNum('Printer A prints ' + pa + ' pages in ' + ta + ' minutes. Printer B prints ' + pb +
      ' pages in ' + tb + ' minutes. How many more pages than Printer B does Printer A print in 1 minute?',
      '', d, cs, 'pages',
      'Printer A: ' + pa + ' ÷ ' + ta + ' = ' + ra + ' pages a minute. Printer B: ' + pb + ' ÷ ' + tb +
      ' = ' + rb + ' pages a minute. The difference is ' + ra + ' − ' + rb + ' = ' + d + ' pages a minute.');
  }

  MQI.registerTopic({
    id: 'p5rate', level: 'P5', strand: 'Number and Algebra',
    moeSubTopic: "Rate: rate as the amount of a quantity per unit of another quantity; finding rate, total amount or number of units given the other two quantities",
    label: 'Rate Rapids', short: 'Rate', e: '🚰',
    skills: {
      meaning: { label: 'What a rate means', tip: 'A rate is always "how much for ONE". Say the sentence out loud: 40 pages for one minute, $1.20 for one hour.' },
      total: { label: 'Finding the total amount', tip: 'Rate × number of units = total. If 1 minute gives 14 litres, 9 minutes gives 14 nine times over.' },
      units: { label: 'Finding the number of units', tip: 'Total ÷ rate = number of units. Ask "how many lots of the one-unit amount fit into the total?"' },
      find: { label: 'Finding the rate', tip: 'Total ÷ number of units = rate. Divide first, then check the answer reads as an amount for ONE of something.' }
    },
    pools: {
      1: [[gFindRate, 'find'], [gTapTotal, 'total']],
      2: [[gFindUnits, 'units'], [gParkingCharge, 'total'], [gLaundryRate, 'find']],
      3: [[gRateThenTotal, 'total'], [gHourAndMinutes, 'total'], [gComparePrinters, 'meaning']]
    }
  });
})();
