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

## Figure specs — diagrams are DATA, never markup

A generator that needs a diagram sets **`q.figure`**, a plain data object, and leaves
`q.extra` empty. It never builds markup. One renderer, **`js/figures.js`**, turns a spec
into the SVG/HTML the web app paints (`MQI.renderFigure(figure) -> String`); a native
renderer (SwiftUI `MQFigures`) is written against this section alone. Same engine, same
numbers, two pixel layers.

```js
const fig = (q, figure) => (q.figure = figure, q);      // the one-liner every topic uses

function gLArea() {
  const g = makeL();                                     // pure data, no markup
  return fig(finishNum('What is the area of this figure?', '', g.area,
    [...], 'cm²', '...explain...'), g.figure);
}
```

Rules:

- **No markup leaves a generator — and the rule is an ALLOWLIST.** `tools/gen-sanity.mjs`
  walks **every string reachable from `q`** (the stem, `extra`, `explain`, `answerText`,
  every choice, every nested object and array, every key nobody has invented yet) and
  fails on any `<` followed by a letter or `/` unless the whole tag appears verbatim in
  its allowlist. The list is exactly:
  `<b> </b> <i> </i> <em> </em> <strong> </strong> <sup> </sup> <sub> </sub> <br>`,
  `<span class="frac"> <span class="n"> <span class="d"> </span>`.
  Nothing else. A listed tag carrying an attribute is *not* the listed tag, so
  `<span style="width:120px;background:#4c8bf5">` fails even though `<span class="frac">`
  passes. `3 < 5` is arithmetic, not a tag, and is left alone. Adding a tag is a
  deliberate edit to `MARKUP_ALLOWLIST` plus a line here — and a picture never qualifies,
  because a picture is a `q.figure` spec.
  *Why an allowlist:* the first version banned only `<svg` and `<div` on four named
  fields, and a refuter walked a `<table>` bar model, a `<span>`-box bar model, an
  `<img>` and markup on an undeclared key straight through it and onto the child's
  screen (`app.js` `figHtml()` falls back to `q.extra` when there is no `q.figure`).
  A denylist can only ban the pictures somebody already thought of.
- **A generator with a `q.figure` leaves `q.extra` empty.** The harness and `app.js` draw
  the spec; `q.extra` is where the drawing lands, not an input. Gated.
- **A spec is JSON-serialisable data**: numbers, strings, arrays. No functions, no HTML,
  no `null` (use `-1` for "no index"), no colours, no pixel geometry. Sizes, padding,
  palette and label placement belong to the renderer, so the two platforms can differ
  where they must without the engine knowing.
- **Every number the child needs is printed by the renderer as on-screen text.** Nothing
  rides in a `data-*` attribute. The harness oracle re-derives each answer from the
  rendered labels, so a figure that stops printing a value fails the gate.
- **Adding a type is two edits**: a `RENDERERS` entry in `js/figures.js` plus a row here.
  `MQI.figureTypes` is the live list and the harness checks specs against it.
- Load order: `js/figures.js` comes **after** `js/core.js` (core assigns `window.MQI`
  wholesale) and **before** `js/app.js` and `js/boot.js` (its consumers). The harness
  gates that as a total order, not just "after core".

### The seven types

| `type` | Fields | Drawn as |
|---|---|---|
| `bar` | `title`, `cats[]`, `units[]`, `scale`, `maxUnit`, `unitLabel` | Horizontal bar graph. Bar *i* is `units[i]` units long and prints `units[i] * scale` at its end; the value axis carries a gridline and a tick number for every unit `0..maxUnit`, labelled `k * scale`; the caption reads *"Each unit along the bottom of the graph stands for `scale` `unitLabel`."* (`unitLabel` is the generator's job to singularise: "1 pupil", "5 pupils"). |
| `rect` | `length`, `breadth`, `unit` | A rectangle drawn **strictly to scale** — see "Drawing `rect` to scale" below for the exact px-per-unit rule, which a native renderer must reproduce. `breadth + " " + unit` printed just OUTSIDE the box at its right edge, vertically centred; `length + " " + unit` centred UNDERNEATH the box on the box's own width. |
| `fractionBar` | `parts`, `filled` | A bar of `parts` equal segments, the FIRST `filled` shaded. The oracle counts shaded segments off the render. Geometry: segments in a centred row, 3 px apart, each 34 px tall and `clamp(28px, 6vw, 46px)` wide (the one responsive figure — a segment grows with the screen), 2.5 px white border, 6 px radius; unfilled is 6% white, filled is a vertical `#6ee7f9 -> #3aa7ff` gradient. Published as `MQI.figureCss` in `js/figures.js` and gated against `index.html`. |
| `lshape` | `W`, `H`, `a`, `b`, `unit` | A `W x H` rectangle with an `a x b` piece removed from the **top-right**. **Strictly to scale, at a fixed 11 px per unit on both axes** (no caps: `W <= 16` and `H <= 14` by the generators' own range, so the largest figure is 176 x 154 px). The renderer derives and prints all six sides — top `W-a`, cut down `b`, cut across `a`, right `H-b`, bottom `W`, left `H` — so the spec and the picture can never disagree. Caption: *"All lengths are in `unit`. Every side of the figure is labelled. The corners are all right angles."* |
| `table` | `title`, `cats[]`, `values[]`, `hidden`, `unitLabel` | One header row of `cats` and one value row. Column `hidden` prints `?` instead of its value (`-1` = none). **`values[hidden]` still carries the concealed number — it is the answer. A renderer must print `?` there and MUST NOT print, alt-text, tooltip or otherwise expose that value.** Caption *"Number of `unitLabel`."* The card is width-capped and scrolls in place rather than pushing its last column off a phone. |
| `line` | `title`, `cats[]`, `units[]`, `step`, `maxUnit`, `unitLabel` | Line graph. **A line spec always carries at least 2 points** (`cats.length >= 2`): the x step is `plotWidth / (cats.length - 1)`, which divides by zero at one point. Today every line spec has exactly 5. Point *i* sits `units[i]` units up and prints `units[i] * step`. Gridline + tick number for every unit `0..maxUnit`, labelled `k * step`; category under every point. **The value label sits at its point's own height, level with its own gridline** — the P4 Area+Graphs kill was a fixed 9px offset that put every label on the gridline one step above the value it named. The label sits to the RIGHT of its dot; the LAST point's label flips to the left so it never crowds the right edge. Caption *"Number of `unitLabel`. Each step up the side of the graph stands for `step`."* |
| `pie` | `title`, `cats[]`, `weights[]`, `labels[]`, `caption` | Pie chart starting at 12 o'clock, clockwise. Sector *i* sweeps `weights[i] / sum(weights)` of the circle — strictly proportional, including a sector whose label is hidden (`"?"` is drawn at its true weight). `labels[i]` is the STRING printed inside sector *i* (a count, a fraction like `"1/4"`, or `"?"`) and printed a SECOND time in the legend beside `cats[i]`. Category names never sit on a slice. **The >= 1/6-of-the-circle floor is a GENERATOR invariant, not a renderer clamp** — a generator must not emit a weight below `sum/6` (so an in-sector label never crowds a boundary), and the renderer draws whatever it is given strictly proportionally. Never clamp a sweep: that would contradict "strictly proportional" and put a false picture in front of a child. Measured minimum sweep over 30,000 emitted specs is exactly 60.00 deg, so nothing violates it today — but nothing in the harness enforces it either, and a new pie generator is where it would break. `caption` is free text. |

### Drawing `rect` to scale

`rect` was **killed** on 2026-09-07 for saying "to scale" and not being it. The old
renderer used 20 px per unit horizontally but 16 px vertically, with an independent
height floor of 34 and cap of 110 against a width cap of 240: 78.9% of the rectangles the
generators can draw carried more than 20% aspect error, and **every square drew as a wide
box** — 12 x 12 cm rendered 240 x 110 px, 2.18:1, caught on the live review screen at
4 cm x 4 cm. A native renderer written from the doc would have drawn a different picture,
which is the one failure this whole contract exists to prevent.

The rule now, and it is the whole rule:

```
s = min(20, 240 / length, 130 / breadth)        px (points) per unit
w = length  * s
h = breadth * s
```

- **One `s` on both axes**, so the drawn aspect always equals `length : breadth`.
  Worst case over all 144 `(L, B)` pairs in `1..12` is 0.31% (rounding to 0.1 px);
  all 12 squares draw exactly square.
- **20 px/unit is the natural size**; 240 px and 130 px are the caps. Whichever side hits
  its cap first pulls the other down with it, so capping shrinks the picture and never
  distorts it. Never floor or cap one axis alone — that is precisely the killed bug.
- **The box is border-box.** The web draws a 3 px border; if it sat outside the box it
  would add 6 px to each axis and a square would stop measuring square. A native renderer
  strokes the border inside the `w x h` rect.
- **Labels.** `breadth + " " + unit` sits OUTSIDE the box, past its right edge, vertically
  centred (the web hangs it at `right: -4px` with `translate(100%, -50%)`, and reserves
  56 px of right padding for it). `length + " " + unit` is centred UNDERNEATH the box,
  on the box's own width, 4 px clear.
- **It fits a phone.** The widest possible box is 240 px; with the 8 px left and 56 px
  right padding that is 304 px, inside a 390 px card. A 40 x 3 spec draws 240 x 18 px at
  `s = 6` and still holds its exact 13.33:1.

Only the two printed numbers are contractual *content*; the geometry above is contractual
*picture*. Both are gated: `tools/gen-sanity.mjs` re-derives the answer from the printed
labels, and the aspect rule is a two-line arithmetic check any lane can re-run.

Reading a figure back: the harness renders `q.figure` through `js/figures.js` before any
oracle runs, so oracles keep parsing the rendered labels (`.bg-val`, `.bg-tick`, `.lf-*`,
`.dt-cat`/`.dt-val`, `.lg-tick`/`.lg-val`/`.lg-cat`, `.pie-cat`/`.pie-val`/`.pie-lab`) and
the answer key is still re-derived independently.

**Known and measured, deliberately not changed** (Figure Spec Refutation wound 6): the
feed's identity keys in `core.js` — both `shapeKey` and `qIdentity` — read `q.extra`, which
is empty for a figure topic until the app draws the spec. A figure generator's
session-duplicate space is therefore narrower than it was pre-split, by up to 32.1%
(`gPieCountAbove`), 16.0% (`gPieWhichCat`), 6.0% (`gReadOne`). Measured impact is **zero**:
60,000 sequential feed items across all six figure topics served 0 duplicates on either
side of the split, and `feed-sim` is unchanged. It narrows the ring, which is the direction
the feed fix wanted. If a future lane wants the picture back in the identity, `core.js` is
the place — and `core.js` is frozen, so that is its own packet.

## Sanity rules the harness enforces

`node tools/gen-sanity.mjs` (or `npm test`) loads `js/core.js`, `js/figures.js` and every
`js/topics/*.js` in a DOM-less vm and, for every generator in every pool, at `SAMPLES` draws
(default 200):

0. **No markup (allowlist).** Every string reachable from `q` — however deeply nested, on
   any key — may only carry tags that appear verbatim in `MARKUP_ALLOWLIST`
   (`<b>`, `<sup>`, the `frac` spans and friends; see "Figure specs"). Anything else,
   including any tag with an attribute, fails. A `q.figure` spec is held tighter still:
   JSON data with no `<` at all, a `type` the renderer knows, and an empty `q.extra`
   beside it. Then the spec is drawn through `js/figures.js` and checks 1-5 run on the
   rendered figure. The `index.html` manifest gate also proves `js/figures.js` loads
   strictly between `js/core.js` and `js/app.js`/`js/boot.js`, and that `MQI.figureCss`
   still matches the stylesheet.

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
