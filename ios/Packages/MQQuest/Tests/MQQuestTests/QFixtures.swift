import Foundation
import MQContent
import MQDesign
@testable import MQQuest

/// Fixtures for the tests that must NOT touch the engine.
///
/// `MQContent.Question` and `Explanation` have no public initialiser - every
/// field is a `public let` and the memberwise init is internal - so a fixture is
/// DECODED from the same JSON shape `tools/engine/api.js` emits. That is a
/// feature rather than a workaround: a fixture that stops decoding is a fixture
/// that has drifted from the wire format, and the suite says so.
enum QFixturesDoc {}

/// **Register the bundled face before measuring anything.**
///
/// `MQFonts.register()` is what makes `.mq(...)` resolve to Baloo 2. Without it
/// every `Text` in the package silently falls back to the system font - which is
/// narrower and shorter than Baloo at the same point size, so a paragraph wraps
/// into FEWER lines and a screen that overflows on a real device measures as
/// fitting in a test.
///
/// That is not hypothetical: this suite's first layout tests passed a result
/// screen that the headless driver - which does register - rendered with its
/// title cut off the top and its buttons cut off the bottom. Every test in this
/// target that measures or renders calls this first.
enum QTestFonts {
    nonisolated(unsafe) private static var done = false
    private static let lock = NSLock()

    @discardableResult
    static func ensure() -> Bool {
        lock.lock(); defer { lock.unlock() }
        if !done { _ = MQFonts.register(); done = true }
        return done
    }
}

enum QFixtures {

    static func question(id: String = "q1",
                         topic: String = "p4area",
                         skill: String = "area",
                         kind: String = "typed",
                         stem: String = "What is the area, in cm2?",
                         unit: String = "cm²",
                         answer: Double = 24,
                         choices: [String] = [],
                         correctIndex: Int = -1,
                         level: Int = 1,
                         figure: [String: Any]? = nil) -> Question {
        var key: [String: Any] = ["typed": kind == "typed",
                                  "correct": correctIndex]
        if kind == "typed" {
            key["answer"] = answer
            if !unit.isEmpty { key["unit"] = unit }
        }
        var dict: [String: Any] = [
            "id": id, "topic": topic, "generator": NSNull(), "pool": level,
            "level": level, "skill": skill, "kind": kind,
            "stem": stem, "stemText": stem,
            "extra": "", "extraText": "", "extraIsMarkup": false,
            "figure": figure as Any? ?? NSNull(),
            "choices": choices, "choiceTexts": choices,
            "correctIndex": correctIndex,
            "answerText": "\(fmt(answer)) \(unit)".trimmingCharacters(in: .whitespaces),
            "answerTextPlain": "\(fmt(answer)) \(unit)".trimmingCharacters(in: .whitespaces),
            "explain": "Because it is.", "explainText": "Because it is.",
            "unit": unit, "key": key
        ]
        if figure == nil { dict["figure"] = NSNull() }
        return decode(Question.self, dict)
    }

    static func fmt(_ d: Double) -> String { JSONValue.numberText(d) }

    static func decode<T: Decodable>(_ type: T.Type, _ dict: [String: Any]) -> T {
        let data = try! JSONSerialization.data(withJSONObject: dict)
        return try! JSONDecoder().decode(T.self, from: data)
    }

    static func explanation(_ text: String = "Because it is.") -> Explanation {
        decode(Explanation.self, [
            "questionId": "q1", "topic": "p4area", "skill": "area",
            "skillLabel": "Area", "skillTip": "Say the formula out loud.",
            "html": text, "text": text,
            "answerText": "24 cm²", "answerTextPlain": "24 cm²"
        ])
    }

    static func catalogue(topics: [String] = ["p4area", "p4pie"],
                          grade: String = "P4",
                          lockedLast: Bool = true) -> TopicCatalogue {
        var topicDicts: [[String: Any]] = []
        var nodeDicts: [[String: Any]] = []
        for (i, id) in topics.enumerated() {
            let locked = lockedLast && i == topics.count - 1
            topicDicts.append([
                "id": id, "level": grade, "strand": "Measurement",
                "moeSubTopic": "Area", "label": id, "short": id, "emoji": "",
                "name": id.capitalized + " Bay", "blurb": "A place.",
                "grades": [grade], "status": locked ? "locked" : "live",
                "skills": [["id": "area", "label": "Area", "tip": "tip"],
                           ["id": "perimeter", "label": "Perimeter", "tip": "tip"]],
                "poolSizes": ["1": 1, "2": 1, "3": 1],
                "generators": [["ref": "\(id)/1/0", "pool": 1, "index": 0, "skill": "area"]]
            ])
            nodeDicts.append([
                "id": id, "emoji": "", "name": id.capitalized + " Bay",
                "blurb": "A place.", "grades": [grade],
                "status": locked ? "locked" : "live", "playable": !locked
            ])
        }
        return decode(TopicCatalogue.self, [
            "count": topicDicts.count, "generatorCount": topicDicts.count,
            "topics": topicDicts, "grades": [grade], "nodes": nodeDicts
        ])
    }

    static func build() -> EngineBuild {
        decode(EngineBuild.self, [
            "stamp": "test", "date": "20260907", "sha": "0000000", "dirty": false,
            "payloadHash": "0000000000000000", "files": [], "fileCount": 0,
            "topicCount": 1, "generatorCount": 1, "distinctGenerators": 1,
            "platform": "fixture"
        ])
    }
}

/// A `QuestionSource` that hands out a scripted list and grades by comparing the
/// submitted text to the key's own answer.
///
/// **It is NOT a grader and does not pretend to be one.** It exists so the flow
/// tests can drive an exact sequence of right and wrong answers; every claim
/// about GRADING in this suite goes through `JSQuestionEngine` instead.
actor ScriptedSource: QuestionSource {
    private var queue: [Question]
    private var drawn: [Question] = []
    private(set) var endedSessions: [String] = []
    private(set) var levelsRequested: [Int] = []

    init(_ questions: [Question]) { self.queue = questions }

    func listTopics() async throws -> TopicCatalogue { QFixtures.catalogue() }

    func nextQuestion(_ request: QuestionRequest) async throws -> Question {
        if case .feed(_, let level, _) = request { levelsRequested.append(level) }
        guard !queue.isEmpty else { throw ScriptedError.exhausted }
        let q = queue.removeFirst()
        drawn.append(q)
        return q
    }

    func grade(question: Question, answer: Answer) async throws -> Verdict {
        switch answer {
        case .choice(let i):
            let ok = i == question.correctIndex
            return Verdict(correct: ok, kind: .choice, questionId: question.id,
                           expectedIndex: question.correctIndex,
                           expectedText: question.answerTextPlain, chosenIndex: i,
                           reason: ok ? nil : "wrong option", parsed: nil, typedRaw: nil)
        case .typed(let text):
            let bare = text.replacingOccurrences(of: question.unit, with: "")
                .trimmingCharacters(in: .whitespaces)
            let want = question.key["answer"]?.doubleValue
            let ok = Double(bare) == want
                && (text == bare || text.hasSuffix(question.unit))
            return Verdict(correct: ok, kind: .typed, questionId: question.id,
                           expectedIndex: -1, expectedText: question.answerTextPlain,
                           chosenIndex: -1,
                           reason: ok ? nil : "wrong value or unit",
                           parsed: nil, typedRaw: text)
        }
    }

    func explain(_ question: Question) async throws -> Explanation {
        QFixtures.explanation()
    }
    func engineBuild() async throws -> EngineBuild { QFixtures.build() }
    func endSession(_ session: String) async throws { endedSessions.append(session) }

    enum ScriptedError: Error { case exhausted }
}

/// A random source that hands back exactly the rolls a test asks for.
final class QFixedRandom: QRandom, @unchecked Sendable {
    private let rolls: [Int]
    private var i = 0
    init(_ rolls: [Int] = [0]) { self.rolls = rolls.isEmpty ? [0] : rolls }
    func ri(_ a: Int, _ b: Int) -> Int {
        defer { i += 1 }
        return min(max(rolls[i % rolls.count], a), b)
    }
}
