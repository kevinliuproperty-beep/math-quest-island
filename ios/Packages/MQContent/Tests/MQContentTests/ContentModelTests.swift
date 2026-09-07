import Foundation
import Testing
@testable import MQContent

/// The seam's own contract, tested without any engine: these shapes are what a
/// SwiftUI view, a fixture source and a snapshot test all agree on.
@Suite("MQContent models")
struct ContentModelTests {

    /// Exactly the JSON `MQI_API.nextQuestion` returns for a choice item.
    static let choiceJSON = #"""
    {"id":"q1","topic":"tables","generator":"tables/1/0","pool":1,"level":1,"skill":"mul",
     "kind":"choice","stem":"6 × 7 = ?","stemText":"6 × 7 = ?","extra":"","extraText":"",
     "figure":null,"extraIsMarkup":false,
     "choices":["42","48","36","49"],"choiceTexts":["42","48","36","49"],"correctIndex":0,
     "answerText":"42","answerTextPlain":"42",
     "explain":"6 × 7 = 42.","explainText":"6 × 7 = 42.","unit":"",
     "key":{"typed":false,"correct":0}}
    """#

    /// A typed item with a unit - the shape the Wave-2 unit kill lives in.
    static let typedJSON = #"""
    {"id":"q2","topic":"p4area","generator":"p4area/2/1","pool":2,"level":2,"skill":"area",
     "kind":"typed","stem":"Find the area in cm<sup>2</sup>.","stemText":"Find the area in cm 2 .",
     "extra":"<svg width='10'></svg>","extraText":"","figure":null,"extraIsMarkup":true,
     "choices":[],"choiceTexts":[],"correctIndex":-1,
     "answerText":"113 cm2","answerTextPlain":"113 cm2",
     "explain":"","explainText":"","unit":"cm2",
     "key":{"typed":true,"correct":-1,"answer":113,"unit":"cm2"}}
    """#

    private func question(_ json: String) throws -> Question {
        try JSONDecoder().decode(Question.self, from: Data(json.utf8))
    }

    @Test("a choice question decodes")
    func decodesChoiceQuestion() throws {
        let q = try question(Self.choiceJSON)
        #expect(q.kind == .choice)
        #expect(!q.isTyped)
        #expect(q.choices.count == 4)
        #expect(q.correctIndex == 0)
        #expect(q.figure == nil)
        #expect(q.selfAnswer == .choice(0))
    }

    @Test("a typed question decodes and its grading key stays opaque")
    func decodesTypedQuestion() throws {
        let q = try question(Self.typedJSON)
        #expect(q.kind == .typed)
        #expect(q.correctIndex == -1)
        #expect(q.unit == "cm2")
        #expect(q.extraIsMarkup, "extra still carries markup for the six figure topics")
        #expect(q.key["answer"]?.intValue == 113)
        #expect(q.key["unit"]?.stringValue == "cm2")
        #expect(q.selfAnswer == .typed("113"))
    }

    /// A question must survive the trip back to JavaScript unchanged - grading depends
    /// on the key arriving exactly as it left.
    @Test("a question round-trips losslessly", arguments: [choiceJSON, typedJSON])
    func roundTrips(json: String) throws {
        let a = try question(json)
        let b = try JSONDecoder().decode(Question.self, from: JSONEncoder().encode(a))
        #expect(a == b)
        #expect(a.key == b.key)
    }

    /// A whole number in the key must not come back as 113.0 - JavaScript would then
    /// be handed a different literal than the generator produced.
    @Test("whole numbers in the key stay integers on re-encode")
    func wholeNumbersStayIntegers() throws {
        let q = try question(Self.typedJSON)
        let text = String(decoding: try JSONEncoder().encode(q.key), as: UTF8.self)
        #expect(text.contains("\"answer\":113"), "key re-encoded as \(text)")
        #expect(!text.contains("113.0"))
    }

    @Test("Answer encodes in the shape the engine expects")
    func answerWireShape() throws {
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys]
        #expect(String(decoding: try enc.encode(Answer.choice(2)), as: UTF8.self) == #"{"choice":2}"#)
        #expect(String(decoding: try enc.encode(Answer.typed("113 cm")), as: UTF8.self) == #"{"text":"113 cm"}"#)
    }

    @Test("JSONValue reads back every JSON shape")
    func jsonValueAccessors() throws {
        let v = try JSONDecoder().decode(JSONValue.self,
            from: Data(#"{"a":1,"b":"x","c":[true,null,2.5],"d":{"e":false}}"#.utf8))
        #expect(v["a"]?.intValue == 1)
        #expect(v["b"]?.stringValue == "x")
        #expect(v["c"]?[0]?.boolValue == true)
        #expect(v["c"]?[1]?.isNull == true)
        #expect(v["c"]?[2]?.doubleValue == 2.5)
        #expect(v["d"]?["e"]?.boolValue == false)
        #expect(v["nope"] == nil)
    }

    // MARK: - The protocol's own default batching

    private struct FixtureSource: QuestionSource {
        let question: Question
        func listTopics() async throws -> TopicCatalogue {
            TopicCatalogue(count: 0, generatorCount: 0, topics: [], grades: [], nodes: [])
        }
        func nextQuestion(_ request: QuestionRequest) async throws -> Question { question }
        func grade(question: Question, answer: Answer) async throws -> Verdict {
            Verdict(correct: answer == question.selfAnswer, kind: question.kind, questionId: question.id,
                    expectedIndex: question.correctIndex, expectedText: question.answerTextPlain,
                    chosenIndex: -1, reason: nil, parsed: nil, typedRaw: nil)
        }
        func explain(_ question: Question) async throws -> Explanation {
            Explanation(questionId: question.id, topic: question.topic, skill: question.skill,
                        skillLabel: "", skillTip: "", html: "", text: "", answerText: "", answerTextPlain: "")
        }
        func engineBuild() async throws -> EngineBuild {
            EngineBuild(stamp: "fixture", date: "", sha: "", dirty: false, payloadHash: "", files: [],
                        fileCount: 0, topicCount: 0, generatorCount: 0, distinctGenerators: 0, platform: "fixture")
        }
        func endSession(_ session: String) async throws {}
    }

    /// The point of the seam: a source that implements only the singular calls still
    /// answers the batch ones, so a fixture or a future Swift port is a drop-in.
    @Test("the protocol's default batching works for any source")
    func defaultBatching() async throws {
        let source = FixtureSource(question: try question(Self.choiceJSON))
        let batch = try await source.nextQuestions(.pool(topic: "tables", level: 1), count: 5)
        #expect(batch.count == 5)
        let verdicts = try await source.grade(batch.map { (question: $0, answer: $0.selfAnswer) })
        #expect(verdicts.count == 5)
        let allCorrect = verdicts.allSatisfy { $0.correct }
        #expect(allCorrect)
    }

    @Test("QuestionRequest keeps its three modes distinct")
    func requestModes() {
        #expect(QuestionRequest.feed(topic: "geometry", level: 2, session: "s")
                != QuestionRequest.pool(topic: "geometry", level: 2))
        #expect(QuestionRequest.generator(ref: "geometry/1/0")
                == QuestionRequest.generator(ref: "geometry/1/0", level: nil))
    }
}
