import SwiftUI

/// The island, with the quests standing on it.
///
/// The web app's map is a scrolling zig-zag of emoji rows. This is a MAP: one
/// drawn island, a sand path between the stops, and a marker planted at each
/// place. Four states, all drawn rather than labelled -- a cleared stop keeps
/// its crystal, the stop you are on wears a lantern glow and shows how many of
/// its crystals you have found, an open stop has an empty socket, and an unbuilt
/// stop is roped off up in the mist.
///
/// The screen takes its `size` rather than reading a `GeometryReader`, so the
/// unconstrained fit check still measures something real. In the app this comes
/// from the navigation container.
public struct MQMapScreen: View {
    let scene: MQMapScene
    let layout: MQLayout
    let insets: MQInsets
    let p: MQPalette
    let size: CGSize

    public init(scene: MQMapScene = .sample, layout: MQLayout,
                insets: MQInsets = .none, palette: MQPalette = .noon, size: CGSize) {
        self.scene = scene; self.layout = layout
        self.insets = insets; self.p = palette; self.size = size
    }

    private var compact: Bool { layout == .tall }
    private var pad: CGFloat { compact ? 14 : 26 }
    private var type: MQType { compact ? .compact : .regular }
    private var markerScale: CGFloat { compact ? 0.72 : 1 }

    /// On a phone the island is read bottom to top, so the stops are laid out as
    /// a climbing zig-zag rather than at their landscape coordinates. Same
    /// island, same order, different frame.
    private func place(_ i: Int) -> CGPoint {
        guard compact else { return scene.nodes[i].at }
        let n = max(scene.nodes.count - 1, 1)
        let t = CGFloat(i) / CGFloat(n)
        return CGPoint(x: i.isMultiple(of: 2) ? 0.26 : 0.72, y: 0.86 - t * 0.66)
    }

    /// The map is full-bleed: it fills the device and the header floats on the
    /// water above the island. A framed map is a picture OF an island; an
    /// unframed one is the island. The consequence for the gate is that this
    /// screen's fit slack is 0 by construction -- there is nothing to overflow,
    /// and what has to be checked by eye instead is that no marker's name plank
    /// runs off an edge.
    public var body: some View {
        ZStack(alignment: .top) {
            map
            header
                .padding(.horizontal, pad)
                .padding(.top, insets.top + pad * 0.6)
        }
        .frame(width: size.width, height: size.height)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: compact ? 10 : 16) {
            MQKnob(p, .back, size: compact ? 44 : 52)
            // Dark on the fog rather than cream on it. The island's misty top is
            // the lightest thing on this screen, so the title borrows it as its
            // paper instead of fighting it with a drop shadow.
            VStack(alignment: .leading, spacing: -2) {
                Text(scene.title)
                    .font(.mq(compact ? 26 : 40, .extrabold))
                    .foregroundStyle(p.ink)
                    .shadow(color: p.cloud.opacity(0.9), radius: 0, x: 0, y: 2)
                Text(scene.subtitle)
                    .font(.mq(compact ? 13 : 18, .medium))
                    .foregroundStyle(p.inkSoft)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            Spacer(minLength: 8)
            if !compact {
                MQNameTag(p, name: scene.heroName, level: scene.level,
                          quest: "\(scene.crystals) crystals found")
            }
        }
        .frame(height: compact ? 56 : 62)
    }

    private var map: some View {
        let route = scene.nodes.enumerated()
            .filter { if case .comingSoon = $0.element.state { return false } else { return true } }
            .map { place($0.offset) }
        let marks = scene.nodes.enumerated().map { ($0.element.landmark, place($0.offset)) }
        let w = size.width
        let h = size.height
        let here = scene.nodes.firstIndex {
            if case .inProgress = $0.state { return true } else { return false }
        }
        return ZStack(alignment: .topLeading) {
            MQIslandMap(p, landmarks: marks, route: route,
                        mistBelow: compact ? 0.18 : 0.30)
                .frame(width: w, height: h)
            // "You are here", drawn: the explorer is standing at the stop they
            // are part-way through. No arrow, no pulsing ring, no label.
            if let here {
                let at = place(here)
                MQCreature(scene.heroCast, p)
                    .frame(width: compact ? 62 : 96,
                           height: (compact ? 62 : 96)
                                   * MQCreature.box(scene.heroCast).height
                                   / MQCreature.box(scene.heroCast).width)
                    .position(x: w * at.x - (compact ? 46 : 74), y: h * at.y + (compact ? 8 : 14))
            }
            ForEach(Array(scene.nodes.enumerated()), id: \.element.id) { i, node in
                let at = place(i)
                MQMapMarker(p, node: node, scale: markerScale)
                    .position(x: w * at.x, y: h * at.y)
            }
            .frame(width: w, height: h)
        }
        .frame(width: w, height: h)
    }
}
