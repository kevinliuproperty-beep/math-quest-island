import Testing
import Foundation
import MQContent
import MQDesign
import MQProgress
import MQServices
@testable import MQPatchwerk

/// The clock cannot be driven backwards, and the view makes one timer per run.
///
/// Both are 2026-09-07 refutation findings with a measured failure behind them:
///
///  * **W6.** `PatchwerkSystemClock` read `Date()`. Driven ten minutes backwards
///    mid-run on the two-minute tier, `timeLeftMs` became **700,000 on a 120,000
///    ms tier**, the phase stayed `.running`, and five further answers scored onto
///    the board. Every device moves its wall clock; a child can move it by hand.
///  * **W7.** `PatchwerkFlow` held `Timer.publish(...)` as a stored property on a
///    `struct View`, so SwiftUI made a fresh publisher on every `@Published`
///    change - a new timer per tick on the iPad 6 the 100 ms interval was chosen
///    to protect.
/// `.serialized` because `PatchwerkTicker.timersCreated` is a PROCESS-WIDE
/// counter - which is the only thing that can witness "one timer per run" - and
/// three tests here reset and read it. Run in parallel they reset each other's
/// evidence, which is a flake, not a finding.
@Suite("The clock cannot be driven backwards, and the ticker is one per run", .serialized)
struct ClockAndTickerTests {

    // MARK: W6 - the clock

    @Test("The device clock is monotonic and never returns to a value it has passed")
    func systemClockIsMonotonic() {
        let clock = PatchwerkSystemClock()
        var last = clock.nowMs
        var readings = 0
        // Busy-read rather than sleep: what is being asserted is ORDER, and a
        // gate that sleeps is a gate somebody eventually deletes.
        for _ in 0..<200_000 {
            let now = clock.nowMs
            #expect(now >= last, "the system clock went backwards: \(last) -> \(now)")
            last = now
            readings += 1
        }
        #expect(readings == 200_000)
        // Two freshly built clocks must be interchangeable: `PatchwerkRun` stores
        // `startedAtMs` from one instance and reads `nowMs` later, and a per-
        // instance origin would make that difference meaningless.
        let other = PatchwerkSystemClock()
        #expect(abs(other.nowMs - clock.nowMs) < 1_000)
    }

    @Test("The device clock advances with real time")
    func systemClockAdvances() async throws {
        let clock = PatchwerkSystemClock()
        let before = clock.nowMs
        try await Task.sleep(nanoseconds: 60_000_000)   // 60 ms
        let after = clock.nowMs
        #expect(after > before)
        #expect(after - before >= 40, "the clock advanced only \(after - before) ms over 60 ms")
        #expect(after - before < 5_000)
    }

    /// The measured W6 reproduction, inverted. A clock that jumps backwards by ten
    /// minutes mid-fight cannot buy the child a single extra millisecond.
    @Test("A backwards clock cannot extend the fight", arguments: ["short", "normal", "long"])
    func backwardsClockCannotExtendTheFight(_ tier: String) {
        let clock = PatchwerkManualClock(1_000_000)
        let run = PatchwerkRun(tier: tier, config: .mirrored, clock: clock)
        let duration = run.tier.durationMs

        clock.advance(30_000)
        #expect(run.timeLeftMs == duration - 30_000)

        // Ten minutes backwards - the exact shape of the refuter's reproduction.
        clock.advance(-600_000)
        #expect(run.elapsedMs < 0, "the test did not actually drive the clock backwards")
        #expect(run.timeLeftMs == duration,
                "a backwards clock bought \(run.timeLeftMs - duration) ms of extra fight")
        #expect(run.timeLeftMs <= duration)
        #expect(!run.isEnraged, "a backwards clock must not enter or leave the enrage")

        // And nothing about the end condition is softened: forward past zero still
        // ends it, from a negative elapsed as much as from a positive one.
        clock.advance(600_000 + duration)
        #expect(run.timeLeftMs == 0)
        let ev = run.answer(true, level: 3, answerMs: 500)
        #expect(ev.ignored, "an answer after zero scored")
    }

    @Test("timeLeft is clamped to the tier at both ends, at every boundary")
    func timeLeftIsClamped() {
        for tier in ["short", "normal", "long"] {
            let run = PatchwerkRun(tier: tier, config: .mirrored, clock: PatchwerkManualClock(0))
            let d = run.tier.durationMs
            for at in [-10_000_000, -600_000, -1_501, -1, 0, 1, d - 1, d, d + 1, 10_000_000] {
                let left = run.timeLeftMs(at: at)
                #expect(left >= 0 && left <= d,
                        "\(tier) at elapsed \(at): timeLeft \(left) is outside 0...\(d)")
            }
            #expect(run.timeLeftMs(at: -1) == d)
            #expect(run.timeLeftMs(at: 0) == d)
            #expect(run.timeLeftMs(at: d + 1) == 0)
        }
    }

    /// The web has the same hole (`Date.now() - t0`) and this is deliberately
    /// stricter. It cannot cost parity, and this is the assertion that says so:
    /// the corpus supplies every timestamp explicitly, so the clock source is
    /// never on the corpus's path, and the clamp only ever fires below zero -
    /// where the shortest tier (120,000 ms) is still six times the enrage window.
    @Test("Being stricter than the web cannot move a scored answer")
    func strictnessIsNotAParityChange() {
        let config = PatchwerkConfig.mirrored
        for tier in config.tiers {
            let d = tier.durationMs
            for elapsed in [-10_000_000, -600_000, -20_001, -20_000, -1] {
                let clamped = min(d, max(0, d - elapsed))
                let web = d - elapsed                     // what js/modes/patchwerk.js computes
                #expect((clamped <= 0) == (web <= 0), "expiry differs at \(elapsed)")
                #expect((clamped <= config.enrageWindowMs && clamped > 0)
                        == (web <= config.enrageWindowMs && web > 0),
                        "the enrage differs at \(elapsed) on \(tier.id)")
            }
        }
    }

    // MARK: W7 - one timer per run

    @MainActor
    @Test("Re-initialising the view a hundred times makes no timer at all")
    func rebuildingTheViewMakesNoTimer() {
        PatchwerkTicker.resetCounter()
        let dir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("mqi-ticker-\(UUID().uuidString)")
        let session = PatchwerkSession(
            source: StubQuestionSource(catalogue: StubQuestionSource.sampleCatalogue(),
                                       questions: SessionTests.questions()),
            leaderboard: LocalLeaderboard(url: dir.appendingPathComponent("b.json")),
            progress: MQProgressStore.inMemory(),
            player: .init(profile: ProfileID("c"), name: "Charlotte", cast: .unicorn, level: "P4"),
            clock: PatchwerkManualClock(0))
        let m = MQMetrics.device(CGSize(width: 1024, height: 768))

        // SwiftUI re-initialises a view struct on every @Published change. The old
        // shape was `private let ticker = Timer.publish(...).autoconnect()` - a
        // stored property with a default initialiser - so CONSTRUCTING THE VIEW
        // was constructing a publisher, once per tick, forever. Under the
        // @StateObject thunk it costs nothing.
        var views: [PatchwerkFlow] = []
        for _ in 0..<100 { views.append(PatchwerkFlow(session: session, metrics: m)) }
        #expect(views.count == 100)
        #expect(PatchwerkTicker.timersCreated == 0,
                "building the view 100 times created \(PatchwerkTicker.timersCreated) timer(s)")
    }

    @MainActor
    @Test("Starting a hundred times during one run makes exactly one timer")
    func oneTimerPerRun() {
        PatchwerkTicker.resetCounter()
        let ticker = PatchwerkTicker()
        #expect(!ticker.isRunning)

        // Every re-render of a running fight calls start() again. That is the
        // whole point: it must be idempotent.
        for _ in 0..<100 { ticker.start { } }
        #expect(PatchwerkTicker.timersCreated == 1,
                "\(PatchwerkTicker.timersCreated) timers for one run")
        #expect(ticker.isRunning)

        ticker.stop()
        #expect(!ticker.isRunning)
        // Stopping twice is safe; the view does it on both phase change and
        // disappear.
        ticker.stop()
        #expect(PatchwerkTicker.timersCreated == 1)

        // A SECOND run is a second timer, and only a second.
        for _ in 0..<100 { ticker.start { } }
        #expect(PatchwerkTicker.timersCreated == 2)
        ticker.stop()
        #expect(!ticker.isRunning)
    }

    /// The tick reaches the session while a run is on, and NOTHING reaches it
    /// after `stop()`.
    ///
    /// Driven through `fire()` rather than by waiting on the run loop. That is a
    /// deliberate choice and the same one `PatchwerkSession` makes about its own
    /// clock: a headless test binary has no pumped main run loop, so a version of
    /// this that slept for 200 ms passed only when some other suite happened to
    /// have pumped it first - a green light with nothing behind it, which is
    /// exactly what this repository's gate exists to refuse. What W7 is a claim
    /// about is the timer's LIFETIME, and that is asserted here on the real
    /// `Timer`: valid while running, invalid the moment it is stopped, and the
    /// callback released with it.
    @MainActor
    @Test("The tick reaches the run, and nothing reaches it after stop()")
    func tickerDeliversThenStops() {
        PatchwerkTicker.resetCounter()
        let ticker = PatchwerkTicker(interval: 0.01)
        let box = Counter()
        ticker.start { box.n += 1 }
        #expect(ticker.timerIsValid, "start() scheduled no live Timer")

        for _ in 0..<25 { ticker.fire() }
        #expect(box.n == 25)

        ticker.stop()
        #expect(!ticker.timerIsValid, "stop() left a live Timer on the run loop")
        for _ in 0..<25 { ticker.fire() }
        #expect(box.n == 25,
                "the ticker delivered \(box.n - 25) more ticks after stop() - the callback outlived it")
        #expect(PatchwerkTicker.timersCreated == 1)
    }

    @MainActor
    final class Counter { var n = 0 }
}
