import Testing
import Foundation
@testable import MQCubeEngineJS
import MQCubeContent

/// The two things the split lane's fixture could not see, checked here against a snapshot
/// recorded from `cube/index.html` itself: THE WORDS and THE REFUSALS.
///
/// The refutation's finding, in one line: `cube-probe.mjs` records `Object.keys(CC).sort()`
/// for the export surface, so a name disappearing is caught and the VALUE behind any name
/// outside its predicate battery is not. Nine mutations went green - among them one that
/// deleted `validate`'s "that is not a real cube block" refusal outright.
@Suite("Cube guided script")
struct CubeGuideTests {

    @Test("every guide node's text is the monolith's, word for word",
          arguments: CubeSize.allCases)
    func guideTextMatchesSnapshot(size: CubeSize) async throws {
        let snapshot = try CubeFixtures.snapshot()
        guard let want = snapshot.probe.sizes[String(size.rawValue)]?.guide else {
            Issue.record("the snapshot has no \(size.rawValue)x\(size.rawValue) guide")
            return
        }
        let e = try JSCubeEngine()
        let script = try await e.guideScript(size: size)

        #expect(script.ok)
        #expect(script.nodeCount == want.nodeCount)
        #expect(script.order == want.order)
        #expect(script.nodes.count == want.nodes.count)

        var drift: [String] = []
        for (got, expected) in zip(script.nodes, want.nodes) {
            if got.id != expected.id { drift.append("order: \(expected.id) -> \(got.id)"); continue }
            let hash = CubeFixtures.sha256Short("\(got.title) \(got.say) \(got.why)")
            if hash != expected.textHash {
                drift.append("\(got.id): text hash \(expected.textHash) -> \(hash)")
            }
            // the hash is the gate; the fields are what makes a failure readable
            if got.say != expected.say { drift.append("\(got.id).say changed") }
            if got.why != expected.why { drift.append("\(got.id).why changed") }
            if got.title != expected.title { drift.append("\(got.id).title changed") }
        }
        #expect(drift.isEmpty,
                "\(size.rawValue)x\(size.rawValue) instruction text moved: \(drift.prefix(4).joined(separator: " | "))")

        // and the whole-script hash, which is the form the Cube Quest law is usually quoted in
        let whole = CubeFixtures.sha256Short(
            script.nodes.map { "\($0.id) \($0.say) \($0.why) \($0.title)" }.joined())
        #expect(whole == want.textHash,
                "\(size.rawValue)x\(size.rawValue) script text hash \(want.textHash) -> \(whole)")
    }

    @Test("one node fetched by id is the same node the script carries",
          arguments: CubeSize.allCases)
    func nodeById(size: CubeSize) async throws {
        let e = try JSCubeEngine()
        let script = try await e.guideScript(size: size)
        // spot-check across the script rather than only the first node
        for index in stride(from: 0, to: script.nodes.count, by: 5) {
            let want = script.nodes[index]
            let got = try await e.guideNode(size: size, id: want.id)
            #expect(got.id == want.id)
            #expect(got.say == want.say)
            #expect(got.why == want.why)
            #expect(got.title == want.title)
            #expect(got.moves == want.moves)
        }
    }
}

@Suite("Cube validate refusals")
struct CubeRefusalTests {

    @Test("every recorded refusal still refuses, with the same words and the same suspects",
          arguments: CubeSize.allCases)
    func refusalCorpus(size: CubeSize) async throws {
        let snapshot = try CubeFixtures.snapshot()
        guard let want = snapshot.probe.sizes[String(size.rawValue)]?.refusals else {
            Issue.record("the snapshot has no \(size.rawValue)x\(size.rawValue) refusal corpus")
            return
        }
        #expect(!want.cases.isEmpty)

        let e = try JSCubeEngine()
        var drift: [String] = []
        for c in want.cases {
            let got = try await e.validate(size: size, stickers: c.stickers)
            if got.ok {
                drift.append("ACCEPTED a painting that should be `\(c.code)`: \(c.how)")
                continue
            }
            if got.code != c.code { drift.append("\(c.how): code \(c.code) -> \(got.code ?? "nil")") }
            if got.message != c.msg { drift.append("\(c.how): message changed") }
            if got.suspects != c.suspects { drift.append("\(c.how): suspects changed") }
        }
        #expect(drift.isEmpty,
                "\(size.rawValue)x\(size.rawValue) refusals moved: \(drift.prefix(4).joined(separator: " | "))")

        // The branch a mutation could delete outright while every gate stayed green.
        let central = want.cases.filter { $0.code == "notreal" || $0.code == "enotreal" }
        #expect(!central.isEmpty, "the corpus lost its \"not a real cube block\" case")
        for c in central {
            let got = try await e.validate(size: size, stickers: c.stickers)
            #expect(got.ok == false)
            #expect(got.message.contains("real cube block") || got.message.contains("not in that order")
                    || got.message.contains("opposite sides"))
        }
    }

    /// A legal painting is accepted - and on the SMALL cube the cube that comes back is
    /// deliberately not always keyed the same, which is worth knowing before a UI trusts it.
    ///
    /// A 3x3 has fixed middle squares, so `schemeFrom` can read which colour is which side
    /// straight off them and `validate` hands back the very cube it was given: 50 of 50
    /// keys preserved, measured. A 2x2 has NO middle squares - the scheme has to be
    /// INFERRED from the painting - so validate recolours into the reference scheme and
    /// returns the same physical cube read the standard way round: 9 of 50 keys preserved,
    /// and that is correct behaviour, not drift. The twist vector survives; the slot
    /// permutation is relabelled.
    ///
    /// The invariant that holds on BOTH sizes is idempotence: paint the cube validate gave
    /// you, validate that, and nothing moves. A UI that stores `validate().state` and
    /// compares keys later is safe; one that compares it to the key it started with is not.
    @Test("a legal painting is accepted, and validate is idempotent", arguments: CubeSize.allCases)
    func acceptsRealPaintings(size: CubeSize) async throws {
        let e = try JSCubeEngine()
        var keyPreserved = 0
        for seed in [11, 222, 3333, 44444] {
            let s = try await e.scramble(size: size, seed: seed, depth: 22)
            let stickers = try await e.stickers(size: size, state: s.state)
            let v = try await e.validate(size: size, stickers: stickers.map { Optional($0) })
            #expect(v.ok, "a real cube was refused as \(v.code ?? "?"): \(v.message)")
            #expect(v.suspects.isEmpty)
            guard let rebuilt = v.state else { Issue.record("accepted with no cube"); continue }
            #expect(rebuilt.isWellFormed(for: size))
            if v.key == s.key { keyPreserved += 1 }

            // idempotent on both sizes
            let again = try await e.validate(size: size,
                                             stickers: try await e.stickers(size: size, state: rebuilt).map { Optional($0) })
            #expect(again.ok)
            #expect(again.key == v.key, "validate is not idempotent on the \(size.rawValue)x\(size.rawValue)")

            // ...and the cube it handed back is the same cube to solve: same finished-ness
            let before = try await e.isSolved(size: size, state: s.state)
            let after = try await e.isSolved(size: size, state: rebuilt)
            #expect(before.facesAllOneColour == after.facesAllOneColour)
        }
        if size == .big {
            #expect(keyPreserved == 4, "the 3x3 reads its scheme off fixed middle squares; the key must survive")
        }
    }

    @Test("an empty and a half-painted cube are refused as `blank`",
          arguments: CubeSize.allCases)
    func blankRefusals(size: CubeSize) async throws {
        let e = try JSCubeEngine()
        let empty = try await e.validate(size: size, stickers: Array(repeating: nil, count: size.squareCount))
        #expect(empty.ok == false)
        #expect(empty.code == "blank")
        #expect(empty.suspects.count == size.squareCount)
        #expect(empty.message.contains("\(size.squareCount)"))

        let s = try await e.scramble(size: size, seed: 8, depth: 10)
        var half: [String?] = try await e.stickers(size: size, state: s.state).map { Optional($0) }
        half[3] = nil
        let partial = try await e.validate(size: size, stickers: half)
        #expect(partial.ok == false)
        #expect(partial.code == "blank")
        #expect(partial.suspects == [3])
    }

    @Test("the refusal branches this corpus reaches have not changed",
          arguments: CubeSize.allCases)
    func reachedBranchesAreStable(size: CubeSize) async throws {
        let snapshot = try CubeFixtures.snapshot()
        guard let want = snapshot.probe.sizes[String(size.rawValue)]?.refusals else { return }
        let e = try JSCubeEngine()
        var reached = Set<String>()
        for c in want.cases {
            let got = try await e.validate(size: size, stickers: c.stickers)
            if let code = got.code, !got.ok { reached.insert(code) }
        }
        #expect(reached == Set(want.codes),
                "reached refusal codes changed: \(Set(want.codes).symmetricDifference(reached).sorted())")
        // `unreached` is part of the record on purpose: a branch this corpus cannot reach
        // is a fact about the core's own ordering, not something to leave unsaid.
        #expect(Set(want.unreached).isDisjoint(with: reached))
    }
}
