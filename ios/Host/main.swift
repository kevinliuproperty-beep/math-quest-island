// mqhost - the macOS host for the Quest flow.
//
// Two jobs, one binary:
//
//   swift run mqhost                          a window, the whole flow, real engine
//   swift run mqhost --drive <script.json> --out <dir>
//                                             headless: play a scripted session,
//                                             write a PNG per screen and a JSON
//                                             transcript, exit
//
// WHY IT EXISTS. Xcode lives on Mac Mini Supreme; Kai has Command Line Tools and
// no screen. Without this, every claim about the Quest flow on Kai would be a
// claim about types - "the state machine compiles" - and none about the thing a
// child touches. With it, a refuter or a dress rehearsal can LIVE a session on
// this box: twelve real questions from the real 226-generator engine, answered
// through the real keypad, rendered to PNGs anyone can open.
//
// THIS IS THE COMPOSITION ROOT, and it is the only file in this lane that imports
// MQEngineJS. The contract rule from the iOS brief is that UI never does: MQQuest
// takes an `any QuestionSource` and does not know what is behind it, which is
// what makes a Swift port or a fixture source a drop-in.

import Foundation
import SwiftUI
import MQContent
import MQDesign
import MQEngineJS
import MQQuest
#if os(macOS)
import AppKit
#endif

// MARK: - Arguments

struct HostArgs {
    var drive: String?
    var out: String = FileManager.default.currentDirectoryPath + "/mqhost-out"
    var device: String?
    var node: String?
    var items: Int?
    var seed: UInt64?
    var strategy: String?
    var palette: String?
    var scale: Double?
    var help = false

    static func parse(_ argv: [String]) -> HostArgs {
        var a = HostArgs()
        var i = 0
        func next() -> String? { i += 1; return i < argv.count ? argv[i] : nil }
        while i < argv.count {
            switch argv[i] {
            case "--drive":    a.drive = next()
            case "--out":      a.out = next() ?? a.out
            case "--device":   a.device = next()
            case "--node":     a.node = next()
            case "--items":    a.items = Int(next() ?? "")
            case "--seed":     a.seed = UInt64(next() ?? "")
            case "--strategy": a.strategy = next()
            case "--palette":  a.palette = next()
            case "--scale":    a.scale = Double(next() ?? "")
            case "-h", "--help": a.help = true
            default: break
            }
            i += 1
        }
        return a
    }
}

let usage = """
mqhost - Math Quest Island, Quest flow, on macOS.

  swift run mqhost
      Open a window and play. Real engine, in-memory progress store.

  swift run mqhost --drive <script.json> --out <dir>
      Headless. Play the script, write one PNG per screen plus transcript.json.

  Overrides (also usable WITHOUT --drive-ing a file, with --node):
      --device <name|WxH>   ipad97-landscape (default), ipad97-portrait,
                            ipad11-landscape, ipad11-portrait, ipad13-landscape,
                            ipadmini-portrait, iphone-se, iphone15
      --node <topic>        engine topic id, e.g. p4area
      --items <n>           set size (default 12)
      --seed <n>            damage rolls and the `random` strategy
      --strategy <s>        always-correct | always-wrong | wrong-unit | random
      --palette noon|dusk
      --scale <n>           render scale (default 1)

  Script shape:
      { "name":"p4-12", "seed":20260907, "device":"ipad97-landscape",
        "profile":{"name":"Charlotte","cast":"unicorn","level":"P4"},
        "node":"p4area", "items":12,
        "strategies":["always-correct","wrong-unit","always-wrong","random"] }
"""

let args = HostArgs.parse(Array(CommandLine.arguments.dropFirst()))

if args.help {
    print(usage)
    exit(0)
}

// MARK: - Headless drive

func loadScript(_ args: HostArgs) throws -> QDriveScript {
    var script: QDriveScript
    if let path = args.drive {
        let data = try Data(contentsOf: URL(fileURLWithPath: path))
        script = try JSONDecoder().decode(QDriveScript.self, from: data)
    } else {
        script = QDriveScript(
            name: args.node ?? "session",
            seed: args.seed ?? 20_260_907,
            device: args.device ?? "ipad97-landscape",
            profile: QDriveProfile(name: "Charlotte", cast: "unicorn", level: "P4"),
            node: args.node ?? "p4area",
            items: args.items ?? 12,
            strategy: QStrategy(rawValue: args.strategy ?? "always-correct") ?? .alwaysCorrect)
    }
    // Command-line overrides win over the file, so one script can be re-run at
    // another size or another strategy without editing it.
    if let d = args.device { script.device = d }
    if let n = args.node { script.node = n }
    if let n = args.items { script.items = n }
    if let s = args.seed { script.seed = s }
    if let s = args.strategy, let parsed = QStrategy(rawValue: s) {
        script.strategy = parsed; script.strategies = nil
    }
    if let p = args.palette { script.palette = p }
    if let s = args.scale { script.scale = CGFloat(s) }
    return script
}

@MainActor
func drive() async -> Int32 {
    do {
        let script = try loadScript(args)
        let engine = try JSQuestionEngine()
        let build = try await engine.engineBuild()
        let out = URL(fileURLWithPath: args.out, isDirectory: true)
        FileHandle.standardError.write(Data("""
        mqhost: engine \(build.stamp) payload \(build.payloadHash) \
        (\(build.topicCount) topics, \(build.distinctGenerators) generators)
        mqhost: driving "\(script.name)" node=\(script.node) items=\(script.items) \
        device=\(script.device) seed=\(script.seed)

        """.utf8))

        let driver = QDriver(source: engine, script: script, outDir: out)
        let result = try await driver.run()
        let t = result.transcript
        print("""
        mqhost: wrote \(result.pngPaths.count) PNG(s) and the transcript to
                \(out.path)
        mqhost: \(t.correct)/\(t.total) correct, best streak \(t.bestStreak), \
        crystals \(t.crystals), hero HP \(t.heroHP), \(t.reviewCount) for review
        mqhost: transcript \(result.transcriptPath)
        """)
        return 0
    } catch {
        FileHandle.standardError.write(Data("mqhost: \(error)\n".utf8))
        return 1
    }
}

// MARK: - Window

#if os(macOS)
@MainActor
final class HostWindow: NSObject, NSApplicationDelegate {
    var window: NSWindow?
    let model: QQuestModel

    init(model: QQuestModel) { self.model = model }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let size = CGSize(width: 1024, height: 768)
        let w = NSWindow(
            contentRect: NSRect(origin: .zero, size: size),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        w.title = "Math Quest Island"
        w.center()
        // The metrics are built ONCE from the container size and passed down,
        // per PHASE1: a screen never reads a GeometryReader, because an
        // unbounded proposal reports zero and the fit gate would measure nothing.
        w.contentView = NSHostingView(
            rootView: HostRoot(model: model, initial: size))
        w.makeKeyAndOrderFront(nil)
        window = w
        NSApp.activate(ignoringOtherApps: true)
        Task { await model.load() }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }
}

/// The one place a `GeometryReader` is legal: the container. It measures the
/// window and builds `MQMetrics` once, exactly as the iOS app's scene root will.
struct HostRoot: View {
    @ObservedObject var model: QQuestModel
    let initial: CGSize

    var body: some View {
        GeometryReader { proxy in
            let size = proxy.size.width > 1 ? proxy.size : initial
            QRoot(model: model, metrics: MQMetrics.device(size))
                .frame(width: size.width, height: size.height)
        }
    }
}
#endif

// MARK: - Entry

if args.drive != nil || args.node != nil {
    let status = await drive()
    exit(status)
}

#if os(macOS)
_ = await MainActor.run { MQFonts.register() }
let engine: any QuestionSource
do {
    engine = try JSQuestionEngine()
} catch {
    FileHandle.standardError.write(Data("mqhost: \(error)\n".utf8))
    exit(1)
}
let store = InMemoryProgressStore()
_ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
_ = await store.addProfile(name: "Ben", cast: .turtle, level: "P3")
let model = await MainActor.run {
    QQuestModel(source: engine, store: store)
}
let app = NSApplication.shared
let delegate = await MainActor.run { HostWindow(model: model) }
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
#else
print(usage)
#endif
