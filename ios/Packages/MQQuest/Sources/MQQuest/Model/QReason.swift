import Foundation
import MQContent

/// Why an answer was not accepted, in words a child's feedback card can use.
///
/// **Nothing in this file grades anything.** Grading semantics live in
/// `js/core.js` and are re-derived nowhere in Swift - that is the bridge lane's
/// standing rule and breaking it would put two graders in the app. What this file
/// does is CLASSIFY a verdict the engine already returned, and where the engine
/// on this branch cannot tell two failures apart it asks the engine a second
/// question rather than answering one itself.
public enum QReason: Equatable, Sendable {
    case correct
    /// The number was right; the unit was not. `expected` is what the question
    /// declared, `got` is what the grader parsed off the child's answer.
    case wrongUnit(expected: String, got: String)
    case wrongValue
    case notANumber
    case empty
    case wrongOption
    case noAnswerGiven
    /// An engine reason this build does not model, kept intact.
    case other(String)

    public var isWrongUnit: Bool { if case .wrongUnit = self { return true }; return false }

    /// The token as it would appear on `Verdict.reason` once the unit sweep's
    /// split reason lands. Used by the driver's transcript so a run recorded on
    /// this branch is comparable with one recorded after the merge.
    public var token: String {
        switch self {
        case .correct: return "correct"
        case .wrongUnit: return "wrong-unit"
        case .wrongValue: return "wrong-value"
        case .notANumber: return "not a number"
        case .empty: return "empty"
        case .wrongOption: return "wrong option"
        case .noAnswerGiven: return "no answer given"
        case .other(let s): return s
        }
    }
}

/// Turns a `Verdict` into a `QReason`.
///
/// # Why this exists at all
///
/// The unit sweep lane split the grader's single `'wrong value or unit'` string
/// into `wrong-unit` and `wrong-value` and put the result on `verdict.reason`
/// (see the vault note *Unit Sweep Lane - 2026-09-07*, wound W1). That work sits
/// on `lane/unit-sweep` / `feat/unit-sweep`. **This lane branches from
/// `feat/ios-phase1`, which does not carry it**, so on the engine bundle MQQuest
/// actually loads today the reason for both failures is the single string
/// `"wrong value or unit"`:
///
/// ```
/// "3 kg" -> { correct:false, reason:"wrong value or unit",
///             parsed:{ ok:true, value:3, unit:"kg" } }
/// ```
///
/// A child who typed the right number under the wrong unit therefore cannot be
/// told so - which is exactly the finding the unit sweep was raised to fix, and
/// the teaching card the brief asks this screen to show.
///
/// # The rule, in order
///
/// 1. **A machine reason wins.** `wrong-unit` / `wrong-value` are honoured the
///    moment the engine starts emitting them, so the day the sweep merges this
///    classifier stops doing any work and nothing above it changes.
/// 2. **Otherwise, ask the engine again.** For a typed answer that carried a unit
///    and was rejected, re-grade the SAME answer with the unit removed. If the
///    bare number grades correct, the unit was the whole problem. The engine is
///    still the only grader; Swift only chose which two questions to ask it.
/// 3. Anything else keeps the engine's own words.
///
/// Step 2 costs one extra bridge crossing per wrong typed answer with a unit -
/// nothing, next to the four crossings a question already takes - and it is
/// skipped entirely when the child typed a bare number (there is nothing to
/// strip, so the two gradings would be identical).
public enum QReasonClassifier {

    /// The tokens the split reason uses once the unit sweep lands.
    static let wrongUnitToken = "wrong-unit"
    static let wrongValueToken = "wrong-value"
    /// What the grader says today when it cannot tell the two apart.
    static let ambiguousToken = "wrong value or unit"

    /// Classify without asking the engine anything. Returns `nil` when the answer
    /// is ambiguous and step 2 is needed.
    public static func classifyLocally(question: Question, answer: Answer,
                                       verdict: Verdict) -> QReason? {
        if verdict.correct { return .correct }
        guard let raw = verdict.reason?.trimmingCharacters(in: .whitespaces),
              !raw.isEmpty else {
            return verdict.kind == .choice ? .wrongOption : .wrongValue
        }
        switch raw {
        case wrongUnitToken:
            return .wrongUnit(expected: question.unit,
                              got: verdict.parsed?.unit ?? "")
        case wrongValueToken:
            return .wrongValue
        case "wrong option":
            return .wrongOption
        case "no answer given", "no such choice":
            return .noAnswerGiven
        case "empty":
            return .empty
        case "not a number", "unparsed":
            return .notANumber
        case ambiguousToken:
            // The only case that needs a second question, and only when there is
            // a unit to strip and a value that parsed.
            guard case .typed = answer,
                  let parsed = verdict.parsed, parsed.ok,
                  !parsed.unit.isEmpty else { return .wrongValue }
            return nil
        default:
            return .other(raw)
        }
    }

    /// Full classification. `regradeBare` re-grades the child's answer with the
    /// unit taken off; it is the engine, handed in, so this stays testable
    /// against a fake source and stays honest against the real one.
    public static func classify(question: Question, answer: Answer, verdict: Verdict,
                                regradeBare: @Sendable (String) async throws -> Verdict) async
        -> QReason {
        if let local = classifyLocally(question: question, answer: answer, verdict: verdict) {
            return local
        }
        // Ambiguous, typed, parsed a value, carried a unit.
        guard case .typed(let raw) = answer, let parsed = verdict.parsed else {
            return .wrongValue
        }
        let bare = bareNumber(from: raw, parsedUnit: parsed.unit)
        guard bare != raw.trimmingCharacters(in: .whitespaces), !bare.isEmpty else {
            return .wrongValue
        }
        guard let second = try? await regradeBare(bare) else { return .wrongValue }
        return second.correct
            ? .wrongUnit(expected: question.unit, got: parsed.unit)
            : .wrongValue
    }

    /// The child's answer with the unit token the grader parsed removed.
    ///
    /// Deliberately NOT a number parser: it removes the exact substring the
    /// engine said it read as a unit, from either end, and trims. If that leaves
    /// something the grader cannot read, step 2 simply returns `wrongValue` -
    /// which is the same answer it would have given anyway.
    public static func bareNumber(from raw: String, parsedUnit: String) -> String {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !parsedUnit.isEmpty else { return s }
        let u = parsedUnit
        if s.lowercased().hasSuffix(u.lowercased()) {
            s = String(s.dropLast(u.count))
        } else if s.lowercased().hasPrefix(u.lowercased()) {
            s = String(s.dropFirst(u.count))
        }
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
