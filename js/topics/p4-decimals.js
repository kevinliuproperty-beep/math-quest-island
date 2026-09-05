"use strict";
/* Math Quest Island topic: decimals (Decimal Bay, P4).
 *
 * RECOVERED, NOT SHIPPED. These are the five decimal generator families from the
 * stale branch exp/level-one (commit 651c5b4), lifted without that branch's
 * destructive deletion of cube/index.html and vercel.json. They pass the sanity
 * harness at 100% oracle coverage.
 *
 * This file has NO script tag in index.html and the Decimal Bay map node stays
 * status:'locked'. Play is unchanged. The Phase 1 calibration lane owns this file:
 * it is the sample sub-strand that proves the certification rubric, and it goes
 * live only after Kevin ratifies that rubric (Expansion Brief, phase 1) - the
 * calibration gate forbids shipping content ahead of it.
 * To ship: add the script tag, flip the node to status:'live' in js/registry.js.
 */
(function () {
  const G = MQI.gen;
  const ri=G.ri, pick=G.pick, shuffle=G.shuffle, gcd=G.gcd, fr=G.fr, eq=G.eq, buildFracChoices=G.buildFracChoices, finishFrac=G.finishFrac, finishNum=G.finishNum, finishTyped=G.finishTyped;

/* ===== DECIMALS (Decimal Bay, P4) =====
   MOE 2021 P4 Decimals sub-strand: place value (tenths/hundredths/thousandths),
   comparing & ordering, rounding, decimal<->fraction, four operations.
   Answers are non-integer, so finishNum (integer-only) cannot be used; these
   route through finishDec below. All internal arithmetic is done in scaled
   integers so answers are exact (no floating-point drift). */
const PLACE_WORD={1:'tenths',2:'hundredths',3:'thousandths'};
/* MCQ finisher for decimal-valued answers. correct + cands are Numbers;
   dp = number of decimal places to display each choice to. */
function finishDec(qHtml, extraHtml, correct, cands, unit, explain, dp){
  dp=(dp==null)?1:dp;
  const step=1/Math.pow(10,dp);
  const key=x=>x.toFixed(dp);
  const nums=[correct]; const seen=new Set([key(correct)]);
  const add=c=>{ if(nums.length<4 && Number.isFinite(c) && c>=0 && !seen.has(key(c))){ nums.push(c); seen.add(key(c)); } };
  for(const c of shuffle(cands)) add(c);
  let t=1;
  while(nums.length<4){ add(correct+step*t); add(correct-step*t); t++; if(t>90) break; }
  const u=unit?(' '+unit):'';
  const order=shuffle(nums.map((_,i)=>i));
  return { q:qHtml, extra:extraHtml||'', choices:order.map(i=>nums[i].toFixed(dp)+u),
           correct:order.indexOf(0), explain, answerText: correct.toFixed(dp)+u };
}
/* Place value: value of one digit in a decimal (digits are distinct so the
   asked digit is unambiguous). dp = decimal places in the number (1..3). */
function gDecPlaceValue(dp){
  dp=dp||1;
  const ds=shuffle([1,2,3,4,5,6,7,8,9]).slice(0,dp+1);
  const whole=ds[0], decDigits=ds.slice(1);
  const numStr=whole+'.'+decDigits.join('');
  const place=ri(1,dp);
  const d=decDigits[place-1];
  const value=d/Math.pow(10,place);
  const cands=[ d/10, d/Math.pow(10,Math.min(3,place+1)) ];
  if(place>1) cands.push(d/Math.pow(10,place-1));
  cands.push((d+1)/Math.pow(10,place));
  return finishDec('What is the value of the digit <b>'+d+'</b> in <b>'+numStr+'</b>?','',
    value, cands, '',
    'In '+numStr+', the digit '+d+' sits in the '+PLACE_WORD[place]+' place. Its value is '+d+' '+PLACE_WORD[place]+', which is '+value.toFixed(place)+'.',
    place);
}
/* Compare 4 decimals that share the same whole-number part, so the comparison
   turns on the decimal places. dp = decimal places (1 or 2). */
function gDecCompare(dp){
  dp=dp||1;
  const scale=Math.pow(10,dp);
  const whole=ri(1,9);
  const fracs=new Set();
  while(fracs.size<4) fracs.add(ri(0,scale-1));
  const arr=[...fracs].map(f=>whole*scale+f);
  const wantMax=Math.random()<0.5;
  const target=wantMax?Math.max(...arr):Math.min(...arr);
  return { q:'Which decimal is the <b>'+(wantMax?'greatest':'smallest')+'</b>?', extra:'',
    choices:arr.map(v=>(v/scale).toFixed(dp)), correct:arr.indexOf(target),
    explain:'Line up the decimal points and compare one place at a time from the left. The '+(wantMax?'greatest':'smallest')+' is '+(target/scale).toFixed(dp)+'.',
    answerText:(target/scale).toFixed(dp) };
}
/* Round a decimal (to+1 places) to the nearest whole number (to=0) or 1 dp
   (to=1). Round half up. All exact via integer arithmetic. */
function gDecRound(to){
  to=to||0;
  const dp=to+1, scale=Math.pow(10,dp), factor=Math.pow(10,to);
  const raw=ri(scale+1, 9*scale);
  const val=raw/scale;
  const base=Math.floor(raw/10), firstDrop=raw%10;
  const roundedTo=firstDrop>=5?base+1:base;
  const rounded=roundedTo/factor;
  const label=(to===0)?'nearest whole number':'1 decimal place';
  const cands=[ base/factor, (base+1)/factor, rounded+1/factor, Math.max(0,rounded-1/factor) ];
  return finishDec('Round <b>'+val.toFixed(dp)+'</b> to the '+label+'.','',
    rounded, cands, '',
    'Look at the digit just after the '+label.replace('nearest ','')+': it is '+firstDrop+'. Since '+firstDrop+' is '+(firstDrop>=5?'5 or more, round up':'4 or less, round down')+', '+val.toFixed(dp)+' becomes '+rounded.toFixed(to)+'.',
    to);
}
/* Express a proper fraction (denominator 10 or 100) as a decimal. */
function gFractionToDecimal(den){
  den=den||10;
  const dp=den===100?2:1;
  const n=ri(1,den-1);
  const val=n/den;
  const cands=[ n/(den*10), (n+1)/den, val*10, (n>9?Math.floor(n/10):n)/10 ];
  return finishDec('Write '+fr(n,den)+' as a decimal.','',
    val, cands, '',
    fr(n,den)+' means '+n+' out of '+den+'. Reading it off the place-value chart gives '+val.toFixed(dp)+'.',
    dp);
}
/* Add or subtract two decimals with matching decimal places. */
function gDecAddSub(dp, mode){
  dp=dp||1;
  const scale=Math.pow(10,dp);
  mode=mode||(Math.random()<0.5?'add':'sub');
  if(mode==='add'){
    let a=ri(1,6*scale), b=ri(1,3*scale);
    if((a+b)%scale===0) b+=1;
    const s=a+b;
    const cands=[ (s+1)/scale, (s-1)/scale, (s+scale)/scale, Math.abs(a-b)/scale ];
    return finishDec((a/scale).toFixed(dp)+' + '+(b/scale).toFixed(dp)+' = ?','',
      s/scale, cands, '',
      'Line up the decimal points and add: '+(a/scale).toFixed(dp)+' + '+(b/scale).toFixed(dp)+' = '+(s/scale).toFixed(dp)+'.', dp);
  }
  let a=ri(2*scale,9*scale), b=ri(1,a-1);
  if((a-b)%scale===0) b+=1;
  if(b>=a) b=a-1;
  const s=a-b;
  const cands=[ (s+1)/scale, (s-1)/scale, (a+b)/scale, (s+scale)/scale ];
  return finishDec((a/scale).toFixed(dp)+' − '+(b/scale).toFixed(dp)+' = ?','',
    s/scale, cands, '',
    'Line up the decimal points and subtract: '+(a/scale).toFixed(dp)+' − '+(b/scale).toFixed(dp)+' = '+(s/scale).toFixed(dp)+'.', dp);
}
/* Difficulty-banded wrappers (pools store function refs, like gMulEasy etc.). */
function gDecPV1(){ return gDecPlaceValue(1); }
function gDecPV2(){ return gDecPlaceValue(2); }
function gDecPV3(){ return gDecPlaceValue(3); }
function gDecCmp1(){ return gDecCompare(1); }
function gDecCmp2(){ return gDecCompare(2); }
function gDecRoundWhole(){ return gDecRound(0); }
function gDecRound1(){ return gDecRound(1); }
function gFracToDec10(){ return gFractionToDecimal(10); }
function gFracToDec100(){ return gFractionToDecimal(100); }
function gDecAdd1(){ return gDecAddSub(1,'add'); }
function gDecAdd2(){ return gDecAddSub(2,'add'); }
function gDecSub1(){ return gDecAddSub(1,'sub'); }
function gDecSub2(){ return gDecAddSub(2,'sub'); }



  MQI.registerTopic({
    id:'decimals', level:'P4', strand:'Number and Algebra',
    moeSubTopic:'Decimals: notation, representations and place values (tenths, hundredths, thousandths); comparing and ordering decimals; rounding decimals; expressing fractions as decimals; adding and subtracting decimals',
    label:'Decimal Bay', short:'Decimals', e:'\u{1F30A}',
    skills:{
      place:   {label:'Place value of decimals', tip:'Name each place after the point: tenths, then hundredths, then thousandths.'},
      compare: {label:'Comparing & ordering decimals', tip:'Line up the decimal points and compare one place at a time from the left.'},
      round:   {label:'Rounding decimals', tip:'Look only at the digit just after the place you are rounding to.'},
      convert: {label:'Decimals & fractions', tip:'Tenths go over 10 and hundredths go over 100.'},
      addsub:  {label:'Adding & subtracting decimals', tip:'Stack so the decimal points line up.'}
    },
    pools:{
      1:[[gDecPV1,'place'],[gDecCmp1,'compare'],[gDecAdd1,'addsub']],
      2:[[gDecPV2,'place'],[gDecCmp2,'compare'],[gDecRoundWhole,'round'],[gFracToDec10,'convert'],[gDecAdd2,'addsub'],[gDecSub1,'addsub']],
      3:[[gDecPV3,'place'],[gDecRound1,'round'],[gFracToDec100,'convert'],[gDecSub2,'addsub'],[gDecCmp2,'compare']]
    }
  });
})();
