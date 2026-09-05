"use strict";
/* Math Quest Island topic: p5decimals (P5). Self-contained. Typed.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * SCOPE (MOE Oct 2025, p.41, PRIMARY FIVE, SUB-STRAND: DECIMALS), verbatim:
 *   1. Four Operations
 *     1.1 multiplying and dividing decimals (up to 3 decimal places) by 10, 100,
 *         1000 and their multiples without calculator
 *     1.2 converting a measurement from a smaller unit to a larger unit in decimal
 *         form, and vice versa
 *         - kilometres and metres
 *         - metres and centimetres
 *         - kilograms and grams
 *         - litres and millilitres
 *
 * NOT HERE, deliberately. The brief asked for three things the PDF does not put at P5:
 *  - multiplying/dividing decimals by a WHOLE NUMBER. That is P4 3.1 (p.38),
 *    "by a 1-digit whole number", and p4-decimals.js owns it. P5 multiplies and
 *    divides by 10/100/1000 AND THEIR MULTIPLES only, which is why every divisor
 *    and multiplier below is a multiple of ten.
 *  - ROUNDING to the nearest whole number / 1 dp / 2 dp. That is P4 1.5 (p.38) and
 *    p4-decimals.js already ships gDecRoundWhole and gDecRound1. Re-asking it here
 *    would duplicate a live P4 skill and mislabel it as P5.
 *  - Rate, ratio, average, speed. P5 RATE is a separate sub-strand; ratio and
 *    average are P6 or removed.
 *
 * TRAILING ZEROS. Every typed item declares q.dp, so MQI.gradeTyped compares
 * exact-after-rounding at that many places. Proven against js/core.js: with
 * dp:3 an answer of 2.35 accepts "2.35", "2.350" and "2.3500", and rejects
 * "2.4". Without dp the tolerance is 0.005, which would wave "2.4" through on a
 * 2-dp answer, so dp is declared on every generator in this file, no exceptions.
 *
 * FLOATING POINT. 0.1 x 3 is 0.30000000000000004 in JavaScript, which would ship
 * as an answerText no child could type. Every answer here is snapped with
 * round3() before it leaves the generator.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul','Mei Ling','Rajan'];

  function round3(x){ return Math.round(x * 1000) / 1000; }
  function dpOf(x){ const s = String(x); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }
  /* Every typed item in this file goes through here: dp declared, never omitted. */
  function typed3(qHtml, answer, explain, unit){
    const q = finishTyped(qHtml, round3(answer), explain);
    q.dp = 3;
    if (unit) q.unit = unit;
    return q;
  }

  /* ---- 1.1 multiplying by 10, 100, 1000 and their multiples ---- */
  function gMultiplyByPowerOfTen(){
    const k = pick([10, 100, 1000]);
    const dp = pick([1, 2, 3]);
    const raw = ri(1, 9999) / Math.pow(10, dp);
    const n = round3(raw);
    if (dpOf(n) !== dp) return gMultiplyByPowerOfTen();   /* 0.50 would render as 0.5 and break the stem's promise */
    const ans = round3(n * k);
    const places = String(k).length - 1;
    return typed3('Multiply: ' + n + ' x ' + k + ' = ?', ans,
      'Multiplying by ' + k + ' moves every digit ' + places + ' place' + (places > 1 ? 's' : '') +
      ' to the LEFT, so the number gets bigger: ' + n + ' x ' + k + ' = ' + ans + '.');
  }
  function gDivideByPowerOfTen(){
    /* Constrained so the quotient never runs past 3 decimal places: the dividend's
       own dp plus the zeros in the divisor must not exceed 3. */
    const k = pick([10, 100, 1000]);
    const places = String(k).length - 1;
    const dp = ri(0, 3 - places);
    const n = round3(ri(1, 9999) / Math.pow(10, dp));
    if (dpOf(n) !== dp) return gDivideByPowerOfTen();
    const ans = round3(n / k);
    if (dpOf(ans) > 3) return gDivideByPowerOfTen();
    if (Number.isInteger(ans)) return gDivideByPowerOfTen();  /* the point of the skill is the decimal that appears */
    return typed3('Divide: ' + n + ' / ' + k + ' = ?', ans,
      'Dividing by ' + k + ' moves every digit ' + places + ' place' + (places > 1 ? 's' : '') +
      ' to the RIGHT, so the number gets smaller: ' + n + ' / ' + k + ' = ' + ans + '.');
  }
  function gMultiplyByMultipleOfTen(){
    /* "and their multiples": 300 is 3 x 100, so the child does one easy shift and
       one small table fact. */
    const k = pick([20, 30, 40, 50, 60, 70, 80, 90, 200, 300, 400, 500, 600, 2000, 3000, 4000]);
    const dp = pick([1, 2]);
    const n = round3(ri(1, 999) / Math.pow(10, dp));
    if (dpOf(n) !== dp) return gMultiplyByMultipleOfTen();
    const ans = round3(n * k);
    const base = Math.pow(10, String(k).length - 1);
    const digit = k / base;
    return typed3('Multiply: ' + n + ' x ' + k + ' = ?', ans,
      k + ' is ' + digit + ' x ' + base + '. First ' + n + ' x ' + base + ' = ' + round3(n * base) +
      ', then multiply by ' + digit + ': ' + round3(n * base) + ' x ' + digit + ' = ' + ans + '.');
  }
  function gDivideByMultipleOfTen(){
    /* Built backwards from a clean quotient so the answer is always tidy. */
    const k = pick([20, 30, 40, 50, 60, 200, 300, 400, 500]);
    const ansHundredths = pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90, 120, 150, 250]);
    const ans = round3(ansHundredths / 100);
    const n = round3(ans * k);
    if (dpOf(n) > 3 || n <= 0) return gDivideByMultipleOfTen();
    /* MOE 1.1 is "multiplying and dividing DECIMALS ... by 10, 100, 1000 and their
       multiples". "60 / 40" is a P4 whole-number item wearing this skill's badge,
       so at least one side of the item must actually carry a decimal point. */
    if (Number.isInteger(n) && Number.isInteger(ans)) return gDivideByMultipleOfTen();
    const base = Math.pow(10, String(k).length - 1);
    const digit = k / base;
    return typed3('Divide: ' + n + ' / ' + k + ' = ?', ans,
      k + ' is ' + digit + ' x ' + base + '. First ' + n + ' / ' + digit + ' = ' + round3(n / digit) +
      ', then divide by ' + base + ': ' + round3(n / digit) + ' / ' + base + ' = ' + ans + '.');
  }

  /* ---- 1.2 measurement conversion in decimal form, both directions ---- */
  /* [small unit, large unit, how many small in one large, what it measures] -
     exactly the four pairs the PDF prints, no others. */
  const PAIRS = [
    ['m',  'km', 1000, 'distance'],
    ['cm', 'm',  100,  'length'],
    ['g',  'kg', 1000, 'mass'],
    ['ml', 'l',  1000, 'volume']
  ];
  const SCENES = {
    'm':  ['The park connector from the void deck to the canal is', 'The MRT platform walk is', 'The school cross-country loop is'],
    /* cm -> m draws 100-999 cm, so every scene here has to be believable at 1-10 m.
       A 9.25 m bookshelf is not, and a parent notices before a child does. */
    'cm': ['The classroom whiteboard wall is', 'The corridor outside the hall is', 'The tug-of-war rope is'],
    'g':  ['The durian on the weighing scale is', 'The bag of Thai rice is', 'The tub of kaya is'],
    'ml': ['The bottle of bandung holds', 'The jug of barley water holds', 'The carton of soya milk holds']
  };
  /* "holds 1750 ml" already reads as a sentence; "is 250 cm" does not. */
  const VERB = { 'distance':' long', 'length':' long', 'mass':'', 'volume':'' };

  function gSmallToLarge(){
    const p = pick(PAIRS), small = p[0], large = p[1], per = p[2];
    /* Value chosen so the decimal answer stops within 3 places. */
    const n = ri(1, 9) * per + pick([0, 5, 25, 50, 75, 100, 125, 250, 400, 500, 750, 800, 900]) * (per / 100);
    const val = Math.round(n);
    if (val <= 0) return gSmallToLarge();
    const ans = round3(val / per);
    if (ans >= 1000) return gSmallToLarge();
    /* 900 cm = 9 m answers the question without ever writing a decimal, which is
       the one thing MOE 1.2 names: "in decimal form". */
    if (Number.isInteger(ans)) return gSmallToLarge();
    const scene = pick(SCENES[small]);
    return typed3(scene + ' ' + val + ' ' + small + VERB[p[3]] + '. Express that in ' + large +
      '. (type the number of ' + large + ', e.g. 2.35)', ans,
      'There are ' + per + ' ' + small + ' in 1 ' + large + ', so divide by ' + per + ': ' + val +
      ' ' + small + ' = ' + ans + ' ' + large + '.', large);
  }
  function gLargeToSmall(){
    const p = pick(PAIRS), small = p[0], large = p[1], per = p[2];
    const whole = ri(1, 9);
    /* The decimal part must be a whole number of the SMALL unit, or the answer is
       a rounded lie: 8.005 m is 800.5 cm, not 801 cm. Caught by the harness
       oracle's explanation check, not by the shape check. */
    const frac = per === 100
      ? pick([5, 10, 20, 25, 40, 50, 60, 75, 80, 90, 95]) / 100
      : pick([5, 25, 50, 125, 200, 400, 500, 600, 750, 800, 900]) / 1000;
    const val = round3(whole + frac);
    const ans = Math.round(val * per);
    if (Math.abs(val * per - ans) > 1e-6) return gLargeToSmall();
    const scene = pick(SCENES[small]);
    return typed3(scene + ' ' + val + ' ' + large + VERB[p[3]] + '. Express that in ' + small +
      '. (type the number of ' + small + ', e.g. 1750)', ans,
      'There are ' + per + ' ' + small + ' in 1 ' + large + ', so multiply by ' + per + ': ' + val +
      ' ' + large + ' = ' + ans + ' ' + small + '.', small);
  }
  function gConversionWordProblem(){
    /* Two lengths in different units, added, answered in the larger unit. This is
       1.2 doing work rather than being recited, and it is still only a conversion
       plus an addition - no rate, no ratio. */
    const p = pick(PAIRS), small = p[0], large = p[1], per = p[2];
    const bigPart = round3(ri(1, 6) + pick([0, 5, 25, 50, 75, 125, 250, 400, 750]) / 1000);
    const smallPart = ri(1, 9) * (per / 10) + pick([0, 5, 10, 25, 50]) * (per / 1000);
    const sVal = Math.round(smallPart);
    if (sVal <= 0) return gConversionWordProblem();
    const ans = round3(bigPart + sVal / per);
    if (dpOf(ans) > 3) return gConversionWordProblem();
    if (Number.isInteger(ans)) return gConversionWordProblem();   /* keep the answer in decimal form */
    const who = pick(NAMES);
    const stems = {
      'm':  who + ' cycles ' + bigPart + ' km along the park connector, then another ' + sVal + ' m to the hawker centre. How far is that altogether, in km?',
      'cm': who + ' cuts a ribbon ' + bigPart + ' m long, then joins on another piece ' + sVal + ' cm long. How long is the ribbon now, in m?',
      'g':  who + ' puts ' + bigPart + ' kg of rice and another ' + sVal + ' g of rice into one bag. What is the total mass, in kg?',
      'ml': who + ' pours ' + bigPart + ' l of syrup into a pot, then adds ' + sVal + ' ml more. How much is in the pot, in l?'
    };
    return typed3(stems[small] + ' (type the number of ' + large + ', e.g. 2.35)', ans,
      sVal + ' ' + small + ' is ' + round3(sVal / per) + ' ' + large + ' (divide by ' + per + '). Now add: ' +
      bigPart + ' + ' + round3(sVal / per) + ' = ' + ans + ' ' + large + '.', large);
  }

  MQI.registerTopic({
    id:'p5decimals', level:'P5', strand:'Number and Algebra',
    moeSubTopic:"Decimals: multiplying and dividing decimals (up to 3 decimal places) by 10, 100, 1000 and their multiples without calculator; converting a measurement from a smaller unit to a larger unit in decimal form, and vice versa",
    label:'Thousandth Straits', short:'Decimals x10', e:'⚓',
    skills:{
      shift:  {label:'Multiplying & dividing by 10, 100, 1000', tip:'Nothing is being added or removed - the digits just slide. Ask which way they slide and how many places, before any working.'},
      tens:   {label:'By multiples of ten', tip:'Split 300 into 3 x 100. One slide, then one times-table fact your child already knows.'},
      convert:{label:'Converting measurements', tip:'Weighing scales and the 1.5 l bottle in the fridge are free practice: ask for the same amount said the other way.'}
    },
    pools:{
      1:[[gMultiplyByPowerOfTen,'shift'],[gSmallToLarge,'convert']],
      2:[[gDivideByPowerOfTen,'shift'],[gLargeToSmall,'convert']],
      3:[[gMultiplyByMultipleOfTen,'tens'],[gDivideByMultipleOfTen,'tens'],[gConversionWordProblem,'convert']]
    }
  });
})();
