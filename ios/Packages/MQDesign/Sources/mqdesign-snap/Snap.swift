#if os(macOS)
import AppKit
import SwiftUI
import MQDesign

// Renders MQDesign's screens to PNG with SwiftUI's ImageRenderer. No window, no
// simulator, no Xcode -- which is the whole point: Kai has Command Line Tools
// only, and the design still has to be judged as images and gated as geometry.
//
// THREE GATES RUN HERE AND ALL THREE FAIL THE BUILD:
//
//  1. **Bundled faces resolve.** A silent fallback to the system font turns a
//     bespoke direction back into the template it replaced, so a face that does
//     not resolve exits non-zero rather than rendering.
//  2. **The fit check, across the DEVICE MATRIX.** Every screen is re-rendered
//     at every device width with height UNCONSTRAINED and compared against the
//     device height. Nothing in this app scrolls, so anything taller than the
//     device is content a child never sees.
//  3. **The 44 pt tap floor, across the DEVICE MATRIX.** Every screen declares
//     what a child may hit and at what size, computed from the same constants
//     its body draws from. This is new in phase 1 and it found a real one on
//     its first run: the map marker's post at the compact scale was 38.9 pt.
//
// WHY A MATRIX AND NOT TWO DEVICES. The design lane authored and judged at
// exactly two sizes, 1194x834 and 393x852, and every composition literal in the
// package was tuned to them. Charlotte's iPad is neither: it is a 6th-generation
// 9.7", 1024x768 pt, 4:3. That screen is 170 pt narrower and 66 pt shorter than
// the one the battle line was drawn on, and the battle line's three widths
// (300 + 620 + 300) do not fit inside it. A design system with one authored size
// is a mock-up; the matrix is what makes it a system.
//
// CHARLOTTE'S DEVICE IS FIRST IN THE LIST AND KEEPS ITS FULL-SIZE PNGs. So does
// the smallest phone. Everything else is a thumbnail, because 84 full-resolution
// renders is 400 MB of repository and nobody reads them.

// MARK: - The matrix

struct MatrixDevice: Sendable {
    let name: String
    let points: CGSize
    let scale: CGFloat
    let safeTop: CGFloat
    let safeBottom: CGFloat
    /// Full-resolution PNG kept in the tree, versus a thumbnail.
    let keepFull: Bool
    /// Human note for the table.
    let note: String

    var insets: MQInsets { MQInsets(top: safeTop, bottom: safeBottom) }
    var metrics: MQMetrics { MQMetrics.device(points, insets: insets) }
    var pixels: CGSize { CGSize(width: points.width * scale, height: points.height * scale) }
}

/// iPad gets both orientations; iPhone is portrait only, because the app locks
/// to portrait on a phone -- a battle line across a 852x393 phone puts the
/// question at 60 pt tall between two creatures and there is no version of that
/// which works.
///
/// Safe areas: the iPad 6 and the SE have a status bar and a home button, so
/// 20 pt top and nothing at the bottom. Every home-indicator device pays 20-34
/// at the bottom. These are the numbers that decide whether the answer row is
/// under a thumb or under the indicator, so they are part of the gate, not
/// decoration.
let matrix: [MatrixDevice] = [
    // CHARLOTTE'S DEVICE. First priority, full-size PNGs kept.
    MatrixDevice(name: "ipad97-landscape", points: CGSize(width: 1024, height: 768),
                 scale: 2, safeTop: 20, safeBottom: 0, keepFull: true,
                 note: "iPad 9.7\" (6th gen) - Charlotte's"),
    MatrixDevice(name: "ipad97-portrait", points: CGSize(width: 768, height: 1024),
                 scale: 2, safeTop: 20, safeBottom: 0, keepFull: true,
                 note: "iPad 9.7\" (6th gen) - Charlotte's"),

    MatrixDevice(name: "ipad11-landscape", points: CGSize(width: 1194, height: 834),
                 scale: 2, safeTop: 24, safeBottom: 20, keepFull: false,
                 note: "iPad 11\" - the design lane's authored size"),
    MatrixDevice(name: "ipad11-portrait", points: CGSize(width: 834, height: 1194),
                 scale: 2, safeTop: 24, safeBottom: 20, keepFull: false, note: "iPad 11\""),
    MatrixDevice(name: "ipad13-landscape", points: CGSize(width: 1366, height: 1024),
                 scale: 2, safeTop: 24, safeBottom: 20, keepFull: false, note: "iPad 13\""),
    MatrixDevice(name: "ipad13-portrait", points: CGSize(width: 1024, height: 1366),
                 scale: 2, safeTop: 24, safeBottom: 20, keepFull: false, note: "iPad 13\""),
    MatrixDevice(name: "ipadmini-landscape", points: CGSize(width: 1133, height: 744),
                 scale: 2, safeTop: 24, safeBottom: 20, keepFull: false, note: "iPad mini"),
    MatrixDevice(name: "ipadmini-portrait", points: CGSize(width: 744, height: 1133),
                 scale: 2, safeTop: 24, safeBottom: 20, keepFull: false, note: "iPad mini"),
    MatrixDevice(name: "ipad11-split-half", points: CGSize(width: 507, height: 834),
                 scale: 2, safeTop: 24, safeBottom: 20, keepFull: false,
                 note: "iPad 11\" Split View, half"),

    // Phones, portrait only.
    MatrixDevice(name: "iphone-se", points: CGSize(width: 375, height: 667),
                 scale: 2, safeTop: 20, safeBottom: 0, keepFull: true,
                 note: "iPhone SE - the smallest screen shipped"),
    MatrixDevice(name: "iphone15", points: CGSize(width: 393, height: 852),
                 scale: 3, safeTop: 59, safeBottom: 34, keepFull: false,
                 note: "iPhone 15 - the design lane's authored size"),
    MatrixDevice(name: "iphone15-pro-max", points: CGSize(width: 430, height: 932),
                 scale: 3, safeTop: 59, safeBottom: 34, keepFull: false,
                 note: "iPhone 15 Pro Max")
]

/// The photo-gate set: the two sizes Kevin has already ruled on, kept at full
/// resolution under `snapshots/storybook/` exactly as the design lane left them,
/// so the approved images stay comparable across this lane's edits.
let approvedSizes: Set<String> = ["ipad11-landscape", "iphone15"]

// MARK: - The screens

@MainActor
struct ScreenSpec {
    let key: String
    let make: (MQMetrics) -> AnyView
    let taps: (MQMetrics) -> [MQTapTarget]
}

@MainActor
let screens: [ScreenSpec] = [
    ScreenSpec(key: "entrance",
               make: { AnyView(MQEntranceScreen(metrics: $0)) },
               taps: MQEntranceScreen.tapTargets),
    ScreenSpec(key: "map",
               make: { AnyView(MQMapScreen(metrics: $0)) },
               taps: MQMapScreen.tapTargets),
    ScreenSpec(key: "battle",
               make: { AnyView(MQBattleScreen(metrics: $0, palette: .noon)) },
               taps: MQBattleScreen.tapTargets),
    ScreenSpec(key: "result",
               make: { AnyView(MQResultScreen(metrics: $0)) },
               taps: MQResultScreen.tapTargets),
    ScreenSpec(key: "patchwerk",
               make: { AnyView(MQPatchwerkScreen(scene: .sample, metrics: $0)) },
               taps: MQPatchwerkScreen.tapTargets),
    ScreenSpec(key: "patchwerk-enrage",
               make: { AnyView(MQPatchwerkScreen(scene: .enraged, metrics: $0)) },
               taps: MQPatchwerkScreen.tapTargets),
    ScreenSpec(key: "battle-dusk",
               make: { AnyView(MQBattleScreen(metrics: $0, palette: .dusk)) },
               taps: MQBattleScreen.tapTargets)
]

@main
@MainActor
struct Snap {
    static var overflows: [String] = []
    static var tapFailures: [String] = []
    static var renderFailures: [String] = []
    /// device name -> screen key -> slack
    static var slack: [String: [String: CGFloat]] = [:]

    static func main() async {
        _ = NSApplication.shared

        let missing = MQFonts.register()
        if !missing.isEmpty {
            fail("font registration failed: \(missing)")
            exit(1)
        }
        for face in [MQFonts.Baloo.regular, MQFonts.Baloo.medium, MQFonts.Baloo.semibold,
                     MQFonts.Baloo.bold, MQFonts.Baloo.extrabold] {
            if !MQFonts.resolves(face) {
                fail("face does not resolve: \(face)")
                exit(1)
            }
        }

        let root = resolveOutputDirectory()
        let storybook = root.appendingPathComponent("storybook")
        let matrixDir = root.appendingPathComponent("matrix")
        let thumbs = matrixDir.appendingPathComponent("thumbs")
        for dir in [storybook, matrixDir, thumbs] {
            do {
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            } catch {
                fail("cannot create \(dir.path): \(error)")
                exit(1)
            }
        }

        for device in matrix {
            let m = device.metrics
            print("")
            print("=== \(device.name)  \(Int(device.points.width))x\(Int(device.points.height)) pt"
                  + "  \(m.isWide ? "wide" : "tall")/\(m.isRegular ? "regular" : "compact")"
                  + "  - \(device.note)")

            audit(device, m)

            for screen in screens {
                let view = screen.make(m)
                measure(view, device: device, screen: screen.key)

                if approvedSizes.contains(device.name) {
                    write(view, device: device, screen: screen.key,
                          to: storybook.appendingPathComponent(fileName(screen.key, device)),
                          scale: device.scale)
                }
                if device.keepFull {
                    write(view, device: device, screen: screen.key,
                          to: matrixDir.appendingPathComponent(fileName(screen.key, device)),
                          scale: device.scale)
                } else if !approvedSizes.contains(device.name) {
                    write(view, device: device, screen: screen.key,
                          to: thumbs.appendingPathComponent(fileName(screen.key, device)),
                          scale: thumbScale(device))
                } else {
                    // The two approved sizes get a thumbnail too, so the
                    // contact sheet is complete.
                    write(view, device: device, screen: screen.key,
                          to: thumbs.appendingPathComponent(fileName(screen.key, device)),
                          scale: thumbScale(device))
                }
            }
        }

        printTable()

        if !renderFailures.isEmpty || !overflows.isEmpty || !tapFailures.isEmpty {
            print("")
            for line in renderFailures { fail("RENDER  \(line)") }
            for line in overflows      { fail("OVERFLOW  \(line)") }
            for line in tapFailures    { fail("TAP FLOOR  \(line)") }
            fail("MATRIX GATE FAILED: \(renderFailures.count) render, "
                 + "\(overflows.count) overflow, \(tapFailures.count) tap-target failure(s).")
            exit(1)
        }
        print("")
        print("MATRIX GATE PASSED: \(matrix.count) sizes x \(screens.count) screens, "
              + "all slack >= 0, every tap target >= \(Int(MQTap.min)) pt.")
    }

    // MARK: Gates

    static func audit(_ device: MatrixDevice, _ m: MQMetrics) {
        for screen in screens {
            for target in screen.taps(m) where !target.clearsFloor {
                tapFailures.append(
                    "\(device.name) / \(screen.key) / \(target.name): "
                    + "\(fmt(target.size.width))x\(fmt(target.size.height)) pt, "
                    + "least dimension \(fmt(target.least)) < \(Int(MQTap.min))")
            }
        }
    }

    static func measure(_ view: some View, device: MatrixDevice, screen: String) {
        guard let s = MQFit.slack(view, in: device.points) else {
            renderFailures.append("\(device.name) / \(screen): measurement produced no image")
            return
        }
        slack[device.name, default: [:]][screen] = s
        if s < -0.5 {
            overflows.append("\(device.name) / \(screen): overflows by \(fmt(-s)) pt "
                             + "(wants \(fmt(device.points.height - s)) pt, "
                             + "has \(Int(device.points.height)))")
            print("  \(pad(screen, 18)) OVERFLOWS by \(fmt(-s)) pt")
        } else {
            print("  \(pad(screen, 18)) fits, \(fmt(s)) pt of slack")
        }
    }

    // MARK: Output

    static func fileName(_ screen: String, _ device: MatrixDevice) -> String {
        "\(screen)-\(device.name).png"
    }

    /// Thumbnails land at about 300 px on the long edge -- the size a photo
    /// ballot is actually ruled at on a phone.
    static func thumbScale(_ device: MatrixDevice) -> CGFloat {
        300 / max(device.points.width, device.points.height)
    }

    static func write(_ view: some View, device: MatrixDevice, screen: String,
                      to url: URL, scale: CGFloat) {
        let framed = view.frame(width: device.points.width, height: device.points.height)
        let renderer = ImageRenderer(content: framed)
        renderer.scale = scale
        renderer.proposedSize = ProposedViewSize(device.points)
        guard let cgImage = renderer.cgImage else {
            renderFailures.append("\(device.name) / \(screen): ImageRenderer produced no image")
            return
        }
        let rep = NSBitmapImageRep(cgImage: cgImage)
        rep.size = device.points
        guard let data = rep.representation(using: .png, properties: [:]) else {
            renderFailures.append("\(device.name) / \(screen): PNG encoding failed")
            return
        }
        do { try data.write(to: url) }
        catch { renderFailures.append("\(device.name) / \(screen): \(error)") }
    }

    static func printTable() {
        print("")
        print("SLACK, in points. Negative is an overflow and fails the build.")
        print("")
        let head = screens.map { pad(short($0.key), 9) }.joined(separator: " ")
        print("\(pad("device", 20)) \(head)")
        print(String(repeating: "-", count: 21 + screens.count * 10))
        for device in matrix {
            let row = screens.map { pad(slack[device.name]?[$0.key].map(fmt) ?? "-", 9) }
                .joined(separator: " ")
            print("\(pad(device.name, 20)) \(row)")
        }
    }

    static func short(_ key: String) -> String {
        switch key {
        case "patchwerk-enrage": return "enrage"
        case "battle-dusk":      return "dusk"
        default:                 return key
        }
    }

    static func fmt(_ v: CGFloat) -> String { String(format: "%.0f", v) }
    static func pad(_ s: String, _ n: Int) -> String {
        s.count >= n ? s : s + String(repeating: " ", count: n - s.count)
    }
    static func fail(_ s: String) {
        FileHandle.standardError.write(Data((s + "\n").utf8))
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
