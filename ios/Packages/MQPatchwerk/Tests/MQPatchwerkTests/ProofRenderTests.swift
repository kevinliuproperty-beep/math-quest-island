#if os(macOS)
import Testing
import Foundation
import SwiftUI
import AppKit
import MQContent
import MQDesign
import MQServices
@testable import MQPatchwerk

/// The pictures a human looks at when the fix is handed over, written OUTSIDE the
/// repository.
///
/// `HUDRenderTests.writeSnapshots` owns the fifteen renders that live in
/// `MQPatchwerk/Snapshots/` forever. This is the other kind: an ad-hoc dump for a
/// review, of the states the rehearsal photographed as broken, into whatever
/// directory the reviewer names. It is skipped unless `MQI_PROOF_DIR` is set, so
/// the gate neither writes stray files nor spends time on them.
///
///     MQI_PROOF_DIR=/tmp/pwfix swift test --toolset kai-toolset.json \
///         --filter ProofRenderTests
@MainActor
@Suite("Proof renders for a human eye")
struct ProofRenderTests {

    init() { _ = NSApplication.shared; MQFonts.register() }

    nonisolated static var outputDirectory: URL? {
        ProcessInfo.processInfo.environment["MQI_PROOF_DIR"].map {
            URL(fileURLWithPath: $0)
        }
    }

    struct Device: Sendable, CustomTestStringConvertible {
        let name: String
        let size: CGSize
        let insets: MQInsets
        var metrics: MQMetrics { MQMetrics.device(size, insets: insets) }
        var testDescription: String { name }
    }

    static let devices = [
        Device(name: "ipad97-landscape", size: CGSize(width: 1024, height: 768),
               insets: MQInsets(top: 20, bottom: 0)),
        Device(name: "ipad97-portrait", size: CGSize(width: 768, height: 1024),
               insets: MQInsets(top: 20, bottom: 0)),
        Device(name: "iphone-se", size: CGSize(width: 375, height: 667),
               insets: MQInsets(top: 20, bottom: 0))
    ]

    /// A CHOICE item that carries a pie chart: the other half of the figure fix.
    static var choiceWithFigure: MQPatchwerkScene {
        var s = MQPatchwerkScene.sample
        s.question = "On the pie chart, how many pupils are shown for Choir?"
        s.spec = MQPatchwerkScene.decodeSpec(#"""
            {"type":"pie","title":"After-school clubs","cats":["Art","Choir","Chess","Judo"],
             "weights":[30,20,15,10],"labels":["30","20","15","10"],
             "caption":"Number of pupils."}
            """#)
        s.figureFallback = "A pie chart of after-school clubs."
        s.answers = ["20", "30", "15", "10"]
        s.flash = nil
        return s
    }

    /// Run 1 of the rehearsal, number for number, so the "after" shot is directly
    /// comparable with `rehearsal-p1-patchwerk/pw-05-result.png`.
    static func record() -> PatchwerkRecord {
        PatchwerkRecord(mode: "patchwerk", tier: "short", level: 4, damage: 1402,
                        maxStacks: 4, correct: 83, wrong: 67, freezesUsed: 0,
                        durationMs: 120_000, date: "2026-09-07")
    }

    @Test("Write the proof renders",
          .enabled(if: ProofRenderTests.outputDirectory != nil))
    func writeProofs() throws {
        let dir = try #require(Self.outputDirectory)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        var shots: [(String, Device, AnyView)] = []
        for d in Self.devices {
            let m = d.metrics
            shots.append(("typed-keypad", d, AnyView(
                PatchwerkRunView(scene: .typedItem, metrics: m, locked: false,
                                 onAnswer: { _ in }, onPause: {}))))
            shots.append(("choice-figure", d, AnyView(
                PatchwerkRunView(scene: Self.choiceWithFigure, metrics: m, locked: false,
                                 onAnswer: { _ in }, onPause: {}))))
            shots.append(("result", d, AnyView(
                PatchwerkResultView(record: Self.record(), tierLabel: "Trash Pull",
                                    level: "P4",
                                    placement: LeaderboardPlacement(rank: 1, kept: 1,
                                                                    capacity: 10),
                                    leavesTheDevice: false, metrics: m))))
            shots.append(("quest-result", d, AnyView(
                MQResultScreen(metrics: m))))
        }

        var written: [String] = []
        for (id, device, view) in shots {
            let m = device.metrics
            let renderer = ImageRenderer(
                content: view.frame(width: m.size.width, height: m.size.height))
            renderer.scale = 1
            let image = try #require(renderer.cgImage, "\(id) at \(device.name) drew nothing")
            let rep = NSBitmapImageRep(cgImage: image)
            rep.size = m.size
            let data = try #require(rep.representation(using: .png, properties: [:]))
            let url = dir.appendingPathComponent("\(id)-\(device.name).png")
            try data.write(to: url)
            written.append(url.lastPathComponent)
        }
        print("proof renders -> \(dir.path)\n  " + written.joined(separator: "\n  "))
        #expect(written.count == Self.devices.count * 4)
    }
}
#endif
