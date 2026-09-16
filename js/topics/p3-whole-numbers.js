"use strict";
/* Math Quest Island topic: p3numbers (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 *
 * ===========================================================================
 * SWEEP 2026-09-15 (depth-pilot contract taken wide; lane/sweep-p3numbers).
 * Baseline this file replaces, from [[Repetition + Demand Audit - 2026-09-05]]:
 * 2 skills, 7 generators, 20 stem shapes, and worst-ten entry #5 -
 * `gStandsEasy` (pool 1) and `gStandsHard` (pool 3) were BYTE-IDENTICAL stem
 * templates ("In 5731, the digit 3 stands for how much?") differing only in the
 * size of the number. Two of three pool-3 slots added no solving step.
 *
 * THE UNIT OF AUTHORING IS A PRINCIPLE, and each principle ships a BANK OF
 * FORMATS a teacher would rotate through: direct compute, inverse, compare,
 * error spotting (diagnose AND correct), word problem in a Singapore context,
 * working backwards, concept check, mixed principle.
 *
 * PRINCIPLE 1 - PLACE VALUE (skill `place`).
 *   A digit's place tells you what it is WORTH. The 3 in 5731 is not three, it
 *   is three tens; and a zero still has to hold its place.
 *   gStandsEasy (direct), gWhichDigit (concept check), gExpanded (expanded
 *   form), gBuildNum (inverse: build the number), gStandsCompare (compare two
 *   digit values in one number), gStandsError (error spot, diagnose),
 *   gZeroFix (error spot, correct).
 *
 * PRINCIPLE 2 - COMPARING, ORDERING AND NUMBER PATTERNS (skills `compare`,
 *   `pattern`). Compare left to right, one place at a time, and stop at the
 *   first place where the digits differ. A pattern is the same jump made again.
 *   gGreatest, gCompareTrue, gSmallest, gBetween, gOrder, gCompareError (compare);
 *   gPatternConcept, gPattern4, gMoreLess, gPatternMissing, gPatternOdd (pattern).
 *
 * PRINCIPLE 3 - ADDING AND SUBTRACTING WITHIN 10 000, WITH REGROUPING
 *   (skill `addsub`). When a column makes ten or more, the ten moves left; when
 *   you cannot take away, you take one from the column on the left. Regrouping
 *   IS the idea, and the two classic slips (never carry; always take the small
 *   digit from the big one) are named distractors, not padding.
 *   gAddConcept, gAddRegroup, gSubRegroup, gMissingAddend, gMentalMake,
 *   gAddError, gSubError, gTwoStepWord, gBackFromTotal.
 *
 * NO GENERATOR SITS IN TWO POOLS. Pool 3 holds 11 slots and TEN of them are
 * two-step. The eleventh is gSubError ("what is the correct answer?"), and it is
 * DECLARED here rather than counted as two: a child who simply works out a − b
 * answers it. The v2 pass rebuilt that slot to ask for the gap between the slip's
 * answer and the right one, which did buy a second computation and cost more than
 * it bought - the gap is structurally the smallest number on the screen, and
 * "pick the smallest" answered the item on 97.67% of draws. Reverted, counted
 * honestly. (Proposal 2 asks that a 1-step pool-3 slot be DECLARED rather than
 * accidental. This is the declaration: one of eleven, named, with its reason.)
 *
 * The single-step fluency anchors live in pools 1 and 2, and on THIS topic the
 * feed serves pools 1/2/3 at roughly 0.19 / 0.23 / 0.58 (500 seeds x 30 through
 * MQI.createFeed at 80% accuracy), so a child is in pool 3 for about 58% of a
 * session - the P3-grade aggregate feed-sim prints (0.206 / 0.398 / 0.397) picks
 * a random live P3 topic per seed and does NOT describe Thousand Isles. At 45%
 * accuracy the climb inverts it: pool 1 takes about 80% of the session, which is
 * why both pool-1 singleton skills matter (see gCompareTrue).
 *
 * MAGNITUDE IS A TELL AND IT IS GATED. Every numeric MC in this file builds its
 * distractors through slipSet(), so named slips land on BOTH sides of the key and
 * the key's rank among the four printed numbers moves from draw to draw.
 * tools/gen-sanity.mjs ranks all 2,000 draws of every numeric bank in the topic
 * and fails it if any rank takes more than 45%, if "pick the smallest" or "pick
 * the largest" clears 40%, or if any rank falls below 12% (third pass, W3: a
 * rank at 0% is a free elimination, worth +8.3 points to a guesser on 100% of
 * draws). TWO banks are exempt - gGreatest and gSmallest - and they are
 * allowlisted BY NAME, with the premise of the exemption re-measured on every
 * draw: their stems carry no number at all (0.00% of 20,000 draws), so the four
 * options ARE the data and "the greatest is the largest one" is the mathematics.
 * gBetween used to ride the same exemption on a stem-word regex, and "pick the
 * third smallest" answered it on 100.00% of draws while the gate printed it as
 * impossible (third pass, KILL). It now carries a THIRD, narrower exemption,
 * allowlisted by name and re-measured on every draw (fourth pass, W1, PM ruling):
 * its three wrong answers STRADDLE the range, one below and one above on 100% of
 * draws, so neither single bound settles the item - and the price of that
 * straddle is that the key is the 2nd or 3rd of the four printed numbers by
 * construction (0.00 / 49.9 / 50.1 / 0.00). That ~50% is the declared structural
 * floor of a four-option between-item, not a defect of this one. "Pick the
 * smallest" and "pick the largest" are still gated and both measure 0.00%; the
 * premise re-check fails the gate the moment the key is ever an extreme.
 *
 * AND SO IS WIDTH, INSIDE THE CLASS (seventh pass, 2026-09-16). The magnitude
 * gate ranks the key against all four printed numbers and the length gate ranks
 * it against the extremes; neither ranks it against the options it is CONFUSABLE
 * with, which are the ones printed at the same width. Every slip family in this
 * file is built by MULTIPLYING the key, a small multiple prints at the key's own
 * width and always ABOVE it, so wherever such a slip shipped the key was the
 * minimum of its own width class by construction - and "take the commonest
 * printed width, then the smaller number" answered gPatternConcept, pool 1's
 * busiest generator, on 69.63% of draws with no arithmetic at all. tools/
 * gen-sanity.mjs now carries a WIDTH-CLASS RANK column over every numeric bank
 * in the topic: the key's place inside its own width class must stay under 45%
 * at each of MIN / MID / MAX, and the two rules a child can run - commonest
 * width then smallest, commonest width then largest - under 40%. NO BANK IS
 * EXEMPT; the three comparison anchors print four options of one width, so the
 * rule declines on them rather than being waived. Its negative control is the v7
 * gPatternConcept option set, which goes red at ~70%.
 *
 * AND SO IS SHAPE (eighth pass, 2026-09-16). The seventh pass's fix took the KEY
 * off the power-of-ten ladder on two draws in three and left the ladder in the
 * DISTRACTOR family on every draw, which made the key the only number on the row
 * that is not 1-followed-by-zeros - and the smallest of those where there was
 * more than one. "Cross out 1, 10, 100 and 1000, then take the smallest of what is
 * left" answered gPatternConcept on 67.07% / 66.44% of 20,000 draws at two seeds,
 * was never wrong when it fired, and never read the four printed terms. The
 * magnitude, length and width columns all printed pass, and all three were true:
 * nothing in the harness had ever read the SHAPE of an option. tools/gen-sanity.mjs
 * now carries a SHAPE RULER over every numeric bank in the topic - "is 1 followed
 * by zeros", "is a multiple of 100", "is round to the nearest ten" - scored in both
 * directions (unique to the key, unique to all three distractors) and as a ROUTE
 * (cross out the options that have the shape, or the ones that do not, then take
 * the smallest or the largest of what is left), capped at 60% with no bank exempt.
 * Its negative control is the v8 gPatternConcept option set, which goes red at
 * ~67%. The power-of-ten ladder is retired as a slip family for jump items: a
 * fixed set of round numbers beside a non-round key IS the answer.
 *
 * SCOPE (MOE Oct 2025, P3 p.35). Numbers up to 10 000: 1.1 counting in hundreds
 * and thousands, 1.2 number notation / representations / place values,
 * 1.4 comparing and ordering, 1.5 patterns in number sequences. Addition and
 * Subtraction: 2.1 algorithms up to 4 digits, 2.2 mental calculation of two
 * 2-digit numbers. NOT here: rounding (P4 1.5), numbers past 9999, negative
 * results, reading and writing numbers in WORDS (needs a words-to-numeral typed
 * input the finishers do not support - a separate lane's call).
 *
 * FENCE against `heuristics` (Puzzle Caves, which also owns a `pattern` skill):
 * Puzzle Caves draws 1- and 2-digit typed sequences ("What comes next? 3, 6, 9,
 * 12, ?"). This file's patterns are 4-digit and MC, and the step set is, in full:
 * 10 / 100 / 1000 for the counting anchors (gPattern4, gMoreLess; MOE P3 1.1),
 * 100 / 150 / 200 / 250 / 500 for gPatternMissing, and 15 / 25 / 35 for
 * gPatternOdd - both of the last two being items where the jump has to be FOUND
 * rather than read, which is MOE P3 1.5, patterns in number sequences, and which
 * 1.5 does not restrict to multiples of ten. gPatternConcept draws 10 / 100 /
 * 1000 on one draw in three and 15 / 25 / 150 / 250 on the other two (SEVENTH
 * pass, and the reason is at the generator: while the jump is a power of ten the
 * key is the smallest number of its own printed width by definition, and counting
 * characters answered the item on 69.6% of draws). 1500 and 2500 were dropped in
 * the EIGHTH pass: three to five times the largest jump anywhere else in the
 * topic, and `start = ri(1000, MAXN - 3*step)` pinned every step-2500 item's first
 * term into [1000, 2499] on 100% of its draws. Its question is "what is the jump",
 * so it is a 1.5 item on every draw and a 1.1 item on the anchor third.
 *
 * W2, SIXTH pass. This paragraph used to read "jump by a whole number of tens -
 * counting in tens, hundreds and thousands for the anchors, and 150s and 250s
 * where the item needs the jump to be found", and it named gPatternOdd as one of
 * the two. v6 moved gPatternOdd to 15 / 25 / 35 to close the fifth pass's tens-
 * column kill and left this sentence false about that generator on 100% of its
 * draws, along with the `pattern` skill tip a parent reads (which told the child
 * to say whether the jump is "tens, hundreds or thousands"). Both are corrected
 * here; the mathematics did not move and neither did the scope.
 * Puzzle Caves reaches neither range. Different stems, different range, no
 * overlap - and this sentence is a note, not a gate, which is what the refutation
 * said about it.
 *
 * EVERY generator here is re-derived from its RENDERED stem by an oracle in
 * tools/gen-sanity.mjs. Nothing is trusted from the generator's own answerText.
 * Every numeric MC either stamps `q.authored` (all three distractors are named
 * misconceptions and none was padded in) or stamps `q.optionSet` (the four
 * options ARE the data the child compares, as in "which is the greatest?").
 * gen-sanity fails this topic if a question stamps neither.
 * ===========================================================================
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

  /* name + the pronoun its options and explanations use, so an error-spotting
     key reads as one sentence and the harness can rebuild it exactly. */
  const KIDS = [
    ['Wei Jie', 'He'], ['Aisyah', 'She'], ['Kavitha', 'She'], ['Jun Hao', 'He'],
    ['Siti', 'She'], ['Priya', 'She'], ['Daryl', 'He'], ['Xin Yi', 'She'],
    ['Farhan', 'He'], ['Mei Ling', 'She']
  ];
  const PLACES = ['thousands', 'hundreds', 'tens', 'ones'];
  const PLACE1 = ['thousand', 'hundred', 'ten', 'one'];   /* singular forms */
  const POW = [1000, 100, 10, 1];
  const MAXN = 9999;                       /* scope ceiling: numbers up to 10 000 */

  /* ---- house helpers -------------------------------------------------- */
  const ok = n => Number.isInteger(n) && n >= 1 && n <= MAXN;
  /* W1 (Sweep p3numbers Refutation, 2026-09-15): SIX generators printed "1 tens",
     "1 ones" or "1 thousands" - and one of them printed it in the STEM a child
     reads (gZeroFix, 31% of draws). gBuildNum already carried the pluraliser and
     nobody else called it. It is now a house helper, and EVERY place-word that
     follows a count in this file goes through it. tools/gen-sanity.mjs gates the
     prose so the sentence cannot come back. */
  const pl = (v, w) => v + ' ' + w + (v === 1 ? '' : 's');
  const plPlace = (v, i) => pl(v, PLACE1[i]);
  /* "2 thousands, 9 hundreds, 1 ten, 8 ones" - the read-it-out-loud line */
  const placeList = d => d.map(plPlace).join(', ');
  function allDistinct(list){
    const s = new Set();
    for (const v of list){ if (s.has(v)) return false; s.add(v); }
    return true;
  }
  /* every NAMED distractor must be a whole number inside scope, distinct from
     the key and from every other named distractor - so finishNum's shuffle can
     never surface a collision and the padding branch below never fires. */
  function optsOk(correct, cands){
    if (!ok(correct)) return false;
    return cands.every(ok) && allDistinct([correct].concat(cands));
  }
  /* RULE C in tools/gen-sanity.mjs fails a key printed more than 1.4x as wide as
     the longest distractor, and "pick the option with the odd number of digits"
     is a strategy a child can run on sight. Most banks here draw four 4-digit
     numbers and cannot trip either. The two banks whose named slips can collapse
     to one or two digits (gStandsCompare's "compared the digits" family,
     gMentalMake's "the amount moved") check here that at least one distractor is
     printed at the key's own width, so the key is never the only wide option.

     W4, EIGHTH pass - AND THE CHECK ITSELF WAS PINNING A CERTAINTY. Requiring a
     distractor at the key's EXACT width is stronger than RULE C needs, and it
     made the key's own width class impossible to leave: that width always held at
     least two options, so wherever two widths tied 2-2 the key was in the WIDER
     pair - 100.00% of gStandsCompare's 17.6% of tie draws, and 100% of
     gMentalMake's and gZeroFix's smaller ones. That is a certainty sitting in the
     one branch the width-class ruler declines to read. RULE C only fails a key
     printed MORE than 1.4x the longest distractor, so the honest floor is "the
     key is never the widest option on its own": at least one distractor at the
     key's width OR WIDER. The narrow-key rows that admits are exactly the ones
     that can put the key in the NARROWER half of a tie. */
  function sameWidth(correct, cands){
    const w = String(correct).length;
    return cands.some(c => String(c).length >= w);
  }
  /* W4 (Sweep p3numbers Refutation, EIGHTH pass, 2026-09-16). The WIDTH-CLASS
     RANK gate reads the COMMONEST printed width and declines when two widths tie
     2-2 - by design, because there is then no commonest class to rank the key
     inside. Where it declines, the answer was a certainty: gStandsCompare tied on
     17.61 / 17.23% of draws and the key was in the WIDER pair on 100.00% of them,
     gAddConcept tied on 8.37 / 8.29% with the key in the NARROWER pair on 100.00%,
     gMentalMake and gZeroFix ~1-2% each, all 100%. "Two lengths, two of each -
     take the long pair" halves the row for nothing.
     The fix is not to break the certainty (on gStandsCompare the key is `vi - vj`
     with `vj < POW[i] <= vi`, so the key is printed at `vi`'s width on every draw
     the item can legally make and NO authoring can put it in the narrow half) but
     to stop drawing the branch: a four-option row whose widths have no strict mode
     is redrawn. The ruler declines on a shape the bank no longer ships. */
  function widthTie(correct, cands){
    const c = new Map();
    for (const v of [correct].concat(cands)){
      const w = String(v).length;
      c.set(w, (c.get(w) || 0) + 1);
    }
    const n = [...c.values()].sort((x, y) => y - x);
    /* only a tie for a class of TWO OR MORE is the branch in question. Four
       distinct widths (counts 1,1,1,1) is the ruler declining because there is no
       class at all - the shape the counting anchors ship on every draw. */
    return n.length > 1 && n[0] >= 2 && n[0] === n[1];
  }

  /* ---- NAME A SLIP THE CHILD CAN ACTUALLY SEE -------------------------
     W5 (Sweep p3numbers Refutation, SIXTH pass, 2026-09-16), and the same class
     the p2 lane closed one pass earlier. Four banks ended their explanation by
     naming ONE misconception and its value - "which is the commonest slip -
     gives 3182" - while the three printed distractors are drawn by slipSet from
     a LARGER family, so the named number was not on the options row on 52.98%
     (gSubRegroup), 49.95% (gTwoStepWord), 49.15% (gAddRegroup) and 38.06%
     (gBuildNum) of draws. Nothing is arithmetically false and nothing leaks
     while the child is choosing; it is an explanation asserting something about
     the option list that the draw did not deliver, and the child is sent to look
     for a number that is not on the screen.

     Every one of those banks now hands slipWhy() its WHOLE family as
     [value, why] pairs in PREFERENCE order, and the sentence names the first
     pair that actually shipped. The bank's own headline misconception is still
     first, so nothing changes on the draws where it is on the row. Asserted by
     RULE E of tools/gen-sanity.mjs: every number an explanation names after an
     answer-naming verb ("gives", "you get", "answers", "leaves you with") must
     be one of the four printed options. Its negative control is the v6
     gSubRegroup sentence. */
  function slipWhy(cands, pairs){
    for (const p of pairs) if (cands.indexOf(p[0]) !== -1) return p;
    return null;
  }

  /* ---- THE SAME SLIPS, MADE TWO AT A TIME -----------------------------
     (Sweep p3numbers Refutation, NINTH pass, KILL - see slipSet.)

     A family of one-column slips hands the item away column by column: three
     one-column misreadings beside the key means every column carries the key's
     digit three times out of four, so crossing out each column's minority digit
     leaves the key alone and the stem is never read. What stops it is two slips
     that carry the SAME wrong digit in the same column, and the cheapest honest
     source of those is the file's own misconceptions COMPOUNDED - a child who
     forgets the carry out of the tens column and also invents one into the
     hundreds makes both of this bank's named slips at once, and the two errors
     sit on the row sharing a digit where they agree.

     Takes the single slips as [offset-from-the-key, why] pairs and returns the
     singles plus every in-scope pair of them as [value, why] pairs in
     preference order, so slipWhy still names the first one that shipped and
     RULE E still binds. Offsets that cancel (a carry lost and the same carry
     invented) land back on the key and are dropped. */
  function twoAtATime(key, ones){
    const out = [], seen = new Set([key]);
    const add = (v, w) => { if (!ok(v) || seen.has(v)) return; seen.add(v); out.push([v, w]); };
    for (const p of ones) add(key + p[0], p[1]);
    for (let i = 0; i < ones.length; i++)
      for (let j = i + 1; j < ones.length; j++)
        add(key + ones[i][0] + ones[j][0],
            ones[i][1] + ' and then ' + ones[j][1].charAt(0).toLowerCase() + ones[j][1].slice(1));
    return out;
  }

  /* ---- MAGNITUDE RANK (second-pass KILL, 2026-09-15) -------------------
     The v2 gSubError rebuild was answered on 97.67% of draws by "pick the
     smallest number on the screen": all three of its named slips sat ABOVE the
     key, so the key was structurally the minimum of the four. Nothing in the
     harness could see it - RULE C and RULE D both count CHARACTERS, and every
     option there was four characters or fewer. The tell was MAGNITUDE.

     Every numeric MC in this file now builds its distractors through slipSet.
     The generator declares its named slips as one FAMILY; slipSet splits the
     family into the slips that land BELOW the key and those that land ABOVE,
     picks how many come from each side, and returns three. The key's position
     among the four printed numbers therefore moves from draw to draw BY
     CONSTRUCTION - it is not a property of which misconceptions happened to be
     bigger than the answer. Returns null when three distinct in-scope slips
     cannot be found, which is the caller's signal to redraw.

     tools/gen-sanity.mjs ranks every numeric bank in this topic over 2,000
     draws and fails the topic if any one rank takes more than 45% of them, if
     "pick the smallest" or "pick the largest" clears 40%, or - third pass, W3 -
     if any rank falls BELOW 12%. A rank at 0% is as much a tell as a rank at
     100%: it tells the child which option to cross out, and crossing one out
     takes a guesser from 25% to 33.3% on every draw. The gate is now two-sided
     and every family below carries slips on BOTH sides for that reason.

     Third pass, W1. `minGap` forbids any slip closer to the key than the
     SMALLEST PLACE VALUE THE ITEM TESTS. v3 added `ans +- step/10` to the two
     counting banks, and on the step === 10 branch step/10 is 1: a distractor one
     away from a 4-digit key is a proofreading trap on a phone, not a question
     about tens. Nothing in the harness was asked about it (optsOk only checks
     distinctness), so it is a constructor argument here.

     Third pass, W2. `keepOne` names a set of slips of which exactly ONE is
     guaranteed to be offered. gPatternMissing declared an anti-shortcut guard
     ("at least two options are NOT printed in the stem") that held on every draw
     and still left the compound "keep the options that end in the digits the run
     holds constant, then drop anything already printed" with a single survivor -
     always the key - on 44.65% of draws. The guard is now the stronger one the
     wound asked for: one distractor that is ON the pattern's grid (so it
     survives the trailing-digit test) and is NOT a printed term. keepOne holds
     candidates on both sides of the key, so forcing one does not pin the rank.

     The comparison anchors gGreatest and gSmallest are exempt from the rank gate
     and NOTHING else is: see tools/gen-sanity.mjs, which now allowlists them by
     NAME and re-checks the premise of the exemption on every draw. gBetween used
     to be exempt by a stem-word regex and was answered by "pick the third
     smallest" on 100.00% of draws. */

  /* ---- THE COLUMN RULE (ninth-pass KILL, 2026-09-16) -------------------
     Nine rulers read this file and not one of them ever read ACROSS the four
     printed numbers digit by digit. The ninth pass did, and the topic fell over:

         "Look down each column of the four answers.
          If a digit is in the minority there, cross that answer out."

     answered gPatternMissing outright on 72.6% of 20,000 draws, gMoreLess on
     77.7%, gPattern4 on 67.1%, gSubError / gSubRegroup / gMissingAddend on 58.5
     - 58.8% and gAddRegroup on 53.7%, with no arithmetic anywhere and without
     the stem being read at all.

     IT IS slipSet's OWN DESIGN PRINCIPLE, MEASURED FROM THE OUTSIDE. Every
     named slip in this file is a ONE-COLUMN misreading of the key - key +-
     POW[c]*10, a printed term one jump out, one digit slid. Three of those
     beside the key means that in every column three of the four printed numbers
     carry the key's digit and one does not, so the key is the column-wise
     CONSENSUS of its own option row by construction. It arrived at c099275 /
     4e50301 with the third and fourth passes' magnitude-rank fixes - a
     symmetric +- POW[c] cloud is exactly what flattens the rank AND exactly
     what makes the key the consensus.

     THE ALGEBRA, because the note's own proposed fix does not close it. The
     ninth pass asked for "at most one slip per draw may differ from the key in
     exactly one digit column". That is not sufficient and the counterexample is
     one line: key 3269 against 4179, 3369, 3258 - two slips differing in three
     and two columns - still crosses out to the key alone, because a slip that
     differs from the key in a column is a MINORITY in that column whether it
     differs in one column or four. What crosses a row out is not how many
     columns a slip moves, it is whether its digit is ALONE where it moved. So
     the closing condition is DIGIT COINCIDENCE, and there are exactly two
     shapes that satisfy it:

       - the 2-2 column: two slips carry the SAME wrong digit in a column, so
         that column splits two-two and crosses nobody out. A slip and the same
         slip with a second error compounded on top of it do this by
         construction, which is why the families below now carry compounds:
         key+d, key+e, key+d+e is a LATTICE and the column rule crosses out
         NOTHING on it, whichever corner the key sits in.
       - the 1-1-1-1 column: all four digits in a column differ, so there is no
         majority to be in the minority of. Three slips that all move the SAME
         column by different amounts do this - which is what a counting bank's
         +-step, +-2*step family already is.

     Both shapes are free of the magnitude tell, and that is the answer to the
     tension the ninth pass flagged: the two signs of a lattice are drawn
     independently, so the key is the smallest of the four a quarter of the
     time, the largest a quarter, and a middle the rest. Consensus-safe and
     rank-flat at once; nothing has to be traded.

     slipSet now SCORES the row it is about to ship. It draws the triple the way
     it always did (the below/above split first, so the magnitude rank stays
     exactly as designed), measures what the column rule would be worth on it,
     and redraws up to COL_TRIES times inside the same split, keeping the best
     row it saw and stopping early on a row the column rule cannot touch. The
     ranking is lexicographic, four terms:

       1. DISTANCE FROM CHANCE of the column rule's value. The target is 0.25,
          not 0. A row on which the rule reliably crosses the KEY out is as much
          a tell as one on which it crosses everything else out - it is the same
          tell read backwards, and it is the direction residual 3 has been
          declaring on gPatternOdd since the sixth pass.
       2. the caller's own `prefer` shape, where it passes one. Closing this
          route moved two DECLARED ones (see gPattern4 and gPatternMissing), so
          a bank can name the shape it needs kept and have it honoured inside
          the rows that already clear term 1.
       3. no column holding the key's digit in exactly three of the four.
       4. at least one slip differing from the key in two columns or more.

     `reject` is the caller's HARD filter and runs before all of it - the row
     conditions gStandsCompare, gZeroFix and gMentalMake used to apply in their
     own redraw loops, moved inside so that a row slipSet likes and the caller
     throws away no longer takes the drawn rank with it.

     Gated by the COLUMN RULER in tools/gen-sanity.mjs over every numeric bank
     in the topic, in both directions (cross out the minority, and its mirror -
     pick the option that stands ALONE in a column), with the v9 gPatternMissing
     option row as its negative control at 72.6%. */
  const COL_TRIES = 24;
  const colDigits = n => String(n).split('').reverse();      /* index 0 = ones */
  /* one right-aligned column of four printed numbers; a number that does not
     reach a column has a BLANK there, and a blank is a symbol like any other */
  function colCell(d, k, i){ return i < d[k].length ? d[k][i] : ' '; }
  function colWidth(d){ let w = 0; for (const x of d) if (x.length > w) w = x.length; return w; }
  /* what the column rule is WORTH on this row: the chance a child who crosses
     out every minority digit and then guesses among whatever is left lands on
     the key. A rule that leaves all four (or crosses the whole row out) is
     worth chance, 0.25; a rule that leaves the key alone is worth 1. */
  function colValue(d){
    const w = colWidth(d), alive = [true, true, true, true];
    for (let i = 0; i < w; i++){
      const cnt = new Map();
      for (let k = 0; k < 4; k++){ const c = colCell(d, k, i); cnt.set(c, (cnt.get(c) || 0) + 1); }
      let max = 0;
      for (const v of cnt.values()) if (v > max) max = v;
      for (let k = 0; k < 4; k++) if (cnt.get(colCell(d, k, i)) < max) alive[k] = false;
    }
    let n = 0;
    for (const a of alive) if (a) n++;
    return n ? (alive[0] ? 1 / n : 0) : 0.25;
  }
  /* a column holding the KEY's digit in exactly three of the four printed
     numbers - the shape that hands the fourth away as a free cross-out */
  function colThree(d){
    const w = colWidth(d);
    for (let i = 0; i < w; i++){
      const ch = colCell(d, 0, i);
      let c = 0;
      for (let k = 0; k < 4; k++) if (colCell(d, k, i) === ch) c++;
      if (c === 3) return true;
    }
    return false;
  }
  /* how many place-value columns separate two printed numbers */
  function colSpan(A, B){
    const w = Math.max(A.length, B.length);
    let n = 0;
    for (let i = 0; i < w; i++) if ((A[i] || ' ') !== (B[i] || ' ')) n++;
    return n;
  }
  function slipSet(key, family, opt){
    opt = opt || {};
    const minGap = opt.minGap || 0;
    if (!ok(key)) return null;
    const seen = new Set([key]);
    const usable = v => ok(v) && !seen.has(v) && Math.abs(v - key) >= minGap;
    /* the guaranteed survivor, drawn from whichever candidates this draw allows */
    let kept = null;
    if (opt.keepOne){
      const live = opt.keepOne.filter(usable);
      if (!live.length) return null;
      kept = pick(live);
      seen.add(kept);
    }
    const below = [], above = [];
    for (const v of family){
      if (!usable(v)) continue;
      seen.add(v);
      (v < key ? below : above).push(v);
    }
    const need = kept === null ? 3 : 2;
    const lo = Math.max(0, need - above.length), hi = Math.min(need, below.length);
    if (lo > hi) return null;
    const r = ri(lo, hi);                       /* how many slips land below the key */
    /* THE COLUMN RULE, scored inside the split the magnitude gate just fixed.
       The rank is drawn first and never moves; all that is chosen here is WHICH
       slips fill it, and they are chosen so the four printed numbers do not
       hand the key over column by column. */
    const kd = colDigits(key);
    /* `reject` is the CALLER's own row filter - gStandsCompare and gZeroFix both
        redraw a row whose printed widths tie 2-2, and gStandsCompare also
        requires a distractor at the key's width or wider. Those used to run in
        the generator's do-while, AFTER slipSet had chosen: a row slipSet liked
        and the caller threw away took the whole draw with it, including the rank
        the magnitude gate had just fixed, and the rejected rows are not a
        uniform sample of ranks (the eighth pass measured rank 3 falling to 11.8%
        on gStandsCompare from exactly this). The filter runs INSIDE the search
        now, so the rank drawn above is the rank shipped. */
    const bad = opt.reject || (() => false);
    /* `prefer` is the caller's SOFT criterion, and it exists because closing the
       column rule reopened two declared ones. The compounds that flatten a
       column are further from the key than the singles they replace, so on the
       three counting banks they emptied the window between the key and the last
       printed term - and "the smallest option above the biggest number on the
       page" went from 32% to 41% on gPattern4, while gPatternMissing's straddle
       went from 25% to 53%. A bank hands slipSet the shape it needs to keep
       (here: at least one slip inside its own printed run) and it is honoured
       AFTER the column value and before everything else, so the kill is closed
       first and the residual is held where the ninth pass measured it. Where no
       row can do both, the column value wins and the residual is declared. */
    const want = opt.prefer || (() => true);
    let bestOut = null, bv = 2, bp = 0, bt = 0, bm = 0, any = null;
    for (let t = 0; t < COL_TRIES; t++){
      const out = shuffle(below).slice(0, r).concat(shuffle(above).slice(0, need - r));
      if (kept !== null) out.push(kept);
      if (any === null) any = out;
      if (bad(out)) continue;
      const d = [kd].concat(out.map(colDigits));
      /* CHANCE, not zero. The target is a row on which the column rule is worth
         exactly what guessing is worth - 0.25 - and NOT a row on which it is
         worth less. A rule that reliably crosses the key OUT is as much a tell
         as one that crosses everything else out; it is the same tell read
         backwards, and it is the direction residual 3 has been declaring on
         gPatternOdd since the sixth pass. Distance from chance is the score. */
      const v = Math.abs(colValue(d) - 0.25), three = colThree(d) ? 0 : 1;
      const pr = want(out) ? 1 : 0;
      let multi = 0;
      for (let k = 1; k < 4; k++) if (colSpan(d[k], kd) >= 2) { multi = 1; break; }
      if (bestOut === null || v < bv ||
          (v === bv && (pr > bp ||
          (pr === bp && (three > bt || (three === bt && multi > bm)))))){
        bestOut = out; bv = v; bp = pr; bt = three; bm = multi;
      }
      if (bv < 1e-9 && bp && bt && bm) break;   /* a row the column rule cannot touch */
    }
    /* no row at this rank clears the caller's filter: hand back one it will
       throw away, which is the redraw the generator's own do-while performs */
    return shuffle(bestOut === null ? any : bestOut);
  }

  /* The two mirror regrouping slips, per column, as [offset-from-the-key, why]
     pairs - the input twoAtATime compounds for the three subtraction banks. A
     regrouping kept that was not needed lands ABOVE the answer and one lost
     lands below it, which is what keeps the magnitude rank flat; compounded,
     they are what keeps the column rule off the row. */
  function borrowOnes(cols){
    return cols.map(c => [POW[c] * 10, 'Forgetting to take one away from the ' + PLACES[c - 1] +
             ' column after borrowing from it'])
      .concat([1, 2, 3].map(c => [-POW[c] * 10, 'Borrowing from the ' + PLACES[c - 1] +
             ' column when that column could already take away']));
  }

  /* Numeric MC whose three distractors are all AUTHORED misconceptions. Stamps
     q.authored only when three named wrong answers survived, which is what makes
     the harness's distractor-identity contract bind; every generator in this file
     guarantees three by redraw, so the padding loop is dead code kept only so a
     future edit degrades instead of throwing. */
  function mcNum(stem, extra, correct, cands, unit, explain){
    const seen = new Set([correct]); const d = [];
    for (const c of (cands || [])){
      if (d.length >= 3) break;
      if (!ok(c) || seen.has(c)) continue;
      seen.add(c); d.push(c);
    }
    const authored = d.length === 3;
    /* `cands` is null when a generator's slip family ran out of in-scope, distinct
       members - the same condition optsOk() has always reported. The padding loop
       below then fires and q.authored is not stamped, so the harness fails the
       distractor contract instead of the file throwing. */
    let t = 1;
    while (d.length < 3 && t < 200){
      if (ok(correct + t) && !seen.has(correct + t)) { seen.add(correct + t); d.push(correct + t); }
      else if (ok(correct - t) && !seen.has(correct - t)) { seen.add(correct - t); d.push(correct - t); }
      t++;
    }
    const q = finishNum(stem, extra, correct, d, unit, explain);
    if (authored) q.authored = d;
    return q;
  }
  /* The four options ARE the numbers the child is comparing (greatest, smallest,
     between, which list is in order). There is no "named misconception" to stamp:
     the distractors are the data. Declared, so the harness can tell this apart
     from a generator that quietly shipped padding. */
  function mcSet(stem, extra, correctText, others, explain){
    const opts = shuffle([correctText].concat(others));
    const q = { q: stem, extra: extra || '', choices: opts.map(String),
                correct: opts.indexOf(correctText), explain: explain,
                answerText: String(correctText) };
    q.optionSet = true;
    return q;
  }
  /* Word-answer MC (concept checks, error diagnosis). Distractors are hand-written
     misconceptions, so they are distinct by authoring, not by arithmetic. */
  function mcText(stem, extra, correctText, wrongs, explain){
    const opts = shuffle([correctText].concat(wrongs.slice(0, 3)));
    return { q: stem, extra: extra || '', choices: opts, correct: opts.indexOf(correctText),
             explain: explain, answerText: correctText };
  }

  /* four distinct non-zero digits -> a 4-digit number with no repeated digit, so
     "the digit 3" can only mean one column. */
  function digits4(){ return shuffle([1,2,3,4,5,6,7,8,9]).slice(0,4); }
  function numOf(d){ return d[0]*1000 + d[1]*100 + d[2]*10 + d[3]; }
  function digitsOf(n){
    const d = [];
    for (let i = 0; i < 4; i++) d.push(Math.floor(n / POW[i]) % 10);
    return d;
  }

  /* Column arithmetic, simulated the way a child does it on paper. `suppressAt`
     is the column whose carry (or borrow) the child forgot; pass -1 for a clean
     run, which reproduces a + b and a - b exactly. Both are mirrored verbatim by
     the oracles in tools/gen-sanity.mjs. */
  function addCols(a, b, suppressAt){
    const A = digitsOf(a), B = digitsOf(b);
    let carry = 0, out = 0;
    for (let i = 3; i >= 0; i--){
      const s = A[i] + B[i] + carry;
      out += (s % 10) * POW[i];
      carry = (s >= 10 && i !== suppressAt) ? 1 : 0;
    }
    return out + carry * 10000;
  }
  function subCols(a, b, suppressAt){
    const A = digitsOf(a), B = digitsOf(b);
    let borrow = 0, out = 0;
    for (let i = 3; i >= 0; i--){
      const top = A[i] - borrow;
      if (top < B[i]) { out += (top + 10 - B[i]) * POW[i]; borrow = (i === suppressAt) ? 0 : 1; }
      else { out += (top - B[i]) * POW[i]; borrow = 0; }
    }
    return out;
  }
  function carryCols(a, b){
    const A = digitsOf(a), B = digitsOf(b), out = []; let c = 0;
    for (let i = 3; i >= 0; i--){ const s = A[i] + B[i] + c; if (s >= 10){ out.push(i); c = 1; } else c = 0; }
    return out;
  }
  function borrowCols(a, b){
    const A = digitsOf(a), B = digitsOf(b), out = []; let br = 0;
    for (let i = 3; i >= 0; i--){ const top = A[i] - br; if (top < B[i]){ out.push(i); br = 1; } else br = 0; }
    return out;
  }
  /* the "always take the small digit from the big one" answer */
  function smallFromBig(a, b){
    const A = digitsOf(a), B = digitsOf(b); let out = 0;
    for (let i = 0; i < 4; i++) out += Math.abs(A[i] - B[i]) * POW[i];
    return out;
  }
  /* the "never carry anything" answer */
  function noCarry(a, b){
    const A = digitsOf(a), B = digitsOf(b); let out = 0;
    for (let i = 0; i < 4; i++) out += ((A[i] + B[i]) % 10) * POW[i];
    return out;
  }
  const digitSum = n => digitsOf(n).reduce((s, d) => s + d, 0);


/* =========================================================================
   PRINCIPLE 1 - PLACE VALUE
   ========================================================================= */

/* FORMAT 1 - direct compute: what is this digit worth? (pool 1, 1 step)
   The fluency anchor. Named distractors: the digit itself (the commonest P3
   answer by a distance), and the same digit read one column too far each way. */
function standsFor(posLo, posHi){
  const d = digits4(), n = numOf(d), p = ri(posLo, posHi), dig = d[p];
  const val = dig * POW[p];
  const cands = [dig, dig*10, dig*100, dig*1000].filter(c => c !== val && c <= MAXN);
  return mcNum('In ' + n + ', the digit ' + dig + ' stands for how much?', '', val, cands, '',
    'Read the places from the left: ' + placeList(d) + '. The ' +
    dig + ' sits in the ' + PLACES[p] + ' place, so it stands for ' + dig + ' × ' + POW[p] + ' = ' + val +
    '. ' + (p === 3
      ? 'In the ones place - and nowhere else - the digit and what it is worth are the same number.'
      : 'Saying just "' + dig + '" gives the digit, not what the digit is worth.'));
}
/* The place is drawn from all FOUR columns. It used to be the hundreds or the
   tens only, which meant the same three slips (the digit, and the digit read one
   column each way) always sat two below and one above the key, or one below and
   two above: the key was never the smallest or the largest of the four and a
   child could learn that without learning any place value. Over all four columns
   the key's rank is flat by construction - 25% at each position. */
function gStandsEasy(){ return standsFor(0, 3); }

/* FORMAT 2 - concept check, read the other way round (pool 1, 1 step) */
function gWhichDigit(){
  const d = digits4(), n = numOf(d), p = ri(0,3);
  const q = mcNum('Which digit is in the ' + PLACES[p] + ' place of ' + n + '?', '', d[p],
    [d[(p+1)%4], d[(p+2)%4], d[(p+3)%4]], '',
    'Reading from the left, ' + n + ' is ' + placeList(d) +
    '. So the ' + PLACES[p] + ' digit is ' + d[p] + '.');
  return q;
}

/* FORMAT 3 - a second representation: expanded form (pool 2, 1 step)
   The hundreds place is always 0, so the zero-drop slip is always on offer. */
function gExpanded(){
  let th = 4, t = 7, o = 6, g = 0;
  do { th = ri(1,9); t = ri(1,9); o = ri(1,9); g++; }
  while (g < 200 && !(th !== o && t !== o && th !== t));
  const n = th*1000 + t*10 + o;
  const key = th*1000 + ' + ' + t*10 + ' + ' + o;
  const wrongs = [
    th + ' + ' + t + ' + ' + o,                          /* wrote the digits, not their values */
    o*1000 + ' + ' + t*10 + ' + ' + th,                  /* read the number from the right */
    th*100 + ' + ' + t*10 + ' + ' + o                    /* dropped the empty hundreds place */
  ];
  return mcText('Which of these shows ' + n + ' in <b>expanded form</b>?', '', key, wrongs,
    'Expanded form writes what each digit is worth and adds them up. ' + n + ' is ' +
    pl(th,'thousand') + ', 0 hundreds, ' + pl(t,'ten') + ' and ' + pl(o,'one') +
    ', so it is ' + th*1000 + ' + ' + t*10 +
    ' + ' + o + '. The hundreds place is empty, so nothing is written for it - but the 0 still holds ' +
    'the place, which is why ' + th*100 + ' + ' + t*10 + ' + ' + o + ' is a different number (' +
    (th*100 + t*10 + o) + ').');
}

/* FORMAT 4 - inverse: build the number from its parts (pool 2, 1 step)
   The zero-in-the-middle trap: 4 thousands, 0 hundreds, 7 tens, 6 ones = 4076. */
function gBuildNum(){
  let th = 4, h = 0, t = 7, o = 6, n = 4076, squashed = 476, cands = null, g = 0;
  do {
    th = ri(1,9);
    const zeroAt = pick([1,2]);
    h = zeroAt === 1 ? 0 : ri(1,9);
    t = zeroAt === 2 ? 0 : ri(1,9);
    o = ri(1,9);
    n = th*1000 + h*100 + t*10 + o;
    /* the number you get by writing the digits with the zero left out */
    squashed = Number(String(th) + (h ? String(h) : '') + (t ? String(t) : '') + String(o));
    const swapped  = th*1000 + t*100 + h*10 + o;      /* hundreds and tens exchanged */
    const reversed = o*1000 + t*100 + h*10 + th;      /* the four parts read back to front */
    const zeroEnd  = th*1000 + (h || t)*100 + o*10;   /* wrote the 0 at the END instead */
    const endsSwap = o*1000 + h*100 + t*10 + th;      /* first part and last part exchanged */
    cands = slipSet(n, [squashed, swapped, reversed, zeroEnd, endsSwap]);
    g++;
  } while (g < 200 && !(cands && optsOk(n, cands)));
  /* W5, SIXTH pass: the closing sentence used to name `squashed` whatever the
     draw did, and slipSet left it off the options row on 38.06% of draws. The
     zero's job is still the teaching point; the number the sentence blames is
     now one the child can point at. */
  const why = slipWhy(cands, [
    [squashed, 'Leaving the 0 out'],
    [th*1000 + t*100 + h*10 + o, 'Swapping the hundreds part and the tens part'],
    [th*1000 + (h || t)*100 + o*10, 'Writing the 0 at the end instead'],
    [o*1000 + t*100 + h*10 + th, 'Reading the four parts back to front'],
    [o*1000 + h*100 + t*10 + th, 'Swapping the first part and the last part']
  ]);
  return mcNum('Which number has ' + pl(th,'thousand') + ', ' + pl(h,'hundred') + ', ' + pl(t,'ten') +
    ' and ' + pl(o,'one') + '?', '', n, cands, '',
    pl(th,'thousand') + ' = ' + th*1000 + ', ' + pl(h,'hundred') + ' = ' + h*100 + ', ' +
    pl(t,'ten') + ' = ' + t*10 + ', ' + pl(o,'one') + ' = ' + o +
    '. Add them and you get ' + n + '. The 0 is doing a job: it holds the ' +
    'empty place open. ' + why[1] + ' gives ' + why[0] + '.');
}

/* FORMAT 5 - compare two digit values inside ONE number (pool 3, 2 steps).
   This slot used to be `gStandsHard`, the byte-identical twin of gStandsEasy
   (audit worst-ten #5). It now asks for two values and their difference. */
function gStandsCompare(){
  let d = digits4(), i = 0, j = 1, cands = null, g = 0;
  do {
    d = digits4();
    i = ri(0,2); j = ri(i+1, 3);
    const vi = d[i]*POW[i], vj = d[j]*POW[j];
    /* W3, third pass: the slips below the key were thin - the key was the
       smallest of the four on 10.02% of 20,000 draws - because two of them
       collapse onto each other whenever the two columns are adjacent. Comparing
       the digits and then reading the answer back in EITHER column is two more
       genuine slips below the key, and reading the second digit one column to its
       RIGHT is one more above.

       W4, EIGHTH pass. Two widths tied 2-2 on 17.61 / 17.23% of draws and the key
       was in the WIDER pair on 100.00% of them - a free halving of the row in the
       one branch the width ruler declines to read. The key is `vi - vj` with
       `vj < POW[i] <= vi`, so it is printed at `vi`'s width on every draw the item
       can legally make and no distractor can be authored to put it in the narrow
       half; the tie is therefore not drawn at all (`widthTie` in the redraw
       condition). Rejecting it alone cost the magnitude gate - rank 3 fell to
       11.8%, under the 12% floor, because the rejected rows are the ones with
       three narrow slips below the key - so `vi - 2*vj`, the second value taken off
       a second time, joins the family as a below-key slip printed at the KEY's
       width. Measured: tie 17.61% -> 0.00%, ranks 27.9 / 28.2 / 25.3 / 18.6, and
       the option board widens from 5,925 to 7,508 distinct rows. */
    cands = d[i] > d[j] ? slipSet(vi - vj, [
      d[i] - d[j],                /* compared the digits, not what they are worth */
      (d[i] - d[j])*POW[i],       /* ...then read that in the FIRST digit's column */
      (d[i] - d[j])*POW[j],       /* ...then read that in the SECOND digit's column */
      vi - d[j]*POW[j-1],         /* read the second digit one column to its left */
      vi - d[j]*POW[j+1],         /* read the second digit one column to its right */
      vi + d[j]*POW[j-1],         /* ...and added it on instead of taking it off */
      vj,                         /* gave the second value on its own */
      vi,                         /* gave the first value on its own */
      vi + vj,                    /* added the two values instead of comparing them */
      vi - 2*vj,                  /* took the second value off a second time */
      vi - d[j]                   /* took the digit off the value */
    ], { reject: c => !sameWidth(vi - vj, c) || widthTie(vi - vj, c) }) : null;
    g++;
  } while (g < 200 && !(d[i] > d[j] && cands && optsOk(d[i]*POW[i] - d[j]*POW[j], cands) &&
           sameWidth(d[i]*POW[i] - d[j]*POW[j], cands) &&
           !widthTie(d[i]*POW[i] - d[j]*POW[j], cands)));
  const n = numOf(d), vi = d[i]*POW[i], vj = d[j]*POW[j], ans = vi - vj;
  return mcNum('In ' + n + ', how much more does the digit ' + d[i] + ' stand for than the digit ' +
    d[j] + '?', '', ans, cands, '',
    'The ' + d[i] + ' is in the ' + PLACES[i] + ' place, so it stands for ' + vi + '. The ' + d[j] +
    ' is in the ' + PLACES[j] + ' place, so it stands for ' + vj + '. ' + vi + ' − ' + vj + ' = ' + ans +
    '. Taking ' + d[j] + ' away from ' + d[i] + ' compares the digits, not what they are worth.');
}

/* FORMAT 6 - error spotting, DIAGNOSE the mistake (pool 3, 2 steps).
   Every claim the item prints is produced by exactly one named misconception,
   and the harness re-derives which one from the rendered stem. */
/* Option texts are kept within a few characters of each other on purpose. The
   second refutation's KILL was gLPerimDiff, whose key was the only prose option
   and the only one over four characters: a child settled it in a second with no
   geometry. Length is the tell here, so the bank equalises it - measured spread
   across these five strings is 39-40 characters, and no option in this file
   exceeds the 48-character ceiling gen-sanity now enforces. */
const STANDS_SLIPS = {
  digit: ' wrote the digit, not what it is worth.',
  right: ' used the column one place to the right.',
  left:  ' used the column one place to the left.'
};
/* KILL 1 (Sweep p3numbers Refutation, 2026-09-15). The two "filler" options were
   not fillers: each is a READING of the number, with arithmetic of its own, and
   on 353 / 200,000 draws one of them reproduced the printed claim exactly - "In
   6293, the digit 2 stands for 20" is explained equally by "one column to the
   right" (2 tens) and by "added up all four digits" (6+2+9+3). Two true answers.
   Both the generator and the harness walked only the three NAMED slips, so
   neither could see it. Every reading now carries its own claim arithmetic, and
   the draw is redrawn until EXACTLY ONE of the five reproduces the claim. */
const STANDS_FILLER_SLIPS = {
  sum:  ' added up all four digits of the number.',
  next: ' wrote the digit that comes next in it.'
};
const STANDS_FILLERS = Object.keys(STANDS_FILLER_SLIPS).map(k => STANDS_FILLER_SLIPS[k]);
const STANDS_READINGS = Object.keys(STANDS_SLIPS).concat(Object.keys(STANDS_FILLER_SLIPS));
/* The claim a reading would print, or null where it cannot apply. `p` is held to
   the thousands or hundreds column so that "one column to the right" is never the
   ones column, where it would mean exactly the same thing as "wrote the digit
   itself" and the item would have two defensible answers. */
function standsClaim(k, dig, p, d){
  if (k === 'digit') return dig;
  if (k === 'right') return p < 3 ? dig * POW[p+1] : null;
  if (k === 'left')  return p > 0 ? dig * POW[p-1] : null;
  if (k === 'sum')   return digitSum(numOf(d));
  if (k === 'next')  return p < 3 ? d[p+1] : null;
  return null;
}
function gStandsError(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  const named = Object.keys(STANDS_SLIPS);
  let d = digits4(), p = 0, dig = d[0], chosenKey = 'digit', claim = dig, g = 0;
  do {
    d = digits4(); p = ri(0,1); dig = d[p];
    const val = dig * POW[p];
    const usable = named.filter(k => { const c = standsClaim(k, dig, p, d); return c !== null && c !== val && ok(c); });
    chosenKey = usable.length ? pick(usable) : null;
    claim = chosenKey ? standsClaim(chosenKey, dig, p, d) : null;
    g++;
    /* the claim must map to exactly ONE of the five readings - no option offered
       on this draw may be defensible under any other reading */
  } while (g < 200 && !(chosenKey !== null &&
           STANDS_READINGS.filter(k => standsClaim(k, dig, p, d) === claim).length === 1));
  const n = numOf(d), val = dig * POW[p];
  const wrongs = named.filter(k => k !== chosenKey && standsClaim(k, dig, p, d) !== claim)
    .map(k => pron + STANDS_SLIPS[k])
    .concat(STANDS_FILLERS.map(f => pron + f));
  return mcText('In ' + n + ', ' + who + ' says the digit ' + dig + ' stands for ' + claim +
    '. <b>What did ' + pron.toLowerCase() + ' do wrong?</b>', '',
    pron + STANDS_SLIPS[chosenKey], shuffle(wrongs),
    'Read the places from the left: ' + placeList(d) + '. The ' + dig + ' sits in the ' + PLACES[p] +
    ' place, so it stands for ' + dig + ' × ' + POW[p] +
    ' = ' + val + ', not ' + claim + '. ' + pron + STANDS_SLIPS[chosenKey] +
    ' Point at the column the digit is sitting in and say its name out loud before working out the value.');
}

/* FORMAT 7 - error spotting, CORRECT the mistake, then step on (pool 3, 2 steps).
   The dropped-zero slip, which is the single commonest P3 place-value error.

   W4 (Sweep p3numbers Refutation, 2026-09-15): this slot used to ask only "what
   number should he have written?", which is gBuildNum's pool-2 computation with a
   wrong number printed beside it - 5,000 / 5,000 draws were answerable from the
   four part-words alone, ignoring the printed number entirely. It now asks for a
   SECOND described number measured against the rebuilt one, so the child has to
   rebuild the number (holding the empty place open) AND then count on or back
   from it. The dropped-zero trap is still the premise, and "stepped from the
   squashed number" is now a named distractor instead of the answer.

   Second pass, 2026-09-15. Three things came back on this rebuild and all three
   are fixed here by CONSTRUCTION rather than by rejection, which is what the
   wound was actually about:
   W3a - "1000 less" was declared in the step list and drawn 0 times in 20,000,
     because its named distractor (squashed - 1000) is negative for every draw
     and optsOk quietly rejected the whole combination. The thousands digit is
     now drawn from the range that branch needs, and the family carries a slip
     that survives it.
   W3b - 2.28% of keys were 3-digit numbers, in an item whose whole lesson is
     that the zero stops the number shrinking. The draw range now guarantees a
     4-digit key and tools/gen-sanity.mjs fails a 3-digit one.
   W4  - the stem was the longest in the topic at 30.6 words, ahead of both real
     word problems, so part of the second step was reading comprehension. The
     second child is gone; the step is asked directly of "the correct number",
     which is the number the child has just had to rebuild. 21 words, both steps
     intact. */
function gZeroFix(){
  const k1 = pick(KIDS), who = k1[0], pron = k1[1];
  let th = 6, t = 4, o = 9, step = 100, sg = 1, cands = null, g = 0;
  do {
    step = pick([10, 100, 1000]); sg = pick([1, -1]);
    /* the range the branch needs, BEFORE the draw: "1000 less" wants a number
       with at least 2 thousands to stay 4-digit, "1000 more" at most 8. */
    th = ri(sg === -1 && step >= 100 ? 2 : 1, sg === 1 && step === 1000 ? 8 : 9);
    t = ri(1,9); o = ri(1,9);
    const n0 = th*1000 + t*10 + o, sq0 = th*100 + t*10 + o, a0 = n0 + sg*step;
    cands = (t !== o && a0 >= 1000 && a0 <= MAXN) ? slipSet(a0, [
      sq0 + sg*step,        /* stepped on from the squashed number, zero still missing */
      n0,                   /* stopped after rebuilding, never took the step */
      n0 - sg*step,         /* stepped the wrong way */
      n0 + sg*2*step,       /* took the step twice */
      n0 + sg*(step/10),    /* stepped in the column to the RIGHT of the one named */
      n0 + sg*step*10       /* stepped in the column to the LEFT of the one named */
    ], { reject: c => widthTie(a0, c) }) : null;
    /* W4, EIGHTH pass: the 2-2 width tie is the branch the width ruler declines on,
       and the key was in the wider pair on 100% of this bank's 1.08 / 0.91% of
       them. It is redrawn below rather than declared - see widthTie. */
    g++;
  } while (g < 400 && !(cands && optsOk(th*1000 + t*10 + o + sg*step, cands) &&
           !widthTie(th*1000 + t*10 + o + sg*step, cands)));
  const n = th*1000 + t*10 + o, squashed = th*100 + t*10 + o, ans = n + sg*step;
  const dir = sg === 1 ? 'more' : 'less';
  return mcNum(who + ' writes ' + pl(th,'thousand') + ', 0 hundreds, ' + pl(t,'ten') + ' and ' +
    pl(o,'one') + ' as ' + squashed + '. <b>What is ' + step + ' ' + dir +
    ' than the correct number?</b>', '', ans, cands, '',
    pron + ' left the empty hundreds place out altogether, so every digit slid one place to the right ' +
    'and the number shrank from ' + n + ' to ' + squashed + '. The 0 has to be written: ' + th*1000 +
    ' + 0 + ' + t*10 + ' + ' + o + ' = ' + n + '. Then take the step from the RIGHT number: ' + n + ' ' +
    (sg === 1 ? '+' : '−') + ' ' + step + ' = ' + ans + '.');
}


/* =========================================================================
   PRINCIPLE 2 - COMPARING, ORDERING AND NUMBER PATTERNS
   ========================================================================= */

/* FORMAT 1 - direct compare, greatest (pool 1, 1 step).
   At least two of the four share a thousands digit, so the answer is never a
   one-glance read of the leading digit. */
function gGreatest(){
  let set = [], g = 0;
  do {
    const th = ri(1,9);
    set = [th*1000 + ri(0,999), th*1000 + ri(0,999)];
    while (set.length < 4){ const n = ri(1000, MAXN); if (!set.includes(n)) set.push(n); }
    g++;
  } while (g < 200 && !allDistinct(set));
  const best = Math.max.apply(null, set);
  return mcSet('Which number is the <b>greatest</b>?', '', best, set.filter(x => x !== best),
    'Compare the thousands digit first, then the hundreds, then the tens, then the ones, and stop at ' +
    'the first place where the digits are different. ' + best + ' is the greatest.');
}
/* FORMAT 2 - is this comparison true? (pool 1, 1 step). The SECOND `compare`
   format in pool 1, and like gPatternOdd in pool 3 it is here because of a
   measurement, not a taste call.

   W2 (Sweep p3numbers Refutation, second pass, 2026-09-15): buildCarousel
   round-robins SKILLS inside a pool, so a skill holding one generator takes the
   whole of its quarter - that was the W3 argument, and W3 was fixed in pool 3 and
   left standing in pool 1, where the mastery climb sends a struggling child. At
   45% simulated accuracy a child sits in pool 1 for 79.5% of a 30-item session
   and met gGreatest 5.25 times, worst 8, with ONE masked shape. Worse than the
   3.64 that justified writing gPatternOdd, and on the child who can least afford
   it.

   The four options are comparison STATEMENTS, not numbers, so the two ways a
   child could win without comparing are both closed by construction: exactly two
   statements print ">" and two print "<", so the sign is never the odd one out;
   and both the true statement and one false one live on each side of the
   number, so "the biggest number wins" settles nothing. */
function gCompareTrue(){
  let n = 4567, others = [3210, 4102, 4890, 4500], keyIdx = 0, g = 0;
  do {
    const th = ri(1,9);
    n = th*1000 + ri(120, 879);
    /* three companions on one side of n and one on the other; the key is one of
       the three, so the printed signs always come out 2 and 2 */
    const keyBelow = Math.random() < 0.5;
    const many = [], one = [];
    let guard = 0;
    while (many.length < 3 && guard++ < 200){
      const v = keyBelow ? th*1000 + ri(0, (n % 1000) - 1) : th*1000 + ri((n % 1000) + 1, 999);
      if (v !== n && !many.includes(v)) many.push(v);
    }
    guard = 0;
    while (one.length < 1 && guard++ < 200){
      const v = keyBelow ? th*1000 + ri((n % 1000) + 1, 999) : th*1000 + ri(0, (n % 1000) - 1);
      if (v !== n && !many.includes(v)) one.push(v);
    }
    others = many.concat(one);
    keyIdx = ri(0, 2);
    g++;
  } while (g < 200 && !(others.length === 4 && allDistinct(others.concat([n])) &&
           others.every(v => ok(v))));
  const key = n + (others[keyIdx] < n ? ' > ' : ' < ') + others[keyIdx];
  /* a false statement is the same pair with the sign the digits do not support */
  const wrongs = others.filter((_, i) => i !== keyIdx)
    .map(v => n + (v < n ? ' < ' : ' > ') + v);
  const k = others[keyIdx], hi = Math.max(n, k), lo = Math.min(n, k);
  const col = String(hi).split('').findIndex((c, i) => c !== String(lo)[i]);
  return mcText('Which of these is <b>true</b>?', '', key, shuffle(wrongs),
    'Compare left to right, one place at a time, and stop at the first place where the digits differ. ' +
    hi + ' and ' + lo + ' first differ in the ' + PLACES[col] + ' place: ' + String(hi)[col] +
    ' against ' + String(lo)[col] + ', so ' + hi + ' is the bigger number and ' + key +
    ' is the true one. The other three say the opposite of what the digits show.');
}

/* FORMAT 3 - direct compare, smallest, every number sharing a thousands digit
   so the child must read past the first digit (pool 2, 1 step) */
function gSmallest(){
  const th = ri(1,9)*1000; const set = [];
  while (set.length < 4){ const n = th + ri(0, 999); if (!set.includes(n)) set.push(n); }
  const worst = Math.min.apply(null, set);
  return mcSet('Which number is the <b>smallest</b>?', '', worst, set.filter(x => x !== worst),
    'All four numbers start with the same thousands digit, so that place cannot settle it. Compare the ' +
    'hundreds next: ' + worst + ' is the smallest.');
}

/* FORMAT 4 - between two numbers (pool 2, 2 steps: check both ends)

   KILL (Sweep p3numbers Refutation, THIRD pass, 2026-09-15). This bank was
   answered by "pick the third smallest of the four options" on 20,000 / 20,000
   draws - 100.00%, no reading of either bound, no comparison, no arithmetic -
   and the magnitude gate printed it as EXEMPT, "there the ordering IS the
   question". It was not: the question lives in the two bounds the stem prints on
   100% of draws, and the key's rank was a by-product of how the distractors were
   drawn. All three sat BELOW or ABOVE by construction - `far = lo - ri(400,900)`
   is always further below `lo` than `below = lo - ri(5,300)`, so the sorted order
   was always far < below < key < above. The generator was byte-identical back to
   b41111e; what was new at c099275 was the gate line certifying the class as
   impossible here.

   W1 (Sweep p3numbers Refutation, FOURTH pass, 2026-09-15), and the PM's ruling
   on it. The v4 fix drew `r = ri(0, 3)` wrong answers below the range, which
   made the key's rank flat - and put all three wrong answers on ONE side of the
   range on 49.91% of draws, where a child who checks a single bound is finished.
   The explanation printed "they are not all on the same side of it" on 100% of
   draws, which was FALSE on exactly those 49.91%. The flat rank and the
   two-bound demand are incompatible here by construction: the key is inside the
   range and every distractor outside it, so the key's rank IS the number of
   distractors below it, and you cannot populate all four ranks and also
   guarantee one wrong answer on each side.

   THE TWO-BOUND DEMAND WINS. `r = ri(1, 2)` - one or two of the three wrong
   answers below the range, so there is always at least one below AND at least
   one above, and the near miss on each side is always the one offered. The item
   genuinely needs both ends: checking "is it below hi?" alone leaves a wrong
   answer standing, and so does checking "is it above lo?" alone.

   The price is stated rather than hidden. The key's rank among the four printed
   numbers is then 2nd or 3rd by construction - measured 0.00 / 49.9 / 50.1 /
   0.00 over 20,000 draws - so "pick the second or third smallest" is worth ~50%
   against 25% chance. That is the DECLARED STRUCTURAL FLOOR of any four-option
   between-item with a straddling distractor set, not a defect of this one, and
   it is bought with the elimination it removes: neither single bound settles the
   item on any draw. tools/gen-sanity.mjs exempts p3numbers.gBetween from the
   flat-rank ceiling and floor BY NAME with that measurement written down, and
   re-checks the premise of the exemption on every draw - if the key is ever the
   smallest or the largest of the four, the straddle has broken and the exemption
   is void. "Pick the smallest" and "pick the largest" stay gated, and both
   measure 0.00%.

   `lo` also starts at 1900 rather than 1200 so that the furthest-below distractor
   (lo - 900) is still a 4-digit number. It used to print a 3-digit option on
   6.37% of draws - recorded by the third pass as a note, closed here because it
   costs one number. */
function gBetween(){
  let lo = 3450, hi = 3520, key = 3480, cands = [3400, 3600, 2900], g = 0;
  do {
    lo = ri(1900, 8300);                       /* hi + 900 <= 9999, lo - 900 >= 1000 */
    hi = lo + ri(40, 700);
    key = lo + ri(10, hi - lo - 10);
    /* near miss first on each side: the option a child who checks only ONE end
       will take. The rest are further out, so the four printed numbers still
       spread across the line rather than bunching on one side of the range. */
    const belows = [lo - ri(5, 150), lo - ri(160, 400), lo - ri(410, 900)];
    const aboves = [hi + ri(5, 150), hi + ri(160, 400), hi + ri(410, 900)];
    const r = ri(1, 2);                        /* how many distractors land BELOW the range:
                                                  never 0 and never 3, so the four printed
                                                  numbers STRADDLE the range on every draw */
    cands = belows.slice(0, r).concat(aboves.slice(0, 3 - r));
    g++;
  } while (g < 200 && !(hi - lo > 30 && key > lo && key < hi &&
           optsOk(key, cands) &&
           cands.every(v => v < lo || v > hi)));
  return mcSet('Which number is <b>between</b> ' + lo + ' and ' + hi + '?', '', key, cands,
    lo + ' is smaller than ' + key + ' and ' + key + ' is smaller than ' + hi + ', so ' + key +
    ' sits between them. Put the two end numbers on a line in your head and check the new number ' +
    'against BOTH of them - one check is never enough. Every wrong answer sits outside the range: ' +
    'at least one of them is below ' + lo + ' and at least one is above ' + hi +
    ', and on each side the nearest one misses by only a little.');
}

/* FORMAT 5 - order four numbers (pool 3, 2 steps) */
function gOrder(){
  const asc = a => a.every((v, i) => i === 0 || v > a[i-1]);
  const join = a => a.join(', ');
  let set = [], key = '', byOnes = [], byHundreds = [], rev = [], g = 0;
  do {
    const th = ri(1,9);
    set = [];
    while (set.length < 4){ const n = th*1000 + ri(0,999); if (!set.includes(n)) set.push(n); }
    key = join(set.slice().sort((x,y) => x - y));
    rev = set.slice().sort((x,y) => y - x);
    byOnes = set.slice().sort((x,y) => (x % 10) - (y % 10));
    byHundreds = set.slice().sort((x,y) => (x % 100) - (y % 100));
    g++;
  } while (g < 200 && !(allDistinct(set.map(n => n % 10)) && allDistinct(set.map(n => n % 100)) &&
           !asc(byOnes) && !asc(byHundreds) &&
           allDistinct([key, join(rev), join(byOnes), join(byHundreds)])));
  return mcSet('Which list is in order from the <b>smallest to the greatest</b>?', '', key,
    [join(rev), join(byOnes), join(byHundreds)],
    'All four numbers have the same thousands digit, so compare the hundreds, then the tens, then the ' +
    'ones. In order that is ' + key + '. Sorting by the LAST digit is the usual trap - it puts the ' +
    'numbers in an order that has nothing to do with their size.');
}

/* FORMAT 6 - error spotting on a comparison, DIAGNOSE (pool 3, 2 steps).
   Two flavours, and every filler option is checked against this draw so no
   second explanation is ever defensible. */
/* Same length discipline as STANDS_SLIPS: 39-40 characters across all four, so
   every rendered option lands inside the 48-character ceiling. */
const CMP_FIRST  = ' only compared the first digit of each.';
const CMP_RIGHT  = ' compared from the right, not the left.';
const CMP_FILL1  = ' counted the odd digits in each instead.';
const CMP_FILL2  = ' added the digits up and compared those.';
function oddCount(n){ return digitsOf(n).filter(d => d % 2 === 1).length; }
function gCompareError(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  const wantDigits = Math.random() < 0.5;
  let a = 968, b = 1024, g = 0;
  do {
    if (wantDigits){
      a = ri(100, 999);
      b = ri(1000, MAXN);
      g++;
      if (Math.floor(a/100) <= Math.floor(b/1000)) continue;          /* the first-digit slip must fire */
      if (a % 10 >= b % 10) continue;                                 /* ...and the ones-digit slip must NOT */
    } else {
      const th = ri(1,9);
      a = th*1000 + ri(0,999);
      b = th*1000 + ri(0,999);
      g++;
      if (!(b > a)) continue;
      if (a % 10 <= b % 10) continue;                                 /* the right-to-left slip must fire */
      if (Math.floor(a/100) % 10 === Math.floor(b/100) % 10) continue;/* hundreds must settle it */
    }
    if (b > a && oddCount(a) <= oddCount(b) && digitSum(a) <= digitSum(b)) break;
  } while (g < 400);
  if (!(b > a)) { a = 968; b = 1024; }
  const key = pron + (wantDigits ? CMP_FIRST : CMP_RIGHT);
  const wrongs = [pron + (wantDigits ? CMP_RIGHT : CMP_FIRST), pron + CMP_FILL1, pron + CMP_FILL2];
  const why = wantDigits
    ? (b + ' has four digits and ' + a + ' has only three, so ' + b + ' is the bigger number however ' +
       'the first digits look. A 4-digit number is always bigger than a 3-digit one.')
    : ('Both numbers start with ' + pl(Math.floor(a/1000), 'thousand') + ', so compare the HUNDREDS next: ' +
       Math.floor(a/100)%10 + ' against ' + Math.floor(b/100)%10 + '. That settles it - ' + b +
       ' is the bigger number. The ones digit never gets a vote until everything to its left is equal.');
  return mcText(who + ' says ' + a + ' is greater than ' + b + '. <b>What did ' + pron.toLowerCase() +
    ' do wrong?</b>', '', key, shuffle(wrongs),
    why + ' Compare left to right, one place at a time, and stop at the first place where the digits differ.');
}

/* FORMAT 7 - concept check on a pattern: name the jump (pool 1, 1 step).

   KILL, SEVENTH pass (2026-09-16), and it had been here since v1. The family was
   `[1, 10, 100, 1000, 2*step]` and the key was always a POWER OF TEN. The four
   powers of ten have pairwise distinct printed widths, so the only family member
   that could ever share the key's width was `2*step` - which is exactly twice the
   key, and therefore always ABOVE it. Whenever it shipped, the four options held
   one pair at the same width and the key was the smaller of that pair; whenever
   it did not, all four widths were distinct and the rule declined. So

       "count the characters in each option, take the commonest length,
        pick the smaller number"

   answered pool 1's busiest generator - 4.94 items per 30-item session at 0.45
   accuracy - on 69.63% / 69.48% of 20,000 draws at each of two seeds, with no
   arithmetic, no subtraction and without reading the run at all, and it is never
   wrong when it fires. MAGNITUDE RANK ranks the key against all four (16.6 /
   31.4 / 35.2 / 16.9, pass); LENGTH RANK ranks it against the extremes
   (uSHORTEST 0.0%, PICK-SHORT 8.4%, pass). Nothing ranked the key INSIDE its own
   width class, which is the cell the defect lived in. The WIDTH-CLASS RANK
   column in tools/gen-sanity.mjs is that ruler, and it now gates this file.

   THE v8 FIX MOVED THE TELL INSTEAD OF REMOVING IT - KILL, EIGHTH PASS
   (2026-09-16). v8 took the KEY off the power-of-ten ladder on two draws in three
   and left the ladder in the DISTRACTOR family on every draw. That made the key
   the only number on the row that is not 1-followed-by-zeros, and the smallest of
   those whenever there was more than one:

       "cross out 1, 10, 100 and 1000; the answer is the smallest of what is left"

   answered the bank on 67.07% / 66.44% of 20,000 draws at two seeds, was NEVER
   wrong when it fired (0 exceptions in 40,000), needed no arithmetic and never
   read the four printed terms at all. It is the seventh pass's kill on a new
   axis - SHAPE instead of WIDTH - and the width ruler was built not to see it.

   THE LADDER IS RETIRED AS A SLIP FAMILY (PM ruling, 2026-09-16). A fixed set of
   round numbers beside a non-round key IS the answer, however the key is drawn
   inside it. The in-between family is now built out of the item's OWN arithmetic,
   every member a misreading of THIS run, and it carries at most ONE round number:

     2*step        two jumps counted as one - the child measured t0 to t2;
     3*step        the whole run measured, first term to last;
     step + 10     the jump found correctly and written a ten out;
     step - 10     the same slip the other way;
     hiPart        the jump read in its LEADING column only - the tens that
                   changed, and not the ones (15 -> 10, 150 -> 100);
     step - hiPart the mirror - the ones counted and the tens left behind
                   (15 -> 5, 150 -> 50);
     step x/ 10    the jump read one whole column out (15 -> 150, 150 -> 15).

   hiPart is the ONLY member that can be a power of ten (10 under 15, 100 under
   150), it is at the key's width and BELOW it - which is the same-width slip the
   seventh pass needed and the ladder could not supply - and on the 25 and 250
   branches even that one is not round. So on every in-between draw the row holds
   at most one of 1 / 10 / 100 / 1000, the key is never the odd non-round number,
   and "cross out the round ones and take the smallest" degenerates into "take the
   smallest of the four", which the MAGNITUDE RANK gate has capped since v2.

   SCOPE. Steps are 15 / 25 / 150 / 250 - in scope on this file's own precedent
   (100 / 150 / 200 / 250 / 500 in gPatternMissing, 15 / 25 / 35 in gPatternOdd;
   MOE P3 1.5 does not restrict a sequence's jump to a multiple of ten). 1500 and
   2500 are DROPPED: they are three to five times the largest jump anywhere else
   in the topic, three of them eat 4500-7500 of the 1..9999 range, and
   `start = ri(1000, MAXN - 3*step)` pinned every step-2500 item's first term into
   [1000, 2499] on 100% of its draws.

   One draw in three is still a counting anchor (10 / 100 / 1000, MOE P3 1.1). The
   row there is four powers of ten because the JUMP ITSELF is a power of ten, so
   the ladder is the arithmetic and not a slip family: every option is
   1-followed-by-zeros, no shape value singles the key or the three distractors
   out, every width is distinct so the class declines, and the only rules left
   ("the smallest that is not 1", "the largest") are each worth exactly one draw
   in three. The SHAPE RULER in tools/gen-sanity.mjs scores that column now.

   W7, EIGHTH pass - THE OPTION BOARD IS SMALL ENOUGH TO LEARN, AND THAT IS
   DECLARED, NOT FIXED. Four in-between steps and one anchor cannot make many
   distinct option rows: 191 of them over 20,000 draws at each of two seeds (121 at
   v8), and the row alone pins the key on every one, because each row comes from
   exactly one step. That is the price of a closed step set inside MOE P3 1.5's
   1..9999, and the eighth family member (`2*step - 10`, two jumps taken at once and
   then written a ten out) is in partly to widen the board from 116 to 191.
   DECLARED with its exposure: 1.37 items per 30-item session at 0.80 accuracy
   (worst 6) and 4.90 at 0.45 (worst 7). */
function gPatternConcept(){
  const W = v => String(v).length;
  /* the leading place value of the jump: 15 -> 10, 250 -> 200. The jump read in
     its biggest column only, which is the same-width slip BELOW the key that the
     seventh pass asked for and the place-value ladder could not author. */
  const hiPart = s => { const p = Math.pow(10, W(s) - 1); return p * Math.floor(s / p); };
  const famOf = s => {
    const seen = new Set([s]), f = [];
    for (const v of [2*s, 3*s, s + 10, s - 10, hiPart(s), s - hiPart(s),
                     s >= 100 ? s/10 : s*10, 2*s - 10]){
      if (!ok(v) || seen.has(v)) continue;
      seen.add(v); f.push(v);
    }
    return f;
  };
  /* where the key sits INSIDE its own printed-width class - the seventh pass's
     KILL, measured the way tools/gen-sanity.mjs measures it */
  const posOf = (s, t) => {
    const same = t.filter(v => W(v) === W(s));
    if (!same.length) return 'none';
    const below = same.filter(v => v < s).length;
    return below && below < same.length ? 'mid' : below ? 'max' : 'min';
  };
  /* W4, EIGHTH pass: a 2-2 width tie is the one branch the width ruler declines
     to read, and where it declines the tell is a CERTAINTY - on gStandsCompare the
     key was in the wider pair on 100.00% of its 17.6% tie draws. The two members
     below the key here are both narrower than it (the ones left behind, and the
     jump read a column out), so every tie this bank could draw would put the key
     in the wider pair. It does not draw one: a row whose width histogram has no
     strict mode never enters the bank, so the branch is empty rather than
     certain. Measured 13.16% / 12.62% of draws at v9-draft, now 0.00%. */

  /* THE COUNTING ANCHOR, one draw in three: the ladder alone, four widths, no
     class to rank the key inside. The step fixes the rank (10 -> 1, 100 -> 2,
     1000 -> 3), which is why the anchor cannot supply rank 0 and the in-between
     branch below draws its own rank uniformly. */
  if (ri(0, 2) === 0){
    const step = pick([10, 100, 1000]);
    const wrong = [1, 10, 100, 1000].filter(v => v !== step);
    return patternJump(step, shuffle(wrong));
  }
  /* every 3-subset of every in-between step's family, labelled by the key's rank
     among the four printed numbers AND by its position in its own width class.
     Rank is drawn FIRST so the magnitude gate stays flat, then the width-class
     position uniformly from what that rank allows, so neither ruler can run away
     from the other. */
  const bank = [];
  for (const s of [15, 25, 150, 250]){
    const fam = famOf(s), kw = W(s);
    for (let i = 0; i < fam.length; i++)
      for (let j = i + 1; j < fam.length; j++)
        for (let k = j + 1; k < fam.length; k++){
          const t = [fam[i], fam[j], fam[k]];
          if (Math.max.apply(null, t.map(W)) * 1.4 < kw) continue;   /* RULE C */
          if (widthTie(s, t)) continue;                              /* W4, no tie branch */
          bank.push({ s: s, t: t, r: t.filter(v => v < s).length, p: posOf(s, t) });
        }
  }
  const r = ri(0, 3);
  let live = bank.filter(e => e.r === r);
  if (!live.length) live = bank;
  const p = pick([...new Set(live.map(e => e.p))]);
  /* NINTH pass, KILL - the column rule, read LAST inside the cell the rank and
     the width class have already fixed, so neither of those gates moves. The four
     printed numbers here are the jump values themselves rather than a slip cloud,
     so the rows this bank can build are fixed and the only choice is which of
     them to ship. See slipSet for what the rule is.

     A THRESHOLD, NOT AN ARGMIN. Taking the FLATTEST row in the cell cut the option
     board from 191 distinct rows to 18 - trading a 43.7% route for a board a child
     could memorise, which is the worse deal and is what residual 23 is about. The
     bar is instead "the column rule does not leave the key standing alone", which
     every cell can meet often, and the pick stays uniform over everything that
     clears it: 139 distinct rows, the column route 0.00% outright and 30.4% to a
     guesser against v9's 19.8% / 43.7%, and the board worth 78.17% either way. */
  const cell = live.filter(e => e.p === p);
  const cv = e => colValue([colDigits(e.s)].concat(e.t.map(colDigits)));
  let fit = cell.filter(e => cv(e) <= 0.5 + 1e-9);
  if (!fit.length){
    const flat = Math.min.apply(null, cell.map(cv));
    fit = cell.filter(e => cv(e) === flat);
  }
  const e0 = pick(fit);
  return patternJump(e0.s, shuffle(e0.t.slice()));
}
function patternJump(step, wrong){
  const start = ri(1000, MAXN - 3*step);
  const terms = [start, start+step, start+2*step, start+3*step];
  return mcNum('In this number pattern, what is the <b>jump</b> from one number to the next? <b>' +
    terms.join(', ') + '</b>', '', step, wrong, '',
    terms[1] + ' − ' + terms[0] + ' = ' + step + ', and the same jump works every time: ' +
    terms[2] + ' − ' + terms[1] + ' = ' + step + '. So the pattern counts on in ' +
    (STEP_WORD[step] || 'jumps of ' + step) +
    '. Write the difference above each gap and check that they all match.');
}

/* FORMAT 8 - counting on or back in tens, hundreds, thousands (pool 2, 1 step).
   MOE P3 1.1. The step is NAMED in the stem, so this is the pattern anchor.

   W5, EIGHTH pass (2026-09-16) - THE TWO DIRECTIONS COMPOSE AND RESIDUAL 15 DID
   NOT SAY SO. Residual 15 lists this bank TWICE, at 31.75 / 31.73% ("the largest
   option below the smallest number in the stem") and 32.24 / 31.90% ("the smallest
   option above the biggest"), as separate rows. They are not independent: the run
   is printed, so on an UP run the key is above every printed term and one of them
   fires, and on a DOWN run the key is below every printed term and the other does.
   A child running BOTH is worth 53.56 / 53.10% as a guesser value (guessing between
   the two options the pair names when both fire; the refutation's own composed
   figure, scored the stricter way, is 43.77 / 42.52%), against a best single of
   32.24%. DECLARED, not fixed: the key of a counting item is on the same side of a
   printed run as the direction the stem names, and that is the arithmetic. */
const STEP_WORD = { 10: 'tens', 100: 'hundreds', 1000: 'thousands' };
function gPattern4(){
  const step = pick([10, 100, 1000]);
  const up = Math.random() < 0.5;
  const s = up ? step : -step;
  /* the draw range is set so that EVERY named distractor also lands inside
     1..9999 - a distractor filtered out for being out of scope would let
     finishNum pad, and the padding branch is what the authored contract bans. */
  const start = up ? ri(1000, MAXN - 7*step) : ri(1000 + 7*step, MAXN);
  const terms = [0,1,2,3,4].map(k => start + k*s);
  const ans = start + 5*s;
  /* W1 (Sweep p3numbers Refutation, THIRD pass, 2026-09-15). v3 put `ans +-
     step/10` in this family to populate both sides of the key. On the step === 10
     branch step/10 is 1, so a distractor sat EXACTLY ONE away from a 4-digit key
     on 31.75% of draws - a proofreading trap on a phone, not a question about
     counting in tens. Worse, it handed the item away: `ans +- 1` and
     `terms[4] + s/10` are the only options that break the trailing digits the
     printed run holds constant, and everything else on offer was already printed,
     so "keep what matches the run's last digits, drop what is already on the
     page" left exactly one survivor - always the key - on 50.01% of draws, with
     no arithmetic at all. (0.00% at cc2d326; this was a v3 regression and nothing
     measured it either way.)

     Every slip is now a whole number of JUMPS or a jump taken in the wrong
     COLUMN, and none is closer to the key than the smallest place value this item
     tests - 10 for a tens run, 10 for a hundreds run (the next-smaller-unit slip),
     100 for a thousands run. That kills the near-miss and the trailing-digit
     shortcut in the same stroke: with every option sitting on the run's own grid,
     the trailing digits no longer separate the key from anything.

     The offsets are symmetric about the key, so the rank stays flat whichever way
     the pattern runs. */
  const fam = [
    ans + s,              /* took two jumps instead of one */
    ans - s,              /* never took the last jump - the number already printed */
    ans + 2*s,            /* took three jumps */
    ans - 2*s,            /* jumped the wrong way from the last number */
    ans + 10*s,           /* made the jump in the column to the LEFT */
    ans - 10*s            /* the same slip, the other way */
  ];
  if (step >= 100){       /* the next-smaller unit is still a whole place value */
    fam.push(terms[4] + s/10,   /* counted on from the last number in the smaller unit */
             ans + step/10,     /* took the jump, then one more in the smaller column */
             ans - step/10);    /* took the jump, then one back in the smaller column */
  }
  /* NINTH pass, KILL - the jump miscounted AND made in the wrong column, both at
     once. One-column slips alone hand the row to "cross out each column's
     minority digit"; compounded, they share a digit where they agree and the
     crossing-out stops. See slipSet and gMoreLess. */
  for (const x of [s, -s, 2*s, -2*s])
    for (const y of (step >= 100 ? [10*s, -10*s, s/10, -s/10] : [10*s, -10*s]))
      fam.push(ans + x + y);
  /* residual 15's two directions - "the smallest option above the biggest number
     on the page" and its mirror - are held where the eighth pass measured them by
     keeping a slip in the window between the last printed term and the key. On
     the step === 10 branch the window is `step` wide and minGap is 10, so nothing
     can be authored into it at all; that branch is the residual's floor and it is
     declared rather than closed. */
  const cands = slipSet(ans, fam, { minGap: Math.max(10, step/10),
    prefer: c => c.some(v => (v - terms[4]) * s > 0 && (ans - v) * s > 0) });
  return mcNum('Count ' + (up ? 'on' : 'back') + ' in <b>' + STEP_WORD[step] +
    '</b>. What number comes next? <b>' + terms.join(', ') + ', ?</b>', '', ans, cands, '',
    'Each jump ' + (up ? 'adds' : 'takes away') + ' ' + step + ': ' + terms[3] + ' ' + (up ? '+' : '−') +
    ' ' + step + ' = ' + terms[4] + '. One more jump gives ' + terms[4] + ' ' + (up ? '+' : '−') + ' ' +
    step + ' = ' + ans + '. Counting in ' + STEP_WORD[step] + ' only changes the ' + STEP_WORD[step] +
    ' digit — until it rolls over and takes the digit on its left with it.');
}

/* FORMAT 9 - one step on from a given number (pool 2, 1 step) */
function gMoreLess(){
  const step = pick([10, 100, 1000]);
  const dir = pick(['more','less']);
  const sg = dir === 'more' ? 1 : -1;
  /* range set so all the named distractors stay inside 1..9999 (see gPattern4) */
  const n = dir === 'more' ? ri(1000 + step, MAXN - 3*step) : ri(1000 + 3*step, MAXN - step);
  const ans = n + sg*step;
  /* W1, third pass: the same `step/10` regression as gPattern4 - a distractor one
     away from a 4-digit key on 32.08% of draws when the step was 10. Same fix:
     whole steps and whole columns only, nothing closer to the key than the
     smallest place value the item tests, symmetric about the key. */
  const fam = [
    ans + step,         /* took the step twice */
    ans - step,         /* never took it - the number you were given back again */
    ans + 2*step,       /* took it three times */
    ans - 2*step,       /* went the wrong way */
    ans + 10*step,      /* moved the column to the LEFT of the one asked for */
    ans - 10*step       /* the same slip, the other way */
  ];
  if (step >= 100){     /* the column to the RIGHT is still a whole place value */
    fam.push(ans + step/10, ans - step/10);
  }
  /* NINTH pass, KILL - THE COLUMN RULE, and this bank was its worst number in
     the topic at 77.7%. Every slip above moves ONE column, so three of them
     beside the key put the key's digit in three of the four printed numbers in
     every column and "cross out each column's minority digit" answered the item
     outright with no counting at all. The two errors COMPOUNDED - the step
     miscounted AND taken in the wrong column - are a real slip (a child who has
     lost which column the step belongs in has usually lost the count as well),
     and they are what stops the crossing-out: key, key+d, key+e and key+d+e is
     a lattice, and every column of it splits two-two. */
  for (const x of [step, -step, 2*step, -2*step])
    for (const y of (step >= 100 ? [10*step, -10*step, step/10, -step/10] : [10*step, -10*step]))
      fam.push(ans + x + y);
  /* the window between the number the stem prints and the key, kept occupied for
     the same reason as gPattern4's - and empty for the same reason on step 10 */
  const cands = slipSet(ans, fam, { minGap: Math.max(10, step/10),
    prefer: c => c.some(v => (v - n) * sg > 0 && (ans - v) * sg > 0) });
  return mcNum('What number is ' + step + ' ' + dir + ' than ' + n + '?', '', ans, cands, '',
    n + ' ' + (dir === 'more' ? '+ ' : '− ') + step + ' = ' + ans + '. Only the ' + STEP_WORD[step] +
    ' digit changes, unless it rolls over and takes the digit on its left with it.');
}

/* FORMAT 10 - working backwards inside a pattern: the gap is in the MIDDLE and
   the jump is NOT given, so the child must find the jump first (pool 3, 2 steps)

   W6, EIGHTH pass (2026-09-16) - THE STRADDLE, AND RESIDUAL 15 DECLARED ONLY ONE
   SIDE OF IT. The gap is in the middle by construction, so the key is ALWAYS
   strictly inside the printed run. "Keep the options that sit between the first
   and last printed terms and are not themselves printed, then guess among them" is
   worth 61.69 / 61.49% as a guesser value and answers the item OUTRIGHT on 25.12 /
   24.74% of draws - above the 60% this file uses as its prose ceiling, on a bank
   served 2.04 times a session at 0.80 accuracy. Residual 15 declares only the
   one-sided version ("the largest option below the biggest stem number", 46.55 /
   46.40%). DECLARED at the higher figure: a missing MIDDLE term is inside its own
   run, and narrowing the straddle would mean moving the gap to an end, which is
   gPattern4's item and not this one. */
function gPatternMissing(){
  /* Steps are multiples of 100 so that a "jump added one column out" distractor
     (key + step/10) is a visible slip rather than an off-by-one that would read as
     padding. At least two of the four options are numbers NOT printed in the stem,
     so a child cannot shortcut the pattern work by eliminating everything already
     on the page - that elimination is valid reasoning, but it is not the reasoning
     this item is for. */
  const step = pick([100, 150, 200, 250, 500]);
  const up = Math.random() < 0.5;
  const s = up ? step : -step;
  /* range set so the printed terms AND every named distractor stay in 1..9999 */
  const start = up ? ri(1000 + step, MAXN - 5*step) : ri(1000 + 5*step, MAXN - step);
  const gap = ri(1,3);
  const terms = [0,1,2,3,4].map(k => start + k*s);
  const shown = terms.map((v, i) => i === gap ? '?' : String(v));
  /* W2 (Sweep p3numbers Refutation, 2026-09-15): this explanation used to derive
     the jump from terms[4] and terms[3] whatever the gap index was - so on the
     33.7% of draws where the gap landed at index 3 the teaching sentence told the
     child to find the jump from a number that is not on the page, and the number
     it named was the ANSWER. The pair is now picked by index and is always two
     SHOWN, adjacent terms. gen-sanity re-reads the pair out of the rendered
     explanation and fails if either number is not printed in the stem. */
  const j = gap === 1 ? 3 : 0;       /* gap 1 -> (3,4); gaps 2 and 3 -> (0,1) */
  /* The first three slips are the two neighbours and a column slip, and for a
     given direction they all land on the same side of the key - the key was rank
     1 on every ascending draw and rank 2 on every descending one. The family now
     carries the column slip both ways and the jump made one column too far left,
     so the key's position moves.

     W2 (Sweep p3numbers Refutation, THIRD pass, 2026-09-15). The declared guard
     above - "at least two of the four options are numbers NOT printed in the
     stem" - held on 20,000 / 20,000 draws and was still not enough. The
     trailing-digit test removes the survivors: every `+- s/10` slip breaks the
     digits the printed run holds constant, and everything else on offer was
     already on the page, so the compound "keep what matches the run's last
     digits, then drop anything already printed" left exactly one option - always
     the key - on 44.65% of draws, with no pattern work at all. (100.00% at
     cc2d326; v3's slipSet more than halved it without anyone measuring it.)

     The guard is now the one the wound asked for, and it is a guarantee rather
     than a tendency: keepOne forces exactly one distractor that BOTH sits on the
     pattern's own grid (so the trailing-digit test cannot touch it) AND is not a
     printed term. Two of its four candidates are in scope on every draw - the
     term after the end of the run and the term before its start - and they sit on
     opposite sides of the key, so the guarantee does not pin the rank. */
  const fam = [
    terms[gap-1],            /* copied the number just before the gap */
    terms[gap] + s/10,       /* added the jump one column to the right */
    terms[gap] - s/10,       /* the same slip, taken off instead of added */
    terms[gap-1] + 2*s,      /* took two jumps instead of one */
    terms[gap] + 10*s,       /* made the jump one column too far to the left */
    terms[gap] - 10*s        /* the same slip, the other way */
  ];
  /* NINTH pass, KILL - THE COLUMN RULE, and this bank was the kill: 72.6%
     outright, 2.12 items a session, the stem never read. The jump miscounted AND
     made in the wrong column, both at once, is a real slip and is the digit
     coincidence that stops a column of four crossing itself out. See slipSet. */
  for (const x of [s, -s, 2*s, -2*s])
    for (const y of [10*s, -10*s, s/10, -s/10]) fam.push(terms[gap] + x + y);
  const cands = slipSet(terms[gap], fam, { minGap: 10, keepOne: [
    terms[4] + s,            /* carried the pattern PAST the end instead of filling the gap */
    terms[0] - s,            /* counted back BEFORE the start instead of on to the gap */
    terms[gap] + 10*s,       /* the jump one column too far to the left */
    terms[gap] - 10*s        /* the same slip, the other way */
  ],
  /* the EIGHTH pass's declared straddle - "keep the options that sit between the
     first and last printed terms and are not themselves printed" - is held where
     it was measured by keeping a second such option on the row. The compounds
     that flatten the column are mostly outside the run, so without this the
     straddle went from 25% outright to 53%. */
  prefer: c => c.filter(v => (v - terms[0]) * s > 0 && (terms[4] - v) * s > 0 &&
                             terms.indexOf(v) === -1).length >= 1 });
  return mcNum('What is the <b>missing number</b> in this pattern? <b>' + shown.join(', ') + '</b>',
    '', terms[gap], cands, '',
    'Nobody tells you the jump, so find it from two numbers that sit next to each other: ' +
    terms[j+1] + ' and ' + terms[j] + ' are ' + step + ' apart, so the pattern counts ' +
    (up ? 'on' : 'back') + ' in ' + step + 's. Now one jump from ' + terms[gap-1] + ' gives ' +
    terms[gap-1] + ' ' + (up ? '+' : '−') + ' ' + step + ' = ' + terms[gap] + '.');
}

/* FORMAT 11 - the odd one out: one printed term breaks the pattern (pool 3, 2
   steps). The SECOND `pattern` generator in pool 3, and the reason it is here is
   a measurement, not a taste call.

   W3 (Sweep p3numbers Refutation, 2026-09-15): buildCarousel round-robins SKILLS
   inside a pool, so a skill holding one generator gets the whole of its quarter.
   With gPatternMissing alone on the `pattern` peg, pool 3 served it 3.64 times in
   a 30-item session (worst 6) with ONE masked shape - the shape of the original
   complaint, arriving through the variety gate rather than around it. A second
   format on the same peg halves it.

   Two steps, and neither is gPatternMissing's: find the jump the MAJORITY of the
   printed terms agree on, then test the terms against it. The jump is not named,
   the answer is one of the numbers on the page, and the three distractors are the
   other printed terms - so this is an optionSet item (the options ARE the data),
   not an authored-distractor one.

   W1 (Sweep p3numbers Refutation, second pass, 2026-09-15). The break used to be
   one jump taken in the next column down (+-step/10) on a run counting in
   hundreds or thousands - which meant five of the six printed terms shared a
   digit in that column and the sixth did not. A right-to-left digit scan settled
   the item on 100.00% of 50,000 draws and a left-to-right scan - the strategy
   this topic's own compare tip teaches - on 90.50%. One step, no arithmetic.

   The run now counts in 150s or 250s, so the only column all six terms share is
   the ones, and the break (50, half of a hundred-jump) does not touch it: the
   tens column splits four-two, never five-one. The break is also held inside its
   own thousand, so it can never show in the leading digit either. The odd term
   breaks the JUMP RULE and nothing else, which is the thing the item claims to
   be about. Measured after: the scan settles it on well under a tenth of draws,
   and tools/gen-sanity.mjs gates the topic's magnitude ranks besides. */
function gPatternOdd(){
  /* the one printed position that is off the line the other five sit on, or -1 if
     that position is not unique. Written out here so the item is CONSTRUCTED to
     have exactly one answer; tools/gen-sanity.mjs re-derives it independently. */
  const uniqueFit = t => {
    let hit = -1;
    for (let i = 0; i < t.length; i++){
      const J = t.map((_, k) => k).filter(k => k !== i);
      const D = (t[J[1]] - t[J[0]]) / (J[1] - J[0]);
      if (!Number.isInteger(D) || D === 0) continue;
      if (J.every(k => t[k] === t[J[0]] + (k - J[0]) * D)){ if (hit >= 0) return -1; hit = i; }
    }
    return hit;
  };
  /* KILL (Sweep p3numbers Refutation, FIFTH pass, 2026-09-15). The v3-v5 run
     counted in 150s or 250s and broke by +-50. A step that is a multiple of 50
     but not of 100 moves the TENS DIGIT by exactly five every term, so the tens
     column alternates between two values and only two - A B A B A B - and a +-50
     break flips the odd term's tens digit into its NEIGHBOURS' class. That left
     exactly one interior position in the printed run where three tens digits in a
     row agree, and it was the answer on 20,000 / 20,000 draws at two seeds. Read
     one digit column, find the three-in-a-row, done: no jump, no step, no
     arithmetic of any kind. v3 killed the NAIVE "odd tens digit out" scan and
     opened this one in the same edit; v3, the third pass and the fourth pass all
     certified the class closed.

     v6 takes the alternation away rather than the break. The step is now 15, 25
     or 35 - not a multiple of 10, so the ONES digit alternates between two values
     and the TENS digit advances by one, two or three (plus the carry out of the
     ones) and does not repeat inside six terms. The break is a multiple of TEN
     and strictly smaller than the step, which does three things at once:

       - the odd term keeps its place in the ones-column alternation, so the one
         column that IS regular stays regular through the break and says nothing;
       - the tens column has no majority class to disagree with, so "the odd tens
         digit" and "the tens digit that matches both neighbours" both stop
         resolving to a single term (measured, both directions, in the note);
       - the run stays monotonic, because |off| < step keeps every jump positive,
         so "the numbers turn round here" is not a tell either.

     What is left is the step rule itself: the jump into the odd term and the jump
     out of it are both wrong, by |off| in opposite directions, and nothing else
     in the printing distinguishes it. */
  const step = pick([15, 25, 35]);
  const up = Math.random() < 0.5;
  const s = up ? step : -step;
  /* a multiple of ten (the ones column survives the break) and smaller than the
     step (the run never doubles back) */
  const off = pick([1, -1]) * pick([10, 20, 30].filter(v => v < step));
  let start = 2000, terms = [], bi = 2, g = 0;
  do {
    start = up ? ri(1000, MAXN - 6*step) : ri(1000 + 6*step, MAXN);
    bi = ri(1,4);                 /* the break is interior, so removing an END term
                                     can never leave an arithmetic sequence */
    terms = [0,1,2,3,4,5].map(k => start + k*s);
    terms[bi] = terms[bi] + off;
    g++;
  } while (g < 400 && !(terms.every(ok) && allDistinct(terms) &&
           /* the break stays inside its own thousand, so no leading digit moves */
           Math.floor(terms[bi] / 1000) === Math.floor((start + bi*s) / 1000) &&
           uniqueFit(terms) === bi));
  const odd = terms[bi];
  /* W3, third pass. The three distractors used to be a random 3 of the 5 other
     printed terms, which makes the key's rank among the four options a function
     of WHERE the break landed: with the break interior, the odd term was the
     smallest of the four on 12.51% of draws and the largest on 12.37%, against
     25% for a flat bank. The rank gate now has a floor as well as a ceiling, and
     this bank is inside it by construction instead of by luck: the number of
     distractors drawn from BELOW the odd term is drawn uniformly from whatever
     this break allows, exactly as slipSet does for the authored banks. */
  const lower = terms.filter((v, i) => i !== bi && v < odd);
  const upper = terms.filter((v, i) => i !== bi && v > odd);
  const rLo = Math.max(0, 3 - upper.length), rHi = Math.min(3, lower.length);
  const nBelow = ri(rLo, rHi);
  /* W4, FOURTH pass - the free elimination on an axis the rank floor does not
     look along. Under the old 150s/250s run the printed terms alternated between
     exactly TWO tens digits, so a blind draw of three distractors left exactly
     ONE option visibly alone in its tens column on 65.02% of draws, and that
     option was NEVER the answer: crossing it out took a guesser from 25% to 33.3%
     with no arithmetic. The v5 guard preferred distractor sets in which no option
     stood alone, and got the rate to ~16.7%.

     The v6 step (15 / 25 / 35) removes the two-class world the guard was written
     for: the tens digits of six terms no longer repeat, so on most draws EVERY
     option stands alone in its tens column and the elimination has nothing to
     bite on. The guard is therefore re-stated in the form the wound actually
     asks for - it is not "nobody stands alone", it is "not EXACTLY ONE stands
     alone", which is the only shape a child can cross out. Sets where the count
     of tens-column loners is 1 are avoided where the drawn `nBelow` allows it;
     `nBelow` still wins, so the magnitude rank stays exactly where the third pass
     put it. Both directions are measured in the note. */
  const sideOk = t => t.filter(v => v < odd).length === nBelow;
  const noLoner = t => {
    const four = t.concat([odd]).map(v => Math.floor(v / 10) % 10);
    return four.filter(c => four.filter(x => x === c).length === 1).length !== 1;
  };
  const pool = terms.filter((v, i) => i !== bi);
  const sets = [];
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++)
    for (let k = j + 1; k < pool.length; k++) sets.push([pool[i], pool[j], pool[k]]);
  const bySide = sets.filter(sideOk);
  const clean = bySide.filter(noLoner);
  const rest = shuffle(pick(clean.length ? clean : bySide));
  /* the worked pair must be two terms that BOTH sit on the pattern and are next
     to each other on the page */
  const j = bi <= 1 ? 2 : 0;
  const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
  const into = Math.abs(terms[bi] - terms[bi-1]), outOf = Math.abs(terms[bi+1] - terms[bi]);
  return mcSet('One number does <b>not belong</b> in this pattern. Which one is it? <b>' +
    terms.join(', ') + '</b>', '', odd, rest,
    'Most of the jumps are the same size: ' + terms[j] + ' ' + (up ? '+' : '−') + ' ' + step + ' = ' +
    terms[j+1] + ', so the pattern counts ' + (up ? 'on' : 'back') + ' in ' + step +
    's. Follow that jump from the start and the ' + ORD[bi] + ' number should be ' + (start + bi*s) +
    ', but ' + odd + ' is printed instead: the jump into it is ' + into + ' and the jump out of it is ' +
    outOf + ', and neither is ' + step + '. Write the difference above each gap and the gap that does ' +
    'not match tells you which number to blame.');
}


/* =========================================================================
   PRINCIPLE 3 - ADDING AND SUBTRACTING WITHIN 10 000, WITH REGROUPING
   ========================================================================= */

/* FORMAT 1 - concept check: what is the carried 1 actually WORTH? (pool 1,
   1 step). No column arithmetic to do; this is the place-value idea itself.

   THE PROSE FORM IS RETIRED (PM ruling on the SIXTH pass's KILL, 2026-09-16).
   A four-sentence prose concept check was killed on five successive lexical
   axes in five successive passes - form (v2), character length (v3), a bigram
   (v4), a four-word phrase (v5), and finally, at v6, the ABSENCE of a phrase:
   the v6 option set gave the key a shortest private phrase of TEN words and
   left the three distractors at ONE, ONE and TWO ("14", "right", "Write 1"),
   so "cross out the three options that say something none of the others say"
   answered the pool-1 flagship on 100.00% of 20,000 draws at each of two seeds,
   with no arithmetic and no idea what a carry is. Each rewrite closed the axis
   it was given and opened the next one, because on four prose options every
   word is a feature and the key cannot be made featureless and unremarkable at
   the same time. The ruling: a four-option prose concept check cannot be made
   tell-free by authoring, so stop authoring one.

   THE LEARNING OBJECTIVE IS UNCHANGED - what the small carried 1 stands for -
   and it is now asked NUMERICALLY, which puts the bank under the magnitude rank
   gate (two-sided, 12-45%, "smallest"/"largest" under 40%) that owns the other
   twenty numeric banks in this file, instead of under a word ruler that has now
   been one notch short five times. The stem prints the two numbers, the column
   that made ten or more, the digit that stays and the column the small 1 is
   written above; the child says how much that 1 is worth.

   THE FOUR OPTIONS ARE PLACE VALUES AND THE NAMED SLIPS AROUND THEM.
   key      POW[col]            1 ten / 1 hundred / 1 thousand, by the column it
                                is written above - the whole idea of the item
   slips    1                   the mark read as the digit it looks like
            POW[j], j != col    the WRONG column's value (the PM's named slip)
            POW[src]            left in the column it came from - "a ten carried
                                out of the tens column is still ten"
            keep                the digit that STAYED, swapped with the carried 1
            s                   the whole column total
            keep * POW[src]     the part that stays, at its real value
            s   * POW[src]      the whole column, not just the part that carries
            keep * POW[col]     the stayed digit pushed into the carry's column
            s   * POW[col]      the WHOLE total pushed into the carry's column

   THE KEY'S RANK IS DRAWN UNIFORMLY AND SO IS THE COLUMN, both by construction
   rather than by luck. The rank is drawn FIRST - ri(0,3) - and the column is
   then drawn uniformly from the columns that can realise it out of this draw's
   own family, which is enumerated rather than assumed. That is the only order
   that makes both axes flat at once, and it is forced by arithmetic that no
   wording can move: the key is 10, 100 or 1000, so a tens key has only two
   in-scope wrong answers beneath it and can never be the largest of four, and a
   thousands key has only one above it (10 000 is out of scope) and can never be
   the smallest. Drawing the column first and the rank second gives
   19.4 / 19.4 / 36.1 / 25.0 and "pick one of the two middle options" at 55.5%;
   drawing the rank first gives 25 / 25 / 25 / 25, columns 1/3 each, and the
   middle pair at exactly the 50.0% structural floor of a four-option row.

   Two constructor rules pay for that, and both are declared:
     - `keep * POW[col]` is NOT drawn when the carry lands in the thousands
       column. There it would be the second in-scope slip above a thousands key,
       which lets that column reach rank 2 - and the aggregate then lands with
       the middle pair at 61.1%, over the refutation's own 60% ceiling.
     - at least one distractor must be wide enough for RULE C in
       tools/gen-sanity.mjs, which fails a key printed more than 1.4x the
       longest distractor. This is why a hundreds key is never the largest of
       four: everything in scope below 100 is one or two digits wide.
   The residual the shape leaves is "pick the option that is 1 followed by
   zeros", worth about 31% against 25% chance - the option set is a place-value
   ladder on roughly half the draws and the key is always on it. Declared and
   measured rather than authored away: the sets are chosen to hold as MANY place
   values as the drawn rank allows, precisely so that rule cannot narrow.

   W1, SEVENTH pass (2026-09-16) - AND THE RESIDUAL ABOVE WAS WRONG ABOUT ITS OWN
   CEILING. The key is a power of ten, so it is the SMALLEST number of its printed
   width by construction; `keep * POW[col]` and `s * POW[src]` were the only two
   family members that could share that width, and both are larger than the key.
   The key was therefore the minimum of its own width class whenever that class
   was not a singleton, and "take the commonest printed width, then the smallest
   number in it" answered the item on 45.83% / 45.94% of draws - 57.3% as a
   guesser value, and 63.2% composed with "cross out the numbers the stem has
   already printed". The residual named both halves of that composition itself
   ("pick the option that is 1 followed by zeros" 31.6%, "keep the majority digit
   count" 32.3%) and asserted the sets were chosen so the rule could not narrow
   further. It does narrow further, because THE ONLY OPTION THAT IS BOTH A POWER
   OF TEN AND AT THE KEY'S WIDTH IS THE KEY - the other powers of ten all print at
   different widths, by definition.

   W2, EIGHTH pass (2026-09-16) - AND THE CEILING WAS STILL WRONG, FOR THE THIRD
   TIME. The residual above was corrected in v8 to "12.25 / 12.98% outright and
   33.7 / 34.5% as a guesser". Both halves it names compose without any width step:
   "the smallest option that is 1-followed-by-zeros and is not 1" - identically,
   "cross out every number the stem printed, then take the smallest" - is worth
   51.88 / 51.91% OUTRIGHT, firing on 100% of draws. It is structural and it is not
   authorable away: the key is `POW[col]` for col in 0..2, so on the tens column
   there is no multiple of ten below the key to print, and on the ones column the
   key is 1. DECLARED at 51.9%, which is this bank's true shape ceiling, and it is
   why the SHAPE RULER's route cap is 60% rather than the 40% the width rules take.

   W7, EIGHTH pass. The option board here is 64 distinct rows over 20,000 draws at
   each of two seeds, and the row alone pins the key on 73.11 / 73.14% of them.
   Three columns times a family of powers of ten and small multiples of them cannot
   make more; DECLARED, with exposure 0.82 items per session at 0.80 accuracy and
   3.28 at 0.45. The v8 note declared row repetition for gPatternConcept's anchor
   third only; it is the whole of both banks. The 2-2 width tie this bank ships on
   8.37 / 8.29% of draws, with the key in the NARROWER pair on 100.00% of them, is
   declared for the same reason: filtering it out costs 14 of the 64 rows, and a
   smaller board is the worse trade.

   Nothing can be authored below a power of ten at its own width, so the fix is
   the other way round: every subset is now labelled by whether it puts ANY
   distractor at the key's width, and a width-free subset is preferred wherever
   the drawn (rank, column) cell has one. Two cells have none - rank 0 at the
   hundreds column and rank 2 at the thousands column, where every in-scope slip
   above the key is at the key's own width - and those are the draws where the key
   is still its class's minimum. `s * POW[col]` is added to the family for that
   reason as well as its own: it is the one named slip ABOVE a tens or hundreds
   key at a DIFFERENT width, and it is what lets rank 0 and rank 1 be width-free
   at the tens column. Measured after: 20.6% / 20.9% outright, against 45.8%
   before, with rank and column both still flat.

   W2, SEVENTH pass. The item no longer requires any `addsub` knowledge: the key
   was a deterministic function of one phrase - "a small 1 above the <place>
   column" - on 100% of draws, so a, b, the column total and the digit written
   were decoration and the demand had drifted to place-name -> numeral
   translation. On three draws in five the stem now describes the carry by the
   column TOTAL instead of naming its column ("One column makes 14, so he writes 4
   there and a small 1 above the column on its left"), which puts the column
   addition back inside the item: the child has to find the column that makes 14
   before the place name exists to translate. The stem is true as printed on every
   draw - no other column can total 12-18, because every column right of the
   source is built to sum under 10 and every column left of it under 9 - and the
   explanation names the column it found. Measured: the phrase-only route
   resolves on 40% of draws and is worth 55% as a guesser, against the 60%
   ceiling. The bank stays registered under `addsub` because the majority of its
   draws now demand it. */
function gAddConcept(){
  const s = ri(12, 18), keep = s % 10;
  /* the slip family for a given carry column, as [value, why] pairs in the
     order the explanation prefers to name them (W5: slipWhy names the first one
     that actually shipped, so the sentence never discusses an absent number). */
  const famFor = col => {
    const src = col + 1;
    const f = [
      [1, 'Reading the mark as the digit it looks like'],
      [keep, 'Carrying the ' + keep + ' that stays behind instead'],
      [s, 'Carrying the whole column total'],
      [POW[src], 'Leaving it in the ' + PLACES[src] + ' column it came from'],
      [keep * POW[src], 'Carrying the part that stays, ' + plPlace(keep, src) + ','],
      [s * POW[src], 'Carrying all ' + s + ' ' + PLACES[src] + ' instead of just the ' + plPlace(1, col)]
    ];
    if (col > 0) f.push([keep * POW[col], 'Writing the ' + keep + ' above the ' + PLACES[col] + ' column']);
    /* W1, seventh pass: the one named slip ABOVE a tens or hundreds key that is
       NOT printed at the key's own width, which is what lets those columns reach
       ranks 0 and 1 without putting a same-width number over the key. */
    f.push([s * POW[col], 'Writing the whole ' + s + ' above the ' + PLACES[col] + ' column']);
    for (let j = 0; j < 4; j++) f.push([POW[j], 'Counting it as ' + plPlace(1, j)]);
    const seen = new Set([POW[col]]);
    return f.filter(p => { if (!ok(p[0]) || seen.has(p[0])) return false; seen.add(p[0]); return true; });
  };
  /* every 3-subset of every column's family, grouped by how many slips land
     BELOW the key - which IS the key's rank among the four printed numbers - and
     labelled (W1, seventh pass) by whether any of them is printed at the key's
     OWN WIDTH, which is the axis the KILL was measured on. */
  const bank = [0, 1, 2].map(col => {
    const key = POW[col], fam = famFor(col), kw = String(key).length, byR = new Map();
    for (let i = 0; i < fam.length; i++)
      for (let j = i + 1; j < fam.length; j++)
        for (let k = j + 1; k < fam.length; k++){
          const t = [fam[i], fam[j], fam[k]];
          if (Math.max.apply(null, t.map(p => String(p[0]).length)) * 1.4 < kw) continue;
          const r = t.filter(p => p[0] < key).length;
          if (!byR.has(r)) byR.set(r, []);
          byR.get(r).push(t);
        }
    return { col: col, key: key, fam: fam, byR: byR, kw: kw };
  });
  const r = ri(0, 3);
  const live = bank.filter(b => b.byR.has(r));
  const b0 = pick(live.length ? live : bank.filter(b => b.byR.size));
  const col = b0.col, src = col + 1, key = b0.key;
  let sets = b0.byR.get(b0.byR.has(r) ? r : [...b0.byR.keys()][0]);
  /* WIDTH-FREE FIRST. A subset with no distractor at the key's width leaves the
     key's width class a singleton, so "the smallest of the commonest width" has
     nothing to point at. Two cells have no such subset - rank 0 at the hundreds
     column and rank 2 at the thousands column - and those are the draws the
     width-class gate still counts. */
  const free = sets.filter(t => t.every(p => String(p[0]).length !== b0.kw));
  if (free.length) sets = free;
  /* among the sets at that rank, the ones holding the MOST place values: the
     fewer non-ladder options on the row, the less "pick the round one" is worth */
  const pv = t => t.filter(p => /^10*$/.test(String(p[0]))).length;
  const best = Math.max.apply(null, sets.map(pv));
  const chosen = pick(sets.filter(t => pv(t) === best));
  const cands = chosen.map(p => p[0]);

  /* the two numbers, built column by column so the stem's claim is true as
     printed: the columns to the RIGHT of src carry nothing into it, so the src
     column really does make s on its own. */
  const A = [0,0,0,0], B = [0,0,0,0];
  A[src] = ri(Math.max(3, s - 9), Math.min(9, s - 3)); B[src] = s - A[src];
  for (let i = src + 1; i < 4; i++){ A[i] = ri(0, 4); B[i] = ri(0, 9 - A[i]); }
  for (let i = 1; i < src; i++){ A[i] = ri(0, 4); B[i] = ri(0, 4); }
  A[0] = ri(1, 4); B[0] = ri(1, 4);
  const a = numOf(A), b = numOf(B);

  const kid = pick(KIDS), who = kid[0], pron = kid[1].toLowerCase();
  const why = slipWhy(cands, b0.fam);
  /* W2, seventh pass: on three draws in five the stem does not name the column
     the 1 is written above, so the child has to FIND the column that makes s
     before there is a place name to read. Exactly one column can: every column
     to the right of src is built to total under 10 and every column to its left
     under 9, while s is 12-18. */
  const bySum = ri(0, 4) >= 2;
  const stem = bySum
    ? who + ' works out ' + a + ' + ' + b + ' in columns. One column makes ' + s + ', so ' + pron +
      ' writes ' + keep + ' in that column and a small 1 above the column on its left. ' +
      '<b>How much is that small 1 worth?</b>'
    : who + ' works out ' + a + ' + ' + b + ' in columns. The ' + PLACES[src] + ' column makes ' + s +
      ', so ' + pron + ' writes ' + keep + ' in the ' + PLACES[src] + ' column and a small 1 above the ' +
      PLACES[col] + ' column. <b>How much is that small 1 worth?</b>';
  const found = bySum
    ? 'The column that makes ' + s + ' is the ' + PLACES[src] + ' column: ' + A[src] + ' + ' + B[src] +
      ' = ' + s + ', and no other column reaches ten. '
    : '';
  return mcNum(stem, '', key, cands, '',
    found + s + ' ' + PLACES[src] + ' is ' + plPlace(1, col) + ' and ' + plPlace(keep, src) + ', so the ' +
    keep + ' stays in the ' + PLACES[src] + ' column and the small 1 is ' + plPlace(1, col) +
    ' - worth ' + key + '. A carried mark is worth the column it is written ABOVE, not the digit ' +
    'it looks like: that is what regrouping means, ten of something small becoming one of the next ' +
    'size up. ' + why[1] + ' gives ' + why[0] + '.');
}

/* FORMAT 2 - direct compute, addition with at least two regroupings
   (pool 1, 1 step - the addition fluency anchor).
   Named distractors: never carried anything; forgot one carry; carried a ten
   that was not there. */
function gAddRegroup(){
  let a = 3456, b = 1278, cols = [], key = 4734, cands = null, fam = [], g = 0;
  do {
    a = ri(1000, 7000); b = ri(1000, MAXN - a);
    key = a + b; cols = carryCols(a, b);
    /* every slip that drops a carry lands BELOW the true sum and every slip that
       invents one lands above it, so a family built only out of the first kind
       pins the key at one rank - it sat at rank 2 on 100% of draws.

       NINTH pass, KILL: and a family built only out of ONE-COLUMN slips hands
       the row to the column rule whichever side they land on. The per-column
       slips are now offered two at a time as well (see twoAtATime), which is
       both a real P3 slip - a child who drops one carry drops two - and the
       digit coincidence that stops the column rule resolving. `noCarry` stays a
       single: "wrote every column total straight down" is already every carry
       at once and does not compound with a named carry. */
    fam = cols.length >= 2
      ? [[noCarry(a, b), 'Writing every column total straight down without carrying']].concat(
          twoAtATime(key,
            cols.map(c => [addCols(a, b, c) - key, 'Forgetting the carry out of the ' + PLACES[c] + ' column'])
              .concat([1, 2, 3].map(c => [POW[c] * 10,
                'Carrying a ten into the ' + PLACES[c - 1] + ' column that was never there']))))
      : [];
    cands = fam.length ? slipSet(key, fam.map(p => p[0])) : null;
    g++;
  } while (g < 200 && !(cols.length >= 2 && ok(key) && cands && optsOk(key, cands)));
  /* W5, SIXTH pass: this sentence used to name noCarry(a, b) whatever the draw
     did, and slipSet left that value off the options row on 49.15% of draws. */
  const why = slipWhy(cands, fam);
  return mcNum('What is ' + a + ' + ' + b + '?', '', key, cands, '',
    'Line the numbers up and add from the right. ' + a + ' + ' + b + ' = ' + key + '. The ' +
    PLACES[cols[0]] + ' column makes ten or more, so a ten moves into the column on its left; this ' +
    'sum regroups in ' + cols.length + ' of its four columns. ' + why[1] + ' gives ' + why[0] + '.');
}

/* FORMAT 3 - direct compute, subtraction with regrouping (pool 2, 1 step) */
function gSubRegroup(){
  let a = 5042, b = 1867, cols = [], key = 3175, cands = null, fam = [], g = 0;
  do {
    a = ri(3000, MAXN); b = ri(1000, a - 2000);   /* key >= 2000, so key - 1000 is still a 4-digit option */
    key = a - b; cols = borrowCols(a, b);
    /* a regrouping kept that was not needed lands above the answer, one lost
       lands below it, and the family carries both for every borrowing column -
       the old three slips were two above and one below on every single draw.

       W3, third pass: that still left only |cols| slips below the key against
       |cols| + 1 above, so on the many draws with exactly two borrowing columns
       the key could not be the largest of the four - "pick the largest" was
       eliminable on 93.4% of draws (rank 3 took 6.64% of 20,000). The
       below-the-key slip is now drawn for EVERY column, not only the borrowing
       ones: taking one from the column on the left in a column that could already
       take away is the mirror misconception of forgetting to reduce the column
       you did borrow from, and it is just as common on paper.

       NINTH pass, KILL: both sides is not enough if every slip still moves ONE
       column - the column rule crossed this bank out to the key alone on 58.8%
       of draws. The per-column slips are now offered two at a time as well (see
       twoAtATime); a child who forgets to reduce after borrowing forgets it in
       two columns as readily as in one. */
    fam = cols.length >= 2
      ? [[smallFromBig(a, b), 'Taking the smaller digit away from the bigger one in every column ' +
          'instead - the commonest slip -']].concat(twoAtATime(key, borrowOnes(cols)))
      : [];
    cands = fam.length ? slipSet(key, fam.map(p => p[0])) : null;
    g++;
  } while (g < 200 && !(cols.length >= 2 && ok(key) && smallFromBig(a, b) !== key &&
           cands && optsOk(key, cands)));
  /* W5, SIXTH pass: this sentence used to name smallFromBig(a, b) whatever the
     draw did, and slipSet left that value off the options row on 52.98% of
     draws - the largest of the four sites, on a pool-2 fluency anchor. */
  const why = slipWhy(cands, fam);
  return mcNum('What is ' + a + ' − ' + b + '?', '', key, cands, '',
    a + ' − ' + b + ' = ' + key + '. In the ' + PLACES[cols[0]] + ' column you cannot take away ' +
    'enough, so you take one from the column on its left and turn it into ten. ' +
    why[1] + ' gives ' + why[0] + '.');
}

/* FORMAT 4 - inverse: the missing part (pool 2, 2 steps) */
function gMissingAddend(){
  let a = 1278, total = 4021, key = 2743, cols = [], cands = null, g = 0;
  do {
    total = ri(3000, MAXN); a = ri(1000, total - 2000);   /* key >= 2000: see gSubRegroup */
    key = total - a; cols = borrowCols(total, a);
    /* both sides and two at a time, per column: see gSubRegroup */
    cands = cols.length >= 2 ? slipSet(key,
      [smallFromBig(total, a)].concat(twoAtATime(key, borrowOnes(cols)).map(p => p[0]))) : null;
    g++;
  } while (g < 200 && !(cols.length >= 2 && ok(key) && smallFromBig(total, a) !== key &&
           cands && optsOk(key, cands)));
  return mcNum(a + ' + ? = ' + total, '', key, cands, '',
    'A missing part is found by taking the part you know away from the whole: ' + total + ' − ' + a +
    ' = ' + key + '. Check it the other way round - ' + a + ' + ' + key + ' = ' + total +
    ' - and you will catch a regrouping slip straight away.');
}

/* FORMAT 5 - mental strategy: make the next ten, then adjust (pool 2, 2 steps).
   MOE P3 2.2, mental calculation with two 2-digit numbers. */
function gMentalMake(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  let a = 58, b = 27, round = 60, key = 25, cands = null, g = 0;
  do {
    a = ri(11, 89);
    round = a + (10 - (a % 10));
    const mv = round - a;
    /* b is drawn past twice the amount moved so that "compensated twice" is a
       whole number and the family always has two slips below the key as well as
       three above it - see slipSet. The floor of 21 (and of 2*mv + 3) is the
       fifth pass's minGap 3: it keeps "the amount moved" at least three away from
       the key and keeps the key above 11, so the off-by-a-ten slip is always in
       scope.

       W3, SEVENTH pass (2026-09-16), AND ITS OTHER HALF, WHICH NOBODY HAD
       MEASURED. Residual 15 declares "the smallest option ABOVE the biggest
       number in the stem" on three banks (37.4 / 41.5 / 41.2%). Its mirror -
       "the largest option BELOW the SMALLEST number in the stem" - was worth
       55.0% here and answered the item outright on 49.0%, higher than every row
       the residual names, and it was declared nowhere.

       The two directions on this bank are COMPLEMENTARY, and that is the finding.
       The key is `b - mv`, so it sits just under `b`, and `b` is printed in the
       stem. Nothing can be authored into that gap by luck: it is `mv` wide, `mv`
       is at most 9, and minGap forbids any slip within 3 of the key. So the key
       is the largest option below `b` on EVERY draw, and the only question is
       whether `b` is the smallest number the stem prints or the largest:

         b < round  ->  the key is under every stem number: "largest option below
                        the SMALLEST" fires (and its twin cannot);
         b > round  ->  b is the biggest stem number: "largest option below the
                        BIGGEST" fires (and the first cannot).

       One of the two therefore fires on essentially every draw, and the sum of
       the pair is the structural floor of an item whose answer is one adjustment
       away from a printed number - the same shape as gBetween's declared 50%
       (residual 14), reached from the other side. Biasing the draw only moves the
       weight from one of the pair to the other: taking b past the round-up on
       four draws in five sent the first to 22% and the second to 86%, which is
       worse than the 49 / 51 the balanced draw gives. The draw is therefore left
       balanced, and what is added is the only thing that actually helps - three
       named slips that can land strictly BETWEEN the key and `b`, so that on the
       draws where one of them ships neither direction resolves to the key:

         b - (a % 10)   moved the ones digit of `a` across instead of the amount
                        `a` still needs to reach the next ten - the commonest
                        confusion about WHICH gap to measure. Distance from the
                        key is |2*mv - 10|, so slipSet can use it when mv >= 7.
         b - (10 - b%10) topped up the WRONG number: moved what `b` needs to
                        reach its own next ten. Distance mv - (10 - b%10).

         b - 2*mv + 10  compensated twice AND wrote the answer a ten out - two
                        slips the family already names, made together. Distance
                        10 - mv, so it is usable when mv is 6 or 7.

       All three are culled automatically when they fall inside minGap, which is
       what keeps them from becoming a proofreading trap, and NONE of them is
       forced, which is what keeps "the SECOND largest option below the biggest
       stem number" from inheriting the item the way a guaranteed guard slip
       would. Two things pay for them. `a % 10` is capped at 6 (so mv >= 4): the
       window between the key and `b` is mv wide and minGap is 3, so on an mv <= 3
       draw nothing can be authored into it at all and both directions fire by
       arithmetic. And `b + 2*mv` leaves the family - the weakest of its members,
       "compensated the wrong way, twice" - so three in-gap slips compete with
       three above-side slips rather than four, and actually ship.

       Measured, 20,000 draws x two seeds: the low direction 49.37% -> 36.05 /
       35.67%, and the high direction - which nobody had measured, the lane or the
       refutation - 66.69% -> 48.10 / 48.55%. Both are declared; the second is the
       bigger number and it is the one this bank is now on the record for. */
    /* W1, NINTH pass - THE PRINTED ROUND-UP NAMES THE ADDEND THE DRAWN ORDER WAS
       HIDING. The eighth pass unpinned `b` from its position, and the ninth pass
       showed that bought nothing: `round` is printed, `round` is `a + mv` with
       `mv` in 4..9, so the rounded addend is simply the one sitting within nine
       BELOW the printed round number. It was identified uniquely on 88.1 / 88.9%
       of draws and "find that addend, then take the largest option below the
       OTHER one" was worth 52.1% outright and 59.1 / 59.8% as a guesser value -
       not the 37.5% the v9 note declared.

       The floor is drawn shut instead. On half the draws the OTHER addend is
       drawn into the same nine-below band, so BOTH printed addends round up to
       the printed number and there is nothing in the stem that says which one was
       moved. The item is unharmed, and that is not luck: the key is
       `x + y - round` on every reading, so rounding either addend and
       compensating off the other lands on the same answer - the relaxed premise
       the eighth pass argued for and the ninth pass verified at 100.00% over
       40,000 draws. What the child cannot recover is which addend to hold still,
       and that is the half of the rule the drawn order was supposed to take.

       `round - 4` rather than `round - 1` as the top of that band: the window
       between the key and the nearer printed addend is `round - b` wide, so a
       band running right up to the ten leaves nothing that can be authored into
       it and BOTH readings of the rule land on the key. Four is the floor that
       keeps one in-gap slip in scope (minGap is 3).

       Measured, 20,000 x two seeds: the addend is identified uniquely on 55.0 /
       54.7% of draws (from 88.1 / 88.9), the rule answers the item outright on
       26.5 / 27.0% (from 49.97 / 50.02) and is worth 46.1 / 47.3% to a child who
       tries both readings and guesses between the two answers (from 57.5 / 57.2).
       Its two halves as singles come down with it: "the largest option below the
       biggest number on the page" 41.7 -> 33.6 / 34.1%, and below the smallest
       30.4 -> 33.0 / 33.9%. The 46% is DECLARED - see residual 15. */
    const lo = Math.max(21, 2*mv + 3);
    const both = Math.random() < 0.5 && round - 4 >= Math.max(lo, round - 9);
    b = both ? ri(Math.max(lo, round - 9), round - 4) : ri(lo, 89);
    key = b - mv;
    /* "forgot to compensate" and "compensated the wrong way" both land above the
       key, which is why it was the second-smallest of the four on 97.8% of draws.
       Compensating twice, and the amount moved itself, land below it.

       W3, third pass: two below and three above is not the same as flat. The key
       was NEVER the largest of the four - 0.00% of 20,000 draws - so a child
       could cross the biggest number out without doing any mental arithmetic,
       which is +8.3 points to a guesser on every draw. (gTwoStepWord's mirror of
       this was declared and argued in the file; this one was not mentioned
       anywhere.) `b - 10` is the third slip below the key: a child who moves a
       whole ten across instead of the `mv` the round-up actually needs.

       W3, FOURTH pass. That new `b - 10` slip reopened, one bank along and in the
       same commit, the class the third pass had just closed on the two counting
       banks: the key is `b - mv`, so `b - 10` sits EXACTLY ONE away from it
       whenever `mv` is 9, and a distractor one away from the key was offered on
       16.05% of draws against 10.57% at c099275. The counting banks take
       `minGap` for exactly this - no slip may sit closer to the key than the
       smallest place value the item tests - and this bank tests ONES, so its
       floor is 2. It costs `b - 10` on the `mv = 9` branch and `b`, `b - 2*mv` on
       the `mv = 1` branch; both sides still carry at least two usable slips on
       every draw, so the key's rank stays inside the gate's 12-45% band.

       W2, FIFTH pass. That floor was written as `minGap: 2` and slipSet admits a
       slip whose distance is `>= minGap`, so distance EXACTLY 2 was still legal
       and still drawn: the v5 note claimed "within 2: 32.05% -> 0.00%" and the
       true after-figure was 23.80%. The exactly-1 half was real. The floor is now
       3, which is what "no slip closer to the key than the place value this item
       tests" meant - a slip two away from a two-digit key is the same
       proofreading trap one away from a four-digit key was.

       Raising the floor to 3 culls `b`, `b + mv` and `b - 2*mv` on the `mv = 1`
       branch and `b`, `b - 2*mv` on the `mv = 2` branch, and that left the small-
       `mv` draws with two usable slips below the key and one above - so slipSet
       had no choice about the side balance and rank 3 fell to 10.4%, under the
       12% floor the third pass put in, and `b - 10` itself is culled at the other
       end (`mv` 8 or 9 puts it two or one away). Two slips restore both ends, and
       both are the missing halves of pairs the family already had:

         `b + 10`  the mirror of `b - 10` - a whole ten moved across and added
                   back the wrong way round. Distance `10 + mv`, so no floor
                   reaches it, and it refills the ABOVE side at mv = 1 and 2.
         `key - 10` the answer found correctly and written a ten out, which is the
                   commonest place slip a child makes on a two-digit answer.
                   Distance exactly 10 on every draw, always below the key, so it
                   refills the BELOW side at mv = 8 and 9.

       Every branch now carries at least three usable slips below the key and two
       above it, and the rank band is back inside 12-45% on all four ranks.

       W1, EIGHTH pass. `b + 10` is GONE and a fourth in-gap slip is in. The
       paragraph above added `b + 10` to refill the ABOVE side at mv = 1 and 2, and
       the seventh pass then stopped drawing mv = 1, 2 and 3 at all - so it had been
       dead weight for a pass, and every draw of it crowded out one of the three
       slips that can land between the key and `b`. Removing it, and adding
         `b - (b % 10)`  the ones digit taken OFF `b` instead of the amount the
                         round-up actually needed - "move across" read as "drop the
                         ones", in gap whenever 3 <= b%10 < mv,
       took the structural rule from 68.47 / 67.96% to 37.48 / 37.27% with the
       printed order drawn, and the rank band holds at 23.5 / 25.8 / 26.0 / 24.7.
       (SEVENTH pass: the mv = 1, 2 and 3 branches this paragraph argues about are
       no longer drawn at all - see the W3 note above - so the floor it restores
       is now paid for twice. The rank band is re-measured at 25.1 / 25.6 / 25.2 /
       24.3 and 25.2 / 24.9 / 25.5 / 24.4.) */
    /* W1, NINTH pass, the other half. Hiding WHICH addend was rounded is only
       the first half of the rule; the second half is "then take the largest
       option below the other one", and that half is an option-row property. The
       smallest number the stem prints above the key is the reference EVERY
       version of the rule reduces to - below it, and the key is the largest
       option left. One slip inside that window is what stops it, and the window
       is `round - b` or `mv` wide with a floor of 3 under it, so it cannot always
       be filled: it is a preference, and what it cannot reach is declared. */
    const above = [a, b, round].filter(v => v > key);
    const ref = above.length ? Math.min.apply(null, above) : key;
    cands = slipSet(key, [b, b + mv, mv, b - 2*mv, b - 10, key - 10,
                          b - (a % 10), b - (10 - (b % 10)), b - 2*mv + 10,
                          b - (b % 10)],
                    { minGap: 3, reject: c => !sameWidth(key, c) || widthTie(key, c),
                      prefer: c => c.some(v => v > key && v < ref) });
    g++;
  /* `b !== round` closes residual 12's commutativity draw (1.1% of v7 draws): with
     b equal to the round-up the stem reads "43 + 50 = 50 + ?" and the key is `a`
     itself, so the item is answered by symmetry with no mental arithmetic at all.
     It was declared rather than fixed for six passes; it is one condition. */
  } while (g < 200 && !(a % 10 !== 0 && a % 10 <= 6 && key >= 2 && (round - a) !== key &&
           b !== round && b !== a &&
           cands && optsOk(key, cands) && sameWidth(key, cands) && !widthTie(key, cands)));
  const moved = round - a;
  /* W1, EIGHTH pass. The v8 note measured the two directions of the same rule
     separately - "the largest option below the SMALLEST stem number" 36.3% and
     "...below the BIGGEST" 47.9% - as if a child had to choose between them. They
     do not have to: `b` was not an anonymous stem number, it was THE NUMBER AFTER
     THE `+`, printed twice and always second, and the key is `b - mv`. So "take
     the second number in the sum and pick the largest option below it" answered
     the bank on 68.47 / 67.96% of draws, firing on 100% of them, with no mental
     arithmetic at all.
     `b` is now unpinned: the two addends are printed in a DRAWN order, so the
     number that was rounded up is first on one draw in two and second on the
     other. Nothing about the mathematics moves - `a + b` is the same sum either
     way and the key is `a + b - round` on every reading, which is exactly why the
     item stays single-answered - but the child can no longer find `b` by its
     position, and the harness's oracle now checks that `round` is the next ten up
     from ONE of the two printed addends rather than from the first. */
  const flip = Math.random() < 0.5;
  const x = flip ? b : a, y = flip ? a : b;
  return mcNum(who + ' works out ' + x + ' + ' + y + ' in ' + (pron === 'He' ? 'his' : 'her') +
    ' head. ' + pron + ' makes ' + round + ' first. ' + x + ' + ' + y + ' = ' + round + ' + ?', '',
    key, cands, '',
    'To get from ' + a + ' up to ' + round + ' you need ' + moved + ', so ' + moved + ' is moved ' +
    'across from the ' + b + '. That leaves ' + b + ' − ' + moved + ' = ' + key + ', and ' + round +
    ' + ' + key + ' = ' + (a + b) + '. Whatever you give to one number you must take off the other, ' +
    'or the total changes.' + (b >= round - 9 && b < round
      ? ' You could have rounded the ' + b + ' up to ' + round + ' instead and taken that amount off ' +
        'the ' + a + ': it is the same total either way, so it lands on the same answer.'
      : ''));
}

/* FORMAT 6 - error spotting, DIAGNOSE (pool 3, 2 steps). The claim is produced
   by exactly one named misconception; the two filler options are re-checked
   against this draw, so neither is ever a second defensible answer. */
/* Same length discipline as STANDS_SLIPS: 38-44 characters across all four, so
   every rendered option lands inside the 48-character ceiling. */
const ADD_NOCARRY = ' did not carry any of the tens at all.';
const ADD_FILL_SUB = ' subtracted the numbers instead of adding.';
const ADD_FILL_SUM = ' added up all eight digits, not the numbers.';
function gAddError(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  let a = 2856, b = 1379, cols = [], key = 4235, g = 0;
  do {
    a = ri(1000, 7000); b = ri(1000, MAXN - a);
    key = a + b; cols = carryCols(a, b);
    g++;
  } while (g < 400 && !(cols.length >= 2 && ok(key) &&
           cols.every(c => { const v = addCols(a, b, c); const nc = noCarry(a, b);
             return ok(v) && ok(nc) && v !== key && nc !== key && v !== nc &&
                    a - b !== v && a - b !== nc &&
                    digitSum(a) + digitSum(b) !== v && digitSum(a) + digitSum(b) !== nc; })));
  const useAll = Math.random() < 0.5;
  const col = cols[0];
  const claim = useAll ? noCarry(a, b) : addCols(a, b, col);
  const oneText = ' forgot the carry in the ' + PLACES[col] + ' column.';
  const key_ = pron + (useAll ? ADD_NOCARRY : oneText);
  const wrongs = [pron + (useAll ? oneText : ADD_NOCARRY), pron + ADD_FILL_SUB, pron + ADD_FILL_SUM];
  return mcText(who + ' works out ' + a + ' + ' + b + ' and gets ' + claim + '. <b>What did ' +
    pron.toLowerCase() + ' do wrong?</b>', '', key_, shuffle(wrongs),
    'The answer is ' + a + ' + ' + b + ' = ' + key + ', not ' + claim + '. ' + key_ +
    ' Every column that makes ten or more hands one ten to the column on its left, and in this sum ' +
    cols.length + ' of the four columns do that: the ' + cols.map(c => PLACES[c]).join(', ') + '.');
}

/* FORMAT 7 - error spotting, CORRECT the mistake, numeric key (pool 3, ONE
   computation). The stem NAMES the slip, so the premise it states is true by
   construction and the harness re-derives the printed wrong answer from it.

   KILLED AND REVERTED (Sweep p3numbers Refutation, second pass, 2026-09-15).
   The v2 rebuild asked "how much bigger is her answer than the correct one?" to
   buy this slot a second computation. It bought a shortcut instead: the gap is
   smallFromBig(a,b) - (a - b), which is structurally the smallest of the four
   offered numbers, and "pick the smallest number on the screen" answered the
   item on 48,835 of 50,000 draws - 97.67%, against 0 / 20,000 for the same
   strategy on the form below. A child who could not subtract went from 25% to
   97.67%, and the mastery climb read that as pool-3 competence.

   So the question goes back to what it was, and the honest count goes with it:
   this is the ONE declared single-computation slot in pool 3. It is not padding
   - the misconception work is real and the printed claim is what that slip
   produces - but a child who just computes a - b gets it, and the file says so
   rather than claiming eleven two-step slots. What IS new is the option set:
   the slips now straddle the key by construction (see slipSet), so no magnitude
   strategy replaces the subtraction either. */
function gSubError(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  let a = 4003, b = 1568, key = 2435, claim = 3565, cols = [], cands = null, g = 0;
  do {
    a = ri(3000, MAXN); b = ri(1000, a - 2000);   /* key >= 2000: see gSubRegroup */
    key = a - b; claim = smallFromBig(a, b); cols = borrowCols(a, b);
    /* both sides and two at a time, per column: see gSubRegroup */
    cands = cols.length >= 2 ? slipSet(key,
      [claim].concat(twoAtATime(key, borrowOnes(cols)).map(p => p[0]))) : null;
    g++;
  } while (g < 200 && !(cols.length >= 2 && ok(key) && ok(claim) && claim !== key &&
           cands && optsOk(key, cands)));
  return mcNum(who + ' works out ' + a + ' − ' + b + '. In every column ' + pron.toLowerCase() +
    ' takes the smaller digit away from the bigger one, and gets ' + claim +
    '. <b>What is the correct answer?</b>', '', key, cands, '',
    'Taking the smaller digit from the bigger one in each column ignores which number is on top, and ' +
    'that is how ' + claim + ' appears. Done properly, the ' + PLACES[cols[0]] + ' column cannot give ' +
    'what is asked, so one is taken from the column on its left and turned into ten: ' + a + ' − ' + b +
    ' = ' + key + '. Check by adding back: ' + b + ' + ' + key + ' = ' + a + '.');
}

/* FORMAT 8 - two-step word problem, Singapore context (pool 3, 2 steps) */
const SHOP_CTX = [
  ['Chinatown market stall', 'packets of bee hoon'],
  ['Tampines library', 'books'],
  ['Jurong hawker centre', 'bowls of laksa'],
  ['Bishan bookshop', 'pencils'],
  ['Woodlands MRT ticket office', 'tickets'],
  ['Geylang Serai bazaar stall', 'kueh']
];
function gTwoStepWord(){
  const c = pick(SHOP_CTX);
  let first = 2145, more = 480, key = 4770, cands = null, g = 0;
  do {
    more = ri(120, 900);
    /* the range is set so that ALL THREE over-counting slips stay inside the
       ceiling; a slip filtered out for being out of scope would leave the key
       pinned at one end of the four printed numbers. */
    first = ri(1000, Math.floor((MAXN - 2*more) / 3));
    key = first + (first + more);
    /* stopping early and losing the "more" both land below the total, so the key
       was the second-largest of the four on every draw. Counting a month twice
       lands above it.

       W3, third pass: three slips below and two above still left the key NEVER
       the smallest of the four - 0.00% of 20,000 draws. The file declares and
       argues that shape ("every slip that stops early lands below the total"),
       and the argument is sound as far as it goes, but a declared free
       elimination is still a free elimination. `key + second` is the third slip
       above: a child who works out both months correctly and then adds this
       month's total on top of the two-month answer. */
    cands = slipSet(key, [
      first + more,        /* stopped after step 1 */
      first * 2,           /* forgot that this month sold more */
      first + 2*more,      /* added the difference instead of last month's total */
      key + more,          /* counted the extra a second time */
      key + first,         /* counted last month twice over */
      key + first + more   /* added this month's total on top of the answer */
    ]);
    g++;
  } while (g < 200 && !(ok(key) && ok(first + more) && cands && optsOk(key, cands)));
  const second = first + more;
  /* W5, SIXTH pass: the sentence used to tell the child that stopping after
     step 1 gives `second`, and slipSet left `second` off the options row on
     49.95% of draws - a two-step word problem sending the reader to look for a
     number that is not on the screen. */
  const why = slipWhy(cands, [
    [second, 'Stopping after step 1'],
    [first * 2, 'Forgetting that this month sold more'],
    [first + 2 * more, 'Adding the difference on top of this month instead of adding the two months'],
    [key + more, 'Counting the extra ' + more + ' a second time'],
    [key + first, 'Counting last month twice over'],
    [key + first + more, 'Adding this month on top of the two-month answer']
  ]);
  return mcNum('The ' + c[0] + ' sold ' + first + ' ' + c[1] + ' last month. This month it sold ' +
    more + ' more ' + c[1] + ' than last month. <b>How many ' + c[1] +
    ' altogether in the two months?</b>', '', key, cands, '',
    'Step 1 - this month: ' + first + ' + ' + more + ' = ' + second + ' ' + c[1] + '. Step 2 - the two ' +
    'months together: ' + first + ' + ' + second + ' = ' + key + '. ' + why[1] + ' gives ' + why[0] + '.');
}

/* FORMAT 9 - working backwards from the end (pool 3, 2 steps) */
const KEEP_CTX = ['stickers', 'marbles', 'trading cards', 'beads', 'stamps'];
function gBackFromTotal(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  const thing = pick(KEEP_CTX);
  let gave = 1240, got = 350, now = 2765, key = 3655, cands = null, g = 0;
  do {
    /* W3, FIFTH pass. "Pick the smallest option that is bigger than the biggest
       number printed in the stem" answered this item on 62.52% of 20,000 draws
       against 25% chance, because the start is bigger than the total (more was
       given away than was bought back) and every distractor that also beat the
       total sat ABOVE the key. The first half of that rule is the item's own
       reasoning and is not a bypass; the second half is an accident of which
       misconceptions happened to land where. `now + gave - 2*got` - taking the
       bought ones off twice over - is the one named slip that lands strictly
       BETWEEN the total and the key, and it only does so when `gave` beats twice
       `got`, which the old draw left to chance. It is now guaranteed, so the
       blocker is in scope on every draw, and it goes into `keepOne` PAIRED WITH
       an above-key slip: exactly one of the two is always offered, so the blocker
       appears about two draws in three (it is still in the family as well) while
       the side it lands on is a coin toss rather than a constant. It is NOT
       forced on its own: a distractor below the key on 100% of draws would mean
       the key is never the smallest of the four, and the two-sided rank floor v3
       added exists to forbid exactly that - it would trade a 62% surface rule for
       a 100% cross-out. What remains is declared in the note. */
    gave = ri(600, 2200); got = ri(150, Math.min(1200, Math.floor(gave / 2) - 1));
    now = ri(2500, 5000);
    key = now + gave - got;
    /* "undid the buying only" and "took both away" land below the start, "undid
       nothing" and "undid both the wrong way" land above it.

       W3, third pass: whether the fifth slip landed above or below the key
       depended on whether `got` beat `gave`, which it rarely does, so the key was
       the smallest of the four on only 7.04% of 20,000 draws. Two more slips -
       one each side, neither depending on the draw - make three a side on every
       draw: undoing a step TWICE is the same misconception in both directions. */
    cands = slipSet(key, [
      now + got - gave,        /* undid both steps the wrong way round */
      now + gave + got,        /* put both back instead of undoing the buy */
      now + gave,              /* undid the giving away and stopped */
      now + 2*gave - got,      /* put the given-away back twice over */
      now - got,               /* undid the buying and stopped */
      now + gave - 2*got,      /* took the bought ones off twice over */
      now - got - gave         /* took both away instead of undoing them */
    ], { keepOne: [now + gave - 2*got, now + gave] });
    g++;
  } while (g < 300 && !(ok(key) && gave !== got && 2*gave !== got && cands && optsOk(key, cands)));
  return mcNum(who + ' had some ' + thing + '. ' + pron + ' gave away ' + gave + ' of them, then ' +
    'bought ' + got + ' more. Now ' + pron.toLowerCase() + ' has ' + now +
    '. <b>How many ' + thing + ' did ' + pron.toLowerCase() + ' have at first?</b>', '', key, cands, '',
    'Start at the end and undo each step in reverse order. The last thing that happened was buying ' +
    got + ', so take those off: ' + now + ' − ' + got + ' = ' + (now - got) + '. Before that ' +
    gave + ' were given away, so put them back: ' + (now - got) + ' + ' + gave + ' = ' + key +
    '. Undoing means swapping the operation: + becomes −, and − becomes +.');
}


  MQI.registerTopic({
    id:'p3numbers', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Numbers up to 10 000: number notation, representations and place values (thousands, hundreds, tens, ones); comparing and ordering numbers; patterns in number sequences. Addition and Subtraction: addition and subtraction algorithms (up to 4 digits); mental calculation involving addition and subtraction of two 2-digit numbers",
    label:'Thousand Isles', short:'Numbers to 10 000', e:'🏝️',
    skills:{
      place:  {label:'Place value',
               tip:'Say the number out loud in parts: "four thousand, no hundreds, seven tens, six ones". The zero is the part children drop, and the digit is what they say when you ask what it is WORTH.'},
      compare:{label:'Comparing numbers',
               tip:'Compare left to right, one place at a time, and stop at the first place where the digits differ. Count the digits first: a 4-digit number always beats a 3-digit one.'},
      pattern:{label:'Number patterns',
               /* W2, SIXTH pass: this tip is RENDERED in the parent dashboard, and
                  it used to end "say whether it is a jump of tens, hundreds or
                  thousands" - impossible on 100% of gPatternOdd draws, whose step
                  is 15, 25 or 35. The jump the child has to name is now the SIZE,
                  which is what every pattern generator in this file actually asks. */
               tip:'Write the difference above each gap. If all the gaps match you have found the jump; then say how big it is - a jump of 10, 100 or 1000, or an in-between jump like 15, 25 or 250.'},
      addsub: {label:'Adding & subtracting',
               tip:'Line the columns up and work from the right. Ten in a column moves one place LEFT; if you cannot take away, take one from the left and turn it into ten. Check a subtraction by adding the answer back.'}
    },
    pools:{
      1:[[gStandsEasy,'place'],[gWhichDigit,'place'],
         [gGreatest,'compare'],[gCompareTrue,'compare'],
         [gPatternConcept,'pattern'],[gAddConcept,'addsub'],[gAddRegroup,'addsub']],
      2:[[gExpanded,'place'],[gBuildNum,'place'],[gSmallest,'compare'],[gBetween,'compare'],
         [gPattern4,'pattern'],[gMoreLess,'pattern'],[gSubRegroup,'addsub'],
         [gMissingAddend,'addsub'],[gMentalMake,'addsub']],
      3:[[gStandsCompare,'place'],[gStandsError,'place'],[gZeroFix,'place'],
         [gOrder,'compare'],[gCompareError,'compare'],
         [gPatternMissing,'pattern'],[gPatternOdd,'pattern'],
         [gAddError,'addsub'],[gSubError,'addsub'],[gTwoStepWord,'addsub'],[gBackFromTotal,'addsub']]
    }
  });
})();
