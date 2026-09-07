/* cube-parity-test.mjs - the node half of the cube engine's runtime parity gate.
 *
 * Replays every row of tools/fixtures/cube-parity-corpus.json against the COMMITTED
 * bundle, through CUBE_API and nothing else. The Swift half (CubeParityCorpusTests, run
 * by ios/test.command) replays the same rows inside JavaScriptCore. Neither side ever sees
 * the other, so agreement with the file is agreement between the runtimes - and a
 * divergence names the row, the seed and the field.
 *
 * It also checks the corpus is not stale: the bundle's payload hash has to be the one the
 * corpus was recorded against. A corpus recorded against different logic would pass
 * happily and prove nothing.
 *
 * Run:  node tools/cube-parity-test.mjs      (npm run test:cube-parity, and in npm test)
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(ROOT, 'ios/Packages/MQCubeEngineJS/Sources/MQCubeEngineJS/Resources/cube-engine.bundle.js');
const CORPUS = path.join(ROOT, 'tools/fixtures/cube-parity-corpus.json');

let checks = 0;
const fails = [];
function ok(cond, what, detail) {
  checks++;
  if (!cond) fails.push(detail ? what + '  ' + detail : what);
}

if (!fs.existsSync(BUNDLE)) { console.error('missing bundle: ' + BUNDLE + '  (npm run build:cube-engine)'); process.exit(1); }
if (!fs.existsSync(CORPUS)) { console.error('missing corpus: ' + CORPUS + '  (npm run build:cube-parity-corpus)'); process.exit(1); }

const sandbox = {
  Math, JSON, Object, Array, String, Number, Boolean, Error, TypeError, RangeError,
  RegExp, Date, isNaN, isFinite, parseInt, parseFloat
};
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), ctx, { filename: BUNDLE });
const API = ctx.CUBE_API;
const call = (m, a) => JSON.parse(API[m](a === undefined ? undefined : JSON.stringify(a)));

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h ^= c & 0xff;
    if (c > 0xff) h ^= (c >>> 8);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

const corpus = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));
const build = call('build').build;
ok(corpus.payloadHash === build.payloadHash,
   'the corpus was recorded against this bundle',
   'corpus ' + corpus.payloadHash + ' vs bundle ' + build.payloadHash
   + '  (regenerate: npm run build:cube-parity-corpus)');

for (const size of [2, 3]) {
  const band = corpus.sizes[String(size)];
  const tag = size + 'x' + size + ': ';
  ok(!!band, tag + 'the corpus carries this size');
  if (!band) continue;

  const solved = call('newSolved', { size });
  ok(solved.key === band.solvedKey, tag + 'the solved key matches the corpus');

  let bad = 0, first = null;
  for (let i = 0; i < band.rows.length; i++) {
    const [seed, depth, moves, keyAfter, back, stickersFnv] = band.rows[i];
    const s = call('scramble', { size, seed, depth });
    let why = null;
    if (!s.ok) why = 'scramble threw: ' + s.error.message;
    else if (s.moves.join(' ') !== moves) why = 'moves ' + moves + ' -> ' + s.moves.join(' ');
    else if (s.key !== keyAfter) why = 'key ' + keyAfter + ' -> ' + s.key;
    if (!why) {
      const applied = call('applyMoves', { size, state: s.state, moves: s.moves });
      const undone = call('applyMoves', { size, state: s.state, moves: applied.inverse });
      const wantBack = back === null ? band.solvedKey : back;
      if (undone.key !== wantBack) why = 'round trip ' + wantBack + ' -> ' + undone.key;
      else {
        const st = call('stickers', { size, state: s.state });
        const f = fnv1a(st.stickers.join(','));
        if (f !== stickersFnv) why = 'stickers ' + stickersFnv + ' -> ' + f;
      }
    }
    if (why) { bad++; if (!first) first = 'row ' + i + ' (seed ' + seed + ', depth ' + depth + '): ' + why; }
  }
  ok(bad === 0, tag + band.rows.length + ' seeded scramble/undo round trips reproduce',
     bad ? bad + ' diverged, first: ' + first : '');
  console.log('   ' + String(band.rows.length).padStart(6) + '  ' + tag + 'round trips replayed'
    + (band.wandered ? '  (' + band.wandered + ' recorded as not returning to solved)' : ''));
}

console.log('\n' + '-'.repeat(74));
if (fails.length) {
  console.log('FAIL  ' + fails.length + ' of ' + checks + ' checks');
  for (const f of fails) console.log('  x  ' + f);
  process.exit(1);
}
console.log('PASS  ' + checks + ' checks, ' + (corpus.rowsPerSize * 2) + ' cube parity rows');
process.exit(0);
