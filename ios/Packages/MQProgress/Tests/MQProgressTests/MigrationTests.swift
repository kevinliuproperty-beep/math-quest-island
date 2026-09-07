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

    @Test("v0 - an unstamped document KEEPS its profiles and migrates forward")
    func fromV0Unstamped() throws {
        // It used to be replaced wholesale with an empty document, which was the one path
        // in the module where data was LOST rather than refused (Progress Refutation
        // W11). It is now read as v1 - the oldest shape this build knows.
        //
        // Steps CHAIN: v0 -> v1 -> v2 -> v3, so a v0 document comes out at the current
        // schema and not one step short of it.
        let doc = try JSONSerialization.jsonObject(with: Data(
            #"{"profiles":[{"id":"p","name":"Ben","cast":"turtle","level":"P2","createdAt":1,"skills":{"s":{"attempts":1,"correct":1,"pool":1,"rightRow":1,"wrongRow":0,"scaffold":"hint"}},"sessions":[]}]}"#.utf8))
        let migrated = try ProgressCodec.migrate(doc as! [String: Any], from: 0)
        #expect(migrated["schema"] as? Int == ProgressSchema.current)
        let profiles = try #require(migrated["profiles"] as? [[String: Any]])
        #expect(profiles.count == 1)
        #expect(profiles[0]["name"] as? String == "Ben")
        // and it really did chain through every step
        let skills = try #require(profiles[0]["skills"] as? [String: [String: Any]])
        #expect(skills["s"]?["scaffold"] as? Int == ScaffoldLevel.hint.rawValue)   // v1 -> v2
        #expect(skills["s"]?["fadeRun"] as? Int == 0)                              // v2 -> v3
        #expect(profiles[0]["patchwerk"] as? [Any] != nil)
    }

    @Test("v2 - a review row's flattened figure columns are dropped, not guessed at")
    func v2ReviewFigureColumnsAreDropped() throws {
        // v2's six columns modelled MQDesign's THREE-case MQFigure and could hold two of
        // the engine's eight kinds; `figureLong` was the rendered string "14 cm", so
        // reconstructing a spec from one means parsing a label. v2 shipped to nobody.
        let doc = try JSONSerialization.jsonObject(with: Data("""
        {"schema":2,"profiles":[{"id":"x","name":"X","cast":"turtle","level":"P3",
          "createdAt":1750000000,"patchwerk":[],"lifetimeCrystals":0,"skills":{},
          "sessions":[{"id":"s","mode":"quest","topic":null,"startedAt":1,"endedAt":2,
            "total":1,"correct":0,"bestStreak":0,"crystals":0,"timeOnItems":1,"maxPool":1,
            "wrongCounts":{},"skills":{},
            "reviews":[{"question":"Q","answer":"a","explanation":"e","figureKind":"rect",
                        "figureLong":"14 cm","figureWide":"9 cm","figureRatio":1.5,
                        "figureParts":0,"figureFilled":0}]}]}]}
        """.utf8)) as! [String: Any]
        let migrated = try ProgressCodec.migrate(doc, from: 2)
        let profiles = migrated["profiles"] as! [[String: Any]]
        let sessions = profiles[0]["sessions"] as! [[String: Any]]
        let review = (sessions[0]["reviews"] as! [[String: Any]])[0]
        #expect(review["figureKind"] == nil)
        #expect(review["figureLong"] == nil)
        #expect(review["question"] as? String == "Q")     // the words survive
        #expect(review["explanation"] as? String == "e")
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
        // v3 since the fix pass of 2026-09-07: `fadeRun` on every skill, and a review
        // row carrying the engine's own `figure` spec instead of six flattened columns.
        #expect(ProgressSchema.current == 3)
        #expect(ProgressSchema.oldest == 1)
    }
}
