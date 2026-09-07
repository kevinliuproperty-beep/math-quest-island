# MQProgress

Where a child has got to. Mastery per skill, an in-session streak, a scaffold that only
ever fades, and JSON on disk. **This is the module the fade-out law lives in** — not
because it is documented here, but because `fadeScaffold` physically cannot raise a level
and every other module has to go through it.

On-device only: no accounts and no server. Nothing in here counts days, and nothing in
here asks a child to come back.

The file is written **excluded from iCloud and iTunes backup**, and on a device with
**complete file protection**. Until the fix pass of 2026-09-07 this README said "no child
data anywhere but this iPad" three times while `progress.json` sat at mode 0644 with
`isExcludedFromBackup == false` and no protection class, so the child's name and their
whole learning history rode into every backup. macOS has no per-file protection class, so
the Kai gate proves the exclusion and says plainly that it cannot attest to the other.

---

## The model

One profile per child (two or three siblings on one iPad, no login). Under a profile:

| Held | What it is | Where it comes from |
|---|---|---|
| **mastery** per skill | `correct / attempts`, 0…1 | exactly the web's parent-report `pct` |
| **pool** per skill | 1 · 2 · 3, the difficulty the feed should ask for | the web's climb: **3 right in a row up, 2 wrong in a row down**, capped (`js/app.js` `resolve()` / `markWrong()`) |
| **scaffold** per skill | `full → partial → hint → none` | one way, for the lifetime of the profile |
| **session summary** | items, correct, wrong split by reason, best streak, crystals | ends a run; capped at 60, like `DB.sessions` |
| **crystals** | 0-6 a session | **reported by the battle**, bounded by the store - see below |
| **Patchwerk runs** | tier, damage, best stacks, freeze credits | kept apart from every teaching number; capped at 60, like `DB.pwFame` |

Everything except the profile itself is **derived from the record of attempts**. There is
one write — `record(_:)` — so no mode can invent progress it did not earn.

`Cleared / Ready / Coming soon` are derived, never stored, and come back in the design's
own four cases so the map draws exactly what the record says:

```
comingSoon   the node is not live, or has no skills yet
open         live, and this child has not attempted a single item in it
inProgress   some skills mastered (collected / total is what MQMapMarker draws)
cleared      what NodeClearedPolicy says - see below
```

`NodeProgress.mastered` is always the strict statement (**every** skill at >= 4 attempts
and >= 80%) whatever the policy says, so a parent report can read the honest number while
the island draws the generous one. Four and eighty per cent are the web's own numbers:
`rows.filter(r => r.n >= 4 …)` is the parent report's evidence floor, and `pct >= 80` is
the band it paints green.

### What makes an island Cleared — a POLICY, chosen at store construction

**Kevin ruled Q87 = MATCH WEB on 2026-09-07**, so `.webVictory` is the default.

| `NodeClearedPolicy` | Cleared when | 2 skills | 3 | 4 | 7 |
|---|---|---|---|---|---|
| **`.webVictory`** (default) | a finished session ON THIS NODE filled the six-crystal rope | 145/200 | 145/200 | 145/200 | 145/200 |
| `.mastery` | every skill in the node mastered | 58/200 | 11/200 | 0/200 | 0/200 |
| `.both` | the BADGE from `.webVictory`, the `mastered` FLAG from `.mastery` | both columns, unmixed | | | |

Measured by replaying 200 sessions of the real web game (`tools/fixtures/web-crystals-200.json`)
with items dealt round-robin across the node's skills. A real topic carries 2 to 7 skills,
median 3. Under `.mastery` a child who WON a run - trophy, confetti, "saved all 6 Star
Crystals" - walked back to a map that still said *Ready*, every single time, on any node
with four or more skills. `.mastery` is a term-length measure of real learning and
`.webVictory` is a one-run measure of a good evening; they are both defensible and they
are not the same thing, which is why both are implemented and both are gated.

## The invariants

1. **The scaffold never rises.** `fadeScaffold(to:)` returns the level *actually stored*.
   Asking for a higher one is a no-op that hands back what is held, and an `assert` fires
   in debug if the store ever contradicts itself. Hammered by 10,000 seeded random events
   in `FadeInvariantTests`. A failing run gets more **time** and easier **items**, never
   its training wheels back — and that includes across a session boundary and across the
   parent screen's reset button.
2. **The streak is in-session and nothing else.** It resets on a wrong answer and when a
   session ends. A cross-session streak is retention machinery, which the fade-out law
   forbids. Play modes may keep it; scaffolds may not re-grow because of it.
3. **The scaffold ladder is one step per 7 straight correct answers in a skill.** See
   *The fade ladder* below. The run counter persists across sessions and resets only on a
   wrong answer.
4. **The climb is the web's climb**, graded against a 509-history corpus recorded from
   `js/app.js` (see *Fixture provenance* below). Two behaviours that look like bugs are
   deliberate: at the cap the correct-run counter keeps counting, at the floor the
   wrong-run counter keeps counting. A port that resets either one diverges after the
   first long run.
5. **A torn write loses nothing.** The file is written to a temp, flushed with `fsync`,
   then `rename(2)`d over the old one. Both failure windows are tested with an injected
   fault: after the failed write, the previous file is byte-for-byte intact. Proved again
   after the write-coalescing change with 50 real `SIGKILL`s at 5.7 MB: 0 load failures,
   0 state regressions.
6. **Profiles are isolated.** One child's fade, mastery, pool and history never reach
   another's.
7. **A review row keeps the diagram.** `ReviewSnapshot` and `StoredReview` carry
   `MQContent.Figure` — all eight engine kinds — not MQDesign's three-case `MQFigure`.
   Measured over 1,500 real draws, 216 questions carried a figure and the three-case type
   lost **180 of them (83%)** to `.none`, so a bar-graph question came back on the result
   screen as bare text. `MQReviewItem` derives the drawable projection at render time,
   which is the only place it belongs.

## Teaching state vs play state

They live in the same file and are never mixed.

**Teaching state** — mastery, pool level, scaffold. Written only by `record(_:)`, only
from the record of attempts, and used to decide what a child is shown. It survives a
session, a mode switch, and the parent screen's reset button.

**Play state** — the in-session streak, crystals, damage, stacks, freeze credits,
Patchwerk run rows. It is scoring. It vanishes with the session (or sits in
`patchwerkRuns`, a leaderboard of its own).

**A Patchwerk ANSWER touches no teaching state at all** — no mastery, no pool climb, no
scaffold fade. It was not true until 2026-09-07: twelve answers on a `.patchwerk` session
took mastery to 1.0, the pool from 1 to 3 and the scaffold from full to `none`, while this
README claimed the opposite in bold and the test named after the claim called
`recordPatchwerkRun`, which touches no skill state on any code path and therefore could
not fail. The fence now lives in `record(_:)`, keyed off the attempt's mode (or the live
session's), and the test drives `record` with 30 Patchwerk answers and asserts that
nothing moved — including that the skill row is never even created.

> This **diverges from `ios/PHASE1.md` §3**, which says MQPatchwerk "may not read or write
> mastery differently from Quest". That sentence and this module's headline separation
> cannot both hold. The fix pass kept the separation, because Patchwerk draws its pool
> from `pwPoolWeights(stacks)` — a random 1/2/3 weighted by a *scoring* number — and a
> teaching pool written from a scoring number is exactly the thing the split exists to
> prevent. **For the integrator to rule on.**

### Crystals — the BATTLE computes them, the store bounds them

The web's rule is monster HP, and a store owns no monster:

```
MONSTERS   = [50, 60, 70, 80, 90, 140] HP, dealing [10, 12, 12, 14, 14, 16]
on correct   S.streak++;  (S.rightRow >= 3 && S.level < 3) -> S.level++
             crit = S.streak >= 3
             dmg  = (18 + S.level*6 + ri(0,4)) * (crit ? 2 : 1)
             S.mHp -= dmg;   S.mHp <= 0 -> monsterDown()
monsterDown  ONE crystal (S.mi++), heroHp = min(100, heroHp + 12),
             S.mHp = MONSTERS[S.mi].hp     <- overkill NEVER carries
             S.mi >= 6 -> endGame(true), the six-crystal victory
on wrong     heroHp -= MONSTERS[S.mi].dmg + ri(0,3);  heroHp <= 0 -> endGame(false)
```

So the mode reports it — `Attempt.crystalsReported` — and the store **bounds** it: never
more than one per answer, never anything on a wrong answer, never past six in a session,
never negative. `ProgressDelta.crystalsAwarded` is what actually landed on the rope, and
it is the only number an animation should read.

This store used to **re-derive** the crystal instead: one on every third answer of an
unbroken run. Measured against 200 real sessions it awarded a mean of **2.55** where the
web awards **5.28**, was lower in 199 of 200 sessions and higher in none, and **filled the
six-crystal rope 0 times out of 200** where the web fills it 145. The arithmetic is
unarguable: `streak % 3 == 0` with a reset on every wrong answer needs 18 correct answers
with no mistake between them, and a real run is 17.1 items long.

The design intent behind the re-derivation was right and is kept: a store that took a
mode's word for a crystal is a store a mode can talk into progress. The bound is what
keeps that true. `WebCrystalTests` replays the same 200 sessions with a mode that claims
99 crystals on every answer and gets six.

## The fade ladder — the fade-out law's first concrete parameter

`full -> partial -> hint -> none`, **one step down per 7 consecutive correct answers in
the same skill**, never up. The run counter resets on a wrong answer and on nothing else -
not on a session boundary, not on a mode switch, not on the parent screen's reset.

Simulated over 400 children a band, 17-item sessions, every item in the session on one
skill. The session in which each step first arrives (median), and how many of the 400
lose every scaffold inside their FIRST sitting:

| Child's accuracy | -> partial | -> hint | -> **none** | mean session for `none` | `none` in session 1 |
|---|---|---|---|---|---|
| 60% | 4 | 9 | 14 | 15.3 | **0 / 400** |
| 70% | 2 | 4 | 6 | 7.2 | **0 / 400** |
| **80%** | 1 | 2 | **3** | 3.7 | **0 / 400** |
| 90% | 1 | 2 | 2 | 2.4 | **0 / 400** |
| 100% | 1 | 1 | 2 | 2.0 | **0 / 400** |

**What it replaces.** The scaffold used to be a pure function of the pool
(`pool >= 3 && mastered -> none`), which meant six correct answers on the EASIEST pool and
every piece of help was gone for the lifetime of the profile. An 80%-accurate child hit
`none` in their first sitting **293 times out of 400**; a child who never missed did it on
item 6, every time. That may be exactly what "the best day is the day you do not need me"
means — but it was a side effect of `pool >= 3`, not a decision.

**Why 7.** Three steps need 21 straight correct answers and a session is 17 items, so no
child can lose everything in one sitting at any accuracy. 6 lands at the same median at
80% but a mean of 2.85, which is too fast at the top of the range; 8 pushes 70% out to a
median of session 9, which strands a struggling child on training wheels for a term.

**FOR KEVIN'S EYE.** `MQRule.fadeAfterConsecutiveCorrect` is the first number the
fade-out law has ever had, and there is a child on the other end of it.

**And it still has no consumer.** `ScaffoldLevel` appears in `MQProgress` and nowhere
else: `MQBattleScene` has no scaffold or hint field, nothing in `MQDesign` or `MQContent`
varies with it, and the web has no scaffolds at all. Nobody has yet seen what `none` looks
like on a screen. That is expected at phase 1 and it is stated here rather than left to be
discovered: this ladder is a law about a field with no reader, and the number above is a
proposal until a screen draws it and Kevin plays it.

## Persistence

JSON under `Application Support/MathQuestIsland/progress.json`, schema-stamped (**v3**),
migrated forward one version at a time by `ProgressCodec.migrate`. **No SwiftData**: iOS 16
is the floor (Charlotte's iPad 6), SwiftData is 17, and a plain document is the only shape
whose post-crash contents can actually be asserted on.

* `FilePersistence` — the app.
* `InMemoryPersistence` — tests and previews. It round-trips through the *same* codec, so
  a value that would fail to encode on a device fails in the fast suite too.

A file from a **newer** build is refused rather than silently downgraded: decoding it with
this build would drop every field this build does not know about and then write the loss
back over the child's history. An **unstamped** document that has profiles in it is read
as v1 and migrated forward; it used to be replaced wholesale with an empty document, which
was the one path in the module where data was lost rather than refused.

The fade law is enforced on **load** as well as on the mutator. A restored backup, or a v1
file, claiming `full` for a skill with 40 straight correct answers used to come back up as
`full`. Each skill is now clamped on open to the fewest ladder steps its totals can force
— never a guess at the actual one, and on an unbroken run exactly the live ladder — so the
clamp can only ever lower a level and can never out-fade the ladder itself.

### Writes are coalesced off the tap path

Mastery is still written on **every attempt** (the web only saves at `endGame`), but the
DISK write is debounced. `record(_:)` marks the document dirty; one write follows after
`WritePolicy.coalesced(seconds:)` of quiet, and `endSession`, `addProfile`,
`removeProfile`, `rename`, `setLevel`, `resetHistory` and `recordPatchwerkRun` all write
through immediately. `flush()` is the backgrounding hook — call it from
`scenePhase == .background`, `willResignActive` and `willTerminate`.

Measured on Kai at a **599,707-byte** document (3 profiles x 50 sessions x 20 items), 200
awaited `record()` calls:

| | one `record()` |
|---|---|
| before — encode + `fsync` + `rename(2)` on every tap | **8.17 ms** |
| after — `.coalesced(seconds: 0.4)`, the app's default | **0.005 ms** |

The cost did not disappear; it moved off the child's finger. Charlotte's iPad 6 is an A10
with materially slower NAND than this mini, so the before-number is the optimistic one.
**Atomicity is unchanged** and was re-proved after the change: 50 real `SIGKILL`s of a
live writer at up to 5.7 MB, 0 load failures and 0 state regressions.

The exposure is bounded and stated plainly: a kill inside the window loses at most the
attempts made inside it — sub-second, and never a session's summary.

## How the lanes call it

**MQQuest**, one battle. The battle computes the crystal; the store bounds it:

```swift
let session = await store.beginSession(profile: profile, mode: .quest, topic: "geometry")
let pool    = await store.poolLevel(profile: profile, skill: skill)
let help    = await store.scaffold(profile: profile, skill: skill)   // what to DRAW
let q       = try await engine.nextQuestion(.feed(topic: "geometry", level: pool,
                                                  session: session.raw))

let verdict = try await engine.grade(question: q, answer: answer)
let delta   = await store.record(Attempt(
    session: session, profile: profile, skill: SkillID(q.skill),
    verdict: verdict, elapsed: secondsOnItem, scaffoldShown: help,
    item: verdict.correct ? nil : ReviewSnapshot(question: q.stemText, figure: q.figure,
                                                 answer: q.answerTextPlain,
                                                 explanation: q.explainText),
    topic: q.topic,
    crystalsReported: battle.monsterFellOnThisAnswer ? 1 : 0,
    mode: .quest))
// delta.streak, delta.crystalsAwarded, delta.poolAfter and delta.scaffold drive the
// animation. Never re-read the store to find out what just happened.
```

**MQQuest**, the result screen and the map — both are pure reads:

```swift
let summary = await store.endSession(session)      // idempotent
resultScene.stats   = [MQStat("\(summary.correct) / \(summary.total)", "correct"),
                       MQStat("\(summary.bestStreak)", "best streak")]
resultScene.reviews = summary.worthAnotherLook     // already deduped, already capped at 8

for topic in catalogue.topics {
    let node = await store.node(profile: profile, topic: topic)
    mapScene.nodes.append(MQMapNode(topic.name, node.state.asMapState,
                                    at: layout[topic.id]!, landmark: landmark[topic.id]!))
}
```

**MQPatchwerk** — same store, same streak, and the run record kept apart:

```swift
let session = await store.beginSession(profile: profile, mode: .patchwerk)
// ... record(_:) per answer, exactly as above. The session's mode is the fence: the
// streak and the leaderboard are yours, mastery / pool / scaffold are untouched, and
// `delta.touchedTeachingState` is false so an animation can tell.
let summary = await store.endSession(session)
await store.recordPatchwerkRun(
    PatchwerkRun(tier: tier.key, level: profileLevel, damage: run.damage,
                 bestStacks: run.maxStacks, freezesUsed: run.freezesUsed,
                 correct: summary.correct, wrong: summary.total - summary.correct,
                 duration: tier.duration),
    profile: profile)
let board = await store.patchwerkRuns(profile: profile, tier: tier.key, level: profileLevel)
```

## Why a wrong answer was wrong

`WrongReason` **maps `Verdict.reasonKind` and stops**. It used to derive the unit-vs-value
split itself, from `Verdict.parsed.unit` against `Verdict.expectedText`, and measured
against the engine on the `feat/unit-sweep` build that disagreed on **260 of 5,942
classified cells (4.4%)**, including **17.9% of wrong-value money cells**: `"27 stickers"`
ends with `"s"`, so a child typing `27 s` read as a value error, and `"$4.35"` puts the
unit at the FRONT, so every wrong money number typed with a `$` read as a unit error. A
string-suffix match is not a grader and this module is not the grader.

`MQContent.Verdict.Reason` now exists on this branch, **copied verbatim from
`feat/unit-sweep` @ `ff487a3` so that merge is a no-op**. The engine on this branch still
emits one string for both halves, which lands as `.other("wrong value or unit")` and is
counted as `WrongReason.wrongValueOrUnit` — named, counted, never guessed at. When the
sweep merges the engine emits `wrong-unit` / `wrong-value`, `wrongUnitCount` and
`wrongValueCount` start filling, and `wrongValueOrUnit` goes to zero on its own with no
code change. Both behaviours are gated today.

## Architecture: this module imports MQContent and nothing else

`MQProfile`, `MQCast`, `MQReviewItem`, `MQFigure`, `MQMapNode` and `MQLandmark` live in
**MQContent**; MQDesign re-exports them as typealiases and keeps every pixel of the
rendering. MQProgress used to `import MQDesign` to say those names, which pulled SwiftUI
and a bundled font resource into a persistence layer and pinned it to a UI platform - the
opposite of the brief's architecture rule that a logic package never imports a UI package.
`ios/Package.swift` now declares `MQProgress` against `MQContent` alone, so the rule is
enforced by the build rather than by a review note.

## Deltas to the `PHASE1.md` sketch

Additive except where noted. Full reasoning in the vault notes
`Math Quest Island/Progress Lane — 2026-09-07` and its *Fix pass 2026-09-07* section. In
short: `ProfileID`/`SkillID`/`SessionID` gained inits; `Attempt` gained `timedOut`,
`item`, `topic`, **`crystalsReported`** and **`mode`**; `ProgressDelta` gained
`poolBefore`/`poolAfter`/`wrongReason`/**`crystalsAwarded`**/**`touchedTeachingState`**
(`crystalsEarned` stays as the contract's spelling of `crystalsAwarded`); `SessionSummary`
gained `mode`, `topic`, `timeOnItems`, `wrongCounts` and `maxPool`; `NodeProgress` gained
`mastered` and `wonARun`; and the protocol gained pool/node/profile-record readers, the
Patchwerk pair, `resetHistory`, **`rename(_:profile:)`** and **`flush()`**.

**One NON-additive delta**, flagged for the integrator: a Patchwerk answer no longer writes
mastery, pool or scaffold, which contradicts `PHASE1.md` §3's "may not read or write
mastery differently from Quest". See *Teaching state vs play state*.

## Gate

```
cd ios
./test.command --filter MQProgressTests          # this module only
./test.command                                   # THE gate: floor in ios/gate-floor.txt
node tools/fixtures/gen-pool-climb.mjs 500       # re-record the climb corpus from js/app.js
node tools/fixtures/gen-web-crystals.mjs 200     # re-record the crystal + Cleared corpus
node tools/fixtures/gen-web-crystals.mjs --check # ...or just check the committed one
```

Both generators are PINNED: they grep `js/app.js` for the lines that ARE the rule they are
recording (four for the climb, seven for the battle) and refuse to emit a fixture if one
has moved. Change the web and the generator goes red naming the missing line.
