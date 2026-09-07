#if os(macOS)
import AppKit
import SwiftUI
import MQDesign

// Renders MQDesign's screens to PNG with SwiftUI's ImageRenderer. No window, no
// simulator, no Xcode -- which is the whole point: Kai has Command Line Tools
// only, and the taste gate still has to be judged as images.
//
// Two gates run here and both are non-negotiable:
//
//  1. **Bundled faces resolve.** A silent fallback to the system font turns a
//     bespoke direction back into the template it replaced, so a face that does
//     not resolve exits non-zero rather than rendering.
//  2. **The fit check.** Every screen is re-rendered at device width with height
//     UNCONSTRAINED and compared against the device. Nothing in this app
//     scrolls, so anything taller than the device is content a child never sees.
//     It caught a 31pt overflow on iPad landscape that a visual read had passed
//     as balanced.

struct Device {
    let name: String
    let points: CGSize
    let scale: CGFloat
    let layout: MQLayout
    let type: MQType
    let safeTop: CGFloat
    let safeBottom: CGFloat

    var insets: MQInsets { MQInsets(top: safeTop, bottom: safeBottom) }
    var pixels: CGSize { CGSize(width: points.width * scale, height: points.height * scale) }
}

/// The two sizes Kevin actually judges on: the iPad he will hand over, and the
/// phone the photo ballot lands on.
let devices: [Device] = [
    Device(name: "ipad-landscape", points: CGSize(width: 1194, height: 834), scale: 2,
           layout: .wide, type: .regular, safeTop: 24, safeBottom: 20),
    Device(name: "iphone", points: CGSize(width: 393, height: 852), scale: 3,
           layout: .tall, type: .compact, safeTop: 59, safeBottom: 34)
]

@main
@MainActor
struct Snap {
    static var failures = 0

    static func main() async {
        _ = NSApplication.shared

        let missing = MQFonts.register()
        if !missing.isEmpty {
            FileHandle.standardError.write(Data("font registration failed: \(missing)\n".utf8))
            exit(1)
        }
        for face in [MQFonts.Baloo.regular, MQFonts.Baloo.medium, MQFonts.Baloo.semibold,
                     MQFonts.Baloo.bold, MQFonts.Baloo.extrabold] {
            if !MQFonts.resolves(face) {
                FileHandle.standardError.write(Data("face does not resolve: \(face)\n".utf8))
                exit(1)
            }
        }

        let out = resolveOutputDirectory().appendingPathComponent("storybook")
        do {
            try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
        } catch {
            FileHandle.standardError.write(Data("cannot create \(out.path): \(error)\n".utf8))
            exit(1)
        }

        for d in devices {
            emit(MQEntranceScreen(layout: d.layout, insets: d.insets),
                 d, out, "entrance")
            emit(MQMapScreen(layout: d.layout, insets: d.insets, size: d.points),
                 d, out, "map")
            emit(MQBattleScreen(layout: d.layout, insets: d.insets, palette: .noon),
                 d, out, "battle")
            emit(MQResultScreen(layout: d.layout, insets: d.insets),
                 d, out, "result")
            emit(MQPatchwerkScreen(scene: .sample, layout: d.layout, insets: d.insets),
                 d, out, "patchwerk")
            emit(MQPatchwerkScreen(scene: .enraged, layout: d.layout, insets: d.insets),
                 d, out, "patchwerk-enrage")
            emit(MQBattleScreen(layout: d.layout, insets: d.insets, palette: .dusk),
                 d, out, "battle-dusk")
        }

        if failures > 0 { exit(1) }
        print("done")
    }

    static func emit(_ view: some View, _ device: Device, _ dir: URL, _ screen: String) {
        let url = dir.appendingPathComponent("\(screen)-\(device.name).png")
        let framed = view.frame(width: device.points.width, height: device.points.height)
        do {
            try write(framed, points: device.points, scale: device.scale, to: url)
            let px = device.pixels
            print("wrote \(url.lastPathComponent)  \(Int(px.width))x\(Int(px.height)) px "
                  + "(\(Int(device.points.width))x\(Int(device.points.height)) pt "
                  + "@\(Int(device.scale))x)")
        } catch {
            FileHandle.standardError.write(Data("FAILED \(url.lastPathComponent): \(error)\n".utf8))
            failures += 1
            return
        }
        if let natural = naturalHeight(view, width: device.points.width, scale: device.scale) {
            let slack = device.points.height - natural
            if slack < -0.5 {
                failures += 1
                print("  OVERFLOWS by \(String(format: "%.0f", -slack)) pt "
                      + "(needs \(String(format: "%.0f", natural)) pt, "
                      + "has \(Int(device.points.height)))")
            } else {
                print("  fits, \(String(format: "%.0f", slack)) pt of slack")
            }
        }
    }

    struct RenderError: Error, CustomStringConvertible { let description: String }

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
        var url = URL(fileURLWithPath: #filePath)
        for _ in 0..<5 { url.deleteLastPathComponent() }   // -> .../ios
        return url.appendingPathComponent("snapshots").standardizedFileURL
    }
}

#else

@main
struct Snap {
    static func main() {
        print("mqdesign-snap renders on macOS only (SwiftUI ImageRenderer + AppKit PNG).")
    }
}

#endif
