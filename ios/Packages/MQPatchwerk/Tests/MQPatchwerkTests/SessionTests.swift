import Testing
import Foundation
import MQContent
import MQDesign
import MQProgress
import MQServices
@testable import MQPatchwerk

/// The mode end to end, driven by a clock the test owns: picker -> run -> result
/// -> board, with a real (in-memory) progress store and a real (temporary-file)
/// leaderboard underneath.
@MainActor
@Suite("A whole fight, from tier picker to board")
struct SessionTests {

    static func questions() -> [String: [Question]] {
        func q(_ topic: String, _ n: Int) -> Question {
            StubQuestionSource.question(
                id: "\(topic)\(n)", topic: topic, pool: 2,
                stem: n % 2 == 0 ? "What is \(n) x 10?" : "Round \(n * 111) to the nearest ten.",
                choices: ["\(n * 10)", "\(n)", "\(n + 1)", "\(n - 1)"], correctIndex: 0,
                skill: "skill-\(topic)")
        }
        return ["p4peri": (1...6).map { q("p4peri", $0) },
                "p4deci": (1...6).map { q("p4deci", $0) },
                "p4frac": (1...6).map { q("p4frac", $0) }]
    }

    static func make(tier: String = "short")
        -> (PatchwerkSession, PatchwerkManualClock, LocalLeaderboard, URL) {
        let clock = PatchwerkManualClock(0)
        let dir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("mqi-board-\(UUID().uuidString)")
        let board = LocalLeaderboard(url: dir.appendingPathComponent("board.json"))
        let session = PatchwerkSession(
            source: StubQuestionSource(catalogue: StubQuestionSource.sampleCatalogue(),
                                       questions: questions()),
            leaderboard: board,
            progress: MQProgressStore.inMemory(),
            player: .init(profile: ProfileID("charlotte"), name: "Charlotte",
                          cast: .unicorn, level: "P4"),
            clock: clock, config: .mirrored, rngSeed: 20260907,
            today: { "2026-09-07" })
        session.choose(tier: tier)
        return (session, clock, board, dir)
    }

    @Test("The picker chooses the fight, and nothing starts until it is asked to")
    func picker() async {
        let (s, _, _, _) = Self.make()
        #expect(s.phase == .picker)
        #expect(s.tierID == "short")
        s.choose(tier: "long")
        #expect(s.tier.durationMs == 300_000)
        #expect(s.record == nil)
    }

    @Test("A run scores, ends on the clock, and lands on the device board")
    func wholeRun() async {
        let (s, clock, _, _) = Self.make()
        await s.start()
        #expect(s.phase == .running)
        #expect(s.question != nil, "no question was drawn")
        #expect(s.failure == nil)

        // Ten correct answers, four seconds apart: enough to cap nothing and
        // bank two freeze credits.
        var t = 0
        for _ in 0..<10 {
            t += 4_000
            clock.set(t)
            await s.tick()
            await s.answer(choice: 0)
        }
        #expect(s.runState?.correct == 10)
        #expect(s.runState?.stacks == 10)
        #expect((s.runState?.damage ?? 0) > 0)
        #expect(s.runState?.freezes == 2)

        // Run the clock out.
        clock.set(s.tier.durationMs)
        await s.tick()
        #expect(s.phase == .result)
        let record = s.record
        #expect(record?.correct == 10)
        #expect(record?.tier == "short")
        #expect(record?.date == "2026-09-07")
        #expect(record?.level == 4, "P4 must reach the record as 4")
        #expect(s.placement?.rank == 1)
        #expect(s.board.count == 1)
        #expect(s.board.first?.name == "Charlotte")
        #expect(s.board.first?.score == record?.damage)
    }

    @Test("A wrong answer stuns: the next question waits, and taps do nothing")
    func wrongAnswerStuns() async {
        let (s, clock, _, _) = Self.make()
        await s.start()
        clock.set(3_000)
        await s.tick()
        let first = s.question
        await s.answer(choice: 1)          // wrong: index 0 is the correct one
        #expect(s.runState?.wrong == 1)
        #expect(s.inputLocked, "input was live during the stun")
        #expect(s.question?.id == first?.id, "the question changed before the stun ended")

        // Mashing inside the window changes nothing.
        let damage = s.runState?.damage ?? -1
        clock.set(3_500)
        await s.answer(choice: 0)
        #expect(s.runState?.damage == damage)
        #expect(s.runState?.correct == 0)

        // After the stun the next question arrives and input is live again.
        clock.set(3_000 + 1_500)
        await s.tick()
        #expect(s.inputLocked == false)
        #expect(s.question?.id != first?.id, "the fight did not move on after the stun")
    }

    @Test("The enrage turns the world to dusk, and says so on the HUD")
    func enrageScene() async {
        let (s, clock, _, _) = Self.make()
        await s.start()
        clock.set(s.tier.durationMs - 25_000)
        await s.tick()
        #expect(s.scene.enraged == false)
        clock.set(s.tier.durationMs - 15_000)
        await s.tick()
        #expect(s.scene.enraged, "the last 20 seconds are not enraged")
        #expect(s.scene.timer == "0:15")
    }

    @Test("The HUD reads the run, and the design never does arithmetic")
    func sceneFormatting() async {
        let (s, clock, _, _) = Self.make()
        await s.start()
        for i in 1...7 {
            clock.set(i * 3_000)
            await s.tick()
            await s.answer(choice: 0)
        }
        let scene = s.scene
        #expect(scene.stacks == 7)
        #expect(scene.multiplier == "1.70x")
        #expect(scene.stackCap == 10)
        #expect(scene.freezeTotal == 2)
        #expect(scene.freezeHeld == 1)
        #expect(scene.level == "P4")
        #expect(scene.tierName == "Trash Pull")
        #expect(scene.answers.count == 4)
        #expect(scene.damage == PatchwerkSession.grouped(s.runState?.damage ?? -1))
        // Grouping is the session's job, not the design's, and it is grouped in
        // en_US_POSIX so a locale cannot turn 1,240 into 1.240 mid-fight.
        #expect(PatchwerkSession.grouped(1_240) == "1,240")
        #expect(PatchwerkSession.grouped(902) == "902")
    }

    @Test("Abandoning a run submits nothing at all")
    func abandonSubmitsNothing() async {
        let (s, clock, board, _) = Self.make()
        await s.start()
        for i in 1...4 { clock.set(i * 3_000); await s.tick(); await s.answer(choice: 0) }
        await s.abandon()
        #expect(s.phase == .picker)
        #expect(s.record == nil)
        let rows = try? await board.top(s.bucket(tier: "short"), limit: 20)
        #expect(rows?.isEmpty == true, "an abandoned run reached the board")
    }

    @Test("Two runs at different tiers never share a board")
    func tiersAreSeparateBoards() async {
        let (s, clock, board, _) = Self.make(tier: "short")
        await s.start()
        for i in 1...5 { clock.set(i * 3_000); await s.tick(); await s.answer(choice: 0) }
        clock.set(s.tier.durationMs)
        await s.tick()
        #expect(s.phase == .result)

        let shortRows = try? await board.top(s.bucket(tier: "short"), limit: 20)
        let longRows = try? await board.top(s.bucket(tier: "long"), limit: 20)
        #expect(shortRows?.count == 1)
        #expect(longRows?.isEmpty == true, "a 2-minute run appeared on the 5-minute board")
    }

    @Test("A Patchwerk answer is counted and teaches nothing - the fence, through the real store")
    func progressRecorded() async {
        let store = MQProgressStore.inMemory()
        let profile = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let clock = PatchwerkManualClock(0)
        let session = PatchwerkSession(
            source: StubQuestionSource(catalogue: StubQuestionSource.sampleCatalogue(),
                                       questions: Self.questions()),
            leaderboard: LocalLeaderboard(
                url: URL(fileURLWithPath: NSTemporaryDirectory())
                    .appendingPathComponent("mqi-\(UUID().uuidString).json")),
            progress: store,
            player: .init(profile: profile, name: "Charlotte",
                          cast: .unicorn, level: "P4"),
            clock: clock, config: .mirrored, rngSeed: 1, today: { "2026-09-07" })
        session.choose(tier: "short")
        await session.start()
        let progressSession = session.progressSessionID
        #expect(progressSession != nil, "the run opened no progress session at all")
        for i in 1...6 { clock.set(i * 3_000); await session.tick(); await session.answer(choice: 0) }

        // THE FENCE (Progress Refutation W3, ruled at integration and now the wording in
        // ios/PHASE1.md section 3). Six Patchwerk answers are COUNTED - the session tally
        // and the in-session streak move - and they teach NOTHING: no mastery, no pool,
        // no scaffold, and not even a skill row. This test used to assert the opposite
        // (`mastery.isEmpty == false`) against the lane's stand-in store, which had no
        // fence in it; the real store's `record()` is fenced on `Attempt.mode`, and the
        // mode is `.patchwerk` because PatchwerkSession now says so explicitly.
        let mastery = await store.mastery(profile: profile)
        #expect(mastery.isEmpty, "a Patchwerk answer bought teaching state")
        #expect(await store.skillProgress(profile: profile).isEmpty,
                "a Patchwerk answer created a skill row")

        // Counted, though: the streak is play state and play state is allowed to move.
        if let progressSession {
            #expect(await store.streak(session: progressSession) == 6)
        }

        clock.set(session.tier.durationMs)
        await session.tick()
        // The session's streak dies with the session; nothing spans runs.
        if let progressSession {
            #expect(await store.streak(session: progressSession) == 0)
        }
    }

    @Test("A profile with no unlocked topics is refused before a clock starts")
    func noTopicsIsRefused() async {
        let clock = PatchwerkManualClock(0)
        let s = PatchwerkSession(
            source: StubQuestionSource(catalogue: StubQuestionSource.sampleCatalogue(level: "P4"),
                                       questions: Self.questions()),
            leaderboard: LocalLeaderboard(
                url: URL(fileURLWithPath: NSTemporaryDirectory())
                    .appendingPathComponent("mqi-\(UUID().uuidString).json")),
            progress: MQProgressStore.inMemory(),
            player: .init(profile: ProfileID("ben"), name: "Ben", cast: .turtle, level: "P6"),
            clock: clock, rngSeed: 1, today: { "2026-09-07" })
        await s.start()
        #expect(s.phase == .picker, "a run started with nothing to ask")
        #expect(s.failure != nil)
    }
}
