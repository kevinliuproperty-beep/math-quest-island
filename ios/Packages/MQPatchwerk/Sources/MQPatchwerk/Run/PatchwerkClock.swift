import Foundation

/// Where the run gets the time from.
///
/// The whole reason this protocol exists: a 5-minute Heroic tier has to be
/// testable in milliseconds. With a clock injected, the suite runs a full fight -
/// enrage window, stun windows, expiry, the lot - by moving an integer, and the
/// test measures the STATE MACHINE rather than a timer's tolerance. Nothing in
/// `PatchwerkRun` ever calls `Date()`.
///
/// Milliseconds as `Int` on purpose: the web keeps elapsed time as an integer
/// number of milliseconds, every comparison in the scoring core is against one
/// (`elapsedMs < stunUntilMs`, `timeLeft <= ENRAGE_WINDOW_MS`), and a `Double`
/// here would introduce a rounding difference the corpus would then have to
/// forgive.
public protocol PatchwerkClock: Sendable {
    /// A monotonic-ish millisecond count. Only DIFFERENCES are used, so the
    /// origin is irrelevant.
    var nowMs: Int { get }
}

/// The device clock: MONOTONIC, and continuous across sleep.
///
/// It used to read `Date()`, and the doc comment defended that: `ProcessInfo`'s
/// `systemUptime` stops during sleep, and an iPad that sleeps mid-run should end
/// the run when it wakes rather than resume a fight the child walked away from.
/// The requirement was right; the clock was not. Measured on 2026-09-07: drive the
/// wall clock backwards ten minutes mid-run on the two-minute tier and
/// `timeLeftMs` became **700,000 on a 120,000 ms tier**, phase still `.running`,
/// five further answers scored onto a board a sibling reads. Every device on
/// earth moves its wall clock - NTP steps it, a timezone tool sets it, and a
/// child can set it by hand in Settings while a run is going.
///
/// `CLOCK_MONOTONIC_RAW` on Darwin is exactly what was wanted and `Date()` was
/// standing in for: it cannot be set, it never runs backwards, and unlike
/// `CLOCK_UPTIME_RAW`/`mach_absolute_time` it DOES keep counting while the system
/// is asleep - so the sleep behaviour the old comment argued for is preserved
/// while the hole is closed. (This is `ContinuousClock`'s own source; the C call
/// is used because it yields an absolute nanosecond count with no per-instance
/// origin, so two `PatchwerkSystemClock` values are interchangeable - which the
/// run relies on, since it stores `startedAtMs` from one and reads `nowMs` from
/// whichever it is handed later.)
///
/// **Web parity note.** `js/modes/patchwerk.js` computes `Date.now() - t0` and has
/// the identical hole. We are deliberately STRICTER than the web here, and it
/// cannot affect scoring parity: the parity corpus supplies every timestamp
/// explicitly (`PatchwerkRun.answer(_:level:answerMs:at:)`), so the clock source
/// is never on the corpus's path. The web posts no Patchwerk score anywhere;
/// iOS persists one to a local board, which is why the two runtimes may differ
/// on this and only this.
public struct PatchwerkSystemClock: PatchwerkClock {
    public init() {}
    public var nowMs: Int {
        Int(clock_gettime_nsec_np(CLOCK_MONOTONIC_RAW) / 1_000_000)
    }
}

/// A clock the tests drive by hand.
///
/// `@unchecked Sendable` behind a lock rather than an actor: the clock is read
/// synchronously from inside the run's scoring path, and an `await` in the middle
/// of scoring an answer would be a concurrency seam in the one place that must
/// stay a straight line.
public final class PatchwerkManualClock: PatchwerkClock, @unchecked Sendable {
    private let lock = NSLock()
    private var ms: Int

    public init(_ ms: Int = 0) { self.ms = ms }

    public var nowMs: Int {
        lock.lock(); defer { lock.unlock() }
        return ms
    }

    /// Move forward. Negative is allowed and is not a mistake: it is how a test
    /// reproduces the out-of-order timestamps the web's shell can genuinely
    /// deliver (the corpus has a run of them).
    public func advance(_ by: Int) {
        lock.lock(); defer { lock.unlock() }
        ms += by
    }

    public func set(_ value: Int) {
        lock.lock(); defer { lock.unlock() }
        ms = value
    }
}
