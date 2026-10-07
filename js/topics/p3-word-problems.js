"use strict";
/* Math Quest Island topic: p3word (P3). Self-contained. Typed answers.
 * Model Method Marina: the Booklet B 4-mark word problems of a Singapore P3
 * end-of-year paper, solved with the MODEL METHOD (bar models) and the P3
 * heuristics (guess and check, working backwards).
 * Authoring rules + registration shape: js/topics/README.md
 *
 * SCOPE (MOE 2021 syllabus, updated Oct 2025, P3 pp.35-36). Every item stays inside:
 *  - whole numbers to 10 000, the four operations, and division by a 1-digit
 *    number on a dividend of at most 3 digits (no 2-digit divisors: P5);
 *  - money in whole dollars only (no decimal working: multiplying $1.25 is P4);
 *  - measurement in compound units l/ml, kg/g, m/cm, every ANSWER in the smaller
 *    single unit (the grader cannot read "2 kg 350 g");
 *  - fractions of ONE WHOLE only: adding and subtracting like and related
 *    fractions within one whole, denominators up to 12. A fraction OF A SET
 *    ("1/4 of the 48 sweets") is MOE P4 (p4-fractions.js carries it) and is not
 *    asked here. Typed fraction keys carry q.fracAnswer, so an unreduced "2/8"
 *    is marked right; no stem says "simplest form".
 * Every stem is a plain word problem, as on the real paper. The bar model lives in
 * the explanation, because that is what teaches the method after a miss. It is
 * text (allowlisted <br>/<b> only - js/topics/README.md "No markup"): one bar per
 * line, the bar first and the name after, so the bars line up on their left edge.
 * Oracle: tools/gen-sanity.mjs p3wordOracle re-derives every key from the
 * rendered stem by brute force (a different path from the unit method used here).
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr,
        finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi',
                 'Farhan','Nurul','Mei Ling','Ahmad','Hui Min','Ravi','Zhi Hao','Aaliyah'];
  /* things P3 children collect and swap; every count in this file is 2 or more,
     so the plural is always right */
  const ITEMS = ['stickers','marbles','beads','stamps','cards','shells','erasers','pencils'];

  const names = n => shuffle(NAMES).slice(0, n);
  /* a fraction of a whole declares no unit, and the unit gate reads "Hui Min" as the
     token "min": the fraction stems draw from the names without one */
  const fnames = n => shuffle(NAMES.filter(x => !/\b(min|m|g|l|h|s)\b/i.test(x))).slice(0, n);
  const exam = q => (q.exam = 'problem', q);
  const asMoney = (q, c) => (q.answerText = '$' + c, q);
  /* one bar of a text bar model: cells left to right, then the name */
  const U = '[ u ]';
  const bar = (cells, label) => cells.join('') + ' &nbsp;' + label;
  const units = n => Array(n).fill(U);
  const model = (rows, plain) => '<b>Bar model</b>' + (plain ? '' : ' ([ u ] = 1 unit)') + '<br>' + rows.join('<br>') + '<br>';
  const times = m => (m === 2 ? 'twice' : m + ' times');

  /* ================= POOL 1: two-step standard ================= */

  /* part-whole: whole, two parts taken away, find what is left; or +, then - */
  const SHOPS = [['A bakery','buns'],['A bookshop','storybooks'],['A fruit stall','oranges'],
                 ['A cinema','tickets'],['A toy shop','yo-yos'],['A school canteen','curry puffs']];
  function gPartWhole(){
    if (Math.random() < 0.5){
      const s = pick(SHOPS), a = ri(210, 1450), b = ri(180, 1450), left = ri(120, 1800);
      const T = a + b + left;
      const it = s[1];
      return finishTyped(s[0] + ' had ' + T + ' ' + it + '. It sold ' + a + ' ' + it + ' on Saturday and ' + b +
        ' ' + it + ' on Sunday. How many ' + it + ' were left?', left,
        model(['[ ' + a + ' ][ ' + b + ' ][ ? ] &nbsp;' + T + ' ' + it + ' at first'], true) +
        'Sold altogether: ' + a + ' + ' + b + ' = ' + (a + b) + '.<br>Left: ' + T + ' − ' + (a + b) + ' = <b>' + left + '</b>.', it);
    }
    const [A, B] = names(2), it = pick(ITEMS);
    const a = ri(120, 900), b = ri(40, 400), c = ri(30, a + b - 20), now = a + b - c;
    return finishTyped(A + ' had ' + a + ' ' + it + '. ' + B + ' gave ' + A + ' ' + b + ' more ' + it + '. ' + A +
      ' then gave away ' + c + ' ' + it + '. How many ' + it + ' does ' + A + ' have now?', now,
      'After getting more: ' + a + ' + ' + b + ' = ' + (a + b) + '.<br>After giving away: ' + (a + b) + ' − ' + c +
      ' = <b>' + now + '</b>.', it);
  }

  /* comparison, more / fewer, find the total */
  function gMoreAltogether(){
    const [A, B] = names(2), it = pick(ITEMS);
    const a = ri(150, 2400), d = ri(25, 600), more = Math.random() < 0.5 || a - d < 100;
    const b = more ? a + d : a - d, tot = a + b;
    return finishTyped(A + ' has ' + a + ' ' + it + '. ' + B + ' has ' + d + (more ? ' more ' : ' fewer ') + it +
      ' than ' + A + '. How many ' + it + ' do they have altogether?', tot,
      model(more ? ['[ ' + a + ' ] &nbsp;' + A, '[ ' + a + ' ][ ' + d + ' ] &nbsp;' + B]
                 : ['[ ? ][ ' + d + ' ] &nbsp;' + A + ' = ' + a, '[ ? ] &nbsp;' + B], true) +
      B + ' has ' + a + (more ? ' + ' : ' − ') + d + ' = ' + b + '.<br>Altogether: ' + a + ' + ' + b + ' = <b>' + tot + '</b>.', it);
  }

  /* money: several of one item plus one other */
  const BUYS = [['pen','pens'],['file','files'],['notebook','notebooks'],['ruler','rulers'],
                ['bottle of water','bottles of water'],['pair of socks','pairs of socks'],['box of crayons','boxes of crayons']];
  const ONE = ['school bag','water bottle','storybook','lunch box','pencil case','T-shirt'];
  function gMoneyBuy(){
    const N = pick(NAMES), it = pick(BUYS), one = pick(ONE);
    const k = ri(2, 6), p = ri(2, 9), q = ri(6, 45), tot = k * p + q;
    return asMoney(finishTyped('A ' + it[0] + ' costs $' + p + ' and a ' + one + ' costs $' + q + '. ' + N + ' buys ' + k +
      ' ' + it[1] + ' and 1 ' + one + '. How much does ' + N + ' pay altogether?', tot,
      k + ' ' + it[1] + ': ' + k + ' × $' + p + ' = $' + (k * p) + '.<br>Altogether: $' + (k * p) + ' + $' + q +
      ' = <b>$' + tot + '</b>.', '$'), tot);
  }

  /* fractions of ONE whole: like and related denominators (P3) */
  const RELATED = [[2,4],[2,6],[2,8],[2,10],[2,12],[3,6],[3,9],[3,12],[4,8],[4,12],[5,10],[6,12],
                   [4,4],[5,5],[6,6],[8,8],[9,9],[10,10],[12,12]];
  const WHOLES = [['a pizza','the pizza'],['a cake','the cake'],['a bar of chocolate','the bar of chocolate'],
                  ['a watermelon','the watermelon'],['a pie','the pie']];
  const red = (n, d) => { const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const withFrac = (q, r) => (q.fracAnswer = [r[0], r[1]], q.answerText = r[0] + '/' + r[1], q);
  const FR_HINT = ' (Type a fraction such as 2/7.)';
  /* two fractions a/da and b/db over a related pair, written over the bigger bottom D */
  function fracPair(maxSum){
    for (let g = 0; g < 200; g++){
      const pr = pick(RELATED), D = pr[1], k = pr[1] / pr[0];
      const a = ri(1, pr[0] - 1 || 1), b = ri(1, D - 1);
      if (a >= pr[0]) continue;
      const A = a * k;                       /* a/pr[0] = A/D */
      if (A + b > maxSum(D)) continue;
      if (red(a, pr[0])[1] !== pr[0]) continue;   /* print every fraction in lowest terms */
      if (red(b, D)[1] !== D) continue;
      const first = Math.random() < 0.5;
      return first ? { n1: a, d1: pr[0], n2: b, d2: D, N1: A, N2: b, D }
                   : { n1: b, d1: D, n2: a, d2: pr[0], N1: b, N2: A, D };
    }
    return { n1: 1, d1: 4, n2: 3, d2: 8, N1: 2, N2: 3, D: 8 };
  }
  const overD = (n, d, N, D) => d === D ? fr(n, d) : fr(n, d) + ' = ' + fr(N, D);
  function gFracTogether(){
    const [A, B] = fnames(2), w = pick(WHOLES);
    const f = fracPair(D => D - 1), S = f.N1 + f.N2, r = red(S, f.D);
    return exam(withFrac(finishTyped(A + ' ate ' + fr(f.n1, f.d1) + ' of ' + w[0] + '. ' + B + ' ate ' + fr(f.n2, f.d2) +
      ' of ' + w[1] + '. What fraction of ' + w[1] + ' did they eat altogether?' + FR_HINT, r[0] / r[1],
      'Make the bottom numbers the same: ' + overD(f.n1, f.d1, f.N1, f.D) + ', ' + overD(f.n2, f.d2, f.N2, f.D) + '.<br>' +
      'Add the tops: ' + fr(f.N1, f.D) + ' + ' + fr(f.N2, f.D) + ' = ' + fr(S, f.D) +
      (r[1] !== f.D ? ' = <b>' + fr(r[0], r[1]) + '</b>.' : '. They ate <b>' + fr(r[0], r[1]) + '</b> of it.')), r));
  }

  /* ================= POOL 2: exam standard ================= */

  /* times as many, total given */
  function gTimesTotal(){
    const [A, B] = names(2), it = pick(ITEMS);
    const m = ri(2, 5), u = ri(Math.ceil(30 / m), Math.floor(999 / (m + 1))), T = (m + 1) * u;
    const ask = pick(['A','B','diff']);
    const want = ask === 'A' ? m * u : ask === 'B' ? u : (m - 1) * u;
    const qs = ask === 'A' ? 'How many ' + it + ' does ' + A + ' have?'
             : ask === 'B' ? 'How many ' + it + ' does ' + B + ' have?'
             : 'How many more ' + it + ' does ' + A + ' have than ' + B + '?';
    const last = ask === 'A' ? A + ' has ' + m + ' units: ' + m + ' × ' + u + ' = <b>' + want + '</b>.'
               : ask === 'B' ? B + ' has 1 unit = <b>' + want + '</b>.'
               : A + ' has ' + (m - 1) + ' more units: ' + (m - 1) + ' × ' + u + ' = <b>' + want + '</b>.';
    return finishTyped(A + ' has ' + times(m) + ' as many ' + it + ' as ' + B + '. They have ' + T + ' ' + it +
      ' altogether. ' + qs, want,
      model([bar(units(m), A), bar(units(1), B)]) +
      (m + 1) + ' units = ' + T + ', so 1 unit = ' + T + ' ÷ ' + (m + 1) + ' = ' + u + '<br>' + last, it);
  }

  /* more than, total given */
  function gMoreTotal(){
    const [A, B] = names(2), it = pick(ITEMS);
    const b = ri(60, 480), d = ri(15, 400), a = b + d, T = a + b;   /* T - d = 2b <= 960: 3 digits by 1 digit */
    const askA = Math.random() < 0.5, want = askA ? a : b;
    return finishTyped(A + ' and ' + B + ' have ' + T + ' ' + it + ' altogether. ' + A + ' has ' + d + ' more ' + it +
      ' than ' + B + '. How many ' + it + ' does ' + (askA ? A : B) + ' have?', want,
      model(['[ ? ][ ' + d + ' ] &nbsp;' + A, '[ ? ] &nbsp;' + B], true) +
      'Take away the extra ' + d + ': ' + T + ' − ' + d + ' = ' + (T - d) + '. That is 2 equal bars.<br>' +
      'One bar: ' + (T - d) + ' ÷ 2 = ' + b + ', so ' + (askA ? B + ' has ' + b + '.<br>' + A + ' has ' + b + ' + ' + d + ' = <b>' + a + '</b>.'
                                                         : B + ' has <b>' + b + '</b>.'), it);
  }

  /* before-after: giving to make equal; equal at first then one gives */
  function gGiveEqual(){
    const [A, B] = names(2), it = pick(ITEMS);
    if (Math.random() < 0.5){
      const g = ri(8, 240), b = ri(20, 800), a = b + 2 * g;
      return finishTyped(A + ' had ' + a + ' ' + it + ' and ' + B + ' had ' + b + ' ' + it + '. How many ' + it +
        ' must ' + A + ' give to ' + B + ' so that they both have the same number of ' + it + '?', g,
        model(['[ ' + b + ' ][ ' + (a - b) + ' ] &nbsp;' + A, '[ ' + b + ' ] &nbsp;' + B], true) +
        A + ' has ' + a + ' − ' + b + ' = ' + (a - b) + ' more.<br>Give half of the difference so the bars match: ' +
        (a - b) + ' ÷ 2 = <b>' + g + '</b>.', it);
    }
    const n = ri(40, 900), g = ri(6, Math.min(240, n - 5));
    return finishTyped(A + ' and ' + B + ' had the same number of ' + it + '. ' + A + ' gave ' + g + ' ' + it + ' to ' + B +
      '. How many more ' + it + ' does ' + B + ' have than ' + A + ' now?', 2 * g,
      'Before: the two bars are the same.<br>After: ' + A + ' has ' + g + ' fewer, and ' + B + ' has ' + g + ' more.<br>' +
      '[ ? ][ ' + g + ' ][ ' + g + ' ] &nbsp;' + B + '<br>[ ? ] &nbsp;' + A + '<br>' +
      'The gap is ' + g + ' + ' + g + ' = <b>' + (2 * g) + '</b>, not ' + g + '.', it);
  }

  /* equal grouping with a remainder: how many more to fill the last group */
  const PACK = [['beads','bags','bag'],['marbles','bags','bag'],['cookies','boxes','box'],['stickers','packets','packet'],['eggs','trays','tray'],['cupcakes','boxes','box']];
  function gNeedMore(){
    const N = pick(NAMES), F = pick(NAMES.filter(x => x !== N)), pk = pick(PACK);
    const g = ri(4, 9), q = ri(8, Math.floor(990 / g) - 1), r = ri(1, g - 2), rest = g * q + r;   /* g - r >= 2: never "1 cookies" */
    const k = ri(12, 300), n = rest + k;
    return finishTyped(N + ' had ' + n + ' ' + pk[0] + '. ' + N + ' gave ' + k + ' ' + pk[0] + ' to ' + F + ' and packed the rest into ' +
      pk[1] + ' of ' + g + '. The last ' + pk[2] + ' was not full. How many more ' + pk[0] + ' does ' + N + ' need to fill the last ' + pk[2] + '?', g - r,
      'Left to pack: ' + n + ' − ' + k + ' = ' + rest + '.<br>' + rest + ' ÷ ' + g + ' = ' + q + ' remainder ' + r +
      ': ' + q + ' full ' + pk[1] + ' and ' + r + ' in the last one.<br>To fill it: ' + g + ' − ' + r + ' = <b>' + (g - r) + '</b>.', pk[0]);
  }

  /* money: change, or how much more is needed */
  function gMoneyChange(){
    const N = pick(NAMES), it = pick(BUYS), one = pick(ONE);
    const k = ri(2, 6), p = ri(2, 9), q = ri(6, 45), cost = k * p + q;
    if (Math.random() < 0.5){
      const M2 = cost < 50 && Math.random() < 0.5 ? 50 : (cost < 100 ? 100 : 200);
      const left = M2 - cost;
      return asMoney(finishTyped(N + ' had $' + M2 + '. ' + N + ' bought ' + k + ' ' + it[1] + ' at $' + p + ' each and a ' + one +
        ' for $' + q + '. How much money did ' + N + ' have left?', left,
        k + ' ' + it[1] + ': ' + k + ' × $' + p + ' = $' + (k * p) + '.<br>Spent: $' + (k * p) + ' + $' + q + ' = $' + cost +
        '.<br>Left: $' + M2 + ' − $' + cost + ' = <b>$' + left + '</b>.', '$'), left);
    }
    const short = ri(3, Math.min(40, cost - 5)), has = cost - short;
    return asMoney(finishTyped(N + ' wants to buy ' + k + ' ' + it[1] + ' at $' + p + ' each and a ' + one + ' for $' + q + '. ' + N +
      ' has $' + has + '. How much more money does ' + N + ' need?', short,
      k + ' ' + it[1] + ': ' + k + ' × $' + p + ' = $' + (k * p) + '.<br>Needed: $' + (k * p) + ' + $' + q + ' = $' + cost +
      '.<br>Still short: $' + cost + ' − $' + has + ' = <b>$' + short + '</b>.', '$'), short);
  }

  /* fractions of one whole: what is left, or how much more */
  function gFracLeft(){
    const [A, B] = fnames(2), w = pick(WHOLES);
    if (Math.random() < 0.55){
      const f = fracPair(D => D - 1), S = f.N1 + f.N2, L = f.D - S, r = red(L, f.D);
      return exam(withFrac(finishTyped(A + ' ate ' + fr(f.n1, f.d1) + ' of ' + w[0] + '. ' + B + ' ate ' + fr(f.n2, f.d2) +
        ' of ' + w[1] + '. What fraction of ' + w[1] + ' was left?' + FR_HINT, r[0] / r[1],
        'Same bottom numbers: ' + overD(f.n1, f.d1, f.N1, f.D) + ', ' + overD(f.n2, f.d2, f.N2, f.D) + '.<br>' +
        'Eaten: ' + fr(f.N1, f.D) + ' + ' + fr(f.N2, f.D) + ' = ' + fr(S, f.D) + '.<br>' +
        'The whole is ' + fr(f.D, f.D) + '. Left: ' + fr(f.D, f.D) + ' − ' + fr(S, f.D) + ' = ' + fr(L, f.D) +
        (r[1] !== f.D ? ' = <b>' + fr(r[0], r[1]) + '</b>.' : '. <b>' + fr(r[0], r[1]) + '</b> was left.')), r));
    }
    let f;
    for (let g = 0; g < 50; g++){ f = fracPair(D => 2 * D); if (f.N1 !== f.N2) break; }
    if (f.N1 === f.N2) f = { n1: 1, d1: 2, n2: 1, d2: 4, N1: 2, N2: 1, D: 4 };
    if (f.N1 < f.N2) f = { n1: f.n2, d1: f.d2, n2: f.n1, d2: f.d1, N1: f.N2, N2: f.N1, D: f.D };
    const Dd = f.N1 - f.N2, r = red(Dd, f.D);
    return exam(withFrac(finishTyped(A + ' painted ' + fr(f.n1, f.d1) + ' of a wall. ' + B + ' painted ' + fr(f.n2, f.d2) +
      ' of the same wall. How much more of the wall did ' + A + ' paint than ' + B + '? Give your answer as a fraction of the wall.' + FR_HINT,
      r[0] / r[1],
      'Same bottom numbers: ' + overD(f.n1, f.d1, f.N1, f.D) + ', ' + overD(f.n2, f.d2, f.N2, f.D) + '.<br>' +
      'Take away: ' + fr(f.N1, f.D) + ' − ' + fr(f.N2, f.D) + ' = ' + fr(Dd, f.D) +
      (r[1] !== f.D ? ' = <b>' + fr(r[0], r[1]) + '</b>.' : '. ' + A + ' painted <b>' + fr(r[0], r[1]) + '</b> more.')), r));
  }

  /* multi-step measurement: take away equal amounts, answer in the smaller unit */
  const MEAS = [
    { big:'ℓ', small:'ml', f:1000, whole:'A jug had', what:'of water', verb:'poured out', piece:'cups of', each:[150,350], left:'How much water was left in the jug?' },
    { big:'kg', small:'g', f:1000, whole:'A bag had', what:'of flour', verb:'used', piece:'scoops of', each:[120,400], left:'How much flour was left in the bag?' },
    { big:'m', small:'cm', f:100, whole:'A roll had', what:'of ribbon', verb:'cut off', piece:'pieces of', each:[15,60], left:'How much ribbon was left on the roll?' }
  ];
  function gMeasureLeft(){
    const N = pick(NAMES), M = pick(MEAS);
    const k = ri(2, 6), e = ri(M.each[0], M.each[1]);
    const used = k * e, x = ri(Math.ceil((used + M.f / 5) / M.f), M.f === 100 ? 6 : 4);
    let y = ri(1, M.f - 1); if (M.f === 1000) y = ri(1, 19) * 50 - (Math.random() < 0.5 ? 0 : ri(1, 4) * 5);
    if (y <= 0) y = 50;
    const tot = x * M.f + y, left = tot - used;
    return finishTyped(M.whole + ' ' + x + ' ' + M.big + ' ' + y + ' ' + M.small + ' ' + M.what + '. ' + N + ' ' + M.verb + ' ' + k + ' ' +
      M.piece + ' ' + e + ' ' + M.small + ' each. ' + M.left + ' Give your answer in ' + M.small + '.', left,
      x + ' ' + M.big + ' ' + y + ' ' + M.small + ' = ' + (x * M.f) + ' ' + M.small + ' + ' + y + ' ' + M.small + ' = ' + tot + ' ' + M.small + '.<br>' +
      'Taken: ' + k + ' × ' + e + ' ' + M.small + ' = ' + used + ' ' + M.small + '.<br>Left: ' + tot + ' − ' + used + ' = <b>' + left + ' ' + M.small + '</b>.',
      M.small);
  }

  /* ================= POOL 3: the hardest 4-mark shapes ================= */

  /* three people: one is m times, one is d more (or fewer) than the base; total */
  function gThreeUnits(){
    const [A, B, C] = names(3), it = pick(ITEMS);
    const m = ri(2, 3), more = Math.random() < 0.6;
    let u, d, T;
    for (let g = 0; g < 100; g++){
      u = ri(25, Math.floor(980 / (m + 2))); d = ri(10, more ? 300 : u - 8);
      T = (m + 2) * u + (more ? d : -d);
      if ((m + 2) * u <= 999 && d < 400) break;
    }
    const ask = pick(['A','B','C']);
    const vA = m * u, vB = u, vC = more ? u + d : u - d;
    const want = ask === 'A' ? vA : ask === 'B' ? vB : vC, who = ask === 'A' ? A : ask === 'B' ? B : C;
    const rows = [bar(units(m), A), bar(units(1), B), more ? U + '[ ' + d + ' ] &nbsp;' + C : '[ u, take away ' + d + ' ] &nbsp;' + C];
    return finishTyped(A + ' has ' + times(m) + ' as many ' + it + ' as ' + B + '. ' + C + ' has ' + d + (more ? ' more ' : ' fewer ') + it +
      ' than ' + B + '. The three children have ' + T + ' ' + it + ' altogether. How many ' + it + ' does ' + who + ' have?', want,
      model(rows) +
      (more ? 'Take away the extra ' + d + ': ' + T + ' − ' + d : 'Put back the missing ' + d + ': ' + T + ' + ' + d) + ' = ' + ((m + 2) * u) + '.<br>' +
      (m + 2) + ' units = ' + ((m + 2) * u) + ', so 1 unit = ' + ((m + 2) * u) + ' ÷ ' + (m + 2) + ' = ' + u + '<br>' +
      (ask === 'A' ? A + ': ' + m + ' × ' + u + ' = <b>' + vA + '</b>.'
       : ask === 'B' ? B + ': 1 unit = <b>' + vB + '</b>.'
       : C + ': ' + u + (more ? ' + ' : ' − ') + d + ' = <b>' + vC + '</b>.'), it);
  }

  /* before-after: m times as many, gives some away, then the same */
  function gGiveToEqual3(){
    const [A, B] = names(2), it = pick(ITEMS);
    const m = ri(2, 5);
    let u; do { u = ri(12, Math.min(Math.floor(2000 / m), Math.floor(999 / (m - 1)))); } while (((m - 1) * u) % 2);
    const g = (m - 1) * u / 2, a = m * u, end = u + g;
    const ask = pick(['A','B','end']);
    const want = ask === 'A' ? a : ask === 'B' ? u : end;
    const qs = ask === 'A' ? 'How many ' + it + ' did ' + A + ' have at first?'
             : ask === 'B' ? 'How many ' + it + ' did ' + B + ' have at first?'
             : 'How many ' + it + ' did each of them have in the end?';
    return finishTyped(A + ' had ' + times(m) + ' as many ' + it + ' as ' + B + '. After ' + A + ' gave ' + g + ' ' + it + ' to ' + B +
      ', they had the same number of ' + it + '. ' + qs, want,
      model(['<b>Before</b>', bar(units(m), A), bar(units(1), B)]) +
      A + ' has ' + (m - 1) + (m === 2 ? ' unit' : ' units') + ' more than ' + B + '.<br>' +
      'After the gift they are the same. ' + A + ' lost ' + g + ' and ' + B + ' got ' + g + ', so the gap was ' + g + ' + ' + g + ' = ' + (2 * g) + '.<br>' +
      (m === 2 ? '1 unit = ' + (2 * g) + '<br>'
               : (m - 1) + ' units = ' + (2 * g) + ', so 1 unit = ' + (2 * g) + ' ÷ ' + (m - 1) + ' = ' + u + '<br>') +
      (ask === 'A' ? A + ' at first: ' + m + ' × ' + u + ' = <b>' + a + '</b>.'
       : ask === 'B' ? B + ' at first: 1 unit = <b>' + u + '</b>.'
       : 'In the end each has ' + u + ' + ' + g + ' = <b>' + end + '</b>.'), it);
  }

  /* before-after, same total: after the gift, one has m times as many */
  function gTotalAfter(){
    const [A, B] = names(2), it = pick(ITEMS);
    const m = ri(2, 4);
    let u, g;
    for (let t = 0; t < 100; t++){
      u = ri(20, Math.floor(999 / (m + 1))); g = ri(5, 200);
      if (m * u - g >= 15) break;
    }
    const T = (m + 1) * u, a0 = u + g, b0 = m * u - g;
    const askA = Math.random() < 0.6, want = askA ? a0 : b0;
    return finishTyped(A + ' and ' + B + ' had ' + T + ' ' + it + ' altogether. After ' + A + ' gave ' + g + ' ' + it + ' to ' + B + ', ' +
      B + ' had ' + times(m) + ' as many ' + it + ' as ' + A + '. How many ' + it + ' did ' + (askA ? A : B) + ' have at first?', want,
      'Giving does not change the total: it is still ' + T + ' after.<br>' +
      model(['<b>After</b>', bar(units(1), A), bar(units(m), B)]) +
      (m + 1) + ' units = ' + T + ', so 1 unit = ' + T + ' ÷ ' + (m + 1) + ' = ' + u + '<br>' +
      (askA ? A + ' had 1 unit after giving ' + g + ', so at first: ' + u + ' + ' + g + ' = <b>' + a0 + '</b>.'
            : B + ' had ' + m + ' units = ' + (m * u) + ' after getting ' + g + ', so at first: ' + (m * u) + ' − ' + g + ' = <b>' + b0 + '</b>.'), it);
  }

  /* working backwards */
  const BAKES = ['cookies','muffins','tarts','buns'];
  function gBackwards(){
    if (Math.random() < 0.5){
      const it = pick(BAKES), k = ri(4, 9), s = ri(2, k - 2), per = ri(6, 40);
      const left = (k - s) * per, e = ri(3, Math.min(left - 5, 60)), r = left - e;
      return finishTyped('A baker packed some ' + it + ' equally into ' + k + ' boxes. The baker sold ' + s + ' of the boxes. Then ' + e + ' ' + it +
        ' from the boxes that were left were eaten. ' + r + ' ' + it + ' remained. How many ' + it + ' did the baker pack at first?', k * per,
        '<b>Work backwards</b> from the end.<br>Before ' + e + ' were eaten: ' + r + ' + ' + e + ' = ' + left + ' ' + it + '.<br>' +
        'Those were in ' + k + ' − ' + s + ' = ' + (k - s) + ' boxes, so 1 box: ' + left + ' ÷ ' + (k - s) + ' = ' + per + '.<br>' +
        'At first: ' + k + ' × ' + per + ' = <b>' + (k * per) + '</b>.', it);
    }
    const [A, B] = names(2), it = pick(ITEMS), a = ri(15, 300), k = ri(2, 6), p = ri(5, 30), start = ri(a + 20, 900);
    const now = start - a + k * p;
    return finishTyped(A + ' had some ' + it + '. ' + A + ' gave ' + a + ' ' + it + ' to ' + B + '. Then ' + A + ' bought ' + k +
      ' packets of ' + it + ' with ' + p + ' ' + it + ' in each packet. Now ' + A + ' has ' + now + ' ' + it + '. How many ' + it +
      ' did ' + A + ' have at first?', start,
      '<b>Work backwards</b> from the end, undoing each step.<br>Bought: ' + k + ' × ' + p + ' = ' + (k * p) + '. Undo it: ' +
      now + ' − ' + (k * p) + ' = ' + (now - k * p) + '.<br>Gave ' + a + '. Undo it: ' + (now - k * p) + ' + ' + a +
      ' = <b>' + start + '</b>.', it);
  }

  /* guess and check: notes of two values */
  const NOTES = [[2,5],[2,10],[5,10]];   /* the value gap stays 1-digit: the swap step is a P3 division */
  function gNotes(){
    const N = pick(NAMES), dn = pick(NOTES), lo = dn[0], hi = dn[1];
    const n = ri(8, 24), h = ri(2, n - 2), l = n - h, V = h * hi + l * lo;
    const askHi = Math.random() < 0.5, want = askHi ? h : l;
    const g0 = Math.floor(n / 2), v0 = g0 * hi + (n - g0) * lo;
    return finishTyped(N + ' has ' + n + ' notes. Some are $' + lo + ' notes and the rest are $' + hi + ' notes. They are worth $' + V +
      ' altogether. How many $' + (askHi ? hi : lo) + ' notes does ' + N + ' have?', want,
      '<b>Guess and check.</b> Try ' + g0 + ' $' + hi + ' notes and ' + (n - g0) + ' $' + lo + ' notes: ' + g0 + ' × $' + hi + ' + ' +
      (n - g0) + ' × $' + lo + ' = $' + v0 + (v0 === V ? ', just right.' : v0 > V ? ', too much, so use fewer $' + hi + ' notes.' : ', too little, so use more $' + hi + ' notes.') + '<br>' +
      'Each $' + lo + ' note changed into a $' + hi + ' note adds $' + (hi - lo) + '.<br>' +
      (v0 === V ? '' : (v0 > V ? '$' + v0 + ' − $' + V + ' = $' + (v0 - V) + ' too much, so change ' + (v0 - V) + ' ÷ ' + (hi - lo) + ' = ' + Math.abs(h - g0) +
                                 ' of the $' + hi + ' notes back into $' + lo + ' notes: ' + g0 + ' − ' + Math.abs(h - g0) + ' = ' + h + ' $' + hi + ' notes.<br>'
                               : '$' + V + ' − $' + v0 + ' = $' + (V - v0) + ' too little, so change ' + (V - v0) + ' ÷ ' + (hi - lo) + ' = ' + Math.abs(h - g0) +
                                 ' more $' + lo + ' notes into $' + hi + ' notes: ' + g0 + ' + ' + Math.abs(h - g0) + ' = ' + h + ' $' + hi + ' notes.<br>')) +
      'Check: ' + h + ' × $' + hi + ' + ' + l + ' × $' + lo + ' = $' + (h * hi) + ' + $' + (l * lo) + ' = $' + V + '. ✓<br>' +
      'So there are <b>' + want + '</b> $' + (askHi ? hi : lo) + ' notes.', 'notes');
  }

  /* guess and check: wheels / legs */
  const WHEELS = [['bicycles','tricycles',2,3,'wheels','in a shop'],['motorcycles','cars',2,4,'wheels','in a car park'],
                  ['stools','chairs',3,4,'legs','in a hall'],['chickens','goats',2,4,'legs','on a farm']];
  function gWheels(){
    const W = pick(WHEELS), n = ri(10, 40), b = ri(2, n - 2), a = n - b, w = a * W[2] + b * W[3];
    const askB = Math.random() < 0.5, want = askB ? b : a, noun = askB ? W[1] : W[0];
    const allA = n * W[2];
    return finishTyped('There are ' + n + ' ' + W[0] + ' and ' + W[1] + ' ' + W[5] + '. They have ' + w + ' ' + W[4] +
      ' altogether. How many ' + noun + ' are there?', want,
      '<b>Guess and check</b> (start from all ' + W[0] + '): ' + n + ' ' + W[0] + ' have ' + n + ' × ' + W[2] + ' = ' + allA + ' ' + W[4] + '.<br>' +
      'That is ' + w + ' − ' + allA + ' = ' + (w - allA) + ' ' + W[4] + ' too few. Each ' + W[1].replace(/s$/, '') + ' has ' + (W[3] - W[2]) +
      ' more, so there are ' + (w - allA) + ' ÷ ' + (W[3] - W[2]) + ' = ' + b + ' ' + W[1] + ' and ' + n + ' − ' + b + ' = ' + a + ' ' + W[0] + '.<br>' +
      'Check: ' + a + ' × ' + W[2] + ' + ' + b + ' × ' + W[3] + ' = ' + w + '. ✓ So the answer is <b>' + want + '</b>.', noun);
  }

  /* money: spend, then as many as possible with the rest */
  const MANY = [['packet of stickers','packets of stickers'],['bag of sweets','bags of sweets'],['comic','comics'],
                ['pencil','pencils'],['keychain','keychains'],['bottle of juice','bottles of juice']];
  function gMoneyRest(){
    const N = pick(NAMES), it = pick(BUYS), m2 = pick(MANY);
    const k = ri(2, 5), p = ri(2, 12), q = ri(3, 9);
    let M = 0, rest = 0;
    for (let t = 0; t < 100; t++){
      M = pick([50, 100, 100, 200]); rest = M - k * p;
      if (rest >= 4 * q && rest <= 999) break;
    }
    if (rest < 4 * q){ M = 200; rest = M - k * p; }
    const cnt = Math.floor(rest / q), r = rest - cnt * q;
    const askLeft = r > 0 && Math.random() < 0.3;
    const unit = askLeft ? '$' : m2[1].split(' ')[0];
    const tail = askLeft ? 'How much money did ' + N + ' have left after that?' : 'How many ' + m2[1] + ' did ' + N + ' buy?';
    const q1 = finishTyped(N + ' had $' + M + '. ' + N + ' bought ' + k + ' ' + it[1] + ' at $' + p + ' each. With the rest of the money, ' + N +
      ' bought as many ' + m2[1] + ' as possible at $' + q + ' each. ' + tail, askLeft ? r : cnt,
      'Spent first: ' + k + ' × $' + p + ' = $' + (k * p) + '. Rest: $' + M + ' − $' + (k * p) + ' = $' + rest + '.<br>' +
      '$' + rest + ' ÷ $' + q + ' = ' + cnt + (r ? ' remainder $' + r : '') + '.<br>' +
      (askLeft ? N + ' buys ' + cnt + ' and has <b>$' + r + '</b> left.'
               : N + ' buys <b>' + cnt + '</b>' + (r ? ': the $' + r + ' left is not enough for one more.' : '.')), unit);
    return askLeft ? asMoney(q1, r) : q1;
  }

  /* ===== W1 (calibration L0): the real-paper catalogue's remaining long-problem shapes ===== */

  /* units model, three-party chain: Q = 1 unit, P = m units, R = k x P (1 + m + mk <= 9) */
  function gThreeParty(){
    const [P, Q, R] = names(3), it = pick(ITEMS);
    const m = 2, k = ri(2, 3), n = 1 + m + m * k;   /* 7 or 9 units: the share stays a 1-digit division */
    const u = ri(Math.ceil(40 / m), Math.floor(999 / n)), T = n * u;
    const ask = pick(['P','Q','R','R']);
    const vals = { P: m * u, Q: u, R: m * k * u }, who = { P, Q, R };
    return finishTyped(P + ' has ' + times(m) + ' as many ' + it + ' as ' + Q + '. ' + R + ' has ' + times(k) + ' as many ' + it + ' as ' + P +
      '. The three children have ' + T + ' ' + it + ' altogether. How many ' + it + ' does ' + who[ask] + ' have?', vals[ask],
      model([bar(units(1), Q), bar(units(m), P), bar(units(m * k), R + ' (' + k + ' × ' + m + ' units)')]) +
      '1 + ' + m + ' + ' + (m * k) + ' = ' + n + ' units = ' + T + ', so 1 unit = ' + T + ' ÷ ' + n + ' = ' + u + '<br>' +
      who[ask] + ': ' + (ask === 'Q' ? '1 unit = ' : (ask === 'P' ? m : m * k) + ' × ' + u + ' = ') + '<b>' + vals[ask] + '</b>.', it);
  }

  /* units model with an extra fixed part */
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
  const COLOURS = [['blue','green','yellow'],['red','white','black'],['pink','purple','orange']];
  function gExtraFixed(){
    const c = shuffle(pick(COLOURS)), it = pick(['beads','marbles','buttons','balloons']);
    const m = ri(2, 5), u = ri(Math.ceil(30 / m), Math.floor(990 / (m + 1))), y = ri(12, 300), T = (m + 1) * u + y;
    const askA = Math.random() < 0.6, want = askA ? m * u : u;
    return finishTyped('There are ' + T + ' ' + it + ' in a box. They are ' + c[0] + ', ' + c[1] + ' or ' + c[2] + '. There are ' + times(m) +
      ' as many ' + c[0] + ' ' + it + ' as ' + c[1] + ' ' + it + '. ' + y + ' of the ' + it + ' are ' + c[2] + '. How many ' + (askA ? c[0] : c[1]) +
      ' ' + it + ' are there?', want,
      model([bar(units(m), c[0]), bar(units(1), c[1]), '[ ' + y + ' ] &nbsp;' + c[2]]) +
      'Take away the ' + c[2] + ' ' + it + ' first: ' + T + ' − ' + y + ' = ' + (T - y) + '.<br>' + (m + 1) + ' units = ' + (T - y) +
      ', so 1 unit = ' + (T - y) + ' ÷ ' + (m + 1) + ' = ' + u + '<br>' +
      (askA ? cap(c[0]) + ' ' + it + ': ' + m + ' × ' + u + ' = <b>' + want + '</b>.' : cap(c[1]) + ' ' + it + ': 1 unit = <b>' + want + '</b>.'), it);
  }

  /* units model given the DIFFERENCE */
  function gTimesDiff(){
    const [A, B] = names(2), it = pick(ITEMS);
    const m = ri(3, 9), u = ri(Math.ceil(20 / (m - 1)) + 2, Math.floor(999 / (m - 1))), D = (m - 1) * u;
    const ask = pick(['T','T','A','B']);
    const want = ask === 'T' ? (m + 1) * u : ask === 'A' ? m * u : u;
    const qs = ask === 'T' ? 'How many ' + it + ' do they have altogether?' : 'How many ' + it + ' does ' + (ask === 'A' ? A : B) + ' have?';
    return finishTyped(A + ' has ' + m + ' times as many ' + it + ' as ' + B + '. ' + A + ' has ' + D + ' more ' + it + ' than ' + B + '. ' + qs, want,
      model([bar(units(m), A), bar(units(1), B)]) +
      'The difference is ' + m + ' − 1 = ' + (m - 1) + ' units = ' + D + ', so 1 unit = ' + D + ' ÷ ' + (m - 1) + ' = ' + u + '<br>' +
      (ask === 'T' ? 'Altogether: ' + m + ' + 1 = ' + (m + 1) + ' units = ' + (m + 1) + ' × ' + u + ' = <b>' + want + '</b>.'
       : ask === 'A' ? A + ': ' + m + ' × ' + u + ' = <b>' + want + '</b>.' : B + ': 1 unit = <b>' + want + '</b>.'), it);
  }

  /* sum and difference: money pair, or two lengths in m and cm (answer in cm) */
  const PAIRS2 = [['racket','cap'],['bicycle','helmet'],['school bag','pencil case'],['pair of shoes','pair of socks'],['watch','wallet']];
  function gSumDiff(){
    if (Math.random() < 0.5){
      const pr = pick(PAIRS2), s = ri(8, 300), d = ri(5, 300), b = s + d, S = s + b;
      const askSmall = Math.random() < 0.6, want = askSmall ? s : b;
      return asMoney(finishTyped('A ' + pr[0] + ' and a ' + pr[1] + ' cost $' + S + ' altogether. The ' + pr[0] + ' costs $' + d + ' more than the ' + pr[1] +
        '. How much does the ' + (askSmall ? pr[1] : pr[0]) + ' cost?', want,
        model(['[ ? ][ $' + d + ' ] &nbsp;' + pr[0], '[ ? ] &nbsp;' + pr[1]], true) +
        'Take away the extra $' + d + ': $' + S + ' − $' + d + ' = $' + (S - d) + '. That is 2 equal bars.<br>' +
        'One bar: $' + (S - d) + ' ÷ 2 = $' + s + '.<br>' +
        (askSmall ? 'The ' + pr[1] + ' costs <b>$' + s + '</b>.' : 'The ' + pr[0] + ' costs $' + s + ' + $' + d + ' = <b>$' + b + '</b>.'), '$'), want);
    }
    const what = pick([['ribbons','ribbon'],['ropes','rope'],['pieces of wire','piece of wire']]);
    let s, d, S; do { s = ri(60, 380); d = ri(20, 300); S = 2 * s + d; } while (S % 100 === 0 || S > 990);
    const Sm = Math.floor(S / 100), Sc = S % 100, dm = Math.floor(d / 100), dc = d % 100;
    const len = (mm, cc) => (mm ? mm + ' m' : '') + (mm && cc ? ' ' : '') + (cc ? cc + ' cm' : '');
    const askShort = Math.random() < 0.6, want = askShort ? s : s + d;
    return finishTyped('Two ' + what[0] + ' are ' + len(Sm, Sc) + ' long altogether. One ' + what[1] + ' is ' + len(dm, dc) + ' longer than the other. How long is the ' +
      (askShort ? 'shorter' : 'longer') + ' ' + what[1] + '? Give your answer in cm.', want,
      'Change to cm: ' + len(Sm, Sc) + ' = ' + S + ' cm' + (dm ? ', ' + len(dm, dc) + ' = ' + d + ' cm' : '') + '.<br>' +
      model(['[ ? ][ ' + d + ' cm ] &nbsp;longer', '[ ? ] &nbsp;shorter'], true) +
      'Take away the extra: ' + S + ' − ' + d + ' = ' + (S - d) + ' cm. That is 2 equal bars.<br>One bar: ' + (S - d) + ' ÷ 2 = ' + s + ' cm.<br>' +
      (askShort ? 'The shorter one is <b>' + s + ' cm</b>.' : 'The longer one is ' + s + ' + ' + d + ' = <b>' + (s + d) + ' cm</b>.'), 'cm');
  }

  /* guess and check with two prices */
  const TWO = [['pens','files'],['pencils','erasers'],['comics','storybooks'],['stickers','bookmarks']];
  function gTwoPrices(){
    const N = pick(NAMES), t = pick(TWO), lo = ri(2, 6), hi = lo + ri(1, 3);
    const n = ri(8, 24), h = ri(2, n - 2), l = n - h, V = h * hi + l * lo;
    const askHi = Math.random() < 0.5, want = askHi ? h : l;
    const all = n * lo, extra = V - all;
    return finishTyped(N + ' bought ' + n + ' things. Some were ' + t[0] + ' at $' + lo + ' each and the rest were ' + t[1] + ' at $' + hi +
      ' each. ' + N + ' paid $' + V + ' altogether. How many ' + (askHi ? t[1] : t[0]) + ' did ' + N + ' buy?', want,
      '<b>Guess and check</b> (start from all ' + t[0] + '): ' + n + ' × $' + lo + ' = $' + all + '. That is $' + V + ' − $' + all + ' = $' + extra + ' too little.<br>' +
      'Each ' + t[0].replace(/s$/, '') + ' changed into ' + (/^[aeiou]/.test(t[1]) ? 'an ' : 'a ') + t[1].replace(/s$/, '') + ' adds $' + (hi - lo) + ', so there are ' + extra + ' ÷ ' + (hi - lo) + ' = ' + h + ' ' + t[1] +
      ' and ' + n + ' − ' + h + ' = ' + l + ' ' + t[0] + '.<br>Check: ' + l + ' × $' + lo + ' + ' + h + ' × $' + hi + ' = $' + V + '. ✓ So the answer is <b>' + want + '</b>.',
      askHi ? t[1] : t[0]);
  }

  /* STRETCH: before-after ending in a ratio */
  function gRatioAfter(){
    const [A, B] = names(2), it = pick(['stickers','marbles','cards','beads']);
    const m = ri(2, 3);
    if (Math.random() < 0.5){
      /* equal at first; A uses a, B uses b (b < a); now B has m times as many as A */
      let u, a, b;
      do { u = ri(15, 300); b = ri(10, 200); a = b + (m - 1) * u; } while (a > 900 || (m - 1) * u > 999);
      const s = a + u;
      const askStart = Math.random() < 0.6, want = askStart ? s : u;
      return finishTyped(A + ' and ' + B + ' had the same number of ' + it + ' at first. ' + A + ' gave away ' + a + ' ' + it + ' and ' + B + ' gave away ' + b + ' ' + it +
        '. Now ' + B + ' has ' + times(m) + ' as many ' + it + ' as ' + A + '. ' +
        (askStart ? 'How many ' + it + ' did each of them have at first?' : 'How many ' + it + ' does ' + A + ' have now?'), want,
        model(['<b>After</b>', bar(units(1), A), bar(units(m), B)]) +
        'They had the same at first, and ' + A + ' gave away ' + a + ' − ' + b + ' = ' + (a - b) + ' more than ' + B + '.<br>So now ' + B + ' has ' + (a - b) + ' more: ' +
        (m - 1) + (m === 2 ? ' unit = ' : ' units = ') + (a - b) + (m === 2 ? '' : ', so 1 unit = ' + (a - b) + ' ÷ ' + (m - 1) + ' = ' + u) + '<br>' +
        (askStart ? 'At first each had ' + u + ' + ' + a + ' = <b>' + s + '</b>.' : A + ' has 1 unit = <b>' + u + '</b>.'), it);
    }
    /* A had D more than B; A gave away g (B unchanged); now A has m times as many as B */
    let u, g, D;
    do { u = ri(15, 300); g = ri(10, 200); D = (m - 1) * u + g; } while (D > 990);
    const askB = Math.random() < 0.5, want = askB ? u : u + D;
    return finishTyped(A + ' had ' + D + ' more ' + it + ' than ' + B + '. Then ' + A + ' gave away ' + g + ' ' + it + '. Now ' + A + ' has ' + times(m) + ' as many ' + it +
      ' as ' + B + '. How many ' + it + ' did ' + (askB ? B : A) + ' have at first?', want,
      model(['<b>After</b>', bar(units(m), A), bar(units(1), B)]) +
      'After giving away ' + g + ', ' + A + ' has ' + D + ' − ' + g + ' = ' + (D - g) + ' more than ' + B + '.<br>' +
      (m - 1) + (m === 2 ? ' unit = ' : ' units = ') + (D - g) + (m === 2 ? '' : ', so 1 unit = ' + (D - g) + ' ÷ ' + (m - 1) + ' = ' + u) + '<br>' +
      (askB ? B + ' did not change: <b>' + u + '</b>.' : A + ' at first: ' + u + ' + ' + D + ' = <b>' + (u + D) + '</b>.'), it);
  }

  /* STRETCH: elimination */
  const SETS = [['cups','plates','cup','plate'],['pens','notebooks','pen','notebook'],['buns','drinks','bun','drink'],['balls','bats','ball','bat']];
  function gElimination(){
    const st = pick(SETS), c = ri(2, 9), p = ri(2, 9), n = ri(2, 4);
    let p1 = ri(3, 6), p2 = ri(1, p1 - 1);
    const V1 = n * c + p1 * p, V2 = n * c + p2 * p;
    const k = ri(2, 5), askP = Math.random() < 0.6, want = askP ? k * p : c;
    const pl = (x, i) => x === 1 ? st[i + 2] : st[i];
    return asMoney(finishTyped(n + ' ' + st[0] + ' and ' + p1 + ' ' + pl(p1, 1) + ' cost $' + V1 + '. ' + n + ' ' + st[0] + ' and ' + p2 + ' ' + pl(p2, 1) + ' cost $' + V2 +
      '. Each ' + st[2] + ' costs the same and each ' + st[3] + ' costs the same. ' +
      (askP ? 'How much do ' + k + ' ' + st[1] + ' cost?' : 'How much does 1 ' + st[2] + ' cost?'), want,
      'Both lists have ' + n + ' ' + st[0] + '. The only difference is ' + p1 + ' − ' + p2 + ' = ' + (p1 - p2) + ' ' + pl(p1 - p2, 1) + '.<br>' +
      (p1 - p2) + ' ' + pl(p1 - p2, 1) + (p1 - p2 === 1 ? ' costs $' : ' cost $') + V1 + ' − $' + V2 + ' = $' + (V1 - V2) + '.<br>' +
      (p1 - p2 > 1 ? '1 ' + st[3] + ' costs $' + (V1 - V2) + ' ÷ ' + (p1 - p2) + ' = $' + p + '.<br>' : '') +
      (askP ? k + ' ' + st[1] + ' cost ' + k + ' × $' + p + ' = <b>$' + (k * p) + '</b>.'
            : p2 + ' ' + pl(p2, 1) + ' cost ' + p2 + ' × $' + p + ' = $' + (p2 * p) + ', so ' + n + ' ' + st[0] + ' cost $' + V2 + ' − $' + (p2 * p) + ' = $' + (n * c) +
              '.<br>1 ' + st[2] + ': $' + (n * c) + ' ÷ ' + n + ' = <b>$' + c + '</b>.'), '$'), want);
  }
  const stretch = f => Object.defineProperty(function(){ const q = f(); q.stretch = true; return q; }, 'name', { value: f.name });

  /* every generator tags its item as a Booklet B problem for the mock paper; the
     wrapper keeps the generator's own name, which the harness and bundle report */
  const T = (f, band) => Object.defineProperty(function(){ const q = exam(f()); q.band = band; return q; }, 'name', { value: f.name });

  MQI.registerTopic({
    id:'p3word', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Addition and Subtraction: solving up to 2-step word problems involving addition and subtraction; Multiplication and Division: solving up to 2-step word problems involving the 4 operations (problem-solving heuristics are not enumerated in the 2021 syllabus)",
    label:'Model Method Marina', short:'Word problems', e:'⛵',
    skills:{
      partwhole: {label:'Part-whole models',      tip:'Draw one long bar for the whole and cut it into the parts. The missing part is whole minus the parts you know.'},
      compare:   {label:'Comparison models',      tip:'"3 times as many" means 3 equal boxes on one bar and 1 box on the other. Count all the boxes, then share the total.'},
      beforeafter:{label:'Before and after',      tip:'Draw the bars twice, before and after. When one person gives to the other, the total does not change.'},
      grouping:  {label:'Equal groups and leftovers', tip:'Divide, then ask what the remainder means: a leftover, a box that is not full, or one more box.'},
      money:     {label:'Money in several steps', tip:'Write one line per step: cost of each kind, then the total, then change or what is left.'},
      measure:   {label:'Measurement in several steps', tip:'Change everything to the smaller unit first (2 kg 350 g = 2350 g), then add or take away.'},
      fraction:  {label:'Fractions of one whole', tip:'Make the bottom numbers the same before you add or take away. The whole thing is 1, or 8/8, or 12/12.'},
      heuristic: {label:'Guess and check, work backwards', tip:'Guess and check: make a guess, test it, adjust. Working backwards: start from the end and undo each step.'}
    },
    /* q.band: 3 = exam-hard (needs a model or a heuristic, 3+ operations), 2 = standard.
       q.stretch: top-school shapes (calibration note: at most one per mock, never Booklet A). */
    pools:{
      1:[[T(gPartWhole,2),'partwhole'],[T(gMoreAltogether,2),'compare'],[T(gMoneyBuy,2),'money'],[T(gFracTogether,2),'fraction']],
      2:[[T(gTimesTotal,3),'compare'],[T(gMoreTotal,3),'compare'],[T(gGiveEqual,3),'beforeafter'],[T(gNeedMore,2),'grouping'],
         [T(gMoneyChange,2),'money'],[T(gFracLeft,2),'fraction'],[T(gMeasureLeft,2),'measure']],
      3:[[T(gThreeUnits,3),'compare'],[T(gThreeParty,3),'compare'],[T(gExtraFixed,3),'compare'],[T(gTimesDiff,3),'compare'],
         [T(gSumDiff,3),'compare'],[T(gGiveToEqual3,3),'beforeafter'],[T(gTotalAfter,3),'beforeafter'],[T(gBackwards,3),'heuristic'],
         [T(gNotes,3),'heuristic'],[T(gTwoPrices,3),'heuristic'],[T(gWheels,3),'heuristic'],[T(gMoneyRest,3),'money'],
         [T(stretch(gRatioAfter),3),'beforeafter'],[T(stretch(gElimination),3),'heuristic']]
    }
  });
})();
