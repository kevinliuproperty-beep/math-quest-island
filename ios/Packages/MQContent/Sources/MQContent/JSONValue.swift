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
            // The magnitude guard is load-bearing, not cosmetic: `Int(someDouble)`
            // beyond Int64 is a TRAP (process death, not an error), and JSON carries
            // neither NaN nor Infinity.
            if !v.isFinite { try c.encodeNil() }
            else if v.rounded() == v, v.magnitude < 9_007_199_254_740_992 { try c.encode(Int64(v)) }
            else { try c.encode(v) }
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
    /// A whole number that actually fits in `Int`. **Out of range yields nil, never a
    /// crash.** The unguarded `Int($0)` this replaces was a trap, not an error: a key
    /// answer of `1e21` took the process down with `Fatal error: Double value cannot
    /// be converted to Int` (exit 133). Nothing on the child's path may do that.
    public var intValue: Int? {
        guard let d = doubleValue, d.isFinite, d.rounded() == d,
              d.magnitude < 9_007_199_254_740_992 else { return nil }
        return Int(d)
    }

    /// Like `intValue` but saturating - for engine-controlled indices, where "absurd"
    /// should become an out-of-band index rather than a nil the caller forgets to
    /// handle. Never traps.
    ///
    /// It saturates at JavaScript's OWN safe-integer limit (2^53 - 1), not at
    /// `Int.max`. `Int.max` is not exactly representable as a `Double`, so it could not
    /// survive a round trip through the JSON that crosses this bridge and the two
    /// runtimes would end up disagreeing about the sentinel itself. Beyond ±(2^53 - 1)
    /// a value is not an index in either language.
    public static let jsSafeInteger = 9_007_199_254_740_991
    public var clampedIntValue: Int? {
        guard let d = doubleValue, !d.isNaN else { return nil }
        if d >= Double(Self.jsSafeInteger) { return Self.jsSafeInteger }
        if d <= Double(-Self.jsSafeInteger) { return -Self.jsSafeInteger }
        return Int(d.rounded(.towardZero))
    }

    /// Format a Double the way JavaScript's `String(n)` would, without ever pushing it
    /// through a fixed-width integer. `-0` prints `0` (as JS does), a whole number
    /// inside the safe-integer range prints with no `.0`, and everything else falls
    /// back to Swift's shortest round-trip form (`1e+21`, `4.75`).
    public static func numberText(_ d: Double) -> String {
        if d.isNaN { return "NaN" }
        if d.isInfinite { return d < 0 ? "-Infinity" : "Infinity" }
        if d == 0 { return "0" }
        if d.rounded() == d, d.magnitude < 9_007_199_254_740_992 { return String(Int64(d)) }
        return String(d)
    }

    /// Decode one key without ever throwing: a missing key, an explicit null, or a
    /// value of an unexpected JSON type all come back as nil. Used by the decoders on
    /// the child's input path, where a throw would be a divergence from node.
    public static func leniently<K: CodingKey>(_ container: KeyedDecodingContainer<K>, _ key: K) -> JSONValue? {
        guard let v = try? container.decodeIfPresent(JSONValue.self, forKey: key), !v.isNull else { return nil }
        return v
    }

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
