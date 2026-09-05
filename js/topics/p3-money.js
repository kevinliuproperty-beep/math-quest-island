"use strict";
/* Math Quest Island topic: p3money (P3). Self-contained. Typed, unit-bearing.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.35): adding and subtracting money in decimal
 * notation ONLY. No multiplication or division of money (that is P4 decimals),
 * amounts kept under $100, answers never negative.
 * Unit convention: the unit lives in the QUESTION STEM ("in dollars, e.g. 4.75")
 * and the typed answer is a bare number, per js/topics/README.md.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishTyped = G.finishTyped;

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

  function gAddTwo(){
    const who = pick(NAMES), a = cents(120, 590);
    const b = cents(80, 450);
    const t = a + b;
    return finishTyped(who + ' spends ' + money(a) + ' on ' + pick(MEALS) + ' and ' + money(b) + ' on ' +
      pick(CHEAP) + ' at ' + pick(STALLS) + '. How much does ' + who + ' spend in total? (in dollars, e.g. 4.75)',
      dollars(t),
      'Line up the dollars with the dollars and the cents with the cents: ' + money(a) + ' + ' + money(b) + ' = ' + money(t) + '.');
  }
  function gAddBig(){
    const who = pick(NAMES), a = cents(850, 2900);
    const b = cents(650, 2400);
    const t = a + b;
    return finishTyped(who + ' spends ' + money(a) + ' on ' + pick(BIG) + ' and ' + money(b) + ' on ' +
      pick(MEALS) + ' at ' + pick(STALLS) + '. How much is spent in total? (in dollars, e.g. 14.75)',
      dollars(t),
      'Add the cents first: they make ' + ((a%100)+(b%100)) + ' cents' +
      (((a%100)+(b%100)) >= 100 ? ', which is over a dollar, so carry 1 to the dollars. ' : '. ') +
      money(a) + ' + ' + money(b) + ' = ' + money(t) + '.');
  }
  function gAddThree(){
    const who = pick(NAMES), a = cents(150, 700), b = cents(120, 600);
    const c = cents(90, 500);
    const t = a + b + c;
    return finishTyped(who + ' buys ' + pick(MEALS) + ' for ' + money(a) + ', ' + pick(CHEAP) + ' for ' + money(b) +
      ' and ' + pick(CHEAP) + ' for ' + money(c) + ' at ' + pick(STALLS) +
      '. How much does the food cost in total? (in dollars, e.g. 9.85)',
      dollars(t),
      'Add two at a time: ' + money(a) + ' + ' + money(b) + ' = ' + money(a+b) + ', then ' + money(a+b) + ' + ' + money(c) + ' = ' + money(t) + '.');
  }
  function gSubSmall(){
    const who = pick(NAMES), have = cents(600, 990);
    const spend = cents(150, 550);
    const left = have - spend;
    return finishTyped(who + ' has ' + money(have) + '. ' + who + ' buys ' + pick(CHEAP) + ' for ' + money(spend) +
      ' at ' + pick(STALLS) + '. How much money is left? (in dollars, e.g. 2.35)',
      dollars(left),
      money(have) + ' - ' + money(spend) + ' = ' + money(left) + '. Subtract the cents first, then the dollars.');
  }
  function gSubBorrow(){
    const who = pick(NAMES), spend = cents(1250, 4400), left = cents(120, 900);
    const have = spend + left;
    return finishTyped(who + ' has ' + money(have) + '. ' + who + ' pays ' + money(spend) + ' for ' + pick(BIG) +
      ' at ' + pick(STALLS) + '. How much money is left? (in dollars, e.g. 6.45)',
      dollars(left),
      'Change one dollar into 100 cents if the cents will not subtract: ' + money(have) + ' - ' + money(spend) + ' = ' + money(left) + '.');
  }
  function gChange(){
    const who = pick(NAMES), b = cents(120, 640);
    const a = cents(180, 780);
    const note = pick([1000, 2000, 5000]);
    const given = (a + b) < note ? note : 5000;
    const chg = given - a - b;
    return finishTyped(who + ' buys ' + pick(MEALS) + ' for ' + money(a) + ' and ' + pick(CHEAP) + ' for ' + money(b) +
      ' at ' + pick(STALLS) + ', then hands the stallholder ' + money(given) +
      '. How much change should ' + who + ' get? (in dollars, e.g. 3.15)',
      dollars(chg),
      'First find the cost: ' + money(a) + ' + ' + money(b) + ' = ' + money(a+b) + '. Then ' + money(given) + ' - ' + money(a+b) + ' = ' + money(chg) + '.');
  }

  MQI.registerTopic({
    id:'p3money', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Money: adding and subtracting money in decimal notation",
    label:'Hawker Coins', short:'Money', e:'💵',
    skills:{
      add:   {label:'Adding money',   tip:'At the hawker centre, let your child add the two stall prices before you pay.'},
      sub:   {label:'Subtracting money', tip:'Cents will not subtract? Change one dollar into 100 cents, the same as borrowing a ten.'},
      change:{label:'Working out change', tip:'Two steps: total the items first, then take that away from the note handed over.'}
    },
    pools:{
      1:[[gAddTwo,'add'],[gSubSmall,'sub']],
      2:[[gAddBig,'add'],[gSubBorrow,'sub']],
      3:[[gChange,'change'],[gAddThree,'add']]
    }
  });
})();
