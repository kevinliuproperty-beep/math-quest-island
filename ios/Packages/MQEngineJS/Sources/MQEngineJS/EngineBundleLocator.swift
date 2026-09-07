import Foundation

/// Where `engine.bundle.js` lives.
///
/// The committed copy is a package resource, so a fresh clone and an Xcode build on
/// Supreme work with no Node step.
///
/// **`MQI_ENGINE_BUNDLE` is a DEBUG-ONLY override, compiled out of a release build.**
/// A shipped app that loads its interpreted code from a path an environment variable
/// names is exactly the surface DPLA 3.3.1(B) is written about: the attestation is
/// about what is inside the signed bundle, and an env-var indirection makes that
/// unattestable. The override exists so a harness can point the same Swift tests at a
/// bundle it just rebuilt - a debug-time convenience with no business in a binary that
/// goes to review.
public enum EngineBundleLocator {

    public static let resourceName = "engine.bundle"
    public static let resourceExtension = "js"

    /// Whether the `MQI_ENGINE_BUNDLE` override is compiled in at all. False in a
    /// release build; the Swift gate asserts on it so the guard cannot be dropped.
    public static var environmentOverrideIsCompiledIn: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    /// Search order: the explicit URL a caller passed, then - DEBUG builds only - the
    /// `MQI_ENGINE_BUNDLE` override, then the package resource (with and without the
    /// `Resources` subdirectory, because `.copy` and `.process` place it differently),
    /// then `dist/engine.bundle.js` walked up from the source tree, which is what makes
    /// `swift test` work from a checkout that has just run `npm run build:engine`.
    public static func locate(explicit: URL? = nil) throws -> URL {
        var searched: [String] = []

        if let explicit {
            if FileManager.default.fileExists(atPath: explicit.path) { return explicit }
            searched.append(explicit.path + "  (explicit)")
        }

        #if DEBUG
        if let env = ProcessInfo.processInfo.environment["MQI_ENGINE_BUNDLE"], !env.isEmpty {
            let url = URL(fileURLWithPath: (env as NSString).expandingTildeInPath)
            if FileManager.default.fileExists(atPath: url.path) { return url }
            searched.append(url.path + "  (MQI_ENGINE_BUNDLE, DEBUG only)")
        }
        #endif

        let bundle = Bundle.module
        for subdir in ["Resources", nil] as [String?] {
            if let url = bundle.url(forResource: resourceName, withExtension: resourceExtension, subdirectory: subdir) {
                return url
            }
            searched.append(bundle.bundlePath + "/" + (subdir.map { $0 + "/" } ?? "") + "engine.bundle.js  (package resource)")
        }

        // Repo fallback: walk up from this source file looking for dist/engine.bundle.js.
        var dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        for _ in 0..<8 {
            let candidate = dir.appendingPathComponent("dist/engine.bundle.js")
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
            searched.append(candidate.path + "  (repo dist/)")
            dir = dir.deletingLastPathComponent()
        }

        throw EngineError.bundleNotFound(searched: searched)
    }
}
