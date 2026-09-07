import Foundation
import JavaScriptCore
import MQContent

/// The 226 gate-verified generators, the grader and the feed sequencer, running inside
/// JavaScriptCore behind `MQContent.QuestionSource`.
///
/// WHY THIS SHAPE
///
/// * **One `JSContext`, one actor.** `JSContext` is not thread-safe in any way the
///   app should rely on, and the engine holds real state (each feed session's
///   no-repeat rings). Actor isolation makes every call serial by construction; the
///   context is never handed out, never captured in an escaping closure, never seen
///   by another task.
/// * **JSON strings across the boundary, not `JSExport`.** The engine is plain ES5
///   authored for a browser. Anything richer would mean annotating engine objects for
///   Objective-C bridging - i.e. editing the files that are the oracle. A JSON string
///   costs one serialise per call and keeps `js/` untouched.
/// * **Swift never grades.** `Question.key` travels back to the engine verbatim
///   (see `MQContent.JSONValue`). The unit, fraction and decimal-place rules live in
///   `js/core.js` and exist in exactly one place.
///
/// The context is created lazily on first use so that constructing the engine cannot
/// fail; the first call surfaces a missing or broken bundle as a Swift error.
public actor JSQuestionEngine: QuestionSource {

    private let bundleURL: URL
    private var context: JSContext?
    private var api: JSValue?

    /// The bundle text, kept so a gate can assert the file's own `ENGINE_BUILD` line
    /// matches what `build()` reports at runtime.
    private var bundleSource: String?

    /// - Parameter bundleURL: an explicit `engine.bundle.js`. Defaults to the package
    ///   resource, overridable at runtime with `MQI_ENGINE_BUNDLE`.
    public init(bundleURL: URL? = nil) throws {
        self.bundleURL = try EngineBundleLocator.locate(explicit: bundleURL)
    }

    /// Where the loaded bundle came from. Useful in a rehearsal log.
    public nonisolated var loadedBundleURL: URL { bundleURL }

    // MARK: - Context

    private func ready() throws -> JSValue {
        if let api { return api }

        let source: String
        do { source = try String(contentsOf: bundleURL, encoding: .utf8) }
        catch { throw EngineError.bundleEvaluationFailed(message: "cannot read \(bundleURL.path): \(error)", stack: "") }

        let ctx = JSContext(virtualMachine: JSVirtualMachine())!
        // Default handler only logs; we want the exception object itself.
        ctx.exceptionHandler = { context, exception in context?.exception = exception }
        ctx.evaluateScript(source, withSourceURL: bundleURL)
        if let ex = ctx.exception {
            throw EngineError.bundleEvaluationFailed(message: ex.toString() ?? "unknown", stack: Self.stack(of: ex))
        }

        guard let apiValue = ctx.objectForKeyedSubscript("MQI_API"), !apiValue.isUndefined, !apiValue.isNull else {
            throw EngineError.apiMissing("the bundle evaluated but did not define MQI_API (\(bundleURL.lastPathComponent))")
        }
        for method in ["listTopics", "nextQuestion", "grade", "explain", "build", "endSession"] {
            let f = apiValue.objectForKeyedSubscript(method)
            guard let f, !f.isUndefined, !f.isNull else {
                throw EngineError.apiMissing("MQI_API.\(method) is missing from the bundle")
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

    /// Invoke one `MQI_API` method and hand back its JSON string, unparsed.
    /// Exposed so a gate can assert on raw payloads without going through the models.
    public func callRaw(_ method: String, argumentsJSON: String?) throws -> String {
        let api = try ready()
        guard let ctx = context else { throw EngineError.apiMissing("no JSContext") }
        ctx.exception = nil

        let args: [Any] = argumentsJSON.map { [$0] } ?? []
        let result = api.invokeMethod(method, withArguments: args)

        if let ex = ctx.exception {
            ctx.exception = nil
            throw EngineError.javaScriptException(method: method,
                                                  message: ex.toString() ?? "unknown",
                                                  stack: Self.stack(of: ex))
        }
        guard let result, result.isString, let json = result.toString() else {
            throw EngineError.badReturn(method: method, detail: result.map { "\($0)" } ?? "nil")
        }
        return json
    }

    /// Evaluate an expression in the loaded context and return it as a string.
    ///
    /// Diagnostics only, and deliberately `internal`: the gate uses it to prove what the
    /// host shim did and did not put in the context (no `window`, no `document`, a real
    /// `console`). Nothing on the child's path may call this - the app talks to the
    /// engine through `MQI_API` and nothing else.
    func evaluateForDiagnostics(_ expression: String) throws -> String {
        _ = try ready()
        guard let ctx = context else { throw EngineError.apiMissing("no JSContext") }
        ctx.exception = nil
        let value = ctx.evaluateScript(expression)
        if let ex = ctx.exception {
            ctx.exception = nil
            throw EngineError.javaScriptException(method: "evaluate", message: ex.toString() ?? "unknown",
                                                  stack: Self.stack(of: ex))
        }
        return value?.toString() ?? "nil"
    }

    /// The bundle file's own text. Read once, when the context is created.
    public func bundleText() throws -> String {
        _ = try ready()
        return bundleSource ?? ""
    }

    // MARK: - Envelope

    private struct Failure: Decodable {
        struct Detail: Decodable { let name: String; let message: String; let stack: String; let `where`: String }
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
            throw EngineError.engineRejected(method: method,
                                             name: d?.name ?? "Error",
                                             message: d?.message ?? "unknown",
                                             stack: d?.stack ?? "",
                                             at: d?.where ?? method)
        }
        do { return try Self.decoder.decode(T.self, from: data) }
        catch { throw EngineError.decodingFailed(method: method, underlying: "\(error)", json: json) }
    }

    private func encodeArgs<E: Encodable>(_ value: E, method: String) throws -> String {
        let data = try Self.encoder.encode(value)
        guard let s = String(data: data, encoding: .utf8) else {
            throw EngineError.badReturn(method: method, detail: "arguments were not UTF-8 encodable")
        }
        return s
    }

    // MARK: - Wire types (the JSON shapes tools/engine/api.js returns)

    private struct QuestionsResponse: Decodable { let question: Question?; let questions: [Question]; let count: Int }
    private struct VerdictsResponse: Decodable { let verdict: Verdict?; let verdicts: [Verdict]; let count: Int }
    private struct ExplanationResponse: Decodable { let explanation: Explanation }
    private struct BuildResponse: Decodable { let build: EngineBuild }

    private struct DrawArgs: Encodable {
        var topic: String?
        var level: Int?
        var session: String?
        var generator: String?
        var count: Int?
    }
    private struct GradeItem: Encodable { let question: Question; let answer: Answer }
    private struct GradeArgs: Encodable { let items: [GradeItem] }
    private struct ExplainArgs: Encodable { let question: Question }
    private struct SessionArgs: Encodable { let session: String }

    private static func drawArgs(_ request: QuestionRequest, count: Int?) -> DrawArgs {
        switch request {
        case .feed(let topic, let level, let session):
            return DrawArgs(topic: topic, level: level, session: session, generator: nil, count: count)
        case .pool(let topic, let level):
            return DrawArgs(topic: topic, level: level, session: nil, generator: nil, count: count)
        case .generator(let ref, let level):
            return DrawArgs(topic: nil, level: level, session: nil, generator: ref, count: count)
        }
    }

    // MARK: - QuestionSource

    public func listTopics() async throws -> TopicCatalogue {
        try call("listTopics", nil, as: TopicCatalogue.self)
    }

    public func nextQuestion(_ request: QuestionRequest) async throws -> Question {
        let args = try encodeArgs(Self.drawArgs(request, count: nil), method: "nextQuestion")
        let r = try call("nextQuestion", args, as: QuestionsResponse.self)
        guard let q = r.question ?? r.questions.first else {
            throw EngineError.badReturn(method: "nextQuestion", detail: "no question in the response")
        }
        return q
    }

    public func nextQuestions(_ request: QuestionRequest, count: Int) async throws -> [Question] {
        guard count > 0 else { return [] }
        let args = try encodeArgs(Self.drawArgs(request, count: count), method: "nextQuestion")
        return try call("nextQuestion", args, as: QuestionsResponse.self).questions
    }

    public func grade(question: Question, answer: Answer) async throws -> Verdict {
        let args = try encodeArgs(GradeArgs(items: [GradeItem(question: question, answer: answer)]), method: "grade")
        let r = try call("grade", args, as: VerdictsResponse.self)
        guard let v = r.verdict ?? r.verdicts.first else {
            throw EngineError.badReturn(method: "grade", detail: "no verdict in the response")
        }
        return v
    }

    public func grade(_ pairs: [(question: Question, answer: Answer)]) async throws -> [Verdict] {
        guard !pairs.isEmpty else { return [] }
        let args = try encodeArgs(GradeArgs(items: pairs.map { GradeItem(question: $0.question, answer: $0.answer) }),
                                  method: "grade")
        let verdicts = try call("grade", args, as: VerdictsResponse.self).verdicts
        guard verdicts.count == pairs.count else {
            throw EngineError.badReturn(method: "grade",
                                        detail: "\(verdicts.count) verdicts for \(pairs.count) items")
        }
        return verdicts
    }

    public func explain(_ question: Question) async throws -> Explanation {
        let args = try encodeArgs(ExplainArgs(question: question), method: "explain")
        return try call("explain", args, as: ExplanationResponse.self).explanation
    }

    public func engineBuild() async throws -> EngineBuild {
        try call("build", nil, as: BuildResponse.self).build
    }

    public func endSession(_ session: String) async throws {
        struct Ended: Decodable { let ended: [String]; let open: Int }
        _ = try call("endSession", try encodeArgs(SessionArgs(session: session), method: "endSession"), as: Ended.self)
    }

    // MARK: - Diagnostics

    /// Anything the engine logged since the last drain. The host shim buffers
    /// `console.*` because a `JSContext` has no console at all; without the buffer a
    /// stray `console.log` in an engine file would be a ReferenceError, not a message.
    public func drainLogs() throws -> [String] {
        struct Logs: Decodable { struct Line: Decodable { let level: String; let message: String }; let logs: [Line] }
        return try call("drainLogs", nil, as: Logs.self).logs.map { "[\($0.level)] \($0.message)" }
    }

    /// The `ENGINE_BUILD` stamp written into the bundle FILE, read out of the text
    /// rather than from the running engine - so a gate can prove the two agree.
    public func stampInBundleFile() throws -> String? {
        let text = try bundleText()
        guard let r = text.range(of: #"/\* ENGINE_BUILD ([^\s*]+) \*/"#, options: .regularExpression) else { return nil }
        let line = String(text[r])
        return line
            .replacingOccurrences(of: "/* ENGINE_BUILD ", with: "")
            .replacingOccurrences(of: " */", with: "")
    }
}
