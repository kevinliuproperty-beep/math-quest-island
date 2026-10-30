/* P6 VOLUME ORACLE (P5-P6 mirror fan-out, lane m-vol-quads, 2026-10-30).
   Exhaustive for topic p6volume (js/topics/p6-volume.js): every stem must match one of
   the shapes below, or the draw fails. Every key is re-derived from the RENDERED stem by
   SEARCH, never by the generator's division: the missing edge is the whole number x that
   makes the product equal the printed volume, a root is the x with x*x (or x*x*x) equal to
   the printed number, a tank height is the x that makes base x height equal the water's
   volume. MCQs must have EXACTLY ONE option equal to the searched key, every distractor
   must carry a dictionary tag and a coaching line, every draw is syl 'P6', typed slips
   never equal the key, typed items declare the unit the stem asks for, and the Paper 2
   tank items are band 3, exam 'problem' and coached. */
export const topic = 'p6volume';

export function oracle(q, kit) {
  const { strip, TOPICS } = kit;
  const text = strip(q.q);
  const fail = s => 'p6volume: ' + s + ' :: ' + text;
  const MIS = (TOPICS.p6volume && TOPICS.p6volume.misconceptions) || {};
  if (q.syl !== 'P6') return fail('every item must carry syl P6');
  if (!q.typed) {
    for (let i = 0; i < (q.choices || []).length; i++) {
      if (i === q.correct) { if (q.miscon && q.miscon[i] != null) return fail('the key carries a misconception tag'); continue; }
      const t = q.miscon && q.miscon[i];
      if (!t || !MIS[t]) return fail(`distractor ${i} has no misconception tag from the dictionary (${t})`);
      if (!q.optionFeedback || typeof q.optionFeedback[i] !== 'string' || !q.optionFeedback[i].trim()) return fail(`distractor ${i} has no coaching line`);
    }
  } else {
    if (!q.slips || !Object.keys(q.slips).length) return fail('a typed item carries no slips');
    for (const [v, t] of Object.entries(q.slips)) {
      if (Number(v) === q.answer) return fail('a slip equals the key');
      if (!MIS[t]) return fail(`slip tag ${t} is not in the dictionary`);
    }
  }
  const search = (pred, hi = 5000) => { const out = []; for (let x = 1; x <= hi; x++) if (pred(x)) out.push(x); return out; };
  const one = (sols, what) => sols.length === 1 ? null : fail(`${sols.length} whole-number values of ${what}`);
  /* MCQ: exactly one option is the key, and every option carries the same unit */
  const mcqCheck = (key, unit) => {
    if (q.typed) return fail('expected a multiple-choice item');
    const parsed = q.choices.map(c => { const m = strip(c).match(/^(\d+)(?: (cm))?$/); return m && (m[2] || '') === unit ? Number(m[1]) : null; });
    if (parsed.some(v => v === null)) return fail(`an option is not a whole number in "${unit}"`);
    const hits = parsed.map((v, i) => v === key ? i : -1).filter(i => i >= 0);
    if (hits.length !== 1) return fail(`${hits.length} options equal ${key}`);
    return hits[0] === q.correct ? null : fail(`key is option ${q.correct}, the value ${key} is option ${hits[0]}`);
  };
  const typedCheck = (key, unit) => {
    if (!q.typed) return fail('expected a typed item');
    if (q.unit !== unit) return fail(`declares unit ${JSON.stringify(q.unit)}, the stem asks for ${unit}`);
    return q.answer === key ? null : fail(`expected ${key}, got ${q.answer}`);
  };
  const paper2 = () => {
    if (q.band !== 3 || q.exam !== 'problem') return fail('a Paper 2 tank problem is band 3 and exam:problem');
    if (!q.technique || !Array.isArray(q.steps) || q.steps.length < 3 || q.steps.length > 5) return fail('a Paper 2 problem must be coached');
    return null;
  };
  let m, s;

  if ((m = text.match(/^(?:A cube|A cube-shaped box|A solid metal cube|A cube of wood) has a volume of (\d+) cm³\. What is the length of one edge of the cube\?$/))) {
    const sols = search(x => x * x * x === +m[1], 200);
    return one(sols, 'the edge') || mcqCheck(sols[0], 'cm');
  }
  if ((m = text.match(/^A cuboid has a volume of (\d+) cm³\. Its (length|breadth|height) is (\d+) cm and its (length|breadth|height) is (\d+) cm\. What is its (length|breadth|height)\?$/))) {
    if (new Set([m[2], m[4], m[6]]).size !== 3) return fail('the three edges are not length, breadth and height');
    const sols = search(x => +m[3] * +m[5] * x === +m[1]);
    return one(sols, 'the missing edge') || mcqCheck(sols[0], 'cm');
  }
  if ((m = text.match(/^What is the value of (√|∛)(\d+)\?$/))) {
    const sols = search(x => (m[1] === '√' ? x * x : x * x * x) === +m[2], 400);
    return one(sols, 'the root') || mcqCheck(sols[0], '');
  }
  if ((m = text.match(/^A cuboid has a volume of (\d+) cm³\. The area of its base is (\d+) cm²\. What is its height, in cm\?$/)) ||
      (m = text.match(/^A rectangular container is filled to the brim with (\d+) cm³ of sand\. The area of its base is (\d+) cm²\. How tall is the container, in cm\?$/))) {
    const sols = search(x => +m[2] * x === +m[1]);
    return one(sols, 'the height') || typedCheck(sols[0], 'cm');
  }
  if ((m = text.match(/^A cuboid has a volume of (\d+) cm³ and a height of (\d+) cm\. What is the area of its base, in cm²\?$/)) ||
      (m = text.match(/^A block of ice in the shape of a cuboid has a volume of (\d+) cm³\. It is (\d+) cm tall\. What is the area of its top face, in cm²\?$/))) {
    const sols = search(x => x * +m[2] === +m[1], 20000);
    return one(sols, 'the face area') || typedCheck(sols[0], 'cm²');
  }
  if ((m = text.match(/^The area of one face of a cube is (\d+) cm²\. What is the volume of the cube, in cm³\?$/))) {
    const e = search(x => x * x === +m[1], 200);
    if ((s = one(e, 'the edge'))) return s;
    let vol = 0; for (let k = 0; k < e[0]; k++) vol += +m[1];   /* e layers of the face */
    if (6 * +m[1] === vol || 3 * +m[1] === vol) return fail('the x6 or x3 route also reaches the key');
    return typedCheck(vol, 'cm³');
  }
  if ((m = text.match(/^A cube has a volume of (\d+) cm³\. What is the area of one of its faces, in cm²\?$/))) {
    const e = search(x => x * x * x === +m[1], 200);
    if ((s = one(e, 'the edge'))) return s;
    const face = search(x => x * e[0] === +m[1], 20000);   /* face area x edge = volume */
    if (face.length === 1 && (+m[1] / 6 === face[0] || +m[1] / 3 === face[0])) return fail('the /6 or /3 route also reaches the key');
    return one(face, 'the face') || typedCheck(face[0], 'cm²');
  }
  if ((m = text.match(/^A rectangular tank with a base of (\d+) cm by (\d+) cm holds exactly (\d+) ℓ of water when it is full\. What is the height of the tank, in cm\? \(1 ℓ = 1000 cm³\)$/))) {
    const sols = search(x => +m[1] * +m[2] * x === +m[3] * 1000);
    if (+m[1] * +m[2] === 1000) return fail('a 1000 cm² base makes the height equal the litres');
    return one(sols, 'the height') || typedCheck(sols[0], 'cm');
  }
  if ((m = text.match(/^Tank A is a rectangular tank with a base of (\d+) cm by (\d+) cm\. It contains water to a height of (\d+) cm\. All the water in Tank A is poured into an empty rectangular Tank B with a base of (\d+) cm by (\d+) cm\. No water overflows\. What is the height of the water in Tank B, in cm\?$/))) {
    const water = +m[1] * +m[2] * +m[3];
    const sols = search(x => +m[4] * +m[5] * x === water);
    return one(sols, 'the new height') || paper2() || typedCheck(sols[0], 'cm');
  }
  if ((m = text.match(/^Tank A is a rectangular tank with a base of (\d+) cm by (\d+) cm, and it contains water to a height of (\d+) cm\. [A-Z][a-z]+(?: [A-Z][a-z]+)? pours some of the water into an empty rectangular Tank B with a base of (\d+) cm by (\d+) cm until the water in Tank B is (\d+) cm high\. What is the height of the water left in Tank A, in cm\?$/))) {
    const A = +m[1] * +m[2], dA = +m[3], inB = +m[4] * +m[5] * +m[6];
    const sols = []; for (let x = 0; x < dA; x++) if (A * dA - A * x === inB) sols.push(x);   /* x = height left */
    if (sols.length === 1 && sols[0] < 1) return fail('Tank A is emptied');
    return one(sols, 'the height left') || paper2() || typedCheck(sols[0], 'cm');
  }
  if ((m = text.match(/^A rectangular tank measures (\d+) cm by (\d+) cm by (\d+) cm high\. It is partly filled with water\. (\d+) ℓ more water is needed to fill the tank to the brim\. What is the height of the water in the tank now, in cm\? \(1 ℓ = 1000 cm³\)$/))) {
    const l = +m[1], b = +m[2], H = +m[3], N = +m[4];
    const sols = []; for (let d = 1; d < H; d++) if (l * b * d + N * 1000 === l * b * H) sols.push(d);   /* water now + water needed = full tank */
    if (l * b === 1000) return fail('a 1000 cm² base makes the empty height equal the litres');
    return one(sols, 'the water height') || paper2() || typedCheck(sols[0], 'cm');
  }
  if ((m = text.match(/^A cuboid has a square base\. Its volume is (\d+) cm³ and its height is (\d+) cm\. What is the length of one side of its base, in cm\?$/))) {
    const sols = search(x => x * x * +m[2] === +m[1], 200);
    return one(sols, 'the side') || typedCheck(sols[0], 'cm');
  }
  if ((m = text.match(/^A rectangular tank with a base of (\d+) cm by (\d+) cm contains water to a height of (\d+) cm\. A solid metal cube is put into the tank and sinks to the bottom, completely under water\. The water level rises to (\d+) cm\. No water overflows\. What is the length of one edge of the cube, in cm\?$/))) {
    const d1 = +m[3], d2 = +m[4];
    if (d2 <= d1) return fail('the water does not rise');
    const sols = search(e => e * e * e === +m[1] * +m[2] * (d2 - d1), 200);
    if (sols.length === 1 && sols[0] >= d2) return fail('the cube is taller than the water: it cannot be completely under water');
    if (sols.length === 1 && (sols[0] >= +m[1] || sols[0] >= +m[2])) return fail('the cube does not fit flat in the tank');
    return one(sols, 'the edge') || paper2() || typedCheck(sols[0], 'cm');
  }
  return fail('no oracle matched this stem - every p6volume stem must ship its oracle');
}
