#if os(macOS)
import Testing
import SwiftUI
import AppKit
import MQDesign
import MQServices
@testable import MQPatchwerk

/// Every Patchwerk screen, rendered headlessly at the sizes that matter, and
/// measured rather than looked at.
///
/// Two laws, both borrowed from the design lane's own gate because a law only one
/// package enforces is a law nobody enforces:
///
///  1. **Nothing overflows.** This app does not scroll - a battle screen that
///     scrolls is a worksheet - so content taller than the glass is content the
///     child never sees, and that is a build failure rather than a note.
///  2. **Nothing a child taps is under 44 pt**, measured from the sizes the
///     screens' own bodies draw from, not from pixels in a PNG.
///
/// And one that belongs to this lane specifically: **the hourglass trap**.
/// `MQHourglass` is four times its `size` tall when given less than ~140 pt of
/// width - `2:47` breaks between characters and stacks four lines - and PHASE1.md
/// tells the Patchwerk lane not to put one in a narrow column. The tier picker is
/// the only screen that could, so the floor is asserted at every size in the
/// matrix rather than eyeballed at two.
@MainActor
@Suite("Patchwerk screens fit the glass")
struct HUDRenderTests {

    init() { _ = NSApplication.shared; MQFonts.register() }

    struct Device: Sendable, CustomTestStringConvertible {
        let name: String
        let size: CGSize
        let insets: MQInsets
        let scale: CGFloat
        var metrics: MQMetrics { MQMetrics.device(size, insets: insets) }
        var testDescription: String { name }
    }

    /// Charlotte's iPad in both orientations, the smallest phone, and the phone
    /// the design was authored on. The full 12-size matrix is the design lane's
    /// gate; these four are the ones that break things.
    nonisolated static let devices: [Device] = [
        Device(name: "ipad97-landscape", size: CGSize(width: 1024, height: 768),
               insets: MQInsets(top: 20, bottom: 0), scale: 2),
        Device(name: "ipad97-portrait", size: CGSize(width: 768, height: 1024),
               insets: MQInsets(top: 20, bottom: 0), scale: 2),
        Device(name: "iphone-se", size: CGSize(width: 375, height: 667),
               insets: MQInsets(top: 20, bottom: 0), scale: 2),
        Device(name: "iphone15", size: CGSize(width: 393, height: 852),
               insets: MQInsets(top: 59, bottom: 34), scale: 3)
    ]

    /// The whole device matrix, for the hourglass floor - the one property that
    /// has to hold everywhere, not only where this lane draws pictures.
    nonisolated static let matrix: [CGSize] = [
        CGSize(width: 1024, height: 768), CGSize(width: 768, height: 1024),
        CGSize(width: 1194, height: 834), CGSize(width: 834, height: 1194),
        CGSize(width: 1366, height: 1024), CGSize(width: 1024, height: 1366),
        CGSize(width: 1133, height: 744), CGSize(width: 744, height: 1133),
        CGSize(width: 507, height: 834), CGSize(width: 375, height: 667),
        CGSize(width: 393, height: 852), CGSize(width: 430, height: 932)
    ]

    // MARK: Scenes under test

    static func record() -> PatchwerkRecord {
        PatchwerkRecord(mode: "patchwerk", tier: "normal", level: 4, damage: 1_806,
                        maxStacks: 10, correct: 21, wrong: 5, freezesUsed: 3,
                        durationMs: 180_000, date: "2026-09-07")
    }

    static func rows() -> [LeaderboardEntry] {
        let names = ["Charlotte", "Ben", "Mira", "Aisyah", "Wei Jie", "Tan", "Ravi",
                     "Nur", "Hao", "Grace", "Isaac", "Lily"]
        return names.enumerated().map { i, n in
            LeaderboardEntry(id: "row\(i)",
                             bucket: LeaderboardBucket(mode: "patchwerk", tier: "normal", level: "P4"),
                             profile: n, name: n, cast: "unicorn",
                             score: 2_400 - i * 137, maxStacks: 10 - i / 3,
                             correct: 24 - i, wrong: i, freezesUsed: i % 3,
                             durationMs: 180_000, date: "2026-09-07",
                             recordedAt: Double(1_000 + i))
        }
    }

    @ViewBuilder
    static func screen(_ id: String, _ m: MQMetrics) -> some View {
        switch id {
        case "tiers":
            PatchwerkTierPicker(tiers: PatchwerkConfig.mirrored.tiers, selected: "normal",
                                level: "P4", metrics: m)
        case "hud":
            PatchwerkRunView(scene: .sample, metrics: m, locked: false,
                             onAnswer: { _ in }, onPause: {})
        case "enrage":
            PatchwerkRunView(scene: .enraged, metrics: m, locked: false,
                             onAnswer: { _ in }, onPause: {})
        case "result":
            PatchwerkResultView(record: record(), tierLabel: "Patchwerk", level: "P4",
                                placement: LeaderboardPlacement(rank: 2, kept: 12, capacity: 20),
                                leavesTheDevice: false, metrics: m)
        default:
            PatchwerkBoardView(tiers: PatchwerkConfig.mirrored.tiers, selected: "normal",
                               level: "P4", rows: rows(), highlight: "row0", metrics: m)
        }
    }

    nonisolated static let screenIDs = ["tiers", "hud", "enrage", "result", "board"]

    // MARK: The laws

    @Test("Every Patchwerk screen fits every device it can be opened on",
          arguments: devices, screenIDs)
    func fits(_ device: Device, _ id: String) throws {
        let m = device.metrics
        let view = Self.screen(id, m).frame(width: m.size.width, height: m.size.height)
        let slack = try #require(MQFit.slack(view, in: m.size),
                                 "\(id) at \(device.name) rendered nothing at all")
        #expect(slack >= 0, "\(id) overflows \(device.name) by \(-slack) pt")
    }

    @Test("Nothing a child taps is under 44 pt", arguments: devices)
    func tapFloor(_ device: Device) {
        let m = device.metrics
        let targets = PatchwerkTierPicker.tapTargets(m)
            + PatchwerkResultView.tapTargets(m)
            + PatchwerkBoardView.tapTargets(m)
            + MQPatchwerkScreen.tapTargets(m)
        for t in targets {
            #expect(t.clearsFloor,
                    "\(t.name) is \(t.least) pt on \(device.name), under Apple's 44 pt floor")
        }
    }

    @Test("The interaction layer sits on the tiles the screen actually draws",
          arguments: devices)
    func overlayMatchesTheDrawnScreen(_ device: Device) {
        let m = device.metrics
        // The overlay reads its sizes out of the drawn screen's own public
        // contract rather than re-deriving them, so this is the assertion that
        // the wiring is still connected.
        let declared = MQPatchwerkScreen.tapTargets(m).first { $0.name == "answer 1" }?.size
        #expect(PatchwerkRunView.tileSize(m) == declared)
        #expect(PatchwerkRunView.knobSize(m)
                == MQPatchwerkScreen.tapTargets(m).first { $0.name == "pause" }?.least)
        #expect(PatchwerkRunView.tileSize(m).height >= 44)
    }

    // MARK: The hourglass trap

    @Test("The tier picker never puts the hourglass in a narrow column",
          arguments: matrix)
    func hourglassFloorHolds(_ size: CGSize) {
        let m = MQMetrics.device(size)
        let width = PatchwerkTierPicker.hourglassWidth(m)
        // 140 pt is where `2:47` starts breaking between characters and the glass
        // becomes four times its own height. The floor carries a margin.
        #expect(width >= 140, "the glass gets \(width) pt at \(size.width)x\(size.height)")
        #expect(width >= PatchwerkTierPicker.hourglassFloor)
    }

    @Test("At the width the picker gives it, the glass stays the height it should be",
          arguments: devices)
    func hourglassStaysShort(_ device: Device) throws {
        let m = device.metrics
        let size = PatchwerkTierPicker.hourglassSize(m)
        let width = PatchwerkTierPicker.hourglassWidth(m)
        let glass = MQHourglass(.noon, time: "2:47", fraction: 0.9, size: size)
            .frame(width: width)
        let height = try #require(MQFit.naturalHeight(glass, width: width))
        #expect(height <= size * 1.35,
                "the hourglass grew to \(height) pt at \(width) pt wide - the trap is back")
    }

    @Test("And the trap itself is still real, so the floor is not cargo cult")
    func trapIsReal() throws {
        // A negative control: at 120 pt the glass genuinely does blow up. If this
        // ever stops failing, MQDesign fixed it and the floor above can go.
        // A negative control. If this ever stops failing, MQDesign fixed the
        // component and the floor above can go - but until then, a floor with no
        // demonstrated cliff under it is cargo cult.
        //
        // MEASURED on Kai, `MQHourglass(size: 56, time: "2:47")`, width -> height:
        //   60->224  70->224  80->168  90->112  110->112  120->56  150->56
        // Four times its own height at 70 pt, exactly as PHASE1.md warns; the
        // cliff for this size is at 120 pt, not the ~140 the note estimated, and
        // it scales with `size` because the label is 0.62 x size.
        let glass = MQHourglass(.noon, time: "2:47", fraction: 0.9, size: 56)
        let squeezed = try #require(MQFit.naturalHeight(glass, width: 70))
        let roomy = try #require(MQFit.naturalHeight(glass, width: PatchwerkTierPicker.hourglassFloor))
        let floor = Int(PatchwerkTierPicker.hourglassFloor)
        #expect(squeezed >= roomy * 3,
                "MQHourglass no longer blows up in a narrow column (70 pt -> \(squeezed), \(floor) pt -> \(roomy))")
        #expect(roomy <= 57, "even at the floor the glass is taller than its own size")
    }

    // MARK: Pictures

    /// Writes the PNGs a human looks at. Not a comparison test - there is no
    /// golden image and there should not be one at this stage; it is the render
    /// that proves the screens draw at all, and the artefact Kevin's eye needs.
    @Test("The screens render to PNG at Charlotte's iPad and on a phone")
    func writeSnapshots() throws {
        let dir = Self.snapshotDirectory()
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var written = 0
        for device in Self.devices where device.name != "iphone15" {
            for id in Self.screenIDs {
                let m = device.metrics
                let view = Self.screen(id, m)
                    .frame(width: m.size.width, height: m.size.height)
                let renderer = ImageRenderer(content: view)
                // Scale 1, not the device's 2x/3x. These fifteen files live in
                // the repository forever and are for a human eye on a big
                // monitor, not for pixel-peeping: at 2x they were 21 MB, at 1x
                // they are about 5, and `ios/snapshots/` is already ~80 MB with
                // a ruling pending on it. Full-resolution renders are what
                // `swift run mqdesign-snap` is for.
                renderer.scale = 1
                let image = try #require(renderer.cgImage,
                                         "\(id) at \(device.name) produced no image")
                let rep = NSBitmapImageRep(cgImage: image)
                rep.size = m.size
                let data = try #require(rep.representation(using: .png, properties: [:]))
                try data.write(to: dir.appendingPathComponent("\(id)-\(device.name).png"))
                written += 1
            }
        }
        #expect(written == 15)
    }

    /// `ios/Packages/MQPatchwerk/Snapshots/` - inside this lane's own package, so
    /// it can never collide with another lane's renders.
    static func snapshotDirectory() -> URL {
        URL(fileURLWithPath: #filePath)          // .../Tests/MQPatchwerkTests/HUDRenderTests.swift
            .deletingLastPathComponent()         // .../Tests/MQPatchwerkTests
            .deletingLastPathComponent()         // .../Tests
            .deletingLastPathComponent()         // .../MQPatchwerk
            .appendingPathComponent("Snapshots")
    }
}
#endif
