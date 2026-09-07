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
  ['1e3',       bigInt, false, 'exponent notation is not a P3 answer'],

  /* ================= WAVE 2 ================= */
  /* --- KILL 1: units the rate stems name were rejected outright --- */
  ['30 pages',  { answer: 30, unit: 'pages' },  true,  'W2: pages, the gFindRate kill'],
  ['30pages',   { answer: 30, unit: 'pages' },  true,  'W2: pages, no space'],
  ['30 Pages',  { answer: 30, unit: 'pages' },  true,  'W2: pages, case-insensitive'],
  ['10 min',    { answer: 10, unit: 'min' },    true,  'W2: min, the gFindUnits kill'],
  ['10 mins',   { answer: 10, unit: 'min' },    true,  'W2: mins alias of min'],
  ['10 minutes',{ answer: 10, unit: 'min' },    true,  'W2: minutes alias of min'],
  ['3870 buns', { answer: 3870, unit: 'buns' }, true,  'W2: buns, the gHourAndMinutes kill'],
  ['3870',      { answer: 3870, unit: 'buns' }, true,  'W2: bare number still fine when a unit is declared'],
  ['126°',      { answer: 126, unit: '°' },     true,  'W2: degree sign'],
  ['126 deg',   { answer: 126, unit: '°' },     true,  'W2: deg is the degree sign'],
  ['126 degrees',{ answer: 126, unit: '°' },    true,  'W2: degrees is the degree sign'],
  ['90 h',      { answer: 90, unit: 'h' },      true,  'W2: hours short form'],
  ['2 hours',   { answer: 2, unit: 'hr' },      true,  'W2: hours vs hr alias'],
  ['45 s',      { answer: 45, unit: 's' },      true,  'W2: seconds short form'],
  ['45 sec',    { answer: 45, unit: 'sec' },    true,  'W2: sec'],
  ['255 l',     { answer: 255, unit: 'l' },     true,  'W2: litres for the tap items'],
  ['1.80',      { answer: 1.8, unit: '$' },     true,  'W2: laundry money, unit declared as $'],
  ['$1.80',     { answer: 1.8, unit: '$' },     true,  'W2: laundry money with the sign'],
  /* --- KILL 2: finishTyped now declares a unit, so a WRONG unit is rejected --- */
  ['113 cm²',   { answer: 113, unit: 'cm²' },   true,  'W2: correct area unit'],
  ['113 cm2',   { answer: 113, unit: 'cm²' },   true,  'W2: ascii cm2 is cm squared'],
  ['113 cm',    { answer: 113, unit: 'cm²' },   false, 'W2 THE KILL: cm must NOT grade correct for a cm² answer'],
  ['45 cm',     { answer: 45, unit: 'cm²' },    false, 'W2 THE KILL: 45 cm against a cm² answer'],
  ['46 cm²',    { answer: 46, unit: 'cm' },     false, 'W2: cm² must NOT grade correct for a perimeter in cm'],
  ['113',       { answer: 113, unit: 'cm²' },   true,  'W2: a MISSING unit stays accepted'],
  ['30 min',    { answer: 30, unit: 'pages' },  false, 'W2: min is not pages'],
  ['46x',       plain,  false, 'W2: junk suffix on an undeclared-unit question stays wrong'],
  ['42 buns',   plain,  true,  'W2: a unit on the shared list is stripped even when none is declared'],
  /* --- KILL 3: mixed numbers, improper fractions and decimals interchange --- */
  ['1 1/2',     { answer: 1.5, fracAnswer: [3, 2] }, true,  'W2: mixed number'],
  ['3/2',       { answer: 1.5, fracAnswer: [3, 2] }, true,  'W2: improper fraction'],
  ['1.5',       { answer: 1.5, fracAnswer: [3, 2] }, true,  'W2: decimal form'],
  ['6/4',       { answer: 1.5, fracAnswer: [3, 2] }, true,  'W2: unreduced improper, reduced before compare'],
  ['1 2/4',     { answer: 1.5, fracAnswer: [3, 2] }, true,  'W2: unreduced mixed number'],
  ['1 1/3',     { answer: 1.5, fracAnswer: [3, 2] }, false, 'W2 REJECT: 1 1/3 is not 1.5'],
  ['1 1/2',     { answer: 1.5 },                     true,  'W2: mixed number against a plain decimal answer'],
  ['3/2',       { answer: 1.5 },                     true,  'W2: improper against a plain decimal answer'],
  ['2 1/4',     { answer: 2.25, fracAnswer: [9, 4] },true,  'W2: mixed number, quarters'],
  ['9/4',       { answer: 2.25, fracAnswer: [9, 4] },true,  'W2: improper, quarters'],
  ['2 1/4 cm',  { answer: 2.25, fracAnswer: [9, 4], unit: 'cm' }, true, 'W2: mixed number carrying its unit'],
  ['1 1/0',     { answer: 1.5, fracAnswer: [3, 2] }, false, 'W2: mixed number over zero'],
  ['1 1',       plain, false, 'W2: two bare numbers is not a mixed number'],
  ['3 3/4',     { answer: 0.75, fracAnswer: [3, 4] }, false, 'W2: whole part must count'],

  /* ================= UNIT SWEEP REFUTATION (2026-09-07) ================= */
  /* --- W2: EQUIVALENT UNITS. q.unit may be an ARRAY; any member is accepted, the
         FIRST is canonical. 1 ml IS 1 cm³ and the three p5volume stems print that
         identity themselves, so declaring one of the pair rejected a child who had
         done the arithmetic AND understood the identity. --- */
  ['3170 cm³',  { answer: 3170, unit: ['cm³', 'ml'] }, true,  'W2: the canonical member'],
  ['3170 cm3',  { answer: 3170, unit: ['cm³', 'ml'] }, true,  'W2: ascii spelling of the canonical member'],
  ['3170 ml',   { answer: 3170, unit: ['cm³', 'ml'] }, true,  'W2 THE REGRESSION: ml on a cm³ answer, 1 ml = 1 cm³'],
  ['3170 mL',   { answer: 3170, unit: ['cm³', 'ml'] }, true,  'W2: mL aliases to ml'],
  ['3170',      { answer: 3170, unit: ['cm³', 'ml'] }, true,  'W2: a bare number is still always accepted'],
  ['3170 kg',   { answer: 3170, unit: ['cm³', 'ml'] }, false, 'W2: a unit OUTSIDE the set is still rejected'],
  ['3170 cm',   { answer: 3170, unit: ['cm³', 'ml'] }, false, 'W2: cm is not cm³, array or not'],
  ['3171 ml',   { answer: 3170, unit: ['cm³', 'ml'] }, false, 'W2: an equivalent unit does not excuse a wrong value'],
  ['4000 cm3',  { answer: 4000, unit: ['ml', 'cm³'] }, true,  'W2: gTankLitres, cm³ on an ml answer'],
  ['4000 ml',   { answer: 4000, unit: ['ml', 'cm³'] }, true,  'W2: gTankLitres, its own canonical unit'],
  /* --- W3: gUnitCubes. "48 cubes" and "48 cm³" are the same quantity written two
         ways and both are right; the opt-out that used to cover this rejected
         "48 cubes" while ACCEPTING "48 kg". --- */
  ['48 cubes',  { answer: 48, unit: ['cubes', 'cm³'] }, true,  'W3: the count noun, which the opt-out rejected'],
  ['48 cm³',    { answer: 48, unit: ['cubes', 'cm³'] }, true,  'W3: 1 cm cubes, so cm³ means the same quantity'],
  ['48 cm3',    { answer: 48, unit: ['cubes', 'cm³'] }, true,  'W3: ascii cm3'],
  ['48',        { answer: 48, unit: ['cubes', 'cm³'] }, true,  'W3: a bare count'],
  ['48 kg',     { answer: 48, unit: ['cubes', 'cm³'] }, false, 'W3 THE HOLE: the opt-out accepted this'],
  ['48 pupils', { answer: 48, unit: ['cubes', 'cm³'] }, false, 'W3: and this'],
  /* --- the TRAILING FULL STOP: the one correct-value rejection a child can reach
         on the iPad keypad, where inputmode="decimal" offers digits and a dot and
         no letters at all. "41." was always fine; "41.10." was not. --- */
  ['41.10.',    { answer: 41.1 },  true,  'trailing dot after a decimal, the iPad keypad case'],
  ['41.1.',     { answer: 41.1 },  true,  'trailing dot, one dp'],
  ['41.',       { answer: 41 },    true,  'trailing dot on an integer, as before'],
  ['$12.05.',   { answer: 12.05, unit: '$' }, true, 'trailing dot on money, sign and all'],
  ['300.',      { answer: 300, unit: 'cm²' }, true, 'trailing dot with a declared unit'],
  ['3170. ml',  { answer: 3170, unit: ['cm³', 'ml'] }, true, 'trailing dot under the unit'],
  ['41.10.',    { answer: 41.2 },  false, 'the dot is forgiven, the value is not'],
  ['.',         { answer: 41.1 },  false, 'a lone dot is not a number'],
  ['3/4.',      { answer: 0.75, fracAnswer: [3, 4] }, false, 'the strip is numeric-only: a fraction keeps its shape'],
  ['1 1/2.',    { answer: 1.5, fracAnswer: [3, 2] },  false, 'and so does a mixed number'],
  /* ================= QUEST REFUTATION K2 (2026-09-07) =================
     THE DEFECT. The tail strip was a bare suffix test, longest DECLARED unit
     first and the shared list only if that missed. A question declaring "m" and
     given "8.5 cm" therefore took ONE character, was left with "8.5 c" and
     reported `not a number` - so `typedRejectReason` could not say `wrong-unit`
     and the child, who had the number right, read "The answer is 8.5." with
     nothing said about the unit. Unreachable on the web (inputmode="decimal" has
     no letters); the Quest lane's unit chip row is the surface that produces it.
     The verdicts below did NOT move - every one of these was already false. What
     moved is what the grader can SAY about them. */
  ['8.5 cm',    { answer: 8.5, unit: 'm' },   false, 'K2: cm on an m answer stays wrong'],
  ['8.5 m',     { answer: 8.5, unit: 'm' },   true,  'K2: and the declared unit still grades'],
  ['8.5m',      { answer: 8.5, unit: 'm' },   true,  'K2: a digit is a boundary, no space needed'],
  ['7.5 ml',    { answer: 7.5, unit: 'l' },   false, 'K2: ml on an l answer'],
  ['7.5 l',     { answer: 7.5, unit: 'l' },   true,  'K2: l itself'],
  ['12.5 kg',   { answer: 12.5, unit: 'g' },  false, 'K2: kg on a g answer'],
  ['12.5 g',    { answer: 12.5, unit: 'g' },  true,  'K2: g itself'],
  ['4.35 cents',{ answer: 4.35, unit: '$' },  false, 'K2: cents on a dollars answer'],
  ['4.35 $',    { answer: 4.35, unit: '$' },  true,  'K2: a trailing $ is the unit, not noise'],
  ['$4.35',     { answer: 4.35, unit: '$' },  true,  'K2: and a leading one still is noise'],
  ['5700 cents',{ answer: 5700, unit: 'cents' }, true,  'K2: cents on a cents answer'],
  ['5700 $',    { answer: 5700, unit: 'cents' }, false, 'K2: $ on a cents answer'],
  ['48 cubes',  { answer: 48, unit: 'cubes' }, true,  'K2: the count noun the grader never stripped'],
  ['48 kg',     { answer: 48, unit: 'cubes' }, false, 'K2: and a measurement on a count of cubes'],
  ['2025 km',   { answer: 2025, unit: 'm' },  false, 'K2: km is not m'],
  ['2025 mm',   { answer: 2025, unit: 'm' },  false, 'K2: nor is mm'],
  ['12 deg',    { answer: 12, unit: 'g' },    false, 'K2: "deg" does not end in a strippable "g"']
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
  [' 0.5 ', 0.5, ''],
  ['30 pages', 30, 'pages'],
  ['126°', 126, '°'],
  ['1 1/2', 1.5, ''],
  ['3/2', 1.5, ''],
  /* K2: the LONGEST whole token wins, and a token may not start inside a word. */
  ['8.5 cm', 8.5, 'cm'],
  ['7.5 ml', 7.5, 'ml'],
  ['12.5 kg', 12.5, 'kg'],
  ['4.35 cents', 4.35, 'cents'],
  ['4.35 dollars', 4.35, 'dollars'],
  ['48 cubes', 48, 'cubes'],
  ['12 mins', 12, 'mins']
];
/* The same, with the one-letter unit DECLARED - the shape that produced K2. */
for (const [input, val, unit, decl] of [
  ['8.5 cm', 8.5, 'cm', 'm'], ['7.5 ml', 7.5, 'ml', 'l'], ['12.5 kg', 12.5, 'kg', 'g'],
  ['8.5 m', 8.5, 'm', 'm'], ['2025 km', 2025, 'km', 'm'], ['4.35 cents', 4.35, 'cents', '$']
]) {
  const r = parseTypedAnswer(input, { answer: val, unit: decl });
  if (!r.ok || r.value !== val || r.unit !== unit) {
    fail++; console.log(`FAIL  K2 parseTypedAnswer(${JSON.stringify(input)}, unit ${JSON.stringify(decl)}) -> ${JSON.stringify(r)}, want value ${val} unit "${unit}"`);
  } else pass++;
}
for (const [input, val, unit] of P) {
  const r = parseTypedAnswer(input);
  if (!r.ok || r.value !== val || r.unit !== unit) {
    fail++; console.log(`FAIL  parseTypedAnswer(${JSON.stringify(input)}) -> ${JSON.stringify(r)}, want value ${val} unit "${unit}"`);
  } else pass++;
}

/* typedRejectReason: WHY it was wrong, in machine words. Unit Sweep Refutation W1 -
   the engine returned one string, 'wrong value or unit', for both halves, so neither
   the web card nor a SwiftUI view could tell a child "your number was right". The
   split has to be exact in both directions: never claim the number was right when it
   was not, and never miss it when it was. */
{
  const area = { answer: 300, unit: 'cm²' };
  const cubes = { answer: 48, unit: ['cubes', 'cm³'] };
  const R = [
    ['300 cm',   area,  'wrong-unit',   'the value is right, only the unit rejected it'],
    ['300 kg',   area,  'wrong-unit',   'any wrong unit on a right value'],
    ['300CM',    area,  'wrong-unit',   'no space, upper case, still unit-only'],
    ['301 cm',   area,  'wrong-value',  'a wrong number is never a unit lesson'],
    ['301 cm²',  area,  'wrong-value',  'right unit, wrong number'],
    ['301',      area,  'wrong-value',  'bare wrong number'],
    ['300 cm²',  area,  null,           'correct answers carry no reason'],
    ['300',      area,  null,           'a bare right number is correct'],
    ['',         area,  'empty',        'nothing typed'],
    ['abc',      area,  'not a number', 'unparsed stays unparsed'],
    ['48 kg',    cubes, 'wrong-unit',   'array form: outside the set, value right'],
    ['48 cubes', cubes, null,           'array form: a declared member is correct'],
    ['48 cm³',   cubes, null,           'array form: the equivalent member too'],
    ['49 cubes', cubes, 'wrong-value',  'array form does not soften a wrong number'],
    ['1.5 kg',   { answer: 1.5, fracAnswer: [3, 2], unit: 'l' }, 'wrong-unit', 'fractions inherit the same split'],
    ['3.46 kg',  { answer: 3.456, dp: 2, unit: 'l' }, 'wrong-unit', 'and so does a declared dp'],
    /* K2 (Quest Refutation, 2026-09-07): every one of these used to come back
       'not a number', which is the one reason the teaching card cannot lead on -
       the child read "The answer is 8.5." under their own 8.5. */
    ['8.5 cm',   { answer: 8.5, unit: 'm' },   'wrong-unit', 'K2: m ate the m out of cm'],
    ['7.5 ml',   { answer: 7.5, unit: 'l' },   'wrong-unit', 'K2: l ate the l out of ml'],
    ['12.5 kg',  { answer: 12.5, unit: 'g' },  'wrong-unit', 'K2: g ate the g out of kg'],
    ['2025 km',  { answer: 2025, unit: 'm' },  'wrong-unit', 'K2: and out of km'],
    ['2025 mm',  { answer: 2025, unit: 'm' },  'wrong-unit', 'K2: and out of mm'],
    ['4.35 cents', { answer: 4.35, unit: '$' }, 'wrong-unit', 'K2: cents was never strippable'],
    ['4.35 dollars', { answer: 4.35, unit: '$' }, 'wrong-unit', 'K2: nor was dollars'],
    ['2025 cubes', { answer: 2025, unit: 'cm' }, 'wrong-unit', 'K2: nor was cubes'],
    ['5700 $',   { answer: 5700, unit: 'cents' }, 'wrong-unit', 'K2: a trailing $ is a unit'],
    ['8.6 cm',   { answer: 8.5, unit: 'm' },   'wrong-value', 'K2: and a wrong number is still a wrong number']
  ];
  for (const [input, q, want, why] of R) {
    const got = ctx.MQI.typedRejectReason(input, q);
    if (got === want) pass++;
    else {
      fail++;
      console.log(`FAIL  typedRejectReason(${JSON.stringify(input)}, ${JSON.stringify(q)}) -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}   (${why})`);
    }
  }
}

/* finishTyped under the array form: the FIRST member is canonical, and it is what the
   child reads on the answer card. A set of equivalents must never print as a list. */
{
  const A = [
    [['cm³', 'ml'], '3170 cm³', 'first member is canonical'],
    [['ml', 'cm³'], '3170 ml',  'order is the generator\'s choice'],
    ['cm³',         '3170 cm³', 'a plain string is unchanged'],
    [undefined,     '3170',     'no unit, no trailing space']
  ];
  for (const [unit, want, why] of A) {
    const q = ctx.MQI.gen.finishTyped('stem', 3170, 'x', unit);
    if (q.answerText === want) pass++;
    else { fail++; console.log(`FAIL  finishTyped unit ${JSON.stringify(unit)} -> answerText ${JSON.stringify(q.answerText)}, want ${JSON.stringify(want)}   (${why})`); }
  }
}

/* W3 cosmetic gate (Dress Rehearsal Wave 2, item 3): finishNum's `unit` argument used
   to be pasted on as ' '+unit, so the P5 angle options rendered "40 °" beside a stem
   that renders "50°". A degree sign and a percent sign now sit TIGHT against the
   number; a word unit keeps its space. Asserted on the SHIPPED option string and on
   answerText, both of which the child reads. */
{
  const U = [
    ['°', '40°', 'degree sign tight against the number'],
    ['%', '40%', 'percent sign tight against the number'],
    ['cm', '40 cm', 'a word unit keeps its space'],
    ['cm²', '40 cm²', 'a squared word unit keeps its space'],
    ['pages', '40 pages', 'a plural word unit keeps its space'],
    ['', '40', 'no unit, no trailing space']
  ];
  for (const [unit, want, why] of U) {
    const q = ctx.MQI.gen.finishNum('stem', '', 40, [41, 42, 43], unit, 'x');
    const shipped = q.choices[q.correct];
    if (q.answerText === want && shipped === want) pass++;
    else {
      fail++;
      console.log(`FAIL  finishNum unit ${JSON.stringify(unit)} -> answerText ${JSON.stringify(q.answerText)} / option ${JSON.stringify(shipped)}, want ${JSON.stringify(want)}   (${why})`);
    }
  }
}

console.log(`\nanswer-parse-test: ${pass} passed, ${fail} failed, ${pass + fail} cases`);
process.exit(fail ? 1 : 0);
