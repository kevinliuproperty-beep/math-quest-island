import Foundation

/// One island on the map: an MOE sub-topic, its skills, and every generator behind it.
public struct Topic: Codable, Hashable, Sendable, Identifiable {

    public struct Skill: Codable, Hashable, Sendable, Identifiable {
        public let id: String
        public let label: String
        /// One sentence a parent can act on at the kitchen table. Authored per skill.
        public let tip: String
    }

    /// A single pool entry, addressable through `QuestionRequest.generator`.
    /// Note there are MORE refs than distinct generator functions: the same function
    /// legitimately appears in more than one pool (gPeri sits in 1, 2 and 3).
    public struct GeneratorRef: Codable, Hashable, Sendable, Identifiable {
        public let ref: String
        public let pool: Int
        public let index: Int
        public let skill: String
        public var id: String { ref }
    }

    public let id: String
    /// MOE level: "P2" ... "P6".
    public let level: String
    /// MOE strand, verbatim from the syllabus.
    public let strand: String
    /// MOE sub-topic wording, copied exactly from the Oct 2025 syllabus PDF.
    public let moeSubTopic: String
    public let label: String
    public let short: String
    public let emoji: String
    /// Map node name and blurb, from `js/registry.js`.
    public let name: String
    public let blurb: String
    public let grades: [String]
    public let status: String
    public let skills: [Skill]
    /// Keyed "1", "2", "3" - the JS object's own keys.
    public let poolSizes: [String: Int]
    public let generators: [GeneratorRef]

    public var isLive: Bool { status == "live" }
    public func skill(_ id: String) -> Skill? { skills.first { $0.id == id } }
}

/// A map node, including the ones no topic file backs yet ("Coming soon").
public struct MapNode: Codable, Hashable, Sendable, Identifiable {
    public let id: String
    public let emoji: String
    public let name: String
    public let blurb: String
    public let grades: [String]
    public let status: String
    /// Live *and* backed by a registered topic. The only nodes a child may enter.
    public let playable: Bool
}

/// Everything `listTopics` returns in one value.
public struct TopicCatalogue: Codable, Hashable, Sendable {
    public let count: Int
    /// Total POOL ENTRIES across every topic, not distinct generator functions.
    public let generatorCount: Int
    public let topics: [Topic]
    public let grades: [String]
    public let nodes: [MapNode]

    public func topic(_ id: String) -> Topic? { topics.first { $0.id == id } }
    public var allGeneratorRefs: [String] { topics.flatMap { $0.generators.map(\.ref) } }
}

/// Which engine bundle is running. The app logs this at launch so a dress rehearsal
/// can say exactly which engine the child played.
public struct EngineBuild: Codable, Hashable, Sendable {
    /// `"<YYYYMMDD>-<git short sha>"`, plus `-dirty` when built off an uncommitted tree.
    public let stamp: String
    public let date: String
    public let sha: String
    public let dirty: Bool
    /// sha256 (16 hex) of the engine sources + shim + API, stamp excluded. Two bundles
    /// with the same payload hash contain the same code whatever day they were built.
    public let payloadHash: String
    public let files: [String]
    public let fileCount: Int
    public let topicCount: Int
    /// Pool entries.
    public let generatorCount: Int
    /// Distinct generator functions.
    public let distinctGenerators: Int
    /// "javascriptcore" in the app, "node" under the parity harness.
    public let platform: String
}

/// What the engine's feed-session map is holding.
///
/// That map is the engine's only unbounded state: each named session owns a
/// `createFeed` closure with its no-repeat rings, and before the cap existed 20,000
/// un-ended sessions measured 189 MB resident, dead linear, with no plateau. It is now
/// LRU-capped, and this is how a caller sees whether the cap is binding instead of
/// guessing.
public struct SessionState: Codable, Hashable, Sendable {
    /// Sessions currently held.
    public let open: Int
    /// The LRU cap the engine enforces.
    public let cap: Int
    /// Sessions dropped by the LRU since this context was created. A non-zero count on
    /// a real device means someone is minting session ids instead of reusing one.
    public let evicted: Int
    /// Session ids retired by the call that returned this (empty for a pure read).
    public let ended: [String]

    public init(open: Int, cap: Int, evicted: Int, ended: [String] = []) {
        self.open = open; self.cap = cap; self.evicted = evicted; self.ended = ended
    }

    private enum CodingKeys: String, CodingKey { case open, cap, evicted, ended }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.open = (try? c.decodeIfPresent(Int.self, forKey: .open)).flatMap { $0 } ?? 0
        self.cap = (try? c.decodeIfPresent(Int.self, forKey: .cap)).flatMap { $0 } ?? 0
        self.evicted = (try? c.decodeIfPresent(Int.self, forKey: .evicted)).flatMap { $0 } ?? 0
        self.ended = (try? c.decodeIfPresent([String].self, forKey: .ended)).flatMap { $0 } ?? []
    }
}
