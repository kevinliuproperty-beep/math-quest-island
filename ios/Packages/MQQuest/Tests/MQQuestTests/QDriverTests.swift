import Testing
import Foundation
import MQContent
import MQDesign
import MQEngineJS
@testable import MQQuest

// =============================================================================
// THE DRIVER AND ITS TRANSCRIPT
//
// The transcript is what a refuter reads instead of the code, so its SHAPE is a
// gate: a field that quietly disappears turns a refutation into a shrug.
// =============================================================================

@Suite("The driver plays a real session and its transcript keeps its shape", .serialized)
struct QDriverTests {

    static let engine = try! JSQuestionEngine()

    static func tempDir(_ name: String) -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("mqquest-\(name)-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    static func script(_ strategies: [QStrategy], items: Int = 4,
                       node: String = "p4area", level: String = "P4",
                       device: String = "ipad97-landscape") -> QDriveScript {
        QDriveScript(name: "test", seed: 99, device: device,
                     profile: QDriveProfile(name: "Charlotte", cast: "unicorn",
                                            level: level),
                     node: node, items: items, strategies: strategies, scale: 1)
    }

    @MainActor
    @Test("a driven session writes a PNG per screen and a decodable transcript")
    func writesEverything() async throws {
        let out = Self.tempDir("shape")
        defer { try? FileManager.default.removeItem(at: out) }
        let driver = QDriver(source: Self.engine,
                             script: Self.script([.alwaysCorrect, .wrongUnit,
                                                  .alwaysWrong, .random]),
                             outDir: out)
        let result = try await driver.run()

        // Entrance + map + (ask, typed?, answer) per item + result.
        #expect(result.pngPaths.count >= 2 + 4 * 2 + 1)
        for path in result.pngPaths {
            let size = try FileManager.default.attributesOfItem(atPath: path)[.size] as? Int
            #expect((size ?? 0) > 10_000, "\(path) is not a rendered screen")
        }
        #expect(FileManager.default.fileExists(atPath: result.transcriptPath))

        // Decoded from DISK, not from the value in hand: the file is the artefact.
        let data = try Data(contentsOf: URL(fileURLWithPath: result.transcriptPath))
        let t = try JSONDecoder().decode(QTranscript.self, from: data)
        #expect(t.schema == QTranscript.schemaVersion)
        #expect(t.items.count == 4)
        #expect(t.total == 4)
        #expect(t.correct + t.reviewCount == t.total)
        #expect(!t.engineStamp.isEmpty)
        #expect(!t.enginePayloadHash.isEmpty)
        #expect(t.size == [1024, 768])
        #expect(t.nodeName.isEmpty == false)
        #expect(t.screenshots.count == result.pngPaths.count)
    }

    /// Field by field, because "it decodes" is not the claim. Anything a refuter
    /// would recompute has to be present and non-placeholder.
    @MainActor
    @Test("every transcript row carries the question, the answer, the verdict and the HP")
    func rowShape() async throws {
        let out = Self.tempDir("rows")
        defer { try? FileManager.default.removeItem(at: out) }
        let result = try await QDriver(source: Self.engine,
                                       script: Self.script([.alwaysCorrect, .wrongUnit,
                                                            .alwaysWrong]),
                                       outDir: out).run()
        let json = try JSONSerialization.jsonObject(
            with: Data(contentsOf: URL(fileURLWithPath: result.transcriptPath)))
        let dict = try #require(json as? [String: Any])
        let rows = try #require(dict["items"] as? [[String: Any]])
        let required = ["index", "strategy", "questionID", "topic", "skill", "kind",
                        "stem", "declaredUnit", "submitted", "chipsOffered",
                        "correct", "reason", "heroHPAfter", "monsterHPAfter",
                        "monsterName", "damageDealt", "damageTaken", "critical",
                        "monsterFell", "streakAfter", "levelBefore", "levelAfter",
                        "crystalsAfter", "expected", "feedbackLines"]
        for row in rows {
            for key in required {
                #expect(row[key] != nil, "row \(row["index"] ?? "?") has no \"\(key)\"")
            }
            #expect((row["stem"] as? String)?.isEmpty == false)
        }
        for (i, row) in rows.enumerated() {
            #expect(row["index"] as? Int == i, "rows are in play order")
        }
    }

    @MainActor
    @Test("always-correct is correct, always-wrong is wrong, wrong-unit is a unit")
    func strategiesDoWhatTheySay() async throws {
        let out = Self.tempDir("strategies")
        defer { try? FileManager.default.removeItem(at: out) }
        let result = try await QDriver(
            source: Self.engine,
            script: Self.script([.alwaysCorrect, .alwaysWrong, .wrongUnit,
                                 .alwaysCorrect, .wrongUnit, .alwaysWrong], items: 6),
            outDir: out).run()
        for item in result.transcript.items {
            switch QStrategy(rawValue: item.strategy) {
            case .alwaysCorrect:
                #expect(item.correct,
                        "always-correct answered \"\(item.submitted)\" and the engine said no (expected \(item.expected))")
            case .alwaysWrong:
                #expect(!item.correct)
            case .wrongUnit:
                if item.strategyFellBackTo == nil {
                    #expect(!item.correct)
                    #expect(item.reason == "wrong-unit",
                            "wrong-unit item \(item.index) classified as \(item.reason)")
                    #expect(item.chipTapped != nil)
                    #expect(item.parsedValue != nil,
                            "the number itself parsed - that is what makes it a UNIT error")
                }
            default: break
            }
        }
    }

    @MainActor
    @Test("the HP in the transcript is the HP the formulas produce")
    func hpRecomputes() async throws {
        let out = Self.tempDir("hp")
        defer { try? FileManager.default.removeItem(at: out) }
        let result = try await QDriver(source: Self.engine,
                                       script: Self.script([.alwaysCorrect], items: 8),
                                       outDir: out).run()
        // Replay the same seed through the pure state machine and demand the same
        // numbers. This is the whole HP claim, end to end.
        let replay = QSeededRandom(seed: 99)
        var run = QRunState()
        for item in result.transcript.items {
            let r = run.apply(correct: item.correct,
                              heroRoll: replay.ri(0, 4), monsterRoll: replay.ri(0, 3))
            #expect(r.heroHPAfter == item.heroHPAfter, "item \(item.index) hero HP")
            #expect(r.damageDealt == item.damageDealt, "item \(item.index) damage")
            #expect(r.streakAfter == item.streakAfter, "item \(item.index) streak")
            #expect(r.levelAfter == item.levelAfter, "item \(item.index) level")
        }
        #expect(run.crystals == result.transcript.crystals)
    }

    @MainActor
    @Test("a node that is not on the profile's island is named, not silently skipped")
    func badNode() async throws {
        let out = Self.tempDir("badnode")
        defer { try? FileManager.default.removeItem(at: out) }
        var script = Self.script([.alwaysCorrect], items: 1)
        script.node = "not-a-topic"
        await #expect(throws: QDriverError.self) {
            _ = try await QDriver(source: Self.engine, script: script, outDir: out).run()
        }
    }

    @Test("the script's device names are the matrix's own")
    func deviceNames() {
        #expect(QDriveScript.devices["ipad97-landscape"] == CGSize(width: 1024, height: 768))
        #expect(QDriveScript.devices["iphone-se"] == CGSize(width: 375, height: 667))
        // and a bare WxH is accepted, so a refuter can pick any size
        var s = Self.script([.alwaysCorrect])
        s.device = "800x600"
        #expect(s.size == CGSize(width: 800, height: 600))
    }
}

// =============================================================================

@Suite("The keypad policy is measured, not assumed", .serialized)
struct QKeypadPolicyTests {

    static let engine = try! JSQuestionEngine()

    /// The non-digit characters a child could legitimately have to tap for this
    /// question.
    ///
    /// **Not `selfAnswer`.** That is the DECIMAL the key carries, and a fraction
    /// question's key holds both: `{"answer":0.44642857142857145,
    /// "fracAnswer":[25,56]}`. A child on `p5fractions` types `25/56`, so the
    /// slash is a key that topic needs even though no `selfAnswer` string
    /// contains one. `fracAnswer`'s presence IS the fact; reading it here beats
    /// sampling for a string shape that never appears.
    static func charactersAChildMustType(_ q: Question) -> Set<Character> {
        var out = Set<Character>()
        if case .typed(let text) = q.selfAnswer {
            for ch in text where !ch.isNumber { out.insert(ch) }
        }
        if q.key["fracAnswer"] != nil { out.insert("/") }
        return out
    }

    @Test("every live topic has a policy row")
    func exhaustive() async throws {
        let cat = try await Self.engine.listTopics()
        for topic in cat.topics {
            #expect(QKeypadPolicy.byTopic[topic.id] != nil,
                    "topic \(topic.id) has no keypad policy and would fall back")
        }
    }

    /// The real gate: draw the topic, read its typed answers, and demand the
    /// policy can type every one of them - and no more than it needs.
    @Test("a topic's policy types every answer that topic produces, and no key it never needs")
    func policyMatchesTheAnswers() async throws {
        let cat = try await Self.engine.listTopics()
        let draws = Int(ProcessInfo.processInfo.environment["MQ_DRAWS"] ?? "") ?? 30
        for topic in cat.topics {
            let policy = QKeypadPolicy.forTopic(topic.id)
            var needed = Set<Character>()
            var typedSeen = 0
            for ref in topic.generators {
                for _ in 0..<max(draws / max(topic.generators.count, 1), 4) {
                    let q = try await Self.engine.nextQuestion(.generator(ref: ref.ref))
                    guard q.isTyped else { continue }
                    typedSeen += 1
                    for ch in Self.charactersAChildMustType(q) { needed.insert(ch) }
                }
            }
            guard typedSeen > 0 else { continue }
            let typable = policy.typableCharacters
            for ch in needed {
                #expect(typable.contains(ch),
                        "\(topic.id) answers with \"\(ch)\" and its keypad has no such key")
            }
            // The other direction: an offered key the topic never needs is one
            // more dead object on a nine-year-old's screen.
            //
            // It needs a DEEPER sample than the forward direction. "This topic
            // never produces a slash" is a claim about every draw, and a thin
            // sample that happens to miss one would fail a correct policy - so
            // only the four topics that enable a key pay for the extra draws.
            if policy.decimal || policy.fraction {
                for ref in topic.generators {
                    for _ in 0..<60 {
                        let q = try await Self.engine.nextQuestion(.generator(ref: ref.ref))
                        guard q.isTyped else { continue }
                        for ch in Self.charactersAChildMustType(q) { needed.insert(ch) }
                    }
                }
                if policy.decimal {
                    #expect(needed.contains("."),
                            "\(topic.id) shows a decimal key it never needs")
                }
                if policy.fraction {
                    #expect(needed.contains("/"),
                            "\(topic.id) shows a fraction key it never needs")
                }
            }
            #expect(!policy.minus, "no live topic has a negative answer")
        }
    }
}

// =============================================================================

@Suite("The copy obeys the fade-out law")
struct QStringsTests {

    @Test("nothing asks the child to come back")
    func noRetentionCopy() {
        for line in QStrings.allCopy {
            let lower = line.lowercased()
            for banned in QStrings.bannedRetentionPhrases {
                #expect(!lower.contains(banned),
                        "\"\(line)\" carries retention copy: \"\(banned)\"")
            }
        }
    }

    @Test("nothing shames a mistake")
    func noShamingCopy() {
        for line in QStrings.allCopy {
            let lower = line.lowercased()
            for banned in QStrings.bannedShamingPhrases {
                #expect(!lower.contains(banned),
                        "\"\(line)\" carries shaming copy: \"\(banned)\"")
            }
        }
    }

    @Test("the review heading invites a second look rather than counting errors")
    func reviewHeading() {
        #expect(QStrings.reviewHeading == "Worth another look")
        #expect(!QStrings.reviewEmpty.isEmpty, "an empty review still says something")
    }

    /// The unit lesson is the sweep lane's sentence, and the ORDER is the point.
    @Test("the unit lesson leads the feedback card, above the answer and the working")
    func unitLessonLeads() {
        let q = QFixtures.question(unit: "cm²", answer: 360)
        let verdict = Verdict(correct: false, kind: .typed, questionId: "q1",
                              expectedIndex: -1, expectedText: "360 cm²", chosenIndex: -1,
                              reason: "wrong-unit",
                              parsed: Verdict.Parsed(ok: true, value: 360, unit: "cm",
                                                     frac: nil, reason: nil),
                              typedRaw: "360 cm")
        let item = QAnsweredItem(
            question: q, answer: .typed("360 cm"), submitted: "360 cm", unitChip: "cm",
            verdict: verdict, reason: .wrongUnit(expected: "cm²", got: "cm"),
            explanation: QFixtures.explanation("1/2 x 40 x 18 = 360 cm²."),
            resolution: QResolution(wasCorrect: false, damageDealt: 0, damageTaken: 12,
                                    critical: false, monsterFell: false, healed: 0,
                                    levelBefore: 1, levelAfter: 1, streakAfter: 0,
                                    heroHPAfter: 88, monsterHPAfter: 50, crystalsAfter: 0))
        let lines = QFeedback(item: item, cheerIndex: 0).lines
        #expect(lines.count == 3)
        #expect(lines[0] == "Your number was right. The unit should be cm², "
                + "because area is measured in squares.")
        #expect(lines[1].hasPrefix("The answer is"))
        #expect(lines[2].contains("360"))
    }

    @Test("a wrong VALUE gets no unit lesson - it would be a lie")
    func noLessonOnAWrongValue() {
        let q = QFixtures.question(unit: "cm²", answer: 360)
        let verdict = Verdict(correct: false, kind: .typed, questionId: "q1",
                              expectedIndex: -1, expectedText: "360 cm²", chosenIndex: -1,
                              reason: "wrong-value", parsed: nil, typedRaw: "361 cm²")
        let item = QAnsweredItem(question: q, answer: .typed("361 cm²"),
                                 submitted: "361 cm²", unitChip: "cm²",
                                 verdict: verdict, reason: .wrongValue,
                                 explanation: nil,
                                 resolution: QResolution(wasCorrect: false, damageDealt: 0,
                                                         damageTaken: 12, critical: false,
                                                         monsterFell: false, healed: 0,
                                                         levelBefore: 1, levelAfter: 1,
                                                         streakAfter: 0, heroHPAfter: 88,
                                                         monsterHPAfter: 50,
                                                         crystalsAfter: 0))
        let lines = QFeedback(item: item, cheerIndex: 0).lines
        #expect(!lines.contains { $0.contains("The unit should be") })
    }

    @Test("a correct answer gets one cheer and nothing else")
    func cheer() {
        let q = QFixtures.question()
        let verdict = Verdict(correct: true, kind: .typed, questionId: "q1",
                              expectedIndex: -1, expectedText: "24 cm²", chosenIndex: -1,
                              reason: nil, parsed: nil, typedRaw: "24")
        let item = QAnsweredItem(question: q, answer: .typed("24"), submitted: "24",
                                 unitChip: nil, verdict: verdict, reason: .correct,
                                 explanation: nil,
                                 resolution: QResolution(wasCorrect: true, damageDealt: 24,
                                                         damageTaken: 0, critical: false,
                                                         monsterFell: false, healed: 0,
                                                         levelBefore: 1, levelAfter: 1,
                                                         streakAfter: 1, heroHPAfter: 100,
                                                         monsterHPAfter: 26,
                                                         crystalsAfter: 0))
        let lines = QFeedback(item: item, cheerIndex: 2).lines
        #expect(lines.count == 1)
        #expect(QStrings.correctCheers.contains(lines[0]))
    }
}
