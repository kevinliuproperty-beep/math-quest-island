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
 * the same ones cube/tools/cube-load.mjs uses, and since the fix pass they are matched by
 * ONE module - tools/cube-engine/markers.mjs - which the extractor, the gate, the probe and
 * the golden recorder all import (refutation wound 6: the extractor wanted a whole line and
 * the gate accepted an indented marker, so a planted end marker got through both and was
 * caught only because the two tools then disagreed about the bytes). Around the blocks it
 * wraps a host shim (no window, no document) and CUBE_API, the JSON-string surface the
 * Swift bridge calls. render.js's drawing layer is NOT extracted and never will be:
 * SceneKit replaces it, and every number a SceneKit view needs (placement, moveSpin,
 * slotCentre, moveSlots, movingPieces) already lives inside CORE and CORE3.
 *
 * ==========================================================================
 * KILL 2 OF THE REFUTATION: THE PIPELINE LAUNDERED A STUDIO EDIT
 * ==========================================================================
 *
 * The refuter changed ONE LINE inside the INFER block of a scratch cube/index.html -
 * `INFER.findable` made to answer by parity, which moves the square the painter asks the
 * child about in 60 of 60 seeded paintings - and then ran the ritual the tools themselves
 * print:
 *
 *     npm run build:cube-engine          NOTICE INFER: block content changed
 *     cube-engine-sanity                 FAIL 1 of 207   (the guard's recorded sha)
 *     build-cube-engine --record-guard   (the tool's own printed instruction)
 *     cube-parity-test                   FAIL 1 of 7     (corpus payload)
 *     build:cube-parity-corpus           (the test's own printed instruction)
 *     --check                            exit 0, "fresh", AND THE NOTICE IS GONE
 *
 * Three commands and there was no trace anywhere. No gate required a human to acknowledge
 * what changed inside a block; the two witnesses that fired fire on every legitimate
 * deploy too, so the ritual becomes reflex and reflex is what silences them.
 *
 * Three things close it, and all three are in this file:
 *
 *  (a) THE PAGE HAS TO HAVE BEEN DEPLOYED. tools/cube-engine/deployed-page.json records
 *      the sha256 of cube/index.html as it was when standing law 6's deploy procedure last
 *      ran. If the file on disk is not that file, the build REFUSES - it does not warn, it
 *      does not notice, it exits 1. A Studio edit therefore cannot reach the bundle by
 *      editing cube/index.html alone: it has to go through the deploy, which is the human
 *      gate law 6 already defines (scrub, commit, push, 20 consecutive sha256 checks
 *      against the live origin, versioned URL to Kevin). THE DEPLOY LANE IS THE ONLY
 *      WRITER of that file, via `--record-deploy`, and the refusal message says so.
 *
 *  (b) RE-RECORDING THE GUARD IS A SIGNED ACT. `--record-guard` now refuses without
 *      `--ack "<reason>"` of at least 40 characters, prints the FULL in-block diff, and
 *      appends the ack, the diff and the old/new block shas to
 *      tools/cube-engine/guard-changelog.md - append-only, committed, so a reviewer reads
 *      a sentence and a diff rather than a hash that moved.
 *
 *  (c) THE NOTICE IS A HARD FAILURE. A block whose content differs from the recorded guard
 *      no longer prints a NOTICE and carries on. The build stops until (b) has happened.
 *      "Loud" was not enough; the refuter proved that three commands make loud silent.
 *
 * Run:  node tools/build-cube-engine.mjs           (npm run build:cube-engine)
 *       node tools/build-cube-engine.mjs --check   (npm run check:cube-engine)
 *          rebuild in memory and exit 1 if the COMMITTED resource's own bytes differ from
 *          that rebuild (stamp lines masked). It hashes the file, never the file's
 *          self-declared META line - a label is not evidence. Works with or without dist/.
 *       node tools/build-cube-engine.mjs --record-guard --ack "why this block changed"
 *          rewrite block-guard.json from the current cube/index.html and write the change
 *          into guard-changelog.md. Deliberate, signed, and the only way past (c).
 *       node tools/build-cube-engine.mjs --record-deploy
 *          THE DEPLOY LANE ONLY. Record cube/index.html's sha as the deployed page, after
 *          standing law 6's procedure has actually run.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BLOCKS, MARKER, locateBlocks as locate, allBlocks } from './cube-engine/markers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const RECORD = process.argv.includes('--record-guard');
const RECORD_DEPLOY = process.argv.includes('--record-deploy');
const argValue = name => {
  const i = process.argv.indexOf(name);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
};
const ACK = argValue('--ack');

const SOURCE = 'cube/index.html';
const GUARD_FILE = 'tools/cube-engine/block-guard.json';
const DEPLOY_FILE = 'tools/cube-engine/deployed-page.json';
const CHANGELOG = 'tools/cube-engine/guard-changelog.md';
/* The Swift package resource is the COMMITTED artifact: SwiftPM and Xcode need the bundle
   on disk and neither should have to run Node first. dist/ is the convenience copy, is
   regenerable in one command and is gitignored - so --check treats a missing dist/ as fine
   and a missing or stale ios/ copy as a failure. */
const CANONICAL = 'ios/Packages/MQCubeEngineJS/Sources/MQCubeEngineJS/Resources/cube-engine.bundle.js';
const OUTPUTS = [CANONICAL, 'dist/cube-engine.bundle.js'];

/* An ack short enough to type without thinking is not an ack. Forty characters is about
   one clause - "INFER.findable now answers by parity, Studio 09-07" is 50. */
const ACK_MIN = 40;

/* How many neighbouring lines either side of a block the guard hashes. Three is enough to
   catch a statement being inserted next to a marker and short enough that the recorded
   text is readable in the guard file itself. */
const CONTEXT = 3;

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function die(lines) {
  console.error('build-cube-engine: ' + (Array.isArray(lines) ? lines.join('\n  ') : lines));
  process.exit(1);
}

/* ---------- 1. find the four blocks, and refuse to guess ----------
   The matching itself lives in tools/cube-engine/markers.mjs so that this tool and its own
   gate cannot disagree about what a marker is. */
function locateBlocks(html) {
  const { found, errors } = locate(html, { context: CONTEXT });
  if (errors.length) {
    die([`${SOURCE} does not carry the four logic blocks this build needs.`, ...errors,
      'The markers are shared with the vault QA Harness suites (gate_studio*.js) and with',
      'cube/tools/cube-load.mjs. If the Studio original renamed one, every one of those',
      'breaks too - fix it there, not here.']);
  }
  for (const name of BLOCKS) {
    const b = found[name];
    b.beforeHash = sha256(b.before.join('\n')).slice(0, 16);
    b.afterHash = sha256(b.after.join('\n')).slice(0, 16);
    b.blockSha256 = sha256(b.text).slice(0, 16);
    b.bytes = Buffer.byteLength(b.text, 'utf8');
    b.lines = b.endLine - b.startLine + 1;
  }
  return found;
}

/* ---------- 2. the boundary guard ---------- */
function guardRecord(found, sourceSha, ack) {
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
      + 'INSIDE a block also FAILS the build now (refutation kill 2: a NOTICE was laundered to '
      + 'silence by three documented commands). Re-record deliberately with '
      + '`node tools/build-cube-engine.mjs --record-guard --ack "<why>"`, which writes the '
      + 'reason and the full diff into tools/cube-engine/guard-changelog.md.',
    source: SOURCE, sourceSha256: sourceSha, context: CONTEXT,
    recordedAck: ack, recordedDate: today(),
    blocks
  };
}

function checkGuard(found, guard) {
  const hard = [], changed = [];
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
      changed.push({ name, from: g.blockSha256, to: b.blockSha256,
                     fromBytes: g.bytes, toBytes: b.bytes,
                     fromLines: g.lines, toLines: b.lines });
    }
  }
  if (hard.length) {
    die([`the block boundaries in ${SOURCE} have MOVED since ${GUARD_FILE} was recorded.`,
      ...hard,
      'This is the failure this guard exists for: a Studio edit that shifts what the',
      'extractor ships without changing what the extractor is asked for. Read the diff,',
      'decide whether the new boundary is right, then re-record with:',
      '  node tools/build-cube-engine.mjs --record-guard --ack "<why>"']);
  }
  return changed;
}

/* ---------- 3. the deployed page ----------
   The one input this tool has is only trustworthy if it is the file standing law 6 put
   through the deploy. Anything else is a Studio edit no human has seen. */
function deployedRecord(sourceSha, bytes) {
  return {
    note: 'The sha256 of cube/index.html as it stood when standing law 6\'s DEPLOY '
      + 'PROCEDURE last ran (copy the vault Studio original, scrub, commit + push main, '
      + '20 consecutive full-body sha256 checks against the live origin, hail Kevin with a '
      + '?v=<sha> link). tools/build-cube-engine.mjs REFUSES TO BUILD unless the file on '
      + 'disk hashes to this. THE DEPLOY LANE IS THE ONLY WRITER: run '
      + '`node tools/build-cube-engine.mjs --record-deploy` as the last step of the deploy, '
      + 'never to get past a red build. Editing this file by hand to match an undeployed '
      + 'page is exactly the laundering the refutation killed this pipeline for.',
    source: SOURCE,
    sha256: sourceSha,
    bytes,
    recordedDate: today(),
    recordedBy: 'node tools/build-cube-engine.mjs --record-deploy',
    law: 'Cube Quest standing law 6 (deploy procedure), vault `Cube Quest - State of the World`'
  };
}

function requireDeployedPage(sourceSha) {
  const p = path.join(ROOT, DEPLOY_FILE);
  if (!fs.existsSync(p)) {
    die([`${DEPLOY_FILE} is missing.`,
      'This build only ever runs on a page that has been DEPLOYED under standing law 6.',
      'The deploy lane records it as the last step of the deploy:',
      '  node tools/build-cube-engine.mjs --record-deploy',
      'It is not an extra and it is not this tool\'s to invent.']);
  }
  let rec = null;
  try { rec = JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { die(`${DEPLOY_FILE} is not readable JSON: ${e.message}`); }
  if (rec && rec.sha256 === sourceSha) return rec;
  die([`${SOURCE} IS NOT THE DEPLOYED PAGE.`,
    `  on disk   sha256 ${sourceSha}`,
    `  deployed  sha256 ${rec ? rec.sha256 : '(unreadable)'}   (recorded ${(rec && rec.recordedDate) || 'unknown'})`,
    '',
    'The extractor reads exactly one file and it must be the one the web is serving.',
    'An edited-but-undeployed cube/index.html reaching the iPad is the laundering path the',
    'refutation killed: an in-block Studio edit used to become a NOTICE, then three',
    'documented commands, then silence.',
    '',
    'THE ONLY WAY THROUGH IS THE DEPLOY. Standing law 6, in order:',
    '  1. copy the vault Studio original over cube/index.html and scrub it',
    '  2. commit + push main, wait for Vercel',
    '  3. verify with 20 consecutive full-body sha256 checks against the live origin',
    '  4. hail Kevin with the ?v=<sha> link',
    '  5. THEN, and only then:  node tools/build-cube-engine.mjs --record-deploy',
    '',
    `THE DEPLOY LANE IS THE ONLY WRITER of ${DEPLOY_FILE}. Do not hand-edit it to match an`,
    'undeployed page: that is the laundering, one step further back.']);
}

/* ---------- 4. the in-block diff, so an ack has something to be about ----------
   The "before" text is taken from the COMMITTED bundle resource, which carries the four
   blocks byte for byte. Deliberately not git: it is the code that is shipping right now, it
   is on disk even in a scratch copy that is not a checkout, and its sha is the one the
   guard recorded. */
function committedBlocks() {
  const p = path.join(ROOT, CANONICAL);
  if (!fs.existsSync(p)) return null;
  const text = fs.readFileSync(p, 'utf8');
  const all = allBlocks(text);
  const out = {};
  for (const name of BLOCKS) out[name] = all[name].length === 1 ? all[name][0] : null;
  return out;
}

/* A line diff: trim the common head and tail, then LCS the middle. Blocks are 300-1300
   lines and a Studio edit touches a handful, so the middle is almost always tiny; the cap
   keeps a whole-block rewrite from turning into a quadratic sulk. */
function lineDiff(oldText, newText, { cap = 600 } = {}) {
  const a = oldText.split('\n'), b = newText.split('\n');
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head
         && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const am = a.slice(head, a.length - tail), bm = b.slice(head, b.length - tail);
  if (!am.length && !bm.length) return { lines: [], added: 0, removed: 0, truncated: false, startLine: head + 1 };
  if (am.length > cap || bm.length > cap) {
    const lines = [];
    for (const l of am.slice(0, cap)) lines.push('-' + l);
    if (am.length > cap) lines.push(`- ... ${am.length - cap} more removed lines not printed`);
    for (const l of bm.slice(0, cap)) lines.push('+' + l);
    if (bm.length > cap) lines.push(`+ ... ${bm.length - cap} more added lines not printed`);
    return { lines, added: bm.length, removed: am.length, truncated: true, startLine: head + 1 };
  }
  const n = am.length, m = bm.length;
  const dp = [];
  for (let i = 0; i <= n; i++) dp.push(new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = am[i] === bm[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const lines = [];
  let added = 0, removed = 0, i = 0, j = 0;
  while (i < n && j < m) {
    if (am[i] === bm[j]) { lines.push(' ' + am[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { lines.push('-' + am[i]); removed++; i++; }
    else { lines.push('+' + bm[j]); added++; j++; }
  }
  while (i < n) { lines.push('-' + am[i]); removed++; i++; }
  while (j < m) { lines.push('+' + bm[j]); added++; j++; }
  return { lines, added, removed, truncated: false, startLine: head + 1 };
}

function today() {
  const d = new Date(), p2 = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}

const CHANGELOG_HEADER =
  '# Cube engine block-guard changelog\n'
  + '\n'
  + 'APPEND-ONLY, and committed. Every re-recording of `tools/cube-engine/block-guard.json`\n'
  + 'writes an entry here: the reason a human typed, the old and new sha of every block whose\n'
  + 'content moved, and the diff.\n'
  + '\n'
  + 'It exists because of KILL 2 of the extract refutation. An in-block Studio edit used to be\n'
  + 'a NOTICE, and the three commands the tools themselves print turned that NOTICE into\n'
  + 'silence - after which nothing anywhere said what had changed inside the gate-verified\n'
  + 'code that ships to the iPad. `--record-guard` now refuses without `--ack "<why>"` and\n'
  + 'lands here, so what a reviewer reads is a sentence and a patch rather than a hash that\n'
  + 'moved.\n'
  + '\n'
  + 'Never edit an entry. Never delete one. If an ack was wrong, add a new entry saying so.\n';

function appendChangelog(entry) {
  const p = path.join(ROOT, CHANGELOG);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, CHANGELOG_HEADER);
  fs.appendFileSync(p, entry);
}

/* ---------- 5. shim + api text ---------- */
function readPart(name) {
  return fs.readFileSync(path.join(ROOT, 'tools/cube-engine', name), 'utf8');
}

/* ---------- 6. build ---------- */
function build() {
  const htmlPath = path.join(ROOT, SOURCE);
  if (!fs.existsSync(htmlPath)) die(`${SOURCE} does not exist. This tool has exactly one input.`);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const sourceSha = sha256(html);
  const found = locateBlocks(html);

  const guardPath = path.join(ROOT, GUARD_FILE);

  /* ---- --record-deploy: the deploy lane's one line ---- */
  if (RECORD_DEPLOY) {
    const rec = deployedRecord(sourceSha, Buffer.byteLength(html, 'utf8'));
    fs.mkdirSync(path.dirname(path.join(ROOT, DEPLOY_FILE)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, DEPLOY_FILE), JSON.stringify(rec, null, 2) + '\n');
    console.log('recorded ' + DEPLOY_FILE);
    console.log('  ' + SOURCE + '  sha256 ' + sourceSha);
    console.log('  This asserts that the page on disk is the page standing law 6 deployed.');
    console.log('  If law 6\'s procedure did NOT just run, revert this file.');
    process.exit(0);
  }

  /* ---- --record-guard: signed, diffed, logged ---- */
  if (RECORD) {
    if (!ACK || ACK.startsWith('--')) {
      die(['--record-guard requires --ack "<why the block content changed>".',
        'Re-recording the guard is the ONE place a human says "yes, the gate-verified cube',
        'code changed and here is why". The refutation showed that without it the three',
        'commands the tools print launder any in-block Studio edit to silence in under a',
        'minute. Give a real sentence:',
        '',
        '  node tools/build-cube-engine.mjs --record-guard \\',
        '    --ack "Studio 09-07: INFER.findable now prefers a painted neighbour, per Q84"',
        '',
        `The ack and the full diff are appended to ${CHANGELOG}, which is committed.`]);
    }
    if (ACK.trim().length < ACK_MIN) {
      die([`--ack is ${ACK.trim().length} characters; at least ${ACK_MIN} are required.`,
        `  got: ${JSON.stringify(ACK)}`,
        'An ack short enough to type without thinking is not an ack. Say what changed',
        'inside the block and why, in a sentence a reviewer who was not here can read.']);
    }

    let guardBefore = null;
    if (fs.existsSync(guardPath)) {
      try { guardBefore = JSON.parse(fs.readFileSync(guardPath, 'utf8')); } catch { guardBefore = null; }
    }
    const shipping = committedBlocks();
    const rows = [], diffs = [];
    for (const name of BLOCKS) {
      const b = found[name];
      const g = guardBefore && guardBefore.blocks ? guardBefore.blocks[name] : null;
      if (g && g.blockSha256 === b.blockSha256) continue;
      rows.push({ name, from: g ? g.blockSha256 : '(none)', to: b.blockSha256,
                  fromBytes: g ? g.bytes : null, toBytes: b.bytes,
                  fromLines: g ? g.lines : null, toLines: b.lines });
      const old = shipping ? shipping[name] : null;
      if (old === null || old === undefined) diffs.push({ name, note: 'no committed bundle to diff against', d: null });
      else diffs.push({ name, note: null, d: lineDiff(old, b.text) });
    }

    /* PRINT THE FULL DIFF. The whole point of the ack is that a human looked at this. */
    console.log('');
    console.log('=== in-block changes, against the block bytes the committed bundle ships ===');
    if (!rows.length) {
      console.log('  (no block content changed; the boundary neighbourhood is being re-recorded)');
    }
    for (const d of diffs) {
      const r = rows.find(x => x.name === d.name);
      console.log('');
      console.log('--- ' + d.name + '  ' + r.from + ' -> ' + r.to
        + '  ' + (r.fromBytes === null ? '?' : r.fromBytes) + ' -> ' + r.toBytes + ' bytes');
      if (d.note) { console.log('    ' + d.note); continue; }
      console.log('    +' + d.d.added + ' -' + d.d.removed + ' lines, from block line ' + d.d.startLine
        + (d.d.truncated ? '  (printed in bulk: larger than the diff cap)' : ''));
      for (const line of d.d.lines) console.log('    ' + line);
    }
    console.log('');

    fs.mkdirSync(path.dirname(guardPath), { recursive: true });
    fs.writeFileSync(guardPath, JSON.stringify(guardRecord(found, sourceSha, ACK.trim()), null, 2) + '\n');

    let entry = '\n---\n\n## ' + today() + '  block-guard re-recorded\n\n';
    entry += '**Ack.** ' + ACK.trim() + '\n\n';
    entry += '**Source.** `' + SOURCE + '` sha256 `' + sourceSha + '`\n\n';
    if (!rows.length) {
      entry += 'No block content changed; the boundary neighbourhood was re-recorded.\n\n';
    } else {
      entry += '| Block | sha256 (16) | bytes | lines |\n|---|---|---|---|\n';
      for (const r of rows) {
        entry += '| `' + r.name + '` | `' + r.from + '` -> `' + r.to + '` | '
          + (r.fromBytes === null ? '?' : r.fromBytes) + ' -> ' + r.toBytes + ' | '
          + (r.fromLines === null ? '?' : r.fromLines) + ' -> ' + r.toLines + ' |\n';
      }
      entry += '\n';
      for (const d of diffs) {
        entry += '### ' + d.name + '\n\n';
        if (d.note) { entry += '_' + d.note + '_\n\n'; continue; }
        entry += '`+' + d.d.added + ' -' + d.d.removed + ' lines, from block line ' + d.d.startLine
          + (d.d.truncated ? ', printed in bulk (larger than the diff cap)' : '') + '`\n\n';
        entry += '```diff\n' + d.d.lines.join('\n') + '\n```\n\n';
      }
    }
    appendChangelog(entry);

    console.log('recorded ' + GUARD_FILE + '  from ' + SOURCE + ' (sha256 ' + sourceSha.slice(0, 16) + ')');
    console.log('appended ' + CHANGELOG + '  (' + rows.length + ' block(s) changed)');
    for (const name of BLOCKS) {
      const b = found[name];
      console.log('  ' + name.padEnd(6) + ' lines ' + (b.startLine + 1) + '-' + (b.endLine + 1)
        + '  ' + b.bytes + ' bytes  sha ' + b.blockSha256);
    }
    console.log('');
    console.log('NOTE  the build still refuses until ' + SOURCE + ' is the DEPLOYED page');
    console.log('      (' + DEPLOY_FILE + '). Deploy under law 6, then --record-deploy.');
    process.exit(0);
  }

  /* ---- every other invocation, --check included ---- */
  requireDeployedPage(sourceSha);

  if (!fs.existsSync(guardPath)) {
    die([`${GUARD_FILE} is missing. The boundary guard is part of this build, not an extra.`,
      'Record it once, review the diff, and commit it:',
      '  node tools/build-cube-engine.mjs --record-guard --ack "<why>"']);
  }
  const guard = JSON.parse(fs.readFileSync(guardPath, 'utf8'));
  const changed = checkGuard(found, guard);

  /* KILL 2 (c): what used to be a NOTICE. */
  if (changed.length) {
    die([`the CONTENT of ${changed.length} guarded block(s) in ${SOURCE} changed.`,
      ...changed.map(c => `${c.name}: ${c.from} -> ${c.to}  (${c.fromBytes} -> ${c.toBytes} bytes, `
        + `${c.fromLines} -> ${c.toLines} lines)`),
      '',
      'This used to be a NOTICE and the build carried on. The refutation showed what that',
      'is worth: an in-block Studio edit - one line of INFER.findable, which changed the',
      'square the painter asks the child about in 60 of 60 paintings - was laundered to',
      'silence by three commands the tools themselves print.',
      '',
      'So it is a refusal, and the way past it is a human sentence:',
      '  node tools/build-cube-engine.mjs --record-guard --ack "<what changed inside the block, and why>"',
      '',
      `That prints the full diff and appends it, with your ack, to ${CHANGELOG}.`]);
  }

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

  const date = today();
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
  return { text, meta, payloadHash, found };
}

function payloadHashOf(text) {
  const m = String(text).match(/\/\* CUBE_ENGINE_BUILD_META (\{[\s\S]*?\}) \*\//);
  if (!m) return null;
  try { return JSON.parse(m[1]).payloadHash; } catch { return null; }
}

/* ---------- 7. content identity: hash the BYTES, not the label ----------
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
  process.exit(bad ? 1 : 0);
}

for (const out of OUTPUTS) {
  const p = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, built.text);
  console.log('wrote    ' + out + '  ' + (built.text.length / 1024).toFixed(1) + ' kB');
}
console.log('source   ' + SOURCE + '  sha256 ' + built.meta.sourceSha256.slice(0, 16) + '  (the deployed page)');
for (const b of built.meta.blocks) {
  console.log('  ' + b.name.padEnd(6) + ' lines ' + b.startLine + '-' + b.endLine + '  '
    + String(b.bytes).padStart(6) + ' bytes  sha ' + b.sha256);
}
console.log('stamp    ' + built.meta.stamp + (built.meta.dirty ? '  (working tree dirty)' : ''));
console.log('payload  ' + built.payloadHash);
