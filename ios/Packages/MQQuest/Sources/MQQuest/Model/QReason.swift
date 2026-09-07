import Foundation
import MQContent

/// Why an answer was not accepted, in words a child's feedback card can use.
///
/// **Nothing in this file grades anything, and nothing in it DERIVES anything any
/// more either.** Grading semantics live in `js/core.js`; the split between "your
/// number was right" and "your number was wrong" now lives there too, in
/// `MQI.typedRejectReason`, and arrives on `Verdict.reason` as one of two tokens.
/// This type is the presentation shape of that token and nothing else.
public enum QReason: Equatable, Sendable {
    case correct
    /// The number was right; the unit was not. `expected` is what the question
    /// declared (canonical spelling), `got` is what the grader parsed off the
    /// child's answer.
    case wrongUnit(expected: String, got: String)
    case wrongValue
    case notANumber
    case empty
    case wrongOption
    case noAnswerGiven
    /// An engine reason this build does not model, kept intact.
    case other(String)

    public var isWrongUnit: Bool { if case .wrongUnit = self { return true }; return false }

    /// The token as it appears on `Verdict.reason`, so a driven transcript can be
    /// diffed against the engine's own words.
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
/// # What this used to be, and why it is gone
///
/// This lane branched from `feat/ios-phase1`, which did not carry the unit sweep.
/// On that bundle both failures came back as the single string
/// `"wrong value or unit"`, so the classifier had a SECOND step: re-grade the same
/// answer with the unit stripped and call it `wrong-unit` if the bare number
/// passed. Two derivations of one distinction then existed in Swift (this one and
/// `Progress`'s `WrongReason`), which is exactly what the Unit Sweep lane's own
/// note said should die on merge.
///
/// `feat/unit-sweep` is merged. `MQI.typedRejectReason` emits `wrong-unit` /
/// `wrong-value` and `tools/engine/api.js` puts them on `verdict.reason`, so the
/// derivation is **deleted**: this is a pure mapping, it asks the engine nothing,
/// and it costs no extra bridge crossing. An unmodelled reason keeps its text.
///
/// The one thing it still does is fill in the WORDS for the card: `Verdict.Reason`
/// is a case with no payload, and the card needs the declared unit and the unit
/// the grader parsed, which live on the question and on `verdict.parsed`.
public enum QReasonClassifier {

    public static func classify(question: Question, answer: Answer,
                                verdict: Verdict) -> QReason {
        if verdict.correct { return .correct }
        guard let kind = verdict.reasonKind else {
            // No reason at all: the engine said wrong and said nothing else.
            return verdict.kind == .choice ? .wrongOption : .wrongValue
        }
        switch kind {
        case .wrongUnit:
            return .wrongUnit(expected: QUnits.canonical(question),
                              got: verdict.parsed?.unit ?? "")
        case .wrongValue:    return .wrongValue
        case .wrongOption:   return .wrongOption
        case .noAnswer, .noSuchChoice: return .noAnswerGiven
        case .empty:         return .empty
        case .notANumber:    return .notANumber
        case .other(let raw):
            // `"wrong value or unit"` is the PRE-SWEEP string. It cannot come off a
            // bundle this package ships with any more, and if it ever does the card
            // must not silently claim the number was right - so it degrades to the
            // honest half rather than to a guess.
            if raw.trimmingCharacters(in: .whitespaces).isEmpty {
                return verdict.kind == .choice ? .wrongOption : .wrongValue
            }
            return .other(raw)
        }
    }
}
