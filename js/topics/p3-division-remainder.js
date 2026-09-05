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
    return finishTyped('What is the quotient when ' + n + ' is divided by ' + d + '?',
      q, d + ' x ' + q + ' = ' + (d*q) + ', which is the closest you can get without passing ' + n + '. The quotient is ' + q + ' and the remainder is ' + r + '.');
  }
  function gBoxesNeeded(){
    const d = ri(4, 9), q = ri(6, 20), r = ri(1, d - 1), n = d*q + r;
    const who = pick(NAMES), item = pick(SNACKS);
    return finishTyped(who + ' packs ' + n + ' ' + item + ' into boxes of ' + d + '. How many boxes are needed to hold all of them?',
      q + 1, n + ' / ' + d + ' = ' + q + ' remainder ' + r + '. The ' + r + ' left over still need a box, so ' + who + ' needs ' + (q+1) + ' boxes.');
  }

  function gMulAlgo(){
    const a = ri(12, 99), b = ri(3, 9);
    return finishTyped(a + ' x ' + b + ' = ?', a*b,
      'Split ' + a + ' into ' + (Math.floor(a/10)*10) + ' + ' + (a%10) + '. ' + (Math.floor(a/10)*10) + ' x ' + b + ' = ' +
      (Math.floor(a/10)*10*b) + ' and ' + (a%10) + ' x ' + b + ' = ' + ((a%10)*b) + '. Add them: ' + (a*b) + '.');
  }
  function gDivAlgo(){
    const d = ri(3, 9), q = ri(20, 120), n = d*q;
    return finishTyped(n + ' / ' + d + ' = ?', q,
      'Ask: ' + d + ' x what = ' + n + '? ' + d + ' x ' + q + ' = ' + n + ', so the answer is ' + q + '.');
  }
  function gTwoStep(){
    const who = pick(NAMES), trays = ri(4, 9), each = ri(12, 30), drop = ri(3, 20);
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
      2:[[gQuotient,'remainder'],[gDivAlgo,'algo']],
      3:[[gBoxesNeeded,'remainder'],[gTwoStep,'word']]
    }
  });
})();
