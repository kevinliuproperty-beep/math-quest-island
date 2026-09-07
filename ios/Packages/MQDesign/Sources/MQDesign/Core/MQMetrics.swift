import SwiftUI

/// Everything a screen needs to know about the glass it is being drawn on, as
/// one value.
///
/// The design lane shipped with two hard-coded devices -- iPad 11" landscape and
/// iPhone 15 -- and every screen derived its type scale from its `MQLayout`.
/// That coupling is exactly what broke on the DEVICE MATRIX: an iPad 9.7"
/// PORTRAIT is `.tall` (the facing band, not the battle line) but it is still a
/// 768 pt-wide iPad, and giving it the phone's 22 pt question because it is
/// "tall" put phone type on a tablet.
///
/// So layout and type are now two independent facts:
///
///  * `layout` is STRUCTURE -- battle line versus facing band, four tiles in a
///    row versus a 2x2 grid. It follows the aspect ratio.
///  * `type` is SCALE -- how big the maths is. It follows the SHORT edge, which
///    is what actually limits how much text fits.
///
/// `size` is here because two screens genuinely need it: the map is full-bleed
/// and fills what it is given, and the battle line has to divide a finite width
/// between two 300 pt creatures and a 620 pt signboard. Passing it beats a
/// `GeometryReader` because the unconstrained fit check then still measures
/// something real -- a `GeometryReader` inside an unbounded proposal reports
/// zero and the gate would measure nothing.
public struct MQMetrics: Sendable, Equatable {
    /// The full drawable size in points, safe areas included.
    public var size: CGSize
    public var layout: MQLayout
    public var type: MQType
    public var insets: MQInsets

    public init(size: CGSize, layout: MQLayout, type: MQType, insets: MQInsets = .none) {
        self.size = size; self.layout = layout; self.type = type; self.insets = insets
    }

    /// The short edge at or above which a screen gets iPad type. 700 pt sits
    /// above every iPhone in portrait (the widest is the Pro Max at 430) and
    /// below every full-screen iPad (the narrowest short edge in the matrix is
    /// the mini's 744), so the split is a hardware split rather than a taste
    /// one. An iPad in Split View lands BELOW it on purpose: half an iPad is a
    /// phone-shaped column and wants phone type.
    public static let regularTypeFloor: CGFloat = 700

    /// Derive both facts from a device size. This is the ONLY place the rules
    /// live; the matrix, the tests and the app all come through here, so a
    /// screen can never be handed a combination the gate has not rendered.
    public static func device(_ size: CGSize, insets: MQInsets = .none) -> MQMetrics {
        MQMetrics(
            size: size,
            layout: size.width > size.height ? .wide : .tall,
            type: min(size.width, size.height) >= regularTypeFloor ? .regular : .compact,
            insets: insets
        )
    }

    /// True when the maths is set at iPad scale. Screens use this for PADDING
    /// and ELEMENT SIZE -- things that should grow with the type -- and use
    /// `layout` for structure. An iPad 9.7" portrait is `regular` and `.tall`:
    /// generous padding, big question, facing band.
    public var isRegular: Bool { type.question >= MQType.regular.question }
    public var isCompact: Bool { !isRegular }

    /// Battle line (creatures flanking the board) versus facing band.
    public var isWide: Bool { layout == .wide }

    /// A frame short enough that the gaps between things are worth more than
    /// the gaps themselves.
    ///
    /// The threshold is the iPhone SE's 667 pt with room above it: the SE is
    /// 185 pt shorter than the iPhone the facing band was authored on, and
    /// scaling the OBJECTS alone still overflowed it by 25 pt. Padding, post
    /// height and inter-element spacing do not need to scale with the art -- on
    /// a short screen they simply need to be smaller, and taking 3 pt off five
    /// gaps is invisible where shrinking the crab another 8% is not.
    public var isShort: Bool { size.height < 720 }

    /// Width available inside the screen's own horizontal padding.
    public func contentWidth(pad: CGFloat) -> CGFloat { size.width - pad * 2 }

    /// Height available inside padding and safe areas.
    public func contentHeight(pad: CGFloat, topFactor: CGFloat, bottomFactor: CGFloat) -> CGFloat {
        size.height - insets.top - insets.bottom - pad * (topFactor + bottomFactor)
    }
}

// MARK: - Tap targets

/// One interactive element, with the size the screen actually gives it.
///
/// The gate needs these as VALUES, not as pixels: nothing can measure a hit
/// region out of a PNG. The contract that makes the audit real is that a
/// screen's `tapTargets(_:)` reads the SAME constants its `body` does -- the
/// numbers are hoisted into one place per screen and used twice. Change the
/// knob size and both the drawing and the audit move together; there is no way
/// to shrink a control past 44 pt and leave the gate green.
public struct MQTapTarget: Sendable, Equatable {
    public var name: String
    public var size: CGSize
    public init(_ name: String, _ size: CGSize) { self.name = name; self.size = size }
    public init(_ name: String, square side: CGFloat) {
        self.init(name, CGSize(width: side, height: side))
    }

    /// The smaller dimension is the one that fails Apple's floor.
    public var least: CGFloat { min(size.width, size.height) }
    public var clearsFloor: Bool { least >= MQTap.min - 0.5 }
}

/// A screen that can declare what a child is allowed to hit on it.
/// `View` is `@MainActor`-isolated, so every screen is too. The audit is pure
/// arithmetic over a size and must be callable from a test, a tool or an actor
/// that is not the main one, hence `nonisolated`.
public protocol MQTapAudited {
    nonisolated static func tapTargets(_ m: MQMetrics) -> [MQTapTarget]
}

// MARK: - Fit measurement

/// The unconstrained-render overflow check, as library code.
///
/// It lived inside the snapshot executable, which meant the tests could not run
/// it and it could only ever be exercised at the two sizes the tool happened to
/// list. It is the single most valuable gate this package has -- it caught a
/// 31 pt overflow, then a 101 pt one, that two careful visual reads had both
/// passed as balanced -- so it belongs where everything can call it.
///
/// Nothing in this app scrolls. A battle screen that scrolls is a worksheet.
/// So content taller than the device is content a child never sees, and that is
/// a build failure rather than a note.
@MainActor
public enum MQFit {

    /// The height the view wants at a fixed width, with height UNCONSTRAINED.
    ///
    /// Rendered at scale 1 and rounded up: the number is only ever compared
    /// against a device height in points, and rendering the measurement pass at
    /// @2x or @3x costs four to nine times the pixels for no extra precision.
    public static func naturalHeight(_ view: some View, width: CGFloat) -> CGFloat? {
        let renderer = ImageRenderer(content: view.frame(width: width))
        renderer.scale = 1
        renderer.proposedSize = ProposedViewSize(width: width, height: nil)
        guard let cg = renderer.cgImage else { return nil }
        return CGFloat(cg.height)
    }

    /// Slack in points: positive fits, negative overflows.
    public static func slack(_ view: some View, in size: CGSize) -> CGFloat? {
        guard let natural = naturalHeight(view, width: size.width) else { return nil }
        return size.height - natural
    }
}
