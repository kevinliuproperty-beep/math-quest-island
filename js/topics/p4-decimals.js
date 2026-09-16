"use strict";
/* Math Quest Island topic: decimals (Decimal Bay, P4). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 *
 * SWEEP 2026-09-15 (depth-pilot contract taken wide, Kevin's Q114 "Reshape").
 * Rebuilt from the five recovered generator families into FOUR PRINCIPLES, each
 * with a bank of formats a teacher would rotate through. The audit's findings on
 * this file were: 5 skills / 13 generators / 15 stem shapes; gDecPV1 and gDecPV2
 * were the same stem one decimal place apart (worst-ten #6); pool 3 added no
 * solving step in 5 of 5 slots; `convert` and `place` owned one stem shape each.
 *
 * PRINCIPLE 1 - PLACE VALUE. A decimal is the whole number plus tenths,
 *   hundredths and thousandths OF ONE. Where a digit sits decides what it is
 *   worth, and an empty place still has to be written.
 * PRINCIPLE 2 - COMPARING, ORDERING AND ROUNDING. Line the decimal points up and
 *   compare one place at a time from the left. A longer decimal is NOT
 *   automatically a bigger one, and rounding looks only at the next digit.
 * PRINCIPLE 3 - DECIMALS AND FRACTIONS. One number written two ways: tenths over
 *   10, hundredths over 100, thousandths over 1000 - and a fraction whose
 *   denominator divides into 10 or 100 can always be rewritten that way.
 * PRINCIPLE 4 - OPERATIONS IN MONEY AND MEASURES. The decimal point is a place
 *   marker, not a decoration: it is what you line up when you add, and what you
 *   keep track of when you multiply or share.
 *
 * CONTRACT RULES CARRIED FROM THE PILOT AND ITS TWO REFUTATIONS:
 *  - EXACT ARITHMETIC. Every value in this file is carried as a SCALED INTEGER
 *    plus a decimal-place count (the `D(n, dp)` pair below) and formatted by
 *    digit surgery, never by toFixed on a float. `0.07` is `D(7, 2)`, never
 *    `7/100`. The recovered finishDec formatted every option to ONE shared dp,
 *    so a distractor meant to read "0.07" shipped as "0.1"; that whole class is
 *    gone because each option now prints at its OWN dp.
 *  - NO TWO DEFENSIBLE OPTIONS. Every option set is checked for exact-value
 *    collisions before it ships, and every "which one" item is drawn so that
 *    exactly one option satisfies the stem.
 *  - NAMED MISCONCEPTIONS ONLY. Each numeric item authors three named wrong
 *    answers and stamps `q.decAuthored` (and `q.authored` where the options parse
 *    as plain numbers) so the harness fails the build if a padded distractor ever
 *    ships or if a named one collides with the key.
 *  - THE ANCHOR IS DECLARED. Pool 3 keeps exactly one single-step item on
 *    purpose (`gDecExpand`); the other eleven pool-3 slots are two-step.
 *  - MONEY IS WRITTEN LIKE MONEY. Every money amount with a decimal point prints
 *    exactly two places ($4.50, never $4.5). Gated in tools/gen-sanity.mjs.
 * Every stem is re-derived from its RENDERED text by a decimals oracle in
 * tools/gen-sanity.mjs that is dispatched on the topic id BEFORE any other
 * branch, so an unmatched decimals stem is a build FAILURE, not a warning.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped;

/* ===== EXACT DECIMAL KIT ====================================================
   A value is { n, dp }: the integer n scaled by 10^dp. 0.07 is { n:7, dp:2 }.
   Nothing here ever divides, so nothing here ever drifts. */
const P10 = [1, 10, 100, 1000, 10000, 100000];
const D = (n, dp) => ({ n: n, dp: dp });
/* the decimal string, built from the digits - not from a float */
function dtext(d) {
  const neg = d.n < 0, n = Math.abs(d.n);
  if (d.dp === 0) return (neg ? '-' : '') + n;
  const p = P10[d.dp], w = Math.floor(n / p);
  let f = String(n - w * p);
  while (f.length < d.dp) f = '0' + f;
  return (neg ? '-' : '') + w + '.' + f;
}
/* the Number a child would read, for candidate lists the shared kit wants */
const dnum = d => d.n / P10[d.dp];
/* same quantity? compared as integers at the deeper scale */
function dsame(a, b) {
  const m = Math.max(a.dp, b.dp);
  return a.n * P10[m - a.dp] === b.n * P10[m - b.dp];
}
const dcmp = (a, b) => { const m = Math.max(a.dp, b.dp); return a.n * P10[m - a.dp] - b.n * P10[m - b.dp]; };
/* strip trailing zeros: D(40,2) -> D(4,1), so "how many hundredths in 0.4" can
   print 0.4 and not give its own answer away */
function dnat(d) { let n = d.n, dp = d.dp; while (dp > 0 && n % 10 === 0) { n /= 10; dp--; } return D(n, dp); }
/* The two point-placement slips every P4 paper carries: the right digits with the
   decimal point one column out. pLeft reads BIGGER, pRight reads SMALLER, so a
   generator that authors both has a named candidate on each side of its key.
   pRight is only legal while the result stays inside the three-place ceiling. */
const pLeft  = d => D(d.n, Math.max(0, d.dp - 1));
const pRight = d => (d.dp < 3 ? D(d.n, d.dp + 1) : null);
/* every distinct? (exact, not by string) */
function dallDistinct(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (dsame(list[i], list[j])) return false;
  return true;
}
const money = cents => '$' + dtext(D(cents, 2));
const PLACE_WORD = ['ones', 'tenths', 'hundredths', 'thousandths'];
const PLACE_ONE  = ['one', 'tenth', 'hundredth', 'thousandth'];
/* "1 tenths" is not English and a parent reads the explanation out loud. */
const qty = (n, place) => n + ' ' + (n === 1 ? PLACE_ONE[place] : PLACE_WORD[place]);
/* WOUND 5 (refutation 2026-09-15): gDecBar wrote `filled + ' parts are shaded'` raw
   and printed "1 parts are shaded" on 12.8% of its draws, in a file that already
   carried qty() for exactly this. Nothing that counts anything in this file writes
   its own plural any more: it goes through `many`, which agrees the verb too. */
const many = (n, one, plural) => n + ' ' + (n === 1 ? one : plural);
/* always written as "... to " + roundPhrase(to), so the article lives in one place */
const roundPhrase = to => (to === 0 ? 'the nearest whole number' : (to === 1 ? '1 decimal place' : '2 decimal places'));
/* round half up at `to` places, from a scaled integer. Integer arithmetic only. */
function dround(d, to) {
  if (d.dp <= to) return D(d.n * P10[to - d.dp], to);
  const cut = P10[d.dp - to];
  const base = Math.floor(d.n / cut), rem = d.n - base * cut;
  return D(rem * 2 >= cut ? base + 1 : base, to);
}

const NAMES = ['Mei Ling', 'Siti', 'Ravi', 'Kumar', 'Wei Jie', 'Nurul', 'Jun Hao', 'Priya', 'Ah Seng', 'Aisyah'];
const pickNames = n => shuffle(NAMES).slice(0, n);

/* ===== FINISHERS ============================================================
   mcDec  - 4 decimal options, EACH printed at its own decimal places, deduped by
            exact value. Stamps q.decAuthored (the three named distractor strings)
            and, when every option parses as a plain number, q.authored, so the
            harness's distractor-identity contract binds on every draw.
   mcMoney- the same, as $x.xx. parseFloat("$6.25") is NaN, so money items carry
            q.decAuthored only; the decimals gate in gen-sanity checks it the same
            way the shared contract checks q.authored.
   mcText - hand-written misconception options (concept checks, error diagnosis). */
function assemble(keyStr, wrongStrs, stem, extra, explain) {
  const opts = shuffle([keyStr].concat(wrongStrs));
  return { q: stem, extra: extra || '', choices: opts, correct: opts.indexOf(keyStr),
           explain: explain, answerText: keyStr };
}

/* ===== MAGNITUDE-RANK DISCIPLINE (refutation 2026-09-15, WOUND 1) ============
   The sweep's cheap-strategy table measured length and decimal places and found
   nothing above 5%. It never measured MAGNITUDE. "Always pick the second biggest
   number" won 38.5% of this bank and 100% of six generators, because each of
   those generators' three named distractors always bracketed the key the same
   way: two below and one above, on every draw, for ever.

   The fix is not a padded distractor and not a redraw. It is a WIDER BANK of
   named slips - every numeric generator now authors five or six, with at least
   two on each side of the key - plus this picker, which draws the NUMBER OF
   SHIPPED OPTIONS ABOVE THE KEY uniformly over whatever the pool can support.
   The key's rank then spreads across the four positions instead of being pinned
   to one, and no fixed rank rule beats chance by much.

   `must(c)` marks a candidate that has to ship on every draw - the item's whole
   point (gDecAlignError's printed slip, gDecShareMass's stop-after-dividing
   answer, which its oracle requires).

   rankPick is generic on purpose: `cmp` orders a candidate against the key and
   `dpOf` reports its decimal places, so the same routine serves the decimal
   finisher, the money finisher (integer cents) and the count finisher. That is
   the shape the integrator lifts into the shared harness. */
const must = c => (c ? { n: c.n, dp: c.dp, must: true } : c);
/* the same discipline for a finishNum item, whose answers are plain counts */
function rankInts(key, cands) {
  const pool = [];
  for (const c of cands) {
    const v = (c && typeof c === 'object') ? c : { n: c };
    if (!Number.isInteger(v.n) || v.n <= 0 || v.n === key || pool.some(k => k.n === v.n)) continue;
    pool.push(v);
  }
  const sel = rankPick(pool, c => c.n - key, () => null, null) || pool.slice(0, 3);
  return shuffle(sel).map(v => v.n);
}
function rankPick(pool, cmp, dpOf, keyDp) {
  const musts = pool.filter(c => c.must), rest = pool.filter(c => !c.must);
  if (musts.length > 3) return null;
  const need = 3 - musts.length;
  const above = rest.filter(c => cmp(c) > 0), below = rest.filter(c => cmp(c) < 0);
  const hi = Math.min(need, above.length), lo = Math.max(0, need - below.length);
  if (lo > hi) return null;
  let fallback = null;
  for (let t = 0; t < 30; t++) {
    const a = ri(lo, hi);
    const sel = musts.concat(shuffle(above).slice(0, a), shuffle(below).slice(0, need - a));
    if (sel.length !== 3) continue;
    if (!fallback) fallback = sel;
    /* RULE D1 still binds: the key may not be the only option written to its own
       number of decimal places, so a selection that shares it is preferred. */
    if (keyDp == null || sel.some(c => dpOf(c) === keyDp)) return sel;
  }
  return fallback;
}

function mcDec(stem, extra, key, cands, unit, explain) {
  const u = unit ? (' ' + unit) : '';
  const pool = [];
  for (const c of cands) {
    /* zero is never a named misconception: "0.0" as an answer to an addition of
       two positive numbers is a free elimination wearing a distractor's badge
       (refutation v2 WOUND 1), so it is dropped here as well as gated. */
    if (!c || !Number.isFinite(c.n) || c.n <= 0) continue;
    if (dsame(c, key) || pool.some(k => dsame(k, c))) continue;
    pool.push(c);
  }
  let kept = rankPick(pool, c => dcmp(c, key), c => c.dp, key.dp) || pool.slice(0, 3);
  kept = shuffle(kept);
  const authored = kept.length === 3;
  let t = 1;
  while (kept.length < 3 && t < 90) {
    for (const cand of [D(key.n + t, key.dp), D(key.n - t, key.dp)]) {
      if (kept.length >= 3) break;
      if (cand.n <= 0 || dsame(cand, key) || kept.some(k => dsame(k, cand))) continue;
      kept.push(cand);
    }
    t++;
  }
  const wrongStrs = kept.map(c => dtext(c) + u);
  const q = assemble(dtext(key) + u, wrongStrs, stem, extra, explain);
  if (authored) {
    q.decAuthored = wrongStrs.slice();
    if (!/\$/.test(u)) q.authored = kept.map(dnum);
  }
  return q;
}
function mcMoney(stem, extra, keyCents, candCents, explain) {
  /* cents are already integers, so the rank picker runs on { n } alone and the
     decimal-place rule does not apply (every money option prints two places). */
  const pool = [];
  for (const c of candCents) {
    const v = (c && typeof c === 'object') ? c : { n: c };
    if (!Number.isInteger(v.n) || v.n <= 0 || v.n === keyCents || pool.some(k => k.n === v.n)) continue;
    pool.push(v);
  }
  let keptV = rankPick(pool, c => c.n - keyCents, () => null, null) || pool.slice(0, 3);
  const kept = shuffle(keptV).map(v => v.n);
  const authored = kept.length === 3;
  let t = 5;
  while (kept.length < 3 && t < 400) {
    for (const cand of [keyCents + t, keyCents - t]) {
      if (kept.length >= 3) break;
      if (cand <= 0 || cand === keyCents || kept.indexOf(cand) !== -1) continue;
      kept.push(cand);
    }
    t += 5;
  }
  const wrongStrs = kept.map(money);
  const q = assemble(money(keyCents), wrongStrs, stem, extra, explain);
  if (authored) q.decAuthored = wrongStrs.slice();
  return q;
}
function mcText(stem, extra, correctText, wrongs, explain) {
  const named = wrongs.slice(0, 3);
  const opts = shuffle([correctText].concat(named));
  const q = { q: stem, extra: extra || '', choices: opts, correct: opts.indexOf(correctText),
              explain: explain, answerText: correctText };
  /* the word-answer half of the named-distractor contract: these three strings ARE
     the three wrong options, and the harness fails the build if one of them ever
     equals the key or if a fourth string appears from somewhere. */
  if (named.length === 3 && new Set(opts).size === 4) q.decAuthored = named;
  return q;
}
const fig = (q, figure) => (q.figure = figure, q);

/* ===== THE EXPLANATION MAY ONLY NAME A NUMBER THAT IS ON THE ROW ==============
   (the p2 sweep's explanation gate, lifted here as one helper - refutation v4
   WOUND 2 on gDecBuild, refutation v5 WOUND 2 on gDecRoundSum.)

   An explanation that calls out a named slip BY NUMBER, while that slip is one of
   six candidates of which three ship, sends the child hunting the option row for a
   number that is not on it - and in both generators a LOOKALIKE one unit away was
   on the row every time. Marking the slip `must()` fixes it and pins the key's
   magnitude rank, which is the defect the rank discipline above exists to stop.

   `slipFor` is the other fix: hand it the built item and the [value, sentence]
   pairs in priority order, and it returns the first pair whose value is actually
   printed on the row, so the diagnosis always matches a number the child can see.
   `textOf` renders a value the way its option is written ("5 kg", "1.87"). */
function slipFor(q, named, textOf) {
  const on = (q.choices || []).map(c => String(c));
  return named.find(p => p[0] !== null && p[0] !== undefined && on.indexOf(textOf(p[0])) >= 0) || null;
}

/* ---- draw helper: distinct digits 1..9, so the digit a stem names appears in
   exactly one place and "which place is it in" has exactly one answer ---- */
function distinctDigits(k) { return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, k); }

/* =============================================================================
   PRINCIPLE 1 - PLACE VALUE
   "A decimal is the whole number plus tenths, hundredths and thousandths of one."
   ========================================================================== */

/* FORMAT 1a - direct compute: what is one digit worth? (pool 1)

   THE KILL (refutation v5 @ 8cf212b). The v5 row was the named digit at the asked
   place, the same digit one place shallower, the ONES digit at the asked place and
   a second decimal digit at the asked place - so THREE options printed at the asked
   depth and, because `distinctDigits` guarantees the digits differ, exactly one of
   those three ended in the digit the question names. "Of the options written to the
   commonest number of decimal places, take the one ending in the named digit"
   settled 100.00% of draws and was right 100.00% of them, on 80,000 draws without a
   miss, and the numeral in the stem was never read. Structural on both branches of
   the draw, on the pool-1 `place` anchor a struggling child meets twice a session.

   THE REBUILD, and it is the PM's own: the row is now the SAME digit at ALL FOUR
   PLACES - ones, tenths, hundredths, thousandths - so the ONLY token that differs
   between the options is the place, which is the mathematics. Every option ends in
   the named digit (the refuter's second half keeps 4 and settles nothing), every
   option is written to its own depth so there is no commonest depth to read (the
   first half keeps 4 as well), no option carries a trailing zero, and the four
   lengths, magnitudes and depths are one apiece, so every formatting and rank rule
   is a flat 1-in-4. The number carries three decimal places on every draw and the
   place asked for is uniform over the four, which is what keeps "pick the option
   written to as many places as the number" at chance instead of at 46%.

   RULE D1 is refined in tools/gen-sanity.mjs in the same sitting: a key alone at its
   own decimal-place count is a tell only when some OTHER pair shares one. Where all
   four options differ, the odd one out does not exist and the depth names nobody. */
function gDecDigitValue() {
  const ds = distinctDigits(4);
  const whole = ds[0], dec = ds.slice(1);
  const numStr = whole + '.' + dec.join('');
  const place = ri(0, 3);                                  /* the ones place is a place too */
  const d = place === 0 ? whole : dec[place - 1];
  const key = D(d, place);
  /* the three named slips ARE the other three places: counted one place too few,
     one too many, or forgot to count past the point at all. */
  const wrongs = [0, 1, 2, 3].filter(p => p !== place).map(p => D(d, p));
  return mcDec('What is the value of the digit <b>' + d + '</b> in <b>' + numStr + '</b>?', '',
    key, wrongs, '',
    'In ' + numStr + ', count the places after the decimal point: tenths, then hundredths, then thousandths. ' +
    'The digit ' + d + ' is ' + (place === 0 ? 'before the point, so it sits in the ones place'
      : 'number ' + place + ' after the point, so it sits in the ' + PLACE_WORD[place] + ' place') +
    ' and it is worth ' + qty(d, place) + ', which is ' + dtext(key) + '.');
}
/* --- (gDecNamePlace follows) --- */

/* FORMAT 1b - concept check, no arithmetic: name the place (pool 1) */
function gDecNamePlace() {
  const ds = distinctDigits(4);
  const whole = ds[0], dec = ds.slice(1);
  const numStr = whole + '.' + dec.join('');
  const place = ri(0, 3);
  const d = place === 0 ? whole : dec[place - 1];
  const key = PLACE_WORD[place];
  const wrongs = PLACE_WORD.filter(w => w !== key);
  return mcText('In <b>' + numStr + '</b>, which place is the digit <b>' + d + '</b> in?', '',
    key, wrongs,
    'The places run ones, then the decimal point, then tenths, hundredths and thousandths. ' +
    'In ' + numStr + ' the digit ' + d + ' is ' +
    (place === 0 ? 'before the point, so it is in the ones place.'
                 : 'number ' + place + ' after the point, so it is in the ' + key + ' place.'));
}

/* FORMAT 1c - inverse / working backwards: build the number from its parts, with
   one place left EMPTY. The empty place is the whole item (pool 2). */
function gDecBuild() {
  let w = 3, p1 = 1, d1 = 7, d2 = 2, key = D(3702, 3), packed = D(3720, 3),
      swapped = D(3207, 3), packedSwapped = D(3270, 3), guard = 0;
  const p2 = 3;
  do {
    guard++;
    const ds = distinctDigits(3);
    w = ds[0]; d1 = ds[1]; d2 = ds[2];
    p1 = Math.random() < 0.5 ? 1 : 2;
    key = D(w * 1000 + d1 * P10[3 - p1] + d2, 3);
    /* WOUND 2 + WOUND 3 (refutation v4 @ 7ec7919): written at three places this
       printed "1.870", a trailing zero no key here can carry - and a child who
       writes the digits in a row writes 1.87, not 1.870. dnat prints what the
       slip actually produces. */
    packed = dnat(D(w * 1000 + d1 * 100 + d2 * 10, 3));        /* wrote the digits in a row */
    swapped = D(w * 1000 + d2 * P10[3 - p1] + d1, 3);          /* the two digits in each other's place */
    packedSwapped = dnat(D(w * 1000 + d2 * 100 + d1 * 10, 3)); /* in a row AND the wrong way round */
  } while (guard < 200 && !dallDistinct([key, packed, swapped, packedSwapped]));
  const parts = qty(w, 0) + ', ' + qty(d1, p1) + ' and ' + qty(d2, p2);
  /* WOUND 1: `packed` always sits above the key and the two swaps sit wherever the
     digits fall, so the key was the smallest of the four on 48% of draws. Two more
     named slips, both below: the child who forgets to write the whole number at
     all, and the child who writes the first part and the last part but drops the
     middle one. */
  /* COUPLING GATE (fourth pass, found by the new arm): "forgot to write the whole
     number at all" is the key with its whole ones removed, so it repeats the KEY's
     digits after the point exactly - and it is the only option that does. "The
     option whose whole ones are one of the numbers in the question, and whose
     digits after the point another option repeats" then settled 57% of draws and
     was right every time. The slip is kept and written the way a child who loses
     the whole number actually writes it - the digits in a row, with the empty place
     still held open by the zero - so it no longer carries the key's own tail. */
  const noWhole = dnat(D(d1 * 100 + d2 * 10, 3));
  const noMiddle = D(w * 1000 + d2, 3);
  /* and one guaranteed ABOVE, so the two swaps falling below cannot pin the key
     to the top: the child who ignores the decimal point altogether. */
  const noPoint = D(w * 100 + d1 * 10 + d2, 0);
  /* WOUND 2 (refutation v4 @ 7ec7919): the explanation named `packed` by number,
     and `packed` was one of six candidates of which three ship - so on 50.48% of
     draws a child re-read the explanation, hunted the row for a number that was not
     on it, and found the LOOKALIKE `packedSwapped` instead. Making `packed` a must
     would have fixed it and pinned the key's magnitude rank (it sits above the key
     on every draw), so the explanation is written off the row instead: whichever
     named slip actually shipped is the one it calls out, and each carries its own
     sentence so the diagnosis still matches the number. */
  const named = [
    [packed, 'Writing the digits in a row with no zero gives '],
    [packedSwapped, 'Writing the digits in a row with no zero and the wrong way round gives '],
    [swapped, 'Putting each of the two digits in the other one\'s place gives '],
    [noMiddle, 'Leaving the middle part out altogether gives '],
    [noWhole, 'Forgetting the whole number gives '],
    [noPoint, 'Ignoring the decimal point gives ']
  ];
  const q = mcDec('Which number is made up of <b>' + parts + '</b>?', '',
    key, [packed, swapped, packedSwapped, noWhole, noMiddle, noPoint], '', '');
  const on = slipFor(q, named, dtext) || named[0];
  q.explain = parts + ' is written ' + dtext(key) + '. There are no ' + PLACE_WORD[p1 === 1 ? 2 : 1] +
    ', so a zero holds that place open. ' + on[1] + dtext(on[0]) + ', which is a different number.';
  q.answerText = dtext(key);
  return q;
}

/* FORMAT 1d - concept check: how many of a smaller place make this number?
   (pool 2). Answers here are counts, so this one routes through finishNum. */
function gDecHowMany() {
  let w = 2, dp = 1, j = 1, val = D(27, 1), V = 27, shallow = 2, digitsOnly = 7, guard = 0;
  do {
    guard++;
    dp = Math.random() < 0.65 ? 1 : 2;
    /* WOUND 4 (refutation v5 @ 8cf212b). `j` was the number's OWN last place on
       50.0% of draws, and there the key is the stem's digits with the point rubbed
       out - "How many hundredths are there in 4.68?" -> 468 - so "the option whose
       digit multiset is the stem number's" settled those draws 100.00% and was
       right every time, with no place counted. The shape is the MOE question and it
       is kept, but it is now one draw in four instead of one in two, and on the
       other three `j` runs DEEPER than the number, where the option carrying the
       stem's digits is `shallow`, a named slip, and the rule walks into it. */
    j = Math.random() < 0.25 ? dp : (dp === 1 ? pick([2, 3]) : 3);
    const ds = distinctDigits(dp + 1);
    w = ds[0];
    val = D(w * P10[dp] + ds.slice(1).reduce((a, x, i) => a + x * P10[dp - 1 - i], 0), dp);
    V = val.n * P10[j - dp];                                   /* the count in place j */
    shallow = j - 1 >= dp ? val.n * P10[j - 1 - dp]            /* the count one place shallower */
                          : Math.floor(val.n / P10[dp - (j - 1)]);
    digitsOnly = val.n - w * P10[dp];                          /* just the digits after the point */
  } while (guard < 200 && !(V > 0 && shallow > 0 && digitsOnly > 0 &&
           new Set([V, shallow, digitsOnly, V * 10]).size === 4));
  /* WOUND 1: `shallow` and `digitsOnly` are always below V and `V x 10` always
     above, so "second biggest" was the answer on 2,000 of 2,000 draws. Two more
     named slips - one below (counted the whole ones and forgot the digits after
     the point), one above (converted the digits after the point as if they were
     whole ones too) - let the picker vary how many options sit above the key. */
  const wholeOnly = w * P10[j];
  const digitsAsWholes = (w + digitsOnly) * P10[j];
  /* WOUND 4 (refutation v4 @ 7ec7919): "neither the longest nor the shortest
     numeral" settled 38.1% of draws here at 53.5% accuracy, because the key was the
     only option written to its own number of digits whenever this slip did not
     ship. "Counted the whole ones and forgot the digits after the point" is written
     to EXACTLY the key's length on every draw (w followed by j zeros against
     val.n followed by j - dp zeros), so it ships on all of them and the key is
     never alone in the middle. It sits below the key, where the picker already had
     two others, so no rank moves. */
  const wrongs = rankInts(V, [{ n: wholeOnly, must: true }, shallow, digitsOnly, V * 10, digitsAsWholes]);
  const q = finishNum('How many <b>' + PLACE_WORD[j] + '</b> are there in <b>' + dtext(val) + '</b>?', '',
    V, wrongs, '',
    'One whole is ' + qty(P10[j], j) + ', so ' + qty(w, 0) + ' is ' + qty(w * P10[j], j) +
    '. Adding the ' + PLACE_WORD[j] + ' already after the point gives ' + qty(V, j) + ' altogether.');
  q.decAuthored = wrongs.map(String);
  q.authored = wrongs.slice();
  return q;
}

/* FORMAT 1e - concept check, expanded form (pool 3, the DECLARED single-step
   anchor: one idea, no working). */
function gDecExpand() {
  const dp = Math.random() < 0.5 ? 2 : 3;
  const ds = distinctDigits(dp + 1);
  const w = ds[0], dec = ds.slice(1);
  const numStr = w + '.' + dec.join('');
  const term = (d, place) => dtext(D(d, place));
  const key = w + ' + ' + dec.map((d, i) => term(d, i + 1)).join(' + ');
  const noPoint = w + ' + ' + dec.join(' + ');
  /* COUPLING GATE (refutation v4 @ 7ec7919, the gate's own finding): this used to
     print its places in the reverse order too, so the KEY was the only option
     ending on a term written to the number's own last place - "pick the option
     that ends at the same depth as the number" settled it on 100% of draws with no
     place value read at all. The digits are still the wrong way round; the places
     now run big to small like the key's, so the depth of the last term is shared. */
  const reversed = w + ' + ' + dec.map((d, i) => term(dec[dp - 1 - i], i + 1)).join(' + ');
  const allTenths = w + ' + ' + dec.map(d => term(d, 1)).join(' + ');
  return mcText('Which of these shows <b>' + numStr + '</b> written as the sum of its place values?', '',
    key, [noPoint, reversed, allTenths],
    'Take ' + numStr + ' one place at a time: ' + qty(w, 0) + ', ' +
    dec.map((d, i) => qty(d, i + 1)).join(', ') + '. Written out that is ' + key + '.');
}

/* FORMAT 1f - error spotting, the mistake NAMED (pool 3, diagnose).
   Misconception: the places after the point miscounted.

   WOUND 3 (refutation 2026-09-15). The first cut offered the four PLACE NAMES as
   sentences, so "find the place the digit is really in and pick the option naming
   that place" answered it on 20,000 of 20,000 draws WITHOUT EVER READING THE
   CLAIM - the demand of the pool-1 lookup gDecNamePlace with a story round it.
   The options are now the four ways the miscount itself can go: one or two places
   too many, one or two too few. Neither half of that answer exists in the stem
   alone. The child has to find the true place AND read the claimed place AND
   compare them, which is the two-step demand a pool-3 slot is for. */
const MISCOUNT = k => (k > 0
  ? (k === 1 ? 'counted one place too many after the decimal point' : 'counted two places too many after the decimal point')
  : (k === -1 ? 'counted one place too few after the decimal point' : 'counted two places too few after the decimal point'));
function gDecPlaceError() {
  const who = pick(NAMES);
  /* ALWAYS three decimal places, so every offset in [-2, -1, 1, 2] is reachable. */
  const dp = 3;
  const ds = distinctDigits(dp + 1);
  const whole = ds[0], dec = ds.slice(1);
  const numStr = whole + '.' + dec.join('');
  /* the OFFSET is drawn first and uniformly, so no single option is the answer
     more often than any other and "always pick one place too many" is at chance */
  const off = pick([-2, -1, 1, 2]);
  /* the claimed place is always a place this number actually HAS (1..3), so the
     mistake is a miscount and not a nonsense claim; the true place may be the ones */
  const places = [0, 1, 2, 3].filter(p => p + off >= 1 && p + off <= dp);
  const place = pick(places);
  const sayIdx = place + off;
  const d = place === 0 ? whole : dec[place - 1];
  const key = who + ' ' + MISCOUNT(off) + '.';
  const wrongs = [-2, -1, 1, 2].filter(k => k !== off).map(k => who + ' ' + MISCOUNT(k) + '.');
  return mcText(who + ' says the digit <b>' + d + '</b> in <b>' + numStr + '</b> is worth <b>' + qty(d, sayIdx) +
    '</b>. <b>What did ' + who + ' get wrong?</b>', '', key, wrongs,
    'Count the places one at a time: the ones are before the decimal point, then tenths, hundredths and thousandths after it. In ' +
    numStr + ' the digit ' + d + ' is ' +
    (place === 0 ? 'before the point, so it is worth ' : 'number ' + place + ' after the point, so it is worth ') +
    qty(d, place) + ', which is ' + dtext(D(d, place)) + '. ' + who + ' named the ' + PLACE_WORD[sayIdx] +
    ' place, which is ' + (Math.abs(off) === 1 ? 'one place' : 'two places') +
    (off > 0 ? ' further after the decimal point' : ' nearer the decimal point') + ' than the right one, and ' +
    qty(d, sayIdx) + ' is ' + dtext(D(d, sayIdx)) + ', a different amount altogether.');
}

/* =============================================================================
   PRINCIPLE 2 - COMPARING, ORDERING AND ROUNDING
   "Line the points up and compare from the left. A longer decimal is not
    automatically a bigger one."
   ========================================================================== */

/* FORMAT 2a - direct compare, all four the same length (pool 1) */
function gDecCompare() {
  const dp = ri(1, 2);
  const whole = ri(1, 9);
  const fracs = new Set();
  let guard = 0;
  while (fracs.size < 4 && guard++ < 400) fracs.add(ri(1, P10[dp] - 1));
  const vals = [...fracs].map(f => D(whole * P10[dp] + f, dp));
  const wantMax = Math.random() < 0.5;
  let best = vals[0];
  for (const v of vals) if (wantMax ? dcmp(v, best) > 0 : dcmp(v, best) < 0) best = v;
  const opts = shuffle(vals).map(dtext);
  const q = { q: 'Which decimal is the <b>' + (wantMax ? 'greatest' : 'smallest') + '</b>?', extra: '',
    choices: opts, correct: opts.indexOf(dtext(best)),
    explain: 'All four start with ' + qty(whole, 0) + ', so line the decimal points up and compare the tenths next' +
      (dp > 1 ? ', and then the hundredths if the tenths tie' : '') + '. The ' +
      (wantMax ? 'greatest' : 'smallest') + ' is ' + dtext(best) + '.',
    answerText: dtext(best) };
  /* WOUND 2: this generator and gDecCmpMixed stamped NOTHING - not decAuthored,
     not authored, not optionSet - so the lane's "the contract is on, not quietly
     off" was true of 27 of 32 generators, not 29. The right stamp is not a
     distractor list: these four options ARE the numbers being compared, so there
     is no such thing as a padded one. q.optionSet declares exactly that, and it
     is also what exempts a compare item from the magnitude-rank gate - "pick the
     biggest" is not a cheap strategy here, it is the question. */
  q.optionSet = true;
  return q;
}

/* FORMAT 2b - compare with DIFFERENT lengths: the "longer decimal is bigger"
   trap, drawn so the trap actually bites (pool 2).
   q.decCompare tells the harness these options are the numbers being compared,
   not computed answers, so it applies the anti-digit-count rule instead of the
   matching-decimal-places rule. */
function gDecCmpMixed() {
  let vals = [D(6, 1), D(45, 2), D(78, 2), D(518, 3)], wantMax = true, best = D(78, 2), guard = 0, ok = false;
  do {
    guard++;
    wantMax = Math.random() < 0.5;
    const whole = ri(0, 4);
    const dps = shuffle([1, 2, 2, 3]);
    vals = dps.map(dp => D(whole * P10[dp] + ri(dp === 1 ? 1 : P10[dp - 1], P10[dp] - 1), dp));
    best = vals[0];
    for (const v of vals) if (wantMax ? dcmp(v, best) > 0 : dcmp(v, best) < 0) best = v;
    /* the trap: whoever ignores the point and reads the digits as a whole number
       must land on a DIFFERENT option from the true answer */
    let digitBest = vals[0];
    for (const v of vals) {
      const a = Math.abs(v.n), b = Math.abs(digitBest.n);
      if (wantMax ? a > b : a < b) digitBest = v;
    }
    const maxDp = Math.max(...vals.map(v => v.dp)), minDp = Math.min(...vals.map(v => v.dp));
    const uniqLong = vals.filter(v => v.dp === maxDp).length === 1;
    const uniqShort = vals.filter(v => v.dp === minDp).length === 1;
    if (!dallDistinct(vals)) continue;
    if (dsame(digitBest, best)) continue;                               /* the trap must bite */
    if (wantMax && uniqLong && best.dp === maxDp) continue;             /* key must not be the only longest */
    if (!wantMax && uniqShort && best.dp === minDp) continue;           /* key must not be the only shortest */
    if (new Set(vals.map(v => v.dp)).size < 2) continue;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) { vals = [D(6, 1), D(45, 2), D(78, 2), D(518, 3)]; wantMax = true; best = D(78, 2); }
  const pad = v => dtext(D(v.n * P10[3 - v.dp], 3));
  const opts = shuffle(vals).map(dtext);
  const q = { q: 'Which decimal is the <b>' + (wantMax ? 'greatest' : 'smallest') + '</b>?', extra: '',
    choices: opts, correct: opts.indexOf(dtext(best)),
    explain: 'Write them one under the other with the decimal points in line and fill the short ones with zeros: ' +
      vals.slice().sort(dcmp).map(pad).join(', ') + '. Now compare the tenths first, then the hundredths. The ' +
      (wantMax ? 'greatest' : 'smallest') + ' is ' + dtext(best) +
      '. A decimal with more digits after the point is not always the bigger one.',
    answerText: dtext(best) };
  q.decCompare = true;
  q.optionSet = true;      /* WOUND 2: the options ARE the numbers being compared */
  return q;
}

/* FORMAT 2c - ordering a whole list (pool 2). Exactly one option is sorted; the
   three wrong orders are the three wrong beliefs, not random shuffles. */
function gDecOrder() {
  /* The four numbers are built so that TWO of them share a tenths digit and two
     share another. That is what makes the three wrong orders genuinely different
     beliefs: sorting by the digit string, and looking at the tenths only and then
     letting the longer decimal win the tie, both give orders a child really
     produces. Drawn at random the two wrong orders coincide on every draw, which
     is what the first cut of this generator did. */
  let asc = true, guard = 0, ok = false;
  let t1 = 4, t2 = 5, whole = 0;
  let a = D(4, 1), b = D(45, 2), c = D(5, 1), e = D(514, 3);
  do {
    guard++;
    asc = Math.random() < 0.5;
    whole = ri(0, 3);
    t1 = ri(1, 7); t2 = ri(t1 + 1, 8);
    a = D(whole * 10 + t1, 1);
    b = D(whole * 100 + t1 * 10 + ri(1, 9), 2);
    c = D(whole * 10 + t2, 1);
    e = D(whole * 1000 + t2 * 100 + ri(1, 99), 3);
    if (dallDistinct([a, b, c, e])) { ok = true; break; }
  } while (guard < 200);
  if (!ok) { whole = 0; t1 = 4; t2 = 5; a = D(4, 1); b = D(45, 2); c = D(5, 1); e = D(514, 3); asc = true; }
  const vals = [a, b, c, e];
  const join = list => list.map(dtext).join(', ');
  const dir = list => (asc ? list : list.slice().reverse());
  const key = join(dir([a, b, c, e]));                    /* the true order, smallest first */
  const byDigits = join(dir([a, c, b, e]));               /* read the digits as whole numbers */
  const byTenths = join(dir([b, a, e, c]));               /* only the tenths, longer wins the tie */
  const reversed = join(dir([a, b, c, e]).slice().reverse());
  const pad = v => dtext(D(v.n * P10[3 - v.dp], 3));
  return mcText('Which list is in order from the <b>' + (asc ? 'smallest to the greatest' : 'greatest to the smallest') +
    '</b>?', '', key, [byDigits, byTenths, reversed],
    'Fill every number out to three places first: ' + vals.map(pad).join(', ') +
    '. Then compare the tenths, then the hundredths, then the thousandths. In order from the ' +
    (asc ? 'smallest to the greatest' : 'greatest to the smallest') + ' they are ' + key +
    '. Reading the digits as if the point were not there puts them in a different order altogether.');
}

/* FORMAT 2d - error spotting, the mistake NAMED (pool 3, diagnose).
   Misconception: "longer decimal = bigger", because 45 is bigger than 6. */
/* KILL 2 (refutation v2 @ 0157aa1). This generator shipped THREE never-correct
   frames on every draw, one of them the identical sentence every time ("The
   digits after the point should have been counted..."), one of them the free
   "Nothing is wrong" the v2 pass deleted from gDecFracError and left here, and
   one naming a slip the first refutation had already said no child makes
   (0.5 -> 0.05). The key's frame was the key on 100% of draws and a distractor
   on 0%, so "pick the only option that starts with a number" and "pick the only
   one containing which is less than" both scored 40,000 / 40,000. The key was
   also the 2nd longest of four distinct lengths on every single draw.

   THE REBUILD. All four options are now LIVE comparisons in ONE shared frame,
   and the key rotates. Two styles are drawn, each of which writes both numbers
   the same way so the four options are within two characters of one another:

     UNIT   "<A> is <m> hundredths and <B> is <n> hundredths, so <Z> is the
             greater one."          (and the thousandths draw, one place deeper)
     LINED  "Lined up, <A> is written <x> and <B> is written <y>, so <Z> is the
             greater one."

   In both, one of the two quantities is padded correctly or not, and the verdict
   names A or B - four combinations, exactly one true, and the verdict splits 2-2
   so the option naming the true greater number is not free. The key wears three
   different masked frames across draws; no frame is never-correct. */
function gDecCmpError() {
  const who = pick(NAMES);
  let dpA = 2, A = D(43, 2), B = D(5, 1), guard = 0, ok = false;
  do {
    guard++;
    dpA = ri(2, 3);
    const dpB = dpA - 1;                                  /* exactly one place apart, so the
                                                             four options stay the same length */
    A = D(ri(P10[dpA - 1] + 1, P10[dpA] - 1), dpA);
    B = D(ri(P10[dpB - 1] + 1, P10[dpB] - 1), dpB);
    if (A.n % 10 === 0 || B.n % 10 === 0) continue;        /* no trailing zero gives the dp away */
    if (dcmp(A, B) >= 0) continue;                         /* A must really be the SMALLER */
    if (A.n <= B.n) continue;                              /* but its digit string the BIGGER */
    ok = true;
    break;
  } while (guard < 900);
  if (!ok) { dpA = 2; A = D(43, 2); B = D(5, 1); }
  const dpB = dpA - 1;
  const bDeep = D(B.n * 10, dpA);                          /* B padded into A's place - correct */
  const bFlat = D(B.n, dpA);                               /* B's digits pushed one place too deep */
  const lined = Math.random() < 0.4;
  const unit = PLACE_WORD[dpA];
  /* (the number written in A's place for B, the number named as greater) */
  const rows = [[bDeep, B], [bFlat, A], [bDeep, A], [bFlat, B]];
  const say = lined
    ? r => 'Lined up with ' + dtext(A) + ', ' + dtext(B) + ' is written ' + dtext(r[0]) +
           ', so ' + dtext(r[1]) + ' is the greater one.'
    : r => dtext(A) + ' is ' + A.n + ' ' + unit + ' and ' + dtext(B) + ' is ' + r[0].n + ' ' + unit +
           ', so ' + dtext(r[1]) + ' is the greater one.';
  const key = say(rows[0]);
  const wrongs = rows.slice(1).map(say);
  return mcText(who + ' says <b>' + dtext(A) + '</b> is greater than <b>' + dtext(B) +
    '</b>, because ' + A.n + ' is greater than ' + B.n + '. <b>Which of these puts it right?</b>', '',
    key, wrongs,
    'Line the decimal points up and write both to the same length: ' + dtext(A) + ' and ' + dtext(bDeep) +
    '. That is ' + A.n + ' ' + unit + ' against ' + bDeep.n + ' ' + unit + ', so ' + dtext(B) +
    ' is the greater one. Counting digits does not tell you which decimal is bigger: ' + dtext(B) +
    ' is not ' + dtext(bFlat) + '.');
}

/* FORMAT 2d2 - error spotting in a LIST (pool 3, diagnose + order).
   WOUND 4 (refutation 2026-09-15): pool 3 held exactly ONE `compare` generator,
   and buildCarousel round-robins SKILLS, so the whole sixth of pool 3 that belongs
   to comparing landed on gDecCmpError - 2.66 items in a 30-item session, worst
   session 5, the most-served item in the topic by a clear margin, and its two
   masked shapes are one sentence counted twice for name arity. The lane's own
   headline could not see it: same-shape 0.000 measures ADJACENT repeats only.
   This is the second `compare` voice in pool 3. It is a different demand from
   gDecOrder one pool below (there, four candidate lists; here, one list and the
   child has to find the inversion) and a different demand from gDecCmpError
   (there, one comparison diagnosed; here, four, and then a location). */
function gDecOrderError() {
  const who = pick(NAMES);
  let vals = [D(34, 1), D(341, 2), D(38, 1), D(3405, 3), D(36, 1)], swapAt = 1, guard = 0, ok = false;
  do {
    guard++;
    const whole = ri(1, 8);
    const list = [];
    let tries = 0;
    while (list.length < 5 && tries++ < 80) {
      const dp = pick([1, 2, 2, 3]);
      const v = D(whole * P10[dp] + ri(1, P10[dp] - 1), dp);
      if (v.n % 10 === 0) continue;                       /* no trailing zero gives its own dp away */
      if (list.some(k => dsame(k, v))) continue;
      list.push(v);
    }
    if (list.length < 5) continue;
    if (new Set(list.map(v => v.dp)).size < 2) continue;  /* the mixed-length trap must be present */
    const sorted = list.slice().sort(dcmp);
    /* and the digit-string reading must put them in a DIFFERENT order, or the item
       teaches nothing: "read it as a whole number" has to fail on this list. */
    const byDigits = list.slice().sort((x, y) => x.n - y.n);
    if (sorted.every((v, i) => dsame(v, byDigits[i]))) continue;
    /* exactly one adjacent pair is swapped, and the spot is drawn uniformly over
       all four, so "the pair whose second number is the longer" is at chance. */
    swapAt = ri(0, 3);
    vals = sorted.slice();
    const t = vals[swapAt]; vals[swapAt] = vals[swapAt + 1]; vals[swapAt + 1] = t;
    ok = true;
    break;
  } while (guard < 400);
  /* the fallback is the sorted list with the first adjacent pair swapped, so it
     carries exactly one inversion like every drawn one */
  if (!ok) { vals = [D(3405, 3), D(34, 1), D(341, 2), D(36, 1), D(38, 1)]; swapAt = 0; }
  const pairText = i => dtext(vals[i]) + ' and ' + dtext(vals[i + 1]);
  const key = pairText(swapAt);
  const wrongs = [0, 1, 2, 3].filter(i => i !== swapAt).map(pairText);
  const pad = v => dtext(D(v.n * P10[3 - v.dp], 3));
  const sortedNow = vals.slice().sort(dcmp);
  return mcText(who + ' puts these decimals in order <b>from the smallest to the greatest</b> and writes: <b>' +
    vals.map(dtext).join(', ') + '</b>. <b>Which two numbers are the wrong way round?</b>', '',
    key, wrongs,
    'Fill every number out to three places first: ' + sortedNow.map(pad).join(', ') +
    '. Now compare the tenths, then the hundredths, then the thousandths. In order they are ' +
    sortedNow.map(dtext).join(', ') + ', so ' + dtext(vals[swapAt]) + ' and ' + dtext(vals[swapAt + 1]) +
    ' are the pair that have swapped places. A decimal with more digits after the point is not always the bigger one.');
}

/* FORMAT 2e - concept check: which two whole numbers is it between? (pool 1) */
function gDecBetween() {
  let w = 7, d = 4, dp = 1, val = D(74, 1), guard = 0;
  do {
    guard++;
    w = ri(1, 9); dp = ri(1, 2);
    const f = ri(1, P10[dp] - 1);
    val = D(w * P10[dp] + f, dp);
    d = Math.floor(f / P10[dp - 1]);
  } while (guard < 200 && !(d >= 1 && d !== w && d !== w - 1 && d !== w + 1 && w - 1 >= 0));
  const pairText = (a, b) => a + ' and ' + b;
  return mcText('Between which two <b>whole numbers</b> does <b>' + dtext(val) + '</b> lie?', '',
    pairText(w, w + 1), [pairText(w - 1, w), pairText(w + 1, w + 2), pairText(d, d + 1)],
    /* WOUND 1 (refutation v3 @ c9d26fb): this wrote `w + ' whole ones'` raw and
       printed "1 whole ones" on 12.55% of draws. RULE D8 could not see it - the
       plural sits one word to the RIGHT of the numeral - and the rule is widened
       to that pattern in tools/gen-sanity.mjs at the same time. */
    dtext(val) + ' is ' + many(w, 'whole one', 'whole ones') + ' with a bit left over, and the bit left over is less than one whole. ' +
    'So ' + dtext(val) + ' is more than ' + w + ' but less than ' + (w + 1) + ': it lies between ' + w + ' and ' + (w + 1) + '.');
}

/* FORMAT 2f - direct compute, rounding (pool 2). Three named slips: rounded the
   wrong way, looked at the LAST digit instead of the next one, rounded to the
   wrong place. */
function gDecRound() {
  let to = 2, val = D(3268, 3), key = D(327, 2), guard = 0, ok = false, cands = [];
  do {
    guard++;
    to = ri(0, 2);
    /* MOE P4 goes to THREE decimal places, so the number never carries more. */
    const dp = Math.min(3, to + 2);
    val = D(ri(P10[dp] + 1, 9 * P10[dp]), dp);
    const cut = P10[dp - to];
    const base = Math.floor(val.n / cut);
    const d1 = Math.floor((val.n - base * cut) / P10[dp - to - 1]);
    const d2 = val.n % 10;
    key = dround(val, to);
    /* WOUND 1 (refutation v5 @ 8cf212b). A line here rejected any draw whose
       rounding digit and LAST digit sat on the same side of 5, so that "looked at
       the last digit" could not collide with the key and always shipped as a
       distinct slip. It fired on every to = 0 and to = 1 draw - 56.5% of the bank -
       and could not fire at to = 2, where the two digits are the same digit. That
       made the last digit a PERFECT predictor, inverted below and direct above: one
       two-branch rule selected by reading the rounding phrase settled 100.00% of
       draws and was right 100.00% of them, on a bank whose own skill tip is "look at
       ONE digit only - the very next one". The line is gone. The two digits are now
       independent, so at to = 0 and to = 1 the last digit decides nothing better
       than a coin; the candidate list is deduplicated by value and a draw survives
       on any three of five slips, so when the two digits do fall on the same side
       the "last digit" slip simply collides with the key and is dropped, which is
       the right outcome and is also what restores the rounding-place mix to even. */
    if (key.n <= 0) continue;
    /* REGRESSION, found by the v5 trailing-zero work (WOUND 3) and not by any pass:
       `to` was drawn over 0, 1 and 2 and the generator shipped `2 decimal places`
       on 20,000 of 20,000 draws. At to = 0 and to = 1 the "rounded the wrong way"
       slip and the "looked at the LAST digit" slip are THE SAME NUMBER by
       construction - the draw forces the two digits onto opposite sides of 5, so
       both land on the other side of the key - and a flat dallDistinct() over four
       fixed candidates rejected every such draw. Two thirds of MOE 1.5 were
       unreachable and the bank's own scope line said otherwise. The slips are a
       LIST now, deduplicated by value, and a draw survives on any three of them. */
    const bank = [
      D(d1 >= 5 ? key.n - 1 : key.n + 1, to),                /* rounded the wrong way */
      dp > to + 1 ? D(base + (d2 >= 5 ? 1 : 0), to) : null,  /* looked at the LAST digit */
      dround(val, to === 0 ? 1 : to - 1),                    /* rounded to the place next door */
      dround(val, Math.min(3, to + 1)),                      /* rounded one place too many */
      val                                                    /* did not round at all */
    ];
    cands = [];
    for (const c of bank) {
      if (!c || c.n <= 0 || dsame(c, key) || cands.some(k => dsame(k, c))) continue;
      cands.push(c);
    }
    if (cands.length < 3) continue;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) { to = 1; val = D(3268, 3); key = D(33, 1);
             cands = [D(32, 1), D(3, 0), D(327, 2), val]; }
  return mcDec('Round <b>' + dtext(val) + '</b> to <b>' + roundPhrase(to) + '</b>.', '',
    key, cands, '',
    'Look only at the digit just after the ' + (to === 0 ? 'ones' : PLACE_WORD[to]) + ' place: it is ' +
    d1Of(val, to) + '. Since ' + d1Of(val, to) + ' is ' +
    (d1Of(val, to) >= 5 ? '5 or more, round up' : '4 or less, round down') + ', ' + dtext(val) +
    ' rounded to ' + roundPhrase(to) + ' is ' + dtext(key) + '. The digits further along do not change the decision.');
}
function d1Of(val, to) {
  const cut = P10[val.dp - to];
  const base = Math.floor(val.n / cut);
  return Math.floor((val.n - base * cut) / P10[val.dp - to - 1]);
}

/* FORMAT 2g - working backwards: which number could it have been? (pool 3) */
function gDecRoundBack() {
  const who = pick(NAMES);
  let to = 1, key = D(428, 2), wrongs = [D(435, 2), D(424, 2), D(437, 2)], guard = 0, r = 43, ok = false;
  do {
    guard++;
    to = ri(0, 1);
    const dp = to + 1;
    r = ri(P10[to] + 1, 9 * P10[to]);              /* the rounded answer, as a scaled integer at dp `to` */
    const lo = r * 10 - 5, hi = r * 10 + 5;        /* the half-open window [lo, hi) at dp `to`+1 */
    const inside = [];
    for (let h = lo + 1; h < hi; h++) if (h % 10 !== 0) inside.push(h);   /* never the exact half */
    /* WOUND 1: the four candidates were two above the window and two below it, so
       three of them shipped and the key could only ever be the second or third
       biggest (62.3% third). Three on each side lets the picker put the key
       anywhere. */
    const outside = [hi, hi + ri(1, 4), hi + ri(5, 9), lo - 1, lo - ri(2, 5), lo - ri(6, 12)]
      .filter(h => h > 0 && h % 10 !== 0 && (h < lo || h >= hi));
    if (!inside.length || outside.length < 6) continue;
    key = D(pick(inside), dp);
    const picked = outside.map(h => D(h, dp));
    if (!dallDistinct([key].concat(picked))) continue;
    if (picked.some(p => dsame(dround(p, to), D(r, to)))) continue;     /* exactly one right answer */
    wrongs = picked;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) { to = 1; r = 43; key = D(428, 2); wrongs = [D(435, 2), D(424, 2), D(437, 2)]; }
  const target = D(r, to);
  return mcDec(who + ' rounds a number to <b>' + roundPhrase(to) + '</b> and gets <b>' + dtext(target) +
    '</b>. <b>Which of these could the number have been?</b>', '',
    key, wrongs, '',
    'A number rounds to ' + dtext(target) + ' only if it sits from ' + dtext(D(r * 10 - 5, to + 1)) +
    ' up to (but not including) ' + dtext(D(r * 10 + 5, to + 1)) + '. Of these four, only ' + dtext(key) +
    ' is inside that stretch, so only ' + dtext(key) + ' rounds to ' + dtext(target) + '.');
}

/* FORMAT 2h - error spotting, the mistake NAMED (pool 3, diagnose).
   Misconception: rounding UP on a 4 (or down on a 5).

   THE KILL (refutation 2026-09-15). The first cut gave exactly TWO of its four
   options a "..., so the answer is N" tail - the key, and the direction
   distractor, whose N was the very number the stem had already declared wrong.
   The child's move was never rounding: it was "only two of these carry an
   answer, and one of them is the answer the question just called wrong."
   20,000 of 20,000 draws, structural, and the lane's own cheap-strategy scan
   could not see it because it measured string length and decimal places. The
   direction word in that distractor contradicted the stem on every draw as well
   ("Priya rounded down" of a child who plainly rounded up), and the third
   distractor described looking at "every digit after the ones place" of a number
   that had exactly one.

   THE KILL, SECOND PASS (refutation v2 @ 0157aa1). The mechanism above is gone
   and stayed gone - no option carries an answer, nothing repeats the declared
   wrong number - but the tell moved from the TAILS to the FRAMES. The key was
   the only option naming a direction ("rounded up instead of down"), the only
   one containing "but", the only one outside three never-correct frames, and the
   3rd longest of the four on 100% of draws. "Pick the only option with up or
   down in it" scored 20,000 / 20,000 on each of two seeds, and RULE D6 could not
   see it because the tails split 2-1-1, which D6 passes by design.

   THE REBUILD. All four options are the SAME sentence, differing only in which
   digit of the printed number they say was used:

       "<name> rounded <dir> after looking at the <first|second|third|fourth>
        digit, <d>."

   `dir` is the direction the child ACTUALLY went, read off the stem's own claim,
   so it is the same word in all four options and discriminates nothing. There is
   no "but", no "instead of", no connective that one option wears and the others
   do not. The ordinals are 5 or 6 characters, the digits are one, so the four
   options are within ONE character of each other and no length rank can be read.

   The mathematics: the number always has exactly FOUR digits, the rounding place
   is drawn so the digit that matters sits at position 1, 2 or 3 of those four,
   and the draw is rejected unless EXACTLY ONE of the other three digits would
   have sent the number the way the child went. That digit is the key, and it
   rotates over the first, second, third and fourth positions across draws - so
   the key's frame is not a constant and "pick the odd frame out" buys nothing.

   THE KILL, THIRD PASS (refutation v3 @ c9d26fb) - and it is not a tell. The
   rebuild above had TWO defensible answers on 40,000 of 40,000 draws. "Which
   digit did X look at?" asks a question the stem cannot settle: the keyed digit
   is the unique OTHER digit that justifies the direction under a correctly
   applied rule, but the option naming the ROUNDING digit is consistent with
   every quantitative claim the stem makes, because a child who reads the right
   digit and applies "4 or less rounds up" produces the claimed answer exactly.
   That reading is the commonest P4 rounding error, this file's own skill tip
   warns about it, and it was this generator's own KEY at 441e684 and 0157aa1.
   Two free settles rode with it: the direction word was printed in all four
   options while exactly one of the four digits sat on that side of 5, so "pick
   the digit that agrees with the direction" was unique and right on 100.00% of
   draws with the stem never read, and "pick the smallest of the four digits"
   won 60.56%.

   THE REBUILD, and why one clause in the stem is not enough. Pinning the method
   ("X used the 5-or-more rule correctly, but on the wrong digit") does make the
   item markable - but it CANNOT move either free settle, and the reason is
   structural: under a correctly applied rule the key is the digit that agrees
   with the direction, the rounding digit disagrees with it by construction, and
   the other two must disagree or there would be two defensible answers again.
   The key is therefore ALWAYS the one digit alone on its side of 5, whatever the
   stem says. So the stem pins the method AND the question changes:

     stem:    X rounds 1.263 to 1 decimal place. X looks at the 3, says that 3 is
              4 or less, rounds down, and gives the answer 1.2.
              Which digit should X have looked at, and what is the correct answer?
     options: X should have looked at the digit <6 | 2>, and the answer is <1.3 | 1>.

   The four options are a 2 x 2 GRID over the right digit (the one rounding is
   allowed to look at) and the right answer (the number correctly rounded), and
   exactly one cell is right in both. Each digit is printed twice and each answer
   is printed twice, so EVERY token sits in exactly two options: no unique token,
   no unique length, no digit alone on its side of 5, and no value rule can pick
   a single option out.

   THE FOURTH PASS'S KILL, and the v5 draw that closes it. The grid was lexically
   perfect and still settled on 79.14% of draws, because its TWO AXES WERE BOTH
   READABLE OFF THE STEM and one of them was free:

     R1  the stem said "to the nearest whole number" and the offered wrong answer
         was the number rounded to the place NEXT DOOR, so it carried a different
         number of decimal places. "The answer is written to the place the stem
         names" deleted two options - never the key - on 100.00% of draws, with no
         arithmetic at all. That half of the grid was a FORMAT CONVENTION.
     R3  the stem printed the digit the child read, and the offered wrong digit
         was drawn from a different set than the right one, so on 79.14% of draws
         exactly one of the two offered digits sat immediately BESIDE the stem's
         digit inside the numeral - and it was always the right one. R1 AND R3
         together settled 79.14% of draws and were right every single time.

   Both are closed by the draw, not by a gate:

     (a) THE ANSWER AXIS IS NOW ARITHMETIC. The two answers are the number rounded
         the right way and the number rounded THE WRONG WAY - base and base + 1 at
         the place the stem names - so BOTH are written to exactly the decimal
         places the rounding phrase implies and neither can be deleted by reading
         it. Telling them apart is the 5-or-more rule itself, which is the lesson.
     (b) THE STEM NAMES A PLACE, NOT A DIGIT. "X looks at the hundredths digit"
         prints no digit for an option to stand next to, so the adjacency route is
         structurally dead: a child who wants to use position has to FIND the
         named place in the numeral first, which is the other half of the lesson.
         It also means no option can be refuted by matching a printed digit.
     (c) THE TWO OFFERED DIGITS ARE DRAWN ON INDEPENDENT SIDES OF 5, each 50/50,
         so "pick the digit that is 5 or more", "pick the smaller digit" and every
         other side-of-5 rule is a coin flip rather than a tell.

   Self-consistency is a deliberate two-two split: the option pairing the right
   digit with the right answer and the option pairing the other digit with what
   THAT digit would give are both internally consistent, so "pick the option that
   agrees with itself" leaves two and never settles.

   The declared residual is a 50% floor whose free half is the lesson: a child who
   can round but cannot name the place gets the answer and guesses the digit, and
   a child who can name the place but cannot round gets the digit and guesses the
   answer. Neither half is a format convention, and no rule that reads only the
   printed shapes beats a coin. */
function gDecRoundError() {
  const who = pick(NAMES);
  let to = 1, wlen = 1, digits = [1, 2, 6, 3], val = D(1263, 3);
  let ci = 2, xi = 3, yi = 1, truth = D(13, 1), wrong = D(12, 1), guard = 0, ok = false;
  do {
    guard++;
    wlen = ri(1, 2);                                   /* digits before the point */
    const dp = 4 - wlen;                               /* ALWAYS four digits in the number */
    to = ri(0, dp - 1);                                /* whole number, 1 dp or 2 dp */
    ci = wlen + to;                                    /* the digit rounding must look at */
    if (ci > 3) continue;                              /* it has to be one of the four */
    /* the place the child read instead: the one being rounded TO, or one further
       along. Nobody rounds off the tens digit, so those draws are not offered. */
    const xs = [];
    for (let i = 0; i < 4; i++) if (i !== ci && (i === ci - 1 || i > ci)) xs.push(i);
    if (!xs.length) continue;
    xi = pick(xs);
    /* the offered wrong digit: the digit IN the place being rounded to, or the
       last digit of the number - the two digits a child actually looks at by
       mistake, and the two this file's own explanations warn about. It is never
       the digit sitting in the place the stem names, or the stem would refute one
       option for free. */
    let ys = [ci - 1, 3].filter(i => i >= 0 && i !== ci && i !== xi);
    if (!ys.length) ys = [0, 1, 2, 3].filter(i => i !== ci && i !== xi);
    if (!ys.length) continue;
    yi = pick(ys);
    /* (c): the right digit and the offered wrong digit each take their side of 5
       on an independent coin, so no side-of-5 reading of the option list beats
       chance. The other two digits are whatever is left. */
    const loP = shuffle([1, 2, 3, 4]), hiP = shuffle([5, 6, 7, 8, 9]);
    const take = s => (s ? hiP : loP).pop();
    digits = [0, 0, 0, 0];
    digits[ci] = take(Math.random() < 0.5);
    digits[yi] = take(Math.random() < 0.5);
    const restP = shuffle(loP.concat(hiP));
    for (let i = 0; i < 4; i++) if (!digits[i]) digits[i] = restP.pop();
    const dc = digits[ci];
    val = D(digits.reduce((a, d) => a * 10 + d, 0), dp);
    const cut = P10[dp - to], base = Math.floor(val.n / cut);
    /* (a): both answers live at the place the stem names, one column apart - the
       number rounded correctly and the number rounded the wrong way. */
    truth = D(base + (dc >= 5 ? 1 : 0), to);
    wrong = D(base + (dc >= 5 ? 0 : 1), to);
    if (truth.n <= 0 || wrong.n <= 0 || dsame(truth, wrong)) continue;
    /* no trailing zero anywhere: "1.20" is not how a child writes an answer */
    if (to > 0 && (truth.n % 10 === 0 || wrong.n % 10 === 0)) continue;
    /* a whole-number answer that reads as one of the two printed digits would be
       ambiguous, so those draws go (the same guard RULE D5 used to need) */
    const shown = [digits[ci], digits[yi]];
    if (truth.dp === 0 && shown.indexOf(truth.n) !== -1) continue;
    if (wrong.dp === 0 && shown.indexOf(wrong.n) !== -1) continue;
    ok = true;
    break;
  } while (guard < 400);
  /* the fallback obeys every rule the draw does: 1.263 to 1 decimal place, with
     the child reading the thousandths place instead of the hundredths; the offered
     wrong digit is the tenths 2 and the two answers are 1.3 and 1.2. */
  if (!ok) { wlen = 1; to = 1; ci = 2; xi = 3; yi = 1; digits = [1, 2, 6, 3]; val = D(1263, 3);
             truth = D(13, 1); wrong = D(12, 1); }
  const dc = digits[ci], dy = digits[yi];
  const placeOf = i => (i >= wlen ? PLACE_WORD[i - wlen + 1] : (i === wlen - 1 ? 'ones' : 'tens'));
  const opt = (d, r) => who + ' should have looked at the digit ' + d + ', and the answer is ' + dtext(r) + '.';
  return mcText(who + ' rounds <b>' + dtext(val) + '</b> to <b>' + roundPhrase(to) + '</b>. ' + who +
    ' looks at the <b>' + placeOf(xi) + '</b> digit. <b>Which digit should ' + who +
    ' have looked at, and what is the correct answer?</b>', '',
    opt(dc, truth), [opt(dc, wrong), opt(dy, truth), opt(dy, wrong)],
    'Rounding to ' + roundPhrase(to) + ' looks at one digit only: the next one along, which is the ' +
    placeOf(ci) + ' digit of ' + dtext(val) + ', ' + dc + '. ' + who + ' looked at the ' + placeOf(xi) +
    ' digit instead, and the other digits, before it and after it, do not get a vote. ' +
    dc + ' is ' + (dc >= 5 ? '5 or more, so round up' : '4 or less, so round down') + ', so ' + dtext(val) +
    ' rounded to ' + roundPhrase(to) + ' is ' + dtext(truth) + '.');
}

/* FORMAT 2i - two-step word problem, SG wet market (pool 3): add, THEN round. */
function gDecRoundSum() {
  const who = pick(NAMES);
  let a = D(267, 2), b = D(18, 1), total = D(447, 2), key = 4, guard = 0, ok = false;
  let doubleRound = 5, chopped = 3, subtracted = 1, twiceA = 5, twiceB = 4, twiceBoth = 9;
  do {
    guard++;
    /* WOUND 4 (refutation v2 @ 0157aa1). a was drawn from [1.10, 4.80] and b from
       [1.1, 3.9] with the fractional part of the total forced into [0.45, 0.49],
       which collapsed the KEY to four values - 5 kg on 48.7% of draws, 4 kg on
       23.0%, 6 kg on 18.8%, 7 kg on 9.5%. "Always answer 5 kg" beat the
       magnitude-rank gate's own 45% ceiling on the axis that gate cannot see: it
       measures where the key sits among its OPTIONS, never how often it is the
       same NUMBER. Both ranges are widened so the total spreads over a dozen
       kilograms instead of four, and the modal-key ceiling below gates it. */
    a = D(ri(110, 890), 2);
    b = D(ri(11, 69), 1);
    total = D(a.n + b.n * 10, 2);
    const frac = total.n % 100;
    /* tenths digit 4, hundredths 5 or more: rounding ONCE gives the floor, while
       rounding to 1 dp first and then again gives one more. That is the item. */
    if (frac < 45 || frac > 49) continue;
    if (a.n % 100 + (b.n % 10) * 10 < 100) continue;       /* the cents must carry, so "chop both" is key - 1 */
    key = Math.floor(total.n / 100);
    doubleRound = key + 1;                                  /* 4.47 -> 4.5 -> 5 */
    chopped = Math.floor(a.n / 100) + Math.floor(b.n / 10); /* dropped both remainders before adding */
    subtracted = dround(D(Math.abs(a.n - b.n * 10), 2), 0).n;
    /* WOUND 1: chopped and subtracted are always below the key and doubleRound is
       always one above it, so "second biggest" answered this on every draw. The two
       "weighed one of them twice" slips STRADDLE the key - whichever fruit is the
       heavier, doubling it overshoots and doubling the other undershoots - so the
       picker always has at least two named candidates on each side. */
    twiceA = dround(D(a.n * 2, 2), 0).n;
    twiceB = dround(D(b.n * 20, 2), 0).n;
    twiceBoth = dround(D(total.n * 2, 2), 0).n;             /* weighed the pair twice */
    if (new Set([key, doubleRound, chopped, subtracted, twiceA, twiceB, twiceBoth]).size !== 7) continue;
    if (key < 2 || chopped < 1 || subtracted < 1 || twiceA < 1 || twiceB < 1) continue;
    ok = true;
    break;
    /* the ceiling is high because the draw is tight: the fractional part has to
       land in [0.45, 0.49] AND the cents have to carry AND seven named values have
       to differ, which is about 1.2% of rolls. At 400 the declared fallback shipped
       on 0.85% of draws - one identical item eight times as often as any other
       stem in the generator. At 1200 it is unreachable in practice. */
  } while (guard < 1200);
  if (!ok) { a = D(267, 2); b = D(18, 1); total = D(447, 2); key = 4; doubleRound = 5; chopped = 3; subtracted = 1; twiceA = 5; twiceB = 4; twiceBoth = 9; }
  const fruit = pick([['papaya', 'pineapple'], ['bag of rice', 'bag of onions'], ['bunch of bananas', 'watermelon']]);
  const wrongs = rankInts(key, [doubleRound, chopped, subtracted, twiceA, twiceB, twiceBoth]);
  /* WOUND 2 (refutation v5 @ 8cf212b): the last sentence named `doubleRound` by
     number, and `doubleRound` is one of six candidates of which `rankInts` ships
     three - so on 50.0% of draws the child re-read the explanation, hunted the row
     for the trap it named and did not find it, with a lookalike one kilogram away
     sitting on the row every one of those times. This is the v4 WOUND 2 class,
     fixed in gDecBuild at v5 and left standing in the only other generator that
     does the same thing. Whichever named slip actually SHIPPED is the one the
     explanation calls out now, each with its own diagnosis, so the sentence always
     points at a number the child can see. */
  const named = [
    [doubleRound, 'rounding ' + dtext(total) + ' to 1 decimal place first and then again gives '],
    [chopped, 'dropping the bit after the point on each mass before adding gives '],
    [twiceBoth, 'weighing the pair twice over gives '],
    [twiceA, 'weighing the ' + fruit[0] + ' twice and forgetting the ' + fruit[1] + ' gives '],
    [twiceB, 'weighing the ' + fruit[1] + ' twice and forgetting the ' + fruit[0] + ' gives '],
    [subtracted, 'taking one mass away from the other gives ']
  ];
  const q = finishNum('At the wet market ' + who + ' buys a ' + fruit[0] + ' weighing <b>' + dtext(a) +
    ' kg</b> and a ' + fruit[1] + ' weighing <b>' + dtext(b) + ' kg</b>. <b>Rounded to the nearest kilogram</b>, ' +
    'what is the total mass of the two together?', '',
    key, wrongs, 'kg', '');
  const on = slipFor(q, named, v => v + ' kg') || named[0];
  q.explain = 'Step 1: add the two masses. ' + dtext(a) + ' + ' + dtext(b) + ' = ' + dtext(total) +
    ' kg. Step 2: round ' + dtext(total) + ' to the nearest whole number. The digit just after the ones place is ' +
    Math.floor((total.n % 100) / 10) + ', which is 4 or less, so it rounds down to ' + key +
    ' kg. Add first and round ONCE: ' + on[1] + on[0] + ' kg, which is not the same thing.';
  q.decAuthored = wrongs.map(v => v + ' kg');
  q.authored = wrongs.slice();
  return q;
}

/* =============================================================================
   PRINCIPLE 3 - DECIMALS AND FRACTIONS ARE ONE NUMBER WRITTEN TWO WAYS
   ========================================================================== */

/* FORMAT 3a - direct: a fraction over 10, 100 or 1000 as a decimal (pool 1) */
function gFracToDec() {
  let den = 10, dp = 1, n = 3, key = D(3, 1), guard = 0;
  let shallow = D(30, 1), complement = D(7, 1), tacked = D(13, 1);
  do {
    guard++;
    dp = ri(1, 3); den = P10[dp];
    /* WOUND 1: at three places the numerator now always has three digits, so the
       "dropped a digit" slips below the key exist on every draw. 7/1000 was a fair
       item but it left the key with nothing named beneath it. */
    n = ri(dp === 3 ? 101 : 1, den - 1);
    key = D(n, dp);
    shallow = dnat(D(n * 10, dp));                 /* read hundredths as tenths */
    complement = D(den - n, dp);                   /* took it away from the whole */
    tacked = D(den + n, dp);                       /* wrote the denominator and the numerator side by side */
    /* n must not end in 0, or the key prints a trailing zero ("0.540" for 540/1000)
       and so does every distractor built from it. */
  } while (guard < 300 && !(n % 10 !== 0 && dallDistinct([key, shallow, complement, tacked])));
  /* WOUND 1: shallow and tacked are above the key on every draw and complement is
     usually above it too, so the key was the smallest or the third biggest and
     never anything else. The point-one-column-out slips and the dropped digits are
     the named candidates underneath it. */
  const deeper1 = pRight(key);
  const deeper2 = dp + 2 <= 3 ? D(n, dp + 2) : null;
  const dropLast = n >= 10 ? D(Math.floor(n / 10), dp) : null;
  const dropFirst = dp === 3 && n % 100 !== 0 ? D(n % 100, dp) : null;
  return mcDec('Write ' + fr(n, den) + ' as a decimal.', '',
    key, [shallow, complement, tacked, deeper1, deeper2, dropLast, dropFirst], '',
    n + ' out of ' + den + ' means ' + qty(n, dp) + '. The ' + PLACE_WORD[dp] +
    ' place is number ' + dp + ' after the decimal point, so ' + qty(n, dp) +
    ' is written ' + dtext(key) + '.');
}

/* FORMAT 3b - the same idea as a PICTURE (pool 1). The bar is a q.figure spec;
   the oracle counts the shaded segments off the render, not off this function. */
function gDecBar() {
  const parts = 10;
  /* 5 shaded is excluded on purpose: the "counted the unshaded parts" distractor is
     10 - filled, which at exactly half IS the key, and the item would then ship a
     padded distractor instead of a named one. */
  const filled = pick([1, 2, 3, 4, 6, 7, 8, 9]);
  const key = D(filled, 1);
  const rest = D(parts - filled, 1);          /* counted the unshaded parts */
  const tooDeep = pRight(key);                /* the point one column too far right */
  const deeper = D(filled, 3);                /* and two columns, "thousandths of one" */
  const noPoint = pLeft(key);                 /* no point at all */
  const restNoPoint = D(parts - filled, 0);   /* both slips at once */
  const q = mcDec('Each strip below is <b>one whole</b> cut into <b>10 equal parts</b>. ' +
    '<b>What decimal does the shaded part show?</b>', '',
    key, [rest, tooDeep, noPoint, restNoPoint, deeper], '',
    /* WOUND 5: this sentence printed "1 parts are shaded" on 12.8% of draws. */
    'The whole is cut into 10 equal parts, so each part is one tenth. ' + many(filled, 'part is', 'parts are') +
    ' shaded, which is ' + qty(filled, 1) + ', and ' + qty(filled, 1) + ' is written ' + dtext(key) + '.');
  return fig(q, { type: 'fractionBar', parts: parts, filled: filled });
}

/* FORMAT 3c - inverse: a decimal written as a fraction (pool 2).
   The numerator is kept coprime with the denominator so the simplest form is the
   only form, and no two options can ever be the same number written two ways. */
function gDecToFrac() {
  let dp = 1, den = 10, n = 3, guard = 0;
  do {
    guard++;
    dp = ri(1, 2); den = P10[dp];
    n = dp === 1 ? pick([1, 3, 7, 9]) : ri(11, 99);
  } while (guard < 300 && !(gcd(n, den) === 1 &&
           (dp === 1 || (n % 10 !== Math.floor(n / 10) &&
            gcd(Number(String(n).split('').reverse().join('')), 100) === 1))));
  const val = D(n, dp);
  const revDigits = Number(String(n).split('').reverse().join(''));
  /* WOUND 4 (refutation v4 @ 7ec7919): at one place the third candidate was
     [n, 11], and a fraction of a decimal can never have a denominator of 11 - "the
     denominator has to divide 10 or 100" deleted it by inspection, and composed
     with "and it cannot be deeper than the number is" that left the key against one
     other option on 48.0% of draws. The replacement is the part-whole slip this
     file already uses in gDecMoneyFrac: the whole counted in FIVE parts instead of
     ten. Its denominator divides 100, it is no deeper than the stem, and it is in
     lowest terms, so neither rule touches it. */
  const fifths = n < 5 ? [n, 5] : [10 - n, 5];
  const cands = [[n, den * 10], [den - n, den], dp === 1 ? fifths : [revDigits, den]];
  const q = finishFrac('Write <b>' + dtext(val) + '</b> as a fraction in its <b>simplest form</b>.', '',
    [n, den], cands,
    dtext(val) + ' is ' + qty(n, dp) + ', and ' + PLACE_WORD[dp] + ' go over ' + den +
    '. So ' + dtext(val) + ' is ' + n + ' over ' + den + ', and because ' + n + ' and ' + den +
    ' share no common factor that is already the simplest form.', 4);
  /* the fraction half of the named-distractor contract (WOUND 2): every shipped
     option must be one of these three, so buildFracChoices can never pad here. */
  q.fracAuthored = cands;
  return q;
}

/* FORMAT 3d - simple equivalents: a denominator that divides into 10 or 100 (pool 2) */
const EQUIV_DENS = [4, 5, 20, 25, 50];
function gFracEquivDec() {
  let den = 5, n = 3, key = D(6, 1), guard = 0;
  let asTenths = D(3, 1), denAsDec = D(5, 1), rest = D(4, 1), over = 10;
  do {
    guard++;
    den = pick(EQUIV_DENS);
    n = ri(1, den - 1);
    over = (10 % den === 0) ? 10 : 100;
    const mult = over / den;
    key = dnat(D(n * mult, over === 10 ? 1 : 2));
    asTenths = D(n, 1);                                     /* wrote the numerator after the point */
    denAsDec = dnat(D(den, String(den).length));            /* wrote the denominator after the point */
    rest = dnat(D((den - n) * mult, over === 10 ? 1 : 2));  /* found the other part of the whole */
  } while (guard < 400 && !dallDistinct([key, asTenths, denAsDec, rest]));
  return mcDec('Write ' + fr(n, den) + ' as a decimal.', '',
    key, [asTenths, denAsDec, rest], '',
    den + ' goes into ' + over + ' exactly ' + (over / den) + ' times, so multiply the top and the bottom by ' +
    (over / den) + ': ' + n + ' over ' + den + ' is the same as ' + (n * over / den) + ' over ' + over +
    '. ' + qty(n * over / den, over === 10 ? 1 : 2) + ' is written ' + dtext(key) + '.');
}

/* FORMAT 3e - error spotting, the mistake NAMED (pool 3, diagnose).
   Misconception: "0.5 of a dollar is 5 cents". */
function gDecFracError() {
  const who = pick(NAMES);
  const tenthsShape = Math.random() < 0.5;
  /* 1 would read "1 tenths"; 5 is dropped on the tenths shape because 50 cents is
     then both the true value AND the rest of the dollar. */
  const d = pick(tenthsShape ? [2, 3, 4, 6, 7, 8, 9] : [2, 3, 4, 5, 6, 7, 8, 9]);
  const val = tenthsShape ? D(d, 1) : D(d, 2);
  const place = tenthsShape ? 1 : 2;
  const trueC = tenthsShape ? 10 : 1;                  /* cents in one of that place */
  const trueCents = d * trueC;
  const claimCents = tenthsShape ? d : d * 10;         /* the digit read at the wrong place */
  /* WOUND 3 (refutation v2 @ 0157aa1). Two of the four frames - "One whole dollar
     is 100 cents..." and "A dollar is 100 cents and this is the part that is
     left..." - were the key on 0 / 20,000 draws, so "neither the longest nor the
     shortest" was a coin flip that never deleted the key. All four options now
     wear ONE frame and differ only in what a single place of a dollar is worth
     and what that makes of the whole amount: three live beliefs about the worth
     of the place (a dollar, a tenth, a hundredth) and one that gets the worth
     right and adds instead of multiplying. Every amount is written as money, so
     all four options are EXACTLY the same length and no length rank exists. The
     clause order is drawn, so the key does not wear the same sentence every
     time. */
  const rows = [[trueC, trueCents], [100, d * 100], [trueC === 10 ? 1 : 10, d * (trueC === 10 ? 1 : 10)],
                [trueC, trueC + d]];
  const headFirst = Math.random() < 0.5;
  const say = r => headFirst
    ? 'A ' + PLACE_ONE[place] + ' of a dollar is ' + money(r[0]) + ', and ' + dtext(val) + ' is ' +
      qty(d, place) + ', so that is ' + money(r[1]) + '.'
    : dtext(val) + ' is ' + qty(d, place) + ', and a ' + PLACE_ONE[place] + ' of a dollar is ' +
      money(r[0]) + ', so that is ' + money(r[1]) + '.';
  const key = say(rows[0]);
  const wrongs = rows.slice(1).map(say);
  return mcText(who + ' says that <b>' + dtext(val) + ' of a dollar</b> is <b>' + money(claimCents) +
    '</b>. <b>Which of these puts it right?</b>', '', key, wrongs,
    'One dollar is 100 cents, so one tenth of a dollar is 10 cents and one hundredth of a dollar is 1 cent. ' +
    dtext(val) + ' is ' + qty(d, place) + ', and each one is worth ' + money(trueC) + ', so ' + dtext(val) +
    ' of a dollar is ' + d + ' × ' + money(trueC) + ' = ' + money(trueCents) + '. ' + money(claimCents) +
    ' is ' + many(claimCents, 'cent', 'cents') + ', a different amount altogether.');
}

/* FORMAT 3f - two-step word problem, SG money (pool 3): cents over 100, then
   simplify. The decimal is printed alongside so the two spellings sit together. */
const CENT_PRICES = [5, 15, 20, 25, 40, 45, 50, 60, 75, 80];
function gDecMoneyFrac() {
  const cents = pick(CENT_PRICES);
  const g = gcd(cents, 100);
  const n = cents / g, den = 100 / g;
  const item = pick(['a packet of sweets', 'an eraser', 'a pencil sharpener', 'a sticker sheet', 'a paper clip box']);
  const red = (a, b) => { const g2 = gcd(a, b); return [a / g2, b / g2]; };
  /* WOUND 2 (refutation 2026-09-15). At 50 cents - one of the ten CENT_PRICES, so
     10.03% of draws - the first candidate `red(100 - cents, 100)` IS the key:
     50/100 and 50/100 both reduce to 1/2. buildFracChoices dropped it as a
     duplicate, ran out of candidates and PADDED with [correct[0] + n,
     correct[1] + n] = 2/3, a denominator that cannot divide 100 and a slip no
     child makes. Nothing caught it: this generator stamped no contract at all,
     so decGates rule D4 never ran, and the shared q.authored check cannot read
     fractions. There are now five named candidates, any that collide with the key
     are dropped HERE rather than inside the shared kit, and q.fracAuthored
     asserts to the harness that every shipped option is one of them. */
  const raw = [red(100 - cents, 100),                    /* the rest of the dollar */
               red(cents, 1000),                         /* one place too far */
               red(cents + 5, 100),                      /* misread the price by five cents */
               red(Math.max(cents - 5, 1), 100),         /* and the other way */
               red(cents, 200)];                         /* halved the whole instead of the part */
  const cands = [];
  for (const c of raw) {
    if (c[0] <= 0 || c[1] <= 0 || c[0] > c[1]) continue;
    if (eq(c[0], c[1], n, den)) continue;                /* never the key wearing another face */
    if (cands.some(k => eq(k[0], k[1], c[0], c[1]))) continue;
    cands.push(c);
  }
  const q = finishFrac('At the school bookshop ' + item + ' costs <b>' + cents + ' cents</b>, which is written <b>' +
    money(cents) + '</b>. <b>What fraction of one dollar is that, in its simplest form?</b>', '',
    [n, den], cands,
    'Step 1: one dollar is 100 cents, so ' + cents + ' cents is ' + cents + ' out of 100, or ' + cents +
    ' over 100 - the same as the two hundredths digits in ' + money(cents) + '. Step 2: ' + cents + ' and 100 both divide by ' +
    g + ', so ' + cents + ' over 100 simplifies to ' + n + ' over ' + den + '.', 4);
  q.fracAuthored = cands;
  return q;
}

/* =============================================================================
   PRINCIPLE 4 - OPERATIONS IN MONEY AND MEASUREMENT CONTEXTS
   ========================================================================== */

/* FORMAT 4a - direct compute, add or subtract, both numbers the same length
   (pool 1). Named slips: dropped the carry / borrow, did the other operation,
   carried when there was nothing to carry. */
function gDecAddSub() {
  const dp = ri(1, 2);
  const scale = P10[dp];
  const addMode = Math.random() < 0.5;
  let a = 0, b = 0, key = 0, noCarry = 0, other = 0, overCarry = 0, rounded = 0, guard = 0;
  do {
    guard++;
    if (addMode) {
      a = ri(scale + 1, 6 * scale); b = ri(scale + 1, 3 * scale);
      key = a + b;
      noCarry = key - scale;                       /* wrote the carried ten down and lost it */
      other = Math.abs(a - b);                     /* subtracted instead */
      overCarry = key + scale;                     /* carried where there was nothing to carry */
    } else {
      a = ri(3 * scale, 9 * scale); b = ri(scale + 1, a - scale);
      key = a - b;
      noCarry = digitwiseDiff(a, b, dp);           /* took the smaller digit from the larger in each column */
      other = a + b;                               /* added instead */
      overCarry = key + scale;
    }
    /* WOUND 3 (refutation v3 @ c9d26fb): the key was never the SMALLEST option on
       an add draw and never the LARGEST on a subtract draw, 100% of draws - one
       free elimination out of four, for ever, on the bank a struggling child sees
       most. MAGNITUDE-RANK passed it because it measures rank SHARES and is blind
       to a rank that is structurally empty: the picker can only put the key at the
       top when three named candidates sit below it, and the subtract branch only
       ever had two (the borrow taken twice, and the point one column right).
       "Rounded the second number up to a whole number first" is the third, and it
       lands on the needed side of the key on BOTH branches by construction. */
    rounded = addMode ? a + Math.ceil(b / scale) * scale : a - Math.ceil(b / scale) * scale;
  /* REGRESSION, refutation v2 @ 0157aa1. The W1 candidate widening added
     `key - scale` to this Set and raised the required size to 5 - but in ADD mode
     `noCarry` IS `key - scale`, so the Set could never hold more than four
     members and `size === 5` was never true. The do-while ran to its 300-iteration
     ceiling on 100% of add draws and shipped whatever the last roll produced, with
     every other clause in the guard - no trailing-zero key, no trailing-zero
     operand, `other > 0` (which is what stops the two operands being identical) -
     silently unenforced. Trailing-zero keys went from 0.000% to 9.9%, operands
     ending in 0 to 19.1%, identical operands to 1.1%, and a `0.0` option shipped
     on 0.77% of draws wearing a named distractor's badge. The distinctness test
     now counts the candidates it actually has: five on a subtract draw, four on an
     add draw, where two of them are the same number by construction. */
  /* WOUND 3 (refutation v4 @ 7ec7919): `key % 10 !== 0` is gone. It was written to
     stop "5.60" being an answer, and the side effect was that the KEY could never
     end in a zero after the point while distractors could - a badge that said
     "distractor" on every draw it appeared. The operands still may not end in a
     zero (that is what keeps the last column real); the sum may land wherever the
     arithmetic puts it, which is what a child's column addition does. */
  } while (guard < 300 && !(key > scale && noCarry > 0 && other > 0 && rounded > 0 &&
           a % 10 !== 0 && b % 10 !== 0 &&
           new Set([key, noCarry, other, overCarry, key - scale, rounded]).size === (addMode ? 5 : 6)));
  const A = D(a, dp), B = D(b, dp), K = D(key, dp);
  const sign = addMode ? '+' : '−';
  /* WOUND 1: on an ADD draw both named slips but one sat below the key and on a
     SUBTRACT draw all three sat above it, so the key was pinned to the second
     biggest or the smallest. The point-one-column-out pair and "took one too many
     out of the next column" give the picker candidates on both sides either way. */
  return mcDec('<b>' + dtext(A) + ' ' + sign + ' ' + dtext(B) + ' = ?</b>', '',
    K, [D(noCarry, dp), D(other, dp), D(overCarry, dp), D(key - scale, dp), D(rounded, dp), pLeft(K), pRight(K)], '',
    'Write them one under the other with the decimal points in line, then ' + (addMode ? 'add' : 'subtract') +
    ' column by column starting from the right: ' + dtext(A) + ' ' + sign + ' ' + dtext(B) + ' = ' + dtext(K) +
    '. The decimal point in the answer goes straight under the other two.');
}
/* the "smaller from larger in every column" subtraction slip, done exactly */
function digitwiseDiff(a, b, dp) {
  let out = 0, mul = 1, x = a, y = b;
  for (let i = 0; i <= dp; i++) {
    const da = i < dp ? x % 10 : x, db = i < dp ? y % 10 : y;
    out += Math.abs(da - db) * mul;
    if (i < dp) { x = Math.floor(x / 10); y = Math.floor(y / 10); mul *= 10; }
  }
  return out;
}

/* FORMAT 4b - working backwards, SG money (pool 2): the total is the unknown. */
const SHOPS = ['the school bookshop', 'the NTUC checkout', 'the hawker centre drinks stall', 'the MRT station kiosk'];
function gDecStartAmount() {
  const who = pick(NAMES);
  let spent = 435, left = 560, key = 995, guard = 0;
  let subtracted = 125, noCarry = 985, dropped = 1095;
  do {
    guard++;
    spent = ri(105, 895); left = ri(105, 895);
    key = spent + left;
    subtracted = Math.abs(left - spent);                  /* subtracted instead of adding */
    noCarry = key - 100;                                  /* lost the carry out of the cents */
    dropped = key + 100;                                  /* carried where there was nothing to carry */
  } while (guard < 300 && !(key % 100 !== 0 && subtracted > 0 && spent !== left &&
           spent % 100 !== 0 && left % 100 !== 0 &&          /* "$2.00" teaches no decimals */
           new Set([key, subtracted, noCarry, dropped, 2 * spent, 2 * left]).size === 6));
  /* WOUND 1: subtracted and noCarry sit below the key and dropped sits above it on
     every draw, so "second biggest" answered this 2,000 times out of 2,000. The
     two "used one amount twice" slips STRADDLE the key by construction - whichever
     of the two amounts is the larger, doubling it overshoots and doubling the other
     undershoots - so the picker always has at least two named candidates on each
     side and the key's rank moves. */
  return mcMoney(who + ' spends <b>' + money(spent) + '</b> at ' + pick(SHOPS) + ' and has <b>' + money(left) +
    '</b> left. <b>How much money did ' + who + ' have at first?</b>', '',
    key, [subtracted, noCarry, dropped, 2 * spent, 2 * left],
    'Work backwards: the money at the start is the money spent plus the money left over. Line the decimal points up and add: ' +
    money(spent) + ' + ' + money(left) + ' = ' + money(key) + '. Taking one amount from the other answers a different question.');
}

/* FORMAT 4c - compare two prices, SG supermarket (pool 2, two steps). */
function gDecMoneyMore() {
  const [who] = pickNames(1);
  const goods = pick([['a carton of milk', 'a loaf of bread'], ['a packet of rice', 'a bottle of oil'],
                      ['a tray of eggs', 'a bag of onions'], ['a tub of yoghurt', 'a packet of biscuits']]);
  let hi = 345, lo = 180, key = 165, guard = 0;
  let total = 525, noBorrow = 245, wholeOnly = 200, centsOnly = 65, oneDollarOut = 65;
  do {
    guard++;
    hi = ri(260, 890); lo = ri(105, hi - 160);
    key = hi - lo;
    total = hi + lo;                                       /* added instead of comparing */
    noBorrow = digitwiseDiff(hi, lo, 2);                   /* smaller digit from larger in every column */
    wholeOnly = (Math.floor(hi / 100) - Math.floor(lo / 100)) * 100;   /* ignored the cents */
    centsOnly = Math.abs(hi % 100 - lo % 100);             /* compared the cents only */
    oneDollarOut = key - 100;                              /* exchanged a dollar that was already there */
  } while (guard < 300 && !(key % 100 !== 0 && wholeOnly > 0 && noBorrow > 0 && centsOnly > 0 && oneDollarOut > 0 &&
           hi % 100 !== 0 && lo % 100 !== 0 &&               /* "$2.00" teaches no decimals */
           new Set([key, total, noBorrow, wholeOnly, centsOnly, oneDollarOut]).size === 6));
  /* WOUND 1: total, noBorrow and wholeOnly are all normally ABOVE the difference,
     so "always pick the smallest" won 74.2% of this generator. centsOnly and
     oneDollarOut are named slips that both land BELOW it, and the draw now
     guarantees a difference of at least $1.60 so the second of them stays positive. */
  return mcMoney('At NTUC ' + goods[0] + ' costs <b>' + money(hi) + '</b> and ' + goods[1] + ' costs <b>' +
    money(lo) + '</b>. <b>How much more does ' + goods[0].replace(/^an? /, 'the ') + ' cost?</b>', '',
    key, [total, noBorrow, wholeOnly, centsOnly, oneDollarOut],
    'Step 1: line the decimal points up. Step 2: subtract, exchanging a dollar for 100 cents when the cents will not go: ' +
    money(hi) + ' − ' + money(lo) + ' = ' + money(key) + '. Adding the two prices tells you what both cost together, which is a different question.');
}

/* FORMAT 4d - error spotting, the mistake NAMED (pool 3, CORRECT the mistake).
   Misconception: lining up the last digits instead of the decimal points.

   WOUND 3 (refutation 2026-09-15). The first cut always asked `w + 0.d` - a whole
   number plus a tenth - which needs a CARRY in 0 of 20,000 draws, while the pool-1
   addition anchor it sits two levels above needs one in 81.0%. The pool-3 wrapper
   was making the arithmetic EASIER than the pool-1 item. The dominant draw now
   adds two numbers that both carry digits after the point, one place apart
   (3.75 + 4.6), whose fractional parts are forced to add past one whole: the carry
   rate is the 85% of draws that take that shape. The classic `w + 0.d` shape is
   kept for the other 15% because it is the purest picture of the slip.

   THE KILL's rule, applied here too: the number the stem declares wrong is no
   longer offered as an option. A child could delete it on sight - the question
   has just said it is wrong - so it was one of three distractors doing no work. */
function gDecAlignError() {
  const who = pick(NAMES);
  let a = D(375, 2), b = D(46, 1), guard = 0, ok = false;
  /* WOUND (refutation v6, this lane's own measurement). This generator used to draw
     a SECOND shape on 12% of its draws - a whole number plus a tenth, "2 + 0.6" -
     and that shape asks no arithmetic at all: the answer IS the two printed numbers
     written side by side, so any relation that reads "the option ending in the digit
     the stem names" finds the key for nothing. Three passes in a row found a route
     through it (v4's "whole ones from one stem number, digits after the point from
     the other" at 83%, v5's 53.6% residual, and, once the coupling gate could see a
     last digit, "of the two options sharing a whole number take the one ending in a
     digit the stem names" at 85.46% @ 100.0% inside that shape on 6,000 draws). It
     cannot be fixed, because every sum with a whole-number addend is a
     concatenation. The shape is gone; the item keeps the shape that carries a real
     carry, where the misalignment is the whole lesson. */
  do {
    guard++;
    const A = ri(101, 899), B = ri(11, 89);
    if (A % 10 === 0 || B % 10 === 0) continue;             /* the last digits must be real digits */
    if ((A % 100) + (B % 10) * 10 < 100) continue;          /* the fractions must carry into the ones */
    a = D(A, 2); b = D(B, 1);
    const m0 = 2;
    const t0 = a.n + b.n * 10;
    const df = Math.abs(a.n - b.n * 10);
    if (t0 - P10[m0] <= 0 || df <= 0) continue;
    /* "writes the 9 underneath the 9" reads as a riddle; the two last digits differ */
    if (a.n % 10 === b.n % 10) continue;
    /* "got the whole ones right and kept the misaligned rest" may not come out as the
       printed slip itself, or RULE D5 would offer the declared-wrong number back */
    if (Math.floor(t0 / P10[m0]) === Math.floor((a.n + b.n) / P10[m0])) continue;
    if (!dallDistinct([D(t0, m0), D(a.n + b.n, m0), D(a.n + b.n, 0), D(t0 + P10[m0], m0),
                       D(df, m0), D(t0 - P10[m0], m0), D(t0, m0 + 1), D(t0, m0 - 1)])) continue;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) { a = D(375, 2); b = D(46, 1); }
  const m = Math.max(a.dp, b.dp);
  const trueN = a.n * P10[m - a.dp] + b.n * P10[m - b.dp];
  const key = D(trueN, m);                           /* 3.75 + 4.6 = 8.35 */
  const claim = D(a.n + b.n, m);                     /* what lining up the LAST DIGITS gives: 4.21 */
  const lastA = a.n % 10, lastB = b.n % 10;
  const noPoint = D(a.n + b.n, 0);                   /* ignored the point altogether */
  const diff = D(Math.abs(a.n * P10[m - a.dp] - b.n * P10[m - b.dp]), m);   /* subtracted instead */
  const overCarry = D(trueN + P10[m], m);            /* carried where there was nothing to carry */
  const lostCarry = D(trueN - P10[m], m);            /* wrote the carried ten down and lost it */
  /* COUPLING GATE (refutation v4 @ 7ec7919, the gate's own finding), kept: "got the
     whole ones right and kept the rest of the misaligned sum" carries the key's own
     whole ones with the digits after the point of the wrong answer the stem prints,
     so the key is never the only option whose whole part reads correctly. It was a
     must() while the one-sided shape existed and is an ordinary candidate now - the
     rank picker is free to leave it out, which is what stops "of the two options
     sharing a whole number, take the one ending in a named digit" from settling. */
  const patched = D(Math.floor(trueN / P10[m]) * P10[m] + claim.n % P10[m], m);
  return mcDec(who + ' works out <b>' + dtext(a) + ' + ' + dtext(b) + '</b>. ' + who +
    ' writes the ' + lastB + ' underneath the ' + lastA + ' and gets <b>' + dtext(claim) +
    '</b>. <b>What is the correct answer?</b>', '',
    key, [noPoint, diff, overCarry, lostCarry, patched, pLeft(key), pRight(key)], '',
    'Line up the decimal POINTS, not the last digits. Write ' + dtext(a) + ' and ' + dtext(b) +
    ' one under the other with the points in a column, filling the short one out with a zero: ' +
    dtext(D(a.n * P10[m - a.dp], m)) + ' + ' + dtext(D(b.n * P10[m - b.dp], m)) + ' = ' + dtext(key) +
    '. Writing the ' + lastB + ' under the ' + lastA + ' slides ' + dtext(b) +
    ' one whole column to the right, and that is where ' + dtext(claim) + ' comes from.');
}

/* FORMAT 4e - TYPED two-step word problem, SG money (pool 3): total, then change.
   Typed on purpose: it is the one item in this topic that exercises the shared
   typed-money grader, so tools/answer-parse-test.mjs keeps binding on this file. */
function gDecMoneyChange() {
  const who = pick(NAMES);
  const goods = pick([['a packet of rice', 'a bottle of oil'], ['a carton of milk', 'a box of noodles'],
                      ['a bag of flour', 'a jar of kaya'], ['a tray of eggs', 'a packet of tea']]);
  const note = pick([10, 20]);
  const cap = note * 50 - 100;                 /* each item at most half the note, so the basket is believable */
  let x = 540, y = 385, guard = 0;
  do { x = ri(105, cap); y = ri(105, cap); guard++; }
  while (guard < 300 && !(x % 100 !== 0 && y % 100 !== 0 && (x + y) % 100 !== 0 && (x + y) % 10 !== 0 &&
         note * 100 - x - y > 0 && (note * 100 - x - y) % 100 !== 0));
  const total = x + y, change = note * 100 - total;
  const q = finishTyped('At NTUC ' + who + ' buys ' + goods[0] + ' for <b>' + money(x) + '</b> and ' + goods[1] +
    ' for <b>' + money(y) + '</b>, and pays with a <b>$' + note + '</b> note. <b>How much change, in dollars?</b>',
    change / 100,
    'Step 1: add the two prices with the decimal points in line: ' + money(x) + ' + ' + money(y) + ' = ' + money(total) +
    '. Step 2: take that away from the note: $' + note + ' − ' + money(total) + ' = ' + money(change) + '.', '$');
  q.answerText = money(change);
  q.dp = 2;
  return q;
}

/* FORMAT 4f - direct compute in money: the cost of n of one thing (pool 1, muldiv
   anchor).

   THIS FORMAT HAS NOW BEEN KILLED THREE TIMES AS A "WHICH CALCULATION" CONCEPT
   CHECK, EACH TIME ON A DIFFERENT PROPERTY OF THE OPTION ROW.

     v2 @ 0157aa1  the key was always the ×, and the three distractor frames were
                   the key on 0% of draws: "pick the multiplication" answered it on
                   20,000 / 20,000 draws without a decimal being read.
     v4 @ 7ec7919  the key was the only option naming two different money amounts
                   (mode 1) and the only one shaped "a price shared into a count"
                   (mode 2): the OPERAND SHAPE settled 66.83% of draws.
     v5 @ 8cf212b  the key was the only option built on the CHEAP price - the two
                   price lists never overlapped - and in the box mode the only ÷
                   whose divisor was the count printed three times on the row.
                   100.00% of draws, 100% right, no stem read and no arithmetic.

   THE FIFTH PASS'S MANDATE was to make every option on the row carry the SAME
   operand set, so that only the operation could discriminate. That cannot be done
   on this demand, and the reason is structural rather than a matter of effort:

     over an operand set of {price, count} exactly TWO arrangements can ever be the
     key - `$p × n` and `$p ÷ n`. Addition and subtraction of a price and a count
     are not answers to any question, so they are permanently dead frames. With two
     live keys, "always pick the multiplication" wins P(the key is the ×) - 50% by
     construction, whatever the row does, twice chance and over the 40% bar. The
     only way to a third live key is two operands of the SAME KIND (two prices,
     where +, − and ÷ are all live), and that would make two thirds of a generator
     tagged `muldiv` an addition-and-subtraction concept check.

   Measured, not just argued: a prototype of the mandated design - one price list,
   a constant four-arrangement row (`$p × n`, `$p ÷ n`, `n ÷ $p`, `$p + n`) and the
   demand alone deciding - reads "always pick the ×" at 50.0% and "always pick the
   ÷" at 50.0% on 20,000 draws. Every other row rule is flat, exactly as intended.
   The floor is the two-key arithmetic, not the row.

   THE REBUILD is therefore the PM's second instruction, the wave-1 law: ask for the
   TOTAL AS A NUMBER and carry named misconceptions as the option values. There is
   then no option row to read at all - four money amounts, each the answer to a
   named wrong method - and every arm of the harness binds on it the way it binds on
   the rest of the bank: the magnitude-rank picker spreads the key over all four
   positions, `q.decAuthored` binds the distractor contract, the coupling gate scores
   the stem against the options, and the oracle re-derives the key from the rendered
   price and count. The item still asks the muldiv question it was written for - how
   many groups of this price - and now a child has to do it. */
/* [with its article, plural, bare singular] - so every stem below reads as English */
const BOOKSHOP_ITEMS = [['a pen', 'pens', 'pen'], ['an exercise book', 'exercise books', 'exercise book'],
  ['a ruler', 'rulers', 'ruler'], ['a glue stick', 'glue sticks', 'glue stick'],
  ['a pencil', 'pencils', 'pencil'], ['an eraser', 'erasers', 'eraser']];
function gDecMulConcept() {
  /* ONE price list (the v5 kill was two lists that never overlapped, so "cheap"
     was a badge). Every price carries cents, because the cents are the lesson. */
  let x = 115, n = 7, guard = 0, ok = false, cands = [];
  let dollars = 1, cents = 15;
  do {
    guard++;
    x = pick([105, 115, 120, 125, 135, 140, 145, 150, 160, 175, 180, 195,
              210, 220, 240, 250, 265, 280, 295, 310, 325, 350, 375, 420]);
    n = ri(3, 9);
    dollars = Math.floor(x / 100); cents = x % 100;
    /* the cents must CARRY into the dollars, or "forgot to carry" is not a slip and
       the item is two separate one-digit multiplications */
    if (n * cents < 100) continue;
    cands = [
      { n: (n + 1) * x },                          /* one group too many */
      { n: n * (dollars + 1) * 100 },              /* rounded the price up to a whole dollar first */
      { n: n * x + 100 },                          /* carried a dollar that was not there */
      { n: (n - 1) * x },                          /* one group too few */
      { n: n * dollars * 100 + cents },            /* multiplied the dollars, copied the cents */
      { n: dollars * 100 + n * cents },            /* multiplied the cents, copied the dollars */
      { n: n * dollars * 100 + (n * cents) % 100 } /* never carried the cents into the dollars */
    ];
    if (new Set([n * x].concat(cands.map(c => c.n))).size !== 8) continue;
    if (cands.some(c => c.n <= 0)) continue;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) {
    x = 175; n = 6; dollars = 1; cents = 75;
    cands = [{ n: 7 * 175 }, { n: 6 * 200 }, { n: 6 * 175 + 100 }, { n: 5 * 175 },
             { n: 600 + 75 }, { n: 100 + 6 * 75 }, { n: 600 + (6 * 75) % 100 }];
  }
  const item = pick(BOOKSHOP_ITEMS), key = n * x;
  const q = mcMoney('At the school bookshop ' + item[0] + ' costs <b>' + money(x) +
    '</b>. <b>How much do ' + n + ' ' + item[1] + ' cost altogether?</b>', '',
    key, cands, '');
  /* the explanation names a slip that is ON THE ROW (slipFor), never one that is not */
  const named = [
    [n * dollars * 100 + (n * cents) % 100, 'Multiplying the cents and forgetting to carry them into the dollars gives '],
    [n * dollars * 100 + cents, 'Multiplying the dollars and copying the cents across gives '],
    [dollars * 100 + n * cents, 'Multiplying the cents and copying the dollars across gives '],
    [n * (dollars + 1) * 100, 'Rounding ' + money(x) + ' up to a whole dollar first gives '],
    [(n + 1) * x, 'Counting one ' + item[2] + ' too many gives '],
    [(n - 1) * x, 'Counting one ' + item[2] + ' too few gives '],
    [n * x + 100, 'Carrying a dollar that was never there gives ']
  ];
  const on = slipFor(q, named, money) || named[0];
  q.explain = n + ' ' + item[1] + ' at ' + money(x) + ' each is ' + n + ' equal groups of ' + money(x) +
    ', so multiply: ' + n + ' × ' + money(x) + ' = ' + money(key) + '. The cents are multiplied too - ' +
    n + ' × ' + cents + ' cents is ' + (n * cents) + ' cents, which is ' + money(n * cents) +
    ', and those whole dollars carry across into the dollars column. ' + on[1] + money(on[0]) + '.';
  return q;
}

/* FORMAT 4g - direct compute: a decimal times a 1-digit whole number (pool 2) */
function gDecMulWhole() {
  let dp = 1, a = 36, n = 4, guard = 0;
  do { dp = ri(1, 2); a = ri(P10[dp] + 1, 9 * P10[dp]); n = ri(3, 9); guard++; }
  while (guard < 300 && !((a * n) % 10 !== 0 && a % 10 !== 0 &&
         dallDistinct([D(a * n, dp), D(a + n * P10[dp], dp), D(a * n, dp + 1), D(a * n, dp - 1),
                       D(a * (n - 1), dp), D(a * (n + 1), dp)])));
  const A = D(a, dp), key = D(a * n, dp);
  /* WOUND 1 (96.0% "second biggest"): the added slip and the point-one-right slip
     were both below the key and the point-one-left slip was above it, every draw.
     One group too few and one group too many bracket it at the same magnitude. */
  return mcDec('<b>' + dtext(A) + ' × ' + n + ' = ?</b>', '',
    key, [D(a + n * P10[dp], dp), pRight(key), pLeft(key),
          dnat(D(a * (n - 1), dp)), dnat(D(a * (n + 1), dp))], '',
    'Multiply as if there were no decimal point: ' + a + ' × ' + n + ' = ' + (a * n) + '. ' + dtext(A) +
    ' has ' + dp + ' digit' + (dp > 1 ? 's' : '') + ' after the point, so the answer has ' + dp +
    ' too: ' + dtext(key) + '. Adding instead of multiplying answers a different question.');
}

/* FORMAT 4h - direct compute: a decimal shared by a 1-digit whole number (pool 2) */
function gDecDivWhole() {
  let dp = 1, key = 24, n = 3, guard = 0, wholeOnly = 20, forgotWhole = 2588, droppedWhole = 88;
  do {
    guard++;
    dp = ri(1, 2); key = ri(P10[dp] + 1, 4 * P10[dp]); n = ri(2, 9);
    /* divided the whole ones and threw the digits after the point away */
    wholeOnly = Math.floor(Math.floor(key * n / P10[dp]) / n) * P10[dp];
    /* WOUND 1 (refutation v4 @ 7ec7919). The v3 fix to the written-length route was
       a "divided the whole ones and copied the digits down" candidate that shipped
       on every draw. It closed the length route and opened a VALUE route that was
       worse: the identity floor(floor(x/a)/b) = floor(x/(ab)) made its whole ones
       the KEY'S OWN, and the digits it copied down were the digits after the point
       of the number printed in the STEM. So exactly two options shared a whole
       number part, one of them ended in the stem's own digits, and the other one
       was the answer - 100.00% settled, 100.00% right, no division done.

       These two are the same slip cut the other way and they borrow nothing the key
       borrows. "Divided the digits after the point and left the whole ones alone"
       keeps the STEM's whole ones (never the key's) with the KEY's digits after the
       point (never the stem's); "shared it out and forgot to write the whole ones"
       keeps the key's digits with no whole ones at all. Both are real P4 slips,
       both are written to the key's own number of decimal places so RULE D1 still
       binds, and neither hands a child a whole-number part to match. */
    forgotWhole = Math.floor(key * n / P10[dp]) * P10[dp] + key % P10[dp];
    droppedWhole = key % P10[dp];
  } while (guard < 300 && !(key % 10 !== 0 && (key * n) % 10 !== 0 && key * n !== n * P10[dp] && wholeOnly > 0 &&
         droppedWhole > 0 && forgotWhole !== key &&
         dallDistinct([D(key, dp), D(key, dp + 1), D(key, dp - 1), D(Math.abs(key * n - n * P10[dp]), dp),
                       D(key * n, dp), D(wholeOnly, dp), D(forgotWhole, dp), D(droppedWhole, dp)])));
  const total = key * n;
  const T = D(total, dp), K = D(key, dp);
  /* WOUND 1 (89.0% "second smallest"): the point-one-right slip was the only
     candidate below the key. "Divided the whole ones only" is the second one, and
     "did not divide at all" is a second candidate above it. */
  return mcDec('<b>' + dtext(T) + ' ÷ ' + n + ' = ?</b>', '',
    K, [D(forgotWhole, dp), D(droppedWhole, dp), pRight(K), pLeft(K),
        D(Math.abs(total - n * P10[dp]), dp), D(total, dp), dnat(D(wholeOnly, dp))], '',
    'Divide as if there were no decimal point: ' + total + ' ÷ ' + n + ' = ' + key + '. ' + dtext(T) +
    ' has ' + dp + ' digit' + (dp > 1 ? 's' : '') + ' after the point, so the answer keeps the point in the same column: ' +
    dtext(K) + '. Check it by multiplying back: ' + dtext(K) + ' × ' + n + ' = ' + dtext(T) + '.');
}

/* ===== MOE P4 3.2 - dividing a WHOLE number by a WHOLE number with the quotient
   as a decimal. SCOPE (refutation 2026-09-15 section 5): the shipped bank had
   zero generators for this sub-strand - "3 divided by 4 is 0.75" appeared nowhere
   in 640,000 draws - and the lane's own scope note did not mention it. Divisors
   are 2, 4, 5, 8 and 10 only, which are exactly the one-digit divisors whose
   quotients terminate inside the three-place ceiling (halves, quarters, fifths,
   eighths, tenths), and the draw rejects anything that divides exactly, so the
   answer is always a decimal and never a repeating one. --------------------- */
const QUOT_DENS = [2, 4, 5, 8, 10];
/* a / b as an exact scaled integer: 1/8 is 125 thousandths, and dnat strips the
   zeros so 3 / 5 prints "0.6" and not "0.600". */
const quot = (a, b) => dnat(D(a * (1000 / b), 3));
/* the named slips shared by both 3.2 formats, five of them, at least two on each
   side of the key (refutation WOUND 1 - every numeric generator authors a bank
   wide enough for the rank picker to move the answer around). */
function quotCands(a, b, key) {
  const floor = Math.floor(a / b), unit = P10[key.dp];
  return [
    /* the slip the whole sub-strand exists to kill, so it ships on every draw - bar
       the divisor of 10, where writing the remainder after the point is CORRECT */
    b === 10 ? null : must(D(floor * 10 + (a % b), 1)),
    floor > 0 ? D(key.n - floor * unit, key.dp) : null,  /* dropped the whole ones */
    D(key.n + unit, key.dp),                        /* a whole one that is not there */
    /* WOUND 6 (refutation v2 @ 0157aa1): at b = 2 "shared ONE whole and stopped"
       IS the key's own fractional part - quot(1, 2) = 0.5 = key - floor - so
       dallDistinct rejected EVERY b = 2 draw and the divisor was unreachable on
       0 / 40,000 draws. Halves, the first instance of the sub-strand a P4 teacher
       sets, never shipped. The candidate is dropped at b = 2, where it is not a
       distinct slip at all, and the other five still bracket the key. */
    (a > 1 && b !== 2) ? quot(1, b) : null,         /* shared ONE whole and stopped */
    D(a * b, 0),                                    /* multiplied instead of dividing */
    pRight(key), pLeft(key)                         /* the point one column out, each way */
  ];
}
function gDecQuotient() {
  let a = 3, b = 4, guard = 0;
  do { b = pick(QUOT_DENS); a = ri(2, 6 * b - 1); guard++; }   /* 1 divided by b explains itself */
  while (guard < 300 && !(a % b !== 0 &&
         dallDistinct([quot(a, b)].concat(quotCands(a, b, quot(a, b)).filter(Boolean)))));
  const key = quot(a, b);
  const remAfterPoint = D(Math.floor(a / b) * 10 + (a % b), 1);   /* wrote the remainder after the point */
  return mcDec('<b>' + a + ' ÷ ' + b + ' = ?</b>', '',
    key, quotCands(a, b, key), '',
    b + ' does not go into ' + a + ' a whole number of times, so the answer carries on after the decimal point. ' +
    'One whole shared into ' + b + ' is ' + dtext(quot(1, b)) + ', so ' + many(a, 'whole', 'wholes') +
    ' shared into ' + b + ' is ' +
    a + ' × ' + dtext(quot(1, b)) + ' = ' + dtext(key) + '. Check it by multiplying back: ' + dtext(key) + ' × ' + b +
    ' = ' + a + '.' + (b === 10 ? '' : ' The remainder is not written after the point: ' + a + ' ÷ ' + b +
    ' is not ' + dtext(remAfterPoint) + '.'));
}

/* the same sub-strand as a measures word problem (pool 2) */
function gDecQuotientWord() {
  const who = pick(NAMES);
  let a = 3, b = 4, guard = 0;
  do { b = pick(QUOT_DENS); a = ri(b + 1, 6 * b - 1); guard++; }
  while (guard < 300 && !(a % b !== 0 &&
         dallDistinct([quot(a, b)].concat(quotCands(a, b, quot(a, b)).filter(Boolean)))));
  const key = quot(a, b);
  const goods = pick([['flour', 'bags'], ['rice', 'packets'], ['sugar', 'tins'], ['dried shrimp', 'tubs']]);
  return mcDec('At the provision shop ' + who + ' splits <b>' + a + ' kg</b> of ' + goods[0] +
    ' equally into <b>' + b + '</b> ' + goods[1] + '. <b>How much ' + goods[0] + ' is in each ' +
    goods[1].replace(/e?s$/, '') + '?</b>', '',
    key, quotCands(a, b, key), 'kg',
    'Share the ' + a + ' kg into ' + b + ' equal ' + goods[1] + ': one kilogram shared into ' + b + ' is ' +
    dtext(quot(1, b)) + ' kg, so ' + many(a, 'kilogram', 'kilograms') + ' shared into ' + b + ' is ' + a + ' × ' + dtext(quot(1, b)) +
    ' = ' + dtext(key) + ' kg. Check it by multiplying back: ' + dtext(key) + ' × ' + b + ' = ' + a +
    '. A remainder is not written after the decimal point.');
}

/* FORMAT 4i - word problem, SG running track (pool 2, measures) */
function gDecTrack() {
  const who = pick(NAMES);
  let lap = 4, laps = 6, guard = 0;
  do { lap = ri(2, 9); laps = ri(4, 9); guard++; }
  while (guard < 200 && !(lap !== laps && (lap * laps) % 10 !== 0 &&
         (lap * (laps - 1)) % 10 !== 0 && (lap * (laps + 1)) % 10 !== 0 &&   /* no "3.0 km" option */
         dallDistinct([D(lap * laps, 1), D(lap + laps * 10, 1), D(lap * laps, 2), D(lap * laps, 0),
                       D(lap * (laps - 1), 1), D(lap * (laps + 1), 1)])));
  const L = D(lap, 1), key = D(lap * laps, 1);
  const where = pick(['the stadium', 'the school field', 'the sports hall', 'the park connector loop']);
  /* WOUND 1: the two named slips were exactly key / 10 and key x 10 and the third
     sat above both, so the key was the SECOND SMALLEST on 2,000 of 2,000 draws.
     The two off-by-one-lap slips are the counting mistake this item is really
     about, and they bracket the key at comparable magnitude on every draw. */
  return mcDec('One lap of the running track at ' + where + ' is <b>' + dtext(L) + ' km</b>. ' + who +
    ' runs <b>' + laps + '</b> laps. <b>How far does ' + who + ' run altogether?</b>', '',
    key, [D(lap + laps * 10, 1), pRight(key), pLeft(key),
          D(lap * (laps - 1), 1), D(lap * (laps + 1), 1)], 'km',
    laps + ' laps of ' + dtext(L) + ' km means ' + laps + ' equal groups, so multiply: ' + lap + ' × ' + laps +
    ' = ' + (lap * laps) + ' tenths of a kilometre, which is ' + dtext(key) + ' km. Adding the lap length to the number of laps answers nothing.');
}

/* FORMAT 4j - two-step word problem, SG petrol kiosk (pool 3): multiply, then
   take away from the note. */
function gDecPetrol() {
  const who = pick(NAMES);
  let rate = 275, litres = 5, note = 20, guard = 0, ok = false;
  let key = 625, stopped = 1375, ratePaid = 1725, noBorrow = 1635;
  let oneLitreOut = 350, oneDollarOut = 525, centsOnly = 25;
  do {
    guard++;
    /* Singapore pump prices in 2026 run about $2.60-$3.30 a litre; the first cut
       drew $1.65-$2.85, which is 2016 and reads wrong to a Singapore parent
       (refutation 2026-09-15, section 6). */
    rate = ri(255, 330); litres = ri(4, 9); note = pick([20, 50]);
    if (rate % 100 === 0) continue;                           /* "$2.00" teaches no decimals */
    const cost = rate * litres;
    if (cost >= note * 100 || cost % 100 === 0) continue;
    key = note * 100 - cost;
    stopped = cost;                                     /* stopped after step 1 */
    ratePaid = note * 100 - rate;                       /* took away one litre's price, not the whole cost */
    noBorrow = digitwiseDiff(note * 100, cost, 2);      /* smaller digit from larger in every column */
    /* WOUND 1: all three of those sit ABOVE the change on nearly every draw, so the
       key was the smallest or the third biggest and nothing else. These three are
       named slips that land below it. */
    oneLitreOut = key - rate;                           /* paid for one litre too many */
    oneDollarOut = key - 100;                           /* a dollar lost in the exchange */
    centsOnly = key % 100;                              /* counted the cents and stopped */
    if (key <= 0 || key % 100 === 0) continue;
    if (oneLitreOut <= 0 || oneDollarOut <= 0 || centsOnly <= 0) continue;
    if (new Set([key, stopped, ratePaid, noBorrow, oneLitreOut, oneDollarOut, centsOnly]).size !== 7) continue;
    if (noBorrow <= 0) continue;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) { rate = 275; litres = 5; note = 20; key = 625; stopped = 1375; ratePaid = 1725; noBorrow = 1635;
             oneLitreOut = 350; oneDollarOut = 525; centsOnly = 25; }
  return mcMoney('At the petrol kiosk ' + who + ' pumps <b>' + litres + ' litres</b> of petrol at <b>' +
    money(rate) + ' per litre</b> and pays with a <b>$' + note + '</b> note. <b>How much change is there?</b>', '',
    key, [stopped, ratePaid, noBorrow, oneLitreOut, oneDollarOut, centsOnly],
    'Step 1: ' + litres + ' litres at ' + money(rate) + ' each costs ' + money(rate) + ' × ' + litres + ' = ' +
    money(rate * litres) + '. Step 2: $' + note + ' − ' + money(rate * litres) + ' = ' + money(key) +
    '. Stopping after step 1 gives the cost of the petrol, not the change.');
}

/* FORMAT 4k - two-step word problem, SG wet market (pool 3): share, then take
   some of the shares. The stop-after-dividing answer is offered. */
function gDecShareMass() {
  const who = pick(NAMES);
  let total = 54, trays = 3, want = 2, per = 18, guard = 0;
  do {
    guard++;
    trays = ri(3, 6); want = ri(2, trays - 1);
    per = ri(11, 39);
    total = per * trays;
  } while (guard < 300 && !(total % 10 !== 0 && (per * want) % 10 !== 0 && (per + want) % 10 !== 0 &&
           per % 10 !== 0 &&                                    /* no "2.0 kg" option */
           dallDistinct([D(per * want, 1), D(per, 1), D(total * want, 1), D(total - per, 1),
                         D(per * want, 2), D(per * want, 0), D(per + want, 1)])));
  const key = per * want;
  const goods = pick([['prawns', 'trays'], ['fishballs', 'packets'], ['chicken wings', 'boxes'], ['kang kong', 'bundles']]);
  /* WOUND 1 (100% "second smallest"): per < key < total - per < total x want on every
     draw. The stop-after-dividing answer STILL ships on every draw - the oracle
     requires it, so it is marked must() - but it is now the only fixture, and the
     picker varies how many of the other three sit above the key. */
  return mcDec('A stall at the wet market packs <b>' + dtext(D(total, 1)) + ' kg</b> of ' + goods[0] +
    ' equally into <b>' + trays + '</b> ' + goods[1] + '. <b>How much do ' + want + ' of the ' + goods[1] +
    ' hold altogether?</b>', '',
    D(key, 1), [must(D(per, 1)), D(total * want, 1), D(total - per, 1),
                D(per * want, 2), D(per * want, 0), D(per + want, 1)], 'kg',
    'Step 1: share the ' + dtext(D(total, 1)) + ' kg into ' + trays + ' equal ' + goods[1] + ': ' + total +
    ' ÷ ' + trays + ' = ' + per + ' tenths, so one ' + goods[1].replace(/e?s$/, '') + ' holds ' + dtext(D(per, 1)) +
    ' kg. Step 2: ' + want + ' of them hold ' + dtext(D(per, 1)) + ' × ' + want + ' = ' + dtext(D(key, 1)) +
    ' kg. Stopping after the sharing gives one ' + goods[1].replace(/e?s$/, '') + ' only.');
}


  MQI.registerTopic({
    id: 'decimals', level: 'P4', strand: 'Number and Algebra',
    /* The three qualifiers the first cut dropped are back, VERBATIM from the MOE
       Oct 2025 P4 sub-strand list as audited in the vault's Expansion Brief
       (refutation 2026-09-15, section 6): "when the denominator is a factor of 10
       or 100" on 1.4, "(up to 2 dp)" on 2.1 and again on 3.1. The generators were
       always inside all three - this was a string that over-claimed, not a scope
       leak - and 3.2 joins the list now that gDecQuotient and gDecQuotientWord
       exist to cover it. */
    moeSubTopic: 'Decimals: notation, representations and place values (tenths, hundredths, thousandths); ' +
      'comparing and ordering decimals; expressing decimals as fractions; ' +
      'expressing fractions as decimals when the denominator is a factor of 10 or 100; ' +
      'rounding decimals to the nearest whole number, 1 decimal place and 2 decimal places; ' +
      'adding and subtracting decimals (up to 2 dp); ' +
      'multiplying and dividing decimals (up to 2 dp) by a 1-digit whole number; ' +
      'dividing a whole number by a whole number with quotient as a decimal',
    label: 'Decimal Bay', short: 'Decimals', e: '\u{1F30A}',
    skills: {
      place:   { label: 'Place value of decimals',      tip: 'Name each place after the point out loud: tenths, hundredths, thousandths. An empty place still needs a zero to hold it open.' },
      compare: { label: 'Comparing & ordering decimals', tip: 'Write them one under the other with the points in line and fill the short ones with zeros. More digits does not mean bigger.' },
      round:   { label: 'Rounding decimals',            tip: 'Look at ONE digit only - the very next one after the place you are rounding to. 5 or more up, 4 or less down.' },
      convert: { label: 'Decimals & fractions',         tip: 'Tenths go over 10, hundredths over 100, thousandths over 1000. A dollar is 100 cents, so money is hundredths.' },
      addsub:  { label: 'Adding & subtracting decimals', tip: 'Stack them so the decimal points line up, not so the last digits line up.' },
      muldiv:  { label: 'Multiplying & dividing decimals', tip: 'Work it out as whole numbers first, then put the point back in the answer.' }
    },
    /* Every generator appears in EXACTLY ONE pool, so no stem the child meets at
       level 1 can come back as a level-3 item, and the feed's same-template rate
       has nothing to repeat across a level change. Pool 3's single-step slot is
       gDecExpand, declared as the anchor (depth-pilot contract change 2). */
    pools: {
      /* FOR THE INTEGRATOR - WOUND 2 (refutation v3 @ c9d26fb), measured and NOT
         closed here, deliberately. At 45% accuracy pool 1 is 79.0% of a session,
         and three of the six skills own exactly ONE pool-1 generator each -
         `compare` -> gDecCompare, `round` -> gDecBetween, `addsub` -> gDecAddSub -
         so buildCarousel's skill round-robin hands each of them a full sixth of the
         pool: 3.86 / 3.72 / 3.90 items per 30-item session, worst session 6 each,
         38.3% of a struggling child's whole session on three stems. That is WOUND 4
         (gDecCmpError, 2.66 a session) one pool down, in the pool the child who
         needs the anchors actually lives in.
         The fix is a fourth pool-1 voice on one of those three skills, and it is
         held back because every cheap candidate reaches into another pool: a second
         rounding item is gDecRound's demand (pool 2), a second comparison is
         gDecCompare/gDecCmpMixed's declared shape pair, and a second addition is
         gDecAddSub's own demand in money clothes. It travels with the gDecBetween
         retag (tagged `round`, asks no rounding - v1 section 6), which is a pool
         decision the lane has now deferred three times and should stop deferring
         now that the 45% number exists. */
      1: [[gDecDigitValue, 'place'], [gDecNamePlace, 'place'], [gDecCompare, 'compare'],
          [gDecBetween, 'round'], [gFracToDec, 'convert'], [gDecBar, 'convert'],
          [gDecAddSub, 'addsub'], [gDecMulConcept, 'muldiv'], [gDecQuotient, 'muldiv']],
      2: [[gDecBuild, 'place'], [gDecHowMany, 'place'], [gDecCmpMixed, 'compare'], [gDecOrder, 'compare'],
          [gDecRound, 'round'], [gDecToFrac, 'convert'], [gFracEquivDec, 'convert'],
          [gDecStartAmount, 'addsub'], [gDecMoneyMore, 'addsub'],
          [gDecMulWhole, 'muldiv'], [gDecDivWhole, 'muldiv'], [gDecTrack, 'muldiv'],
          [gDecQuotientWord, 'muldiv']],
      /* WOUND 4: `compare` owned exactly one pool-3 slot, and buildCarousel
         round-robins skills, so that whole sixth of the pool landed on
         gDecCmpError - 2.66 items a session. gDecOrderError is the second voice. */
      3: [[gDecExpand, 'place'], [gDecPlaceError, 'place'],
          [gDecCmpError, 'compare'], [gDecOrderError, 'compare'],
          [gDecRoundBack, 'round'], [gDecRoundError, 'round'], [gDecRoundSum, 'round'],
          [gDecFracError, 'convert'], [gDecMoneyFrac, 'convert'],
          [gDecAlignError, 'addsub'], [gDecMoneyChange, 'addsub'],
          [gDecPetrol, 'muldiv'], [gDecShareMass, 'muldiv']]
    }
  });
})();
