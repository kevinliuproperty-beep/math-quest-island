import SwiftUI
import MQContent
import MQDesign

/// The `+` token's sheet, interactive.
///
/// Composition, prompts and geometry are `MQNewExplorerScreen`'s; this adds the
/// taps and nothing else, exactly as `QEntranceView` does for the entrance - so a
/// control here is the size the 12-size matrix gate measured.
///
/// **Every control is a recorded hit target.** The entrance registers none (only
/// `QBattleView` and `QResultView` called `.qHit` before this), which is why no
/// driven run could ever prove a token was on the glass and why the dead `+`
/// survived every gate in the packet. A driven run can now tap `+`, a creature, a
/// class and Start, and a control drawn off the glass records a MISS and exits 2.
public struct QNewExplorerView: View, MQTapAudited {
    @ObservedObject var model: QQuestModel
    @Environment(\.qHitMap) private var hitMap
    let m: MQMetrics
    let p: MQPalette

    public init(model: QQuestModel, metrics: MQMetrics, palette: MQPalette = .noon) {
        self.model = model; self.m = metrics; self.p = palette
    }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        MQNewExplorerScreen.tapTargets(m)
    }

    /// The hit-map names, hoisted so the driver never spells one out.
    public enum Hit {
        public static func cast(_ c: MQCast) -> String { "cast-\(c.rawValue)" }
        public static func level(_ l: String) -> String { "level-\(l)" }
        public static let start = "new-explorer-start"
        public static let back = "new-explorer-back"
    }

    private var g: MQNewExplorerScreen.Geo { MQNewExplorerScreen.geometry(m) }
    private var levels: [String] { model.levelsOffered }

    public var body: some View {
        ZStack {
            MQWorld(p, horizon: g.horizon)
            MQBeachCamp(p, horizon: g.horizon, compact: !m.isRegular)
            VStack(spacing: m.isRegular ? 18 : 10) {
                title
                Spacer(minLength: 0)
                prompt(QStrings.newExplorerCastPrompt)
                castRow
                Spacer(minLength: 0)
                prompt(QStrings.newExplorerLevelPrompt)
                levelRow
                Spacer(minLength: 0)
                buttons
            }
            .padding(.horizontal, g.pad)
            .padding(.top, m.insets.top + g.pad * 0.6)
            .padding(.bottom, m.insets.bottom + g.pad * 0.6)
        }
        .coordinateSpace(name: QHitMap.space)
    }

    private func hitButton<L: View>(
        _ name: String,
        action: @escaping @MainActor @Sendable () async -> Void,
        @ViewBuilder label: () -> L) -> some View {
        Button { Task { await action() } } label: { label() }
            .buttonStyle(.plain)
            .qHit(hitMap, name, fire: action)
    }

    private var title: some View {
        Text(QStrings.newExplorerTitle)
            .font(.mq(m.type.title, .extrabold))
            .foregroundStyle(p.carved)
            .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 3)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }

    private func prompt(_ text: String) -> some View {
        Text(text)
            .font(.mq(m.isRegular ? 19 : 14, .bold))
            .foregroundStyle(p.carved.opacity(0.94))
            .shadow(color: p.woodDeep.opacity(0.7), radius: 0, x: 0, y: 2)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }

    private var castRow: some View {
        HStack(spacing: g.spacing) {
            ForEach(Array(MQNewExplorerScene.casts.enumerated()), id: \.offset) { _, cast in
                hitButton(Hit.cast(cast),
                          action: { [model] in await MainActor.run { model.chooseCast(cast) } }) {
                    MQNewExplorerScreen.castDisc(p, cast: cast,
                                                 chosen: cast == model.draft.cast,
                                                 diameter: g.castDisc)
                }
            }
        }
    }

    private var levelRow: some View {
        HStack(spacing: g.spacing) {
            ForEach(Array(levels.enumerated()), id: \.offset) { _, level in
                hitButton(Hit.level(level),
                          action: { [model] in await MainActor.run { model.chooseLevel(level) } }) {
                    MQNewExplorerScreen.levelPlank(p, level: level,
                                                   chosen: level == model.draft.level,
                                                   size: plankSize,
                                                   compact: !m.isRegular)
                }
            }
        }
    }

    /// The plank width is computed from the levels the ENGINE offers, not from
    /// the sample's four: a build whose catalogue has three live class levels
    /// must not draw four planks' worth of gap.
    private var plankSize: CGSize {
        let n = max(levels.count, 1)
        let contentW = m.size.width - g.pad * 2
        let w = max((contentW - g.spacing * CGFloat(n - 1)) / CGFloat(n), MQTap.min)
        return CGSize(width: w, height: g.levelPlank.height)
    }

    private var buttons: some View {
        HStack(spacing: m.isRegular ? 20 : 12) {
            hitButton(Hit.back, action: { [model] in await MainActor.run {
                model.cancelNewExplorer() } }) {
                MQPlankButton(p, QStrings.newExplorerBack, fontSize: m.isRegular ? 20 : 16)
            }
            hitButton(Hit.start, action: { [model] in await model.createExplorer() }) {
                MQPlankButton(p, QStrings.newExplorerStart, primary: true,
                              fontSize: m.isRegular ? 24 : 18)
            }
        }
    }
}
