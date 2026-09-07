import Foundation

/// The device board. One JSON file, no network, no accounts.
///
/// **Privacy is the design, not a setting.** Nothing in this type can reach the
/// network: there is no URLSession, no endpoint and no identifier beyond a name a
/// child typed on this iPad. That is what lets the App Store privacy label say
/// "Data Not Collected" (see the App Store Rules Check note: the label survives
/// only while the app's own storage never leaves the device).
///
/// An `actor` because the file is shared mutable state and a run result and a
/// board view can ask for it in the same frame.
public actor LocalLeaderboard: LeaderboardService {

    /// Rows kept per bucket. The web keeps 60 rows across ALL Patchwerk buckets
    /// (`DB.pwFame`), which quietly evicts a tier nobody has played lately; 20
    /// PER BUCKET is the brief's number and it cannot starve a bucket.
    public static let capacity = 20

    public nonisolated var leavesTheDevice: Bool { false }

    /// The only schema this build can read. A file carrying anything else is
    /// treated exactly like a corrupt one: quarantined, never overwritten.
    /// `Stored.schema` used to be written and never read, which is the same thing
    /// as not having a version at all.
    public static let schema = 1

    private let url: URL
    private var buckets: [String: [LeaderboardEntry]]
    private var loaded = false
    /// Set when a file could not be read AND could not be moved aside. While it is
    /// true nothing is written: an unreadable board that we failed to preserve is
    /// the one file that must not be clobbered by the next submit.
    private var writesRefused = false
    /// Where the last unreadable board was preserved, for the test and the log.
    private var quarantined: URL?

    /// Where the board lives by default: Application Support, which is backed up
    /// and is not user-visible. Passing a URL is what the tests do.
    public static func defaultURL(fileManager: FileManager = .default) -> URL {
        let base = (try? fileManager.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                         appropriateFor: nil, create: true))
            ?? fileManager.temporaryDirectory
        return base.appendingPathComponent("MathQuestIsland", isDirectory: true)
                   .appendingPathComponent("patchwerk-board.json")
    }

    public init(url: URL? = nil) {
        self.url = url ?? LocalLeaderboard.defaultURL()
        self.buckets = [:]
    }

    // MARK: - Persistence

    private struct Stored: Codable {
        var schema: Int
        var buckets: [String: [LeaderboardEntry]]
    }

    /// A board this build cannot read is NEVER DESTROYED.
    ///
    /// It used to be. `load()` returned an empty board on any decode failure and
    /// the next `save()` wrote over the file: measured on 2026-09-07, five real
    /// runs (1,255 B) became one row (292 B) on one submit, with no warning and no
    /// backup - silent data loss on the path a child had just finished a run on,
    /// which is the exact case this function was written to be careful about.
    ///
    /// So the unreadable bytes are moved aside first, under a timestamped name, and
    /// only then does a fresh board start. If the move itself fails, writes are
    /// REFUSED for the lifetime of this actor rather than risking the original -
    /// a board that stops recording is a smaller loss than a board that eats what
    /// is already there.
    private func load() {
        guard !loaded else { return }
        loaded = true
        guard let data = try? Data(contentsOf: url) else { return }

        let stored = try? JSONDecoder().decode(Stored.self, from: data)
        if let stored, stored.schema == Self.schema {
            buckets = stored.buckets.mapValues { $0.sorted(by: LeaderboardEntry.outranks) }
            return
        }

        let why = stored == nil
            ? "the file does not decode as a board"
            : "schema \(stored!.schema), and this build reads schema \(Self.schema)"
        quarantine(reason: why, bytes: data.count)
    }

    private func quarantine(reason: String, bytes: Int) {
        let stamp = Int(Date().timeIntervalSince1970 * 1000)
        let stem = url.deletingPathExtension().lastPathComponent
        let aside = url.deletingLastPathComponent()
            .appendingPathComponent("\(stem).corrupt-\(stamp).json")
        do {
            try FileManager.default.moveItem(at: url, to: aside)
            quarantined = aside
            log("kept \(bytes) unreadable byte(s) aside as \(aside.lastPathComponent) "
                + "(\(reason)); starting a fresh board.")
        } catch {
            writesRefused = true
            quarantined = nil
            log("REFUSING ALL WRITES. \(bytes) byte(s) at \(url.lastPathComponent) are "
                + "unreadable (\(reason)) and could not be moved aside (\(error)). "
                + "The existing file will not be overwritten.")
        }
    }

    /// Where the last unreadable board was preserved. `nil` if nothing was ever
    /// quarantined - or if quarantining failed, in which case `writesBlocked` is
    /// true and the original file is still on disk untouched.
    public var quarantinedFile: URL? {
        load()
        return quarantined
    }

    /// True when an unreadable board could not be preserved and this actor has
    /// therefore stopped writing.
    public var writesBlocked: Bool {
        load()
        return writesRefused
    }

    private nonisolated func log(_ message: String) {
        FileHandle.standardError.write(Data(("LocalLeaderboard: " + message + "\n").utf8))
    }

    private func save() {
        guard !writesRefused else { return }
        let stored = Stored(schema: Self.schema, buckets: buckets)
        guard let data = try? JSONEncoder().encode(stored) else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        // Atomic: a board half-written by a backgrounded app is the one way this
        // file becomes the corrupt case `load()` has to forgive.
        try? data.write(to: url, options: .atomic)
    }

    // MARK: - LeaderboardService

    @discardableResult
    public func submit(_ entry: LeaderboardEntry) async throws -> LeaderboardPlacement {
        load()
        // The filter runs HERE as well as at the call site: a service that trusts
        // its caller to have sanitised is a service that stores whatever the next
        // caller forgets to.
        let clean = LeaderboardEntry(
            id: entry.id, bucket: entry.bucket, profile: entry.profile,
            name: MQNameFilter.clean(entry.name), cast: entry.cast, score: entry.score,
            maxStacks: entry.maxStacks, correct: entry.correct, wrong: entry.wrong,
            freezesUsed: entry.freezesUsed, durationMs: entry.durationMs,
            date: entry.date, recordedAt: entry.recordedAt)

        let key = entry.bucket.key
        var rows = buckets[key] ?? []
        rows.append(clean)
        rows.sort(by: LeaderboardEntry.outranks)
        if rows.count > Self.capacity { rows = Array(rows.prefix(Self.capacity)) }
        buckets[key] = rows
        save()

        let place = rows.firstIndex { $0.id == clean.id }.map { $0 + 1 }
        return LeaderboardPlacement(rank: place, kept: rows.count, capacity: Self.capacity)
    }

    public func top(_ bucket: LeaderboardBucket, limit: Int = capacity) async throws -> [LeaderboardEntry] {
        load()
        return Array((buckets[bucket.key] ?? []).prefix(max(0, limit)))
    }

    public func rank(of id: String, in bucket: LeaderboardBucket) async throws -> Int? {
        load()
        return (buckets[bucket.key] ?? []).firstIndex { $0.id == id }.map { $0 + 1 }
    }

    public func forget(profile: String) async throws {
        load()
        for (key, rows) in buckets {
            buckets[key] = rows.filter { $0.profile != profile }
        }
        save()
    }

    // MARK: - Housekeeping

    /// Every bucket that has at least one row, for a board view's tier chips.
    public func occupiedBuckets() async -> [LeaderboardBucket] {
        load()
        return buckets.compactMap { key, rows in
            guard !rows.isEmpty else { return nil }
            let parts = key.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
            guard parts.count == 3 else { return nil }
            return LeaderboardBucket(mode: parts[0], tier: parts[1], level: parts[2])
        }
        .sorted { $0.key < $1.key }
    }

    /// Wipe the file. Only a parent-facing reset should ever call this.
    public func removeEverything() async {
        load()
        buckets = [:]
        save()
    }
}
