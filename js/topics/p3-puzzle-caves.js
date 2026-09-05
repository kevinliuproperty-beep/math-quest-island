"use strict";
/* Math Quest Island topic: heuristics (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

function gPatternEasy(){
  const s=ri(1,9), d=pick([2,3,5,10]);
  const terms=[s,s+d,s+2*d,s+3*d];
  return finishTyped('What comes next? &nbsp; <b>'+terms.join(', ')+', ?</b>',
    s+4*d,'The pattern adds '+d+' each time: '+terms[3]+' + '+d+' = '+(s+4*d)+'.');
}
function gPatternHard(){
  const s=ri(2,12), d=pick([4,6,7,9,11]);
  const terms=[s,s+d,s+2*d,s+3*d];
  return finishTyped('What comes next? &nbsp; <b>'+terms.join(', ')+', ?</b>',
    s+4*d,'The pattern adds '+d+' each time: '+terms[3]+' + '+d+' = '+(s+4*d)+'.');
}
function gBackwards1(){
  const x=ri(3,50), a=ri(2,30);
  if(Math.random()<0.5){
    return finishTyped('I think of a number. I <b>add '+a+'</b> and get <b>'+(x+a)+'</b>. What is my number?',
      x,'Work backwards: '+(x+a)+' − '+a+' = '+x+'.');
  }
  return finishTyped('I think of a number. I <b>subtract '+a+'</b> and get <b>'+x+'</b>. What is my number?',
    x+a,'Work backwards: '+x+' + '+a+' = '+(x+a)+'.');
}
function gBackwards2(){
  const x=ri(2,15), m=pick([2,3]), a=ri(2,20);
  return finishTyped('I think of a number. I <b>multiply by '+m+'</b>, then <b>add '+a+'</b>, and get <b>'+(x*m+a)+'</b>. What is my number?',
    x,'Work backwards: '+(x*m+a)+' − '+a+' = '+(x*m)+', then '+(x*m)+' ÷ '+m+' = '+x+'.');
}
function gGiveTake(){
  const start=ri(10,60), gave=ri(2,9), got=ri(2,9);
  const now=start-gave+got;
  return finishTyped('Mei had some stickers. She <b>gave away '+gave+'</b>, then <b>got '+got+' more</b>. Now she has <b>'+now+'</b>. How many did she have at first?',
    start,'Work backwards: '+now+' − '+got+' = '+(now-got)+', then '+(now-got)+' + '+gave+' = '+start+'.');
}
function gHeadsLegs(){
  const g=ri(1,5), c=ri(2,7);
  const heads=g+c, legs=4*g+2*c;
  return finishTyped('A farm has chickens and goats. There are <b>'+heads+' heads</b> and <b>'+legs+' legs</b>. How many <b>goats</b>?',
    g,'Guess and check: if all '+heads+' were chickens there would be '+(2*heads)+' legs. The extra '+(legs-2*heads)+' legs ÷ 2 = '+g+' goats.');
}
function gMakeHundred(){
  const a=ri(11,89);
  return finishTyped(a+' + ? = 100',100-a,'100 − '+a+' = '+(100-a)+'.');
}


  MQI.registerTopic({
    id:'heuristics', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Whole Numbers: patterns in number sequences (problem-solving heuristics are not enumerated in the 2021 syllabus)",
    label:'Puzzle Caves', short:'Heuristics', e:'🧩',
    skills:{
      pattern:   {label:'Number patterns',  tip:'Find the jump between numbers first: write the differences above the gaps.'},
      backwards: {label:'Working backwards',tip:'Start from the answer and undo each step in reverse: + undoes −, × undoes ÷.'},
      guesscheck:{label:'Guess and check',  tip:'Make a sensible first guess, check it, adjust up or down. A small table keeps it tidy.'},
      bonds:     {label:'Making 100',       tip:'Make the next ten first, then add the remaining tens.'}
    },
    pools:{
      1:[[gPatternEasy,'pattern'],[gMakeHundred,'bonds'],[gBackwards1,'backwards']],
      2:[[gBackwards1,'backwards'],[gGiveTake,'backwards'],[gPatternEasy,'pattern']],
      3:[[gBackwards2,'backwards'],[gHeadsLegs,'guesscheck'],[gPatternHard,'pattern']]
    }
  });
})();
