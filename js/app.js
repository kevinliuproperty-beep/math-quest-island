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
/* The normal-mode session feed (MQI.createFeed): skill round-robin inside the
   current pool + a no-repeat-last-3-stem-shapes ring. Live rather than
   pre-generated, because the no-repeat guard is a SERVING-order rule and the
   mastery climb hops between pools mid-session, so three sets pre-built per pool
   cannot enforce it across a pool change.
   Repetition + Demand Audit 2026-09-05, fixes 1 + 2. */
let FEED=null;
/* A mode may install its own question feed (Patchwerk draws across every unlocked
   topic for the chosen class level). Null = the normal single-topic quiz set. */
let MODE_FEED=null;
/* P3 Mock Paper: MOCK_MS = a debug-only paper length override; MOCK_BACK = where
   history returns to. (The old mock-report drill now lives in Power-Up, below.) */
let MOCK_MS=0, MOCK_BACK=null;
/* Every served item carries the topic it was drawn from (P3 Exam Readiness Audit §b):
   skill ids repeat across topics (compare, addsub, pattern, word), so a mixed
   session must record topic+skill, never the bare skill under the last topic drawn. */
function makeQuestion(level){
  const q=makeQuestionRaw(level);
  if(q && !q.topic) q.topic=TOPIC;
  return q;
}
function makeQuestionRaw(level){
  if(MODE_FEED) return MODE_FEED(level);
  if(FEED) return FEED.next(level);
  if(QSET && QSET[level] && QSET[level].length) return QSET[level].shift();
  return makeQuestionFor(TOPIC,level);
}



/* ---------------- Storage ---------------- */
function loadData(){ try{ return JSON.parse(localStorage.getItem('fq1'))||{}; }catch(e){ return {}; } }
function saveData(){ try{ localStorage.setItem('fq1',JSON.stringify(DB)); }catch(e){} }
let DB=loadData();
/* ---- results outbox (2026-10-24, same block in science/index.html) ----
   Each finished quest / paper queues a compact summary in localStorage 'mqi-outbox'
   and posts it to /api/results for the parent page. Fire-and-forget: never awaited,
   never touches the screen or the game; on any failure the rows stay queued and are
   retried on the next page load and the next finish. Skipped off the live host. */
var mqiOutbox = (function () {
  var OB = 'mqi-outbox', DEV = 'mqi-device', CAP = 500, BATCH = 50, busy = false;
  function rid() {
    try { var a = new Uint8Array(12), s = ''; crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2); return s; }
    catch (e) { return (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^0-9a-z]/g, '').slice(0, 24); }
  }
  function label() {
    try {
      var u = navigator.userAgent || '';
      if (/iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return 'iPad';
      if (/iPhone/.test(u)) return 'iPhone';
      if (/Android/.test(u)) return 'Android';
      if (/CrOS/.test(u)) return 'Chromebook';
      if (/Macintosh|Mac OS X/.test(u)) return 'Mac';
      if (/Windows/.test(u)) return 'Windows';
    } catch (e) {}
    return 'Other';
  }
  function device() {
    var d = null;
    try { d = localStorage.getItem(DEV); } catch (e) {}
    if (!d || !/^[0-9a-z]{8,32}$/.test(d)) { d = rid(); try { localStorage.setItem(DEV, d); } catch (e) {} }
    return d;
  }
  function read() { try { var a = JSON.parse(localStorage.getItem(OB) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function write(a) { try { localStorage.setItem(OB, JSON.stringify(a.slice(-CAP))); } catch (e) {} }
  function live() {
    try { return /^https?:$/.test(location.protocol) && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname); }
    catch (e) { return false; }
  }
  function flush() {
    try {
      if (busy || !live() || typeof fetch !== 'function') return;
      if (navigator.onLine === false) return;
      var rows = read().slice(0, BATCH);
      if (!rows.length) return;
      busy = true;
      fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ results: rows }) })
        .then(function (r) {
          busy = false;
          /* 2xx: stored (or a duplicate). 400/413: this batch can never be stored, drop it
             rather than retry it forever. Anything else (503, 5xx, 429): keep and retry later. */
          if (!(r.ok || r.status === 400 || r.status === 413)) return;
          var sent = {}; rows.forEach(function (x) { if (x && x.id) sent[x.id] = 1; });
          var rest = read().filter(function (x) { return !(x && sent[x.id]); });
          write(rest);
          if (rest.length && r.ok) setTimeout(flush, 500);
        })
        .catch(function () { busy = false; });
    } catch (e) { busy = false; }
  }
  function add(rec) {
    try {
      rec.id = rid(); rec.device = device(); rec.deviceLabel = label(); rec.endedAt = new Date().toISOString();
      var a = read(); a.push(rec); write(a);
    } catch (e) {}
    try { setTimeout(flush, 1500); } catch (e) {}
  }
  try { setTimeout(flush, 4000); } catch (e) {}
  return { add: add, flush: flush };
})();
/* a maths DB.sessions row (quest, Patchwerk, Power-Up, mock) -> one outbox summary */
function outboxMaths(row, extra){
  try{
    const name=tp=>{ try{ const d=TOPICS[tp]; return (d&&(d.short||d.label))||String(tp); }catch(e){ return String(tp); } };
    const topics=[], tl=(row&&row.tally)||{};
    Object.keys(tl).slice(0,30).forEach(tp=>{
      let c=0, n=0; const sk=tl[tp]||{};
      Object.keys(sk).forEach(k=>{ const v=sk[k]||{}; c+=v.r||0; n+=(v.r||0)+(v.w||0); });
      if(n) topics.push({ t:name(tp), c, n });
    });
    const mode=row.mode||'relax';
    mqiOutbox.add(Object.assign({
      app:'maths', kind: mode==='mock'?'paper':'quest', mode,
      topic: row.topic ? name(row.topic) : ({ patchwerk:'Patchwerk', power:'Power-Up', mock:'Mock paper' }[mode]||'Mixed'),
      topics, correct: row.correct||0, total: row.total||0, hintsUsed: null,
      durationSec: Number.isFinite(row.ms) ? Math.min(86400, Math.max(0, Math.round(row.ms/1000))) : null
    }, extra||{}));
  }catch(e){}
}
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
/* P3 Mock Paper history (js/modes/p3-mock.js): one summary row per finished paper. */
DB.mockPapers = Array.isArray(DB.mockPapers) ? DB.mockPapers : [];
if(!GRADES.includes(DB.grade)) DB.grade='P3';
/* Power-Up meters (2026-10-17, the maths follow-on to science Power-Up). One entry per
   "<topic>|<skill>" group, the skill being the sub-skill each generator is filed under
   in its topic's pools: { s: 0-2 rights in a row, full, m: misses, r: rights,
   lm: the latest answer was a miss, lv: the pool it was missed at, t }.
   An older save has no map: it is seeded ONCE from the session tallies the parents
   corner already keeps, so the misses she has already made put their groups in rotation. */
if(!DB.power || typeof DB.power!=='object' || Array.isArray(DB.power)){
  DB.power={};
  DB.sessions.forEach(s=>{
    for(const tp in (s.tally||{})) for(const sk in s.tally[tp]){
      const c=s.tally[tp][sk]||{}, k=tp+'|'+sk;
      const p=DB.power[k]||(DB.power[k]={ s:0, full:false, m:0, r:0, lm:false, lv:2, t:0 });
      p.m+=c.w||0; p.r+=c.r||0; p.t=Math.max(p.t, s.t||0);
    }
  });
  /* refuter R2: a lifetime tally is not "not strong". A group she mostly gets right
     (under 1 miss in 4, at least 4 rights) keeps its rights for warm-ups but stays out
     of rotation until she misses it again. */
  for(const k in DB.power){ const p=DB.power[k]; if(p.r>=4 && p.m/(p.m+p.r)<0.25) p.m=0; }
}
/* Star Crystals (Build Day 2026-10-23, B2: maths fun-layer parity with science/index.html).
   { <map node id>: { e: t, c: t, p: t } }, kept once rescued. See "Fun layer" below. */
if(!DB.crys || typeof DB.crys!=='object' || Array.isArray(DB.crys)) DB.crys={};

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
  /* Kev 2026-10-23: no wrong-answer buzz and no lose sound in maths (teach, don't punish) */
  wrong(){},
  hit(){ tone(120,0,.15,'sawtooth',.18); },
  tick(){ tone(880,0,.05,'square',.06); },
  win(){ [523,659,784,1047,784,1047].forEach((f,i)=>tone(f,i*.15,.2)); },
  lose(){},
  monsterDown(){ tone(300,0,.1,'triangle'); tone(200,.1,.1,'triangle'); tone(100,.2,.25,'triangle'); },
  /* a Star Crystal: science's happy chime */
  crystal(){ tone(659,0,.1,'triangle',.1); tone(880,.09,.1,'triangle',.1); tone(1175,.18,.22,'triangle',.1); }
};

/* ---------------- Fun layer (Build Day 2026-10-23, B2) ----------------
   Parity with the science fun layer (science/index.html, Science Fun Layer Card
   2026-10-17), the same system rather than a second one: three Star Crystals per land,
   kept once rescued, each earned by learning and never by speed or by being right
   first time:
     🧭 Explorer  finish a quest in that land (a "So close" quest counts too);
     💪 Comeback  get a question right in a skill whose last answer was a miss;
     ⚡ Power     a Power-Up battery fills on a question from that land.
   Comeback and Power ride recSkill, the one place every answer already passes
   through, and read the Power-Up meter it charges. Never in the mock paper (its
   hand-in also passes through recSkill). Patchwerk keeps what it earns but never
   celebrates mid-race. No new timers: a crystal adds a banner and a chime to an
   answer, never a delay before the next question. */
const CRYS=[
  { k:'e', em:'🧭', name:'Explorer crystal', how:'Finish a quest in this land.' },
  { k:'c', em:'💪', name:'Comeback crystal', how:'Have another go after a miss, and get it right.' },
  { k:'p', em:'⚡', name:'Power crystal', how:'Fill up a power battery with a question from this land.' }
];
/* a land is a live map node; a locked or unknown one never holds crystals */
function crysLand(id){ const n=MQI.mapNodes.find(m=>m.id===id); return (n && !n.locked) ? n : null; }
function crysOf(id){ return (DB.crys && DB.crys[id]) || {}; }
function crysCount(id){ const c=crysOf(id); return CRYS.filter(x=>c[x.k]).length; }
function crysHTML(id){
  const c=crysOf(id), n=crysCount(id);
  return '<span class="crys" role="img" aria-label="'+n+' of 3 Star Crystals">'+
    CRYS.map(x=>c[x.k]?'<span>⭐</span>':'<span class="no">❔</span>').join('')+'</span>';
}
/* a new crystal; null if it was already rescued or the land is not on the map */
function award(id, k){
  const land=crysLand(id); if(!land) return null;
  if(!DB.crys || typeof DB.crys!=='object') DB.crys={};
  const c=DB.crys[id]||(DB.crys[id]={});
  if(c[k]) return null;
  c[k]=Date.now();
  const x=CRYS.find(y=>y.k===k);
  return { t:id, k, em:x.em, name:x.name, land:land.name, all:crysCount(id)===3 };
}
function wonLine(w){ return '⭐ '+w.name+' rescued in '+w.land+'!'+(w.all?' That\'s all 3 in this land! 🏝️':''); }
function reducedMotion(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
/* the crystals this answer rescued (recSkill leaves them on S.fresh): a short banner in
   the battle's own band (one line, so it never wraps or ellipsises), a chime and a light
   burst. Nothing is added to #feedback, so the answer buttons never move. The full line,
   with the land's name, is on the end screen. Returns true when it cheered. */
function crysCheer(){
  const won=(S && S.fresh) || [];
  if(!won.length) return false;
  const w=won[won.length-1];
  banner(w.all ? '⭐ All 3 crystals in '+esc(w.land)+'! 🏝️' : '⭐ '+w.em+' '+w.name+' rescued!', 1800);
  sfx.crystal();
  confetti();
  return true;
}
/* the land's three crystals on an end screen: what she found, then the next one to find */
function crysPanel(id, today){
  const land=id ? crysLand(id) : null, won=today||[];
  let h=won.length ? '<p class="won">'+won.map(w=>esc(wonLine(w))).join('<br>')+'</p>' : '';
  if(land){
    const c=crysOf(id), nx=CRYS.find(x=>!c[x.k]);
    h+='<h3>⭐ Star Crystals in '+esc(land.e+' '+land.name)+'</h3>'+crysHTML(id)+
      (nx ? '<p>Next to find: '+nx.em+' <b>'+nx.name+'</b>. '+nx.how+'</p>'
          : '<p>🏝️ You rescued all 3 Star Crystals in '+esc(land.name)+'!</p>');
  }
  return h;
}

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
  /* fun layer: the hero greeting and the Star Crystal count for this level's lands */
  const lands=MAP_NODES.filter(n=>n.grades.includes(DB.grade) && !n.locked);
  const found=lands.reduce((a,n)=>a+crysCount(n.id),0), all=lands.length*3;
  $('mapHello').innerHTML='<span class="av" aria-hidden="true">'+esc(DB.avatar)+'</span>Hi, '+esc(DB.name||'Hero')+'!';
  $('mapCrys').textContent = !all ? '' : found>=all ? '⭐ All '+all+' Star Crystals rescued! 🏝️'
    : found ? '⭐ '+found+' of '+all+' Star Crystals rescued so far!'
    : '⭐ '+all+' Star Crystals are hiding on these islands. Can you rescue them?';
  $('mapCrys').style.display = all ? '' : 'none';
  /* P3 exam rehearsal sits at the top of the P3 map, above the islands. */
  if(DB.grade==='P3' && MQI.modes['p3-mock']){
    const c=document.createElement('div');
    c.className='mockCard';
    /* Full (50 marks, 90 min) is the real P3 EOY shape; Long is the 80-mark school variant */
    const F=MQI.modes['p3-mock'].config.FORMATS, mkB=v=>{ let m=0; F[v].sections.forEach(s=>m+=s.count*s.marks);
      return '<button class="mkGo'+(v==='full'?' mkMain':'')+'" data-v="'+v+'">'+F[v].label+'<small>'+F[v].minutes+' min · '+m+' marks</small></button>'; };
    c.innerHTML='<div class="mkTitle">📝 P3 Mock Paper <small>exam practice, marks at the end</small></div>'+
      '<div class="mkBtns">'+mkB('full')+mkB('quick')+mkB('long')+'</div>'+
      '<button class="mkHist">📜 Paper history'+(DB.mockPapers.length?' ('+DB.mockPapers.length+')':'')+'</button>'+
      '<a class="mkHist" id="mkSciLink" href="/science">🔬 Science Quest</a>';
    c.querySelectorAll('.mkGo').forEach(b=>b.addEventListener('click',()=>newMockGame(b.dataset.v)));
    c.querySelector('.mkHist').addEventListener('click',()=>renderMockHistory('mapScreen'));
    mp.appendChild(c);
  }
  /* Power-Up sits under the mock: the P3 exam pool, so it shows on the P3 map only */
  if(DB.grade==='P3' && powerGroups().length){
    const rot=powerRotation(), pk=powerKeys().slice(0,9);
    const c=document.createElement('div');
    c.className='puCard';
    c.innerHTML='<button class="puGo" id="puGo"><span class="puEm">⚡</span><span><b>Power-Up</b><small>'+
      (rot.length ? 'Let\'s power up '+esc(pq(rot[0].k))+'!' : 'Keep your powers charged with a mixed review round.')+'</small></span></button>'+
      (pk.length ? '<div class="puMine"><h4>⚡ My powers</h4>'+powersHTML(pk)+'</div>' : '');
    c.querySelector('.puGo').addEventListener('click',startPower);
    mp.appendChild(c);
  }
  MAP_NODES.filter(n=>n.grades.includes(DB.grade)).forEach((n,i)=>{
    if(i>0){ const d=document.createElement('div'); d.className='pathDots'; d.textContent='• • •'; mp.appendChild(d); }
    const b=document.createElement('button');
    b.className='mapNode '+(i%2?'even':'odd')+(n.locked?' locked':'')+(!n.locked && crysCount(n.id)===3?' done':'');
    b.innerHTML='<span class="ne">'+n.e+'</span><span class="nt"><b>'+n.name+'</b><small>'+n.blurb+'</small>'+
                (n.locked?'':crysHTML(n.id))+'</span>'+
                '<span class="go">'+(n.locked?'🔒':'▶️')+'</span>';
    if(!n.locked) b.addEventListener('click',()=>{ TOPIC=n.id; newGame(); });
    mp.appendChild(b);
  });
  if(lands.length){
    const d=document.createElement('details');
    d.className='howcrys';
    d.innerHTML='<summary>⭐ How do I rescue Star Crystals?</summary><p>Every land hides 3:</p><ul>'+
      CRYS.map(x=>'<li>'+x.em+' <b>'+x.name+'</b>: '+x.how+'</li>').join('')+
      '</ul><p>Take your time. A rescued crystal stays yours.</p>';
    mp.appendChild(d);
  }
  show('mapScreen');
}

/* ----- battle ----- */
function newGame(){
  if(DB.gameMode==='patchwerk'){ newPatchwerkGame(); return; }
  DB.name=($('nameInput').value.trim()||DB.name||'Hero'); saveData();
  MODE_FEED=null;
  QSET=null;
  FEED=MQI.createFeed(TOPIC);
  S={ heroHp:HERO_MAX, mi:0, mHp:MONSTERS[0].hp, level:1, streak:0,
      rightRow:0, wrongRow:0, correct:0, total:0, best:0, maxLevel:1,
      wrongs:[], skills:{}, busy:false, t0:Date.now(), timed:DB.timed };
  $('heroSprite').textContent=DB.avatar;
  $('heroName').textContent=DB.name+' the '+avClass();
  $('modeHud').innerHTML='';   /* a finished mode's HUD must not linger into a quest */
  $('timerWrap').classList.toggle('on',S.timed);
  $('runClock').textContent='';
  if(clockTimer) clearInterval(clockTimer);
  if(S.timed){
    clockTimer=setInterval(()=>{ if(S) $('runClock').textContent='⏱'+fmtMs(Date.now()-S.t0); },500);
  }
  renderDots(); renderMonster(); renderHp(); updateStreak();
  show('battleScreen');
  /* K3(b), Phone Width Refutation. This used to be banner(...,1400) with the first
     question scheduled at +300 ms, so 1,100 ms of every quest's FIRST question - a
     question the child has never seen - was painted underneath the banner, unread.
     The banner has a reserved band of its own now and covers nothing, so this is no
     longer a legibility bug; it is a pacing one, and both halves are fixed together:
     the announcement is shortened to 900 ms (long enough to read three words, and
     the topic name is also on the map node the child just tapped) and the question
     is dealt AFTER it clears, at 950 ms. Total dead air at quest start falls from
     1,400 ms to 950 ms, and no question is ever dealt under a banner.
     The post-answer banners are deliberately NOT delayed: CRITICAL HIT is a reward
     that should ride over the next question, and now that it has its own band it can
     do that without covering a word of it. */
  /* fun layer: the land's place name (Fraction Forest), as on the map tile she just tapped */
  const land=crysLand(TOPIC);
  banner(land ? land.e+' '+esc(land.name)+'! ⭐' : TOPICS[TOPIC].e+' '+TOPICS[TOPIC].label+'! ⭐',900);
  setTimeout(nextQuestion,950);
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

  QSET=null; FEED=null;
  /* Patchwerk already rotates the TOPIC on every item, which is why the audit
     measured its repeat rate at 0.021 against the main mode's 0.376. Stack
     weighting is untouched; the only addition is the same no-repeat-last-3 stem
     shape ring the main feed carries, so it cannot regress into a run of clones. */
  const pwRing=[];
  MODE_FEED=function(){
    const lvl=pwPickPool(pwStacks());
    let last=null;
    for(let t=0;t<6;t++){
      TOPIC=pick(topics);
      const q=makeQuestionFor(TOPIC,lvl);
      const shape=MQI.shapeKey(q);
      last={q,shape};
      if(pwRing.indexOf(shape)!==-1) continue;
      break;
    }
    pwRing.push(last.shape); while(pwRing.length>3) pwRing.shift();
    if(S) S.level=lvl;            /* keeps ctx.difficulty live */
    return last.q;
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
  /* Read the child's text BEFORE onAnswer runs - it may draw the next question
     synchronously and clear the field. Play modes teach the same lesson as the
     quest does (Unit Sweep Refutation W1). */
  const typedRaw = q.typed ? $('typedInput').value.trim() : '';
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
    S.wrongs.push(wrongRec(q, q.typed ? typedRaw : (q.choices||[])[S.lastPick], q.typed ? null : S.lastPick, unitLead(typedRaw,q)));
    $('feedback').innerHTML=(ev.froze?'<span class="ok">🧊 Freeze! Your stacks are safe. </span>':'')+
      '<span class="no">'+unitLead(typedRaw,q)+(q.typed?('The answer is <b>'+q.answerText+'</b>. '):'')+(q.explain||'')+'</span>';
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
  DB.sessions.push({ t:Date.now(), topic:null, won:true, correct:S.correct, total:S.total,
                     best:S.best, crystals:0, maxLevel:S.maxLevel, skills:S.skills,
                     ms:record.durationMs, timed:false, mode:'patchwerk', tally:S.tally||{},
                     wrongs:S.wrongs.slice(0,10).map(slimWrong) });
  if(DB.sessions.length>60) DB.sessions=DB.sessions.slice(-60);
  outboxMaths(DB.sessions[DB.sessions.length-1]);   /* results outbox (fire-and-forget) */
  saveData();
  sfx.win();
  const TIERS=MQI.modes.patchwerk.config.TIERS;
  const rank=DB.pwFame.filter(r=>r.tier===record.tier&&r.level===record.level).findIndex(r=>r===record);
  $('pwEnd').style.display='block';
  $('crysEnd').style.display='none';
  $('normalStats').style.display='none';
  $('endWell').style.display='none'; $('endQuiet').style.display='none';
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
      .slice(0,8).map(w=>revItemHTML(w)).join('');
  }
  show('endScreen');
}

/* ---------------- P3 Mock Paper (js/modes/p3-mock.js) ----------------
   Exam conditions: no sounds, no right/wrong colours, no explanations until the
   report. The mode builds and marks the paper; the shell draws it. Items come from
   EVERY live node registered for P3, so a new P3 node joins the paper on merge. */
function mockNodes(){
  return (MQI.levelNodes.P3||[])
    .filter(id => MQI.mapNodes.some(n=>n.id===id && n.status==='live') && MQI.topics[id])
    .map(id => { const t=MQI.topics[id], sk={};
      for(const k in t.skills) sk[k]=(t.skills[k]&&t.skills[k].label)||k;
      return { id, label:t.short||t.label||id, skills:sk }; });
}
function newMockGame(variant, resume){
  const mode=MQI.modes['p3-mock'];
  if(!mode) return;
  DB.name=($('nameInput').value.trim()||DB.name||'Hero'); saveData();
  const fmt=mode.config.FORMATS[resume?resume.paper.variant:variant]||mode.config.FORMATS.quick;
  const feeds={};
  /* Each mock feed is built over a stamped copy of the node's pools, so every item
     carries q.gen = "<node>.<generator>" and the mode can keep the banks the
     calibration card bars from the long problems (CONFIG.NEVER_PROBLEM) out of them.
     The registry's own pools are put back at once; normal play never sees the stamp. */
  const stampedFeed=id=>{
    const def=MQI.topics[id], keep=def.pools, pools={};
    for(const l of [1,2,3]) pools[l]=keep[l].map(pr=>{ const fn=pr[0];
      const w=function(){ const q=fn(); if(q && !q.gen) q.gen=id+'.'+(fn.name||'anon'); return q; };
      return [w, pr[1]]; });
    def.pools=pools;
    try{ return MQI.createFeed(id,{alternateL3:false}); } finally{ def.pools=keep; }
  };
  const draw=(id,lvl)=>{ if(!feeds[id]) feeds[id]=stampedFeed(id); return feeds[id].next(lvl); };
  QSET=null; FEED=null;
  MODE_FEED=function(){
    const it=mode.current();
    if(!it) return Q;
    TOPIC=it.topic; if(S) S.level=it.q.level||1;
    return it.q;
  };
  stopQTimer();
  if(clockTimer){ clearInterval(clockTimer); clockTimer=null; }
  S={ heroHp:HERO_MAX, mi:0, mHp:MONSTERS[0].hp, level:1, streak:0,
      rightRow:0, wrongRow:0, correct:0, total:0, best:0, maxLevel:1,
      wrongs:[], skills:{}, busy:false, t0:Date.now(), timed:false, mock:true };
  $('timerWrap').classList.remove('on');
  $('runClock').textContent=''; $('streakBox').textContent='';
  $('feedback').innerHTML=''; $('monsterDots').innerHTML='';
  show('battleScreen');
  mockConfirm(false);
  MQI.startMode('p3-mock',{ variant:fmt.id, durationMs:MOCK_MS||fmt.minutes*60000, nodes:mockNodes(), draw,
    parse:MQI.parseTypedAnswer, grade:MQI.gradeTyped, shapeOf:MQI.shapeKey, onEnd:endMock, resume:resume||null });
  mockSave();
}
/* ---- the exam navigator (Exam Navigator lane, 2026-10-07) ----
   Like a real paper: skip, come back, change an answer, flag one to check, and hand
   in when ready. Answers are recorded, never shown; marking happens at hand-in. The
   pattern is WineQuiz's exam screen (wset-l2-quiz app/exam/ExamQuiz.tsx): Prev/Next
   plus a numbered grid, current / answered / not-answered. */
const MOCK_LIVE='mqi_mock_live';
function mockActive(){ const a=MQI.activeMode; return (a && a.mode.id==='p3-mock' && S && S.mock) ? a : null; }
function mockSave(){
  const a=mockActive(); if(!a) return;
  try{ const snap=a.mode.snapshot(a.ctx); if(snap){ snap.t=Date.now(); localStorage.setItem(MOCK_LIVE,JSON.stringify(snap)); } }catch(e){}
}
function mockClearSaved(){ try{ localStorage.removeItem(MOCK_LIVE); }catch(e){} }
/* A reload mid-paper puts her straight back on it; the clock kept running meanwhile.
   A paper whose time ran out while the page was away is marked as it stands. */
function mockResume(){
  let snap=null;
  try{ snap=JSON.parse(localStorage.getItem(MOCK_LIVE)||'null'); }catch(e){ snap=null; }
  if(!snap || !snap.paper || !Array.isArray(snap.paper.items) || !snap.paper.items.length || !MQI.modes['p3-mock']) return false;
  snap.elapsedMs=(snap.elapsedMs||0)+Math.max(0,Date.now()-(snap.t||Date.now()));
  try{ DB.grade='P3'; newMockGame(null, snap); return true; }
  catch(e){ mockClearSaved(); return false; }
}
/* typed answers live in the box until she leaves the question; keep what is there */
function mockCommitTyped(){
  const a=mockActive(); if(!a || !Q || !Q.typed) return;
  const v=$('typedInput').value.trim(), i=a.mode._i;
  a.mode.record(i, v==='' ? null : { correct:MQI.gradeTyped(v,Q), given:v, raw:v });
}
function mockGo(i){
  const a=mockActive(); if(!a) return;
  mockCommitTyped();
  a.mode.goto(a.ctx,i);
  mockSave();
}
function mockPick(i){
  const a=mockActive(); if(!a || !Q) return;
  const idx=a.mode._i, fresh=!a.mode._answers[idx];
  a.mode.record(idx,{ correct:i===Q.correct, given:Q.choices[i], choice:i });
  mockPaint(); mockSave();
  /* a first answer moves on, as the paper always has; changing one stays put */
  if(fresh && idx<a.mode._paper.items.length-1){
    S.busy=true;
    setTimeout(()=>{ if(mockActive() && a.mode._i===idx) mockGo(idx+1); else if(S) S.busy=false; },260);
  } else S.busy=false;
}
function mockTyped(){
  const a=mockActive(); if(!a || !Q) return;
  if($('typedInput').value.trim()==='') return;
  const idx=a.mode._i;
  mockCommitTyped(); mockSave();
  if(idx<a.mode._paper.items.length-1) mockGo(idx+1); else mockPaint();
}
/* paints the navigator, the chosen option and the restored typed text */
function mockPaint(){
  const a=mockActive(); if(!a) return;
  const m=a.mode, idx=m._i, ans=m._answers[idx], st=m.status();
  if(Q && !Q.typed){
    document.querySelectorAll('#answers .ansBtn').forEach((b,k)=>b.classList.toggle('pick', !!ans && ans.choice===k));
  }
  let html='', sec=null;
  st.forEach((x,k)=>{
    const s=x.section.charAt(0);
    if(s!==sec){ sec=s; html+='<span class="mkGrp">'+s+'</span>'; }
    html+='<button class="mkNum'+(x.current?' cur':'')+(x.answered?' done':'')+(x.flagged?' flag':'')+'" data-k="'+k+'" aria-label="Question '+x.n+
      (x.answered?', answered':', not answered')+(x.flagged?', flagged':'')+'">'+x.n+'</button>';
  });
  const grid=$('mkGrid'); grid.innerHTML=html;
  const cur=grid.querySelector('.mkNum.cur');
  if(cur && grid.scrollWidth>grid.clientWidth+1){
    const gr=grid.getBoundingClientRect(), cr=cur.getBoundingClientRect();
    if(cr.left<gr.left+8 || cr.right>gr.right-8) grid.scrollLeft+=(cr.left+cr.width/2)-(gr.left+gr.width/2);
  }
  $('mkPrev').disabled=idx<=0;
  $('mkNext').disabled=idx>=st.length-1;
  const f=$('mkFlag'); f.classList.toggle('on', !!m._flags[idx]); f.setAttribute('aria-pressed', m._flags[idx]?'true':'false');
}
function mockFlag(){
  const a=mockActive(); if(!a) return;
  a.mode.toggleFlag(a.mode._i); mockPaint(); mockSave();
}
/* The in-app hand-in check: counts, the numbers themselves (tap one to go there), Go back. */
function mockConfirm(open){
  const box=$('mkConfirm');
  if(!open){ box.classList.remove('on'); return; }
  const a=mockActive(); if(!a) return;
  mockCommitTyped(); mockSave();
  const st=a.mode.status();
  const un=st.filter(x=>!x.answered), fl=st.filter(x=>x.flagged);
  const chips=list=>list.map(x=>'<button class="mkNum'+(x.answered?' done':'')+(x.flagged?' flag':'')+'" data-k="'+(x.n-1)+'">'+x.n+'</button>').join('');
  $('mkCfBody').innerHTML=
    '<div class="mkCfLine">✅ <b>'+(st.length-un.length)+'</b> of '+st.length+' answered</div>'+
    (un.length?'<div class="mkCfLine">⬜ <b>'+un.length+'</b> not answered yet</div><div class="mkCfChips">'+chips(un)+'</div>'
              :'<div class="mkCfLine">Every question has an answer. 🎉</div>')+
    (fl.length?'<div class="mkCfLine">🚩 <b>'+fl.length+'</b> flagged to check</div><div class="mkCfChips">'+chips(fl)+'</div>':'');
  box.classList.add('on');
}
function mockHandIn(){
  const a=mockActive(); if(!a) return;
  mockCommitTyped();
  mockConfirm(false);
  a.mode.submit();
  endMock(MQI.endMode());
}
function endMock(rec){
  MODE_FEED=null;
  mockConfirm(false);
  mockClearSaved();
  if(S) S.busy=true;
  /* the session tally is taken from the FINAL answers, once, at hand-in (an answer
     can change until then), through the same topic-true path a live answer uses */
  if(rec && S){
    S.total=0; S.correct=0; S.skills={}; S.tally={};
    const keepQ=Q;
    rec.review.forEach(r=>{ if(!r.attempted && !r.skipped) return;
      S.total++; if(r.correct) S.correct++;
      Q=r.q; recSkill(r.q.skill, !!r.correct); });
    Q=keepQ;
  }
  document.body.removeAttribute('data-mode-theme');
  $('modeHud').innerHTML='';
  if(!rec){ renderStart(); show('startScreen'); return; }
  try{
    DB.mockPapers.push({ t:rec.t, variant:rec.variant, label:rec.label, marks:rec.marks, total:rec.total,
      pct:rec.pct, usedMs:rec.usedMs, timedOut:rec.timedOut, attempted:rec.attempted, items:rec.items,
      weakTopics:rec.weakTopics, topics:rec.byTopic.map(x=>[x.label,x.got,x.total]) });
    if(DB.mockPapers.length>40) DB.mockPapers=DB.mockPapers.slice(-40);
    /* the paper also feeds the parents corner, through the same topic-true tally */
    DB.sessions.push({ t:rec.t, topic:null, won:rec.pct>=50, correct:S.correct, total:S.total, best:0,
      crystals:0, maxLevel:3, skills:S.skills, tally:S.tally||{}, ms:rec.usedMs, timed:true, mode:'mock',
      wrongs:rec.review.filter(r=>r.attempted&&!r.correct).slice(0,10)
        .map(r=>({ q:r.q.q+figHtml(r.q), a:r.q.answerText, ex:r.q.explain, skill:r.q.skill })) });
    if(DB.sessions.length>60) DB.sessions=DB.sessions.slice(-60);
    outboxMaths(DB.sessions[DB.sessions.length-1], { correct:rec.marks, total:rec.total,
      topics:(rec.byTopic||[]).map(x=>({ t:String(x.label), c:x.got, n:x.total })) });   /* results outbox: the paper in marks */
    saveData();
  }catch(e){}
  renderMockReport(rec);
}
function mkBarRow(label, sub, got, total){
  const pct=total?Math.round(got/total*100):0;
  const col=pct>=80?'#2ecc71':pct>=60?'#ffd166':'#ff6f61';
  return '<div class="skillRow"><div class="skillName">'+label+'<br><small>'+sub+'</small></div>'+
    '<div class="accBar"><div style="width:'+pct+'%;background:'+col+'"></div></div>'+
    '<div class="accPct" style="color:'+col+'">'+got+'/'+total+'</div></div>';
}
function renderMockReport(rec){
  $('mkScore').textContent=rec.marks+' / '+rec.total;
  $('mkPct').textContent=rec.pct+'%';
  $('mkMeta').textContent=rec.label+' · '+fmtDate(rec.t)+' · time used '+fmtMs(rec.usedMs)+
    (rec.timedOut?' (time ran out)':'')+' · '+rec.attempted+' of '+rec.items+' answered';
  $('mkSections').innerHTML=rec.sections.map(s=>'<div class="statBox"><div class="v">'+s.got+'/'+s.total+'</div><div class="k">'+s.name+'</div></div>').join('');
  $('mkTopics').innerHTML=rec.byTopic.map(x=>mkBarRow(x.label,(x.total?Math.round(x.got/x.total*100):0)+'%',x.got,x.total)).join('');
  $('mkSkills').innerHTML=rec.bySkill.map(x=>mkBarRow(x.label,x.topicLabel,x.got,x.total)).join('');
  /* Power-Up, not a separate drill: the paper's misses were charged into the meters at
     hand-in (endMock -> recSkill), so the rotation already leads with what this paper showed */
  const wb=$('mkPowerBtn'), rot=powerRotation();
  wb.innerHTML='⚡ Power-Up<small>'+(rot.length ? 'Let\'s power up '+esc(pq(rot[0].k))+'!' : 'Keep your powers charged with a mixed review round.')+'</small>';
  wb.onclick=startPower;
  const miss=rec.review.filter(r=>!r.correct);
  $('mkReview').innerHTML = miss.length ? miss.map(r=>{
    const q=r.q;
    const head='<b>Q'+r.n+'</b> <small class="mkTag">'+r.section+' · '+(r.marks===1?'1 mark':r.marks+' marks')+'</small><br>';
    /* Maths Coaching Card: a coached miss gets the walk-through (her answer, kindly; the
       technique; the steps one at a time; the answer last). Marks and order are unchanged. */
    if(q.steps){
      const given=r.attempted ? r.given : null, ci=(!q.typed && given!=null) ? q.choices.indexOf(given) : -1;
      return revItemHTML(wrongRec(q, given, ci>=0 ? ci : null, q.typed && given!=null ? unitLead(String(given), q) : '', !!(rec.timedOut && !r.attempted)), head);
    }
    const yours = r.attempted ? (q.typed ? esc(String(r.given||'')) : (r.given||'')) : '<i>not answered</i>';
    return '<div class="revItem"><b>Q'+r.n+'</b> <small class="mkTag">'+r.section+' · '+(r.marks===1?'1 mark':r.marks+' marks')+'</small><br>'+
      q.q+figHtml(q)+'<br><span class="mkYours">Your answer: '+yours+'</span><br>'+
      '<span class="ansIs">Answer: '+q.answerText+'</span><br><span class="how">'+(q.explain||'')+'</span></div>';
  }).join('') : '<div style="text-align:center;color:#7dffb0">Full marks! Nothing to review. 🎉</div>';
  show('mockScreen');
  $('mockScreen').scrollTop=0;
}
function renderMockHistory(backTo){
  MOCK_BACK=backTo||null;
  const ps=DB.mockPapers.slice().reverse();
  $('mkHistTable').innerHTML = ps.length
    ? '<tr><th>Date</th><th>Paper</th><th>Score</th><th>Topics to power up</th></tr>'+
      ps.map(p=>'<tr><td>'+fmtDate(p.t)+'</td><td>'+esc(({full:'Full',long:'Long',quick:'Quick'})[p.variant]||'Quick')+'</td><td>'+
        p.marks+'/'+p.total+' <small>('+p.pct+'%)</small></td><td>'+
        (p.weakTopics&&p.weakTopics.length?p.weakTopics.map(esc).join(', '):'none')+'</td></tr>').join('')
    : '<tr><td style="text-align:center;padding:10px">No papers yet. Try a Quick paper from the P3 map.</td></tr>';
  show('mockHistScreen');
}
/* ---------------- Power-Up (2026-10-17) ----------------
   The maths twin of science Power-Up, and the rework of the mock report's old two-skill
   drill (weakFeed), which it replaces. Kev: "something that focuses on the area that they
   are not strong at to reinforce", without demoralising.
   - A GROUP is one sub-skill of one P3 exam topic ("<topic>|<skill>", the skill each
     generator is filed under in its topic's pools). The pool is the mock paper's: every
     live P3 node (mockNodes), so P4+ islands never appear.
   - The ROTATION is every group she has missed whose meter is not full, most-missed first.
   - A ROUND is 5-8 items: 1-2 warm-ups from groups she has got right before, then FRESH
     draws from the lead group's generators (easier first), then 2 from the second group.
     Generators are cheap, so "fresh first" is a new draw every time; nothing re-serves the
     exact missed instance.
   - The METER: two rights in a row fill it. A miss anywhere (quest, Patchwerk, a mock
     paper at hand-in) empties it and puts the group back in rotation. Charged in
     recSkill, the one place every answered item already passes through.
   - The CLOSE says what she powered up and the next step. No score, no % and no count
     of misses, and nothing is ever red. */
let PU_GROUPS=null;
function powerGroups(){
  if(PU_GROUPS) return PU_GROUPS;
  const out=[], byLabel={};
  mockNodes().forEach(n=>{
    const t=TOPICS[n.id]; if(!t || !t.pools) return;
    Object.keys(t.skills||{}).forEach(sk=>{
      const lv=[1,2,3].filter(L=>(t.pools[L]||[]).some(pr=>pr[1]===sk));
      if(!lv.length) return;
      const node=MQI.mapNodes.find(m=>m.id===n.id);
      const g={ k:n.id+'|'+sk, topic:n.id, skill:sk, levels:lv,
                label:(t.skills[sk]&&t.skills[sk].label)||sk, island:(node&&node.name)||t.short||n.id };
      (byLabel[g.label]=byLabel[g.label]||[]).push(g); out.push(g);
    });
  });
  /* two islands share a sub-skill name (Number patterns): say which island */
  for(const l in byLabel) if(byLabel[l].length>1) byLabel[l].forEach(g=>{ g.label=l+' ('+g.island+')'; });
  PU_GROUPS=out;
  return out;
}
function pgroup(k){ return powerGroups().find(g=>g.k===k)||null; }
function pname(k){ const g=pgroup(k); return g ? g.label : k; }
/* the name inside a sentence: quote names that carry a comma, a "?" or their own "and"
   (science refuter R1-R3, R5): Next time: “Guess and check, work backwards”. */
function pq(k){ const n=pname(k); return /[,?&]| and |^What /.test(n) ? '“'+n+'”' : n; }   /* refuter R1, R5: "&" and "What ..." too */
function pstate(k){ const p=DB.power[k]; return p ? { s:p.s||0, full:!!p.full } : { s:0, full:false }; }
function charge(topic, skill, right, level){
  if(!topic || !skill) return;
  if(!DB.power || typeof DB.power!=='object') DB.power={};
  const k=topic+'|'+skill;
  const p=DB.power[k]||(DB.power[k]={ s:0, full:false, m:0, r:0, lm:false, lv:2, t:0 });
  if(right){ p.r=(p.r||0)+1; p.s=Math.min(2,(p.s||0)+1); if(p.s>=2) p.full=true; p.lm=false; }
  else { p.m=(p.m||0)+1; p.s=0; p.full=false; p.lm=true; p.lv=Math.min(3,Math.max(1,level||2)); }
  p.t=Date.now();
}
/* the groups in rotation, most-missed first: missed at some point, and not fully charged */
function powerRotation(){
  const out=[];
  powerGroups().forEach(g=>{
    const p=DB.power[g.k]; if(!p || !(p.m>0) || p.full) return;
    out.push({ k:g.k, g, need:p.m+(p.lm?2:0), lm:!!p.lm, t:p.t||0 });
  });
  out.sort((a,b)=>(b.need-a.need)||((b.lm?1:0)-(a.lm?1:0))||(b.t-a.t)||(a.k<b.k?-1:1));
  return out;
}
function puShuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
/* one fresh draw from a group's own generators, at the pool asked for (else the nearest
   one that has the skill). ctx.seen keeps a round free of repeats; ctx.gens prefers a
   generator the round has not used yet, so five draws are five different shapes. */
function powerDraw(g, level, ctx){
  const t=TOPICS[g.topic]; if(!t) return null;
  let pool=null, at=level;
  for(const L of [level,2,1,3]){ const pl=(t.pools[L]||[]).filter(pr=>pr[1]===g.skill); if(pl.length){ pool=pl; at=L; break; } }
  if(!pool) return null;
  let q=null, fn=null;
  for(let n=0;n<12;n++){
    const pr=pick(pool);
    if(ctx.gens.has(pr[0]) && pool.some(x=>!ctx.gens.has(x[0])) && n<6) continue;
    q=pr[0](); fn=pr[0]; q.skill=pr[1];
    const key=q.q+'|'+(q.extra||'')+'|'+(q.typed?q.answer:(q.choices||[]).slice().sort().join(''));
    if(ctx.seen.has(key) && n<11) continue;
    ctx.seen.add(key); break;
  }
  if(!q) return null;
  ctx.gens.add(fn);
  q.level=at; q.topic=g.topic;
  return { q, k:g.k };
}
/* warm-ups: fresh easy draws from groups she has got right before (her lead island
   first), else easy groups she has not tried yet */
function powerWarmups(lead, n, inRot, ctx){
  const near=g=>g.topic===lead.g.topic?0:1;
  const free=powerGroups().filter(g=>!inRot[g.k]);
  const known=puShuffle(free.filter(g=>DB.power[g.k] && DB.power[g.k].r>0)).sort((a,b)=>(near(a)-near(b))||(a.levels[0]-b.levels[0]));
  const easy=puShuffle(free.filter(g=>!DB.power[g.k] && g.levels[0]===1)).sort((a,b)=>near(a)-near(b));
  const out=[];
  for(const g of known.concat(easy)){ if(out.length>=n) break; const it=powerDraw(g,1,ctx); if(it) out.push(it); }
  return out;
}
/* "Keep your powers charged": a mixed review, one draw per group, oldest-practised first,
   a new island each time until every island has had a turn */
function powerReview(n, ctx, skip){
  const gs=puShuffle(powerGroups().filter(g=>!(skip&&skip[g.k])))
    .sort((a,b)=>((DB.power[a.k]||{}).t||0)-((DB.power[b.k]||{}).t||0));
  const pickd=[], isl={};
  for(const pass of [0,1]) for(const g of gs){
    if(pickd.length>=n) break;
    if(pickd.indexOf(g)!==-1 || (pass===0 && isl[g.topic])) continue;
    isl[g.topic]=1; pickd.push(g);
  }
  return pickd.map(g=>powerDraw(g, (DB.power[g.k]&&DB.power[g.k].r>0)?2:1, ctx)).filter(Boolean)
    .sort((a,b)=>a.q.level-b.q.level);
}
/* one round of 5-8: warm-ups, then the lead group, then a second group if there is one */
function powerRound(){
  const rot=powerRotation(), ctx={ seen:new Set(), gens:new Set() };
  if(!rot.length) return { items:powerReview(6,ctx), warm:0, keys:[], review:true };
  const lead=rot[0], second=rot[1]||null, inRot={};
  rot.forEach(r=>{ inRot[r.k]=1; });
  const targets=(r,n)=>{ const lv=(DB.power[r.k]&&DB.power[r.k].lv)||2, out=[];
    ctx.gens=new Set();
    for(let i=0;i<n;i++){ const it=powerDraw(r.g, i===0&&lv>1?lv-1:lv, ctx); if(it) out.push(it); }
    return out; };
  const t1=targets(lead, second?4:5), t2=second?targets(second,2):[];
  ctx.gens=new Set();
  const warm=powerWarmups(lead, t1.length+t2.length>=4?2:1, inRot, ctx);
  let items=warm.concat(t1,t2);
  if(items.length<5){ const have={}; items.forEach(it=>{ have[it.k]=1; }); items=items.concat(powerReview(5-items.length,ctx,have)); }
  return { items:items.slice(0,8), warm:warm.length, keys:[lead.k].concat(second?[second.k]:[]), review:false };
}
function battHTML(k){
  const p=pstate(k);
  return '<span class="batt'+(p.full?' full':'')+'" role="img" aria-label="'+(p.full?'fully charged':p.s?'charging':'ready to charge')+'">'+
    '<i class="'+(p.full||p.s>=1?'on':'')+'"></i><i class="'+(p.full||p.s>=2?'on':'')+'"></i></span>';
}
function powersHTML(keys){
  return '<ul class="powers">'+keys.map(k=>{ const p=pstate(k);
    return '<li class="'+(p.full?'full':'')+'">'+battHTML(k)+esc(pname(k))+(p.full?'<small>⚡ fully charged</small>':'')+'</li>'; }).join('')+'</ul>';
}
/* every group in rotation or charging or charged, for the map's "My powers" row */
function powerKeys(){
  const seen={}, out=[];
  powerRotation().forEach(r=>{ seen[r.k]=1; out.push(r.k); });
  powerGroups().forEach(g=>{ const p=DB.power[g.k]; if(!seen[g.k] && p && (p.s>0 || p.full)){ seen[g.k]=1; out.push(g.k); } });
  return out;
}
function andList(a){
  if(a.length>3) return a.slice(0,2).join(', ')+' and '+(a.length-2)+' more';
  return a.length<2 ? a.join('') : a.slice(0,-1).join(', ')+' and '+a[a.length-1];
}
function startPower(){
  const r=powerRound(), p0={};
  if(!r.items.length) return;
  powerGroups().forEach(g=>{ if(DB.power[g.k]) p0[g.k]=pstate(g.k); });
  DB.name=($('nameInput').value.trim()||DB.name||'Hero'); saveData();
  stopQTimer();
  if(clockTimer){ clearInterval(clockTimer); clockTimer=null; }
  QSET=null; FEED=null;
  MODE_FEED=function(){
    const it=S && S.pu && S.pu.items[S.pu.i];
    if(!it) return Q;
    TOPIC=it.q.topic; S.level=it.q.level||1;
    return it.q;
  };
  S={ heroHp:HERO_MAX, mi:0, mHp:MONSTERS[0].hp, level:1, streak:0,
      rightRow:0, wrongRow:0, correct:0, total:0, best:0, maxLevel:1,
      wrongs:[], skills:{}, busy:true, t0:Date.now(), timed:false, power:true,
      pu:{ items:r.items, i:0, warm:r.warm, keys:r.keys, review:r.review, p0, wait:false } };
  document.body.setAttribute('data-mode-theme','mode-power');
  $('timerWrap').classList.remove('on');
  $('runClock').textContent=''; $('streakBox').textContent='';
  $('monsterDots').innerHTML=''; $('feedback').innerHTML='';
  $('qtext').innerHTML=''; $('qextra').innerHTML=''; $('answers').innerHTML='';
  $('typedWrap').style.display='none';
  $('puBar').classList.remove('on');
  $('modeHud').innerHTML='';
  show('battleScreen');
  banner(r.review?'⚡ Keep your powers charged! ⭐':'⚡ Power-Up! ⭐',900);
  setTimeout(nextQuestion,950);
}
function powerHud(){
  const u=S.pu, it=u.items[u.i]; if(!it) return;
  $('modeHud').innerHTML='<div class="pu-hud"><span class="pu-t">'+(u.review?'⚡ Keep your powers charged':'⚡ Power-Up')+'</span>'+
    '<span class="pu-q">'+(u.i<u.warm?'Warm-up · ':'')+'Question '+(u.i+1)+' of '+u.items.length+'</span>'+
    '<span class="pchip">'+battHTML(it.k)+esc(pname(it.k))+'</span></div>';
}
/* One answer inside Power-Up. A right one charges and moves on; a miss keeps the
   quest's own feedback (the unit card, the worked explain) with credit first and the
   answer last, in a warm colour, and waits for her to tap Next. */
function powerAnswer(right, btn){
  const u=S.pu, it=u.items[u.i];
  if(!it) return;
  S.total++;
  if(right){ S.correct++; S.streak++; S.best=Math.max(S.best,S.streak); } else S.streak=0;
  S.maxLevel=Math.max(S.maxLevel, Q.level||1);
  recSkill(Q.skill,right);            /* charges the meter too */
  saveData();
  lockButtons();
  if(!right && btn){ btn.classList.remove('dim'); btn.classList.add('pick'); }
  powerHud();
  u.wait=true;
  if(right){
    if(!crysCheer()) sfx.correct();   /* fun layer: a Comeback or Power crystal */
    $('feedback').innerHTML='<span class="ok">⚡ '+esc(pq(it.k))+(pstate(it.k).full?' is fully charged!':' is charging up!')+'</span>';
    setTimeout(powerNext,1500);
  } else {
    const raw=Q.typed ? $('typedInput').value.trim() : '';
    const lead=Q.typed ? unitLead(raw, Q) : '';
    const w=wrongRec(Q, Q.typed ? raw : Q.choices[S.lastPick], Q.typed ? null : S.lastPick, lead);
    S.wrongs.push(w);
    if(w.st){
      /* Maths Coaching Card: the walk-through, steps one at a time, the answer last. On a
         multiple choice the right button stays unmarked until "Show me the answer". */
      $('feedback').innerHTML=coachHTML(w);
      if(!Q.typed) document.querySelectorAll('.ansBtn.good').forEach(x=>{ x.classList.remove('good'); x.classList.add('dim','mc-hold'); });
    } else
    /* refuter R3 (science's words) and R4 (the answer last, for a multiple choice too) */
    $('feedback').innerHTML='<span class="no coach">'+(lead||'🌱 Good try. Let\'s look at it together. ')+(Q.explain||'')+
      ' The answer is <b>'+Q.answerText+'</b>.</span>';
    $('puNext').textContent = u.i>=u.items.length-1 ? 'Finish my Power-Up ▶' : 'Next ▶';
    $('puBar').classList.add('on');
    setTimeout(()=>{ try{ $('puNext').focus(); }catch(e){} },60);
  }
}
function powerNext(){
  if(!S || !S.power || !S.pu.wait) return;
  S.pu.wait=false;
  $('puBar').classList.remove('on');
  S.pu.i++;
  if(S.pu.i>=S.pu.items.length){ endPower(); return; }
  nextQuestion();
}
function endPower(){
  MODE_FEED=null;
  document.body.removeAttribute('data-mode-theme');
  $('modeHud').innerHTML='';
  /* the parents corner reads this row through the same topic-true tally as a quest */
  DB.sessions.push({ t:Date.now(), topic:null, won:true, correct:S.correct, total:S.total, best:S.best,
    crystals:0, maxLevel:S.maxLevel, skills:S.skills, tally:S.tally||{}, ms:Date.now()-S.t0,
    timed:false, mode:'power', wrongs:S.wrongs.slice(0,10).map(slimWrong) });
  if(DB.sessions.length>60) DB.sessions=DB.sessions.slice(-60);
  outboxMaths(DB.sessions[DB.sessions.length-1]);   /* results outbox (fire-and-forget) */
  saveData();
  sfx.win();
  renderPowerClose();
}
/* Power-Up close: what she powered up, and the next step. No score, no count of misses. */
function renderPowerClose(){
  const u=S.pu, keys=[], seen={}, up=[], full=[];
  /* a targeted round talks about its targets (the warm-ups were there for confidence); a review talks about all of it */
  u.items.forEach((it,j)=>{ if(!seen[it.k] && (u.review || j>=u.warm)){ seen[it.k]=1; keys.push(it.k); } });
  keys.forEach(k=>{
    const b=u.p0[k]||{ s:0, full:false }, a=pstate(k);
    if(a.full && !b.full) full.push(k);
    if((a.full && !b.full) || a.s>b.s || (u.review && a.full)) up.push(k);
  });
  const lead=u.keys.length ? u.keys : keys.slice(0,2);
  const nextRot=powerRotation(), nk=nextRot.length ? nextRot[0].k : null;
  const firstEver=u.review && !Object.keys(u.p0).length;
  const said = up.length ? (u.review && !firstEver ? 'You kept '+andList(up.map(pq))+' charged today.' : 'You powered up '+andList(up.map(pq))+' today.')
                         : 'You worked on '+andList(lead.map(pq))+' today. Every go builds your power.';
  const nextLine = nk ? 'Next time: '+pq(nk)+'.' : 'Next time: a mixed round to keep your powers charged.';
  $('puEyebrow').textContent = u.review ? '⚡ Power-Up · Keep your powers charged' : '⚡ Power-Up';
  $('puTitle').textContent = full.length ? '🌟 Powered up!' : '🌱 Nice work!';
  $('puSaid').textContent = '✨ '+said;
  const w=$('puWell');
  w.textContent = full.length ? '⚡ '+andList(full.map(pq))+(full.length===1?' is':' are')+' fully charged.' : '';
  w.style.display = full.length ? '' : 'none';
  $('puPowers').innerHTML = powersHTML(keys);
  $('puNextLine').textContent = '➡️ '+nextLine;
  /* fun layer: any Star Crystals this round rescued */
  const won=S.won||[];
  $('puCrys').innerHTML = won.length ? '<h3>⭐ Star Crystals rescued today</h3>'+crysPanel(null, won) : '';
  $('puCrys').style.display = won.length ? '' : 'none';
  show('powerScreen');
  $('powerScreen').scrollTop=0;
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
let bannerT=null;
function banner(txt,ms){
  $('bannerText').innerHTML=txt;
  $('banner').style.display='flex';
  /* fun layer: a newer banner keeps its full time (an older timer used to hide it early) */
  clearTimeout(bannerT);
  bannerT=setTimeout(()=>{ $('banner').style.display='none'; }, ms||1100);
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

/* The figure contract (js/topics/README.md): a generator emits its diagram as pure
   data on q.figure and never as markup; js/figures.js is the only thing that draws
   it. This is the shell's single call into the renderer. */
function figHtml(q){
  if(q && q.figure && MQI.renderFigure) return MQI.renderFigure(q.figure);
  return (q && q.extra) || '';
}

/* ---------------- the two measurements a drawing cannot make for itself ----------
 * (Phone Width Refutation, 2026-09-07.) js/figures.js is pure string building and
 * knows nothing about the viewport; these are the shell's side of the contract, and
 * both are gated by `npm run test:layout`.
 *
 *  --mqFigMaxH  The height the drawing may actually have. Measured from the LIVE
 *               column: the battle screen's inner height minus every sibling of the
 *               question card, minus the card's own padding and its other children.
 *               A scaling figure (pie, line) caps itself against it and shrinks with
 *               its aspect preserved; the rest scroll inside #qextra. Without it, a
 *               390 x 664 iPhone (the state Safari is in with the URL bar showing)
 *               painted the pie 97 px past its card, through both HP numbers and
 *               55 px into the answer buttons.
 *  [data-more]  Whether a .fig-scroll box has more content off its right edge. This
 *               is what makes the table's scroll cue REAL: the background-shadow
 *               trick could only draw behind the cells, so the opaque header row
 *               painted over it and the cue showed on the value row alone.
 *
 * Driven by one MutationObserver on #app plus resize and scroll, debounced to a
 * frame - so every render site (a question, a Patchwerk round, the end screen's
 * review list) is covered without a call at each one. */
function syncFigures(){
  const q=$('qextra'), frame=$('qextraFrame'), card=$('qcard'), scr=$('battleScreen');
  if(q && frame && card && scr && scr.classList.contains('active')){
    let used=0;
    for(const el of scr.children){ if(el!==card) used+=el.getBoundingClientRect().height; }
    const cs=getComputedStyle(card), n=v=>parseFloat(v)||0;
    const gap=n(cs.rowGap);
    let box=n(cs.paddingTop)+n(cs.paddingBottom)+n(cs.borderTopWidth)+n(cs.borderBottomWidth)
           +n(cs.marginTop)+n(cs.marginBottom);
    for(const el of card.children){ if(el!==frame && el.offsetParent!==null) box+=el.getBoundingClientRect().height+gap; }
    const budget=Math.max(96, Math.round(scr.clientHeight-used-box));
    q.style.setProperty('--mqFigMaxH', budget+'px');
    /* A drawing that declares data-fit may be scaled to fit; its prose may not. Hand
       it exactly the height left over once the card's own words are measured - a
       guessed constant made a 1024 px desktop shrink a pie that had room to spare.
       Recomputed only when the drawing, the budget or the width actually changed, so
       the twice-a-second clock tick does not re-lay-out the figure. */
    const fits=q.querySelectorAll('svg[data-fit="1"]');
    /* the signature must not include the style attribute this block writes, or every
       sync would see a "changed" figure and re-lay it out */
    const sig=(q.firstElementChild?q.firstElementChild.className:'')+'|'+(q.textContent||'').length
             +'|'+budget+'|'+window.innerWidth;
    if(fits.length && q.dataset.figSig!==sig){
      q.dataset.figSig=sig;
      for(const svg of fits) svg.style.removeProperty('max-height');
      const root=q.firstElementChild;
      /* THE FIT IS BOUNDED BY THE READING FLOOR. Scaling a drawing down to make it fit
         is the same trade the bar graph was killed for making: at 390 x 664 an
         unbounded height fit put the pie's own sector numbers at 7.24 px. So the fit
         may shrink a drawing only until its smallest label reaches 11 px on the glass
         (10 px at 320) - past that it stops, and the card scrolls instead, with the
         "⌄ more" cue. Readability first, scroll second, cover nothing ever. */
      const floor=window.innerWidth<=320?10:11;
      for(const svg of fits){
        const natural=root?root.getBoundingClientRect().height:0;
        const svgH=svg.getBoundingClientRect().height;
        if(!(natural>budget) || !(svgH>0)) continue;
        let minDecl=Infinity;
        for(const t of svg.querySelectorAll('text')){
          const fs=parseFloat(getComputedStyle(t).fontSize);
          if(fs>0) minDecl=Math.min(minDecl,fs);
        }
        const vbH=(svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height)||svgH;
        /* +0.2 px of margin on the floor: without it the fit lands EXACTLY on the
           floor and sub-pixel rounding puts the measured size a hundredth under it. */
        const readable=isFinite(minDecl)? vbH*(floor+0.2)/minDecl : 0;
        const want=svgH-(natural-budget);
        if(want>=svgH) continue;
        const h=Math.max(72, readable, want);
        if(h<svgH) svg.style.maxHeight=Math.ceil(h)+'px';
      }
    } else if(!fits.length) delete q.dataset.figSig;
    frame.setAttribute('data-more', (q.scrollHeight-q.clientHeight-q.scrollTop)>1 ? '1':'0');
  }
  for(const fr of document.querySelectorAll('.fig-frame')){
    const sc=fr.querySelector('.fig-scroll');
    fr.setAttribute('data-more', sc && (sc.scrollWidth-sc.clientWidth-sc.scrollLeft)>1 ? '1':'0');
  }
}
(function(){
  let queued=false;
  const kick=()=>{ if(queued) return; queued=true;
    requestAnimationFrame(()=>{ queued=false; try{ syncFigures(); }catch(e){} }); };
  const arm=()=>{
    const app=document.getElementById('app');
    if(!app) return;
    new MutationObserver(kick).observe(app,{childList:true,subtree:true});
    app.addEventListener('scroll', kick, true);
    kick();
  };
  window.addEventListener('resize', kick);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arm);
  else arm();
})();

function nextQuestion(){
  if(!S) return;
  Q=makeQuestion(S.level);
  $('qtext').innerHTML=Q.q;
  $('qextra').innerHTML=figHtml(Q);
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
  if(S.power){ $('puBar').classList.remove('on'); powerHud(); }
  if(S.mock){
    const a=mockActive(), ans=a && a.mode._answers[a.mode._i];
    if(Q.typed && ans && ans.raw!=null) $('typedInput').value=ans.raw;
    mockPaint();
  }
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
  /* the topic-true tally: { topic: { skill: {r,w} } } - what the parents corner reads */
  const tp=(Q&&Q.topic)||TOPIC;
  if(!S.tally) S.tally={};
  if(!S.tally[tp]) S.tally[tp]={};
  if(!S.tally[tp][skill]) S.tally[tp][skill]={r:0,w:0};
  S.tally[tp][skill][right?'r':'w']++;
  /* the Power-Up meter rides the same choke point: quests, Patchwerk, Power-Up and a
     mock paper's hand-in all charge (or empty) it here */
  const pk=tp+'|'+skill, p0=DB.power && DB.power[pk], was={ lm:!!(p0&&p0.lm), full:!!(p0&&p0.full) };
  charge(tp, skill, right, Q && Q.level);
  /* fun layer: the Comeback and Power crystals, read off the meter just charged.
     Never in the mock paper. */
  if(S) S.fresh=[];
  if(S && !S.mock && right && skill){
    const p1=DB.power[pk]||{}, won=[];
    if(was.lm) won.push(award(tp,'c'));
    if(!was.full && p1.full) won.push(award(tp,'p'));
    S.fresh=won.filter(Boolean);
    if(S.fresh.length){ S.won=(S.won||[]).concat(S.fresh); saveData(); }   /* kept even if she leaves mid-quest */
  }
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
/* ===== THE UNIT TEACHING CARD ========================================
 * Unit Sweep Refutation W1 (2026-09-07). The unit sweep declared q.unit on 20
 * generators and turned 160 previously-accepted wrong-unit answers into
 * rejections - and shipped no new teaching for a single one of them. Sampled 270
 * of those rejections across nine unit classes: in 270 of 270 the child read
 *
 *     child typed  : 300 cm
 *     child is told: The answer is 300 cm². 1/2 x 24 x 25 = 300 cm².
 *
 * sees 300 under 300, and concludes the game is broken. A rejection a child
 * cannot decode teaches nothing, and this game's north star is fade-out.
 *
 * So when the NUMBER was right and only the unit was wrong, lead with that, in
 * words a P3 can read, and say WHY that unit - the reason is the teaching, not
 * the correction. One short sentence per unit class; never a lecture, and never
 * shown on a wrong number.
 *
 * MQI.typedRejectReason is the single definition of "unit-only wrong", shared with
 * the bridge verdict (reason: 'wrong-unit'), so the web card and a SwiftUI view
 * cannot drift apart on when to show this. */
const UNIT_WHY = [
  [['cm2','m2'],                    'area is measured in squares'],
  [['cm3','m3','ml','l'],           'this asks how much space it fills'],
  [['cm','m','km','mm'],            'this asks how long something is'],
  [['$','cents','cent','dollars'],  'this asks how much money'],
  [['%'],                           'this asks for a percentage'],
  [['kg','g'],                      'this asks how heavy it is'],
  [['min','h','s'],                 'this asks how long it takes']
];
function unitWhy(unit){
  const n = MQI.normUnit(unit);
  for(const [members,why] of UNIT_WHY) if(members.indexOf(n)!==-1) return why;
  return 'that is what you are counting';   /* count nouns: pupils, stickers, cubes, buns */
}
/* '' when this was not a unit-only miss. Otherwise the child's card, canonical
   unit in bold (the first member when the question accepts a set of equivalents). */
function unitLead(raw, q){
  if(!q || !q.typed || !q.unit) return '';
  if(MQI.typedRejectReason(raw, q) !== 'wrong-unit') return '';
  const want = MQI.unitList(q.unit)[0];
  if(!want) return '';
  return 'Your number was right. The unit should be <b>'+want+'</b>, because '+unitWhy(want)+'. ';
}
/* ===== THE COACHING WALK-THROUGH (Maths Coaching Card 2026-10-17) ====
 * The science shell's pattern (science/index.html, lane C6), on the maths shell. A
 * coached generator emits q.technique + q.steps (+ an optional q.optionFeedback);
 * wherever a coached miss is gone over - the Power-Up feedback, the end-of-quest and
 * Patchwerk reviews, the mock report - she reads, in order:
 *   1. a kind line about HER answer (the unit card or the slip's own coaching first);
 *   2. the technique badge;
 *   3. the steps, one at a time ("Show me the next step");
 *   4. the answer last, with the full worked explanation folded under it.
 * An item without steps keeps today's card. The mock-taking flow is untouched: all of
 * this paints only after an answer has been marked. tools/coach-steps.mjs proves every
 * step true for its own drawn numbers. */
const TECH = {
  'Draw a model': 'Draw bars for the parts and the whole, or to compare, then label what you know.',
  'Before and after': 'Change problems: draw the bars before the change, then after it.',
  'Work backwards': 'Start from the end amount and undo each step, last step first.',
  'Make a list': 'Write the cases in order, so nothing is missed or counted twice.',
  'Guess and check': 'Make a sensible guess, check it, then adjust the guess.',
  'Units check': 'Say the unit, and change everything to the same unit first.',
  'Read, compare, conclude': 'Read the values, compare them, then answer.',
  'Sketch and label': 'Draw the shape and write every length on it before you work.',
  'Draw a timeline': 'Mark the times on a line and count on: hours first, then minutes.'
};
const NEXT_STEP='Show me the next step →', SHOW_ANS='Show me the answer →';
/* The review record every mode keeps for a miss. The coaching fields ride in the
   session only; slimWrong drops them before a save, so the stored history is unchanged. */
function wrongRec(q, given, choice, lead, timedOut){
  const w={q:q.q+figHtml(q), a:q.answerText, ex:q.explain, skill:q.skill};
  if(q.steps && q.steps.length){
    w.t=q.technique; w.st=q.steps; w.gv=(given==null?null:String(given)); w.ci=(choice==null?null:choice);
    w.ul=lead||''; w.to=!!timedOut;
    if(q.optionFeedback && choice!=null && q.optionFeedback[choice]) w.fb=q.optionFeedback[choice];
  }
  return w;
}
function slimWrong(w){ return {q:w.q, a:w.a, ex:w.ex, skill:w.skill}; }
function coachYou(w){
  let h;
  if(w.to) h='<p class="mc-you">The clock ran out on this one. That is fine: let\'s work it out together.</p>';
  else if(w.gv==null || w.gv==='') h='<p class="mc-you">You left this one blank. That is fine: let\'s work it out together.</p>';
  else h='<p class="mc-you">You '+(w.ci!=null?'chose':'wrote')+' <b>'+(w.ci!=null?w.gv:esc(w.gv))+'</b>.</p>';
  /* the line that speaks to her answer: the unit card, then the slip's own coaching */
  h+='<p class="mc-line">'+(w.ul || w.fb || 'Good try. Let\'s look at it together.')+'</p>';
  return h;
}
function coachHTML(w){
  const d=TECH[w.t]||'';
  return '<div class="mcoach" data-mcoach>'+
    '<b class="mc-h">🌱 Let\'s work this one out together</b>'+coachYou(w)+
    '<p class="mc-tech"><span class="mc-badge">🧭 '+esc(w.t)+'</span>'+(d?'<small>'+esc(d)+'</small>':'')+'</p>'+
    '<ol class="mc-steps">'+w.st.map((s,j)=>'<li'+(j?' hidden':'')+'>'+s+'</li>').join('')+'</ol>'+
    '<button type="button" class="mc-next" data-mq="step">'+(w.st.length>1?NEXT_STEP:SHOW_ANS)+'</button>'+
    '<div class="mc-ans" hidden><span class="mc-is">✅ The answer is <b>'+w.a+'</b>.</span>'+
      (w.ex?'<details class="mc-more"><summary>See the whole working</summary><div class="how">'+w.ex+'</div></details>':'')+
      '<p class="mc-close">Next time, try this first: <b>'+esc(w.t)+'</b>.</p></div>'+
  '</div>';
}
/* one review row: the walk-through for a coached miss, today's card otherwise */
function revItemHTML(w, head){
  return '<div class="revItem">'+(head||'')+w.q+(w.st ? coachHTML(w)
    : '<br><span class="ansIs">Answer: '+w.a+'</span><br><span class="how">'+(w.ex||'')+'</span>')+'</div>';
}
/* "Show me the next step": reveal in place, so a long review list keeps its scroll.
   The last tap shows the answer, and in Power-Up turns the right button green only then. */
document.addEventListener('click', e=>{
  const b=e.target && e.target.closest ? e.target.closest('[data-mq="step"]') : null;
  if(!b) return;
  const box=b.closest('[data-mcoach]'); if(!box) return;
  const next=box.querySelector('ol.mc-steps li[hidden]');
  let show=null;
  if(next){
    next.hidden=false; show=next;
    if(!box.querySelector('ol.mc-steps li[hidden]')) b.textContent=SHOW_ANS;
  } else {
    show=box.querySelector('.mc-ans'); if(show) show.hidden=false;
    document.querySelectorAll('.ansBtn.mc-hold').forEach(x=>{ x.classList.remove('mc-hold','dim'); x.classList.add('good'); });
    b.remove();
  }
  if(show && show.scrollIntoView) try{ show.scrollIntoView({block:'nearest', behavior:'smooth'}); }catch(err){}
});
function markWrong(feedbackHtml, rec){
  S.streak=0; S.wrongRow++; S.rightRow=0;
  if(S.wrongRow>=2 && S.level>1){ S.level--; S.wrongRow=0; }
  sfx.wrong();
  S.wrongs.push(rec || wrongRec(Q));
  $('feedback').innerHTML=feedbackHtml;
  updateStreak();
}
/* A quest miss on a coached item: the battle keeps its pace (the walk-through waits in
   the end-of-quest review), but the card leads with credit and the technique, and the
   answer comes last. */
function questCoachCard(lead){
  return '<span class="no coach">'+(lead||'🌱 Good try. ')+'<span class="mc-chip">🧭 '+esc(Q.technique)+'</span> '+(Q.explain||'')+
    ' The answer is <b>'+Q.answerText+'</b>.</span>';
}
function timeUp(){
  if(!S || S.busy) return; S.busy=true;
  S.total++;
  recSkill(Q.skill,false);
  lockButtons();
  if(Q.steps) markWrong(questCoachCard('⏰ Time\'s up. That is fine. '), wrongRec(Q, null, null, '', true));
  else markWrong('<span class="no">⏰ Time\'s up! '+(Q.typed?('The answer is <b>'+Q.answerText+'</b>. '):'')+Q.explain+'</span>');
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
    /* fun layer: a rescued Star Crystal takes the banner band (and the chime) */
    if(!crysCheer()){ if(crit){ sfx.crit(); banner('💥 CRITICAL HIT!'); } else sfx.correct(); }
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
    /* The child's own text is still in the (now disabled) field - answerTyped
       leaves it there - so the card can name the unit they actually typed. */
    const raw = Q.typed ? $('typedInput').value.trim() : '';
    const lead = Q.typed ? unitLead(raw, Q) : '';
    if(Q.steps) markWrong(questCoachCard(lead),
      wrongRec(Q, Q.typed ? raw : Q.choices[S.lastPick], Q.typed ? null : S.lastPick, lead));
    else markWrong('<span class="no">'+lead+(Q.typed?('The answer is <b>'+Q.answerText+'</b>. '):'')+Q.explain+'</span>');
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
  S.lastPick=i;   /* the coaching card names her choice */
  if(S.patchwerk){
    if(!right && btn){ btn.classList.remove('dim'); btn.classList.add('bad'); }
    pwResolve(right);
    return;
  }
  if(S.mock){ mockPick(i); return; }
  if(S.power){ powerAnswer(right, btn); return; }
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
  if(S.mock){ mockTyped(); return; }
  S.busy=true;
  stopQTimer();
  const c=ac(); if(c&&c.resume) c.resume();
  /* Numeric compare, never parseInt: money answers are decimals and
     parseInt("4.75") === 4 marked every correct money answer wrong.
     Grader lives in js/core.js so the harness can test it DOM-free. */
  const right = MQI.gradeTyped(v, Q);
  $('typedInput').disabled=true;
  if(S.patchwerk){ pwResolve(right); return; }
  if(S.power){ powerAnswer(right); return; }
  S.total++;
  recSkill(Q.skill,right);
  resolve(right);
}
function monsterDown(){
  sfx.monsterDown();
  $('monsterSprite').classList.add('dying');
  banner('💥 Monster beaten! 💥',1000);   /* Kev 2026-10-23: no clash with the land Star Crystals */
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
/* fun layer: science's light burst - 16 pieces, about 1.5 s, one burst at a time, and
   none at all under prefers-reduced-motion (was 40 pieces for up to 5.5 s) */
function confetti(){
  if(reducedMotion() || document.querySelector('.confetti')) return;
  for(let i=0;i<16;i++){
    const el=document.createElement('div');
    el.className='confetti'; el.setAttribute('aria-hidden','true');
    el.textContent=['⭐','✨','🎉','💛'][i%4];
    el.style.left=ri(0,96)+'vw';
    el.style.animationDuration=(1.1+Math.random()*0.6).toFixed(2)+'s';
    el.style.animationDelay=(Math.random()*0.3).toFixed(2)+'s';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),2200);
  }
}
function endGame(win){
  stopQTimer();
  if(clockTimer){ clearInterval(clockTimer); clockTimer=null; }
  const ms=Date.now()-S.t0;
  /* fun layer: finishing a quest in a land is its Explorer crystal, win or "so close" */
  const ex=award(TOPIC,'e');
  if(ex) S.won=(S.won||[]).concat([ex]);
  DB.sessions.push({
    t:Date.now(), topic:TOPIC, won:win, correct:S.correct, total:S.total,
    best:S.best, crystals:S.mi, maxLevel:S.maxLevel, skills:S.skills,
    ms, timed:S.timed, wrongs:S.wrongs.slice(0,10).map(slimWrong), tally:S.tally||{},
    mode:S.timed?'timed':'relax'
  });
  if(DB.sessions.length>60) DB.sessions=DB.sessions.slice(-60);
  outboxMaths(DB.sessions[DB.sessions.length-1]);   /* results outbox (fire-and-forget) */

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

  if(win){ sfx.win(); confetti(); }
  else if(S.won && S.won.length){ sfx.crystal(); confetti(); }   /* a rescued crystal is still a win */
  else sfx.lose();
  $('crysEnd').innerHTML=crysPanel(TOPIC, S.won);
  $('crysEnd').style.display=$('crysEnd').innerHTML ? '' : 'none';
  $('pwEnd').style.display='none';
  $('normalStats').style.display='flex';
  $('endQuiet').style.display='';
  $('endEmoji').textContent=win?'🏆':'💪';
  $('endTitle').textContent=win?'VICTORY!':'So close, '+esc(DB.name)+'!';
  let msg = win
    ? esc(DB.name)+' the '+avClass()+' beat all 6 monsters of '+(crysLand(TOPIC)?crysLand(TOPIC).name:TOPICS[TOPIC].label)+'!'
    /* fun layer: the battle's count is "monsters", so it never reads against the land's
       Star Crystals panel below ("You rescued 0 crystals" over "Explorer crystal rescued") */
    : (S.mi ? 'You beat '+S.mi+' monster'+(S.mi===1?'':'s')+' this time. ' : '')+'Every battle makes your magic stronger. Try again!';
  if(win && fameRank===0) msg+=' 🥇 NEW RECORD, fastest run ever!';
  else if(win && fameRank>0) msg+=' You made the Hall of Fame at #'+(fameRank+1)+'!';
  $('endMsg').textContent=msg;
  /* Kev 2026-10-23: lead with wins (what went well, what she powered up); the correct /
     accuracy count moves lower to a quiet line under the review (mirrors science b595384) */
  const well=[];
  if(S.mi) well.push('you beat '+S.mi+' monster'+(S.mi===1?'':'s'));
  if(S.best>=2) well.push('your best streak was 🔥'+S.best);
  if(S.maxLevel>1) well.push('you powered up to level '+S.maxLevel);
  $('endWell').textContent=well.length ? '✨ What went well: '+well.join(', ')+'!' : '';
  $('endWell').style.display=well.length ? '' : 'none';
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
      .map(w=>revItemHTML(w)).join('');
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
    /* topic-true tally first; a pre-fix Patchwerk row filed every skill under the last
       topic drawn, so its bare skills are not trusted */
    if(s.tally){
      for(const tp in s.tally) for(const k in s.tally[tp]){
        const key=tp+'|'+k;
        if(!agg[key])agg[key]={r:0,w:0};
        agg[key].r+=s.tally[tp][k].r; agg[key].w+=s.tally[tp][k].w;
      }
      return;
    }
    if(s.mode==='patchwerk') return;
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
    : (rows.length? '<div style="color:#7dffb0;font-size:15px;text-align:center">Nothing needs extra focus right now: accuracy is solid across skills. 🎉</div>'
                   : '<div style="color:#a99fd8;font-size:14px">Play a few sessions first.</div>');

  const recent=ss.slice(-10).reverse();
  $('histTable').innerHTML='<tr><th>Date</th><th>Land</th><th>Mode</th><th>Result</th><th>Score</th><th>Acc</th><th>Time</th></tr>'+
    recent.map(s=>'<tr><td>'+fmtDate(s.t)+'</td><td>'+(TOPICS[s.topic]?TOPICS[s.topic].e:'🗺️')+'</td><td>'+({patchwerk:'💀',mock:'📝',power:'⚡',weakspots:'⚡'}[s.mode]||(s.timed?'⏱️':'🌙'))+'</td><td>'+
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
  $('mkPrev').addEventListener('click',()=>{ const a=mockActive(); if(a && !S.busy) mockGo(a.mode._i-1); });
  $('mkNext').addEventListener('click',()=>{ const a=mockActive(); if(a && !S.busy) mockGo(a.mode._i+1); });
  $('mkFlag').addEventListener('click',mockFlag);
  $('mkHandIn').addEventListener('click',()=>mockConfirm(true));
  $('mkCfBack').addEventListener('click',()=>mockConfirm(false));
  $('mkCfGo').addEventListener('click',mockHandIn);
  const jump=e=>{ const b=e.target.closest('.mkNum'); if(!b || !mockActive()) return; mockConfirm(false); mockGo(+b.dataset.k); };
  $('mkGrid').addEventListener('click',jump);
  $('mkCfBody').addEventListener('click',jump);
  $('mkHistBtn').addEventListener('click',()=>renderMockHistory('mockScreen'));
  $('mkMapBtn').addEventListener('click',()=>{ DB.grade='P3'; saveData(); renderMap(); });
  $('mkHomeBtn').addEventListener('click',()=>{ renderStart(); show('startScreen'); });
  $('parentMockBtn').addEventListener('click',()=>renderMockHistory('parentScreen'));
  $('puNext').addEventListener('click',powerNext);
  $('puAgainBtn').addEventListener('click',startPower);
  $('puMapBtn').addEventListener('click',()=>{ DB.grade='P3'; saveData(); renderMap(); });
  $('puHomeBtn').addEventListener('click',()=>{ renderStart(); show('startScreen'); });
  $('mkHistBackBtn').addEventListener('click',()=>{
    if(MOCK_BACK==='parentScreen') renderParent();
    else if(MOCK_BACK==='mapScreen') renderMap();
    else if(MOCK_BACK==='mockScreen') show('mockScreen');
    else { renderStart(); show('startScreen'); }
  });

  renderStart();
  if(!/[?&](autoplay|shot)=/.test(location.search)) mockResume();
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
  /* shot=<screen> drives a headless browser straight to one screen so the
     integration/dress-rehearsal gates can screenshot it. Params:
       grade=P3|P4|P5   select the level first
       shot=start       the level picker (default screen, re-rendered)
       shot=map         that level's island map
       shot=q&topic=ID  one question from that topic
     Inert without the query string; no production path reads it. */
  const shot=p.get('shot');
  if(shot){
    const gd=p.get('grade'); if(gd && GRADES.includes(gd)){ DB.grade=gd; saveData(); }
    if(p.get('mode')==='patchwerk'){ DB.gameMode='patchwerk'; saveData(); }
    renderStart();
    if(shot==='map'){ setTimeout(()=>{
      renderMap();
      /* scroll=<px> scrolls the map's own scroll container, which is capped at
         #app{max-height:1000px}. Without it a headless --screenshot can only ever
         capture the first eight island cards, so the nodes a wave ADDS (they append
         at the bottom) are invisible to the integration gate. Inert in production. */
      const sc=parseInt(p.get('scroll'),10);
      if(sc>0){ setTimeout(()=>{ const el=document.getElementById('mapScreen'); if(el) el.scrollTop=sc; },200); }
    },150); }
    /* shot=feed&topic=ID&n=<k> draws k CONSECUTIVE items from ONE session feed
       (the same FEED object a child plays) and lists them with their skill, so the
       integration gate can prove the round-robin interleave on the glass rather than
       only in tools/feed-sim.mjs. Read-only: it never answers or scores. Inert in
       production, like every other shot mode. */
    if(shot==='feed'){
      const t=p.get('topic'); const n=Math.min(parseInt(p.get('n'),10)||5,10);
      if(t && TOPICS[t]){ TOPIC=t; setTimeout(()=>{
        newGame();
        const rows=[];
        for(let k=0;k<n;k++){
          nextQuestion();
          rows.push('<div class="qbox" style="margin:8px 0;text-align:left">'+
            '<div style="opacity:.75;font-size:13px">Q'+(k+1)+' &nbsp;|&nbsp; skill: <b>'+
            (Q&&Q.skill?Q.skill:'?')+'</b> &nbsp;|&nbsp; pool '+((S&&S.level)||1)+'</div>'+
            '<div>'+(Q?Q.q:'')+'</div></div>');
        }
        /* write AFTER the normal per-question render has settled, otherwise
           nextQuestion's own paint overwrites the list. */
        setTimeout(()=>{
          const host=document.getElementById('qtext');
          if(host) host.innerHTML='<div style="font-size:15px">'+rows.join('')+'</div>';
          for(const id of ['qextra','answers','feedback','typedWrap','timerWrap']){
            const el=document.getElementById(id); if(el) el.innerHTML='';
          }
        },450);
      },150); }
      return;
    }
    if(shot==='q'){
      const t=p.get('topic');
      /* find=<substring> redraws until a question whose rendered stem contains that
         substring comes up, so a gate can screenshot ONE named item type rather than
         whatever pool 1 happens to hand over first. Capped, and inert in production.

         WOUND 5 (Figure Spec Refutation, 2026-09-07). This was written up as "does
         not work"; it is a 50 ms race. newGame() ends with setTimeout(nextQuestion,
         300), so the find loop - scheduled at +250 ms - ran its 900 draws and was
         then OVERWRITTEN by that deferred first draw 50 ms later, and the gate
         always screenshotted a random item. Rather than swap one magic delay for a
         bigger one, wait for the first draw to actually land (Q goes non-null) and
         sweep only then: deterministic on a slow machine too.

         Side effect worth keeping in the gate playbook: the loop leaves S.level = 3,
         so find=<a string that never matches> is a working live-play route to pool
         3 - a pool-3 figure can be shot from the real app with no bench page. */
      const find=p.get('find');
      if(t && TOPICS[t]){ TOPIC=t; setTimeout(()=>{
        newGame();
        if(find){
          Q=null;   /* newGame() does not clear it; the wait below keys off it */
          const sweep=()=>{
            for(let k=0;k<900 && (!Q || Q.q.indexOf(find)===-1);k++){
              if(S) S.level = 1 + (k % 3);   /* sweep all three pools, not just pool 1 */
              nextQuestion();
            }
          };
          const afterFirstDraw=n=>{ if(Q || n>40){ sweep(); return; } setTimeout(()=>afterFirstDraw(n+1),25); };
          afterFirstDraw(0);
        }
      },150); }
    }
    return;
  }
  /* ?autoplay=mock&variant=quick|full|long&bot=1&acc=70&delay=300&ms=<paper length>
     drives a real P3 Mock Paper for the headless gate. Inert without the query. */
  if(p.get('autoplay')==='mock'){
    DB.grade='P3';
    const ms=parseInt(p.get('ms'),10); if(ms>0) MOCK_MS=ms;
    renderStart();
    const acc=(parseInt(p.get('acc'),10)||70)/100, delay=parseInt(p.get('delay'),10)||300;
    setTimeout(()=>{
      newMockGame(p.get('variant')||'quick');
      if(p.get('bot')!=='1') return;
      const bot=setInterval(()=>{
        if(!S || !S.mock || !Q || S.busy || !MQI.activeMode){ if(S && !S.mock) clearInterval(bot); return; }
        const m=MQI.activeMode.mode;
        if(m.status().every(x=>x.answered)){ mockHandIn(); return; }
        const right=Math.random()<acc;
        if(Q.typed){
          $('typedInput').value = right ? String(Q.answer) : String((Number(Q.answer)||0)+1);
          answerTyped();
        } else {
          const n=Q.choices.length;
          answer(right?Q.correct:(Q.correct+1)%n, null);
        }
      }, delay);
    }, 400);
    return;
  }
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
