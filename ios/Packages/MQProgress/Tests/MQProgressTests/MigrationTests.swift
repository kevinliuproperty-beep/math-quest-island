import Testing
import Foundation
@testable import MQProgress

/// The migration hook, run against real documents rather than admired in the abstract.
/// A hook that has never converted anything is a hook nobody knows works, and the first
/// time it runs in anger it runs on a child's only copy of their history.
@Suite("Schema migration")
struct MigrationTests {

    /// A hand-written v1 file: `scaffold` as the level's NAME, no `patchwerk`, no
    /// `lifetimeCrystals`, no `bestPool`.
    static let v1 = """
    {
      "schema": 1,
      "profiles": [
        {
          "id": "profile-1",
          "name": "Charlotte",
          "cast": "unicorn",
          "level": "P4",
          "createdAt": 1750000000,
          "skills": {
            "peri":  {"attempts": 10, "correct": 9, "pool": 3, "rightRow": 1, "wrongRow": 0, "scaffold": "hint"},
            "area":  {"attempts": 2,  "correct": 1, "pool": 1, "rightRow": 0, "wrongRow": 1, "scaffold": "full"},
            "conv":  {"attempts": 20, "correct": 20, "pool": 3, "rightRow": 2, "wrongRow": 0, "scaffold": "none"}
          },
          "sessions": [
            {
              "id": "s1", "mode": "quest", "topic": "geometry",
              "startedAt": 1750000100, "endedAt": 1750000700,
              "total": 12, "correct": 10, "bestStreak": 6, "crystals": 3,
              "timeOnItems": 240, "maxPool": 3,
              "wrongCounts": {"wrongOption": 2},
              "skills": {"peri": {"right": 8, "wrong": 1}},
              "reviews": []
            },
            {
              "id": "s2", "mode": "patchwerk", "topic": null,
              "startedAt": 1750001000, "endedAt": 1750001300,
              "total": 30, "correct": 26, "bestStreak": 11, "crystals": 4,
              "timeOnItems": 290, "maxPool": 3,
              "wrongCounts": {},
              "skills": {},
              "reviews": []
            }
          ]
        }
      ]
    }
    """

    static func write(_ json: String) throws -> URL {
        let dir = Fixtures.tempDir()
        let url = dir.appendingPathComponent("progress.json")
        try Data(json.utf8).write(to: url)
        return url
    }

    @Test("v0 - no file at all - is an empty start")
    func fromV0Missing() async throws {
        let dir = Fixtures.tempDir()
        defer { try? FileManager.default.removeItem(at: dir) }
        let store = try MQProgressStore(
            persistence: FilePersistence(url: dir.appendingPathComponent("progress.json")))
        #expect(await store.profiles().isEmpty)
        // And it can be written to straight away, at the CURRENT schema.
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        #expect(await store.lastWriteError == nil)
    }

    @Test("v0 - an unstamped document - migrates to an empty start rather than guessing")
    func fromV0Unstamped() throws {
        // Steps CHAIN: v0 -> v1 -> v2, so a v0 document comes out at the current schema
        // and not one step short of it.
        let doc = try JSONSerialization.jsonObject(with: Data(#"{"profiles":[{"junk":1}]}"#.utf8))
        let migrated = try ProgressCodec.migrate(doc as! [String: Any], from: 0)
        #expect(migrated["schema"] as? Int == ProgressSchema.current)
        #expect((migrated["profiles"] as? [Any])?.isEmpty == true)
    }

    @Test("v1 loads, and the scaffold names become levels")
    func fromV1() async throws {
        let url = try Self.write(Self.v1)
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        let p = ProfileID("profile-1")

        #expect(await store.scaffold(profile: p, skill: SkillID("peri")) == .hint)
        #expect(await store.scaffold(profile: p, skill: SkillID("area")) == .full)
        #expect(await store.scaffold(profile: p, skill: SkillID("conv")) == .none)
        #expect(await store.poolLevel(profile: p, skill: SkillID("peri")) == 3)
        #expect(abs(await store.mastery(profile: p, skill: SkillID("peri")) - 0.9) < 1e-9)
        #expect(await store.sessions(profile: p).count == 2)
        #expect(await store.patchwerkRuns(profile: p).isEmpty)
    }

    @Test("v1 crystals are recovered from the sessions, not zeroed")
    func v1RecoversCrystals() async throws {
        let url = try Self.write(Self.v1)
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        #expect(await store.profiles().first?.crystals == 7)   // 3 + 4
    }

    @Test("v1 bestPool defaults to the pool the child is actually on")
    func v1BestPool() async throws {
        let url = try Self.write(Self.v1)
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        let progress = await store.skillProgress(profile: ProfileID("profile-1"), skill: SkillID("peri"))
        #expect(progress.bestPool == 3)
    }

    @Test("A v1 file is rewritten at the current schema on the next save")
    func v1IsRewrittenForward() async throws {
        let url = try Self.write(Self.v1)
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        do {
            let store = try MQProgressStore(persistence: FilePersistence(url: url))
            await store.setLevel("P5", profile: ProfileID("profile-1"))
        }
        let object = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any]
        #expect(object?["schema"] as? Int == ProgressSchema.current)
        // Re-reading the migrated file changes nothing further.
        let store = try MQProgressStore(persistence: FilePersistence(url: url))
        #expect(await store.scaffold(profile: ProfileID("profile-1"), skill: SkillID("peri")) == .hint)
        #expect(await store.profiles().first?.level == "P5")
    }

    @Test("An unknown scaffold name migrates to FULL, never to a fade the child did not earn")
    func unknownScaffoldNameIsSafe() throws {
        let doc = try JSONSerialization.jsonObject(with: Data("""
        {"schema":1,"profiles":[{"id":"x","name":"X","cast":"turtle","level":"P3",
          "createdAt":1750000000,"sessions":[],
          "skills":{"s":{"attempts":1,"correct":1,"pool":1,"rightRow":1,"wrongRow":0,"scaffold":"whatever"}}}]}
        """.utf8)) as! [String: Any]
        let migrated = try ProgressCodec.migrate(doc, from: 1)
        let profiles = migrated["profiles"] as! [[String: Any]]
        let skills = profiles[0]["skills"] as! [String: [String: Any]]
        #expect(skills["s"]?["scaffold"] as? Int == ScaffoldLevel.full.rawValue)
    }

    @Test("A file from a FUTURE build is refused, never silently downgraded")
    func futureSchemaIsRefused() throws {
        let url = try Self.write(#"{"schema": 99, "profiles": []}"#)
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        #expect(throws: ProgressStoreError.schemaFromTheFuture(found: 99,
                                                              supported: ProgressSchema.current)) {
            _ = try MQProgressStore(persistence: FilePersistence(url: url))
        }
        // And the file is still there, untouched, for the build that understands it.
        #expect(FileManager.default.fileExists(atPath: url.path))
    }

    @Test("The current schema is the one the module says it is")
    func schemaConstants() {
        #expect(ProgressSchema.current == 2)
        #expect(ProgressSchema.oldest == 1)
    }
}
