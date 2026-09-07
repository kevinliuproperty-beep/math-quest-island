import Testing
import Foundation
@testable import MQProgress

/// Persistence, and the one property that matters on a child's iPad: **a torn write must
/// never lose the previous state.** The device this ships to is a nine-year-old 9.7"
/// iPad that gets closed mid-sentence and runs out of battery; "we write atomically" has
/// to be a thing the gate proves, not a thing the comment says.
@Suite("JSON on disk, and a torn write loses nothing")
struct PersistenceTests {

    @Test("Round trip: everything a child earned comes back")
    func roundTrip() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")

        let profileID: ProfileID
        do {
            let store = try MQProgressStore(persistence: FilePersistence(url: url))
            profileID = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
            await store.setLevel("P5", profile: profileID)
            let s = await store.beginSession(profile: profileID, mode: .quest, topic: "geometry")
            for _ in 0..<7 { await store.answer(s, profileID, "peri", correct: true) }
            await store.answer(s, profileID, "peri", correct: false, item: Fixtures.review(1))
            _ = await store.endSession(s)
            await store.recordPatchwerkRun(
                PatchwerkRun(tier: "normal", level: "P5", damage: 4200, bestStacks: 9,
                             freezesUsed: 2, correct: 40, wrong: 6, duration: 300),
                profile: profileID)
            #expect(await store.lastWriteError == nil)
        }

        let reopened = try MQProgressStore(persistence: FilePersistence(url: url))
        let profiles = await reopened.profiles()
        #expect(profiles.count == 1)
        #expect(profiles.first?.name == "Charlotte")
        #expect(profiles.first?.level == "P5")
        #expect(profiles.first?.cast == .unicorn)

        let progress = await reopened.skillProgress(profile: profileID, skill: SkillID("peri"))
        #expect(progress.attempts == 8)
        #expect(progress.correct == 7)
        #expect(progress.pool == 3)
        #expect(progress.scaffold == .none)

        let sessions = await reopened.sessions(profile: profileID)
        #expect(sessions.count == 1)
        #expect(sessions.first?.summary.topic == "geometry")
        #expect(sessions.first?.summary.worthAnotherLook.count == 1)
        #expect(sessions.first?.summary.worthAnotherLook.first?.figure == .rect(long: "14 cm", wide: "9 cm", ratio: 14.0 / 9.0))
        #expect(await reopened.patchwerkRuns(profile: profileID).first?.damage == 4200)
    }

    @Test("The file it writes is stamped with the schema version")
    func fileIsStamped() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")
        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        _ = await store.addProfile(name: "Charlotte", cast: .turtle, level: "P3")

        let object = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any]
        #expect(object?["schema"] as? Int == ProgressSchema.current)
        #expect((object?["profiles"] as? [Any])?.count == 1)
    }

    @Test("A torn write leaves the PREVIOUS state whole", arguments: [
        ProgressWriteFault.afterTemp, ProgressWriteFault.duringTemp
    ])
    func tornWriteKeepsTheOldState(_ fault: ProgressWriteFault) async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")

        // A good state on disk.
        do {
            let store = try MQProgressStore(persistence: FilePersistence(url: url))
            let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
            let s = await store.beginSession(profile: p, mode: .quest)
            for _ in 0..<4 { await store.answer(s, p, "peri", correct: true) }
            _ = await store.endSession(s)
        }
        let before = try Data(contentsOf: url)

        // Now every write dies mid-flight.
        do {
            let store = try MQProgressStore(persistence: FilePersistence(url: url, fault: fault))
            let p2 = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
            let s = await store.beginSession(profile: p2, mode: .quest)
            for _ in 0..<3 { await store.answer(s, p2, "tables", correct: true) }
            _ = await store.endSession(s)
            // The store knows the write failed and says so, rather than pretending.
            #expect(await store.lastWriteError != nil)
            // In memory the child's play is still correct - a disk fault does not end
            // the run they are in the middle of.
            #expect(await store.profiles().count == 2)
        }

        // On disk: byte for byte what was there before the failed writes.
        #expect(try Data(contentsOf: url) == before)

        let reopened = try MQProgressStore(persistence: FilePersistence(url: url))
        let profiles = await reopened.profiles()
        #expect(profiles.count == 1)
        #expect(profiles.first?.name == "Charlotte")
    }

    @Test("A half-written temp file left by a crash is litter, never state")
    func leftoverTempIsSwept() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")
        do {
            let store = try MQProgressStore(persistence: FilePersistence(url: url))
            _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        }
        // Exactly what a power cut in the middle of `save` leaves behind.
        let litter = dir.appendingPathComponent("progress.json.tmp-" + UUID().uuidString)
        try Data(#"{"schema":2,"profiles":[{"id":"x","na"#.utf8).write(to: litter)

        let reopened = try MQProgressStore(persistence: FilePersistence(url: url))
        #expect(await reopened.profiles().count == 1)
        #expect(!FileManager.default.fileExists(atPath: litter.path))
    }

    @Test("A missing file is an empty start, not an error")
    func missingFileIsEmpty() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let store = try MQProgressStore(
            persistence: FilePersistence(url: dir.appendingPathComponent("nothing-here.json")))
        #expect(await store.profiles().isEmpty)
    }

    @Test("A zero-byte file is an empty start too")
    func emptyFileIsEmpty() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")
        try Data().write(to: url)
        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        #expect(await store.profiles().isEmpty)
    }

    @Test("Garbage in the file is refused loudly, not decoded into a blank child")
    func garbageThrows() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")
        try Data("this is not json".utf8).write(to: url)
        #expect(throws: ProgressStoreError.self) {
            _ = try MQProgressStore(persistence: FilePersistence(url: url))
        }
    }

    @Test("The in-memory store round-trips through the same codec the file store uses")
    func inMemoryUsesTheSameCodec() async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing)
        let p = await store.addProfile(name: "Charlotte", cast: .octopus, level: "P5")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<5 { await store.answer(s, p, "rate", correct: true) }
        _ = await store.endSession(s)

        let raw = try #require(backing.raw)
        let object = try JSONSerialization.jsonObject(with: raw) as? [String: Any]
        #expect(object?["schema"] as? Int == ProgressSchema.current)

        let second = try MQProgressStore(persistence: InMemoryPersistence(seed: raw))
        #expect(await second.profiles().first?.cast == .octopus)
        #expect(await second.poolLevel(profile: p, skill: SkillID("rate")) == 2)
    }
}
