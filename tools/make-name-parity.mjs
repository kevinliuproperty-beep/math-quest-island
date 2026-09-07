#!/usr/bin/env node
/* Record a LEADERBOARD NAME PARITY CORPUS from the web's own rule.
 *
 * WHY THIS FILE EXISTS
 * `ios/Packages/MQServices/MQNameFilter` claims to carry `api/leaderboard.js`'s
 * name rule VERBATIM. On 2026-09-07 a refutation showed it did not: the web's
 * regex walks UTF-16 CODE UNITS, so decomposed "José" loses the combining
 * mark and keeps the "e" ("Jose"); Swift's `String.filter` walks GRAPHEME
 * CLUSTERS, so it threw the base letter away with the accent ("Jos"). 704 of
 * 3,043 unicode names diverged. A 4,010-name ASCII fuzz diverged on NOTHING,
 * which is exactly why the lane's own tests never saw it.
 *
 * A claim of "verbatim" between two runtimes needs a corpus, not a paragraph. So
 * this tool takes the rule OUT OF `api/leaderboard.js` ITSELF - the two lines are
 * lifted by line, not re-typed - runs 7,053 names through it in node, and commits
 * what the web said. `MQServicesTests` replays the same names through Swift and
 * must reproduce every one.
 *
 * PROVENANCE. `apiSha256` pins the corpus to the exact bytes of
 * `api/leaderboard.js` it was recorded from, and the Swift suite recomputes that
 * sha from the file on disk. Change the web's rule without regenerating and both
 * halves go red - the same pin the patchwerk scoring corpus carries.
 *
 * DETERMINISM. Every random name comes from a seeded mulberry32, so regenerating
 * reproduces the file byte for byte and a corpus diff means the RULE changed.
 *
 *   node tools/make-name-parity.mjs           -> tools/fixtures/leaderboard-names.json
 *   node tools/make-name-parity.mjs --check   -> non-zero if the committed corpus
 *                                                is not what api/leaderboard.js
 *                                                produces today
 */
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const API = path.join(ROOT, "api", "leaderboard.js");
const OUT = path.join(ROOT, "tools", "fixtures", "leaderboard-names.json");

const SEED = 20260907;
const ASCII_COUNT = 4010;
const UNICODE_COUNT = 3043;

/* ------------------------------------------------------------------ *
 * THE RULE, LIFTED FROM THE WEB FILE.                                 *
 * Not re-typed. If any of these three lines changes shape the match    *
 * fails and this tool throws, which is the loud failure we want - a    *
 * silently re-typed copy is the defect this corpus exists to catch.    *
 * ------------------------------------------------------------------ */
const apiBytes = fs.readFileSync(API);
const apiText = apiBytes.toString("utf8");

function lift(re, what) {
  const m = apiText.match(re);
  if (!m) {
    console.error("FAILED to lift " + what + " out of api/leaderboard.js.");
    console.error("  The web's name rule has changed shape. Read the file, update the");
    console.error("  matcher in tools/make-name-parity.mjs, and regenerate the corpus.");
    process.exit(1);
  }
  return m[0].trim();
}

const badLine = lift(/^const BAD = \[.*\];$/m, "the BAD list");
const nameLine = lift(/^\s*let name = String\(b\.name\|\|''\).*;$/m, "the name line");
const blockLine = lift(/^\s*if\(BAD\.some\(.*\) name = 'Hero';$/m, "the block-list line");

/* eslint-disable-next-line no-new-func */
const webClean = new Function(
  "b",
  badLine + "\n" + nameLine + "\n" + blockLine + "\nreturn name;"
);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const pick = (xs) => xs[Math.floor(rand() * xs.length) % xs.length];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

/* ------------------------------------------------------------------ *
 * ASCII: the half that already agreed. Kept as the regression floor.  *
 * ------------------------------------------------------------------ */

const ASCII_HAND = [
  "", " ", "   ", "Hero", "hero", "HERO",
  "Charlotte", "Ben", "Wei Jie", "Mary-Jane", "O'Brien", "d'Arcy",
  "_underscore_", "  padded  ", "\tTabbed\t", "\n\nnewlines\n\n",
  "0123456789", "01234567890123", "012345678901234", "0123456789012345",
  "exactly14chars", "fifteencharslong", "a", "ab",
  "!@#$%^&*()", "....", "----", "___", "-", "_",
  "Dickson", "Scunthorpe", "Shitake", "assholeish", "Cockburn",
  "fuck", "FUCK", "F u c k", "f-u-c-k", "shite", "niggle", "faggot",
  "  fuck  ", "notfuckhere", "xxfuckxx", "cunTry", "Dick", "dick",
  "whoreson", "slutty", "bitchen", "COCKtail",
  "Ben  Ten", "Ben\tTen", "Ben\rTen", "a b c d e f g h i j k l m n o p",
  "<script>", "SELECT * FROM", "'; DROP TABLE --", "%00", "\\x00",
  "Hero!", "!Hero", "H!e!r!o", "     Hero     ",
  "12345678901234567890", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
];

const ASCII_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" +
  "_ -" + "!@#$%^&*()+=[]{}|\\:;\"'<>,.?/~`" + "\t\n\r\f\v";

function randomAscii() {
  const n = between(0, 24);
  let s = "";
  for (let i = 0; i < n; i++) s += pick(ASCII_ALPHABET.split(""));
  /* Sprinkle real blocked words in, so the block list is exercised at every
     position rather than only where a fuzz happens to spell one. */
  if (rand() < 0.08) {
    const w = pick(["fuck", "shit", "bitch", "cunt", "dick", "cock", "nigg",
                    "fag", "slut", "whore", "asshole"]);
    const at = between(0, s.length);
    s = s.slice(0, at) + w + s.slice(at);
  }
  return s;
}

/* ------------------------------------------------------------------ *
 * UNICODE: the half that diverged. NFD is the whole point - the same  *
 * name in both normal forms, plus scripts, marks and non-BMP.         *
 * ------------------------------------------------------------------ */

const NAMES_LATIN = [
  "José", "José", "Zoë", "Zoë", "Angström",
  "Ångström", "café", "café", "Beyoncé",
  "Renée", "Renée", "Chloé", "Chloé", "Niño",
  "Niño", "François", "François", "Müller",
  "Müller", "Škoda", "Škoda", "Łódź",
  "Hùng", "Hừng", "Đặng", "Søren", "Ælfred",
  "Özil", "Oz̈il", "René-Jean", "Anaïs", "Anaïs"
];

const NAMES_SCRIPT = [
  "张伟", "李娜", "王小明", "さくら",
  "한글", "Анна", "Αλέξης",
  "שלום", "محمد", "สวัสดี",
  "नमस्ते", "அம்மா",
  "ក្មែ", "გამარჯობა"
];

const NAMES_EXOTIC = [
  "🦄", "🦄🦄", "Hero🦄",
  "👩‍👩‍👧", "🇦🇺",
  "​Hero​", "‎‏Hero", "﻿Hero", " Hero ",
  "　Hero　", "H́̂̃̄éŕó",
  "é́́́́́", "́", "́́́",
  "é".repeat(20), "é".repeat(20), "𝑽𝒂𝒍",
  "Ｈｅｒｏ", "①②③", "ⅠⅡⅢ",
  "Ｈｅｒｏ", "ᵛᵉʳᵒ", "ñ", "ñ",
  "fúck", "s̱hit", "bıtch", "ｆｕｃｋ"
];

const MARKS = ["̀", "́", "̂", "̃", "̈", "̊",
               "̧", "̨", "̱", "̵", "⃣", "҉"];
const BASES = "aeiounycszAEIOUNYCSZ".split("");
const NONBMP = ["🦄", "😀", "🌊", "𝐀",
                "💥", "𐌀"];

function randomUnicode() {
  const kind = between(0, 5);
  if (kind === 0) return pick(NAMES_LATIN);
  if (kind === 1) return pick(NAMES_SCRIPT);
  if (kind === 2) return pick(NAMES_EXOTIC);
  if (kind === 3) {
    /* A decomposed word: ASCII bases each carrying a combining mark. */
    let s = "";
    for (let i = 0, n = between(1, 12); i < n; i++) {
      s += pick(BASES);
      if (rand() < 0.75) s += pick(MARKS);
      if (rand() < 0.12) s += " ";
    }
    return s;
  }
  if (kind === 4) {
    /* ASCII with non-BMP characters spliced in - two disallowed UTF-16 units
       on the web, one disallowed scalar in Swift. They must agree. */
    let s = "";
    for (let i = 0, n = between(1, 14); i < n; i++) {
      s += rand() < 0.3 ? pick(NONBMP) : pick("abcdefghijklmnopqrstuvwxyz -_".split(""));
    }
    return s;
  }
  /* Whole-BMP fuzz, surrogates excluded so nothing here is a lone half. */
  let s = "";
  for (let i = 0, n = between(1, 18); i < n; i++) {
    let cp = between(1, 0xfffd);
    if (cp >= 0xd800 && cp <= 0xdfff) cp = 0x41;
    s += String.fromCodePoint(cp);
  }
  return s;
}

function fill(hand, generator, target) {
  const out = [];
  const seen = new Set();
  const push = (raw) => {
    if (seen.has(raw)) return;
    seen.add(raw);
    out.push(raw);
  };
  for (const h of hand) push(h);
  let guard = 0;
  while (out.length < target && guard++ < target * 200) push(generator());
  if (out.length !== target) {
    console.error("could not reach " + target + " distinct names (got " + out.length + ")");
    process.exit(1);
  }
  return out;
}

const asciiRaw = fill(ASCII_HAND, randomAscii, ASCII_COUNT);
const unicodeRaw = fill(
  [...NAMES_LATIN, ...NAMES_SCRIPT, ...NAMES_EXOTIC], randomUnicode, UNICODE_COUNT);

const cases = [...asciiRaw, ...unicodeRaw].map((raw) => ({
  raw,
  web: webClean({ name: raw })
}));

const corpus = {
  schema: "leaderboard-names/1",
  generator: "tools/make-name-parity.mjs",
  source: "api/leaderboard.js",
  apiSha256: createHash("sha256").update(apiBytes).digest("hex"),
  seed: SEED,
  asciiCount: ASCII_COUNT,
  unicodeCount: UNICODE_COUNT,
  caseCount: cases.length,
  /* The two lines the rule was lifted from, recorded so a reviewer can see WHAT
     was executed without running node. */
  rule: [nameLine, blockLine],
  cases
};

const text = JSON.stringify(corpus) + "\n";

if (process.argv.includes("--check")) {
  if (!fs.existsSync(OUT)) {
    console.error("MISSING: " + path.relative(ROOT, OUT));
    process.exit(1);
  }
  const have = fs.readFileSync(OUT, "utf8");
  if (have !== text) {
    console.error("STALE: " + path.relative(ROOT, OUT) + " is not what api/leaderboard.js produces today.");
    console.error("  Run: node tools/make-name-parity.mjs   (and commit the result)");
    process.exit(1);
  }
  const heroes = cases.filter((c) => c.web === "Hero").length;
  console.log("leaderboard name corpus is current: " + cases.length + " names (" +
              ASCII_COUNT + " ascii, " + UNICODE_COUNT + " unicode, " +
              heroes + " fall back to Hero).");
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
console.log("wrote " + path.relative(ROOT, OUT));
console.log("  names           " + cases.length + " (" + ASCII_COUNT + " ascii, " +
            UNICODE_COUNT + " unicode)");
console.log("  fell back       " + cases.filter((c) => c.web === "Hero").length + " to Hero");
console.log("  api sha256      " + corpus.apiSha256.slice(0, 16));
