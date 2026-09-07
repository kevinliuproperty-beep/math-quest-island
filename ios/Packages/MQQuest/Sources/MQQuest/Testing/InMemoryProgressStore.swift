import Foundation
import MQContent
import MQDesign

/// A `ProgressStore` that holds everything in memory and nothing on disk.
///
/// **This is not a stub.** It enforces the two laws the contract puts in the
/// store rather than in the modes:
///
///  * mastery is DERIVED from the record of attempts, so no mode can write
///    progress it did not earn;
///  * `fadeScaffold` returns the level actually held, and a request to go UP is a
///    no-op - the fade-out law, enforced here rather than in each mode's good
///    intentions.
///
/// The Progress lane ships the persistent one. This is what the headless driver
/// and the suites play against, and it is why a scripted session is reproducible:
/// there is no disk state to carry between runs.
///
/// An `actor` because the protocol is `async` and `Sendable`, and because a
/// profile switch and an in-flight `record` genuinely can race on a real device.
public actor InMemoryProgressStore: ProgressStore {

    /// The exponential the mastery curve uses. A correct answer moves a skill
    /// `rate` of the way to 1, a wrong one `rate` of the way to 0. Deliberately
    /// symmetric and deliberately slow: eight correct answers in a row take a
    /// cold skill past `QNode.masteredAt`, which is roughly one node's set.
    public static let rate = 0.22

    private struct Session {
        var profile: ProfileID
        var mode: PlayMode
        var startedAt: Date
        var correct = 0
        var total = 0
        var streak = 0
        var bestStreak = 0
        var crystals = 0
        var review: [MQReviewItem] = []
        var summary: SessionSummary?
    }

    private var masteryBySkill: [ProfileID: [SkillID: Double]] = [:]
    private var scaffolds: [ProfileID: [SkillID: ScaffoldLevel]] = [:]
    private var sessions: [SessionID: Session] = [:]
    private var order: [MQProfile] = []
    private var nextSession = 0

    public init(profiles: [MQProfile] = []) {
        self.order = profiles
    }

    /// Seed a skill directly. **Test and driver only** - a real store has no such
    /// door, which is the point of `record` being the one write.
    public func seedMastery(profile: ProfileID, skill: SkillID, to value: Double) {
        masteryBySkill[profile, default: [:]][skill] = min(max(value, 0), 1)
    }

    // MARK: Mastery

    public func mastery(profile: ProfileID, skill: SkillID) async -> Double {
        masteryBySkill[profile]?[skill] ?? 0
    }

    public func mastery(profile: ProfileID) async -> [SkillID: Double] {
        masteryBySkill[profile] ?? [:]
    }

    @discardableResult
    public func record(_ attempt: Attempt) async -> ProgressDelta {
        let before = masteryBySkill[attempt.profile]?[attempt.skill] ?? 0
        let target = attempt.verdict.correct ? 1.0 : 0.0
        let after = before + (target - before) * Self.rate
        masteryBySkill[attempt.profile, default: [:]][attempt.skill] = after

        var crystals = 0
        if before < QNode.masteredAt && after >= QNode.masteredAt { crystals = 1 }

        if var s = sessions[attempt.session] {
            s.total += 1
            if attempt.verdict.correct {
                s.correct += 1
                s.streak += 1
                s.bestStreak = max(s.bestStreak, s.streak)
            } else {
                s.streak = 0
            }
            s.crystals += crystals
            sessions[attempt.session] = s
        }

        return ProgressDelta(masteryBefore: before, masteryAfter: after,
                             streak: sessions[attempt.session]?.streak ?? 0,
                             scaffold: scaffolds[attempt.profile]?[attempt.skill] ?? .full,
                             crystalsEarned: crystals)
    }

    /// Attach the review rows for a session. Kept separate from `record` because
    /// `MQReviewItem` is a DESIGN type and an attempt is a LEARNING record; the
    /// mode owns the translation.
    public func addReview(_ item: MQReviewItem, to session: SessionID) {
        sessions[session]?.review.append(item)
    }

    // MARK: Streak

    public func streak(session: SessionID) async -> Int {
        sessions[session]?.streak ?? 0
    }

    // MARK: Scaffold

    public func scaffold(profile: ProfileID, skill: SkillID) async -> ScaffoldLevel {
        scaffolds[profile]?[skill] ?? .full
    }

    @discardableResult
    public func fadeScaffold(profile: ProfileID, skill: SkillID,
                             to level: ScaffoldLevel) async -> ScaffoldLevel {
        let held = scaffolds[profile]?[skill] ?? .full
        // ONE WAY. A request for a HIGHER level is a no-op that returns what is
        // held: a failing run gets more time and easier items, never its training
        // wheels back.
        guard level < held else { return held }
        scaffolds[profile, default: [:]][skill] = level
        return level
    }

    // MARK: Session

    public func beginSession(profile: ProfileID, mode: PlayMode) async -> SessionID {
        nextSession += 1
        let id = SessionID("s\(nextSession)")
        sessions[id] = Session(profile: profile, mode: mode, startedAt: Date())
        return id
    }

    /// Idempotent: the summary is computed once and returned unchanged after that.
    public func endSession(_ session: SessionID) async -> SessionSummary {
        guard var s = sessions[session] else {
            return SessionSummary(correct: 0, total: 0, bestStreak: 0, elapsed: 0,
                                  crystalsEarned: 0, worthAnotherLook: [])
        }
        if let already = s.summary { return already }
        let summary = SessionSummary(correct: s.correct, total: s.total,
                                     bestStreak: s.bestStreak,
                                     elapsed: Date().timeIntervalSince(s.startedAt),
                                     crystalsEarned: s.crystals,
                                     worthAnotherLook: s.review)
        s.summary = summary
        sessions[session] = s
        return summary
    }

    /// Sessions begun and never ended.
    ///
    /// The store's leak is the quiet half of Quest Refutation K6: `toMap()` left
    /// `sessionID` set and the next `open()` overwrote it, so the abandoned
    /// session's `SessionSummary` was never computed and a persistent store would
    /// inherit an unterminated record per pause. Attempts are recorded per answer,
    /// so no mastery was lost - but nothing could see the leak either. This can.
    public var openSessionCount: Int {
        sessions.values.filter { $0.summary == nil }.count
    }

    // MARK: Profiles

    public func profiles() async -> [MQProfile] { order }

    public func addProfile(name: String, cast: MQCast, level: String) async -> ProfileID {
        let p = MQProfile(name: name, cast: cast, level: level, crystals: 0)
        order.removeAll { $0.name == name }
        order.append(p)
        return ProfileID(name)
    }

    public func removeProfile(_ id: ProfileID) async {
        order.removeAll { $0.name == id.raw }
        masteryBySkill[id] = nil
        scaffolds[id] = nil
    }
}
