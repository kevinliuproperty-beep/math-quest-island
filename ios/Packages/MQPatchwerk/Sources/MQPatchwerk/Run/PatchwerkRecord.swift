import Foundation
import MQServices

/// The end-of-run record, in the web's exact shape and key ORDER.
///
/// The web's self-test checks `Object.keys(rec).join(",")` against a fixed
/// string, so a drift in the record's shape fails a gate rather than quietly
/// corrupting a board two runtimes write to. The same assertion is made here,
/// but on the TYPE rather than on the encoded bytes:
///
/// **Foundation's `JSONEncoder` does not preserve declaration order** - it walks
/// an unordered container, and the first version of this file's test asserted
/// against the JSON and failed with the keys in a scrambled order. So the
/// declared `CodingKeys` carry the contract order and the test asserts THAT,
/// plus that the encoded JSON contains exactly this set of keys and no others.
/// (Recorded because "just check the JSON" is the obvious thing to try, and it
/// is wrong.)
public struct PatchwerkRecord: Sendable, Equatable, Codable {
    public let mode: String
    /// `"short"` / `"normal"` / `"long"`.
    public let tier: String
    /// The class level played (as an Int on the web: 1/2/3 pools are `pool`, this
    /// is the child's level). Kept Int for byte-parity with the web record.
    public let level: Int
    public let damage: Int
    public let maxStacks: Int
    public let correct: Int
    public let wrong: Int
    public let freezesUsed: Int
    public let durationMs: Int
    /// `YYYY-MM-DD`.
    public let date: String

    public init(mode: String, tier: String, level: Int, damage: Int, maxStacks: Int,
                correct: Int, wrong: Int, freezesUsed: Int, durationMs: Int, date: String) {
        self.mode = mode; self.tier = tier; self.level = level; self.damage = damage
        self.maxStacks = maxStacks; self.correct = correct; self.wrong = wrong
        self.freezesUsed = freezesUsed; self.durationMs = durationMs; self.date = date
    }

    /// Declared explicitly and IN ORDER: this is the contract, and a synthesised
    /// set would silently follow a re-ordered property list.
    public enum CodingKeys: String, CodingKey, CaseIterable {
        case mode, tier, level, damage, maxStacks, correct, wrong, freezesUsed, durationMs, date
    }

    /// The key order the web asserts. Here so the test names one constant rather
    /// than repeating a string literal that could be "fixed" to match a drift.
    public static let contractKeyOrder =
        "mode,tier,level,damage,maxStacks,correct,wrong,freezesUsed,durationMs,date"

    public var attempts: Int { correct + wrong }
    public var accuracy: Double { attempts == 0 ? 0 : Double(correct) / Double(attempts) }
    /// "83%" - the result screen's own reading.
    public var accuracyLabel: String { "\(Int((accuracy * 100).rounded()))%" }

    /// The board row this run belongs on. `level` becomes the MOE label the child
    /// picked ("P4"), because that is what the bucket segments on.
    public func entry(profile: String, name: String, cast: String,
                      levelLabel: String, recordedAt: Double) -> LeaderboardEntry {
        LeaderboardEntry(
            bucket: LeaderboardBucket(mode: mode, tier: tier, level: levelLabel),
            profile: profile,
            name: name,
            cast: cast,
            score: damage,
            maxStacks: maxStacks,
            correct: correct,
            wrong: wrong,
            freezesUsed: freezesUsed,
            durationMs: durationMs,
            date: date,
            recordedAt: recordedAt)
    }
}
