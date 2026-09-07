#if os(macOS)
import AppKit
import SwiftUI
import MQDesign

// Renders the MQDesign sample screens to PNG with SwiftUI's ImageRenderer.
// No window, no simulator, no Xcode -- which is the whole point: Kai has
// Command Line Tools only, and the taste gate still has to be judged as images.

struct Device {
    let name: String
    let points: CGSize
    let scale: CGFloat
    let layout: QuestBattleSample.Layout
    let type: MQType
    let safeTop: CGFloat
    let safeBottom: CGFloat

    var pixels: CGSize {
        CGSize(width: points.width * scale, height: points.height * scale)
    }

    var reworkLayout: MQLayout { layout == .wide ? .wide : .tall }
    var insets: MQInsets { MQInsets(top: safeTop, bottom: safeBottom) }
}

let devices: [Device] = [
    Device(name: "ipad11-landscape", points: CGSize(width: 1194, height: 834), scale: 2,
           layout: .wide, type: .regular, safeTop: 24, safeBottom: 20),
    Device(name: "ipad11-portrait", points: CGSize(width: 834, height: 1194), scale: 2,
           layout: .tall, type: .regular, safeTop: 24, safeBottom: 20),
    Device(name: "iphone15", points: CGSize(width: 393, height: 852), scale: 3,
           layout: .tall, type: .compact, safeTop: 59, safeBottom: 34)
]

/// The two rework directions render at exactly the two sizes Kevin judges on:
/// the iPad he will actually hand over, and the phone he will actually look at
/// the ballot on.
let reworkDevices: [Device] = [
    Device(name: "ipad-landscape", points: CGSize(width: 1194, height: 834), scale: 2,
           layout: .wide, type: .regular, safeTop: 24, safeBottom: 20),
    Device(name: "iphone", points: CGSize(width: 393, height: 852), scale: 3,
           layout: .tall, type: .compact, safeTop: 59, safeBottom: 34)
]

enum Mode: String, CaseIterable {
    case light, dark
    var theme: MQTheme { self == .light ? .day : .night }
}

@main
@MainActor
struct Snap {
    static func main() async {
        _ = NSApplication.shared

        // Bundled OFL faces. A silent fallback to the system font would turn a
        // bespoke direction back into the template we are replacing, so this is
        // a hard gate rather than a best effort.
        let missing = MQFonts.register()
        if !missing.isEmpty {
            FileHandle.standardError.write(Data("font registration failed: \(missing)\n".utf8))
            exit(1)
        }
        for face in [MQFonts.Baloo.semibold, MQFonts.Baloo.extrabold,
                     MQFonts.Fredoka.semibold, MQFonts.Fredoka.bold] {
            if !MQFonts.resolves(face) {
                FileHandle.standardError.write(Data("face does not resolve: \(face)\n".utf8))
                exit(1)
            }
        }

        let outDir = resolveOutputDirectory()
        let reworkDir = outDir.appendingPathComponent("rework")
        for dir in [outDir, reworkDir] {
            do {
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            } catch {
                FileHandle.standardError.write(Data("cannot create \(dir.path): \(error)\n".utf8))
                exit(1)
            }
        }

        var failures = 0
        let only = CommandLine.arguments.contains("--rework-only")

        // ---- The rejected first sample, kept so the comparison is possible.
        if !only {
            for device in devices {
                for mode in Mode.allCases {
                    let theme = mode.theme.sized(device.type)
                    let view = QuestBattleSample(
                        layout: device.layout,
                        safeTop: device.safeTop,
                        safeBottom: device.safeBottom
                    )
                    .mqTheme(theme)
                    .environment(\.colorScheme, mode == .light ? .light : .dark)

                    let url = outDir.appendingPathComponent("battle-\(device.name)-\(mode.rawValue).png")
                    failures += emit(view, device: device, url: url)
                }
            }
        }

        // ---- Rework: two directions, same scene, same devices.
        for device in reworkDevices {
            let storybook = StorybookBattleScreen(layout: device.reworkLayout,
                                                  insets: device.insets)
            failures += emit(storybook, device: device,
                             url: reworkDir.appendingPathComponent("storybook-\(device.name)-light.png"))

            let arcade = ArcadeBattleScreen(layout: device.reworkLayout,
                                            insets: device.insets)
            failures += emit(arcade, device: device,
                             url: reworkDir.appendingPathComponent("arcade-\(device.name)-light.png"))
        }

        if failures > 0 { exit(1) }
        print("done")
    }

    /// Render + the fit check. Kept from the first sample and non-negotiable:
    /// the screen is re-rendered at device width with height UNCONSTRAINED, and
    /// anything taller than the device is content a child would never see.
    /// It caught a 31pt overflow that a visual read had passed as balanced.
    static func emit(_ view: some View, device: Device, url: URL) -> Int {
        var failures = 0
        let framed = view.frame(width: device.points.width, height: device.points.height)
        do {
            try write(framed, points: device.points, scale: device.scale, to: url)
            let px = device.pixels
            print("wrote \(url.lastPathComponent)  \(Int(px.width))x\(Int(px.height)) px "
                  + "(\(Int(device.points.width))x\(Int(device.points.height)) pt @\(Int(device.scale))x)")
        } catch {
            FileHandle.standardError.write(Data("FAILED \(url.lastPathComponent): \(error)\n".utf8))
            return 1
        }
        if let natural = naturalHeight(view, width: device.points.width, scale: device.scale) {
            let slack = device.points.height - natural
            if slack < -0.5 {
                failures += 1
                print("  OVERFLOWS by \(String(format: "%.0f", -slack)) pt "
                      + "(needs \(String(format: "%.0f", natural)) pt, has \(Int(device.points.height)))")
            } else {
                print("  fits, \(String(format: "%.0f", slack)) pt of slack")
            }
        }
        return failures
    }

    struct RenderError: Error, CustomStringConvertible {
        let description: String
    }

    static func write(_ view: some View, points: CGSize, scale: CGFloat, to url: URL) throws {
        let renderer = ImageRenderer(content: view)
        renderer.scale = scale
        renderer.proposedSize = ProposedViewSize(points)

        guard let cgImage = renderer.cgImage else {
            throw RenderError(description: "ImageRenderer produced no image")
        }
        let rep = NSBitmapImageRep(cgImage: cgImage)
        rep.size = points
        guard let data = rep.representation(using: .png, properties: [:]) else {
            throw RenderError(description: "PNG encoding failed")
        }
        try data.write(to: url)
    }

    /// The height the screen wants at a fixed width, with height unconstrained.
    static func naturalHeight(_ view: some View, width: CGFloat, scale: CGFloat) -> CGFloat? {
        let renderer = ImageRenderer(content: view.frame(width: width))
        renderer.scale = scale
        renderer.proposedSize = ProposedViewSize(width: width, height: nil)
        guard let cg = renderer.cgImage else { return nil }
        return CGFloat(cg.height) / scale
    }

    /// Default output is <repo>/ios/snapshots, derived from this file's location
    /// so the tool works from any working directory. Override with argv[1].
    static func resolveOutputDirectory() -> URL {
        let args = CommandLine.arguments.dropFirst().filter { !$0.hasPrefix("--") }
        if let first = args.first {
            return URL(fileURLWithPath: first).standardizedFileURL
        }
        // .../ios/Packages/MQDesign/Sources/mqdesign-snap/Snap.swift
        var url = URL(fileURLWithPath: #filePath)
        for _ in 0..<5 { url.deleteLastPathComponent() }   // -> .../ios
        return url.appendingPathComponent("snapshots").standardizedFileURL
    }
}

#else

@main
struct Snap {
    static func main() {
        print("mqdesign-snap renders on macOS only (SwiftUI ImageRenderer + AppKit PNG encoding).")
    }
}

#endif
