import Foundation

/// `ri(a, b)` from `js/core.js`, as a Swift seam.
///
/// ```js
/// function ri(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
/// ```
///
/// Inclusive at both ends. The whole reason this is a protocol and not a call to
/// `Int.random` is the headless driver: a scripted session has to produce the
/// same transcript twice, and the web's damage rolls are the only randomness on
/// the Quest side of the app. Seed it and a driven run is reproducible; use the
/// system source and a child gets the web's own variation.
public protocol QRandom: AnyObject, Sendable {
    /// `a...b`, inclusive, exactly like `ri`.
    func ri(_ a: Int, _ b: Int) -> Int
}

/// The app's source. Not seeded, not reproducible, and that is correct on glass.
public final class QSystemRandom: QRandom {
    public init() {}
    public func ri(_ a: Int, _ b: Int) -> Int {
        guard b > a else { return a }
        return Int.random(in: a...b)
    }
}

/// SplitMix64. Small, fast, and - the property that matters here - identical on
/// every machine and every Swift version, because it is plain integer arithmetic
/// rather than a call into the platform's generator. A transcript recorded on Kai
/// therefore replays on Supreme.
///
/// `@unchecked Sendable` with a lock rather than an actor: `ri` is called from
/// inside the flow model's `@MainActor` body and turning it into an `await`
/// would make the damage roll a suspension point in the middle of applying one
/// answer - which is exactly where a second answer could interleave.
public final class QSeededRandom: QRandom, @unchecked Sendable {
    private let lock = NSLock()
    private var state: UInt64

    public init(seed: UInt64) { self.state = seed }

    public func next() -> UInt64 {
        lock.lock(); defer { lock.unlock() }
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    public func ri(_ a: Int, _ b: Int) -> Int {
        guard b > a else { return a }
        let span = UInt64(b - a + 1)
        return a + Int(next() % span)
    }
}
