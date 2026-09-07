import SwiftUI

// Chrome.
//
// The rule that generated all of it: NOTHING in this system is a rounded
// rectangle with a soft shadow. That is settings-screen furniture, and it was
// the second-loudest generic tell in the rejected sample after the emoji. Every
// surface here is a thing that exists on a beach -- a nailed board, a driftwood
// tile, a rope of crystals, a storm lantern, a plank with a name burnt into it.

// MARK: - The signboard

/// A parchment sheet nailed to a board on posts driven into the sand.
///
/// **Sized to its content, always.** The mass problem the first storybook pass
/// had was not the board's style, it was its AREA: a full-width board with a
/// centred question stacked over a fixed-height figure slot took 418pt of an
/// 834pt frame, which made the parchment the largest, flattest and brightest
/// object on screen and pushed the cast into the margins. The board now takes
/// the width it is given and only the height its content needs.
/// The signboard's fixed geometry.
///
/// A separate namespace because `MQSign` is generic over its content, and a
/// generic type can hold neither a static stored property nor a static anybody
/// can name without spelling out the generic argument. These numbers are a
/// COMPOSITION CONTRACT rather than an implementation detail -- `MQBattleScreen`
/// divides the screen's width by `frameInset` -- so they need a name that can
/// be written down.
public enum MQBoard {
    /// How far the parchment sheet is inset from the board's outer edge, and
    /// therefore exactly how far a creature standing in front of the board may
    /// intrude before it is standing on the PAPER rather than on the wooden
    /// frame. The battle line's whole width solution hangs off this number.
    public static let frameInset: CGFloat = 15
}

public struct MQSign<Content: View>: View {
    let p: MQPalette
    let postHeight: CGFloat
    let padH: CGFloat
    let padV: CGFloat
    let content: Content

    public init(_ p: MQPalette = .noon, postHeight: CGFloat = 46,
                padH: CGFloat = 26, padV: CGFloat = 18,
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
        for t in [0.34, 0.66] as [CGFloat] {
            ctx.stroke(Path { $0.move(to: CGPoint(x: W * t, y: 0))
                              $0.addLine(to: CGPoint(x: W * t, y: boardH)) },
                       with: .color(p.woodDeep.opacity(0.16)), lineWidth: 1.6)
        }

        // Parchment: a rectangular SHEET with a torn edge, not a blob. The first
        // pass used a soft superellipse with a big wobble and it read as spilled
        // milk rather than as paper nailed to wood.
        let inset = MQBoard.frameInset
        let panel = board.insetBy(dx: inset, dy: inset)
        var deckle: [CGPoint] = []
        let steps = 40
        for i in 0..<steps {
            let a = CGFloat(i) / CGFloat(steps) * 2 * .pi
            let jitter = sin(CGFloat(i) * 2.31) * 1.6 + sin(CGFloat(i) * 0.91) * 1.1
            let rx = panel.width / 2, ry = panel.height / 2
            let k: CGFloat = 7.5   // squareness: high, so it stays a sheet
            let cs = cos(a), sn = sin(a)
            deckle.append(CGPoint(
                x: panel.midX + copysign(pow(abs(cs), 2 / k), cs) * (rx + jitter),
                y: panel.midY + copysign(pow(abs(sn), 2 / k), sn) * (ry + jitter)))
        }
        let paper = Path.smoothClosed(deckle, tension: 0.28)
        ctx.fill(paper, with: .color(p.woodDeep.opacity(0.30)))
        ctx.fill(paper.offsetBy(dx: -1.5, dy: -2),
                 with: .linearGradient(Gradient(colors: [Color.white.opacity(0.55), .clear]),
                                       startPoint: .zero, endPoint: CGPoint(x: 0, y: boardH)))
        ctx.fill(paper, with: .radialGradient(
            Gradient(colors: [p.parchment, p.parchment, p.parchmentEdge]),
            center: CGPoint(x: panel.midX - panel.width * 0.16,
                            y: panel.midY - panel.height * 0.2),
            startRadius: 0, endRadius: max(panel.width, panel.height) * 0.75))
        // Two faint tea stains, so the paper is not a flat fill.
        ctx.fill(Path(ellipseIn: CGRect(x: panel.maxX - 84, y: panel.minY + 9,
                                        width: 66, height: 34)),
                 with: .color(p.parchmentEdge.opacity(0.45)))
        ctx.fill(Path(ellipseIn: CGRect(x: panel.minX + 16, y: panel.maxY - 40,
                                        width: 56, height: 26)),
                 with: .color(p.parchmentEdge.opacity(0.35)))

        // Four iron nails, pushed right into the corners: a nail set further in
        // lands on the first line of the question at phone width.
        let nr = min(6, boardH * 0.030)
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

// MARK: - Figures, sketched on the parchment in ink

/// The figure contract, drawn. Six engine topics emit figures; the design has to
/// prove it can hold one at 150pt on an iPad and at 54pt in a review row, which
/// is why the labels scale with the shape rather than sitting at a fixed size.
public struct MQFigureView: View {
    let p: MQPalette
    let figure: MQFigure

    public init(_ p: MQPalette = .noon, _ figure: MQFigure) {
        self.p = p; self.figure = figure
    }

    public var body: some View {
        Canvas { ctx, size in
            switch figure {
            case .none:
                break
            case let .rect(long, wide, ratio):
                drawRect(&ctx, size, long: long, wide: wide, ratio: ratio)
            case let .fractionBar(parts, filled):
                drawBar(&ctx, size, parts: parts, filled: filled)
            }
        }
    }

    /// Drawn TO SCALE: 14 by 9 really is 14 by 9. A maths app whose figure is
    /// the wrong shape teaches the wrong thing, and a child measuring with their
    /// eye is not wrong.
    private func drawRect(_ ctx: inout GraphicsContext, _ size: CGSize,
                          long: String, wide: String, ratio: CGFloat) {
        let k = min(1, max(0.52, size.height / 150))
        let avail = CGSize(width: size.width - 52 * k, height: size.height - 26 * k)
        var w = avail.width, h = w / ratio
        if h > avail.height { h = avail.height; w = h * ratio }
        let r = CGRect(x: (size.width - w) / 2 + 10 * k, y: 6 * k, width: w, height: h)
        let ink = p.ink

        ctx.fill(Path(roundedRect: r, cornerRadius: 3), with: .color(p.leaf.opacity(0.13)))
        // Double-drawn edges, the way a pencil doubles back.
        for o in [CGFloat(0), 1.6] {
            ctx.stroke(Path(roundedRect: r.insetBy(dx: -o, dy: -o), cornerRadius: 3),
                       with: .color(ink.opacity(o == 0 ? 0.92 : 0.28)),
                       style: StrokeStyle(lineWidth: 2.6 * k, lineJoin: .round))
        }
        // Right-angle ticks: the marks a P4 worksheet actually uses.
        for (cx, cy, sx, sy) in [(r.minX, r.minY, 1.0, 1.0), (r.maxX, r.minY, -1.0, 1.0),
                                 (r.minX, r.maxY, 1.0, -1.0), (r.maxX, r.maxY, -1.0, -1.0)] {
            let s: CGFloat = 11 * k
            var pth = Path()
            pth.move(to: CGPoint(x: cx + s * sx, y: cy))
            pth.addLine(to: CGPoint(x: cx + s * sx, y: cy + s * sy))
            pth.addLine(to: CGPoint(x: cx, y: cy + s * sy))
            ctx.stroke(pth, with: .color(ink.opacity(0.4)), lineWidth: 1.8 * k)
        }

        let below = r.maxY + 14 * k, left = r.minX - 15 * k
        arrow(&ctx, from: CGPoint(x: r.minX, y: below), to: CGPoint(x: r.maxX, y: below),
              color: ink.opacity(0.65), k: k)
        arrow(&ctx, from: CGPoint(x: left, y: r.minY), to: CGPoint(x: left, y: r.maxY),
              color: ink.opacity(0.65), k: k)

        ctx.fill(Path(CGRect(x: r.midX - 36 * k, y: below - 11 * k,
                             width: 72 * k, height: 22 * k)), with: .color(p.parchment))
        ctx.draw(Text(long).font(.mq(18 * k, .semibold)).foregroundColor(p.ink),
                 at: CGPoint(x: r.midX, y: below), anchor: .center)

        var side = ctx
        side.translateBy(x: left, y: r.midY)
        side.rotate(by: .degrees(-90))
        side.fill(Path(CGRect(x: -30 * k, y: -11 * k, width: 60 * k, height: 22 * k)),
                  with: .color(p.parchment))
        side.draw(Text(wide).font(.mq(18 * k, .semibold)).foregroundColor(p.ink),
                  at: .zero, anchor: .center)
    }

    private func drawBar(_ ctx: inout GraphicsContext, _ size: CGSize,
                         parts: Int, filled: Int) {
        let k = min(1, max(0.52, size.height / 150))
        let h = min(size.height - 12 * k, 62 * k)
        let w = min(size.width - 16 * k, CGFloat(parts) * 54 * k)
        let r = CGRect(x: (size.width - w) / 2, y: (size.height - h) / 2, width: w, height: h)
        let step = w / CGFloat(parts)
        for i in 0..<parts {
            let cell = CGRect(x: r.minX + step * CGFloat(i), y: r.minY, width: step, height: h)
            ctx.fill(Path(cell), with: .color(i < filled ? p.leaf.opacity(0.55)
                                                         : p.leaf.opacity(0.10)))
            ctx.stroke(Path(cell), with: .color(p.ink.opacity(0.55)), lineWidth: 2 * k)
        }
        ctx.stroke(Path(roundedRect: r, cornerRadius: 3),
                   with: .color(p.ink.opacity(0.92)),
                   style: StrokeStyle(lineWidth: 2.8 * k, lineJoin: .round))
    }

    private func arrow(_ ctx: inout GraphicsContext, from a: CGPoint, to b: CGPoint,
                       color: Color, k: CGFloat) {
        ctx.stroke(Path { $0.move(to: a); $0.addLine(to: b) },
                   with: .color(color), lineWidth: 1.8 * k)
        let dx = b.x - a.x, dy = b.y - a.y
        let len = max(sqrt(dx * dx + dy * dy), 0.001)
        let ux = dx / len, uy = dy / len
        for (pt, s) in [(a, CGFloat(1)), (b, CGFloat(-1))] {
            var h = Path()
            h.move(to: CGPoint(x: pt.x + ux * s * 9 * k + uy * 5 * k,
                               y: pt.y + uy * s * 9 * k - ux * 5 * k))
            h.addLine(to: pt)
            h.addLine(to: CGPoint(x: pt.x + ux * s * 9 * k - uy * 5 * k,
                                  y: pt.y + uy * s * 9 * k + ux * 5 * k))
            ctx.stroke(h, with: .color(color),
                       style: StrokeStyle(lineWidth: 1.8 * k, lineJoin: .round))
        }
    }
}

// MARK: - Answers: driftwood tiles resting on the sand

public struct MQAnswerTile: View {
    let p: MQPalette
    let text: String
    let tilt: Double
    let fontSize: CGFloat
    /// The tile's own frame, when the caller knows it. Given one, the tile
    /// computes the size and line count it will set with `MQAnswerTile.fit`
    /// instead of relying on SwiftUI's scaling alone - which is what makes the
    /// fit gate able to assert on the SAME arithmetic the pixels come from.
    let box: CGSize?
    let typeFloor: CGFloat

    public init(_ p: MQPalette = .noon, _ text: String,
                tilt: Double = 0, fontSize: CGFloat = 34,
                box: CGSize? = nil,
                typeFloor: CGFloat = MQFigures.iPadTypeFloor) {
        self.p = p; self.text = text; self.tilt = tilt; self.fontSize = fontSize
        self.box = box; self.typeFloor = typeFloor
    }

    /// Hand-placed, not machine-placed. Kept under 1.5 degrees so nothing can
    /// clip its neighbour or the safe area.
    public static let tilts: [Double] = [-1.1, 0.7, -0.5, 1.2]

    nonisolated public static let padH: CGFloat = 10
    nonisolated public static let padV: CGFloat = 3
    /// The plank is drawn with its top FACE in `0 ..< H - lift` and the shadow
    /// in the rest, so the text's usable height is the frame's less this. It was
    /// not subtracted anywhere while the tile was one line - a single line
    /// centred in the frame sits inside the face regardless - and it has to be
    /// now, or the third line of a wrapped option is drawn on the sand.
    nonisolated public static let faceLift: CGFloat = 9
    /// Three. A fourth line at the floor does not fit the shortest tile in the
    /// matrix, and an option needing four lines is a generator problem.
    nonisolated public static let maxLines = 3
    /// Baloo 2 ExtraBold's mean advance as a fraction of the point size, over
    /// the option corpus the engine actually emits. MEASURED on this host, not
    /// guessed - `TileFitTests.theAdvanceModelIsNotOptimistic` re-measures it
    /// against `ctx.resolve(_:).measure(in:)` and fails if the model ever
    /// under-estimates, because under-estimating is the direction that
    /// truncates.
    nonisolated public static let advance: CGFloat = 0.62
    /// Baloo 2's line pitch, likewise MEASURED (1.6364 em on this host) rather
    /// than assumed. The first draft used 1.25 and the tile overflowed by 29 pt
    /// at `ipad13-landscape`, because the model promised three 28 pt lines in
    /// 105 pt and SwiftUI laid them out in 134.
    /// `TileFitTests.theLineHeightModelIsNotOptimistic` re-measures it.
    nonisolated public static let lineHeight: CGFloat = 1.64

    public struct Fit: Sendable, Equatable {
        public var size: CGFloat
        public var lines: Int
        /// False when even the floor, at `maxLines`, does not fit the box.
        public var fits: Bool
    }

    /// **The largest size at which this option is drawn WHOLE inside this tile.**
    ///
    /// Dress rehearsal, 2026-09-07: `p4angles` pool 3 emits
    /// `the angle written in short as ∠b at the point B` - 47 characters - as
    /// one of four options, and the tile was `lineLimit(1)` with
    /// `minimumScaleFactor(0.6)`, so 34 pt could only fall to 20.4 pt and the
    /// tile read **`the angle written in…`**. Three of twelve items in a Naming
    /// Narrows session asked the child to judge an option they could not read.
    ///
    /// Same shape as `QBattleView.fittedQuestionSize`: arithmetic over the
    /// string's own length, so a gate can compute the number the body draws.
    nonisolated public static func fit(_ text: String, base: CGFloat, box: CGSize,
                                       floor: CGFloat) -> Fit {
        let innerW = max(box.width - padH * 2, 1)
        let innerH = max(box.height - padV * 2 - faceLift, 1)
        let count = max(text.count, 1)
        func lines(at size: CGFloat) -> Int {
            let perLine = max(1, Int((innerW / (size * advance)).rounded(.down)))
            return max(1, Int((Double(count) / Double(perLine)).rounded(.up)))
        }
        var size = base
        while size > floor {
            let n = lines(at: size)
            if n <= maxLines, CGFloat(n) * size * lineHeight <= innerH {
                return Fit(size: size, lines: n, fits: true)
            }
            size -= 1
        }
        let n = lines(at: floor)
        return Fit(size: floor, lines: min(n, maxLines),
                   fits: n <= maxLines && CGFloat(n) * floor * lineHeight <= innerH)
    }

    /// **The tile HEIGHT this option needs at the type floor.**
    ///
    /// The other half of the fix, and the reason it lives here rather than in
    /// the battle screen: an iPhone SE choice tile is 56 pt tall, its face is
    /// 47 pt of that, and three lines of 10 pt Baloo 2 are 49.2 - so the SE tile
    /// CANNOT draw the 47-character `p4angles` option whole, at any size, in the
    /// box it had. Wrapping alone was not enough; the plank has to get taller,
    /// the same way the figure had to get bigger.
    ///
    /// `QBattleView.geometry` calls this to size the answer row and
    /// `MQDesignTests.TileFitTests` calls it to model the same box, so the two
    /// cannot describe different tiles.
    nonisolated public static func heightNeeded(_ text: String, width: CGFloat,
                                                floor: CGFloat) -> CGFloat {
        let innerW = max(width - padH * 2, 1)
        let perLine = max(1, Int((innerW / (floor * advance)).rounded(.down)))
        let n = min(maxLines,
                    max(1, Int((Double(max(text.count, 1)) / Double(perLine)).rounded(.up))))
        // Plus a point of cushion. Without it the iPhone SE lands on
        // `49.2 <= 49.2` and whether `fit` reports success is decided by binary
        // floating point, which is not a thing a child's answer plank should
        // depend on.
        return CGFloat(n) * floor * lineHeight + padV * 2 + faceLift + 1
    }

    private var resolved: Fit {
        guard let box else {
            return Fit(size: fontSize, lines: Self.maxLines, fits: true)
        }
        return Self.fit(text, base: fontSize, box: box, floor: typeFloor)
    }

    public var body: some View {
        // Unit-bound like every other numeral in the system, so a break inside
        // "46 cm" cannot happen - a two-word answer stays one word wide and the
        // tile shrinks instead. A 47-character SENTENCE is the other case, and
        // that one wraps: three lines at a smaller size beats one line with the
        // end of the option missing.
        let f = resolved
        Text(MQTypeset.bindUnits(text))
            .font(.mq(f.size, .extrabold))
            .monospacedDigit()
            .foregroundStyle(p.carved)
            .lineLimit(Self.maxLines)
            .multilineTextAlignment(.center)
            // The safety net under the arithmetic, floored at the same point
            // size: whatever SwiftUI's real metrics do that the advance model
            // did not predict, the tile shrinks rather than truncating, and it
            // never sets type below 11 pt on an iPad or 10 on a phone.
            .minimumScaleFactor(min(1, max(0.2, typeFloor / max(f.size, 1))))
            .shadow(color: p.woodDeep.opacity(0.75), radius: 0, x: 0, y: 2)
            .padding(.horizontal, Self.padH)
            .padding(.vertical, Self.padV)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { Canvas { ctx, size in draw(&ctx, size) } }
            .rotationEffect(.degrees(tilt))
    }

    private func draw(_ ctx: inout GraphicsContext, _ size: CGSize) {
        let W = size.width, H = size.height
        let lift: CGFloat = 9
        let face = CGRect(x: 0, y: 0, width: W, height: H - lift)
        let r: CGFloat = 16

        ctx.fill(Path(ellipseIn: CGRect(x: 8, y: H - 12, width: W - 16, height: 16)),
                 with: .color(p.sandShade.opacity(0.42)))
        ctx.fill(Path(roundedRect: CGRect(x: 0, y: lift * 0.4, width: W, height: H - lift * 0.4),
                      cornerRadius: r), with: .color(p.woodDeep))
        // The top face is lighter than the frame, so a tile reads as the thing
        // you touch rather than as more furniture.
        ctx.fill(Path(roundedRect: face, cornerRadius: r),
                 with: .linearGradient(
                    Gradient(colors: [p.underLight(Color(hex: 0xD9A165)),
                                      p.underLight(Color(hex: 0xC08247)),
                                      p.underLight(Color(hex: 0xA16833))]),
                    startPoint: CGPoint(x: 0, y: 0), endPoint: CGPoint(x: W * 0.25, y: H)))
        ctx.stroke(Path(roundedRect: face.insetBy(dx: 5, dy: 5), cornerRadius: r - 5),
                   with: .color(p.woodDeep.opacity(0.28)), lineWidth: 2.6)
        ctx.stroke(Path(roundedRect: face.insetBy(dx: 2, dy: 2), cornerRadius: r - 2),
                   with: .color(.white.opacity(0.34)), lineWidth: 2.2)
        ctx.stroke(Path(roundedRect: face, cornerRadius: r),
                   with: .color(p.woodDeep.opacity(0.85)), lineWidth: 2)
        for i in 0..<4 {
            let y = face.height * (0.20 + CGFloat(i) * 0.20)
            let bow = CGFloat((i % 2) * 2 - 1) * 3
            ctx.stroke(Path.smoothOpen([CGPoint(x: 14, y: y),
                                        CGPoint(x: W * 0.45, y: y + bow),
                                        CGPoint(x: W - 14, y: y - bow * 0.5)]),
                       with: .color(p.woodDeep.opacity(0.11)),
                       style: StrokeStyle(lineWidth: 1.6, lineCap: .round))
        }
        for x in [CGFloat(16), W - 22] {
            ctx.fill(Path(ellipseIn: CGRect(x: x, y: face.midY - 4, width: 9, height: 8)),
                     with: .color(p.iron))
            ctx.fill(Path(ellipseIn: CGRect(x: x + 1.5, y: face.midY - 3, width: 4, height: 3.5)),
                     with: .color(.white.opacity(0.45)))
        }
    }
}

// MARK: - Vitals: a rope-bound gauge on a plank

public struct MQGauge: View {
    public enum Side { case hero, monster, boss }

    let p: MQPalette
    let value: Double
    let readout: String?
    let side: Side
    let height: CGFloat

    public init(_ p: MQPalette = .noon, value: Double, readout: String? = nil,
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
            // a bright sky were unreadable in the first pass, and a number a
            // parent has to squint at is a number that is not in the design.
            if let readout {
                Text(readout)
                    .font(.mq(height * 0.76, .extrabold))
                    .monospacedDigit()
                    .foregroundStyle(p.carved)
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
            ctx.fill(Path(roundedRect: CGRect(x: 6, y: 5.5, width: max(0, w - 6),
                                              height: (H - 6) * 0.30),
                          cornerRadius: (H - 6) * 0.15),
                     with: .color(.white.opacity(0.42)))
        }
        // A rope wrap every fifth of the length: it reads as a scale without
        // pretending to be a precise one.
        for i in 1..<5 {
            let x = W * CGFloat(i) / 5
            ctx.stroke(Path { $0.move(to: CGPoint(x: x, y: 3))
                              $0.addLine(to: CGPoint(x: x, y: H - 3)) },
                       with: .color(p.woodDeep.opacity(0.30)), lineWidth: 2)
        }
        ctx.stroke(Path(roundedRect: trough.insetBy(dx: 1, dy: 1), cornerRadius: r - 1),
                   with: .color(p.woodDeep.opacity(0.9)), lineWidth: 2)
    }
}

// MARK: - Progress: crystals on a rope

public struct MQCrystalRope: View {
    let p: MQPalette
    let filled: Int
    let total: Int
    let shell: CGFloat

    public init(_ p: MQPalette = .noon, filled: Int, total: Int, shell: CGFloat = 26) {
        self.p = p; self.filled = filled; self.total = total; self.shell = shell
    }

    public var body: some View {
        Canvas { ctx, size in
            let W = size.width, H = size.height
            let step = W / CGFloat(total)
            let spar = CGRect(x: 0, y: H * 0.14, width: W, height: max(9, H * 0.17))

            // A driftwood spar the rope is strung from. Crystals hung off a bare
            // line looked like they were floating in the sky.
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
            for x in [spar.minX + spar.height * 0.9, spar.maxX - spar.height * 0.9] {
                ctx.fill(Path(roundedRect: CGRect(x: x - 3, y: spar.minY - 2,
                                                  width: 6, height: spar.height + 4),
                              cornerRadius: 3), with: .color(p.rope))
            }
            for i in 0..<total {
                let x = step * (CGFloat(i) + 0.5)
                ctx.stroke(Path { $0.move(to: CGPoint(x: x, y: spar.maxY - 2))
                                  $0.addLine(to: CGPoint(x: x, y: spar.maxY + H * 0.13)) },
                           with: .color(p.rope), lineWidth: 2.4)
                mqDrawCrystal(&ctx, p,
                              center: CGPoint(x: x, y: spar.maxY + H * 0.13 + shell * 0.56),
                              r: shell / 2, on: i < filled)
            }
        }
    }
}

/// A cut crystal. A scallop shell is a lovely shape and completely illegible at
/// 26pt; a faceted gem has a silhouette a child can count across a room, which
/// is the entire job of a progress row. An uncollected crystal keeps a
/// full-strength outline and only loses its fill, so it stays countable against
/// a cloud.
public func mqDrawCrystal(_ ctx: inout GraphicsContext, _ p: MQPalette,
                          center c: CGPoint, r: CGFloat, on: Bool) {
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
                     with: .color(p.gold.opacity(p.isDusk ? 0.13 : 0.08)))
        }
    }
    ctx.fill(gem, with: .linearGradient(
        Gradient(colors: [body.lit(0.45), body, on ? p.goldDeep : p.parchmentEdge.opacity(0.5)]),
        startPoint: CGPoint(x: c.x - r, y: c.y - r), endPoint: CGPoint(x: c.x + r, y: c.y + r)))
    ctx.stroke(gem, with: .color(edge), style: StrokeStyle(lineWidth: 2, lineJoin: .round))
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

// MARK: - Streak: a storm lantern

public struct MQLantern: View {
    let p: MQPalette
    let streak: Int
    let size: CGFloat

    public init(_ p: MQPalette = .noon, streak: Int, size: CGFloat = 46) {
        self.p = p; self.streak = streak; self.size = size
    }

    public var body: some View {
        HStack(spacing: 6) {
            Canvas { ctx, s in draw(&ctx, s) }
                .frame(width: size * 0.78, height: size)
            Text("\(streak)")
                .font(.mq(size * 0.62, .extrabold))
                .monospacedDigit()
                .foregroundStyle(p.carved)
                .shadow(color: p.woodDeep.opacity(0.85), radius: 0, x: 0, y: 2)
        }
    }

    private func draw(_ ctx: inout GraphicsContext, _ s: CGSize) {
        let W = s.width, H = s.height
        ctx.stroke(Path { $0.move(to: CGPoint(x: W * 0.28, y: H * 0.16))
                          $0.addQuadCurve(to: CGPoint(x: W * 0.72, y: H * 0.16),
                                          control: CGPoint(x: W * 0.5, y: -H * 0.06)) },
                   with: .color(p.iron), style: StrokeStyle(lineWidth: W * 0.07, lineCap: .round))
        for i in stride(from: 5, through: 1, by: -1) {
            let r = W * 0.17 * CGFloat(i)
            ctx.fill(Path(ellipseIn: CGRect(x: W * 0.5 - r, y: H * 0.56 - r,
                                            width: r * 2, height: r * 2)),
                     with: .color(p.gold.opacity(p.isDusk ? 0.16 : 0.10)))
        }
        let glass = Path.smoothClosed([
            CGPoint(x: W * 0.20, y: H * 0.32), CGPoint(x: W * 0.80, y: H * 0.32),
            CGPoint(x: W * 0.86, y: H * 0.62), CGPoint(x: W * 0.78, y: H * 0.82),
            CGPoint(x: W * 0.22, y: H * 0.82), CGPoint(x: W * 0.14, y: H * 0.62)
        ], tension: 0.35)
        ctx.fill(glass, with: .radialGradient(
            Gradient(colors: [Color(hex: 0xFFF3C4), p.gold, p.goldDeep]),
            center: CGPoint(x: W * 0.5, y: H * 0.60), startRadius: 0, endRadius: W * 0.55))
        ctx.stroke(glass, with: .color(p.iron), lineWidth: W * 0.055)
        ctx.fill(Path.smoothClosed([
            CGPoint(x: W * 0.5, y: H * 0.42), CGPoint(x: W * 0.62, y: H * 0.58),
            CGPoint(x: W * 0.5, y: H * 0.72), CGPoint(x: W * 0.38, y: H * 0.58)
        ], tension: 0.5), with: .color(Color(hex: 0xFF7A2E)))
        ctx.fill(Path.smoothClosed([
            CGPoint(x: W * 0.5, y: H * 0.50), CGPoint(x: W * 0.57, y: H * 0.60),
            CGPoint(x: W * 0.5, y: H * 0.68), CGPoint(x: W * 0.43, y: H * 0.60)
        ], tension: 0.5), with: .color(Color(hex: 0xFFF0B8)))
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

/// A tag of pale wood with the name burnt into it. The generic surface of the
/// system: anything that needs a label sits on one of these.
public struct MQTag<Content: View>: View {
    let p: MQPalette
    let content: Content

    public init(_ p: MQPalette = .noon, @ViewBuilder content: () -> Content) {
        self.p = p; self.content = content()
    }

    public var body: some View {
        content.background {
            Canvas { ctx, size in
                let r = CGRect(origin: .zero, size: size)
                ctx.fill(Path(roundedRect: r.offsetBy(dx: 3, dy: 4), cornerRadius: 13),
                         with: .color(p.woodDeep.opacity(0.30)))
                ctx.fill(Path(roundedRect: r, cornerRadius: 13),
                         with: .linearGradient(
                            Gradient(colors: [p.underLight(Color(hex: 0xF6DCA9)),
                                              p.underLight(Color(hex: 0xE0BE86))]),
                            startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
                ctx.stroke(Path(roundedRect: r.insetBy(dx: 1, dy: 1), cornerRadius: 13),
                           with: .color(p.woodDark.opacity(0.55)), lineWidth: 2)
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

public struct MQNameTag: View {
    let p: MQPalette
    let name: String
    let level: String
    let quest: String
    let compact: Bool

    public init(_ p: MQPalette = .noon, name: String, level: String,
                quest: String, compact: Bool = false) {
        self.p = p; self.name = name; self.level = level
        self.quest = quest; self.compact = compact
    }

    public var body: some View {
        MQTag(p) {
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 8) {
                    Text(name)
                        .font(.mq(compact ? 21 : 26, .extrabold))
                        .foregroundStyle(p.underLight(Color(hex: 0x4A2C12)))
                    Text(level)
                        .font(.mq(compact ? 13 : 15, .bold))
                        .foregroundStyle(p.carved)
                        .padding(.horizontal, 7).padding(.vertical, 1)
                        .background(Capsule().fill(p.leafDeep))
                }
                Text(quest)
                    .font(.mq(compact ? 13 : 16, .medium))
                    .foregroundStyle(p.underLight(Color(hex: 0x6E4B26)))
            }
            .padding(.horizontal, compact ? 14 : 18)
            .padding(.vertical, compact ? 7 : 10)
        }
    }
}

/// The monster's name, hand-lettered on a marker stuck in the sand.
public struct MQMonsterName: View {
    let p: MQPalette
    let name: String
    let size: CGFloat

    public init(_ p: MQPalette = .noon, name: String, size: CGFloat = 20) {
        self.p = p; self.name = name; self.size = size
    }

    public var body: some View {
        Text(name)
            .font(.mq(size, .bold))
            .foregroundStyle(p.carved)
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
                    ctx.stroke(banner, with: .color(Color(hex: 0x7A2716).opacity(0.7)),
                               lineWidth: 1.6)
                }
            }
    }
}

/// A slice of log. Pause, back, and every other icon control in the system.
public struct MQKnob: View {
    public enum Glyph { case pause, back, plus }

    let p: MQPalette
    let glyph: Glyph
    let size: CGFloat

    public init(_ p: MQPalette = .noon, _ glyph: Glyph = .pause, size: CGFloat = 48) {
        self.p = p; self.glyph = glyph; self.size = size
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
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - r * 0.62, y: c.y - r * 0.62,
                                              width: r * 1.24, height: r * 1.24)),
                       with: .color(p.woodDeep.opacity(0.18)), lineWidth: 1.4)
            let dark = p.underLight(Color(hex: 0x4A2C12))
            switch glyph {
            case .pause:
                for dx in [-r * 0.24, r * 0.06] {
                    ctx.fill(Path(roundedRect: CGRect(x: c.x + dx, y: c.y - r * 0.36,
                                                      width: r * 0.18, height: r * 0.72),
                                  cornerRadius: r * 0.07), with: .color(dark))
                }
            case .back:
                ctx.stroke(Path { pth in
                    pth.move(to: CGPoint(x: c.x + r * 0.26, y: c.y - r * 0.36))
                    pth.addLine(to: CGPoint(x: c.x - r * 0.22, y: c.y))
                    pth.addLine(to: CGPoint(x: c.x + r * 0.26, y: c.y + r * 0.36))
                }, with: .color(dark),
                           style: StrokeStyle(lineWidth: r * 0.18, lineCap: .round,
                                              lineJoin: .round))
            case .plus:
                for rect in [CGRect(x: c.x - r * 0.42, y: c.y - r * 0.09,
                                    width: r * 0.84, height: r * 0.18),
                             CGRect(x: c.x - r * 0.09, y: c.y - r * 0.42,
                                    width: r * 0.18, height: r * 0.84)] {
                    ctx.fill(Path(roundedRect: rect, cornerRadius: r * 0.06),
                             with: .color(dark))
                }
            }
        }
        .frame(width: size, height: size)
    }
}

/// A plank with a word burnt into it. Every button that is not an answer tile.
public struct MQPlankButton: View {
    let p: MQPalette
    let title: String
    let primary: Bool
    let fontSize: CGFloat

    public init(_ p: MQPalette = .noon, _ title: String,
                primary: Bool = false, fontSize: CGFloat = 22) {
        self.p = p; self.title = title; self.primary = primary; self.fontSize = fontSize
    }

    /// The word never truncates and the padding travels with the type.
    ///
    /// `Check` was fixed for this once; `Play again` was not, and the dress
    /// rehearsal caught it on the iPhone SE result screen - the PRIMARY button
    /// of the whole screen reading **`Play a…`**
    /// (`rehearsal-p1-E-p4area-se/99-result.png`, 2026-09-07). The cause is two
    /// literals: `lineLimit(1)` with no scale floor, and 30 pt of horizontal
    /// padding that does not come down when the type does, so at `fontSize: 16`
    /// the chrome was 60 pt of a ~125 pt button.
    ///
    /// Padding is now a multiple of the type - at the authored `fontSize: 22`
    /// these evaluate to 29.9 and 15.0, i.e. the same button the iPad has
    /// always drawn - and the word may scale to the 11 pt floor before anything
    /// is dropped.
    public var body: some View {
        Text(title)
            .font(.mq(fontSize, primary ? .extrabold : .bold))
            .foregroundStyle(primary ? p.underLight(Color(hex: 0x40270A)) : p.carved)
            .lineLimit(1)
            .minimumScaleFactor(min(1, max(0.34, MQFigures.iPadTypeFloor / max(fontSize, 1))))
            .padding(.horizontal, max(fontSize * (primary ? 1.36 : 1.0), 14))
            .padding(.vertical, max(fontSize * (primary ? 0.682 : 0.545), 9))
            .frame(minHeight: MQTap.min)
            .background {
                Canvas { ctx, size in
                    let r = CGRect(x: 0, y: 0, width: size.width, height: size.height - 6)
                    ctx.fill(Path(roundedRect: CGRect(x: 0, y: 3, width: size.width,
                                                      height: size.height - 3),
                                  cornerRadius: 14),
                             with: .color(primary ? p.goldDeep : p.woodDeep))
                    ctx.fill(Path(roundedRect: r, cornerRadius: 14),
                             with: .linearGradient(
                                Gradient(colors: primary
                                         ? [p.gold.lit(0.25), p.gold, p.goldDeep]
                                         : [p.wood, p.woodDark]),
                                startPoint: .zero, endPoint: CGPoint(x: 0, y: size.height)))
                    ctx.stroke(Path(roundedRect: r.insetBy(dx: 1.2, dy: 1.2), cornerRadius: 14),
                               with: .color(primary ? p.goldDeep : p.woodDeep.opacity(0.85)),
                               lineWidth: 2)
                    ctx.stroke(Path(roundedRect: r.insetBy(dx: 3.5, dy: 3.5), cornerRadius: 11),
                               with: .color(.white.opacity(0.26)), lineWidth: 1.6)
                }
            }
    }
}
