import Foundation
import SwiftUI
import MQContent
import MQDesign
#if os(macOS)
import AppKit
#else
import UIKit
#endif

// =============================================================================
// THE HEADLESS DRIVER
//
// Kai has Command Line Tools and no Xcode, no simulator and no screen. Every gate
// on this box therefore has to be either a value assertion or an `ImageRenderer`
// render. This file is the second kind: it plays a WHOLE SCRIPTED SESSION through
// the real flow model and the real engine, writes a PNG per screen and a JSON
// transcript, and exits.
//
// That is what lets a refuter, or a dress rehearsal, LIVE a session on this box
// rather than read the code and take the lane's word for it - and it is why the
// strategies include `wrong-unit`: the one path a builder testing their own work
// never takes.
// =============================================================================

/// How the driver answers.
public enum QStrategy: String, Codable, Sendable, CaseIterable {
    case alwaysCorrect = "always-correct"
    case alwaysWrong = "always-wrong"
    /// The right number under a unit the question does not want. Falls back to
    /// `alwaysWrong` on a question that declares no unit, and the transcript
    /// SAYS SO rather than quietly recording a plain wrong answer.
    case wrongUnit = "wrong-unit"
    case random
}

public struct QDriveProfile: Codable, Sendable {
    public var name: String
    /// `unicorn` | `turtle` | `octopus`.
    public var cast: String
    public var level: String

    public init(name: String, cast: String, level: String) {
        self.name = name; self.cast = cast; self.level = level
    }

    public var mqCast: MQCast { MQCast(rawValue: cast) ?? .unicorn }
}

/// The script `--drive` reads.
public struct QDriveScript: Codable, Sendable {
    public var name: String
    /// Seeds the damage rolls and the `random` strategy. Same seed, same run.
    public var seed: UInt64
    /// A key in `QDriveScript.devices`, or `WxH`.
    public var device: String
    public var profile: QDriveProfile
    /// The engine topic id, e.g. `p4area`.
    public var node: String
    public var items: Int
    /// One strategy for the whole set.
    public var strategy: QStrategy?
    /// Or one per item, cycled if shorter than `items`.
    public var strategies: [QStrategy]?
    /// `noon` (default) | `dusk`.
    public var palette: String?
    /// Render scale. 1 by default: these are read by an agent and by a human at
    /// 100%, and @2x quadruples the bytes for no extra legibility.
    public var scale: CGFloat?

    public init(name: String, seed: UInt64, device: String, profile: QDriveProfile,
                node: String, items: Int, strategy: QStrategy? = nil,
                strategies: [QStrategy]? = nil, palette: String? = nil,
                scale: CGFloat? = nil) {
        self.name = name; self.seed = seed; self.device = device
        self.profile = profile; self.node = node; self.items = items
        self.strategy = strategy; self.strategies = strategies
        self.palette = palette; self.scale = scale
    }

    /// The device matrix names `mqdesign-snap` uses, so a driven PNG can be laid
    /// beside a matrix PNG of the same screen at the same size.
    public static let devices: [String: CGSize] = [
        "ipad97-landscape":  CGSize(width: 1024, height: 768),
        "ipad97-portrait":   CGSize(width: 768,  height: 1024),
        "ipad11-landscape":  CGSize(width: 1194, height: 834),
        "ipad11-portrait":   CGSize(width: 834,  height: 1194),
        "ipad13-landscape":  CGSize(width: 1366, height: 1024),
        "ipadmini-portrait": CGSize(width: 744,  height: 1133),
        "iphone-se":         CGSize(width: 375,  height: 667),
        "iphone15":          CGSize(width: 393,  height: 852)
    ]

    public var size: CGSize {
        if let s = Self.devices[device] { return s }
        let parts = device.lowercased().split(separator: "x")
        if parts.count == 2, let w = Double(parts[0]), let h = Double(parts[1]) {
            return CGSize(width: w, height: h)
        }
        return CGSize(width: 1024, height: 768)
    }

    public var mqPalette: MQPalette { palette == "dusk" ? .dusk : .noon }

    public func strategy(at index: Int) -> QStrategy {
        if let list = strategies, !list.isEmpty { return list[index % list.count] }
        return strategy ?? .alwaysCorrect
    }
}

// MARK: - Transcript

/// One item, exactly as the brief asks: question, answer, verdict, reason, HP
/// after. Plus the pieces a refuter needs to check the lane's own claims -
/// which chips were offered, which was tapped, and whether the classifier had to
/// ask the engine a second question.
public struct QTranscriptItem: Codable, Sendable {
    public var index: Int
    public var strategy: String
    /// Recorded when `wrong-unit` could not be played on this question.
    public var strategyFellBackTo: String?

    public var questionID: String
    public var topic: String
    public var skill: String
    public var generator: String?
    public var pool: Int
    public var level: Int
    public var kind: String
    public var stem: String
    public var declaredUnit: String
    public var figureType: String?
    public var figureDrawable: Bool
    public var choices: [String]
    public var expected: String

    /// What was sent to `grade`, verbatim.
    public var submitted: String
    public var chipsOffered: [String]
    public var chipTapped: String?
    public var choiceIndex: Int?

    public var correct: Bool
    /// The engine's own words.
    public var engineReason: String?
    /// This build's classification.
    public var reason: String
    public var parsedValue: Double?
    public var parsedUnit: String?

    public var heroHPAfter: Int
    public var monsterHPAfter: Int
    public var monsterIndexAfter: Int
    public var monsterName: String
    public var damageDealt: Int
    public var damageTaken: Int
    public var critical: Bool
    public var monsterFell: Bool
    public var streakAfter: Int
    public var levelBefore: Int
    public var levelAfter: Int
    public var crystalsAfter: Int
    public var screenshot: String?
    public var feedbackScreenshot: String?
    public var feedbackLines: [String]
}

public struct QTranscript: Codable, Sendable {
    /// Bumped when a field is removed or its meaning changes, so a refuter's
    /// reader can fail loudly instead of reading a stale shape.
    public static let schemaVersion = 1

    public var schema: Int = QTranscript.schemaVersion
    public var name: String
    public var recordedAt: String
    public var engineStamp: String
    public var enginePayloadHash: String
    public var device: String
    public var size: [Double]
    public var seed: UInt64
    public var profile: QDriveProfile
    public var node: String
    public var nodeName: String
    public var setSize: Int
    public var items: [QTranscriptItem]

    public var correct: Int
    public var total: Int
    public var bestStreak: Int
    public var crystals: Int
    public var heroHP: Int
    public var accuracy: Int
    public var reviewCount: Int
    public var screenshots: [String]
}

// MARK: - The driver

/// Plays a script. Everything it touches is the real thing: the real
/// `QQuestModel`, the real `QuestionSource` handed in by the composition root
/// (which is `JSQuestionEngine` under `mqhost`), the real screens.
@MainActor
public final class QDriver {

    public struct Output: Sendable {
        public var transcriptPath: String
        public var pngPaths: [String]
        public var transcript: QTranscript
    }

    let source: any QuestionSource
    let script: QDriveScript
    let outDir: URL

    public init(source: any QuestionSource, script: QDriveScript, outDir: URL) {
        self.source = source; self.script = script; self.outDir = outDir
    }

    public func run() async throws -> Output {
        _ = MQFonts.register()
        try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

        let store = InMemoryProgressStore()
        _ = await store.addProfile(name: script.profile.name,
                                   cast: script.profile.mqCast,
                                   level: script.profile.level)
        let random = QSeededRandom(seed: script.seed)
        let model = QQuestModel(source: source, store: store, random: random,
                                setSize: script.items)
        let metrics = MQMetrics.device(script.size)
        let palette = script.mqPalette
        let scale = script.scale ?? 1

        var pngs: [String] = []

        await model.load()
        pngs.append(try shoot(model, metrics, palette, scale, "01-entrance"))

        guard let profile = model.profiles.first(where: { $0.name == script.profile.name })
                ?? model.profiles.first else {
            throw QDriverError.noProfile
        }
        await model.pick(profile)
        pngs.append(try shoot(model, metrics, palette, scale, "02-map"))

        guard let node = model.island?.nodes.first(where: { $0.topicID == script.node }) else {
            throw QDriverError.noSuchNode(script.node,
                                          available: model.island?.nodes.map(\.topicID) ?? [])
        }
        await model.open(node)

        var items: [QTranscriptItem] = []
        var index = 0
        while model.phase == .asking, index < script.items {
            guard let q = model.question else { break }
            let strategy = script.strategy(at: index)
            let shotName = String(format: "%02d-q%02d-ask", index + 3, index + 1)
            let ask = try shoot(model, metrics, palette, scale, shotName)
            pngs.append(ask)

            // Fill the entry, then SHOOT BEFORE SUBMITTING. The mid-entry frame
            // is the only one that shows the keypad in use, the digits in the
            // slot and the chosen chip lit - which is exactly the state a
            // refuter needs and the state a builder never screenshots.
            let played = await enter(model, question: q, strategy: strategy)
            if q.isTyped {
                let typedName = String(format: "%02d-q%02d-typed", index + 3, index + 1)
                pngs.append(try shoot(model, metrics, palette, scale, typedName))
            }
            await submit(model, question: q, played: played)

            let fbName = String(format: "%02d-q%02d-answer", index + 3, index + 1)
            let fb = try shoot(model, metrics, palette, scale, fbName)
            pngs.append(fb)

            if let last = model.answered.last {
                items.append(transcriptItem(index: index, strategy: strategy,
                                            fellBackTo: played.fellBackTo,
                                            item: last, model: model,
                                            chips: played.chips, chip: played.chip,
                                            choiceIndex: played.choiceIndex,
                                            ask: ask, feedback: fb))
            }
            index += 1
            await model.advance()
        }
        if model.phase != .result { await model.finish() }
        pngs.append(try shoot(model, metrics, palette, scale, "99-result"))

        let build = try? await source.engineBuild()
        let transcript = QTranscript(
            name: script.name,
            recordedAt: ISO8601DateFormatter().string(from: Date()),
            engineStamp: build?.stamp ?? "",
            enginePayloadHash: build?.payloadHash ?? "",
            device: script.device,
            size: [Double(script.size.width), Double(script.size.height)],
            seed: script.seed,
            profile: script.profile,
            node: script.node,
            nodeName: node.name,
            setSize: script.items,
            items: items,
            correct: model.run.correct,
            total: model.run.answered,
            bestStreak: model.run.bestStreak,
            crystals: model.run.crystals,
            heroHP: model.run.heroHP,
            accuracy: model.summary?.accuracy ?? 0,
            reviewCount: model.wrongItems.count,
            screenshots: pngs.map { URL(fileURLWithPath: $0).lastPathComponent })

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let path = outDir.appendingPathComponent("transcript.json")
        try encoder.encode(transcript).write(to: path)
        return Output(transcriptPath: path.path, pngPaths: pngs, transcript: transcript)
    }

    // MARK: Playing one item

    struct Played {
        var chips: [String] = []
        var chip: String?
        var choiceIndex: Int?
        var fellBackTo: String?
    }

    /// Fill the entry (or pick the choice index) without submitting.
    private func enter(_ model: QQuestModel, question q: Question,
                       strategy: QStrategy) async -> Played {
        var played = Played()
        played.chips = model.chips

        var effective = strategy
        if strategy == .random {
            // Seeded through the model's own generator so the whole run is one
            // reproducible stream.
            effective = model.random.ri(0, 1) == 0 ? .alwaysCorrect : .alwaysWrong
            played.fellBackTo = effective.rawValue
        }
        if effective == .wrongUnit && (!q.isTyped || played.chips.isEmpty) {
            effective = .alwaysWrong
            played.fellBackTo = QStrategy.alwaysWrong.rawValue
        }

        if q.isTyped {
            let correctText = Self.correctTypedText(q)
            switch effective {
            case .alwaysCorrect:
                type(model, correctText)
                if let chip = played.chips.first(where: {
                    QUnits.accepts($0, declared: q.unit) }) {
                    model.toggleChip(chip); played.chip = chip
                }
            case .alwaysWrong:
                type(model, Self.wrongTypedText(correctText))
            case .wrongUnit:
                type(model, correctText)
                if let chip = played.chips.first(where: {
                    !QUnits.accepts($0, declared: q.unit) }) {
                    model.toggleChip(chip); played.chip = chip
                }
            case .random:
                type(model, correctText)
            }
        } else {
            let correct = max(q.correctIndex, 0)
            switch effective {
            case .alwaysCorrect, .random: played.choiceIndex = correct
            case .alwaysWrong, .wrongUnit:
                played.choiceIndex = q.choices.count > 1
                    ? (correct + 1) % q.choices.count : correct
            }
        }
        return played
    }

    private func submit(_ model: QQuestModel, question q: Question,
                        played: Played) async {
        if q.isTyped {
            await model.submitTyped()
        } else if let i = played.choiceIndex {
            await model.choose(i)
        }
    }

    /// Every character goes through the KEYPAD, not into the entry directly. That
    /// is the point: a driven session proves the child's actual input path, so a
    /// digit the keypad cannot produce shows up here as a short answer rather
    /// than as a green test.
    private func type(_ model: QQuestModel, _ text: String) {
        for ch in text {
            switch ch {
            case "0"..."9": model.press(.digit(Int(String(ch)) ?? 0))
            case ".":       model.press(.decimalPoint)
            case "/":       model.press(.slash)
            case "-":       model.press(.minus)
            default:        break
            }
        }
    }

    /// The bare number that grades correct, without the unit.
    nonisolated public static func correctTypedText(_ q: Question) -> String {
        if case .typed(let s) = q.selfAnswer { return s }
        return q.answerTextPlain
    }

    /// A number that is not the answer. `+1` rather than a random value, so a
    /// transcript is readable: the wrong answer is always one off.
    nonisolated public static func wrongTypedText(_ correct: String) -> String {
        if let d = Double(correct) { return JSONValue.numberText(d + 1) }
        return correct.isEmpty ? "1" : correct + "1"
    }

    // MARK: Transcript row

    private func transcriptItem(index: Int, strategy: QStrategy, fellBackTo: String?,
                                item: QAnsweredItem, model: QQuestModel,
                                chips: [String], chip: String?, choiceIndex: Int?,
                                ask: String, feedback: String) -> QTranscriptItem {
        let q = item.question
        return QTranscriptItem(
            index: index,
            strategy: strategy.rawValue,
            strategyFellBackTo: fellBackTo,
            questionID: q.id, topic: q.topic, skill: q.skill,
            generator: q.generator, pool: q.pool, level: q.level,
            kind: q.kind.rawValue, stem: q.stemText, declaredUnit: q.unit,
            figureType: q.figure?.type, figureDrawable: q.figure?.isDrawable ?? false,
            choices: q.choiceTexts, expected: q.answerTextPlain,
            submitted: item.submitted, chipsOffered: chips, chipTapped: chip,
            choiceIndex: choiceIndex,
            correct: item.verdict.correct,
            engineReason: item.verdict.reason,
            reason: item.reason.token,
            parsedValue: item.verdict.parsed?.value,
            parsedUnit: item.verdict.parsed?.unit,
            heroHPAfter: item.resolution.heroHPAfter,
            monsterHPAfter: item.resolution.monsterHPAfter,
            monsterIndexAfter: model.run.monsterIndex,
            monsterName: model.run.monster.name,
            damageDealt: item.resolution.damageDealt,
            damageTaken: item.resolution.damageTaken,
            critical: item.resolution.critical,
            monsterFell: item.resolution.monsterFell,
            streakAfter: item.resolution.streakAfter,
            levelBefore: item.resolution.levelBefore,
            levelAfter: item.resolution.levelAfter,
            crystalsAfter: item.resolution.crystalsAfter,
            screenshot: URL(fileURLWithPath: ask).lastPathComponent,
            feedbackScreenshot: URL(fileURLWithPath: feedback).lastPathComponent,
            feedbackLines: model.feedback?.lines ?? [])
    }

    // MARK: Rendering

    @discardableResult
    private func shoot(_ model: QQuestModel, _ m: MQMetrics, _ p: MQPalette,
                       _ scale: CGFloat, _ name: String) throws -> String {
        let view = QScreenForPhase(model: model, metrics: m, palette: p)
        let url = outDir.appendingPathComponent("\(name).png")
        guard let data = QDriver.png(view, size: m.size, scale: scale) else {
            throw QDriverError.renderFailed(name)
        }
        try data.write(to: url)
        return url.path
    }

    /// `ImageRenderer` to PNG. The only way a headless box produces a picture, and
    /// the same call `mqdesign-snap` uses for the device matrix.
    public static func png(_ view: some View, size: CGSize, scale: CGFloat) -> Data? {
        let renderer = ImageRenderer(content:
            view.frame(width: size.width, height: size.height))
        renderer.scale = scale
        renderer.proposedSize = ProposedViewSize(size)
        #if os(macOS)
        guard let image = renderer.nsImage,
              let tiff = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff) else { return nil }
        return rep.representation(using: .png, properties: [:])
        #else
        guard let image = renderer.uiImage else { return nil }
        return image.pngData()
        #endif
    }
}

public enum QDriverError: Error, CustomStringConvertible {
    case noProfile
    case noSuchNode(String, available: [String])
    case renderFailed(String)

    public var description: String {
        switch self {
        case .noProfile:
            return "the script's profile could not be created"
        case .noSuchNode(let id, let available):
            return "no node \"\(id)\" on this profile's island. Available: "
                + available.joined(separator: ", ")
        case .renderFailed(let name):
            return "ImageRenderer produced no image for \(name)"
        }
    }
}
