#if os(macOS)
import Testing
import SwiftUI
import AppKit
@testable import MQDesign

/// The bundled face has to RESOLVE, not merely register.
///
/// This is the failure the design lane called out and it is worth a test rather
/// than only a tool check: if `Baloo2-SemiBold` silently falls back to the
/// system font, every render still succeeds, every snapshot still looks fine at
/// a glance, and the app quietly goes back to speaking in the platform's own toy
/// voice -- which is the single loudest thing the rework existed to remove.
@Suite("Bundled fonts register and resolve")
struct FontTests {

    @Test("Registration reports nothing missing")
    func registers() {
        #expect(MQFonts.register().isEmpty)
    }

    @Test("Registration is idempotent")
    func idempotent() {
        MQFonts.register()
        #expect(MQFonts.register().isEmpty)
    }

    @Test("Every weight the design speaks about resolves to Baloo, not to SF",
          arguments: [MQWeight.regular, .medium, .semibold, .bold, .extrabold])
    func facesResolve(_ w: MQWeight) {
        MQFonts.register()
        #expect(MQFonts.resolves(w.face), "\(w.face) fell back to the system font")
    }

    @Test("A face that does not exist is reported as not resolving")
    func negativeControl() {
        // Without this the resolver could return true for everything and the
        // three tests above would be worth nothing.
        #expect(MQFonts.resolves("Baloo2-NoSuchWeight") == false)
    }
}

/// Every component renders, and renders INSIDE the box it is given.
///
/// The unconstrained-height render is the same measurement the matrix gate
/// makes on whole screens, applied one component at a time. A `Shape` in SwiftUI
/// is greedy in both axes -- the design lane lost a whole question card to that
/// once -- so "it drew something" is not the assertion. The assertion is that
/// what it drew is not taller than the room it was given.
@MainActor
@Suite("Components render without overflowing")
struct ComponentRenderTests {

    init() { _ = NSApplication.shared; MQFonts.register() }

    /// Renders `view` at `width` with height unconstrained and returns what it
    /// wanted. Nil means ImageRenderer produced nothing at all, which is a
    /// failure in itself.
    func height(_ view: some View, width: CGFloat) -> CGFloat? {
        MQFit.naturalHeight(view, width: width)
    }

    func fits(_ view: some View, width: CGFloat, allowed: CGFloat) -> Bool {
        guard let h = height(view, width: width) else { return false }
        return h <= allowed + 1
    }

    @Test("The signboard is sized to its content, not to its slot")
    func signIsContentSized() throws {
        let short = MQSign(.noon) { MQQuestionText(.noon, "What is 3.6 x 100?", size: 34) }
        let long = MQSign(.noon) {
            MQQuestionText(.noon,
                           "A ribbon 2.4 m long is cut into 8 equal pieces. "
                           + "How long is each piece?", size: 34)
        }
        let a = try #require(height(short, width: 560))
        let b = try #require(height(long, width: 560))
        #expect(b > a, "a longer question must make a taller board")
        #expect(a > 46, "the posts alone are 46 pt; the board cannot be shorter")
    }

    @Test("The figure slot is pinned, not greedy", arguments: [
        MQFigure.rect(long: "14 cm", wide: "9 cm", ratio: 14.0 / 9.0),
        MQFigure.fractionBar(parts: 5, filled: 3)
    ])
    func figureIsPinned(_ f: MQFigure) {
        let view = MQFigureView(.noon, f).frame(width: 190, height: 130)
        #expect(fits(view, width: 190, allowed: 130))
    }

    @Test("An answer tile stays in its frame at every type size",
          arguments: [MQType.compact.tile, MQType.regular.tile])
    func answerTile(_ size: CGFloat) {
        let view = MQAnswerTile(.noon, "126 cm", tilt: -1.1, fontSize: size)
            .frame(width: 220, height: 96)
        #expect(fits(view, width: 220, allowed: 96))
    }

    @Test("Chrome renders inside its frame")
    func chrome() {
        #expect(fits(MQKnob(.noon, .pause, size: 54), width: 54, allowed: 54))
        // A gauge's `height` is the BAR's height; the readout plank beside it
        // is deliberately a little taller, so the ceiling is the bar plus the
        // plank's overhang and not the bar alone.
        #expect(fits(MQGauge(.noon, value: 0.6, readout: "60", side: .hero, height: 28)
                        .frame(width: 240), width: 240, allowed: 28 * 1.5))
        #expect(fits(MQLantern(.noon, streak: 7, size: 58), width: 58, allowed: 58))
        #expect(fits(MQCrystalRope(.noon, filled: 3, total: 6, shell: 32)
                        .frame(width: 270, height: 52), width: 270, allowed: 52))
        // Given the width it actually asks for -- glass plus a 35 pt numeral --
        // the hourglass is exactly as tall as its `size`. Given only the glass's
        // width it is FOUR TIMES that, because "2:47" then breaks between
        // characters and stacks four lines. Recorded because it is a real trap
        // for the Patchwerk lane: this component must never be put in a column
        // narrower than about 140 pt.
        #expect(fits(MQHourglass(.noon, time: "2:47", fraction: 0.9, size: 56),
                     width: 150, allowed: 56 * 1.25))
    }

    @Test("Every creature renders inside its declared box",
          arguments: MQCast.allCases)
    func creatures(_ cast: MQCast) {
        let box = MQCreature.box(cast)
        let w: CGFloat = 200
        let h = w * box.height / box.width
        #expect(fits(MQCreature(cast, .noon).frame(width: w, height: h),
                     width: w, allowed: h),
                "\(cast.species) overflows its own box")
    }

    @Test("A hero token stays inside its diameter plus its plank",
          arguments: [CGFloat(124), CGFloat(186)])
    func heroToken(_ d: CGFloat) throws {
        let view = MQHeroToken(.noon, profile: MQEntranceScene.sample.profiles[0],
                               diameter: d, compact: d < 150)
        let h = try #require(height(view, width: d * 1.6))
        // Disc plus name plank plus crystal line. Generous ceiling: the test is
        // that it is BOUNDED, since an unpinned Canvas would run to the
        // proposal's limit.
        #expect(h > d && h < d * 1.9)
    }

    @Test("A map marker's post clears the tap floor at every scale the app uses")
    func markerTapFloor() {
        for m in MatrixSizes.all.map({ MQMetrics.device($0.1) }) {
            let s = MQMapScreen.markerScale(m)
            let box = MQMapMarker.hitBox(scale: s)
            #expect(box.width >= MQTap.min - 0.5,
                    "marker post is \(box.width) pt wide at scale \(s)")
        }
    }
}

/// The screen-level gate, in the suite rather than only in the tool.
///
/// `test.command` is what runs on every commit; `mqdesign-snap` is what a human
/// runs when they want pictures. The overflow and tap-floor rules are laws, so
/// they belong in the thing that always runs. The tool still renders the PNGs
/// and prints the table.
/// The matrix, at file scope and NOT main-actor isolated: `@Test(arguments:)`
/// evaluates its argument list outside the suite's isolation, so a `static let`
/// on a `@MainActor` suite cannot be used there.
enum MatrixSizes {
    static let all: [(String, CGSize, MQInsets)] = [
        ("ipad97-landscape", CGSize(width: 1024, height: 768), MQInsets(top: 20, bottom: 0)),
        ("ipad97-portrait", CGSize(width: 768, height: 1024), MQInsets(top: 20, bottom: 0)),
        ("ipad11-landscape", CGSize(width: 1194, height: 834), MQInsets(top: 24, bottom: 20)),
        ("ipad11-portrait", CGSize(width: 834, height: 1194), MQInsets(top: 24, bottom: 20)),
        ("ipad13-landscape", CGSize(width: 1366, height: 1024), MQInsets(top: 24, bottom: 20)),
        ("ipad13-portrait", CGSize(width: 1024, height: 1366), MQInsets(top: 24, bottom: 20)),
        ("ipadmini-landscape", CGSize(width: 1133, height: 744), MQInsets(top: 24, bottom: 20)),
        ("ipadmini-portrait", CGSize(width: 744, height: 1133), MQInsets(top: 24, bottom: 20)),
        ("ipad11-split-half", CGSize(width: 507, height: 834), MQInsets(top: 24, bottom: 20)),
        ("iphone-se", CGSize(width: 375, height: 667), MQInsets(top: 20, bottom: 0)),
        ("iphone15", CGSize(width: 393, height: 852), MQInsets(top: 59, bottom: 34)),
        ("iphone15-pro-max", CGSize(width: 430, height: 932), MQInsets(top: 59, bottom: 34))
    ]

    /// The battle line only exists in landscape.
    static let landscape = all.filter { $0.1.width > $0.1.height }
}

@MainActor
@Suite("Every screen fits every device in the matrix")
struct ScreenMatrixTests {

    init() { _ = NSApplication.shared; MQFonts.register() }

    func metrics(_ d: (String, CGSize, MQInsets)) -> MQMetrics {
        MQMetrics.device(d.1, insets: d.2)
    }

    /// Nothing in this app scrolls, so content taller than the device is content
    /// a child never sees.
    @Test("No screen overflows", arguments: MatrixSizes.all)
    func noOverflow(_ d: (name: String, size: CGSize, insets: MQInsets)) throws {
        let m = metrics(d)
        let screens: [(String, AnyView)] = [
            ("entrance", AnyView(MQEntranceScreen(metrics: m))),
            ("map", AnyView(MQMapScreen(metrics: m))),
            ("battle", AnyView(MQBattleScreen(metrics: m, palette: .noon))),
            ("result", AnyView(MQResultScreen(metrics: m))),
            ("patchwerk", AnyView(MQPatchwerkScreen(scene: .sample, metrics: m))),
            ("patchwerk-enrage", AnyView(MQPatchwerkScreen(scene: .enraged, metrics: m))),
            ("battle-dusk", AnyView(MQBattleScreen(metrics: m, palette: .dusk)))
        ]
        for (key, view) in screens {
            let slack = try #require(MQFit.slack(view, in: d.size),
                                     "\(d.name)/\(key) produced no render")
            #expect(slack >= -0.5,
                    "\(d.name)/\(key) overflows by \(-slack) pt")
        }
    }

    @Test("Every tap target clears 44 pt", arguments: MatrixSizes.all)
    func tapFloor(_ d: (name: String, size: CGSize, insets: MQInsets)) {
        let m = metrics(d)
        let all: [(String, [MQTapTarget])] = [
            ("entrance", MQEntranceScreen.tapTargets(m)),
            ("map", MQMapScreen.tapTargets(m)),
            ("battle", MQBattleScreen.tapTargets(m)),
            ("result", MQResultScreen.tapTargets(m)),
            ("patchwerk", MQPatchwerkScreen.tapTargets(m))
        ]
        for (key, targets) in all {
            #expect(!targets.isEmpty, "\(key) declares no tap targets")
            for t in targets {
                #expect(t.clearsFloor,
                        "\(d.name)/\(key)/\(t.name) is \(t.least) pt on its least dimension")
            }
        }
    }

    /// **The battle fix, as an invariant rather than as a screenshot.** A
    /// creature may stand in front of the board's wooden frame; it may never
    /// stand on the parchment, because that is where the words are.
    @Test("The cast never crosses onto the parchment",
          arguments: MatrixSizes.landscape)
    func castStaysOffTheParchment(_ d: (name: String, size: CGSize, insets: MQInsets)) {
        let m = metrics(d)
        let g = MQBattleScreen.geometry(m)
        let overhang = (g.castW * 2 + g.signW - g.contentW) / 2
        #expect(overhang <= MQBoard.frameInset + 0.5,
                "\(d.name): each creature overlaps the board by \(overhang) pt, past its \(MQBoard.frameInset) pt wooden frame")
        #expect(g.signW >= MQBattleScreen.signMinWidth - 0.5)
        #expect(g.castW >= 150)
    }
}

// =============================================================================

/// **THE WORLD PAINTS EVERY PIXEL IT IS GIVEN.**
///
/// A screen that leaves a hole in its own background is not a cosmetic problem:
/// a transparent band is invisible on a white page and reads as a DARK LINE the
/// moment it is composited on anything else - a dark viewer, a contact sheet, the
/// iPad scrolling it under a finger.
///
/// That is what "the dark line right of the crab" was, and it took three passes to
/// name because two of them looked for a stray STROKE. It was not ink at all. The
/// sea rectangle stopped at `beach`; the wet-sand path below it is a curve that
/// sags past `beach`; and nothing was painted in between. On the 9.7" landscape
/// battle that wedge was a 261 px run of near-zero alpha at y=784 - `beach` lands
/// at 391.7 pt there, which is 783.4 px at 2x - running from the signboard's right
/// edge to x=2047. Fixed in `MQWorld` on the phase 1 integration, 2026-09-07.
///
/// Pinned here rather than in the snapshot tool because a law only the
/// picture-maker enforces is a law nobody enforces.
@MainActor
@Suite("A screen leaves no holes in its own background")
struct OpaqueBackgroundTests {

    init() { _ = NSApplication.shared; MQFonts.register() }

    /// Every pixel of a rendered screen, and how transparent the worst of them is.
    static func worstAlpha(_ view: some View, size: CGSize, scale: CGFloat) -> (min: Int, count: Int, run: (len: Int, y: Int, x0: Int))? {
        let renderer = ImageRenderer(content: view.frame(width: size.width, height: size.height))
        renderer.scale = scale
        guard let cg = renderer.cgImage else { return nil }
        let w = cg.width, h = cg.height
        var buf = [UInt8](repeating: 0, count: w * h * 4)
        let cs = CGColorSpace(name: CGColorSpace.sRGB)!
        guard let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8,
                                  bytesPerRow: w * 4, space: cs,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return nil }
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        var worst = 255, count = 0
        var best = (len: 0, y: 0, x0: 0)
        for y in 0..<h {
            var run = 0, start = 0
            for x in 0..<w {
                let a = Int(buf[(y * w + x) * 4 + 3])
                if a < worst { worst = a }
                if a < 250 {
                    count += 1
                    if run == 0 { start = x }
                    run += 1
                    if run > best.len { best = (run, y, start) }
                } else { run = 0 }
            }
        }
        return (worst, count, best)
    }

    static let screens: [String] = ["entrance", "map", "battle", "result", "patchwerk", "battle-dusk"]

    static func view(_ key: String, _ m: MQMetrics) -> AnyView {
        switch key {
        case "entrance":    return AnyView(MQEntranceScreen(metrics: m))
        case "map":         return AnyView(MQMapScreen(metrics: m))
        case "battle":      return AnyView(MQBattleScreen(metrics: m, palette: .noon))
        case "result":      return AnyView(MQResultScreen(metrics: m))
        case "patchwerk":   return AnyView(MQPatchwerkScreen(scene: .sample, metrics: m))
        default:            return AnyView(MQBattleScreen(metrics: m, palette: .dusk))
        }
    }

    /// Charlotte's iPad, both ways up, at the retina scale the device actually
    /// draws at - the scale the hole was measured on and the scale it hid from at 1x.
    @Test("No screen leaves a transparent pixel on the 9.7 inch iPad",
          arguments: [CGSize(width: 1024, height: 768), CGSize(width: 768, height: 1024)])
    func noHoles(_ size: CGSize) throws {
        let m = MQMetrics.device(size, insets: .none)
        for key in Self.screens {
            let r = try #require(Self.worstAlpha(Self.view(key, m), size: size, scale: 2),
                                 "\(key) produced no render")
            let why = "\(key) at \(Int(size.width))x\(Int(size.height)) has \(r.count) non-opaque "
                + "pixels, worst alpha \(r.min), longest run \(r.run.len) px at y=\(r.run.y) "
                + "from x=\(r.run.x0)"
            #expect(r.count == 0, "\(why)")
        }
    }

    /// The negative control. Painting the world one point SHORT of its own frame
    /// reproduces the defect, so a green result above is a measurement and not a
    /// scanner that always says zero.
    @Test("The scanner can see a hole when there is one")
    func negativeControl() throws {
        let holed = ZStack {
            Color.clear
            MQWorld(.noon).padding(.bottom, 8)
        }
        let r = try #require(Self.worstAlpha(holed, size: CGSize(width: 1024, height: 768), scale: 2))
        #expect(r.count > 0, "a deliberately holed render scanned as fully opaque")
    }
}

#endif
