// swift-tools-version: 6.0
//
// Math Quest Island - native iOS packages.
//
// ONE manifest, one target per module, each module living in its own directory under
// ios/Packages/. That keeps the module = package = lane boundary of the iOS brief while
// leaving a single test command at ios/ that runs every module's suite - which is the
// gate Kai can actually hold (Command Line Tools, no Xcode, macOS target only).
//
// Kai-testable today:
//   MQContent   pure Swift, the seam. Foundation only, no Apple UI frameworks.
//   MQEngineJS  the JavaScriptCore implementation of MQContent.QuestionSource.
//               JavaScriptCore is a macOS framework, so this builds and tests here.
//   MQDesign    the whole look: palette, type, cast, components, screens. SwiftUI,
//               which compiles for macOS, so `swift build` and the suites run here.
//               Its snapshot executable `mqdesign-snap` renders every screen at every
//               size in the DEVICE MATRIX through ImageRenderer - no window, no
//               simulator, no Xcode - and exits non-zero on an overflow or a tap
//               target under 44 pt.
//
// MQDesign HAS NO MANIFEST OF ITS OWN. It arrived on lane/design-sample as a nested
// package (ios/Packages/MQDesign/Package.swift) so the lane could run before this root
// manifest existed. That file is DELETED here on purpose: two manifests describing one
// target is two places for the deployment target, the resource rule and the platform
// list to drift, and the whole point of ios/Package.swift is that Supreme adds ONE
// local package to an Xcode project. Run the snapshot tool from ios/:
//     swift run mqdesign-snap            (writes ios/snapshots/)
//
// DEPLOYMENT TARGET: iOS 16, and that is a hardware fact, not a preference.
// Charlotte's iPad is a 6th-generation 9.7" (1024x768 pt), which tops out at iPadOS 17
// and is the device this whole app exists for. iOS 16 leaves margin under that. Every
// iOS 17+ API is therefore banned outright rather than guarded: `#available` islands in
// a design system produce a look that silently differs by device, which is worse than
// not shipping the API. macOS 13 is the matching floor for the Kai gate (ImageRenderer
// is macOS 13 / iOS 16, so the floor and the tool agree).
//
// RUNNING THE TESTS ON KAI
//   ./test.command                (from ios/)   <- THE GATE. Use this.
//   swift test --toolset kai-toolset.json       <- runs the suites; is NOT the gate
// Command Line Tools ships Testing.framework outside every default search path and no
// XCTest at all, so a bare `swift test` on Kai FAILS TO BUILD: the suites
// `import Testing` unconditionally, giving `error: no such module 'Testing'` and exit 1.
// (An earlier version of this comment said it compiled the suites and silently ran ZERO
// of them. Measured at d060bb3, that is not what happens - it is loud.) kai-toolset.json
// supplies the search path and rpaths; test.command applies it when the ACTIVE TOOLCHAIN
// has no XCTest, not when /Applications/Xcode.app happens to be missing.
//
// `swift test` alone is not the gate even where it runs: the gate is test.command, which
// also verifies the committed engine bundle's own bytes against js/ and FAILS when zero
// tests execute - a --filter matching nothing used to exit 0. See ios/gate-floor.txt.
// Deliberately no `unsafeFlags` in this manifest: they would follow the package into
// every consumer, and this manifest is meant to be added to an Xcode project as-is.
//
// FOR SUPREME (the Xcode box): add the app target on top WITHOUT touching these
// modules. File > Add Package Dependencies > Add Local... and pick the `ios` directory;
// the app target then depends on the `MQContent` product AND ONLY THAT - the contract
// rule is that UI never imports MQEngineJS. The composition root wires one
// `JSQuestionEngine` at launch and hands it up as a `QuestionSource`.
// New modules (MQDesign, MQProgress, MQQuest, MQPatchwerk, MQFigures, MQServices) are
// added here as further targets + products in the same shape.
import PackageDescription

let package = Package(
    name: "MathQuestIsland",
    platforms: [
        .iOS(.v16),    // Charlotte's iPad 6 caps at iPadOS 17; 16 is the floor we hold
        .macOS(.v13)   // macOS is the Kai gate: the suites run on this platform
    ],
    products: [
        .library(name: "MQContent", targets: ["MQContent"]),
        .library(name: "MQEngineJS", targets: ["MQEngineJS"]),
        .library(name: "MQDesign", targets: ["MQDesign"])
    ],
    targets: [
        .target(
            name: "MQContent",
            path: "Packages/MQContent/Sources/MQContent"
        ),
        .testTarget(
            name: "MQContentTests",
            dependencies: ["MQContent"],
            path: "Packages/MQContent/Tests/MQContentTests"
        ),
        .target(
            name: "MQEngineJS",
            dependencies: ["MQContent"],
            path: "Packages/MQEngineJS/Sources/MQEngineJS",
            resources: [
                // Generated by `npm run build:engine` at the repo root and COMMITTED, so
                // a fresh clone - and Xcode on Supreme - builds with no Node step.
                .copy("Resources")
            ]
        ),
        .testTarget(
            name: "MQEngineJSTests",
            dependencies: ["MQEngineJS", "MQContent"],
            path: "Packages/MQEngineJS/Tests/MQEngineJSTests"
        ),
        .target(
            name: "MQDesign",
            path: "Packages/MQDesign/Sources/MQDesign",
            resources: [
                // The bundled OFL display face (Baloo 2). Registered at RUNTIME with
                // CTFontManagerRegisterFontsForURL rather than an Info.plist key,
                // because the gate renders headlessly with no app bundle at all - and
                // the same call is what iOS will use.
                .process("Resources")
            ]
        ),
        .testTarget(
            name: "MQDesignTests",
            dependencies: ["MQDesign"],
            path: "Packages/MQDesign/Tests/MQDesignTests"
        ),
        // macOS-only. Guarded internally by `#if os(macOS)` so an iOS build of the
        // package tree still compiles it to a stub rather than failing.
        .executableTarget(
            name: "mqdesign-snap",
            dependencies: ["MQDesign"],
            path: "Packages/MQDesign/Sources/mqdesign-snap"
        )
    ]
)
