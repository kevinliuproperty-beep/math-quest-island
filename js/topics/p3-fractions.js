"use strict";
/* Math Quest Island topic: fractions (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 *
 * DEPTH SWEEP 2026-09-15 (Kevin's Q114 "Reshape": the depth-pilot contract goes
 * wide). Rebuilt from 12 generators / 22 masked shapes to 27 generators arranged
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
 *   - pool 3 added no solving step in 5 of 6 slots. Pool 3 is now 12 slots, 10 of
 *     them two-step, with two DECLARED single-step anchors (gMakeOne, gGreatest4)
 *     kept on purpose per the pilot's contract note 2.
 *
 * REFUTATION FIXES, v2 2026-09-15 (Sweep fractions Refutation). The kill and all
 * five wounds are answered in this file; each site carries its own comment.
 *   - KILL, gCompareError: the key was the only option not written "X should
 *     have ..." and was the longest, on 2,000 of 2,000 draws, in the topic's
 *     most-served item, out of six option sets. One frame, one length band, a
 *     rotating key, and 1,524 distinct stems in 2,000 draws. See FORMAT 3e.
 *   - W1, the feed serves by SKILL: gGreatest4 retagged `order` -> `compare`,
 *     and `order` and `wholes` each gain a second pool-3 format so no pool-3
 *     skill is a one-generator hog. See the pools block.
 *   - W2, the sample space was reported 24x too big: SIMPLE is the full
 *     denominator-12 table, the scale factor runs to 6, and gPickEquiv and
 *     gEquivFromBar both run their principle in BOTH directions.
 *   - W3, gAddError drew b === 1 in 73% of draws and printed an addend as the
 *     "wrong" answer in 32%: b draws 2-4 and the claims are filtered per draw.
 *   - W4, four wording/structure defects: the two smallest-bottom-number tells,
 *     gAlreadySimplest's card walking the wrong order, and the four complement
 *     generators that could never draw one half.
 *
 * REFUTATION FIXES, v3 2026-09-15 (Sweep fractions Refutation, SECOND PASS). Two
 * kills and four wounds; each site carries its own comment.
 *   - KILL 1, gCompareError RELOCATED: v2 removed the sentence-frame tell and put
 *     a NOUN tell in its place - the stem's stated reason named its belief with
 *     the same words the key used and nothing else on the row repeated them, so a
 *     pure word-matching policy scored 94.5% of 5,000 draws without a fraction
 *     being compared. Two of the three belief sentences now name both nouns and
 *     the never-true filler is PAIRED TO THE BELIEF, so at least two options
 *     always repeat the reason's vocabulary. Policy 94.5% -> 36.3%. RULE 8 gates
 *     it. See FORMAT 3e.
 *   - KILL 2, gEqMissingDen: all three authored distractors were provably below
 *     k x d, so "circle the biggest number on the row" answered it on 100.00% of
 *     50,000 draws. Distractors are drawn on both sides of the key now, and its
 *     twin gEqMissing no longer keys a non-extreme on every draw. See FORMAT 2c.
 *   - W1, THE VALUE-RANK CLASS - the one that reaches past this file. The
 *     authored-distractor contract produces one-sided distractor sets, which
 *     pinned the key to one rank by VALUE on 100.00% of draws in five generators.
 *     sided() / sidedNum() draw from both sides everywhere; RULE 7 in
 *     tools/gen-sanity.mjs gates the whole topic over its own 2,000 draws.
 *   - W2, gOrderGap did not discriminate: "pick the integer between the two
 *     printed" was right on 100.0% of draws and the backwards-rule child got the
 *     same answer as the correct one. The gap is now the smallest, middle OR
 *     greatest slot of the row, drawn evenly. Policy 100.0% -> 36.2%.
 *   - W3, three teaching cards denied their own key on a half-shaded bar
 *     (gPicIdentify 12.96%, gPicUnshaded 22.6%, gSubFromOne 26.0%). Each sentence
 *     is guarded and each is gated against the RENDERED bar. All three 0.00%.
 *   - W4, the corrections: the option length band on record was wrong;
 *     denominator 13 is banned outright (legalFrac + RULE 4); gMakeOneIn widened
 *     from 25 to 75 distinct stems by asking the same move three ways.
 *
 * REFUTATION FIXES, v4 2026-09-16 (Sweep fractions Refutation, THIRD PASS). One
 * kill and five wounds; each site carries its own comment. The sentence all three
 * refutations have now killed on is the same one: THE CHILD CAN BE RIGHT WITHOUT
 * DOING THE MATHEMATICS - and each time the item was one an earlier pass had
 * already written down as fine. Two of the six fixes below are therefore rules
 * rather than rewrites: a rule this file already had, run against every generator
 * in the file instead of the one it was written for.
 *   - THE KILL, gEqualParts: the key restated the stem's own second clause word
 *     for word and was the only option on the row containing "equal", "same",
 *     "size" or "all", so "pick the option that repeats the sentence you have just
 *     read" answered the declared pool-1 concept anchor on 100.00% of 20,000 draws
 *     out of eighteen option sets. Two earlier passes called it "the best item in
 *     the bank" and never ran the wording lens on it. The four sentences are
 *     rebuilt so every content word in the key is printed by some other option
 *     too; RULE 8, written for gCompareError and scoped to it BY NAME, now runs on
 *     every prose bank in the topic with the v3 set as its negative control.
 *     Policy 100.00% -> 0.0%. See FORMAT 1b.
 *   - W1, gCompareBar's picture was never needed: one option on the named side and
 *     three on the other makes the key the strict extreme, so "read greater/less
 *     and take that extreme, never look at the bar" scored 100.00% - in the one
 *     format whose reason for existing is pictorial support, sitting in RANK_EXEMPT
 *     under a printed reason ("the stem asks for an extreme") that was true of the
 *     four comparison formats beside it and false of it. The stem names two
 *     conditions now, one of which can only be counted off the bar; the generator
 *     is out of RANK_EXEMPT. Policy 100.00% -> 34%. See FORMAT 3b.
 *   - W2, the feed had never been simulated below 80% accuracy. tools/feed-sim.mjs
 *     prints a report-only 45% pass per topic; `fractions` serves pool 1 for 78.3%
 *     of a session there against 20.3% at 80%. Not a lane defect - js/core.js and
 *     the pool composition are out of fence - and it is on the record for the
 *     integrator as a fleet finding.
 *   - W3, gAddError stopped rotating: the numbers were drawn first and only the
 *     beliefs that survived were offered, so one sentence was the key on 53.6% of
 *     draws and was the uniquely SHORTEST option on exactly those draws. The
 *     BELIEF is drawn first now, evenly, and the three sentences are written to one
 *     length; RULE 6 reads both directions. 53.6% -> 33%. See FORMAT 4g.
 *   - W4, the over-12 denominators had migrated undeclared (gSubSame 0.0% ->
 *     39.8%, gSubRelated 0.0% -> 40.1%, ceilings 12 -> 24). The readability cap of
 *     24 is gone: TWELVE is the whole rule, everywhere, gated with a negative
 *     control. No named belief is lost - each one that used to overshoot is either
 *     reachable at a smaller bottom number or named in WORDS on the card.
 *   - W5, RULE 7 had a cap and no floor, and its policy cap skipped one rank. A
 *     12% FLOOR and "second smallest" go in, and three generators are widened to
 *     clear them (gAddRelated 7.4% -> 26%, gSubSame 8.4% -> 17%, gEqMissing 11.0%
 *     -> 15%). The three `wholes` formats that shared one 335-entry answer space
 *     exactly are separated (Jaccard 100% -> 31.2 / 19.9 / 35.5%). And sided()
 *     itself carried two bugs the gates were fighting each other over: a
 *     cross-side fallback swap that silently moved a distractor from below the key
 *     to above it, and a value-dedupe that kept whichever of two equal candidates
 *     was shuffled first rather than the one written in smaller pieces.
 *
 * REFUTATION FIXES, v6 2026-09-16 (FIFTH PASS: 2 KILLED, 4 WOUNDED). The PM's
 * wave-1 law: four-sentence prose concept checks are STRUCTURALLY tell-prone, and
 * a fourth wording fix on the same generator would be a fourth new regularity.
 *   - KILL 1, gEqualParts, fourth consecutive pass. The v5 remedy WAS the tell:
 *     writing every key token into some distractor made the key the only option
 *     with no word of its own, which answered the declared pool-1 concept anchor
 *     on 100.00% of 40,000 draws while RULE 9 measured it at 0.00% and passed it.
 *     The prose form is RETIRED. It is a picture item now - a bar of k equal
 *     pieces, every piece cut into n equal parts in the stem, and the answer is
 *     how many equal parts the whole has - with four bare part counts on the row,
 *     so there is no lexical axis left to attack. See FORMAT 1b.
 *   - KILL 2, gCompareError, third pass on this generator: the row named its own
 *     key with the stem covered up, 54 rows / 54 keys / 100.00%, because the
 *     fourth option was drawn from a bank PAIRED to the belief. The pairing is
 *     gone and so is the filler: FOUR real beliefs, all four on every row, and the
 *     fingerprint moves off the WORDS of the child's reason and onto the two
 *     numbers it prints, which name a belief only in the light of the two printed
 *     fractions. Row-only 100.00% -> 25.1% (chance); the printed fractions change
 *     the answer on 83.9% of draws. See FORMAT 3e.
 *   - W1, STEM-OPTION COUPLING, a class no rule in this repo had ever measured:
 *     "keep the bottom number the question gives you" isolated the key on 48.7% of
 *     gSubSame's draws (74.3% accuracy), 45.1% of gPicUnshaded's, 40.9% of
 *     gMakeOne's, and answered gSubFromOne at 63.1% and gPicIdentify at 61.5%.
 *     One or two of the three seats now go to a named belief written over the
 *     stem's own bottom number - see sameDen() - so the rule leaves two or three
 *     options and the tops have to be counted. ISOLATING RATE 0.00% in all five.
 *   - W2, DIGIT OVERLAP, the value-rank class one level down: "pick the option
 *     whose top and bottom number are both printed elsewhere on the row" isolated
 *     the key on 74.3% of gMakeOneIn's draws and 66.9% of gAddSame's, because
 *     every named belief is the key with ONE number nudged. digitIsolatesKey()
 *     bans the key from being the unique option with no numeral of its own, and
 *     both banks gain slips written with FRESH numerals. 0.00% in seven banks.
 *   - W4, cards naming a wrong answer the child cannot see: gPickEquiv walked a
 *     slip that was not on its row on 82.3% of draws. The value is printed where
 *     it is offered and the slip is named in words where it is not. 0.00%.
 *   - sided() takes a `must` LIST and a forced rank (forceU), because a filter
 *     applied AFTER a free seating does not leave a free seating behind: the two
 *     new bans alone took gAddSame to 58.6% key-smallest and gSubSame to 3.2%
 *     key-largest. Seven banks draw the rank first now and RULE 7 is flat by
 *     construction - every rank inside 23.9-26.1% at 4,000 draws.
 *   - THE TWO NEW GATES, which are the deliverable: RULE 9 gains its COMPLEMENT
 *     clause (the key may not be the unique option with no word of its own), and
 *     RULE 11, THE ROW-ONLY RULE, says no bank's key may be named by its option
 *     row alone, stem discarded, over a row space small enough to memorise. Three
 *     more negative controls, all red: the v5 gEqualParts row on both new clauses
 *     and the v5 gCompareError row on RULE 11.
 *
 * REFUTATION FIXES, v7 2026-09-16 (SIXTH PASS: 2 KILLED, 4 WOUNDED). THE PM'S
 * RULING, and it is final for these two banks: gEqualParts and gCompareError have
 * each now been killed on EVERY AXIS THIS FILE HAS A RULER FOR, across six passes
 * - sentence frame, noun overlap, single word, word-set complement, paired filler,
 * the stem's one numeral, the printed glyphs of the arithmetic - and each fix
 * moved the tell rather than removing it. BOTH ARE RETIRED FROM THE TOPIC. Five
 * passes on one generator and four on another are a structural finding about the
 * FORMAT, not a wording defect, and the seventh rewrite would be the seventh new
 * regularity. The two slots are refilled, the generator count is unchanged at 27,
 * and the two retirement sites carry the whole argument and the measured numbers.
 *   - KILL 1, gEqualParts, RETIRED (fifth consecutive pass). The v6 numeric
 *     rebuild closed the lexical axis completely and correctly and opened a
 *     STEM-RECALL axis the file had no ruler for: the stem printed exactly ONE
 *     numeral and, under the declared k x n <= 10 cap, a FOUR-LINE TABLE over that
 *     numeral (2->8, 3->6, 4->8, 5->10) answered the declared pool-1 concept
 *     anchor on 65.52% / 66.42% of 20,000 draws on two seeds. The bar was never
 *     counted. Its pool-1 `identify` slot goes to FORMAT 1b, gPicTakeAway: a
 *     fraction read off the bar after one step, with the bar's part count - the
 *     key's bottom number - in no word of the stem, and TWO numerals in the stem
 *     so that no single one can name the key.
 *   - KILL 2, gCompareError, RETIRED (fourth pass on this generator). The v6
 *     rebuild moved the fingerprint onto the two numbers the child's mistake
 *     prints, and for two of the four beliefs that output is a numeral already on
 *     the screen - so a FOUR-CLAUSE RULE WITH NO ARITHMETIC IN IT (numeral
 *     identity, then digit count) answered it on 91.84% / 91.19% of 20,000 draws
 *     on two seeds. An error-spotting item must print the evidence it asks about,
 *     so the surface can be moved but not removed. Its pool-3 `compare` slot goes
 *     to FORMAT 3e, gBetween: "which of these is between X and Y" over related
 *     bottom numbers, two steps, rank-gated, numeric - no sentence to recognise.
 *   - THE THREE NEW GATES, which are the deliverable. tools/gen-sanity.mjs gains
 *     RULE 12, THE STEM-ONLY RULE (a bank that draws a PICTURE may not be answered
 *     from the numerals of its stem alone on >= 60% of draws, row and figure
 *     discarded; the six-row stem table is measured on every bank and declared);
 *     RULE 13, THE GLYPH RULE (no key may be SETTLED on >= 60% by numeral
 *     identity, numeral membership and digit count, with no arithmetic anywhere);
 *     and RULE 11's SHAPE CLAUSE (the memorisable test counts masked row SHAPES,
 *     not rows). Negative controls: the v6 gEqualParts stem, the v6 gCompareError
 *     row and the v6 gAddSame row, all three red.
 *   - W1, THE ROW-SHAPE CLASS. gAddSame - 677 rows, exempt under the old rule -
 *     had EIGHTEEN masked shapes, every one naming the key's slot on 100.0% of
 *     held-out draws at 5.18 served items a session. Its candidate bank is widened
 *     over bottom numbers d-2 .. d+2 and the coupling seat goes in: 18 shapes ->
 *     31, 100.0% -> ~90%, and the rest of the class is declared with its numbers
 *     on RULE 11's printed 40% watch line (twelve banks, 4 to 123 shapes).
 *   - W3, gEquivFromBar printed "1 of them ARE blue" on 22.8% of draws. Fixed with
 *     a ternary, and the harness gains a PROSE AGREEMENT clause that reads every
 *     rendered stem, option and teaching card in the topic - the first grammar
 *     ruler in this repo - with that sentence as its control.
 *   - W2, OUT OF LANE AND FOR THE INTEGRATOR, one line: js/core.js line 387,
 *     `qIdentity` builds `q.q + '|' + extra + '|' + q.choices.join('')` with the
 *     choices in DISPLAY order, and every mc* helper shuffles - so the same stem
 *     with the same four options reshuffled is a different key to the feed's
 *     `seen` set and the same question to the child. The fix is `.slice().sort()`
 *     inside qIdentity and it changes every topic in the game, which is why this
 *     lane does not make it. Measured here through the real createFeed and the
 *     app's own climb, 500 sessions x 30 items on each of two seeds: 0 / 15,000
 *     under the feed's own identity, and 33 / 35 per 15,000 at 80% accuracy and
 *     56 / 54 at 45% once the option row is compared as a SET. The residual list
 *     has carried this as "closed" for two passes; it is not.
 *   - RULE 13 also caught gAddError at 76.8% on its first run: `bottoms` was the
 *     one belief whose claim was not written over the stem's own bottom number, so
 *     ONE glyph test split the three beliefs before a fraction was read. It comes
 *     off the claim bank and stays on the row as a never-true sentence; `gap`
 *     takes its place; two never-true fillers now rotate independently of the
 *     belief. 76.8% -> 50.7%, row space 6 -> 12.
 *
 * REFUTATION FIXES, v8 2026-09-16 (SEVENTH PASS: 2 KILLED, 3 WOUNDED). Both kills
 * were holes in the INSTRUMENTS rather than in the authoring, which is why the
 * deliverable is a rule and a gate rather than a rewrite.
 *   - KILL 1, gPicTakeAway: THE PREMISE THE v7 REFILL WAS BUILT ON WAS FALSE. "The
 *     bar's part count appears in no word of the stem" is true and does NOT make
 *     the picture load-bearing: the child never had to DETERMINE the bottom number,
 *     only to discriminate it, and "the answer's TOP number is a - g" - one
 *     subtraction on the two numerals the stem printed - was true on 100.00% of
 *     draws, isolated the key on 59.6 / 59.0%, answered the item at 79.6 / 79.2%
 *     with the ties guessed and 88.7 / 88.8% once the bottom number printed twice
 *     (a seat sameDen() is REQUIRED to fill) broke them. The bar was never counted,
 *     at 3.42 / 3.54 items a session to a struggling child. THE REBUILD: the stem
 *     prints NO NUMERAL AT ALL - the take-away is a word, the blue count and the
 *     part count are both in the picture - so both halves of the key are counted
 *     off the bar and there is nothing to write an expression over. The oracle
 *     asserts that emptiness directly. Half the draws also seat every slip over the
 *     bar's own part count, which collapses to one masked row shape whose key slot
 *     is the value rank RULE 7 already draws evenly: composed stem-recall o
 *     row-shape 69.0 / 71.6% -> 45.6 / 45.7%, stem arithmetic 14.7% -> 0.0%.
 *   - KILL 2, gSubRelated's teaching card rendered fr(a-b, D-d) - a NEGATIVE
 *     numerator on 49.97 / 50.70% of draws and a zero one on 15.19 / 14.36%.
 *     Negative numbers are Secondary 1 content: a scope leak, on the highest
 *     salience surface in the app, INHERITED from 11b5ce5 and earlier. Six passes
 *     walked past it because every fraction regex in tools/gen-sanity.mjs was
 *     (\d+) and a minus sign is not a digit. The belief is named in words at the
 *     site; the harness reads (-?\d+) everywhere and gains THE SIGN GATE over every
 *     bank in the GAME (277 bank slots, all topics), with the v7 card as its
 *     control.
 *   - THE DELIVERABLE, RULE 14, THE HALF-KEY RULE: no bank may have one half of its
 *     key - numerator or denominator - named by a single expression over the stem's
 *     numerals to the point where the OPTION ROW then settles the item on >= 60% of
 *     draws, unless that expression IS the item's own declared mathematics, named
 *     in an exemption list keyed to the (bank, expression) PAIR. Six declared
 *     methods; three controls, including one proving the exemption does not travel
 *     to another expression and one proving the rule does not fail the item working.
 *   - W2, THE CARD-ROW CLAUSE: seven banks ended their teaching card by naming a
 *     WRONG ANSWER the child could not see, because the sentence names a CANDIDATE
 *     and sided() seats three of a dozen - gSimplest 58.6%, gEquivFromBar 52.3%,
 *     gMakeOneIn 49.8%, gSubRelated 27.3%, gPickEquiv 26.8%, gSimplestError 25.5%,
 *     gSubSame 2.2%. All seven fixed at their sites and GATED at zero. gPickEquiv's
 *     is the one the class hides: its v5 ternary asked whether the candidate's
 *     VALUE was on the row and then printed the candidate's OWN form, while uniq()
 *     seats whichever equal-valued candidate is written in bigger pieces - the card
 *     said "2/8" over a row showing "1/4".
 *   - W1, THE COMPOSED ROUTE, widened and DECLARED. gSubRelated and gAddRelated
 *     take the same flat row family: masked shape 97.4 -> 72.2% and 88.8 -> 80.4%,
 *     composed 98.3 -> 82.8% and 93.1 -> 86.0%. It cannot reach the refutation's
 *     60% in this lane and the arithmetic says why: gSubRelated has 27 distinct
 *     stems and 27 keys, so FULL stem recall answers it on 100.0% by itself. The
 *     stem-space class is wave 2 and out of fence.
 *   - W3, gBetween's 107-stem space: DECLARED with its enumeration at the site.
 *     108 shapes is the COMPLETE set of P3-legal related pairs with two or more
 *     twelfths of room; relaxing to one interior value reaches 150, still short of
 *     200, and every stem it adds names its own key. Full-table recall 56.7 /
 *     56.8%, under the 60% line.
 *
 * THE FOUR PRINCIPLES
 *  1. WHAT A FRACTION NAMES. A fraction names equal parts of one whole: the
 *     bottom number says how many EQUAL parts the whole was cut into, the top
 *     number how many of them you have.
 *       gPicIdentify, gPicTakeAway, gPicUnshaded
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
 *       gBetween, gGreatest4, gOrderThree, gOrderGap
 *  4. ADDING AND SUBTRACTING WITHIN ONE WHOLE. The bottom number is the SIZE of
 *     the piece, so it does not move; only the tops are counted. When the pieces
 *     are different sizes (related fractions), change one fraction into an
 *     equivalent one first.
 *       gAddSame, gSubSame, gSubFromOne, gMakeOne, gMakeOneIn,
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
 *   gPicTakeAway, naming a fraction of a whole from a picture: that is P2 content,
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
/* SECOND PASS 2026-09-15, W3(a) / W4. THIRTEEN is banned outright. MOE P3 stops at
   twelve, and no named misconception in this bank can produce a 13: adding the two
   bottom numbers of a like pair gives 2d (even), adding a related pair gives
   d(1+k), subtracting them gives d(k-1), and taking one away gives d-1. The only
   things that reached 13 were the "+1" second-order slips - the half-substitute
   [n, d+1] at d = 12, gSubSame's [a-b, d+b] and gSimplestError's [N+t, D+t] - which
   put an off-P3-list bottom number in front of a child for no teaching reason at
   all, including in the declared pool-1 anchor. */
/* THIRD PASS 2026-09-16, W4. TWELVE IS NOW THE WHOLE CAP, and the 24 readability
   allowance is gone. The v3 note led with "denominator 13 is banned outright" and
   kept 24 for the named overshoot beliefs, which read as a tightening - while the
   ceiling actually ROSE undeclared in four formats, because sided() reaches for an
   overshoot candidate to break the one-sided rank and the overshoot a subtraction
   bank has is [a-b, 2d] and [a-b, d+b]. gSubSame and gSubRelated went from 0.0% of
   options over 12 to 39.8% and 40.1%, ceiling 12 -> 24, in a note whose own table
   said 0%. Rather than re-declare a moving ceiling a third time, EVERY rendered
   fraction in this file - stem, option, teaching card and figure - is now inside
   the P3 denominator limit of 12, and tools/gen-sanity.mjs RULE 4 gates it with a
   negative control. No named belief is lost: each one that used to overshoot past
   12 is either still reachable at a smaller bottom number (gAddError draws the
   belief FIRST and then numbers that fit it) or is now named IN WORDS on the
   teaching card instead of being rendered as an off-syllabus fraction. */
function legalFrac(p){
  return Array.isArray(p) && p.length === 2 &&
         Number.isInteger(p[0]) && Number.isInteger(p[1]) &&
         p[0] >= 1 && p[1] >= 2 && p[0] < p[1] && p[1] <= 12;
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
/* ---- THE VALUE-RANK BAN --------------------------------------------------
   SWEEP FRACTIONS REFUTATION, SECOND PASS 2026-09-15, KILL 2 + WOUND 1. Sorted by
   VALUE, the key sat at one fixed rank on 100.00% of 50,000 draws in five of these
   generators - gAddSame 3rd of 4, gEquivFromBar 2nd, gSubSame smallest,
   gSubRelated 3rd, gEqMissingDen LARGEST - and gEqMissing keyed a non-extreme on
   100.00%, which halves its row. Between them they covered 5.4 of every 30 served
   items, and "circle the biggest number on the row" answered gEqMissingDen every
   single time without a fraction being read.

   The cause is the contract this file is proudest of. Key plus exactly three NAMED
   beliefs, padding branch provably dead, means the distractor set is whatever the
   misconceptions produce - and a misconception errs in ONE direction, so the three
   of them land on one side of the key and the rank collapses. Nothing in the repo
   could see it: gen-sanity gated option FORM, SENTENCE FRAME and LENGTH, never
   magnitude.

   sided() is the fix and it is the same shape in every generator below. The
   generator hands over EVERY candidate its bank can name; the helper sorts them by
   value against the key and takes u of the three from above and 3-u from below,
   with u drawn evenly over whatever the two sides can actually supply. Where a
   misconception is inherently one-sided (adding like fractions has no named belief
   that overshoots) the bank is backed by a DOCUMENTED second-order slip on the
   other side - one piece too many or too few, which is the miscount a child makes
   on top of the belief, and which the teaching card already names. Every slip is
   still authored, still legal, still distinct in value; only WHICH three are put on
   the row moves. tools/gen-sanity.mjs RULE 7 gates the result over the whole topic.

   Returns null when one side cannot supply its share, and the caller's retry loop
   redraws - exactly as it already does for slipsOk. */
/* FIFTH PASS 2026-09-16. `forceU` is the fourth argument and the same device the
   two completion banks already use through sidedNum: the CALLER draws the key's
   value rank first and the helper must seat it or return null. It is needed
   wherever a NEW filter sits outside sided() - the stem-denominator seats of
   wound 1 and the digit-overlap ban of wound 2 both reject rows after the seating
   is drawn, and a filter applied after a free draw does not leave a free draw
   behind: gAddSame went to 58.6% key-smallest and gSubSame to 3.2% key-largest
   under exactly that effect. With the rank drawn first the retry loop redraws the
   NUMBERS until the rank it asked for can be seated, so RULE 7 comes out flat by
   construction rather than by luck. */
function sided(key, cands, must, forceU){
  const ok = c => Array.isArray(c) && legalFrac(c) && !sameVal(c, key);
  /* THIRD PASS 2026-09-16. When two named candidates are worth the SAME amount -
     gSimplest names both [N-t, D-t] and [n-1, d-1], which at 9/12 are 6/9 and 2/3 -
     the shuffle used to keep whichever came first, and half the time that was the
     one with the BIG bottom number. The row was then entirely over the key's own
     bottom number and "pick the smallest bottom number" scored 41.1%. Same amount,
     same belief, so the one written in the smaller pieces is kept. */
  const uniq = arr => {
    const out = [];
    for (const c of arr){
      const i = out.findIndex(s => sameVal(s, c));
      if (i < 0) out.push(c);
      else if (c[1] < out[i][1]) out[i] = c;
    }
    return out;
  };
  /* ... and wherever the bank can supply one, one option carries a bottom number
     UNDER the key's, so "pick the smallest bottom number" - the heuristic the first
     refutation wounded gEquivFromBar and gSimplestError for - cannot answer the
     item either. Each side is ordered small-bottom-number first so the rank draw
     seats one by itself; only when the whole row still sits over the key's bottom
     number is one swapped in, and then from the same side wherever possible. */
  const small = arr => arr.filter(c => c[1] < key[1]).concat(arr.filter(c => c[1] >= key[1]));
  /* FOURTH PASS 2026-09-16, W4(a). `must` is a named belief the caller will not let
     the value-rank draw drop. gAddWords' stop-after-step-1 answer - the single most
     diagnostic wrong answer a two-step word problem has - fell from being offered on
     65.3% of draws at v3 to 35.3% at v4, silently, because sided() reaches for
     whichever candidates balance the row and this one is only sometimes among them.
     It is seated first now, and the rank is balanced around it with the other two. */
  /* FIFTH PASS 2026-09-16, WOUND 1. `must` is now a LIST, because the stem-option
     coupling fix needs more than one seat held at a time: at least one option has
     to be written over the STEM'S OWN bottom number so that "keep the bottom
     number the question gives you" cannot isolate the key, and the value rank
     still has to come out flat around it. A single pair is still accepted, so
     gAddWords' `must` call is unchanged. */
  const mustList = (Array.isArray(must) && Array.isArray(must[0]) ? must : (must ? [must] : [])).filter(ok);
  const M = [];
  for (const c of mustList) if (M.length < 3 && !M.some(s => sameVal(s, c))) M.push(c);
  const drop = c => !M.some(s => sameVal(s, c));
  const above = small(uniq(shuffle(cands.filter(c => ok(c) && drop(c) && c[0]*key[1] > key[0]*c[1]))));
  const below = small(uniq(shuffle(cands.filter(c => ok(c) && drop(c) && c[0]*key[1] < key[0]*c[1]))));
  if (M.length){
    const hi = M.filter(c => c[0]*key[1] > key[0]*c[1]).length, lo = M.length - hi;
    const seat = u => {
      const a = u - hi, b = (3 - u) - lo;
      return (a >= 0 && b >= 0 && a <= above.length && b <= below.length)
        ? M.concat(above.slice(0, a)).concat(below.slice(0, b)) : null;
    };
    if (Number.isInteger(forceU)) return seat(forceU);
    const opts = [];
    for (let u = 0; u <= 3; u++) if (seat(u)) opts.push(u);
    return opts.length ? seat(pick(opts)) : null;
  }
  const us = [];
  for (let u = 0; u <= 3; u++) if (u <= above.length && 3 - u <= below.length) us.push(u);
  if (Number.isInteger(forceU) && us.indexOf(forceU) < 0) return null;
  if (!us.length) return null;
  const u = Number.isInteger(forceU) ? forceU : pick(us);
  const out = above.slice(0, u).concat(below.slice(0, 3 - u));
  /* THIRD PASS 2026-09-16, W5. This swap used to fall back to replacing the LAST
     seated candidate when no same-side alternative existed, which silently moved a
     distractor from below the key to above it - and every key already in its
     simplest form with a top number of 1 has nothing below it carrying a smaller
     bottom number, so the fallback fired on exactly those draws and converted the
     all-below seating into a one-above one. gSimplestError keyed the LARGEST of
     four on 13.1% and the 2nd largest on 38.6% for that reason alone: a gate
     against the bottom-number heuristic was quietly undoing the value-rank one.
     The swap is side-preserving now, and where no same-side alternative exists the
     row is left as drawn - the bottom-number policy is separately capped and
     separately measured by RULE 7. */
  if (out.every(c => c[1] > key[1])){
    const hi = c => c[0]*key[1] > key[0]*c[1];
    const pool = above.concat(below).filter(c => c[1] < key[1]);
    for (let i = out.length - 1; i >= 0; i--){
      const alt = pool.find(c => hi(c) === hi(out[i]) && !out.some(s => sameVal(s, c)));
      if (alt){ out[i] = alt; break; }
    }
  }
  return out;
}
/* The same, for the two bare-integer banks (the missing numerator / denominator).

   FOURTH PASS 2026-09-16, W2. The readability cap here was 24, on the reasoning
   that a bare number a child only has to recognise as wrong need not be inside the
   syllabus. It is not: these two banks are the ONLY place in the file where the
   option IS a bottom number, and gEqMissingDen offered one past 12 on 51.3% of
   draws, largest 22 - "3/4 = 9/?" with 18 on the row - while the v4 note's headline
   was "the highest bottom number rendered anywhere is 12". RULE 4 could not see it,
   because it scans rendered <span class="frac"> fractions and this option is the
   string "18".

   `lim` is now passed in by the caller and is the number the OPTION would put into
   the stem's blank: 12 for a missing denominator, and the completed bottom number
   minus one for a missing numerator, which keeps the completed fraction proper.
   tools/gen-sanity.mjs RULE 4 reads the completion row the same way.

   `forceU` is the second half. Capping the options costs the bank its room above
   the key - when the answer is 12 there is nothing legal above it at all - so the
   rank can no longer be left to fall out of whatever the bank supplies. The CALLER
   draws the key's rank first and passes the seating it needs; a draw that cannot
   supply it returns null and the caller redraws. The cap wins and the rank is
   bought back with the stem space, which is declared in the lane note. */
function sidedNum(key, cands, lim, forceU){
  const cap = Number.isInteger(lim) ? lim : 24;
  const ok = c => Number.isInteger(c) && c >= 1 && c <= cap && c !== key;
  const above = shuffle([...new Set(cands.filter(c => ok(c) && c > key))]);
  const below = shuffle([...new Set(cands.filter(c => ok(c) && c < key))]);
  const seat = u => (u <= above.length && 3 - u <= below.length)
    ? above.slice(0, u).concat(below.slice(0, 3 - u)) : null;
  if (Number.isInteger(forceU)) return seat(forceU);
  const us = [];
  for (let u = 0; u <= 3; u++) if (seat(u)) us.push(u);
  if (!us.length) return null;
  return seat(pick(us));
}

/* ---- THE STEM-OPTION COUPLING BAN -----------------------------------------
   SWEEP FRACTIONS REFUTATION, FIFTH PASS 2026-09-16, WOUND 1. Nothing in this
   repo had ever compared an OPTION to the STEM. Measured, "keep the bottom number
   the question gives you" answered gSubSame on 74.3% of draws and ISOLATED the key
   - exactly one option written over the stem's own bottom number, and it the right
   one - on 48.7%; gPicUnshaded 72.3 / 44.7 over the bar's part count, gMakeOne
   68.8 / 40.2, gSubFromOne 62.9, gPicIdentify 61.1. Five banks over the 60%
   ceiling this file uses for RULE 9 and RULE 10, and a child running it never
   counts the tops at all.

   It is the direct cost of RULE 7's cure: sided() deliberately seats an option
   with a bottom number UNDER the key's to break the smallest-bottom heuristic, and
   spreading the denominators is precisely what makes "keep the stem's bottom
   number" discriminate. The two gates pull against each other, so the answer is
   not to stop spreading them but to make sure the stem's own bottom number is
   never a lone signal: one or two of the three seats go to a named belief written
   over the SAME bottom number the stem prints, drawn per item so the count itself
   carries no information. The rule then leaves the child two or three options and
   the second half of the item - counting the tops - has to be done.

   Returns 1 or 2 candidates for sided()'s `must` list, or [] when the bank cannot
   supply one (the caller's retry loop redraws). */
function sameDen(cands, d, key){
  const pool = shuffle(cands.filter(c => Array.isArray(c) && legalFrac(c) && c[1] === d && !sameVal(c, key)));
  if (!pool.length) return [];
  return pool.slice(0, pool.length > 1 && Math.random() < 0.5 ? 2 : 1);
}

/* ---- THE DIGIT-OVERLAP BAN ------------------------------------------------
   SWEEP FRACTIONS REFUTATION, FIFTH PASS 2026-09-16, WOUND 2. A second row-only
   class, mathematics-free and over the ceiling: "pick the option whose top number
   and bottom number BOTH appear somewhere else on the row" isolated the key and
   was right on gMakeOneIn 74.6% of draws and gAddSame 66.8%. The cause is the
   house style for a named belief - write the key with ONE number nudged by one -
   which leaves every distractor carrying a numeral of its own while the key
   carries none. It is the value-rank class one level down: RULE 7 gates where the
   key sits by VALUE and nothing gated where it sits by DIGIT.

   The ban is the smallest one that closes it: the key may not be the UNIQUE option
   both of whose numerals are printed elsewhere on the row. Either no option has
   that property, or at least two do, and then the rule leaves a guess. */
function digitIsolatesKey(key, slips){
  const row = [key].concat(slips);
  const twin = i => {
    const others = [];
    for (let j = 0; j < row.length; j++) if (j !== i) others.push(row[j][0], row[j][1]);
    return others.indexOf(row[i][0]) >= 0 && others.indexOf(row[i][1]) >= 0;
  };
  if (!twin(0)) return false;
  for (let i = 1; i < row.length; i++) if (twin(i)) return false;
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

/* WOUND 2 (Sweep fractions Refutation 2026-09-15). This was an eleven-entry table
   of the simplest-form fractions with a denominator to 6, and every equivalence
   format drew its STEM from it - which is why gPickEquiv had ELEVEN distinct
   stems in 50,000 draws, not the 432 the lane reported (the lane counted the 4!
   orderings of the option row as distinct questions).

   SIMPLE is now the whole table to denominator 12 (45 entries), for the formats
   that only need a fraction already in its simplest form. SCALABLE is the
   sub-table that can still be scaled UP without leaving the P3 denominator cap,
   and the scaling formats draw from that. The scale factor now runs to 6 rather
   than 4, which is the other half of the refuter's fix: it puts 5/10 and 6/12 on
   the table, so the reducible-fraction space is the full 21 that exist at or
   below denominator 12 rather than 19. */
const SIMPLE = [];
for (let d0 = 2; d0 <= 12; d0++) for (let n0 = 1; n0 < d0; n0++) if (gcd(n0, d0) === 1) SIMPLE.push([n0, d0]);
const scalesFor = d => { const ks = []; for (let k = 2; k <= 6; k++) if (k * d <= 12) ks.push(k); return ks; };
const SCALABLE = SIMPLE.filter(b => scalesFor(b[1]).length > 0);


/* ===========================================================================
   PRINCIPLE 1 - WHAT A FRACTION NAMES
   =========================================================================== */

/* FORMAT 1a - direct read off a picture (pool 1, 1 step). THE DECLARED ANCHOR of
   pool 1: one fluency item per pool is deliberate, per the pilot's contract
   note 2. */
function gPicIdentify(){
  let d = 8, n = 3, key = [3,8], slips = [[5,8],[3,7],[4,8]], g = 0;
  const rank = ri(1,4);   /* FIFTH PASS: the rank first, then numbers that seat it */
  do {
    d = ri(3,12); n = ri(1,d-1);
    key = [n,d];
    /* WOUND 4 (refutation 2026-09-15): the complement distractor [d-n, d] is worth
       the KEY exactly when d === 2n, so slipsOk() rejected every half-shaded draw
       and the bar was never cut in half in 20,000 draws - the first fraction a P3
       child owns, missing from the declared pool-1 fluency anchor.

       SECOND PASS, W3(a): the substitute used when the bar IS half shaded was
       [n, d+1], which printed a bottom number of THIRTEEN on the option row of the
       declared pool-1 anchor whenever d = 12 - the first off-P3-list denominator
       ever to reach it, and one no named misconception produces (doubling gives an
       even bottom, adding the two bottoms gives d(1+k), taking one away gives
       d-1). The wrong-bottom-number belief is only offered while it stays inside
       the syllabus; "one blue piece too few" covers the other case.

       SECOND PASS, WOUND 1: the three slips used to be fixed, which pinned the
       key's value rank. Every candidate the bank can name goes to sided() now. */
    /* THIRD PASS 2026-09-16, W5. Only two of the five candidates sit above the key
       on a typical draw, so sided() could seat three-above (key smallest) almost
       never and two-above (key 2nd smallest) almost always: 15.5 / 39.7 / 23.8 /
       21.0, and the 2nd-smallest rank was the one RULE 7's policy cap did not
       cover. The two "a piece AND a part miscounted" entries the complement
       formats already name are added here, one on each side, so all four seatings
       are reachable on a typical draw. */
    /* FIFTH PASS 2026-09-16, W1: one or two of the three seats go to a belief
       written over the BAR'S OWN part count, so "pick the option with the
       picture's bottom number" cannot isolate the key. See sameDen(). */
    const cands = [
      [d-n, d],                       /* read the white part instead of the blue */
      [n, d-1], [n+1, d],             /* miscounted the parts / the blue pieces, one too few */
      [n-1, d],                       /* miscounted the blue pieces, one too many */
      [n+1, d-1],                     /* a blue piece too many AND a part too few */
      [n-1, d-1],                     /* a blue piece too few AND a part too few */
      (d < 12 ? [n, d+1] : null)      /* counted a part that is not there */
    ].filter(Boolean);
    slips = sided(key, cands, sameDen(cands, d, key), 4 - rank) || [];
    g++;
  } while (g < 200 && !(slipsOk(key, slips) && !digitIsolatesKey(key, slips)));
  if (!slipsOk(key, slips)){ d = 8; n = 3; key = [3,8]; slips = [[5,8],[3,7],[4,8]]; }
  return fig(mcFrac('What fraction of the bar is <b>blue</b>?', key, slips,
    'The bar is cut into ' + d + ' equal parts, and ' + n + ' of those parts ' + (n === 1 ? 'is' : 'are') + ' blue. ' +
    n + ' out of ' + d + ' equal parts is ' + fr(n,d) + '. Count all the parts first for the bottom number, ' +
    'then count only the blue ones for the top number.' +
    /* SECOND PASS, W2: this closing sentence named fr(d-n, d) as "the part that is
       NOT blue" - and when the bar is half shaded that fraction IS the key, so the
       card told the child the right answer was the wrong part on 12.96% of draws.
       It is printed only where it is true of a DIFFERENT fraction. */
    (d === 2*n ? ' Here exactly half the bar is blue, so the part that is not blue is ' + fr(d-n,d) + ' as well.'
               : ' ' + fr(d-n,d) + ' is the part that is NOT blue.')),
    bar(d, n));
}

/* FORMAT 1b - concept check: the parts must be EQUAL (pool 1, 1 step).
   Nothing in the shipped bank asked this, and it is the idea every later
   fraction rests on. */
/* THIRD PASS 2026-09-16, THE KILL. The key was the only option on the row that
   contained the word "equal" - and the only one containing "same", "size", "all"
   or "are" - and it restated the stem's own second clause verbatim, so "pick the
   option that repeats the sentence you have just read" answered the declared
   pool-1 concept anchor on 100.00% of 20,000 draws out of eighteen option sets.
   Two earlier passes called it "the best item in the bank" and never ran the
   wording lens on it; it was exempted by reputation.

   The four sentences are rebuilt so that EVERY content word in the key is also
   printed by at least one distractor - "fraction", "counts", "parts", "equal",
   "size", "pieces" and "different" each appear somewhere else on the row - which
   is what makes a fixed word policy worthless rather than merely weaker. The key
   no longer restates the stem's clause, and each distractor is a named belief a
   P3 child actually holds: pieces are parts whatever their size; the bottom
   number counts only the pieces that match; a whole has to be cut evenly.
   tools/gen-sanity.mjs RULE 8 - written for gCompareError and scoped to it by
   name, which is why nothing looked here - now runs on every prose bank in the
   topic, with the v3 option set as its negative control. */
/* FOURTH PASS 2026-09-16, THE KILL, for the third consecutive time. The v4 rewrite
   above re-measured the four words the third pass NAMED and never swept the rest.
   It missed by one letter: the distractor printed "count" and the key printed
   "counts", so "pick the option containing `counts`" answered the declared pool-1
   concept anchor on 100.00% of 40,000 draws across two seeds. Three function words
   did the same work without needing that observation - the key was the only
   COMPOUND sentence on the row, so "and", "these" and "that" were each unique to it
   on every draw of all eighteen option sets.

   Two things change, and the second one is the deliverable.

   (1) THE SENTENCES. All four are now ONE sentence shape - the same simple frame,
   "A fraction needs the whole cut into ...", with the belief in the tail - so no
   conjunction, pronoun or demonstrative can single the key out. Every token the
   key prints, function words included, is printed by at least one distractor; so
   is every adjacent PAIR of tokens ("same size" lives in the even-number belief,
   "into <parts>" in the shape belief, "of any size" in the nothing-is-wrong one).
   Checked raw and after stemming, because stemming alone would have HIDDEN the v4
   defect (count / counts collapse to one stem).

   The bottom-number-counts-only-matching-pieces belief goes, and the shape belief
   arrives in its place: a P3 child who says "the pieces are different SHAPES" is
   confusing congruence with equal area, which is the misconception this format
   exists to meet. `pieces` / `parts` is drawn once and used in all four sentences,
   so the option-set count stays at 18 and the four rows move together.

   (2) THE RULE. tools/gen-sanity.mjs RULE 9, the TOKEN RULER: over every prose bank
   in the topic, no token and no two-token phrase may be unique to the key - or
   common to all three distractors and absent from the key - on 60% of a bank's
   draws. RULE 8's per-generator half tests only words that appear in the STEM, and
   the stem says "cuts", not "counts", which is why it measured this bank at 0.0%
   and passed it. The v4 option set is RULE 9's negative control and goes red on
   "counts". That clause would have failed this generator at v1, v2, v3 and v4. */
/* FIFTH PASS 2026-09-16, THE KILL, for the FOURTH consecutive time - and the
   prose form is retired.

   The v5 rewrite above did exactly what the fourth pass asked: every token the key
   printed, function words included, and every adjacent pair, was printed by at
   least one distractor. RULE 9 measured it at 0.00% and passed it. And that fix IS
   the tell - no DISTRACTOR has the same property. Each of the three keeps
   something of its own (`an`/`even`/`number`, `one`/`shape`, the numeral and
   `any`), so "pick the option that has no word of its own" answered the declared
   pool-1 concept anchor on 100.00% of 40,000 draws across two seeds, all 18 option
   sets. RULE 9 is blind to it by construction: it asks whether a phrase is unique
   TO the key, never whether the key is the unique option with nothing unique - the
   rule and the defect are the same fact read from opposite ends.

   THE PM'S RULING (wave-1 law): four-sentence prose concept checks are
   STRUCTURALLY tell-prone, and a fourth wording fix would be a fourth new
   regularity. The format is rebuilt with NO LEXICAL AXIS AT ALL. The option row is
   four bare numbers, so there is no word to count, no sentence to measure, no
   frame to match and nothing for a word-set complement to isolate; every rule this
   file has ever been killed by is inapplicable by construction rather than by
   wording.

   THE ITEM. The picture carries the whole and the stem carries the re-cutting: a
   cake is cut into equal pieces (the bar, k of them, the child's piece blue), then
   EVERY piece is cut into n equal parts, and the question is how many equal parts
   the whole is cut into now. That is Principle 1 stated as a number - "the bottom
   number says how many EQUAL parts the whole was cut into" - and it is the one
   reading of it that cannot be answered by counting what is on the screen: k is in
   the picture, n is in the stem, and k x n is in neither. It is also the bridge to
   Principle 2, which is what a P3 child is about to need.

   Figure OPTIONS were the PM's first choice and the app cannot carry them: the
   harness's markup allowlist (tools/gen-sanity.mjs, KILL FIX K1) permits inline
   text markup only, a picture must be a q.figure spec, and a question object holds
   exactly one. The PM's declared fallback is what is built here - one rendered
   figure, numeric options naming part counts, named misconceptions, rank-gated.

   WHAT HOLDS IT UP, measured rather than asserted:
     - RULE 7: the key's value rank is DRAWN FIRST and sidedNum is forced to seat
       it, so the four ranks come out flat by construction rather than by luck.
     - The stem-option coupling class (wound 1): the picture's own part count k and
       the stem's own number n are both NAMED BELIEFS, so "pick the number the
       picture shows" and "pick the number the question gives you" each pick a
       DISTRACTOR. At most one of the two is seated, so the key is never the only
       option that is not on the screen either.
     - RULE 10's new clause, which is the property "the picture is load-bearing"
       actually names: another legal shading - another bar with a different part
       count - changes the answer on every draw, because the answer is k x n.
     - The four sentences are gone, so RULE 6, RULE 8, RULE 9 and the row-only rule
       have nothing to bite on. gCompareError and gAddError remain this topic's
       prose banks and both are gated.

   COST, declared: k x n is capped at 10 rather than 12. At 12 there is nothing
   legal above the key inside the P3 denominator limit, so the key would be the
   largest of four on 100% of those draws and the shape would name the rank. Seven
   (k, n) shapes survive, 3 question forms and 18 contexts on top, and the
   option-row space is drawn rather than fixed. */
/* SIXTH PASS 2026-09-16, THE KILL, for the FIFTH consecutive time - and the
   GENERATOR IS RETIRED. THE PM'S RULING, final for this bank: gEqualParts has now
   been killed on every axis this file has a ruler for, across six passes -
   sentence matching (v3), a single word (v4), the word-set complement (v5) and
   now the stem's ONE numeral (v6) - and each fix moved the tell rather than
   removing it. It is off the topic.

   WHAT THE SIXTH PASS MEASURED. The v6 rebuild took the lexical axis away
   completely and correctly: four bare part counts, no sentence to match, nothing
   for RULE 6, 8, 9 or 11 to bite on. It opened a STEM-RECALL axis instead. The
   stem printed exactly ONE numeral, `n`, and under the declared `k x n <= 10` cap
   that numeral names the key: the four-line table `2->8, 3->6, 4->8, 5->10`
   answered the declared pool-1 concept anchor on 65.52% / 66.42% of 20,000 draws
   on each of two seeds, and the recalled number was on the row and right on
   61.46% / 62.43%. On `n = 4` and `n = 5` the picture is redundant BY
   CONSTRUCTION, because the cap leaves exactly one `k` for each. The bar was never
   counted.

   THE DECLARED COST WAS THE KILL. The cap was declared as a RANK cost ("at 12
   nothing legal sits above the key") and it is also a DEPENDENCY cost: it
   collapses the (k, n) grid to seven cells in which `n` is nearly a function of
   the answer, and the seven are not even served evenly (10.7% against 16.8%),
   which sharpens the table further.

   WHAT REPLACES IT, and why this shape rather than another rebuild. The slot is
   pool 1 / `identify`, so the refill is a second READING-A-FRACTION-OFF-A-PICTURE
   format - FORMAT 1b below - built to the two conditions the PM set: the picture
   is load-bearing (the bar's part count is the key's bottom number and appears
   NOWHERE in the words), and the stem prints TWO numerals, so no single numeral
   can name the key and the four-line table has nothing to be a table over.
   RULE 12 in tools/gen-sanity.mjs is the general form of the gate and the v6
   gEqualParts row is its negative control. */
/* FORMAT 1b - reading a fraction off a picture after a one-step change (pool 1,
   1 step). The bar shows the child's pieces blue; she eats some; what is left is
   still counted over the SAME bottom number, which is Principle 1 stated where a
   P3 child most often loses it - the bottom number is the size of the piece, and
   eating a piece does not re-cut the cake.

   THE THREE RULERS THIS FORMAT IS BUILT AGAINST, all of them gates rather than
   wording. (The v7 text of this paragraph claimed the first one and was WRONG in
   the way the block below sets out: it argued from "the bottom number is in no
   word of the stem", which is true, to "the picture is load-bearing", which does
   not follow. The claims are now the ones the file can actually assert.)
     - RULE 12, THE STEM-ONLY RULE, and RULE 14, THE HALF-KEY RULE. The stem prints
       NO NUMERAL: the take-away is a word, the blue count and the part count are
       both in the picture. So neither a table over the stem's numerals nor any
       expression over them can name the key or half of it - there is nothing to
       write one over, and the oracle fails the build if a digit ever appears in
       this stem.
     - RULE 10, THE PICTURE RULER, and the load-bearing clause in the oracle:
       another legal bar (the same pieces over a different part count) changes the
       answer on every draw, because `d` IS the key's bottom number.
   The coupling seat and the digit-overlap ban both apply as they do everywhere
   else in the file: one or two of the three slips are written over the bar's own
   part count (sameDen), and the key may not be the unique option both of whose
   numerals are printed elsewhere on the row (digitIsolatesKey). */
/* SEVENTH PASS 2026-09-16, KILL 1 - and the premise the v7 refill was built on
   was FALSE, which is the finding worth keeping. The condition the PM set was "the
   picture is load-bearing - the bar's part count IS the key's bottom number and
   appears in no word of the stem", and the second half of that sentence was true.
   THE FIRST HALF DOES NOT FOLLOW FROM IT. The child never had to DETERMINE the
   bottom number, only to DISCRIMINATE it, and the stem handed her the other half
   of the key for free:

     - "the answer's TOP number is a - g" is one subtraction on the two numerals
       the stem printed, true on 100.00% of draws;
     - that top number ISOLATED the key on 59.6 / 59.0%;
     - take it and guess among the ties: 79.6 / 79.2%;
     - break the tie with "the bottom number is the one printed twice on the row"
       - a seat sameDen() is REQUIRED to fill - 88.7 / 88.8%;
     - break it with the masked row shape instead: 94.9 / 94.7%.

   The bar was never counted, in a bank served 3.42 / 3.54 items a session to a
   struggling child, three or more times in 82-84% of those sessions.

   WHY SIX RULERS WERE BLIND, which is the general lesson: RULE 12's arithmetic
   library only scores an expression naming the WHOLE key, so a numerator-only
   match scored nothing; RULE 10 and RULE 11 read the row with the stem discarded;
   RULE 13 reads numeral MEMBERSHIP, and a - g is arithmetic, not membership. The
   half-key route fell exactly through the middle of the four rulers this file had.
   RULE 14, THE HALF-KEY RULE, is the general form and this bank's v7 construction
   is its negative control.

   THE REBUILD: THE STEM PRINTS NO NUMERAL AT ALL. The take-away is a WORD ("eats
   two of his pieces"), the blue count is not printed, and the part count is not
   printed - so BOTH halves of the key are counted off the bar and no expression
   over the stem can name either one, because there is nothing to write an
   expression over. The oracle in tools/gen-sanity.mjs asserts that emptiness
   directly (a digit anywhere in this stem is a failure) rather than measuring
   around it.

   THE ROW FAMILY, and it is the second half of the fix. The composed route the
   seventh pass measured - stem recall, then the masked row SHAPE where recall does
   not settle it - ran at 69.0 / 71.6% on v7, and killing the stem half alone would
   have left the shape half at 67. Half the draws now seat all three slips over the
   BAR'S OWN part count, which collapses to a single masked shape whose key slot is
   the value rank RULE 7 already draws evenly - 25% by construction - and the other
   half spread the bottom numbers as before, where the part count has to be read to
   choose at all. Measured below 60% composed, on both seeds, and declared.

   COST, declared: on the flat half of the draws the bar's part count is settled by
   the option row rather than by counting, so the picture carries the TOP number
   there and both numbers on the spread half. On no draw does the stem carry
   either. The distinct-stem space falls from 288 to 108 and is now
   INFORMATION-FREE: the six-row stem table measures at chance, because the same
   sentence sits over every picture the format can draw. */
const TAKE_CTX = ['kueh lapis', 'pandan chiffon cake', 'pizza at the hawker centre',
                  'chocolate swiss roll', 'ondeh-ondeh cake', 'sugee cake'];
const TAKE_WORD = ['one', 'two', 'three'];
function gPicTakeAway(){
  const kid = pick(KIDS), cake = pick(TAKE_CTX);
  /* RULE 7: the value rank is drawn FIRST and sided() is forced to seat it. */
  const rank = ri(1,4);
  /* the row family, drawn per item so the count itself carries no information */
  const flat = Math.random() < 0.5;
  let d = 8, a = 5, g2 = 2, key = [3,8], slips = [[5,8],[2,8],[3,7]], g = 0, ok = false;
  do {
    d = ri(6,12);
    a = ri(4, d-2);                     /* her pieces: never all but one */
    g2 = ri(1, Math.min(3, a-2));       /* what she eats, and at least two are left */
    key = [a-g2, d];
    const cands = [
      [a, d],                          /* answered the blue part as drawn, forgetting the bite */
      [g2, d],                         /* answered the pieces she ate */
      [d-a, d],                        /* answered the pieces that were never hers */
      (d-a+g2 < d ? [d-a+g2, d] : null), /* answered the pieces that are not hers NOW */
      (a-g2+1 < d ? [a-g2+1, d] : null), /* one piece miscounted, one too many */
      (a-g2-1 >= 1 ? [a-g2-1, d] : null),/* one piece miscounted, one too few */
      (a-g2+2 < d ? [a-g2+2, d] : null), /* two pieces miscounted */
      (a-g2-2 >= 1 ? [a-g2-2, d] : null),
      (a-g2 < d-1 ? [a-g2, d-1] : null), /* took the eaten piece off the whole as well */
      (d+1 <= 12 ? [a-g2, d+1] : null),  /* counted a part that is not there */
      (a-g2 < d-2 && d-2 >= 2 ? [a-g2, d-2] : null),
      /* WOUND 1, THE ROW-SHAPE CLASS (sixth pass). A row written over two bottom
         numbers has few masked shapes and a child learns the picture rather than
         the fraction; the miscounts below are the ones the card already names,
         each over a bottom number the row would not otherwise reach, so the shape
         moves with the numbers. sameDen() below still holds a seat over the bar's
         own part count, which is what keeps RULE 13 off the row. */
      (d+2 <= 12 ? [a-g2, d+2] : null),
      (a-g2+1 < d-1 ? [a-g2+1, d-1] : null),
      (a-g2-1 >= 1 && d+1 <= 12 ? [a-g2-1, d+1] : null),
      (a < d-1 ? [a, d-1] : null),
      (d+1 <= 12 ? [g2, d+1] : null)
    ].filter(Boolean);
    /* the flat family: every slip over the bar's own part count, so the four
       options are four top numbers over one bottom number - one masked shape, and
       the key's slot in it is the value rank, drawn evenly above. */
    const pool = flat ? cands.filter(c => c[1] === d) : cands;
    slips = sided(key, pool, sameDen(pool, d, key), 4 - rank) || [];
    ok = slipsOk(key, slips) && !digitIsolatesKey(key, slips);
    g++;
  } while (g < 200 && !ok);
  if (!ok){ d = 8; a = 5; g2 = 2; key = [3,8]; slips = [[5,8],[2,8],[3,7]]; }
  const art = /^[aeiou]/i.test(cake) ? 'an ' : 'a ';
  return fig(mcFrac('The bar below shows ' + art + cake + ' cut into equal pieces, and ' + kid[0] + "'s " +
    'pieces are blue. ' + kid[1] + ' eats ' + TAKE_WORD[g2-1] + ' of ' + (kid[2] === 'she' ? 'her' : 'his') +
    ' pieces. What fraction of the ' + cake + ' is <b>still ' + kid[0] + "'s</b>?", key, slips,
    'Count the parts on the bar first: the ' + cake + ' is cut into ' + d + ' equal parts, and ' +
    a + ' of them ' + (a === 1 ? 'is' : 'are') + ' blue, so ' + kid[0] + ' had ' + fr(a,d) + '. ' +
    kid[1] + ' eats ' + TAKE_WORD[g2-1] + ', so ' + a + ' − ' + g2 + ' = ' + (a-g2) + ' ' +
    ((a-g2) === 1 ? 'piece is' : 'pieces are') + ' left, out of the same ' + d + ' parts: ' + fr(a-g2,d) +
    '. Eating a piece does not re-cut the ' + cake + ', so the bottom number never moves - it stays ' + d + '.'),
    bar(d, a));
}

/* FORMAT 1c - the complement, off the same picture (pool 2, 2 steps: read the
   shaded fraction, then take it from one whole). */
function gPicUnshaded(){
  let d = 8, n = 3, key = [5,8], slips = [[3,8],[6,8],[5,7]], g = 0;
  const rank = ri(1,4);
  do {
    /* THIRD PASS 2026-09-16, W5(a). This generator, gSubFromOne and gMakeOne drew
       the SAME d = ri(4,12) / a = ri(2,d-2) with the SAME candidate bank, so all
       three produced exactly one 335-entry (option set + key) space - Jaccard
       100.0% on all three pairs - and shapeKey plus the feed's repeat guard
       counted them as three formats. Three of the four `wholes` formats were one
       format under three sentences. The picture one is widened where a picture
       can go and the other two cannot: a bar may be cut into 3 parts and it may
       have a single part blue or a single part white, and the misread that only a
       PICTURE affords - swapping the blue count and the white count - is named
       here and nowhere else. */
    d = ri(3,12); n = ri(1,d-1);
    key = [d-n,d];
    /* WOUND 4: same half-shaded gap as gPicIdentify - [n, d] is the key when
       d === 2n, so the bar could never be half blue. SECOND PASS W3(a): the
       substitute is capped inside the syllabus, and W1: sided() picks the three. */
    /* FIFTH PASS 2026-09-16, W1. This was the second-worst bank of the class:
       "the option written over the bar's part count" answered it on 72.3% of
       draws and isolated the key on 44.7%. One or two seats are held for a
       belief carrying that same part count now. */
    const cands = [
      [n, d],                         /* answered the blue part instead */
      [d-n+1, d], [d-n, d-1],         /* one white piece too many / a part miscounted */
      [d-n-1, d],                     /* one white piece too few */
      [d-n+1, d-1], [d-n-1, d-1],     /* a piece AND a part miscounted, each way */
      [n, d-n], [d-n, n],             /* swapped the blue count and the white count */
      (d < 12 ? [d-n, d+1] : null)    /* counted a part that is not there */
    ].filter(Boolean);
    slips = sided(key, cands, sameDen(cands, d, key), 4 - rank) || [];
    g++;
  } while (g < 200 && !(slipsOk(key, slips) && !digitIsolatesKey(key, slips)));
  if (!slipsOk(key, slips)){ d = 8; n = 3; key = [5,8]; slips = [[3,8],[6,8],[5,7]]; }
  return fig(mcFrac('What fraction of the bar is <b>not</b> blue?', key, slips,
    'Step 1: the bar is cut into ' + d + ' equal parts and ' + n + ' ' + (n === 1 ? 'is' : 'are') +
    ' blue, so the blue part is ' + fr(n,d) + '. ' +
    'Step 2: the whole bar is ' + fr(d,d) + ', so the part that is not blue is ' + d + ' − ' + n + ' = ' + (d-n) +
    ' parts, which is ' + fr(d-n,d) + '.' +
    /* SECOND PASS, W2: "n/d is the blue part, not the answer" named the KEY when
       the bar was half shaded - 22.6% of draws telling the child the right answer
       is the wrong part. */
    (2*n === d ? ' Exactly half the bar is blue here, so the blue part is ' + fr(n,d) + ' too - the same amount, counted the other way round.'
               : ' ' + fr(n,d) + ' is the blue part, not the answer.')),
    bar(d, n));
}


/* ===========================================================================
   PRINCIPLE 2 - EQUIVALENCE AND SIMPLEST FORM ARE ONE IDEA
   =========================================================================== */

/* FORMAT 2a - equivalence WITH pictorial support (pool 1, 1 step).
   WOUND 4 (refutation 2026-09-15): this used to draw the SCALED-UP bar every time
   and key the reduced form every time, so the key was the unique smallest bottom
   number on 20,000 of 20,000 draws and the item could be answered by looking for
   it. It now runs BOTH directions on a coin flip: half the draws show the small
   pieces and ask the child to group them back (key = the small bottom number),
   half show the big pieces and ask for the same amount cut finer (key = the big
   one, sharing its bottom number with two distractors). The
   smallest-bottom-number heuristic now picks a DISTRACTOR about half the time. */
function gEquivFromBar(){
  let n = 3, d = 4, k = 2, up = false, key = [3,4], slips = [[5,6],[3,8],[7,8]], g = 0;
  do {
    const b = pick(SCALABLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    up = Math.random() < 0.5;
    key = up ? [k*n, k*d] : [n, d];
    /* SECOND PASS, WOUND 1. [n+k, d+k] and [k*n+1, k*d] both sit ABOVE the key and
       [n, k*d] below it, so the key was the 2nd smallest of four on 100.00% of
       50,000 draws - "pick the second smallest" answered this item every time, at
       1.34 served items a session. The candidate list is both-sided now, and the
       two ±1 entries are the documented second-order slip: one small piece too many
       or too few, on top of the regrouping. */
    slips = sided(key, [
      [n+k, d+k],                         /* added k to the top AND the bottom */
      [n+1, d], [n+1, d+1],               /* one big piece too many, one part too many */
      [k*n+1, k*d], [k*n-1, k*d],         /* one small piece too many / too few */
      [n, k*d],                           /* changed only the bottom number */
      (n > 1 ? [n-1, d] : null),          /* one big piece too few */
      (n > 1 ? [n-1, d-1] : null),        /* took one off the top and the bottom */
      (d-1 > n ? [n, d-1] : null),        /* one part too few in the whole */
      /* THIRD PASS 2026-09-16, W5. Below the key the bank could only name
         [k*n-1, k*d] and [n, k*d] whenever n = 1 - nearly half of SCALABLE - so
         three-below, the seating that makes the key the LARGEST of four, was
         reachable on 12.6% of draws, a hair over RULE 7's new 12% floor and inside
         its sampling noise. Two more of the file's own miscounts sit below it. */
      [k*n-2, k*d],                       /* two small pieces too few */
      (d+1 <= 12 ? [n, d+1] : null)       /* one part too many in the whole */
    ].filter(Boolean)) || [];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ n = 3; d = 4; k = 2; up = false; key = [3,4]; slips = [[5,6],[3,8],[7,8]]; }
  const parts = up ? d : k*d, blue = up ? n : k*n;
  /* SIXTH PASS 2026-09-16, W3. ' of them are blue.' was hard-coded, so the pool-1
     equivalence anchor printed "1 of them ARE blue" on 22.81% / 22.68% of draws -
     served 1.30 per session at 80% accuracy and 5.09 at 45%, so a struggling child
     met the error about once a sitting. gPicUnshaded twenty lines up has always
     done this correctly. Nothing in the harness read prose for agreement; the
     PROSE AGREEMENT clause in tools/gen-sanity.mjs now does, over every rendered
     stem and teaching card in the topic, with this sentence as its control. */
  return fig(mcFrac('The bar below is cut into ' + parts + ' equal parts, and ' + blue +
    (blue === 1 ? ' of them is blue' : ' of them are blue') +
    '. Which fraction is <b>equivalent</b> to the blue fraction?', key, slips,
    'The blue part is ' + blue + ' out of ' + parts + ' parts, which is ' + fr(blue, parts) + '. ' +
    (up
      ? 'Cut every one of those ' + d + ' parts into ' + k + ' smaller ones: ' + n + ' × ' + k + ' = ' + (k*n) +
        ' and ' + d + ' × ' + k + ' = ' + (k*d) + ', so the same amount of bar is also ' + fr(k*n, k*d) + '. '
      : 'Now group the small parts back together in ' + k + 's: ' + (k*n) + ' ÷ ' + k + ' = ' + n + ' and ' +
        (k*d) + ' ÷ ' + k + ' = ' + d + ', so the same amount of bar is also ' + fr(n,d) + '. ') +
    /* SEVENTH PASS 2026-09-16, WOUND 2 - THE CARD-ROW CLAUSE (see gSimplestError).
       [n+k, d+k] is a candidate, not a seat, so this sentence named a wrong answer
       that was nowhere on the screen on 52.3 / 52.5% of draws. */
    (slips.some(s => s[0] === n+k && s[1] === d+k)
      ? 'Adding ' + k + ' to the top and the bottom would give ' + fr(n+k, d+k) + ', which is a different amount.'
      : 'Adding ' + k + ' to the top and the bottom instead of multiplying by it gives a different amount, ' +
        'because it does not cut every part the same way.')),
    bar(parts, blue));
}

/* FORMAT 2b - inverse: the missing numerator (pool 2, 1 step).
   FOURTH PASS 2026-09-16, W2. The option a child picks here goes into the stem's
   blank, so the option row IS a fraction even though nothing on it is rendered as
   one: 4.5% of draws offered a top number that makes the completed fraction
   improper, largest 15 over a bottom number of 12. The candidate filter now caps
   the row at one less than the completed bottom number, and the key's rank is drawn
   FIRST and passed to sidedNum, because a capped bank can no longer be trusted to
   supply both sides on its own. */
function gEqMissing(){
  const rank = ri(1,4);
  let n = 1, d = 2, k = 2, key = 2, slips = [3,4,1], g = 0;
  do {
    const b = pick(SCALABLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    key = k*n;
    /* SECOND PASS, KILL 2's twin. n + d(k-1) is ALWAYS above k·n and n is always
       below it, so the key was never an extreme of its own option row - 100.00% of
       50,000 draws - which turns a four-way choice into a coin flip for any child
       who has noticed. Both sides are drawn from now, and the row's smallest and
       largest are as often the key as anything else. */
    const numCands = [
      n + d*(k-1),          /* added the amount the bottom number grew */
      k*(n+1),              /* multiplied one more than the top number */
      n*(k+1),              /* multiplied by one more than the multiplier */
      n,                    /* left the top number alone */
      n*(k-1),              /* multiplied by one less than the multiplier */
      k*(n-1),              /* multiplied one less than the top number */
      n + k,                /* added the multiplier instead of multiplying by it */
      k*n + 1, k*n - 1,     /* counted one small piece too many / too few */
      /* THIRD PASS 2026-09-16, W5. Below k·n the bank could only name n, n(k-1)
         and k(n-1), which collapse to one or two distinct values whenever n = 1 -
         almost half of SCALABLE - so three-below, the seating that makes the key
         the LARGEST of four, was reachable on 10.8% of draws, under RULE 7's new
         12% floor. Two more of the file's documented miscounts sit below it. */
      k*n + 2, k*n - 2,     /* counted two small pieces too many / too few */
      n - 1                 /* took one off the top number before multiplying */
    ];
    /* FOURTH PASS 2026-09-16, W2. A stem that can only seat SOME of the four ranks
       is a stem whose rank a child can read off the numbers: "read the stem, guess
       where the answer sits in the row" measured 36.9% at v4 here and 27.5% in the
       denominator bank. Only draws that can seat all four are kept, in both. */
    const inCap = c => Number.isInteger(c) && c >= 1 && c <= k*d - 1 && c !== key;
    slips = (new Set(numCands.filter(c => inCap(c) && c > key)).size >= 3 &&
             new Set(numCands.filter(c => inCap(c) && c < key)).size >= 3)
      ? (sidedNum(key, numCands, k*d - 1, 4 - rank) || []) : [];
    g++;
  } while (g < 200 && !numsOk(key, slips));
  if (!numsOk(key, slips)){ n = 1; d = 2; k = 3; key = 3; slips = [5,4,1]; }
  return mcNum(fr(n,d) + ' = ' + frQn(k*d) + ' &nbsp; What is the missing <b>numerator</b>?',
    key, slips,
    'The bottom number was multiplied by ' + k + ' (' + d + ' × ' + k + ' = ' + (k*d) + '), ' +
    'because every part was cut into ' + k + ' smaller ones. So the top number must be multiplied by ' + k +
    ' as well: ' + n + ' × ' + k + ' = ' + key + '. Adding ' + (d*(k-1)) + ' to the top instead gives ' +
    (n + d*(k-1)) + ', which is a different amount - and so is leaving the top at ' + n + '. ' +
    'The answer is not always the biggest or the smallest number on the row: work the multiplier out.');
}

/* FORMAT 2c - the same inverse from the other end: the missing denominator
   (pool 2, 1 step). Same principle, and the child must spot the multiplier from
   the TOP line instead of the bottom one. */
/* FOURTH PASS 2026-09-16, W2 - THE BANK THE 12 CAP DID NOT REACH. Every RENDERED
   fraction in this file is inside 12 and the refutation confirms it over 1,080,000
   draws. This generator's options are not rendered fractions: they are the bare
   bottom number the child writes into the blank, and half of them were past 12,
   largest 22. "3/4 = 9/?" offering 18 is exactly the off-syllabus denominator the
   v4 pass removed the 24 allowance to stop printing, surviving only because the
   gate looks for markup. The cap is 12 here too, and RULE 4 now reads this row.

   THE CONFLICT, DECLARED. RULE 7's value-rank floor wants candidates on both sides
   of the key; the cap takes the whole space above it away whenever the key IS 12,
   which is 35% of the old draws. They cannot both be satisfied, and v4 resolved it
   silently in favour of the floor. The cap wins here, and the price is paid in the
   stem space: a draw is only kept when it can seat ALL FOUR ranks, which leaves the
   scale factors whose product with the bottom number leaves room under 12, and the
   distinct (n, d, k) stems fall 21 -> 8. The alternative was keeping the stems and
   letting each one key a fixed rank, which is the same defect one layer down -
   measured, it put "read the stem, guess where the answer sits in the row" at 49.8%
   against 27.5% at v4. Both numbers are on the record in the lane note rather than
   left to be found. */
function gEqMissingDen(){
  const rank = ri(1,4);
  let n = 1, d = 2, k = 2, key = 4, slips = [3,4,2], g = 0;
  do {
    const b = pick(SCALABLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    key = k*d;
    /* SECOND PASS, THE SECOND KILL. The three authored distractors were
       d + n(k-1), d + k and d, and because n < d every one of them is provably
       BELOW k·d on every legal draw - so the key was the strict maximum of the
       option row, and "circle the biggest number" answered this item on 100.00% of
       50,000 draws. A child never read a fraction, never found the multiplier,
       never touched the principle, in one of the three inverse formats this lane
       was written to add. Distractors are drawn on BOTH sides of k·d now. */
    /* A draw with NOTHING legal above the key - which is every draw where k*d is
       12 itself - can only ever key the largest of four, and a stem that always
       keys the same rank tells a child where the answer is before they have read
       it: "read the stem, guess the rank" scored 49.8% of draws when those stems
       were kept and 27.5% at v4. They are refused, which is where the stem space
       goes. */
    const denCands = [
      (k+1)*d,              /* counted the multiplier one too many */
      k*(d+1),              /* multiplied one more than the bottom number */
      k*(d+n),              /* multiplied the two numbers added together */
      d + n*(k-1),          /* added the amount the top number grew */
      d + k,                /* added the multiplier instead of multiplying by it */
      d,                    /* left the bottom number alone */
      /* THIRD PASS 2026-09-16, W5. k(d+n) runs past the 24 the integer banks read
         as a number to recognise as wrong, so above the key the bank often had
         only two candidates and three-above - the key as the SMALLEST of four -
         sat at 13.7%, inside the new 12% floor's noise. */
      k*d + 1, k*d + 2,     /* counted one / two small parts too many */
      k*d - 1, k*d - 2      /* counted one / two small parts too few */
    ];
    /* The improper-completion filter (an option must also exceed the printed top
       number) is NOT applied, and the number is measured and declared instead: it
       takes this bank from eight distinct stems to FOUR, which is the territory of
       the two-stem comparison format the fourth pass already cautioned about. The
       trade is stated in the lane note so the PM rules on it rather than the
       author: 37.7% of rows offer a number that would complete an improper
       fraction, against 32.2% at v4, and 0% at the cost of half the stems. */
    slips = new Set(denCands.filter(c => c > key && c <= 12)).size >= 3
      ? (sidedNum(key, denCands, 12, 4 - rank) || []) : [];
    g++;
  } while (g < 200 && !numsOk(key, slips));
  if (!numsOk(key, slips)){ n = 3; d = 4; k = 3; key = 12; slips = [10,7,4]; }
  return mcNum(fr(n,d) + ' = ' + frQd(k*n) + ' &nbsp; What is the missing <b>denominator</b>?',
    key, slips,
    'The top number was multiplied by ' + k + ' (' + n + ' × ' + k + ' = ' + (k*n) + '), ' +
    'so the bottom number must be multiplied by ' + k + ' too: ' + d + ' × ' + k + ' = ' + key + '. ' +
    'Leaving the bottom at ' + d + ' would make the fraction ' + k + ' times bigger, and multiplying it by ' +
    (k+1) + ' would give ' + ((k+1)*d) + ', which is too small an amount. ' +
    'The answer is not always the biggest number on the row: find the multiplier first.');
}

/* FORMAT 2d - recognise an equivalent fraction (pool 2, 1 step). The audit's
   worst-ten #8: this ONE stem used to be the whole equivalence skill in two
   pools. It is now one of five formats, in one pool, and its three distractors
   are named beliefs instead of arbitrary near misses.

   WOUND 2 (refutation 2026-09-15): the stem printed the SIMPLEST-FORM fraction on
   every draw, so the generator had ELEVEN distinct stems - one per entry of the
   base table - and a child who plays for a week has met all of them. The stem now
   runs both ways on a coin flip: it asks about the base fraction (key = the
   scaled-up form, 11 stems) or about the scaled-up fraction (key = the base form,
   21 stems), which is 32 and is also the honest reading of the principle -
   equivalence has no preferred direction. */
function gPickEquiv(){
  let n = 1, d = 2, k = 2, up = true, t = 1, key = [2,4], slips = [[3,4],[1,4],[3,4]], g = 0;
  do {
    const b = pick(SCALABLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    up = Math.random() < 0.5;
    t = n >= 2 ? k : 1;
    key = up ? [k*n, k*d] : [n, d];
    /* SECOND PASS, WOUND 1 + the smallest-bottom-number heuristic. Every candidate
       the bank can name, sorted onto both sides of the key by sided(); the ±1
       entries are the documented second-order slip (one small piece out). */
    slips = sided(key, [
      [n+k, d+k],                                  /* added k to the top AND the bottom */
      [k*n+1, k*d], [k*n-1, k*d],                  /* one small piece too many / too few */
      [k*n+2, k*d],                                /* two small pieces too many */
      [n+1, d],                                    /* one big piece too many */
      (n+1 < d-1 ? [n+1, d-1] : null),             /* one big piece too many, one part too few */
      [n, k*d],                                    /* changed only the bottom number */
      (t < k*n && t <= k*d-2 ? [k*n-t, k*d-t] : null),  /* took t off the top AND the bottom */
      (n > 1 ? [n-1, d-1] : null),                 /* took one off the top and the bottom */
      (d-1 > n ? [n, d-1] : null),                 /* one part too few in the whole */
      /* THIRD PASS 2026-09-16, W5: two more below the key, so three-below - the key
         as the LARGEST of four - clears the new 12% floor with room. */
      [k*n-2, k*d],                                /* two small pieces too few */
      (d+1 <= 12 ? [n, d+1] : null)                /* one part too many in the whole */
    ].filter(Boolean)) || [];
    g++;
  } while (g < 200 && !(t < k*n && t <= k*d-2 && slipsOk(key, slips)));
  if (!(t < k*n && t <= k*d-2 && slipsOk(key, slips))){
    n = 1; d = 2; k = 3; up = true; key = [3,6]; slips = [[4,5],[1,6],[4,6]];
  }
  const given = up ? [n,d] : [k*n, k*d];
  /* FIFTH PASS 2026-09-16, WOUND 4. This card walked a child through a wrong
     answer they could not find anywhere on the screen on 82.4% of draws - the
     worst in the topic - because the two slips it names are CANDIDATES and
     sided() seats only three of a dozen. A P3 child reading "adding 2 to both
     gives 4/7" under a row that has no 4/7 on it is being taught about an item
     they were not shown. The value is printed where it is offered and the slip is
     named in WORDS where it is not, which is what the rest of the file already
     does for the beliefs that overshoot the 12 cap. */
  /* SEVENTH PASS 2026-09-16, WOUND 2 - THE CARD-ROW CLAUSE. The v5 guard asked
     whether a candidate's VALUE is on the row (sameVal) and then printed the
     candidate's own form, but sided()'s uniq() keeps whichever of two equal-valued
     candidates is written in the BIGGER pieces - so the card said "2/8" while the
     row showed "1/4" on 26.8 / 26.1% of draws. Same amount, different glyphs, and
     a P3 child hunting the row for "2/8" does not find it. The seated pair is
     looked up and printed EXACTLY as the option row prints it. */
  const seat = c => slips.find(s => sameVal(s, c)) || null;
  const onRow = c => !!seat(c);
  const asRow = c => { const p = seat(c); return fr(p[0], p[1]); };
  const first = up
    ? 'Cut every part into ' + k + ' smaller ones: multiply the top AND the bottom by ' + k + '. ' +
      n + ' × ' + k + ' = ' + (k*n) + ' and ' + d + ' × ' + k + ' = ' + (k*d) + ', so ' + fr(n,d) + ' = ' +
      fr(k*n, k*d) + '. ' + (onRow([n+k, d+k])
        ? 'Adding ' + k + ' to both instead gives ' + asRow([n+k, d+k]) + ', which is a different amount. '
        : 'Adding ' + k + ' to the top and the bottom instead of multiplying them changes the amount. ')
    : 'Group the parts back together in ' + k + 's: divide the top AND the bottom by ' + k + '. ' +
      (k*n) + ' ÷ ' + k + ' = ' + n + ' and ' + (k*d) + ' ÷ ' + k + ' = ' + d + ', so ' + fr(k*n, k*d) + ' = ' +
      fr(n,d) + '. ' + (onRow([k*n-t, k*d-t])
        ? 'Taking ' + t + ' away from both instead gives ' + asRow([k*n-t, k*d-t]) + ', which is a different amount. '
        : 'Taking the same number off the top and the bottom instead of dividing them changes the amount. ');
  return mcFrac('Which fraction is <b>equivalent</b> to ' + fr(given[0], given[1]) + '?', key, slips,
    first + (onRow([n, k*d])
      ? 'Changing only the bottom gives ' + asRow([n, k*d]) + ', which is not the same amount either.'
      : 'Changing only the bottom number and leaving the top alone is not the same amount either.'));
}

/* FORMAT 2e - simplest form (pool 2, 1 step). Moved DOWN out of pool 3, which is
   the audit's worst-ten #9 closed: a one-step item does not belong in the
   hardest pool when the skill has two-step formats available. */
function gSimplest(){
  let n = 2, d = 3, k = 2, N = 4, D = 6, t = 2, key = [2,3], slips = [[2,4],[2,6],[1,3]], g = 0;
  do {
    const b = pick(SCALABLE); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    N = k*n; D = k*d;
    t = n >= 2 ? k : 1;
    key = [n,d];
    /* SECOND PASS, WOUND 1. [N-t, D-t] and [n, D] both sit below the key, so it was
       the 3rd of four by value on 62.3% of draws and the unique SMALLEST bottom
       number on 100% of them. Both sides are drawn from now, and at least one
       candidate carries a bottom number under d. */
    slips = sided(key, [
      [N-t, D-t],                                  /* took t away from the top AND the bottom */
      [N+t, D+t],                                  /* added t to the top and the bottom instead */
      [N+1, D],                                    /* one piece too many, before dividing */
      /* THIRD PASS 2026-09-16, W5. [N+t, D+t] is the only ABOVE-key candidate the
         named beliefs supply and the 12 cap takes it off most draws, so three-above
         - the key as the SMALLEST of four - sat at 12.7%, inside the floor's noise.
         The mirrors of the two "left the bottom alone" slips go the other way. */
      (N+t < D ? [N+t, D] : null),                 /* added t to the top and left the bottom */
      [N+2, D],                                    /* two pieces too many, before dividing */
      [n, D],                                      /* divided only the top */
      [N-t, D],                                    /* took t off the top and left the bottom */
      (n+1 < d ? [n+1, d] : null),                 /* one piece too many */
      (n > 1 ? [n-1, d] : null),                   /* one piece too few */
      (d-1 > n ? [n, d-1] : null),                 /* divided the bottom one step too far */
      (n > 1 ? [n-1, d-1] : null),                 /* took one off the top and the bottom */
      /* THIRD PASS 2026-09-16. Two more candidates carrying a bottom number UNDER
         the key's, because "pick the smallest bottom number" came back to 39.0% -
         inside RULE 7's 40% policy cap's noise - once the 12 cap took [N+t, D+t]
         off most draws and left the row sitting over d. */
      (n+1 < d-1 ? [n+1, d-1] : null),             /* one piece too many, one part too few */
      (d-2 > n ? [n, d-2] : null),                 /* divided the bottom two steps too far */
      [n+1, d+1],                                  /* added one to the top and the bottom */
      [n, d+1]                                     /* did not divide the bottom far enough */
    ].filter(Boolean)) || [];
    g++;
  } while (g < 200 && !slipsOk(key, slips));
  if (!slipsOk(key, slips)){ n = 2; d = 3; k = 2; N = 4; D = 6; key = [2,3]; slips = [[2,4],[2,6],[1,3]]; }
  /* SEVENTH PASS 2026-09-16, WOUND 2 - THE CARD-ROW CLAUSE (see gSimplestError).
     "Dividing only the top would give " + fr(n,D) names a candidate sided() seats
     on fewer than half its draws: the card pointed at a wrong answer that was not
     on the screen on 58.6 / 58.3%. Named in words where it is not seated. */
  const onlyTop = slips.some(s => s[0] === n && s[1] === D);
  return mcFrac('Express ' + fr(N,D) + ' in its <b>simplest form</b>.', key, slips,
    'Simplest form means dividing the top and the bottom by the same number until you cannot go any further. ' +
    N + ' ÷ ' + k + ' = ' + n + ' and ' + D + ' ÷ ' + k + ' = ' + d + ', so ' + fr(N,D) + ' = ' + fr(n,d) +
    '. It is the same amount, written with bigger parts. ' +
    (onlyTop ? 'Dividing only the top would give ' + fr(n,D) + ', which is a smaller amount.'
             : 'Dividing only the top and leaving the bottom number at ' + D + ' would make the pieces ' +
               'smaller as well as fewer, which is a different amount.'));
}

/* FORMAT 2f - negative form: which one is ALREADY simplest (pool 3, 2 steps).
   Four fractions have to be tested, not one. */
const REDUCIBLE = [];
for (let q2 = 4; q2 <= 12; q2++) for (let p = 2; p < q2; p++) if (gcd(p, q2) > 1) REDUCIBLE.push([p, q2]);
function gAlreadySimplest(){
  let key = [3,4], slips = [[2,4],[4,6],[6,8]], g = 0;
  do {
    /* WOUND 4 (refutation 2026-09-15): the old `.filter(b => b[1] >= 3)` meant the
       game NEVER asked whether one half is in its simplest form, which is the
       first fraction a P3 child owns. The whole 45-entry table is drawn from now;
       the sameVal guard below already refuses a reducible twin of the key. */
    key = pick(SIMPLE);
    /* SECOND PASS, WOUND 1's denominator half. The key is in its simplest form and
       the three distractors are reducible, so the key carried the unique SMALLEST
       bottom number on 42.0% of draws - over the 40% the topic-wide gate allows.
       One distractor is drawn from BELOW the key's bottom number wherever the
       reducible table has one; the value rank was already spread (30/21/20/29) and
       stays that way. */
    const under = shuffle(REDUCIBLE.filter(c => c[1] < key[1] && !sameVal(c, key)));
    const bank = (under.length ? [under[0]] : []).concat(shuffle(REDUCIBLE));
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
  const q = mcFrac('Which of these fractions is <b>already</b> in its simplest form?', key, slips, '');
  /* WOUND 4 (refutation 2026-09-15): `why` used to be built from the `slips` array,
     which is the order BEFORE finishFrac shuffles, so the teaching card walked the
     three distractors in a different order from the screen in 83.3% of draws and a
     P3 child had to hunt for each line. Build it from the SHUFFLED choices. */
  const onScreen = q.choices
    .map((c, i) => i === q.correct ? null : slips.find(s => fr(s[0], s[1]) === c))
    .filter(Boolean);
  const why = onScreen.map(s => fr(s[0],s[1]) + ' divides by ' + gcd(s[0],s[1])).join(', ');
  q.explain = 'Test each one: is there a number that divides into the top AND the bottom? ' + why +
    '. Only ' + fr(key[0], key[1]) + ' has nothing left to divide by, so it is already in its simplest form.';
  return q;
}

/* FORMAT 2g - error spotting, CORRECT the mistake (pool 3, 2 steps). The named
   misconception the brief asks for: simplifying by SUBTRACTING. The printed
   claim is re-derived by the harness and must never be the true answer. */
const SCALABLE3 = SCALABLE.filter(b => b[1] >= 3);
function gSimplestError(){
  let n = 2, d = 3, k = 2, N = 4, D = 6, t = 1, kid = KIDS[0], low = [1,2];
  let key = [2,3], slips = [[3,5],[2,6],[1,2]], g = 0;
  do {
    const b = pick(SCALABLE3); n = b[0]; d = b[1];
    k = pick(scalesFor(d));
    N = k*n; D = k*d;
    /* The amount taken away is 1, 2 or the true common factor - the three a child
       actually writes. A free ri(1, N-1) drew "took 5 away from the top", which is
       arithmetically consistent and pedagogically nonsense. */
    const ts = [1, 2, k].filter(x => x >= 1 && x < N && x <= D-2);
    t = ts.length ? pick(ts) : 1;
    key = [n,d];
    /* WOUND 4 (refutation 2026-09-15): the three distractors were [N-t, D-t],
       [n, D] and [N-t, D], whose bottom numbers are D-t, D and D - all bigger than
       the key's d - so the key was the unique smallest bottom number on 20,000 of
       20,000 draws and the item could be settled without simplifying anything. The
       third slot now carries a distractor BELOW d: the same take-one-away habit
       applied a second time, to the answer. The base table is filtered to d >= 3
       so that such a fraction always exists (nothing sits below a bottom of 2). */
    low = (d-1 > n) ? [n, d-1] : [n-1, d-1];
    /* SECOND PASS, WOUND 1. Two of the three sat below the key, so it was the 3rd
       of four by value on 78.9% of draws. The mirror of the named belief - ADDING
       the same number to both instead of subtracting it - is a real classroom slip
       and it lands above the key, so the row is drawn from both sides. */
    slips = sided(key, [
      [N-t, D-t],                         /* took t away from the top AND the bottom */
      [N+t, D+t],                         /* added t to the top and the bottom instead */
      [N+1, D],                           /* one piece too many, before dividing */
      /* THIRD PASS 2026-09-16, W5. Same shortage as gSimplest: [N+t, D+t] is the
         only named candidate above the key and the 12 cap takes it off most draws,
         so the key sat at 13.7% smallest and 39.0% 2nd largest, both inside the
         new floor's and the policy cap's noise. */
      (N+t < D ? [N+t, D] : null),        /* added t to the top and left the bottom */
      [N+2, D],                           /* two pieces too many, before dividing */
      (N+1 < D-1 ? [N+1, D-1] : null),    /* one piece too many AND the bottom one short */
      (N+2 < D-1 ? [N+2, D-1] : null),
      [n, D],                             /* divided only the top */
      [N-t, D],                           /* took t off the top and left the bottom */
      low,                                /* the same habit carried on to the answer */
      (d-1 > n ? [n, d-1] : null),        /* one step too far down the bottom */
      (n+1 < d ? [n+1, d] : null),        /* one piece too many */
      [n+1, d+1],                         /* added one to the top and the bottom */
      /* THIRD PASS 2026-09-16, W5. Three-below - the key as the LARGEST of four -
         sat at 13.3%, inside the new 12% floor's sampling noise, because only the
         three "left the bottom alone / took it off both" entries land under the
         key. Two of the file's named miscounts join them. */
      (n > 1 ? [n-1, d] : null),          /* one piece too few in the answer */
      (n+1 < d-1 ? [n+1, d-1] : null),    /* one piece too many, one part too few */
      (d-2 > n ? [n, d-2] : null),        /* one step too far down the bottom, twice */
      (d+1 <= 12 ? [n, d+1] : null)       /* did not divide the bottom far enough */
    ].filter(Boolean)) || [];
    g++;
  } while (g < 200 && !(t < N && t <= D-2 && slipsOk(key, slips)));
  if (!(t < N && t <= D-2 && slipsOk(key, slips))){
    n = 2; d = 3; k = 2; N = 4; D = 6; t = 1; key = [2,3]; low = [1,2]; slips = [[3,5],[2,6],[1,2]];
  }
  kid = pick(KIDS);
  /* SEVENTH PASS 2026-09-16, WOUND 2 - THE CARD-ROW CLAUSE. The last sentence used
     to print fr(low) unconditionally, and `low` is a CANDIDATE, not a seat: sided()
     takes three of nineteen, so on 25.5 / 25.7% of draws the card said "gives 1/5"
     about a fraction the child cannot see anywhere on the screen. A wrong answer a
     child cannot compare against the row is a wrong answer they can only memorise.
     Same class as the sixth pass's W4 (closed in gPickEquiv) and as gSimplest,
     gEquivFromBar and gSubRelated, all four closed together this pass and gated by
     the CARD-ROW CLAUSE in tools/gen-sanity.mjs: a fraction named inside a
     wrong-answer sentence on the teaching card must be on the option row or in the
     stem. Where it is not seated, the habit is named in words instead. */
  const lowOnRow = slips.some(s => s[0] === low[0] && s[1] === low[1]);
  return mcFrac(kid[0] + ' says ' + fr(N,D) + ' in its simplest form is ' + fr(N-t, D-t) + ', because ' +
    kid[2] + ' took ' + t + ' away from the top and ' + t + ' away from the bottom. <b>What is ' + fr(N,D) +
    ' in its simplest form?</b>', key, slips,
    'Taking the same number away from the top and the bottom changes the amount. ' + fr(N,D) + ' is ' +
    'not ' + fr(N-t, D-t) + '. To simplify you DIVIDE both by the same number: ' + N + ' ÷ ' + k + ' = ' + n +
    ' and ' + D + ' ÷ ' + k + ' = ' + d + ', so ' + fr(N,D) + ' = ' + fr(n,d) + '. ' +
    (lowOnRow
      ? 'Carrying the same habit on to the answer - taking 1 off ' +
        (low[0] === n ? 'the bottom' : 'the top and the bottom') + ' of ' + fr(n,d) + ' - gives ' +
        fr(low[0], low[1]) + ', which is a different amount again.'
      : 'Carrying the same habit on to the answer would change the amount a second time: ' + fr(n,d) +
        ' is as far as it goes, and taking anything more off the top or the bottom makes a different ' +
        'fraction, not a simpler one.'));
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
   (pool 1, 1 step). Pictorial support is written into the syllabus objective.

   THIRD PASS 2026-09-16, W1. The v3 format drew ONE option satisfying the stem's
   direction and three from the other side of the blue fraction, so the key was the
   strict maximum when the stem said "greater" and the strict minimum when it said
   "less": the blind policy "read the direction word, take that extreme of the
   option row, never look at the bar" scored 100.00% of 20,000 draws. The bar was
   rendered on every draw and read on none of them, in the one format whose whole
   reason for existing is pictorial support - and the generator sat in RANK_EXEMPT
   beside four comparison formats whose stems DO name an extreme, under a printed
   reason ("the stem asks for an extreme") that was true of them and false of it.

   A single-threshold question cannot escape this: exactly one option greater than
   the blue fraction IS the largest option. So the deciding step is moved onto the
   PICTURE. The stem now names two conditions - the bar's own bottom number (or its
   top number, on a coin flip), which can only be got by counting the parts, and a
   direction - and the row carries TWO options on the named side of the blue
   fraction, one of which fails the counted condition. Every option still shares a
   top or a bottom number with the blue fraction, so every comparison a child makes
   is one of the two P3 rules; what has gone is the option row that could be read
   without the bar. gCompareBar is out of RANK_EXEMPT and gated like everything
   else. Measured: direction-extreme policy 100.00% -> ~33%. */
/* FOURTH PASS 2026-09-16, W1. The v4 rebuild above is real work and every number
   it declared reproduces - but the picture is STILL never needed, and now provably
   so. The four options were always exactly two PAIRS, one sharing a bottom number
   with itself and one a top number; the stem named which feature to use; and the
   blue fraction sat strictly BETWEEN the two options of the named pair on 100.00%
   of draws. So "find the pair that shares the named feature, take the direction
   extreme of those two" scored 100.00%, and reading the bar changed the answer on
   0.00% of 20,000 draws. Two conditions, one of them readable off the row, is one
   condition.

   The deeper reason, written down so the fifth pass does not rediscover it: a
   THRESHOLD condition can never need the picture. If exactly one option is greater
   than the blue fraction, that option IS the largest option, and "take the largest"
   answers it. The only escape is to stop asking for the unique option past a
   threshold and start asking WHICH option the threshold lands next to.

   So the stem asks for the smallest option still GREATER than the blue fraction (or
   the greatest still LESS than it). All four options are comparable with the bar by
   one P3 rule - either all four are written over the bar's own bottom number, or all
   four carry its top number - and the row alone cannot say which of them the answer
   is, because the answer moves as the shading moves. The key's place in the row BY
   VALUE is drawn FIRST, uniformly over all four, and the bar is then drawn into the
   gap beside it: every rank is 25%, the key is as often the smallest or the largest
   of the four as anything else, and the child has to count the shaded parts to know
   which gap the blue fraction is in.

   Measured (own harness, 20,000 draws x two seeds): the best option-row-only policy
   - every rank, every top/bottom extreme, every pair rule - scores 25.0%, against
   100.00% for the v4 row. tools/gen-sanity.mjs RULE 10 gates it over every bank in
   the topic that draws a picture, with the v4 option row as its negative control. */
function gCompareBar(){
  /* The rank is the thing that must be uniform, so it is drawn once and the numbers
     are drawn to fit it - gAddError's belief-first shape, applied to a position. */
  const rank = ri(1,4);
  let d = 9, n = 4, mode = 'sameD', dir = 'greater';
  let key = [5,9], others = [[2,9],[3,9],[7,9]], g = 0, ok = false;
  do {
    dir  = Math.random() < 0.5 ? 'greater' : 'less';
    mode = Math.random() < 0.5 ? 'sameD' : 'sameN';
    d = ri(4,12); n = ri(1,d-1);
    /* how many of the four must sit BELOW the blue fraction for the key to land on
       the drawn rank: "smallest one still greater" keys the option just above the
       gap, "greatest one still less" the option just below it. */
    const nLow = dir === 'greater' ? rank - 1 : rank;
    const nHigh = 4 - nLow;
    const low = [], high = [];
    if (mode === 'sameD'){                 /* like fractions: the bar's own bottom number */
      for (let x = 1; x < n; x++) low.push([x, d]);
      for (let x = n+1; x <= d-1; x++) high.push([x, d]);
    } else {                               /* same top number: a bigger bottom is a smaller piece */
      for (let e = d+1; e <= 12; e++) if (e > n) low.push([n, e]);
      for (let e = n+1; e <= d-1; e++) high.push([n, e]);
    }
    ok = low.length >= nLow && high.length >= nHigh;
    if (ok){
      const byVal = (p,q2) => p[0]*q2[1] - q2[0]*p[1];
      const L = shuffle(low).slice(0, nLow).sort(byVal);
      const H = shuffle(high).slice(0, nHigh).sort(byVal);
      key = dir === 'greater' ? H[0] : L[L.length-1];
      others = L.concat(H).filter(p => p !== key);
      ok = !!key && others.length === 3 && allDistinct([key].concat(others));
    }
    g++;
  } while (g < 200 && !ok);
  if (!ok){ d = 9; n = 4; mode = 'sameD'; dir = 'greater'; key = [5,9]; others = [[2,9],[3,9],[7,9]]; }
  const pairs = [key].concat(others);
  const order = shuffle(pairs.map((_,i) => i));
  const up = dir === 'greater';
  const why = mode === 'sameD'
    ? 'Every fraction on the row is written in ' + d + 'ths like the bar, so the pieces are all the same ' +
      'size and only the top numbers are compared. The tops are ' +
      pairs.map(p => p[0]).sort((x,y) => x-y).join(', ') + ', and the ' +
      (up ? 'smallest one above ' : 'biggest one below ') + n + ' is ' + key[0] + ': ' + fr(key[0], key[1]) + '.'
    : 'Every fraction on the row has a top number of ' + n + ' like the bar, so the bottom numbers decide - ' +
      'the bigger the bottom number, the more parts the whole is cut into and the SMALLER each piece. The ' +
      'bottom numbers are ' + pairs.map(p => p[1]).sort((x,y) => x-y).join(', ') + ', and a bottom number ' +
      (up ? 'UNDER ' : 'OVER ') + d + ' makes a fraction ' + (up ? 'greater' : 'less') + ' than the blue one, ' +
      'so the closest of those is the one with the ' + (up ? 'biggest' : 'smallest') + ' such bottom number, ' +
      key[1] + ': ' + fr(key[0], key[1]) + '.';
  return fig({
    q: 'The bar below shows one fraction shaded blue. Which of these fractions is the <b>' +
       (up ? 'smallest' : 'greatest') + '</b> one that is still <b>' + (up ? 'greater' : 'less') +
       '</b> than the blue fraction?',
    extra: '', choices: order.map(i => fr(pairs[i][0], pairs[i][1])), correct: order.indexOf(0),
    explain: 'Count the bar first: it is cut into ' + d + ' equal parts with ' + n + ' shaded, so the blue ' +
             'fraction is ' + fr(n,d) + '. ' + why,
    answerText: fr(key[0], key[1]),
    authoredFrac: others.map(p => [p[0], p[1]])
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

/* FORMAT 3e - error spotting, DIAGNOSE the mistake (pool 3, 2 steps).

   THE KILL, Sweep fractions Refutation 2026-09-15. The old item read:

     Siti says 1/6 is greater than 1/4, because 6 is greater than 4.
       * Siti forgot that the bigger the bottom number, the smaller each piece.
         Siti should have compared the top numbers instead of the bottom ones.
         Siti should have added the top and the bottom of each fraction first.
         Siti should have made the top numbers the same before comparing.

   Three distractors read "X should have ...", the key alone read "X forgot
   that ...", and the key was also the longest option - on 2,000 of 2,000 draws,
   in the item the feed served MORE OFTEN THAN ANY OTHER IN THE TOPIC (3.50 of
   every 30). The name was fixed after the gLPerimDiff kill; the verb phrase was
   not, so the odd sentence out was still the answer. Its whole draw space was six
   option sets - one per child name - because the four sentences were constants.

   Three things change, and all three are needed:

   1. ONE GRAMMATICAL FRAME. Every option is "<Name> <past-tense verb> ...", the
      house pattern gAddError already uses correctly, and every option sits in one
      length band (measured 53-65 characters, or to 71 with a two-word name - the
      v2 note's "50-56" was wrong and the second pass corrected it). There is no
      odd one out by form OR by length, and no option can be picked out without
      reading the stem.
   2. THE KEY MOVES. Three named comparing beliefs are authored; ONE of them is
      the mistake the stem prints, and the other two ride as distractors. Which
      one is the key rotates per draw, so no single sentence is the answer more
      than about a third of the time. A fourth option is drawn from a bank of
      never-true diagnoses PAIRED TO THE BELIEF - see the second-pass block
      below, which is what stops the reason's noun singling the key out.
   3. THE STEM SAYS WHICH BELIEF IT IS. gAddError fingerprints its belief with the
      claim's VALUE; a comparison claim is just "A is greater than B" and carries
      no such number, so the fingerprint here is the child's stated REASON, which
      each belief prints in its own form. The oracle re-derives the belief from
      that reason and fails the build if it matches none or more than one.

   Draw space: 6 names x 3 beliefs x 3 never-true diagnoses per belief x ~490
   fraction pairs = 54 distinct option sets, all 54 of them (set, key) pairs,
   measured at 5,072 distinct stems in 20,000 draws - against six option sets and
   one fixed key before, with the key the odd sentence out and the longest option
   every time. Key is the unique longest option on 10.7% of draws, sentence-frame
   tell 0.0%, noun-matching policy 36.3%. */
/* SECOND PASS 2026-09-15, KILL 1 RELOCATED. The v2 rewrite removed the grammatical
   frame tell (100% -> 0.0%) and the length tell with it, but its own third pillar
   put a new one in their place. The stem prints the child's stated REASON so the
   oracle can fingerprint the belief, and the reason named its belief with the SAME
   NOUN the key sentence used - while no other option repeated that noun. A child
   running "find the words the reason used and pick the option that repeats them"
   scored 94.5% over 5,000 draws (100% on the `top` and `sum` beliefs; 83.0% on
   `bottom` only because one filler happened to say "bottom numbers" too) without a
   single fraction being compared. Same sentence as the v1 kill, different shape.

   The fix is the refuter's own: stop letting the noun single the key out. Two
   things do that together.
     1. Two of the three BELIEF sentences now name both nouns, which is also the
        truer diagnosis - the `top` belief IS the bottom-number rule used on the
        tops, and the `sum` belief IS adding the top number to the bottom one.
     2. The never-true fourth option is drawn from a bank PAIRED TO THE BELIEF, so
        it always repeats the reason's own noun.
   On every draw at least two options repeat the reason's vocabulary - four on a
   `bottom` stem, three on a `top` stem, two on a `sum` stem - and a word-matching
   child who guesses between them scores ~36%, against 94.5% before.

   Pairing the filler to the belief closes a second thing the second pass found:
   the shared bank could offer "X made the bottom numbers the same before comparing
   them" on a stem whose two fractions ALREADY had the same bottom number (11.4% of
   draws) - correct practice, offered as a wrong answer, about a step the stem shows
   was unnecessary. Each bank below is never true of ITS OWN belief's stem shape. */
/* FIFTH PASS 2026-09-16, THE KILL, and the third time on this generator - this
   time from the OPTION ROW with the stem covered up, on 100.00% of 40,000 draws.

   `CMP_BELIEFS` had three members and all three were on every row, the key one of
   them; the fourth option was drawn from `CMP_NEVER[belief.id]`, a filler bank
   PAIRED TO THE BELIEF so that the reason's noun could not single the key out.
   That pairing is the defect: the filler then identifies the belief, and the
   belief identifies the key. 54 option rows, 54 (row, key) pairs, 54/54
   deterministic - and the two printed fractions changed the answer on 0.00% of
   draws, so 5,088 distinct stems were decoration. The v3 fix and the v2 fix,
   working exactly as designed, are what built it.

   THE PM'S RULING: drop the paired filler and draw FOUR REAL BELIEFS, so every row
   is the same four sentences and only the printed fractions plus the stated reason
   decide. That is what is here. `CMP_NEVER` is gone.

   THE FOUR BELIEFS, all of them P3 classroom errors and all four on every row:
   compared the top numbers only; the backwards bottom-number rule; added the top
   number to the bottom number; and compared the pieces that are MISSING (the gap
   between the two numbers) instead of the pieces you have.

   THE FINGERPRINT MOVES OFF THE WORDS AND ONTO THE ARITHMETIC. v2-v5 printed the
   child's reason in a form that named its belief ("9 is a smaller bottom number
   than 11"), which is what let every later attack read the belief off the words.
   The stem now prints only the two NUMBERS the child worked out, in one fixed
   frame, and which belief produced them is a fact about the two printed fractions:
   7 and 11 are tops, or bottoms, or totals, or gaps, depending entirely on what
   the fractions are. This is gAddError's fingerprint-by-value, which is the one
   error-spotting design in this file that five passes have not killed.

   WHAT THAT BUYS, and it is the whole point:
     - the option row is the same four sentences every time, so the row alone is
       worth 25.00% - chance, exactly - and the new row-only rule measures it;
     - the printed fractions are load-bearing by construction: change them and the
       same two numbers name a different belief;
     - there is no filler, so nothing on the row indexes anything;
     - the key rotates uniformly over four beliefs, so no sentence is the answer
       more than a quarter of the time.

   THE ONE REGULARITY LEFT, declared. A same-top-number stem cannot host the `top`
   belief, because comparing equal top numbers produces no claim at all, so that
   shape carries three of the four beliefs and the related-fraction shape carries
   all four. A child who reads the two fractions and sees a shared top number has
   eliminated one option: 33% rather than 25%, under every ceiling in this file,
   and it is bought by READING THE FRACTIONS, which is the thing the v5 item never
   required. */
/* SIXTH PASS 2026-09-16, THE KILL, for the FOURTH consecutive time - and the
   GENERATOR IS RETIRED. THE PM'S RULING, final for this bank: every axis this
   file can measure has now killed gCompareError - the sentence frame (v1), the
   noun overlap (v2), the paired filler naming its own key (v5) and now the
   GLYPHS of the numbers the rebuild printed (v6). It is off the topic.

   WHAT THE SIXTH PASS MEASURED. The v6 rebuild moved the fingerprint off the
   WORDS of the child's reason and onto the two numbers it prints, which name a
   belief only in the light of the two printed fractions. Row-only fell to 25.1%,
   exactly chance, and the printed fractions became load-bearing on 88%. All of
   that reproduces. And the item is answered by a FOUR-CLAUSE RULE WITH NO
   ARITHMETIC IN ANY CLAUSE on 91.84% / 91.19% of 20,000 draws on each of two
   seeds:

     are the two worked-out numbers the same two numerals as the two TOP numbers?
       -> "compared the top numbers"
     as the two BOTTOM numbers?              -> "bigger bottom number"
     otherwise, does either have TWO DIGITS? -> "added them"
     otherwise                               -> "counted what is missing"

   Clauses 1 and 2 are pure numeral matching, fire on 50.5% of draws and never
   misfire; clause 3 counts glyphs in a numeral, which is how a P3 child tells 14
   from 4. The rebuild printed the belief's own arithmetic OUTPUT, and for two of
   the four beliefs that output is literally a numeral already on the screen - so
   copying a numeral, which is not a fraction operation, names the misconception.
   A second, independent regularity the v6 note declared only in its weak half:
   "if the two fractions do not share a top number, answer compared-the-tops" is
   worth 44.12% / 43.70% overall, not the declared 33% on one shape.

   WHY NOT A FIFTH REWRITE. An error-spotting item MUST print the evidence it asks
   the child to diagnose, and the evidence is numbers; every rewrite of this bank
   has moved the fingerprint to a different surface of the same printed evidence.
   The PM's ruling is the same one that retired the prose concept check: four
   passes on one generator is a structural finding about the FORMAT, not a wording
   defect. gAddError remains this topic's error-spotting format and is gated by
   RULE 13 like everything else.

   WHAT REPLACES IT. The slot is pool 3 / `compare`, two steps, so the refill is
   the PM's own named design - FORMAT 3e below, "which of these four is between X
   and Y" over related denominators, rank-gated. It is numeric, so there is no
   sentence to recognise; the two bounds must both be converted before any option
   can be judged, so it is genuinely two-step; and the key is one interior value
   out of several, so no extreme of the row names it. */
/* FORMAT 3e - which fraction lies BETWEEN two printed ones (pool 3, 2 steps).
   Step 1: cut both bounds into the smaller pieces the options are written in.
   Step 2: read which single option lands strictly between them.

   THE DESIGN CONSTRAINTS, each one a gate this file already carries:
     - RULE 7: the key's value rank is drawn FIRST and sided() is forced to seat
       it, so the key is not the extreme of the row and "pick the middle one" is
       worth nothing. The two bounds are themselves offered - a child who has not
       understood "between" picks an end - and they sit on opposite sides.
     - THE COUPLING BAN: the stem's own bottom number is on the row (the two
       converted bounds are not, the printed ones are), so "keep the bottom number
       the question gives you" picks a DISTRACTOR.
     - RULE 12: the stem prints four numerals and the key's bottom number is the
       scaled one, which is in no word of the stem, so no six-row table over the
       stem's numerals names the key.
     - RULE 13: every option is a fraction and the key's numerals are not the
       stem's, so numeral membership leaves at least two options standing.
   The bounds are ADJACENT b-ths, so exactly the interior d-ths lie between them
   and the item has one answer by construction rather than by filtering. */
/* The two ends are RELATED, which is the only comparison P3 owns: one is written
   over `b` and the other over `d = m x b`, so exactly one conversion is needed
   before the row can be read at all. The ends are drawn to leave AT LEAST TWO
   d-ths strictly between them, which is what keeps the stem from naming the key:
   a child who memorises the pair of ends still has to choose between two or more
   interior values, so the six-row stem table of RULE 12 is worth nothing here. */
/* SEVENTH PASS 2026-09-16, WOUND 3 - THE STEM SPACE, DECLARED WITH ITS ARITHMETIC
   RATHER THAN WIDENED. The refutation asks for 200 distinct stems here and the
   format cannot reach it inside P3: the loop below is the COMPLETE enumeration of
   legal (d, b, x, y) - every related pair with a bottom number to 12 and at least
   two twelfths of room between the ends - and it yields 108 shapes and 107 distinct
   stems. Relaxing the guard to hi - lo >= 2 takes it to 150 shapes, still short of
   200, and every stem it adds has exactly ONE value between its ends, so the pair
   of ends NAMES the key on those draws and the stem-recall route goes UP, not down.
   The only other widenings available leave related pairs, which is P4 content.
   Measured: a child who has met all 107 stems and recalls each one's answer scores
   56.7 / 56.8% on 20,000 held-out draws (two seeds), under the 60% line the file
   uses everywhere - carried as the stem-space class, with its exposure of
   1.69 / 1.67 items a session at 80% accuracy. */
const BTW_SHAPES = [];
for (let d2 = 4; d2 <= 12; d2++)
  for (let b2 = 2; b2 < d2; b2++) if (d2 % b2 === 0)
    for (let x2 = 1; x2 < b2; x2++)
      for (let y2 = 1; y2 < d2; y2++) {
        const lo2 = Math.min(x2*(d2/b2), y2), hi2 = Math.max(x2*(d2/b2), y2);
        if (hi2 - lo2 >= 3) BTW_SHAPES.push([d2, b2, x2, y2]);
      }
function gBetween(){
  const rank = ri(1,4);
  let d = 12, b = 3, m = 4, x = 1, y = 9, lo = 4, hi = 9, key = [6,12], slips = [[3,12],[1,3],[10,12]], g = 0;
  do {
    const s = pick(BTW_SHAPES);
    d = s[0]; b = s[1]; m = d/b; x = s[2]; y = s[3];
    lo = Math.min(x*m, y); hi = Math.max(x*m, y);
    const inside = [];
    for (let t = lo+1; t <= hi-1; t++) inside.push(t);
    key = [pick(inside), d];
    const t0 = key[0];
    /* NOTHING in the candidate bank may lie strictly between the two ends, or the
       item has two right answers; every entry is a named belief. */
    const between = p => lo*p[1] < p[0]*d && p[0]*d < hi*p[1];
    const cands = [
      [lo, d], [hi, d],                     /* took one of the two ends */
      [x, b], [y, d],                       /* took an end exactly as the stem prints it */
      (lo-1 >= 1 ? [lo-1, d] : null),       /* just under the lower end */
      (hi+1 < d ? [hi+1, d] : null),        /* just over the upper end */
      [x, d],                               /* kept the top number, changed only the bottom */
      (y < b ? [y, b] : null),              /* read the second end in the FIRST end's pieces */
      (t0 < b ? [t0, b] : null),            /* the right top number over the wrong bottom */
      (x+y < d ? [x+y, d] : null),          /* added the two printed top numbers */
      (lo+hi < d ? [lo+hi, d] : null),      /* added the two converted top numbers */
      (Math.abs(y-x) >= 1 && Math.abs(y-x) < b ? [Math.abs(y-x), b] : null)
    ].filter(Boolean).filter(p => legalFrac(p) && !between(p) && !sameVal(p, key));
    slips = sided(key, cands, sameDen(cands, b, key), 4 - rank) || [];
    g++;
    /* THE MIRROR OF THE COUPLING BAN, and this format is the one place in the file
       where it bites the other way round. sameDen() deliberately seats an option
       written over the STEM'S first bottom number so that "keep the bottom number
       the question gives you" cannot isolate the key - and the key here is written
       over the SCALED bottom number, so seating two or three of those would leave
       the key the unique option NOT over `b`, which is the same rule read
       backwards. At least one slip shares the key's own bottom number as well, so
       neither direction of the rule is ever alone on the row. */
  } while (g < 200 && !(slipsOk(key, slips) && !digitIsolatesKey(key, slips) &&
                        slips.filter(s2 => s2[1] === d).length >= 1 &&
                        slips.filter(s2 => s2[1] === b).length >= 1));
  if (!slipsOk(key, slips)){
    d = 12; b = 3; m = 4; x = 1; y = 9; lo = 4; hi = 9; key = [6,12]; slips = [[3,12],[1,3],[10,12]];
  }
  const A = x*m < y ? [x, b] : [y, d], B = x*m < y ? [y, d] : [x, b];
  return mcFrac('Which of these fractions is <b>between</b> ' + fr(A[0],A[1]) + ' and ' + fr(B[0],B[1]) + '?',
    key, slips,
    'Step 1: the two ends are not written in the same size of piece, so cut ' + fr(x,b) + ' into ' + d +
    'ths first: ' + x + ' × ' + m + ' = ' + (x*m) + ' and ' + b + ' × ' + m + ' = ' + d + ', so ' + fr(x,b) +
    ' is the same amount as ' + fr(x*m,d) + '. ' +
    'Step 2: now every fraction is in ' + d + 'ths, so just count the tops - the answer has to be more than ' +
    lo + ' of them and fewer than ' + hi + '. That is ' + fr(key[0], key[1]) + '. ' +
    fr(A[0],A[1]) + ' and ' + fr(B[0],B[1]) + ' are the two ends themselves, so neither of them is between them.');
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

/* FORMAT 3h - the gap in an ordered row (pool 3, 2 steps).
   WOUND 1 (Sweep fractions Refutation 2026-09-15). The feed round-robins SKILLS
   inside a pool and only then picks a generator inside the skill, so a pool-3
   skill with one generator gets a full fifth of pool 3 to itself - which is how
   gCompareError reached 3.50 items in a 30-item session out of six option sets.
   Retagging gGreatest4 from `order` to `compare` (it asks for one extreme of
   four, which is comparing) halves that, but it would leave `order` holding one
   generator and make gOrderThree the new hog. This is `order`'s second format:
   the child reads a row that is already in order and says what is missing from
   it, which is ordering read from the inside rather than from the ends. */
/* Three distractors from OUTSIDE the gap, taking one from each side first where
   both sides exist: drawing all three from one side would leave the key as the
   extreme of the option row, which is a shape a child can learn without ordering
   anything. (At the ends of the denominator range one side is empty and the key
   is the extreme unavoidably - that residual is measured, not hidden.) */
function outsideThree(aboveHi, belowLo){
  const a = shuffle(aboveHi), b = shuffle(belowLo), out = [];
  if (a.length && b.length){ out.push(a.shift()); out.push(b.shift()); }
  for (const x of shuffle(a.concat(b))){ if (out.length >= 3) break; out.push(x); }
  return out;
}
/* SECOND PASS 2026-09-15, WOUND 2 - THE FORMAT DID NOT DISCRIMINATE. As first cut,
   the gap was ALWAYS the middle slot of the row, every option shared a top or a
   bottom number with the two printed ends, and the three distractors were drawn
   from strictly outside the gap. So "pick the option whose varying INTEGER lies
   numerically between the two printed ones" was right on 100.0% of 20,000 draws -
   and, worse, a child holding the backwards rule (a bigger bottom number makes a
   bigger fraction), which is the misconception the whole `order` skill exists to
   correct, picked the SAME option as a child holding the correct rule, because the
   middle integer is the middle integer either way. The item was added to give
   `order` a second format and to carry the direction rule, and at 1.78 items a
   session it carried betweenness of an integer and nothing else.

   The gap now moves: it is the smallest, the middle OR the greatest slot of the
   row, drawn evenly. At an END there is no "between" to read off - the child has to
   know which way the row runs, so the backwards-rule child picks a WRONG option,
   which is exactly what the format was added for. The distractors are whatever
   fails the row, which at an end means they sit on the far side of the printed
   neighbour, and the key's value rank moves with the gap instead of sitting mid-row
   on every draw. */
function gOrderGap(){
  let mode = 'sameN', asc = true, gapPos = 1, n = 1, d = 8;
  let row = [[1,10],[1,8],[1,4]], key = [1,8], slips = [[1,12],[1,6],[1,3]];
  let g = 0, ok = false;
  /* mode, direction and GAP POSITION are drawn once, outside the retry loop: a
     middle gap is rejected more often than an end one (it needs a wrong option on
     both sides), and redrawing the position on every retry quietly pushed the ends
     to 37.8% each where an even third is 33.3%. The retry redraws the row, not the
     shape of the question. */
  mode = Math.random() < 0.5 ? 'sameN' : 'sameD';
  asc = Math.random() < 0.5;
  gapPos = ri(0,2);
  do {
    let cands;
    if (mode === 'sameN'){
      n = ri(1,3);
      cands = Array.from({length: 12-n}, (_,i) => [n, n+1+i]);
    } else {
      d = ri(6,12);
      cands = Array.from({length: d-1}, (_,i) => [i+1, d]);
    }
    cands = cands.filter(legalFrac);
    /* value-ascending, which for a shared TOP number is bottom-number-descending */
    const byVal = cands.slice().sort((a,b) => a[0]*b[1] - b[0]*a[1]);
    if (byVal.length >= 6){
      const idx = shuffle(byVal.map((_,i) => i)).slice(0,3).sort((a,b) => a-b);
      row = idx.map(i => byVal[i]);
      key = row[gapPos];
      const printed = row.filter((_,i) => i !== gapPos);
      /* a candidate FITS only if dropping it into the gap leaves the row strictly
         increasing in value - which is the whole of the ordering rule, read from
         wherever the gap happens to be */
      const fits = X => {
        const t = row.map((p,i) => i === gapPos ? X : p);
        return t[0][0]*t[1][1] < t[1][0]*t[0][1] && t[1][0]*t[2][1] < t[2][0]*t[1][1];
      };
      const wrong = byVal.filter(c => !sameVal(c, key) && !printed.some(p => sameVal(p, c)) && !fits(c));
      const hi = wrong.filter(c => c[0]*key[1] > key[0]*c[1]);
      const lo2 = wrong.filter(c => c[0]*key[1] < key[0]*c[1]);
      slips = outsideThree(hi, lo2);
      /* With the gap in the MIDDLE both sides exist, so both must be on the row:
         letting all three fall on one side put the key back at an extreme and left
         "pick the smallest" / "pick the largest" over the 40% the gate allows. */
      ok = slips.length === 3 && slipsOk(key, slips) && row.every(legalFrac) &&
           (gapPos !== 1 || (hi.length >= 1 && lo2.length >= 1));
    }
    g++;
  } while (g < 200 && !ok);
  if (!ok){
    mode = 'sameN'; asc = true; gapPos = 1; n = 1;
    row = [[1,10],[1,8],[1,4]]; key = [1,8]; slips = [[1,12],[1,6],[1,3]];
  }
  const shown = (asc ? row.slice() : row.slice().reverse());
  const gapAt = asc ? gapPos : 2 - gapPos;
  const rendered = shown.map((p,i) => i === gapAt ? '?' : fr(p[0], p[1])).join(', ');
  const rule = mode === 'sameD'
    ? 'All of these have the same bottom number, ' + key[1] + ', so every piece is the same size and the top numbers put them in order.'
    : 'All of these have the same top number, ' + key[0] + ', so the bottom numbers put them in order - and the bigger the bottom number, the smaller the piece.';
  const where = gapPos === 1
    ? 'The gap sits between ' + fr(row[0][0],row[0][1]) + ' and ' + fr(row[2][0],row[2][1]) +
      ', so the missing fraction must be greater than ' + fr(row[0][0],row[0][1]) + ' and smaller than ' +
      fr(row[2][0],row[2][1]) + ': that is ' + fr(key[0],key[1]) + '.'
    : gapPos === 0
      ? 'The gap is at the SMALLEST end of the row, so the missing fraction must be smaller than ' +
        fr(row[1][0],row[1][1]) + ' - smaller than everything printed: that is ' + fr(key[0],key[1]) + '.'
      : 'The gap is at the GREATEST end of the row, so the missing fraction must be greater than ' +
        fr(row[1][0],row[1][1]) + ' - greater than everything printed: that is ' + fr(key[0],key[1]) + '.';
  return mcFrac('These fractions are in order, from the <b>' +
    (asc ? 'smallest to the greatest' : 'greatest to the smallest') + '</b>: ' + rendered +
    '. <b>Which fraction belongs in the gap?</b>', key, slips,
    rule + ' ' + where + ' Say the direction out loud before you start: every other option ' +
    'would break the order the row is already in.');
}


/* ===========================================================================
   PRINCIPLE 4 - ADDING AND SUBTRACTING WITHIN ONE WHOLE
   =========================================================================== */

/* FORMAT 4a - like fractions, add (pool 1, 1 step). */
function gAddSame(){
  let d = 9, a = 4, b = 3, key = [7,9], slips = [[1,9],[8,9],[7,8]], g = 0;
  const rank = ri(1,4);
  do {
    d = ri(4,12); a = ri(1,d-2); b = ri(1,d-a-1);
    key = [a+b, d];
    /* SECOND PASS, WOUND 1. [a+b, 2d] and [|a-b|, d] both sit below the key and
       [a+b+1, d] above it, so the key was the 3rd of four by value on 100.00% of
       50,000 draws - "pick the second largest" answered the pool-1 addition anchor
       every time, at 1.35 served items a session. Adding like fractions has no
       named belief that OVERSHOOTS, so the other side is carried by the two
       documented second-order slips the teaching card already names: counting one
       piece too many, and counting the bottom number one short. */
    /* THIRD PASS 2026-09-16, W4. [a+b, 2d] printed a bottom number past 12 on the
       option row of the declared pool-1 addition anchor in 36.5% of draws. The
       belief is not lost - the teaching card names it in words and gives the
       bottom number it produces - but an off-syllabus fraction is no longer put in
       front of a P3 child as something to choose. legalFrac refuses it now; it is
       left in the list, commented, so the next lane can see what was taken out and
       why rather than finding a gap. */
    const cands = [
      /* [a+b, 2*d] - added the bottom numbers as well; bottom number past 12 */
      [Math.abs(a-b), d],               /* subtracted the top numbers instead */
      [a+b+1, d],                       /* counted one piece too many */
      [a+b-1, d],                       /* counted one piece too few */
      (a+b < d-1 ? [a+b, d-1] : null),  /* miscounted the size of the pieces, one short */
      (d+1 <= 12 ? [a+b, d+1] : null),  /* miscounted the size of the pieces, one over */
      [a+b+1, d+1],                     /* one piece too many, out of one part too many */
      /* FIFTH PASS 2026-09-16, W2: two slips written with a FRESH numeral, so the
         row is not four writings of the same two numbers and "pick the option
         whose top and bottom are both printed elsewhere" has something else to
         land on. Both are the real classroom slip of answering one of the two
         fractions instead of adding them. */
      [a, d], [b, d],
      (d+1 <= 12 ? [Math.abs(a-b), d+1] : null),  /* subtracted, and the pieces miscounted */
      /* SIXTH PASS 2026-09-16, WOUND 1 - THE ROW-SHAPE CLASS, and this bank is the
         finding. RULE 11 exempted it on 677 distinct ROWS, and a child does not
         memorise rows, they memorise a row SHAPE - which printed numerals repeat
         and where, with the four options put in order of their bottom number.
         Masked that way the bank had EIGHTEEN shapes and every one of the eighteen
         named the key's slot on 100.0% of held-out draws, at 5.18 served items a
         session to a struggling child. The plainest case: four options over ONE
         bottom number, where the key is the biggest top on 100% of those draws -
         which happens because every candidate over `d` except [a+b+1, d] sits
         BELOW the key, and sided() prefers a small bottom number when it reaches
         above it, so an all-one-bottom row could only be an all-below seating.
         RULE 7's flat 25/25/25/25 here is an AVERAGE over shapes each of which
         pins the rank at 100%.
         The cure is the one the PM named: widen the shape space until it is past
         the memorisable line. Every miscount below is one the teaching card
         already names, written over a bottom number the row did not previously
         reach, so the masked pattern moves with the numbers instead of with the
         key. 18 shapes -> see the lane note for the measured figure. */
      (a+b < d-2 && d-2 >= 2 ? [a+b, d-2] : null),      /* the pieces miscounted, two short */
      (d+2 <= 12 ? [a+b, d+2] : null),                  /* ... and two over */
      (a+b+1 < d-1 ? [a+b+1, d-1] : null),              /* one piece too many, one part too few */
      (d+1 <= 12 ? [a+b-1, d+1] : null),                /* one piece too few, one part too many */
      (d-1 > a ? [a, d-1] : null), (d+1 <= 12 ? [b, d+1] : null)  /* one addend, pieces miscounted */
    ].filter(Boolean);
    /* SIXTH PASS 2026-09-16, RULE 13, and it is the price of the widening above.
       Spreading the bottom numbers to d-2 .. d+2 is what breaks the shape lookup,
       and it also made the key the UNIQUE option still written over the bottom
       number the stem prints - so "pick the option whose bottom number is on the
       question and whose top number is not" settled the bank on 73.3% of draws
       with nothing added. sameDen() is the fix this file already owns: one or two
       of the three seats go to a named belief over the stem's own bottom number,
       which is the same seat gPicUnshaded, gSubSame and gMakeOne hold for the
       coupling ban read the other way round. */
    slips = sided(key, cands, sameDen(cands, d, key), 4 - rank) || [];
    g++;
    /* a + b + 1 < d keeps an OVERSHOOT reachable: at a + b = d - 1 every candidate
       above the key is improper, and the key was the largest of four on 64.6% of
       draws until this guard went in. */
    /* FIFTH PASS 2026-09-16, W2: the digit-overlap ban. "Pick the option whose top
       and bottom number both appear somewhere else on the row" isolated the key
       here on 66.8% of draws, because every named belief is the key with ONE
       number nudged - which leaves each distractor a numeral of its own and the
       key none. See digitIsolatesKey(). */
  } while (g < 200 && !(a !== b && a+b+1 < d && slipsOk(key, slips) && !digitIsolatesKey(key, slips)));
  if (!(a !== b && a+b+1 < d && slipsOk(key, slips))){ d = 9; a = 4; b = 3; key = [7,9]; slips = [[1,9],[8,9],[7,8]]; }
  return mcFrac(fr(a,d) + ' + ' + fr(b,d) + ' = ?', key, slips,
    'Both fractions have the same bottom number, ' + d + ', so the pieces are already the same size. ' +
    'Count the pieces: ' + a + ' + ' + b + ' = ' + (a+b) + '. The bottom number is the SIZE of each piece, ' +
    'so it stays ' + d + ', and the answer is ' + fr(a+b, d) + '. Adding the bottom numbers as well would ' +
    'make the bottom number ' + (2*d) + ' - twice as many pieces, so only half as much.');
}

/* FORMAT 4b - like fractions, subtract (pool 2, 1 step). */
function gSubSame(){
  let d = 9, a = 5, b = 2, key = [3,9], slips = [[7,9],[3,7],[4,9]], g = 0;
  const rank = ri(1,4);
  do {
    d = ri(5,12); a = ri(3,d-1); b = ri(1,a-1);
    key = [a-b, d];
    /* SECOND PASS, WOUND 1. All three sat ABOVE the key, so it was the smallest of
       four on 100.00% of 50,000 draws - "pick the smallest" answered this item
       every time. The mirror of the named bottom-number belief lands below it:
       taking the bottom numbers away gives d - b, ADDING them gives 2d, and both
       are slips a child writes on a like-fraction subtraction. */
    /* THIRD PASS 2026-09-16, W4 + W5. Two of the three below-key candidates were
       [a-b, 2d] and [a-b, d+b], which is why 39.8% of this item's option rows
       printed a bottom number past 12 (ceiling 24) after a note that declared
       0.0%, and why the key was the LARGEST of four on only 8.2% of draws - under
       RULE 7's new 12% floor - because below the key there was often nothing legal
       left to seat. Both overshoot entries are gone with the 12 cap, and the
       below-key side is carried instead by the second-order miscounts the teaching
       cards in this file already name: one piece too few, the size of the piece
       one or two too many, and the two of them together. */
    /* FIFTH PASS 2026-09-16, W1, THE WORST OF THE CLASS. "Keep the bottom number
       the question gives you" answered this bank on 74.3% of draws and ISOLATED
       the key - exactly one option over the stem's own bottom number, and it the
       right one - on 48.7%: a drawn row was 3/6 − 1/6 with 2/5, 1/5, *2/6, 3/5,
       and the child never subtracts. One or two seats are held for a belief
       written over d now, so the rule leaves two or three options standing and
       the tops have to be counted. */
    const cands = [
      [a+b, d],                         /* added the top numbers instead */
      [a-b, d-b],                       /* took the bottom numbers away as well */
      [a-b+1, d],                       /* counted one piece too many */
      [a-b+1, d-1],                     /* a piece too many AND a part too few */
      [a-b-1, d],                       /* counted one piece too few */
      [a-b-1, d-1],                     /* a piece too few AND a part too few */
      (d+1 <= 12 ? [a-b, d+1] : null),  /* miscounted the size of the pieces, one over */
      (d+2 <= 12 ? [a-b, d+2] : null),  /* miscounted the size of the pieces, two over */
      (d+b <= 12 ? [a-b, d+b] : null)   /* added b to the bottom number */
    ].filter(Boolean);
    slips = sided(key, cands, sameDen(cands, d, key), 4 - rank) || [];
    g++;
  } while (g < 200 && !(a+b < d && d-b >= 2 && slipsOk(key, slips) && !digitIsolatesKey(key, slips)));
  if (!(a+b < d && d-b >= 2 && slipsOk(key, slips))){ d = 9; a = 5; b = 2; key = [3,9]; slips = [[7,9],[3,7],[4,9]]; }
  /* FIFTH PASS 2026-09-16, WOUND 4, the gPickEquiv treatment. [a-b, d-b] is one
     candidate of nine, and the same-denominator seats of wound 1 made it a rarer
     one - 28.3% of cards named a value off the row at v5, 67.8% after. Its value
     is printed where it is offered and the slip is named in WORDS where it is
     not, which is what the rest of the file already does. */
  /* SEVENTH PASS 2026-09-16, THE CARD-ROW CLAUSE: the SEATED form is printed, not
     the candidate's own - sided()'s uniq() may have seated the same amount written
     in bigger pieces, and a child hunting the row for the glyphs the card printed
     does not find them. */
  const seated = slips.find(s => sameVal(s, [a-b, d-b]));
  return mcFrac(fr(a,d) + ' − ' + fr(b,d) + ' = ?', key, slips,
    'Both fractions are the same size of piece, so take the pieces away and leave the bottom number alone: ' +
    a + ' − ' + b + ' = ' + (a-b) + ', giving ' + fr(a-b, d) + '. ' + (seated
      ? 'Subtracting the bottom numbers as well would give ' + fr(seated[0], seated[1]) +
        ' - but the pieces did not change size, only how many there are.'
      : 'Subtracting the bottom numbers as well would change the SIZE of each piece - and the pieces did not change size, only how many there are.'));
}

/* FORMAT 4c - one whole, taken apart (pool 2, 1 step). */
function gSubFromOne(){
  let d = 8, a = 3, key = [5,8], slips = [[3,8],[6,8],[4,8]], g = 0;
  const rank = ri(1,4);
  do {
    d = ri(4,12); a = ri(2,d-2);
    key = [d-a, d];
    /* WOUND 4: the part taken away, [a, d], is worth the KEY when d === 2a, so
       neither of the two one-whole formats could ever key one half. SECOND PASS
       W3(a) caps the substitute inside the syllabus (it printed a bottom number of
       13 at d = 12) and WOUND 1 puts the choice of three through sided(). */
    /* FIFTH PASS 2026-09-16, W1: 62.9% on the stem's own bottom number, over the
       60% ceiling; one or two seats are held for a belief that carries it. */
    const cands = [
      [a, d],                           /* answered the part that was taken away */
      [d-a+1, d], [d-a-1, d],           /* one piece too many / too few */
      [d-a+1, d-1], [d-a-1, d-1],       /* a piece AND a part miscounted, each way */
      (d+1 <= 12 ? [d-a, d+1] : null),  /* changed the size of the pieces as well */
      (d-a < d-1 ? [d-a, d-1] : null)   /* took the 1 off the bottom number instead */
    ].filter(Boolean);
    slips = sided(key, cands, sameDen(cands, d, key), 4 - rank) || [];
    g++;
  } while (g < 200 && !(slipsOk(key, slips) && !digitIsolatesKey(key, slips)));
  if (!slipsOk(key, slips)){ d = 8; a = 3; key = [5,8]; slips = [[3,8],[6,8],[4,8]]; }
  return mcFrac('1 − ' + fr(a,d) + ' = ?', key, slips,
    'One whole is ' + fr(d,d) + ' - ' + d + ' pieces out of ' + d + '. Take ' + a + ' of them away: ' +
    d + ' − ' + a + ' = ' + (d-a) + ', so the answer is ' + fr(d-a, d) + '.' +
    /* SECOND PASS, W2: the closing sentence called fr(a, d) "the part that was taken
       away, not the part that is left" - and when d = 2a that IS the key, so the
       card denied its own answer on 26.0% of draws. */
    (d === 2*a ? ' Exactly half was taken away here, so what is left is ' + fr(a,d) + ' as well - the same amount, counted the other way round.'
               : ' ' + fr(a,d) + ' is the part that was taken away, not the part that is left.'));
}

/* FORMAT 4d - working backwards to one whole (pool 3, 1 step). DECLARED ANCHOR:
   pool 3's second single-step item, kept on purpose. */
function gMakeOne(){
  let d = 8, a = 3, key = [5,8], slips = [[3,8],[6,8],[4,8]], g = 0;
  const rank = ri(1,4);
  do {
    /* THIRD PASS 2026-09-16, W5(a) - the other half of the three-formats-in-one
       finding. This one is widened where working BACKWARDS can go: the amount
       already there may be a single piece or all but one, and the "a piece AND a
       part miscounted" pair is carried in BOTH directions on the bottom number,
       which gPicUnshaded and gSubFromOne do not do. */
    d = ri(4,12); a = ri(1,d-1);
    key = [d-a, d];
    /* WOUND 4 + SECOND PASS W3(a) and WOUND 1 - the same three changes gSubFromOne
       carries, for the same reasons. */
    /* FIFTH PASS 2026-09-16, W1: 68.8% accuracy and 40.2% ISOLATING on "keep the
       bottom number the question gives you", both over the ceiling. Seats held. */
    const cands = [
      [a, d],                           /* answered the part already there */
      [d-a+1, d], [d-a-1, d],           /* one piece too many / too few */
      [d-a+1, d-1], [d-a-1, d-1],       /* a piece AND a part miscounted, each way */
      (d+1 <= 12 ? [d-a+1, d+1] : null),/* the same again, one part too MANY */
      (d+1 <= 12 ? [d-a-1, d+1] : null),
      [d-a+2, d], [d-a-2, d],           /* two pieces too many / too few */
      (d+1 <= 12 ? [d-a, d+1] : null),  /* changed the size of the pieces as well */
      (d-a < d-1 ? [d-a, d-1] : null)   /* took one off the bottom number instead */
    ].filter(Boolean);
    slips = sided(key, cands, sameDen(cands, d, key), 4 - rank) || [];
    g++;
  } while (g < 200 && !(slipsOk(key, slips) && !digitIsolatesKey(key, slips)));
  if (!slipsOk(key, slips)){ d = 8; a = 3; key = [5,8]; slips = [[3,8],[6,8],[4,8]]; }
  return mcFrac(fr(a,d) + ' + ? = 1 &nbsp; What is the missing fraction?', key, slips,
    'One whole is ' + fr(d,d) + '. You already have ' + a + ' ' + (a === 1 ? 'piece' : 'pieces') +
    ', so you need ' + d + ' − ' + a + ' = ' +
    (d-a) + ' more of the same pieces: ' + fr(d-a, d) + '. Check it: ' + fr(a,d) + ' + ' + fr(d-a, d) + ' = ' +
    fr(d,d) + ', which is 1.');
}

/* FORMAT 4d(ii) - making one whole in SMALLER pieces (pool 3, 2 steps).
   WOUND 1's other half. `wholes` was the second pool-3 skill with a single
   generator, so gMakeOne took a fifth of pool 3 on its own - 3.08 items per
   30-item session out of 32 distinct stems, re-putting a stem the child had
   already answered IN THE SAME SESSION in 11.6% of sessions. This is the skill's
   second format and it is a genuine two-step: take the part from one whole, then
   write what is left over a bigger bottom number. It is also the one place the
   bank makes a child use equivalence INSIDE an adding question, which is the
   move MOE P3 3.2 is really asking for. */
/* SECOND PASS 2026-09-15, W4. Authored at TWENTY-FIVE distinct stems and served
   1.70 times in a 30-item session, so a child meets its whole draw space in about
   fifteen sessions. The (d, k, a) space is capped at 26 by the syllabus itself -
   D = k x d must not pass 12 - so the widening has to come from the READING, not
   from the numbers: the same equivalence-inside-one-whole move is now asked three
   ways, which is how a teacher would rotate it and takes the space past 60.
   WOUND 1: the three slips were fixed in order, which pinned the key to 2nd of
   four on 72% of draws; sided() picks them now. */
/* SIXTH PASS 2026-09-16, W4 - DECLARED, NOT FIXED, and declared here rather than
   found later. The v6 pass narrowed this bank's OPTION-ROW space from 392 distinct
   rows to 190, a halving, in a bank served 1.78 items a session - the one
   narrowing in a file whose other six movements were widenings (gPicIdentify
   327 -> 592, gAddSame 453 -> 771, gPicUnshaded 412 -> 827, gSubFromOne 284 -> 526,
   gSubSame 540 -> 927, gMakeOne 789 -> 1337). It is a side-effect of the coupling
   seat: holding one or two of the three places for a belief written over the
   stem's own bottom number removes exactly the rows that had none. The v5 note's
   own lesson - "the note declared the stem cost of the cap and never the
   option-row cost" - applies in the other direction, so the number is on record.
   It is also the file's smallest ROW-SHAPE space: FOUR masked shapes, naming the
   key's slot on 74.5% of held-out draws. That is the wave-2 class RULE 11's shape
   watch line now prints on every run; this bank is its floor and, at 1.78 items a
   session, its worst case by exposure. Widening it needs (d, k, a) room the 12 cap
   does not have, which is why it is handed on rather than patched. */
const MAKE_ONE_IN = [
  (A, B) => A + ' + ? = 1',
  (A, B) => '? + ' + A + ' = 1',
  (A, B) => '1 − ' + A + ' = ?'
];
function gMakeOneIn(){
  let d = 4, k = 3, D = 12, a = 1, form = 0, key = [9,12], slips = [[1,12],[3,12],[11,12]], g = 0, ok = false;
  const rank = ri(1,4);
  do {
    d = pick([2,3,4,5,6]); k = pick(scalesFor(d)); D = k*d; a = ri(1, d-1);
    form = ri(0, MAKE_ONE_IN.length - 1);
    key = [D - k*a, D];
    /* [d-a, D] is the belief the card names (right top number, new bottom number);
       [k*a, D] is the part already there; [D-a, D] forgot to scale the top; the two
       ±1 entries are the documented second-order slip (one small piece out), which
       is what keeps a side available when d = 2 collapses the named ones. */
    slips = sided(key, [
      [d-a, D], [k*a, D], [D-a, D], [D - k*a + 1, D], [D - k*a - 1, D],
      [D - k*a + k, D], [D - k*a - k, D],  /* one BIG piece out, converted, each way */
      /* THIRD PASS 2026-09-16, W5: two more each way, so that the extreme seatings
         clear RULE 7's new 12% floor with room rather than sitting inside its
         sampling noise (15.0 / 14.7 measured at 20,000 draws). */
      [D - k*a + 2, D], [D - k*a - 2, D],  /* two small pieces out, each way */
      (D-1 > D - k*a ? [D - k*a, D-1] : null),
      (D+1 <= 12 ? [D - k*a, D+1] : null), /* the small pieces miscounted, each way */
      /* FIFTH PASS 2026-09-16, W2: three slips with a FRESH numeral, so the row
         stops being five writings of D - ka. Each is a real step-1 or step-2
         slip: the big pieces left uncounted, the part already there written in
         big pieces, and the scaling done on the wrong number. */
      [a, D], [d, D], (k*(d-a) - a > 0 ? [k*(d-a) - a, D] : null)
    ].filter(Boolean), null, 4 - rank) || [];
    /* FIFTH PASS 2026-09-16, W2, THE WORST OF THE DIGIT-OVERLAP CLASS: 74.6% of
       draws isolated the key on "both my numbers are printed somewhere else on
       the row". Every candidate above is the key with one number moved, so the
       key was the only option with no numeral of its own. */
    ok = D <= 12 && a < d && slipsOk(key, slips) && !digitIsolatesKey(key, slips);
    g++;
  } while (g < 200 && !ok);
  if (!ok){ d = 4; k = 3; D = 12; a = 1; form = 0; key = [9,12]; slips = [[3,12],[1,12],[11,12]]; }
  const mSeat = slips.find(s => sameVal(s, [d-a, D]));
  return mcFrac(MAKE_ONE_IN[form](fr(a,d), D) +
    ' &nbsp; What is the missing fraction, written in ' + D + 'ths?',
    key, slips,
    'Step 1: one whole is ' + fr(d,d) + ', so what is missing is ' + d + ' − ' + a + ' = ' + (d-a) +
    ' of the big pieces, which is ' + fr(d-a, d) + '. ' +
    'Step 2: write that in ' + D + 'ths. ' + d + ' × ' + k + ' = ' + D + ', so each big piece is ' + k +
    ' small ones: ' + (d-a) + ' × ' + k + ' = ' + (D - k*a) + ', giving ' + fr(D - k*a, D) + '. ' +
    'Check it: ' + fr(k*a, D) + ' + ' + fr(D - k*a, D) + ' = ' + fr(D,D) + ', which is 1. ' +
    /* SEVENTH PASS 2026-09-16, WOUND 2 - THE CARD-ROW CLAUSE. [d-a, D] is one
       candidate of ten and sided() seats three, so this sentence named a wrong
       answer that was nowhere on the screen on 49.8 / 50.0% of draws - the worst
       rate in the topic after the two the refutation named. Printed where it is
       seated (in the form the ROW prints it), named in words where it is not. */
    (mSeat ? 'Keeping the old top number over the new bottom number gives ' + fr(mSeat[0], mSeat[1]) +
             ', which is too small.'
           : 'Keeping the old top number ' + (d-a) + ' over the new bottom number ' + D + ' would be too ' +
             'small: each big piece became ' + k + ' small ones, so the top number has to grow as well.'));
}

/* FORMAT 4e - RELATED fractions, add (pool 3, 2 steps). MOE P3 3.2 names related
   fractions explicitly and the shipped bank had none of them: every add and
   subtract was a like-fraction item, which is why pool 3 added no step. The two
   steps are: change one fraction into an equivalent one, then count the pieces. */
function gAddRelated(){
  /* SEVENTH PASS 2026-09-16, W1. The flat row family narrows which seatings a draw
     can supply, and a filter applied after a FREE rank draw does not leave a free
     draw behind - the fifth pass wrote that down for the coupling seats and it is
     the same effect here (41.1% second-largest with `u` left free). The rank is
     drawn FIRST and sided() must seat it; the retry loop redraws the numbers until
     it can. */
  const rank = ri(1,4);
  let d = 4, k = 3, D = 12, a = 1, b = 2, key = [5,12], slips = [[3,12],[7,12],[4,11]], g = 0;
  do {
    /* WOUND 2: the scale factor ran to 4, which is why only nine (d, k) pairs
       were reachable. It runs to 6 now - the D <= 12 guard below is the real
       cap - which puts 1/2 + b/12 and 1/2 - b/12 on the table. */
    d = pick([2,3,4,5,6]); k = pick([2,3,4,5,6]); D = k*d;
    a = ri(1, Math.max(1, d-1)); b = ri(1, Math.max(1, D-1));
    key = [k*a + b, D];
    /* SECOND PASS, WOUND 1: the key was the LARGEST of four by value on 67.7% of
       draws, over the 45% the topic-wide gate allows. Scaling the SECOND fraction
       as well is a real related-fractions slip and it overshoots, so the row is
       drawn from both sides. */
    /* THIRD PASS 2026-09-16, W4 + W5. The three "added the bottom numbers as well"
       entries ([a+b, d+D] and [k*a+b, d+D] / [k*a+b, 2*D]) are what took 53.8% of
       this item's option rows past a bottom number of 12, ceiling 24, and they are
       out with the cap; the belief is named in words on the card instead. Their
       removal is also the W5 fix: above the key only [k*a+b+1, D] and [k*a+b, D-1]
       were reliably legal, so sided() could seat three-above - the key as the
       SMALLEST of four - on 7.4% of draws, under the new 12% floor. The
       piece-and-size miscount carried in both directions restores the third
       candidate on each side, and the draw guard is tightened by one so it is
       always legal. */
    /* SEVENTH PASS 2026-09-16, WOUND 1 - THE COMPOSED ROUTE. The refutation's two
       declared residual classes are printed on every run SEPARATELY, and a child
       does not run one ruler at a time: the six-row stem table, then the masked row
       SHAPE wherever the table does not settle it, answered this bank on 93.6 / 93.3% and its
       sibling on the other. Both inputs are under their own gates.
       The row half is what this lane can move. Half the draws now seat all three
       slips over the CONVERTED bottom number D, which collapses to a single masked
       shape - four top numbers over one bottom number - instead of the 33 shapes
       that each named the key's slot on 97.5%; the other half spread the bottom
       numbers as before. Every entry dropped on a flat draw is a size-miscount the
       card already names, so nothing goes off the misconception list. The measured
       composition after the change is in the lane note, with its exposure: this is
       a widening, not a closure, and the stem half (27 and 24 distinct stems) is
       the stem-space class, wave 2, and out of this lane's fence. */
    const flat = Math.random() < 0.5;
    slips = sided(key, [
      [a+b, D],                         /* did not convert the first fraction */
      [a + k*b, D],                     /* scaled the wrong fraction */
      [k*a + k*b, D],                   /* scaled BOTH fractions before adding */
      [k*a + b + 1, D],                 /* counted one small piece too many */
      [k*a + b + 1, D-1],               /* one piece too many AND the size one short */
      [k*a + b, D-1],                   /* counted the pieces right, the size one short */
      [k*a + b - 1, D],                 /* counted one small piece too few */
      /* SEVENTH PASS 2026-09-16, W1. The flat row family above seats all three
         slips over D, and over D this bank could only name TWO candidates below
         the key - so "key largest" was unseatable and RULE 7 came back at 12.8%
         largest / 49.8% second largest. Two more of the file's own miscounts, both
         over D and both below the key, put the fourth seating back. */
      (k*a + b - 2 >= 1 ? [k*a + b - 2, D] : null),   /* two small pieces too few */
      (k*(a-1) + b >= 1 ? [k*(a-1) + b, D] : null),   /* one BIG piece too few, converted */
      [k*a + b - 1, D-1]                /* one piece too few AND the size one short */
    ].filter(Boolean).filter(c => !flat || c[1] === D), null, 4 - rank) || [];
    g++;
    /* k*a + b + 1 < D: the gcd(key, D) = 1 guard hugely over-selects the key
       (D-1)/D - for D = 12 it is one of only four legal tops - and at (D-1)/D
       every fraction above the key is improper, so the key was the largest of four
       on 52% of draws. Barring the top step leaves the overshoot reachable on
       every draw. Measured cost in distinct stems is recorded in the lane note. */
  } while (g < 200 && !(D <= 12 && a < d && k*a + b + 2 < D && gcd(k*a + b, D) === 1 &&
                        slipsOk(key, slips)));
  if (!(D <= 12 && a < d && k*a + b + 2 < D && gcd(k*a + b, D) === 1 && slipsOk(key, slips))){
    d = 4; k = 3; D = 12; a = 1; b = 2; key = [5,12]; slips = [[3,12],[7,12],[4,11]];
  }
  return mcFrac('Add: ' + fr(a,d) + ' + ' + fr(b,D) + ' = ?', key, slips,
    'The pieces are different sizes, so make them the same first. ' + d + ' × ' + k + ' = ' + D +
    ', so cut each of the ' + d + ' parts into ' + k + ': ' + fr(a,d) + ' = ' + fr(k*a, D) + '. ' +
    'Now both are ' + D + 'ths and you can count them: ' + (k*a) + ' + ' + b + ' = ' + (k*a + b) +
    ', giving ' + fr(k*a + b, D) + '. Adding the tops and the bottoms straight off would give a top ' +
    'number of ' + (a+b) + ' over a bottom number of ' + (d+D) + ', which is not even close.');
}

/* FORMAT 4f - RELATED fractions, subtract (pool 3, 2 steps). */
function gSubRelated(){
  let d = 4, k = 2, D = 8, a = 3, b = 1, key = [5,8], slips = [[2,4],[2,8],[6,8]], g = 0;
  do {
    /* WOUND 2: the scale factor ran to 4, which is why only nine (d, k) pairs
       were reachable. It runs to 6 now - the D <= 12 guard below is the real
       cap - which puts 1/2 + b/12 and 1/2 - b/12 on the table. */
    d = pick([2,3,4,5,6]); k = pick([2,3,4,5,6]); D = k*d;
    a = ri(2, Math.max(2, d-1)); b = ri(1, Math.max(1, D-1));
    key = [k*a - b, D];
    /* SECOND PASS, WOUND 1: two of the three sat below the key and one above, so
       it was the 3rd of four by value on 100.00% of 50,000 draws - "pick the second
       largest" answered this item every time. Converting and then FORGETTING to
       subtract, and subtracting the wrong way round, are both real and both
       overshoot. */
    /* SEVENTH PASS 2026-09-16, WOUND 1 - THE COMPOSED ROUTE. The refutation's two
       declared residual classes are printed on every run SEPARATELY, and a child
       does not run one ruler at a time: the six-row stem table, then the masked row
       SHAPE wherever the table does not settle it, answered this bank on 98.6 / 98.5% and its
       sibling on the other. Both inputs are under their own gates.
       The row half is what this lane can move. Half the draws now seat all three
       slips over the CONVERTED bottom number D, which collapses to a single masked
       shape - four top numbers over one bottom number - instead of the 33 shapes
       that each named the key's slot on 97.5%; the other half spread the bottom
       numbers as before. Every entry dropped on a flat draw is a size-miscount the
       card already names, so nothing goes off the misconception list. The measured
       composition after the change is in the lane note, with its exposure: this is
       a widening, not a closure, and the stem half (27 and 24 distinct stems) is
       the stem-space class, wave 2, and out of this lane's fence. */
    const flat = Math.random() < 0.5;
    slips = sided(key, [
      [a-b, D-d],                       /* took the tops and the bottoms away */
      [a-b, D],                         /* did not convert the first fraction */
      [k*a - b + 1, D],                 /* counted one small piece too many */
      [k*a, D],                         /* converted, then forgot to subtract */
      [k*a + b, D],                     /* added instead of subtracting */
      [k*a - b, D-1],                   /* counted the pieces right, the size one short */
      [k*(a-b), D],                     /* subtracted first, then converted the answer */
      /* THIRD PASS 2026-09-16, W4: [k*a-b, d+D] and [k*a-b, 2*D] - subtracted the
         tops and ADDED the bottom numbers - put a bottom number past 12 on 40.1%
         of this item's option rows, ceiling 24, under a note that declared 0.0%.
         Out with the cap; the card names the belief in words. */
      [k*a - b - k, D],                 /* one BIG piece too few, converted */
      [k*a - b - 1, D],                 /* counted one small piece too few */
      /* THIRD PASS 2026-09-16, W5. Removing the two overshoot entries above took
         the BELOW-key side down to whatever [a-b, ...] could supply, and b runs to
         D-1 so a-b is often not positive at all: sided() was then forced to seat
         three-above and the key was the SMALLEST of four on 60.5% of draws. Four
         more candidates go below - one and two small pieces too few, and the small
         pieces themselves miscounted one or two parts over - and the draw guard
         bars the one case that has nothing legal underneath it at all: a key of
         one twelfth, below which no proper fraction with a bottom number to 12
         exists. Everything else the format can draw is still reachable, which
         costs seven of its 34 stems rather than the fifteen a flat "key >= 3"
         guard cost. */
      [k*a - b - 2, D],                 /* counted two small pieces too few */
      [k*a - b - 1, D-1],               /* one piece too few AND the size one short */
      (D+1 <= 12 ? [k*a - b, D+1] : null),  /* miscounted the size of the small pieces */
      (D+2 <= 12 ? [k*a - b, D+2] : null),  /* ... one and two parts over */
      (D+1 <= 12 ? [k*a - b - 1, D+1] : null)
    ].filter(Boolean).filter(c => !flat || c[1] === D)) || [];
    g++;
  } while (g < 200 && !(D <= 12 && a < d && (k*a - b >= 2 || D <= 10) && k*a - b + 1 < D &&
                        gcd(k*a - b, D) === 1 && slipsOk(key, slips)));
  if (!(D <= 12 && a < d && (k*a - b >= 2 || D <= 10) && k*a - b + 1 < D && gcd(k*a - b, D) === 1 &&
        slipsOk(key, slips))){
    d = 4; k = 2; D = 8; a = 3; b = 1; key = [5,8]; slips = [[2,4],[2,8],[6,8]];
  }
  /* SEVENTH PASS 2026-09-16, KILL 2 - AND IT WAS INHERITED, WHICH IS THE PART THAT
     MATTERS. This card used to end "...straight off would give " + fr(a-b, D-d).
     `b` runs to D-1 and `a` stops at d-1, so a - b is NEGATIVE on 49.97 / 50.70%
     of draws and ZERO on 15.19 / 14.36%: the teaching card - the highest-salience
     surface in the app - printed "would give -1/8" to a P3 child on 65% of the
     draws of a bank served 0.91 a session, and had done so since before this lane
     started. Negative numbers are Secondary 1 content: it is a SCOPE LEAK, one of
     the five items the PM's termination rule names.

     SIX PASSES, FIFTEEN NEGATIVE CONTROLS AND 1.08 M AUDITED DRAWS WALKED PAST IT
     because every fraction regex in tools/gen-sanity.mjs was (\d+) and a minus sign
     is not a digit - parseFrac, allFracs, RULE 4's syllabus scan, the card walker
     and the layout gate all read straight through the character. legalFrac keeps
     such a fraction off the option ROW (p[0] >= 1); nothing guarded the card, and
     the card is the one surface nothing re-derives. The harness now reads (-?\d+)
     everywhere and THE SIGN GATE fails any rendered numerator below 1 or
     denominator below 1 on any surface of any bank in the game, with this card as
     its negative control.

     The belief is named in WORDS here, which is the device this file already uses
     wherever a named misconception cannot be rendered inside the syllabus (see the
     12-cap note above) - and it also closes this bank's half of the seventh pass's
     WOUND 2, because the fraction it used to print was off the option row on
     27.3 / 27.6% of draws. */
  return mcFrac('Subtract: ' + fr(a,d) + ' − ' + fr(b,D) + ' = ?', key, slips,
    'The pieces are different sizes, so change the first fraction. ' + d + ' × ' + k + ' = ' + D + ', so ' +
    fr(a,d) + ' = ' + fr(k*a, D) + '. Now take the pieces away: ' + (k*a) + ' − ' + b + ' = ' + (k*a - b) +
    ', giving ' + fr(k*a - b, D) + '. Subtracting the tops and the bottoms straight off is a different sum ' +
    'altogether: the bottom number is the SIZE of the piece, and ' + D + 'ths do not turn into ' + (D-d) +
    'ths just because some pieces were taken away.');
}

/* FORMAT 4g - error spotting, DIAGNOSE the mistake (pool 3, 2 steps). The named
   misconception the brief asks for: adding numerators AND denominators. Three
   claim forms; the harness re-derives which one the printed number IS and fails
   the build if the "wrong" answer is actually right, or matches two beliefs. */
/* WOUND 3 (Sweep fractions Refutation 2026-09-15). The draw used to require
   a*b < d so that all THREE claim values stayed legal on every draw, and the only
   way to satisfy that beside a > b was b = 1: the refuter measured b === 1 in
   73.0% of 5,000 draws, and with b = 1 the multiply claim a x 1 = a IS one of the
   addends, so 31.8% of draws printed "Siti says 5/12 + 1/12 = 5/12" - where the
   named belief is invisible (multiplying by one changes nothing) and the reading a
   child actually has ("she forgot the second one") is not on the option list.

   The fix is the refuter's, plus the constraint that forced the collapse: b now
   draws 2-4, and the three claims are filtered PER DRAW rather than all three
   being required to be legal at once. A claim is only printable if it is a proper
   fraction, is not worth the true answer, is not worth either addend, and is not
   worth what another named belief would give - so the harness can still map the
   printed claim to exactly one belief. All three sentences stay on the option
   list either way: an unused belief is a distractor, not a missing one. */
/* THIRD PASS 2026-09-16, W3 + W4. v3 drew the NUMBERS first and then whichever
   beliefs survived the per-draw filter, and the three beliefs do not survive it
   equally: (a+b)/2d is legal on far more draws than a·b/d, so the key stopped
   rotating - "X added the bottom numbers as well" was the answer on 53.6% of
   20,000 draws against 37.1% and 9.2%, and it was ALSO the uniquely shortest
   option on exactly those draws, which RULE 6 did not look for because it gated
   only the longest. Its sibling gCompareError twenty lines up had been rebuilt
   precisely so the key rotates evenly (33.3 / 33.4 / 33.3) and nothing carried
   that standard down the file.

   So the BELIEF is drawn first, uniformly over the three, and the numbers are then
   drawn to fit it - gCompareError's own shape. The three belief sentences are also
   written to exactly one length (50 characters after the shared name) with the
   never-true filler at 51, so the key is never the uniquely longest or the
   uniquely shortest option and neither reader has anything to read.

   W4's cap costs this generator the most and it is declared here rather than
   discovered later: "added both bottom numbers" prints 2d, so it can only be asked
   where 2d <= 12, which is FIVE (d, a, b) configurations - d of 4, 5 or 6 -
   against sixty-four for the subtract branch and twelve for the multiply branch.
   A third of this item's draws therefore come from 30 stems (five configurations
   x six names), and the generator as a whole falls from 558 distinct stems to 486.
   That is the price of taking an off-syllabus bottom number off a P3 option row,
   and it is on the record in the lane note rather than left to be found. */
/* SIXTH PASS 2026-09-16, RULE 13 - THE GLYPH RULE, and this bank is the second
   thing it caught. The refutation's own residual list already said so: gAddError
   "is now the third bank in this topic answerable at >= 90% with no fraction
   mathematics". Measured on the new gate, a learned rule over NUMERAL IDENTITY
   and DIGIT COUNT alone settled the item on 76.8% of 4,000 draws, and the reason
   is one line of the design: `bottoms` was the only belief whose claim was NOT
   written over the stem's own bottom number, so "is the claim's bottom number the
   one the question prints?" split the three beliefs one against two before a
   fraction had been read. The v4 note declared the cause without seeing the
   consequence: "the 12 cap makes the three beliefs DISJOINT in (a, b, d)".

   THE FIX, and it is the cap's own logic run forwards. `bottoms` prints 2d, which
   is why it needed d <= 6 and why its glyphs are different; it comes off the
   CLAIM bank and stays on the OPTION ROW as a never-true sentence, where it is
   still the misconception a P3 child most needs to meet and is now diagnosable
   from the screen (the printed claim's bottom number is d, so the bottom numbers
   were plainly not added). Its place in the claim bank goes to `gap` - counting
   the pieces that are MISSING - which is a real P3 belief, legal over the whole
   (a, b, d) range, and written over d like the other two. All three claims now
   share the stem's bottom number, so no glyph test separates them.

   The two never-true sentences are drawn INDEPENDENTLY of the belief, which is
   the fifth pass's own requirement (a filler PAIRED to the belief is what killed
   v5's gCompareError on RULE 11): the row space doubles from 6 to 12 and the
   fourth option indexes nothing. */
const ADD_ERR = [
  { id:'minus',   claim:(a2,b2,d2) => [a2-b2, d2],
    say: nm => nm + ' subtracted the top numbers instead of adding them.' },
  { id:'times',   claim:(a2,b2,d2) => [a2*b2, d2],
    say: nm => nm + ' multiplied the top numbers instead of adding them.' },
  { id:'gap',     claim:(a2,b2,d2) => [d2-a2-b2, d2],
    /* written to the same 51 characters after the name as the other two, and as
       the two never-true sentences: RULE 6 reads both directions and nothing on
       this row is the uniquely longest or the uniquely shortest option. */
    say: nm => nm + ' counted the empty pieces instead of the full ones.' }
];
/* Never true of any stem this generator draws: both fractions are already written
   over the same bottom number, so there is nothing to make the same - and every
   printable claim is written over that same bottom number, so the bottom numbers
   were never added either. Drawn independently of the belief. */
const ADD_ERR_NEVER = [
  nm => nm + ' should have made the bottom numbers the same first.',
  nm => nm + ' added both bottom numbers as well as the top ones.'
];
/* FOURTH PASS 2026-09-16, W3. The v4 fix reproduces exactly - the belief rotates
   33.1 / 33.3 / 33.7 and the key is never the uniquely shortest option - but the
   NUMBERS then fingerprinted the belief it was drawn to hide. `b` was drawn AFTER
   the belief and redrawn until the claim was legal, and the three claims do not
   admit the same b: "multiplied the top numbers" needs ab < d <= 12, which leaves
   b = 2 on 100.00% of its draws, while b of 3 or 4 forced "subtracted" on 100.00%.
   A four-line table read off the stem's second top number scored 70.61% with no
   arithmetic done. And b === 1 came back at 40.1%, undoing the v2 fix.

   b is drawn INDEPENDENTLY of the belief now - uniformly over {2, 3}, never 1 -
   and the (a, d) pairs are enumerated for that (belief, b) and drawn evenly from
   the whole legal set, rather than being rejection-sampled into whatever the
   belief happens to allow. Every belief is reachable at every b, so P(belief | b)
   is 1/3 and the table is worth chance: measured 33.3%, against 70.61% at v4.

   TWO RESIDUALS, DECLARED rather than discovered. (1) b never reaches 4. "Added
   both bottom numbers" prints 2d, so it needs d <= 6, and with a + b < d and
   neither addend allowed to be 1 there is no room for b = 4 anywhere in that
   belief; letting b = 4 through for the other two would put the whole table back.
   (2) The 12 cap makes the three beliefs DISJOINT in (a, b, d): "bottoms" needs
   2d <= 12 and "times" needs ab < d, and with a, b >= 2 no stem can carry both. So
   a lookup on the FULL stem - all three numerals, not just b - cannot be pushed
   below 50% while the cap stands, and it is measured and declared in the lane note
   instead of being hidden behind the one number the fourth pass named. */
function gAddError(){
  let w = ri(0, ADD_ERR.length - 1);      /* the BELIEF, evenly */
  const b = ri(2, 3);                     /* ... and the second top number, independently */
  const legalAD = ww => {
    const out = [];
    for (let d2 = 4; d2 <= 12; d2++) for (let a2 = 2; a2 + b < d2; a2++){
      const cs = ADD_ERR.map(x => x.claim(a2, b, d2));
      const c = cs[ww];
      if (!legalFrac(c)) continue;                                 /* proper, bottom <= 12 */
      if (c[0] * d2 === (a2 + b) * c[1]) continue;                 /* the "wrong" claim is right */
      if (c[0] * d2 === a2 * c[1] || c[0] * d2 === b * c[1]) continue;  /* it IS an addend */
      if (!cs.every((o, j) => j === ww || o[0] * c[1] !== c[0] * o[1])) continue;  /* one belief only */
      out.push([a2, d2]);
    }
    return out;
  };
  let legal = legalAD(w);
  /* Unreachable as the three beliefs stand - each is legal at both values of b -
     but a fourth belief added later must not be able to ship an illegal stem. */
  if (!legal.length){ w = 1; legal = legalAD(w); }
  const ad = pick(legal);
  const a = ad[0], d = ad[1];
  const k = pick(KIDS);
  const s = { claim: ADD_ERR[w].claim(a, b, d), text: ADD_ERR[w].say(k[0]) };
  const wrongs = ADD_ERR.filter((_, i) => i !== w).map(x => x.say(k[0]))
    .concat([pick(ADD_ERR_NEVER)(k[0])]);
  return mcText(k[0] + ' says ' + fr(a,d) + ' + ' + fr(b,d) + ' = ' + fr(s.claim[0], s.claim[1]) +
    '. <b>What did ' + k[2] + ' do wrong?</b>', s.text, wrongs,
    'Both fractions are already ' + d + 'ths, so the pieces are the same size and only the top numbers ' +
    'are counted: ' + a + ' + ' + b + ' = ' + (a+b) + ', and the answer is ' + fr(a+b, d) + '. ' + s.text +
    ' The bottom number is the size of each piece - it never changes when you add.');
}

/* FORMAT 4h - two-step word problem, Singapore context (pool 3). Add, then take
   the total from one whole. The stop-after-the-first-step answer is offered. */
/* FOURTH PASS 2026-09-16, W4(a). The stop-after-step-1 answer is the whole point of
   a two-step word problem - it is the child who adds and then forgets to take the
   total from one whole - and every earlier pass named it. v4 offered it on 35.3% of
   draws, down from 65.3%, because sided() seats whichever three candidates balance
   the row by value and this one is only sometimes among them. It is passed as
   sided()'s `must` now and is on EVERY row.

   It cannot reopen the v2 wound (the key smallest of four on 56.8%) because the
   rank is balanced around it rather than by dropping it: which SIDE of the key the
   stop-after-step-1 answer falls on is fixed by whether the two of them ate more or
   less than half, so that coin is flipped first and the numbers drawn to match.
   2(a+b) = d is refused outright - there the stop-after-step-1 answer is worth the
   key. Ranks measure 17 / 33 / 33 / 17 rather than 25 / 25 / 25 / 25, which is the
   honest cost of a distractor that must always be on the row. */
function gAddWords(){
  const wantHigh = Math.random() < 0.5;   /* the stop-after-step-1 answer sits above the key */
  let d = 8, a = 2, b = 3, key = [3,8], slips = [[5,8],[6,8],[2,8]], g = 0, fits = false;
  do {
    d = ri(5,12); a = ri(1, Math.max(1, d-3)); b = ri(1, Math.max(1, d-a-2));
    key = [d-a-b, d];
    fits = 2*(a+b) !== d && (2*(a+b) > d) === wantHigh;
    /* SECOND PASS, WOUND 1: "stopped after step 1" and "subtracted only one of the
       two" both overshoot the key, so it was the SMALLEST of four by value on
       56.8% of draws, over the 45% the topic-wide gate allows. */
    slips = sided(key, [
      [a+b, d],                             /* stopped after step 1 */
      [d-a, d],                             /* subtracted only the first share */
      [d-b, d],                             /* subtracted only the second share */
      /* THIRD PASS 2026-09-16, W4: [a+b, 2*d] - added the bottom numbers as well -
         put a bottom number past 12 on 39.6% of this item's option rows. Out with
         the cap; the card names the belief in words. Its place below the key is
         taken by the second-order miscounts the rest of the file already names. */
      (d-a-b > 1 ? [d-a-b-1, d] : null),    /* counted one piece too few */
      (d-a-b > 1 ? [d-a-b-1, d-1] : null),  /* one piece too few AND a part too few */
      (d+1 <= 12 ? [d-a-b, d+1] : null),    /* miscounted the size of the pieces */
      (d+2 <= 12 ? [d-a-b, d+2] : null),    /* the same, two parts over */
      [d-a-b+1, d],                         /* counted one piece too many */
      [d-a-b, d-1]                          /* miscounted the size of the pieces, one short */
    ].filter(Boolean), fits ? [a+b, d] : null) || [];
    g++;
  } while (g < 200 && !(fits && a !== b && d-a-b >= 1 && slipsOk(key, slips)));
  if (!(fits && a !== b && d-a-b >= 1 && slipsOk(key, slips))){ d = 8; a = 2; b = 3; key = [3,8]; slips = [[5,8],[6,8],[2,8]]; }
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
      /* WOUND 1 (refutation 2026-09-15): gGreatest4 was tagged `order` and so a
         child tapping the hint on "which of these is the smallest?" was told to
         "use the same two rules across THREE fractions" and warned about
         reversing an order the item never asks for. Picking one extreme out of
         four is comparing, so it is tagged `compare` now and the compare tip
         names that case out loud. */
      compare:   {label:'Comparing fractions',             tip:'Two rules: same bottom number → compare the tops; same top number → the BIGGER bottom number means smaller pieces, so a smaller fraction. To pick the greatest or smallest of a list, use the same rule on every one. Draw two bars side by side when stuck.'},
      order:     {label:'Ordering fractions',              tip:'Use the same two rules across a whole row, and say the direction out loud ("smallest first") before you start. Reversing the order is the commonest slip - and a gap in a row can sit at either END of it, not only in the middle, so check which way the row runs before you choose.'},
      equivalent:{label:'Equivalent fractions',            tip:'Multiply top AND bottom by the same number - you are cutting every piece into smaller ones, not changing the amount. Chant the families: 1/2 = 2/4 = 3/6 = 4/8.'},
      addsub:    {label:'Adding & subtracting fractions',  tip:'The bottom number is the SIZE of each piece, so it never changes: only the tops are counted. If the bottoms are different, change one fraction first so both pieces match.'},
      wholes:    {label:'Making one whole',                tip:'Remember 1 = 8/8 = 12/12. Ask: "how many more of these pieces fill the whole?" - and if the answer has to be in smaller pieces, fill the whole first and change the pieces after.'},
      simplest:  {label:'Simplest form',                   tip:'DIVIDE top and bottom by the same number until you cannot any more - never subtract. Drill the common ones: 4/6→2/3, 6/8→3/4, 8/12→2/3.'}
    },
    /* Pools. No generator sits in two pools: the audit's boredom score multiplied
       one stem shape by the number of pools it occupied, and gPeri-in-all-three
       was the worst case in the game. Pool 1 = 6 gens / 4 skills, pool 2 = 9 / 5,
       pool 3 = 12 / 5.

       WOUND 1 (Sweep fractions Refutation 2026-09-15). The feed serves by SKILL,
       not by slot: createFeed's carousel round-robins the skills inside a pool and
       only then picks a generator inside the skill, so a pool-3 skill holding ONE
       generator is served as often as a skill holding four. The lane composed its
       pools by slot and nobody measured what the feed actually served. Measured
       over 500 sessions x 30 items through the real createFeed, pool 3's two
       single-generator skills took 3.48 (gCompareError) and 3.04 (gMakeOne) items
       per session while the three equivalence formats this lane was written to add
       took 0.42-0.50 each.

       Two changes, both here: gGreatest4 moves from `order` to `compare` (it asks
       for one extreme of four, which is comparing), and the two skills that were
       then left holding one generator - `order` and `wholes` - each gain a second
       format (gOrderGap, gMakeOneIn) rather than being left as hogs. Pool 3 now
       reads wholes 2, simplest 2, compare 2, order 2, addsub 4. */
    pools:{
      1:[[gPicIdentify,'identify'],[gPicTakeAway,'identify'],[gEquivFromBar,'equivalent'],
         [gCompareUnit,'compare'],[gCompareBar,'compare'],[gAddSame,'addsub']],
      2:[[gPicUnshaded,'wholes'],[gSubFromOne,'wholes'],[gEqMissing,'equivalent'],
         [gEqMissingDen,'equivalent'],[gPickEquiv,'equivalent'],[gSimplest,'simplest'],
         [gCompareSameD,'compare'],[gCompareWords,'compare'],[gSubSame,'addsub']],
      3:[[gMakeOne,'wholes'],[gMakeOneIn,'wholes'],[gAlreadySimplest,'simplest'],
         [gSimplestError,'simplest'],[gBetween,'compare'],[gGreatest4,'compare'],
         [gOrderThree,'order'],[gOrderGap,'order'],
         [gAddRelated,'addsub'],[gSubRelated,'addsub'],[gAddError,'addsub'],[gAddWords,'addsub']]
    }
  });
})();
