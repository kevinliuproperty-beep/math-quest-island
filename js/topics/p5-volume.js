"use strict";
/* Math Quest Island topic: p5volume (P5). Self-contained. MC + typed.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.42, AREA AND VOLUME 2): measuring volume in
 * cubic units cm3/m3 EXCLUDING conversion between cm3 and m3; volume of a
 * cube/cuboid; volume of liquid in a rectangular tank; relationship between
 * litres (or ml) and cm3.
 * NOT here: finding one dimension given the volume, or the edge of a cube given
 * its volume - both are P6 (p.44). Drawing on an isometric grid needs a drawing
 * surface the app does not have.
 * All answers are positive whole numbers, so finishNum keeps the authored
 * distractors (rubric lesson 4) and no typed answer is a decimal.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishNum = G.finishNum, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul'];

  /* No authored distractor may collapse onto the correct answer: finishNum drops it
     silently and pads with correct+1 giveaways. Filter, and redraw if fewer than 3
     real misconceptions survive (6 x s² equals s³ at s = 6, for instance). */
  function clean(correct, list){
    const out = [];
    for (const c of list) if (c > 0 && Number.isInteger(c) && Math.abs(c - correct) > 3 && !out.includes(c)) out.push(c);
    return out;
  }

  function gCubeVolume(){
    const s = ri(2, 12), v = s * s * s;
    const cs = clean(v, [s * s, 6 * s * s, 3 * s, 12 * s, s + s + s + s]);
    if (cs.length < 3) return gCubeVolume();
    return finishNum('A cube has edges of ' + s + ' cm. What is its volume?', '', v, cs, 'cm³',
      'Volume of a cube = edge x edge x edge = ' + s + ' x ' + s + ' x ' + s + ' = ' + v + ' cm³.');
  }
  function gCuboidVolume(){
    const l = ri(3, 15), w = ri(2, 12), h = ri(2, 10), v = l * w * h;
    const cs = clean(v, [l * w, l + w + h, 2 * (l * w + w * h + l * h), l * w + h, w * h]);
    if (cs.length < 3) return gCuboidVolume();
    return finishNum('A cuboid measures ' + l + ' cm by ' + w + ' cm by ' + h +
      ' cm. What is its volume?', '', v, cs, 'cm³',
      'Volume of a cuboid = length x breadth x height = ' + l + ' x ' + w + ' x ' + h + ' = ' + v + ' cm³.');
  }
  function gUnitCubes(){
    const l = ri(2, 8), w = ri(2, 6), h = ri(2, 5), n = l * w * h;
    const who = pick(NAMES);
    return finishTyped(who + ' builds a solid ' + l + ' cubes long, ' + w + ' cubes wide and ' + h +
      ' cubes high from 1 cm cubes. How many unit cubes are used?', n,
      'Each layer uses ' + l + ' x ' + w + ' = ' + (l * w) + ' cubes and there are ' + h + ' layers, so ' +
      (l * w) + ' x ' + h + ' = ' + n + ' cubes.');
  }
  function gLitresToCm3(){
    /* ml was banded 11-99, so a round "3 l 500 ml" could never appear even though
       it is the commonest compound a child meets. P5 refutation fix 5. */
    const l = ri(1, 9), ml = pick([ri(1, 9) * 10 + ri(1, 9), ri(1, 9) * 100, ri(1, 99) * 10, ri(2, 999)]);
    const v = l * 1000 + ml;
    return finishTyped(l + ' ℓ ' + ml + ' ml of barley water is poured into a tank. How many cm³ is that? (1 ml = 1 cm³)', v,
      '1 ml is exactly 1 cm³, and 1 ℓ = 1000 ml. So ' + l + ' ℓ ' + ml + ' ml = ' + v + ' ml = ' + v + ' cm³.');
  }
  function gTankLiquid(){
    const l = pick([10, 15, 20, 25, 30]), w = pick([10, 12, 20, 25]), d = ri(2, 12);
    const cm3 = l * w * d;
    return finishTyped('A rectangular tank has a base ' + l + ' cm by ' + w + ' cm. Water is poured in to a depth of ' +
      d + ' cm. What is the volume of the water, in cm³?', cm3,
      'The water is a cuboid: ' + l + ' x ' + w + ' x ' + d + ' = ' + cm3 + ' cm³.');
  }
  function gTankLitres(){
    const l = pick([10, 20, 25, 50]), w = pick([10, 20, 40]), d = ri(2, 12);
    const cm3 = l * w * d;
    const who = pick(NAMES);
    return finishTyped(who + ' fills a rectangular tank with a base ' + l + ' cm by ' + w +
      ' cm to a depth of ' + d + ' cm. How many millilitres of water is that? (1 cm³ = 1 ml)', cm3,
      'Volume = ' + l + ' x ' + w + ' x ' + d + ' = ' + cm3 + ' cm³, and 1 cm³ = 1 ml, so it is ' + cm3 + ' ml.');
  }

  MQI.registerTopic({
    id:'p5volume', level:'P5', strand:'Measurement and Geometry',
    moeSubTopic:"Volume of Cube and Cuboid: building solids with unit cubes; measuring volume in cubic units, cm3/m3, excluding conversion between cm3 and m3; volume of a cube/cuboid; finding the volume of liquid in a rectangular tank; relationship between ℓ (or ml) with cm3",
    label:'Cuboid Quarry', short:'Volume of cube and cuboid', e:'🧊',
    skills:{
      solid: {label:'Volume of a cube and cuboid', tip:'Count one layer first, then multiply by the number of layers. That is where length x breadth x height comes from.'},
      tank:  {label:'Volume of liquid in a tank', tip:'The water is just a shorter cuboid. Use the depth of the water, not the height of the tank.'},
      units: {label:'Litres, millilitres and cm³', tip:'1 ml is exactly 1 cm³ and 1 litre is 1000 cm³. A 1.5 ℓ bottle holds 1500 cm³.'}
    },
    pools:{
      1:[[gCubeVolume,'solid'],[gUnitCubes,'solid'],[gLitresToCm3,'units']],
      2:[[gCuboidVolume,'solid'],[gLitresToCm3,'units']],
      3:[[gTankLiquid,'tank'],[gTankLitres,'units']]
    }
  });
})();
