import Testing
import Foundation
import MQContent
import MQEngineJS
@testable import MQQuest

// =============================================================================
// THE TYPED-ANSWER PATH
//
// Two halves, and both matter:
//
//   * the keypad produces EXACTLY the string `js/app.js` would have submitted
//     (`$('typedInput').value.trim()`), and
//   * that string, and the chip beside it, go through the REAL grader.
//
// The second half is why this test target depends on MQEngineJS. "The declared
// unit is accepted and the distractor is rejected" is a claim about
// `gradeTyped` in `js/core.js`; asserting it against a fake source would prove
// only that the fake agrees with itself.
// =============================================================================

@Suite("The keypad produces the string the web would submit")
struct QKeypadEntryTests {

    static func typed(_ text: String, policy: QKeypadPolicy) -> QTypedEntry {
        var e = QTypedEntry()
        for ch in text {
            switch ch {
            case "0"..."9": e.press(.digit(Int(String(ch))!), policy: policy)
            case ".":       e.press(.decimalPoint, policy: policy)
            case "/":       e.press(.slash, policy: policy)
            case "-":       e.press(.minus, policy: policy)
            default:        break
            }
        }
        return e
    }

    @Test("tapping the digits of an answer reproduces it exactly",
          arguments: ["46", "0", "113", "9007199254740993", "1"])
    func digits(_ text: String) {
        #expect(Self.typed(text, policy: .digitsOnly).digits == text)
    }

    @Test("a decimal answer needs the topic's decimal key and then survives whole",
          arguments: ["4.75", "0.05", "13.9", "6.1", "3."])
    func decimals(_ text: String) {
        #expect(Self.typed(text, policy: QKeypadPolicy(decimal: true)).digits == text)
        // Without the key the point is simply not produced - the entry is the
        // digits alone, which is a WRONG answer rather than a crash.
        #expect(Self.typed(text, policy: .digitsOnly).digits
                == text.filter { $0 != "." })
    }

    @Test("a fraction answer needs the fraction key")
    func fractions() {
        let p = QKeypadPolicy(decimal: true, fraction: true)
        #expect(Self.typed("3/4", policy: p).digits == "3/4")
        #expect(Self.typed("11/12", policy: p).digits == "11/12")
        #expect(Self.typed("3/4", policy: .digitsOnly).digits == "34")
    }

    @Test("the keypad refuses the shapes a number cannot have")
    func refusals() {
        let p = QKeypadPolicy(decimal: true, fraction: true, minus: true)
        #expect(Self.typed(".5", policy: p).digits == "5")        // no leading point
        #expect(Self.typed("1..5", policy: p).digits == "1.5")    // one point per number
        #expect(Self.typed("/2", policy: p).digits == "2")        // no leading slash
        #expect(Self.typed("1/2/3", policy: p).digits == "1/23")  // one slash
        #expect(Self.typed("1-2", policy: p).digits == "12")      // minus leads or nothing
        #expect(Self.typed("-12", policy: p).digits == "-12")
        // A fraction may have a decimal in its denominator; it may not have two.
        #expect(Self.typed("1/2.5", policy: p).digits == "1/2.5")
        #expect(Self.typed("1/2.5.5", policy: p).digits == "1/2.55")
    }

    @Test("the entry is capped, so a stuck finger cannot fill the slot")
    func cap() {
        var e = QTypedEntry()
        for _ in 0..<40 { e.press(.digit(7), policy: .digitsOnly) }
        #expect(e.digits.count == QTypedEntry.maxDigits)
    }

    @Test("undo removes one character and clear removes them all")
    func undo() {
        var e = Self.typed("113", policy: .digitsOnly)
        e.press(.backspace, policy: .digitsOnly)
        #expect(e.digits == "11")
        e.press(.clear, policy: .digitsOnly)
        #expect(e.digits.isEmpty)
        e.press(.backspace, policy: .digitsOnly)
        #expect(e.digits.isEmpty)          // and does not underflow
    }

    /// The submission is the contract with the grader.
    @Test("blank submits the bare number; a chip submits `<number> <unit>`")
    func submission() {
        var e = Self.typed("113", policy: .digitsOnly)
        #expect(e.submission == "113")
        e.unit = "cm²"
        #expect(e.submission == "113 cm²")
        e.unit = nil
        #expect(e.submission == "113")
        // An empty entry submits nothing at all, chip or no chip.
        var empty = QTypedEntry(); empty.unit = "cm"
        #expect(empty.submission.isEmpty)
    }

    @Test("a key that would do nothing reports itself disabled")
    func enablement() {
        let p = QKeypadPolicy(decimal: true, fraction: true)
        let empty = QTypedEntry()
        #expect(empty.isEnabled(.digit(3), policy: p))
        #expect(!empty.isEnabled(.decimalPoint, policy: p))
        #expect(!empty.isEnabled(.slash, policy: p))
        #expect(!empty.isEnabled(.backspace, policy: p))
        let three = Self.typed("3", policy: p)
        #expect(three.isEnabled(.decimalPoint, policy: p))
        #expect(three.isEnabled(.backspace, policy: p))
        #expect(!three.isEnabled(.minus, policy: p))   // minus is off in this policy
    }
}

// =============================================================================

@Suite("Unit chips, graded by the real engine", .serialized)
struct QUnitChipBridgeTests {

    static let engine = try! JSQuestionEngine()

    /// A typed question that declares a unit, drawn from the live engine.
    static func typedWithUnit(topic: String = "p4area") async throws -> Question {
        for _ in 0..<80 {
            let q = try await engine.nextQuestion(.pool(topic: topic, level: 1))
            if q.isTyped && !q.unit.isEmpty { return q }
            let q3 = try await engine.nextQuestion(.pool(topic: topic, level: 3))
            if q3.isTyped && !q3.unit.isEmpty { return q3 }
        }
        throw QChipTestError.noUnitQuestion(topic)
    }

    static func bare(_ q: Question) -> String {
        if case .typed(let s) = q.selfAnswer { return s }
        return q.answerTextPlain
    }

    @Test("the declared unit is accepted, every distractor is rejected, blank is accepted")
    func chipsGradeAsDesigned() async throws {
        var checked = 0
        for _ in 0..<12 {
            let q = try await Self.typedWithUnit()
            let number = Self.bare(q)
            let chips = QUnits.chips(declared: q.unit, questionID: q.id)
            #expect(chips.count == 3, "three chips: the unit and two distractors")
            #expect(chips.contains { QUnits.accepts($0, declared: q.unit) },
                    "the declared unit is always on the row")

            // blank
            let blank = try await Self.engine.grade(question: q, answer: .typed(number))
            #expect(blank.correct, "a bare number has always been accepted: \(number)")

            for chip in chips {
                var entry = QTypedEntry(digits: number, unit: chip)
                let v = try await Self.engine.grade(question: q, answer: entry.answer)
                if QUnits.accepts(chip, declared: q.unit) {
                    #expect(v.correct,
                            "chip \(chip) is the declared unit of \(q.unit) but was rejected on \"\(entry.submission)\"")
                } else {
                    #expect(!v.correct,
                            "distractor \(chip) was ACCEPTED on \"\(entry.submission)\" (declared \(q.unit))")
                    #expect(v.parsed?.unit.isEmpty == false,
                            "the grader read the chip as a unit")
                }
                entry.unit = nil
                checked += 1
            }
        }
        #expect(checked == 36)
    }

    @Test("a distractor chip surfaces as wrong-unit, a wrong number as wrong-value")
    func reasonsSplit() async throws {
        let q = try await Self.typedWithUnit()
        let number = Self.bare(q)
        let chips = QUnits.chips(declared: q.unit, questionID: q.id)
        let bad = chips.first { !QUnits.accepts($0, declared: q.unit) }!

        // right number, wrong unit
        let wrongUnitAnswer = Answer.typed(QTypedEntry(digits: number, unit: bad).submission)
        let v1 = try await Self.engine.grade(question: q, answer: wrongUnitAnswer)
        #expect(!v1.correct)
        // The engine on THIS branch cannot tell the two apart on its own...
        #expect(v1.reason == "wrong value or unit")
        // ...but the classifier can, by asking it a second question.
        let r1 = await QReasonClassifier.classify(
            question: q, answer: wrongUnitAnswer, verdict: v1,
            regradeBare: { try await Self.engine.grade(question: q, answer: .typed($0)) })
        #expect(r1.isWrongUnit)
        #expect(r1.token == "wrong-unit")

        // wrong number, right unit
        let wrongValue = QDriver.wrongTypedText(number)
        let good = chips.first { QUnits.accepts($0, declared: q.unit) }!
        let wrongValueAnswer = Answer.typed(
            QTypedEntry(digits: wrongValue, unit: good).submission)
        let v2 = try await Self.engine.grade(question: q, answer: wrongValueAnswer)
        #expect(!v2.correct)
        let r2 = await QReasonClassifier.classify(
            question: q, answer: wrongValueAnswer, verdict: v2,
            regradeBare: { try await Self.engine.grade(question: q, answer: .typed($0)) })
        #expect(r2 == .wrongValue)

        // wrong number AND wrong unit is a wrong VALUE: the number is the lesson.
        let bothWrong = Answer.typed(QTypedEntry(digits: wrongValue, unit: bad).submission)
        let v3 = try await Self.engine.grade(question: q, answer: bothWrong)
        let r3 = await QReasonClassifier.classify(
            question: q, answer: bothWrong, verdict: v3,
            regradeBare: { try await Self.engine.grade(question: q, answer: .typed($0)) })
        #expect(r3 == .wrongValue)
    }

    @Test("the classifier honours a split reason the moment the engine emits one")
    func forwardCompatible() {
        let q = QFixtures.question(unit: "cm²")
        let split = Verdict(correct: false, kind: .typed, questionId: "q1",
                            expectedIndex: -1, expectedText: "24 cm²", chosenIndex: -1,
                            reason: "wrong-unit",
                            parsed: Verdict.Parsed(ok: true, value: 24, unit: "cm",
                                                   frac: nil, reason: nil),
                            typedRaw: "24 cm")
        let r = QReasonClassifier.classifyLocally(question: q, answer: .typed("24 cm"),
                                                  verdict: split)
        #expect(r == .wrongUnit(expected: "cm²", got: "cm"))
        let value = Verdict(correct: false, kind: .typed, questionId: "q1",
                            expectedIndex: -1, expectedText: "24 cm²", chosenIndex: -1,
                            reason: "wrong-value", parsed: nil, typedRaw: "25")
        #expect(QReasonClassifier.classifyLocally(question: q, answer: .typed("25"),
                                                  verdict: value) == .wrongValue)
    }

    @Test("empty and not-a-number keep the engine's own words")
    func parseFailures() async throws {
        let q = try await Self.typedWithUnit()
        let empty = try await Self.engine.grade(question: q, answer: .typed(""))
        #expect(QReasonClassifier.classifyLocally(question: q, answer: .typed(""),
                                                  verdict: empty) == .empty)
        let nan = try await Self.engine.grade(question: q, answer: .typed("abc"))
        #expect(QReasonClassifier.classifyLocally(question: q, answer: .typed("abc"),
                                                  verdict: nan) == .notANumber)
    }

    @Test("a wrong option is a wrong option, not a wrong value")
    func choiceReason() async throws {
        var choice: Question?
        for _ in 0..<40 {
            let q = try await Self.engine.nextQuestion(.pool(topic: "fractions", level: 1))
            if !q.isTyped { choice = q; break }
        }
        let q = try #require(choice)
        let wrong = (q.correctIndex + 1) % max(q.choices.count, 1)
        let v = try await Self.engine.grade(question: q, answer: .choice(wrong))
        #expect(!v.correct)
        #expect(QReasonClassifier.classifyLocally(question: q, answer: .choice(wrong),
                                                  verdict: v) == .wrongOption)
    }

    enum QChipTestError: Error { case noUnitQuestion(String) }
}

// =============================================================================

@Suite("The chip row is deterministic, distinct and never offers two right answers")
struct QUnitChipRowTests {

    @Test("three chips, one declared, two distractors, no duplicates",
          arguments: ["cm", "cm²", "m", "km", "kg", "g", "l", "ml", "$", "%",
                      "min", "pages", "buns", "cubes", "cm³", "wibble"])
    func shape(_ unit: String) {
        let chips = QUnits.chips(declared: unit, questionID: "q1")
        #expect(chips.count == 3)
        #expect(Set(chips.map(QUnits.normalise)).count == 3, "no duplicate chips")
        #expect(chips.filter { QUnits.accepts($0, declared: unit) }.count == 1,
                "exactly one chip is the right answer")
    }

    @Test("the order is stable for a question and varies between questions")
    func ordering() {
        let a = QUnits.chips(declared: "cm²", questionID: "q1")
        #expect(a == QUnits.chips(declared: "cm²", questionID: "q1"))
        let orders = Set((1...60).map {
            QUnits.chips(declared: "cm²", questionID: "q\($0)").joined(separator: "|")
        })
        #expect(orders.count >= 2, "the declared unit is not always in the same seat")
    }

    /// The brief's own example.
    @Test("an area item offers cm / cm2 / m")
    func areaExample() {
        let chips = Set(QUnits.chips(declared: "cm²", questionID: "q1").map(QUnits.normalise))
        #expect(chips == ["cm2", "cm", "m"])
    }

    @Test("a set of equivalents arrives comma-joined and every member is accepted")
    func equivalents() {
        // What `String(['cm³','ml'])` produces in tools/engine/api.js once
        // feat/unit-sweep lands.
        let declared = "cm³,ml"
        #expect(QUnits.canonical(declared) == "cm³")
        #expect(QUnits.accepts("cm³", declared: declared))
        #expect(QUnits.accepts("ml", declared: declared))
        #expect(QUnits.accepts("cm3", declared: declared))   // the alias spelling
        #expect(!QUnits.accepts("kg", declared: declared))
        let chips = QUnits.chips(declared: declared, questionID: "q1")
        #expect(chips.count == 3)
        #expect(chips.filter { QUnits.accepts($0, declared: declared) }.count == 1,
                "a distractor may never be one of the accepted equivalents")
    }

    @Test("every unit the engine declares has a teaching sentence")
    func everyUnitTeaches() {
        // Measured off the shipped bundle: the units live generators declare.
        for unit in ["cm", "cm²", "kg", "km", "l", "m", "g", "ml",
                     "pages", "min", "$", "buns"] {
            #expect(QUnits.unitClass(unit) != nil, "\(unit) has no class")
            #expect(!QUnits.why(for: unit).isEmpty)
        }
        // And an unknown one still says something rather than nothing.
        #expect(!QUnits.why(for: "wibble").isEmpty)
    }
}

// =============================================================================

@Suite("Fractions and decimals reach the grader through the keypad", .serialized)
struct QFractionKeypadTests {

    static let engine = try! JSQuestionEngine()

    /// Type a string through the real keypad under the real topic policy.
    static func keypad(_ text: String, topic: String) -> QTypedEntry {
        let policy = QKeypadPolicy.forTopic(topic)
        var e = QTypedEntry()
        for ch in text {
            switch ch {
            case "0"..."9": e.press(.digit(Int(String(ch))!), policy: policy)
            case ".":       e.press(.decimalPoint, policy: policy)
            case "/":       e.press(.slash, policy: policy)
            case "-":       e.press(.minus, policy: policy)
            default:        break
            }
        }
        return e
    }

    /// `p5fractions` is the one topic whose answers a keypad without a slash
    /// could not express. The key's `fracAnswer` is the fraction the child is
    /// expected to write; this types it and hands it to the real grader.
    @Test("a fraction answer typed on the keypad grades correct")
    func fractionsGrade() async throws {
        var checked = 0
        for _ in 0..<60 where checked < 8 {
            let q = try await Self.engine.nextQuestion(.pool(topic: "p5fractions", level: 2))
            guard q.isTyped, let frac = q.key["fracAnswer"]?.arrayValue,
                  frac.count == 2,
                  let n = frac[0].doubleValue, let d = frac[1].doubleValue else { continue }
            let text = "\(JSONValue.numberText(n))/\(JSONValue.numberText(d))"
            let entry = Self.keypad(text, topic: "p5fractions")
            #expect(entry.digits == text,
                    "the p5fractions keypad could not type \(text)")
            let v = try await Self.engine.grade(question: q, answer: entry.answer)
            #expect(v.correct, "the grader rejected \(entry.submission)")
            checked += 1
        }
        #expect(checked >= 4, "no fraction-answer question was drawn")
    }

    /// The money path, which is what `p3money`'s decimal key exists for. The
    /// `parseInt("4.75") === 4` bug is the reason this is a gate and not a note.
    @Test("a money answer typed on the keypad keeps its cents")
    func moneyKeepsCents() async throws {
        var checked = 0
        for _ in 0..<60 where checked < 8 {
            let q = try await Self.engine.nextQuestion(.pool(topic: "p3money", level: 1))
            guard q.isTyped, case .typed(let text) = q.selfAnswer else { continue }
            let entry = Self.keypad(text, topic: "p3money")
            #expect(entry.digits == text)
            let v = try await Self.engine.grade(question: q, answer: entry.answer)
            #expect(v.correct, "the grader rejected \(entry.submission)")
            checked += 1
        }
        #expect(checked >= 4)
    }

    /// A whole-number topic's keypad has no point at all, so the shape a child
    /// could type is exactly the shape the answer has.
    @Test("a whole-number topic's keypad cannot produce a malformed answer")
    func wholeNumbersOnly() {
        let e = Self.keypad("1.5/2", topic: "p4area")
        #expect(e.digits == "152")
        #expect(QKeypadPolicy.forTopic("p4area").typableCharacters == Set("0123456789"))
    }
}
