"use strict";
/* Math Quest Island topic: p5percent (P5). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.41, PERCENTAGE 1): expressing a part of a whole
 * as a percentage; use of %; finding a percentage part of a whole; finding
 * discount, GST and annual interest.
 * NOT here: finding the whole given a part and the percentage, and percentage
 * increase/decrease - both are P6 (p.43).
 * Every answer is a positive whole number (dollars or a percentage), so
 * finishNum keeps the authored distractors and no typed answer carries a
 * trailing-zero decimal.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishNum = G.finishNum, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul'];
  const CLASSY = ['pupils in the class','members of the choir','runners at the CCA trial','children at the void deck'];
  const GOODS = ['a bicycle','a school bag','a badminton racket','a pair of running shoes','a rice cooker'];

  function gPartAsPercent(){
    /* whole x pct must land on a whole number of children: pair them explicitly. */
    const CASES = [[20,[5,10,15,20,25,30,40,50,60,75]],[25,[20,40,60,80]],[50,[10,20,30,40,50,60,70]],
                   [100,[7,12,15,23,30,45,60]],[200,[5,10,15,20,25,35,50]],[500,[4,10,20,30,40,60]]];
    const c = pick(CASES), whole = c[0], pct = pick(c[1]);
    const part = whole * pct / 100;
    const grp = pick(CLASSY);
    return finishTyped('There are ' + whole + ' ' + grp + '. ' + part +
      ' of them wear spectacles. What percentage of them wear spectacles? (answer in %, e.g. 35)', pct,
      part + ' out of ' + whole + ' is ' + part + '/' + whole + '. Multiply by 100 to get a percentage: ' + pct + '%.');
  }
  function gPercentOfWhole(){
    const whole = pick([40, 60, 80, 120, 200, 300, 400]);
    const pct = pick([10, 20, 25, 50, 75]);
    const ans = whole * pct / 100;
    return finishNum(pct + '% of ' + whole + ' = ?', '', ans,
      [whole - ans, Math.round(whole * pct / 10), pct, whole - pct, ans * 2], '',
      pct + '% means ' + pct + ' out of every 100. ' + pct + '/100 x ' + whole + ' = ' + ans + '.');
  }
  function gPercentOfMoney(){
    const whole = pick([50, 80, 120, 150, 200, 250]);
    const pct = pick([10, 20, 30, 40, 60]);
    const ans = whole * pct / 100;
    const who = pick(NAMES);
    return finishTyped(who + ' saves ' + pct + '% of the $' + whole +
      ' collected at the class food sale. How many dollars does ' + who + ' save? (in dollars, e.g. 25)', ans,
      pct + '% of $' + whole + ' is ' + pct + '/100 x ' + whole + ' = $' + ans + '.');
  }
  function gDiscount(){
    const price = pick([40, 60, 80, 120, 150, 200, 250]);
    const pct = pick([10, 20, 25, 50]);
    const off = price * pct / 100;
    const ans = price - off;
    const item = pick(GOODS);
    return finishNum('At a Great Singapore Sale, ' + item + ' costing $' + price + ' has a ' + pct +
      '% discount. What is the price after the discount?', '', ans,
      [off, price, price + off, price - pct, off + pct], 'dollars',
      'The discount is ' + pct + '% of $' + price + ' = $' + off + '. Take it off: $' + price + ' - $' + off + ' = $' + ans + '.');
  }
  function gGst(){
    const price = pick([100, 200, 300, 400, 500, 600, 800]);
    const gst = price * 9 / 100;
    const ans = price + gst;
    const item = pick(GOODS);
    return finishTyped('The price of ' + item + ' before GST is $' + price +
      '. GST is 9%. How many dollars must be paid in total? (in dollars, e.g. 327)', ans,
      'GST is 9% of $' + price + ' = $' + gst + '. Total to pay = $' + price + ' + $' + gst + ' = $' + ans + '.');
  }
  function gInterest(){
    const sum = pick([1000, 2000, 3000, 4000, 5000]);
    const rate = pick([2, 3, 4, 5]);
    const ans = sum * rate / 100;
    const who = pick(NAMES);
    return finishTyped(who + ' puts $' + sum + ' into a POSB account that pays ' + rate +
      '% interest a year. How many dollars of interest is earned in one year? (in dollars, e.g. 60)', ans,
      rate + '% of $' + sum + ' is ' + rate + '/100 x ' + sum + ' = $' + ans + '.');
  }

  MQI.registerTopic({
    id:'p5percent', level:'P5', strand:'Number and Algebra',
    moeSubTopic:"Percentage: expressing a part of a whole as a percentage; use of %; finding a percentage part of a whole; finding discount, GST and annual interest",
    label:'Percent Peak', short:'Percentage', e:'💯',
    skills:{
      express:{label:'Part of a whole as a percentage', tip:'Percent means "out of 100". Ask: how many would it be if there were 100 altogether?'},
      part:   {label:'Percentage part of a whole', tip:'10% is one tenth. Find 10% first, then build the rest from it: 30% is three lots of 10%.'},
      money:  {label:'Discount, GST and interest', tip:'Sale signs and receipts are free practice. Ask your child for the discount before you reach the counter.'}
    },
    pools:{
      1:[[gPercentOfWhole,'part'],[gPartAsPercent,'express']],
      2:[[gPercentOfMoney,'part'],[gDiscount,'money']],
      3:[[gGst,'money'],[gInterest,'money']]
    }
  });
})();
