"use strict";
/* Math Quest Island topic: triangles and four-sided figures (P5). Self-contained.
 * All multiple choice. Authoring rules + registration shape: js/topics/README.md
 *
 * Scope limit (MOE Oct 2025, p.42, PRIMARY FIVE, MEASUREMENT AND GEOMETRY,
 * SUB-STRAND: GEOMETRY):
 *   2. Triangle
 *     2.1 properties of isosceles / equilateral / right-angled triangle
 *     2.2 angle sum of a triangle
 *     2.3 finding unknown angles without additional construction of lines
 *   3. Parallelogram, Rhombus and Trapezium
 *     3.1 properties of parallelogram / rhombus / trapezium
 *     3.2 finding unknown angles without additional construction of lines
 *
 * Item 1 on the same page (angles on a straight line, at a point, vertically
 * opposite) is a DIFFERENT sub-topic and lives in js/topics/p5-angles.js. It is
 * used here only inside the pool-3 composite items, where the straight line is a
 * given in the stem, never a construction the child has to invent - 2.3 and 3.2
 * both say "without additional construction of lines" and that clamp is binding.
 *
 * NOT here: properties of rectangle and square (MOE p.39, PRIMARY FOUR item 2),
 * area of a triangle (p.42, a different sub-strand, already live as p5triangle),
 * anything needing a protractor, and every P6 fact.
 *
 * CONSTRAINTS INHERITED FROM THE KILL LIST:
 *
 * 1. NO DIAGRAM. A rendered figure is banned unless every given angle is labelled
 *    and the unknown marked, and there is no drawing surface, so every figure is
 *    DESCRIBED in words. Every given angle is named AND valued, there is exactly
 *    one unknown, and the vertex order (ABCD round the shape) is stated wherever a
 *    child could otherwise pair the wrong two vertices.
 *
 * 2. MULTIPLE CHOICE, with the degree sign on EVERY choice via finishNum's unit
 *    argument, never on the key alone. gImpossibleTriangle chooses between angle
 *    SETS, so it uses the local finishText below (same shape contract).
 *
 * 3. EVERY FIGURE IS CONSTRUCTIBLE. Guards keep every angle a positive whole
 *    number, every triangle's three angles strictly below 180 and summing to
 *    exactly 180, and every quadrilateral's four angles summing to exactly 360.
 *
 * The classic misconceptions are the distractors on purpose: subtracting from 360
 * instead of 180 in a triangle, forgetting that the two base angles of an isosceles
 * triangle are BOTH equal, forgetting to halve after taking the apex off 180, and
 * reading an adjacent angle of a parallelogram as an opposite one.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

  const DEG = '°';

  const TRIS = [['A', 'B', 'C'], ['P', 'Q', 'R'], ['X', 'Y', 'Z'], ['D', 'E', 'F'],
                ['K', 'L', 'M'], ['R', 'S', 'T'], ['J', 'K', 'L'], ['M', 'N', 'P']];
  const QUADS = [['A', 'B', 'C', 'D'], ['P', 'Q', 'R', 'S'], ['W', 'X', 'Y', 'Z'],
                 ['K', 'L', 'M', 'N'], ['E', 'F', 'G', 'H'], ['J', 'K', 'L', 'M']];

  /* Text-choice finisher for the "which set cannot be" item. Local, per the
     self-containment rule. Same contract as finishNum: 4 distinct choices,
     correct index in range, answerText === choices[correct]. */
  function finishText(qHtml, correct, cands, explain) {
    const opts = [correct];
    for (const c of shuffle(cands.slice())) {
      if (opts.length >= 4) break;
      if (c && !opts.includes(c)) opts.push(c);
    }
    if (opts.length < 4) return null;
    const order = shuffle(opts.map((_, i) => i));
    return { q: qHtml, extra: '', choices: order.map(i => opts[i]), correct: order.indexOf(0),
             explain, answerText: correct };
  }

  /* Positive whole angles under 180, clearly apart from the key. */
  function clean(correct, list) {
    const out = [];
    for (const c of list) {
      if (c > 0 && c < 180 && Number.isInteger(c) && Math.abs(c - correct) > 3 && !out.includes(c)) out.push(c);
    }
    return out;
  }

  /* ---------- pool 1 ---------- */

  /* 2.2 angle sum. Distractor 1 is the classic 360 subtraction. */
  function gTriangleThird() {
    const t = pick(TRIS);
    const a = ri(25, 90), b = ri(25, 90), e = 180 - a - b;
    if (e < 20 || e === a || e === b) return gTriangleThird();
    const cs = clean(e, [360 - a - b, 180 - a, 180 - b, a + b, 90 - Math.min(a, b)]);
    if (cs.length < 3) return gTriangleThird();
    return finishNum('In triangle ' + t.join('') + ', ∠' + t[0] + ' = ' + a + DEG + ' and ∠' + t[1] +
      ' = ' + b + DEG + '. What is the size of ∠' + t[2] + '?', '', e, cs, DEG,
      'The three angles of a triangle add up to 180' + DEG + '. So ∠' + t[2] + ' = 180' + DEG +
      ' − ' + a + DEG + ' − ' + b + DEG + ' = ' + e + DEG + '.');
  }

  /* 2.1 equilateral. */
  function gEquilateral() {
    const t = pick(TRIS);
    const which = ri(0, 2);
    const cs = clean(60, [90, 45, 120, 30, 100, 80]);
    return finishNum('Triangle ' + t.join('') + ' is an equilateral triangle. What is the size of ∠' +
      t[which] + '?', '', 60, cs, DEG,
      'All three sides of an equilateral triangle are equal, so all three angles are equal too. They add up to 180' +
      DEG + ', so each one is 180' + DEG + ' ÷ 3 = 60' + DEG + '.');
  }

  /* 3.1 parallelogram, opposite angles. */
  function gParallelogramOpp() {
    const q = pick(QUADS);
    const i = ri(0, 3), o = (i + 2) % 4;
    const a = pick([ri(35, 85), ri(95, 145)]);
    const cs = clean(a, [180 - a, 360 - a, 90, 180 - a + 10]);
    if (cs.length < 3) return gParallelogramOpp();
    return finishNum(q.join('') + ' is a parallelogram, with the four corners in the order ' + q.join(', ') +
      ' round the shape. ∠' + q[i] + ' = ' + a + DEG + '. What is the size of ∠' + q[o] +
      ', the angle at the opposite corner?', '', a, cs, DEG,
      'In a parallelogram the angles at opposite corners are equal. ∠' + q[o] + ' is opposite ∠' +
      q[i] + ', so ∠' + q[o] + ' = ' + a + DEG + '.');
  }

  /* ---------- pool 2 ---------- */

  /* 2.1 isosceles, base angle given: the child must supply the SECOND base angle. */
  function gIsoscelesBase() {
    const t = pick(TRIS), A = t[0], B = t[1], C = t[2];
    const b = ri(35, 80), e = 180 - 2 * b;
    if (e < 20 || e === b) return gIsoscelesBase();
    /* distractor 1 = forgot the base angles are a PAIR (took b off 180 once) */
    const cs = clean(e, [180 - b, 360 - 2 * b, b, 90 - b, 2 * b]);
    if (cs.length < 3) return gIsoscelesBase();
    return finishNum('In triangle ' + t.join('') + ', ' + A + B + ' = ' + A + C + ' and ∠' + B +
      ' = ' + b + DEG + '. What is the size of ∠' + A + '?', '', e, cs, DEG,
      'The two sides ' + A + B + ' and ' + A + C + ' are equal, so the two angles facing them are equal: ∠' +
      C + ' = ∠' + B + ' = ' + b + DEG + '. The three angles add up to 180' + DEG + ', so ∠' + A +
      ' = 180' + DEG + ' − ' + b + DEG + ' − ' + b + DEG + ' = ' + e + DEG + '.');
  }

  /* 2.1 isosceles, apex given: the child must halve. */
  function gIsoscelesApex() {
    const t = pick(TRIS), A = t[0], B = t[1], C = t[2];
    const a = 2 * ri(11, 42), e = (180 - a) / 2;
    if (e === a || e < 20) return gIsoscelesApex();
    /* distractor 1 = forgot to halve */
    const cs = clean(e, [180 - a, (360 - a) / 2, a, 90 - a, e + 10]);
    if (cs.length < 3) return gIsoscelesApex();
    return finishNum('In triangle ' + t.join('') + ', ' + A + B + ' = ' + A + C + ' and ∠' + A +
      ' = ' + a + DEG + '. What is the size of ∠' + B + '?', '', e, cs, DEG,
      'The two equal sides give two equal angles, ∠' + B + ' = ∠' + C + '. Together they are 180' +
      DEG + ' − ' + a + DEG + ' = ' + (180 - a) + DEG + ', so each one is ' + (180 - a) + DEG +
      ' ÷ 2 = ' + e + DEG + '.');
  }

  /* 2.1 right-angled triangle: the other two make 90. */
  function gRightTriangle() {
    const t = pick(TRIS), A = t[0], B = t[1], C = t[2];
    const a = ri(20, 70), e = 90 - a;
    if (e < 15 || Math.abs(e - a) <= 3) return gRightTriangle();
    const cs = clean(e, [180 - a, 90 + a, a, 45, 180 - 90 - a + 20]);
    if (cs.length < 3) return gRightTriangle();
    return finishNum('In triangle ' + t.join('') + ', ∠' + B + ' is a right angle and ∠' + A +
      ' = ' + a + DEG + '. What is the size of ∠' + C + '?', '', e, cs, DEG,
      'A right angle is 90' + DEG + ', and the three angles of a triangle add up to 180' + DEG +
      ', so the other two must add up to 90' + DEG + '. ∠' + C + ' = 90' + DEG + ' − ' + a +
      DEG + ' = ' + e + DEG + '.');
  }

  /* 3.1 parallelogram, next-door angle. Distractor 1 = treated it as opposite. */
  function gParallelogramAdj() {
    const q = pick(QUADS);
    const i = ri(0, 3), n = (i + 1) % 4;
    const a = pick([ri(35, 85), ri(95, 145)]);
    const e = 180 - a;
    const cs = clean(e, [a, 360 - a, 90, a + 20]);
    if (cs.length < 3) return gParallelogramAdj();
    return finishNum(q.join('') + ' is a parallelogram, with the four corners in the order ' + q.join(', ') +
      ' round the shape. ∠' + q[i] + ' = ' + a + DEG + '. What is the size of ∠' + q[n] +
      ', the angle at the next corner along?', '', e, cs, DEG,
      '∠' + q[i] + ' and ∠' + q[n] + ' are next to each other along the side ' + q[i] + q[n] +
      ', and in a parallelogram two angles next to each other add up to 180' + DEG + '. So ∠' +
      q[n] + ' = 180' + DEG + ' − ' + a + DEG + ' = ' + e + DEG + '.');
  }

  /* 3.1 trapezium: the two angles on one slant side, between the parallel sides. */
  function gTrapezium() {
    const q = pick(QUADS), A = q[0], B = q[1], C = q[2], D = q[3];
    const a = pick([ri(40, 85), ri(95, 140)]);
    const e = 180 - a;
    const cs = clean(e, [a, 360 - a, 90, a + 25]);
    if (cs.length < 3) return gTrapezium();
    return finishNum(q.join('') + ' is a trapezium in which the side ' + A + B + ' is parallel to the side ' +
      D + C + '. The side ' + A + D + ' joins the two parallel sides. ∠' + A + ' = ' + a +
      DEG + '. What is the size of ∠' + D + '?', '', e, cs, DEG,
      '∠' + A + ' and ∠' + D + ' are the two angles at the ends of the side ' + A + D +
      ', which crosses the pair of parallel sides. Two such angles add up to 180' + DEG + ', so ∠' +
      D + ' = 180' + DEG + ' − ' + a + DEG + ' = ' + e + DEG + '.');
  }

  /* 3.1 rhombus. A rhombus is a parallelogram with four equal sides, so the same
     two angle properties hold; the stem asks for whichever corner is not given. */
  function gRhombus() {
    const q = pick(QUADS);
    const i = ri(0, 3);
    const opposite = Math.random() < 0.5;
    const j = opposite ? (i + 2) % 4 : (i + 1) % 4;
    const a = pick([ri(35, 85), ri(95, 145)]);
    const e = opposite ? a : 180 - a;
    const cs = clean(e, [opposite ? 180 - a : a, 360 - a, 90, a + 20]);
    if (cs.length < 3) return gRhombus();
    return finishNum(q.join('') + ' is a rhombus, with the four corners in the order ' + q.join(', ') +
      ' round the shape, and all four sides equal. ∠' + q[i] + ' = ' + a + DEG + '. What is the size of ∠' +
      q[j] + ', the angle at the ' + (opposite ? 'opposite corner' : 'next corner along') + '?', '', e, cs, DEG,
      'A rhombus is a parallelogram with four equal sides, so opposite corners are equal and two corners next to each other add up to 180' +
      DEG + '. ' + (opposite ? '∠' + q[j] + ' is opposite ∠' + q[i] + ', so ∠' + q[j] + ' = ' + a + DEG + '.'
                             : '∠' + q[j] + ' is next to ∠' + q[i] + ', so ∠' + q[j] + ' = 180' + DEG + ' − ' + a + DEG + ' = ' + e + DEG + '.'));
  }

  /* ---------- pool 3: two or more steps every time ---------- */

  /* 2.2 + straight line. Step 1: the third angle of the triangle. Step 2: the
     straight line at that vertex. The line BCD is GIVEN, not constructed. */
  function gExteriorAngle() {
    const t = pick(TRIS), A = t[0], B = t[1], C = t[2];
    const D = pick(['D', 'W', 'H']);
    if (D === A || D === B || D === C) return gExteriorAngle();
    const a = ri(30, 85), b = ri(30, 85), inner = 180 - a - b;
    const e = a + b;
    if (inner < 25 || e > 155) return gExteriorAngle();
    /* distractor 1 = stopped one step short, at the angle inside the triangle */
    const cs = clean(e, [inner, 180 - a, 180 - b, 360 - a - b, e - 15]);
    if (cs.length < 3) return gExteriorAngle();
    return finishNum('In triangle ' + t.join('') + ', ∠' + A + ' = ' + a + DEG + ' and ∠' + B +
      ' = ' + b + DEG + '. The side ' + B + C + ' is extended to the point ' + D + ', so ' + B +
      ', ' + C + ' and ' + D + ' lie on one straight line. What is the size of ∠' + A + C + D + '?',
      '', e, cs, DEG,
      'First the triangle: ∠' + A + C + B + ' = 180' + DEG + ' − ' + a + DEG + ' − ' + b + DEG +
      ' = ' + inner + DEG + '. Then the straight line: ∠' + A + C + B + ' and ∠' + A + C + D +
      ' sit side by side on the line ' + B + C + D + ', so ∠' + A + C + D + ' = 180' + DEG + ' − ' +
      inner + DEG + ' = ' + e + DEG + '.');
  }

  /* 2.1 + straight line. Step 1: the base angle (halve). Step 2: the straight line. */
  function gIsoscelesOnLine() {
    const t = pick(TRIS), A = t[0], B = t[1], C = t[2];
    const D = pick(['D', 'W', 'H']);
    if (D === A || D === B || D === C) return gIsoscelesOnLine();
    const a = 2 * ri(11, 42), base = (180 - a) / 2, e = 180 - base;
    if (base < 20 || e >= 180) return gIsoscelesOnLine();
    /* distractor 1 = stopped at the base angle; distractor 2 = used the apex */
    const cs = clean(e, [base, a, 180 - a, 360 - base, base + 20]);
    if (cs.length < 3) return gIsoscelesOnLine();
    return finishNum('In triangle ' + t.join('') + ', ' + A + B + ' = ' + A + C + ' and ∠' + A +
      ' = ' + a + DEG + '. The side ' + B + C + ' is extended to the point ' + D + ', so ' + B +
      ', ' + C + ' and ' + D + ' lie on one straight line. What is the size of ∠' + A + C + D + '?',
      '', e, cs, DEG,
      'First the isosceles triangle: the two equal sides give ∠' + B + ' = ∠' + A + C + B +
      ' = (180' + DEG + ' − ' + a + DEG + ') ÷ 2 = ' + base + DEG + '. Then the straight line: ∠' +
      A + C + D + ' = 180' + DEG + ' − ' + base + DEG + ' = ' + e + DEG + '.');
  }

  /* 3.1 + straight line. Step 1: opposite angles of the parallelogram. Step 2:
     the straight line along the extended side. */
  function gParallelogramOnLine() {
    const q = pick(QUADS), A = q[0], B = q[1], C = q[2], D = q[3];
    const E = pick(['T', 'U', 'V']);
    if (q.includes(E)) return gParallelogramOnLine();
    const a = pick([ri(35, 85), ri(95, 140)]);
    const e = 180 - a;
    /* distractor 1 = stopped at ∠BCD; distractor 2 = the 360 slip */
    const cs = clean(e, [a, 360 - a, 90, a + 25]);
    if (cs.length < 3) return gParallelogramOnLine();
    return finishNum(q.join('') + ' is a parallelogram, with the four corners in the order ' + q.join(', ') +
      ' round the shape. ∠' + A + ' = ' + a + DEG + '. The side ' + D + C + ' is extended to the point ' +
      E + ', so ' + D + ', ' + C + ' and ' + E + ' lie on one straight line. What is the size of ∠' +
      B + C + E + '?', '', e, cs, DEG,
      'First the parallelogram: ∠' + B + C + D + ' is opposite ∠' + A + ', and opposite angles are equal, so ∠' +
      B + C + D + ' = ' + a + DEG + '. Then the straight line: ∠' + B + C + D + ' and ∠' + B + C + E +
      ' sit side by side on the line ' + D + C + E + ', so ∠' + B + C + E + ' = 180' + DEG + ' − ' +
      a + DEG + ' = ' + e + DEG + '.');
  }

  /* The "which one CANNOT be" item. Three sets are genuine triangles (three
     positive whole angles, each below 180, summing to exactly 180); the key is
     the set that does not add to 180. Every set is checked, so the key is unique. */
  function gImpossibleTriangle() {
    const say = s => s.join(DEG + ', ') + DEG;
    const okSet = () => {
      const a = ri(20, 100), b = ri(20, 160 - a), c = 180 - a - b;
      if (c < 15) return null;
      return shuffle([a, b, c]);
    };
    const good = [];
    let guard = 0;
    while (good.length < 3 && guard++ < 60) {
      const s = okSet();
      if (s && !good.some(g => say(g) === say(s))) good.push(s);
    }
    if (good.length < 3) return gImpossibleTriangle();
    let bad = null;
    for (let i = 0; i < 60 && !bad; i++) {
      const a = ri(20, 100), b = ri(20, 100), c = ri(20, 100);
      const sum = a + b + c;
      if (Math.abs(sum - 180) < 8) continue;
      const s = [a, b, c];
      if (good.some(g => say(g) === say(s))) continue;
      bad = s;
    }
    if (!bad) return gImpossibleTriangle();
    const out = finishText('Each set below is meant to be the three angles of a triangle. Which set CANNOT be the three angles of a triangle?',
      say(bad), good.map(say),
      'The three angles of a triangle always add up to exactly 180' + DEG + '. ' + say(bad) +
      ' adds up to ' + (bad[0] + bad[1] + bad[2]) + DEG + ', not 180' + DEG +
      ', so no triangle can have those three angles. Every other set adds up to 180' + DEG + '.');
    return out || gImpossibleTriangle();
  }

  MQI.registerTopic({
    id: 'p5shapes', level: 'P5', strand: 'Measurement and Geometry',
    moeSubTopic: "Triangle: properties of isosceles triangle, equilateral triangle, right-angled triangle; angle sum of a triangle; finding unknown angles without additional construction of lines. Parallelogram, Rhombus and Trapezium: properties of parallelogram, rhombus, trapezium; finding unknown angles without additional construction of lines",
    label: 'Triangle Temple', short: 'Shapes', e: '🔺',
    skills: {
      tri: { label: 'Angles in a triangle', tip: 'The three angles of any triangle add up to 180°, never 360°. Equilateral: all three are 60°. Isosceles: the two angles facing the equal sides are equal. Right-angled: the other two add up to 90°.' },
      quad: { label: 'Angles in four-sided figures', tip: 'In a parallelogram and a rhombus, opposite corners are equal and next-door corners add up to 180°. In a trapezium, the two angles at the ends of a side joining the parallel sides add up to 180°.' },
      unknown: { label: 'Two-step unknown angles', tip: 'Name the first fact, work out that angle, then name the second fact. Extending a side gives a straight line: 180° take away the angle you just found.' }
    },
    pools: {
      1: [[gTriangleThird, 'tri'], [gEquilateral, 'tri'], [gParallelogramOpp, 'quad']],
      2: [[gIsoscelesBase, 'tri'], [gIsoscelesApex, 'tri'], [gRightTriangle, 'tri'],
          [gParallelogramAdj, 'quad'], [gTrapezium, 'quad'], [gRhombus, 'quad']],
      3: [[gExteriorAngle, 'unknown'], [gIsoscelesOnLine, 'unknown'],
          [gParallelogramOnLine, 'unknown'], [gImpossibleTriangle, 'tri']]
    }
  });
})();
