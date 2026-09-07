import Testing
import Foundation
import MQContent
@testable import MQProgress

/// Two or three heroes on one iPad, no login anywhere. The property that matters most
/// here is ISOLATION: siblings share the device, and one child's fade must never reach
/// the other's training wheels.
@Suite("Profiles are local, separate and unnamed by any server")
struct ProfileTests {

    @Test("One child's fade never touches another's")
    func fadeIsPerProfile() async {
        let store = MQProgressStore.inMemory()
        let charlotte = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let ben = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")

        let s = await store.beginSession(profile: charlotte, mode: .quest)
        for _ in 0..<21 { await store.answer(s, charlotte, "peri", correct: true) }
        _ = await store.fadeScaffold(profile: charlotte, skill: SkillID("area"), to: .hint)

        #expect(await store.scaffold(profile: charlotte, skill: SkillID("peri")) == .none)
        #expect(await store.scaffold(profile: charlotte, skill: SkillID("area")) == .hint)
        // Ben has done nothing, so Ben still gets all the help.
        #expect(await store.scaffold(profile: ben, skill: SkillID("peri")) == .full)
        #expect(await store.scaffold(profile: ben, skill: SkillID("area")) == .full)
        #expect(await store.mastery(profile: ben, skill: SkillID("peri")) == 0)
        #expect(await store.poolLevel(profile: ben, skill: SkillID("peri")) == 1)
    }

    @Test("Mastery, pools, sessions and crystals are per profile too")
    func everythingIsPerProfile() async {
        let store = MQProgressStore.inMemory()
        let a = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let b = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")

        let sa = await store.beginSession(profile: a, mode: .quest)
        let sb = await store.beginSession(profile: b, mode: .quest)
        // Three crystals for Charlotte, reported by the battle; none for Ben, who got
        // every item wrong and never felled a monster.
        for i in 0..<9 { await store.answer(sa, a, "peri", correct: true, crystals: i % 3 == 2 ? 1 : 0) }
        for _ in 0..<4 { await store.answer(sb, b, "peri", correct: false, crystals: 1) }
        _ = await store.endSession(sa)
        _ = await store.endSession(sb)

        #expect(await store.mastery(profile: a, skill: SkillID("peri")) == 1)
        #expect(await store.mastery(profile: b, skill: SkillID("peri")) == 0)
        #expect(await store.poolLevel(profile: a, skill: SkillID("peri")) == 3)
        #expect(await store.poolLevel(profile: b, skill: SkillID("peri")) == 1)
        #expect(await store.sessions(profile: a).count == 1)
        #expect(await store.sessions(profile: b).count == 1)

        let profiles = await store.profiles()
        #expect(profiles.map(\.name) == ["Charlotte", "Ben"])   // entrance order is insertion order
        #expect(profiles.first?.crystals == 3)
        #expect(profiles.last?.crystals == 0)
    }

    @Test("Two sessions can run at once without leaking into each other")
    func concurrentSessionsAreSeparate() async {
        // Not a hypothetical: a sibling handoff mid-run leaves two open sessions.
        let store = MQProgressStore.inMemory()
        let a = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let b = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
        let sa = await store.beginSession(profile: a, mode: .quest)
        let sb = await store.beginSession(profile: b, mode: .patchwerk)
        for _ in 0..<5 { await store.answer(sa, a, "peri", correct: true) }
        await store.answer(sb, b, "tables", correct: true)
        #expect(await store.streak(session: sa) == 5)
        #expect(await store.streak(session: sb) == 1)
    }

    @Test("Display names are kept unique, because MQProfile's identity IS its name")
    func namesAreUnique() async {
        let store = MQProgressStore.inMemory()
        let first = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
        let second = await store.addProfile(name: "Ben", cast: .octopus, level: "P3")
        let names = await store.profiles().map(\.name)
        #expect(names == ["Ben", "Ben 2"])
        #expect(first != second)
        #expect(await store.profileID(named: "Ben") == first)
        #expect(await store.profileID(named: "Ben 2") == second)
        // A blank name still gets a token a child can tap.
        _ = await store.addProfile(name: "   ", cast: .unicorn, level: "P4")
        #expect(await store.profiles().last?.name == "Explorer")
    }

    @Test("A ProfileID survives a rename; MQProfile's own id does not")
    func idIsStableAcrossARename() async {
        // THIS TEST USED TO RENAME NOTHING. Its body called `setLevel` - a class-level
        // change - and there was no rename API in the module at all, so the suite carried
        // a test named after a capability that did not exist (Progress Refutation W4,
        // 2026-09-07). It now actually renames, and asserts what a rename must not move.
        let store = MQProgressStore.inMemory()
        let id = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
        let s = await store.beginSession(profile: id, mode: .quest, topic: "geometry")
        for _ in 0..<9 { await store.answer(s, id, "tables", correct: true, crystals: 1) }
        _ = await store.endSession(s)

        #expect(await store.profileRecords().first?.profile.id == "Ben")  // display identity IS the name

        let stored = await store.rename("Benjamin", profile: id)
        #expect(stored == "Benjamin")

        // The ID did not move, so everything hanging off it did not move either.
        let record = await store.profileRecords().first
        #expect(record?.id == id)                                 // the stable identity
        #expect(record?.profile.name == "Benjamin")               // the display one changed
        #expect(record?.profile.id == "Benjamin")                 // and so did MQProfile's
        #expect(await store.profileID(named: "Benjamin") == id)
        #expect(await store.profileID(named: "Ben") == nil)
        #expect(await store.mastery(profile: id, skill: SkillID("tables")) == 1)
        #expect(await store.poolLevel(profile: id, skill: SkillID("tables")) == 3)
        #expect(await store.sessions(profile: id).count == 1)
        #expect(await store.sessions(profile: id).first?.summary.topic == "geometry")
        #expect(await store.profiles().first?.crystals == 6)
        #expect(await store.profiles().first?.level == "P2")      // the class level is untouched
    }

    @Test("A rename survives the disk, and keeps display names unique")
    func renameIsPersistedAndUniqued() async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing)
        let ben = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
        let mira = await store.addProfile(name: "Mira", cast: .octopus, level: "P5")

        // Renaming a child to a name already on the beach uniques it, exactly as
        // addProfile does - two tokens reading "Ben" is a design failure before it is a
        // lookup one.
        #expect(await store.rename("Ben", profile: mira) == "Ben 2")
        // Renaming a child to the name they ALREADY have is a no-op, not a promotion.
        #expect(await store.rename("Ben", profile: ben) == "Ben")
        // A blank name still leaves a token a child can tap.
        #expect(await store.rename("   ", profile: mira) == "Explorer")
        // An unknown profile is a nil, not a trap.
        #expect(await store.rename("Ghost", profile: ProfileID("nobody")) == nil)

        let reopened = try MQProgressStore(persistence: InMemoryPersistence(seed: backing.raw))
        #expect(await reopened.profiles().map(\.name) == ["Ben", "Explorer"])
        #expect(await reopened.profileID(named: "Explorer") == mira)
    }

    @Test("Removing a profile removes everything of theirs and nothing of anyone else's")
    func removeIsClean() async {
        let store = MQProgressStore.inMemory()
        let a = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let b = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
        let sa = await store.beginSession(profile: a, mode: .quest)
        let sb = await store.beginSession(profile: b, mode: .quest)
        for _ in 0..<6 { await store.answer(sa, a, "peri", correct: true) }
        for _ in 0..<6 { await store.answer(sb, b, "peri", correct: true) }

        await store.removeProfile(a)
        #expect(await store.profiles().map(\.name) == ["Ben"])
        #expect(await store.mastery(profile: a, skill: SkillID("peri")) == 0)
        #expect(await store.streak(session: sa) == 0)          // their session went with them
        #expect(await store.mastery(profile: b, skill: SkillID("peri")) == 1)
        #expect(await store.streak(session: sb) == 6)
    }

    @Test("Removing a profile that is not there does nothing at all")
    func removeUnknownIsANoOp() async {
        let store = MQProgressStore.inMemory()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        await store.removeProfile(ProfileID("nobody"))
        #expect(await store.profiles().count == 1)
    }

    @Test("Every cast round-trips", arguments: MQCast.allCases)
    func castsRoundTrip(_ cast: MQCast) async throws {
        let backing = InMemoryPersistence()
        let store = try MQProgressStore(persistence: backing)
        _ = await store.addProfile(name: "Hero", cast: cast, level: "P4")
        let reopened = try MQProgressStore(persistence: InMemoryPersistence(seed: backing.raw))
        #expect(await reopened.profiles().first?.cast == cast)
    }

    @Test("A cast a later build invents survives a round trip through this one")
    func unknownCastSurvives() async throws {
        // The store keeps `cast` as a raw string, so an older build that opens a newer
        // file shows the child a unicorn but does NOT rewrite their dragon away.
        let json = """
        {"schema":2,"profiles":[{"id":"p","name":"Charlotte","cast":"dragon","level":"P4",
          "createdAt":1750000000,"skills":{},"sessions":[],"patchwerk":[],"lifetimeCrystals":0}]}
        """
        let backing = InMemoryPersistence(seed: Data(json.utf8))
        let store = try MQProgressStore(persistence: backing)
        #expect(await store.profiles().first?.cast == .unicorn)     // drawn as the default
        await store.setLevel("P5", profile: ProfileID("p"))
        let rewritten = try #require(backing.raw)
        #expect(String(data: rewritten, encoding: .utf8)?.contains("dragon") == true)
    }

    @Test("An attempt for a profile that was just deleted is dropped, not trapped on")
    func attemptForDeletedProfile() async {
        let store = MQProgressStore.inMemory()
        let a = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: a, mode: .quest)
        await store.removeProfile(a)
        let delta = await store.answer(s, a, "peri", correct: true)
        #expect(delta.masteryAfter == 0)
        #expect(delta.crystalsEarned == 0)
    }
}
