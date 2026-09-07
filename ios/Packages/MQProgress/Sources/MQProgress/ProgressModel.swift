import Foundation
import MQContent

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

    /// The web's chain: six monsters, six crystals, and `endGame(true)` on the sixth.
    /// `if(S.mi>=MONSTERS.length){ endGame(true); }`  js/app.js monsterDown()
    static let crystalsPerSession = 6

    /// The most crystals ONE answer can put on the rope. The web's `monsterDown` resets
    /// `S.mHp` to the next monster's full HP, so overkill damage never carries and a
    /// single answer can fell exactly one monster. The store enforces the same ceiling
    /// on whatever the battle reports.
    static let crystalsPerAnswer = 1

    /// THE FADE LADDER, and the fade-out law's first concrete parameter.
    ///
    /// `full -> partial -> hint -> none`, one step per this many CONSECUTIVE correct
    /// answers in the SAME skill. The run counter resets on a wrong answer and on
    /// nothing else - not on a session boundary, not on a mode switch - and the ladder
    /// never climbs back.
    ///
    /// **Why it is not the old rule.** The scaffold used to be a pure function of the
    /// pool: `pool >= 3 && mastered -> none`. Six correct answers on the easiest pool
    /// and every piece of help was gone for the lifetime of the profile. The refuter
    /// simulated 400 first sessions of 17 items and an 80%-accurate child hit `none` in
    /// their FIRST SITTING **293 times out of 400** (Progress Refutation W9). That may
    /// be what "the best day is the day you do not need me" means, but it was a side
    /// effect of `pool >= 3`, not a decision.
    ///
    /// **7 is chosen, not inherited.** Simulated over 400 children a band, 17-item
    /// sessions, the session in which `none` first arrives (median): 60% -> 14,
    /// 70% -> 6, **80% -> 3** (mean 3.65), 90% -> 2, 100% -> 2. **Zero of 400 reach
    /// `none` in the first session at any accuracy, including a child who never misses**
    /// - three steps need 21 straight correct answers and a session is 17 items long.
    /// Full table in the README. 6 lands at a median of 3 but a mean of 2.85 (too fast
    /// at the top); 8 lands at a median of 4 but a median of 9 at 70%, which strands a
    /// struggling child on training wheels for a term.
    ///
    /// **MARKED FOR KEVIN'S EYE.** This is a teaching parameter with a child on the
    /// other end of it, and it is the first number the fade-out law has ever had.
    static let fadeAfterConsecutiveCorrect = 7

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
    /// Consecutive correct answers since the last fade step. Resets on a wrong answer
    /// and on nothing else - not on a session end, not on a mode switch. Persisted,
    /// because a ladder that forgot where it was between evenings would never descend
    /// for a child who plays in short sittings.
    var fadeRun: Int = 0

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

    /// THE LADDER. One step down per `MQRule.fadeAfterConsecutiveCorrect` consecutive
    /// correct answers in this skill; a wrong answer resets the run and nothing else
    /// touches it. Never climbs - it goes through `fade(to:)` like everything else, so
    /// even a bug here cannot hand help back.
    ///
    /// Called from `applyClimb`'s caller rather than from inside it, so the pool climb
    /// (the web's, transcribed) and the fade ladder (ours) stay separable and separately
    /// testable.
    @discardableResult
    mutating func applyFadeLadder(correct wasCorrect: Bool) -> ScaffoldLevel {
        guard wasCorrect else { fadeRun = 0; return scaffold }
        fadeRun += 1
        guard fadeRun >= MQRule.fadeAfterConsecutiveCorrect else { return scaffold }
        fadeRun = 0
        return fade(to: ScaffoldLevel(rawValue: max(0, scaffold.rawValue - 1)) ?? .none)
    }

    /// The most help this skill could still be entitled to, given nothing but the totals.
    /// **A LOAD-TIME CEILING, never a mutator** - applied once when a document is opened
    /// and never on the child's path.
    ///
    /// It exists because the fade law was enforced on `fade(to:)` and not on `load`: a
    /// restored backup, or a v1 file, saying `scaffold: "full"` for a skill with 40/40
    /// correct came back up as `full`, handing back training wheels the record says were
    /// gone (Progress Refutation W10). Clamping on load can only ever LOWER a level, so
    /// it cannot violate the law it is enforcing.
    ///
    /// **It is the MINIMUM number of steps the record forces**, never a guess at the
    /// actual one. `attempts` and `correct` do not say where the wrong answers fell, so
    /// the ceiling asks the only question a total can answer: *how few ladder steps could
    /// this history possibly have produced?* With `w` wrong answers the correct ones form
    /// at most `w + 1` unbroken runs; each run can hold `K - 1` correct answers without
    /// costing a step, so `(w + 1) * (K - 1)` correct answers are free and every `K`
    /// beyond that forces one.
    ///
    /// Two consequences worth stating. On an unbroken run it is EXACTLY the live ladder
    /// (7 correct -> partial, 21 -> none), so a clean history round-trips untouched. And
    /// it can never fade faster than the ladder did, which is what makes it safe to apply
    /// on every open - an over-eager ceiling would quietly re-impose the old fast fade
    /// that W9 exists to remove.
    var scaffoldCeiling: ScaffoldLevel {
        let k = MQRule.fadeAfterConsecutiveCorrect
        guard k > 1 else { return .none }
        let runs = (attempts - correct) + 1                 // wrong answers + 1
        let free = runs * (k - 1)
        let forced = correct <= free ? 0 : (correct - free + k - 1) / k
        return ScaffoldLevel(rawValue: max(0, ScaffoldLevel.full.rawValue - forced)) ?? .none
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

/// The on-disk shape of a finished session. `SessionSummary` holds `MQReviewItem`, which
/// is a presentation value with an `MQFigure` projection on it; this mirrors it as the
/// engine's own values instead of retroactively conforming a presentation type.
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

/// One review row on disk.
///
/// **`figure` is `MQContent.Figure` and nothing else.** It used to be six flattened
/// columns modelling MQDesign's three-case `MQFigure`, and the refuter measured what
/// that cost: of 216 figure-bearing questions drawn from the live engine, 36 were
/// representable and **180 were flattened to `.none`** - bar 36, line 24, table 18,
/// lshape 12, pie/other 90. `Figure` is already `Codable` and already tolerant (an
/// unknown `type` decodes to `.unsupported` with its payload intact), so persisting the
/// engine's own value loses nothing at all and survives a build that has never heard of
/// the figure kind in front of it (Progress Refutation W7, 2026-09-07).
struct StoredReview: Codable, Sendable, Equatable {
    var question: String
    var answer: String
    var explanation: String
    /// The engine's own spec, whole. Nil when the question carried no diagram.
    var figure: Figure?

    init(_ s: ReviewSnapshot) {
        question = s.question; answer = s.answer; explanation = s.explanation
        figure = s.figure
    }

    var item: MQReviewItem {
        MQReviewItem(question: question, spec: figure, answer: answer, explanation: explanation)
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

    /// THE BOUND on what a battle reports. The mode computes the crystal from the web's
    /// own monster HP and crit rule; the store decides how much of it is allowed to
    /// count, and that is the whole of its authority here:
    ///
    /// * never more than `MQRule.crystalsPerAnswer` (1) for one answer - the web's
    ///   `monsterDown` resets `S.mHp` to the next monster's full HP, so overkill never
    ///   carries and one answer can fell exactly one monster;
    /// * never anything on a wrong answer - a wrong answer on the web is a monster
    ///   counterattack, never a kill;
    /// * never past `MQRule.crystalsPerSession` (6) - the chain is six long and the
    ///   sixth is `endGame(true)`;
    /// * never negative.
    ///
    /// A mode cannot talk the store into progress it did not earn; it can only fail to
    /// report progress it did.
    mutating func award(reported: Int, correct wasCorrect: Bool) -> Int {
        guard wasCorrect else { return 0 }
        let asked = min(max(0, reported), MQRule.crystalsPerAnswer)
        let room = max(0, MQRule.crystalsPerSession - crystals)
        let given = min(asked, room)
        crystals += given
        return given
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
    /// - Parameter excluding: a profile id whose own name does not count as a clash.
    ///   `rename` passes the profile being renamed, so re-storing the name a child
    ///   already has is a no-op rather than a promotion to "Ben 2".
    func uniqueName(_ wanted: String, excluding id: String? = nil) -> String {
        let base = wanted.trimmingCharacters(in: .whitespacesAndNewlines)
        let seed = base.isEmpty ? "Explorer" : base
        var candidate = seed
        var n = 2
        while profiles.contains(where: { $0.name == candidate && $0.id != id }) {
            candidate = "\(seed) \(n)"
            n += 1
        }
        return candidate
    }
}
