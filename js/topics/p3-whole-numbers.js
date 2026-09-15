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
 *   gGreatest, gSmallest, gBetween, gOrder, gCompareError (compare);
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
 * NO GENERATOR SITS IN TWO POOLS. Pool 3 is two-step throughout by design - 11
 * of 11 slots after the 2026-09-15 refutation, which found that gSubError and
 * gZeroFix were their pool-2 twins' computation with a sentence wrapped round it
 * and rebuilt both with a genuine second step. The single-step fluency anchors
 * live in pools 1 and 2, and on THIS topic the feed serves pools 1/2/3 at
 * 0.191 / 0.230 / 0.580 (500 seeds x 30 through MQI.createFeed; 0.186 / 0.225 /
 * 0.589 before this pass), so a child is in pool 3 for 58% of a session - the
 * P3-grade aggregate feed-sim prints (0.206 / 0.398 / 0.397) picks a random live
 * P3 topic per seed and does NOT describe Thousand Isles. (Proposal 2 asks that a
 * 1-step pool-3 slot be DECLARED rather than accidental; this file declares that
 * it has none, with that 59% in front of the decision.)
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
 * 12, ?"). This file's patterns are 4-digit and are counting in TENS, HUNDREDS
 * and THOUSANDS - MOE P3 1.1, which Puzzle Caves does not reach and which is
 * this topic's own ceiling. Different stems, different range, no overlap.
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

  /* Numeric MC whose three distractors are all AUTHORED misconceptions. Stamps
     q.authored only when three named wrong answers survived, which is what makes
     the harness's distractor-identity contract bind; every generator in this file
     guarantees three by redraw, so the padding loop is dead code kept only so a
     future edit degrades instead of throwing. */
  function mcNum(stem, extra, correct, cands, unit, explain){
    const seen = new Set([correct]); const d = [];
    for (const c of cands){
      if (d.length >= 3) break;
      if (!ok(c) || seen.has(c)) continue;
      seen.add(c); d.push(c);
    }
    const authored = d.length === 3;
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
    '. Saying just "' + dig + '" gives the digit, not what the digit is worth.');
}
function gStandsEasy(){ return standsFor(1, 2); }   /* hundreds or tens */

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
  let th = 4, h = 0, t = 7, o = 6, n = 4076, squashed = 476, swapped = 4706, reversed = 4670, g = 0;
  do {
    th = ri(1,9);
    const zeroAt = pick([1,2]);
    h = zeroAt === 1 ? 0 : ri(1,9);
    t = zeroAt === 2 ? 0 : ri(1,9);
    o = ri(1,9);
    n = th*1000 + h*100 + t*10 + o;
    /* the number you get by writing the digits with the zero left out */
    squashed = Number(String(th) + (h ? String(h) : '') + (t ? String(t) : '') + String(o));
    swapped  = th*1000 + t*100 + h*10 + o;      /* hundreds and tens exchanged */
    reversed = o*1000 + t*100 + h*10 + th;      /* the four parts read back to front */
    g++;
  } while (g < 200 && !optsOk(n, [squashed, swapped, reversed]));
  return mcNum('Which number has ' + pl(th,'thousand') + ', ' + pl(h,'hundred') + ', ' + pl(t,'ten') +
    ' and ' + pl(o,'one') + '?', '', n, [squashed, swapped, reversed], '',
    pl(th,'thousand') + ' = ' + th*1000 + ', ' + pl(h,'hundred') + ' = ' + h*100 + ', ' +
    pl(t,'ten') + ' = ' + t*10 + ', ' + pl(o,'one') + ' = ' + o +
    '. Add them and you get ' + n + '. The 0 is doing a job: it holds the ' +
    'empty place open. Leave it out and you get ' + squashed + ', a much smaller number.');
}

/* FORMAT 5 - compare two digit values inside ONE number (pool 3, 2 steps).
   This slot used to be `gStandsHard`, the byte-identical twin of gStandsEasy
   (audit worst-ten #5). It now asks for two values and their difference. */
function gStandsCompare(){
  let d = digits4(), i = 0, j = 1, g = 0;
  do {
    d = digits4();
    i = ri(0,2); j = ri(i+1, 3);
    g++;
  } while (g < 200 && !(d[i] > d[j] &&
           optsOk(d[i]*POW[i] - d[j]*POW[j], [d[i] - d[j], d[i]*POW[i] + d[j]*POW[j], d[i]*POW[i]])));
  const n = numOf(d), vi = d[i]*POW[i], vj = d[j]*POW[j], ans = vi - vj;
  return mcNum('In ' + n + ', how much more does the digit ' + d[i] + ' stand for than the digit ' +
    d[j] + '?', '', ans, [d[i] - d[j], vi + vj, vi], '',
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
   squashed number" is now a named distractor instead of the answer. */
function gZeroFix(){
  const k1 = pick(KIDS), who = k1[0], pron = k1[1];
  let k2 = pick(KIDS); while (k2[0] === who) k2 = pick(KIDS);
  const other = k2[0];
  let th = 6, t = 4, o = 9, step = 100, sg = 1, g = 0;
  do {
    th = ri(1,9); t = ri(1,9); o = ri(1,9);
    step = pick([10, 100, 1000]); sg = pick([1, -1]);
    g++;
  } while (g < 400 && !(t !== o &&
           optsOk(th*1000 + t*10 + o + sg*step,
             [(th*100 + t*10 + o) + sg*step, th*1000 + t*10 + o, th*1000 + t*10 + o - sg*step])));
  const n = th*1000 + t*10 + o, squashed = th*100 + t*10 + o, ans = n + sg*step;
  const dir = sg === 1 ? 'more' : 'less';
  return mcNum(who + ' writes ' + pl(th,'thousand') + ', 0 hundreds, ' + pl(t,'ten') + ' and ' +
    pl(o,'one') + ' as ' + squashed + '. ' + other + "'s number is " + step + ' ' + dir +
    ' than the number ' + who + ' meant to write. <b>What is ' + other + "'s number?</b>", '', ans,
    [squashed + sg*step,        /* stepped on from the squashed number, zero still missing */
     n,                         /* stopped after rebuilding, never took the step */
     n - sg*step], '',          /* stepped the wrong way */
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
/* FORMAT 2 - direct compare, smallest, every number sharing a thousands digit
   so the child must read past the first digit (pool 2, 1 step) */
function gSmallest(){
  const th = ri(1,9)*1000; const set = [];
  while (set.length < 4){ const n = th + ri(0, 999); if (!set.includes(n)) set.push(n); }
  const worst = Math.min.apply(null, set);
  return mcSet('Which number is the <b>smallest</b>?', '', worst, set.filter(x => x !== worst),
    'All four numbers start with the same thousands digit, so that place cannot settle it. Compare the ' +
    'hundreds next: ' + worst + ' is the smallest.');
}

/* FORMAT 3 - between two numbers (pool 2, 2 steps: check both ends) */
function gBetween(){
  let lo = 3450, hi = 3520, key = 3480, below = 3400, above = 3600, far = 2900, g = 0;
  do {
    lo = ri(1200, 8600);
    hi = lo + ri(40, 700);
    key = lo + ri(10, hi - lo - 10);
    below = lo - ri(5, 300);
    above = hi + ri(5, 300);
    far = lo - ri(400, 900);
    g++;
  } while (g < 200 && !(hi - lo > 30 && key > lo && key < hi &&
           optsOk(key, [below, above, far]) &&
           [below, above, far].every(v => v <= lo || v >= hi)));
  return mcSet('Which number is <b>between</b> ' + lo + ' and ' + hi + '?', '', key, [below, above, far],
    lo + ' is smaller than ' + key + ' and ' + key + ' is smaller than ' + hi + ', so ' + key +
    ' sits between them. Put the two end numbers on a line in your head and check the new number ' +
    'against BOTH of them - one check is never enough.');
}

/* FORMAT 4 - order four numbers (pool 3, 2 steps) */
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

/* FORMAT 5 - error spotting on a comparison, DIAGNOSE (pool 3, 2 steps).
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

/* FORMAT 6 - concept check on a pattern: name the jump (pool 1, 1 step) */
function gPatternConcept(){
  const step = pick([10, 100, 1000]);
  const wrong = { 10: [1, 100, 20], 100: [10, 1000, 200], 1000: [100, 10, 2000] }[step];
  let start = 2380, g = 0;
  do { start = ri(1000, MAXN - 4*step); g++; } while (g < 200 && !(start >= 1000));
  const terms = [start, start+step, start+2*step, start+3*step];
  return mcNum('In this number pattern, what is the <b>jump</b> from one number to the next? <b>' +
    terms.join(', ') + '</b>', '', step, wrong, '',
    terms[1] + ' − ' + terms[0] + ' = ' + step + ', and the same jump works every time: ' +
    terms[2] + ' − ' + terms[1] + ' = ' + step + '. So the pattern counts on in ' +
    (step === 10 ? 'tens' : step === 100 ? 'hundreds' : 'thousands') +
    '. Write the difference above each gap and check that they all match.');
}

/* FORMAT 7 - counting on or back in tens, hundreds, thousands (pool 2, 1 step).
   MOE P3 1.1. The step is NAMED in the stem, so this is the pattern anchor. */
const STEP_WORD = { 10: 'tens', 100: 'hundreds', 1000: 'thousands' };
function gPattern4(){
  const step = pick([10, 100, 1000]);
  const up = Math.random() < 0.5;
  const s = up ? step : -step;
  /* the draw range is set so that EVERY named distractor also lands inside
     1..9999 - a distractor filtered out for being out of scope would let
     finishNum pad, and the padding branch is what the authored contract bans. */
  const start = up ? ri(1000, MAXN - 6*step) : ri(1000 + 6*step, MAXN);
  const terms = [0,1,2,3,4].map(k => start + k*s);
  const ans = start + 5*s;
  const cands = [terms[4] + s/10,      /* counted on in the next-smaller unit */
                 terms[4] + 2*s,       /* took two jumps instead of one */
                 terms[4] - s];        /* jumped the wrong way */
  return mcNum('Count ' + (up ? 'on' : 'back') + ' in <b>' + STEP_WORD[step] +
    '</b>. What number comes next? <b>' + terms.join(', ') + ', ?</b>', '', ans, cands, '',
    'Each jump ' + (up ? 'adds' : 'takes away') + ' ' + step + ': ' + terms[3] + ' ' + (up ? '+' : '−') +
    ' ' + step + ' = ' + terms[4] + '. One more jump gives ' + terms[4] + ' ' + (up ? '+' : '−') + ' ' +
    step + ' = ' + ans + '. Counting in ' + STEP_WORD[step] + ' only changes the ' + STEP_WORD[step] +
    ' digit — until it rolls over and takes the digit on its left with it.');
}

/* FORMAT 8 - one step on from a given number (pool 2, 1 step) */
function gMoreLess(){
  const step = pick([10, 100, 1000]);
  const dir = pick(['more','less']);
  const sg = dir === 'more' ? 1 : -1;
  /* range set so all three named distractors stay inside 1..9999 (see gPattern4) */
  const n = dir === 'more' ? ri(1000 + step, MAXN - 2*step) : ri(1000 + 2*step, MAXN - step);
  const ans = n + sg*step;
  const cands = [n + sg*(step/10),   /* moved the column to the right of the one asked for */
                 n - sg*step,        /* went the wrong way */
                 n + sg*2*step];     /* moved two places along instead of one */
  return mcNum('What number is ' + step + ' ' + dir + ' than ' + n + '?', '', ans, cands, '',
    n + ' ' + (dir === 'more' ? '+ ' : '− ') + step + ' = ' + ans + '. Only the ' + STEP_WORD[step] +
    ' digit changes, unless it rolls over and takes the digit on its left with it.');
}

/* FORMAT 9 - working backwards inside a pattern: the gap is in the MIDDLE and
   the jump is NOT given, so the child must find the jump first (pool 3, 2 steps) */
function gPatternMissing(){
  /* Steps are multiples of 100 so that a "jump added one column out" distractor
     (key + step/10) is a visible slip rather than an off-by-one that would read as
     padding. Two of the four options are numbers NOT printed in the stem, so a
     child cannot shortcut the pattern work by eliminating everything already on
     the page - that elimination is valid reasoning, but it is not the reasoning
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
  return mcNum('What is the <b>missing number</b> in this pattern? <b>' + shown.join(', ') + '</b>',
    '', terms[gap],
    [terms[gap-1],            /* copied the number just before the gap */
     terms[gap] + s/10,       /* added the jump one column to the right */
     terms[gap-1] + 2*s], '', /* took two jumps instead of one */
    'Nobody tells you the jump, so find it from two numbers that sit next to each other: ' +
    terms[j+1] + ' and ' + terms[j] + ' are ' + step + ' apart, so the pattern counts ' +
    (up ? 'on' : 'back') + ' in ' + step + 's. Now one jump from ' + terms[gap-1] + ' gives ' +
    terms[gap-1] + ' ' + (up ? '+' : '−') + ' ' + step + ' = ' + terms[gap] + '.');
}

/* FORMAT 10 - the odd one out: one printed term breaks the pattern (pool 3, 2
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
   not an authored-distractor one. The break is always a place-value column slip:
   one jump taken in the next column down. */
function gPatternOdd(){
  const step = pick([100, 1000]);
  const up = Math.random() < 0.5;
  const s = up ? step : -step;
  const off = pick([1, -1]) * (step / 10);
  let start = 2000, terms = [], bi = 2, g = 0;
  do {
    start = up ? ri(1000, MAXN - 6*step) : ri(1000 + 6*step, MAXN);
    bi = ri(1,4);                 /* the break is interior, so removing an END term
                                     can never leave an arithmetic sequence */
    terms = [0,1,2,3,4,5].map(k => start + k*s);
    terms[bi] = terms[bi] + off;
    g++;
  } while (g < 200 && !(terms.every(ok) && allDistinct(terms)));
  const odd = terms[bi];
  const rest = terms.filter((_, i) => i !== bi);
  /* the worked pair must be two terms that BOTH sit on the pattern and are next
     to each other on the page */
  const j = bi <= 1 ? 2 : 0;
  const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
  return mcSet('One number does <b>not belong</b> in this pattern. Which one is it? <b>' +
    terms.join(', ') + '</b>', '', odd, shuffle(rest).slice(0, 3),
    'Most of the jumps are the same size: ' + terms[j] + ' ' + (up ? '+' : '−') + ' ' + step + ' = ' +
    terms[j+1] + ', so the pattern counts ' + (up ? 'on' : 'back') + ' in ' + STEP_WORD[step] +
    '. Follow that jump from the start and the ' + ORD[bi] + ' number should be ' + (start + bi*s) +
    ', but ' + odd + ' is printed instead - it is ' + Math.abs(off) + ' out, which is one jump taken ' +
    'in the wrong column. Write the difference above each gap and the one that does not match jumps out.');
}


/* =========================================================================
   PRINCIPLE 3 - ADDING AND SUBTRACTING WITHIN 10 000, WITH REGROUPING
   ========================================================================= */

/* FORMAT 1 - concept check: what actually happens when a column makes ten or
   more? (pool 1, 1 step). No arithmetic at all; this is the idea itself. */
function gAddConcept(){
  let a = 2647, b = 1385, g = 0;
  do { a = ri(1000, 8000); b = ri(1000, MAXN - a); g++; }
  while (g < 200 && !((a % 10) + (b % 10) >= 10 && ((a % 10) + (b % 10)) % 10 !== 1 &&
         (a % 10) + (b % 10) !== 10));
  const s = (a % 10) + (b % 10), keep = s % 10;
  /* §6 of the refutation: the old key ran to 68 characters against a bank maximum
     of 48, and this is a pool-1 item every child meets. Every option now lands in
     42-46 characters with the concept intact, and gen-sanity caps p3numbers
     options at 48. */
  const key = 'Write ' + keep + ', carry 1 ten into the tens column.';
  return mcText('When you add ' + a + ' + ' + b + ', the ones column makes ' + s +
    '. <b>What happens next?</b>', '', key, shuffle([
      'Write ' + s + ' in the ones column, carry nothing.',
      'Write ' + keep + ', carry 1 ten into the hundreds column.',
      'Write 1, carry ' + keep + ' tens into the tens column.'
    ]),
    s + ' is ' + keep + ' ones and 1 ten. The ones column only has room for ones, so the ' + keep +
    ' stays there and the ten moves one place to the LEFT, into the tens column. That move is what ' +
    '"regrouping" means: ten of something small becomes one of the next size up.');
}

/* FORMAT 2 - direct compute, addition with at least two regroupings
   (pool 1, 1 step - the addition fluency anchor).
   Named distractors: never carried anything; forgot one carry; carried a ten
   that was not there. */
function gAddRegroup(){
  let a = 3456, b = 1278, cols = [], key = 4734, g = 0;
  do {
    a = ri(1000, 7000); b = ri(1000, MAXN - a);
    key = a + b; cols = carryCols(a, b);
    g++;
  } while (g < 200 && !(cols.length >= 2 && ok(key) &&
           optsOk(key, [noCarry(a, b), addCols(a, b, cols[0]), key + POW[cols[0]] * 10])));
  const lost = addCols(a, b, cols[0]);
  return mcNum('What is ' + a + ' + ' + b + '?', '', key,
    [noCarry(a, b), lost, key + POW[cols[0]] * 10], '',
    'Line the numbers up and add from the right. ' + a + ' + ' + b + ' = ' + key + '. The ' +
    PLACES[cols[0]] + ' column makes ten or more, so a ten moves into the column on its left; this ' +
    'sum regroups in ' + cols.length + ' of its four columns. Writing every column total straight ' +
    'down without carrying gives ' + noCarry(a, b) + ', which is the usual slip.');
}

/* FORMAT 3 - direct compute, subtraction with regrouping (pool 2, 1 step) */
function gSubRegroup(){
  let a = 5042, b = 1867, cols = [], key = 3175, g = 0;
  do {
    a = ri(2000, MAXN); b = ri(1000, a - 1000);
    key = a - b; cols = borrowCols(a, b);
    g++;
  } while (g < 200 && !(cols.length >= 2 && ok(key) && smallFromBig(a, b) !== key &&
           optsOk(key, [smallFromBig(a, b), key + POW[cols[0]] * 10, key - POW[cols[0]] * 10])));
  return mcNum('What is ' + a + ' − ' + b + '?', '', key,
    [smallFromBig(a, b), key + POW[cols[0]] * 10, key - POW[cols[0]] * 10], '',
    a + ' − ' + b + ' = ' + key + '. In the ' + PLACES[cols[0]] + ' column you cannot take away ' +
    'enough, so you take one from the column on its left and turn it into ten. Taking the smaller ' +
    'digit away from the bigger one in every column instead - which is the commonest slip - gives ' +
    smallFromBig(a, b) + '.');
}

/* FORMAT 4 - inverse: the missing part (pool 2, 2 steps) */
function gMissingAddend(){
  let a = 1278, total = 4021, key = 2743, cols = [], g = 0;
  do {
    total = ri(2000, MAXN); a = ri(1000, total - 1000);
    key = total - a; cols = borrowCols(total, a);
    g++;
  } while (g < 200 && !(cols.length >= 2 && ok(key) && smallFromBig(total, a) !== key &&
           optsOk(key, [smallFromBig(total, a), key + POW[cols[0]] * 10, key - POW[cols[0]] * 10])));
  return mcNum(a + ' + ? = ' + total, '', key,
    [smallFromBig(total, a), key + POW[cols[0]] * 10, key - POW[cols[0]] * 10], '',
    'A missing part is found by taking the part you know away from the whole: ' + total + ' − ' + a +
    ' = ' + key + '. Check it the other way round - ' + a + ' + ' + key + ' = ' + total +
    ' - and you will catch a regrouping slip straight away.');
}

/* FORMAT 5 - mental strategy: make the next ten, then adjust (pool 2, 2 steps).
   MOE P3 2.2, mental calculation with two 2-digit numbers. */
function gMentalMake(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  let a = 58, b = 27, round = 60, key = 25, g = 0;
  do {
    a = ri(11, 89); b = ri(11, 89);
    round = a + (10 - (a % 10));
    key = b - (round - a);
    g++;
  } while (g < 200 && !(a % 10 !== 0 && key >= 2 && (round - a) !== key &&
           optsOk(key, [b, b + (round - a), round - a])));
  const moved = round - a;
  return mcNum(who + ' works out ' + a + ' + ' + b + ' in ' + (pron === 'He' ? 'his' : 'her') +
    ' head. ' + pron + ' makes ' + round + ' first. ' + a + ' + ' + b + ' = ' + round + ' + ?', '',
    key, [b, b + moved, moved], '',
    'To get from ' + a + ' up to ' + round + ' you need ' + moved + ', so ' + moved + ' is moved ' +
    'across from the ' + b + '. That leaves ' + b + ' − ' + moved + ' = ' + key + ', and ' + round +
    ' + ' + key + ' = ' + (a + b) + '. Whatever you give to one number you must take off the other, ' +
    'or the total changes.');
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

/* FORMAT 7 - error spotting, CORRECT the mistake and MEASURE it, numeric key
   (pool 3, 2 steps). The stem NAMES the slip, so the premise it states is true by
   construction and the harness re-derives the printed wrong answer from it.

   W4 (Sweep p3numbers Refutation, 2026-09-15): the old stem ended "What is the
   correct answer?", which is gSubRegroup's pool-2 computation with the wrong
   answer handed to the child - 5,000 / 5,000 draws were answered by computing
   a − b alone, and the extra sentence REMOVED a distractor by naming it. The item
   now asks how far wrong the slip left him, so the child must do the regrouping
   subtraction properly AND compare the two answers. The old key, a − b, is now
   the lead distractor: it is exactly what a child who stops after step 1 writes.
   (smallFromBig(a,b) >= a − b always, with equality only when no column needs
   regrouping, and cols.length >= 1 is required - so the gap is always positive.) */
function gSubError(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  let a = 4003, b = 1568, key = 2435, claim = 3565, gapv = 1130, cols = [], g = 0;
  do {
    a = ri(2000, MAXN); b = ri(1000, a - 1000);
    key = a - b; claim = smallFromBig(a, b); cols = borrowCols(a, b); gapv = claim - key;
    g++;
  } while (g < 200 && !(cols.length >= 1 && ok(key) && ok(claim) && claim > key && ok(gapv) &&
           optsOk(gapv, [key, claim, gapv + POW[cols[0]] * 10])));
  return mcNum(who + ' works out ' + a + ' − ' + b + '. In every column ' + pron.toLowerCase() +
    ' takes the smaller digit away from the bigger one, and gets ' + claim +
    '. <b>How much bigger is ' + (pron === 'He' ? 'his' : 'her') + ' answer than the correct one?</b>',
    '', gapv,
    [key,                            /* worked out the right answer and stopped there */
     claim,                          /* handed his own wrong answer back */
     gapv + POW[cols[0]] * 10], '',  /* lost a regrouping in the comparing step */
    'Taking the smaller digit from the bigger one in each column ignores which number is on top, and ' +
    'that is how ' + claim + ' appears. Done properly, the ' + PLACES[cols[0]] + ' column cannot give ' +
    'what is asked, so one is taken from the column on its left and turned into ten: ' + a + ' − ' + b +
    ' = ' + key + '. Now compare the two answers: ' + claim + ' − ' + key + ' = ' + gapv +
    '. Stopping at ' + key + ' answers a different question.');
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
  let first = 2145, more = 480, key = 4770, g = 0;
  do {
    first = ri(1000, 4000); more = ri(120, 900);
    key = first + (first + more);
    g++;
  } while (g < 200 && !(ok(key) && ok(first + more) &&
           optsOk(key, [first + more, first * 2, key + more])));
  const second = first + more;
  return mcNum('The ' + c[0] + ' sold ' + first + ' ' + c[1] + ' last month. This month it sold ' +
    more + ' more ' + c[1] + ' than last month. <b>How many ' + c[1] +
    ' altogether in the two months?</b>', '', key, [second, first * 2, key + more], '',
    'Step 1 - this month: ' + first + ' + ' + more + ' = ' + second + ' ' + c[1] + '. Step 2 - the two ' +
    'months together: ' + first + ' + ' + second + ' = ' + key + '. Stopping after step 1 answers only ' +
    'this month, which is the slip the ' + second + ' is there to catch.');
}

/* FORMAT 9 - working backwards from the end (pool 3, 2 steps) */
const KEEP_CTX = ['stickers', 'marbles', 'trading cards', 'beads', 'stamps'];
function gBackFromTotal(){
  const kid = pick(KIDS), who = kid[0], pron = kid[1];
  const thing = pick(KEEP_CTX);
  let gave = 1240, got = 350, now = 2765, key = 3655, g = 0;
  do {
    gave = ri(300, 2200); got = ri(150, 1200); now = ri(2500, 5000);
    key = now + gave - got;
    g++;
  } while (g < 300 && !(ok(key) && gave !== got && 2*gave !== got &&
           optsOk(key, [now + got - gave, now + gave + got, now + gave])));
  return mcNum(who + ' had some ' + thing + '. ' + pron + ' gave away ' + gave + ' of them, then ' +
    'bought ' + got + ' more. Now ' + pron.toLowerCase() + ' has ' + now +
    '. <b>How many ' + thing + ' did ' + pron.toLowerCase() + ' have at first?</b>', '', key,
    [now + got - gave, now + gave + got, now + gave], '',
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
               tip:'Write the difference above each gap. If all the gaps match you have found the jump; then say whether it is a jump of tens, hundreds or thousands.'},
      addsub: {label:'Adding & subtracting',
               tip:'Line the columns up and work from the right. Ten in a column moves one place LEFT; if you cannot take away, take one from the left and turn it into ten. Check a subtraction by adding the answer back.'}
    },
    pools:{
      1:[[gStandsEasy,'place'],[gWhichDigit,'place'],[gGreatest,'compare'],
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
