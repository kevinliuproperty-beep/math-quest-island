#!/usr/bin/env node
/* Science Quest topic validator. Zero dependencies.
   Usage:  node science/validate.mjs            (all files in science/topics/)
           node science/validate.mjs magnets    (only the named topic id(s))
   Loads each topic file with a stub SCI, checks the content contract in
   "P3 Science Brief — 2026-10-06", prints a per-topic summary. Exit 1 on any ERROR.
   Topic ids starting with "_" are demo files: the size/mix floors are warnings there. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'topics');
const THEMES = ['Diversity', 'Cycles', 'Systems', 'Interactions', 'Energy', 'Skills'];
const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort() : [];
const pick = only.length ? files.filter(f => only.includes(f.replace(/\.js$/, ''))) : files;
if (!pick.length) { console.log('No topic files found' + (only.length ? ' for ' + only.join(', ') : '') + ' in ' + DIR); process.exit(only.length ? 1 : 0); }

const isStr = x => typeof x === 'string' && x.trim().length > 0;
const globalIds = new Map();
const rows = [];
let totalErr = 0;

for (const f of pick) {
  const fileId = f.replace(/\.js$/, '');
  const demo = fileId.startsWith('_');
  const errs = [], warns = [];
  const E = m => errs.push(m), W = m => warns.push(m);
  const floor = demo ? W : E;
  const got = [];
  const ctx = vm.createContext({ SCI: { registerTopic: t => got.push(t) }, console: { log() {}, warn() {}, error() {} } });
  try { vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f, timeout: 2000 }); }
  catch (e) { E('file does not run: ' + e.message); }
  if (got.length !== 1) E(`expected exactly 1 SCI.registerTopic call, got ${got.length}`);
  const t = got[0] || {};
  const items = Array.isArray(t.items) ? t.items : [];
  if (got.length) {
    if (t.id !== fileId) E(`topic id "${t.id}" does not match file name "${fileId}"`);
    if (!isStr(t.title)) E('missing title');
    if (!isStr(t.emoji)) E('missing emoji');
    if (!THEMES.includes(t.theme)) E(`theme "${t.theme}" not one of ${THEMES.join('|')}`);
    if (!isStr(t.moeRef)) W('missing moeRef');
    if (t.id === 'plant-parts' && t.extra !== true) W('plant-parts is P4 (2023 syllabus): set extra: true (shell keys off the id anyway)');
    const notes = Array.isArray(t.notes) ? t.notes : [];
    if (notes.length < 4 || notes.length > 10) floor(`notes: ${notes.length} cards (want 4-10)`);
    notes.forEach((n, i) => { if (!n || !isStr(n.title) || !isStr(n.body)) E(`notes[${i}] needs title and body`); });
    if (!Array.isArray(t.items)) E('items is not an array');
  }

  const local = new Set();
  let mcq = 0, oeq = 0, fig = 0, longestTell = 0;
  const lv = { 1: 0, 2: 0, 3: 0 }, ansDist = [0, 0, 0, 0];
  items.forEach((it, i) => {
    const tag = it && isStr(it.id) ? it.id : `items[${i}]`;
    if (!it || !isStr(it.id)) { E(`${tag}: missing id`); return; }
    if (local.has(it.id)) E(`${tag}: duplicate id in this topic`);
    else if (globalIds.has(it.id)) E(`${tag}: id also used in ${globalIds.get(it.id)}`);
    local.add(it.id); globalIds.set(it.id, fileId);
    if (![1, 2, 3].includes(it.level)) E(`${tag}: level must be 1, 2 or 3`); else lv[it.level]++;
    if (!isStr(it.stem)) E(`${tag}: missing stem`);
    if (it.figure != null) {
      if (!isStr(it.figure)) E(`${tag}: figure must be a string or null`);
      else {
        const fg = it.figure.trim();
        fig++;
        if (!/<(svg|table)\b/i.test(fg)) E(`${tag}: figure must be an inline <svg> or an HTML <table>`);
        else if (!/^<(svg|table|div)\b/i.test(fg)) W(`${tag}: figure has loose text before the <svg>/<table> (renders, but put setup text in the stem)`);
        if (/<script|\bon\w+\s*=|javascript:/i.test(fg)) E(`${tag}: figure contains script/handlers`);
        if (/(href|src)\s*=\s*["']?(https?:|\/\/)/i.test(fg) || /url\(\s*["']?https?:/i.test(fg)) E(`${tag}: figure references an external asset`);
        if (/<image\b/i.test(fg)) E(`${tag}: figure embeds an <image> (no photos/external images)`);
        if (/^<svg/i.test(fg) && !/viewBox=/i.test(fg)) W(`${tag}: svg has no viewBox (shell patches width/height, but add one)`);
        if (/^<svg/i.test(fg) && !/<text\b/i.test(fg)) W(`${tag}: svg has no <text> labels`);
        const fsz = [...fg.matchAll(/font-size\s*[=:]\s*["']?(\d+(?:\.\d+)?)/gi)].map(m => +m[1]);
        const vb = fg.match(/viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)/i);
        if (vb && fsz.length) {
          const scaled = Math.min(...fsz) * Math.min(1, 340 / +vb[1]);   /* ~340 px of figure width on a 390 px phone */
          if (scaled < 10) W(`${tag}: smallest label ~${scaled.toFixed(1)} px at phone width (viewBox ${vb[1]} wide)`);
        }
      }
    }
    if (it.type === 'mcq') {
      mcq++;
      const o = it.options;
      if (!Array.isArray(o) || o.length !== 4) E(`${tag}: mcq needs exactly 4 options`);
      else {
        if (!o.every(isStr)) E(`${tag}: empty option`);
        if (new Set(o.map(s => String(s).trim().toLowerCase())).size !== 4) E(`${tag}: duplicate options`);
        if (o.some(s => /\b(all|none) of the above\b/i.test(s))) W(`${tag}: "all/none of the above" option`);
        if (Number.isInteger(it.answer) && it.answer >= 0 && it.answer < 4) {
          ansDist[it.answer]++;
          const L = o.map(s => String(s).length), max = Math.max(...L);
          if (L[it.answer] === max && L.filter(x => x === max).length === 1 && max > 1.3 * Math.min(...L.filter((_, k) => k !== it.answer).map(x => x))) longestTell++;
        }
      }
      if (!(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < 4)) E(`${tag}: answer must be an integer 0-3`);
      if (!isStr(it.explain)) W(`${tag}: no explain`);
    } else if (it.type === 'oeq') {
      oeq++;
      if (!isStr(it.model)) E(`${tag}: oeq needs model`);
      if (!Number.isInteger(it.marks) || it.marks < 1 || it.marks > 4) E(`${tag}: marks must be 1-4`);
      const k = it.keys;
      if (!Array.isArray(k) || !k.length || !k.every(p => Array.isArray(p) && p.length && p.every(isStr))) E(`${tag}: keys must be a non-empty list of non-empty synonym lists`);
      else {
        if (Number.isInteger(it.marks) && k.length < it.marks) E(`${tag}: ${k.length} marking point(s) for ${it.marks} marks`);
        if (isStr(it.model)) k.forEach((p, j) => {
          if (!p.some(s => it.model.toLowerCase().includes(s.toLowerCase()))) W(`${tag}: key ${j + 1} [${p.join(' / ')}] not found in model answer`);
        });
      }
    } else E(`${tag}: type must be mcq or oeq`);
  });

  const n = items.length;
  if (n < 40) floor(`only ${n} items (need >= 40)`);
  if (n) {
    const mr = mcq / n;
    if (mr < 0.45 || mr > 0.75) W(`MCQ share ${Math.round(mr * 100)}% (target ~60%)`);
    if (!lv[1] || !lv[2] || !lv[3]) floor(`levels missing: L1 ${lv[1]} L2 ${lv[2]} L3 ${lv[3]}`);
    if (fig / n < 0.25) floor(`figure/table items ${Math.round(fig / n * 100)}% (need >= 25%)`);
    if (mcq >= 8) {
      if (Math.max(...ansDist) / mcq > 0.4) W(`answer positions skewed (1..4): ${ansDist.join('/')}`);
      if (longestTell / mcq > 0.35) W(`correct option is the clear longest in ${longestTell}/${mcq} MCQs`);
    }
  }
  totalErr += errs.length;
  rows.push({ fileId, n, mcq, oeq, lv, fig, notes: Array.isArray(t.notes) ? t.notes.length : 0, errs, warns, demo, extra: t.extra === true });
}

/* Classic <script> tags share ONE global lexical scope: a top-level const/let/class
   name declared in two topic files makes the second file throw on load in the
   browser, even though each file passes alone. Replay the page's load in one context. */
{
  const shared = vm.createContext({ SCI: { registerTopic() {} }, console: { log() {}, warn() {}, error() {} } });
  for (const f of files) {
    try { vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), shared, { filename: f, timeout: 2000 }); }
    catch (e) {
      const r = rows.find(x => x.fileId === f.replace(/\.js$/, ''));
      if (r && !r.errs.some(m => m.startsWith('file does not run'))) { r.errs.push('fails when loaded after the other topic files (shared global scope): ' + e.message); totalErr++; }
    }
  }
}

const pad = (s, w) => String(s).padEnd(w);
console.log(pad('topic', 16) + pad('items', 7) + pad('mcq/oeq', 9) + pad('L1/L2/L3', 11) + pad('fig%', 6) + pad('notes', 7) + 'result');
for (const r of rows) {
  const res = r.errs.length ? `FAIL (${r.errs.length} err, ${r.warns.length} warn)` : r.warns.length ? `ok (${r.warns.length} warn)` : 'ok';
  console.log(pad(r.fileId, 16) + pad(r.n, 7) + pad(`${r.mcq}/${r.oeq}`, 9) + pad(`${r.lv[1]}/${r.lv[2]}/${r.lv[3]}`, 11) +
    pad(r.n ? Math.round(r.fig / r.n * 100) : 0, 6) + pad(r.notes, 7) + res + (r.demo ? '  [demo]' : '') + (r.extra ? '  [extra]' : ''));
}
for (const r of rows) {
  if (!r.errs.length && !r.warns.length) continue;
  console.log(`\n${r.fileId}:`);
  r.errs.forEach(m => console.log('  ERROR ' + m));
  r.warns.forEach(m => console.log('  warn  ' + m));
}
console.log(`\n${rows.length} file(s), ${rows.reduce((a, r) => a + r.n, 0)} items, ${totalErr} error(s)`);
process.exit(totalErr ? 1 : 0);
