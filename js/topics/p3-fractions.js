"use strict";
/* Math Quest Island topic: fractions (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 *
 * DEPTH SWEEP 2026-09-15 (Kevin's Q114 "Reshape": the depth-pilot contract goes
 * wide). Rebuilt from 12 generators / 22 masked shapes to 25 generators arranged
 * as FOUR PRINCIPLES, each with a bank of formats a teacher would rotate through:
 * direct compute, inverse, compare, error spotting with a NAMED misconception,
 * word problem in a Singapore context, working backwards, concept check, mixed
 * principle.
 *
 * The audit's three findings on this file are the brief:
 *   - gPickEquiv ("Which fraction is equivalent to n/d?") WAS the whole
 *     `equivalent` skill in pools 2 and 3 (worst-ten #8). It is now one of five
 *     equivalence formats and sits in pool 2 only.
 *   - gSimplest WAS the sole occupant of `fractions/simplest`, one step, in the
 *     hardest pool (worst-ten #9). It has moved DOWN to pool 2, and the simplest
 *     skill now carries two two-step pool-3 formats instead
 *     (gAlreadySimplest, gSimplestError).
 *   - pool 3 added no solving step in 5 of 6 slots. Pool 3 is now 10 slots, 8 of
 *     them two-step, with two DECLARED single-step anchors (gMakeOne, gGreatest4)
 *     kept on purpose per the pilot's contract note 2.
 *
 * THE FOUR PRINCIPLES
 *  1. WHAT A FRACTION NAMES. A fraction names equal parts of one whole: the
 *     bottom number says how many EQUAL parts the whole was cut into, the top
 *     number how many of them you have.
 *       gPicIdentify, gEqualParts, gPicUnshaded
 *  2. EQUIVALENCE AND SIMPLEST FORM ARE ONE IDEA. Multiplying top and bottom by
 *     the same number cuts every part into smaller ones; dividing them groups
 *     parts back together. The amount never changes. Simplest form is that idea
 *     taken as far as it will go — and it is DIVIDING, never subtracting.
 *       gEquivFromBar, gEqMissing, gEqMissingDen, gPickEquiv,
 *       gSimplest, gAlreadySimplest, gSimplestError
 *  3. COMPARING AND ORDERING. Same bottom number -> the pieces are the same size,
 *     so compare the tops. Same top number -> the bigger the bottom number, the
 *     more parts the whole was cut into and the SMALLER each piece.
 *       gCompareUnit, gCompareBar, gCompareSameD, gCompareWords,
 *       gCompareError, gGreatest4, gOrderThree
 *  4. ADDING AND SUBTRACTING WITHIN ONE WHOLE. The bottom number is the SIZE of
 *     the piece, so it does not move; only the tops are counted. When the pieces
 *     are different sizes (related fractions), change one fraction into an
 *     equivalent one first.
 *       gAddSame, gSubSame, gSubFromOne, gMakeOne,
 *       gAddRelated, gSubRelated, gAddError, gAddWords
 *
 * SCOPE (MOE Oct 2025, P3 p.36, NUMBER AND ALGEBRA / FRACTIONS):
 *   equivalent fractions; comparing and ordering unlike fractions; addition and
 *   subtraction of like and related fractions within one whole. Denominators run
 *   to 12 and every fraction a child works with is proper.
 *   NOT HERE, on purpose: fraction of a SET of objects, mixed numbers and
 *   improper fractions (all MOE P4, and js/topics/p4-fractions.js already carries
 *   them — the second depth-pilot refutation killed exactly this kind of leak in
 *   the other direction). The one deliberate look BACKWARDS is gPicIdentify /
 *   gEqualParts, naming a fraction of a whole from a picture: that is P2 content,
 *   kept as the declared pool-1 fluency anchor for this topic.
 *
 * DEFECT CLASSES PRE-EMPTED (Depth Pilot Refutation 2026-09-05, both passes):
 *   - self-contradicting stems: every error-spotting stem's printed claim is
 *     re-derived by the harness and must map to exactly ONE named misconception
 *     and never to the true answer.
 *   - two defensible options: slipsOk() rejects any draw where a named distractor
 *     is EQUIVALENT to the key (3/6 beside 1/2), which is the fraction form of
 *     the coincidence ban. buildFracChoices refuses the same by value, so a
 *     padded option can never appear either.
 *   - number coincidences: no fraction item may print two options worth the same
 *     amount; no "simplest form" key may itself be reducible.
 *   - format tells: `fractions` joins PILOT_TOPICS in tools/gen-sanity.mjs, so
 *     the one-odd-option-out rule now binds here. Every option set in this file
 *     is four fractions, four bare numbers, or four sentences.
 *   - wording inversions: a comparison stem must say the wholes are the SAME
 *     SIZE, and an ordering stem's key must run in the direction it asks for.
 *     Both gated.
 *   - padded distractors: every MC here is exactly key + three AUTHORED named
 *     misconceptions, stamped on q.authoredFrac / q.authored and asserted by the
 *     harness. Nothing is ever filled in by the padding branch.
 *
 * Every stem is re-derived from its RENDERED text by an oracle in
 * tools/gen-sanity.mjs; nothing is trusted from the generator's own answerText.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

/* ---- figures leave this file as PURE DATA; js/figures.js draws them ----------
   Spec: { type:'fractionBar', parts, filled } - see js/topics/README.md. It is
   the one fraction figure the renderer owns, and all three picture formats here
   reuse it rather than inventing a second bar model. */
const fig = (q, figure) => (q.figure = figure, q);
const bar = (parts, filled) => ({ type:'fractionBar', parts, filled });

/* A fraction with a '?' in one place. The three spans are the SAME three core.js
   fr() builds, so they stay inside the harness's inline-markup allowlist. */
const frQn = d => '<span class="frac"><span class="n">?</span><span class="d">' + d + '</span></span>';
const frQd = n => '<span class="frac"><span class="n">' + n + '</span><span class="d">?</span></span>';

/* ---- THE COINCIDENCE BAN, in its fraction form -----------------------------
   The perimeter/area ban asked "do two different measurements print the same
   number?". Its fraction twin is "do two options name the same AMOUNT?" - 3/6
   beside 1/2 is two right answers to a child who can reduce, and a duplicate
   option to one who cannot. legalFrac also holds the syllabus line: every
   fraction a child WORKS with is proper with a denominator to 12. A named
   misconception may print a denominator past 12 (adding the bottoms really does
   give 5/14) because that IS the mistake; 24 is the readability cap. */
function legalFrac(p){
  return Array.isArray(p) && p.length === 2 &&
         Number.isInteger(p[0]) && Number.isInteger(p[1]) &&
         p[0] >= 1 && p[1] >= 2 && p[0] < p[1] && p[1] <= 24;
}
const sameVal = (a, b) => a[0] * b[1] === b[0] * a[1];
/* Exactly three named misconceptions, all legal, none worth what the key is
   worth, none worth what another is worth. When this holds, buildFracChoices
   takes all three and finishFrac's padding branch never fires - which is what
   makes the authored-distractor contract bind on EVERY draw (refutation §6). */
function slipsOk(key, slips){
  if (!legalFrac(key)) return false;
  if (!Array.isArray(slips) || slips.length !== 3) return false;
  const seen = [key];
  for (const s of slips){
    if (!legalFrac(s)) return false;
    if (seen.some(t => sameVal(t, s))) return false;
    seen.push(s);
  }
  return true;
}
/* Fraction MC through the house helper, with the authored list stamped. */
function mcFrac(stem, key, slips, explain){
  const q = finishFrac(stem, '', key, slips, explain);
  q.authoredFrac = slips.map(s => [s[0], s[1]]);
  return q;
}
/* Numeric MC. Same contract, same shape as the pilot's mcNum. */
function numsOk(correct, cands){
  if (!Number.isInteger(correct) || correct <= 0) return false;
  if (!Array.isArray(cands) || cands.length !== 3) return false;
  const s = new Set([correct]);
  for (const c of cands){
    if (!Number.isInteger(c) || c <= 0 || s.has(c)) return false;
    s.add(c);
  }
  return true;
}
function mcNum(stem, correct, cands, explain){
  const q = finishNum(stem, '', correct, cands, '', explain);
  q.authored = cands.slice();
  return q;
}
/* Word-answer MC (concept checks, error diagnosis). Distractors are hand-written
   misconceptions, so they are distinct by authoring, not by arithmetic. */
function mcText(stem, correctText, wrongs, explain){
  const opts = shuffle([correctText].concat(wrongs.slice(0, 3)));
  return { q: stem, extra: '', choices: opts, correct: opts.indexOf(correctText),
           explain: explain, answerText: correctText };
}

/* ---- Singapore contexts. Short lists on purpose: the pilot's rubric lesson 1
   is that a long context list inflates the masked shape count without adding a
   single new structure, so variety here is bought with FORMATS, not nouns. ---- */
const CAKES = ['kueh lapis', 'pandan chiffon cake', 'pizza at the hawker centre'];
/* [name, sentence-start pronoun, mid-sentence pronoun] */
const KIDS = [['Siti','She','she'], ['Kumar','He','he'], ['Mei Ling','She','she'],
              ['Ravi','He','he'], ['Aisyah','She','she'], ['Wei Jie','He','he']];
/* single-token names only: gCompareWords' oracle reads "Name ate <frac>" pairs
   off the rendered markup, and a two-word name would split the walk. */
const SOLO = ['Siti', 'Kumar', 'Ravi', 'Aisyah', 'Devi', 'Hafiz'];

/* every proper fraction in its simplest form with a denominator to 6: the family
   heads the equivalence bank scales up from. */
const SIMPLE = [[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6]];
const scalesFor = d => { const ks = []; for (let k = 2; k <= 4; k++) if (k * d <= 12) ks.push(k); return ks; };


/* ===========================================================================
   PRINCIPLE 1 - WHAT A FRACTION NAMES
   =========================================================================== */

/* FORMAT 1a - direct read off a picture (pool 1, 1 step). THE DECLARED ANCHOR of
   pool 1: one fluency item per pool is deliberate, per the pilot's contract
   note 2. */
function gPicIdentify(){
  let d = 8, n = 3, key = [3,8], slips = [[5,8],[3,7],[4,8]], g = 0;
  do {
    d = ri(3,12); n = ri(1,d-1);
    key = [n,d];
    slips = [[d-n,d], [n,d-1], [n+1,d]];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ d = 8; n = 3; key = [3,8]; slips = [[5,8],[3,7],[4,8]]; }
  return fig(mcFrac('What fraction of the bar is <b>blue</b>?', key, slips,
    'The bar is cut into ' + d + ' equal parts, and ' + n + ' of those parts ' + (n === 1 ? 'is' : 'are') + ' blue. ' +
    n + ' out of ' + d + ' equal parts is ' + fr(n,d) + '. Count all the parts first for the bottom number, ' +
    'then count only the blue ones for the top number. ' + fr(d-n,d) + ' is the part that is NOT blue.'),
    bar(d, n));
}

/* FORMAT 1b - concept check: the parts must be EQUAL (pool 1, 1 step).
   Nothing in the shipped bank asked this, and it is the idea every later
   fraction rests on. */
function gEqualParts(){
  const k = pick(KIDS), cake = pick(CAKES);
  const d = ri(4,12);
  const key = 'The pieces are not all the same size, so 1 piece is not 1 out of ' + d + ' equal parts.';
  const wrongs = [
    'Nothing is wrong: 1 piece out of ' + d + ' pieces is always ' + fr(1,d) + ' of it.',
    'The bottom number should be the number of pieces ' + k[2] + ' did not take.',
    'A fraction can only be written when the whole is cut into an even number of pieces.'
  ];
  /* The context is named once. Printing it a second time gave "1/5 of the pizza
     at the hawker centre", which is a mouthful a P3 child reads twice. */
  return mcText(k[0] + ' cuts a ' + cake + ' into ' + d + ' pieces, but the pieces are <b>not</b> all the same size. ' +
    k[1] + ' takes 1 piece. <b>Why can ' + k[2] + ' not call that piece ' + fr(1,d) + ' of it?</b>',
    key, wrongs,
    'A fraction only names a part of a whole when the whole has been cut into EQUAL parts. ' +
    fr(1,d) + ' means one out of ' + d + ' parts that are all the same size. ' +
    'Here the ' + d + ' pieces are different sizes, so one of them is not ' + fr(1,d) + ' of the whole.');
}

/* FORMAT 1c - the complement, off the same picture (pool 2, 2 steps: read the
   shaded fraction, then take it from one whole). */
function gPicUnshaded(){
  let d = 8, n = 3, key = [5,8], slips = [[3,8],[6,8],[5,7]], g = 0;
  do {
    d = ri(4,12); n = ri(2,d-2);
    key = [d-n,d];
    slips = [[n,d], [d-n+1,d], [d-n,d-1]];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ d = 8; n = 3; key = [5,8]; slips = [[3,8],[6,8],[5,7]]; }
  return fig(mcFrac('What fraction of the bar is <b>not</b> blue?', key, slips,
    'Step 1: the bar is cut into ' + d + ' equal parts and ' + n + ' are blue, so the blue part is ' + fr(n,d) + '. ' +
    'Step 2: the whole bar is ' + fr(d,d) + ', so the part that is not blue is ' + d + ' − ' + n + ' = ' + (d-n) +
    ' parts, which is ' + fr(d-n,d) + '. ' + fr(n,d) + ' is the blue part, not the answer.'),
    bar(d, n));
}


/* ===========================================================================
   PRINCIPLE 2 - EQUIVALENCE AND SIMPLEST FORM ARE ONE IDEA
   =========================================================================== */

/* FORMAT 2a - equivalence WITH pictorial support (pool 1, 1 step). The bar is
   drawn in the big pieces; the child names the same amount in small ones. */
function gEquivFromBar(){
  let n = 3, d = 4, k = 2, key = [3,4], slips = [[5,6],[3,8],[7,8]], g = 0;
  do {
    const b = pick(SIMPLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    key = [n,d];
    slips = [[n+k, d+k], [n, k*d], [k*n+1, k*d]];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ n = 3; d = 4; k = 2; key = [3,4]; slips = [[5,6],[3,8],[7,8]]; }
  return fig(mcFrac('The bar below is cut into ' + (k*d) + ' equal parts, and ' + (k*n) +
    ' of them are blue. Which fraction is <b>equivalent</b> to the blue fraction?', key, slips,
    'The blue part is ' + (k*n) + ' out of ' + (k*d) + ' parts, which is ' + fr(k*n, k*d) + '. ' +
    'Now group the small parts back together in ' + k + 's: ' + (k*n) + ' ÷ ' + k + ' = ' + n + ' and ' +
    (k*d) + ' ÷ ' + k + ' = ' + d + ', so the same amount of bar is also ' + fr(n,d) + '. ' +
    'Adding ' + k + ' to the top and the bottom would give ' + fr(n+k, d+k) + ', which is a different amount.'),
    bar(k*d, k*n));
}

/* FORMAT 2b - inverse: the missing numerator (pool 2, 1 step). */
function gEqMissing(){
  let n = 1, d = 2, k = 2, key = 2, slips = [3,4,1], g = 0;
  do {
    const b = pick(SIMPLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    key = k*n;
    slips = [n + d*(k-1), n + k, n];
    g++;
  } while (g < 200 && !numsOk(key, slips));
  if (!numsOk(key, slips)){ n = 1; d = 2; k = 3; key = 3; slips = [5,4,1]; }
  return mcNum(fr(n,d) + ' = ' + frQn(k*d) + ' &nbsp; What is the missing <b>numerator</b>?',
    key, slips,
    'The bottom number was multiplied by ' + k + ' (' + d + ' × ' + k + ' = ' + (k*d) + '), ' +
    'because every part was cut into ' + k + ' smaller ones. So the top number must be multiplied by ' + k +
    ' as well: ' + n + ' × ' + k + ' = ' + key + '. Adding ' + (d*(k-1)) + ' to the top instead gives ' +
    (n + d*(k-1)) + ', which is a different amount.');
}

/* FORMAT 2c - the same inverse from the other end: the missing denominator
   (pool 2, 1 step). Same principle, and the child must spot the multiplier from
   the TOP line instead of the bottom one. */
function gEqMissingDen(){
  let n = 1, d = 2, k = 2, key = 4, slips = [3,4,2], g = 0;
  do {
    const b = pick(SIMPLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    key = k*d;
    slips = [d + n*(k-1), d + k, d];
    g++;
  } while (g < 200 && !numsOk(key, slips));
  if (!numsOk(key, slips)){ n = 3; d = 4; k = 3; key = 12; slips = [10,7,4]; }
  return mcNum(fr(n,d) + ' = ' + frQd(k*n) + ' &nbsp; What is the missing <b>denominator</b>?',
    key, slips,
    'The top number was multiplied by ' + k + ' (' + n + ' × ' + k + ' = ' + (k*n) + '), ' +
    'so the bottom number must be multiplied by ' + k + ' too: ' + d + ' × ' + k + ' = ' + key + '. ' +
    'Leaving the bottom at ' + d + ' would make the fraction ' + k + ' times bigger, not the same amount.');
}

/* FORMAT 2d - recognise an equivalent fraction (pool 2, 1 step). The audit's
   worst-ten #8: this ONE stem used to be the whole equivalence skill in two
   pools. It is now one of five formats, in one pool, and its three distractors
   are named beliefs instead of arbitrary near misses. */
function gPickEquiv(){
  let n = 1, d = 2, k = 2, key = [2,4], slips = [[3,4],[1,4],[3,4]], g = 0;
  do {
    const b = pick(SIMPLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    key = [k*n, k*d];
    slips = [[n+k, d+k], [n, k*d], [k*n+1, k*d]];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ n = 1; d = 2; k = 3; key = [3,6]; slips = [[4,5],[1,6],[4,6]]; }
  return mcFrac('Which fraction is <b>equivalent</b> to ' + fr(n,d) + '?', key, slips,
    'Cut every part into ' + k + ' smaller ones: multiply the top AND the bottom by ' + k + '. ' +
    n + ' × ' + k + ' = ' + (k*n) + ' and ' + d + ' × ' + k + ' = ' + (k*d) + ', so ' + fr(n,d) + ' = ' +
    fr(k*n, k*d) + '. Adding ' + k + ' to both instead gives ' + fr(n+k, d+k) +
    ', and multiplying only the bottom gives ' + fr(n, k*d) + '. Neither is the same amount.');
}

/* FORMAT 2e - simplest form (pool 2, 1 step). Moved DOWN out of pool 3, which is
   the audit's worst-ten #9 closed: a one-step item does not belong in the
   hardest pool when the skill has two-step formats available. */
function gSimplest(){
  let n = 2, d = 3, k = 2, N = 4, D = 6, t = 2, key = [2,3], slips = [[2,4],[2,6],[1,3]], g = 0;
  do {
    const b = pick(SIMPLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    N = k*n; D = k*d;
    t = n >= 2 ? k : 1;
    key = [n,d];
    slips = [[N-t, D-t], [n, D], (n+1 < d ? [n+1, d] : [n, d+1])];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ n = 2; d = 3; k = 2; N = 4; D = 6; key = [2,3]; slips = [[2,4],[2,6],[1,3]]; }
  return mcFrac('Express ' + fr(N,D) + ' in its <b>simplest form</b>.', key, slips,
    'Simplest form means dividing the top and the bottom by the same number until you cannot go any further. ' +
    N + ' ÷ ' + k + ' = ' + n + ' and ' + D + ' ÷ ' + k + ' = ' + d + ', so ' + fr(N,D) + ' = ' + fr(n,d) +
    '. It is the same amount, written with bigger parts. Dividing only the top would give ' + fr(n,D) +
    ', which is a smaller amount.');
}

/* FORMAT 2f - negative form: which one is ALREADY simplest (pool 3, 2 steps).
   Four fractions have to be tested, not one. */
const REDUCIBLE = [];
for (let q2 = 4; q2 <= 12; q2++) for (let p = 2; p < q2; p++) if (gcd(p, q2) > 1) REDUCIBLE.push([p, q2]);
function gAlreadySimplest(){
  let key = [3,4], slips = [[2,4],[4,6],[6,8]], g = 0;
  do {
    key = pick(SIMPLE.filter(b => b[1] >= 3));
    const bank = shuffle(REDUCIBLE);
    slips = [];
    for (const c of bank){
      if (slips.length >= 3) break;
      if (sameVal(c, key)) continue;
      if (slips.some(s => sameVal(s, c))) continue;
      slips.push(c);
    }
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ key = [3,4]; slips = [[2,4],[4,6],[6,8]]; }
  const why = slips.map(s => fr(s[0],s[1]) + ' divides by ' + gcd(s[0],s[1])).join(', ');
  return mcFrac('Which of these fractions is <b>already</b> in its simplest form?', key, slips,
    'Test each one: is there a number that divides into the top AND the bottom? ' + why +
    '. Only ' + fr(key[0], key[1]) + ' has nothing left to divide by, so it is already in its simplest form.');
}

/* FORMAT 2g - error spotting, CORRECT the mistake (pool 3, 2 steps). The named
   misconception the brief asks for: simplifying by SUBTRACTING. The printed
   claim is re-derived by the harness and must never be the true answer. */
function gSimplestError(){
  let n = 2, d = 3, k = 2, N = 4, D = 6, t = 1, kid = KIDS[0];
  let key = [2,3], slips = [[3,5],[2,6],[3,6]], g = 0;
  do {
    const b = pick(SIMPLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    N = k*n; D = k*d;
    /* The amount taken away is 1, 2 or the true common factor - the three a child
       actually writes. A free ri(1, N-1) drew "took 5 away from the top", which is
       arithmetically consistent and pedagogically nonsense. */
    const ts = [1, 2, k].filter(x => x >= 1 && x < N && x <= D-2);
    t = ts.length ? pick(ts) : 1;
    key = [n,d];
    slips = [[N-t, D-t], [n, D], [N-t, D]];
    g++;
  } while (g < 200 && !(t < N && t <= D-2 && slipsOk(key, slips)));
  if (!(t < N && t <= D-2 && slipsOk(key, slips))){
    n = 2; d = 3; k = 2; N = 4; D = 6; t = 1; key = [2,3]; slips = [[3,5],[2,6],[3,6]];
  }
  kid = pick(KIDS);
  return mcFrac(kid[0] + ' says ' + fr(N,D) + ' in its simplest form is ' + fr(N-t, D-t) + ', because ' +
    kid[2] + ' took ' + t + ' away from the top and ' + t + ' away from the bottom. <b>What is ' + fr(N,D) +
    ' in its simplest form?</b>', key, slips,
    'Taking the same number away from the top and the bottom changes the amount. ' + fr(N,D) + ' is ' +
    'not ' + fr(N-t, D-t) + '. To simplify you DIVIDE both by the same number: ' + N + ' ÷ ' + k + ' = ' + n +
    ' and ' + D + ' ÷ ' + k + ' = ' + d + ', so ' + fr(N,D) + ' = ' + fr(n,d) + '.');
}


/* ===========================================================================
   PRINCIPLE 3 - COMPARING AND ORDERING
   =========================================================================== */

/* Four fractions with four DIFFERENT values, in one of the three P3 arrangements.
   Unlike values are what makes exactly one option the extreme; the guard below
   proves it rather than assuming it. */
function fourFracs(mode){
  if (mode === 'unit'){
    return shuffle([2,3,4,5,6,7,8,9,10,12]).slice(0,4).map(x => [1,x]);
  }
  if (mode === 'sameD'){
    const d = ri(5,12);
    return shuffle(Array.from({length:d-1}, (_,i) => i+1)).slice(0,4).map(x => [x,d]);
  }
  const n = ri(2,4);
  return shuffle([n+1,n+2,n+3,n+4,n+5,n+6,n+7,n+8].filter(x => x <= 12)).slice(0,4).map(x => [n,x]);
}
function allDistinct(pairs){
  for (let i = 0; i < pairs.length; i++)
    for (let j = i+1; j < pairs.length; j++) if (sameVal(pairs[i], pairs[j])) return false;
  return pairs.every(legalFrac);
}
function extremeOf(pairs, wantMax){
  let b = 0;
  for (let i = 1; i < pairs.length; i++){
    const better = wantMax ? pairs[i][0]*pairs[b][1] > pairs[b][0]*pairs[i][1]
                           : pairs[i][0]*pairs[b][1] < pairs[b][0]*pairs[i][1];
    if (better) b = i;
  }
  return b;
}
function compareQ(stem, pairs, wantMax, explain){
  const b = extremeOf(pairs, wantMax);
  const order = shuffle(pairs.map((_,i) => i));
  return { q: stem, extra: '', choices: order.map(i => fr(pairs[i][0], pairs[i][1])),
           correct: order.indexOf(b), explain: explain(pairs[b]),
           answerText: fr(pairs[b][0], pairs[b][1]) };
}

/* FORMAT 3a - unit fractions, with the rule named in the stem (pool 1, 1 step). */
function gCompareUnit(){
  let pairs = [[1,2],[1,3],[1,4],[1,5]], g = 0;
  do { pairs = fourFracs('unit'); g++; } while (g < 200 && !allDistinct(pairs));
  if (!allDistinct(pairs)) pairs = [[1,2],[1,3],[1,4],[1,5]];
  const wantMax = Math.random() < 0.5;
  return compareQ('These fractions are all <b>one part</b> of a whole. Which one is the <b>' +
    (wantMax ? 'greatest' : 'smallest') + '</b>?', pairs, wantMax, best =>
    'The top number is 1 every time, so the bottom number is doing all the work: it says how many equal ' +
    'parts the whole was cut into. More parts means SMALLER pieces. ' +
    'The bottom numbers here are ' + pairs.map(p => p[1]).sort((x,y) => x-y).join(', ') + ', so the ' +
    (wantMax ? 'smallest bottom number gives the greatest fraction' : 'biggest bottom number gives the smallest fraction') +
    ': ' + fr(best[0], best[1]) + '.');
}

/* FORMAT 3b - compare against a picture, using one of the two P3 rules
   (pool 1, 1 step). Pictorial support is written into the syllabus objective. */
function gCompareBar(){
  let d = 8, n = 3, mode = 'sameD', dir = 'greater';
  let pairs = [[5,8],[2,8],[1,8],[3,8]], g = 0, ok = false;
  do {
    d = ri(4,12); n = ri(1,d-1);
    mode = Math.random() < 0.5 ? 'sameD' : 'sameN';
    dir = Math.random() < 0.5 ? 'greater' : 'less';
    let bank;
    if (mode === 'sameD'){
      bank = Array.from({length:d-1}, (_,i) => [i+1, d]).filter(p => p[0] !== n);
    } else {
      bank = [];
      for (let q2 = n+1; q2 <= 12; q2++) if (q2 !== d) bank.push([n, q2]);
    }
    const right = bank.filter(p => dir === 'greater' ? p[0]*d > n*p[1] : p[0]*d < n*p[1]);
    const wrong = bank.filter(p => dir === 'greater' ? p[0]*d < n*p[1] : p[0]*d > n*p[1]);
    ok = right.length >= 1 && wrong.length >= 3;
    if (ok){
      const w = shuffle(wrong).slice(0,3);
      pairs = [pick(right)].concat(w);
      ok = allDistinct(pairs);
    }
    g++;
  } while (g < 200 && !ok);
  if (!ok){ d = 8; n = 3; mode = 'sameD'; dir = 'greater'; pairs = [[5,8],[2,8],[1,8],[7,8]]; }
  const key = pairs[0];
  const order = shuffle(pairs.map((_,i) => i));
  const why = mode === 'sameD'
    ? 'All four fractions have the same bottom number, ' + d + ', so every piece is the same size and you ' +
      'only compare the top numbers. ' + key[0] + ' is ' + (dir === 'greater' ? 'more' : 'less') + ' than ' + n +
      ', so ' + fr(key[0], key[1]) + ' is ' + (dir === 'greater' ? 'greater' : 'less') + ' than ' + fr(n,d) + '.'
    : 'All four fractions have the same top number, ' + n + ', so compare the bottom numbers. ' +
      'The bigger the bottom number, the more parts the whole is cut into and the SMALLER each piece. ' +
      key[1] + ' is ' + (key[1] < d ? 'smaller' : 'bigger') + ' than ' + d + ', so ' + fr(key[0], key[1]) +
      ' is ' + (dir === 'greater' ? 'greater' : 'less') + ' than ' + fr(n,d) + '.';
  return fig({
    q: 'The bar below shows one fraction shaded blue. Which of these fractions is <b>' +
       (dir === 'greater' ? 'greater' : 'less') + '</b> than the blue fraction?',
    extra: '', choices: order.map(i => fr(pairs[i][0], pairs[i][1])), correct: order.indexOf(0),
    explain: 'The bar is cut into ' + d + ' equal parts with ' + n + ' shaded, so the blue fraction is ' +
             fr(n,d) + '. ' + why,
    answerText: fr(key[0], key[1]),
    authoredFrac: pairs.slice(1).map(p => [p[0], p[1]])
  }, bar(d, n));
}

/* FORMAT 3c - like fractions, rule named in the stem (pool 2, 1 step). */
function gCompareSameD(){
  let pairs = [[1,7],[3,7],[5,7],[6,7]], g = 0;
  do { pairs = fourFracs('sameD'); g++; } while (g < 200 && !allDistinct(pairs));
  if (!allDistinct(pairs)) pairs = [[1,7],[3,7],[5,7],[6,7]];
  const d = pairs[0][1], wantMax = Math.random() < 0.5;
  return compareQ('These fractions all have the <b>same bottom number</b>. Which one is the <b>' +
    (wantMax ? 'greatest' : 'smallest') + '</b>?', pairs, wantMax, best =>
    'Every piece is one of ' + d + ' equal parts, so all the pieces are the same size. ' +
    'When the pieces are the same size you just count them: compare the top numbers ' +
    pairs.map(p => p[0]).sort((x,y) => x-y).join(', ') + '. The ' + (wantMax ? 'greatest' : 'smallest') + ' is ' +
    fr(best[0], best[1]) + '.');
}

/* FORMAT 3d - two-step word problem in a Singapore context (pool 2). The child
   maps four names onto four fractions, then compares. The wholes are declared
   SAME-SIZE in the stem, because comparing fractions of different wholes is not
   a question at all - and the harness refuses any draw that omits it. */
function gCompareWords(){
  let names = SOLO.slice(0,4), pairs = [[2,3],[2,5],[2,7],[2,9]], g = 0;
  do { pairs = fourFracs(Math.random() < 0.5 ? 'sameN' : 'unit'); g++; } while (g < 200 && !allDistinct(pairs));
  if (!allDistinct(pairs)) pairs = [[2,3],[2,5],[2,7],[2,9]];
  names = shuffle(SOLO).slice(0,4);
  const cake = pick(CAKES), wantMax = Math.random() < 0.5;
  const b = extremeOf(pairs, wantMax);
  const sentences = names.map((nm,i) => nm + ' ate ' + fr(pairs[i][0], pairs[i][1]));
  const opts = shuffle(names.slice());
  return { q: names[0] + ', ' + names[1] + ', ' + names[2] + ' and ' + names[3] +
      ' each bought a <b>same-size</b> ' + cake + '. ' + sentences.join(', ') +
      '. <b>Who ate the ' + (wantMax ? 'most' : 'least') + '?</b>',
    extra: '', choices: opts, correct: opts.indexOf(names[b]),
    /* "Because all four are the same size" and not "the <cake>s", which pluralised
       to "kueh lapiss" and "pizza at the hawker centres". */
    explain: 'Because all four are the same size, the fractions can be compared straight away. ' +
      (pairs[0][0] === pairs[1][0]
        ? 'Every fraction has the same top number, ' + pairs[0][0] + ', so the bigger the bottom number the smaller the share.'
        : 'Every fraction is one part of a whole, so the bigger the bottom number the smaller the share.') +
      ' ' + names[b] + ' ate ' + fr(pairs[b][0], pairs[b][1]) + ', which is the ' +
      (wantMax ? 'biggest' : 'smallest') + ' share.',
    answerText: names[b] };
}

/* FORMAT 3e - error spotting, DIAGNOSE the mistake (pool 3, 2 steps). The named
   misconception the brief asks for: comparing by denominator size backwards. */
function gCompareError(){
  let n = 1, d1 = 8, d2 = 5, g = 0;
  do { n = ri(1,3); d1 = ri(n+2,12); d2 = ri(n+1,d1-1); g++; }
  while (g < 200 && !(d1 > d2 && d2 > n && legalFrac([n,d1]) && legalFrac([n,d2])));
  if (!(d1 > d2 && d2 > n)){ n = 1; d1 = 8; d2 = 5; }
  const k = pick(KIDS);
  /* Every option opens with the child's name, so the key is not the odd one out -
     the second refutation killed gLPerimDiff for exactly that shape of tell. */
  const key = k[0] + ' forgot that the bigger the bottom number, the smaller each piece.';
  const wrongs = [
    k[0] + ' should have compared the top numbers instead of the bottom ones.',
    k[0] + ' should have added the top and the bottom of each fraction first.',
    k[0] + ' should have made the top numbers the same before comparing.'
  ];
  return mcText(k[0] + ' says ' + fr(n,d1) + ' is <b>greater</b> than ' + fr(n,d2) + ', because ' + d1 +
    ' is greater than ' + d2 + '. <b>What did ' + k[2] + ' do wrong?</b>', key, wrongs,
    'Both fractions have the same top number, ' + n + ', so the bottom number decides. ' +
    'Cutting a whole into ' + d1 + ' parts makes smaller pieces than cutting it into ' + d2 + ' parts, so ' +
    fr(n,d1) + ' is actually SMALLER than ' + fr(n,d2) + '. A bigger bottom number never means a bigger fraction.');
}

/* FORMAT 3f - mixed comparing, no rule named (pool 3, 1 step). DECLARED ANCHOR:
   the fluency item pool 3 keeps on purpose. */
function gGreatest4(){
  let pairs = [[1,2],[1,3],[1,4],[1,5]], mode = 'unit', g = 0;
  do { mode = pick(['sameD','sameN','unit']); pairs = fourFracs(mode); g++; }
  while (g < 200 && !allDistinct(pairs));
  if (!allDistinct(pairs)){ mode = 'unit'; pairs = [[1,2],[1,3],[1,4],[1,5]]; }
  const wantMax = Math.random() < 0.5;
  const rule = mode === 'sameD'
    ? 'These all have the same bottom number, so the pieces are the same size and the top numbers decide.'
    : 'These all have the same top number, so the bottom numbers decide - and the bigger the bottom number, the smaller the piece.';
  return compareQ('Which of these fractions is the <b>' + (wantMax ? 'greatest' : 'smallest') + '</b>?',
    pairs, wantMax, best => rule + ' The ' + (wantMax ? 'greatest' : 'smallest') + ' is ' +
    fr(best[0], best[1]) + '.');
}

/* FORMAT 3g - ordering three fractions (pool 3, 2 steps). The reversed order is
   always one of the options, because reversing is exactly the misconception
   gCompareError diagnoses. */
function gOrderThree(){
  let three = [[1,2],[1,3],[1,4]], mode = 'unit', g = 0;
  do {
    mode = pick(['sameD','sameN','unit']);
    three = fourFracs(mode).slice(0,3);
    g++;
  } while (g < 200 && !(three.length === 3 && allDistinct(three)));
  if (!(three.length === 3 && allDistinct(three))){ mode = 'unit'; three = [[1,2],[1,3],[1,4]]; }
  const asc = Math.random() < 0.5;
  const sorted = three.slice().sort((a,b) => a[0]*b[1] - b[0]*a[1]);
  const correct = asc ? sorted : sorted.slice().reverse();
  const reversed = correct.slice().reverse();
  const perms = [[0,2,1],[1,0,2],[2,1,0],[1,2,0],[2,0,1]];
  const wrongs = [reversed];
  for (const p of shuffle(perms)){
    if (wrongs.length >= 3) break;
    const cand = p.map(i => correct[i]);
    const same = s => s.every((x,i) => sameVal(x, cand[i]));
    if (same(correct) || wrongs.some(same)) continue;
    wrongs.push(cand);
  }
  /* The three in the STEM must not already be in the answer's order, or the item
     is answered by copying the question. */
  let shown = shuffle(three.slice());
  for (let t2 = 0; t2 < 30 && shown.every((x,i) => sameVal(x, correct[i])); t2++) shown = shuffle(three.slice());
  if (shown.every((x,i) => sameVal(x, correct[i]))) shown = [correct[1], correct[0], correct[2]];
  const render = s => s.map(p => fr(p[0], p[1])).join(', ');
  const all = shuffle([correct].concat(wrongs.slice(0,3)));
  const line = render(correct);
  return { q: 'Put these fractions in order, from the <b>' + (asc ? 'smallest to the greatest' : 'greatest to the smallest') +
      '</b>: ' + render(shown) + '. Which order is correct?',
    extra: '', choices: all.map(render), correct: all.findIndex(s => s.every((x,i) => sameVal(x, correct[i]))),
    explain: (mode === 'sameD'
        ? 'All three have the same bottom number, so the pieces are the same size and the top numbers put them in order.'
        : 'All three have the same top number, so the bottom numbers put them in order - and the bigger the bottom number, the smaller the piece.') +
      ' In order from the ' + (asc ? 'smallest to the greatest' : 'greatest to the smallest') + ' they are ' + line +
      '. Turning that order round is the commonest mistake.',
    answerText: line };
}


/* ===========================================================================
   PRINCIPLE 4 - ADDING AND SUBTRACTING WITHIN ONE WHOLE
   =========================================================================== */

/* FORMAT 4a - like fractions, add (pool 1, 1 step). */
function gAddSame(){
  let d = 9, a = 4, b = 3, key = [7,9], slips = [[7,18],[1,9],[8,9]], g = 0;
  do {
    d = ri(4,12); a = ri(1,d-2); b = ri(1,d-a-1);
    key = [a+b, d];
    slips = [[a+b, 2*d], [Math.abs(a-b), d], [a+b+1, d]];
    g++;
  } while (g < 200 && !(a !== b && slipsOk(key, slips)));
  if (!(a !== b && slipsOk(key, slips))){ d = 9; a = 4; b = 3; key = [7,9]; slips = [[7,18],[1,9],[8,9]]; }
  return mcFrac(fr(a,d) + ' + ' + fr(b,d) + ' = ?', key, slips,
    'Both fractions have the same bottom number, ' + d + ', so the pieces are already the same size. ' +
    'Count the pieces: ' + a + ' + ' + b + ' = ' + (a+b) + '. The bottom number is the SIZE of each piece, ' +
    'so it stays ' + d + ', and the answer is ' + fr(a+b, d) + '. Adding the bottom numbers as well would give ' +
    fr(a+b, 2*d) + ', which is only half as much.');
}

/* FORMAT 4b - like fractions, subtract (pool 2, 1 step). */
function gSubSame(){
  let d = 9, a = 5, b = 2, key = [3,9], slips = [[7,9],[3,7],[4,9]], g = 0;
  do {
    d = ri(5,12); a = ri(3,d-1); b = ri(1,a-1);
    key = [a-b, d];
    slips = [[a+b, d], [a-b, d-b], [a-b+1, d]];
    g++;
  } while (g < 200 && !(a+b < d && d-b >= 2 && slipsOk(key, slips)));
  if (!(a+b < d && d-b >= 2 && slipsOk(key, slips))){ d = 9; a = 5; b = 2; key = [3,9]; slips = [[7,9],[3,7],[4,9]]; }
  return mcFrac(fr(a,d) + ' − ' + fr(b,d) + ' = ?', key, slips,
    'Both fractions are the same size of piece, so take the pieces away and leave the bottom number alone: ' +
    a + ' − ' + b + ' = ' + (a-b) + ', giving ' + fr(a-b, d) + '. Subtracting the bottom numbers as well would give ' +
    fr(a-b, d-b) + ' - but the pieces did not change size, only how many there are.');
}

/* FORMAT 4c - one whole, taken apart (pool 2, 1 step). */
function gSubFromOne(){
  let d = 8, a = 3, key = [5,8], slips = [[3,8],[6,8],[4,8]], g = 0;
  do {
    d = ri(4,12); a = ri(2,d-2);
    key = [d-a, d];
    slips = [[a,d], [d-a+1, d], [d-a-1, d]];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ d = 8; a = 3; key = [5,8]; slips = [[3,8],[6,8],[4,8]]; }
  return mcFrac('1 − ' + fr(a,d) + ' = ?', key, slips,
    'One whole is ' + fr(d,d) + ' - ' + d + ' pieces out of ' + d + '. Take ' + a + ' of them away: ' +
    d + ' − ' + a + ' = ' + (d-a) + ', so the answer is ' + fr(d-a, d) + '. ' + fr(a,d) +
    ' is the part that was taken away, not the part that is left.');
}

/* FORMAT 4d - working backwards to one whole (pool 3, 1 step). DECLARED ANCHOR:
   pool 3's second single-step item, kept on purpose. */
function gMakeOne(){
  let d = 8, a = 3, key = [5,8], slips = [[3,8],[6,8],[4,8]], g = 0;
  do {
    d = ri(4,12); a = ri(2,d-2);
    key = [d-a, d];
    slips = [[a,d], [d-a+1, d], [d-a-1, d]];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ d = 8; a = 3; key = [5,8]; slips = [[3,8],[6,8],[4,8]]; }
  return mcFrac(fr(a,d) + ' + ? = 1 &nbsp; What is the missing fraction?', key, slips,
    'One whole is ' + fr(d,d) + '. You already have ' + a + ' pieces, so you need ' + d + ' − ' + a + ' = ' +
    (d-a) + ' more of the same pieces: ' + fr(d-a, d) + '. Check it: ' + fr(a,d) + ' + ' + fr(d-a, d) + ' = ' +
    fr(d,d) + ', which is 1.');
}

/* FORMAT 4e - RELATED fractions, add (pool 3, 2 steps). MOE P3 3.2 names related
   fractions explicitly and the shipped bank had none of them: every add and
   subtract was a like-fraction item, which is why pool 3 added no step. The two
   steps are: change one fraction into an equivalent one, then count the pieces. */
function gAddRelated(){
  let d = 4, k = 3, D = 12, a = 1, b = 2, key = [5,12], slips = [[3,16],[3,12],[7,12]], g = 0;
  do {
    d = pick([2,3,4,5,6]); k = pick([2,3,4]); D = k*d;
    a = ri(1, Math.max(1, d-1)); b = ri(1, Math.max(1, D-1));
    key = [k*a + b, D];
    slips = [[a+b, d+D], [a+b, D], [a + k*b, D]];
    g++;
  } while (g < 200 && !(D <= 12 && a < d && k*a + b < D && gcd(k*a + b, D) === 1 &&
                        a !== b && a + k*b < D && slipsOk(key, slips)));
  if (!(D <= 12 && a < d && k*a + b < D && gcd(k*a + b, D) === 1 && a !== b && a + k*b < D && slipsOk(key, slips))){
    d = 4; k = 3; D = 12; a = 1; b = 2; key = [5,12]; slips = [[3,16],[3,12],[7,12]];
  }
  return mcFrac('Add: ' + fr(a,d) + ' + ' + fr(b,D) + ' = ?', key, slips,
    'The pieces are different sizes, so make them the same first. ' + d + ' × ' + k + ' = ' + D +
    ', so cut each of the ' + d + ' parts into ' + k + ': ' + fr(a,d) + ' = ' + fr(k*a, D) + '. ' +
    'Now both are ' + D + 'ths and you can count them: ' + (k*a) + ' + ' + b + ' = ' + (k*a + b) +
    ', giving ' + fr(k*a + b, D) + '. Adding the tops and the bottoms straight off would give ' +
    fr(a+b, d+D) + ', which is not even close.');
}

/* FORMAT 4f - RELATED fractions, subtract (pool 3, 2 steps). */
function gSubRelated(){
  let d = 4, k = 2, D = 8, a = 3, b = 1, key = [5,8], slips = [[2,4],[2,8],[6,8]], g = 0;
  do {
    d = pick([2,3,4,5,6]); k = pick([2,3,4]); D = k*d;
    a = ri(2, Math.max(2, d-1)); b = ri(1, Math.max(1, D-1));
    key = [k*a - b, D];
    slips = [[a-b, D-d], [a-b, D], [k*a - b + 1, D]];
    g++;
  } while (g < 200 && !(D <= 12 && a < d && a > b && k*a - b >= 1 && k*a - b < D &&
                        gcd(k*a - b, D) === 1 && k*a - b + 1 < D && D - d >= 2 && slipsOk(key, slips)));
  if (!(D <= 12 && a < d && a > b && k*a - b >= 1 && k*a - b < D && gcd(k*a - b, D) === 1 &&
        k*a - b + 1 < D && D - d >= 2 && slipsOk(key, slips))){
    d = 4; k = 2; D = 8; a = 3; b = 1; key = [5,8]; slips = [[2,4],[2,8],[6,8]];
  }
  return mcFrac('Subtract: ' + fr(a,d) + ' − ' + fr(b,D) + ' = ?', key, slips,
    'The pieces are different sizes, so change the first fraction. ' + d + ' × ' + k + ' = ' + D + ', so ' +
    fr(a,d) + ' = ' + fr(k*a, D) + '. Now take the pieces away: ' + (k*a) + ' − ' + b + ' = ' + (k*a - b) +
    ', giving ' + fr(k*a - b, D) + '. Subtracting the tops and the bottoms straight off would give ' +
    fr(a-b, D-d) + ', which is a different amount altogether.');
}

/* FORMAT 4g - error spotting, DIAGNOSE the mistake (pool 3, 2 steps). The named
   misconception the brief asks for: adding numerators AND denominators. Three
   claim forms; the harness re-derives which one the printed number IS and fails
   the build if the "wrong" answer is actually right, or matches two beliefs. */
function gAddError(){
  let d = 12, a = 5, b = 2, g = 0, ok = false;
  do {
    d = ri(6,12); b = ri(1,4); a = ri(b+1, Math.max(b+1, d-1));
    ok = a > b && a + b < d && a * b < d && a * b >= 1 &&
         new Set([ (a+b)/(2*d), (a-b)/d, (a*b)/d, (a+b)/d ].map(x => Math.round(x*1e6))).size === 4;
    g++;
  } while (g < 200 && !ok);
  if (!ok){ d = 12; a = 5; b = 2; }
  const k = pick(KIDS);
  const SLIPS = [
    { claim:[a+b, 2*d], text: k[0] + ' added the bottom numbers as well.' },
    { claim:[a-b, d],   text: k[0] + ' subtracted the top numbers instead of adding them.' },
    { claim:[a*b, d],   text: k[0] + ' multiplied the top numbers instead of adding them.' }
  ];
  const s = pick(SLIPS);
  const wrongs = SLIPS.filter(x => x !== s).map(x => x.text)
    .concat([k[0] + ' should have made the bottom numbers the same first.']);
  return mcText(k[0] + ' says ' + fr(a,d) + ' + ' + fr(b,d) + ' = ' + fr(s.claim[0], s.claim[1]) +
    '. <b>What did ' + k[2] + ' do wrong?</b>', s.text, wrongs,
    'Both fractions are already ' + d + 'ths, so the pieces are the same size and only the top numbers ' +
    'are counted: ' + a + ' + ' + b + ' = ' + (a+b) + ', and the answer is ' + fr(a+b, d) + '. ' + s.text +
    ' The bottom number is the size of each piece - it never changes when you add.');
}

/* FORMAT 4h - two-step word problem, Singapore context (pool 3). Add, then take
   the total from one whole. The stop-after-the-first-step answer is offered. */
function gAddWords(){
  let d = 8, a = 2, b = 3, key = [3,8], slips = [[5,8],[6,8],[5,16]], g = 0;
  do {
    d = ri(5,12); a = ri(1, Math.max(1, d-3)); b = ri(1, Math.max(1, d-a-2));
    key = [d-a-b, d];
    slips = [[a+b, d], [d-a, d], [a+b, 2*d]];
    g++;
  } while (g < 200 && !(a !== b && d-a-b >= 1 && slipsOk(key, slips)));
  if (!(a !== b && d-a-b >= 1 && slipsOk(key, slips))){ d = 8; a = 2; b = 3; key = [3,8]; slips = [[5,8],[6,8],[5,16]]; }
  const two = shuffle(SOLO).slice(0,2), cake = pick(CAKES);
  return mcFrac(two[0] + ' eats ' + fr(a,d) + ' of a ' + cake + ' and ' + two[1] + ' eats ' + fr(b,d) +
    ' of the same ' + cake + '. <b>What fraction of the ' + cake + ' is left?</b>', key, slips,
    'Step 1: together they eat ' + fr(a,d) + ' + ' + fr(b,d) + ' = ' + fr(a+b, d) + '. ' +
    'Step 2: the whole ' + cake + ' is ' + fr(d,d) + ', so what is left is ' + d + ' − ' + (a+b) + ' = ' +
    (d-a-b) + ' pieces, which is ' + fr(d-a-b, d) + '. Stopping after step 1 gives ' + fr(a+b, d) +
    ', which is the part that was eaten, not the part left.');
}


  MQI.registerTopic({
    id:'fractions', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Fractions: equivalent fractions; comparing and ordering unlike fractions; addition and subtraction",
    label:'Fraction Forest', short:'Fractions', e:'🌳',
    skills:{
      identify:  {label:'Reading fractions from pictures', tip:'Count ALL the parts first (that is the bottom number), then the shaded ones. Check the parts are equal - unequal pieces are not a fraction at all.'},
      compare:   {label:'Comparing fractions',             tip:'Two rules: same bottom number → compare the tops; same top number → the BIGGER bottom number means smaller pieces, so a smaller fraction. Draw two bars side by side when stuck.'},
      order:     {label:'Ordering fractions',              tip:'Use the same two rules across three fractions, and say the direction out loud ("smallest first") before you start. Reversing the order is the commonest slip.'},
      equivalent:{label:'Equivalent fractions',            tip:'Multiply top AND bottom by the same number - you are cutting every piece into smaller ones, not changing the amount. Chant the families: 1/2 = 2/4 = 3/6 = 4/8.'},
      addsub:    {label:'Adding & subtracting fractions',  tip:'The bottom number is the SIZE of each piece, so it never changes: only the tops are counted. If the bottoms are different, change one fraction first so both pieces match.'},
      wholes:    {label:'Making one whole',                tip:'Remember 1 = 8/8 = 12/12. Ask: "how many more of these pieces fill the whole?"'},
      simplest:  {label:'Simplest form',                   tip:'DIVIDE top and bottom by the same number until you cannot any more - never subtract. Drill the common ones: 4/6→2/3, 6/8→3/4, 8/12→2/3.'}
    },
    /* Pools. No generator sits in two pools: the audit's boredom score multiplied
       one stem shape by the number of pools it occupied, and gPeri-in-all-three
       was the worst case in the game. Pool 1 = 6 gens / 4 skills, pool 2 = 9 / 5,
       pool 3 = 10 / 5. */
    pools:{
      1:[[gPicIdentify,'identify'],[gEqualParts,'identify'],[gEquivFromBar,'equivalent'],
         [gCompareUnit,'compare'],[gCompareBar,'compare'],[gAddSame,'addsub']],
      2:[[gPicUnshaded,'wholes'],[gSubFromOne,'wholes'],[gEqMissing,'equivalent'],
         [gEqMissingDen,'equivalent'],[gPickEquiv,'equivalent'],[gSimplest,'simplest'],
         [gCompareSameD,'compare'],[gCompareWords,'compare'],[gSubSame,'addsub']],
      3:[[gMakeOne,'wholes'],[gAlreadySimplest,'simplest'],[gSimplestError,'simplest'],
         [gCompareError,'compare'],[gGreatest4,'order'],[gOrderThree,'order'],
         [gAddRelated,'addsub'],[gSubRelated,'addsub'],[gAddError,'addsub'],[gAddWords,'addsub']]
    }
  });
})();
