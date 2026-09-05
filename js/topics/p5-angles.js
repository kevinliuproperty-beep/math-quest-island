"use strict";
/* Math Quest Island topic: angles (P5). Self-contained. All multiple choice.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope limit (MOE Oct 2025, p.42, SUB-STRAND: GEOMETRY, 1. Angles):
 *   1.1 angles on a straight line   1.2 angles at a point
 *   1.3 vertically opposite angles  1.4 finding unknown angles
 *
 * NOT here: angle sum of a triangle and the triangle/quadrilateral properties
 * (MOE p.42 items 2 and 3 - a separate sub-topic, so a separate file); naming
 * and measuring angles and the 8-point compass (P4); anything needing a
 * protractor or a construction line.
 *
 * TWO DELIBERATE CONSTRAINTS, both from the kill list:
 *
 * 1. NO DIAGRAM. The app has no drawing surface and an unlabelled figure is
 *    banned outright, so every configuration is DESCRIBED in words, and the
 *    wording is written to leave exactly one arrangement possible ("side by
 *    side, with no gap", "together they fill the whole turn"). If a stem here
 *    admits two readings it is a defect, not a style note.
 *
 * 2. NO TYPED ANSWERS. MQI.parseTypedAnswer accepts a trailing unit only from
 *    TYPED_UNITS (js/core.js), and "°" is NOT on that list: a child typing
 *    "45°" would be marked WRONG on a correct answer. That is exactly the
 *    money-parseInt kill from the P3 pilot, so this topic is multiple choice
 *    throughout and the degree sign rides on every choice via finishNum's unit
 *    argument, never on the key alone.
 *
 * Every angle drawn is a whole number of degrees and every answer is positive.
 *
 * NO REFLEX ANGLE IN THE TWO ITEMS THAT CARRIED ONE (refutation wound 4). With no
 * figure, a 225° angle in prose is a heavier read than the fact under test, so
 * gAtPointThree bounds its ANSWER below 180 and gPointEqualAngles bounds its GIVEN
 * angle below 180. Both still close exactly on 360.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishNum = G.finishNum;

  const DEG = '°';

  /* finishNum drops a distractor that equals the answer and pads with correct+1
     giveaways. Keep only positive whole angles under 360 that are clearly apart. */
  function clean(correct, list) {
    const out = [];
    for (const c of list) {
      if (c > 0 && c < 360 && Number.isInteger(c) && Math.abs(c - correct) > 3 && !out.includes(c)) out.push(c);
    }
    return out;
  }

  /* ---------- pool 1 ---------- */

  function gStraightLineTwo() {
    const a = ri(20, 160), e = 180 - a;
    const cs = clean(e, [a, 90 - a, 360 - a, 180 + a, a + 90]);
    if (cs.length < 3) return gStraightLineTwo();
    /* Wound 2: "no gap between them" rules out a gap BETWEEN the angles but says
       nothing about the ends, so the pair need not span the line. The completeness
       clause below is the line-family twin of "together they fill the whole turn". */
    return finishNum('Angle a and angle b sit side by side on a straight line, with no gap between them. Angle a is ' +
      a + DEG + '. Together the two angles make the whole straight line. What is angle b?', '', e, cs, DEG,
      'Angles on a straight line add up to 180' + DEG + '. So angle b = 180' + DEG + ' − ' + a +
      DEG + ' = ' + e + DEG + '.');
  }

  function gAtPointThree() {
    const a = ri(60, 150), b = ri(60, 150);
    const e = 360 - a - b;
    /* Wound 4: no reflex ANSWER. This topic has no figure by design, and a 225°
       angle carried in prose alone is a far heavier read than the fact being
       tested. Bounded 20 <= answer < 180, so the answer is always drawable in
       the child's head. The configuration still closes exactly on 360. */
    if (e < 20 || e >= 180) return gAtPointThree();
    /* misconceptions: used 180 instead of 360; forgot one given; added the givens */
    const cs = clean(e, [180 - a - b, 360 - a, 180 - a, a + b, 360 - b]);
    if (cs.length < 3) return gAtPointThree();
    return finishNum('Three angles meet at a point and together they fill the whole turn. Two of them are ' +
      a + DEG + ' and ' + b + DEG + '. What is the third angle?', '', e, cs, DEG,
      'Angles at a point add up to 360' + DEG + '. So the third angle = 360' + DEG + ' − ' + a +
      DEG + ' − ' + b + DEG + ' = ' + e + DEG + '.');
  }

  function gVertOpp() {
    const a = ri(15, 165);
    const cs = clean(a, [180 - a, 360 - a, 90 - a, a + 90, 180 + a]);
    if (cs.length < 3) return gVertOpp();
    return finishNum('Two straight lines cross each other at one point. One of the four angles formed is ' +
      a + DEG + '. What is the angle vertically opposite it?', '', a, cs, DEG,
      'When two straight lines cross, the two angles directly opposite each other are equal. So the angle vertically opposite ' +
      a + DEG + ' is also ' + a + DEG + '.');
  }

  /* ---------- pool 2 ---------- */

  function gVertAdjacent() {
    const a = ri(20, 160), e = 180 - a;
    const cs = clean(e, [a, 360 - a, 90 - a, 180 + a, a + 90]);
    if (cs.length < 3) return gVertAdjacent();
    return finishNum('Two straight lines cross each other at one point. One of the four angles formed is ' +
      a + DEG + '. Angle p is next to it, on the same straight line. What is angle p?', '', e, cs, DEG,
      'The ' + a + DEG + ' angle and angle p sit side by side on a straight line, and angles on a straight line add up to 180' +
      DEG + '. So angle p = 180' + DEG + ' − ' + a + DEG + ' = ' + e + DEG + '.');
  }

  function gStraightLineThree() {
    const a = ri(25, 90), b = ri(25, 90), e = 180 - a - b;
    if (e < 15) return gStraightLineThree();
    const cs = clean(e, [180 - a, 180 - b, a + b, 360 - a - b, 90 - a]);
    if (cs.length < 3) return gStraightLineThree();
    /* Wound 2: completeness clause, same as gStraightLineTwo. */
    return finishNum('Three angles sit side by side on a straight line, with no gaps between them. Two of them are ' +
      a + DEG + ' and ' + b + DEG + '. Together the three angles make the whole straight line. What is the third angle?', '', e, cs, DEG,
      'The three angles together make a straight line, which is 180' + DEG + '. So the third angle = 180' +
      DEG + ' − ' + a + DEG + ' − ' + b + DEG + ' = ' + e + DEG + '.');
  }

  function gAtPointFour() {
    const a = ri(50, 110), b = ri(50, 110), c = ri(50, 110), e = 360 - a - b - c;
    if (e < 20) return gAtPointFour();
    const cs = clean(e, [360 - a - b, 180 - a, a + b + c, 360 - a, 180 + e]);
    if (cs.length < 3) return gAtPointFour();
    return finishNum('Four angles meet at a point and together they fill the whole turn. Three of them are ' +
      a + DEG + ', ' + b + DEG + ' and ' + c + DEG + '. What is the fourth angle?', '', e, cs, DEG,
      'Angles at a point add up to 360' + DEG + '. So the fourth angle = 360' + DEG + ' − ' + a +
      DEG + ' − ' + b + DEG + ' − ' + c + DEG + ' = ' + e + DEG + '.');
  }

  /* ---------- pool 3 ---------- */

  function gRightAngleOnLine() {
    const a = ri(20, 80), e = 90 - a;
    if (e < 8) return gRightAngleOnLine();
    const cs = clean(e, [180 - a, 90 + a, a + 90 - e, 360 - a, 180 - a - a]);
    if (cs.length < 3) return gRightAngleOnLine();
    /* Wound 2: completeness clause, same as the other two line items. */
    return finishNum('Angle x, a right angle and angle y sit side by side on a straight line, with no gaps between them. Angle x is ' +
      a + DEG + '. Together the three angles make the whole straight line. What is angle y?', '', e, cs, DEG,
      'A right angle is 90' + DEG + ' and the three angles make a straight line, which is 180' +
      DEG + '. So angle y = 180' + DEG + ' − 90' + DEG + ' − ' + a + DEG + ' = ' + e + DEG + '.');
  }

  function gTwoStepVertOpp() {
    const a = ri(25, 155), e = 180 - a;
    const cs = clean(e, [a, 360 - a, 90 - a, 180 + a, a + 45]);
    if (cs.length < 3) return gTwoStepVertOpp();
    return finishNum('Two straight lines cross each other at one point. One of the four angles formed is ' +
      a + DEG + '. Angle p is next to that angle on a straight line, and angle q is vertically opposite angle p. What is angle q?',
      '', e, cs, DEG,
      'First, angle p is on a straight line with the ' + a + DEG + ' angle, so angle p = 180' + DEG +
      ' − ' + a + DEG + ' = ' + e + DEG + '. Angle q is vertically opposite angle p, and vertically opposite angles are equal, so angle q = ' +
      e + DEG + '.');
  }

  function gPointEqualAngles() {
    /* Wound 3: the old pool was pick(3 values) x pick(10 values) minus the guard =
       24 distinct stems, and pool 3 draws roughly a third of a 30-question set from
       here, so a child met the same stem repeatedly inside one session. Both n and e
       are now ranges. Wound 4: the GIVEN angle is capped below 180, so no reflex
       angle is ever described in prose in this figure-free topic.
       Arithmetic stays exact: every angle is a whole number by construction and
       known + n x e = 360 closes on the nose. Live pool = 151 distinct stems. */
    const n = ri(3, 6);
    const e = ri(20, 120);
    const known = 360 - n * e;
    if (known < 20 || known >= 180) return gPointEqualAngles();
    const cs = clean(e, [known, 360 - known, known / n, 180 - known, e * n]);
    if (cs.length < 3) return gPointEqualAngles();
    return finishNum('Angles meet at a point and together they fill the whole turn. One of them is ' +
      known + DEG + ', and the other ' + n + ' angles are all equal to one another. What is the size of each equal angle?',
      '', e, cs, DEG,
      'Angles at a point add up to 360' + DEG + '. The ' + n + ' equal angles share 360' + DEG +
      ' − ' + known + DEG + ' = ' + (360 - known) + DEG + ' between them, so each one is ' +
      (360 - known) + DEG + ' ÷ ' + n + ' = ' + e + DEG + '.');
  }

  MQI.registerTopic({
    id: 'angles', level: 'P5', strand: 'Measurement and Geometry',
    moeSubTopic: "Angles: angles on a straight line; angles at a point; vertically opposite angles; finding unknown angles",
    label: 'Angle Ruins', short: 'Angles', e: '🏛️',
    skills: {
      line: { label: 'Angles on a straight line', tip: 'A straight line is a half turn: 180°. Angles filling it with no gaps must add to exactly 180.' },
      point: { label: 'Angles at a point', tip: 'A full turn is 360°. If the angles close all the way round the point, they add to 360.' },
      vert: { label: 'Vertically opposite angles', tip: 'When two straight lines cross, the pair facing each other across the crossing point are equal. The pair beside each other add to 180°.' },
      unknown: { label: 'Finding an unknown angle', tip: 'Name the fact first (line, point, or vertically opposite), then subtract. Two facts chained is still just two subtractions.' }
    },
    pools: {
      1: [[gStraightLineTwo, 'line'], [gAtPointThree, 'point'], [gVertOpp, 'vert']],
      2: [[gVertAdjacent, 'vert'], [gStraightLineThree, 'line'], [gAtPointFour, 'point']],
      3: [[gRightAngleOnLine, 'unknown'], [gTwoStepVertOpp, 'unknown'], [gPointEqualAngles, 'unknown']]
    }
  });
})();
