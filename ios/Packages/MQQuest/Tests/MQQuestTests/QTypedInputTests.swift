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
        QTestFonts.ensure()
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
        for _ in 0..<60 { e.press(.digit(7), policy: .digitsOnly) }
        #expect(e.digits.count == QTypedEntry.maxDigits)
    }

    /// **The cap may not be shorter than the engine's own answer.**
    ///
    /// It was 16, and `p5fractions` prints `0.05555555555555555` (19 characters)
    /// as "the answer" on the card and in the review row - a string the child
    /// could read and could not type back (Quest Refutation, wound 3). Measured
    /// against the live engine rather than asserted against a comment.
    @Test("no answerText the engine prints is longer than the keypad's cap")
    func capClearsTheEngine() async throws {
        let engine = try JSQuestionEngine()
        var longest = ""
        var typedSeen = 0
        for topic in ["p5fractions", "p5decimals", "p5numbers", "p3money", "p5rate"] {
            for level in [1, 2, 3] {
                for _ in 0..<40 {
                    let q = try await engine.nextQuestion(.pool(topic: topic, level: level))
                    guard q.isTyped else { continue }
                    typedSeen += 1
                    let text = q.answerTextPlain.trimmingCharacters(in: .whitespaces)
                    // Only the number part is typed; the unit comes off a chip.
                    let number = text.split(separator: " ").first.map(String.init) ?? text
                    if number.count > longest.count { longest = number }
                }
            }
        }
        #expect(typedSeen > 100, "not enough typed draws to measure a cap against")
        #expect(longest.count <= QTypedEntry.maxDigits,
                "the engine prints \"\(longest)\" (\(longest.count) chars) and the keypad caps at \(QTypedEntry.maxDigits)")
    }

    /// A trailing slash is reachable (`3` then `/`) and used to be submittable, so
    /// a child could hand the grader a half-written fraction and take damage for a
    /// key they had not finished pressing.
    @Test("a half-written fraction is not submittable")
    func halfWrittenFractionIsNotSubmittable() {
        let p = QKeypadPolicy(decimal: true, fraction: true, minus: true)
        #expect(!Self.typed("3/", policy: p).isSubmittable)
        #expect(Self.typed("3/4", policy: p).isSubmittable)
        #expect(Self.typed("3", policy: p).isSubmittable)
        #expect(Self.typed("3.", policy: p).isSubmittable)   // the grader reads 3
        #expect(!Self.typed("-", policy: p).isSubmittable)
        #expect(!QTypedEntry().isSubmittable)
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

    /// **The topics this suite runs on, and why it is not just `p4area`.**
    ///
    /// It WAS just `p4area` - the default argument of `typedWithUnit` - and
    /// `p4area` is the one live topic whose units (`cm`, `cm²`) were immune to
    /// the K2 suffix-eat. Pointed at `p5decimals` (which declares `m` 82 times and
    /// `l` 37 times per 268 draws) the suite would have gone red in one second
    /// (Quest Refutation K2). `p5volume` is here because it is the topic that
    /// declares ARRAYS.
    static let topics = ["p4area", "p5decimals", "p5rate", "p5volume", "p3money"]

    /// A typed question that declares a unit, drawn from the live engine.
    static func typedWithUnit(topic: String = "p4area") async throws -> Question {
        for _ in 0..<80 {
            for level in [1, 2, 3] {
                let q = try await engine.nextQuestion(.pool(topic: topic, level: level))
                if q.isTyped && !q.acceptedUnits.isEmpty { return q }
            }
        }
        throw QChipTestError.noUnitQuestion(topic)
    }

    static func bare(_ q: Question) -> String {
        if case .typed(let s) = q.selfAnswer { return s }
        return q.answerTextPlain
    }

    @Test("the declared unit is accepted, every distractor is rejected, blank is accepted",
          arguments: QUnitChipBridgeTests.topics)
    func chipsGradeAsDesigned(_ topic: String) async throws {
        var checked = 0
        for _ in 0..<12 {
            let q = try await Self.typedWithUnit(topic: topic)
            let number = Self.bare(q)
            let accepted = q.acceptedUnits
            let chips = QUnits.chips(q)
            #expect(chips.count == 3, "three chips: the unit and two distractors")
            #expect(chips.filter { QUnits.accepts($0, in: accepted) }.count == 1,
                    "exactly one chip is a right answer on \(topic) (\(accepted))")

            // blank
            let blank = try await Self.engine.grade(question: q, answer: .typed(number))
            #expect(blank.correct, "a bare number has always been accepted: \(number)")

            for chip in chips {
                // K7: one chip is one unit token, never a joined set.
                #expect(!chip.contains(","), "a chip carried a joined unit set: \(chip)")
                let entry = QTypedEntry(digits: number, unit: chip)
                let v = try await Self.engine.grade(question: q, answer: entry.answer)
                if QUnits.accepts(chip, in: accepted) {
                    #expect(v.correct,
                            "chip \(chip) is an accepted unit of \(accepted) but was rejected on \"\(entry.submission)\"")
                } else {
                    #expect(!v.correct,
                            "distractor \(chip) was ACCEPTED on \"\(entry.submission)\" (accepted \(accepted))")
                    #expect(v.parsed?.unit.isEmpty == false,
                            "the grader read the chip \(chip) as a unit on \"\(entry.submission)\" (declared \(accepted), reason \(v.reason ?? "nil"))")
                    // K2: and it said WHICH half was wrong, so the card can lead.
                    #expect(v.reasonKind == .wrongUnit,
                            "\"\(entry.submission)\" on \(accepted) came back \(v.reason ?? "nil"), not wrong-unit")
                }
                checked += 1
            }
        }
        #expect(checked == 36)
    }

    /// **K3 and K7, on the two topics that produce them.**
    @Test("cm3 is never offered on an ml question and the correct chip grades correct",
          arguments: ["p5volume", "p5decimals"])
    func equivalentUnitsAreNeverDistractors(_ topic: String) async throws {
        var seenVolume = 0
        var seenArray = 0
        for _ in 0..<60 {
            for level in [1, 2, 3] {
                let q = try await Self.engine.nextQuestion(.pool(topic: topic, level: level))
                guard q.isTyped, !q.acceptedUnits.isEmpty else { continue }
                let accepted = q.acceptedUnits
                let chips = QUnits.chips(q)
                if q.units.map({ $0.count > 1 }) == true { seenArray += 1 }
                let norm = accepted.map(QUnits.normalise)
                if norm.contains("ml") || norm.contains("cm3") || norm.contains("l") {
                    seenVolume += 1
                    for chip in chips where !QUnits.accepts(chip, in: accepted) {
                        #expect(!QUnits.namesTheSameQuantity(chip, as: accepted),
                                "\(chip) names the same quantity as \(accepted) and was offered as a WRONG unit on \(topic)")
                        // And the engine agrees it is wrong - a distractor that
                        // graded correct would be the other half of the same bug.
                        let v = try await Self.engine.grade(
                            question: q,
                            answer: .typed(QTypedEntry(digits: Self.bare(q), unit: chip).submission))
                        #expect(!v.correct,
                                "distractor \(chip) GRADED CORRECT on \(accepted)")
                    }
                }
                // Every accepted member grades correct through the real bridge.
                for unit in accepted {
                    let v = try await Self.engine.grade(
                        question: q,
                        answer: .typed(QTypedEntry(digits: Self.bare(q), unit: unit).submission))
                    #expect(v.correct,
                            "\(unit) is declared on \(topic) and the bridge rejected \"\(Self.bare(q)) \(unit)\"")
                }
            }
        }
        #expect(seenVolume > 0, "no volume-unit question was drawn from \(topic)")
        if topic == "p5volume" {
            #expect(seenArray > 0, "p5volume declares arrays; none was drawn")
        }
    }

    @Test("a distractor chip surfaces as wrong-unit, a wrong number as wrong-value",
          arguments: QUnitChipBridgeTests.topics)
    func reasonsSplit(_ topic: String) async throws {
        let q = try await Self.typedWithUnit(topic: topic)
        let number = Self.bare(q)
        let accepted = q.acceptedUnits
        let chips = QUnits.chips(q)
        let bad = try #require(chips.first { !QUnits.accepts($0, in: accepted) })
        let good = try #require(chips.first { QUnits.accepts($0, in: accepted) })

        // right number, wrong unit. The engine says so ITSELF now - the two-step
        // re-grade this classifier used to do is deleted.
        let wrongUnitAnswer = Answer.typed(QTypedEntry(digits: number, unit: bad).submission)
        let v1 = try await Self.engine.grade(question: q, answer: wrongUnitAnswer)
        #expect(!v1.correct)
        #expect(v1.reasonKind == .wrongUnit,
                "\(topic) \(accepted) + \(bad): reason was \(v1.reason ?? "nil")")
        let r1 = QReasonClassifier.classify(question: q, answer: wrongUnitAnswer, verdict: v1)
        #expect(r1.isWrongUnit)
        #expect(r1.token == "wrong-unit")
        #expect(r1 == .wrongUnit(expected: QUnits.canonical(q), got: v1.parsed?.unit ?? ""))

        // wrong number, right unit
        let wrongValue = QDriver.wrongTypedText(number)
        let wrongValueAnswer = Answer.typed(
            QTypedEntry(digits: wrongValue, unit: good).submission)
        let v2 = try await Self.engine.grade(question: q, answer: wrongValueAnswer)
        #expect(!v2.correct)
        #expect(QReasonClassifier.classify(question: q, answer: wrongValueAnswer,
                                           verdict: v2) == .wrongValue)

        // wrong number AND wrong unit is a wrong VALUE: the number is the lesson.
        let bothWrong = Answer.typed(QTypedEntry(digits: wrongValue, unit: bad).submission)
        let v3 = try await Self.engine.grade(question: q, answer: bothWrong)
        #expect(QReasonClassifier.classify(question: q, answer: bothWrong,
                                           verdict: v3) == .wrongValue)
    }

    @Test("the classifier is a mapping of the engine's reason and nothing else")
    func mapsTheEnginesReason() {
        let q = QFixtures.question(unit: "cm²")
        let split = Verdict(correct: false, kind: .typed, questionId: "q1",
                            expectedIndex: -1, expectedText: "24 cm²", chosenIndex: -1,
                            reason: "wrong-unit",
                            parsed: Verdict.Parsed(ok: true, value: 24, unit: "cm",
                                                   frac: nil, reason: nil),
                            typedRaw: "24 cm")
        #expect(QReasonClassifier.classify(question: q, answer: .typed("24 cm"),
                                           verdict: split)
                == .wrongUnit(expected: "cm²", got: "cm"))
        let value = Verdict(correct: false, kind: .typed, questionId: "q1",
                            expectedIndex: -1, expectedText: "24 cm²", chosenIndex: -1,
                            reason: "wrong-value", parsed: nil, typedRaw: "25")
        #expect(QReasonClassifier.classify(question: q, answer: .typed("25"),
                                           verdict: value) == .wrongValue)
        // An engine word this build has never heard of keeps its text and never
        // claims the number was right.
        let unknown = Verdict(correct: false, kind: .typed, questionId: "q1",
                              expectedIndex: -1, expectedText: "24 cm²", chosenIndex: -1,
                              reason: "wrong-flavour-of-blue", parsed: nil, typedRaw: "25")
        let r = QReasonClassifier.classify(question: q, answer: .typed("25"),
                                           verdict: unknown)
        #expect(r == .other("wrong-flavour-of-blue"))
        #expect(!r.isWrongUnit)
    }

    @Test("empty and not-a-number keep the engine's own words")
    func parseFailures() async throws {
        let q = try await Self.typedWithUnit()
        let empty = try await Self.engine.grade(question: q, answer: .typed(""))
        #expect(QReasonClassifier.classify(question: q, answer: .typed(""),
                                           verdict: empty) == .empty)
        let nan = try await Self.engine.grade(question: q, answer: .typed("abc"))
        #expect(QReasonClassifier.classify(question: q, answer: .typed("abc"),
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
        #expect(QReasonClassifier.classify(question: q, answer: .choice(wrong),
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
        let chips = QUnits.chips(accepted: [unit], questionID: "q1")
        #expect(chips.count == 3)
        #expect(Set(chips.map(QUnits.normalise)).count == 3, "no duplicate chips")
        #expect(chips.filter { QUnits.accepts($0, in: [unit]) }.count == 1,
                "exactly one chip is the right answer")
        // K3: and no distractor may name the same quantity as the declared unit,
        // whether or not the grader happens to accept its spelling.
        #expect(chips.filter { QUnits.namesTheSameQuantity($0, as: [unit]) }.count == 1,
                "a distractor names the same quantity as \(unit): \(chips)")
    }

    @Test("the order is stable for a question and varies between questions")
    func ordering() {
        let a = QUnits.chips(accepted: ["cm²"], questionID: "q1")
        #expect(a == QUnits.chips(accepted: ["cm²"], questionID: "q1"))
        let orders = Set((1...60).map {
            QUnits.chips(accepted: ["cm²"], questionID: "q\($0)").joined(separator: "|")
        })
        #expect(orders.count >= 2, "the declared unit is not always in the same seat")
    }

    /// The brief's own example.
    @Test("an area item offers cm / cm2 / m")
    func areaExample() {
        let chips = Set(QUnits.chips(accepted: ["cm²"], questionID: "q1")
                            .map(QUnits.normalise))
        #expect(chips == ["cm2", "cm", "m"])
    }

    /// **K3/K7, at the table level.** `ml` and `cm³` are the same quantity - the
    /// app's own `p5volume` stem says *"1 ml is exactly 1 cm³"* - and the chip row
    /// used to offer each as the other's wrong answer.
    @Test("ml and cm3 are never each other's distractors, array or not")
    func volumeEquivalents() {
        for accepted in [["ml"], ["cm³"], ["cm³", "ml"], ["ml", "cm³"],
                         ["cubes", "cm³"]] {
            let chips = QUnits.chips(accepted: accepted, questionID: "q1")
            #expect(chips.count == 3)
            let wrong = chips.filter { !QUnits.accepts($0, in: accepted) }
            #expect(wrong.count == 2, "exactly one right chip on \(accepted)")
            for chip in wrong {
                #expect(!QUnits.namesTheSameQuantity(chip, as: accepted),
                        "\(chip) offered as a wrong unit on \(accepted)")
            }
            #expect(QUnits.canonical(QFixtures.question(unit: accepted[0]))
                    == accepted[0])
        }
    }

    /// The latent half of K3: `UNIT_ALIAS` folds `minutes -> min`, so a question
    /// declaring `minutes` offered `min` as a "wrong" chip that the engine grades
    /// CORRECT. `QUnits.normalise` did not know the alias table; it does now.
    @Test("an alias spelling is never offered as a wrong unit")
    func aliasesAreNotDistractors() {
        for (declared, alias) in [("minutes", "min"), ("min", "minutes"),
                                  ("litres", "l"), ("l", "litres"),
                                  ("page", "pages"), ("hours", "h"),
                                  ("cents", "cent"), ("cubes", "cube")] {
            #expect(QUnits.normalise(declared) == QUnits.normalise(alias),
                    "\(declared) and \(alias) are the same unit to the grader")
            #expect(QUnits.accepts(alias, in: [declared]))
            let chips = QUnits.chips(accepted: [declared], questionID: "q1")
            #expect(!chips.contains { $0 != declared && QUnits.accepts($0, in: [declared]) },
                    "\(chips) offers an alias of \(declared) as a distractor")
        }
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
