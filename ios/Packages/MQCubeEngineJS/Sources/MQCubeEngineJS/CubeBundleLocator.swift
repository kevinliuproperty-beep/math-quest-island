import Foundation

/// Where `cube-engine.bundle.js` lives.
///
/// The committed copy is a package resource, so a fresh clone and an Xcode build on
/// Supreme work with no Node step - and, more importantly, the bytes that ship inside the
/// signed app are the bytes in the repo. Under DPLA 3.3.1(B) what is in that blob is the
/// thing being attested to.
///
/// **`MQ_CUBE_ENGINE_BUNDLE` is a DEBUG-ONLY override, compiled out of a release build.**
/// A shipped app that loads its interpreted code from a path an environment variable names
/// is exactly the surface that clause is written about. The override exists so a harness
/// can point the same Swift tests at a bundle it has just rebuilt.
public enum CubeBundleLocator {

    public static let resourceName = "cube-engine.bundle"
    public static let resourceExtension = "js"

    /// Whether the override is compiled in at all. False in release; the Swift gate
    /// asserts on it so the guard cannot be quietly dropped.
    public static var environmentOverrideIsCompiledIn: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    public static func locate(explicit: URL? = nil) throws -> URL {
        var searched: [String] = []

        if let explicit {
            if FileManager.default.fileExists(atPath: explicit.path) { return explicit }
            searched.append(explicit.path + "  (explicit)")
        }

        #if DEBUG
        if let env = ProcessInfo.processInfo.environment["MQ_CUBE_ENGINE_BUNDLE"], !env.isEmpty {
            let url = URL(fileURLWithPath: (env as NSString).expandingTildeInPath)
            if FileManager.default.fileExists(atPath: url.path) { return url }
            searched.append(url.path + "  (MQ_CUBE_ENGINE_BUNDLE, DEBUG only)")
        }
        #endif

        let bundle = Bundle.module
        for subdir in ["Resources", nil] as [String?] {
            if let url = bundle.url(forResource: resourceName, withExtension: resourceExtension, subdirectory: subdir) {
                return url
            }
            searched.append(bundle.bundlePath + "/" + (subdir.map { $0 + "/" } ?? "") + "cube-engine.bundle.js  (package resource)")
        }

        // Repo fallback: walk up from this source file looking for dist/. That is what
        // makes `swift test` work in a checkout that has just run `npm run build:cube-engine`.
        var dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        for _ in 0..<8 {
            let candidate = dir.appendingPathComponent("dist/cube-engine.bundle.js")
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
            searched.append(candidate.path + "  (repo dist/)")
            dir = dir.deletingLastPathComponent()
        }

        throw CubeEngineError.bundleNotFound(searched: searched)
    }

    /// Walk up from this source file to the repo root, for a test that needs a fixture.
    /// Returns nil in a shipped app, where there is no repo.
    public static func repoRoot() -> URL? {
        var dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        for _ in 0..<10 {
            if FileManager.default.fileExists(atPath: dir.appendingPathComponent("package.json").path)
                && FileManager.default.fileExists(atPath: dir.appendingPathComponent("cube/index.html").path) {
                return dir
            }
            dir = dir.deletingLastPathComponent()
        }
        return nil
    }
}
