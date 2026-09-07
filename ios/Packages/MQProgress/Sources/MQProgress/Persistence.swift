import Foundation
#if canImport(UIKit)
import UIKit
#endif

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
    public static let current = 3

    /// v0 - no file at all, or an empty one. An empty start, never an error. An
    ///      unstamped document that HAS profiles in it is read as v1, not erased
    ///      (Progress Refutation W11).
    /// v1 - the first shape: `scaffold` written as its NAME ("hint"), no `patchwerk`
    ///      array, no `lifetimeCrystals`. Shipped to nobody; kept because the migration
    ///      hook has to be exercised by something real, and a hook first used in
    ///      anger three versions later is a hook nobody has ever run.
    /// v2 - `scaffold` as its Int rawValue, `patchwerk` and `lifetimeCrystals` present.
    /// v3 - current, from the fix pass of 2026-09-07: `fadeRun` on every skill (the
    ///      scaffold ladder's run counter), and `StoredReview` carries the engine's own
    ///      `figure` spec instead of six flattened columns modelling MQDesign's
    ///      three-case `MQFigure`.
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
    private var saves = 0

    public init(seed: Data? = nil) { self.bytes = seed }

    /// How many times the store has actually written. The witness the coalescing test
    /// needs: "fewer writes" is only a claim until something counts them.
    public var saveCount: Int {
        lock.lock(); defer { lock.unlock() }
        return saves
    }

    public func load() throws -> ProgressStateBox {
        lock.lock(); defer { lock.unlock() }
        guard let bytes else { return .empty }
        return ProgressStateBox(try ProgressCodec.decode(bytes))
    }

    public func save(_ state: ProgressStateBox) throws {
        let data = try ProgressCodec.encode(state.state)
        lock.lock(); defer { lock.unlock() }
        bytes = data
        saves += 1
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
            // The child's name and their whole learning history are in this file. Marked
            // AFTER the rename, on the live file, and on every write - a resource value
            // is a property of the inode, and `rename(2)` puts a new inode in place.
            Self.protect(url)
        } catch {
            try? FileManager.default.removeItem(at: temp)
            throw error is ProgressStoreError ? error
                : ProgressStoreError.writeFailed(String(describing: error))
        }
    }

    /// **"No accounts, no server, no child data anywhere but this iPad."** That sentence
    /// is printed three times in this module and it was FALSE as written: the file landed
    /// at mode 0644 with `isExcludedFromBackup == false` and no `NSFileProtection`
    /// attribute, so a child's name and their whole learning history rode into iCloud and
    /// iTunes backups (Progress Refutation W6, 2026-09-07). Two properties fix it:
    ///
    /// * **excluded from backup** - `URLResourceValues.isExcludedFromBackup`, available
    ///   on both platforms, so the claim is true on the device AND checkable on the Kai
    ///   gate. This is a deliberate product choice, not just a privacy one: a restored
    ///   backup would hand a child back training wheels and a pool they had climbed past,
    ///   which is the same wound as W10 arriving by a different road.
    /// * **complete file protection** - `FileAttributeKey.protectionKey`, which exists
    ///   ONLY where UIKit does. On macOS there is no equivalent (FileVault is a volume
    ///   property, not a per-file one), so the Kai gate can assert the exclusion and
    ///   nothing else, and this method says so rather than pretending.
    ///
    /// Best-effort by design: a store that refused to save because it could not set an
    /// attribute would lose the child's answer to protect it.
    static func protect(_ url: URL) {
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var target = url
        try? target.setResourceValues(values)

        #if canImport(UIKit)
        // `.completeFileProtection`: unreadable while the device is locked. The app never
        // reads this file in the background - there is no background mode in it at all -
        // so the strictest class is the right one.
        try? FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
        #else
        // macOS: no per-file protection class exists. Nothing to set, nothing claimed.
        #endif
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

        // v0 -> v1. A missing or empty file is handled before this is reached.
        //
        // An UNSTAMPED but otherwise valid document used to be replaced wholesale with
        // `{"schema":1,"profiles":[]}`: the store came up with zero profiles and the
        // next `record()` wrote that over the child's history. A file from the FUTURE
        // was refused loudly; a file with a missing stamp was erased quietly, and it was
        // the one path in the module where data was lost rather than refused (Progress
        // Refutation W11, 2026-09-07).
        //
        // A document carrying profiles is now read as v1 - the oldest shape this build
        // knows - and migrated forward like any other. Only a document with nothing in
        // it is an empty start.
        if v == 0 {
            let profiles = (doc["profiles"] as? [[String: Any]]) ?? []
            if profiles.isEmpty {
                doc = ["schema": 1, "profiles": []]
            } else {
                doc["schema"] = 1
            }
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

        // v2 -> v3. The scaffold ladder gained its run counter, and a review row now
        // carries the engine's own `figure` spec.
        if v == 2 {
            var profiles = (doc["profiles"] as? [[String: Any]]) ?? []
            for i in profiles.indices {
                if var skills = profiles[i]["skills"] as? [String: [String: Any]] {
                    for (key, var skill) in skills {
                        // A skill mid-ladder in a v2 file has no run recorded, so it
                        // starts the next run from zero. That is the SAFE direction: it
                        // delays the next fade, and a fade is the thing that cannot be
                        // undone.
                        if skill["fadeRun"] == nil { skill["fadeRun"] = 0 }
                        skills[key] = skill
                    }
                    profiles[i]["skills"] = skills
                }
                // The old flattened figure columns (`figureKind` / `figureLong` /
                // `figureWide` / `figureRatio` / `figureParts` / `figureFilled`) are
                // DROPPED rather than reconstructed. `figureLong` was the rendered string
                // "14 cm", and turning that back into an engine spec means parsing a
                // label - guessing. `figure` is optional, so a v2 review row simply comes
                // back without a diagram, which is exactly what a v2 row was worth: the
                // shape it modelled could only hold two of the engine's eight kinds. v2
                // shipped to nobody.
                if var sessions = profiles[i]["sessions"] as? [[String: Any]] {
                    for j in sessions.indices {
                        guard var reviews = sessions[j]["reviews"] as? [[String: Any]] else { continue }
                        for k in reviews.indices {
                            for dead in ["figureKind", "figureLong", "figureWide",
                                         "figureRatio", "figureParts", "figureFilled"] {
                                reviews[k].removeValue(forKey: dead)
                            }
                        }
                        sessions[j]["reviews"] = reviews
                    }
                    profiles[i]["sessions"] = sessions
                }
            }
            doc["profiles"] = profiles
            doc["schema"] = 3
            v = 3
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
