import Foundation

/// mulberry32, the PRNG the web's Patchwerk self-test and the parity corpus
/// generator both use.
///
/// Mirrored rather than replaced by `SystemRandomNumberGenerator` for one
/// reason: a feed test has to be able to say "this exact sequence of topics and
/// pools", and an unseeded generator makes every feed assertion a probabilistic
/// one. The app itself seeds it from the clock, so a child does not get the same
/// fight twice.
///
/// The arithmetic is JavaScript's, done with wrapping operators so the Int32
/// overflow behaviour is identical rather than a trap.
public struct PatchwerkRNG: Sendable {
    /// Held unsigned. JavaScript does this arithmetic on signed 32-bit ints, but
    /// every operation involved (`+`, `imul`, `^`, `|`, `>>>`) agrees bit for bit
    /// modulo 2^32, and the final step is an unsigned shift anyway - so the
    /// unsigned register is the same register, with no sign traps in it.
    private var seed: UInt32

    public init(seed: Int32) { self.seed = UInt32(bitPattern: seed) }

    /// Seeded from the clock. Used by the app; never by a test.
    public init(clock: PatchwerkClock = PatchwerkSystemClock()) {
        self.seed = UInt32(truncatingIfNeeded: clock.nowMs)
    }

    /// 0 ..< 1.
    public mutating func next() -> Double {
        seed = seed &+ 0x6D2B79F5
        var t: UInt32 = seed ^ (seed >> 15)
        t = t &* (seed | 1)
        t = (t &+ ((t ^ (t >> 7)) &* (t | 61))) ^ t
        return Double(t ^ (t >> 14)) / 4294967296.0
    }

    /// One element, uniformly. Empty in, nil out - never a crash on the child's
    /// path because a topic list came back empty.
    public mutating func pick<T>(_ items: [T]) -> T? {
        guard !items.isEmpty else { return nil }
        return items[Int(next() * Double(items.count)) % items.count]
    }
}
