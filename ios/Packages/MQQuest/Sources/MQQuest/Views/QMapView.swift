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
        [MQTapTarget("back", square: knobSize(m)),
         MQTapTarget("node", MQMapMarker.hitBox(scale: markerScale(m)))]
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
    }

    private var header: some View {
        HStack(alignment: .center, spacing: compact ? 10 : 16) {
            Button { Task { await model.backToEntrance() } } label: {
                MQKnob(p, .back, size: Self.knobSize(m))
            }
            .buttonStyle(.plain)
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
            if let here {
                let at = place(here)
                MQCreature(model.profile?.cast ?? .unicorn, p)
                    .frame(width: compact ? 62 : 96,
                           height: (compact ? 62 : 96)
                               * MQCreature.box(model.profile?.cast ?? .unicorn).height
                               / MQCreature.box(model.profile?.cast ?? .unicorn).width)
                    .position(x: w * at.x - (compact ? 46 : 74),
                              y: h * at.y + (compact ? 8 : 14))
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
        if quest?.playable == true {
            Button {
                if let quest { Task { await model.open(quest) } }
            } label: {
                MQMapMarker(p, node: node, scale: Self.markerScale(m))
            }
            .buttonStyle(.plain)
        } else {
            MQMapMarker(p, node: node, scale: Self.markerScale(m))
                .allowsHitTesting(false)
        }
    }
}
