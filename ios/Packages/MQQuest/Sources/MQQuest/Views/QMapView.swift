import SwiftUI
import MQDesign

/// The island, interactive.
///
/// Same drawing as `MQMapScreen` - `MQIslandMap` underneath, one `MQMapMarker`
/// per stop, the explorer standing at the stop they are part-way through - with
/// the markers made tappable and the nodes coming from the engine's own
/// catalogue joined to the store's mastery (`QIsland.build`).
///
/// A `comingSoon` stop is drawn and is NOT tappable. That is deliberate and it is
/// the design's: the map says "next year" by showing the place roped off up in
/// the mist rather than by hiding it, and a stop that looks tappable and does
/// nothing teaches a child the app is broken.
public struct QMapView: View, MQTapAudited {
    @ObservedObject var model: QQuestModel
    @Environment(\.qHitMap) private var hitMap
    let m: MQMetrics
    let p: MQPalette

    public init(model: QQuestModel, metrics: MQMetrics, palette: MQPalette = .noon) {
        self.model = model; self.m = metrics; self.p = palette
    }

    private var compact: Bool { !m.isRegular }
    private var pad: CGFloat { m.isRegular ? 26 : 14 }
    private var nodes: [QNode] { model.island?.nodes ?? [] }

    nonisolated static func markerScale(_ m: MQMetrics) -> CGFloat {
        min(max(min(m.size.width, m.size.height) / 834, 0.82), 1.05)
    }
    nonisolated static func knobSize(_ m: MQMetrics) -> CGFloat { m.isRegular ? 52 : 44 }

    nonisolated public static func tapTargets(_ m: MQMetrics) -> [MQTapTarget] {
        MQMapScreen.tapTargets(m)
    }

    /// The hit-map names the driver taps by.
    public enum Hit {
        public static let back = "map-back"
        public static func node(_ topicID: String) -> String { "node-\(topicID)" }
        public static let patchwerk = "map-patchwerk"
    }

    /// Phone frames read bottom to top, exactly as `MQMapScreen` lays them out.
    private func place(_ i: Int) -> CGPoint {
        let count = nodes.count
        guard !m.isWide else { return QIsland.place(i, of: count) }
        let n = max(count - 1, 1)
        let t = CGFloat(i) / CGFloat(n)
        return CGPoint(x: i.isMultiple(of: 2) ? 0.26 : 0.72, y: 0.86 - t * 0.66)
    }

    public var body: some View {
        ZStack(alignment: .top) {
            map
            header
                .padding(.horizontal, pad)
                .padding(.top, m.insets.top + pad * 0.6)
        }
        .frame(width: m.size.width, height: m.size.height)
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

    private var header: some View {
        HStack(alignment: .center, spacing: compact ? 10 : 16) {
            hitButton(Hit.back, action: { [model] in await model.backToEntrance() }) {
                MQKnob(p, .back, size: Self.knobSize(m))
            }
            VStack(alignment: .leading, spacing: -2) {
                Text(QStrings.mapTitle)
                    .font(.mq(compact ? 26 : 40, .extrabold))
                    .foregroundStyle(p.ink)
                    .shadow(color: p.cloud.opacity(0.9), radius: 0, x: 0, y: 2)
                Text(QStrings.mapSubtitle(level: model.profile?.level ?? ""))
                    .font(.mq(compact ? 13 : 18, .medium))
                    .foregroundStyle(p.inkSoft)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            Spacer(minLength: 8)
            // **Patchwerk's entry point.** The mode had none: nothing in MQQuest
            // or in the host referenced MQPatchwerk, and the rehearsal could only
            // reach it by constructing a `PatchwerkSession` by hand (leg 6). It
            // is drawn only when the composition root has actually supplied the
            // mode, because a plank that does nothing is the defect this pass
            // closed on the entrance.
            if model.patchwerkAvailable {
                hitButton(Hit.patchwerk,
                          action: { [model] in await MainActor.run {
                              model.openPatchwerk() } }) {
                    MQMapScreen.patchwerkButton(p, m, label: QStrings.patchwerkEntry)
                }
            }
            if !compact {
                MQNameTag(p, name: model.profile?.name ?? "",
                          level: model.profile?.level ?? "",
                          quest: QStrings.crystalsFound(model.island?.crystals ?? 0))
            }
        }
        .frame(height: compact ? 56 : 62)
    }

    private var map: some View {
        let design = model.island?.mapNodes() ?? []
        let route = design.enumerated()
            .filter { if case .comingSoon = $0.element.state { return false } else { return true } }
            .map { place($0.offset) }
        let marks = design.enumerated().map { (QIsland.landmark($0.offset), place($0.offset)) }
        let w = m.size.width, h = m.size.height
        let here = design.firstIndex {
            if case .inProgress = $0.state { return true } else { return false }
        }
        return ZStack(alignment: .topLeading) {
            MQIslandMap(p, landmarks: marks, route: route,
                        mistBelow: m.isWide ? 0.30 : 0.18)
                .frame(width: w, height: h)
            // Placed by `MQMapScreen.heroCentre`: her whole box stays on the
            // glass and she stands clear of the post rather than under its name
            // plank. See that function for what the rehearsal measured.
            if let here {
                let cast = model.profile?.cast ?? .unicorn
                let box = MQMapScreen.heroSize(m, cast: cast)
                let c = MQMapScreen.heroCentre(m, cast: cast, at: place(here))
                MQCreature(cast, p)
                    .frame(width: box.width, height: box.height)
                    .position(x: c.x, y: c.y)
            }
            ForEach(Array(design.enumerated()), id: \.offset) { i, node in
                let at = place(i)
                marker(i, node)
                    .position(x: w * at.x, y: h * at.y)
            }
            .frame(width: w, height: h)
        }
        .frame(width: w, height: h)
    }

    @ViewBuilder private func marker(_ i: Int, _ node: MQMapNode) -> some View {
        let quest = nodes.indices.contains(i) ? nodes[i] : nil
        if let quest, quest.playable {
            hitButton(Hit.node(quest.topicID),
                      action: { [model] in await model.open(quest) }) {
                MQMapMarker(p, node: node, scale: Self.markerScale(m))
            }
        } else {
            MQMapMarker(p, node: node, scale: Self.markerScale(m))
                .allowsHitTesting(false)
        }
    }
}
