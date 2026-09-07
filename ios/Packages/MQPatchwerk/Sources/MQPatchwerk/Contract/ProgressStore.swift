import Foundation
import MQContent
import MQDesign

// =====================================================================
// PROMOTION CANDIDATE #1 - DELETE THIS FILE WHEN `MQProgress` LANDS.
//
// This is `ios/PHASE1.md` section 3, transcribed. The Progress lane owns the
// real declaration and ships the real conformance; MQPatchwerk consumes the
// protocol and must not care which module it comes from. Until that module
// exists there is nothing to import, and a feature lane cannot code against a
// markdown file - so the contract is declared here, in ONE file, marked, so the
// integrator's job is `rm` plus `import MQProgress`.
//
// It is transcribed rather than re-designed on purpose. If a signature here
// disagrees with PHASE1.md, PHASE1.md wins and this file is wrong.
//
// One note the contract does not make: it says `import MQContent`, but the
// profile types (`MQProfile`, `MQCast`) and the review row (`MQReviewItem`) live
// in `MQDesign`, so the real module will import both. Recorded for the Progress
// lane rather than silently redeclared here.
// =====================================================================

/// Where a child has got to. On-device only: no accounts, no server, no child
/// data anywhere but this iPad.
public protocol ProgressStore: Sendable {

    // ---- mastery, per skill --------------------------------------------------
    func mastery(profile: ProfileID, skill: SkillID) async -> Double
    func mastery(profile: ProfileID) async -> [SkillID: Double]

    /// The ONE write. Everything else is derived from the record of attempts, so
    /// no mode can invent progress it did not earn.
    @discardableResult
    func record(_ attempt: Attempt) async -> ProgressDelta

    // ---- streak ---------------------------------------------------------------
    /// Consecutive correct answers WITHIN a session. Never a day count, never
    /// spans sessions. Play modes may keep this; scaffolds may not re-grow.
    func streak(session: SessionID) async -> Int

    // ---- scaffold: FADES, NEVER GROWS -----------------------------------------
    func scaffold(profile: ProfileID, skill: SkillID) async -> ScaffoldLevel
    /// Returns the level actually stored. Requesting a HIGHER level than the one
    /// held is a no-op that returns the held level.
    @discardableResult
    func fadeScaffold(profile: ProfileID, skill: SkillID,
                      to level: ScaffoldLevel) async -> ScaffoldLevel

    // ---- session --------------------------------------------------------------
    func beginSession(profile: ProfileID, mode: PlayMode) async -> SessionID
    /// Idempotent: calling it twice returns the same summary and starts nothing.
    func endSession(_ session: SessionID) async -> SessionSummary

    // ---- profiles (no accounts) ------------------------------------------------
    func profiles() async -> [MQProfile]
    func addProfile(name: String, cast: MQCast, level: String) async -> ProfileID
    func removeProfile(_ id: ProfileID) async
}

public struct ProfileID: Hashable, Sendable {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }
}
public struct SkillID: Hashable, Sendable {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }
}
public struct SessionID: Hashable, Sendable {
    public let raw: String
    public init(_ raw: String) { self.raw = raw }
}

public enum PlayMode: String, Sendable { case quest, patchwerk }

/// Ordered, and the order is the law: a store may only ever move DOWN this list.
public enum ScaffoldLevel: Int, Comparable, Sendable {
    case none = 0, hint = 1, partial = 2, full = 3
    public static func < (a: ScaffoldLevel, b: ScaffoldLevel) -> Bool { a.rawValue < b.rawValue }
}

public struct Attempt: Sendable {
    public var session: SessionID
    public var profile: ProfileID
    public var skill: SkillID
    public var verdict: Verdict
    public var elapsed: TimeInterval
    /// What the child was actually shown, so a later fade is auditable.
    public var scaffoldShown: ScaffoldLevel

    public init(session: SessionID, profile: ProfileID, skill: SkillID, verdict: Verdict,
                elapsed: TimeInterval, scaffoldShown: ScaffoldLevel) {
        self.session = session; self.profile = profile; self.skill = skill
        self.verdict = verdict; self.elapsed = elapsed; self.scaffoldShown = scaffoldShown
    }
}

/// What changed, so a mode can animate it without re-reading the store.
public struct ProgressDelta: Sendable {
    public var masteryBefore: Double
    public var masteryAfter: Double
    public var streak: Int
    public var scaffold: ScaffoldLevel
    public var crystalsEarned: Int

    public init(masteryBefore: Double, masteryAfter: Double, streak: Int,
                scaffold: ScaffoldLevel, crystalsEarned: Int) {
        self.masteryBefore = masteryBefore; self.masteryAfter = masteryAfter
        self.streak = streak; self.scaffold = scaffold; self.crystalsEarned = crystalsEarned
    }
}

/// Exactly what `MQResultScreen` renders. Nothing in it asks the child to come
/// back: no day counter, no "see you tomorrow", no next-session countdown.
public struct SessionSummary: Sendable {
    public var correct: Int
    public var total: Int
    public var bestStreak: Int
    public var elapsed: TimeInterval
    public var crystalsEarned: Int
    public var worthAnotherLook: [MQReviewItem]

    public init(correct: Int, total: Int, bestStreak: Int, elapsed: TimeInterval,
                crystalsEarned: Int, worthAnotherLook: [MQReviewItem]) {
        self.correct = correct; self.total = total; self.bestStreak = bestStreak
        self.elapsed = elapsed; self.crystalsEarned = crystalsEarned
        self.worthAnotherLook = worthAnotherLook
    }
}
