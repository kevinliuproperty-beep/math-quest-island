# Phase 1 seams — what the next lanes code against

This file is a CONTRACT, not documentation. If a signature here changes, the lanes
that consume it break, so it changes by agreement and in the same commit as the code.

Branch `feat/ios-phase1`. Gates: `swift build` at `ios/`, `ios/test.command` (executed-test
floor in `ios/gate-floor.txt`), and `swift run mqdesign-snap` (the DEVICE MATRIX — every
screen at every size, fails on an overflow or a tap target under 44 pt).

**iOS 16 is the floor, everywhere.** Charlotte's iPad is a 6th-generation 9.7" and tops
out at iPadOS 17. No iOS 17+ API is used or guarded — `#available` islands in a design
system produce a look that differs silently by device.

---

## 1. Sizing: `MQMetrics` — every screen takes exactly one of these

```swift
public struct MQMetrics: Sendable, Equatable {
    public var size: CGSize          // full drawable size in points
    public var layout: MQLayout      // .wide (battle line) | .tall (facing band)
    public var type: MQType          // .regular (iPad) | .compact (phone)
    public var insets: MQInsets      // safe areas

    public static func device(_ size: CGSize, insets: MQInsets = .none) -> MQMetrics
    public var isWide: Bool          // layout == .wide
    public var isRegular: Bool       // iPad type scale
    public var isCompact: Bool
    public var isShort: Bool         // height < 720 -- tighten gaps, not art
}
```

`MQMetrics.device(_:insets:)` is the ONLY place layout and type are decided:
**layout follows the aspect ratio, type follows the short edge** (>= 700 pt is iPad type).
A screen never derives one from the other. In the app, build it once per container size and
pass it down; do not read a `GeometryReader` inside a screen (an unbounded proposal reports
zero and the fit gate would measure nothing).

## 2. `MQDesign` — component list with signatures

All initialisers take the palette first and positionally: `MQThing(p, ...)`. Palette
defaults to `.noon`. Every one of these compiles for macOS and iOS.

**Theme** — `MQPalette` (`.noon` / `.dusk` / `.enrage`, plus `underLight(_ c: Color) -> Color`),
`MQType` (`.compact` / `.regular`; `micro label body tile title question display`),
`MQSpace`, `MQMotion`, `MQTheme`, `MQTap.min == 44`, `Font.mq(_ size:_ weight:)`,
`MQWeight`, `MQBoard.frameInset == 15`.

**Core**
```swift
MQFonts.register() -> [String]                    // [] = every face registered
MQFonts.resolves(_ postScriptName: String) -> Bool
MQTypeset.bindUnits(_ text: String) -> String     // "14 cm" -> "14\u{00A0}cm"
String.mqUnitBound: String
MQFit.naturalHeight(_ view: some View, width: CGFloat) -> CGFloat?   // @MainActor
MQFit.slack(_ view: some View, in size: CGSize) -> CGFloat?          // @MainActor
MQFigureCanvas(box: CGSize, draw: (inout GraphicsContext, CGSize) -> Void)
MQHaptics.fire(_ kind: .tap|.correct|.wrong|.crystal)   // the only UIKit fork
```

**Components**
```swift
MQQuestionText(_ p, _ text: String, size: CGFloat, alignment: TextAlignment = .leading)
MQSign(_ p, postHeight: CGFloat = 46, padH: CGFloat = 26, padV: CGFloat = 18) { content }
MQFigureView(_ p, _ figure: MQFigure)
MQAnswerTile(_ p, _ text: String, tilt: Double = 0, fontSize: CGFloat = 34)
    static tilts: [Double]                        // 4 hand-placed angles
MQGauge(_ p, value: Double, readout: String? = nil, side: .hero|.monster|.boss,
        height: CGFloat = 26)
MQCrystalRope(_ p, filled: Int, total: Int, shell: CGFloat = 26)
MQLantern(_ p, streak: Int, size: CGFloat = 46)
MQKnob(_ p, _ glyph: .pause|.back|.plus, size: CGFloat = 48)
MQPlankButton(_ p, _ title: String, primary: Bool = false, fontSize: CGFloat = 22)
MQTag(_ p) { content }
MQNameTag(_ p, name: String, level: String, quest: String, compact: Bool = false)
MQMonsterName(_ p, name: String, size: CGFloat = 20)
MQRail(_ p, padH: CGFloat = 18, padV: CGFloat = 8) { content }
MQScroll(_ p, padH: CGFloat = 26, padV: CGFloat = 20) { content }
MQHeroToken(_ p, profile: MQProfile?, newLabel: String = "New explorer",
            diameter: CGFloat, compact: Bool = false)
MQMapMarker(_ p, node: MQMapNode, scale: CGFloat = 1)
    static postBox: CGSize                        // 54 x 64, the narrowest part
    static hitBox(scale:) -> CGSize               // what the tap audit measures
MQHourglass(_ p, time: String, fraction: Double, size: CGFloat = 56, urgent: Bool = false)
MQStackSpar(_ p, stacks: Int, cap: Int, multiplier: String, compact: Bool = false)
MQFreezePips(_ p, held: Int, total: Int, size: CGFloat = 26)
MQCarvedNumber(_ p, value: String, caption: String, valueSize: CGFloat,
               tint: Color? = nil)
mqDrawCrystal(_ ctx: inout GraphicsContext, _ p, center: CGPoint, r: CGFloat, on: Bool)
```

**World and cast**
```swift
MQWorld(_ p, horizon: CGFloat = 0.34, showForeground: Bool = true)
    static sunAt: CGPoint                         // every shadow in the package uses it
MQBeachCamp(_ p, horizon: CGFloat = 0.40, compact: Bool = false)
MQIslandMap(_ p, landmarks: [(MQLandmark, CGPoint)], route: [CGPoint],
            mistBelow: CGFloat = 0.30)
MQCreature(_ cast: MQCast, _ p)                   // .unicorn .turtle .octopus .crab
    static box(_ cast:) -> CGSize                 // aspect; always frame to it
MQUnicorn / MQTurtle / MQOctopus / MQCrab(_ p, lit: Bool = false)
```

**Screens** — all conform to `MQTapAudited`:
```swift
MQEntranceScreen(scene: MQEntranceScene = .sample, metrics: MQMetrics, palette: = .noon)
MQMapScreen(scene: MQMapScene = .sample, metrics: MQMetrics, palette: = .noon)
MQBattleScreen(scene: MQBattleScene = .sample, metrics: MQMetrics, palette: = .noon)
MQResultScreen(scene: MQResultScene = .sample, metrics: MQMetrics, palette: = .noon)
MQPatchwerkScreen(scene: MQPatchwerkScene = .sample, metrics: MQMetrics)  // palette from .enraged

public protocol MQTapAudited {
    nonisolated static func tapTargets(_ m: MQMetrics) -> [MQTapTarget]
}
public struct MQTapTarget { var name: String; var size: CGSize
                            var least: CGFloat; var clearsFloor: Bool }
```

The screens are pure functions of a scene struct plus `MQMetrics`. They own no state, no
engine and no persistence — which is what makes the headless gate a real gate. A feature
lane keeps its state elsewhere and hands a scene down.

**Rule for anyone adding an interactive element:** put its size in the screen's `geometry`
(or a `static func` next to it), draw from that value, and return it from `tapTargets`.
An element sized by a literal in the body is invisible to the gate.

## 3. `ProgressStore` — the protocol `MQProgress` ships

`MQProgress` owns this. `MQQuest` and `MQPatchwerk` consume it and never write their own
mastery, streak or scaffold state. It is deliberately small: a store, not a service.

**STATUS, 2026-09-07 (phase 1 integration).** This is no longer a sketch. `MQProgress`
ships the real declaration and `MQProgressStore` implements it; both lanes' transcribed
copies (`MQQuest/Progress/ProgressStore.swift`, `MQPatchwerk/Contract/ProgressStore.swift`)
are **deleted** and both targets depend on `MQProgress`. The module's protocol is a
superset of what is printed below - every addition is marked `// + delta` at its
declaration - and nothing printed below was renamed, reordered or removed. Where this file
and the module disagree, **the module is now the contract** and this section says so
rather than being quietly wrong.

```swift
import MQContent   // Question, Verdict, Answer

/// Where a child has got to. On-device only: no accounts, no server, no child data
/// anywhere but this iPad.
public protocol ProgressStore: Sendable {

    // ---- mastery, per skill --------------------------------------------------
    /// 0...1. The design draws it as crystals, never as a percentage: a percentage
    /// is a number about the child, crystals are a number about the island.
    func mastery(profile: ProfileID, skill: SkillID) async -> Double
    func mastery(profile: ProfileID) async -> [SkillID: Double]

    /// The ONE write. Everything else here is derived from the record of attempts,
    /// so no mode can invent progress it did not earn.
    @discardableResult
    func record(_ attempt: Attempt) async -> ProgressDelta

    // ---- streak ---------------------------------------------------------------
    /// Consecutive correct answers WITHIN a session. Resets to zero on a wrong
    /// answer and when a session ends. It is never a day count and never spans
    /// sessions: a cross-session streak is retention machinery, which the
    /// fade-out law forbids. Play modes may keep this; scaffolds may not re-grow.
    func streak(session: SessionID) async -> Int

    // ---- scaffold: FADES, NEVER GROWS -----------------------------------------
    /// How much help a skill still shows. `full -> partial -> hint -> none`, and
    /// the transition is ONE WAY for the lifetime of a profile.
    func scaffold(profile: ProfileID, skill: SkillID) async -> ScaffoldLevel
    /// Returns the level actually stored. Requesting a HIGHER level than the one
    /// held is a no-op that returns the held level -- the law is enforced here, in
    /// the store, not in each mode's good intentions. A failing run gets more
    /// TIME and easier ITEMS, never its training wheels back.
    @discardableResult
    func fadeScaffold(profile: ProfileID, skill: SkillID,
                      to level: ScaffoldLevel) async -> ScaffoldLevel

    // ---- session --------------------------------------------------------------
    // + delta in the module: `beginSession(profile:mode:topic:)`, so a record can name
    //   the island it was played on. This two-argument form delegates to it with nil.
    func beginSession(profile: ProfileID, mode: PlayMode) async -> SessionID
    /// Ends the session and returns what the result screen renders. Idempotent:
    /// calling it twice returns the same summary and starts nothing.
    func endSession(_ session: SessionID) async -> SessionSummary

    // ---- profiles (no accounts) ------------------------------------------------
    func profiles() async -> [MQProfile]
    func addProfile(name: String, cast: MQCast, level: String) async -> ProfileID
    func removeProfile(_ id: ProfileID) async
}

public struct ProfileID: Hashable, Sendable { public let raw: String }
public struct SkillID:   Hashable, Sendable { public let raw: String }  // engine's own key
public struct SessionID: Hashable, Sendable { public let raw: String }

public enum PlayMode: String, Sendable { case quest, patchwerk }

/// Ordered, and the order is the law: a store may only ever move DOWN this list.
public enum ScaffoldLevel: Int, Comparable, Sendable {
    case none = 0, hint = 1, partial = 2, full = 3
}

public struct Attempt: Sendable {
    public var session: SessionID
    public var profile: ProfileID
    public var skill: SkillID
    public var verdict: Verdict          // from MQContent
    public var elapsed: TimeInterval
    /// What the child was actually shown. Recorded so a later fade is auditable.
    public var scaffoldShown: ScaffoldLevel
    // + delta in the module: `timedOut`, `item` (a ReviewSnapshot carrying the engine's
    //   whole `MQContent.Figure`), `topic`, `crystalsReported` and `mode`. All defaulted,
    //   so an attempt written against the four lines above still compiles.
}

/// What changed, so a mode can animate it without re-reading the store.
public struct ProgressDelta: Sendable {
    public var masteryBefore: Double
    public var masteryAfter: Double
    public var streak: Int
    public var scaffold: ScaffoldLevel   // post-attempt; <= what was shown
    public var crystalsEarned: Int
}

/// Exactly what MQResultScreen renders. Nothing in it asks the child to come back:
/// no day counter, no "see you tomorrow", no next-session countdown.
public struct SessionSummary: Sendable {
    public var correct: Int
    public var total: Int
    public var bestStreak: Int
    public var elapsed: TimeInterval
    public var crystalsEarned: Int
    /// The wrong ones, with the generator's own one-line explanation. The review
    /// IS the result screen; the score is four small carved numbers beside it.
    public var worthAnotherLook: [MQReviewItem]
}
```

Consumer rules, in one line each:

- **MQQuest** calls `beginSession`, `record` per answer, `endSession` once, and reads
  `scaffold(profile:skill:)` to decide what to draw. It never writes scaffold up.
- **MQPatchwerk** calls the same three and may keep `streak` — a play mode is allowed a
  streak. **A Patchwerk answer touches NO teaching state**: no mastery, no pool, no
  scaffold, and no skill row is even created. It is counted (the session tally, the
  in-session streak, the run's damage) and it teaches nothing.

  *This sentence was reversed on the phase 1 integration, 2026-09-07, and the reversal is
  the integrator's ruling.* It used to read "it may not read or write mastery differently
  from Quest, because damage is a play number and mastery is a learning number" — and the
  second half of that sentence is the argument for the OPPOSITE of its first half.
  Patchwerk's item pool is drawn from `pwPoolWeights(stacks)`, a random 1/2/3 weighted by
  a **scoring** number; letting that write the child's teaching pool is exactly the
  crossing the play/teaching split exists to prevent. `MQProgress`'s fix pass had already
  built the fence and flagged the conflict for this desk (Progress Refutation W3); the
  module keeps the fence and the contract now agrees with it.

  The fence is armed by `Attempt.mode`, so a mode must SAY which it is:
  `PatchwerkSession` passes `mode: .patchwerk` and `QQuestModel` passes `mode: .quest`.
  An attempt on a session the store has never seen is treated as Quest, because losing a
  child's learning to a mode that forgot to open a session is the worse failure. Gated
  from both sides: `MQProgressTests` drives 30 Patchwerk answers through `record()` and
  asserts mastery, pool, scaffold and the skill row all unmoved, and `MQPatchwerkTests`
  drives a whole real run and asserts the same through the real store.

  This is Kevin's law drawn rather than described: **play modes keep streaks, teaching
  scaffolds fade.** A streak is play state and may move; a scaffold is teaching state and
  only ever fades.

- **The crystal is REPORTED, not derived.** A store owns no monster and no damage roll, so
  it cannot compute the web's crystal. The battle computes it — `monsterFell` is
  `js/app.js`'s `monsterDown()` — and hands it over as `Attempt.crystalsReported`; the
  store BOUNDS it (at most one per correct answer, none on a wrong one, at most six a
  session). A mode that models no monster leaves it at 0 and no crystal is awarded.
  Graded end to end against 200 real web sessions in `tools/fixtures/web-crystals-200.json`
  (`MQQuestTests.QWebCrystalTests`, `MQProgressTests.WebCrystalTests`).
- **UI never imports `MQEngineJS`** — only `MQContent`. The composition root wires one
  `JSQuestionEngine` at launch and hands it up as a `QuestionSource`.

## 4. Screen -> component map

| Screen | Components it composes |
|---|---|
| Entrance (`MQEntranceScreen`) | `MQWorld` · **`MQBeachCamp`** · `MQHeroToken` x N+1 (depth-staggered) · `MQTag` (parent line) · `mqDrawCrystal` (title crystals) |
| Island map (`MQMapScreen`) | `MQWorld` via `MQIslandMap` · `MQMapMarker` per node · `MQCreature` ("you are here") · `MQKnob(.back)` · `MQNameTag` |
| Quest battle (`MQBattleScreen`) | `MQWorld` · `MQNameTag` · `MQCrystalRope` · `MQLantern` · `MQKnob(.pause)` · `MQSign` + **`MQQuestionText`** + `MQFigureView` · `MQGauge` x2 · `MQMonsterName` · `MQCreature` x2 · `MQAnswerTile` x4 |
| Result (`MQResultScreen`) | `MQWorld` · `MQTag` (stat grid) · `MQScroll` + **`MQQuestionText`** + `MQFigureView` per review row · `MQCreature` x2 · `MQPlankButton` x3 |
| Patchwerk (`MQPatchwerkScreen`) | `MQWorld` · `MQRail` · `MQHourglass` · `MQCarvedNumber` · `MQStackSpar` · `MQFreezePips` · `MQKnob(.pause)` · `MQGauge(.boss)` · `MQSign` + **`MQQuestionText`** + `MQFigureView` · `MQCrab(lit:)` · `MQAnswerTile` x4 |

Screens not yet drawn and who owns them: pause sheet (MQQuest), profile creation
(MQApp), Patchwerk tier picker (MQPatchwerk), Game Center leaderboard (MQServices).

## 5. Gate commands

```
cd ios
swift build                 # builds MQContent, MQEngineJS, MQDesign and mqdesign-snap
./test.command              # THE gate: 71 executed tests, floor in gate-floor.txt
swift run mqdesign-snap     # DEVICE MATRIX: 12 sizes x 7 screens, PNGs + slack table
```

`mqdesign-snap` writes full-resolution PNGs for Charlotte's two orientations and the
iPhone SE into `ios/snapshots/matrix/`, the two Kevin-approved sizes into
`ios/snapshots/storybook/`, and 300 px thumbnails for everything into
`ios/snapshots/matrix/thumbs/`.
