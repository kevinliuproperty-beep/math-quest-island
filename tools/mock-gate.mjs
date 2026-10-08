/* MOCK-PAPER GATE - the rendered half of card X1 (Math Hardness Calibration 2026-10-07).
 *
 * `node tools/mock-gate.mjs` (NOT part of `npm test`: it needs a real Chrome and a real
 * HTTP server). It drives the LIVE app through the real `?autoplay=mock` route and the
 * exam navigator, the way Charlotte uses it, at two viewports:
 *
 *     1440x900  her laptop
 *     390x844   an iPhone, URL bar hidden
 *
 * At each viewport it starts a FULL paper and checks the navigator shows 27 questions
 * for 50 marks, the HUD names the slot value ("1 mark" / "2 marks" / "3 marks"), answers
 * three questions through the real answer path, flags one, RELOADS the page and finds
 * the same paper resumed with the answers and the flag kept, opens the hand-in check
 * (counts right), hands in, and reads a report whose denominator is 50 with a Booklet A
 * and a Booklet B box. Then a Quick (11 / 20) and a Long (35 / 80) paper once each, at
 * the laptop width, handed in straight away.
 *
 * Console: the gate fails on any console.error, uncaught exception or error-level log
 * entry, favicon 404 excepted.
 *
 * The static server is a ~30-line node server that behaves like Vercel for this app: a
 * directory path serves its index.html WITHOUT a trailing-slash redirect, so `/science`
 * and `/science/` are the same page (python's http.server 301s, which is not what the
 * deploy does). PROCESS HYGIENE (fleet law): one server in-process, ONE headless Chrome,
 * its pid recorded and killed on the way out; never a pattern-kill.
 *
 * Flags:  --root=<dir>   serve another checkout (read-only)
 *         --shots=<dir>  save a PNG at each checkpoint
 *         --quiet        only the summary
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argOf = (n, d) => (process.argv.find(a => a.startsWith('--' + n + '=')) || '=' + d).split('=').slice(1).join('=');
const ROOT = path.resolve(argOf('root', path.resolve(HERE, '..')));
const SHOTS = argOf('shots', '');
const QUIET = process.argv.includes('--quiet');

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
if (!CHROME) { console.log('FAIL  no Chrome/Chromium found - the mock gate needs a real browser'); process.exit(1); }

/* ---------------- Vercel-like static server ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
function serveStatic(root) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');   /* no redirect, as Vercel serves it */
      const data = fs.readFileSync(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); }
  });
}
function freePort() {
  return new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- tiny CDP client with events ---------------- */
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); this.events = [];
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.waiting.has(m.id)) { const w = this.waiting.get(m.id); this.waiting.delete(m.id); w(m); }
      else if (m.method) this.events.push(m);
    }); }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
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

/* ---------------- run ---------------- */
let server = null, chrome = null;
const cleanup = () => {
  if (chrome && chrome.pid) { try { process.kill(chrome.pid, 'SIGKILL'); if (!QUIET) console.log(`  (killed chrome pid ${chrome.pid})`); } catch {} chrome = null; }
  if (server) { try { server.close(); } catch {} }
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

const fails = [];
const check = (ok, label) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + label); if (!ok) fails.push(label); return ok; };

(async () => {
  const port = await freePort();
  server = serveStatic(ROOT);
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = `http://127.0.0.1:${port}`;
  const dbg = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mqi-mock-'));
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    `--remote-debugging-port=${dbg}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  console.log(`mock gate: static server on ${port} (root ${ROOT}), chrome pid ${chrome.pid} on debug port ${dbg}`);

  let wsUrl = null;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    await sleep(150);
    try { const list = await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json(); const pg = list.find(t => t.type === 'page'); if (pg) wsUrl = pg.webSocketDebuggerUrl; } catch {}
  }
  if (!wsUrl) { console.log('FAILED  chrome never opened its debugging port'); process.exit(1); }
  const r0 = await fetch(base + '/science');
  check(r0.ok && r0.status === 200 && !r0.redirected, 'static server serves /science without a trailing-slash redirect');

  const cdp = await connect(wsUrl);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Log.enable');

  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const shot = async name => {
    if (!SHOTS) return;
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
  };
  const setViewport = vp => cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.w < 500 });
  const waitFor = async (expr, tries = 80) => { for (let i = 0; i < tries; i++) { try { if (await cdp.eval(expr)) return true; } catch {} await sleep(100); } return false; };
  const goto = async (url, expr) => { await cdp.send('Page.navigate', { url }); return waitFor(expr); };

  const NAV_READY = `!!(typeof Q !== 'undefined' && Q && document.querySelector('#battleScreen.active') && document.querySelectorAll('#mkGrid .mkNum').length)`;
  const PAPER = `(() => { const a = MQI.activeMode; if (!a || a.mode.id !== 'p3-mock') return null; const p = a.mode._paper;
    return { n: p.items.length, marks: p.totalMarks, variant: p.variant, first: p.items[0].q.q, grid: document.querySelectorAll('#mkGrid .mkNum').length,
             done: document.querySelectorAll('#mkGrid .mkNum.done').length, flag: document.querySelectorAll('#mkGrid .mkNum.flag').length,
             hud: document.getElementById('modeHud').textContent, i: a.mode._i, groups: [...document.querySelectorAll('#mkGrid .mkGrp')].map(g => g.textContent).join('') }; })()`;
  /* answer the question on the paper through the real answer path (mockPick / mockTyped) */
  const ANSWER = `(() => { if (!Q || S.busy) return false; if (Q.typed) { document.getElementById('typedInput').value = String(Q.answer); answerTyped(); }
    else { answer(Q.correct, document.querySelectorAll('.ansBtn')[Q.correct]); } return true; })()`;
  const answerOne = async () => {
    const before = await cdp.eval('MQI.activeMode.mode._i');
    if (!await waitFor(ANSWER, 30)) return false;
    return waitFor(`MQI.activeMode.mode._i === ${before + 1} && !S.busy`, 30);
  };
  const handIn = async (label, wantMarks) => {
    await cdp.eval(`document.getElementById('mkHandIn').click()`);
    const open = await waitFor(`document.querySelector('#mkConfirm.on') && document.getElementById('mkCfBody').textContent.length > 0`);
    check(open, `${label}: hand-in check opens`);
    const cf = await cdp.eval(`document.getElementById('mkCfBody').textContent`);
    await shot(label + '-handin');
    await cdp.eval(`document.getElementById('mkCfGo').click()`);
    const rep = await waitFor(`!!document.querySelector('#mockScreen.active') && /\\d+ \\/ \\d+/.test(document.getElementById('mkScore').textContent)`);
    check(rep, `${label}: report screen shows`);
    const score = await cdp.eval(`document.getElementById('mkScore').textContent`);
    const secs = await cdp.eval(`[...document.querySelectorAll('#mkSections .statBox .k')].map(e => e.textContent)`);
    const noteTxt = await cdp.eval(`document.querySelector('#mockScreen .mkNote').textContent`);
    check(new RegExp('/ ' + wantMarks + '$').test(score.trim()), `${label}: report denominator is ${wantMarks} ("${score.trim()}")`);
    check(secs.includes('Booklet A') && secs.includes('Booklet B'), `${label}: report has Booklet A and Booklet B boxes (${secs.join(', ')})`);
    check(/method marks/.test(noteTxt), `${label}: report keeps the method-marks line`);
    await shot(label + '-report');
    return cf;
  };

  const consoleErrors = () => {
    const out = [];
    for (const e of cdp.events) {
      if (e.method === 'Runtime.exceptionThrown') out.push('exception: ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text));
      if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') out.push('console.error: ' + e.params.args.map(a => a.value || a.description).join(' '));
      if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error' && !/favicon/.test(e.params.entry.url || e.params.entry.text || ''))
        out.push('log: ' + e.params.entry.text + ' ' + (e.params.entry.url || ''));
    }
    return out;
  };

  for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
    const L = `full@${vp.w}x${vp.h}`;
    console.log(`\n=== Full paper @ ${vp.w} x ${vp.h} ===`);
    await setViewport(vp);
    await cdp.send('Page.navigate', { url: base + '/?shot=start&grade=P3' }); await sleep(500);
    try { await cdp.eval('localStorage.clear()'); } catch {}
    const ok = await goto(`${base}/?autoplay=mock&variant=full&grade=P3`, NAV_READY);
    if (!check(ok, `${L}: paper starts and the navigator draws`)) continue;
    await sleep(400);
    let p = await cdp.eval(PAPER);
    check(p.n === 27 && p.grid === 27, `${L}: navigator shows 27 questions (paper ${p.n}, grid ${p.grid})`);
    check(p.marks === 50, `${L}: paper is 50 marks (${p.marks})`);
    check(/Q1 of 27/.test(p.hud) && /1 mark\b/.test(p.hud), `${L}: HUD reads "Q1 of 27 · 1 mark" (${p.hud.replace(/\s+/g, ' ').trim()})`);
    check(p.groups === 'AB', `${L}: grid grouped A then B (${p.groups})`);
    await shot(L + '-start');
    let answered = 0;
    for (let k = 0; k < 3; k++) if (await answerOne()) answered++;
    check(answered === 3, `${L}: answered 3 questions through the live path (${answered})`);
    await cdp.eval(`document.getElementById('mkFlag').click()`); await sleep(200);
    p = await cdp.eval(PAPER);
    check(p.done === 3 && p.flag === 1 && p.i === 3, `${L}: grid shows 3 answered, 1 flagged, on Q4 (${p.done}/${p.flag}/Q${p.i + 1})`);
    const hud4 = p.hud.replace(/\s+/g, ' ').trim();
    check(/Q4 of 27/.test(hud4), `${L}: HUD moved to Q4 (${hud4})`);
    await shot(L + '-flagged');
    /* reload-resume: a plain load of the app puts her straight back on the same paper */
    const first = p.first;
    const back = await goto(`${base}/`, NAV_READY);
    if (check(back, `${L}: reload resumes the paper`)) {
      await sleep(400);
      const r = await cdp.eval(PAPER);
      check(r.n === 27 && r.marks === 50 && r.first === first, `${L}: the same 27-item / 50-mark paper came back`);
      check(r.done === 3 && r.flag === 1 && r.i === 3, `${L}: answers and flag survived the reload (${r.done}/${r.flag}/Q${r.i + 1})`);
      await shot(L + '-resumed');
    }
    const cf = await handIn(L, 50);
    check(/3.*of 27 answered/.test(cf.replace(/\s+/g, ' ')) && /24.*not answered/.test(cf.replace(/\s+/g, ' ')) && /1.*flagged/.test(cf.replace(/\s+/g, ' ')),
          `${L}: hand-in check counted 3 of 27 answered, 24 not answered, 1 flagged`);
    const hist = await cdp.eval(`(JSON.parse(localStorage.getItem('fq1')||'{}').mockPapers||[]).slice(-1)[0]`);
    check(hist && hist.total === 50 && hist.variant === 'full', `${L}: paper history records 50 marks, variant full`);
  }

  console.log(`\n=== Quick and Long papers @ 1440 x 900 ===`);
  await setViewport({ w: 1440, h: 900 });
  for (const [v, n, m] of [['quick', 11, 20], ['long', 35, 80]]) {
    try { await cdp.eval('localStorage.removeItem("mqi_mock_live")'); } catch {}
    const ok = await goto(`${base}/?autoplay=mock&variant=${v}&grade=P3`, NAV_READY);
    if (!check(ok, `${v}: paper starts`)) continue;
    await sleep(400);
    const p = await cdp.eval(PAPER);
    check(p.n === n && p.grid === n && p.marks === m && p.variant === v, `${v}: ${n} questions / ${m} marks in the navigator (${p.n}/${p.grid}/${p.marks})`);
    await shot(v + '-start');
    await answerOne();
    await handIn(v, m);
  }

  const errs = consoleErrors();
  check(errs.length === 0, `zero console errors apart from favicon 404 (${errs.length})`);
  errs.forEach(e => console.log('        ' + e));

  console.log(fails.length ? `\nMOCK-GATE FAILED - ${fails.length} check(s)` : '\nMOCK-GATE OK');
  cleanup();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAILED  ' + (e && e.stack || e)); cleanup(); process.exit(1); });
