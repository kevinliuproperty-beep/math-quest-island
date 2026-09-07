import Testing
import Foundation
import MQContent
import MQDesign
@testable import MQProgress

/// Cleared / Ready / Coming soon are DERIVED, never stored - so there is no way for a
/// map to say "cleared" about an island the record of attempts does not agree was cleared.
/// The four cases are `MQMapNode.State`'s four cases on purpose.
@Suite("Node state derives from the record")
struct NodeStateTests {

    /// Built by DECODING the engine's own JSON shape rather than through a memberwise
    /// init (`Topic`'s is internal to MQContent). Bonus: if `listTopics` ever stops
    /// producing this shape, these tests say so too.
    static func topic(_ id: String, skills: [String], status: String = "live") -> Topic {
        let skillJSON = skills
            .map { #"{"id":"\#($0)","label":"\#($0)","tip":"Try it on paper."}"# }
            .joined(separator: ",")
        let json = """
        {"id":"\(id)","level":"P4","strand":"Measurement","moeSubTopic":"Area and perimeter",
         "label":"Perimeter Palace","short":"Perimeter","emoji":"P","name":"Perimeter Palace",
         "blurb":"Area & perimeter","grades":["P4"],"status":"\(status)",
         "skills":[\(skillJSON)],"poolSizes":{"1":2,"2":2,"3":1},"generators":[]}
        """
        // force_try on purpose: a malformed literal here is a broken TEST, and it should
        // stop the suite rather than be turned into a soft "no topic" that passes.
        return try! JSONDecoder().decode(Topic.self, from: Data(json.utf8))
    }

    @Test("A locked node is Coming soon whatever the child has done")
    func lockedIsComingSoon() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let node = await store.node(profile: p, topic: Self.topic("percent", skills: ["pct"],
                                                                  status: "locked"))
        #expect(node.state == .comingSoon)
    }

    @Test("A live node nobody has touched is open")
    func untouchedIsOpen() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let node = await store.node(profile: p, topic: Self.topic("geometry", skills: ["peri", "area"]))
        #expect(node.state == .open)
        #expect(node.attempts == 0)
        #expect(node.mastery == 0)
    }

    @Test("One skill in and it is in progress, with the collected count the map draws")
    func partialIsInProgress() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<5 { await store.answer(s, p, "peri", correct: true) }
        await store.answer(s, p, "area", correct: false)

        let node = await store.node(profile: p, topic: Self.topic("geometry", skills: ["peri", "area"]))
        #expect(node.state == .inProgress(collected: 1, total: 2))
        #expect(node.skillsMastered == 1)
        #expect(node.attempts == 6)
    }

    @Test("Cleared needs every skill over the web's own bands")
    func clearedNeedsEverySkill() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        let topic = Self.topic("geometry", skills: ["peri", "area"])

        for _ in 0..<5 { await store.answer(s, p, "peri", correct: true) }
        #expect(await store.node(profile: p, topic: topic).state != .cleared)
        for _ in 0..<5 { await store.answer(s, p, "area", correct: true) }
        #expect(await store.node(profile: p, topic: topic).state == .cleared)
    }

    @Test("Four attempts at 75% is not cleared: the band is the web's 80%")
    func bandIsEighty() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        let topic = Self.topic("geometry", skills: ["peri"])
        await store.answer(s, p, "peri", correct: false)
        for _ in 0..<3 { await store.answer(s, p, "peri", correct: true) }
        #expect(abs(await store.mastery(profile: p, skill: SkillID("peri")) - 0.75) < 1e-9)
        #expect(await store.node(profile: p, topic: topic).state != .cleared)
    }

    @Test("A node with no skills registered yet is Coming soon, not cleared")
    func emptySkillListIsComingSoon() async {
        // The trap: "every skill is mastered" is vacuously true of zero skills, which
        // would paint an unwritten island as finished.
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let node = await store.node(profile: p, topicID: "algebra", skills: [], isLive: true)
        #expect(node.state == .comingSoon)
    }

    @Test("Node mastery is the mean over the node's skills, unplayed ones counted as zero")
    func nodeMasteryIsAMean() async {
        let store = MQProgressStore.inMemory()
        let p = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let s = await store.beginSession(profile: p, mode: .quest)
        for _ in 0..<4 { await store.answer(s, p, "peri", correct: true) }
        let node = await store.node(profile: p, topic: Self.topic("geometry", skills: ["peri", "area"]))
        #expect(abs(node.mastery - 0.5) < 1e-9)
    }

    @Test("Every derived state has a map state, and they are the same state")
    func statesMapOntoTheDesign() {
        #expect(NodeProgress.State.cleared.asMapState == .cleared)
        #expect(NodeProgress.State.open.asMapState == .open)
        #expect(NodeProgress.State.comingSoon.asMapState == .comingSoon)
        #expect(NodeProgress.State.inProgress(collected: 2, total: 5).asMapState
                == .inProgress(collected: 2, total: 5))
    }

    @Test("An unknown profile reads as an untouched island rather than trapping")
    func unknownProfileIsSafe() async {
        let store = MQProgressStore.inMemory()
        let node = await store.node(profile: ProfileID("ghost"),
                                    topic: Self.topic("geometry", skills: ["peri"]))
        #expect(node.state == .open)
    }
}
