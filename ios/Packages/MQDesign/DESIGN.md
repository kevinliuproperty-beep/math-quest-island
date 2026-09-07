# MQDesign — first sample for the taste gate

Quest Island, cut from paper. One sample screen (Quest battle, mid-question),
rendered headlessly on Kai with SwiftUI `ImageRenderer`, for Kevin's eye before
any batch work. Per [[feedback_design_taste_gate]]: nothing else gets built in
this package until this is ruled on.

## Tokens

**Colour.** Six base values per time of day. Roles are tight on purpose — gold
is the thing you collect *and* the primary action, teal is always your progress,
coral is only ever the monster.

| Token | Noon (light) | Dusk (dark) | Job |
|---|---|---|---|
| `ink` | `#241C4E` | `#140F30` | Every outline and cast edge. A deep violet, never a stand-in for black. |
| `skyTop` / `skyBottom` | `#2FB6D9` → `#7BE0EA` | `#2C1A61` → `#5B3AB8` | The backdrop, and the only gradient in the system. |
| `sand` / `sandInk` | `#FFF2D8` / `#241C4E` | `#EFDCB4` / `#241C4E` | The one light plane. The question lives here. |
| `plank` | `#FFFBF0` | `#3B2A78` | A raised surface on the sky: medallions, icon buttons. |
| `trough` | `#2C7A93` | `#1E1546` | The empty part of any bar. |
| `gold` / `goldInk` | `#FFC53D` / `#3F2A00` | same | Star crystals, streak, primary action. |
| `lagoon` | `#11A99C` | `#22C7B8` | Hero health, correct. |
| `coral` | `#F0503A` | `#FF6A55` | The monster, and nothing else. |
| `key` / `keyInk` | `#6B5BD6` / `#FFF6E4` | `#6B4BD6` / `#FFF6E4` | Answer keys — the same object at both times of day. |

**Type.** One family (SF Rounded), modular scale at ~1.26 from a 13pt base.
Compact `13 / 16 / 20 / 26 / 32 / 32 / 40`, regular `15 / 19 / 22 / 32 / 40 /
50 / 64` as `micro / label / body / key / title / question / display`. The
question grows far faster than the chrome between phone and iPad, because the
extra room belongs to the maths. Every numeral in the system is
`monospacedDigit`.

**Space** `4 / 8 / 14 / 22 / 34 / 52`. **Radii** chip 12, key 18, card 24,
medallion full. **Paper** 3pt ink stroke, 6pt lift (8pt on keys).
**Motion** press 0.10s, base 0.24s, bar 0.45s, celebrate 0.60s spring.

## Rationale, five lines

1. **Flat paper beats glass.** The web app is translucent white on purple, which
   is why its text has never been crisp; every plane here is solid with a hard
   ink outline, so contrast is predictable at arm's length in sunlight.
2. **Light and dark are noon and dusk on the same island**, not an inversion —
   the subject supplies the metaphor, and neither mode is the afterthought. The
   night card is lantern-lit rather than bleached so bedtime play is not a flash.
3. **The landscape iPad is a battle line**: you left, monster right, the problem
   between you, four answers along the bottom under both thumbs. The answer *is*
   the attack, so it sits where a weapon would — that is what makes it a game
   island and not a worksheet.
4. **The press is the animation.** A key drops into its own cast edge and back.
   No scale, no glow, no scattered hover-style motion.
5. **Structure carries information.** Bar notches are hits remaining, not
   decoration; the level badge sits on the portrait the way a game shows rank;
   the hero's name is on the top bar and *not* repeated in the arena, because a
   child knows who they are — the monster keeps its name, because that is the
   thing they have to learn.

## What renders, and the fit check

`swift run mqdesign-snap` writes six PNGs to `ios/snapshots/` and then re-renders
each screen at its device width with height unconstrained, comparing the natural
height against the device. Overflow is a non-zero exit, not a note. It caught a
31pt overflow on iPad landscape that had passed a visual read, which is the
whole reason it exists — the web app clips at 390px and this is the guard
against repeating that natively.

Current: iPad landscape 7pt slack, iPad portrait 172pt, iPhone 15 46pt. Smallest
interactive target anywhere is 48pt (pause, streak chip); answer keys are 92pt
on the phone and 108pt on iPad landscape, against a 44pt floor.

The flat-plane aesthetic is also what makes this lane possible on Kai at all:
solid fills render pixel-exact under `ImageRenderer`, where blur and
`.ultraThinMaterial` do not.

## What a second sample should explore

1. **The answer-feedback states.** `MQAnswerState` has correct / wrong / dimmed
   built, but a mid-question sample never shows them. This is the top of the
   list: how a wrong answer looks matters more for a child than how a question
   looks, and the Patchwerk note's kid-safety rule (no shaming visuals, the
   monster taking damage *is* the feedback) has not yet been tested by eye.
2. **A softer, painterly alternative to the whole look.** The chunky-outline
   idiom is defensible for this audience and a real contrast win, but it is a
   known style. Kevin should get one screen in an alternative direction to
   compare against rather than ruling on this in isolation.
3. **Real sprites.** Emoji are the web's stopgap, framed here in medallions so
   they read as designed tokens. Illustrated characters are the biggest open art
   question and the one thing that would most change the app's character.
4. **A licensed display face.** Everything here is SF Rounded, which is the
   platform's toy voice and therefore also every other kid app's voice. One
   custom face for the question and the results screen is the cheapest way to
   stop looking generic.
5. **Patchwerk's HUD in these tokens** — the stack counter and freeze pips are
   already flagged in the Patchwerk design note as needing a photo ballot, and
   they should be drawn in this system before that gate is called.
