"use strict";
/* Math Quest Island topic: angles (P4). Self-contained. All multiple choice.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope limit (MOE Oct 2025, p.39-40, MEASUREMENT AND GEOMETRY, SUB-STRAND:
 * GEOMETRY, 1. Angles):
 *   1.1 using notation such as ∠ABC and ∠a to name angles
 *   1.2 measuring angles in degrees
 *   1.3 drawing an angle of given size
 *
 * NOT here, deliberately:
 *   - angles on a straight line / at a point / vertically opposite, and finding
 *     unknown angles: MOE p.42, PRIMARY FIVE. Those live in js/topics/p5-angles.js
 *     and NOTHING in this file may depend on the 180° or 360° facts.
 *   - naming an angle as acute / obtuse / right: that classification is P3, not
 *     P4, so it is not on this page even though it reads like an angles item.
 *   - the 8-point compass and turns: not in the Oct 2025 P4 list.
 *   - properties of rectangle and square (p.39 item 2) and line symmetry (item 3):
 *     different sub-topics, so a different file if they are ever built.
 *
 * The one item here that adds two angles (gAddAdjacent) adds two MEASURED angles
 * that share an arm. It uses no straight-line or point fact: the total is capped
 * below 180° so the child is only ever measuring and adding, which is 1.2 plus
 * P4 arithmetic. If a refuter reads that as a P5 borrowing, cut it to pool 3 only
 * or drop it; nothing else in the file depends on it.
 *
 * TWO CONSTRAINTS INHERITED FROM THE KILL LIST:
 *
 * 1. NO DIAGRAM. The app has no drawing surface, and a rendered figure is banned
 *    unless every given angle is labelled and the unknown marked. So every
 *    configuration is DESCRIBED in words, written to leave exactly one reading
 *    ("both arms start at B", "share the arm BC, with no gap between them").
 *    An angle that is "measured as N°" is stated as measured; the child is never
 *    asked to read a size off prose that does not carry it.
 *
 * 2. MULTIPLE CHOICE THROUGHOUT, with the degree sign on EVERY choice via
 *    finishNum's unit argument, never on the key alone. The naming items choose
 *    between angle NAMES, so they use the local finishText below (same contract:
 *    4 distinct choices, correct index, answerText === choices[correct]).
 *
 * Every angle is a whole number of degrees, every answer is positive, and no
 * named angle in this file is 180° or more.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

  const DEG = '°';

  /* Three-letter figures. Both orders of the outer two letters are used, so the
     naming pool is 2 x this list rather than 1 x. */
  const TRIPLES = [['A', 'B', 'C'], ['P', 'Q', 'R'], ['X', 'Y', 'Z'], ['D', 'E', 'F'],
                   ['K', 'L', 'M'], ['R', 'S', 'T'], ['J', 'K', 'L'], ['M', 'N', 'P'],
                   ['C', 'D', 'E'], ['T', 'U', 'V']];

  /* Text-choice finisher. finishNum only builds numeric choices; the naming
     skill needs the four options to be angle names. Same shape contract, and it
     never emits a duplicate choice. Self-containment rule: local, not core. */
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

  /* Keep only positive whole angles below 180 that are clearly apart from the key. */
  function clean(correct, list) {
    const out = [];
    for (const c of list) {
      if (c > 0 && c < 180 && Number.isInteger(c) && Math.abs(c - correct) > 3 && !out.includes(c)) out.push(c);
    }
    return out;
  }

  /* ---------- pool 1 ---------- */

  /* 1.1 naming. The vertex letter goes in the MIDDLE; every distractor puts it at
     an end. ∠CBA names the same angle and is therefore NEVER a distractor. */
  function gNameAngle() {
    const t = pick(TRIPLES);
    const v = t[1];
    const ends = Math.random() < 0.5 ? [t[0], t[2]] : [t[2], t[0]];
    const p = ends[0], r = ends[1];
    const correct = '∠' + p + v + r;
    const cands = ['∠' + v + p + r, '∠' + v + r + p, '∠' + p + r + v, '∠' + r + p + v];
    const out = finishText('Two straight arms meet at point ' + v + '. One arm runs from ' + v + ' to ' + p +
      ' and the other arm runs from ' + v + ' to ' + r +
      '. Which of these is a correct name for the angle between the two arms?', correct, cands,
      'The letter in the MIDDLE of the name is the vertex, the point where the two arms meet. The arms meet at ' +
      v + ', so the angle is ' + correct + ' (or ' + '∠' + r + v + p + ', reading the other way round).');
    return out || gNameAngle();
  }

  /* 1.2 measuring in degrees: compare two measured angles. */
  function gLargerOfTwo() {
    const t = pick(TRIPLES), u = pick(TRIPLES);
    const a = ri(15, 80), b = ri(95, 170);
    const big = Math.random() < 0.5;
    const n1 = '∠' + t.join(''), n2 = '∠' + u.join('');
    const x = big ? b : a, y = big ? a : b;
    const e = Math.max(x, y);
    const cs = clean(e, [Math.min(x, y), Math.abs(x - y), 180 - e, e - 10, e - 20]);
    if (cs.length < 3 || n1 === n2) return gLargerOfTwo();
    return finishNum(n1 + ' is measured as ' + x + DEG + ' and ' + n2 + ' is measured as ' + y +
      DEG + '. What is the size of the larger of the two angles?', '', e, cs, DEG,
      'Comparing the two measurements, ' + Math.max(x, y) + DEG + ' is more than ' + Math.min(x, y) +
      DEG + ', so the larger angle measures ' + e + DEG + '.');
  }

  /* ---------- pool 2 ---------- */

  /* 1.1 again, harder: which name means the SAME angle. */
  function gSameAngle() {
    const t = pick(TRIPLES);
    const v = t[1];
    const ends = Math.random() < 0.5 ? [t[0], t[2]] : [t[2], t[0]];
    const p = ends[0], r = ends[1];
    const given = '∠' + p + v + r;
    const correct = '∠' + r + v + p;
    const cands = ['∠' + v + p + r, '∠' + v + r + p, '∠' + p + r + v, '∠' + r + p + v];
    const out = finishText('An angle is named ' + given +
      '. Which of these names the SAME angle?', correct, cands,
      'The middle letter is the vertex, so ' + given + ' has its vertex at ' + v +
      '. Reading the two arms the other way round gives ' + correct +
      ', which is the same angle. Every other name puts the vertex at the wrong point.');
    return out || gSameAngle();
  }

  /* 1.2: how many degrees more. */
  function gHowMuchLarger() {
    const t = pick(TRIPLES), u = pick(TRIPLES);
    const a = ri(15, 85), b = a + ri(10, 85);
    if (b >= 175 || t.join('') === u.join('')) return gHowMuchLarger();
    const e = b - a;
    const cs = clean(e, [a + b, b, a, 180 - b, 90 - a]);
    if (cs.length < 3) return gHowMuchLarger();
    return finishNum('∠' + t.join('') + ' is measured as ' + a + DEG + ' and ∠' + u.join('') +
      ' is measured as ' + b + DEG + '. How many degrees larger is ∠' + u.join('') + ' than ∠' +
      t.join('') + '?', '', e, cs, DEG,
      '"How many degrees larger" is a subtraction: ' + b + DEG + ' − ' + a + DEG + ' = ' + e + DEG + '.');
  }

  /* 1.2 + P4 addition. Two MEASURED angles sharing an arm. No straight-line or
     point fact is used or needed, and the total is capped below 180. */
  function gAddAdjacent() {
    const t = pick(TRIPLES);
    const p = t[0], v = t[1], r = t[2];
    const s = pick(['W', 'H', 'G']);
    const a = ri(20, 80), b = ri(20, 80);
    const e = a + b;
    if (e > 172) return gAddAdjacent();
    const cs = clean(e, [Math.abs(a - b), 180 - e, a, b, e - 12]);
    if (cs.length < 3) return gAddAdjacent();
    return finishNum('∠' + p + v + s + ' is measured as ' + a + DEG + ' and ∠' + s + v + r +
      ' is measured as ' + b + DEG + '. The two angles sit side by side at the vertex ' + v +
      ', sharing the arm ' + v + s + ' with no gap between them, so together they make ∠' + p + v + r +
      '. What is the size of ∠' + p + v + r + '?', '', e, cs, DEG,
      'The two angles join at the shared arm ' + v + s + ' with no gap, so the big angle is the two measurements added: ' +
      a + DEG + ' + ' + b + DEG + ' = ' + e + DEG + '.');
  }

  /* ---------- pool 3: every item takes two steps ---------- */

  /* Stem shape 3 for the naming skill, and this file's "which one is WRONG" item.
     Three of the four names are correct names for the SAME angle (∠PVR, ∠RVP and
     one written with the ∠a shorthand the syllabus also names); the key is the one
     that moves the vertex. Two steps: find the vertex, then test each name. */
  function gNameWrong() {
    const t = pick(TRIPLES);
    const v = t[1];
    const ends = Math.random() < 0.5 ? [t[0], t[2]] : [t[2], t[0]];
    const p = ends[0], r = ends[1];
    /* the key is a name whose MIDDLE letter is not the vertex */
    const correct = pick(['∠' + v + p + r, '∠' + v + r + p, '∠' + p + r + v, '∠' + r + p + v]);
    const cands = ['∠' + p + v + r, '∠' + r + v + p];
    /* Wave-3 wound 4 (W3 Angles+Shapes Refutation §3): the shorthand option asserted
       a marking the stem never made, so a strict child was right to call it wrong.
       The stem now MAKES that marking, which is also the ∠a notation the syllabus names. */
    const out = finishText('Two straight arms meet at point ' + v + '. One arm runs from ' + v + ' to ' + p +
      ' and the other arm runs from ' + v + ' to ' + r + '. The angle at ' + v + ' is marked ∠' +
      v.toLowerCase() + ' on the diagram.' +
      ' Three of the names below are correct names for that angle. Which one is WRONG?',
      correct, cands.concat(['the angle marked ∠' + v.toLowerCase() + ' at the point ' + v]),
      'The vertex is ' + v + ', so a correct name must have ' + v +
      ' in the middle: ∠' + p + v + r + ' and ∠' + r + v + p + ' both do, and ∠' + v.toLowerCase() +
      ' is the short way of naming the angle marked at ' + v + '. ' + correct +
      ' puts ' + v + ' at an end, so it names a different angle.');
    return out || gNameWrong();
  }

  /* Two steps: add the two parts to build the big angle, THEN subtract to compare
     it against a third measured angle. */
  function gTwoStepDiff() {
    const t = pick(TRIPLES), u = pick(TRIPLES);
    if (t.join('') === u.join('')) return gTwoStepDiff();
    const p = t[0], v = t[1], r = t[2];
    const s = pick(['W', 'H', 'G']);
    const a = ri(20, 75), b = ri(20, 75), big = a + b;
    const c = ri(15, 70);
    const e = big - c;
    if (big > 172 || e < 8) return gTwoStepDiff();
    const cs = clean(e, [big + c, big, c, a + b + c - 10, Math.abs(a - b)]);
    if (cs.length < 3) return gTwoStepDiff();
    return finishNum('∠' + p + v + s + ' is measured as ' + a + DEG + ' and ∠' + s + v + r +
      ' is measured as ' + b + DEG + '. They sit side by side at ' + v + ', sharing the arm ' + v + s +
      ' with no gap, so together they make ∠' + p + v + r + '. ∠' + u.join('') + ' is measured as ' +
      c + DEG + '. How many degrees larger is ∠' + p + v + r + ' than ∠' + u.join('') + '?', '', e, cs, DEG,
      'First build the big angle: ' + a + DEG + ' + ' + b + DEG + ' = ' + big + DEG +
      '. Then compare: ' + big + DEG + ' − ' + c + DEG + ' = ' + e + DEG + '.');
  }

  /* Wave-3 wound 3 (W3 Angles+Shapes Refutation, section 4): this used to compute
     big - a, the SAME single subtraction as pool-2 gHowMuchLarger, with the promised
     second step living only in the explain. It now asks a question that first
     subtraction cannot answer: find the missing part, THEN compare it against the
     given part. Key = (big - a) - a, arithmetic no pool-2 generator produces. */
  function gMissingPart() {
    const t = pick(TRIPLES);
    const p = t[0], v = t[1], r = t[2];
    const s = pick(['W', 'H', 'G']);
    const big = ri(80, 170);
    const hi = Math.floor((big - 12) / 2);
    if (hi < 20) return gMissingPart();
    const a = ri(20, hi);
    const part = big - a, e = part - a;
    if (e < 12 || part < 20) return gMissingPart();
    const cs = clean(e, [part, big, a, e + 15, Math.abs(e - 20)]);
    if (cs.length < 3) return gMissingPart();
    return finishNum('The arm ' + v + s + ' is drawn inside \u2220' + p + v + r + ', splitting it into \u2220' +
      p + v + s + ' and \u2220' + s + v + r + ' with no gap between them. \u2220' + p + v + r +
      ' is measured as ' + big + DEG + ' and \u2220' + p + v + s + ' is measured as ' + a +
      DEG + '. How many degrees larger is \u2220' + s + v + r + ' than \u2220' + p + v + s + '?', '', e, cs, DEG,
      'First find the missing part: the two parts make up the whole angle, so \u2220' + s + v + r +
      ' = ' + big + DEG + ' \u2212 ' + a + DEG + ' = ' + part + DEG + '. Then compare it with \u2220' +
      p + v + s + ': ' + part + DEG + ' \u2212 ' + a + DEG + ' = ' + e + DEG + '.');
  }

  MQI.registerTopic({
    id: 'p4angles', level: 'P4', strand: 'Measurement and Geometry',
    moeSubTopic: "Angles: using notation such as ∠ABC and ∠a to name angles; measuring angles in degrees; drawing an angle of given size",
    label: 'Naming Narrows', short: 'Angles', e: '📐',
    skills: {
      name: { label: 'Naming an angle', tip: 'The middle letter of ∠ABC is the vertex, the corner where the two arms meet. ∠ABC and ∠CBA are the same angle; ∠BAC is a different one.' },
      measure: { label: 'Measuring and comparing', tip: 'Angles are measured in degrees. "How many degrees more" means subtract; two angles sharing an arm with no gap add up to the big one.' }
    },
    pools: {
      1: [[gNameAngle, 'name'], [gLargerOfTwo, 'measure']],
      2: [[gSameAngle, 'name'], [gHowMuchLarger, 'measure'], [gAddAdjacent, 'measure']],
      3: [[gNameWrong, 'name'], [gTwoStepDiff, 'measure'], [gMissingPart, 'measure']]
    }
  });
})();
