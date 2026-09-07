import SwiftUI
import MQContent
import MQDesign
import MQProgress

/// The front door, interactive.
///
/// Composition, depth stagger, beach camp and copy are `MQEntranceScreen`'s -
/// this adds the taps and nothing else, and it reuses that screen's own
/// `geometry` so a token here is exactly the size the device matrix measured.
///
/// The no-login model is the design's and is not negotiable: saved explorers on
/// this iPad, one empty slot, no accounts anywhere.
public struct QEntranceView: View, MQTapAudited {
    @ObservedObject var model: QQuestModel
    @Environment(\.qHitMap) private var hitMap
    let m: MQMetrics
    let p: MQPalette

    public init(model: QQuestModel, metrics: MQMetrics, palette: MQPalette = .noon) {
        self.model = model; self.m = metrics; self.p = palette
    }

    private var slots: Int { model.records.count + 1 }
    private var g: MQEntranceScreen.Geo { MQEntranceScreen.geometry(m, slots: slots) }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        MQEntranceScreen.tapTargets(m)
    }

    /// The hit-map names the driver taps by.
    ///
    /// **The entrance registered NONE before the rehearsal fix pass.** Only
    /// `QBattleView` and `QResultView` called `.qHit`, so no driven run could
    /// prove a profile token was even on the glass - which is how a `+` that did
    /// nothing survived every gate in the packet (Phase 1 dress rehearsal,
    /// leg 1). A driven run now taps a real token and a real `+`.
    public enum Hit {
        /// Named by the STORE's id, never by the child's name. Two children
        /// called Ben would collide on a name, and a display name standing in
        /// for an identity is precisely the blocker this pass closes.
        public static func profile(_ id: ProfileID) -> String { "profile-\(id.raw)" }
        public static let newExplorer = "new-explorer"
    }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: g.horizon)
            MQBeachCamp(p, horizon: g.horizon, compact: !g.oneRow)
            VStack(spacing: 0) {
                title
                Spacer(minLength: m.isRegular ? 24 : 14)
                tokens
                Color.clear.frame(height: m.isRegular ? 34 : 20)
                parentLine
            }
            .padding(.horizontal, g.pad)
            .padding(.top, m.insets.top + g.pad * 0.6)
            .padding(.bottom, m.insets.bottom + g.pad * 0.6)
        }
        .coordinateSpace(name: QHitMap.space)
    }

    private var title: some View {
        VStack(spacing: m.isRegular ? 4 : 2) {
            HStack(spacing: m.isRegular ? 16 : 10) {
                crystal(m.isRegular ? 30 : 20)
                Text(QStrings.appTitle)
                    .font(.mq(m.type.title, .extrabold))
                    .foregroundStyle(p.carved)
                    .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 3)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                crystal(m.isRegular ? 30 : 20)
            }
            Text(QStrings.entranceSubtitle)
                .font(.mq(m.type.body, .medium))
                .foregroundStyle(p.carved.opacity(0.92))
                .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 2)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }

    private func crystal(_ size: CGFloat) -> some View {
        Canvas { ctx, s in
            mqDrawCrystal(&ctx, p, center: CGPoint(x: s.width / 2, y: s.height / 2),
                          r: s.height * 0.40, on: true)
        }
        .frame(width: size, height: size * 1.15)
    }

    @ViewBuilder private var tokens: some View {
        // **`ProfileRecord?`, not `MQProfile?`.** The token has to hand back the
        // STORE's id, and `MQProfile.id` is the child's display name - see
        // `QQuestModel.records` for the whole of what that cost.
        let entries: [ProfileRecord?] = model.records.map { $0 } + [nil]
        if g.oneRow {
            HStack(alignment: .bottom, spacing: g.spacing) {
                ForEach(0..<entries.count, id: \.self) { i in token(entries[i], i) }
            }
            .padding(.top, 42)
        } else {
            VStack(spacing: m.isRegular ? 26 : 16) {
                ForEach(0..<((entries.count + 1) / 2), id: \.self) { row in
                    HStack(alignment: .bottom, spacing: g.spacing) {
                        ForEach(0..<2, id: \.self) { col in
                            let i = row * 2 + col
                            if i < entries.count { token(entries[i], i) }
                        }
                    }
                }
            }
            .padding(.top, 24)
        }
    }

    /// One slot. **The empty one opens the new-explorer sheet.**
    ///
    /// It used to be `Button { guard let profile else { return } ... }` - the
    /// empty slot's action returned immediately and nothing in the app called
    /// `addProfile`, so a parent on a fresh install met a dead `+` and could not
    /// start at all. Both branches now record a hit target and both fire.
    private func token(_ record: ProfileRecord?, _ i: Int) -> some View {
        let d = MQEntranceScreen.depth[i % MQEntranceScreen.depth.count]
        let name = record.map { Hit.profile($0.id) } ?? Hit.newExplorer
        let fire: @MainActor @Sendable () async -> Void = { [model] in
            if let record { await model.pick(record) }
            else { await MainActor.run { model.beginNewExplorer() } }
        }
        return Button { Task { await fire() } } label: {
            MQHeroToken(p, profile: record?.profile, newLabel: QStrings.newExplorer,
                        diameter: g.diameter * d.scale, compact: !m.isRegular)
        }
        .buttonStyle(.plain)
        .qHit(hitMap, name, fire: fire)
        .offset(y: d.dy * (g.diameter / (m.isRegular ? 186 : 124)))
    }

    private var parentLine: some View {
        MQTag(p) {
            Text(QStrings.parentLine)
                .font(.mq(m.isRegular ? 17 : 13, .medium))
                .foregroundStyle(p.underLight(Color(hex: 0x6E4B26)))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, m.isRegular ? 20 : 14)
                .padding(.vertical, m.isRegular ? 11 : 8)
        }
    }
}
