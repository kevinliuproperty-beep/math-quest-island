import Foundation
import MQContent

// =============================================================================
// THE TYPED-ANSWER MODEL, SHARED BY EVERY MODE
//
// This was `MQQuest.QTypedEntry` until the rehearsal fix pass of 2026-09-07. It
// moved for the same reason `QFigureView` became `MQDesign.MQFigures` an hour
// earlier: a SECOND mode needed it, and a mode may not depend on a mode.
//
// The Phase 1 dress rehearsal drove one real 150-item Patchwerk run and measured
// **50 typed items served into a screen with no keypad** - four blank planks,
// every one scored wrong, every one resetting the stack multiplier, best stacks
// 4 against a cap of 10. `MQPatchwerk` could not reach a keypad because the whole
// typed surface lived inside `MQQuest`.
//
// The web has the identical feed and does not have this problem, because
// `js/app.js` has ONE question surface for every mode: `nextQuestion()` renders
// the typed input when `Q.typed` and choice buttons otherwise, and every mode's
// feed goes through `nextQuestion()`. `js/modes/patchwerk.js` renders no question
// of its own at all - it calls `ctx.nextQuestion()`. Mirroring that arrangement
// is what this move is.
//
// `MQQuest` keeps `typealias QTypedEntry = MQTypedEntry` and
// `typealias QKeypadPolicy = MQKeypadPolicy`, so the battle board, the driver and
// their suites read exactly as they did.
//
// **There is one submission-string builder in this tree** (`submission`, below)
// and both modes grade through it. Duplicating it for Patchwerk was the rejected
// alternative: two spellings of `"<number> <unit>"` is two graders.
// =============================================================================

/// Which non-digit keys a topic's keypad shows.
///
/// **Derived from the TOPIC, never from the question.** A keypad that grew a `/`
/// only on the questions whose answer is a fraction would be telling the child
/// the answer's shape before they had thought about it - a leak worth more than
/// the tidiness it buys. So the policy is a property of the island you are
/// standing on, and every question on that island gets the same keys.
///
/// The table is MEASURED, not guessed: every one of the engine's 250 generator
/// refs was drawn 25 times off the shipped bundle and its typed answers read.
/// `MQKeypadPolicyTests` re-runs that measurement against the live engine and
/// fails if a topic starts producing an answer its policy cannot type - which is
/// what makes this table maintainable instead of a hostage to a future generator.
public struct MQKeypadPolicy: Sendable, Equatable {
    /// `.` - decimal answers.
    public var decimal: Bool
    /// `/` - fraction answers.
    public var fraction: Bool
    /// `-` - negative answers. **No live topic needs this today**; the key exists
    /// because P6 integers are on the map as "Coming soon" and the day that node
    /// lights up the policy is a one-line change rather than a component change.
    public var minus: Bool

    public init(decimal: Bool = false, fraction: Bool = false, minus: Bool = false) {
        self.decimal = decimal; self.fraction = fraction; self.minus = minus
    }

    public static let digitsOnly = MQKeypadPolicy()

    /// **Every one of the engine's 28 topics**, measured off the shipped bundle:
    /// all 250 generator refs x 25 draws, `q.key` read on every typed result.
    ///
    /// | key | topics |
    /// |---|---|
    /// | `.` | `p3money` `p5fractions` `p5decimals` `p5rate` |
    /// | `/` | `p5fractions` |
    /// | `-` | none - no live topic has a negative answer |
    ///
    /// The other nine typed topics (`p3divide` `heuristics` `p5numbers`
    /// `p5percent` `p5triangle` `p5volume` `p4ops` `p4fractions` `p4area`) answer
    /// in whole numbers, and the remaining fifteen are choice-only, so their
    /// keypad is never drawn at all.
    ///
    /// **The table is exhaustive on purpose.** An unmeasured topic falling back
    /// to "decimal, why not" put a dead `.` key on the P4 area board - visible in
    /// the very first driven PNG - which is one more thing on the glass than the
    /// question needs. `MQKeypadPolicyTests` asserts every live topic has a row
    /// here AND that no row enables a key its topic never produces.
    public static let byTopic: [String: MQKeypadPolicy] = [
        // typed, decimals
        "p3money":     MQKeypadPolicy(decimal: true),
        "p5decimals":  MQKeypadPolicy(decimal: true),
        "p5rate":      MQKeypadPolicy(decimal: true),
        // typed, decimals and fractions
        "p5fractions": MQKeypadPolicy(decimal: true, fraction: true),
        // typed, whole numbers
        "p3divide":    .digitsOnly,
        "heuristics":  .digitsOnly,
        "p5numbers":   .digitsOnly,
        "p5percent":   .digitsOnly,
        "p5triangle":  .digitsOnly,
        "p5volume":    .digitsOnly,
        "p4ops":       .digitsOnly,
        "p4fractions": .digitsOnly,
        "p4area":      .digitsOnly,
        // choice-only: the keypad is never drawn, but a row is kept so the
        // "every topic is measured" assertion is a real assertion.
        "p2":          .digitsOnly,
        "p3numbers":   .digitsOnly,
        "tables":      .digitsOnly,
        "fractions":   .digitsOnly,
        "p3measure":   .digitsOnly,
        "p3bargraph":  .digitsOnly,
        "geometry":    .digitsOnly,
        "p4numbers":   .digitsOnly,
        "p4factors":   .digitsOnly,
        "decimals":    .digitsOnly,
        "p4data":      .digitsOnly,
        "p4pie":       .digitsOnly,
        "p4angles":    .digitsOnly,
        "angles":      .digitsOnly,
        "p5shapes":    .digitsOnly
    ]

    /// A topic this build has never seen gets the decimal point and nothing else:
    /// a missing `.` marks a right answer wrong, while an unused `.` costs one
    /// key of clutter. The asymmetry decides the default - and the exhaustive
    /// table above means no shipped topic ever reaches it.
    public static let unmeasuredDefault = MQKeypadPolicy(decimal: true)

    public static func forTopic(_ topic: String) -> MQKeypadPolicy {
        byTopic[topic] ?? unmeasuredDefault
    }

    /// The characters this policy can produce, digits included.
    public var typableCharacters: Set<Character> {
        var s = Set<Character>("0123456789")
        if decimal { s.insert(".") }
        if fraction { s.insert("/") }
        if minus { s.insert("-") }
        return s
    }
}

/// What the child has entered, as a value.
///
/// Two independent things: the DIGITS they tapped, and the UNIT CHIP they chose
/// (or did not). They are kept apart right up to `submission`, because the whole
/// point of the chip row is that the unit is a separate decision the child makes
/// deliberately - and because the transcript has to record which of the two was
/// wrong.
public struct MQTypedEntry: Equatable, Sendable {
    /// Exactly the characters the keypad produced, in order. Never normalised:
    /// what the child sees in the slot is what is submitted, the same contract
    /// `js/app.js` has with its `<input>`.
    public private(set) var digits: String = ""
    /// The chip, or `nil` for blank. Blank is the DEFAULT and is a legal answer:
    /// a bare number has always been accepted and still is.
    public var unit: String?

    /// Long enough to type any answer the ENGINE prints, and short enough that a
    /// stuck finger cannot fill the slot. The web field had no limit; a keypad
    /// should.
    ///
    /// It was 16, which truncated the engine's own `answerText`: `p5fractions`
    /// prints `0.8333333333333334` (18 characters) and `0.05555555555555555` (19)
    /// as "the answer", and a child copying the review row could not type it back
    /// (Quest Refutation, wound 3 - the two truncations that slipped through
    /// graded correct by luck, because `fracAnswer`'s 1e-9 tolerance swallows a
    /// 14-decimal truncation). 24 clears the longest `answerText` the island
    /// produces with room to spare, and `MQKeypadPolicyTests` measures that against
    /// the live engine rather than trusting this comment.
    public static let maxDigits = 24

    public init(digits: String = "", unit: String? = nil) {
        self.digits = digits; self.unit = unit
    }

    /// **Exactly what `js/app.js` submits**: `$('typedInput').value.trim()`.
    /// With a chip, the child's number and the unit separated by one space -
    /// which is the `with-unit` spelling the parity corpus records for all 250
    /// generator refs. With no chip, the bare number.
    public var submission: String {
        guard let unit, !unit.isEmpty else { return digits }
        return digits.isEmpty ? "" : "\(digits) \(unit)"
    }

    public var isEmpty: Bool { digits.isEmpty }

    /// Whether `Check` should be live.
    ///
    /// Not just "something was typed". `"3/"` is reachable from the keypad - the
    /// slash needs a trailing digit to be pressed, but nothing needed a digit
    /// AFTER it - and it was submittable, so a child could hand the grader a
    /// half-written fraction, be told "not a number" and take damage for a key
    /// they had not finished pressing (Quest Refutation, wound: a submittable
    /// dead end). Same for a bare `"-"`. The web behaves identically, which makes
    /// it a shared wound rather than a divergence, and the keypad is the surface
    /// that can close it.
    public var isSubmittable: Bool {
        guard let last = digits.last else { return false }
        return last.isNumber || last == "."
    }

    public var answer: Answer { .typed(submission) }

    // MARK: - Keys

    public enum Key: Equatable, Sendable {
        case digit(Int)
        case decimalPoint
        case slash
        case minus
        case backspace
        case clear
    }

    /// Apply a key. Rejections are silent and total - a key that cannot be
    /// pressed is DISABLED in the row rather than accepted and ignored, so this
    /// is the second line of defence, not the first.
    public mutating func press(_ key: Key, policy: MQKeypadPolicy) {
        switch key {
        case .digit(let d):
            guard (0...9).contains(d), digits.count < Self.maxDigits else { return }
            digits.append(Character("\(d)"))
        case .decimalPoint:
            guard policy.decimal, digits.count < Self.maxDigits,
                  Self.canTakeDecimalPoint(digits) else { return }
            digits.append(".")
        case .slash:
            guard policy.fraction, digits.count < Self.maxDigits,
                  Self.canTakeSlash(digits) else { return }
            digits.append("/")
        case .minus:
            guard policy.minus, digits.isEmpty else { return }
            digits.append("-")
        case .backspace:
            if !digits.isEmpty { digits.removeLast() }
        case .clear:
            digits = ""
        }
    }

    public mutating func clearAll() { digits = ""; unit = nil }

    /// One point per number, and a number has to have started. `3.` is legal
    /// (the grader reads it as 3); `.5` is not, because a child typing a leading
    /// point has almost always missed the whole number, and `1/2.3` is not,
    /// because the denominator already has one.
    public static func canTakeDecimalPoint(_ s: String) -> Bool {
        guard let last = s.last, last.isNumber || last == "/" else { return false }
        let segment = s.split(separator: "/", omittingEmptySubsequences: false).last ?? ""
        return !segment.contains(".")
    }

    /// One slash, never leading, never straight after a point. `1 1/2` (a mixed
    /// number) is not reachable from this keypad: it needs a space, and the space
    /// is not a key. Recorded as an open item - `p5fractions` answers in improper
    /// and reduced fractions, and the sample of 150 typed draws produced no mixed
    /// number, but the generator file is the authority and it has not been read
    /// line by line.
    public static func canTakeSlash(_ s: String) -> Bool {
        guard let last = s.last, last.isNumber else { return false }
        return !s.contains("/")
    }

    /// Whether a key would do anything, so the row can disable it instead of
    /// eating the tap. A dead-looking key that swallows a press is how a child
    /// learns the app is broken.
    public func isEnabled(_ key: Key, policy: MQKeypadPolicy) -> Bool {
        var copy = self
        copy.press(key, policy: policy)
        switch key {
        case .backspace, .clear: return !digits.isEmpty
        default: return copy.digits != digits
        }
    }
}
