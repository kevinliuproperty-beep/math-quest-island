"use strict";
/* Math Quest Island app shell: storage, sound, screens, the quiz loop, the timed
 * run, scoring and the leaderboard. Pre-split this was everything after GEN-END
 * inside index.html; behaviour is unchanged.
 * Loads after js/core.js, js/topics/*.js and js/registry.js. Boot is deferred to
 * MQI.boot() (called by js/boot.js) so topics and map nodes are registered first.
 */

/* Phase 0 split regression, found by the Patchwerk integration: the shell calls the
   bare helpers ri() and pick() (floatDmg, resolve, confetti, monsterCounterattack),
   but core.js only re-exported TOPICS / makeQuestionFor / buildSetFor as globals.
   Every one of those call sites was throwing ReferenceError post-split. The kit is
   frozen, so the back-compat names are re-bound here rather than added to core.js. */
const ri = MQI.gen.ri, pick = MQI.gen.pick;

let TOPIC='fractions';
let QSET=null;
/* A mode may install its own question feed (Patchwerk draws across every unlocked
   topic for the chosen class level). Null = the normal single-topic quiz set. */
let MODE_FEED=null;
function makeQuestion(level){
  if(MODE_FEED) return MODE_FEED(level);
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
/* gameMode: 'relax' | 'timed' | 'patchwerk'. DB.timed is kept in sync for the
   existing session records and the Hall of Fame rows. */
if(['relax','timed','patchwerk'].indexOf(DB.gameMode)===-1) DB.gameMode = DB.timed?'timed':'relax';
DB.pwTier = DB.pwTier || 'normal';
DB.pwFame = Array.isArray(DB.pwFame) ? DB.pwFame : [];
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
  $('modeRelax').classList.toggle('sel',DB.gameMode==='relax');
  $('modeTimed').classList.toggle('sel',DB.gameMode==='timed');
  $('modePatch').classList.toggle('sel',DB.gameMode==='patchwerk');
  /* Boss tier selector: only meaningful for Patchwerk, so it only shows there. */
  $('pwPanel').classList.toggle('on',DB.gameMode==='patchwerk');
  const tr=$('tierRow'); tr.innerHTML='';
  const TIERS=(MQI.modes.patchwerk&&MQI.modes.patchwerk.config.TIERS)||{};
  ['short','normal','long'].forEach(k=>{
    const t=TIERS[k]; if(!t) return;
    const b=document.createElement('button');
    b.className='tierBtn'+(k===DB.pwTier?' sel':'');
    b.innerHTML=Math.round(t.durationMs/60000)+' min<small>'+t.label+'</small>';
    b.addEventListener('click',()=>{ DB.pwTier=k; saveData(); renderStart(); });
    tr.appendChild(b);
  });
  const gr=$('gradeRow'); gr.innerHTML='';
  GRADES.forEach(gd=>{
    const b=document.createElement('button');
    b.className='gradeBtn'+(gd===DB.grade?' sel':''); b.textContent=gd;
    b.addEventListener('click',()=>{ DB.grade=gd; saveData(); renderStart(); });
    gr.appendChild(b);
  });
  $('muteBtn').textContent=muted?'🔇':'🔊';
  $('toMapBtn').textContent = DB.gameMode==='patchwerk' ? 'FIGHT PATCHWERK 💀' : 'CHOOSE YOUR QUEST 🗺️';
}
$('nameInput').addEventListener('input',e=>{ DB.name=e.target.value.trim()||'Hero'; saveData(); });
$('modeRelax').addEventListener('click',()=>{ DB.gameMode='relax'; DB.timed=false; saveData(); renderStart(); });
$('modeTimed').addEventListener('click',()=>{ DB.gameMode='timed'; DB.timed=true; saveData(); renderStart(); });
$('modePatch').addEventListener('click',()=>{ DB.gameMode='patchwerk'; DB.timed=false; saveData(); renderStart(); });

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
  if(DB.gameMode==='patchwerk'){ newPatchwerkGame(); return; }
  DB.name=($('nameInput').value.trim()||DB.name||'Hero'); saveData();
  MODE_FEED=null;
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
/* ---------------- Patchwerk (js/modes/patchwerk.js) ---------------- */
/* The mode owns pacing and scoring. The shell owns the DOM and the question feed. */

/* Pool weighting climbs with stacks: a kid holding a big streak is fed harder
   questions, which is where the bigger BASE_DAMAGE lives. Weights over pools 1/2/3. */
function pwPoolWeights(stacks){
  if(stacks>=7) return [0.10,0.30,0.60];
  if(stacks>=4) return [0.25,0.45,0.30];
  return [0.55,0.35,0.10];
}
function pwPickPool(stacks){
  const w=pwPoolWeights(stacks); let r=Math.random(), acc=0;
  for(let i=0;i<3;i++){ acc+=w[i]; if(r<acc) return i+1; }
  return 3;
}
/* Unlocked, actually-registered topics for the chosen class level. No new topics. */
function pwTopics(){
  return (MQI.levelNodes[DB.grade]||[])
    .filter(id => MQI.mapNodes.some(n=>n.id===id && n.status==='live') && MQI.topics[id]);
}
function pwStacks(){
  const m=MQI.modes.patchwerk;
  return (m && m._run) ? m._run.state().stacks : 0;
}
function newPatchwerkGame(){
  const mode=MQI.modes.patchwerk;
  if(!mode){ alert('Patchwerk mode is not loaded.'); return; }
  DB.name=($('nameInput').value.trim()||DB.name||'Hero'); saveData();
  const topics=pwTopics();
  if(!topics.length){ alert('No unlocked quests for '+DB.grade+' yet.'); return; }
  const tier=mode.config.TIERS[DB.pwTier]||mode.config.TIERS[mode.config.DEFAULT_TIER];

  QSET=null;
  MODE_FEED=function(){
    const lvl=pwPickPool(pwStacks());
    TOPIC=pick(topics);
    const q=makeQuestionFor(TOPIC,lvl);
    if(S) S.level=lvl;            /* keeps ctx.difficulty live */
    return q;
  };
  S={ heroHp:HERO_MAX, mi:0, mHp:MONSTERS[0].hp, level:1, streak:0,
      rightRow:0, wrongRow:0, correct:0, total:0, best:0, maxLevel:1,
      wrongs:[], skills:{}, busy:false, t0:Date.now(), timed:false,
      patchwerk:true, stunUntil:0, pwRecord:null };
  $('heroSprite').textContent=DB.avatar;
  $('heroName').textContent=DB.name+' the '+avClass();
  $('timerWrap').classList.remove('on');
  $('runClock').textContent='';
  if(clockTimer){ clearInterval(clockTimer); clockTimer=null; }
  /* Patchwerk fights the training dummy, not the crystal chain. */
  S.mi=MONSTERS.length-1;
  $('monsterDots').innerHTML='';
  renderMonster();
  $('monsterName').textContent='Patchwerk';
  $('monsterSprite').textContent='💀';
  $('feedback').innerHTML='';
  show('battleScreen');
  MQI.startMode('patchwerk',{ durationMs:tier.durationMs, tier:DB.pwTier, onEnd:endPatchwerk });
}
/* One answer inside Patchwerk. No counterattack, no hero HP, no shaming visuals:
   a wrong answer simply means the boss takes no damage for a beat. */
function pwResolve(right){
  const a=MQI.activeMode; if(!a) return;
  const mode=a.mode, ctx=a.ctx;
  const q=Q;                                     /* onAnswer may advance Q immediately */
  const answerMs=Math.max(0,Date.now()-(S.qAt||Date.now()));
  const probe=mode._run && mode._run.isStunned(ctx.elapsedMs);
  if(probe){ S.busy=false; return; }              /* swallowed by the input lock */
  recSkill(q.skill,right);
  lockButtons();
  const ev=mode.onAnswer(ctx,right,{ level:q.level||S.level, answerMs })||{};
  if(ev.ignored){ S.busy=false; return; }
  S.total++;
  if(right){
    S.correct++; S.streak++; S.best=Math.max(S.best,S.streak);
    $('feedback').innerHTML='<span class="ok">'+pick(['Hit! ⚔️','Solid! 💥','Nice one! 🌟','Crunch! 🔨'])+'</span>';
    $('heroSprite').classList.add('lunge'); setTimeout(()=>$('heroSprite').classList.remove('lunge'),450);
    const sp=$('monsterSprite'); sp.classList.add('shake'); setTimeout(()=>sp.classList.remove('shake'),500);
    floatDmg('-'+(ev.damage||0), ev.enraged?'#ffe66d':'#ff8f8f','right');
  } else {
    S.streak=0;
    S.wrongs.push({q:q.q+(q.extra||''), a:q.answerText, ex:q.explain, skill:q.skill});
    $('feedback').innerHTML=(ev.froze?'<span class="ok">🧊 Freeze! Your stacks are safe. </span>':'')+
      '<span class="no">'+(q.typed?('The answer is <b>'+q.answerText+'</b>. '):'')+(q.explain||'')+'</span>';
    S.stunUntil=Date.now()+mode.config.STUN_MS;   /* the mode's input lock, honoured */
  }
  /* The mode schedules the next question itself (immediately, or after the stun). */
}
function endPatchwerk(record){
  MODE_FEED=null;
  if(clockTimer){ clearInterval(clockTimer); clockTimer=null; }
  document.body.removeAttribute('data-mode-theme');
  if(!record){ renderStart(); show('startScreen'); return; }
  record.name=DB.name; record.avatar=DB.avatar; record.t=Date.now();
  DB.pwFame.push(record);
  DB.pwFame.sort((x,y)=>y.damage-x.damage);
  if(DB.pwFame.length>60) DB.pwFame=DB.pwFame.slice(0,60);
  DB.sessions.push({ t:Date.now(), topic:TOPIC, won:true, correct:S.correct, total:S.total,
                     best:S.best, crystals:0, maxLevel:S.maxLevel, skills:S.skills,
                     ms:record.durationMs, timed:false, mode:'patchwerk',
                     wrongs:S.wrongs.slice(0,10) });
  if(DB.sessions.length>60) DB.sessions=DB.sessions.slice(-60);
  saveData();
  sfx.win();
  const TIERS=MQI.modes.patchwerk.config.TIERS;
  const rank=DB.pwFame.filter(r=>r.tier===record.tier&&r.level===record.level).findIndex(r=>r===record);
  $('pwEnd').style.display='block';
  $('normalStats').style.display='none';
  $('reviewBox').style.display=S.wrongs.length?'block':'none';
  $('endEmoji').textContent='💀';
  $('endTitle').textContent='ENRAGE!';
  $('endMsg').textContent=(TIERS[record.tier]?TIERS[record.tier].label:record.tier)+' · '+record.level+
    ' · the dummy is still standing, but you left a mark.'+
    (rank===0?' 🥇 Best '+record.level+' run on this device!':rank>0?' #'+(rank+1)+' on this device.':'');
  $('pwDamage').textContent=record.damage.toLocaleString();
  $('pwStacks').textContent='x'+record.maxStacks;
  $('pwHits').textContent=record.correct;
  $('pwMiss').textContent=record.wrong;
  $('pwFreezes').textContent=record.freezesUsed;
  if(S.wrongs.length){
    const seen=new Set();
    $('reviewList').innerHTML=S.wrongs.filter(w=>{ if(seen.has(w.q))return false; seen.add(w.q); return true; })
      .slice(0,8).map(w=>'<div class="revItem">'+w.q+'<br><span class="ansIs">Answer: '+w.a+'</span><br><span class="how">'+(w.ex||'')+'</span></div>').join('');
  }
  show('endScreen');
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
  S.qAt=Date.now();
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
/* A mode may lock input (Patchwerk's 1.5s stun). Answers inside it are swallowed. */
function inputLocked(){ return !!(S && S.stunUntil && Date.now() < S.stunUntil); }
function answer(i,btn){
  if(S.busy || inputLocked()) return; S.busy=true;
  stopQTimer();
  const c=ac(); if(c&&c.resume) c.resume();
  const right = i===Q.correct;
  if(S.patchwerk){
    if(!right && btn){ btn.classList.remove('dim'); btn.classList.add('bad'); }
    pwResolve(right);
    return;
  }
  S.total++;
  recSkill(Q.skill,right);
  lockButtons();
  if(!right && btn){ btn.classList.remove('dim'); btn.classList.add('bad'); }
  resolve(right);
}
function answerTyped(){
  if(!S || S.busy || !Q || !Q.typed || inputLocked()) return;
  const v=$('typedInput').value.trim();
  if(v==='') return;
  S.busy=true;
  stopQTimer();
  const c=ac(); if(c&&c.resume) c.resume();
  const right = parseInt(v,10)===Q.answer;
  $('typedInput').disabled=true;
  if(S.patchwerk){ pwResolve(right); return; }
  S.total++;
  recSkill(Q.skill,right);
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
  $('pwEnd').style.display='none';
  $('normalStats').style.display='flex';
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
/* Patchwerk rows are ranked by damage and NEVER merged into the time-ranked board:
   the units are not comparable, and a 5 min run must not outrank a 3 min one. */
let pwFilt={ tier:'normal', level:null };
function pwRowHtml(r,i){
  const medals=['🥇','🥈','🥉'];
  return '<div class="fameRow"><span class="rk">'+(medals[i]||('#'+(i+1)))+'</span>'+
    '<span class="fa">'+esc(r.avatar||'🦄')+'</span>'+
    '<span class="fn">'+esc(r.name||'Hero')+'<small>'+esc(r.level||'')+' · x'+(r.maxStacks||0)+' stacks · '+
      (r.correct||0)+'/'+((r.correct||0)+(r.wrong||0))+' · '+fmtDate(r.t||Date.now())+'</small></span>'+
    '<span class="ft">'+(r.damage||0).toLocaleString()+'</span></div>';
}
function renderPwFame(){
  const TIERS=(MQI.modes.patchwerk&&MQI.modes.patchwerk.config.TIERS)||{};
  if(!pwFilt.level) pwFilt.level=DB.grade;
  const fb=$('pwFameFilters'); fb.style.display='flex'; fb.innerHTML='';
  ['short','normal','long'].forEach(k=>{
    if(!TIERS[k]) return;
    const b=document.createElement('button');
    b.className='pwFilt'+(k===pwFilt.tier?' sel':'');
    b.textContent=Math.round(TIERS[k].durationMs/60000)+' min';
    b.addEventListener('click',()=>{ pwFilt.tier=k; renderFame(); });
    fb.appendChild(b);
  });
  GRADES.forEach(g=>{
    const b=document.createElement('button');
    b.className='pwFilt'+(g===pwFilt.level?' sel':'');
    b.textContent=g;
    b.addEventListener('click',()=>{ pwFilt.level=g; renderFame(); });
    fb.appendChild(b);
  });
  const rows=DB.pwFame.filter(r=>r.tier===pwFilt.tier && r.level===pwFilt.level)
                      .slice().sort((a,b)=>b.damage-a.damage).slice(0,10);
  $('fameList').innerHTML = rows.length ? rows.map(pwRowHtml).join('')
    : '<div style="color:#a99fd8;text-align:center;padding:10px">No Patchwerk runs at '+
      (TIERS[pwFilt.tier]?Math.round(TIERS[pwFilt.tier].durationMs/60000)+' min':pwFilt.tier)+
      ' · '+pwFilt.level+' yet. Go hit the dummy! 💀</div>';
  show('fameScreen');
}
function renderFame(){
  $('tabGlobal').classList.toggle('sel',fameTab==='global');
  $('tabLocal').classList.toggle('sel',fameTab==='local');
  $('tabPatch').classList.toggle('sel',fameTab==='patchwerk');
  if(fameTab==='patchwerk') return renderPwFame();
  $('pwFameFilters').style.display='none';
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
    options: o,                                   /* the mode reads ctx.options.tier */
    nextQuestion(){ if(S) S.stunUntil = 0; nextQuestion(); return Q; },
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
        /* visual half: a one-shot animation class on the HUD block (CSS in index.html) */
        const el = $('modeHud');
        if (el) {
          const cls = 'pulse-' + kind;
          el.classList.remove('pulse-hit','pulse-crit','pulse-freeze','pulse-enrage');
          void el.offsetWidth;                    /* restart the animation */
          el.classList.add(cls);
          setTimeout(() => el.classList.remove(cls), 900);
        }
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
  /* tick() returns the score record when the clock hits zero, so the shell needs
     no end condition of its own - it just watches for that return value. */
  const timer = setInterval(() => {
    const rec = mode.tick(ctx);
    if (rec) {
      clearInterval(timer);
      MQI.activeMode = null;
      if (opts && typeof opts.onEnd === 'function') opts.onEnd(rec);
    }
  }, 200);
  MQI.activeMode = { mode, ctx, timer };
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
  /* Patchwerk draws across every unlocked topic for the class level, so it skips
     the island map entirely and goes straight to the dummy. */
  $('toMapBtn').addEventListener('click',()=>{ ac(); if(DB.gameMode==='patchwerk') newPatchwerkGame(); else renderMap(); });
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
  $('tabPatch').addEventListener('click',()=>{ fameTab='patchwerk'; renderFame(); });

  renderStart();
  autoplayHook();
};

/* ---------------- debug: ?autoplay=patchwerk&bot=1 ----------------
   Drives a real Patchwerk run with simulated answers so a headless browser can
   screenshot the mode picker, a mid-run HUD and the results screen without a
   human at the keyboard. Params:
     autoplay=patchwerk   start the fight after a short delay
     bot=1                answer automatically (default ~82% correct)
     tier=short|normal|long
     ms=<n>               override the fight length (screenshot runs)
     acc=<0..100>         bot accuracy
     delay=<ms>           bot think time per answer
   Inert without the query string; no production path reads it. */
function autoplayHook(){
  let p;
  try{ p=new URLSearchParams(location.search); }catch(e){ return; }
  if(p.get('autoplay')!=='patchwerk') return;
  const tier=p.get('tier'); if(tier) DB.pwTier=tier;
  DB.gameMode='patchwerk';
  const ms=parseInt(p.get('ms'),10);
  if(ms>0){ const T=MQI.modes.patchwerk.config.TIERS; Object.keys(T).forEach(k=>T[k].durationMs=ms); }
  renderStart();
  if(p.get('bot')!=='1') return;
  const acc=(parseInt(p.get('acc'),10)||82)/100;
  const delay=parseInt(p.get('delay'),10)||600;
  setTimeout(()=>{
    newPatchwerkGame();
    setInterval(()=>{
      if(!S || !S.patchwerk || !Q || S.busy || inputLocked()) return;
      const right=Math.random()<acc;
      if(Q.typed){
        $('typedInput').value = right ? String(Q.answer) : String((Q.answer||0)+1);
        answerTyped();
      } else {
        const n=Q.choices.length;
        let i=Q.correct;
        if(!right){ i=(Q.correct+1+Math.floor(Math.random()*(n-1)))%n; }
        answer(i, document.querySelectorAll('.ansBtn')[i]);
      }
    }, delay);
  }, 400);
}
