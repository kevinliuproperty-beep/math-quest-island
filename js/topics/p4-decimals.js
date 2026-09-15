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
function mcDec(stem, extra, key, cands, unit, explain) {
  const u = unit ? (' ' + unit) : '';
  const kept = [];
  for (const c of cands) {
    if (kept.length >= 3) break;
    if (!c || !Number.isFinite(c.n) || c.n < 0) continue;
    if (dsame(c, key) || kept.some(k => dsame(k, c))) continue;
    kept.push(c);
  }
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
  const kept = [];
  for (const c of candCents) {
    if (kept.length >= 3) break;
    if (!Number.isInteger(c) || c <= 0 || c === keyCents || kept.indexOf(c) !== -1) continue;
    kept.push(c);
  }
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

/* ---- draw helper: distinct digits 1..9, so the digit a stem names appears in
   exactly one place and "which place is it in" has exactly one answer ---- */
function distinctDigits(k) { return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, k); }

/* =============================================================================
   PRINCIPLE 1 - PLACE VALUE
   "A decimal is the whole number plus tenths, hundredths and thousandths of one."
   ========================================================================== */

/* FORMAT 1a - direct compute: what is one digit worth? (pool 1)
   Every option prints at the ASKED place's own dp, so the three named slips
   ("read it one place left", "looked at the wrong digit", "used the ones digit")
   are all exactly representable. The recovered generator printed them at a single
   dp and shipped 0.07 as "0.1". */
function gDecDigitValue() {
  const dp = ri(1, 3);
  const ds = distinctDigits(dp + 1);
  const whole = ds[0], dec = ds.slice(1);
  const numStr = whole + '.' + dec.join('');
  const place = ri(1, dp);
  const d = dec[place - 1];
  const key = D(d, place);
  const leftSlip = D(d * 10, place);                       /* read one place too far left */
  const onesDigit = D(whole, place);                       /* used the ones digit instead */
  /* "looked at the wrong digit" needs a second decimal digit; a one-place number
     has none, so it offers "one place too deep" there instead. */
  const third = dp > 1 ? D(dec[place % dp], place) : D(d, Math.min(3, place + 1));
  return mcDec('What is the value of the digit <b>' + d + '</b> in <b>' + numStr + '</b>?', '',
    key, [leftSlip, onesDigit, third], '',
    'In ' + numStr + ', count the places after the decimal point: tenths, then hundredths, then thousandths. ' +
    'The digit ' + d + ' is number ' + place + ' after the point, so it sits in the ' + PLACE_WORD[place] +
    ' place and it is worth ' + qty(d, place) + ', which is ' + dtext(key) + '.');
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
    packed = D(w * 1000 + d1 * 100 + d2 * 10, 3);              /* wrote the digits in a row */
    swapped = D(w * 1000 + d2 * P10[3 - p1] + d1, 3);          /* the two digits in each other's place */
    packedSwapped = D(w * 1000 + d2 * 100 + d1 * 10, 3);       /* in a row AND the wrong way round */
  } while (guard < 200 && !dallDistinct([key, packed, swapped, packedSwapped]));
  const parts = qty(w, 0) + ', ' + qty(d1, p1) + ' and ' + qty(d2, p2);
  return mcDec('Which number is made up of <b>' + parts + '</b>?', '',
    key, [packed, swapped, packedSwapped], '',
    parts + ' is written ' + dtext(key) + '. There are no ' + PLACE_WORD[p1 === 1 ? 2 : 1] +
    ', so a zero holds that place open. Writing the digits in a row with no zero gives ' +
    dtext(packed) + ', which is a different number.');
}

/* FORMAT 1d - concept check: how many of a smaller place make this number?
   (pool 2). Answers here are counts, so this one routes through finishNum. */
function gDecHowMany() {
  let w = 2, dp = 1, j = 1, val = D(27, 1), V = 27, shallow = 2, digitsOnly = 7, guard = 0;
  do {
    guard++;
    dp = Math.random() < 0.65 ? 1 : 2;
    j = dp === 1 ? pick([1, 2]) : pick([2, 3]);
    const ds = distinctDigits(dp + 1);
    w = ds[0];
    val = D(w * P10[dp] + ds.slice(1).reduce((a, x, i) => a + x * P10[dp - 1 - i], 0), dp);
    V = val.n * P10[j - dp];                                   /* the count in place j */
    shallow = j - 1 >= dp ? val.n * P10[j - 1 - dp]            /* the count one place shallower */
                          : Math.floor(val.n / P10[dp - (j - 1)]);
    digitsOnly = val.n - w * P10[dp];                          /* just the digits after the point */
  } while (guard < 200 && !(V > 0 && shallow > 0 && digitsOnly > 0 &&
           new Set([V, shallow, digitsOnly, V * 10]).size === 4));
  const q = finishNum('How many <b>' + PLACE_WORD[j] + '</b> are there in <b>' + dtext(val) + '</b>?', '',
    V, [shallow, digitsOnly, V * 10], '',
    'One whole is ' + qty(P10[j], j) + ', so ' + qty(w, 0) + ' is ' + qty(w * P10[j], j) +
    '. Adding the ' + PLACE_WORD[j] + ' already after the point gives ' + qty(V, j) + ' altogether.');
  q.decAuthored = [shallow, digitsOnly, V * 10].map(String);
  q.authored = [shallow, digitsOnly, V * 10];
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
  const reversed = w + ' + ' + dec.map((d, i) => term(d, dp - i)).join(' + ');
  const allTenths = w + ' + ' + dec.map(d => term(d, 1)).join(' + ');
  return mcText('Which of these shows <b>' + numStr + '</b> written as the sum of its place values?', '',
    key, [noPoint, reversed, allTenths],
    'Take ' + numStr + ' one place at a time: ' + qty(w, 0) + ', ' +
    dec.map((d, i) => qty(d, i + 1)).join(', ') + '. Written out that is ' + key + '.');
}

/* FORMAT 1f - error spotting, the mistake NAMED (pool 3, diagnose).
   Misconception: every digit after the point read as tenths. */
function gDecPlaceError() {
  const who = pick(NAMES);
  /* ALWAYS three decimal places, so all four options (ones, tenths, hundredths,
     thousandths) are the key exactly a quarter of the time. At dp = 2 the
     thousandths option could never be right and "never pick the longest word"
     became a small free edge. */
  const dp = 3;
  const ds = distinctDigits(dp + 1);
  const whole = ds[0], dec = ds.slice(1);
  const numStr = whole + '.' + dec.join('');
  const place = ri(0, dp);                    /* the ones digit is fair game too, so
                                                 the key is not confined to two of
                                                 the four options on every draw */
  const d = place === 0 ? whole : dec[place - 1];
  /* the claimed place is always a place this number actually HAS, so the mistake is
     a miscount and not a nonsense claim */
  const sayIdx = pick([1, 2, 3].filter(p => p !== place && p <= dp));
  const say = PLACE_WORD[sayIdx];
  const line = p => 'The ' + d + ' is in the ' + PLACE_WORD[p] + ' place, so it is worth ' + qty(d, p) + '.';
  return mcText(who + ' says the digit <b>' + d + '</b> in <b>' + numStr + '</b> is worth <b>' + qty(d, sayIdx) +
    '</b>. <b>What did ' + who + ' get wrong?</b>', '',
    line(place), [0, 1, 2, 3].filter(p => p !== place).map(line),
    'Count the places one at a time: the ones are before the decimal point, then tenths, hundredths and thousandths after it. In ' +
    numStr + ' the digit ' + d + ' is ' +
    (place === 0 ? 'before the point, so it is worth ' : 'number ' + place + ' after the point, so it is worth ') +
    qty(d, place) + ', which is ' + dtext(D(d, place)) + '. ' + qty(d, sayIdx) + ' would be ' +
    dtext(D(d, sayIdx)) + ', a different amount altogether.');
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
  return { q: 'Which decimal is the <b>' + (wantMax ? 'greatest' : 'smallest') + '</b>?', extra: '',
    choices: opts, correct: opts.indexOf(dtext(best)),
    explain: 'All four start with ' + qty(whole, 0) + ', so line the decimal points up and compare the tenths next' +
      (dp > 1 ? ', and then the hundredths if the tenths tie' : '') + '. The ' +
      (wantMax ? 'greatest' : 'smallest') + ' is ' + dtext(best) + '.',
    answerText: dtext(best) };
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
function gDecCmpError() {
  const who = pick(NAMES);
  let t = 6, h = 45, guard = 0;
  do { t = ri(3, 9); h = ri(11, t * 10 - 1); guard++; } while (guard < 200 && (h % 10 === 0 || h % 100 === 0));
  const small = D(h, 2), big = D(t, 1);
  const key = dtext(small) + ' is ' + qty(Math.floor(h / 10), 1) + ' and ' + qty(h % 10, 2) +
    ', which is less than ' + qty(t, 1) + ', so ' + dtext(big) + ' is the greater one.';
  const wrongs = [
    'Nothing is wrong. ' + h + ' is greater than ' + t + ', so ' + dtext(small) + ' is greater than ' + dtext(big) + '.',
    dtext(big) + ' should have been written as ' + dtext(D(t, 2)) + ' first, and then ' + dtext(small) + ' would be the greater one.',
    'The digits after the point should have been counted, because the number with more digits is always the greater one.'
  ];
  return mcText(who + ' says <b>' + dtext(small) + '</b> is greater than <b>' + dtext(big) +
    '</b>, because ' + h + ' is greater than ' + t + '. <b>What is wrong with that?</b>', '',
    key, wrongs,
    'Line the decimal points up and write both to the same length: ' + dtext(small) + ' and ' +
    dtext(D(t * 10, 2)) + '. Compare the tenths first. ' + qty(Math.floor(h / 10), 1) + ' is less than ' + qty(t, 1) +
    ', so ' + dtext(small) + ' is the smaller number. Counting digits does not tell you which decimal is bigger.');
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
    dtext(val) + ' is ' + w + ' whole ones with a bit left over, and the bit left over is less than one whole. ' +
    'So ' + dtext(val) + ' is more than ' + w + ' but less than ' + (w + 1) + ': it lies between ' + w + ' and ' + (w + 1) + '.');
}

/* FORMAT 2f - direct compute, rounding (pool 2). Three named slips: rounded the
   wrong way, looked at the LAST digit instead of the next one, rounded to the
   wrong place. */
function gDecRound() {
  let to = 1, val = D(3268, 3), key = D(33, 1), wrongDir = D(32, 1), lastSlip = D(32, 1),
      wrongPlace = D(3, 0), guard = 0, ok = false;
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
    wrongDir = D(d1 >= 5 ? key.n - 1 : key.n + 1, to);
    /* the LAST-digit slip only exists when there is more than one digit to drop;
       where there is only one, the slip on offer is "did not round at all". */
    lastSlip = dp > to + 1 ? D(base + (d2 >= 5 ? 1 : 0), to) : val;
    wrongPlace = dround(val, to === 0 ? 1 : to - 1);
    if (dp > to + 1 && (d1 >= 5) === (d2 >= 5)) continue;
    if (!(wrongDir.n > 0 && key.n > 0)) continue;
    if (!dallDistinct([key, wrongDir, lastSlip, wrongPlace])) continue;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) { to = 1; val = D(3268, 3); key = D(33, 1); wrongDir = D(32, 1); lastSlip = D(327, 2); wrongPlace = D(3, 0); }
  const lastDigit = lastSlip;
  return mcDec('Round <b>' + dtext(val) + '</b> to <b>' + roundPhrase(to) + '</b>.', '',
    key, [wrongDir, lastDigit, wrongPlace], '',
    'Look only at the digit just after the ' + (to === 0 ? 'ones' : PLACE_WORD[to]) + ' place: it is ' +
    d1Of(val, to) + '. Since ' + d1Of(val, to) + ' is ' +
    (d1Of(val, to) >= 5 ? '5 or more, round up' : '4 or less, round down') + ', ' + dtext(val) +
    ' rounded to ' + roundPhrase(to) + ' is ' + dtext(key) + '. The digits further along do not change the decision.');
}
/* the digit just after place `to` - the only digit rounding is allowed to look at */
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
    const outside = [hi, lo - 1, hi + ri(1, 4), lo - ri(2, 5)]
      .filter(h => h > 0 && h % 10 !== 0 && (h < lo || h >= hi));
    if (!inside.length || outside.length < 3) continue;
    key = D(pick(inside), dp);
    const picked = shuffle(outside).slice(0, 3).map(h => D(h, dp));
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
   Misconception: rounding UP on a 4 (or down on a 5). */
function gDecRoundError() {
  const who = pick(NAMES);
  const to = ri(0, 1);
  const upSlip = Math.random() < 0.7;                 /* mostly the "4 rounds up" slip */
  const nextDigit = upSlip ? ri(1, 4) : ri(5, 9);
  const base = ri(P10[to] + 1, 9 * P10[to]);          /* the truncated value, at dp `to` */
  const val = D(base * 10 + nextDigit, to + 1);
  const truth = dround(val, to);                      /* base when nextDigit < 5, base + 1 otherwise */
  const said = upSlip ? D(base + 1, to) : D(base, to);
  const placeName = to === 0 ? 'ones' : PLACE_WORD[to];
  const key = upSlip
    ? who + ' rounded up. The next digit is ' + nextDigit + ', and 4 or less rounds down, so the answer is ' + dtext(truth) + '.'
    : who + ' rounded down. The next digit is ' + nextDigit + ', and 5 or more rounds up, so the answer is ' + dtext(truth) + '.';
  const wrongs = [
    who + (upSlip ? ' rounded down. The next digit is ' + nextDigit + ', and 4 or more rounds up, so the answer is ' + dtext(said) + '.'
                                : ' rounded up. The next digit is ' + nextDigit + ', and 5 or less rounds down, so the answer is ' + dtext(said) + '.'),
    who + ' rounded to the wrong place, and should have rounded to ' + roundPhrase(to === 0 ? 1 : 0) + ' instead.',
    who + ' looked at every digit after the ' + placeName + ' place instead of only the next one.'
  ];
  return mcText(who + ' rounds <b>' + dtext(val) + '</b> to <b>' + roundPhrase(to) + '</b> and says the answer is <b>' +
    dtext(said) + '</b>. <b>What went wrong?</b>', '', key, wrongs,
    'Rounding looks at one digit only: the very next one after the ' + placeName + ' place. Here that digit is ' +
    nextDigit + ', so ' + dtext(val) + ' rounds ' + (upSlip ? 'down' : 'up') + ' to ' + dtext(truth) + ', not ' +
    dtext(said) + '. The rule is 5 or more rounds up, and 4 or less rounds down.');
}

/* FORMAT 2i - two-step word problem, SG wet market (pool 3): add, THEN round. */
function gDecRoundSum() {
  const who = pick(NAMES);
  let a = D(267, 2), b = D(18, 1), total = D(447, 2), key = 4, guard = 0, ok = false;
  let doubleRound = 5, chopped = 3, subtracted = 1;
  do {
    guard++;
    a = D(ri(110, 480), 2);
    b = D(ri(11, 39), 1);
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
    if (new Set([key, doubleRound, chopped, subtracted]).size !== 4) continue;
    if (key < 2 || chopped < 1 || subtracted < 1) continue;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) { a = D(267, 2); b = D(18, 1); total = D(447, 2); key = 4; doubleRound = 5; chopped = 3; subtracted = 1; }
  const fruit = pick([['papaya', 'pineapple'], ['bag of rice', 'bag of onions'], ['bunch of bananas', 'watermelon']]);
  const q = finishNum('At the wet market ' + who + ' buys a ' + fruit[0] + ' weighing <b>' + dtext(a) +
    ' kg</b> and a ' + fruit[1] + ' weighing <b>' + dtext(b) + ' kg</b>. <b>Rounded to the nearest kilogram</b>, ' +
    'what is the total mass of the two together?', '',
    key, [doubleRound, chopped, subtracted], 'kg',
    'Step 1: add the two masses. ' + dtext(a) + ' + ' + dtext(b) + ' = ' + dtext(total) +
    ' kg. Step 2: round ' + dtext(total) + ' to the nearest whole number. The digit just after the ones place is ' +
    Math.floor((total.n % 100) / 10) + ', which is 4 or less, so it rounds down to ' + key +
    ' kg. Add first and round ONCE: rounding ' + dtext(total) + ' to 1 decimal place first and then again gives ' +
    doubleRound + ' kg, which is not the same thing.');
  q.decAuthored = [doubleRound, chopped, subtracted].map(v => v + ' kg');
  q.authored = [doubleRound, chopped, subtracted];
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
    n = ri(1, den - 1);
    key = D(n, dp);
    shallow = dnat(D(n * 10, dp));                 /* read hundredths as tenths */
    complement = D(den - n, dp);                   /* took it away from the whole */
    tacked = D(den + n, dp);                       /* wrote the denominator and the numerator side by side */
    /* n must not end in 0, or the key prints a trailing zero ("0.540" for 540/1000)
       and so does every distractor built from it. */
  } while (guard < 300 && !(n % 10 !== 0 && dallDistinct([key, shallow, complement, tacked])));
  return mcDec('Write ' + fr(n, den) + ' as a decimal.', '',
    key, [shallow, complement, tacked], '',
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
  const rest = D(parts - filled, 1);
  const tooDeep = D(filled, 2);
  const noPoint = D(filled, 0);
  const q = mcDec('Each strip below is <b>one whole</b> cut into <b>10 equal parts</b>. ' +
    '<b>What decimal does the shaded part show?</b>', '',
    key, [rest, tooDeep, noPoint], '',
    'The whole is cut into 10 equal parts, so each part is one tenth. ' + filled +
    ' parts are shaded, which is ' + qty(filled, 1) + ', and ' + qty(filled, 1) + ' is written ' + dtext(key) + '.');
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
  const cands = [[n, den * 10], [den - n, den], dp === 1 ? [n, den + 1] : [revDigits, den]];
  return finishFrac('Write <b>' + dtext(val) + '</b> as a fraction in its <b>simplest form</b>.', '',
    [n, den], cands,
    dtext(val) + ' is ' + qty(n, dp) + ', and ' + PLACE_WORD[dp] + ' go over ' + den +
    '. So ' + dtext(val) + ' is ' + n + ' over ' + den + ', and because ' + n + ' and ' + den +
    ' share no common factor that is already the simplest form.', 4);
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
  const tenthsShape = Math.random() < 0.6;
  const d = ri(2, 9);                          /* 1 would read "1 cents" in the claim */
  const val = tenthsShape ? D(d, 1) : D(d, 2);
  const truePlace = tenthsShape ? 1 : 2, wrongPlace = tenthsShape ? 2 : 1;
  const trueCents = tenthsShape ? d * 10 : d;
  const claimCents = tenthsShape ? d : d * 10;
  const key = dtext(val) + ' of a dollar is ' + qty(d, truePlace) + ' of a dollar, which is ' + trueCents + ' cents.';
  const wrongs = [
    'Nothing is wrong. ' + dtext(val) + ' of a dollar really is ' + claimCents + ' cents.',
    dtext(val) + ' of a dollar is ' + qty(d, wrongPlace) + ' of a dollar, which is ' + claimCents + ' cents.',
    dtext(val) + ' of a dollar is ' + d + ' dollars, because the ' + d + ' is the only digit that counts.'
  ];
  return mcText(who + ' says that <b>' + dtext(val) + ' of a dollar</b> is <b>' + claimCents +
    ' cents</b>. <b>What is wrong with that?</b>', '', key, wrongs,
    'One dollar is 100 cents, so one tenth of a dollar is 10 cents and one hundredth of a dollar is 1 cent. ' +
    dtext(val) + ' of a dollar is ' + qty(d, truePlace) + ', which is ' + trueCents +
    ' cents, written ' + money(trueCents) + '. ' + claimCents + ' cents would be written ' + money(claimCents) + '.');
}

/* FORMAT 3f - two-step word problem, SG money (pool 3): cents over 100, then
   simplify. The decimal is printed alongside so the two spellings sit together. */
const CENT_PRICES = [5, 15, 20, 25, 40, 45, 50, 60, 75, 80];
function gDecMoneyFrac() {
  const cents = pick(CENT_PRICES);
  const g = gcd(cents, 100);
  const n = cents / g, den = 100 / g;
  const item = pick(['a packet of sweets', 'an eraser', 'a rubber band ball', 'a sticker sheet', 'a paper clip box']);
  const red = (a, b) => { const g2 = gcd(a, b); return [a / g2, b / g2]; };
  const cands = [red(100 - cents, 100),      /* the rest of the dollar */
                 red(cents, 1000),           /* one place too far */
                 red(cents + 5, 100)];       /* misread the price by five cents */
  return finishFrac('At the school bookshop ' + item + ' costs <b>' + cents + ' cents</b>, which is written <b>' +
    money(cents) + '</b>. <b>What fraction of one dollar is that, in its simplest form?</b>', '',
    [n, den], cands,
    'Step 1: one dollar is 100 cents, so ' + cents + ' cents is ' + cents + ' out of 100, or ' + cents +
    ' over 100 - the same as the two hundredths digits in ' + money(cents) + '. Step 2: ' + cents + ' and 100 both divide by ' +
    g + ', so ' + cents + ' over 100 simplifies to ' + n + ' over ' + den + '.', 4);
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
  let a = 0, b = 0, key = 0, noCarry = 0, other = 0, overCarry = 0, guard = 0;
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
  } while (guard < 300 && !(key % 10 !== 0 && key > 0 && noCarry > 0 && other > 0 &&
           a % 10 !== 0 && b % 10 !== 0 &&
           new Set([key, noCarry, other, overCarry]).size === 4));
  const A = D(a, dp), B = D(b, dp), K = D(key, dp);
  const sign = addMode ? '+' : '−';
  return mcDec('<b>' + dtext(A) + ' ' + sign + ' ' + dtext(B) + ' = ?</b>', '',
    K, [D(noCarry, dp), D(other, dp), D(overCarry, dp)], '',
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
  } while (guard < 300 && !(key % 100 !== 0 && subtracted > 0 &&
           spent % 100 !== 0 && left % 100 !== 0 &&          /* "$2.00" teaches no decimals */
           new Set([key, subtracted, noCarry, dropped]).size === 4));
  return mcMoney(who + ' spends <b>' + money(spent) + '</b> at ' + pick(SHOPS) + ' and has <b>' + money(left) +
    '</b> left. <b>How much money did ' + who + ' have at first?</b>', '',
    key, [subtracted, noCarry, dropped],
    'Work backwards: the money at the start is the money spent plus the money left over. Line the decimal points up and add: ' +
    money(spent) + ' + ' + money(left) + ' = ' + money(key) + '. Taking one amount from the other answers a different question.');
}

/* FORMAT 4c - compare two prices, SG supermarket (pool 2, two steps). */
function gDecMoneyMore() {
  const [who] = pickNames(1);
  const goods = pick([['a carton of milk', 'a loaf of bread'], ['a packet of rice', 'a bottle of oil'],
                      ['a tray of eggs', 'a bag of onions'], ['a tub of yoghurt', 'a packet of biscuits']]);
  let hi = 345, lo = 280, key = 65, guard = 0;
  let total = 625, noBorrow = 135, wholeOnly = 100;
  do {
    guard++;
    hi = ri(150, 890); lo = ri(105, hi - 20);
    key = hi - lo;
    total = hi + lo;                                       /* added instead of comparing */
    noBorrow = digitwiseDiff(hi, lo, 2);                   /* smaller digit from larger in every column */
    wholeOnly = (Math.floor(hi / 100) - Math.floor(lo / 100)) * 100;   /* ignored the cents */
  } while (guard < 300 && !(key % 100 !== 0 && wholeOnly > 0 && noBorrow > 0 &&
           hi % 100 !== 0 && lo % 100 !== 0 &&               /* "$2.00" teaches no decimals */
           new Set([key, total, noBorrow, wholeOnly]).size === 4));
  return mcMoney('At NTUC ' + goods[0] + ' costs <b>' + money(hi) + '</b> and ' + goods[1] + ' costs <b>' +
    money(lo) + '</b>. <b>How much more does ' + goods[0].replace(/^an? /, 'the ') + ' cost?</b>', '',
    key, [total, noBorrow, wholeOnly],
    'Step 1: line the decimal points up. Step 2: subtract, exchanging a dollar for 100 cents when the cents will not go: ' +
    money(hi) + ' − ' + money(lo) + ' = ' + money(key) + '. Adding the two prices tells you what both cost together, which is a different question.');
}

/* FORMAT 4d - error spotting, the mistake NAMED (pool 3, CORRECT the mistake).
   Misconception: lining up the last digits instead of the decimal points. */
function gDecAlignError() {
  const who = pick(NAMES);
  let w = 7, d = 4, guard = 0;
  do { w = ri(1, 9); d = ri(1, 9); guard++; }
  while (guard < 200 && !dallDistinct([D(w * 10 + d, 1), D(w + d, 1), D(w + d, 0), D(w * 100 + d, 2)]));
  const key = D(w * 10 + d, 1);                /* 7 + 0.4 = 7.4 */
  const claim = D(w + d, 1);                   /* 0.7 + 0.4 = 1.1, what lining up the last digits gives */
  const noPoint = D(w + d, 0);                 /* 7 + 4 = 11 */
  const tooDeep = D(w * 100 + d, 2);           /* put the 4 in the hundredths place */
  return mcDec(who + ' works out <b>' + w + ' + ' + dtext(D(d, 1)) + '</b>. ' + who +
    ' writes the ' + d + ' underneath the ' + w + ' and gets <b>' + dtext(claim) +
    '</b>. <b>What is the correct answer?</b>', '',
    key, [claim, noPoint, tooDeep], '',
    'Line up the decimal POINTS, not the last digits. ' + w + ' is ' + qty(w, 0) + ' and ' + dtext(D(d, 1)) +
    ' is ' + qty(d, 1) + ', so together they make ' + qty(w, 0) + ' and ' + qty(d, 1) + ', which is ' + dtext(key) +
    '. Writing the ' + d + ' under the ' + w + ' adds ' + qty(d, 1) + ' to ' + qty(w, 1) + ' instead, and that is where ' +
    dtext(claim) + ' comes from.');
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

/* FORMAT 4f - concept check: WHICH calculation? (pool 1, muldiv anchor) */
function gDecMulConcept() {
  let cents = 125, n = 6, guard = 0;
  do { cents = pick([105, 115, 120, 125, 135, 140, 145, 150, 160, 175, 180, 195]); n = ri(3, 9); guard++; }
  while (guard < 200 && !(n * cents !== n * 100 + cents && cents !== n * 100));
  const item = pick(['a pen', 'an exercise book', 'a ruler', 'a glue stick', 'a pencil']);
  const key = n + ' × ' + money(cents);
  const wrongs = [n + ' + ' + money(cents), money(cents) + ' ÷ ' + n, n + ' ÷ ' + money(cents)];
  return mcText('At the school bookshop ' + item + ' costs <b>' + money(cents) + '</b>. <b>Which calculation</b> gives the cost of <b>' +
    n + '</b> of them?', '', key, wrongs,
    'Buying ' + n + ' of the same thing means ' + n + ' equal groups of ' + money(cents) + ', so you multiply: ' +
    n + ' × ' + money(cents) + ' = ' + money(n * cents) + '. Dividing would share one price out instead of repeating it.');
}

/* FORMAT 4g - direct compute: a decimal times a 1-digit whole number (pool 2) */
function gDecMulWhole() {
  let dp = 1, a = 36, n = 4, guard = 0;
  do { dp = ri(1, 2); a = ri(P10[dp] + 1, 9 * P10[dp]); n = ri(2, 9); guard++; }
  while (guard < 300 && !((a * n) % 10 !== 0 && a % 10 !== 0 &&
         dallDistinct([D(a * n, dp), D(a + n * P10[dp], dp), D(a * n, dp + 1), D(a * n, dp - 1)])));
  const A = D(a, dp), key = D(a * n, dp);
  return mcDec('<b>' + dtext(A) + ' × ' + n + ' = ?</b>', '',
    key, [D(a + n * P10[dp], dp), D(a * n, dp + 1), D(a * n, dp - 1)], '',
    'Multiply as if there were no decimal point: ' + a + ' × ' + n + ' = ' + (a * n) + '. ' + dtext(A) +
    ' has ' + dp + ' digit' + (dp > 1 ? 's' : '') + ' after the point, so the answer has ' + dp +
    ' too: ' + dtext(key) + '. Adding instead of multiplying answers a different question.');
}

/* FORMAT 4h - direct compute: a decimal shared by a 1-digit whole number (pool 2) */
function gDecDivWhole() {
  let dp = 1, key = 24, n = 3, guard = 0;
  do { dp = ri(1, 2); key = ri(P10[dp] + 1, 4 * P10[dp]); n = ri(2, 9); guard++; }
  while (guard < 300 && !(key % 10 !== 0 && (key * n) % 10 !== 0 && key * n !== n * P10[dp] &&
         dallDistinct([D(key, dp), D(key, dp + 1), D(key, dp - 1), D(Math.abs(key * n - n * P10[dp]), dp)])));
  const total = key * n;
  const T = D(total, dp), K = D(key, dp);
  return mcDec('<b>' + dtext(T) + ' ÷ ' + n + ' = ?</b>', '',
    K, [D(key, dp + 1), D(key, dp - 1), D(Math.abs(total - n * P10[dp]), dp)], '',
    'Divide as if there were no decimal point: ' + total + ' ÷ ' + n + ' = ' + key + '. ' + dtext(T) +
    ' has ' + dp + ' digit' + (dp > 1 ? 's' : '') + ' after the point, so the answer keeps the point in the same column: ' +
    dtext(K) + '. Check it by multiplying back: ' + dtext(K) + ' × ' + n + ' = ' + dtext(T) + '.');
}

/* FORMAT 4i - word problem, SG running track (pool 2, measures) */
function gDecTrack() {
  const who = pick(NAMES);
  let lap = 4, laps = 6, guard = 0;
  do { lap = ri(2, 9); laps = ri(3, 9); guard++; }
  while (guard < 200 && !(lap !== laps && (lap * laps) % 10 !== 0 &&
         dallDistinct([D(lap * laps, 1), D(lap + laps * 10, 1), D(lap * laps, 2), D(lap * laps, 0)])));
  const L = D(lap, 1), key = D(lap * laps, 1);
  const where = pick(['the stadium', 'the school field', 'the sports hall', 'the park connector loop']);
  return mcDec('One lap of the running track at ' + where + ' is <b>' + dtext(L) + ' km</b>. ' + who +
    ' runs <b>' + laps + '</b> laps. <b>How far does ' + who + ' run altogether?</b>', '',
    key, [D(lap + laps * 10, 1), D(lap * laps, 2), D(lap * laps, 0)], 'km',
    laps + ' laps of ' + dtext(L) + ' km means ' + laps + ' equal groups, so multiply: ' + lap + ' × ' + laps +
    ' = ' + (lap * laps) + ' tenths of a kilometre, which is ' + dtext(key) + ' km. Adding the lap length to the number of laps answers nothing.');
}

/* FORMAT 4j - two-step word problem, SG petrol kiosk (pool 3): multiply, then
   take away from the note. */
function gDecPetrol() {
  const who = pick(NAMES);
  let rate = 235, litres = 8, note = 20, guard = 0, ok = false;
  let key = 120, stopped = 1880, ratePaid = 1765, noBorrow = 280;
  do {
    guard++;
    rate = ri(165, 285); litres = ri(4, 9); note = pick([20, 50]);
    if (rate % 100 === 0) continue;                           /* "$2.00" teaches no decimals */
    const cost = rate * litres;
    if (cost >= note * 100 || cost % 100 === 0) continue;
    key = note * 100 - cost;
    stopped = cost;                                     /* stopped after step 1 */
    ratePaid = note * 100 - rate;                       /* took away one litre's price, not the whole cost */
    noBorrow = digitwiseDiff(note * 100, cost, 2);      /* smaller digit from larger in every column */
    if (key <= 0 || key % 100 === 0) continue;
    if (new Set([key, stopped, ratePaid, noBorrow]).size !== 4) continue;
    if (noBorrow <= 0) continue;
    ok = true;
    break;
  } while (guard < 400);
  if (!ok) { rate = 235; litres = 8; note = 20; key = 120; stopped = 1880; ratePaid = 1765; noBorrow = 280; }
  return mcMoney('At the petrol kiosk ' + who + ' pumps <b>' + litres + ' litres</b> of petrol at <b>' +
    money(rate) + ' per litre</b> and pays with a <b>$' + note + '</b> note. <b>How much change is there?</b>', '',
    key, [stopped, ratePaid, noBorrow],
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
  } while (guard < 300 && !(total % 10 !== 0 && (per * want) % 10 !== 0 &&
           dallDistinct([D(per * want, 1), D(per, 1), D(total * want, 1), D(total - per, 1)])));
  const key = per * want;
  const goods = pick([['prawns', 'trays'], ['fishballs', 'packets'], ['chicken wings', 'boxes'], ['kang kong', 'bundles']]);
  return mcDec('A stall at the wet market packs <b>' + dtext(D(total, 1)) + ' kg</b> of ' + goods[0] +
    ' equally into <b>' + trays + '</b> ' + goods[1] + '. <b>How much do ' + want + ' of the ' + goods[1] +
    ' hold altogether?</b>', '',
    D(key, 1), [D(per, 1), D(total * want, 1), D(total - per, 1)], 'kg',
    'Step 1: share the ' + dtext(D(total, 1)) + ' kg into ' + trays + ' equal ' + goods[1] + ': ' + total +
    ' ÷ ' + trays + ' = ' + per + ' tenths, so one ' + goods[1].replace(/e?s$/, '') + ' holds ' + dtext(D(per, 1)) +
    ' kg. Step 2: ' + want + ' of them hold ' + dtext(D(per, 1)) + ' × ' + want + ' = ' + dtext(D(key, 1)) +
    ' kg. Stopping after the sharing gives one ' + goods[1].replace(/e?s$/, '') + ' only.');
}


  MQI.registerTopic({
    id: 'decimals', level: 'P4', strand: 'Number and Algebra',
    moeSubTopic: 'Decimals: notation, representations and place values (tenths, hundredths, thousandths); ' +
      'comparing and ordering decimals; expressing decimals as fractions and fractions as decimals; ' +
      'rounding decimals to the nearest whole number, 1 decimal place and 2 decimal places; ' +
      'adding and subtracting decimals; multiplying and dividing decimals by a 1-digit whole number',
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
      1: [[gDecDigitValue, 'place'], [gDecNamePlace, 'place'], [gDecCompare, 'compare'],
          [gDecBetween, 'round'], [gFracToDec, 'convert'], [gDecBar, 'convert'],
          [gDecAddSub, 'addsub'], [gDecMulConcept, 'muldiv']],
      2: [[gDecBuild, 'place'], [gDecHowMany, 'place'], [gDecCmpMixed, 'compare'], [gDecOrder, 'compare'],
          [gDecRound, 'round'], [gDecToFrac, 'convert'], [gFracEquivDec, 'convert'],
          [gDecStartAmount, 'addsub'], [gDecMoneyMore, 'addsub'],
          [gDecMulWhole, 'muldiv'], [gDecDivWhole, 'muldiv'], [gDecTrack, 'muldiv']],
      3: [[gDecExpand, 'place'], [gDecPlaceError, 'place'], [gDecCmpError, 'compare'],
          [gDecRoundBack, 'round'], [gDecRoundError, 'round'], [gDecRoundSum, 'round'],
          [gDecFracError, 'convert'], [gDecMoneyFrac, 'convert'],
          [gDecAlignError, 'addsub'], [gDecMoneyChange, 'addsub'],
          [gDecPetrol, 'muldiv'], [gDecShareMass, 'muldiv']]
    }
  });
})();
