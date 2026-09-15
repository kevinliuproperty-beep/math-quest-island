/* NODE half of the grading parity gate.
 *
 * Re-grades every pair in tools/fixtures/parity-corpus.json against the COMMITTED
 * engine bundle and asserts the verdict matches the recorded one, field by field.
 *
 * ios/Packages/MQEngineJS/Tests/MQEngineJSTests/ParityCorpusTests.swift does exactly
 * the same thing through JavaScriptCore, against the same file. Both sides matching
 * the same expectations IS pairwise agreement: no pair can be green here and red there,
 * or graded differently by the two runtimes, without one of these two harnesses going
 * red and naming the pair.
 *
 * This is the permanent form of the refuter's kill 2 - a typed fraction whose reduced
 * numerator exceeded Int64 threw in Swift and returned a normal verdict in node. The
 * corpus carries that answer (edge `kill2-huge-numerator`) and ~10,000 of its
 * relatives.
 *
 * Run:  node tools/parity-test.mjs     (part of npm test)
 * Exit: 0 all green, 1 on any divergence.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = process.env.MQI_ENGINE_BUNDLE
  || path.join(ROOT, 'ios/Packages/MQEngineJS/Sources/MQEngineJS/Resources/engine.bundle.js');
const CORPUS = path.join(ROOT, 'tools/fixtures/parity-corpus.json');

if (!fs.existsSync(CORPUS)) {
  console.log('FAIL  tools/fixtures/parity-corpus.json is missing.');
  console.log('      It is a COMMITTED fixture, not a build output. Regenerate with:');
  console.log('      node tools/make-parity-corpus.mjs');
  process.exit(1);
}

const corpus = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));

const ctx = Object.create(null);
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), ctx, { filename: 'engine.bundle.js' });
const API = ctx.MQI_API;
if (!API) { console.log('FAIL  the bundle did not define MQI_API'); process.exit(1); }

const call = (m, a) => {
  const r = JSON.parse(a === undefined ? API[m]() : API[m](JSON.stringify(a)));
  if (!r.ok) throw new Error(m + ': ' + r.error.message);
  return r;
};

console.log('\nparity corpus');
const build = call('build').build;
console.log('  corpus  ' + corpus.counts.pairs + ' pairs over ' + corpus.counts.questions + ' questions'
  + '  (wide ' + corpus.counts.wide + ', fuzz ' + corpus.counts.fuzz + ', edge ' + corpus.counts.edge + ')');
console.log('  engine  ' + build.stamp + '  payload ' + build.payloadHash);

let divergences = 0, graded = 0;
const report = [];

/* The corpus was recorded against a specific engine payload. A mismatch is NOT a
   failure by itself (the stamp moves every commit), but the payload hash is content
   identity: if it moved, grading behaviour may legitimately have changed and the
   corpus must be regenerated rather than quietly disagreed with. Say so loudly. */
if (corpus.generatedAgainst.payloadHash !== build.payloadHash) {
  console.log('  note    corpus was recorded against payload ' + corpus.generatedAgainst.payloadHash
    + ', running against ' + build.payloadHash);
  console.log('          if the divergences below are intended engine changes, regenerate:'
    + ' node tools/make-parity-corpus.mjs');
}

const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;

/* The same index normalisation tools/make-parity-corpus.mjs records and
   MQContent.JSONValue.clampedIntValue applies: an index beyond JavaScript's own
   safe-integer range is not an index, and both runtimes saturate at that bound (NOT at
   Int64's, which is not exactly representable as a Double and so could not survive the
   JSON round trip). Only the hand-built hostile keys ever reach it. */
const SAFE_MAX = 9007199254740991, SAFE_MIN = -9007199254740991;
const clampIndex = n => {
  if (typeof n !== 'number' || Number.isNaN(n)) return -1;
  if (n >= SAFE_MAX) return SAFE_MAX;
  if (n <= SAFE_MIN) return SAFE_MIN;
  return Math.trunc(n);
};

function compare(name, got, want) {
  const diffs = [];
  const eq = (field, a, b) => { if (a !== b) diffs.push(field + ': got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); };

  eq('correct', !!got.correct, want.correct);
  eq('kind', String(got.kind), want.kind);
  eq('reason', got.reason === undefined ? null : got.reason, want.reason);
  eq('expectedIndex', clampIndex(got.expectedIndex), want.expectedIndex);
  eq('chosenIndex', clampIndex(got.chosenIndex), want.chosenIndex);
  eq('parsedOk', got.parsed ? !!got.parsed.ok : null, want.parsedOk);
  eq('parsedValue', got.parsed ? num(got.parsed.value) : null, want.parsedValue);
  eq('parsedUnit', got.parsed ? String(got.parsed.unit || '') : null, want.parsedUnit);
  eq('parsedReason', (got.parsed && got.parsed.reason !== undefined && got.parsed.reason !== null)
    ? String(got.parsed.reason) : null, want.parsedReason);

  const gotFrac = (got.parsed && Array.isArray(got.parsed.frac)) ? got.parsed.frac.map(Number) : null;
  const wantFrac = want.parsedFrac;
  const fracEq = (gotFrac === null && wantFrac === null)
    || (Array.isArray(gotFrac) && Array.isArray(wantFrac) && gotFrac.length === wantFrac.length
        && gotFrac.every((n, i) => n === wantFrac[i]));
  if (!fracEq) diffs.push('parsedFrac: got ' + JSON.stringify(gotFrac) + ' want ' + JSON.stringify(wantFrac));

  if (diffs.length) {
    divergences++;
    if (report.length < 20) report.push('  DIVERGED  ' + name + '\n            ' + diffs.join('\n            '));
  }
}

const BATCH = 500;
for (let i = 0; i < corpus.pairs.length; i += BATCH) {
  const slice = corpus.pairs.slice(i, i + BATCH);
  const verdicts = call('grade', {
    items: slice.map(p => ({ question: corpus.questions[p.q], answer: p.answer }))
  }).verdicts;
  if (verdicts.length !== slice.length) {
    console.log('FAIL  grade returned ' + verdicts.length + ' verdicts for ' + slice.length + ' items');
    process.exit(1);
  }
  slice.forEach((p, j) => { graded++; compare(p.set + '/' + p.name, verdicts[j], p.expect); });
}

report.forEach(line => console.log(line));

if (divergences) {
  console.log('\nFAIL  parity corpus: ' + divergences + ' divergence(s) of ' + graded + ' pairs');
  process.exit(1);
}
console.log('  ok      ' + graded + ' pairs re-graded, 0 divergences');
console.log('\nPARITY CORPUS PASSED  ' + graded + ' pairs');
