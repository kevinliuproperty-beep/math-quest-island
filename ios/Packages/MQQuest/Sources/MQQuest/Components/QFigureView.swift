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
    /// **The smallest type this figure may set, in points.**
    ///
    /// Quest Refutation K5. Every label size here was `n * k` where
    /// `k = min(1, max(0.46, height/150))`, and the battle board's figure slot is
    /// ~70 pt tall, so `k = 0.467` and the `p4data` table header set at **5.1 pt**:
    /// "Tuesday" ran through the column rule into "Wednesday" and a child asked
    /// how many cups were recorded on Monday could read Monday and Friday and
    /// nothing between them. The pie's caption set at 4.6 pt and was drawn onto
    /// the signboard's wooden bottom rail. Apple's own type floor is 11.
    ///
    /// So: 11 pt on an iPad, 10 on a phone, and a label that cannot be drawn at
    /// the floor inside its own box is TRUNCATED to fit or dropped - never set
    /// smaller, and never drawn outside the box.
    let typeFloor: CGFloat

    public static let iPadTypeFloor: CGFloat = 11
    public static let phoneTypeFloor: CGFloat = 10

    public init(_ p: MQPalette = .noon, _ figure: Figure, fallbackText: String = "",
                typeFloor: CGFloat = QFigureView.iPadTypeFloor) {
        self.p = p; self.figure = figure; self.fallbackText = fallbackText
        self.typeFloor = typeFloor
    }

    /// Whether this build can draw the spec at all.
    public static func isDrawable(_ figure: Figure) -> Bool { figure.isDrawable }

    public var body: some View {
        let floor = typeFloor
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
            Canvas { ctx, size in Self.drawBar(&ctx, size, b, p, floor) }
        case .line(let l):
            Canvas { ctx, size in Self.drawLine(&ctx, size, l, p, floor) }
        case .table(let t):
            Canvas { ctx, size in Self.drawTable(&ctx, size, t, p, floor) }
        case .lshape(let s):
            Canvas { ctx, size in Self.drawLShape(&ctx, size, s, p, floor) }
        case .pie(let pie):
            Canvas { ctx, size in Self.drawPie(&ctx, size, pie, p, floor) }
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

    static func styled(_ text: String, _ size: CGFloat, _ p: MQPalette,
                       soft: Bool) -> Text {
        Text(MQTypeset.bindUnits(text))
            .font(.mq(size, soft ? .medium : .semibold))
            .foregroundColor(soft ? p.inkSoft : p.ink)
    }

    /// The drawn width of a string, measured rather than estimated.
    ///
    /// The knockout patch used to be `text.count * size * 0.62`, which is a guess
    /// about a proportional face and was the reason a header could sit under a
    /// patch narrower than itself while overlapping its neighbour.
    static func width(_ ctx: GraphicsContext, _ text: String, size: CGFloat,
                      _ p: MQPalette, soft: Bool) -> CGFloat {
        ctx.resolve(styled(text, size, p, soft: soft))
           .measure(in: CGSize(width: 10_000, height: 10_000)).width
    }

    /// The longest prefix of `text` that fits `maxWidth` at `size`, with an
    /// ellipsis when anything was dropped. `nil` when even one character plus the
    /// ellipsis will not fit - in which case the caller DRAWS NOTHING, because
    /// unreadable ink in the right place is worse than no ink.
    static func fitted(_ ctx: GraphicsContext, _ text: String, maxWidth: CGFloat,
                       size: CGFloat, _ p: MQPalette, soft: Bool) -> String? {
        guard !text.isEmpty, maxWidth > 0 else { return nil }
        if width(ctx, text, size: size, p, soft: soft) <= maxWidth { return text }
        var n = text.count - 1
        while n >= 1 {
            let candidate = String(text.prefix(n)) + "\u{2026}"
            if width(ctx, candidate, size: size, p, soft: soft) <= maxWidth { return candidate }
            n -= 1
        }
        return nil
    }

    /// A label, never set below `floor` and never drawn outside `bounds`.
    ///
    /// `maxWidth` is the box the label has to live inside. When it is given, the
    /// text is truncated to fit at the floored size and dropped if it cannot.
    ///
    /// `bounds` is the canvas the figure owns. Passing it is what makes K5's
    /// pixel gate satisfiable: `ctx.draw(Text)` has no clip and no bounds of its
    /// own, so a label positioned a few points above the plot area drew into
    /// whatever was behind the figure - the signboard's wooden frame, in the pie
    /// caption's case. The draw point is CLAMPED so the whole glyph box stays
    /// inside; a label that cannot fit even clamped is dropped by `maxWidth`.
    @discardableResult
    static func label(_ ctx: inout GraphicsContext, _ text: String, at: CGPoint,
                      size: CGFloat, _ p: MQPalette, knockout: Bool = true,
                      anchor: UnitPoint = .center, soft: Bool = false,
                      floor: CGFloat = 0, maxWidth: CGFloat? = nil,
                      bounds: CGSize = .zero) -> Bool {
        guard !text.isEmpty else { return false }
        let pt = max(size, floor)
        var limit = maxWidth
        if bounds != .zero {
            // Never wider than the box, whatever the caller asked for.
            let byAnchor: CGFloat
            switch anchor {
            case .leading:  byAnchor = bounds.width - at.x - 2
            case .trailing: byAnchor = at.x - 2
            default:        byAnchor = bounds.width - 4
            }
            limit = min(limit ?? .greatestFiniteMagnitude, max(byAnchor, 0))
        }
        var shown = text
        if let limit {
            guard let f = fitted(ctx, text, maxWidth: limit, size: pt, p, soft: soft)
            else { return false }
            shown = f
        }
        let w = width(ctx, shown, size: pt, p, soft: soft) + pt * 0.5
        var point = at
        if bounds != .zero {
            let halfH = pt * 0.75
            point.y = min(max(at.y, halfH), max(bounds.height - halfH, halfH))
            switch anchor {
            case .leading:  point.x = min(max(at.x, 1), max(bounds.width - w, 1))
            case .trailing: point.x = min(max(at.x, w), max(bounds.width - 1, w))
            default:        point.x = min(max(at.x, w / 2),
                                          max(bounds.width - w / 2, w / 2))
            }
        }
        if knockout {
            let x: CGFloat
            switch anchor {
            case .leading:  x = point.x - pt * 0.25
            case .trailing: x = point.x - w + pt * 0.25
            default:        x = point.x - w / 2
            }
            ctx.fill(Path(CGRect(x: x, y: point.y - pt * 0.72,
                                 width: w, height: pt * 1.44)),
                     with: .color(p.parchment.opacity(0.92)))
        }
        ctx.draw(styled(shown, pt, p, soft: soft), at: point, anchor: anchor)
        return true
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
                        _ b: Figure.Bar, _ p: MQPalette, _ floor: CGFloat) {
        let k = k(size)
        let titleH: CGFloat = b.title.isEmpty ? 0 : max(15 * k, floor * 1.3)
        if !b.title.isEmpty {
            label(&ctx, b.title, at: CGPoint(x: size.width / 2, y: titleH / 2),
                  size: 12 * k, p, knockout: false, floor: floor, maxWidth: size.width - 4, bounds: size)
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
                  knockout: false, anchor: .trailing, soft: true,
                  floor: floor, maxWidth: catW - 8 * k, bounds: size)
            label(&ctx, "\(units * b.scale)",
                  at: CGPoint(x: r.maxX + 13 * k, y: y), size: 12 * k, p,
                  knockout: false, floor: floor, bounds: size)
        }
        // The value axis, named once rather than repeated on every tick.
        if !b.unitLabel.isEmpty {
            label(&ctx, b.unitLabel,
                  at: CGPoint(x: plot.midX, y: min(plot.maxY + 8 * k,
                                                   size.height - floor * 0.75)),
                  size: 10 * k, p, knockout: false, soft: true,
                  floor: floor, maxWidth: plot.width, bounds: size)
        }
    }

    // MARK: line

    static func drawLine(_ ctx: inout GraphicsContext, _ size: CGSize,
                         _ l: Figure.Line, _ p: MQPalette, _ floor: CGFloat) {
        let k = k(size)
        let titleH: CGFloat = l.title.isEmpty ? 0 : max(15 * k, floor * 1.3)
        if !l.title.isEmpty {
            label(&ctx, l.title, at: CGPoint(x: size.width / 2, y: titleH / 2),
                  size: 12 * k, p, knockout: false, floor: floor, maxWidth: size.width - 4, bounds: size)
        }
        // The category row under the axis needs a real line's worth of room, not
        // 30 * k of it - at k = 0.47 that was 14 pt for a 10 pt label.
        let footer = max(30 * k, floor * 2.0)
        let plot = CGRect(x: 24 * k, y: titleH + max(12 * k, floor * 0.9),
                          width: size.width - 34 * k,
                          height: size.height - titleH - max(12 * k, floor * 0.9) - footer)
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
                  at: CGPoint(x: pt.x, y: pt.y - max(11 * k, floor * 0.8)),
                  size: 11 * k, p, floor: floor, bounds: size)
            if i < l.cats.count {
                label(&ctx, l.cats[i],
                      at: CGPoint(x: pt.x, y: plot.maxY + footer * 0.5),
                      size: 10 * k, p, knockout: false, soft: true,
                      floor: floor, maxWidth: n > 1 ? plot.width / CGFloat(n - 1) : plot.width, bounds: size)
            }
        }
        if !l.unitLabel.isEmpty {
            label(&ctx, l.unitLabel, at: CGPoint(x: plot.minX - 12 * k, y: plot.minY),
                  size: 10 * k, p, knockout: false, soft: true, floor: floor, bounds: size)
        }
    }

    // MARK: table

    static func drawTable(_ ctx: inout GraphicsContext, _ size: CGSize,
                          _ t: Figure.Table, _ p: MQPalette, _ floor: CGFloat) {
        let k = k(size)
        let titleH: CGFloat = t.title.isEmpty ? 0 : max(16 * k, floor * 1.4)
        if !t.title.isEmpty {
            label(&ctx, t.title, at: CGPoint(x: size.width / 2, y: titleH / 2),
                  size: 12 * k, p, knockout: false, floor: floor, maxWidth: size.width - 4, bounds: size)
        }
        let cols = max(t.cats.count, 1)
        let unitH: CGFloat = t.unitLabel.isEmpty ? 0 : floor * 1.5
        // Two rows of floored type need room to BE two rows. The old cap of
        // 58 * k gave a 27 pt box on the battle board - 13 pt a row for 11 pt
        // type - and the header was set at 5.1 pt to make it fit.
        let boxH = min(size.height - titleH - unitH - 4 * k,
                       max(58 * k, floor * 2 * 1.9))
        let box = CGRect(x: 3 * k, y: titleH + 2 * k,
                         width: size.width - 6 * k, height: boxH)
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

        // **The header is TRUNCATED TO ITS OWN CELL, at no less than the floor.**
        // `ctx.draw(Text)` draws at natural size with no width constraint, no
        // truncation and no clip, so "Tuesday" ran through the column rule into
        // "Wednesday" (Quest Refutation K5). A column that cannot hold "Wed..."
        // at the floor gets no header rather than a header on top of its
        // neighbour - and the VALUES, which are what the question is about, are
        // never truncated because a truncated number is a wrong number.
        let cellW = colW - 4 * k
        for (i, cat) in t.cats.enumerated() {
            let cx = box.minX + colW * (CGFloat(i) + 0.5)
            label(&ctx, cat, at: CGPoint(x: cx, y: box.minY + rowH / 2),
                  size: 11 * k, p, knockout: false, floor: floor, maxWidth: cellW, bounds: size)
            let text = (i == t.hidden) ? "?"
                : "\(i < t.values.count ? t.values[i] : 0)"
            label(&ctx, text, at: CGPoint(x: cx, y: box.minY + rowH * 1.5),
                  size: 13 * k, p, knockout: false, floor: floor, bounds: size)
        }
        if !t.unitLabel.isEmpty {
            label(&ctx, t.unitLabel,
                  at: CGPoint(x: box.midX, y: box.maxY + unitH / 2),
                  size: 10 * k, p, knockout: false, soft: true,
                  floor: floor, maxWidth: box.width, bounds: size)
        }
    }

    // MARK: lshape

    static func drawLShape(_ ctx: inout GraphicsContext, _ size: CGSize,
                           _ s: Figure.LShape, _ p: MQPalette, _ floor: CGFloat) {
        let k = k(size)
        let sides = s.sides
        let W = CGFloat(max(s.W, 1)), H = CGFloat(max(s.H, 1))
        let a = CGFloat(min(max(s.a, 0), s.W)), b = CGFloat(min(max(s.b, 0), s.H))
        // Room for the printed sides on all four edges - and the sides are set at
        // the floor now, so the inset has to be at least that tall.
        let inset = CGSize(width: max(30 * k, floor * 2.4),
                           height: max(22 * k, floor * 1.5))
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
        let out = max(9 * k, floor * 0.75)
        label(&ctx, side(sides.top),
              at: CGPoint(x: o.x + (w - ax) / 2, y: o.y - out), size: 11 * k, p, floor: floor, bounds: size)
        label(&ctx, side(sides.cutDown),
              at: CGPoint(x: o.x + w - ax - 13 * k, y: o.y + by / 2), size: 10 * k, p,
              floor: floor, bounds: size)
        label(&ctx, side(sides.cutAcross),
              at: CGPoint(x: o.x + w - ax / 2, y: o.y + by + out), size: 10 * k, p,
              floor: floor, bounds: size)
        label(&ctx, side(sides.right),
              at: CGPoint(x: o.x + w + inset.width / 2, y: o.y + by + (h - by) / 2),
              size: 11 * k, p, floor: floor, bounds: size)
        label(&ctx, side(sides.bottom),
              at: CGPoint(x: o.x + w / 2, y: o.y + h + out), size: 11 * k, p, floor: floor, bounds: size)
        label(&ctx, side(sides.left),
              at: CGPoint(x: o.x - inset.width / 2, y: o.y + h / 2), size: 11 * k, p,
              floor: floor, bounds: size)
    }

    // MARK: pie

    static func drawPie(_ ctx: inout GraphicsContext, _ size: CGSize,
                        _ pie: Figure.Pie, _ p: MQPalette, _ floor: CGFloat) {
        let k = k(size)
        var titleH: CGFloat = pie.title.isEmpty ? 0 : max(15 * k, floor * 1.4)
        // **The caption gets a BAND, not a baseline.** It used to be drawn at
        // `y = size.height - 5 * k` at `10 * k` = 4.6 pt, so half of it hung below
        // the canvas and landed on the signboard's wooden bottom rail (Quest
        // Refutation K5). A band as tall as the floored type, and the caption is
        // centred in it.
        var captionH: CGFloat = pie.caption.isEmpty ? 0 : max(13 * k, floor * 1.6)
        // **The DISC is the question; the chrome is not.**
        //
        // With a type FLOOR the title and the caption reserve real height, and on
        // a phone's 58 pt figure slot that left a 26 pt disc with four sector
        // labels stacked on each other. So the chrome yields, least load-bearing
        // first: the caption ("Number of books. Each sector is labelled with its
        // number of books.") restates the legend, the title names the data, and
        // neither of them is the picture. Dropping one beats setting all three
        // below the floor, which is what the old code did.
        let minDisc = floor * 3.4
        if size.height - titleH - captionH - 4 * k < minDisc { captionH = 0 }
        if size.height - titleH - captionH - 4 * k < minDisc { titleH = 0 }
        if !pie.title.isEmpty, titleH > 0 {
            label(&ctx, pie.title, at: CGPoint(x: size.width / 2, y: titleH / 2),
                  size: 12 * k, p, knockout: false, floor: floor, maxWidth: size.width - 4, bounds: size)
        }
        // Legend on the right when there is room for it, dropped when not.
        let legendW = min(size.width * 0.42, max(96 * k, floor * 7))
        let sideBySide = size.width - legendW > max(70 * k, floor * 4)
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
            // A sector label at the floor needs the sector to be able to hold it;
            // the legend carries the same string for a slice that cannot.
            if i < pie.labels.count, sweep > 0.30 {
                label(&ctx, pie.labels[i], at: at, size: 11 * k, p,
                      floor: floor, maxWidth: r * 1.1, bounds: size)
            }
            start += sweep
        }
        inkEdge(&ctx, Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r,
                                             width: r * 2, height: r * 2)),
                p, k: k, weight: 2.2)

        // Legend: a swatch, the category, and the same string printed in the
        // sector, so a slice too small to carry its label still has one.
        let rows = pie.cats.count
        // Rows at the floor need a row's worth of height each. A legend that
        // cannot give every row that is not drawn AT ALL: the sector labels and
        // the caption already carry the numbers, and 5.6 pt legend type carries
        // nothing (Quest Refutation K5).
        let step = max(floor * 1.25, min(15 * k, discBox.height / CGFloat(max(rows, 1))))
        let swatch = max(9 * k, floor * 0.8)
        if sideBySide, rows > 0, step * CGFloat(rows) <= discBox.height + step * 0.5 {
            let x = size.width - legendW + 4 * k
            var y = discBox.midY - step * CGFloat(rows - 1) / 2
            for (i, cat) in pie.cats.enumerated() {
                let box = CGRect(x: x, y: y - swatch / 2, width: swatch, height: swatch)
                ctx.fill(Path(roundedRect: box, cornerRadius: 1.5 * k),
                         with: .color(fill(i, p)))
                ctx.stroke(Path(roundedRect: box, cornerRadius: 1.5 * k),
                           with: .color(p.ink.opacity(0.7)), lineWidth: 1 * k)
                let text = i < pie.labels.count ? "\(cat) \(pie.labels[i])" : cat
                label(&ctx, text, at: CGPoint(x: x + swatch + 4 * k, y: y),
                      size: 10 * k, p, knockout: false, anchor: .leading, soft: true,
                      floor: floor, maxWidth: legendW - swatch - 8 * k, bounds: size)
                y += step
            }
        }
        if !pie.caption.isEmpty, captionH > 0 {
            label(&ctx, pie.caption,
                  at: CGPoint(x: size.width / 2, y: size.height - captionH / 2),
                  size: 10 * k, p, knockout: false, soft: true,
                  floor: floor, maxWidth: size.width - 4, bounds: size)
        }
    }
}
