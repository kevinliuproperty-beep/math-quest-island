"use strict";
/* Math Quest Island topic: fractions (P3). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 * Loads after js/core.js. Touches no other file.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

function gPicIdentify(){
  const d=ri(2,8), n=ri(1,d-1);
  let bar='<div class="barModel">';
  for(let i=0;i<d;i++) bar+='<div class="seg'+(i<n?' fill':'')+'"></div>';
  bar+='</div>';
  const cands=[[d-n,d],[n,d+1],[n+1,d],[n,d-1]];
  return finishFrac('What fraction of the bar is <b>blue</b>?', bar, [n,d], cands,
    n+' out of '+d+' parts are blue, so it is '+fr(n,d)+'.');
}
function gCompare4(mode){
  let pairs=[];
  if(mode==='unit'){ const ds=shuffle([2,3,4,5,6,7,8,9,10,12]).slice(0,4); pairs=ds.map(d=>[1,d]); }
  else if(mode==='sameD'){ const d=ri(6,12); const ns=shuffle([...Array(d-1).keys()].map(i=>i+1)).slice(0,4); pairs=ns.map(n=>[n,d]); }
  else { const n=ri(1,3); const ds=shuffle([n+1,n+2,n+3,n+4,n+5,n+6,n+7].filter(x=>x<=12)).slice(0,4); pairs=ds.map(d=>[n,d]); }
  const wantMax=Math.random()<0.5;
  let bestI=0;
  for(let i=1;i<4;i++){
    const better = wantMax ? pairs[i][0]*pairs[bestI][1] > pairs[bestI][0]*pairs[i][1]
                           : pairs[i][0]*pairs[bestI][1] < pairs[bestI][0]*pairs[i][1];
    if(better) bestI=i;
  }
  const why = mode==='sameD' ? 'Same denominator: compare the numerators.'
                             : 'Same numerator: the smaller denominator means bigger pieces.';
  return { q:'Which fraction is the <b>'+(wantMax?'greatest':'smallest')+'</b>?', extra:'',
    choices:pairs.map(p=>fr(p[0],p[1])), correct:bestI,
    explain:why+' The '+(wantMax?'greatest':'smallest')+' is '+fr(pairs[bestI][0],pairs[bestI][1])+'.',
    answerText: fr(pairs[bestI][0],pairs[bestI][1]) };
}
function gCompareUnit(){ return gCompare4('unit'); }
function gAddSame(){
  const d=ri(3,8);
  const a=ri(1,d-2), b=ri(1,d-a-1);
  const s=a+b;
  const cands=[[s,2*d],[s+1,d],[s-1,d],[Math.abs(a-b)||s+2,d]];
  return finishFrac(fr(a,d)+' + '+fr(b,d)+' = ?','',[s,d],cands,
    'Same denominator: just add the numerators. '+a+' + '+b+' = '+s+', so the answer is '+fr(s,d)+'.');
}
const SIMPLE=[[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6]];
function gEqMissing(){
  const base=pick(SIMPLE.filter(p=>p[1]<=6));
  const [n,d]=base;
  const ks=[]; for(let k=2;k<=4;k++) if(k*d<=12) ks.push(k);
  const k=pick(ks); const ans=k*n;
  const wrongs=shuffle([ans+1, Math.max(1,ans-1), n+(k*d-d), ans+k]).filter(w=>w!==ans && w>=1);
  const opts=[ans];
  for(const w of wrongs){ if(opts.length<4 && !opts.includes(w)) opts.push(w); }
  let t=2; while(opts.length<4){ if(!opts.includes(ans+t)) opts.push(ans+t); t++; }
  const order=shuffle(opts.map((_,i)=>i));
  return { q: fr(n,d)+' = <span class="frac"><span class="n">?</span><span class="d">'+(k*d)+'</span></span> &nbsp; What is the missing numerator?',
    extra:'', choices: order.map(i=>''+opts[i]), correct: order.indexOf(0),
    explain: 'The denominator was multiplied by '+k+' ('+d+' × '+k+' = '+(k*d)+'), so multiply the numerator by '+k+' too: '+n+' × '+k+' = '+ans+'.',
    answerText: ''+ans };
}
function gPickEquiv(){
  const base=pick(SIMPLE.filter(p=>p[1]<=6));
  const [n,d]=base;
  const ks=[]; for(let k=2;k<=4;k++) if(k*d<=12) ks.push(k);
  const k=pick(ks);
  const cands=[[n,k*d],[n+1,d+1],[k*n,k*d+1],[k*n+1,k*d]];
  return finishFrac('Which fraction is <b>equivalent</b> to '+fr(n,d)+'?','',[k*n,k*d],
    cands.filter(c=>!eq(c[0],c[1],n,d)),
    fr(n,d)+' × '+k+' on top and bottom gives '+fr(k*n,k*d)+'.');
}
function gCompareSameD(){ return gCompare4('sameD'); }
function gCompareSameN(){ return gCompare4('sameN'); }
function gSubSame(){
  const d=ri(4,12); const a=ri(2,d-1); const b=ri(1,a-1);
  const s=a-b;
  const cands=[[a+b,d],[s+1,d],[s,2*d],[Math.max(1,s-1),d]];
  return finishFrac(fr(a,d)+' − '+fr(b,d)+' = ?','',[s,d],cands,
    'Same denominator: subtract the numerators. '+a+' − '+b+' = '+s+', so the answer is '+fr(s,d)+'.');
}
function gSubFromOne(){
  const d=ri(4,12); const a=ri(1,d-1); const s=d-a;
  const cands=[[a,d],[Math.max(1,s-1),d],[s+1,d],[s,d+1]];
  return finishFrac('1 − '+fr(a,d)+' = ?','',[s,d],cands,
    '1 whole = '+fr(d,d)+'. Then '+d+' − '+a+' = '+s+', so the answer is '+fr(s,d)+'.');
}
function gMakeOne(){
  const d=ri(4,12); const a=ri(1,d-1); const s=d-a;
  const cands=[[a,d],[s+1,d],[Math.max(1,s-1),d],[s,2*d]];
  return finishFrac(fr(a,d)+' + ? = 1 &nbsp; What is the missing fraction?','',[s,d],cands,
    '1 whole = '+fr(d,d)+'. You need '+d+' − '+a+' = '+s+' more parts: '+fr(s,d)+'.');
}
function gGreatest4(){ return gCompare4(pick(['sameD','sameN','unit'])); }
function gSimplest(){
  const base=pick(SIMPLE.filter(p=>p[1]<=6));
  const [n,d]=base;
  const ks=[]; for(let k=2;k<=4;k++) if(k*d<=12) ks.push(k);
  const k=pick(ks);
  const N=k*n, D=k*d;
  const cands=[[n+1,d+1],[Math.max(1,n===1?2:n-1),d],[n,Math.min(12,d+1)]];
  if(k===4) cands.unshift([2*n,2*d]);
  const pairs=[[n,d]];
  for(const c of cands){
    if(pairs.length>=4) break;
    if(c[0]<1||c[0]>c[1]) continue;
    if(pairs.some(s=>s[0]===c[0]&&s[1]===c[1])) continue;
    if(eq(c[0],c[1],n,d) && !(c[0]===2*n&&c[1]===2*d)) continue;
    pairs.push(c);
  }
  let t=1;
  while(pairs.length<4){ const c=[n+t,d+t+1]; if(c[0]<=c[1]&&!pairs.some(s=>s[0]===c[0]&&s[1]===c[1])&&!eq(c[0],c[1],n,d)) pairs.push(c); t++; if(t>30)break; }
  const order=shuffle(pairs.map((_,i)=>i));
  return { q:'Express '+fr(N,D)+' in its <b>simplest form</b>.', extra:'',
    choices:order.map(i=>fr(pairs[i][0],pairs[i][1])), correct:order.indexOf(0),
    explain:'Divide top and bottom by '+k+': '+fr(N,D)+' = '+fr(n,d)+'.',
    answerText: fr(n,d) };
}


  MQI.registerTopic({
    id:'fractions', level:'P3', strand:'Number and Algebra',
    moeSubTopic:"Fractions: equivalent fractions; comparing and ordering unlike fractions; addition and subtraction",
    label:'Fraction Forest', short:'Fractions', e:'🌳',
    skills:{
      identify:  {label:'Reading fractions from pictures', tip:'Draw or shade bars and name the fraction aloud: "3 out of 8 parts is 3/8".'},
      compare:   {label:'Comparing fractions',             tip:'Two rules: same denominator → compare numerators; same numerator → smaller denominator wins. Draw two bars side by side when stuck.'},
      order:     {label:'Ordering fractions',              tip:'Use the same comparing rules across 3 fractions. Start with unit fractions (1/2, 1/3, 1/4...).'},
      equivalent:{label:'Equivalent fractions',            tip:'Multiply top AND bottom by the same number. Chant the families: 1/2 = 2/4 = 3/6 = 4/8.'},
      addsub:    {label:'Adding & subtracting (same denominator)', tip:'Only numerators add or subtract: the denominator is the piece size and stays the same.'},
      wholes:    {label:'Making one whole',                tip:'Remember 1 = 8/8 = 12/12. Ask: "how many more parts to fill the whole?"'},
      simplest:  {label:'Simplest form',                   tip:'Divide top and bottom by the same number until you can\'t. Drill the common ones: 4/6→2/3, 6/8→3/4, 8/12→2/3.'}
    },
    pools:{
      1:[[gPicIdentify,'identify'],[gCompareUnit,'compare'],[gAddSame,'addsub']],
      2:[[gEqMissing,'equivalent'],[gPickEquiv,'equivalent'],[gCompareSameD,'compare'],[gCompareSameN,'compare'],[gSubSame,'addsub'],[gAddSame,'addsub']],
      3:[[gSubFromOne,'wholes'],[gMakeOne,'wholes'],[gGreatest4,'order'],[gSimplest,'simplest'],[gEqMissing,'equivalent'],[gPickEquiv,'equivalent']]
    }
  });
})();
