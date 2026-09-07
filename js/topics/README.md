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
| Typed numeric | `finishTyped(q, answer, explain, unit)` — `unit` is a string, or an array of equivalent units | `{ typed:true, answer, correct:-1, unit }` (the array's first member is canonical and is what `answerText` prints) |
| Typed fraction | `finishTyped` with the answer as a reduced `n/d` string, plus a `fracAnswer:[n,d]` field | grader compares cross-multiplied |
| Typed unit-bearing | `finishTyped` with the unit in the question stem and a bare number as the answer, or `finishNum(..., unit, ...)` for MCQ | unit is appended to every choice, never only the key |

Units belong to the question or to every choice. A unit that appears only on the correct
answer is a tell and the harness will not catch it: do not do it.

### Typed items must declare their unit (gated)

`finishTyped`'s 4th argument lands on `q.unit`. `gradeTyped` accepts a MISSING unit and
rejects a MISMATCHED one — but only if the question declares one. A typed item that
declares nothing falls into the other branch, where **any** token on `core.js`'s shared
`TYPED_UNITS` list is accepted. That is how Triangle Terrace shipped a "What is its area,
in cm²?" that graded `140 cm`, `140 kg` and `140 pupils` as correct (Dress Rehearsal
Phase 0, 2026-09-07).

**Rule, gated by `tools/gen-sanity.mjs`:** a typed generator whose **stem** carries a unit
token must declare `q.unit`. The build fails and names the generator otherwise. The token
list is what the grader silently strips (`cm`, `cm²`, `m`, `km`, `kg`, `g`, `ml`, `l`, `°`,
`%`, `min`, `hours`, `pages`, `pupils`, …) plus `$`, `cents` and `dollars`, which stems
write but core does not strip. Only the stem is scanned; the explanation is not.

The rule does not check that the unit is the *right* one — `gFindBase`'s stem says cm² and
its answer is in cm, and both are correct. Declaring anything is enough; declaring nothing
is the bug.

#### Equivalent units: `q.unit` may be an array

`q.unit` takes a **string** (one unit) or an **array of equivalent units**. `gradeTyped`
accepts any member; the **first is canonical** and is the one `answerText` prints, so the
child still reads one house answer.

```js
finishTyped(stem, cm3, explain, ['cm³', 'ml']);   // "1 ml = 1 cm³" is printed in the stem
finishTyped(stem, n,   explain, ['cubes', 'cm³']); // a count of 1 cm cubes
```

Use it only where two spellings really are **the same quantity**, never for two spellings
of one unit — `cm3`/`cm²`/`mL`/`ℓ` already alias inside `core.js`, and declaring a spelling
twice is a build failure. Today's users are `p5-volume.js` (`gLitresToCm3`, `gTankLiquid`
= `['cm³','ml']`; `gTankLitres` = `['ml','cm³']`; `gUnitCubes` = `['cubes','cm³']`) and
`p5-decimals.js` `gLargeToSmall` on its litre pair. Why: those stems print `1 ml = 1 cm³`
themselves, and `gTankLitres`'s own explanation says *"= 5500 cm³, and 1 cm³ = 1 ml, so it
is 5500 ml"* — with one declared unit the game asserted the identity and marked it wrong in
the same breath (Unit Sweep Refutation W2, 2026-09-07). The canonical member is still the
unit the stem asks for, so the conversion is still what the item teaches.

**Count answers** ("How many pupils are there in the class?") name a token while the answer
is a bare number. Three legal exits, pick one deliberately:

1. **Declare the count noun.** `p5-rate.js` already ships `'pages'` and `'buns'` this way.
   A bare number still passes — a missing unit is always accepted — and `24 kg` starts
   failing. This is the right exit for most count stems.
2. **Declare an array** when two spellings are both right. `p5-volume.js` `gUnitCubes`
   counts 1 cm cubes, so `48 cubes` and `48 cm³` are the same quantity and it declares
   `['cubes','cm³']`. This is the exit that used to need the opt-out, and it closes the
   hole the opt-out left open (`48 kg` was being accepted the whole time).
3. **Opt out explicitly, with a reason** — the last resort, when *no* declaration can say
   what is right. **There is no user of it today.** Attach it in your own topic file:
   ```js
   const noUnit = (q, why) => (q.unitOptOut = why, q);   // one line, per file
   ```
   The reason is mandatory and must be a real sentence; an empty, missing or token reason
   is itself a build failure, and the opt-out is refused on a generator that also declares
   a unit. Before reaching for it, check the array form cannot express what you mean — the
   one opt-out the unit sweep took had a reason that named a right answer the build
   rejected, which no gate can catch (Unit Sweep Refutation W3).

#### The child is told when only the unit was wrong

`MQI.typedRejectReason(raw, q)` returns `'wrong-unit'` when the child's **number was right**
and only the unit rejected it, `'wrong-value'` when the number itself is wrong, or the parse
reason. `js/app.js` uses it to lead the wrong-answer card with *"Your number was right. The
unit should be **cm²**, because area is measured in squares."*, and the engine's bridge
verdict carries the same word as `reason`, which `MQContent.Verdict.Reason` decodes. One
definition, so the web card and a SwiftUI view cannot drift apart. A generator gets this for
free by declaring its unit; there is nothing to author.

Money is a settled convention: declare `'$'` and re-render `answerText` yourself
(`q.answerText = '$' + n`), so the review card reads `$4.75` rather than `finishTyped`'s
default `4.75 $`. `p5-rate.js` `gParkingCharge` is the reference.

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
| `bar` | `title`, `cats[]`, `units[]`, `scale`, `maxUnit`, `unitLabel` | Horizontal bar graph, drawn as **a percentage box model with fixed-size labels** — see "Drawing `bar` to scale" below for the exact geometry and for the **minimum label size rule**, which is contractual. Bar *i* is `units[i]` units long and prints `units[i] * scale` at its end; the value axis carries a gridline and a tick number for every unit `0..maxUnit`, labelled `k * scale`; the caption reads *"Each unit along the bottom of the graph stands for `scale` `unitLabel`."* (`unitLabel` is the generator's job to singularise: "1 pupil", "5 pupils"). Title and caption are **prose beside the drawing, not inside it** — and so are the category names, the values and the tick numbers: **the plot scales with the screen, the words never do.** |
| `rect` | `length`, `breadth`, `unit` | A rectangle drawn **strictly to scale** — see "Drawing `rect` to scale" below for the exact px-per-unit rule, which a native renderer must reproduce. `breadth + " " + unit` printed just OUTSIDE the box at its right edge, vertically centred; `length + " " + unit` centred UNDERNEATH the box on the box's own width. |
| `fractionBar` | `parts`, `filled` | A bar of `parts` equal segments, the FIRST `filled` shaded. The oracle counts shaded segments off the render. Geometry: segments in a centred row, 3 px apart, each 34 px tall and `clamp(28px, 6vw, 46px)` wide (the one responsive figure — a segment grows with the screen), 2.5 px white border, 6 px radius; unfilled is 6% white, filled is a vertical `#6ee7f9 -> #3aa7ff` gradient. Published as `MQI.figureCss` in `js/figures.js` and gated against `index.html`. |
| `lshape` | `W`, `H`, `a`, `b`, `unit` | A `W x H` rectangle with an `a x b` piece removed from the **top-right**. **Strictly to scale, at a fixed 11 px per unit on both axes** (no caps: `W <= 16` and `H <= 14` by the generators' own range, so the largest figure is 176 x 154 px). The renderer derives and prints all six sides — top `W-a`, cut down `b`, cut across `a`, right `H-b`, bottom `W`, left `H` — so the spec and the picture can never disagree. Caption: *"All lengths are in `unit`. Every side of the figure is labelled. The corners are all right angles."* |
| `table` | `title`, `cats[]`, `values[]`, `hidden`, `unitLabel` | One header row of `cats` and one value row. Column `hidden` prints `?` instead of its value (`-1` = none). **`values[hidden]` still carries the concealed number — it is the answer. A renderer must print `?` there and MUST NOT print, alt-text, tooltip or otherwise expose that value.** Caption *"Number of `unitLabel`."* **The table is the one figure that does NOT scale down** — shrinking a grid of numbers stops a child reading it — so it is width-capped and scrolls **in place**, inside its own card, never pushing the page sideways. Two rules make that true and both are contractual: the scroll box must be the TABLE only (title and caption stay put), and **the scroll must be visible where a child looks**. The second rule was only half true until 2026-09-07: the cue was a shaded background edge, and `th { background }` painted over its top half, so it appeared on the value row and never on the header. The cue is now `.fig-more` — a 30 px white fade with a `›` chevron drawn **outside** the scroll box, over its full height, header included — and it is shown exactly when `scrollWidth > clientWidth`, so a table that fits still draws nothing. The `?` column may legitimately start off-screen (that is what the scroll is for); what may not happen is a child not being told. Horizontal cell padding is `clamp(5px, 2.4vw, 12px)`: exactly 12 px at any viewport ≥ 500 px, tighter on a phone, so most 5-column tables fit outright. |
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
- **It fits a phone — and shrinks isotropically when even that is not enough.** The
  widest possible box is 240 px; with the 8 px left and 56 px right padding that is
  304 px, inside a 390 px card but **not** inside a 320 px one (268 px), where it made
  the question card scroll sideways. So the box carries `max-width: 100%` with
  `aspect-ratio: length / breadth` instead of a fixed height: where there is room it is
  exactly `w x h` as above and nothing moves, and where there is not it shrinks with the
  card and the drawn aspect is still exactly `length : breadth`. A native renderer does
  the same thing by recomputing `s = min(20, cardWidth / length, 240 / length,
  130 / breadth)`. A 40 x 3 spec draws 240 x 18 px at `s = 6` on a 390 px phone and
  204 x 15.3 px at 320, holding its exact 13.33:1 either way.

Only the two printed numbers are contractual *content*; the geometry above is contractual
*picture*. Both are gated: `tools/gen-sanity.mjs` re-derives the answer from the printed
labels, and the aspect rule is a two-line arithmetic check any lane can re-run.

### Drawing `bar` to scale

`bar` has been redrawn twice on 2026-09-07 and the second redraw exists because of what
the first one cost. Both are worth carrying, because a native author will be tempted by
the same shortcut.

- **Until 2026-09-07** it was an absolutely positioned HTML box model with a hard 450 px
  intrinsic width, which `max-width` cannot shrink. At a 390 px viewport the card ran
  from x = -30 to x = 420, the page gained a sideways scroll, and **100% of bar graphs
  lost the tallest bar's printed value** off the right edge (52.5% of items name, in
  their stem, a category whose value the child must read).
- **The first fix** made it one viewBox-scaled SVG. That fixed the width and broke the
  reading: a viewBox scales **everything**, text included, so the 13 px category names
  and 11 px tick numbers were painted at 7.13 px (360), 7.51 (375) and 7.90 (390) — the
  smallest text in the app, under Apple's 11 pt floor, on the numbers the answer depends
  on. It was graded "pass" off screenshots taken at `deviceScaleFactor: 2`.

**THE MINIMUM LABEL SIZE RULE, and it binds every renderer including a native one:**

> A figure's labels are read, not looked at. **No label a child must read may be drawn
> below 11 px on the glass at any width >= 360 px, or below 10 px at 320 px** — that is
> the *effective* size, the declared size times whatever scale the drawing is painted
> at. When a drawing cannot fit at that size, **the picture gives way, never the type**:
> shrink the plot, wrap the names, and if it still will not fit, scroll the card
> horizontally in place with the same visible cue the table uses. Never the page.

So `bar` is an HTML/CSS box model again — but placed in **percentages of the plot**, so
it is fully responsive — with every label as real HTML text at a fixed size.

```
two grid columns, no breakpoint at any width:
  col 1  category names   minmax(min-content, max-content), 8 px right padding
  col 2  the plot cell    minmax(180px, 270px) = 150..240 px of PLOT + a 30 px gutter
row i     24 px tall (taller if its name wraps); everything in it is vertically centred
plot      the cell minus its 30 px right gutter; ALL x below are % OF THE PLOT
bar i     from 0% to units[i] / maxUnit * 100%, 15 px thick, right corners r = 2
gridline k at k / maxUnit * 100%, 1 px, full height of the rows;
          k = 0 is #64748b, the rest #e2e8f0 (the k = maxUnit line is pulled 1 px left
          so it lands inside the plot)
axis rule a 2 px #475569 border across the WHOLE plot cell (plot + gutter)
ticks     1 px, 5 px long, dropping from the rule at k / maxUnit * 100%
```

- **Category name**: right-aligned, 13 px, `#0f172a`, wraps rather than forcing a scroll.
- **Value**: starts 6 px past its bar's right edge, 13 px, weight 600, `#0f172a`,
  on the bar's own centre line, so a value always reads level with its bar.
- **Tick number**: centred on its own gridline, 11 px, `#475569`.
- **Bar fill** `#4c8bf5`. **Axis rule and ticks** `#475569`. (Colours were undocumented
  before — Phone Width Refutation wound 6a.)
- The **30 px gutter** is what the last tick number (centred on the 100% gridline) and
  the longest value label overflow into. It is part of the plot cell, not of the plot.
- The **150 px plot floor** is what absorbs a narrow screen: the plot gives up length,
  the names wrap, and only when even 150 px plus the names' own min-content width will
  not fit does the card scroll, inside `.fig-scroll`, with the `.fig-more` cue.
- Title and caption are prose outside the drawing; so, now, are the labels.

Measured on the live app at `deviceScaleFactor: 1`, five live items plus the widest
known spec at each viewport: **11 px at 1024, 390, 375 and 360; 11 px at 320.**

### Figures are responsive in BOTH axes, never width-conditional

One drawing per figure, at every screen size. A renderer may scale, wrap or scroll — it
may not have a second layout below some breakpoint, because a second layout is a second
picture to port, to gate and to be wrong in. **Height is a screen dimension too:** iOS
Safari gives a page ~664 px of a 390 x 844 iPhone while the URL bar is showing, and
375 x 548 on an SE, which is the state a phone is in for the first scroll of every
session. Ignoring that let the pie chart paint 97 px past its card, through both HP
numbers and 55 px into the answer buttons. Gated by `npm run test:layout` at six
viewports, heights included:

- Every figure sits **inside its card sideways**, and the page never scrolls sideways —
  at every viewport the gate measures, which is now **320 to 1024 px**. (The old
  "never on ANY screen" was false at 320, where the mute button was laid out at
  330..354 and unreachable under `body{overflow:hidden}`. The HUD row fits now.)
- **No figure ever paints over the play surface** — a fighter name, a sprite, an HP bar,
  an HP number or an answer button. This is a hard gate, in both directions.
- **The order of concessions, when something does not fit, is fixed**: scale the picture,
  then wrap, then scroll inside the card with a visible cue, and never cover anything.
  **Scaling stops at the reading floor** (11 px, 10 px at 320) — an unbounded height fit
  put the pie's own sector numbers at 7.24 px before that bound existed.
- Every drawing is **centred in its own card**. The card is as wide as its longest prose
  line (usually the caption), so a left-aligned drawing reads as off-centre: the pie was
  73 px left of centre and the L-shape up to 196 px at 1024 px before this rule.
- Who does what: `bar` scales its plot and scrolls sideways at the extreme; `table`
  scrolls, visibly; `pie` and `line` scale with their viewBox (`data-fit="1"` declares
  "my picture may be scaled to fit the height left over; my words may not", and the app
  shell measures that height rather than guessing it); `rect` keeps its px-per-unit but
  carries `max-width:100%` with `aspect-ratio`, so on a 320 px screen it shrinks
  isotropically instead of overflowing; `lshape` (176 px) and `fractionBar` (`6vw`
  segments) already fit. Anything still too tall scrolls inside `#qextra` with the
  `⌄ more` cue.

**Known gap, fenced not hidden:** `line`'s viewBox is 380 px wide — wider than a phone
card — so `max-width:100%` scales its 11 px tick numbers to 8.86 px at 390, 8.42 at 375,
7.99 at 360 and 6.83 at 320. That is byte-identical to `main` and predates this rule; the
gate holds it to exactly those numbers and fails any regression below them, and prints
the gap in every run's summary. Closing it means redrawing `line` the way `bar` was
redrawn, which moves the desktop line graph and is its own packet.

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
6. **Typed unit declared.** A typed question whose STEM carries a unit token must declare
   `q.unit` — a **string**, or an **array of equivalent units** (`['cm³','ml']`) when two
   spellings name the same quantity — or opt out with a reasoned `q.unitOptOut`. An array
   is also shape-checked: empty, blank/non-string members, and two members that normalise
   to the same unit are all build failures. See "Typed items must declare their unit" above
   for the token list and the three legal exits. Failure names the generator.

Gate for a content lane: `SAMPLES=50000 npm run test:deep` green, and 0% oracle coverage
appearing nowhere in your topic's rows.

### The layout gate — `npm run test:layout`

`tools/layout-gate.mjs` is the **rendered** half of the figure contract, and it is
deliberately **not** part of `npm test`: it needs a real Chrome and a real HTTP server,
while `npm test` must stay a pure-node gate that runs anywhere. Run it after any change to
`js/figures.js` or to the play surface in `index.html`.

It starts its own `python3 -m http.server` on a free port and one headless Chrome (it
records both pids and kills exactly those two — it never pattern-kills), then drives the
LIVE app through the real `?shot=` routes at **six viewports, width x height**, because
half the defects it exists to catch are vertical:

| viewport | what it is |
|---|---|
| 390x664 | iPhone 15, Safari's visible area **with the URL bar** — the state of every first scroll |
| 390x844 | the same phone with the URL bar hidden |
| 375x548 | iPhone SE / 8, URL bar showing |
| 360x640 | small Android |
| 320x568 | iPhone SE 1st gen — the narrowest screen still in the wild |
| 1024x900 | desktop control |

At each one it drives home, map, battle, a live Patchwerk fight, the Hall of Fame, a real
run played to its review screen, a **banner drive** (see 5), **five** live items of every
one of the seven figure types in both difficulty bands, and **the widest known spec of
each type** through the live `MQI.renderFigure`. The deliberate widest spec is not
decoration: with three random draws, the prescribed "remove the table's cap" mutation went
red on 2 of 3 tables and green on the third.

It fails on:

1. **Horizontal.** `documentElement.scrollWidth > innerWidth`, **or any element laid out
   outside the viewport that a child cannot scroll to.** The second is the one with
   teeth, and it has them only because of a subtlety worth knowing: `body{overflow:hidden}`
   with `html{overflow:visible}` **propagates to the viewport** — the body box does not
   clip — but `getComputedStyle(document.body).overflowX` still reads `hidden` and the
   body's border box IS the viewport. An earlier version treated it as a clipping
   ancestor, clamped every rect to `0..innerWidth`, and made both directions
   arithmetically unreachable: it reported `4/4 clean` with the HUD hanging 80 px off
   the left edge. Raw geometry is measured beside visible geometry, and raw overflow is
   a failure unless the element sits inside a box that really scrolls.
2. **Vertical.** Any figure that paints over a fighter name, a sprite, an HP bar, an HP
   number, an answer button or the typed-answer row — or that escapes `#qcard` sideways
   (and, on the review screen, its review box).
3. **Readability.** The smallest **effective** label in a figure (declared size x the
   scale it is drawn at) below 11 px at any width >= 360, or below 10 px at 320. One
   fenced known gap: `line` — see "Figures are responsive" above.
4. **The scroll allowance.** `.fig-scroll` is the only box in the app allowed to scroll
   sideways; when one HAS more content off its right edge, its `.fig-more` cue must be
   drawn and must cover the scroll box's full height. `#qextra` scrolling vertically
   without its `⌄ more` cue fails the same way.
5. **The banner.** 20 CRITICAL HIT banners driven by real play plus 5 ENRAGE, sampled at
   40 ms so the `bannerIn` scale overshoot is measured too: `#banner .inner` may not
   intersect `#qtext`, a name, an HP bar, an HP number, a sprite or an answer button, and
   may not leave the viewport.
6. **The play surface.** A fighter name, HP bar or answer button cut off at the viewport
   edge, a battle with other than four answer buttons, any tap target under 44 px.
7. **Measuring nothing.** Zero measured surfaces is a FAILURE, always. `--only=` or
   `--types=` matching nothing names the flag, lists what is valid and exits non-zero
   (it used to print `PASSED 0/0 measured surfaces clean` and exit 0 — verbatim the kill
   `ios/test.command` records in its own header). An **unfiltered** run must additionally
   clear the surface floor recorded in `tools/layout-floor.txt`.

Flags: `--viewports=390x664,...`, `--widths=` (heights come from the table above),
`--only=<screen ids>`, `--types=<figure types>`, `--report=<file.json>` (full geometry for
every measured surface), `--shots=<dir>` (a PNG per surface, **at `deviceScaleFactor: 1`**
— a 2x shot doubles every glyph, which is how 7.90 px labels were once graded "pass"),
`--root=<dir>` (serve another checkout, read-only, to measure a control with identical
rules), `--quiet`.

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
