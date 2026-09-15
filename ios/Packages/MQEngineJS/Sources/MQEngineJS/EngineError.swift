import Foundation

/// Everything that can go wrong between Swift and the engine bundle.
///
/// The rule this type exists to enforce: a JavaScript failure is never swallowed and
/// never flattened to "something went wrong". It arrives in Swift carrying the JS
/// message AND the JS stack, because the stack names the generator - `js/topics/
/// p5-rate.js:88` - and that is the only thing that turns a crash report into a fix.
public enum EngineError: Error, CustomStringConvertible, Sendable {

    /// No `engine.bundle.js` on any of the searched paths.
    case bundleNotFound(searched: [String])
    /// The bundle itself failed to evaluate (a syntax error, a duplicate topic id).
    case bundleEvaluationFailed(message: String, stack: String)
    /// The bundle evaluated but did not define `MQI_API`, or is missing a method.
    case apiMissing(String)
    /// A JavaScriptCore exception escaped the call (not an engine-handled error).
    case javaScriptException(method: String, message: String, stack: String)
    /// The engine caught the error itself and returned `{"ok":false,...}`.
    case engineRejected(method: String, name: String, message: String, stack: String, at: String)
    /// The engine returned JSON Swift could not decode into the expected type. Almost
    /// always means the JS contract changed without this package changing with it.
    case decodingFailed(method: String, underlying: String, json: String)
    /// The call returned nothing at all, or a non-string.
    case badReturn(method: String, detail: String)

    public var description: String {
        switch self {
        case .bundleNotFound(let searched):
            return "MQEngineJS: engine.bundle.js not found. Run `npm run build:engine` at the repo root. Searched:\n  "
                + searched.joined(separator: "\n  ")
        case .bundleEvaluationFailed(let message, let stack):
            return "MQEngineJS: the engine bundle failed to evaluate: \(message)\n\(stack)"
        case .apiMissing(let what):
            return "MQEngineJS: \(what)"
        case .javaScriptException(let method, let message, let stack):
            return "MQEngineJS: JavaScript exception in \(method)(): \(message)\n\(stack)"
        case .engineRejected(let method, let name, let message, let stack, let at):
            return "MQEngineJS: engine rejected \(method)() at \(at): \(name): \(message)\n\(stack)"
        case .decodingFailed(let method, let underlying, let json):
            return "MQEngineJS: could not decode \(method)(): \(underlying)\n  payload: \(json.prefix(600))"
        case .badReturn(let method, let detail):
            return "MQEngineJS: \(method)() returned \(detail)"
        }
    }

    /// The JS stack, wherever the failure carried one.
    public var javaScriptStack: String? {
        switch self {
        case .bundleEvaluationFailed(_, let s), .javaScriptException(_, _, let s), .engineRejected(_, _, _, let s, _):
            return s.isEmpty ? nil : s
        default: return nil
        }
    }
}
