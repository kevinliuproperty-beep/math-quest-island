"use strict";
/* Math Quest Island topic: p5numbers (P5). Self-contained. Typed answers.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.41, WHOLE NUMBERS 2): multiplying and dividing by
 * 10, 100, 1000 and their multiples; order of operations; use of brackets. All
 * without calculator. Numbers stay within 10 million (P5 1.1 ceiling).
 * NOT here: rounding (P4), factors/multiples (P4), algebra (P6).
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul'];
  const POW = [10, 100, 1000];

  /* --- multiplying / dividing by 10, 100, 1000 --- */
  function gMulPow(){
    const a = ri(12, 999), p = pick(POW);
    const places = String(p).length - 1;
    return finishTyped(a + ' x ' + p + ' = ?', a * p,
      'Multiplying by ' + p + ' shifts every digit ' + places + ' place' +
      (places === 1 ? '' : 's') + ' to the left, so ' + a + ' x ' + p + ' = ' + (a * p) + '.');
  }
  function gDivPow(){
    const q = ri(12, 999), p = pick(POW), n = q * p;
    return finishTyped(n + ' / ' + p + ' = ?', q,
      'Dividing by ' + p + ' shifts every digit back to the right, so ' + n + ' / ' + p + ' = ' + q + '.');
  }
  function gMulMultiple(){
    const a = ri(12, 99), k = ri(2, 9), p = pick(POW);
    return finishTyped(a + ' x ' + (k * p) + ' = ?', a * k * p,
      'Split ' + (k * p) + ' into ' + k + ' x ' + p + '. First ' + a + ' x ' + k + ' = ' + (a * k) +
      ', then x ' + p + ' gives ' + (a * k * p) + '.');
  }
  function gDivMultiple(){
    const q = ri(3, 60), k = ri(2, 9), p = pick(POW), n = q * k * p;
    return finishTyped(n + ' / ' + (k * p) + ' = ?', q,
      'Split ' + (k * p) + ' into ' + p + ' x ' + k + '. First ' + n + ' / ' + p + ' = ' + (n / p) +
      ', then / ' + k + ' gives ' + q + '.');
  }

  /* --- order of operations, then brackets. Every value stays a whole number. --- */
  function gOrderMulAdd(){
    const a = ri(2, 12), b = ri(3, 9), c = ri(3, 9);
    const op = Math.random() < 0.5 ? '+' : '-';
    const prod = b * c;
    const first = op === '-' ? prod + ri(1, 20) : a;
    const expr = op === '-' ? (first + ' - ' + b + ' x ' + c) : (a + ' + ' + b + ' x ' + c);
    const ans = op === '-' ? first - prod : a + prod;
    return finishTyped('Work out: ' + expr + ' = ?', ans,
      'Multiply before you add or subtract: ' + b + ' x ' + c + ' = ' + prod + ', so the answer is ' + ans + '.');
  }
  function gOrderDivAdd(){
    const d = ri(3, 9), q = ri(3, 12), n = d * q, a = ri(4, 40);
    const plus = Math.random() < 0.5;
    const lead = plus ? a : (a + q + ri(1, 15));
    const expr = plus ? (a + ' + ' + n + ' / ' + d) : (lead + ' - ' + n + ' / ' + d);
    const ans = plus ? a + q : lead - q;
    return finishTyped('Work out: ' + expr + ' = ?', ans,
      'Divide before you add or subtract: ' + n + ' / ' + d + ' = ' + q + ', so the answer is ' + ans + '.');
  }
  function gBracketsFirst(){
    const a = ri(2, 12), b = ri(3, 15), c = ri(2, 9);
    const ans = (a + b) * c;
    return finishTyped('Work out: ( ' + a + ' + ' + b + ' ) x ' + c + ' = ?', ans,
      'Brackets first: ' + a + ' + ' + b + ' = ' + (a + b) + '. Then ' + (a + b) + ' x ' + c + ' = ' + ans + '.');
  }
  function gBracketsThreeStep(){
    const c = ri(2, 9), q = ri(3, 12), inner = c * q;
    const a = ri(2, inner - 2), b = inner - a;
    const add = ri(5, 40);
    const ans = inner / c + add;
    return finishTyped('Work out: ( ' + a + ' + ' + b + ' ) / ' + c + ' + ' + add + ' = ?', ans,
      'Brackets first: ' + a + ' + ' + b + ' = ' + inner + '. Then ' + inner + ' / ' + c + ' = ' + q +
      ', and ' + q + ' + ' + add + ' = ' + ans + '.');
  }
  function gWordPow(){
    const who = pick(NAMES), p = pick([100, 1000]), each = ri(12, 95);
    return finishTyped(who + ' orders ' + p + ' packets of kaya toast for the school fun fair. Each packet costs ' +
      each + ' cents. How many cents is that altogether?', each * p,
      each + ' x ' + p + ' = ' + (each * p) + ' cents. Multiplying by ' + p + ' just shifts the digits left.');
  }

  MQI.registerTopic({
    id:'p5numbers', level:'P5', strand:'Number and Algebra',
    moeSubTopic:"Four Operations: multiplying and dividing by 10, 100, 1000 and their multiples without calculator; order of operations without calculator; use of brackets without calculator",
    label:'Ten Million Trench', short:'Big numbers and order of operations', e:'🔟',
    skills:{
      pow:      {label:'Multiply and divide by 10, 100, 1000', tip:'It is a digit shift, not a rule to memorise. Say "every digit moves one place left" while writing it out.'},
      order:    {label:'Order of operations', tip:'x and / are done before + and -. Get your child to circle the x or / part first, then read the sum again.'},
      brackets: {label:'Brackets', tip:'Brackets always go first. Cover the rest of the line with a finger and work out the bracket alone.'}
    },
    pools:{
      1:[[gMulPow,'pow'],[gDivPow,'pow'],[gOrderMulAdd,'order']],
      2:[[gMulMultiple,'pow'],[gOrderDivAdd,'order'],[gBracketsFirst,'brackets']],
      3:[[gDivMultiple,'pow'],[gBracketsThreeStep,'brackets'],[gWordPow,'pow']]
    }
  });
})();
