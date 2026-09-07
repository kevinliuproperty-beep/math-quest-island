import Foundation
import MQContent

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

    /// When the document reaches the disk.
    ///
    /// The refuter measured the reason this exists: `record()` encoded and `fsync`ed the
    /// WHOLE document on every attempt, on the child's tap-to-feedback path, because
    /// `MQQuest` awaits the returned `ProgressDelta` to start the animation. At a
    /// realistic 584 KB (3 profiles x 60 sessions x 18 items) that cost **9.5 ms on an
    /// M-series SSD**; Charlotte's iPad 6 is an A10 with materially slower NAND
    /// (Progress Refutation W12, 2026-09-07).
    public enum WritePolicy: Sendable, Equatable {
        /// Every mutation writes before it returns. What the suites use, so a test can
        /// look at the bytes the line after the call that produced them.
        case immediate
        /// Mutations mark the document dirty and one write happens after this many
        /// seconds of quiet. **Atomicity is unchanged** - a write is still
        /// temp -> fsync -> `rename(2)`; there are just fewer of them.
        ///
        /// Everything structural still writes THROUGH it: `endSession`, `addProfile`,
        /// `removeProfile`, `rename`, `setLevel`, `resetHistory`, `recordPatchwerkRun`
        /// and `flush()`. What is coalesced is the per-answer write and nothing else.
        ///
        /// The exposure is bounded and stated: a kill inside the window loses at most
        /// the attempts made inside it. `flush()` on backgrounding closes the ordinary
        /// case, and a session end closes the rest.
        case coalesced(seconds: TimeInterval)
    }

    private let persistence: ProgressPersistence
    /// What makes an island read Cleared. Fixed at construction: see `NodeClearedPolicy`.
    public let clearedPolicy: NodeClearedPolicy
    private let writePolicy: WritePolicy
    private var state: ProgressState
    private var live: [String: LiveSession] = [:]
    /// Ended sessions, so `endSession` can be idempotent without walking the history.
    private var finished: [String: StoredSession] = [:]
    /// The last write that failed. The app can surface it; the child's play does not stop
    /// because a disk write did (the state in memory is still correct, and the next
    /// attempt writes the whole document again).
    public private(set) var lastWriteError: ProgressStoreError?

    /// State the coalescing window is holding.
    private var dirty = false
    private var writerAwake = false

    // MARK: Construction

    /// - Parameters:
    ///   - cleared: what makes a node read Cleared. Defaults to `.webVictory`, which is
    ///     the web's own answer and Kevin's Q87 ruling of 2026-09-07 ("match web").
    ///   - writes: when the document reaches the disk. Defaults to `.immediate`, which is
    ///     what every suite wants; `onDisk()` opts into coalescing for the app.
    public init(persistence: ProgressPersistence,
                cleared: NodeClearedPolicy = .webVictory,
                writes: WritePolicy = .immediate) throws {
        self.persistence = persistence
        self.clearedPolicy = cleared
        self.writePolicy = writes
        // The fade law is enforced on LOAD as well as on the mutator. A restored backup
        // or a v1 file may claim more help than the record of attempts allows; clamping
        // can only lower a level, so it cannot break the law it is enforcing.
        // (Progress Refutation W10.)
        var loaded = try persistence.load().state
        for p in loaded.profiles.indices {
            for (key, var skill) in loaded.profiles[p].skills {
                skill.fade(to: skill.scaffoldCeiling)
                loaded.profiles[p].skills[key] = skill
            }
        }
        self.state = loaded
    }

    /// For tests and previews. Nothing survives the process.
    public static func inMemory(seed: Data? = nil,
                                cleared: NodeClearedPolicy = .webVictory,
                                writes: WritePolicy = .immediate) -> MQProgressStore {
        // InMemoryPersistence.load cannot fail for a nil seed, and a seed a test hands in
        // is a test's own problem; a throwing factory here would put a `try` in every
        // preview for no reachable error.
        (try? MQProgressStore(persistence: InMemoryPersistence(seed: seed),
                              cleared: cleared, writes: writes))
            ?? (try! MQProgressStore(persistence: InMemoryPersistence(),
                                     cleared: cleared, writes: writes))
    }

    /// The app's store: JSON under Application Support, coalesced writes.
    public static func onDisk(url: URL? = nil,
                              cleared: NodeClearedPolicy = .webVictory,
                              writes: WritePolicy = .coalesced(seconds: 0.4)) throws -> MQProgressStore {
        let target = try url ?? FilePersistence.defaultURL()
        return try MQProgressStore(persistence: FilePersistence(url: target),
                                   cleared: cleared, writes: writes)
    }

    /// Write NOW, whatever the policy says. Everything structural goes through this.
    private func persist() {
        dirty = false
        do {
            try persistence.save(ProgressStateBox(state))
            lastWriteError = nil
        } catch let error as ProgressStoreError {
            lastWriteError = error
        } catch {
            lastWriteError = .writeFailed(String(describing: error))
        }
    }

    /// Write soon. The tap path calls this and only this.
    private func persistSoon() {
        switch writePolicy {
        case .immediate:
            persist()
        case .coalesced(let window):
            dirty = true
            // One sleeper at a time. It wakes, writes whatever is dirty, and stands
            // down; the next mutation starts a fresh one. No cancellation, so there is
            // no window in which a cancelled sleeper and a new one both think they own
            // the write.
            guard !writerAwake else { return }
            writerAwake = true
            Task { [window] in
                try? await Task.sleep(nanoseconds: UInt64(max(0, window) * 1_000_000_000))
                // The Task inherits this actor's isolation, so the callback is already
                // on it - no hop, and no window between waking and writing.
                self.writerWoke()
            }
        }
    }

    private func writerWoke() {
        writerAwake = false
        if dirty { persist() }
    }

    /// The backgrounding hook. See the protocol comment.
    public func flush() async {
        if dirty { persist() }
    }

    /// Whether a write is still pending. For gates and for an app that wants to know
    /// before it tears the process down.
    public var hasPendingWrite: Bool { dirty }

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
        let reason = WrongReason.of(attempt.verdict, timedOut: attempt.timedOut)
        guard let p = state.index(attempt.profile) else {
            // No profile, no progress. Returning a zero delta rather than trapping: an
            // answer arriving for a profile that was just deleted is a race, not a bug in
            // the child's arithmetic.
            return ProgressDelta(masteryBefore: 0, masteryAfter: 0, streak: 0,
                                 scaffold: .full, crystalsAwarded: 0,
                                 poolBefore: MQRule.minPool, poolAfter: MQRule.minPool,
                                 wrongReason: reason, touchedTeachingState: false)
        }

        // WHICH MODE. The attempt may say; otherwise the live session says; a session
        // this store has never seen is Quest, because losing a child's learning to a
        // mode that forgot to open a session is the worse failure.
        let mode = attempt.mode ?? live[attempt.session.raw]?.mode ?? .quest
        // **THE W3 FENCE.** A Patchwerk answer is a PLAY answer. It buys no mastery, it
        // climbs no teaching pool and it fades no scaffold - Kevin's ruling, and until
        // the fix pass of 2026-09-07 the module claimed it in bold in two places while
        // doing the opposite: 12 answers on a `.patchwerk` session took mastery to 1.0,
        // the pool from 1 to 3 and the scaffold from full to NONE. The test named after
        // the claim called `recordPatchwerkRun`, which touches no skill state on any
        // code path, so it could not have failed (Progress Refutation W3).
        //
        // Note this DIVERGES from `ios/PHASE1.md` §3 ("MQPatchwerk ... may not read or
        // write mastery differently from Quest"). The contract sentence and the module's
        // own headline claim cannot both hold; this fix pass keeps the claim, because a
        // mode whose pool is drawn from `pwPoolWeights(stacks)` - a random 1/2/3 weighted
        // by a SCORING number - must not then write the child's teaching pool.
        let teaches = (mode == .quest)

        var skill = state.profiles[p].skills[attempt.skill.raw] ?? SkillState()
        let masteryBefore = skill.mastery
        let poolBefore = skill.pool
        let wasCorrect = attempt.verdict.correct && !attempt.timedOut

        if teaches {
            skill.applyClimb(correct: wasCorrect)
            // The ladder is applied HERE, from the record of attempts, and only ever
            // downward. A mode never asks for it; a mode that wanted to could not raise
            // it anyway - `fade(to:)` is the only writer.
            skill.applyFadeLadder(correct: wasCorrect)
            // Only a teaching answer creates a skill row. A Patchwerk-only child has no
            // teaching record at all, which is the honest shape and what the suite reads.
            state.profiles[p].skills[attempt.skill.raw] = skill
        }

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
                // The battle reports; the store bounds. See `LiveSession.award`.
                crystals = session.award(reported: attempt.crystalsReported, correct: true)
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

        // The tap path, and the ONLY caller of the coalescing write.
        persistSoon()

        return ProgressDelta(masteryBefore: masteryBefore, masteryAfter: skill.mastery,
                             streak: streak, scaffold: skill.scaffold, crystalsAwarded: crystals,
                             poolBefore: poolBefore, poolAfter: skill.pool, wrongReason: reason,
                             touchedTeachingState: teaches)
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
        }
        // A session end always writes through, whatever the coalescing window is
        // holding: it is the natural flush point and the one the web itself uses
        // (`saveData()` runs at `endGame`).
        persist()
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

    @discardableResult
    public func rename(_ name: String, profile: ProfileID) async -> String? {
        guard let p = state.index(profile) else { return nil }
        // Uniqued against everyone ELSE. Renaming a child to the name they already have
        // must not turn "Ben" into "Ben 2".
        let stored = state.uniqueName(name, excluding: profile.raw)
        state.profiles[p].name = stored
        // Nothing else moves. The row is keyed by `id`, sessions and Patchwerk runs hang
        // off the row, skills hang off the row, and any in-flight `LiveSession` names the
        // profile by `id` too - so the rename is genuinely a one-field write and every
        // test that says so is testing that fact rather than a proxy for it.
        persist()
        return stored
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
            // The zero-skill trap: an island with nothing registered in it yet is
            // *Coming soon*, never vacuously *cleared*.
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
        let allMastered = mastered == skills.count
        // The web's own answer: a finished session ON THIS NODE that filled the
        // six-crystal rope. `endGame(true)` in js/app.js is `S.mi >= MONSTERS.length`,
        // and `S.mi` is what the session row stores as `crystals`.
        let wonARun = p.map { i in
            state.profiles[i].sessions.contains {
                $0.topic == topicID && $0.crystals >= MQRule.crystalsPerSession
            }
        } ?? false

        let clearedNow: Bool
        switch clearedPolicy {
        case .mastery:               clearedNow = allMastered
        case .webVictory, .both:     clearedNow = wonARun
        }

        let derived: NodeProgress.State
        if clearedNow {
            derived = .cleared
        } else if attempts == 0 {
            derived = .open
        } else {
            derived = .inProgress(collected: mastered, total: skills.count)
        }
        return NodeProgress(topic: topicID, skillsTotal: skills.count, skillsMastered: mastered,
                            attempts: attempts, mastery: mean, state: derived,
                            mastered: allMastered, wonARun: wonARun)
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
