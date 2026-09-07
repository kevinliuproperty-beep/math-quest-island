import SwiftUI

/// The only way to get a control's REAL rect out of a rendered screen.
///
/// `MQMetrics`'s tap-target note says a hit region cannot be measured out of a
/// PNG, and that is true of an invisible one. This makes it visible on demand:
/// arm a probe, render, and the control's layout frame comes out as a block of a
/// colour that occurs nowhere in the beach palette, which a test bounding-boxes
/// out of the pixels.
///
/// **Why it lives in the shipped package rather than in a test.** The lane's
/// overlay test used to assert `PatchwerkRunView.tileSize(m) ==
/// MQPatchwerkScreen.tapTargets(m)...size` - and `tileSize(m)` is implemented as
/// exactly that expression, so it asserted `X == X`. Under that tautology the
/// pause knob's hit rect sat 5-8 pt above the drawn knob at all twelve device
/// sizes, unnoticed. (Refutation, 2026-09-07.) The comparison that catches that
/// class of defect has to be DRAWN-vs-DECLARED on real pixels, and the drawn side
/// can only be tinted from inside the package that draws it.
///
/// **Nothing changes unless a probe is armed.** Both flags default to false, and
/// both view builders return `Color.clear` when off, so the shipping app renders
/// byte-for-byte what it rendered before this file existed. The negative control
/// in `HUDPixelTests` proves that: with both probes off, no probe colour is
/// anywhere in the render.
public enum MQProbe {

    /// Tint the DRAWN screen's own controls.
    nonisolated(unsafe) public static var screenOn = false

    /// Tint a feature lane's transparent interaction overlay.
    nonisolated(unsafe) public static var overlayOn = false

    /// Five saturated colours that occur nowhere in `MQPalette`.
    public static let rgb: [(Double, Double, Double)] = [
        (1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 1, 0), (1, 0, 1)
    ]

    public static func color(_ i: Int) -> Color {
        let c = rgb[i % rgb.count]
        return Color(.sRGB, red: c.0, green: c.1, blue: c.2, opacity: 1)
    }

    /// Index 0...3 = the answer tiles, 4 = the pause knob.
    @ViewBuilder public static func screenTint(_ i: Int) -> some View {
        if screenOn { color(i) } else { Color.clear }
    }

    @ViewBuilder public static func overlayTint(_ i: Int) -> some View {
        if overlayOn { color(i) } else { Color.clear }
    }

    /// Run `body` with exactly one side armed, then disarm. Both flags are global,
    /// so a test that throws mid-render must not leave the app tinted.
    @MainActor
    public static func armed<T>(screen: Bool, overlay: Bool, _ body: () throws -> T) rethrows -> T {
        screenOn = screen; overlayOn = overlay
        defer { screenOn = false; overlayOn = false }
        return try body()
    }
}
