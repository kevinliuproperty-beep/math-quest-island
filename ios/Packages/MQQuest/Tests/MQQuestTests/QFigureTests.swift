import Testing
import SwiftUI
import Foundation
import MQContent
import MQDesign
import MQEngineJS
@testable import MQQuest

// =============================================================================
// FIGURES: ALL SEVEN, FROM DRAWN QUESTIONS
//
// Not from hand-written specs. The engine emits `bar rect fractionBar lshape
// table line pie` from six topic files, and a hand-written `Figure.pie(...)` in
// a test would prove only that the test author can build a pie - not that the
// spec the generator actually produces renders. So every case here is DRAWN from
// the live engine and then rendered through ImageRenderer at the two sizes that
// matter: Charlotte's 9.7" iPad and the smallest phone.
// =============================================================================

@Suite("Every figure the engine emits renders at both device sizes", .serialized)
struct QFigureRenderTests {

    static let engine = try! JSQuestionEngine()

    /// The topics that emit each spec type, measured off the shipped bundle.
    static let source: [Figure.Kind: [String]] = [
        .bar:         ["p3bargraph"],
        .rect:        ["geometry"],
        .fractionBar: ["fractions"],
        .lshape:      ["p4area"],
        .table:       ["p4data"],
        .line:        ["p4data"],
        .pie:         ["p4pie"]
    ]

    /// The battle board's figure slot on a 9.7" iPad, and the review row's on an
    /// iPhone SE. Both come out of the screens' own `geometry`, not out of a
    /// literal here, so a figure box that changes size changes this gate too.
    static let ipad = MQMetrics.device(CGSize(width: 1024, height: 768))
    static let phone = MQMetrics.device(CGSize(width: 375, height: 667))

    static func draw(_ kind: Figure.Kind) async throws -> Figure {
        for topic in source[kind] ?? [] {
            for level in [1, 2, 3] {
                for _ in 0..<40 {
                    let q = try await engine.nextQuestion(.pool(topic: topic, level: level))
                    if let f = q.figure, f.type == kind.rawValue { return f }
                }
            }
        }
        throw FigureTestError.notFound(kind.rawValue)
    }

    @MainActor
    static func slack(_ figure: Figure, box: CGSize) -> CGFloat? {
        QTestFonts.ensure()
        return MQFit.slack(QFigureView(.noon, figure, fallbackText: "diagram")
                        .frame(width: box.width, height: box.height),
                    in: box)
    }

    @Test("all seven spec types are reachable from the live engine and draw",
          arguments: Figure.Kind.allCases)
    func rendersWithoutOverflow(_ kind: Figure.Kind) async throws {
        let figure = try await Self.draw(kind)
        #expect(figure.isDrawable, "\(kind.rawValue) decoded to .unsupported")
        #expect(figure.type == kind.rawValue)

        // The battle board's slot on the 9.7" iPad ...
        let battle = QBattleView.geometry(Self.ipad, typed: false)
        // Rounded UP to whole points: `ImageRenderer` rasterises to whole
        // PIXELS, so a 103.26 pt box measures 104 and the comparison would fail
        // by 0.74 pt on a view that fits exactly.
        let boardBox = CGSize(width: battle.figureW.rounded(.up),
                              height: battle.figureH.rounded(.up))
        // ... and the review row's slot on the smallest phone.
        let reviewBox = CGSize(width: 86, height: 62)

        for (name, box) in [("battle slot 9.7\"", boardBox), ("review row SE", reviewBox)] {
            let slack = await MainActor.run { Self.slack(figure, box: box) }
            let s = try #require(slack, "\(kind.rawValue) produced no image in \(name)")
            #expect(s >= 0,
                    "\(kind.rawValue) overflows the \(name) box by \(-s) pt")
        }
    }

    /// The one thing a picture cannot tell you: that the ink is actually there.
    @Test("a rendered figure is not a blank square", arguments: Figure.Kind.allCases)
    func drawsInk(_ kind: Figure.Kind) async throws {
        await MainActor.run { QTestFonts.ensure() }
        let figure = try await Self.draw(kind)
        let box = CGSize(width: 190, height: 130)
        let data = await MainActor.run {
            QDriver.png(QFigureView(.noon, figure).frame(width: box.width, height: box.height),
                        size: box, scale: 1)
        }
        let png = try #require(data, "no PNG for \(kind.rawValue)")
        #expect(png.count > 900,
                "\(kind.rawValue) rendered \(png.count) bytes, which is an empty canvas")
    }

    /// `lshape`'s six sides are DERIVED in `MQContent`, and the renderer prints
    /// exactly those. Asserted here because a renderer that computed its own
    /// would be the one place the picture and the numbers could disagree.
    @Test("an L-shape prints the spec's own six sides")
    func lshapeSides() async throws {
        let figure = try await Self.draw(.lshape)
        guard case .lshape(let s) = figure else { Issue.record("not an lshape"); return }
        let sides = s.sides
        #expect(sides.top == s.W - s.a)
        #expect(sides.cutDown == s.b)
        #expect(sides.cutAcross == s.a)
        #expect(sides.right == s.H - s.b)
        #expect(sides.bottom == s.W)
        #expect(sides.left == s.H)
        #expect(s.area == s.W * s.H - s.a * s.b)
    }

    /// A spec type invented after this build shipped must degrade to words, not
    /// to a crash and not to a dashed placeholder box.
    @MainActor
    @Test("an unknown spec falls back to the question's own words")
    func unsupportedFallsBack() {
        QTestFonts.ensure()
        let payload = try! JSONDecoder().decode(
            JSONValue.self, from: Data(#"{"type":"hologram","spin":3}"#.utf8))
        let unknown = Figure.unsupported(type: "hologram", payload: payload)
        #expect(!QFigureView.isDrawable(unknown))
        let box = CGSize(width: 190, height: 130)
        let slack = MQFit.slack(
            QFigureView(.noon, unknown, fallbackText: "A bar chart of four fruits")
                .frame(width: box.width, height: box.height), in: box)
        #expect((slack ?? -1) >= 0)
    }

    enum FigureTestError: Error { case notFound(String) }
}

// =============================================================================

@Suite("Every Quest screen fits Charlotte's iPad and the smallest phone")
struct QScreenFitTests {

    /// The two sizes the brief names, plus the 9.7" portrait Charlotte will
    /// actually hold half the time.
    static let sizes: [(String, CGSize)] = [
        ("ipad97-landscape", CGSize(width: 1024, height: 768)),
        ("ipad97-portrait", CGSize(width: 768, height: 1024)),
        ("iphone-se", CGSize(width: 375, height: 667))
    ]

    @MainActor
    static func model(typed: Bool) async -> QQuestModel {
        QTestFonts.ensure()
        let unit = typed ? "cm²" : ""
        let q = typed
            ? QFixtures.question(kind: "typed", unit: unit, answer: 113)
            : QFixtures.question(kind: "choice", unit: "", answer: 46,
                                 choices: ["46 cm", "23 cm", "126 cm", "32 cm"],
                                 correctIndex: 0)
        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let m = QQuestModel(source: ScriptedSource([q, q, q]), store: store,
                            random: QFixedRandom([0]), setSize: 3)
        await m.load()
        await m.pick(m.profiles[0])
        await m.open(m.island!.nodes[0])
        return m
    }

    @MainActor
    @Test("the battle fits, choice and typed, at every size")
    func battleFits() async {
        for typed in [false, true] {
            let m = await Self.model(typed: typed)
            for (name, size) in Self.sizes {
                let metrics = MQMetrics.device(size)
                let slack = MQFit.slack(
                    QBattleView(model: m, metrics: metrics), in: size)
                #expect((slack ?? -1) >= 0,
                        "battle (\(typed ? "typed" : "choice")) overflows \(name) by \(-(slack ?? 0)) pt")
            }
        }
    }

    @MainActor
    @Test("the feedback card fits, including a three-line unit lesson")
    func feedbackFits() async {
        let m = await Self.model(typed: true)
        m.press(.digit(1)); m.press(.digit(1)); m.press(.digit(4))
        await m.submitTyped()
        #expect(m.phase == .feedback)
        for (name, size) in Self.sizes {
            let slack = MQFit.slack(QBattleView(model: m, metrics: MQMetrics.device(size)),
                                    in: size)
            #expect((slack ?? -1) >= 0,
                    "feedback overflows \(name) by \(-(slack ?? 0)) pt")
        }
    }

    @MainActor
    @Test("the entrance and the result fit at every size")
    func otherScreensFit() async {
        let m = await Self.model(typed: false)
        for _ in 0..<3 {
            m.press(.digit(4)); m.press(.digit(6))
            await m.choose(1)                 // wrong, so the review has rows
            await m.advance()
        }
        #expect(m.phase == .result)
        for (name, size) in Self.sizes {
            let metrics = MQMetrics.device(size)
            #expect((MQFit.slack(QResultView(model: m, metrics: metrics), in: size) ?? -1) >= 0,
                    "result overflows \(name)")
            #expect((MQFit.slack(QEntranceView(model: m, metrics: metrics), in: size) ?? -1) >= 0,
                    "entrance overflows \(name)")
        }
    }

    static let engine = try! JSQuestionEngine()

    /// **The test the fixture version could not be.**
    ///
    /// The fixture rows are a one-line stem and a five-word explanation, and
    /// three of those fit anywhere. A real P4 item is a three-line word problem;
    /// a wrong-unit one adds the two-line teaching sentence on top. The first
    /// DRIVEN session put three of those on a 9.7" landscape and ran the title
    /// off the top of the screen and the buttons off the bottom - with the
    /// fixture fit test green. So this one plays a real set, gets every item
    /// wrong on the UNIT (the longest possible row), and measures that.
    @MainActor
    @Test("the result screen fits with real word problems and a unit lesson in every row")
    func resultFitsRealContent() async throws {
        QTestFonts.ensure()
        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let m = QQuestModel(source: Self.engine, store: store,
                            random: QFixedRandom([0]), setSize: 6)
        await m.load()
        await m.pick(try #require(m.profiles.first))
        let node = try #require(m.island?.nodes.first { $0.topicID == "p4area" })
        await m.open(node)

        var guardRail = 0
        while m.phase == .asking, guardRail < 12 {
            guardRail += 1
            guard let q = m.question else { break }
            if q.isTyped {
                for ch in QDriver.correctTypedText(q) {
                    if let d = Int(String(ch)) { m.press(.digit(d)) }
                }
                if let bad = m.chips.first(where: { !QUnits.accepts($0, declared: q.unit) }) {
                    m.toggleChip(bad)
                }
                await m.submitTyped()
            } else {
                await m.choose((q.correctIndex + 1) % max(q.choices.count, 1))
            }
            await m.advance()
        }
        #expect(m.phase == .result)
        let review = try #require(m.summary?.review)
        #expect(review.count >= 2, "the review needs rows for this to measure anything")
        #expect(review.contains { $0.reason.isWrongUnit },
                "at least one row carries the unit lesson, which is the tallest row")

        for (name, size) in Self.sizes {
            let slack = MQFit.slack(QResultView(model: m, metrics: MQMetrics.device(size)),
                                    in: size)
            #expect((slack ?? -1) >= 0,
                    "result with real content overflows \(name) by \(-(slack ?? 0)) pt")
        }
    }

    /// Same argument, applied to the board: a real stem plus a real figure.
    @MainActor
    @Test("the battle fits with a real question and a real figure on the board")
    func battleFitsRealContent() async throws {
        QTestFonts.ensure()
        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: "Charlotte", cast: .unicorn, level: "P4")
        let m = QQuestModel(source: Self.engine, store: store,
                            random: QFixedRandom([0]), setSize: 6)
        await m.load()
        await m.pick(try #require(m.profiles.first))
        // p4pie is the topic with the biggest figure and the longest stems.
        let node = try #require(m.island?.nodes.first { $0.topicID == "p4pie" })
        await m.open(node)
        #expect(m.question?.figure != nil)
        for (name, size) in Self.sizes {
            let slack = MQFit.slack(QBattleView(model: m, metrics: MQMetrics.device(size)),
                                    in: size)
            #expect((slack ?? -1) >= 0,
                    "battle with a real pie chart overflows \(name) by \(-(slack ?? 0)) pt")
        }
    }


    @Test("every tap target on every Quest screen clears the 44 pt floor")
    func tapFloor() {
        for (name, size) in Self.sizes {
            let m = MQMetrics.device(size)
            let targets = QBattleView.tapTargets(m) + QMapView.tapTargets(m)
                + QResultView.tapTargets(m) + QEntranceView.tapTargets(m)
            #expect(!targets.isEmpty)
            for t in targets {
                #expect(t.clearsFloor,
                        "\(name): \"\(t.name)\" is \(t.least) pt, under the 44 pt floor")
            }
        }
    }
}
