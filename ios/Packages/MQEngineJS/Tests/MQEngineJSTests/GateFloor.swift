import Foundation
import Testing

/// swift-testing's `#expect` / `Issue.record` take a `Comment`, which is
/// `ExpressibleByStringLiteral` - so ONE string literal works and a concatenation of two
/// does not. This turns a built-up sentence into a comment, which is what lets a failure
/// message say the whole thing instead of a clause.
func note(_ text: String) -> Comment { Comment(rawValue: text) }

/// The floors this repo's gate stands on, and the refusal that keeps an environment
/// variable from lowering them.
///
/// # Wound 2 of the extract refutation
///
///     MQ_CUBE_PARITY_ROWS=1 MQ_CUBE_SOLVES=1 MQ_DRAWS=1 ios/test.command
///       -> 80 tests, floor cleared, GATE PASSED, in 1.3 s instead of 5.4 s
///
/// `CubeParityCorpusTests` capped its rows from the environment and then asserted
/// `checked == rows.count`, which is true for any cap. The headline "20,000 rows" and
/// "50,000 questions" were environment-controlled with no floor at all, and the gate
/// reported success identically. A CI line, a stale shell, an exported variable in
/// somebody's profile, and the light stays green over two rows.
///
/// Two things close it, and they are different things:
///
/// * **`MQ_GATE=1` REFUSES the overrides.** `ios/test.command` exports it on an
///   unfiltered run - which is the only kind of run the floor applies to - and any
///   sample-size knob set at the same time is a FAILURE naming the variable, not a
///   silently honoured cap. A developer's fast edit loop (`--filter`) is untouched,
///   because that run never claimed to be the gate.
/// * **`ios/gate-floor.txt` records the SAMPLE SIZES as well as the test count.** So a
///   suite that keeps its name and quietly measures a tenth as much is caught by the same
///   file, and in the same way, as a suite that disappears: a number in a committed file
///   that somebody has to lower in the diff.
///
/// DUPLICATED, deliberately, in `MQCubeEngineJSTests`. The two test targets share no
/// module and `module = package = lane` is the brief's own rule; a hundred lines in each is
/// a smaller bet than a shared test-support target that couples the cube lane to the
/// question lane. The two copies differ in exactly one function, `repoRoot()`.
enum GateFloor {

    /// Walk up from this source file to the repo root. `MQEngineJS` has no public
    /// locator to borrow, so this is the same walk `ParityCorpusTests.corpusURL()` does.
    static func repoRoot() -> URL? {
        var dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        for _ in 0..<10 {
            if FileManager.default.fileExists(atPath: dir.appendingPathComponent("package.json").path),
               FileManager.default.fileExists(atPath: dir.appendingPathComponent("ios/gate-floor.txt").path) {
                return dir
            }
            dir = dir.deletingLastPathComponent()
        }
        return nil
    }

    /// Set by `ios/test.command` on an unfiltered run. Nothing else should set it.
    static var isGateRun: Bool { ProcessInfo.processInfo.environment["MQ_GATE"] == "1" }

    // MARK: - The floor file

    /// `ios/gate-floor.txt`, parsed as `key: number` lines. The first bare number stays
    /// the executed-test floor for `test.command`'s own `grep`; everything keyed is for
    /// the suites.
    private static let parsed: [String: Int] = {
        var out: [String: Int] = [:]
        guard let root = repoRoot(),
              let text = try? String(contentsOf: root.appendingPathComponent("ios/gate-floor.txt"),
                                     encoding: .utf8)
        else { return out }
        for line in text.split(separator: "\n", omittingEmptySubsequences: false) {
            let t = line.trimmingCharacters(in: .whitespaces)
            guard !t.hasPrefix("#"), let colon = t.firstIndex(of: ":") else { continue }
            let key = String(t[t.startIndex..<colon]).trimmingCharacters(in: .whitespaces)
            let rest = String(t[t.index(after: colon)...]).trimmingCharacters(in: .whitespaces)
            let digits = rest.prefix { $0.isNumber }
            if !key.isEmpty, let n = Int(digits) { out[key] = n }
        }
        return out
    }()

    /// A recorded floor. A MISSING key is a failure on a gate run, never a default that
    /// quietly becomes zero - that is the same false green one layer along.
    static func floor(_ key: String, orFailWith fallback: Int) -> Int {
        if let n = parsed[key] { return n }
        Issue.record(note("ios/gate-floor.txt carries no `\(key):` line. The sample-size floors are part "
                     + "of the gate, not an optional extra; add it in the same commit as the test."))
        return fallback
    }

    // MARK: - The refusal

    /// Read a sample-size knob. On a gate run, a knob that is SET is a failure and the
    /// recorded floor is used instead; off the gate, it is honoured.
    ///
    /// Returning the floor rather than the cap matters: a test that recorded an Issue and
    /// then went on to measure two rows would report two failures for one cause and bury
    /// the real one.
    static func sampleSize(env name: String, floorKey: String, default fallback: Int) -> Int {
        let want = floor(floorKey, orFailWith: fallback)
        let raw = ProcessInfo.processInfo.environment[name]
        guard let raw, !raw.isEmpty else { return want }
        if isGateRun {
            Issue.record(note("\(name)=\(raw) is set on a GATE run. Sample-size knobs are for a fast edit "
                         + "loop, never for the gate: MQ_CUBE_PARITY_ROWS=1 MQ_CUBE_SOLVES=1 MQ_DRAWS=1 "
                         + "used to print \"GATE PASSED\" in 1.3 s over two rows. Unset it, or run "
                         + "with --filter, which does not claim to be the gate."))
            return want
        }
        return Int(raw) ?? want
    }

    /// Assert a measured sample actually cleared its recorded floor. The second half of
    /// wound 2: `#expect(checked == rows.count)` is true for any cap, so the count has to
    /// be compared against a number in a committed file rather than against itself.
    static func expectAtLeast(_ measured: Int, floorKey: String, default fallback: Int,
                              what: String,
                              sourceLocation: SourceLocation = #_sourceLocation) {
        let want = floor(floorKey, orFailWith: fallback)
        #expect(measured >= want, note("\(what): \(measured) is below the floor of \(want) recorded in ios/gate-floor.txt. "
                + "If the drop is deliberate, lower the floor in the same commit, so it appears in "
                + "the diff and somebody has to justify it."),
                sourceLocation: sourceLocation)
    }
}
