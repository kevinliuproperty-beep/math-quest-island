import Foundation

/// A decoded-but-not-interpreted piece of JSON.
///
/// Two jobs, both about *not* freezing a contract before it exists:
///
/// 1. `Question.key` - the engine's grading key - crosses back into JavaScript
///    verbatim. Swift must carry it losslessly and must never interpret it, because
///    grading semantics (unit rejection, fraction reduction, decimal-place rounding)
///    live in `js/core.js` and are re-derived nowhere else. If Swift ever "knew" what
///    a key means, the two graders would drift and a child would be marked wrong on a
///    correct answer - the exact bug class the Wave-2 kills came from.
/// 2. `Figure` payloads whose shape the figure-spec lane has not published yet.
///    An unrecognised figure decodes into `.unsupported(type:payload:)` and keeps its
///    whole payload, so nothing is lost and nothing throws.
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
        case .number(let v):
            // Whole numbers encode as integers so a round-trip of {"answer":113} does
            // not hand JavaScript 113.0 and change how a stem's answer prints.
            if v.rounded() == v, abs(v) < 9_007_199_254_740_992 { try c.encode(Int(v)) } else { try c.encode(v) }
        case .string(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        }
    }

    // MARK: - Read-only accessors (convenience for tests and renderers)

    public var stringValue: String? { if case .string(let s) = self { return s }; return nil }
    public var doubleValue: Double? {
        switch self {
        case .number(let d): return d
        case .string(let s): return Double(s)
        default: return nil
        }
    }
    public var intValue: Int? { doubleValue.flatMap { $0.rounded() == $0 ? Int($0) : nil } }
    public var boolValue: Bool? { if case .bool(let b) = self { return b }; return nil }
    public var arrayValue: [JSONValue]? { if case .array(let a) = self { return a }; return nil }
    public var objectValue: [String: JSONValue]? { if case .object(let o) = self { return o }; return nil }
    public var isNull: Bool { if case .null = self { return true }; return false }

    public subscript(key: String) -> JSONValue? { objectValue?[key] }
    public subscript(index: Int) -> JSONValue? {
        guard let a = arrayValue, index >= 0, index < a.count else { return nil }
        return a[index]
    }
}
