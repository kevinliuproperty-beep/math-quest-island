"use strict";
/* Math Quest Island topic: tables (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

function gMulEasy(){ return gMul(EASY_TABLES); }
function gMulHard(){ return gMul(HARD_TABLES); }
function gDivFact(){
  const a=pick(EASY_TABLES.concat(HARD_TABLES)), b=ri(2,10), p=a*b;
  return finishNum(p+' ÷ '+a+' = ?','',b,[b+1,b-1,a,b+2],'',
    'Think multiplication: '+a+' × <b>'+b+'</b> = '+p+', so '+p+' ÷ '+a+' = '+b+'.');
}
function gMissFactor(){
  const a=pick(EASY_TABLES.concat(HARD_TABLES)), b=ri(2,10), p=a*b;
  return finishNum(a+' × ? = '+p,'',b,[b+1,b-1,a,b+2],'',
    a+' × <b>'+b+'</b> = '+p+'. You can also work it out as '+p+' ÷ '+a+' = '+b+'.');
}
function gMulMixed(){ return Math.random()<0.5 ? gMulHard() : gMul([3,4,6,7,8,9]); }


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
      1:[[gMulEasy,'mult'],[gMulEasy,'mult'],[gDivFact,'div']],
      2:[[gMulHard,'mult'],[gDivFact,'div'],[gMissFactor,'missing']],
      3:[[gMulMixed,'mult'],[gMissFactor,'missing'],[gDivFact,'div']]
    }
  });
})();
