import Foundation

/// How a question was asked for.
///
/// Three modes, and the difference matters:
///
///  * `.feed(topic:level:session:)` - the normal child path. Goes through
///    `MQI.createFeed`, which holds the no-repeat rings that stop "perimeter,
///    perimeter, area, area". A session id names the ring; two screens sharing an id
///    share the ring. **Use this for play.**
///  * `.pool(topic:level:)` - a bare uniform draw with replacement, no memory. What
///    Patchwerk wants (it rotates topics itself), and what a preview wants. Not the
///    child's session feed: it repeats.
///  * `.generator(ref:)` - one named pool entry. For gates and content review only;
///    it is the only way to prove every generator is exercised.
public enum QuestionRequest: Hashable, Sendable {
    case feed(topic: String, level: Int, session: String)
    case pool(topic: String, level: Int)
    case generator(ref: String, level: Int? = nil)
}

/// The seam between the game and whatever produces questions.
///
/// `MQEngineJS` is the only implementer today (the JS engine inside JavaScriptCore).
/// **UI never imports `MQEngineJS`** - it imports this module and takes a
/// `QuestionSource`. That is what makes a future Swift port, or a fixture source in a
/// snapshot test, a drop-in.
///
/// Everything is `async` because the real implementation is actor-confined: one
/// `JSContext` per app launch, never touched from two threads.
public protocol QuestionSource: Sendable {

    /// Every registered topic, its skills and its generator refs.
    func listTopics() async throws -> TopicCatalogue

    /// One question.
    func nextQuestion(_ request: QuestionRequest) async throws -> Question

    /// `count` questions in one crossing of the bridge. For a feed request the
    /// no-repeat rings still apply across the batch, so this is not the same as
    /// calling `nextQuestion` `count` times on separate sessions.
    func nextQuestions(_ request: QuestionRequest, count: Int) async throws -> [Question]

    /// The engine's ruling. Grading semantics (units, fractions, decimal places) live
    /// in the engine and are re-derived nowhere in Swift.
    func grade(question: Question, answer: Answer) async throws -> Verdict

    /// Grade a batch in one crossing. Order of results matches order of input.
    func grade(_ pairs: [(question: Question, answer: Answer)]) async throws -> [Verdict]

    /// The worked explanation plus the parent tip for the skill exercised.
    func explain(_ question: Question) async throws -> Explanation

    /// Which engine bundle is loaded.
    func engineBuild() async throws -> EngineBuild

    /// Retire a feed session's no-repeat rings. Safe to call for an unknown id.
    func endSession(_ session: String) async throws

    /// Retire EVERY open feed session in one crossing, and report what the session map
    /// holds afterwards.
    ///
    /// That map is the engine's only unbounded state. `{all:true}` existed on the JS
    /// side from the start but was unreachable from Swift, so the only way to free a
    /// session was to have remembered its id - which is how 20,000 un-ended sessions
    /// and 189 MB resident happen. A profile switch, a mode change or a backgrounding
    /// should call this.
    @discardableResult
    func endSession(all: Bool) async throws -> SessionState
}

public extension QuestionSource {
    /// A source with no session state has nothing to retire.
    @discardableResult
    func endSession(all: Bool) async throws -> SessionState {
        SessionState(open: 0, cap: 0, evicted: 0)
    }

    func nextQuestions(_ request: QuestionRequest, count: Int) async throws -> [Question] {
        var out: [Question] = []
        out.reserveCapacity(count)
        for _ in 0..<count { out.append(try await nextQuestion(request)) }
        return out
    }

    func grade(_ pairs: [(question: Question, answer: Answer)]) async throws -> [Verdict] {
        var out: [Verdict] = []
        out.reserveCapacity(pairs.count)
        for p in pairs { out.append(try await grade(question: p.question, answer: p.answer)) }
        return out
    }
}
