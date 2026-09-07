// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MQDesign",
    platforms: [
        .macOS(.v13),
        .iOS(.v16)
    ],
    products: [
        .library(name: "MQDesign", targets: ["MQDesign"])
    ],
    targets: [
        .target(
            name: "MQDesign",
            path: "Sources/MQDesign",
            // Bundled OFL display faces. Registered at runtime with
            // CTFontManagerRegisterFontsForURL so they resolve identically under
            // ImageRenderer on macOS (headless taste gate) and on iOS.
            resources: [.process("Resources")]
        ),
        // macOS-only snapshot renderer. Uses SwiftUI ImageRenderer so the design
        // system can be judged as images on a box with no Xcode and no window.
        .executableTarget(
            name: "mqdesign-snap",
            dependencies: ["MQDesign"],
            path: "Sources/mqdesign-snap"
        )
    ]
)
