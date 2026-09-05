"use strict";
/* Math Quest Island topic: geometry (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

function rectHtml(L,B){
  const w=Math.min(240,L*20), h=Math.max(34,Math.min(110,B*16));
  return '<div style="display:inline-block;padding:0 56px 0 8px">'+
         '<div class="rectBox" style="width:'+w+'px;height:'+h+'px"><span class="rectLabelB">'+B+' cm</span></div>'+
         '<div class="rectLabelL" style="width:'+w+'px">'+L+' cm</div></div>';
}
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
      1:[[gSquarePA,'peri'],[gPeri,'peri']],
      2:[[gPeri,'peri'],[gAreaRect,'area'],[gSquarePA,'area']],
      3:[[gMissSide,'missing'],[gAreaRect,'area'],[gPeri,'peri']]
    }
  });
})();
