"use strict";
/* Math Quest Island app shell: storage, sound, screens, the quiz loop, the timed
 * run, scoring and the leaderboard. Pre-split this was everything after GEN-END
 * inside index.html; behaviour is unchanged.
 * Loads after js/core.js, js/topics/*.js and js/registry.js. Boot is deferred to
 * MQI.boot() (called by js/boot.js) so topics and map nodes are registered first.
 */

let TOPIC='fractions';
let QSET=null;
function makeQuestion(level){
  if(QSET && QSET[level] && QSET[level].length) return QSET[level].shift();
  return makeQuestionFor(TOPIC,level);
}



/* ---------------- Storage ---------------- */
function loadData(){ try{ return JSON.parse(localStorage.getItem('fq1'))||{}; }catch(e){ return {}; } }
function saveData(){ try{ localStorage.setItem('fq1',JSON.stringify(DB)); }catch(e){} }
let DB=loadData();
const AVATARS=[
  ['🦄','Unicorn'],['🥷','Ninja'],['🦸‍♀️','Super Hero'],['🦸‍♂️','Super Hero'],
  ['🧝‍♀️','Elf Warrior'],['🧝‍♂️','Elf Warrior'],['🧚','Fairy Mage'],['🧜‍♀️','Mermaid'],
  ['👸','Princess'],['🤴','Prince'],['👧','Apprentice Mage'],['👦','Young Knight']
];
DB.name=DB.name||'Hero';
if(!AVATARS.some(a=>a[0]===DB.avatar)) DB.avatar='🦄';
DB.sessions=DB.sessions||[];
DB.fame=DB.fame||[];
DB.timed=!!DB.timed;
if(!GRADES.includes(DB.grade)) DB.grade='P3';

/* ---------------- Sound ---------------- */
let AC=null, muted=!!DB.muted;
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function tone(f,t0,dur,type,vol){
  if(muted) return; const c=ac(); if(!c) return;
  const o=c.createOscillator(), g=c.createGain();
  o.type=type||'square'; o.frequency.value=f;
  g.gain.setValueAtTime(vol||.15, c.currentTime+t0);
  g.gain.exponentialRampToValueAtTime(.001, c.currentTime+t0+dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime+t0); o.stop(c.currentTime+t0+dur+.05);
}
const sfx={
  correct(){ tone(523,0,.12); tone(659,.1,.12); tone(784,.2,.2); },
  crit(){ tone(523,0,.1); tone(659,.08,.1); tone(784,.16,.1); tone(1047,.24,.3,'square',.2); },
  wrong(){ tone(180,0,.3,'sawtooth',.12); tone(140,.15,.35,'sawtooth',.12); },
  hit(){ tone(120,0,.15,'sawtooth',.18); },
  tick(){ tone(880,0,.05,'square',.06); },
  win(){ [523,659,784,1047,784,1047].forEach((f,i)=>tone(f,i*.15,.2)); },
  lose(){ [400,350,300,250].forEach((f,i)=>tone(f,i*.2,.25,'triangle',.12)); },
  monsterDown(){ tone(300,0,.1,'triangle'); tone(200,.1,.1,'triangle'); tone(100,.2,.25,'triangle'); }
};

/* ---------------- Game ---------------- */
const MONSTERS=[
  {e:'🟢',name:'Gloop the Slime',hp:50,dmg:10},
  {e:'🦇',name:'Flapper',hp:60,dmg:12},
  {e:'👻',name:'BooBoo',hp:70,dmg:12},
  {e:'🕷️',name:'Skitters',hp:80,dmg:14},
  {e:'🧟',name:'Grumbles',hp:90,dmg:14},
  {e:'🐉',name:'FRACTOR the Dragon 👑',hp:140,dmg:16}
];
const HERO_MAX=100, TIME_LIMIT=20;
let S=null, Q=null, qTimer=null, clockTimer=null;

const $=id=>document.getElementById(id);
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); $(id).classList.add('active'); }
function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function avClass(){ const a=AVATARS.find(x=>x[0]===DB.avatar); return a?a[1]:'Hero'; }
function fmtMs(ms){ const s=Math.round(ms/1000); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function fmtDate(t){ const d=new Date(t); return d.getDate()+'/'+(d.getMonth()+1); }

/* ----- start screen ----- */
function renderStart(){
  $('nameInput').value=DB.name;
  $('startAvatar').textContent=DB.avatar;
  $('heroClass').textContent=avClass();
  const g=$('avatarGrid'); g.innerHTML='';
  AVATARS.forEach(([a,cls])=>{
    const b=document.createElement('button');
    b.className='avBtn'+(a===DB.avatar?' sel':''); b.textContent=a; b.title=cls;
    b.addEventListener('click',()=>{
      DB.avatar=a; saveData();
      $('startAvatar').textContent=a; $('heroClass').textContent=cls;
      document.querySelectorAll('.avBtn').forEach(x=>x.classList.toggle('sel',x.textContent===a));
    });
    g.appendChild(b);
  });
  $('modeRelax').classList.toggle('sel',!DB.timed);
  $('modeTimed').classList.toggle('sel',DB.timed);
  const gr=$('gradeRow'); gr.innerHTML='';
  GRADES.forEach(gd=>{
    const b=document.createElement('button');
    b.className='gradeBtn'+(gd===DB.grade?' sel':''); b.textContent=gd;
    b.addEventListener('click',()=>{ DB.grade=gd; saveData(); renderStart(); });
    gr.appendChild(b);
  });
  $('muteBtn').textContent=muted?'🔇':'🔊';
}
$('nameInput').addEventListener('input',e=>{ DB.name=e.target.value.trim()||'Hero'; saveData(); });
$('modeRelax').addEventListener('click',()=>{ DB.timed=false; saveData(); renderStart(); });
$('modeTimed').addEventListener('click',()=>{ DB.timed=true; saveData(); renderStart(); });

/* ----- map ----- */
function renderMap(){
  const mp=$('mapPath'); mp.innerHTML='';
  $('mapSub').textContent='Quests for '+DB.grade+'. Where will you adventure today?';
  MAP_NODES.filter(n=>n.grades.includes(DB.grade)).forEach((n,i)=>{
    if(i>0){ const d=document.createElement('div'); d.className='pathDots'; d.textContent='• • •'; mp.appendChild(d); }
    const b=document.createElement('button');
    b.className='mapNode '+(i%2?'even':'odd')+(n.locked?' locked':'');
    b.innerHTML='<span class="ne">'+n.e+'</span><span class="nt"><b>'+n.name+'</b><small>'+n.blurb+'</small></span>'+
                '<span class="go">'+(n.locked?'🔒':'▶️')+'</span>';
    if(!n.locked) b.addEventListener('click',()=>{ TOPIC=n.id; newGame(); });
    mp.appendChild(b);
  });
  show('mapScreen');
}

/* ----- battle ----- */
function newGame(){
  DB.name=($('nameInput').value.trim()||DB.name||'Hero'); saveData();
  QSET=buildSetFor(TOPIC,30);
  S={ heroHp:HERO_MAX, mi:0, mHp:MONSTERS[0].hp, level:1, streak:0,
      rightRow:0, wrongRow:0, correct:0, total:0, best:0, maxLevel:1,
      wrongs:[], skills:{}, busy:false, t0:Date.now(), timed:DB.timed };
  $('heroSprite').textContent=DB.avatar;
  $('heroName').textContent=DB.name+' the '+avClass();
  $('timerWrap').classList.toggle('on',S.timed);
  $('runClock').textContent='';
  if(clockTimer) clearInterval(clockTimer);
  if(S.timed){
    clockTimer=setInterval(()=>{ if(S) $('runClock').textContent='⏱'+fmtMs(Date.now()-S.t0); },500);
  }
  renderDots(); renderMonster(); renderHp(); updateStreak();
  show('battleScreen');
  banner(TOPICS[TOPIC].e+' '+TOPICS[TOPIC].label+'! ⭐',1400);
  setTimeout(nextQuestion,300);
}
function renderDots(){
  $('monsterDots').innerHTML=MONSTERS.map((m,i)=>
    '<span class="'+(i===S.mi?'now':'')+'">'+(i<S.mi?'⭐':m.e)+'</span>').join('');
}
function renderMonster(){
  const m=MONSTERS[S.mi];
  const sp=$('monsterSprite');
  sp.classList.remove('dying');
  sp.textContent=m.e;
  $('monsterName').textContent=m.name;
  renderHp();
}
function renderHp(){
  const m=MONSTERS[S.mi];
  $('heroHp').firstElementChild.style.width=Math.max(0,S.heroHp/HERO_MAX*100)+'%';
  $('heroHpText').textContent=Math.max(0,S.heroHp)+' / '+HERO_MAX;
  $('monHp').firstElementChild.style.width=Math.max(0,S.mHp/m.hp*100)+'%';
  $('monHpText').textContent=Math.max(0,S.mHp)+' / '+m.hp;
}
function updateStreak(){ $('streakBox').textContent = S.streak>=2 ? '🔥×'+S.streak : ''; }
function floatDmg(txt,color,side){
  const el=document.createElement('div');
  el.className='floatDmg'; el.textContent=txt; el.style.color=color;
  el.style[side==='right'?'right':'left']=ri(12,22)+'%'; el.style.top='16%';
  $('arena').appendChild(el);
  setTimeout(()=>el.remove(),1000);
}
function banner(txt,ms){
  $('bannerText').innerHTML=txt;
  $('banner').style.display='flex';
  setTimeout(()=>{ $('banner').style.display='none'; }, ms||1100);
}

function stopQTimer(){ if(qTimer){ clearInterval(qTimer); qTimer=null; } }
function startQTimer(){
  stopQTimer();
  let left=TIME_LIMIT;
  const fill=$('timerFill'), num=$('timerNum');
  fill.classList.remove('warn'); fill.style.width='100%'; num.textContent=left;
  const t0=Date.now();
  qTimer=setInterval(()=>{
    const el=(Date.now()-t0)/1000;
    left=Math.max(0,TIME_LIMIT-el);
    fill.style.width=(left/TIME_LIMIT*100)+'%';
    num.textContent=Math.ceil(left);
    if(left<=5) fill.classList.add('warn');
    if(left<=5 && left>0 && Math.abs(left-Math.round(left))<0.06) sfx.tick();
    if(left<=0){ stopQTimer(); timeUp(); }
  },100);
}

function nextQuestion(){
  if(!S) return;
  Q=makeQuestion(S.level);
  $('qtext').innerHTML=Q.q;
  $('qextra').innerHTML=Q.extra||'';
  $('feedback').innerHTML='';
  const box=$('answers'); box.innerHTML='';
  if(Q.typed){
    box.style.display='none';
    $('typedWrap').style.display='flex';
    const inp=$('typedInput');
    inp.value=''; inp.disabled=false;
    setTimeout(()=>{ try{inp.focus();}catch(e){} },60);
  } else {
    box.style.display='grid';
    $('typedWrap').style.display='none';
    Q.choices.forEach((c,i)=>{
      const b=document.createElement('button');
      b.className='ansBtn'; b.innerHTML=c;
      b.addEventListener('click',()=>answer(i,b));
      box.appendChild(b);
    });
  }
  S.busy=false;
  if(S.timed) startQTimer();
}
function lockButtons(){
  if(Q && Q.typed){ $('typedInput').disabled=true; return; }
  document.querySelectorAll('.ansBtn').forEach((b,i)=>{
    b.disabled=true;
    if(i===Q.correct) b.classList.add('good'); else b.classList.add('dim');
  });
}
function recSkill(skill,right){
  if(!S.skills[skill]) S.skills[skill]={r:0,w:0};
  S.skills[skill][right?'r':'w']++;
}
function monsterCounterattack(){
  $('monsterSprite').classList.add('lungeL');
  setTimeout(()=>$('monsterSprite').classList.remove('lungeL'),450);
  $('heroSprite').classList.add('shake');
  setTimeout(()=>$('heroSprite').classList.remove('shake'),500);
  sfx.hit();
  const dmg=MONSTERS[S.mi].dmg+ri(0,3);
  floatDmg('-'+dmg,'#ff8f8f','left');
  S.heroHp-=dmg; renderHp();
  if(S.heroHp<=0) setTimeout(()=>endGame(false),700);
  else setTimeout(nextQuestion,1800);
}
function markWrong(feedbackHtml){
  S.streak=0; S.wrongRow++; S.rightRow=0;
  if(S.wrongRow>=2 && S.level>1){ S.level--; S.wrongRow=0; }
  sfx.wrong();
  S.wrongs.push({q:Q.q+(Q.extra||''), a:Q.answerText, ex:Q.explain, skill:Q.skill});
  $('feedback').innerHTML=feedbackHtml;
  updateStreak();
}
function timeUp(){
  if(!S || S.busy) return; S.busy=true;
  S.total++;
  recSkill(Q.skill,false);
  lockButtons();
  markWrong('<span class="no">⏰ Time\'s up! '+(Q.typed?('The answer is <b>'+Q.answerText+'</b>. '):'')+Q.explain+'</span>');
  setTimeout(monsterCounterattack,1000);
}
function resolve(right){
  if(right){
    S.correct++; S.streak++; S.rightRow++; S.wrongRow=0;
    S.best=Math.max(S.best,S.streak);
    if(S.rightRow>=3 && S.level<3){ S.level++; S.rightRow=0; }
    S.maxLevel=Math.max(S.maxLevel,S.level);
    const crit=S.streak>=3;
    const dmg=(18+S.level*6+ri(0,4))*(crit?2:1);
    if(crit){ sfx.crit(); banner('💥 CRITICAL HIT!'); } else sfx.correct();
    $('feedback').innerHTML='<span class="ok">'+pick(['Great job! ⚔️','Correct! 💪','Awesome! ✨','Nice one! 🌟'])+'</span>';
    updateStreak();
    setTimeout(()=>{
      $('heroSprite').classList.add('lunge');
      setTimeout(()=>$('heroSprite').classList.remove('lunge'),450);
      const sp=$('monsterSprite');
      sp.classList.add('shake'); setTimeout(()=>sp.classList.remove('shake'),500);
      sfx.hit();
      floatDmg('-'+dmg, crit?'#ffe66d':'#ff8f8f','right');
      S.mHp-=dmg; renderHp();
      if(S.mHp<=0) setTimeout(monsterDown,450);
      else setTimeout(nextQuestion,550);
    },250);
  } else {
    markWrong('<span class="no">'+(Q.typed?('The answer is <b>'+Q.answerText+'</b>. '):'')+Q.explain+'</span>');
    setTimeout(monsterCounterattack,1000);
  }
}
function answer(i,btn){
  if(S.busy) return; S.busy=true;
  stopQTimer();
  const c=ac(); if(c&&c.resume) c.resume();
  S.total++;
  const right = i===Q.correct;
  recSkill(Q.skill,right);
  lockButtons();
  if(!right && btn){ btn.classList.remove('dim'); btn.classList.add('bad'); }
  resolve(right);
}
function answerTyped(){
  if(!S || S.busy || !Q || !Q.typed) return;
  const v=$('typedInput').value.trim();
  if(v==='') return;
  S.busy=true;
  stopQTimer();
  const c=ac(); if(c&&c.resume) c.resume();
  S.total++;
  const right = parseInt(v,10)===Q.answer;
  recSkill(Q.skill,right);
  $('typedInput').disabled=true;
  resolve(right);
}
function monsterDown(){
  sfx.monsterDown();
  $('monsterSprite').classList.add('dying');
  banner('⭐ Crystal rescued! ⭐',1000);
  S.heroHp=Math.min(HERO_MAX,S.heroHp+12);
  setTimeout(()=>{
    S.mi++;
    if(S.mi>=MONSTERS.length){ endGame(true); return; }
    S.mHp=MONSTERS[S.mi].hp;
    renderDots(); renderMonster(); renderHp();
    if(S.mi===MONSTERS.length-1) banner('👑 BOSS BATTLE! 👑',1200);
    setTimeout(nextQuestion,350);
  },1000);
}
function confetti(){
  for(let i=0;i<40;i++){
    const el=document.createElement('div');
    el.className='confetti';
    el.textContent=pick(['🎉','⭐','✨','🎊','💛']);
    el.style.left=ri(0,100)+'vw';
    el.style.animationDuration=(ri(20,40)/10)+'s';
    el.style.animationDelay=(ri(0,15)/10)+'s';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),6000);
  }
}
function endGame(win){
  stopQTimer();
  if(clockTimer){ clearInterval(clockTimer); clockTimer=null; }
  const ms=Date.now()-S.t0;
  DB.sessions.push({
    t:Date.now(), topic:TOPIC, won:win, correct:S.correct, total:S.total,
    best:S.best, crystals:S.mi, maxLevel:S.maxLevel, skills:S.skills,
    ms, timed:S.timed, wrongs:S.wrongs.slice(0,10)
  });
  if(DB.sessions.length>60) DB.sessions=DB.sessions.slice(-60);

  /* hall of fame: winning runs, ranked by time */
  let fameRank=-1;
  if(win){
    DB.fame.push({name:DB.name, avatar:DB.avatar, topic:TOPIC, ms, timed:S.timed,
                  acc:(S.total?Math.round(S.correct/S.total*100):0), t:Date.now()});
    DB.fame.sort((a,b)=>a.ms-b.ms);
    DB.fame=DB.fame.slice(0,10);
    fameRank=DB.fame.findIndex(f=>f.ms===ms && f.name===DB.name);
    /* submit to world leaderboard (best-effort; silently skipped offline) */
    try{
      fetch('api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:DB.name,avatar:DB.avatar,topic:TOPIC,ms,
          acc:(S.total?Math.round(S.correct/S.total*100):0),timed:S.timed})}).catch(()=>{});
    }catch(e){}
  }
  saveData();

  if(win){ sfx.win(); confetti(); } else sfx.lose();
  $('endEmoji').textContent=win?'🏆':'💪';
  $('endTitle').textContent=win?'VICTORY!':'So close, '+esc(DB.name)+'!';
  let msg = win
    ? esc(DB.name)+' the '+avClass()+' saved all 6 Star Crystals of '+TOPICS[TOPIC].label+'!'
    : 'You rescued '+S.mi+' crystal'+(S.mi===1?'':'s')+' this time. Every battle makes your magic stronger. Try again!';
  if(win && fameRank===0) msg+=' 🥇 NEW RECORD, fastest run ever!';
  else if(win && fameRank>0) msg+=' You made the Hall of Fame at #'+(fameRank+1)+'!';
  $('endMsg').textContent=msg;
  $('stCorrect').textContent=S.correct+' / '+S.total;
  $('stAcc').textContent=(S.total?Math.round(S.correct/S.total*100):0)+'%';
  $('stStreak').textContent='🔥'+S.best;
  $('stTime').textContent=fmtMs(ms);
  const rb=$('reviewBox'), rl=$('reviewList');
  if(S.wrongs.length){
    rb.style.display='block';
    const seen=new Set();
    rl.innerHTML=S.wrongs.filter(w=>{ if(seen.has(w.q))return false; seen.add(w.q); return true; })
      .slice(0,8)
      .map(w=>'<div class="revItem">'+w.q+'<br><span class="ansIs">Answer: '+w.a+'</span><br><span class="how">'+w.ex+'</span></div>').join('');
  } else rb.style.display='none';
  show('endScreen');
}

/* ---------------- Hall of Fame ---------------- */
let fameTab='global';
function fameRowHtml(f,i){
  const medals=['🥇','🥈','🥉'];
  return '<div class="fameRow"><span class="rk">'+(medals[i]||('#'+(i+1)))+'</span>'+
    '<span class="fa">'+esc(f.avatar||'🦄')+'</span>'+
    '<span class="fn">'+esc(f.name||'Hero')+'<small>'+(TOPICS[f.topic]?TOPICS[f.topic].e+' '+TOPICS[f.topic].short:esc(f.topic||''))+' · '+(f.acc||0)+'% · '+(f.timed?'⏱️ arcade':'🌙 relaxed')+' · '+fmtDate(f.t||Date.now())+'</small></span>'+
    '<span class="ft">'+fmtMs(f.ms||0)+'</span></div>';
}
function renderFame(){
  $('tabGlobal').classList.toggle('sel',fameTab==='global');
  $('tabLocal').classList.toggle('sel',fameTab==='local');
  const fl=$('fameList');
  const emptyMsg='<div style="color:#a99fd8;text-align:center;padding:10px">No victories yet. Beat Fractor to claim the first spot! 🐉</div>';
  if(fameTab==='local'){
    fl.innerHTML = DB.fame.length ? DB.fame.map(fameRowHtml).join('') : emptyMsg;
  } else {
    fl.innerHTML='<div style="color:#a99fd8;text-align:center;padding:10px">Loading world rankings… 🌍</div>';
    fetch('api/leaderboard').then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(d=>{
      if(fameTab!=='global') return;
      const rows=(d&&d.rows)||[];
      fl.innerHTML = rows.length ? rows.map(fameRowHtml).join('')
        : '<div style="color:#a99fd8;text-align:center;padding:10px">No world victories yet. Be the first! 🐉</div>';
    }).catch(()=>{
      if(fameTab!=='global') return;
      fl.innerHTML='<div style="color:#a99fd8;text-align:center;padding:10px">World leaderboard is warming up, showing this device instead.</div>'+
        (DB.fame.length?DB.fame.map(fameRowHtml).join(''):'');
    });
  }
  show('fameScreen');
}

/* ---------------- Parent report ---------------- */
function renderParent(){
  const ss=DB.sessions;
  $('parentIntro').textContent = ss.length
    ? esc(DB.name)+' has played '+ss.length+' session'+(ss.length===1?'':'s')+'. Data below covers all of them.'
    : 'No sessions played yet. Data will appear here after the first game.';

  /* aggregate per topic+skill */
  const agg={};
  ss.forEach(s=>{
    for(const k in (s.skills||{})){
      const key=(s.topic||'fractions')+'|'+k;
      if(!agg[key])agg[key]={r:0,w:0};
      agg[key].r+=s.skills[k].r; agg[key].w+=s.skills[k].w;
    }
  });
  const rows=Object.keys(agg).map(key=>{
    const [tp,k]=key.split('|');
    const a=agg[key], n=a.r+a.w, pct=n?Math.round(a.r/n*100):0;
    const meta=(TOPICS[tp]&&TOPICS[tp].skills[k])||{};
    return {n, pct, label:meta.label||k, tip:meta.tip||'', tlabel:TOPICS[tp]?TOPICS[tp].e+' '+TOPICS[tp].short:tp};
  }).sort((x,y)=>x.pct-y.pct);

  $('skillList').innerHTML = rows.length ? rows.map(r=>{
    const col = r.pct>=80?'#2ecc71':r.pct>=60?'#ffd166':'#ff6f61';
    return '<div class="skillRow"><div class="skillName">'+r.label+'<br><small>'+r.tlabel+' · '+r.n+' question'+(r.n===1?'':'s')+'</small></div>'+
      '<div class="accBar"><div style="width:'+r.pct+'%;background:'+col+'"></div></div>'+
      '<div class="accPct" style="color:'+col+'">'+r.pct+'%</div></div>';
  }).join('') : '<div style="color:#a99fd8;font-size:14px">No data yet.</div>';

  const focus=rows.filter(r=>r.n>=4 && r.pct<75).slice(0,3);
  $('focusList').innerHTML = focus.length
    ? focus.map(r=>'<div class="focus"><b>'+r.label+'</b> ('+r.tlabel+'): '+r.pct+'% over '+r.n+' questions.<br>'+r.tip+'</div>').join('')
    : (rows.length? '<div style="color:#7dffb0;font-size:15px;text-align:center">No weak areas detected right now: accuracy is solid across skills. 🎉</div>'
                   : '<div style="color:#a99fd8;font-size:14px">Play a few sessions first.</div>');

  const recent=ss.slice(-10).reverse();
  $('histTable').innerHTML='<tr><th>Date</th><th>Land</th><th>Mode</th><th>Result</th><th>Score</th><th>Acc</th><th>Time</th></tr>'+
    recent.map(s=>'<tr><td>'+fmtDate(s.t)+'</td><td>'+(TOPICS[s.topic]?TOPICS[s.topic].e:'')+'</td><td>'+(s.timed?'⏱️':'🌙')+'</td><td>'+
      (s.won?'🏆':'💪')+'</td><td>'+s.correct+'/'+s.total+'</td><td>'+
      (s.total?Math.round(s.correct/s.total*100):0)+'%</td><td>'+(s.ms?fmtMs(s.ms):'-')+'</td></tr>').join('');

  function accOf(list){ let r=0,t=0; list.forEach(s=>{r+=s.correct;t+=s.total;}); return t?r/t*100:null; }
  const last3=accOf(ss.slice(-3)), prev3=accOf(ss.slice(-6,-3));
  let tl='';
  if(last3!==null && prev3!==null){
    const d=last3-prev3;
    tl = 'Trend: '+(d>3?'<span class="trendUp">▲ improving</span>':d<-3?'<span class="trendDown">▼ dipping</span>':'<span class="trendFlat">● steady</span>')+
         ' (last 3 sessions '+Math.round(last3)+'% vs previous 3 sessions '+Math.round(prev3)+'%)';
  } else if(last3!==null){
    tl='Trend: play '+(ss.length<6?(6-ss.length):'more')+' more sessions for a reliable trend.';
  }
  $('trendLine').innerHTML=tl;

  const wr=[]; ss.slice(-3).forEach(s=>(s.wrongs||[]).forEach(w=>wr.push(w)));
  const seen=new Set();
  const uniq=wr.filter(w=>{ if(seen.has(w.q))return false; seen.add(w.q); return true; }).slice(-8);
  if(uniq.length){
    $('recentWrongBox').style.display='block';
    $('recentWrongList').innerHTML=uniq.map(w=>'<div class="revItem">'+w.q+'<br><span class="ansIs">Answer: '+w.a+'</span><br><span class="how">'+w.ex+'</span></div>').join('');
  } else $('recentWrongBox').style.display='none';

  show('parentScreen');
}

/* ---------------- Wiring ---------------- */

/* ---------------- mode contract plumbing (see js/modes/README.md) ---------------- */
/* Builds the ctx handed to a registered mode. A mode never touches the DOM directly. */
MQI.makeModeCtx = function (opts) {
  const o = opts || {};
  const t0 = Date.now();
  return {
    nextQuestion(){ nextQuestion(); return Q; },
    submitAnswer(a){
      if (Q && Q.typed) { $('typedInput').value = a; answerTyped(); }
      else { answer(a); }
    },
    get timeLeftMs(){ return o.durationMs ? Math.max(0, o.durationMs - (Date.now() - t0)) : Infinity; },
    get elapsedMs(){ return Date.now() - t0; },
    get streak(){ return S ? S.streak : 0; },
    get difficulty(){ return S ? S.level : 1; },
    get level(){ return DB.grade; },
    get topicId(){ return TOPIC; },
    ui: {
      setHud(html){ const el = $('modeHud') || $('streakBox'); if (el) el.innerHTML = html; },
      setBanner(html){ banner(html, 1200); },
      setTheme(className){ document.body.setAttribute('data-mode-theme', className || ''); },
      pulse(kind){
        const map = { crit:'crit', hit:'hit', freeze:'tick', miss:'wrong', enrage:'monsterDown',
                      correct:'correct', wrong:'wrong', win:'win', lose:'lose' };
        const fn = sfx[map[kind] || kind];
        if (fn) fn();
      }
    },
    leaderboard: {
      submit(record){
        try {
          return fetch('api/leaderboard', { method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify(record) });
        } catch (e) { return Promise.resolve(); }
      }
    }
  };
};

/* Starts a registered mode against a fresh run. Existing play paths are untouched. */
MQI.startMode = function (id, opts) {
  const mode = MQI.modes[id];
  if (!mode) throw new Error('startMode: no such mode ' + id);
  const ctx = MQI.makeModeCtx(opts);
  MQI.activeMode = { mode, ctx, timer: setInterval(() => mode.tick(ctx), 200) };
  mode.start(ctx);
  return ctx;
};
MQI.endMode = function () {
  const a = MQI.activeMode;
  if (!a) return null;
  clearInterval(a.timer);
  MQI.activeMode = null;
  return a.mode.end(a.ctx);
};

/* ---------------- boot ---------------- */
MQI.boot = function () {
  /* modes may have queued themselves before core.js ran */
  if (MQI.drainPendingModes) MQI.drainPendingModes();
  $('toMapBtn').addEventListener('click',()=>{ ac(); renderMap(); });
  $('mapBackBtn').addEventListener('click',()=>{ renderStart(); show('startScreen'); });
  $('againBtn').addEventListener('click',newGame);
  $('endMapBtn').addEventListener('click',renderMap);
  $('homeBtn').addEventListener('click',()=>{ renderStart(); show('startScreen'); });
  $('fameBtn').addEventListener('click',renderFame);
  $('fameBackBtn').addEventListener('click',()=>{ renderStart(); show('startScreen'); });
  $('parentBtn').addEventListener('click',renderParent);
  $('backBtn').addEventListener('click',()=>{ renderStart(); show('startScreen'); });
  $('resetBtn').addEventListener('click',()=>{
    if(confirm('Delete all session history and Hall of Fame? (Name and avatar are kept.)')){
      DB.sessions=[]; DB.fame=[]; saveData(); renderParent();
    }
  });
  $('muteBtn').addEventListener('click',()=>{ muted=!muted; DB.muted=muted; saveData(); $('muteBtn').textContent=muted?'🔇':'🔊'; });
  $('typedGo').addEventListener('click',answerTyped);
  $('typedInput').addEventListener('keydown',e=>{ if(e.key==='Enter') answerTyped(); });
  $('tabGlobal').addEventListener('click',()=>{ fameTab='global'; renderFame(); });
  $('tabLocal').addEventListener('click',()=>{ fameTab='local'; renderFame(); });
  
  renderStart();
};
