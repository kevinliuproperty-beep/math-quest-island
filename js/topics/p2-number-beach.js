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
 * POOL 3 DEMAND, COUNTED HONESTLY: 7 of the 10 pool-3 slots ask a second solving
 * step. THREE DO NOT, and they are declared here rather than counted as two-step:
 *   - gAddSubP2h - the single-step fluency anchor (above);
 *   - gAddSubError - "... gets 35. What is 55 - 36?" - one subtraction, framed by
 *     a named misconception that is an excellent distractor but not a step;
 *   - gMulError   - "... says 4 x 9 = 40. What is 4 x 9?" - one step of READING,
 *     not one table fact: the answer is the second-to-last number in the count
 *     printed on the screen, in 20,000 of 20,000 draws (third-pass refutation,
 *     WOUND 5). That IS the intended reasoning - "the count ran one too far" -
 *     and the item is still worth setting, but the demand is reading the count,
 *     not recalling the table.
 * The v2 rewrite of those last two asked for the slip AND the result, which the
 * second-pass refutation measured as answerable with NO arithmetic at all in
 * 20,000 of 20,000 draws each: the stem prints one fixed misconception, so the
 * true diagnosis was one fixed English clause and a child could learn the phrase.
 * Both are back to their v1 questions (2026-09-15, KILL B). The number in the
 * lane note is 7 of 10, not 9 of 10; a one-operation item with a named-mistake
 * premise is still worth setting, and it is not a second step.
 *
 * DISTRACTOR CONTRACT: every numeric item goes through mcNum with exactly three
 * NAMED misconceptions, and the draw is rejected (optsOk) unless all three are
 * positive, whole and distinct from the key and from each other - so q.authored
 * is stamped on every draw and finishNum's padding branch never fires.
 * KEY VALUE RANK (2026-09-15, second-pass WOUND 3): three named slips that all
 * land on ONE side of the key fix the key's position in the sorted option list,
 * and a child can then win by sorting four numbers. Every numeric bank now hands
 * ranked() a POOL of named slips with candidates on BOTH sides, and the draw
 * picks a target rank from the ranks that pool can actually field. Asserted by
 * the rank gate in tools/gen-sanity.mjs: no rank may hold more than 45% of a
 * bank's draws. gCompareNum is the one documented exemption - "which is the
 * greatest?" makes the key the extremum BY DEFINITION, so its rank is the
 * question, not a tell.
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
 *
 * NO OPTION MAY CARRY AN ODD TOKEN (2026-09-16, fourth-pass WOUND 1). A numeral
 * or a word that appears in exactly ONE of the four options singles that option
 * out, and a child who bins it or picks it has done no mathematics. v4's
 * gMulRepeatAdd shipped n × v, w × v, n × n and v × v: w was used once, and
 * "bin the odd numeral, then take the remaining unlike product" was the key in
 * 20,000 of 20,000 draws. The p2 TOKEN RULER in tools/gen-sanity.mjs fails any
 * p2 bank where an odd token hands the key over in 60% of a sample, with that
 * option set as its negative control.
 *
 * gCompareError: THE DECIDING PLACE VARIES (2026-09-16, fourth-pass WOUND 2).
 * Fixing the hundreds as the deciding place on every draw left "start with the
 * hundreds" AND "name the other number" together finding the key in 100% of
 * draws with no digit compared, on the most-served generator in the topic. The
 * hundreds decide in a third of draws, the tens in a third (the hundreds tie)
 * and the ones in a third (the hundreds and the tens tie), so the taught rule is
 * necessary and never sufficient. Measured floors are in the lane note.
 *
 * ... AND SO DOES THE STEM SHAPE (2026-09-16, fifth-pass KILL 1). v5's redesign
 * reached two thirds of its own generator: the "A is greater than B" CLAIM stem
 * was drawn ONLY when the hundreds decide, and the character always named the
 * LOSER, so the true winner was always the SECOND number printed. "Take a
 * hundreds option that ends on the second number" was the key in 6,632 of 6,632
 * claim draws, and composed with the tie thirds' own rule the bank's floor was
 * 66.7%, not the 41.7% recorded. Stem shape and deciding place are drawn
 * independently now, and the same wrong claim is phrased either way round, so
 * neither the stem shape nor the print order carries the answer. Re-measured
 * over 20,000 draws x two seeds: that route 33.2 / 34.0%, "states a comparison
 * rather than a tie" 33.3 / 33.4%, "names the number the character did not"
 * 33.2 / 33.2%, "start with the hundreds" 24.9 / 24.9%. Two rules are DECLARED
 * rather than closed, both structural and both written up at the generator: the
 * two options at the leftmost place that names a winner (50.0%), and the rules
 * that need the digits read (66.7%).
 *
 * AN EXPLANATION MAY ONLY NAME A WRONG ANSWER THAT IS ON THE ROW (2026-09-16,
 * fifth-pass WOUND 2). Five two-step banks named the stop-after-step-one slip
 * and its value, and that value is one entry in the POOL ranked() picks three
 * slips from - so in 22.4%-41.4% of draws the sentence discussed a number the
 * child could not see. Every bank now hands slipFor() its whole pool and names
 * the first slip that actually shipped. Asserted by rule 5 of the p2 gate.
 *
 * A TEMPLATE DIFF IS NOT A CHECK ON AN OPTION-SET REWRITE (2026-09-16,
 * fifth-pass WOUND 4). v4's and v5's gMulRepeatAdd option sets both mask to
 * "# x # | # x # | # x # | # x #", so "no regression: N of 30 byte-identical"
 * could not see that rewrite at all, in either direction. The same is true of
 * the v6 swap. A masked-template diff bounds WORDING churn, not option content;
 * only a measured battery bounds the latter.
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
/* RANK-BALANCED NAMED DISTRACTORS (refutation second pass 2026-09-15, WOUND 3).
   The named-misconception recipe has a cost nothing used to look at: three slips
   that all land ABOVE the key (or all below it) put the key at the same position
   in the sorted option list on every single draw, and "sort the four numbers and
   take the third" then beats the mathematics. It did, on eight banks, in 20,000
   of 20,000 draws each.

   Every numeric bank now authors a POOL of named slips with candidates on BOTH
   sides of the key. ranked() drops anything that is not a positive whole number
   inside the P2 range or that collides with the key or with a slip already
   taken, works out which target ranks the surviving pool can actually field, and
   picks one of those ranks at random. Pool ORDER is preference order, so the
   slip a bank's explanation names by hand is the first one taken on its side.
   Returns null when the pool cannot field three distinct slips, which is the
   caller's signal to redraw. */
function ranked(correct, pool){
  if (!Number.isInteger(correct) || correct <= 0) return null;
  const lo = [], hi = [], seen = new Set([correct]);
  for (const c of pool){
    if (!Number.isInteger(c) || c <= 0 || c > 1000 || seen.has(c)) continue;
    seen.add(c);
    (c < correct ? lo : hi).push(c);
  }
  const ok = [];
  for (let r = 0; r <= 3; r++) if (lo.length >= r && hi.length >= 3 - r) ok.push(r);
  if (!ok.length) return null;
  const r = pick(ok);
  return lo.slice(0, r).concat(hi.slice(0, 3 - r));
}
/* The slips every column algorithm produces, named once and used by every bank:
   one or two out in the ones column (a finger miscounted), and a whole ten - or,
   on a three-digit key, a whole hundred - out because a carry or a borrow went
   missing or went twice. They are real P2 answers, and they exist on both sides
   of the key on purpose. Listed AFTER a bank's own slips so they only fill the
   side the bank's own misconceptions leave empty. */
function nearSlips(key){
  const s = [key - 1, key + 1, key - 10, key + 10, key - 2, key + 2];
  if (key >= 100) s.push(key - 100, key + 100);
  return s;
}
/* NAME A SLIP THE CHILD CAN ACTUALLY SEE (refutation fifth pass 2026-09-16,
   WOUND 2). Five two-step banks ended their explanation by naming the
   stop-after-step-one slip and its value - "Answering 482 means the giving-away
   step was forgotten". That value is one entry in the POOL ranked() chooses
   three slips from, so in 22.4%-41.4% of draws the explanation talked about a
   number that is not on the screen. It was 0.0% on v1 and v2 and appeared at v3,
   when the named triple became a pool to flatten the key's value rank (the
   second pass's WOUND 3) - the trade paid in a currency nobody was counting. It
   is the first pass's own WOUND 4 class: an explanation asserting a property of
   the option list that the draw does not deliver.

   Every bank now hands slipFor() its WHOLE pool as [value, reason] pairs, in
   preference order, and the sentence names the first pair whose value actually
   shipped. The bank's own misconception is still first in the list, so nothing
   changes on the draws where it is on the row; when the rank pool left it off,
   the explanation names a distractor that IS there instead of one that is not.
   Asserted by rule 5 of the p2 gate in tools/gen-sanity.mjs: every number an
   explanation names after the word "answering" must be one of the four options.

   The generic column slips get generic reasons, because that is what they are -
   a finger miscounted, or a carry that went missing or went twice. */
function nearWhy(key){
  const w = [[key - 1, 'one was dropped in the ones column'],
             [key + 1, 'one was counted twice in the ones column'],
             [key - 10, 'a whole ten went missing in the column'],
             [key + 10, 'a whole ten was counted twice'],
             [key - 2, 'two were dropped in the ones column'],
             [key + 2, 'two were counted twice in the ones column']];
  if (key >= 100) w.push([key - 100, 'a whole hundred went missing in the column'],
                         [key + 100, 'a whole hundred was counted twice']);
  return w;
}
/* pairs are in preference order; returns the first one that is on the row. */
function slipFor(cands, pairs){
  for (const pr of pairs) if (cands.indexOf(pr[0]) !== -1) return pr;
  return null;
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
  let target = 100, a = 1, U = 10, r = 1, cands = null, g = 0;
  do {
    target = pick([10, 20, 100, 1000]);
    U = target === 1000 ? 100 : 10;
    a = target === 1000 ? 10 * ri(10, 99) : ri(1, target - 1);
    r = a % U;
    const k = target - a;
    /* named slips, preference order: the part that was GIVEN; took the tens away
       and added the ones back; added instead of taking away; took only the tens
       away; took the ones away twice; one whole ten (or hundred) too many, or
       too few, taken. Then the generic column slips fill whichever side is thin. */
    cands = (r !== 0 && (target <= 20 || a > U))
      ? ranked(k, [a, target - a + 2 * r, target + a, k + r, k - r, k - U, k + U]
                    .concat(nearSlips(k)))
      : null;
    g++;
  } while (g < 400 && !(cands && optsOk(target - a, cands)));
  if (!cands) { target = 100; a = 35; U = 10; r = 5; cands = [35, 75, 70]; }
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
  let T = 100, a = 35, r = 5, claim = 75, cands = null, g = 0;
  do {
    T = pick([20, 100]);
    const U = 10;
    a = ri(1, T - 1);
    r = a % U;
    claim = T - a + 2 * r;
    const k0 = T - a;
    /* named slips: the claim itself; took only the tens away; the printed check
       total; then the generic column slips, which is what puts candidates BELOW
       the key - every one of the three original slips sat above it, so the key
       was the smallest number on screen in 20,000 of 20,000 draws. */
    cands = (r !== 0 && (T <= 20 || a > 10) && claim !== k0 && claim !== a)
      ? ranked(k0, [claim, T - (a - r), a + claim].concat(nearSlips(k0)))
      : null;
    g++;
  } while (g < 400 && !(cands && optsOk(T - a, cands)));
  if (!cands) { T = 100; a = 35; r = 5; claim = 75; cands = [75, 70, 110]; }
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
  let T = 100, A = 30, B = 20, cands = null, g = 0;
  do {
    T = pick([100, 1000]);
    const step = T === 1000 ? 10 : 1;
    A = step * ri(Math.floor(10 / step) + 1, Math.floor((T * 0.5) / step));
    B = step * ri(Math.floor(10 / step) + 1, Math.floor((T * 0.4) / step));
    const k0 = T - A - B;
    /* named slips: stopped after step 1; forgot the second lot; forgot the first
       lot. All three sit above the key, so the column slips supply the ones below. */
    cands = (k0 > 12) ? ranked(k0, [A + B, T - A, T - B].concat(nearSlips(k0))) : null;
    g++;
  } while (g < 400 && !(cands && optsOk(T - A - B, cands)));
  if (!cands) { T = 100; A = 30; B = 20; cands = [50, 70, 80]; }
  const c = pick(BOND_CTX), k = kid();
  const key = T - A - B;
  const sl = slipFor(cands, [[A + B, 'that is what ' + k[0] + ' HAS, not what is still missing'],
                             [T - A, 'that forgets the ' + B + ' that came later'],
                             [T - B, 'that forgets the ' + A + ' already there']].concat(nearWhy(key)));
  return mcNum(k[0] + ' needs ' + T + ' ' + c[0] + ' for the ' + c[1] + '. ' + k[1] + ' already has ' + A +
    ' and gets ' + B + ' more. <b>How many more ' + c[0] + ' are still needed?</b>', '',
    key, cands, '',
    'Step 1 - how many are there now? ' + A + ' + ' + B + ' = ' + (A + B) + '. Step 2 - how many more ' +
    'make ' + T + '? ' + T + ' − ' + (A + B) + ' = ' + key +
    (sl ? '. Answering ' + sl[0] + ' is the slip to watch: ' + sl[1] + '.' : '.'));
}

/* FORMAT 1.6 - error spotting, diagnose the mistake (pool 3, 2 steps).
   Word answers, all four written to the same pattern so the key is never the
   odd one out. The child must add first and only then judge. */
function gBondDiagnose(){
  /* REFUTATION FIX (2026-09-15, WOUND 2): this bank used to fall through to an
     arithmetic padding loop (S ± 1, S ± 2, …) whenever the named alternates did
     not survive the 1000 ceiling, which is exactly the unauthored distractor the
     numeric banks are forbidden from shipping.

     REFUTATION FIX (second pass 2026-09-15, WOUND 4): the rebuilt bank still gave
     two of its four options away for nothing. "They make T, so nothing is wrong."
     was on screen in 20,000 of 20,000 draws and was the key in 0 of them, and the
     key's printed sum was never the smallest of the three numeric options - so a
     child who never added anything was down to two options, 50% for free. Both
     legs are gone:
       - the odd "nothing is wrong" option is deleted. All four options are now
         the same sentence, and all four land on the SAME side of the whole as
         the truth does, so the direction word carries no information either and
         a draw can never make the key the only option reading "too many";
       - the three wrong sums go through ranked(), so the key's position in the
         sorted option list is uniform instead of fixed.
     What is left is four honest readings of one addition, and the child has to
     do the addition. The named slips are a carry dropped or added, two tens out,
     and one or two out in the ones column. */
  const word = dd => dd > 0 ? 'too many' : 'too few';
  const lineFor = (sum, whole) =>
    'They make ' + sum + ', which is ' + Math.abs(sum - whole) + ' ' + word(sum - whole) + '.';
  let T = 100, A = 30, B = 100, off = 30, wrongs = [], g = 0;
  do {
    T = pick([100, 1000]);
    const step = T === 1000 ? 50 : 5;
    /* the gap is big enough that a slip of one or two ones, or of a whole ten,
       still lands on the truth's side of the whole (see `sameSide`). */
    off = T === 1000 ? -pick([150, 200, 250]) : pick([30, 40, 50]);
    /* SCOPE (own 2,000-draw scan, 2026-09-15): at T = 1000 the pair may only
       fall SHORT. A pair that overshoots would print a sum above 1000 in the
       option list, which is outside the P2 number range. At T = 100 both
       directions are drawn. */
    if (T !== 1000 && Math.random() < 0.5) off = -off;
    const S0 = T + off;
    A = step * ri(1, Math.floor(S0 / step) - 1);
    B = S0 - A;
    wrongs = [];
    if (A > 0 && B > 0 && A + B === S0 && S0 <= 1000 && T - A > 0){
      const sameSide = v => Number.isInteger(v) && v > 0 && v <= 1000 &&
                            v !== T && (v > T) === (S0 > T);
      const sel = ranked(S0, [S0 - 10, S0 + 10, S0 - 20, S0 + 20, S0 - 1, S0 + 1,
                              S0 - 2, S0 + 2, S0 - 100, S0 + 100].filter(sameSide));
      if (sel) wrongs = sel.map(v => lineFor(v, T));
    }
    g++;
  } while (g < 400 && wrongs.length !== 3);
  if (wrongs.length !== 3){
    T = 100; A = 60; B = 70; off = 30;
    wrongs = [lineFor(120, T), lineFor(140, T), lineFor(131, T)];
  }
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
  let a = 5, b = 3, add = true, cands = null, g = 0;
  do {
    add = Math.random() < 0.5;
    /* the addition draw is bounded so the "wrote the carried ten twice"
       distractor (a + b + 10) still lands inside the topic's own number range. */
    if (add){ a = ri(2, max - 2); b = ri(1, Math.max(1, max - a - (max > 20 ? 10 : 0))); }
    else { a = ri(3, max); b = ri(1, a - 1); }
    const key = add ? a + b : a - b;
    /* named slips. ADD: the carry written twice / dropped; subtracted instead;
       one of the two numbers answered on its own; one of them added twice.
       SUBTRACT: the borrow dropped / taken twice; added instead; the smaller
       digit taken from the larger in every column; nothing taken away at all;
       the number taken away answered instead; it taken away twice.
       Both lists straddle the key, and nearSlips fills any side left thin.
       No option may print above 1000 (the top of the P2 number range) - ranked()
       drops those, which is also what kept 1000 − 477 from offering 1477. */
    cands = (key >= 3) ? ranked(key, (add
      ? [key + 10, key - 10, Math.abs(a - b), a, b, key + a, key + b]
      : [key + 10, key - 10, a + b, smallerFromLarger(a, b), a, b, key - b]
      ).concat(nearSlips(key))) : null;
    const regroups = add ? (a % 10) + (b % 10) >= 10 : (b % 10) > (a % 10);
    g++;
    if (mustRegroup && !regroups) continue;
    if (cands && optsOk(key, cands)) break;
  } while (g < 400);
  if (!cands) { add = true; a = 7; b = 8; cands = [25, 5, 1]; }
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
  let a = 38, b = 9, round = 10, d = 1, cands = null, g = 0;
  do {
    b = pick([8, 9, 18, 19, 28, 29]);
    round = b + (10 - (b % 10));
    d = round - b;
    a = ri(b + 2, 99 - round);
    /* named slips: forgot to give the d back; gave it back twice; subtracted
       instead of adding; then the column slips on the thin side. */
    cands = ranked(a + b, [a + round, a + b - 2 * d, a - b, a + round + d]
                            .concat(nearSlips(a + b)));
    g++;
  } while (g < 400 && !(a > b && a + round < 100 && cands && optsOk(a + b, cands)));
  if (!cands) { a = 38; b = 9; round = 10; d = 1; cands = [48, 45, 29]; }
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
  let P = 137, W = 265, cands = null, g = 0;
  do {
    /* P + W is the "added instead of taking away" distractor and it is the one
       that matters on an inverse item, so the draw is bounded to keep it inside
       the P2 number range (own scan, 2026-09-15). */
    P = ri(101, 300); W = ri(P + 20, 1000 - P);
    /* named slips: added the two given numbers; took the smaller digit from the
       larger in every column; dropped the borrow. All three land above the key,
       so the column slips supply the ones below it. */
    cands = ranked(W - P, [P + W, smallerFromLarger(W, P), W - P + 10]
                            .concat(nearSlips(W - P)));
    g++;
  } while (g < 400 && !((P % 10) > (W % 10) && W - P > 0 && P + W <= 1000 &&
           cands && optsOk(W - P, cands)));
  if (!cands) { P = 137; W = 265; cands = [402, 138, 127]; }
  return mcNum('A number is added to ' + P + '. The answer is ' + W + '. <b>What is the number?</b>', '',
    W - P, cands, '',
    'Adding put the number IN, so taking away gets it back out: ' + W + ' − ' + P + ' = ' + (W - P) +
    '. Check it the way a bond checks: ' + P + ' + ' + (W - P) + ' = ' + W + '. Adding the two given ' +
    'numbers instead gives ' + (P + W) + ', which is bigger than the answer we were told - a quick ' +
    'sense check a seven-year-old can make on their own.');
}

/* FORMAT 2.7 - error spotting, correct the mistake (pool 3, ONE step - a
   DECLARED POOL-3 ANCHOR, see the header).
   The named misconception is the commonest column-subtraction bug in P2: taking
   the SMALLER digit from the LARGER in each column instead of renaming.
   The oracle re-derives the printed claim from that rule and fails if the claim
   is not actually what that mistake produces.

   REFUTATION FIX (second pass 2026-09-15, KILL B): the v2 rewrite asked "What
   went wrong, and what is a − b?" with every option carrying both halves, and
   counted the slot as two-step. It was worse than the one-step item it replaced:
   the stem prints ONE fixed misconception, so the true diagnosis was the single
   English clause "The ones were subtracted the wrong way round." in 20,000 of
   20,000 draws, and a child who read no numbers at all and picked the remembered
   phrase was right every time. A worksheet is seen once; this generator is
   served to the same child every few minutes, and what that trains is phrase
   recognition. The question is back to the bare subtraction it asked at 4f75943.
   The slot is counted as ONE step in the lane note and in this file's header. */
function gAddSubError(){
  let a = 52, b = 27, claim = 35, cands = null, g = 0;
  do {
    a = ri(31, 99); b = ri(12, a - 11);
    claim = smallerFromLarger(a, b);
    /* named slips: the printed claim itself (the smaller-from-larger bug); a ten
       renamed when none was needed; the ones column skipped altogether. The last
       two straddle the key, and nearSlips fills in below it. */
    cands = ranked(a - b, [claim, a - b - 10, (Math.floor(a / 10) - Math.floor(b / 10)) * 10]
                            .concat(nearSlips(a - b)));
    g++;
  } while (g < 400 && !((b % 10) > (a % 10) && Math.floor(a / 10) > Math.floor(b / 10) &&
           claim !== a - b && cands && optsOk(a - b, cands)));
  if (!cands) { a = 52; b = 27; claim = 35; cands = [35, 15, 30]; }
  const k = kid();
  return mcNum(k[0] + ' works out ' + a + ' − ' + b + ' in columns and gets ' + claim +
    '. <b>What is ' + a + ' − ' + b + '?</b>', '',
    a - b, cands, '',
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
  let A = 245, B = 178, C = 134, cands = null, g = 0;
  do {
    A = ri(110, 420); B = ri(60, 330); C = ri(40, Math.min(A - 10, 240));
    /* named slips: stopped after step 1; added the giving-away instead of taking
       it; forgot the buying. The first two sit above the key, the third below. */
    cands = ranked(A + B - C, [A + B, A + B + C, A - C].concat(nearSlips(A + B - C)));
    g++;
  } while (g < 400 && !(A + B + C <= 1000 && A + B - C > 0 && A - C > 0 &&
           cands && optsOk(A + B - C, cands)));
  if (!cands) { A = 245; B = 178; C = 134; cands = [423, 557, 111]; }
  const c = pick(HAVE_CTX), k = kid();
  const key = A + B - C;
  const sl = slipFor(cands, [[A + B, 'the giving-away step was forgotten'],
                             [A + B + C, 'the giving-away was added on instead of taken off'],
                             [A - C, 'the buying was forgotten']].concat(nearWhy(key)));
  return mcNum(k[0] + ' had ' + A + ' ' + c[0] + ' and bought ' + B + ' more. ' + k[1] + ' then gave away ' +
    C + ' ' + c[0] + ' at ' + c[1] + '. <b>How many ' + c[0] + ' are left?</b>', '',
    key, cands, '',
    'Step 1 - how many after buying? ' + A + ' + ' + B + ' = ' + (A + B) + '. Step 2 - take away what ' +
    'was given: ' + (A + B) + ' − ' + C + ' = ' + key +
    (sl ? '. Answering ' + sl[0] + ' means ' + sl[1] + '.' : '.'));
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
  let a = 2, b = 2, cands = null, g = 0;
  do {
    a = pick(tables); b = ri(2, 10);
    /* named slips: stopped one count late / one count early; added the two
       numbers; one group of the wrong size; two counts late / early. */
    cands = ranked(a * b, [a * b + a, a * b - a, a + b, a * b + b, a * b - b,
                           a * (b + 2), a * (b - 2)].concat(nearSlips(a * b)));
    g++;
  } while (g < 400 && !(cands && optsOk(a * b, cands)));
  if (!cands) { a = 3; b = 4; cands = [15, 9, 7]; }
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
  let a = 4, b = 5, cands = null, g = 0;
  do {
    a = pick([2, 3, 4, 5, 10]); b = ri(2, 10);
    /* named slips: counted the groups instead of what is in them; one group too
       few / too many; a group of the wrong size; two groups out. */
    cands = ranked(a * b, [a + b, a * b - a, a * b + b, a * b + a, a * b - b,
                           a * (b + 2), a * (b - 2)].concat(nearSlips(a * b)));
    g++;
  } while (g < 400 && !(cands && optsOk(a * b, cands)));
  if (!cands) { a = 4; b = 5; cands = [9, 16, 25]; }
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
  /* named slips: counted on by one instead of by a; skipped a count; said the
     last number again; one short of the right count. */
  let cands = ranked(key, [last + 1, last + 2 * a, key - 1, key + 1, last,
                           key + 2 * a, last - 1].concat(nearSlips(key)));
  if (!cands) cands = [last + 1, last + 2 * a, key - 1];
  const k = kid();
  return mcNum(k[0] + ' counts in ' + a + 's: ' + seq.join(', ') + ', … <b>What number comes next?</b>', '',
    key, cands, '',
    'Each number is ' + a + ' more than the one before it, so the next one is ' + last + ' + ' + a +
    ' = ' + key + '. Counting in ' + a + 's out loud - ' + seq.join(', ') + ', ' + key +
    ' - is the ' + a + ' times table being built, one step at a time.');
}

/* FORMAT 3.5 - concept check: repeated addition IS multiplication
   (pool 2, 2 steps). Exactly one option evaluates to the total; the oracle
   evaluates all four and fails on a second correct reading.

   REFUTATION FIX (third pass 2026-09-15, KILL 2). The options were n × v (key),
   v × v, n × n and n + v, and the draw loop guarantees n !== v - so the key was
   the only option multiplying two DIFFERENT numbers, in 20,000 of 20,000 draws.
   A child never had to count the addends: pick the one that is a multiplication
   with two unlike numbers and be right forever, on the topic's only
   multiplication concept check. The coarse format-tell rule could not see it,
   because optForm classes "3 + 10" and "3 × 10" alike as an expression.

   Every option is now a multiplication - the odd "n + v" that was not one at all
   is gone, so the item stopped being a three-option question at the same time -
   and TWO of the four multiply unlike numbers: the key, and the MISCOUNT, one
   group too many or one too few, which is the slip this format exists to catch.
   The other two are the two same-number products a child reaches for when they
   multiply the wrong pair. So the form no longer singles the key out and the
   addends have to be counted. The miscount is drawn either side of n on purpose:
   fixing it at n+1 would have left the key as the SMALLER of the two unlike
   products on every draw, which is a win by sorting - the same class the rank
   gate exists to stop, one bank over. Asserted by the p2 option-feature gate in
   tools/gen-sanity.mjs, which treats "+ vs ×" and "same-number vs
   different-number product" as features and fails any p2 bank whose key is the
   only option carrying one.

   REFUTATION FIX (fourth pass 2026-09-16, WOUND 1). That option set was n × v,
   w × v, n × n and v × v - built from THREE numerals, and w appeared in exactly
   ONE of the four options. So "find the numeral that is used once, bin that
   option, then take the one of the three left that multiplies two different
   numbers" was the key in 20,000 of 20,000 draws on two seeds, with no addend
   counted: the 100% floor did not move, only the rule that reaches it. The
   option-feature gate cannot see it - numeral frequency across the option list
   is not one of the three features it reads.

   v × v is now w × n: the miscount multiplied by the wrong pair, which is a real
   slip and uses the numerals the other options already use. Every numeral now
   appears in at least two options, so no option can be singled out by an odd
   token, and THREE of the four multiply unlike numbers, so the one-rule "take
   the unlike product" route is 1 in 3. Asserted by the p2 TOKEN RULER in
   tools/gen-sanity.mjs (the v4 option set is its negative control).

   REFUTATION FIX (fifth pass 2026-09-16, WOUND 1). Closing the odd token opened
   a pointer. n × v, w × v, n × n and w × n left exactly ONE square in the list,
   and the square's base was n - the one numeral the stem does not print. "Find
   the option that is a number times itself; that number times the number being
   added is the answer" was the key in 20,000 of 20,000 draws on two seeds, and
   so was "the numeral in the most options, paired with the stem's numeral". The
   token ruler scores the bank 0.0% and is right to: no numeral is unique. The
   route is one level below a token count - a distractor whose own FORM points at
   the key.

   n × n is now v × v, keeping v5's w × n. The square is then based on v, which
   the stem already prints, so it points at nothing: the pointer route falls to
   50% ("the two options that use the number being added"), and choosing between
   those two is counting the addends, which is the whole idea of the item. Every
   numeral still appears in at least two options (v in three, n in two, w in
   two), so the odd-token class stays closed. */
function gMulRepeatAdd(){
  let n = 4, v = 6, w = 5, g = 0;
  do {
    v = pick([2, 3, 4, 5, 10]); n = ri(2, 5); w = n + pick([1, -1]);
    g++;
  } while (g < 400 && !(n !== v && w >= 1 && w !== v &&
           uniq4([n + ' × ' + v, w + ' × ' + v, v + ' × ' + v, w + ' × ' + n]) &&
           uniq4([n * v, w * v, v * v, w * n])));
  const addends = Array.from({ length: n }, () => v).join(' + ');
  const many = w > n;
  return mcText('Which multiplication has the same answer as <b>' + addends + '</b>?', '',
    n + ' × ' + v,
    [w + ' × ' + v, v + ' × ' + v, w + ' × ' + n],
    'Count the ' + v + 's: there are ' + n + ' of them, so this is ' + n + ' groups of ' + v +
    ', which is ' + n + ' × ' + v + ' = ' + (n * v) + '. Counting one group too ' +
    (many ? 'many' : 'few') + ' gives ' + w + ' × ' + v + ', which is ' + v + ' too ' +
    (many ? 'much' : 'little') + ', and multiplying the wrong pair gives ' + v + ' × ' + v +
    ' or ' + w + ' × ' + n + '. Multiplication is a short way of writing the same number added ' +
    'over and over - that is the whole idea, and it is why the times tables are worth knowing ' +
    'by heart.');
}

/* FORMAT 3.6 - error spotting, correct the mistake (pool 3, ONE step - a
   DECLARED POOL-3 ANCHOR, see the header).
   The named misconception: skip counting for the answer but saying one number
   too many. The stem PRINTS the count, and the oracle checks the printed count
   really is a, 2a, ... (b+1)a and really does end on the claim - so the item can
   never contradict itself the way the pilot's gLError once did.

   REFUTATION FIX (second pass 2026-09-15, KILL B): the v2 rewrite asked "What
   went wrong, and what is a × b?" with the slip and the result in every option.
   Because the stem prints one fixed misconception, the true diagnosis was the
   single clause "One count too many was said." in 20,000 of 20,000 draws - a
   child who read no numbers and picked the remembered phrase scored 100%. The
   question is back to the bare table fact it asked at 4f75943, and the slot is
   counted as ONE step. The premise checks - the printed count really is the a
   times table, really has b+1 entries, and really ends on the claim - are what
   make this the strongest item in the file, and they are untouched. */
function gMulError(){
  let a = 4, b = 3, cands = null, g = 0;
  do {
    a = pick([2, 3, 4, 5, 10]); b = ri(3, 9);
    /* named slips: the claim itself (one count too many); one count too few; the
       two numbers added rather than counted; two counts out either way. */
    cands = ranked(a * b, [a * (b + 1), a * (b - 1), a + b, a * (b + 2), a * (b - 2)]
                            .concat(nearSlips(a * b)));
    g++;
  } while (g < 400 && !(a * (b + 1) <= 100 && cands && optsOk(a * b, cands)));
  if (!cands) { a = 4; b = 3; cands = [16, 8, 7]; }
  const seq = Array.from({ length: b + 1 }, (_, i) => a * (i + 1));
  const claim = seq[seq.length - 1];
  const k = kid();
  return mcNum(k[0] + ' works out ' + a + ' × ' + b + ' by counting in ' + a + 's: ' + seq.join(', ') +
    '. ' + k[1] + ' says ' + a + ' × ' + b + ' = ' + claim +
    '. <b>What is ' + a + ' × ' + b + '?</b>', '',
    a * b, cands, '',
    'Count the numbers ' + k[0] + ' said, not the size of them: there are ' + (b + 1) + ' of them, but ' +
    a + ' × ' + b + ' needs only ' + b + ' of them. Stop at the ' + ord(b) + ': ' + a + ' × ' + b + ' = ' +
    (a * b) + '. Touching a finger for each count is the fix - one finger per group.');
}

/* FORMAT 3.7 - two-step word problem (pool 3, 2 steps). */
const PACK_CTX = [['packets', 'packet', 'curry puffs'], ['boxes', 'box', 'kaya toast slices'],
                  ['trays', 'tray', 'buns'], ['bags', 'bag', 'kueh']];
function gMulTwoStep(){
  let a = 5, b = 4, c = 3, cands = null, g = 0;
  do {
    /* never give away more than half: a P2 word problem that leaves 2 of 10
       reads as a trick rather than a two-step (own read, 2026-09-15). */
    a = ri(2, 9); b = pick([2, 3, 4, 5, 10]); c = ri(2, Math.max(2, Math.floor(a * b / 2)));
    /* named slips: stopped after step 1; added the giving-away instead of taking
       it; added the two numbers; gave the lot away twice. */
    cands = (a * b - c >= 6)
      ? ranked(a * b - c, [a * b, a * b + c, a + b, a * b - 2 * c]
                            .concat(nearSlips(a * b - c)))
      : null;
    g++;
  } while (g < 400 && !(cands && optsOk(a * b - c, cands)));
  if (!cands) { a = 5; b = 4; c = 3; cands = [20, 23, 9]; }
  const p = pick(PACK_CTX), k = kid();
  const key = a * b - c;
  const sl = slipFor(cands, [[a * b, 'only the first step was done'],
                             [a * b + c, 'the giving-away was added on instead of taken off'],
                             [a + b, 'the two numbers were added instead of multiplied'],
                             [a * b - 2 * c, 'the ' + c + ' was given away twice']].concat(nearWhy(key)));
  return mcNum(k[0] + ' buys ' + a + ' ' + p[0] + ' of ' + p[2] + '. Each ' + p[1] + ' holds ' + b + ' ' +
    p[2] + '. ' + k[1] + ' gives away ' + c + ' ' + p[2] + '. <b>How many ' + p[2] + ' are left?</b>', '',
    key, cands, '',
    'Step 1 - how many altogether? ' + a + ' ' + p[0] + ' of ' + b + ' is ' + a + ' × ' + b + ' = ' +
    (a * b) + '. Step 2 - give ' + c + ' away: ' + (a * b) + ' − ' + c + ' = ' + key +
    (sl ? '. Answering ' + sl[0] + ' means ' + sl[1] + '.' : '.'));
}

/* FORMAT 3.8 - direct division fact, the DECLARED ANCHOR of the div skill
   (pool 1, 1 step). */
function gDivP2fact(){
  /* b starts at 3, not 2: with a quotient of 2 there is only one whole number
     below the key, so the key could never be anything but the smallest or the
     second smallest option and the rank gate could not be met (2026-09-15). */
  let a = 5, b = 4, cands = null, g = 0;
  do {
    a = pick([2, 3, 4, 5, 10]); b = ri(3, 10);
    /* named slips: one count too many / too few; answered the number shared
       BETWEEN instead of how many each got; answered the whole amount; two
       counts out; answered one. */
    cands = ranked(b, [b + 1, b - 1, a, a * b, b + 2, b - 2, 1].concat(nearSlips(b)));
    g++;
  } while (g < 400 && !(cands && optsOk(b, cands)));
  if (!cands) { a = 5; b = 4; cands = [5, 3, 20]; }
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
  let gN = 5, each = 4, want = 2, cands = null, g = 0;
  do {
    gN = pick([3, 4, 5, 10]); each = ri(2, 10); want = ri(2, gN - 1);
    /* named slips: stopped after the sharing and answered ONE share; took the
       number of sharers off the total; multiplied by the wrong number; one share
       too many or too few; the whole amount. */
    cands = (gN > 2 && want < gN && inTables(want, each))
      ? ranked(want * each, [each, gN * each - want, want * gN, (want + 1) * each,
                             (want - 1) * each, gN * each].concat(nearSlips(want * each)))
      : null;
    g++;
  } while (g < 400 && !(cands && optsOk(want * each, cands)));
  if (!cands) { gN = 5; each = 4; want = 2; cands = [4, 18, 10]; }
  const c = pick(SHARE_CTX), k = kid();
  const total = gN * each, key = want * each;
  const sl = slipFor(cands, [[each, 'that is ONE share, and the question asked for ' + want],
                             [gN * each - want, 'the ' + want + ' was taken off the total instead of shared out'],
                             [want * gN, 'the ' + want + ' was multiplied by the number of ' + c[1] +
                                         ' instead of by one share'],
                             [(want + 1) * each, 'one share too many was counted'],
                             [(want - 1) * each, 'one share too few was counted'],
                             [gN * each, 'that is the whole amount, not ' + want + ' shares']]
                            .concat(nearWhy(key)));
  return mcNum(k[0] + ' shares ' + total + ' ' + c[0] + ' equally among ' + gN + ' ' + c[1] +
    '. <b>How many ' + c[0] + ' do ' + want + ' ' + c[1] + ' get altogether?</b>', '',
    key, cands, '',
    'Step 1 - what does ONE get? ' + total + ' ÷ ' + gN + ' = ' + each + '. Step 2 - what do ' + want +
    ' get? ' + want + ' × ' + each + ' = ' + key +
    (sl ? '. Answering ' + sl[0] + ' is the slip to watch: ' + sl[1] + '.' : '.'));
}

/* FORMAT 3.11 - grouping, two steps (pool 3, 2 steps). Division as "how many
   groups fit", which is the other half of the P2 division idea. */
const FILL_CTX = [['buns', 'trays', 'tray', 'school canteen'], ['eggs', 'boxes', 'box', 'NTUC storeroom'],
                  ['kueh', 'bags', 'bag', 'hawker stall'], ['books', 'shelves', 'shelf', 'school library']];
function gDivGroupWord(){
  /* filled stops at groups - 4, not groups - 2: a key of 2 or 3 leaves at most
     two whole numbers below it, and the key could then never be the LARGEST
     option at all (rank gate, 2026-09-15).

     REFUTATION FIX (third pass 2026-09-15, WOUND 1): at groups - 3 this bank
     shipped [31.7 / 31.7 / 31.2 / 5.4] and passed the 45% ceiling, because the
     ceiling never looked at a rank that is nearly EMPTY - and an almost-empty
     rank is a free elimination: the key was not the largest of the four in 94.6%
     of draws, and "pick the option closest to the count already filled" scored
     59.8%. A key of 4 or more plus one more named slip BELOW it (the filled
     containers taken off twice) lets ranked() field the top rank too, and the
     gate now has a floor as well as a ceiling. */
  let per = 5, groups = 6, filled = 3, cands = null, g = 0;
  do {
    per = pick([2, 3, 4, 5, 10]); groups = ri(6, 10); filled = ri(2, groups - 4);
    /* named slips: forgot the ones already filled; added them instead of taking
       them away; counted what is INSIDE the containers, not the containers;
       answered the ones already filled; took the filled ones off TWICE; one or
       two containers out either way. */
    cands = (groups - filled >= 4)
      ? ranked(groups - filled, [groups, groups + filled, per * (groups - filled), filled,
                                 groups - 2 * filled, groups - filled - 2,
                                 groups + 1].concat(nearSlips(groups - filled)))
      : null;
    g++;
  } while (g < 400 && !(filled >= 2 && cands && optsOk(groups - filled, cands)));
  if (!cands) { per = 5; groups = 6; filled = 2; cands = [6, 8, 20]; }
  const c = pick(FILL_CTX);
  const total = per * groups, key = groups - filled;
  const pool = [[groups, 'the ' + c[1] + ' already filled were forgotten'],
                [groups + filled, 'the filled ' + c[1] + ' were added on instead of taken off'],
                [per * (groups - filled), c[0] + ' were counted when the question asked for ' + c[1]],
                [filled, 'the ' + c[1] + ' already filled were counted instead of the ones still needed'],
                [groups - 2 * filled, 'the filled ' + c[1] + ' were taken off twice'],
                [groups - filled - 2, 'two ' + c[1] + ' too few were counted'],
                [groups + 1, 'one ' + c[1] + ' too many was counted']].concat(nearWhy(key));
  const sl = slipFor(cands, pool);
  const sl2 = slipFor(cands.filter(x => !sl || x !== sl[0]), pool);
  return mcNum('The ' + c[3] + ' has ' + total + ' ' + c[0] + '. Each ' + c[2] + ' holds ' + per + ' ' +
    c[0] + '. ' + filled + ' ' + c[1] + ' have already been filled. <b>How many more ' + c[1] +
    ' are needed?</b>', '',
    key, cands, '',
    'Step 1 - how many ' + c[1] + ' altogether? ' + total + ' ÷ ' + per + ' = ' + groups +
    '. Step 2 - take away the ' + filled + ' already done: ' + groups + ' − ' + filled + ' = ' + key +
    (sl ? '. Answering ' + sl[0] + ' means ' + sl[1] : '') +
    (sl2 ? '; answering ' + sl2[0] + ' means ' + sl2[1] + '.' : (sl ? '.' : '.')));
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
       pattern the coarse format-tell rule cannot see.

     REFUTATION FIX (second pass 2026-09-15, KILL A). The v2 fix drew the three
     wrong quotients from 2-10 and forced them to STRADDLE the key, and the
     oracle failed any draw that did not. That straddle IS a value tell, and a
     required one: the key's quotient was never the smallest and never the
     largest of the four, in 20,000 of 20,000 draws. Sort the four options by
     their printed quotient, discard the largest and the smallest, and take the
     one of the two left that does NOT read "The answer is correct." - that found
     the key in 15,035 of 20,000 draws (75.2%) with no division done, against 25%
     chance. Worse, correcting it meant rewriting the oracle branch that had been
     added to protect it: a gate that encodes the defect.

     The straddle is gone from the draw AND from the oracle. The three wrong
     quotients are now drawn so that the key's RANK among the four printed
     quotients is uniform - each of the four positions about a quarter of the
     time - which is what the rank gate in tools/gen-sanity.mjs asserts, on this
     bank and on every numeric bank in the file. The claim is still always one of
     the four printed quotients, so exactly one option reads "correct" on every
     draw; it is the key in about one draw in four, and a distractor otherwise. */
  const rightKey = Math.random() < 0.25;
  let d = 4, quot = 6, claim = 6, others = [], g = 0;
  do {
    d = pick([2, 3, 4, 5, 10]);
    quot = ri(2, 10);
    const r = ri(0, 3);               /* the key's target rank among the four quotients */
    const lo = [], hi = [];
    for (let n = 2; n <= 10; n++) { if (n < quot) lo.push(n); else if (n > quot) hi.push(n); }
    others = (lo.length >= r && hi.length >= 3 - r)
      ? shuffle(lo).slice(0, r).concat(shuffle(hi).slice(0, 3 - r))
      : [];
    /* the claim has to be ON SCREEN or no option could read "correct" at all:
       it is the key's own quotient in the rightKey draws and one of the three
       wrong quotients otherwise. */
    if (others.length === 3) claim = rightKey ? quot : pick(others);
    g++;
  } while (g < 400 && others.length !== 3);
  if (others.length !== 3){ d = 5; quot = 6; claim = rightKey ? 6 : 8; others = [4, 7, 8]; }
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
  /* t starts at 2: with one ten the only named slips below the key are 1 and the
     digit itself, which pins the key's rank (rank gate, 2026-09-15). */
  let h = 4, t = 7, o = 6, cands = null, g = 0;
  do {
    h = ri(1, 9); t = ri(2, 9); o = ri(1, 9);
    /* named slips: wrote the DIGIT instead of what it is worth; read the tens as
       hundreds; swept the ones up with the tens; one ten too few / too many;
       took the ones off the tens; wrote the hundreds and the tens together. */
    cands = ranked(t * 10, [t, t * 100, t * 10 + o, (t - 1) * 10, (t + 1) * 10,
                            t * 10 - o, h * 100 + t * 10]);
    g++;
  } while (g < 400 && !(t !== h && t !== o && cands && optsOk(t * 10, cands)));
  if (!cands) { h = 4; t = 7; o = 6; cands = [7, 700, 76]; }
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

/* FORMAT 4.4 - error spotting, diagnose (pool 3, 2 steps). The child has to find
   the place that DECIDES and then read it the right way round; neither half is
   enough on its own.

   REFUTATION FIX (third pass 2026-09-15, KILL 1). The option set used to be the
   key plus three readings that all ended on the number the CHARACTER named, so
   exactly one option on the screen disagreed with her and it was always the key:
   "the question says something went wrong, so it must be the other number"
   scored 100% in 20,000 of 20,000 draws, on the most-served generator in the
   topic (10.9% of every session), with no hundreds compared at all.

   REFUTATION FIX (fourth pass 2026-09-16, WOUND 2 - the DECIDING-PLACE
   REDESIGN). v4 fixed the hundreds as the deciding place on every draw, so
   "start with the hundreds" AND "name the other number" together were still the
   key in 100% of draws with no digit compared. The deciding place now varies,
   one third each.

   REFUTATION FIX (fifth pass 2026-09-16, KILL 1 - THE CLAIM STEM VARIES TOO).
   The redesign reached two thirds of its own generator. The "A is greater than
   B" CLAIM stem was drawn ONLY when the hundreds decide, and because the
   character always names the LOSER as the greater, the true winner was always
   the SECOND number printed. Two free text observations - "take a hundreds
   option, and take the one that ends on the second number" - were therefore the
   key in 6,632 of 6,632 claim draws with no digit compared, and composing that
   with the tie thirds' own 50% rule gave the bank a 66.7% floor where the v5
   note recorded 41.7%, on 3.44 items of every 30-item session. Two changes, both
   inside machinery this generator already had:

     THE CLAIM STEM CARRIES EVERY DECIDING PLACE. The stem shape and the deciding
       place are now drawn independently, so a claim stem appears on the hundreds
       third, the tens third and the ones third alike. "Start with the hundreds"
       is wrong two times in three on a claim draw as well.
     PRINT ORDER IS INDEPENDENT OF THE TRUTH. Which of the two numbers prints
       first is a coin toss, so "ends on the second number" is a coin toss too.
       v5 also phrased the same wrong claim either way round ("665 is greater
       than 933" or "933 is smaller than 665"); the SIXTH pass showed that is not
       enough, because a false claim about an order names the loser whichever way
       round it is phrased, and no stem states a direction any more (see below).

   The digits are drawn to one rule, which is what the oracle re-derives:

     the deciding place is the LEFTMOST place where the two digits differ, so
       every place to its left ties;
     every OTHER place that differs points at the LOSER. That is what makes a
       reading at that place a FALSE SENTENCE rather than a true one with a bad
       conclusion, and it is what stops a single digit settling the item.

   REFUTATION FIX (sixth pass 2026-09-16, KILL 1 - NO STEM STATES A DIRECTION).
   v6 phrased the character's wrong claim as "<P> is greater than <Q>". A claim
   about an order that MUST be false is false in exactly one way, so that wording
   is a logical IDENTITY, not a correlation: "greater" named the loser in 13,189
   of 13,189 claim draws, and "take the option that ends on the number the
   character did NOT call greater" composed with the structural 50% below was the
   key in every claim draw with no digit compared - a 66.7% floor where the v6
   note claimed 33.7%. No threshold on any spread gate could see it, because
   there was nothing to correlate. The v6 stem's "because <dP> is more than <dQ>"
   carried the same identity one level down: the quoted place always points at
   the loser, so the digit relation named the loser too.

   NO STEM MAY CARRY THE WORD "greater" OR "smaller" ABOUT A NAMED NUMBER. Every
   claim shape is now ORDER-FREE: it names a PLACE and says the character used it
   (or dismissed it), and it names no winner and quotes no digit. The four
   options each name a place and a conclusion, and the key rotates uniformly over
   them, so the only thing that separates them is reading the digits.

   Three stem shapes, all asking "What went wrong?", each claim shape phrased two
   ways on an independent coin:
     CLAIM, looked too far right  "<K> looked only at the <place> to decide which
                           of <P> and <Q> is greater", or "<K> says the <place>
                           decide which of <P> and <Q> is greater". The place
                           named differs, points at the LOSER, and is never the
                           deciding place, so the method really is wrong. No digit
                           is printed and no number is called greater or smaller.
     CLAIM, the last digit the hundreds and the tens tie, so there is no place to
                           the right of the deciding place left to misread. The
                           character claims the ones CANNOT change which number
                           is greater, or equivalently that the hundreds and the
                           tens were all he looked at - the mirror of "a big ones
                           digit never wins on its own", and the error this third
                           exists to catch. The ones decide on those draws.
     TIE                   "<P> and <Q> are the same, because the <place(s)> are
                           the same" - places that really do tie, read as if they
                           settled the whole number.

   THE PHRASING COIN IS INDEPENDENT OF EVERYTHING. v6 got half its surface variety
   from the greater/smaller pairing, which was the leak; the coin replaces it with
   a word that carries nothing. Ten masked stem templates and twelve whole masked
   items, against v6's six and twelve.

   NO CLAIM NAMES A WINNER, ON PURPOSE. On an ones-decide draw the two tied
   places can only carry tie sentences, which name no winner at all, so the
   deciding place's two readings are the only options that do. If the stem ALSO
   named a number as the greater, "bin the ties, then bin the option that agrees
   with the character" would be the key in 100% of those draws with no digit
   compared - the third pass's own KILL 1, one third over. Measured at 45.8%
   topic-wide before the wording changed and 33.3% after. Since the sixth pass
   that reasoning binds every claim shape, not just the last-digit one.

   REFUTATION FIX (sixth pass 2026-09-16, WOUND 4 - THE TIE STEM NAMES BOTH TIED
   PLACES WHEN BOTH TIE). On an ones-decide tie draw the two distractors are
   tie('hundreds') and tie('tens'), and a stem citing one of those two places
   reprinted the character's own reason AND conclusion as an option, word for
   word, on 16.8% of all draws. It leaked nothing (binning it leaves three), but
   an option that is the stem is not a reading of anything, so the stem now cites
   "the hundreds and the tens" together and no option can restate it. Asserted by
   the oracle.

   Two option templates, one coarse shape ("The <place> ..."), and the option set
   is always four options over TWO places:
     THE <place> DECIDE   P's digit first, Q's second, so "less" always ends on Q
                          and "more" always ends on P - no option can state a
                          comparison and then contradict it. A place NEVER ships
                          one reading alone: both ship or neither does, so the
                          stem's own reason can never be a lone free elimination
                          (the v4 wound) and each number is named exactly twice.
     THE <place> ARE THE SAME  ... so P and Q are the same size: the character's
                          own stopped-too-early conclusion, which is false, so it
                          is never a defensible answer, and it names BOTH numbers.
   When a second place differs, the four options are the deciding place twice and
   that place twice; when only the deciding place differs - every ones-decide
   draw, and nothing else - the other two options are the two tied places.

   DECLARED FLOOR, and it is structural. The option set only ever states a
   comparison at a place where the digits DIFFER, and the deciding place is by
   definition the leftmost of those, so "take one of the two options at the
   leftmost place that names a winner" narrows to two on every draw of any
   four-option item of this shape, whatever the stems do. That is 50%, it is what
   v3, v4 and v5 were, and choosing between the two survivors IS the place-value
   comparison the item teaches. Closing it would need an option naming a winner
   at a TIED place, which is a sentence that contradicts itself. Every route that
   does NOT need that comparison is measured in the lane note.

   Every numeral in the option list appears in at least two options, so no option
   can be picked out by an odd token. Asserted in tools/gen-sanity.mjs: the
   oracle re-derives the deciding place and every printed digit from the stem,
   checks the character's claim really is wrong, checks that every differing
   place other than the deciding one points at the loser, rejects any option
   whose comparison contradicts its own conclusion, requires exactly one option
   that states a TRUE comparison at the place that really decides, and rebuilds
   the whole option set from the digits. */
function gCompareError(){
  const PLACES = ['hundreds', 'tens', 'ones'];
  const RIGHT = { hundreds: ['tens', 'ones'], tens: ['ones'], ones: [] };
  const decide = pick(PLACES);
  const claimStem = Math.random() < 0.5;
  /* digits as [winner, loser] per place. No redraw loop is needed: each branch
     draws the ordering it wants, so every draw is valid by construction. */
  const d = {};
  const flr = p => p === 'hundreds' ? 1 : 0;
  const sameAt = p => { const v = ri(flr(p), 9); d[p] = [v, v]; };
  const winAt  = p => { const w = ri(flr(p) + 1, 9); d[p] = [w, ri(flr(p), w - 1)]; };
  const loseAt = p => { const l = ri(flr(p) + 1, 9); d[p] = [ri(flr(p), l - 1), l]; };
  for (const p of PLACES) { if (p === decide) break; sameAt(p); }
  winAt(decide);
  const rest = RIGHT[decide];
  let q = null;        /* the second place that carries two options */
  let qp = null;       /* the place the character quotes on a claim stem */
  let z = 'hundreds';  /* the tied place the character cites on a tie stem */
  if (decide === 'ones') {
    /* BOTH tied places, never one of them: the two distractors on this third are
       tie('hundreds') and tie('tens'), so citing a single place would reprint the
       character's own sentence as an option (sixth-pass WOUND 4). */
    if (!claimStem) z = 'hundreds and the tens';
  } else if (claimStem) {
    for (const p of rest) loseAt(p);
    q = pick(rest);
    qp = rest.length > 1 ? rest.find(p => p !== q) : q;
  } else {
    z = decide === 'hundreds' ? pick(rest) : 'hundreds';
    q = rest.find(p => p !== z);
    if (decide === 'hundreds') sameAt(z);
    loseAt(q);
  }
  const num = i => d.hundreds[i] * 100 + d.tens[i] * 10 + d.ones[i];
  const win = num(0), lose = num(1);
  /* WHICH NUMBER PRINTS FIRST IS A COIN TOSS, and since the sixth pass no stem
     says anything about either of them, so neither the print order nor any word
     in the stem lines up with the truth. */
  const P = Math.random() < 0.5 ? win : lose, Q = P === win ? lose : win;
  const dg = (n, place) => place === 'hundreds' ? Math.floor(n / 100)
                         : place === 'tens' ? Math.floor(n / 10) % 10 : n % 10;
  const cmp = (place, word) =>
    'The ' + place + ' decide: ' + dg(P, place) + ' is ' + word + ' than ' + dg(Q, place) +
    ', so ' + (word === 'less' ? Q : P) + ' is greater.';
  const tie = place => 'The ' + place + ' are the same, so ' + P + ' and ' + Q + ' are the same size.';
  const trueWord = place => dg(P, place) > dg(Q, place) ? 'more' : 'less';
  const key = cmp(decide, trueWord(decide));
  const wrongs = [cmp(decide, trueWord(decide) === 'more' ? 'less' : 'more')];
  if (q) wrongs.push(cmp(q, 'more'), cmp(q, 'less'));
  else wrongs.push(tie('hundreds'), tie('tens'));
  const k = kid();
  /* ORDER-FREE, ALL THREE THIRDS (sixth-pass KILL 1). A false claim about an
     order names the loser with certainty, so no stem states one: the claim shapes
     name a PLACE and nothing else. No winner, no digit, no direction.
     Each claim shape is phrased two ways on an INDEPENDENT coin, which is where
     the surface variety v6 got from "greater"/"smaller" now comes from - a coin
     that carries nothing, rather than a word that carried the answer. */
  const alt = Math.random() < 0.5, which = ' which of ' + P + ' and ' + Q + ' is greater.';
  const stem = claimStem
    ? (qp
        ? (alt ? k[0] + ' says the ' + qp + ' decide' + which
               : k[0] + ' looked only at the ' + qp + ' to decide' + which)
        : (alt ? k[0] + ' says the ones cannot change' + which.slice(0, -1) + ', because ' +
                 'the hundreds and the tens are the same.'
               : k[0] + ' looked only at the hundreds and the tens to decide' + which))
    : k[0] + ' says ' + P + ' and ' + Q + ' are the same, because the ' + z + ' are the same.';
  const tied = PLACES.filter(p => dg(P, p) === dg(Q, p));
  const tail = ' Start on the LEFT and keep moving right until you reach a place where the two digits ' +
    'are DIFFERENT. That place decides, and nothing to the right of it can change the answer.';
  return mcText(stem + ' <b>What went wrong?</b>', '', key, wrongs,
    (tied.length
      ? 'A place that MATCHES settles nothing: ' + tied.map(p => 'the ' + p).join(' and ') +
        ' are the same in both numbers. '
      : 'All three places differ here, so the one furthest LEFT is the one that decides. ') +
    'The ' + decide.toUpperCase() + ' decide: ' + win + ' has ' + dg(win, decide) + ' and ' + lose +
    ' has ' + dg(lose, decide) + ', so ' + win + ' is greater and ' + lose + ' is smaller.' +
    (qp ? ' The ' + qp + ' are the wrong place to start: a bigger digit there never wins on its own.' : '') +
    tail);
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
