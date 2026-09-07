/* Build the Cube Quest engine bundle.
 *
 * KEVIN'S RULING Q83, 2026-09-07: EXTRACT ONLY. The vault Studio file stays canonical,
 * the web Cube Quest stays one monolithic cube/index.html, and iOS gets the cube LOGIC by
 * running THIS extractor at bundle-build time. Nothing here writes to cube/index.html and
 * nothing here reads the vault Studio original: standing law 5 says the deployed, scrubbed
 * copy at cube/index.html is the only file that may feed anything that ships, and it is
 * this tool's ONLY input.
 *
 *     cube/index.html  ->  dist/cube-engine.bundle.js
 *                          ios/Packages/MQCubeEngineJS/Sources/.../Resources/cube-engine.bundle.js
 *
 * WHAT IT LIFTS. Four banner-marked blocks, byte for byte:
 *
 *     CORE    the 2x2 core   `var CUBE  = (function(){ ... })()`
 *     CORE3   the 3x3 core   `var CUBE3 = (function(){ ... })()`
 *     INFER   the inference engine (takes a core as an argument)
 *     GUIDE   the guided-solve script builder (takes a core as an argument)
 *
 * The markers are the SAME ones the vault QA Harness suites (gate_studio*.js) match on and
 * the same ones cube/tools/cube-load.mjs uses, so the extractor, the gates and the split
 * branch all agree about where the logic starts and stops. Around them it wraps a host shim
 * (no window, no document) and CUBE_API, the JSON-string surface the Swift bridge calls.
 * render.js's drawing layer is NOT extracted and never will be: SceneKit replaces it, and
 * every number a SceneKit view needs (placement, moveSpin, slotCentre, moveSlots,
 * movingPieces) already lives inside CORE and CORE3.
 *
 * THE BOUNDARY GUARD, which is the point of the whole tool.
 *
 * cube/index.html is regenerated from the vault Studio original on every deploy (standing
 * law 6). So the file this extractor reads WILL change under it, and the failure mode that
 * matters is not "the build broke" - it is "the build quietly shipped different code".
 * tools/cube-engine/block-guard.json records, for each block:
 *
 *   - the exact START and END marker lines,
 *   - a sha256 of the N lines immediately BEFORE the start marker and the N immediately
 *     AFTER the end marker (the boundary neighbourhood),
 *   - the block's own sha256, byte count and line count.
 *
 * A missing marker, a DUPLICATED marker, blocks out of order or overlapping, or a changed
 * boundary neighbourhood is a HARD FAILURE naming the marker. That is the case where a
 * Studio edit has moved the seam - code drifting into or out of a block's scope - and it
 * must never pass silently. A change INSIDE a block is legitimate (that is how the method
 * gets improved): it is reported loudly as a NOTICE, and it moves the bundle's content
 * hash, so `--check` then fails until the resource is rebuilt and committed. Re-record the
 * guard deliberately with `--record-guard`, which is a diff a reviewer can read.
 *
 * Run:  node tools/build-cube-engine.mjs           (npm run build:cube-engine)
 *       node tools/build-cube-engine.mjs --check   (npm run check:cube-engine)
 *          rebuild in memory and exit 1 if the COMMITTED resource's own bytes differ from
 *          that rebuild (stamp lines masked). It hashes the file, never the file's
 *          self-declared META line - a label is not evidence. Works with or without dist/.
 *       node tools/build-cube-engine.mjs --record-guard
 *          rewrite block-guard.json from the current cube/index.html. Deliberate act.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const RECORD = process.argv.includes('--record-guard');

const SOURCE = 'cube/index.html';
const GUARD_FILE = 'tools/cube-engine/block-guard.json';
/* The Swift package resource is the COMMITTED artifact: SwiftPM and Xcode need the bundle
   on disk and neither should have to run Node first. dist/ is the convenience copy, is
   regenerable in one command and is gitignored - so --check treats a missing dist/ as fine
   and a missing or stale ios/ copy as a failure. */
const CANONICAL = 'ios/Packages/MQCubeEngineJS/Sources/MQCubeEngineJS/Resources/cube-engine.bundle.js';
const OUTPUTS = [CANONICAL, 'dist/cube-engine.bundle.js'];

/* The four blocks, in the order they must be evaluated. INFER and GUIDE take a core as an
   argument rather than reaching for one, so strictly only "cores before the rest" matters;
   the split lane proved the three logic modules load in ANY order inside a bare JSContext
   and digest identically. The order here is the file's own, which keeps a diff against
   cube/index.html readable. */
const BLOCKS = ['CORE', 'CORE3', 'INFER', 'GUIDE'];
const MARKER = name => ({
  start: `/* ===== ${name} START =====`,
  end: `/* ===== ${name} END ===== */`
});
/* How many neighbouring lines either side of a block the guard hashes. Three is enough to
   catch a statement being inserted next to a marker and short enough that the recorded
   text is readable in the guard file itself. */
const CONTEXT = 3;

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function die(lines) {
  console.error('build-cube-engine: ' + (Array.isArray(lines) ? lines.join('\n  ') : lines));
  process.exit(1);
}

/* ---------- 1. find the four blocks, and refuse to guess ---------- */
function locateBlocks(html) {
  const lines = html.split('\n');
  const found = {};
  const errs = [];

  for (const name of BLOCKS) {
    const { start, end } = MARKER(name);
    /* Whole-line matches only. A marker mentioned inside a comment elsewhere in the file
       must not be mistaken for the real one, and an exact-line test is the cheapest way to
       say that. */
    const starts = [], ends = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === start) starts.push(i);
      if (lines[i] === end) ends.push(i);
    }
    if (starts.length === 0) errs.push(`marker MISSING: "${start}" appears nowhere in ${SOURCE}`);
    if (ends.length === 0) errs.push(`marker MISSING: "${end}" appears nowhere in ${SOURCE}`);
    if (starts.length > 1) errs.push(`marker DUPLICATED: "${start}" appears ${starts.length} times (lines ${starts.map(n => n + 1).join(', ')})`);
    if (ends.length > 1) errs.push(`marker DUPLICATED: "${end}" appears ${ends.length} times (lines ${ends.map(n => n + 1).join(', ')})`);
    if (starts.length !== 1 || ends.length !== 1) continue;
    if (ends[0] < starts[0]) {
      errs.push(`marker ORDER: "${end}" (line ${ends[0] + 1}) comes before "${start}" (line ${starts[0] + 1})`);
      continue;
    }
    found[name] = { startLine: starts[0], endLine: ends[0] };
  }
  if (errs.length) {
    die([`${SOURCE} does not carry the four logic blocks this build needs.`, ...errs,
      'The markers are shared with the vault QA Harness suites (gate_studio*.js) and with',
      'cube/tools/cube-load.mjs. If the Studio original renamed one, every one of those',
      'breaks too - fix it there, not here.']);
  }

  /* Blocks must appear in file order and must not overlap: a nested marker means one
     block has swallowed another and the extraction would ship it twice. */
  let prevEnd = -1, prevName = null;
  for (const name of BLOCKS) {
    const b = found[name];
    if (b.startLine <= prevEnd) {
      die([`block ${name} starts at line ${b.startLine + 1}, inside block ${prevName} which ends at line ${prevEnd + 1}.`,
        'The four blocks must be disjoint and in the order CORE, CORE3, INFER, GUIDE.']);
    }
    prevEnd = b.endLine; prevName = name;
  }

  for (const name of BLOCKS) {
    const b = found[name];
    b.text = lines.slice(b.startLine, b.endLine + 1).join('\n');
    b.before = lines.slice(Math.max(0, b.startLine - CONTEXT), b.startLine);
    b.after = lines.slice(b.endLine + 1, Math.min(lines.length, b.endLine + 1 + CONTEXT));
    b.beforeHash = sha256(b.before.join('\n')).slice(0, 16);
    b.afterHash = sha256(b.after.join('\n')).slice(0, 16);
    b.blockSha256 = sha256(b.text).slice(0, 16);
    b.bytes = Buffer.byteLength(b.text, 'utf8');
    b.lines = b.endLine - b.startLine + 1;
  }
  return found;
}

/* ---------- 2. the boundary guard ---------- */
function guardRecord(found, sourceSha) {
  const blocks = {};
  for (const name of BLOCKS) {
    const b = found[name];
    blocks[name] = {
      start: MARKER(name).start, end: MARKER(name).end,
      startLine: b.startLine + 1, endLine: b.endLine + 1,
      beforeHash: b.beforeHash, before: b.before,
      afterHash: b.afterHash, after: b.after,
      blockSha256: b.blockSha256, bytes: b.bytes, lines: b.lines
    };
  }
  return {
    note: 'Recorded expectation for tools/build-cube-engine.mjs. A missing, duplicated or '
      + 'moved marker, or a changed boundary neighbourhood, FAILS the build by name. A change '
      + 'inside a block is legitimate and only NOTICEd - it moves the bundle hash instead. '
      + 'Re-record deliberately with `node tools/build-cube-engine.mjs --record-guard`.',
    source: SOURCE, sourceSha256: sourceSha, context: CONTEXT, blocks
  };
}

function checkGuard(found, guard) {
  const hard = [], notices = [];
  for (const name of BLOCKS) {
    const b = found[name], g = guard.blocks[name];
    if (!g) { hard.push(`${name}: block-guard.json has no record for this block`); continue; }
    if (b.beforeHash !== g.beforeHash) {
      hard.push(`${name}: the ${CONTEXT} lines BEFORE "${MARKER(name).start}" changed`
        + `\n      recorded ${g.beforeHash}: ${JSON.stringify(g.before)}`
        + `\n      now      ${b.beforeHash}: ${JSON.stringify(b.before)}`);
    }
    if (b.afterHash !== g.afterHash) {
      hard.push(`${name}: the ${CONTEXT} lines AFTER "${MARKER(name).end}" changed`
        + `\n      recorded ${g.afterHash}: ${JSON.stringify(g.after)}`
        + `\n      now      ${b.afterHash}: ${JSON.stringify(b.after)}`);
    }
    if (b.blockSha256 !== g.blockSha256) {
      notices.push(`${name}: block content changed (${g.blockSha256} -> ${b.blockSha256}, `
        + `${g.bytes} -> ${b.bytes} bytes, ${g.lines} -> ${b.lines} lines)`);
    }
  }
  if (hard.length) {
    die([`the block boundaries in ${SOURCE} have MOVED since ${GUARD_FILE} was recorded.`,
      ...hard,
      'This is the failure this guard exists for: a Studio edit that shifts what the',
      'extractor ships without changing what the extractor is asked for. Read the diff,',
      'decide whether the new boundary is right, then re-record with:',
      '  node tools/build-cube-engine.mjs --record-guard']);
  }
  return notices;
}

/* ---------- 3. shim + api text ---------- */
function readPart(name) {
  return fs.readFileSync(path.join(ROOT, 'tools/cube-engine', name), 'utf8');
}

/* ---------- 4. build ---------- */
function build() {
  const htmlPath = path.join(ROOT, SOURCE);
  if (!fs.existsSync(htmlPath)) die(`${SOURCE} does not exist. This tool has exactly one input.`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const sourceSha = sha256(html);
  const found = locateBlocks(html);

  const guardPath = path.join(ROOT, GUARD_FILE);
  if (RECORD) {
    fs.mkdirSync(path.dirname(guardPath), { recursive: true });
    fs.writeFileSync(guardPath, JSON.stringify(guardRecord(found, sourceSha), null, 2) + '\n');
    console.log('recorded ' + GUARD_FILE + '  from ' + SOURCE + ' (sha256 ' + sourceSha.slice(0, 16) + ')');
    for (const name of BLOCKS) {
      const b = found[name];
      console.log('  ' + name.padEnd(6) + ' lines ' + (b.startLine + 1) + '-' + (b.endLine + 1)
        + '  ' + b.bytes + ' bytes  sha ' + b.blockSha256);
    }
    process.exit(0);
  }
  if (!fs.existsSync(guardPath)) {
    die([`${GUARD_FILE} is missing. The boundary guard is part of this build, not an extra.`,
      'Record it once, review the diff, and commit it:',
      '  node tools/build-cube-engine.mjs --record-guard']);
  }
  const guard = JSON.parse(fs.readFileSync(guardPath, 'utf8'));
  const notices = checkGuard(found, guard);

  const shim = readPart('host-shim.js');
  const api = readPart('api.js');

  const parts = [];
  for (const name of BLOCKS) {
    const b = found[name];
    /* The banner sits OUTSIDE the block text so the block itself stays byte-identical to
       cube/index.html. cube/tools/cube-engine-sanity.mjs proves that by locating each
       block's exact bytes inside the bundle. */
    parts.push(`/* ===== extracted from ${SOURCE} lines ${b.startLine + 1}-${b.endLine + 1} ===== */\n`
      + b.text + '\n');
  }
  const body = parts.join('\n');

  /* The payload hash covers shim + blocks + api and NOT the stamp, so two bundles built on
     different days from the same source compare equal. */
  const payload = shim + '\n' + body + '\n' + api;
  const payloadHash = sha256(payload).slice(0, 16);

  /* stderr is swallowed on purpose: this tool has to work in a scratch copy that is not a
     git checkout at all (the guard's own proof runs there), and "fatal: not a git
     repository" printed twice is noise, not information - the stamp says `nogit` instead. */
  const quiet = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  let sha = 'nogit';
  try { sha = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short=7', 'HEAD'], quiet).trim(); }
  catch { /* not a git checkout */ }
  let dirty = false;
  try {
    const st = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--', SOURCE, 'tools/cube-engine'], quiet);
    dirty = st.trim().length > 0;
  } catch { /* ignore */ }

  const d = new Date();
  const p2 = n => String(n).padStart(2, '0');
  const date = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const stamp = date.replace(/-/g, '') + '-' + sha + (dirty ? '-dirty' : '');

  const meta = {
    stamp, date, sha, dirty, payloadHash,
    source: SOURCE, sourceSha256: sourceSha.slice(0, 32),
    blocks: BLOCKS.map(n => ({
      name: n, startLine: found[n].startLine + 1, endLine: found[n].endLine + 1,
      bytes: found[n].bytes, sha256: found[n].blockSha256
    })),
    generator: 'tools/build-cube-engine.mjs'
  };

  const header =
    '/* Cube Quest engine bundle. GENERATED by tools/build-cube-engine.mjs - DO NOT EDIT.\n'
    + ' * Extracted from cube/index.html (the scrubbed deploy copy) under Kevin\'s Q83 ruling:\n'
    + ' * the vault Studio file stays canonical, the web cube stays a monolith, iOS gets the\n'
    + ' * logic through this extractor. Change the method in the Studio, deploy, re-run\n'
    + ' * `npm run build:cube-engine`, and commit the result.\n'
    + ' */\n'
    + '/* CUBE_ENGINE_BUILD ' + stamp + ' */\n'
    + '/* CUBE_ENGINE_BUILD_META ' + JSON.stringify(meta) + ' */\n'
    + 'var CUBE_ENGINE_META = ' + JSON.stringify(meta, null, 0) + ';\n';

  const text = header + '\n' + shim + '\n' + body + '\n' + api + '\n/* CUBE_ENGINE_BUILD_END ' + stamp + ' */\n';
  return { text, meta, payloadHash, notices, found };
}

function payloadHashOf(text) {
  const m = String(text).match(/\/\* CUBE_ENGINE_BUILD_META (\{[\s\S]*?\}) \*\//);
  if (!m) return null;
  try { return JSON.parse(m[1]).payloadHash; } catch { return null; }
}

/* ---------- 5. content identity: hash the BYTES, not the label ----------
   Straight from the engine-bridge lane's fix pass. Reading `payloadHash` out of the
   committed file's own META line and comparing that STRING is the file describing itself:
   rewrite one word of instruction text, leave the META line alone, and every gate stays
   green on a bundle whose content exists in no source file. So: mask the four stamp lines
   (the only legitimate difference between two builds of the same source on different days)
   and sha256 what is left, on BOTH sides. */
function maskStamp(text) {
  return String(text)
    .replace(/^\/\* CUBE_ENGINE_BUILD [^\n]*\n/m, '')
    .replace(/^\/\* CUBE_ENGINE_BUILD_META [\s\S]*?\*\/\n/m, '')
    .replace(/^var CUBE_ENGINE_META = [^\n]*\n/m, '')
    .replace(/\/\* CUBE_ENGINE_BUILD_END [^\n]*\*\/\s*$/, '');
}
function contentHash(text) { return sha256(maskStamp(text)).slice(0, 16); }

const built = build();

for (const n of built.notices) console.log('NOTICE   ' + n);

if (CHECK) {
  let bad = 0;
  const wantContent = contentHash(built.text);
  for (const out of OUTPUTS) {
    const p = path.join(ROOT, out);
    if (!fs.existsSync(p)) {
      if (out === CANONICAL) { console.error('MISSING  ' + out + '  (run: npm run build:cube-engine)'); bad++; }
      else { console.log('absent   ' + out + '  (gitignored build output, fine)'); }
      continue;
    }
    const text = fs.readFileSync(p, 'utf8');
    const haveContent = contentHash(text);
    const haveLabel = payloadHashOf(text);
    if (haveContent !== wantContent) {
      console.error('STALE    ' + out + '  content ' + haveContent + ' != ' + wantContent
        + '  (the committed bytes are not a build of the current cube/index.html; run: npm run build:cube-engine)');
      if (haveLabel === built.payloadHash) {
        console.error('         ^ and its CUBE_ENGINE_BUILD_META still claims payload ' + haveLabel
          + ' - the file has been edited BY HAND or TAMPERED WITH since it was built.');
      }
      bad++;
      continue;
    }
    if (haveLabel !== built.payloadHash) {
      console.error('BAD META ' + out + '  declares payload ' + haveLabel + ' but its content is a build of '
        + built.payloadHash + '  (run: npm run build:cube-engine)');
      bad++;
      continue;
    }
    console.log('fresh    ' + out + '  content ' + haveContent + '  payload ' + haveLabel);
  }
  if (built.notices.length) {
    console.log('note     the guard recorded different block content; that is allowed, but re-record');
    console.log('         block-guard.json in the same commit so the change appears in a diff.');
  }
  process.exit(bad ? 1 : 0);
}

for (const out of OUTPUTS) {
  const p = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, built.text);
  console.log('wrote    ' + out + '  ' + (built.text.length / 1024).toFixed(1) + ' kB');
}
console.log('source   ' + SOURCE + '  sha256 ' + built.meta.sourceSha256.slice(0, 16));
for (const b of built.meta.blocks) {
  console.log('  ' + b.name.padEnd(6) + ' lines ' + b.startLine + '-' + b.endLine + '  '
    + String(b.bytes).padStart(6) + ' bytes  sha ' + b.sha256);
}
console.log('stamp    ' + built.meta.stamp + (built.meta.dirty ? '  (working tree dirty)' : ''));
console.log('payload  ' + built.payloadHash);
