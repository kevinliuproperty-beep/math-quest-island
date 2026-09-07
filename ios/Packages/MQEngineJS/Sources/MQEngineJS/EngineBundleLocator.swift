import Foundation

/// Where `engine.bundle.js` lives.
///
/// The committed copy is a package resource, so a fresh clone and an Xcode build on
/// Supreme work with no Node step. `MQI_ENGINE_BUNDLE` overrides it, which is how a
/// harness points the same Swift tests at a bundle it just rebuilt.
public enum EngineBundleLocator {

    public static let resourceName = "engine.bundle"
    public static let resourceExtension = "js"

    /// Search order: explicit env override, then the package resource (with and
    /// without the `Resources` subdirectory, because `.copy` and `.process` place it
    /// differently), then `dist/engine.bundle.js` walked up from the source tree,
    /// which is what makes `swift test` work from a checkout that has just run
    /// `npm run build:engine`.
    public static func locate(explicit: URL? = nil) throws -> URL {
        var searched: [String] = []

        if let explicit {
            if FileManager.default.fileExists(atPath: explicit.path) { return explicit }
            searched.append(explicit.path + "  (explicit)")
        }

        if let env = ProcessInfo.processInfo.environment["MQI_ENGINE_BUNDLE"], !env.isEmpty {
            let url = URL(fileURLWithPath: (env as NSString).expandingTildeInPath)
            if FileManager.default.fileExists(atPath: url.path) { return url }
            searched.append(url.path + "  (MQI_ENGINE_BUNDLE)")
        }

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
