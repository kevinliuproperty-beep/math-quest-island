/* LAYOUT GATE - the phone-width half of the figure contract.
 *
 * `npm run test:layout` (NOT part of `npm test`: it needs a real Chrome and a real
 * HTTP server, and `npm test` must stay a pure-node gate that runs anywhere).
 *
 * What it proves, on the LIVE app, at three viewport widths (390 = iPhone 15
 * logical, 360 = small Android, 1024 = desktop control):
 *
 *   1. NO HORIZONTAL PAGE SCROLL on any screen. `document.documentElement.scrollWidth`
 *      must equal `window.innerWidth`. This is the failure the 2026-09-07 dress
 *      rehearsal filed at 390 px (bar card 450 px wide, page scrollWidth 420 vs 390).
 *   2. NO FIGURE OUTSIDE ITS CARD. Every figure's bounding box must sit inside
 *      `#qcard`. A figure that renders 78 px to the right of its card is a figure
 *      whose numbers a child cannot read.
 *   3. THE PLAY SURFACE IS WHOLE. Both fighter names, both HP bars and all four
 *      answer buttons must be fully inside the viewport, and every tap target
 *      (answer buttons, the typed-answer button, map nodes, the big CTAs) must be
 *      at least 44 px on its short side.
 *
 * It drives at least MIN_PER_TYPE items of EVERY figure type through the real
 * `?shot=q&topic=<id>` route - the same live-play route the refuter used - so the
 * seven renderers are measured as a child gets them, not on a bench page.
 *
 * Process hygiene (fleet law): this file starts ONE `python3 -m http.server` on a
 * free port and ONE headless Chrome, records both pids, and kills exactly those two
 * on the way out. It never pattern-kills.
 *
 * Requires `--experimental-websocket` (node 20's flag for the global WebSocket); the
 * npm script carries it. No npm dependency: the CDP client below is ~60 lines.
 *
 * Flags:
 *   --report=<file>   write the full measurement JSON (used by the lane's note)
 *   --shots=<dir>     also save a PNG per screen/figure/width
 *   --widths=a,b,c    override the widths
 *   --quiet           only the summary
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argOf = (n, d) => (process.argv.find(a => a.startsWith('--' + n + '=')) || '=' + d).split('=').slice(1).join('=');
/* --root=<dir> serves a DIFFERENT checkout (read-only) instead of this one, so the
   same gate can measure a control - e.g. `main` - with identical rules. */
const ROOT = path.resolve(argOf('root', path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')));
const QUIET = process.argv.includes('--quiet');
const REPORT = argOf('report', '');
const SHOTS = argOf('shots', '');
const WIDTHS = argOf('widths', '390,360,1024').split(',').map(Number);
const MIN_PER_TYPE = 3;
const MAX_TRIES = 14;

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
if (!CHROME) { console.log('FAIL  no Chrome/Chromium found - the layout gate needs a real browser'); process.exit(1); }

/* The seven figure types, the live topic each one is drawn by, and a stem substring
   that pins the `?shot=q&find=` sweep to a generator of THAT type (several topics
   mix two figure types, or mix figure and non-figure generators). Attempts
   alternate: a plain draw (pool 1, whatever comes up) and a find sweep (which lands
   in pool 3), so each type is measured in both bands. */
const FIGURE_TOPICS = [
  { type: 'bar', topic: 'p3bargraph', grade: 'P3', find: 'shown for' },
  { type: 'fractionBar', topic: 'fractions', grade: 'P3', find: 'fraction of the bar' },
  { type: 'rect', topic: 'geometry', grade: 'P3', find: 'this rectangle' },
  { type: 'lshape', topic: 'p4area', grade: 'P4', find: 'this figure' },
  { type: 'line', topic: 'p4data', grade: 'P4', find: 'line graph' },
  { type: 'table', topic: 'p4data', grade: 'P4', find: 'the table' },
  { type: 'pie', topic: 'p4pie', grade: 'P4', find: 'pie chart' }
];
/* the figure root each renderer emits, so a shot can be attributed to a type */
const FIG_SEL = {
  bar: '.bargraph', line: '.linegraph', table: '.dtable', pie: '.piechart',
  lshape: '.lfig', rect: '.rectBox', fractionBar: '.barModel'
};

/* ---------------- tiny CDP client (no dependency) ---------------- */
function freePort() {
  return new Promise(res => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.sessionId = null;
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.waiting.has(m.id)) { const w = this.waiting.get(m.id); this.waiting.delete(m.id); w(m); }
    }); }
  send(method, params = {}, useSession = true) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (useSession && this.sessionId) msg.sessionId = this.sessionId;
    this.ws.send(JSON.stringify(msg));
    return new Promise((res, rej) => this.waiting.set(id, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('cdp connect failed'))); });
  return new CDP(ws);
}

/* ---------------- the page-side probe ----------------
   Runs inside the app. Returns geometry only - never a verdict; the verdicts are
   computed in node so the failure messages live next to the thresholds. */
const PROBE = `(() => {
  const de = document.documentElement, iw = window.innerWidth;
  const nm = el => el.id ? '#' + el.id
    : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  /* The VISIBLE extent, not the laid-out one. Content inside a scroll box is clipped
     to that box on the glass, so measuring the raw rect would report the off-screen
     half of a scrolled table as "outside the viewport" when a child can simply scroll
     to it. Every ancestor whose overflow is not \`visible\` clips. */
  const vis = el => {
    let r = el.getBoundingClientRect(), l = r.left, ri = r.right, t = r.top, b = r.bottom;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      l = Math.max(l, pr.left); ri = Math.min(ri, pr.right);
      t = Math.max(t, pr.top); b = Math.min(b, pr.bottom);
    }
    return { l: +l.toFixed(1), r: +ri.toFixed(1), w: +(ri - l).toFixed(1), h: +(b - t).toFixed(1) };
  };
  const box = el => { const r = el.getBoundingClientRect();
    return { l: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const out = { innerWidth: iw, scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
                overflowers: [], hscroll: [], figure: null, card: null, ansBtns: [], names: [], hpbars: [], taps: [] };
  for (const el of document.querySelectorAll('#app *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    const v = vis(el);
    if (v.w < 1 || v.h < 1) continue;                    /* fully clipped away: not on the glass */
    if (v.r > iw + 0.5 || v.l < -0.5) out.overflowers.push(Object.assign({ sel: nm(el) }, v));
    /* A sideways scrollbar anywhere but the ONE box the figure contract allows to
       scroll (.dt-scroll, the data table) is the same defect as a scrolling page: it
       means a drawing did not fit and the child has to go looking for the rest of it.
       Only boxes that actually scroll count - an element with visible overflow reports
       a scrollWidth for anything hanging outside it (rect's breadth label, the
       L-shape's side labels) and that is by design, not a scrollbar. */
    const ox = getComputedStyle(el).overflowX;
    if (!el.classList.contains('dt-scroll') && (ox === 'auto' || ox === 'scroll')
        && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
      out.hscroll.push({ sel: nm(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
  }
  const card = document.getElementById('qcard');
  if (card && card.offsetParent !== null) out.card = box(card);
  const host = out.card ? document.getElementById('qextra') : null;   /* only when the battle card is on screen */
  const fig = host && host.firstElementChild;
  if (fig) {
    let type = null;
    for (const [t, sel] of Object.entries(${JSON.stringify(FIG_SEL)})) if (host.querySelector(sel)) type = t;
    /* .rectBox also lives inside nothing else, but .lfig would win first; order the
       check so a specific container beats a generic one */
    out.figure = Object.assign({ type, html: host.innerHTML.length }, box(fig));
    /* the drawn extent, not just the wrapper: an absolutely positioned label can
       stick out of a wrapper whose own box looks innocent. Clipped to what is
       actually on the glass, so a table scrolling inside .dt-scroll counts as the
       width of its scroll box, which is the contract. */
    let l = Infinity, r = -Infinity;
    for (const el of host.querySelectorAll('*')) {
      const b = vis(el);
      if (b.w < 1 && b.h < 1) continue;
      l = Math.min(l, b.l); r = Math.max(r, b.r);
    }
    if (isFinite(l)) { out.figure.drawnL = +l.toFixed(1); out.figure.drawnR = +r.toFixed(1); }
    out.figure.text = (host.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 400);
  }
  out.endActive = !!document.querySelector('#endScreen.active');
  out.reviewFigs = [];
  const rbox = document.getElementById('reviewBox');
  if (rbox && rbox.offsetParent !== null) {
    const rb = box(rbox);
    for (const sel of Object.values(${JSON.stringify(FIG_SEL)})) {
      for (const el of rbox.querySelectorAll(sel)) {
        let l = Infinity, r = -Infinity;
        for (const d of [el, ...el.querySelectorAll('*')]) {
          const b = vis(d);
          if (b.w < 1 && b.h < 1) continue;
          l = Math.min(l, b.l); r = Math.max(r, b.r);
        }
        if (isFinite(l)) out.reviewFigs.push({ sel, l: +l.toFixed(1), r: +r.toFixed(1), boxL: rb.l, boxR: rb.r });
      }
    }
  }
  for (const b of document.querySelectorAll('#answers .ansBtn')) out.ansBtns.push(Object.assign({ txt: b.textContent.trim() }, box(b)));
  for (const b of document.querySelectorAll('.fname')) if (b.offsetParent !== null) out.names.push(Object.assign({ txt: b.textContent.trim() }, box(b)));
  for (const b of document.querySelectorAll('.hpbar')) if (b.offsetParent !== null) out.hpbars.push(Object.assign({ sel: nm(b) }, box(b)));
  for (const b of document.querySelectorAll('.ansBtn,#typedGo,.btnBig,.mapNode,.btnGhost,.gradeBtn,.modeBtn,.tierBtn,.fameTab')) {
    if (b.offsetParent === null) continue;
    const r = b.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    out.taps.push({ sel: nm(b), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
  }
  out.stem = (document.getElementById('qtext') || {}).textContent || '';
  return out;
})()`;

/* ---------------- verdicts ---------------- */
const fails = [];
const rows = [];
function judge(label, width, m, opts = {}) {
  const row = { label, width, scrollWidth: m.scrollWidth, innerWidth: m.innerWidth,
    overflowers: m.overflowers.length, figure: m.figure ? m.figure.type : null,
    figOut: null, tapMin: null, stem: (m.stem || '').slice(0, 90) };
  const bad = [];
  if (m.scrollWidth > m.innerWidth) {
    bad.push(`page scrolls sideways: scrollWidth ${m.scrollWidth} > innerWidth ${m.innerWidth}`
      + (m.overflowers.length ? ` (worst: ${m.overflowers.map(o => `${o.sel} ${o.l}..${o.r}`).slice(0, 3).join(', ')})` : ''));
  }
  if (m.overflowers.length) {
    bad.push(`${m.overflowers.length} element(s) outside the viewport: `
      + m.overflowers.map(o => `${o.sel} ${o.l}..${o.r}`).slice(0, 4).join(', '));
  }
  if ((m.hscroll || []).length) {
    bad.push(`${m.hscroll.length} box(es) scroll sideways that must not: `
      + m.hscroll.map(o => `${o.sel} ${o.scrollWidth} > ${o.clientWidth}`).slice(0, 4).join(', '));
  }
  if (m.figure && m.card) {
    const l = m.figure.drawnL ?? m.figure.l, r = m.figure.drawnR ?? m.figure.r;
    const over = Math.max(0, +(m.card.l - l).toFixed(1), +(r - m.card.r).toFixed(1));
    row.figOut = over;
    if (over > 0.5) bad.push(`figure (${m.figure.type}) escapes its card by ${over} px: figure ${l}..${r}, #qcard ${m.card.l}..${m.card.r}`);
  }
  if (opts.battle) {
    if (m.ansBtns.length && m.ansBtns.length !== 4) bad.push(`expected 4 answer buttons, saw ${m.ansBtns.length}`);
    for (const b of m.ansBtns) if (b.l < -0.5 || b.r > m.innerWidth + 0.5) bad.push(`answer button "${b.txt}" is cut off (${b.l}..${b.r})`);
    for (const n of m.names) if (n.l < -0.5 || n.r > m.innerWidth + 0.5) bad.push(`fighter name "${n.txt}" is cut off (${n.l}..${n.r})`);
    for (const h of m.hpbars) if (h.l < -0.5 || h.r > m.innerWidth + 0.5) bad.push(`HP bar ${h.sel} is cut off (${h.l}..${h.r})`);
  }
  if (opts.review) {
    if (!m.endActive) bad.push('the end screen was never reached - the review leg measured nothing');
    else if (!m.reviewFigs.length) bad.push('the end screen carries no redrawn figure - nothing to measure');
    for (const f of m.reviewFigs || []) {
      const over = Math.max(0, +(f.boxL - f.l).toFixed(1), +(f.r - f.boxR).toFixed(1));
      if (over > 0.5) bad.push(`review figure ${f.sel} escapes its review box by ${over} px (${f.l}..${f.r} vs ${f.boxL}..${f.boxR})`);
    }
    row.reviewFigs = (m.reviewFigs || []).length;
  }
  const taps = m.taps.filter(t => t.h > 0);
  if (taps.length) {
    const worst = taps.reduce((a, b) => (b.h < a.h ? b : a));
    row.tapMin = worst.h;
    if (worst.h < 44) bad.push(`tap target ${worst.sel} is ${worst.h} px tall (< 44)`);
  }
  row.fails = bad;
  rows.push(row);
  if (bad.length) { fails.push({ label, width, bad }); if (!QUIET) for (const b of bad) console.log(`  FAIL  ${label} @ ${width}px  ${b}`); }
  else if (!QUIET) console.log(`  ok    ${label} @ ${width}px  scrollWidth ${m.scrollWidth}`
    + (row.figure ? `  ${row.figure} inside its card` : '')
    + (row.tapMin !== null ? `  min tap ${row.tapMin}px` : ''));
  return row;
}

/* ---------------- run ---------------- */
let server = null, chrome = null;
const cleanup = () => {
  for (const [name, p] of [['chrome', chrome], ['http.server', server]]) {
    if (p && p.pid && !p.killed) { try { process.kill(p.pid, 'SIGKILL'); if (!QUIET) console.log(`  (killed ${name} pid ${p.pid})`); } catch {} }
  }
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

(async () => {
  const port = await freePort();
  server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  const dbg = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mqi-layout-'));
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    `--remote-debugging-port=${dbg}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  console.log(`layout gate: http.server pid ${server.pid} on ${port}, chrome pid ${chrome.pid} on debug port ${dbg}`);

  /* wait for both to answer */
  let wsUrl = null;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    await sleep(150);
    try {
      const list = await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json();
      const pg = list.find(t => t.type === 'page');
      if (pg) wsUrl = pg.webSocketDebuggerUrl;
    } catch {}
  }
  if (!wsUrl) { console.log('FAIL  chrome never opened its debugging port'); process.exit(1); }
  for (let i = 0; i < 60; i++) { try { const r = await fetch(base + '/index.html'); if (r.ok) break; } catch {} await sleep(150); }

  const cdp = await connect(wsUrl);
  await cdp.send('Page.enable', {}, false);
  await cdp.send('Runtime.enable', {}, false);

  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const shot = async name => {
    if (!SHOTS) return;
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, false);
    fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
  };

  const setWidth = w => cdp.send('Emulation.setDeviceMetricsOverride',
    { width: w, height: w < 500 ? 844 : 900, deviceScaleFactor: 2, mobile: w < 500 }, false);

  const goto = async (url, waitFor) => {
    /* Every leg starts from a clean store. The app persists DB.gameMode, so without
       this the Patchwerk leg leaves the whole run in patchwerk mode and every later
       leg is silently measuring a boss fight (a run that never ends, so the review
       leg can never reach the end screen: 357 wrong answers at heroHp 100). Grade and
       topic come from the query string, so nothing else is lost. */
    try { await cdp.eval('localStorage.clear()'); } catch {}
    await cdp.send('Page.navigate', { url }, false);
    for (let i = 0; i < 80; i++) {
      await sleep(100);
      try { if (await cdp.eval(waitFor)) return true; } catch {}
    }
    return false;
  };

  const READY_Q = `!!(typeof Q !== 'undefined' && Q && document.getElementById('qtext').textContent.length)`;

  const measured = { byType: {}, screens: [] };

  for (const w of WIDTHS) {
    console.log(`\n=== ${w} px ===`);
    await setWidth(w);

    /* --- the page shell, screen by screen --- */
    const shells = [
      { id: 'home', url: `${base}/?shot=start&grade=P3`, wait: `!!document.querySelector('#startScreen.active .btnBig')` },
      { id: 'map', url: `${base}/?shot=map&grade=P3`, wait: `!!document.querySelector('#mapScreen.active .mapNode')` },
      { id: 'battle', url: `${base}/?shot=q&grade=P3&topic=geometry`, wait: READY_Q, battle: true },
      { id: 'patchwerk', url: `${base}/?autoplay=patchwerk&bot=1&tier=short&ms=120000&grade=P3&delay=400`, wait: READY_Q, battle: true, settle: 2500 },
      { id: 'leaderboard', url: `${base}/?shot=start&grade=P3`, wait: `!!document.getElementById('fameBtn')`, click: 'fameBtn' },
      { id: 'review', url: `${base}/?shot=q&grade=P3&topic=p3bargraph`, wait: READY_Q, review: true }
    ];
    const ONLY = argOf('only', '');
    for (const s of ONLY ? shells.filter(x => ONLY.split(',').includes(x.id)) : shells) {
      const ok = await goto(s.url, s.wait);
      if (!ok) { fails.push({ label: s.id, width: w, bad: ['screen never became ready'] }); console.log(`  FAIL  ${s.id} @ ${w}px  never became ready`); continue; }
      await sleep(s.settle || 500);
      if (s.click) { await cdp.eval(`document.getElementById(${JSON.stringify(s.click)}).click()`); await sleep(400); }
      if (s.review) {
        /* Play a real run to the end screen. The first three items are answered WRONG
           on purpose so the review box has figures to redraw, then every item is
           answered right so the run actually finishes. (Answering everything wrong
           does NOT end a run: in relaxed mode the monster never counterattacks, so
           the hero sits at 100 HP forever - 48 wrong answers, heroHp 100.) The right
           answers also carry the streak past 3, which fires the CRITICAL HIT banner. */
        await cdp.eval(`(() => { window.__n = 0; window.__loop = setInterval(() => {
            if (document.querySelector('#endScreen.active')) return;
            if (typeof Q === 'undefined' || !Q || S.busy || (typeof inputLocked === 'function' && inputLocked())) return;
            const wrong = window.__n++ < 3;
            if (Q.typed) { document.getElementById('typedInput').value = String(wrong ? (Q.answer||0)+7 : Q.answer); answerTyped(); }
            else { const i = wrong ? (Q.correct + 1) % Q.choices.length : Q.correct;
                   answer(i, document.querySelectorAll('.ansBtn')[i]); }
          }, 200); return 1; })()`);
        let ok2 = false;
        for (let i = 0; i < 420 && !ok2; i++) { await sleep(250); ok2 = await cdp.eval(`!!document.querySelector('#endScreen.active')`); }
        if (!ok2 && !QUIET) console.log(`  ..    review @ ${w}px  gave up after ${await cdp.eval('window.__n')} wrong answers, heroHp ${await cdp.eval('S && S.heroHp')}`);
        await cdp.eval(`clearInterval(window.__loop)`);
        await sleep(500);
      }
      const m = await cdp.eval(PROBE);
      judge(s.id, w, m, { battle: s.battle, review: s.review });
      measured.screens.push({ id: s.id, width: w, m });
      await shot(`${s.id}-${w}`);
    }

    /* --- every figure type, MIN_PER_TYPE live items each --- */
    const TYPES = argOf('types', '');
    for (const ft of TYPES ? FIGURE_TOPICS.filter(x => TYPES.split(',').includes(x.type)) : FIGURE_TOPICS) {
      let got = 0;
      for (let t = 0; t < MAX_TRIES && got < MIN_PER_TYPE; t++) {
        const url = `${base}/?shot=q&grade=${ft.grade}&topic=${ft.topic}`
          + (t % 2 ? '&find=' + encodeURIComponent(ft.find) : '') + `&_=${Date.now()}${t}`;
        if (!await goto(url, READY_Q)) continue;
        await sleep(650);
        const m = await cdp.eval(PROBE);
        if (!m.figure || m.figure.type !== ft.type) continue;
        got++;
        judge(`${ft.type}#${got}`, w, m, { battle: true });
        measured.byType[ft.type] = measured.byType[ft.type] || [];
        measured.byType[ft.type].push({ width: w, ...m.figure, card: m.card, scrollWidth: m.scrollWidth, innerWidth: m.innerWidth, stem: m.stem });
        if (got <= 2) await shot(`fig-${ft.type}-${w}-${got}`);
      }
      if (got < MIN_PER_TYPE) {
        fails.push({ label: ft.type, width: w, bad: [`only ${got}/${MIN_PER_TYPE} live ${ft.type} items drawn in ${MAX_TRIES} tries`] });
        console.log(`  FAIL  ${ft.type} @ ${w}px  only ${got}/${MIN_PER_TYPE} live items drawn`);
      }
    }
  }

  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ rows, fails, measured }, null, 1));

  const checked = rows.length, badRows = rows.filter(r => r.fails.length).length;
  console.log(`\n${fails.length ? 'FAILED' : 'PASSED'}  ${checked - badRows}/${checked} measured surfaces clean`
    + (fails.length ? `, ${fails.length} failure(s)` : '')
    + `  (${WIDTHS.join('/')} px; ${MIN_PER_TYPE}+ live items per figure type)`);
  cleanup(); chrome = server = null;
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAIL  ' + e.stack); cleanup(); process.exit(1); });
