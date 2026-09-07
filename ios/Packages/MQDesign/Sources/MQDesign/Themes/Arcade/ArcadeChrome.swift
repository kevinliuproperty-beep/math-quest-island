import SwiftUI

// Chrome for Direction B.
//
// Every surface is a CHAMFERED SLAB, never a rounded rect. That one decision
// does most of the work of getting off the app-template: iOS chrome is defined
// by the continuous corner radius, so a cut corner reads as "not iOS" before a
// child has processed anything else on the screen.

/// A slab with cut corners. `cut` is the chamfer in points.
public struct ArcadeSlab: InsettableShape {
    public var cut: CGFloat
    public var cutCorners: [Bool]   // TL, TR, BR, BL
    public var inset: CGFloat = 0

    public init(cut: CGFloat = 14, corners: [Bool] = [true, true, true, true]) {
        self.cut = cut; self.cutCorners = corners
    }

    public func inset(by amount: CGFloat) -> ArcadeSlab {
        var copy = self
        copy.inset += amount
        return copy
    }

    public func path(in rect: CGRect) -> Path {
        let r = rect.insetBy(dx: inset, dy: inset)
        let c = min(max(cut - inset, 0), min(r.width, r.height) / 2)
        var p = Path()
        let tl = cutCorners[0] ? c : 0, tr = cutCorners[1] ? c : 0
        let br = cutCorners[2] ? c : 0, bl = cutCorners[3] ? c : 0
        p.move(to: CGPoint(x: r.minX + tl, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX - tr, y: r.minY))
        if tr > 0 { p.addLine(to: CGPoint(x: r.maxX, y: r.minY + tr)) }
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - br))
        if br > 0 { p.addLine(to: CGPoint(x: r.maxX - br, y: r.maxY)) }
        p.addLine(to: CGPoint(x: r.minX + bl, y: r.maxY))
        if bl > 0 { p.addLine(to: CGPoint(x: r.minX, y: r.maxY - bl)) }
        p.addLine(to: CGPoint(x: r.minX, y: r.minY + tl))
        p.closeSubpath()
        return p
    }
}

// MARK: - The question banner

public struct ArcadeBanner<Content: View>: View {
    let p: ArcadePalette
    let content: Content

    public init(_ p: ArcadePalette = .standard, @ViewBuilder content: () -> Content) {
        self.p = p; self.content = content()
    }

    public var body: some View {
        content
            .padding(.horizontal, 30)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity)
            .background {
                ZStack {
                    ArcadeSlab(cut: 22).fill(p.panel.opacity(0.94))
                    ArcadeSlab(cut: 22).fill(
                        LinearGradient(colors: [p.slabFace.opacity(0.85), p.panel.opacity(0.2)],
                                       startPoint: .top, endPoint: .bottom))
                    ArcadeSlab(cut: 22).strokeBorder(p.slabEdge, lineWidth: 2.5)
                    ArcadeSlab(cut: 22).strokeBorder(p.hairline.opacity(0.8), lineWidth: 6)
                        .padding(4)
                }
            }
            // A bar of light across the top edge: the panel is powered.
            .overlay(alignment: .top) {
                LinearGradient(colors: [.clear, p.mint, p.horizon, p.rose, .clear],
                               startPoint: .leading, endPoint: .trailing)
                    .frame(height: 3)
                    .padding(.horizontal, 26)
                    .shadow(color: p.horizon.opacity(0.9), radius: 8)
            }
            .shadow(color: p.arenaGlow.opacity(0.75), radius: 26, y: 6)
    }
}

/// The figure as a wireframe: the rectangle is a hologram on the panel, with
/// the two known sides tagged and the unknown one implied. Same data contract
/// as the storybook version, drawn in the other voice.
public struct ArcadeRectFigure: View {
    let p: ArcadePalette
    let long: String
    let wide: String

    public init(_ p: ArcadePalette = .standard, long: String, wide: String) {
        self.p = p; self.long = long; self.wide = wide
    }

    public var body: some View {
        Canvas { ctx, size in
            // Drawn to scale, same as the storybook figure: 14 by 9 is 14 by 9.
            let ratio: CGFloat = 14.0 / 9.0
            let avail = CGSize(width: size.width - 84, height: size.height - 40)
            var w = avail.width, h = w / ratio
            if h > avail.height { h = avail.height; w = h * ratio }
            let r = CGRect(x: (size.width - w) / 2, y: 10, width: w, height: h)
            // Scanline fill.
            ctx.fill(Path(r), with: .color(p.mint.opacity(0.07)))
            var y = r.minY + 5
            while y < r.maxY {
                ctx.fill(Path(CGRect(x: r.minX, y: y, width: r.width, height: 1)),
                         with: .color(p.mint.opacity(0.13)))
                y += 7
            }
            // Glowing edge, drawn three times at falling opacity instead of a blur.
            for (w, o) in [(CGFloat(9), 0.14), (CGFloat(5), 0.30), (CGFloat(2.4), 1.0)] {
                ctx.stroke(Path(r), with: .color(p.mint.opacity(o)),
                           style: StrokeStyle(lineWidth: w, lineJoin: .miter))
            }
            // Corner brackets.
            for (cx, cy, sx, sy) in [(r.minX, r.minY, 1.0, 1.0), (r.maxX, r.minY, -1.0, 1.0),
                                     (r.minX, r.maxY, 1.0, -1.0), (r.maxX, r.maxY, -1.0, -1.0)] {
                let s: CGFloat = 15
                var b = Path()
                b.move(to: CGPoint(x: cx + s * sx, y: cy))
                b.addLine(to: CGPoint(x: cx, y: cy))
                b.addLine(to: CGPoint(x: cx, y: cy + s * sy))
                ctx.stroke(b, with: .color(.white.opacity(0.9)),
                           style: StrokeStyle(lineWidth: 4, lineCap: .square))
            }

            // Dimension tags, drawn in the canvas so they track the rectangle,
            // and scaled with it so they never dwarf the shape they measure.
            let k = min(1, max(0.72, h / 110))
            let tagFont = 18 * k
            let tag = CGSize(width: 76 * k, height: 26 * k)
            let below = CGPoint(x: r.midX, y: r.maxY + 15 * k)
            ctx.fill(ArcadeSlab(cut: 7).path(in: CGRect(x: below.x - tag.width / 2,
                                                        y: below.y - tag.height / 2,
                                                        width: tag.width, height: tag.height)),
                     with: .color(p.mint))
            ctx.draw(Text(long).font(.custom(MQFonts.Fredoka.semibold, size: tagFont))
                        .foregroundColor(p.voidTop), at: below, anchor: .center)

            var side = ctx
            side.translateBy(x: r.minX - 15 * k - 6, y: r.midY)
            side.rotate(by: .degrees(-90))
            side.fill(ArcadeSlab(cut: 7).path(in: CGRect(x: -tag.width / 2, y: -tag.height / 2,
                                                          width: tag.width, height: tag.height)),
                      with: .color(p.mint))
            side.draw(Text(wide).font(.custom(MQFonts.Fredoka.semibold, size: tagFont))
                        .foregroundColor(p.voidTop), at: .zero, anchor: .center)
        }
    }
}

// MARK: - Answers

public struct ArcadeAnswerSlab: View {
    let p: ArcadePalette
    let text: String
    let fontSize: CGFloat

    public init(_ p: ArcadePalette = .standard, _ text: String, fontSize: CGFloat = 38) {
        self.p = p; self.text = text; self.fontSize = fontSize
    }

    public var body: some View {
        Text(text)
            .font(.custom(MQFonts.Fredoka.bold, size: fontSize))
            .monospacedDigit()
            .foregroundStyle(.white)
            .shadow(color: p.slabEdge.opacity(0.95), radius: 10)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.bottom, 8)   // the key's face sits above its own bevel
            .background {
                ZStack {
                    // Bevel: the slab has thickness, and pressing it would take
                    // that thickness away. The whole press animation is free.
                    ArcadeSlab(cut: 16).fill(p.slabEdge)
                    ArcadeSlab(cut: 16)
                        .fill(LinearGradient(colors: [Color(hex: 0x5B45C4), Color(hex: 0x3B2A93),
                                                      Color(hex: 0x281B6E)],
                                             startPoint: .top, endPoint: .bottom))
                        .padding(.bottom, 9)
                    ArcadeSlab(cut: 16)
                        .strokeBorder(p.slabHi.opacity(0.85), lineWidth: 2.4)
                        .padding(.bottom, 9)
                    // Inner top highlight.
                    ArcadeSlab(cut: 10)
                        .fill(LinearGradient(colors: [.white.opacity(0.16), .clear],
                                             startPoint: .top, endPoint: .bottom))
                        .padding(.horizontal, 7)
                        .padding(.top, 6)
                        .padding(.bottom, 26)
                }
            }
            .shadow(color: p.slabEdge.opacity(0.45), radius: 16, y: 8)
    }
}

// MARK: - Vitals

public struct ArcadeHealthBar: View {
    public enum Side { case hero, monster }

    let p: ArcadePalette
    let name: String
    let value: Double
    /// Where the bar was before the last hit. The pale chunk between the two is
    /// the damage, still draining -- the single clearest way to show a child
    /// that their answer did something.
    let ghost: Double
    let readout: String
    let side: Side
    let flashing: Bool
    let compact: Bool

    public init(_ p: ArcadePalette = .standard, name: String, value: Double,
                ghost: Double = 0, readout: String, side: Side,
                flashing: Bool = false, compact: Bool = false) {
        self.p = p; self.name = name; self.value = value; self.ghost = ghost
        self.readout = readout; self.side = side
        self.flashing = flashing; self.compact = compact
    }

    private var tint: Color { side == .hero ? p.mint : p.rose }
    private var tintDeep: Color { side == .hero ? p.mintDeep : p.roseDeep }
    private var trailing: Bool { side == .monster }

    public var body: some View {
        VStack(alignment: trailing ? .trailing : .leading, spacing: compact ? 3 : 5) {
            HStack(spacing: 8) {
                if trailing { Spacer(minLength: 0) }
                Text(name.uppercased())
                    .font(.custom(MQFonts.Fredoka.semibold, size: compact ? 12 : 15))
                    .tracking(compact ? 0.8 : 1.4)
                    .foregroundStyle(p.textSoft)
                Text(readout)
                    .font(.custom(MQFonts.Fredoka.bold, size: compact ? 15 : 19))
                    .monospacedDigit()
                    .foregroundStyle(tint)
                if !trailing { Spacer(minLength: 0) }
            }
            Canvas { ctx, size in draw(&ctx, size) }
                .frame(height: compact ? 16 : 22)
                .shadow(color: flashing ? .white.opacity(0.55) : tint.opacity(0.45),
                        radius: flashing ? 9 : 8)
        }
    }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let W = size.width, H = size.height
        let cut = H * 0.42
        let frame = ArcadeSlab(cut: cut, corners: trailing ? [true, false, false, true]
                                                           : [false, true, true, false])
        let outer = CGRect(origin: .zero, size: size)
        ctx.fill(frame.path(in: outer), with: .color(p.voidTop))
        ctx.fill(frame.path(in: outer.insetBy(dx: 3, dy: 3)), with: .color(p.slabDeep))

        // Fills grow from the character's own side of the screen.
        func bar(_ v: Double) -> CGRect {
            let w = max(0, min(1, v)) * (W - 6)
            return CGRect(x: trailing ? W - 3 - w : 3, y: 3, width: w, height: H - 6)
        }
        let inner = ArcadeSlab(cut: cut - 3, corners: trailing ? [true, false, false, true]
                                                               : [false, true, true, false])
        if ghost > value {
            // The lost chunk stays in the monster's own hue, lifted. White read
            // as part of the frame in the first pass.
            ctx.fill(inner.path(in: bar(ghost)), with: .color(tint.mixed(with: .white, by: 0.62)))
        }
        ctx.fill(inner.path(in: bar(value)),
                 with: .linearGradient(Gradient(colors: [tint.lit(0.35), tint, tintDeep]),
                                       startPoint: CGPoint(x: 0, y: 3),
                                       endPoint: CGPoint(x: 0, y: H - 3)))
        ctx.fill(Path(CGRect(x: bar(value).minX + 3, y: 5,
                             width: max(0, bar(value).width - 6), height: (H - 6) * 0.28)),
                 with: .color(.white.opacity(0.4)))

        // Segment ticks: 20 notches, so a bar is countable rather than merely
        // long. A child who can see "three notches left" plays differently.
        for i in 1..<20 {
            let x = (W / 20) * CGFloat(i)
            ctx.fill(Path(CGRect(x: x - 1, y: 3, width: 2, height: H - 6)),
                     with: .color(p.voidTop.opacity(i % 5 == 0 ? 0.85 : 0.45)))
        }
        ctx.stroke(frame.path(in: outer.insetBy(dx: 1, dy: 1)),
                   with: .color(flashing ? .white : p.slabEdge.opacity(0.9)),
                   lineWidth: flashing ? 2.6 : 1.8)
    }
}

// MARK: - Progress, streak, pause

public struct ArcadeProgressPips: View {
    let p: ArcadePalette
    let filled: Int
    let total: Int
    let size: CGFloat

    public init(_ p: ArcadePalette = .standard, filled: Int, total: Int, size: CGFloat = 22) {
        self.p = p; self.filled = filled; self.total = total; self.size = size
    }

    public var body: some View {
        HStack(spacing: size * 0.34) {
            ForEach(0..<total, id: \.self) { i in
                Canvas { ctx, s in
                    let on = i < filled
                    // A chevron pip, pointing the way the run is going.
                    let pip = Path.smoothClosed([
                        CGPoint(x: s.width * 0.10, y: 0),
                        CGPoint(x: s.width, y: 0),
                        CGPoint(x: s.width * 0.90, y: s.height),
                        CGPoint(x: 0, y: s.height)
                    ], tension: 0.02)
                    if on {
                        for i in stride(from: 3, through: 1, by: -1) {
                            ctx.stroke(pip, with: .color(p.gold.opacity(0.16)),
                                       lineWidth: CGFloat(i) * 4)
                        }
                        ctx.fill(pip, with: .linearGradient(
                            Gradient(colors: [Color(hex: 0xFFEE9E), p.gold, p.goldDeep]),
                            startPoint: .zero, endPoint: CGPoint(x: 0, y: s.height)))
                    } else {
                        ctx.fill(pip, with: .color(p.slabDeep))
                        ctx.stroke(pip, with: .color(p.hairline), lineWidth: 1.6)
                    }
                }
                .frame(width: size * 0.62, height: size)
            }
        }
    }
}

public struct ArcadeStreakChip: View {
    let p: ArcadePalette
    let streak: Int
    let size: CGFloat

    public init(_ p: ArcadePalette = .standard, streak: Int, size: CGFloat = 44) {
        self.p = p; self.streak = streak; self.size = size
    }

    public var body: some View {
        HStack(spacing: size * 0.10) {
            // A DRAWN flame. The first sample used SF Symbols' flame.fill in a
            // gold pill and it went to a smudge at chip size -- the one thing
            // that lane flagged as its own weakest element.
            Canvas { ctx, s in
                let W = s.width, H = s.height
                for (path, color) in [
                    (Path.smoothClosed([CGPoint(x: W * 0.50, y: 0),
                                        CGPoint(x: W * 0.92, y: H * 0.44),
                                        CGPoint(x: W * 0.78, y: H * 0.95),
                                        CGPoint(x: W * 0.22, y: H * 0.95),
                                        CGPoint(x: W * 0.08, y: H * 0.44),
                                        CGPoint(x: W * 0.36, y: H * 0.30)], tension: 0.5),
                     Color(hex: 0xFF7A22)),
                    (Path.smoothClosed([CGPoint(x: W * 0.52, y: H * 0.26),
                                        CGPoint(x: W * 0.78, y: H * 0.58),
                                        CGPoint(x: W * 0.66, y: H * 0.94),
                                        CGPoint(x: W * 0.32, y: H * 0.92),
                                        CGPoint(x: W * 0.26, y: H * 0.58)], tension: 0.5),
                     Color(hex: 0xFFC42E)),
                    (Path.smoothClosed([CGPoint(x: W * 0.52, y: H * 0.54),
                                        CGPoint(x: W * 0.68, y: H * 0.76),
                                        CGPoint(x: W * 0.50, y: H * 0.94),
                                        CGPoint(x: W * 0.36, y: H * 0.76)], tension: 0.5),
                     Color(hex: 0xFFF3B8))
                ] {
                    ctx.fill(path, with: .color(color))
                }
            }
            .frame(width: size * 0.62, height: size * 0.86)
            .shadow(color: Color(hex: 0xFF7A22).opacity(0.8), radius: size * 0.22)

            Text("\(streak)")
                .font(.custom(MQFonts.Fredoka.bold, size: size * 0.62))
                .monospacedDigit()
                .foregroundStyle(p.text)
        }
        .padding(.horizontal, size * 0.28)
        .padding(.vertical, size * 0.12)
        .background {
            ZStack {
                ArcadeSlab(cut: size * 0.26).fill(p.panel)
                ArcadeSlab(cut: size * 0.26).strokeBorder(Color(hex: 0xFF9A3C).opacity(0.75),
                                                          lineWidth: 2)
            }
        }
    }
}

public struct ArcadePauseKey: View {
    let p: ArcadePalette
    let size: CGFloat
    public init(_ p: ArcadePalette = .standard, size: CGFloat = 48) {
        self.p = p; self.size = size
    }
    public var body: some View {
        ZStack {
            ArcadeSlab(cut: size * 0.30).fill(p.slabDeep)
            ArcadeSlab(cut: size * 0.30).strokeBorder(p.slabEdge, lineWidth: 2)
            HStack(spacing: size * 0.13) {
                ForEach(0..<2, id: \.self) { _ in
                    Capsule().fill(p.textSoft)
                        .frame(width: size * 0.11, height: size * 0.38)
                }
            }
        }
        .frame(width: size, height: size)
    }
}

/// Name plate: a parallelogram, sheared toward the fighter it belongs to.
public struct ArcadeNamePlate: View {
    let p: ArcadePalette
    let name: String
    let sub: String
    let tint: Color
    let compact: Bool

    public init(_ p: ArcadePalette = .standard, name: String, sub: String,
                tint: Color, compact: Bool = false) {
        self.p = p; self.name = name; self.sub = sub
        self.tint = tint; self.compact = compact
    }

    public var body: some View {
        HStack(spacing: 8) {
            Text(name)
                .font(.custom(MQFonts.Fredoka.bold, size: compact ? 17 : 22))
                .foregroundStyle(p.text)
            Text(sub)
                .font(.custom(MQFonts.Fredoka.semibold, size: compact ? 11 : 13))
                .foregroundStyle(p.voidTop)
                .padding(.horizontal, 6).padding(.vertical, 1)
                .background(ArcadeSlab(cut: 4).fill(tint))
        }
        .padding(.horizontal, compact ? 10 : 14)
        .padding(.vertical, compact ? 3 : 5)
        .background {
            ZStack {
                ArcadeSlab(cut: 10, corners: [false, true, false, true]).fill(p.panel.opacity(0.9))
                ArcadeSlab(cut: 10, corners: [false, true, false, true])
                    .strokeBorder(tint.opacity(0.55), lineWidth: 1.6)
            }
        }
    }
}

/// The damage the last answer did, thrown above the monster.
public struct ArcadeDamagePop: View {
    let p: ArcadePalette
    let amount: Int
    let size: CGFloat

    public init(_ p: ArcadePalette = .standard, amount: Int, size: CGFloat = 42) {
        self.p = p; self.amount = amount; self.size = size
    }

    public var body: some View {
        Text("-\(amount)")
            .font(.custom(MQFonts.Fredoka.bold, size: size))
            .monospacedDigit()
            .foregroundStyle(Color(hex: 0xFFF3B8))
            .shadow(color: Color(hex: 0xFF3D71), radius: 0, x: 0, y: 3)
            .shadow(color: Color(hex: 0xFF3D71).opacity(0.9), radius: size * 0.4)
            .rotationEffect(.degrees(-6))
    }
}
