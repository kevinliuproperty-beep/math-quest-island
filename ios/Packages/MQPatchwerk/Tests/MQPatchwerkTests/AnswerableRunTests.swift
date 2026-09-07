#if os(macOS)
import Testing
import Foundation
import SwiftUI
import AppKit
import MQContent
import MQDesign
import MQProgress
import MQServices
@testable import MQPatchwerk

/// **The gate the Phase 1 dress rehearsal's Patchwerk blocker would have failed.**
///
/// One driven 120,000 ms run on a `PatchwerkManualClock` with a seeded RNG, over a
/// feed mixed in the proportions the rehearsal MEASURED on a real 150-item run:
///
/// | measured, run 1 of the rehearsal | count |
/// |---|---|
/// | items served | 150 |
/// | typed items | **50** (one in three) |
/// | items reaching the screen with zero answer choices | **50** |
/// | items carrying a figure | **35** (13 pie, 10 table, 6 line, 4 rect, 2 lshape) |
/// | figures actually drawn | **0** |
/// | best stacks reached, cap 10 | **4** |
///
/// Everything asserted here is read off the DRAWN PIXELS, not off the model's
/// intent, because the model's intent was never the thing that was wrong:
/// `PatchwerkSession` knew perfectly well that the question was typed and that it
/// carried a figure. It was the arena that had nowhere to put either.
///
/// **The engine here is `StubQuestionSource`, not `MQEngineJS`.** `MQPatchwerkTests`
/// does not depend on `MQEngineJS` (ios/Package.swift, and that manifest is not this
/// lane's to change), and a feed test has to CHOOSE what comes back anyway - the
/// question mix is the fixture. What the stub cannot prove is that the JS grader
/// accepts `"60 cm²"`; that is proved for the same submission builder, on the same
/// `MQTypedEntry.submission`, by `MQQuestTests`' unit-chip suite against the live
/// engine, and by the 300-run parity corpus for the damage arithmetic.
@MainActor
@Suite("A driven two-minute run: every item answerable, every figure drawn")
struct AnswerableRunTests {

    init() { _ = NSApplication.shared; MQFonts.register() }

    // MARK: The device and the feed

    /// Charlotte's iPad 6, landscape. The device this app exists for.
    static let deviceSize = CGSize(width: 1024, height: 768)
    static var metrics: MQMetrics {
        MQMetrics.device(deviceSize, insets: MQInsets(top: 20, bottom: 0))
    }

    static let topics = ["p4area", "p4ops", "p4pie"]

    /// Nine items per topic: **every third one typed**, and a figure on four of
    /// the nine - a rect, a pie, a table and an L-shape, four of the five kinds
    /// the rehearsal counted in the wild. The engine's own JSON, because
    /// `MQContent`'s payloads have no public memberwise initialiser and a spec
    /// spelled any other way could drift from the contract.
    ///
    /// The realised mix over a driven run is measured and printed rather than
    /// asserted exactly (the feed picks the topic, so the cursor into each topic
    /// wanders): 150 items, 57 typed (38%) and 61 figure-bearing (41%), against
    /// the rehearsal's measured 50 typed (33%) and 35 figures (23%). Denser than
    /// the wild in both directions, which is the right way round for a gate.
    static func questions() -> [String: [Question]] {
        let figures: [Int: String] = [
            0: #"{"type":"rect","length":12,"breadth":5,"unit":"cm"}"#,
            2: #"{"type":"pie","title":"Clubs","cats":["Art","Choir","Chess"],"weights":[3,2,1],"labels":["30","20","10"],"caption":"Number of pupils."}"#,
            5: #"{"type":"table","title":"Cups sold","cats":["Mon","Tue","Wed"],"values":[4,7,5],"hidden":-1,"unitLabel":"cup"}"#,
            6: #"{"type":"lshape","W":9,"H":10,"a":5,"b":6,"unit":"cm"}"#
        ]
        var out: [String: [Question]] = [:]
        for topic in topics {
            out[topic] = (0..<9).map { n in
                let fig = figures[n]
                if n % 3 == 0 {
                    return StubQuestionSource.typedQuestion(
                        id: "\(topic)-t\(n)", topic: topic, pool: (n % 3) + 1,
                        stem: "A rectangle is \(n + 4) cm by 5 cm. What is its area?",
                        answer: "\((n + 4) * 5)", unit: "cm²",
                        skill: "skill-\(topic)", extra: "a rectangle",
                        figureJSON: fig)
                }
                return StubQuestionSource.question(
                    id: "\(topic)-c\(n)", topic: topic, pool: (n % 3) + 1,
                    stem: "What is \(n) x 10?",
                    choices: ["\(n * 10)", "\(n)", "\(n + 1)", "\(n + 2)"],
                    correctIndex: 0, skill: "skill-\(topic)", extra: "a picture",
                    figureJSON: fig)
            }
        }
        return out
    }

    static func session() -> (PatchwerkSession, PatchwerkManualClock, URL) {
        let clock = PatchwerkManualClock(0)
        let dir = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("mqi-answerable-\(UUID().uuidString)")
        let s = PatchwerkSession(
            source: StubQuestionSource(
                catalogue: StubQuestionSource.sampleCatalogue(level: "P4", topics: topics),
                questions: questions()),
            leaderboard: LocalLeaderboard(url: dir.appendingPathComponent("board.json")),
            progress: MQProgressStore.inMemory(),
            player: .init(profile: ProfileID("charlotte"), name: "Charlotte",
                          cast: .unicorn, level: "P4"),
            clock: clock, config: .mirrored, rngSeed: 20260907,
            today: { "2026-09-07" })
        s.choose(tier: "short")
        return (s, clock, dir)
    }

    // MARK: Reading the glass

    static func arena(_ scene: MQPatchwerkScene) -> some View {
        PatchwerkRunView(scene: scene, metrics: metrics, locked: false,
                         onAnswer: { _ in }, onPause: {})
    }

    /// Cream glyph pixels in the bottom third of the frame - the band that holds
    /// the four answer planks on a choice item and the keypad on a typed one.
    ///
    /// Cream (`MQPalette.carved`, `#FFF4DF`) is what `MQAnswerTile` sets its label
    /// in, and the keypad's keys ARE answer tiles. The tolerance is 6 per channel
    /// on purpose: the sign's parchment is `#FBEFD5`, ten steps away in blue, so a
    /// looser probe would count the QUESTION as an answer surface and the negative
    /// control below would pass on a screen with nothing to press.
    static func answerInk(_ scene: MQPatchwerkScene) -> Int {
        guard let px = HUDPixelTests.render(arena(scene), size: deviceSize) else { return 0 }
        // The screen's own cream, because the enrage palette has a different one:
        // `MQPalette.noon.carved` is `#FFF4DF` and `MQPalette.enrage.carved`
        // (inherited from dusk) is `#FFEFD2`. Hard-coding noon's read every item
        // in the last twenty seconds of the run as unanswerable - 25 of 150,
        // which is exactly the frame the rehearsal photographed, so the probe was
        // right to shout and the probe was the thing that was wrong.
        let target = scene.enraged ? (255, 239, 210) : (255, 244, 223)
        var n = 0
        for y in Int(Double(px.h) * 0.66)..<px.h {
            for x in 0..<px.w where px.matches(x, y, target, 6) { n += 1 }
        }
        return n
    }

    /// A spec this build cannot draw. `MQFigures` renders its `fallbackText` for
    /// one, so with an empty fallback it occupies the SAME slot and draws nothing
    /// in it - which is what makes the probe below a figure-rect probe rather
    /// than a "something moved" probe.
    static let undrawable: Figure? = try? JSONDecoder()
        .decode(Figure.self, from: Data(#"{"type":"not-a-figure"}"#.utf8))

    /// The bounding box of everything that changes when the spec is swapped for
    /// an undrawable one - which is the figure's own ink, measured rather than
    /// derived from padding constants. The layout is untouched by the swap, so a
    /// non-empty box here is the diagram and nothing else.
    static func figureBox(_ scene: MQPatchwerkScene) -> HUDPixelTests.Box {
        var blank = scene
        blank.spec = undrawable
        blank.figureFallback = ""
        guard let a = HUDPixelTests.render(arena(scene), size: deviceSize),
              let b = HUDPixelTests.render(arena(blank), size: deviceSize)
        else { return HUDPixelTests.Box() }
        var box = HUDPixelTests.Box()
        for y in 0..<min(a.h, b.h) {
            for x in 0..<min(a.w, b.w) {
                let p = a.at(x, y), q = b.at(x, y)
                if abs(p.0 - q.0) > 8 || abs(p.1 - q.1) > 8 || abs(p.2 - q.2) > 8 {
                    box.add(x, y)
                }
            }
        }
        return box
    }

    // MARK: - The run

    @Test("Every item in a 2-minute run is answerable, every figure is drawn, and the stacks climb")
    func drivenRun() async throws {
        let (s, clock, dir) = Self.session()
        defer { try? FileManager.default.removeItem(at: dir) }

        await s.start()
        try #require(s.failure == nil, "\(s.failure ?? "")")
        try #require(s.phase == .running)

        var served = 0, typed = 0, answerable = 0
        var carriedFigure = 0, figuresDrawn = 0
        var minInk = Int.max
        var figureBoxes: [String] = []
        var t = 0

        // 800 ms an item, which lands the run at about the 150 items the
        // rehearsal's own two-minute run served.
        while s.phase == .running, served < 400 {
            guard let q = s.question else { break }
            served += 1
            let scene = s.scene

            // 1 - ANSWERABLE. Read off the drawn surface, not off the model: the
            //     model always knew the item was typed. Four blank planks is what
            //     a child met 50 times in the measured run.
            let ink = Self.answerInk(scene)
            minInk = min(minInk, ink)
            if ink >= 200 { answerable += 1 }
            #expect(ink >= 200, """
                item \(served) (\(q.id), \(q.kind)) drew \(ink) cream glyph pixels in the \
                answer band - there is nothing on the glass to answer it with
                """)

            // 2 - THE FIGURE. Measured as the pixels that change when the spec is
            //     taken away, so the probe cannot pass by looking at a rect that
            //     is not there.
            if let spec = q.figure {
                carriedFigure += 1
                let box = Self.figureBox(scene)
                // Inside the slot the screen declares (190 x 126 at iPad size),
                // with a couple of points of renderer slack. A box larger than
                // the slot would mean the probe caught a reflow rather than the
                // diagram.
                let drawn = !box.empty && box.w >= 40 && box.h >= 20
                    && box.w <= 200 && box.h <= 136
                if drawn { figuresDrawn += 1 }
                figureBoxes.append("\(box.w)x\(box.h)")
                #expect(drawn, """
                    item \(served) (\(q.id)) carries a \(spec.type) figure and the arena \
                    drew nothing for it: changed box \(box)
                    """)
            }

            if s.question?.isTyped == true {
                typed += 1
                Self.typeTheAnswer(q, into: s)
                await s.submitTyped()
            } else {
                await s.answer(choice: q.correctIndex)
            }

            t += 800
            clock.set(t)
            await s.tick()
        }

        // 3 - THE STACKS. The rehearsal reached 4 of a cap of 10 because every
        //     third item was unanswerable and broke the chain. A run answered
        //     correctly throughout must reach the cap.
        clock.set(s.tier.durationMs)
        await s.tick()
        let record = try #require(s.record)

        print("""
        driven-run (1024x768, seed 20260907, 800 ms/item)
          items served ........ \(served)
          typed items ......... \(typed)  (\(served == 0 ? 0 : typed * 100 / served)%)
          answerable .......... \(answerable)/\(served)   min cream ink in band = \(minInk) px
          carried a figure .... \(carriedFigure)
          figures drawn ....... \(figuresDrawn)/\(carriedFigure)  ink boxes \(Set(figureBoxes).sorted().joined(separator: ", "))
          best stacks ......... \(record.maxStacks) of a cap of \(s.config.stackCap)
          hits/misses ......... \(record.correct)/\(record.wrong)
          damage .............. \(record.damage)
        """)

        #expect(served >= 100, "only \(served) items in a two-minute run")
        #expect(typed >= served / 4, "the fixture served \(typed) typed items of \(served)")
        #expect(answerable == served, "\(served - answerable) items had nothing to answer with")
        #expect(carriedFigure > 0, "the fixture served no figures, so nothing was proved")
        #expect(figuresDrawn == carriedFigure,
                "\(carriedFigure - figuresDrawn) figure-bearing items drew no figure")
        #expect(record.wrong == 0, "an always-correct run recorded \(record.wrong) misses")
        #expect(record.maxStacks > 4,
                "best stacks \(record.maxStacks): the rehearsal reached 4 and that WAS the blocker")
        #expect(record.maxStacks == s.config.stackCap,
                "an always-correct run should reach the cap, not \(record.maxStacks)")
    }

    /// Type the engine's own answer on the keypad, then turn over the unit chip.
    /// Every keystroke goes through `PatchwerkSession.press`, which is the very
    /// closure the keypad's buttons hold.
    static func typeTheAnswer(_ q: Question, into s: PatchwerkSession) {
        let unit = q.acceptedUnits.first
        var digits = q.answerTextPlain
        if let unit, digits.hasSuffix(" \(unit)") {
            digits = String(digits.dropLast(unit.count + 1))
        }
        for ch in digits {
            if let d = ch.wholeNumberValue, ch.isNumber { s.press(.digit(d)) }
            else if ch == "." { s.press(.decimalPoint) }
            else if ch == "/" { s.press(.slash) }
        }
        if let unit, s.chips.contains(unit) { s.toggleChip(unit) }
    }

    // MARK: - The typed arena has to FIT
    //
    // The keypad is ~200 pt of new furniture at the bottom of a screen that
    // already carries a two-row HUD rail, a boss gauge and a signboard. Nothing
    // in this app scrolls, so anything taller than the glass is something a
    // child never sees - and on this screen the thing off the bottom would be
    // `Check`.

    /// The sample, and a stress case: the longest stem the engine emits with a
    /// fraction keypad (an extra key row's worth of glyphs), a flash banner up and
    /// a table figure, which is the tallest of the seven.
    static var typedScenes: [(String, MQPatchwerkScene)] {
        var stress = MQPatchwerkScene.typedItem
        stress.question = "Ali buys 12 packets of stickers. Each packet holds 24 stickers "
            + "and he gives away 3 packets. How many stickers has he left?"
        stress.spec = MQPatchwerkScene.decodeSpec(#"""
            {"type":"table","title":"Packets bought each day this week","cats":["Mon","Tue","Wed","Thu","Fri"],
             "values":[12,9,14,7,11],"hidden":2,"unitLabel":"packet"}
            """#)
        stress.figureFallback = "A table of packets bought each day."
        stress.typed = MQTypedEntry(digits: "216", unit: "stickers")
        stress.keypad = .forTopic("p5fractions")
        stress.chips = MQUnits.chips(accepted: ["stickers"], questionID: "stress")
        stress.flash = "The answer is 216 stickers."
        return [("sample", .typedItem), ("stress", stress)]
    }

    @Test("The typed arena fits the glass at every size in the matrix",
          arguments: HUDPixelTests.matrix)
    func typedArenaFits(_ device: HUDPixelTests.Size) throws {
        let m = device.metrics
        for (name, scene) in Self.typedScenes {
            let slack = try #require(
                MQFit.slack(MQPatchwerkScreen(scene: scene, metrics: m), in: m.size),
                "\(device.name)/\(name): the typed arena produced no image")
            print(String(format: "  typed arena %@/%@: slack %.0f pt", device.name, name, slack))
            #expect(slack >= 0, """
                \(device.name)/\(name): the typed arena wants \(Int(m.size.height - slack)) pt \
                of a \(Int(m.size.height)) pt screen - \(Int(-slack)) pt of it, keypad first, \
                is off the glass
                """)
        }
    }

    /// Nothing a child taps on a typed item is under Apple's floor, measured from
    /// the geometry the screen's own body draws from.
    @Test("Every control on the typed arena clears 44 pt", arguments: HUDPixelTests.matrix)
    func typedTapTargets(_ device: HUDPixelTests.Size) {
        for t in MQPatchwerkScreen.tapTargets(device.metrics, typed: true) {
            #expect(t.clearsFloor,
                    "\(device.name): \"\(t.name)\" is \(Int(t.size.width))x\(Int(t.size.height)) pt")
        }
    }

    // MARK: - The negative controls
    //
    // A probe with no negative control proves nothing. Both of these are the
    // rehearsal's own defect, reproduced.

    @Test("The probe fails on the screen the rehearsal photographed: four blank planks")
    func blankPlanksFailTheProbe() {
        var broken = MQPatchwerkScene.sample
        broken.answers = ["", "", "", ""]     // exactly pw-04-enrage.png
        broken.typed = nil
        let ink = Self.answerInk(broken)
        print("negative control: four blank planks drew \(ink) cream glyph pixels")
        #expect(ink < 200, """
            four blank answer planks measured \(ink) cream pixels - the probe cannot \
            tell an answerable screen from the one in pw-04-enrage.png
            """)
    }

    @Test("The figure probe fails when the figure is suppressed")
    func suppressedFigureFailsTheProbe() {
        var withFigure = MQPatchwerkScene.typedItem
        let box = Self.figureBox(withFigure)
        #expect(!box.empty && box.w >= 40 && box.h >= 20,
                "the typed sample's own figure did not draw: \(box)")

        // The negative control: the same scene with the diagram suppressed and
        // the slot still there. If the probe still reports a figure here it is
        // measuring the layout, not the drawing, and 61 green rows above would
        // mean nothing.
        withFigure.spec = Self.undrawable
        withFigure.figureFallback = ""
        let none = Self.figureBox(withFigure)
        print("figure probe: drawn box \(box), suppressed box \(none)")
        #expect(none.empty,
                "the probe reports a figure where none is drawn: \(none)")
    }
}
#endif
