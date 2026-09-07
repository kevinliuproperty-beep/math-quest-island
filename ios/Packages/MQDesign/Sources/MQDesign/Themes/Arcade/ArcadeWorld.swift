import SwiftUI

/// The arena floor for Direction B.
///
/// Depth here is done with perspective rather than with aerial layers: a
/// vanishing point on the horizon, a grid whose spacing opens up as it comes
/// toward the child, and a hard bright horizon band with the arena's own light
/// bleeding upward out of it. Two glow pools sit where the fighters stand, so
/// they are lit BY the floor rather than pasted onto it.
public struct ArcadeWorld: View {
    let p: ArcadePalette
    let horizonAt: CGFloat

    public init(_ p: ArcadePalette = .standard, horizonAt: CGFloat = 0.50) {
        self.p = p; self.horizonAt = horizonAt
    }

    public var body: some View {
        Canvas { ctx, size in
            let W = size.width, H = size.height
            let hy = H * horizonAt
            let vp = CGPoint(x: W / 2, y: hy)

            // Void above.
            ctx.fill(Path(CGRect(x: 0, y: 0, width: W, height: hy)),
                     with: .linearGradient(Gradient(colors: [p.voidTop, p.voidBottom]),
                                           startPoint: .zero, endPoint: CGPoint(x: 0, y: hy)))
            // The arena's light spilling up out of the horizon.
            ctx.fill(Path(CGRect(x: 0, y: 0, width: W, height: hy)),
                     with: .radialGradient(
                        Gradient(stops: [
                            .init(color: p.arenaGlow.opacity(0.85), location: 0),
                            .init(color: p.arenaGlow.opacity(0.28), location: 0.45),
                            .init(color: .clear, location: 1)
                        ]),
                        center: vp, startRadius: 0, endRadius: max(W * 0.62, hy * 1.5)))

            // Sparks drifting in the dark. Deterministic, seeded by index.
            var seed: UInt64 = 0xA11CE
            func rnd() -> CGFloat {
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                return CGFloat((seed >> 33) % 10_000) / 10_000
            }
            for _ in 0..<46 {
                let x = rnd() * W
                let y = rnd() * hy * 0.98
                let r = 0.9 + rnd() * 2.4
                let dim = 0.10 + Double(rnd()) * 0.42
                ctx.fill(Path(ellipseIn: CGRect(x: x, y: y, width: r * 2, height: r * 2)),
                         with: .color((rnd() > 0.7 ? p.mint : p.horizon).opacity(dim)))
            }

            // Floor.
            ctx.fill(Path(CGRect(x: 0, y: hy, width: W, height: H - hy)),
                     with: .linearGradient(Gradient(colors: [p.floorFar, p.floorNear, p.voidTop]),
                                           startPoint: CGPoint(x: 0, y: hy),
                                           endPoint: CGPoint(x: 0, y: H)))

            // Grid: rays to the vanishing point, then rungs with opening spacing.
            for i in -14...14 {
                let x = W / 2 + CGFloat(i) * W * 0.115
                var ray = Path()
                ray.move(to: vp)
                ray.addLine(to: CGPoint(x: W / 2 + (x - W / 2) * 3.2, y: H))
                ctx.stroke(ray, with: .color(p.grid.opacity(0.20)), lineWidth: 1.4)
            }
            var t: CGFloat = 0.012
            var step: CGFloat = 0.012
            while t < 1.0 {
                let y = hy + (H - hy) * t
                ctx.stroke(Path { $0.move(to: CGPoint(x: 0, y: y))
                                  $0.addLine(to: CGPoint(x: W, y: y)) },
                           with: .color(p.grid.opacity(0.10 + Double(t) * 0.20)),
                           lineWidth: 1 + t * 1.6)
                step *= 1.42
                t += step
            }

            // The horizon itself: a hard bright line with a bloom above and
            // below. This is the one place in the design allowed to be pure
            // light, and it is what makes the floor read as a floor.
            for (h, o) in [(CGFloat(26), 0.10), (CGFloat(12), 0.18), (CGFloat(5), 0.35)] {
                ctx.fill(Path(CGRect(x: 0, y: hy - h, width: W, height: h * 2)),
                         with: .color(p.horizon.opacity(o)))
            }
            ctx.fill(Path(CGRect(x: 0, y: hy - 1.4, width: W, height: 2.8)),
                     with: .linearGradient(
                        Gradient(colors: [p.horizon.opacity(0.2), p.mint, p.horizon, p.rose,
                                          p.horizon.opacity(0.2)]),
                        startPoint: .zero, endPoint: CGPoint(x: W, y: 0)))

            // Two pools where the fighters stand.
            for (cx, color) in [(W * 0.17, p.mint), (W * 0.83, p.rose)] {
                let cy = H * 0.86
                for i in stride(from: 6, through: 1, by: -1) {
                    let rx = W * 0.035 * CGFloat(i)
                    ctx.fill(Path(ellipseIn: CGRect(x: cx - rx, y: cy - rx * 0.30,
                                                    width: rx * 2, height: rx * 0.60)),
                             with: .color(color.opacity(0.055)))
                }
            }

            // Corner vignette so the HUD always sits on the darkest part.
            ctx.fill(Path(CGRect(origin: .zero, size: size)),
                     with: .radialGradient(
                        Gradient(stops: [
                            .init(color: .clear, location: 0.48),
                            .init(color: Color.black.opacity(0.55), location: 1)
                        ]),
                        center: CGPoint(x: W / 2, y: H * 0.5),
                        startRadius: 0, endRadius: max(W, H) * 0.72))
        }
        .ignoresSafeArea()
    }
}
