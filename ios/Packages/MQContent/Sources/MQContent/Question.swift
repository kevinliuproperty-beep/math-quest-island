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
    /// The CANONICAL unit the stem asks for (`"cm2"`, `"min"`, `"pages"`). Empty when
    /// the answer is a bare count. Never used by Swift to grade - it is here so a keypad
    /// can show the unit beside the field. When the question accepts a SET of equivalent
    /// spellings this is the first member; `units` carries the whole set.
    public let unit: String

    /// EVERY unit this question accepts, canonical first.
    ///
    /// `q.unit` in the engine may be a string or an array of equivalents (`['cm³','ml']`
    /// - 1 ml IS 1 cm³, and `p5volume`'s own stem says so). `unit` above is only the
    /// canonical member, so a client that builds a unit chooser from it offers an
    /// accepted equivalent as a WRONG-unit distractor and teaches a falsehood the app
    /// itself contradicts (Quest Refutation K3/K7, 2026-09-07). `key` is opaque to
    /// Swift, so the set is published as its own field.
    ///
    /// Optional so a payload recorded before this field existed still decodes; prefer
    /// `acceptedUnits`, which falls back to `[unit]`.
    public let units: [String]?

    /// Every unit the grader would accept on this question, canonical first, and empty
    /// when the answer is a bare number. **This is the list a unit chooser must consult**
    /// - never `unit` alone.
    public var acceptedUnits: [String] {
        if let units, !units.isEmpty { return units }
        return unit.isEmpty ? [] : [unit]
    }

    /// The engine's grading key, carried opaquely and handed straight back to
    /// `grade`. Swift must not interpret it: see `JSONValue`.
    public let key: JSONValue

    public var isTyped: Bool { kind == .typed }

    /// The answer that grades correct, for this question, without asking the engine.
    /// Used by gates and by bot/demo play - never on the child's path.
    ///
    /// `Int(someDouble)` is a TRAP in Swift, not an error: an unguarded one here on a
    /// key answer of `1e21` killed the whole process (`Fatal error: Double value
    /// cannot be converted to Int`, exit 133). No engine-supplied number is pushed
    /// through a fixed-width integer anywhere in this module - `JSONValue.numberText`
    /// formats it the way JavaScript prints it instead.
    public var selfAnswer: Answer {
        switch kind {
        case .choice: return .choice(correctIndex)
        case .typed:
            if let n = key["answer"]?.doubleValue {
                return .typed(JSONValue.numberText(n))
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
///
/// **This type is on the child's input path, so its decode must never throw.**
///
/// It used to. `Parsed.frac` was `[Int]?` while `reduceFrac` in `js/core.js` returns
/// unbounded JavaScript numbers, so a child who typed `99999999999999999999/3` got a
/// normal "wrong value or unit" verdict in node and a thrown `DecodingError` in Swift -
/// an error the app has to handle on an answer submission. Per the brief's own rule
/// ("any divergence between node and Swift is a bridge bug"), that was a kill.
///
/// The rule this type now enforces:
///
/// * every engine-supplied NUMBER decodes as `Double` (or `JSONValue`), never as a
///   fixed-width Swift integer. `1e21`, a 20-digit numerator, `-0` and
///   `9007199254740993` all land intact - they are the same doubles JavaScript holds.
/// * every field is decoded LENIENTLY: a missing, null or unexpectedly-typed field
///   falls back to a defined value rather than throwing. A malformed verdict must
///   still be a verdict; the alternative is the app raising an error where node
///   returned an answer, which is the exact divergence class this decode exists to
///   prevent.
public struct Verdict: Codable, Hashable, Sendable {

    public struct Parsed: Codable, Hashable, Sendable {
        public let ok: Bool
        public let value: Double?
        public let unit: String
        /// `[numerator, denominator]`, reduced, when the child typed a fraction.
        /// **`Double`, not `Int`:** `reduceFrac` returns JS numbers with no bound, and
        /// a numerator past `Int64` is a perfectly ordinary wrong answer.
        public let frac: [Double]?
        public let reason: String?

        public init(ok: Bool, value: Double?, unit: String, frac: [Double]?, reason: String?) {
            self.ok = ok; self.value = value; self.unit = unit; self.frac = frac; self.reason = reason
        }

        private enum CodingKeys: String, CodingKey { case ok, value, unit, frac, reason }

        public init(from decoder: Decoder) throws {
            guard let c = try? decoder.container(keyedBy: CodingKeys.self) else {
                // A `parsed` that is not even an object still has to yield a Parsed:
                // node returns a verdict here, so Swift must too.
                self.ok = false; self.value = nil; self.unit = ""
                self.frac = nil; self.reason = "undecodable"
                return
            }
            self.ok = (try? c.decodeIfPresent(Bool.self, forKey: .ok)).flatMap { $0 } ?? false
            self.value = JSONValue.leniently(c, .value)?.doubleValue
            self.unit = JSONValue.leniently(c, .unit)?.stringValue ?? ""
            let arr = JSONValue.leniently(c, .frac)?.arrayValue
            self.frac = (arr?.isEmpty == false) ? arr!.map { $0.doubleValue ?? .nan } : nil
            self.reason = JSONValue.leniently(c, .reason)?.stringValue
        }
    }

    public let correct: Bool
    public let kind: Question.Kind
    public let questionId: String?
    /// -1 for a typed question.
    public let expectedIndex: Int
    public let expectedText: String
    public let chosenIndex: Int
    /// Why a wrong answer was wrong, as a case rather than a string to match on.
    ///
    /// `wrongUnit` is the one the child's card turns on: the NUMBER was right and
    /// only the unit rejected it ("300 cm" on a cm² answer). The engine used to
    /// return one string, `"wrong value or unit"`, for both halves, so a view built
    /// on this could only ever say "wrong" - the wound the Unit Sweep Refutation
    /// found on the web card, inherited (Unit Sweep Refutation W1, 2026-09-07).
    ///
    /// **Unknown reasons stay legal.** A reason this enum has never heard of decodes
    /// as `.other(raw)` and keeps its text; it is never an error, and `Verdict.reason`
    /// carries the raw string regardless. A verdict must survive an engine that
    /// learned a new word.
    public enum Reason: Hashable, Sendable {
        /// The value is right; the unit is not.
        case wrongUnit
        /// The number itself is wrong.
        case wrongValue
        /// A multiple-choice answer picked the wrong option.
        case wrongOption
        /// No option was chosen / no answer given.
        case noAnswer
        /// The chosen text matched no option.
        case noSuchChoice
        /// Nothing was typed.
        case empty
        /// What was typed did not parse as a number.
        case notANumber
        /// Anything the engine says that this enum does not know yet.
        case other(String)

        public init(raw: String) {
            switch raw {
            case "wrong-unit":      self = .wrongUnit
            case "wrong-value":     self = .wrongValue
            case "wrong option":    self = .wrongOption
            case "no answer given": self = .noAnswer
            case "no such choice":  self = .noSuchChoice
            case "empty":           self = .empty
            case "not a number":    self = .notANumber
            default:                self = .other(raw)
            }
        }

        public var rawValue: String {
            switch self {
            case .wrongUnit:    return "wrong-unit"
            case .wrongValue:   return "wrong-value"
            case .wrongOption:  return "wrong option"
            case .noAnswer:     return "no answer given"
            case .noSuchChoice: return "no such choice"
            case .empty:        return "empty"
            case .notANumber:   return "not a number"
            case .other(let s): return s
            }
        }
    }

    /// Why it was wrong, in engine words (`"wrong option"`, `"wrong-unit"`,
    /// `"wrong-value"`, `"not a number"`, `"empty"`). Nil when correct.
    /// Prefer `reasonKind` to match on it.
    public let reason: String?

    /// `reason` as a case. Nil when the verdict is correct (or carries no reason);
    /// an unrecognised reason is `.other(raw)`, never an error.
    public var reasonKind: Reason? { reason.map(Reason.init(raw:)) }

    /// True when the child's NUMBER was right and only the unit rejected the answer -
    /// the cue for "Your number was right, the unit should be cm²" rather than "wrong".
    public var isWrongUnit: Bool { reasonKind == .wrongUnit }
    /// Present for typed answers: how the JS grader read what the child typed.
    public let parsed: Parsed?
    public let typedRaw: String?

    public init(correct: Bool, kind: Question.Kind, questionId: String?, expectedIndex: Int,
                expectedText: String, chosenIndex: Int, reason: String?, parsed: Parsed?, typedRaw: String?) {
        self.correct = correct; self.kind = kind; self.questionId = questionId
        self.expectedIndex = expectedIndex; self.expectedText = expectedText; self.chosenIndex = chosenIndex
        self.reason = reason; self.parsed = parsed; self.typedRaw = typedRaw
    }

    private enum CodingKeys: String, CodingKey {
        case correct, kind, questionId, expectedIndex, expectedText, chosenIndex, reason, parsed, typedRaw
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.correct = (try? c.decodeIfPresent(Bool.self, forKey: .correct)).flatMap { $0 } ?? false
        self.kind = (try? c.decodeIfPresent(Question.Kind.self, forKey: .kind)).flatMap { $0 } ?? .choice
        self.questionId = JSONValue.leniently(c, .questionId)?.stringValue
        // Indices are engine-controlled and small, but a fixed-width decode is still the
        // trap: clamp rather than throw, and never on the child's path.
        self.expectedIndex = JSONValue.leniently(c, .expectedIndex)?.clampedIntValue ?? -1
        self.chosenIndex = JSONValue.leniently(c, .chosenIndex)?.clampedIntValue ?? -1
        self.expectedText = JSONValue.leniently(c, .expectedText)?.stringValue ?? ""
        self.reason = JSONValue.leniently(c, .reason)?.stringValue
        self.parsed = try? c.decodeIfPresent(Parsed.self, forKey: .parsed)
        self.typedRaw = JSONValue.leniently(c, .typedRaw)?.stringValue
    }
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
