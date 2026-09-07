import Foundation

/// Everything that can go wrong between Swift and the cube engine bundle.
///
/// Same rule as `MQEngineJS.EngineError`: a JavaScript failure is never swallowed and
/// never flattened. It arrives carrying the JS message AND the JS stack, because the
/// stack names the function inside the extracted block - `cube-engine.bundle.js:1204`,
/// which maps straight back to a line of `cube/index.html` through the build's own
/// block table - and that is what turns a crash report into a fix.
public enum CubeEngineError: Error, CustomStringConvertible, Sendable {

    case bundleNotFound(searched: [String])
    case bundleEvaluationFailed(message: String, stack: String)
    case apiMissing(String)
    case javaScriptException(method: String, message: String, stack: String)
    /// The engine caught it itself and returned `{"ok":false,...}`. This is the normal
    /// path for a bad argument: an unknown move, a malformed state, a size that is not 2
    /// or 3, an unknown guide node id.
    ///
    /// `code` is the RUNTIME-INDEPENDENT handle - `bad-json`, `bad-state`, `bad-move`,
    /// `bad-size`, `bad-args`, `no-preset`, `no-node`, or `engine-threw` for anything a
    /// core raised. Branch on that, never on `message`, and never on `stack`: refutation
    /// wound 7 found the host's own JSON-parser wording crossing this boundary
    /// ("Expected property name or '}' in JSON at position 1" in V8 against
    /// "JSON Parse error: Expected '}'" in JavaScriptCore), so what a caller can rely on
    /// had to become a code rather than a sentence.
    case engineRejected(method: String, name: String, code: String, message: String, stack: String, at: String)
    case decodingFailed(method: String, underlying: String, json: String)
    case badReturn(method: String, detail: String)

    public var description: String {
        switch self {
        case .bundleNotFound(let searched):
            return "MQCubeEngineJS: cube-engine.bundle.js not found. Run `npm run build:cube-engine` at the repo root. Searched:\n  "
                + searched.joined(separator: "\n  ")
        case .bundleEvaluationFailed(let message, let stack):
            return "MQCubeEngineJS: the cube engine bundle failed to evaluate: \(message)\n\(stack)"
        case .apiMissing(let what):
            return "MQCubeEngineJS: \(what)"
        case .javaScriptException(let method, let message, let stack):
            return "MQCubeEngineJS: JavaScript exception in \(method)(): \(message)\n\(stack)"
        case .engineRejected(let method, let name, let code, let message, let stack, let at):
            return "MQCubeEngineJS: engine rejected \(method)() at \(at): \(name) [\(code)]: \(message)\n\(stack)"
        case .decodingFailed(let method, let underlying, let json):
            return "MQCubeEngineJS: could not decode \(method)(): \(underlying)\n  payload: \(json.prefix(600))"
        case .badReturn(let method, let detail):
            return "MQCubeEngineJS: \(method)() returned \(detail)"
        }
    }

    public var javaScriptStack: String? {
        switch self {
        case .bundleEvaluationFailed(_, let s), .javaScriptException(_, _, let s), .engineRejected(_, _, _, _, let s, _):
            return s.isEmpty ? nil : s
        default: return nil
        }
    }

    /// The refusal message, when the engine rejected the call. A UI shows this only in a
    /// developer surface; the child's refusals come from `CubeValidation.message`.
    public var engineMessage: String? {
        if case .engineRejected(_, _, _, let m, _, _) = self { return m }
        return nil
    }

    /// The engine's runtime-independent refusal code, when it refused. This is the field a
    /// caller branches on - `message` is for a human and `stack` differs between V8 and
    /// JavaScriptCore by design.
    public var engineCode: String? {
        if case .engineRejected(_, _, let c, _, _, _) = self { return c }
        return nil
    }
}
