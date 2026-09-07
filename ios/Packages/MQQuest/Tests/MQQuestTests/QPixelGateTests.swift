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
                if let bad = m.chips.first(where: { !QUnits.accepts($0, declared: q.unit) }) {
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
    #endif
}
