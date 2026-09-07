import Foundation

/// One item as the engine produced it.
///
/// Mirrors the object `MQI_API.nextQuestion` returns (see `tools/engine/api.js`).
/// The engine still speaks a little HTML - fraction spans, `<b>`, `&nbsp;`, and until
/// the figure-spec lane lands, an SVG diagram in `extra` - so every markup-bearing
/// field arrives twice: the raw string, and a plain-text reduction a `Text()` can show
/// today. `stemText` / `choiceTexts` / `explainText` are the SwiftUI-safe ones.
public struct Question: Codable, Hashable, Sendable, Identifiable {

    public enum Kind: String, Codable, Sendable {
        case choice      // four options, one correct index
        case typed       // the child types the answer; the JS grader owns the comparison
    }

    /// Stable only within one engine run - it is a sequence number, not a content hash.
    public let id: String
    public let topic: String
    /// `"<topic>/<pool>/<index>"` when the question was drawn from a named pool entry;
    /// nil when it came out of a feed session (the feed picks the entry itself).
    public let generator: String?
    /// Which difficulty pool the generator came from (1 easy, 2 medium, 3 hard).
    public let pool: Int
    /// The level the child is *playing* at. Differs from `pool` at level 3 when the
    /// feed's thin-pool alternation borrows a pool-2 draw (see `createFeed` in core.js).
    public let level: Int
    public let skill: String
    public let kind: Kind

    public let stem: String
    public let stemText: String
    /// A diagram, table or working area. HTML/SVG today for the six figure topics.
    public let extra: String
    public let extraText: String
    /// True while this topic still paints its diagram as markup in `extra`.
    /// The figure-spec lane drives this to false; `figure` becomes the source of truth.
    public let extraIsMarkup: Bool
    /// The data spec a SwiftUI renderer draws. Nil until the generator emits one.
    public let figure: Figure?

    public let choices: [String]
    public let choiceTexts: [String]
    /// -1 for a typed question.
    public let correctIndex: Int

    public let answerText: String
    public let answerTextPlain: String
    public let explain: String
    public let explainText: String
    /// The unit the stem asks for (`"cm2"`, `"min"`, `"pages"`). Empty when the answer
    /// is a bare count. Never used by Swift to grade - it is here so a keypad can show
    /// the unit beside the field.
    public let unit: String

    /// The engine's grading key, carried opaquely and handed straight back to
    /// `grade`. Swift must not interpret it: see `JSONValue`.
    public let key: JSONValue

    public var isTyped: Bool { kind == .typed }

    /// The answer that grades correct, for this question, without asking the engine.
    /// Used by gates and by bot/demo play - never on the child's path.
    public var selfAnswer: Answer {
        switch kind {
        case .choice: return .choice(correctIndex)
        case .typed:
            if let n = key["answer"]?.doubleValue {
                return .typed(n.rounded() == n ? String(Int(n)) : String(n))
            }
            return .typed(answerTextPlain)
        }
    }
}

/// What the child did.
public enum Answer: Codable, Hashable, Sendable {
    /// Index into `Question.choices`.
    case choice(Int)
    /// Exactly what the child typed, untrimmed and unparsed. Parsing and unit rules
    /// belong to the JS grader.
    case typed(String)

    private enum CodingKeys: String, CodingKey { case choice, text }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .choice(let i): try c.encode(i, forKey: .choice)
        case .typed(let s): try c.encode(s, forKey: .text)
        }
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let i = try c.decodeIfPresent(Int.self, forKey: .choice) { self = .choice(i); return }
        self = .typed(try c.decodeIfPresent(String.self, forKey: .text) ?? "")
    }
}

/// The engine's ruling on one answer.
public struct Verdict: Codable, Hashable, Sendable {
    public struct Parsed: Codable, Hashable, Sendable {
        public let ok: Bool
        public let value: Double?
        public let unit: String
        /// `[numerator, denominator]`, reduced, when the child typed a fraction.
        public let frac: [Int]?
        public let reason: String?
    }

    public let correct: Bool
    public let kind: Question.Kind
    public let questionId: String?
    /// -1 for a typed question.
    public let expectedIndex: Int
    public let expectedText: String
    public let chosenIndex: Int
    /// Why it was wrong, in engine words (`"wrong option"`, `"wrong value or unit"`,
    /// `"not a number"`, `"empty"`). Nil when correct.
    public let reason: String?
    /// Present for typed answers: how the JS grader read what the child typed.
    public let parsed: Parsed?
    public let typedRaw: String?
}

/// What the child sees after getting it wrong, plus the parent tip for the skill.
public struct Explanation: Codable, Hashable, Sendable {
    public let questionId: String?
    public let topic: String
    public let skill: String
    public let skillLabel: String
    /// One actionable sentence for a parent, authored per skill in the topic file.
    public let skillTip: String
    public let html: String
    public let text: String
    public let answerText: String
    public let answerTextPlain: String
}
