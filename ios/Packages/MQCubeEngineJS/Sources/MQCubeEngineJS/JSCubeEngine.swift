import Foundation
import JavaScriptCore
import MQCubeContent

/// Cube Quest's two gate-verified cores, its inference engine and its guided-solve script,
/// running inside JavaScriptCore behind `MQCubeContent.CubeEngine`.
///
/// # Why this is its own actor and its own JSContext
///
/// `MQEngineJS.JSQuestionEngine` already holds a `JSContext` for the question engine. This
/// one does **not** share it, and that is deliberate:
///
/// * **Two bundles, two lifetimes.** The question engine holds real state (each feed
///   session's no-repeat rings) and gets memory-pressure drains and resets. The cube
///   engine holds none at all. Sharing a context would mean a cube call could be waiting
///   behind a 200-question draw, and a `reset()` for one would throw away the other.
/// * **Two attestations.** Each bundle's bytes are hashed against its own sources by its
///   own gate. One context loading both would make "which code is running" a harder
///   question than it needs to be at review time.
/// * **Isolation is the point.** `JSContext` is not thread-safe in any way an app should
///   rely on; actor isolation makes every call serial by construction and the context is
///   never handed out, never captured in an escaping closure.
///
/// The context is created lazily on first use, so constructing the engine cannot fail and
/// the first call surfaces a missing or broken bundle as a Swift error.
public actor JSCubeEngine: CubeEngine {

    private let bundleURL: URL
    private var context: JSContext?
    private var api: JSValue?
    private var bundleSource: String?

    public init(bundleURL: URL? = nil) throws {
        self.bundleURL = try CubeBundleLocator.locate(explicit: bundleURL)
    }

    /// Where the loaded bundle came from. Useful in a rehearsal log.
    public nonisolated var loadedBundleURL: URL { bundleURL }

    // MARK: - Context

    /// Every method the bridge calls. Checked once, at load, so a bundle missing one is a
    /// clear error at startup rather than a decode failure three screens in.
    static let requiredMethods = [
        "build", "newSolved", "scramble", "applyMoves", "isSolved", "stickers", "validate",
        "validateState", "stepStatus", "buildPlan", "guideScript", "guideNode", "bestQuestion",
        "geometry", "moveGeometry", "words", "drainLogs"
    ]

    private func ready() throws -> JSValue {
        if let api { return api }

        let source: String
        do { source = try String(contentsOf: bundleURL, encoding: .utf8) }
        catch { throw CubeEngineError.bundleEvaluationFailed(message: "cannot read \(bundleURL.path): \(error)", stack: "") }

        let ctx = JSContext(virtualMachine: JSVirtualMachine())!
        ctx.exceptionHandler = { context, exception in context?.exception = exception }
        ctx.evaluateScript(source, withSourceURL: bundleURL)
        if let ex = ctx.exception {
            throw CubeEngineError.bundleEvaluationFailed(message: ex.toString() ?? "unknown", stack: Self.stack(of: ex))
        }

        guard let apiValue = ctx.objectForKeyedSubscript("CUBE_API"), !apiValue.isUndefined, !apiValue.isNull else {
            throw CubeEngineError.apiMissing("the bundle evaluated but did not define CUBE_API (\(bundleURL.lastPathComponent))")
        }
        for method in Self.requiredMethods {
            let f = apiValue.objectForKeyedSubscript(method)
            guard let f, !f.isUndefined, !f.isNull else {
                throw CubeEngineError.apiMissing("CUBE_API.\(method) is missing from the bundle")
            }
        }

        self.context = ctx
        self.api = apiValue
        self.bundleSource = source
        return apiValue
    }

    private static func stack(of value: JSValue) -> String {
        value.objectForKeyedSubscript("stack")?.toString() ?? ""
    }

    // MARK: - Raw call

    /// Invoke one `CUBE_API` method and hand back its JSON string, unparsed.
    public func callRaw(_ method: String, argumentsJSON: String?) throws -> String {
        let api = try ready()
        guard let ctx = context else { throw CubeEngineError.apiMissing("no JSContext") }
        ctx.exception = nil

        // One pool per call. Every crossing mints a JSValue for the argument, one for the
        // result and one per exception probe; without a pool they accumulate until the
        // enclosing task drains, which under a 10,000-round-trip parity replay is never.
        let json: String = try autoreleasepool {
            let args: [Any] = argumentsJSON.map { [$0] } ?? []
            let result = api.invokeMethod(method, withArguments: args)
            if let ex = ctx.exception {
                ctx.exception = nil
                throw CubeEngineError.javaScriptException(method: method,
                                                          message: ex.toString() ?? "unknown",
                                                          stack: Self.stack(of: ex))
            }
            guard let result, result.isString, let text = result.toString() else {
                throw CubeEngineError.badReturn(method: method, detail: result.map { "\($0)" } ?? "nil")
            }
            return text
        }
        return json
    }

    /// Evaluate an expression in the loaded context. Diagnostics only, and deliberately
    /// `internal`: the gate uses it to prove what the host shim did and did not put in the
    /// context. Nothing on the child's path may call this.
    func evaluateForDiagnostics(_ expression: String) throws -> String {
        _ = try ready()
        guard let ctx = context else { throw CubeEngineError.apiMissing("no JSContext") }
        ctx.exception = nil
        let value = ctx.evaluateScript(expression)
        if let ex = ctx.exception {
            ctx.exception = nil
            throw CubeEngineError.javaScriptException(method: "evaluate", message: ex.toString() ?? "unknown",
                                                      stack: Self.stack(of: ex))
        }
        return value?.toString() ?? "nil"
    }

    /// The bundle file's own text, read once when the context was created.
    public func bundleText() throws -> String {
        _ = try ready()
        return bundleSource ?? ""
    }

    /// The `CUBE_ENGINE_BUILD` stamp written into the bundle FILE, read out of the text
    /// rather than from the running engine, so a gate can prove the two agree.
    public func stampInBundleFile() throws -> String? {
        let text = try bundleText()
        guard let r = text.range(of: #"/\* CUBE_ENGINE_BUILD ([^\s*]+) \*/"#, options: .regularExpression) else { return nil }
        return String(text[r])
            .replacingOccurrences(of: "/* CUBE_ENGINE_BUILD ", with: "")
            .replacingOccurrences(of: " */", with: "")
    }

    /// Force a JavaScriptCore collection.
    public func collectGarbage() {
        guard let ref = context?.jsGlobalContextRef else { return }
        JSGarbageCollect(ref)
    }

    /// Throw the context away; the next call rebuilds it from the same bundle. The cube
    /// engine holds no state, so nothing is lost - a `CubeState` in hand is just data.
    public func reset() {
        api = nil
        context = nil
        bundleSource = nil
    }

    public func isLoaded() -> Bool { api != nil }

    /// Anything the engine logged since the last drain.
    public func drainLogs() throws -> [String] {
        struct Logs: Decodable { struct Line: Decodable { let level: String; let message: String }; let logs: [Line] }
        return try call("drainLogs", nil, as: Logs.self).logs.map { "[\($0.level)] \($0.message)" }
    }

    // MARK: - Envelope

    private struct Failure: Decodable {
        /// `code` is the runtime-independent handle; `hostDetail` is deliberately NOT
        /// decoded into anything a caller can branch on - it is the one field that carries
        /// a runtime's own wording (wound 7).
        struct Detail: Decodable {
            let name: String
            let code: String?
            let message: String
            let stack: String
            let `where`: String
        }
        let ok: Bool
        let error: Detail?
    }

    private static let decoder = JSONDecoder()
    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.outputFormatting = []
        return e
    }()

    private func call<T: Decodable>(_ method: String, _ argumentsJSON: String?, as type: T.Type) throws -> T {
        let json = try callRaw(method, argumentsJSON: argumentsJSON)
        let data = Data(json.utf8)
        if let failure = try? Self.decoder.decode(Failure.self, from: data), failure.ok == false {
            let d = failure.error
            throw CubeEngineError.engineRejected(method: method,
                                                 name: d?.name ?? "Error",
                                                 code: d?.code ?? "engine-threw",
                                                 message: d?.message ?? "unknown",
                                                 stack: d?.stack ?? "",
                                                 at: d?.where ?? method)
        }
        do { return try Self.decoder.decode(T.self, from: data) }
        catch { throw CubeEngineError.decodingFailed(method: method, underlying: "\(error)", json: json) }
    }

    private func encodeArgs<E: Encodable>(_ value: E, method: String) throws -> String {
        let data = try Self.encoder.encode(value)
        guard let s = String(data: data, encoding: .utf8) else {
            throw CubeEngineError.badReturn(method: method, detail: "arguments were not UTF-8 encodable")
        }
        return s
    }

    // MARK: - Wire types

    private struct SizeArgs: Encodable { let size: Int }
    private struct StateArgs: Encodable { let size: Int; let state: CubeState }
    private struct MoveArgs: Encodable { let size: Int; let state: CubeState; let moves: [String] }
    private struct SeedArgs: Encodable { let size: Int; let seed: Int; let depth: Int }
    private struct MovesOnlyArgs: Encodable { let size: Int; let moves: [String] }
    private struct PresetArgs: Encodable { let size: Int; let preset: String }
    private struct StickerArgs: Encodable { let size: Int; let stickers: [String?] }
    private struct PlanArgs: Encodable { let size: Int; let state: CubeState; let text: Bool }
    private struct NodeArgs: Encodable { let size: Int; let id: String }
    private struct PaintedArgs: Encodable { let size: Int; let painted: [String?]; let nameable: [Bool]? }
    private struct MoveGeoArgs: Encodable { let size: Int; let state: CubeState; let move: String }

    private struct BuildResponse: Decodable { let build: CubeBuild }
    private struct StickerResponse: Decodable { let stickers: [String]; let count: Int }
    private struct ValidateResponse: Decodable { let result: CubeValidation }
    private struct ScriptResponse: Decodable { let script: CubeGuideScript }
    private struct NodeResponse: Decodable { let node: CubeGuideNode }
    private struct WordsResponse: Decodable { let words: CubeWords }

    // MARK: - CubeEngine

    public func cubeBuild() async throws -> CubeBuild {
        try call("build", nil, as: BuildResponse.self).build
    }

    public func newSolved(size: CubeSize) async throws -> CubeSnapshot {
        try call("newSolved", try encodeArgs(SizeArgs(size: size.rawValue), method: "newSolved"), as: CubeSnapshot.self)
    }

    public func scramble(size: CubeSize, seed: Int, depth: Int) async throws -> CubeScramble {
        try call("scramble", try encodeArgs(SeedArgs(size: size.rawValue, seed: seed, depth: depth), method: "scramble"),
                 as: CubeScramble.self)
    }

    public func scramble(size: CubeSize, moves: [String]) async throws -> CubeScramble {
        try call("scramble", try encodeArgs(MovesOnlyArgs(size: size.rawValue, moves: moves), method: "scramble"),
                 as: CubeScramble.self)
    }

    public func scramble(size: CubeSize, preset: String) async throws -> CubeScramble {
        try call("scramble", try encodeArgs(PresetArgs(size: size.rawValue, preset: preset), method: "scramble"),
                 as: CubeScramble.self)
    }

    public func applyMoves(size: CubeSize, state: CubeState, moves: [String]) async throws -> CubeMoveResult {
        try call("applyMoves", try encodeArgs(MoveArgs(size: size.rawValue, state: state, moves: moves), method: "applyMoves"),
                 as: CubeMoveResult.self)
    }

    public func isSolved(size: CubeSize, state: CubeState) async throws -> CubeSolved {
        try call("isSolved", try encodeArgs(StateArgs(size: size.rawValue, state: state), method: "isSolved"),
                 as: CubeSolved.self)
    }

    public func stickers(size: CubeSize, state: CubeState) async throws -> [String] {
        try call("stickers", try encodeArgs(StateArgs(size: size.rawValue, state: state), method: "stickers"),
                 as: StickerResponse.self).stickers
    }

    public func validate(size: CubeSize, stickers: [String?]) async throws -> CubeValidation {
        try call("validate", try encodeArgs(StickerArgs(size: size.rawValue, stickers: stickers), method: "validate"),
                 as: ValidateResponse.self).result
    }

    public func stepStatus(size: CubeSize, state: CubeState) async throws -> CubeStepStatus {
        try call("stepStatus", try encodeArgs(StateArgs(size: size.rawValue, state: state), method: "stepStatus"),
                 as: CubeStepStatus.self)
    }

    public func buildPlan(size: CubeSize, state: CubeState, includeText: Bool = true) async throws -> CubePlan {
        try call("buildPlan", try encodeArgs(PlanArgs(size: size.rawValue, state: state, text: includeText), method: "buildPlan"),
                 as: CubePlan.self)
    }

    public func guideScript(size: CubeSize) async throws -> CubeGuideScript {
        try call("guideScript", try encodeArgs(SizeArgs(size: size.rawValue), method: "guideScript"),
                 as: ScriptResponse.self).script
    }

    public func guideNode(size: CubeSize, id: String) async throws -> CubeGuideNode {
        try call("guideNode", try encodeArgs(NodeArgs(size: size.rawValue, id: id), method: "guideNode"),
                 as: NodeResponse.self).node
    }

    public func bestQuestion(size: CubeSize, painted: [String?], nameable: [Bool]? = nil) async throws -> CubeQuestion {
        try call("bestQuestion",
                 try encodeArgs(PaintedArgs(size: size.rawValue, painted: painted, nameable: nameable),
                                method: "bestQuestion"),
                 as: CubeQuestion.self)
    }

    /// Is this a cube at all, and is it a cube a child could be holding?
    ///
    /// Never throws for a malformed state: the whole point is that a corrupt save comes
    /// back as an ANSWER a UI can show, not as a decode failure three frames in. It throws
    /// only if the engine itself is broken.
    public func validateState(size: CubeSize, state: CubeState) async throws -> CubeStateValidation {
        try call("validateState", try encodeArgs(StateArgs(size: size.rawValue, state: state), method: "validateState"),
                 as: CubeStateValidation.self)
    }

    public func geometry(size: CubeSize, state: CubeState) async throws -> CubeGeometry {
        try call("geometry", try encodeArgs(StateArgs(size: size.rawValue, state: state), method: "geometry"),
                 as: CubeGeometry.self)
    }

    public func moveGeometry(size: CubeSize, state: CubeState, move: String) async throws -> CubeMoveGeometry {
        try call("moveGeometry", try encodeArgs(MoveGeoArgs(size: size.rawValue, state: state, move: move), method: "moveGeometry"),
                 as: CubeMoveGeometry.self)
    }

    public func words(size: CubeSize) async throws -> CubeWords {
        try call("words", try encodeArgs(SizeArgs(size: size.rawValue), method: "words"),
                 as: WordsResponse.self).words
    }
}
