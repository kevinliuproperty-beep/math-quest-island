"use strict";
/* Math Quest Island topic: p3divide (P3). Self-contained. Typed answers.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.35): division with remainder; multiplication and
 * division algorithms up to 3 digits by 1 digit ONLY. No 2-digit divisors
 * (that is P5), no decimal quotients (P4), no negative results.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishTyped = G.finishTyped;

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
      2:[[gQuotient,'remainder'],[gDivAlgo,'algo'],[gMulAlgo3,'algo']],
      3:[[gBoxesNeeded,'remainder'],[gTwoStep,'word'],[gMulWord,'word']]
    }
  });
})();
