import Foundation
import MQDesign

// The pure model. No actor, no disk, no clock beyond what is handed in - so every rule
// in here is testable as a function and is the SAME code whichever store is wrapping it.
// There is exactly one implementation of the climb, the fade and the crystal rule in
// this module, on purpose: two would be two places for them to drift.

// MARK: - Constants, all of them traced to the web

enum MQRule {
    /// `if(S.rightRow>=3 && S.level<3){ S.level++; S.rightRow=0; }`  js/app.js resolve()
    static let climbAfterCorrect = 3
    /// `if(S.wrongRow>=2 && S.level>1){ S.level--; S.wrongRow=0; }`  js/app.js markWrong()
    static let dropAfterWrong = 2
    static let minPool = 1
    static let maxPool = 3

    /// The web's parent report calls a skill worth acting on at `n >= 4`
    /// (`rows.filter(r=>r.n>=4 && r.pct<75)`), and paints it green at `pct >= 80`.
    /// Those two numbers are the evidence floor and the mastered band here.
    static let evidenceFloor = 4
    static let masteredAccuracy = 0.80

    /// A crystal every third answer in an unbroken run, six to a session.
    ///
    /// The web awards a crystal when a monster's HP hits zero - 490 HP over six monsters
    /// at 18 + 6*level + 0...4 damage a hit, doubled on a `streak >= 3` crit. A STORE
    /// cannot compute that: it owns no monster and no damage roll, and a store that took
    /// the mode's word for it would be a store a mode can talk into progress. So the
    /// crystal is re-derived from the one thing the store does own - the record of
    /// attempts - at the web's own crit threshold (streak >= 3), capped at the web's own
    /// chain length (six). Measured against the web that is the same order of crystals
    /// for the same play: ~12-16 correct answers to fill a chain.
    static let crystalEveryNStreak = 3
    static let crystalsPerSession = 6

    /// `if(DB.sessions.length>60) DB.sessions=DB.sessions.slice(-60);`  js/app.js
    static let sessionsKept = 60
    /// `if(DB.pwFame.length>60) DB.pwFame=DB.pwFame.slice(0,60);`      js/app.js
    static let patchwerkRunsKept = 60
    /// `S.wrongs.slice(0,10)` stored, `.slice(0,8)` rendered.           js/app.js
    static let reviewsStored = 10
    static let reviewsShown = 8
}

// MARK: - Per-skill state

/// Everything the store knows about one skill for one child. Codable because it IS the
/// on-disk shape; the schema version lives on the file, not on this.
struct SkillState: Codable, Sendable, Equatable {
    var attempts: Int = 0
    var correct: Int = 0
    /// The web's `S.level`, per skill and persisted (see the note in the README).
    var pool: Int = MQRule.minPool
    /// The web's `S.rightRow` / `S.wrongRow`. Kept because the climb is stateful: a
    /// skill sitting on two-in-a-row is one answer from a pool, and dropping the
    /// counters between sessions would silently make the climb three times slower.
    var rightRow: Int = 0
    var wrongRow: Int = 0
    /// The web's `S.maxLevel`.
    var bestPool: Int = MQRule.minPool
    var scaffold: ScaffoldLevel = .full

    var mastery: Double { attempts == 0 ? 0 : Double(correct) / Double(attempts) }
    var isProvisional: Bool { attempts < MQRule.evidenceFloor }
    var isMastered: Bool { attempts >= MQRule.evidenceFloor && mastery >= MQRule.masteredAccuracy }

    /// The web's climb, transcribed. Two things look like bugs and are not:
    /// at the cap `rightRow` keeps counting (the guard is `level < 3`), and at the floor
    /// `wrongRow` keeps counting (the guard is `level > 1`). A port that resets either
    /// one at the boundary diverges from the web after the first long run.
    mutating func applyClimb(correct wasCorrect: Bool) {
        if wasCorrect {
            correct += 1; rightRow += 1; wrongRow = 0
            if rightRow >= MQRule.climbAfterCorrect && pool < MQRule.maxPool {
                pool += 1; rightRow = 0
            }
            if pool > bestPool { bestPool = pool }
        } else {
            wrongRow += 1; rightRow = 0
            if wrongRow >= MQRule.dropAfterWrong && pool > MQRule.minPool {
                pool -= 1; wrongRow = 0
            }
        }
        attempts += 1
    }

    /// How much help this skill has EARNED the right to lose. Never applied directly -
    /// `fade(to:)` is the only writer, and it only ever moves down.
    var scaffoldTarget: ScaffoldLevel {
        if isMastered && pool >= MQRule.maxPool { return .none }
        switch pool {
        case ...1: return .full
        case 2:    return .partial
        default:   return .hint
        }
    }

    /// THE INVARIANT, in one place. Returns the level actually held.
    @discardableResult
    mutating func fade(to level: ScaffoldLevel) -> ScaffoldLevel {
        if level < scaffold { scaffold = level }
        return scaffold
    }

    func progress(_ id: SkillID) -> SkillProgress {
        SkillProgress(skill: id, attempts: attempts, correct: correct,
                      mastery: mastery, isProvisional: isProvisional, isMastered: isMastered,
                      pool: pool, bestPool: bestPool, scaffold: scaffold)
    }
}

// MARK: - Per-profile state

struct ProfileState: Codable, Sendable, Equatable {
    var id: String
    var name: String
    /// `MQCast.rawValue`, kept as a String so a cast this build does not know about
    /// survives a round trip instead of being rewritten to a unicorn.
    var cast: String
    var level: String
    var createdAt: Date
    var skills: [String: SkillState] = [:]
    var sessions: [StoredSession] = []
    var patchwerk: [PatchwerkRun] = []
    /// Sum of every ended session's crystals. This is `MQProfile.crystals` - where you
    /// got to, which is the token's own documented meaning, not how long since you played.
    var lifetimeCrystals: Int = 0

    var mqCast: MQCast { MQCast(rawValue: cast) ?? .unicorn }

    var profile: MQProfile {
        MQProfile(name: name, cast: mqCast, level: level, crystals: lifetimeCrystals)
    }
}

/// The on-disk shape of a finished session. `SessionSummary` holds `MQReviewItem` and
/// `MQFigure`, neither of which is Codable in MQDesign - and MQDesign is another lane's
/// package, so this module mirrors rather than retroactively conforming.
struct StoredSession: Codable, Sendable, Equatable {
    var id: String
    var mode: PlayMode
    var topic: String?
    var startedAt: Date
    var endedAt: Date
    var total: Int
    var correct: Int
    var bestStreak: Int
    var crystals: Int
    var timeOnItems: TimeInterval
    var maxPool: Int
    var wrongCounts: [String: Int]          // WrongReason.rawValue -> count
    var skills: [String: SkillTally]
    var reviews: [StoredReview]

    var summary: SessionSummary {
        var counts: [WrongReason: Int] = [:]
        for (k, v) in wrongCounts { if let r = WrongReason(rawValue: k) { counts[r] = v } }
        return SessionSummary(
            correct: correct, total: total, bestStreak: bestStreak,
            elapsed: endedAt.timeIntervalSince(startedAt), crystalsEarned: crystals,
            worthAnotherLook: StoredReview.shown(reviews),
            mode: mode, topic: topic, timeOnItems: timeOnItems,
            wrongCounts: counts, maxPool: maxPool)
    }

    var record: SessionRecord {
        var byID: [SkillID: SkillTally] = [:]
        for (k, v) in skills { byID[SkillID(k)] = v }
        return SessionRecord(id: SessionID(id), summary: summary,
                             startedAt: startedAt, endedAt: endedAt, skills: byID)
    }
}

struct StoredReview: Codable, Sendable, Equatable {
    var question: String
    var answer: String
    var explanation: String
    /// The figure, flattened. Only the two cases MQDesign draws exist today; an
    /// unknown one decodes as `.none` rather than failing a child's whole history.
    var figureKind: String = "none"
    var figureLong: String = ""
    var figureWide: String = ""
    var figureRatio: Double = 1
    var figureParts: Int = 0
    var figureFilled: Int = 0

    init(_ s: ReviewSnapshot) {
        question = s.question; answer = s.answer; explanation = s.explanation
        switch s.figure {
        case .none: figureKind = "none"
        case .rect(let long, let wide, let ratio):
            figureKind = "rect"; figureLong = long; figureWide = wide; figureRatio = Double(ratio)
        case .fractionBar(let parts, let filled):
            figureKind = "fractionBar"; figureParts = parts; figureFilled = filled
        }
    }

    var figure: MQFigure {
        switch figureKind {
        case "rect": return .rect(long: figureLong, wide: figureWide, ratio: CGFloat(figureRatio))
        case "fractionBar": return .fractionBar(parts: figureParts, filled: figureFilled)
        default: return .none
        }
    }

    var item: MQReviewItem {
        MQReviewItem(question: question, figure: figure, answer: answer, explanation: explanation)
    }

    /// The web dedupes the review list by stem and shows eight
    /// (`S.wrongs.filter(seen)...slice(0,8)` in js/app.js). Same here.
    static func shown(_ all: [StoredReview]) -> [MQReviewItem] {
        var seen = Set<String>()
        var out: [MQReviewItem] = []
        for r in all where !seen.contains(r.question) {
            seen.insert(r.question)
            out.append(r.item)
            if out.count >= MQRule.reviewsShown { break }
        }
        return out
    }
}

// MARK: - A session in flight

/// Never written to disk. If the iPad dies mid-run the run is gone, exactly as it is on
/// the web (`saveData()` runs at `endGame`, not per answer). What is NOT gone is the
/// child's mastery: that is written on every attempt. See the README.
struct LiveSession: Sendable {
    var id: String
    var profile: String
    var mode: PlayMode
    var topic: String?
    var startedAt: Date
    var total = 0
    var correct = 0
    var streak = 0
    var bestStreak = 0
    var crystals = 0
    var timeOnItems: TimeInterval = 0
    var maxPool = MQRule.minPool
    var wrongCounts: [WrongReason: Int] = [:]
    var skills: [String: SkillTally] = [:]
    var reviews: [StoredReview] = []

    /// A crystal on every third answer of an unbroken run, six to a session. See
    /// `MQRule.crystalEveryNStreak` for why the store re-derives this rather than
    /// being told.
    mutating func crystalForCurrentStreak() -> Int {
        guard streak > 0, streak % MQRule.crystalEveryNStreak == 0,
              crystals < MQRule.crystalsPerSession else { return 0 }
        crystals += 1
        return 1
    }
}

// MARK: - The whole state

struct ProgressState: Codable, Sendable, Equatable {
    /// Insertion-ordered, because the entrance screen draws the tokens in this order.
    var profiles: [ProfileState] = []

    func index(_ id: ProfileID) -> Int? { profiles.firstIndex { $0.id == id.raw } }

    /// Display names are kept unique so `MQProfile.id` (which IS the name, in MQDesign)
    /// stays a usable identity - and because two tokens on the beach reading "Ben" is a
    /// design failure before it is a lookup one.
    func uniqueName(_ wanted: String) -> String {
        let base = wanted.trimmingCharacters(in: .whitespacesAndNewlines)
        let seed = base.isEmpty ? "Explorer" : base
        var candidate = seed
        var n = 2
        while profiles.contains(where: { $0.name == candidate }) {
            candidate = "\(seed) \(n)"
            n += 1
        }
        return candidate
    }
}
