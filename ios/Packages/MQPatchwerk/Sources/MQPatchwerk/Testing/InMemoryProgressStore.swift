import Foundation
import MQContent
import MQDesign

/// A `ProgressStore` that keeps everything in memory and nothing on disk.
///
/// **This is a stand-in, not an implementation.** The Progress lane ships the
/// real store; the integrator swaps it in and deletes this file with the contract
/// copy beside it. It exists so Patchwerk can be built and gated against the
/// PROTOCOL rather than against a module that does not exist yet - the alternative
/// is a feature lane that cannot compile until another lane lands, which is how
/// two lanes become one serial lane.
///
/// It implements the two laws that a stand-in could otherwise quietly break, so
/// that a mode written against it cannot be written against a fiction:
///
///  * `fadeScaffold` returns the level ACTUALLY stored, and a request to go up is
///    a no-op. Scaffolds fade, never grow.
///  * `streak` is per SESSION and dies with it. There is no day count anywhere.
///
/// Its mastery arithmetic, on the other hand, is deliberately naive and is NOT a
/// proposal: a real store derives mastery from the record of attempts with some
/// forgetting curve, and inventing one here would give the Progress lane a
/// precedent it never agreed to.
public actor InMemoryProgressStore: ProgressStore {

    private struct SkillRecord { var correct = 0; var wrong = 0 }

    private var skills: [ProfileID: [SkillID: SkillRecord]] = [:]
    private var scaffolds: [ProfileID: [SkillID: ScaffoldLevel]] = [:]
    private var streaks: [SessionID: Int] = [:]
    private var bestStreaks: [SessionID: Int] = [:]
    private var sessionProfile: [SessionID: ProfileID] = [:]
    private var sessionCounts: [SessionID: (correct: Int, total: Int)] = [:]
    private var sessionStart: [SessionID: Date] = [:]
    private var endedSummaries: [SessionID: SessionSummary] = [:]
    private var storedProfiles: [MQProfile] = []
    private var nextID = 0

    public init(profiles: [MQProfile] = []) { self.storedProfiles = profiles }

    // MARK: mastery

    public func mastery(profile: ProfileID, skill: SkillID) async -> Double {
        guard let r = skills[profile]?[skill] else { return 0 }
        let seen = r.correct + r.wrong
        guard seen > 0 else { return 0 }
        // Naive on purpose - see the type's own note.
        return min(1, Double(r.correct) / Double(max(seen, 8)))
    }

    public func mastery(profile: ProfileID) async -> [SkillID: Double] {
        var out: [SkillID: Double] = [:]
        let perSkill = skills[profile] ?? [:]
        for skill in perSkill.keys {
            out[skill] = await mastery(profile: profile, skill: skill)
        }
        return out
    }

    @discardableResult
    public func record(_ attempt: Attempt) async -> ProgressDelta {
        let before = await mastery(profile: attempt.profile, skill: attempt.skill)
        var perSkill = skills[attempt.profile] ?? [:]
        var rec = perSkill[attempt.skill] ?? SkillRecord()
        if attempt.verdict.correct { rec.correct += 1 } else { rec.wrong += 1 }
        perSkill[attempt.skill] = rec
        skills[attempt.profile] = perSkill

        let streak = (streaks[attempt.session] ?? 0)
        let newStreak = attempt.verdict.correct ? streak + 1 : 0
        streaks[attempt.session] = newStreak
        bestStreaks[attempt.session] = max(bestStreaks[attempt.session] ?? 0, newStreak)

        var counts = sessionCounts[attempt.session] ?? (0, 0)
        counts.total += 1
        if attempt.verdict.correct { counts.correct += 1 }
        sessionCounts[attempt.session] = counts

        let after = await mastery(profile: attempt.profile, skill: attempt.skill)
        return ProgressDelta(
            masteryBefore: before, masteryAfter: after, streak: newStreak,
            scaffold: scaffolds[attempt.profile]?[attempt.skill] ?? .full,
            crystalsEarned: after >= 1 && before < 1 ? 1 : 0)
    }

    // MARK: streak

    public func streak(session: SessionID) async -> Int { streaks[session] ?? 0 }

    // MARK: scaffold

    public func scaffold(profile: ProfileID, skill: SkillID) async -> ScaffoldLevel {
        scaffolds[profile]?[skill] ?? .full
    }

    @discardableResult
    public func fadeScaffold(profile: ProfileID, skill: SkillID,
                             to level: ScaffoldLevel) async -> ScaffoldLevel {
        let held = scaffolds[profile]?[skill] ?? .full
        // The law, enforced in the store rather than in each mode's good
        // intentions: a request to go UP is a no-op that returns what is held.
        guard level < held else { return held }
        var perSkill = scaffolds[profile] ?? [:]
        perSkill[skill] = level
        scaffolds[profile] = perSkill
        return level
    }

    // MARK: session

    public func beginSession(profile: ProfileID, mode: PlayMode) async -> SessionID {
        nextID += 1
        let id = SessionID("\(mode.rawValue)-\(nextID)")
        sessionProfile[id] = profile
        streaks[id] = 0
        bestStreaks[id] = 0
        sessionCounts[id] = (0, 0)
        sessionStart[id] = Date()
        return id
    }

    public func endSession(_ session: SessionID) async -> SessionSummary {
        if let already = endedSummaries[session] { return already }
        let counts = sessionCounts[session] ?? (0, 0)
        let summary = SessionSummary(
            correct: counts.correct,
            total: counts.total,
            bestStreak: bestStreaks[session] ?? 0,
            elapsed: Date().timeIntervalSince(sessionStart[session] ?? Date()),
            crystalsEarned: 0,
            worthAnotherLook: [])
        endedSummaries[session] = summary
        // The streak dies with the session. It never spans one.
        streaks[session] = 0
        return summary
    }

    // MARK: profiles

    public func profiles() async -> [MQProfile] { storedProfiles }

    public func addProfile(name: String, cast: MQCast, level: String) async -> ProfileID {
        storedProfiles.append(MQProfile(name: name, cast: cast, level: level, crystals: 0))
        return ProfileID(name)
    }

    public func removeProfile(_ id: ProfileID) async {
        storedProfiles.removeAll { $0.name == id.raw }
        skills[id] = nil
        scaffolds[id] = nil
    }
}
