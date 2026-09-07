#if os(macOS)
import Testing
import SwiftUI
import AppKit
import MQContent
import MQDesign
import MQProgress
import MQServices
@testable import MQPatchwerk

/// The HUD measured on the PIXELS, because the two defects this file exists for
/// were both invisible to a test that asked the code what it thought it drew.
///
/// The 2026-09-07 refutation killed the old overlay test in one line: it asserted
/// `PatchwerkRunView.tileSize(m) == MQPatchwerkScreen.tapTargets(m)...size`, and
/// `tileSize(m)` IS that expression. `X == X`. Under it the pause knob's hit rect
/// sat 5-8 pt above the drawn knob at all twelve device sizes. And the hourglass
/// took a constant (`scene.enraged ? 0.10 : 0.92`), so it read 92% full at 0:21
/// left of a three-minute fight while `PatchwerkRun.sandFraction(at:)` sat with
/// no consumer anywhere in the repository.
///
/// Both are now measured the only way that can catch them: RENDER, then read the
/// answer out of the bytes.
@MainActor
@Suite("The Patchwerk HUD, measured on the pixels")
struct HUDPixelTests {

    init() { _ = NSApplication.shared; MQFonts.register() }

    // MARK: The twelve sizes

    struct Size: Sendable, CustomTestStringConvertible {
        let name: String
        let size: CGSize
        let insets: MQInsets
        var metrics: MQMetrics { MQMetrics.device(size, insets: insets) }
        var testDescription: String { name }
    }

    /// The device matrix MQDesign gates, with the safe areas each device has.
    nonisolated static let matrix: [Size] = [
        Size(name: "ipad97-landscape",   size: CGSize(width: 1024, height: 768),  insets: MQInsets(top: 20, bottom: 0)),
        Size(name: "ipad97-portrait",    size: CGSize(width: 768,  height: 1024), insets: MQInsets(top: 20, bottom: 0)),
        Size(name: "ipad11-landscape",   size: CGSize(width: 1194, height: 834),  insets: MQInsets(top: 24, bottom: 20)),
        Size(name: "ipad11-portrait",    size: CGSize(width: 834,  height: 1194), insets: MQInsets(top: 24, bottom: 20)),
        Size(name: "ipad13-landscape",   size: CGSize(width: 1366, height: 1024), insets: MQInsets(top: 24, bottom: 20)),
        Size(name: "ipad13-portrait",    size: CGSize(width: 1024, height: 1366), insets: MQInsets(top: 24, bottom: 20)),
        Size(name: "ipadmini-landscape", size: CGSize(width: 1133, height: 744),  insets: MQInsets(top: 24, bottom: 20)),
        Size(name: "ipadmini-portrait",  size: CGSize(width: 744,  height: 1133), insets: MQInsets(top: 24, bottom: 20)),
        Size(name: "ipad11-split-half",  size: CGSize(width: 507,  height: 834),  insets: MQInsets(top: 24, bottom: 20)),
        Size(name: "iphone-se",          size: CGSize(width: 375,  height: 667),  insets: MQInsets(top: 20, bottom: 0)),
        Size(name: "iphone15",           size: CGSize(width: 393,  height: 852),  insets: MQInsets(top: 59, bottom: 34)),
        Size(name: "iphone15-pro-max",   size: CGSize(width: 430,  height: 932),  insets: MQInsets(top: 59, bottom: 34))
    ]

    /// Noon, the enrage, and a stress scene: a long flash line, a twenty-word
    /// question and long answer labels. If a rect moves under content pressure,
    /// this is where it shows.
    static func scenes() -> [(String, MQPatchwerkScene)] {
        var stress = MQPatchwerkScene.enraged
        stress.flash = "The answer is 1,234,567."
        stress.question = "Ali buys 12 packets of stickers. Each packet holds 24 stickers and he gives away 3 packets. How many stickers has he left?"
        stress.answers = ["216 stickers", "288 stickers", "0.036 stickers", "3,600 stickers"]
        stress.damage = "1,234,567"
        return [("noon", .sample), ("enrage", .enraged), ("stress", stress)]
    }

    // MARK: Pixel plumbing

    struct Pixels {
        let w: Int, h: Int, buf: [UInt8]
        func at(_ x: Int, _ y: Int) -> (Int, Int, Int) {
            let o = (y * w + x) * 4
            return (Int(buf[o]), Int(buf[o + 1]), Int(buf[o + 2]))
        }
        func matches(_ x: Int, _ y: Int, _ t: (Int, Int, Int), _ tol: Int) -> Bool {
            guard x >= 0, y >= 0, x < w, y < h else { return false }
            let p = at(x, y)
            return abs(p.0 - t.0) <= tol && abs(p.1 - t.1) <= tol && abs(p.2 - t.2) <= tol
        }
    }

    static func render(_ view: some View, size: CGSize, scale: CGFloat = 1) -> Pixels? {
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
        return Pixels(w: w, h: h, buf: buf)
    }

    /// A bounding box in pixels, or empty.
    struct Box: CustomStringConvertible {
        var minX = Int.max, minY = Int.max, maxX = Int.min, maxY = Int.min
        var count = 0
        var empty: Bool { count == 0 }
        var w: Int { maxX - minX + 1 }
        var h: Int { maxY - minY + 1 }
        var midX: Double { Double(minX + maxX) / 2 }
        var midY: Double { Double(minY + maxY) / 2 }
        var description: String {
            empty ? "EMPTY" : "x\(minX)..\(maxX) y\(minY)..\(maxY) (\(w)x\(h))"
        }
        mutating func add(_ x: Int, _ y: Int) {
            minX = min(minX, x); maxX = max(maxX, x)
            minY = min(minY, y); maxY = max(maxY, y); count += 1
        }
    }

    /// Five boxes: one per probe colour.
    static func probeBoxes(_ view: some View, size: CGSize) -> [Box] {
        guard let px = render(view, size: size) else {
            return Array(repeating: Box(), count: 5)
        }
        var boxes = Array(repeating: Box(), count: 5)
        let targets: [(Int, Int, Int)] = MQProbe.rgb.map {
            (Int($0.0 * 255), Int($0.1 * 255), Int($0.2 * 255))
        }
        for y in 0..<px.h {
            for x in 0..<px.w {
                for (i, t) in targets.enumerated() where px.matches(x, y, t, 12) {
                    boxes[i].add(x, y)
                    break
                }
            }
        }
        return boxes
    }

    static func runView(_ scene: MQPatchwerkScene, _ m: MQMetrics) -> some View {
        PatchwerkRunView(scene: scene, metrics: m, locked: false,
                         onAnswer: { _ in }, onPause: {})
    }

    // MARK: W2 - the overlay against the drawn control

    /// The DRAWN control frames and the OVERLAY button frames, each tinted opaque
    /// in a SEPARATE render and bounding-boxed out of the PNG, at every size and
    /// in every composition.
    ///
    /// This is the assertion the old `overlayMatchesTheDrawnScreen` only appeared
    /// to make. It compares two independently produced pictures; there is no
    /// expression either side can be implemented as.
    @Test("Every overlay button lands on the control the screen draws", arguments: matrix)
    func overlaySitsOnTheDrawnControl(_ device: Size) throws {
        let m = device.metrics
        var lines: [String] = []
        var worst = 0

        for (sname, scene) in Self.scenes() {
            let drawn = MQProbe.armed(screen: true, overlay: false) {
                Self.probeBoxes(Self.runView(scene, m), size: device.size)
            }
            let hit = MQProbe.armed(screen: false, overlay: true) {
                Self.probeBoxes(Self.runView(scene, m), size: device.size)
            }

            for i in 0..<5 {
                let label = i < 4 ? "answer \(i + 1)" : "pause"
                let d = drawn[i], o = hit[i]
                try #require(!d.empty, "\(device.name)/\(sname): the screen drew no \(label)")
                try #require(!o.empty, "\(device.name)/\(sname): the overlay has no \(label)")
                let delta = [abs(d.minX - o.minX), abs(d.maxX - o.maxX),
                             abs(d.minY - o.minY), abs(d.maxY - o.maxY)].max()!
                lines.append("  \(device.name)/\(sname) \(label): drawn \(d) overlay \(o) delta=\(delta)")
                worst = max(worst, delta)
                // 1 pt of slack for the renderer's own rounding, and no more.
                #expect(delta <= 1,
                        "\(device.name)/\(sname): the \(label) hit rect is \(delta) pt off the drawn control (drawn \(d), overlay \(o))")
                if i == 4 {
                    // Apple's floor, measured on the rect a finger can actually
                    // land on rather than on the declared square.
                    #expect(o.w >= 44 && o.h >= 44,
                            "\(device.name)/\(sname): the pause hit rect renders \(o.w)x\(o.h) pt, under Apple's 44 pt floor")
                }
            }
        }
        print("overlay-on-pixels \(device.name): worst delta = \(worst) pt\n"
              + lines.joined(separator: "\n"))
    }

    /// The probe is an instrument, and an instrument that is on by accident is a
    /// defect in the shipping app. With both flags down, none of the five probe
    /// colours is anywhere in the render.
    @Test("With no probe armed, the screen contains no probe colour")
    func probeIsOffByDefault() throws {
        let m = Self.matrix[0].metrics
        let boxes = Self.probeBoxes(Self.runView(.sample, m), size: Self.matrix[0].size)
        for (i, b) in boxes.enumerated() {
            #expect(b.empty, "probe colour \(i) is visible with no probe armed: \(b)")
        }
    }

    // MARK: W3 - the sand IS the clock

    /// Read the sand level out of the drawn hourglass.
    ///
    /// `MQHourglass` fills the top bulb with a flat `p.gold` trapezoid whose top
    /// edge sits at `waistY - (waistY - topY) * fraction`, with the waist at 0.50
    /// of the canvas height and the top of the glass at 0.13. So: find the first
    /// row inside the canvas that carries a run of gold, and invert.
    static func measuredSand(_ scene: MQPatchwerkScene, _ m: MQMetrics,
                             scale: CGFloat = 4) -> Double? {
        guard let px = render(runView(scene, m), size: m.size, scale: scale) else { return nil }
        let r = MQPatchwerkScreen.hourglassRect(m)
        let x0 = Int((r.minX * scale).rounded(.down)), x1 = Int((r.maxX * scale).rounded(.up))
        let y0 = r.minY * scale, h = r.height * scale
        let topY = y0 + h * 0.13, waistY = y0 + h * 0.50
        // The palette the screen picks for this scene, so the enrage's brighter
        // gold is matched too.
        let hex = scene.enraged ? (255, 182, 63) : (239, 162, 44)
        // The trapezoid always straddles the glass's vertical centre line, however
        // little sand is left, so a narrow band there finds the top edge at every
        // fraction - including the last sliver above the waist, which is only
        // 0.12 of the canvas wide and which a whole-row run length misses.
        let mid = (x0 + x1) / 2
        let band = max(1, Int((r.width * scale) * 0.03))

        var sandTop: Double?
        var y = Int(y0.rounded(.down))
        while Double(y) <= waistY {
            var hits = 0
            for x in (mid - band)...(mid + band) where px.matches(x, y, hex, 20) { hits += 1 }
            if hits >= band { sandTop = Double(y); break }
            y += 1
        }
        guard let sandTop else { return 0 }
        return max(0, min(1, (waistY - sandTop) / (waistY - topY)))
    }

    /// Kevin's own number: a 2-minute Trash Pull with 21 seconds left is 17.5% of
    /// the way through the glass, and the glass has to say so.
    @Test("At 0:21 of a 2-minute tier the glass is ~17% full, on the pixels")
    func sandAtTwentyOneSeconds() async throws {
        let s = try await Self.liveSession(tier: "short")
        s.clock.set(s.t0 + 99_000)                     // 21,000 ms left of 120,000
        await s.session.tick()

        let scene = s.session.scene
        #expect(scene.timer == "0:21")
        #expect(abs(scene.sand - 0.175) < 1e-9,
                "the run says \(scene.sand) sand left, not 21/120")

        let m = Self.matrix[0].metrics
        let measured = try #require(Self.measuredSand(scene, m))
        print("sand at 0:21 on the 2-minute tier: scene=\(scene.sand) measured=\(measured)")
        #expect(abs(measured - 0.175) < 0.04,
                "the hourglass DRAWS \(measured) of sand at 0:21 - the picture and the digits are not the same clock")

        // And the old constant is gone: the picture at 0:21 is nothing like the
        // 0.92 this screen used to draw regardless of the run.
        var asBefore = scene
        asBefore.sand = 0.92
        let before = try #require(Self.measuredSand(asBefore, m))
        #expect(before - measured > 0.5,
                "the glass no longer responds to `sand` at all (0.175 -> \(measured), 0.92 -> \(before))")
    }

    /// Four moments of one real fight, each read off the rendered glass. The
    /// hourglass has to be a picture of the clock at every one of them, not only
    /// at the end where the enrage flag would have carried it.
    @Test("The glass tracks the run at four moments of a fight")
    func sandTracksTheWholeFight() async throws {
        let s = try await Self.liveSession(tier: "short")
        let m = Self.matrix[0].metrics
        // Start, a third in, the last half-minute, and inside the enrage.
        let moments = [0, 40_000, 90_000, 110_000]
        var trace: [String] = []
        var last = 2.0

        for at in moments {
            s.clock.set(s.t0 + at)
            await s.session.tick()
            let scene = s.session.scene
            let want = Double(120_000 - at) / 120_000
            let measured = try #require(Self.measuredSand(scene, m))
            trace.append("  t=\(at)ms timer=\(scene.timer) enraged=\(scene.enraged) "
                         + "run=\(scene.sand) drawn=\(measured)")
            #expect(abs(scene.sand - want) < 1e-9)
            #expect(abs(measured - want) < 0.05,
                    "at \(at) ms the run has \(want) sand left and the glass draws \(measured)")
            #expect(measured < last, "the sand did not fall between moments")
            last = measured
        }
        print("hourglass trace, 2-minute tier, iPad 9.7 landscape:\n"
              + trace.joined(separator: "\n"))
    }

    /// `PatchwerkRun.sandFraction(at:)` and `PatchwerkSession.sandFraction` were
    /// dead code with no consumer. This is the wire, asserted end to end.
    @Test("The scene's sand is the run's own sandFraction, not a mood")
    func sandComesFromTheRun() async throws {
        let s = try await Self.liveSession(tier: "normal")
        for at in [0, 1_000, 45_000, 160_000, 179_500] {
            s.clock.set(s.t0 + at)
            await s.session.tick()
            #expect(s.session.scene.sand == s.session.sandFraction)
            #expect(s.session.sandFraction
                    == Double(s.session.timeLeftMs) / 180_000.0)
        }
    }

    // MARK: A live session on a manual clock

    struct Live {
        let session: PatchwerkSession
        let clock: PatchwerkManualClock
        let t0: Int
    }

    static func liveSession(tier: String) async throws -> Live {
        let clock = PatchwerkManualClock(500_000)
        let dir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("mqi-pixel-\(UUID().uuidString)")
        let session = PatchwerkSession(
            source: StubQuestionSource(catalogue: StubQuestionSource.sampleCatalogue(),
                                       questions: SessionTests.questions()),
            leaderboard: LocalLeaderboard(url: dir.appendingPathComponent("b.json")),
            progress: MQProgressStore.inMemory(),
            player: .init(profile: ProfileID("c"), name: "Charlotte", cast: .unicorn, level: "P4"),
            clock: clock, config: .mirrored, rngSeed: 3, today: { "2026-09-07" })
        session.choose(tier: tier)
        let t0 = clock.nowMs
        await session.start()
        try #require(session.phase == .running, "the fight did not start: \(session.failure ?? "-")")
        return Live(session: session, clock: clock, t0: t0)
    }
}
#endif
