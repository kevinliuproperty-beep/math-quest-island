import SwiftUI

// MARK: - Paper-cut surfaces
//
// Everything visible in this system is a flat plane cut out of paper: solid
// fill, hard ink outline, and a hard offset shadow of the same ink so the plane
// reads as sitting ABOVE the one behind it. No blur, no material, no soft grey
// drop shadow.
//
// Two payoffs beyond the look:
//   - Contrast is predictable, so a question is legible at arm's length in
//     sunlight, which translucent-white-on-purple never was.
//   - It renders pixel-identically under ImageRenderer on a headless box.
//     Blur and .ultraThinMaterial do not.

public struct MQPaperStyle {
    public var fill: Color
    public var ink: Color
    public var stroke: CGFloat
    public var lift: CGFloat

    public init(fill: Color, ink: Color, stroke: CGFloat, lift: CGFloat) {
        self.fill = fill; self.ink = ink; self.stroke = stroke; self.lift = lift
    }
}

public struct MQPaperBackground<S: InsettableShape>: View {
    let shape: S
    let style: MQPaperStyle

    public init(shape: S, style: MQPaperStyle) {
        self.shape = shape
        self.style = style
    }

    public var body: some View {
        ZStack {
            // The cast edge. A hard copy of the silhouette, not a blur.
            shape.fill(style.ink).offset(y: style.lift)
            shape.fill(style.fill)
            shape.strokeBorder(style.ink, lineWidth: style.stroke)
        }
    }
}

public extension View {
    /// Cut this view out of paper.
    func mqPaper<S: InsettableShape>(
        _ shape: S,
        fill: Color,
        ink: Color,
        stroke: CGFloat,
        lift: CGFloat
    ) -> some View {
        background(
            MQPaperBackground(
                shape: shape,
                style: MQPaperStyle(fill: fill, ink: ink, stroke: stroke, lift: lift)
            )
        )
        // Leave room for the cast edge so stacked planes never overlap it.
        .padding(.bottom, lift)
    }
}

// MARK: - Numerals
//
// Every number in a maths game is monospaced-digit. See MQType.

public extension View {
    func mqNumerals() -> some View {
        monospacedDigit()
    }
}

public extension Font {
    static func mq(_ size: CGFloat, _ weight: Font.Weight) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
}

// MARK: - Haptics
//
// The only platform-forked surface in the package. Every component calls into
// this; nothing else in MQDesign touches UIKit.

public enum MQHaptics {
    public enum Kind { case tap, correct, wrong, crystal }

    public static func fire(_ kind: Kind) {
        #if canImport(UIKit) && !os(watchOS)
        _fire(kind)
        #endif
    }
}

#if canImport(UIKit) && !os(watchOS)
import UIKit

private extension MQHaptics {
    @MainActor
    static func _fireOnMain(_ kind: Kind) {
        switch kind {
        case .tap:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .correct:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .wrong:
            // Deliberately NOT .error. A wrong answer in this game is a soft
            // nudge, never a buzz of failure -- see the kid-safety rule in the
            // Patchwerk design note.
            UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        case .crystal:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        }
    }

    static func _fire(_ kind: Kind) {
        if Thread.isMainThread {
            MainActor.assumeIsolated { _fireOnMain(kind) }
        } else {
            DispatchQueue.main.async { _fireOnMain(kind) }
        }
    }
}
#endif
