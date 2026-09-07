import Testing
import Foundation
import MQContent
import MQDesign
import MQEngineJS
import MQProgress
@testable import MQQuest

// =============================================================================
// THE GATE THAT WOULD HAVE CAUGHT IT
//
// The Phase 1 packet shipped 402 green tests, twelve driven sessions with zero
// tap misses, and a 12 x 7 matrix gate - over a build in which **the app
// recorded nothing a child ever did**.
//
// `QQuestModel.pick` built the store key out of the profile's display NAME while
// `MQProgressStore.addProfile` minted a UUID, so every `Attempt` arrived keyed
// "Charlotte" against a store keyed AB1386B6-..., `record()` took its "no
// profile, no progress" early return on every answer, and the document on disk
// came back `"skills":{}`, `"sessions":[]`, `lifetimeCrystals: 0` after 34
// correct answers. A second process, cold, drew every node Ready. The island
// could never change, mastery could never carry, the scaffold could never fade
// and "Cleared" could never appear (Phase 1 dress rehearsal, leg 8).
//
// **Why 402 tests missed it.** Every suite in the packet either built its own
// `ProfileID` from a string and then used that same string everywhere, or
// exercised `MQProgressStore` and `QQuestModel` separately. Nothing ever ran
// `addProfile` and `pick` against each other, and nothing ever asked the store
// what it held when the run was over.
//
// So the shape of this gate is deliberate, and it is the shape the defect
// demands:
//
//   1. play through the REAL model into a FILE store;
//   2. throw the model and the store away;
//   3. open the SAME FILE in a new store and a new model, and read.
//
// Step 3 is the one that cannot be faked. An in-memory store handed straight
// back to the object that wrote it will agree with itself about anything.
// =============================================================================

@Suite("Progress survives the process, and the identity path is single",
       .serialized)
struct QPersistenceGateTests {

    static let engine = try! JSQuestionEngine()

    static func tempDoc(_ name: String) -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("mqpersist-\(name)-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("progress.json")
    }

    /// A store on a real file, written on every answer. `.immediate` rather than
    /// the app's coalescing window: a gate that has to sleep to be true is a gate
    /// that is flaky on a loaded machine.
    static func fileStore(_ url: URL) throws -> MQProgressStore {
        try MQProgressStore.onDisk(url: url, writes: .immediate)
    }

    /// Answer the question on the board correctly, through the keypad or a tile -
    /// the child's own path, never `model.record`.
    @MainActor
    static func answerCorrectly(_ m: QQuestModel) async {
        guard let q = m.question else { return }
        if q.isTyped {
            for ch in QDriver.correctTypedText(q) {
                switch ch {
                case "0"..."9": m.press(.digit(Int(String(ch)) ?? 0))
                case ".":       m.press(.decimalPoint)
                case "/":       m.press(.slash)
                case "-":       m.press(.minus)
                default:        break
                }
            }
            if let chip = m.chips.first(where: { QUnits.accepts($0, in: q.acceptedUnits) }) {
                m.toggleChip(chip)
            }
            await m.submitTyped()
        } else {
            await m.choose(max(q.correctIndex, 0))
        }
        await m.advance()
    }

    /// Play one whole set on `node`, and return what the RUN thought happened.
    @MainActor
    static func playASet(store: MQProgressStore, node: String, level: String,
                         profile: ProfileRecord, items: Int)
        async throws -> (answered: Int, correct: Int, crystals: Int) {
        QTestFonts.ensure()
        let m = QQuestModel(source: engine, store: store,
                            random: QSeededRandom(seed: 20_260_907), setSize: items)
        await m.load()
        await m.pick(profile)
        let target = try #require(m.island?.nodes.first { $0.topicID == node },
                                  "no node \(node) on the \(level) island")
        await m.open(target)
        while m.phase == .asking { await answerCorrectly(m) }
        if m.phase != .result { await m.finish() }
        return (m.run.answered, m.run.correct, m.run.crystals)
    }

    // MARK: - The blocker

    @MainActor
    @Test("twelve answers played on a file store are still there after a restart")
    func progressSurvivesTheProcess() async throws {
        let doc = Self.tempDoc("restart")

        // --- process 1: make a child, play a set --------------------------
        let played: (answered: Int, correct: Int, crystals: Int)
        let writtenID: ProfileID
        do {
            let store = try Self.fileStore(doc)
            writtenID = await store.addProfile(name: "Charlotte", cast: .unicorn,
                                               level: "P4")
            let record = try #require(await store.profileRecords()
                                        .first { $0.id == writtenID })
            played = try await Self.playASet(store: store, node: "p4area",
                                             level: "P4", profile: record, items: 12)
            await store.flush()
        }
        #expect(played.answered >= 11,
                "the set should have run; it answered \(played.answered)")
        #expect(played.correct == played.answered)

        // --- process 2: a COLD store over the same bytes -------------------
        let store2 = try Self.fileStore(doc)
        let records2 = await store2.profileRecords()
        #expect(records2.count == 1)
        let record2 = try #require(records2.first)
        #expect(record2.id == writtenID,
                "the profile's id must be the same id after a restart")

        let mastery = await store2.mastery(profile: record2.id)
        let sessions = await store2.sessions(profile: record2.id)

        // The four numbers that were 0, 0, 0 and Ready on the branch the
        // rehearsal drove, against 34 correct answers.
        #expect(mastery.count > 0,
                "SKILLS: \(mastery.count) skill rows after \(played.correct) correct")
        #expect(sessions.count == 1,
                "SESSIONS: exactly one finished session, got \(sessions.count)")
        #expect(record2.profile.crystals == played.crystals,
                "CRYSTALS: disk \(record2.profile.crystals), run \(played.crystals)")

        // NODE STATE CARRIED: the island a cold model draws is not all-Ready.
        let m2 = QQuestModel(source: Self.engine, store: store2)
        await m2.load()
        await m2.pick(record2)
        let node = try #require(m2.island?.nodes.first { $0.topicID == "p4area" })
        #expect(node.state != .open,
                "the map still draws p4area as Ready after a full correct set")
        #expect((m2.island?.crystals ?? 0) > 0,
                "the island shows 0 crystals found after a full correct set")
    }

    @MainActor
    @Test("a second child's answers move nothing on the first child's island")
    func profilesAreIsolated() async throws {
        let doc = Self.tempDoc("isolation")
        let store = try Self.fileStore(doc)
        let benID = await store.addProfile(name: "Ben", cast: .turtle, level: "P4")
        let meiID = await store.addProfile(name: "Mei", cast: .octopus, level: "P4")
        #expect(benID != meiID)

        let ben = try #require(await store.profileRecords().first { $0.id == benID })
        _ = try await Self.playASet(store: store, node: "p4area", level: "P4",
                                    profile: ben, items: 12)
        await store.flush()

        let benMastery = await store.mastery(profile: benID)
        let meiMastery = await store.mastery(profile: meiID)
        #expect(benMastery.count > 0)
        #expect(meiMastery.isEmpty,
                "Mei has \(meiMastery.count) skill rows and has never played")
        #expect(await store.sessions(profile: meiID).isEmpty)

        // And the ISLANDS differ, which is what a child would actually see.
        let mei = try #require(await store.profileRecords().first { $0.id == meiID })
        let m = QQuestModel(source: Self.engine, store: store)
        await m.load()
        await m.pick(mei)
        #expect((m.island?.crystals ?? -1) == 0)
        await m.pick(ben)
        #expect((m.island?.crystals ?? 0) > 0)
    }

    // MARK: - The identity path is single

    @Test("no source file builds a ProfileID out of a display string")
    func oneIdentityPath() throws {
        // A grep, as a test. The defect was one line - `ProfileID(chosen.name)` -
        // and the only durable defence against it coming back is that a `ProfileID`
        // may be MINTED and READ by `MQProgressStore` and constructed nowhere else
        // in any module's Sources.
        let ios = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()   // MQQuestTests
            .deletingLastPathComponent()   // Tests
            .deletingLastPathComponent()   // MQQuest
            .deletingLastPathComponent()   // Packages
            .deletingLastPathComponent()   // ios
        let fm = FileManager.default
        var offenders: [String] = []
        // The one file allowed to say it: the store MINTS ids and READS them back
        // off its own document, which is what a `ProfileID` is for.
        let allowed = "MQProgressStore.swift"
        // `Sources` is every module's app code. `Host` is the composition root -
        // app code too, and exactly the kind of file that would reach for
        // `ProfileID(name)` to save itself a lookup. Tests may fake an id.
        let roots = [ios.appendingPathComponent("Packages"),
                     ios.appendingPathComponent("Host")]

        for root in roots {
            let walker = fm.enumerator(at: root, includingPropertiesForKeys: nil)
            while let item = walker?.nextObject() as? URL {
                guard item.pathExtension == "swift" else { continue }
                let path = item.path
                guard !path.contains("/.build/") else { continue }
                guard path.contains("/Sources/") || path.contains("/Host/") else { continue }
                guard !path.hasSuffix(allowed) else { continue }
                guard let text = try? String(contentsOf: item, encoding: .utf8) else { continue }
                for (n, line) in text.split(separator: "\n", omittingEmptySubsequences: false)
                                     .enumerated() {
                    let code = line.trimmingCharacters(in: .whitespaces)
                    guard code.contains("ProfileID(") else { continue }
                    // The declaration itself, and comments naming the type.
                    if code.hasPrefix("//") || code.hasPrefix("///") { continue }
                    if code.contains("public init(") { continue }
                    offenders.append("\(item.lastPathComponent):\(n + 1): \(code)")
                }
            }
        }
        let list = offenders.joined(separator: "\n")
        #expect(offenders.isEmpty,
                "a ProfileID is constructed outside MQProgressStore:\n\(list)")
    }

    // MARK: - The dead `+`

    @MainActor
    @Test("the + token makes a profile and that profile is immediately playable")
    func newExplorerIsPlayable() async throws {
        QTestFonts.ensure()
        let doc = Self.tempDoc("newexplorer")
        let store = try Self.fileStore(doc)
        let m = QQuestModel(source: Self.engine, store: store, setSize: 12)
        await m.load()

        // A fresh install: one empty slot and nothing else.
        #expect(m.records.isEmpty)
        #expect(m.phase == .entrance)

        // The four taps.
        m.beginNewExplorer()
        #expect(m.phase == .newExplorer)
        m.chooseCast(.turtle)
        m.chooseLevel("P4")
        await m.createExplorer()

        // It made a profile, picked it, and landed on that child's island.
        #expect(m.phase == .map, "Start should land on the map, not \(m.phase)")
        #expect(m.records.count == 1)
        let made = try #require(m.records.first)
        #expect(made.profile.cast == .turtle)
        #expect(made.profile.level == "P4")
        #expect(m.currentProfileID == made.id,
                "the run must record against the id the store minted")
        #expect((m.island?.nodes.count ?? 0) > 0, "the new child's island is empty")

        // **Playable, end to end, and the answers reach the disk.**
        let node = try #require(m.island?.nodes.first { $0.topicID == "p4area" })
        await m.open(node)
        var answered = 0
        while m.phase == .asking, answered < 12 {
            await Self.answerCorrectly(m)
            answered += 1
        }
        if m.phase != .result { await m.finish() }
        await store.flush()

        let cold = try Self.fileStore(doc)
        let coldRecord = try #require(await cold.profileRecords().first)
        #expect(coldRecord.id == made.id)
        #expect(await cold.mastery(profile: made.id).count > 0,
                "a profile made through the + token records nothing")
        #expect(await cold.sessions(profile: made.id).count == 1)
    }

    @MainActor
    @Test("the creature the sheet offers is never the monster")
    func theSheetNeverOffersTheCrab() {
        #expect(!MQNewExplorerScene.casts.contains(.crab))
        #expect(MQNewExplorerScene.casts.count == 3)
    }

    @MainActor
    @Test("only class levels with live content are offered")
    func levelsComeFromTheCatalogue() async throws {
        let m = QQuestModel(source: Self.engine, store: MQProgressStore.inMemory())
        await m.load()
        let levels = m.levelsOffered
        #expect(!levels.isEmpty)
        #expect(levels.contains("P4"))
        // Every offered level must actually build an island with a playable stop.
        for level in levels {
            let cat = try await Self.engine.listTopics()
            let island = QIsland.build(catalogue: cat, level: level, mastery: [:])
            #expect(island.nodes.contains { $0.playable },
                    "\(level) is offered and has no playable stop")
        }
    }
}

// =============================================================================
// THE SAME CLAIM, THROUGH THE DRIVER
//
// The suite above drives the MODEL. This one drives the VIEWS, on a file store,
// and reads the transcript - because the transcript is what a refuter reads
// instead of the code, and on the rehearsal's branch a transcript could report
// twelve correct answers without being able to say whether one of them was
// written down.
// =============================================================================

@Suite("A driven run on a file store can be read back", .serialized)
struct QDrivenPersistenceTests {

    static let engine = try! JSQuestionEngine()

    static func tempDir(_ name: String) -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("mqdrivepersist-\(name)-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    @MainActor
    @Test("twelve driven items land on disk, and a second driven run finds them")
    func drivenRunPersists() async throws {
        let dir = Self.tempDir("drive")
        let doc = dir.appendingPathComponent("progress.json").path

        var script = QDriveScript(
            name: "persist", seed: 20_260_907, device: "ipad97-landscape",
            profile: QDriveProfile(name: "Charlotte", cast: "unicorn", level: "P4"),
            node: "p4area", items: 12, strategy: .alwaysCorrect, scale: 1)
        script.storePath = doc

        let first = try await QDriver(source: Self.engine, script: script,
                                      outDir: dir.appendingPathComponent("run1")).run()
        #expect(first.transcript.tapMisses.isEmpty,
                "\(first.transcript.tapMisses)")
        let s1 = try #require(first.transcript.store)
        #expect(s1.skills > 0, "the driven run wrote \(s1.skills) skill rows")
        #expect(s1.sessions == 1)
        #expect(s1.lifetimeCrystals == first.transcript.crystals,
                "disk \(s1.lifetimeCrystals) vs transcript \(first.transcript.crystals)")
        #expect(s1.path == doc)

        // A second run over the SAME document, reopening rather than seeding.
        script.reopenStore = true
        script.name = "persist-2"
        let second = try await QDriver(source: Self.engine, script: script,
                                       outDir: dir.appendingPathComponent("run2")).run()
        let s2 = try #require(second.transcript.store)
        #expect(s2.profileID == s1.profileID,
                "the cold run picked a different profile: \(s2.profileID) vs \(s1.profileID)")
        #expect(s2.sessions == 2, "two runs, \(s2.sessions) sessions on disk")
        #expect(s2.skills >= s1.skills)
        #expect(s2.lifetimeCrystals >= s1.lifetimeCrystals)
        #expect(s2.clearedNodes >= 1 || s2.mastery.values.contains { $0 > 0 },
                "nothing on the island moved after two perfect sets")
    }

    @MainActor
    @Test("a driven run can make its own profile through the + token")
    func drivenRunCreatesItsOwnProfile() async throws {
        let dir = Self.tempDir("create")
        let doc = dir.appendingPathComponent("progress.json").path

        var script = QDriveScript(
            name: "created", seed: 4242, device: "ipad97-landscape",
            profile: QDriveProfile(name: "Explorer", cast: "octopus", level: "P4"),
            node: "p4area", items: 6, strategy: .alwaysCorrect, scale: 1)
        script.storePath = doc
        script.createProfile = true

        let out = try await QDriver(source: Self.engine, script: script,
                                    outDir: dir).run()
        #expect(out.transcript.tapMisses.isEmpty,
                "the + path could not be tapped: \(out.transcript.tapMisses)")
        let s = try #require(out.transcript.store)
        #expect(s.skills > 0)
        #expect(s.sessions == 1)

        let cold = try MQProgressStore.onDisk(url: URL(fileURLWithPath: doc),
                                              writes: .immediate)
        let records = await cold.profileRecords()
        #expect(records.count == 1)
        #expect(records.first?.profile.cast == .octopus)
    }
}
