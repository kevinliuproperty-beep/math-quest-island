import Foundation
import Testing
import MQContent
@testable import MQEngineJS

/// SWIFT half of the grading parity gate.
///
/// `tools/fixtures/parity-corpus.json` holds ~10,000 `{question, answer}` pairs -
/// every generator ref the engine has, crossed with the fourteen ways a child (or an
/// iPad keyboard, or a paste) spells an answer, plus a unicode/control fuzz band and
/// the hand-built numeric edges - each with the verdict **node** produced for it.
/// `tools/parity-test.mjs` re-grades the same file in node and asserts the same
/// expectations. Both sides matching the same recorded verdicts is pairwise agreement
/// between the two runtimes: no pair can be graded one way here and another way there
/// without one of the two harnesses going red and naming the pair.
///
/// WHY IT EXISTS. The refuter killed this branch on a node/Swift divergence on the
/// child's own input path: a typed fraction whose reduced numerator exceeded `Int64`
/// ("99999999999999999999/3") made `grade()` THROW in Swift where node returned an
/// ordinary "wrong value or unit" verdict, because `Verdict.Parsed.frac` was `[Int]?`
/// and `reduceFrac` in `js/core.js` returns unbounded JavaScript numbers. The brief's
/// rule is that any divergence between node and Swift is a bridge bug. That answer is
/// in this corpus (`edge/kill2-huge-numerator`) along with everything in its family.
///
/// **A throw is a divergence.** Grading must never raise where node returns a verdict,
/// so decode failures are counted and reported as loudly as wrong verdicts.
@Suite("Grading parity corpus (node <-> Swift)")
struct ParityCorpusTests {

    // MARK: - The fixture

    struct Corpus: Decodable {
        struct Counts: Decodable {
            let questions: Int, pairs: Int, wide: Int, fuzz: Int, edge: Int, refs: Int, drawsPerRef: Int
        }
        struct Against: Decodable { let stamp: String; let payloadHash: String }
        struct Expect: Decodable, Equatable {
            let correct: Bool
            let kind: String
            let reason: String?
            let expectedIndex: Int
            let chosenIndex: Int
            let parsedOk: Bool?
            let parsedValue: Double?
            let parsedUnit: String?
            let parsedFrac: [Double]?
            let parsedReason: String?
        }
        struct Pair: Decodable {
            let q: Int
            let set: String
            let name: String
            let answer: Answer
            let expect: Expect
        }
        let counts: Counts
        let generatedAgainst: Against
        let questions: [Question]
        let pairs: [Pair]
    }

    /// The corpus is a COMMITTED fixture at `tools/fixtures/parity-corpus.json`, found
    /// by walking up from this source file - the same way `EngineBundleLocator` finds
    /// `dist/`. A missing corpus is a hard failure, never a skip: a gate that quietly
    /// runs nothing is the exact failure class this branch was killed for.
    static func corpusURL() throws -> URL {
        var dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        for _ in 0..<10 {
            let candidate = dir.appendingPathComponent("tools/fixtures/parity-corpus.json")
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
            dir = dir.deletingLastPathComponent()
        }
        throw ParityError.corpusMissing
    }

    enum ParityError: Error, CustomStringConvertible {
        case corpusMissing
        var description: String {
            "tools/fixtures/parity-corpus.json not found. It is a committed fixture, not a build "
            + "output; regenerate it with `node tools/make-parity-corpus.mjs`."
        }
    }

    static func loadCorpus() throws -> Corpus {
        let data = try Data(contentsOf: try corpusURL())
        return try JSONDecoder().decode(Corpus.self, from: data)
    }

    // MARK: - Comparison

    /// Doubles are compared bit-for-bit on purpose. Both runtimes parse the SAME JSON
    /// text, so they hold the same `Double`; only the two runtimes' *printing* differs,
    /// and printing is not in the comparison. `-0 == 0` in IEEE terms, which is also
    /// what JavaScript's `===` says, so no special case is needed.
    private static func sameDouble(_ a: Double?, _ b: Double?) -> Bool {
        switch (a, b) {
        case (nil, nil): return true
        case (let x?, let y?): return x == y || (x.isNaN && y.isNaN)
        default: return false
        }
    }

    private static func differences(_ got: Verdict, _ want: Corpus.Expect) -> [String] {
        var diffs: [String] = []
        func eq<T: Equatable>(_ field: String, _ a: T, _ b: T) {
            if a != b { diffs.append("\(field): got \(a) want \(b)") }
        }
        eq("correct", got.correct, want.correct)
        eq("kind", got.kind.rawValue, want.kind)
        eq("reason", got.reason, want.reason)
        eq("expectedIndex", got.expectedIndex, want.expectedIndex)
        eq("chosenIndex", got.chosenIndex, want.chosenIndex)
        eq("parsedOk", got.parsed?.ok, want.parsedOk)
        eq("parsedUnit", got.parsed?.unit, want.parsedUnit)
        eq("parsedReason", got.parsed?.reason, want.parsedReason)

        if !sameDouble(got.parsed?.value, want.parsedValue) {
            diffs.append("parsedValue: got \(String(describing: got.parsed?.value)) "
                         + "want \(String(describing: want.parsedValue))")
        }
        let gotFrac = got.parsed?.frac
        let wantFrac = want.parsedFrac
        let fracEqual: Bool
        switch (gotFrac, wantFrac) {
        case (nil, nil): fracEqual = true
        case (let g?, let w?):
            fracEqual = g.count == w.count && zip(g, w).allSatisfy { sameDouble($0, $1) }
        default: fracEqual = false
        }
        if !fracEqual {
            diffs.append("parsedFrac: got \(String(describing: gotFrac)) want \(String(describing: wantFrac))")
        }
        return diffs
    }

    // MARK: - The gate

    @Test("every pair in the corpus grades in Swift exactly as it graded in node")
    func gradingMatchesNodePairwise() async throws {
        let corpus = try Self.loadCorpus()
        let e = try JSQuestionEngine()

        // Sanity on the fixture itself, so a truncated or half-written corpus cannot
        // pass by grading three pairs.
        #expect(corpus.questions.count == corpus.counts.questions,
                "corpus declares \(corpus.counts.questions) questions, carries \(corpus.questions.count)")
        #expect(corpus.pairs.count == corpus.counts.pairs,
                "corpus declares \(corpus.counts.pairs) pairs, carries \(corpus.pairs.count)")
        #expect(corpus.pairs.count >= 8_580,
                "the parity corpus must stay at or above the refuter's 8,580 pairs (has \(corpus.pairs.count))")
        #expect(corpus.counts.refs == 250, "the corpus must cover every generator ref")

        // WOUND 4 of the cube-extract refutation, and it was found on THIS file: the same
        // commit had two policies for the same failure class. `CubeParityCorpusTests`
        // asserted its corpus was recorded against the running bundle; this one PRINTED it
        // and passed - one line inside a 58-line log that `test.command` greps only for the
        // summary.
        //
        // A stale corpus is not a nag. It holds node's answers for an OLDER engine, so
        // "Swift agrees with the file" stops meaning "node and Swift agree today" while the
        // light stays green. Same failure class, same policy: an expectation.
        let build = try await e.engineBuild()
        #expect(build.payloadHash == corpus.generatedAgainst.payloadHash, note("the parity corpus was recorded against payload \(corpus.generatedAgainst.payloadHash) "
                + "and the bundle is \(build.payloadHash). Agreement with a corpus recorded against "
                + "different logic proves nothing. Regenerate: `npm run build:parity-corpus`."))

        var divergences = 0
        var throwsCount = 0
        var graded = 0
        var reported = 0

        // Batched across the bridge exactly as the app would batch, 500 at a time.
        let batchSize = 500
        var index = 0
        while index < corpus.pairs.count {
            let slice = Array(corpus.pairs[index..<min(index + batchSize, corpus.pairs.count)])
            index += slice.count

            let pairs = slice.map { (question: corpus.questions[$0.q], answer: $0.answer) }

            let verdicts: [Verdict]
            do {
                verdicts = try await e.grade(pairs)
            } catch {
                // A THROW where node returned verdicts is itself the divergence class
                // that killed this branch. Fall back to one-at-a-time so the report
                // names the offending pair instead of the batch.
                var recovered: [Verdict] = []
                for (i, p) in pairs.enumerated() {
                    do {
                        recovered.append(try await e.grade(question: p.question, answer: p.answer))
                    } catch {
                        throwsCount += 1
                        if reported < 20 {
                            reported += 1
                            let where_ = "\(slice[i].set)/\(slice[i].name)"
                            Issue.record("THREW where node returned a verdict: \(where_) answer=\(slice[i].answer) error=\(error)")
                        }
                        recovered.append(Verdict(correct: false, kind: .typed, questionId: nil,
                                                 expectedIndex: -1, expectedText: "", chosenIndex: -1,
                                                 reason: "swift-threw", parsed: nil, typedRaw: nil))
                    }
                }
                verdicts = recovered
            }

            #expect(verdicts.count == slice.count)
            for (i, pair) in slice.enumerated() where i < verdicts.count {
                graded += 1
                let diffs = Self.differences(verdicts[i], pair.expect)
                if !diffs.isEmpty {
                    divergences += 1
                    if reported < 20 {
                        reported += 1
                        Issue.record("DIVERGED \(pair.set)/\(pair.name): \(diffs.joined(separator: "; "))")
                    }
                }
            }
        }

        print("parity corpus: \(graded) pairs graded through the bridge "
              + "(wide \(corpus.counts.wide), fuzz \(corpus.counts.fuzz), edge \(corpus.counts.edge)) - "
              + "\(divergences) divergence(s), \(throwsCount) throw(s)")
        #expect(graded == corpus.pairs.count, "not every pair was graded")
        #expect(throwsCount == 0, "grading threw on \(throwsCount) pair(s) where node returned a verdict")
        #expect(divergences == 0, "\(divergences) node/Swift divergence(s) of \(graded) pairs")
    }

    /// Kill 2, stated as its own named test so a regression is unmissable in the log
    /// rather than one line inside a ten-thousand-pair sweep.
    @Test("a fraction whose reduced numerator exceeds Int64 returns a verdict, it does not throw")
    func hugeNumeratorReturnsAVerdict() async throws {
        let corpus = try Self.loadCorpus()
        let e = try JSQuestionEngine()

        let named = ["kill2-huge-numerator", "kill2-huge-numerator-negative", "kill2-huge-mixed-number",
                     "huge-denominator", "both-huge", "key-1e21", "key-minus-zero",
                     "key-max-safe-plus-two", "frac-key-huge", "choice-key-correct-huge"]
        for name in named {
            guard let pair = corpus.pairs.first(where: { $0.name == name }) else {
                Issue.record("the corpus no longer carries the \(name) edge case"); continue
            }
            let v = try await e.grade(question: corpus.questions[pair.q], answer: pair.answer)
            let diffs = Self.differences(v, pair.expect)
            #expect(diffs.isEmpty, "\(name): \(diffs.joined(separator: "; "))")
        }
    }

    /// `Int(someDouble)` past `Int64` is a trap in Swift, not an error: an unguarded one
    /// in `Question.selfAnswer` killed the process (exit 133) on a key answer of `1e21`.
    /// These assertions are cheap and they are load-bearing.
    @Test("no engine-supplied number can trap a fixed-width Swift integer")
    func engineNumbersNeverTrapAnInteger() throws {
        // 9007199254740993 is the classic "JS holds ...992" case; written as a Double
        // expression so the compiler does not warn about the literal it cannot hold.
        for d in [1e21, -1e21, 9.9e300, -9.9e300, .infinity, -.infinity, Double.nan,
                  9_007_199_254_740_992 + 1, -0.0, 0.1 + 0.2, 5e-324] as [Double] {
            let v = JSONValue.number(d)
            _ = v.intValue          // must be nil out of range, never a trap
            _ = v.clampedIntValue   // must saturate, never a trap
            _ = JSONValue.numberText(d)
            _ = try? JSONEncoder().encode(v)
        }
        #expect(JSONValue.number(1e21).intValue == nil, "1e21 does not fit an Int and must not pretend to")
        #expect(JSONValue.number(1e21).clampedIntValue == JSONValue.jsSafeInteger)
        #expect(JSONValue.number(-1e21).clampedIntValue == -JSONValue.jsSafeInteger)
        #expect(JSONValue.number(Double.nan).clampedIntValue == nil)
        #expect(JSONValue.numberText(-0.0) == "0", "JavaScript prints -0 as 0")
        #expect(JSONValue.numberText(113) == "113")
        #expect(JSONValue.numberText(4.75) == "4.75")

        // The whole point: a Question whose key answer is 1e21 must produce a selfAnswer
        // rather than take the process down.
        let corpus = try Self.loadCorpus()
        for q in corpus.questions where q.isTyped {
            _ = q.selfAnswer
        }
    }

    /// A malformed verdict must still decode into a verdict. Node always returns one;
    /// Swift raising a `DecodingError` here would be the same class of divergence.
    ///
    /// Scope note: a numeric LITERAL outside `Double`'s range (`1e400`) is rejected by
    /// Foundation's JSON parser before Codable is reached, and nothing can be done
    /// about that at this layer. It is also unreachable - `JSON.stringify` emits
    /// `null` for Infinity and NaN, so the engine cannot produce such a literal. Every
    /// number the engine CAN emit is inside `Double` and is covered here.
    @Test("a malformed or hostile verdict payload decodes rather than throwing")
    func verdictDecodeIsTotal() throws {
        let payloads = [
            #"{}"#,
            #"{"correct":true}"#,
            #"{"correct":1,"kind":"typed"}"#,
            #"{"correct":false,"kind":"nonsense","expectedIndex":1e21,"chosenIndex":-1e21}"#,
            #"{"correct":false,"kind":"typed","parsed":"not an object"}"#,
            #"{"correct":false,"kind":"typed","parsed":{"ok":true,"value":1.7e308,"frac":[1e20,3]}}"#,
            #"{"correct":false,"kind":"typed","parsed":{"ok":true,"value":5e-324,"frac":[100000000000000000000,3]}}"#,
            #"{"correct":false,"kind":"typed","parsed":{"ok":true,"frac":[]}}"#,
            #"{"correct":false,"kind":"typed","parsed":{"ok":null,"unit":null,"reason":null}}"#,
            #"{"correct":false,"kind":"typed","reason":42,"typedRaw":null}"#,
            #"{"correct":false,"kind":"choice","expectedIndex":"0","chosenIndex":"1"}"#,
            #"{"correct":false,"kind":"typed","parsed":{"ok":true,"value":-0,"unit":"","frac":null}}"#
        ]
        for json in payloads {
            let v = try? JSONDecoder().decode(Verdict.self, from: Data(json.utf8))
            #expect(v != nil, "a verdict payload must never fail to decode: \(json)")
        }
        // Specifically: a numerator past Int64 lands intact as a Double.
        let huge = try JSONDecoder().decode(
            Verdict.self,
            from: Data(#"{"correct":false,"kind":"typed","parsed":{"ok":true,"value":3.3e19,"unit":"","frac":[100000000000000000000,3]}}"#.utf8))
        #expect(huge.parsed?.frac?.first == 1e20, "the 20-digit numerator must survive as a Double")
    }
}
