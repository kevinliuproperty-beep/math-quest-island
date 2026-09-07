import Foundation
import MQContent
import MQDesign

// MQProgress - where a child has got to.
//
// This file is the CONTRACT half: the protocol from ios/PHASE1.md §3, verbatim where the
// sketch defined something, plus the ADDITIVE members the web semantics need. Nothing
// from the sketch is renamed or removed. Every addition is marked `// + delta` and is
// listed in the vault note "Progress Lane - 2026-09-07".
//
// On-device only: no accounts, no server, no child data anywhere but this iPad.

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
public struct ReviewSnapshot: Sendable, Equatable {
    public var question: String
    public var figure: MQFigure
    public var answer: String
    public var explanation: String

    public init(question: String, figure: MQFigure = .none, answer: String, explanation: String) {
        self.question = question; self.figure = figure
        self.answer = answer; self.explanation = explanation
    }

    public var reviewItem: MQReviewItem {
        MQReviewItem(question: question, figure: figure, answer: answer, explanation: explanation)
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

    public init(session: SessionID, profile: ProfileID, skill: SkillID, verdict: Verdict,
                elapsed: TimeInterval, scaffoldShown: ScaffoldLevel,
                timedOut: Bool = false, item: ReviewSnapshot? = nil, topic: String? = nil) {
        self.session = session; self.profile = profile; self.skill = skill
        self.verdict = verdict; self.elapsed = elapsed; self.scaffoldShown = scaffoldShown
        self.timedOut = timedOut; self.item = item; self.topic = topic
    }
}

/// Why a wrong answer was wrong.
///
/// + delta, and a correction to the brief: **`MQContent.Verdict.Reason` does not exist.**
/// `Verdict.reason` is a `String?` carrying the engine's own words ("wrong option",
/// "wrong value or unit", "not a number", "empty"). Note that the engine does NOT split
/// unit from value - one string covers both - so the split the result screen wants is
/// derived here, from `Verdict.parsed.unit` against `Verdict.expectedText`, and nowhere
/// else. Grading itself is still the engine's, re-derived nowhere in Swift.
public enum WrongReason: String, Sendable, Codable, CaseIterable {
    /// A multiple-choice tap on the wrong tile.
    case wrongOption
    /// A typed number that is simply not the answer.
    case wrongValue
    /// The right number with the wrong unit ("45 cm" for a cm2 answer).
    case wrongUnit
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
        let reason = (verdict.reason ?? verdict.parsed?.reason ?? "").lowercased()
        switch reason {
        case "wrong option":         return .wrongOption
        case "not a number":         return .notANumber
        case "empty":                return .empty
        case "wrong value or unit":  return unitOrValue(verdict)
        default:
            if reason.isEmpty { return .unknown }
            if reason.contains("empty") { return .empty }
            if reason.contains("number") { return .notANumber }
            if reason.contains("option") { return .wrongOption }
            if reason.contains("unit") || reason.contains("value") { return unitOrValue(verdict) }
            return .unknown
        }
    }

    /// The engine's one string, split. A unit the child typed that the expected answer
    /// does not end with is a UNIT error; anything else is a value error. Deliberately
    /// conservative: no typed unit at all can never be a unit error, because the engine
    /// accepts a bare number (`gradeTyped` in js/core.js: "a MISSING unit is accepted").
    private static func unitOrValue(_ v: Verdict) -> WrongReason {
        guard let typed = v.parsed?.unit, !typed.isEmpty else { return .wrongValue }
        let expected = v.expectedText.trimmingCharacters(in: .whitespaces).lowercased()
        return expected.hasSuffix(typed.lowercased()) ? .wrongValue : .wrongUnit
    }
}

// MARK: - What comes back

/// What changed, so a mode can animate it without re-reading the store.
public struct ProgressDelta: Sendable, Equatable {
    public var masteryBefore: Double
    public var masteryAfter: Double
    public var streak: Int
    public var scaffold: ScaffoldLevel   // post-attempt; <= what was shown
    public var crystalsEarned: Int
    /// + delta: the pool the FEED should now draw from for this skill. The mastery climb
    /// is the store's, so the mode must not keep its own copy (`S.level` on the web).
    public var poolBefore: Int
    public var poolAfter: Int
    /// + delta: nil when the answer was right.
    public var wrongReason: WrongReason?

    public init(masteryBefore: Double, masteryAfter: Double, streak: Int,
                scaffold: ScaffoldLevel, crystalsEarned: Int,
                poolBefore: Int, poolAfter: Int, wrongReason: WrongReason?) {
        self.masteryBefore = masteryBefore; self.masteryAfter = masteryAfter
        self.streak = streak; self.scaffold = scaffold; self.crystalsEarned = crystalsEarned
        self.poolBefore = poolBefore; self.poolAfter = poolAfter; self.wrongReason = wrongReason
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

    public init(topic: String, skillsTotal: Int, skillsMastered: Int, attempts: Int,
                mastery: Double, state: State) {
        self.topic = topic; self.skillsTotal = skillsTotal; self.skillsMastered = skillsMastered
        self.attempts = attempts; self.mastery = mastery; self.state = state
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
