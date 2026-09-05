"use strict";
/* Math Quest Island topic: p5triangle (P5). Self-contained. MC + typed.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.42, AREA AND VOLUME 1): concepts of base and
 * height of a triangle; area of triangle; area of composite figures made up of
 * rectangles, squares and triangles.
 * NOT here: circles, semicircles and quarter circles (P6, p.44).
 * Every base is even, so every area is a whole number and finishNum keeps the
 * authored distractors (rubric lesson 4). No generator renders a figure, so
 * typed answers stay legal (rubric lesson 1: finishTyped cannot carry extra).
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishNum = G.finishNum, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul'];

  function gAreaBasic(){
    const b = 2 * ri(2, 12), h = ri(3, 15), a = b * h / 2;
    return finishNum('A triangle has a base of ' + b + ' cm and a height of ' + h +
      ' cm. What is its area?', '', a,
      [b * h, b + h, a + b, b * h + 1, a * 2 + 1], 'cm²',
      'Area of a triangle = 1/2 x base x height = 1/2 x ' + b + ' x ' + h + ' = ' + a + ' cm².');
  }
  function gAreaBigger(){
    const b = 2 * ri(6, 25), h = ri(8, 30), a = b * h / 2;
    return finishTyped('A triangle has a base of ' + b + ' cm and a height of ' + h +
      ' cm. What is its area, in cm²? (a whole number, e.g. 48)', a,
      '1/2 x ' + b + ' x ' + h + ' = ' + a + ' cm². Halve one of the two numbers first if that is easier.');
  }
  function gFindBase(){
    const b = 2 * ri(3, 15), h = ri(4, 20), a = b * h / 2;
    return finishTyped('A triangle has an area of ' + a + ' cm² and a height of ' + h +
      ' cm. What is the length of its base, in cm?', b,
      'Area = 1/2 x base x height, so base = 2 x area / height = 2 x ' + a + ' / ' + h + ' = ' + b + ' cm.');
  }
  function gFindHeight(){
    const b = 2 * ri(3, 15), h = ri(4, 20), a = b * h / 2;
    return finishTyped('A triangle has an area of ' + a + ' cm² and a base of ' + b +
      ' cm. What is its height, in cm?', h,
      'Area = 1/2 x base x height, so height = 2 x area / base = 2 x ' + a + ' / ' + b + ' = ' + h + ' cm.');
  }
  function gHalfRectangle(){
    const L = 2 * ri(4, 15), W = ri(4, 15), a = L * W / 2;
    const who = pick(NAMES);
    return finishNum(who + ' cuts a rectangular piece of kite paper ' + L + ' cm long and ' + W +
      ' cm wide in half along a diagonal. What is the area of one triangle?', '', a,
      [L * W, 2 * (L + W), L + W, a + W, L * W + W], 'cm²',
      'The rectangle has an area of ' + L + ' x ' + W + ' = ' + (L * W) +
      ' cm². The diagonal cuts it into two equal triangles, so one triangle is ' + a + ' cm².');
  }
  function gComposite(){
    const L = ri(6, 20), W = ri(4, 14), b = 2 * ri(2, 8), h = ri(3, 12);
    const rect = L * W, tri = b * h / 2, a = rect + tri;
    return finishTyped('A composite figure is made of a rectangle ' + L + ' cm by ' + W +
      ' cm with a triangle of base ' + b + ' cm and height ' + h +
      ' cm joined on. What is the total area, in cm²?', a,
      'Rectangle: ' + L + ' x ' + W + ' = ' + rect + ' cm². Triangle: 1/2 x ' + b + ' x ' + h + ' = ' + tri +
      ' cm². Add them: ' + rect + ' + ' + tri + ' = ' + a + ' cm².');
  }

  MQI.registerTopic({
    id:'p5triangle', level:'P5', strand:'Measurement and Geometry',
    moeSubTopic:"Area of Triangle: concepts of base and height of a triangle; area of triangle; finding the area of composite figures made up of rectangles, squares and triangles",
    label:'Triangle Terrace', short:'Area of triangle', e:'📐',
    skills:{
      area:  {label:'Area of a triangle', tip:'A triangle is always half of the rectangle around it. Draw the rectangle and halve it.'},
      unknown:{label:'Finding a missing base or height', tip:'Work backwards: double the area first, then divide by the side you know.'},
      comp:  {label:'Composite figures', tip:'Cut the shape into a rectangle and a triangle, work out each area, then add.'}
    },
    pools:{
      1:[[gAreaBasic,'area'],[gHalfRectangle,'area']],
      2:[[gAreaBigger,'area'],[gFindBase,'unknown']],
      3:[[gFindHeight,'unknown'],[gComposite,'comp']]
    }
  });
})();
