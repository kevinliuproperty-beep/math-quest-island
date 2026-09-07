import Testing
import Foundation
@testable import MQCubeContent

/// The cube seam's own types, with no JavaScript anywhere near them.
///
/// These are the checks that stay true if the engine is ever ported to Swift: the shapes
/// the UI binds to, and the two places where a decoder that throws would be worse than a
/// decoder that copes.
@Suite("Cube content models")
struct CubeModelTests {

    private let decoder = JSONDecoder()

    @Test("CubeSize knows what each cube is made of")
    func sizes() {
        #expect(CubeSize.small.squareCount == 24)
        #expect(CubeSize.big.squareCount == 54)
        #expect(CubeSize.small.pieceCount == 8)
        #expect(CubeSize.big.pieceCount == 26)     // 8 corners + 12 edges + 6 middles
        #expect(CubeSize.small.stepCount == 3)     // make white, get yellow, solve
        #expect(CubeSize.big.stepCount == 8)
        #expect(CubeSize.allCases.count == 2)
    }

    @Test("a 2x2 state has no edges and a 3x3 state does")
    func wellFormed() {
        let small = CubeState(cp: Array(0..<8), co: Array(repeating: 0, count: 8))
        #expect(small.size == .small)
        #expect(small.isWellFormed(for: .small))
        #expect(!small.isWellFormed(for: .big))

        let big = CubeState(cp: Array(0..<8), co: Array(repeating: 0, count: 8),
                            ep: Array(0..<12), eo: Array(repeating: 0, count: 12), cn: Array(0..<6))
        #expect(big.size == .big)
        #expect(big.isWellFormed(for: .big))
        #expect(!big.isWellFormed(for: .small))

        // A 2x2 carrying an ep array is a bug, not a variant.
        let confused = CubeState(cp: Array(0..<8), co: Array(repeating: 0, count: 8), ep: Array(0..<12))
        #expect(!confused.isWellFormed(for: .small))
        #expect(!confused.isWellFormed(for: .big))
    }

    @Test("a state survives a JSON round trip unchanged")
    func stateRoundTrip() throws {
        let big = CubeState(cp: [3, 1, 0, 2, 7, 4, 5, 6], co: [1, 0, 2, 0, 1, 0, 0, 2],
                            ep: Array((0..<12).reversed()), eo: [1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                            cn: [1, 0, 2, 3, 5, 4])
        let data = try JSONEncoder().encode(big)
        let back = try decoder.decode(CubeState.self, from: data)
        #expect(back == big)
    }

    @Test("CubeSolved keeps the two readings of solved apart")
    func solvedHasTwoReadings() throws {
        // A finished cube standing on its head: every side one colour, NOT keyed solved.
        let json = """
        {"size":2,"key":"76542103.00000000","solvedKey":"01234567.00000000",
         "solved":false,"facesAllOneColour":true,"normalisedBy":"CUBE.isSolved(state)"}
        """
        let v = try decoder.decode(CubeSolved.self, from: Data(json.utf8))
        #expect(v.keyedSolved == false)
        #expect(v.facesAllOneColour == true)
        #expect(v.key != v.solvedKey)
        // Reading the first where you meant the second reports a finished cube as unfinished.
        #expect(v.keyedSolved != v.facesAllOneColour)
    }

    @Test("a refusal carries its code, its whole sentence and its suspects")
    func validationRefusal() throws {
        let json = """
        {"size":2,"ok":false,"code":"notreal",
         "message":"One block is not a real cube block. Its three colours cannot sit together in that order. Check the ringed one.",
         "suspects":[0,9,16]}
        """
        let v = try decoder.decode(CubeValidation.self, from: Data(json.utf8))
        #expect(v.ok == false)
        #expect(v.refusal == "notreal")
        #expect(v.suspects == [0, 9, 16])
        #expect(v.message.hasPrefix("One block is not a real cube block."))
        #expect(v.state == nil)
    }

    @Test("an accepted painting carries the cube she described")
    func validationAccepted() throws {
        let json = """
        {"size":2,"ok":true,"code":null,"message":"","suspects":[],
         "state":{"cp":[0,1,2,3,4,5,6,7],"co":[0,0,0,0,0,0,0,0]},"key":"01234567.00000000"}
        """
        let v = try decoder.decode(CubeValidation.self, from: Data(json.utf8))
        #expect(v.ok == true)
        #expect(v.refusal == nil)
        #expect(v.state?.cp == Array(0..<8))
        #expect(v.key == "01234567.00000000")
    }

    @Test("step status finds the first unfinished step and keeps step1Done beside step 1")
    func stepStatusShape() throws {
        let json = """
        {"size":2,"key":"k","steps":[
          {"n":1,"id":"white","label":"Make white","done":true},
          {"n":2,"id":"yellow","label":"Get yellow","done":false},
          {"n":3,"id":"solve","label":"Solve","done":false}],
         "firstUnfinished":2,"allDone":false,"facesAllOneColour":false,
         "extras":{"step1DoneAtCeiling":false,"whiteProgress":{"n":4}}}
        """
        let s = try decoder.decode(CubeStepStatus.self, from: Data(json.utf8))
        #expect(s.steps.count == 3)
        #expect(s.firstUnfinished == 2)
        #expect(s.allDone == false)
        // Step 1 done while step1Done is false is the NORMAL state after the cube is
        // turned over. A UI that reads step1DoneAtCeiling as "step 1 finished" is wrong.
        #expect(s.steps[0].done == true)
        #expect(s.step1DoneAtCeiling == false)
    }

    @Test("a geometry row is a rotation matrix and a centre, ready for SceneKit")
    func pieceShape() throws {
        let json = """
        {"key":"c0","kind":"c","index":0,"slot":2,"twist":0,
         "m":[[-1,0,0],[0,1,0],[0,0,-1]],"t":[-1,-1,-1],
         "faces":[0,1,2],"colours":["yellow","green","red"]}
        """
        let p = try decoder.decode(CubePiece.self, from: Data(json.utf8))
        #expect(p.m.count == 3)
        #expect(p.m.allSatisfy { $0.count == 3 })
        #expect(p.t.count == 3)
        #expect(p.faces.count == p.colours.count)
        // a rotation matrix's rows are unit length
        for row in p.m {
            let len = (row[0] * row[0] + row[1] * row[1] + row[2] * row[2]).squareRoot()
            #expect(abs(len - 1) < 1e-9)
        }
    }

    @Test("a preset carries its hint and which quiz answer is right")
    func presetCarriesTheAnswer() throws {
        let json = """
        {"id":"one","name":"One turn away","hint":"So close. One spin of the ceiling row finishes it.",
         "scramble":"U","quiz":{"q":"How many turns?","a":["one","two","three"],"right":0,"why":"One."}}
        """
        let p = try decoder.decode(CubeWords.Preset.self, from: Data(json.utf8))
        #expect(p.hint == "So close. One spin of the ceiling row finishes it.")
        #expect(p.quiz?.right == 0)
        #expect(p.quiz?.a.count == 3)
    }

    @Test("JSONValue carries a shape Swift does not model, losslessly")
    func jsonValueIsLossless() throws {
        let json = #"{"kind":"partial","seat":{"n":1,"low":4,"seated":[4],"hold":["xp","y"]},"ok":false}"#
        let v = try decoder.decode(JSONValue.self, from: Data(json.utf8))
        #expect(v.objectValue?["kind"]?.stringValue == "partial")
        #expect(v.objectValue?["ok"]?.boolValue == false)
        #expect(v.objectValue?["seat"]?.objectValue?["low"]?.intValue == 4)
        let again = try JSONEncoder().encode(v)
        #expect(try decoder.decode(JSONValue.self, from: again) == v)
    }
}
