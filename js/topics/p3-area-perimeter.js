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
 *   two-step word problem (gPeriFence), area (gAreaRect, gSquarePA).
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

function rectHtml(L,B){
  const w=Math.min(240,L*20), h=Math.max(34,Math.min(110,B*16));
  return '<div style="display:inline-block;padding:0 56px 0 8px">'+
         '<div class="rectBox" style="width:'+w+'px;height:'+h+'px"><span class="rectLabelB">'+B+' cm</span></div>'+
         '<div class="rectLabelL" style="width:'+w+'px">'+L+' cm</div></div>';
}

/* FORMAT 1 - direct compute, on a labelled figure (pool 1) */
function gPeri(){
  let L=6,B=4,g=0;
  do { L=ri(3,12); B=ri(2,L); g++; }
  while (g<200 && !(paOk(L,B) && optsOk(2*(L+B),[L+B,L*B,2*L+B,2*(L+B)+2])));
  const p=2*(L+B);
  return finishNum('What is the <b>perimeter</b> of this rectangle?',rectHtml(L,B),p,[L+B,L*B,2*L+B,p+2],'cm',
    'Perimeter = go all the way around: '+L+' + '+B+' + '+L+' + '+B+' = '+p+' cm.');
}
function gAreaRect(){
  let L=6,B=4,g=0;
  do { L=ri(3,12); B=ri(2,Math.min(L,9)); g++; }
  while (g<200 && !(paOk(L,B) && optsOk(L*B,[2*(L+B),L+B,L*B+L,L*B-B])));
  const a=L*B;
  return finishNum('What is the <b>area</b> of this rectangle?',rectHtml(L,B),a,[2*(L+B),L+B,a+L,a-B],'cm²',
    'Area = length × breadth = '+L+' × '+B+' = '+a+' cm².');
}
function gSquarePA(){
  const wantPeri = Math.random() < 0.5;
  let s=5,g=0;
  /* side 4 is the coincidence draw (perimeter 16, area 16); side 2 collides
     4 x s with s x s in the option list. Both are redrawn out. */
  do { s=ri(2,12); g++; }
  while (g<200 && !(4*s !== s*s &&
        optsOk(wantPeri?4*s:s*s, wantPeri?[s*s,2*s,4*s+s,4*s-2]:[4*s,2*s,s*s+s,s*s-s])));
  if(wantPeri){
    const p=4*s;
    return finishNum('A square has sides of '+s+' cm. What is its <b>perimeter</b>?','',p,[s*s,2*s,p+s,p-2],'cm',
      'A square has 4 equal sides: 4 × '+s+' = '+p+' cm.');
  }
  const a=s*s;
  return finishNum('A square has sides of '+s+' cm. What is its <b>area</b>?','',a,[4*s,2*s,a+s,a-s],'cm²',
    'Area of a square = side × side = '+s+' × '+s+' = '+a+' cm².');
}
function gMissSide(){
  let B=3,L=7,g=0;
  do { B=ri(2,9); L=ri(B,12); g++; }
  while (g<200 && !(paOk(L,B) && optsOk(L,[L*B-B,B,L+1,L-1])));
  const a=L*B;
  return finishNum('A rectangle has an <b>area of '+a+' cm²</b>. Its breadth is '+B+' cm. What is its <b>length</b>?','',
    L,[a-B,B,L+1,L-1],'cm',
    'Area = length × breadth, so length = '+a+' ÷ '+B+' = '+L+' cm.');
}

/* FORMAT 2 - concept check: which calculation is the perimeter? (pool 1)
   KILL 2 (refutation): when L x B = 2(L + B) - 6 by 3, 4 by 4 - the AREA option
   evaluates to the perimeter and the item has two defensible answers. Redrawn. */
function gPeriConcept(){
  let L=7,B=3,g=0;
  do { L=ri(4,12); B=ri(2,11); g++; }
  while (g<200 && !(L!==B && paOk(L,B) && 2*L*B !== 2*(L+B)));
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
  do { L=ri(5,15); B=ri(3,12); rate=ri(2,9); g++; }
  while (g<200 && !(paOk(L,B) &&
         optsOk(2*(L+B)*rate,[L*B*rate,(L+B)*rate,2*(L+B)])));
  const p=2*(L+B), cost=p*rate;
  return mcNum(c[0]+' puts '+c[2]+' right around '+c[1]+' that is '+L+' m long and '+B+
    ' m wide. The '+c[2]+' costs $'+rate+' per metre. <b>How much does it cost altogether, in dollars?</b>','',
    cost,[L*B*rate, (L+B)*rate, p],'',
    'Step 1: the distance around is 2 × ('+L+' + '+B+') = '+p+' m. Step 2: '+p+' × $'+rate+' = $'+cost+
    '. Multiplying the area by the rate answers a different question: fencing goes around the edge, not over the ground.');
}


  MQI.registerTopic({
    id:'geometry', level:'P3', strand:'Measurement and Geometry',
    moeSubTopic:"Area and Perimeter: concepts of area and perimeter of a plane figure; area of rectangle/square",
    label:'Perimeter Palace', short:'Area & perimeter', e:'🏰',
    skills:{
      peri:   {label:'Perimeter',              tip:'Perimeter = the walk around the outside. Trace the shape with a finger while adding the sides.'},
      area:   {label:'Area',                   tip:'Area = length × breadth (count the squares inside). Watch the unit: cm² not cm!'},
      missing:{label:'Finding a missing side', tip:'Work backwards: if area = length × breadth, then length = area ÷ breadth.'}
    },
    pools:{
      1:[[gSquarePA,'peri'],[gPeri,'peri'],[gPeriConcept,'peri']],
      2:[[gPeriCompare,'peri'],[gAreaRect,'area'],[gSquarePA,'area'],[gMissSide,'missing']],
      3:[[gPeriError,'peri'],[gPeriFence,'peri'],[gMissSide,'missing'],[gPeriCompare,'peri']]
    }
  });
})();
