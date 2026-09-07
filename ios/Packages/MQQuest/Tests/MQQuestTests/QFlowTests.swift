import Testing
import Foundation
import MQContent
import MQDesign
@testable import MQQuest

// =============================================================================
// THE FLOW STATE MACHINE
//
// Every number asserted here is quoted from `js/app.js` in the comment above the
// assertion. That is the point of the suite: Charlotte has played the web
// version, so a hit that takes a different bite out of the bar is a different
// game, and "it looked about right" is not a gate.
// =============================================================================

@Suite("HP and streak follow the web's own formulas")
struct QBattleMathTests {

    /// `const dmg=(18+S.level*6+ri(0,4))*(crit?2:1);`
    @Test("hero damage = (18 + level*6 + roll), doubled on a crit",
          arguments: [(1, 1, 0, 24), (1, 1, 4, 28), (2, 2, 0, 30), (3, 2, 3, 39),
                      (1, 3, 0, 48), (3, 5, 4, 80)])
    func heroDamage(level: Int, streak: Int, roll: Int, expected: Int) {
        #expect(QBattleMath.heroDamage(level: level, streakAfter: streak,
                                       roll: roll) == expected)
    }

    /// `const crit=S.streak>=3;`
    @Test("a crit is a streak of three, counted AFTER the answer")
    func crit() {
        #expect(QBattleMath.isCritical(streakAfter: 2) == false)
        #expect(QBattleMath.isCritical(streakAfter: 3))
        #expect(QBattleMath.isCritical(streakAfter: 9))
    }

    /// `const dmg=MONSTERS[S.mi].dmg+ri(0,3);`
    @Test("monster damage = its own base + a 0...3 roll")
    func monsterDamage() {
        #expect(QBattleMath.monsterDamage(monsterDamage: 10, roll: 0) == 10)
        #expect(QBattleMath.monsterDamage(monsterDamage: 16, roll: 3) == 19)
    }

    /// `const MONSTERS=[...]` and `const HERO_MAX=100`.
    @Test("the monster chain is the web's, in the web's order")
    func chain() {
        #expect(QBattleMath.heroMax == 100)
        #expect(QMonster.chain.count == 6)
        #expect(QMonster.chain.map(\.hp) == [50, 60, 70, 80, 90, 140])
        #expect(QMonster.chain.map(\.damage) == [10, 12, 12, 14, 14, 16])
        #expect(QMonster.chain.last?.name.hasPrefix("FRACTOR") == true)
    }

    /// `if(S.rightRow>=3 && S.level<3){ S.level++; S.rightRow=0; }`
    @Test("three right in a row climbs a level, and never past 3")
    func levelClimbs() {
        var run = QRunState()
        for _ in 0..<3 { _ = run.apply(correct: true, heroRoll: 0, monsterRoll: 0) }
        #expect(run.level == 2)
        for _ in 0..<3 { _ = run.apply(correct: true, heroRoll: 0, monsterRoll: 0) }
        #expect(run.level == 3)
        for _ in 0..<6 { _ = run.apply(correct: true, heroRoll: 0, monsterRoll: 0) }
        #expect(run.level == 3)
    }

    /// `if(S.wrongRow>=2 && S.level>1){ S.level--; S.wrongRow=0; }`
    @Test("two wrong in a row drops a level, and never below 1")
    func levelFalls() {
        var run = QRunState(startLevel: 3)
        _ = run.apply(correct: false, heroRoll: 0, monsterRoll: 0)
        #expect(run.level == 3)          // one wrong is not enough
        _ = run.apply(correct: false, heroRoll: 0, monsterRoll: 0)
        #expect(run.level == 2)
        for _ in 0..<4 { _ = run.apply(correct: false, heroRoll: 0, monsterRoll: 0) }
        #expect(run.level == 1)
    }

    /// `S.streak=0` in markWrong; `S.best=Math.max(S.best,S.streak)` in resolve.
    @Test("the streak resets on a wrong answer and the best is kept")
    func streakResets() {
        var run = QRunState()
        for _ in 0..<4 { _ = run.apply(correct: true, heroRoll: 0, monsterRoll: 0) }
        #expect(run.streak == 4)
        #expect(run.bestStreak == 4)
        _ = run.apply(correct: false, heroRoll: 0, monsterRoll: 0)
        #expect(run.streak == 0)
        #expect(run.bestStreak == 4)
        _ = run.apply(correct: true, heroRoll: 0, monsterRoll: 0)
        #expect(run.streak == 1)
        #expect(run.bestStreak == 4)
    }

    /// `S.heroHp=Math.min(HERO_MAX,S.heroHp+12);` in monsterDown().
    /// Worked through by hand, so the assertion is a claim and not a recording:
    ///
    /// * one wrong answer: Gloop deals `10 + 0`, hero 100 -> **90**;
    /// * correct #1: level 1, streak 1, `18 + 6 + 0 = 24`, Gloop 50 -> **26**;
    /// * correct #2: streak 2, another 24, Gloop 26 -> **2**;
    /// * correct #3: rightRow hits 3 so the level climbs FIRST (level 2), and
    ///   streak 3 makes it a crit: `(18 + 12 + 0) * 2 = 60`. Gloop falls.
    /// * the heal is `min(100, 90 + 12) - 90 = 10`, not 12 - the cap bites.
    @Test("a felled monster heals up to 12, capped at 100, and hands over the next one")
    func monsterDown() {
        var run = QRunState()
        _ = run.apply(correct: false, heroRoll: 0, monsterRoll: 0)
        #expect(run.heroHP == 90)
        #expect(run.apply(correct: true, heroRoll: 0, monsterRoll: 0).damageDealt == 24)
        #expect(run.monsterHP == 26)
        #expect(run.apply(correct: true, heroRoll: 0, monsterRoll: 0).damageDealt == 24)
        #expect(run.monsterHP == 2)
        let third = run.apply(correct: true, heroRoll: 0, monsterRoll: 0)
        #expect(third.critical)
        #expect(third.damageDealt == 60)
        #expect(third.monsterFell)
        #expect(third.healed == 10)
        #expect(run.heroHP == 100)
        #expect(run.crystals == 1)
        #expect(run.monsterIndex == 1)
        #expect(run.monsterHP == 60)
    }

    @Test("the heal never takes the hero over 100")
    func healCap() {
        var run = QRunState()
        for _ in 0..<3 { _ = run.apply(correct: true, heroRoll: 4, monsterRoll: 0) }
        #expect(run.heroHP == 100)
    }

    @Test("damage taken is the CURRENT monster's, not the first one's")
    func damageFollowsTheMonster() {
        var run = QRunState()
        run.monsterIndex = 5
        run.monsterHP = QMonster.chain[5].hp
        let r = run.apply(correct: false, heroRoll: 0, monsterRoll: 3)
        #expect(r.damageTaken == 19)     // FRACTOR: 16 + 3
    }
}

// =============================================================================

@Suite("The set runs, ends and reviews exactly what was wrong")
struct QSetFlowTests {

    /// Six typed questions whose answers are 1...6, so a test can say "get the
    /// third one wrong" and mean it.
    static func script(_ n: Int, unit: String = "cm") -> [Question] {
        (0..<n).map { i in
            QFixtures.question(id: "q\(i + 1)", unit: unit, answer: Double(i + 1))
        }
    }

    @MainActor
    static func model(_ questions: [Question], setSize: Int,
                      rolls: [Int] = [0]) async -> (QQuestModel, InMemoryProgressStore) {
        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let m = QQuestModel(source: ScriptedSource(questions), store: store,
                            random: QFixedRandom(rolls), setSize: setSize)
        await m.load()
        await m.pick(m.profiles[0])
        await m.open(m.island!.nodes[0])
        return (m, store)
    }

    /// Answer the current question correctly or not, then advance.
    @MainActor
    static func answer(_ m: QQuestModel, correct: Bool) async {
        guard let q = m.question else { return }
        let want = q.key["answer"]?.doubleValue ?? 0
        // Through the keypad, one digit at a time - the child's own path.
        for ch in JSONValue.numberText(correct ? want : want + 1) {
            if let d = Int(String(ch)) { m.press(.digit(d)) }
        }
        await m.submitTyped()
        await m.advance()
    }

    @MainActor
    @Test("the set ends on the Nth item and not before")
    func setCompletes() async {
        let (m, _) = await Self.model(Self.script(9), setSize: 6)
        #expect(m.phase == .asking)
        for i in 1...5 {
            await Self.answer(m, correct: true)
            #expect(m.phase == .asking, "still asking after \(i) of 6")
        }
        await Self.answer(m, correct: true)
        #expect(m.phase == .result)
        #expect(m.summary?.total == 6)
        #expect(m.summary?.correct == 6)
    }

    @MainActor
    @Test("the review lists exactly the wrong items, in the order they happened")
    func reviewIsExactlyTheWrongOnes() async {
        let (m, _) = await Self.model(Self.script(6), setSize: 6)
        // right, WRONG, right, WRONG, right, right
        for correct in [true, false, true, false, true, true] {
            await Self.answer(m, correct: correct)
        }
        #expect(m.phase == .result)
        let review = m.summary?.review ?? []
        #expect(review.count == 2)
        #expect(review.map(\.question.id) == ["q2", "q4"])
        #expect(review.allSatisfy { !$0.isCorrect })
        // and nothing correct leaked in
        #expect(m.answered.count == 6)
        #expect(m.answered.filter(\.isCorrect).count == 4)
    }

    @MainActor
    @Test("an empty review is an empty review, not a missing one")
    func perfectRunHasNoReview() async {
        let (m, _) = await Self.model(Self.script(4), setSize: 4)
        for _ in 0..<4 { await Self.answer(m, correct: true) }
        #expect(m.summary?.review.isEmpty == true)
        #expect(m.summary?.title == QStrings.resultTitleAllCorrect)
    }

    @MainActor
    @Test("the feed is asked for the level the ladder is currently on")
    func feedFollowsTheLadder() async {
        let source = ScriptedSource(Self.script(8))
        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let m = QQuestModel(source: source, store: store,
                            random: QFixedRandom([0]), setSize: 8)
        await m.load()
        await m.pick(m.profiles[0])
        await m.open(m.island!.nodes[0])
        for _ in 0..<4 { await Self.answer(m, correct: true) }
        let levels = await source.levelsRequested
        // draws 1..3 at level 1; the third correct answer climbs, so draw 4 is
        // asked at level 2.
        #expect(levels.prefix(3).allSatisfy { $0 == 1 })
        #expect(levels.count >= 4)
        #expect(levels[3] == 2)
    }

    @MainActor
    @Test("the set ends early when the hero's HP reaches zero")
    func defeatEndsTheSet() async {
        // Ten wrong answers at 10-13 damage a hit is more than 100 HP.
        let (m, _) = await Self.model(Self.script(20), setSize: 20, rolls: [3])
        var answered = 0
        while m.phase == .asking && answered < 20 {
            await Self.answer(m, correct: false)
            answered += 1
        }
        #expect(m.phase == .result)
        #expect(m.run.heroHP <= 0)
        #expect(answered < 20)
        #expect(m.summary?.defeated == true)
    }

    @MainActor
    @Test("the engine's feed session is retired when the set ends")
    func sessionRetired() async {
        let source = ScriptedSource(Self.script(3))
        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let m = QQuestModel(source: source, store: store,
                            random: QFixedRandom([0]), setSize: 3)
        await m.load()
        await m.pick(m.profiles[0])
        await m.open(m.island!.nodes[0])
        for _ in 0..<3 { await Self.answer(m, correct: true) }
        let ended = await source.endedSessions
        #expect(ended.count == 1)
        #expect(ended[0].hasPrefix("quest-Charlotte-"))
    }

    @MainActor
    @Test("a locked node cannot be opened, even by calling open() directly")
    func lockedNodeRefused() async {
        let (m, _) = await Self.model(Self.script(4), setSize: 4)
        await m.toMap()
        let locked = m.island!.nodes.first { !$0.playable }
        #expect(locked != nil)
        await m.open(locked!)
        #expect(m.phase == .map)
        #expect(m.node?.topicID != locked?.topicID)
    }
}

// =============================================================================

@Suite("The island is the catalogue joined to the store")
struct QIslandTests {

    @Test("a node with every skill mastered is Cleared; none is Ready; unbacked is Coming soon")
    func states() {
        let cat = QFixtures.catalogue(topics: ["a", "b", "c"], lockedLast: true)
        var mastery: [SkillID: Double] = [:]
        var island = QIsland.build(catalogue: cat, level: "P4", mastery: mastery)
        #expect(island.nodes.count == 3)
        #expect(island.nodes[0].state == .open)                    // Ready
        #expect(island.nodes[2].state == .comingSoon)              // locked
        mastery = [SkillID("area"): 0.9, SkillID("perimeter"): 0.9]
        island = QIsland.build(catalogue: cat, level: "P4", mastery: mastery)
        #expect(island.nodes[0].state == .cleared)
        mastery = [SkillID("area"): 0.9, SkillID("perimeter"): 0.1]
        island = QIsland.build(catalogue: cat, level: "P4", mastery: mastery)
        #expect(island.nodes[0].state == .inProgress(collected: 1, total: 2))
        #expect(island.crystals == 3)   // 1 per node, three nodes share the skills
    }

    @Test("a locked node is never playable however much mastery it has")
    func lockedStaysLocked() {
        let cat = QFixtures.catalogue(topics: ["a", "b"], lockedLast: true)
        let island = QIsland.build(catalogue: cat, level: "P4",
                                   mastery: [SkillID("area"): 1, SkillID("perimeter"): 1])
        #expect(island.nodes[1].playable == false)
        #expect(island.nodes[1].state == .comingSoon)
    }

    @Test("stops alternate sides and stay inside the map canvas")
    func placement() {
        for count in [1, 4, 8, 11] {
            for i in 0..<count {
                let p = QIsland.place(i, of: count)
                #expect(p.x >= 0.05 && p.x <= 0.95, "x in frame at \(i)/\(count)")
                #expect(p.y >= 0.20 && p.y <= 0.85, "y in frame at \(i)/\(count)")
            }
        }
    }
}

// =============================================================================

@Suite("The store enforces the laws the contract puts in it")
struct QProgressStoreTests {

    @Test("mastery is derived from attempts; there is no other write")
    func masteryDerived() async {
        let store = InMemoryProgressStore()
        let p = ProfileID("c"), s = SkillID("area")
        let session = await store.beginSession(profile: p, mode: .quest)
        #expect(await store.mastery(profile: p, skill: s) == 0)
        let correct = Verdict(correct: true, kind: .typed, questionId: "q1",
                              expectedIndex: -1, expectedText: "", chosenIndex: -1,
                              reason: nil, parsed: nil, typedRaw: nil)
        var last = 0.0
        for _ in 0..<10 {
            let d = await store.record(Attempt(session: session, profile: p, skill: s,
                                               verdict: correct, elapsed: 0,
                                               scaffoldShown: .full))
            #expect(d.masteryAfter > d.masteryBefore)
            last = d.masteryAfter
        }
        #expect(last > QNode.masteredAt)
    }

    @Test("the scaffold fades and can never be re-grown")
    func scaffoldFadesOneWay() async {
        let store = InMemoryProgressStore()
        let p = ProfileID("c"), s = SkillID("area")
        #expect(await store.scaffold(profile: p, skill: s) == .full)
        #expect(await store.fadeScaffold(profile: p, skill: s, to: .partial) == .partial)
        #expect(await store.fadeScaffold(profile: p, skill: s, to: .hint) == .hint)
        // The law: a request to go UP returns the level actually held.
        #expect(await store.fadeScaffold(profile: p, skill: s, to: .full) == .hint)
        #expect(await store.fadeScaffold(profile: p, skill: s, to: .partial) == .hint)
        #expect(await store.scaffold(profile: p, skill: s) == .hint)
    }

    @Test("the streak is per session and never spans one")
    func streakPerSession() async {
        let store = InMemoryProgressStore()
        let p = ProfileID("c")
        let a = await store.beginSession(profile: p, mode: .quest)
        let correct = Verdict(correct: true, kind: .typed, questionId: nil,
                              expectedIndex: -1, expectedText: "", chosenIndex: -1,
                              reason: nil, parsed: nil, typedRaw: nil)
        for _ in 0..<3 {
            await store.record(Attempt(session: a, profile: p, skill: SkillID("x"),
                                       verdict: correct, elapsed: 0, scaffoldShown: .full))
        }
        #expect(await store.streak(session: a) == 3)
        let b = await store.beginSession(profile: p, mode: .quest)
        #expect(await store.streak(session: b) == 0)
    }

    @Test("endSession is idempotent")
    func endSessionIdempotent() async {
        let store = InMemoryProgressStore()
        let s = await store.beginSession(profile: ProfileID("c"), mode: .quest)
        let first = await store.endSession(s)
        let second = await store.endSession(s)
        #expect(first.total == second.total)
        #expect(first.elapsed == second.elapsed)
    }
}
