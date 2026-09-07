import Testing
import Foundation
@testable import MQProgress

/// The pool climb, graded against the WEB.
///
/// `tools/fixtures/pool-climb-500.json` is recorded by `tools/fixtures/gen-pool-climb.mjs`,
/// which restates the rule from `js/app.js` (`resolve()` + `markWrong()`) and REFUSES to
/// emit a fixture unless it finds those four lines verbatim in `js/app.js`. So this suite
/// is not grading Swift against another piece of Swift: change the web's climb and the
/// generator goes red; change the Swift port and this goes red.
@Suite("The mastery climb matches the web")
struct MasteryClimbTests {

    struct Corpus: Decodable {
        struct Expect: Decodable {
            let level: Int
            let rightRow: Int
            let wrongRow: Int
            let maxLevel: Int
            let bestStreak: Int
            let correct: Int
        }
        struct History: Decodable {
            let name: String?
            let events: String
            let expect: Expect
        }
        let source: String
        let pinnedLines: [String]
        let count: Int
        let histories: [History]
    }

    static func loadCorpus() throws -> Corpus {
        let url = Fixtures.fixturesDirectory.appendingPathComponent("pool-climb-500.json")
        guard FileManager.default.fileExists(atPath: url.path) else {
            Issue.record("""
                missing \(url.path)
                Regenerate it:  node tools/fixtures/gen-pool-climb.mjs 500
                """)
            throw CocoaError(.fileNoSuchFile)
        }
        return try JSONDecoder().decode(Corpus.self, from: Data(contentsOf: url))
    }

    @Test("Every recorded history lands on the same pool, counters and best streak")
    func corpusMatches() throws {
        let corpus = try Self.loadCorpus()
        #expect(corpus.histories.count >= 500)
        #expect(corpus.pinnedLines.count == 4)

        var checked = 0
        for history in corpus.histories {
            var skill = SkillState()
            var streak = 0, best = 0
            for event in history.events {
                let wasCorrect = (event == "c")
                skill.applyClimb(correct: wasCorrect)
                if wasCorrect { streak += 1; best = max(best, streak) } else { streak = 0 }
            }
            let label = history.name ?? history.events
            #expect(skill.pool == history.expect.level, "pool: \(label)")
            #expect(skill.rightRow == history.expect.rightRow, "rightRow: \(label)")
            #expect(skill.wrongRow == history.expect.wrongRow, "wrongRow: \(label)")
            #expect(skill.bestPool == history.expect.maxLevel, "bestPool: \(label)")
            #expect(skill.correct == history.expect.correct, "correct: \(label)")
            #expect(best == history.expect.bestStreak, "bestStreak: \(label)")
            #expect(skill.attempts == history.events.count, "attempts: \(label)")
            checked += 1
        }
        #expect(checked == corpus.histories.count)
    }

    @Test("The corpus is not degenerate: it reaches every pool and every direction")
    func corpusExercisesTheRule() throws {
        let corpus = try Self.loadCorpus()
        var reached = Set<Int>()
        var demotions = 0
        for history in corpus.histories {
            var skill = SkillState()
            for event in history.events {
                let before = skill.pool
                skill.applyClimb(correct: event == "c")
                reached.insert(skill.pool)
                if skill.pool < before { demotions += 1 }
            }
        }
        #expect(reached == [1, 2, 3], "the corpus never visited every pool: \(reached.sorted())")
        #expect(demotions > 50, "only \(demotions) demotions - the two-wrong rule is barely covered")
    }

    @Test("Three right climbs, two wrong drop, and the ends hold", arguments: [
        ("ccc", 2), ("cc", 1), ("cccccc", 3), ("ccccccccc", 3),
        ("cccw", 2), ("cccww", 1), ("cccwcw", 2), ("wwwwww", 1), ("ccccccwwww", 1)
    ])
    func namedEdges(_ events: String, _ expected: Int) {
        var skill = SkillState()
        for event in events { skill.applyClimb(correct: event == "c") }
        #expect(skill.pool == expected)
    }

    @Test("At the cap the correct-run counter keeps counting and is NOT reset")
    func capDoesNotResetTheCounter() {
        // The web's guard is `rightRow >= 3 && level < 3`, so at level 3 the counter runs
        // free. A port that resets it at the cap takes one extra correct answer to climb
        // back after a demotion, forever.
        var skill = SkillState()
        for _ in 0..<9 { skill.applyClimb(correct: true) }
        #expect(skill.pool == 3)
        #expect(skill.rightRow == 3)
    }

    @Test("At the floor the wrong-run counter keeps counting and is NOT reset")
    func floorDoesNotResetTheCounter() {
        var skill = SkillState()
        for _ in 0..<5 { skill.applyClimb(correct: false) }
        #expect(skill.pool == 1)
        #expect(skill.wrongRow == 5)
    }

    @Test("The store's pool is the same climb the model runs")
    func storeMatchesTheModel() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        let events = "ccwcccwwcccccw"
        var model = SkillState()
        for event in events {
            let correct = event == "c"
            model.applyClimb(correct: correct)
            let delta = await store.answer(s, p, "perimeter", correct: correct)
            #expect(delta.poolAfter == model.pool)
        }
        #expect(await store.poolLevel(profile: p, skill: SkillID("perimeter")) == model.pool)
    }

    @Test("Mastery is the web's parent-report accuracy, and nothing else")
    func masteryIsAccuracy() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        // 8 right, 2 wrong -> the web's parent screen prints 80%.
        for i in 0..<10 { await store.answer(s, p, "area", correct: i >= 2) }
        #expect(abs(await store.mastery(profile: p, skill: SkillID("area")) - 0.8) < 1e-9)
        #expect(await store.mastery(profile: p, skill: SkillID("never-played")) == 0)
    }

    @Test("Mastery under the web's evidence floor is flagged provisional")
    func provisionalUnderFourAttempts() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<3 { await store.answer(s, p, "area", correct: true) }
        var progress = await store.skillProgress(profile: p, skill: SkillID("area"))
        #expect(progress.mastery == 1.0)
        #expect(progress.isProvisional)
        #expect(!progress.isMastered)      // 3 of 3 is not evidence
        await store.answer(s, p, "area", correct: true)
        progress = await store.skillProgress(profile: p, skill: SkillID("area"))
        #expect(!progress.isProvisional)
        #expect(progress.isMastered)
    }

    @Test("The LOAD-TIME ceiling is the fewest ladder steps the record can force")
    func scaffoldCeilingIsTheMinimumForced() {
        // On an UNBROKEN run the ceiling is exactly the live ladder - a clean history
        // round-trips through a save/load untouched.
        var skill = SkillState()
        #expect(skill.scaffoldCeiling == .full)
        for _ in 0..<6 { skill.applyClimb(correct: true) }
        #expect(skill.scaffoldCeiling == .full)                 // six is not yet a step
        skill.applyClimb(correct: true)
        #expect(skill.scaffoldCeiling == .partial)              // seven is
        for _ in 0..<14 { skill.applyClimb(correct: true) }     // 21 straight
        #expect(skill.scaffoldCeiling == .none)

        // With wrong answers in it the ceiling is CONSERVATIVE: it asks how few steps
        // this history could possibly have produced, never how many it probably did.
        // 9 right and 1 wrong could be 4 then 5 - no step at all - so it clamps nothing.
        var mixed = SkillState()
        for _ in 0..<9 { mixed.applyClimb(correct: true) }
        mixed.applyClimb(correct: false)
        #expect(mixed.scaffoldCeiling == .full)
        #expect(mixed.isMastered)                               // and mastery is irrelevant to it
    }

    @Test("The ceiling never fades faster than the ladder actually did", arguments: [
        "ccccccc", "ccccccccccccccccccccc", "ccccwccccwcccc", "wwwwwwww",
        "cccccccwcccccccwccccccc", "cccccccccccccccccccccccccccccc"
    ])
    func ceilingNeverOverFades(_ events: String) {
        // The property that makes it safe to apply on EVERY open: if the ceiling could
        // out-fade the live ladder, every save/load cycle would quietly re-impose the
        // old fast fade this pass exists to remove.
        var skill = SkillState()
        for e in events {
            skill.applyClimb(correct: e == "c")
            skill.applyFadeLadder(correct: e == "c")
        }
        #expect(skill.scaffoldCeiling >= skill.scaffold,
                "ceiling \(skill.scaffoldCeiling) < held \(skill.scaffold) for \(events)")
    }

    @Test("The ladder is one step per 7 straight, never up, and a wrong answer resets it")
    func fadeLadder() {
        var skill = SkillState()
        for _ in 0..<6 { skill.applyFadeLadder(correct: true) }
        #expect(skill.scaffold == .full)
        #expect(skill.applyFadeLadder(correct: true) == .partial)   // 7
        for _ in 0..<6 { skill.applyFadeLadder(correct: true) }     // 13
        #expect(skill.scaffold == .partial)
        skill.applyFadeLadder(correct: false)                       // the run resets at 6
        for _ in 0..<6 { skill.applyFadeLadder(correct: true) }
        #expect(skill.scaffold == .partial, "a wrong answer must reset the run")
        skill.applyFadeLadder(correct: true)
        #expect(skill.scaffold == .hint)
        for _ in 0..<7 { skill.applyFadeLadder(correct: true) }
        #expect(skill.scaffold == .none)
        // And it stops there. Nothing below `none`, and 700 more correct answers change
        // nothing at all.
        for _ in 0..<700 { skill.applyFadeLadder(correct: true) }
        #expect(skill.scaffold == .none)
    }

    @Test("The ladder is documented at the number it was chosen at")
    func ladderParameter() {
        // MARKED FOR KEVIN'S EYE. Simulated over 400 children a band of 17-item sessions,
        // `none` first arrives at a median session of 14 / 6 / 3 / 2 / 2 at 60 / 70 / 80
        // / 90 / 100% accuracy, and ZERO of 400 reach it in their first sitting at any
        // accuracy. The old rule reached `none` in the first session 293 times out of 400
        // at 80% (Progress Refutation W9).
        #expect(MQRule.fadeAfterConsecutiveCorrect == 7)
        // Three steps, and a session is 17 items: even a child who never misses cannot
        // take all three in one sitting.
        #expect(MQRule.fadeAfterConsecutiveCorrect * 3 > 17)
    }
}
