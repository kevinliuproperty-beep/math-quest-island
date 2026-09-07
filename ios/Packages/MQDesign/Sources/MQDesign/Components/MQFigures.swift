import SwiftUI
import MQContent

/// Every one of the seven figure specs, drawn.
///
/// # Why this lives in MQDesign
///
/// It was `MQQuest.QFigureView` until the rehearsal fix pass of 2026-09-07, and
/// its own doc comment predicted this move: *"these five belong in MQDesign (or
/// the planned MQFigures) the moment a second mode needs them - Patchwerk will."*
/// Patchwerk did. The dress rehearsal measured **35 figure-bearing items in one
/// 150-item Patchwerk run and not one of them drawn**, because `MQPatchwerk` had
/// no way to reach a renderer that lived inside the other mode. One drawing path
/// for every mode is also what the web does: `js/app.js`'s `figHtml(Q)` is called
/// from `nextQuestion()`, and every mode's feed goes through `nextQuestion()`.
///
/// `MQQuest` keeps `typealias QFigureView = MQFigures`, so the battle board, the
/// review row and their gates read exactly as they did.
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
public struct MQFigures: View {
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
                typeFloor: CGFloat = MQFigures.iPadTypeFloor) {
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
    //
    // **These are `public` because the GATES measure the same computation the
    // pixels come from.** They were `internal` while this file was
    // `MQQuest.QFigureView` and `@testable import MQQuest` reached them; the move
    // into MQDesign (rehearsal fix pass, 2026-09-07) put a module boundary in the
    // way, and the alternative - re-deriving `k`, the type floor or the pie's
    // legend layout inside a test - is a SECOND implementation that drifts from
    // the first. A gate that computes its own answer is not a gate.

    /// Scale factor, referenced to the 150 pt figure slot the design authored at.
    public static func k(_ size: CGSize) -> CGFloat { min(1, max(0.46, size.height / 150)) }

    public static func styled(_ text: String, _ size: CGFloat, _ p: MQPalette,
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
    public static func width(_ ctx: GraphicsContext, _ text: String, size: CGFloat,
                      _ p: MQPalette, soft: Bool) -> CGFloat {
        ctx.resolve(styled(text, size, p, soft: soft))
           .measure(in: CGSize(width: 10_000, height: 10_000)).width
    }

    /// The longest prefix of `text` that fits `maxWidth` at `size`, with an
    /// ellipsis when anything was dropped. `nil` when even one character plus the
    /// ellipsis will not fit - in which case the caller DRAWS NOTHING, because
    /// unreadable ink in the right place is worse than no ink.
    public static func fitted(_ ctx: GraphicsContext, _ text: String, maxWidth: CGFloat,
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
    public static func label(_ ctx: inout GraphicsContext, _ text: String, at: CGPoint,
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
    public static func inkEdge(_ ctx: inout GraphicsContext, _ path: Path,
                        _ p: MQPalette, k: CGFloat, weight: CGFloat = 2.6) {
        ctx.stroke(path, with: .color(p.ink.opacity(0.28)),
                   style: StrokeStyle(lineWidth: weight * 1.6 * k, lineJoin: .round))
        ctx.stroke(path, with: .color(p.ink.opacity(0.92)),
                   style: StrokeStyle(lineWidth: weight * k, lineJoin: .round))
    }

    /// One hue, six strengths. A categorical rainbow is the one place a chart
    /// library's palette would leak onto this island.
    public static func fill(_ i: Int, _ p: MQPalette) -> Color {
        let steps: [Double] = [0.62, 0.44, 0.30, 0.52, 0.36, 0.24]
        return p.leaf.opacity(steps[i % steps.count])
    }

    // MARK: bar

    public static func drawBar(_ ctx: inout GraphicsContext, _ size: CGSize,
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

    /// **The y axis carries NUMBERS now, and the axis caption has its own band.**
    ///
    /// Dress rehearsal, 2026-09-07, `rehearsal-p1-C-p4data-land/04-q02-ask.png`:
    /// this chart drew faint gridlines and **no tick labels at all**, put the
    /// `unitLabel` at `(plot.minX - 12k, plot.minY)` where it landed on the title
    /// AND on January's value label, and cut the title mid-word. The rehearsal
    /// read January as **8 at 1x and had to zoom to 5x to see it was 6** - on the
    /// one question in the session that asks for January's value. That is the
    /// test failing, so three things change:
    ///
    ///  * every gridline that has room for a floored label gets one, in a gutter
    ///    measured from the widest label rather than a 24 * k literal;
    ///  * the axis caption gets a BAND under the title, so it cannot sit on the
    ///    title or on a value;
    ///  * the first and last value labels anchor inward, so January's number
    ///    cannot drift over the gutter it is being read against.
    ///
    /// The chrome yields in the same order the pie's does when the plot would be
    /// squeezed under three floored rows: caption first, then title.
    public static func drawLine(_ ctx: inout GraphicsContext, _ size: CGSize,
                         _ l: Figure.Line, _ p: MQPalette, _ floor: CGFloat) {
        let k = k(size)
        guard !l.units.isEmpty else { return }
        var titleH: CGFloat = l.title.isEmpty ? 0 : max(15 * k, floor * 1.3)
        var capH: CGFloat = l.unitLabel.isEmpty ? 0 : max(11 * k, floor * 1.35)
        // The category row under the axis needs a real line's worth of room, not
        // 30 * k of it - at k = 0.47 that was 14 pt for a 10 pt label.
        let footer = max(30 * k, floor * 2.0)
        let top = max(12 * k, floor * 0.9)
        func plotH(_ t: CGFloat, _ c: CGFloat) -> CGFloat {
            size.height - t - c - top - footer
        }
        if plotH(titleH, capH) < floor * 3 { capH = 0 }
        if plotH(titleH, capH) < floor * 3 { titleH = 0 }

        if !l.title.isEmpty, titleH > 0 {
            label(&ctx, l.title, at: CGPoint(x: size.width / 2, y: titleH / 2),
                  size: 12 * k, p, knockout: false, floor: floor,
                  maxWidth: size.width - 4, bounds: size)
        }
        if !l.unitLabel.isEmpty, capH > 0 {
            label(&ctx, l.unitLabel, at: CGPoint(x: 2, y: titleH + capH / 2),
                  size: 10 * k, p, knockout: false, anchor: .leading, soft: true,
                  floor: floor, maxWidth: size.width - 4, bounds: size)
        }

        let height = plotH(titleH, capH)
        guard height > 10 else { return }
        let maxUnit = max(l.maxUnit, l.units.max() ?? 1, 1)

        // **Which gridlines get a number.** A tick every `stride` units, so two
        // labels are never closer than a floored line height. `maxUnit` is 8 on
        // the P4 chart and every gridline gets one; a 100-unit axis gets every
        // tenth and still reads.
        let rowGap = height / CGFloat(maxUnit)
        let stride = max(1, Int((floor * 1.15 / max(rowGap, 0.01)).rounded(.up)))
        let ticks = (0...maxUnit).filter { $0 % stride == 0 || $0 == maxUnit }
        let tickW = ticks
            .map { width(ctx, "\($0 * l.step)", size: floor, p, soft: true) }
            .max() ?? 0
        // The gutter is the widest number plus a gap, never less than the old
        // 24 * k - a chart whose numbers do not fit is a chart with no numbers.
        let gutter = min(max(tickW + max(4 * k, floor * 0.4), 24 * k), size.width * 0.42)
        let plot = CGRect(x: gutter, y: titleH + capH + top,
                          width: size.width - gutter - max(10 * k, floor * 0.7),
                          height: height)
        guard plot.width > 10 else { return }

        for u in 0...maxUnit {
            let y = plot.maxY - plot.height * CGFloat(u) / CGFloat(maxUnit)
            ctx.stroke(Path { $0.move(to: CGPoint(x: plot.minX, y: y))
                              $0.addLine(to: CGPoint(x: plot.maxX, y: y)) },
                       with: .color(p.ink.opacity(u == 0 ? 0.55 : 0.13)),
                       lineWidth: (u == 0 ? 2 : 1) * k)
            if ticks.contains(u) {
                label(&ctx, "\(u * l.step)",
                      at: CGPoint(x: plot.minX - max(3 * k, floor * 0.3), y: y),
                      size: floor, p, knockout: false, anchor: .trailing, soft: true,
                      floor: floor, maxWidth: gutter - 2, bounds: size)
            }
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
            // The end points anchor INWARD. Centred, January's "6" hung half its
            // width over the y gutter and sat on the tick it was being compared
            // against - which is how it read as 8.
            let anchor: UnitPoint = n > 1 && i == 0 ? .leading
                : (n > 1 && i == n - 1 ? .trailing : .center)
            let nudge: CGFloat = anchor == .leading ? 1 : (anchor == .trailing ? -1 : 0)
            label(&ctx, "\(l.units[i] * l.step)",
                  at: CGPoint(x: pt.x + nudge, y: pt.y - max(11 * k, floor * 0.85)),
                  size: 11 * k, p, anchor: anchor, floor: floor, bounds: size)
            if i < l.cats.count {
                label(&ctx, l.cats[i],
                      at: CGPoint(x: pt.x, y: plot.maxY + footer * 0.5),
                      size: 10 * k, p, knockout: false, soft: true,
                      floor: floor,
                      maxWidth: n > 1 ? plot.width / CGFloat(n - 1) : plot.width,
                      bounds: size)
            }
        }
    }

    // MARK: table

    public static func drawTable(_ ctx: inout GraphicsContext, _ size: CGSize,
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

    /// **The labels are drawn UNDER the outline now, and clear of it.**
    ///
    /// `label`'s knockout is an opaque parchment patch drawn ON whatever is
    /// already there, and this figure put three of its six sides directly on the
    /// edges: `cutDown` at `x - 13 * k` (13 * 0.46 = 6 pt from a 3 pt stroke),
    /// `cutAcross` `out` below the notch, and `left`/`right` centred in an inset
    /// only `max(30k, floor * 2.4)` wide - 24 pt at the iPhone SE, against a
    /// "12 cm" plate over 30 pt wide. At iPad size the plates NICKED the outline;
    /// at SE they ERASED it (`rehearsal-p1-crops/se-lshape-zoom.png`, dress
    /// rehearsal 2026-09-07) and the shape stopped reading as a closed L on the
    /// one topic whose question is "what is the perimeter of this figure?".
    ///
    /// Two changes, and the second one is the guarantee:
    ///
    ///  * the side labels are ANCHORED away from the edges rather than centred
    ///    over them, and the two cut labels are placed in the notch, which is
    ///    empty parchment; the inset is measured from the widest label instead
    ///    of a `30 * k` literal;
    ///  * **the ink edge is stroked LAST.** Whatever a plate lands on, the
    ///    outline is drawn after it, so the L is always closed. A glyph slightly
    ///    overdrawn by a stroke is a legible figure with a smudge; a stroke
    ///    erased by a plate is a figure that is not an L.
    public static func drawLShape(_ ctx: inout GraphicsContext, _ size: CGSize,
                           _ s: Figure.LShape, _ p: MQPalette, _ floor: CGFloat) {
        let k = k(size)
        let sides = s.sides
        let W = CGFloat(max(s.W, 1)), H = CGFloat(max(s.H, 1))
        let a = CGFloat(min(max(s.a, 0), s.W)), b = CGFloat(min(max(s.b, 0), s.H))

        let u = s.unit
        func side(_ n: Int) -> String { u.isEmpty ? "\(n)" : "\(n) \(u)" }
        // Every side is set at the floor (`label` floors `11 * k` for any k < 1
        // at the board's slot), so measure at the floor.
        func measured(_ t: String) -> CGFloat { width(ctx, t, size: floor, p, soft: false) }
        let gap = max(4 * k, floor * 0.45)
        // The knockout patch is `pt * 1.44` tall, centred: `floor * 0.72` each
        // way. `out` has to clear that plus the 2.6 * k stroke, or the top and
        // bottom plates sit on their own edges.
        let out = max(9 * k, floor * 0.95)

        // The left and right insets are the widest label plus its gap, so the
        // plate ENDS before the edge instead of straddling it. Capped at 30% of
        // the canvas each so a long unit string cannot squeeze out the shape.
        let flankW = min(max(max(measured(side(sides.left)), measured(side(sides.right)))
                             + gap + 2, 30 * k), size.width * 0.30)
        let inset = CGSize(width: flankW, height: max(22 * k, floor * 1.7))
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

        // Every one of the six sides printed, from the spec's OWN derivation, so
        // the picture and the numbers cannot disagree.
        label(&ctx, side(sides.top),
              at: CGPoint(x: o.x + (w - ax) / 2, y: o.y - out),
              size: 11 * k, p, floor: floor, bounds: size)
        // The two cut sides go into the NOTCH - the bite out of the top right,
        // which is empty parchment - rather than onto the two edges they name.
        label(&ctx, side(sides.cutDown),
              at: CGPoint(x: o.x + w - ax + gap, y: o.y + by / 2),
              size: 10 * k, p, anchor: .leading, floor: floor, bounds: size)
        // ...unless the notch is too SHORT to hold two plates, in which case the
        // cut-across label goes up into the top band instead. The two plates are
        // `floor * 1.44` tall and sit at `by / 2` and `by - out`, so the notch
        // only holds both when `by / 2 - out >= floor * 1.5`. Measured on the
        // iPhone SE slot: an 11 x 9 shape with a 3 x 3 bite gives a 23 pt notch
        // and an 11 x 8 with a 4 x 4 gives 35 - at BOTH the plates landed 2 to
        // 8 pt apart and the second one's knockout erased the first, so the two
        // cut sides read as one "3 cm". They can never collide in the top band,
        // because `top` is centred at `(w - ax) / 2` and this at `w - ax / 2`,
        // which are `w / 2` apart whatever the bite is.
        let notchHoldsBoth = by / 2 - out >= floor * 1.5
        label(&ctx, side(sides.cutAcross),
              at: CGPoint(x: o.x + w - ax / 2,
                          y: notchHoldsBoth ? o.y + by - out : o.y - out),
              size: 10 * k, p, floor: floor, bounds: size)
        label(&ctx, side(sides.right),
              at: CGPoint(x: o.x + w + gap, y: o.y + by + (h - by) / 2),
              size: 11 * k, p, anchor: .leading, floor: floor, bounds: size)
        label(&ctx, side(sides.bottom),
              at: CGPoint(x: o.x + w / 2, y: o.y + h + out),
              size: 11 * k, p, floor: floor, bounds: size)
        label(&ctx, side(sides.left),
              at: CGPoint(x: o.x - gap, y: o.y + h / 2),
              size: 11 * k, p, anchor: .trailing, floor: floor, bounds: size)

        // LAST. See the doc comment: this is what makes the L closed whatever a
        // plate did.
        inkEdge(&ctx, path, p, k: k)
    }

    // MARK: pie

    /// **Where every part of a pie goes, computed once, before any ink.**
    ///
    /// This exists because the legend used to be dropped WHOLE at five
    /// categories and the drawing had no way to say so. The dress rehearsal of
    /// 2026-09-07 measured the consequence on Charlotte's iPad in portrait: the
    /// board asked *"On the pie chart, how many pupils are shown for Choir?"*
    /// over a 65 px disc labelled 50/55/60/65/70 with **no legend and no sector
    /// names** - and the result screen then printed *"Find Choir in the key…"*
    /// over the same keyless figure. The question was unanswerable, twice.
    ///
    /// The old test was `step * rows <= discBox.height + step * 0.5`. At that
    /// board's 220x96 slot it evaluated to `68.75 <= 67.3` - **the legend was
    /// dropped by 1.45 pt** - and dropping it costs the whole question, because
    /// the name -> number mapping is the only thing that answers it. The disc is
    /// not: five numbers in five wedges say nothing about Choir.
    ///
    /// So the yield order is inverted. The legend is load-bearing and yields
    /// LAST; the picture yields to it. In preference order, first fit wins:
    ///
    ///  1. **one column** (the most readable legend), then two, then three;
    ///  2. **the chrome yields** - the caption first (it restates the sector
    ///     numbers in prose, and at this slot it was truncated to *"Number of
    ///     pupils. Each sector is labelled wi…"* anyway), then the title;
    ///  3. **the legend may move BELOW the disc** and span the full width;
    ///  4. **the row drops its value and keeps its name** - the value is already
    ///     printed inside the sector, the name is printed nowhere else;
    ///  5. **the disc takes whatever width is left**, down to a 6 pt radius.
    ///
    /// Only a canvas that cannot carry every legend row at the type floor at ANY
    /// disc size comes back `drawable == false`, and `drawPie` then draws
    /// **nothing at all** - no legend means no answerable pie, and a legible
    /// blank is better than an unanswerable picture.
    ///
    /// It is a pure function of the canvas, the spec and the floor, and
    /// `drawPie` draws exactly what it returns. `QPieLegendGateTests` calls THIS
    /// function, through `withDrawingContext`, so the gate and the pixels cannot
    /// come from two different computations.
    public struct PieLayout: Sendable {
        public struct LegendRow: Sendable {
            public let index: Int
            /// Exactly the string drawn. `cat` is always a prefix of it.
            public let text: String
            public let cat: String
            public let at: CGPoint
            /// The width limit handed to `label`. `width <= maxWidth` is what
            /// makes "no ellipsis" a fact rather than a hope.
            public let maxWidth: CGFloat
            public let width: CGFloat
            public let swatch: CGRect
        }
        public var rows: [LegendRow] = []
        public var typeSize: CGFloat = 0
        public var titleH: CGFloat = 0
        public var captionH: CGFloat = 0
        public var centre: CGPoint = .zero
        public var radius: CGFloat = 0
        public var columns: Int = 1
        public var below = false
        public var namesOnly = false
        public var drawable = false
    }

    public static func pieLayout(_ ctx: GraphicsContext, _ size: CGSize,
                          _ pie: Figure.Pie, _ p: MQPalette,
                          _ floor: CGFloat) -> PieLayout {
        let k = k(size)
        let pad = 2 * k
        let titleFull: CGFloat = pie.title.isEmpty ? 0 : max(15 * k, floor * 1.4)
        // **The caption gets a BAND, not a baseline.** It used to be drawn at
        // `y = size.height - 5 * k` at `10 * k` = 4.6 pt, so half of it hung
        // below the canvas and landed on the signboard's wooden bottom rail
        // (Quest Refutation K5).
        let captionFull: CGFloat = pie.caption.isEmpty ? 0 : max(13 * k, floor * 1.6)
        let rows = pie.cats.count

        // No categories, no key to carry: the old chrome-yield path, unchanged.
        if rows == 0 {
            var titleH = titleFull, captionH = captionFull
            let minDisc = floor * 3.4
            if size.height - titleH - captionH - pad * 2 < minDisc { captionH = 0 }
            if size.height - titleH - captionH - pad * 2 < minDisc { titleH = 0 }
            let box = CGRect(x: pad, y: titleH + pad, width: size.width - pad * 2,
                             height: size.height - titleH - captionH - pad * 2)
            let r = min(box.width, box.height) / 2 - pad
            var plan = PieLayout()
            plan.titleH = titleH; plan.captionH = captionH
            plan.centre = CGPoint(x: box.midX, y: box.midY)
            plan.radius = r
            plan.drawable = r > 6
            return plan
        }

        // The legend is set AT the floor when it has to be. It never goes below
        // it and there is nothing to gain by setting it above: 10 pt of category
        // name is what the child reads, and every point above the floor is a
        // point the disc does not get.
        let typeSize = floor
        // The swatch and the gaps are the legend's OVERHEAD, and on a small
        // canvas the overhead is what decides whether the key fits. At
        // `floor * 0.8` plus two `floor * 0.4` gaps a column cost 17.6 pt of a
        // 108 pt review row before a single letter was set, and a five-category
        // key came out `drawable == false` - i.e. the review row drew no pie at
        // all, which is the same hole in a different wall. Two thirds of that
        // overhead buys the row back, and a 6 pt swatch is still a swatch.
        let swatch = max(7 * k, floor * 0.55)
        // >= 3.4 pt at the phone floor. `label(anchor: .leading, bounds:)` clamps
        // its own limit to `bounds.width - at.x - 2`, so the trailing gap has to
        // clear 2 pt or the last column would truncate behind the layout's back.
        let gap = max(3 * k, floor * 0.34)
        // The row PITCH. Rows are drawn at points, so this is a chosen leading,
        // not the face's natural 1.636 em line height: at 1.18 em an 11 pt row
        // still leaves ~5 pt between glyph boxes, and every tenth of an em here
        // is a legend row that fits a small canvas instead of a pie that is not
        // drawn at all.
        let step = max(floor * 1.18, min(15 * k, size.height / CGFloat(rows)))

        func rowText(_ i: Int, _ namesOnly: Bool) -> String {
            guard !namesOnly, i < pie.labels.count else { return pie.cats[i] }
            return "\(pie.cats[i]) \(pie.labels[i])"
        }

        func attempt(columns: Int, titleH: CGFloat, captionH: CGFloat,
                     below: Bool, namesOnly: Bool, disc: Bool) -> PieLayout? {
            let availH = size.height - titleH - captionH - pad * 2
            guard availH > 0 else { return nil }
            let perCol = Int((Double(rows) / Double(columns)).rounded(.up))
            guard perCol >= 1, perCol * columns >= rows else { return nil }
            let legendH = step * CGFloat(perCol)
            guard legendH <= availH else { return nil }

            let widest = (0..<rows)
                .map { width(ctx, rowText($0, namesOnly), size: typeSize, p, soft: true) }
                .max() ?? 0
            let colW = swatch + gap + widest + gap
            let legendW = colW * CGFloat(columns)

            let discBox: CGRect
            let origin: CGPoint
            if below {
                guard legendW <= size.width - pad * 2 else { return nil }
                discBox = CGRect(x: pad, y: titleH + pad,
                                 width: size.width - pad * 2, height: availH - legendH)
                origin = CGPoint(x: max(pad, (size.width - legendW) / 2),
                                 y: titleH + pad + availH - legendH)
            } else {
                guard legendW <= size.width - pad * 2 else { return nil }
                discBox = CGRect(x: pad, y: titleH + pad,
                                 width: size.width - legendW - pad, height: availH)
                origin = CGPoint(x: size.width - legendW,
                                 y: titleH + pad + (availH - legendH) / 2)
            }
            var r = min(discBox.width, discBox.height) / 2 - pad
            if disc {
                guard r > 6 else { return nil }
            } else {
                // Last resort: the KEY without the picture. A legend alone still
                // answers "how many for Choir?"; a disc alone does not, and
                // nothing at all answers nothing. Only reached after every
                // disc-bearing arrangement has been tried and failed.
                r = 0
            }

            var plan = PieLayout()
            plan.typeSize = typeSize
            plan.titleH = titleH; plan.captionH = captionH
            plan.centre = CGPoint(x: discBox.midX, y: discBox.midY)
            plan.radius = r
            plan.columns = columns; plan.below = below; plan.namesOnly = namesOnly
            for i in 0..<rows {
                let col = i / perCol, row = i % perCol
                let x = origin.x + colW * CGFloat(col)
                let y = origin.y + step * (CGFloat(row) + 0.5)
                let textX = x + swatch + gap
                let text = rowText(i, namesOnly)
                let w = width(ctx, text, size: typeSize, p, soft: true)
                let limit = min(widest, size.width - textX - 2)
                guard w <= limit else { return nil }
                plan.rows.append(PieLayout.LegendRow(
                    index: i, text: text, cat: pie.cats[i],
                    at: CGPoint(x: textX, y: y), maxWidth: limit, width: w,
                    swatch: CGRect(x: x, y: y - swatch / 2, width: swatch, height: swatch)))
            }
            plan.drawable = true
            return plan
        }

        for disc in [true, false] {
            for columns in 1...3 {
                for chrome in 0...2 {
                    let titleH = chrome >= 2 ? 0 : titleFull
                    let captionH = chrome >= 1 ? 0 : captionFull
                    for below in [false, true] {
                        for namesOnly in [false, true] {
                            if let plan = attempt(columns: columns, titleH: titleH,
                                                  captionH: captionH, below: below,
                                                  namesOnly: namesOnly, disc: disc) {
                                return plan
                            }
                        }
                    }
                }
            }
        }
        return PieLayout()          // drawable == false: no key, so no pie
    }

    public static func drawPie(_ ctx: inout GraphicsContext, _ size: CGSize,
                        _ pie: Figure.Pie, _ p: MQPalette, _ floor: CGFloat) {
        let k = k(size)
        let plan = pieLayout(ctx, size, pie, p, floor)
        // **A pie with no key is worse than no pie.** The rehearsal's item 3 is
        // the proof: four options, five wedges, and nothing on the glass that
        // ties "Choir" to a number.
        guard plan.drawable else { return }

        if !pie.title.isEmpty, plan.titleH > 0 {
            label(&ctx, pie.title, at: CGPoint(x: size.width / 2, y: plan.titleH / 2),
                  size: 12 * k, p, knockout: false, floor: floor,
                  maxWidth: size.width - 4, bounds: size)
        }

        let c = plan.centre, r = plan.radius
        let total = max(pie.weights.reduce(0, +), 1)
        var start = -CGFloat.pi / 2       // 12 o'clock
        for (i, wgt) in pie.weights.enumerated() where r > 0 {
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
        if r > 0 {
            inkEdge(&ctx, Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r,
                                                 width: r * 2, height: r * 2)),
                    p, k: k, weight: 2.2)
        }

        // The legend, exactly as planned. Every row's `width <= maxWidth`, which
        // is checked in `attempt`, so `fitted` cannot ellipsise a category name.
        for row in plan.rows {
            ctx.fill(Path(roundedRect: row.swatch, cornerRadius: 1.5 * k),
                     with: .color(fill(row.index, p)))
            ctx.stroke(Path(roundedRect: row.swatch, cornerRadius: 1.5 * k),
                       with: .color(p.ink.opacity(0.7)), lineWidth: 1 * k)
            label(&ctx, row.text, at: row.at, size: plan.typeSize, p,
                  knockout: false, anchor: .leading, soft: true,
                  floor: floor, maxWidth: row.maxWidth, bounds: size)
        }

        if !pie.caption.isEmpty, plan.captionH > 0 {
            label(&ctx, pie.caption,
                  at: CGPoint(x: size.width / 2, y: size.height - plan.captionH / 2),
                  size: 10 * k, p, knockout: false, soft: true,
                  floor: floor, maxWidth: size.width - 4, bounds: size)
        }
    }

    // MARK: - The gate's way in

    /// **A real `GraphicsContext`, outside a `Canvas` body.**
    ///
    /// `pieLayout` measures text, and measuring text needs `ctx.resolve(_:)`,
    /// which only exists inside a drawing pass. Without this seam a gate could
    /// only assert on a RECORD of what was drawn - a probe that drifts from the
    /// drawing the first time someone edits one and not the other. This renders
    /// a throwaway canvas at `box` and hands the closure the same context the
    /// figure is drawn with, so the gate calls the drawing's own function with
    /// the drawing's own arguments.
    ///
    /// Nothing on the child's path calls it; it draws nothing and returns the
    /// closure's value.
    @MainActor
    public static func withDrawingContext<T>(
        _ box: CGSize, _ body: @escaping (GraphicsContext) -> T) -> T? {
        let sink = MQDrawingSink<T>()
        let canvas = Canvas { ctx, _ in sink.value = body(ctx) }
            .frame(width: max(box.width, 1), height: max(box.height, 1))
        let renderer = ImageRenderer(content: canvas)
        renderer.scale = 1
        _ = renderer.cgImage
        return sink.value
    }
}

/// Carries one value out of a `Canvas` body for `MQFigures.withDrawingContext`.
/// The render is synchronous on the main actor, so the box is never touched
/// from two places at once.
final class MQDrawingSink<T>: @unchecked Sendable {
    var value: T?
}
