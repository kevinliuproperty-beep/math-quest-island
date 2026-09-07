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

/// The device clock.
///
/// `Date` rather than a monotonic source deliberately: `ProcessInfo`'s
/// `systemUptime` stops during sleep, and an iPad that sleeps mid-run should end
/// the run when it wakes, not resume a fight the child walked away from.
public struct PatchwerkSystemClock: PatchwerkClock {
    public init() {}
    public var nowMs: Int { Int((Date().timeIntervalSince1970 * 1000).rounded()) }
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
