import SwiftUI
import MQDesign
import MQServices

/// What the run came to.
///
/// The rules this screen follows, all of them from the mode's design note:
///
///  * **Damage is the headline**, in one large carved number. Everything else is
///    small beside it.
///  * **No fail state.** There is no "you lost", no red, no tombstone. The dummy
///    is still standing; that is the joke, not a defeat.
///  * **Nothing asks the child to come back.** No day counter, no "see you
///    tomorrow", no streak-at-risk. The fade-out law applies to the mode that is
///    most tempted to break it.
///  * The rank line says **"on this iPad"** whenever the board is local, because
///    a child who thinks they are 4th in the world deserves the truth.
public struct PatchwerkResultView: View, MQTapAudited {

    let record: PatchwerkRecord
    let tierLabel: String
    let level: String
    let placement: LeaderboardPlacement?
    let leavesTheDevice: Bool
    let m: MQMetrics
    let p: MQPalette
    var onAgain: () -> Void = {}
    var onTiers: () -> Void = {}
    var onBoard: () -> Void = {}

    public init(record: PatchwerkRecord, tierLabel: String, level: String,
                placement: LeaderboardPlacement?, leavesTheDevice: Bool,
                metrics: MQMetrics, palette: MQPalette = .noon,
                onAgain: @escaping () -> Void = {},
                onTiers: @escaping () -> Void = {},
                onBoard: @escaping () -> Void = {}) {
        self.record = record; self.tierLabel = tierLabel; self.level = level
        self.placement = placement; self.leavesTheDevice = leavesTheDevice
        self.m = metrics; self.p = palette
        self.onAgain = onAgain; self.onTiers = onTiers; self.onBoard = onBoard
    }

    // MARK: Geometry

    nonisolated static func pad(_ m: MQMetrics) -> CGFloat { m.isRegular ? 30 : 16 }

    nonisolated static func buttonSize(_ m: MQMetrics) -> CGSize {
        let content = m.size.width - pad(m) * 2
        if m.isWide {
            return CGSize(width: min(280, (content - 36) / 3), height: m.isRegular ? 64 : 56)
        }
        return CGSize(width: content, height: m.isShort ? 52 : 58)
    }

    /// Scenery, sized off the frame rather than declared, so a short screen loses
    /// the crab before it loses a number.
    nonisolated static func dummyWidth(_ m: MQMetrics) -> CGFloat {
        min(m.size.width * (m.isWide ? 0.24 : 0.40),
            m.isRegular ? 280 : 175,
            m.size.height * (m.isShort ? 0.20 : 0.26))
    }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        let b = buttonSize(m)
        return [MQTapTarget("fight again", b), MQTapTarget("boss tiers", b),
                MQTapTarget("hall of fame", b)]
    }

    // MARK: Body

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: m.isWide ? 0.32 : 0.30)
            VStack(spacing: m.isShort ? 10 : (m.isRegular ? 20 : 14)) {
                headline
                damage
                stats
                rankLine
                Spacer(minLength: 0)
                // "The dummy is still standing" is the line above; here he is,
                // standing. No defeat pose, no tombstone, no red - the joke is
                // that nobody lost.
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

    private var headline: some View {
        VStack(spacing: 2) {
            Text("ENRAGE!")
                .font(.mq(m.isRegular ? 34 : 26, .extrabold))
                .foregroundStyle(p.gold)
                .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 2)
            // On a plank. Cream at 88% straight onto the world measures 1.22:1
            // against `skyLow` and 1.30:1 against `sandFar` - "white captions on
            // pale sand", item 9 of the dress rehearsal's parent's-eye list.
            MQRail(p, padH: m.isRegular ? 18 : 12, padV: m.isRegular ? 5 : 3) {
                Text("\(tierLabel) - \(level) - the dummy is still standing, but you left a mark.")
                    .font(.mq(m.isRegular ? 17 : 13, .semibold))
                    .foregroundStyle(p.captionOnDark)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var damage: some View {
        MQCarvedNumber(p, value: PatchwerkSession.grouped(record.damage),
                       caption: "total damage",
                       valueSize: m.isRegular ? 78 : 54, tint: p.gold)
    }

    private var stats: some View {
        let items: [(String, String)] = [
            ("x\(record.maxStacks)", "best stacks"),
            ("\(record.correct)", "hits"),
            ("\(record.wrong)", "misses"),
            (record.accuracyLabel, "accuracy"),
            ("\(record.freezesUsed)", "freezes used")
        ]
        // **A rail, not a tag.** The five numbers were gold on pale wood - 1.20:1
        // to 1.70:1 - with cream captions under them at 1.22:1: the whole row was
        // a smudge in `pw-05-result.png` and Kevin picked it out by eye. Moving
        // the row onto the HUD's own dark plank fixes value and caption together
        // with one object rather than two colour sets, which is MQRail's own
        // stated argument for existing. Cream reads 5.34:1 there.
        //
        // The gold does not follow it up here on purpose: gold on `woodDark`
        // measures 2.74:1, and gold stays reserved for the ONE number that is the
        // point of the screen - the damage above.
        return MQRail(p, padH: m.isRegular ? 22 : 10, padV: m.isRegular ? 12 : 8) {
            HStack(spacing: m.isRegular ? 26 : 10) {
                ForEach(items, id: \.1) { value, caption in
                    statPair(value, caption).frame(maxWidth: .infinity)
                }
            }
        }
    }

    /// One stat. Not `MQCarvedNumber`: its caption is `carved.opacity(0.82)`,
    /// which measures 4.19:1 on `woodDark` and misses WCAG AA by 0.31.
    private func statPair(_ value: String, _ caption: String) -> some View {
        VStack(spacing: -(m.isRegular ? 3.0 : 2.0)) {
            Text(value)
                .font(.mq(m.isRegular ? 30 : 21, .extrabold))
                .monospacedDigit()
                .foregroundStyle(p.captionOnDark)
                .shadow(color: p.woodDeep.opacity(0.9), radius: 0, x: 0, y: 2)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(caption)
                .font(.mq(m.isRegular ? 13 : 11, .bold))
                .foregroundStyle(p.captionOnDark)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }

    @ViewBuilder private var rankLine: some View {
        // The celebration line of the whole run, and it was cream on pale sand at
        // 1.30:1 - "very nearly invisible", item 9. On a plank it reads 5.34:1.
        MQRail(p, padH: m.isRegular ? 18 : 12, padV: m.isRegular ? 5 : 3) {
            Text(rankText)
                .font(.mq(m.isRegular ? 19 : 15, .bold))
                .foregroundStyle(p.captionOnDark)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var rankText: String {
        let where_ = leavesTheDevice ? "" : " on this iPad"
        guard let rank = placement?.rank else {
            return "Not on the \(tierLabel) board yet\(where_). The dummy is patient."
        }
        if rank == 1 { return "Best \(tierLabel) run at \(level)\(where_)." }
        return "#\(rank) of \(placement?.kept ?? rank) \(tierLabel) runs at \(level)\(where_)."
    }

    private var buttons: some View {
        let size = Self.buttonSize(m)
        return Group {
            if m.isWide {
                HStack(spacing: 18) { buttonRow(size) }
            } else {
                VStack(spacing: m.isShort ? 8 : 10) { buttonRow(size) }
            }
        }
    }

    @ViewBuilder private func buttonRow(_ size: CGSize) -> some View {
        Button(action: onAgain) {
            MQPlankButton(p, "Fight again", primary: true, fontSize: m.isRegular ? 23 : 19)
                .frame(width: size.width, height: size.height)
        }.buttonStyle(.plain)
        Button(action: onTiers) {
            MQPlankButton(p, "Boss tiers", fontSize: m.isRegular ? 20 : 17)
                .frame(width: size.width, height: size.height)
        }.buttonStyle(.plain)
        Button(action: onBoard) {
            MQPlankButton(p, "Hall of Fame", fontSize: m.isRegular ? 20 : 17)
                .frame(width: size.width, height: size.height)
        }.buttonStyle(.plain)
    }
}
