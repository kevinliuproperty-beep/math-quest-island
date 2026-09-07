import Foundation
import MQContent

/// A `QuestionSource` made of canned items.
///
/// Why a stub and not the real engine: `JSQuestionEngine` needs JavaScriptCore, a
/// bundle resource and about six seconds of warm-up, and every one of the
/// questions it produces is random. A feed test that asks "did the ring stop the
/// third clone" needs to CHOOSE what comes back. The real engine is exercised by
/// the engine lane's own 50,000-draw gate; there is nothing for this lane to
/// re-prove about it.
///
/// It is deliberately in `Sources`, not in the test target: the SwiftUI previews
/// and the storybook renders need it too, and a preview that cannot compile is a
/// screen nobody looks at until it is broken.
public actor StubQuestionSource: QuestionSource {

    /// Questions per topic, cycled in order so a test can predict the sequence.
    private var byTopic: [String: [Question]]
    private var cursor: [String: Int] = [:]
    private let catalogue: TopicCatalogue
    public private(set) var requests: [QuestionRequest] = []

    public init(catalogue: TopicCatalogue, questions: [String: [Question]]) {
        self.catalogue = catalogue
        self.byTopic = questions
    }

    public func listTopics() async throws -> TopicCatalogue { catalogue }

    public func nextQuestion(_ request: QuestionRequest) async throws -> Question {
        requests.append(request)
        let topic: String
        switch request {
        case .feed(let t, _, _): topic = t
        case .pool(let t, _): topic = t
        case .generator(let ref, _): topic = String(ref.split(separator: "/").first ?? "")
        }
        guard let items = byTopic[topic], !items.isEmpty else {
            throw StubError.noQuestions(topic)
        }
        let i = (cursor[topic] ?? 0) % items.count
        cursor[topic] = i + 1
        return items[i]
    }

    public func grade(question: Question, answer: Answer) async throws -> Verdict {
        let correct: Bool
        switch (question.kind, answer) {
        case (.choice, .choice(let i)): correct = i == question.correctIndex
        case (.typed, .typed(let s)):
            correct = s.trimmingCharacters(in: .whitespaces) == question.answerTextPlain
        default: correct = false
        }
        return Verdict(correct: correct, kind: question.kind, questionId: question.id,
                       expectedIndex: question.correctIndex, expectedText: question.answerTextPlain,
                       chosenIndex: { if case .choice(let i) = answer { return i } else { return -1 } }(),
                       reason: correct ? nil : "wrong option", parsed: nil, typedRaw: nil)
    }

    // `Explanation` and `EngineBuild` are `Codable` with no public memberwise
    // initialiser - the engine is their only author. Going through JSON is
    // therefore not a shortcut here, it is the only door, and it has the same
    // virtue as it does for `Question`: this stub cannot drift from the shape the
    // engine really sends.
    public func explain(_ question: Question) async throws -> Explanation {
        let json = """
        {"questionId":"\(question.id)","topic":"\(question.topic)","skill":"\(question.skill)",
         "skillLabel":"\(question.skill)","skillTip":"","html":"","text":"",
         "answerText":"\(question.answerText)","answerTextPlain":"\(question.answerTextPlain)"}
        """
        return try JSONDecoder().decode(Explanation.self, from: Data(json.utf8))
    }

    public func engineBuild() async throws -> EngineBuild {
        let json = """
        {"stamp":"stub","date":"2026-09-07","sha":"stub","dirty":false,"payloadHash":"stub",
         "files":[],"fileCount":0,"topicCount":\(catalogue.topics.count),"generatorCount":0,
         "distinctGenerators":0,"platform":"stub"}
        """
        return try JSONDecoder().decode(EngineBuild.self, from: Data(json.utf8))
    }

    public func endSession(_ session: String) async throws {}

    public enum StubError: Error, Equatable { case noQuestions(String) }
}

// MARK: - Canned content

public extension StubQuestionSource {

    /// One question, with everything a Patchwerk HUD reads filled in.
    static func question(id: String, topic: String, pool: Int, stem: String,
                         choices: [String], correctIndex: Int,
                         skill: String = "skill", extra: String = "") -> Question {
        let json = """
        {"id":"\(id)","topic":"\(topic)","generator":null,"pool":\(pool),"level":\(pool),
         "skill":"\(skill)","kind":"choice","stem":"\(stem)","stemText":"\(stem)",
         "extra":"\(extra)","extraText":"\(extra)","extraIsMarkup":false,"figure":null,
         "choices":\(jsonArray(choices)),"choiceTexts":\(jsonArray(choices)),
         "correctIndex":\(correctIndex),"answerText":"\(choices[correctIndex])",
         "answerTextPlain":"\(choices[correctIndex])","explain":"","explainText":"",
         "unit":"","key":{}}
        """
        // Decoding rather than a memberwise init: `Question`'s stored properties
        // are `let` with no public initialiser, and going through `Codable` also
        // means this stub cannot drift from the shape the engine really sends.
        return try! JSONDecoder().decode(Question.self, from: Data(json.utf8))
    }

    private static func jsonArray(_ items: [String]) -> String {
        "[" + items.map { "\"\($0)\"" }.joined(separator: ",") + "]"
    }

    /// A small three-topic P4 catalogue, live, matching the real registry's shape.
    static func sampleCatalogue(level: String = "P4",
                                topics: [String] = ["p4peri", "p4deci", "p4frac"],
                                lockedTopic: String = "p4algebra") -> TopicCatalogue {
        let live = topics.map { id in
            """
            {"id":"\(id)","level":"\(level)","strand":"Number","moeSubTopic":"stub",
             "label":"\(id)","short":"\(id)","emoji":"*","name":"\(id)","blurb":"",
             "grades":["\(level)"],"status":"live","skills":[],"poolSizes":{"1":2,"2":2,"3":2},
             "generators":[]}
            """
        }
        let locked = """
        {"id":"\(lockedTopic)","level":"\(level)","strand":"Number","moeSubTopic":"stub",
         "label":"locked","short":"locked","emoji":"*","name":"locked","blurb":"",
         "grades":["\(level)"],"status":"soon","poolSizes":{},"skills":[],"generators":[]}
        """
        let json = """
        {"count":\(topics.count + 1),"generatorCount":0,
         "topics":[\((live + [locked]).joined(separator: ","))],
         "grades":["\(level)"],"nodes":[]}
        """
        return try! JSONDecoder().decode(TopicCatalogue.self, from: Data(json.utf8))
    }
}
