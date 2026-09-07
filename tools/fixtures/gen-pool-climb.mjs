#!/usr/bin/env node
/* Record the WEB's pool-climb rule as a fixture the Swift MQProgress suite is graded
 * against. Written for the iOS phase-1 progress lane (lane/progress).
 *
 * WHY A FIXTURE AND NOT A RESTATEMENT IN SWIFT
 * The climb lives in js/app.js, not js/core.js, and js/app.js is DOM-coupled: it calls
 * document.getElementById at module scope, so it cannot be required in a bare node vm
 * the way tools/gen-sanity.mjs loads core.js. So the rule is restated here - and the
 * restatement is PINNED: this script greps js/app.js for the four lines that ARE the
 * rule and refuses to emit a fixture unless it finds them verbatim. Change the climb on
 * the web and this tool goes red, instead of the Swift port quietly drifting away from
 * the thing it is supposed to mirror.
 *
 *   resolve()    js/app.js  S.correct++; S.streak++; S.rightRow++; S.wrongRow=0;
 *                           if(S.rightRow>=3 && S.level<3){ S.level++; S.rightRow=0; }
 *   markWrong()  js/app.js  S.streak=0; S.wrongRow++; S.rightRow=0;
 *                           if(S.wrongRow>=2 && S.level>1){ S.level--; S.wrongRow=0; }
 *
 * Two behaviours in there are easy to "clean up" and both are load-bearing, so they are
 * called out: at level 3 a correct answer still increments rightRow and does NOT reset
 * it (the guard is `level<3`), and at level 1 a wrong answer still increments wrongRow
 * and does NOT reset it. A port that resets the counter at the cap diverges after the
 * first long run.
 *
 * Usage:  node tools/fixtures/gen-pool-climb.mjs [count]   (default 500)
 * Output: tools/fixtures/pool-climb-500.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const APP = join(repo, 'js', 'app.js');

/* ---------------------------------------------------------------- provenance */
const PINS = [
  'S.correct++; S.streak++; S.rightRow++; S.wrongRow=0;',
  'if(S.rightRow>=3 && S.level<3){ S.level++; S.rightRow=0; }',
  'S.streak=0; S.wrongRow++; S.rightRow=0;',
  'if(S.wrongRow>=2 && S.level>1){ S.level--; S.wrongRow=0; }'
];
const app = readFileSync(APP, 'utf8');
const missing = PINS.filter(p => app.indexOf(p) === -1);
if (missing.length) {
  console.error('FIXTURE REFUSED: js/app.js no longer contains the pinned climb rule.');
  missing.forEach(m => console.error('  missing: ' + m));
  console.error('  The web rule changed. Re-read resolve()/markWrong(), update PINS and');
  console.error('  the port below in the SAME commit, then regenerate.');
  process.exit(1);
}

/* ---------------------------------------------------------------- the rule */
/* A literal transcription of the two js/app.js fragments above, over one skill's
   history. `level` is the web's S.level (the pool the next item is drawn from). */
function climb(events) {
  let level = 1, rightRow = 0, wrongRow = 0;
  let maxLevel = 1, streak = 0, best = 0, correct = 0;
  for (const e of events) {
    if (e === 'c') {
      correct++; streak++; rightRow++; wrongRow = 0;
      if (best < streak) best = streak;
      if (rightRow >= 3 && level < 3) { level++; rightRow = 0; }
      if (maxLevel < level) maxLevel = level;   /* S.maxLevel=Math.max(S.maxLevel,S.level) */
    } else {
      streak = 0; wrongRow++; rightRow = 0;
      if (wrongRow >= 2 && level > 1) { level--; wrongRow = 0; }
    }
  }
  return { level, rightRow, wrongRow, maxLevel, bestStreak: best, correct };
}

/* ---------------------------------------------------------------- corpus */
/* Seeded so the committed fixture is reproducible byte-for-byte. mulberry32. */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const count = Number(process.argv[2] || 500);
const rand = rng(20260907);
const histories = [];

/* Accuracy bands are spread on purpose: a fixture drawn only at p=0.5 never reaches
   the level-3 cap and never exercises the no-reset-at-the-cap behaviour, and one drawn
   only at p=0.9 never exercises the two-wrong demotion. Lengths straddle the interesting
   boundaries (3 correct, 2 wrong) and run long enough to cap out. */
const BANDS = [0.15, 0.35, 0.5, 0.65, 0.8, 0.92, 1.0, 0.0];
for (let i = 0; i < count; i++) {
  const p = BANDS[i % BANDS.length];
  const n = 1 + Math.floor(rand() * 60);
  let events = '';
  for (let k = 0; k < n; k++) events += rand() < p ? 'c' : 'w';
  histories.push({ events, expect: climb(events) });
}

/* Six hand-written cases that pin the exact edges by name, so a reader can see what the
   rule is without decoding a random string. */
const NAMED = [
  ['three in a row climbs once', 'ccc'],
  ['two in a row does not climb', 'cc'],
  ['six in a row reaches the cap', 'cccccc'],
  ['the cap holds and rightRow keeps counting', 'ccccccccc'],
  ['one wrong does not demote', 'cccw'],
  ['two wrong demote once', 'cccww'],
  ['a correct answer between two wrongs resets the demotion counter', 'cccwcw'],
  ['level 1 never goes below 1', 'wwwwww'],
  ['climb, cap, fall all the way back', 'ccccccwwww']
];
for (const [name, events] of NAMED) {
  histories.push({ name, events, expect: climb(events) });
}

const out = {
  note: 'Pool-climb corpus recorded from the web rule in js/app.js (resolve/markWrong). '
      + 'Generated by tools/fixtures/gen-pool-climb.mjs; do not hand-edit.',
  source: 'js/app.js resolve() + markWrong()',
  pinnedLines: PINS,
  seed: 20260907,
  count: histories.length,
  histories
};
const dest = join(here, 'pool-climb-500.json');
writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');
console.log('wrote ' + dest + ' (' + histories.length + ' histories)');
