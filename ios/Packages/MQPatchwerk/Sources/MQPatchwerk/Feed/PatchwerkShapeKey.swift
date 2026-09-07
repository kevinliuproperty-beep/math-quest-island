import Foundation

/// "Is this the same QUESTION SHAPE as the one before it?"
///
/// A mirror of `shapeKey()` in `js/core.js`, which the web feed uses to stop
/// "perimeter, perimeter, perimeter" - the exact complaint that opened the
/// content-quality gate. It masks everything a generator varies (numbers, money,
/// names, quoted strings, markup) so what remains is the STEM TEMPLATE. Two
/// questions with the same key are the same question wearing different digits.
///
/// **Scope, stated plainly:** the parity corpus pins SCORING, not this. This
/// mirror is behaviour-matched by reading the JS and re-implementing the same
/// substitutions in the same order, and it is covered by its own unit tests on
/// hand-written stems - but it is not corpus-verified against node, and a
/// divergence here costs a slightly different question order, never a different
/// damage number. That is why it is allowed to live on this side of the wall at
/// all.
enum PatchwerkShapeKey {

    /// The web's `SHAPE_STOP`: capitalised words that are ordinary sentence
    /// words, not proper nouns. Over-masking is safe (it makes the no-repeat
    /// guard stricter); under-masking is the failure mode.
    static let stopWords: Set<String> = Set("""
    A An The What Which How If In On At Of For From To And Or But So Then When Where Why Who \
    Find Work Round Write Express Simplify Solve Calculate Convert Complete Give Use Look Read Add Subtract Multiply \
    Divide Count Fill Choose Pick Draw Shade Here There This That It Is Are Was Were Do Does Each Every After Before \
    True False Yes No Total Sum Both All Some One Two Three Four Five Six Seven Eight Nine Ten First Second Third \
    Last Next Same Answer Question Hint Note
    """.split(separator: " ").map(String.init))

    private static func regex(_ pattern: String) -> NSRegularExpression {
        // Every pattern here is a literal in this file. A throw would mean this
        // file does not compile as intended, which is a programmer error, not a
        // runtime condition - hence the force, which the tests exercise.
        try! NSRegularExpression(pattern: pattern, options: [])
    }

    // In the web's order. Order is load-bearing: markup goes before numbers, or
    // the digits inside a tag's attributes would be masked as numbers first.
    private static let fracSpan = regex("<span class=\"frac\">[\\s\\S]*?</span></span>")
    private static let fracPair = regex("<span class=\"n\">\\d+</span><span class=\"d\">\\d+</span>")
    private static let anyTag = regex("<[^>]*>")
    private static let nbsp = regex("&nbsp;")
    private static let money = regex("\\$\\s?[\\d, ]+(\\.\\d+)?")
    private static let number = regex("\\d[\\d, ]*(\\.\\d+)?")
    private static let quoted = regex("\"[^\"]*\"")
    private static let capWord = regex("[A-Z][a-z']+")
    private static let runs = regex("\\s+")

    private static func replacing(_ s: String, _ re: NSRegularExpression, _ with: String) -> String {
        let range = NSRange(s.startIndex..<s.endIndex, in: s)
        return re.stringByReplacingMatches(in: s, options: [], range: range,
                                           withTemplate: with)
    }

    /// The key for one question's stem plus its extra (diagram/table) markup.
    static func key(stem: String, extra: String) -> String {
        var s = stem + " ||X|| " + extra
        s = replacing(s, fracSpan, " [FRAC] ")
        s = replacing(s, fracPair, " [FRAC] ")
        s = replacing(s, anyTag, " [T] ")
        s = replacing(s, nbsp, " ")
        s = replacing(s, money, " [MONEY] ")
        s = replacing(s, number, " [NUM] ")
        s = replacing(s, quoted, " [QUOTED] ")
        // The one substitution that is not a plain template: a capitalised word is
        // a NAME unless it is in the stop list.
        s = maskNames(s)
        s = replacing(s, runs, " ")
        return s.trimmingCharacters(in: .whitespaces)
    }

    private static func maskNames(_ s: String) -> String {
        let ns = s as NSString
        let matches = capWord.matches(in: s, options: [], range: NSRange(location: 0, length: ns.length))
        guard !matches.isEmpty else { return s }
        var out = ""
        var cursor = 0
        for m in matches {
            out += ns.substring(with: NSRange(location: cursor, length: m.range.location - cursor))
            let word = ns.substring(with: m.range)
            out += stopWords.contains(word) ? word : " [NAME] "
            cursor = m.range.location + m.range.length
        }
        out += ns.substring(from: cursor)
        return out
    }
}
