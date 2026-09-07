/* Build the Math Quest Island engine bundle.
 *
 * The web app is zero-build: index.html document.write()s a hand-maintained list
 * of script tags. The iOS app cannot load 30 script tags into JavaScriptCore, so
 * this tool concatenates the SAME files, IN THE SAME ORDER, into one file:
 *
 *     dist/engine.bundle.js
 *     ios/Packages/MQEngineJS/Sources/MQEngineJS/Resources/engine.bundle.js
 *
 * The order is read out of index.html's `files` manifest - never hand-listed here -
 * so the bundle can never drift from what the browser loads. If a js/topics/*.js
 * exists on disk but is missing from that manifest (or vice versa) the build FAILS:
 * a topic that ships to the web and not to iOS, or the reverse, is the whole class
 * of bug this check exists to kill.
 *
 * The bundle is engine-only: js/core.js + js/topics/*.js + js/registry.js. The app
 * shell (js/app.js, js/boot.js) and the mode files are UI/session concerns that the
 * native app reimplements in Swift; they are deliberately NOT bundled.
 *
 * Around the engine sources it wraps:
 *   - a host shim (top) so the bundle runs with no window and no document,
 *   - MQI_API (bottom), a JSON-string-in / JSON-string-out surface for the Swift
 *     bridge (see ios/Packages/MQEngineJS),
 *   - an ENGINE_BUILD stamp line: date + git short SHA + a hash of the engine
 *     payload, so a running app can say exactly which engine it played and
 *     tools/engine-api-test.mjs can prove a committed bundle is not stale.
 *
 * Run:  node tools/build-engine.mjs     (or: npm run build:engine)
 *       --check   build in memory and exit 1 if the committed outputs differ
 *                 in payload (the stamp itself is allowed to differ)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

/* The Swift package resource is the COMMITTED artifact: SwiftPM and Xcode need the
 * bundle on disk, and neither should have to run Node first. dist/ is the convenience
 * copy for the web / for a harness, is regenerable in one command, and is gitignored -
 * so `--check` treats a missing dist/ as fine and a missing or stale ios/ copy as a
 * failure. */
const CANONICAL = 'ios/Packages/MQEngineJS/Sources/MQEngineJS/Resources/engine.bundle.js';
const OUTPUTS = [CANONICAL, 'dist/engine.bundle.js'];

/* ---------- 1. read the script manifest out of index.html ---------- */
function readManifest() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/var\s+files\s*=\s*\[([\s\S]*?)\];/);
  if (!m) throw new Error('index.html: could not find the `var files = [ ... ];` script manifest');
  const files = [];
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const q = line.match(/"([^"]+)"/);
    if (q) files.push(q[1]);
  }
  if (!files.length) throw new Error('index.html: script manifest parsed empty');
  return files;
}

/* ---------- 2. pick the engine files out of it, and cross-check topics ----------
 * An EXCLUSION list, not an inclusion one, and deliberately so: a new engine-side file
 * (js/figures.js, say) must reach iOS automatically. Only the app shell and the mode
 * files are held back - they are UI/session concerns the native app rewrites in Swift.
 */
const NOT_ENGINE = f => f === 'js/app.js' || f === 'js/boot.js' || f.startsWith('js/modes/');

function engineFilesFrom(manifest) {
  const wanted = manifest.filter(f => !NOT_ENGINE(f));
  if (wanted[0] !== 'js/core.js') {
    throw new Error('index.html manifest: js/core.js must be the first engine file (got ' + wanted[0] + ')');
  }
  if (!wanted.includes('js/registry.js')) {
    throw new Error('index.html manifest: js/registry.js is missing from the engine files');
  }
  /* registry.js reads MQI.topics (skillsFor, the playable-node derivation), so every
     topic file has to be registered before it runs. */
  const lastTopicAt = wanted.reduce((n, f, i) => (f.startsWith('js/topics/') ? i : n), -1);
  if (wanted.indexOf('js/registry.js') < lastTopicAt) {
    throw new Error('index.html manifest: js/registry.js must load AFTER every js/topics/*.js');
  }
  const onDisk = fs.readdirSync(path.join(ROOT, 'js/topics'))
    .filter(f => f.endsWith('.js')).map(f => 'js/topics/' + f).sort();
  const inManifest = wanted.filter(f => f.startsWith('js/topics/')).slice().sort();

  const missingFromManifest = onDisk.filter(f => !inManifest.includes(f));
  const missingFromDisk = inManifest.filter(f => !onDisk.includes(f));
  const errs = [];
  if (missingFromManifest.length) {
    errs.push('topic file(s) on disk but NOT in index.html\'s script manifest: ' + missingFromManifest.join(', ')
      + '\n  (a topic that is not in the manifest never reaches the browser; add the script tag before bundling)');
  }
  if (missingFromDisk.length) {
    errs.push('topic file(s) in index.html\'s script manifest but NOT on disk: ' + missingFromDisk.join(', '));
  }
  const dupes = inManifest.filter((f, i) => inManifest.indexOf(f) !== i);
  if (dupes.length) errs.push('topic file(s) listed twice in the manifest: ' + [...new Set(dupes)].join(', '));
  if (errs.length) throw new Error('build-engine: manifest/disk mismatch\n- ' + errs.join('\n- '));

  for (const f of wanted) {
    if (!fs.existsSync(path.join(ROOT, f))) throw new Error('build-engine: manifest lists a missing file: ' + f);
  }
  return wanted;
}

/* ---------- 3. shim + API text ---------- */
function readPart(name) {
  return fs.readFileSync(path.join(ROOT, 'tools/engine', name), 'utf8');
}

/* ---------- 4. build ---------- */
function build() {
  const manifest = readManifest();
  const files = engineFilesFrom(manifest);

  const shim = readPart('host-shim.js');
  const api = readPart('api.js');

  const parts = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    parts.push('/* ===== ' + f + ' ===== */\n' + src + '\n');
  }
  const engineBody = parts.join('\n');

  /* the payload hash covers the engine sources + shim + api, NOT the stamp, so a
     rebuild on a different day / SHA does not read as a content change. */
  const payload = shim + '\n' + engineBody + '\n' + api;
  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);

  let sha = 'nogit';
  try {
    sha = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch { /* not a git checkout: keep 'nogit' */ }
  let dirty = false;
  try {
    const st = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--', 'js', 'tools/engine', 'index.html'],
      { encoding: 'utf8' });
    dirty = st.trim().length > 0;
  } catch { /* ignore */ }

  const d = new Date();
  const p2 = n => String(n).padStart(2, '0');
  const date = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const stamp = date.replace(/-/g, '') + '-' + sha + (dirty ? '-dirty' : '');

  const meta = {
    stamp, date, sha, dirty, payloadHash,
    files, fileCount: files.length,
    topicFileCount: files.filter(f => f.startsWith('js/topics/')).length,
    generator: 'tools/build-engine.mjs'
  };

  const header =
    '/* Math Quest Island engine bundle. GENERATED by tools/build-engine.mjs - DO NOT EDIT.\n' +
    ' * Edit js/core.js, js/topics/*.js or js/registry.js and re-run `npm run build:engine`.\n' +
    ' * Load order is index.html\'s own script manifest; the app shell and modes are not bundled.\n' +
    ' */\n' +
    '/* ENGINE_BUILD ' + stamp + ' */\n' +
    '/* ENGINE_BUILD_META ' + JSON.stringify(meta) + ' */\n' +
    'var MQI_ENGINE_META = ' + JSON.stringify(meta, null, 0) + ';\n';

  const text = header + '\n' + shim + '\n' + engineBody + '\n' + api + '\n/* ENGINE_BUILD_END ' + stamp + ' */\n';
  return { text, meta, payloadHash };
}

function payloadHashOf(text) {
  const m = String(text).match(/\/\* ENGINE_BUILD_META (\{[\s\S]*?\}) \*\//);
  if (!m) return null;
  try { return JSON.parse(m[1]).payloadHash; } catch { return null; }
}

/* A manifest/disk mismatch is a normal, actionable outcome (someone added a topic file
   and forgot the script tag), not a crash: report it in one line, not a stack trace. */
let built;
try {
  built = build();
} catch (e) {
  console.error(String((e && e.message) || e));
  process.exit(1);
}

if (CHECK) {
  let bad = 0;
  for (const out of OUTPUTS) {
    const p = path.join(ROOT, out);
    if (!fs.existsSync(p)) {
      if (out === CANONICAL) { console.error('MISSING  ' + out + '  (run: npm run build:engine)'); bad++; }
      else { console.log('absent   ' + out + '  (gitignored build output, fine)'); }
      continue;
    }
    const have = payloadHashOf(fs.readFileSync(p, 'utf8'));
    if (have !== built.payloadHash) {
      console.error('STALE    ' + out + '  payload ' + have + ' != ' + built.payloadHash + '  (run: npm run build:engine)');
      bad++;
    } else {
      console.log('fresh    ' + out + '  payload ' + have);
    }
  }
  process.exit(bad ? 1 : 0);
}

for (const out of OUTPUTS) {
  const p = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, built.text);
  console.log('wrote    ' + out + '  ' + (built.text.length / 1024).toFixed(1) + ' kB');
}
console.log('stamp    ' + built.meta.stamp + (built.meta.dirty ? '  (working tree dirty)' : ''));
console.log('files    ' + built.meta.fileCount + ' engine files (' + built.meta.topicFileCount + ' topics)');
console.log('payload  ' + built.payloadHash);
