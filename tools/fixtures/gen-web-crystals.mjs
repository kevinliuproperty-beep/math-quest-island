#!/usr/bin/env node
//
// RECORD THE WEB'S CRYSTAL RULE, from the real web app.
//
//   node tools/fixtures/gen-web-crystals.mjs [sessions]      (default 200)
//   node tools/fixtures/gen-web-crystals.mjs --check         (regenerate and diff)
//
// WHY THIS FILE EXISTS
// --------------------
// MQProgress used to RE-DERIVE the crystal: one on every third answer of an unbroken
// run, six to a session. The refuter measured that against 200 real sessions of the real
// game and it awarded 2.55 crystals a session where the web awards 5.38, was lower in
// 199 of 200 sessions and equal in 1, and **never once filled the six-crystal rope**
// where the web fills it 154 times out of 200 (Progress Refutation W1, 2026-09-07). The
// arithmetic is unarguable: `streak % 3 == 0` with a reset on every wrong answer needs
// 18 correct answers with no mistake between them, and a real run is 17.3 items long.
//
// So the store no longer derives it. The BATTLE reports the crystal, computed from the
// web's monster HP and crit rule, and the store bounds what it will accept. This fixture
// is the recording that proves the two agree.
//
// THE RULE, AS THE WEB STATES IT (js/app.js)
// ------------------------------------------
//   MONSTERS   = [50, 60, 70, 80, 90, 140] HP, dealing [10, 12, 12, 14, 14, 16]
//   on correct: S.streak++;  (S.rightRow>=3 && S.level<3) -> S.level++
//               crit = S.streak >= 3
//               dmg  = (18 + S.level*6 + ri(0,4)) * (crit ? 2 : 1)
//               S.mHp -= dmg;  S.mHp <= 0 -> monsterDown()
//   monsterDown: ONE crystal (S.mi++), heroHp = min(100, heroHp + 12),
//                S.mHp = MONSTERS[S.mi].hp   <- overkill NEVER carries, so one answer
//                                               can fell exactly one monster
//                S.mi >= 6 -> endGame(true), the six-crystal victory
//   on wrong:   monsterCounterattack: heroHp -= MONSTERS[S.mi].dmg + ri(0,3)
//               heroHp <= 0 -> endGame(false)
//
// METHOD (the refuter's, reused deliberately)
// -------------------------------------------
// The rule lives in `js/app.js`, which is DOM-coupled - it calls `document.getElementById`
// at module scope - so it cannot be loaded in a bare node vm. It is therefore DRIVEN, not
// restated: `python3 -m http.server` serves the repo, headless Chrome loads the real
// index.html, and every answer goes through the app's own `answer()` / `answerTyped()`.
// `setTimeout` is made synchronous so a whole run completes inside one evaluate; nothing
// else about the app is touched, and `Math.random` is replaced with a seeded mulberry32
// so the damage rolls reproduce byte for byte.
//
// The rule is ALSO pinned: this script greps `js/app.js` for the seven lines that ARE the
// rule and refuses to emit a fixture unless it finds them verbatim. Change the web's
// battle and the generator goes red naming the missing line.
//
// WHAT IS RECORDED
// ----------------
// Per session: topic, accuracy band, the event string, and one row per answer carrying
// the crystal that answer awarded (0 or 1) plus the state behind it. Per file: the
// aggregate `expect` block the Swift suite asserts against, including the three
// NodeClearedPolicy numbers, computed here from the same recorded event strings.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Node 20 hides the WebSocket global behind a flag and CDP is a WebSocket protocol.
// Re-exec ourselves with it rather than making every caller remember (this happens
// BEFORE anything is spawned, so there is nothing to clean up).
if (typeof WebSocket === 'undefined') {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath,
    ['--experimental-websocket', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(HERE, 'web-crystals-200.json');
const SESSIONS = process.argv.includes('--check') ? 200 : (parseInt(process.argv[2], 10) || 200);
const CHECK = process.argv.includes('--check');
const HTTP_PORT = 8941, CDP_PORT = 9341;
const SEED = 20260907;

// ---------------------------------------------------------------- the pin
const PINNED = [
  "{e:'🟢',name:'Gloop the Slime',hp:50,dmg:10},",
  '    const crit=S.streak>=3;',
  '    const dmg=(18+S.level*6+ri(0,4))*(crit?2:1);',
  '      if(S.mHp<=0) setTimeout(monsterDown,450);',
  '    S.mi++;',
  '    if(S.mi>=MONSTERS.length){ endGame(true); return; }',
  '  const dmg=MONSTERS[S.mi].dmg+ri(0,3);'
];
const appjs = readFileSync(join(REPO, 'js', 'app.js'), 'utf8');
for (const line of PINNED) {
  if (!appjs.includes(line)) {
    console.error('REFUSING to emit a fixture: js/app.js no longer contains the line');
    console.error('  ' + JSON.stringify(line));
    console.error('The battle rule this fixture records has changed. Read the diff, then');
    console.error('update BOTH this pin and MQProgress\'s documented formula in one commit.');
    process.exit(2);
  }
}

// ---------------------------------------------------------------- CDP
async function newPage(port, url) {
  const r = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return r.json();
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map();
  const ready = new Promise((res, rej) => { ws.onopen = () => res(); ws.onerror = e => rej(e); });
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
    }
  };
  return { ready,
    send(method, params = {}) {
      const myId = ++id;
      return new Promise((res, rej) => { pending.set(myId, { res, rej }); ws.send(JSON.stringify({ id: myId, method, params })); });
    },
    close() { ws.close(); } };
}
async function evalIn(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, allowUnsafeEvalBlockedByCSP: true });
  if (r.exceptionDetails) throw new Error('page threw: ' + JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- servers (own pids only)
const http = spawn('python3', ['-m', 'http.server', String(HTTP_PORT)], { cwd: REPO, stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'mqi-crystals-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
let cleaned = false;
function cleanup(code) {
  if (cleaned) return; cleaned = true;
  // Only the two pids this script spawned. Never a pattern kill.
  try { chrome.kill('SIGTERM'); } catch {}
  try { http.kill('SIGTERM'); } catch {}
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  if (code !== undefined) process.exit(code);
}
process.on('SIGINT', () => cleanup(130));
process.on('SIGTERM', () => cleanup(143));

try {
  await sleep(2500);
  const target = await newPage(CDP_PORT, `http://127.0.0.1:${HTTP_PORT}/index.html`);
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready; await cdp.send('Runtime.enable');

  let booted = false;
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    try { if (await evalIn(cdp, `typeof newGame==='function' && !!MQI && !!MQI.topics`)) { booted = true; break; } } catch {}
  }
  if (!booted) { console.error('the app never booted'); cleanup(2); }

  // The harness. Everything in here is scaffolding around the app; not one line of the
  // battle rule is restated.
  await evalIn(cdp, `
  window.__realT = window.setTimeout; window.__realI = window.setInterval;
  window.__installSync = function(){
    var depth = 0;
    window.setTimeout = function(fn){ if (typeof fn !== 'function') return 0;
      if (depth > 60) return window.__realT(fn, 0);
      depth++; try { fn(); } catch(e) { window.__err = String(e); } finally { depth--; } return 0; };
    window.setInterval = function(){ return 0; };
    window.clearInterval = function(){}; window.clearTimeout = function(){};
  };
  window.__restore = function(){ window.setTimeout = window.__realT; window.setInterval = window.__realI; };
  window.__mk = function(seed){ return function(){ var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t>>>15), 1|t); t = (t + Math.imul(t ^ (t>>>7), 61|t)) ^ t;
    return ((t ^ (t>>>14))>>>0)/4294967296; }; };
  window.__run = function(topicId, acc, seed, cap){
    DB.gameMode='relax'; DB.timed=false; muted = true;
    TOPIC = topicId;
    var rand = window.__mk(seed);
    Math.random = rand;
    window.__ended = null; window.__err = null;
    var origEndGame = endGame;
    window.endGame = endGame = function(win){ window.__ended = { win: !!win, mi: S.mi }; };
    window.__installSync();
    var events = '', rows = [];
    try {
      newGame();
      for (var k = 0; k < cap && !window.__ended; k++) {
        if (!Q) break;
        var want = rand() < acc;
        var before = { mi: S.mi, level: S.level, streak: S.streak, mHp: S.mHp, heroHp: S.heroHp };
        events += want ? 'c' : 'w';
        if (Q.typed) {
          var v = String(Q.answer);
          if (want && !MQI.gradeTyped(v, Q)) v = String(Q.answerText);
          document.getElementById('typedInput').value = want ? v : 'zzz';
          answerTyped();
        } else {
          var idx = want ? Q.correct : (Q.correct+1) % Q.choices.length;
          answer(idx, document.querySelectorAll('.ansBtn')[idx]);
        }
        // The crystal this ANSWER awarded. S.mi is the web's own crystal count
        // (endGame prints 'You rescued '+S.mi+' crystals'), and monsterDown is the
        // only thing that moves it.
        rows.push({ c: want ? 1 : 0, x: S.mi - before.mi,
                    lb: before.level, la: S.level, st: S.streak,
                    hp: Math.max(0, S.heroHp), mhp: Math.max(0, S.mHp) });
      }
    } catch(e) { window.__err = String(e); }
    window.__restore(); endGame = origEndGame; window.endGame = origEndGame;
    var e = window.__ended;
    return { topic: topicId, acc: acc, seed: seed, events: events, rows: rows,
             crystals: e ? e.mi : S.mi, won: e ? e.win : false, ended: !!e,
             items: events.length, err: window.__err };
  };
  'ok';`);

  const topics = ['p3numbers', 'p4numbers', 'p5numbers'];
  const runs = [];
  for (let i = 0; i < SESSIONS; i++) {
    const acc = +(0.50 + (i % 10) * 0.05).toFixed(2);
    const t = topics[i % topics.length];
    const r = await evalIn(cdp, `__run(${JSON.stringify(t)}, ${acc}, ${SEED + i * 7919}, 400)`);
    if (r.err) { console.error('run', i, 'threw in the page:', r.err); cleanup(3); }
    if (!r.ended) { console.error('run', i, 'never reached an ending'); cleanup(3); }
    runs.push(r);
  }
  cdp.close();

  // ------------------------------------------------------------- expectations
  // Computed HERE, from the recorded event strings, so the Swift suite asserts against
  // a number this file can regenerate rather than against a constant somebody typed.
  const EVIDENCE_FLOOR = 4, MASTERED = 0.80;      // the web's parent report: n>=4, pct>=80
  function masteryClearedCount(nSkills) {
    let cleared = 0;
    for (const r of runs) {
      const att = new Array(nSkills).fill(0), cor = new Array(nSkills).fill(0);
      // Items dealt ROUND ROBIN across the node's skills, the refuter's own model.
      for (let i = 0; i < r.events.length; i++) {
        const s = i % nSkills;
        att[s]++; if (r.events[i] === 'c') cor[s]++;
      }
      let all = true;
      for (let s = 0; s < nSkills; s++) {
        if (!(att[s] >= EVIDENCE_FLOOR && cor[s] / att[s] >= MASTERED)) { all = false; break; }
      }
      if (all) cleared++;
    }
    return cleared;
  }
  const crystals = runs.map(r => r.crystals);
  const perAnswerMax = Math.max(...runs.flatMap(r => r.rows.map(x => x.x)));
  const doc = {
    generatedBy: 'tools/fixtures/gen-web-crystals.mjs',
    method: 'the real js/app.js driven in headless Chrome through its own answer()/answerTyped()',
    seed: SEED,
    pinnedLines: PINNED,
    sessions: runs.length,
    expect: {
      // Design call 1 - crystals.
      meanCrystals: +(crystals.reduce((a, b) => a + b, 0) / crystals.length).toFixed(4),
      ropeFilled: crystals.filter(c => c >= 6).length,
      maxCrystalsPerAnswer: perAnswerMax,
      meanItems: +(runs.reduce((a, r) => a + r.items, 0) / runs.length).toFixed(2),
      // Design call 2 - NodeClearedPolicy, over the same 200 sessions.
      webVictories: runs.filter(r => r.won).length,
      masteryCleared: { 2: masteryClearedCount(2), 3: masteryClearedCount(3),
                        4: masteryClearedCount(4), 7: masteryClearedCount(7) }
    },
    runs
  };

  const json = JSON.stringify(doc);
  if (CHECK) {
    if (!existsSync(OUT)) { console.error('no committed fixture at ' + OUT); cleanup(1); }
    const same = readFileSync(OUT, 'utf8') === json;
    console.log(same ? 'web-crystals-200.json is what today\'s js/app.js produces'
                     : 'DIFFERS from the committed fixture - the battle rule changed');
    cleanup(same ? 0 : 1);
  }
  writeFileSync(OUT, json);
  console.log(JSON.stringify(doc.expect, null, 1));
  console.log('wrote ' + OUT + '  (' + runs.length + ' sessions)');
  cleanup(0);
} catch (e) {
  console.error(e);
  cleanup(4);
}
