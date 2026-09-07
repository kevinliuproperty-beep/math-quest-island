import SwiftUI

// MARK: - Tokens
//
// The theme is a VALUE, not a set of dynamic system colors. Two reasons:
//
//  1. It renders deterministically under ImageRenderer on a headless box, where
//     NSColor/UIColor dynamic providers have no reliable appearance to read.
//  2. A design system whose tokens are data can be diffed, tested and snapshot.
//
// Light and dark are not an inversion here. They are the SAME ISLAND at two
// times of day: `.day` is noon (turquoise sky), `.night` is dusk (violet sky).
// That is the subject's own logic, and it means neither mode looks like the
// afterthought.

public struct MQPalette: Sendable, Equatable {
    /// The outline colour. Every plane on screen is cut out of paper and edged
    /// in this. It is a deep violet, never a stand-in for black.
    public var ink: Color
    /// Backdrop gradient, top to bottom (sky -> horizon).
    public var skyTop: Color
    public var skyBottom: Color
    /// The one light plane: the question lives on warm paper.
    public var sand: Color
    /// Text on `sand`.
    public var sandInk: Color
    /// Muted text on `sand` (units, hints, figure placeholder).
    public var sandInkSoft: Color
    /// Text on the sky.
    public var skyInk: Color
    /// Muted text on the sky.
    public var skyInkSoft: Color
    /// A raised plane sitting on the sky (top bar, rails, chips).
    public var plank: Color
    /// The empty part of any bar. A token rather than `ink.opacity(...)`,
    /// because at noon a night-weight trough reads as a hole in the screen.
    public var trough: Color

    /// The star crystal. Primary action, streaks, the thing you collect.
    public var gold: Color
    public var goldInk: Color
    /// Your progress: hero health, timers, correctness.
    public var lagoon: Color
    /// The monster, and only the monster.
    public var coral: Color
    /// Answer keys at rest.
    public var key: Color
    public var keyInk: Color

    public init(ink: Color, skyTop: Color, skyBottom: Color, sand: Color,
                sandInk: Color, sandInkSoft: Color, skyInk: Color, skyInkSoft: Color,
                plank: Color, trough: Color, gold: Color, goldInk: Color,
                lagoon: Color, coral: Color, key: Color, keyInk: Color) {
        self.ink = ink; self.skyTop = skyTop; self.skyBottom = skyBottom
        self.sand = sand; self.sandInk = sandInk; self.sandInkSoft = sandInkSoft
        self.skyInk = skyInk; self.skyInkSoft = skyInkSoft
        self.plank = plank; self.trough = trough
        self.gold = gold; self.goldInk = goldInk; self.lagoon = lagoon
        self.coral = coral; self.key = key; self.keyInk = keyInk
    }
}

public extension MQPalette {
    /// Noon on the island.
    static let day = MQPalette(
        ink:        Color(hex: 0x241C4E),
        skyTop:     Color(hex: 0x2FB6D9),
        skyBottom:  Color(hex: 0x7BE0EA),
        sand:       Color(hex: 0xFFF2D8),
        sandInk:    Color(hex: 0x241C4E),
        sandInkSoft: Color(hex: 0x7A6E52),
        skyInk:     Color(hex: 0x18143A),
        skyInkSoft: Color(hex: 0x3E4C6B),
        plank:      Color(hex: 0xFFFBF0),
        trough:     Color(hex: 0x2C7A93),
        gold:       Color(hex: 0xFFC53D),
        goldInk:    Color(hex: 0x3F2A00),
        lagoon:     Color(hex: 0x11A99C),
        coral:      Color(hex: 0xF0503A),
        // The answer keys stay violet at noon. They are the same physical
        // object in both times of day, and a near-white key on a turquoise sky
        // reads as a disabled field rather than something to hit.
        key:        Color(hex: 0x6B5BD6),
        keyInk:     Color(hex: 0xFFF6E4)
    )

    /// Dusk on the island. The paper is lantern-lit rather than bleached, so a
    /// full-brightness card never flashbangs a kid playing at bedtime.
    static let night = MQPalette(
        ink:        Color(hex: 0x140F30),
        skyTop:     Color(hex: 0x2C1A61),
        skyBottom:  Color(hex: 0x5B3AB8),
        sand:       Color(hex: 0xEFDCB4),
        sandInk:    Color(hex: 0x241C4E),
        sandInkSoft: Color(hex: 0x6E6247),
        skyInk:     Color(hex: 0xFFF6E4),
        skyInkSoft: Color(hex: 0xB6A7E8),
        plank:      Color(hex: 0x3B2A78),
        trough:     Color(hex: 0x1E1546),
        gold:       Color(hex: 0xFFC53D),
        goldInk:    Color(hex: 0x3F2A00),
        lagoon:     Color(hex: 0x22C7B8),
        coral:      Color(hex: 0xFF6A55),
        key:        Color(hex: 0x6B4BD6),
        keyInk:     Color(hex: 0xFFF6E4)
    )
}

// MARK: - Type

/// One family (SF Rounded), worked hard. The scale is modular at ~1.26 from a
/// 13pt base: 13 / 16 / 20 / 26 / 32 / 40 / 52.
///
/// Every numeral in this system is `monospacedDigit`. In a maths game that is
/// not a flourish: it stops `1.05` and `1.5` from shifting between answer keys,
/// so four options can be compared by shape at a glance.
public struct MQType: Sendable, Equatable {
    public var micro: CGFloat      // HP readouts, hints
    public var label: CGFloat      // names, chip text
    public var body: CGFloat       // prose
    public var key: CGFloat        // answer key text
    public var title: CGFloat      // screen titles
    public var question: CGFloat   // the problem itself
    public var display: CGFloat    // results, damage totals

    public init(micro: CGFloat, label: CGFloat, body: CGFloat, key: CGFloat,
                title: CGFloat, question: CGFloat, display: CGFloat) {
        self.micro = micro; self.label = label; self.body = body; self.key = key
        self.title = title; self.question = question; self.display = display
    }

    /// iPhone and any compact width.
    public static let compact = MQType(micro: 13, label: 16, body: 20, key: 26,
                                       title: 32, question: 32, display: 40)
    /// iPad. Not just "bigger" -- the question grows far faster than the
    /// chrome, because the extra room belongs to the maths, not to the frame.
    public static let regular = MQType(micro: 15, label: 19, body: 22, key: 32,
                                       title: 40, question: 50, display: 64)
}

// MARK: - Space, radii, motion

public struct MQSpace: Sendable, Equatable {
    public var xs: CGFloat = 4
    public var s: CGFloat = 8
    public var m: CGFloat = 14
    public var l: CGFloat = 22
    public var xl: CGFloat = 34
    public var xxl: CGFloat = 52
    public init() {}
}

public struct MQRadius: Sendable, Equatable {
    public var chip: CGFloat = 12
    public var key: CGFloat = 18
    public var card: CGFloat = 24
    public var medallion: CGFloat = 999
    public init() {}
}

/// Paper-cut geometry: how thick the ink outline is and how far a plane sits
/// above the one behind it. Pressing a key removes the lift, which is the whole
/// press animation -- the key physically goes down.
public struct MQPaperMetrics: Sendable, Equatable {
    public var stroke: CGFloat = 3
    public var lift: CGFloat = 6
    public var keyLift: CGFloat = 8
    public init() {}
}

public struct MQMotion: Sendable, Equatable {
    /// Key press / release.
    public var press: Double = 0.10
    /// Standard state change.
    public var base: Double = 0.24
    /// HP and progress bars. Slow enough that a kid SEES the damage land.
    public var bar: Double = 0.45
    /// Celebration: crystal pop, monster fall.
    public var celebrate: Double = 0.60
    public init() {}

    public var pressAnim: Animation { .easeOut(duration: press) }
    public var baseAnim: Animation { .easeInOut(duration: base) }
    public var barAnim: Animation { .easeOut(duration: bar) }
    public var celebrateAnim: Animation { .spring(response: celebrate, dampingFraction: 0.55) }
}

// MARK: - Theme

public struct MQTheme: Sendable, Equatable {
    public var palette: MQPalette
    public var type: MQType
    public var space = MQSpace()
    public var radius = MQRadius()
    public var paper = MQPaperMetrics()
    public var motion = MQMotion()

    public init(palette: MQPalette, type: MQType) {
        self.palette = palette
        self.type = type
    }

    /// True on iPhone and any compact width. Components use it to trade padding
    /// for content, never to hide anything a child needs.
    public var isCompact: Bool { type.question <= MQType.compact.question }

    public static let day = MQTheme(palette: .day, type: .compact)
    public static let night = MQTheme(palette: .night, type: .compact)

    public func sized(_ type: MQType) -> MQTheme {
        var copy = self
        copy.type = type
        return copy
    }

    /// The minimum a child's finger is allowed to be asked to hit. Apple says
    /// 44; nothing interactive in this system ships smaller, and answer keys
    /// are deliberately far larger.
    public static let minTapTarget: CGFloat = 44
}

// MARK: - Environment

private struct MQThemeKey: EnvironmentKey {
    static let defaultValue: MQTheme = .night
}

public extension EnvironmentValues {
    var mqTheme: MQTheme {
        get { self[MQThemeKey.self] }
        set { self[MQThemeKey.self] = newValue }
    }
}

public extension View {
    func mqTheme(_ theme: MQTheme) -> some View {
        environment(\.mqTheme, theme)
    }

    /// The one line an app screen needs: follow the system appearance and the
    /// horizontal size class.
    func mqTheme(colorScheme: ColorScheme, compact: Bool = true) -> some View {
        let base: MQTheme = colorScheme == .dark ? .night : .day
        return environment(\.mqTheme, base.sized(compact ? .compact : .regular))
    }
}

// MARK: - Backdrop

/// The island sky. The ONLY gradient in the system -- everything that sits on
/// top of it is a flat plane, which is what keeps text legible at arm's length.
public struct MQSky: View {
    @Environment(\.mqTheme) private var theme
    public init() {}
    public var body: some View {
        LinearGradient(
            colors: [theme.palette.skyTop, theme.palette.skyBottom],
            startPoint: .top, endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}

// MARK: - Color hex

public extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red:   Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue:  Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}
