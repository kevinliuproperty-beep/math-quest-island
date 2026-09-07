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

    @Test("The scaffold target tracks the pool and only lets go at mastery")
    func scaffoldTargetLadder() {
        var skill = SkillState()
        #expect(skill.scaffoldTarget == .full)
        for _ in 0..<3 { skill.applyClimb(correct: true) }        // pool 2
        #expect(skill.scaffoldTarget == .partial)
        for _ in 0..<3 { skill.applyClimb(correct: true) }        // pool 3, 6/6
        #expect(skill.isMastered)
        #expect(skill.scaffoldTarget == .none)
    }
}
