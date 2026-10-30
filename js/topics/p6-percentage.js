"use strict";
/* Math Quest Island topic: percent (P6). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, p.43, PRIMARY SIX,
 * SUB-STRAND: PERCENTAGE 1):
 *   1.1 finding the whole given a part and the percentage
 *   1.2 finding percentage increase/decrease
 * NOT here: part of a whole as a percentage, a percentage part of a whole, discount,
 * GST and annual interest on their own - those are P5 (p5-percentage.js, p.41). Pool 3
 * Paper 2 problems combine the P6 outcomes with those P5 ideas (the price before a
 * discount, the price before GST, two changes one after the other).
 * Every answer is a positive whole number (dollars, a percentage, pages or pupils).
 * Money answers declare '$' and print "$120"; percentage answers declare '%' and print
 * "25%", the p5-percentage.js convention.
 *
 * P5-P6 mirror (Sprint 1, 2026-10-30): every item carries q.syl = 'P6'. MCQ distractors
 * carry q.miscon = { choiceIndex: tag } and a coaching line in q.optionFeedback; typed
 * items carry q.slips = { '<wrong value>': tag }. Tags are defined once, in the topic's
 * `misconceptions` map. Pool 3 is PSLE Paper 2 shape: band 3, worded, q.exam = 'problem',
 * coached with q.technique + q.steps.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, finishTyped = G.finishTyped;

  const NAMES = ['Hui Min', 'Farid', 'Kavitha', 'Jun Hao', 'Siti', 'Ravi', 'Mei Ling', 'Ahmad',
                 'Bala', 'Xin Yi', 'Daniel', 'Nurul', 'Wei Jie', 'Aisyah'];
  /* [item, lowest, highest] believable price in dollars: every price, or every amount
     spent on the item, is drawn inside its band (review 2026-10-30: "$4 on a bicycle") */
  const GOODS = [['school bag', 20, 80], ['study lamp', 20, 80], ['standing fan', 30, 150], ['rice cooker', 40, 300],
                 ['badminton racket', 30, 250], ['pair of running shoes', 50, 250], ['microwave oven', 80, 500],
                 ['bicycle', 100, 1200]];
  const inBand = (g, x) => x >= g[1] && x <= g[2];
  const P6 = q => (q.syl = 'P6', q);
  const $ = n => '$' + n;
  const pc = n => n + '%';
  /* the smallest whole that has a whole-number pct% part: 100 / gcd(pct, 100) */
  const stepFor = pct => 100 / gcd(pct, 100);
  /* a multiple of stepFor(pct) inside [lo, hi] */
  const wholeFor = (pct, lo, hi) => {
    const s = stepFor(pct), a = Math.ceil(lo / s), b = Math.floor(hi / s);
    return b >= a ? s * ri(a, b) : null;
  };
  /* Paper 1 (no calculator): a round whole whose pct% part is a whole number */
  const FRIENDLY = [20, 40, 50, 60, 80, 100, 120, 150, 160, 200, 240, 250, 300, 400, 500, 600, 800];
  const friendlyIn = (pct, lo, hi) => {
    const c = FRIENDLY.filter(w => w >= lo && w <= hi && (w * pct) % 100 === 0);
    return c.length ? pick(c) : null;
  };
  /* bigger-ticket goods for the GST problems */
  const BIG = ['laptop', 'television', 'refrigerator', 'washing machine', 'sofa set', 'dining table'];
  /* No key may be a number the stem already prints (a given value, a percentage or the
     "e.g." hint): a child who copies a number off the stem must not score. mcq() and
     slips() return null on such a draw and the caller redraws. */
  const stemNums = s => (String(s).replace(/<[^>]*>/g, '').match(/\d+/g) || []).map(Number);
  const keyInStem = (stem, key) => stemNums(stem).indexOf(key) !== -1;
  /* redraw until a draw survives its guards */
  const redraw = draw => { for (let t = 0; t < 5000; t++) { const q = draw(); if (q) return q; } throw new Error('percent: no draw survived'); };

  /* MCQ with tagged distractors. dist = [[value, tag, coaching], ...]; values are numbers,
     fmt prints them. Keeps the first three positive whole values that differ from the key
     and each other. Returns null if fewer than three survive or the key is printed in
     the stem. */
  function mcq(stem, key, dist, explain, fmt) {
    if (keyInStem(stem, key)) return null;
    const seen = [key], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      if (!Number.isInteger(d[0]) || d[0] <= 0 || seen.indexOf(d[0]) !== -1) continue;
      seen.push(d[0]); keep.push(d);
    }
    if (keep.length < 3) return null;
    const rows = shuffle([[key, null, null]].concat(keep));
    const q = { q: stem, extra: '', choices: rows.map(r => fmt(r[0])), correct: 0, explain, answerText: fmt(key) };
    q.correct = rows.findIndex(r => r[1] === null);
    q.miscon = {}; q.optionFeedback = {};
    rows.forEach((r, i) => { if (r[1]) { q.miscon[i] = r[1]; q.optionFeedback[i] = r[2]; } });
    return P6(q);
  }
  /* typed slips: positive values, exact to 2 decimal places, that differ from the key.
     Returns null when the key is printed in the stem. */
  function slips(q, list) {
    if (keyInStem(q.q, q.answer)) return null;
    const s = {};
    for (const [v, tag] of list) {
      if (!Number.isFinite(v) || v <= 0) continue;
      const r = Math.round(v * 100) / 100;
      if (Math.abs(r - v) > 1e-9 || r === q.answer || String(r) in s) continue;
      s[String(r)] = tag;
    }
    q.slips = s;
    return P6(q);
  }
  const money = (q, n) => (q.answerText = '$' + n, q);
  const asPct = (q, n) => (q.answerText = n + '%', q);
  const band3 = (q, technique, steps) => (q.band = 3, q.exam = 'problem', q.technique = technique, q.steps = steps, q);

  /* 1.1: the whole from a part and its percentage, MCQ (pools 1 and 2) */
  function gWholeFromPart() {
    return redraw(() => {
      const pct = pick([10, 20, 25, 30, 40, 50, 60, 75]);
      const ctx = Math.random() < 0.5, g = pick(GOODS);
      const whole = ctx ? friendlyIn(pct, g[1], g[2]) : friendlyIn(pct, 20, 800);
      if (!whole) return null;
      const part = whole * pct / 100;
      const stem = ctx
        ? pick(NAMES) + ' has saved $' + part + '. This is ' + pct + '% of the money needed to buy a new ' + g[0] +
          '. How much money is needed to buy it?'
        : pct + '% of a number is ' + part + '. What is the number?';
      return mcq(stem, whole, [
        [part * pct / 100, 'percent-of-part', 'That is ' + pct + '% of ' + part + '. Here ' + part + ' IS the ' + pct + '%, so the whole is bigger than ' + part + '.'],
        [whole - part, 'remaining-part', 'That is the other ' + (100 - pct) + '%. The question asks for the whole, which is 100%.'],
        [part / pct, 'one-percent-only', 'That is the value of 1%. The whole is 100%, so multiply by 100.'],
        [part + pct, 'added-percent', 'Adding ' + pct + ' to ' + part + ' mixes a percentage with an amount. Find 1% first, then 100%.'],
        [part * 100 / (100 - pct), 'complement-percent', part + ' is ' + pct + '% of the whole, not ' + (100 - pct) + '%. Use the percentage that goes with ' + part + '.'],
        [part, 'answered-part', part + ' is only ' + pct + '% of the whole. The whole is 100%.']
      ], pct + '% is ' + part + ', so 1% is ' + part + ' ÷ ' + pct + ' and 100% is ' + part + ' ÷ ' + pct + ' × 100 = ' + whole + '.', ctx ? $ : String);
    });
  }

  /* 1.2: percentage increase or decrease with friendly numbers, MCQ (pool 1) */
  function gPctChange() {
    return redraw(() => {
      const up = Math.random() < 0.5;
      const pct = pick(up ? [10, 20, 25, 40, 50] : [10, 20, 25, 40, 50, 75]);
      const money1 = Math.random() < 0.5, g = pick(GOODS);
      const old = money1 ? friendlyIn(pct, g[1], g[2]) : friendlyIn(pct, 20, 800);
      if (!old) return null;
      const ch = old * pct / 100, nw = up ? old + ch : old - ch;
      if (money1 && !inBand(g, nw)) return null;
      const word = up ? 'increase' : 'decrease';
      const stem = money1
        ? 'The price of a ' + g[0] + ' ' + (up ? 'went up' : 'went down') + ' from $' + old + ' to $' + nw + '. What is the percentage ' + word + ' in the price?'
        : 'The number of visitors to a library ' + (up ? 'rose' : 'fell') + ' from ' + old + ' to ' + nw + '. What is the percentage ' + word + ' in the number of visitors?';
      return mcq(stem, pct, [
        [ch * 100 / nw, 'new-as-base', 'Compare the change with the value at FIRST (' + old + '), not the new value.'],
        [ch, 'change-as-percent', ch + ' is the amount of the change, not a percentage. Divide it by ' + old + ' and multiply by 100.'],
        [nw * 100 / old, 'new-over-old', 'That is the new value as a percentage of the old one. The ' + word + ' is the difference from 100%.'],
        [100 - pct, 'complement', 'That is what is left after the change. The question asks for the change itself.']
      ], 'The ' + word + ' is ' + ch + '. Compared with the first value: ' + ch + ' ÷ ' + old + ' × 100 = ' + pct + '%.', pc);
    });
  }

  /* 1.1: the whole from a part, typed pages (pool 1) */
  function gPagesRead() {
    return redraw(() => {
      const pct = pick([10, 20, 25, 40, 50, 60, 75]);
      const whole = friendlyIn(pct, 60, 800), part = whole * pct / 100;
      const stem = pick(NAMES) + ' has read ' + part + ' pages of a storybook. That is ' + pct + '% of the book. How many pages are there in the book?';
      const q1 = finishTyped(stem, whole,
        pct + '% of the book is ' + part + ' pages, so 1% is ' + part + ' ÷ ' + pct + ' pages and 100% is ' + part + ' ÷ ' + pct + ' × 100 = ' + whole + ' pages.', 'pages');
      return slips(q1, [[part * pct / 100, 'percent-of-part'], [whole - part, 'remaining-part'], [part / pct, 'one-percent-only'],
        [part + pct, 'added-percent'], [part, 'answered-part']]);
    });
  }

  /* 1.1: the whole from a part, harder percentages, typed $ (pool 2). The amount spent
     is the item's price, so it sits in the item's band. */
  function gSavings() {
    return redraw(() => {
      const pct = pick([8, 12, 15, 24, 35, 45, 65, 72, 85]), g = pick(GOODS);
      const whole = wholeFor(pct, Math.max(40, Math.ceil(g[1] * 100 / pct)), Math.min(3000, Math.floor(g[2] * 100 / pct)));
      if (!whole) return null;
      const part = whole * pct / 100, name = pick(NAMES);
      const stem = name + ' spent $' + part + ' on a ' + g[0] + '. This was ' + pct + '% of ' + name +
        '\'s savings. How much were ' + name + '\'s savings before buying it? (in dollars, e.g. 240)';
      const q1 = money(finishTyped(stem, whole,
        pct + '% of the savings is $' + part + ', so 1% is $' + part + ' ÷ ' + pct + ' and 100% is $' + part + ' ÷ ' + pct + ' × 100 = $' + whole + '.', '$'), whole);
      return slips(q1, [[part * pct / 100, 'percent-of-part'], [whole - part, 'remaining-part'], [part / pct, 'one-percent-only'],
        [part + pct, 'added-percent'], [part * 100 / (100 - pct), 'complement-percent']]);
    });
  }

  /* 1.1: the whole from the part that is LEFT, MCQ $ (pool 2). The amount spent sits in
     the item's band. */
  function gWholeFromLeft() {
    return redraw(() => {
      const pct = pick([10, 20, 25, 30, 40, 60, 75]), g = pick(GOODS);
      const whole = wholeFor(pct, Math.max(40, Math.ceil(g[1] * 100 / pct)), Math.min(2000, Math.floor(g[2] * 100 / pct)));
      if (!whole) return null;
      const spent = whole * pct / 100, left = whole - spent;
      const stem = pick(NAMES) + ' spent ' + pct + '% of the money in a savings tin on a ' + g[0] + ' and had $' + left +
        ' left. How much money was in the tin at first?';
      return mcq(stem, whole, [
        [left * 100 / pct, 'complement-percent', 'The $' + left + ' left is ' + (100 - pct) + '% of the money, not ' + pct + '%. ' + pct + '% is what was spent.'],
        [left + left * pct / 100, 'percent-of-part', 'That adds ' + pct + '% of $' + left + '. The ' + pct + '% was taken from the money at first, not from what was left.'],
        [left + pct, 'added-percent', 'Adding ' + pct + ' mixes a percentage with dollars. Find what 1% of the money is first.'],
        [spent, 'answered-change', 'That is the amount spent. The question asks for all the money at first.']
      ], 'What is left is 100% − ' + pct + '% = ' + (100 - pct) + '% of the money. 1% is $' + left + ' ÷ ' + (100 - pct) +
        ', so 100% is $' + left + ' ÷ ' + (100 - pct) + ' × 100 = $' + whole + '.', $);
    });
  }

  /* 1.2: percentage increase or decrease, harder numbers, typed % (pool 2). The hint
     "e.g. 7" is a percentage no draw produces. */
  function gPctChangeTyped() {
    return redraw(() => {
      const up = Math.random() < 0.5;
      const pct = pick(up ? [5, 8, 12, 15, 35, 45, 60, 64] : [5, 8, 12, 15, 35, 45, 60, 64, 85]);
      const club = Math.random() < 0.5, g = pick(GOODS);
      const old = club ? wholeFor(pct, 30, 900) : wholeFor(pct, g[1], g[2]);
      if (!old) return null;
      const ch = old * pct / 100, nw = up ? old + ch : old - ch;
      if (!club && !inBand(g, nw)) return null;
      const word = up ? 'increase' : 'decrease';
      const stem = club
        ? 'The number of members of a badminton club ' + (up ? 'rose' : 'fell') + ' from ' + old + ' to ' + nw + '. Find the percentage ' + word + ' in the number of members. (answer in %, e.g. 7)'
        : 'The price of a ' + g[0] + ' ' + (up ? 'went up' : 'went down') + ' from $' + old + ' to $' + nw + '. Find the percentage ' + word + ' in the price. (answer in %, e.g. 7)';
      const q1 = asPct(finishTyped(stem, pct,
        'The ' + word + ' is ' + ch + '. Compared with the first value: ' + ch + ' ÷ ' + old + ' × 100 = ' + pct + '%.', '%'), pct);
      return slips(q1, [[ch * 100 / nw, 'new-as-base'], [ch, 'change-as-percent'], [nw * 100 / old, 'new-over-old']]);
    });
  }

  /* Paper 2: the price before a discount (pool 3, band 3) */
  function gBeforeDiscount() {
    return redraw(() => {
      const pct = pick([10, 15, 20, 25, 30, 35, 40]), g = pick(GOODS);
      const O = wholeFor(pct, Math.max(40, g[1]), g[2]);
      if (!O) return null;
      const off = O * pct / 100, S = O - off, r = 100 - pct;
      const name = pick(NAMES), item = g[0];
      const stem = 'During a sale, every item in a shop was sold at a ' + pct + '% discount. ' + name + ' paid $' + S + ' for a ' + item +
        ' during the sale. What was the price of the ' + item + ' before the discount? (in dollars, e.g. 150)';
      const q1 = money(finishTyped(stem, O,
        name + ' paid 100% − ' + pct + '% = ' + r + '% of the usual price. 1% is $' + S + ' ÷ ' + r + ', so the usual price is $' + S + ' ÷ ' + r + ' × 100 = $' + O + '.', '$'), O);
      band3(q1, 'Work backwards', [
        'The usual price is 100%. A ' + pct + '% discount means ' + name + ' paid ' + r + '% of the usual price.',
        'So ' + r + '% of the usual price is $' + S + '.',
        '1% of the usual price is $' + S + ' ÷ ' + r + '.',
        'The usual price is 100%: $' + S + ' ÷ ' + r + ' × 100 = <b>$' + O + '</b>.'
      ]);
      return slips(q1, [[S * (100 + pct) / 100, 'percent-of-part'], [off, 'answered-change'], [S + pct, 'added-percent'],
        [S * 100 / pct, 'complement-percent']]);
    });
  }

  /* Paper 2: GST-inclusive price back to the price before GST, or the GST (pool 3, band 3) */
  function gGstBack() {
    return redraw(() => {
      const k = ri(3, 25), B = 100 * k, gst = 9 * k, T = B + gst;
      const name = pick(NAMES), item = pick(BIG), askBase = Math.random() < 0.5;
      const stem = name + ' paid $' + T + ' for a ' + item + '. This price included 9% GST. ' +
        (askBase ? 'What was the price of the ' + item + ' before GST? (in dollars, e.g. 200)' : 'How much GST did ' + name + ' pay? (in dollars, e.g. 18)');
      const ans = askBase ? B : gst;
      const q1 = money(finishTyped(stem, ans,
        '$' + T + ' is 100% + 9% = 109% of the price before GST, so 1% is $' + T + ' ÷ 109 = $' + k + '. ' +
        (askBase ? 'The price before GST is $' + k + ' × 100 = $' + B + '.' : 'The GST is 9%: $' + k + ' × 9 = $' + gst + '.'), '$'), ans);
      band3(q1, 'Work backwards', [
        'The price before GST is 100%. GST adds 9%, so the $' + T + ' paid is 109% of the price before GST.',
        '1% of the price before GST is $' + T + ' ÷ 109 = $' + k + '.',
        askBase ? 'The price before GST is 100%: $' + k + ' × 100 = <b>$' + B + '</b>.'
                : 'The GST is 9% of the price before GST: $' + k + ' × 9 = <b>$' + gst + '</b>.'
      ]);
      return slips(q1, askBase
        ? [[T * 91 / 100, 'percent-of-part'], [T - 9, 'percent-as-dollars'], [gst, 'answered-change']]
        : [[T * 9 / 100, 'percent-of-part'], [B, 'answered-whole'], [9, 'percent-as-dollars']]);
    });
  }

  /* Paper 2: an increase then a decrease, the final value (pool 3, band 3). All three
     prices sit in the item's band; a = 25 with b = 20 (x 1.25 x 0.8 = 1) is never drawn,
     and no draw ends where it started. */
  function gTwoChanges() {
    return redraw(() => {
      const a = pick([10, 20, 25, 30, 40, 50]), b = pick([10, 20, 25, 30, 40, 50]), g = pick(GOODS);
      if (a === 25 && b === 20) return null;
      const P = 10 * ri(Math.ceil(g[1] / 10), Math.floor(g[2] / 10));
      if ((P * a) % 100) return null;
      const inc = P * a / 100, M = P + inc;
      if ((M * b) % 100) return null;
      const dec = M * b / 100, F = M - dec;
      if (F === P || !inBand(g, M) || !inBand(g, F)) return null;
      const item = g[0];
      const stem = 'In January, the price of a ' + item + ' was $' + P + '. In March, the price was increased by ' + a +
        '%. In June, the new price was decreased by ' + b + '%. What was the price of the ' + item + ' in June? (in dollars, e.g. 90)';
      const q1 = money(finishTyped(stem, F,
        'The increase is ' + a + '% of $' + P + ' = $' + inc + ', so the March price is $' + M + '. The decrease is ' + b + '% of the NEW price $' + M +
        ' = $' + dec + ', so the June price is $' + M + ' − $' + dec + ' = $' + F + '.', '$'), F);
      band3(q1, 'Before and after', [
        'The increase is ' + a + '% of $' + P + ': $' + P + ' ÷ 100 × ' + a + ' = $' + inc + '.',
        'The price in March is $' + P + ' + $' + inc + ' = $' + M + '.',
        'The decrease is ' + b + '% of the March price, not the January price: $' + M + ' ÷ 100 × ' + b + ' = $' + dec + '.',
        'The price in June is $' + M + ' − $' + dec + ' = <b>$' + F + '</b>.'
      ]);
      return slips(q1, [[P * (100 + a - b) / 100, 'net-percent'], [M - P * b / 100, 'wrong-base'], [M, 'answered-first-change']]);
    });
  }

  /* Paper 2: a change in values, then a percentage change across both years (pool 3, band 3) */
  function gChainPct() {
    return redraw(() => {
      const A = ri(8, 120) * 5, x = pick([10, 20, 25, 30, 40, 50, 60]);
      if ((A * x) % 100) return null;
      const B = A + A * x / 100, c = pick([10, 20, 25, 30, 40, 50]);
      if ((B * c) % 100) return null;
      const d = B * c / 100, C = B - d;
      if (C === A) return null;
      const up = C > A, diff = Math.abs(C - A);
      if ((diff * 100) % A) return null;
      const p = diff * 100 / A, word = up ? 'increase' : 'decrease';
      const stem = 'In 2024, a swimming club had ' + A + ' members. In 2025, it had ' + B + ' members. In 2026, the club had ' + c +
        '% fewer members than in 2025. What is the percentage ' + word + ' in the number of members from 2024 to 2026? (answer in %, e.g. 15)';
      const q1 = asPct(finishTyped(stem, p,
        c + '% of ' + B + ' is ' + d + ', so in 2026 there were ' + B + ' − ' + d + ' = ' + C + ' members. The ' + word + ' from 2024 is ' + diff +
        ', and ' + diff + ' ÷ ' + A + ' × 100 = ' + p + '%.', '%'), p);
      band3(q1, 'Before and after', [
        c + '% of the 2025 members is ' + B + ' ÷ 100 × ' + c + ' = ' + d + '.',
        'So in 2026 there were ' + B + ' − ' + d + ' = ' + C + ' members.',
        'The ' + word + ' from 2024 to 2026 is ' + (up ? C + ' − ' + A : A + ' − ' + C) + ' = ' + diff + ' members.',
        'Compare it with 2024, the first year: ' + diff + ' ÷ ' + A + ' × 100 = <b>' + p + '%</b>.'
      ]);
      return slips(q1, [[x, 'answered-first-change'], [Math.abs(x - c), 'net-percent'], [diff, 'change-as-percent'], [diff * 100 / C, 'new-as-base']]);
    });
  }

  /* Paper 2: the gap between two percentages gives the whole (pool 3, band 3) */
  function gDiffModel() {
    return redraw(() => {
      const bp = pick([30, 35, 38, 40, 42, 44, 45, 46, 48]), gp = 100 - bp, d = gp - bp;
      const T = ri(15, 100) * 20;
      if ((T * bp) % 100 || (T * d) % 100) return null;
      const diff = T * d / 100, boys = T * bp / 100, girls = T - boys;
      const stem = 'In a school, ' + bp + '% of the pupils are boys and the rest are girls. There are ' + diff +
        ' more girls than boys. How many pupils are there in the school altogether?';
      const q1 = finishTyped(stem, T,
        'The girls are ' + gp + '% and the boys ' + bp + '%, so the ' + diff + ' extra girls are ' + gp + '% − ' + bp + '% = ' + d +
        '% of the pupils. 100% is ' + diff + ' ÷ ' + d + ' × 100 = ' + T + ' pupils.', 'pupils');
      band3(q1, 'Draw a model', [
        'The girls are the rest: 100% − ' + bp + '% = ' + gp + '% of the pupils.',
        'The difference between the girls and the boys is ' + gp + '% − ' + bp + '% = ' + d + '% of the pupils, and that ' + d + '% is the ' + diff + ' extra girls.',
        '1% of the pupils is ' + diff + ' ÷ ' + d + '.',
        'All the pupils are 100%: ' + diff + ' ÷ ' + d + ' × 100 = <b>' + T + '</b>.'
      ]);
      return slips(q1, [[diff * 100 / bp, 'difference-percent'], [diff * 100 / gp, 'difference-percent'], [girls, 'answered-one-part'], [boys, 'answered-one-part']]);
    });
  }


  MQI.registerTopic({
    id: 'percent', level: 'P6', strand: 'Number and Algebra',
    moeSubTopic: 'Percentage: finding the whole given a part and the percentage; finding percentage increase/decrease',
    label: 'Percentage Peak', short: 'Percentage', e: '⛰️',
    skills: {
      whole:    { label: 'Finding the whole', tip: 'Find what 1% is worth first, then multiply by 100 to reach the whole.' },
      change:   { label: 'Percentage increase and decrease', tip: 'Always divide the change by the value at the START, never the new value.' },
      backward: { label: 'Working backwards', tip: 'After a discount or GST, the price paid is not 100%. Ask: what percentage did I actually pay?' },
      twostep:  { label: 'Changes one after another', tip: 'A second percentage change is taken of the NEW value. Work out each step in turn.' },
      model:    { label: 'Percentage models', tip: 'Draw the two groups as bars and mark the gap as a percentage of the whole.' }
    },
    misconceptions: {
      'percent-of-part':       'Takes the percentage of the given amount instead of finding the whole that amount is part of.',
      'remaining-part':        'Gives the rest of the whole instead of the whole.',
      'one-percent-only':      'Stops at the value of 1%.',
      'added-percent':         'Adds the percentage number to an amount, as if they were the same kind of quantity.',
      'complement-percent':    'Uses the other percentage (100% minus the one given) for the given amount.',
      'answered-part':         'Gives the part printed in the question as the whole.',
      'new-as-base':           'Divides the change by the new value instead of the value at the start.',
      'change-as-percent':     'Writes the amount of change as the percentage change.',
      'new-over-old':          'Gives the new value as a percentage of the old one instead of the change.',
      'complement':            'Gives 100% minus the percentage change.',
      'answered-change':       'Gives the amount of change (spent, discount or GST) instead of the value asked for.',
      'percent-as-dollars':    'Treats the GST percentage as a number of dollars.',
      'answered-whole':        'Gives the price before GST when the question asks for the GST.',
      'net-percent':           'Combines the two percentages directly, as if both were taken of the same amount.',
      'wrong-base':            'Takes the second percentage of the original amount instead of the new amount.',
      'answered-first-change': 'Stops after the first change.',
      'difference-percent':    'Uses one group\'s percentage for the difference instead of the gap between the two percentages.',
      'answered-one-part':     'Gives one group\'s number instead of the total.'
    },
    pools: {
      1: [[gWholeFromPart, 'whole'], [gPctChange, 'change'], [gPagesRead, 'whole']],
      2: [[gSavings, 'whole'], [gWholeFromLeft, 'whole'], [gPctChangeTyped, 'change'], [gWholeFromPart, 'whole']],
      3: [[gBeforeDiscount, 'backward'], [gGstBack, 'backward'], [gTwoChanges, 'twostep'], [gChainPct, 'change'], [gDiffModel, 'model']]
    }
  });
})();
