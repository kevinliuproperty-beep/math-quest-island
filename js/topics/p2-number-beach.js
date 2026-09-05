"use strict";
/* Math Quest Island topic: p2 (P2). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

function gAddSubP2(max){
  if(Math.random()<0.5){
    const a=ri(2,max-2), b=ri(1,max-a);
    return finishNum(a+' + '+b+' = ?','',a+b,[a+b+1,a+b-1,a+b+10,a+b-10],'',
      a+' + '+b+' = '+(a+b)+'.');
  }
  const a=ri(3,max), b=ri(1,a-1);
  return finishNum(a+' − '+b+' = ?','',a-b,[a-b+1,a-b-1,a-b+10,a+b],'',
    a+' − '+b+' = '+(a-b)+'.');
}
function gAddSubP2e(){ return gAddSubP2(20); }
function gAddSubP2m(){ return gAddSubP2(100); }
function gAddSubP2h(){ return gAddSubP2(1000); }
function gBonds(){
  const target=pick([10,20,100]);
  const a=ri(1,target-1);
  return finishNum(a+' + ? = '+target,'',target-a,[target-a+1,Math.max(1,target-a-1),Math.min(target-1,target-a+10),a],'',
    target+' − '+a+' = '+(target-a)+'. '+a+' and '+(target-a)+' make '+target+'!');
}
function gMulP2easy(){ return gMul([2,5,10]); }
function gMulP2hard(){ return gMul([2,3,4,5,10]); }
function gCompareNum(){
  const ns=new Set(); while(ns.size<4) ns.add(ri(10,999));
  const arr=[...ns];
  const wantMax=Math.random()<0.5;
  const best=wantMax?Math.max(...arr):Math.min(...arr);
  return { q:'Which number is the <b>'+(wantMax?'greatest':'smallest')+'</b>?', extra:'',
    choices:arr.map(String), correct:arr.indexOf(best),
    explain:'Compare hundreds first, then tens, then ones. The '+(wantMax?'greatest':'smallest')+' is '+best+'.',
    answerText:String(best) };
}


  MQI.registerTopic({
    id:'p2', level:'P2', strand:'Number and Algebra',
    moeSubTopic:"Whole Numbers: addition and subtraction algorithms; multiplication tables of 2, 3, 4, 5 and 10",
    label:'Number Beach', short:'P2 numbers', e:'🏖️',
    skills:{
      addsub: {label:'Addition & subtraction', tip:'Count on for small sums; column method for bigger ones. Build up: within 20, then 100, then 1000.'},
      bonds:  {label:'Number bonds',           tip:'Drill pairs that make 10, 20 and 100 until instant: 3+7, 13+7, 40+60, 25+75.'},
      mult:   {label:'Times tables (2, 3, 4, 5, 10)', tip:'P2 tables: 2, 5, 10 first, then 3 and 4. Skip count out loud while clapping.'},
      compare:{label:'Comparing numbers',      tip:'Compare hundreds first, then tens, then ones.'}
    },
    pools:{
      1:[[gAddSubP2e,'addsub'],[gBonds,'bonds'],[gMulP2easy,'mult']],
      2:[[gAddSubP2m,'addsub'],[gBonds,'bonds'],[gMulP2easy,'mult'],[gCompareNum,'compare']],
      3:[[gAddSubP2h,'addsub'],[gMulP2hard,'mult'],[gCompareNum,'compare'],[gBonds,'bonds']]
    }
  });
})();
