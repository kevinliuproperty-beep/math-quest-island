import Testing
import Foundation
import MQContent
@testable import MQPatchwerk

/// What the fight actually asks the child.
///
/// Patchwerk's variety comes from rotating the TOPIC on every item, not from the
/// engine's feed rings - the web audit measured its repeat rate at 0.021 against
/// the main mode's 0.376 for exactly that reason. These tests pin the three rules
/// that produce that number.
@Suite("The Patchwerk question feed")
struct FeedTests {

    static func source() -> StubQuestionSource {
        let catalogue = StubQuestionSource.sampleCatalogue()
        // Two visibly different stem SHAPES per topic, so the ring has something
        // to reject, plus one clone of the first so a repeat is available.
        func q(_ topic: String, _ n: Int, _ shape: Int) -> Question {
            StubQuestionSource.question(
                id: "\(topic)-\(n)", topic: topic, pool: 1 + (n % 3),
                stem: shape == 0
                    ? "What is \(n * 3) x \(n + 2)?"
                    : "A ribbon \(n) m long is cut into \(n + 1) equal pieces. How long is each piece?",
                choices: ["\(n)", "\(n + 1)", "\(n + 2)", "\(n + 3)"], correctIndex: 0)
        }
        return StubQuestionSource(catalogue: catalogue, questions: [
            "p4peri": [q("p4peri", 1, 0), q("p4peri", 2, 0), q("p4peri", 3, 1)],
            "p4deci": [q("p4deci", 4, 0), q("p4deci", 5, 1), q("p4deci", 6, 0)],
            "p4frac": [q("p4frac", 7, 1), q("p4frac", 8, 0), q("p4frac", 9, 1)]
        ])
    }

    @Test("Only live topics for the child's own class level are drawn from")
    func topicsFilter() {
        let catalogue = StubQuestionSource.sampleCatalogue(level: "P4")
        let topics = PatchwerkFeed.topics(in: catalogue, level: "P4")
        #expect(topics == ["p4peri", "p4deci", "p4frac"])
        #expect(topics.contains("p4algebra") == false, "a 'coming soon' node was offered")
        #expect(PatchwerkFeed.topics(in: catalogue, level: "P6").isEmpty)
    }

    @Test("The pool weights climb with the stacks, exactly as the web's table says")
    func poolWeights() {
        #expect(PatchwerkFeed.poolWeights(stacks: 0) == [0.55, 0.35, 0.10])
        #expect(PatchwerkFeed.poolWeights(stacks: 3) == [0.55, 0.35, 0.10])
        #expect(PatchwerkFeed.poolWeights(stacks: 4) == [0.25, 0.45, 0.30])
        #expect(PatchwerkFeed.poolWeights(stacks: 6) == [0.25, 0.45, 0.30])
        #expect(PatchwerkFeed.poolWeights(stacks: 7) == [0.10, 0.30, 0.60])
        #expect(PatchwerkFeed.poolWeights(stacks: 10) == [0.10, 0.30, 0.60])
        // Every row is a distribution.
        for s in [0, 4, 7] {
            #expect(abs(PatchwerkFeed.poolWeights(stacks: s).reduce(0, +) - 1) < 1e-12)
        }
    }

    @Test("A child on a big streak is fed harder questions")
    func harderWithStacks() async {
        let feed = PatchwerkFeed(source: Self.source(),
                                 topics: ["p4peri", "p4deci", "p4frac"],
                                 rng: PatchwerkRNG(seed: 20260907))
        var lowPools: [Int] = []
        var highPools: [Int] = []
        for _ in 0..<400 { lowPools.append(await feed.pickPool(stacks: 0)) }
        for _ in 0..<400 { highPools.append(await feed.pickPool(stacks: 8)) }
        let lowMean = Double(lowPools.reduce(0, +)) / 400
        let highMean = Double(highPools.reduce(0, +)) / 400
        #expect(lowMean < 1.8, "pool at zero stacks averaged \(lowMean)")
        #expect(highMean > 2.2, "pool at eight stacks averaged \(highMean)")
        #expect(highMean > lowMean + 0.6)
    }

    /// One topic whose questions cycle four visibly different templates. With a
    /// single topic the topic rotation is out of the picture, so what is left is
    /// the ring - which is the thing under test.
    static func fourShapeSource() -> StubQuestionSource {
        let stems = [
            "What is 36 x 100?",
            "A ribbon 2 m long is cut into 8 equal pieces. How long is each piece?",
            "Round 4568 to the nearest hundred.",
            "Which fraction of the bar is shaded?"
        ]
        let questions = stems.enumerated().map { i, stem in
            StubQuestionSource.question(id: "q\(i)", topic: "p4peri", pool: 1, stem: stem,
                                        choices: ["1", "2", "3", "4"], correctIndex: 0)
        }
        return StubQuestionSource(catalogue: StubQuestionSource.sampleCatalogue(),
                                  questions: ["p4peri": questions])
    }

    @Test("The no-repeat ring keeps a shape off the screen for three items")
    func ringStopsClones() async throws {
        let feed = PatchwerkFeed(source: Self.fourShapeSource(), topics: ["p4peri"],
                                 rng: PatchwerkRNG(seed: 4))
        var shapes: [String] = []
        for _ in 0..<12 {
            let q = try await feed.next(stacks: 0)
            shapes.append(PatchwerkShapeKey.key(stem: q.stem, extra: q.extra))
        }
        for i in shapes.indices {
            let window = shapes[max(0, i - PatchwerkFeed.ringLength)..<i]
            #expect(window.contains(shapes[i]) == false,
                    "item \(i) repeated a shape already seen in the last 3")
        }
        let ring = await feed.recentShapes
        #expect(ring.count == PatchwerkFeed.ringLength)
    }

    @Test("The redraw loop is bounded - a thin topic cannot hang the fight")
    func boundedRedraws() async throws {
        // Every question is the same shape, so every redraw is rejected. The feed
        // must still hand something back rather than loop.
        let clone = StubQuestionSource.question(id: "c", topic: "p4peri", pool: 1,
                                                stem: "What is 2 x 3?",
                                                choices: ["6", "5", "4", "3"], correctIndex: 0)
        let source = StubQuestionSource(catalogue: StubQuestionSource.sampleCatalogue(),
                                        questions: ["p4peri": [clone]])
        let feed = PatchwerkFeed(source: source, topics: ["p4peri"], rng: PatchwerkRNG(seed: 2))
        for _ in 0..<3 { _ = try await feed.next(stacks: 0) }
        let requests = await source.requests
        #expect(requests.count <= 3 * PatchwerkFeed.maxRedraws)
        #expect(requests.count > 3, "the ring never rejected an identical clone")
    }

    @Test("An empty topic list is an error at the picker, never a blank screen")
    func noTopics() async {
        let feed = PatchwerkFeed(source: Self.source(), topics: [],
                                 rng: PatchwerkRNG(seed: 1))
        await #expect(throws: PatchwerkFeed.FeedError.noTopics) {
            _ = try await feed.next(stacks: 0)
        }
    }

    @Test("Patchwerk asks the engine for POOL draws, never for a feed session")
    func drawsFromThePool() async throws {
        let source = Self.source()
        let feed = PatchwerkFeed(source: source, topics: ["p4peri", "p4deci", "p4frac"],
                                 rng: PatchwerkRNG(seed: 7))
        for _ in 0..<10 { _ = try await feed.next(stacks: 3) }
        let requests = await source.requests
        #expect(requests.isEmpty == false)
        for r in requests {
            switch r {
            case .pool: break
            default: Issue.record("Patchwerk asked for \(r); the mode rotates topics itself")
            }
        }
    }
}

/// The seeded PRNG. Mirrored from the web so a feed test can name a sequence.
@Suite("The mirrored PRNG")
struct RNGTests {

    @Test("mulberry32 produces the web's own numbers")
    func matchesNode() {
        // Recorded from node with the same seed the corpus generator uses:
        //   mulberry32(20260907) -> these five draws.
        var rng = PatchwerkRNG(seed: 20260907)
        let want = [0.39220033842138946, 0.76711481739766896,
                    0.62877712701447308, 0.11036127503030002,
                    0.18690357194282115]
        for expected in want {
            let got = rng.next()
            #expect(abs(got - expected) < 1e-15, "got \(got) want \(expected)")
        }
    }

    @Test("The same seed gives the same run; a different seed does not")
    func deterministic() {
        var a = PatchwerkRNG(seed: 99)
        var b = PatchwerkRNG(seed: 99)
        var c = PatchwerkRNG(seed: 100)
        let one = (0..<20).map { _ in a.next() }
        let two = (0..<20).map { _ in b.next() }
        let three = (0..<20).map { _ in c.next() }
        #expect(one == two)
        #expect(one != three)
    }

    @Test("Draws stay inside 0 ..< 1 over a long run")
    func bounded() {
        var rng = PatchwerkRNG(seed: -12345)
        for _ in 0..<50_000 {
            let v = rng.next()
            #expect(v >= 0 && v < 1)
        }
    }

    @Test("Picking from an empty list is nil, not a crash on a child's screen")
    func pickEmpty() {
        var rng = PatchwerkRNG(seed: 3)
        let none: [String] = []
        #expect(rng.pick(none) == nil)
        #expect(rng.pick(["only"]) == "only")
    }
}

/// The stem-shape key. Mirrored from `js/core.js`'s `shapeKey`; see the type's
/// own note on what is and is not proved about it.
@Suite("Stem shapes")
struct ShapeKeyTests {

    @Test("Two questions from one template with different numbers are one shape")
    func numbersAreMasked() {
        let a = PatchwerkShapeKey.key(stem: "What is 3.6 x 100?", extra: "")
        let b = PatchwerkShapeKey.key(stem: "What is 7.2 x 10?", extra: "")
        #expect(a == b)
    }

    @Test("Two genuinely different questions are two shapes")
    func differentTemplates() {
        let a = PatchwerkShapeKey.key(stem: "What is 3.6 x 100?", extra: "")
        let b = PatchwerkShapeKey.key(
            stem: "A ribbon 2.4 m long is cut into 8 equal pieces. How long is each piece?",
            extra: "")
        #expect(a != b)
    }

    @Test("A child's name is masked, but an ordinary capitalised word is not")
    func namesAreMasked() {
        let a = PatchwerkShapeKey.key(stem: "Siti has 12 marbles. How many are left?", extra: "")
        let b = PatchwerkShapeKey.key(stem: "Raju has 30 marbles. How many are left?", extra: "")
        #expect(a == b)
        #expect(a.contains("[NAME]"))
        // "What" and "How" are sentence words and must survive, or every question
        // collapses into one shape and the ring rejects everything.
        #expect(PatchwerkShapeKey.key(stem: "What is 4?", extra: "").contains("What"))
    }

    @Test("Money and markup are masked before numbers are")
    func moneyAndMarkup() {
        let key = PatchwerkShapeKey.key(stem: "Ali spent $4.75 on <b>3</b> pens.", extra: "")
        #expect(key.contains("[MONEY]"))
        #expect(key.contains("[T]"))
        #expect(key.contains("<b>") == false)
    }

    @Test("The extra (a diagram) is part of the shape")
    func extraCounts() {
        let a = PatchwerkShapeKey.key(stem: "Which fraction is shaded?", extra: "<svg>bar</svg>")
        let b = PatchwerkShapeKey.key(stem: "Which fraction is shaded?", extra: "")
        #expect(a != b)
    }
}
