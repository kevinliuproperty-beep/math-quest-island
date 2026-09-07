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
}

let devices: [Device] = [
    Device(name: "ipad11-landscape", points: CGSize(width: 1194, height: 834), scale: 2,
           layout: .wide, type: .regular, safeTop: 24, safeBottom: 20),
    Device(name: "ipad11-portrait", points: CGSize(width: 834, height: 1194), scale: 2,
           layout: .tall, type: .regular, safeTop: 24, safeBottom: 20),
    Device(name: "iphone15", points: CGSize(width: 393, height: 852), scale: 3,
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

        let outDir = resolveOutputDirectory()
        do {
            try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
        } catch {
            FileHandle.standardError.write(Data("cannot create \(outDir.path): \(error)\n".utf8))
            exit(1)
        }

        var failures = 0
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
                .frame(width: device.points.width, height: device.points.height)

                let url = outDir.appendingPathComponent("battle-\(device.name)-\(mode.rawValue).png")
                do {
                    try write(view, points: device.points, scale: device.scale, to: url)
                    let px = device.pixels
                    print("wrote \(url.path)  \(Int(px.width))x\(Int(px.height)) px "
                          + "(\(Int(device.points.width))x\(Int(device.points.height)) pt @\(Int(device.scale))x)")

                    // Does the screen actually FIT, or is it bleeding off the
                    // device and being centre-cropped? The web app clips at
                    // 390px; this is the check that stops us repeating it.
                    let natural = naturalHeight(
                        QuestBattleSample(layout: device.layout,
                                          safeTop: device.safeTop,
                                          safeBottom: device.safeBottom)
                            .mqTheme(theme),
                        width: device.points.width,
                        scale: device.scale
                    )
                    if let natural {
                        let slack = device.points.height - natural
                        if slack < -0.5 {
                            failures += 1
                            print("  OVERFLOWS by \(String(format: "%.0f", -slack)) pt "
                                  + "(needs \(String(format: "%.0f", natural)) pt, has \(Int(device.points.height)))")
                        } else {
                            print("  fits, \(String(format: "%.0f", slack)) pt of slack")
                        }
                    }
                } catch {
                    failures += 1
                    FileHandle.standardError.write(Data("FAILED \(url.lastPathComponent): \(error)\n".utf8))
                }
            }
        }

        if failures > 0 { exit(1) }
        print("\(devices.count * Mode.allCases.count) snapshots -> \(outDir.path)")
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
    /// Anything above the device height is content that will be cropped.
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
        let args = CommandLine.arguments
        if args.count > 1 {
            return URL(fileURLWithPath: args[1]).standardizedFileURL
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
