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
  /* W3 cosmetic (Dress Rehearsal Wave 2, item 3): a degree sign and a percent sign
     are written TIGHT against the number ("40°", "75%"), the way every stem in the
     app writes them; a word unit keeps its space ("12 cm"). The old ' '+unit made
     the angle options read "40 °" beside a stem reading "50°". */
  const u=unit?((unit==='°'||unit==='%')?unit:(' '+unit)):'';
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

/* finishTyped(stem, answer, explain, unit)
 * `unit` is the unit the STEM asks for ("cm²", "pages", "min", "l"...). It lands on
 * q.unit so gradeTyped can (a) strip that unit when the child types it and (b) REJECT
 * a wrong one. Wave-2 kill (P4 Area+Graphs Refutation, §2 unit gap): before this,
 * finishTyped set no q.unit at all, so "113 cm" graded CORRECT for a 113 cm² answer.
 * Leave `unit` off only when the answer is a bare count with no unit. */
function finishTyped(qHtml, answer, explain, unit){
  const u = unit ? String(unit) : '';
  return { q:qHtml, extra:'', typed:true, answer, choices:[], correct:-1,
           unit:u, explain, answerText: u ? (answer+' '+u) : (''+answer) };
}

/* ===== TYPED-ANSWER GRADING =========================================
 * Shared by the app shell (js/app.js) and the harness (tools/answer-parse-test.mjs).
 * Pure, DOM-free, so the harness can load it out of core.js in a bare vm.
 *
 * WHY THIS EXISTS: js/app.js used to compare with parseInt(v,10) === Q.answer.
 * Every money answer is a decimal, so parseInt("4.75") === 4 !== 4.75 and a
 * child who typed the correct amount was marked wrong on 100% of money items
 * (P3 Pilot Refutation, second kill). Comparison is numeric with tolerance.
 *
 * Accepted on input: surrounding whitespace, a leading "$", thousands commas,
 * and a trailing unit the question declares. Never accepted: the empty string.
 *
 * WAVE-2 KILLS FOLDED IN HERE (P5 Rate+Angles Refutation §4, P4 Area+Graphs §2):
 *  - a child who typed "30 pages", "10 min" or "3870 buns" was graded WRONG on a
 *    correct answer, because the strippable-unit list held only measurement units.
 *    TYPED_UNITS is now broad, and ANY trailing [A-Za-z°²³%$] token is stripped when
 *    the question itself declares that token as its unit.
 *  - a WRONG unit is now rejected: "45 cm" against a cm² answer is FALSE. A missing
 *    unit stays accepted (a bare number is always allowed).
 *  - mixed numbers ("1 1/2"), improper fractions ("3/2") and decimals ("1.5") are
 *    interchangeable on a fractional answer; both sides are reduced before compare.
 */
const TYPED_UNITS = [
  /* measurement */
  'cm3','cm³','cm2','cm²','m2','m²','km','cm','mm','ml','kg','m','g','l','ℓ','%',
  /* angle */
  'degrees','degree','deg','°',
  /* time */
  'minutes','minute','mins','min','hours','hour','hr','h','seconds','secs','sec','s',
  /* counts the wave-2 rate stems name */
  'pages','page','buns','bun','litres','litre','books','pupils','marbles','stickers','beads'
].sort((a,b) => b.length - a.length);
const UNIT_ALIAS = {
  'ℓ':'l', 'litre':'l', 'litres':'l',
  'cm³':'cm3', 'cm²':'cm2', 'm²':'m2',
  '°':'deg', 'degree':'deg', 'degrees':'deg',
  'minute':'min', 'minutes':'min', 'mins':'min',
  'hour':'h', 'hours':'h', 'hr':'h',
  'second':'s', 'seconds':'s', 'secs':'s', 'sec':'s',
  'page':'pages', 'bun':'buns'
};
function normUnit(u){
  const s = String(u).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(UNIT_ALIAS, s) ? UNIT_ALIAS[s] : s;
}
/* Reduce a fraction to lowest terms, sign on the numerator. */
function reduceFrac(n, d){
  if (!d) return null;
  let sign = (n < 0) !== (d < 0) ? -1 : 1;
  n = Math.abs(n); d = Math.abs(d);
  const g = gcd(n, d) || 1;
  return [sign * (n/g), d/g];
}
/* Returns {ok:true, value, unit, frac?} or {ok:false, reason}.
 * `q` is optional; when it declares a unit, that unit is strippable even if it is
 * not on TYPED_UNITS (so a lane may invent "crates" without touching the shared kit). */
function parseTypedAnswer(raw, q){
  if (raw === null || raw === undefined) return { ok:false, reason:'empty' };
  let s = String(raw).trim();
  if (s === '') return { ok:false, reason:'empty' };
  let unit = '';
  /* 1. a unit the question itself declares, whatever it is */
  const declared = q && (q.unit || q.units);
  if (declared){
    const d = String(declared).trim();
    if (d && s.length > d.length && s.slice(-d.length).toLowerCase() === d.toLowerCase()){
      unit = d; s = s.slice(0, s.length - d.length).trim();
    }
  }
  /* 2. otherwise any unit on the broad shared list */
  if (!unit){
    const low = s.toLowerCase();
    for (let i=0;i<TYPED_UNITS.length;i++){
      const u = TYPED_UNITS[i];
      if (low.length > u.length && low.slice(low.length-u.length) === u){
        unit = u; s = s.slice(0, s.length-u.length).trim(); break;
      }
    }
  }
  s = s.replace(/^\$\s*/, '').replace(/,/g, '').trim();
  if (s === '') return { ok:false, reason:'empty' };
  /* mixed number: "1 1/2" */
  const mm = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mm){
    const w = Number(mm[1]), n = Number(mm[2]), d = Number(mm[3]);
    if (!d) return { ok:false, reason:'divide by zero' };
    const top = (w < 0 ? -1 : 1) * (Math.abs(w)*d + n);
    return { ok:true, value:top/d, frac:reduceFrac(top, d), unit };
  }
  /* improper or proper fraction: "3/2", "3/4" */
  const fm = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fm){
    const n = Number(fm[1]), d = Number(fm[2]);
    if (!d) return { ok:false, reason:'divide by zero' };
    return { ok:true, value:n/d, frac:reduceFrac(n, d), unit };
  }
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return { ok:false, reason:'not a number' };
  const v = Number(s);
  if (!Number.isFinite(v)) return { ok:false, reason:'not a number' };
  return { ok:true, value:v, unit };
}
/* true = correct. q may declare q.unit (expected unit) and q.dp (decimal places).
 * Tolerance: exact-after-rounding when q.dp is declared, else 1e-9 for an
 * integer answer and 0.005 for a decimal/money answer.
 * Unit rule: a MISSING unit is accepted, a MISMATCHED unit is rejected. */
function gradeTyped(raw, q){
  const p = parseTypedAnswer(raw, q);
  if (!p.ok) return false;
  const want = q && (q.unit || q.units);
  if (want && p.unit && normUnit(p.unit) !== normUnit(want)) return false;
  /* a unit typed on a question that declares none is only accepted off the shared list */
  if (!want && p.unit && TYPED_UNITS.indexOf(normUnit(p.unit)) === -1
      && TYPED_UNITS.indexOf(String(p.unit).toLowerCase()) === -1) return false;
  if (q && Array.isArray(q.fracAnswer)){
    const r = reduceFrac(Number(q.fracAnswer[0]), Number(q.fracAnswer[1]));
    if (!r || !Number.isFinite(r[0]) || !Number.isFinite(r[1])) return false;
    const n = r[0], d = r[1];
    if (p.frac) return p.frac[0] === n && p.frac[1] === d;
    return Math.abs(p.value - n/d) < 1e-9;
  }
  const ans = Number(q && q.answer);
  if (!Number.isFinite(ans)) return false;
  if (q && Number.isFinite(q.dp)){
    const f = Math.pow(10, q.dp);
    return Math.round(p.value*f) === Math.round(ans*f);
  }
  const tol = Number.isInteger(ans) ? 1e-9 : 0.005;
  return Math.abs(p.value - ans) <= tol;
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
  /* The raw primitive: one uniform draw with replacement from a pool, no memory.
     Kept because Patchwerk rotates TOPICS on every item and gets its variety that
     way. The single-topic feed must NOT use this directly - see createFeed. */
  function makeQuestionFor(topic,level){
    const [g,skill]=pick(TOPICS[topic].pools[level]);
    const q=g();
    q.level=level; q.skill=skill;
    return q;
  }

  /* ---------------- feed: stem shape + session selector ----------------
   * Fixes 1 + 2 of the Repetition + Demand Audit (2026-09-05). Kevin played the
   * shipped build and got "perimeter, perimeter, area, area"; measured, the next
   * item repeated the previous template 32 - 38% of the time (P3 0.376) because
   * makeQuestionFor is a uniform draw with replacement and the only rejection was
   * an exact-duplicate guard. Kevin's ruling: repetition IS easiness.
   */

  /* Stem SHAPE key: two draws of the same template collapse to one key however
     the numbers land. HTML tags, fractions, money, numbers, quoted strings and
     proper nouns are all placeheld. Mirrors the audit's shapeKey (and
     tools/feed-sim.mjs). Over-masking is safe - it only makes the no-repeat guard
     stricter; UNDER-masking is the failure mode, so common sentence words are the
     only capitalised tokens kept. */
  const SHAPE_STOP = new Set(('A An The What Which How If In On At Of For From To And Or But So Then When Where Why Who '
    + 'Find Work Round Write Express Simplify Solve Calculate Convert Complete Give Use Look Read Add Subtract Multiply '
    + 'Divide Count Fill Choose Pick Draw Shade Here There This That It Is Are Was Were Do Does Each Every After Before '
    + 'True False Yes No Total Sum Both All Some One Two Three Four Five Six Seven Eight Nine Ten First Second Third '
    + 'Last Next Same Answer Question Hint Note').split(' '));
  function shapeKey(q){
    let s = String((q && q.q) || '') + ' ||X|| ' + String((q && q.extra) || '');
    s = s.replace(/<span class="frac">[\s\S]*?<\/span><\/span>/g, ' [FRAC] ');
    s = s.replace(/<span class="n">\d+<\/span><span class="d">\d+<\/span>/g, ' [FRAC] ');
    s = s.replace(/<[^>]*>/g, ' [T] ');
    s = s.replace(/&nbsp;/g, ' ');
    s = s.replace(/\$\s?[\d, ]+(\.\d+)?/g, ' [MONEY] ');
    s = s.replace(/\d[\d, ]*(\.\d+)?/g, ' [NUM] ');
    s = s.replace(/"[^"]*"/g, ' [QUOTED] ');
    s = s.replace(/[A-Z][a-z']+/g, w => SHAPE_STOP.has(w) ? w : ' [NAME] ');
    return s.replace(/\s+/g, ' ').trim();
  }

  /* A question's identity for the session's no-exact-duplicate guard: stem PLUS
     extra PLUS the options. The pre-fix key was stem + extra alone, and several
     generators keep a fixed stem and vary only the choices ("Which number is the
     smallest?"), so under a round-robin that key made the SECOND draw of such a
     skill a permanent duplicate and starved the skill out of the carousel for the
     rest of the session. This is the same identity tools/gen-sanity.mjs uses. */
  function qIdentity(q){
    const opts = q.typed ? String(q.answer) : (q.choices || []).join('');
    return (q.q + '|' + (q.extra || '') + '|' + opts).replace(/\s+/g, '');
  }

  const FEED_RING = 3;        /* fix 2: how many stem shapes back we refuse to repeat */
  const FEED_RETRIES = 8;     /* attempts before we accept a repeat - a one-generator pool must never hang */
  const FEED_MIN_L3_SKILLS = 3;

  /* A skill carousel over one pool: [gen, skill] pairs grouped by skill, cycled in
     a shuffled order that RESHUFFLES on every full cycle (so two sessions do not
     run the same carousel), with each skill's own generators rotated the same way. */
  function buildCarousel(pool){
    const bySkill = new Map();
    for (const pr of pool){
      const skill = pr[1] || '';
      if (!bySkill.has(skill)) bySkill.set(skill, []);
      bySkill.get(skill).push(pr);
    }
    return { skills: Array.from(bySkill.keys()), bySkill, order: [], i: 0, gi: new Map() };
  }
  function carouselNext(c){
    if (c.i >= c.order.length){ c.order = shuffle(c.skills); c.i = 0; }
    const skill = c.order[c.i++];
    const gens = c.bySkill.get(skill);
    let st = c.gi.get(skill);
    if (!st || st.i >= st.order.length){ st = { order: shuffle(gens), i: 0 }; c.gi.set(skill, st); }
    return st.order[st.i++];
  }

  /* createFeed(topic, opts) -> { next(level), shapeOf }
   *   opts.dedup        (default true)  no two items in a session share a stem
   *   opts.alternateL3  (default true)  see the level-3 rule below
   *
   * LEVEL-3 ALTERNATION RULE. The mastery climb is untouched - still 3 right in a
   * row up, 2 wrong in a row down, capped at pool 3. But that climb pins ~58% of a
   * session in pool 3, and where pool 3 carries FEWER THAN 3 distinct skills the
   * carousel is too short to hide a repeat. In that case level 3 alternates a pool
   * 3 draw with a pool 2 draw. This is deliberate: the audit's fix 3 (purify pool 3
   * so it holds only generators absent from pools 1 and 2) does the OPPOSITE - it
   * collapses pool 3 to one or two generators and RAISES the repeat rate to 0.49
   * with a worst run of 24. Pool 3 cannot be purified until new pool-3 generators
   * are written, so variety at level 3 is bought by borrowing pool 2, not by
   * narrowing pool 3.
   */
  function createFeed(topic, opts){
    const def = TOPICS[topic];
    if (!def) throw new Error('createFeed: unknown topic ' + topic);
    const o = opts || {};
    const dedup = o.dedup !== false;
    const alternateL3 = o.alternateL3 !== false;
    const car = { 1: buildCarousel(def.pools[1]), 2: buildCarousel(def.pools[2]), 3: buildCarousel(def.pools[3]) };
    const thinL3 = car[3].skills.length < FEED_MIN_L3_SKILLS;
    const ring = [];
    const seen = new Set();
    let l3flip = 0;
    let lastGen = null;   /* the generator that produced the item now on screen */
    /* Wave-3 blocker: the carousel round-robins skills WITHIN one pool, but each
       pool owns its own carousel, so a level change (and the level-3 alternation)
       could hand the child the same skill twice or three times running - the
       "perimeter, perimeter, perimeter" texture the dress rehearsal caught. The
       skill now on screen is remembered ACROSS pools and refused the same way a
       repeated generator is. */
    let lastSkill = null;

    function accept(q, shape, key, gen){
      if (dedup && key) seen.add(key);
      ring.push(shape);
      while (ring.length > FEED_RING) ring.shift();
      lastGen = gen;
      lastSkill = q.skill;
      return q;
    }
    function next(level){
      const want = (level === 2 || level === 3) ? level : 1;
      let use = want;
      if (want === 3 && alternateL3 && thinL3) use = (l3flip++ % 2 === 0) ? 3 : 2;
      const c = car[use];
      /* Three passes, loosening one guard at a time, because a pool with only 3
         skills fills the 3-deep shape ring in a single carousel cycle and would
         then reject EVERY candidate - including the ones that are not repeats at
         all. Pass 1 (t < FEED_RETRIES): no repeat generator, no shape from the
         last 3. Pass 2: no repeat generator. Pass 3: no exact duplicate only.
         The feed must never hang: 25% of skills in the game own exactly one stem
         shape, and a pool can be a single generator. */
      let last = null;
      const tries = dedup ? FEED_RETRIES * 2 + 500 : FEED_RETRIES * 2;
      for (let t = 0; t < tries; t++){
        const pr = carouselNext(c);
        const q = pr[0]();
        q.level = use; q.skill = pr[1];
        const shape = shapeKey(q);
        const key = dedup ? qIdentity(q) : null;
        last = { q, shape, key, gen: pr[0] };
        if (dedup && seen.has(key)) continue;                             /* exact duplicate, as before the fix */
        /* fix 2, two ways of being "the same template": the same generator as the
           item now on screen (this is the one that carries across a pool change -
           gPeri sits in pools 1, 2 AND 3), or a stem shape seen in the last 3. */
        if (t < FEED_RETRIES * 2 && pr[0] === lastGen) continue;
        if (t < FEED_RETRIES * 2 && c.skills.length > 1 && pr[1] === lastSkill) continue;
        if (t < FEED_RETRIES && ring.indexOf(shape) !== -1) continue;
        return accept(q, shape, key, pr[0]);
      }
      return accept(last.q, last.shape, last.key, last.gen);
    }
    return { next, shapeOf: shapeKey, thinL3, skillsPerPool: { 1: car[1].skills.length, 2: car[2].skills.length, 3: car[3].skills.length } };
  }

  /* Pre-generate a full quiz set with no duplicate questions across the whole run.
     Now drawn through a feed, so each pool's set is skill-round-robin ordered and
     carries the no-repeat-last-3 guard. alternateL3 is OFF here: a set built for
     level 3 must actually be level 3 (the live feed in js/app.js owns the
     alternation, because it is a serving-order rule, not a build-order one). */
  function buildSetFor(topic, perLevel){
    const set={1:[],2:[],3:[]};
    const feed=createFeed(topic,{alternateL3:false});
    for(const lvl of [1,2,3]){
      let guard=0;
      while(set[lvl].length<perLevel && guard<500){
        guard++;
        set[lvl].push(feed.next(lvl));
      }
    }
    return set;
  }

  const api = {
    gen: { ri, pick, shuffle, gcd, fr, eq, buildFracChoices, finishFrac, finishNum, finishTyped,
           gMul, EASY_TABLES, HARD_TABLES },
    parseTypedAnswer, gradeTyped, normUnit,
    topics: TOPICS,
    modes: MODES,
    registerTopic, registerMode,
    makeQuestionFor, buildSetFor, createFeed, shapeKey
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
