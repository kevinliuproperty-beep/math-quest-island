import Foundation
import MQContent
import MQDesign

/// The store. One actor, one copy of the rules.
///
/// **Why one type and not a `FileProgressStore` beside a `MemoryProgressStore`:** the
/// two would differ only in where bytes land, and everything worth testing - the climb,
/// the one-way fade, the crystal rule, the session summary - would then exist twice.
/// The fade-out law is the whole point of this module; it gets exactly one
/// implementation. Where the bytes go is injected (`ProgressPersistence`), and the two
/// backends are `InMemoryPersistence` and `FilePersistence`.
///
///     let store = MQProgressStore.inMemory()                 // tests, previews
///     let store = try MQProgressStore.onDisk()                // the app
public actor MQProgressStore: ProgressStore {

    private let persistence: ProgressPersistence
    private var state: ProgressState
    private var live: [String: LiveSession] = [:]
    /// Ended sessions, so `endSession` can be idempotent without walking the history.
    private var finished: [String: StoredSession] = [:]
    /// The last write that failed. The app can surface it; the child's play does not stop
    /// because a disk write did (the state in memory is still correct, and the next
    /// attempt writes the whole document again).
    public private(set) var lastWriteError: ProgressStoreError?

    // MARK: Construction

    public init(persistence: ProgressPersistence) throws {
        self.persistence = persistence
        self.state = try persistence.load().state
    }

    /// For tests and previews. Nothing survives the process.
    public static func inMemory(seed: Data? = nil) -> MQProgressStore {
        // InMemoryPersistence.load cannot fail for a nil seed, and a seed a test hands in
        // is a test's own problem; a throwing factory here would put a `try` in every
        // preview for no reachable error.
        (try? MQProgressStore(persistence: InMemoryPersistence(seed: seed)))
            ?? (try! MQProgressStore(persistence: InMemoryPersistence()))
    }

    /// The app's store: JSON under Application Support.
    public static func onDisk(url: URL? = nil) throws -> MQProgressStore {
        let target = try url ?? FilePersistence.defaultURL()
        return try MQProgressStore(persistence: FilePersistence(url: target))
    }

    private func persist() {
        do {
            try persistence.save(ProgressStateBox(state))
            lastWriteError = nil
        } catch let error as ProgressStoreError {
            lastWriteError = error
        } catch {
            lastWriteError = .writeFailed(String(describing: error))
        }
    }

    // MARK: - Mastery

    public func mastery(profile: ProfileID, skill: SkillID) async -> Double {
        guard let p = state.index(profile) else { return 0 }
        return state.profiles[p].skills[skill.raw]?.mastery ?? 0
    }

    public func mastery(profile: ProfileID) async -> [SkillID: Double] {
        guard let p = state.index(profile) else { return [:] }
        var out: [SkillID: Double] = [:]
        for (key, skill) in state.profiles[p].skills { out[SkillID(key)] = skill.mastery }
        return out
    }

    public func poolLevel(profile: ProfileID, skill: SkillID) async -> Int {
        guard let p = state.index(profile) else { return MQRule.minPool }
        return state.profiles[p].skills[skill.raw]?.pool ?? MQRule.minPool
    }

    public func skillProgress(profile: ProfileID, skill: SkillID) async -> SkillProgress {
        guard let p = state.index(profile), let s = state.profiles[p].skills[skill.raw] else {
            return SkillState().progress(skill)
        }
        return s.progress(skill)
    }

    public func skillProgress(profile: ProfileID) async -> [SkillID: SkillProgress] {
        guard let p = state.index(profile) else { return [:] }
        var out: [SkillID: SkillProgress] = [:]
        for (key, skill) in state.profiles[p].skills {
            let id = SkillID(key)
            out[id] = skill.progress(id)
        }
        return out
    }

    // MARK: - The one write

    @discardableResult
    public func record(_ attempt: Attempt) async -> ProgressDelta {
        guard let p = state.index(attempt.profile) else {
            // No profile, no progress. Returning a zero delta rather than trapping: an
            // answer arriving for a profile that was just deleted is a race, not a bug in
            // the child's arithmetic.
            return ProgressDelta(masteryBefore: 0, masteryAfter: 0, streak: 0,
                                 scaffold: .full, crystalsEarned: 0,
                                 poolBefore: MQRule.minPool, poolAfter: MQRule.minPool,
                                 wrongReason: WrongReason.of(attempt.verdict, timedOut: attempt.timedOut))
        }

        var skill = state.profiles[p].skills[attempt.skill.raw] ?? SkillState()
        let masteryBefore = skill.mastery
        let poolBefore = skill.pool
        let wasCorrect = attempt.verdict.correct && !attempt.timedOut
        let reason = WrongReason.of(attempt.verdict, timedOut: attempt.timedOut)

        skill.applyClimb(correct: wasCorrect)
        // The fade is applied HERE, from the record of attempts, and only ever downward.
        // A mode never asks for it; a mode that wanted to could not raise it anyway.
        skill.fade(to: skill.scaffoldTarget)
        state.profiles[p].skills[attempt.skill.raw] = skill

        // ---- session side ----------------------------------------------------------
        var crystals = 0
        var streak = 0
        if var session = live[attempt.session.raw] {
            session.total += 1
            session.timeOnItems += max(0, attempt.elapsed)
            session.maxPool = max(session.maxPool, skill.pool)
            var tally = session.skills[attempt.skill.raw] ?? SkillTally()
            if wasCorrect {
                session.correct += 1
                session.streak += 1
                session.bestStreak = max(session.bestStreak, session.streak)
                crystals = session.crystalForCurrentStreak()
                tally.right += 1
            } else {
                session.streak = 0
                tally.wrong += 1
                if let reason { session.wrongCounts[reason, default: 0] += 1 }
                if let item = attempt.item, session.reviews.count < MQRule.reviewsStored {
                    session.reviews.append(StoredReview(item))
                }
            }
            session.skills[attempt.skill.raw] = tally
            streak = session.streak
            live[attempt.session.raw] = session
        }

        persist()

        return ProgressDelta(masteryBefore: masteryBefore, masteryAfter: skill.mastery,
                             streak: streak, scaffold: skill.scaffold, crystalsEarned: crystals,
                             poolBefore: poolBefore, poolAfter: skill.pool, wrongReason: reason)
    }

    // MARK: - Streak

    public func streak(session: SessionID) async -> Int {
        live[session.raw]?.streak ?? 0
    }

    // MARK: - Scaffold

    public func scaffold(profile: ProfileID, skill: SkillID) async -> ScaffoldLevel {
        guard let p = state.index(profile) else { return .full }
        return state.profiles[p].skills[skill.raw]?.scaffold ?? .full
    }

    @discardableResult
    public func fadeScaffold(profile: ProfileID, skill: SkillID,
                             to level: ScaffoldLevel) async -> ScaffoldLevel {
        guard let p = state.index(profile) else { return .full }
        var s = state.profiles[p].skills[skill.raw] ?? SkillState()
        let held = s.scaffold
        let now = s.fade(to: level)
        state.profiles[p].skills[skill.raw] = s
        // The law, asserted rather than assumed. Debug-only so a release build never
        // trades a child's session for a developer's certainty, but any test, gate or
        // simulator run that could break it does.
        assert(now <= held, "scaffold rose: \(held) -> \(now)")
        if now != held { persist() }
        return now
    }

    // MARK: - Sessions

    public func beginSession(profile: ProfileID, mode: PlayMode, topic: String?) async -> SessionID {
        let id = UUID().uuidString
        live[id] = LiveSession(id: id, profile: profile.raw, mode: mode,
                               topic: topic, startedAt: Date())
        return SessionID(id)
    }

    public func endSession(_ session: SessionID) async -> SessionSummary {
        // Idempotent: a second call returns the same summary and starts nothing.
        if let already = finished[session.raw] { return already.summary }
        guard let s = live.removeValue(forKey: session.raw) else {
            return SessionSummary(correct: 0, total: 0, bestStreak: 0, elapsed: 0,
                                  crystalsEarned: 0, worthAnotherLook: [])
        }

        var counts: [String: Int] = [:]
        for (reason, n) in s.wrongCounts { counts[reason.rawValue] = n }
        let stored = StoredSession(
            id: s.id, mode: s.mode, topic: s.topic, startedAt: s.startedAt, endedAt: Date(),
            total: s.total, correct: s.correct, bestStreak: s.bestStreak, crystals: s.crystals,
            timeOnItems: s.timeOnItems, maxPool: s.maxPool, wrongCounts: counts,
            skills: s.skills, reviews: s.reviews)
        finished[s.id] = stored

        if let p = state.index(ProfileID(s.profile)) {
            state.profiles[p].sessions.append(stored)
            if state.profiles[p].sessions.count > MQRule.sessionsKept {
                state.profiles[p].sessions.removeFirst(
                    state.profiles[p].sessions.count - MQRule.sessionsKept)
            }
            state.profiles[p].lifetimeCrystals += s.crystals
            persist()
        }
        return stored.summary
    }

    public func sessions(profile: ProfileID) async -> [SessionRecord] {
        guard let p = state.index(profile) else { return [] }
        return state.profiles[p].sessions.map(\.record)
    }

    // MARK: - Profiles

    public func profiles() async -> [MQProfile] {
        state.profiles.map(\.profile)
    }

    public func profileRecords() async -> [ProfileRecord] {
        state.profiles.map {
            ProfileRecord(id: ProfileID($0.id), profile: $0.profile, createdAt: $0.createdAt)
        }
    }

    public func profileID(named name: String) async -> ProfileID? {
        state.profiles.first { $0.name == name }.map { ProfileID($0.id) }
    }

    public func addProfile(name: String, cast: MQCast, level: String) async -> ProfileID {
        let id = UUID().uuidString
        state.profiles.append(ProfileState(id: id, name: state.uniqueName(name),
                                           cast: cast.rawValue, level: level,
                                           createdAt: Date()))
        persist()
        return ProfileID(id)
    }

    public func removeProfile(_ id: ProfileID) async {
        guard let p = state.index(id) else { return }
        state.profiles.remove(at: p)
        // Anything still in flight for that child goes with them.
        for (key, session) in live where session.profile == id.raw { live.removeValue(forKey: key) }
        persist()
    }

    public func setLevel(_ level: String, profile: ProfileID) async {
        guard let p = state.index(profile) else { return }
        state.profiles[p].level = level
        persist()
    }

    public func resetHistory(profile: ProfileID) async {
        guard let p = state.index(profile) else { return }
        state.profiles[p].sessions.removeAll()
        state.profiles[p].patchwerk.removeAll()
        // Name, creature, level, crystals AND scaffolds stay. See the protocol comment:
        // a fade is one-way for the lifetime of a profile, and a parent-screen button is
        // not an exception to that.
        persist()
    }

    // MARK: - Nodes

    public func node(profile: ProfileID, topic: Topic) async -> NodeProgress {
        await node(profile: profile, topicID: topic.id,
                   skills: topic.skills.map { SkillID($0.id) }, isLive: topic.isLive)
    }

    public func node(profile: ProfileID, topicID: String,
                     skills: [SkillID], isLive: Bool) async -> NodeProgress {
        guard isLive, !skills.isEmpty else {
            return NodeProgress(topic: topicID, skillsTotal: skills.count, skillsMastered: 0,
                                attempts: 0, mastery: 0, state: .comingSoon)
        }
        let p = state.index(profile)
        var attempts = 0
        var mastered = 0
        var masterySum = 0.0
        for skill in skills {
            let s = p.flatMap { state.profiles[$0].skills[skill.raw] } ?? SkillState()
            attempts += s.attempts
            masterySum += s.mastery
            if s.isMastered { mastered += 1 }
        }
        let mean = masterySum / Double(skills.count)
        let derived: NodeProgress.State
        if mastered == skills.count {
            derived = .cleared
        } else if attempts == 0 {
            derived = .open
        } else {
            derived = .inProgress(collected: mastered, total: skills.count)
        }
        return NodeProgress(topic: topicID, skillsTotal: skills.count, skillsMastered: mastered,
                            attempts: attempts, mastery: mean, state: derived)
    }

    // MARK: - Patchwerk (play state, kept apart)

    public func recordPatchwerkRun(_ run: PatchwerkRun, profile: ProfileID) async {
        guard let p = state.index(profile) else { return }
        state.profiles[p].patchwerk.append(run)
        state.profiles[p].patchwerk.sort { $0.damage > $1.damage }
        if state.profiles[p].patchwerk.count > MQRule.patchwerkRunsKept {
            state.profiles[p].patchwerk.removeLast(
                state.profiles[p].patchwerk.count - MQRule.patchwerkRunsKept)
        }
        persist()
    }

    public func patchwerkRuns(profile: ProfileID, tier: String?, level: String?) async -> [PatchwerkRun] {
        guard let p = state.index(profile) else { return [] }
        return state.profiles[p].patchwerk
            .filter { tier == nil || $0.tier == tier }
            .filter { level == nil || $0.level == level }
            .sorted { $0.damage > $1.damage }
    }
}
