import Foundation

/// Units, as the child's INPUT problem rather than as the grader's.
///
/// The grader has known how to reject a wrong unit since the wave-2 contract, and
/// after the unit sweep it can say *which* half was wrong. None of that reaches a
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
    /// bundle (all 250 generator refs), not guessed: `p4area` declares `cm` and
    /// `cm²`, `p5decimals` declares `m kg l km cm ml g`, `p5rate` declares
    /// `pages min $ l buns`. The rest of the table is the units the unit sweep
    /// adds on `feat/unit-sweep`, carried here so the chip row already knows them
    /// on the day that branch merges.
    public static let byClass: [QUnitClass: [String]] = [
        .length:  ["mm", "cm", "m", "km"],
        .area:    ["cm²", "m²"],
        .volume:  ["ml", "l", "cm³", "m³"],
        .mass:    ["g", "kg"],
        .money:   ["$", "cents"],
        .percent: ["%"],
        .time:    ["s", "min", "h", "hour", "hours", "minutes"],
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

    /// Loose comparison, matching what `normUnit` in `js/core.js` does before it
    /// compares: case-folded, whitespace-stripped, and the two spellings of a
    /// squared/cubed unit treated as one (`cm2` == `cm²`).
    public static func normalise(_ unit: String) -> String {
        var s = unit.lowercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "\u{00A0}", with: "")
        s = s.replacingOccurrences(of: "²", with: "2")
        s = s.replacingOccurrences(of: "³", with: "3")
        return s
    }

    // MARK: - Chips

    /// The chips offered for a question that declares `unit`: the declared unit
    /// plus **two plausible distractors**, in an order that is stable for a given
    /// question and different between questions.
    ///
    /// **Why two distractors and not one, and not five.** One would make the
    /// declared unit a coin flip. Five turns a maths question into a menu. Two
    /// gives the child a real decision with the two errors that are actually
    /// made - the wrong DIMENSION (`cm` for an area) and the wrong SCALE (`m` for
    /// a centimetre answer) - which are the two mistakes the P4/P5 syllabus
    /// spends its time on.
    ///
    /// The order is derived from the question id so a child cannot learn "the
    /// right one is always first", and is stable across re-renders so the row
    /// does not reshuffle under a finger mid-tap.
    /// The declared unit, as a list.
    ///
    /// `Question.unit` is a STRING even after the unit sweep lands, because
    /// `tools/engine/api.js` writes `q.unit ? String(q.unit) : ''` and
    /// `String(['cm³','ml'])` is `"cm³,ml"`. So a question that declares a set of
    /// equivalents arrives here comma-joined, and the first member is the
    /// canonical one (that is the order `finishTyped` writes and the order the
    /// teaching card reads). Splitting here means the chip row is already correct
    /// on the day `feat/unit-sweep` merges, with no change above this line.
    public static func declaredList(_ declared: String) -> [String] {
        declared.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    /// The unit shown in the teaching card: the canonical (first) member.
    public static func canonical(_ declared: String) -> String {
        declaredList(declared).first ?? declared.trimmingCharacters(in: .whitespaces)
    }

    /// Whether a chip is one the question would accept.
    public static func accepts(_ chip: String, declared: String) -> Bool {
        let c = normalise(chip)
        return declaredList(declared).contains { normalise($0) == c }
    }

    public static func chips(declared: String, questionID: String) -> [String] {
        let d = canonical(declared)
        guard !d.isEmpty else { return [] }
        // A distractor that normalises to the declared unit would be a SECOND
        // correct chip, which turns the row into a trick. Filter, then top up
        // from the fallback pair, then de-duplicate again.
        var set = [d]
        for candidate in distractors(for: d) + ["cm", "kg", "m", "l"]
        where set.count < 3 {
            let n = normalise(candidate)
            guard !accepts(candidate, declared: declared) else { continue }
            if !set.contains(where: { normalise($0) == n }) { set.append(candidate) }
        }
        return order(set, seed: seed(questionID))
    }

    /// The two distractors for a declared unit.
    ///
    /// Table first, because the good distractor for `cm²` is `cm` (the dimension
    /// error) and `m` (the scale error) - which is the brief's own example - and
    /// no rule derives that from the string. A unit with no table entry falls
    /// back to two other members of its own class, then to `cm` and `kg`, which
    /// are a length and a mass and so are wrong in two different ways.
    public static func distractors(for unit: String) -> [String] {
        let u = normalise(unit)
        if let pair = table[u] { return pair }
        if let klass = unitClass(unit) {
            let others = (byClass[klass] ?? []).filter { normalise($0) != u }
            if others.count >= 2 { return Array(others.prefix(2)) }
            if let one = others.first { return [one, "cm"] }
        }
        return ["cm", "kg"]
    }

    /// Keyed by the NORMALISED unit, so `cm2` and `cm²` share one row.
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
        "cm3":    ["cm²", "ml"],
        "m3":     ["m²", "l"],
        "ml":     ["l", "cm³"],
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
        // both distractors are measurements rather than other nouns.
        "pages":  ["cm", "kg"],
        "buns":   ["kg", "cm"],
        "pupils": ["kg", "cm"],
        "cubes":  ["cm³", "cm"],
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
    /// the declared one, chosen by the seed. A full permutation buys nothing and
    /// makes the row harder to reason about in a transcript.
    static func order(_ chips: [String], seed: UInt64) -> [String] {
        guard chips.count > 1 else { return chips }
        let k = Int(seed % UInt64(chips.count))
        return Array(chips[k...] + chips[..<k])
    }
}
