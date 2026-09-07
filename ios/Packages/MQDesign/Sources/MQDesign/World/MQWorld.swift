import SwiftUI

/// Shape Shore, seen from the beach: seven planes between the child and the
/// horizon.
///
/// The rejected sample had ONE plane -- a cyan gradient -- and that is most of
/// why it read as an app rather than a place. Depth here is built the way an
/// illustrator builds it: each plane further away is lower in contrast, lower in
/// saturation and closer to the horizon's haze, the two nearest planes are
/// near-black silhouettes so the eye has something to sit behind, and ONE light
/// source lights everything drawn on top.
///
/// `horizon` is a fraction of height. On a phone it sits higher, which gives the
/// beach more room and stops the signboard crowding the sea.
public struct MQWorld: View {
    let p: MQPalette
    let horizon: CGFloat
    let showForeground: Bool

    public init(_ p: MQPalette = .noon, horizon: CGFloat = 0.34,
                showForeground: Bool = true) {
        self.p = p; self.horizon = horizon; self.showForeground = showForeground
    }

    /// Where the light comes from, in unit coordinates. Every cel shadow, rim
    /// light and cast shadow in the package is thrown from here; that one
    /// consistency is what a "painterly" read is actually made of.
    public static let sunAt = CGPoint(x: 0.15, y: 0.74)

    public var body: some View {
        Canvas { ctx, size in
            let W = size.width, H = size.height
            let hy = H * horizon

            // 1. Sky. Warm at the horizon, cool at the top -- the reverse of the
            //    usual UI gradient, and the whole reason the scene reads as a
            //    time of day rather than as a header.
            ctx.fill(Path(CGRect(x: 0, y: 0, width: W, height: hy + 2)),
                     with: .linearGradient(
                        Gradient(stops: [
                            .init(color: p.skyHigh, location: 0),
                            .init(color: p.skyMid,  location: 0.55),
                            .init(color: p.skyLow,  location: 1)
                        ]),
                        startPoint: .zero, endPoint: CGPoint(x: 0, y: hy)))

            // 1b. After sundown the sky has stars in it, thinning toward the
            //     horizon glow. Placed from a fixed seed, so a snapshot gate
            //     compares like with like.
            if p.isDusk {
                var s: UInt64 = 0xC0FFEE
                func r() -> CGFloat {
                    s = s &* 6364136223846793005 &+ 1442695040888963407
                    return CGFloat((s >> 33) % 10_000) / 10_000
                }
                for _ in 0..<70 {
                    let x = r() * W
                    let t = r()
                    let y = t * t * hy * 0.86
                    let rr = 0.8 + r() * 1.5
                    ctx.fill(Path(ellipseIn: CGRect(x: x, y: y, width: rr, height: rr)),
                             with: .color(.white.opacity(0.20 + Double(1 - t) * 0.55)))
                }
            }

            // 2. The sun, low and to the left, below the HUD. A sun disc behind
            //    a health bar washes the bar out, which the first pass proved by
            //    doing it.
            let sun = CGPoint(x: W * Self.sunAt.x, y: hy * Self.sunAt.y)
            for i in stride(from: 14, through: 1, by: -1) {
                let r = hy * 0.085 * CGFloat(i)
                ctx.fill(Path(ellipseIn: CGRect(x: sun.x - r, y: sun.y - r,
                                                width: r * 2, height: r * 2)),
                         with: .color(p.sunHalo.opacity(p.isDusk ? 0.07 : 0.05)))
            }
            let sr = hy * 0.085
            ctx.fill(Path(ellipseIn: CGRect(x: sun.x - sr * 1.7, y: sun.y - sr * 1.7,
                                            width: sr * 3.4, height: sr * 3.4)),
                     with: .radialGradient(
                        Gradient(stops: [
                            .init(color: p.sunCore.opacity(0.85), location: 0),
                            .init(color: p.sunCore.opacity(0.55), location: 0.55),
                            .init(color: .clear, location: 1)
                        ]),
                        center: sun, startRadius: 0, endRadius: sr * 1.7))

            // 3. Two cloud banks, flat-bottomed and lit underneath.
            drawCloud(&ctx, at: CGPoint(x: W * 0.66, y: hy * 0.26), w: W * 0.24, h: hy * 0.12)
            drawCloud(&ctx, at: CGPoint(x: W * 0.34, y: hy * 0.15), w: W * 0.16, h: hy * 0.08)

            // 4. Far island -- almost sky colour. If you can read its shape
            //    clearly it is too close.
            var far = Path()
            far.move(to: CGPoint(x: W * 0.60, y: hy))
            far.addCurve(to: CGPoint(x: W * 0.78, y: hy * 0.80),
                         control1: CGPoint(x: W * 0.66, y: hy * 0.96),
                         control2: CGPoint(x: W * 0.71, y: hy * 0.80))
            far.addCurve(to: CGPoint(x: W * 1.02, y: hy),
                         control1: CGPoint(x: W * 0.86, y: hy * 0.80),
                         control2: CGPoint(x: W * 0.92, y: hy * 0.97))
            far.closeSubpath()
            ctx.fill(far, with: .color(p.islandFar.opacity(0.55)))

            // 5. Mid island, with a headland and two palm silhouettes on it.
            var mid = Path()
            mid.move(to: CGPoint(x: -W * 0.04, y: hy))
            mid.addCurve(to: CGPoint(x: W * 0.10, y: hy * 0.86),
                         control1: CGPoint(x: W * 0.00, y: hy * 0.98),
                         control2: CGPoint(x: W * 0.04, y: hy * 0.86))
            mid.addCurve(to: CGPoint(x: W * 0.30, y: hy),
                         control1: CGPoint(x: W * 0.18, y: hy * 0.86),
                         control2: CGPoint(x: W * 0.24, y: hy * 0.99))
            mid.closeSubpath()
            ctx.fill(mid, with: .color(p.islandMid.opacity(0.70)))
            palmSilhouette(&ctx, base: CGPoint(x: W * 0.085, y: hy * 0.93),
                           h: hy * 0.16, color: p.islandMid.opacity(0.85), lean: -0.10)
            palmSilhouette(&ctx, base: CGPoint(x: W * 0.135, y: hy * 0.96),
                           h: hy * 0.12, color: p.islandMid.opacity(0.75), lean: 0.14)

            // 6. Sea: three bands, darkest at the horizon, a light path under
            //    the sun, and a foam line where it meets the sand.
            let beach = hy + (H - hy) * 0.30
            ctx.fill(Path(CGRect(x: 0, y: hy, width: W, height: beach - hy)),
                     with: .linearGradient(
                        Gradient(colors: [p.seaDeep, p.seaMid, p.seaShallow]),
                        startPoint: CGPoint(x: 0, y: hy),
                        endPoint: CGPoint(x: 0, y: beach)))
            for i in 0..<9 {
                let t = CGFloat(i) / 8
                let y = hy + (beach - hy) * (0.10 + t * 0.80)
                let w = (W * 0.02) + t * (W * 0.075)
                let r = CGRect(x: sun.x - w / 2 + CGFloat((i % 3) - 1) * W * 0.012,
                               y: y, width: w, height: max(2, (H - hy) * 0.012))
                ctx.fill(Path(roundedRect: r, cornerRadius: r.height / 2),
                         with: .color(p.sunCore.opacity(0.20 + Double(t) * 0.28)))
            }
            for i in 0..<7 {
                let t = CGFloat(i) / 6
                let y = hy + (beach - hy) * (0.18 + t * 0.66)
                let x = W * (0.06 + CGFloat((i * 37) % 100) / 100 * 0.86)
                let w = (W * 0.03) + t * (W * 0.05)
                ctx.stroke(Path.smoothOpen([
                    CGPoint(x: x, y: y),
                    CGPoint(x: x + w * 0.5, y: y - (H - hy) * 0.012),
                    CGPoint(x: x + w, y: y)
                ]), with: .color(p.foam.opacity(0.42)),
                           style: StrokeStyle(lineWidth: max(1.5, (H - hy) * 0.008),
                                              lineCap: .round))
            }

            // 7. Wet sand, then dry sand. The wet band is what makes a beach
            //    read as a beach rather than as a yellow rectangle.
            var wet = Path()
            wet.move(to: CGPoint(x: 0, y: beach))
            wet.addCurve(to: CGPoint(x: W, y: beach + (H - hy) * 0.03),
                         control1: CGPoint(x: W * 0.30, y: beach + (H - hy) * 0.09),
                         control2: CGPoint(x: W * 0.66, y: beach - (H - hy) * 0.04))
            wet.addLine(to: CGPoint(x: W, y: H))
            wet.addLine(to: CGPoint(x: 0, y: H))
            wet.closeSubpath()
            ctx.fill(wet, with: .linearGradient(
                Gradient(colors: [p.sandFar.mixed(with: p.seaShallow, by: 0.30), p.sandFar]),
                startPoint: CGPoint(x: 0, y: beach),
                endPoint: CGPoint(x: 0, y: beach + (H - hy) * 0.22)))
            var foamLine = Path()
            foamLine.move(to: CGPoint(x: 0, y: beach))
            foamLine.addCurve(to: CGPoint(x: W, y: beach + (H - hy) * 0.03),
                              control1: CGPoint(x: W * 0.30, y: beach + (H - hy) * 0.09),
                              control2: CGPoint(x: W * 0.66, y: beach - (H - hy) * 0.04))
            ctx.stroke(foamLine, with: .color(p.foam.opacity(0.85)),
                       style: StrokeStyle(lineWidth: max(3, (H - hy) * 0.022), lineCap: .round))

            var dry = Path()
            let dryTop = beach + (H - hy) * 0.16
            dry.move(to: CGPoint(x: 0, y: dryTop + (H - hy) * 0.05))
            dry.addCurve(to: CGPoint(x: W, y: dryTop),
                         control1: CGPoint(x: W * 0.34, y: dryTop - (H - hy) * 0.03),
                         control2: CGPoint(x: W * 0.60, y: dryTop + (H - hy) * 0.06))
            dry.addLine(to: CGPoint(x: W, y: H))
            dry.addLine(to: CGPoint(x: 0, y: H))
            dry.closeSubpath()
            ctx.fill(dry, with: .linearGradient(
                Gradient(colors: [p.sandFar, p.sandNear]),
                startPoint: CGPoint(x: 0, y: dryTop),
                endPoint: CGPoint(x: 0, y: H)))

            var seed: UInt64 = 0x5EED
            func rnd() -> CGFloat {
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                return CGFloat((seed >> 33) % 10_000) / 10_000
            }
            for _ in 0..<90 {
                let x = rnd() * W
                let y = dryTop + rnd() * (H - dryTop)
                let r = 1 + rnd() * 2.2
                ctx.fill(Path(ellipseIn: CGRect(x: x, y: y, width: r * 2.4, height: r)),
                         with: .color(p.sandShade.opacity(0.10 + Double(rnd()) * 0.18)))
            }

            // 8. Foreground silhouettes: near-black, bottom corners only, rooted
            //    well off-canvas. Foliage that crosses a creature's feet reads
            //    as damage, not as depth.
            if showForeground {
                frondCluster(&ctx, origin: CGPoint(x: -W * 0.05, y: H + H * 0.05),
                             scale: min(W, H) * 0.30, flip: false, color: p.foliageNear)
                frondCluster(&ctx, origin: CGPoint(x: W * 1.05, y: H + H * 0.06),
                             scale: min(W, H) * 0.26, flip: true,
                             color: p.foliageNear.opacity(0.92))
            }

            // 9. One warm wash from the light source and a soft vignette. This
            //    is what stops eight drawn layers looking like eight stickers.
            ctx.fill(Path(CGRect(origin: .zero, size: size)),
                     with: .radialGradient(
                        Gradient(colors: [p.sunHalo.opacity(p.isDusk ? 0.26 : 0.20), .clear]),
                        center: sun, startRadius: 0, endRadius: max(W, H) * 0.72))
            ctx.fill(Path(CGRect(origin: .zero, size: size)),
                     with: .radialGradient(
                        Gradient(stops: [
                            .init(color: .clear, location: 0.50),
                            .init(color: Color(hex: 0x120A06).opacity(p.vignette), location: 1)
                        ]),
                        center: CGPoint(x: W / 2, y: H * 0.45),
                        startRadius: 0, endRadius: max(W, H) * 0.78))
        }
        .ignoresSafeArea()
    }

    private func drawCloud(_ ctx: inout GraphicsContext, at c: CGPoint, w: CGFloat, h: CGFloat) {
        var lobes: [CGPoint] = []
        let n = 9
        for i in 0..<n {
            let t = CGFloat(i) / CGFloat(n)
            let ang = t * 2 * .pi
            let bump: CGFloat = (i % 2 == 0) ? 1.0 : 0.74
            let flat: CGFloat = sin(ang) > 0 ? 0.35 : 1.0   // flat underside
            lobes.append(CGPoint(x: c.x + cos(ang) * w / 2 * (0.85 + bump * 0.15),
                                 y: c.y + sin(ang) * h / 2 * bump * flat))
        }
        ctx.fill(Path.smoothClosed(lobes, tension: 0.62), with: .linearGradient(
            Gradient(colors: [p.cloud.opacity(0.95), p.cloudShade.opacity(0.80)]),
            startPoint: CGPoint(x: c.x, y: c.y - h / 2),
            endPoint: CGPoint(x: c.x, y: c.y + h / 2)))
    }

    private func palmSilhouette(_ ctx: inout GraphicsContext, base: CGPoint,
                                h: CGFloat, color: Color, lean: CGFloat) {
        let top = CGPoint(x: base.x + h * lean * 2.2, y: base.y - h)
        ctx.stroke(Path.smoothOpen([base, CGPoint(x: base.x + h * lean, y: base.y - h * 0.5), top]),
                   with: .color(color),
                   style: StrokeStyle(lineWidth: max(2, h * 0.075), lineCap: .round))
        for i in 0..<5 {
            let a = -CGFloat.pi * 0.92 + CGFloat(i) * .pi * 0.21
            let tip = CGPoint(x: top.x + cos(a) * h * 0.52, y: top.y + sin(a) * h * 0.34)
            ctx.stroke(Path.smoothOpen([
                top,
                CGPoint(x: (top.x + tip.x) / 2, y: (top.y + tip.y) / 2 - h * 0.10),
                tip
            ]), with: .color(color),
                       style: StrokeStyle(lineWidth: max(1.5, h * 0.055), lineCap: .round))
        }
    }

    /// A near-black clump of leaves rooted off-canvas, drawn as overlapping
    /// blades rather than one blob so the silhouette has teeth.
    private func frondCluster(_ ctx: inout GraphicsContext, origin: CGPoint,
                              scale s: CGFloat, flip: Bool, color: Color) {
        let dir: CGFloat = flip ? -1 : 1
        for (i, a) in ([-1.42, -1.10, -0.80, -0.52, -0.26] as [CGFloat]).enumerated() {
            let len = s * (0.62 + CGFloat((i * 7) % 5) / 5 * 0.42)
            let tip = CGPoint(x: origin.x + dir * cos(a) * len * 0.86,
                              y: origin.y + sin(a) * len)
            let mid = CGPoint(x: (origin.x + tip.x) / 2 + dir * s * 0.06,
                              y: (origin.y + tip.y) / 2 + s * 0.05)
            ctx.fill(Path.smoothClosed([
                origin,
                CGPoint(x: mid.x - dir * s * 0.10, y: mid.y - s * 0.05),
                tip,
                CGPoint(x: mid.x + dir * s * 0.07, y: mid.y + s * 0.09)
            ], tension: 0.55), with: .color(color))
            ctx.stroke(Path.smoothOpen([origin, mid, tip]),
                       with: .color(color.mixed(with: .white, by: 0.10)),
                       style: StrokeStyle(lineWidth: max(1, s * 0.008)))
        }
    }
}
