import SwiftUI
import MQContent
import MQDesign

/// Every one of the seven figure specs, drawn.
///
/// # Why this lives in MQQuest and not in MQDesign
///
/// `MQDesign.MQFigureView` draws exactly two shapes, because `MQDesign.MQFigure`
/// has exactly two cases plus `.none` - it was authored before the figure-spec
/// lane landed and it models what the storybook screens needed. The engine on
/// this branch emits all seven (`bar` `rect` `fractionBar` `lshape` `table`
/// `line` `pie`; measured across all 250 generator refs), so a battle that can
/// only draw two would silently show a P4 pie-chart question with no pie.
///
/// So this view takes `MQContent.Figure` - the engine's own type - and:
///
///  * **delegates `rect` and `fractionBar` straight to `MQDesign.MQFigureView`**,
///    so the two shapes the design lane authored are drawn by the design lane's
///    code and cannot drift between the battle board and the review row;
///  * draws the other five here, in the same hand: ink edges on parchment, one
///    hue (the palette's `leaf`) at varying strength rather than a categorical
///    ramp, and every value PRINTED rather than left to be read off an axis.
///
/// **Promotion candidate.** These five belong in `MQDesign` (or the planned
/// `MQFigures`) the moment a second mode needs them - Patchwerk will. Moving them
/// is a file move plus a type swap: nothing here touches MQQuest state.
public struct QFigureView: View {
    let p: MQPalette
    let figure: Figure
    /// Shown when the spec is one this build cannot draw. The engine's own
    /// plain-text reduction of `extra`, so a question never loses its diagram
    /// entirely - it loses the PICTURE and keeps the words.
    let fallbackText: String

    public init(_ p: MQPalette = .noon, _ figure: Figure, fallbackText: String = "") {
        self.p = p; self.figure = figure; self.fallbackText = fallbackText
    }

    /// Whether this build can draw the spec at all.
    public static func isDrawable(_ figure: Figure) -> Bool { figure.isDrawable }

    public var body: some View {
        switch figure {
        case .rect(let r):
            // The design lane's own drawing, fed the engine's numbers.
            MQFigureView(p, .rect(long: "\(r.length) \(r.unit)",
                                  wide: "\(r.breadth) \(r.unit)",
                                  ratio: max(CGFloat(r.length) / CGFloat(max(r.breadth, 1)), 0.05)))
        case .fractionBar(let f):
            MQFigureView(p, .fractionBar(parts: max(f.parts, 1),
                                         filled: max(min(f.filled, f.parts), 0)))
        case .bar(let b):
            Canvas { ctx, size in Self.drawBar(&ctx, size, b, p) }
        case .line(let l):
            Canvas { ctx, size in Self.drawLine(&ctx, size, l, p) }
        case .table(let t):
            Canvas { ctx, size in Self.drawTable(&ctx, size, t, p) }
        case .lshape(let s):
            Canvas { ctx, size in Self.drawLShape(&ctx, size, s, p) }
        case .pie(let pie):
            Canvas { ctx, size in Self.drawPie(&ctx, size, pie, p) }
        case .unsupported:
            unsupported
        }
    }

    /// Not a dashed placeholder box. A spec this build cannot draw is a WORDS
    /// question now, and it says the words.
    private var unsupported: some View {
        Text(fallbackText)
            .font(.mq(13, .regular))
            .foregroundStyle(p.inkSoft)
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - The shared hand
    //
    // Everything below is drawn with the same three moves MQFigureView uses, so a
    // pie and a rectangle read as the same pencil: a doubled ink edge, a knocked
    // out parchment patch behind every label, and one hue at varying strength.

    /// Scale factor, referenced to the 150 pt figure slot the design authored at.
    static func k(_ size: CGSize) -> CGFloat { min(1, max(0.46, size.height / 150)) }

    static func label(_ ctx: inout GraphicsContext, _ text: String, at: CGPoint,
                      size: CGFloat, _ p: MQPalette, knockout: Bool = true,
                      anchor: UnitPoint = .center, soft: Bool = false) {
        guard !text.isEmpty else { return }
        let w = CGFloat(text.count) * size * 0.62 + size * 0.5
        if knockout {
            ctx.fill(Path(CGRect(x: at.x - w / 2, y: at.y - size * 0.72,
                                 width: w, height: size * 1.44)),
                     with: .color(p.parchment.opacity(0.92)))
        }
        ctx.draw(Text(MQTypeset.bindUnits(text))
                    .font(.mq(size, soft ? .medium : .semibold))
                    .foregroundColor(soft ? p.inkSoft : p.ink),
                 at: at, anchor: anchor)
    }

    /// The doubled pencil edge, the way `MQFigureView.drawRect` does it.
    static func inkEdge(_ ctx: inout GraphicsContext, _ path: Path,
                        _ p: MQPalette, k: CGFloat, weight: CGFloat = 2.6) {
        ctx.stroke(path, with: .color(p.ink.opacity(0.28)),
                   style: StrokeStyle(lineWidth: weight * 1.6 * k, lineJoin: .round))
        ctx.stroke(path, with: .color(p.ink.opacity(0.92)),
                   style: StrokeStyle(lineWidth: weight * k, lineJoin: .round))
    }

    /// One hue, six strengths. A categorical rainbow is the one place a chart
    /// library's palette would leak onto this island.
    static func fill(_ i: Int, _ p: MQPalette) -> Color {
        let steps: [Double] = [0.62, 0.44, 0.30, 0.52, 0.36, 0.24]
        return p.leaf.opacity(steps[i % steps.count])
    }

    // MARK: bar

    static func drawBar(_ ctx: inout GraphicsContext, _ size: CGSize,
                        _ b: Figure.Bar, _ p: MQPalette) {
        let k = k(size)
        let titleH: CGFloat = b.title.isEmpty ? 0 : 15 * k
        if !b.title.isEmpty {
            label(&ctx, b.title, at: CGPoint(x: size.width / 2, y: 8 * k),
                  size: 12 * k, p, knockout: false)
        }
        let catW = max(size.width * 0.26, 34 * k)
        let plot = CGRect(x: catW, y: titleH + 4 * k,
                          width: size.width - catW - 26 * k,
                          height: size.height - titleH - 18 * k)
        guard plot.width > 10, plot.height > 10, !b.units.isEmpty else { return }

        let maxUnit = max(b.maxUnit, b.units.max() ?? 1, 1)
        // Gridline and tick per unit, labelled `k * scale` - the contract's own
        // words. Ink, light, behind the bars.
        for u in 0...maxUnit {
            let x = plot.minX + plot.width * CGFloat(u) / CGFloat(maxUnit)
            ctx.stroke(Path { $0.move(to: CGPoint(x: x, y: plot.minY))
                              $0.addLine(to: CGPoint(x: x, y: plot.maxY)) },
                       with: .color(p.ink.opacity(u == 0 ? 0.55 : 0.13)),
                       lineWidth: (u == 0 ? 2 : 1) * k)
        }
        let rows = b.cats.count
        let step = plot.height / CGFloat(max(rows, 1))
        let barH = min(step * 0.62, 26 * k)
        for (i, cat) in b.cats.enumerated() {
            let units = i < b.units.count ? b.units[i] : 0
            let y = plot.minY + step * (CGFloat(i) + 0.5)
            let w = plot.width * CGFloat(units) / CGFloat(maxUnit)
            let r = CGRect(x: plot.minX, y: y - barH / 2, width: max(w, 1), height: barH)
            ctx.fill(Path(roundedRect: r, cornerRadius: 2 * k), with: .color(fill(i, p)))
            inkEdge(&ctx, Path(roundedRect: r, cornerRadius: 2 * k), p, k: k, weight: 1.7)
            label(&ctx, cat, at: CGPoint(x: catW - 6 * k, y: y), size: 11 * k, p,
                  knockout: false, anchor: .trailing, soft: true)
            label(&ctx, "\(units * b.scale)",
                  at: CGPoint(x: r.maxX + 13 * k, y: y), size: 12 * k, p, knockout: false)
        }
        // The value axis, named once rather than repeated on every tick.
        if !b.unitLabel.isEmpty {
            label(&ctx, b.unitLabel,
                  at: CGPoint(x: plot.midX, y: plot.maxY + 8 * k),
                  size: 10 * k, p, knockout: false, soft: true)
        }
    }

    // MARK: line

    static func drawLine(_ ctx: inout GraphicsContext, _ size: CGSize,
                         _ l: Figure.Line, _ p: MQPalette) {
        let k = k(size)
        let titleH: CGFloat = l.title.isEmpty ? 0 : 15 * k
        if !l.title.isEmpty {
            label(&ctx, l.title, at: CGPoint(x: size.width / 2, y: 8 * k),
                  size: 12 * k, p, knockout: false)
        }
        let plot = CGRect(x: 24 * k, y: titleH + 12 * k,
                          width: size.width - 34 * k,
                          height: size.height - titleH - 30 * k)
        guard plot.width > 10, plot.height > 10, !l.units.isEmpty else { return }
        let maxUnit = max(l.maxUnit, l.units.max() ?? 1, 1)

        for u in 0...maxUnit {
            let y = plot.maxY - plot.height * CGFloat(u) / CGFloat(maxUnit)
            ctx.stroke(Path { $0.move(to: CGPoint(x: plot.minX, y: y))
                              $0.addLine(to: CGPoint(x: plot.maxX, y: y)) },
                       with: .color(p.ink.opacity(u == 0 ? 0.55 : 0.13)),
                       lineWidth: (u == 0 ? 2 : 1) * k)
        }
        ctx.stroke(Path { $0.move(to: CGPoint(x: plot.minX, y: plot.minY))
                          $0.addLine(to: CGPoint(x: plot.minX, y: plot.maxY)) },
                   with: .color(p.ink.opacity(0.55)), lineWidth: 2 * k)

        let n = l.units.count
        func point(_ i: Int) -> CGPoint {
            let x = n == 1 ? plot.midX
                : plot.minX + plot.width * CGFloat(i) / CGFloat(n - 1)
            let y = plot.maxY - plot.height * CGFloat(l.units[i]) / CGFloat(maxUnit)
            return CGPoint(x: x, y: y)
        }
        var path = Path()
        for i in 0..<n { i == 0 ? path.move(to: point(i)) : path.addLine(to: point(i)) }
        inkEdge(&ctx, path, p, k: k, weight: 2.2)

        for i in 0..<n {
            let pt = point(i)
            // A round nib, the way a fibre pen leaves one.
            ctx.fill(Path(ellipseIn: CGRect(x: pt.x - 4 * k, y: pt.y - 4 * k,
                                            width: 8 * k, height: 8 * k)),
                     with: .color(p.leafDeep))
            label(&ctx, "\(l.units[i] * l.step)",
                  at: CGPoint(x: pt.x, y: pt.y - 11 * k), size: 11 * k, p)
            if i < l.cats.count {
                label(&ctx, l.cats[i],
                      at: CGPoint(x: pt.x, y: plot.maxY + 9 * k),
                      size: 10 * k, p, knockout: false, soft: true)
            }
        }
        if !l.unitLabel.isEmpty {
            label(&ctx, l.unitLabel, at: CGPoint(x: plot.minX - 12 * k, y: plot.minY),
                  size: 10 * k, p, knockout: false, soft: true)
        }
    }

    // MARK: table

    static func drawTable(_ ctx: inout GraphicsContext, _ size: CGSize,
                          _ t: Figure.Table, _ p: MQPalette) {
        let k = k(size)
        let titleH: CGFloat = t.title.isEmpty ? 0 : 16 * k
        if !t.title.isEmpty {
            label(&ctx, t.title, at: CGPoint(x: size.width / 2, y: 8 * k),
                  size: 12 * k, p, knockout: false)
        }
        let cols = max(t.cats.count, 1)
        let box = CGRect(x: 3 * k, y: titleH + 4 * k,
                         width: size.width - 6 * k,
                         height: min(size.height - titleH - 8 * k, 58 * k))
        guard box.width > 10, box.height > 10 else { return }
        let colW = box.width / CGFloat(cols)
        let rowH = box.height / 2

        // The header row is the only tinted band. Two rows do not need zebra
        // striping; they need one rule that says which is which.
        ctx.fill(Path(CGRect(x: box.minX, y: box.minY, width: box.width, height: rowH)),
                 with: .color(p.leaf.opacity(0.16)))
        for c in 0...cols {
            let x = box.minX + colW * CGFloat(c)
            ctx.stroke(Path { $0.move(to: CGPoint(x: x, y: box.minY))
                              $0.addLine(to: CGPoint(x: x, y: box.maxY)) },
                       with: .color(p.ink.opacity(0.45)), lineWidth: 1.4 * k)
        }
        ctx.stroke(Path { $0.move(to: CGPoint(x: box.minX, y: box.minY + rowH))
                          $0.addLine(to: CGPoint(x: box.maxX, y: box.minY + rowH)) },
                   with: .color(p.ink.opacity(0.45)), lineWidth: 1.4 * k)
        inkEdge(&ctx, Path(box), p, k: k, weight: 2.0)

        for (i, cat) in t.cats.enumerated() {
            let cx = box.minX + colW * (CGFloat(i) + 0.5)
            label(&ctx, cat, at: CGPoint(x: cx, y: box.minY + rowH / 2),
                  size: 11 * k, p, knockout: false)
            let text = (i == t.hidden) ? "?"
                : "\(i < t.values.count ? t.values[i] : 0)"
            label(&ctx, text, at: CGPoint(x: cx, y: box.minY + rowH * 1.5),
                  size: 13 * k, p, knockout: false)
        }
        if !t.unitLabel.isEmpty {
            label(&ctx, t.unitLabel, at: CGPoint(x: box.midX, y: box.maxY + 8 * k),
                  size: 10 * k, p, knockout: false, soft: true)
        }
    }

    // MARK: lshape

    static func drawLShape(_ ctx: inout GraphicsContext, _ size: CGSize,
                           _ s: Figure.LShape, _ p: MQPalette) {
        let k = k(size)
        let sides = s.sides
        let W = CGFloat(max(s.W, 1)), H = CGFloat(max(s.H, 1))
        let a = CGFloat(min(max(s.a, 0), s.W)), b = CGFloat(min(max(s.b, 0), s.H))
        // Room for the printed sides on all four edges.
        let inset = CGSize(width: 30 * k, height: 22 * k)
        let avail = CGSize(width: size.width - inset.width * 2,
                           height: size.height - inset.height * 2)
        guard avail.width > 10, avail.height > 10 else { return }
        let scale = min(avail.width / W, avail.height / H)
        let w = W * scale, h = H * scale
        let o = CGPoint(x: (size.width - w) / 2, y: (size.height - h) / 2)
        let ax = a * scale, by = b * scale

        // Clockwise from the top-left, with the bite out of the TOP-RIGHT.
        var path = Path()
        path.move(to: CGPoint(x: o.x, y: o.y))
        path.addLine(to: CGPoint(x: o.x + w - ax, y: o.y))
        path.addLine(to: CGPoint(x: o.x + w - ax, y: o.y + by))
        path.addLine(to: CGPoint(x: o.x + w, y: o.y + by))
        path.addLine(to: CGPoint(x: o.x + w, y: o.y + h))
        path.addLine(to: CGPoint(x: o.x, y: o.y + h))
        path.closeSubpath()

        ctx.fill(path, with: .color(p.leaf.opacity(0.13)))
        inkEdge(&ctx, path, p, k: k)

        let u = s.unit
        func side(_ n: Int) -> String { u.isEmpty ? "\(n)" : "\(n) \(u)" }
        // Every one of the six sides printed, from the spec's OWN derivation, so
        // the picture and the numbers cannot disagree.
        label(&ctx, side(sides.top),
              at: CGPoint(x: o.x + (w - ax) / 2, y: o.y - 9 * k), size: 11 * k, p)
        label(&ctx, side(sides.cutDown),
              at: CGPoint(x: o.x + w - ax - 13 * k, y: o.y + by / 2), size: 10 * k, p)
        label(&ctx, side(sides.cutAcross),
              at: CGPoint(x: o.x + w - ax / 2, y: o.y + by + 9 * k), size: 10 * k, p)
        label(&ctx, side(sides.right),
              at: CGPoint(x: o.x + w + 15 * k, y: o.y + by + (h - by) / 2), size: 11 * k, p)
        label(&ctx, side(sides.bottom),
              at: CGPoint(x: o.x + w / 2, y: o.y + h + 9 * k), size: 11 * k, p)
        label(&ctx, side(sides.left),
              at: CGPoint(x: o.x - 15 * k, y: o.y + h / 2), size: 11 * k, p)
    }

    // MARK: pie

    static func drawPie(_ ctx: inout GraphicsContext, _ size: CGSize,
                        _ pie: Figure.Pie, _ p: MQPalette) {
        let k = k(size)
        let titleH: CGFloat = pie.title.isEmpty ? 0 : 15 * k
        if !pie.title.isEmpty {
            label(&ctx, pie.title, at: CGPoint(x: size.width / 2, y: 8 * k),
                  size: 12 * k, p, knockout: false)
        }
        let captionH: CGFloat = pie.caption.isEmpty ? 0 : 13 * k
        // Legend on the right when there is room for it, under the pie when not.
        let legendW = min(size.width * 0.42, 96 * k)
        let sideBySide = size.width - legendW > 70 * k
        let discBox = CGRect(x: 2 * k, y: titleH + 2 * k,
                             width: (sideBySide ? size.width - legendW : size.width) - 4 * k,
                             height: size.height - titleH - captionH - 4 * k)
        let r = min(discBox.width, discBox.height) / 2 - 2 * k
        guard r > 6 else { return }
        let c = CGPoint(x: discBox.midX, y: discBox.midY)

        let total = max(pie.weights.reduce(0, +), 1)
        var start = -CGFloat.pi / 2       // 12 o'clock
        for (i, wgt) in pie.weights.enumerated() {
            let sweep = 2 * .pi * CGFloat(wgt) / CGFloat(total)
            var sector = Path()
            sector.move(to: c)
            sector.addArc(center: c, radius: r, startAngle: .radians(start),
                          endAngle: .radians(start + sweep), clockwise: false)
            sector.closeSubpath()
            ctx.fill(sector, with: .color(fill(i, p)))
            ctx.stroke(sector, with: .color(p.ink.opacity(0.85)),
                       style: StrokeStyle(lineWidth: 1.8 * k, lineJoin: .round))
            let mid = start + sweep / 2
            let at = CGPoint(x: c.x + cos(mid) * r * 0.60,
                             y: c.y + sin(mid) * r * 0.60)
            if i < pie.labels.count, sweep > 0.30 {
                label(&ctx, pie.labels[i], at: at, size: 11 * k, p)
            }
            start += sweep
        }
        inkEdge(&ctx, Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r,
                                             width: r * 2, height: r * 2)),
                p, k: k, weight: 2.2)

        // Legend: a swatch, the category, and the same string printed in the
        // sector, so a slice too small to carry its label still has one.
        if sideBySide {
            let x = size.width - legendW + 4 * k
            let rows = pie.cats.count
            let step = min(15 * k, discBox.height / CGFloat(max(rows, 1)))
            var y = discBox.midY - step * CGFloat(rows - 1) / 2
            for (i, cat) in pie.cats.enumerated() {
                ctx.fill(Path(roundedRect: CGRect(x: x, y: y - 4 * k,
                                                  width: 9 * k, height: 9 * k),
                              cornerRadius: 1.5 * k), with: .color(fill(i, p)))
                ctx.stroke(Path(roundedRect: CGRect(x: x, y: y - 4 * k,
                                                    width: 9 * k, height: 9 * k),
                                cornerRadius: 1.5 * k),
                           with: .color(p.ink.opacity(0.7)), lineWidth: 1 * k)
                let text = i < pie.labels.count ? "\(cat) \(pie.labels[i])" : cat
                label(&ctx, text, at: CGPoint(x: x + 13 * k, y: y),
                      size: 10 * k, p, knockout: false, anchor: .leading, soft: true)
                y += step
            }
        }
        if !pie.caption.isEmpty {
            label(&ctx, pie.caption,
                  at: CGPoint(x: size.width / 2, y: size.height - 5 * k),
                  size: 10 * k, p, knockout: false, soft: true)
        }
    }
}
