"use strict";
/* Math Quest Island topic: p2 (P2). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 *
 * SWEEP 2026-09-15 (depth-pilot contract taken wide, lane/sweep-p2).
 * Baseline from [[Repetition + Demand Audit - 2026-09-05]]: 4 skills, 7
 * generators, 11 stem shapes; gBonds ("13 + ? = 100") was the ENTIRE p2/bonds
 * skill in all three pools (worst-ten #3); gMulP2easy / gMulP2hard rendered one
 * stem across pools (worst-ten #7); pool 3 added no solving step in 4 of 4 slots.
 *
 * The unit of authoring here is a PRINCIPLE, and each principle ships a BANK OF
 * FORMATS a P2 teacher rotates through - direct compute, concept check, inverse,
 * fact family, error spotting (named misconception), word problem in a Singapore
 * context, working backwards, compare.
 *
 *  P1 NUMBER BONDS - a whole splits into two parts; whole minus one part is the
 *     other part. gBonds, gBondPair, gBondFamily, gBondError, gBondWord,
 *     gBondDiagnose.
 *  P2 ADDITION AND SUBTRACTION WITH REGROUPING (within 1000) - ten ones make one
 *     ten and ten tens make one hundred, in both directions. gAddSubP2e,
 *     gRegroupConcept, gAddSubP2m, gNearTen, gAddSubInverse, gAddSubP2h,
 *     gAddSubError, gAddSubWord.
 *  P3 EQUAL GROUPS (2, 3, 4, 5 and 10 tables) - multiplication counts equal
 *     groups, division either shares into equal groups or finds how many groups
 *     fit; they are the same fact from two ends. gMulP2easy, gGroupsP2,
 *     gSkipCount, gMulP2hard, gMulRepeatAdd, gMulError, gMulTwoStep,
 *     gDivP2fact, gDivFamilyP2, gDivShareP2, gDivGroupWord, gDivCheckP2.
 *  P4 COMPARING NUMBERS TO 1000 - compare hundreds first, then tens, then ones.
 *     gCompareNum, gPlaceP2, gOrderP2, gCompareError.
 *
 * SCOPE: MOE Oct 2025 P2 (PDF p.35). Numbers to 1000, addition and subtraction
 * within 1000 (algorithms + mental strategies), multiplication and division
 * within the 2, 3, 4, 5 and 10 tables, simple word problems. Nothing here needs
 * a table outside those five, a number above 1000, a remainder, or a fraction.
 *
 * DECLARED ANCHORS (depth-pilot contract change 2): gAddSubP2e, gAddSubP2m,
 * gAddSubP2h, gMulP2easy, gMulP2hard and gDivP2fact are single-step fluency
 * items ON PURPOSE, one or two per pool. They render the same mask as each other
 * by design; what the audit killed was one anchor being the WHOLE skill in all
 * three pools, which is no longer true of any of them.
 *
 * DISTRACTOR CONTRACT: every numeric item goes through mcNum with exactly three
 * NAMED misconceptions, and the draw is rejected (optsOk) unless all three are
 * positive, whole and distinct from the key and from each other - so q.authored
 * is stamped on every draw and finishNum's padding branch never fires.
 * Every WORD-ANSWER item goes through mcText, which stamps q.optionSet with the
 * four option strings the generator authored; the harness fails any draw that
 * ships an option outside that set (refutation fix 2026-09-15, WOUND 2 - the
 * nine word-answer banks used to declare nothing at all, so 20,000 of 60,000
 * draws sat outside the contract, and two of them padded arithmetically).
 * All 30 generators now declare their options, q.authored or q.optionSet, and
 * the p2 gate in tools/gen-sanity.mjs asserts that there is no thirty-first way.
 * Every stem is re-derived from its RENDERED text by an oracle in
 * tools/gen-sanity.mjs; nothing is trusted from the generator's own answerText.
 *
 * SCOPE IS NOW ASSERTED, NOT SCANNED (refutation 2026-09-15, KILLS 1 and 2).
 * p2Gates() in tools/gen-sanity.mjs reads every multiplication and division
 * printed in a stem, an option or an explanation and fails the build unless one
 * factor is a 2/3/4/5/10 table and the other is 1-10, and fails any number above
 * 1000 anywhere. Two generators used to leave the five tables - gDivShareP2 in
 * 5.6% of draws and gDivCheckP2 in 10.7% - and nothing caught them.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

/* ---- house helpers (topics stay self-contained; same shape as the pilot) ---- */

/* Every NAMED distractor must be a positive whole number, distinct from the key
   and from every other named distractor. finishNum shuffles the candidate list,
   so a collision anywhere in it can surface as a duplicate option; requiring the
   whole list to be clean also means the padding branch never fires and the
   authored-distractor contract binds on every single draw. */
function optsOk(correct, cands){
  if (!Number.isInteger(correct) || correct <= 0) return false;
  const s = new Set([correct]);
  for (const c of cands){
    if (!Number.isInteger(c) || c <= 0 || s.has(c)) return false;
    s.add(c);
  }
  return true;
}
/* Numeric MC whose distractors are all authored misconceptions. */
function mcNum(stem, extra, correct, cands, unit, explain){
  const seen = new Set([correct]); const d = [];
  for (const c of cands){
    if (d.length >= 3) break;
    if (!Number.isInteger(c) || c <= 0 || seen.has(c)) continue;
    seen.add(c); d.push(c);
  }
  const authored = d.length === 3;
  let t = 1;
  while (d.length < 3 && t < 80){
    if (!seen.has(correct + t)) { seen.add(correct + t); d.push(correct + t); }
    else if (correct - t > 0 && !seen.has(correct - t)) { seen.add(correct - t); d.push(correct - t); }
    t++;
  }
  const q = finishNum(stem, extra, correct, d, unit, explain);
  if (authored) q.authored = d;
  return q;
}
/* Word-answer MC (concept checks, error diagnosis, fact families). Every option
   is written in the SAME coarse shape so the key is never the odd one out -
   the format-tell rule the depth pilot's second refuter added.

   REFUTATION FIX (2026-09-15, WOUND 2): the nine word-answer banks shipped with
   no distractor-identity declaration at all, so 20,000 of 60,000 draws sat
   outside the contract the numeric banks meet through q.authored. Every draw now
   stamps q.optionSet - the four option strings the generator AUTHORED - and
   tools/gen-sanity.mjs fails any draw that ships an option outside that set, or
   a set with a duplicate in it. Nothing here pads: every caller hands over three
   named, distinct wrong options and the draw is rejected otherwise. */
function mcText(stem, extra, correctText, wrongs, explain){
  const set = [correctText].concat(wrongs.slice(0, 3));
  const opts = shuffle(set.slice());
  return { q: stem, extra: extra || '', choices: opts, correct: opts.indexOf(correctText),
           explain: explain, answerText: correctText, optionSet: set };
}
const uniq4 = arr => new Set(arr).size === 4;
/* The five P2 times tables (MOE Oct 2025 P2, PDF p.35). A multiplication is in
   scope when ONE factor is one of these and the other is 1-10; a division is in
   scope when it is that multiplication read backwards. Asserted on every printed
   fact by the p2 scope gate in tools/gen-sanity.mjs (refutation 2026-09-15). */
const P2_TABLES = new Set([2, 3, 4, 5, 10]);
const inTables = (x, y) => (P2_TABLES.has(x) && y >= 1 && y <= 10) ||
                           (P2_TABLES.has(y) && x >= 1 && x <= 10);
/* Prose helpers. A parent reads the explanation ALOUD to a seven-year-old, so
   "the 3th count" and "1 tens" are defects, not cosmetics. */
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th'
  : (n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'));
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/* Singapore contexts. Kept SHORT on purpose: the audit's masking method counts a
   new context as a new stem shape, which flatters a generator that only changed
   a noun. Variety here is meant to come from the FORMAT, not the wording. */
const KIDS = [['Siti','She'], ['Ravi','He'], ['Ah Huat','He'], ['Mei Ling','She']];
const kid = () => pick(KIDS);

/* =====================================================================
 * PRINCIPLE 1 - NUMBER BONDS
 * A whole splits into two parts. If you know the whole and one part, take the
 * part away from the whole to find the other part. Making 10, 20, 100 and 1000.
 * ===================================================================== */

/* FORMAT 1.1 - direct compute, the missing part (pool 1, 1 step). KEPT NAME.
   Was the entire p2/bonds skill in all three pools; it is now one voice in six
   and sits in pool 1 only. */
function gBonds(){
  let target = 100, a = 1, U = 10, r = 1, cands = [], g = 0;
  do {
    target = pick([10, 20, 100, 1000]);
    U = target === 1000 ? 100 : 10;
    a = target === 1000 ? 10 * ri(10, 99) : ri(1, target - 1);
    r = a % U;
    cands = [a, target - a + 2 * r, target - (a - r)];
    g++;
  } while (g < 400 && !(r !== 0 && (target <= 20 || a > U) && optsOk(target - a, cands)));
  const key = target - a;
  const slip = target <= 20
    ? 'The usual slip is to ADD the two numbers instead of taking one away, which gives ' + (target + a) + '.'
    : 'The usual slip is to take the ' + (target === 1000 ? 'hundreds' : 'tens') + ' away and then ADD the ' +
      r + ' back instead of taking it away too, which gives ' + (target - a + 2 * r) + '.';
  return mcNum(a + ' + ? = ' + target, '', key, cands, '',
    'The whole is ' + target + ' and one part is ' + a + ', so the other part is ' + target + ' − ' + a +
    ' = ' + key + '. Say it together: "' + a + ' and ' + key + ' make ' + target + '." ' + slip);
}

/* FORMAT 1.2 - concept check, four pairs and only one makes the whole
   (pool 1, 1 step). Four checks instead of one. */
function gBondPair(){
  let T = 100, parts = [], g = 0;
  do {
    T = pick([20, 100]);
    const lo = T === 20 ? 2 : 11, hi = T === 20 ? 18 : 89;
    const firsts = [];
    let guard = 0;
    while (firsts.length < 4 && guard < 200){
      const v = ri(lo, hi);
      if (v % 10 !== 0 && firsts.indexOf(v) < 0) firsts.push(v);
      guard++;
    }
    if (firsts.length < 4) { g++; continue; }
    parts = [
      [firsts[0], T - firsts[0]],                 /* the true bond */
      [firsts[1], T - firsts[1] + 10],            /* one ten too many */
      [firsts[2], T - firsts[2] - 10],            /* one ten too few */
      [firsts[3], T - firsts[3] + 1]              /* the ones do not quite meet */
    ];
    g++;
  } while (g < 400 && !(parts.length === 4 && parts.every(p => p[1] > 0) &&
           parts.slice(1).every(p => p[0] + p[1] !== T) &&
           uniq4(parts.map(p => p[0] + ' and ' + p[1]))));
  const txt = p => p[0] + ' and ' + p[1];
  return mcText('Which pair of numbers makes <b>' + T + '</b>?', '',
    txt(parts[0]), parts.slice(1).map(txt),
    'Add each pair and see which one lands exactly on ' + T + '. ' + txt(parts[0]) + ' is the bond: ' +
    parts[0][0] + ' + ' + parts[0][1] + ' = ' + T + '. The near misses are the ones to talk about - ' +
    txt(parts[1]) + ' makes ' + (parts[1][0] + parts[1][1]) + ', ten too many.');
}

/* FORMAT 1.3 - fact family: the subtraction that lives inside the bond
   (pool 2, 2 steps). Exactly one option is a true statement; the oracle checks
   that, so an unanswerable draw cannot ship. */
function gBondFamily(){
  let T = 100, a = 60, b = 40, g = 0;
  do {
    T = pick([20, 100]);
    b = T === 20 ? ri(2, 9) : ri(11, 49);
    if (b % 10 === 0) b += 1;
    a = T - b;
    g++;
  } while (g < 400 && !(a > b && b > 1 && a !== T && uniq4([
    T + ' − ' + b + ' = ' + a,
    T + ' − ' + b + ' = ' + (a + 10),
    a + ' − ' + b + ' = ' + T,
    T + ' − ' + a + ' = ' + (b + 10)
  ])));
  const key = T + ' − ' + b + ' = ' + a;
  return mcText('You know that ' + b + ' + ' + a + ' = ' + T +
    '. <b>Which subtraction fact belongs to the same number bond?</b>', '',
    key,
    [T + ' − ' + b + ' = ' + (a + 10), a + ' − ' + b + ' = ' + T, T + ' − ' + a + ' = ' + (b + 10)],
    'A number bond holds three numbers - ' + b + ', ' + a + ' and ' + T + ' - and they make four facts: ' +
    b + ' + ' + a + ' = ' + T + ', ' + a + ' + ' + b + ' = ' + T + ', ' + T + ' − ' + b + ' = ' + a +
    ' and ' + T + ' − ' + a + ' = ' + b + '. Subtraction always starts from the WHOLE, which is the ' +
    'biggest of the three.');
}

/* FORMAT 1.4 - error spotting, correct the mistake (pool 2, 2 steps).
   The named misconception: taking 35 from 100 by doing 100 − 30 = 70 and then
   ADDING the 5 back instead of taking it away. The printed check is always
   genuinely wrong, and the oracle re-derives that from the stem. */
function gBondError(){
  /* SCOPE (own 2,000-draw scan, 2026-09-15): the making-1000 draw was dropped
     from this format. The printed check is a + claim, and for T = 1000 that is
     always 1000 + 2r - a number above the P2 range, printed in the stem. Making
     1000 still ships in gBonds, gBondWord and gBondDiagnose, where nothing
     printed exceeds 1000. */
  let T = 100, a = 35, r = 5, claim = 75, cands = [], g = 0;
  do {
    T = pick([20, 100]);
    const U = 10;
    a = ri(1, T - 1);
    r = a % U;
    claim = T - a + 2 * r;
    cands = [claim, T - (a - r), a + claim];
    g++;
  } while (g < 400 && !(r !== 0 && (T <= 20 || a > 10) &&
           claim !== T - a && claim !== a && optsOk(T - a, cands)));
  const k = kid();
  const key = T - a;
  /* REFUTATION FIX (2026-09-15, WOUND 5): the explanation named a slip that
     cannot have happened in 39.2% of draws. Every making-20 draw has a
     SINGLE-DIGIT a (a larger one is rejected because the claim would collide
     with a distractor), and 1 has no tens to take away - what actually happened
     is that a was added instead of subtracted. The sentence is now phrased from
     the digits of the draw, the way gBonds already branches its own slip line. */
  const slip = a >= 10
    ? k[0] + ' took the tens away and then ADDED the ' + r + ' back instead of taking it away too.'
    : k[0] + ' ADDED the ' + a + ' instead of taking it away, which is why the check overshoots by ' +
      (2 * a) + '.';
  return mcNum(k[0] + ' says ' + T + ' − ' + a + ' = ' + claim + '. ' + k[1] + ' checked it by working out ' +
    a + ' + ' + claim + ' = ' + (a + claim) + '. <b>What should ' + T + ' − ' + a + ' be?</b>', '',
    key, cands, '',
    'The check is what shows the mistake: ' + a + ' + ' + claim + ' = ' + (a + claim) + ', not ' + T +
    '. ' + slip + ' ' +
    T + ' − ' + a + ' = ' + key + ', and the check works: ' + a + ' + ' + key + ' = ' + T + '.');
}

/* FORMAT 1.5 - two-step word problem, Singapore context (pool 3, 2 steps).
   Step 1: add what is already there. Step 2: take it from the whole. */
const BOND_CTX = [
  ['name tags', 'school concert'],
  ['packets of milk', 'school canteen'],
  ['red packets', 'void deck party'],
  ['tickets', 'MRT station office']
];
function gBondWord(){
  let T = 100, A = 30, B = 20, cands = [], g = 0;
  do {
    T = pick([100, 1000]);
    const step = T === 1000 ? 10 : 1;
    A = step * ri(Math.floor(10 / step) + 1, Math.floor((T * 0.5) / step));
    B = step * ri(Math.floor(10 / step) + 1, Math.floor((T * 0.4) / step));
    cands = [A + B, T - A, T - B];
    g++;
  } while (g < 400 && !(T - A - B > 0 && optsOk(T - A - B, cands)));
  const c = pick(BOND_CTX), k = kid();
  const key = T - A - B;
  return mcNum(k[0] + ' needs ' + T + ' ' + c[0] + ' for the ' + c[1] + '. ' + k[1] + ' already has ' + A +
    ' and gets ' + B + ' more. <b>How many more ' + c[0] + ' are still needed?</b>', '',
    key, cands, '',
    'Step 1 - how many are there now? ' + A + ' + ' + B + ' = ' + (A + B) + '. Step 2 - how many more ' +
    'make ' + T + '? ' + T + ' − ' + (A + B) + ' = ' + key + '. Stopping after step 1 and answering ' +
    (A + B) + ' is the usual slip: that is what ' + k[0] + ' HAS, not what is still missing.');
}

/* FORMAT 1.6 - error spotting, diagnose the mistake (pool 3, 2 steps).
   Word answers, all four written to the same pattern so the key is never the
   odd one out. The child must add first and only then judge. */
function gBondDiagnose(){
  /* REFUTATION FIX (2026-09-15, WOUND 2): this bank used to fall through to an
     arithmetic padding loop (S ± 1, S ± 2, …) whenever the named alternates did
     not survive the 1000 ceiling, which is exactly the unauthored distractor the
     numeric banks are forbidden from shipping. The wrong options are now three
     NAMED slips - never added at all, dropped a carry, measured the gap from the
     wrong end - and a draw that cannot field three of them is thrown away. */
  const word = dd => dd > 0 ? 'too many' : 'too few';
  const lineFor = (sum, whole) =>
    'They make ' + sum + ', which is ' + Math.abs(sum - whole) + ' ' + word(sum - whole) + '.';
  let T = 100, A = 30, B = 80, off = 10, wrongs = [], g = 0;
  do {
    T = pick([100, 1000]);
    const step = T === 1000 ? 50 : 5;
    off = T === 1000 ? pick([50, 100, 150]) : pick([10, 20, 30]);
    /* SCOPE (own 2,000-draw scan, 2026-09-15): at T = 1000 the pair may only
       fall SHORT. A pair that overshoots would print a sum above 1000 in the
       option list, which is outside the P2 number range. At T = 100 both
       directions are drawn, and both directions appear among the options on
       every draw, so nothing about the item gives the direction away. */
    if (T !== 1000 && Math.random() < 0.5) off = -off;
    if (T === 1000) off = -off;
    A = step * ri(1, Math.floor((T * 0.7) / step));
    B = T + off - A;
    wrongs = [];
    if (A > 0 && B > 0 && off !== 0 && A + B === T + off && A <= 1000 && B <= 1000){
      const S0 = A + B, d0 = Math.abs(off), carry = T === 1000 ? 100 : 10;
      const seen = new Set([S0, T]);
      const named = [S0 - carry, S0 + carry, S0 - d0, S0 + d0, S0 - 2 * d0, S0 + 2 * d0];
      wrongs = ['They make ' + T + ', so nothing is wrong.'];
      for (const v of named){
        if (wrongs.length >= 3) break;
        if (v > 0 && v <= 1000 && !seen.has(v)) { seen.add(v); wrongs.push(lineFor(v, T)); }
      }
      if (wrongs.length !== 3) wrongs = [];
    }
    g++;
  } while (g < 400 && wrongs.length !== 3);
  const S = A + B;
  const key = lineFor(S, T);
  const k = kid();
  return mcText(k[0] + ' says ' + A + ' + ' + B + ' = ' + T + '. <b>What is wrong?</b>', '',
    key, wrongs,
    'Add it first, then judge: ' + A + ' + ' + B + ' = ' + S + ', and ' + S + ' is ' + Math.abs(S - T) +
    ' ' + word(off) + ' to be ' + T + '. The bond ' + k[0] + ' wanted is ' + A + ' and ' + (T - A) +
    '. Checking a bond by adding it back is the habit worth building.');
}

/* =====================================================================
 * PRINCIPLE 2 - ADDITION AND SUBTRACTION WITH REGROUPING (within 1000)
 * Ten ones make one ten and ten tens make one hundred - so when a column spills
 * over you carry, and when a column is short you rename one from next door.
 * ===================================================================== */

/* FORMAT 2.1 / 2.3 / 2.6 - the DECLARED ANCHORS. One single-step fluency item
   per pool, on purpose (depth-pilot contract change 2). Same mask by design;
   what changed is that each one now sits in exactly ONE pool and shares that
   pool with five or six other formats. Medium and hard always regroup. */
/* smallerFromLarger(x, y): the commonest column-subtraction bug in P2 - taking
   the smaller digit from the larger in EVERY column instead of renaming. It is a
   named distractor here and the printed claim in gAddSubError, and the harness
   re-derives it there from the rendered stem. */
function smallerFromLarger(x, y){
  let out = 0, mul = 1;
  for (let i = 0; i < 4; i++){
    out += Math.abs((Math.floor(x / mul) % 10) - (Math.floor(y / mul) % 10)) * mul;
    mul *= 10;
  }
  return out;
}
function gAddSubP2(max, mustRegroup){
  let a = 5, b = 3, add = true, cands = [], g = 0;
  do {
    add = Math.random() < 0.5;
    /* the addition draw is bounded so the "wrote the carried ten twice"
       distractor (a + b + 10) still lands inside the topic's own number range. */
    if (add){ a = ri(2, max - 2); b = ri(1, Math.max(1, max - a - (max > 20 ? 10 : 0))); }
    else { a = ri(3, max); b = ri(1, a - 1); }
    const key = add ? a + b : a - b;
    cands = add ? [a + b + 10, a + b - 10, Math.abs(a - b)]
                : [a - b + 10, a - b - 10, (a + b <= max ? a + b : smallerFromLarger(a, b))];
    const regroups = add ? (a % 10) + (b % 10) >= 10 : (b % 10) > (a % 10);
    g++;
    if (mustRegroup && !regroups) continue;
    /* no option may print above 1000: that is the top of the P2 number range,
       and the smaller-from-larger fallback can otherwise land on 1477 for
       1000 − 477 (own scan, 2026-09-15). */
    if (optsOk(key, cands) && cands.every(v => v <= 1000)) break;
  } while (g < 400);
  const key = add ? a + b : a - b;
  if (add) {
    return mcNum(a + ' + ' + b + ' = ?', '', key, cands, '',
      a + ' + ' + b + ' = ' + key + '. Add the ones first: ' + (a % 10) + ' + ' + (b % 10) + ' = ' +
      ((a % 10) + (b % 10)) + ((a % 10) + (b % 10) >= 10
        ? ', which is more than ten, so one ten is carried across.'
        : '.') + ' Then add the tens.');
  }
  return mcNum(a + ' − ' + b + ' = ?', '', key, cands, '',
    a + ' − ' + b + ' = ' + key + '. Look at the ones first: ' + (a % 10) + ' − ' + (b % 10) +
    ((b % 10) > (a % 10)
      ? ' will not go, so rename one ten as ten ones before taking away.'
      : ' goes straight away.') + ' Check it by adding back: ' + key + ' + ' + b + ' = ' + a + '.');
}
function gAddSubP2e(){ return gAddSubP2(20, false); }
function gAddSubP2m(){ return gAddSubP2(100, true); }
function gAddSubP2h(){ return gAddSubP2(1000, true); }

/* FORMAT 2.2 - concept check: what actually happens in the ones column
   (pool 1, 1 step). The idea, with no answer to compute. */
function gRegroupConcept(){
  let a = 47, b = 38, s = 15, g = 0;
  do {
    a = ri(21, 89); b = ri(21, 89);
    s = (a % 10) + (b % 10);
    g++;
  } while (g < 400 && !(s >= 12 && s <= 18 && a + b < 1000 && (a % 10) !== (b % 10)));
  const head = (a % 10) + ' + ' + (b % 10) + ' = ' + s + ', so ';
  const k = kid();
  return mcText(k[0] + ' adds ' + a + ' + ' + b + ' in columns. <b>What happens in the ones column?</b>', '',
    head + 'write ' + (s % 10) + ' and carry 1 ten.',
    [head + 'write ' + s + ' in the ones column.',
     head + 'write 1 and carry ' + (s % 10) + ' tens.',
     head + 'write ' + (s % 10) + ' and carry 1 hundred.'],
    'Ten ones make exactly one ten. ' + (a % 10) + ' + ' + (b % 10) + ' = ' + s + ', which is one ten and ' +
    (s % 10) + ' ones - so ' + (s % 10) + ' stays in the ones column and the one ten moves next door. ' +
    'Two ones digits can never make more than one ten to carry, which is why "carry ' + (s % 10) +
    ' tens" cannot be right.');
}

/* FORMAT 2.4 - mental strategy: add a near-ten by adding the ten and giving
   some back (pool 2, 2 steps). MOE P2 mental calculation. */
function gNearTen(){
  let a = 38, b = 9, round = 10, d = 1, cands = [], g = 0;
  do {
    b = pick([8, 9, 18, 19, 28, 29]);
    round = b + (10 - (b % 10));
    d = round - b;
    a = ri(b + 2, 99 - round);
    cands = [a + round, a + b - 2 * d, a - b];
    g++;
  } while (g < 400 && !(a > b && a + round < 100 && optsOk(a + b, cands)));
  const k = kid();
  return mcNum(k[0] + ' works out ' + a + ' + ' + b + ' by adding ' + round +
    ' and then taking some away. <b>What is ' + a + ' + ' + b + '?</b>', '',
    a + b, cands, '',
    b + ' is only ' + d + ' less than ' + round + '. So add the easy number first: ' + a + ' + ' + round +
    ' = ' + (a + round) + ', then give the ' + d + ' back: ' + (a + round) + ' − ' + d + ' = ' + (a + b) +
    '. Forgetting to give it back is the whole trap, and it lands on ' + (a + round) + '.');
}

/* FORMAT 2.5 - working backwards (pool 2, 2 steps). The missing addend as a
   sentence rather than as "137 + ? = 265", so the child has to build the
   subtraction themselves. */
function gAddSubInverse(){
  let P = 137, W = 265, cands = [], g = 0;
  do {
    /* P + W is the "added instead of taking away" distractor and it is the one
       that matters on an inverse item, so the draw is bounded to keep it inside
       the P2 number range (own scan, 2026-09-15). */
    P = ri(101, 300); W = ri(P + 20, 1000 - P);
    cands = [P + W, smallerFromLarger(W, P), W - P + 10];
    g++;
  } while (g < 400 && !((P % 10) > (W % 10) && W - P > 0 && P + W <= 1000 && optsOk(W - P, cands)));
  return mcNum('A number is added to ' + P + '. The answer is ' + W + '. <b>What is the number?</b>', '',
    W - P, cands, '',
    'Adding put the number IN, so taking away gets it back out: ' + W + ' − ' + P + ' = ' + (W - P) +
    '. Check it the way a bond checks: ' + P + ' + ' + (W - P) + ' = ' + W + '. Adding the two given ' +
    'numbers instead gives ' + (P + W) + ', which is bigger than the answer we were told - a quick ' +
    'sense check a seven-year-old can make on their own.');
}

/* FORMAT 2.7 - error spotting, DIAGNOSE AND CORRECT (pool 3, 2 steps).
   The named misconception is the commonest column-subtraction bug in P2: taking
   the SMALLER digit from the LARGER in each column instead of renaming.
   The oracle re-derives the printed claim from that rule and fails if the claim
   is not actually what that mistake produces.

   REFUTATION FIX (2026-09-15, WOUND 3): the question used to be "What is a − b?"
   - a bare subtraction in 2,000 of 2,000 draws, so a child who ignored the story
   got the key in one operation and the slot counted as ONE step, not two. Each
   option now carries BOTH halves - the slip that was made and the result it
   gives - so the item cannot be answered without doing the diagnosis as well as
   the arithmetic, the way gPeriError earned its two steps in the depth pilot.
   optsOk still binds: the four printed results are distinct positive whole
   numbers, so no two options can print the same answer. */
function gAddSubError(){
  let a = 52, b = 27, claim = 35, cands = [], g = 0;
  do {
    a = ri(31, 99); b = ri(12, a - 11);
    claim = smallerFromLarger(a, b);
    cands = [claim, a - b - 10, (Math.floor(a / 10) - Math.floor(b / 10)) * 10];
    g++;
  } while (g < 400 && !((b % 10) > (a % 10) && Math.floor(a / 10) > Math.floor(b / 10) &&
           claim !== a - b && optsOk(a - b, cands)));
  const k = kid();
  const tensOnly = (Math.floor(a / 10) - Math.floor(b / 10)) * 10;
  const say = (slip, n) => slip + ' ' + a + ' − ' + b + ' = ' + n + '.';
  return mcText(k[0] + ' works out ' + a + ' − ' + b + ' in columns and gets ' + claim +
    '. <b>What went wrong, and what is ' + a + ' − ' + b + '?</b>', '',
    say('The ones were subtracted the wrong way round.', a - b),
    [say('Nothing went wrong; the working is correct.', claim),
     say('A ten was renamed when none was needed.', a - b - 10),
     say('The ones column was skipped altogether.', tensOnly)],
    'In the ones column ' + (a % 10) + ' − ' + (b % 10) + ' will not go, so ' + k[0] +
    ' turned it round and did ' + (b % 10) + ' − ' + (a % 10) + ' instead. That is the mistake. Rename ' +
    'one ten instead: ' + (a % 10) + ' becomes ' + ((a % 10) + 10) + ' ones, ' + ((a % 10) + 10) + ' − ' +
    (b % 10) + ' = ' + (((a % 10) + 10) - (b % 10)) + ', and the tens column is one ten smaller. ' +
    a + ' − ' + b + ' = ' + (a - b) + '.');
}

/* FORMAT 2.8 - two-step word problem, Singapore context (pool 3, 2 steps). */
const HAVE_CTX = [['marbles', 'the void deck'], ['stickers', 'the school fair'],
                  ['beads', 'the craft corner'], ['cards', 'the canteen swap']];
function gAddSubWord(){
  let A = 245, B = 178, C = 134, cands = [], g = 0;
  do {
    A = ri(110, 420); B = ri(60, 330); C = ri(40, Math.min(A - 10, 240));
    cands = [A + B, A + B + C, A - C];
    g++;
  } while (g < 400 && !(A + B + C <= 1000 && A + B - C > 0 && A - C > 0 && optsOk(A + B - C, cands)));
  const c = pick(HAVE_CTX), k = kid();
  const key = A + B - C;
  return mcNum(k[0] + ' had ' + A + ' ' + c[0] + ' and bought ' + B + ' more. ' + k[1] + ' then gave away ' +
    C + ' ' + c[0] + ' at ' + c[1] + '. <b>How many ' + c[0] + ' are left?</b>', '',
    key, cands, '',
    'Step 1 - how many after buying? ' + A + ' + ' + B + ' = ' + (A + B) + '. Step 2 - take away what ' +
    'was given: ' + (A + B) + ' − ' + C + ' = ' + key + '. Answering ' + (A + B) +
    ' means the giving-away step was forgotten, and ' + (A + B + C) + ' means it was added on instead.');
}

/* =====================================================================
 * PRINCIPLE 3 - EQUAL GROUPS (the 2, 3, 4, 5 and 10 tables)
 * Multiplication counts equal groups. Division either shares into equal groups
 * or asks how many groups fit. They are the same fact from two ends.
 * ===================================================================== */

/* FORMAT 3.1 / 3.4 - the DECLARED FACT ANCHORS. gMulP2easy holds the 2, 5 and
   10 tables in pool 1; gMulP2hard holds the harder P2 tables (3 and 4) in pool
   2. The audit's complaint was that one function spanned pools 1 and 2 with one
   stem; each now sits in one pool, beside five other multiplication formats. */
/* Rendered locally rather than through core's gMul so the three distractors are
   NAMED misconceptions and q.authored is stamped on every draw (core's gMul
   offers a five-deep unnamed candidate list, which leaves the harness's
   distractor-identity contract unbound - the gap the depth-pilot refutation
   flagged in its section 6). The stem is byte-identical to gMul's, so the
   shared "a × b = ?" oracle still binds. */
function gMulP2(tables){
  let a = 2, b = 2, cands = [], g = 0;
  do {
    a = pick(tables); b = ri(2, 10);
    cands = [a * b + a, a * b - a, a + b];
    g++;
  } while (g < 400 && !optsOk(a * b, cands));
  return mcNum(a + ' × ' + b + ' = ?', '', a * b, cands, '',
    a + ' × ' + b + ' = ' + (a * b) + ' means ' + b + ' groups of ' + a + '. Count in ' + a + 's: ' +
    Array.from({ length: Math.min(b, 5) }, (_, i) => a * (i + 1)).join(', ') + '… and stop on the ' +
    ord(b) + ' count. Stopping one count late gives ' + (a * b + a) + ', and adding the two numbers gives ' +
    (a + b) + ' - both are worth naming out loud.');
}
function gMulP2easy(){ return gMulP2([2, 5, 10]); }
function gMulP2hard(){ return gMulP2([3, 4]); }

/* FORMAT 3.2 - equal groups described in words (pool 1, 1 step). */
const GROUP_CTX = [
  ['The hawker centre', 'tables', 'stools', 'table'],
  ['The school canteen', 'trays', 'buns', 'tray'],
  ['The MRT platform', 'benches', 'seats', 'bench'],
  ['The NTUC shelf', 'boxes', 'eggs', 'box'],
  ['The void deck', 'mats', 'cushions', 'mat']
];
function gGroupsP2(){
  let a = 4, b = 5, cands = [], g = 0;
  do {
    a = pick([2, 3, 4, 5, 10]); b = ri(2, 10);
    cands = [a + b, a * b - a, a * b + b];
    g++;
  } while (g < 400 && !optsOk(a * b, cands));
  const c = pick(GROUP_CTX);
  return mcNum(c[0] + ' has ' + a + ' ' + c[1] + ' with ' + b + ' ' + c[2] + ' at each ' + c[3] +
    '. <b>How many ' + c[2] + ' are there altogether?</b>', '',
    a * b, cands, '',
    'Equal groups means multiply: ' + a + ' groups of ' + b + ' is ' + a + ' × ' + b + ' = ' + (a * b) +
    ' ' + c[2] + '. Count it out loud in ' + b + 's to check. Adding the two numbers (' + (a + b) +
    ') counts the groups, not what is inside them - that is the slip to watch for.');
}

/* FORMAT 3.3 - skip counting, the P2 way into a table (pool 1, 1 step).
   The oracle checks the PRINTED sequence really does step by the stated amount,
   so a stem can never contradict its own count. */
function gSkipCount(){
  const a = pick([2, 3, 4, 5, 10]);
  const start = a * ri(1, 4);
  const seq = [start, start + a, start + 2 * a, start + 3 * a];
  const last = seq[seq.length - 1], key = last + a;
  let cands = [last + 1, last + 2 * a, key - 1];
  if (!optsOk(key, cands)) cands = [last + 1, last + 2 * a, key + 1];
  const k = kid();
  return mcNum(k[0] + ' counts in ' + a + 's: ' + seq.join(', ') + ', … <b>What number comes next?</b>', '',
    key, cands, '',
    'Each number is ' + a + ' more than the one before it, so the next one is ' + last + ' + ' + a +
    ' = ' + key + '. Counting in ' + a + 's out loud - ' + seq.join(', ') + ', ' + key +
    ' - is the ' + a + ' times table being built, one step at a time.');
}

/* FORMAT 3.5 - concept check: repeated addition IS multiplication
   (pool 2, 2 steps). Exactly one option evaluates to the total; the oracle
   evaluates all four and fails on a second correct reading. */
function gMulRepeatAdd(){
  let n = 4, v = 6, g = 0;
  do {
    v = pick([2, 3, 4, 5, 10]); n = ri(2, 5);
    g++;
  } while (g < 400 && !(n !== v && n + v !== n * v && n * n !== n * v && v * v !== n * v &&
           uniq4([n + ' × ' + v, v + ' × ' + v, n + ' + ' + v, n + ' × ' + n])));
  const addends = Array.from({ length: n }, () => v).join(' + ');
  return mcText('Which multiplication has the same answer as <b>' + addends + '</b>?', '',
    n + ' × ' + v,
    [v + ' × ' + v, n + ' + ' + v, n + ' × ' + n],
    'Count the ' + v + 's: there are ' + n + ' of them, so this is ' + n + ' groups of ' + v +
    ', which is ' + n + ' × ' + v + ' = ' + (n * v) + '. Multiplication is a short way of writing ' +
    'the same number added over and over - that is the whole idea, and it is why the times tables ' +
    'are worth knowing by heart.');
}

/* FORMAT 3.6 - error spotting, DIAGNOSE AND CORRECT (pool 3, 2 steps).
   The named misconception: skip counting for the answer but saying one number
   too many. The stem PRINTS the count, and the oracle checks the printed count
   really is a, 2a, ... (b+1)a and really does end on the claim - so the item can
   never contradict itself the way the pilot's gLError once did.

   REFUTATION FIX (2026-09-15, WOUND 3): the question used to be "What is a × b?"
   - a bare table fact in 2,000 of 2,000 draws, answerable without reading the
   story at all, so the slot was ONE step. Each option now names the slip AND
   gives the result it produces, so both halves are forced. */
function gMulError(){
  let a = 4, b = 3, cands = [], g = 0;
  do {
    a = pick([2, 3, 4, 5, 10]); b = ri(3, 9);
    cands = [a * (b + 1), a + b, a * (b - 1)];
    g++;
  } while (g < 400 && !(a * (b + 1) <= 100 && optsOk(a * b, cands)));
  const seq = Array.from({ length: b + 1 }, (_, i) => a * (i + 1));
  const claim = seq[seq.length - 1];
  const k = kid();
  const say = (slip, n) => slip + ' ' + a + ' × ' + b + ' = ' + n + '.';
  return mcText(k[0] + ' works out ' + a + ' × ' + b + ' by counting in ' + a + 's: ' + seq.join(', ') +
    '. ' + k[1] + ' says ' + a + ' × ' + b + ' = ' + claim +
    '. <b>What went wrong, and what is ' + a + ' × ' + b + '?</b>', '',
    say('One count too many was said.', a * b),
    [say('Nothing went wrong; the count is right.', claim),
     say('One count too few was said.', a * (b - 1)),
     say('The two numbers were added, not counted.', a + b)],
    'Count the numbers ' + k[0] + ' said, not the size of them: there are ' + (b + 1) + ' of them, but ' +
    a + ' × ' + b + ' needs only ' + b + ' of them. Stop at the ' + ord(b) + ': ' + a + ' × ' + b + ' = ' +
    (a * b) + '. Touching a finger for each count is the fix - one finger per group.');
}

/* FORMAT 3.7 - two-step word problem (pool 3, 2 steps). */
const PACK_CTX = [['packets', 'packet', 'curry puffs'], ['boxes', 'box', 'kaya toast slices'],
                  ['trays', 'tray', 'buns'], ['bags', 'bag', 'kueh']];
function gMulTwoStep(){
  let a = 5, b = 4, c = 3, cands = [], g = 0;
  do {
    /* never give away more than half: a P2 word problem that leaves 2 of 10
       reads as a trick rather than a two-step (own read, 2026-09-15). */
    a = ri(2, 9); b = pick([2, 3, 4, 5, 10]); c = ri(2, Math.max(2, Math.floor(a * b / 2)));
    cands = [a * b, a * b + c, a + b];
    g++;
  } while (g < 400 && !(a * b - c > 0 && optsOk(a * b - c, cands)));
  const p = pick(PACK_CTX), k = kid();
  const key = a * b - c;
  return mcNum(k[0] + ' buys ' + a + ' ' + p[0] + ' of ' + p[2] + '. Each ' + p[1] + ' holds ' + b + ' ' +
    p[2] + '. ' + k[1] + ' gives away ' + c + ' ' + p[2] + '. <b>How many ' + p[2] + ' are left?</b>', '',
    key, cands, '',
    'Step 1 - how many altogether? ' + a + ' ' + p[0] + ' of ' + b + ' is ' + a + ' × ' + b + ' = ' +
    (a * b) + '. Step 2 - give ' + c + ' away: ' + (a * b) + ' − ' + c + ' = ' + key +
    '. Answering ' + (a * b) + ' means only the first step was done.');
}

/* FORMAT 3.8 - direct division fact, the DECLARED ANCHOR of the div skill
   (pool 1, 1 step). */
function gDivP2fact(){
  let a = 5, b = 4, cands = [], g = 0;
  do {
    a = pick([2, 3, 4, 5, 10]); b = ri(2, 10);
    cands = [b + 1, b - 1, a];
    g++;
  } while (g < 400 && !optsOk(b, cands));
  return mcNum((a * b) + ' ÷ ' + a + ' = ?', '', b, cands, '',
    'Turn it into a multiplication: ' + a + ' × ? = ' + (a * b) + '. Count in ' + a + 's until you reach ' +
    (a * b) + ' and see how many counts it took - ' + b + '. So ' + (a * b) + ' ÷ ' + a + ' = ' + b + '.');
}

/* FORMAT 3.9 - fact family from the multiplication end (pool 2, 2 steps).
   Exactly one option is a true division statement; the oracle proves it. */
function gDivFamilyP2(){
  let a = 4, b = 5, g = 0;
  do {
    a = pick([2, 3, 4, 5, 10]); b = ri(2, 10);
    g++;
  } while (g < 400 && !(a !== b && uniq4([
    (a * b) + ' ÷ ' + a + ' = ' + b,
    (a * b) + ' ÷ ' + b + ' = ' + (a + 1),
    a + ' ÷ ' + b + ' = ' + (a * b),
    (a * b) + ' ÷ ' + (b + 1) + ' = ' + a
  ])));
  const p = a * b;
  return mcText('You know that ' + a + ' × ' + b + ' = ' + p +
    '. <b>Which division fact uses the same three numbers?</b>', '',
    p + ' ÷ ' + a + ' = ' + b,
    [p + ' ÷ ' + b + ' = ' + (a + 1), a + ' ÷ ' + b + ' = ' + p, p + ' ÷ ' + (b + 1) + ' = ' + a],
    'The family holds ' + a + ', ' + b + ' and ' + p + ', and every fact uses all three: ' + a + ' × ' + b +
    ' = ' + p + ', ' + b + ' × ' + a + ' = ' + p + ', ' + p + ' ÷ ' + a + ' = ' + b + ' and ' + p + ' ÷ ' +
    b + ' = ' + a + '. Division always starts from the BIGGEST of the three, because that is the whole ' +
    'amount being shared out.');
}

/* FORMAT 3.10 - sharing, two steps (pool 2, 2 steps). Divide to find one share,
   then multiply for the number of shares asked about. */
const SHARE_CTX = [['stickers', 'children'], ['curry puffs', 'plates'],
                   ['shells', 'jars'], ['name tags', 'tables']];
function gDivShareP2(){
  /* SCOPE (refutation 2026-09-15, KILL 1): step 1 is always a table fact, but
     step 2 is want x each, and with gN = 10 that put BOTH factors outside the
     five P2 tables in 5.6% of draws - "9 x 7 = 63" was printed in the
     explanation and 63 was the answer key. The draw is now rejected unless one
     of the two factors is itself a P2 table (the other is 1-10 by construction),
     so the whole item stays inside the 2/3/4/5/10 tables end to end. Asserted by
     the p2 scope gate in tools/gen-sanity.mjs, not just scanned. */
  let gN = 5, each = 4, want = 2, cands = [], g = 0;
  do {
    gN = pick([3, 4, 5, 10]); each = ri(2, 10); want = ri(2, gN - 1);
    cands = [each, gN * each - want, want * gN];
    g++;
  } while (g < 400 && !(gN > 2 && want < gN && inTables(want, each) &&
           optsOk(want * each, cands)));
  const c = pick(SHARE_CTX), k = kid();
  const total = gN * each, key = want * each;
  return mcNum(k[0] + ' shares ' + total + ' ' + c[0] + ' equally among ' + gN + ' ' + c[1] +
    '. <b>How many ' + c[0] + ' do ' + want + ' ' + c[1] + ' get altogether?</b>', '',
    key, cands, '',
    'Step 1 - what does ONE get? ' + total + ' ÷ ' + gN + ' = ' + each + '. Step 2 - what do ' + want +
    ' get? ' + want + ' × ' + each + ' = ' + key + '. Stopping after the sharing and answering ' + each +
    ' is the usual slip: that is one share, and the question asked for ' + want + '.');
}

/* FORMAT 3.11 - grouping, two steps (pool 3, 2 steps). Division as "how many
   groups fit", which is the other half of the P2 division idea. */
const FILL_CTX = [['buns', 'trays', 'tray', 'school canteen'], ['eggs', 'boxes', 'box', 'NTUC storeroom'],
                  ['kueh', 'bags', 'bag', 'hawker stall'], ['books', 'shelves', 'shelf', 'school library']];
function gDivGroupWord(){
  let per = 5, groups = 6, filled = 3, cands = [], g = 0;
  do {
    per = pick([2, 3, 4, 5, 10]); groups = ri(5, 10); filled = ri(2, groups - 2);
    cands = [groups, groups + filled, per * groups - per * filled];
    g++;
  } while (g < 400 && !(filled >= 2 && groups - filled > 1 && optsOk(groups - filled, cands)));
  const c = pick(FILL_CTX);
  const total = per * groups, key = groups - filled;
  return mcNum('The ' + c[3] + ' has ' + total + ' ' + c[0] + '. Each ' + c[2] + ' holds ' + per + ' ' +
    c[0] + '. ' + filled + ' ' + c[1] + ' have already been filled. <b>How many more ' + c[1] +
    ' are needed?</b>', '',
    key, cands, '',
    'Step 1 - how many ' + c[1] + ' altogether? ' + total + ' ÷ ' + per + ' = ' + groups +
    '. Step 2 - take away the ' + filled + ' already done: ' + groups + ' − ' + filled + ' = ' + key +
    '. Answering ' + groups + ' forgets the ones already filled; answering ' + (per * groups - per * filled) +
    ' counts ' + c[0] + ' when the question asked for ' + c[1] + '.');
}

/* FORMAT 3.12 - error spotting, diagnose what the check proves
   (pool 3, 2 steps). Word answers, all four the same shape: a verdict plus a
   quotient. Only one is true, and the child has to do both halves. */
function gDivCheckP2(){
  /* REFUTATION FIX (2026-09-15) - KILL 2 and WOUND 1, three defects in one bank:
     - SCOPE. claim was bounded only by claim <= 12, so the stem printed a TRUE
       multiplication outside the five P2 tables in 10.7% of draws ("4 × 11 = 44",
       "10 × 12 = 120") and handed a seven-year-old a division answer of 11 or 12.
       The claim is now 2-10 and the divisor is a P2 table, so the printed check
       is always a table fact and so is every quotient on screen.
     - "The answer is correct." was the key in 0 of 2,000 draws, because the draw
       forced claim !== quot. It is now the key in about ONE DRAW IN FOUR, and
       when it is, the printed check really does land on the total.
     - the two spare distractors were counted up from 1, so they printed a
       quotient of 3 or less in 2,000 of 2,000 draws and the key was the only
       plausible number in 80.9% of them - the gLPerimDiff class in a value
       pattern the coarse format-tell rule cannot see. The wrong quotients are now
       drawn from the same 2-10 band as the key and forced to STRADDLE it, and
       every option states the verdict its own quotient implies, so no option can
       be picked out by its value or by its wording. The oracle asserts both. */
  const rightKey = Math.random() < 0.25;
  let d = 4, quot = 6, claim = 6, others = [], g = 0;
  do {
    d = pick([2, 3, 4, 5, 10]);
    quot = ri(3, 9);                  /* leaves room for a wrong quotient on BOTH sides */
    claim = rightKey ? quot : quot + pick([1, 2, 3]) * (Math.random() < 0.5 ? 1 : -1);
    others = [];
    if (claim >= 2 && claim <= 10){
      const pool = [];
      for (let n = 2; n <= 10; n++) if (n !== quot && n !== claim) pool.push(n);
      for (let t = 0; t < 40 && others.length !== 3; t++){
        const s = shuffle(pool.slice()).slice(0, rightKey ? 3 : 2);
        const cand = rightKey ? s : [claim].concat(s);
        const all = cand.concat([quot]);
        /* (a) the key's quotient is never the only plausible number - a wrong
           quotient sits above it and another below it; (b) both direction words
           appear, so the wording alone cannot settle it either. */
        if (cand.length === 3 &&
            Math.min.apply(null, cand) < quot && Math.max.apply(null, cand) > quot &&
            Math.min.apply(null, all) < claim && Math.max.apply(null, all) > claim) others = cand;
      }
    }
    g++;
  } while (g < 400 && others.length !== 3);
  if (others.length !== 3){ d = 5; quot = 6; claim = rightKey ? 6 : 8; others = rightKey ? [4, 7, 9] : [8, 4, 9]; }
  const T = d * quot;
  /* every option is internally coherent: it asserts a quotient and the verdict
     that quotient implies about the claim. Exactly one asserts the true one, and
     exactly one (the n = claim option) reads "correct" - the key in the
     rightKey draws and a distractor in the others. */
  const verdict = n => claim > n ? 'too big' : (claim < n ? 'too small' : 'correct');
  const line = n => 'The answer is ' + verdict(n) + '. ' + T + ' ÷ ' + d + ' = ' + n + '.';
  const key = line(quot);
  const k = kid();
  return mcText(k[0] + ' works out ' + T + ' ÷ ' + d + ' and gets ' + claim + '. ' + k[1] + ' checks: ' +
    d + ' × ' + claim + ' = ' + (d * claim) + '. <b>What does the check tell ' +
    (k[1] === 'He' ? 'him' : 'her') + '?</b>', '',
    key, others.map(line),
    'The check is the proof: ' + d + ' × ' + claim + ' = ' + (d * claim) + ', and we needed ' + T +
    (claim === quot
      ? ' - it lands exactly on it, so ' + claim + ' is correct. ' + T + ' ÷ ' + d + ' = ' + quot + '.'
      : '. So ' + claim + ' is ' + verdict(quot) + '. The fact that fits is ' + d + ' × ' + quot + ' = ' +
        T + ', so ' + T + ' ÷ ' + d + ' = ' + quot + '.') +
    ' Multiplying the answer back is how a child checks a division without asking anyone.');
}

/* =====================================================================
 * PRINCIPLE 4 - COMPARING AND ORDERING NUMBERS TO 1000
 * Compare hundreds first, then tens, then ones. A longer-looking digit does not
 * win: its PLACE does.
 * ===================================================================== */

/* FORMAT 4.1 - direct compare (pool 1, 1 step). KEPT NAME. Now drawn so that at
   least two numbers share a hundreds digit, so the answer is not always settled
   by the first digit alone. */
function gCompareNum(){
  /* REFUTATION FIX (2026-09-15, WOUND 4). The explanation used to assert, on
     every draw, that "two of these share a hundreds digit on purpose, so the
     tens have to be read too". It was wrong three ways: the extremum was settled
     by its hundreds digit ALONE in 55.9% of draws (so the tens did not have to
     be read), three or four numbers shared a hundreds digit in 21.4% (so "two"
     was wrong), and in 0.45% the two seeded numbers collided in the Set and no
     two shared at all (so the sentence was flatly false). The draw now really
     does guarantee a shared hundreds digit somewhere, and the sentence is
     branched on whether the ANSWER's own hundreds digit is shared - the only
     case in which the tens have to be read. Asserted by the p2 gate in
     tools/gen-sanity.mjs, both directions. */
  let arr = [], g = 0;
  do {
    const h = ri(1, 9);
    const ns = new Set([h * 100 + ri(0, 99), h * 100 + ri(0, 99)]);
    while (ns.size < 4) ns.add(ri(100, 999));
    arr = [...ns];
    g++;
  } while (g < 400 && !(arr.length === 4 &&
           new Set(arr.map(n => Math.floor(n / 100))).size < 4));
  const wantMax = Math.random() < 0.5;
  const best = wantMax ? Math.max(...arr) : Math.min(...arr);
  const shown = shuffle(arr);
  const bestH = Math.floor(best / 100);
  const tie = shown.filter(n => Math.floor(n / 100) === bestH).length > 1;
  return { q: 'Which number is the <b>' + (wantMax ? 'greatest' : 'smallest') + '</b>?', extra: '',
    choices: shown.map(String), correct: shown.indexOf(best),
    explain: 'Compare the hundreds first, then the tens, then the ones. ' +
      shown.map(n => Math.floor(n / 100)).join(', ') + ' are the hundreds digits, and the ' +
      (wantMax ? 'greatest' : 'smallest') + ' number is ' + best + '. ' +
      (tie
        ? 'Another number starts with ' + bestH + ' too, so the tens have to be read to settle it.'
        : 'No other number starts with ' + bestH + ', so the hundreds digit settles it on its own.'),
    answerText: String(best), optionSet: shown.map(String) };
}

/* FORMAT 4.2 - place value in expanded form (pool 1, 1 step). */
function gPlaceP2(){
  let h = 4, t = 7, o = 6, cands = [], g = 0;
  do {
    h = ri(1, 9); t = ri(1, 9); o = ri(1, 9);
    cands = [t, t * 100, t * 10 + o];
    g++;
  } while (g < 400 && !(t !== h && t !== o && optsOk(t * 10, cands)));
  const W = h * 100 + t * 10 + o;
  return mcNum(W + ' = ' + (h * 100) + ' + ? + ' + o + '. <b>What is the missing number?</b>', '',
    t * 10, cands, '',
    W + ' is ' + plural(h, 'hundred', 'hundreds') + ', ' + plural(t, 'ten', 'tens') + ' and ' +
    plural(o, 'one', 'ones') + '. The hundreds (' + (h * 100) +
    ') and the ones (' + o + ') are already written, so the missing piece is the tens: ' +
    plural(t, 'ten', 'tens') + ' = ' +
    (t * 10) + '. Writing ' + t + ' instead is the classic slip - the DIGIT is ' + t +
    ', but what it is worth is ' + (t * 10) + '.');
}

/* FORMAT 4.3 - ordering three numbers (pool 2, 2 steps). Exactly one list is in
   the asked order; the oracle checks all four. */
function gOrderP2(){
  let ns = [], g = 0;
  do {
    const h = ri(1, 8);
    const s = new Set([h * 100 + ri(0, 99), h * 100 + ri(0, 99), ri(100, 999)]);
    ns = [...s];
    g++;
  } while (g < 400 && ns.length !== 3);
  const up = Math.random() < 0.5;
  const sorted = ns.slice().sort((x, y) => up ? x - y : y - x);
  const perms = [];
  const permute = (arr, cur) => {
    if (!arr.length) { perms.push(cur.slice()); return; }
    for (let i = 0; i < arr.length; i++) permute(arr.slice(0, i).concat(arr.slice(i + 1)), cur.concat([arr[i]]));
  };
  permute(ns, []);
  const key = sorted.join(', ');
  const wrongs = shuffle(perms.map(p => p.join(', ')).filter(s => s !== key)).slice(0, 3);
  return mcText('Which list is in order from <b>' + (up ? 'smallest to greatest' : 'greatest to smallest') +
    '</b>?', '', key, wrongs,
    'Compare the hundreds first: ' + sorted.map(n => Math.floor(n / 100)).join(', ') +
    '. Where two numbers have the same hundreds, move to the tens, and only then to the ones. In order ' +
    'from ' + (up ? 'smallest to greatest' : 'greatest to smallest') + ' they are ' + key + '.');
}

/* FORMAT 4.4 - error spotting, diagnose (pool 3, 2 steps). Drawn so the ones AND
   the tens both point the wrong way, and only the hundreds rule gets it right -
   so the item cannot be answered by reading any single digit. */
function gCompareError(){
  let ha = 1, hb = 2, ta = 8, tb = 0, oa = 9, ob = 5, g = 0;
  do {
    ha = ri(1, 8); hb = ri(ha + 1, 9);
    ta = ri(5, 9); tb = ri(0, ta - 1);
    oa = ri(5, 9); ob = ri(0, oa - 1);
    g++;
  } while (g < 400 && !(hb > ha && ta > tb && oa > ob));
  const a = ha * 100 + ta * 10 + oa, b = hb * 100 + tb * 10 + ob;
  const line = (place, x, word, y, winner) =>
    'Start with the ' + place + ': ' + x + ' is ' + word + ' ' + y + ', so ' + winner + ' is greater.';
  const key = line('hundreds', ha, 'less than', hb, b);
  const k = kid();
  return mcText(k[0] + ' says ' + a + ' is greater than ' + b + ', because ' + oa + ' is more than ' + ob +
    '. <b>What went wrong?</b>', '',
    key,
    [line('ones', oa, 'more than', ob, a),
     line('tens', ta, 'more than', tb, a),
     line('hundreds', ha, 'less than', hb, a)],
    'The ones digit does not decide anything on its own. ' + a + ' has ' + plural(ha, 'hundred', 'hundreds') +
    ' and ' + b + ' has ' + hb + ', and ' + plural(ha, 'hundred', 'hundreds') + ' is less than ' +
    plural(hb, 'hundred', 'hundreds') + ', so ' + b + ' is the ' +
    'greater number. Always start on the LEFT, at the biggest place, and only move right when two ' +
    'digits are the same.');
}


  MQI.registerTopic({
    id:'p2', level:'P2', strand:'Number and Algebra',
    moeSubTopic:"Whole Numbers: addition and subtraction algorithms; multiplication tables of 2, 3, 4, 5 and 10",
    label:'Number Beach', short:'P2 numbers', e:'🏖️',
    skills:{
      addsub: {label:'Addition & subtraction', tip:'Ten ones make one ten. Say the carrying out loud: "seven and eight is fifteen - write five, carry one ten." Build up: within 20, then 100, then 1000.'},
      bonds:  {label:'Number bonds',           tip:'Drill pairs that make 10, 20, 100 and 1000 until instant: 3+7, 13+7, 35+65, 400+600. Always check a bond by adding it back.'},
      mult:   {label:'Times tables (2, 3, 4, 5, 10)', tip:'P2 tables: 2, 5, 10 first, then 3 and 4. Skip count out loud while clapping, and touch one finger per group so the count does not run one too far.'},
      div:    {label:'Sharing & grouping',     tip:'Two questions live in one division: "how many does each get?" (sharing) and "how many groups fit?" (grouping). Check either by multiplying back.'},
      compare:{label:'Comparing numbers',      tip:'Compare hundreds first, then tens, then ones. A big ones digit never wins on its own.'}
    },
    pools:{
      1:[[gBonds,'bonds'],[gBondPair,'bonds'],
         [gAddSubP2e,'addsub'],[gRegroupConcept,'addsub'],
         [gMulP2easy,'mult'],[gGroupsP2,'mult'],[gSkipCount,'mult'],
         [gDivP2fact,'div'],
         [gCompareNum,'compare'],[gPlaceP2,'compare']],
      2:[[gBondFamily,'bonds'],[gBondError,'bonds'],
         [gAddSubP2m,'addsub'],[gNearTen,'addsub'],[gAddSubInverse,'addsub'],
         [gMulP2hard,'mult'],[gMulRepeatAdd,'mult'],
         [gDivFamilyP2,'div'],[gDivShareP2,'div'],
         [gOrderP2,'compare']],
      3:[[gBondWord,'bonds'],[gBondDiagnose,'bonds'],
         [gAddSubP2h,'addsub'],[gAddSubError,'addsub'],[gAddSubWord,'addsub'],
         [gMulError,'mult'],[gMulTwoStep,'mult'],
         [gDivGroupWord,'div'],[gDivCheckP2,'div'],
         [gCompareError,'compare']]
    }
  });
})();
