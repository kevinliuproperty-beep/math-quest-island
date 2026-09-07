# MQProgress

Where a child has got to. Mastery per skill, an in-session streak, a scaffold that only
ever fades, and JSON on disk. **This is the module the fade-out law lives in** — not
because it is documented here, but because `fadeScaffold` physically cannot raise a level
and every other module has to go through it.

On-device only: no accounts, no server, no child data anywhere but this iPad. Nothing in
here counts days, and nothing in here asks a child to come back.

---

## The model

One profile per child (two or three siblings on one iPad, no login). Under a profile:

| Held | What it is | Where it comes from |
|---|---|---|
| **mastery** per skill | `correct / attempts`, 0…1 | exactly the web's parent-report `pct` |
| **pool** per skill | 1 · 2 · 3, the difficulty the feed should ask for | the web's climb: **3 right in a row up, 2 wrong in a row down**, capped (`js/app.js` `resolve()` / `markWrong()`) |
| **scaffold** per skill | `full → partial → hint → none` | one way, for the lifetime of the profile |
| **session summary** | items, correct, wrong split by reason, best streak, crystals | ends a run; capped at 60, like `DB.sessions` |
| **Patchwerk runs** | tier, damage, best stacks, freeze credits | kept apart from every teaching number; capped at 60, like `DB.pwFame` |

Everything except the profile itself is **derived from the record of attempts**. There is
one write — `record(_:)` — so no mode can invent progress it did not earn.

`Cleared / Ready / Coming soon` are derived, never stored, and come back in the design's
own four cases so the map draws exactly what the record says:

```
comingSoon   the node is not live, or has no skills yet
open         live, and this child has not attempted a single item in it
inProgress   some skills mastered (collected / total is what MQMapMarker draws)
cleared      EVERY skill mastered = >= 4 attempts at >= 80%
```

Four and eighty per cent are the web's own numbers: `rows.filter(r => r.n >= 4 …)` is the
parent report's evidence floor, and `pct >= 80` is the band it paints green.

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
3. **The climb is the web's climb**, graded against a 509-history corpus recorded from
   `js/app.js` (see *Fixture provenance* below). Two behaviours that look like bugs are
   deliberate: at the cap the correct-run counter keeps counting, at the floor the
   wrong-run counter keeps counting. A port that resets either one diverges after the
   first long run.
4. **A torn write loses nothing.** The file is written to a temp, flushed with `fsync`,
   then `rename(2)`d over the old one. Both failure windows are tested with an injected
   fault: after the failed write, the previous file is byte-for-byte intact.
5. **Profiles are isolated.** One child's fade, mastery, pool and history never reach
   another's.

## Teaching state vs play state

They live in the same file and are never mixed.

**Teaching state** — mastery, pool level, scaffold. Written only by `record(_:)`, only
from the record of attempts, and used to decide what a child is shown. It survives a
session, a mode switch, and the parent screen's reset button.

**Play state** — the in-session streak, crystals, damage, stacks, freeze credits,
Patchwerk run rows. It is scoring. It vanishes with the session (or sits in
`patchwerkRuns`, a leaderboard of its own). **A Patchwerk run buys no mastery and fades no
scaffold** — damage is a play number, mastery is a learning number. There is a test that
says so out loud.

The one place the two touch is the crystal, and it is derived rather than reported: a
crystal on every third answer of an unbroken run, six to a session — the web's own crit
threshold (`streak >= 3`) and the web's own chain length. The store cannot compute the
web's real rule (a crystal when a monster's HP hits zero) because it owns no monster, and
a store that took the mode's word for it would be a store a mode can talk into progress.

## Persistence

JSON under `Application Support/MathQuestIsland/progress.json`, schema-stamped, migrated
forward one version at a time by `ProgressCodec.migrate`. **No SwiftData**: iOS 16 is the
floor (Charlotte's iPad 6), SwiftData is 17, and a plain document is the only shape whose
post-crash contents can actually be asserted on.

* `FilePersistence` — the app.
* `InMemoryPersistence` — tests and previews. It round-trips through the *same* codec, so
  a value that would fail to encode on a device fails in the fast suite too.

A file from a **newer** build is refused rather than silently downgraded: decoding it with
this build would drop every field this build does not know about and then write the loss
back over the child's history.

Mastery is written on **every attempt** (the web only saves at `endGame`). An iPad that
dies mid-run loses the run's score — as it does on the web — but not the child's learning.

## How the lanes call it

**MQQuest**, one battle:

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
    item: verdict.correct ? nil : ReviewSnapshot(question: q.stemText, figure: figure,
                                                 answer: q.answerTextPlain,
                                                 explanation: q.explainText),
    topic: q.topic))
// delta.streak, delta.crystalsEarned, delta.poolAfter and delta.scaffold drive the
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
// ... record(_:) per answer, exactly as above; the streak is allowed, the scaffold is not
let summary = await store.endSession(session)
await store.recordPatchwerkRun(
    PatchwerkRun(tier: tier.key, level: profileLevel, damage: run.damage,
                 bestStacks: run.maxStacks, freezesUsed: run.freezesUsed,
                 correct: summary.correct, wrong: summary.total - summary.correct,
                 duration: tier.duration),
    profile: profile)
let board = await store.patchwerkRuns(profile: profile, tier: tier.key, level: profileLevel)
```

## Deltas to the `PHASE1.md` sketch

Additive only — nothing renamed, reordered or removed. Full reasoning in the vault note
`Math Quest Island/Progress Lane — 2026-09-07`. In short: `ProfileID`/`SkillID`/
`SessionID` gained inits; `Attempt` gained `timedOut`, `item` and `topic`; `ProgressDelta`
gained `poolBefore`/`poolAfter`/`wrongReason`; `SessionSummary` gained `mode`, `topic`,
`timeOnItems`, `wrongCounts` and `maxPool`; and the protocol gained pool/node/profile-record
readers, the Patchwerk pair and `resetHistory`. **`MQContent.Verdict.Reason` does not
exist** — the engine's `reason` is a `String?` that does not separate a wrong unit from a
wrong value, so `WrongReason` derives the split here.

## Gate

```
cd ios
./test.command --filter MQProgressTests     # 65 tests, this module only
./test.command                              # THE gate: floor in ios/gate-floor.txt
node tools/fixtures/gen-pool-climb.mjs 500  # re-record the climb corpus from js/app.js
```
