import SwiftUI
import MQDesign

/// Choose your boss. Three fights, and the choice is the whole setting screen -
/// Patchwerk has no options, no difficulty slider and no toggles.
///
/// **The hourglass trap is the reason this screen has a `geometry` section.**
/// `MQHourglass` is FOUR TIMES its `size` tall when it is given less than about
/// 140 pt of width: `2:47` breaks between characters and stacks four lines
/// underneath the glass. PHASE1.md pins it in a test and tells this lane not to
/// put one in a narrow column. So the glass gets an explicit width here, floored
/// well clear of the cliff, and a test asserts the floor rather than trusting the
/// layout to stay generous.
public struct PatchwerkTierPicker: View, MQTapAudited {

    let tiers: [PatchwerkConfig.Tier]
    let selected: String
    let level: String
    let m: MQMetrics
    let p: MQPalette
    var onSelect: (String) -> Void = { _ in }
    var onFight: () -> Void = {}
    var onBoard: () -> Void = {}
    var onBack: () -> Void = {}

    public init(tiers: [PatchwerkConfig.Tier], selected: String, level: String,
                metrics: MQMetrics, palette: MQPalette = .noon,
                onSelect: @escaping (String) -> Void = { _ in },
                onFight: @escaping () -> Void = {},
                onBoard: @escaping () -> Void = {},
                onBack: @escaping () -> Void = {}) {
        self.tiers = tiers; self.selected = selected; self.level = level
        self.m = metrics; self.p = palette
        self.onSelect = onSelect; self.onFight = onFight
        self.onBoard = onBoard; self.onBack = onBack
    }

    // MARK: Geometry - every interactive size lives here and is drawn FROM here,
    // which is the only way the tap audit can see it.

    nonisolated static func pad(_ m: MQMetrics) -> CGFloat { m.isRegular ? 30 : 16 }

    /// Cards across on a wide frame, stacked on a tall one.
    nonisolated static func acrossThreeUp(_ m: MQMetrics) -> Bool { m.isWide }

    nonisolated static func cardSize(_ m: MQMetrics) -> CGSize {
        let content = m.size.width - pad(m) * 2
        if acrossThreeUp(m) {
            let gap: CGFloat = 18
            return CGSize(width: (content - gap * 2) / 3,
                          height: min(max(m.size.height * 0.34, 190), 280))
        }
        return CGSize(width: content, height: m.isShort ? 92 : 110)
    }

    /// The hourglass's own column. Never below `hourglassFloor`.
    nonisolated static let hourglassFloor: CGFloat = 150

    nonisolated static func hourglassWidth(_ m: MQMetrics) -> CGFloat {
        let card = cardSize(m)
        // Three-up: the glass sits above the words and takes the card's inner
        // width. Stacked: it sits beside them in a fixed column. Both are floored.
        let natural = acrossThreeUp(m) ? card.width - 32 : 156
        return max(hourglassFloor, natural)
    }

    nonisolated static func hourglassSize(_ m: MQMetrics) -> CGFloat {
        m.isRegular ? (acrossThreeUp(m) ? 76 : 62) : 52
    }

    nonisolated static func buttonSize(_ m: MQMetrics) -> CGSize {
        CGSize(width: m.isRegular ? 300 : min(260, m.size.width - pad(m) * 2),
               height: m.isRegular ? 64 : 56)
    }

    nonisolated static func knobSize(_ m: MQMetrics) -> CGFloat { m.isRegular ? 50 : 46 }

    /// The dummy waiting in the middle of the screen. Scenery, so it is the first
    /// thing to yield on a short frame - the cards and the buttons do not.
    nonisolated static func dummyWidth(_ m: MQMetrics) -> CGFloat {
        let byWidth = m.size.width * (m.isWide ? 0.26 : 0.42)
        let cap: CGFloat = m.isRegular ? 300 : 190
        return min(byWidth, cap, m.size.height * (m.isShort ? 0.24 : 0.30))
    }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        let card = cardSize(m)
        let button = buttonSize(m)
        return [MQTapTarget("back", square: knobSize(m))]
            + (1...3).map { MQTapTarget("tier \($0)", card) }
            + [MQTapTarget("fight", button), MQTapTarget("hall of fame", button)]
    }

    // MARK: Body

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: m.isWide ? 0.30 : 0.28)
            VStack(spacing: m.isShort ? 10 : (m.isRegular ? 22 : 14)) {
                header
                cards
                Spacer(minLength: 0)
                // The boss you are choosing to fight, standing in the middle of
                // the screen. Without him this is a row of buttons on a
                // wallpaper - the exact verdict the design lane gave the first
                // entrance screen - and the empty sand is the biggest thing on
                // the frame.
                MQCrab(p)
                    .frame(width: Self.dummyWidth(m),
                           height: Self.dummyWidth(m)
                               * MQCreature.box(.crab).height / MQCreature.box(.crab).width)
                Spacer(minLength: 0)
                buttons
            }
            .padding(.horizontal, Self.pad(m))
            .padding(.top, m.insets.top + Self.pad(m) * 0.6)
            .padding(.bottom, m.insets.bottom + Self.pad(m) * 0.6)
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 14) {
            Button(action: onBack) { MQKnob(p, .back, size: Self.knobSize(m)) }
                .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 2) {
                Text("Choose your boss")
                    .font(.mq(m.isRegular ? 30 : 22, .extrabold))
                    .foregroundStyle(p.carved)
                    .shadow(color: p.woodDeep.opacity(0.8), radius: 0, x: 0, y: 2)
                Text("The dummy never dies. The clock is the fight - \(level).")
                    .font(.mq(m.isRegular ? 17 : 13, .semibold))
                    .foregroundStyle(p.carved.opacity(0.85))
            }
            Spacer(minLength: 0)
        }
    }

    private var cards: some View {
        Group {
            if Self.acrossThreeUp(m) {
                HStack(spacing: 18) { ForEach(tiers) { card($0) } }
            } else {
                VStack(spacing: m.isShort ? 8 : 12) { ForEach(tiers) { card($0) } }
            }
        }
    }

    private func card(_ tier: PatchwerkConfig.Tier) -> some View {
        let size = Self.cardSize(m)
        let on = tier.id == selected
        return Button { onSelect(tier.id) } label: {
            MQTag(p) {
                Group {
                    if Self.acrossThreeUp(m) {
                        VStack(spacing: 8) {
                            glass(tier)
                            title(tier, on: on)
                            Text(blurb(tier))
                                .font(.mq(m.isRegular ? 14 : 12, .semibold))
                                .foregroundStyle(p.carved.opacity(0.8))
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                        }
                    } else {
                        HStack(spacing: 12) {
                            glass(tier)
                            VStack(alignment: .leading, spacing: 2) {
                                title(tier, on: on)
                                Text(blurb(tier))
                                    .font(.mq(m.isRegular ? 14 : 12, .semibold))
                                    .foregroundStyle(p.carved.opacity(0.8))
                                    .lineLimit(2)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(width: size.width, height: size.height)
            }
            .overlay {
                // The selected fight is ringed in gold. No checkbox, no radio dot:
                // a child reads "this is the one" from the light on it.
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(on ? p.gold : Color.clear, lineWidth: 4)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func glass(_ tier: PatchwerkConfig.Tier) -> some View {
        MQHourglass(p, time: PatchwerkRun.clockLabel(ms: tier.durationMs),
                    fraction: 1, size: Self.hourglassSize(m))
            .frame(width: Self.hourglassWidth(m))
    }

    private func title(_ tier: PatchwerkConfig.Tier, on: Bool) -> some View {
        Text("\(tier.label) - \(tier.minutesLabel)")
            .font(.mq(m.isRegular ? 21 : 17, .extrabold))
            .foregroundStyle(on ? p.gold : p.carved)
            .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 1.5)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }

    /// Kid-readable, and honest about what each tier is FOR.
    private func blurb(_ tier: PatchwerkConfig.Tier) -> String {
        switch tier.id {
        case "short":  return "A quick swing. Good for one go before dinner."
        case "long":   return "The long fight. Stacks have time to cap twice."
        default:       return "The proper fight. Long enough for the enrage to matter."
        }
    }

    private var buttons: some View {
        let size = Self.buttonSize(m)
        return Group {
            if m.isWide {
                HStack(spacing: 18) {
                    Button(action: onFight) {
                        MQPlankButton(p, "Fight", primary: true, fontSize: m.isRegular ? 24 : 20)
                            .frame(width: size.width, height: size.height)
                    }.buttonStyle(.plain)
                    Button(action: onBoard) {
                        MQPlankButton(p, "Hall of Fame", fontSize: m.isRegular ? 20 : 17)
                            .frame(width: size.width, height: size.height)
                    }.buttonStyle(.plain)
                }
            } else {
                VStack(spacing: m.isShort ? 8 : 12) {
                    Button(action: onFight) {
                        MQPlankButton(p, "Fight", primary: true, fontSize: m.isRegular ? 24 : 20)
                            .frame(width: size.width, height: size.height)
                    }.buttonStyle(.plain)
                    Button(action: onBoard) {
                        MQPlankButton(p, "Hall of Fame", fontSize: m.isRegular ? 20 : 17)
                            .frame(width: size.width, height: size.height)
                    }.buttonStyle(.plain)
                }
            }
        }
    }
}
