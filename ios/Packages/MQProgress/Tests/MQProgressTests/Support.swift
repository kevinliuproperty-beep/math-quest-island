import Foundation
import MQContent
@testable import MQProgress

// Shared fixtures and a seeded RNG. Every random test in this suite is SEEDED: a
// fade-out invariant that fails one run in fifty and passes on re-run is not a gate.

/// mulberry32, the same generator `tools/fixtures/gen-pool-climb.mjs` uses, so a
/// sequence can be reproduced on either side of the bridge.
struct SeededRNG: RandomNumberGenerator {
    private var s: UInt32
    init(_ seed: UInt32) { self.s = seed }

    mutating func next() -> UInt64 {
        UInt64(next32()) << 32 | UInt64(next32())
    }
    private mutating func next32() -> UInt32 {
        s = s &+ 0x6D2B79F5
        var t = (s ^ (s >> 15)) &* (1 | s)
        t = (t &+ ((t ^ (t >> 7)) &* (61 | t))) ^ t
        return t ^ (t >> 14)
    }
    /// 0..<n
    mutating func pick(_ n: Int) -> Int { n <= 1 ? 0 : Int(next32() % UInt32(n)) }
    /// true with probability p
    mutating func chance(_ p: Double) -> Bool { Double(next32()) / 4294967296.0 < p }
}

enum Fixtures {

    /// A right answer, as the engine rules on a tapped tile.
    static func right() -> Verdict {
        Verdict(correct: true, kind: .choice, questionId: nil, expectedIndex: 0,
                expectedText: "46 cm", chosenIndex: 0, reason: nil, parsed: nil, typedRaw: nil)
    }

    /// A wrong tap.
    static func wrongOption() -> Verdict {
        Verdict(correct: false, kind: .choice, questionId: nil, expectedIndex: 0,
                expectedText: "46 cm", chosenIndex: 2, reason: "wrong option",
                parsed: nil, typedRaw: nil)
    }

    /// A typed answer the engine rejected. The engine emits ONE reason string for value
    /// and unit alike ("wrong value or unit"), which is why `WrongReason` has to split it.
    static func typedWrong(_ raw: String, unit: String, expected: String,
                           value: Double? = nil, reason: String = "wrong value or unit") -> Verdict {
        Verdict(correct: false, kind: .typed, questionId: nil, expectedIndex: -1,
                expectedText: expected, chosenIndex: -1, reason: reason,
                parsed: Verdict.Parsed(ok: true, value: value, unit: unit, frac: nil, reason: nil),
                typedRaw: raw)
    }

    static func typedEmpty() -> Verdict {
        Verdict(correct: false, kind: .typed, questionId: nil, expectedIndex: -1,
                expectedText: "46 cm", chosenIndex: -1, reason: "empty",
                parsed: Verdict.Parsed(ok: false, value: nil, unit: "", frac: nil, reason: "empty"),
                typedRaw: "  ")
    }

    /// A figure spec built by DECODING the engine's own JSON, the way `MQI_API` hands one
    /// over - `Figure`'s payload memberwise inits are internal to MQContent, and a test
    /// that went round them would be asserting on a shape the engine cannot produce.
    /// (Same argument as `NodeStateTests.topic`.)
    static func figure(_ json: String) -> Figure {
        // force_try on purpose: a malformed literal here is a broken TEST and should stop
        // the suite rather than become a soft `.unsupported` that passes.
        try! JSONDecoder().decode(Figure.self, from: Data(json.utf8))
    }

    static let rectFigure = figure(#"{"type":"rect","length":14,"breadth":9,"unit":"cm"}"#)

    static func review(_ n: Int, figure: Figure? = Fixtures.rectFigure) -> ReviewSnapshot {
        ReviewSnapshot(question: "Question \(n)?",
                       figure: figure,
                       answer: "\(n) cm",
                       explanation: "Because \(n).")
    }

    /// One of EVERY kind the engine emits, plus one it does not. A review row has to
    /// survive all eight on the way to disk and back: the three-case `MQFigure` that
    /// `StoredReview` used to persist flattened 180 of 216 real figure-bearing rows to
    /// `.none` (Progress Refutation W7, 2026-09-07).
    static let everyFigureKind: [Figure] = [
        figure(#"{"type":"bar","title":"Fruit sold","cats":["Apples","Pears","Plums"],"units":[3,5,2],"scale":10,"maxUnit":6,"unitLabel":"kg"}"#),
        rectFigure,
        figure(#"{"type":"fractionBar","parts":5,"filled":3}"#),
        figure(#"{"type":"lshape","W":12,"H":8,"a":4,"b":3,"unit":"cm"}"#),
        figure(#"{"type":"table","title":"Books read","cats":["Mon","Tue","Wed"],"values":[4,7,2],"hidden":1,"unitLabel":"books"}"#),
        figure(#"{"type":"line","title":"Temperature","cats":["9am","noon","3pm"],"units":[2,6,4],"step":5,"maxUnit":8,"unitLabel":"C"}"#),
        figure(#"{"type":"pie","title":"How we travel","cats":["Bus","Walk","Car"],"weights":[3,4,1],"labels":["3/8","1/2","?"],"caption":"32 pupils"}"#),
        // A kind invented after this build shipped. It must survive too, payload intact.
        figure(#"{"type":"hologram","spin":3}"#)
    ]

    /// A typed verdict carrying the post-`feat/unit-sweep` split reason, so the store's
    /// mapping off `Verdict.reasonKind` is exercised by the shape the engine WILL emit
    /// as well as by the one it emits today.
    static func typedSplit(_ raw: String, unit: String, expected: String,
                           value: Double?, reason: Verdict.Reason) -> Verdict {
        Verdict(correct: false, kind: .typed, questionId: nil, expectedIndex: -1,
                expectedText: expected, chosenIndex: -1, reason: reason.rawValue,
                parsed: Verdict.Parsed(ok: true, value: value, unit: unit, frac: nil, reason: nil),
                typedRaw: raw)
    }

    /// A scratch directory that cleans itself up.
    static func tempDir() -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("mqprogress-tests-" + UUID().uuidString, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    /// `tools/fixtures/` in this checkout, found from this source file rather than from
    /// the working directory - `swift test` runs from ios/, Xcode runs from anywhere.
    static var fixturesDirectory: URL {
        var url = URL(fileURLWithPath: #filePath)
        // .../ios/Packages/MQProgress/Tests/MQProgressTests/Support.swift
        for _ in 0..<6 { url = url.deletingLastPathComponent() }
        return url.appendingPathComponent("tools/fixtures", isDirectory: true)
    }
}

extension MQProgressStore {
    /// One attempt, spelled the way a mode would spell it.
    @discardableResult
    func answer(_ session: SessionID, _ profile: ProfileID, _ skill: String,
                correct: Bool, shown: ScaffoldLevel = .full, elapsed: TimeInterval = 1,
                timedOut: Bool = false, item: ReviewSnapshot? = nil,
                verdict: Verdict? = nil, crystals: Int = 0,
                mode: PlayMode? = nil, topic: String? = nil) async -> ProgressDelta {
        await record(Attempt(session: session, profile: profile, skill: SkillID(skill),
                             verdict: verdict ?? (correct ? Fixtures.right() : Fixtures.wrongOption()),
                             elapsed: elapsed, scaffoldShown: shown,
                             timedOut: timedOut, item: item, topic: topic,
                             crystalsReported: crystals, mode: mode))
    }
}
