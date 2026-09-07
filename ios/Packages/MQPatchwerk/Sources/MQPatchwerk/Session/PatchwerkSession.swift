import Foundation
import MQContent
import MQDesign
import MQServices

/// The whole mode as one object: tier picker -> run -> result -> board.
///
/// It owns the phase, the run, the question on screen and the record at the end.
/// It owns NO timer: `tick()` is called from outside, which is what keeps the
/// mode testable in milliseconds against a `PatchwerkManualClock` while the app
/// drives it from a real one.
///
/// Everything expensive is behind `async`. The run engine underneath is
/// synchronous and deterministic on purpose - a scoring path with an `await` in
/// the middle is a scoring path where two answers can interleave.
@MainActor
public final class PatchwerkSession: ObservableObject {

    public enum Phase: Equatable { case picker, running, result, board }

    /// Who is playing. No account, no identifier - a name, a creature and a class
    /// level held on this iPad.
    public struct Player: Equatable, Sendable {
        public var profile: ProfileID
        public var name: String
        public var cast: MQCast
        /// MOE class level, `"P3"` ... `"P6"`.
        public var level: String

        public init(profile: ProfileID, name: String, cast: MQCast, level: String) {
            self.profile = profile; self.name = name; self.cast = cast; self.level = level
        }

        /// `"P4"` -> 4. The record keeps a number because it is the same struct
        /// the web writes; the board bucket keeps the label.
        public var levelNumber: Int { Int(level.filter(\.isNumber)) ?? 0 }
    }

    // MARK: Published state

    @Published public private(set) var phase: Phase = .picker
    @Published public var tierID: String
    @Published public private(set) var elapsedMs: Int = 0
    @Published public private(set) var runState: PatchwerkRunState?
    @Published public private(set) var question: Question?
    /// One short line, only when the run has something to say. Never a rebuke.
    @Published public private(set) var flash: String?
    @Published public private(set) var record: PatchwerkRecord?
    @Published public private(set) var placement: LeaderboardPlacement?
    @Published public private(set) var board: [LeaderboardEntry] = []
    @Published public private(set) var boardTier: String
    @Published public private(set) var failure: String?

    // MARK: Dependencies

    private let source: QuestionSource
    private let leaderboard: LeaderboardService
    private let progress: any ProgressStore
    private let clock: PatchwerkClock
    public let config: PatchwerkConfig
    public let player: Player
    private let rngSeed: Int32?
    private let today: () -> String

    private var run: PatchwerkRun?
    private var feed: PatchwerkFeed?
    private var session: SessionID?
    private var questionShownAtMs: Int = 0
    private var advanceAtMs: Int?
    private var flashUntilMs: Int = 0
    private var isBusy = false
    private var entryID: String?

    public init(source: QuestionSource,
                leaderboard: LeaderboardService,
                progress: any ProgressStore,
                player: Player,
                clock: PatchwerkClock = PatchwerkSystemClock(),
                config: PatchwerkConfig = .mirrored,
                rngSeed: Int32? = nil,
                today: @escaping () -> String = PatchwerkSession.isoToday) {
        self.source = source
        self.leaderboard = leaderboard
        self.progress = progress
        self.player = player
        self.clock = clock
        self.config = config
        self.rngSeed = rngSeed
        self.today = today
        self.tierID = config.defaultTier
        self.boardTier = config.defaultTier
    }

    nonisolated public static func isoToday() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: Date())
    }

    // MARK: Derived reads for the HUD

    public var tier: PatchwerkConfig.Tier { config.tier(tierID) }
    public var timeLeftMs: Int { run?.timeLeftMs(at: elapsedMs) ?? tier.durationMs }
    public var isEnraged: Bool { run?.isEnraged(at: elapsedMs) ?? false }
    /// Input is locked during the stun and while the next question is loading.
    public var inputLocked: Bool {
        guard let run else { return true }
        return isBusy || run.isStunned(at: elapsedMs) || advanceAtMs != nil
    }

    /// Everything `MQPatchwerkScreen` renders, derived from the run. The design
    /// never does arithmetic, so every number is formatted here.
    public var scene: MQPatchwerkScene {
        let st = runState ?? PatchwerkRunState(bossHp: config.bossHpPerPhase)
        var s = MQPatchwerkScene.sample
        s.tierName = tier.label
        s.level = player.level
        s.timer = PatchwerkRun.clockLabel(ms: timeLeftMs)
        // The glass and the digits are the same clock. `sand` used to have no
        // field to arrive in and the screen drew a constant, so the picture was a
        // lie for the whole fight - see MQPatchwerkScene.sand.
        s.sand = sandFraction
        s.damage = PatchwerkSession.grouped(st.damage)
        s.stacks = st.stacks
        s.stackCap = config.stackCap
        s.multiplier = config.multiplierLabel(st.stacks)
        s.freezeHeld = st.freezes
        s.freezeTotal = config.freezeMaxHeld
        s.bossHP = run?.bossFraction ?? 1
        s.question = question?.stemText ?? ""
        s.figure = .none
        s.answers = question.map { Array($0.choiceTexts.prefix(4)) } ?? []
        while s.answers.count < 4 { s.answers.append("") }
        s.enraged = isEnraged
        s.flash = flash
        return s
    }

    /// 1,240 - the HUD's own grouping, so the design never formats a number.
    public static func grouped(_ n: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        // en_US_POSIX is the right locale for a fixed format, but it arrives with
        // grouping OFF - which is how `1,240` silently became `1240` the first
        // time this was written. Both switches are set explicitly.
        f.locale = Locale(identifier: "en_US_POSIX")
        f.usesGroupingSeparator = true
        f.groupingSeparator = ","
        f.groupingSize = 3
        return f.string(from: NSNumber(value: n)) ?? "\(n)"
    }

    /// Sand left in the glass, 0...1.
    public var sandFraction: Double {
        guard let run else { return 1 }
        return run.sandFraction(at: elapsedMs)
    }

    // MARK: Phases

    public func choose(tier id: String) {
        guard phase == .picker else { return }
        tierID = id
    }

    /// Begin a fight. Everything that can fail - no topics, a dead engine - fails
    /// HERE, before a clock is running, and lands in `failure` rather than in an
    /// alert over a live run.
    public func start() async {
        guard phase != .running else { return }
        failure = nil
        flash = nil
        record = nil
        placement = nil
        entryID = nil

        do {
            let catalogue = try await source.listTopics()
            let topics = PatchwerkFeed.topics(in: catalogue, level: player.level)
            guard !topics.isEmpty else {
                failure = "No unlocked quests for \(player.level) yet."
                return
            }
            var rng = rngSeed.map { PatchwerkRNG(seed: $0) } ?? PatchwerkRNG(clock: clock)
            _ = rng.next()   // discard the first draw; a fresh mulberry32 seeded from
                             // a millisecond clock has a visibly biased first value
            feed = PatchwerkFeed(source: source, topics: topics, rng: rng)

            let newRun = PatchwerkRun(tier: tierID, config: config, clock: clock)
            run = newRun
            runState = newRun.state
            elapsedMs = 0
            session = await progress.beginSession(profile: player.profile, mode: .patchwerk)
            phase = .running
            await loadNextQuestion()
        } catch {
            failure = "The question engine did not answer. \(error)"
        }
    }

    /// One tap on an answer tile.
    public func answer(choice index: Int) async {
        guard phase == .running, let run, let question, !isBusy else { return }
        // The run is the authority on whether this tap counts - not the view. The
        // view ALSO disables tiles during the stun, deliberately: belt and braces
        // on the anti-spam guard, exactly as the web does it.
        isBusy = true
        defer { isBusy = false }

        let at = elapsedNow()
        let answerMs = Double(max(0, at - questionShownAtMs))

        let verdict: Verdict
        do {
            verdict = try await source.grade(question: question, answer: .choice(index))
        } catch {
            failure = "The engine could not grade that answer."
            return
        }

        let event = run.answer(verdict.correct, level: question.pool,
                               answerMs: answerMs, at: at)
        runState = run.state
        elapsedMs = at

        guard !event.ignored else { return }

        // Progress is recorded for EVERY counted answer, the same way Quest does
        // it. Damage is a play number; mastery is a learning number, and Patchwerk
        // may not touch mastery differently just because it is the fun mode.
        if let session {
            await progress.record(Attempt(
                session: session, profile: player.profile,
                skill: SkillID(question.skill), verdict: verdict,
                elapsed: answerMs / 1000,
                // Patchwerk draws no scaffold at all, so what the child was shown
                // is `.none`. Recording the STORE's level here would put help in
                // the audit record that was never on the screen.
                scaffoldShown: .none))
        }

        if event.correct {
            flash = event.earnedFreeze ? "+1 freeze" : nil
            flashUntilMs = at + 900
            await loadNextQuestion()
        } else {
            // No shaming visual. The boss simply takes no damage for a beat, and
            // the child gets told the answer.
            flash = event.froze
                ? "Freeze! Your stacks are safe."
                : "The answer is \(question.answerTextPlain)."
            flashUntilMs = at + run.config.stunMs
            // The next question arrives after the stun, not before it: an answer
            // the child cannot submit yet is a question they get to read for free.
            advanceAtMs = at + run.config.stunMs
        }
    }

    /// Drive from outside - a frame, a timer, or a test moving a manual clock.
    public func tick() async {
        guard phase == .running, let run else { return }
        elapsedMs = elapsedNow()

        if flash != nil, elapsedMs > flashUntilMs { flash = nil }

        if run.timeLeftMs(at: elapsedMs) <= 0 {
            await end()
            return
        }
        if let due = advanceAtMs, elapsedMs >= due {
            advanceAtMs = nil
            await loadNextQuestion()
        }
    }

    private func elapsedNow() -> Int { run?.elapsedMs ?? 0 }

    private func loadNextQuestion() async {
        guard let run, let feed, phase == .running else { return }
        do {
            let q = try await feed.next(stacks: run.state.stacks)
            question = q
            questionShownAtMs = elapsedNow()
        } catch {
            failure = "The question engine ran dry."
            await end()
        }
    }

    /// The clock hit zero. Submits the record, once.
    public func end() async {
        guard let run, phase == .running else { return }
        let rec = run.finish(level: player.levelNumber, date: today())
        record = rec
        runState = run.state
        elapsedMs = run.tier.durationMs
        question = nil
        flash = nil
        advanceAtMs = nil
        phase = .result

        if let session { _ = await progress.endSession(session) }
        self.session = nil

        let entry = rec.entry(profile: player.profile.raw,
                              name: MQNameFilter.clean(player.name),
                              cast: player.cast.rawValue,
                              levelLabel: player.level,
                              recordedAt: Date().timeIntervalSince1970)
        entryID = entry.id
        placement = try? await leaderboard.submit(entry)
        boardTier = rec.tier
        board = (try? await leaderboard.top(entry.bucket, limit: LocalLeaderboard.capacity)) ?? []
    }

    /// Abandon a run. Nothing is submitted - a run the child walked out of is not
    /// a score, and it is not a failure either.
    public func abandon() async {
        if let session { _ = await progress.endSession(session) }
        session = nil
        run = nil
        runState = nil
        question = nil
        flash = nil
        advanceAtMs = nil
        phase = .picker
    }

    // MARK: Board

    public func showBoard(tier id: String? = nil) async {
        if let id { boardTier = id }
        board = (try? await leaderboard.top(bucket(tier: boardTier),
                                            limit: LocalLeaderboard.capacity)) ?? []
        phase = .board
    }

    public func bucket(tier id: String) -> LeaderboardBucket {
        LeaderboardBucket(mode: "patchwerk", tier: id, level: player.level)
    }

    /// The row this run produced, if it is still on the board.
    public var myEntryID: String? { entryID }

    public func backToPicker() {
        phase = .picker
    }

    public func playAgain() async {
        phase = .picker
        await start()
    }
}
