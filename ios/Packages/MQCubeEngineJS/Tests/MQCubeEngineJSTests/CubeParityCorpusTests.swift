import Testing
import Foundation
@testable import MQCubeEngineJS
import MQCubeContent

/// The permanent form of "node and JavaScriptCore agree".
///
/// `tools/fixtures/cube-parity-corpus.json` holds 10,000 seeded scramble-and-undo round
/// trips PER SIZE, recorded by node running the committed bundle. `tools/cube-parity-test.mjs`
/// replays them in node; this suite replays the same rows inside JavaScriptCore. Neither
/// side ever sees the other, so agreement with the file IS agreement between the runtimes -
/// the same shape the question engine's grading corpus uses, and for the same reason: a
/// corpus generated per run on each side proves only that each side agrees with itself.
///
/// This can be a fixed file only because the cube engine is deterministic: `scramble` takes
/// a SEED and runs the core's own `randomScramble` against a mulberry32, never `Math.random`.
@Suite("Cube parity corpus")
struct CubeParityCorpusTests {

    /// Every row by default. MQ_CUBE_PARITY_ROWS caps it for a fast edit loop; the gate
    /// value is the whole file.
    static var rowCap: Int {
        Int(ProcessInfo.processInfo.environment["MQ_CUBE_PARITY_ROWS"] ?? "") ?? Int.max
    }

    @Test("the corpus was recorded against the bundle that is about to be tested")
    func corpusIsFresh() async throws {
        let corpus = try CubeFixtures.parityCorpus()
        let build = try await JSCubeEngine().cubeBuild()
        #expect(corpus.payloadHash == build.payloadHash,
                "the corpus was recorded against payload \(corpus.payloadHash) and the bundle is \(build.payloadHash) - run `npm run build:cube-parity-corpus`")
        #expect(corpus.rowsPerSize == 10_000)
        #expect(corpus.sizes.count == 2)
    }

    @Test("10,000 seeded round trips reproduce inside JavaScriptCore",
          arguments: CubeSize.allCases)
    func roundTripsAgreeWithNode(size: CubeSize) async throws {
        let corpus = try CubeFixtures.parityCorpus()
        guard let band = corpus.sizes[String(size.rawValue)] else {
            Issue.record("the corpus has no \(size.rawValue)x\(size.rawValue) band")
            return
        }
        let e = try JSCubeEngine()
        #expect(try await e.newSolved(size: size).key == band.solvedKey)

        let rows = band.rows.prefix(Self.rowCap)
        var diverged = 0
        var first: String?
        var checked = 0

        for (index, row) in rows.enumerated() {
            let s = try await e.scramble(size: size, seed: row.seed, depth: row.depth)
            var why: String?
            if s.moves.joined(separator: " ") != row.moves {
                why = "moves \(row.moves) -> \(s.moves.joined(separator: " "))"
            } else if s.key != row.keyAfter {
                why = "key \(row.keyAfter) -> \(s.key)"
            } else if s.movesHash != CubeFixtures.fnv1a(row.moves) {
                why = "movesHash \(s.movesHash ?? "nil") does not match the moves"
            }

            if why == nil {
                let applied = try await e.applyMoves(size: size, state: s.state, moves: s.moves)
                let undone = try await e.applyMoves(size: size, state: s.state, moves: applied.inverse)
                let wantBack = row.back ?? band.solvedKey
                if undone.key != wantBack {
                    why = "round trip \(wantBack) -> \(undone.key)"
                } else {
                    let stickers = try await e.stickers(size: size, state: s.state)
                    let fnv = CubeFixtures.fnv1a(stickers.joined(separator: ","))
                    if fnv != row.stickersFnv { why = "stickers \(row.stickersFnv) -> \(fnv)" }
                }
            }

            checked += 1
            if let why {
                diverged += 1
                if first == nil { first = "row \(index) (seed \(row.seed), depth \(row.depth)): \(why)" }
            }
        }

        #expect(checked == rows.count)
        #expect(diverged == 0,
                "\(size.rawValue)x\(size.rawValue): \(diverged) of \(checked) rows diverged from node. First: \(first ?? "-")")
    }

    @Test("the corpus is not secretly trivial")
    func corpusHasTeeth() throws {
        let corpus = try CubeFixtures.parityCorpus()
        for size in CubeSize.allCases {
            guard let band = corpus.sizes[String(size.rawValue)] else { continue }
            #expect(band.rows.count == 10_000)
            // distinct seeds, spread depths, and 10,000 genuinely different cubes: a
            // corpus of one repeated row would pass every check above and prove nothing.
            #expect(Set(band.rows.map(\.seed)).count == band.rows.count, "seeds repeat")
            #expect(Set(band.rows.map(\.depth)).count >= 25, "the depths barely vary")
            let distinctKeys = Set(band.rows.map(\.keyAfter)).count
            #expect(distinctKeys > 9_000, "only \(distinctKeys) distinct cubes in 10,000 rows")
            #expect(band.wandered == 0, "a round trip that did not come back is recorded; investigate")
        }
    }
}
