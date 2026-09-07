import Foundation
import SwiftUI
import MQContent
import MQDesign

/// One answered item, kept so the result screen and the transcript can both read
/// it without asking the engine again.
public struct QAnsweredItem: Sendable, Identifiable {
    public var id: String { question.id }
    public let question: Question
    public let answer: Answer
    /// Exactly what was submitted, as a string, for a typed answer.
    public let submitted: String
    /// The chip the child chose, or nil for blank.
    public let unitChip: String?
    public let verdict: Verdict
    public let reason: QReason
    public let explanation: Explanation?
    public let resolution: QResolution

    public var isCorrect: Bool { verdict.correct }
}

/// Where the flow is. The NavigationStack path is derived from this, never the
/// other way round: a screen never decides what the run is doing.
public enum QPhase: Equatable, Sendable {
    case entrance
    case map
    /// A question is on screen and the child may answer.
    case asking
    /// The answer has landed; the feedback card is up.
    case feedback
    case result
    /// The engine or the store failed. Named, because a silent stall on a child's
    /// iPad is indistinguishable from a frozen app.
    case failed(String)
}

/// The Quest run, as one observable object.
///
/// `ObservableObject` rather than `@Observable`: the deployment floor is iOS 16
/// and `@Observable` is 17. `PHASE1.md` bans guarded islands outright.
///
/// **This type owns no look and no persistence.** It holds a `QuestionSource`
/// (which is `MQContent`, never `MQEngineJS` - the contract rule) and an
/// `any ProgressStore`, and it hands screens the scenes they draw.
@MainActor
public final class QQuestModel: ObservableObject {

    // MARK: Wiring

    public let source: any QuestionSource
    public let store: any ProgressStore
    public let random: QRandom
    /// How many items a node's set is. The web has no set at all (it runs until
    /// the chain falls or the hero does); the map implies one, and twelve is what
    /// the driver scripts and the content-quality gate use.
    public let setSize: Int

    public init(source: any QuestionSource, store: any ProgressStore,
                random: QRandom = QSystemRandom(), setSize: Int = 12) {
        self.source = source; self.store = store
        self.random = random; self.setSize = setSize
    }

    // MARK: Published state

    @Published public private(set) var phase: QPhase = .entrance
    @Published public private(set) var profiles: [MQProfile] = []
    @Published public private(set) var profile: MQProfile?
    @Published public private(set) var island: QIsland?
    @Published public private(set) var node: QNode?
    @Published public private(set) var run = QRunState()
    @Published public private(set) var question: Question?
    @Published public private(set) var entry = QTypedEntry()
    @Published public private(set) var answered: [QAnsweredItem] = []
    /// The feedback card under the board after an answer.
    @Published public private(set) var feedback: QFeedback?
    @Published public private(set) var summary: QSummary?
    @Published public private(set) var engineStamp: String = ""

    private var catalogue: TopicCatalogue?
    private var profileID: ProfileID?
    private var sessionID: SessionID?
    private var engineSession: String = ""
    private var startedAt: Date = .init()

    // MARK: - Derived

    public var chips: [String] {
        guard let q = question, q.isTyped, !q.unit.isEmpty else { return [] }
        return QUnits.chips(declared: q.unit, questionID: q.id)
    }

    public var keypadPolicy: QKeypadPolicy {
        QKeypadPolicy.forTopic(question?.topic ?? node?.topicID ?? "")
    }

    public var canSubmit: Bool {
        guard phase == .asking, let q = question else { return false }
        return q.isTyped ? !entry.isEmpty : true
    }

    public var wrongItems: [QAnsweredItem] { answered.filter { !$0.isCorrect } }

    // MARK: - Entrance

    public func load() async {
        do {
            let cat = try await source.listTopics()
            catalogue = cat
            engineStamp = (try? await source.engineBuild().stamp) ?? ""
            profiles = await store.profiles()
            phase = .entrance
        } catch {
            phase = .failed("The island could not be loaded. \(error)")
        }
    }

    public func pick(_ chosen: MQProfile) async {
        profile = chosen
        profileID = ProfileID(chosen.name)
        await refreshIsland()
        phase = .map
    }

    public func addProfile(name: String, cast: MQCast, level: String) async {
        _ = await store.addProfile(name: name, cast: cast, level: level)
        profiles = await store.profiles()
    }

    public func backToEntrance() async {
        profile = nil; profileID = nil; island = nil; node = nil
        phase = .entrance
    }

    private func refreshIsland() async {
        guard let cat = catalogue, let profile, let profileID else { return }
        let mastery = await store.mastery(profile: profileID)
        island = QIsland.build(catalogue: cat, level: profile.level, mastery: mastery)
    }

    // MARK: - Map -> battle

    /// Open a node. A `comingSoon` node is not openable and says so on the map;
    /// this refuses it anyway rather than trusting the screen.
    public func open(_ target: QNode) async {
        guard target.playable, let profileID else { return }
        node = target
        run = QRunState(startLevel: 1)
        answered = []
        feedback = nil
        summary = nil
        entry = QTypedEntry()
        startedAt = Date()
        sessionID = await store.beginSession(profile: profileID, mode: .quest)
        engineSession = "quest-\(profileID.raw)-\(target.topicID)-\(Int(startedAt.timeIntervalSince1970))"
        await drawNext()
    }

    private func drawNext() async {
        guard let node else { return }
        do {
            question = try await source.nextQuestion(
                .feed(topic: node.topicID, level: run.level, session: engineSession))
            entry = QTypedEntry()
            feedback = nil
            phase = .asking
        } catch {
            phase = .failed("The next question could not be drawn. \(error)")
        }
    }

    // MARK: - Typed input

    public func press(_ key: QTypedEntry.Key) {
        guard phase == .asking else { return }
        entry.press(key, policy: keypadPolicy)
    }

    /// Tap a chip. Tapping the selected chip again clears it, so blank is always
    /// one tap away and a mis-tap is not a trap.
    public func toggleChip(_ chip: String) {
        guard phase == .asking else { return }
        entry.unit = (entry.unit == chip) ? nil : chip
    }

    // MARK: - Answering

    public func submitTyped() async {
        guard phase == .asking, let q = question, q.isTyped, !entry.isEmpty else { return }
        await submit(.typed(entry.submission), submitted: entry.submission, chip: entry.unit)
    }

    public func choose(_ index: Int) async {
        guard phase == .asking, let q = question, !q.isTyped,
              q.choices.indices.contains(index) else { return }
        await submit(.choice(index), submitted: q.choiceTexts[index], chip: nil)
    }

    private func submit(_ answer: Answer, submitted: String, chip: String?) async {
        guard let q = question, let profileID, let sessionID else { return }
        do {
            let verdict = try await source.grade(question: q, answer: answer)
            let reason = await QReasonClassifier.classify(
                question: q, answer: answer, verdict: verdict,
                regradeBare: { [source] bare in
                    try await source.grade(question: q, answer: .typed(bare))
                })

            let resolution = run.apply(correct: verdict.correct,
                                       heroRoll: random.ri(0, 4),
                                       monsterRoll: random.ri(0, 3))

            var explanation: Explanation?
            if !verdict.correct { explanation = try? await source.explain(q) }

            await store.record(Attempt(
                session: sessionID, profile: profileID, skill: SkillID(q.skill),
                verdict: verdict, elapsed: 0,
                scaffoldShown: await store.scaffold(profile: profileID,
                                                    skill: SkillID(q.skill))))

            let item = QAnsweredItem(question: q, answer: answer, submitted: submitted,
                                     unitChip: chip, verdict: verdict, reason: reason,
                                     explanation: explanation, resolution: resolution)
            answered.append(item)
            // The cheer rotates by ITEM NUMBER, not by a random draw. Two
            // reasons: the damage rolls are the only randomness the web has on
            // this path, and a cosmetic draw off the same generator would shift
            // every later damage roll - which made a replay of a recorded
            // transcript diverge on item 3.
            feedback = QFeedback(item: item,
                                 cheerIndex: run.answered % QStrings.correctCheers.count)
            phase = .feedback
            MQHaptics.fire(verdict.correct ? .correct : .wrong)
        } catch {
            phase = .failed("That answer could not be graded. \(error)")
        }
    }

    /// Move on from the feedback card. The set ends on the Nth item, on the
    /// hero's HP reaching zero, or on the chain being cleared - whichever comes
    /// first.
    public func advance() async {
        guard phase == .feedback else { return }
        if run.answered >= setSize || run.isDefeated || run.clearedTheChain {
            await finish()
        } else {
            await drawNext()
        }
    }

    // MARK: - Result

    public func finish() async {
        guard let sessionID else { return }
        let stored = await store.endSession(sessionID)
        summary = QSummary(
            correct: run.correct,
            total: run.answered,
            bestStreak: run.bestStreak,
            elapsed: Date().timeIntervalSince(startedAt),
            crystals: run.crystals,
            defeated: run.isDefeated,
            cleared: run.clearedTheChain,
            review: wrongItems,
            storeSummary: stored)
        try? await source.endSession(engineSession)
        await refreshIsland()
        phase = .result
    }

    /// Play the same node again. A "play again" that re-enters the same feed
    /// session would replay the same no-repeat ring; a new session id is what
    /// makes a second run a second run.
    public func playAgain() async {
        guard let node else { return }
        await open(node)
    }

    public func toMap() async {
        await refreshIsland()
        question = nil
        phase = .map
    }
}

/// The card under the board after one answer.
public struct QFeedback: Sendable, Equatable {
    public let item: QAnsweredItem
    public let cheerIndex: Int

    /// The lines, in the order they are read.
    ///
    /// **The unit lesson comes FIRST**, before the answer and before the working.
    /// A child who had the number right and the unit wrong has made one specific
    /// mistake, and burying that under "the answer is 360 cm²" teaches them they
    /// got the sum wrong - which they did not. This is the same ordering
    /// `unitLead()` uses in `js/app.js`.
    public var lines: [String] {
        if item.isCorrect {
            return [QStrings.correctCheers[cheerIndex % QStrings.correctCheers.count]]
        }
        var out: [String] = []
        if case .wrongUnit = item.reason {
            let canonical = QUnits.canonical(item.question.unit)
            out.append(QStrings.unitLesson(unit: canonical,
                                           why: QUnits.why(for: canonical)))
        }
        out.append(QStrings.theAnswerIs(item.question.answerTextPlain))
        let working = item.explanation?.text ?? item.question.explainText
        if !working.isEmpty { out.append(working) }
        return out
    }
}

extension QAnsweredItem: Equatable {
    public static func == (a: QAnsweredItem, b: QAnsweredItem) -> Bool {
        a.question.id == b.question.id && a.submitted == b.submitted
            && a.verdict == b.verdict && a.reason == b.reason
    }
}

/// What the result screen renders.
public struct QSummary: Sendable {
    public let correct: Int
    public let total: Int
    public let bestStreak: Int
    public let elapsed: TimeInterval
    public let crystals: Int
    public let defeated: Bool
    public let cleared: Bool
    public let review: [QAnsweredItem]
    /// What the store said. Held beside the run's own numbers rather than instead
    /// of them: the store is the authority on mastery, the run is the authority
    /// on what just happened in this set.
    public let storeSummary: SessionSummary

    public var accuracy: Int {
        total == 0 ? 0 : Int((Double(correct) / Double(total) * 100).rounded())
    }

    public var title: String {
        if total > 0 && correct == total { return QStrings.resultTitleAllCorrect }
        if cleared { return QStrings.resultTitleCleared }
        return QStrings.resultTitleGoodRun
    }

    public var elapsedText: String {
        let s = Int(elapsed.rounded())
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}
