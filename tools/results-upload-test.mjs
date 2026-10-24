/* Math Quest Island: mock-paper upload path test (2026-10-24).
 * Drives the REAL path a finished mock takes to the parent page, offline:
 *   js/modes/p3-mock.js (play, end) -> js/app.js outboxMockExtra + outboxMaths
 *   -> mqiOutbox.add/flush (the fetch body) -> api/results.js cleanRecord.
 * fetch is a stub that captures the body: nothing ever leaves this machine.
 * Run: node tools/results-upload-test.mjs
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const mode = require(path.join(ROOT, 'js/modes/p3-mock.js'));
const { cleanRecord } = await import(path.join(ROOT, 'api/results.js'));

let fails = 0, checks = 0;
const ok = (c, label) => { checks++; console.log((c ? '  PASS  ' : '  FAIL  ') + label); if (!c) fails++; };

/* the outbox and the mock-to-outbox helpers, exactly as js/app.js ships them */
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const a0 = app.indexOf('var mqiOutbox = (function'), a1 = app.indexOf('const AVATARS=[');
if (a0 < 0 || a1 < a0) { console.log('FAIL: could not find the outbox block in js/app.js'); process.exit(1); }
const store = new Map(), sent = [];
const ctx = {
  console, TextEncoder, crypto: globalThis.crypto, JSON, Math, Number, String, Array, Object, Date,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
  location: { protocol: 'https:', hostname: 'mqi.test' },
  navigator: { onLine: true, userAgent: 'iPad', maxTouchPoints: 5 },
  setTimeout: () => 0,                       /* flush is called by hand below */
  fetch: (url, opt) => { sent.push({ url, body: opt.body }); return new Promise(() => {}); },   /* captured, never sent */
  TOPICS: {}
};
vm.createContext(ctx);
vm.runInContext(app.slice(a0, a1) + '\nthis.mqiOutbox=mqiOutbox; this.outboxMaths=outboxMaths; this.outboxMockExtra=outboxMockExtra;', ctx, { filename: 'js/app.js (outbox block)' });

/* a small real paper through the mode: 2 MCQ (1 and 2 marks) + 1 typed (3 marks), 25 min */
const mcq = (k, a) => ({ q: 'Q' + k + ': ' + a + ' + 1 = ?', choices: [String(a + 1), String(a), String(a + 2), String(a + 3)], correct: 0, skill: 's', answerText: String(a + 1) });
const items = [
  { n: 1, section: 'A1', sectionName: 'Booklet A', kind: 'mcq', marks: 1, topic: 'p3numbers', q: mcq(1, 10) },
  { n: 2, section: 'A2', sectionName: 'Booklet A', kind: 'mcq', marks: 2, topic: 'p3money', q: mcq(2, 20) },
  { n: 3, section: 'B3', sectionName: 'Booklet B', kind: 'problem', marks: 3, topic: 'p3word',
    q: { q: 'Each bag has 159 marbles. Daryl buys 8 bags. How many altogether?', typed: true, answer: 1272, choices: [], correct: -1, skill: 'w', answerText: '1272 marbles' } }
];
const paper = { variant: 'quick', label: 'Test paper', durationMs: 25 * 60000, items, totalMarks: 6, shortSections: [] };
const m = Object.create(mode), clk = { elapsedMs: 0 };
m.start({ options: { resume: { paper, answers: [], visited: [], flags: [], i: 0, elapsedMs: 0 } } });
m.goto(clk, 0); m.record(0, { correct: false, given: '10', choice: 1 });
clk.elapsedMs = 30000; m.record(0, { correct: true, given: '11', choice: 0 });
m.goto(clk, 1); clk.elapsedMs = 50000; m.record(1, { correct: false, given: '22', choice: 2 });
m.goto(clk, 2); clk.elapsedMs = 110000;
m.submit();
const rec = m.end(clk);
rec.byTopic = rec.byTopic || [];

/* app side: the same two calls endMock makes, then the batch the outbox would POST */
ctx.outboxMaths({ mode: 'mock', topic: null, correct: 1, total: 2, ms: rec.usedMs, tally: {} }, ctx.outboxMockExtra(rec));
ctx.mqiOutbox.flush();
ok(sent.length === 1 && sent[0].url === '/api/results', 'the outbox posts one batch to /api/results (stubbed)');
const body = JSON.parse(sent[0].body), up = body.results[0];
ok(up.kind === 'paper' && up.total === 6 && up.correct === rec.marks, 'paper row in marks (' + up.correct + '/' + up.total + ')');
ok(up.timeLimitSec === 1500, 'app sends timeLimitSec (' + up.timeLimitSec + ')');
ok(up.ended === 'submit', 'app sends ended=submit (' + up.ended + ')');
ok(Array.isArray(up.review) && up.review.length === 3, 'every question in the review (' + (up.review || []).length + ')');
const r1 = up.review[0], r2 = up.review[1], r3 = up.review[2];
ok(r1.marks === 1 && r2.marks === 2 && r3.marks === 3, 'marks per row');
ok(r1.secs === 30 && r2.secs === 20 && r3.secs === 60, 'secs per row (' + [r1.secs, r2.secs, r3.secs] + ')');
ok(r1.changed === 1 && r2.changed === 0, 'changed per row (' + [r1.changed, r2.changed] + ')');
ok(Array.isArray(r1.options) && r1.options.length === 4 && r3.options === undefined, 'MCQ options sent, none on typed');

/* server side: the same body through cleanRecord keeps every field */
const out = cleanRecord(Object.assign({}, up), Date.now());
ok(out && out.timeLimitSec === 1500 && out.ended === 'submit', 'server keeps timeLimitSec + ended');
ok(out && out.review.length === 3 && out.review.every((x, i) => x.marks === up.review[i].marks && x.secs === up.review[i].secs && x.changed === up.review[i].changed),
  'server keeps marks/secs/changed on every row');
ok(out && JSON.stringify(out.review[0].options) === JSON.stringify(r1.options), 'server keeps MCQ options');

/* a paper the clock took */
const t = Object.create(mode), c2 = { elapsedMs: 0 };
t.start({ options: { resume: { paper, answers: [], visited: [], flags: [], i: 0, elapsedMs: 0 } } });
t.goto(c2, 0); c2.elapsedMs = paper.durationMs + 1;
const trec = t.tick(c2) || t.end(c2);
const ex = ctx.outboxMockExtra(trec);
ok(ex.ended === 'timeout' && cleanRecord(Object.assign({ id: up.id, device: up.device, app: 'maths', kind: 'paper', endedAt: up.endedAt }, ex), Date.now()).ended === 'timeout',
  'a timed-out paper sends and keeps ended=timeout');

console.log(fails === 0 ? 'UPLOAD TEST OK - ' + checks + ' checks passed' : 'UPLOAD TEST FAILED - ' + fails + '/' + checks);
process.exit(fails === 0 ? 0 : 1);
