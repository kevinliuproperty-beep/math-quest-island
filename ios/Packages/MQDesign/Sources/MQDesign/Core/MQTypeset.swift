import Foundation

/// Typesetting rules for maths prose. One rule so far, and it is not cosmetic.
///
/// **A number never ends a line with its unit on the next one.**
///
///     The rectangle is 14                    The rectangle is
///     cm long and 9 cm wide.        ->       14 cm long and 9 cm wide.
///
/// A child reading "14" at the end of a line has to hold the number, jump the
/// line, and only then find out it was centimetres. That is a real cost in a
/// timed mode and it is a pure typesetting failure -- the quantity "14 cm" is
/// ONE token that the line breaker treats as two. It bit the battle line at
/// three of the ten matrix widths before this existed, and it will bite again
/// every time a narrower device is added, so the fix lives in the type system
/// rather than in any one screen.
///
/// The transform is a plain character substitution -- U+00A0 NO-BREAK SPACE
/// between the numeral and its unit -- which every text engine on both
/// platforms already honours. No attributed strings, no per-screen line-break
/// tuning, and it survives `minimumScaleFactor` and every font size.
///
/// **Why an explicit unit vocabulary and not `\d+\s+\w+`.** Gluing every word
/// after a number would bind "8 equal pieces" and "5 marbles", which are not
/// quantities and which the breaker is entitled to split. The list below is the
/// set the shipped P3-P5 generators actually emit (counted across
/// `js/topics/*.js`), plus their plurals and the symbols.
public enum MQTypeset {

    /// Units the engine emits. Matched case-sensitively for the symbols (`m` is
    /// metres, `M` is not a unit) and case-insensitively for the spelled words.
    static let symbolUnits: Set<String> = [
        "mm", "cm", "m", "km",
        "mm2", "cm2", "m2", "km2", "mm²", "cm²", "m²", "km²",
        "cm3", "m3", "cm³", "m³",
        "mg", "g", "kg", "ml", "mL", "l", "L",
        "s", "h", "min", "hr", "hrs",
        "%", "°", "¢"
    ]

    static let wordUnits: Set<String> = [
        "millimetre", "millimetres", "centimetre", "centimetres",
        "metre", "metres", "kilometre", "kilometres",
        "gram", "grams", "kilogram", "kilograms",
        "millilitre", "millilitres", "litre", "litres",
        "second", "seconds", "minute", "minutes", "hour", "hours",
        "day", "days", "week", "weeks", "month", "months", "year", "years",
        "cent", "cents", "dollar", "dollars",
        "degree", "degrees",
        "unit", "units", "square", "squares"
    ]

    /// U+00A0.
    public static let nbsp: Character = "\u{00A0}"

    /// Bind every `<number> <unit>` pair in `text` with a no-break space.
    ///
    /// Deliberately not a `NSRegularExpression`: this runs on every question the
    /// child ever sees, including inside Patchwerk's timed loop, and a scalar
    /// walk with no allocation beyond the result is both faster and has no
    /// locale behaviour to be surprised by.
    public static func bindUnits(_ text: String) -> String {
        let words = text.split(separator: " ", omittingEmptySubsequences: false)
        guard words.count > 1 else { return text }

        var out = String()
        out.reserveCapacity(text.count)
        for (i, word) in words.enumerated() {
            if i > 0 {
                let previous = words[i - 1]
                out.append(endsInNumeral(previous) && isUnit(word) ? nbsp : " ")
            }
            out.append(contentsOf: word)
        }
        return out
    }

    /// "14", "9.5", "36cm?" -> the numeral test only looks at the tail, so a
    /// leading "$" or "(" does not disqualify it.
    static func endsInNumeral(_ s: Substring) -> Bool {
        guard let last = s.last else { return false }
        return last.isNumber
    }

    /// A unit, possibly with trailing punctuation the sentence owns rather than
    /// the unit: "9 cm." and "9 cm," and "9 cm?" all bind.
    static func isUnit(_ s: Substring) -> Bool {
        var core = s
        while let last = core.last, last == "." || last == "," || last == "?"
                || last == "!" || last == ":" || last == ";" || last == ")" {
            core = core.dropLast()
        }
        guard !core.isEmpty else { return false }
        if symbolUnits.contains(String(core)) { return true }
        return wordUnits.contains(String(core).lowercased())
    }
}

public extension String {
    /// Sugar for the one place this matters: `Text(scene.question.unitBound)`.
    var mqUnitBound: String { MQTypeset.bindUnits(self) }
}
