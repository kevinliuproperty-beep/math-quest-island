/* Unit test for the typed-answer grader (MQI.gradeTyped / MQI.parseTypedAnswer).
 *
 * The second kill of the P3 pilot refutation: js/app.js compared typed answers
 * with parseInt(v,10) === Q.answer, so every decimal money answer was marked
 * wrong. The grader now lives in js/core.js, DOM-free, and this file is the
 * gate on it. Wired into `npm test`, runs before gen-sanity.
 *
 * Run: node tools/answer-parse-test.mjs
 * Exit: 0 all pass, 1 on any failure.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { Math, console, Number, Array, Set, Map, JSON, String, Object, Boolean, Error, isNaN, parseInt, parseFloat };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8'), ctx, { filename: 'js/core.js' });
const { gradeTyped, parseTypedAnswer } = ctx.MQI;

/* [ typed input, question, expected, why ] */
const money   = { answer: 2.5 };
const money2  = { answer: 4.75 };
const bigInt  = { answer: 1200 };
const km      = { answer: 3, unit: 'km' };
const half    = { answer: 0.5 };
const vol     = { answer: 250, unit: 'cm3' };
const litre   = { answer: 1.5, unit: 'l' };
const pct     = { answer: 25, unit: '%' };
const dp2     = { answer: 3.456, dp: 2 };
const frac    = { answer: 0.75, fracAnswer: [3, 4] };
const plain   = { answer: 42 };

const CASES = [
  /* --- the kill: decimal money typed correctly must be RIGHT --- */
  ['2.50',      money,  true,  'money, trailing zero'],
  ['$2.50',     money,  true,  'money with dollar sign'],
  ['2.5',       money,  true,  'money, bare'],
  ['  2.5  ',   money,  true,  'money, surrounding whitespace'],
  ['$ 2.50',    money,  true,  'dollar sign with a space'],
  ['4.75',      money2, true,  'the parseInt kill case verbatim'],
  ['4',         money2, false, 'what parseInt("4.75") used to compare'],
  /* --- thousands separators --- */
  ['1,200',     bigInt, true,  'comma thousands separator'],
  ['1200',      bigInt, true,  'bare thousands'],
  ['$1,200.00', bigInt, true,  'dollar + comma + trailing zeros'],
  /* --- units the question declares --- */
  ['3 km',      km,     true,  'unit with a space'],
  ['3km',       km,     true,  'unit without a space'],
  ['3KM',       km,     true,  'unit, case-insensitive'],
  ['3',         km,     true,  'bare number when a unit is declared'],
  ['3 m',       km,     false, 'wrong declared unit is wrong'],
  ['250 cm3',   vol,    true,  'cubic centimetres, ascii'],
  ['250 cm³', vol, true,  'cubic centimetres, superscript'],
  ['1.5 ℓ', litre, true,  'litre sign'],
  ['1.5 L',     litre,  true,  'capital L litre'],
  ['25%',       pct,    true,  'percent suffix'],
  ['500 g',     { answer: 500, unit: 'g' }, true, 'grams'],
  ['2 kg',      { answer: 2, unit: 'kg' },  true, 'kilograms, not eaten by the g rule'],
  ['300 ml',    { answer: 300, unit: 'ml' }, true, 'millilitres, not eaten by the l rule'],
  /* --- decimals and tolerance --- */
  ['0.5',       half,   true,  'leading zero decimal'],
  ['.5',        half,   true,  'bare-point decimal'],
  ['0.50',      half,   true,  'trailing zero decimal'],
  ['0.51',      half,   false, 'outside the 0.005 money tolerance'],
  ['0.504',     half,   true,  'inside the 0.005 money tolerance'],
  ['2.6',       money,  false, 'near miss must be WRONG'],
  ['2.499',     money,  true,  'inside the 0.005 money tolerance'],
  ['3.456',     dp2,    true,  'declared dp, exact'],
  ['3.46',      dp2,    true,  'declared dp, rounded to 2dp'],
  ['3.44',      dp2,    false, 'declared dp, rounds to the wrong 2dp'],
  ['42.0',      plain,  true,  'integer typed with a decimal point'],
  ['42.4',      plain,  false, 'integer answer takes no slack'],
  /* --- fractions --- */
  ['3/4',       frac,   true,  'typed fraction, reduced'],
  ['6/8',       frac,   true,  'typed fraction, unreduced, cross-multiplied'],
  ['0.75',      frac,   true,  'fraction answered as a decimal'],
  ['2/3',       frac,   false, 'wrong fraction'],
  /* --- rejects --- */
  ['',          money,  false, 'empty string is never correct'],
  ['   ',       money,  false, 'whitespace only'],
  [null,        money,  false, 'null input'],
  [undefined,   money,  false, 'undefined input'],
  ['abc',       money,  false, 'letters'],
  ['2.5.1',     money,  false, 'malformed number'],
  ['two',       plain,  false, 'a word, not a number'],
  ['$',         money,  false, 'dollar sign alone'],
  ['NaN',       plain,  false, 'the literal NaN'],
  ['Infinity',  plain,  false, 'the literal Infinity'],
  ['1e3',       bigInt, false, 'exponent notation is not a P3 answer']
];

let pass = 0, fail = 0;
for (const [input, q, want, why] of CASES) {
  let got;
  try { got = gradeTyped(input, q); } catch (e) { got = 'THREW: ' + e.message; }
  if (got === want) { pass++; }
  else {
    fail++;
    console.log(`FAIL  gradeTyped(${JSON.stringify(input)}, ${JSON.stringify(q)}) -> ${got}, want ${want}   (${why})`);
  }
}

/* parseTypedAnswer surface, checked directly */
const P = [
  ['$2.50', 2.5, ''],
  ['1,200', 1200, ''],
  ['3 km', 3, 'km'],
  [' 0.5 ', 0.5, '']
];
for (const [input, val, unit] of P) {
  const r = parseTypedAnswer(input);
  if (!r.ok || r.value !== val || r.unit !== unit) {
    fail++; console.log(`FAIL  parseTypedAnswer(${JSON.stringify(input)}) -> ${JSON.stringify(r)}, want value ${val} unit "${unit}"`);
  } else pass++;
}

console.log(`\nanswer-parse-test: ${pass} passed, ${fail} failed, ${pass + fail} cases`);
process.exit(fail ? 1 : 0);
