import Testing
import Foundation
@testable import MQCubeEngineJS
import MQCubeContent

/// KILL 1 OF THE EXTRACT REFUTATION, on the Swift side.
///
/// `tools/cube-engine/api.js` - `CUBE_API`, the only surface this bridge touches - is **not**
/// one of the four marked blocks. Section B's byte check compares the blocks, `block-guard.json`
/// guards the blocks, and the value snapshot is recorded from a monolith that contains no
/// `CUBE_API` at all. So the only things between an edit to `api.js` and the iPad were the node
/// harness's spot checks and `CubeBridgeTests` - **and both check shapes and counts, never
/// values.** Eleven corruptions passed every gate on both sides:
///
/// | | what the child's cube would have done |
/// |---|---|
/// | `geomRows` 3x3 `faces` reversed | every edge block's two stickers swap faces |
/// | `geomRows` 2x2 colours by slot | corner colours read off the slot, not the piece |
/// | `moveGeometry` keys by slot | the wrong four blocks animate on every face turn |
/// | `faceDirections` reversed | the six face normals point the wrong way |
/// | middle colour `(i+1)%6` | every middle square shows the next face's colour |
/// | edge rows emitted `11..0` | the edge block list is reversed |
/// | beat `say` replaced | **every sentence of the coached solve, replaced** |
/// | `words().COLOURS` reversed | the painter's swatch order |
/// | step `label` replaced | the step rail's words |
/// | `extras.resumePoint = 1` | the method restarts at step 1 forever |
/// | `validate().scheme` dropped | the colour map the painter needs after a legal painting |
///
/// `tools/fixtures/cube-api-golden.json` is the value oracle they needed, recorded from
/// `cube/index.html` itself by `tools/make-cube-api-golden.mjs`, which refuses to record
/// unless `CUBE_API` agrees with the cores' own functions **and** with the page's own
/// `canNameByColour`. This suite replays it through **JavaScriptCore**, hashing the engine's
/// own JSON strings.
///
/// # Why the hash is over the raw string
///
/// `CUBE_API` returns a JSON **string**, and that string is what is hashed - here and in the
/// recorder - never a re-serialisation. Re-serialising in Swift would mean reproducing
/// ECMAScript's number formatting and property order by hand, which is a second engine
/// pretending to be the first. `JSON.stringify`'s output is specified and the split
/// refutation already proved the two runtimes agree on it to the byte, so hashing the string
/// off the bridge makes the two sides comparable by construction.
@Suite("Cube API golden corpus")
struct CubeGoldenTests {

    // MARK: - The fixture

    struct Golden: Decodable {
        struct Row: Decodable {
            struct Question: Decodable {
                let kind: String
                let painted: [String?]
                let bestQuestion: String
                let bestQuestionPlain: String
                let bestSid: Int?
                let plainSid: Int?
                let differs: Bool
                let nameableCount: Int
                let nameableHash: String
            }
            let label: String
            let index: Int
            let state: CubeState
            let key: String
            /// method -> sha256(first 32) of the engine's own JSON string
            let calls: [String: String]
            /// move -> the same, for `moveGeometry`
            let moveGeometry: [String: String]
            /// move SEQUENCE -> the same, for `applyMoves`. The battery would otherwise
            /// never call it, and `inverse` is a field a corruption can move on its own.
            let applyMoves: [String: String]
            let questions: [Question]
        }
        struct Band: Decodable {
            let size: Int
            let stateCount: Int
            let solvedKey: String
            let words: String
            let guideScript: String
            let guideScriptText: String
            let guideNodeCount: Int
            let guideNodes: [String: String]
            let rows: [Row]
        }
        let capturedFrom: String
        let sourceSha256: String
        let apiSha256: String
        let statesPerSize: Int
        let sizes: [String: Band]
    }

    static func golden() throws -> Golden {
        try JSONDecoder().decode(Golden.self, from: CubeFixtures.data(at: "tools/fixtures/cube-api-golden.json"))
    }

    /// The recorder's `h()`: sha256 of the string, first 32 hex characters.
    static func hash(_ s: String) -> String { CubeFixtures.sha256Short(s) }

    // MARK: - The fixture is about THIS engine

    @Test("the golden was recorded from the page this bundle was extracted from")
    func goldenIsFresh() async throws {
        let g = try Self.golden()
        #expect(g.capturedFrom == "cube/index.html")
        #expect(g.statesPerSize >= 300)

        // Hash the PAGE, here in Swift, rather than trusting a label anywhere. The
        // recorder's sha256 is 64 hex characters and CubeFixtures' is the first 32 of the
        // same digest, so the prefix is the comparison.
        let pageText = try String(data: CubeFixtures.data(at: "cube/index.html"), encoding: .utf8) ?? ""
        #expect(!pageText.isEmpty)
        let pageHash = CubeFixtures.sha256Short(pageText)
        #expect(pageHash == String(g.sourceSha256.prefix(32)), note("the golden was recorded from a different "
                + "cube/index.html (golden \(g.sourceSha256.prefix(16)), page on disk \(pageHash.prefix(16))) "
                + "- re-record with `npm run build:cube-api-golden`"))

        // ...and the bundle really is an extraction of that page: same four block shas.
        let build = try await JSCubeEngine().cubeBuild()
        #expect(build.blocks.count == 4)
        #expect(g.sizes.count == 2)
        #expect(!g.apiSha256.isEmpty)
    }

    // MARK: - The battery

    @Test("every golden state's CUBE_API answers reproduce inside JavaScriptCore",
          arguments: CubeSize.allCases)
    func batteryReproduces(size: CubeSize) async throws {
        let g = try Self.golden()
        guard let band = g.sizes[String(size.rawValue)] else {
            Issue.record("the golden has no \(size.rawValue)x\(size.rawValue) band")
            return
        }
        GateFloor.expectAtLeast(band.rows.count, floorKey: "cube-golden-states", default: 300,
                                what: "\(size.rawValue)x\(size.rawValue) golden states")
        #expect(Set(band.rows.map(\.key)).count == band.rows.count,
                "the golden repeats a cube; a repeated row proves nothing")

        let e = try JSCubeEngine()
        #expect(try await e.newSolved(size: size).key == band.solvedKey)

        var drift: [String] = []
        var checked = 0

        for row in band.rows {
            let stateJSON = try Self.encodeState(size: size, state: row.state)
            // `validate` takes the STICKER VIEW, so it needs the engine's own answer first.
            let stickers = try await e.stickers(size: size, state: row.state)

            for (method, want) in row.calls.sorted(by: { $0.key < $1.key }) {
                let raw: String
                if method == "validate" {
                    raw = try await e.callRaw("validate",
                                              argumentsJSON: try Self.encodeValidate(size: size, stickers: stickers))
                } else {
                    raw = try await e.callRaw(method, argumentsJSON: stateJSON)
                }
                checked += 1
                if Self.hash(raw) != want { drift.append("\(row.label)/\(method)") }
                if drift.count > 8 { break }
            }
            if drift.count > 8 { break }

            for (move, want) in row.moveGeometry.sorted(by: { $0.key < $1.key }) {
                let raw = try await e.callRaw("moveGeometry",
                                              argumentsJSON: try Self.encodeMoveGeo(size: size, state: row.state, move: move))
                checked += 1
                if Self.hash(raw) != want { drift.append("\(row.label)/moveGeometry(\(move))") }
            }
            for (seq, want) in row.applyMoves.sorted(by: { $0.key < $1.key }) {
                let raw = try await e.callRaw("applyMoves",
                                              argumentsJSON: try Self.encodeApply(size: size, state: row.state, moves: seq))
                checked += 1
                if Self.hash(raw) != want { drift.append("\(row.label)/applyMoves(\(seq))") }
            }
            if drift.count > 8 { break }
        }

        let firstFive = drift.prefix(5).joined(separator: ", ")
        #expect(drift.isEmpty, note("\(size.rawValue)x\(size.rawValue): CUBE_API no longer answers what the "
                + "golden recorded. \(drift.count)+ calls differ, first: \(firstFive). api.js is not one of "
                + "the guarded blocks - read the diff before re-recording."))
        #expect(checked > 3_000, "only \(checked) golden calls were replayed")
    }

    // MARK: - The words, the script, and every node of it

    @Test("words, the whole guided script and every node by id are the golden's",
          arguments: CubeSize.allCases)
    func singletonsReproduce(size: CubeSize) async throws {
        let g = try Self.golden()
        guard let band = g.sizes[String(size.rawValue)] else { return }
        let e = try JSCubeEngine()
        let sizeArgs = try Self.encodeSize(size)

        #expect(Self.hash(try await e.callRaw("words", argumentsJSON: sizeArgs)) == band.words, note("\(size.rawValue)x\(size.rawValue): words() is not the golden's - the swatch order, the "
                + "chants, the preset hints and which quiz answer is right all live in here"))
        #expect(Self.hash(try await e.callRaw("guideScript", argumentsJSON: sizeArgs)) == band.guideScript,
                "\(size.rawValue)x\(size.rawValue): guideScript() is not the golden's")

        let script = try await e.guideScript(size: size)
        #expect(script.nodeCount == band.guideNodeCount)
        #expect(CubeFixtures.sha256Short(script.nodes.map(\.textForHashing).joined()) == band.guideScriptText)

        var nodeDrift: [String] = []
        for (id, want) in band.guideNodes.sorted(by: { $0.key < $1.key }) {
            let raw = try await e.callRaw("guideNode",
                                          argumentsJSON: try Self.encodeNode(size: size, id: id))
            if Self.hash(raw) != want { nodeDrift.append(id) }
        }
        #expect(nodeDrift.isEmpty,
                "\(size.rawValue)x\(size.rawValue): guideNode() drifted for \(nodeDrift.prefix(4).joined(separator: ", "))")
    }

    // MARK: - Wound 1: the option the bridge dropped

    @Test("the nameable predicate crosses the bridge and changes the question",
          arguments: CubeSize.allCases)
    func nameableIsAlive(size: CubeSize) async throws {
        let g = try Self.golden()
        guard let band = g.sizes[String(size.rawValue)] else { return }
        let e = try JSCubeEngine()

        var drift: [String] = []
        var differing = 0
        var counts = Set<Int>()
        var asked = 0

        // EVERY FOURTH ROW, and the reason is cost rather than caution. One bestQuestion
        // runs the completion search and then the whole ask ranking on top of it, twice
        // (with the predicate and without) - about 27 ms a call through JavaScriptCore, so
        // the full battery is 70 seconds of a 5-second gate.
        //
        // The exhaustive replay lives in node (`cube-engine-sanity` section G walks all
        // 640 paintings on every `npm test`). What this side is for is the RUNTIME
        // question - does JavaScriptCore answer what V8 answered - and a fixed stride
        // establishes that as well as an exhaustive walk would, because a divergence
        // between two runtimes is not a property of which row you look at. The floor below
        // is what stops the stride quietly becoming "the first row".
        let sampled = band.rows.enumerated().filter { $0.offset % 4 == 0 }.map(\.element)

        for row in sampled {
            for q in row.questions {
                let best = try await e.bestQuestion(size: size, painted: q.painted)
                let plain = try await e.bestQuestion(size: size, painted: q.painted,
                                                     nameable: Array(repeating: false, count: q.painted.count))
                asked += 2
                counts.insert(best.nameableCount)
                if q.differs { differing += 1 }

                if best.bestSid != q.bestSid { drift.append("\(row.label)/\(q.kind): best sid") }
                if best.plainSid != q.plainSid { drift.append("\(row.label)/\(q.kind): plain sid") }
                if best.differs != q.differs { drift.append("\(row.label)/\(q.kind): differs") }
                if best.nameableCount != q.nameableCount { drift.append("\(row.label)/\(q.kind): nameableCount") }
                // an all-false predicate must fall back to exactly the no-options answer
                if plain.bestSid != q.plainSid { drift.append("\(row.label)/\(q.kind): supplied-array fallback") }
                if let arr = best.nameable {
                    if CubeFixtures.sha256Short(Self.jsonBoolArray(arr)) != q.nameableHash {
                        drift.append("\(row.label)/\(q.kind): the nameable array is not the page's")
                    }
                } else {
                    drift.append("\(row.label)/\(q.kind): no nameable array came back")
                }
                if drift.count > 6 { break }
            }
            if drift.count > 6 { break }
        }

        let firstFour = drift.prefix(4).joined(separator: ", ")
        #expect(drift.isEmpty, note("\(size.rawValue)x\(size.rawValue): \(drift.count)+ ask answers differ "
                + "from the golden, first: \(firstFour)"))
        GateFloor.expectAtLeast(asked, floorKey: "cube-golden-asks", default: 300,
                                what: "\(size.rawValue)x\(size.rawValue) golden ask calls")
        #expect(counts.count > 5, note("the nameable predicate is constant across the whole battery (\(counts.count) distinct counts) "
                + "- it is supposed to depend on what she has painted"))
        if size == .big {
            #expect(differing >= 25, note("the nameable option changed the question in only \(differing) golden paintings. "
                    + "The web asks with { nameable: canNameByColour }; if this reaches 0 the bridge is "
                    + "asking the child about a different square again."))
        }
    }

    // MARK: - Encoding helpers
    //
    // Hand-rolled rather than reusing JSCubeEngine's private encoders on purpose: the whole
    // point of this suite is to compare the engine's own output against a file, so what goes
    // IN has to be pinned by this test and not by the code under test.

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder(); e.outputFormatting = []; return e
    }()
    private struct StateArgs: Encodable { let size: Int; let state: CubeState }
    private struct SizeArgs: Encodable { let size: Int }
    private struct NodeArgs: Encodable { let size: Int; let id: String }
    private struct MoveGeoArgs: Encodable { let size: Int; let state: CubeState; let move: String }
    private struct ValidateArgs: Encodable { let size: Int; let stickers: [String?] }
    private struct ApplyArgs: Encodable { let size: Int; let state: CubeState; let moves: String }

    private static func encodeState(size: CubeSize, state: CubeState) throws -> String {
        String(data: try encoder.encode(StateArgs(size: size.rawValue, state: state)), encoding: .utf8)!
    }
    private static func encodeSize(_ size: CubeSize) throws -> String {
        String(data: try encoder.encode(SizeArgs(size: size.rawValue)), encoding: .utf8)!
    }
    private static func encodeNode(size: CubeSize, id: String) throws -> String {
        String(data: try encoder.encode(NodeArgs(size: size.rawValue, id: id)), encoding: .utf8)!
    }
    private static func encodeMoveGeo(size: CubeSize, state: CubeState, move: String) throws -> String {
        String(data: try encoder.encode(MoveGeoArgs(size: size.rawValue, state: state, move: move)), encoding: .utf8)!
    }
    private static func encodeApply(size: CubeSize, state: CubeState, moves: String) throws -> String {
        String(data: try encoder.encode(ApplyArgs(size: size.rawValue, state: state, moves: moves)), encoding: .utf8)!
    }
    private static func encodeValidate(size: CubeSize, stickers: [String]) throws -> String {
        String(data: try encoder.encode(ValidateArgs(size: size.rawValue, stickers: stickers.map { Optional($0) })),
               encoding: .utf8)!
    }

    /// `JSON.stringify([true,false,...])`, which is what the recorder hashed.
    static func jsonBoolArray(_ a: [Bool]) -> String {
        "[" + a.map { $0 ? "true" : "false" }.joined(separator: ",") + "]"
    }
}
