import SwiftUI

// =============================================================================
// THE HIT MAP - HOW A HEADLESS DRIVER PRESSES A BUTTON
//
// Quest Refutation, K1's second half: "The driver does not drive the views."
// `QDriver.enter` called `model.press(.digit(n))`, `model.toggleChip(chip)`,
// `model.choose(i)` - model methods, never the `Button` actions in `QBattleView`.
// The wiring was correct by inspection and completely untested, and the
// consequence was the kill: a keypad key drawn 18 pt tall and flush to the
// bottom of a 1024 pt frame - a key a finger cannot hit - typed perfectly in the
// transcript, and the run recorded as a green row.
//
// So this. Every interactive element records the frame it is ACTUALLY DRAWN IN,
// in the screen's own coordinate space, together with the very closure its
// `Button` fires. A tap is then two steps, in this order:
//
//   1. HIT TEST a point against the recorded frames, and against the screen's
//      own bounds. A control drawn off the glass is not hit, and the driver
//      records a MISS.
//   2. INVOKE the closure the hit target holds - which is the same closure the
//      Button holds, not a copy of it and not the model method underneath.
//
// The frames come from a `GeometryReader` inside the recorded view, so they are
// SwiftUI's own layout result rather than a re-derivation of `Geo`. They are
// filled in during a render pass; `QDriver` renders every screen anyway, so the
// map is populated by the same call that writes the PNG.
//
// `--model` still exists and is still fast. The gate uses this path.
// =============================================================================

/// One drawn, tappable thing.
public struct QHitTarget: Sendable {
    public let name: String
    /// The frame SwiftUI laid out, in the screen's coordinate space.
    public let frame: CGRect
    public let enabled: Bool
    /// The Button's own action.
    public let fire: @MainActor @Sendable () async -> Void

    public var centre: CGPoint { CGPoint(x: frame.midX, y: frame.midY) }
}

/// What a screen recorded on its last render.
@MainActor
public final class QHitMap {
    /// The coordinate space every Quest screen publishes.
    public static let space = "quest-screen"

    /// The size of the glass, so a control drawn outside it can be told apart
    /// from one drawn on it.
    public private(set) var screen: CGSize = .zero
    private var order: [String] = []
    private var byName: [String: QHitTarget] = [:]

    public init() {}

    public var targets: [QHitTarget] { order.compactMap { byName[$0] } }

    /// Called by the recorder during layout. Last write wins, so a screen that
    /// redraws replaces its own entries rather than accumulating them.
    public func record(_ name: String, frame: CGRect, enabled: Bool,
                       fire: @escaping @MainActor @Sendable () async -> Void) {
        if byName[name] == nil { order.append(name) }
        byName[name] = QHitTarget(name: name, frame: frame, enabled: enabled, fire: fire)
    }

    public func setScreen(_ size: CGSize) { screen = size }

    /// Everything recorded is cleared before a render, so a stale key from the
    /// previous question can never be tapped.
    public func beginPass() { order.removeAll(); byName.removeAll() }

    public func target(_ name: String) -> QHitTarget? { byName[name] }

    /// Whether the whole of a target's frame is on the glass.
    public func isOnScreen(_ t: QHitTarget) -> Bool {
        guard screen.width > 0, screen.height > 0 else { return false }
        let glass = CGRect(origin: .zero, size: screen)
        // A hair of tolerance: a control laid out to land exactly on the frame
        // edge rounds to a fraction of a point either way under ImageRenderer.
        return glass.insetBy(dx: -0.5, dy: -0.5).contains(t.frame)
    }

    /// The topmost drawn target containing `point`, or nil.
    public func hitTest(_ point: CGPoint) -> QHitTarget? {
        guard screen.width > 0,
              CGRect(origin: .zero, size: screen).contains(point) else { return nil }
        return targets.last { $0.frame.contains(point) }
    }

    /// Why a tap did not happen.
    public enum Miss: Equatable, Sendable, CustomStringConvertible {
        case notDrawn(String)
        case offScreen(String, CGRect, CGSize)
        case disabled(String)
        /// The point is inside the glass but landed on something else, or nothing.
        case hitSomethingElse(String, String?)

        public var description: String {
            switch self {
            case .notDrawn(let n): return "\"\(n)\" was not drawn on this screen"
            case .offScreen(let n, let r, let s):
                return "\"\(n)\" is drawn at \(Self.f(r)) which is off a \(Int(s.width))x\(Int(s.height)) screen"
            case .disabled(let n): return "\"\(n)\" is disabled"
            case .hitSomethingElse(let n, let other):
                return "a tap at the centre of \"\(n)\" landed on "
                    + (other.map { "\"\($0)\"" } ?? "nothing")
            }
        }
        static func f(_ r: CGRect) -> String {
            String(format: "(%.0f, %.0f) %.0fx%.0f", r.minX, r.minY, r.width, r.height)
        }
    }

    /// **The tap.** Hit-test the centre of the named control's drawn bounds, and
    /// fire whatever the hit test found - which must be that control.
    @discardableResult
    public func tap(_ name: String) async -> Miss? {
        guard let t = byName[name] else { return .notDrawn(name) }
        guard isOnScreen(t) else { return .offScreen(name, t.frame, screen) }
        guard t.enabled else { return .disabled(name) }
        guard let hit = hitTest(t.centre) else {
            return .hitSomethingElse(name, nil)
        }
        guard hit.name == name else { return .hitSomethingElse(name, hit.name) }
        await hit.fire()
        return nil
    }
}

// MARK: - The recorder

extension View {
    /// Record this view's drawn frame and its Button action into `map`.
    ///
    /// Applied to the Button itself, so the frame recorded is the frame the
    /// child's finger has to land in - not the label's, and not the `Geo` value
    /// the body started from.
    public func qHit(_ map: QHitMap?, _ name: String, enabled: Bool = true,
                     fire: @escaping @MainActor @Sendable () async -> Void) -> some View {
        background(QHitRecorder(map: map, name: name, enabled: enabled, fire: fire))
    }
}

/// A zero-size backdrop that reports its geometry.
///
/// The recording happens inside the `GeometryReader`'s builder, which is the one
/// place a real laid-out frame is available under `ImageRenderer` (there is no
/// `onAppear` in a headless render pass and preferences are not readable from
/// outside one). It is a deliberate side effect in a view builder, and it is
/// confined to this file and to a driver/gate instrument.
private struct QHitRecorder: View {
    let map: QHitMap?
    let name: String
    let enabled: Bool
    let fire: @MainActor @Sendable () async -> Void

    var body: some View {
        if let map {
            GeometryReader { geo -> Color in
                map.record(name, frame: geo.frame(in: .named(QHitMap.space)),
                           enabled: enabled, fire: fire)
                return Color.clear
            }
        } else {
            Color.clear
        }
    }
}

/// The environment hook, so a screen does not need the map threaded through
/// every initialiser.
public struct QHitMapKey: EnvironmentKey {
    public static let defaultValue: QHitMap? = nil
}

extension EnvironmentValues {
    public var qHitMap: QHitMap? {
        get { self[QHitMapKey.self] }
        set { self[QHitMapKey.self] = newValue }
    }
}
