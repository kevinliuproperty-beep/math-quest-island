import Testing
import Foundation
import MQDesign
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
        for _ in 0..<12 { await store.answer(s, charlotte, "peri", correct: true) }
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
        for _ in 0..<9 { await store.answer(sa, a, "peri", correct: true) }
        for _ in 0..<4 { await store.answer(sb, b, "peri", correct: false) }
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
        let store = MQProgressStore.inMemory()
        let id = await store.addProfile(name: "Ben", cast: .turtle, level: "P2")
        let record = await store.profileRecords().first
        #expect(record?.id == id)
        #expect(record?.profile.id == "Ben")     // MQDesign's identity is the display name
        await store.setLevel("P3", profile: id)
        #expect(await store.profileRecords().first?.profile.level == "P3")
        #expect(await store.profileRecords().first?.id == id)
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
