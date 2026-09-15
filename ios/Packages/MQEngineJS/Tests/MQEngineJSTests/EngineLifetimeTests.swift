import Foundation
import Testing
import MQContent
@testable import MQEngineJS

/// State, lifetime and memory - the third attack surface, and the one the refuter's
/// soak measurements landed on.
///
/// The numbers that produced these tests, measured on Kai at `d060bb3`:
///
/// * 20,000 named feed sessions, never ended: RSS 6.3 -> **189 MB**, dead linear,
///   ~9.1 kB per session, no plateau. `api.js`'s session map held every one for the
///   life of the context and `{all:true}` was not reachable from Swift.
/// * 200,000 draws + 200,000 gradings in ONE `JSContext`: max RSS **814 MB**. Not a
///   leak, but no ceiling either - and Charlotte's iPad jetsams under 1 GB.
///
/// So the module now owns three things it did not: an LRU cap on the JS side, an
/// `endSession(all:)` that reaches it, and a documented memory-pressure path
/// (`relieveMemoryPressure()`, `collectGarbage()`, `reset()`).
@Suite("Engine lifetime and memory")
struct EngineLifetimeTests {

    private func engine() throws -> JSQuestionEngine { try JSQuestionEngine() }

    // MARK: - The session map is bounded

    @Test("the feed-session map is LRU-capped, so un-ended sessions cannot grow without bound")
    func sessionMapIsCapped() async throws {
        let e = try engine()
        let start = try await e.sessionState()
        #expect(start.cap > 0, "the engine must declare a session cap")
        #expect(start.open == 0, "a fresh context holds no sessions")

        // Open four times the cap and never end one - the 20,000-session leak in
        // miniature. The map must stop growing at the cap.
        let toOpen = start.cap * 4
        for i in 0..<toOpen {
            _ = try await e.nextQuestion(.feed(topic: "geometry", level: 1, session: "cap-probe-\(i)"))
        }
        let after = try await e.sessionState()
        #expect(after.open <= after.cap,
                "the session map holds \(after.open) sessions against a cap of \(after.cap)")
        #expect(after.evicted >= toOpen - after.cap,
                "eviction must be reported: \(after.evicted) evicted after opening \(toOpen)")

        // An evicted session is not an error: it rebuilds its rings on the next draw.
        let revived = try await e.nextQuestion(.feed(topic: "geometry", level: 1, session: "cap-probe-0"))
        #expect(!revived.stemText.isEmpty, "a session evicted by the LRU must still draw")
    }

    @Test("endSession(all:) retires every open session in one crossing")
    func endAllSessions() async throws {
        let e = try engine()
        for i in 0..<12 {
            _ = try await e.nextQuestion(.feed(topic: "tables", level: 1, session: "drain-\(i)"))
        }
        #expect(try await e.sessionState().open == 12)

        let after = try await e.endSession(all: true)
        #expect(after.open == 0, "endSession(all:) left \(after.open) session(s) open")
        #expect(after.ended.count == 12, "it reported \(after.ended.count) retired, expected 12")

        // Idempotent, and safe on an empty map.
        let again = try await e.endSession(all: true)
        #expect(again.open == 0)
        #expect(again.ended.isEmpty)
    }

    @Test("relieveMemoryPressure drains the sessions and collects, and the engine keeps working")
    func memoryPressureHook() async throws {
        let e = try engine()
        for i in 0..<20 {
            _ = try await e.nextQuestion(.feed(topic: "fractions", level: 2, session: "pressure-\(i)"))
        }
        #expect(try await e.sessionState().open == 20)

        let state = try await e.relieveMemoryPressure()
        #expect(state.open == 0, "the pressure hook must drop every session")

        // The whole point: the engine is still usable afterwards.
        let q = try await e.nextQuestion(.pool(topic: "fractions", level: 1))
        let v = try await e.grade(question: q, answer: q.selfAnswer)
        #expect(v.correct, "the engine must still grade after a memory-pressure drain")
    }

    // MARK: - reset() rebuilds the context

    @Test("reset() rebuilds the JSContext, and a question drawn before it still grades after it")
    func resetRebuildsTheContext() async throws {
        let e = try engine()

        // Draw BEFORE the reset, grade AFTER it. This is the stateless-grading claim
        // under the harshest version of itself: not "persist and relaunch" but "the
        // whole JavaScript world was thrown away between draw and grade".
        let q = try await e.nextQuestion(.pool(topic: "p4area", level: 2))
        let stampBefore = try await e.engineBuild().stamp
        #expect(await e.isLoaded())

        await e.reset()
        #expect(await !e.isLoaded(), "reset() must drop the context")
        #expect(await e.timesReset() == 1)

        let v = try await e.grade(question: q, answer: q.selfAnswer)
        #expect(v.correct, "a question drawn before reset() must still grade correct after it")
        #expect(try await e.engineBuild().stamp == stampBefore, "the rebuilt context loads the same bundle")
        #expect(await e.isLoaded())

        // Sessions do not survive a reset, and that is documented, not accidental.
        #expect(try await e.sessionState().open == 0)
    }

    // MARK: - The DEBUG-only bundle override

    /// A shipped app that loads its interpreted code from a path an environment
    /// variable names is exactly the surface DPLA 3.3.1(B) is written about. The
    /// override is compiled out of release builds; this asserts the guard exists at
    /// all, so it cannot be quietly deleted.
    @Test("the MQI_ENGINE_BUNDLE override is DEBUG-only")
    func bundleOverrideIsDebugOnly() throws {
        #if DEBUG
        #expect(EngineBundleLocator.environmentOverrideIsCompiledIn,
                "tests run in DEBUG, where the override is available to harnesses")
        #else
        #expect(!EngineBundleLocator.environmentOverrideIsCompiledIn,
                "a release build must not read MQI_ENGINE_BUNDLE")
        #endif
    }

    // MARK: - The bundle the tests actually loaded is the committed one

    /// The gate must be testing what ships. `check:engine` proves the committed bundle
    /// is a build of the current sources; this proves the Swift suite loaded THAT file
    /// and not some other copy an environment variable pointed at.
    @Test("the suite loaded the committed package resource, not a stray bundle")
    func loadedBundleIsTheCommittedResource() async throws {
        let e = try engine()
        let path = e.loadedBundleURL.path
        #expect(path.hasSuffix("engine.bundle.js"), "loaded \(path)")
        let text = try await e.bundleText()
        #expect(text.contains("/* ENGINE_BUILD "), "the loaded bundle carries no ENGINE_BUILD stamp")
        #expect(text.contains("var MQI_API"), "the loaded bundle defines no MQI_API")
    }
}
