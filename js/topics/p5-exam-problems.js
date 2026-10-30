"use strict";
/* Math Quest Island topic: p5problems (P5). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * WHY THIS FILE EXISTS. The PSLE Paper 2 mode (js/modes/psle-mock.js) fills its ten
 * structured slots only with band-3, worded, typed items (q.exam = 'problem'). No other
 * P5 topic file carries band 3, so a P5 Paper 2 drew every structured question from a
 * P3/P4 node. The existing p5-*.js files are not edited (never overwrite content); this
 * one file holds PSLE Paper 2-style structured problems spanning the P5 syllabus, plus
 * the one P5 outcome the app was missing: WHOLE NUMBERS 1.1, reading and writing
 * numbers up to 10 million in numerals and in words.
 *
 * SCOPE (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, pp.41-42, PRIMARY FIVE):
 *   Whole Numbers 1.1 reading and writing numbers in numerals and in words (to 10 million)
 *   Whole Numbers 2   the four operations, in context
 *   Fractions 2.2/2.3 multiplying a fraction and a whole number / two fractions
 *                     (the remainder-of-a-remainder problems; nothing divides BY a fraction:
 *                     the backward problem is solved with units, never with a fraction divisor)
 *   Decimals 1.2      converting kg/g, km/m, m/cm, l/ml in decimal form
 *   Percentage 1.1-1.4  part of a whole as %, % of a whole, discount, GST (9%), annual interest
 *   Rate 1.1-1.2      rate as an amount per unit; total, rate or number of units
 *   Area of Triangle 1.1-1.3  base and height; area; composite of rectangle and triangle
 *   Volume 2.4-2.6    volume of a cuboid; liquid in a rectangular tank; l (ml) and cm3
 * NOT here: finding a dimension of a cuboid from its volume, percentage of increase, the
 * whole from a part, ratio, speed, average (all P6, p.43-44).
 *
 * POOLS. 1 = Paper 1 short items, friendly numbers. 2 = Paper 1/2 short answers.
 * 3 = PSLE Paper 2 structured problems: band 3, q.exam = 'problem', worded, typed,
 * coached (q.technique + 3-5 q.steps whose every equation is true and whose last step
 * bolds the key). Every pool-3 key is a whole number (the coaching checker reads it).
 * Every draw carries q.syl = 'P5'; MCQ distractors carry q.miscon + q.optionFeedback;
 * typed items carry q.slips. Tags are defined once, in `misconceptions` below.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr,
        finishTyped = G.finishTyped;

  const KIDS = ['Hui Min', 'Farid', 'Kavitha', 'Jun Hao', 'Siti', 'Ravi', 'Mei Ling', 'Ahmad',
                'Bala', 'Xin Yi', 'Daniel', 'Nurul', 'Wei Jie', 'Aisyah'];
  const ADULTS = ['Mdm Tan', 'Mr Lim', 'Mrs Wong', 'Mr Rahman', 'Mdm Kaur', 'Mr Lee', 'Mrs Goh', 'Mdm Siti'];
  const P5 = q => (q.syl = 'P5', q);
  const money = (q, n) => (q.answerText = '$' + n, q);
  const comma = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dec = x => String(parseFloat(x.toFixed(4)));

  /* MCQ with tagged distractors; dist = [[text, tag, coaching], ...]. null = redraw. */
  function mcq(stem, key, dist, explain) {
    const seen = [key], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      if (seen.indexOf(d[0]) !== -1) continue;
      seen.push(d[0]); keep.push(d);
    }
    if (keep.length < 3) return null;
    const rows = shuffle([[key, null, null]].concat(keep));
    const q = { q: stem, extra: '', choices: rows.map(r => r[0]), correct: 0, explain, answerText: key };
    q.correct = rows.findIndex(r => r[1] === null);
    q.miscon = {}; q.optionFeedback = {};
    rows.forEach((r, i) => { if (r[1]) { q.miscon[i] = r[1]; q.optionFeedback[i] = r[2]; } });
    return P5(q);
  }
  /* typed slips: positive finite values that differ from the key */
  function slips(q, list) {
    const s = {};
    for (const [v, tag] of list) {
      if (!Number.isFinite(v) || v <= 0 || Math.abs(v - q.answer) < 1e-9) continue;
      const k = String(v);
      if (!(k in s)) s[k] = tag;
    }
    q.slips = s;
    return P5(q);
  }
  /* Paper 2 structured problem */
  function band3(q, technique, steps) {
    q.band = 3; q.exam = 'problem'; q.technique = technique; q.steps = steps;
    return q;
  }

  /* ================= WHOLE NUMBERS 1.1: numerals and words ================= */
  const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function under100(r) { return r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''); }
  function under1000(x) {
    const h = Math.floor(x / 100), r = x % 100;
    return (h ? ONES[h] + ' hundred' : '') + (h && r ? ' and ' : '') + (r ? under100(r) : '');
  }
  function words(n) {
    const M = Math.floor(n / 1e6), T = Math.floor(n / 1000) % 1000, U = n % 1000;
    const parts = [];
    if (M) parts.push(under1000(M) + ' million');
    if (T) parts.push(under1000(T) + ' thousand');
    if (U) parts.push((U < 100 && parts.length ? 'and ' : '') + under1000(U));
    let s = parts[0];
    for (let i = 1; i < parts.length; i++) s += (parts[i].indexOf('and ') === 0 ? ' ' : ', ') + parts[i];
    return s;
  }
  /* a number up to 10 million with at least one placeholder zero in it */
  function gapNumber() {
    for (;;) {
      const M = ri(1, 9);
      const T = pick([0, ri(1, 9), ri(10, 99), ri(1, 9) * 100 + ri(0, 9), ri(1, 9) * 100 + ri(1, 9) * 10, ri(100, 999)]);
      const U = pick([0, ri(1, 9), ri(10, 99), ri(1, 9) * 100 + ri(1, 9), ri(1, 9) * 100 + ri(1, 9) * 10, ri(100, 999)]);
      const n = M * 1e6 + T * 1000 + U;
      if (/0/.test(String(n).slice(1)) && !(T === 0 && U === 0)) return { n, M, T, U };
    }
  }
  /* the slips a child makes writing it: dropped placeholders, a group shifted, groups swapped */
  function numeralSlips(g, typed) {
    const out = [];
    const noPh = Number(String(g.M) + (g.T ? String(g.T) : '') + (g.U ? String(g.U) : ''));
    /* a dropped-zero answer that is still 7 digits long: the short digit string with the
       zeros pushed to the end (3,040,006 -> "3406" -> 3,406,000), so it cannot be ruled out
       at a glance by its length. The raw short string is a typed slip only. */
    const L7 = String(noPh).length < 7 ? noPh * Math.pow(10, 7 - String(noPh).length) : noPh;
    out.push([L7, 'no-placeholder']);
    if (typed && noPh < 1e6) out.push([noPh, 'no-placeholder']);
    if (g.T > 0 && g.T < 100) out.push([g.M * 1e6 + g.T * 10000 + g.U, 'place-shift']);
    if (g.U > 0 && g.U < 100) out.push([g.M * 1e6 + g.T * 1000 + g.U * 10, 'place-shift']);
    if (g.U !== g.T) out.push([g.M * 1e6 + g.U * 1000 + g.T, 'group-order']);
    out.push([g.M * 1e7 + g.T * 1000 + g.U, 'extra-zero']);
    return out.filter(s => s[0] !== g.n && s[0] > 0);
  }
  const NUM_FB = {
    'no-placeholder': 'Each group after the millions needs three digits. Fill an empty place with 0.',
    'place-shift': 'One group has moved a place. Write each group in its own three places.',
    'group-order': 'The thousands and the ones have changed places. Read the words in order: millions, thousands, then ones.',
    'extra-zero': 'That number is more than ten million. A number in the millions has 7 digits.'
  };

  /* 1.1 words -> numerals, typed (pools 1 and 2) */
  function gNumeralsTyped() {
    const g = gapNumber();
    const q = finishTyped('Write the number "' + words(g.n) + '" in numerals. (Write it with commas or with no spaces, e.g. 1,234,567.)', g.n,
      'Write it group by group: ' + g.M + ' million, then the thousands as three digits (' + String(g.T).padStart(3, '0') +
      '), then the ones as three digits (' + String(g.U).padStart(3, '0') + '). That gives ' + comma(g.n) + '.');
    q.answerText = comma(g.n);
    return slips(q, numeralSlips(g, true));
  }
  /* 1.1 words -> numerals, MCQ (pool 1) */
  function gNumeralsMcq() {
    const g = gapNumber();
    const dist = numeralSlips(g).map(s => [comma(s[0]), s[1], NUM_FB[s[1]]]);
    const out = mcq('Which of these is the number "' + words(g.n) + '" written in numerals?', comma(g.n), dist,
      'Millions: ' + g.M + '. Thousands: ' + String(g.T).padStart(3, '0') + '. Ones: ' + String(g.U).padStart(3, '0') +
      '. So the number is ' + comma(g.n) + '.');
    return out || gNumeralsMcq();
  }
  /* 1.1 numerals -> words, MCQ (pool 2) */
  function gWordsMcq() {
    const g = gapNumber();
    const dist = numeralSlips(g).filter(s => s[0] < 1e7).map(s => [words(s[0]), s[1],
      s[1] === 'no-placeholder' ? 'Those words lose the zeros that hold empty places. Read ' + comma(g.n) + ' group by group: millions, thousands, ones.' : NUM_FB[s[1]]]);
    const out = mcq('How is ' + comma(g.n) + ' written in words?', words(g.n), dist,
      comma(g.n) + ' is ' + [g.M + ' million', g.T ? g.T + ' thousand' : '', g.U ? String(g.U) : ''].filter(Boolean).join(' and ') + ': "' + words(g.n) + '".');
    return out || gWordsMcq();
  }

  /* ================= DECIMALS 1.2: measurements in decimal form ================= */
  const PAIRS = [ // [big, small, factor, big word]
    ['kg', 'g', 1000, 'kilograms'], ['km', 'm', 1000, 'kilometres'], ['ℓ', 'ml', 1000, 'litres'], ['m', 'cm', 100, 'metres']];
  /* compound -> big unit, MCQ (pool 1) */
  function gConvMcq() {
    const p = pick(PAIRS), f = p[2];
    const big = ri(1, 9);
    const small = f === 1000 ? pick([ri(1, 9), ri(11, 99), ri(101, 999)]) : pick([ri(1, 9), ri(11, 99)]);
    if (small % 10 === 0) return gConvMcq();
    const key = big + small / f, digits = String(f).length - 1;
    const keyS = dec(key) + ' ' + p[0];
    const unpadded = Number(big + '.' + String(small));
    const otherF = big + small / (f === 1000 ? 100 : 1000);
    const dist = [
      [dec(unpadded) + ' ' + p[0], 'placeholder-zero', small + ' ' + p[1] + ' needs ' + digits + ' decimal places, so fill the gap with 0.'],
      [dec(otherF) + ' ' + p[0], 'wrong-factor', '1 ' + p[0] + ' = ' + f + ' ' + p[1] + '. Divide the ' + p[1] + ' by ' + f + '.'],
      [(big + small) + ' ' + p[0], 'added-units', 'Adding the two numbers mixes two different units. Change the ' + p[1] + ' into ' + p[0] + ' first.'],
      [(big * f + small) + ' ' + p[0], 'wrong-direction', 'That is the amount in ' + p[1] + ', not in ' + p[0] + '.']
    ];
    const out = mcq('Write ' + big + ' ' + p[0] + ' ' + small + ' ' + p[1] + ' in ' + p[3] + '.', keyS, dist,
      small + ' ' + p[1] + ' = ' + small + ' ÷ ' + f + ' = ' + dec(small / f) + ' ' + p[0] + ', so ' + big + ' ' + p[0] + ' ' + small + ' ' + p[1] + ' = ' + keyS + '.');
    return out || gConvMcq();
  }
  /* smaller -> larger and larger -> smaller, typed (pool 2) */
  function gConvTyped() {
    const p = pick(PAIRS), f = p[2];
    const THING = { kg: 'A parcel has a mass of ', km: 'A cycling path is ', 'ℓ': 'A jug holds ', m: 'A ribbon is ' };
    const TAIL = { kg: '', km: ' long', 'ℓ': ' of water', m: ' long' };
    if (Math.random() < 0.5) {
      /* smaller -> larger: decimal answer */
      let total = ri(1, 9) * f + (f === 1000 ? pick([ri(1, 9), ri(11, 99), ri(101, 999)]) : pick([ri(1, 9), ri(11, 99)]));
      if (total % 10 === 0) total += 1;
      const ans = Number(dec(total / f));
      const q = finishTyped(THING[p[0]] + total + ' ' + p[1] + TAIL[p[0]] + '. Write this in ' + p[3] + '.', ans,
        '1 ' + p[0] + ' = ' + f + ' ' + p[1] + ', so divide by ' + f + ': ' + total + ' ÷ ' + f + ' = ' + ans + ' ' + p[0] + '.', p[0]);
      q.dp = 3;
      const big = Math.floor(total / f), small = total % f;
      return slips(q, [[Number(big + '.' + small), 'placeholder-zero'], [Number(dec(total / (f === 1000 ? 100 : 1000))), 'wrong-factor'], [total * f, 'wrong-direction']]);
    }
    /* larger (decimal) -> smaller: whole answer */
    let ans = ri(1, 9) * f + (f === 1000 ? pick([ri(1, 9) * 10, ri(11, 99) * 10, ri(1, 9) * 100, ri(101, 999)]) : ri(11, 99));
    if (ans % f === 0) ans += f === 1000 ? 50 : 5;
    const given = dec(ans / f);
    const q = finishTyped(THING[p[0]] + given + ' ' + p[0] + TAIL[p[0]] + '. Write this in ' + (p[1] === 'g' ? 'grams' : p[1] === 'm' ? 'metres' : p[1] === 'ml' ? 'millilitres' : 'centimetres') + '.', ans,
      '1 ' + p[0] + ' = ' + f + ' ' + p[1] + ', so multiply by ' + f + ': ' + given + ' × ' + f + ' = ' + ans + ' ' + p[1] + '.', p[1]);
    q.dp = 3;
    return slips(q, [[Number(dec(ans / 10)), 'wrong-factor'], [ans * 10, 'wrong-factor'], [Number(given), 'not-converted']]);
  }

  /* ================= short worded items (pools 1 and 2) ================= */
  /* Fractions 2.2: fraction of a whole number, what is left (pools 1 and 2) */
  function gShortFraction() {
    const who = pick(KIDS);
    let b = pick([3, 4, 5, 6, 8]), a = ri(1, b - 1);
    while (gcd(a, b) !== 1) a = ri(1, b - 1);
    const N = b * ri(3, 12), gave = N * a / b, ans = N - gave;
    const q = finishTyped(who + ' had ' + N + ' stickers. ' + who + ' gave ' + fr(a, b) + ' of them to a friend. How many stickers did ' + who + ' have left?', ans,
      fr(a, b) + ' of ' + N + ' = ' + gave + '. ' + who + ' had ' + N + ' − ' + gave + ' = ' + ans + ' stickers left.', 'stickers');
    return slips(q, [[gave, 'answered-used'], [N / b, 'one-unit-only']]);
  }
  /* Percentage 1.1: part of a whole as a percentage (pool 2) */
  function gShortPercent() {
    const N = pick([20, 25, 40, 50]);
    let P = ri(2, N - 2);
    while ((P * 100) % N !== 0) P = ri(2, N - 2);
    const pct = P * 100 / N;
    const q = finishTyped('There are ' + N + ' pupils in a class. ' + P + ' of them walk to school. What percentage of the pupils walk to school? (answer in %, e.g. 35)', pct,
      P + ' out of ' + N + ' is ' + P + '/' + N + ' = ' + pct + '/100 = ' + pct + '%.', '%');
    q.answerText = pct + '%';
    return slips(q, [[P, 'part-not-percent'], [100 - pct, 'complement']]);
  }
  /* Rate 1.2: total from a rate found first (pool 2) */
  function gShortRate() {
    const r = pick([12, 15, 18, 24, 25, 30, 35, 40, 45]), m = ri(3, 8);
    let n = ri(4, 15);
    while (n === m) n = ri(4, 15);
    const A = r * m, ans = r * n;
    const q = finishTyped('A printer prints ' + A + ' pages in ' + m + ' minutes. At the same rate, how many pages does it print in ' + n + ' minutes?', ans,
      'Rate: ' + A + ' ÷ ' + m + ' = ' + r + ' pages per minute. In ' + n + ' minutes: ' + r + ' × ' + n + ' = ' + ans + ' pages.', 'pages');
    return slips(q, [[A * n, 'no-unit-rate'], [r, 'unit-rate-only']]);
  }

  /* ================= POOL 3: PSLE Paper 2 structured problems ================= */

  /* Whole numbers, four operations: ticket takings less the hall rental */
  function gConcertTakings() {
    const A = ri(1200, 4800), p = pick([12, 15, 18, 25, 30]), B = ri(800, 3000), c = pick([40, 45, 50, 60, 75]);
    const X = A * p, Y = B * c, Z = X + Y, C = ri(5, 20) * 1000, ans = Z - C;
    const q = money(finishTyped('A concert sold ' + A + ' tickets at $' + p + ' each and ' + B + ' tickets at $' + c +
      ' each. The organisers paid $' + C + ' to rent the hall. How much money was left after paying for the hall? (in dollars) (You may use a calculator.)', ans,
      A + ' × $' + p + ' = $' + X + ' and ' + B + ' × $' + c + ' = $' + Y + '. Together $' + Z + '. Less the hall: $' + Z + ' − $' + C + ' = $' + ans + '.', '$'), ans);
    band3(q, 'Draw a model', [
      'Money from the cheaper tickets: ' + A + ' × $' + p + ' = $' + X + '.',
      'Money from the dearer tickets: ' + B + ' × $' + c + ' = $' + Y + '.',
      'All the takings: $' + X + ' + $' + Y + ' = $' + Z + '.',
      'Take away the hall rental: $' + Z + ' − $' + C + ' = <b>$' + ans + '</b>.'
    ]);
    return slips(q, [[Z, 'missed-step'], [Z + C, 'added-instead'], [(A + B) * c - C, 'one-price-for-all']]);
  }

  /* Whole numbers, division in two stages then a total */
  function gPackCartons() {
    const ITEM = pick([['muffins', 'muffin'], ['erasers', 'eraser'], ['pens', 'pen'], ['curry puffs', 'curry puff']]);
    const b = pick([6, 8, 12, 15, 20, 24]), k = pick([10, 12, 15, 20, 25]), c = ri(15, 90), s = pick([45, 60, 75, 80, 96, 120]);
    const boxes = k * c, N = b * boxes, ans = c * s;
    const q = money(finishTyped('A factory made ' + N + ' ' + ITEM[0] + '. They were packed into boxes of ' + b + ' ' + ITEM[0] +
      ' each, and every ' + k + ' boxes were packed into a carton. Each carton was sold for $' + s +
      '. How much money did the factory collect for all the cartons? (in dollars) (You may use a calculator.)', ans,
      N + ' ÷ ' + b + ' = ' + boxes + ' boxes. ' + boxes + ' ÷ ' + k + ' = ' + c + ' cartons. ' + c + ' × $' + s + ' = $' + ans + '.', '$'), ans);
    band3(q, 'Draw a model', [
      'Number of boxes: ' + N + ' ÷ ' + b + ' = ' + boxes + '.',
      'Number of cartons: ' + boxes + ' ÷ ' + k + ' = ' + c + '.',
      'Money collected: ' + c + ' × $' + s + ' = <b>$' + ans + '</b>.'
    ]);
    return slips(q, [[boxes * s, 'missed-step'], [c, 'stopped-early']]);
  }

  /* Fractions: a fraction of the remainder, find what is left */
  function fracPair() {
    let b = pick([3, 4, 5, 6, 8]), a = ri(1, b - 1);
    while (gcd(a, b) !== 1) a = ri(1, b - 1);
    let d = pick([3, 4, 5, 6]), c = ri(1, d - 1);
    while (gcd(c, d) !== 1) c = ri(1, d - 1);
    return [a, b, c, d];
  }
  function gFracRemainderLeft() {
    const who = pick(ADULTS), [a, b, c, d] = fracPair();
    const T = b * d * ri(4, 30) * 5;
    const S1 = T * a / b, R = T - S1, S2 = R * c / d, L = R - S2;
    /* prices a parent would believe: household items up to about $400 / $300,
       big-ticket items (a holiday, a television) only when the amounts are large */
    let it;
    if (S1 >= 20 && S1 <= 400 && S2 >= 15 && S2 <= 300) it = ['a rice cooker', 'a fan', 'Rice cooker', 'Fan'];
    else if (S1 >= 400 && S1 <= 5000 && S2 >= 300 && S2 <= 3000) it = ['a holiday', 'a television', 'Holiday', 'Television'];
    else return gFracRemainderLeft();
    const q = money(finishTyped(who + ' had $' + T + '. ' + who + ' spent ' + fr(a, b) + ' of the money on ' + it[0] + ' and ' + fr(c, d) +
      ' of the remainder on ' + it[1] + '. How much money did ' + who + ' have left? (in dollars)', L,
      fr(a, b) + ' of $' + T + ' = $' + S1 + ', leaving $' + R + '. ' + fr(c, d) + ' of $' + R + ' = $' + S2 + '. Left: $' + R + ' − $' + S2 + ' = $' + L + '.', '$'), L);
    band3(q, 'Draw a model', [
      it[2] + ': ' + fr(a, b) + ' × $' + T + ' = $' + S1 + '.',
      'The remainder: $' + T + ' − $' + S1 + ' = $' + R + '.',
      it[3] + ': ' + fr(c, d) + ' of the REMAINDER, ' + fr(c, d) + ' × $' + R + ' = $' + S2 + '.',
      'Money left: $' + R + ' − $' + S2 + ' = <b>$' + L + '</b>.'
    ]);
    const ofWhole = T - S1 - T * c / d;
    return slips(q, [[Number.isInteger(ofWhole) ? ofWhole : -1, 'fraction-of-whole'], [R, 'missed-step'], [S2, 'answered-used']]);
  }

  /* Fractions: a fraction of the remainder, find the amount at first (units, no fraction divisor) */
  function gFracRemainderFirst() {
    const who = pick(KIDS), [a, b, c, d] = fracPair();
    /* 1 part of the remainder = u1; a multiple of (b - a), so the remainder splits into (b - a) whole-dollar parts */
    const u1 = (b - a) * ri(1, 6) * 2;
    const R = d * u1;
    const v = R / (b - a), T = b * v, L = (d - c) * u1;
    const S1 = a * v, S2 = c * u1;
    const first = S1 <= 30 ? 'a book' : S1 <= 150 ? 'a watch' : S1 <= 600 ? 'a bicycle' : null;
    const second = S2 <= 40 ? 'a pen' : S2 <= 120 ? 'a bag' : S2 <= 250 ? 'a pair of shoes' : null;
    if (!first || !second) return gFracRemainderFirst();
    const k = d - c, j = b - a, sec = second.replace(/^a /, '');
    const q = money(finishTyped(who + ' had some money. ' + who + ' spent ' + fr(a, b) + ' of it on ' + first + ' and ' + fr(c, d) +
      ' of the remainder on ' + second + '. ' + who + ' had $' + L + ' left. How much money did ' + who + ' have at first? (in dollars)', T,
      'The $' + L + ' is ' + (d - c) + ' of the ' + d + ' parts of the remainder, so the remainder is $' + R + '. That is ' + (b - a) +
      ' of the ' + b + ' parts of the money, so the money at first was $' + T + '.', '$'), T);
    band3(q, 'Work backwards', [
      k === 1
        ? 'After the ' + sec + ', 1 part of the ' + d + ' parts of the remainder is left, so 1 part is $' + u1 + '.'
        : 'After the ' + sec + ', ' + k + ' of the ' + d + ' parts of the remainder are left. 1 part = $' + L + ' ÷ ' + k + ' = $' + u1 + '.',
      'The remainder is ' + d + ' parts: ' + d + ' × $' + u1 + ' = $' + R + '.',
      j === 1
        ? 'The remainder is 1 part of the ' + b + ' parts of the money at first, so 1 part is $' + v + '.'
        : 'The remainder is ' + j + ' of the ' + b + ' parts of the money at first. 1 part = $' + R + ' ÷ ' + j + ' = $' + v + '.',
      'At first: ' + b + ' × $' + v + ' = <b>$' + T + '</b>.'
    ]);
    const sl = [[R, 'stopped-early']];
    const den = b * d - a * d - c * b;            /* 1 - a/b - c/d, over b*d */
    if (den > 0 && (L * b * d) % den === 0) sl.push([L * b * d / den, 'fraction-of-whole']);
    return slips(q, sl);
  }

  /* Decimals: mass or volume in decimal form, total in the smaller unit */
  function gShoppingTotal() {
    const who = pick(ADULTS), n = ri(2, 6);
    const kgKind = Math.random() < 0.5;
    const per = kgKind ? pick([1250, 2350, 1500, 2075, 1850, 2400, 3125, 1450]) : pick([1250, 1500, 1750, 2250, 1850, 2400]);
    const extra = kgKind ? pick([350, 450, 650, 750, 825, 900]) : pick([250, 330, 500, 750, 900]);
    const Y = n * per, ans = Y + extra;
    const big = dec(per / 1000);
    const stem = kgKind
      ? 'A bag of rice has a mass of ' + big + ' kg. ' + who + ' bought ' + n + ' such bags of rice and a packet of beans of mass ' + extra + ' g. What was the total mass of the rice and beans, in grams?'
      : 'A bottle holds ' + big + ' ℓ of juice. ' + who + ' bought ' + n + ' such bottles of juice and a carton of milk holding ' + extra + ' ml. What was the total volume of the juice and milk, in millilitres?';
    const u = kgKind ? 'g' : 'ml', U = kgKind ? 'kg' : 'ℓ';
    const q = finishTyped(stem, ans,
      big + ' ' + U + ' = ' + per + ' ' + u + '. ' + n + ' × ' + per + ' = ' + Y + ' ' + u + '. ' + Y + ' + ' + extra + ' = ' + ans + ' ' + u + '.', u);
    band3(q, 'Units check', [
      'Change to the smaller unit first: ' + big + ' ' + U + ' is ' + per + ' ' + u + '.',
      n + ' of them: ' + n + ' × ' + per + ' = ' + Y + ' ' + u + '.',
      'Add the last item: ' + Y + ' + ' + extra + ' = <b>' + ans + '</b> ' + u + '.'
    ]);
    return slips(q, [[n * per / 10 + extra, 'wrong-factor'], [Y, 'missed-step'], [per + extra, 'missed-multiply']]);
  }

  /* Decimals: m to cm, then what is left */
  function gRibbonLeft() {
    const who = pick(KIDS);
    const Y = pick([350, 425, 450, 500, 575, 600, 640, 750, 825, 900]);
    const c = pick([15, 18, 24, 25, 30, 35, 40, 45]);
    const n = ri(3, Math.floor((Y - 10) / c));
    const U = n * c, ans = Y - U;
    if (ans <= 0) return gRibbonLeft();
    const X = dec(Y / 100);
    const q = finishTyped(who + ' had a ribbon ' + X + ' m long. ' + who + ' cut ' + n + ' pieces, each ' + c +
      ' cm long, from it. How long was the ribbon that was left, in centimetres?', ans,
      X + ' m = ' + Y + ' cm. The pieces used ' + n + ' × ' + c + ' = ' + U + ' cm. Left: ' + Y + ' − ' + U + ' = ' + ans + ' cm.', 'cm');
    band3(q, 'Units check', [
      'Change the ribbon to centimetres: ' + X + ' m is ' + Y + ' cm.',
      'The pieces cut off: ' + n + ' × ' + c + ' = ' + U + ' cm.',
      'Ribbon left: ' + Y + ' − ' + U + ' = <b>' + ans + '</b> cm.'
    ]);
    return slips(q, [[Y * 10 - U, 'wrong-factor'], [U, 'answered-used']]);
  }

  /* Percentage: discount, then 9% GST on the sale price */
  function gDiscountGst() {
    const ITEMS = ['washing machine', 'refrigerator', 'television', 'laptop', 'sofa', 'air-conditioner'];
    const item = pick(ITEMS), who = pick(ADULTS);
    for (let t = 0; t < 200; t++) {
      const d = pick([10, 15, 20, 25, 30, 40]), P = ri(4, 40) * 100;
      if ((P * (100 - d)) % 10000 !== 0) continue;
      const D = P * d / 100, S = P - D, Gs = S * 9 / 100, T = S + Gs;
      const q = money(finishTyped('A ' + item + ' is priced at $' + P + '. During a sale, it is sold at a ' + d +
        '% discount. GST of 9% is then charged on the sale price. How much does ' + who + ' pay for the ' + item + '? (in dollars)', T,
        'Discount: ' + d + '% of $' + P + ' = $' + D + '. Sale price $' + S + '. GST: 9% of $' + S + ' = $' + Gs + '. Pay $' + S + ' + $' + Gs + ' = $' + T + '.', '$'), T);
      band3(q, 'Before and after', [
        'Discount: ' + fr(d, 100) + ' × $' + P + ' = $' + D + '.',
        'Sale price: $' + P + ' − $' + D + ' = $' + S + '.',
        'GST on the sale price: ' + fr(9, 100) + ' × $' + S + ' = $' + Gs + '.',
        'Amount paid: $' + S + ' + $' + Gs + ' = <b>$' + T + '</b>.'
      ]);
      const sl = [[S, 'forgot-gst'], [S - Gs, 'gst-subtracted']];
      if ((P * 9) % 100 === 0) sl.push([S + P * 9 / 100, 'gst-on-original']);
      return slips(q, sl);
    }
    return gConcertTakings();
  }

  /* Percentage: annual interest on two deposits */
  function gTwoAccounts() {
    const who = pick(ADULTS);
    const A = ri(10, 80) * 100, B = ri(10, 80) * 100;
    let a = pick([1, 2, 3, 4]), b = pick([2, 3, 4, 5]);
    if (a === b) b = a + 1;
    const I1 = A * a / 100, I2 = B * b / 100, I = I1 + I2;
    const totalKind = Math.random() < 0.5;
    const ask = totalKind
      ? 'How much money did ' + who + ' have in the two accounts altogether after 1 year? (in dollars)'
      : 'How much interest did ' + who + ' receive altogether after 1 year? (in dollars)';
    const ans = totalKind ? A + B + I : I;
    const q = money(finishTyped(who + ' put $' + A + ' in a bank account that pays ' + a + '% interest per year and $' + B +
      ' in another account that pays ' + b + '% interest per year. ' + ask, ans,
      'Interest: ' + a + '% of $' + A + ' = $' + I1 + ' and ' + b + '% of $' + B + ' = $' + I2 + ', so $' + I + ' altogether' +
      (totalKind ? '. With the deposits: $' + A + ' + $' + B + ' + $' + I + ' = $' + ans + '.' : '.'), '$'), ans);
    const st = [
      'Interest from the first account: ' + fr(a, 100) + ' × $' + A + ' = $' + I1 + '.',
      'Interest from the second account: ' + fr(b, 100) + ' × $' + B + ' = $' + I2 + '.'
    ];
    if (totalKind) st.push('All the interest: $' + I1 + ' + $' + I2 + ' = $' + I + '.',
      'Deposits plus interest: $' + A + ' + $' + B + ' + $' + I + ' = <b>$' + ans + '</b>.');
    else st.push('All the interest: $' + I1 + ' + $' + I2 + ' = <b>$' + I + '</b>.');
    band3(q, 'Draw a model', st);
    const sl = totalKind ? [[I, 'interest-only'], [A + B, 'missed-step']] : [[A + B + I, 'total-not-interest'], [I1, 'missed-step']];
    if (((A + B) * a) % 100 === 0) sl.push([totalKind ? A + B + (A + B) * a / 100 : (A + B) * a / 100, 'one-rate-for-both']);
    return slips(q, sl);
  }

  /* Percentage: a percentage of a percentage part */
  function gPercentOfPart() {
    for (let t = 0; t < 400; t++) {
      const N = ri(8, 60) * 10, p = pick([20, 25, 30, 35, 40, 45, 55, 60, 65]), s = pick([10, 15, 20, 25, 30, 40]);
      if ((N * p) % 100) continue;
      const Gn = N * p / 100;
      if ((Gn * s) % 100) continue;
      const S = Gn * s / 100, ans = Gn - S;
      const q = finishTyped('There are ' + N + ' pupils in a school hall. ' + p + '% of them are girls. ' + s +
        '% of the girls wear spectacles. How many girls do not wear spectacles?', ans,
        p + '% of ' + N + ' = ' + Gn + ' girls. ' + s + '% of ' + Gn + ' = ' + S + ' wear spectacles. ' + Gn + ' − ' + S + ' = ' + ans + ' do not.',
        ['girls', 'pupils']);
      band3(q, 'Draw a model', [
        'Girls: ' + fr(p, 100) + ' × ' + N + ' = ' + Gn + '.',
        'Girls who wear spectacles: ' + fr(s, 100) + ' × ' + Gn + ' = ' + S + '.',
        'Girls who do not: ' + Gn + ' − ' + S + ' = <b>' + ans + '</b>.'
      ]);
      const sl = [[S, 'answered-used'], [Gn, 'missed-step']];
      if ((N * (100 - s)) % 100 === 0) sl.push([N * (100 - s) / 100, 'percent-of-whole']);
      return slips(q, sl);
    }
    return gTwoAccounts();
  }

  /* Rate: two printers working together */
  function gTwoPrinters() {
    const who = pick(ADULTS);
    for (let t = 0; t < 400; t++) {
      const a = pick([20, 24, 25, 30, 35, 40, 45]), b = pick([15, 16, 20, 25, 30, 35]);
      const c = pick([20, 24, 25, 30, 36, 40, 45, 50, 60]), p = pick([8, 10, 12, 16, 20, 24]);
      const P = c * p, r = a + b;
      if (a === b || P % r) continue;
      const ans = P / r;
      if (ans < 4 || ans > 90) continue;
      const q = finishTyped('Printer A prints ' + a + ' pages per minute and Printer B prints ' + b + ' pages per minute. ' + who +
        ' uses both printers together to print ' + c + ' copies of a booklet that has ' + p + ' pages. How many minutes do they take?', ans,
        c + ' × ' + p + ' = ' + P + ' pages. Together ' + a + ' + ' + b + ' = ' + r + ' pages per minute. ' + P + ' ÷ ' + r + ' = ' + ans + ' minutes.', 'min');
      band3(q, 'Units check', [
        'Pages to print: ' + c + ' × ' + p + ' = ' + P + '.',
        'Pages both printers print in 1 minute: ' + a + ' + ' + b + ' = ' + r + '.',
        'Time: ' + P + ' ÷ ' + r + ' = <b>' + ans + '</b> minutes.'
      ]);
      const sl = [[P, 'missed-step']];
      if (P % a === 0) sl.push([P / a, 'one-machine-only']);
      if (P % b === 0) sl.push([P / b, 'one-machine-only']);
      return slips(q, sl);
    }
    return gPetrolCost();
  }

  /* Rate: distance per litre, then cost per litre */
  function gPetrolCost() {
    const who = pick(ADULTS);
    for (let t = 0; t < 400; t++) {
      const d = pick([10, 12, 14, 15, 16, 18]), L = ri(8, 45), cents = pick([250, 260, 275, 280, 300, 320]);
      if ((L * cents) % 100) continue;
      const D = d * L, tc = L * cents, ans = tc / 100;
      const price = '$' + (cents / 100).toFixed(2);
      const q = money(finishTyped(who + '\'s car travels ' + d + ' km on 1 ℓ of petrol. Petrol costs ' + price +
        ' per litre. How much does the petrol cost for a trip of ' + D + ' km? (in dollars)', ans,
        D + ' ÷ ' + d + ' = ' + L + ' ℓ of petrol. ' + L + ' × ' + price + ' = $' + ans + '.', '$'), ans);
      band3(q, 'Units check', [
        'Petrol used: ' + D + ' ÷ ' + d + ' = ' + L + ' ℓ.',
        'Each litre costs ' + price + ', which is ' + cents + ' cents.',
        L + ' litres cost ' + L + ' × ' + cents + ' cents, which is ' + tc + ' cents, and ' + tc + ' ÷ 100 = <b>$' + ans + '</b>.'
      ]);
      const sl = [[L, 'stopped-early']];
      if ((D * cents) % 100 === 0) sl.push([D * cents / 100, 'no-unit-rate']);
      return slips(q, sl);
    }
    return gTwoPrinters();
  }

  /* Area: rectangle less a triangle */
  function gGardenGrass() {
    for (let t = 0; t < 400; t++) {
      const L = ri(12, 40), B = ri(8, 30), b = ri(4, L - 2), h = ri(3, B - 2);
      if ((b * h) % 2) continue;
      const A = L * B, T = b * h / 2, ans = A - T;
      const q = finishTyped('A rectangular garden is ' + L + ' m long and ' + B + ' m wide. A triangular flower bed with a base of ' + b +
        ' m and a height of ' + h + ' m is inside the garden. The rest of the garden is covered with grass. What is the area of the grass, in m²?', ans,
        'Garden: ' + L + ' × ' + B + ' = ' + A + ' m². Flower bed: 1/2 × ' + b + ' × ' + h + ' = ' + T + ' m². Grass: ' + A + ' − ' + T + ' = ' + ans + ' m².', 'm²');
      band3(q, 'Sketch and label', [
        'Area of the garden: ' + L + ' × ' + B + ' = ' + A + ' m².',
        'Area of the flower bed: ' + fr(1, 2) + ' × ' + b + ' × ' + h + ' = ' + T + ' m².',
        'Area of the grass: ' + A + ' − ' + T + ' = <b>' + ans + '</b> m².'
      ]);
      return slips(q, [[A - b * h, 'forgot-half'], [T, 'answered-used'], [A + T, 'added-instead']]);
    }
    return gGardenGrass();
  }

  /* Area: height from a triangle's area, then a rectangle */
  function gTriangleToRect() {
    for (let t = 0; t < 400; t++) {
      const b = ri(4, 24), h = ri(3, 20), L = ri(5, 30);
      if ((b * h) % 2 || L === b) continue;
      const A = b * h / 2, D = 2 * A, ans = L * h;
      const q = finishTyped('A triangle has an area of ' + A + ' cm² and a base of ' + b + ' cm. A rectangle has the same height as the triangle and a length of ' +
        L + ' cm. What is the area of the rectangle, in cm²?', ans,
        'Area of triangle = 1/2 × base × height, so base × height = 2 × ' + A + ' = ' + D + '. Height = ' + D + ' ÷ ' + b + ' = ' + h + ' cm. Rectangle: ' + L + ' × ' + h + ' = ' + ans + ' cm².', 'cm²');
      band3(q, 'Work backwards', [
        'Area of a triangle is ' + fr(1, 2) + ' × base × height, so base × height = 2 × ' + A + ' = ' + D + '.',
        'Height of the triangle: ' + D + ' ÷ ' + b + ' = ' + h + ' cm.',
        'Area of the rectangle: ' + L + ' × ' + h + ' = <b>' + ans + '</b> cm².'
      ]);
      const sl = [[h, 'stopped-early']];
      if (A % b === 0) sl.push([L * A / b, 'forgot-half']);
      return slips(q, sl);
    }
    return gTriangleToRect();
  }

  /* Volume: water needed to fill a tank to the brim */
  function gTankTopUp() {
    for (let t = 0; t < 400; t++) {
      const L = pick([20, 25, 30, 40, 50, 60]), W = pick([15, 20, 25, 30, 40]), H = pick([20, 25, 30, 35, 40, 45, 50]);
      const d = ri(4, H - 4), e = H - d, V = L * W * e;
      if (V % 1000) continue;
      const ans = V / 1000;
      const q = finishTyped('A rectangular tank is ' + L + ' cm long, ' + W + ' cm wide and ' + H + ' cm high. It contains water to a depth of ' + d +
        ' cm. How many more litres of water are needed to fill the tank completely? (1 ℓ = 1000 cm³)', ans,
        'The empty part is ' + H + ' − ' + d + ' = ' + e + ' cm high. ' + L + ' × ' + W + ' × ' + e + ' = ' + V + ' cm³ = ' + ans + ' ℓ.', 'ℓ');
      band3(q, 'Sketch and label', [
        'Height of the empty part: ' + H + ' − ' + d + ' = ' + e + ' cm.',
        'Volume of the empty part: ' + L + ' × ' + W + ' × ' + e + ' = ' + V + ' cm³.',
        'In litres: ' + V + ' ÷ 1000 = <b>' + ans + '</b> ℓ.'
      ]);
      const sl = [[V, 'not-converted']];
      if ((L * W * d) % 1000 === 0) sl.push([L * W * d / 1000, 'water-already-in']);
      if ((L * W * H) % 1000 === 0) sl.push([L * W * H / 1000, 'whole-tank']);
      return slips(q, sl);
    }
    return gTankTopUp();
  }

  /* Volume: tank water shared into jugs */
  function gTankToJugs() {
    for (let t = 0; t < 400; t++) {
      const L = pick([20, 24, 25, 30, 36, 40]), W = pick([12, 15, 18, 20, 25]), H = pick([20, 25, 30, 40]);
      const d = ri(5, H - 3), n = pick([3, 4, 5, 6, 8, 9, 10, 12]);
      const V = L * W * d;
      if (V % n) continue;
      const ans = V / n;
      if (ans > 3000) continue;
      const who = pick(ADULTS);
      const q = finishTyped('A rectangular tank is ' + L + ' cm long, ' + W + ' cm wide and ' + H + ' cm high. It is filled with water to a depth of ' + d +
        ' cm. ' + who + ' pours all the water equally into ' + n + ' jugs. How many millilitres of water are there in each jug? (1 cm³ = 1 ml)', ans,
        'Water: ' + L + ' × ' + W + ' × ' + d + ' = ' + V + ' cm³ = ' + V + ' ml. Each jug: ' + V + ' ÷ ' + n + ' = ' + ans + ' ml.', ['ml', 'cm³']);
      band3(q, 'Sketch and label', [
        'Volume of the water: ' + L + ' × ' + W + ' × ' + d + ' = ' + V + ' cm³.',
        'Since 1 cm³ is 1 ml, the water is ' + V + ' ml.',
        'Water in each jug: ' + V + ' ÷ ' + n + ' = <b>' + ans + '</b> ml.'
      ]);
      const sl = [[V, 'missed-step']];
      if ((L * W * H) % n === 0) sl.push([L * W * H / n, 'whole-tank']);
      return slips(q, sl);
    }
    return gTankToJugs();
  }

  MQI.registerTopic({
    id: 'p5problems', level: 'P5', strand: 'Number and Algebra; Measurement and Geometry',
    moeSubTopic: 'Numbers up to 10 million: reading and writing numbers in numerals and in words. ' +
      'Fractions: multiplying a proper/improper fraction and a whole number without calculator. ' +
      'Decimals: converting a measurement from a smaller unit to a larger unit in decimal form, and vice versa. ' +
      'Percentage: expressing a part of a whole as a percentage; finding a percentage part of a whole; finding discount, GST and annual interest. ' +
      'Rate: finding rate, total amount or number of units given the other two quantities. ' +
      'Area of Triangle: area of triangle; finding the area of composite figures made up of rectangles, squares and triangles. ' +
      'Volume of Cube and Cuboid: volume of a cube/cuboid; finding the volume of liquid in a rectangular tank; relationship between ℓ (or ml) with cm3',
    label: 'Paper Two Point', short: 'P5 Problems', e: '📝',
    skills: {
      wholes:     { label: 'Whole numbers', tip: 'Read big numbers in groups of three: millions, thousands, ones, and fill empty places with 0.' },
      fractions:  { label: 'Fraction problems', tip: 'Ask "a fraction of WHAT?" - of the whole, or of what was left.' },
      decimals:   { label: 'Measurement in decimals', tip: 'Change everything into the same, smaller unit before adding.' },
      percentage: { label: 'Percentage problems', tip: 'Write each % as a fraction of 100 and say aloud what it is a percentage of.' },
      rate:       { label: 'Rate problems', tip: 'Find the amount for ONE unit first, then scale up.' },
      area:       { label: 'Area problems', tip: 'Sketch the figure, label every length, then add or take away the parts.' },
      volume:     { label: 'Volume and tanks', tip: 'The water in a tank is a cuboid: length × breadth × depth of the water.' }
    },
    misconceptions: {
      'no-placeholder':     'Leaves out the zeros that hold empty places in a large number.',
      'place-shift':        'Writes a group of digits one place too far left.',
      'group-order':        'Writes the thousands and ones groups in the wrong order.',
      'extra-zero':         'Writes one zero too many, so the number is ten times too big.',
      'placeholder-zero':   'Leaves out the zero after the decimal point when converting units.',
      'wrong-factor':       'Uses 10 or 100 instead of 1000 (or the other way round) when converting units.',
      'added-units':        'Adds the numbers of two different units together.',
      'wrong-direction':    'Multiplies when converting to a larger unit, or divides when converting to a smaller one.',
      'not-converted':      'Gives the answer in the given unit without changing it.',
      'answered-used':      'Gives the part used or taken instead of the part asked for.',
      'one-unit-only':      'Stops at the value of one part.',
      'part-not-percent':   'Gives the count instead of the percentage.',
      'complement':         'Gives the percentage of the other group.',
      'no-unit-rate':       'Multiplies the given numbers without finding the rate for 1 unit.',
      'unit-rate-only':     'Stops at the rate for 1 unit.',
      'missed-step':        'Leaves out one step of a multi-step problem.',
      'added-instead':      'Adds an amount that should be taken away.',
      'one-price-for-all':  'Uses one price for every item.',
      'stopped-early':      'Stops at a middle answer instead of the one the question asks for.',
      'fraction-of-whole':  'Takes the second fraction of the whole instead of the remainder.',
      'missed-multiply':    'Counts one item when the question has several.',
      'forgot-gst':         'Leaves out the GST.',
      'gst-subtracted':     'Takes the GST away instead of adding it.',
      'gst-on-original':    'Charges GST on the price before the discount.',
      'interest-only':      'Gives only the interest when the question asks for the total amount.',
      'total-not-interest': 'Gives the total amount when the question asks for the interest only.',
      'one-rate-for-both':  'Uses one interest rate for both accounts.',
      'percent-of-whole':   'Takes the second percentage of everyone instead of the group named.',
      'one-machine-only':   'Uses the rate of only one machine.',
      'forgot-half':        'Forgets the half in the area of a triangle.',
      'water-already-in':   'Finds the water already in the tank instead of the water still needed.',
      'whole-tank':         'Uses the full height of the tank instead of the depth of the water.'
    },
    pools: {
      1: [[gNumeralsTyped, 'wholes'], [gNumeralsMcq, 'wholes'], [gConvMcq, 'decimals'], [gShortFraction, 'fractions']],
      2: [[gNumeralsTyped, 'wholes'], [gWordsMcq, 'wholes'], [gConvTyped, 'decimals'], [gShortFraction, 'fractions'],
          [gShortPercent, 'percentage'], [gShortRate, 'rate']],
      3: [[gConcertTakings, 'wholes'], [gPackCartons, 'wholes'], [gFracRemainderLeft, 'fractions'], [gFracRemainderFirst, 'fractions'],
          [gShoppingTotal, 'decimals'], [gRibbonLeft, 'decimals'], [gDiscountGst, 'percentage'], [gTwoAccounts, 'percentage'],
          [gPercentOfPart, 'percentage'], [gTwoPrinters, 'rate'], [gPetrolCost, 'rate'], [gGardenGrass, 'area'],
          [gTriangleToRect, 'area'], [gTankTopUp, 'volume'], [gTankToJugs, 'volume']]
    }
  });
})();
