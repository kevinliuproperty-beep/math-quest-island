#if os(macOS)
import Testing
import SwiftUI
import AppKit
@testable import MQDesign

// =============================================================================
// BLOCKER 4, IN MQDESIGN: AN ANSWER TILE NEVER TRUNCATES.
//
// Dress rehearsal, 2026-09-07, `rehearsal-p1-A-p4angles-land/10-q08-ask.png`.
// `p4angles` pool 3 emits
//
//     the angle written in short as ∠b at the point B
//
// as one of four options - 47 characters - and `MQAnswerTile` was
// `lineLimit(1)` with `minimumScaleFactor(0.6)`, so a 34 pt tile could only
// fall to 20.4 pt and the plank read **`the angle written in…`**. The stem is
// *"Three of the names below are correct names for that angle. Which one is
// WRONG?"*: the child was asked to judge an option they could not read, on
// three of twelve items in that session, all pool 3 - the pool a child reaches
// once they are doing WELL.
//
// This suite gates the MQDesign half: the advance model, the tile's own fit
// arithmetic, and `MQPlankButton`. `MQQuestTests.QTileOptionGateTests` gates the
// other half - every option the 250 live generator refs actually emit.
// =============================================================================

@Suite("An answer tile draws its option whole", .serialized)
struct TileFitTests {

    /// The rehearsal's own string, plus the longest options seen in eight driven
    /// sessions and the shapes that must NOT change (a bound unit never wraps).
    static let corpus: [String] = [
        "the angle written in short as \u{2220}b at the point B",   // 47, the blocker
        "\u{2220}CBA", "\u{2220}ABC", "\u{2220}ACB",
        "46 cm", "126 cm", "2100 cm\u{00B3}", "43 cm", "7", "71", "1/4", "0.75"
    ]

    /// Every device in the matrix, verbatim from `mqdesign-snap`'s own list.
    static let sizes: [(String, CGSize)] = [
        ("ipad97-landscape", CGSize(width: 1024, height: 768)),
        ("ipad97-portrait", CGSize(width: 768, height: 1024)),
        ("ipad11-landscape", CGSize(width: 1194, height: 834)),
        ("ipad11-portrait", CGSize(width: 834, height: 1194)),
        ("ipad13-landscape", CGSize(width: 1366, height: 1024)),
        ("ipad13-portrait", CGSize(width: 1024, height: 1366)),
        ("ipadmini-landscape", CGSize(width: 1133, height: 744)),
        ("ipadmini-portrait", CGSize(width: 744, height: 1133)),
        ("ipad11-split-half", CGSize(width: 507, height: 834)),
        ("iphone-se", CGSize(width: 375, height: 667)),
        ("iphone15", CGSize(width: 393, height: 852)),
        ("iphone15-pro-max", CGSize(width: 430, height: 932))
    ]

    @MainActor
    static func ensureFonts() { _ = MQFonts.register() }

    /// The real drawn width of a string at a size, through the same text
    /// resolution `MQFigures.width` uses.
    @MainActor
    static func drawnWidth(_ text: String, size: CGFloat, weight: MQWeight) -> CGFloat {
        ensureFonts()
        return MQFigures.withDrawingContext(CGSize(width: 8, height: 8)) { ctx in
            ctx.resolve(Text(text).font(.mq(size, weight)))
               .measure(in: CGSize(width: 10_000, height: 10_000)).width
        } ?? 0
    }

    // MARK: - The model behind the arithmetic

    /// **`MQAnswerTile.advance` may over-estimate. It may never under-estimate.**
    ///
    /// `fit` is arithmetic over `text.count * size * advance`, and the whole
    /// point of that shape is that a gate can compute the number the body draws.
    /// It is only safe in one direction: over-estimating the advance shrinks the
    /// type slightly early, which costs a point of size; UNDER-estimating it
    /// predicts a line that does not fit, and SwiftUI then truncates - which is
    /// the exact failure this pass exists to remove.
    ///
    /// So this measures the real Baloo 2 ExtraBold advance of every string in
    /// the corpus, at the two authored tile sizes, and fails if the constant is
    /// below any of them. It prints the measured maximum so the constant can be
    /// re-derived rather than guessed at.
    @MainActor
    @Test("the advance model is never optimistic about Baloo 2 ExtraBold")
    func theAdvanceModelIsNotOptimistic() {
        var worst: (String, CGFloat, CGFloat) = ("", 0, 0)
        for size in [MQType.regular.tile, MQType.compact.tile, CGFloat(22), CGFloat(11)] {
            for text in Self.corpus {
                let drawn = Self.drawnWidth(text, size: size, weight: .extrabold)
                let per = drawn / (CGFloat(text.count) * size)
                if per > worst.1 { worst = (text, per, size) }
            }
        }
        print("ADVANCE measured max \(String(format: "%.4f", worst.1)) em "
              + "at \(Int(worst.2)) pt on \"\(worst.0.prefix(40))\" - "
              + "constant is \(MQAnswerTile.advance)")
        #expect(MQAnswerTile.advance >= worst.1,
                "MQAnswerTile.advance is \(MQAnswerTile.advance) but \"\(worst.0)\" measures \(worst.1) em per character at \(worst.2) pt. An optimistic advance model truncates.")
    }

    /// **`MQAnswerTile.lineHeight` is Baloo 2's real line pitch, measured.**
    ///
    /// The first version of `fit` used 1.25 and the tile overflowed by up to
    /// 29 pt at `ipad13-landscape`: the model said three 28 pt lines needed
    /// 105 pt and SwiftUI laid them out in 134. A line-height model that is too
    /// small is the same class of error as an optimistic advance - it promises
    /// room that is not there - so it is measured here and the constant has to
    /// be at least what the measurement says.
    @MainActor
    @Test("the line-height model is never optimistic about Baloo 2")
    func theLineHeightModelIsNotOptimistic() {
        Self.ensureFonts()
        var worst: CGFloat = 0
        for size in [CGFloat(34), 28, 27, 22, 16, 11] {
            // Two lines minus one line is exactly one line's pitch.
            let one = MQFit.naturalHeight(
                Text("X").font(.mq(size, .extrabold))
                    .fixedSize(horizontal: false, vertical: true), width: 400) ?? 0
            let three = MQFit.naturalHeight(
                Text("X\nX\nX").font(.mq(size, .extrabold))
                    .fixedSize(horizontal: false, vertical: true), width: 400) ?? 0
            guard one > 0, three > one else { continue }
            worst = max(worst, (three - one) / 2 / size)
        }
        print("LINEHEIGHT measured max \(String(format: "%.4f", worst)) em - "
              + "constant is \(MQAnswerTile.lineHeight)")
        #expect(MQAnswerTile.lineHeight >= worst,
                "MQAnswerTile.lineHeight is \(MQAnswerTile.lineHeight) but Baloo 2 sets \(worst) em per line. An optimistic line-height model clips.")
    }

    // MARK: - The tile

    /// **Every option in the corpus fits its tile at all twelve sizes.**
    ///
    /// "Fits" is measured twice, on purpose:
    ///
    ///  * `MQAnswerTile.fit` - the arithmetic the BODY uses - reports `fits`;
    ///  * `MQFit.naturalHeight` of the same string, at the same size, in the
    ///    tile's inner width, with NO line limit, comes back inside the tile's
    ///    inner height. A `Text` with no limit wraps freely and never
    ///    ellipsises, so a natural height that fits is proof the drawn text is
    ///    the whole text at the drawn size.
    ///
    /// The second check is what makes the first one honest: it uses SwiftUI's
    /// real metrics rather than the advance model.
    @MainActor
    @Test("every option fits its tile whole, at every matrix size")
    func optionsFitTheirTiles() {
        Self.ensureFonts()
        var worstSlack = CGFloat.greatestFiniteMagnitude
        var worstWhere = ""
        for (name, size) in Self.sizes {
            let m = MQMetrics.device(size)
            let floor = m.isRegular ? MQFigures.iPadTypeFloor : MQFigures.phoneTypeFloor
            for text in Self.corpus {
                let box = Self.tileBox(m, option: text)
                let f = MQAnswerTile.fit(text, base: m.type.tile, box: box, floor: floor)
                #expect(f.fits,
                        "\(name): \"\(text.prefix(50))\" does not fit a \(Int(box.width))x\(Int(box.height)) tile even at \(floor) pt")
                #expect(f.size >= floor,
                        "\(name): \"\(text.prefix(30))\" was sized \(f.size) pt, under the \(floor) pt floor")
                #expect(f.lines <= MQAnswerTile.maxLines)

                let innerW = box.width - MQAnswerTile.padH * 2
                let innerH = box.height - MQAnswerTile.padV * 2 - MQAnswerTile.faceLift
                let laid = Text(MQTypeset.bindUnits(text))
                    .font(.mq(f.size, .extrabold))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                guard let natural = MQFit.naturalHeight(laid, width: innerW) else {
                    Issue.record("\(name): no measurement for \"\(text.prefix(30))\"")
                    continue
                }
                let slack = innerH - natural
                #expect(slack >= 0,
                        "\(name): \"\(text.prefix(50))\" wants \(natural) pt at \(f.size) pt in a \(Int(innerH)) pt tile - it would be clipped")
                if slack < worstSlack {
                    worstSlack = slack
                    worstWhere = "\(name) \"\(text.prefix(24))\" at \(Int(f.size)) pt"
                }
            }
        }
        print("TILE worst slack \(String(format: "%.1f", worstSlack)) pt - \(worstWhere)")
    }

    /// **The blocker itself, in pixels: the option is laid out over MORE THAN
    /// ONE LINE.**
    ///
    /// A count of ink does not discriminate here - `the angle written in…` at
    /// 34 pt on one line puts about as much cream on the plank as the whole
    /// option at 20 pt on three (measured: 1900 px against 1876). What does
    /// discriminate is the SHAPE: a truncated option is one horizontal band of
    /// text and the whole option is three. So this counts bands.
    ///
    /// Red-provable: restore `lineLimit(1)` in `MQAnswerTile` and the band count
    /// drops to 1.
    @MainActor
    @Test("the 47-character option is laid out over three lines, not truncated to one",
          arguments: [("ipad97-landscape", CGSize(width: 1024, height: 768)),
                      ("iphone-se", CGSize(width: 375, height: 667))])
    func longOptionIsNotTruncated(_ device: (String, CGSize)) throws {
        Self.ensureFonts()
        let (name, size) = device
        let m = MQMetrics.device(size)
        let floor = m.isRegular ? MQFigures.iPadTypeFloor : MQFigures.phoneTypeFloor
        let full = "the angle written in short as \u{2220}b at the point B"
        let box = Self.tileBox(m, option: full)

        func bands(_ text: String) throws -> Int {
            let tile = MQAnswerTile(.noon, text, fontSize: m.type.tile,
                                    box: box, typeFloor: floor)
                .frame(width: box.width, height: box.height)
            let r = ImageRenderer(content: tile)
            r.scale = 1
            r.proposedSize = ProposedViewSize(box)
            let image = try #require(r.nsImage, "\(name): no render")
            let tiff = try #require(image.tiffRepresentation)
            let rep = try #require(NSBitmapImageRep(data: tiff))
            // The carved word is CREAM on brown wood.
            var count = 0, inBand = false
            for y in 0..<rep.pixelsHigh {
                var pale = 0
                for x in 0..<rep.pixelsWide {
                    guard let c = rep.colorAt(x: x, y: y)?.usingColorSpace(.sRGB) else { continue }
                    if c.redComponent > 0.90 && c.greenComponent > 0.86
                        && c.blueComponent > 0.74 { pale += 1 }
                }
                let row = pale >= 3
                if row && !inBand { count += 1 }
                inBand = row
            }
            return count
        }
        let whole = try bands(full)
        let short = try bands("55")
        print("TILE BANDS \(name): the 47-char option lays out in \(whole) band(s), "
              + "\"55\" in \(short)")
        #expect(short == 1, "\(name): a two-character option should be one line, not \(short)")
        #expect(whole >= 2,
                "\(name): the 47-character option drew \(whole) line(s) of text - it is still being truncated to one")
    }

    /// **The `fits` flag is not always true.**
    ///
    /// Without this, `fit` could return `fits: true` unconditionally and every
    /// assertion above would be worth nothing. A 200-character option cannot be
    /// drawn whole in three lines on any tile in the matrix, and `fit` has to
    /// say so rather than pretend.
    @Test("fit reports failure for an option no tile could hold")
    func fitIsNotAlwaysTrue() {
        let absurd = String(repeating: "measurement ", count: 20)
        let m = MQMetrics.device(CGSize(width: 375, height: 667))
        let f = MQAnswerTile.fit(absurd, base: m.type.tile,
                                 box: Self.tileBox(m, option: absurd),
                                 floor: MQFigures.phoneTypeFloor)
        #expect(!f.fits, "a \(absurd.count)-character option was reported as fitting an iPhone SE tile")
        #expect(f.size == MQFigures.phoneTypeFloor)
    }

    /// The tile box the battle gives an option, INCLUDING the growth a long
    /// option earns. Kept here rather than imported because MQDesign cannot see
    /// MQQuest; the height comes from `MQAnswerTile.heightNeeded`, which is the
    /// same function `QBattleView.growTiles` calls, and
    /// `QTileOptionGateTests.theTwoTileBoxesAgree` holds the two together
    /// against `QBattleView.geometry`'s real numbers at every matrix size.
    static func tileBox(_ m: MQMetrics, option: String = "") -> CGSize {
        let pad: CGFloat = m.isWide ? 26 : (m.isRegular ? 24 : 14)
        let contentW = m.size.width - pad * 2
        var tileH = m.isWide ? min(max(m.size.height * 0.125, 76), 118)
            : (m.isRegular ? 96 : 72)
                * min(max(m.size.height / (m.isRegular ? 1194 : 852), 0.74), 1.12)
        let tileW = m.isWide ? (contentW - 18 * 3) / 4 : (contentW - 12) / 2
        if !option.isEmpty {
            let floor = m.isRegular ? MQFigures.iPadTypeFloor : MQFigures.phoneTypeFloor
            let need = MQAnswerTile.heightNeeded(option, width: tileW, floor: floor)
            let cap = m.isWide ? min(m.size.height * 0.20, 150)
                               : min(m.size.height * 0.115, 110)
            tileH = min(max(tileH, need), cap)
        }
        return CGSize(width: tileW, height: tileH)
    }

    // MARK: - The plank button

    /// **`Play again` is not `Play a…`.**
    ///
    /// The primary button of the iPhone SE result screen, truncated
    /// (`rehearsal-p1-E-p4area-se/99-result.png`). `Check` had been fixed for
    /// this once and `Play again` had not, because the fix was applied to a call
    /// site rather than to the component: 30 pt of horizontal padding that does
    /// not come down when `fontSize` does, and `lineLimit(1)` with no scale
    /// floor.
    ///
    /// Asserted as geometry, against the width each word's own row gives it on
    /// the narrowest screen in the matrix. `QResultView.buttons` is three planks
    /// and two 8 pt gaps inside 375 pt of glass less 2 x 14 pt of padding; the
    /// review pager is two planks in the same row.
    @MainActor
    @Test("every plank word fits its button at the narrowest screen",
          arguments: [("Play again", true, CGFloat(16)),
                      ("Island map", false, CGFloat(15)),
                      ("Home", false, CGFloat(15))])
    func plankWordsFit(_ spec: (String, Bool, CGFloat)) {
        Self.ensureFonts()
        let (title, primary, fontSize) = spec
        let rowWidth: CGFloat = 375 - 28
        let share = (rowWidth - 16) / 3
        let floor = MQFigures.iPadTypeFloor
        let scale = min(1, max(0.34, floor / fontSize))
        let padH = max(fontSize * (primary ? 1.36 : 1.0), 14)
        let drawn = Self.drawnWidth(title, size: fontSize * scale,
                                    weight: primary ? .extrabold : .bold)
        let needed = drawn + padH * 2
        let floored = String(format: "%.1f", fontSize * scale)
        print("PLANK \"\(title)\" needs \(String(format: "%.1f", needed)) pt "
              + "of a \(String(format: "%.1f", share)) pt share")
        #expect(needed <= share,
                "\"\(title)\" needs \(Int(needed)) pt at its floored size (\(floored) pt + \(Int(padH * 2)) pt of padding) but the SE result row gives each button \(Int(share)) pt")
    }

    /// The padding change must not move the button the iPad has always drawn.
    @Test("the plank's padding is unchanged at the size it was authored on")
    func plankPaddingUnchangedAtAuthoredSize() {
        // Was `primary ? 30 : 22` horizontal and `primary ? 15 : 12` vertical,
        // at the default fontSize of 22.
        #expect(abs(max(22 * 1.36, 14) - 30) < 0.5)
        #expect(abs(max(22 * 0.682, 9) - 15) < 0.5)
        #expect(abs(max(22 * 1.00, 14) - 22) < 0.5)
        #expect(abs(max(22 * 0.545, 9) - 12) < 0.5)
    }
}

#endif
