# Topic authoring contract

One file per topic node. A content lane owns its file and edits nothing else. Two lanes
never touch the same file, so lanes never collide on merge.

## File naming

```
js/topics/p<level>-<slug>.js      e.g. p4-decimals.js, p5-area-of-triangle.js
```

`<level>` is the MOE level the node is anchored to (`2`-`6`); `<slug>` is kebab-case from the
node name. One file = one registered topic id.

## Registration shape

```js
"use strict";
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, fr = G.fr, eq = G.eq,
        buildFracChoices = G.buildFracChoices, finishFrac = G.finishFrac,
        finishNum = G.finishNum, finishTyped = G.finishTyped,
        gMul = G.gMul, EASY_TABLES = G.EASY_TABLES, HARD_TABLES = G.HARD_TABLES;

  /* ...generator functions, pure, no DOM... */

  MQI.registerTopic({
    id:    'decimals',                       // unique; must match the MAP_NODES id
    level: 'P4',                             // MOE level
    strand:'Number and Algebra',             // MOE strand, verbatim
    moeSubTopic: 'Decimals: notation, representations and place values (tenths, hundredths, thousandths)',
    label: 'Decimal Bay', short: 'Decimals', e: '🌊',
    skills: {
      place: { label: 'Place value', tip: 'Parent tip, one sentence, actionable at the kitchen table.' }
    },
    pools: {
      1: [[gDecPV1, 'place']],               // easy
      2: [[gDecPV2, 'place']],               // medium
      3: [[gDecPV3, 'place']]                // hard / "advanced" depth band
    }
  });
})();
```

- `moeSubTopic` is a **string copied exactly as printed in the MOE Oct 2025 syllabus PDF**
  (`2021 Primary Mathematics Syllabus P1 to P6, Updated October 2025`, pages 34-43). If the
  wording is not in that PDF, it does not go in this field. The PDF wins over any tuition-site
  summary.
- `skills` keys are short ids; every pool entry must reference a key that exists.
- `pools` must have non-empty `1`, `2` and `3`. `registerTopic` throws otherwise.

## Answer types supported

| Type | Finisher | Returns |
|---|---|---|
| Multiple choice, numeric | `finishNum(q, extra, correct, cands, unit, explain)` | 4 choices, `correct` index, `answerText` |
| Multiple choice, fraction | `finishFrac(q, extra, [n,d], cands, explain, count)` | fraction choices rendered by `fr(n,d)` |
| Typed numeric | `finishTyped(q, answer, explain)` | `{ typed:true, answer, correct:-1 }` |
| Typed fraction | `finishTyped` with the answer as a reduced `n/d` string, plus a `fracAnswer:[n,d]` field | grader compares cross-multiplied |
| Typed unit-bearing | `finishTyped` with the unit in the question stem and a bare number as the answer, or `finishNum(..., unit, ...)` for MCQ | unit is appended to every choice, never only the key |

Units belong to the question or to every choice. A unit that appears only on the correct
answer is a tell and the harness will not catch it: do not do it.

## Sanity rules the harness enforces

`node tools/gen-sanity.mjs` (or `npm test`) loads `js/core.js` plus every `js/topics/*.js`
in a DOM-less vm and, for every generator in every pool, at `SAMPLES` draws (default 200):

1. **Shape.** Non-empty question and `answerText`; MCQ has exactly 4 choices; `correct` is in
   range; no duplicate choices; `answerText === choices[correct]`; typed questions carry a
   finite `answer` and `correct: -1`.
2. **Integrity.** No `NaN`, `undefined`, `null` or `Infinity` in the question, extra, explain,
   answer text or any choice. No negative or non-finite numeric choice.
3. **Independent answer key.** The harness re-derives the answer from the **rendered question
   text**, never from `answerText`. A generator whose question text no oracle can parse is
   reported at 0% oracle coverage and flagged WARN: adding a generator obliges adding its
   oracle to `tools/gen-sanity.mjs` in the same sitting.
4. **Sample space.** At least 8 distinct question texts per generator per run. A collapsed
   generator fails.
5. **Set wiring.** `buildSetFor(topic, 30)` must fill all three levels with 30 questions each,
   with no duplicate question inside a set.

Gate for a content lane: `SAMPLES=50000 npm run test:deep` green, and 0% oracle coverage
appearing nowhere in your topic's rows.

## Self-containment rule

A topic file **must not edit `js/core.js`**. If a generator needs a helper that does not exist
in `MQI.gen`, write it inside the topic file. The shared kit is frozen: it is the pre-split
helper set (`ri, pick, shuffle, gcd, fr, eq, buildFracChoices, finishFrac, finishNum,
finishTyped, gMul, EASY_TABLES, HARD_TABLES`) and grows only by an explicit ruling, because
every lane depends on it.

Unlocking a map node is two edits: ship `js/topics/<file>.js`, then flip that node's
`status` from `'locked'` to `'live'` (and drop `locked:true`) in `js/registry.js`, and add the
script tag in `index.html`. Nothing else in the app changes.

## Worked example

`js/topics/p3-times-tables.js` is the reference conversion: the pre-split Times Table Volcano
generators, unchanged, wrapped in the IIFE with the destructured kit and a single
`MQI.registerTopic` call carrying `id/level/strand/moeSubTopic`.
