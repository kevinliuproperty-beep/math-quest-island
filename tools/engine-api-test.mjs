/* Node-side gate for the engine bundle and its MQI_API surface.
 *
 * This is the PARITY half of the bridge gate: ios/Packages/MQEngineJS's Swift tests
 * make the same calls through JavaScriptCore, so anything that passes here and fails
 * there (or the reverse) is a bridge bug, not a content bug. Both sides assert the
 * same numbers - topic count, generator count, per-generator draws, self-key grading -
 * against the SAME dist/engine.bundle.js.
 *
 * It also proves the committed bundle is not stale: the payload hash embedded in the
 * bundle must equal the hash of a fresh in-memory build (tools/build-engine.mjs
 * --check). A bundle built from an older js/topics/*.js would otherwise ship to iOS
 * silently.
 *
 * Run:  node tools/engine-api-test.mjs     (or: npm test)
 *       DRAWS=200 (default 40 here; the Swift gate is the one that does 200)
 * Exit: 0 all green, 1 on any failure.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* The COMMITTED bundle is the Swift package resource (dist/ is gitignored build output),
   so that is what this harness loads by default - it must test what actually ships. */
const BUNDLE = process.env.MQI_ENGINE_BUNDLE
  || path.join(ROOT, 'ios/Packages/MQEngineJS/Sources/MQEngineJS/Resources/engine.bundle.js');
const DRAWS = Number(process.env.DRAWS) || 40;

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log('  FAIL  ' + msg); } };
const section = s => console.log('\n' + s);

/* ---------- 0. freshness ---------- */
section('freshness');
try {
  execFileSync(process.execPath, [path.join(ROOT, 'tools/build-engine.mjs'), '--check'], { stdio: 'pipe' });
  ok(true, 'bundle fresh');
  console.log('  ok    dist/ and ios/ bundles match a fresh build of js/');
} catch (e) {
  fails++; checks++;
  console.log('  FAIL  engine bundle is STALE - run `npm run build:engine`');
  console.log(String(e.stdout || '') + String(e.stderr || ''));
}

/* ---------- 1. load the bundle the way JavaScriptCore does ----------
   A bare context: no window, no document, no require, no module. Whatever the
   bundle needs beyond the ECMAScript built-ins, its own host shim must provide. */
section('load');
const bundleSrc = fs.readFileSync(BUNDLE, 'utf8');
const ctx = Object.create(null);
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(bundleSrc, ctx, { filename: 'engine.bundle.js' });
const API = ctx.MQI_API;
ok(!!API, 'MQI_API defined after evaluating the bundle');
ok(typeof ctx.window === 'undefined', 'no window leaked into the context');
ok(typeof ctx.document === 'undefined', 'no document leaked into the context');
for (const m of ['listTopics', 'nextQuestion', 'grade', 'explain', 'build']) {
  ok(typeof API[m] === 'function', 'MQI_API.' + m + ' is a function');
}
const call = (m, a) => {
  const raw = a === undefined ? API[m]() : API[m](JSON.stringify(a));
  ok(typeof raw === 'string', m + '() returns a string');
  const r = JSON.parse(raw);
  if (!r.ok) { fails++; checks++; console.log('  FAIL  ' + m + ' -> ' + r.error.message + '\n' + r.error.stack); }
  return r;
};

/* ---------- 2. build stamp ---------- */
section('build()');
const b = call('build').build;
const stampInFile = (bundleSrc.match(/\/\* ENGINE_BUILD ([^\s*]+) \*\//) || [])[1];
ok(!!stampInFile, 'the bundle file carries an ENGINE_BUILD line');
ok(b.stamp === stampInFile, 'build().stamp "' + b.stamp + '" == the file stamp "' + stampInFile + '"');
ok(b.topicCount === 28, 'build().topicCount == 28 (got ' + b.topicCount + ')');
ok(b.generatorCount > 0, 'build().generatorCount > 0 (got ' + b.generatorCount + ')');
console.log('  ok    ' + b.stamp + '  topics ' + b.topicCount + '  pool entries ' + b.generatorCount +
            '  distinct generators ' + b.distinctGenerators);

/* ---------- 3. listTopics ---------- */
section('listTopics()');
const lt = call('listTopics');
ok(lt.count === 28, 'listTopics().count == 28 (got ' + lt.count + ')');
ok(lt.generatorCount === b.generatorCount, 'generator count agrees with build() (' + lt.generatorCount + ')');
const refs = [];
for (const t of lt.topics) {
  ok(t.id.length > 0 && t.level.length > 0 && t.moeSubTopic.length > 0, t.id + ': id/level/moeSubTopic present');
  ok(t.skills.length > 0, t.id + ': has skills');
  ok(t.poolSizes['1'] > 0 && t.poolSizes['2'] > 0 && t.poolSizes['3'] > 0, t.id + ': all three pools non-empty');
  const skillIds = new Set(t.skills.map(s => s.id));
  for (const g of t.generators) {
    ok(skillIds.has(g.skill), t.id + ': generator ' + g.ref + ' references a declared skill');
    refs.push(g.ref);
  }
}
ok(refs.length === b.generatorCount, 'every pool entry got a ref (' + refs.length + ')');
console.log('  ok    28 topics, ' + refs.length + ' generator refs');

/* ---------- 4. every generator: draw, grade its own key, grade a wrong answer ---------- */
section('per-generator draws (' + DRAWS + ' each, ' + refs.length + ' generators)');
let drawn = 0, graded = 0;
const wrongTypedFor = q => {
  const a = Number(q.key.answer);
  const bump = Number.isFinite(a) ? a + 1 : 0;
  return q.unit ? (bump + ' ' + q.unit) : String(bump);
};
for (const ref of refs) {
  const r = call('nextQuestion', { generator: ref, count: DRAWS });
  if (!r.ok) continue;
  ok(r.questions.length === DRAWS, ref + ': drew ' + DRAWS);
  const items = [];
  for (const q of r.questions) {
    drawn++;
    if (!q.stem.length) { fails++; checks++; console.log('  FAIL  ' + ref + ': empty stem'); break; }
    if (q.kind === 'choice') {
      if (q.choices.length !== 4 || q.correctIndex < 0 || q.correctIndex > 3) {
        fails++; checks++; console.log('  FAIL  ' + ref + ': bad choice shape'); break;
      }
      items.push({ question: q, answer: { choice: q.correctIndex } });
      items.push({ question: q, answer: { choice: (q.correctIndex + 1) % 4 } });
    } else {
      if (!Number.isFinite(Number(q.key.answer))) {
        fails++; checks++; console.log('  FAIL  ' + ref + ': typed question with a non-finite answer'); break;
      }
      items.push({ question: q, answer: { text: String(q.key.answer) } });
      items.push({ question: q, answer: { text: wrongTypedFor(q) } });
    }
  }
  const g = call('grade', { items });
  if (!g.ok) continue;
  for (let i = 0; i < g.verdicts.length; i += 2) {
    graded += 2;
    if (g.verdicts[i].correct !== true) {
      fails++; checks++;
      console.log('  FAIL  ' + ref + ': own key graded INCORRECT (' + JSON.stringify(g.verdicts[i]) + ')');
      break;
    }
    if (g.verdicts[i + 1].correct !== false) {
      fails++; checks++;
      console.log('  FAIL  ' + ref + ': a deliberately wrong answer graded CORRECT');
      break;
    }
  }
}
checks++;
console.log('  ok    ' + drawn + ' questions drawn, ' + graded + ' gradings, all keys self-consistent');

/* ---------- 5. typed units behave as js/app.js's grader does ---------- */
section('typed grading parity (the Wave-2 unit kill)');
const unitQ = {
  id: 'unit-fixture', topic: 'p4area', kind: 'typed', choices: [], correctIndex: -1,
  answerText: '113 cm2', answerTextPlain: '113 cm2', unit: 'cm2',
  key: { typed: true, correct: -1, answer: 113, unit: 'cm2' }
};
const cases = [
  ['113', true, 'bare number accepted'],
  ['113 cm2', true, 'declared unit accepted'],
  ['113 cm²', true, 'unicode superscript accepted via the alias table'],
  ['113 cm', false, 'WRONG unit rejected (the "113 cm" vs cm2 kill)'],
  ['114', false, 'wrong value rejected'],
  ['', false, 'empty string rejected'],
  ['  113  ', true, 'surrounding whitespace tolerated']
];
for (const [text, want, why] of cases) {
  const v = call('grade', { question: unitQ, answer: { text } }).verdict;
  ok(v.correct === want, 'typed "' + text + '" -> ' + want + ' : ' + why);
}
const moneyQ = { id: 'money', topic: 'p3money', kind: 'typed', choices: [], correctIndex: -1,
  answerText: '$4.75', answerTextPlain: '$4.75', unit: '', key: { typed: true, correct: -1, answer: 4.75 } };
ok(call('grade', { question: moneyQ, answer: { text: '$4.75' } }).verdict.correct === true, 'money "$4.75" accepted');
ok(call('grade', { question: moneyQ, answer: { text: '4' } }).verdict.correct === false, 'money "4" (the parseInt bug) rejected');
const fracQ = { id: 'frac', topic: 'p3fractions', kind: 'typed', choices: [], correctIndex: -1,
  answerText: '3/4', answerTextPlain: '3/4', unit: '', key: { typed: true, correct: -1, answer: 0.75, fracAnswer: [3, 4] } };
ok(call('grade', { question: fracQ, answer: { text: '6/8' } }).verdict.correct === true, 'fraction "6/8" reduces to 3/4');
ok(call('grade', { question: fracQ, answer: { text: '0.75' } }).verdict.correct === true, 'decimal "0.75" matches 3/4');

/* ---------- 6. feed sessions ---------- */
section('feed sessions');
const feedTopic = 'geometry';
const f1 = call('nextQuestion', { topic: feedTopic, level: 3, session: 'parity-a', count: 30 });
ok(f1.questions.length === 30, 'a session feed draws 30');
let sameSkillRun = 1, worstSkillRun = 1;
for (let i = 1; i < f1.questions.length; i++) {
  sameSkillRun = (f1.questions[i].skill === f1.questions[i - 1].skill) ? sameSkillRun + 1 : 1;
  worstSkillRun = Math.max(worstSkillRun, sameSkillRun);
}
ok(worstSkillRun <= 3, 'worst same-skill run through the API feed <= 3 (got ' + worstSkillRun + ')');
ok(call('endSession', { session: 'parity-a' }).ended.length === 1, 'endSession retires the session');

/* ---------- 7. explain ---------- */
section('explain()');
const eq = call('nextQuestion', { topic: 'tables', level: 1 }).question;
const ex = call('explain', { question: eq }).explanation;
ok(ex.topic === 'tables', 'explanation carries the topic');
ok(ex.text.length > 0 || ex.html.length > 0, 'explanation is non-empty');
ok(ex.answerTextPlain.length > 0, 'explanation carries the plain answer text');
ok(typeof ex.skillTip === 'string', 'explanation carries the parent skill tip');

/* ---------- 8. error envelope ---------- */
section('error envelope');
const bad1 = JSON.parse(API.nextQuestion(JSON.stringify({ topic: 'no-such-topic' })));
ok(bad1.ok === false && /unknown topic/.test(bad1.error.message), 'unknown topic -> ok:false with a message');
ok(typeof bad1.error.stack === 'string', 'error envelope carries a JS stack');
const bad2 = JSON.parse(API.nextQuestion(JSON.stringify({ generator: 'geometry/9/0' })));
ok(bad2.ok === false, 'a malformed generator ref -> ok:false');
const bad3 = JSON.parse(API.grade(JSON.stringify({})));
ok(bad3.ok === false, 'grade with no question -> ok:false');

/* ---------- report ---------- */
console.log('\n' + (fails ? 'FAILED ' : 'PASSED ') + (checks - fails) + '/' + checks + ' checks');
process.exit(fails ? 1 : 0);
