import Testing
import Foundation
import CryptoKit
@testable import MQPatchwerk

/// THE GATE OF THIS LANE: 300 recorded web runs, replayed in Swift, compared
/// answer by answer.
///
/// Two implementations of one leaderboard's arithmetic is the situation where a
/// one-damage drift makes web and iOS scores quietly incomparable. So the web is
/// the reference and this is the proof: `tools/fixtures/patchwerk-parity.json`
/// holds 300 scripted runs recorded from `js/modes/patchwerk.js` itself - 17,682
/// answers, of which 1,546 are deliberately swallowed by a stun window or by
/// expiry - and every one of them carries the event the web produced AND the
/// whole state machine's fields immediately after it.
///
/// The comparison is per ANSWER, not per run total. A run that ends on the right
/// damage having taken a different route through the stacks is a failure here,
/// which is the point: the totals are the easy thing to get accidentally right.
///
/// The replay drives a `PatchwerkManualClock`, so the injected clock is on the
/// hot path of the parity proof rather than being a testing convenience beside
/// it - and a 5-minute Heroic tier costs microseconds.
@Suite("Patchwerk scoring parity with the web")
struct ParityCorpusTests {

    // MARK: Corpus

    struct Corpus: Decodable, Sendable {
        let schema: String
        let source: String
        let sourceSha256: String
        let seed: Int
        let runCount: Int
        let answerCount: Int
        let scoredAnswerCount: Int
        let answerFields: [String]
        let eventFields: [String]
        let config: Config
        let runs: [Run]

        struct Config: Decodable, Sendable {
            struct Tier: Decodable, Sendable { let id: String; let label: String; let durationMs: Int }
            let tiers: [Tier]
            let defaultTier: String
            let baseDamage: [String: Double]
            let baseDamageFallback: Double
            let stackStep: Double
            let stackCap: Int
            let speedBonusMax: Double
            let speedFastMs: Double
            let speedZeroMs: Double
            let freezeEarnEvery: Int
            let freezeMaxHeld: Int
            let stunMs: Int
            let enrageWindowMs: Int
            let enrageMult: Double
            let bossHpPerPhase: Int
        }

        struct Run: Decodable, Sendable {
            let id: Int
            let tier: String
            let durationMs: Int
            let note: String
            let recordLevel: Int
            /// [elapsedMs, correct(0/1), level?, answerMs?]
            let answers: [[Int?]]
            /// See `eventFields` - 19 integers per answer.
            let events: [[Int]]
            let record: PatchwerkRecord
            let finalState: FinalState
        }

        struct FinalState: Decodable, Sendable {
            let damage: Int, stacks: Int, maxStacks: Int, correct: Int, wrong: Int
            let freezes: Int, freezesUsed: Int, earnProgress: Int, stunUntilMs: Int
            let bossHp: Int, bossPhase: Int, enraged: Bool, ended: Bool
        }
    }

    /// The field order the corpus is written in. Named here so a reordering on
    /// the node side fails loudly instead of comparing damage against stacks.
    static let expectedEventFields = [
        "ignored", "correct", "damage", "stacks", "froze", "earnedFreeze", "stunMs", "enraged",
        "totalDamage", "heldStacks", "maxStacks", "correctCount", "wrongCount",
        "freezes", "freezesUsed", "earnProgress", "stunUntilMs", "bossHp", "bossPhase"
    ]

    /// Walk up from this file to a path in the repository root. One copy in the
    /// repository, and the Swift side cannot be testing a stale duplicate.
    static func repoFile(_ relative: String) -> URL? {
        var dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        for _ in 0..<10 {
            let candidate = dir.appendingPathComponent(relative)
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
            dir = dir.deletingLastPathComponent()
        }
        return nil
    }

    /// Loaded once for the whole suite: 1.3 MB decoded 300 times would dominate
    /// the gate's runtime and prove nothing extra.
    static let corpus: Corpus = {
        // A COMMITTED fixture at tools/fixtures/, not a build output and not a
        // bundle resource - one copy in the repository, found by walking up from
        // this file, exactly as MQEngineJSTests finds its own.
        guard let url = repoFile("tools/fixtures/patchwerk-parity.json") else {
            fatalError("tools/fixtures/patchwerk-parity.json not found. It is a committed fixture, "
                       + "not a build output; regenerate it with `node tools/make-patchwerk-parity.mjs`.")
        }
        return try! JSONDecoder().decode(Corpus.self, from: try! Data(contentsOf: url))
    }()

    // MARK: The corpus describes what we think it describes

    @Test("The corpus is the recording this lane mirrors")
    func corpusShape() {
        let c = Self.corpus
        #expect(c.schema == "patchwerk-parity/1")
        #expect(c.source == "js/modes/patchwerk.js")
        #expect(c.runCount == 300)
        #expect(c.runs.count == 300)
        #expect(c.answerCount == c.runs.reduce(0) { $0 + $1.answers.count })
        #expect(c.eventFields == Self.expectedEventFields)
        #expect(c.answerFields == ["elapsedMs", "correct", "level", "answerMs"])
        // Coverage, asserted rather than hoped for: the corpus is worthless if it
        // never enrages, never freezes and never gets swallowed.
        #expect(c.scoredAnswerCount < c.answerCount, "no answer was ever swallowed")
        let enraged = c.runs.reduce(0) { $0 + $1.events.filter { $0[7] == 1 && $0[0] == 0 }.count }
        let froze = c.runs.reduce(0) { $0 + $1.events.filter { $0[4] == 1 }.count }
        let earned = c.runs.reduce(0) { $0 + $1.events.filter { $0[5] == 1 }.count }
        #expect(enraged > 500, "too few enraged hits to be a test of the enrage")
        #expect(froze > 200, "too few freeze absorptions")
        #expect(earned > 200, "too few freeze credits earned")
        #expect(Set(c.runs.map(\.tier)) == ["short", "normal", "long"])
    }

    /// THE PIN. Without this the 300 runs below are a recording that nothing
    /// forces to stay a recording OF ANYTHING.
    ///
    /// The refutation of 2026-09-07 forked the web's own scoring
    /// (`STACK_STEP: 0.10 -> 0.12`, one character) and both gates stayed green:
    /// `tools/make-patchwerk-parity.mjs --check` was referenced by no gate at all,
    /// and this suite decoded `sourceSha256` and never compared it to anything.
    /// Replaying the lane's own 300 scripts through the forked web gave a maximum
    /// damage gap of 321 - the exact property this lane exists to defend, silently
    /// broken.
    ///
    /// So: the corpus's recorded sha is compared against a sha-256 THIS TEST
    /// COMPUTES from `js/modes/patchwerk.js` on disk, found by the same walk that
    /// finds the corpus. Change the web's scoring without regenerating and this
    /// goes red in milliseconds. The node half of the pin lives in `npm test`
    /// (`node tools/make-patchwerk-parity.mjs --check`), which catches the same
    /// fork from the other side - a corpus regenerated but not committed.
    @Test("The corpus is pinned to the web file it was recorded from")
    func corpusPinnedToSource() throws {
        let url = try #require(Self.repoFile("js/modes/patchwerk.js"),
                               "js/modes/patchwerk.js not found by walking up from #filePath; the parity corpus cannot be pinned to a file that is not there.")
        let bytes = try Data(contentsOf: url)
        let digest = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
        #expect(digest == Self.corpus.sourceSha256,
                """
                tools/fixtures/patchwerk-parity.json was recorded from a DIFFERENT \
                js/modes/patchwerk.js than the one on disk.
                  corpus says  \(Self.corpus.sourceSha256)
                  file is      \(digest)
                The web's scoring changed and the corpus did not. Regenerate it:
                  node tools/make-patchwerk-parity.mjs   (and commit the result)
                """)
    }

    @Test("Every mirrored constant equals the web's own CONFIG")
    func configMirrored() {
        let web = Self.corpus.config
        let ours = PatchwerkConfig.mirrored
        #expect(ours.defaultTier == web.defaultTier)
        #expect(ours.tiers.count == web.tiers.count)
        for t in web.tiers {
            let mine = ours.tiers.first { $0.id == t.id }
            #expect(mine?.label == t.label)
            #expect(mine?.durationMs == t.durationMs)
        }
        for (k, v) in web.baseDamage { #expect(ours.baseDamage[Int(k)!] == v) }
        #expect(ours.baseDamageFallback == web.baseDamageFallback)
        #expect(ours.stackStep == web.stackStep)
        #expect(ours.stackCap == web.stackCap)
        #expect(ours.speedBonusMax == web.speedBonusMax)
        #expect(ours.speedFastMs == web.speedFastMs)
        #expect(ours.speedZeroMs == web.speedZeroMs)
        #expect(ours.freezeEarnEvery == web.freezeEarnEvery)
        #expect(ours.freezeMaxHeld == web.freezeMaxHeld)
        #expect(ours.stunMs == web.stunMs)
        #expect(ours.enrageWindowMs == web.enrageWindowMs)
        #expect(ours.enrageMult == web.enrageMult)
        #expect(ours.bossHpPerPhase == web.bossHpPerPhase)
    }

    // MARK: The replay

    /// One recorded run, reproduced exactly. 300 cases, one per run.
    @Test("Recorded web run reproduces exactly", arguments: 0..<300)
    func replay(_ index: Int) throws {
        let run = Self.corpus.runs[index]
        let failures = ParityCorpusTests.replayFailures(run)
        let detail = failures.prefix(6).joined(separator: "\n")
        #expect(failures.isEmpty, "run \(run.id) (\(run.tier), \(run.note)):\n\(detail)")
    }

    /// Every mismatch in one run, as text. Returning them all rather than
    /// stopping at the first is deliberate: the shape of a divergence (one field
    /// everywhere, or everything after answer 40) is what names the bug.
    static func replayFailures(_ c: Corpus.Run) -> [String] {
        var out: [String] = []
        let clock = PatchwerkManualClock(0)
        let engine = PatchwerkRun(tier: c.tier, config: .mirrored, clock: clock)

        #expect(engine.tier.durationMs == c.durationMs)

        for (i, a) in c.answers.enumerated() {
            let at = a[0] ?? 0
            let correct = (a[1] ?? 0) == 1
            let level = a[2]
            let answerMs = a[3].map(Double.init)

            // Through the CLOCK, not by passing the time in: the injectable clock
            // is part of what is being proved.
            clock.set(at)
            let ev = engine.answer(correct, level: level, answerMs: answerMs)
            let st = engine.state
            let want = c.events[i]

            let got: [Int] = [
                ev.ignored ? 1 : 0, ev.correct ? 1 : 0, ev.damage, ev.stacks,
                ev.froze ? 1 : 0, ev.earnedFreeze ? 1 : 0, ev.stunMs, ev.enraged ? 1 : 0,
                st.damage, st.stacks, st.maxStacks, st.correct, st.wrong,
                st.freezes, st.freezesUsed, st.earnProgress, st.stunUntilMs,
                st.bossHp, st.bossPhase
            ]
            if got != want {
                for (f, name) in expectedEventFields.enumerated() where got[f] != want[f] {
                    out.append("  answer \(i) @\(at)ms \(correct ? "right" : "wrong") "
                               + "level=\(level.map(String.init) ?? "nil") "
                               + "answerMs=\(a[3].map(String.init) ?? "nil"): "
                               + "\(name) got \(got[f]) want \(want[f])")
                }
            }
        }

        let record = engine.finish(level: c.recordLevel, date: c.record.date)
        if record != c.record { out.append("  record \(record) != \(c.record)") }

        let st = engine.state
        let f = c.finalState
        if st.damage != f.damage { out.append("  final damage \(st.damage) != \(f.damage)") }
        if st.stacks != f.stacks { out.append("  final stacks \(st.stacks) != \(f.stacks)") }
        if st.maxStacks != f.maxStacks { out.append("  final maxStacks \(st.maxStacks) != \(f.maxStacks)") }
        if st.correct != f.correct { out.append("  final correct \(st.correct) != \(f.correct)") }
        if st.wrong != f.wrong { out.append("  final wrong \(st.wrong) != \(f.wrong)") }
        if st.freezes != f.freezes { out.append("  final freezes \(st.freezes) != \(f.freezes)") }
        if st.freezesUsed != f.freezesUsed { out.append("  final freezesUsed \(st.freezesUsed) != \(f.freezesUsed)") }
        if st.earnProgress != f.earnProgress { out.append("  final earnProgress \(st.earnProgress) != \(f.earnProgress)") }
        if st.stunUntilMs != f.stunUntilMs { out.append("  final stunUntilMs \(st.stunUntilMs) != \(f.stunUntilMs)") }
        if st.bossHp != f.bossHp { out.append("  final bossHp \(st.bossHp) != \(f.bossHp)") }
        if st.bossPhase != f.bossPhase { out.append("  final bossPhase \(st.bossPhase) != \(f.bossPhase)") }
        if st.enraged != f.enraged { out.append("  final enraged \(st.enraged) != \(f.enraged)") }
        if st.ended != f.ended { out.append("  final ended \(st.ended) != \(f.ended)") }
        return out
    }

    @Test("All 300 runs, counted - the number this lane reports")
    func allThreeHundred() {
        var failed: [Int] = []
        for run in Self.corpus.runs where !Self.replayFailures(run).isEmpty { failed.append(run.id) }
        #expect(failed.isEmpty, "runs that diverged: \(failed)")
        #expect(Self.corpus.runs.count == 300)
    }
}
