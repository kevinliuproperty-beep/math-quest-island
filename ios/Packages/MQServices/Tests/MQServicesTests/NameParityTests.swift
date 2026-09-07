import Testing
import Foundation
import CryptoKit
import MQServices

/// `MQNameFilter` says it carries `api/leaderboard.js`'s rule VERBATIM. This is
/// the corpus that makes that a claim rather than a comment.
///
/// The refutation of 2026-09-07 ran 3,043 unicode names through the real JS rule
/// in node and through `MQNameFilter.clean`: **704 diverged.** A separate
/// ASCII-only fuzz of 4,010 names diverged on nothing, which is exactly why the
/// lane's six hand-written name tests never saw it. The mechanism was that a JS
/// regex without `/u` walks UTF-16 code units - so decomposed "José" loses the
/// combining mark and keeps the "e", giving "Jose" - while Swift's
/// `String.filter` walks grapheme clusters and threw the base letter away with
/// the accent, giving "Jos". Decomposed text is not exotic on Apple platforms.
///
/// | raw (NFD)      | web        | iOS, before |
/// |----------------|------------|-------------|
/// | `José`        | `Jose`     | `Jos`       |
/// | `Ångström`  | `Angstrom` | `ngstrm`    |
/// | `café`        | `cafe`     | `caf`       |
///
/// The corpus is the SAME 7,053 names, regenerated deterministically by
/// `tools/make-name-parity.mjs`, which lifts the rule out of the web file by line
/// rather than re-typing it.
@Suite("Leaderboard names agree with the web, byte for byte")
struct NameParityTests {

    struct Corpus: Decodable, Sendable {
        let schema: String
        let source: String
        let apiSha256: String
        let asciiCount: Int
        let unicodeCount: Int
        let caseCount: Int
        let rule: [String]
        let cases: [Case]

        struct Case: Decodable, Sendable { let raw: String; let web: String }
    }

    static func repoFile(_ relative: String) -> URL? {
        var dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        for _ in 0..<10 {
            let candidate = dir.appendingPathComponent(relative)
            if FileManager.default.fileExists(atPath: candidate.path) { return candidate }
            dir = dir.deletingLastPathComponent()
        }
        return nil
    }

    static let corpus: Corpus = {
        guard let url = repoFile("tools/fixtures/leaderboard-names.json") else {
            fatalError("tools/fixtures/leaderboard-names.json not found. It is a committed "
                       + "fixture; regenerate it with `node tools/make-name-parity.mjs`.")
        }
        return try! JSONDecoder().decode(Corpus.self, from: try! Data(contentsOf: url))
    }()

    /// The same pin the scoring corpus carries: the recording is worthless if
    /// nothing forces it to stay a recording of the file it names.
    @Test("The name corpus is pinned to the api/leaderboard.js it was recorded from")
    func corpusPinnedToSource() throws {
        let c = Self.corpus
        #expect(c.schema == "leaderboard-names/1")
        #expect(c.source == "api/leaderboard.js")
        #expect(c.caseCount == c.cases.count)
        #expect(c.asciiCount == 4_010)
        #expect(c.unicodeCount == 3_043)
        #expect(c.cases.count == 7_053)

        let url = try #require(Self.repoFile("api/leaderboard.js"))
        let digest = SHA256.hash(data: try Data(contentsOf: url))
            .map { String(format: "%02x", $0) }.joined()
        #expect(digest == c.apiSha256,
                """
                tools/fixtures/leaderboard-names.json was recorded from a DIFFERENT \
                api/leaderboard.js than the one on disk.
                  corpus says  \(c.apiSha256)
                  file is      \(digest)
                Regenerate: node tools/make-name-parity.mjs   (and commit the result)
                """)
        // The two lines the corpus was computed from, so a reader can see the rule
        // without running node.
        #expect(c.rule.count == 2)
        #expect(c.rule[0].contains("replace(/[^\\w \\-]/g,'')"))
        #expect(c.rule[1].contains("BAD.some"))
    }

    @Test("Every one of the 7,053 recorded names filters the same on iOS")
    func everyNameAgrees() {
        var diffs: [String] = []
        for c in Self.corpus.cases where MQNameFilter.clean(c.raw) != c.web {
            diffs.append("raw=\(c.raw.debugDescription) web=\(c.web.debugDescription) "
                         + "ios=\(MQNameFilter.clean(c.raw).debugDescription)")
        }
        let detail = diffs.prefix(20).joined(separator: "\n")
        #expect(diffs.isEmpty,
                "\(diffs.count) of \(Self.corpus.cases.count) names filter differently on iOS:\n\(detail)")
    }

    /// The corpus has to CONTAIN the divergence class, or it is 7,053 names that
    /// prove nothing. Decomposed input must be present, and it must be the kind
    /// where the base letter survives on both sides.
    @Test("The corpus actually exercises decomposed input")
    func corpusCoversDecomposition() {
        let decomposed = Self.corpus.cases.filter { c in
            c.raw.unicodeScalars.contains { (0x0300...0x036F).contains($0.value) }
        }
        #expect(decomposed.count > 200,
                "only \(decomposed.count) decomposed names - the corpus does not cover the class of defect it was written for")
        // At least some of them must keep their base letters: a corpus where every
        // accented name collapses to "Hero" would pass under the old bug too.
        let keepsBase = decomposed.filter { $0.web != MQNameFilter.fallback && !$0.web.isEmpty }
        #expect(keepsBase.count > 100)

        let nonBMP = Self.corpus.cases.filter { c in
            c.raw.unicodeScalars.contains { $0.value > 0xFFFF }
        }
        #expect(nonBMP.count > 50, "no non-BMP names: the surrogate-pair case is untested")
    }

    /// The named cases from the refutation, spelled out. A regression here should
    /// name itself rather than appear as "1 of 7,053".
    @Test("The named cases from the refutation")
    func theNamedCases() {
        let cases: [(String, String)] = [
            ("Jose\u{0301}", "Jose"),
            ("Zoe\u{0308}", "Zoe"),
            ("A\u{030A}ngstro\u{0308}m", "Angstrom"),
            ("cafe\u{0301}", "cafe"),
            (String(repeating: "e\u{0301}", count: 20), "eeeeeeeeeeeeee")
        ]
        for (raw, want) in cases {
            let got = MQNameFilter.clean(raw)
            #expect(got == want,
                    "\(raw.debugDescription) -> \(got.debugDescription), web says \(want.debugDescription)")
        }
        // And the PRECOMPOSED forms still behave the way the type documents: the
        // web's rule is ASCII, so an accent that is one scalar takes its letter
        // with it. This is inherited, not a bug, and it stays inherited.
        #expect(MQNameFilter.clean("Zo\u{00EB}") == "Zo")
        #expect(MQNameFilter.clean("Jos\u{00E9}") == "Jos")
    }
}
