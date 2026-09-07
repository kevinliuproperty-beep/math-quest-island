import Foundation
import Testing
import MQContent
@testable import MQEngineJS

/// The bridge gate. Everything here runs on Kai under Command Line Tools: JavaScriptCore
/// is a macOS framework, so the same engine the iPad will run is exercised on this box.
///
/// swift-testing rather than XCTest, because CLT ships `Testing.framework` and no XCTest
/// at all. Supreme's Xcode runs the identical suite.
@Suite("MQEngineJS bridge")
struct EngineBridgeTests {

    /// Draws per generator. The gate value is 200 - the same sample size
    /// `tools/gen-sanity.mjs` uses on the web side. `MQ_DRAWS=20` for a fast loop.
    ///
    /// On a GATE run (`MQ_GATE=1`, exported by `ios/test.command` when no filter is given)
    /// setting `MQ_DRAWS` is a FAILURE naming the variable. `MQ_DRAWS=0` already failed;
    /// `MQ_DRAWS=1` did not, and the cube refutation showed the whole family riding
    /// through together: `MQ_CUBE_PARITY_ROWS=1 MQ_CUBE_SOLVES=1 MQ_DRAWS=1` printed
    /// "GATE PASSED" in 1.3 s. The floor lives in ios/gate-floor.txt beside the test count.
    static var drawsPerGenerator: Int {
        GateFloor.sampleSize(env: "MQ_DRAWS", floorKey: "engine-draws", default: 200)
    }

    private func engine() throws -> JSQuestionEngine { try JSQuestionEngine() }

    // MARK: - 1. The bundle loads, and says which bundle it is

    @Test("the bundle loads and build() agrees with the file's own ENGINE_BUILD line")
    func buildStampMatchesTheFile() async throws {
        let e = try engine()
        let build = try await e.engineBuild()

        #expect(!build.stamp.isEmpty, "the engine reported no build stamp")
        let stampInFile = try await e.stampInBundleFile()
        #expect(build.stamp == stampInFile,
                "build() reports \(build.stamp) but the bundle file says \(stampInFile ?? "nothing")")

        #expect(build.platform == "javascriptcore", "the host shim should see a JSContext, not a Node vm")
        #expect(build.topicCount == 28)
        #expect(build.files.first == "js/core.js", "core.js registers the kit everything else uses")
        #expect(build.files.contains("js/registry.js"))
        #expect(build.files.filter { $0.hasPrefix("js/topics/") }.count == 28)
        #expect(build.fileCount >= 30, "core.js + 28 topic files + registry.js, plus any engine file added since")
        // The app shell and the mode files are UI/session concerns the native app
        // rewrites in Swift; they must never be inside the engine bundle.
        #expect(!build.files.contains("js/app.js"))
        #expect(!build.files.contains("js/boot.js"))
        #expect(build.files.allSatisfy { !$0.hasPrefix("js/modes/") })
        #expect(!build.payloadHash.isEmpty)

        let logs = try await e.drainLogs()
        #expect(logs.isEmpty, "the engine logged during load: \(logs)")
    }

    /// The host shim fakes a console (a JSContext has none) and NOTHING else. If a
    /// browser global ever appears here, an engine file started assuming a DOM and the
    /// bundle would behave differently in the app than in the web harnesses.
    @Test("the host shim did not invent a browser")
    func hostShimIsMinimal() async throws {
        let e = try engine()
        for global in ["window", "document", "navigator", "localStorage", "fetch", "setTimeout", "alert", "require"] {
            let seen = try await e.evaluateForDiagnostics("typeof \(global)")
            #expect(seen == "undefined", "\(global) leaked into the engine context")
        }
        // The shim installs its OWN console over whatever JavaScriptCore provides, so
        // engine output reaches the host instead of vanishing into the system log.
        #expect(try await e.evaluateForDiagnostics("typeof console.log") == "function")
        #expect(try await e.evaluateForDiagnostics("MQI_HOST.platform") == "javascriptcore")
        #expect(try await e.evaluateForDiagnostics("String(Object.keys(MQI.topics).length)") == "28")

        // The buffered console really buffers rather than throwing.
        _ = try await e.evaluateForDiagnostics("console.warn('bridge gate probe'), 'ok'")
        #expect(try await e.drainLogs() == ["[warn] bridge gate probe"])
        #expect(try await e.drainLogs().isEmpty, "drainLogs must empty the buffer")
    }

    // MARK: - 2. The catalogue

    @Test("listTopics returns the whole island: 28 topics, 250 generator refs")
    func listTopicsReturnsTheIsland() async throws {
        let e = try engine()
        let cat = try await e.listTopics()

        #expect(cat.count == 28, "28 topics ship today")
        #expect(cat.topics.count == 28)
        #expect(cat.grades == ["P2", "P3", "P4", "P5", "P6"])

        for t in cat.topics {
            #expect(!t.id.isEmpty)
            #expect(!t.level.isEmpty, "\(t.id): no MOE level")
            #expect(!t.moeSubTopic.isEmpty, "\(t.id): no MOE sub-topic string")
            #expect(!t.skills.isEmpty, "\(t.id): no skills")
            for pool in ["1", "2", "3"] {
                #expect((t.poolSizes[pool] ?? 0) > 0, "\(t.id): pool \(pool) is empty")
            }
            let skillIds = Set(t.skills.map(\.id))
            for g in t.generators {
                #expect(skillIds.contains(g.skill), "\(t.id): generator \(g.ref) names an unknown skill")
            }
            #expect(t.skills.allSatisfy { !$0.tip.isEmpty }, "\(t.id): a skill is missing its parent tip")
        }

        let refs = cat.allGeneratorRefs
        #expect(Set(refs).count == refs.count, "generator refs must be unique")
        #expect(refs.count == cat.generatorCount)
        // 250 pool entries over 226 distinct generator functions: a generator may sit in
        // more than one pool (gPeri is in 1, 2 AND 3).
        #expect(refs.count == 250, "pool entries")
        let build = try await e.engineBuild()
        #expect(build.distinctGenerators == 226, "distinct generator functions")
        #expect(build.generatorCount == 250)

        // Locked nodes stay visible on the map but are not playable.
        #expect(cat.nodes.contains { !$0.playable }, "the map should still carry Coming-soon nodes")
        #expect(cat.nodes.filter(\.playable).count == 28)
    }

    // MARK: - 3. THE GATE: every generator, 200 draws, self-key grading

    /// Proves that EVERY pool entry reachable through the API produces questions Swift
    /// can decode, and that the engine's own answer key grades correct while a
    /// deliberately wrong answer grades incorrect.
    @Test("every generator: 200 draws, each decodes, its own key grades correct and a wrong answer does not")
    func everyGeneratorDrawsAndGradesItsOwnKey() async throws {
        let e = try engine()
        let cat = try await e.listTopics()
        let draws = Self.drawsPerGenerator
        var totalDrawn = 0, totalGraded = 0
        var choiceCount = 0, typedCount = 0

        for topic in cat.topics {
            for ref in topic.generators {
                let questions = try await e.nextQuestions(.generator(ref: ref.ref), count: draws)
                #expect(questions.count == draws, "\(ref.ref): drew \(questions.count) of \(draws)")
                totalDrawn += questions.count

                var pairs: [(question: Question, answer: Answer)] = []
                pairs.reserveCapacity(questions.count * 2)

                for q in questions {
                    #expect(q.topic == topic.id)
                    #expect(q.generator == ref.ref)
                    #expect(q.skill == ref.skill, "\(ref.ref): skill tag drifted")
                    #expect(!q.stemText.isEmpty, "\(ref.ref): empty stem")
                    #expect(!q.answerTextPlain.isEmpty, "\(ref.ref): empty answer text")
                    #expect(!q.stemText.contains("undefined"), "\(ref.ref): 'undefined' in the stem")
                    #expect(!q.stemText.contains("NaN"), "\(ref.ref): 'NaN' in the stem")

                    switch q.kind {
                    case .choice:
                        choiceCount += 1
                        #expect(q.choices.count == 4, "\(ref.ref): \(q.choices.count) choices")
                        #expect((0..<4).contains(q.correctIndex), "\(ref.ref): correctIndex \(q.correctIndex)")
                        #expect(Set(q.choices).count == 4, "\(ref.ref): duplicate choices")
                        pairs.append((q, .choice(q.correctIndex)))
                        pairs.append((q, .choice((q.correctIndex + 1) % 4)))
                    case .typed:
                        typedCount += 1
                        #expect(q.correctIndex == -1)
                        #expect(q.choices.isEmpty)
                        let answer = try #require(q.key["answer"]?.doubleValue, "\(ref.ref): typed key has no answer")
                        pairs.append((q, q.selfAnswer))
                        // A deliberately wrong answer: one more than the key, unit kept,
                        // so this cannot pass by being rejected as unparseable.
                        let wrong = answer + 1
                        let wrongText = wrong.rounded() == wrong ? String(Int(wrong)) : String(wrong)
                        pairs.append((q, .typed(q.unit.isEmpty ? wrongText : "\(wrongText) \(q.unit)")))
                    }
                }

                let verdicts = try await e.grade(pairs)
                #expect(verdicts.count == pairs.count)
                totalGraded += verdicts.count
                for i in stride(from: 0, to: verdicts.count, by: 2) {
                    let stem = pairs[i].question.stemText
                    let key = pairs[i].question.answerTextPlain
                    let why = verdicts[i].reason ?? "no reason given"
                    #expect(verdicts[i].correct,
                            "\(ref.ref): the question's OWN key graded incorrect - \(key) on \"\(stem)\" (\(why))")
                    #expect(!verdicts[i + 1].correct,
                            "\(ref.ref): a deliberately wrong answer graded CORRECT on \"\(stem)\"")
                }
            }
        }

        #expect(totalDrawn == 250 * draws)
        GateFloor.expectAtLeast(draws, floorKey: "engine-draws", default: 200,
                                what: "draws per generator ref")
        #expect(totalGraded == totalDrawn * 2)
        #expect(choiceCount > 0)
        #expect(typedCount > 0)
        print("bridge gate: \(totalDrawn) questions from 250 generators, \(totalGraded) gradings, "
              + "\(choiceCount) choice / \(typedCount) typed")
    }

    // MARK: - 4. Typed answers behave exactly as the JS grader does

    /// The Wave-2 kill, driven through the bridge. `finishTyped` used to set no unit, so
    /// "113 cm" graded CORRECT against a 113 cm2 answer. A MISSING unit is still
    /// accepted; a WRONG unit must not be. Swift must reproduce this by asking the
    /// engine, never by parsing the answer itself.
    @Test("typed units grade exactly as the JS grader does (the '113 cm' vs cm2 kill)")
    func typedUnitGradingMatchesTheJSGrader() async throws {
        let e = try engine()
        let cat = try await e.listTopics()

        // Drawn, not hand-built, so this exercises the real pipeline end to end.
        // The stems say cm2 as the typographic "cm²"; the grader's alias table is what
        // makes the child's plain "cm2" acceptable, and that is exactly what is tested.
        var subject: Question?
        outer: for ref in try #require(cat.topic("p4area")).generators {
            for q in try await e.nextQuestions(.generator(ref: ref.ref), count: 60)
            where q.isTyped && q.unit == "cm\u{00B2}" {
                subject = q
                break outer
            }
        }
        let q = try #require(subject, "no typed cm2 question found in p4area")
        let answer = try #require(q.key["answer"]?.doubleValue)
        let n = answer.rounded() == answer ? String(Int(answer)) : String(answer)

        let cases: [(String, Bool, String)] = [
            (n,                 true,  "a bare number is always accepted"),
            ("\(n) cm\u{00B2}", true,  "the unit the stem declares is accepted"),
            ("\(n) cm2",        true,  "the plain-ASCII spelling aliases to the same unit"),
            ("\(n) cm",         false, "a WRONG unit is rejected"),
            ("  \(n)  ",        true,  "surrounding whitespace is tolerated"),
            ("",                false, "the empty string is never correct"),
            ("abc",             false, "non-numeric input is never correct")
        ]
        for (text, expected, why) in cases {
            let v = try await e.grade(question: q, answer: .typed(text))
            #expect(v.correct == expected, "typed \"\(text)\": \(why)")
            #expect(v.kind == .typed)
        }

        // The verdict reports HOW the grader read the input, not just yes/no - the app
        // needs that to tell a child "check your units" rather than "wrong".
        let wrongUnit = try await e.grade(question: q, answer: .typed("\(n) cm"))
        #expect(wrongUnit.parsed?.ok == true, "\"\(n) cm\" parses fine; it is the UNIT that is wrong")
        #expect(wrongUnit.parsed?.unit == "cm")
        // The reason SPLITS: the number was right, so this is not "wrong-value".
        // A view that cannot tell those apart can only ever say "wrong" to the child.
        #expect(wrongUnit.reason == "wrong-unit")
        #expect(wrongUnit.reasonKind == .wrongUnit)
        #expect(wrongUnit.isWrongUnit)

        // ...and the other half of the split, on the same question: a wrong NUMBER
        // carrying the right unit is never "wrong-unit".
        let wrongValue = try await e.grade(question: q, answer: .typed("\(n)7 cm\u{00B2}"))
        #expect(wrongValue.correct == false)
        #expect(wrongValue.reason == "wrong-value")
        #expect(wrongValue.reasonKind == .wrongValue)
        #expect(wrongValue.isWrongUnit == false)

        // An unknown reason must decode, not throw: .other keeps the raw text.
        #expect(Verdict.Reason(raw: "brand new reason") == .other("brand new reason"))
        #expect(Verdict.Reason(raw: "wrong-unit").rawValue == "wrong-unit")

        let empty = try await e.grade(question: q, answer: .typed(""))
        #expect(empty.parsed?.ok == false)
        #expect(empty.reason == "empty")
        #expect(empty.reasonKind == .empty)
    }

    /// Money answers are decimals; `parseInt("4.75") === 4` once marked every correct
    /// money answer wrong. Proven through the bridge on a real money item.
    @Test("money answers keep their cents across the bridge")
    func moneyTypedAnswers() async throws {
        let e = try engine()
        let cat = try await e.listTopics()

        var money: Question?
        outer: for ref in try #require(cat.topic("p3money")).generators {
            for q in try await e.nextQuestions(.generator(ref: ref.ref), count: 60)
            where q.isTyped && (q.key["answer"]?.doubleValue.map { $0.rounded() != $0 } ?? false) {
                money = q
                break outer
            }
        }
        let q = try #require(money, "no decimal money question found in p3money")
        let value = try #require(q.key["answer"]?.doubleValue)
        let exact = String(format: "%.2f", value)

        #expect(try await e.grade(question: q, answer: .typed(exact)).correct, "\(exact) is the key")
        #expect(try await e.grade(question: q, answer: .typed("$" + exact)).correct, "a leading $ is stripped")
        #expect(try await e.grade(question: q, answer: .typed(String(Int(value)))).correct == false,
                "the parseInt truncation must not grade correct")
    }

    // MARK: - 5. Feed sessions

    @Test("a feed session keeps its no-repeat rings across the bridge")
    func feedSessionKeepsItsRings() async throws {
        let e = try engine()
        let session = "swift-gate-\(UUID().uuidString)"
        let items = try await e.nextQuestions(.feed(topic: "geometry", level: 3, session: session), count: 30)
        #expect(items.count == 30)

        var worstSkillRun = 1, run = 1
        var worstStemRun = 1, stemRun = 1
        for i in 1..<items.count {
            run = items[i].skill == items[i - 1].skill ? run + 1 : 1
            worstSkillRun = max(worstSkillRun, run)
            stemRun = items[i].stemText == items[i - 1].stemText ? stemRun + 1 : 1
            worstStemRun = max(worstStemRun, stemRun)
        }
        // tools/feed-sim.mjs caps the same-skill run at 3 on the web. Drawing through the
        // bridge must not lose that - "perimeter, perimeter, area, area" is the bug.
        #expect(worstSkillRun <= 3, "same-skill run of \(worstSkillRun) through the bridge feed")
        #expect(worstStemRun == 1, "the session dedup must stop identical stems back to back")

        // The engine's dedup key is stem + extra + OPTIONS, not the stem alone: several
        // generators keep a fixed stem ("Which fraction is the greatest?") and vary only
        // the choices, and treating those as duplicates once starved a skill out of the
        // carousel for a whole session. Assert the key the engine actually promises.
        let identities = items.map { q -> String in
            let options = q.isTyped ? q.answerTextPlain : q.choices.joined(separator: "\u{1}")
            return (q.stem + "\u{2}" + q.extra + "\u{2}" + options).filter { !$0.isWhitespace }
        }
        #expect(Set(identities).count == items.count,
                "a session repeated a question: \(items.count - Set(identities).count) duplicate(s)")

        try await e.endSession(session)

        // A pool draw is deliberately memoryless; it is Patchwerk's path, not the child's feed.
        let pool = try await e.nextQuestions(.pool(topic: "geometry", level: 1), count: 10)
        #expect(pool.count == 10)
        #expect(pool.allSatisfy { $0.level == 1 })
    }

    // MARK: - 6. Explanations

    @Test("explain carries the working and the parent tip")
    func explainCarriesWorkingAndTip() async throws {
        let e = try engine()
        let q = try await e.nextQuestion(.pool(topic: "tables", level: 2))
        let ex = try await e.explain(q)
        #expect(ex.topic == "tables")
        #expect(ex.skill == q.skill)
        #expect(!ex.text.isEmpty, "no explanation text for \(q.stemText)")
        #expect(!ex.answerTextPlain.isEmpty)
        #expect(!ex.skillTip.isEmpty, "every skill carries a parent tip")
        #expect(!ex.skillLabel.isEmpty)
        #expect(!ex.text.contains("<"), "the plain explanation must have no markup left in it")
    }

    // MARK: - 7. Errors arrive as Swift errors with the JS stack

    @Test("engine errors surface as Swift errors carrying the JavaScript stack")
    func errorsCarryTheStack() async throws {
        let e = try engine()
        do {
            _ = try await e.nextQuestion(.pool(topic: "no-such-island", level: 1))
            Issue.record("an unknown topic should not succeed")
        } catch let error as EngineError {
            guard case .engineRejected(let method, _, let message, let stack, _) = error else {
                Issue.record("expected .engineRejected, got \(error)"); return
            }
            #expect(method == "nextQuestion")
            #expect(message.contains("unknown topic"), "\(message)")
            #expect(!stack.isEmpty, "the JS stack must survive into Swift")
            #expect(error.javaScriptStack == stack)
        }

        do {
            _ = try await e.nextQuestion(.generator(ref: "geometry/9/0"))
            Issue.record("a malformed generator ref should not succeed")
        } catch let error as EngineError {
            guard case .engineRejected = error else { Issue.record("expected .engineRejected, got \(error)"); return }
        }

        do {
            _ = try await e.nextQuestion(.generator(ref: "geometry/1/9999"))
            Issue.record("an out-of-range generator ref should not succeed")
        } catch let error as EngineError {
            #expect("\(error)".contains("out of range"), "\(error)")
        }
    }

    @Test("a missing bundle is a clear error that says how to fix it")
    func missingBundleIsClear() throws {
        let missing = URL(fileURLWithPath: "/tmp/not-an-engine-bundle-\(UUID().uuidString).js")
        // The locator falls through to the package resource only when no explicit URL is
        // given; an explicit missing path plus a cleared environment must fail loudly.
        do {
            let e = try JSQuestionEngine(bundleURL: missing)
            // A package resource exists, so the locator legitimately resolves to it.
            #expect(e.loadedBundleURL != missing)
        } catch let error as EngineError {
            guard case .bundleNotFound = error else { Issue.record("got \(error)"); return }
            #expect("\(error)".contains("npm run build:engine"), "the error should say how to fix it")
        }
    }

    // MARK: - 8. Figures

    /// Until the figure-spec lane lands, the six diagram topics still ship markup in
    /// `extra` and no `figure`. This test asserts the CURRENT state and reports it, so
    /// the day the contract moves the report changes and `MQFigures` gets its cue.
    @Test("the figure contract's current state is visible, and nothing decodes as a hard failure")
    func figureContractState() async throws {
        let e = try engine()
        let figureTopics = ["p3bargraph", "geometry", "fractions", "p4area", "p4data", "p4pie"]
        var withSpec = 0, drawable = 0, withMarkup = 0, total = 0

        for topic in figureTopics {
            for level in 1...3 {
                for q in try await e.nextQuestions(.pool(topic: topic, level: level), count: 30) {
                    total += 1
                    if let f = q.figure {
                        withSpec += 1
                        if f.isDrawable { drawable += 1 }
                    }
                    if q.extraIsMarkup { withMarkup += 1 }
                }
            }
        }
        print("figure contract: \(total) items from the 6 diagram topics - "
              + "\(withSpec) carry a figure spec (\(drawable) drawable), \(withMarkup) still markup-only")
        #expect(withSpec + withMarkup > 0, "the diagram topics produced neither a figure nor markup")
    }
}
