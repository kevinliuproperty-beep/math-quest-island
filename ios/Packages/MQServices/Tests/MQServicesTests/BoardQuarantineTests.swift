import Testing
import Foundation
import MQServices

/// An unreadable board is never destroyed.
///
/// Measured on 2026-09-07, before this suite existed: five real runs (1,255 B) ->
/// a file this build could not decode -> **one submit -> 292 B, one row, five runs
/// gone**, with no warning and no backup. `load()` set `loaded = true` before
/// reading, returned an empty board on any decode failure, and the next `save()`
/// wrote straight over the file. `Stored.schema` was written and never read, so
/// the version field could not catch it either.
///
/// The blast radius is one local play board, which is why the refutation called
/// it a wound and not a kill - but it is silent data loss on the path a child has
/// just finished a run on, which is the exact case `load()` was written to be
/// careful about.
@Suite("An unreadable board is kept, never clobbered")
struct BoardQuarantineTests {

    static func tempDir() -> URL {
        let dir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("mqi-board-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static let bucket = LeaderboardBucket(mode: "patchwerk", tier: "normal", level: "P4")

    static func entry(_ name: String, _ score: Int, id: String = UUID().uuidString) -> LeaderboardEntry {
        LeaderboardEntry(id: id, bucket: bucket, profile: "charlotte", name: name,
                         cast: "unicorn", score: score, maxStacks: 8, correct: 20, wrong: 3,
                         freezesUsed: 1, durationMs: 180_000, date: "2026-09-07",
                         recordedAt: Double(score))
    }

    static func asideFiles(in dir: URL) -> [URL] {
        ((try? FileManager.default.contentsOfDirectory(at: dir,
                                                       includingPropertiesForKeys: nil)) ?? [])
            .filter { $0.lastPathComponent.contains(".corrupt-") }
    }

    /// The refuter's reproduction, run forward: five runs, a file this build
    /// cannot read, one submit. The bytes must still be on disk afterwards.
    @Test("Five runs that stop decoding are kept aside, not overwritten")
    func unreadableBoardIsQuarantined() async throws {
        let dir = Self.tempDir()
        let url = dir.appendingPathComponent("patchwerk-board.json")

        do {
            let board = LocalLeaderboard(url: url)
            for i in 1...5 { try await board.submit(Self.entry("Run \(i)", i * 100, id: "r\(i)")) }
        }
        let original = try Data(contentsOf: url)
        #expect(original.count > 0)

        // A file this build cannot decode. (Truncation is the shape a
        // backgrounded app leaves behind; the schema case is below.)
        let damaged = Data("{\"schema\":1,\"buckets\":{\"patchwerk/nor".utf8)
        try damaged.write(to: url)

        let board = LocalLeaderboard(url: url)
        try await board.submit(Self.entry("Later", 42, id: "later"))

        // The fresh board holds only the new run...
        let rows = try await board.top(Self.bucket, limit: 20)
        #expect(rows.map(\.id) == ["later"])
        #expect(await board.writesBlocked == false)

        // ...and the unreadable bytes are still on disk, untouched, under a
        // timestamped name.
        let aside = try #require(await board.quarantinedFile,
                                 "nothing was kept aside - the file was clobbered")
        #expect(aside.lastPathComponent.hasPrefix("patchwerk-board.corrupt-"))
        #expect(aside.pathExtension == "json")
        #expect(try Data(contentsOf: aside) == damaged,
                "the quarantined file is not the bytes that could not be read")
        #expect(Self.asideFiles(in: dir).count == 1)
    }

    /// `Stored.schema` is now READ. A board written by a future build is exactly
    /// as unreadable as a truncated one, and gets exactly the same care.
    @Test("A board from a future schema is quarantined, not silently discarded")
    func futureSchemaIsQuarantined() async throws {
        let dir = Self.tempDir()
        let url = dir.appendingPathComponent("patchwerk-board.json")
        let future = Data("{\"schema\":99,\"buckets\":{}}".utf8)
        try future.write(to: url)

        let board = LocalLeaderboard(url: url)
        try await board.submit(Self.entry("Charlotte", 900, id: "c"))
        #expect(try await board.top(Self.bucket, limit: 20).map(\.id) == ["c"])

        let aside = try #require(await board.quarantinedFile)
        #expect(try Data(contentsOf: aside) == future)
        #expect(LocalLeaderboard.schema == 1)
    }

    /// If the bytes cannot even be moved aside, the board stops writing rather
    /// than risk the original. A board that records nothing is a smaller loss
    /// than a board that eats what is already there.
    @Test("When the file cannot be preserved, writes are refused")
    func writesRefusedWhenQuarantineFails() async throws {
        let dir = Self.tempDir()
        let url = dir.appendingPathComponent("patchwerk-board.json")
        let bytes = Data("{ not a board at all".utf8)
        try bytes.write(to: url)
        // A read-only directory: the file can be read, but nothing in here can be
        // renamed or created.
        try FileManager.default.setAttributes([.posixPermissions: 0o500], ofItemAtPath: dir.path)
        defer {
            try? FileManager.default.setAttributes([.posixPermissions: 0o700],
                                                   ofItemAtPath: dir.path)
        }

        let board = LocalLeaderboard(url: url)
        try await board.submit(Self.entry("Charlotte", 900, id: "c"))
        #expect(await board.writesBlocked, "the board did not refuse to write")
        #expect(await board.quarantinedFile == nil)
        #expect(try Data(contentsOf: url) == bytes,
                "the unreadable file was overwritten after the move aside failed")
    }

    /// A readable board is not disturbed by any of this: no stray files, no
    /// quarantine, and the rows come back.
    @Test("A healthy board is never quarantined")
    func healthyBoardUntouched() async throws {
        let dir = Self.tempDir()
        let url = dir.appendingPathComponent("patchwerk-board.json")
        do {
            let board = LocalLeaderboard(url: url)
            try await board.submit(Self.entry("Charlotte", 900, id: "c"))
        }
        let reopened = LocalLeaderboard(url: url)
        try await reopened.submit(Self.entry("Ben", 800, id: "b"))
        #expect(try await reopened.top(Self.bucket, limit: 20).map(\.id) == ["c", "b"])
        #expect(await reopened.quarantinedFile == nil)
        #expect(await reopened.writesBlocked == false)
        #expect(Self.asideFiles(in: dir).isEmpty)
    }

    /// A board that has never existed is not a corrupt board. First launch must
    /// not leave a `.corrupt-` file beside an empty one.
    @Test("A board that does not exist yet is not a corruption")
    func missingFileIsNotCorrupt() async throws {
        let dir = Self.tempDir()
        let url = dir.appendingPathComponent("patchwerk-board.json")
        let board = LocalLeaderboard(url: url)
        #expect(try await board.top(Self.bucket, limit: 20).isEmpty)
        #expect(await board.quarantinedFile == nil)
        #expect(await board.writesBlocked == false)
        #expect(Self.asideFiles(in: dir).isEmpty)
    }
}
