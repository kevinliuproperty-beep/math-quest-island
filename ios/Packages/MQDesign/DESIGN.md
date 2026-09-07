# MQDesign — Storybook Island

Kevin ruled Q84 = **STORYBOOK**. This package now has exactly one theme, and the
losing direction and the rejected first sample are gone from the tree. What
follows is the whole system: what it is made of, what was deleted, and the gates
that bind anyone who touches it.

Render everything with `swift run mqdesign-snap` **from `ios/`**. No Xcode, no
simulator, no window — SwiftUI `ImageRenderer` on a headless mini.

> **Phase 1 moved the manifest.** This package no longer has a `Package.swift` of
> its own; it is a target in the root `ios/Package.swift`, so `swift build` and
> `./test.command` at `ios/` cover it. Two manifests describing one target is two
> places for the deployment target, the resource rule and the platform list to
> drift. Its 29 tests live in `Tests/MQDesignTests/`. The seams the next lanes
> code against are in `ios/PHASE1.md`.

---

## The direction, in one paragraph

Shape Shore, late afternoon, drawn. Seven planes of depth between the child and
the horizon, one warm light source everything is lit by, a cast drawn as SwiftUI
`Path`s with coloured edges and contact shadows, and chrome made of things that
exist on a beach — a nailed signboard, driftwood tiles, a rope of crystals, a
storm lantern, a plank with a name burnt into it. Light and dark are **noon and
dusk on the same island**, not an inversion, and Patchwerk's enrage is a third
time of day: dusk with a storm in it.

The rule that generated all of the chrome: **nothing in this system is a rounded
rectangle with a soft shadow.** That is settings-screen furniture, and it was the
second-loudest generic tell in the rejected sample after the emoji.

---

## What was deleted in this consolidation

| Gone | Why |
|---|---|
| `Themes/Arcade/**` (palette, world, creatures, chrome, screen) | Q84 chose Storybook. A losing direction kept "for reference" rots. |
| `Samples/QuestBattleSample.swift` | The rejected first sample (paper-cut). |
| `MQTheme.swift` (paper-cut palette), `MQPaper.swift` (paper-cut surface + `MQPaperStyle`) | Those tokens described a direction that no longer exists: violet ink, cyan sky, violet answer keys. |
| `Components/MQBar.swift`, `MQButton.swift`, `MQQuestionCard.swift`, `MQTopBar.swift` | The paper-cut theme's component instances. Every one has a Storybook equivalent (`MQGauge`, `MQAnswerTile` / `MQPlankButton`, `MQSign` + `MQFigureView`, `MQNameTag` + `MQKnob`). |
| `snapshots/battle-*.png`, `snapshots/rework/arcade-*.png` | Output of the two dead directions. |

**Kept from the old architecture**, because the shape was right even where the
skin was not: the layered package (Core / Theme / World / Cast / Components /
Screens), the tokens-as-values idea (`MQType`, `MQSpace`, `MQMotion`, now in
`Theme/MQTokens.swift`), `MQHaptics` (moved to `Core/`, still the only
UIKit fork), `MQFigureCanvas`, `MQDraw`, `MQFonts`, and the snapshot tool with
both of its gates.

`snapshots/rework/storybook-*.png` are deliberately still there: they are the
**before** shot for the mass fix below.

---

## Layout

```
Sources/MQDesign/
  Core/         MQFonts   MQDraw   MQFigureCanvas   MQScene (all screen models)   MQHaptics
  Theme/        MQPalette (noon / dusk / enrage)    MQTokens (type, space, motion, MQTap)
  World/        MQWorld (the beach)                 MQIslandMap (the island from above)
  Cast/         MQCreature -> MQUnicorn MQTurtle MQOctopus MQCrab
  Components/   MQChrome (sign, figure, answer tile, gauge, crystal rope, lantern,
                          tag, name tag, monster name, knob, plank button)
                MQParts  (hero token, map marker, hourglass, stack spar, freeze pips,
                          carved number, rail, scroll)
  Screens/      MQEntranceScreen  MQMapScreen  MQBattleScreen  MQResultScreen  MQPatchwerkScreen
  Resources/Fonts/  Baloo2-Variable.ttf + OFL   (Fredoka and its OFL went with Arcade)
Sources/mqdesign-snap/  Snap.swift
```

---

## Tokens

### Colour — `MQPalette`

Not "six brand colours": a light study of one place, with every value named for
the thing it is made of, so a new prop asks *what is it made of* rather than
*which token do I use*. Three times of day; `.enrage` is `.dusk` with a storm
pushed into the sky and the sea.

| Group | Tokens |
|---|---|
| Air and light | `skyHigh` `skyMid` `skyLow` `sunCore` `sunHalo` `cloud` `cloudShade` |
| Distance | `islandFar` `islandMid` |
| Water | `seaDeep` `seaMid` `seaShallow` `foam` |
| Ground | `sandFar` `sandNear` `sandShade` |
| Foreground | `foliageNear` `foliageMid` |
| Made things | `wood` `woodLight` `woodDark` `woodDeep` `rope` `iron` `parchment` `parchmentEdge` |
| Marks | `ink` (warm brown, never black) `inkSoft` `carved` (cream, for text on dark wood) |
| Roles | `gold` (crystals, streak, the collected thing) · `leaf` (your health, correct) · `coral` (the monster, nothing else) · `frost` (freeze credit — the only cold colour in the system) |
| Light behaviour | `vignette` · `isDusk` · `underLight(_:)` |

Noon `ink #3E2A1A` · `parchment #FBEFD5` · `gold #EFA22C` · `leaf #5AA55B` ·
`coral #D9583C` · `frost #74D6E8`.
Dusk keeps the parchment a light plane (`#F4E3BE`) on purpose: a maths question a
child cannot read is not a mode. Gold *brightens* after dark, because after
sundown it is the only light source in the world.

`p.underLight(_:)` puts a locally-authored colour (a coat, a shell) under the
scene's light: at dusk everything is pulled 30% toward a cool ambient before the
lanterns add warmth back. That is how one drawing serves all three palettes.

### Type — `MQType`

One family: **Baloo 2** (Ek Type, OFL, bundled, registered at runtime with
`CTFontManagerRegisterFontsForURL`). Modular scale ~1.26. Baloo's tall x-height
reads about a size larger than SF at the same point value, so these numbers are
smaller than the first sample's and the rendered result is bigger.

| | micro | label | body | tile | title | question | display |
|---|---|---|---|---|---|---|---|
| compact | 12 | 15 | 17 | 27 | 30 | 22 | 48 |
| regular | 15 | 19 | 22 | 34 | 44 | 34 | 78 |

Every numeral in the system is `monospacedDigit`, so `1.05` and `1.5` do not
shift between answer tiles and four options can be compared by shape.

### Space, motion, tap

`MQSpace` 4 / 8 / 14 / 22 / 34 / 52 · `MQMotion` press 0.10s, base 0.24s, bar
0.45s, celebrate 0.60s spring · `MQTap.min = 44`.

---

## Screens

| Screen | Wide (iPad landscape) | Tall (iPhone) |
|---|---|---|
| `MQEntranceScreen` | Title, four carved tokens in a row on the sand, one parent-facing line | Same, tokens 2x2 |
| `MQMapScreen` | Full-bleed island, header floating on the water, markers at unit coordinates | Same island, stops re-laid as a climbing zig-zag |
| `MQBattleScreen` | Board between two creatures, four tiles along the bottom | Board, facing band, 2x2 tiles |
| `MQResultScreen` | Stats + cast left, review scroll right, buttons under | Stacked, two review rows |
| `MQPatchwerkScreen` | HUD rail, boss bar, board left / dummy right, four tiles | Stacked |

Notes that are laws rather than preferences:

- **The entrance has no retention machinery.** No welcome-back, no last-played,
  no day counter. The fade-out law starts at the front door.
- **The map's unbuilt quests sit in the mist**, roped off, labelled "Coming
  soon". Not greyed-out rows, and not a padlock: nothing is being withheld, it
  simply is not built yet.
- **The result screen shames nothing.** No red cross, no "3 wrong", no tombstone;
  the wrong ones are *worth another look* and arrive with their figure and the
  generator's own one-line explanation. The crab is sitting next to the hero.
- **Patchwerk shows no hero or monster HP.** They carry a fail state the mode
  does not have. The clock is the only thing that can end a run.
- **The enrage is the light, not a border.** The last twenty seconds turn the
  island into a storm at dusk. No red frame, no pulsing chrome, nothing that
  reads as punishment.

---

## The mass fix (battle)

The honest weakness recorded against the first Storybook pass: *the signboard
eats the screen — ~50% of the landscape composition, its parchment the largest,
brightest, flattest area in the frame, and the creatures pushed to the margins as
decoration when the composition claims they are the battle.*

Two changes, both compositional:

1. **The board is capped and sized to its content.** At most 620pt wide instead
   of full width, question and figure **side by side** instead of stacked, and
   the figure slot is the size of the figure. Board height **418 -> 218pt**;
   share of the frame's area **~26% -> ~11%**.
2. **The cast moved into the scene.** Creatures **232 -> 300pt**, standing on the
   dry sand nearer the child while the board's posts are further up the beach,
   overlapping the board's outer edges and drawn *after* it so they are in front.
   The board's 40pt inner margin is the load-bearing detail: it is what keeps
   that overlap off the words.

Each fighter's gauge is pushed to the outside of its own column. Centred, it
drifted over the board and read as debris lying on the paper.

---

## Gates (non-negotiable)

`swift run mqdesign-snap` renders the **DEVICE MATRIX** — 7 screens x 12 device
sizes, iPad in both orientations and iPhone in portrait — writing full-resolution
PNGs for Charlotte's iPad 9.7" (both ways) and the iPhone SE to
`ios/snapshots/matrix/`, the two Kevin-approved sizes to `ios/snapshots/storybook/`,
and 300 px thumbnails for all 84 to `ios/snapshots/matrix/thumbs/`. Then:

1. **Bundled faces resolve.** Every Baloo weight is checked with
   `MQFonts.resolves(_:)` and a miss exits non-zero. A silent fallback to the
   system font quietly reinstates the exact thing this direction replaced.
2. **The fit check.** Every screen is re-rendered at device width with height
   **unconstrained** and compared against the device; overflow is a non-zero
   exit, not a note. Nothing in this app scrolls, so anything taller than the
   device is content a child never sees. It caught a 31pt overflow on the first
   sample that a visual read had passed as balanced, and a 101pt one on the
   Patchwerk enrage in this pass.
3. **44pt tap floor, audited as VALUES.** Every screen conforms to `MQTapAudited`
   and declares what a child may hit, computed from the same constants its body
   draws from. Nothing can measure a hit region out of a PNG, so this is the only
   honest way to gate it — and it earned its keep immediately: the map marker's
   post was 38.9pt at the compact scale of 0.72, on every phone, and nobody had
   noticed. The scale now floors at 0.82.

Current slack, iPad landscape / iPhone: entrance 244 / 179 · map 0 / 0 · battle
164 / 3 · result 113 / 64 · patchwerk 177 / 147 · patchwerk enrage 177 / 35 ·
battle dusk 164 / 3.

The map is a deliberate 0: it is a full-bleed screen that takes its `size` and
fills it, so there is nothing to overflow. What has to be checked on it by eye
instead is that no marker's name plank runs off an edge.

---

## Still unverified

These are `ImageRenderer` PNGs on a headless mini. Sub-pixel text rendering, the
feel of a driftwood tile under a thumb, and whether dusk looks rich or muddy at
real iPad brightness are all unknown until Supreme or a device runs it.
[[feedback_dress_rehearsal_gate]] applies before Charlotte sees any of it.
