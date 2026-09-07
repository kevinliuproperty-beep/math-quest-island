import Testing
import Foundation
import MQContent
@testable import MQProgress

/// **The crystal, and what makes an island Cleared** - both graded against 200 sessions
/// of the REAL web game.
///
/// `tools/fixtures/web-crystals-200.json` is recorded by
/// `tools/fixtures/gen-web-crystals.mjs`, which serves the repo, drives `index.html` in
/// headless Chrome through the app's own `answer()` / `answerTyped()`, and records the
/// crystal EVERY ANSWER awarded along with the state behind it. The generator refuses to
/// emit a fixture unless it finds the seven lines that ARE the battle rule verbatim in
/// `js/app.js`, so this suite is not grading Swift against another piece of Swift:
/// change the web's battle and the generator goes red naming the missing line.
///
/// Why it exists: MQProgress used to RE-DERIVE the crystal (one every third answer of an
/// unbroken run), which awarded 2.55 a session where the web awards 5.38 and filled the
/// six-crystal rope **0 times in 200** where the web fills it 154 (Progress Refutation
/// W1). The store no longer derives it - the battle reports it and the store bounds it.
@Suite("Crystals and Cleared, graded against 200 real web sessions")
struct WebCrystalTests {

    struct Corpus: Decodable {
        struct Row: Decodable {
            /// 1 when the child answered correctly.
            let c: Int
            /// Crystals THIS answer awarded, straight off the web's own `S.mi`.
            let x: Int
        }
        struct Run: Decodable {
            let topic: String
            let acc: Double
            let events: String
            let rows: [Row]
            let crystals: Int
            let won: Bool
            let items: Int
        }
        struct Expect: Decodable {
            let meanCrystals: Double
            let ropeFilled: Int
            let maxCrystalsPerAnswer: Int
            let meanItems: Double
            let webVictories: Int
            let masteryCleared: [String: Int]
        }
        let method: String
        let pinnedLines: [String]
        let sessions: Int
        let expect: Expect
        let runs: [Run]
    }

    static func loadCorpus() throws -> Corpus {
        let url = Fixtures.fixturesDirectory.appendingPathComponent("web-crystals-200.json")
        guard FileManager.default.fileExists(atPath: url.path) else {
            Issue.record("""
                missing \(url.path)
                Regenerate it:  node tools/fixtures/gen-web-crystals.mjs 200
                """)
            throw CocoaError(.fileNoSuchFile)
        }
        return try JSONDecoder().decode(Corpus.self, from: Data(contentsOf: url))
    }

    @Test("The corpus is 200 real sessions and is not degenerate")
    func corpusShape() throws {
        let c = try Self.loadCorpus()
        #expect(c.sessions == 200)
        #expect(c.runs.count == 200)
        #expect(c.pinnedLines.count == 7)
        // One answer can fell exactly one monster: `monsterDown` resets `S.mHp` to the
        // next monster's FULL hp, so overkill never carries. This is MEASURED off the
        // real app, not assumed - it is the reason the store's per-answer cap is 1.
        #expect(c.expect.maxCrystalsPerAnswer == MQRule.crystalsPerAnswer)
        // Every crystal in every run is accounted for answer by answer.
        for run in c.runs {
            #expect(run.rows.reduce(0) { $0 + $1.x } == run.crystals, "run on \(run.topic)")
            #expect(run.rows.count == run.events.count)
            #expect(run.crystals <= MQRule.crystalsPerSession)
            // A wrong answer never awards a crystal on the web either.
            #expect(run.rows.allSatisfy { $0.c == 1 || $0.x == 0 })
        }
        // A corpus where nobody ever won, or everybody did, would prove nothing.
        #expect(c.expect.ropeFilled > 100 && c.expect.ropeFilled < 200)
        #expect(c.expect.meanItems > 10 && c.expect.meanItems < 30)
    }

    @Test("Replayed through the store, every session lands on the web's own crystal count")
    func crystalsMatchTheWeb() async throws {
        let c = try Self.loadCorpus()
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")

        var total = 0, filled = 0, divergences = 0
        for run in c.runs {
            let s = await store.beginSession(profile: p, mode: .quest, topic: run.topic)
            for row in run.rows {
                await store.answer(s, p, "skill-" + run.topic, correct: row.c == 1,
                                   crystals: row.x, topic: run.topic)
            }
            let summary = await store.endSession(s)
            if summary.crystalsEarned != run.crystals { divergences += 1 }
            total += summary.crystalsEarned
            if summary.crystalsEarned >= MQRule.crystalsPerSession { filled += 1 }
        }

        #expect(divergences == 0, "\(divergences) of 200 sessions disagreed with the web")
        #expect(filled == c.expect.ropeFilled)
        let mean = Double(total) / Double(c.runs.count)
        #expect(abs(mean - c.expect.meanCrystals) < 1e-9)
        // The number the refuter's re-derivation could never reach: the rope actually
        // fills. It filled 0 times in 200 before this fix.
        #expect(filled > 0)
    }

    @Test("A mode cannot inflate the web's number, only fail to report it")
    func aModeCannotInflateIt() async throws {
        let c = try Self.loadCorpus()
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Cheater", cast: .crab, level: "P4")
        // The same 200 sessions, with a mode that claims a crystal on EVERY answer.
        var overCap = 0
        for run in c.runs {
            let s = await store.beginSession(profile: p, mode: .quest, topic: run.topic)
            for row in run.rows {
                await store.answer(s, p, "skill", correct: row.c == 1, crystals: 99, topic: run.topic)
            }
            let summary = await store.endSession(s)
            if summary.crystalsEarned > MQRule.crystalsPerSession { overCap += 1 }
        }
        #expect(overCap == 0)
    }

    // MARK: - Design call 2: what makes a node Cleared

    /// Replay the corpus into a store under one policy and count the nodes that read
    /// Cleared. Items are dealt ROUND ROBIN across the node's skills - the refuter's own
    /// model, and the shape a real node with 2 to 7 skills actually produces.
    static func clearedCount(policy: NodeClearedPolicy, skills n: Int,
                             corpus: Corpus) async -> (cleared: Int, mastered: Int) {
        let skillIDs = (0..<n).map { "s\($0)" }
        var cleared = 0, mastered = 0
        for (i, run) in corpus.runs.enumerated() {
            // One fresh profile per run: each run is one child's first evening on one node.
            let store = MQProgressStore.inMemory(cleared: policy)
            let p = await store.addProfile(name: "Child \(i)", cast: .unicorn, level: "P4")
            let s = await store.beginSession(profile: p, mode: .quest, topic: "node")
            for (k, row) in run.rows.enumerated() {
                await store.answer(s, p, skillIDs[k % n], correct: row.c == 1,
                                   crystals: row.x, topic: "node")
            }
            _ = await store.endSession(s)
            let node = await store.node(profile: p, topicID: "node",
                                        skills: skillIDs.map(SkillID.init), isLive: true)
            if node.state == .cleared { cleared += 1 }
            if node.mastered { mastered += 1 }
        }
        return (cleared, mastered)
    }

    @Test(".webVictory reproduces the web's own Cleared count, at every node size",
          arguments: [2, 3, 4, 7])
    func webVictoryMatchesTheWeb(_ skills: Int) async throws {
        let c = try Self.loadCorpus()
        let r = await Self.clearedCount(policy: .webVictory, skills: skills, corpus: c)
        // The web's answer does not depend on how many skills the node happens to hold -
        // it is a statement about the RUN. That is the whole difference between the two
        // policies, and it is why a 7-skill node stopped reading *Ready* after a victory.
        #expect(r.cleared == c.expect.webVictories)
    }

    @Test(".mastery reproduces the refuter's numbers, and they are much smaller",
          arguments: [2, 3, 4, 7])
    func masteryMatchesTheRefuter(_ skills: Int) async throws {
        let c = try Self.loadCorpus()
        let expected = try #require(c.expect.masteryCleared["\(skills)"])
        let r = await Self.clearedCount(policy: .mastery, skills: skills, corpus: c)
        #expect(r.cleared == expected)
        #expect(r.cleared == r.mastered)          // under .mastery the two are one statement
        #expect(r.cleared <= c.expect.webVictories)
        // The wound, as a gate: on a node with four or more skills, ONE run is never
        // enough, and the map said Ready where the end screen said VICTORY.
        if skills >= 4 { #expect(r.cleared == 0) }
    }

    @Test(".both keeps the web's badge and the mastery answer beside it, unmixed",
          arguments: [2, 3])
    func bothKeepsTwoAnswers(_ skills: Int) async throws {
        let c = try Self.loadCorpus()
        let expected = try #require(c.expect.masteryCleared["\(skills)"])
        let r = await Self.clearedCount(policy: .both, skills: skills, corpus: c)
        #expect(r.cleared == c.expect.webVictories)   // the BADGE is the web's
        #expect(r.mastered == expected)               // the FLAG is the honest one
        #expect(r.mastered < r.cleared)               // and they are not the same statement
    }

    @Test("The default policy is the web's, per Kevin's Q87 ruling of 2026-09-07")
    func defaultIsWebVictory() async {
        let store = MQProgressStore.inMemory()
        #expect(await store.clearedPolicy == .webVictory)
        #expect(NodeClearedPolicy.allCases.count == 3)
    }

    @Test("Under .webVictory a node is Cleared only once a run on THAT node filled the rope")
    func webVictoryNeedsThatNode() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let skills = [SkillID("peri"), SkillID("area")]

        // Six crystals, but on a DIFFERENT island.
        let elsewhere = await store.beginSession(profile: p, mode: .quest, topic: "fractions")
        for _ in 0..<6 { await store.answer(elsewhere, p, "peri", correct: true, crystals: 1, topic: "fractions") }
        _ = await store.endSession(elsewhere)
        var node = await store.node(profile: p, topicID: "geometry", skills: skills, isLive: true)
        #expect(node.state != .cleared)
        #expect(!node.wonARun)

        // Five crystals on this one is not a victory either: the sixth is `endGame(true)`.
        var s = await store.beginSession(profile: p, mode: .quest, topic: "geometry")
        for _ in 0..<5 { await store.answer(s, p, "peri", correct: true, crystals: 1, topic: "geometry") }
        _ = await store.endSession(s)
        node = await store.node(profile: p, topicID: "geometry", skills: skills, isLive: true)
        #expect(node.state == .inProgress(collected: 1, total: 2))
        #expect(!node.wonARun)

        // The sixth crystal on this island clears it.
        s = await store.beginSession(profile: p, mode: .quest, topic: "geometry")
        for _ in 0..<6 { await store.answer(s, p, "area", correct: true, crystals: 1, topic: "geometry") }
        _ = await store.endSession(s)
        node = await store.node(profile: p, topicID: "geometry", skills: skills, isLive: true)
        #expect(node.state == .cleared)
        #expect(node.wonARun)
        // And a locked node stays locked whatever a child won on it.
        #expect(await store.node(profile: p, topicID: "geometry", skills: skills,
                                 isLive: false).state == .comingSoon)
    }
}
