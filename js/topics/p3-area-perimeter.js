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
 *   direct compute (gPeri), concept check (gPeriConcept), inverse (gPeriInverse),
 *   compare two figures (gPeriCompare), error spotting (gPeriError),
 *   two-step word problem (gPeriFence), working backwards (gPeriDouble),
 *   mixed principle area+perimeter (gPeriFromArea).
 * Every new stem is re-derived from its rendered text by an oracle in
 * tools/gen-sanity.mjs; nothing is trusted from the generator's own answerText.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

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
  const L=ri(3,12), B=ri(2,L); const p=2*(L+B);
  return finishNum('What is the <b>perimeter</b> of this rectangle?',rectHtml(L,B),p,[L+B,L*B,2*L+B,p+2],'cm',
    'Perimeter = go all the way around: '+L+' + '+B+' + '+L+' + '+B+' = '+p+' cm.');
}
function gAreaRect(){
  const L=ri(3,12), B=ri(2,Math.min(L,9)); const a=L*B;
  return finishNum('What is the <b>area</b> of this rectangle?',rectHtml(L,B),a,[2*(L+B),L+B,a+L,a-B],'cm²',
    'Area = length × breadth = '+L+' × '+B+' = '+a+' cm².');
}
function gSquarePA(){
  const s=ri(2,12);
  if(Math.random()<0.5){
    const p=4*s;
    return finishNum('A square has sides of '+s+' cm. What is its <b>perimeter</b>?','',p,[s*s,2*s,p+s,p-2],'cm',
      'A square has 4 equal sides: 4 × '+s+' = '+p+' cm.');
  }
  const a=s*s;
  return finishNum('A square has sides of '+s+' cm. What is its <b>area</b>?','',a,[4*s,2*s,a+s,a-s],'cm²',
    'Area of a square = side × side = '+s+' × '+s+' = '+a+' cm².');
}
function gMissSide(){
  const B=ri(2,9), L=ri(B,12), a=L*B;
  return finishNum('A rectangle has an <b>area of '+a+' cm²</b>. Its breadth is '+B+' cm. What is its <b>length</b>?','',
    L,[a-B,B,L+1,L-1],'cm',
    'Area = length × breadth, so length = '+a+' ÷ '+B+' = '+L+' cm.');
}

/* FORMAT 2 - concept check: which calculation is the perimeter? (pool 1) */
function gPeriConcept(){
  const L=ri(4,12); let B=ri(2,11); while(B===L) B=ri(2,11);
  return mcText('A rectangle is '+L+' cm long and '+B+' cm wide. Which calculation gives its <b>perimeter</b>?','',
    L+' + '+B+' + '+L+' + '+B,
    [L+' × '+B, L+' + '+B, L+' × '+B+' × 2'],
    'Perimeter is the distance all the way around, so every one of the four sides is added: '+
    L+' + '+B+' + '+L+' + '+B+' = '+(2*(L+B))+' cm. '+L+' × '+B+' is the area, and '+L+' + '+B+
    ' is only half the way around.');
}

/* FORMAT 3 - inverse: perimeter given, find the missing side (pool 2) */
function gPeriInverse(){
  const B=ri(2,9); let L=ri(3,14); while(L===B) L=ri(3,14);
  const p=2*(L+B);
  return mcNum('A rectangle has a perimeter of '+p+' cm and a breadth of '+B+' cm. What is its <b>length</b>?','',
    L,[p-B, p/2, B*2],'cm',
    'Work backwards. Perimeter = 2 × (length + breadth), so length + breadth = '+p+' ÷ 2 = '+(p/2)+
    '. Then '+(p/2)+' − '+B+' = '+L+' cm. Taking the breadth straight off the whole perimeter is the usual slip.');
}

/* FORMAT 4 - compare two figures, and by how much (pool 2, two steps) */
function gPeriCompare(){
  let a,b,c,d,pa,pb,guard=0;
  do { a=ri(4,14); b=ri(2,12); c=ri(3,13); d=ri(2,11); pa=2*(a+b); pb=2*(c+d); guard++; }
  while (pa<=pb && guard<60);
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
  let L,B,guard=0;
  do { L=ri(5,12); B=ri(2,9); guard++; }
  while ((L===B || L*B===2*(L+B) || L+B===2*L+B) && guard<60);
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
  const L=ri(5,15), B=ri(3,12), rate=ri(2,9), p=2*(L+B), cost=p*rate;
  return mcNum(c[0]+' puts '+c[2]+' right around '+c[1]+' that is '+L+' m long and '+B+
    ' m wide. The '+c[2]+' costs $'+rate+' per metre. <b>How much does it cost altogether, in dollars?</b>','',
    cost,[L*B*rate, (L+B)*rate, p],'',
    'Step 1: the distance around is 2 × ('+L+' + '+B+') = '+p+' m. Step 2: '+p+' × $'+rate+' = $'+cost+
    '. Multiplying the area by the rate answers a different question: fencing goes around the edge, not over the ground.');
}

/* FORMAT 7 - working backwards: what happens to the side (pool 3) */
function gPeriDouble(){
  const s=ri(3,12), p=4*s;
  return mcNum('A square garden tile has a perimeter of '+p+' cm. A bigger square tile has <b>double</b> that perimeter. '+
    'What is the length of one side of the bigger tile?','',
    2*s,[s, 4*s, p+s],'cm',
    'One side of the first tile = '+p+' ÷ 4 = '+s+' cm. Double the perimeter is '+(2*p)+' cm, so one side of the bigger tile = '+
    (2*p)+' ÷ 4 = '+(2*s)+' cm. Doubling the perimeter doubles every side, it does not double the number of sides.');
}

/* FORMAT 8 - mixed principle: area in, perimeter out (pool 3) */
function gPeriFromArea(){
  const B=ri(2,9); let L=ri(3,12); while(L===B) L=ri(3,12);
  const a=L*B, p=2*(L+B);
  return mcNum('A rectangular photo frame has an <b>area of '+a+' cm²</b> and a length of '+L+
    ' cm. What is its <b>perimeter</b>?','',
    p,[a, L+B, 2*L+B],'cm',
    'Step 1: breadth = area ÷ length = '+a+' ÷ '+L+' = '+B+' cm. Step 2: perimeter = 2 × ('+L+' + '+B+') = '+p+
    ' cm. Area and perimeter are different measurements: cm² for the space inside, cm for the walk around.');
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
      2:[[gPeriInverse,'missing'],[gPeriCompare,'peri'],[gAreaRect,'area'],[gSquarePA,'area']],
      3:[[gPeriError,'peri'],[gPeriFence,'peri'],[gPeriDouble,'missing'],[gPeriFromArea,'missing'],[gMissSide,'missing']]
    }
  });
})();
