import SwiftUI

/// The numeric half of the theme: type scale, spacing, motion, tap floor.
///
/// Kept as VALUES rather than as scattered literals so a screen can be sized for
/// a device by passing one struct, and so a future lane can diff the system
/// instead of grepping for magic numbers. This is the part of the first
/// sample's token architecture that survived the rework; the paper-cut colour
/// and component layers did not.

// MARK: - Type

/// One family: **Baloo 2** (Ek Type, OFL, bundled). A rounded face with a
/// hand-cut wobble in the terminals and a very tall x-height -- warm, storybook,
/// slightly imperfect, and crucially NOT SF Rounded, which is the platform's own
/// toy voice and therefore also every other kid app's toy voice.
///
/// The scale is modular at ~1.26. Baloo's tall x-height means it reads about a
/// size larger than SF at the same point value, so the numbers here are smaller
/// than the first sample's and the rendered result is bigger.
///
/// Every numeral in the system is `monospacedDigit`. In a maths game that is not
/// a flourish: it stops `1.05` and `1.5` shifting between answer tiles, so four
/// options can be compared by shape at a glance.
public struct MQType: Sendable, Equatable {
    /// HP readouts, units, dimension labels.
    public var micro: CGFloat
    /// Names, chip text, node labels.
    public var label: CGFloat
    /// Prose: explanations, blurbs, the parent-facing line.
    public var body: CGFloat
    /// Answer tile text.
    public var tile: CGFloat
    /// Screen titles.
    public var title: CGFloat
    /// The problem itself.
    public var question: CGFloat
    /// One number that is the whole point of a screen: damage, score.
    public var display: CGFloat

    public init(micro: CGFloat, label: CGFloat, body: CGFloat, tile: CGFloat,
                title: CGFloat, question: CGFloat, display: CGFloat) {
        self.micro = micro; self.label = label; self.body = body
        self.tile = tile; self.title = title
        self.question = question; self.display = display
    }

    /// iPhone and any compact width.
    public static let compact = MQType(micro: 12, label: 15, body: 17, tile: 27,
                                       title: 30, question: 22, display: 48)

    /// iPad. Not simply "bigger": the question and the display number grow far
    /// faster than the chrome, because the extra room belongs to the maths.
    public static let regular = MQType(micro: 15, label: 19, body: 22, tile: 34,
                                       title: 44, question: 34, display: 78)
}

// MARK: - Space and motion

public struct MQSpace: Sendable, Equatable {
    public var xs: CGFloat = 4
    public var s: CGFloat = 8
    public var m: CGFloat = 14
    public var l: CGFloat = 22
    public var xl: CGFloat = 34
    public var xxl: CGFloat = 52
    public init() {}
}

public struct MQMotion: Sendable, Equatable {
    /// Tile press and release.
    public var press: Double = 0.10
    /// Standard state change.
    public var base: Double = 0.24
    /// Health and damage bars. Slow enough that a child SEES the hit land.
    public var bar: Double = 0.45
    /// Crystal pop, monster sitting down at the end of a quest.
    public var celebrate: Double = 0.60
    public init() {}

    public var pressAnim: Animation { .easeOut(duration: press) }
    public var baseAnim: Animation { .easeInOut(duration: base) }
    public var barAnim: Animation { .easeOut(duration: bar) }
    public var celebrateAnim: Animation { .spring(response: celebrate, dampingFraction: 0.55) }
}

// MARK: - Theme

/// Palette + scale, as one value a screen is built from.
public struct MQTheme: Sendable, Equatable {
    public var palette: MQPalette
    public var type: MQType
    public var space = MQSpace()
    public var motion = MQMotion()

    public init(palette: MQPalette = .noon, type: MQType = .regular) {
        self.palette = palette
        self.type = type
    }

    /// True on iPhone and any compact width. Screens use it to trade padding and
    /// chrome for content -- never to hide anything a child needs.
    public var isCompact: Bool { type.question <= MQType.compact.question }

    public func palette(_ p: MQPalette) -> MQTheme {
        var copy = self; copy.palette = p; return copy
    }
}

private struct MQThemeKey: EnvironmentKey {
    static let defaultValue = MQTheme()
}

public extension EnvironmentValues {
    var mqTheme: MQTheme {
        get { self[MQThemeKey.self] }
        set { self[MQThemeKey.self] = newValue }
    }
}

public extension View {
    func mqTheme(_ theme: MQTheme) -> some View { environment(\.mqTheme, theme) }
}

// MARK: - Fonts, as the design speaks about them

public extension Font {
    /// `.mq(theme.type.question)` rather than `.custom("Baloo2-SemiBold", size:)`
    /// at 40 call sites. Weight names are the design's, not CoreText's.
    static func mq(_ size: CGFloat, _ weight: MQWeight = .semibold) -> Font {
        .custom(weight.face, size: size)
    }
}

public enum MQWeight: Sendable {
    case regular, medium, semibold, bold, extrabold

    var face: String {
        switch self {
        case .regular:   return MQFonts.Baloo.regular
        case .medium:    return MQFonts.Baloo.medium
        case .semibold:  return MQFonts.Baloo.semibold
        case .bold:      return MQFonts.Baloo.bold
        case .extrabold: return MQFonts.Baloo.extrabold
        }
    }
}

// MARK: - Tap floor

/// Apple says 44pt. Nothing interactive in this system ships smaller, and the
/// things a child hits most -- answer tiles, map nodes, hero tokens -- are
/// deliberately far larger than the floor.
public enum MQTap {
    public static let min: CGFloat = 44
}
