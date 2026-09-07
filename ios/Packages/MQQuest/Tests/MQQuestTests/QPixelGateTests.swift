import Testing
import SwiftUI
import Foundation
import MQContent
import MQDesign
import MQEngineJS
@testable import MQQuest
#if canImport(AppKit)
import AppKit
#endif

// =============================================================================
// THE PIXEL GATE, AND WHY THE LAYOUT GATE WAS NOT ENOUGH
//
// `MQFit.slack` measures a view's NATURAL height under an unbounded height
// proposal and compares it to the device. It is the phase-1 lane's overflow gate
// and it caught two real overflows there.
//
// It is BLIND to this one. Measured on Kai at this commit: a result screen with
// three real P4 review rows reports POSITIVE slack at 1024x768 and, rendered at
// that exact size, has its title cut off the top and its buttons cut off the
// bottom. The reason is that the content lives inside `MQScroll`, a fixed-size
// container that does not clip: under an unbounded proposal the parent's measured
// height stays small while the ink runs outside the frame. A layout measurement
// cannot see ink.
//
// So this suite asserts on PIXELS. It renders the screen at the device size and
// looks for the primary button's gold in the bottom band - the cheapest possible
// question that a layout measurement cannot answer: "is the button on the glass?"
// =============================================================================

@Suite("The buttons are on the glass, in pixels", .serialized)
struct QPixelGateTests {

    static let engine = try! JSQuestionEngine()

    static let sizes: [(String, CGSize)] = [
        ("ipad97-landscape", CGSize(width: 1024, height: 768)),
        ("ipad97-portrait", CGSize(width: 768, height: 1024)),
        ("iphone-se", CGSize(width: 375, height: 667))
    ]

    #if canImport(AppKit)
    @MainActor
    static func bitmap(_ view: some View, size: CGSize) -> NSBitmapImageRep? {
        let r = ImageRenderer(content: view.frame(width: size.width, height: size.height))
        r.scale = 1
        r.proposedSize = ProposedViewSize(size)
        guard let image = r.nsImage, let tiff = image.tiffRepresentation else { return nil }
        return NSBitmapImageRep(data: tiff)
    }

    /// `MQPalette.noon.gold` is `#EFA22C` and the primary plank is a gradient
    /// through it. Nothing else on the result screen is that colour: the sand is
    /// far paler, the wood far browner.
    static func isButtonGold(_ c: NSColor) -> Bool {
        guard let rgb = c.usingColorSpace(.sRGB) else { return false }
        let r = rgb.redComponent * 255, g = rgb.greenComponent * 255, b = rgb.blueComponent * 255
        return r > 205 && r < 256 && g > 125 && g < 200 && b < 95
    }

    @MainActor
    static func goldPixels(_ rep: NSBitmapImageRep, in band: CGRect) -> Int {
        var count = 0
        let x0 = max(0, Int(band.minX)), x1 = min(rep.pixelsWide, Int(band.maxX))
        let y0 = max(0, Int(band.minY)), y1 = min(rep.pixelsHigh, Int(band.maxY))
        var y = y0
        while y < y1 {
            var x = x0
            while x < x1 {
                if let c = rep.colorAt(x: x, y: y), isButtonGold(c) { count += 1 }
                x += 3            // every third pixel: a 44 pt button is thousands
            }
            y += 3
        }
        return count
    }
    #endif

    /// A result screen whose review is as tall as this app can make it: every
    /// item wrong on the UNIT, so every row carries the teaching sentence.
    @MainActor
    static func worstCaseResult() async throws -> QQuestModel {
        QTestFonts.ensure()
        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let m = QQuestModel(source: Self.engine, store: store,
                            random: QFixedRandom([0]), setSize: 6)
        await m.load()
        await m.pick(try #require(m.profiles.first))
        await m.open(try #require(m.island?.nodes.first { $0.topicID == "p4area" }))
        var guardRail = 0
        while m.phase == .asking, guardRail < 12 {
            guardRail += 1
            guard let q = m.question else { break }
            if q.isTyped {
                for ch in QDriver.correctTypedText(q) {
                    if let d = Int(String(ch)) { m.press(.digit(d)) }
                }
                if let bad = m.chips.first(where: { !QUnits.accepts($0, question: q) }) {
                    m.toggleChip(bad)
                }
                await m.submitTyped()
            } else {
                await m.choose((q.correctIndex + 1) % max(q.choices.count, 1))
            }
            await m.advance()
        }
        return m
    }

    /// **The gate the screen-level fit test cannot be.**
    ///
    /// `MQScroll` has a fixed height and does not clip, so a review list taller
    /// than its plank draws OUTSIDE it and the parent's measured height never
    /// moves. Measuring the screen therefore cannot see the overflow; measuring
    /// the LIST, at the width the layout gives it, against the height the layout
    /// gives it, can.
    @MainActor
    @Test("the review list fits inside the scroll it is drawn in")
    func reviewListFitsItsPlank() async throws {
        let m = try await Self.worstCaseResult()
        let items = try #require(m.summary?.review)
        #expect(items.count >= 2)
        for (name, size) in Self.sizes {
            let metrics = MQMetrics.device(size)
            let width = QResultView.reviewColumnWidth(metrics)
            let budget = QResultView.reviewInnerHeight(metrics)
            let list = QResultView.reviewListView(.noon, items: items, metrics: metrics)
            let natural = try #require(MQFit.naturalHeight(list, width: width),
                                       "\(name): the review list produced no image")
            #expect(natural <= budget,
                    "\(name): the review list wants \(natural) pt in a \(budget) pt plank")
        }
    }

    #if canImport(AppKit)
    @MainActor
    @Test("the result screen's Play again button is inside the frame at every size")
    func buttonsOnGlass() async throws {
        let m = try await Self.worstCaseResult()
        #expect(m.phase == .result)
        #expect((m.summary?.review.count ?? 0) >= 2)
        for (name, size) in Self.sizes {
            let rep = try #require(Self.bitmap(QResultView(model: m,
                                                           metrics: MQMetrics.device(size)),
                                               size: size),
                                   "no render for \(name)")
            let h = QResultView.buttonSize(MQMetrics.device(size), primary: true)
            // NSBitmapImageRep's origin is TOP-left for a bitmap made this way,
            // so the bottom band is the last `h + 12` rows.
            let band = CGRect(x: 0, y: size.height - h - 12, width: size.width, height: h + 12)
            let gold = Self.goldPixels(rep, in: band)
            #expect(gold > 200,
                    "\(name): only \(gold) gold pixels in the bottom \(Int(h) + 12) pt - the Play again button is off the glass")
        }
    }

    /// The other end of the same failure: a screen that overflows downward pushes
    /// its title off the TOP.
    @MainActor
    @Test("the result screen's title is inside the frame at every size")
    func titleOnGlass() async throws {
        let m = try await Self.worstCaseResult()
        for (name, size) in Self.sizes {
            let metrics = MQMetrics.device(size)
            let rep = try #require(Self.bitmap(QResultView(model: m, metrics: metrics),
                                               size: size))
            // The title is set in `p.gold` too, and it sits in the top 90 pt.
            let band = CGRect(x: 0, y: 0, width: size.width, height: 92)
            let gold = Self.goldPixels(rep, in: band)
            #expect(gold > 60,
                    "\(name): only \(gold) gold pixels in the top 92 pt - the title has been pushed off")
        }
    }

    /// **K4, in pixels: a nine-wrong session renders nine review entries.**
    ///
    /// Not "the model has nine" - the SCREEN. Every page is rendered at the size,
    /// every page's rows are the rows the child sees on it, and every row that
    /// carries a figure renders that figure into a real (non-blank) image. The
    /// 9.7" portrait and the SE are the two sizes that showed ONE row.
    @MainActor
    @Test("a nine-wrong session renders nine review entries across its pages",
          arguments: [("ipad97-portrait", CGSize(width: 768, height: 1024)),
                      ("iphone-se", CGSize(width: 375, height: 667))])
    func nineWrongRenderAcrossPages(_ device: (String, CGSize)) async throws {
        let (name, size) = device
        QTestFonts.ensure()
        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        // p4data is the topic whose review rows carry a FIGURE, which is the half
        // `MQReviewItem` could not represent at all.
        let m = QQuestModel(source: Self.engine, store: store,
                            random: QFixedRandom([0]), setSize: 9)
        await m.load()
        await m.pick(try #require(m.profiles.first))
        await m.open(try #require(m.island?.nodes.first { $0.topicID == "p4data" }))
        var guardRail = 0
        while m.phase == .asking, guardRail < 12 {
            guardRail += 1
            guard let q = m.question else { break }
            if q.isTyped {
                for ch in QDriver.wrongTypedText(QDriver.correctTypedText(q)) {
                    if let d = Int(String(ch)) { m.press(.digit(d)) }
                }
                await m.submitTyped()
            } else {
                await m.choose((q.correctIndex + 1) % max(q.choices.count, 1))
            }
            await m.advance()
        }
        #expect(m.phase == .result)
        let review = try #require(m.summary?.review)
        #expect(review.count == 9, "\(name): \(review.count) wrong, wanted 9")

        let metrics = MQMetrics.device(size)
        let rows = QResultView.reviewRows(metrics)
        let pages = QResultView.pageCount(review, rows: rows)
        var rendered = 0
        var withFigures = 0
        for page in 0..<pages {
            m.showReviewPage(page, rows: rows)
            let slice = QResultView.pageSlice(review, page: page, rows: rows)
            rendered += slice.count
            for item in slice where item.question.figure != nil {
                let box = CGSize(width: metrics.isRegular ? 108 : 86,
                                 height: metrics.isRegular ? 70 : 62)
                let png = try #require(QDriver.png(
                    QFigureView(.noon, item.question.figure!,
                                fallbackText: item.question.extraText,
                                typeFloor: metrics.isRegular
                                    ? QFigureView.iPadTypeFloor : QFigureView.phoneTypeFloor)
                        .frame(width: box.width, height: box.height),
                    size: box, scale: 1))
                #expect(png.count > 900,
                        "\(name): review row \(item.id) rendered a blank figure")
                withFigures += 1
            }
            // And the whole screen still renders with its buttons on the glass.
            let rep = try #require(Self.bitmap(QResultView(model: m, metrics: metrics),
                                               size: size),
                                   "\(name): page \(page + 1) produced no render")
            let h = QResultView.buttonSize(metrics, primary: true)
            let band = CGRect(x: 0, y: size.height - h - 12,
                              width: size.width, height: h + 12)
            #expect(Self.goldPixels(rep, in: band) > 200,
                    "\(name): the Play again button is off the glass on review page \(page + 1)")
        }
        #expect(rendered == 9,
                "\(name): \(pages) page(s) x \(rows) row(s) rendered \(rendered) of 9 wrong items")
        #expect(withFigures >= 1, "\(name): p4data rows carried no figure at all")
    }

    /// **K5: no figure label is set below the floor, and none is drawn outside the
    /// figure's own box.**
    ///
    /// The `p4data` table header measured 5.1 pt on the battle board and
    /// "Tuesday" ran through the column rule into "Wednesday"; the pie's caption
    /// was set at 4.6 pt and drawn onto the signboard's wooden bottom rail. A
    /// `Canvas` has a fixed frame, so `MQFit.slack` is structurally blind to both.
    /// This renders the figure at the board's own slot size onto a WHITE ground
    /// with a coloured margin around it, and asserts (a) the type is legible and
    /// (b) no ink lands in the margin.
    @MainActor
    @Test("figure labels clear the type floor and stay inside the figure's box",
          arguments: ["p4data", "p4pie"])
    func figureLabelsAreLegibleAndInside(_ topic: String) async throws {
        QTestFonts.ensure()
        for (name, size) in Self.sizes {
            let metrics = MQMetrics.device(size)
            let floor = metrics.isRegular ? QFigureView.iPadTypeFloor
                                          : QFigureView.phoneTypeFloor
            let battle = QBattleView.geometry(metrics, typed: false)
            let box = CGSize(width: battle.figureW.rounded(.up),
                             height: battle.figureH.rounded(.up))

            var drawn = 0
            for _ in 0..<24 where drawn < 4 {
                let q = try await Self.engine.nextQuestion(.pool(topic: topic, level: 1))
                guard let f = q.figure, f.isDrawable else { continue }
                drawn += 1
                // A 6 pt margin of pure ground around the figure. Anything the
                // renderer draws outside its own box lands in it.
                let margin: CGFloat = 6
                let framed = QFigureView(.noon, f, fallbackText: q.extraText,
                                         typeFloor: floor)
                    .frame(width: box.width, height: box.height)
                    .padding(margin)
                    .background(Color.white)
                let outer = CGSize(width: box.width + margin * 2,
                                   height: box.height + margin * 2)
                let rep = try #require(Self.bitmap(framed, size: outer),
                                       "\(name)/\(topic): no render")
                var strayed = 0
                for y in stride(from: 0, to: rep.pixelsHigh, by: 1) {
                    for x in stride(from: 0, to: rep.pixelsWide, by: 1) {
                        let inBox = CGFloat(x) >= margin - 1
                            && CGFloat(x) <= outer.width - margin + 1
                            && CGFloat(y) >= margin - 1
                            && CGFloat(y) <= outer.height - margin + 1
                        if inBox { continue }
                        guard let c = rep.colorAt(x: x, y: y)?
                            .usingColorSpace(.sRGB) else { continue }
                        // Anything appreciably darker than the white ground.
                        if c.redComponent < 0.86 || c.greenComponent < 0.86
                            || c.blueComponent < 0.86 { strayed += 1 }
                    }
                }
                #expect(strayed == 0,
                        "\(name)/\(topic): \(strayed) pixel(s) of figure ink outside a \(Int(box.width))x\(Int(box.height)) box")
            }
            #expect(drawn > 0, "\(topic) produced no drawable figure")
        }
    }
    /// **The floor is not decoration: it changes what is drawn.**
    ///
    /// At the battle board's figure slot `k = min(1, max(0.46, h/150))` is well
    /// under 1, so the nominal `11 * k` header is 5-9 pt and the floor binds. Two
    /// renders of the same figure, one at the shipped floor and one at 3 pt, must
    /// differ by a lot of ink - which is the measurable form of "the type got
    /// bigger". Red-provable: set the floor to 3 in the source and this goes red.
    @MainActor
    @Test("the type floor binds at the battle slot and puts more ink on the board",
          arguments: ["p4data", "p4pie"])
    func floorBinds(_ topic: String) async throws {
        QTestFonts.ensure()
        let metrics = MQMetrics.device(CGSize(width: 1024, height: 768))
        let battle = QBattleView.geometry(metrics, typed: false)
        let box = CGSize(width: battle.figureW.rounded(.up),
                         height: battle.figureH.rounded(.up))
        #expect(QFigureView.k(box) * 11 < QFigureView.iPadTypeFloor,
                "the nominal header size is already at the floor; this gate proves nothing")

        var measured = 0
        for _ in 0..<24 where measured < 2 {
            let q = try await Self.engine.nextQuestion(.pool(topic: topic, level: 1))
            guard let f = q.figure, f.isDrawable else { continue }
            measured += 1
            func ink(_ floor: CGFloat) throws -> Int {
                let rep = try #require(Self.bitmap(
                    QFigureView(.noon, f, fallbackText: q.extraText, typeFloor: floor)
                        .frame(width: box.width, height: box.height)
                        .background(Color.white),
                    size: box))
                var dark = 0
                for y in 0..<rep.pixelsHigh {
                    for x in 0..<rep.pixelsWide {
                        guard let c = rep.colorAt(x: x, y: y)?
                            .usingColorSpace(.sRGB) else { continue }
                        if c.brightnessComponent < 0.55 { dark += 1 }
                    }
                }
                return dark
            }
            let floored = try ink(QFigureView.iPadTypeFloor)
            let tiny = try ink(3)
            #expect(floored > tiny,
                    "\(topic): the floor changed nothing - \(floored) vs \(tiny) dark pixels")
        }
        #expect(measured > 0)
    }
    #endif

    /// The floor itself, asserted where the callers set it, so a screen that
    /// forgets to pass one is a red test rather than 5 pt type.
    @Test("the figure type floor is 11 pt on an iPad and 10 on a phone")
    func typeFloorConstants() {
        #expect(QFigureView.iPadTypeFloor >= 11)
        #expect(QFigureView.phoneTypeFloor >= 10)
    }
}
