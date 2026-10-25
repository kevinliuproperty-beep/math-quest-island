/* Math Quest Island: science practice upload path test (2026-10-25).
 * Drives the REAL science outbox code, offline:
 *   science/index.html outboxScience + sciReview + qclock -> mqiOutbox.add/flush (the fetch body)
 *   -> api/results.js cleanRecord.
 * fetch is a stub that captures the body: nothing ever leaves this machine.
 * Run: node tools/science-practice-upload-test.mjs
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { cleanRecord } = await import(path.join(ROOT, 'api/results.js'));

let fails = 0, checks = 0;
const ok = (c, label) => { checks++; console.log((c ? '  PASS  ' : '  FAIL  ') + label); if (!c) fails++; };

const html = fs.readFileSync(path.join(ROOT, 'science/index.html'), 'utf8');
const a0 = html.indexOf('var mqiOutbox = (function'), a1 = html.indexOf('/* hinted: she used the nudge');
if (a0 < 0 || a1 < a0) { console.log('FAIL: could not find the outbox block in science/index.html'); process.exit(1); }
const store = new Map(), sent = [];
let now = Date.UTC(2026, 9, 25, 4, 0, 0);
const FakeDate = class extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
const ctx = {
  console, TextEncoder, crypto: globalThis.crypto, JSON, Math, Number, String, Array, Object, Date: FakeDate,
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
  location: { protocol: 'https:', hostname: 'mqi.test' },
  navigator: { onLine: true, userAgent: 'iPad', maxTouchPoints: 5 },
  setTimeout: () => 0,
  fetch: (url, opt) => { sent.push({ url, body: opt.body }); return Promise.resolve({ ok: true, status: 200 }); },
  SCI: { byId: { magnets: { title: 'Magnets' } } },
  nudgeText: it => (it.hints && it.hints.length ? it.hints[0] : it.steps ? it.steps[0] : '')
};
vm.createContext(ctx);
vm.runInContext(html.slice(a0, a1) + '\nthis.mqiOutbox=mqiOutbox; this.outboxScience=outboxScience; this.qclock=qclock;', ctx, { filename: 'science/index.html (outbox block)' });

/* a 4-question practice round: right first time; right on the 2nd try; wrong twice (rung 2 shown);
   OEQ with the hint button, 1 of 2 ticks. A 5th question she never reached. */
const mcq = (id, hints) => ({ id, topic: 'magnets', type: 'mcq', stem: 'Which pole is ' + id + '?', options: ['North', 'South', 'Neither', 'Both'], answer: 0, hints });
const items = [
  mcq('a', ['Look at the arrow.', 'The arrow points away from N.']),
  mcq('b', ['Like poles repel.', 'So the end that repels N is N.']),
  mcq('c', ['Think about attraction.', 'Unlike poles attract, so it is N.']),
  { id: 'd', topic: 'magnets', type: 'oeq', stem: 'Why does the nail stick to the magnet?', marks: 2, model: 'Iron is a magnetic material.', keys: ['iron', 'magnetic'], hints: ['Which material is the nail made of?'] },
  mcq('e', ['x', 'y'])
];
const ans = [
  { choice: 0, score: 1, miss1: null },
  { choice: 0, score: 0.5, miss1: 2 },
  { choice: 1, score: 0, miss1: 2 },
  { text: 'it is iron', ticks: [true, false], score: 0.5, shown: true, hint1: true },
  { choice: null, score: null, miss1: null }
];
const se = { kind: 'practice', title: 'Magnets', topicId: 'magnets', items, ans, i: 0, t0: now };
const secs = [12, 40, 25, 70];
secs.forEach((s, i) => { se.i = i; ctx.qclock(se); now += s * 1000; });
se.i = 3;
ctx.outboxScience(se);
ctx.mqiOutbox.flush();

ok(sent.length === 1 && sent[0].url === '/api/results', 'the outbox posts one batch to /api/results (stubbed)');
const up = JSON.parse(sent[0].body).results[0];
ok(up.kind === 'quest' && up.mode === 'practice' && up.correct === 2 && up.total === 5, 'quest row 2/5 (every item in the round counts, as before) (' + up.correct + '/' + up.total + ')');
ok(up.hintsUsed === 3, 'hintsUsed counts the 3 hinted questions (' + up.hintsUsed + ')');
ok(Array.isArray(up.review) && up.review.length === 4, 'review has the 4 questions reached, not the 5th (' + (up.review || []).length + ')');
const [r1, r2, r3, r4] = up.review;
ok(r1.correct && r1.got === 1 && r1.marks === 1 && r1.hintsShown === 0 && !r1.hints && !r1.first, 'Q1 right first time, no hints');
ok(!r2.correct && r2.got === 0.5 && r2.first === '(3) Neither' && r2.changed === 1 && r2.given === '(1) North', 'Q2 half on the 2nd try, first try kept');
ok(r2.hintsShown === 1 && r2.hints[0] === 'Like poles repel.', 'Q2 saw the nudge only');
ok(r3.got === 0 && r3.hintsShown === 2 && r3.hints[1] === 'Unlike poles attract, so it is N.', 'Q3 wrong twice: nudge + worked line');
ok(r4.got === 0.5 && r4.hintsShown === 1 && r4.hints[0] === 'Which material is the nail made of?' && r4.given === 'it is iron' && !r4.options, 'Q4 OEQ hint button, half marks');
ok(r1.secs === 12 && r2.secs === 40 && r3.secs === 25 && r4.secs === 70, 'secs per question (' + up.review.map(x => x.secs) + ')');
ok(r1.q === 'Which pole is a?' && Array.isArray(r1.options) && r1.options.length === 4, 'stem as plain text, MCQ options sent');

const out = cleanRecord(Object.assign({}, up), now);
ok(out && Array.isArray(out.review) && out.review.length === 4, 'server keeps a quest review');
ok(out && out.review.every((x, i) => x.got === up.review[i].got && x.hintsShown === up.review[i].hintsShown && x.secs === up.review[i].secs),
  'server keeps got / hintsShown / secs on every row');
ok(out && JSON.stringify(out.review[2].hints) === JSON.stringify(r3.hints) && out.review[1].first === r2.first, 'server keeps hint text + first try');
const bad = cleanRecord(Object.assign({}, up, { review: [Object.assign({}, r2, { got: 3, hintsShown: 9, hints: ['ok', 5] })] }), now);
ok(bad && bad.review.length === 1 && bad.review[0].got === undefined && bad.review[0].hintsShown === undefined && bad.review[0].hints === undefined,
  'bad optional values drop the field, keep the row');
ok(JSON.stringify(out).length < 6000, 'stored row stays small (' + JSON.stringify(out).length + ' bytes)');

/* a paper still goes through, with marks per row and no practice fields */
await new Promise(r => setImmediate(r)); sent.length = 0; store.clear();
const pse = { kind: 'exam', items: [Object.assign({}, items[0], { marks: 2 }), items[3]], ans: [{ choice: 1, score: 0 }, { text: '', ticks: [true, true], score: 1 }], i: 0, t0: now };
ctx.outboxScience(pse); ctx.mqiOutbox.flush();
const pp = JSON.parse(sent[0].body).results[0];
ok(pp.kind === 'paper' && pp.review.length === 2 && pp.review[0].marks === 2 && pp.review[0].got === undefined && pp.review[0].hintsShown === undefined, 'paper review: marks, no practice fields');
ok(cleanRecord(Object.assign({}, pp), now).review.length === 2, 'server keeps the paper review');

console.log(fails === 0 ? 'SCIENCE UPLOAD TEST OK - ' + checks + ' checks passed' : 'SCIENCE UPLOAD TEST FAILED - ' + fails + '/' + checks);
process.exit(fails === 0 ? 0 : 1);
