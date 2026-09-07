import Testing
import Foundation
@testable import MQCubeEngineJS
import MQCubeContent

/// The gate that matters to Charlotte: from a real mess, does the guided solve actually
/// finish the cube, through JavaScriptCore, on both sizes.
///
/// The assertion is `facesAllOneColour` and NOT the solved key, and that distinction is
/// the method's, not a convenience: the method turns the whole cube over on purpose, so a
/// correctly solved cube can be sitting in any orientation. Asserting the key would fail
/// on a finished cube.
@Suite("Cube solve")
struct CubeSolveTests {

    /// 50 moves is deliberately past anything the app itself deals: the app's own full
    /// scramble is 20 moves on the big cube. A 50-move scramble is the same set of states
    /// reached by a longer road, and it makes the plan long enough that a beat-replay bug
    /// has somewhere to show.
    static let scrambleDepth = 50

    /// Kept low by default because a 3x3 plan is ~110 beats and the replay is the
    /// expensive part. `MQ_CUBE_SOLVES` raises it for a deeper run - and LOWERS it for a
    /// fast edit loop, which is why it is refused on a gate run: `MQ_CUBE_SOLVES=1` used to
    /// clear the gate in 1.3 s (refutation wound 2). The floor lives in ios/gate-floor.txt.
    static var solveCount: Int {
        GateFloor.sampleSize(env: "MQ_CUBE_SOLVES", floorKey: "cube-solves", default: 12)
    }

    @Test("a 50-move scramble is solved by its own plan", arguments: CubeSize.allCases)
    func solvesFromDeepScramble(size: CubeSize) async throws {
        let e = try JSCubeEngine()
        var solved = 0, endMatched = 0, beats = 0

        for i in 0..<Self.solveCount {
            let seed = 1_000_003 &* (i + 1)
            let s = try await e.scramble(size: size, seed: seed, depth: Self.scrambleDepth)
            #expect(s.moves.count == Self.scrambleDepth)

            let plan = try await e.buildPlan(size: size, state: s.state, includeText: false)
            guard let body = plan.plan, body.ok else {
                Issue.record("no plan for \(size.rawValue)x\(size.rawValue) seed \(seed)")
                continue
            }
            beats += body.beatCount

            // Replay the beats through the engine, one beat at a time - not through a
            // Swift model of the cube, because Swift models no cube. This is the bridge
            // doing the work the app will do.
            var cube = s.state
            for beat in body.beats where !beat.moves.isEmpty {
                cube = try await e.applyMoves(size: size, state: cube, moves: beat.moves).state
            }
            let verdict = try await e.isSolved(size: size, state: cube)
            if verdict.facesAllOneColour { solved += 1 }
            if let endKey = body.endKey, endKey == verdict.key { endMatched += 1 }
        }

        GateFloor.expectAtLeast(Self.solveCount, floorKey: "cube-solves", default: 12,
                                what: "\(size.rawValue)x\(size.rawValue) full solves replayed")
        #expect(solved == Self.solveCount,
                "\(size.rawValue)x\(size.rawValue): only \(solved) of \(Self.solveCount) plans finished the cube")
        #expect(endMatched == Self.solveCount,
                "\(size.rawValue)x\(size.rawValue): the replay left the planner's own end state \(Self.solveCount - endMatched) times")
        #expect(beats > 0)
    }

    @Test("every step's completion predicate is true when its phase ends",
          arguments: CubeSize.allCases)
    func stepsFinishWhenTheirPhaseDoes(size: CubeSize) async throws {
        let e = try JSCubeEngine()
        var checked = 0

        for i in 0..<6 {
            let s = try await e.scramble(size: size, seed: 7_777_777 &* (i + 1), depth: Self.scrambleDepth)
            let plan = try await e.buildPlan(size: size, state: s.state, includeText: false)
            guard let body = plan.plan, body.ok else { continue }

            // The last beat index of each phase.
            var lastOfPhase: [Int: Int] = [:]
            for (k, beat) in body.beats.enumerated() { if let p = beat.phase { lastOfPhase[p] = k } }

            var cube = s.state
            for (k, beat) in body.beats.enumerated() {
                if !beat.moves.isEmpty {
                    cube = try await e.applyMoves(size: size, state: cube, moves: beat.moves).state
                }
                guard let phase = beat.phase, lastOfPhase[phase] == k else { continue }
                let status = try await e.stepStatus(size: size, state: cube)
                guard let step = status.steps.first(where: { $0.n == phase }) else { continue }
                checked += 1
                #expect(step.done,
                        "\(size.rawValue)x\(size.rawValue) step \(phase) (\(step.label)) was not done at the end of its own phase")
            }
        }
        #expect(checked >= 6, "no phase endings were reached, so this test asserted nothing")
    }

    @Test("a preset mess is a real cube, and the plan finishes it", arguments: CubeSize.allCases)
    func presetsSolve(size: CubeSize) async throws {
        let e = try JSCubeEngine()
        let words = try await e.words(size: size)
        #expect(!words.PRESETS.isEmpty)

        for preset in words.PRESETS {
            let s = try await e.scramble(size: size, preset: preset.id)
            // the painting the child would see must be legal
            let stickers = try await e.stickers(size: size, state: s.state)
            let v = try await e.validate(size: size, stickers: stickers.map { Optional($0) })
            #expect(v.ok, "preset \(preset.id) painted an illegal cube: \(v.message)")

            let plan = try await e.buildPlan(size: size, state: s.state, includeText: false)
            guard let body = plan.plan, body.ok else {
                Issue.record("preset \(preset.id) got no plan")
                continue
            }
            var cube = s.state
            for beat in body.beats where !beat.moves.isEmpty {
                cube = try await e.applyMoves(size: size, state: cube, moves: beat.moves).state
            }
            #expect(try await e.isSolved(size: size, state: cube).facesAllOneColour,
                    "preset \(preset.id) was not finished by its own plan")
        }
    }
}
