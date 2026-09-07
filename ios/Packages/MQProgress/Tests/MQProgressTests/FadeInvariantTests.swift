import Testing
import Foundation
import MQContent
@testable import MQProgress

/// THE LAW. `full -> partial -> hint -> none`, one way, for the lifetime of a profile.
///
/// Kevin's north star for anything that teaches is "the best day is the day you do not
/// need me". A scaffold that can come back is the opposite of that, and the failure mode
/// is not a crash - it is a mode with good intentions calling `fadeScaffold(to: .full)`
/// after a bad run because it feels kind. So the law is asserted in the store and it is
/// hammered here, not inspected by eye in each mode.
@Suite("The scaffold never rises")
struct FadeInvariantTests {

    @Test("10,000 random events, and it never once goes up")
    func tenThousandEvents() async {
        let store = MQProgressStore.inMemory()
        var rng = SeededRNG(20260907)

        var profiles: [ProfileID] = []
        for i in 0..<3 {
            profiles.append(await store.addProfile(name: "Hero \(i)", cast: .unicorn, level: "P4"))
        }
        let skills = ["perimeter", "area", "missingSide", "compare", "convert"]
        var sessions: [ProfileID: SessionID] = [:]
        for p in profiles { sessions[p] = await store.beginSession(profile: p, mode: .quest) }

        // The high-water mark per profile+skill. Nothing may ever be observed above it.
        var held: [String: ScaffoldLevel] = [:]
        var rises = 0
        var upRequests = 0
        var fades = 0

        for _ in 0..<10_000 {
            let profile = profiles[rng.pick(profiles.count)]
            let skill = skills[rng.pick(skills.count)]
            let key = profile.raw + "|" + skill

            switch rng.pick(10) {
            case 0...5:
                // An answer. This is the path that auto-fades off the record of attempts.
                _ = await store.answer(sessions[profile]!, profile, skill,
                                       correct: rng.chance(0.72),
                                       shown: await store.scaffold(profile: profile, skill: SkillID(skill)))
            case 6, 7:
                // A mode asking for a level at random - INCLUDING a higher one.
                let wanted = ScaffoldLevel.allCases[rng.pick(ScaffoldLevel.allCases.count)]
                let before = await store.scaffold(profile: profile, skill: SkillID(skill))
                let after = await store.fadeScaffold(profile: profile, skill: SkillID(skill), to: wanted)
                if wanted > before { upRequests += 1; #expect(after == before) }
                if after < before { fades += 1 }
                #expect(after <= before)
            case 8:
                // End and restart a session. A new session must not reset anything.
                _ = await store.endSession(sessions[profile]!)
                sessions[profile] = await store.beginSession(profile: profile, mode:
                                                                rng.chance(0.5) ? .quest : .patchwerk)
            default:
                // Reset history the way the parent screen does. Scaffolds survive it.
                if rng.chance(0.02) { await store.resetHistory(profile: profile) }
            }

            let now = await store.scaffold(profile: profile, skill: SkillID(skill))
            if let mark = held[key], now > mark { rises += 1 }
            held[key] = min(now, held[key] ?? .full)
        }

        #expect(rises == 0, "the scaffold rose \(rises) times")
        // A test that never exercised an up-request or never faded anything would pass
        // trivially. Both have to have happened for the run to mean something.
        #expect(upRequests > 100, "only \(upRequests) up-requests were attempted")
        #expect(fades > 0, "nothing ever faded, so nothing was actually being guarded")
    }

    @Test("An up request is a no-op that returns the level held", arguments: [
        (ScaffoldLevel.hint, ScaffoldLevel.full),
        (ScaffoldLevel.hint, ScaffoldLevel.partial),
        (ScaffoldLevel.none, ScaffoldLevel.hint),
        (ScaffoldLevel.partial, ScaffoldLevel.full)
    ])
    func upIsANoOp(_ held: ScaffoldLevel, _ wanted: ScaffoldLevel) async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        _ = await store.fadeScaffold(profile: p, skill: SkillID("perimeter"), to: held)
        let back = await store.fadeScaffold(profile: p, skill: SkillID("perimeter"), to: wanted)
        #expect(back == held)
        #expect(await store.scaffold(profile: p, skill: SkillID("perimeter")) == held)
    }

    @Test("A failing run never gets the training wheels back")
    func failingRunKeepsTheFade() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)

        // Three ladder steps: 3 x 7 straight correct answers and every piece of help is
        // gone. (It used to be six answers full stop - see MQRule.fadeAfterConsecutiveCorrect.)
        for _ in 0..<21 { await store.answer(s, p, "perimeter", correct: true) }
        #expect(await store.scaffold(profile: p, skill: SkillID("perimeter")) == .none)

        // Now fall apart. The pool drops back; the help does not come back.
        for _ in 0..<20 { await store.answer(s, p, "perimeter", correct: false) }
        #expect(await store.poolLevel(profile: p, skill: SkillID("perimeter")) == 1)
        #expect(await store.scaffold(profile: p, skill: SkillID("perimeter")) == .none)
    }

    @Test("A new session does not re-grow anything")
    func sessionBoundaryKeepsTheFade() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        var s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<7 { await store.answer(s, p, "area", correct: true) }
        let mid = await store.scaffold(profile: p, skill: SkillID("area"))
        #expect(mid == .partial)          // one ladder step, and only one
        _ = await store.endSession(s)
        s = await store.beginSession(profile: p, mode: .quest)
        #expect(await store.scaffold(profile: p, skill: SkillID("area")) == mid)
        #expect(await store.streak(session: s) == 0)   // the streak, however, is gone
    }

    @Test("The parent screen's reset keeps the fade")
    func resetKeepsTheFade() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<21 { await store.answer(s, p, "area", correct: true) }
        _ = await store.endSession(s)
        #expect(await store.sessions(profile: p).count == 1)
        await store.resetHistory(profile: p)
        #expect(await store.sessions(profile: p).isEmpty)
        #expect(await store.scaffold(profile: p, skill: SkillID("area")) == .none)
    }

    @Test("The fade ladder is ordered the way the law reads")
    func ladderOrder() {
        #expect(ScaffoldLevel.none < .hint)
        #expect(ScaffoldLevel.hint < .partial)
        #expect(ScaffoldLevel.partial < .full)
        #expect(ScaffoldLevel.allCases.count == 4)
    }
}
