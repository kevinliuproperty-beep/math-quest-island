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
//   MQContent       pure Swift, the seam. Foundation only, no Apple UI frameworks.
//                   It also owns the shared VALUE types every layer names (MQProfile,
//                   MQCast, MQFigure, MQReviewItem, MQMapNode, MQLandmark) - MQDesign
//                   re-exports them, so no logic package imports a UI package.
//   MQEngineJS      the JavaScriptCore implementation of MQContent.QuestionSource.
//                   JavaScriptCore is a macOS framework, so this builds and tests here.
//   MQCubeContent   the CUBE seam. Sibling of MQContent, not part of it: Cube Quest
//                   shares no type with the question engine, and one module carrying
//                   both would couple two independently-versioned bundles and make
//                   every quiz screen rebuild when a rotation matrix changes.
//   MQCubeEngineJS  the JavaScriptCore implementation of MQCubeContent.CubeEngine, over
//                   cube-engine.bundle.js - the four logic blocks extracted verbatim
//                   from cube/index.html by tools/build-cube-engine.mjs (Kevin's Q83
//                   ruling: Extract only; the vault Studio file stays canonical and the
//                   web cube stays a monolith). Its own actor, its own JSContext.
//   MQProgress      mastery, the in-session streak, the one-way scaffold fade and the
//                   JSON-on-disk store. MQContent only; it draws nothing.
//   MQDesign        the whole look: palette, type, cast, components, screens. SwiftUI,
//                   which compiles for macOS, so `swift build` and the suites run here.
//                   Its snapshot executable `mqdesign-snap` renders every screen at
//                   every size in the DEVICE MATRIX through ImageRenderer - no window,
//                   no simulator, no Xcode - and exits non-zero on an overflow or a tap
//                   target under 44 pt.
//   MQQuest         Quest mode (entrance -> map -> battle -> result) + `mqhost`, the
//                   headless macOS driver that plays it through the real engine.
//   MQPatchwerk     Kevin's timed damage mode, over MQServices' on-device board.
//   MQServices      the leaderboard seam. Foundation only. No analytics, no ads.
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
// is macOS 13 / iOS 16, so the floor and the tool agree). ONE platform list, here, for
// every module in the tree - lane/cube-extract's manifest said .iOS(.v17)/.macOS(.v14)
// and that is overruled by the hardware (Integration Phase 1, 2026-09-07).
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
        .library(name: "MQDesign", targets: ["MQDesign"]),
        // lane/progress
        .library(name: "MQProgress", targets: ["MQProgress"]),
        // end lane/progress
        // lane/quest
        .library(name: "MQQuest", targets: ["MQQuest"]),
        // end lane/quest
        // lane/patchwerk
        .library(name: "MQServices", targets: ["MQServices"]),
        .library(name: "MQPatchwerk", targets: ["MQPatchwerk"]),
        // end lane/patchwerk
        // lane/cube-extract
        .library(name: "MQCubeContent", targets: ["MQCubeContent"]),
        .library(name: "MQCubeEngineJS", targets: ["MQCubeEngineJS"])
        // end lane/cube-extract
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
            // MQContent owns the shared VALUE types every layer names (MQProfile,
            // MQCast, MQFigure, MQReviewItem); MQDesign re-exports them and keeps the
            // rendering. The arrow points this way and never back - a logic package
            // must not have to import a UI package to say a name.
            dependencies: ["MQContent"],
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
            dependencies: ["MQDesign", "MQContent"],
            path: "Packages/MQDesign/Tests/MQDesignTests"
        ),
        // lane/progress
        // Mastery, streaks, scaffold fading and local persistence. **MQContent ONLY.**
        // It used to depend on MQDesign as well, for the four value types PHASE1.md
        // named by hand (MQProfile, MQCast, MQReviewItem, MQFigure); those now live in
        // MQContent, so a persistence layer no longer drags SwiftUI and a bundled font
        // resource in behind it (Progress Refutation W8, 2026-09-07). This target must
        // never gain a UI dependency: if it compiles without one, the architecture rule
        // is enforced by the build rather than by a review note.
        .target(
            name: "MQProgress",
            dependencies: ["MQContent"],
            path: "Packages/MQProgress/Sources/MQProgress"
        ),
        .testTarget(
            name: "MQProgressTests",
            dependencies: ["MQProgress", "MQContent"],
            path: "Packages/MQProgress/Tests/MQProgressTests"
        ),
        // end lane/progress
        // macOS-only. Guarded internally by `#if os(macOS)` so an iOS build of the
        // package tree still compiles it to a stub rather than failing.
        .executableTarget(
            name: "mqdesign-snap",
            dependencies: ["MQDesign"],
            path: "Packages/MQDesign/Sources/mqdesign-snap"
        ),

        // ------------------------------------------------------------ lane/quest
        // The Quest mode (entrance -> map -> battle -> result) and the macOS host
        // that runs it. Three targets, one contiguous block, so the integrator can
        // see the whole lane in one diff hunk.
        //
        // MQQuest depends on MQContent and MQDesign and NOT on MQEngineJS: the
        // contract rule is that UI never imports the engine. `mqhost` is the
        // composition root and is the only place `JSQuestionEngine` is named.
        //
        // MQQuestTests DOES depend on MQEngineJS, deliberately. "The unit chip is
        // accepted and the distractor is rejected" is a claim about the real
        // grader; asserting it against a fake source would prove nothing at all.
        //
        // DONE ON MERGE (Integration Phase 1, 2026-09-07): "MQProgress" is in the
        // dependency list and Packages/MQQuest/Sources/MQQuest/Progress/ProgressStore.swift
        // - the lane's transcription of PHASE1.md section 3 - is deleted. There is one
        // ProgressStore protocol in this tree and MQProgress owns it.
        .target(
            name: "MQQuest",
            dependencies: ["MQContent", "MQDesign", "MQProgress"],
            path: "Packages/MQQuest/Sources/MQQuest"
        ),
        .testTarget(
            name: "MQQuestTests",
            dependencies: ["MQQuest", "MQContent", "MQDesign", "MQProgress", "MQEngineJS"],
            path: "Packages/MQQuest/Tests/MQQuestTests"
        ),
        // macOS-only, and guarded internally by `#if os(macOS)` so an iOS build
        // of the package tree still compiles it rather than failing.
        // THE COMPOSITION ROOT, and the only target that may name every module.
        // MQPatchwerk and MQServices arrive here on the rehearsal fix pass: the
        // mode had no entry point anywhere in the app, and wiring one is this
        // file's job precisely because MQQuest must NOT depend on MQPatchwerk -
        // one mode may not import another. `QRoot` takes the arena as a view
        // builder, exactly as it takes the engine as a `QuestionSource`.
        .executableTarget(
            name: "mqhost",
            dependencies: ["MQQuest", "MQEngineJS", "MQContent", "MQDesign",
                           "MQProgress", "MQPatchwerk", "MQServices"],
            path: "Host"
        ),
        // -------------------------------------------------------- end lane/quest
        // lane/patchwerk -----------------------------------------------------
        // Kevin's timed damage mode, plus the leaderboard seam it needs.
        //
        // MQServices holds the LeaderboardService protocol, the on-device
        // LocalLeaderboard (a JSON file, nothing leaves the iPad) and a compiled
        // Game Center STUB. It depends on Foundation only - deliberately not on
        // MQDesign, so a board can never start rendering itself.
        //
        // MQPatchwerk is the mode: a deterministic run engine fed by an injected
        // clock, the question feed, and the four screens. It consumes MQContent
        // (questions), MQDesign (the look) and MQServices (the board). It does
        // NOT depend on MQEngineJS - UI never imports the engine; the
        // composition root hands a QuestionSource up.
        .target(
            name: "MQServices",
            path: "Packages/MQServices/Sources/MQServices"
        ),
        .testTarget(
            name: "MQServicesTests",
            dependencies: ["MQServices"],
            path: "Packages/MQServices/Tests/MQServicesTests"
        ),
        // As with MQQuest: MQPatchwerk/Contract/ProgressStore.swift, this lane's own
        // transcription of PHASE1.md section 3, is DELETED on merge and the module
        // depends on MQProgress instead (Integration Phase 1, 2026-09-07).
        .target(
            name: "MQPatchwerk",
            dependencies: ["MQContent", "MQDesign", "MQServices", "MQProgress"],
            path: "Packages/MQPatchwerk/Sources/MQPatchwerk"
        ),
        .testTarget(
            name: "MQPatchwerkTests",
            dependencies: ["MQPatchwerk", "MQContent", "MQDesign", "MQServices", "MQProgress"],
            path: "Packages/MQPatchwerk/Tests/MQPatchwerkTests"
            // The 300-run scoring parity corpus is NOT a bundled resource: it is
            // found by walking up from `#filePath` to `tools/fixtures/`, the same
            // way MQEngineJSTests finds its own. One copy in the repository, and
            // the Swift side cannot be testing a stale duplicate of it.
        ),
        // end lane/patchwerk --------------------------------------------------

        // lane/cube-extract ---------------------------------------------------
        // Deliberately NO dependency on MQContent: the cube seam shares no type with the
        // question seam, and a dependency here would be the coupling the split into two
        // packages exists to avoid.
        .target(
            name: "MQCubeContent",
            path: "Packages/MQCubeContent/Sources/MQCubeContent"
        ),
        .testTarget(
            name: "MQCubeContentTests",
            dependencies: ["MQCubeContent"],
            path: "Packages/MQCubeContent/Tests/MQCubeContentTests"
        ),
        .target(
            name: "MQCubeEngineJS",
            dependencies: ["MQCubeContent"],
            path: "Packages/MQCubeEngineJS/Sources/MQCubeEngineJS",
            resources: [
                // Generated by `npm run build:cube-engine` at the repo root and COMMITTED.
                // `npm run check:cube-engine` (and ios/test.command) hash these bytes
                // against a fresh extraction of cube/index.html, so a stale or hand-edited
                // bundle cannot ship quietly - that hash IS this lane's answer to the
                // refutation's wound 4 (a versioned verify must cover every shipped file).
                .copy("Resources")
            ]
        ),
        .testTarget(
            name: "MQCubeEngineJSTests",
            dependencies: ["MQCubeEngineJS", "MQCubeContent"],
            path: "Packages/MQCubeEngineJS/Tests/MQCubeEngineJSTests"
        )
        // end lane/cube-extract -----------------------------------------------
    ]
)
