"use strict";
/* Math Quest Island topic: p3divide (P3). Self-contained. Typed answers.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.35): division with remainder; multiplication and
 * division algorithms up to 3 digits by 1 digit ONLY. No 2-digit divisors
 * (that is P5), no decimal quotients (P4), no negative results.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishTyped = G.finishTyped, finishNum = G.finishNum;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul'];
  const SNACKS = ['curry puffs','kaya toasts','pineapple tarts','otah sticks','soya bean cartons','ang ku kueh'];

  function gLeftOver(){
    const d = ri(3, 9), q = ri(4, 12), r = ri(1, d - 1), n = d*q + r;
    const who = pick(NAMES), item = pick(SNACKS);
    return finishTyped(who + ' packs ' + n + ' ' + item + ' into ' + d + ' boxes with the same number in each box. How many are left over?',
      r, n + ' / ' + d + ' = ' + q + ' with ' + r + ' left over, because ' + d + ' x ' + q + ' = ' + (d*q) + ' and ' + n + ' - ' + (d*q) + ' = ' + r + '.');
  }
  function gQuotient(){
    const d = ri(3, 9), q = ri(10, 40), r = ri(1, d - 1), n = d*q + r;
    return finishTyped('How many groups of ' + d + ' can be made from ' + n + '?',
      q, d + ' x ' + q + ' = ' + (d*q) + ', which is the closest you can get without passing ' + n + '. That makes ' + q + ' groups, with ' + r + ' left over.');
  }
  function gBoxesNeeded(){
    const d = ri(4, 9), q = ri(6, 20), r = ri(1, d - 1), n = d*q + r;
    const who = pick(NAMES), item = pick(SNACKS);
    return finishTyped(who + ' packs ' + n + ' ' + item + ' into boxes of ' + d + '. How many boxes are needed to hold all of them?',
      q + 1, n + ' / ' + d + ' = ' + q + ' remainder ' + r + '. The ' + r + (r === 1 ? ' left over still needs a box,' : ' left over still need a box,') + ' so ' + who + ' needs ' + (q+1) + ' boxes.');
  }

  function gMulAlgo(){
    const a = ri(12, 99), b = ri(3, 9);
    return finishTyped(a + ' x ' + b + ' = ?', a*b,
      'Split ' + a + ' into ' + (Math.floor(a/10)*10) + ' + ' + (a%10) + '. ' + (Math.floor(a/10)*10) + ' x ' + b + ' = ' +
      (Math.floor(a/10)*10*b) + ' and ' + (a%10) + ' x ' + b + ' = ' + ((a%10)*b) + '. Add them: ' + (a*b) + '.');
  }
  /* P3 GAPS LANE 2026-10-06 (MOE P3 3.4, multiplication algorithm up to 3 digits
     by 1 digit). gMulAlgo above stops at 2 digits, so until this lane no bank in
     the game asked for 3-digit x 1-digit. Every draw REGROUPS at least once - the
     carry is the whole point of the written method - and about half carry twice.
     The product stays inside 4 digits (999 x 9 = 8991), the P3 number ceiling. */
  function carries3(a, b){
    let c = 0, n = 0;
    for (let x = a; x > 0; x = Math.floor(x / 10)){
      const s = (x % 10) * b + c;
      c = Math.floor(s / 10);
      if (c > 0 && x >= 10) n++;           /* a carry into a column that exists */
    }
    return n;
  }
  function mulSplit(a, b){
    const h = Math.floor(a / 100) * 100, t = Math.floor(a / 10) % 10 * 10, o = a % 10;
    const parts = [[h, h * b], [t, t * b], [o, o * b]].filter(p => p[0] > 0);
    return 'Split ' + a + ' into ' + parts.map(p => p[0]).join(' + ') + '. ' +
      parts.map(p => p[0] + ' x ' + b + ' = ' + p[1]).join(', ') + '. Add them: ' +
      parts.map(p => p[1]).join(' + ') + ' = ' + (a * b) + '.';
  }
  function draw3(){
    let a = 347, b = 6, g = 0;
    do { a = ri(102, 999); b = ri(3, 9); g++; }
    while (g < 200 && !(carries3(a, b) >= 1 && a % 10 !== 0));
    return [a, b];
  }
  function gMulAlgo3(){
    const ab = draw3(), a = ab[0], b = ab[1];
    return finishTyped(a + ' x ' + b + ' = ?', a*b,
      mulSplit(a, b) + ' On paper, start with the ones and carry each ten into the next column.');
  }
  const PACKS = [['packet','stickers'],['box','beads'],['bag','marbles'],['tub','stickers']];
  function gMulWord(){
    const ab = draw3(), per = ab[0], n = ab[1];
    const kid = pick(NAMES), pk = pick(PACKS);
    return finishTyped('Each ' + pk[0] + ' has ' + per + ' ' + pk[1] + '. ' + kid + ' buys ' + n + ' ' + pk[0] +
      (pk[0] === 'box' ? 'es' : 's') + '. How many ' + pk[1] + ' are there altogether?', per*n,
      n + ' groups of ' + per + ' is ' + per + ' x ' + n + '. ' + mulSplit(per, n), pk[1]);
  }
  function gDivAlgo(){
    /* scope clamp (MOE p.35 item 3.4): up to 3 digits by 1 digit, so d*q <= 999 */
    const d = ri(3, 9), q = ri(20, Math.floor(999/d)), n = d*q;
    return finishTyped(n + ' / ' + d + ' = ?', q,
      'Ask: ' + d + ' x what = ' + n + '? ' + d + ' x ' + q + ' = ' + n + ', so the answer is ' + q + '.');
  }
  function gTwoStep(){
    const who = pick(NAMES), trays = ri(4, 9), each = pick([10, 12, 15, 30]), drop = ri(3, 20);
    return finishTyped(who + ' buys ' + trays + ' trays of eggs at NTUC. Each tray holds ' + each +
      ' eggs. ' + drop + ' eggs crack on the MRT ride home. How many good eggs are left?',
      trays*each - drop,
      'First find all the eggs: ' + trays + ' x ' + each + ' = ' + (trays*each) + '. Then take away the cracked ones: ' +
      (trays*each) + ' - ' + drop + ' = ' + (trays*each - drop) + '.');
  }

  /* ===== HARD LANE "divide" 2026-10-07 (calibration cards D1, D2, D3) ==========
     Real P3 EOY papers set remainder problems as 2-3 step long questions, where the
     remainder has to be INTERPRETED (round up, round down, or "how many more for
     one more group"), and pack-then-repack problems. Every new item carries
     q.band (3 = exam-hard multi-step, 2 = standard) for the mock's router.
     Scope (MOE p.35): every division here is at most 3 digits by 1 digit, every
     multiplication at most 2 digits by 1 digit, and every total stays under 10 000.
     Answers are never 1, so a plural count noun always reads correctly. */
  const band = (q, b) => (q.band = b, q);
  const sOrP = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  /* a two-word count noun also accepts its last word: "42 tarts" on "pineapple tarts" */
  const unitOf = noun => noun.indexOf(' ') < 0 ? noun : [noun, noun.split(' ').pop()];
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  /* rest = d*q + r with 1 <= r <= d-1, rest in [lo, hi] */
  function drawRem(d, lo, hi, rMin){
    const q = ri(Math.ceil((lo + d) / d), Math.floor((hi - d) / d));
    const r = ri(rMin || 1, d - 1);
    return { q: q, r: r, n: d*q + r };
  }

  /* D1a: subtract, divide, ROUND UP. Traps: the bare quotient (forgets the leftover
     needs a container too), the remainder itself, and dividing the whole batch. */
  const PACK_ITEMS = ['curry puffs','pineapple tarts','ang ku kueh','kaya buns','egg tarts'];
  const PACK_BOX = [['box','boxes'],['bag','bags'],['packet','packets']];
  const PACK_FIRST = ['are sold at the counter','are sent to a school canteen','are given to a home for the elderly'];
  function gPackRest(){
    const d = ri(4, 9), R = drawRem(d, 120, 990), sold = ri(12, 90) * 10, total = R.n + sold;
    const item = pick(PACK_ITEMS), bx = pick(PACK_BOX);
    const stem = 'A bakery makes ' + total + ' ' + item + '. ' + sold + ' of them ' + pick(PACK_FIRST) +
      '. The rest are packed into ' + bx[1] + ' of ' + d + '. What is the least number of ' + bx[1] +
      ' needed to pack all the rest?';
    const ex = 'Step 1: find the rest. ' + total + ' - ' + sold + ' = ' + R.n + '. ' +
      'Step 2: ' + R.n + ' / ' + d + ' = ' + R.q + ' remainder ' + R.r + '. ' +
      'Step 3: ' + R.q + ' ' + bx[1] + ' hold ' + (R.q*d) + ', so ' + sOrP(R.r, item.replace(/s$/, ''), item) +
      ' would still be left out. ' + (R.r === 1 ? 'It needs' : 'They need') + ' one more ' + bx[0] +
      ', so the answer is ' + R.q + ' + 1 = ' + (R.q + 1) + ' ' + bx[1] + '. ' +
      '"Least number needed" means round UP: every one must be packed.';
    return band(finishTyped(stem, R.q + 1, ex, bx[1]), 3);
  }

  /* D1b: multiply, add, divide, ROUND UP (everyone must get a seat). */
  const RIDES = [['van','vans',[7,8,9],['the Science Centre','the Botanic Gardens','the Bird Paradise','the Singapore Zoo']],
                 ['boat','boats',[5,6,7,8],['Pulau Ubin','Kusu Island','St John\'s Island']]];
  function gTripsNeeded(){
    let k, n, t, d, tot, rd, g = 0;
    do {
      rd = pick(RIDES); d = pick(rd[2]); k = ri(2, 6); n = ri(24, 40); t = ri(2, 9);
      tot = k*n + t; g++;
    } while (g < 200 && (tot % d === 0 || tot > 999));
    const place = pick(rd[3]);
    const stem = k + ' classes of ' + n + ' pupils each and ' + t + ' teachers go on a trip to ' + place +
      '. Each ' + rd[0] + ' can carry ' + d + ' people. What is the least number of ' + rd[1] +
      ' needed to carry everyone at the same time?';
    const q = Math.floor(tot / d), r = tot % d;
    const ex = 'Step 1: pupils. ' + k + ' x ' + n + ' = ' + (k*n) + '. ' +
      'Step 2: add the teachers. ' + (k*n) + ' + ' + t + ' = ' + tot + ' people. ' +
      'Step 3: ' + tot + ' / ' + d + ' = ' + q + ' remainder ' + r + '. ' +
      q + ' ' + rd[1] + ' carry ' + (q*d) + ' people, and ' + sOrP(r, 'person is', 'people are') + ' still left behind, so one more ' + rd[0] +
      ' is needed: ' + q + ' + 1 = ' + (q + 1) + ' ' + rd[1] + '. Do not forget the teachers - they need seats too.';
    return band(finishTyped(stem, q + 1, ex, rd[1]), 3);
  }

  /* D1c: multiply, divide, then "how many MORE for one more" = group size - remainder.
     Traps: giving the remainder, or the number of groups made. */
  const ONE_MORE = [
    { who:'Mrs Lim', pack:'tray', packs:'trays', per:30, thing:'eggs', one:'egg', make:'cake', makes:'cakes', verb:'bakes', verbTo:'bake', need:'needs' },
    { who:'Uncle Ravi', pack:'carton', packs:'cartons', per:12, thing:'eggs', one:'egg', make:'kaya jar', makes:'kaya jars', verb:'makes', verbTo:'make', need:'needs' },
    { who:'NAME', pack:'packet', packs:'packets', per:25, thing:'beads', one:'bead', make:'bracelet', makes:'bracelets', verb:'makes', verbTo:'make', need:'uses' },
    { who:'NAME', pack:'box', packs:'boxes', per:20, thing:'crayons', one:'crayon', make:'art set', makes:'art sets', verb:'makes', verbTo:'make', need:'uses' }
  ];
  function gOneMore(){
    let c, k, d, tot, r, g = 0;
    do {
      c = pick(ONE_MORE); k = ri(3, 9); d = ri(4, 9); tot = k * c.per; r = tot % d; g++;
    } while (g < 200 && (r === 0 || d - r < 2 || tot > 999));
    const who = c.who === 'NAME' ? pick(NAMES) : c.who, q = Math.floor(tot / d), more = d - r;
    const stem = who + ' has ' + k + ' ' + c.packs + ' of ' + c.thing + ' with ' + c.per + ' ' + c.thing + ' in each ' + c.pack +
      '. Each ' + c.make + ' ' + c.need + ' ' + d + ' ' + c.thing + '. ' + who + ' ' + c.verb + ' as many ' + c.makes +
      ' as possible. How many more ' + c.thing + ' are needed to ' + c.verbTo + ' one more ' + c.make + '?';
    const ex = 'Step 1: ' + k + ' x ' + c.per + ' = ' + tot + ' ' + c.thing + '. ' +
      'Step 2: ' + tot + ' / ' + d + ' = ' + q + ' remainder ' + r + ', so ' + q + ' ' + c.makes + ' are made and ' +
      sOrP(r, c.one, c.thing) + ' ' + (r === 1 ? 'is' : 'are') + ' left. ' +
      'Step 3: one more ' + c.make + ' needs ' + d + ', and ' + r + ' are already there, so ' + d + ' - ' + r + ' = ' + more +
      ' more ' + c.thing + '. The remainder (' + r + ') is what is LEFT, not what is NEEDED.';
    return band(finishTyped(stem, more, ex, c.thing), 3);
  }

  /* D1d: subtract twice, divide, ROUND DOWN (a leftover too small for one more).
     Trap: rounding up as if it were a "how many needed" question. */
  function gMostAfter(){
    const who = pick(NAMES);
    if (ri(0, 1)){
      const d = ri(3, 9), R = drawRem(d, 40, 150), a = ri(6, 25), b = ri(5, 20), T = R.n + a + b;
      const item = pick([['pen','pens'],['notebook','notebooks'],['keychain','keychains'],['file','files']]);
      const stem = who + ' has $' + T + '. ' + who + ' spends $' + a + ' on a storybook and $' + b +
        ' on a water bottle. With the money left, ' + who + ' buys as many ' + item[1] + ' as possible. Each ' + item[0] +
        ' costs $' + d + '. What is the greatest number of ' + item[1] + ' ' + who + ' can buy?';
      const ex = 'Step 1: money spent. $' + a + ' + $' + b + ' = $' + (a + b) + '. ' +
        'Step 2: money left. $' + T + ' - $' + (a + b) + ' = $' + R.n + '. ' +
        'Step 3: ' + R.n + ' / ' + d + ' = ' + R.q + ' remainder ' + R.r + '. The $' + R.r + ' left is not enough for another ' +
        item[0] + ', so round DOWN: ' + R.q + ' ' + item[1] + '.';
      return band(finishTyped(stem, R.q, ex, item[1]), 3);
    }
    const d = ri(4, 9), R = drawRem(d, 120, 900), a = ri(3, 18) * 5, b = ri(4, 16) * 5, T = R.n + a + b;
    const stem = 'A roll of ribbon is ' + T + ' cm long. ' + who + ' cuts off ' + a + ' cm for a bow and ' + b +
      ' cm to tie a box. ' + who + ' then cuts the rest of the ribbon into pieces that are each ' + d +
      ' cm long. What is the greatest number of ' + d + ' cm pieces ' + who + ' can cut?';
    const ex = 'Step 1: ' + a + ' + ' + b + ' = ' + (a + b) + ' cm is cut off first. ' +
      'Step 2: ' + T + ' - ' + (a + b) + ' = ' + R.n + ' cm is left. ' +
      'Step 3: ' + R.n + ' / ' + d + ' = ' + R.q + ' remainder ' + R.r + '. The last ' + R.r + ' cm is too short to make another ' +
      d + ' cm piece, so round DOWN: ' + R.q + ' pieces.';
    return band(finishTyped(stem, R.q, ex, 'pieces'), 3);
  }

  /* D2a: pack, then repack. a x b, then take some away OR compare, then share equally.
     Traps: stopping after the multiplication, or after the division. */
  /* [item, old group, old groups, new group, new groups, preposition for the new group] */
  const REPACK = [['pineapple tarts','box','boxes','tray','trays','on'],['curry puffs','box','boxes','plate','plates','on'],
                  ['ang ku kueh','tray','trays','plate','plates','on'],['oranges','bag','bags','basket','baskets','in'],
                  ['muffins','box','boxes','tray','trays','on']];
  function gRepack(){
    const c = pick(REPACK);
    let a, b, e, x, g = 0;
    if (ri(0, 1)){
      /* compare: (a*b)/e - b, so the new groups must be BIGGER: e < a */
      /* a === 2e would make the answer equal b, a number printed in the stem */
      do { a = ri(4, 9); b = ri(12, 60); e = ri(3, a - 1); g++; } while (g < 300 && (a*b % e !== 0 || a*b > 999 || a === 2*e));
      const each = a*b / e;
      const stem = 'There are ' + a + ' ' + c[2] + ' of ' + c[0] + ' with ' + b + ' ' + c[0] + ' in each ' + c[1] +
        '. All the ' + c[0] + ' are put equally ' + c[5] + 'to ' + e + ' ' + c[4] + '. How many more ' + c[0] + ' are there ' + c[5] + ' each ' +
        c[3] + ' than in each ' + c[1] + '?';
      const ex = 'Step 1: all the ' + c[0] + '. ' + a + ' x ' + b + ' = ' + (a*b) + '. ' +
        'Step 2: share them ' + c[5] + 'to the ' + c[4] + '. ' + (a*b) + ' / ' + e + ' = ' + each + ' ' + c[5] + ' each ' + c[3] + '. ' +
        'Step 3: compare. ' + each + ' - ' + b + ' = ' + (each - b) + '. Read the question to the end: it asks how many MORE, not how many ' + c[5] + ' each ' + c[3] + '.';
      return band(finishTyped(stem, each - b, ex, unitOf(c[0])), 3);
    }
    do { a = ri(3, 9); b = ri(12, 60); x = ri(2, 30); e = ri(3, 9); g++; }
    while (g < 300 && (e === a || (a*b - x) % e !== 0 || a*b > 999 || (a*b - x) / e < 2));
    const left = a*b - x, each = left / e;
    const verb = pick(['are eaten at a party','are given to the neighbours','are sold']);
    const stem = 'There are ' + a + ' ' + c[2] + ' of ' + c[0] + ' with ' + b + ' ' + c[0] + ' in each ' + c[1] + '. ' +
      x + ' of the ' + c[0] + ' ' + verb + '. The rest are put equally ' + c[5] + 'to ' + e + ' ' + c[4] +
      '. How many ' + c[0] + ' are there ' + c[5] + ' each ' + c[3] + '?';
    const ex = 'Step 1: all the ' + c[0] + '. ' + a + ' x ' + b + ' = ' + (a*b) + '. ' +
      'Step 2: take away ' + x + '. ' + (a*b) + ' - ' + x + ' = ' + left + '. ' +
      'Step 3: share equally. ' + left + ' / ' + e + ' = ' + each + ' ' + c[5] + ' each ' + c[3] + '.';
    return band(finishTyped(stem, each, ex, unitOf(c[0])), 3);
  }

  /* D2b: total over a run of days -> one day -> a part of the run. The interpretation
     step is counting the days INCLUSIVELY (Friday to Sunday is 3 days, not 2). */
  const DAILY = [['read','pages','pages of a storybook'],['folded','paper cranes','paper cranes'],
                 ['made','origami stars','origami stars'],['collected','seashells','seashells at the beach']];
  function gDaysPart(){
    const span = pick([[0, 6], [0, 4], [0, 5], [1, 5]]);    /* Mon-Sun, Mon-Fri, Mon-Sat, Tue-Sat */
    const days = span[1] - span[0] + 1;
    const per = ri(12, Math.floor(999 / days));
    let s, t;
    do { s = ri(span[0], span[1] - 1); t = ri(s + 1, span[1]); } while (t - s + 1 >= days);
    const part = t - s + 1, who = pick(NAMES), c = pick(DAILY);
    const stem = who + ' ' + c[0] + ' ' + (per*days) + ' ' + c[2] + ' from ' + DAYS[span[0]] + ' to ' + DAYS[span[1]] +
      '. ' + who + ' ' + c[0] + ' the same number of ' + c[1] + ' each day. How many ' + c[1] + ' did ' + who + ' ' +
      ({read:'read',folded:'fold',made:'make',collected:'collect'})[c[0]] + ' from ' + DAYS[s] + ' to ' + DAYS[t] + '?';
    const ex = 'Step 1: count the days. ' + DAYS[span[0]] + ' to ' + DAYS[span[1]] + ' is ' + days + ' days (' +
      DAYS.slice(span[0], span[1] + 1).join(', ') + '). ' +
      'Step 2: one day. ' + (per*days) + ' / ' + days + ' = ' + per + ' ' + c[1] + '. ' +
      'Step 3: ' + DAYS[s] + ' to ' + DAYS[t] + ' is ' + part + ' days (' + DAYS.slice(s, t + 1).join(', ') + '), counting both ends. ' +
      part + ' x ' + per + ' = ' + (part*per) + ' ' + c[1] + '.';
    return band(finishTyped(stem, part*per, ex, unitOf(c[1])), 3);
  }

  /* D3: inverse division, MCQ. dividend = quotient x divisor + remainder.
     Distractors: forgets the remainder (q*d), takes the remainder away (q*d - r),
     and counts the leftover as one more full group ((q+1)*d). */
  const INV = [['sweets','sweet','bags','bag'],['marbles','marble','boxes','box'],['stickers','sticker','packets','packet'],
               ['erasers','eraser','tins','tin'],['buttons','button','jars','jar']];
  function gInverseDiv(){
    const c = pick(INV), d = ri(3, 9), q = ri(12, Math.floor((999 - 8) / d)), r = ri(1, d - 1), n = q*d + r;
    const who = pick(NAMES);
    const stem = who + ' puts some ' + c[0] + ' equally into ' + d + ' ' + c[2] + '. There are ' + q + ' ' + c[0] +
      ' in each ' + c[3] + ' and ' + sOrP(r, c[1] + ' is', c[0] + ' are') + ' left over. How many ' + c[0] + ' were there at first?';
    const ex = 'Put the groups back together, then add the leftover. ' + d + ' x ' + q + ' = ' + (q*d) + ' in the ' + c[2] +
      '. ' + (q*d) + ' + ' + r + ' = ' + n + '. Check: ' + n + ' / ' + d + ' = ' + q + ' remainder ' + r + '.';
    return band(finishNum(stem, '', n, [q*d, q*d - r, (q + 1)*d], c[0], ex), 2);
  }

  MQI.registerTopic({
    id:'p3divide', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Multiplication and Division: division with remainder; multiplication and division algorithms (up to 3 digits by 1 digit)",
    label:'Remainder Reef', short:'Division with remainder', e:'🐚',
    skills:{
      remainder:{label:'Division with remainder', tip:'Ask "how many are left over?" while sharing sweets at home. The leftover is the remainder.'},
      algo:     {label:'Long multiplication and division', tip:'Split the big number: 34 x 6 is 30 x 6 plus 4 x 6. Same trick works on paper.'},
      word:     {label:'Two-step word problems', tip:'Two-step problems need two sentences of working. Ask your child to say step 1 out loud before writing.'}
    },
    pools:{
      1:[[gLeftOver,'remainder'],[gMulAlgo,'algo']],
      2:[[gQuotient,'remainder'],[gDivAlgo,'algo'],[gMulAlgo3,'algo'],[gInverseDiv,'remainder']],
      3:[[gBoxesNeeded,'remainder'],[gTwoStep,'word'],[gMulWord,'word'],
         [gPackRest,'remainder'],[gTripsNeeded,'remainder'],[gOneMore,'remainder'],[gMostAfter,'remainder'],
         [gRepack,'word'],[gDaysPart,'word']]
    }
  });
})();
