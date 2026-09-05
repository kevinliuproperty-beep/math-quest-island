"use strict";
/* Math Quest Island topic: tables (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 *
 * DEPTH PILOT 2026-09-05 (Kevin 23:02).
 * PRINCIPLE: multiplication and division are the same fact seen from two ends -
 * equal groups. A child who knows 6 x 7 = 42 already knows 42 / 6 and 42 / 7.
 * FORMAT BANK: direct fact (gMulEasy/gMulHard/gMulMixed), division fact
 * (gDivFact), missing factor (gMissFactor), equal groups in words (gGroups),
 * fact family (gFactFamily), which is NOT a multiple (gNotMultiple),
 * doubling strategy (gDoubling), two-step word problem (gDivShare),
 * error spotting (gDivError).
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

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
function mcText(stem, extra, correctText, wrongs, explain){
  const opts = shuffle([correctText].concat(wrongs.slice(0, 3)));
  return { q: stem, extra: extra || '', choices: opts, correct: opts.indexOf(correctText),
           explain: explain, answerText: correctText };
}

const ALL_TABLES = EASY_TABLES.concat(HARD_TABLES);

/* FORMAT 1 - direct fact recall (pools 1, 2) */
function gMulEasy(){ return gMul(EASY_TABLES); }
function gMulHard(){ return gMul(HARD_TABLES); }
function gMulMixed(){ return Math.random()<0.5 ? gMulHard() : gMul([3,4,6,7,8,9]); }

/* FORMAT 2 - the same fact from the division end (pool 1) */
function gDivFact(){
  const a=pick(ALL_TABLES), b=ri(2,10), p=a*b;
  return finishNum(p+' ÷ '+a+' = ?','',b,[b+1,b-1,a,b+2],'',
    'Think multiplication: '+a+' × <b>'+b+'</b> = '+p+', so '+p+' ÷ '+a+' = '+b+'.');
}

/* FORMAT 3 - missing factor (pool 2) */
function gMissFactor(){
  const a=pick(ALL_TABLES), b=ri(2,10), p=a*b;
  return finishNum(a+' × ? = '+p,'',b,[b+1,b-1,a,b+2],'',
    a+' × <b>'+b+'</b> = '+p+'. You can also work it out as '+p+' ÷ '+a+' = '+b+'.');
}

/* FORMAT 4 - equal groups described in words (pool 1) */
const GROUP_CTX = [
  ['The hawker centre has','tables','chairs at each table','chairs'],
  ['The school hall has','rows of chairs','chairs in each row','chairs'],
  ['Siti packs','boxes of kaya toast','slices in each box','slices'],
  ['The MRT platform has','benches','seats on each bench','seats']
];
function gGroups(){
  const c=pick(GROUP_CTX), a=pick(ALL_TABLES), b=ri(2,10), p=a*b;
  return mcNum(c[0]+' '+a+' '+c[1]+', with '+b+' '+c[2]+'. <b>How many '+c[3]+' are there altogether?</b>','',
    p,[a+b, p-a, p+b],'',
    'Equal groups means multiply: '+a+' groups of '+b+' = '+a+' × '+b+' = '+p+' '+c[3]+
    '. Adding the two numbers counts the groups, not what is inside them.');
}

/* FORMAT 5 - fact family: write the matching division (pool 2) */
function gFactFamily(){
  const a=pick(HARD_TABLES); let b=ri(2,10); while(b===a) b=ri(2,10);
  const p=a*b;
  return mcText('You know that '+a+' × '+b+' = '+p+'. <b>Which division fact belongs to the same fact family?</b>','',
    p+' ÷ '+a+' = '+b,
    [p+' ÷ '+b+' = '+(a+1), a+' ÷ '+b+' = '+p, p+' ÷ '+(b+1)+' = '+a],
    'A fact family shares the same three numbers: '+a+', '+b+' and '+p+'. From '+a+' × '+b+' = '+p+
    ' you get '+p+' ÷ '+a+' = '+b+' and '+p+' ÷ '+b+' = '+a+'. Division starts from the largest number, the product.');
}

/* FORMAT 6 - which is NOT a multiple (pool 2) */
function gNotMultiple(){
  const a=pick(HARD_TABLES);
  const ms=shuffle([2,3,4,5,6,7,8,9,10]).slice(0,3).map(k=>a*k);
  let bad=pick(ms)+pick([1,2,3].filter(k=>k<a));
  let guard=0;
  while ((bad%a===0 || ms.indexOf(bad)>=0) && guard<40){ bad=pick(ms)+ri(1,a-1); guard++; }
  const opts=shuffle(ms.concat([bad]));
  /* WOUND 2 (refutation 2026-09-05): "multiple" is P4 Factors and Multiples
     vocabulary (this repo has p4-factors-multiples.js for it). The mathematics
     is P3 3.1; only the word was out of year, so the word is what changed. */
  return { q:'Which of these numbers is <b>NOT</b> in the '+a+' times table?', extra:'',
    choices:opts.map(String), correct:opts.indexOf(bad),
    explain:'Count in '+a+'s: '+a+', '+(2*a)+', '+(3*a)+', '+(4*a)+'… A number in the '+a+
      ' times table divides by '+a+' with nothing left over. '+bad+' ÷ '+a+' leaves a remainder of '+(bad%a)+
      ', so '+bad+' is not in the '+a+' times table.',
    answerText:String(bad) };
}

/* FORMAT 7 - doubling strategy: build a new fact from a known one (pool 3) */
function gDoubling(){
  const a=pick([3,4,6,7,8,9]), b=ri(3,9), p=a*b;
  return mcNum('You know that '+a+' × '+b+' = '+p+'. Use <b>doubling</b> to work out '+(2*a)+' × '+b+'.','',
    2*p,[p+2, p+a, p+b],'',
    'Doubling one factor doubles the product. '+(2*a)+' is double '+a+', so '+(2*a)+' × '+b+
    ' = double '+p+' = '+(2*p)+'. Adding 2 to the answer doubles nothing: it is the factor that doubled, not the product by 2 units.');
}

/* FORMAT 8 - two-step word problem, division then multiplication (pool 3) */
const SHARE_CTX = [
  ['Ah Huat packs','curry puffs','boxes','boxes'],
  ['Mrs Lim packs','stickers','packets','packets'],
  ['The canteen packs','buns','trays','trays']
];
function gDivShare(){
  const c=pick(SHARE_CTX);
  const g=pick(HARD_TABLES), each=ri(3,10), total=g*each;
  let want=ri(2,g-1); if(want<2) want=2;
  return mcNum(c[0]+' '+total+' '+c[1]+' equally into '+g+' '+c[2]+'. <b>How many '+c[1]+' are in '+
    want+' '+c[3]+'?</b>','',
    want*each,[each, total-want, want*g],'',
    'Step 1: one '+c[2].replace(/s$/,'')+' gets '+total+' ÷ '+g+' = '+each+' '+c[1]+
    '. Step 2: '+want+' × '+each+' = '+(want*each)+'. Stopping after the division answers only one '+
    c[2].replace(/s$/,'')+', which is the usual slip.');
}

/* FORMAT 9 - error spotting: check a division with multiplication (pool 3) */
function gDivError(){
  const a=pick(HARD_TABLES), b=ri(3,10), p=a*b;
  const claim = Math.random()<0.5 ? b+1 : b-1;
  return mcNum('Ravi says '+p+' ÷ '+a+' = '+claim+'. He checked it by working out '+a+' × '+claim+
    ' = '+(a*claim)+'. <b>What should '+p+' ÷ '+a+' be?</b>','',
    b,[claim, a, a+b],'',
    'The check itself shows the mistake: '+a+' × '+claim+' = '+(a*claim)+', not '+p+
    '. The fact that fits is '+a+' × '+b+' = '+p+', so '+p+' ÷ '+a+' = '+b+
    '. A division answer is right only when multiplying it back gives the number you started with.');
}


  MQI.registerTopic({
    id:'tables', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Multiplication and Division: multiplication tables of 6, 7, 8 and 9; multiplying and dividing within the tables",
    label:'Times Table Volcano', short:'Times tables', e:'🌋',
    skills:{
      mult:   {label:'Multiplication facts',  tip:'Drill the 6, 7, 8, 9 tables in short bursts. Skip counting songs help: 6, 12, 18, 24…'},
      div:    {label:'Division facts',        tip:'Always flip to multiplication: "72 ÷ 8 = ? " becomes "8 × ? = 72".'},
      missing:{label:'Missing number facts',  tip:'Cover up game: write 7 × ▢ = 42 on paper and race to fill the box.'}
    },
    pools:{
      1:[[gMulEasy,'mult'],[gGroups,'mult'],[gDivFact,'div']],
      2:[[gMulHard,'mult'],[gMissFactor,'missing'],[gFactFamily,'div'],[gNotMultiple,'mult'],[gMulMixed,'mult']],
      3:[[gDoubling,'mult'],[gDivShare,'div'],[gDivError,'div'],[gMissFactor,'missing']]
    }
  });
})();
