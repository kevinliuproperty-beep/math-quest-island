import Foundation

/// A diagram, as DATA. Never markup.
///
/// Mirrors the figure-spec contract in `js/topics/README.md` ("Figure specs - diagrams
/// are DATA, never markup"). A generator sets `q.figure` and leaves `q.extra` empty; the
/// web paints it with `js/figures.js`, and `MQFigures` paints the same numbers in
/// SwiftUI. **Same engine, same numbers, two pixel layers** - which is exactly why every
/// value the child needs is in the spec and nothing here is geometry: sizes, padding,
/// palette and label placement belong to the renderer.
///
/// The contract also says specs are plain JSON with no nulls, so each case's fields are
/// non-optional where the table says they are always present. Two safety valves remain,
/// because this file and `js/figures.js` are edited by different lanes:
///
///  * a `type` this build does not know decodes to `.unsupported`, payload intact;
///  * a known `type` whose payload does not fit ALSO decodes to `.unsupported` rather
///    than throwing.
///
/// So a spec that grows a field, or a type invented after this build shipped, degrades to
/// "not yet drawable" instead of failing a whole question batch. `MQFigures` falls back to
/// `Question.extra` when `isDrawable` is false.
public enum Figure: Codable, Hashable, Sendable {

    /// Horizontal bar graph. Bar *i* is `units[i]` units long and PRINTS `units[i] * scale`
    /// at its end; the value axis carries a gridline and tick for every unit `0...maxUnit`,
    /// labelled `k * scale`. `unitLabel` arrives already singularised by the generator.
    case bar(Bar)
    /// A rectangle drawn to scale within caps: `breadth unit` at the right edge,
    /// `length unit` underneath.
    case rect(Rect)
    /// A bar of `parts` equal segments with the FIRST `filled` shaded.
    case fractionBar(FractionBar)
    /// A `W x H` rectangle with an `a x b` piece removed from the TOP-RIGHT. The renderer
    /// derives and prints all six sides (top `W-a`, cut down `b`, cut across `a`, right
    /// `H-b`, bottom `W`, left `H`) so the spec and the picture cannot disagree.
    case lshape(LShape)
    /// One header row of `cats` and one value row. Column `hidden` prints `?` instead of
    /// its value; `hidden == -1` means nothing is hidden.
    case table(Table)
    /// Line graph. Point *i* sits `units[i]` units up and prints `units[i] * step`.
    case line(Line)
    /// Pie chart from 12 o'clock, clockwise. Sector *i* sweeps `weights[i] / sum(weights)`
    /// - strictly proportional even where its label is hidden. `labels[i]` is the STRING
    /// printed inside sector *i* and again in the legend beside `cats[i]`.
    case pie(Pie)
    /// Anything this build does not model yet, payload intact.
    case unsupported(type: String, payload: JSONValue)

    // MARK: - Payloads

    public struct Bar: Codable, Hashable, Sendable {
        public let title: String
        public let cats: [String]
        /// Bar lengths in UNITS, not in the printed value. Printed value = `units[i] * scale`.
        public let units: [Int]
        public let scale: Int
        public let maxUnit: Int
        public let unitLabel: String
    }

    public struct Rect: Codable, Hashable, Sendable {
        public let length: Int
        public let breadth: Int
        public let unit: String
    }

    public struct FractionBar: Codable, Hashable, Sendable {
        public let parts: Int
        public let filled: Int
    }

    public struct LShape: Codable, Hashable, Sendable {
        public let W: Int
        public let H: Int
        /// Width of the piece cut out of the top-right.
        public let a: Int
        /// Height of the piece cut out of the top-right.
        public let b: Int
        public let unit: String

        /// The six side lengths the renderer must print, clockwise from the top-left:
        /// top, cut down, cut across, right, bottom, left. Derived here so a SwiftUI
        /// renderer cannot invent a different set than the web one.
        public var sides: (top: Int, cutDown: Int, cutAcross: Int, right: Int, bottom: Int, left: Int) {
            (top: W - a, cutDown: b, cutAcross: a, right: H - b, bottom: W, left: H)
        }
        public var area: Int { W * H - a * b }
    }

    public struct Table: Codable, Hashable, Sendable {
        public let title: String
        public let cats: [String]
        public let values: [Int]
        /// Index of the column that prints `?`. `-1` = nothing hidden (the contract uses
        /// -1 rather than null, because specs carry no nulls).
        public let hidden: Int
        public let unitLabel: String
    }

    public struct Line: Codable, Hashable, Sendable {
        public let title: String
        public let cats: [String]
        /// Heights in UNITS. Printed value = `units[i] * step`.
        public let units: [Int]
        public let step: Int
        public let maxUnit: Int
        public let unitLabel: String
    }

    public struct Pie: Codable, Hashable, Sendable {
        public let title: String
        public let cats: [String]
        /// Sector sweeps, proportional to the sum. A hidden sector keeps its TRUE weight.
        public let weights: [Int]
        /// The string printed inside sector *i* - a count, a fraction like "1/4", or "?".
        public let labels: [String]
        public let caption: String
    }

    // MARK: - Codable

    private enum CodingKeys: String, CodingKey { case type }

    /// The discriminators `js/figures.js` emits (`MQI.figureTypes` is the live list).
    public enum Kind: String, Sendable, CaseIterable {
        case bar, rect, fractionBar, lshape, table, line, pie
    }

    public var type: String {
        switch self {
        case .bar: return Kind.bar.rawValue
        case .rect: return Kind.rect.rawValue
        case .fractionBar: return Kind.fractionBar.rawValue
        case .lshape: return Kind.lshape.rawValue
        case .table: return Kind.table.rawValue
        case .line: return Kind.line.rawValue
        case .pie: return Kind.pie.rawValue
        case .unsupported(let t, _): return t
        }
    }

    /// True when this build can draw it.
    public var isDrawable: Bool { if case .unsupported = self { return false }; return true }

    public init(from decoder: Decoder) throws {
        let payload = try JSONValue(from: decoder)
        let type = (try? decoder.container(keyedBy: CodingKeys.self).decode(String.self, forKey: .type))
            ?? payload["type"]?.stringValue
            ?? ""

        func decode<T: Decodable>(_ t: T.Type) -> T? { try? T(from: decoder) }

        switch Kind(rawValue: type) {
        case .bar:         if let v = decode(Bar.self) { self = .bar(v); return }
        case .rect:        if let v = decode(Rect.self) { self = .rect(v); return }
        case .fractionBar: if let v = decode(FractionBar.self) { self = .fractionBar(v); return }
        case .lshape:      if let v = decode(LShape.self) { self = .lshape(v); return }
        case .table:       if let v = decode(Table.self) { self = .table(v); return }
        case .line:        if let v = decode(Line.self) { self = .line(v); return }
        case .pie:         if let v = decode(Pie.self) { self = .pie(v); return }
        case nil:          break
        }
        self = .unsupported(type: type, payload: payload)
    }

    public func encode(to encoder: Encoder) throws {
        func withType<T: Encodable>(_ v: T) throws {
            try v.encode(to: encoder)
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(type, forKey: .type)
        }
        switch self {
        case .bar(let v): try withType(v)
        case .rect(let v): try withType(v)
        case .fractionBar(let v): try withType(v)
        case .lshape(let v): try withType(v)
        case .table(let v): try withType(v)
        case .line(let v): try withType(v)
        case .pie(let v): try withType(v)
        case .unsupported(_, let payload): try payload.encode(to: encoder)
        }
    }
}
