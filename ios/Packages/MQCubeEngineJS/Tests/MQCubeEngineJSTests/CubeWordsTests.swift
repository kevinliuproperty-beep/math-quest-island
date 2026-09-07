import Testing
import Foundation
@testable import MQCubeEngineJS
import MQCubeContent

/// The words the child reads, checked on the Swift side against the snapshot recorded from
/// `cube/index.html` - not against the golden.
///
/// # Why a second witness, when the golden already hashes `words()`
///
/// The mutation battery for this fix pass ran the **maximally laundered** path for a block
/// mutation: deploy recorded, guard acked, bundle rebuilt, parity corpus regenerated **and
/// the golden re-recorded**. Two mutations of the words inside the cores - a 2x2 preset hint
/// and the 3x3 move caption - then went red on the node side (whose value snapshot had not
/// been re-recorded) and **green on the Swift side**, because nothing over here read the
/// snapshot's word surface. That is the refutation's own finding, one layer along: *the node
/// gate and the Swift gate have different holes, and only their union has teeth.*
///
/// So the two fixtures are deliberately different instruments and both are read here:
///
/// * `cube-api-golden.json` is recorded from the page **with `api.js` on top** and catches a
///   change in what `CUBE_API` does with the words.
/// * `cube-engine-snapshot.json` is recorded from the **monolith's cores alone** and catches
///   a change in the words themselves.
///
/// Re-recording one does not re-record the other, which is the entire point.
@Suite("Cube words")
struct CubeWordsTests {

    @Test("every word surface the bridge returns is the monolith's, field for field",
          arguments: CubeSize.allCases)
    func wordsMatchSnapshot(size: CubeSize) async throws {
        let snapshot = try CubeFixtures.snapshot()
        guard let want = snapshot.probe.sizes[String(size.rawValue)]?.words else {
            Issue.record("the snapshot has no \(size.rawValue)x\(size.rawValue) word surface")
            return
        }
        let got = try await JSCubeEngine().words(size: size)
        var drift: [String] = []

        // The move tile's caption. Gate 1 on the web holds its own copy of the 2x2's; the
        // 3x3's was covered by nothing until the split refutation went looking.
        if got.CAPTION != want.CAPTION { drift.append("CAPTION") }
        if got.SLOT_NAMES != want.SLOT_NAMES { drift.append("SLOT_NAMES") }
        if got.ESLOT_NAMES != want.ESLOT_NAMES { drift.append("ESLOT_NAMES") }
        // The painter's swatch order, which is the order she is offered colours in.
        if got.COLOURS != want.COLOURS { drift.append("COLOURS") }
        if got.FACE_COLOUR != want.FACE_COLOUR { drift.append("FACE_COLOUR") }
        if got.FACE_LETTER != want.FACE_LETTER { drift.append("FACE_LETTER") }
        // "1st", "2nd", ... - a one-character mutation here passed every gate the split had.
        if got.ordinal != want.ordinal { drift.append("ordinal") }
        // The sentence read aloud on the small cube.
        if got.CHANT_TWICE != want.CHANT_TWICE { drift.append("CHANT_TWICE") }

        // The presets, in full: the hint she reads AND which quiz answer is RIGHT.
        if got.PRESETS.count != want.PRESETS.count {
            drift.append("PRESETS count \(want.PRESETS.count) -> \(got.PRESETS.count)")
        } else {
            for (g, w) in zip(got.PRESETS, want.PRESETS) {
                if g.id != w.id { drift.append("PRESETS order: \(w.id) -> \(g.id)"); continue }
                if g.name != w.name { drift.append("PRESETS[\(w.id)].name") }
                if g.hint != w.hint { drift.append("PRESETS[\(w.id)].hint") }
                if g.scramble != w.scramble { drift.append("PRESETS[\(w.id)].scramble") }
                if g.quiz?.q != w.quiz?.q { drift.append("PRESETS[\(w.id)].quiz.q") }
                if g.quiz?.a != w.quiz?.a { drift.append("PRESETS[\(w.id)].quiz.a") }
                if g.quiz?.right != w.quiz?.right { drift.append("PRESETS[\(w.id)].quiz.RIGHT ANSWER") }
                if g.quiz?.why != w.quiz?.why { drift.append("PRESETS[\(w.id)].quiz.why") }
            }
        }

        // The chants. `CHANTS = null` is one of the three mutations the refuter found that
        // only the Swift side caught, and it stays caught here for a better reason than a
        // decode failure.
        if Set(got.CHANTS.keys) != Set(want.CHANTS.keys) {
            drift.append("CHANTS keys \(want.CHANTS.keys.sorted()) -> \(got.CHANTS.keys.sorted())")
        } else {
            for (key, w) in want.CHANTS.sorted(by: { $0.key < $1.key }) {
                guard let g = got.CHANTS[key] else { continue }
                if g.moves != w.moves { drift.append("CHANTS[\(key)].moves") }
                if g.name != w.name { drift.append("CHANTS[\(key)].name") }
                if g.say != w.say { drift.append("CHANTS[\(key)].say") }
                if g.what != w.what { drift.append("CHANTS[\(key)].what") }
                if g.why != w.why { drift.append("CHANTS[\(key)].why") }
                if g.breath != w.breath { drift.append("CHANTS[\(key)].breath") }
            }
        }

        #expect(drift.isEmpty, note("\(size.rawValue)x\(size.rawValue): the words the child reads "
                + "have moved since cube/tools/fixtures/cube-engine-snapshot.json was recorded "
                + "from cube/index.html: \(drift.prefix(6).joined(separator: ", "))"))

        // and the surface is not empty, which is the way a comparison silently stops being one
        #expect(!got.PRESETS.isEmpty)
        #expect(got.ordinal.count == 9)
        #expect(got.CAPTION.count > 10)
        #expect(!got.CHANTS.isEmpty)
    }
}
