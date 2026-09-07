import Foundation
import SwiftUI
import MQContent
import MQDesign
import MQProgress

/// What the `+` token's sheet is holding before it becomes a profile.
///
/// A value, not three `@Published` fields, so the whole sheet is one piece of
/// state a gate can set and render without walking the UI - the same reason
/// `reviewPage` lives on the model.
public struct QExplorerDraft: Equatable, Sendable {
    public var cast: MQCast = .unicorn
    public var level: String = "P4"

    public init(cast: MQCast = .unicorn, level: String = "P4") {
        self.cast = cast; self.level = level
    }
}

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
    /// The `+` token's sheet: pick a creature and a class level, then Start.
    case newExplorer
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
    /// **Whether the composition root has actually wired Patchwerk.**
    ///
    /// The map draws its Patchwerk plank only when this is true. Patchwerk had no
    /// entry point anywhere in the app - the rehearsal reached it by constructing
    /// a `PatchwerkSession` by hand (leg 6) - and the fix is a control on the map;
    /// but the fix for the entrance's dead `+` was to stop drawing controls that
    /// do nothing, and it would be absurd to close one by opening another.
    /// `mqhost` and `MQApp` set this; a bare `QQuestModel` does not.
    ///
    /// `MQQuest` does NOT import `MQPatchwerk`: one mode may not depend on
    /// another. `QRoot` takes the arena as a view builder from the composition
    /// root, which is where the engine is named too.
    public let patchwerkAvailable: Bool

    public init(source: any QuestionSource, store: any ProgressStore,
                random: QRandom = QSystemRandom(), setSize: Int = 12,
                patchwerkAvailable: Bool = false) {
        self.source = source; self.store = store
        self.random = random; self.setSize = setSize
        self.patchwerkAvailable = patchwerkAvailable
    }

    // MARK: Published state

    @Published public private(set) var phase: QPhase = .entrance
    /// **The profiles, WITH the store's own ids.**
    ///
    /// This used to be `[MQProfile]`, and `MQProfile.id` is the child's display
    /// NAME. The entrance handed a name back, `pick` wrapped it in a `ProfileID`,
    /// and `MQProgressStore.addProfile` mints a UUID - so every `Attempt` in the
    /// app's life arrived keyed `"Charlotte"` against a store keyed
    /// `AB1386B6-...`, `record()` took its "no profile" early return, and NOTHING
    /// A CHILD DID WAS EVER RECORDED. The Phase 1 dress rehearsal played 34
    /// correct answers into an on-disk store and read back `"skills":{}`,
    /// `"sessions":[]`, `lifetimeCrystals: 0`; a second process, cold, drew every
    /// node "Ready". The island could never change and "Cleared" could never
    /// appear.
    ///
    /// So the picker carries `ProfileRecord` - the store's `(id, profile)` pair,
    /// which exists for exactly this and whose own doc says so. **There is now no
    /// `ProfileID` built from a display string anywhere in the app's sources**;
    /// `grep -n "ProfileID(" ios/Packages/*/Sources` returns only `MQProgressStore`
    /// minting and reading its own.
    @Published public private(set) var records: [ProfileRecord] = []
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
    /// Which page of the review the result screen is showing.
    ///
    /// It lives on the MODEL rather than in `@State` on the view because the
    /// headless gate and the driver have to be able to turn the page and render
    /// it: `ImageRenderer` renders a view once, from the outside, and cannot
    /// press a button that lives in `@State`. Reset by `finish()`.
    @Published public private(set) var reviewPage: Int = 0
    /// What the `+` sheet is holding. Reset by `beginNewExplorer`.
    @Published public private(set) var draft = QExplorerDraft()
    /// Whether the Patchwerk arena is up over the map. See `patchwerkAvailable`.
    @Published public private(set) var showsPatchwerk = false

    private var catalogue: TopicCatalogue?
    private var profileID: ProfileID?
    private var sessionID: SessionID?
    private var engineSession: String = ""
    private var startedAt: Date = .init()
    /// Bumped on every `open()`, and part of the engine session id.
    ///
    /// The id used to be `quest-<profile>-<topic>-<unix seconds>`, so two opens
    /// inside the same second SHARED one feed session and the second run replayed
    /// the first's no-repeat ring - which `playAgain`'s own doc says is the thing a
    /// new id exists to prevent. Tapped promptly, it was not a new run (Quest
    /// Refutation K6, third finding).
    private var openCount: Int = 0

    // MARK: - Derived

    /// The unit chips for the question on screen.
    ///
    /// Built from the question's whole ACCEPTED SET, never from `unit` alone: the
    /// canonical member is what the chip prints, and the set is what a distractor
    /// is filtered against (Quest Refutation K3/K7).
    public var chips: [String] {
        guard let q = question, q.isTyped, !q.acceptedUnits.isEmpty else { return [] }
        return QUnits.chips(q)
    }

    public var keypadPolicy: QKeypadPolicy {
        QKeypadPolicy.forTopic(question?.topic ?? node?.topicID ?? "")
    }

    public var canSubmit: Bool {
        guard phase == .asking, let q = question else { return false }
        return q.isTyped ? entry.isSubmittable : true
    }

    public var wrongItems: [QAnsweredItem] { answered.filter { !$0.isCorrect } }

    /// What the entrance DRAWS. Derived from `records`, never held beside them:
    /// two lists of the same children is how the id and the name came apart.
    public var profiles: [MQProfile] { records.map(\.profile) }

    /// The id the run is recording against, for a gate or a composition root that
    /// has to prove the app and the store agree. Nil off the entrance.
    public var currentProfileID: ProfileID? { profileID }

    // MARK: - Entrance

    public func load() async {
        do {
            let cat = try await source.listTopics()
            catalogue = cat
            engineStamp = (try? await source.engineBuild().stamp) ?? ""
            records = await store.profileRecords()
            phase = .entrance
        } catch {
            phase = .failed("The island could not be loaded. \(error)")
        }
    }

    /// **Pick a child, by the STORE's id.**
    ///
    /// The signature is the fix: a caller cannot hand this a display name, so the
    /// id the run records against is the id the store keys on, by construction
    /// rather than by convention. See `records`.
    public func pick(_ chosen: ProfileRecord) async {
        profile = chosen.profile
        profileID = chosen.id
        await refreshIsland()
        phase = .map
    }

    /// Make a profile and return its id. The list is re-read from the STORE
    /// afterwards rather than appended to locally, so a name the store made
    /// unique ("Ben" -> "Ben 2") is the name on the beach.
    @discardableResult
    public func addProfile(name: String, cast: MQCast, level: String) async -> ProfileID {
        let id = await store.addProfile(name: name, cast: cast, level: level)
        records = await store.profileRecords()
        return id
    }

    // MARK: - New explorer
    //
    // The `+` token on the entrance was `Button { guard let profile else { return } ... }`
    // - the empty slot's action returned immediately and NOTHING in the app called
    // `addProfile`. A parent on a fresh install landed on an entrance with one dead
    // `+` and could not start (Phase 1 dress rehearsal, leg 1). The driver and the
    // harness never met it because both inject profiles into the store directly.
    //
    // What the `+` opens is deliberately small: a creature, a class level, and a
    // plank that says Start. There is no name field, because a keyboard on this
    // screen is the one thing that would need an adult - the store names a new
    // child "Explorer" and keeps display names unique, and `ProgressStore.rename`
    // exists for the parent screen MQApp will draw. PHASE1.md section 4 lists
    // "profile creation (MQApp)" as not-yet-drawn; this is the minimum that makes
    // the entrance WORK, and MQApp may replace it.

    public func beginNewExplorer() {
        guard phase == .entrance else { return }
        draft = QExplorerDraft(level: levelsOffered.first ?? "P4")
        phase = .newExplorer
    }

    public func cancelNewExplorer() {
        guard phase == .newExplorer else { return }
        phase = .entrance
    }

    public func chooseCast(_ cast: MQCast) {
        guard phase == .newExplorer, cast != .crab else { return }
        draft.cast = cast
    }

    public func chooseLevel(_ level: String) {
        guard phase == .newExplorer, levelsOffered.contains(level) else { return }
        draft.level = level
    }

    /// Create the explorer AND pick them, so the `+` lands the child on their own
    /// island rather than back on a beach with one more token. **This is the path
    /// the end-to-end gate drives**: tap `+`, tap a creature, tap a level, tap
    /// Start, play, and read the answers back off the disk.
    public func createExplorer() async {
        guard phase == .newExplorer else { return }
        let id = await addProfile(name: QStrings.defaultExplorerName,
                                  cast: draft.cast, level: draft.level)
        guard let made = records.first(where: { $0.id == id }) else {
            phase = .failed("That explorer could not be saved.")
            return
        }
        await pick(made)
    }

    /// The class levels the engine actually has content for, in order. Read off
    /// the catalogue rather than hard-coded, so a level with no live node can
    /// never be offered - a child who picks P6 today gets three stops, two of
    /// them locked, and that is content news, not a picker bug.
    public var levelsOffered: [String] {
        guard let catalogue else { return [] }
        var seen = Set<String>()
        for node in catalogue.nodes where node.playable {
            for g in node.grades { seen.insert(g) }
        }
        return catalogue.grades.filter(seen.contains)
    }

    // MARK: - Patchwerk

    /// Raise the arena over the map. Nothing about Quest's own state moves: the
    /// island is still there underneath, and Patchwerk touches no teaching state
    /// (PHASE1.md section 3 - play modes keep streaks, teaching scaffolds fade).
    public func openPatchwerk() {
        guard patchwerkAvailable, phase == .map, profileID != nil else { return }
        showsPatchwerk = true
    }

    public func closePatchwerk() async {
        showsPatchwerk = false
        // A Patchwerk run recorded a session against the same profile, so the
        // crystals on the map's name tag may have moved even though mastery
        // cannot have. Re-read rather than assume.
        await refreshIsland()
        records = await store.profileRecords()
    }

    public func backToEntrance() async {
        if phase == .asking || phase == .feedback { await abandonRun() }
        await endSessions()
        profile = nil; profileID = nil; island = nil; node = nil
        records = await store.profileRecords()
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
        // A node opened while a run is live ends that run's sessions first. Without
        // this an `open()` overwrites `sessionID` and `engineSession` and both leak.
        await endSessions()
        node = target
        run = QRunState(startLevel: 1)
        answered = []
        feedback = nil
        summary = nil
        reviewPage = 0
        entry = QTypedEntry()
        startedAt = Date()
        openCount += 1
        sessionID = await store.beginSession(profile: profileID, mode: .quest,
                                             topic: node?.topicID)
        engineSession = "quest-\(profileID.raw)-\(target.topicID)-"
            + "\(Int(startedAt.timeIntervalSince1970))-\(openCount)"
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

    /// **Put one specific question on the board, for a LAYOUT measurement.**
    ///
    /// The fit gate has to measure the battle screen against the longest stem a
    /// topic actually produces, which means putting twenty real drawn questions
    /// on the board one after another without answering any of them. It clears the
    /// entry and the feedback card, touches no run state, and records no attempt -
    /// so it can never stand in for a real draw. Named for what it is, because a
    /// method that quietly swaps the question mid-run would be a bug factory.
    public func showQuestionForMeasurement(_ q: Question) {
        question = q
        entry = QTypedEntry()
        feedback = nil
        phase = .asking
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
        guard phase == .asking, let q = question, q.isTyped,
              entry.isSubmittable else { return }
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
            let reason = QReasonClassifier.classify(question: q, answer: answer,
                                                    verdict: verdict)

            let resolution = run.apply(correct: verdict.correct,
                                       heroRoll: random.ri(0, 4),
                                       monsterRoll: random.ri(0, 3))

            var explanation: Explanation?
            if !verdict.correct { explanation = try? await source.explain(q) }

            // THE CRYSTAL REPORT (Progress Refutation W1, wired on the phase 1
            // integration, 2026-09-07).
            //
            // A store owns no monster and no damage roll, so it cannot re-derive the
            // web's crystal; the battle can, and did, eight lines up. `resolution` came
            // out of `QRunState.apply`, which is `js/app.js`'s own arithmetic:
            //
            //     const crit = S.streak >= 3
            //     const dmg  = (18 + S.level*6 + ri(0,4)) * (crit ? 2 : 1)
            //     S.mHp -= dmg ; if (S.mHp <= 0) monsterDown()
            //
            // and `monsterFell` IS `monsterDown()` - the web's crystal. It is reported
            // here, one per felled monster, and the store BOUNDS it (never more than
            // one on a correct answer, never anything on a wrong one, never more than
            // six a session). `monsterDown` resets `S.mHp` on the web, so overkill
            // never carries and 1 is the true ceiling for one answer.
            //
            // The re-derivation this replaces (mastery crossing a threshold) awarded a
            // mean of 2.55 crystals a session and filled the six-crystal rope 0 times
            // in 200 real web sessions, against the web's own 5.285 and 145 of 200.
            // The corpus is tools/fixtures/web-crystals-200.json and QFlowTests
            // asserts this call against it.
            let reviewSnapshot: ReviewSnapshot? = verdict.correct ? nil : ReviewSnapshot(
                question: q.stem,
                figure: q.figure,
                answer: verdict.expectedText,
                explanation: explanation?.text ?? "")
            await store.record(Attempt(
                session: sessionID, profile: profileID, skill: SkillID(q.skill),
                verdict: verdict, elapsed: 0,
                scaffoldShown: await store.scaffold(profile: profileID,
                                                    skill: SkillID(q.skill)),
                timedOut: false,
                item: reviewSnapshot,
                topic: node?.topicID,
                crystalsReported: resolution.monsterFell ? 1 : 0,
                mode: .quest))

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
    ///
    /// **A PERFECT RUN ENDS ON ITEM 11, NOT 12, AND THAT IS THE WEB'S BEHAVIOUR.**
    /// Recorded because it reads like a bug in a transcript (Quest Refutation,
    /// wound 1: three perfect runs, three times 11 of a nominal 12). The six-monster
    /// chain holds 490 HP and always-correct clears it on item 11, and `js/app.js`
    /// ends the run at exactly that point:
    ///
    /// ```js
    /// S.mi++;
    /// if(S.mi>=MONSTERS.length){ endGame(true); return; }   // js/app.js:569
    /// ```
    ///
    /// The web has no set at all - it runs until the chain falls or the hero does -
    /// so clearing the chain IS the ending, and stopping there is parity rather
    /// than a short set. What the set size bounds is the LONGEST a run can be. The
    /// content-quality gate ("Kevin plays 10 items per level") should count items
    /// answered, not the nominal N.
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
        self.sessionID = nil
        reviewPage = 0
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
        engineSession = ""
        await refreshIsland()
        phase = .result
    }

    /// **End both sessions, whatever the run was doing.** Idempotent.
    ///
    /// `QRoot`'s own doc comment says a back swipe that popped the battle without
    /// ending the engine's feed session would leak a no-repeat ring per swipe. The
    /// pause knob did exactly that: `toMap()` refreshed the island and set the
    /// phase, and left one engine feed session open per press - measured monotonic
    /// to the engine's cap of 64, after which it evicts silently and LIVE sessions
    /// start losing their rings (Quest Refutation K6). The progress store's session
    /// leaked with it, so its `SessionSummary` was never computed.
    private func endSessions() async {
        if let sessionID {
            _ = await store.endSession(sessionID)
            self.sessionID = nil
        }
        if !engineSession.isEmpty {
            try? await source.endSession(engineSession)
            engineSession = ""
        }
    }

    /// Abandon a run without a result screen: the pause knob, and any back
    /// navigation out of the battle. **Ends both sessions** - see `endSessions`.
    public func abandonRun() async {
        await endSessions()
        run = QRunState(startLevel: 1)
        answered = []
        feedback = nil
        question = nil
        entry = QTypedEntry()
    }

    // MARK: - The review, paged

    /// How many wrong items the result screen can show on one page at this size.
    /// Public so the gate can compute the page count without drawing.
    public func reviewPageCount(_ rows: Int) -> Int {
        let n = summary?.review.count ?? 0
        guard rows > 0 else { return 1 }
        return max(1, Int((Double(n) / Double(rows)).rounded(.up)))
    }

    public func showReviewPage(_ index: Int, rows: Int) {
        let count = reviewPageCount(rows)
        reviewPage = min(max(index, 0), count - 1)
    }

    public func reviewPageForward(rows: Int) { showReviewPage(reviewPage + 1, rows: rows) }
    public func reviewPageBack(rows: Int) { showReviewPage(reviewPage - 1, rows: rows) }

    /// Play the same node again. A "play again" that re-enters the same feed
    /// session would replay the same no-repeat ring; a new session id is what
    /// makes a second run a second run.
    public func playAgain() async {
        guard let node else { return }
        await open(node)
    }

    /// Back to the island. From a LIVE battle this abandons the run, and
    /// abandoning a run ends its sessions - see `abandonRun`.
    public func toMap() async {
        if phase == .asking || phase == .feedback { await abandonRun() }
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
            let canonical = QUnits.canonical(item.question)
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

    /// **Defeat is checked before anything else.**
    ///
    /// There was no defeat branch at all, so a 0-of-9 knockout with the hero on
    /// -4 HP was titled *"Good run!"* (Quest Refutation, wound 2). A screen that
    /// says the same thing whatever happened is not encouraging, it is not
    /// looking. `cleared` and `defeated` are the web's own two endings
    /// (`endGame(true)` / `endGame(false)` in `js/app.js`).
    public var title: String {
        if defeated { return QStrings.resultTitleDefeated }
        if total > 0 && correct == total { return QStrings.resultTitleAllCorrect }
        if cleared { return QStrings.resultTitleCleared }
        return QStrings.resultTitleGoodRun
    }

    public var elapsedText: String {
        let s = Int(elapsed.rounded())
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}
