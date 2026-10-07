"use strict";
/* Math Quest Island topic: p3money (P3). Self-contained. Typed, unit-bearing.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.35): adding and subtracting money in decimal
 * notation ONLY. No multiplication or division of money (that is P4 decimals),
 * amounts kept under $100, answers never negative.
 * lane/hard-money 2026-10-07 (Math Hardness Calibration cards Mo1, Mo2, #13):
 * bundle / least-cost items print WHOLE DOLLARS only, so their x and / are P3
 * whole-number operations ("4 for $10", 3 bundles = 3 x 10), never decimal
 * x or /. Every amount carrying cents is only ever added or subtracted.
 * q.band: 2 = standard, 3 = exam-hard multi-step (>= 3 operations, one of them
 * a model or an interpretation step). The mock routes on it.
 * Unit convention: the unit lives in the QUESTION STEM ("in dollars, e.g. 4.75")
 * and the typed answer is a bare number, per js/topics/README.md - but every
 * finishTyped here ALSO declares '$' so gradeTyped rejects a wrong unit.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Mei Ling'];
  const STALLS = ['the hawker centre','the kopitiam','NTUC FairPrice','the wet market','the MRT station kiosk'];
  const CHEAP = ['a kopi-o','a soya bean drink','a curry puff','a packet of kaya toast','a bag of ang ku kueh'];
  const MEALS = ['a plate of chicken rice','a bowl of laksa','a plate of char kway teow','a set of nasi lemak','a bowl of fishball noodles'];
  const BIG   = ['a durian','a bag of oranges','a tub of ice cream','a box of pineapple tarts'];

  const money = c => '$' + (c/100).toFixed(2);
  const dollars = c => Number((c/100).toFixed(2));
  /* Singapore withdrew the 1-cent coin in 2002, so every hawker price must be
     cash-payable: force the last cent digit to 0 or 5. */
  function cents(lo, hi){ let c = ri(lo, hi); c -= c % 5; if (c < lo) c += 5; return c; }

  /* UNIT DECLARED as '$' on every typed item here. The stem says "in dollars" and
     the answer is a bare decimal, but a typed question that declares NO unit lets
     gradeTyped accept any token off the shared TYPED_UNITS list - "4.75 kg" and
     "4.75 pupils" both graded CORRECT (Dress Rehearsal Phase 0, 2026-09-07, same
     defect class as p5triangle). With '$' declared, a bare "4.75" still passes, a
     leading "$4.75" still passes, and a wrong unit is now rejected.
     answerText is re-rendered as money so the review card reads "$4.75" rather
     than finishTyped's default "4.75 $" - same shape as p5-rate.js gParkingCharge. */
  const asMoney = (q, c) => (q.answerText = money(c), q);

  function gAddTwo(){
    const who = pick(NAMES), a = cents(120, 590);
    const b = cents(80, 450);
    const t = a + b;
    return asMoney(finishTyped(who + ' spends ' + money(a) + ' on ' + pick(MEALS) + ' and ' + money(b) + ' on ' +
      pick(CHEAP) + ' at ' + pick(STALLS) + '. How much does ' + who + ' spend in total? (in dollars, e.g. 4.75)',
      dollars(t),
      'Line up the dollars with the dollars and the cents with the cents: ' + money(a) + ' + ' + money(b) + ' = ' + money(t) + '.',
      '$'), t);
  }
  function gAddBig(){
    const who = pick(NAMES), a = cents(850, 2900);
    const b = cents(650, 2400);
    const t = a + b;
    return asMoney(finishTyped(who + ' spends ' + money(a) + ' on ' + pick(BIG) + ' and ' + money(b) + ' on ' +
      pick(MEALS) + ' at ' + pick(STALLS) + '. How much is spent in total? (in dollars, e.g. 14.75)',
      dollars(t),
      'Add the cents first: they make ' + ((a%100)+(b%100)) + ' cents' +
      (((a%100)+(b%100)) >= 100 ? ', which is over a dollar, so carry 1 to the dollars. ' : '. ') +
      money(a) + ' + ' + money(b) + ' = ' + money(t) + '.',
      '$'), t);
  }
  function gAddThree(){
    const who = pick(NAMES), a = cents(150, 700), b = cents(120, 600);
    const c = cents(90, 500);
    const t = a + b + c;
    return band(asMoney(finishTyped(who + ' buys ' + pick(MEALS) + ' for ' + money(a) + ', ' + pick(CHEAP) + ' for ' + money(b) +
      ' and ' + pick(CHEAP) + ' for ' + money(c) + ' at ' + pick(STALLS) +
      '. How much does the food cost in total? (in dollars, e.g. 9.85)',
      dollars(t),
      'Add two at a time: ' + money(a) + ' + ' + money(b) + ' = ' + money(a+b) + ', then ' + money(a+b) + ' + ' + money(c) + ' = ' + money(t) + '.',
      '$'), t), 2);
  }
  function gSubSmall(){
    const who = pick(NAMES), have = cents(600, 990);
    const spend = cents(150, 550);
    const left = have - spend;
    return asMoney(finishTyped(who + ' has ' + money(have) + '. ' + who + ' buys ' + pick(CHEAP) + ' for ' + money(spend) +
      ' at ' + pick(STALLS) + '. How much money is left? (in dollars, e.g. 2.35)',
      dollars(left),
      money(have) + ' - ' + money(spend) + ' = ' + money(left) + '. Subtract the cents first, then the dollars.',
      '$'), left);
  }
  function gSubBorrow(){
    const who = pick(NAMES), spend = cents(1250, 4400), left = cents(120, 900);
    const have = spend + left;
    return asMoney(finishTyped(who + ' has ' + money(have) + '. ' + who + ' pays ' + money(spend) + ' for ' + pick(BIG) +
      ' at ' + pick(STALLS) + '. How much money is left? (in dollars, e.g. 6.45)',
      dollars(left),
      'Change one dollar into 100 cents if the cents will not subtract: ' + money(have) + ' - ' + money(spend) + ' = ' + money(left) + '.',
      '$'), left);
  }
  function gChange(){
    const who = pick(NAMES), b = cents(120, 640);
    const a = cents(180, 780);
    const note = pick([1000, 2000, 5000]);
    const given = (a + b) < note ? note : 5000;
    const chg = given - a - b;
    return band(asMoney(finishTyped(who + ' buys ' + pick(MEALS) + ' for ' + money(a) + ' and ' + pick(CHEAP) + ' for ' + money(b) +
      ' at ' + pick(STALLS) + ', then hands the stallholder ' + money(given) +
      '. How much change should ' + who + ' get? (in dollars, e.g. 3.15)',
      dollars(chg),
      'First find the cost: ' + money(a) + ' + ' + money(b) + ' = ' + money(a+b) + '. Then ' + money(given) + ' - ' + money(a+b) + ' = ' + money(chg) + '.',
      '$'), chg), 2);
  }

  /* ===== lane/hard-money 2026-10-07 ===================================== */
  const band = (q, b) => (q.band = b, q);
  const usd = d => '$' + d;                         /* whole dollars, as papers print "4 for $10" */
  const an = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
  const cap1 = w => w.charAt(0).toUpperCase() + w.slice(1);
  /* A change amount under a dollar is printed in cents ("75¢") half the time, so
     the child has to read 75¢ as $0.75 - not $7.50 (card Mo2's named slip). */
  const chgText = c => c < 100 && Math.random() < 0.5 ? c + '¢' : money(c);
  /* A money MCQ: the four options are amounts, so finishNum (integers + a word
     unit) cannot carry them. Distractors come only from named slips. */
  function moneyMcq(q, keyC, slips, fmt, explain){
    const seen = [keyC], opts = [keyC];
    for (const c of shuffle(slips)) {
      if (opts.length >= 4) break;
      if (c > 0 && Number.isInteger(c) && !seen.includes(c)) { seen.push(c); opts.push(c); }
    }
    const step = fmt === usd ? 1 : 10;
    for (let t = 1; opts.length < 4 && t < 80; t++)
      for (const c of [keyC + t * step, keyC - t * step])
        if (opts.length < 4 && c > 0 && !seen.includes(c)) { seen.push(c); opts.push(c); }
    const order = shuffle(opts.map((_, i) => i));
    const choices = order.map(i => fmt(opts[i]));
    return { q, extra:'', choices, correct: order.indexOf(0), explain, answerText: fmt(keyC) };
  }

  /* Items a P3 child believes cost $2-$6 each, so the whole-dollar singles read true. */
  const BUNDLE = [
    {s:'cup of bubble tea', p:'cups of bubble tea', at:'a shop in Tampines'},
    {s:'notebook', p:'notebooks', at:'the school bookshop'},
    {s:'bottle of juice', p:'bottles of juice', at:'a shop in Jurong Point'},
    {s:'tub of cookies', p:'tubs of cookies', at:'a stall at the pasar malam'},
    {s:'box of crayons', p:'boxes of crayons', at:'the school bookshop'},
    {s:'packet of ang ku kueh', p:'packets of ang ku kueh', at:'a bakery in Toa Payoh'}
  ];
  /* Mo1a. "$3 each, or 4 for $10 - least you pay for 11?" The bundle price sits
     strictly between (B-1) singles and B singles, so the cheapest way is unique:
     as many bundles as fit, the rest as singles (over-buying a bundle always
     costs more than the leftover singles). 4 operations: divide, two products, add. */
  function gBundleLeast(){
    for (;;) {
      const it = pick(BUNDLE), who = pick(NAMES);
      const S = ri(2, 6), B = ri(3, 6), P = ri((B - 1) * S + 1, B * S - 1);
      const N = ri(B + 1, 5 * B - 1);
      const q = Math.floor(N / B), r = N % B, T = q * P + r * S;
      if (T > 99 || N * S > 120) continue;
      const one = n => n === 1 ? it.s : it.p;
      const ex = 'Buying ' + B + ' ' + it.p + ' one by one costs ' + B + ' × ' + usd(S) + ' = ' + usd(B * S) +
        ', but ' + B + ' for ' + usd(P) + ' is cheaper, so buy as many bundles as you can. ' +
        N + ' ÷ ' + B + ' = ' + q + (r ? ' remainder ' + r : '') + ', so ' + q + ' bundle' + (q === 1 ? '' : 's') +
        ' cost ' + q + ' × ' + usd(P) + ' = ' + usd(q * P) + '. ' +
        (r ? 'The ' + r + ' ' + one(r) + ' left over cost ' + r + ' × ' + usd(S) + ' = ' + usd(r * S) +
             ' (cheaper than one more bundle at ' + usd(P) + '). Total: ' + usd(q * P) + ' + ' + usd(r * S) + ' = ' + usd(T) + '.'
           : 'There are none left over, so the total is ' + usd(T) + '.') +
        ' Buying all ' + N + ' one by one would cost ' + usd(N * S) + '.';
      return band(asMoney(finishTyped('At ' + it.at + ', ' + it.p + ' cost ' + usd(S) + ' each, or ' + B + ' for ' + usd(P) +
        '. ' + who + ' needs ' + N + ' ' + it.p + '. What is the least amount ' + who + ' must pay? (in dollars, e.g. 4.75)',
        T, ex, '$'), T * 100), 3);
    }
  }

  const PACKS = [{s:'pen', p:'pens'}, {s:'marker', p:'markers'}, {s:'eraser', p:'erasers'}, {s:'sticker sheet', p:'sticker sheets'}, {s:'exercise book', p:'exercise books'}];
  /* Mo1b. "A packet of 5 pens costs $8 and comes with 2 free pens; pens are sold
     only in packets. Least you pay for at least 42?" MCQ - the slips are the card's:
     free pens ignored, free pens counted only once, the packet count given as the
     answer, and no round-up when the packets do not come out exact. */
  function gBundlePacks(){
    for (;;) {
      const it = pick(PACKS), who = pick(NAMES);
      const K = ri(3, 6), F = ri(1, K - 1), P = ri(2, 9), per = K + F;
      const m = ri(3, 8), exact = Math.random() < 0.5;
      const N = exact ? m * per : m * per - ri(1, per - 1);
      const packs = Math.ceil(N / per), T = packs * P;
      if (T > 80 || N > 90) continue;
      const slips = [Math.ceil(N / K) * P, Math.ceil((N - F) / K) * P, packs, Math.floor(N / per) * P, (packs + 1) * P];
      const ex = 'Each packet gives ' + K + ' + ' + F + ' = ' + per + ' ' + it.p + ' (the free ones count too). ' +
        N + ' ÷ ' + per + ' = ' + (exact ? packs : Math.floor(N / per) + ' remainder ' + (N % per) +
        ', and the packets come whole, so ' + Math.floor(N / per) + ' packets are not enough: buy ' + packs) +
        ' packets. ' + packs + ' × ' + usd(P) + ' = ' + usd(T) + '. ' + packs + ' is the number of packets, not the cost.';
      return band(moneyMcq('At the school bookshop, a packet of ' + K + ' ' + it.p + ' costs ' + usd(P) + ', and every packet comes with ' +
        F + ' free ' + (F === 1 ? it.s : it.p) + '. ' + cap1(it.p) + ' are sold only in packets. What is the least amount ' + who +
        ' must pay to get at least ' + N + ' ' + it.p + '?', T, slips, usd, ex), 3);
    }
  }

  const FRUIT = ['apples', 'oranges', 'pears', 'mangoes', 'guavas'];
  /* Mo1c. "Apples are 3 for $4. Mei spent $24. How many apples?" With money left
     over it is 3 operations (band 3); without, 2 (band 2). The unit is the fruit. */
  function gBundleHowMany(){
    for (;;) {
      const f = pick(FRUIT), who = pick(NAMES);
      const Gs = ri(2, 5), P = ri(2, 9), g = ri(3, 9), S = g * P, N = g * Gs;
      if (S > 60 || P === Gs) continue;
      const hard = Math.random() < 0.6, L = ri(1, 15), H = S + L;
      const tail = S + ' ÷ ' + P + ' = ' + g + ' groups. Each group has ' + Gs + ' ' + f + ', so ' + g + ' × ' + Gs + ' = ' + N +
        ' ' + f + '. (' + g + ' is the number of groups, not the number of ' + f + '.)';
      const stem = hard
        ? who + ' had ' + usd(H) + '. ' + who + ' bought some ' + f + ' at the wet market, where they are sold at ' + Gs + ' for ' + usd(P) +
          ', and had ' + usd(L) + ' left. How many ' + f + ' did ' + who + ' buy?'
        : 'At the wet market, ' + f + ' are sold at ' + Gs + ' for ' + usd(P) + '. ' + who + ' spent ' + usd(S) + ' on ' + f +
          '. How many ' + f + ' did ' + who + ' buy?';
      const ex = (hard ? 'First find the money spent: ' + usd(H) + ' - ' + usd(L) + ' = ' + usd(S) + '. ' : '') +
        'Every ' + usd(P) + ' buys one group of ' + Gs + '. ' + tail;
      return band(finishTyped(stem, N, ex, f), hard ? 3 : 2);
    }
  }

  const GOODS = ['bag', 'cap', 'T-shirt', 'water bottle', 'pair of shoes', 'jacket', 'umbrella', 'watch'];
  const MALLS = ['VivoCity', 'Northpoint City', 'Jurong Point', 'Tampines Mall', 'Causeway Point'];
  /* Mo2a. Reverse change: "paid with a $50 note, got 75¢ change, the bag cost
     $19.40; how much were the shoes?" Two known items is 3 subtractions (band 3);
     one known item is 2 (band 2). */
  function gReverseChange(){
    for (;;) {
      const who = pick(NAMES), three = Math.random() < 0.5;
      const items = shuffle(GOODS).slice(0, three ? 3 : 2);
      const note = pick([20, 50, 100]) * 100;
      const c = Math.random() < 0.55 ? cents(5, 95) : cents(105, 950);
      const spent = note - c;
      const known = items.slice(0, -1).map(() => cents(Math.max(300, note / 8), Math.min(4500, note / 2)));
      const u = spent - known.reduce((a, b) => a + b, 0);
      if (u < 300 || u > note * 0.7 || known.includes(c) || known.includes(u) || known[0] === known[1]) continue;
      const unk = items[items.length - 1];
      const ct = chgText(c);
      const list = three ? an(items[0]) + ', ' + an(items[1]) + ' and ' + an(items[2]) : an(items[0]) + ' and ' + an(items[1]);
      const knowns = three
        ? 'The ' + items[0] + ' cost ' + money(known[0]) + ' and the ' + items[1] + ' cost ' + money(known[1]) + '.'
        : 'The ' + items[0] + ' cost ' + money(known[0]) + '.';
      const stem = who + ' bought ' + list + ' at ' + pick(MALLS) + '. ' + who + ' paid with a ' + usd(note / 100) +
        ' note and received ' + ct + ' change. ' + knowns + ' How much did the ' + unk + ' cost? (in dollars, e.g. 4.75)';
      let ex = 'Change is money given back, so it was not spent. ' +
        (/¢/.test(ct) ? ct + ' is ' + money(c) + ' (not ' + money(c * 10) + '). ' : '') +
        'Money spent: ' + money(note) + ' - ' + money(c) + ' = ' + money(spent) + '. ';
      ex += three
        ? 'Take away the two known prices: ' + money(spent) + ' - ' + money(known[0]) + ' = ' + money(spent - known[0]) +
          ', then ' + money(spent - known[0]) + ' - ' + money(known[1]) + ' = ' + money(u) + '.'
        : 'Take away the known price: ' + money(spent) + ' - ' + money(known[0]) + ' = ' + money(u) + '.';
      ex += ' Check: the prices add up to ' + money(spent) + ', and ' + money(spent) + ' + ' + money(c) + ' change = ' + money(note) + '.';
      return band(asMoney(finishTyped(stem, dollars(u), ex, '$'), u), three ? 3 : 2);
    }
  }

  const STATIONERY = ['storybook', 'file', 'ruler', 'pencil case', 'calculator', 'water bottle'];
  /* Mo2b. Missing item from money left: "had $25; bought a book, a file and a pen;
     had $6.20 left; how much was the pen?" 3 subtractions. MCQ - the slips are money
     left ignored, money left added, and each known price forgotten. */
  function gMissingItem(){
    for (;;) {
      const who = pick(NAMES), [x, y, z] = shuffle(STATIONERY).slice(0, 3);
      const H = pick([2000, 2500, 3000, 4000, 5000, cents(1800, 4500)]);
      const a = cents(250, 1500), b = cents(120, 900), L = cents(120, 1200);
      const u = H - a - b - L;
      if (u < 80) continue;
      const slips = [H - a - b, H - a - b + L, H - a - L, H - b - L, a + b + L];
      const ex = 'Bar model: ' + money(H) + ' is split into the ' + x + ', the ' + y + ', the ' + z + ' and the money left. ' +
        'Money spent: ' + money(H) + ' - ' + money(L) + ' = ' + money(H - L) + '. ' +
        'Take away the prices you know: ' + money(H - L) + ' - ' + money(a) + ' - ' + money(b) + ' = ' + money(u) + '. ' +
        'The money left was not spent, so it must be taken away too.';
      return band(moneyMcq(who + ' had ' + money(H) + '. ' + who + ' bought ' + an(x) + ' for ' + money(a) + ', ' + an(y) + ' for ' +
        money(b) + ' and ' + an(z) + '. ' + who + ' had ' + money(L) + ' left. How much did the ' + z + ' cost?', u, slips, money, ex), 3);
    }
  }

  /* #13 multi-step money. "spent $a on X and $d more on Y than on X; how much
     left?" 3 operations: Y's price, the total spent, the money left. */
  function gMoreThanLeft(){
    for (;;) {
      const who = pick(NAMES), H = pick([5000, 10000, cents(4000, 9500)]);
      const [x, y] = shuffle(GOODS).slice(0, 2);
      const a = cents(450, 2600), d = cents(105, 1500), yb = a + d, L = H - a - yb;
      if (L < 100) continue;
      const ex = 'The ' + y + ' cost ' + money(d) + ' MORE than the ' + x + ', so it cost ' + money(a) + ' + ' + money(d) + ' = ' + money(yb) +
        ' (' + money(d) + ' is the difference, not the price). Spent: ' + money(a) + ' + ' + money(yb) + ' = ' + money(a + yb) +
        '. Left: ' + money(H) + ' - ' + money(a + yb) + ' = ' + money(L) + '.';
      return band(asMoney(finishTyped(who + ' had ' + money(H) + '. ' + who + ' spent ' + money(a) + ' on ' + an(x) + ' and ' + money(d) +
        ' more on ' + an(y) + ' than on the ' + x + '. How much money did ' + who + ' have left? (in dollars, e.g. 4.75)',
        dollars(L), ex, '$'), L), 3);
    }
  }

  /* #13 standard: "$100; spends $34.70 and $18.45; how much left?" 2 operations. */
  function gSpendTwoLeft(){
    for (;;) {
      const who = pick(NAMES), H = pick([5000, 10000, 10000, cents(3000, 9500)]);
      const [x, y] = shuffle(GOODS).slice(0, 2);
      const a = cents(450, 4500), b = cents(250, 3500), L = H - a - b;
      if (L < 50) continue;
      const ex = 'Add what was spent first: ' + money(a) + ' + ' + money(b) + ' = ' + money(a + b) + '. Then ' + money(H) + ' - ' +
        money(a + b) + ' = ' + money(L) + '. Change one dollar into 100 cents whenever the cents will not subtract.';
      return band(asMoney(finishTyped(who + ' had ' + money(H) + '. ' + who + ' spent ' + money(a) + ' on ' + an(x) + ' and ' + money(b) +
        ' on ' + an(y) + '. How much money did ' + who + ' have left? (in dollars, e.g. 4.75)', dollars(L), ex, '$'), L), 2);
    }
  }

  MQI.registerTopic({
    id:'p3money', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Money: adding and subtracting money in decimal notation",
    label:'Hawker Coins', short:'Money', e:'💵',
    skills:{
      add:   {label:'Adding money',   tip:'At the hawker centre, let your child add the two stall prices before you pay.'},
      sub:   {label:'Subtracting money', tip:'Cents will not subtract? Change one dollar into 100 cents, the same as borrowing a ten.'},
      change:{label:'Working out change', tip:'Two steps: total the items first, then take that away from the note handed over.'},
      bundle:{label:'Bundles and best buys', tip:'At the shop, ask: is "3 for $4" cheaper than buying one by one? How many bundles fit, and what is left over?'},
      reverse:{label:'Working backwards with money', tip:'Change and money left were NOT spent: take them away from what was paid first, then take away the prices you know.'}
    },
    pools:{
      1:[[gAddTwo,'add'],[gSubSmall,'sub']],
      2:[[gAddBig,'add'],[gSubBorrow,'sub'],[gSpendTwoLeft,'sub']],
      3:[[gChange,'change'],[gAddThree,'add'],[gBundleLeast,'bundle'],[gBundlePacks,'bundle'],[gBundleHowMany,'bundle'],
         [gReverseChange,'reverse'],[gMissingItem,'reverse'],[gMoreThanLeft,'sub']]
    }
  });
})();
