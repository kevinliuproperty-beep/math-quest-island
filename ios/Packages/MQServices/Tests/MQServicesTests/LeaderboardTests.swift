import Testing
import Foundation
@testable import MQServices

/// The device board: ordering, ties, the cap, the file, and the privacy promise.
@Suite("The device leaderboard")
struct LocalLeaderboardTests {

    static func tempURL() -> URL {
        URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("mqi-board-\(UUID().uuidString)")
            .appendingPathComponent("patchwerk-board.json")
    }

    static let normalP4 = LeaderboardBucket(mode: "patchwerk", tier: "normal", level: "P4")

    static func entry(_ name: String, _ score: Int, at: Double = 1_000,
                      profile: String = "charlotte", id: String = UUID().uuidString,
                      bucket: LeaderboardBucket = normalP4) -> LeaderboardEntry {
        LeaderboardEntry(id: id, bucket: bucket, profile: profile, name: name, cast: "unicorn",
                         score: score, maxStacks: 10, correct: 20, wrong: 3, freezesUsed: 1,
                         durationMs: 180_000, date: "2026-09-07", recordedAt: at)
    }

    @Test("Higher damage ranks first")
    func ordering() async throws {
        let board = LocalLeaderboard(url: Self.tempURL())
        for (name, score) in [("Ben", 400), ("Charlotte", 900), ("Mira", 650)] {
            try await board.submit(Self.entry(name, score))
        }
        let rows = try await board.top(Self.normalP4, limit: 20)
        #expect(rows.map(\.name) == ["Charlotte", "Mira", "Ben"])
        #expect(rows.map(\.score) == [900, 650, 400])
    }

    @Test("On a tie the earlier run keeps the higher place")
    func tieGoesToTheFirstToGetThere() async throws {
        let board = LocalLeaderboard(url: Self.tempURL())
        let first = try await board.submit(Self.entry("Early", 500, at: 100, id: "a"))
        let second = try await board.submit(Self.entry("Late", 500, at: 900, id: "b"))
        #expect(first.rank == 1)
        #expect(second.rank == 2, "matching a score is not beating it")
        let rows = try await board.top(Self.normalP4, limit: 20)
        #expect(rows.map(\.name) == ["Early", "Late"])
    }

    @Test("A tie in score AND time is still a total order, not a shuffle")
    func totalOrder() async throws {
        let board = LocalLeaderboard(url: Self.tempURL())
        try await board.submit(Self.entry("B", 500, at: 100, id: "bbb"))
        try await board.submit(Self.entry("A", 500, at: 100, id: "aaa"))
        let once = try await board.top(Self.normalP4, limit: 20).map(\.id)
        try await board.submit(Self.entry("C", 10, at: 100, id: "ccc"))
        let twice = try await board.top(Self.normalP4, limit: 20).map(\.id).filter { $0 != "ccc" }
        #expect(once == twice, "re-sorting the same rows changed their order")
    }

    @Test("Twenty rows are kept per bucket, and the 21st only lands if it earns it")
    func capacity() async throws {
        let board = LocalLeaderboard(url: Self.tempURL())
        for i in 1...25 {
            try await board.submit(Self.entry("Kid \(i)", i * 10, at: Double(i)))
        }
        let rows = try await board.top(Self.normalP4, limit: 100)
        #expect(rows.count == LocalLeaderboard.capacity)
        #expect(rows.first?.score == 250)
        #expect(rows.last?.score == 60, "the cap kept the wrong end of the board")

        let weak = try await board.submit(Self.entry("Nobody", 1, at: 999))
        #expect(weak.madeTheBoard == false)
        #expect(weak.rank == nil)
        let strong = try await board.submit(Self.entry("Somebody", 9_999, at: 999))
        #expect(strong.rank == 1)
        #expect(try await board.top(Self.normalP4, limit: 100).count == LocalLeaderboard.capacity)
    }

    @Test("Buckets never mix: tier and class level each get their own board")
    func bucketsAreSeparate() async throws {
        let board = LocalLeaderboard(url: Self.tempURL())
        let long = LeaderboardBucket(mode: "patchwerk", tier: "long", level: "P4")
        let p3 = LeaderboardBucket(mode: "patchwerk", tier: "normal", level: "P3")
        try await board.submit(Self.entry("Heroic", 5_000, bucket: long))
        try await board.submit(Self.entry("Younger", 4_000, bucket: p3))
        try await board.submit(Self.entry("Normal", 100))
        #expect(try await board.top(Self.normalP4, limit: 20).map(\.name) == ["Normal"])
        #expect(try await board.top(long, limit: 20).map(\.name) == ["Heroic"])
        #expect(try await board.top(p3, limit: 20).map(\.name) == ["Younger"])
        let occupied = await board.occupiedBuckets()
        #expect(occupied.count == 3)
    }

    @Test("The board survives a relaunch, and a corrupt file is an empty board")
    func persistence() async throws {
        let url = Self.tempURL()
        do {
            let board = LocalLeaderboard(url: url)
            try await board.submit(Self.entry("Charlotte", 1_234, id: "keep"))
        }
        let reopened = LocalLeaderboard(url: url)
        let rows = try await reopened.top(Self.normalP4, limit: 20)
        #expect(rows.count == 1)
        #expect(rows.first?.id == "keep")
        #expect(rows.first?.score == 1_234)

        // Half a written file - the state a backgrounded app can leave behind.
        try Data("{ this is not json".utf8).write(to: url)
        let broken = LocalLeaderboard(url: url)
        let empty = try await broken.top(Self.normalP4, limit: 20)
        #expect(empty.isEmpty, "a corrupt board must be an empty board, never a crash")
        // ...and the bytes are kept, not destroyed. See BoardQuarantineTests for
        // the whole of that behaviour; this is the line that stops the two tests
        // drifting apart.
        #expect(await broken.quarantinedFile != nil)
    }

    @Test("Deleting a profile takes its name off every board")
    func forgetProfile() async throws {
        let board = LocalLeaderboard(url: Self.tempURL())
        try await board.submit(Self.entry("Charlotte", 900, profile: "charlotte"))
        try await board.submit(Self.entry("Ben", 800, profile: "ben"))
        try await board.forget(profile: "charlotte")
        let rows = try await board.top(Self.normalP4, limit: 20)
        #expect(rows.map(\.name) == ["Ben"])
    }

    @Test("A submitted row can be found again by id")
    func rankByID() async throws {
        let board = LocalLeaderboard(url: Self.tempURL())
        try await board.submit(Self.entry("Top", 900, id: "top"))
        try await board.submit(Self.entry("Mine", 500, id: "mine"))
        #expect(try await board.rank(of: "mine", in: Self.normalP4) == 2)
        #expect(try await board.rank(of: "nobody", in: Self.normalP4) == nil)
    }

    @Test("Nothing in the device board leaves the device")
    func privacy() async {
        let board = LocalLeaderboard(url: Self.tempURL())
        #expect(board.leavesTheDevice == false)
    }

    @Test("Accuracy on a row is a real fraction, and no attempts is not 100%")
    func rowAccuracy() {
        let row = Self.entry("Charlotte", 900)
        #expect(row.attempts == 23)
        #expect(abs(row.accuracy - 20.0 / 23.0) < 1e-12)
        let none = LeaderboardEntry(bucket: Self.normalP4, profile: "p", name: "n", cast: "crab",
                                    score: 0, maxStacks: 0, correct: 0, wrong: 0, freezesUsed: 0,
                                    durationMs: 1, date: "2026-09-07", recordedAt: 0)
        #expect(none.accuracy == 0)
    }
}

/// The web's name rule, carried over. See `MQNameFilter` for why it is carried
/// rather than improved.
@Suite("Leaderboard names")
struct NameFilterTests {

    @Test("A plain name is kept exactly")
    func plain() {
        #expect(MQNameFilter.clean("Charlotte") == "Charlotte")
        #expect(MQNameFilter.clean("Mei-Ling") == "Mei-Ling")
        #expect(MQNameFilter.clean("kid_9") == "kid_9")
    }

    @Test("Everything outside the web's own character class is stripped")
    func stripped() {
        #expect(MQNameFilter.clean("Zoë") == "Zo")          // JS \w is ASCII
        #expect(MQNameFilter.clean("<script>") == "script")
        #expect(MQNameFilter.clean("A.B,C!") == "ABC")
        #expect(MQNameFilter.clean("  spaced  ") == "spaced")
    }

    @Test("Fourteen characters, counted after the strip and the trim")
    func length() {
        #expect(MQNameFilter.clean("abcdefghijklmnopqrstuvwxyz") == "abcdefghijklmn")
        #expect(MQNameFilter.clean("abcdefghijklmn").count == 14)
    }

    @Test("An unusable name becomes Hero, never an error and never empty")
    func fallback() {
        #expect(MQNameFilter.clean("") == "Hero")
        #expect(MQNameFilter.clean("!!!") == "Hero")
        #expect(MQNameFilter.clean("   ") == "Hero")
    }

    @Test("The block list is substring-matched and case-insensitive")
    func blocked() {
        #expect(MQNameFilter.clean("shit") == "Hero")
        #expect(MQNameFilter.clean("SHITTY") == "Hero")
        #expect(MQNameFilter.clean("xxfuckxx") == "Hero")
        // Over-blocking is the accepted cost: on a board a parent reads, the
        // cheap failure is a child called "Hero" for a day.
        #expect(MQNameFilter.clean("Dickson") == "Hero")
    }

    @Test("The service filters again, even if the caller already did")
    func serviceFiltersToo() async throws {
        let board = LocalLeaderboard(url: LocalLeaderboardTests.tempURL())
        try await board.submit(LeaderboardEntry(
            bucket: LocalLeaderboardTests.normalP4, profile: "p", name: "shit<>",
            cast: "crab", score: 10, maxStacks: 1, correct: 1, wrong: 0, freezesUsed: 0,
            durationMs: 1_000, date: "2026-09-07", recordedAt: 1))
        let rows = try await board.top(LocalLeaderboardTests.normalP4, limit: 20)
        #expect(rows.first?.name == "Hero")
    }
}

/// The Game Center conformance is a stub, and the tests say so out loud - so
/// nobody later reads a green suite as "Game Center works".
@Suite("Game Center is a stub, and admits it")
struct GameCenterStubTests {

    @Test("It writes the device board and claims nothing more")
    func mirrorsLocal() async throws {
        let local = LocalLeaderboard(url: LocalLeaderboardTests.tempURL())
        let gc = GameCenterLeaderboard(local: local)
        #expect(gc.leavesTheDevice, "the type exists to say scores CAN leave; it must admit it")
        #expect(GameCenterLeaderboard.isAuthenticated == false,
                "the stub must never claim an authenticated player")

        let placement = try await gc.submit(LocalLeaderboardTests.entry("Charlotte", 700))
        #expect(placement.rank == 1)
        let rows = try await gc.top(LocalLeaderboardTests.normalP4, limit: 20)
        #expect(rows.count == 1, "the device board is still the source of truth")
    }

    @Test("A board ID is derived per bucket, because one board cannot rank two tiers")
    func boardIDs() {
        let a = GameCenterLeaderboard.boardID(
            for: LeaderboardBucket(mode: "patchwerk", tier: "normal", level: "P4"))
        let b = GameCenterLeaderboard.boardID(
            for: LeaderboardBucket(mode: "patchwerk", tier: "long", level: "P4"))
        let c = GameCenterLeaderboard.boardID(
            for: LeaderboardBucket(mode: "patchwerk", tier: "normal", level: "P5"))
        #expect(a == "com.mathquestisland.patchwerk.normal.p4")
        #expect(Set([a, b, c]).count == 3)
    }
}
