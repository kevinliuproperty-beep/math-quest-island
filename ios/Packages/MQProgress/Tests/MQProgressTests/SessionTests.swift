import Testing
import Foundation
import MQContent
@testable import MQProgress

/// Sessions, streaks, crystals and the wrong-answer split the result screen renders.
@Suite("Sessions summarise what happened and nothing else")
struct SessionTests {

    @Test("The streak counts within a session and never across one")
    func streakIsInSessionOnly() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let first = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<4 { await store.answer(first, p, "peri", correct: true) }
        #expect(await store.streak(session: first) == 4)
        await store.answer(first, p, "peri", correct: false)
        #expect(await store.streak(session: first) == 0)

        for _ in 0..<3 { await store.answer(first, p, "peri", correct: true) }
        let summary = await store.endSession(first)
        #expect(summary.bestStreak == 4)

        let second = await store.beginSession(profile: p, mode: .quest)
        #expect(await store.streak(session: second) == 0)
        #expect(await store.streak(session: first) == 0)   // ended: nothing to carry
    }

    @Test("Patchwerk keeps a streak the same way Quest does")
    func patchwerkKeepsAStreak() async {
        // Kevin's ruling: play modes may keep streaks; teaching scaffolds fade. Both
        // modes therefore go through the SAME streak code - a second implementation is
        // where "damage bought me a scaffold" gets in.
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .patchwerk)
        for _ in 0..<5 { await store.answer(s, p, "peri", correct: true) }
        #expect(await store.streak(session: s) == 5)
        let summary = await store.endSession(s)
        #expect(summary.mode == .patchwerk)
        #expect(summary.bestStreak == 5)
    }

    @Test("endSession is idempotent")
    func endSessionIsIdempotent() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<6 { await store.answer(s, p, "peri", correct: true) }
        let a = await store.endSession(s)
        let b = await store.endSession(s)
        #expect(a == b)
        #expect(await store.sessions(profile: p).count == 1)   // it started nothing
    }

    @Test("A crystal every third answer of an unbroken run, six to a session")
    func crystalRule() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        var earned = 0
        for i in 1...9 { earned += (await store.answer(s, p, "peri", correct: true)).crystalsEarned
            if i % 3 == 0 { #expect(earned == i / 3) } }
        // A wrong answer breaks the run, so the next crystal is three correct away again.
        await store.answer(s, p, "peri", correct: false)
        for _ in 0..<2 { earned += (await store.answer(s, p, "peri", correct: true)).crystalsEarned }
        #expect(earned == 3)
        earned += (await store.answer(s, p, "peri", correct: true)).crystalsEarned
        #expect(earned == 4)
        // The chain is six long, exactly as it is on the web.
        for _ in 0..<30 { earned += (await store.answer(s, p, "peri", correct: true)).crystalsEarned }
        #expect(earned == 6)
        let summary = await store.endSession(s)
        #expect(summary.crystalsEarned == 6)
        #expect(await store.profiles().first?.crystals == 6)
    }

    @Test("The wrong ones split into unit and value, from the engine's single reason")
    func wrongUnitVersusWrongValue() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)

        // Right number, wrong unit: "113 cm" against a 113 cm2 answer. This is the exact
        // wave-2 kill recorded in js/core.js's header, so it is the one that gets a test.
        await store.answer(s, p, "area", correct: false,
                           verdict: Fixtures.typedWrong("113 cm", unit: "cm", expected: "113 cm2",
                                                        value: 113))
        // Wrong number, right unit.
        await store.answer(s, p, "area", correct: false,
                           verdict: Fixtures.typedWrong("100 cm2", unit: "cm2", expected: "113 cm2",
                                                        value: 100))
        // A bare wrong number: no unit typed at all can never be a unit error.
        await store.answer(s, p, "area", correct: false,
                           verdict: Fixtures.typedWrong("100", unit: "", expected: "113 cm2",
                                                        value: 100))
        await store.answer(s, p, "peri", correct: false)                       // wrong option
        await store.answer(s, p, "peri", correct: false, verdict: Fixtures.typedEmpty())
        await store.answer(s, p, "peri", correct: false, timedOut: true)

        let summary = await store.endSession(s)
        #expect(summary.wrongUnitCount == 1)
        #expect(summary.wrongValueCount == 2)
        #expect(summary.wrongCounts[.wrongOption] == 1)
        #expect(summary.wrongCounts[.empty] == 1)
        #expect(summary.wrongCounts[.timedOut] == 1)
        #expect(summary.total == 6)
        #expect(summary.correct == 0)
    }

    @Test("A timeout is wrong, is counted, and says so")
    func timeoutIsWrong() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        // A verdict can even claim correct: the clock ran out, so it is not.
        let delta = await store.answer(s, p, "peri", correct: true, timedOut: true)
        #expect(delta.wrongReason == .timedOut)
        #expect(await store.mastery(profile: p, skill: SkillID("peri")) == 0)
    }

    @Test("The review list is the wrong ones, deduped, eight of them")
    func reviewList() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for i in 0..<12 {
            await store.answer(s, p, "peri", correct: false, item: Fixtures.review(i % 5))
        }
        let summary = await store.endSession(s)
        #expect(summary.worthAnotherLook.count == 5)          // deduped by stem
        #expect(summary.worthAnotherLook.first?.answer == "0 cm")
        // Nothing in the summary asks the child to come back.
        #expect(summary.total == 12)
    }

    @Test("More than eight distinct wrong items still shows eight")
    func reviewListCapsAtEight() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for i in 0..<20 { await store.answer(s, p, "peri", correct: false, item: Fixtures.review(i)) }
        let summary = await store.endSession(s)
        #expect(summary.worthAnotherLook.count == 8)
    }

    @Test("Time on items is the sum of what the child spent, not the wall clock")
    func timeOnItems() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<4 { await store.answer(s, p, "peri", correct: true, elapsed: 2.5) }
        let summary = await store.endSession(s)
        #expect(abs(summary.timeOnItems - 10) < 1e-9)
        #expect(summary.elapsed >= 0)
    }

    @Test("The summary records the highest pool the session reached")
    func maxPool() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<6 { await store.answer(s, p, "peri", correct: true) }
        for _ in 0..<4 { await store.answer(s, p, "peri", correct: false) }
        let summary = await store.endSession(s)
        #expect(summary.maxPool == 3)
    }

    @Test("An attempt on a session that was never begun still moves mastery")
    func attemptWithoutASession() async {
        // The store must not lose a child's learning because a mode forgot to open a
        // session. The session numbers are what go missing, not the mastery.
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let delta = await store.answer(SessionID("nope"), p, "peri", correct: true)
        #expect(delta.masteryAfter == 1.0)
        #expect(delta.streak == 0)
        #expect(await store.mastery(profile: p, skill: SkillID("peri")) == 1.0)
    }

    @Test("Session history is capped the way the web caps it")
    func sessionsCapAtSixty() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        for _ in 0..<65 {
            let s = await store.beginSession(profile: p, mode: .quest)
            await store.answer(s, p, "peri", correct: true)
            _ = await store.endSession(s)
        }
        #expect(await store.sessions(profile: p).count == MQRule.sessionsKept)
    }

    @Test("Patchwerk runs are ranked by damage, filtered, and capped")
    func patchwerkRuns() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        for i in 1...65 {
            await store.recordPatchwerkRun(
                PatchwerkRun(tier: i % 2 == 0 ? "short" : "normal", level: "P4",
                             damage: i * 10, bestStacks: i, freezesUsed: 1,
                             correct: i, wrong: 1, duration: 180),
                profile: p)
        }
        let all = await store.patchwerkRuns(profile: p)
        #expect(all.count == MQRule.patchwerkRunsKept)
        #expect(all.first?.damage == 650)
        #expect(all == all.sorted { $0.damage > $1.damage })
        let short = await store.patchwerkRuns(profile: p, tier: "short", level: "P4")
        #expect(short.allSatisfy { $0.tier == "short" })
        #expect(await store.patchwerkRuns(profile: p, tier: "long", level: nil).isEmpty)
    }

    @Test("A Patchwerk run buys no mastery and no fade")
    func patchwerkIsPlayState() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        await store.recordPatchwerkRun(
            PatchwerkRun(tier: "long", level: "P4", damage: 999_999, bestStacks: 40,
                         freezesUsed: 0, correct: 300, wrong: 0, duration: 600),
            profile: p)
        #expect(await store.mastery(profile: p, skill: SkillID("peri")) == 0)
        #expect(await store.scaffold(profile: p, skill: SkillID("peri")) == .full)
        #expect(await store.mastery(profile: p).isEmpty)
    }
}
