import SwiftUI

// Chrome for Direction A.
//
// The rule that generated all of it: NOTHING on this screen is allowed to be a
// rounded rectangle with a shadow. Every surface is a thing that exists on a
// beach -- a nailed board, a driftwood tile, a rope of shells, a storm lantern.
// The rejected sample's pills and cards were the second-loudest generic tell
// after the emoji, because that chrome is the same chrome as a settings screen.

// MARK: - The question, on a signpost planted in the sand

public struct StorybookSign<Content: View>: View {
    let p: StorybookPalette
    let postHeight: CGFloat
    let padH: CGFloat
    let padV: CGFloat
    let content: Content

    public init(_ p: StorybookPalette = .noon, postHeight: CGFloat = 46,
                padH: CGFloat = 30, padV: CGFloat = 24,
                @ViewBuilder content: () -> Content) {
        self.p = p; self.postHeight = postHeight
        self.padH = padH; self.padV = padV; self.content = content()
    }

    public var body: some View {
        VStack(spacing: 0) {
            content
                .padding(.horizontal, padH)
                .padding(.vertical, padV)
                .frame(maxWidth: .infinity)
            Color.clear.frame(height: postHeight)
        }
        .background { Canvas { ctx, size in draw(&ctx, size) } }
    }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let W = size.width, H = size.height
        let boardH = H - postHeight
        let board = CGRect(x: 0, y: 0, width: W, height: boardH)

        // Posts, driven into the sand behind the board.
        for x in [W * 0.24, W * 0.76] {
            let r = CGRect(x: x - 13, y: boardH - 16, width: 26, height: postHeight + 16)
            ctx.fill(Path(roundedRect: r, cornerRadius: 5),
                     with: .linearGradient(Gradient(colors: [p.woodLight, p.woodDark]),
                                           startPoint: CGPoint(x: r.minX, y: 0),
                                           endPoint: CGPoint(x: r.maxX, y: 0)))
            ctx.stroke(Path(roundedRect: r, cornerRadius: 5),
                       with: .color(p.woodDeep.opacity(0.55)), lineWidth: 1.4)
            // Sand piled at the foot.
            ctx.fill(Path.smoothClosed([
                CGPoint(x: x - 34, y: H), CGPoint(x: x - 14, y: H - 11),
                CGPoint(x: x + 16, y: H - 12), CGPoint(x: x + 36, y: H)
            ], tension: 0.5), with: .color(p.sandShade.opacity(0.75)))
        }

        // Cast shadow on the sand, thrown right by the low left sun. Read at
        // thumbnail size the sign was floating; the shadow is what pins it.
        for i in 0..<3 {
            let t = CGFloat(i)
            ctx.fill(Path(roundedRect: board.offsetBy(dx: 10 + t * 6, dy: 9 + t * 5)
                            .insetBy(dx: -t * 2, dy: -t * 2), cornerRadius: 20),
                     with: .color(p.sandShade.opacity(0.16)))
        }

        // Wooden frame.
        ctx.fill(Path(roundedRect: board, cornerRadius: 18),
                 with: .linearGradient(Gradient(colors: [p.woodLight, p.wood, p.woodDark]),
                                       startPoint: CGPoint(x: 0, y: 0),
                                       endPoint: CGPoint(x: W * 0.3, y: boardH)))
        ctx.stroke(Path(roundedRect: board.insetBy(dx: 1.4, dy: 1.4), cornerRadius: 18),
                   with: .color(p.woodDeep), lineWidth: 3)

        // Plank seams across the frame.
        for t in [0.34, 0.66] as [CGFloat] {
            ctx.stroke(Path { $0.move(to: CGPoint(x: W * t, y: 0))
                              $0.addLine(to: CGPoint(x: W * t, y: boardH)) },
                       with: .color(p.woodDeep.opacity(0.16)), lineWidth: 1.6)
        }

        // Parchment panel: a rectangular SHEET with a torn edge, not a blob.
        // The first pass used a soft superellipse and a big wobble, and the
        // result read as spilled milk rather than as paper nailed to wood.
        let inset: CGFloat = 17
        let panel = board.insetBy(dx: inset, dy: inset)
        var deckle: [CGPoint] = []
        let steps = 40
        for i in 0..<steps {
            let t = CGFloat(i) / CGFloat(steps)
            let a = t * 2 * .pi
            let jitter = sin(CGFloat(i) * 2.31) * 1.6 + sin(CGFloat(i) * 0.91) * 1.1
            let rx = panel.width / 2, ry = panel.height / 2
            let cx = panel.midX, cy = panel.midY
            let k: CGFloat = 7.5   // squareness: high, so it stays a sheet
            let cs = cos(a), sn = sin(a)
            let x = cx + copysign(pow(abs(cs), 2 / k), cs) * (rx + jitter)
            let y = cy + copysign(pow(abs(sn), 2 / k), sn) * (ry + jitter)
            deckle.append(CGPoint(x: x, y: y))
        }
        let paper = Path.smoothClosed(deckle, tension: 0.28)
        ctx.fill(paper, with: .color(p.woodDeep.opacity(0.30)))   // sits in the frame
        ctx.fill(paper.offsetBy(dx: -1.5, dy: -2),
                 with: .linearGradient(Gradient(colors: [Color.white.opacity(0.55), .clear]),
                                       startPoint: .zero,
                                       endPoint: CGPoint(x: 0, y: boardH)))
        ctx.fill(paper, with: .radialGradient(
            Gradient(colors: [p.parchment, p.parchment, p.parchmentEdge]),
            center: CGPoint(x: panel.midX - panel.width * 0.16, y: panel.midY - panel.height * 0.2),
            startRadius: 0, endRadius: max(panel.width, panel.height) * 0.75))
        // Two faint tea stains so the paper is not a flat fill.
        ctx.fill(Path(ellipseIn: CGRect(x: panel.maxX - 90, y: panel.minY + 12,
                                        width: 74, height: 40)),
                 with: .color(p.parchmentEdge.opacity(0.45)))
        ctx.fill(Path(ellipseIn: CGRect(x: panel.minX + 18, y: panel.maxY - 46,
                                        width: 62, height: 30)),
                 with: .color(p.parchmentEdge.opacity(0.35)))

        // Four iron nails through the parchment corners. Pushed right into the
        // corners: at phone width a nail set further in lands on the first
        // line of the question.
        let nr = min(6, boardH * 0.024)
        for (nx, ny) in [(panel.minX + nr * 0.4, panel.minY + nr * 0.5),
                         (panel.maxX - nr * 0.4, panel.minY + nr * 0.5),
                         (panel.minX + nr * 0.4, panel.maxY - nr * 0.5),
                         (panel.maxX - nr * 0.4, panel.maxY - nr * 0.5)] {
            ctx.fill(Path(ellipseIn: CGRect(x: nx - nr, y: ny - nr * 0.85,
                                            width: nr * 2, height: nr * 1.8)),
                     with: .color(p.iron))
            ctx.fill(Path(ellipseIn: CGRect(x: nx - nr * 0.65, y: ny - nr * 0.62,
                                            width: nr * 0.82, height: nr * 0.74)),
                     with: .color(.white.opacity(0.5)))
        }
    }
}

// MARK: - The figure, drawn on the parchment in ink

/// A real rectangle with real dimension labels. The rejected sample left a
/// dashed placeholder box in the middle of the card, which is the single
/// clearest "unfinished template" signal a parent could be shown. Six of the
/// engine's topics emit figures; the design has to prove it can hold one.
public struct StorybookRectFigure: View {
    let p: StorybookPalette
    let long: String
    let wide: String

    public init(_ p: StorybookPalette = .noon, long: String, wide: String) {
        self.p = p; self.long = long; self.wide = wide
    }

    public var body: some View {
        Canvas { ctx, size in
            // The rectangle is drawn TO SCALE: 14 by 9 really is 14 by 9. A
            // maths app whose figure is the wrong shape teaches the wrong
            // thing, and a child measuring with their eye is not wrong.
            let ratio: CGFloat = 14.0 / 9.0
            let avail = CGSize(width: size.width - 68, height: size.height - 32)
            var w = avail.width, h = w / ratio
            if h > avail.height { h = avail.height; w = h * ratio }
            // Nudged right to leave room for the rotated side label.
            let r = CGRect(x: (size.width - w) / 2 + 12, y: 8, width: w, height: h)
            let ink = p.ink

            // Sketched fill: a wash, not a solid.
            ctx.fill(Path(roundedRect: r, cornerRadius: 3),
                     with: .color(p.leaf.opacity(0.13)))
            // Double-drawn edges, the way a pencil doubles back.
            for o in [CGFloat(0), 1.6] {
                ctx.stroke(Path(roundedRect: r.insetBy(dx: -o, dy: -o), cornerRadius: 3),
                           with: .color(ink.opacity(o == 0 ? 0.92 : 0.28)),
                           style: StrokeStyle(lineWidth: 2.6, lineJoin: .round))
            }
            // Corner ticks: the right-angle marks a P4 worksheet actually uses.
            for (cx, cy, sx, sy) in [(r.minX, r.minY, 1.0, 1.0), (r.maxX, r.minY, -1.0, 1.0),
                                     (r.minX, r.maxY, 1.0, -1.0), (r.maxX, r.maxY, -1.0, -1.0)] {
                let s: CGFloat = 11
                var pth = Path()
                pth.move(to: CGPoint(x: cx + s * sx, y: cy))
                pth.addLine(to: CGPoint(x: cx + s * sx, y: cy + s * sy))
                pth.addLine(to: CGPoint(x: cx, y: cy + s * sy))
                ctx.stroke(pth, with: .color(ink.opacity(0.4)), lineWidth: 1.8)
            }
            // Dimension arrows, then the labels sitting on them -- drawn in the
            // canvas so they follow the rectangle wherever it lands.
            // Labels scale with the figure, so a 90pt phone figure is not
            // measured by a label bigger than the shape.
            let k = min(1, max(0.68, h / 140))
            let below = r.maxY + 15 * k, left = r.minX - 16 * k
            arrow(&ctx, from: CGPoint(x: r.minX, y: below),
                  to: CGPoint(x: r.maxX, y: below), color: ink.opacity(0.65))
            arrow(&ctx, from: CGPoint(x: left, y: r.minY),
                  to: CGPoint(x: left, y: r.maxY), color: ink.opacity(0.65))

            let label = Text(long)
                .font(.custom(MQFonts.Baloo.semibold, size: 19 * k))
                .foregroundColor(p.ink)
            ctx.fill(Path(CGRect(x: r.midX - 38 * k, y: below - 12 * k,
                                 width: 76 * k, height: 24 * k)),
                     with: .color(p.parchment))
            ctx.draw(label, at: CGPoint(x: r.midX, y: below), anchor: .center)

            var side = ctx
            side.translateBy(x: left, y: r.midY)
            side.rotate(by: .degrees(-90))
            side.fill(Path(CGRect(x: -32 * k, y: -12 * k, width: 64 * k, height: 24 * k)),
                      with: .color(p.parchment))
            side.draw(Text(wide)
                        .font(.custom(MQFonts.Baloo.semibold, size: 19 * k))
                        .foregroundColor(p.ink),
                      at: .zero, anchor: .center)
        }
    }

    private func arrow(_ ctx: inout GraphicsContext, from a: CGPoint, to b: CGPoint, color: Color) {
        ctx.stroke(Path { $0.move(to: a); $0.addLine(to: b) }, with: .color(color), lineWidth: 1.8)
        let dx = b.x - a.x, dy = b.y - a.y
        let len = max(sqrt(dx * dx + dy * dy), 0.001)
        let ux = dx / len, uy = dy / len
        for (pt, s) in [(a, CGFloat(1)), (b, CGFloat(-1))] {
            var h = Path()
            h.move(to: CGPoint(x: pt.x + ux * s * 9 + uy * 5, y: pt.y + uy * s * 9 - ux * 5))
            h.addLine(to: pt)
            h.addLine(to: CGPoint(x: pt.x + ux * s * 9 - uy * 5, y: pt.y + uy * s * 9 + ux * 5))
            ctx.stroke(h, with: .color(color), style: StrokeStyle(lineWidth: 1.8, lineJoin: .round))
        }
    }
}

// MARK: - Answers: driftwood tiles resting on the sand

public struct StorybookAnswerTile: View {
    let p: StorybookPalette
    let text: String
    let tilt: Double
    let fontSize: CGFloat

    public init(_ p: StorybookPalette = .noon, _ text: String,
                tilt: Double = 0, fontSize: CGFloat = 34) {
        self.p = p; self.text = text; self.tilt = tilt; self.fontSize = fontSize
    }

    public var body: some View {
        Text(text)
            .font(.custom(MQFonts.Baloo.extrabold, size: fontSize))
            .monospacedDigit()
            .foregroundStyle(Color(hex: 0xFFF4DF))
            .shadow(color: p.woodDeep.opacity(0.75), radius: 0, x: 0, y: 2)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { Canvas { ctx, size in draw(&ctx, size) } }
            .rotationEffect(.degrees(tilt))
    }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let W = size.width, H = size.height
        let lift: CGFloat = 9
        let face = CGRect(x: 0, y: 0, width: W, height: H - lift)
        let r: CGFloat = 16

        // Shadow pooled on the sand under the tile.
        ctx.fill(Path(ellipseIn: CGRect(x: 8, y: H - 12, width: W - 16, height: 16)),
                 with: .color(p.sandShade.opacity(0.42)))
        // The tile's own thickness.
        ctx.fill(Path(roundedRect: CGRect(x: 0, y: lift * 0.4, width: W, height: H - lift * 0.4),
                      cornerRadius: r), with: .color(p.woodDeep))
        // Top face. Lighter than the frame, so a key reads as the thing you
        // touch rather than as more furniture.
        ctx.fill(Path(roundedRect: face, cornerRadius: r),
                 with: .linearGradient(
                    Gradient(colors: [Color(hex: 0xD9A165), Color(hex: 0xC08247),
                                      Color(hex: 0xA16833)]),
                    startPoint: CGPoint(x: 0, y: 0),
                    endPoint: CGPoint(x: W * 0.25, y: H)))
        // Carved bevel: light where the sun hits, dark opposite.
        ctx.stroke(Path(roundedRect: face.insetBy(dx: 5, dy: 5), cornerRadius: r - 5),
                   with: .color(p.woodDeep.opacity(0.28)), lineWidth: 2.6)
        ctx.stroke(Path(roundedRect: face.insetBy(dx: 2, dy: 2), cornerRadius: r - 2),
                   with: .color(.white.opacity(0.34)), lineWidth: 2.2)
        ctx.stroke(Path(roundedRect: face, cornerRadius: r),
                   with: .color(p.woodDeep.opacity(0.85)), lineWidth: 2)
        // Grain, following the long axis.
        for i in 0..<4 {
            let y = face.height * (0.20 + CGFloat(i) * 0.20)
            let bow = CGFloat((i % 2) * 2 - 1) * 3
            ctx.stroke(Path.smoothOpen([CGPoint(x: 14, y: y),
                                        CGPoint(x: W * 0.45, y: y + bow),
                                        CGPoint(x: W - 14, y: y - bow * 0.5)]),
                       with: .color(p.woodDeep.opacity(0.11)),
                       style: StrokeStyle(lineWidth: 1.6, lineCap: .round))
        }
        // One iron pin at each end: the tile is fixed, not floating.
        for x in [CGFloat(16), W - 22] {
            ctx.fill(Path(ellipseIn: CGRect(x: x, y: face.midY - 4, width: 9, height: 8)),
                     with: .color(p.iron))
            ctx.fill(Path(ellipseIn: CGRect(x: x + 1.5, y: face.midY - 3, width: 4, height: 3.5)),
                     with: .color(.white.opacity(0.45)))
        }
    }
}

// MARK: - Vitals: a rope-bound gauge on a plank

public struct StorybookGauge: View {
    public enum Side { case hero, monster }

    let p: StorybookPalette
    let value: Double
    let readout: String
    let side: Side
    let height: CGFloat

    public init(_ p: StorybookPalette = .noon, value: Double, readout: String,
                side: Side, height: CGFloat = 26) {
        self.p = p; self.value = value; self.readout = readout
        self.side = side; self.height = height
    }

    private var fill: Color { side == .hero ? p.leaf : p.coral }
    private var fillDeep: Color { side == .hero ? p.leafDeep : p.coralDeep }

    public var body: some View {
        HStack(spacing: 8) {
            Canvas { ctx, size in draw(&ctx, size) }
                .frame(height: height)
            // The readout gets its own carved plate. Cream numerals floating on
            // a bright sky were unreadable in the first pass -- a number a
            // parent has to squint at is a number that is not in the design.
            Text(readout)
                .font(.custom(MQFonts.Baloo.extrabold, size: height * 0.76))
                .monospacedDigit()
                .foregroundStyle(Color(hex: 0xFFF4DF))
                .frame(minWidth: height * 1.55)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background {
                    ZStack {
                        RoundedRectangle(cornerRadius: 8).fill(p.woodDeep)
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(p.woodLight.opacity(0.45), lineWidth: 1.5)
                    }
                }
        }
    }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let W = size.width, H = size.height
        let r = H / 2
        let trough = CGRect(x: 0, y: 0, width: W, height: H)
        ctx.fill(Path(roundedRect: trough, cornerRadius: r), with: .color(p.woodDeep))
        ctx.fill(Path(roundedRect: trough.insetBy(dx: 3, dy: 3), cornerRadius: r - 3),
                 with: .color(p.woodDark.shaded(0.35)))

        let w = max(0, min(1, value)) * (W - 6)
        if w > 4 {
            let bar = CGRect(x: 3, y: 3, width: w, height: H - 6)
            ctx.fill(Path(roundedRect: bar, cornerRadius: r - 3),
                     with: .linearGradient(Gradient(colors: [fill.lit(0.28), fill, fillDeep]),
                                           startPoint: CGPoint(x: 0, y: 3),
                                           endPoint: CGPoint(x: 0, y: H - 3)))
            // A wet highlight along the top of the fill.
            ctx.fill(Path(roundedRect: CGRect(x: 6, y: 5.5, width: max(0, w - 6),
                                              height: (H - 6) * 0.30),
                          cornerRadius: (H - 6) * 0.15),
                     with: .color(.white.opacity(0.42)))
        }
        // Rope wrap every fifth of the length: it reads as a scale without
        // pretending to be a precise one.
        for i in 1..<5 {
            let x = W * CGFloat(i) / 5
            ctx.stroke(Path { $0.move(to: CGPoint(x: x, y: 3)); $0.addLine(to: CGPoint(x: x, y: H - 3)) },
                       with: .color(p.woodDeep.opacity(0.30)), lineWidth: 2)
        }
        ctx.stroke(Path(roundedRect: trough.insetBy(dx: 1, dy: 1), cornerRadius: r - 1),
                   with: .color(p.woodDeep.opacity(0.9)), lineWidth: 2)
    }
}

// MARK: - Progress: shells on a rope

public struct StorybookShellRope: View {
    let p: StorybookPalette
    let filled: Int
    let total: Int
    let shell: CGFloat

    public init(_ p: StorybookPalette = .noon, filled: Int, total: Int, shell: CGFloat = 26) {
        self.p = p; self.filled = filled; self.total = total; self.shell = shell
    }

    public var body: some View {
        Canvas { ctx, size in
            let W = size.width, H = size.height
            let step = W / CGFloat(total)
            let spar = CGRect(x: 0, y: H * 0.14, width: W, height: max(9, H * 0.17))

            // A driftwood spar the rope is strung from. Crystals hung off a
            // bare line looked like they were floating in the sky.
            ctx.fill(Path(roundedRect: spar.offsetBy(dx: 2, dy: 3),
                          cornerRadius: spar.height / 2),
                     with: .color(p.woodDeep.opacity(0.28)))
            ctx.fill(Path(roundedRect: spar, cornerRadius: spar.height / 2),
                     with: .linearGradient(Gradient(colors: [p.woodLight, p.woodDark]),
                                           startPoint: CGPoint(x: 0, y: spar.minY),
                                           endPoint: CGPoint(x: 0, y: spar.maxY)))
            ctx.stroke(Path(roundedRect: spar.insetBy(dx: 0.8, dy: 0.8),
                            cornerRadius: spar.height / 2),
                       with: .color(p.woodDeep.opacity(0.6)), lineWidth: 1.6)
            // Rope whipping at both ends.
            for x in [spar.minX + spar.height * 0.9, spar.maxX - spar.height * 0.9] {
                ctx.fill(Path(roundedRect: CGRect(x: x - 3, y: spar.minY - 2,
                                                  width: 6, height: spar.height + 4),
                              cornerRadius: 3), with: .color(p.rope))
            }

            for i in 0..<total {
                let x = step * (CGFloat(i) + 0.5)
                let on = i < filled
                // Each crystal hangs on its own short cord.
                ctx.stroke(Path { $0.move(to: CGPoint(x: x, y: spar.maxY - 2))
                                  $0.addLine(to: CGPoint(x: x, y: spar.maxY + H * 0.13)) },
                           with: .color(p.rope), lineWidth: 2.4)
                drawShell(&ctx, center: CGPoint(x: x, y: spar.maxY + H * 0.13 + shell * 0.56),
                          r: shell / 2, on: on)
            }
        }
    }

    /// A cut crystal, not a shell. A scallop is a lovely shape and completely
    /// illegible at 26pt; a faceted gem has a silhouette a child can count
    /// across a room, which is the entire job of a progress row.
    private func drawShell(_ ctx: inout GraphicsContext, center c: CGPoint, r: CGFloat, on: Bool) {
        // An uncollected crystal still has to be countable against a cloud, so
        // it keeps a full-strength outline and only loses its fill.
        let body = on ? p.gold : p.parchment.opacity(0.42)
        let edge = on ? p.goldDeep : p.woodDark.opacity(0.85)
        let gem = Path { g in
            g.move(to: CGPoint(x: c.x, y: c.y - r * 1.15))
            g.addLine(to: CGPoint(x: c.x + r * 0.86, y: c.y - r * 0.22))
            g.addLine(to: CGPoint(x: c.x, y: c.y + r * 1.15))
            g.addLine(to: CGPoint(x: c.x - r * 0.86, y: c.y - r * 0.22))
            g.closeSubpath()
        }
        if on {
            for i in stride(from: 3, through: 1, by: -1) {
                let rr = r * (1.2 + CGFloat(i) * 0.30)
                ctx.fill(Path(ellipseIn: CGRect(x: c.x - rr, y: c.y - rr,
                                                width: rr * 2, height: rr * 2)),
                         with: .color(p.gold.opacity(0.08)))
            }
        }
        ctx.fill(gem, with: .linearGradient(
            Gradient(colors: [body.lit(0.45), body, on ? p.goldDeep : p.parchmentEdge.opacity(0.5)]),
            startPoint: CGPoint(x: c.x - r, y: c.y - r), endPoint: CGPoint(x: c.x + r, y: c.y + r)))
        ctx.stroke(gem, with: .color(edge), style: StrokeStyle(lineWidth: 2, lineJoin: .round))
        // Two facets: the crown and one flank.
        ctx.fill(Path { f in
            f.move(to: CGPoint(x: c.x, y: c.y - r * 1.15))
            f.addLine(to: CGPoint(x: c.x + r * 0.86, y: c.y - r * 0.22))
            f.addLine(to: CGPoint(x: c.x, y: c.y - r * 0.10))
            f.addLine(to: CGPoint(x: c.x - r * 0.86, y: c.y - r * 0.22))
            f.closeSubpath()
        }, with: .color(.white.opacity(on ? 0.32 : 0.14)))
        ctx.stroke(Path { f in
            f.move(to: CGPoint(x: c.x, y: c.y - r * 0.10))
            f.addLine(to: CGPoint(x: c.x, y: c.y + r * 1.15))
        }, with: .color(edge.opacity(0.5)), lineWidth: 1.4)
    }
}

// MARK: - Streak: a storm lantern

public struct StorybookLantern: View {
    let p: StorybookPalette
    let streak: Int
    let size: CGFloat

    public init(_ p: StorybookPalette = .noon, streak: Int, size: CGFloat = 46) {
        self.p = p; self.streak = streak; self.size = size
    }

    public var body: some View {
        HStack(spacing: 6) {
            Canvas { ctx, s in draw(&ctx, s) }
                .frame(width: size * 0.78, height: size)
            Text("\(streak)")
                .font(.custom(MQFonts.Baloo.extrabold, size: size * 0.62))
                .monospacedDigit()
                .foregroundStyle(Color(hex: 0xFFF4DF))
                .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 2)
        }
    }

    private func draw(_ ctx: inout GraphicsContext, _ s: CGSize) {
        let W = s.width, H = s.height
        // Handle.
        ctx.stroke(Path { $0.move(to: CGPoint(x: W * 0.28, y: H * 0.16))
                          $0.addQuadCurve(to: CGPoint(x: W * 0.72, y: H * 0.16),
                                          control: CGPoint(x: W * 0.5, y: -H * 0.06)) },
                   with: .color(p.iron), style: StrokeStyle(lineWidth: W * 0.07, lineCap: .round))
        // Glow spilling out of the glass.
        for i in stride(from: 5, through: 1, by: -1) {
            let r = W * 0.17 * CGFloat(i)
            ctx.fill(Path(ellipseIn: CGRect(x: W * 0.5 - r, y: H * 0.56 - r,
                                            width: r * 2, height: r * 2)),
                     with: .color(p.gold.opacity(0.10)))
        }
        // Glass: a tapered barrel.
        let glass = Path.smoothClosed([
            CGPoint(x: W * 0.20, y: H * 0.32), CGPoint(x: W * 0.80, y: H * 0.32),
            CGPoint(x: W * 0.86, y: H * 0.62), CGPoint(x: W * 0.78, y: H * 0.82),
            CGPoint(x: W * 0.22, y: H * 0.82), CGPoint(x: W * 0.14, y: H * 0.62)
        ], tension: 0.35)
        ctx.fill(glass, with: .radialGradient(
            Gradient(colors: [Color(hex: 0xFFF3C4), p.gold, p.goldDeep]),
            center: CGPoint(x: W * 0.5, y: H * 0.60),
            startRadius: 0, endRadius: W * 0.55))
        ctx.stroke(glass, with: .color(p.iron), lineWidth: W * 0.055)
        // Flame.
        ctx.fill(Path.smoothClosed([
            CGPoint(x: W * 0.5, y: H * 0.42), CGPoint(x: W * 0.62, y: H * 0.58),
            CGPoint(x: W * 0.5, y: H * 0.72), CGPoint(x: W * 0.38, y: H * 0.58)
        ], tension: 0.5), with: .color(Color(hex: 0xFF7A2E)))
        ctx.fill(Path.smoothClosed([
            CGPoint(x: W * 0.5, y: H * 0.50), CGPoint(x: W * 0.57, y: H * 0.60),
            CGPoint(x: W * 0.5, y: H * 0.68), CGPoint(x: W * 0.43, y: H * 0.60)
        ], tension: 0.5), with: .color(Color(hex: 0xFFF0B8)))
        // Cap and base.
        for r in [CGRect(x: W * 0.14, y: H * 0.20, width: W * 0.72, height: H * 0.13),
                  CGRect(x: W * 0.12, y: H * 0.79, width: W * 0.76, height: H * 0.13)] {
            ctx.fill(Path(roundedRect: r, cornerRadius: W * 0.06),
                     with: .linearGradient(Gradient(colors: [p.iron.lit(0.28), p.iron]),
                                           startPoint: CGPoint(x: r.minX, y: r.minY),
                                           endPoint: CGPoint(x: r.minX, y: r.maxY)))
        }
    }
}

// MARK: - Small carved parts

/// The hero's name, burnt into a tag hanging off a nail.
public struct StorybookNameTag: View {
    let p: StorybookPalette
    let name: String
    let level: String
    let quest: String
    let compact: Bool

    public init(_ p: StorybookPalette = .noon, name: String, level: String,
                quest: String, compact: Bool = false) {
        self.p = p; self.name = name; self.level = level
        self.quest = quest; self.compact = compact
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 8) {
                Text(name)
                    .font(.custom(MQFonts.Baloo.extrabold, size: compact ? 21 : 26))
                    .foregroundStyle(Color(hex: 0x4A2C12))
                Text(level)
                    .font(.custom(MQFonts.Baloo.bold, size: compact ? 13 : 15))
                    .foregroundStyle(Color(hex: 0xFFF4DF))
                    .padding(.horizontal, 7).padding(.vertical, 1)
                    .background(Capsule().fill(p.leafDeep))
            }
            Text(quest)
                .font(.custom(MQFonts.Baloo.medium, size: compact ? 13 : 16))
                .foregroundStyle(Color(hex: 0x6E4B26))
        }
        .padding(.horizontal, compact ? 14 : 18)
        .padding(.vertical, compact ? 7 : 10)
        .background {
            Canvas { ctx, size in
                let r = CGRect(origin: .zero, size: size)
                ctx.fill(Path(roundedRect: r.offsetBy(dx: 3, dy: 4), cornerRadius: 13),
                         with: .color(p.woodDeep.opacity(0.30)))
                ctx.fill(Path(roundedRect: r, cornerRadius: 13),
                         with: .linearGradient(
                            Gradient(colors: [Color(hex: 0xF6DCA9), Color(hex: 0xE0BE86)]),
                            startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
                ctx.stroke(Path(roundedRect: r.insetBy(dx: 1, dy: 1), cornerRadius: 13),
                           with: .color(p.woodDark.opacity(0.55)), lineWidth: 2)
                // Grain.
                for i in 0..<3 {
                    let y = size.height * (0.26 + CGFloat(i) * 0.24)
                    ctx.stroke(Path.smoothOpen([CGPoint(x: 8, y: y),
                                                CGPoint(x: size.width * 0.5, y: y + 2),
                                                CGPoint(x: size.width - 8, y: y - 1)]),
                               with: .color(p.woodDark.opacity(0.12)), lineWidth: 1.4)
                }
            }
        }
    }
}

/// The monster's name, on a little hand-lettered marker stuck in the sand.
public struct StorybookMonsterName: View {
    let p: StorybookPalette
    let name: String
    let size: CGFloat

    public init(_ p: StorybookPalette = .noon, name: String, size: CGFloat = 20) {
        self.p = p; self.name = name; self.size = size
    }

    public var body: some View {
        Text(name)
            .font(.custom(MQFonts.Baloo.bold, size: size))
            .foregroundStyle(Color(hex: 0xFFF4DF))
            .padding(.horizontal, 14)
            .padding(.vertical, 4)
            .background {
                Canvas { ctx, s in
                    let r = CGRect(origin: .zero, size: s)
                    let banner = Path.smoothClosed([
                        CGPoint(x: 2, y: 2), CGPoint(x: r.maxX - 2, y: 0),
                        CGPoint(x: r.maxX, y: r.maxY - 2), CGPoint(x: 4, y: r.maxY)
                    ], tension: 0.12)
                    ctx.fill(banner, with: .color(p.coralDeep))
                    ctx.stroke(banner, with: .color(Color(hex: 0x7A2716).opacity(0.7)), lineWidth: 1.6)
                }
            }
    }
}

public struct StorybookPauseKnob: View {
    let p: StorybookPalette
    let size: CGFloat
    public init(_ p: StorybookPalette = .noon, size: CGFloat = 48) {
        self.p = p; self.size = size
    }
    public var body: some View {
        Canvas { ctx, s in
            let c = CGPoint(x: s.width / 2, y: s.height / 2)
            let r = min(s.width, s.height) / 2 - 2
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r + 4,
                                            width: r * 2, height: r * 2)),
                     with: .color(p.woodDeep.opacity(0.45)))
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)),
                     with: .linearGradient(Gradient(colors: [p.woodLight, p.woodDark]),
                                           startPoint: CGPoint(x: c.x - r, y: c.y - r),
                                           endPoint: CGPoint(x: c.x + r, y: c.y + r)))
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r + 1, y: c.y - r + 1,
                                              width: r * 2 - 2, height: r * 2 - 2)),
                       with: .color(p.woodDeep.opacity(0.75)), lineWidth: 2)
            // Tree ring.
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r * 0.62, y: c.y - r * 0.62,
                                              width: r * 1.24, height: r * 1.24)),
                       with: .color(p.woodDeep.opacity(0.18)), lineWidth: 1.4)
            for dx in [-r * 0.24, r * 0.06] {
                ctx.fill(Path(roundedRect: CGRect(x: c.x + dx, y: c.y - r * 0.36,
                                                  width: r * 0.18, height: r * 0.72),
                              cornerRadius: r * 0.07),
                         with: .color(Color(hex: 0x4A2C12)))
            }
        }
        .frame(width: size, height: size)
    }
}
