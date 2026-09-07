import Foundation
import CoreGraphics
import MQContent
import MQDesign
import MQProgress

/// One stop on the island: a topic, plus where the child has got to on it.
///
/// The engine owns the LIST (`MQI_API.listTopics` returns 28 live topics and the
/// two locked P6 nodes); the store owns the STATE; this type is where the two
/// meet and nothing else in the app joins them again.
public struct QNode: Sendable, Equatable, Identifiable {
    public var id: String { topicID }
    /// The engine's own topic key, e.g. `p4area`. This is what goes back to
    /// `nextQuestion(topic:level:session:)`.
    public let topicID: String
    public let name: String
    public let blurb: String
    public let grades: [String]
    public let playable: Bool
    /// Skills declared by the topic. One crystal each: a node's crystals are a
    /// number about the ISLAND (what is left to find), never a percentage about
    /// the child.
    public let skills: [String]
    /// Skills whose mastery has crossed `QNode.masteredAt`.
    public var mastered: Int
    /// 0...1 across the node's skills, for the marker's own fill.
    public var mastery: Double

    /// Where "this skill is done" sits. One number, in one place, because it
    /// decides both the crystal count and whether a node reads as cleared.
    public static let masteredAt: Double = 0.8

    public var crystalsTotal: Int { max(skills.count, 1) }

    public var state: MQMapNode.State {
        guard playable else { return .comingSoon }
        if mastered >= crystalsTotal { return .cleared }
        if mastered > 0 || mastery > 0 {
            return .inProgress(collected: mastered, total: crystalsTotal)
        }
        return .open
    }
}

/// The island a child is looking at: their level's nodes, laid out.
public struct QIsland: Sendable, Equatable {
    public let level: String
    public let nodes: [QNode]

    public var crystals: Int { nodes.reduce(0) { $0 + $1.mastered } }

    /// The design's map node for stop `i`, with its place on the island and the
    /// landmark drawn under it.
    public func mapNodes() -> [MQMapNode] {
        nodes.enumerated().map { i, n in
            MQMapNode(n.name, n.state, at: QIsland.place(i, of: nodes.count),
                      landmark: QIsland.landmark(i))
        }
    }

    /// A serpentine up the island, in unit coordinates of the map canvas.
    ///
    /// `MQMapScene.sample` hand-places eight stops; a real level has as few as
    /// four and as many as eleven, so the path has to be generated. Two rules
    /// only: stops alternate side to side (which is what makes a path read as a
    /// journey rather than as a list), and the first stop is nearest the bottom
    /// of the frame (which is where a child's eye starts).
    ///
    /// `MQMapScreen` re-lays these for a tall frame itself, so these coordinates
    /// are the landscape ones.
    /// **Two lanes for a short island, three for a long one.** P4 has ELEVEN
    /// stops, and eleven markers zig-zagged between two lanes put every name
    /// plank within 80 pt of its neighbour's - the first driven map PNG had
    /// "Missing Side Marsh" sitting on "Pie Chart Point". A third lane costs
    /// nothing (the island is 768 pt tall and the mist takes the top third
    /// anyway) and pushes same-lane neighbours from 160 pt apart to 250.
    public static let twoLaneMax = 8

    public static func place(_ i: Int, of count: Int) -> CGPoint {
        let n = max(count - 1, 1)
        let t = CGFloat(i) / CGFloat(n)
        let lanes = count > twoLaneMax ? 3 : 2
        // Lane 0 is nearest the shore, the last lane is furthest inland.
        let lane = CGFloat(i % lanes) / CGFloat(lanes - 1)
        return CGPoint(x: 0.09 + t * 0.82,
                       y: 0.80 - lane * 0.44 - t * 0.06)
    }

    static let landmarks: [MQLandmark] =
        [.palace, .reef, .bay, .jetty, .cove, .lagoon, .peak, .atoll]

    public static func landmark(_ i: Int) -> MQLandmark {
        landmarks[i % landmarks.count]
    }

    /// Build the island for one class level out of the engine's catalogue and a
    /// mastery reading. Order is the registry's own, which is the order the web
    /// app draws and the order a parent has already seen.
    public static func build(catalogue: TopicCatalogue, level: String,
                             mastery: [SkillID: Double]) -> QIsland {
        var out: [QNode] = []
        for node in catalogue.nodes where node.grades.contains(level) {
            let topic = catalogue.topic(node.id)
            let skills = topic?.skills.map(\.id) ?? []
            let scores = skills.map { mastery[SkillID($0)] ?? 0 }
            let mastered = scores.filter { $0 >= QNode.masteredAt }.count
            let mean = scores.isEmpty ? 0 : scores.reduce(0, +) / Double(scores.count)
            out.append(QNode(topicID: node.id,
                             name: node.name,
                             blurb: node.blurb,
                             grades: node.grades,
                             playable: node.playable,
                             skills: skills,
                             mastered: mastered,
                             mastery: mean))
        }
        return QIsland(level: level, nodes: out)
    }
}
