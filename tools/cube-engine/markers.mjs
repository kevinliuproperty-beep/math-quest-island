/* markers.mjs - ONE definition of what a Cube Quest block marker is.
 *
 * WOUND 6 of the extract refutation, in one line: the extractor and its own gate matched
 * markers by DIFFERENT RULES. `build-cube-engine.mjs` required a whole-line match;
 * `cube-engine-sanity.mjs`'s BLOCK_RE was a free non-greedy regex with no anchors. An
 * INDENTED end marker planted inside CORE therefore built, `--check`ed
 * and `--record-guard`ed clean, and was caught only because the two tools then disagreed
 * about the block's bytes. A check that fires because two tools disagree is not a check:
 * it happens to be loud today and it is silent the moment somebody makes the two agree.
 *
 * So there is now exactly one matcher and every tool imports it:
 *
 *     tools/build-cube-engine.mjs      the extractor
 *     cube/tools/cube-engine-sanity.mjs the gate
 *     cube/tools/cube-engine-probe.mjs  the value probe
 *     tools/make-cube-api-golden.mjs    the golden recorder
 *
 * THE RULE. A marker is a WHOLE LINE, matched byte for byte, with nothing before it on
 * that line and nothing after it. `\r` is not whitespace to be forgiven: a CRLF file is a
 * different file and the extractor says so rather than shipping a block whose bytes are
 * not the ones cube/index.html holds.
 */

export const BLOCKS = ['CORE', 'CORE3', 'INFER', 'GUIDE'];

export const MARKER = name => ({
  start: `/* ===== ${name} START =====`,
  end: `/* ===== ${name} END ===== */`
});

/** Escape a literal for use inside a RegExp. */
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * A LINE-ANCHORED regex for one block, start marker through end marker inclusive.
 * `^`/`$` with the `m` flag is the whole point: an indented or trailing-space marker is
 * not this marker, and both tools now agree about that because they call this function.
 */
export function blockRegex(name, flags = '') {
  const { start, end } = MARKER(name);
  return new RegExp('^' + esc(start) + '$[\\s\\S]*?^' + esc(end) + '$', 'm' + flags);
}

/** Every block's line-anchored regex, keyed by name. */
export function blockRegexes(flags = '') {
  const out = {};
  for (const name of BLOCKS) out[name] = blockRegex(name, flags);
  return out;
}

/**
 * Every occurrence of every block in `text`, by whole-line marker match.
 *
 * Returns `{ CORE: [text, ...], ... }`. More than one occurrence is the DUPLICATED
 * failure the extractor names; zero is MISSING. Callers assert; this only counts.
 */
export function allBlocks(text) {
  const out = {};
  for (const name of BLOCKS) {
    out[name] = [];
    const re = blockRegex(name, 'g');
    let m;
    while ((m = re.exec(text))) { out[name].push(m[0]); if (m.index === re.lastIndex) re.lastIndex++; }
  }
  return out;
}

/**
 * Locate the four blocks in a source file, line by line, and report every structural
 * problem rather than the first one.
 *
 * `{ found: { NAME: {startLine, endLine, text, before, after} }, errors: [string] }`
 * Line numbers are ZERO-BASED here; callers that print add one.
 */
export function locateBlocks(text, { context = 3 } = {}) {
  const lines = text.split('\n');
  const found = {};
  const errors = [];

  for (const name of BLOCKS) {
    const { start, end } = MARKER(name);
    const starts = [], ends = [];
    for (let i = 0; i < lines.length; i++) {
      /* whole-line, byte for byte. A trailing space, a leading space or a \r is a
         different line and therefore not this marker. */
      if (lines[i] === start) starts.push(i);
      if (lines[i] === end) ends.push(i);
    }
    if (starts.length === 0) errors.push(`marker MISSING: "${start}" appears nowhere as a whole line`);
    if (ends.length === 0) errors.push(`marker MISSING: "${end}" appears nowhere as a whole line`);
    if (starts.length > 1) errors.push(`marker DUPLICATED: "${start}" appears ${starts.length} times (lines ${starts.map(n => n + 1).join(', ')})`);
    if (ends.length > 1) errors.push(`marker DUPLICATED: "${end}" appears ${ends.length} times (lines ${ends.map(n => n + 1).join(', ')})`);
    if (starts.length !== 1 || ends.length !== 1) continue;
    if (ends[0] < starts[0]) {
      errors.push(`marker ORDER: "${end}" (line ${ends[0] + 1}) comes before "${start}" (line ${starts[0] + 1})`);
      continue;
    }
    found[name] = { startLine: starts[0], endLine: ends[0] };
  }

  /* disjoint and in file order: a nested marker means one block swallowed another */
  let prevEnd = -1, prevName = null;
  for (const name of BLOCKS) {
    const b = found[name];
    if (!b) continue;
    if (b.startLine <= prevEnd) {
      errors.push(`block ${name} starts at line ${b.startLine + 1}, inside block ${prevName} `
        + `which ends at line ${prevEnd + 1}. The four blocks must be disjoint and in the `
        + `order ${BLOCKS.join(', ')}.`);
    }
    prevEnd = b.endLine; prevName = name;
  }

  for (const name of BLOCKS) {
    const b = found[name];
    if (!b) continue;
    b.text = lines.slice(b.startLine, b.endLine + 1).join('\n');
    b.before = lines.slice(Math.max(0, b.startLine - context), b.startLine);
    b.after = lines.slice(b.endLine + 1, Math.min(lines.length, b.endLine + 1 + context));
  }
  return { found, errors };
}
