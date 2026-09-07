import Testing
import SwiftUI
import Foundation
import MQContent
import MQDesign
import MQProgress
import MQEngineJS
@testable import MQQuest
#if canImport(AppKit)
import AppKit
#endif

// =============================================================================
// THE REHEARSAL FIX PASS'S OWN GATES, 2026-09-07.
//
// Four findings from the dress rehearsal of `feat/ios-phase1` @ 3d22b0d, each
// with the gate that would have caught it:
//
//  * BLOCKER 3a - the pie dropped its legend at five categories and the question
//    became unanswerable. `QPieLegendGateTests`.
//  * BLOCKER 3b - a 47-character option rendered `the angle written in…`.
//    `QTileOptionGateTests` (and `MQDesignTests.TileFitTests` for the component).
//  * The line graph had no y-axis numbers and its caption sat on a value label.
//    `QLineAxisGateTests`.
//  * At iPhone SE the L-shape's label plates ERASED its outline and the shape
//    stopped reading as a closed L. `QLShapeClosureGateTests`.
//
// Every one of these draws from the live engine. None of them re-derives the
// drawing's arithmetic: where a computation is shared, the gate calls the same
// function the pixels come from.
// =============================================================================

/// The three figure slots the rehearsal photographed. Taken from the screens'
/// own `geometry`, never from a literal here, so a figure box that changes size
/// changes these gates too.
enum QFigSlots {
    static let devices: [(String, CGSize)] = [
        ("ipad97-landscape", CGSize(width: 1024, height: 768)),
        ("ipad97-portrait", CGSize(width: 768, height: 1024)),
        ("iphone-se", CGSize(width: 375, height: 667))
    ]

    /// The battle board's figure slot, for the SHORTEST possible stem - the
    /// largest box the frame will draw, and therefore the one a child sees on
    /// the short-stem topics the rehearsal photographed.
    static func slot(_ size: CGSize, stemLength: Int = 0) -> (MQMetrics, CGSize, CGFloat) {
        let m = MQMetrics.device(size)
        let g = QBattleView.geometry(m, typed: false, stemLength: stemLength,
                                     hasFigure: true)
        let box = CGSize(width: g.figureW.rounded(.up), height: g.figureH.rounded(.up))
        let floor = m.isRegular ? MQFigures.iPadTypeFloor : MQFigures.phoneTypeFloor
        return (m, box, floor)
    }
}

// =============================================================================

/// **BLOCKER 3a: the pie never draws without its key.**
///
/// `rehearsal-p1-D-p4pie-port/05-q03-ask.png`. The board asked *"On the pie
/// chart, how many pupils are shown for Choir?"* over a 65 px disc labelled
/// 50 / 55 / 60 / 65 / 70, no legend, no sector names, and four options
/// 55 / 60 / 70 / 71. **There is no way to answer it.** The old renderer drew
/// the legend only when `step * rows <= discBox.height + step * 0.5`, and at
/// that slot the sum was `68.75 <= 67.3` - dropped by 1.45 pt. It bit twice: the
/// result screen redrew the same keyless pie under *"Find Choir in the key, then
/// read the number printed inside that sector."*
///
/// So this gate asks the only question that matters: **is the asked category's
/// name on the figure?** It calls `MQFigures.pieLayout` - the function
/// `MQFigures.drawPie` itself calls, with the same arguments, through
/// `MQFigures.withDrawingContext` - so there is no probe to drift.
///
/// **How the asked category is resolved.** Two independent ways, and every draw
/// is resolved by at least one:
///
///  1. **From the stem.** `p4pie` names it verbatim ("…shown for Choir?"), so
///     any `cats[i]` that occurs as a substring of `q.stemText` is asked about.
///  2. **From the key.** `Figure.Pie.labels[i]` is the string printed inside
///     sector *i*, and on a "how many for X" item the correct answer IS that
///     string, so `labels[i] == choiceTexts[correctIndex]` names the sector.
///
/// About three draws in five resolve one of those two ways; the rest are the
/// topic's other question shapes ("which sector is biggest", "how many
/// altogether"), which name no category at all. So the suite asserts the
/// STRONGER property for every draw - that **every** category has a legend row,
/// which subsumes whichever one is asked - and asserts the resolution rule
/// separately, on the draws it applies to. The counts are printed, so the log
/// says which is which rather than only this comment.
@Suite("The pie never draws without its key", .serialized)
struct QPieLegendGateTests {

    static let engine = try! JSQuestionEngine()

    /// 500 real pies. `MQ_PIE_DRAWS` may raise it; it may not lower it below 500,
    /// because a five-category pie is a MINORITY of the topic's output - the
    /// rehearsal saw one in twelve items - and a sample of fifty finds none.
    static var draws: Int {
        max(500, Int(ProcessInfo.processInfo.environment["MQ_PIE_DRAWS"] ?? "") ?? 500)
    }

    static func pies(_ count: Int) async throws -> [(Question, Figure.Pie)] {
        var out: [(Question, Figure.Pie)] = []
        var guardRail = 0
        while out.count < count, guardRail < count * 6 {
            guardRail += 1
            let q = try await engine.nextQuestion(
                .pool(topic: "p4pie", level: [1, 2, 3][guardRail % 3]))
            if case .pie(let pie)? = q.figure { out.append((q, pie)) }
        }
        return out
    }

    @MainActor
    @Test("every asked category is on the figure, at all three rehearsal slots")
    func everyAskedCategoryIsDrawn() async throws {
        QTestFonts.ensure()
        let corpus = try await Self.pies(Self.draws)
        #expect(corpus.count >= Self.draws,
                "only \(corpus.count) pies drawn, the gate needs \(Self.draws)")

        var catCounts: [Int: Int] = [:]
        for (_, pie) in corpus { catCounts[pie.cats.count, default: 0] += 1 }
        print("PIE corpus \(corpus.count) draws, categories: "
              + catCounts.sorted { $0.key < $1.key }
                  .map { "\($0.key)->\($0.value)" }.joined(separator: " "))

        var checked = 0, fromStem = 0, fromKey = 0, unresolved = 0
        var namesOnly = 0, legendBelow = 0, multiColumn = 0, captionDropped = 0
        for (name, size) in QFigSlots.devices {
            let (_, box, floor) = QFigSlots.slot(size)
            for (q, pie) in corpus {
                let plan = try #require(
                    MQFigures.withDrawingContext(box) { ctx in
                        MQFigures.pieLayout(ctx, box, pie, .noon, floor)
                    },
                    "\(name): pieLayout produced nothing")

                // 1. A pie is drawn AT ALL only when it can carry its key.
                #expect(plan.drawable,
                        "\(name): a \(pie.cats.count)-category pie is not drawable in a \(Int(box.width))x\(Int(box.height)) slot - drawPie would draw nothing")
                guard plan.drawable else { continue }

                // 2. Every category has a legend row, in order.
                #expect(plan.rows.count == pie.cats.count,
                        "\(name): \(plan.rows.count) legend rows for \(pie.cats.count) categories")
                for (i, cat) in pie.cats.enumerated() where i < plan.rows.count {
                    let row = plan.rows[i]
                    #expect(row.cat == cat,
                            "\(name): legend row \(i) names \"\(row.cat)\", the spec says \"\(cat)\"")
                    #expect(row.text.hasPrefix(cat),
                            "\(name): legend row \(i) draws \"\(row.text)\", which does not carry \"\(cat)\"")
                    // 3. And it cannot be ellipsised: `label` truncates to
                    //    `maxWidth`, and the layout guarantees the string is
                    //    narrower than that.
                    #expect(row.width <= row.maxWidth,
                            "\(name): \"\(row.text)\" measures \(row.width) pt against a \(row.maxWidth) pt limit - it would be truncated")
                }
                #expect(plan.typeSize >= floor,
                        "\(name): the legend is set at \(plan.typeSize) pt, under the \(floor) pt floor")

                // 4. The asked category specifically, resolved two ways.
                let stemCat = pie.cats.first { q.stemText.contains($0) }
                let answer = q.correctIndex < q.choiceTexts.count
                    ? q.choiceTexts[q.correctIndex] : ""
                let keyCat = pie.labels.firstIndex(of: answer).flatMap {
                    $0 < pie.cats.count ? pie.cats[$0] : nil
                }
                if stemCat != nil { fromStem += 1 }
                if keyCat != nil { fromKey += 1 }
                if stemCat == nil && keyCat == nil { unresolved += 1 }
                for asked in [stemCat, keyCat].compactMap({ $0 }) {
                    #expect(plan.rows.contains { $0.cat == asked },
                            "\(name): the question asks about \"\(asked)\" and the drawn legend does not carry it")
                }
                if plan.namesOnly { namesOnly += 1 }
                if plan.below { legendBelow += 1 }
                if plan.columns > 1 { multiColumn += 1 }
                if plan.captionH == 0 && !pie.caption.isEmpty { captionDropped += 1 }
                checked += 1
            }
        }
        print("PIE \(checked) figure/slot pairs, asked category present in all. "
              + "Resolved from stem \(fromStem), from key \(fromKey), "
              + "neither \(unresolved).")
        print("PIE yields: caption dropped \(captionDropped), two-or-more columns "
              + "\(multiColumn), legend below the disc \(legendBelow), "
              + "names without values \(namesOnly).")
        #expect(checked == corpus.count * QFigSlots.devices.count)
        // Not every pie question is a "how many for X" question - the topic also
        // asks "which sector is biggest" and "how many altogether", and those
        // name no category and have no sector label for an answer. Measured over
        // 500 draws: about three in five resolve. Those are the family BLOCKER
        // 3a was about, and they are the ones this rule has to cover; for the
        // rest, the "every category is drawn" assertion above is the guarantee,
        // which is why it is asserted rather than only the asked one.
        #expect(Double(fromStem + fromKey) >= Double(checked) * 0.4,
                "only \(fromStem + fromKey) of \(checked) pie draws named a category in the stem or a sector label in the answer - the resolution rule in this suite's doc comment no longer describes the topic")
    }

    /// **The REVIEW ROW carries the key too, and this is where the fix first
    /// broke it.**
    ///
    /// BLOCKER 3a bit twice, and the second bite was the review screen: it
    /// redraws the same pie under *"Find Choir in the key, then read the number
    /// printed inside that sector: 70."* The review figure is 108 x 70 on an
    /// iPad and **86 x 62 on a phone** - far smaller than the battle board's -
    /// and the first cut of `pieLayout` came back `drawable == false` on 16 of
    /// 600 iPad draws and 97 of 600 phone draws, i.e. it replaced a keyless pie
    /// with NO pie. That is a different bug, not a fix, so the legend's own
    /// overhead came down (a `floor * 0.55` swatch and `floor * 0.34` gaps in
    /// place of 0.8 and 0.4, and a `floor * 1.18` row pitch in place of 1.25)
    /// until every draw fits. Measured after: **zero undrawable at either size,
    /// the disc never dropped at any slot, and the names-without-values yield
    /// used on 10 of 600 draws at the 86 x 62 phone row only.**
    ///
    /// The two literals are `QResultView.figureWidth` / `.figureHeight`, which
    /// are private to that screen - the same pair `QPixelGateTests` spells out.
    @MainActor
    @Test("the review row draws a complete key at both of its sizes")
    func theReviewRowCarriesTheKey() async throws {
        QTestFonts.ensure()
        let corpus = try await Self.pies(300)
        var namesOnly = 0, noDisc = 0, checked = 0
        for (name, box, floor) in [("ipad review row", CGSize(width: 108, height: 70),
                                    MQFigures.iPadTypeFloor),
                                   ("phone review row", CGSize(width: 86, height: 62),
                                    MQFigures.phoneTypeFloor)] {
            for (_, pie) in corpus {
                let plan = try #require(MQFigures.withDrawingContext(box) { ctx in
                    MQFigures.pieLayout(ctx, box, pie, .noon, floor)
                })
                #expect(plan.drawable,
                        "\(name): a \(pie.cats.count)-category pie is not drawable at \(Int(box.width))x\(Int(box.height)), so the review would redraw the keyless figure as a blank one")
                #expect(plan.rows.count == pie.cats.count,
                        "\(name): \(plan.rows.count) legend rows for \(pie.cats.count) categories")
                for (i, cat) in pie.cats.enumerated() where i < plan.rows.count {
                    #expect(plan.rows[i].cat == cat)
                    #expect(plan.rows[i].width <= plan.rows[i].maxWidth)
                }
                #expect(plan.typeSize >= floor)
                if plan.namesOnly { namesOnly += 1 }
                if plan.radius == 0 { noDisc += 1 }
                checked += 1
            }
        }
        print("PIE REVIEW \(checked) figure/row pairs, all drawable with a complete "
              + "key; names without values \(namesOnly), disc dropped \(noDisc)")
        #expect(noDisc == 0,
                "\(noDisc) review rows fell all the way back to a legend with no pie at all - the yield order has stopped working before its last resort")
    }

    #if canImport(AppKit)
    /// **And the legend is on the PIXELS, not only in the plan.**
    ///
    /// The arithmetic above is the same arithmetic the drawing runs, so the two
    /// cannot disagree by construction - but "by construction" is an argument,
    /// and this is a measurement. The rendered figure is scanned inside the
    /// bounding box of the planned legend rows; a five-category legend puts
    /// hundreds of dark pixels there and a dropped one puts none.
    @MainActor
    @Test("a five-category pie draws real ink where its legend was planned")
    func legendInkIsOnTheGlass() async throws {
        QTestFonts.ensure()
        let corpus = try await Self.pies(240)
        let five = corpus.filter { $0.1.cats.count >= 5 }
        #expect(!five.isEmpty,
                "no pie with five or more categories in 240 draws - this gate's subject does not exist")

        for (name, size) in QFigSlots.devices {
            let (_, box, floor) = QFigSlots.slot(size)
            var measured = 0
            for (_, pie) in five.prefix(4) {
                let plan = try #require(MQFigures.withDrawingContext(box) { ctx in
                    MQFigures.pieLayout(ctx, box, pie, .noon, floor)
                })
                guard plan.drawable, let first = plan.rows.first,
                      let last = plan.rows.last else { continue }
                let rendered = try #require(QDriver.png(
                    MQFigures(.noon, .pie(pie), typeFloor: floor)
                        .frame(width: box.width, height: box.height)
                        .background(Color.white),
                    size: box, scale: 1))
                let rep = try #require(NSBitmapImageRep(data: rendered))
                let band = CGRect(
                    x: min(first.swatch.minX, last.swatch.minX) - 1,
                    y: min(first.at.y, last.at.y) - plan.typeSize,
                    width: box.width - min(first.swatch.minX, last.swatch.minX) + 1,
                    height: abs(last.at.y - first.at.y) + plan.typeSize * 2)
                var dark = 0
                for y in max(0, Int(band.minY))..<min(rep.pixelsHigh, Int(band.maxY)) {
                    for x in max(0, Int(band.minX))..<min(rep.pixelsWide, Int(band.maxX)) {
                        guard let c = rep.colorAt(x: x, y: y)?
                            .usingColorSpace(.sRGB) else { continue }
                        if c.brightnessComponent < 0.72 { dark += 1 }
                    }
                }
                print("PIE INK \(name): \(pie.cats.count) categories, \(dark) dark px "
                      + "in the planned legend band")
                #expect(dark > 60,
                        "\(name): only \(dark) dark pixels where \(plan.rows.count) legend rows were planned - the key is not on the glass")
                measured += 1
            }
            #expect(measured > 0, "\(name): nothing measured")
        }
    }
    #endif
}

// =============================================================================

#if canImport(AppKit)
/// **The L-shape reads as a CLOSED L at the iPhone SE.**
///
/// `rehearsal-p1-crops/se-lshape-zoom.png`. `MQFigures.label`'s knockout is an
/// opaque parchment patch drawn ON whatever is under it, and `drawLShape` put
/// three of its six side labels directly on the edges they name. At iPad size
/// the plates nicked the outline; at SE they erased it, on the one topic whose
/// question is *"What is the perimeter of this figure?"*.
///
/// **The test is a flood fill, so it needs none of the drawing's coordinates.**
/// The figure is rendered on white; every pixel appreciably darker than the
/// ground is a WALL; the fill starts at the canvas corner and spreads through
/// everything that is not a wall. If the outline is closed, the shape's interior
/// is unreachable. A single erased segment - one plate's worth - is a leak, and
/// the fill reaches the middle.
///
/// Red-provable, and PROVED red on 2026-09-07: the pre-fix drawing was restored
/// in `drawLShape` (ink edge before the labels, `cutDown` at `x - 13 * k`,
/// `left` centred in the inset) and this test failed on every one of the three
/// slots, not only the iPhone SE. `floodReachesTheMiddleOfAnEmptyCanvas`
/// is the negative control that says the fill itself works.
@Suite("An L-shape is a closed L at every rehearsal slot", .serialized)
struct QLShapeClosureGateTests {

    static let engine = try! JSQuestionEngine()

    static func shapes(_ count: Int) async throws -> [(Figure, Figure.LShape)] {
        var out: [(Figure, Figure.LShape)] = []
        var guardRail = 0
        while out.count < count, guardRail < count * 10 {
            guardRail += 1
            let q = try await engine.nextQuestion(
                .pool(topic: "p4area", level: [1, 2, 3][guardRail % 3]))
            if case .lshape(let s)? = q.figure, let f = q.figure { out.append((f, s)) }
        }
        return out
    }

    /// Everything not appreciably darker than the white ground is walkable.
    /// The parchment knockout plate is walkable; the doubled ink edge is not.
    @MainActor
    static func floodReachesCentre(_ rep: NSBitmapImageRep) -> (reached: Bool, walls: Int) {
        let w = rep.pixelsWide, h = rep.pixelsHigh
        var wall = [Bool](repeating: false, count: w * h)
        var walls = 0
        for y in 0..<h {
            for x in 0..<w {
                guard let c = rep.colorAt(x: x, y: y)?.usingColorSpace(.sRGB) else { continue }
                if c.brightnessComponent < 0.86 { wall[y * w + x] = true; walls += 1 }
            }
        }
        var seen = [Bool](repeating: false, count: w * h)
        var stack = [0]
        if wall[0] { return (false, walls) }
        seen[0] = true
        while let i = stack.popLast() {
            let x = i % w, y = i / w
            for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                let nx = x + dx, ny = y + dy
                guard nx >= 0, nx < w, ny >= 0, ny < h else { continue }
                let j = ny * w + nx
                if seen[j] || wall[j] { continue }
                seen[j] = true
                stack.append(j)
            }
        }
        return (seen[(h / 2) * w + (w / 2)], walls)
    }

    @MainActor
    @Test("the outline is unbroken - a corner flood never reaches the middle")
    func theLIsClosed() async throws {
        QTestFonts.ensure()
        let corpus = try await Self.shapes(24)
        #expect(!corpus.isEmpty, "p4area produced no L-shape")

        var checked = 0
        for (name, size) in QFigSlots.devices {
            let (_, box, floor) = QFigSlots.slot(size)
            for (figure, s) in corpus {
                // The canvas centre is the seed only when the notch does not
                // contain it. That is a fact about the SPEC, not about the
                // layout: the shape is centred in its box and the bite is out
                // of the top right.
                let deepNotch = CGFloat(s.a) / CGFloat(max(s.W, 1)) > 0.5
                    && CGFloat(s.b) / CGFloat(max(s.H, 1)) > 0.5
                guard !deepNotch else { continue }
                let png = try #require(QDriver.png(
                    MQFigures(.noon, figure, typeFloor: floor)
                        .frame(width: box.width, height: box.height)
                        .background(Color.white),
                    size: box, scale: 1))
                let rep = try #require(NSBitmapImageRep(data: png))
                let (reached, walls) = Self.floodReachesCentre(rep)
                #expect(walls > 40,
                        "\(name): only \(walls) dark pixels in a \(Int(box.width))x\(Int(box.height)) render - the shape was not drawn")
                #expect(!reached,
                        "\(name): the outside reaches the middle of a \(s.W)x\(s.H) L-shape with a \(s.a)x\(s.b) bite - a label plate has erased part of the outline and it is not a closed L")
                checked += 1
            }
        }
        print("LSHAPE \(checked) shape/slot renders, outline closed in all")
        #expect(checked > 0)
    }

    /// The control. Without it, a flood fill that never reaches anything would
    /// make the test above pass on a blank canvas.
    @MainActor
    @Test("the flood fill does reach the middle when there is nothing in the way")
    func floodReachesTheMiddleOfAnEmptyCanvas() throws {
        QTestFonts.ensure()
        let box = CGSize(width: 120, height: 90)
        let png = try #require(QDriver.png(Color.white.frame(width: box.width,
                                                             height: box.height),
                                           size: box, scale: 1))
        let rep = try #require(NSBitmapImageRep(data: png))
        let (reached, walls) = Self.floodReachesCentre(rep)
        #expect(walls == 0)
        #expect(reached, "the flood fill cannot cross an empty canvas, so the closure test proves nothing")
    }
}

// =============================================================================

/// **The line graph's y axis carries numbers.**
///
/// `rehearsal-p1-C-p4data-land/04-q02-ask.png`: faint gridlines and no tick
/// labels at all, the title cut mid-word, the `visitors` axis caption sitting on
/// top of January's value label - and the rehearsal **read January as 8 at 1x
/// and had to zoom to 5x to see it was 6**, on the one item in the session that
/// asks for January's value.
///
/// The gate finds the y axis in the PIXELS - the tallest unbroken dark column -
/// and asserts there is ink to the left of it in at least three separate
/// horizontal bands. Gridlines alone put none there; a labelled axis puts one
/// band per tick.
@Suite("The line graph's y axis carries numbers", .serialized)
struct QLineAxisGateTests {

    static let engine = try! JSQuestionEngine()

    static func lines(_ count: Int) async throws -> [Figure] {
        var out: [Figure] = []
        var guardRail = 0
        while out.count < count, guardRail < count * 12 {
            guardRail += 1
            let q = try await engine.nextQuestion(
                .pool(topic: "p4data", level: [1, 2, 3][guardRail % 3]))
            if case .line? = q.figure, let f = q.figure { out.append(f) }
        }
        return out
    }

    /// The x of the tallest continuous run of dark pixels: the y axis, which is
    /// stroked at `0.55` ink over the full plot height and is the only thing in
    /// the figure shaped like that.
    @MainActor
    static func axisColumn(_ rep: NSBitmapImageRep) -> (x: Int, top: Int, bottom: Int) {
        var best = (x: 0, top: 0, bottom: 0, run: 0)
        for x in 0..<rep.pixelsWide {
            var run = 0, start = 0
            for y in 0..<rep.pixelsHigh {
                let dark = (rep.colorAt(x: x, y: y)?.usingColorSpace(.sRGB)?
                    .brightnessComponent ?? 1) < 0.80
                if dark {
                    if run == 0 { start = y }
                    run += 1
                    if run > best.run { best = (x, start, y, run) }
                } else {
                    run = 0
                }
            }
        }
        return (best.x, best.top, best.bottom)
    }

    @MainActor
    @Test("every gridline band left of the axis carries a tick number")
    func theAxisIsLabelled() async throws {
        QTestFonts.ensure()
        let corpus = try await Self.lines(12)
        #expect(!corpus.isEmpty, "p4data produced no line figure")

        for (name, size) in QFigSlots.devices {
            let (_, box, floor) = QFigSlots.slot(size)
            var measured = 0, worstBands = Int.max
            for figure in corpus.prefix(6) {
                let png = try #require(QDriver.png(
                    MQFigures(.noon, figure, typeFloor: floor)
                        .frame(width: box.width, height: box.height)
                        .background(Color.white),
                    size: box, scale: 1))
                let rep = try #require(NSBitmapImageRep(data: png))
                let axis = Self.axisColumn(rep)
                #expect(axis.x > 4,
                        "\(name): the y axis is at x = \(axis.x), so there is no gutter to put numbers in")

                // Ink strictly LEFT of the axis, inside the plot's own vertical
                // extent so the title and the footer cannot be mistaken for a
                // tick. Before the fix this region held the gridlines' left ends
                // and NOTHING ELSE - the renderer drew no tick labels at all -
                // so the count is the whole finding.
                //
                // Counted as pixels rather than as bands: at the iPhone SE slot
                // the plot is ~47 pt tall and 0/2/4/6/8 sit 11.7 pt apart, so
                // adjacent numbers merge into one band and a band count
                // under-reports a chart that is correctly labelled. The band
                // count is still asserted, at a threshold that says "more than
                // one number", to keep the shape honest.
                var ink = 0, bands = 0, inBand = false
                for y in axis.top...axis.bottom {
                    var dark = false
                    for x in 0..<max(axis.x - 1, 0) {
                        if (rep.colorAt(x: x, y: y)?.usingColorSpace(.sRGB)?
                                .brightnessComponent ?? 1) < 0.80 { ink += 1; dark = true }
                    }
                    if dark && !inBand { bands += 1 }
                    inBand = dark
                }
                // 20 px is two floored digits. MEASURED over six real p4data
                // charts at each slot: 112 px at the 9.7" landscape, 63 at the
                // portrait, 31 at the iPhone SE - where the axis runs 0..4 and
                // carries two numbers. The pre-fix renderer put ZERO here.
                #expect(ink >= 20,
                        "\(name): only \(ink) dark pixels left of the y axis inside the plot - the axis has no numbers on it, which is what made January read as 8")
                #expect(bands >= 2,
                        "\(name): the ink left of the y axis is \(bands) band(s) - a labelled axis is at least two separate numbers")
                worstBands = min(worstBands, ink)
                measured += 1
            }
            print("LINE \(name): \(measured) charts, fewest px of tick ink left of the axis \(worstBands)")
            #expect(measured > 0)
        }
    }
}
#endif

// =============================================================================

/// **BLOCKER 3b, against every generator the engine ships.**
///
/// `MQDesignTests.TileFitTests` gates the component on a corpus. This gates the
/// CONTENT: the longest option each of the 250 generator refs actually emits,
/// against the tile each of the twelve matrix sizes actually gives it.
@Suite("Every generator's longest option fits its tile", .serialized)
struct QTileOptionGateTests {

    static let engine = try! JSQuestionEngine()

    /// Draws per generator ref. >= 8: the 47-character option is one of four on
    /// a pool-3 item, so a single draw per ref misses it.
    static var draws: Int {
        min(max(8, Int(ProcessInfo.processInfo.environment["MQ_DRAWS"] ?? "") ?? 8), 40)
    }

    @MainActor
    @Test("the longest option of all 250 generators fits at all twelve sizes")
    func longestOptionPerGeneratorFits() async throws {
        QTestFonts.ensure()
        let refs = try await Self.engine.listTopics().allGeneratorRefs
        #expect(refs.count >= 200, "only \(refs.count) generator refs")

        // The longest option each ref emits, and where it came from.
        var longest: [String: String] = [:]
        for ref in refs {
            for i in 0..<Self.draws {
                guard let q = try? await Self.engine.nextQuestion(
                    .generator(ref: ref, level: [1, 2, 3][i % 3])) else { continue }
                for option in q.choiceTexts
                where option.count > (longest[ref]?.count ?? 0) {
                    longest[ref] = option
                }
            }
        }
        let measuredRefs = longest.count
        let worst = longest.max { $0.value.count < $1.value.count }
        print("OPTIONS \(measuredRefs) of \(refs.count) generator refs emit choices; "
              + "longest is \(worst?.value.count ?? 0) chars at \(worst?.key ?? "-"): "
              + "\"\(worst?.value ?? "")\"")
        #expect(measuredRefs > 150,
                "only \(measuredRefs) refs produced any choice text")
        #expect((worst?.value.count ?? 0) >= 40,
                "the longest option in the whole engine is \(worst?.value.count ?? 0) characters - the 47-character p4angles option this gate exists for was not drawn")

        // Measuring SwiftUI's real layout is the expensive half, so it runs once
        // per distinct string rather than once per generator.
        let distinct = Array(Set(longest.values))
        var pairs = 0
        var worstSlack = CGFloat.greatestFiniteMagnitude
        var worstWhere = ""
        for device in QDevices.matrix {
            let m = device.metrics
            let floor = m.isRegular ? MQFigures.iPadTypeFloor : MQFigures.phoneTypeFloor
            for text in distinct {
                // The row the child actually gets for THIS option, growth and
                // all - `QBattleView.geometry` is the app's own arithmetic.
                let g = QBattleView.geometry(m, typed: false, optionLength: text.count)
                let box = CGSize(width: g.tileW, height: g.tileH)
                let innerW = box.width - MQAnswerTile.padH * 2
                let innerH = box.height - MQAnswerTile.padV * 2 - MQAnswerTile.faceLift
                let f = MQAnswerTile.fit(text, base: m.type.tile, box: box, floor: floor)
                #expect(f.fits,
                        "\(device.name): \"\(text.prefix(60))\" (\(text.count) chars) does not fit a \(Int(box.width))x\(Int(box.height)) tile even at the \(floor) pt floor")
                #expect(f.size >= floor)
                #expect(f.lines <= MQAnswerTile.maxLines)
                let laid = Text(MQTypeset.bindUnits(text))
                    .font(.mq(f.size, .extrabold))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                let natural = try #require(MQFit.naturalHeight(laid, width: innerW))
                let slack = innerH - natural
                #expect(slack >= 0,
                        "\(device.name): \"\(text.prefix(60))\" laid out at \(f.size) pt wants \(natural) pt in a \(Int(innerH)) pt tile - it would be clipped or truncated")
                if slack < worstSlack {
                    worstSlack = slack
                    worstWhere = "\(device.name) \"\(text.prefix(28))\" at \(Int(f.size)) pt"
                }
                pairs += 1
            }
        }
        print("OPTIONS \(distinct.count) distinct longest options x \(QDevices.matrix.count) "
              + "sizes = \(pairs) fits, worst slack "
              + "\(String(format: "%.1f", worstSlack)) pt - \(worstWhere)")
    }

    /// The two tile boxes - MQDesign's model of it and MQQuest's real one - have
    /// to be the same box, or `TileFitTests` is measuring a tile nobody draws.
    @Test("MQDesignTests' tile-box model matches QBattleView's own geometry")
    func theTwoTileBoxesAgree() {
        let option = "the angle written in short as \u{2220}b at the point B"
        for device in QDevices.matrix {
            let m = device.metrics
            let g = QBattleView.geometry(m, typed: false, optionLength: option.count)
            let pad: CGFloat = m.isWide ? 26 : (m.isRegular ? 24 : 14)
            let contentW = m.size.width - pad * 2
            var modelH = m.isWide ? min(max(m.size.height * 0.125, 76), 118)
                : (m.isRegular ? 96 : 72)
                    * min(max(m.size.height / (m.isRegular ? 1194 : 852), 0.74), 1.12)
            let modelW = m.isWide ? (contentW - 18 * 3) / 4 : (contentW - 12) / 2
            let floor = m.isRegular ? MQFigures.iPadTypeFloor : MQFigures.phoneTypeFloor
            let need = MQAnswerTile.heightNeeded(option, width: modelW, floor: floor)
            let cap = m.isWide ? min(m.size.height * 0.20, 150)
                               : min(m.size.height * 0.115, 110)
            modelH = min(max(modelH, need), cap)
            #expect(abs(modelW - g.tileW) < 0.01,
                    "\(device.name): the MQDesign model says \(modelW) pt wide, QBattleView draws \(g.tileW)")
            #expect(abs(modelH - g.tileH) < 0.01,
                    "\(device.name): the MQDesign model says \(modelH) pt tall, QBattleView draws \(g.tileH)")
        }
    }
}

// =============================================================================

/// **The figure takes the board's empty half.**
///
/// The rehearsal's fifth parent-list item: the L-shape drew about 85 x 95 px
/// inside a 480 x 250 board whose other 90% was empty parchment. The fix is in
/// `QBattleView.grow`, and this says it actually happened - a short stem gets a
/// materially bigger figure than a long one, at every size in the matrix, and
/// the box never runs away from the glass.
@Suite("A short stem gives its figure the board")
struct QFigureScaleGateTests {

    /// The rehearsal's own stem and a four-line P4 word problem.
    static let shortStem = "What is the perimeter of this figure?"           // 36
    static let longStem =
        "A badge is made of two rectangles that do not overlap. The first rectangle "
        + "is 14 cm long and 9 cm wide, and the second is 11 cm long and 6 cm wide. "
        + "What is the total area of the badge, in cm\u{00B2}?"

    @Test("the figure grows into the room the stem leaves, at every size")
    func theFigureTakesTheBoard() {
        var grew = 0
        for device in QDevices.matrix {
            let m = device.metrics
            let short = QBattleView.geometry(m, typed: false,
                                             stemLength: Self.shortStem.count,
                                             hasFigure: true)
            let long = QBattleView.geometry(m, typed: false,
                                            stemLength: Self.longStem.count,
                                            hasFigure: true)
            let none = QBattleView.geometry(m, typed: false, stemLength: 0,
                                            hasFigure: false)

            // **The two compositions grow in opposite directions, and that is
            // correct.** Stacked, the board is `VStack { stem; figure }` and the
            // figure gets the LINES the stem did not use - so a short stem gets
            // the bigger figure. Side by side it is `HStack { stem; figure }`,
            // the board's height is the taller of the two, and the figure grows
            // down to meet the stem - so a LONG stem gets the bigger figure,
            // because a long stem makes a taller board to grow into. A gate that
            // asserted one rule for both would be asserting the stacked model on
            // a side-by-side screen.
            if none.stackFigure || !m.isWide {
                #expect(short.figureH >= long.figureH,
                        "\(device.name) (stacked): a \(Self.shortStem.count)-character stem gets \(short.figureH) pt of figure and a \(Self.longStem.count)-character one gets \(long.figureH) - the spare lines are not reaching the figure")
            } else {
                #expect(long.figureH >= short.figureH,
                        "\(device.name) (side by side): a \(Self.longStem.count)-character stem makes a taller board and gets \(long.figureH) pt of figure against the short stem's \(short.figureH)")
                // And it never takes width off the stem column, which is what
                // pushed `ipadmini-landscape` 8 pt off the glass.
                #expect(long.figureW == none.figureW && short.figureW == none.figureW,
                        "\(device.name): the side-by-side figure widened from \(none.figureW) to \(max(long.figureW, short.figureW)) pt and took it off the stem")
            }

            let best = max(short.figureH, long.figureH)
            #expect(best >= none.figureH,
                    "\(device.name): the grown figure (\(best) pt) is smaller than the ungrown one (\(none.figureH))")
            // The caps, from the same expressions `grow` uses.
            let hCap = max(none.figureH,
                           m.isWide ? min(m.size.height * 0.20, 190)
                           : (m.isRegular ? min(m.size.height * 0.115, 160)
                                          : min(m.size.height * 0.20, 200)))
            #expect(best <= hCap + 0.01,
                    "\(device.name): the figure is \(best) pt against a \(hCap) pt cap")
            #expect(max(short.figureW, long.figureW) <= m.size.width,
                    "\(device.name): a \(max(short.figureW, long.figureW)) pt figure on a \(m.size.width) pt screen")
            if best > none.figureH + 1 { grew += 1 }
            print("FIGSCALE \(device.name) \(none.stackFigure || !m.isWide ? "stacked   " : "side-by-side"): "
                  + "none \(Int(none.figureH)) pt -> short stem \(Int(short.figureH)) pt "
                  + "-> long stem \(Int(long.figureH)) pt")
        }
        #expect(grew == QDevices.matrix.count,
                "only \(grew) of \(QDevices.matrix.count) sizes give the figure any of the board back - the fix is not reaching the matrix")
    }

    /// The specific number the rehearsal measured: the 9.7" landscape board.
    @Test("the 9.7\" landscape L-shape board is no longer 90% empty")
    func theRehearsalsOwnBoard() {
        let m = MQMetrics.device(CGSize(width: 1024, height: 768))
        let before = QBattleView.geometry(m, typed: false, hasFigure: false)
        let after = QBattleView.geometry(m, typed: false,
                                         stemLength: Self.shortStem.count,
                                         hasFigure: true)
        let ratio = (after.figureW * after.figureH) / (before.figureW * before.figureH)
        print("FIGSCALE ipad97-landscape: \(Int(before.figureW))x\(Int(before.figureH)) -> "
              + "\(Int(after.figureW))x\(Int(after.figureH)), \(String(format: "%.2f", ratio))x the area")
        #expect(ratio >= 1.4,
                "the figure grew only \(ratio)x in area on the board the rehearsal photographed as 90% empty")
    }
}
