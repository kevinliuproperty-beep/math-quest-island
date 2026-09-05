"use strict";
/* Math Quest Island topic: p3numbers (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 * Scope limit (MOE Oct 2025, p.35): numbers up to 10 000 only. No rounding
 * (that is P4 1.5), no numbers past 9999, no negative results.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Mei Ling'];
  const PLACES = ['thousands','hundreds','tens','ones'];

  /* four distinct non-zero digits -> a 4-digit number with no repeated digit */
  function digits4(){ return shuffle([1,2,3,4,5,6,7,8,9]).slice(0,4); }
  function numOf(d){ return d[0]*1000 + d[1]*100 + d[2]*10 + d[3]; }

  function standsFor(posLo, posHi){
    const d = digits4(), n = numOf(d), p = ri(posLo, posHi), dig = d[p];
    const val = dig * Math.pow(10, 3 - p);
    return finishNum('In ' + n + ', the digit ' + dig + ' stands for how much?', '', val,
      [dig, dig*10, dig*100, dig*1000], '',
      'The ' + dig + ' sits in the ' + PLACES[p] + ' place, so it stands for ' +
      dig + ' x ' + Math.pow(10, 3 - p) + ' = ' + val + '.');
  }
  function gStandsEasy(){ return standsFor(1, 2); }   /* hundreds or tens */
  function gStandsHard(){ return standsFor(0, 3); }   /* any place, thousands included */

  function gWhichDigit(){
    const d = digits4(), n = numOf(d), p = ri(0,3);
    return finishNum('Which digit is in the ' + PLACES[p] + ' place of ' + n + '?', '', d[p],
      [d[(p+1)%4], d[(p+2)%4], d[(p+3)%4]], '',
      'Reading from the left: ' + d.join(', ') + '. The ' + PLACES[p] + ' digit is ' + d[p] + '.');
  }

  function gBuildNum(){
    /* zero-in-the-middle trap: 4 thousands, 0 hundreds, 7 tens, 6 ones = 4076 */
    const th = ri(1,9), zeroAt = pick([1,2]);
    const h = zeroAt === 1 ? 0 : ri(1,9);
    const t = zeroAt === 2 ? 0 : ri(1,9);
    const o = ri(1,9);
    const n = th*1000 + h*100 + t*10 + o;
    const squashed = Number(String(th) + (h?String(h):'') + (t?String(t):'') + String(o));
    return finishNum('Which number has ' + th + ' thousands, ' + h + ' hundreds, ' + t + ' tens and ' + o + ' ones?',
      '', n, [squashed, n + 100, n - (h?100:10)*0 + 9, th*1000 + o*100 + t*10 + h], '',
      th + ' thousands = ' + (th*1000) + ', ' + h + ' hundreds = ' + (h*100) + ', ' + t + ' tens = ' + (t*10) +
      ', ' + o + ' ones = ' + o + '. Add them: ' + n + '. A zero still needs to hold its place.');
  }

  function gGreatest(){
    const set = [];
    while (set.length < 4){ const n = ri(1000, 9999); if (!set.includes(n)) set.push(n); }
    const best = Math.max(...set);
    return finishNum('Which number is the greatest?', '', best, set.filter(x => x !== best), '',
      'Compare the thousands digit first, then hundreds, then tens, then ones. ' + best + ' is the greatest.');
  }
  function gSmallest(){
    /* same thousands digit, so the child must read past the first digit */
    const th = ri(1,9)*1000, set = [];
    while (set.length < 4){ const n = th + ri(0, 999); if (!set.includes(n)) set.push(n); }
    const worst = Math.min(...set);
    return finishNum('Which number is the smallest?', '', worst, set.filter(x => x !== worst), '',
      'All four start with the same thousands digit, so compare the hundreds next. ' + worst + ' is the smallest.');
  }
  function gMoreLess(){
    const step = pick([10, 100, 1000]);
    const dir = pick(['more','less']);
    const n = dir === 'more' ? ri(1000, 9999 - step) : ri(1000 + step, 9999);
    const ans = dir === 'more' ? n + step : n - step;
    return finishNum('What number is ' + step + ' ' + dir + ' than ' + n + '?', '', ans,
      [dir === 'more' ? n + step*10 : n - step*10, dir === 'more' ? n + step/10 : n - step/10, n, ans + step].filter(Number.isInteger),
      '', n + ' ' + (dir === 'more' ? '+ ' : '- ') + step + ' = ' + ans + '. Watch the digits that roll over.');
  }

  MQI.registerTopic({
    id:'p3numbers', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Numbers up to 10 000: number notation, representations and place values (thousands, hundreds, tens, ones); comparing and ordering numbers",
    label:'Thousand Isles', short:'Numbers to 10 000', e:'🏝️',
    skills:{
      place:  {label:'Place value',        tip:'Say the number out loud in parts: "four thousand, no hundreds, seven tens, six ones". The zero is the part children drop.'},
      compare:{label:'Comparing numbers',  tip:'Compare left to right, one place at a time. Stop at the first place where the digits differ.'}
    },
    pools:{
      1:[[gStandsEasy,'place'],[gGreatest,'compare']],
      2:[[gWhichDigit,'place'],[gSmallest,'compare']],
      3:[[gBuildNum,'place'],[gStandsHard,'place'],[gMoreLess,'compare']]
    }
  });
})();
