import Testing
import Foundation
@testable import MQCubeEngineJS
import MQCubeContent

/// WOUND 5: `stateIn` shape-checked a cube and never domain-checked it.
///
/// Everything below was reachable from this lane's own **public typed API**, and every one
/// of them came back `{"ok":true, ...}`:
///
/// * `CubeState(cp: Array(repeating: Int.max, count: 8), ...)` - node answered happily and
///   **Swift then threw** `DecodingError.dataCorrupted` ("Number 9223372036854776000 is not
///   representable"), because JavaScript rounds `Int.max` and hands the rounded number back.
///   The engine-bridge lane's fix #2 says no engine-supplied number may decode into a
///   fixed-width Swift integer; this was that, one bundle along.
/// * `co: [0.5, ...]` and `co: [-1, ...]` round-tripped, minting keys like
///   `41207563.2001.51002` and `41207563.1-1-100-1-11`.
/// * `cp` all zero - a well-shaped nonsense cube - gave "isSolved ok, facesAllOneColour
///   false" and **"buildPlan ok, beats 0"**: a plan that finishes nothing, shown to a child.
///
/// The lane's own selling point is "persist a cube, quit, relaunch". So there is now a
/// domain check in `stateIn` (a structured `bad-state` refusal, never a throw that reaches
/// the app and never a plausible-looking answer), a `CUBE_API.validateState` so a restored
/// save is checked before it is drawn, and `CubeState.domainProblems(for:)` so a UI can
/// refuse a corrupt save without waking JavaScriptCore. This suite asserts the node side and
/// the Swift side say the same thing, case for case.
@Suite("Cube state domain")
struct CubeStateDomainTests {

    /// Every way a state can fail to be a state, with the size it fails for.
    static func brokenStates(_ size: CubeSize) -> [(String, CubeState)] {
        let solvedSmall = CubeState(cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0])
        func big(_ mutate: (inout CubeState) -> Void) -> CubeState {
            var s = CubeState(cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0],
                              ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                              eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                              cn: [0, 1, 2, 3, 4, 5])
            mutate(&s)
            return s
        }
        func small(_ mutate: (inout CubeState) -> Void) -> CubeState {
            var s = solvedSmall
            mutate(&s)
            return s
        }
        let make = size == .small ? small : big

        var cases: [(String, CubeState)] = [
            ("cp all zero (well shaped, not a cube)", make { $0.cp = [0, 0, 0, 0, 0, 0, 0, 0] }),
            ("cp all Int.max", make { $0.cp = Array(repeating: Int.max, count: 8) }),
            ("cp with one entry past the safe integer range", make { $0.cp[0] = 9_007_199_254_740_993 }),
            ("cp missing a slot", make { $0.cp = [0, 1, 2, 3, 4, 5, 6, 6] }),
            ("cp out of range", make { $0.cp[3] = 8 }),
            ("co negative", make { $0.co[0] = -1 }),
            ("co above 2", make { $0.co[7] = 3 }),
            ("cp too short", make { $0.cp = [0, 1, 2] })
        ]
        if size == .big {
            cases += [
                ("ep not a permutation", make { $0.ep = Array(repeating: 0, count: 12) }),
                ("eo above 1", make { $0.eo?[5] = 2 }),
                ("cn not a permutation", make { $0.cn = [0, 0, 1, 2, 3, 4] }),
                ("ep missing", make { $0.ep = nil })
            ]
        } else {
            cases.append(("a 2x2 carrying edges", CubeState(cp: [0, 1, 2, 3, 4, 5, 6, 7],
                                                           co: [0, 0, 0, 0, 0, 0, 0, 0],
                                                           ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                                                           eo: Array(repeating: 0, count: 12),
                                                           cn: [0, 1, 2, 3, 4, 5])))
        }
        return cases
    }

    @Test("a state that is not a cube is REFUSED by name, on every method that takes one",
          arguments: CubeSize.allCases)
    func nonsenseIsRefused(size: CubeSize) async throws {
        let e = try JSCubeEngine()
        var checked = 0

        for (why, state) in Self.brokenStates(size) {
            // The Swift-side mirror must agree that this is not a state.
            #expect(!state.isInDomain(for: size), "\(why): Swift thought this was a cube")

            for method in ["isSolved", "stickers", "stepStatus", "buildPlan", "geometry"] {
                checked += 1
                do {
                    switch method {
                    case "isSolved":   _ = try await e.isSolved(size: size, state: state)
                    case "stickers":   _ = try await e.stickers(size: size, state: state)
                    case "stepStatus": _ = try await e.stepStatus(size: size, state: state)
                    case "buildPlan":  _ = try await e.buildPlan(size: size, state: state, includeText: false)
                    default:           _ = try await e.geometry(size: size, state: state)
                    }
                    Issue.record(note("\(method)(\(why)) ANSWERED. This is the "
                                 + "\"buildPlan ok, beats 0\" class: a plan that finishes nothing."))
                } catch let error as CubeEngineError {
                    guard case .engineRejected(_, _, let code, let message, _, _) = error else {
                        Issue.record(note("\(method)(\(why)) failed with \(error) - the refusal must be the "
                                     + "engine's structured envelope, never a decode failure "
                                     + "(a DecodingError here IS the Int.max wound)"))
                        continue
                    }
                    #expect(code == "bad-state",
                            "\(method)(\(why)) was refused with code \(code), not `bad-state`")
                    #expect(message.contains("state."),
                            "\(method)(\(why)) was refused, but not by naming the field: \(message)")
                }
            }
        }
        #expect(checked >= 40, "only \(checked) refusals were exercised")
    }

    @Test("validateState answers instead of throwing, and agrees with the Swift mirror",
          arguments: CubeSize.allCases)
    func validateStateAgrees(size: CubeSize) async throws {
        let e = try JSCubeEngine()

        // a real cube: in domain and legal
        let real = try await e.scramble(size: size, seed: 4_242, depth: 18)
        let good = try await e.validateState(size: size, state: real.state)
        #expect(good.domainOk)
        #expect(good.legal, "a scrambled cube is a cube: \(good.message)")
        #expect(good.problems.isEmpty)
        #expect(good.key == real.key)
        #expect(real.state.isInDomain(for: size))

        // every broken one: answered, not thrown, and the two sides give the SAME reasons
        for (why, state) in Self.brokenStates(size) {
            let v = try await e.validateState(size: size, state: state)
            #expect(!v.domainOk, "\(why): validateState accepted it")
            #expect(!v.legal, "\(why): validateState called it legal")
            #expect(v.code == "bad-state")
            #expect(!v.problems.isEmpty)

            let mine = state.domainProblems(for: size)
            #expect(!mine.isEmpty, "\(why): the Swift mirror saw nothing wrong")
            // The two lists are written independently, in Swift and in ES5, and they are
            // required to name the same FIRST problem - which is the sentence a UI shows.
            //
            // The parenthesised VALUE is dropped from the comparison and only from there,
            // because it is the wound itself: Swift holds 9223372036854775807 and the
            // engine can only ever have seen 9223372036854776000. Two runtimes printing
            // one number differently is exactly why the number must not be load-bearing.
            #expect(Self.withoutValue(mine.first) == Self.withoutValue(v.problems.first),
                    "\(why): Swift says \"\(mine.first ?? "-")\", the engine says \"\(v.problems.first ?? "-")\"")
        }
    }

    /// Drop a trailing " (...)" - see the call site.
    static func withoutValue(_ s: String?) -> String? {
        guard let s, let open = s.lastIndex(of: "("), s.hasSuffix(")") else { return s }
        return String(s[s.startIndex..<open]).trimmingCharacters(in: .whitespaces)
    }

    @Test("a cube that survives a save and a relaunch is still the same cube",
          arguments: CubeSize.allCases)
    func roundTripThroughDisk(size: CubeSize) async throws {
        let e = try JSCubeEngine()
        let scrambled = try await e.scramble(size: size, seed: 777, depth: 25)

        // this is literally what persistence is: encode, forget, decode, ask
        let data = try JSONEncoder().encode(scrambled.state)
        let back = try JSONDecoder().decode(CubeState.self, from: data)
        #expect(back == scrambled.state)
        #expect(back.isInDomain(for: size))

        let v = try await e.validateState(size: size, state: back)
        #expect(v.domainOk && v.legal)
        #expect(v.key == scrambled.key)

        // and a corrupted save is caught before anything is drawn
        var corrupt = back
        corrupt.co[0] = 7
        #expect(!corrupt.isInDomain(for: size))
        let bad = try await e.validateState(size: size, state: corrupt)
        #expect(!bad.domainOk)
    }
}
