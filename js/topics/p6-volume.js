"use strict";
/* Math Quest Island topic: p6volume (P6). Self-contained. Typed + MC.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope (MOE 2021 Primary Mathematics Syllabus, updated Oct 2025, p.43, PRIMARY SIX,
 * MEASUREMENT AND GEOMETRY, SUB-STRAND: AREA AND VOLUME, 2. Volume of Cube and Cuboid):
 *   2.1 finding one dimension of a cuboid given its volume and the other dimensions
 *   2.2 finding the length of one edge of a cube given its volume
 *   2.3 finding the height of a cuboid given its volume and base area
 *   2.4 finding the area of a face of a cuboid given its volume and one dimension
 *   2.5 use of √ and ∛ (perfect squares and perfect cubes only)
 * The P5 facts (volume = l x b x h, liquid in a tank, 1 ℓ = 1000 cm³) live in
 * js/topics/p5-volume.js and are used here as given tools, never as the item.
 * NO FIGURE: every solid and tank is described in words; every needed length is printed.
 * Every answer is a positive whole number. Numbers are written without thousands
 * separators so that the coaching check re-reads every equation in the steps.
 *
 * P5-P6 mirror house pattern (js/topics/p6-ratio.js): q.syl = 'P6' on every draw; MCQ
 * distractors carry q.miscon + q.optionFeedback; typed items carry q.slips; tags live in
 * the topic's `misconceptions` map. Pool 3 is PSLE Paper 2 shape: band 3, worded,
 * q.exam = 'problem', coached (technique + steps).
 * UNITS: a litre/cm³ answer whose stem prints "1 ml = 1 cm³" would declare the array
 * pair, as p5-volume.js does; the stems here print "1 ℓ = 1000 cm³", so every answer
 * has exactly one unit (cm, cm², cm³ or ℓ) and declares it.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie', 'Aisyah', 'Kavitha', 'Jun Hao', 'Siti', 'Priya', 'Daryl', 'Xin Yi',
                 'Farhan', 'Nurul', 'Ravi', 'Mei Ling'];
  const P6 = q => (q.syl = 'P6', q);
  const isWhole = v => Number.isInteger(v) && v > 0;

  /* MCQ with tagged distractors. dist = [[value, tag, coaching], ...]; the first three
     that are whole, positive, distinct and differ from the key are kept. null = redraw. */
  function mcq(stem, key, unit, dist, explain) {
    const u = !unit ? '' : (unit === '°' || unit === '%' ? unit : ' ' + unit);
    const seen = [key], keep = [];
    for (const d of dist) {
      if (keep.length >= 3) break;
      if (!isWhole(d[0]) || seen.indexOf(d[0]) !== -1) continue;
      seen.push(d[0]); keep.push(d);
    }
    if (keep.length < 3) return null;
    const rows = shuffle([[key, null, null]].concat(keep));
    const q = { q: stem, extra: '', choices: rows.map(r => r[0] + u), correct: 0, explain, answerText: key + u };
    q.correct = rows.findIndex(r => r[1] === null);
    q.miscon = {}; q.optionFeedback = {};
    rows.forEach((r, i) => { if (r[1]) { q.miscon[i] = r[1]; q.optionFeedback[i] = r[2]; } });
    return P6(q);
  }
  function slips(q, list) {
    const s = {};
    for (const [v, tag] of list) if (isWhole(v) && v !== q.answer && !(String(v) in s)) s[String(v)] = tag;
    q.slips = s;
    return P6(q);
  }
  const P2 = (q, technique, steps) => (q.band = 3, q.exam = 'problem', q.technique = technique, q.steps = steps, q);
  const cubeCheck = c => 'Check it: ' + c + ' × ' + c + ' × ' + c + ' = ' + (c * c * c) + '.';

  /* ---------------- pool 1 ---------------- */

  /* 2.2 the edge of a cube from its volume (MCQ, cm) */
  function gCubeEdge() {
    const s = ri(2, 12), v = s * s * s;
    const what = pick(['A cube', 'A cube-shaped box', 'A solid metal cube', 'A cube of wood']);
    const stem = what + ' has a volume of ' + v + ' cm³. What is the length of one edge of the cube?';
    const out = mcq(stem, s, 'cm', [
      [v / 3, 'divide-by-3', 'The edge is not the volume ÷ 3. Look for the number that, multiplied by itself three times, makes ' + v + '.'],
      [s * s, 'face-area', cubeCheck(s * s) + ' The edge times itself three times must make ' + v + '.'],
      [s + 1, 'root-not-checked', cubeCheck(s + 1) + ' That is more than ' + v + ', so try a smaller number.'],
      [s - 1, 'root-not-checked', cubeCheck(s - 1) + ' That is less than ' + v + ', so try a bigger number.'],
      [s + 2, 'root-not-checked', cubeCheck(s + 2) + ' That is more than ' + v + ', so try a smaller number.']
    ], 'Volume of a cube = edge × edge × edge. ' + s + ' × ' + s + ' × ' + s + ' = ' + v + ', so the edge is ∛' + v + ' = ' + s + ' cm.');
    return out || gCubeEdge();
  }

  /* 2.1 one dimension of a cuboid from its volume and the other two (MCQ, cm) */
  function gMissingDim() {
    const l = ri(5, 15), b = ri(2, 9), h = ri(2, 12);
    if (l === b || b === h || l === h) return gMissingDim();
    const V = l * b * h;
    const which = pick(['length', 'breadth', 'height']);
    const dims = { length: l, breadth: b, height: h };
    const given = ['length', 'breadth', 'height'].filter(d => d !== which);
    const k1 = dims[given[0]], k2 = dims[given[1]], key = dims[which];
    const stem = 'A cuboid has a volume of ' + V + ' cm³. Its ' + given[0] + ' is ' + k1 + ' cm and its ' + given[1] + ' is ' + k2 +
      ' cm. What is its ' + which + '?';
    const out = mcq(stem, key, 'cm', [
      [V / k1, 'divided-once', V + ' ÷ ' + k1 + ' is the area of a face, not an edge. Divide by ' + k2 + ' as well.'],
      [k1 * k2, 'stopped-at-area', k1 + ' × ' + k2 + ' = ' + (k1 * k2) + ' is the area of a face. Now divide the volume by it.'],
      [V - k1 * k2, 'subtract-instead', 'Volume is length × breadth × height, so undo the multiplying by dividing, not by taking away.'],
      [V / (k1 + k2), 'added-dims', 'Multiply the two given edges, then divide the volume by that product.'],
      [V - k1 - k2, 'subtract-instead', 'Volume is length × breadth × height, so undo the multiplying by dividing, not by taking away.']
    ], 'Volume = length × breadth × height. ' + k1 + ' × ' + k2 + ' = ' + (k1 * k2) + ', so the ' + which + ' is ' + V + ' ÷ ' + (k1 * k2) + ' = ' + key + ' cm.');
    return out || gMissingDim();
  }

  /* 2.5 square root and cube root of a perfect square / cube (MCQ, no unit) */
  function gRoot() {
    if (Math.random() < 0.5) {
      const k = ri(4, 15), n = k * k;
      const out = mcq('What is the value of √' + n + '?', k, '', [
        [n / 2, 'halved', '√ does not mean ÷ 2. Look for the number that, multiplied by itself, makes ' + n + '.'],
        [k + 1, 'root-not-checked', 'Check it: ' + (k + 1) + ' × ' + (k + 1) + ' = ' + ((k + 1) * (k + 1)) + ', which is more than ' + n + '.'],
        [k - 1, 'root-not-checked', 'Check it: ' + (k - 1) + ' × ' + (k - 1) + ' = ' + ((k - 1) * (k - 1)) + ', which is less than ' + n + '.'],
        [2 * k, 'doubled', 'Check it: ' + (2 * k) + ' × ' + (2 * k) + ' = ' + (4 * n) + ', not ' + n + '.']
      ], k + ' × ' + k + ' = ' + n + ', so √' + n + ' = ' + k + '.');
      return out || gRoot();
    }
    const k = ri(2, 10), n = k * k * k, sq = Math.round(Math.sqrt(n));
    const out = mcq('What is the value of ∛' + n + '?', k, '', [
      [n / 3, 'divide-by-3', '∛ does not mean ÷ 3. Look for the number that, multiplied by itself three times, makes ' + n + '.'],
      [sq * sq === n ? sq : 0, 'square-not-cube', 'Check it: ' + sq + ' × ' + sq + ' = ' + n + ', but ∛ needs THREE equal factors.'],
      [k + 1, 'root-not-checked', cubeCheck(k + 1) + ' That is more than ' + n + '.'],
      [k - 1, 'root-not-checked', cubeCheck(k - 1) + ' That is less than ' + n + '.'],
      [k + 2, 'root-not-checked', cubeCheck(k + 2) + ' That is more than ' + n + '.']
    ], k + ' × ' + k + ' × ' + k + ' = ' + n + ', so ∛' + n + ' = ' + k + '.');
    return out || gRoot();
  }

  /* ---------------- pool 2 ---------------- */

  /* 2.3 the height of a cuboid from its volume and base area (typed, cm) */
  function gHeightFromBase() {
    const A = ri(3, 40) * 5, h = ri(3, 25), V = A * h;
    if (A === h) return gHeightFromBase();
    const stem = Math.random() < 0.5
      ? 'A cuboid has a volume of ' + V + ' cm³. The area of its base is ' + A + ' cm². What is its height, in cm?'
      : 'A rectangular container is filled to the brim with ' + V + ' cm³ of sand. The area of its base is ' + A + ' cm². How tall is the container, in cm?';
    const q = finishTyped(stem, h, 'Volume = base area × height, so height = ' + V + ' ÷ ' + A + ' = ' + h + ' cm.', 'cm');
    return slips(q, [[V - A, 'subtract-instead'], [A, 'answered-given']]);
  }

  /* 2.4 the area of a face from the volume and one dimension (typed, cm²) */
  function gFaceArea() {
    const l = ri(4, 20), b = ri(3, 12), h = ri(3, 15);
    if (l === b || b === h || l === h) return gFaceArea();
    const V = l * b * h, A = l * b;
    const stem = Math.random() < 0.5
      ? 'A cuboid has a volume of ' + V + ' cm³ and a height of ' + h + ' cm. What is the area of its base, in cm²?'
      : 'A block of ice in the shape of a cuboid has a volume of ' + V + ' cm³. It is ' + h + ' cm tall. What is the area of its top face, in cm²?';
    const q = finishTyped(stem, A, 'Volume = base area × height, so the base area is ' + V + ' ÷ ' + h + ' = ' + A +
      ' cm². The top face is the same size as the base.', 'cm²');
    return slips(q, [[V - h, 'subtract-instead'], [V * h, 'multiplied-instead'], [h * h, 'squared-height']]);
  }

  /* 2.5 + 2.2: from the area of one face of a cube to its volume, and back; and the side of a
     square base from a cuboid's volume and height (V ÷ h, then √) (typed). Edges 2, 3 and 6
     are left out of the cube modes: there the ×3, ÷3 and ×6 routes land on the key too. */
  function gCubeFace() {
    const mode = pick(['toVolume', 'toFace', 'squareBase']);
    if (mode === 'squareBase') {
      const s = ri(3, 12), h = ri(2, 20), A = s * s, V = A * h;
      if (h === s || A === h) return gCubeFace();
      const q = finishTyped('A cuboid has a square base. Its volume is ' + V + ' cm³ and its height is ' + h +
        ' cm. What is the length of one side of its base, in cm?', s,
        'Base area = ' + V + ' ÷ ' + h + ' = ' + A + ' cm². The base is a square, so its side is √' + A + ' = ' + s + ' cm.', 'cm');
      return slips(q, [[A, 'stopped-at-square'], [A / 2, 'halved'], [V - h, 'subtract-instead']]);
    }
    const s = pick([4, 5, 7, 8, 9, 10, 11, 12]), A = s * s, v = A * s;
    if (mode === 'toVolume') {
      const q = finishTyped('The area of one face of a cube is ' + A + ' cm². What is the volume of the cube, in cm³?', v,
        'Each face is a square, so the edge is √' + A + ' = ' + s + ' cm. Volume = ' + s + ' × ' + s + ' × ' + s + ' = ' + v + ' cm³.', 'cm³');
      return slips(q, [[6 * A, 'surface-area'], [A * A, 'squared-area'], [3 * A, 'tripled']]);
    }
    const q = finishTyped('A cube has a volume of ' + v + ' cm³. What is the area of one of its faces, in cm²?', A,
      'The edge is ∛' + v + ' = ' + s + ' cm, because ' + s + ' × ' + s + ' × ' + s + ' = ' + v + '. One face is ' + s + ' × ' + s + ' = ' + A + ' cm².', 'cm²');
    return slips(q, [[v / 6, 'divide-by-6'], [s, 'answered-edge'], [v / 3, 'divide-by-3']]);
  }

  /* 2.1 with litres: the height of a tank from its capacity (typed, cm) */
  function gTankHeight() {
    for (let t = 0; t < 400; t++) {
      const l = pick([20, 25, 30, 40, 50, 60]), b = pick([10, 20, 25, 30, 40]), H = ri(10, 60);
      if ((l * b * H) % 1000 || l * b === 1000) continue;   /* base 1000 cm²: the height would equal the litres */
      const N = l * b * H / 1000;
      if (N < 2 || N > 120) continue;
      const stem = 'A rectangular tank with a base of ' + l + ' cm by ' + b + ' cm holds exactly ' + N +
        ' ℓ of water when it is full. What is the height of the tank, in cm? (1 ℓ = 1000 cm³)';
      const q = finishTyped(stem, H, N + ' ℓ = ' + (N * 1000) + ' cm³. Base area = ' + l + ' × ' + b + ' = ' + (l * b) +
        ' cm². Height = ' + (N * 1000) + ' ÷ ' + (l * b) + ' = ' + H + ' cm.', 'cm');
      return slips(q, [[N * 1000 / l, 'divided-once'], [N * 1000 / b, 'divided-once'], [N * 1000 - l * b, 'subtract-instead']]);
    }
    return gHeightFromBase();
  }

  /* ---------------- pool 3: PSLE Paper 2 tanks ---------------- */

  /* All the water in Tank A is poured into Tank B: the new height (typed, cm) */
  function gPourAll() {
    for (let t = 0; t < 400; t++) {
      const a1 = pick([20, 25, 30, 40, 50]), a2 = pick([10, 15, 20, 30, 40]), d1 = ri(6, 40);
      const b1 = pick([20, 25, 30, 40, 50, 60]), b2 = pick([10, 15, 20, 25, 30]);
      if (a1 * a2 === b1 * b2) continue;
      const V = a1 * a2 * d1, B = b1 * b2;
      if (V % B) continue;
      const h = V / B;
      if (h < 3 || h === d1 || h > 60) continue;
      const stem = 'Tank A is a rectangular tank with a base of ' + a1 + ' cm by ' + a2 + ' cm. It contains water to a height of ' + d1 +
        ' cm. All the water in Tank A is poured into an empty rectangular Tank B with a base of ' + b1 + ' cm by ' + b2 +
        ' cm. No water overflows. What is the height of the water in Tank B, in cm?';
      const q = finishTyped(stem, h, 'Water in Tank A = ' + a1 + ' × ' + a2 + ' × ' + d1 + ' = ' + V + ' cm³. The same water fills Tank B, whose base is ' +
        b1 + ' × ' + b2 + ' = ' + B + ' cm². Height = ' + V + ' ÷ ' + B + ' = ' + h + ' cm.', 'cm');
      P2(q, 'Before and after', [
        'The amount of water does not change when it is poured from one tank into the other.',
        'Water in Tank A: ' + a1 + ' × ' + a2 + ' × ' + d1 + ' = ' + V + ' cm³.',
        'Base area of Tank B: ' + b1 + ' × ' + b2 + ' = ' + B + ' cm².',
        'Height of the water in Tank B: ' + V + ' ÷ ' + B + ' = <b>' + h + '</b> cm.'
      ]);
      return slips(q, [[d1, 'height-unchanged'], [V / b1, 'divided-once'], [V / b2, 'divided-once'], [V, 'answered-volume']]);
    }
    return gCubeSinks();
  }

  /* Water is poured from Tank A into Tank B until B reaches a depth: height left in A */
  function gPourUntil() {
    const who = pick(NAMES);
    for (let t = 0; t < 600; t++) {
      const a1 = pick([30, 40, 50, 60]), a2 = pick([20, 25, 30, 40]), dA = ri(20, 50);
      const b1 = pick([20, 25, 30, 40]), b2 = pick([10, 15, 20, 25]), dB = ri(5, 30);
      const A = a1 * a2, B = b1 * b2, moved = B * dB;
      if (moved % A) continue;
      const drop = moved / A, left = dA - drop;
      if (drop < 2 || left < 4 || left === dB || drop === dB) continue;
      const stem = 'Tank A is a rectangular tank with a base of ' + a1 + ' cm by ' + a2 + ' cm, and it contains water to a height of ' + dA +
        ' cm. ' + who + ' pours some of the water into an empty rectangular Tank B with a base of ' + b1 + ' cm by ' + b2 +
        ' cm until the water in Tank B is ' + dB + ' cm high. What is the height of the water left in Tank A, in cm?';
      const q = finishTyped(stem, left, 'Water poured = ' + b1 + ' × ' + b2 + ' × ' + dB + ' = ' + moved + ' cm³. In Tank A that is ' + moved + ' ÷ ' + A +
        ' = ' + drop + ' cm of water, so the height left is ' + dA + ' − ' + drop + ' = ' + left + ' cm.', 'cm');
      P2(q, 'Before and after', [
        'The water that leaves Tank A is the water that ends up in Tank B.',
        'Water in Tank B: ' + b1 + ' × ' + b2 + ' × ' + dB + ' = ' + moved + ' cm³.',
        'Base area of Tank A: ' + a1 + ' × ' + a2 + ' = ' + A + ' cm², so the water in Tank A falls by ' + moved + ' ÷ ' + A + ' = ' + drop + ' cm.',
        'Height left in Tank A: ' + dA + ' − ' + drop + ' = <b>' + left + '</b> cm.'
      ]);
      return slips(q, [[dA - dB, 'heights-subtracted'], [drop, 'answered-change'], [dB, 'answered-other-tank']]);
    }
    return gPourAll();
  }

  /* 2.3 with litres: N litres more fill the tank to the brim; the height of the water now
     (typed, cm). The unknown is a dimension (P6), not a volume (P5). A base of 1000 cm² is
     left out: there the empty height equals the litres. */
  function gLitresToFill() {
    for (let t = 0; t < 600; t++) {
      const l = pick([30, 40, 50, 60, 80]), b = pick([20, 25, 30, 40, 50]), H = pick([30, 40, 45, 50, 60]), d = ri(5, H - 5);
      const A = l * b, need = A * (H - d);
      if (need % 1000 || A === 1000) continue;
      const N = need / 1000, e = H - d;
      if (N === d || N === e) continue;
      const stem = 'A rectangular tank measures ' + l + ' cm by ' + b + ' cm by ' + H + ' cm high. It is partly filled with water. ' + N +
        ' ℓ more water is needed to fill the tank to the brim. What is the height of the water in the tank now, in cm? (1 ℓ = 1000 cm³)';
      const q = finishTyped(stem, d, N + ' ℓ = ' + need + ' cm³. The empty part is ' + need + ' ÷ (' + l + ' × ' + b + ') = ' + e + ' cm high, so the water is ' +
        H + ' − ' + e + ' = ' + d + ' cm high.', 'cm');
      P2(q, 'Work backwards', [
        '1 ℓ is 1000 cm³, so the water still needed is ' + N + ' × 1000 = ' + need + ' cm³.',
        'Base area of the tank: ' + l + ' × ' + b + ' = ' + A + ' cm².',
        'The empty part at the top is ' + need + ' ÷ ' + A + ' = ' + e + ' cm high.',
        'Height of the water now: ' + H + ' − ' + e + ' = <b>' + d + '</b> cm.'
      ]);
      return slips(q, [[e, 'answered-empty-part'], [H - N, 'not-converted'], [N, 'not-converted']]);
    }
    return gPourAll();
  }

  /* A cube sinks in a tank and the water rises: the edge of the cube (typed, cm) */
  /* every (edge, length, breadth) where a cube of that edge, fully under water, raises the
     level by a whole number of cm and fits flat in the tank. Grouped by edge so that an
     edge is picked uniformly first, then a tank (a flat pick made 12 the key half the time).
     A prime edge (7, 11, 13, 17, 19) has no such tank, so it cannot occur. */
  const SINKS = {};
  for (let e = 5; e <= 20; e++) for (let l = 8; l <= 60; l++) for (let b = 8; b <= l; b++) {
    const v = e * e * e;
    if (v % (l * b) || e >= b) continue;
    const r = v / (l * b);
    if (r >= 1 && r <= 12) (SINKS[e] = SINKS[e] || []).push([l, b, r]);
  }
  const SINK_EDGES = Object.keys(SINKS).map(Number);

  /* A cube sinks in a tank and the water rises: the edge of the cube (typed, cm) */
  function gCubeSinks() {
    const e = pick(SINK_EDGES), [l, b, r] = pick(SINKS[e]), v = e * e * e;
    const d1 = ri(Math.max(5, e - r + 2), e + 20), d2 = d1 + r;
    if (d2 === e || r === e) return gCubeSinks();
    const stem = 'A rectangular tank with a base of ' + l + ' cm by ' + b + ' cm contains water to a height of ' + d1 +
      ' cm. A solid metal cube is put into the tank and sinks to the bottom, completely under water. The water level rises to ' +
      d2 + ' cm. No water overflows. What is the length of one edge of the cube, in cm?';
    const q = finishTyped(stem, e, 'The water rises ' + d2 + ' − ' + d1 + ' = ' + r + ' cm, so the cube takes up ' + l + ' × ' + b + ' × ' + r + ' = ' + v +
      ' cm³. ' + e + ' × ' + e + ' × ' + e + ' = ' + v + ', so the edge is ∛' + v + ' = ' + e + ' cm.', 'cm');
    P2(q, 'Work backwards', [
      'The water rises by ' + d2 + ' − ' + d1 + ' = ' + r + ' cm.',
      'The water that rose takes up the same space as the cube: ' + l + ' × ' + b + ' × ' + r + ' = ' + v + ' cm³.',
      'Find the edge: the number that, multiplied by itself three times, makes ' + v + '. Try ' + e + ': ' + e + ' × ' + e + ' × ' + e + ' = ' + v + '.',
      'So the edge is ∛' + v + '. Check: ' + v + ' ÷ ' + e + ' ÷ ' + e + ' = <b>' + e + '</b> cm.'
    ]);
    return slips(q, [[r, 'answered-change'], [v, 'answered-volume'], [v / 3, 'divide-by-3'], [d2, 'answered-given']]);
  }

  MQI.registerTopic({
    id: 'p6volume', level: 'P6', strand: 'Measurement and Geometry',
    moeSubTopic: 'Volume of Cube and Cuboid: finding one dimension of a cuboid given its volume and the other dimensions; finding the length of one edge of a cube given its volume; finding the height of a cuboid given its volume and base area; finding the area of a face of a cuboid given its volume and one dimension; use of √, ∛',
    label: 'Cube Root Cove', short: 'Volume (P6)', e: '📦',
    skills: {
      dimension: { label: 'Missing edge of a cuboid', tip: 'Volume is length × breadth × height, so divide the volume by the edges you know.' },
      cube:      { label: 'Edge of a cube', tip: 'Ask: which number times itself three times makes the volume? Check 5 × 5 × 5, 10 × 10 × 10 first.' },
      face:      { label: 'Area of a face', tip: 'Volume ÷ height is the area of the base: the face the height stands on.' },
      roots:     { label: 'Square and cube roots', tip: 'Learn the squares up to 15 × 15 and the cubes up to 10 × 10 × 10 by heart.' },
      tank:      { label: 'Water in tanks', tip: 'When water is poured, its volume stays the same. Find the volume first, then divide by the new base area.' }
    },
    misconceptions: {
      'divide-by-3':          'Divides the volume by 3 to find the edge of a cube (or reads ∛ as ÷ 3).',
      'face-area':            'Gives the area of one face of the cube instead of its edge.',
      'root-not-checked':     'Gives a root without multiplying it back to check.',
      'halved':               'Reads √ as "divide by 2".',
      'doubled':              'Doubles the root instead of checking it.',
      'square-not-cube':      'Takes the square root when the cube root is asked.',
      'divided-once':         'Divides the volume by only one edge, which gives the area of a face.',
      'stopped-at-area':      'Multiplies the two given edges and stops at the area.',
      'subtract-instead':     'Takes away instead of dividing to undo the multiplication.',
      'added-dims':           'Adds the given edges instead of multiplying them.',
      'answered-given':       'Gives a number printed in the question.',
      'multiplied-instead':   'Multiplies by the given edge instead of dividing.',
      'squared-height':       'Squares the height instead of dividing the volume by it.',
      'surface-area':         'Multiplies the area of one face by 6 (the total area of the faces) instead of finding the volume.',
      'squared-area':         'Multiplies the face area by itself instead of by the edge.',
      'tripled':              'Multiplies the face area by 3.',
      'divide-by-6':          'Divides the volume by 6, mixing up volume with the 6 faces.',
      'answered-edge':        'Stops at the edge when the area of a face is asked.',
      'height-unchanged':     'Thinks the water keeps its height when it moves to a tank with a different base.',
      'answered-volume':      'Gives the volume when a length is asked.',
      'heights-subtracted':   'Subtracts the heights in two tanks with different bases.',
      'answered-change':      'Gives the rise or fall in the water level instead of the height asked.',
      'answered-other-tank':  'Gives the height of the water in the other tank.',
      'answered-empty-part':  'Gives the height of the empty part of the tank instead of the height of the water.',
      'not-converted':        'Uses the number of litres as if it were cm³ (or cm), without multiplying by 1000.',
      'stopped-at-square':    'Stops at the area of the square base instead of finding the length of its side (√).'
    },
    pools: {
      1: [[gCubeEdge, 'cube'], [gMissingDim, 'dimension'], [gRoot, 'roots']],
      2: [[gHeightFromBase, 'dimension'], [gFaceArea, 'face'], [gCubeFace, 'roots'], [gTankHeight, 'tank']],
      3: [[gPourAll, 'tank'], [gPourUntil, 'tank'], [gLitresToFill, 'tank'], [gCubeSinks, 'cube']]
    }
  });
})();
