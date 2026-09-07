import Foundation

/// Which board a score belongs on.
///
/// **The bucket is part of the score.** A 5-minute Heroic run must never outrank
/// a 2-minute Trash Pull on raw damage, and a P5 run must never be compared with
/// a P3 one - the units are not the same quantity. The web board learned this the
/// hard way (`api/leaderboard` is a Redis sorted set scored by MILLISECONDS, so a
/// Patchwerk record posted to it ranks nonsensically), which is why Patchwerk
/// rows were never merged into it. Here the segmentation is in the type: there is
/// no API that can compare two entries from different buckets.
public struct LeaderboardBucket: Hashable, Sendable, Codable {
    /// `"patchwerk"` today. Present so a second mode cannot silently share a board.
    public let mode: String
    /// Patchwerk boss tier: `"short"` / `"normal"` / `"long"`.
    public let tier: String
    /// MOE class level the run was played at: `"P3"` ... `"P6"`.
    public let level: String

    public init(mode: String, tier: String, level: String) {
        self.mode = mode; self.tier = tier; self.level = level
    }

    /// Stable storage key. Deliberately not `description`: it is persisted.
    public var key: String { "\(mode)/\(tier)/\(level)" }
}

/// One run on a board.
///
/// Everything here is a PLAY number plus a display name. There is no account, no
/// email, no device identifier and no timestamp finer than the second - a
/// leaderboard row is the one place a child's name could leak into a file, so the
/// row carries the least that still lets a child recognise their own run.
public struct LeaderboardEntry: Hashable, Sendable, Codable, Identifiable {
    /// Assigned at submit. Also how `rank(of:)` finds a row again after sorting.
    public let id: String
    public let bucket: LeaderboardBucket
    /// Which on-device profile owns the row. Boards are profile-scoped for
    /// display ("this is your run"), never for ranking: two siblings sharing one
    /// iPad share one board, which is the whole point of a device board.
    public let profile: String
    /// Display name, already through `MQNameFilter`. Never store the raw string.
    public let name: String
    /// The hero the child was playing, for the row's little glyph.
    public let cast: String

    /// Total damage. The ranked quantity.
    public let score: Int
    public let maxStacks: Int
    public let correct: Int
    public let wrong: Int
    public let freezesUsed: Int
    public let durationMs: Int
    /// `YYYY-MM-DD`, the day the run was played. No clock time: a board row does
    /// not need to say a child was playing at 21:40.
    public let date: String
    /// Seconds since the epoch, used ONLY as the tie-break. Never displayed.
    public let recordedAt: Double

    public init(id: String = UUID().uuidString, bucket: LeaderboardBucket, profile: String,
                name: String, cast: String, score: Int, maxStacks: Int, correct: Int,
                wrong: Int, freezesUsed: Int, durationMs: Int, date: String,
                recordedAt: Double) {
        self.id = id; self.bucket = bucket; self.profile = profile
        self.name = name; self.cast = cast; self.score = score
        self.maxStacks = maxStacks; self.correct = correct; self.wrong = wrong
        self.freezesUsed = freezesUsed; self.durationMs = durationMs
        self.date = date; self.recordedAt = recordedAt
    }

    public var attempts: Int { correct + wrong }
    /// 0...1. Zero attempts is 0, not a divide by zero and not "100%".
    public var accuracy: Double { attempts == 0 ? 0 : Double(correct) / Double(attempts) }

    /// The board's total order, as one predicate so every implementation sorts
    /// identically.
    ///
    /// 1. higher damage first;
    /// 2. on a tie, the run that got there FIRST keeps the higher place - the
    ///    later child has to actually beat it, not merely match it;
    /// 3. on a tie in both, by id, so the order is total and a re-sort of the
    ///    same rows can never shuffle.
    public static func outranks(_ a: LeaderboardEntry, _ b: LeaderboardEntry) -> Bool {
        if a.score != b.score { return a.score > b.score }
        if a.recordedAt != b.recordedAt { return a.recordedAt < b.recordedAt }
        return a.id < b.id
    }
}

/// What a submission did.
public struct LeaderboardPlacement: Hashable, Sendable {
    /// 1-based place on the board, or nil when the run did not make the top N.
    public let rank: Int?
    /// How many rows the bucket holds after the submission.
    public let kept: Int
    /// How many rows the bucket holds at most.
    public let capacity: Int

    public init(rank: Int?, kept: Int, capacity: Int) {
        self.rank = rank; self.kept = kept; self.capacity = capacity
    }

    public var madeTheBoard: Bool { rank != nil }
    public var isBest: Bool { rank == 1 }
}

/// The seam between a mode and wherever its scores are kept.
///
/// Two conformances exist: `LocalLeaderboard` (this device, a JSON file) and
/// `GameCenterLeaderboard` (a compiled STUB - see its own file). Nothing else is
/// permitted: per the App Store rules check, a third-party leaderboard service in
/// a child-directed app imports Guideline 1.3's ban on sending PII to third
/// parties, and it would take the privacy label off "Data Not Collected".
public protocol LeaderboardService: Sendable {

    /// True when a submission leaves this device. `LocalLeaderboard` returns
    /// false and the Patchwerk result screen reads it to decide whether it may
    /// say "on this iPad" or has to say "posted".
    var leavesTheDevice: Bool { get }

    /// Record a run. Returns where it landed.
    @discardableResult
    func submit(_ entry: LeaderboardEntry) async throws -> LeaderboardPlacement

    /// The board for one bucket, best first, at most `limit` rows.
    func top(_ bucket: LeaderboardBucket, limit: Int) async throws -> [LeaderboardEntry]

    /// 1-based place of a previously submitted row, or nil if it is not on the
    /// board any more.
    func rank(of id: String, in bucket: LeaderboardBucket) async throws -> Int?

    /// Forget every row for one profile. A profile deleted on the entrance screen
    /// must not leave its name on a board.
    func forget(profile: String) async throws
}
