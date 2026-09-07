import Foundation

// Persistence. JSON on disk under the app container, written temp-then-rename; and an
// in-memory backend for tests and previews. Both sit behind `ProgressPersistence`, so
// the store - and therefore the fade law, the climb and the crystal rule - has exactly
// one implementation regardless of where the bytes go.
//
// NO SWIFTDATA, deliberately. iOS 16 is the floor (Charlotte's iPad 6), SwiftData is 17.
// It would also hide the thing this module most needs to be able to prove: what exactly
// is on disk after a crash.

// MARK: - Schema

public enum ProgressSchema {
    /// What this build writes.
    public static let current = 2

    /// v0 - no file at all, or an empty one. An empty start, never an error.
    /// v1 - the first shape: `scaffold` written as its NAME ("hint"), no `patchwerk`
    ///      array, no `lifetimeCrystals`. Shipped to nobody; kept because the migration
    ///      hook has to be exercised by something real, and a hook first used in
    ///      anger three versions later is a hook nobody has ever run.
    /// v2 - current: `scaffold` as its Int rawValue, `patchwerk` and `lifetimeCrystals`
    ///      present.
    public static let oldest = 1
}

public enum ProgressStoreError: Error, Equatable, CustomStringConvertible {
    /// The file was written by a NEWER build. Refused rather than downgraded: a silent
    /// downgrade means a decode that drops every field this build does not know about
    /// and then writes the loss back over the child's history.
    case schemaFromTheFuture(found: Int, supported: Int)
    case unreadable(String)
    case writeFailed(String)

    public var description: String {
        switch self {
        case .schemaFromTheFuture(let f, let s):
            return "progress file is schema v\(f); this build understands up to v\(s)"
        case .unreadable(let why): return "progress file unreadable: \(why)"
        case .writeFailed(let why): return "progress file not written: \(why)"
        }
    }
}

// MARK: - The seam

public protocol ProgressPersistence: Sendable {
    func load() throws -> ProgressStateBox
    func save(_ state: ProgressStateBox) throws
}

/// A public wrapper so `ProgressState` itself can stay internal. Callers never build one.
public struct ProgressStateBox: Sendable {
    var state: ProgressState
    init(_ state: ProgressState) { self.state = state }
    public static var empty: ProgressStateBox { ProgressStateBox(ProgressState()) }
}

// MARK: - In memory

/// For tests and previews. Holds the last saved value; `load` after `save` round-trips
/// through the SAME encoder the file backend uses, so a type that would fail to encode
/// on disk fails in the fast suite too rather than only on a device.
public final class InMemoryPersistence: ProgressPersistence, @unchecked Sendable {
    private let lock = NSLock()
    private var bytes: Data?

    public init(seed: Data? = nil) { self.bytes = seed }

    public func load() throws -> ProgressStateBox {
        lock.lock(); defer { lock.unlock() }
        guard let bytes else { return .empty }
        return ProgressStateBox(try ProgressCodec.decode(bytes))
    }

    public func save(_ state: ProgressStateBox) throws {
        let data = try ProgressCodec.encode(state.state)
        lock.lock(); defer { lock.unlock() }
        bytes = data
    }

    /// What is "on disk", for a test that wants to look.
    public var raw: Data? {
        lock.lock(); defer { lock.unlock() }
        return bytes
    }
}

// MARK: - On disk

/// Where a write is allowed to fail, for the torn-write test. `.none` in every build
/// that is not a test; there is no way to reach the other cases from the app.
public enum ProgressWriteFault: Sendable, Equatable {
    case none
    /// Throw after the temp file is written and flushed, before the rename. This is the
    /// window that matters: the old file is still whole and must stay whole.
    case afterTemp
    /// Write only the first half of the bytes to the temp file, then throw. A truncated
    /// temp must never be visible as state.
    case duringTemp
}

public final class FilePersistence: ProgressPersistence, @unchecked Sendable {
    public let url: URL
    private let fault: ProgressWriteFault

    /// The app container path. `Application Support` rather than `Documents`, because
    /// this is not a document the child made and should not appear in Files.
    public static func defaultURL(fileManager: FileManager = .default) throws -> URL {
        let base = try fileManager.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                       appropriateFor: nil, create: true)
            .appendingPathComponent("MathQuestIsland", isDirectory: true)
        try fileManager.createDirectory(at: base, withIntermediateDirectories: true)
        return base.appendingPathComponent("progress.json")
    }

    public init(url: URL, fault: ProgressWriteFault = .none) {
        self.url = url
        self.fault = fault
    }

    public func load() throws -> ProgressStateBox {
        sweepTemps()
        guard FileManager.default.fileExists(atPath: url.path) else { return .empty }   // v0
        let data: Data
        do { data = try Data(contentsOf: url) }
        catch { throw ProgressStoreError.unreadable(String(describing: error)) }
        if data.isEmpty { return .empty }                                               // v0
        return ProgressStateBox(try ProgressCodec.decode(data))
    }

    public func save(_ box: ProgressStateBox) throws {
        let data = try ProgressCodec.encode(box.state)
        let dir = url.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let temp = dir.appendingPathComponent(url.lastPathComponent + ".tmp-" + UUID().uuidString)

        do {
            if fault == .duringTemp {
                try data.prefix(data.count / 2).write(to: temp)
                throw ProgressStoreError.writeFailed("injected fault: duringTemp")
            }
            try data.write(to: temp)
            // fsync BEFORE the rename. `Data.write(options: .atomic)` would also do a
            // temp+rename, but it does not promise the bytes have reached the disk, so a
            // power cut can leave a renamed-but-empty file - a whole history replaced by
            // nothing. Flushing first makes the rename the only unfinished step, and a
            // rename is atomic.
            let handle = try FileHandle(forWritingTo: temp)
            try handle.synchronize()
            try handle.close()

            if fault == .afterTemp {
                throw ProgressStoreError.writeFailed("injected fault: afterTemp")
            }

            // rename(2), not moveItem: moveItem fails when the destination exists, and
            // remove-then-move has a window where there is no file at all.
            let ok = url.withUnsafeFileSystemRepresentation { dst in
                temp.withUnsafeFileSystemRepresentation { src in
                    rename(src!, dst!) == 0
                }
            }
            guard ok else { throw ProgressStoreError.writeFailed("rename failed, errno \(errno)") }
        } catch {
            try? FileManager.default.removeItem(at: temp)
            throw error is ProgressStoreError ? error
                : ProgressStoreError.writeFailed(String(describing: error))
        }
    }

    /// Temp files from a write that died are litter, never state. Cleared on load so a
    /// crash loop cannot fill the container.
    private func sweepTemps() {
        let dir = url.deletingLastPathComponent()
        let prefix = url.lastPathComponent + ".tmp-"
        guard let names = try? FileManager.default.contentsOfDirectory(atPath: dir.path) else { return }
        for name in names where name.hasPrefix(prefix) {
            try? FileManager.default.removeItem(at: dir.appendingPathComponent(name))
        }
    }
}

// MARK: - Codec + the migration hook

enum ProgressCodec {

    static func encode(_ state: ProgressState) throws -> Data {
        var object: [String: Any] = ["schema": ProgressSchema.current]
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .secondsSince1970
        let body = try encoder.encode(state)
        guard let dict = try JSONSerialization.jsonObject(with: body) as? [String: Any] else {
            throw ProgressStoreError.writeFailed("state did not encode to an object")
        }
        for (k, v) in dict { object[k] = v }
        return try JSONSerialization.data(withJSONObject: object,
                                          options: [.sortedKeys, .prettyPrinted])
    }

    static func decode(_ data: Data) throws -> ProgressState {
        guard let raw = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw ProgressStoreError.unreadable("not a JSON object")
        }
        let version = (raw["schema"] as? Int) ?? 0
        if version > ProgressSchema.current {
            throw ProgressStoreError.schemaFromTheFuture(found: version,
                                                         supported: ProgressSchema.current)
        }
        let upgraded = try migrate(raw, from: version)
        let body = try JSONSerialization.data(withJSONObject: upgraded)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        do { return try decoder.decode(ProgressState.self, from: body) }
        catch { throw ProgressStoreError.unreadable(String(describing: error)) }
    }

    /// THE MIGRATION HOOK. One step per version, applied in order, each one total: it
    /// takes a document that decoded as the older schema and returns one this build can
    /// decode. Deliberately at the JSON layer rather than as a pile of optional Swift
    /// properties - optionals leak the old shape into the model forever.
    static func migrate(_ input: [String: Any], from version: Int) throws -> [String: Any] {
        var doc = input
        var v = version

        // v0 -> v1. There is no v0 document; a missing or empty file is handled before
        // this is reached, and anything else claiming v0 is an unstamped write, which is
        // treated as an empty start rather than guessed at.
        if v == 0 {
            doc = ["schema": 1, "profiles": []]
            v = 1
        }

        // v1 -> v2. `scaffold` was the level's NAME; `patchwerk` and `lifetimeCrystals`
        // did not exist.
        if v == 1 {
            var profiles = (doc["profiles"] as? [[String: Any]]) ?? []
            for i in profiles.indices {
                if var skills = profiles[i]["skills"] as? [String: [String: Any]] {
                    for (key, var skill) in skills {
                        if let name = skill["scaffold"] as? String {
                            skill["scaffold"] = Self.scaffoldRaw(name)
                        }
                        if skill["bestPool"] == nil { skill["bestPool"] = skill["pool"] ?? 1 }
                        skills[key] = skill
                    }
                    profiles[i]["skills"] = skills
                }
                if profiles[i]["patchwerk"] == nil { profiles[i]["patchwerk"] = [] }
                if profiles[i]["lifetimeCrystals"] == nil {
                    // Recover it from the sessions that are there rather than zeroing a
                    // child's crystal count on upgrade.
                    let sessions = (profiles[i]["sessions"] as? [[String: Any]]) ?? []
                    profiles[i]["lifetimeCrystals"] = sessions.reduce(0) { $0 + (($1["crystals"] as? Int) ?? 0) }
                }
                if profiles[i]["sessions"] == nil { profiles[i]["sessions"] = [] }
            }
            doc["profiles"] = profiles
            doc["schema"] = 2
            v = 2
        }

        return doc
    }

    /// Names as v1 wrote them. An unknown name reads as `.full`, which is the SAFE
    /// direction: a migration is not allowed to fade a scaffold the child never faded.
    private static func scaffoldRaw(_ name: String) -> Int {
        switch name.lowercased() {
        case "none": return ScaffoldLevel.none.rawValue
        case "hint": return ScaffoldLevel.hint.rawValue
        case "partial": return ScaffoldLevel.partial.rawValue
        default: return ScaffoldLevel.full.rawValue
        }
    }
}
