import SwiftUI

/// The landing beach: a jetty out into the lagoon with a boat moored at its
/// head, and a driftwood fire burning on the near sand.
///
/// **Why this exists.** The design lane's own verdict on the entrance was that
/// it was the weakest screen it shipped: 244 pt of slack on the iPad, an empty
/// top third, four tokens in a single band across the middle and a wide
/// unbroken sweep of sand under them. Its words: *"a row of buttons on a
/// wallpaper rather than a place"* -- which is precisely the criticism the whole
/// rework existed to answer, on the one screen a parent sees first.
///
/// Emptiness on a beach is not fixed by adding decoration; it is fixed by
/// giving the beach a REASON. So this is one place with one story in it: you
/// arrived by boat, somebody lit a fire, and the explorers are standing between
/// the two. That also buys the composition three depth planes it did not have --
/// jetty and boat behind the tokens, tokens in the middle, fire and its
/// driftwood in front -- which is what lets the token row be staggered instead
/// of ruled.
///
/// It is drawn as a Canvas over `MQWorld` and under the content, and it takes
/// the same `horizon` fraction the world was given, so every object lands on the
/// right band of sand at any aspect ratio in the matrix. The light source is
/// `MQWorld.sunAt` -- the low left sun -- for every cast shadow here, exactly as
/// it is for the cast; the fire is the ONE second light in the system, and it
/// only ever throws warmth forward onto the sand it sits on.
public struct MQBeachCamp: View {
    let p: MQPalette
    let horizon: CGFloat
    /// The fire sits in front of the leftmost token. On a phone the tokens are a
    /// 2x2 block and there is no room beside them, so it moves to the corner and
    /// shrinks.
    let compact: Bool

    public init(_ p: MQPalette = .noon, horizon: CGFloat = 0.40, compact: Bool = false) {
        self.p = p; self.horizon = horizon; self.compact = compact
    }

    public var body: some View {
        Canvas { ctx, size in
            let W = size.width, H = size.height
            let hy = H * horizon
            let beach = hy + (H - hy) * 0.30          // waterline, as MQWorld draws it
            let dryTop = beach + (H - hy) * 0.16
            let scale = min(W, H)

            jetty(&ctx, W: W, H: H, hy: hy, beach: beach)
            fire(&ctx, W: W, H: H, dryTop: dryTop, scale: scale)
        }
        .allowsHitTesting(false)
    }

    // MARK: The jetty and its boat

    /// Drawn in perspective: the far end is narrow and sits just under the
    /// horizon, the near end is wide and lands on the wet sand. A jetty drawn
    /// as a flat rectangle reads as a plank lying on the water.
    private func jetty(_ ctx: inout GraphicsContext,
                       W: CGFloat, H: CGFloat, hy: CGFloat, beach: CGFloat) {
        // The whole structure lives in the WATER band, between the waterline
        // and the horizon haze. The first pass ran it down onto the dry sand
        // and it read as a ramp lying on the beach; a jetty is a thing that
        // goes OUT.
        let nearY = beach - (H - hy) * 0.005
        let farY  = hy + (beach - hy) * 0.30
        let nearX = W * 0.865
        let farX  = W * 0.975
        let nearHalf = W * 0.050
        let farHalf  = W * 0.018

        // Posts first, so the deck sits on them.
        let posts = 5
        for i in 0..<posts {
            let t = CGFloat(i) / CGFloat(posts - 1)
            let x = nearX + (farX - nearX) * t
            let y = nearY + (farY - nearY) * t
            let half = nearHalf + (farHalf - nearHalf) * t
            let drop = (H - hy) * (0.050 - 0.030 * t)
            for side in [-1.0, 1.0] as [CGFloat] {
                let px = x + half * side * 0.86
                let r = CGRect(x: px - max(1.4, half * 0.10), y: y,
                               width: max(2.8, half * 0.20), height: drop)
                ctx.fill(Path(roundedRect: r, cornerRadius: r.width / 2),
                         with: .color(p.woodDark.opacity(0.92)))
                // The reflection in the shallows: a post standing in water has
                // a smear under it, not a mirror image.
                ctx.fill(Path(roundedRect: r.offsetBy(dx: 0, dy: drop).insetBy(dx: -0.4, dy: 0),
                              cornerRadius: r.width / 2),
                         with: .color(p.woodDeep.opacity(0.20)))
            }
        }

        // Deck: one tapering quad, then planks across it.
        var deck = Path()
        deck.move(to: CGPoint(x: nearX - nearHalf, y: nearY))
        deck.addLine(to: CGPoint(x: farX - farHalf, y: farY))
        deck.addLine(to: CGPoint(x: farX + farHalf, y: farY))
        deck.addLine(to: CGPoint(x: nearX + nearHalf, y: nearY))
        deck.closeSubpath()
        ctx.fill(deck, with: .linearGradient(
            Gradient(colors: [p.woodDark, p.wood, p.woodLight]),
            startPoint: CGPoint(x: 0, y: farY), endPoint: CGPoint(x: 0, y: nearY)))
        ctx.stroke(deck, with: .color(p.woodDeep.opacity(0.75)), lineWidth: 2)

        let planks = 9
        for i in 1..<planks {
            let t = CGFloat(i) / CGFloat(planks)
            let x = nearX + (farX - nearX) * t
            let y = nearY + (farY - nearY) * t
            let half = nearHalf + (farHalf - nearHalf) * t
            ctx.stroke(Path { $0.move(to: CGPoint(x: x - half, y: y))
                              $0.addLine(to: CGPoint(x: x + half, y: y)) },
                       with: .color(p.woodDeep.opacity(0.28)),
                       style: StrokeStyle(lineWidth: 1.4))
        }

        // The boat, moored on the SEAWARD side of the deck. It started on the
        // shoreward side and the entrance screen's last profile token stood
        // right on top of it -- nothing was visible but an oar. Outboard of the
        // deck it has the one strip of open water on the screen to itself.
        // Small on purpose: it is the REASON the jetty is there, not a second
        // hero. Drawn in profile with a raised bow and a transom, because a
        // symmetrical curve reads as a bowl -- which is exactly what the first
        // attempt looked like.
        let boatC = CGPoint(x: nearX + nearHalf * 1.55,
                            y: nearY - (beach - hy) * 0.20)
        let bw = min(W * 0.062, (beach - hy) * 0.62)
        let bh = bw * 0.40
        let hull = Path.smoothClosed([
            CGPoint(x: boatC.x - bw * 0.50, y: boatC.y - bh * 0.62),   // bow, raised
            CGPoint(x: boatC.x - bw * 0.22, y: boatC.y + bh * 0.34),
            CGPoint(x: boatC.x + bw * 0.26, y: boatC.y + bh * 0.40),
            CGPoint(x: boatC.x + bw * 0.50, y: boatC.y - bh * 0.44)    // transom
        ], tension: 0.34)
        ctx.fill(hull.offsetBy(dx: 0, dy: bh * 0.55),
                 with: .color(p.seaDeep.opacity(0.30)))               // its own shadow on the water
        ctx.fill(hull, with: .linearGradient(
            Gradient(colors: [p.underLight(Color(hex: 0xF2E7CE)),
                              p.underLight(Color(hex: 0xC3A87F))]),
            startPoint: CGPoint(x: 0, y: boatC.y - bh),
            endPoint: CGPoint(x: 0, y: boatC.y + bh)))
        ctx.stroke(hull, with: .color(p.woodDeep.opacity(0.85)), lineWidth: 1.8)
        // Gunwale stripe, one thwart, one oar shipped over the side.
        ctx.stroke(Path.smoothOpen([
            CGPoint(x: boatC.x - bw * 0.44, y: boatC.y - bh * 0.50),
            CGPoint(x: boatC.x, y: boatC.y - bh * 0.20),
            CGPoint(x: boatC.x + bw * 0.44, y: boatC.y - bh * 0.34)
        ]), with: .color(p.coral.opacity(0.88)),
                   style: StrokeStyle(lineWidth: max(1.6, bh * 0.18), lineCap: .round))
        ctx.stroke(Path { $0.move(to: CGPoint(x: boatC.x - bw * 0.02, y: boatC.y - bh * 0.24))
                          $0.addLine(to: CGPoint(x: boatC.x + bw * 0.06, y: boatC.y + bh * 0.10)) },
                   with: .color(p.woodDark.opacity(0.8)),
                   style: StrokeStyle(lineWidth: max(1.2, bh * 0.12), lineCap: .round))
        ctx.stroke(Path { $0.move(to: CGPoint(x: boatC.x - bw * 0.26, y: boatC.y - bh * 0.10))
                          $0.addLine(to: CGPoint(x: boatC.x + bw * 0.62, y: boatC.y - bh * 1.30)) },
                   with: .color(p.woodDark),
                   style: StrokeStyle(lineWidth: max(1.4, bh * 0.13), lineCap: .round))
    }

    // MARK: The fire

    /// Three logs, a stone ring, and flames drawn as three nested leaf shapes --
    /// the same construction the crystals use, so the fire belongs to this
    /// system rather than to a particle emitter.
    private func fire(_ ctx: inout GraphicsContext,
                      W: CGFloat, H: CGFloat, dryTop: CGFloat, scale: CGFloat) {
        // Small, and in the bottom-left corner where the frame crops its stone
        // ring. A foreground object bleeding off-canvas is a depth cue; a fire
        // sitting politely inside the margin is a sticker. It is kept clear of
        // the leftmost token's crystal row, which is INFORMATION -- the first
        // pass drew the flame straight through Charlotte's crystal count.
        let s = scale * (compact ? 0.075 : 0.078)
        let c = compact
            ? CGPoint(x: W * 0.105, y: H - s * 0.55)
            : CGPoint(x: W * 0.048, y: H - s * 0.42)
        _ = dryTop

        // Warm pool on the sand. The one light in the system that is not the
        // sun, and it never reaches past its own ring of stones.
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - s * 3.1, y: c.y - s * 1.5,
                                        width: s * 6.2, height: s * 3.0)),
                 with: .radialGradient(
                    Gradient(colors: [p.gold.opacity(p.isDusk ? 0.42 : 0.20), .clear]),
                    center: c, startRadius: 0, endRadius: s * 3.1))

        // Stones.
        for (i, t) in ([-1.0, -0.45, 0.15, 0.8] as [CGFloat]).enumerated() {
            let r = CGRect(x: c.x + t * s * 1.15 - s * 0.30,
                           y: c.y + s * 0.10 + CGFloat(i % 2) * s * 0.10,
                           width: s * 0.62, height: s * 0.42)
            ctx.fill(Path(ellipseIn: r), with: .color(p.iron.opacity(0.85)))
            ctx.fill(Path(ellipseIn: r.insetBy(dx: s * 0.10, dy: s * 0.12)
                            .offsetBy(dx: -s * 0.04, dy: -s * 0.05)),
                     with: .color(.white.opacity(0.22)))
        }

        // Logs, crossed.
        for (a, len) in [(-0.42, 1.55), (0.36, 1.40)] as [(CGFloat, CGFloat)] {
            let d = CGPoint(x: cos(a) * s * len, y: sin(a) * s * len * 0.42)
            ctx.stroke(Path { $0.move(to: CGPoint(x: c.x - d.x, y: c.y - d.y))
                              $0.addLine(to: CGPoint(x: c.x + d.x, y: c.y + d.y)) },
                       with: .color(p.woodDark),
                       style: StrokeStyle(lineWidth: s * 0.30, lineCap: .round))
        }

        // Flame: outer gold, inner white-hot. Static -- this is a still frame,
        // and a flame that needs animation to read has the wrong silhouette.
        func flame(_ h: CGFloat, _ w: CGFloat, _ color: Color, _ dx: CGFloat) {
            let base = CGPoint(x: c.x + dx, y: c.y - s * 0.10)
            var f = Path()
            f.move(to: CGPoint(x: base.x - w / 2, y: base.y))
            f.addQuadCurve(to: CGPoint(x: base.x + w * 0.10, y: base.y - h),
                           control: CGPoint(x: base.x - w * 0.62, y: base.y - h * 0.58))
            f.addQuadCurve(to: CGPoint(x: base.x + w / 2, y: base.y),
                           control: CGPoint(x: base.x + w * 0.66, y: base.y - h * 0.46))
            f.closeSubpath()
            ctx.fill(f, with: .color(color))
        }
        flame(s * 1.85, s * 1.15, p.coral.opacity(0.92), -s * 0.06)
        flame(s * 1.35, s * 0.80, p.gold, s * 0.02)
        flame(s * 0.72, s * 0.42, Color.white.opacity(0.85), s * 0.06)

        // Two pieces of driftwood lying nearby, so the fire has a supply and the
        // near sand has something in it.
        for (dx, dy, a, len) in [(2.6, 0.55, -0.16, 1.5), (3.6, 0.95, 0.11, 1.1)]
                as [(CGFloat, CGFloat, CGFloat, CGFloat)] {
            let o = CGPoint(x: c.x + s * dx, y: c.y + s * dy)
            let d = CGPoint(x: cos(a) * s * len, y: sin(a) * s * len)
            ctx.stroke(Path { $0.move(to: CGPoint(x: o.x - d.x, y: o.y - d.y))
                              $0.addLine(to: CGPoint(x: o.x + d.x, y: o.y + d.y)) },
                       with: .color(p.sandShade.opacity(0.55)),
                       style: StrokeStyle(lineWidth: s * 0.30, lineCap: .round))
            ctx.stroke(Path { $0.move(to: CGPoint(x: o.x - d.x, y: o.y - d.y - s * 0.06))
                              $0.addLine(to: CGPoint(x: o.x + d.x, y: o.y + d.y - s * 0.06)) },
                       with: .color(p.woodLight.opacity(0.75)),
                       style: StrokeStyle(lineWidth: s * 0.16, lineCap: .round))
        }
    }
}
