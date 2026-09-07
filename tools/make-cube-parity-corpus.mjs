/* Build tools/fixtures/cube-parity-corpus.json.
 *
 * 10,000 seeded scramble-and-undo round trips PER CUBE SIZE, recorded from node running
 * the committed bundle, and replayed by BOTH `tools/cube-parity-test.mjs` (in `npm test`)
 * and the Swift `CubeParityCorpusTests` (in `ios/test.command`). Agreement with the file
 * IS pairwise agreement between the two runtimes - the same shape the engine lane's
 * grading corpus uses, and for the same reason: a corpus generated at test time on each
 * side proves only that each side agrees with itself.
 *
 * WHY IT CAN BE A FIXED FILE AT ALL. The cube engine holds no state and calls no
 * Math.random: `CUBE_API.scramble({size, seed, depth})` runs the core's own randomScramble
 * against a mulberry32 seeded by the caller. Same seed, same moves, in Node and in
 * JavaScriptCore. (The question engine's generators use unseeded Math.random, which is why
 * ITS corpus had to record verdicts rather than seeds.)
 *
 * EACH ROW, as a compact array so 20,000 of them stay legible in a diff:
 *
 *   [ seed, depth, moves, keyAfter, back, stickersFnv ]
 *
 *   moves        the whole scramble, space-joined, exactly as the core generated it
 *   keyAfter     keyOf() of the scrambled cube
 *   back         null when the inverse sequence lands back on the solved key (the normal
 *                case, recorded once per size as `solvedKey`); the actual key otherwise,
 *                so a round trip that goes somewhere else is pinned rather than hidden
 *   stickersFnv  FNV-1a of the sticker view, so the painting the child would see is
 *                covered too and not only the internal key
 *
 * Regenerate deliberately:  npm run build:cube-parity-corpus
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(ROOT, 'ios/Packages/MQCubeEngineJS/Sources/MQCubeEngineJS/Resources/cube-engine.bundle.js');
const OUT = path.join(ROOT, 'tools/fixtures/cube-parity-corpus.json');
const ROWS = Number(process.env.CUBE_PARITY_ROWS || 10000);

const sandbox = {
  Math, JSON, Object, Array, String, Number, Boolean, Error, TypeError, RangeError,
  RegExp, Date, isNaN, isFinite, parseInt, parseFloat
};
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(BUNDLE, 'utf8'), ctx, { filename: BUNDLE });
const API = ctx.CUBE_API;
const call = (m, a) => {
  const r = JSON.parse(API[m](a === undefined ? undefined : JSON.stringify(a)));
  if (!r.ok) throw new Error(m + ': ' + r.error.message);
  return r;
};

/* FNV-1a, the same 32-bit constants the bundle and the Swift test use. */
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

const build = call('build').build;
const sizes = {};
for (const size of [2, 3]) {
  const solvedKey = call('newSolved', { size }).key;
  const rows = [];
  let wandered = 0;
  for (let i = 0; i < ROWS; i++) {
    /* seeds spread across the 32-bit space rather than 0..N, so a PRNG that degenerates
       for small seeds cannot hide behind a tidy sample */
    const seed = ((i * 2654435761) % 4294967291) | 0;
    const depth = 1 + (i % 30);
    const s = call('scramble', { size, seed, depth });
    const back = call('applyMoves', { size, state: s.state, moves: s.moves });
    /* applyMoves hands back the inverse of what it was given; feed that in to undo */
    const undone = call('applyMoves', { size, state: s.state, moves: back.inverse });
    const st = call('stickers', { size, state: s.state });
    const wentBack = undone.key === solvedKey;
    if (!wentBack) wandered++;
    rows.push([seed, depth, s.moves.join(' '), s.key, wentBack ? null : undone.key, fnv1a(st.stickers.join(','))]);
  }
  sizes[String(size)] = { solvedKey, rowCount: rows.length, wandered, rows };
  console.log(size + 'x' + size + ': ' + rows.length + ' round trips, '
    + wandered + ' that did not land back on solved');
}

const doc = {
  note: 'Seeded scramble/undo round trips for the extracted cube engine. Recorded from node '
    + 'running the committed bundle; replayed by tools/cube-parity-test.mjs and by the Swift '
    + 'CubeParityCorpusTests, so agreement with this file is agreement between the runtimes. '
    + 'Row = [seed, depth, moves, keyAfter, back (null = landed on solvedKey), stickersFnv]. '
    + 'Regenerate with `npm run build:cube-parity-corpus`.',
  stamp: build.stamp,
  payloadHash: build.payloadHash,
  sourceSha256: build.sourceSha256 || null,
  rowsPerSize: ROWS,
  sizes
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(doc) + '\n');
console.log('wrote ' + path.relative(ROOT, OUT) + '  ' + (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + ' MB'
  + '  (bundle ' + build.stamp + ', payload ' + build.payloadHash + ')');
