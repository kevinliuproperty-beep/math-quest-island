import Foundation
import MQContent

/// Units, as the child's INPUT problem rather than as the grader's.
///
/// The grader has known how to reject a wrong unit since the wave-2 contract, and
/// since the unit sweep it says *which* half was wrong. None of that reaches a
/// child who cannot type `cm²`, and on an iPad's decimal keypad nobody can:
/// there are no letters and no superscripts on it at all. That is recorded as
/// open item 4 of the Unit Sweep lane -
///
/// > `inputmode="decimal"` still means the whole unit contract is unreachable on
/// > the on-screen iPad keypad. Whatever answer field `MQDesign` ships decides
/// > whether the card and the accept list are reachable at all.
///
/// - and this file is half of this lane's answer to it. The other half is
/// `QUnitChipRow`.
public enum QUnitClass: String, Sendable, CaseIterable {
    case length, area, volume, mass, money, percent, time, count

    /// The `<why>` half of the teaching sentence, verbatim from the unit sweep's
    /// `UNIT_WHY` table in `js/app.js` so the web card and the iOS card teach the
    /// same words.
    public var why: String {
        switch self {
        case .area:    return "area is measured in squares"
        case .volume:  return "this asks how much space it fills"
        case .length:  return "this asks how long something is"
        case .money:   return "this asks how much money"
        case .percent: return "this asks for a percentage"
        case .mass:    return "this asks how heavy it is"
        case .time:    return "this asks how long it takes"
        case .count:   return "that is what you are counting"
        }
    }
}

public enum QUnits {

    /// Every unit token the engine declares, by class. Measured off the shipped
    /// bundle (all 250 generator refs), not guessed.
    public static let byClass: [QUnitClass: [String]] = [
        .length:  ["mm", "cm", "m", "km"],
        .area:    ["cm²", "m²"],
        .volume:  ["ml", "l", "cm³", "m³"],
        .mass:    ["g", "kg"],
        .money:   ["$", "cents"],
        .percent: ["%"],
        .time:    ["s", "min", "h"],
        .count:   ["pupils", "stickers", "pages", "buns", "cubes", "marbles",
                   "beads", "books", "units"]
    ]

    public static func unitClass(_ unit: String) -> QUnitClass? {
        let u = normalise(unit)
        for (klass, members) in byClass where members.contains(where: { normalise($0) == u }) {
            return klass
        }
        return nil
    }

    /// The unit lesson's `<why>`, or a safe generic when the unit is one this
    /// build has never seen. A missing class must never silence the lesson: the
    /// child still needs to know the unit was the problem.
    public static func why(for unit: String) -> String {
        unitClass(unit)?.why ?? "the question asks for that unit"
    }

    /// **`normUnit` from `js/core.js`, in Swift.**
    ///
    /// Case-folded, whitespace-stripped, superscripts folded to digits, and the
    /// grader's own `UNIT_ALIAS` table applied. The alias half is not decoration:
    /// without it a question declaring `minutes` would be offered `min` as a
    /// "wrong" chip, and the engine grades `min` CORRECT (Quest Refutation K3,
    /// the latent half). A chip row that cannot see an alias cannot avoid it.
    public static func normalise(_ unit: String) -> String {
        var s = unit.lowercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "\u{00A0}", with: "")
        s = s.replacingOccurrences(of: "²", with: "2")
        s = s.replacingOccurrences(of: "³", with: "3")
        return alias[s] ?? s
    }

    /// Verbatim from `UNIT_ALIAS` in `js/core.js`, with the superscript forms
    /// already handled by the fold above.
    static let alias: [String: String] = [
        "ℓ": "l", "litre": "l", "litres": "l",
        "°": "deg", "degree": "deg", "degrees": "deg",
        "minute": "min", "minutes": "min", "mins": "min",
        "hour": "h", "hours": "h", "hr": "h",
        "second": "s", "seconds": "s", "secs": "s", "sec": "s",
        "page": "pages", "bun": "buns",
        "cent": "cents", "dollar": "dollars", "cube": "cubes"
    ]

    /// **Units that name the SAME QUANTITY, which the grader may still reject.**
    ///
    /// Quest Refutation K3: `QUnits.table["ml"]` offered `cm³` as a wrong-unit
    /// distractor while `p5volume`'s own stem teaches *"1 ml is exactly 1 cm³"*.
    /// One node teaches the identity, another marks it wrong and lectures the
    /// child about it. Whether the ENGINE accepts the other spelling depends on
    /// whether that generator declared the array form; whether the APP may offer
    /// it as a wrong answer does not. It may not, ever.
    static let sameQuantity: [String: [String]] = [
        "ml":    ["cm3", "cubes"],
        "cm3":   ["ml", "cubes"],
        "cubes": ["cm3", "ml"]
    ]

    // MARK: - The declared set

    /// Every unit the question accepts, canonical first.
    ///
    /// Read off `Question.acceptedUnits`, which `tools/engine/api.js` publishes as
    /// its own field. It used to be derived here by splitting `unit` on a comma,
    /// because the API wrote `String(q.unit)` and `String(['cm³','ml'])` is
    /// `"cm³,ml"` - a shape that reached `gradeTyped` as a single joined unit and
    /// graded the CORRECT chip wrong (Quest Refutation K7). The API emits the
    /// canonical member on `unit` and the whole set on `units` now, so there is
    /// nothing left to split and no way to submit a joined string.
    public static func accepted(_ q: Question) -> [String] { q.acceptedUnits }

    /// The unit shown in the teaching card: the canonical (first) member.
    public static func canonical(_ q: Question) -> String { q.acceptedUnits.first ?? "" }

    /// Whether a chip is one this question would accept.
    public static func accepts(_ chip: String, in accepted: [String]) -> Bool {
        let c = normalise(chip)
        return accepted.contains { normalise($0) == c }
    }

    public static func accepts(_ chip: String, question q: Question) -> Bool {
        accepts(chip, in: q.acceptedUnits)
    }

    /// Whether a chip names the same quantity as anything the question accepts -
    /// accepted or not. **A chip that is true may never be offered as a wrong one.**
    public static func namesTheSameQuantity(_ chip: String, as accepted: [String]) -> Bool {
        let c = normalise(chip)
        for a in accepted {
            let n = normalise(a)
            if n == c { return true }
            if (sameQuantity[n] ?? []).contains(c) { return true }
            if (sameQuantity[c] ?? []).contains(n) { return true }
        }
        return false
    }

    // MARK: - Chips

    /// The chips offered for a question: the canonical declared unit plus **two
    /// plausible distractors**, in an order that is stable for a given question and
    /// different between questions.
    ///
    /// **Why two distractors and not one, and not five.** One would make the
    /// declared unit a coin flip. Five turns a maths question into a menu. Two
    /// gives the child a real decision with the two errors that are actually
    /// made - the wrong DIMENSION (`cm` for an area) and the wrong SCALE (`m` for
    /// a centimetre answer).
    ///
    /// **No distractor is ever a right answer.** It is filtered against the
    /// question's whole ACCEPTED SET (not just the canonical member) and against
    /// the same-quantity table, so `cm³` is never offered on an `ml` question and
    /// `ml` is never offered on a `cm³` one, whether or not that generator happens
    /// to declare the array form.
    public static func chips(_ q: Question, questionID: String? = nil) -> [String] {
        chips(accepted: q.acceptedUnits, questionID: questionID ?? q.id)
    }

    public static func chips(accepted: [String], questionID: String) -> [String] {
        guard let d = accepted.first, !d.isEmpty else { return [] }
        var set = [d]
        for candidate in distractors(for: d) + ["cm", "kg", "m", "l", "%"]
        where set.count < 3 {
            guard !namesTheSameQuantity(candidate, as: accepted) else { continue }
            let n = normalise(candidate)
            if !set.contains(where: { normalise($0) == n }) { set.append(candidate) }
        }
        return order(set, seed: seed(questionID))
    }

    /// The two distractors for a declared unit.
    ///
    /// Table first, because the good distractor for `cm²` is `cm` (the dimension
    /// error) and `m` (the scale error) - which is the brief's own example - and
    /// no rule derives that from the string. A unit with no table entry falls back
    /// to two other members of its own class, then to `cm` and `kg`, which are a
    /// length and a mass and so are wrong in two different ways.
    public static func distractors(for unit: String) -> [String] {
        let u = normalise(unit)
        if let pair = table[u] { return pair }
        if let klass = unitClass(unit) {
            let others = (byClass[klass] ?? [])
                .filter { !namesTheSameQuantity($0, as: [unit]) }
            if others.count >= 2 { return Array(others.prefix(2)) }
            if let one = others.first { return [one, "cm"] }
        }
        return ["cm", "kg"]
    }

    /// Keyed by the NORMALISED unit, so `cm2` and `cm²` share one row.
    ///
    /// **`ml` and `cm³` are not in each other's rows** - see `sameQuantity`. The
    /// volume rows teach the SCALE error (`l` against `ml`) and the DIMENSION
    /// error (`cm²` against `cm³`) instead, which are the two mistakes a child
    /// actually makes on a volume item.
    static let table: [String: [String]] = [
        // length: the dimension error, then the scale error
        "mm":     ["cm", "m"],
        "cm":     ["cm²", "m"],
        "m":      ["cm", "m²"],
        "km":     ["m", "cm"],
        // area
        "cm2":    ["cm", "m"],
        "m2":     ["m", "cm²"],
        // volume
        "cm3":    ["cm²", "l"],
        "m3":     ["m²", "l"],
        "ml":     ["l", "cm"],
        "l":      ["ml", "kg"],
        // mass
        "g":      ["kg", "ml"],
        "kg":     ["g", "l"],
        // money
        "$":      ["cents", "%"],
        "cents":  ["$", "%"],
        // percent
        "%":      ["$", "cm"],
        // time
        "s":      ["min", "h"],
        "min":    ["h", "s"],
        "h":      ["min", "s"],
        // count nouns: the lesson is "this is a count, not a measurement", so
        // both distractors are measurements rather than other nouns. `cubes` gets
        // the same treatment as the rest - it used to get `cm³`, which on this
        // island's own teaching is the same quantity.
        "pages":  ["cm", "kg"],
        "buns":   ["kg", "cm"],
        "pupils": ["kg", "cm"],
        "cubes":  ["cm", "kg"],
        "units":  ["cm", "kg"]
    ]

    /// FNV-1a over the question id. A hash, not `hashValue`: Swift's is seeded
    /// per process, so a chip order derived from it would differ between the
    /// driver run that produced a PNG and the run that reads it.
    static func seed(_ s: String) -> UInt64 {
        var h: UInt64 = 0xcbf2_9ce4_8422_2325
        for b in s.utf8 { h = (h ^ UInt64(b)) &* 0x0000_0100_0000_01B3 }
        return h
    }

    /// A deterministic rotation, not a shuffle: three chips, three positions for
    /// the declared one, chosen by the seed.
    static func order(_ chips: [String], seed: UInt64) -> [String] {
        guard chips.count > 1 else { return chips }
        let k = Int(seed % UInt64(chips.count))
        return Array(chips[k...] + chips[..<k])
    }
}
