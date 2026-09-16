/* FROZEN v10 p3numbers generators - NEGATIVE CONTROLS for the gen-sanity rulers.
 *
 * gPatternConcept, gAddConcept and gCompareError exactly as they stood at commit
 * 91b1178 (v10 of js/topics/p3-whole-numbers.js), copied VERBATIM together with
 * the helpers they reach in js/core.js and in the topic file's own house-helper
 * block at that same commit. gCompareError does not exist after v10 - it was
 * deleted in v11 - so 91b1178 is its only source.
 *
 * THESE ARE SUPPOSED TO BE DEFECTIVE. tools/gen-sanity.mjs points its rulers at
 * them to prove the rulers still go red on a board that is learnable. Never
 * "fix", tidy, simplify or re-derive anything below: the measured numbers are the
 * fixture, and any edit - including one that looks like a no-op - invalidates the
 * control. If v10's behaviour is wrong, that is the point.
 *
 * Source: git show 91b1178:js/topics/p3-whole-numbers.js
 *         git show 91b1178:js/core.js
 * Self-contained: depends on nothing but Math.random.
 */

/* ---- from js/core.js @ 91b1178 --------------------------------------- */
function ri(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function pick(arr){ return arr[ri(0,arr.length-1)]; }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=ri(0,i); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function finishNum(qHtml, extraHtml, correct, cands, unit, explain){
  const nums=[correct];
  for(const c of shuffle(cands)){
    if(nums.length>=4) break;
    if(c>0 && Number.isInteger(c) && !nums.includes(c)) nums.push(c);
  }
  let t=1;
  while(nums.length<4){
    if(!nums.includes(correct+t)) nums.push(correct+t);
    else if(correct-t>0 && !nums.includes(correct-t)) nums.push(correct-t);
    t++; if(t>60) break;
  }
  /* W3 cosmetic (Dress Rehearsal Wave 2, item 3): a degree sign and a percent sign
     are written TIGHT against the number ("40°", "75%"), the way every stem in the
     app writes them; a word unit keeps its space ("12 cm"). The old ' '+unit made
     the angle options read "40 °" beside a stem reading "50°". */
  const u=unit?((unit==='°'||unit==='%')?unit:(' '+unit)):'';
  const order=shuffle(nums.map((_,i)=>i));
  return { q:qHtml, extra:extraHtml||'', choices:order.map(i=>nums[i]+u), correct:order.indexOf(0),
           explain, answerText: correct+u };
}

/* ---- house helpers, from js/topics/p3-whole-numbers.js @ 91b1178 ------ */
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
  const pl = (v, w) => v + ' ' + w + (v === 1 ? '' : 's');
  const plPlace = (v, i) => pl(v, PLACE1[i]);
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
  function slipWhy(cands, pairs){
    for (const p of pairs) if (cands.indexOf(p[0]) !== -1) return p;
    return null;
  }
  const colDigits = n => String(n).split('').reverse();      /* index 0 = ones */
  /* one right-aligned column of four printed numbers; a number that does not
     reach a column has a BLANK there, and a blank is a symbol like any other */
  function colCell(d, k, i){ return i < d[k].length ? d[k][i] : ' '; }
  function colWidth(d){ let w = 0; for (const x of d) if (x.length > w) w = x.length; return w; }
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
  function mcText(stem, extra, correctText, wrongs, explain){
    const opts = shuffle([correctText].concat(wrongs.slice(0, 3)));
    return { q: stem, extra: extra || '', choices: opts, correct: opts.indexOf(correctText),
             explain: explain, answerText: correctText };
  }
  function numOf(d){ return d[0]*1000 + d[1]*100 + d[2]*10 + d[3]; }
  function digitsOf(n){
    const d = [];
    for (let i = 0; i < 4; i++) d.push(Math.floor(n / POW[i]) % 10);
    return d;
  }
  const digitSum = n => digitsOf(n).reduce((s, d) => s + d, 0);
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

/* ---- the three frozen generators, verbatim from 91b1178 --------------- */
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

const STEP_WORD = { 10: 'tens', 100: 'hundreds', 1000: 'thousands' };

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

/* ---- the frozen surface ---------------------------------------------- */
export function gPatternConceptV10(){ return gPatternConcept(); }
export function gAddConceptV10(){ return gAddConcept(); }
export function gCompareErrorV10(){ return gCompareError(); }

/* =======================================================================
   v11 gStandsError, frozen at 21e2417 and RETIRED at v12.

   This one is NOT a v10 generator, and it is here for the same reason the
   three above are: it is the negative control the STEM ruler needs, and a
   control that lives in the file it is controlling stops being a control
   the moment the file is fixed. The eleventh pass killed this bank at
   100.00 / 100.00% by counting the characters in the claim the stem prints
   ("one -> she wrote the digit; two or three -> one column right; four ->
   one column left"), and the harness printed 70.3 / 69.4% for the same
   route because it scored the WHOLE option string, `He `/`She ` prefix and
   all, and the pronoun is supplied by the stem's own child's name. With
   the key normalised for what the stem already gives away, this must come
   out at ~100% on NUMERAL LENGTHS. If it ever does not, the normalisation
   has stopped working and the ruler is back to diluting prose banks.

   Do not "fix" it. It is supposed to be answerable without reading the
   number.  Copied verbatim from js/topics/p3-whole-numbers.js @ 21e2417.
   ======================================================================= */
  function digits4v11(){ return shuffle([1,2,3,4,5,6,7,8,9]).slice(0,4); }
  const placeListV11 = d => d.map((v, i) => v + ' ' + PLACE1[i] + (v === 1 ? '' : 's')).join(', ');
  const STANDS_SLIPS = {
    digit: ' wrote the digit, not what it is worth.',
    right: ' used the column one place to the right.',
    left:  ' used the column one place to the left.'
  };
  const STANDS_FILLER_SLIPS = {
    sum:  ' added up all four digits of the number.',
    next: ' wrote the digit that comes next in it.'
  };
  const STANDS_FILLERS = Object.keys(STANDS_FILLER_SLIPS).map(k => STANDS_FILLER_SLIPS[k]);
  const STANDS_READINGS = Object.keys(STANDS_SLIPS).concat(Object.keys(STANDS_FILLER_SLIPS));
  function standsClaim(k, dig, p, d){
    if (k === 'digit') return dig;
    if (k === 'right') return p < 3 ? dig * POW[p+1] : null;
    if (k === 'left')  return p > 0 ? dig * POW[p-1] : null;
    if (k === 'sum')   return digitSum(numOf(d));
    if (k === 'next')  return p < 3 ? d[p+1] : null;
    return null;
  }
  function gStandsErrorV11impl(){
    const kid = pick(KIDS), who = kid[0], pron = kid[1];
    const named = Object.keys(STANDS_SLIPS);
    let d = digits4v11(), p = 0, dig = d[0], chosenKey = 'digit', claim = dig, g = 0;
    do {
      d = digits4v11(); p = ri(0,1); dig = d[p];
      const val = dig * POW[p];
      const usable = named.filter(k => { const c = standsClaim(k, dig, p, d); return c !== null && c !== val && ok(c); });
      chosenKey = usable.length ? pick(usable) : null;
      claim = chosenKey ? standsClaim(chosenKey, dig, p, d) : null;
      g++;
    } while (g < 200 && !(chosenKey !== null &&
             STANDS_READINGS.filter(k => standsClaim(k, dig, p, d) === claim).length === 1));
    const n = numOf(d), val = dig * POW[p];
    const wrongs = named.filter(k => k !== chosenKey && standsClaim(k, dig, p, d) !== claim)
      .map(k => pron + STANDS_SLIPS[k])
      .concat(STANDS_FILLERS.map(f => pron + f));
    return mcText('In ' + n + ', ' + who + ' says the digit ' + dig + ' stands for ' + claim +
      '. <b>What did ' + pron.toLowerCase() + ' do wrong?</b>', '',
      pron + STANDS_SLIPS[chosenKey], shuffle(wrongs),
      'Read the places from the left: ' + placeListV11(d) + '. The ' + dig + ' sits in the ' + PLACES[p] +
      ' place, so it stands for ' + dig + ' × ' + POW[p] +
      ' = ' + val + ', not ' + claim + '.');
  }
export function gStandsErrorV11(){ return gStandsErrorV11impl(); }

/* =======================================================================
   v11 gAddConcept, frozen at 21e2417 and WIDENED at v12.

   The negative control for the STEM ABSTRACTION gate. Its option row is
   worth exactly chance (7 rows, 25.9 / 26.2%) and its STEM table is not:
   the eleventh pass abstracted it the way a child does and found 42 rows
   at 70.81 / 71.31% recall, served 3.31 a session - four for four against
   the lane's own board gate, on a surface that gate could not see. On two
   draws in five the stem NAMES the column the carry is written above, and
   with the column named the key is a function of the stem.

   Do not "fix" it. Copied verbatim from js/topics/p3-whole-numbers.js @
   21e2417; the live bank has since been widened so its stem never names
   the column.
   ======================================================================= */
  function gAddConceptV11impl(){
  const keep = ri(2, 8), s = 10 + keep;
  /* the 2x2 grid: {the carried 1, the digit that stays} x {hundreds, tens} */
  const cands4 = [POW[1], POW[2], keep * POW[1], keep * POW[2]];
  const key = pick(cands4);
  const cands = cands4.filter(v => v !== key);
  /* the key names the question and the column it is read in:
       POW[c]          -> the carried 1 above column c, which came from column c+1
       keep * POW[m]   -> the digit that stays in column m, whose 1 went to m-1 */
  const carry = key === POW[1] || key === POW[2];
  const col = carry ? (key === POW[1] ? 1 : 2) : (key === keep * POW[1] ? 0 : 1);
  const src = col + 1;

  /* the two numbers, built column by column so the stem's claim is true as
     printed: the columns to the RIGHT of src carry nothing into it, so the src
     column really does make s on its own, and no column to its LEFT can reach ten
     even after the carry lands. */
  const A = [0,0,0,0], B = [0,0,0,0];
  A[src] = ri(Math.max(3, s - 9), Math.min(9, s - 3)); B[src] = s - A[src];
  for (let i = src + 1; i < 4; i++){ A[i] = ri(0, 4); B[i] = ri(0, 9 - A[i]); }
  for (let i = 1; i < src; i++){ A[i] = ri(0, 4); B[i] = ri(0, 4); }
  A[0] = ri(1, 4); B[0] = ri(1, 4);
  const a = numOf(A), b = numOf(B);

  const kid = pick(KIDS), who = kid[0], pron = kid[1].toLowerCase();
  /* W2, seventh pass: on three draws in five the stem does not name the column
     the 1 is written above, so the child has to FIND the column that makes s
     before there is a place name to read. Exactly one column can: every column
     to the right of src is built to total under 10 and every column to its left
     under 9, while s is 12-18. */
  const bySum = ri(0, 4) >= 2;
  const ask = carry
    ? '<b>How much is that small 1 worth?</b>'
    : '<b>How much is the ' + keep + ' ' + pron + ' writes there worth?</b>';
  const stem = bySum
    ? who + ' works out ' + a + ' + ' + b + ' in columns. One column makes ' + s + ', so ' + pron +
      ' writes ' + keep + ' in that column and a small 1 above the column on its left. ' + ask
    : who + ' works out ' + a + ' + ' + b + ' in columns. The ' + PLACES[src] + ' column makes ' + s +
      ', so ' + pron + ' writes ' + keep + ' in the ' + PLACES[src] + ' column and a small 1 above the ' +
      PLACES[col] + ' column. ' + ask;
  const found = bySum
    ? 'The column that makes ' + s + ' is the ' + PLACES[src] + ' column: ' + A[src] + ' + ' + B[src] +
      ' = ' + s + ', and no other column reaches ten. '
    : '';
  return mcNum(stem, '', key, cands, '',
    found + s + ' ' + PLACES[src] + ' is ' + plPlace(1, col) + ' and ' + plPlace(keep, src) + ', so the ' +
    keep + ' stays in the ' + PLACES[src] + ' column - worth ' + (keep * POW[src]) + ' - and the small 1 ' +
    'goes above the ' + PLACES[col] + ' column - worth ' + POW[col] + '. ' +
    (carry ? 'The small 1 is worth ' + key + '.' : 'The ' + keep + ' is worth ' + key + '.') +
    ' A mark is worth the column it is written in, not the digit it looks like: that is what ' +
    'regrouping means, ten of something small becoming one of the next size up. Every wrong answer ' +
    'here is one of the two slips - the right digit read in the wrong column, or the wrong digit ' +
    'read in the right one.');
}
export function gAddConceptV11(){ return gAddConceptV11impl(); }
