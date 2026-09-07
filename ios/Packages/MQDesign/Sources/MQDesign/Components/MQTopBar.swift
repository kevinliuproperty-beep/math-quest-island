import SwiftUI

/// A fighter's portrait: the sprite set into a cut-paper medallion so it reads
/// as a designed token rather than a loose glyph, with the class level as a
/// badge the way a game shows a character's rank.
public struct MQAvatar: View {
    @Environment(\.mqTheme) private var theme

    private let sprite: String
    private let level: String?
    private let size: CGFloat
    private let ring: Color?

    public init(sprite: String, level: String? = nil, size: CGFloat = 56, ring: Color? = nil) {
        self.sprite = sprite
        self.level = level
        self.size = size
        self.ring = ring
    }

    public var body: some View {
        let ink = theme.palette.ink
        ZStack(alignment: .bottomTrailing) {
            Text(sprite)
                .font(.system(size: size * 0.56))
                .frame(width: size, height: size)
                .background(
                    ZStack {
                        Circle().fill(ink).offset(y: theme.paper.lift * 0.6)
                        // Plank first, THEN the tint. A translucent ring drawn
                        // straight onto the stack shows the ink cast edge
                        // through itself and reads as a dirty grey disc.
                        Circle().fill(theme.palette.plank)
                        if let ring { Circle().fill(ring) }
                        Circle().strokeBorder(ink, lineWidth: theme.paper.stroke)
                    }
                )

            if let level {
                Text(level)
                    .font(.mq(max(11, size * 0.21), .black))
                    .foregroundStyle(theme.palette.goldInk)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(
                        ZStack {
                            Capsule().fill(theme.palette.gold)
                            Capsule().strokeBorder(ink, lineWidth: theme.paper.stroke * 0.75)
                        }
                    )
                    .offset(x: size * 0.10, y: theme.paper.lift * 0.6 + 2)
            }
        }
        .padding(.bottom, theme.paper.lift * 0.6)
        .accessibilityElement()
        .accessibilityLabel(Text(level.map { "Hero, class \($0)" } ?? "Hero"))
    }
}

/// The streak chip. Absent below 2 in a row -- a streak of one is not a streak,
/// and a chip that is always on stops meaning anything.
public struct MQStreakChip: View {
    @Environment(\.mqTheme) private var theme
    private let count: Int

    public init(count: Int) { self.count = count }

    public var body: some View {
        if count >= 2 {
            HStack(spacing: theme.space.xs) {
                Image(systemName: "flame.fill")
                    .font(.system(size: theme.type.body, weight: .black))
                Text("\(count)")
                    .font(.mq(theme.type.key, .black))
                    .mqNumerals()
            }
            .foregroundStyle(theme.palette.goldInk)
            .padding(.horizontal, theme.space.m)
            .frame(height: max(48, theme.type.key + 16))
            .mqPaper(
                Capsule(),
                fill: theme.palette.gold,
                ink: theme.palette.ink,
                stroke: theme.paper.stroke,
                lift: theme.paper.lift * 0.6
            )
            .accessibilityElement()
            .accessibilityLabel(Text("\(count) in a row"))
        }
    }
}

/// The run's chrome. Who you are, how far through the island you have got, and
/// the way out. Health is deliberately NOT here: it belongs on the fighter in
/// the arena, not in the frame.
public struct MQTopBar: View {
    @Environment(\.mqTheme) private var theme

    private let heroSprite: String
    private let heroName: String
    private let level: String
    private let questName: String
    private let crystals: Int
    private let crystalsTotal: Int
    private let streak: Int
    private let onPause: () -> Void

    public init(heroSprite: String, heroName: String, level: String,
                questName: String, crystals: Int, crystalsTotal: Int,
                streak: Int, onPause: @escaping () -> Void = {}) {
        self.heroSprite = heroSprite; self.heroName = heroName; self.level = level
        self.questName = questName; self.crystals = crystals
        self.crystalsTotal = crystalsTotal; self.streak = streak; self.onPause = onPause
    }

    private var crystalBar: some View {
        MQBar(value: Double(crystals) / Double(max(crystalsTotal, 1)),
              role: .crystal, segments: crystalsTotal, height: 18)
    }

    public var body: some View {
        // On a phone the name stacks OVER the crystal bar and they share the
        // flexible middle, because five things laid side by side across 393pt
        // is how a top bar ends up clipped.
        HStack(spacing: theme.isCompact ? theme.space.s : theme.space.m) {
            MQAvatar(sprite: heroSprite, level: level,
                     size: theme.isCompact ? 50 : 58, ring: theme.palette.plank)

            if theme.isCompact {
                VStack(alignment: .leading, spacing: 3) {
                    Text(heroName)
                        .font(.mq(theme.type.label, .heavy))
                        .foregroundStyle(theme.palette.skyInk)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    crystalBar
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    Text(heroName)
                        .font(.mq(theme.type.label, .heavy))
                        .foregroundStyle(theme.palette.skyInk)
                        .lineLimit(1)
                    Text(questName)
                        .font(.mq(theme.type.micro, .semibold))
                        .foregroundStyle(theme.palette.skyInkSoft)
                        .lineLimit(1)
                }
                .fixedSize(horizontal: true, vertical: false)

                Spacer(minLength: theme.space.m)

                // Capped. Quest progress is chrome; it must never be the widest
                // object on the screen.
                HStack(spacing: theme.space.s) {
                    Image(systemName: "sparkles")
                        .font(.system(size: theme.type.label, weight: .black))
                        .foregroundStyle(theme.palette.gold)
                    crystalBar
                    Text("\(crystals) of \(crystalsTotal)")
                        .font(.mq(theme.type.micro, .bold))
                        .mqNumerals()
                        .foregroundStyle(theme.palette.skyInkSoft)
                        .fixedSize()
                }
                .frame(maxWidth: 300)

                Spacer(minLength: theme.space.m)
            }

            MQStreakChip(count: streak)

            MQIconButton(systemName: "pause.fill", label: "Pause the quest", action: onPause)
        }
    }
}
