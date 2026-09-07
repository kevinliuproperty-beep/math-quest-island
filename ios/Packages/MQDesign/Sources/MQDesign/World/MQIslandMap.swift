import SwiftUI

/// The island, seen from above the water.
///
/// The web app's map is a vertical list of emoji with a zig-zag indent. This is
/// the thing that list was standing in for: one drawn island where a quest is a
/// PLACE -- a palace on a headland, a reef in a lagoon, a jetty over the water
/// -- so a child picks a destination rather than a row.
///
/// The unbuilt quests are not greyed-out rows either. They sit in the **mist**
/// at the top of the map, which is the honest drawing of "coming soon": you can
/// see there is more island up there, and you cannot get to it yet.
public struct MQIslandMap: View {
    let p: MQPalette
    /// Where each landmark sits, in unit coordinates of this canvas.
    let landmarks: [(MQLandmark, CGPoint)]
    /// The route through the cleared and open stops, in unit coordinates.
    let route: [CGPoint]
    /// Everything above this fraction of the height is behind the mist.
    let mistBelow: CGFloat

    public init(_ p: MQPalette = .noon,
                landmarks: [(MQLandmark, CGPoint)],
                route: [CGPoint],
                mistBelow: CGFloat = 0.30) {
        self.p = p; self.landmarks = landmarks
        self.route = route; self.mistBelow = mistBelow
    }

    private var grass: Color { p.underLight(Color(hex: 0x7CB761)) }
    private var grassLight: Color { p.underLight(Color(hex: 0xA3D078)) }
    private var grassDeep: Color { p.underLight(Color(hex: 0x4E8746)) }
    private var jungle: Color { p.underLight(Color(hex: 0x336B44)) }
    private var rock: Color { p.underLight(Color(hex: 0x9A8C79)) }
    private var rockDeep: Color { p.underLight(Color(hex: 0x6B5F50)) }

    public var body: some View {
        Canvas { ctx, size in
            let W = size.width, H = size.height
            func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: W * x, y: H * y) }

            // 1. Open water, deep at the frame edge and shallow at the shore.
            ctx.fill(Path(CGRect(origin: .zero, size: size)),
                     with: .linearGradient(Gradient(colors: [p.seaDeep, p.seaMid, p.seaShallow]),
                                           startPoint: .zero, endPoint: CGPoint(x: W, y: H)))
            var seed: UInt64 = 0xB0A7
            func rnd() -> CGFloat {
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                return CGFloat((seed >> 33) % 10_000) / 10_000
            }
            for _ in 0..<44 {
                let c = CGPoint(x: rnd() * W, y: rnd() * H)
                let w = W * (0.018 + rnd() * 0.026)
                ctx.stroke(Path.smoothOpen([
                    CGPoint(x: c.x, y: c.y),
                    CGPoint(x: c.x + w * 0.5, y: c.y - H * 0.008),
                    CGPoint(x: c.x + w, y: c.y)
                ]), with: .color(p.foam.opacity(0.22)),
                           style: StrokeStyle(lineWidth: 2, lineCap: .round))
            }

            // 2. The island: three rings out from the shore -- shallows, wet
            //    sand, dry sand, then the green. Aerial perspective in plan.
            let shore: [CGPoint] = [
                pt(0.05, 0.60), pt(0.04, 0.44), pt(0.11, 0.30), pt(0.22, 0.22),
                pt(0.33, 0.13), pt(0.46, 0.10), pt(0.57, 0.13), pt(0.68, 0.12),
                pt(0.76, 0.20), pt(0.82, 0.32), pt(0.90, 0.42), pt(0.92, 0.58),
                pt(0.85, 0.74), pt(0.72, 0.85), pt(0.55, 0.90), pt(0.38, 0.88),
                pt(0.22, 0.82), pt(0.11, 0.72)
            ]
            func ring(_ k: CGFloat) -> Path {
                let c = CGPoint(x: W * 0.48, y: H * 0.50)
                return Path.smoothClosed(shore.map {
                    CGPoint(x: c.x + ($0.x - c.x) * k, y: c.y + ($0.y - c.y) * k)
                }, tension: 0.5)
            }
            ctx.fill(ring(1.09), with: .color(p.seaShallow.opacity(0.85)))
            ctx.fill(ring(1.04), with: .color(p.sandFar.mixed(with: p.seaShallow, by: 0.35)))
            ctx.fill(ring(1.0), with: .color(p.sandFar))
            ctx.stroke(ring(1.0), with: .color(p.foam.opacity(0.8)),
                       style: StrokeStyle(lineWidth: max(3, H * 0.006), lineCap: .round))
            ctx.fill(ring(0.90), with: .linearGradient(
                Gradient(colors: [grassLight, grass, grassDeep]),
                startPoint: CGPoint(x: W * 0.2, y: H * 0.15),
                endPoint: CGPoint(x: W * 0.8, y: H * 0.9)))

            // 3. Interior: jungle patches and a low ridge, so the green is not
            //    one flat field. Placed by hand, not scattered -- a map has
            //    geography, not texture.
            for (x, y, rx, ry) in [(0.20, 0.62, 0.10, 0.07), (0.36, 0.40, 0.09, 0.06),
                                   (0.63, 0.62, 0.11, 0.07), (0.78, 0.36, 0.08, 0.05),
                                   (0.48, 0.24, 0.12, 0.06)] {
                ctx.fill(Path.smoothClosed(mqBlob(center: pt(x, y),
                                                  rx: W * rx, ry: H * ry,
                                                  count: 11, wobble: 0.16)),
                         with: .color(jungle.opacity(0.42)))
            }
            for (x, y, s) in [(0.17, 0.55, 0.055), (0.31, 0.34, 0.048), (0.42, 0.61, 0.05),
                              (0.58, 0.35, 0.045), (0.66, 0.70, 0.05), (0.79, 0.55, 0.045),
                              (0.25, 0.72, 0.045), (0.88, 0.47, 0.04)] {
                palm(&ctx, at: pt(x, y), h: H * s)
            }

            // 4. The route: stepping stones, not a drawn line. A path a child
            //    can see themselves walking beats an arrow.
            if route.count > 1 {
                let pts = route.map { pt($0.x, $0.y) }
                let spine = Path.smoothOpen(pts, tension: 0.4)
                ctx.stroke(spine, with: .color(p.sandFar.opacity(0.75)),
                           style: StrokeStyle(lineWidth: max(9, H * 0.017),
                                              lineCap: .round, lineJoin: .round))
                ctx.stroke(spine, with: .color(p.sandShade.opacity(0.55)),
                           style: StrokeStyle(lineWidth: max(9, H * 0.017),
                                              lineCap: .round, lineJoin: .round,
                                              dash: [max(3, H * 0.006), max(9, H * 0.017)]))
            }

            // 5. Landmarks, each drawn under where its marker will stand.
            for (kind, at) in landmarks {
                let c = pt(at.x, at.y)
                let s = min(W, H)
                landmark(&ctx, kind, at: CGPoint(x: c.x, y: c.y + s * 0.018), s: s * 0.098)
            }

            // 6. The mist. Everything above `mistBelow` is island you can see
            //    and cannot reach. Drawn as three soft banks so it reads as
            //    weather rather than as an opacity slider.
            let mistY = H * mistBelow
            ctx.fill(Path(CGRect(x: 0, y: 0, width: W, height: mistY * 1.35)),
                     with: .linearGradient(
                        Gradient(stops: [
                            .init(color: p.cloud.opacity(p.isDusk ? 0.62 : 0.88), location: 0),
                            .init(color: p.cloud.opacity(p.isDusk ? 0.44 : 0.62), location: 0.55),
                            .init(color: .clear, location: 1)
                        ]),
                        startPoint: .zero, endPoint: CGPoint(x: 0, y: mistY * 1.35)))
            for (x, y, w) in [(0.22, 0.88, 0.34), (0.58, 0.96, 0.40), (0.86, 0.82, 0.30)] {
                let c = CGPoint(x: W * x, y: mistY * y)
                ctx.fill(Path.smoothClosed(mqBlob(center: c, rx: W * w / 2, ry: mistY * 0.16,
                                                  count: 11, wobble: 0.22), tension: 0.6),
                         with: .color(p.cloud.opacity(p.isDusk ? 0.34 : 0.55)))
            }
        }
    }

    // MARK: Landmarks

    private func landmark(_ ctx: inout GraphicsContext, _ kind: MQLandmark,
                          at c: CGPoint, s: CGFloat) {
        func water(_ rx: CGFloat, _ ry: CGFloat) {
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - rx, y: c.y - ry, width: rx * 2, height: ry * 2)),
                     with: .color(p.seaShallow))
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - rx, y: c.y - ry,
                                              width: rx * 2, height: ry * 2)),
                       with: .color(p.foam.opacity(0.7)), lineWidth: 2)
        }
        func stone(_ dx: CGFloat, _ dy: CGFloat, _ r: CGFloat) {
            ctx.paint(Path.smoothClosed(mqBlob(center: CGPoint(x: c.x + dx, y: c.y + dy),
                                               rx: r, ry: r * 0.78, count: 7, wobble: 0.14)),
                      rock, edge: rockDeep, width: 1.6)
        }

        switch kind {
        case .palace:
            // A headland with a keep on it. Two towers, so it is a palace and
            // not a chimney.
            ctx.paint(Path.smoothClosed(mqBlob(center: c, rx: s * 1.15, ry: s * 0.62,
                                               count: 9, wobble: 0.10)),
                      grassDeep.opacity(0.65))
            for (dx, h, w) in [(-s * 0.46, s * 1.05, s * 0.40), (s * 0.40, s * 0.80, s * 0.34)] {
                let r = CGRect(x: c.x + dx - w / 2, y: c.y - h, width: w, height: h)
                ctx.paint(Path(r), rock, edge: rockDeep, width: 1.8)
                for i in 0..<3 {
                    ctx.fill(Path(CGRect(x: r.minX + w * CGFloat(i) * 0.38, y: r.minY - s * 0.14,
                                         width: w * 0.24, height: s * 0.16)),
                             with: .color(rock))
                }
            }
            ctx.stroke(Path { g in
                g.move(to: CGPoint(x: c.x - s * 0.46, y: c.y - s * 1.20))
                g.addLine(to: CGPoint(x: c.x - s * 0.46, y: c.y - s * 1.62))
            }, with: .color(rockDeep), lineWidth: 2)
            ctx.fill(Path { g in
                g.move(to: CGPoint(x: c.x - s * 0.44, y: c.y - s * 1.62))
                g.addLine(to: CGPoint(x: c.x + s * 0.10, y: c.y - s * 1.48))
                g.addLine(to: CGPoint(x: c.x - s * 0.44, y: c.y - s * 1.32))
                g.closeSubpath()
            }, with: .color(p.coral))

        case .reef:
            water(s * 1.30, s * 0.72)
            stone(-s * 0.62, -s * 0.10, s * 0.30)
            stone(s * 0.10, -s * 0.30, s * 0.36)
            stone(s * 0.70, s * 0.02, s * 0.26)

        case .bay:
            // A crescent of sand bitten out of the coast.
            ctx.fill(Path.smoothClosed([
                CGPoint(x: c.x - s * 1.5, y: c.y - s * 0.2),
                CGPoint(x: c.x, y: c.y - s * 0.95),
                CGPoint(x: c.x + s * 1.5, y: c.y - s * 0.2),
                CGPoint(x: c.x + s * 1.1, y: c.y + s * 0.7),
                CGPoint(x: c.x - s * 1.1, y: c.y + s * 0.7)
            ], tension: 0.5), with: .color(p.sandFar))
            ctx.fill(Path.smoothClosed([
                CGPoint(x: c.x - s * 1.05, y: c.y - s * 0.12),
                CGPoint(x: c.x, y: c.y - s * 0.62),
                CGPoint(x: c.x + s * 1.05, y: c.y - s * 0.12),
                CGPoint(x: c.x + s * 0.7, y: c.y + s * 0.45),
                CGPoint(x: c.x - s * 0.7, y: c.y + s * 0.45)
            ], tension: 0.5), with: .color(p.seaShallow))

        case .jetty:
            water(s * 1.35, s * 0.68)
            let deck = CGRect(x: c.x - s * 0.95, y: c.y - s * 0.16,
                              width: s * 1.9, height: s * 0.30)
            ctx.paint(Path(roundedRect: deck, cornerRadius: 3), p.wood,
                      edge: p.woodDeep, width: 1.6)
            for i in 0..<5 {
                let x = deck.minX + deck.width * (0.10 + CGFloat(i) * 0.20)
                ctx.fill(Path(CGRect(x: x, y: deck.maxY, width: s * 0.10, height: s * 0.34)),
                         with: .color(p.woodDark))
            }

        case .cove:
            ctx.fill(Path.smoothClosed(mqBlob(center: c, rx: s * 1.25, ry: s * 0.70,
                                              count: 10, wobble: 0.20)),
                     with: .color(p.sandFar))
            ctx.fill(Path.smoothClosed(mqBlob(center: CGPoint(x: c.x + s * 0.12, y: c.y),
                                              rx: s * 0.78, ry: s * 0.40,
                                              count: 9, wobble: 0.22)),
                     with: .color(p.seaShallow))
            stone(-s * 1.02, -s * 0.20, s * 0.24)
            stone(s * 1.00, s * 0.10, s * 0.20)

        case .lagoon:
            ctx.fill(Path.smoothClosed(mqBlob(center: c, rx: s * 1.45, ry: s * 0.82,
                                              count: 11, wobble: 0.14)),
                     with: .color(p.sandFar))
            ctx.fill(Path.smoothClosed(mqBlob(center: c, rx: s * 1.05, ry: s * 0.55,
                                              count: 11, wobble: 0.14)),
                     with: .color(p.seaShallow.lit(0.18)))
            ctx.stroke(Path.smoothOpen([
                CGPoint(x: c.x - s * 0.6, y: c.y + s * 0.05),
                CGPoint(x: c.x, y: c.y - s * 0.10),
                CGPoint(x: c.x + s * 0.6, y: c.y + s * 0.05)
            ]), with: .color(p.foam.opacity(0.75)),
                       style: StrokeStyle(lineWidth: 2, lineCap: .round))

        case .peak:
            ctx.fill(Path { g in
                g.move(to: CGPoint(x: c.x - s * 1.30, y: c.y + s * 0.55))
                g.addLine(to: CGPoint(x: c.x - s * 0.10, y: c.y - s * 1.75))
                g.addLine(to: CGPoint(x: c.x + s * 1.30, y: c.y + s * 0.55))
                g.closeSubpath()
            }, with: .linearGradient(Gradient(colors: [rock, rockDeep]),
                                     startPoint: CGPoint(x: c.x - s, y: c.y - s),
                                     endPoint: CGPoint(x: c.x + s, y: c.y + s)))
            ctx.fill(Path { g in
                g.move(to: CGPoint(x: c.x - s * 0.10, y: c.y - s * 1.75))
                g.addLine(to: CGPoint(x: c.x + s * 0.42, y: c.y - s * 0.85))
                g.addLine(to: CGPoint(x: c.x + s * 0.05, y: c.y - s * 0.98))
                g.addLine(to: CGPoint(x: c.x - s * 0.34, y: c.y - s * 0.80))
                g.closeSubpath()
            }, with: .color(.white.opacity(0.75)))

        case .atoll:
            water(s * 1.55, s * 0.90)
            ctx.fill(Path.smoothClosed(mqBlob(center: c, rx: s * 1.15, ry: s * 0.66,
                                              count: 11, wobble: 0.18)),
                     with: .color(p.sandFar))
            ctx.fill(Path.smoothClosed(mqBlob(center: c, rx: s * 0.62, ry: s * 0.32,
                                              count: 9, wobble: 0.18)),
                     with: .color(p.seaShallow))
            palm(&ctx, at: CGPoint(x: c.x - s * 0.85, y: c.y - s * 0.05), h: s * 0.85)
        }
    }

    private func palm(_ ctx: inout GraphicsContext, at base: CGPoint, h: CGFloat) {
        let top = CGPoint(x: base.x + h * 0.16, y: base.y - h)
        ctx.stroke(Path.smoothOpen([base, CGPoint(x: base.x + h * 0.05, y: base.y - h * 0.5), top]),
                   with: .color(p.underLight(Color(hex: 0x7A5230))),
                   style: StrokeStyle(lineWidth: max(2, h * 0.11), lineCap: .round))
        for i in 0..<5 {
            let a = -CGFloat.pi * 0.94 + CGFloat(i) * .pi * 0.22
            let tip = CGPoint(x: top.x + cos(a) * h * 0.62, y: top.y + sin(a) * h * 0.40)
            ctx.stroke(Path.smoothOpen([
                top,
                CGPoint(x: (top.x + tip.x) / 2, y: (top.y + tip.y) / 2 - h * 0.14),
                tip
            ]), with: .color(jungle),
                       style: StrokeStyle(lineWidth: max(1.8, h * 0.09), lineCap: .round))
        }
    }
}
