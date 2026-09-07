import Foundation
import Combine

/// The flow's heartbeat, as an object with a lifetime.
///
/// **Why this is not a `Timer.publish` in the view.** `PatchwerkFlow` used to hold
///
/// ```swift
/// private let ticker = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()
/// ```
///
/// as a stored property on a `struct View`. SwiftUI re-initialises a view struct on
/// every `@Published` change, so every tick published, re-created the struct,
/// created a FRESH `TimerPublisher`, and `onReceive` dropped the old subscription
/// and took a new one - a new timer per tick, on the exact device (iPad 6) whose
/// heat the 100 ms choice was made to avoid. (Refutation, 2026-09-07, W7.)
///
/// A reference type held by `@StateObject` is initialised once per view identity
/// and survives every re-evaluation of the body, which is the whole fix. The
/// object owns a plain `Timer` so it can be `invalidate()`d on demand - a
/// `TimerPublisher` cannot be, which is the other half of why the old shape leaked.
///
/// `timersCreated` is a counter, not decoration: "one timer per run" is a claim
/// about a lifetime, and a lifetime is only testable if something counts it.
@MainActor
public final class PatchwerkTicker: ObservableObject {

    /// Every `Timer` this type has ever scheduled, process-wide. The proof that
    /// re-evaluating a body does not make one.
    public private(set) static var timersCreated = 0

    /// Reset between tests. Never called by the app.
    public static func resetCounter() { timersCreated = 0 }

    /// The HUD reads seconds and a 1,500 ms stun boundary; the fight lasts up to
    /// five minutes and nothing on this screen animates per frame. Waking SwiftUI
    /// sixty times a second to redraw a world of `Canvas` art is how a 9.7" iPad 6
    /// gets hot, so this is a 100 ms `Timer` and not a `TimelineView(.animation)`.
    public let interval: TimeInterval

    private var timer: Timer?
    private var onTick: (() -> Void)?

    public init(interval: TimeInterval = 0.1) { self.interval = interval }

    /// True while a timer is scheduled.
    public var isRunning: Bool { timer != nil }

    /// Start ticking. IDEMPOTENT: calling it again while running replaces only the
    /// callback, never the timer, so a body that evaluates a hundred times still
    /// has exactly one.
    public func start(_ tick: @escaping () -> Void) {
        onTick = tick
        guard timer == nil else { return }
        Self.timersCreated += 1
        let t = Timer(timeInterval: interval, repeats: true) { [weak self] _ in
            // The block already runs on the main run loop; the hop is here so the
            // main-actor isolation is stated to the compiler rather than assumed
            // (`MainActor.assumeIsolated` is iOS 17, and this package's floor is
            // Charlotte's iPad at iOS 16).
            Task { @MainActor in self?.fire() }
        }
        // `.common` so the fight keeps its clock while a scroll or a gesture is
        // tracking. Nothing here scrolls today; a run that silently stopped
        // counting because something else was being touched would be the worst
        // possible bug on a timed mode, and the mode costs nothing.
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    /// True while the scheduled `Timer` is valid. Goes false the moment `stop()`
    /// invalidates it - which is the property `Timer.publish` could not offer,
    /// because a publisher has no `invalidate()`.
    public var timerIsValid: Bool { timer?.isValid ?? false }

    /// One tick. Separate from the block so the timer's closure holds nothing but
    /// a weak self and a hop - and so the lifetime can be tested without asking a
    /// gate to depend on a run loop being pumped.
    public func fire() { onTick?() }

    /// Stop and release. Safe to call when not running, and called on every exit
    /// from the running phase AND on disappear - a timer that outlives the view
    /// that made it is the leak this type exists to prevent.
    ///
    /// There is deliberately no `deinit` doing this: an isolated `deinit` is not
    /// available at this language level, and a nonisolated one touching `timer`
    /// would be the concurrency hole this whole file is about. `stop()` is called
    /// from `.onDisappear`, which is the view's own lifetime.
    public func stop() {
        timer?.invalidate()
        timer = nil
        onTick = nil
    }
}
