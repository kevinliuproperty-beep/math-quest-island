"use strict";
/* Math Quest Island topic: p5fractions (P5). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * SCOPE (MOE Oct 2025, p.41, PRIMARY FIVE, SUB-STRAND: FRACTIONS), verbatim:
 *   1. Fraction and Division
 *     1.1 dividing a whole number by a whole number with quotient as a fraction
 *     1.2 expressing fractions as decimals
 *   2. Four Operations
 *     2.1 adding and subtracting mixed numbers
 *     2.2 multiplying a proper/improper fraction and a whole number without calculator
 *     2.3 multiplying a proper fraction and a proper/ improper fractions without calculator
 *     2.4 multiplying two improper fractions
 *     2.5 multiplying a mixed number and a whole number
 *
 * NOT HERE, deliberately:
 *  - DIVIDING a fraction by anything. The brief asked for "divide a proper fraction
 *    by a whole number if listed". It is NOT listed at P5. The PDF puts
 *    "dividing a proper fraction by a whole number" and "dividing a whole
 *    number/proper fraction by a proper fraction" under PRIMARY SIX (p.43).
 *    No generator here divides by a fraction.
 *  - Adding/subtracting unlike denominators as such: that is P4 3.1 (p.37) and
 *    already shipped in Fraction Forest. P5 owns MIXED NUMBERS specifically, so
 *    every add/sub item here carries a whole-number part on both terms.
 *  - Ratio. P6.
 *
 * TYPED-ANSWER FORM. MQI.parseTypedAnswer accepts "3/4" and "6/4" (cross-multiplied
 * against fracAnswer, so a non-simplest answer is still marked right) and accepts
 * the equivalent decimal. It does NOT accept "1 1/2": the mixed-number string
 * fails the number regex and is graded WRONG. Verified against js/core.js.
 * Consequence, and the reason this file mixes answer types:
 *  - a result that is a mixed number is asked as MULTIPLE CHOICE (choices are
 *    rendered mixed numbers), never typed;
 *  - a result that is a proper or improper fraction may be typed, because the
 *    grader forgives 6/8 for 3/4;
 *  - a result that is a whole number or a terminating decimal is typed.
 * No item punishes a child for a correct-but-unsimplified answer.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr,
        finishNum = G.finishNum, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul','Mei Ling','Rajan'];
  /* [plural noun, singular noun, adjective, where] - Singapore contexts. */
  const STUFF = [
    ['curry puffs','curry puff','sardine','on the tray at the bakery'],
    ['kueh lapis slices','slice','pandan','in the box from the pasar malam'],
    ['name tags','name tag','laminated','in the P5 classroom drawer'],
    ['badminton shuttlecocks','shuttlecock','brand new','in the CCA store room'],
    ['story books','story book','borrowed from the library','on the shelf at home'],
    ['rambutans','rambutan','ripe','in the basket from the wet market'],
    ['bus tickets','bus ticket','unused','in the folder'],
    ['angbaos','angbao','red','in the drawer']
  ];
  const CAKES = ['pandan cakes','ondeh ondeh','pizzas','watermelons','kaya toast sets','mooncakes'];

  function red(n, d){ const k = gcd(n, d) || 1; return [n / k, d / k]; }
  /* Mixed-number markup: "2 <frac>3/4</frac>". The harness reads the RAW html,
     because strip() eats the tags and would turn 3/4 into "34". */
  function mx(w, n, d){ return w + ' ' + fr(n, d); }

  /* Local MC finisher for mixed-number answers. finishFrac cannot serve these:
     buildFracChoices drops every candidate with numerator > denominator, so an
     improper or mixed answer would pad itself into a 4-option set of giveaways.
     Triples are [whole, num, den] with 0 < num < den. Candidates equal in VALUE
     to the correct answer are dropped, so no distractor is secretly right. */
  function finishMixedMC(qHtml, correct, cands, explain){
    const val = t => t[0] + t[1] / t[2];
    const out = [correct], seen = [val(correct)];
    for (const c of shuffle(cands.slice())){
      if (out.length >= 4) break;
      if (!c) continue;
      if (!Number.isInteger(c[0]) || !Number.isInteger(c[1]) || !Number.isInteger(c[2])) continue;
      if (c[0] < 0 || c[1] <= 0 || c[2] <= 1 || c[1] >= c[2]) continue;
      if (seen.some(s => Math.abs(s - val(c)) < 1e-9)) continue;
      seen.push(val(c)); out.push(c);
    }
    let t = 1;
    while (out.length < 4){
      const c = [correct[0] + t, correct[1], correct[2]];
      if (!seen.some(s => Math.abs(s - val(c)) < 1e-9)){ seen.push(val(c)); out.push(c); }
      t++; if (t > 40) break;
    }
    const disp = out.map(p => mx(p[0], p[1], p[2]));
    const order = shuffle(disp.map((_, i) => i));
    return { q: qHtml, extra: '', choices: order.map(i => disp[i]), correct: order.indexOf(0),
             explain, answerText: disp[0] };
  }

  /* ---- 1.1 dividing a whole number by a whole number, quotient as a fraction ---- */
  function gShareAsFraction(){
    const people = pick([3, 4, 5, 6, 8, 9, 10, 12]);
    const cakes  = ri(1, people - 1);            /* proper fraction, and never 0 */
    const r = red(cakes, people);
    const food = pick(CAKES);
    const who = pick(NAMES);
    return withFrac(finishTyped(
      who + ' and ' + (people - 1) + ' friends share ' + cakes + ' ' + food +
      ' equally among the ' + people + ' of them. What fraction of one does each get? (type a fraction, e.g. 3/4)',
      r[0] / r[1],
      cakes + ' shared among ' + people + ' is ' + cakes + ' / ' + people + ', which is the fraction ' +
      cakes + '/' + people + '.' + (r[1] === people ? ' That is already in its simplest form: ' + r[0] + '/' + r[1] + '.'
                                                    : ' In its simplest form that is ' + r[0] + '/' + r[1] + '.')), r);
  }
  function gDivideAsFraction(){
    const d = pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    let n = ri(1, 3 * d);
    if (n % d === 0) n += 1;                     /* keep the quotient a genuine fraction */
    const r = red(n, d);
    return withFrac(finishTyped(
      'Divide ' + n + ' by ' + d + '. Give the quotient as a fraction. (type a fraction, e.g. 7/4)',
      r[0] / r[1],
      n + ' / ' + d + ' is not a whole number, so write it as the fraction ' + n + '/' + d +
      '.' + ((gcd(n, d) || 1) === 1 ? ' Nothing divides into both, so ' + r[0] + '/' + r[1] + ' is the simplest form.'
                                    : ' Divide top and bottom by ' + gcd(n, d) + ' to get ' + r[0] + '/' + r[1] + '.')), r);
  }

  /* ---- 1.2 expressing fractions as decimals ---- */
  /* P4 1.4 (p.38) only reaches denominators that are factors of 10 or 100, and
     p4-decimals.js already ships those. These denominators are the P5 step up. */
  function gFractionAsDecimal(){
    const CASES = [[4,[1,3,5,7,9,11]], [8,[1,3,5,7,9,11,13,15]], [20,[1,3,7,9,11,13,17,19]],
                   [25,[1,2,3,4,6,7,8,9,11,12,13,14,16,17,18,19,21,22,23,24]],
                   [40,[1,3,7,9,11,13,17,19,21,23]], [50,[1,3,7,9,11,13,17,19,21,23,27,29]],
                   [5,[1,2,3,4,6,7,8,9]], [16,[1,3,5,7,9,11,13,15]]];
    const c = pick(CASES), d = c[0], n = pick(c[1]);
    /* Name the denominator this fraction can genuinely be scaled to. 13/40 is
       32.5/100, so telling the child to "reach 100" is false advice; it is
       325/1000. Pick the first power of ten that d divides exactly. */
    const target = [10, 100, 1000].find(t => t % d === 0);
    if (!target) return gFractionAsDecimal();
    const v = Math.round(n / d * 1000000) / 1000000;
    if (String(v).replace(/^-?\d*\.?/, '').length > 3) return gFractionAsDecimal();  /* 1/16 = 0.0625 is 4 dp */
    const q = finishTyped('Express ' + fr(n, d) + ' as a decimal. (type a decimal, e.g. 0.35)', v,
      'A fraction is a division: ' + n + ' / ' + d + '. Multiply top and bottom by ' + (target / d) +
      ' to reach ' + (n * target / d) + '/' + target + ', which is ' + v + '.');
    q.dp = 3;                                     /* exact-after-rounding: "0.350" passes, "0.4" does not */
    return q;
  }

  /* ---- 2.1 adding and subtracting mixed numbers ---- */
  function mixedPair(){
    /* Denominators not exceeding 12, at most two different ones - the P4 3.1
       constraint carried forward, so the arithmetic stays P5-legal. */
    const D = [2, 3, 4, 5, 6, 8, 10, 12];
    let d1 = pick(D), d2 = pick(D), guard = 0;
    while (d1 === d2 && ++guard < 8) d2 = pick(D);
    return [d1, d2];
  }
  /* Operand fractions are printed in simplest form: "2 2/6 + 5 4/8" is legal
     arithmetic but no P5 worksheet prints it, and it invites the child to
     simplify first and lose the thread. */
  function coprimeNum(d){ let n = ri(1, d - 1), g = 0; for (let t = 0; t < 12; t++){ if ((gcd(n, d) || 1) === 1) return n; n = ri(1, d - 1); } return 1; }
  function gMixedAdd(){
    const p = mixedPair(), d1 = p[0], d2 = p[1];
    const n1 = coprimeNum(d1), n2 = coprimeNum(d2);
    const w1 = ri(1, 5), w2 = ri(1, 5);
    const den = d1 * d2 / (gcd(d1, d2) || 1);
    const num = n1 * (den / d1) + n2 * (den / d2);
    const carry = Math.floor(num / den);
    const rest = red(num - carry * den, den);
    if (rest[0] === 0) return gMixedAdd();        /* keep the answer a genuine mixed number */
    const W = w1 + w2 + carry;
    const cands = [
      [w1 + w2, rest[0], rest[1]],                                  /* forgot to carry */
      [W, n1 + n2, d1 + d2],                                        /* added tops and bottoms */
      [W + 1, rest[0], rest[1]],                                    /* carried twice */
      [w1 + w2, n1 + n2, Math.max(d1, d2)],                         /* ignored the unlike denominators */
      [W, rest[0], rest[1] + 1]
    ];
    return finishMixedMC(
      'Add the mixed numbers: ' + mx(w1, n1, d1) + ' + ' + mx(w2, n2, d2) + ' = ?',
      [W, rest[0], rest[1]], cands,
      'Add the whole numbers: ' + w1 + ' + ' + w2 + ' = ' + (w1 + w2) + '. Make the denominators the same (' +
      den + '): ' + (n1 * (den / d1)) + '/' + den + ' + ' + (n2 * (den / d2)) + '/' + den + ' = ' + num + '/' + den +
      (carry ? ', which is 1 whole and ' + rest[0] + '/' + rest[1] + '. Altogether ' : ', which is ' + rest[0] + '/' + rest[1] + '. Altogether ') +
      W + ' and ' + rest[0] + '/' + rest[1] + '.');
  }
  function gMixedSub(){
    const p = mixedPair(), d1 = p[0], d2 = p[1];
    const n1 = coprimeNum(d1), n2 = coprimeNum(d2);
    const w2 = ri(1, 4), w1 = w2 + ri(1, 4);
    const den = d1 * d2 / (gcd(d1, d2) || 1);
    let num = n1 * (den / d1) - n2 * (den / d2);
    let W = w1 - w2;
    if (num < 0){ num += den; W -= 1; }           /* regroup one whole */
    if (num === 0 || W <= 0) return gMixedSub();  /* answer must stay a mixed number */
    const rest = red(num, den);
    const cands = [
      [W + 1, rest[0], rest[1]],                                    /* forgot to regroup */
      [w1 - w2, Math.abs(n1 - n2) || 1, Math.max(d1, d2)],          /* subtracted tops, kept a denominator */
      [W, rest[1] - rest[0], rest[1]],                              /* took the fraction the wrong way round */
      [Math.max(1, W - 1), rest[0], rest[1]],
      [W, rest[0], rest[1] + 1]
    ];
    return finishMixedMC(
      'Subtract the mixed numbers: ' + mx(w1, n1, d1) + ' - ' + mx(w2, n2, d2) + ' = ?',
      [W, rest[0], rest[1]], cands,
      'Make the denominators the same (' + den + '): ' + (n1 * (den / d1)) + '/' + den + ' and ' +
      (n2 * (den / d2)) + '/' + den + '. ' +
      (n1 * (den / d1) < n2 * (den / d2)
        ? 'The first fraction is smaller, so regroup one whole into ' + den + '/' + den + ' before subtracting. '
        : '') +
      'The answer is ' + W + ' and ' + rest[0] + '/' + rest[1] + '.');
  }

  /* ---- 2.2 multiplying a proper/improper fraction and a whole number ---- */
  function gFractionOfQuantity(){
    const s = pick(STUFF);
    const d = pick([3, 4, 5, 6, 8, 10, 12]);
    const n = coprimeNum(d);                      /* print 1/6, never 2/12 */
    const groups = ri(2, 9);
    const total = d * groups;
    const ans = total * n / d;
    /* Real misconceptions only: took the OTHER part, multiplied the two numbers
       in the fraction, used the denominator's share, forgot to multiply by n. */
    const cands = [total - ans, d * n, groups, total, ans * d];
    const clean = [];
    for (const c of cands) if (c > 0 && Number.isInteger(c) && c !== ans && !clean.includes(c)) clean.push(c);
    if (clean.length < 3) return gFractionOfQuantity();
    return finishNum(
      'There are ' + total + ' ' + s[0] + ' ' + s[3] + '. ' + fr(n, d) + ' of them are ' + s[2] +
      '. How many ' + s[0] + ' are ' + s[2] + '?', '', ans, clean, '',
      'Split the ' + total + ' ' + s[0] + ' into ' + d + ' equal groups of ' + groups + '. Take ' + n +
      ' of those groups: ' + n + ' x ' + groups + ' = ' + ans + '.');
  }
  function gFractionTimesWhole(){
    const d = pick([3, 4, 5, 6, 7, 8, 9, 10, 12]);
    const n = ri(1, 2 * d);                       /* proper OR improper, per 2.2 */
    if (n === d) return gFractionTimesWhole();
    if ((gcd(n, d) || 1) !== 1) return gFractionTimesWhole();
    const w = ri(2, 9);
    if (n * w % d === 0) return gFractionTimesWhole();   /* keep the product a fraction, not a whole */
    const r = red(n * w, d);
    return withFrac(finishTyped(
      'Multiply: ' + fr(n, d) + ' x ' + w + ' = ? (type a fraction, e.g. 15/4)',
      r[0] / r[1],
      'Multiply the numerator by the whole number and leave the denominator alone: ' + n + ' x ' + w +
      ' = ' + (n * w) + ', so the answer is ' + (n * w) + '/' + d +
      ((n * w) === r[0] && d === r[1] ? ' (' + r[0] + '/' + r[1] + '), already in its simplest form.'
                                      : ', which simplifies to ' + r[0] + '/' + r[1] + '.')), r);
  }

  /* ---- 2.3 proper x proper/improper, and 2.4 improper x improper ---- */
  function gFractionTimesFraction(){
    const d1 = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
    const n1 = coprimeNum(d1);                    /* proper, per 2.3, printed simplest */
    const d2 = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
    const n2 = ri(1, 2 * d2);                     /* proper or improper, per 2.3 */
    if (n2 === d2) return gFractionTimesFraction();
    if ((gcd(n2, d2) || 1) !== 1) return gFractionTimesFraction();
    const r = red(n1 * n2, d1 * d2);
    if (r[1] === 1) return gFractionTimesFraction();
    return withFrac(finishTyped(
      'Multiply: ' + fr(n1, d1) + ' x ' + fr(n2, d2) + ' = ? (type a fraction, e.g. 3/10)',
      r[0] / r[1],
      'Multiply across: ' + n1 + ' x ' + n2 + ' = ' + (n1 * n2) + ' on top, ' + d1 + ' x ' + d2 + ' = ' +
      (d1 * d2) + ' underneath. ' + (n1 * n2) + '/' + (d1 * d2) +
      ((n1 * n2) === r[0] ? ' (' + r[0] + '/' + r[1] + '), already in its simplest form.'
                          : ' simplifies to ' + r[0] + '/' + r[1] + '.')), r);
  }
  function gImproperTimesImproper(){
    const d1 = pick([2, 3, 4, 5, 6, 7, 8]);
    const n1 = ri(d1 + 1, 3 * d1);
    if ((gcd(n1, d1) || 1) !== 1) return gImproperTimesImproper();   /* print 5/2, never 10/4 */
    const d2 = pick([2, 3, 4, 5, 6, 7, 8]);
    const n2 = ri(d2 + 1, 3 * d2);
    if ((gcd(n2, d2) || 1) !== 1) return gImproperTimesImproper();
    const r = red(n1 * n2, d1 * d2);
    if (r[1] === 1) return gImproperTimesImproper();
    return withFrac(finishTyped(
      'Multiply the two improper fractions: ' + fr(n1, d1) + ' x ' + fr(n2, d2) +
      ' = ? (type a fraction, e.g. 35/12)',
      r[0] / r[1],
      'The rule does not change for improper fractions. Top: ' + n1 + ' x ' + n2 + ' = ' + (n1 * n2) +
      '. Bottom: ' + d1 + ' x ' + d2 + ' = ' + (d1 * d2) + '. That is ' + (n1 * n2) + '/' + (d1 * d2) +
      ((n1 * n2) === r[0] ? ' (' + r[0] + '/' + r[1] + '), already in its simplest form.'
                          : ', which is ' + r[0] + '/' + r[1] + ' in its simplest form.')), r);
  }

  /* ---- 2.5 multiplying a mixed number and a whole number ---- */
  function gMixedTimesWhole(){
    const d = pick([2, 3, 4, 5, 6, 8, 10, 12]);
    const n = coprimeNum(d);
    const w = ri(1, 4);
    const k = ri(2, 6);
    const totalNum = (w * d + n) * k;
    const W = Math.floor(totalNum / d);
    const restNum = totalNum - W * d;
    if (restNum === 0) return gMixedTimesWhole();  /* answer must stay a mixed number */
    const rest = red(restNum, d);
    const cands = [
      [w * k, rest[0], rest[1]],                                    /* multiplied the whole part only */
      [w * k, n * k > d ? n : n * k, d],                            /* multiplied both parts separately */
      [W + 1, rest[0], rest[1]],
      [Math.max(1, W - 1), rest[0], rest[1]],
      [W, rest[0], rest[1] + 1]
    ];
    return finishMixedMC(
      'Multiply: ' + mx(w, n, d) + ' x ' + k + ' = ?',
      [W, rest[0], rest[1]], cands,
      'Turn ' + w + ' and ' + n + '/' + d + ' into the improper fraction ' + (w * d + n) + '/' + d +
      '. Multiply the top by ' + k + ': ' + (w * d + n) + ' x ' + k + ' = ' + totalNum + ', so ' + totalNum + '/' + d +
      '. That is ' + W + ' and ' + rest[0] + '/' + rest[1] + '.');
  }

  /* Attach the fraction key so MQI.gradeTyped cross-multiplies: a child who types
     6/8 for 3/4 is marked RIGHT, and so is a child who types 0.75. */
  function withFrac(q, r){ q.fracAnswer = [r[0], r[1]]; return q; }

  MQI.registerTopic({
    id:'p5fractions', level:'P5', strand:'Number and Algebra',
    moeSubTopic:"Fractions: dividing a whole number by a whole number with quotient as a fraction; expressing fractions as decimals; adding and subtracting mixed numbers; multiplying a proper/improper fraction and a whole number without calculator; multiplying a proper fraction and a proper/ improper fractions without calculator; multiplying two improper fractions; multiplying a mixed number and a whole number",
    label:'Mixed Number Mangrove', short:'Fractions', e:'🥭',
    skills:{
      quotient:{label:'Division with a fraction answer', tip:'When a share does not come out even, the division itself IS the answer: 3 cakes among 4 children is the fraction 3/4.'},
      todec:   {label:'Fractions as decimals', tip:'A fraction bar means divide. Ask your child to say the division out loud before touching the numbers.'},
      mixed:   {label:'Adding & subtracting mixed numbers', tip:'Deal with the whole numbers first, then the fractions. If the fractions will not subtract, break one whole open.'},
      multiply:{label:'Multiplying fractions', tip:'Multiplying by a fraction less than 1 makes things SMALLER. Check the answer against that before anything else.'}
    },
    pools:{
      1:[[gShareAsFraction,'quotient'],[gFractionOfQuantity,'multiply']],
      2:[[gDivideAsFraction,'quotient'],[gFractionAsDecimal,'todec'],[gMixedAdd,'mixed'],[gFractionTimesWhole,'multiply']],
      3:[[gMixedSub,'mixed'],[gFractionTimesFraction,'multiply'],[gImproperTimesImproper,'multiply'],[gMixedTimesWhole,'mixed']]
    }
  });
})();
