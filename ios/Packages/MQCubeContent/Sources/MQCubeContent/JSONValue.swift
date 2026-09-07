import Foundation

/// A decoded-but-not-interpreted piece of JSON.
///
/// The cube cores answer some questions with shapes that are deliberately not frozen in
/// Swift: `diagnose` returns a different object per situation, `resumePoint` is a number
/// on the big cube and absent on the small one, a guide node's `ask` and `exits` are the
/// script's own structures, and `bestQuestion` carries whatever the inference engine
/// scored a square on. Modelling those in Swift would mean re-deriving method facts on
/// this side of the bridge, which is the one thing Cube Quest's laws forbid: the modules
/// are gate-verified truth and Swift quotes them.
///
/// So the typed surface covers what a UI actually branches on - the steps, the refusal
/// code, the beats, the geometry - and everything else arrives here losslessly.
///
/// This is a deliberate DUPLICATE of `MQContent.JSONValue` rather than a dependency on it.
/// `MQCubeContent` shares no type with the question seam, and importing one module for
/// one enum would couple the cube lane to every rebuild of the quiz lane.
public enum JSONValue: Codable, Hashable, Sendable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null; return }
        if let v = try? c.decode(Bool.self) { self = .bool(v); return }
        if let v = try? c.decode(Double.self) { self = .number(v); return }
        if let v = try? c.decode(String.self) { self = .string(v); return }
        if let v = try? c.decode([JSONValue].self) { self = .array(v); return }
        if let v = try? c.decode([String: JSONValue].self) { self = .object(v); return }
        throw DecodingError.dataCorruptedError(in: c, debugDescription: "unrecognised JSON value")
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .string(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        }
    }

    public var boolValue: Bool? { if case .bool(let b) = self { return b }; return nil }
    public var intValue: Int? { if case .number(let d) = self { return Int(d) }; return nil }
    public var stringValue: String? { if case .string(let s) = self { return s }; return nil }
    public var arrayValue: [JSONValue]? { if case .array(let a) = self { return a }; return nil }
    public var objectValue: [String: JSONValue]? { if case .object(let o) = self { return o }; return nil }
    public var isNull: Bool { if case .null = self { return true }; return false }
}
