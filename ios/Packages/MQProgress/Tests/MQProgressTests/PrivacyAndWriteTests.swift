import Testing
import Foundation
import MQContent
@testable import MQProgress

/// Where the file goes, who else can read it, and how often it is written.
///
/// Three wounds live here, and all three were about a claim the code did not support:
/// the file rode into iCloud and iTunes backups while the module printed "no child data
/// anywhere but this iPad" three times (W6); an unstamped-but-valid document was erased
/// rather than refused (W11); and every tap fsync'd the whole document on the child's
/// path (W12).
@Suite("Privacy on disk, and how often the disk is touched")
struct PrivacyAndWriteTests {

    // MARK: - W6, the privacy claim

    @Test("progress.json is excluded from iCloud and iTunes backups")
    func excludedFromBackup() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")

        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")

        let values = try url.resourceValues(forKeys: [.isExcludedFromBackupKey])
        #expect(values.isExcludedFromBackup == true,
                "the child's name and whole learning history would ride into a backup")
    }

    @Test("The exclusion survives every subsequent write")
    func exclusionSurvivesRewrites() async throws {
        // It is a property of the INODE, and `save` is temp-then-`rename(2)`, which puts
        // a brand new inode in place every time. Marking it once at creation would have
        // been true for exactly one write.
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")

        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<20 { await store.answer(s, p, "peri", correct: true) }
        _ = await store.endSession(s)
        await store.rename("Charlie", profile: p)

        let values = try url.resourceValues(forKeys: [.isExcludedFromBackupKey])
        #expect(values.isExcludedFromBackup == true)
    }

    #if canImport(UIKit)
    @Test("On a device the file is written with complete protection")
    func completeFileProtection() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")
        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
        #expect(attributes[.protectionKey] as? FileProtectionType == .complete)
    }
    #else
    @Test("macOS has no per-file protection class, and this build does not claim one")
    func noFileProtectionOnMac() {
        // Stated as a test rather than left as a silence: the Kai gate CANNOT attest to
        // file protection, because there is no such attribute on this platform (FileVault
        // is a volume property). The exclusion above is what the gate proves here; the
        // protection class is a device claim and belongs to the dress rehearsal on the
        // real iPad.
        #expect(Bool(true))
    }
    #endif

    // MARK: - W11, an unstamped document

    @Test("An unstamped document with profiles in it is read, not erased")
    func unstampedDocumentIsNotErased() async throws {
        // A valid document that lost its `schema` key used to read as version 0, and the
        // migration replaced the WHOLE document with an empty one: the store came up with
        // zero profiles and the next attempt wrote that over the child's history. A
        // FUTURE schema was refused loudly; a missing one was erased quietly, and it was
        // the only path in the module where data was lost rather than refused.
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")
        try Data("""
        {"profiles":[{"id":"p1","name":"Charlotte","cast":"unicorn","level":"P4",
          "createdAt":1750000000,
          "skills":{"peri":{"attempts":10,"correct":9,"pool":3,"rightRow":1,"wrongRow":0,
                            "scaffold":"hint"}},
          "sessions":[],"patchwerk":[]}]}
        """.utf8).write(to: url)

        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        #expect(await store.profiles().count == 1)
        #expect(await store.profiles().first?.name == "Charlotte")
        // It was migrated forward like any other v1 document, not guessed at.
        #expect(await store.scaffold(profile: ProfileID("p1"), skill: SkillID("peri")) == .hint)
        #expect(await store.poolLevel(profile: ProfileID("p1"), skill: SkillID("peri")) == 3)
    }

    @Test("An unstamped document with NOTHING in it is still an empty start")
    func unstampedEmptyIsStillEmpty() throws {
        let doc = try JSONSerialization.jsonObject(with: Data(#"{"profiles":[]}"#.utf8)) as! [String: Any]
        let migrated = try ProgressCodec.migrate(doc, from: 0)
        #expect(migrated["schema"] as? Int == ProgressSchema.current)
        #expect((migrated["profiles"] as? [Any])?.isEmpty == true)
    }

    // MARK: - W10, the law on the LOAD path

    @Test("A restored backup cannot hand back help the record says is gone")
    func loadClampsTheScaffold() async throws {
        // The law was enforced on `fade(to:)` and not on `load`, so a v1 file - or a
        // restored backup - claiming `full` for a skill with 40 straight correct answers
        // came back up as `full`. It collapses again on the next correct answer, but
        // "physically cannot raise a level" was a statement about the mutator, not about
        // the store.
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")
        try Data("""
        {"schema":2,"profiles":[{"id":"p1","name":"Charlotte","cast":"unicorn","level":"P4",
          "createdAt":1750000000,"sessions":[],"patchwerk":[],"lifetimeCrystals":0,
          "skills":{
            "burned":{"attempts":40,"correct":40,"pool":3,"rightRow":1,"wrongRow":0,
                      "bestPool":3,"scaffold":3,"fadeRun":0},
            "honest":{"attempts":10,"correct":9,"pool":3,"rightRow":1,"wrongRow":0,
                      "bestPool":3,"scaffold":1,"fadeRun":2}
          }}]}
        """.utf8).write(to: url)

        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        let p = ProfileID("p1")
        // 40 straight correct answers force at least five ladder steps, and there are
        // only three. The file's `full` is a lie the record contradicts.
        #expect(await store.scaffold(profile: p, skill: SkillID("burned")) == .none)
        // 9 correct and 1 wrong could be 4 then 5 - no step forced at all - so the file's
        // own `hint` stands. The clamp is a bound, not a re-derivation.
        #expect(await store.scaffold(profile: p, skill: SkillID("honest")) == .hint)
    }

    // MARK: - W12, the write on the tap path

    @Test("Coalesced writes collapse a session's taps into a handful of writes")
    func coalescedWritesCollapse() async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing,
                                        writes: .coalesced(seconds: 5))
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let afterProfile = backing.saveCount          // addProfile writes through
        let s = await store.beginSession(profile: p, mode: .quest)

        for _ in 0..<40 { await store.answer(s, p, "peri", correct: true, crystals: 0) }
        // Nothing has been written yet: the window is still open.
        #expect(backing.saveCount == afterProfile)
        #expect(await store.hasPendingWrite)

        // ...and the state is nonetheless correct in memory, which is what the child sees.
        #expect(await store.mastery(profile: p, skill: SkillID("peri")) == 1)

        _ = await store.endSession(s)
        // A session end always writes through.
        #expect(backing.saveCount == afterProfile + 1)
        #expect(await store.hasPendingWrite == false)

        // 40 taps, ONE write. It used to be 40.
        let reopened = try MQProgressStore(persistence: InMemoryPersistence(seed: backing.raw))
        #expect(await reopened.mastery(profile: p, skill: SkillID("peri")) == 1)
        #expect(await reopened.sessions(profile: p).count == 1)
    }

    @Test("flush() is the backgrounding hook, and it writes everything pending")
    func flushWritesPending() async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing, writes: .coalesced(seconds: 30))
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<9 { await store.answer(s, p, "peri", correct: true) }
        let before = backing.saveCount

        // The app backgrounds. iOS gives it seconds, not a promise.
        await store.flush()
        #expect(backing.saveCount == before + 1)
        #expect(await store.hasPendingWrite == false)
        // Idempotent: a second hook firing does not write again.
        await store.flush()
        #expect(backing.saveCount == before + 1)

        // Everything the child earned is on disk, session still open.
        let reopened = try MQProgressStore(persistence: InMemoryPersistence(seed: backing.raw))
        #expect(await reopened.poolLevel(profile: p, skill: SkillID("peri")) == 3)
        #expect(await reopened.scaffold(profile: p, skill: SkillID("peri")) == .partial)
    }

    @Test("The window really does close on its own")
    func windowClosesOnItsOwn() async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing, writes: .coalesced(seconds: 0.05))
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        let before = backing.saveCount
        for _ in 0..<5 { await store.answer(s, p, "peri", correct: true) }

        // Wait for the sleeper rather than for a wall clock: a fixed sleep is a flake.
        var waited = 0
        while await store.hasPendingWrite && waited < 200 {
            try await Task.sleep(nanoseconds: 20_000_000)
            waited += 1
        }
        #expect(await store.hasPendingWrite == false)
        #expect(backing.saveCount > before)
    }

    @Test("Structural changes always write through, whatever the window is holding",
          arguments: ["addProfile", "setLevel", "rename", "resetHistory", "patchwerkRun", "endSession"])
    func structuralChangesWriteThrough(_ what: String) async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing, writes: .coalesced(seconds: 30))
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        await store.answer(s, p, "peri", correct: true)     // leaves the window open
        #expect(await store.hasPendingWrite)
        let before = backing.saveCount

        switch what {
        case "addProfile":   _ = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
        case "setLevel":     await store.setLevel("P5", profile: p)
        case "rename":       await store.rename("Charlie", profile: p)
        case "resetHistory": await store.resetHistory(profile: p)
        case "patchwerkRun": await store.recordPatchwerkRun(
                                PatchwerkRun(tier: "short", level: "P4", damage: 100, bestStacks: 1,
                                             freezesUsed: 0, correct: 1, wrong: 0, duration: 120),
                                profile: p)
        default:             _ = await store.endSession(s)
        }
        #expect(backing.saveCount == before + 1, "\(what) did not write through")
        #expect(await store.hasPendingWrite == false)
    }

    @Test("Coalescing does not weaken atomicity: a torn write still loses nothing")
    func coalescedWriteIsStillAtomic() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("progress.json")
        do {
            let store = try MQProgressStore(persistence: FilePersistence(url: url),
                                            writes: .coalesced(seconds: 0.02))
            let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
            let s = await store.beginSession(profile: p, mode: .quest)
            for _ in 0..<4 { await store.answer(s, p, "peri", correct: true) }
            _ = await store.endSession(s)
        }
        let before = try Data(contentsOf: url)
        do {
            let store = try MQProgressStore(persistence: FilePersistence(url: url, fault: .afterTemp),
                                            writes: .coalesced(seconds: 0.02))
            let p2 = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
            let s = await store.beginSession(profile: p2, mode: .quest)
            for _ in 0..<3 { await store.answer(s, p2, "tables", correct: true) }
            _ = await store.endSession(s)
            #expect(await store.lastWriteError != nil)
        }
        #expect(try Data(contentsOf: url) == before)
    }
}
