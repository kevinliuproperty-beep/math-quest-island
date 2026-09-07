import Testing
import Foundation
@testable import MQCubeEngineJS
import MQCubeContent

/// The bridge itself: does the extracted bundle load inside JavaScriptCore, does it answer
/// as the monolith answers, and does it refuse what it should refuse.
@Suite("Cube engine bridge")
struct CubeBridgeTests {

    private func engine() throws -> JSCubeEngine { try JSCubeEngine() }

    @Test("the bundle loads and build() agrees with the file's own stamp")
    func buildStamp() async throws {
        let e = try engine()
        let build = try await e.cubeBuild()
        let inFile = try await e.stampInBundleFile()
        #expect(inFile != nil)
        #expect(build.stamp == inFile)
        #expect(build.platform == "javascriptcore")
        #expect(build.source == "cube/index.html")
        #expect(build.payloadHash.count == 16)
        #expect(build.sizes == [2, 3])
    }

    @Test("build() names the four extracted blocks with their line ranges")
    func buildBlocks() async throws {
        let build = try await engine().cubeBuild()
        #expect(build.blocks.map(\.name) == ["CORE", "CORE3", "INFER", "GUIDE"])
        for b in build.blocks {
            #expect(b.endLine > b.startLine)
            #expect(b.bytes > 1000)
            #expect(b.sha256.count == 16)
        }
        // The blocks must be disjoint and in file order - overlapping markers would mean
        // one block had swallowed another and shipped it twice.
        for (a, b) in zip(build.blocks, build.blocks.dropFirst()) {
            #expect(b.startLine > a.endLine)
        }
    }

    @Test("the two cores are the sizes they claim to be")
    func exportCounts() async throws {
        let build = try await engine().cubeBuild()
        // 83 and 114, which is the asymmetry CUBE_API exists to normalise: 28 names on
        // CUBE only, 59 on CUBE3 only. Pinned so a core losing exports is loud.
        #expect(build.exportCounts["CUBE"] == 83)
        #expect(build.exportCounts["CUBE3"] == 114)
        #expect(Set(build.api).isSuperset(of: Set(JSCubeEngine.requiredMethods)))
    }

    @Test("the host shim invented no browser")
    func noBrowser() async throws {
        let e = try engine()
        _ = try await e.cubeBuild()
        for global in ["window", "document", "navigator", "localStorage", "sessionStorage",
                       "setTimeout", "setInterval", "fetch", "alert", "requestAnimationFrame",
                       "XMLHttpRequest", "speechSynthesis"] {
            let typeName = try await e.evaluateForDiagnostics("typeof \(global)")
            #expect(typeName == "undefined", "the cube bundle defined \(global) (typeof \(typeName))")
        }
        // ...but it DID install its own console, so a stray log reaches the host.
        #expect(try await e.evaluateForDiagnostics("typeof console") == "object")
        #expect(try await e.evaluateForDiagnostics("typeof CUBE_HOST.drainLogs") == "function")
        // and the four blocks are all there
        for ns in ["CUBE", "CUBE3", "INFER", "GUIDE", "CUBE_API"] {
            #expect(try await e.evaluateForDiagnostics("typeof \(ns)") == "object")
        }
    }

    @Test("the DEBUG-only bundle path override is still guarded")
    func overrideGuard() {
        // In a release build this is false and the env var does not exist in the binary.
        // The assertion exists so the #if cannot be dropped without a red gate.
        #if DEBUG
        #expect(CubeBundleLocator.environmentOverrideIsCompiledIn == true)
        #else
        #expect(CubeBundleLocator.environmentOverrideIsCompiledIn == false)
        #endif
    }

    @Test("a fresh cube is solved, both ways of asking", arguments: CubeSize.allCases)
    func solvedCube(size: CubeSize) async throws {
        let e = try engine()
        let s = try await e.newSolved(size: size)
        #expect(s.size == size.rawValue)
        #expect(s.state.isWellFormed(for: size))
        let v = try await e.isSolved(size: size, state: s.state)
        #expect(v.keyedSolved)
        #expect(v.facesAllOneColour)
        #expect(v.key == v.solvedKey)
        let stickers = try await e.stickers(size: size, state: s.state)
        #expect(stickers.count == size.squareCount)
    }

    @Test("a seeded scramble is deterministic, and the same in two contexts",
          arguments: CubeSize.allCases)
    func deterministicScramble(size: CubeSize) async throws {
        let a = try await engine().scramble(size: size, seed: 424242, depth: 25)
        let b = try await engine().scramble(size: size, seed: 424242, depth: 25)
        #expect(a.moves == b.moves)
        #expect(a.key == b.key)
        #expect(a.moves.count == 25)
        #expect(a.movesHash == CubeFixtures.fnv1a(a.moves.joined(separator: " ")))
        // a different seed must actually differ, or "deterministic" is trivially true
        let c = try await engine().scramble(size: size, seed: 424243, depth: 25)
        #expect(c.moves != a.moves)
    }

    @Test("applyMoves undoes itself through the engine's own inverse",
          arguments: CubeSize.allCases)
    func roundTrip(size: CubeSize) async throws {
        let e = try engine()
        for seed in [1, 7, 99, 12345, 999_983] {
            let s = try await e.scramble(size: size, seed: seed, depth: 30)
            let applied = try await e.applyMoves(size: size, state: s.state, moves: s.moves)
            let undone = try await e.applyMoves(size: size, state: s.state, moves: applied.inverse)
            let v = try await e.isSolved(size: size, state: undone.state)
            #expect(v.keyedSolved, "seed \(seed) did not come back to solved")
        }
    }

    @Test("a whole-cube turn key works on BOTH sizes", arguments: CubeSize.allCases)
    func wholeTurns(size: CubeSize) async throws {
        let e = try engine()
        let solved = try await e.newSolved(size: size)
        for key in ["y", "yp", "x", "xp", "x2"] {
            let r = try await e.applyMoves(size: size, state: solved.state, moves: [key])
            let v = try await e.isSolved(size: size, state: r.state)
            // Every side is still one colour; the cube is just standing differently.
            #expect(v.facesAllOneColour, "\(key) broke the cube on the \(size.rawValue)x\(size.rawValue)")
            // ...and it is NOT keyed solved any more, which is the whole reason the two
            // readings of "solved" are kept apart.
            #expect(!v.keyedSolved, "\(key) should have moved the key")
            // On the SMALL cube 'y' is not a move at all: CUBE.WHOLE.y is ["U","D'"], and
            // the engine expands it. That expansion is visible in what came back.
            if size == .small { #expect(r.moves.count == 2) } else { #expect(r.moves == [key]) }
        }
    }

    @Test("the geometry a SceneKit view needs comes across whole", arguments: CubeSize.allCases)
    func geometry(size: CubeSize) async throws {
        let e = try engine()
        let s = try await e.scramble(size: size, seed: 31337, depth: 18)
        let g = try await e.geometry(size: size, state: s.state)
        #expect(g.pieces.count == size.pieceCount)
        #expect(g.faceDirections.count == 6)
        #expect(g.faceColours.count == 6)
        for p in g.pieces {
            #expect(p.m.count == 3 && p.m.allSatisfy { $0.count == 3 })
            #expect(p.t.count == 3)
            #expect(p.faces.count == p.colours.count)
            // every placement matrix is a rotation: orthonormal rows, determinant +1
            let det = p.m[0][0] * (p.m[1][1] * p.m[2][2] - p.m[1][2] * p.m[2][1])
                    - p.m[0][1] * (p.m[1][0] * p.m[2][2] - p.m[1][2] * p.m[2][0])
                    + p.m[0][2] * (p.m[1][0] * p.m[2][1] - p.m[1][1] * p.m[2][0])
            #expect(abs(det - 1) < 1e-9, "piece \(p.key) has determinant \(det)")
        }
        if size == .big {
            #expect(g.pieces.filter { $0.kind == "c" }.count == 8)
            #expect(g.pieces.filter { $0.kind == "e" }.count == 12)
            #expect(g.pieces.filter { $0.kind == "n" }.count == 6)
        }
    }

    @Test("a move says which blocks travel and about what", arguments: CubeSize.allCases)
    func moveGeometry(size: CubeSize) async throws {
        let e = try engine()
        let s = try await e.scramble(size: size, seed: 606, depth: 12)
        let r = try await e.moveGeometry(size: size, state: s.state, move: "R")
        #expect(r.deg == 90)
        #expect(r.axis.count == 3)
        #expect(!r.isWhole)
        // A quarter turn of one face moves 4 corners on the small cube; on the big one it
        // is 4 corners + 4 edges, and the middle square of that face sits on the axis.
        #expect(r.pieces.count == (size == .small ? 4 : 8))
        let prime = try await e.moveGeometry(size: size, state: s.state, move: "R'")
        #expect(prime.deg == -90, "a prime move must spin the other way")
        let whole = try await e.moveGeometry(size: size, state: s.state, move: "x2")
        #expect(whole.isWhole)
        #expect(whole.deg == 180)
        #expect(whole.pieces.count == size.pieceCount, "a whole turn moves every block")
    }

    @Test("the words come across verbatim", arguments: CubeSize.allCases)
    func words(size: CubeSize) async throws {
        let w = try await engine().words(size: size)
        #expect(w.CAPTION["R"] == "right half rolls toward the ceiling")
        #expect(w.CAPTION["R'"] == "right half rolls toward the floor")
        #expect(w.SLOT_NAMES == ["URF", "UFL", "ULB", "UBR", "DFR", "DLF", "DBL", "DRB"])
        #expect(w.ordinal == ["0th", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"])
        #expect(w.COLOURS.count == 6)
        #expect(!w.PRESETS.isEmpty)
        // every preset carries a hint AND which quiz answer is right - the pair the split
        // lane's fixture could rewrite without a single gate noticing
        for p in w.PRESETS {
            #expect(!p.hint.isEmpty, "preset \(p.id) lost its hint")
            if let quiz = p.quiz {
                #expect(quiz.right >= 0 && quiz.right < quiz.a.count, "preset \(p.id): right index out of range")
            }
        }
        switch size {
        case .small:
            #expect(w.CHANT_TWICE == "Do it twice on a finished cube and the cube comes back finished. Every time. That is the drill.")
            #expect(w.ESLOT_NAMES == nil)
            #expect(w.CHANTS["righty"]?.moves == ["R'", "D'", "R", "D"])
        case .big:
            #expect(w.ESLOT_NAMES?.count == 12)
            #expect(w.CHANTS.count == 6, "the big cube's six chants")
        }
    }

    @Test("the method's steps agree with the cube in front of them", arguments: CubeSize.allCases)
    func stepStatus(size: CubeSize) async throws {
        let e = try engine()
        let solvedCube = try await e.newSolved(size: size)
        let done = try await e.stepStatus(size: size, state: solvedCube.state)
        #expect(done.steps.count == size.stepCount)
        #expect(done.facesAllOneColour)
        #expect(done.steps.last?.done == true, "a solved cube has finished the last step")

        let messy = try await e.scramble(size: size, seed: 5150, depth: 25)
        let s = try await e.stepStatus(size: size, state: messy.state)
        #expect(s.steps.count == size.stepCount)
        #expect(s.allDone == false)
        #expect(s.firstUnfinished != nil)
        if size == .small {
            // step1Done travels beside step 1, never AS step 1 - see CubeStepStatus.
            #expect(s.step1DoneAtCeiling != nil)
        } else {
            #expect(s.resumePoint != nil)
        }
    }

    @Test("the inference engine answers, and hands back the whole ask ranking",
          arguments: CubeSize.allCases)
    func bestQuestion(size: CubeSize) async throws {
        let e = try engine()
        let s = try await e.scramble(size: size, seed: 2024, depth: 14)
        let full = try await e.stickers(size: size, state: s.state)
        // paint every fourth square, leave the rest blank
        let painted: [String?] = full.enumerated().map { $0.offset % 4 == 0 ? $0.element : nil }
        let q = try await e.bestQuestion(size: size, painted: painted)
        #expect(q.completions.count > 0)
        #expect(!q.ranking.isEmpty, "the ranking is the tie-break evidence, not decoration")
        #expect(q.ranking.count <= 8)
        // the ranking must be a genuine ORDER: no square asked twice
        #expect(Set(q.ranking.map(\.sid)).count == q.ranking.count)
    }

    @Test("bad arguments come back as named errors, with the JS stack")
    func errorEnvelope() async throws {
        let e = try engine()
        let s = try await e.newSolved(size: .small)

        await #expect(throws: CubeEngineError.self) {
            _ = try await e.applyMoves(size: .small, state: s.state, moves: ["Q"])
        }
        do {
            _ = try await e.applyMoves(size: .small, state: s.state, moves: ["Q"])
            Issue.record("an unknown move was accepted")
        } catch let error as CubeEngineError {
            #expect(error.engineMessage?.contains("is not a move on this cube") == true)
            #expect(error.javaScriptStack?.isEmpty == false, "the JS stack is what names the frame")
        }
        do {
            // a 2x2 state handed to the 3x3 door
            _ = try await e.applyMoves(size: .big, state: s.state, moves: ["R"])
            Issue.record("a malformed state was accepted")
        } catch let error as CubeEngineError {
            #expect(error.engineMessage?.contains("state.ep must be an array of 12") == true)
        }
        do {
            _ = try await e.guideNode(size: .small, id: "no-such-node")
            Issue.record("an unknown guide node id was accepted")
        } catch let error as CubeEngineError {
            #expect(error.engineMessage?.contains("no node") == true)
        }
    }

    @Test("the engine holds nothing: a cube in hand survives a reset")
    func statelessness() async throws {
        let e = try engine()
        let s = try await e.scramble(size: .big, seed: 777, depth: 20)
        let before = try await e.stepStatus(size: .big, state: s.state)
        await e.reset()
        #expect(await e.isLoaded() == false)
        let after = try await e.stepStatus(size: .big, state: s.state)
        #expect(await e.isLoaded() == true)
        #expect(before.key == after.key)
        #expect(before.steps.map(\.done) == after.steps.map(\.done))
        #expect(before.firstUnfinished == after.firstUnfinished)
    }
}
