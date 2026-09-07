import Testing
import Foundation
@testable import MQPatchwerk

/// The clock is injected, so a whole fight is arithmetic.
///
/// These are the laws the parity corpus cannot state in words: the corpus proves
/// this engine agrees with the web, but it cannot say WHY any of it is right. If
/// a rule below is ever deliberately changed, both the web and this file change,
/// and the corpus regenerates - three places, in one commit, which is the point.
@Suite("The fight is the clock")
struct TimerEdgeTests {

    /// A run at a tier, with a clock the test owns.
    static func run(_ tier: String) -> (PatchwerkRun, PatchwerkManualClock) {
        let clock = PatchwerkManualClock(0)
        return (PatchwerkRun(tier: tier, config: .mirrored, clock: clock), clock)
    }

    @Test("A whole tier runs in microseconds, and ends on the right second",
          arguments: [("short", 120_000), ("normal", 180_000), ("long", 300_000)])
    func fullTier(_ tier: String, _ durationMs: Int) {
        let (r, clock) = Self.run(tier)
        #expect(r.tier.durationMs == durationMs)
        var answered = 0
        var t = 0
        while t < durationMs + 10_000 {
            t += 2_000
            clock.set(t)
            if !r.answer(true, level: 2, answerMs: 1_800).ignored { answered += 1 }
        }
        // Every answer strictly inside the fight counts; everything from the
        // instant the clock reads zero does not - so the answer landing ON the
        // final millisecond is the first one swallowed, and the count is one
        // short of the cadence.
        #expect(answered == durationMs / 2_000 - 1, "\(tier) counted \(answered) answers")
        #expect(r.timeLeftMs(at: durationMs) == 0)
        #expect(r.tick(level: 4, date: "2026-09-07", at: durationMs) != nil)
    }

    @Test("The enrage fires at exactly one second, on every tier",
          arguments: ["short", "normal", "long"])
    func enrageBoundary(_ tier: String) {
        let (r, _) = Self.run(tier)
        let d = r.tier.durationMs
        let w = PatchwerkConfig.mirrored.enrageWindowMs   // 20 s
        // One millisecond before the window opens: not enraged. One after: enraged.
        #expect(r.isEnraged(at: d - w - 1) == false)
        #expect(r.isEnraged(at: d - w) == true, "the window is inclusive at 20.000 s left")
        #expect(r.isEnraged(at: d - 1) == true)
        // At zero the run is OVER, not enraged. The distinction matters: an
        // enraged run that never ends is a boss that never lets go.
        #expect(r.isEnraged(at: d) == false)
        #expect(r.isEnraged(at: d + 5_000) == false)
    }

    @Test("An enraged hit is worth exactly 1.5x the same hit a second earlier")
    func enrageMultiplier() {
        let (a, _) = Self.run("normal")
        let (b, _) = Self.run("normal")
        let d = a.tier.durationMs
        // Same stacks (0), same pool, same speed - only the second differs.
        let calm = a.answer(true, level: 1, answerMs: 9_000, at: d - 21_000)
        let rage = b.answer(true, level: 1, answerMs: 9_000, at: d - 19_000)
        #expect(calm.damage == 10)
        #expect(rage.damage == 15)
        #expect(rage.enraged && !calm.enraged)
    }

    @Test("The run ends exactly at zero, and answers after it are ignored")
    func expiry() {
        let (r, clock) = Self.run("short")
        let d = r.tier.durationMs
        clock.set(d - 1)
        #expect(r.answer(true, level: 3, answerMs: 500).ignored == false)
        let damage = r.state.damage
        for t in [d, d + 1, d + 1_000, d + 600_000] {
            clock.set(t)
            let ev = r.answer(true, level: 3, answerMs: 500)
            #expect(ev.ignored, "an answer at \(t) ms was counted")
        }
        #expect(r.state.damage == damage, "a swallowed answer added damage")
        #expect(r.state.correct == 1)
    }

    @Test("A stunned answer is swallowed whole, and the stun costs only time")
    func stunSwallows() {
        let (r, clock) = Self.run("normal")
        clock.set(10_000)
        r.answer(true, level: 2, answerMs: 1_000)          // stacks 1
        clock.set(14_000)
        let wrong = r.answer(false, level: 2, answerMs: 1_000)
        #expect(wrong.stunMs == 1_500)
        let after = r.state
        for offset in [1, 200, 1_499] {
            clock.set(14_000 + offset)
            let ev = r.answer(true, level: 2, answerMs: 100)
            #expect(ev.ignored, "an answer \(offset) ms into the stun was counted")
        }
        #expect(r.state.damage == after.damage)
        #expect(r.state.correct == after.correct)
        // The stun ends at exactly +1500: `elapsed < stunUntil` is the whole rule.
        clock.set(14_000 + 1_500)
        #expect(r.answer(true, level: 2, answerMs: 100).ignored == false)
    }

    @Test("The damage total never goes down, whatever the child does")
    func monotonic() {
        let (r, clock) = Self.run("long")
        var last = 0
        var t = 0
        var i = 0
        while t < 300_000 {
            t += 1_700
            clock.set(t)
            r.answer(i % 3 != 2, level: (i % 3) + 1, answerMs: Double(600 + (i % 9) * 900))
            #expect(r.state.damage >= last, "damage fell at \(t) ms")
            last = r.state.damage
            i += 1
        }
        #expect(last > 0)
    }

    @Test("The clock label counts down and only reads 0:00 when it is over")
    func clockLabels() {
        #expect(PatchwerkRun.clockLabel(ms: 180_000) == "3:00")
        #expect(PatchwerkRun.clockLabel(ms: 167_000) == "2:47")
        #expect(PatchwerkRun.clockLabel(ms: 18_400) == "0:19")   // rounds UP
        #expect(PatchwerkRun.clockLabel(ms: 1) == "0:01")
        #expect(PatchwerkRun.clockLabel(ms: 0) == "0:00")
        #expect(PatchwerkRun.clockLabel(ms: -5_000) == "0:00")
    }

    @Test("The boss bar drains and refills, and never ends the fight")
    func bossHealsToFull() {
        let (r, clock) = Self.run("long")
        var t = 0
        while t < 200_000 {
            t += 1_500
            clock.set(t)
            r.answer(true, level: 3, answerMs: 500)
            #expect(r.state.bossHp > 0, "the dummy died at \(t) ms")
            #expect(r.bossFraction >= 0 && r.bossFraction <= 1)
        }
        #expect(r.state.bossPhase > 1, "the bar never refilled at all")
        #expect(r.timeLeftMs(at: t) > 0, "the fight ended early")
    }

    @Test("The leaderboard record keeps the web's key order")
    func recordShape() throws {
        let (r, _) = Self.run("normal")
        let record = r.finish(level: 4, date: "2026-09-07")
        // The ORDER is a fact about the type, because Foundation's JSONEncoder
        // does not preserve declaration order in its output.
        let declared = PatchwerkRecord.CodingKeys.allCases.map(\.rawValue).joined(separator: ",")
        #expect(declared == PatchwerkRecord.contractKeyOrder, "record shape drifted")
        // And the encoded bytes carry exactly that set of keys - no more, no less.
        let json = try JSONSerialization.jsonObject(with: try JSONEncoder().encode(record))
        let keys = Set((json as? [String: Any])?.keys.map { $0 } ?? [])
        #expect(keys == Set(PatchwerkRecord.contractKeyOrder.split(separator: ",").map(String.init)))
        #expect(record.mode == "patchwerk")
        #expect(record.tier == "normal")
        #expect(record.durationMs == 180_000)
    }

    @Test("Accuracy is a real fraction, and zero attempts is not 100%")
    func accuracy() {
        let empty = PatchwerkRecord(mode: "patchwerk", tier: "short", level: 4, damage: 0,
                                    maxStacks: 0, correct: 0, wrong: 0, freezesUsed: 0,
                                    durationMs: 120_000, date: "2026-09-07")
        #expect(empty.accuracy == 0)
        #expect(empty.accuracyLabel == "0%")
        let mixed = PatchwerkRecord(mode: "patchwerk", tier: "short", level: 4, damage: 100,
                                    maxStacks: 3, correct: 12, wrong: 3, freezesUsed: 1,
                                    durationMs: 120_000, date: "2026-09-07")
        #expect(mixed.accuracyLabel == "80%")
    }
}

/// The anti-quit machinery, which is the whole reason this mode has a design
/// note rather than a paragraph.
@Suite("Stacks, freezes, and the reason a broken streak is not worth quitting")
struct StackAndFreezeTests {

    static func run() -> (PatchwerkRun, PatchwerkManualClock) {
        let clock = PatchwerkManualClock(0)
        return (PatchwerkRun(tier: "normal", config: .mirrored, clock: clock), clock)
    }

    @Test("A hit scores with the stacks you already hold, then adds one")
    func scoredOnStacksHeld() {
        let (r, clock) = Self.run()
        clock.set(5_000)
        // Base 15, no speed bonus at 5 s (0.075 kicker), no stacks yet -> 1.00x.
        let first = r.answer(true, level: 2, answerMs: 5_000)
        #expect(first.damage == Int((15.0 * 1.0 * 1.075 + 0.5).rounded(.down)))
        #expect(r.state.stacks == 1, "the hit that earned the stack did not use it")
    }

    @Test("Stacks cap at 10, which is a 2.00x multiplier and no more")
    func stacksCap() {
        let (r, clock) = Self.run()
        for i in 1...20 {
            clock.set(i * 3_000)
            r.answer(true, level: 1, answerMs: 3_000)
        }
        #expect(r.state.stacks == 10)
        #expect(r.state.maxStacks == 10)
        #expect(abs(r.stackMultiplier - 2.0) < 1e-9)
        #expect(r.multiplierLabel == "2.00x")
    }

    @Test("A freeze credit is earned every 5 in a row, and never more than 2 held")
    func freezeEarnAndCap() {
        let (r, clock) = Self.run()
        for i in 1...5 { clock.set(i * 2_000); r.answer(true, level: 2, answerMs: 1_000) }
        #expect(r.state.freezes == 1)
        for i in 6...10 { clock.set(i * 2_000); r.answer(true, level: 2, answerMs: 1_000) }
        #expect(r.state.freezes == 2)
        // Ten more correct: the cap holds. This is the line between a safety net
        // and an accuracy-free damage race.
        for i in 11...20 { clock.set(i * 2_000); r.answer(true, level: 2, answerMs: 1_000) }
        #expect(r.state.freezes == 2, "a third credit was banked")
    }

    @Test("A freeze absorbs exactly one wrong answer - the second one breaks the streak")
    func freezeAbsorbsOne() {
        let (r, clock) = Self.run()
        for i in 1...5 { clock.set(i * 2_000); r.answer(true, level: 3, answerMs: 2_000) }
        let held = r.state
        #expect(held.stacks == 5 && held.freezes == 1)

        clock.set(20_000)
        let first = r.answer(false, level: 3, answerMs: 2_000)
        #expect(first.froze)
        #expect(r.state.stacks == 5, "the freeze did not hold the stacks")
        #expect(r.state.freezes == 0 && r.state.freezesUsed == 1)
        #expect(r.state.damage == held.damage, "a wrong answer changed the damage total")

        clock.set(25_000)
        let second = r.answer(false, level: 3, answerMs: 2_000)
        #expect(second.froze == false)
        #expect(r.state.stacks == 0, "the second wrong answer kept the stacks")
        #expect(r.state.freezesUsed == 1)
    }

    @Test("Earn progress resets on ANY wrong answer, including a frozen one")
    func earnProgressResetsOnFrozenWrong() {
        let (r, clock) = Self.run()
        // Bank one credit, then get to 4-in-a-row: one more would bank the next.
        for i in 1...9 { clock.set(i * 2_000); r.answer(true, level: 2, answerMs: 1_000) }
        #expect(r.state.freezes == 1)
        #expect(r.state.earnProgress == 4)

        clock.set(20_000)
        #expect(r.answer(false, level: 2, answerMs: 1_000).froze)
        #expect(r.state.earnProgress == 0,
                "a frozen wrong kept banking the next credit - the self-sustaining loop")

        // Four more correct must NOT be enough; it takes five.
        for i in 1...4 { clock.set(22_000 + i * 2_000); r.answer(true, level: 2, answerMs: 1_000) }
        #expect(r.state.freezes == 0)
        clock.set(32_000)
        r.answer(true, level: 2, answerMs: 1_000)
        #expect(r.state.freezes == 1)
    }

    @Test("A wrong answer with no credit resets the stacks to zero and nothing else")
    func wrongWithoutCredit() {
        let (r, clock) = Self.run()
        for i in 1...3 { clock.set(i * 2_000); r.answer(true, level: 2, answerMs: 1_000) }
        let before = r.state
        clock.set(10_000)
        let ev = r.answer(false, level: 2, answerMs: 1_000)
        #expect(ev.froze == false)
        #expect(r.state.stacks == 0)
        #expect(r.state.maxStacks == before.maxStacks, "maxStacks is a high-water mark")
        #expect(r.state.damage == before.damage)
        #expect(r.state.wrong == 1)
    }

    @Test("The speed bonus is smaller than one stack, everywhere it applies")
    func speedIsASmallKicker() {
        let (r, _) = Self.run()
        #expect(r.speedBonus(0) == 0.15)
        #expect(r.speedBonus(2_000) == 0.15)
        #expect(r.speedBonus(5_000) == 0.075)
        #expect(r.speedBonus(8_000) == 0)
        #expect(r.speedBonus(20_000) == 0)
        #expect(r.speedBonus(nil) == 0)
        #expect(r.speedBonus(.nan) == 0)
        // The design's load-bearing inequality: the whole speed kicker is worth
        // less than a single stack, so thinking is never punished.
        #expect(PatchwerkConfig.mirrored.speedBonusMax < PatchwerkConfig.mirrored.stackStep + 0.05)
        #expect(PatchwerkConfig.mirrored.speedBonusMax <= PatchwerkConfig.mirrored.stackStep * 1.5)
    }

    @Test("An unknown difficulty pool falls back rather than scoring zero")
    func unknownPool() {
        let (r, clock) = Self.run()
        clock.set(3_000)
        let ev = r.answer(true, level: 9, answerMs: 1_000)
        #expect(ev.damage == Int((10.0 * 1.0 * 1.15 + 0.5).rounded(.down)))
        clock.set(6_000)
        let none = r.answer(true, level: nil, answerMs: 1_000)
        #expect(none.damage > 0)
    }
}
