"use strict";
/* Math Quest Island topic: p3measure (P3). Self-contained. MC, unit-bearing.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.36): compound units and conversion between a
 * compound measurement and the smaller unit, for km/m, m/cm, kg/g and l/ml ONLY,
 * with "numbers involved within easy manipulation". No decimals (that is P4),
 * no area/volume units, no cm2/m2 conversion.
 * Unit convention: finishNum's unit argument appends the unit to EVERY choice.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishNum = G.finishNum;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul'];
  /* [big unit, small unit, factor] - the four pairs the syllabus names */
  const PAIRS = [['km','m',1000], ['m','cm',100], ['kg','g',1000], ['ℓ','ml',1000]];

  function gToSmallEasy(){
    const [B, S, f] = pick(PAIRS);
    const big = ri(2, 9), small = f === 100 ? ri(10, 99) : ri(100, 900);
    const total = big*f + small;
    const squash = Number(String(big) + String(small));
    return finishNum(big + ' ' + B + ' ' + small + ' ' + S + ' = ?', '', total,
      [squash, big + small, big*f, total + f], S,
      big + ' ' + B + ' = ' + (big*f) + ' ' + S + '. Add the extra ' + small + ' ' + S + ': ' + (big*f) + ' + ' + small + ' = ' + total + ' ' + S + '.');
  }
  function gToSmallZero(){
    /* the classic trap: 5 km 40 m is 5040 m, not 540 m */
    const [B, S, f] = pick(PAIRS);
    const big = ri(2, 9), small = f === 100 ? ri(1, 9) : ri(5, 95);
    const total = big*f + small;
    const squash = Number(String(big) + String(small));
    return finishNum(big + ' ' + B + ' ' + small + ' ' + S + ' = ?', '', total,
      [squash, big*f, total + f, big*f + small*10], S,
      'The ' + small + ' ' + S + ' is small, so a zero has to hold the empty place: ' + big + ' ' + B + ' = ' + (big*f) +
      ' ' + S + ', and ' + (big*f) + ' + ' + small + ' = ' + total + ' ' + S + '.');
  }
  function gToCompoundSmall(){
    const [B, S, f] = pick(PAIRS);
    const big = ri(2, 9), small = f === 100 ? ri(11, 99) : ri(105, 950);
    const total = big*f + small;
    return finishNum(total + ' ' + S + ' = ' + big + ' ' + B + ' ? ' + S, '', small,
      [total - big, big*f - small, small*10, total], S,
      big + ' ' + B + ' is ' + (big*f) + ' ' + S + ', so the leftover is ' + total + ' - ' + (big*f) + ' = ' + small + ' ' + S + '.');
  }
  function gToCompoundBig(){
    const [B, S, f] = pick(PAIRS);
    const big = ri(2, 9), small = f === 100 ? ri(11, 99) : ri(105, 950);
    const total = big*f + small;
    return finishNum(total + ' ' + S + ' = ? ' + B + ' ' + small + ' ' + S, '', big,
      [big + 1, big*10, total - small, big + 10], B,
      'Take away the ' + small + ' ' + S + ' first: ' + total + ' - ' + small + ' = ' + (big*f) + ' ' + S + ', and ' + (big*f) + ' ' + S + ' = ' + big + ' ' + B + '.');
  }
  function gWordLeft(){
    const [B, S, f] = pick([PAIRS[3], PAIRS[2]]);   /* litres/ml or kg/g */
    const who = pick(NAMES);
    const big = ri(1, 4), small = f === 100 ? ri(10, 90) : ri(100, 800);
    const total = big*f + small;
    const used = ri(50, Math.min(900, total - 50));
    const noun = S === 'ml' ? 'of bandung' : 'of rice';
    const verb = S === 'ml' ? 'drinks' : 'cooks';
    return finishNum(who + ' has a container holding ' + big + ' ' + B + ' ' + small + ' ' + S + ' ' + noun +
      ', then ' + verb + ' ' + used + ' ' + S + '. How much is left?', '', total - used,
      [total + used, big*f - used, total - used + f, Number(String(big)+String(small)) - used].filter(x => x > 0), S,
      big + ' ' + B + ' ' + small + ' ' + S + ' = ' + total + ' ' + S + '. Then ' + total + ' - ' + used + ' = ' + (total - used) + ' ' + S + '.');
  }
  function gWordCompare(){
    const [B, S, f] = pick([PAIRS[2], PAIRS[0], PAIRS[1]]);
    const who = pick(NAMES);
    let other = pick(NAMES); while (other === who) other = pick(NAMES);
    const bigA = S === 'g' ? ri(2, 4) : ri(2, 6);          /* a 4 kg durian is already a big one */
    const smallA = f === 100 ? ri(20, 95) : ri(200, 900);
    const bigB = ri(1, bigA - 1), smallB = f === 100 ? ri(5, 90) : ri(50, 900);
    const a = bigA*f + smallA, b = bigB*f + smallB;
    const noun = S === 'g' ? 'durian' : (S === 'm' ? 'walk to the MRT station' : 'ribbon');
    const verb = S === 'g' ? 'weighs' : 'measures';
    const adj  = S === 'g' ? 'heavier' : 'longer';
    return finishNum(who + "'s " + noun + ' ' + verb + ' ' + bigA + ' ' + B + ' ' + smallA + ' ' + S + ' and ' + other + "'s " + verb + ' ' +
      bigB + ' ' + B + ' ' + smallB + ' ' + S + '. How much ' + adj + ' is ' + who + "'s?", '', a - b,
      [a + b, (bigA - bigB)*f, Math.abs(smallA - smallB), a - b + f], S,
      'Change both to ' + S + ' first: ' + a + ' ' + S + ' and ' + b + ' ' + S + '. Then ' + a + ' - ' + b + ' = ' + (a - b) + ' ' + S + '.');
  }

  MQI.registerTopic({
    id:'p3measure', level:'P3', strand:'Measurement and Geometry',
    moeSubTopic:"Length, Mass and Volume: measuring length/mass/volume (of liquid) in compound units; converting a measurement in compound units to the smaller unit, and vice versa",
    label:'Compound Cove', short:'Compound units', e:'📏',
    skills:{
      tosmall:   {label:'Compound to smaller unit', tip:'1 km = 1000 m, 1 m = 100 cm, 1 kg = 1000 g, 1 litre = 1000 ml. Chant the four, they cover everything at P3.'},
      tocompound:{label:'Smaller unit to compound', tip:'Read the number backwards: 3250 g splits into 3 kg and the 250 g left over.'},
      word:      {label:'Measurement word problems', tip:'Convert to the smaller unit first, then add or subtract. Mixing units is where marks are lost.'}
    },
    pools:{
      1:[[gToSmallEasy,'tosmall'],[gToCompoundSmall,'tocompound']],
      2:[[gToCompoundBig,'tocompound'],[gWordLeft,'word']],
      3:[[gToSmallZero,'tosmall'],[gWordCompare,'word']]
    }
  });
})();
