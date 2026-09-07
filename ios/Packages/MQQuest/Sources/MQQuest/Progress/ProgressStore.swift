import Foundation
import MQContent
import MQDesign

// =============================================================================
// PROVISIONAL - THIS FILE IS DELETED BY THE INTEGRATOR.
//
// `ios/PHASE1.md` section 3 declares `ProgressStore` and its value types as the
// seam between MQQuest/MQPatchwerk and MQProgress. The Progress lane ships the
// REAL declaration inside `MQProgress`, in parallel with this lane; MQQuest
// therefore cannot `import MQProgress` yet without inventing a dependency on a
// target that does not exist on this branch.
//
// So the protocol is transcribed here VERBATIM from the contract, and this whole
// file is disposable. On merge:
//
//   1. delete ios/Packages/MQQuest/Sources/MQQuest/Progress/ProgressStore.swift
//   2. add `import MQProgress` to QQuestModel.swift and InMemoryProgressStore.swift
//   3. add "MQProgress" to the MQQuest target's dependencies in ios/Package.swift
//
// Nothing else in MQQuest changes, because nothing else in MQQuest names a
// concrete store: the model holds `any ProgressStore` and the app's composition
// root decides which one. `InMemoryProgressStore` stays either way - it is what
// the headless driver and the suites play against, and it is the only way a
// scripted session is reproducible.
//
// If the two declarations DRIFT, the compiler says so on the merge commit rather
// than at runtime, which is the point of transcribing rather than paraphrasing.
// =============================================================================

/// Where a child has got to. On-device only: no accounts, no server, no child data
/// anywhere but this iPad.
public protocol ProgressStore: Sendable {

    // ---- mastery, per skill --------------------------------------------------
    func mastery(profile: ProfileID, skill: SkillID) async -> Double
    func mastery(profile: ProfileID) async -> [SkillID: Double]

    /// The ONE write. Everything else here is derived from the record of attempts.
    @discardableResult
    func record(_ attempt: Attempt) async -> ProgressDelta

    // ---- streak ---------------------------------------------------------------
    /// Consecutive correct answers WITHIN a session. Never a day count.
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
    public static func < (a: ScaffoldLevel, b: ScaffoldLevel) -> Bool {
        a.rawValue < b.rawValue
    }
}

public struct Attempt: Sendable {
    public var session: SessionID
    public var profile: ProfileID
    public var skill: SkillID
    public var verdict: Verdict
    public var elapsed: TimeInterval
    public var scaffoldShown: ScaffoldLevel

    public init(session: SessionID, profile: ProfileID, skill: SkillID,
                verdict: Verdict, elapsed: TimeInterval, scaffoldShown: ScaffoldLevel) {
        self.session = session; self.profile = profile; self.skill = skill
        self.verdict = verdict; self.elapsed = elapsed
        self.scaffoldShown = scaffoldShown
    }
}

public struct ProgressDelta: Sendable {
    public var masteryBefore: Double
    public var masteryAfter: Double
    public var streak: Int
    public var scaffold: ScaffoldLevel
    public var crystalsEarned: Int

    public init(masteryBefore: Double, masteryAfter: Double, streak: Int,
                scaffold: ScaffoldLevel, crystalsEarned: Int) {
        self.masteryBefore = masteryBefore; self.masteryAfter = masteryAfter
        self.streak = streak; self.scaffold = scaffold
        self.crystalsEarned = crystalsEarned
    }
}

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
