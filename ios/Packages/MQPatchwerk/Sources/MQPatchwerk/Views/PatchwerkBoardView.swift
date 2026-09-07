import SwiftUI
import MQDesign
import MQServices

/// The device board, one tier at a time.
///
/// **A tier chip is not a filter, it is the board.** Damage from a 5-minute
/// Heroic run and damage from a 2-minute Trash Pull are not the same quantity,
/// so there is no "all tiers" view to build a wrong intuition from. The class
/// level is fixed to the child playing, for the same reason.
///
/// Nothing on this screen scrolls: this app has no scroll views, and a board a
/// child has to drag is a leaderboard for adults. The top rows are shown, the
/// rest are kept (20 per bucket) and simply not drawn.
public struct PatchwerkBoardView: View, MQTapAudited {

    let tiers: [PatchwerkConfig.Tier]
    let selected: String
    let level: String
    let rows: [LeaderboardEntry]
    let highlight: String?
    let m: MQMetrics
    let p: MQPalette
    var onTier: (String) -> Void = { _ in }
    var onBack: () -> Void = {}

    public init(tiers: [PatchwerkConfig.Tier], selected: String, level: String,
                rows: [LeaderboardEntry], highlight: String? = nil,
                metrics: MQMetrics, palette: MQPalette = .noon,
                onTier: @escaping (String) -> Void = { _ in },
                onBack: @escaping () -> Void = {}) {
        self.tiers = tiers; self.selected = selected; self.level = level
        self.rows = rows; self.highlight = highlight
        self.m = metrics; self.p = palette
        self.onTier = onTier; self.onBack = onBack
    }

    // MARK: Geometry

    nonisolated static func pad(_ m: MQMetrics) -> CGFloat { m.isRegular ? 30 : 16 }
    nonisolated static func knobSize(_ m: MQMetrics) -> CGFloat { m.isRegular ? 50 : 46 }

    nonisolated static func chipSize(_ m: MQMetrics) -> CGSize {
        let content = m.size.width - pad(m) * 2
        return CGSize(width: min(220, (content - 24) / 3), height: m.isRegular ? 54 : 46)
    }

    /// How many rows fit without the screen overflowing. The board KEEPS twenty
    /// (LocalLeaderboard.capacity); it draws what the glass has room for, and the
    /// footer says so rather than pretending twenty is all there is.
    nonisolated public static func rowsShown(_ m: MQMetrics) -> Int {
        if m.isWide { return m.isRegular ? 8 : 6 }
        return m.isShort ? 6 : (m.isRegular ? 12 : 8)
    }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        [MQTapTarget("back", square: knobSize(m))]
            + (1...3).map { MQTapTarget("tier \($0)", chipSize(m)) }
    }

    // MARK: Body

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: m.isWide ? 0.32 : 0.28)
            VStack(spacing: m.isShort ? 8 : 14) {
                header
                chips
                board
                Spacer(minLength: 0)
            }
            .padding(.horizontal, Self.pad(m))
            .padding(.top, m.insets.top + Self.pad(m) * 0.6)
            .padding(.bottom, m.insets.bottom + Self.pad(m) * 0.6)
        }
    }

    private var header: some View {
        HStack(spacing: 14) {
            Button(action: onBack) { MQKnob(p, .back, size: Self.knobSize(m)) }
                .buttonStyle(.plain)
            Text("Hall of Fame - \(level)")
                .font(.mq(m.isRegular ? 28 : 21, .extrabold))
                .foregroundStyle(p.carved)
                .shadow(color: p.woodDeep.opacity(0.8), radius: 0, x: 0, y: 2)
            Spacer(minLength: 0)
        }
    }

    private var chips: some View {
        HStack(spacing: 12) {
            ForEach(tiers) { tier in
                Button { onTier(tier.id) } label: {
                    MQTag(p) {
                        VStack(spacing: 0) {
                            Text(tier.label)
                                .font(.mq(m.isRegular ? 17 : 14, .extrabold))
                                .foregroundStyle(tier.id == selected ? p.gold : p.carved)
                                .lineLimit(1).minimumScaleFactor(0.7)
                            Text(tier.minutesLabel)
                                .font(.mq(m.isRegular ? 13 : 11, .semibold))
                                .foregroundStyle(p.carved.opacity(0.8))
                        }
                        .frame(width: Self.chipSize(m).width, height: Self.chipSize(m).height)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            Spacer(minLength: 0)
        }
    }

    private var board: some View {
        MQScroll(p, padH: m.isRegular ? 24 : 14, padV: m.isRegular ? 16 : 10) {
            VStack(spacing: m.isShort ? 4 : 6) {
                if rows.isEmpty {
                    Text("No runs at this tier yet. Go and hit the dummy.")
                        .font(.mq(m.isRegular ? 18 : 14, .semibold))
                        .foregroundStyle(p.ink.opacity(0.75))
                        .padding(.vertical, 18)
                } else {
                    ForEach(Array(rows.prefix(Self.rowsShown(m)).enumerated()), id: \.element.id) { i, row in
                        line(i + 1, row)
                    }
                    if rows.count > Self.rowsShown(m) {
                        Text("\(rows.count) runs kept on this iPad.")
                            .font(.mq(m.isRegular ? 13 : 11, .semibold))
                            .foregroundStyle(p.ink.opacity(0.6))
                            .padding(.top, 2)
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func line(_ rank: Int, _ row: LeaderboardEntry) -> some View {
        let mine = row.id == highlight
        return HStack(spacing: m.isRegular ? 14 : 8) {
            Text("\(rank)")
                .font(.mq(m.isRegular ? 20 : 16, .extrabold))
                .foregroundStyle(rank == 1 ? p.gold : p.ink.opacity(0.7))
                .frame(width: m.isRegular ? 34 : 24, alignment: .trailing)
            Text(row.name)
                .font(.mq(m.isRegular ? 20 : 16, mine ? .extrabold : .semibold))
                .foregroundStyle(p.ink)
                .lineLimit(1)
            Spacer(minLength: 4)
            Text("x\(row.maxStacks)")
                .font(.mq(m.isRegular ? 15 : 12, .semibold))
                .foregroundStyle(p.ink.opacity(0.65))
            Text(PatchwerkSession.grouped(row.score))
                .font(.mq(m.isRegular ? 21 : 17, .extrabold))
                .foregroundStyle(p.ink)
                .monospacedDigit()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, m.isShort ? 3 : 5)
        .background {
            RoundedRectangle(cornerRadius: 8)
                .fill(mine ? p.gold.opacity(0.28) : Color.clear)
        }
    }
}
