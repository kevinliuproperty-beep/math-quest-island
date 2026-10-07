"use strict";
/* Math Quest Island topic: geometry (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 *
 * DEPTH PILOT 2026-09-05 (Kevin 23:02 "think like a teacher asking questions in
 * different formats, variety while testing the principles").
 * PRINCIPLE: perimeter is the total distance all the way around a flat shape;
 * area is the space inside it, and the two are not the same measurement.
 * FORMAT BANK (one principle, many stems a teacher would rotate through):
 *   direct compute (gPeri), concept check (gPeriConcept),
 *   compare two figures (gPeriCompare), error spotting (gPeriError),
 *   two-step word problem (gPeriFence), area (gAreaRect, gSquareArea).
 *   (gSquarePA was split into gSquarePeri/gSquareArea by main's wave-3 blocker
 *   fix and integrated here on 2026-09-15; the pilot's redraws ride on both.)
 *
 * DEPTH PILOT v2, 2026-09-05 (refutation kills 2 + 3, wound 1):
 *  - SCOPE. gPeriInverse and gPeriDouble are gone: perimeter-in / side-out is
 *    MOE P4 1.1 and 1.2, and `p4area` already carries both as
 *    gRectSideFromPerimeter and gSquareSideFromPerimeter. gPeriFromArea moved
 *    verbatim into p4-area-perimeter.js (P4 1.1, skill `missing`, pool 2).
 *    The legacy gMissSide stays put pending its own scope pass.
 *  - COINCIDENCE BAN. No rectangle in this file may print the same number for
 *    its perimeter and its area, and no named distractor may collide with the
 *    key or with another distractor. Enforced by redraw here and asserted
 *    independently in tools/gen-sanity.mjs.
 * Every stem is re-derived from its rendered text by an oracle in
 * tools/gen-sanity.mjs; nothing is trusted from the generator's own answerText.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

/* ---- COINCIDENCE BAN (refutation kill 3, 2026-09-05) ----------------------
   paOk: the figure's perimeter and its area must not print the same number.
   "A square has sides of 4 cm" (perimeter 16, area 16) is the item Kevin stops
   on, and in a which-calculation stem the coincidence makes two options
   defensible outright (6 by 3: 6 + 3 + 6 + 3 = 18 AND 6 x 3 = 18).
   optsOk: every NAMED distractor must be a positive integer, distinct from the
   key and from every other named distractor. finishNum shuffles the candidate
   list, so a collision anywhere in it can surface; requiring the whole list to
   be clean also means the padding branch never fires and the authored-
   distractor contract binds on every draw. */
function paOk(L,B){ return 2*(L+B) !== L*B; }
function optsOk(correct, cands){
  const s = new Set([correct]);
  for (const c of cands){
    if (!Number.isInteger(c) || c <= 0 || s.has(c)) return false;
    s.add(c);
  }
  return true;
}

/* Numeric MC whose distractors are all AUTHORED misconceptions: the helper only
   stamps q.authored when three named wrong answers survived (distinct, positive,
   never equal to the key), so the harness's distractor-identity contract binds. */
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
/* Word-answer MC (concept checks, error diagnosis). Distractors are hand-written
   misconceptions, so they are distinct by authoring, not by arithmetic. */
function mcText(stem, extra, correctText, wrongs, explain){
  const opts = shuffle([correctText].concat(wrongs.slice(0, 3)));
  return { q: stem, extra: extra || '', choices: opts, correct: opts.indexOf(correctText),
           explain: explain, answerText: correctText };
}

/* INTEGRATION 2026-09-15 (depth pilot x web 2). The rectangle leaves this file as
   PURE DATA; js/figures.js draws it, and gen-sanity's checkNoMarkup now REFUSES a
   picture built as markup in q.extra. Spec: { type:'rect', length, breadth, unit }
   - see js/topics/README.md. The pilot's redraw constraints are unchanged; only
   where the picture comes from has moved. */
function rectFig(L,B){ return { type:'rect', length:L, breadth:B, unit:'cm' }; }
const fig = (q, figure) => (q.figure = figure, q);

/* FORMAT 1 - direct compute, on a labelled figure (pool 1) */
function gPeri(){
  let L=6,B=4,g=0;
  do { L=ri(3,12); B=ri(2,L); g++; }
  while (g<200 && !(paOk(L,B) && optsOk(2*(L+B),[L+B,L*B,2*L+B,2*(L+B)+2])));
  const p=2*(L+B);
  return fig(finishNum('What is the <b>perimeter</b> of this rectangle?','',p,[L+B,L*B,2*L+B,p+2],'cm',
    'Perimeter = go all the way around: '+L+' + '+B+' + '+L+' + '+B+' = '+p+' cm.'), rectFig(L,B));
}
function gAreaRect(){
  let L=6,B=4,g=0;
  do { L=ri(3,12); B=ri(2,Math.min(L,9)); g++; }
  while (g<200 && !(paOk(L,B) && optsOk(L*B,[2*(L+B),L+B,L*B+L,L*B-B])));
  const a=L*B;
  return fig(finishNum('What is the <b>area</b> of this rectangle?','',a,[2*(L+B),L+B,a+L,a-B],'cm²',
    'Area = length × breadth = '+L+' × '+B+' = '+a+' cm².'), rectFig(L,B));
}
/* Wave-3 blocker fix (main): gSquarePA rendered BOTH an area face and a perimeter
 * face from one generator, so a pool entry tagged 'peri' could still show an area
 * stem (and vice versa). Split into two deterministic generators so the skill tag
 * on a pool entry is the skill the child actually meets. Same content, no new items.
 * INTEGRATION 2026-09-15: the pilot's coincidence redraw is carried onto BOTH
 * halves - side 4 is the perimeter-16 / area-16 draw Kevin stops on, and side 2
 * collides 4 x s with s x s in the option list. */
function gSquarePeri(){
  let s=5,g=0;
  do { s=ri(2,12); g++; }
  while (g<200 && !(4*s !== s*s && optsOk(4*s,[s*s,2*s,4*s+s,4*s-2])));
  const p=4*s;
  return finishNum('A square has sides of '+s+' cm. What is its <b>perimeter</b>?','',p,[s*s,2*s,p+s,p-2],'cm',
    'A square has 4 equal sides: 4 × '+s+' = '+p+' cm.');
}
function gSquareArea(){
  let s=5,g=0;
  do { s=ri(2,12); g++; }
  while (g<200 && !(4*s !== s*s && optsOk(s*s,[4*s,2*s,s*s+s,s*s-s])));
  const a=s*s;
  return finishNum('A square has sides of '+s+' cm. What is its <b>area</b>?','',a,[4*s,2*s,a+s,a-s],'cm²',
    'Area of a square = side × side = '+s+' × '+s+' = '+a+' cm².');
}
/* gMissSide DELETED (v3, second-refutation wound 1). "Area and one dimension in,
   the other dimension out" is MOE P4 1.1 word for word, and p4area ALREADY carries
   the equivalent as gRectSideFromArea (area + length -> breadth, typed answer). It
   is deleted rather than moved: moving it would duplicate an objective p4area
   already tests. With it goes the P3 `missing` skill, which existed only to host it,
   so this file is now exactly MOE P3 (concepts of area/perimeter; area of a
   rectangle/square) with no inverse work at all. */

/* FORMAT 2 - concept check: which calculation is the perimeter? (pool 1)
   KILL 2 (refutation): when L x B = 2(L + B) - 6 by 3, 4 by 4 - the AREA option
   evaluates to the perimeter and the item has two defensible answers. Redrawn. */
function gPeriConcept(){
  let L=7,B=3,g=0;
  /* WOUND 2 (v3): "long" must print longer than "wide". */
  do { L=ri(4,12); B=ri(2,11); g++; }
  while (g<200 && !(L>B && paOk(L,B) && 2*L*B !== 2*(L+B)));
  if (L<=B){ L=7; B=3; }
  return mcText('A rectangle is '+L+' cm long and '+B+' cm wide. Which calculation gives its <b>perimeter</b>?','',
    L+' + '+B+' + '+L+' + '+B,
    [L+' × '+B, L+' + '+B, L+' × '+B+' × 2'],
    'Perimeter is the distance all the way around, so every one of the four sides is added: '+
    L+' + '+B+' + '+L+' + '+B+' = '+(2*(L+B))+' cm. '+L+' × '+B+' is the area, and '+L+' + '+B+
    ' is only half the way around.');
}

/* FORMAT 4 - compare two figures, and by how much (pool 2, two steps) */
function gPeriCompare(){
  let a=10,b=8,c=5,d=4,pa=36,pb=18,guard=0;
  do { a=ri(4,14); b=ri(2,12); c=ri(3,13); d=ri(2,11); pa=2*(a+b); pb=2*(c+d); guard++; }
  while (guard<200 && !(pa>pb && paOk(a,b) && paOk(c,d) &&
         optsOk(pa-pb,[(a+b)-(c+d), pa, a*b-c*d])));
  if (pa<=pb){ a=10; b=8; c=5; d=4; pa=36; pb=18; }
  return mcNum('Rectangle A is '+a+' cm by '+b+' cm. Rectangle B is '+c+' cm by '+d+
    ' cm. How much <b>longer</b> is the perimeter of A than the perimeter of B?','',
    pa-pb,[(a+b)-(c+d), pa, a*b-c*d],'cm',
    'Perimeter of A = 2 × ('+a+' + '+b+') = '+pa+' cm. Perimeter of B = 2 × ('+c+' + '+d+') = '+pb+
    ' cm. A is longer by '+pa+' − '+pb+' = '+(pa-pb)+' cm. Comparing only one length and one breadth halves the difference.');
}

/* FORMAT 5 - error spotting, the mistake named as a misconception (pool 3) */
const PERI_SLIPS = [
  { key:'half',  say:(L,B)=>L+B,     text:'She added only two sides.' },
  { key:'area',  say:(L,B)=>L*B,     text:'She worked out the area instead.' },
  { key:'three', say:(L,B)=>2*L+B,   text:'She left out one side.' }
];
function gPeriError(){
  let L=9,B=7,guard=0;
  do { L=ri(5,12); B=ri(2,9); guard++; }
  while (guard<200 && !(L!==B && paOk(L,B) && L+B!==2*L+B &&
         new Set(PERI_SLIPS.map(s=>s.say(L,B)).concat([2*(L+B)])).size === 4));
  const slip = pick(PERI_SLIPS), claim = slip.say(L,B), p = 2*(L+B);
  const wrongs = PERI_SLIPS.filter(s=>s.key!==slip.key).map(s=>s.text).concat(['She counted the four corners as well.']);
  return mcText('Mei Ling says the perimeter of a rectangle '+L+' cm by '+B+' cm is '+claim+
    ' cm. <b>What did she do wrong?</b>','', slip.text, wrongs,
    'The perimeter is '+L+' + '+B+' + '+L+' + '+B+' = '+p+' cm, not '+claim+' cm. '+slip.text+
    ' Perimeter is the whole walk around the outside, so all four sides must be added.');
}

/* FORMAT 6 - two-step word problem, Singapore context (pool 3) */
const FENCE_CTX = [
  ['Mr Tan','a rectangular vegetable plot at the community garden','fencing'],
  ['Siti','a rectangular chicken run at the school farm','wire netting'],
  ['Kumar','a rectangular sandpit at the void deck playground','edging strip']
];
function gPeriFence(){
  const c = pick(FENCE_CTX);
  let L=7,B=10,rate=5,g=0;
  /* WOUND 2 (v3): "long" must print longer than "wide" (was flipped in 27% of draws). */
  do { L=ri(5,15); B=ri(3,12); rate=ri(2,9); g++; }
  while (g<200 && !(L>=B && paOk(L,B) &&
         optsOk(2*(L+B)*rate,[L*B*rate,(L+B)*rate,2*(L+B)])));
  if (L<B){ L=12; B=7; rate=5; }
  const p=2*(L+B), cost=p*rate;
  return mcNum(c[0]+' puts '+c[2]+' right around '+c[1]+' that is '+L+' m long and '+B+
    ' m wide. The '+c[2]+' costs $'+rate+' per metre. <b>How much does it cost altogether, in dollars?</b>','',
    cost,[L*B*rate, (L+B)*rate, p],'',
    'Step 1: the distance around is 2 × ('+L+' + '+B+') = '+p+' m. Step 2: '+p+' × $'+rate+' = $'+cost+
    '. Multiplying the area by the rate answers a different question: fencing goes around the edge, not over the ground.');
}

/* FORMAT 7 - perimeter of a RECTILINEAR figure (P3 GAPS LANE 2026-10-06, MOE P3
   1.3 "perimeter of rectilinear figure, rectangle and square"). Until this lane
   the L-shape lived only in p4area, a node a P3 player never sees. Same figure
   primitive ({type:'lshape'} drawn by js/figures.js, every one of the six sides
   printed), same draw limits as p4area's makeL (the 2/3 cut cap and the
   perimeter != area ban, both re-checked by the harness off the rendered labels).
   PERIMETER ONLY: the area of a composite figure is P4 1.3 and is not asked.
   Distractors are the walk-around slips: the two notch sides left out (adding
   only the four outer sides, as for a rectangle), one side missed, one or both
   notch sides counted twice. How many land below the key is drawn first, so the
   key's place among the four printed numbers moves from draw to draw. */
const capCut = n => Math.max(2, Math.min(n - 3, Math.floor(2 * n / 3)));
function gRectiPeri(){
  let W=13,H=11,a=4,b=3,per=48,fam=[],g=0;
  do {
    W=ri(7,16); H=ri(6,14); a=ri(2,capCut(W)); b=ri(2,capCut(H));
    per=2*(W+H);
    /* how many slips land below the key is drawn first, 0..3, so the key is the
       smallest, the largest or in the middle of the four by construction */
    const lo=shuffle([per-a-b, per-a, per-b]), hi=shuffle([per+a, per+b, per+a+b]), r=ri(0,3);
    fam=lo.slice(0,r).concat(hi.slice(0,3-r));
    g++;
  } while (g<400 && !(per !== W*H-a*b && a !== b && optsOk(per, fam)));
  if (!(per !== W*H-a*b && a !== b && optsOk(per, fam))){ W=13; H=11; a=4; b=3; per=48; fam=[41,44,52]; }
  return fig(mcNum('What is the <b>perimeter</b> of this figure?','',per,fam,'cm',
    'Perimeter is the walk all the way around, so add all six sides: '+(W-a)+' + '+b+' + '+a+' + '+
    (H-b)+' + '+W+' + '+H+' = '+per+' cm. The two sides at the cut-out corner are the ones most often left out.'),
    { type:'lshape', W:W, H:H, a:a, b:b, unit:'cm' });
}

/* ==== HARD LANE geom (2026-10-07, Math Hardness Calibration cards G1 + G2) ====
   Real P3 EOY papers ask composite area/perimeter from identical squares or tiles
   (11 of 16 papers) and wire/combined-shape problems; this file had neither.
   SCOPE CLAMP (unchanged): nothing below goes from a perimeter or an area back
   to a side - that is P4 1.1/1.2. Every side a child needs is either printed or
   comes from SHARING A PRINTED LENGTH equally among identical squares or tiles
   ("4 squares in a row make 20 cm, so each is 5 cm"), which is P3 division.
   Every item is tagged q.band (3 = exam-hard multi-step, 2 = standard) for the
   mock's router. Text only, no new figure type. Each stem is re-derived by a
   different path in tools/gen-sanity.mjs (geomHardOracle). */
const band = (q, b) => (q.band = b, q);
const NAMES = ['Mei Ling','Ravi','Siti','Jun Hao','Aisha','Kumar','Wei Ling','Farid','Priya','Hui Min'];

/* G1a/b. N identical squares in a row (or in 2 rows of n) make a rectangle whose
   LENGTH is printed. Side = length / n; then area or perimeter of the rectangle. */
function sqRowDraw(kind){
  let rows=1,n=4,s=5,X=20,Bd=5,N=4,key=0,d=[],g=0;
  do {
    rows = ri(1,2); n = rows===1 ? ri(3,6) : ri(3,5); s = ri(2,9);
    X = n*s; Bd = rows*s; N = rows*n;
    if (kind === 'area'){
      key = N*s*s;
      d = rows===1 ? [2*(X+Bd), s*s, X*N] : [2*(X+Bd), X*s, s*s];
    } else {
      key = 2*(X+Bd);
      d = [4*N*s, N*s*s, X+Bd];
    }
    g++;
  } while (g<300 && !(paOk(X,Bd) && optsOk(key,d)));
  return {rows,n,s,X,Bd,N,key,d};
}
function sqRowStem(t, ask){
  const lay = t.rows===1 ? 'are placed side by side in a row to make a rectangle'
                         : 'are arranged in 2 rows of '+t.n+' to make a rectangle';
  return t.N+' identical squares '+lay+'. The rectangle is '+t.X+' cm long. What is the <b>'+ask+'</b> of the rectangle?';
}
function gSqRowArea(){
  const t = sqRowDraw('area');
  return band(mcNum(sqRowStem(t,'area'),'',t.key,t.d,'cm²',
    'The squares are all the same size, and '+t.n+' of them fit along the '+t.X+' cm length, so each side is '+
    t.X+' ÷ '+t.n+' = '+t.s+' cm. One square has an area of '+t.s+' × '+t.s+' = '+(t.s*t.s)+' cm², and there are '+
    t.N+' squares: '+t.N+' × '+(t.s*t.s)+' = '+t.key+' cm². Check: the rectangle is '+t.X+' cm by '+t.Bd+' cm, and '+
    t.X+' × '+t.Bd+' = '+t.key+' cm².'), 3);
}
function gSqRowPeri(){
  const t = sqRowDraw('peri');
  return band(mcNum(sqRowStem(t,'perimeter'),'',t.key,t.d,'cm',
    'Each square side is '+t.X+' ÷ '+t.n+' = '+t.s+' cm, because '+t.n+' equal squares fit along the '+t.X+
    ' cm length. The rectangle is '+t.X+' cm long and '+(t.rows===1 ? 'one square ('+t.s+' cm)' : 'two squares ('+t.Bd+' cm)')+
    ' wide. Perimeter = '+t.X+' + '+t.Bd+' + '+t.X+' + '+t.Bd+' = '+t.key+' cm. Do not add up every square\'s perimeter: '+
    'the sides where two squares touch are inside the rectangle, not around it.'), 3);
}

/* G1c. K identical rectangular tiles in ONE ROW along the length make an X by Y
   rectangle. Each tile is X/K long and Y wide. Area of one tile is standard (2
   steps, band 2); perimeter of one tile needs the "the tile is as wide as the
   rectangle" reading plus three operations (band 3). */
function tileDraw(kind){
  let K=5,w=6,Y=12,X=30,key=0,d=[],g=0;
  do {
    K = ri(3,6); w = ri(2,9); Y = ri(3,14); X = K*w;
    if (kind === 'area'){ key = w*Y; d = [X*Y, 2*(X+Y), 2*(w+Y)]; }
    else { key = 2*(w+Y); d = [w*Y, 2*(X+Y), w+Y]; }
    g++;
  } while (g<300 && !(X>Y && w!==Y && paOk(X,Y) && paOk(w,Y) && optsOk(key,d)));
  return {K,w,Y,X,key,d,who:pick(NAMES)};
}
function tileStem(t, ask){
  return t.who+' lays '+t.K+' identical rectangular tiles side by side in one row. Together they make a rectangle '+
    t.X+' cm long and '+t.Y+' cm wide. What is the <b>'+ask+'</b> of one tile?';
}
function gTileArea(){
  const t = tileDraw('area');
  return band(mcNum(tileStem(t,'area'),'',t.key,t.d,'cm²',
    'The '+t.K+' tiles share the '+t.X+' cm length equally, so each tile measures '+t.X+' ÷ '+t.K+' = '+t.w+
    ' cm along the row. Its other side is as wide as the whole row: '+t.Y+' cm. Area of one tile = '+t.w+' × '+t.Y+' = '+t.key+
    ' cm². (The whole rectangle is '+t.X+' × '+t.Y+' = '+(t.X*t.Y)+' cm², and '+(t.X*t.Y)+' ÷ '+t.K+' = '+t.key+' cm² too.)'), 2);
}
function gTilePeri(){
  const t = tileDraw('peri');
  return band(mcNum(tileStem(t,'perimeter'),'',t.key,t.d,'cm',
    'The '+t.K+' tiles share the '+t.X+' cm length equally, so each tile measures '+t.X+' ÷ '+t.K+' = '+t.w+
    ' cm along the row. Its other side is as wide as the whole row: '+t.Y+' cm. Perimeter of one tile = '+t.w+' + '+t.Y+' + '+
    t.w+' + '+t.Y+' = '+t.key+' cm. The question asks about ONE tile, not the whole rectangle.'), 3);
}

/* G1d. Identical squares of a PRINTED side joined into a row, an L, a T or a big
   square: count the square sides on the outside. The named slip is adding every
   square's own perimeter (the touching sides counted). */
const SQ_SHAPES = [
  { k:'row3', N:3, edges:8,  say:'3 identical squares are joined side by side in a row' },
  { k:'row4', N:4, edges:10, say:'4 identical squares are joined side by side in a row' },
  { k:'row5', N:5, edges:12, say:'5 identical squares are joined side by side in a row' },
  { k:'L3',   N:3, edges:8,  say:'3 identical squares are joined to make an L shape: 2 squares side by side, with the third square on top of the left-hand one' },
  { k:'L4',   N:4, edges:10, say:'4 identical squares are joined to make an L shape: 3 squares side by side in a row, with the fourth square on top of the left-hand one' },
  { k:'T4',   N:4, edges:10, say:'4 identical squares are joined to make a T shape: 3 squares side by side in a row, with the fourth square on top of the middle one' },
  { k:'big4', N:4, edges:8,  say:'4 identical squares are joined in 2 rows of 2 to make a big square' }
];
function gSqShapePeri(){
  let sh=SQ_SHAPES[0],s=5,key=40,d=[],g=0;
  do {
    sh = pick(SQ_SHAPES); s = ri(2,12); key = sh.edges*s;
    d = [4*sh.N*s, sh.N*s*s, (sh.edges-2)*s];
    g++;
  } while (g<300 && !(key !== sh.N*s*s && optsOk(key,d)));
  return band(mcNum(sh.say+'. Each square has sides of '+s+' cm. What is the <b>perimeter</b> of the shape?','',key,d,'cm',
    'Walk around the outside of the shape and count the square sides you pass: '+sh.edges+' of them. '+
    'The sides where two squares touch are inside the shape, so they are not part of the perimeter. '+
    'Perimeter = '+sh.edges+' × '+s+' = '+key+' cm. Adding all '+sh.N+' squares\' perimeters ('+sh.N+' × '+(4*s)+' = '+(4*sh.N*s)+
    ' cm) counts the inside sides too.'), 3);
}

/* G1e. Cut a row of identical squares apart: how much more perimeter? Typed. */
function gCutSquares(){
  const n = ri(3,6), s = ri(2,9), X = n*s, who = pick(NAMES);
  const all = 4*n*s, rect = 2*(X+s), key = all-rect;
  return band(finishTyped('A rectangle is made of '+n+' identical squares in a row. It is '+X+' cm long. '+who+
    ' cuts it apart into the '+n+' squares. How much <b>greater</b> is the total perimeter of the '+n+
    ' squares than the perimeter of the rectangle? Give your answer in cm.', key,
    'Each square side is '+X+' ÷ '+n+' = '+s+' cm. The '+n+' squares together: '+n+' × 4 × '+s+' = '+all+
    ' cm. The rectangle: '+X+' + '+s+' + '+X+' + '+s+' = '+rect+' cm. Difference: '+all+' − '+rect+' = '+key+
    ' cm. Shortcut: each of the '+(n-1)+' cuts makes 2 new sides of '+s+' cm, and '+(n-1)+' × 2 × '+s+' = '+key+' cm.',
    'cm'), 3);
}

/* G2a. Two wires: a rectangle with PRINTED sides, then a square whose side is
   tied to the rectangle (half its length, or equal to its breadth). Typed. */
function gWireTwo(){
  let L=18,B=7,half=true,g=0;
  do { half = ri(0,1)===1; L = half ? 2*ri(4,13) : ri(6,20); B = ri(3,L-2); g++; }
  while (g<300 && !(paOk(L,B) && (half ? L/2 !== B : true)));
  const sq = half ? L/2 : B, pr = 2*(L+B), ps = 4*sq, key = pr+ps, who = pick(NAMES);
  const tie = half ? 'half the length of the rectangle' : 'the same as the breadth of the rectangle';
  return band(finishTyped(who+' bends a piece of wire into a rectangle '+L+' cm long and '+B+' cm wide. '+
    'A second piece of wire is bent into a square. Each side of the square is '+tie+
    '. How much wire is used <b>altogether</b>? Give your answer in cm.', key,
    'Wire for the rectangle = its perimeter: '+L+' + '+B+' + '+L+' + '+B+' = '+pr+' cm. Each side of the square is '+
    (half ? L+' ÷ 2 = '+sq : sq)+' cm, so its wire is 4 × '+sq+' = '+ps+' cm. Altogether: '+pr+' + '+ps+' = '+key+
    ' cm. Wire goes around the edge, so it is perimeter, not area.', 'cm'), 3);
}

/* G2b. Same perimeter, different area (band 2: two products and a difference).
   B is the squarer one, so B's area is the larger; never a square. */
function gSamePerimArea(){
  let a=9,b=4,c=7,d=6,dd=[],g=0;
  do {
    const half = ri(8,16);
    a = ri(Math.ceil(half/2)+2, half-2); b = half-a;
    c = ri(Math.ceil(half/2), a-1); d = half-c;
    dd = [c*d, 2*(a+b), a*b];
    g++;
  } while (g<300 && !(c>d && a>c && paOk(a,b) && paOk(c,d) && optsOk(c*d-a*b, dd)));
  const key = c*d-a*b, P = 2*(a+b);
  return band(mcNum('Rectangle A is '+a+' cm by '+b+' cm. Rectangle B is '+c+' cm by '+d+
    ' cm. Both rectangles have the same perimeter. How much <b>greater</b> is the area of B than the area of A?','',
    key, dd, 'cm²',
    'Same perimeter does not mean same area. Both perimeters are '+P+' cm, but area of A = '+a+' × '+b+' = '+(a*b)+
    ' cm² and area of B = '+c+' × '+d+' = '+(c*d)+' cm². B is greater by '+(c*d)+' − '+(a*b)+' = '+key+' cm².'), 2);
}

/* G2c. Two identical rectangles joined along their long (or short) sides make a
   bigger rectangle: its perimeter, or how much perimeter the join hides. */
function gJoinRects(){
  let L=9,B=4,longT=true,diff=false,key=0,dd=[],g=0;
  do {
    L = ri(5,15); B = ri(2,L-1); longT = ri(0,1)===1; diff = ri(0,1)===1;
    const bigL = longT ? L : 2*L, bigB = longT ? 2*B : B, other = longT ? 2*(2*L+B) : 2*(L+2*B);
    if (!diff){ key = 2*(bigL+bigB); dd = [4*(L+B), other, 2*L*B]; }
    else { key = longT ? 2*L : 2*B; dd = longT ? [L, 2*B, 2*(L+2*B)] : [B, 2*L, 2*(2*L+B)]; }
    g++;
  } while (g<300 && !(paOk(L,B) && L !== 2*B && optsOk(key,dd)));
  const touch = longT ? 'long' : 'short', who = pick(NAMES);
  const bigL = longT ? L : 2*L, bigB = longT ? 2*B : B;
  const dims = longT ? 'the bigger rectangle is '+L+' cm by '+B+' + '+B+' = '+(2*B)+' cm'
                     : 'the bigger rectangle is '+L+' + '+L+' = '+(2*L)+' cm by '+B+' cm';
  const stem = who+' has 2 identical rectangular cards. Each card is '+L+' cm long and '+B+' cm wide. '+
    'They are put together, with a '+touch+' side of one card touching a '+touch+' side of the other, to make a bigger rectangle. ' +
    (diff ? 'How much <b>shorter</b> is the perimeter of the bigger rectangle than the perimeters of the 2 cards added together?'
          : 'What is the <b>perimeter</b> of the bigger rectangle?');
  const P = 2*(bigL+bigB), tot = 4*(L+B), hid = longT ? L : B;
  const explain = diff
    ? 'The 2 cards add up to 2 × ('+L+' + '+B+' + '+L+' + '+B+') = '+tot+' cm. When they touch, '+dims+', so its perimeter is 2 × ('+
      bigL+' + '+bigB+') = '+P+' cm. Shorter by '+tot+' − '+P+' = '+key+' cm: the two touching '+touch+' sides ('+hid+' cm each) are now inside.'
    : 'When the '+touch+' sides touch, '+dims+'. Perimeter = '+bigL+' + '+bigB+' + '+bigL+' + '+bigB+' = '+P+
      ' cm. Adding both cards\' perimeters ('+tot+' cm) wrongly counts the two touching sides, which are inside the bigger rectangle.';
  return band(mcNum(stem,'',key,dd,'cm',explain), 3);
}

  MQI.registerTopic({
    id:'geometry', level:'P3', strand:'Measurement and Geometry',
    moeSubTopic:"Area and Perimeter: concepts of area and perimeter of a plane figure; area of rectangle/square",
    label:'Perimeter Palace', short:'Area & perimeter', e:'🏰',
    skills:{
      peri:   {label:'Perimeter',              tip:'Perimeter = the walk around the outside. Trace the shape with a finger while adding the sides.'},
      area:   {label:'Area',                   tip:'Area = length × breadth (count the squares inside). Watch the unit: cm² not cm!'}
    },
    pools:{
      /* INTEGRATION 2026-09-15: the pilot's pools, with main's gSquarePA split
         applied - every former [gSquarePA,'peri'] is now gSquarePeri and every
         [gSquarePA,'area'] is gSquareArea, so the skill tag is the skill the child
         meets. gSquareArea joins pool 1 (as on main) because pool 1's old
         [gSquarePA,'peri'] entry already showed an area stem on half its draws;
         without it the split would silently delete area from level 1. */
      1:[[gSquarePeri,'peri'],[gPeri,'peri'],[gPeriConcept,'peri'],[gSquareArea,'area']],
      /* HARD LANE geom 2026-10-07: the two band-2 shapes (tile area, same
         perimeter / different area) join pool 2; the seven band-3 shapes join pool 3. */
      2:[[gPeriCompare,'peri'],[gAreaRect,'area'],[gSquareArea,'area'],[gPeri,'peri'],[gRectiPeri,'peri'],
         [gTileArea,'area'],[gSamePerimArea,'area']],
      3:[[gPeriError,'peri'],[gPeriFence,'peri'],[gPeriCompare,'peri'],[gAreaRect,'area'],[gRectiPeri,'peri'],
         [gSqRowArea,'area'],[gSqRowPeri,'peri'],[gTilePeri,'peri'],[gSqShapePeri,'peri'],
         [gCutSquares,'peri'],[gWireTwo,'peri'],[gJoinRects,'peri']]
    }
  });
})();
