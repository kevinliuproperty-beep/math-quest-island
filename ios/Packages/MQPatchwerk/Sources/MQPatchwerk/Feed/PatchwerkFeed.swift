import Foundation
import MQContent

/// Where Patchwerk's questions come from.
///
/// The fight draws across EVERY unlocked topic for the class level, one topic per
/// item, which is why the web's audit measured its repeat rate at 0.021 against
/// the main mode's 0.376. Three rules, all mirrored from `js/app.js`'s
/// `MODE_FEED`:
///
///  1. **The pool climbs with the stacks.** A child on a big streak is fed harder
///     questions, which is exactly where the bigger `BASE_DAMAGE` lives. Damage
///     is therefore earned by getting harder, not by farming pool 1.
///  2. **The topic is redrawn every item.** Not a session feed: `QuestionRequest`
///     documents `.pool(topic:level:)` as Patchwerk's path, memoryless by design,
///     because the topic rotation is the variety mechanism here and the engine's
///     no-repeat rings are for the child's Quest session.
///  3. **A no-repeat-last-3 ring on the stem SHAPE**, up to six redraws. Without
///     it the rotation can still hand out three clones of one template in a row.
///
/// It holds no timer and no clock: the feed is asked for the next question, it is
/// never in charge of when.
///
/// An `actor` because it holds the shape ring and the PRNG across an `await` on
/// the engine. Under Swift 6 that is not a style question - a class here is a
/// non-Sendable value crossing an isolation boundary, and the compiler says so.
public actor PatchwerkFeed {

    /// Weights over pools 1/2/3, by stacks held. The web's table, verbatim.
    public static func poolWeights(stacks: Int) -> [Double] {
        if stacks >= 7 { return [0.10, 0.30, 0.60] }
        if stacks >= 4 { return [0.25, 0.45, 0.30] }
        return [0.55, 0.35, 0.10]
    }

    /// The number of stem shapes the ring remembers.
    public static let ringLength = 3
    /// How many times a draw may be rejected for repeating a shape before the
    /// feed takes what it has. Six, as the web does - a feed that loops until it
    /// is happy is a feed that can hang on a thin topic.
    public static let maxRedraws = 6

    private let source: QuestionSource
    /// Live, registered topics for the class level. Empty is a caller error the
    /// picker must prevent, and `next` surfaces it as a thrown error rather than
    /// an empty screen.
    public let topics: [String]
    private var rng: PatchwerkRNG
    private var ring: [String] = []

    public init(source: QuestionSource, topics: [String], rng: PatchwerkRNG) {
        self.source = source
        self.topics = topics
        self.rng = rng
    }

    /// Live topics for a class level, in registry order. Mirrors `pwTopics()`:
    /// unlocked AND actually registered.
    public static func topics(in catalogue: TopicCatalogue, level: String) -> [String] {
        catalogue.topics
            .filter { $0.isLive && $0.grades.contains(level) }
            .map(\.id)
    }

    public enum FeedError: Error, Equatable { case noTopics }

    /// Pick a difficulty pool for the stacks in hand.
    public func pickPool(stacks: Int) -> Int {
        let w = Self.poolWeights(stacks: stacks)
        let r = rng.next()
        var acc = 0.0
        for i in 0..<3 {
            acc += w[i]
            if r < acc { return i + 1 }
        }
        return 3
    }

    /// The next question for a child holding `stacks` stacks.
    public func next(stacks: Int) async throws -> Question {
        guard !topics.isEmpty else { throw FeedError.noTopics }
        let pool = pickPool(stacks: stacks)

        var last: Question?
        for _ in 0..<Self.maxRedraws {
            guard let topic = rng.pick(topics) else { throw FeedError.noTopics }
            let q = try await source.nextQuestion(.pool(topic: topic, level: pool))
            last = q
            if !ring.contains(shapeKey(q)) { break }
        }

        guard let question = last else { throw FeedError.noTopics }
        ring.append(shapeKey(question))
        while ring.count > Self.ringLength { ring.removeFirst() }
        return question
    }

    private func shapeKey(_ q: Question) -> String {
        PatchwerkShapeKey.key(stem: q.stem, extra: q.extra)
    }

    /// What the ring currently holds. For tests and for a debug overlay; the game
    /// never reads it.
    public var recentShapes: [String] { ring }
}
