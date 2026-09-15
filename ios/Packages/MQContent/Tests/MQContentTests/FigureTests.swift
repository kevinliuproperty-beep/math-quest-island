import Foundation
import Testing
@testable import MQContent

/// `Figure` mirrors the seven types documented in `js/topics/README.md`, and it is the
/// type most likely to meet data it has never seen: `js/figures.js` and this file are
/// edited by different lanes. So half these tests assert the seven shapes decode, and
/// half assert the same thing from the other side - an unknown or malformed spec must
/// DEGRADE, never throw, because a decode failure on one figure would take down a whole
/// question batch.
///
/// (swift-testing, not XCTest: Command Line Tools ships Testing.framework and no XCTest
/// at all, and Kai is the gate box.)
@Suite("Figure spec decoding")
struct FigureTests {

    private func figure(_ json: String) throws -> Figure {
        try JSONDecoder().decode(Figure.self, from: Data(json.utf8))
    }

    @Test("a bar spec decodes, units and scale kept apart")
    func decodesBar() throws {
        let f = try figure(#"""
        {"type":"bar","title":"Books read","cats":["Mon","Tue","Wed"],
         "units":[3,5,2],"scale":5,"maxUnit":6,"unitLabel":"books"}
        """#)
        guard case .bar(let c) = f else { Issue.record("expected .bar, got \(f)"); return }
        #expect(c.cats.count == 3)
        #expect(c.units == [3, 5, 2])
        // The bar is 5 units long; the number PRINTED at its end is 5 * 5 = 25. Getting
        // this backwards is the whole point of the scaled-axis P3 items.
        #expect(c.units[1] * c.scale == 25)
        #expect(c.maxUnit == 6)
        #expect(f.isDrawable)
    }

    @Test("a rect spec decodes")
    func decodesRect() throws {
        let f = try figure(#"{"type":"rect","length":8,"breadth":3,"unit":"cm"}"#)
        guard case .rect(let c) = f else { Issue.record("expected .rect, got \(f)"); return }
        #expect(c.length == 8)
        #expect(c.breadth == 3)
        #expect(c.unit == "cm")
    }

    @Test("a fractionBar spec decodes")
    func decodesFractionBar() throws {
        let f = try figure(#"{"type":"fractionBar","parts":8,"filled":3}"#)
        guard case .fractionBar(let c) = f else { Issue.record("expected .fractionBar, got \(f)"); return }
        #expect(c.parts == 8)
        #expect(c.filled == 3)
    }

    /// The six side lengths are DERIVED, here and in `js/figures.js`, from the same four
    /// numbers - so a SwiftUI renderer cannot print a different set than the web one.
    @Test("an lshape derives the same six sides the web renderer prints")
    func decodesLShapeAndDerivesSides() throws {
        let f = try figure(#"{"type":"lshape","W":8,"H":7,"a":5,"b":4,"unit":"cm"}"#)
        guard case .lshape(let c) = f else { Issue.record("expected .lshape, got \(f)"); return }
        let s = c.sides
        #expect(s.top == 3)          // W - a
        #expect(s.cutDown == 4)      // b
        #expect(s.cutAcross == 5)    // a
        #expect(s.right == 3)        // H - b
        #expect(s.bottom == 8)       // W
        #expect(s.left == 7)         // H
        #expect(c.area == 8 * 7 - 5 * 4)
        // A closed outline: the two horizontal runs and the two vertical runs each sum
        // to the full width and height.
        #expect(s.top + s.cutAcross == s.bottom)
        #expect(s.cutDown + s.right == s.left)
    }

    @Test("a table spec decodes, and hidden == -1 means nothing is hidden")
    func decodesTable() throws {
        let visible = try figure(#"""
        {"type":"table","title":"Pupils","cats":["Mon","Tue"],"values":[12,9],"hidden":-1,"unitLabel":"pupils"}
        """#)
        guard case .table(let a) = visible else { Issue.record("expected .table, got \(visible)"); return }
        #expect(a.hidden == -1)
        #expect(a.values == [12, 9])

        let hidden = try figure(#"""
        {"type":"table","title":"Pupils","cats":["Mon","Tue"],"values":[12,9],"hidden":1,"unitLabel":"pupils"}
        """#)
        guard case .table(let b) = hidden else { Issue.record("expected .table"); return }
        #expect(b.hidden == 1, "column 1 prints ? but the spec still carries its true value")
        #expect(b.values[b.hidden] == 9)
    }

    @Test("a line spec decodes, step applied to units")
    func decodesLine() throws {
        let f = try figure(#"""
        {"type":"line","title":"Water","cats":["1","2","3"],"units":[2,4,5],
         "step":10,"maxUnit":6,"unitLabel":"litres"}
        """#)
        guard case .line(let c) = f else { Issue.record("expected .line, got \(f)"); return }
        #expect(c.units.map { $0 * c.step } == [20, 40, 50])
        #expect(c.cats.count == c.units.count)
    }

    /// A hidden pie sector keeps its TRUE weight - drawing "?" at a wrong angle is the
    /// figure equivalent of leaking the answer, or of lying about it.
    @Test("a pie spec decodes and a hidden sector keeps its true weight")
    func decodesPie() throws {
        let f = try figure(#"""
        {"type":"pie","title":"Fruit","cats":["apple","pear","plum"],
         "weights":[3,2,1],"labels":["3","?","1"],"caption":"6 pieces of fruit."}
        """#)
        guard case .pie(let c) = f else { Issue.record("expected .pie, got \(f)"); return }
        #expect(c.weights == [3, 2, 1])
        #expect(c.labels[1] == "?")
        #expect(c.labels.count == c.cats.count)
        #expect(c.weights.reduce(0, +) == 6)
    }

    /// The case that matters most: a figure type invented after this build shipped.
    @Test("an unknown figure type degrades to .unsupported and keeps its whole payload")
    func unknownTypeDegrades() throws {
        let f = try figure(#"{"type":"numberLine","from":0,"to":10,"marks":[3,7]}"#)
        guard case .unsupported(let type, let payload) = f else { Issue.record("expected .unsupported, got \(f)"); return }
        #expect(type == "numberLine")
        #expect(payload["to"]?.intValue == 10)
        #expect(payload["marks"]?.arrayValue?.count == 2)
        #expect(!f.isDrawable)
        #expect(f.type == "numberLine")
    }

    /// A KNOWN type whose payload does not fit is also a degrade, not a throw: the spec
    /// may gain a required field before this package learns about it.
    @Test("a known type with an unexpected payload degrades rather than throwing")
    func knownTypeBadPayloadDegrades() throws {
        let f = try figure(#"{"type":"bar","series":[{"name":"a","points":[1,2,3]}]}"#)
        guard case .unsupported(let type, let payload) = f else { Issue.record("expected .unsupported, got \(f)"); return }
        #expect(type == "bar")
        #expect(payload["series"] != nil)
    }

    @Test("a figure with no type at all still decodes")
    func missingTypeDegrades() throws {
        let f = try figure(#"{"parts":8,"filled":3}"#)
        guard case .unsupported(let type, _) = f else { Issue.record("expected .unsupported, got \(f)"); return }
        #expect(type == "")
    }

    @Test("figures round-trip through encode/decode", arguments: [
        #"{"type":"bar","title":"T","cats":["a"],"units":[1],"scale":2,"maxUnit":3,"unitLabel":"x"}"#,
        #"{"type":"rect","length":7,"breadth":4,"unit":"cm"}"#,
        #"{"type":"fractionBar","parts":8,"filled":3}"#,
        #"{"type":"lshape","W":8,"H":7,"a":5,"b":4,"unit":"cm"}"#,
        #"{"type":"table","title":"T","cats":["a"],"values":[1],"hidden":-1,"unitLabel":"x"}"#,
        #"{"type":"line","title":"T","cats":["a"],"units":[1],"step":2,"maxUnit":3,"unitLabel":"x"}"#,
        #"{"type":"pie","title":"T","cats":["a"],"weights":[1],"labels":["1"],"caption":"c"}"#,
        #"{"type":"holoCube","edge":3}"#
    ])
    func roundTrips(json: String) throws {
        let a = try figure(json)
        let b = try JSONDecoder().decode(Figure.self, from: JSONEncoder().encode(a))
        #expect(a == b, "round trip changed \(json)")
        #expect(a.type == b.type)
    }

    @Test("every documented kind keeps its discriminator", arguments: Figure.Kind.allCases)
    func everyKindKeepsItsType(kind: Figure.Kind) throws {
        let f = try figure(#"{"type":"\#(kind.rawValue)"}"#)
        #expect(f.type == kind.rawValue)
    }

    @Test("the seven documented types are the seven modelled here")
    func sevenTypes() {
        #expect(Figure.Kind.allCases.count == 7)
        #expect(Set(Figure.Kind.allCases.map(\.rawValue))
                == ["bar", "rect", "fractionBar", "lshape", "table", "line", "pie"])
    }
}
