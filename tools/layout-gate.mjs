/* LAYOUT GATE - the rendered half of the figure contract.
 *
 * `npm run test:layout` (NOT part of `npm test`: it needs a real Chrome and a real
 * HTTP server, and `npm test` must stay a pure-node gate that runs anywhere).
 *
 * It drives the LIVE app through the real `?shot=` routes at six viewports - and
 * viewports here are WIDTH x HEIGHT, because half the defects this gate exists to
 * catch are vertical:
 *
 *     390x664   iPhone 15 logical width, Safari's visible area WITH the URL bar
 *     390x844   the same phone, URL bar hidden (the device height)
 *     375x548   iPhone SE / 8, with the URL bar
 *     360x640   small Android
 *     320x568   iPhone SE 1st gen - the narrowest screen still in the wild
 *     1024x900  desktop control
 *
 * WHAT IT FAILS ON
 *
 *  1. HORIZONTAL. `documentElement.scrollWidth > innerWidth`, OR any element LAID
 *     OUT outside the viewport that a child cannot scroll to. Both clauses matter and
 *     the second one is the one with teeth - see the vis()/raw() note in PROBE. The
 *     previous version of this file measured VISIBLE extent only, clipped to `body`,
 *     whose computed overflow-x is `hidden` and whose box IS the viewport: every rect
 *     was clamped to 0..innerWidth and the check could not fire in either direction.
 *     It passed 4/4 clean with the HUD hanging 80 px off the left edge.
 *  2. VERTICAL. No figure may paint over the play surface: a fighter name, a sprite,
 *     an HP bar, an HP number, an answer button or the typed-answer row. At 390x664
 *     the pie used to draw 97 px past its card, through both HP numbers and 55 px
 *     into the answer buttons.
 *  3. READABILITY. The smallest EFFECTIVE on-glass font size in a figure - declared
 *     size times the SVG scale it is drawn at - must be >= 11 px at any width >= 360,
 *     and >= 10 px at 320. A drawing whose labels shrink under reading size has lost
 *     the value as surely as one that pushes it off the screen.
 *  4. THE SCROLL ALLOWANCE. `.fig-scroll` is the only box in the app allowed to
 *     scroll sideways, and when it HAS more content off its right edge its `.fig-more`
 *     cue must be drawn and must cover the full height of the scroll box (the header
 *     row included).
 *  5. THE BANNER COVERS NOTHING. Sampled live while banners are up: `#banner .inner`
 *     may not intersect #qtext, a fighter name, an HP bar, an HP number, a sprite or
 *     an answer button, and may not leave the viewport.
 *  6. THE PLAY SURFACE IS WHOLE. Both fighter names, both HP bars and all four answer
 *     buttons fully inside the viewport; every tap target at least 44 px.
 *  7. IT MEASURED SOMETHING. Zero measured surfaces is a FAILURE, always; a `--only`
 *     or `--types` filter that matches nothing names the flag and exits non-zero; and
 *     an unfiltered run must clear the floor recorded in `tools/layout-floor.txt`.
 *     (This is verbatim the kill `ios/test.command` records in its own header - a
 *     filtered run that matches nothing reporting green - and it was re-committed
 *     here on flags this repo's README documents.)
 *
 * SAMPLING. MIN_PER_TYPE (5) random live items of every figure type at every
 * viewport, in both difficulty bands, PLUS one deliberately widest spec per type
 * pushed through the live `MQI.renderFigure`. Random draws alone are a lottery: the
 * "remove the table's cap" mutation went red on 2 of 3 tables and green on the third,
 * because only ~68% of table specs are wide enough to expose it at 390 px.
 *
 * PROCESS HYGIENE (fleet law): this file starts ONE `python3 -m http.server` on a
 * free port and ONE headless Chrome, records both pids, and kills exactly those two
 * on the way out. It never pattern-kills.
 *
 * ONE HARNESS TRAP WORTH KEEPING (and one that was WRONG and is struck):
 *   - REAL: the app persists `DB.gameMode`, so a Patchwerk leg leaves every later leg
 *     silently inside a boss fight - a run that never ends, because Patchwerk hides
 *     the arena HP bars and never drains hero HP. Every leg below clears
 *     localStorage first.
 *   - STRUCK: this file used to state that "in relaxed mode the monster never
 *     counterattacks, so the hero sits at 100 HP forever". It does counterattack:
 *     `resolve()` calls `monsterCounterattack()` on every wrong answer in every
 *     non-Patchwerk mode for 10..19 damage, and nine wrong answers measured
 *     100 -> 88 -> 77 -> 64 -> 52 -> 42 -> 32 -> 20 -> 8 -> -3, end screen "So close,
 *     Hero!". The 48- and 357-wrong-answer observations that produced that claim were
 *     the REAL trap leaking. There is no "a child can never lose in relaxed mode"
 *     defect. (Phone Width Refutation wound 5.)
 *
 * Requires `--experimental-websocket` (node 20's flag for the global WebSocket); the
 * npm script carries it. No npm dependency: the CDP client below is ~60 lines.
 *
 * Flags:
 *   --report=<file>      write the full measurement JSON
 *   --shots=<dir>        also save a PNG per screen/figure/viewport (at 1x - a shot
 *                        read at deviceScaleFactor 2 makes a 7.9 px glyph look like
 *                        15.8 px, which is how the label kill got graded "pass")
 *   --viewports=390x664,375x548,...   override the viewport list
 *   --widths=a,b,c       widths only; each gets its default height from HEIGHT_FOR
 *   --only=<screen ids>  measure only these screens
 *   --types=<figure types>
 *   --quiet              only the summary
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argOf = (n, d) => (process.argv.find(a => a.startsWith('--' + n + '=')) || '=' + d).split('=').slice(1).join('=');
const hasFlag = n => process.argv.some(a => a === '--' + n || a.startsWith('--' + n + '='));
/* --root=<dir> serves a DIFFERENT checkout (read-only) instead of this one, so the
   same gate can measure a control - e.g. `main` - with identical rules. */
const ROOT = path.resolve(argOf('root', path.resolve(HERE, '..')));
const QUIET = process.argv.includes('--quiet');
const REPORT = argOf('report', '');
const SHOTS = argOf('shots', '');
const FLOOR_FILE = path.join(HERE, 'layout-floor.txt');

/* Realistic viewports. The height is the one iOS Safari actually gives a page, not
   the device height - `w < 500 ? 844 : 900` was the old rule and no iPhone gives
   Safari 844 px of page while the URL bar is showing. */
const DEFAULT_VIEWPORTS = [
  { w: 390, h: 664 }, { w: 390, h: 844 }, { w: 375, h: 548 },
  { w: 360, h: 640 }, { w: 320, h: 568 }, { w: 1024, h: 900 }
];
const HEIGHT_FOR = { 320: 568, 360: 640, 375: 548, 390: 664, 414: 716, 430: 739 };
const ONLY = argOf('only', '');
const TYPES = argOf('types', '');
/* The floor in tools/layout-floor.txt is PER VIEWPORT, so it still bites on a run that
   narrows the viewport list (which is how its own regression test stays cheap). Only a
   --only/--types filter, which deliberately measures a subset of the surfaces, turns it
   off - and that path has its own guard: a filter matching nothing exits non-zero. */
const FILTERED = hasFlag('only') || hasFlag('types');

let VIEWPORTS = DEFAULT_VIEWPORTS;
if (hasFlag('viewports')) {
  VIEWPORTS = argOf('viewports', '').split(',').filter(Boolean)
    .map(s => { const [w, h] = s.split('x').map(Number); return { w, h: h || HEIGHT_FOR[w] || (w < 500 ? 664 : 900) }; });
} else if (hasFlag('widths')) {
  VIEWPORTS = argOf('widths', '').split(',').filter(Boolean)
    .map(Number).map(w => ({ w, h: HEIGHT_FOR[w] || (w < 500 ? 664 : 900) }));
}

const MIN_PER_TYPE = 5;
const MAX_TRIES = 22;
/* Apple's HIG floor for readable text is 11 pt. 320 px is the one screen where the
   drawing may go a point under it rather than scroll. */
const FONT_FLOOR = w => (w <= 320 ? 10 : 11);

/* ONE KNOWN GAP, FENCED RATHER THAN EXEMPTED.
   `line`'s viewBox is 380 px wide - wider than a phone card - so `max-width:100%`
   scales the whole drawing, its 11 px tick numbers included, before any of this
   packet's rules apply. These are the numbers `main` @ cb2220b draws, measured with
   this same probe (6 live items per width, zero variance): the branch must be no
   WORSE than main at every width, and any regression fails. It is not a pass: it is
   a recorded gap, printed in the summary of every run, and it closes by redrawing
   `line` the way `bar` was redrawn (a narrower plot and HTML labels), which is its
   own packet - the change would move the desktop line graph, which this packet's
   remit does not cover. */
const FONT_KNOWN = { line: { 320: 6.83, 360: 7.99, 375: 8.42, 390: 8.86, 414: 9.55, 430: 10.02, 1024: 11 } };

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
if (!CHROME) { console.log('FAIL  no Chrome/Chromium found - the layout gate needs a real browser'); process.exit(1); }

/* The seven figure types, the live topic each one is drawn by, and a stem substring
   that pins the `?shot=q&find=` sweep to a generator of THAT type. Attempts
   alternate a plain draw (pool 1) with a find sweep (pool 3), so each type is
   measured in both bands. `wide` is the deliberately worst-case spec of that type,
   pushed through the live renderer alongside the random draws. */
const FIGURE_TOPICS = [
  { type: 'bar', topic: 'p3bargraph', grade: 'P3', find: 'shown for',
    wide: { type: 'bar', title: 'Sandwiches sold at the school canteen last Wednesday', scale: 5, maxUnit: 10, unitLabel: 'sandwiches',
      cats: ['Chrysanthemum tea', 'Wholemeal bread', 'Bandung', 'Barley water', 'Milo dinosaur'], units: [10, 7, 4, 9, 2] } },
  { type: 'fractionBar', topic: 'fractions', grade: 'P3', find: 'fraction of the bar',
    wide: { type: 'fractionBar', total: 12, filled: 7 } },
  { type: 'rect', topic: 'geometry', grade: 'P3', find: 'this rectangle',
    wide: { type: 'rect', length: 40, breadth: 3, unit: 'cm' } },
  { type: 'lshape', topic: 'p4area', grade: 'P4', find: 'this figure',
    wide: { type: 'lshape', W: 16, H: 14, a: 7, b: 6, unit: 'cm' } },
  { type: 'line', topic: 'p4data', grade: 'P4', find: 'line graph',
    wide: { type: 'line', title: 'Ice cream cones sold at the beach stall each month', step: 10, maxUnit: 10, unitLabel: 'cones',
      cats: ['January', 'February', 'March', 'April', 'May', 'June'], units: [3, 7, 2, 10, 5, 8] } },
  { type: 'table', topic: 'p4data', grade: 'P4', find: 'the table',
    wide: { type: 'table', title: 'Library books borrowed each day last week', unitLabel: 'books', hidden: 5,
      cats: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], values: [11, 6, 14, 9, 12, 8] } },
  { type: 'pie', topic: 'p4pie', grade: 'P4', find: 'pie chart',
    wide: { type: 'pie', title: 'Fruit the Primary 4 pupils brought to school', caption: 'The pie chart shows the fruit brought to school.',
      cats: ['Chrysanthemum', 'Watermelon', 'Dragonfruit', 'Mangosteen', 'Rambutan'],
      weights: [12, 9, 8, 6, 4], labels: ['12', '9', '8', '6', '4'] } }
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
  const de = document.documentElement, iw = window.innerWidth, ih = window.innerHeight;
  const nm = el => el.id ? '#' + el.id
    : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const box = el => { const r = el.getBoundingClientRect();
    return { l: +r.left.toFixed(1), r: +r.right.toFixed(1), t: +r.top.toFixed(1), b: +r.bottom.toFixed(1),
             w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };

  /* K1. TWO measurements, and the difference between them is the whole kill.

     vis(el) is the VISIBLE extent: the rect intersected with every ancestor that
     really clips. Content a child can scroll to is not "lost", so this is the right
     measurement for "did the drawing escape its card".

     BUT: index.html gives body { overflow:hidden }. With html's overflow visible that
     declaration is PROPAGATED TO THE VIEWPORT - the body box itself does not clip -
     while getComputedStyle(document.body).overflowX still reads 'hidden' and the
     body's border box is exactly the viewport. Treating it as a clipper clamped every
     element on the page to 0..innerWidth, which made BOTH viewport checks
     (v.r > iw, v.l < -0.5) arithmetically unreachable. Measured on main at 390 px with
     .bargraph laid out -30..420: 15 raw overflowers, 0 visible ones. So body is
     skipped as a clipper, and raw geometry is measured beside it.

     raw overflow is only a defect if the child cannot get to it: an element inside a
     box that ACTUALLY scrolls sideways is reachable by scrolling, which is the one
     allowance the figure contract makes (.fig-scroll). Everything else that is laid
     out off the viewport under body{overflow:hidden} is simply gone - which is what a
     left-hand overflow always is, since it never grows scrollWidth in any browser. */
  const bodyClips = getComputedStyle(document.documentElement).overflowX !== 'visible';
  const vis = el => {
    let r = el.getBoundingClientRect(), l = r.left, ri = r.right, t = r.top, b = r.bottom;
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p === document.body && !bodyClips) continue;
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      l = Math.max(l, pr.left); ri = Math.min(ri, pr.right);
      t = Math.max(t, pr.top); b = Math.min(b, pr.bottom);
    }
    return { l: +l.toFixed(1), r: +ri.toFixed(1), t: +t.toFixed(1), b: +b.toFixed(1),
             w: +(ri - l).toFixed(1), h: +(b - t).toFixed(1) };
  };
  const reachable = el => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p === document.body) continue;
      const ox = getComputedStyle(p).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
    }
    return false;
  };

  const out = { innerWidth: iw, innerHeight: ih, scrollWidth: de.scrollWidth,
                bodyScrollWidth: document.body.scrollWidth,
                overflowers: [], rawOverflowers: [], hscroll: [], cues: [],
                figure: null, card: null, ansBtns: [], names: [], hpbars: [], protect: [], taps: [] };
  for (const el of document.querySelectorAll('#app *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    const v = vis(el);
    if (v.w >= 1 && v.h >= 1 && (v.r > iw + 0.5 || v.l < -0.5))
      out.overflowers.push(Object.assign({ sel: nm(el) }, v));
    if ((r.right > iw + 0.5 || r.left < -0.5) && !reachable(el))
      out.rawOverflowers.push(Object.assign({ sel: nm(el) }, box(el)));
    /* A sideways scrollbar anywhere but .fig-scroll - the one box the figure contract
       allows to scroll - is the same defect as a scrolling page. Only boxes that
       ACTUALLY scroll count: an element with visible overflow reports a scrollWidth
       for anything hanging outside it (rect's breadth label, the L-shape's side
       labels) and that is by design. */
    const ox = getComputedStyle(el).overflowX;
    if (!el.classList.contains('fig-scroll') && (ox === 'auto' || ox === 'scroll')
        && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
      out.hscroll.push({ sel: nm(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
  }
  /* the scroll cue: when a .fig-scroll box HAS more content off its right edge, its
     .fig-more must be drawn, and drawn over the full height of the box - the header
     row included, which is exactly what the old background-shadow could not do. */
  for (const fr of document.querySelectorAll('.fig-frame')) {
    const sc = fr.querySelector('.fig-scroll'), more = fr.querySelector('.fig-more');
    if (!sc) continue;
    const scroll = sc.scrollWidth > sc.clientWidth + 1;
    const mb = more ? box(more) : null;
    const shown = !!(more && getComputedStyle(more).display !== 'none' && mb.w >= 1 && mb.h >= 1);
    out.cues.push({ sel: fr.parentElement ? nm(fr.parentElement) : 'fig-frame', scroll,
      dataMore: fr.getAttribute('data-more'), shown, cue: mb, boxH: +sc.getBoundingClientRect().height.toFixed(1) });
  }

  const card = document.getElementById('qcard');
  if (card && card.offsetParent !== null) out.card = box(card);
  /* the vertical twin of the same rule: when the drawing cannot fit the card at all
     (a five-row bar graph on a 375 x 548 SE) it scrolls inside #qextra, and the cue
     that says so must be drawn. Without the cue this is silent truncation. */
  const qx = document.getElementById('qextra'), qf = document.getElementById('qextraFrame'), qm = document.getElementById('qmore');
  if (qx && qf && qx.offsetParent !== null) {
    out.qmore = { scroll: qx.scrollHeight > qx.clientHeight + 1, dataMore: qf.getAttribute('data-more'),
      shown: !!(qm && getComputedStyle(qm).display !== 'none' && qm.getBoundingClientRect().width >= 1) };
  }
  const host = out.card ? document.getElementById('qextra') : null;   /* only when the battle card is on screen */
  const fig = host && host.firstElementChild;
  if (fig) {
    let type = null;
    for (const [t, sel] of Object.entries(${JSON.stringify(FIG_SEL)})) if (host.querySelector(sel)) type = t;
    out.figure = Object.assign({ type, html: host.innerHTML.length }, box(fig));
    /* the DRAWN extent, in both axes: an absolutely positioned label can stick out of
       a wrapper whose own box looks innocent. Clipped to what is actually on the
       glass, so a table scrolling inside .fig-scroll counts as its scroll box. */
    let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
    for (const el of host.querySelectorAll('*')) {
      const v = vis(el);
      if (v.w < 1 && v.h < 1) continue;
      l = Math.min(l, v.l); r = Math.max(r, v.r); t = Math.min(t, v.t); b = Math.max(b, v.b);
    }
    if (isFinite(l)) { out.figure.drawnL = +l.toFixed(1); out.figure.drawnR = +r.toFixed(1);
                       out.figure.drawnT = +t.toFixed(1); out.figure.drawnB = +b.toFixed(1); }
    out.figure.text = (host.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 400);
    /* K4. EFFECTIVE on-glass font size = the declared size times the scale the element
       is actually drawn at. Inside a viewBox svg those differ: the first phone-width
       pass declared 13 px and 11 px and painted them at 7.90 px and 6.68 px on a
       390 px screen, because a viewBox scales the words along with the picture. This
       reads the same number a child's eye gets. */
    out.fonts = [];
    for (const el of host.querySelectorAll('*')) {
      let txt = '';
      for (const n of el.childNodes) if (n.nodeType === 3) txt += n.nodeValue;
      if (!txt.trim()) continue;
      const v = vis(el);
      if (v.w < 1 || v.h < 1) continue;
      let scale = 1;
      if (typeof el.getScreenCTM === 'function') {
        const m = el.getScreenCTM();
        if (m) scale = Math.hypot(m.a, m.b) || 1;
      }
      const declared = parseFloat(getComputedStyle(el).fontSize) || 0;
      out.fonts.push({ sel: nm(el), declared: +declared.toFixed(2), scale: +scale.toFixed(3),
        eff: +(declared * scale).toFixed(2), txt: txt.trim().slice(0, 18) });
    }
  }
  /* what a figure may never paint over */
  for (const sel of ['.fname', '.hpbar', '.hptext', '.sprite', '#answers', '#typedWrap']) {
    for (const el of document.querySelectorAll(sel)) {
      if (el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      out.protect.push(Object.assign({ sel: nm(el) }, box(el)));
    }
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
  /* K3. The banner, if one is up right now, plus everything it may not cover. */
  const bn = document.getElementById('banner'), inner = document.querySelector('#banner .inner');
  out.banner = null;
  if (bn && inner && getComputedStyle(bn).display !== 'none') {
    const r = box(inner);
    if (r.w >= 1 && r.h >= 1) out.banner = Object.assign({ txt: (inner.textContent || '').trim().slice(0, 40) }, r);
  }
  out.stem = (document.getElementById('qtext') || {}).textContent || '';
  const qt = document.getElementById('qtext');
  out.qtext = qt && qt.offsetParent !== null ? box(qt) : null;
  return out;
})()`;

/* The live banner sampler. Installed once per leg; samples every 40 ms while a
   banner is up, counts distinct firings, and accumulates the WORST overlap seen
   against everything a banner may not cover. Sampling matters: `bannerIn` animates a
   scale overshoot, so a single measurement can miss the frame at which the box is
   biggest. */
const BANNER_SAMPLER = `(() => {
  const B = window.__mqBanner = { firings: 0, samples: 0, hits: {}, worstOut: 0, last: '', texts: [] };
  const box = el => { const r = el.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  const over = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5
                      && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
  B.timer = setInterval(() => {
    const bn = document.getElementById('banner'), inner = document.querySelector('#banner .inner');
    if (!bn || !inner || getComputedStyle(bn).display === 'none') { B.last = ''; return; }
    const txt = (inner.textContent || '').trim();
    if (txt && txt !== B.last) { B.firings++; B.last = txt; if (B.texts.length < 40) B.texts.push(txt); }
    const r = box(inner);
    if (r.w < 1 || r.h < 1) return;
    B.samples++;
    B.worstOut = Math.max(B.worstOut, 0 - r.l, r.r - window.innerWidth, 0 - r.t, r.b - window.innerHeight);
    for (const sel of ['#qtext', '.fname', '.hpbar', '.hptext', '.sprite', '#answers .ansBtn']) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.offsetParent === null) continue;
        const q = box(el);
        if (q.w < 1 || q.h < 1) continue;
        if (over(r, q)) B.hits[sel] = (B.hits[sel] || 0) + 1;
      }
    }
  }, 40);
  return 1;
})()`;

/* ---------------- verdicts ---------------- */
const fails = [];
const rows = [];
const knownGaps = [];
const inter = (a, b) => Math.min(a.r ?? a.right, b.r) - Math.max(a.l, b.l) > 0.5
                     && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;

function judge(label, vp, m, opts = {}) {
  const iw = m.innerWidth;
  const row = { label, width: vp.w, height: vp.h, scrollWidth: m.scrollWidth, innerWidth: iw,
    overflowers: m.overflowers.length, rawOverflowers: (m.rawOverflowers || []).length,
    figure: m.figure ? m.figure.type : null, figOut: null, figDown: null, minFont: null,
    tapMin: null, stem: (m.stem || '').slice(0, 90) };
  const bad = [];

  /* 1. horizontal */
  if (m.scrollWidth > iw) {
    bad.push(`page scrolls sideways: scrollWidth ${m.scrollWidth} > innerWidth ${iw}`
      + (m.overflowers.length ? ` (worst: ${m.overflowers.map(o => `${o.sel} ${o.l}..${o.r}`).slice(0, 3).join(', ')})` : ''));
  }
  if (m.overflowers.length) {
    bad.push(`${m.overflowers.length} element(s) visibly outside the viewport: `
      + m.overflowers.map(o => `${o.sel} ${o.l}..${o.r}`).slice(0, 4).join(', '));
  }
  if ((m.rawOverflowers || []).length) {
    bad.push(`${m.rawOverflowers.length} element(s) laid out outside the viewport and unreachable `
      + `(clipped away by body{overflow:hidden}): `
      + m.rawOverflowers.map(o => `${o.sel} ${o.l}..${o.r}`).slice(0, 4).join(', '));
  }
  if ((m.hscroll || []).length) {
    bad.push(`${m.hscroll.length} box(es) scroll sideways that must not: `
      + m.hscroll.map(o => `${o.sel} ${o.scrollWidth} > ${o.clientWidth}`).slice(0, 4).join(', '));
  }

  /* 4. the scroll allowance and its cue */
  for (const c of m.cues || []) {
    if (!c.scroll) continue;
    if (!c.shown || c.dataMore !== '1')
      bad.push(`${c.sel}: the scroll box has more content off its right edge and no .fig-more cue is drawn `
        + `(data-more=${c.dataMore})`);
    else if (c.cue.h < c.boxH - 1)
      bad.push(`${c.sel}: the scroll cue is ${c.cue.h} px tall in a ${c.boxH} px scroll box - `
        + `it does not cover the header row`);
  }
  if (m.qmore && m.qmore.scroll && (!m.qmore.shown || m.qmore.dataMore !== '1'))
    bad.push(`#qextra scrolls vertically and no "more" cue is drawn (data-more=${m.qmore.dataMore}) - `
      + `the drawing is silently truncated`);

  /* 2. the figure, in both axes */
  if (m.figure && m.card) {
    const l = m.figure.drawnL ?? m.figure.l, r = m.figure.drawnR ?? m.figure.r;
    const t = m.figure.drawnT ?? m.figure.t, b = m.figure.drawnB ?? m.figure.b;
    const over = Math.max(0, +(m.card.l - l).toFixed(1), +(r - m.card.r).toFixed(1));
    row.figOut = over;
    row.figDown = Math.max(0, +(m.card.t - t).toFixed(1), +(b - m.card.b).toFixed(1));
    if (over > 0.5) bad.push(`figure (${m.figure.type}) escapes its card sideways by ${over} px: figure ${l}..${r}, #qcard ${m.card.l}..${m.card.r}`);
    const figBox = { l, r, t, b };
    for (const p of m.protect || []) {
      if (inter(figBox, p)) {
        bad.push(`figure (${m.figure.type}) paints over ${p.sel}: figure ${t}..${b} vertically, ${p.sel} ${p.t}..${p.b}`);
        break;
      }
    }
  }

  /* 3. readability */
  if (m.figure && (m.fonts || []).length) {
    const worst = m.fonts.reduce((a, x) => (x.eff < a.eff ? x : a));
    row.minFont = worst.eff;
    const floor = FONT_FLOOR(vp.w);
    const known = (FONT_KNOWN[m.figure.type] || {})[vp.w];
    if (worst.eff < floor - 0.01) {
      const detail = `smallest label in the ${m.figure.type} is ${worst.eff} px on the glass `
        + `(${worst.sel} "${worst.txt}": declared ${worst.declared} px at scale ${worst.scale}) - the floor at ${vp.w} px is ${floor} px`;
      if (known === undefined) bad.push(detail);
      else if (worst.eff < known - 0.05) bad.push(detail + `, and main draws it at ${known} px - this is a REGRESSION`);
      else { row.knownGap = known; knownGaps.push({ type: m.figure.type, width: vp.w, eff: worst.eff, known }); }
    }
  }

  /* 6. the play surface */
  if (opts.battle) {
    if (m.ansBtns.length && m.ansBtns.length !== 4) bad.push(`expected 4 answer buttons, saw ${m.ansBtns.length}`);
    for (const b of m.ansBtns) if (b.l < -0.5 || b.r > iw + 0.5) bad.push(`answer button "${b.txt}" is cut off (${b.l}..${b.r})`);
    for (const n of m.names) if (n.l < -0.5 || n.r > iw + 0.5) bad.push(`fighter name "${n.txt}" is cut off (${n.l}..${n.r})`);
    for (const h of m.hpbars) if (h.l < -0.5 || h.r > iw + 0.5) bad.push(`HP bar ${h.sel} is cut off (${h.l}..${h.r})`);
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

  /* 5. a banner caught in the act by the ordinary probe */
  if (m.banner) {
    const b = m.banner;
    if (b.l < -0.5 || b.r > iw + 0.5 || b.t < -0.5 || b.b > m.innerHeight + 0.5)
      bad.push(`banner "${b.txt}" leaves the viewport (${b.l}..${b.r} x ${b.t}..${b.b} in ${iw}x${m.innerHeight})`);
    const covers = [];
    if (m.qtext && inter(b, m.qtext)) covers.push('#qtext');
    for (const p of m.protect || []) if (inter(b, p) && !covers.includes(p.sel)) covers.push(p.sel);
    for (const a of m.ansBtns || []) if (inter(b, a)) { covers.push('an answer button'); break; }
    if (covers.length) bad.push(`banner "${b.txt}" covers ${covers.slice(0, 4).join(', ')}`);
  }

  const taps = m.taps.filter(t => t.h > 0);
  if (taps.length) {
    const worst = taps.reduce((a, b) => (b.h < a.h ? b : a));
    row.tapMin = worst.h;
    if (worst.h < 44) bad.push(`tap target ${worst.sel} is ${worst.h} px tall (< 44)`);
  }
  row.fails = bad;
  rows.push(row);
  if (bad.length) { fails.push({ label, width: vp.w, height: vp.h, bad }); if (!QUIET) for (const b of bad) console.log(`  FAIL  ${label} @ ${vp.w}x${vp.h}  ${b}`); }
  else if (!QUIET) console.log(`  ok    ${label} @ ${vp.w}x${vp.h}  scrollWidth ${m.scrollWidth}`
    + (row.figure ? `  ${row.figure} inside its card, min label ${row.minFont} px` : '')
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

const bail = msg => { console.log('FAILED  ' + msg); cleanup(); process.exit(1); };

(async () => {
  /* K2, first half: a filter that matches nothing must never reach the browser and
     report green. Name the flag, say what is valid, exit non-zero. */
  const SHELL_IDS = ['home', 'map', 'battle', 'patchwerk', 'leaderboard', 'review', 'banner'];
  if (ONLY) {
    const want = ONLY.split(',').filter(Boolean);
    const unknown = want.filter(x => !SHELL_IDS.includes(x));
    if (unknown.length || !want.length)
      bail(`--only=${ONLY} matches no screen. Valid ids: ${SHELL_IDS.join(', ')}`);
  }
  if (TYPES) {
    const want = TYPES.split(',').filter(Boolean);
    const known = FIGURE_TOPICS.map(f => f.type);
    const unknown = want.filter(x => !known.includes(x));
    if (unknown.length || !want.length)
      bail(`--types=${TYPES} matches no figure type. Valid types: ${known.join(', ')}`);
  }
  if (!VIEWPORTS.length || VIEWPORTS.some(v => !v.w || !v.h))
    bail(`--viewports/--widths produced no usable viewport`);

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
  if (!wsUrl) { console.log('FAILED  chrome never opened its debugging port'); cleanup(); process.exit(1); }
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

  /* deviceScaleFactor 1: the shots this gate saves are the shots a lane reads, and a
     2x shot doubles every glyph. That is how 7.90 px labels were graded "pass". */
  const setViewport = vp => cdp.send('Emulation.setDeviceMetricsOverride',
    { width: vp.w, height: vp.h, deviceScaleFactor: 1, mobile: vp.w < 500 }, false);

  const goto = async (url, waitFor) => {
    /* Every leg starts from a clean store. The app persists DB.gameMode, so without
       this a Patchwerk leg leaves every later leg silently inside a boss fight. */
    try { await cdp.eval('localStorage.clear()'); } catch {}
    await cdp.send('Page.navigate', { url }, false);
    for (let i = 0; i < 80; i++) {
      await sleep(100);
      try { if (await cdp.eval(waitFor)) return true; } catch {}
    }
    return false;
  };

  const READY_Q = `!!(typeof Q !== 'undefined' && Q && document.getElementById('qtext').textContent.length)`;

  const measured = { byType: {}, screens: [], banner: [] };

  for (const vp of VIEWPORTS) {
    console.log(`\n=== ${vp.w} x ${vp.h} px ===`);
    await setViewport(vp);

    /* --- the page shell, screen by screen --- */
    const shells = [
      { id: 'home', url: `${base}/?shot=start&grade=P3`, wait: `!!document.querySelector('#startScreen.active .btnBig')` },
      { id: 'map', url: `${base}/?shot=map&grade=P3`, wait: `!!document.querySelector('#mapScreen.active .mapNode')` },
      { id: 'battle', url: `${base}/?shot=q&grade=P3&topic=geometry`, wait: READY_Q, battle: true },
      { id: 'patchwerk', url: `${base}/?autoplay=patchwerk&bot=1&tier=short&ms=120000&grade=P3&delay=400`, wait: READY_Q, battle: true, settle: 2500 },
      { id: 'leaderboard', url: `${base}/?shot=start&grade=P3`, wait: `!!document.getElementById('fameBtn')`, click: 'fameBtn' },
      { id: 'review', url: `${base}/?shot=q&grade=P3&topic=p3bargraph`, wait: READY_Q, review: true },
      { id: 'banner', url: `${base}/?shot=q&grade=P3&topic=geometry`, wait: READY_Q, battle: true, banner: true }
    ];
    for (const s of ONLY ? shells.filter(x => ONLY.split(',').includes(x.id)) : shells) {
      const ok = await goto(s.url, s.wait);
      if (!ok) { fails.push({ label: s.id, width: vp.w, height: vp.h, bad: ['screen never became ready'] }); console.log(`  FAIL  ${s.id} @ ${vp.w}x${vp.h}  never became ready`); continue; }
      await sleep(s.settle || 500);
      if (s.click) { await cdp.eval(`document.getElementById(${JSON.stringify(s.click)}).click()`); await sleep(400); }
      if (s.review) {
        /* Play a real run to the end screen. The first three items are answered WRONG
           on purpose so the review box has figures to redraw, then every item is
           answered right so the run finishes. (Wrong answers DO cost the hero HP in
           every non-Patchwerk mode - see the struck trap in this file's header - so a
           run of pure wrong answers ends too, in a loss with no correct items to
           learn from; this leg wants a victory with three wrongs in the review box.) */
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
        if (!ok2 && !QUIET) console.log(`  ..    review @ ${vp.w}x${vp.h}  gave up after ${await cdp.eval('window.__n')} answers, heroHp ${await cdp.eval('S && S.heroHp')}`);
        await cdp.eval(`clearInterval(window.__loop)`);
        await sleep(500);
      }
      if (s.banner) {
        /* K3, proved rather than asserted. 20 CRITICAL HIT banners driven by REAL
           play - a streak of 3 correct answers arms the crit, and every correct
           answer after that fires one - plus 5 ENRAGE banners fired through the same
           banner() the Patchwerk mode calls, with the mode's own theme attribute set
           so the enrage styling is the one being measured. The sampler runs at 40 ms
           throughout, so the scale overshoot in `bannerIn` is measured too. */
        await cdp.eval(BANNER_SAMPLER);
        await cdp.eval(`(() => { window.__loop = setInterval(() => {
            if (typeof Q === 'undefined' || !Q || !S || S.busy || (typeof inputLocked === 'function' && inputLocked())) return;
            if (Q.typed) { document.getElementById('typedInput').value = String(Q.answer); answerTyped(); }
            else answer(Q.correct, document.querySelectorAll('.ansBtn')[Q.correct]);
          }, 150); return 1; })()`);
        for (let i = 0; i < 200; i++) {
          await sleep(250);
          const n = await cdp.eval(`window.__mqBanner.texts.filter(t => /CRITICAL HIT/.test(t)).length`);
          const crits = await cdp.eval(`window.__mqBanner.firings`);
          if (n >= 1 && crits >= 22) break;
          if (await cdp.eval(`!!document.querySelector('#endScreen.active')`)) {
            await cdp.eval(`document.getElementById('againBtn').click()`); await sleep(900);
          }
        }
        await cdp.eval(`clearInterval(window.__loop)`);
        const critFirings = await cdp.eval(`window.__mqBanner.firings`);
        for (let i = 0; i < 5; i++) {
          await cdp.eval(`(() => { document.body.setAttribute('data-mode-theme','mode-patchwerk enraged');
            banner('<b>ENRAGE!</b> Damage x2 - finish strong.', 700); return 1; })()`);
          await sleep(900);
        }
        await cdp.eval(`document.body.removeAttribute('data-mode-theme')`);
        const B = await cdp.eval(`(() => { clearInterval(window.__mqBanner.timer);
          const b = window.__mqBanner; return { firings: b.firings, samples: b.samples, hits: b.hits,
            worstOut: +b.worstOut.toFixed(1), texts: b.texts.slice(0, 12), crits: ${critFirings} }; })()`);
        measured.banner.push({ width: vp.w, height: vp.h, ...B });
        const bad = [];
        if (B.firings < 25) bad.push(`only ${B.firings} banner firings driven (wanted >= 25: 20 CRITICAL HIT + 5 ENRAGE)`);
        if (!B.samples) bad.push('the banner sampler never caught a banner on the glass');
        const hit = Object.entries(B.hits || {});
        if (hit.length) bad.push(`the banner crossed ${hit.map(([k, v]) => `${k} on ${v} samples`).join(', ')}`);
        if (B.worstOut > 0.5) bad.push(`the banner left the viewport by ${B.worstOut} px`);
        rows.push({ label: 'banner-drive', width: vp.w, height: vp.h, fails: bad,
          firings: B.firings, samples: B.samples });
        if (bad.length) { fails.push({ label: 'banner-drive', width: vp.w, height: vp.h, bad }); for (const x of bad) console.log(`  FAIL  banner-drive @ ${vp.w}x${vp.h}  ${x}`); }
        else if (!QUIET) console.log(`  ok    banner-drive @ ${vp.w}x${vp.h}  ${B.firings} firings, ${B.samples} samples, 0 crossings, 0 px outside`);
        await shot(`banner-${vp.w}x${vp.h}`);
        continue;   /* the drive IS this leg's verdict */
      }
      const m = await cdp.eval(PROBE);
      judge(s.id, vp, m, { battle: s.battle, review: s.review });
      measured.screens.push({ id: s.id, width: vp.w, height: vp.h, m });
      await shot(`${s.id}-${vp.w}x${vp.h}`);
    }

    /* --- every figure type: MIN_PER_TYPE live items, then its widest known spec --- */
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
        judge(`${ft.type}#${got}`, vp, m, { battle: true });
        measured.byType[ft.type] = measured.byType[ft.type] || [];
        measured.byType[ft.type].push({ width: vp.w, height: vp.h, ...m.figure, card: m.card, scrollWidth: m.scrollWidth, innerWidth: m.innerWidth, stem: m.stem });
        if (got <= 2) await shot(`fig-${ft.type}-${vp.w}x${vp.h}-${got}`);
      }
      if (got < MIN_PER_TYPE) {
        fails.push({ label: ft.type, width: vp.w, height: vp.h, bad: [`only ${got}/${MIN_PER_TYPE} live ${ft.type} items drawn in ${MAX_TRIES} tries`] });
        console.log(`  FAIL  ${ft.type} @ ${vp.w}x${vp.h}  only ${got}/${MIN_PER_TYPE} live items drawn`);
      }
      /* the deliberate worst case, through the live renderer on a live battle screen.
         Random draws are a lottery: the prescribed "remove the table's cap" mutation
         went red on 2 of 3 tables and green on the third. */
      if (await goto(`${base}/?shot=q&grade=${ft.grade}&topic=${ft.topic}&_=w${Date.now()}`, READY_Q)) {
        await cdp.eval(`(() => { document.getElementById('qextra').innerHTML =
          MQI.renderFigure(${JSON.stringify(ft.wide)}); return 1; })()`);
        await sleep(400);
        const m = await cdp.eval(PROBE);
        judge(`${ft.type}#wide`, vp, m, { battle: true });
        await shot(`wide-${ft.type}-${vp.w}x${vp.h}`);
      }
    }
  }

  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ rows, fails, measured }, null, 1));

  const checked = rows.length, badRows = rows.filter(r => r.fails.length).length;

  /* K2, second half. A gate that measured nothing is not a pass - and an UNFILTERED
     run must additionally clear the floor recorded beside this file, so a future
     change that quietly stops drawing half the surfaces cannot slip through green. */
  if (!checked) {
    console.log('FAILED  0 surfaces measured - a gate that measured nothing is not a pass'
      + ' (check --only= / --types= / --viewports= / --widths=)');
    cleanup(); process.exit(1);
  }
  let floorNote = '';
  if (!FILTERED) {
    const per = Number((fs.existsSync(FLOOR_FILE) ? fs.readFileSync(FLOOR_FILE, 'utf8') : '').match(/\d+/)?.[0] || 0);
    if (!per) {
      console.log(`FAILED  tools/layout-floor.txt carries no per-viewport surface floor - this run cannot be trusted`);
      cleanup(); process.exit(1);
    }
    const floor = per * VIEWPORTS.length;
    if (checked < floor) {
      console.log(`FAILED  ${checked} surfaces measured, below the floor of ${floor}`
        + ` (${per}/viewport x ${VIEWPORTS.length} viewports, tools/layout-floor.txt)`
        + ` - the gate stopped drawing surfaces it used to draw`);
      cleanup(); process.exit(1);
    }
    floorNote = `, floor ${floor} cleared (${per}/viewport)`;
  }

  if (knownGaps.length) {
    const by = {};
    for (const g of knownGaps) (by[`${g.type} @ ${g.width}px`] ||= []).push(g.eff);
    console.log(`\nKNOWN GAPS (fenced at main's own number, not exempted):`);
    for (const [k, v] of Object.entries(by))
      console.log(`  ${k}  smallest label ${Math.min(...v)} px, main ${FONT_KNOWN[k.split(' ')[0]][Number(k.match(/(\d+)px/)[1])]} px, ${v.length} surfaces`);
  }

  console.log(`\n${fails.length ? 'FAILED' : 'PASSED'}  ${checked - badRows}/${checked} measured surfaces clean`
    + (fails.length ? `, ${fails.length} failure(s)` : '')
    + floorNote
    + `  (${VIEWPORTS.map(v => v.w + 'x' + v.h).join(', ')}; ${MIN_PER_TYPE} live items + 1 widest spec per figure type)`);
  cleanup(); chrome = server = null;
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAILED  ' + e.stack); cleanup(); process.exit(1); });
