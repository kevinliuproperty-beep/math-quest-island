import Foundation
import MQContent

// MQProgress - where a child has got to.
//
// This file is the CONTRACT half: the protocol from ios/PHASE1.md §3, verbatim where the
// sketch defined something, plus the ADDITIVE members the web semantics need. Nothing
// from the sketch is renamed or removed. Every addition is marked `// + delta` and is
// listed in the vault note "Progress Lane - 2026-09-07".
//
// On-device only: no accounts and no server. The document is written excluded from
// iCloud/iTunes backup and, on a device, with complete file protection - see
// `FilePersistence.protect`. That claim used to be printed three times in this module and
// was false as written (Progress Refutation W6, 2026-09-07).

// MARK: - Identity

/// A profile's identity. Stable for the life of the profile and independent of the
/// child's NAME, which they may change.
public struct ProfileID: Hashable, Sendable, Codable {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }        // + delta: the sketch declared no init
}

/// The engine's own skill key (`Question.skill`), carried opaquely.
public struct SkillID: Hashable, Sendable, Codable {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }        // + delta
}

public struct SessionID: Hashable, Sendable, Codable {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }        // + delta
}

public enum PlayMode: String, Sendable, Codable { case quest, patchwerk }

// MARK: - The one-way ratchet

/// Ordered, and the order is the law: a store may only ever move DOWN this list.
public enum ScaffoldLevel: Int, Comparable, Sendable, Codable, CaseIterable {
    case none = 0, hint = 1, partial = 2, full = 3

    // Spelled out rather than left to the compiler's enum synthesis. The whole module
    // rests on this comparison; it should be readable in one place.
    public static func < (a: ScaffoldLevel, b: ScaffoldLevel) -> Bool { a.rawValue < b.rawValue }
}

// MARK: - What a mode reports

/// What the child was shown alongside the item they got wrong, captured at the moment
/// they got it wrong so the result screen can show it back.
///
/// + delta. The sketch's `SessionSummary.worthAnotherLook` is `[MQReviewItem]`, but
/// `Attempt` carried nothing the store could build one FROM: `Verdict` holds the ruling,
/// not the stem, the figure or the explanation. The web does exactly this capture -
/// `S.wrongs.push({q, a, ex, skill})` in `js/app.js` - so this is the web's own shape,
/// not a new idea. Optional, so a mode that does not care still compiles.
/// **The figure is `MQContent.Figure`, all eight kinds** - never MQDesign's three-case
/// `MQFigure`. It used to be the latter, and the refuter measured the cost: over 1,500
/// engine draws, 216 questions carried a figure and **180 of them (83%) lost it to
/// `.none`** the moment the row was stored, because `bar`, `line`, `table`, `lshape` and
/// `pie` have nowhere to go in a three-case enum. A bar-graph question came back on the
/// result screen as bare text (Progress Refutation W7, 2026-09-07). The store now keeps
/// what the engine emitted and lets the RENDERER decide what it can draw today.
public struct ReviewSnapshot: Sendable, Equatable {
    public var question: String
    /// The engine's own spec, kept whole.
    public var figure: Figure?
    public var answer: String
    public var explanation: String

    public init(question: String, figure: Figure? = nil, answer: String, explanation: String) {
        self.question = question; self.figure = figure
        self.answer = answer; self.explanation = explanation
    }

    public var reviewItem: MQReviewItem {
        MQReviewItem(question: question, spec: figure, answer: answer, explanation: explanation)
    }
}

public struct Attempt: Sendable {
    public var session: SessionID
    public var profile: ProfileID
    public var skill: SkillID
    public var verdict: Verdict          // from MQContent
    public var elapsed: TimeInterval
    /// What the child was actually shown. Recorded so a later fade is auditable.
    public var scaffoldShown: ScaffoldLevel
    /// + delta: the clock ran out rather than the child answering. `js/app.js timeUp()`
    /// marks the item wrong and counts it; without this flag a timeout is indistinguishable
    /// from an empty submission, and the result screen wants to say "time's up".
    public var timedOut: Bool
    /// + delta: see `ReviewSnapshot`. Supply it on a wrong answer; nil is fine.
    public var item: ReviewSnapshot?
    /// + delta: which topic node the item came from, so a session record can name its
    /// island the way `DB.sessions[].topic` does on the web. Optional.
    public var topic: String?

    /// + delta, and the fix for Progress Refutation W1: **how many crystals the BATTLE
    /// awarded for this answer.**
    ///
    /// The store no longer re-derives this. The web's rule is monster HP - a crystal
    /// when `S.mHp <= 0` after `dmg = (18 + S.level*6 + ri(0,4)) * (S.streak >= 3 ? 2 : 1)`
    /// against `MONSTERS = [50, 60, 70, 80, 90, 140]` - and a store owns no monster and
    /// no damage roll, so the only faithful number is the one the mode computed. The
    /// store BOUNDS it instead of trusting it: never more than one per correct answer,
    /// never anything on a wrong answer, never more than six in a session. That keeps
    /// the honesty the re-derivation was defending while giving the child the web's own
    /// number. Measured over the committed corpus of 200 real web sessions
    /// (`tools/fixtures/web-crystals-200.json`): the web awards a mean of **5.285** a
    /// session and fills the six-crystal rope **145 times**; the re-derivation awarded
    /// **2.55** and filled it **0 times in 200** (the refuter's own run, same method,
    /// different seed: 5.38 and 154).
    ///
    /// A mode that does not model a monster leaves it at 0 and no crystal is awarded.
    public var crystalsReported: Int

    /// + delta: which mode this answer was played in, when the caller wants to be
    /// explicit. Nil means "whatever the live session says", and a session the store
    /// has never seen is treated as `.quest`. This exists because Patchwerk answers must
    /// not touch teaching state (W3) and an attempt on an unopened session would
    /// otherwise silently be graded as Quest.
    public var mode: PlayMode?

    public init(session: SessionID, profile: ProfileID, skill: SkillID, verdict: Verdict,
                elapsed: TimeInterval, scaffoldShown: ScaffoldLevel,
                timedOut: Bool = false, item: ReviewSnapshot? = nil, topic: String? = nil,
                crystalsReported: Int = 0, mode: PlayMode? = nil) {
        self.session = session; self.profile = profile; self.skill = skill
        self.verdict = verdict; self.elapsed = elapsed; self.scaffoldShown = scaffoldShown
        self.timedOut = timedOut; self.item = item; self.topic = topic
        self.crystalsReported = crystalsReported; self.mode = mode
    }
}

/// Why a wrong answer was wrong.
///
/// **Nothing here re-derives the engine's ruling.** The store maps `Verdict.reasonKind`
/// - the engine's own case - onto its own vocabulary, and stops.
///
/// It used to derive the unit-vs-value split itself, from `Verdict.parsed.unit` against
/// `Verdict.expectedText`. The refuter measured that against the engine on the
/// `feat/unit-sweep` build and it disagreed on **260 of 5,942 classified cells (4.4%)**,
/// including **17.9% of wrong-value money cells**: `expectedText` `"27 stickers"` ends
/// with `"s"`, so a child typing `27 s` read as a value error; `"$4.35"` puts the unit at
/// the FRONT, so every wrong money number typed with a `$` read as a unit error
/// (Progress Refutation W5, 2026-09-07). A string-suffix match is not a grader and this
/// module is not the grader.
///
/// **On this branch the engine still emits one string for both halves.** That lands here
/// as `.wrongValueOrUnit`: counted, named, and never guessed at. When `feat/unit-sweep`
/// merges the engine emits `wrong-unit` / `wrong-value` and those two cases fill up
/// while `wrongValueOrUnit` goes to zero on its own - no code change, which is the point.
public enum WrongReason: String, Sendable, Codable, CaseIterable {
    /// A multiple-choice tap on the wrong tile.
    case wrongOption
    /// A typed number that is simply not the answer.
    case wrongValue
    /// The right number with the wrong unit ("45 cm" for a cm2 answer).
    case wrongUnit
    /// The engine rejected the answer without saying WHICH of the two it was - the
    /// single `"wrong value or unit"` string this build's engine emits. Not a guess and
    /// not a bucket: it is the engine's own resolution, recorded honestly. Empty once
    /// `feat/unit-sweep` lands.
    case wrongValueOrUnit
    /// Typed something that is not a number at all.
    case notANumber
    /// Submitted nothing.
    case empty
    /// The clock ran out.
    case timedOut
    /// The engine said something this module does not recognise. Counted, never guessed at.
    case unknown

    public static func of(_ verdict: Verdict, timedOut: Bool = false) -> WrongReason? {
        // The clock is checked FIRST. A mode that grades an unanswered item can hand back
        // a verdict saying `correct` (the engine was asked about the right answer, not
        // about the child's), and a timeout is wrong whatever the verdict says.
        if timedOut { return .timedOut }
        if verdict.correct { return nil }
        // `Verdict.reasonKind` is the engine's case. A verdict whose top-level reason is
        // absent but whose `parsed` block carries one is still a ruling, so fall through
        // to it rather than reporting `.unknown` for a shape the engine really produced.
        let kind = verdict.reasonKind ?? verdict.parsed?.reason.map(Verdict.Reason.init(raw:))
        switch kind {
        case .wrongUnit:    return .wrongUnit
        case .wrongValue:   return .wrongValue
        case .wrongOption:  return .wrongOption
        case .noSuchChoice: return .wrongOption
        case .notANumber:   return .notANumber
        case .empty:        return .empty
        case .noAnswer:     return .empty
        case .other(let raw):
            // The ONE raw string this build's engine emits that the sweep has not split
            // yet. Everything else is unknown and says so.
            return raw.lowercased() == "wrong value or unit" ? .wrongValueOrUnit : .unknown
        case nil:           return .unknown
        }
    }
}

// MARK: - What comes back

/// What changed, so a mode can animate it without re-reading the store.
public struct ProgressDelta: Sendable, Equatable {
    public var masteryBefore: Double
    public var masteryAfter: Double
    public var streak: Int
    public var scaffold: ScaffoldLevel   // post-attempt; <= what was shown
    /// How many crystals this answer actually put on the rope: what the battle
    /// REPORTED (`Attempt.crystalsReported`) after the store bounded it - 0 or 1, 0 on a
    /// wrong answer, and 0 once the session has its sixth. Drive the animation off this
    /// and nothing else; the store is the only thing that knows the session cap.
    public var crystalsAwarded: Int
    /// The `PHASE1.md` sketch's spelling of the same number. Kept so every consumer
    /// written against the contract still compiles.
    public var crystalsEarned: Int { crystalsAwarded }
    /// + delta: the pool the FEED should now draw from for this skill. The mastery climb
    /// is the store's, so the mode must not keep its own copy (`S.level` on the web).
    public var poolBefore: Int
    public var poolAfter: Int
    /// + delta: nil when the answer was right.
    public var wrongReason: WrongReason?
    /// + delta: false when this answer moved no teaching state at all - a Patchwerk
    /// answer. Mastery, pool and scaffold are then guaranteed unchanged, and
    /// `masteryBefore == masteryAfter` / `poolBefore == poolAfter` by construction.
    public var touchedTeachingState: Bool

    public init(masteryBefore: Double, masteryAfter: Double, streak: Int,
                scaffold: ScaffoldLevel, crystalsAwarded: Int,
                poolBefore: Int, poolAfter: Int, wrongReason: WrongReason?,
                touchedTeachingState: Bool = true) {
        self.masteryBefore = masteryBefore; self.masteryAfter = masteryAfter
        self.streak = streak; self.scaffold = scaffold; self.crystalsAwarded = crystalsAwarded
        self.poolBefore = poolBefore; self.poolAfter = poolAfter; self.wrongReason = wrongReason
        self.touchedTeachingState = touchedTeachingState
    }
}

/// Exactly what MQResultScreen renders. Nothing in it asks the child to come back:
/// no day counter, no "see you tomorrow", no next-session countdown.
public struct SessionSummary: Sendable, Equatable {
    public var correct: Int
    public var total: Int
    public var bestStreak: Int
    public var elapsed: TimeInterval
    public var crystalsEarned: Int
    /// The wrong ones, with the generator's own one-line explanation. The review
    /// IS the result screen; the score is four small carved numbers beside it.
    public var worthAnotherLook: [MQReviewItem]

    // ---- + delta ----------------------------------------------------------------
    public var mode: PlayMode
    public var topic: String?
    /// Time the child actually spent on items, summed from `Attempt.elapsed`. Unlike
    /// `elapsed` (wall clock) this is deterministic, so it is what the gate asserts on.
    public var timeOnItems: TimeInterval
    /// Every wrong answer classified. `wrongUnitCount` and `wrongValueCount` are the two
    /// the result screen names; the map is there so nothing is silently dropped.
    public var wrongCounts: [WrongReason: Int]
    /// The highest pool any item in this session came from (the web's `S.maxLevel`).
    public var maxPool: Int

    public var wrongUnitCount: Int  { wrongCounts[.wrongUnit] ?? 0 }
    public var wrongValueCount: Int { wrongCounts[.wrongValue] ?? 0 }
    /// 0...1, or nil when nothing was attempted. Never rendered as a number about the child.
    public var accuracy: Double? { total == 0 ? nil : Double(correct) / Double(total) }

    public init(correct: Int, total: Int, bestStreak: Int, elapsed: TimeInterval,
                crystalsEarned: Int, worthAnotherLook: [MQReviewItem],
                mode: PlayMode = .quest, topic: String? = nil, timeOnItems: TimeInterval = 0,
                wrongCounts: [WrongReason: Int] = [:], maxPool: Int = 1) {
        self.correct = correct; self.total = total; self.bestStreak = bestStreak
        self.elapsed = elapsed; self.crystalsEarned = crystalsEarned
        self.worthAnotherLook = worthAnotherLook
        self.mode = mode; self.topic = topic; self.timeOnItems = timeOnItems
        self.wrongCounts = wrongCounts; self.maxPool = maxPool
    }
}

/// + delta. A profile with its ID attached.
///
/// `MQProfile.id` is its `name` (MQDesign), which is a display identity, not a stable
/// one: rename the child and every row that referenced them is orphaned. The store keys
/// on `ProfileID` and hands the design its `MQProfile` unchanged; this pairs the two so
/// the entrance screen can turn a tapped token back into an ID. (The store additionally
/// keeps display names UNIQUE - see `addProfile` - so two tokens on the beach can never
/// read the same, which is a design requirement as much as a lookup one.)
public struct ProfileRecord: Sendable, Equatable, Identifiable {
    public var id: ProfileID
    public var profile: MQProfile
    /// When the profile was made. Not shown to the child - there is no "playing since".
    public var createdAt: Date

    public init(id: ProfileID, profile: MQProfile, createdAt: Date) {
        self.id = id; self.profile = profile; self.createdAt = createdAt
    }
}

/// + delta. Everything the store holds about ONE skill, for the parent report and for
/// anything that wants the numbers behind the crystals.
public struct SkillProgress: Sendable, Equatable {
    public var skill: SkillID
    public var attempts: Int
    public var correct: Int
    /// 0...1. Attempts with no history read 0.
    public var mastery: Double
    /// Under the web's own evidence floor for the parent report (`n >= 4`), so the
    /// number is real but not yet worth acting on.
    public var isProvisional: Bool
    /// The web's green band (>= 80%) over that evidence floor.
    public var isMastered: Bool
    /// 1...3, climbing by the web's rule.
    public var pool: Int
    public var bestPool: Int
    public var scaffold: ScaffoldLevel

    public init(skill: SkillID, attempts: Int, correct: Int, mastery: Double,
                isProvisional: Bool, isMastered: Bool, pool: Int, bestPool: Int,
                scaffold: ScaffoldLevel) {
        self.skill = skill; self.attempts = attempts; self.correct = correct
        self.mastery = mastery; self.isProvisional = isProvisional; self.isMastered = isMastered
        self.pool = pool; self.bestPool = bestPool; self.scaffold = scaffold
    }
}

/// What makes an island read **Cleared**. Chosen once, at store construction, because
/// it is a product decision and not a per-call option: two callers picking differently
/// is exactly the drift the single `NodeProgress.State` vocabulary exists to prevent.
///
/// The refuter measured all three over 200 real sessions of the real web game
/// (Progress Refutation §7, design call 2). A node has 2 to 7 skills, median 3:
///
/// | policy | 2 skills | 3 skills | 4 skills | 7 skills |
/// |---|---|---|---|---|
/// | `.webVictory` | 154/200 | 154/200 | 154/200 | 154/200 |
/// | `.mastery`    |  67/200 |  18/200 |   0/200 |   0/200 |
///
/// A child who won a run - trophy, confetti, "saved all 6 Star Crystals" - walked back
/// to a map that still said *Ready* on any node with four or more skills, every time.
///
/// **Kevin ruled Q87 = MATCH WEB on 2026-09-07**, so `.webVictory` is the default.
public enum NodeClearedPolicy: String, Sendable, Codable, CaseIterable {
    /// The web's own answer, and the DEFAULT (Kevin's Q87 ruling, 2026-09-07): a node is
    /// cleared once the child has finished a session ON THAT NODE carrying the full
    /// six-crystal rope - `endGame(true)` on the web. A one-run measure of a good evening.
    case webVictory
    /// Every skill in the node mastered (>= 4 attempts at >= 80%). A term-length measure
    /// of real learning, and the shape this module shipped with.
    case mastery
    /// Both, without collapsing them: the map BADGE comes from `webVictory` and
    /// `NodeProgress.mastered` carries the mastery answer beside it, so a parent report
    /// can say the honest thing while the island says the generous one.
    case both
}

/// + delta. One island's state, in the design's own vocabulary.
///
/// The four cases are `MQMapNode.State`'s four cases, deliberately: the map draws the
/// state the store derives, and a second vocabulary between them is where "Cleared" and
/// "cleared" drift apart.
public struct NodeProgress: Sendable, Equatable {
    public enum State: Sendable, Equatable {
        case cleared
        case inProgress(collected: Int, total: Int)
        case open
        case comingSoon
    }

    public var topic: String
    public var skillsTotal: Int
    public var skillsMastered: Int
    public var attempts: Int
    /// Mean mastery over the node's skills, unattempted skills counted as 0.
    public var mastery: Double
    public var state: State
    /// + delta: every skill in the node mastered, INDEPENDENT of `state`. Under
    /// `.mastery` this is the same statement as `state == .cleared`; under `.webVictory`
    /// and `.both` it is the second, stricter one, and it is what a parent report should
    /// read rather than the island badge.
    public var mastered: Bool
    /// + delta: the child has won a full six-crystal run on this node.
    public var wonARun: Bool

    public init(topic: String, skillsTotal: Int, skillsMastered: Int, attempts: Int,
                mastery: Double, state: State,
                mastered: Bool = false, wonARun: Bool = false) {
        self.topic = topic; self.skillsTotal = skillsTotal; self.skillsMastered = skillsMastered
        self.attempts = attempts; self.mastery = mastery; self.state = state
        self.mastered = mastered; self.wonARun = wonARun
    }
}

public extension NodeProgress.State {
    /// The design's own state. Written out case by case rather than shared as one type,
    /// because MQDesign must not depend on a store to draw a preview - but the mapping
    /// lives here so no feature lane writes its own and gets a case wrong.
    var asMapState: MQMapNode.State {
        switch self {
        case .cleared:                     return .cleared
        case .inProgress(let c, let t):    return .inProgress(collected: c, total: t)
        case .open:                        return .open
        case .comingSoon:                  return .comingSoon
        }
    }
}

/// + delta. One Patchwerk run, kept apart from every teaching number.
///
/// Mirrors the web's `DB.pwFame` record (`js/app.js endPatchwerk`). Damage, stacks and
/// freezes are PLAY numbers: they are never read by mastery, never fade a scaffold, and
/// never appear on a map node. Kevin's ruling stands - a play mode may keep a streak;
/// it may not buy learning state with it.
public struct PatchwerkRun: Sendable, Equatable, Codable, Identifiable {
    public var id: String
    /// "short" | "normal" | "long", the mode's own tier keys.
    public var tier: String
    /// The class level the run was drawn at ("P3"), the web's `record.level`.
    public var level: String
    public var damage: Int
    public var bestStacks: Int
    public var freezesUsed: Int
    public var correct: Int
    public var wrong: Int
    public var duration: TimeInterval
    public var date: Date

    public init(id: String = UUID().uuidString, tier: String, level: String, damage: Int,
                bestStacks: Int, freezesUsed: Int, correct: Int, wrong: Int,
                duration: TimeInterval, date: Date = Date()) {
        self.id = id; self.tier = tier; self.level = level; self.damage = damage
        self.bestStacks = bestStacks; self.freezesUsed = freezesUsed
        self.correct = correct; self.wrong = wrong; self.duration = duration; self.date = date
    }
}

/// + delta. A finished session, as kept on disk for the parent report.
public struct SessionRecord: Sendable, Equatable, Identifiable {
    public var id: SessionID
    public var summary: SessionSummary
    public var startedAt: Date
    public var endedAt: Date
    /// Right/wrong per skill, the web's `DB.sessions[].skills`.
    public var skills: [SkillID: SkillTally]

    public init(id: SessionID, summary: SessionSummary, startedAt: Date, endedAt: Date,
                skills: [SkillID: SkillTally]) {
        self.id = id; self.summary = summary
        self.startedAt = startedAt; self.endedAt = endedAt; self.skills = skills
    }
}

public struct SkillTally: Sendable, Equatable, Codable {
    public var right: Int
    public var wrong: Int
    public init(right: Int = 0, wrong: Int = 0) { self.right = right; self.wrong = wrong }
}

// MARK: - The protocol

/// Where a child has got to. On-device only: no accounts and no server; the document is
/// excluded from backup and protected at rest where the platform offers it.
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
    func beginSession(profile: ProfileID, mode: PlayMode) async -> SessionID
    /// Ends the session and returns what the result screen renders. Idempotent:
    /// calling it twice returns the same summary and starts nothing.
    func endSession(_ session: SessionID) async -> SessionSummary

    // ---- profiles (no accounts) ------------------------------------------------
    func profiles() async -> [MQProfile]
    func addProfile(name: String, cast: MQCast, level: String) async -> ProfileID
    func removeProfile(_ id: ProfileID) async

    // ============================================================================
    // + delta from here down. Nothing above is renamed, reordered or removed.
    // ============================================================================

    /// The same session, named by the island it is being played on, so the record can
    /// say which island. The contract's two-argument form delegates to this with nil.
    func beginSession(profile: ProfileID, mode: PlayMode, topic: String?) async -> SessionID

    /// Which pool the feed should ask the engine for. The climb is the store's.
    func poolLevel(profile: ProfileID, skill: SkillID) async -> Int
    func skillProgress(profile: ProfileID, skill: SkillID) async -> SkillProgress
    func skillProgress(profile: ProfileID) async -> [SkillID: SkillProgress]

    /// Cleared / Ready / Coming soon, derived - never stored.
    func node(profile: ProfileID, topic: Topic) async -> NodeProgress
    /// For a caller that has the skill list but not a `Topic` (previews, gates).
    func node(profile: ProfileID, topicID: String, skills: [SkillID], isLive: Bool) async -> NodeProgress

    func profileRecords() async -> [ProfileRecord]
    func profileID(named name: String) async -> ProfileID?
    /// The class level a profile plays at (the web's `DB.grade`).
    func setLevel(_ level: String, profile: ProfileID) async

    /// + delta. Change the child's DISPLAY NAME. The `ProfileID` does not move, so every
    /// session, Patchwerk run, skill row and in-flight session stays attached.
    ///
    /// This is the operation `ProfileID` exists for (delta 10), and until the fix pass of
    /// 2026-09-07 it did not exist: the suite carried a test called "A ProfileID survives
    /// a rename" whose body called `setLevel` (Progress Refutation W4). A capability
    /// asserted by a test that cannot exercise it is worse than an untested one.
    ///
    /// Returns the name actually stored - display names are kept unique, so renaming a
    /// second child to "Ben" stores "Ben 2". An empty or whitespace-only name becomes
    /// "Explorer", exactly as `addProfile` does. An unknown profile returns nil.
    @discardableResult
    func rename(_ name: String, profile: ProfileID) async -> String?

    /// Finished sessions, oldest first, capped the way the web caps `DB.sessions`.
    func sessions(profile: ProfileID) async -> [SessionRecord]

    /// Play state, kept apart from teaching state.
    func recordPatchwerkRun(_ run: PatchwerkRun, profile: ProfileID) async
    /// Ranked by damage, highest first. `tier`/`level` nil means "every one".
    func patchwerkRuns(profile: ProfileID, tier: String?, level: String?) async -> [PatchwerkRun]

    /// The web's parent-screen reset button: session history and Patchwerk runs go,
    /// the child's name and creature stay. **Scaffolds also stay.** A fade is one-way
    /// for the LIFETIME of a profile, and a button on the parent screen is not an
    /// exception to that; a parent who wants the training wheels back deletes the
    /// profile, which is an honest thing to have to do.
    func resetHistory(profile: ProfileID) async

    /// + delta. Write anything the coalescing window is still holding, right now, and
    /// wait for it. Call it from the app's backgrounding hooks
    /// (`scenePhase == .background`, `willResignActive`, `willTerminate`) - iOS gives a
    /// backgrounded app seconds, not a promise, and a debounce that outlives the app is
    /// a debounce that loses a child's answers.
    ///
    /// `endSession`, `addProfile`, `removeProfile`, `rename` and `resetHistory` already
    /// flush on their own; this is for the tap path. Idempotent, and a no-op when
    /// nothing is pending.
    func flush() async
}

public extension ProgressStore {
    /// The contract's two-argument form. Not a separate code path.
    func beginSession(profile: ProfileID, mode: PlayMode) async -> SessionID {
        await beginSession(profile: profile, mode: mode, topic: nil)
    }
    func patchwerkRuns(profile: ProfileID) async -> [PatchwerkRun] {
        await patchwerkRuns(profile: profile, tier: nil, level: nil)
    }
}
