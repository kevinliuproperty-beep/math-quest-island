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

    @Test("The battle reports the crystal; the store bounds it and does nothing more")
    func crystalIsReportedAndBounded() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        var earned = 0

        // A correct answer that felled no monster awards nothing.
        var d = await store.answer(s, p, "peri", correct: true, crystals: 0)
        #expect(d.crystalsAwarded == 0)
        #expect(d.crystalsEarned == 0)          // the contract's spelling of the same number

        // A correct answer that felled one awards one.
        d = await store.answer(s, p, "peri", correct: true, crystals: 1)
        #expect(d.crystalsAwarded == 1); earned += d.crystalsAwarded

        // A battle claiming three for ONE answer gets one: the web's `monsterDown` resets
        // `S.mHp` to the next monster's full HP, so overkill never carries.
        d = await store.answer(s, p, "peri", correct: true, crystals: 3)
        #expect(d.crystalsAwarded == 1); earned += d.crystalsAwarded

        // A WRONG answer claiming a crystal gets nothing. On the web a wrong answer is a
        // monster counterattack; it can never be a kill.
        d = await store.answer(s, p, "peri", correct: false, crystals: 1)
        #expect(d.crystalsAwarded == 0)

        // Nonsense is clamped, not trusted.
        d = await store.answer(s, p, "peri", correct: true, crystals: -5)
        #expect(d.crystalsAwarded == 0)

        // The chain is six long, exactly as it is on the web.
        for _ in 0..<20 { earned += (await store.answer(s, p, "peri", correct: true, crystals: 1)).crystalsAwarded }
        #expect(earned == 6)
        let summary = await store.endSession(s)
        #expect(summary.crystalsEarned == 6)
        #expect(await store.profiles().first?.crystals == 6)
    }

    @Test("The wrong ones are classified by the ENGINE's reason, never re-derived")
    func wrongReasonComesFromTheEngine() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)

        // THIS BUILD's engine emits one string, `"wrong value or unit"`, for both halves.
        // Three answers that a suffix-match derivation would have split three different
        // ways all land in the same honest bucket, because the engine did not split them:
        //   "113 cm" against "113 cm2"   - the old code said wrongUnit
        //   "100 cm2" against "113 cm2"  - the old code said wrongValue
        //   "27 s" against "27 stickers" - the old code said wrongVALUE, and the engine
        //                                  (post-sweep) says wrong-UNIT. The suffix eats it.
        await store.answer(s, p, "area", correct: false,
                           verdict: Fixtures.typedWrong("113 cm", unit: "cm", expected: "113 cm2",
                                                        value: 113))
        await store.answer(s, p, "area", correct: false,
                           verdict: Fixtures.typedWrong("100 cm2", unit: "cm2", expected: "113 cm2",
                                                        value: 100))
        await store.answer(s, p, "count", correct: false,
                           verdict: Fixtures.typedWrong("27 s", unit: "s", expected: "27 stickers",
                                                        value: 27))
        await store.answer(s, p, "peri", correct: false)                       // wrong option
        await store.answer(s, p, "peri", correct: false, verdict: Fixtures.typedEmpty())
        await store.answer(s, p, "peri", correct: false, timedOut: true)

        let summary = await store.endSession(s)
        #expect(summary.wrongCounts[.wrongValueOrUnit] == 3)
        #expect(summary.wrongUnitCount == 0)       // the engine has not split them yet
        #expect(summary.wrongValueCount == 0)      // and this module will not guess
        #expect(summary.wrongCounts[.wrongOption] == 1)
        #expect(summary.wrongCounts[.empty] == 1)
        #expect(summary.wrongCounts[.timedOut] == 1)
        #expect(summary.total == 6)
        #expect(summary.correct == 0)
    }

    @Test("The day the engine splits the reason, the counts split with it - no code change")
    func splitReasonIsHonoured() async {
        // The `feat/unit-sweep` shape, ahead of the merge. `Verdict.Reason` is already in
        // MQContent on this branch, in the sweep's exact shape, so this is the behaviour
        // the merge produces and not a prediction of it.
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)

        // The two cases the old suffix derivation got wrong, now taken from the engine.
        await store.answer(s, p, "count", correct: false,
                           verdict: Fixtures.typedSplit("27 s", unit: "s", expected: "27 stickers",
                                                        value: 27, reason: .wrongUnit))
        await store.answer(s, p, "money", correct: false,
                           verdict: Fixtures.typedSplit("11.35 $", unit: "$", expected: "$4.35",
                                                        value: 11.35, reason: .wrongValue))
        // And the four the engine already names.
        await store.answer(s, p, "peri", correct: false,
                           verdict: Fixtures.typedSplit("x", unit: "", expected: "46 cm",
                                                        value: nil, reason: .notANumber))
        await store.answer(s, p, "peri", correct: false,
                           verdict: Fixtures.typedSplit("", unit: "", expected: "46 cm",
                                                        value: nil, reason: .empty))
        await store.answer(s, p, "peri", correct: false,
                           verdict: Fixtures.typedSplit("", unit: "", expected: "46 cm",
                                                        value: nil, reason: .noAnswer))
        await store.answer(s, p, "peri", correct: false,
                           verdict: Fixtures.typedSplit("", unit: "", expected: "46 cm",
                                                        value: nil, reason: .noSuchChoice))
        // A word the enum has never heard of stays legal and is counted, never guessed at.
        await store.answer(s, p, "peri", correct: false,
                           verdict: Fixtures.typedSplit("?", unit: "", expected: "46 cm",
                                                        value: nil, reason: .other("quantum flux")))

        let summary = await store.endSession(s)
        #expect(summary.wrongUnitCount == 1)
        #expect(summary.wrongValueCount == 1)
        #expect(summary.wrongCounts[.notANumber] == 1)
        #expect(summary.wrongCounts[.empty] == 2)        // "empty" and "no answer given"
        #expect(summary.wrongCounts[.wrongOption] == 1)  // "no such choice"
        #expect(summary.wrongCounts[.unknown] == 1)
        #expect(summary.wrongCounts[.wrongValueOrUnit] == nil)
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

    @Test("A Patchwerk ANSWER buys no mastery, no pool and no fade")
    func patchwerkAnswersTouchNoTeachingState() async {
        // THE TEST THAT USED TO BE A TAUTOLOGY. It called `recordPatchwerkRun`, which
        // appends to `profiles[p].patchwerk` and touches no skill state on any code path,
        // so its `mastery == 0` assertion could not have failed - and meanwhile 12 real
        // answers on a `.patchwerk` session took mastery to 1.0, the pool 1 -> 3 and the
        // scaffold full -> NONE (Progress Refutation W3, 2026-09-07).
        //
        // It now drives `record()`, which is the only thing that could ever have broken
        // the claim, with far more than enough correct answers to move all three.
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .patchwerk)

        for _ in 0..<30 {
            // Patchwerk fights a training dummy, not the crystal chain, so it reports no
            // crystal - `js/app.js` sets `S.mi = MONSTERS.length-1` for a Patchwerk run
            // and never calls monsterDown.
            let d = await store.answer(s, p, "peri", correct: true, crystals: 0)
            #expect(!d.touchedTeachingState)
            #expect(d.masteryAfter == 0)
            #expect(d.poolBefore == 1 && d.poolAfter == 1)
            #expect(d.scaffold == .full)
        }

        // Nothing on the teaching side moved, and the skill row was never even created.
        #expect(await store.mastery(profile: p, skill: SkillID("peri")) == 0)
        #expect(await store.poolLevel(profile: p, skill: SkillID("peri")) == 1)
        #expect(await store.scaffold(profile: p, skill: SkillID("peri")) == .full)
        #expect(await store.skillProgress(profile: p, skill: SkillID("peri")).isMastered == false)
        #expect(await store.mastery(profile: p).isEmpty)
        #expect(await store.node(profile: p, topicID: "geometry",
                                 skills: [SkillID("peri")], isLive: true).state == .open)

        // PLAY state, meanwhile, is fully alive: Kevin's ruling is that a play mode may
        // keep a streak, not that a play mode is inert.
        #expect(await store.streak(session: s) == 30)
        let summary = await store.endSession(s)
        #expect(summary.correct == 30)
        #expect(summary.bestStreak == 30)
        #expect(summary.crystalsEarned == 0)
    }

    @Test("The fence follows the ATTEMPT's mode even with no session open")
    func patchwerkFenceWithoutASession() async {
        // A mode that forgot to open a session must not have its answers silently
        // graded as Quest. Quest is still the default - losing a child's learning is the
        // worse failure - but an attempt that SAYS patchwerk is honoured.
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        for _ in 0..<12 {
            await store.answer(SessionID("never-opened"), p, "peri", correct: true, mode: .patchwerk)
        }
        #expect(await store.mastery(profile: p, skill: SkillID("peri")) == 0)
        // And the Quest default still writes.
        for _ in 0..<12 { await store.answer(SessionID("never-opened"), p, "area", correct: true) }
        #expect(await store.mastery(profile: p, skill: SkillID("area")) == 1)
    }

    @Test("A Patchwerk RUN record buys no mastery either")
    func patchwerkRunIsPlayState() async {
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
