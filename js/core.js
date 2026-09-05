"use strict";
/* Math Quest Island - core.
 * The MQI namespace: the pure (DOM-free) generator kit every topic file draws on,
 * the topic + mode registries, and the question/set builders.
 * Loaded FIRST. Contains no DOM access, so tools/gen-sanity.mjs can load this file
 * plus js/topics/*.js in a bare Node vm with no browser globals.
 */
var MQI = (function (root) {

  /* ===== GEN-KIT-START (pure question helpers, no DOM) ================= */
function ri(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function pick(arr){ return arr[ri(0,arr.length-1)]; }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=ri(0,i); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function gcd(a,b){ while(b){ [a,b]=[b,a%b]; } return a; }
function fr(n,d){ return '<span class="frac"><span class="n">'+n+'</span><span class="d">'+d+'</span></span>'; }
function eq(n1,d1,n2,d2){ return n1*d2 === n2*d1; }

function buildFracChoices(correct, cands, count){
  const out=[correct]; const seen=[correct];
  for(const c of cands){
    if(out.length>=count) break;
    if(c[0]<0||c[1]<=0||c[0]>c[1]) continue;
    if(seen.some(s=>eq(s[0],s[1],c[0],c[1]))) continue;
    seen.push(c); out.push(c);
  }
  let n=1;
  while(out.length<count){
    const c=[Math.max(1,correct[0]+n), correct[1]+n];
    if(c[0]<=c[1] && !seen.some(s=>eq(s[0],s[1],c[0],c[1]))){ seen.push(c); out.push(c); }
    n++; if(n>40) break;
  }
  return out;
}
function finishFrac(qHtml, extraHtml, correct, cands, explain, count){
  const pairs=buildFracChoices(correct, shuffle(cands), count||4);
  const disp=pairs.map(p=> p[0]===p[1] ? '1' : fr(p[0],p[1]));
  const order=shuffle(pairs.map((_,i)=>i));
  return { q:qHtml, extra:extraHtml||'', choices:order.map(i=>disp[i]), correct:order.indexOf(0),
           explain, answerText: correct[0]===correct[1] ? '1' : fr(correct[0],correct[1]) };
}
function finishNum(qHtml, extraHtml, correct, cands, unit, explain){
  const nums=[correct];
  for(const c of shuffle(cands)){
    if(nums.length>=4) break;
    if(c>0 && Number.isInteger(c) && !nums.includes(c)) nums.push(c);
  }
  let t=1;
  while(nums.length<4){
    if(!nums.includes(correct+t)) nums.push(correct+t);
    else if(correct-t>0 && !nums.includes(correct-t)) nums.push(correct-t);
    t++; if(t>60) break;
  }
  const u=unit?(' '+unit):'';
  const order=shuffle(nums.map((_,i)=>i));
  return { q:qHtml, extra:extraHtml||'', choices:order.map(i=>nums[i]+u), correct:order.indexOf(0),
           explain, answerText: correct+u };
}


const EASY_TABLES=[2,3,4,5,10], HARD_TABLES=[6,7,8,9];
function gMul(tables){
  const a=pick(tables), b=ri(2,10), p=a*b;
  return finishNum(a+' × '+b+' = ?','',p,[p+a,p-a,p+b,p-b,p+1],'',
    a+' × '+b+' = '+p+'. Count in '+a+'s: '+Array.from({length:Math.min(b,4)},(_,i)=>a*(i+1)).join(', ')+'…');
}

function finishTyped(qHtml, answer, explain){
  return { q:qHtml, extra:'', typed:true, answer, choices:[], correct:-1,
           explain, answerText:''+answer };
}
  /* ===== GEN-KIT-END ================================================== */

  /* ---------------- registries ---------------- */
  /* TOPICS is filled by js/topics/*.js at load time via MQI.registerTopic. */
  const TOPICS = {};
  const MODES = {};

  /* A topic file registers itself. Shape + rules: js/topics/README.md.
     Required: id, level, strand, moeSubTopic, label, short, e, skills, pools{1,2,3}. */
  function registerTopic(def) {
    if (!def || !def.id) throw new Error('registerTopic: missing id');
    if (TOPICS[def.id]) throw new Error('registerTopic: duplicate id ' + def.id);
    for (const lvl of [1, 2, 3]) {
      if (!def.pools || !Array.isArray(def.pools[lvl]) || !def.pools[lvl].length) {
        throw new Error('registerTopic(' + def.id + '): pools[' + lvl + '] must be a non-empty array');
      }
    }
    TOPICS[def.id] = def;
    return def;
  }

  /* A mode file registers itself. Contract: js/modes/README.md.
     mode = { id, name, start(ctx), onAnswer(ctx, correct, meta), tick(ctx), end(ctx) -> scoreRecord } */
  function registerMode(mode) {
    if (!mode || !mode.id) throw new Error('registerMode: missing id');
    if (MODES[mode.id]) throw new Error('registerMode: duplicate id ' + mode.id);
    for (const hook of ['start', 'onAnswer', 'tick', 'end']) {
      if (typeof mode[hook] !== 'function') throw new Error('registerMode(' + mode.id + '): missing ' + hook + '()');
    }
    MODES[mode.id] = mode;
    return mode;
  }

  /* ---------------- question builders ---------------- */
  function makeQuestionFor(topic,level){
    const [g,skill]=pick(TOPICS[topic].pools[level]);
    const q=g();
    q.level=level; q.skill=skill;
    return q;
  }
  /* Pre-generate a full quiz set with no duplicate questions across the whole run. */
  function buildSetFor(topic, perLevel){
    const set={1:[],2:[],3:[]};
    const seen=new Set();
    for(const lvl of [1,2,3]){
      let guard=0;
      while(set[lvl].length<perLevel && guard<500){
        guard++;
        const q=makeQuestionFor(topic,lvl);
        const key=(q.q+'|'+(q.extra||'')).replace(/\s+/g,'');
        if(seen.has(key)) continue;
        seen.add(key);
        set[lvl].push(q);
      }
    }
    return set;
  }

  const api = {
    gen: { ri, pick, shuffle, gcd, fr, eq, buildFracChoices, finishFrac, finishNum, finishTyped,
           gMul, EASY_TABLES, HARD_TABLES },
    topics: TOPICS,
    modes: MODES,
    registerTopic, registerMode,
    makeQuestionFor, buildSetFor
  };
  /* Script-tag order must not matter for modes. A mode file that loads BEFORE
     core.js pushes itself onto MQI.pendingModes instead of calling registerMode:
       (root.MQI = root.MQI || {}).pendingModes = (root.MQI.pendingModes || []);
       root.MQI.pendingModes.push(mode);
     core.js drains that queue the moment registerMode exists, so a mode script
     tag may sit anywhere in index.html. */
  const queued = (root.MQI && root.MQI.pendingModes) || [];
  root.MQI = api;
  api.pendingModes = [];
  queued.forEach(registerMode);
  /* A mode that loads after core but wants to queue rather than register can
     push and then call drainPendingModes(). */
  api.drainPendingModes = function () {
    const q = api.pendingModes.splice(0, api.pendingModes.length);
    q.forEach(registerMode);
    return q.length;
  };
  return api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Back-compat globals the app shell (js/app.js) and the harness still reference
   by their pre-split names. Behaviour is byte-for-byte the pre-split behaviour. */
var TOPICS = MQI.topics;
var makeQuestionFor = MQI.makeQuestionFor;
var buildSetFor = MQI.buildSetFor;
