import Testing
import Foundation
import MQContent
import MQProgress
@testable import MQQuest

/// **THE CRYSTAL, END TO END: the web's battle -> `QRunState` -> `Attempt.crystalsReported`
/// -> `MQProgressStore` -> the rope on the result screen.**
///
/// Written on the phase 1 integration, 2026-09-07. MQProgress already grades the STORE
/// against `tools/fixtures/web-crystals-200.json` (`WebCrystalTests`), but it feeds the
/// store the corpus's own `x` column - the crystal the web awarded - so it proves the
/// store bounds a number correctly and proves nothing at all about where that number
/// comes from on iOS. Progress Refutation W1's actual finding was that NOBODY was
/// producing it: the store re-derived a crystal from mastery and awarded 2.55 a session
/// against the web's 5.285, filling the six-crystal rope 0 times in 200.
///
/// The battle is the only thing that can produce it, because the crystal IS
/// `monsterDown()` and a store owns no monster. So this suite drives `QRunState` - the
/// Quest lane's transcription of `js/app.js`'s arithmetic - over the same 200 real web
/// sessions and asserts three things the two separate suites cannot see between them:
///
///  1. **The formula is the web's.** For every correct answer that did NOT fell a
///     monster, the corpus records the monster's HP before and after, so the web's own
///     `ri(0,4)` roll is recoverable: `dmg / (crit ? 2 : 1) - 18 - level*6`. If
///     `QBattleMath.heroDamage` disagreed with `js/app.js` by so much as the crit rule
///     or the level term, the recovered roll would be fractional or outside 0...4.
///  2. **`monsterFell` is the web's crystal**, row for row, over every answer of every
///     session - not in aggregate, where a run that fells the wrong monster on the wrong
///     item still totals six.
///  3. **What the battle reports arrives on the rope.** The same replay is pushed
///     through `MQProgressStore.record` as `Attempt.crystalsReported`, exactly the way
///     `QQuestModel.submit` does it, and every session's `SessionSummary.crystalsEarned`
///     is the web's own count.
@Suite("The crystal the battle reports is the crystal the web awarded")
struct QWebCrystalTests {

    // MARK: The corpus

    struct Corpus: Decodable {
        struct Row: Decodable {
            /// 1 when the child answered correctly.
            let c: Int
            /// Crystals THIS answer awarded, straight off the web's own `S.mi`.
            let x: Int
            /// Level before and after the ladder moved.
            let lb: Int
            let la: Int
            /// The streak AFTER this answer.
            let st: Int
            /// Hero HP after this answer, heal included.
            let hp: Int
            /// Monster HP after this answer. On a felling answer this is the NEXT
            /// monster's full HP, because `monsterDown` resets it.
            let mhp: Int
        }
        struct Run: Decodable {
            let topic: String
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
        }
        let sessions: Int
        let expect: Expect
        let runs: [Run]
    }

    /// `tools/fixtures/` in this checkout, found from this source file rather than from
    /// a bundled copy: one corpus in the repository, and the Swift side cannot be
    /// grading a stale duplicate of it.
    static var fixturesDirectory: URL {
        var url = URL(fileURLWithPath: #filePath)
        // .../ios/Packages/MQQuest/Tests/MQQuestTests/QWebCrystalTests.swift
        for _ in 0..<6 { url.deleteLastPathComponent() }
        return url.appendingPathComponent("tools/fixtures", isDirectory: true)
    }

    static func loadCorpus() throws -> Corpus {
        let url = fixturesDirectory.appendingPathComponent("web-crystals-200.json")
        guard FileManager.default.fileExists(atPath: url.path) else {
            Issue.record("""
                missing \(url.path)
                Regenerate it:  node tools/fixtures/gen-web-crystals.mjs 200
                """)
            throw CocoaError(.fileNoSuchFile)
        }
        return try JSONDecoder().decode(Corpus.self, from: Data(contentsOf: url))
    }

    // MARK: 1 + 2 - the battle

    @Test("QRunState fells a monster exactly where the web awarded a crystal, 200 sessions")
    func theBattleProducesTheWebsCrystal() throws {
        let c = try Self.loadCorpus()
        var rowsChecked = 0
        var rollsRecovered = 0
        var fellRows = 0
        var mismatches: [String] = []

        for run in c.runs {
            var state = QRunState(startLevel: 1)
            for (i, row) in run.rows.enumerated() {
                let correct = row.c == 1
                let mhpBefore = state.monsterHP
                let levelAfter = expectedLevelAfter(state, correct: correct)

                // The roll the web actually used, recovered from its own transcript
                // wherever the transcript still holds it.
                var heroRoll = 0
                if correct {
                    if row.x == 0 {
                        let dmg = mhpBefore - row.mhp
                        let crit = QBattleMath.isCritical(streakAfter: row.st)
                        let base = crit ? Double(dmg) / 2.0 : Double(dmg)
                        let recovered = base - 18 - Double(levelAfter * 6)
                        if recovered < 0 || recovered > 4 || recovered != recovered.rounded() {
                            mismatches.append("\(run.topic)#\(i): roll \(recovered) is not an "
                                + "ri(0,4) - dmg \(dmg), level \(levelAfter), crit \(crit)")
                        } else {
                            rollsRecovered += 1
                        }
                        heroRoll = Int(max(0, min(4, recovered.rounded())))
                    } else {
                        // A felling answer resets `S.mHp`, so the roll is gone. Use the
                        // SMALLEST roll that fells: if even 4 cannot, our damage formula
                        // is weaker than the web's and this row will say so.
                        let crit = QBattleMath.isCritical(streakAfter: row.st)
                        heroRoll = (0...4).first { r in
                            mhpBefore - QBattleMath.heroDamage(level: levelAfter,
                                                               streakAfter: row.st,
                                                               roll: r) <= 0
                        } ?? 4
                    }
                }
                // A wrong answer's counterattack roll, recovered the same way - but ONLY
                // where the transcript still holds it. The web clamps `hp` at 0 on the
                // blow that ends the run, so the knockout row records "took 3" against a
                // base of 16 and recovers a roll of -13. That is the clamp, not a
                // divergence; the run is over on that row either way.
                var monsterRoll = 0
                if !correct {
                    if row.hp > 0 {
                        let taken = state.heroHP - row.hp
                        let recovered = taken - state.monster.damage
                        if recovered < 0 || recovered > 3 {
                            mismatches.append("\(run.topic)#\(i): monster roll \(recovered) is not "
                                + "an ri(0,3) - took \(taken), base \(state.monster.damage)")
                        } else {
                            rollsRecovered += 1
                        }
                        monsterRoll = max(0, min(3, recovered))
                    }
                }

                let r = state.apply(correct: correct, heroRoll: heroRoll, monsterRoll: monsterRoll)
                rowsChecked += 1
                if r.monsterFell { fellRows += 1 }

                // The HP the web recorded, on every row where the web recorded it
                // unclamped. This is what makes the recovered rolls a MEASUREMENT: put
                // the web's own roll in and the web's own HP has to come out.
                if row.hp > 0 && state.heroHP != row.hp {
                    mismatches.append("\(run.topic)#\(i): hero HP \(state.heroHP) vs web \(row.hp)")
                }
                if correct && row.x == 0 && state.monsterHP != row.mhp {
                    mismatches.append("\(run.topic)#\(i): monster HP \(state.monsterHP) "
                        + "vs web \(row.mhp)")
                }

                // THE CLAIM. `monsterFell` is `monsterDown()`, row for row.
                if r.monsterFell != (row.x == 1) {
                    mismatches.append("\(run.topic)#\(i): monsterFell \(r.monsterFell) but the "
                        + "web awarded \(row.x)")
                }
                // The ladder is the web's too, or the recovered rolls above are being
                // recovered against the wrong level.
                if r.levelAfter != row.la {
                    mismatches.append("\(run.topic)#\(i): level \(r.levelAfter) vs web \(row.la)")
                }
                if r.streakAfter != row.st {
                    mismatches.append("\(run.topic)#\(i): streak \(r.streakAfter) vs web \(row.st)")
                }
                if state.clearedTheChain { break }
            }
            if state.crystals != run.crystals {
                mismatches.append("\(run.topic): run crystals \(state.crystals) vs web \(run.crystals)")
            }
        }

        let report = "\(mismatches.count) divergences, first 5: "
            + mismatches.prefix(5).joined(separator: " | ")
        #expect(mismatches.isEmpty, "\(report)")
        // Not a vacuous pass: the corpus has to have actually exercised the thing.
        #expect(rowsChecked > 3_000)
        #expect(rollsRecovered > 2_000)
        #expect(fellRows == c.runs.reduce(0) { $0 + $1.crystals })
    }

    // MARK: 3 - the battle to the rope

    @Test("Reported through Attempt.crystalsReported, every session lands on the web's rope")
    func theReportReachesTheRope() async throws {
        let c = try Self.loadCorpus()
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let correctVerdict = Verdict(correct: true, kind: .typed, questionId: nil,
                                     expectedIndex: -1, expectedText: "", chosenIndex: -1,
                                     reason: nil, parsed: nil, typedRaw: nil)
        let wrongVerdict = Verdict(correct: false, kind: .typed, questionId: nil,
                                   expectedIndex: -1, expectedText: "", chosenIndex: -1,
                                   reason: "wrong-value", parsed: nil, typedRaw: nil)

        var divergences = 0, filled = 0, total = 0
        for run in c.runs {
            var state = QRunState(startLevel: 1)
            let s = await store.beginSession(profile: p, mode: .quest, topic: run.topic)
            for row in run.rows {
                let correct = row.c == 1
                let levelAfter = expectedLevelAfter(state, correct: correct)
                var heroRoll = 0
                if correct && row.x == 1 {
                    heroRoll = (0...4).first { r in
                        state.monsterHP - QBattleMath.heroDamage(level: levelAfter,
                                                                 streakAfter: row.st,
                                                                 roll: r) <= 0
                    } ?? 4
                } else if correct {
                    let dmg = state.monsterHP - row.mhp
                    let crit = QBattleMath.isCritical(streakAfter: row.st)
                    let base = crit ? Double(dmg) / 2.0 : Double(dmg)
                    heroRoll = Int(max(0, min(4, (base - 18 - Double(levelAfter * 6)).rounded())))
                }
                let monsterRoll = correct ? 0 : max(0, min(3, state.heroHP - row.hp - state.monster.damage))
                let r = state.apply(correct: correct, heroRoll: heroRoll, monsterRoll: monsterRoll)

                // EXACTLY what QQuestModel.submit does.
                await store.record(Attempt(
                    session: s, profile: p, skill: SkillID("skill-" + run.topic),
                    verdict: correct ? correctVerdict : wrongVerdict,
                    elapsed: 0, scaffoldShown: .full,
                    timedOut: false, item: nil, topic: run.topic,
                    crystalsReported: r.monsterFell ? 1 : 0, mode: .quest))
                if state.clearedTheChain { break }
            }
            let summary = await store.endSession(s)
            if summary.crystalsEarned != run.crystals { divergences += 1 }
            total += summary.crystalsEarned
            if summary.crystalsEarned >= 6 { filled += 1 }
        }

        #expect(divergences == 0, "\(divergences) of 200 sessions disagreed with the web")
        #expect(filled == c.expect.ropeFilled)
        let mean = Double(total) / Double(c.runs.count)
        #expect(abs(mean - c.expect.meanCrystals) < 1e-9)
        // The number the deleted re-derivation could never reach: the rope fills at all.
        // It filled 0 of 200 before the report was wired.
        #expect(filled > 0)
    }

    /// The level `apply` will be at when it computes damage: it climbs FIRST, then
    /// hits, which is `js/app.js`'s order and the reason a roll recovered against the
    /// old level would come out one 6-point step wrong.
    private func expectedLevelAfter(_ s: QRunState, correct: Bool) -> Int {
        if correct {
            return (s.rightRow + 1 >= QBattleMath.levelUpAfter && s.level < QBattleMath.maxLevel)
                ? s.level + 1 : s.level
        }
        return (s.wrongRow + 1 >= QBattleMath.levelDownAfter && s.level > QBattleMath.minLevel)
            ? s.level - 1 : s.level
    }
}
