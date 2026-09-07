import SwiftUI
import MQDesign

/// **The device matrix, as a value MQQuest can iterate.**
///
/// `mqdesign-snap`'s `matrix` is inside an executable target, so nothing could
/// import it and the Quest fit gate measured the three sizes it happened to list
/// - which is how the typed battle came to overflow the 9.7" iPad in PORTRAIT by
/// 107 pt with the gate green (Quest Refutation K1). The twelve rows here are
/// that matrix verbatim, safe-area insets included, and `QDeviceMatrixTests`
/// asserts the names still line up with `QDriveScript.devices`.
public struct QDevice: Sendable, Equatable {
    public let name: String
    public let points: CGSize
    public let safeTop: CGFloat
    public let safeBottom: CGFloat

    public var insets: MQInsets { MQInsets(top: safeTop, bottom: safeBottom) }
    public var metrics: MQMetrics { MQMetrics.device(points, insets: insets) }
}

public enum QDevices {
    /// All twelve, exactly as `ios/Packages/MQDesign/Sources/mqdesign-snap`
    /// renders them.
    public static let matrix: [QDevice] = [
        QDevice(name: "ipad97-landscape", points: CGSize(width: 1024, height: 768),
                safeTop: 20, safeBottom: 0),
        QDevice(name: "ipad97-portrait", points: CGSize(width: 768, height: 1024),
                safeTop: 20, safeBottom: 0),
        QDevice(name: "ipad11-landscape", points: CGSize(width: 1194, height: 834),
                safeTop: 24, safeBottom: 20),
        QDevice(name: "ipad11-portrait", points: CGSize(width: 834, height: 1194),
                safeTop: 24, safeBottom: 20),
        QDevice(name: "ipad13-landscape", points: CGSize(width: 1366, height: 1024),
                safeTop: 24, safeBottom: 20),
        QDevice(name: "ipad13-portrait", points: CGSize(width: 1024, height: 1366),
                safeTop: 24, safeBottom: 20),
        QDevice(name: "ipadmini-landscape", points: CGSize(width: 1133, height: 744),
                safeTop: 24, safeBottom: 20),
        QDevice(name: "ipadmini-portrait", points: CGSize(width: 744, height: 1133),
                safeTop: 24, safeBottom: 20),
        QDevice(name: "ipad11-split-half", points: CGSize(width: 507, height: 834),
                safeTop: 24, safeBottom: 20),
        QDevice(name: "iphone-se", points: CGSize(width: 375, height: 667),
                safeTop: 20, safeBottom: 0),
        QDevice(name: "iphone15", points: CGSize(width: 393, height: 852),
                safeTop: 59, safeBottom: 34),
        QDevice(name: "iphone15-pro-max", points: CGSize(width: 430, height: 932),
                safeTop: 59, safeBottom: 34)
    ]

    /// The topics whose questions are TYPED, so the keypad and the chip row are
    /// drawn. Measured off the shipped bundle - `QKeypadPolicy.byTopic` is the
    /// same list with its keys, and a test holds the two together.
    public static let typedTopics = ["p4area", "p3money", "p5decimals", "p5rate",
                                     "p5fractions", "p5volume", "p5percent",
                                     "p5triangle", "p5numbers", "p4fractions",
                                     "p4ops", "p3divide", "heuristics"]
}
