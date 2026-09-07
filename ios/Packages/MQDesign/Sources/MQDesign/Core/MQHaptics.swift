import Foundation

// The only platform-forked surface in the package. Everything else in MQDesign
// compiles unchanged for macOS (so the headless snapshot gate runs on Kai) and
// for iOS.

public enum MQHaptics {
    public enum Kind { case tap, correct, wrong, crystal }

    public static func fire(_ kind: Kind) {
        #if canImport(UIKit) && !os(watchOS)
        _fire(kind)
        #endif
    }
}

#if canImport(UIKit) && !os(watchOS)
import UIKit

private extension MQHaptics {
    // Deliberately not @MainActor-annotated: MainActor.assumeIsolated is iOS
    // 17+, and this package deploys to iOS 16. The main-thread guarantee
    // UIFeedbackGenerator needs is enforced below by hand instead.
    static func _perform(_ kind: Kind) {
        switch kind {
        case .tap:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .correct:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .wrong:
            // Deliberately NOT .error. A wrong answer in this game is a soft
            // nudge, never a buzz of failure -- see the kid-safety rule in the
            // Patchwerk design note.
            UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        case .crystal:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        }
    }

    static func _fire(_ kind: Kind) {
        if Thread.isMainThread {
            _perform(kind)
        } else {
            DispatchQueue.main.async { _perform(kind) }
        }
    }
}
#endif
